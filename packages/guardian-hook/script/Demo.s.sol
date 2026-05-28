// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";

import {RiskOracle} from "../src/RiskOracle.sol";
import {GuardianHook} from "../src/GuardianHook.sol";
import {IRiskOracle} from "../src/interfaces/IRiskOracle.sol";

contract DemoScript is Script {
    function run() external {
        uint256 pk = vm.envUint("AGENT_PK");
        address oracleAddress = vm.envAddress("RISK_ORACLE");
        address hookAddress = vm.envAddress("GUARDIAN_HOOK");
        address base = vm.envAddress("BASE");
        address rug = vm.envAddress("RUG");

        address c0 = base < rug ? base : rug;
        address c1 = base < rug ? rug : base;
        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(c0),
            currency1: Currency.wrap(c1),
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(hookAddress)
        });

        vm.startBroadcast(pk);
        RiskOracle(oracleAddress).setRisk(rug, IRiskOracle.Risk.OK, 8500);
        console2.log("Tx A placeholder: set RUG -> OK");

        RiskOracle(oracleAddress).setRisk(rug, IRiskOracle.Risk.DANGER, 1000);
        console2.log("Tx B: set RUG -> DANGER");

        try GuardianHook(hookAddress).claimRefund(key) {
            console2.log("Tx D: refund claim success");
        } catch {
            console2.log("Tx D: no claim available yet");
        }
        vm.stopBroadcast();

        console2.log("Tx C swap revert should be demonstrated with router-driven swap in target environment.");
    }
}
