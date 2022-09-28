// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/utils/ERC1155HolderUpgradeable.sol";
import "./lib/ERC20Tokens.sol";
import "./interfaces/INFTSalesMarket.sol";
import "./interfaces/INFT.sol";
import "./interfaces/IBaseInfo.sol";
import "./interfaces/IOracle.sol";

contract NFTSalesMarket is ERC1155HolderUpgradeable, ERC20Tokens, INFTSalesMarket {
    using SafeERC20Upgradeable for IERC20MetadataUpgradeable;

    // Internal NFT token instance
    INFT public internalToken;

    // Base info instance
    IBaseInfo public baseInfo;

    // Oracle instance
    IOracle public oracle;

    // Used to store minted NFTs tokenId rang
	struct TokenIdRang {
		uint start;
		uint end;
	}

    // Used to store the NFT data
    struct NFTData {
        bool isExist;
        bool isOpenSale;
        address baseTokenAddress;
        uint price;
        bool isSetPrice;
        uint remainedQuantity;
        uint unsoldQuantity;
        uint nextAssignId;
        TokenIdRang[] rang;
    }

    // All NFT's prop id
    uint[] private propIds;

    // Mapping from prop id to NFT data
    mapping(uint => NFTData) private datas;

    function initialize(INFT _internalToken, IBaseInfo _baseInfo, IOracle _oracle, address[] memory _token20sAddress) public initializer {
        __ERC1155Holder_init();
        __ERC20Tokens_init(_token20sAddress);
        
        isAdmin[_msgSender()] = true;

        internalToken = _internalToken;
        baseInfo = _baseInfo;
        oracle = _oracle;
    }

    /*
     * Emitted when user buy NFT
     */
    event NFTSold(address indexed _user, uint _propId, uint _quantity);

    /**
     * @dev Add NFTs to sales market by prop id
     */
	function addNFTs(uint _propId, uint _quantity, uint _startTokenId) public override onlyInternal {
        NFTData storage data = datas[_propId];

        uint endTokenId;
		if (data.rang.length == 0) {
			endTokenId = 0;
		} else {
			endTokenId = data.rang[data.rang.length - 1].end;
		}
		require(_startTokenId > endTokenId, "start token id is error");

		if (!data.isExist) {
			propIds.push(_propId);
			data.isExist = true;
		}
		data.remainedQuantity += _quantity;
		if (data.nextAssignId == 0) {
			data.nextAssignId = _startTokenId;
		}
        TokenIdRang memory rang = TokenIdRang(_startTokenId, _startTokenId + _quantity - 1);
		data.rang.push(rang);
	}

    /**
     * @dev Change the pricing token and price of NFT
     * Can only be called by admin
     */
	function setNFTBaseTokenData(uint _propId, address _baseTokenAddress, uint _price) public onlyAdmin {
        require(datas[_propId].isExist, "NFT not exist");

        datas[_propId].baseTokenAddress = _baseTokenAddress;
		datas[_propId].price = _price;
        datas[_propId].isSetPrice = true;
	}

    /**
     * @dev Open NFT sale and set available quantity
     * Can only be called by admin
     */
	function openNFTSale(uint _propId, uint _quantity) public onlyAdmin {
        require(datas[_propId].isExist, "NFT not exist");
        require(datas[_propId].isSetPrice, "NFT not set price");
        require(!datas[_propId].isOpenSale, "NFT is open sale");
        require(_quantity > 0 && _quantity <= datas[_propId].remainedQuantity, "quantity is zero or greater than remained quantity");

		datas[_propId].isOpenSale = true;
        datas[_propId].unsoldQuantity = _quantity;
	}

    /**
     * @dev Close NFT sale
     * Can only be called by admin
     */
	function closeNFTSale(uint _propId) public onlyAdmin {
        require(datas[_propId].isExist, "NFT not exist");

		datas[_propId].isOpenSale = false;
        datas[_propId].unsoldQuantity = 0;
	}

    function getNextAssignId(NFTData memory data) private pure returns (uint) {
		uint nextAssignId = data.nextAssignId;

		for (uint i = 0; i < data.rang.length; i++) {
			if (nextAssignId == data.rang[i].end) {
				if (i == data.rang.length - 1) {
					return 0; // at this time, NFT unsoldQuantity is also zero
				} else {
					return data.rang[i + 1].start;
				}
			}
		}

		return ++nextAssignId;
	}

    function sold(uint _propId, uint _quantity) private {
        datas[_propId].remainedQuantity -= _quantity;
        datas[_propId].unsoldQuantity -= _quantity;

        uint[] memory tokenIds = new uint[](_quantity);
        uint[] memory tokenAmounts = new uint[](_quantity);

        for (uint i = 0; i < _quantity; i++) {
            require(datas[_propId].nextAssignId != 0, "next assign id is zero");
            uint tokenId = (_propId << 128) + datas[_propId].nextAssignId;
            tokenIds[i] = tokenId;
            tokenAmounts[i] = 1;
            datas[_propId].nextAssignId = getNextAssignId(datas[_propId]);
        }

        IERC1155Upgradeable token1155 = IERC1155Upgradeable(address(internalToken));
        token1155.safeBatchTransferFrom(address(this), _msgSender(), tokenIds, tokenAmounts, "0x");
    }

    /*
     * Emits a {NFTxSold} event
     *
     * Requirements:
     * - token must be in support tokens
     * - quantity must greater than zero and less than or equal to unsold quantity
     */
    function buyNFT(uint _propId, uint _quantity, address _payTokenAddress, uint _amount) public nonContract {
        require(isSupportToken[_payTokenAddress], "not in support tokens");
        require(_quantity > 0 && _quantity <= datas[_propId].unsoldQuantity, "quantity is zero or greater than unsold quantity");

        uint amount;
        if (_payTokenAddress == datas[_propId].baseTokenAddress) {
            amount = _quantity * datas[_propId].price;
            require(_amount == amount, "amount is not equal");
        } else {
            amount = oracle.getPayAmount(_quantity * datas[_propId].price, datas[_propId].baseTokenAddress, _payTokenAddress);
            require(_amount >= amount, "amount is not enough");
        }

        address businessAccount = baseInfo.getBusinessAccount();
        IERC20MetadataUpgradeable payToken = IERC20MetadataUpgradeable(_payTokenAddress);
        payToken.safeTransferFrom(_msgSender(), businessAccount, amount);

        sold(_propId, _quantity);

        emit NFTSold(_msgSender(), _propId, _quantity);
    }

    function getNFTPropIds() public view returns (uint[] memory) {
        return propIds;
    }

    function getNFTData(uint _propId) public view returns (bool, address, uint, uint, uint) {
        NFTData memory data = datas[_propId];

        return (data.isOpenSale, data.baseTokenAddress, data.price, data.remainedQuantity, data.unsoldQuantity);
    }
}
