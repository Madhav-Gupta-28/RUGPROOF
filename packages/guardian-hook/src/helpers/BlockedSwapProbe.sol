// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @notice Wraps a reverting swap so forge can broadcast a successful tx for demo proof.
contract BlockedSwapProbe {
    event SwapBlocked(address target);

    function attempt(address target, bytes calldata data) external {
        (bool ok,) = target.call(data);
        if (ok) revert("expected swap to revert");
        emit SwapBlocked(target);
    }
}
