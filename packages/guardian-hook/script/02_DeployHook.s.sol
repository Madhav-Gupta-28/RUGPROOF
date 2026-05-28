// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {HookMiner} from "@uniswap/v4-periphery/src/utils/HookMiner.sol";

import {IRiskOracle} from "../src/interfaces/IRiskOracle.sol";
import {GuardianHook} from "../src/GuardianHook.sol";

contract DeployHookScript is Script {
    address internal constant CREATE2_DEPLOYER = 0x4e59b44847b379578588920cA78FbF26c0B4956C;

    function run() external returns (GuardianHook hook, bytes32 salt) {
        uint256 pk = vm.envUint("AGENT_PK");
        address agent = vm.addr(pk);
        address poolManager = vm.envAddress("POOL_MANAGER");
        address oracle = vm.envAddress("RISK_ORACLE");

        uint160 flags =
            uint160(Hooks.AFTER_INITIALIZE_FLAG | Hooks.BEFORE_SWAP_FLAG | Hooks.AFTER_SWAP_FLAG);

        (address hookAddr, bytes32 minedSalt) = HookMiner.find(
            CREATE2_DEPLOYER,
            flags,
            type(GuardianHook).creationCode,
            abi.encode(IPoolManager(poolManager), IRiskOracle(oracle), agent)
        );

        vm.startBroadcast(pk);
        hook = new GuardianHook{salt: minedSalt}(IPoolManager(poolManager), IRiskOracle(oracle), agent);
        vm.stopBroadcast();

        require(address(hook) == hookAddr, "salt mismatch");
        salt = minedSalt;

        string memory path = string.concat(vm.projectRoot(), "/deploy/addresses.json");
        string memory key = "addresses";
        vm.serializeAddress(key, "GUARDIAN_HOOK", address(hook));
        vm.serializeAddress(key, "POOL_MANAGER", poolManager);
        string memory json = vm.serializeBytes32(key, "HOOK_SALT", salt);
        vm.writeJson(json, path);

        console2.log("GuardianHook:", address(hook));
        console2.logBytes32(salt);
    }
}
