// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

interface INFTSalesMarket {
    function addNFTs(uint _propId, uint _quantity, uint _startTokenId) external;
}