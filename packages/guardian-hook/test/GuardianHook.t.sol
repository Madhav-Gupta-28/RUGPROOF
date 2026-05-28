// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";

import {RiskOracle} from "../src/RiskOracle.sol";
import {GuardianHook} from "../src/GuardianHook.sol";
import {IRiskOracle} from "../src/interfaces/IRiskOracle.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";

contract GuardianHookHarness is GuardianHook {
    using PoolIdLibrary for PoolKey;

    constructor(IPoolManager pm, IRiskOracle oracle, address owner) GuardianHook(pm, oracle, owner) {}

    function exposedBeforeSwap(PoolKey calldata key, SwapParams calldata params, bytes calldata hookData)
        external
        returns (bytes4, int256, uint24)
    {
        (bytes4 sel, , uint24 fee) = _beforeSwap(address(this), key, params, hookData);
        return (sel, 0, fee);
    }

    function exposedAfterSwap(PoolKey calldata key, SwapParams calldata params, BalanceDelta delta, bytes calldata hookData)
        external
    {
        _afterSwap(address(this), key, params, delta, hookData);
    }

    function forceExposure(PoolKey calldata key, address user, uint256 amount) external {
        exposure[key.toId()][user] = amount;
    }

    function forceReserve(PoolKey calldata key, uint256 amount) external {
        reserve[key.toId()] = amount;
    }
}

contract GuardianHookTest is Test {
    using PoolIdLibrary for PoolKey;

    RiskOracle internal oracle;
    GuardianHookHarness internal hook;
    MockERC20 internal base;
    MockERC20 internal rug;
    PoolKey internal key;

    function setUp() public {
        oracle = new RiskOracle(address(this));
        address flags = address(
            uint160(Hooks.AFTER_INITIALIZE_FLAG | Hooks.BEFORE_SWAP_FLAG | Hooks.AFTER_SWAP_FLAG) ^ (0x4444 << 144)
        );
        bytes memory args = abi.encode(IPoolManager(address(0x4444)), IRiskOracle(address(oracle)), address(this));
        deployCodeTo("GuardianHook.t.sol:GuardianHookHarness", args, flags);
        hook = GuardianHookHarness(flags);
        base = new MockERC20("Base", "BASE");
        rug = new MockERC20("Rug", "RUG");

        key = PoolKey({
            currency0: Currency.wrap(address(base)),
            currency1: Currency.wrap(address(rug)),
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(address(hook))
        });
        hook.registerPool(key, address(rug), address(base), 5000);
    }

    function test_OK_swap_succeeds() public {
        oracle.setRisk(address(rug), IRiskOracle.Risk.OK, 8500);
        SwapParams memory params = SwapParams({zeroForOne: true, amountSpecified: -100e18, sqrtPriceLimitX96: 1});

        (bytes4 sel,,) = hook.exposedBeforeSwap(key, params, "");
        assertTrue(sel != bytes4(0));
    }

    function test_DANGER_swap_reverts() public {
        oracle.setRisk(address(rug), IRiskOracle.Risk.DANGER, 500);
        SwapParams memory params = SwapParams({zeroForOne: true, amountSpecified: -100e18, sqrtPriceLimitX96: 1});

        vm.expectRevert(abi.encodeWithSelector(GuardianHook.GuardianBlocked.selector, address(rug)));
        hook.exposedBeforeSwap(key, params, "");
    }

    function test_claimRefund_paysFromReserve() public {
        address buyer = address(0xBEEF);
        uint256 reserveAmount = 40e18;
        uint256 spent = 20e18;

        base.mint(address(hook), reserveAmount);
        hook.forceReserve(key, reserveAmount);
        hook.forceExposure(key, buyer, spent);

        oracle.setRisk(address(rug), IRiskOracle.Risk.DANGER, 1000);

        uint256 beforeBal = base.balanceOf(buyer);
        vm.prank(buyer);
        hook.claimRefund(key);
        uint256 afterBal = base.balanceOf(buyer);

        assertEq(afterBal - beforeBal, spent);
    }
}
