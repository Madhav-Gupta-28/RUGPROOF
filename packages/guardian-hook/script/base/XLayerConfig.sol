// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @notice Canonical Uniswap v4 deployments on X Layer mainnet (chainId 196).
library XLayerConfig {
    uint256 internal constant CHAIN_ID = 196;
    address internal constant POOL_MANAGER = 0x360E68faCcca8cA495c1B759Fd9EEe466db9FB32;
    address internal constant POSITION_MANAGER = 0xcF1EAFC6928dC385A342E7C6491d371d2871458b;
    address internal constant PERMIT2 = 0x000000000022D473030F116dDEE9F6B43aC78BA3;
    address internal constant UNIVERSAL_ROUTER = 0xDa00aE15d3A71466517129255255db7c0c0956d3;
}
