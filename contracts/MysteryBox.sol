// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./lib/Modifiers.sol";
import "./interfaces/IMysteryBox.sol";

contract MysteryBox is Modifiers, IMysteryBox {
	// Used to store minted NFTs tokenId rang
	struct TokenIdRang {
		uint start;
		uint end;
	}

	// Used to store the NFT data
	struct NFTData {
		bool isExist;
		uint remainedQuantity;
		uint nextAssignId;
		TokenIdRang[] rang;
	}

	// Used to store the box pool data
	struct BoxPool {
		// pricing token address
		address baseTokenAddress;
		uint price;
		uint[] NFTPropIds;
		// mapping from NFT prop id to NFT data
		mapping(uint => NFTData) NFTDatas;
		uint remainedTotal;
		uint unsoldTotal;
	}

	// Box pool instance
	BoxPool private boxPool;

	function initialize(address _baseTokenAddress, uint _price) public initializer {
		__Modifiers_init();

		isAdmin[_msgSender()] = true;
		boxPool.baseTokenAddress = _baseTokenAddress;
		boxPool.price = _price;
	}

    /**
     * @dev Change the pricing token and price of box pool
     * Can only be called by admin
     */
	function setPoolBaseTokenData(address _baseTokenAddress, uint _price) public onlyAdmin {
		boxPool.baseTokenAddress = _baseTokenAddress;
		boxPool.price = _price;
	}

    /**
     * @dev Add NFTs to box pool by prop id
     */
	function addNFTsToBoxPool(uint _propId, uint _quantity, uint _startTokenId) public override onlyInternal {
		NFTData storage data = boxPool.NFTDatas[_propId];

		uint endTokenId;
		if (data.rang.length == 0) {
			endTokenId = 0;
		} else {
			endTokenId = data.rang[data.rang.length - 1].end;
		}
		require(_startTokenId > endTokenId, "start token id is error");

		if (!data.isExist) {
			boxPool.NFTPropIds.push(_propId);
			data.isExist = true;
		}
		data.remainedQuantity += _quantity;
		if (data.nextAssignId == 0) {
			data.nextAssignId = _startTokenId;
		}
		TokenIdRang memory rang = TokenIdRang(_startTokenId, _startTokenId + _quantity - 1);
		data.rang.push(rang);

		boxPool.remainedTotal += _quantity;
		boxPool.unsoldTotal += _quantity;
	}

    /**
     * @dev Sold mystery box
     */
	function mysteryBoxSold(uint _quantity) public override onlyInternal {
		boxPool.unsoldTotal -= _quantity;
	}

	function getNextAssignId(NFTData memory data) private pure returns (uint) {
		uint nextAssignId = data.nextAssignId;

		for (uint i = 0; i < data.rang.length; i++) {
			if (nextAssignId == data.rang[i].end) {
				if (i == data.rang.length - 1) {
					return 0; // at this time, NFT remainedQuantity is also zero
				} else {
					return data.rang[i + 1].start;
				}
			}
		}

		return ++nextAssignId;
	}

    /**
     * @dev Open a mystery box
     */
	function mysteryBoxOpened(uint _propId) public override onlyInternal {
		NFTData storage data = boxPool.NFTDatas[_propId];

		require(boxPool.remainedTotal > boxPool.unsoldTotal, "all sold NFTs has been opened");
		require(data.remainedQuantity > 0, "the NFT remained is zero");
		boxPool.remainedTotal--;
		data.remainedQuantity--;
		data.nextAssignId = getNextAssignId(data);
	}

	function getPoolBaseTokenData() public view override returns (address, uint) {
		return (boxPool.baseTokenAddress, boxPool.price);
	}

	function getNFTPropIdsLength() public view override returns (uint) {
		return boxPool.NFTPropIds.length;
	}

	function getNFTPropId(uint _index) public view override returns (uint) {
		return boxPool.NFTPropIds[_index];
	}

	function getNFTData(uint _propId) public view override returns (uint, uint) {
		NFTData memory data = boxPool.NFTDatas[_propId];

		return (data.remainedQuantity, data.nextAssignId);
	}

	function getBoxPoolRemainedQuantity() public view override returns (uint) {
		return boxPool.remainedTotal;
	}

	function getBoxPoolUnsoldQuantity() public view override returns (uint) {
		return boxPool.unsoldTotal;
	}
}
