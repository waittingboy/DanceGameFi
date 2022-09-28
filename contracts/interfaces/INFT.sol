// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

interface INFT {
    function mint(uint _propId, string memory _uri, uint _quantity, uint _type) external;
}