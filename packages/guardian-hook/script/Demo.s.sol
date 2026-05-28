// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";
import {PoolSwapTest} from "@uniswap/v4-core/src/test/PoolSwapTest.sol";

import {RiskOracle} from "../src/RiskOracle.sol";
import {GuardianHook} from "../src/GuardianHook.sol";
import {IRiskOracle} from "../src/interfaces/IRiskOracle.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";
import {BlockedSwapProbe} from "../src/helpers/BlockedSwapProbe.sol";
import {AddressBookScript} from "./base/AddressBook.sol";
import {XLayerConfig} from "./base/XLayerConfig.sol";

contract DemoScript is AddressBookScript {
    using PoolIdLibrary for PoolKey;

    function run() external {
        uint256 pk = vm.envUint("AGENT_PK");
        address agent = vm.addr(pk);
        address oracleAddress = vm.envAddress("RISK_ORACLE");
        address hookAddress = vm.envAddress("GUARDIAN_HOOK");
        address base = vm.envAddress("BASE");
        address rug = vm.envAddress("RUG");
        address swapHelper = vm.envAddress("SWAP_HELPER");
        address poolManager = vm.envOr("POOL_MANAGER", XLayerConfig.POOL_MANAGER);
        address positionManager = vm.envOr("POSITION_MANAGER", XLayerConfig.POSITION_MANAGER);

        address c0 = base < rug ? base : rug;
        address c1 = base < rug ? rug : base;
        bool baseIsCurrency0 = base == c0;

        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(c0),
            currency1: Currency.wrap(c1),
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(hookAddress)
        });

        PoolSwapTest.TestSettings memory settings =
            PoolSwapTest.TestSettings({takeClaims: false, settleUsingBurn: false});

        PoolSwapTest helper = PoolSwapTest(swapHelper);

        vm.startBroadcast(pk);
        BlockedSwapProbe probe = new BlockedSwapProbe();
        vm.stopBroadcast();

        // Tx A setup: RUG is OK
        vm.startBroadcast(pk);
        RiskOracle(oracleAddress).setRisk(rug, IRiskOracle.Risk.OK, 8500);
        vm.stopBroadcast();
        console2.log("Tx A setup: RUG -> OK");

        // Tx A: swap BASE -> RUG
        vm.startBroadcast(pk);
        MockERC20(base).approve(swapHelper, type(uint256).max);
        BalanceDelta okDelta = _swapBaseForRug(helper, key, settings, baseIsCurrency0, 100 ether);
        vm.stopBroadcast();
        console2.log("Tx A: swap BASE -> RUG succeeded");
        console2.logInt(int256(okDelta.amount0()));
        console2.logInt(int256(okDelta.amount1()));

        // Tx B: flip to DANGER
        vm.startBroadcast(pk);
        RiskOracle(oracleAddress).setRisk(rug, IRiskOracle.Risk.DANGER, 1000);
        vm.stopBroadcast();
        console2.log("Tx B: RUG -> DANGER");

        // Tx C: blocked swap via probe (outer tx succeeds, inner swap reverts)
        vm.startBroadcast(pk);
        probe.attempt(
            swapHelper,
            abi.encodeWithSelector(PoolSwapTest.swap.selector, key, _swapParams(baseIsCurrency0, 50 ether), settings, "")
        );
        vm.stopBroadcast();
        console2.log("Tx C: swap reverted as expected");

        // Tx D: refund claim
        vm.startBroadcast(pk);
        GuardianHook(hookAddress).claimRefund(key);
        vm.stopBroadcast();
        console2.log("Tx D: refund claimed");

        writeAddresses(
            agent,
            oracleAddress,
            poolManager,
            positionManager,
            hookAddress,
            bytes32(0),
            base,
            rug,
            key,
            swapHelper
        );
    }

    function _swapBaseForRug(
        PoolSwapTest swapHelper,
        PoolKey memory key,
        PoolSwapTest.TestSettings memory settings,
        bool baseIsCurrency0,
        uint256 amountIn
    ) internal returns (BalanceDelta delta) {
        delta = swapHelper.swap(key, _swapParams(baseIsCurrency0, amountIn), settings, "");
    }

    function _swapParams(bool zeroForOne, uint256 amountIn) internal pure returns (SwapParams memory params) {
        params = SwapParams({
            zeroForOne: zeroForOne,
            amountSpecified: -int256(amountIn),
            sqrtPriceLimitX96: zeroForOne ? TickMath.MIN_SQRT_PRICE + 1 : TickMath.MAX_SQRT_PRICE - 1
        });
    }
}
