// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";
import {LiquidityAmounts} from "@uniswap/v4-core/test/utils/LiquidityAmounts.sol";
import {IPositionManager} from "@uniswap/v4-periphery/src/interfaces/IPositionManager.sol";
import {Actions} from "@uniswap/v4-periphery/src/libraries/Actions.sol";
import {IPermit2} from "permit2/src/interfaces/IPermit2.sol";
import {PoolSwapTest} from "@uniswap/v4-core/src/test/PoolSwapTest.sol";

import {MockERC20} from "../src/mocks/MockERC20.sol";
import {GuardianHook} from "../src/GuardianHook.sol";
import {XLayerConfig} from "./base/XLayerConfig.sol";
import {AddressBookScript} from "./base/AddressBook.sol";

contract AddLiquidityScript is AddressBookScript {
    uint160 internal constant SQRT_PRICE_1_1 = 79228162514264337593543950336;

    function run() external {
        uint256 pk = vm.envUint("AGENT_PK");
        address agent = vm.addr(pk);

        address hookAddress = vm.envAddress("GUARDIAN_HOOK");
        address base = vm.envAddress("BASE");
        address rug = vm.envAddress("RUG");
        address poolManager = vm.envOr("POOL_MANAGER", XLayerConfig.POOL_MANAGER);
        address positionManager = vm.envOr("POSITION_MANAGER", XLayerConfig.POSITION_MANAGER);
        address permit2 = vm.envOr("PERMIT2", XLayerConfig.PERMIT2);
        address riskOracle = vm.envAddress("RISK_ORACLE");

        address c0 = base < rug ? base : rug;
        address c1 = base < rug ? rug : base;

        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(c0),
            currency1: Currency.wrap(c1),
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(hookAddress)
        });

        int24 tickLower = -600;
        int24 tickUpper = 600;
        uint128 liquidity = uint128(
            LiquidityAmounts.getLiquidityForAmounts(
                SQRT_PRICE_1_1,
                TickMath.getSqrtPriceAtTick(tickLower),
                TickMath.getSqrtPriceAtTick(tickUpper),
                100_000 ether,
                100_000 ether
            )
        );

        (uint256 amount0Expected, uint256 amount1Expected) = LiquidityAmounts.getAmountsForLiquidity(
            SQRT_PRICE_1_1,
            TickMath.getSqrtPriceAtTick(tickLower),
            TickMath.getSqrtPriceAtTick(tickUpper),
            liquidity
        );

        vm.startBroadcast(pk);
        _approve(IPermit2(permit2), base, positionManager);
        _approve(IPermit2(permit2), rug, positionManager);

        _mintLiquidity(
            IPositionManager(positionManager),
            key,
            tickLower,
            tickUpper,
            liquidity,
            amount0Expected + 1,
            amount1Expected + 1,
            agent,
            block.timestamp + 600
        );

        MockERC20(base).approve(hookAddress, type(uint256).max);
        GuardianHook(hookAddress).fundReserve(key, 50_000 ether);

        PoolSwapTest swapHelper = new PoolSwapTest(IPoolManager(poolManager));
        vm.stopBroadcast();

        writeAddresses(
            agent, riskOracle, poolManager, positionManager, hookAddress, bytes32(0), base, rug, key, address(swapHelper)
        );

        console2.log("Liquidity added. Reserve funded. Swap helper:", address(swapHelper));
    }

    function _mintLiquidity(
        IPositionManager posm,
        PoolKey memory poolKey,
        int24 tickLower,
        int24 tickUpper,
        uint128 liquidity,
        uint256 amount0Max,
        uint256 amount1Max,
        address agent,
        uint256 deadline
    ) internal {
        bytes memory actions = abi.encodePacked(
            uint8(Actions.MINT_POSITION), uint8(Actions.SETTLE_PAIR), uint8(Actions.SWEEP), uint8(Actions.SWEEP)
        );
        bytes[] memory params = new bytes[](4);
        params[0] = abi.encode(poolKey, tickLower, tickUpper, liquidity, amount0Max, amount1Max, agent, "");
        params[1] = abi.encode(poolKey.currency0, poolKey.currency1);
        params[2] = abi.encode(poolKey.currency0, agent);
        params[3] = abi.encode(poolKey.currency1, agent);
        posm.modifyLiquidities(abi.encode(actions, params), deadline);
    }

    function _approve(IPermit2 permit2, address token, address spender) internal {
        MockERC20(token).approve(address(permit2), type(uint256).max);
        permit2.approve(token, spender, type(uint160).max, type(uint48).max);
    }
}
