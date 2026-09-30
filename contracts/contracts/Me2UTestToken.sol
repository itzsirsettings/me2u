// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Valueless community testing token. It is restricted to Ethereum Sepolia.
/// @dev The open one-time faucet is intentionally sybil-able and is not production issuance.
contract Me2UTestToken is ERC20 {
    uint256 public constant SEPOLIA_CHAIN_ID = 11_155_111;
    uint256 public constant TEST_CLAIM_AMOUNT = 1_000 ether;

    mapping(address account => bool claimed) public hasClaimed;

    error UnsupportedNetwork(uint256 actualChainId);
    error AlreadyClaimed();

    constructor() ERC20("Me2U Test Token", "ME2UT") {
        if (block.chainid != SEPOLIA_CHAIN_ID) {
            revert UnsupportedNetwork(block.chainid);
        }
    }

    function claimTestTokens() external {
        if (hasClaimed[msg.sender]) revert AlreadyClaimed();
        hasClaimed[msg.sender] = true;
        _mint(msg.sender, TEST_CLAIM_AMOUNT);
    }
}
