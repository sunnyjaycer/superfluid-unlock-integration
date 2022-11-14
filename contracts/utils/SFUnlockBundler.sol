
// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import { AppLogic } from "../AppLogic.sol";
import { IPublicLock } from "../interfaces/IPublicLock.sol";
import { IUnlock } from "../interfaces/IUnlock.sol";
import { CloneFactory } from "../CloneFactory.sol";
import { ISuperfluid, ISuperToken, ISuperAgreement } from "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperfluid.sol";

import "hardhat/console.sol";

contract SFUnlockBundler {

    ISuperfluid public host;
    IUnlock public lockFactory;
    CloneFactory public superAppFactory;
    
    constructor(
        ISuperfluid _host,
        IUnlock _lockFactory,
        CloneFactory _cloneFactory
    ) public payable {
        host = _host;
        lockFactory = _lockFactory;
        superAppFactory = _cloneFactory;
    }

    function bundleActions(
        uint expirationDuration,
        address tokenAddress,
        uint keyPrice,
        uint maxNumberOfKeys,
        string calldata lockName,
        address keyPurchaseHook
    ) external returns ( IPublicLock deployedLock, AppLogic deployedSuperApp ) {

        console.log("here0");

        // Deploy Lock on Unlock Factory
        IPublicLock deployedLock = IPublicLock(lockFactory.createLock(
            expirationDuration,
            tokenAddress,
            keyPrice,
            maxNumberOfKeys,
            lockName,
            ""
        ));

        console.log("here1", address(deployedLock));

        // Register keyPurchaseHook to deployedLock
        IPublicLock(deployedLock).setEventHooks(
            keyPurchaseHook,
            address(0),
            address(0),
            address(0),
            address(0),
            address(0),
            address(0)
        );

        console.log("here2");

        // Deploy Stream Redirector Super App for deployedLock
        AppLogic deployedSuperApp = AppLogic(superAppFactory.deployNewApp(address(deployedLock)));

        console.log("here3");

        // Make Super App the Lock Manager
        deployedLock.addLockManager(address(deployedSuperApp));

        console.log("here4");

        // Give the creator the Lock Manager role as well
        deployedLock.addLockManager(msg.sender);

        console.log("here5");

        // This deployer renounces its own manager role
        deployedLock.renounceLockManager();

        console.log("here6");

    }

}