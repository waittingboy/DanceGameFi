// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/utils/ERC1155HolderUpgradeable.sol";
import "./interfaces/INFT.sol";

contract NFTStake is ContextUpgradeable, ERC1155HolderUpgradeable {
    // Internal NFT token instance
    INFT public internalToken;

    // Used to store staked NFTs
    struct StakedNFTs {
        // all staked token id
        uint[] tokenIds;
        // mapping from token id to index
        mapping(uint => uint) tokenIdIndex;
    }

    // Mapping from user address to user staked NFTs
    mapping(address => StakedNFTs) private userStakedNFTs;

    function initialize(INFT _internalToken) public initializer {
        __Context_init();
        __ERC1155Holder_init();

        internalToken = _internalToken;
    }

    /**
     * @dev Stake NFTs to get game stage property
     */
    function stake(uint[] memory _tokenIds) public {
        IERC1155Upgradeable token1155 = IERC1155Upgradeable(address(internalToken));
        StakedNFTs storage nfts = userStakedNFTs[_msgSender()];

        uint[] memory tokenQuantities = new uint[](_tokenIds.length);

        for (uint i = 0; i < _tokenIds.length; i++) {
            require(token1155.balanceOf(_msgSender(), _tokenIds[i]) == 1, "nft balance is zero");
            nfts.tokenIds.push(_tokenIds[i]);
            // index start from 1
            nfts.tokenIdIndex[_tokenIds[i]] = nfts.tokenIds.length;
            tokenQuantities[i] = 1;
        }

        require(token1155.isApprovedForAll(_msgSender(), address(this)), "transfer not approved");
        token1155.safeBatchTransferFrom(_msgSender(), address(this), _tokenIds, tokenQuantities, "0x");
    }

    /**
     * @dev cancel all stake NFTs
     */
    function cancelAllStake() public {
        StakedNFTs storage nfts = userStakedNFTs[_msgSender()];

        uint[] memory tokenIds = nfts.tokenIds;
        uint[] memory tokenQuantities = new uint[](tokenIds.length);

        require(tokenIds.length > 0, "you are not staked NFTs");

        for (uint i = 0; i < tokenIds.length; i++) {
            nfts.tokenIdIndex[tokenIds[i]] = 0;
            tokenQuantities[i] = 1;
        }

        IERC1155Upgradeable token1155 = IERC1155Upgradeable(address(internalToken));
        token1155.safeBatchTransferFrom(address(this), _msgSender(), tokenIds, tokenQuantities, "0x");

        delete nfts.tokenIds;
    }

    /**
     * @dev cancel stake NFTs
     */
    function cancelStake(uint[] memory _tokenIds) public {
        uint[] memory tokenQuantities = new uint[](_tokenIds.length);

        for (uint i = 0; i < _tokenIds.length; i++) {
            deleteTokenId(_msgSender(), _tokenIds[i]);
            tokenQuantities[i] = 1;
        }

        IERC1155Upgradeable token1155 = IERC1155Upgradeable(address(internalToken));
        token1155.safeBatchTransferFrom(address(this), _msgSender(), _tokenIds, tokenQuantities, "0x");
    }

    /**
     * @dev Delete the token id
     */
    function deleteTokenId(address _userAddress, uint _tokenId) private {
        StakedNFTs storage nfts = userStakedNFTs[_userAddress];

        require(nfts.tokenIdIndex[_tokenId] > 0, "you are not staked all the NFTs");

        // get the last token id of the array 
        uint256 lastTokenId = nfts.tokenIds[nfts.tokenIds.length - 1];
        // use the last token id to replace the current token id (the index minus 1 is the index of the current token id)
        nfts.tokenIds[nfts.tokenIdIndex[_tokenId] - 1] = lastTokenId;
        // Use the index of the current token id to replace the index of the last token id
        nfts.tokenIdIndex[lastTokenId] = nfts.tokenIdIndex[_tokenId];
        // delete the token id
        delete nfts.tokenIds[nfts.tokenIds.length - 1];
        // delete the index of the token id (set index to 0)
        delete nfts.tokenIdIndex[_tokenId];
        // delete the last element of the array
        nfts.tokenIds.pop();
    }   

    function getUserStakedNFTs(address _userAddress) public view returns (uint[] memory) {
        return userStakedNFTs[_userAddress].tokenIds;
    }

    function getUserNFTStakedState(address _userAddress, uint _tokenId) public view returns (bool) {
        return userStakedNFTs[_userAddress].tokenIdIndex[_tokenId] > 0;
    }
}