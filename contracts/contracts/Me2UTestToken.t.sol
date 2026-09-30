// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Me2UTestToken} from "./Me2UTestToken.sol";

interface Vm {
    function chainId(uint256 newChainId) external;
    function prank(address sender) external;
    function expectRevert(bytes calldata revertData) external;
}

contract Me2UTestTokenTest {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    uint256 private constant SEPOLIA_CHAIN_ID = 11_155_111;

    Me2UTestToken private token;

    function setUp() public {
        vm.chainId(SEPOLIA_CHAIN_ID);
        token = new Me2UTestToken();
    }

    function testFaucetMintsOneThousandTestTokensOnce() public {
        token.claimTestTokens();

        require(token.balanceOf(address(this)) == 1_000 ether, "incorrect faucet balance");
        require(token.hasClaimed(address(this)), "claim was not recorded");
    }

    function testFaucetRejectsDuplicateClaims() public {
        token.claimTestTokens();
        vm.expectRevert(abi.encodeWithSelector(Me2UTestToken.AlreadyClaimed.selector));
        token.claimTestTokens();
    }

    function testTokenTransfersUseErc20Balances() public {
        address recipient = address(0xBEEF);
        token.claimTestTokens();
        token.transfer(recipient, 25 ether);

        require(token.balanceOf(recipient) == 25 ether, "transfer balance not credited");
        require(token.balanceOf(address(this)) == 975 ether, "sender balance incorrect");
    }

    function testConstructorRejectsNonSepoliaChain() public {
        vm.chainId(1);
        vm.expectRevert(abi.encodeWithSelector(Me2UTestToken.UnsupportedNetwork.selector, 1));
        new Me2UTestToken();
    }

    function testEachAddressCanClaimIndependently() public {
        address secondAccount = address(0xCAFE);
        vm.prank(secondAccount);
        token.claimTestTokens();

        require(token.balanceOf(secondAccount) == 1_000 ether, "second account not funded");
    }
}
