// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "../MysteryBoxMarket.sol";

contract MysteryBoxMarketMock is MysteryBoxMarket {
	function getSupportTokenQuantity() public view returns (uint) {
		return supportTokenQuantity;
	}

	function getIsAdmin(address userAddress) public view returns (bool){
		return isAdmin[userAddress];
	}
}