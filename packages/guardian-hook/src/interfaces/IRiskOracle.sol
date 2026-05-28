// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface IRiskOracle {
    enum Risk {
        UNKNOWN,
        OK,
        CAUTION,
        DANGER
    }

    function riskOf(address token) external view returns (Risk);
    function scoreBpsOf(address token) external view returns (uint16);
    function updatedAt(address token) external view returns (uint256);
}













