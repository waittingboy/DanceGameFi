// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../lib/UserTokens.sol";

contract UserTokensMock is UserTokens {
    function getUserTokenIdIndex(address user, uint256 tokenId) public view returns (uint256) {
        return userTokenInfo[user].tokenIdIndex[tokenId];
    }
}
