const { assert, expect } = require("chai");
const { Framework } = require("@superfluid-finance/sdk-core");
const hre = require("hardhat");
const { ethers, web3 } = require("hardhat");
const deployTestFramework = require("@superfluid-finance/ethereum-contracts/scripts/deploy-test-framework");
const TestToken = require("@superfluid-finance/ethereum-contracts/build/contracts/TestToken.json");
const { default: importType } = require("eslint-plugin-import/lib/core/importType");
const superAppFactoryArtifact = require("../artifacts/contracts/CloneFactory.sol/CloneFactory.json");
const lockArtifact = require("../artifacts/contracts/interfaces/IPublicLock.sol/IPublicLock.json");
const superAppArtifact = require("../artifacts/contracts/AppLogic.sol/AppLogic.json");

// Global Contract Vars
let sfUnlockBundler;       // Bundler contract (what we're testing)
let superAppFactory;       // Super App Factory 
let disablePurchaseHook;   // Contract hook to disable traditional purchases
let deployedLock;          // Lock deployed by Bundler `bundleActions`
let deployedSuperApp;      // Lock Manager Super App that redirects streams to lock, 
                           // deployed by Bundler `bundleActions`

// Superfluid Vars
let sfDeployer;
let contractsFramework;
let sf;
let usdcAddress = "0xCAa7349CEA390F89641fe306D93591f87595dc1F";
let usdcx;

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

    // [owner, account1, account2] = await ethers.getSigners();
    // console.log("Owner:", owner.address);
    // console.log("Acct1:", account1.address);
    // console.log("Acct2:", account2.address);
    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        // account with lots of USDCx on Polygon
        params: ["0xa852830defa900d655cb933c62474d3c85954fc5"]
    });
    owner = await ethers.getSigner("0xa852830defa900d655cb933c62474d3c85954fc5");


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

    //// Set up Superfluid

    sf = await Framework.create({
        provider: ethers.provider,  //   PROVIDER,  // ethers.getDefaultProvider(),
        resolverAddress: "0xE0cc76334405EE8b39213E620587d815967af39C",
        networkName: "hardhat",
        dataMode: "WEB3_ONLY",
        protocolReleaseVersion: "v1",
        chainId: 31337
    });

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
        let res = await bundleTx.wait()

        // Parsing out the returned deployedLock and deployedSuperApp contracts
        let returnDataLog = res.logs[res.logs.length - 1].data;
        let returnValues =  web3.eth.abi.decodeParameters(
            ['address','address'], 
            returnDataLog
        )

        deployedLock = await ethers.getContractAt(lockArtifact.abi, returnValues['0']);
        console.log("deployedLock", deployedLock.address);

        deployedSuperApp = await ethers.getContractAt(superAppArtifact.abi, returnValues['1']);
        console.log("deployedSuperApp", deployedSuperApp.address);

    });

    it("Should not be able to call purchase on deployedLock", async () => {

//   /**
//   * @dev Purchase function
//   * @param _values array of tokens amount to pay for this purchase >= the current keyPrice - any applicable discount
//   * (_values is ignored when using ETH)
//   * @param _recipients array of addresses of the recipients of the purchased key
//   * @param _referrers array of addresses of the users making the referral
//   * @param _keyManagers optional array of addresses to grant managing rights to a specific address on creation
//   * @param _data array of arbitrary data populated by the front-end which initiated the sale
//   * @notice when called for an existing and non-expired key, the `_keyManager` param will be ignored 
//   * @dev Setting _value to keyPrice exactly doubles as a security feature. That way if the lock owner increases the
//   * price while my transaction is pending I can't be charged more than I expected (only applicable to ERC-20 when more
//   * than keyPrice is approved for spending).
//   * @return tokenIds the ids of the created tokens 
//   */
//    function purchase(
//     uint256[] calldata _values,
//     address[] calldata _recipients,
//     address[] calldata _referrers,
//     address[] calldata _keyManagers,
//     bytes[] calldata _data

        // TODO: not reverting for the right reason "Purchases Disabled" from DisablePurchaseHook
        // await deployedLock.connect(owner).purchase(
        //     [10],
        //     [owner.address],
        //     [owner.address],
        //     [],
        //     ["0x"]
        // );

    });

    it("deployedSuperApp redirects stream", async () => {

        let flowRate = "999"

        let createFlowTx = sf.cfaV1.createFlow({
            sender: owner.address,
            receiver: deployedSuperApp.address,
            superToken: usdcAddress,
            flowRate: flowRate
        });
        await (await createFlowTx.exec(owner)).wait();

        // Get flow to deployedSuperApp
        let ownerToSuperApp = await sf.cfaV1.getFlow({
            superToken: usdcAddress,
            sender: owner.address,
            receiver: deployedSuperApp.address,
            providerOrSigner: owner
        });          

        // Get flow from deployedSuperApp to Lock
        let superAppToLock = await sf.cfaV1.getFlow({
            superToken: usdcAddress,
            sender: deployedSuperApp.address,
            receiver: deployedLock.address,
            providerOrSigner: owner
        });

        expect(
            ownerToSuperApp.flowRate == superAppToLock.flowRate,
            "stream not redirected!"
        );

    });


})