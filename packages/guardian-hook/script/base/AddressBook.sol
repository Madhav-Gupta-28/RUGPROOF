// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script} from "forge-std/Script.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";

abstract contract AddressBookScript is Script {
    using PoolIdLibrary for PoolKey;

    function writeAddresses(
        address agent,
        address riskOracle,
        address poolManager,
        address positionManager,
        address guardianHook,
        bytes32 hookSalt,
        address base,
        address rug,
        PoolKey memory key,
        address swapHelper
    ) internal {
        string memory path = string.concat(vm.projectRoot(), "/deploy/addresses.json");
        string memory keyName = "addresses";
        vm.serializeUint(keyName, "CHAIN_ID", 196);
        vm.serializeAddress(keyName, "AGENT_ADDR", agent);
        vm.serializeAddress(keyName, "RISK_ORACLE", riskOracle);
        vm.serializeAddress(keyName, "POOL_MANAGER", poolManager);
        vm.serializeAddress(keyName, "POSITION_MANAGER", positionManager);
        vm.serializeAddress(keyName, "GUARDIAN_HOOK", guardianHook);
        vm.serializeBytes32(keyName, "HOOK_SALT", hookSalt);
        vm.serializeAddress(keyName, "BASE", base);
        vm.serializeAddress(keyName, "RUG", rug);
        vm.serializeBytes32(keyName, "POOL_ID", PoolId.unwrap(key.toId()));
        string memory json = vm.serializeAddress(keyName, "SWAP_HELPER", swapHelper);
        vm.writeJson(json, path);
    }
}
