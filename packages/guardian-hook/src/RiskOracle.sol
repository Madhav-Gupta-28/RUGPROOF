// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IRiskOracle} from "./interfaces/IRiskOracle.sol";

/// @notice On-chain mirror of RUGNOT Guardian verdicts. Owner = RUGNOT agent wallet.
contract RiskOracle is IRiskOracle {
    address public owner;

    mapping(address => Risk) private _risk;
    mapping(address => uint16) private _score;
    mapping(address => uint256) private _updatedAt;

    event RiskSet(address indexed token, Risk risk, uint16 scoreBps, uint256 at);
    event OwnerTransferred(address indexed previous, address indexed next);

    error NotOwner();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address _owner) {
        owner = _owner;
        emit OwnerTransferred(address(0), _owner);
    }

    function transferOwnership(address next) external onlyOwner {
        emit OwnerTransferred(owner, next);
        owner = next;
    }

    function setRisk(address token, Risk r, uint16 scoreBps) public onlyOwner {
        _risk[token] = r;
        _score[token] = scoreBps;
        _updatedAt[token] = block.timestamp;
        emit RiskSet(token, r, scoreBps, block.timestamp);
    }

    function setRiskBatch(address[] calldata tokens, Risk[] calldata risks, uint16[] calldata scores) external onlyOwner {
        require(tokens.length == risks.length && tokens.length == scores.length, "len");
        for (uint256 i = 0; i < tokens.length; i++) {
            setRisk(tokens[i], risks[i], scores[i]);
        }
    }

    function riskOf(address token) external view returns (Risk) {
        return _risk[token];
    }

    function scoreBpsOf(address token) external view returns (uint16) {
        return _score[token];
    }

    function updatedAt(address token) external view returns (uint256) {
        return _updatedAt[token];
    }
}
