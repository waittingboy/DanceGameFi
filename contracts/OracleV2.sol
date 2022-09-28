// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./libraries/UniswapV2Library.sol";
import "./interfaces/IOracle.sol";

contract OracleV2 is Initializable, IOracle {
    // OKC main - CherrySwap - 0x709102921812B3276A65092Fe79eDfc76c4D4AFe
    // OKC test - CherrySwap - 0x3F51F044Ca5172BAd640E2eB05804fea84ECaBfb
    // Polygon main - SushiSwap - 0xc35DADB65012eC5796536bD9864eD8773aBc74C4
    // Polygon mumbai test - SushiSwap - 0xc35DADB65012eC5796536bD9864eD8773aBc74C4
    // BSC main - PancakeSwap - 0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73
    // BSC test - PancakeSwap - 0xB7926C0430Afb07AA7DEfDE6DA862aE0Bde767bc
    address public swapFactory;

    function initialize(address _swapFactory) public initializer {
        swapFactory = _swapFactory;
    }

    function getPayAmount(uint256 _baseTokenAmount, address _baseTokenAddress, address _payTokenAddress) public view override returns (uint256) {        
        (uint256 reserveIn, uint256 reserveOut) = UniswapV2Library.getReserves(swapFactory, _baseTokenAddress, _payTokenAddress);
        // USDT In, Other Out
        uint256 amountOut = UniswapV2Library.getAmountOut(_baseTokenAmount, reserveIn, reserveOut);
        
        return amountOut;
    }
}
