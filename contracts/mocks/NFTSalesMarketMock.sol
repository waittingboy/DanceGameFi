// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "../NFTSalesMarket.sol";

contract NFTSalesMarketMock is NFTSalesMarket {

    // function getMyNFTData(uint _propId) public view returns (bool, uint, uint, uint) {
    //     NFTData memory data = datas[_propId];

    //     return (data.isOpenSale, data.price, data.remainedQuantity, data.unsoldQuantity);
    // }

	function getSupportTokenQuantity() public view returns (uint) {
		return supportTokenQuantity;
	}

	function getIsAdmin(address userAddress) public view returns (bool){
		return isAdmin[userAddress];
	}

	// function getNextAssignId(NFTData memory data) private override pure returns (uint) {
	// 	uint nextAssignId = data.nextAssignId;

	// 	for (uint i = 0; i < data.rang.length; i++) {
	// 		if (nextAssignId == data.rang[i].end) {
	// 			if (i == data.rang.length - 1) {
	// 				return 0; // at this time, NFT unsoldQuantity is also zero
	// 			} else {
	// 				return data.rang[i + 1].start;
	// 			}
	// 		}
	// 	}

	// 	return ++nextAssignId;
	// }
}