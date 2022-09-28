// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

interface IOracle {
    function getPayAmount(uint256 _valuation, address _baseTokenAddress, address _payTokenAddress) external view returns (uint256);
}