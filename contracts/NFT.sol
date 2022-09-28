// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "./interfaces/INFT.sol";
import "./interfaces/IBaseInfo.sol";
import "./interfaces/IMysteryBox.sol";
import "./interfaces/INFTSalesMarket.sol";
import "./interfaces/IUserTokens.sol";

contract NFT is OwnableUpgradeable, ERC1155Upgradeable, INFT {
    // Base info instance
    IBaseInfo public baseInfo;

    // Mystery box instance
    IMysteryBox public mysteryBox;

    // NFT Sales Market instance
    INFTSalesMarket public salesMarket;

    // User tokens instance
    IUserTokens public userTokens;

    // Mapping from tokenId to Uri
    mapping(uint => string) private tokenIdToUri;

    // The contract address of Mystery Box Market
    address public mysteryBoxMarketAddress;

    // Is allow mint or not
    bool public isAllowMint;

    function initialize(
        IBaseInfo _baseInfo, IMysteryBox _mysteryBox, INFTSalesMarket _salesMarket, IUserTokens _userTokens, address _mysteryBoxMarketAddress
        ) public initializer {
        __Ownable_init();
        __ERC1155_init("");

        baseInfo = _baseInfo;
        mysteryBox = _mysteryBox;
        salesMarket = _salesMarket;
        userTokens = _userTokens;
        mysteryBoxMarketAddress = _mysteryBoxMarketAddress;

        isAllowMint = true;
    }

    /*
     * Emitted when NFTs minted
     */
    event NFTMinted(uint _propId, uint _quantity, uint _type, uint[] _tokenIds);
    /*
     * Emitted when NFT burned
     */
    event NFTBurned(address _from, uint[] _tokenIds, uint[] _quantities);

    /**
     * @dev Mint NFTs
     *
     * Emits a {NFTMinted} event
     *
     * Requirements:
     * - must allow mint
     * - quantity must greater than zero
     */
    function mint(uint _propId, string memory _uri, uint _quantity, uint _type) external onlyOwner override {
        require(isAllowMint, "you can never mint again");
        require(_quantity > 0, "quantity is zero");

        uint newPropId = _propId << 128;
        uint mintedQuantity = baseInfo.getNFTMintedQuantity(_propId);

        uint[] memory tokenIds = new uint[](_quantity);
        uint[] memory tokenQuantities = new uint[](_quantity);

        for (uint i = 0; i < _quantity; i++) {
            uint id = mintedQuantity + i + 1;

            tokenIds[i] = newPropId + id;
            tokenQuantities[i] = 1;
            tokenIdToUri[tokenIds[i]] = _uri;
        }

        address to;
        if (_type == 1) { // airdrop
            to = baseInfo.getBusinessAccount();
        } else if (_type == 2) { // blind box
            to = mysteryBoxMarketAddress;
            mysteryBox.addNFTsToBoxPool(_propId, _quantity, mintedQuantity + 1);
        } else if (_type == 3) { // targeted sales
            to = address(salesMarket);
            salesMarket.addNFTs(_propId, _quantity, mintedQuantity + 1);
        }
        _mintBatch(to, tokenIds, tokenQuantities, "");

        // set NFT minted quantity
        baseInfo.setNFTMintedQuantity(_propId, _quantity);

        // add the token id which is mint
        for (uint i = 0; i < tokenIds.length; i++) {
            userTokens.addUserTokenId(to, tokenIds[i]);
        }

        emit NFTMinted(_propId, _quantity, _type, tokenIds);
    }

    /**
     * @dev Set not allow mint
     * Can only be called by owner, please call before you never need to mint again
     */
    function setNotAllowMint() public onlyOwner {
        isAllowMint = false;
    }

    /**
     * @dev Burn NFT
     *
     * Emits a {NFTBurned} event
     *
     * Requirements:
     * - 'ids' and 'quantities' must have the same length
     */
    function burn(uint[] memory _tokenIds, uint[] memory _quantities) public {
        require(_tokenIds.length == _quantities.length, "ids and quantities length mismatch");

        for (uint i = 0; i < _tokenIds.length; i++) {
            _burn(_msgSender(), _tokenIds[i], _quantities[i]);
            userTokens.deleteUserTokenId(_msgSender(), _tokenIds[i]);
        }

        emit NFTBurned(_msgSender(), _tokenIds, _quantities);
    }

    /**
     * @dev See {IERC1155-safeTransferFrom}
     */
    function safeTransferFrom(address _from, address _to, uint256 _id, uint256 _amount, bytes memory _data) public virtual override {
        uint balance = balanceOf(_from, _id);

        require(balance >= _amount && _amount > 0, "balance is less than amount or amount is zero");

        super.safeTransferFrom(_from, _to, _id, _amount, _data);

        if (balance - _amount == 0) {
            userTokens.deleteUserTokenId(_from, _id);
        }
        userTokens.addUserTokenId(_to, _id);
    }

    /**
     * @dev See {IERC1155-safeBatchTransferFrom}
     */
    function safeBatchTransferFrom(address _from, address _to, uint256[] memory _ids, uint256[] memory _amounts, bytes memory _data) public virtual override {
        uint[] memory balances = new uint[](_ids.length);
        for (uint i = 0; i < _ids.length; i++) {
            balances[i] = balanceOf(_from, _ids[i]);
            require(balances[i] >= _amounts[i] && _amounts[i] > 0, "balance is less than amount or amount is zero");
        }

        super.safeBatchTransferFrom(_from, _to, _ids, _amounts, _data);

        for (uint i = 0; i < _ids.length; i++) {
            if (balances[i] - _amounts[i] == 0) {
                userTokens.deleteUserTokenId(_from, _ids[i]);
            }
            userTokens.addUserTokenId(_to, _ids[i]);
        }
    }

    function uri(uint256 _tokenId) public view virtual override returns (string memory) {
        return tokenIdToUri[_tokenId];
    }
}
