// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/IERC1155MetadataURIUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155Upgradeable.sol";
import "../lib/Modifiers.sol";
import "../interfaces/IUserTokens.sol";
import "../interfaces/INFT.sol";

contract UserTokens is Modifiers, IUserTokens {
    // Internal NFT token instance
    INFT public internalToken;

    struct TokenInfo {
        // all user token id
        uint256[] tokenIds;
        // mapping from token id to index
        mapping(uint256 => uint256) tokenIdIndex;
    }

    // Mapping from user address to user token info
    mapping(address => TokenInfo) internal userTokenInfo;

    function initialize(INFT _internalToken) public initializer {
        __Modifiers_init();

        internalToken = _internalToken;
    }

    /**
     * @dev Add user token id
     *
     * Requirements:
     * - token address must be erc721 or erc1155 contract address
     */
    function addUserTokenId(address _userAddress, uint256 _tokenId) external override onlyInternal {
        TokenInfo storage tokenInfo = userTokenInfo[_userAddress];

        if (tokenInfo.tokenIdIndex[_tokenId] == 0) {
            tokenInfo.tokenIds.push(_tokenId);
            // index start from 1
            tokenInfo.tokenIdIndex[_tokenId] = tokenInfo.tokenIds.length;
        }
    }

    /**
     * @dev Delete user token id
     */
    function deleteUserTokenId(address _userAddress, uint256 _tokenId) external override onlyInternal {
        TokenInfo storage tokenInfo = userTokenInfo[_userAddress];

        require(tokenInfo.tokenIdIndex[_tokenId] > 0, "index is zero");

        // get the last token id of the array 
        uint256 lastTokenId = tokenInfo.tokenIds[tokenInfo.tokenIds.length - 1];
        // use the last token id to replace the current token id (the index minus 1 is the index of the current token id)
        tokenInfo.tokenIds[tokenInfo.tokenIdIndex[_tokenId] - 1] = lastTokenId;
        // Use the index of the current token id to replace the index of the last token id
        tokenInfo.tokenIdIndex[lastTokenId] = tokenInfo.tokenIdIndex[_tokenId];
        // delete the token id
        delete tokenInfo.tokenIds[tokenInfo.tokenIds.length - 1];
        // delete the index of the token id (set index to 0)
        delete tokenInfo.tokenIdIndex[_tokenId];
        // delete the last element of the array
        tokenInfo.tokenIds.pop();
    }

    function getUserTokenLength(address _userAddress) public view returns (uint256) {
        return userTokenInfo[_userAddress].tokenIds.length;
    }

    function getUserTokenInfo(address _userAddress, uint256 _index) public view returns (uint256 tokenId, string memory uri, uint256 balance) {
        tokenId = userTokenInfo[_userAddress].tokenIds[_index];

        IERC1155MetadataURIUpgradeable token1155Metadata = IERC1155MetadataURIUpgradeable(address(internalToken));
        IERC1155Upgradeable token1155 = IERC1155Upgradeable(address(internalToken));
        uri = token1155Metadata.uri(tokenId);
        balance = token1155.balanceOf(_userAddress, tokenId);
    }
}
