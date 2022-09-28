// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/utils/ERC1155HolderUpgradeable.sol";
import "./lib/ERC20Tokens.sol";
import "./lib/RandomNumber.sol";
import "./interfaces/INFT.sol";
import "./interfaces/IBaseInfo.sol";
import "./interfaces/IMysteryBox.sol";
import "./interfaces/IOracle.sol";

contract MysteryBoxMarket is ERC1155HolderUpgradeable, ERC20Tokens, RandomNumber {
    using SafeERC20Upgradeable for IERC20MetadataUpgradeable;

    // Internal NFT token instance
    INFT public internalToken;

    // Base info instance
    IBaseInfo public baseInfo;

    // Mystery box instance
    IMysteryBox public mysteryBox;

    // Oracle instance
    IOracle public oracle;

    // User's mystery box info
    struct UserMysteryBox {
        uint unOpenedQuantity;
        uint[] tokenIds;
    }

    // Mapping from user to user's mystery box
    mapping(address => UserMysteryBox) private usersMysteryBox;

    // Max quantity of mystery box can be opened at one time
    uint private maxOpenQuantity;

    function initialize(
        INFT _internalToken, IBaseInfo _baseInfo, IMysteryBox _mysteryBox, IOracle _oracle, address[] memory _token20sAddress
        ) public initializer {
        __ERC1155Holder_init();
        __ERC20Tokens_init(_token20sAddress);
        // console.log("_msgSender() is",_msgSender());
        isAdmin[_msgSender()] = true;

        internalToken = _internalToken;
        baseInfo = _baseInfo;
        mysteryBox = _mysteryBox;
        oracle = _oracle;

        maxOpenQuantity = 10;
    }

    /*
     * Emitted when user buy mystery box
     */
    event MysteryBoxSold(address indexed _user, uint _quantity);
    /*
     * Emitted when user open mystery box
     */
    event MysteryBoxOpened(address indexed _user, uint[] _tokenIds);

    /**
     * @dev Adjust the max quantity of mystery box can be opened at one time
     * Can only be called by the current owner
     */
    function adjustMaxOpenQuantity(uint _maxOpenQuantity) public onlyAdmin {
        require(_maxOpenQuantity > 0, "quantity is zero");

        maxOpenQuantity = _maxOpenQuantity;
    }

    /*
     * Emits a {MysteryBoxSold} event
     *
     * Requirements:
     * - token must be in support tokens
     * - quantity must greater than zero and less than or equal to unsold quantity
     */
    function buyMysteryBox(uint _quantity, address _payTokenAddress, uint _amount) public nonContract {
        require(isSupportToken[_payTokenAddress], "not in support tokens");

        uint unsoldQuantity = mysteryBox.getBoxPoolUnsoldQuantity();
        require(_quantity > 0 && _quantity <= unsoldQuantity, "quantity is zero or greater than unsold quantity");

        (address baseTokenAddress, uint price) = mysteryBox.getPoolBaseTokenData();
        uint amount;
        if (_payTokenAddress == baseTokenAddress) {
            amount = _quantity * price;
            require(_amount == amount, "amount is not equal");
        } else {
            amount = oracle.getPayAmount(_quantity * price, baseTokenAddress, _payTokenAddress);
            require(_amount >= amount, "amount is not enough");
        }

        address businessAccount = baseInfo.getBusinessAccount();
        IERC20MetadataUpgradeable payToken = IERC20MetadataUpgradeable(_payTokenAddress);
        payToken.safeTransferFrom(_msgSender(), businessAccount, amount);

        mysteryBox.mysteryBoxSold(_quantity);
        usersMysteryBox[_msgSender()].unOpenedQuantity += _quantity;

        emit MysteryBoxSold(_msgSender(), _quantity);
    }

    /**
     * @dev Get the NFTs for opened mystery box
     */
    function getNFTs(UserMysteryBox storage _user, uint _quantity) private {
        // get the NFTs for mystery box
        for (uint i = 0; i < _quantity; i++) {
            uint remainedQuantity = mysteryBox.getBoxPoolRemainedQuantity();
            uint length = mysteryBox.getNFTPropIdsLength();
            uint number = randomNumber(i) % remainedQuantity + 1;
            uint sum = 0;

            for (uint j = 0; j < length; j++) {
                uint propId = mysteryBox.getNFTPropId(j);
                (uint NFTRemainedQuantity, uint NFTNextAssignId) = mysteryBox.getNFTData(propId);
                sum += NFTRemainedQuantity;
                if (sum >= number) {
                    require(NFTNextAssignId != 0, "next assign id is zero");
                    uint tokenId = (propId << 128) + NFTNextAssignId;
                    _user.tokenIds.push(tokenId);
                    mysteryBox.mysteryBoxOpened(propId);
                    IERC1155Upgradeable token1155 = IERC1155Upgradeable(address(internalToken));
                    token1155.safeTransferFrom(address(this), _msgSender(), tokenId, 1, "0x");
                    break;
                }
            }
        }
    }

    /*
     * Emits a {MysteryBoxOpened} event
     *
     * Requirements:
     * - quantity must greater than zero and less than or equal to unOpenedQuantity or maxOpenQuantity
     */
    function openMysteryBox(uint _quantity) public nonContract {
        UserMysteryBox storage user = usersMysteryBox[_msgSender()];

        require(_quantity > 0 && _quantity <= user.unOpenedQuantity && _quantity <= maxOpenQuantity, "quantity is zero or greater than unOpenedQuantity or maxOpenQuantity");

        delete user.tokenIds;

        getNFTs(user, _quantity);

        user.unOpenedQuantity -= _quantity;

        emit MysteryBoxOpened(_msgSender(), user.tokenIds);
    }

    function getUnOpenedQuantity(address _userAddress) public view returns (uint) {
        UserMysteryBox storage user = usersMysteryBox[_userAddress];

        return user.unOpenedQuantity;
    }

    function getOpenedNFTs(address _userAddress) public view returns (uint[] memory) {
        UserMysteryBox storage user = usersMysteryBox[_userAddress];

        return user.tokenIds;
    }

    function getMaxOpenQuantity() public view returns (uint) {
        return maxOpenQuantity;
    }
}
