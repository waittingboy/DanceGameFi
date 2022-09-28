// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

interface IMysteryBox {
    function addNFTsToBoxPool(uint _propId, uint _quantity, uint _startTokenId) external;
    function mysteryBoxSold(uint _quantity) external;
    function mysteryBoxOpened(uint _propId) external;
    function getPoolBaseTokenData() external view returns (address, uint);
    function getNFTPropIdsLength() external view returns (uint);
    function getNFTPropId(uint _index) external view returns (uint);
    function getNFTData(uint _propId) external view returns (uint, uint);
    function getBoxPoolRemainedQuantity() external view returns (uint);
    function getBoxPoolUnsoldQuantity() external view returns (uint);
}