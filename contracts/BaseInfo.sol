// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./lib/Modifiers.sol";
import "./interfaces/IBaseInfo.sol";

contract BaseInfo is Modifiers, IBaseInfo {
    // Business account
    address private businessAccount;

    // All NFT's prop id
    uint[] private propIds;

    // Used to store NFT data
    struct NFTData {
        bool isExist;
        string cid;
        uint mintedQuantity;
    }

    // Mapping from prop id to NFT data
    mapping(uint => NFTData) private NFTDatas;

    function initialize(address _businessAccount) public initializer {
        __Modifiers_init();

        require(_businessAccount != address(0), "account is zero address");
        
        businessAccount = _businessAccount;
    }

    /**
     * @dev Transfer business account to a new account
     * Can only be called by the current owner
     */
    function transferBusinessAccount(address _businessAccount) public onlyOwner {
        require(_businessAccount != address(0), "account is zero address");
        
        businessAccount = _businessAccount;
    }

    /**
     * @dev Store the NFT's data
     * Can only be called by the current owner
     */
    function storeNFTData(uint _propId, string memory _cid) public onlyOwner {
        NFTData storage data = NFTDatas[_propId];

        require(!data.isExist, "NFT is exist");

		propIds.push(_propId);
		data.isExist = true;
        data.cid = _cid;
    }

    /**
     * @dev Set the NFT's minted quantity
     * Can only be called by internal contract
     */
    function setNFTMintedQuantity(uint _propId, uint _quantity) public override onlyInternal {
        NFTDatas[_propId].mintedQuantity += _quantity;
    }

    function getBusinessAccount() public view override returns (address) {
        return businessAccount;
    }

    function getPropIdQuantity() public view returns (uint) {
        return propIds.length;
    }
    
    function getPropId(uint _index) public view returns (uint) {
        return propIds[_index];
    }

    function getNFTCID(uint _propId) public view returns (string memory) {
        return NFTDatas[_propId].cid;
    }

    function getNFTMintedQuantity(uint _propId) public view override returns (uint) {
        return NFTDatas[_propId].mintedQuantity;
    }
}
