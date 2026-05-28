// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";

import {RiskOracle} from "../src/RiskOracle.sol";

contract DeployOracleScript is Script {
    function run() external returns (RiskOracle oracle) {
        uint256 pk = vm.envUint("AGENT_PK");
        address agent = vm.addr(pk);

        vm.startBroadcast(pk);
        oracle = new RiskOracle(agent);
        vm.stopBroadcast();

        string memory path = string.concat(vm.projectRoot(), "/deploy/addresses.json");
        string memory key = "addresses";
        vm.serializeAddress(key, "AGENT_ADDR", agent);
        string memory json = vm.serializeAddress(key, "RISK_ORACLE", address(oracle));
        vm.writeJson(json, path);

        console2.log("RiskOracle:", address(oracle));
        console2.log("Owner:", agent);
    }
}
