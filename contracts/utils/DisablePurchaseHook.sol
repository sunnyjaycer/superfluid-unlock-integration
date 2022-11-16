// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import { ILockKeyPurchaseHook } from "../interfaces/ILockKeyPurchaseHook.sol";
import "hardhat/console.sol";

contract DisablePurchaseHook is ILockKeyPurchaseHook {

    /// @dev ILockKeyPurchaseHook.keyPurchasePrice implementation
    function keyPurchasePrice(
        address from,
        address recipient,
        address referrer,
        bytes calldata data
    ) external view override
    returns (uint minKeyPrice) {

        minKeyPrice = 0;

        return minKeyPrice;

    }


    /// @dev ILockKeyPurchaseHook.onKeyPurchase implementation
    function onKeyPurchase(
        uint tokenId,
        address from,
        address recipient,
        address referrer,
        bytes calldata data,
        uint minKeyPrice,
        uint pricePaid
    ) external override {

        console.log("HEYYYY IMMM HEEEERRRREEEE");

        // revert("Purchases Disabled");

        require(false, "Purcahses Disabled");

    }

}