// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";

import {MockERC20} from "../src/mocks/MockERC20.sol";
import {GuardianHook} from "../src/GuardianHook.sol";

/// @notice Sprint fallback: funds hook reserve and leaves router-based liquidity add
///         as an environment-specific step.
contract AddLiquidityScript is Script {
    function run() external {
        uint256 pk = vm.envUint("AGENT_PK");

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
        MockERC20(base).mint(msg.sender, 100_000 ether);
        MockERC20(base).approve(hookAddress, type(uint256).max);
        GuardianHook(hookAddress).fundReserve(key, 50_000 ether);
        vm.stopBroadcast();

        console2.log("Reserve funded for refund path.");
        console2.log("Liquidity add via PositionManager should run in env where routers are available.");
    }
}
