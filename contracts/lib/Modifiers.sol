// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract Modifiers is OwnableUpgradeable {
    // Mapping from address to is admin or not
	mapping(address => bool) public isAdmin;

    // Mapping from address to is internal or not
    mapping(address => bool) public isInternal;

	modifier onlyAdmin() {
		require(isAdmin[_msgSender()], "caller is not admin");
		_;
	}

    modifier onlyInternal() {
        require(isInternal[_msgSender()], "caller is not internal caller");
        _;
    }

    modifier nonContract {
        require(tx.origin == _msgSender(), "only non contract can call");
        _;
    }

    function __Modifiers_init() internal onlyInitializing {
        __Ownable_init();
    }

	function setAdmin(address _admin, bool _set) public onlyOwner {
		isAdmin[_admin] = _set;
	}

    function setInternal(address _internal, bool _set) public onlyOwner {
        isInternal[_internal] = _set;
    }
}