// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

interface IBaseInfo {
    function setNFTMintedQuantity(uint _propId, uint _quantity) external;
    function getBusinessAccount() external view returns (address);
    function getNFTMintedQuantity(uint _propId) external view returns (uint);
}