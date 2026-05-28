// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {BaseHook} from "@uniswap/v4-periphery/src/utils/BaseHook.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary} from "@uniswap/v4-core/src/types/BeforeSwapDelta.sol";
import {Currency, CurrencyLibrary} from "@uniswap/v4-core/src/types/Currency.sol";

import {IRiskOracle} from "./interfaces/IRiskOracle.sol";

/// @title GuardianHook — risk-gated Uniswap v4 hook
/// @notice Reverts swaps for tokens flagged DANGER by RUGNOT. Tracks user exposure
///         so victims of a later DANGER flip can claim refunds from on-chain reserve.
contract GuardianHook is BaseHook {
    using PoolIdLibrary for PoolKey;
    using CurrencyLibrary for Currency;

    IRiskOracle public immutable oracle;
    address public immutable owner;

    struct PoolGuard {
        address protectedToken;
        address baseToken;
        uint16 refundCapBps;
        bool initialized;
    }

    mapping(PoolId => PoolGuard) public guards;
    mapping(PoolId => uint256) public reserve;
    mapping(PoolId => mapping(address => uint256)) public exposure;
    mapping(PoolId => mapping(address => bool)) public claimed;

    event GuardSet(PoolId indexed poolId, address protectedToken, address baseToken);
    event GuardianSwap(
        PoolId indexed poolId,
        address indexed user,
        address tokenIn,
        address tokenOut,
        IRiskOracle.Risk risk
    );
    event ReserveFunded(PoolId indexed poolId, uint256 amount);
    event RefundClaimed(PoolId indexed poolId, address indexed user, uint256 amount);

    error GuardianBlocked(address token);
    error NotOwner();
    error AlreadyInit();
    error NoExposure();
    error NotDanger();

    constructor(IPoolManager _poolManager, IRiskOracle _oracle, address _owner) BaseHook(_poolManager) {
        oracle = _oracle;
        owner = _owner;
    }

    function getHookPermissions() public pure override returns (Hooks.Permissions memory) {
        return Hooks.Permissions({
            beforeInitialize: false,
            afterInitialize: true,
            beforeAddLiquidity: false,
            afterAddLiquidity: false,
            beforeRemoveLiquidity: false,
            afterRemoveLiquidity: false,
            beforeSwap: true,
            afterSwap: true,
            beforeDonate: false,
            afterDonate: false,
            beforeSwapReturnDelta: false,
            afterSwapReturnDelta: false,
            afterAddLiquidityReturnDelta: false,
            afterRemoveLiquidityReturnDelta: false
        });
    }

    function registerPool(PoolKey calldata key, address protectedToken, address baseToken, uint16 refundCapBps) external {
        if (msg.sender != owner) revert NotOwner();

        PoolId id = key.toId();
        if (guards[id].initialized) revert AlreadyInit();

        guards[id] = PoolGuard({
            protectedToken: protectedToken,
            baseToken: baseToken,
            refundCapBps: refundCapBps,
            initialized: true
        });
        emit GuardSet(id, protectedToken, baseToken);
    }

    function _afterInitialize(address, PoolKey calldata, uint160, int24) internal override returns (bytes4) {
        return BaseHook.afterInitialize.selector;
    }

    function _beforeSwap(address, PoolKey calldata key, SwapParams calldata params, bytes calldata)
        internal
        override
        returns (bytes4, BeforeSwapDelta, uint24)
    {
        PoolGuard memory g = guards[key.toId()];
        if (!g.initialized) {
            return (BaseHook.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, 0);
        }

        Currency outCurrency = params.zeroForOne ? key.currency1 : key.currency0;
        address tokenOut = Currency.unwrap(outCurrency);

        if (tokenOut == g.protectedToken) {
            IRiskOracle.Risk r = oracle.riskOf(g.protectedToken);
            if (r == IRiskOracle.Risk.DANGER) revert GuardianBlocked(g.protectedToken);
        }

        return (BaseHook.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, 0);
    }

    function _afterSwap(
        address sender,
        PoolKey calldata key,
        SwapParams calldata params,
        BalanceDelta delta,
        bytes calldata
    ) internal override returns (bytes4, int128) {
        PoolGuard memory g = guards[key.toId()];

        if (g.initialized) {
            address tokenOut = Currency.unwrap(params.zeroForOne ? key.currency1 : key.currency0);
            address tokenIn = Currency.unwrap(params.zeroForOne ? key.currency0 : key.currency1);

            if (tokenOut == g.protectedToken && tokenIn == g.baseToken) {
                int128 baseLeg = params.zeroForOne ? delta.amount0() : delta.amount1();
                int256 signed = int256(baseLeg);
                uint256 spent = uint256(signed < 0 ? -signed : signed);
                exposure[key.toId()][sender] += spent;
            }

            emit GuardianSwap(key.toId(), sender, tokenIn, tokenOut, oracle.riskOf(g.protectedToken));
        }

        return (BaseHook.afterSwap.selector, 0);
    }

    function fundReserve(PoolKey calldata key, uint256 amount) external {
        PoolGuard memory g = guards[key.toId()];
        require(g.initialized, "not registered");
        require(IERC20(g.baseToken).transferFrom(msg.sender, address(this), amount), "transfer");

        reserve[key.toId()] += amount;
        emit ReserveFunded(key.toId(), amount);
    }

    function claimRefund(PoolKey calldata key) external {
        PoolId id = key.toId();
        PoolGuard memory g = guards[id];
        require(g.initialized, "not registered");
        if (oracle.riskOf(g.protectedToken) != IRiskOracle.Risk.DANGER) revert NotDanger();

        uint256 spent = exposure[id][msg.sender];
        if (spent == 0 || claimed[id][msg.sender]) revert NoExposure();

        uint256 cap = reserve[id] * g.refundCapBps / 10_000;
        uint256 payout = spent > cap ? cap : spent;
        require(payout > 0, "no reserve");

        claimed[id][msg.sender] = true;
        reserve[id] -= payout;

        require(IERC20(g.baseToken).transfer(msg.sender, payout), "transfer");
        emit RefundClaimed(id, msg.sender, payout);
    }
}
