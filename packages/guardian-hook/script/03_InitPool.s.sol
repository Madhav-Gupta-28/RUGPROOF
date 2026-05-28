// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";

import {MockERC20} from "../src/mocks/MockERC20.sol";
import {GuardianHook} from "../src/GuardianHook.sol";
import {XLayerConfig} from "./base/XLayerConfig.sol";

contract InitPoolScript is Script {
    using PoolIdLibrary for PoolKey;

    uint160 internal constant SQRT_PRICE_1_1 = 79228162514264337593543950336;

    function run()
        external
        returns (address base, address rug, PoolKey memory key, PoolId poolId)
    {
        uint256 pk = vm.envUint("AGENT_PK");
        address poolManager = vm.envOr("POOL_MANAGER", XLayerConfig.POOL_MANAGER);
        address hookAddress = vm.envAddress("GUARDIAN_HOOK");

        vm.startBroadcast(pk);
        MockERC20 baseToken = new MockERC20("Base Token", "BASE");
        MockERC20 rugToken = new MockERC20("Rug Token", "RUG");
        baseToken.mint(msg.sender, 1_000_000 ether);
        rugToken.mint(msg.sender, 1_000_000 ether);

        (Currency currency0, Currency currency1) = address(baseToken) < address(rugToken)
            ? (Currency.wrap(address(baseToken)), Currency.wrap(address(rugToken)))
            : (Currency.wrap(address(rugToken)), Currency.wrap(address(baseToken)));

        key = PoolKey({
            currency0: currency0,
            currency1: currency1,
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(hookAddress)
        });

        IPoolManager(poolManager).initialize(key, SQRT_PRICE_1_1);
        GuardianHook(hookAddress).registerPool(key, address(rugToken), address(baseToken), 5000);
        vm.stopBroadcast();

        poolId = key.toId();
        base = address(baseToken);
        rug = address(rugToken);

        string memory path = string.concat(vm.projectRoot(), "/deploy/addresses.json");
        string memory j = "addresses";
        vm.serializeAddress(j, "BASE", base);
        vm.serializeAddress(j, "RUG", rug);
        string memory json = vm.serializeBytes32(j, "POOL_ID", PoolId.unwrap(poolId));
        vm.writeJson(json, path);

        console2.log("BASE:", base);
        console2.log("RUG :", rug);
        console2.logBytes32(PoolId.unwrap(poolId));
    }
}
