const { assert, expect } = require("chai");
const { Framework } = require("@superfluid-finance/sdk-core");
const { ethers } = require("hardhat");
const deployTestFramework = require("@superfluid-finance/ethereum-contracts/scripts/deploy-test-framework");
const TestToken = require("@superfluid-finance/ethereum-contracts/build/contracts/TestToken.json");
const { default: importType } = require("eslint-plugin-import/lib/core/importType");
const superAppFactoryArtifact = require("../artifacts/contracts/CloneFactory.sol/CloneFactory.json");

let sfDeployer;
let contractsFramework;
let sf;
let sfUnlockBundler;
let superAppFactory;
let disablePurchaseHook;
let dai;
let daix;

// Test Accounts
let owner;
let account1;
let account2;

// Constants
//for usage in IDA projects
const expecationDiffLimit = 10; // sometimes the IDA distributes a little less wei than expected. Accounting for potential discrepency with 10 wei margin
//useful for denominating large units of tokens when minting
const thousandEther = ethers.utils.parseEther("10000");

before(async function () {
    
    //// get hardhat accounts

    [owner, account1, account2] = await ethers.getSigners();
    console.log("Owner:", owner.address);
    console.log("Acct1:", account1.address);
    console.log("Acct2:", account2.address);

    //// Get superAppFactory
    superAppFactory = await ethers.getContractAt(
        superAppFactoryArtifact.abi,
        "0x10C0d608226398361c9cC77E420e48e6EfE2f1d3"
    )

    //// Deploy SFUnlockBundler

    let sfUnlockBundlerDeployer = await ethers.getContractFactory("SFUnlockBundler");

    // SF Addresses: https://docs.superfluid.finance/superfluid/developers/networks
    // Unlock Addresses: https://unlock-protocol.gitbook.io/unlock/developers/smart-contracts
    sfUnlockBundler = await sfUnlockBundlerDeployer.connect(owner).deploy(
        "0x3E14dC1b13c488a8d5D310918780c983bD5982E7", // SF Host on Polygon
        "0xE8E5cd156f89F7bdB267EabD5C43Af3d5AF2A78f", // Unlock Lock Factory Contract on Polygon
        superAppFactory.address                       // Redirector Super App Factory
    );

    console.log("sfUnlockBundler:", sfUnlockBundler.address);

    //// Deploy keyPurchaseHook
    let disablePurchaseHookDeployer = await ethers.getContractFactory("DisablePurchaseHook");
    disablePurchaseHook = await disablePurchaseHookDeployer.connect(owner).deploy();

    console.log("disablePurchaseHook:", disablePurchaseHook.address);

});

describe("Bundler Tests", async () => {

    it("Calling bundleActions", async () => {

        let bundleTx = await sfUnlockBundler.connect(owner).bundleActions(
            1000,                                           // expirationDuration
            "0xCAa7349CEA390F89641fe306D93591f87595dc1F",   // tokenAddress, USDCx 
            0,
            20,
            "Test",
            disablePurchaseHook.address
        )

        console.log(bundleTx);

    })

})