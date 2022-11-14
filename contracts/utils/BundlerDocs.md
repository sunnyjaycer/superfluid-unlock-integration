# Unlock Superfluid Subscription Bundler
Smart contract that bundles deployment transactions for setting up Locks that support Superfluid-powered streaming subscriptions

This process looks like the below

<center>
    <img src="https://user-images.githubusercontent.com/62968241/201435202-a80e1442-e6aa-4641-88b4-0d757e93be9e.png" alt="process" width="40%"/>
</center>
<br/><br/>

## Steps

### 1. Deploy the Lock on Unlock Factory. 
Etherscan [here](https://polygonscan.com/address/0xE8E5cd156f89F7bdB267EabD5C43Af3d5AF2A78f#writeProxyContract) and interface [here](https://github.com/unlock-protocol/unlock/blob/master/smart-contracts/contracts/interfaces/IUnlock.sol).
```
    /**
    * @notice Create lock (legacy)
    * This deploys a lock for a creator. It also keeps track of the deployed lock.
    * @param _expirationDuration the duration of the lock (pass 0 for unlimited duration)
    * @param _tokenAddress set to the ERC20 token address, or 0 for ETH.
    * @param _keyPrice the price of each key
    * @param _maxNumberOfKeys the maximum nimbers of keys to be edited
    * @param _lockName the name of the lock
    * param _salt [deprec] -- kept only for backwards copatibility
    * This may be implemented as a sequence ID or with RNG. It's used with `create2`
    * to know the lock's address before the transaction is mined.
    * @dev internally call `createUpgradeableLock`
    */
    function createLock(
        uint _expirationDuration,
        address _tokenAddress,
        uint _keyPrice,
        uint _maxNumberOfKeys,
        string calldata _lockName,
        bytes12 // _salt
    ) external returns(address);
```

### 2. Create a keyPurchaseHook that disables purchases

Every Lock you deploy has a [purchase()](https://github.com/unlock-protocol/unlock/blob/master/smart-contracts/contracts/mixins/MixinPurchase.sol#L124) function inherited from `MixinPurchase`. This `purchase()` function triggers a `onKeyPurchase()` hook when called. That hook can only trigger if you've registered a `keyPurchaseHook` contract with the Lock. 

This registration is done with the [setEventHooks()](https://github.com/unlock-protocol/unlock/blob/master/smart-contracts/contracts/mixins/MixinLockCore.sol#L197) function from `MixinLockCore`.

**But before you do any of the registration**, you need to actually create and deploy the `keyPurchaseHook` contract (see interface [here](https://github.com/unlock-protocol/unlock/blob/master/smart-contracts/contracts/interfaces/hooks/ILockKeyPurchaseHook.sol)).

We want our `keyPurchaseHook` to implement its `onKeyPurchase()` hook such that it reverts. This is to block traditional purchase functionality so only Superfluid functionality is usable.

### 3. Register the keyPurchaseHook with the Lock

On the Lock deployed in Step 1, call [setEventHooks()](https://github.com/unlock-protocol/unlock/blob/master/smart-contracts/contracts/mixins/MixinLockCore.sol#L197) with the address of the deployed keyPurchaseHook.

```
    function setEventHooks(
        address _onKeyPurchaseHook,  // address of the deployed keyPurchaseHook
        address _onKeyCancelHook,    // address(0)
        address _onValidKeyHook,     // address(0)
        address _onTokenURIHook,     // address(0)
        address _onKeyTransferHook,  // address(0)
        address _onKeyExtendHook,    // address(0)
        address _onKeyGrantHook      // address(0)
    ) external;
```

### 4. Deploy Stream Redirector Super App and register the Lock with it

Etherscan [here](https://polygonscan.com/address/0x10C0d608226398361c9cC77E420e48e6EfE2f1d3#code) and function code [here](https://github.com/ngmachado/superfluid-unlock-integration/blob/main/contracts/CloneFactory.sol#L23).

```
    function deployNewApp(address locker) external returns(address);
```

### 5. Make the Super App a Lock Manager

Call the [addLockManager()](https://github.com/unlock-protocol/unlock/blob/master/smart-contracts/contracts/mixins/MixinRoles.sol#L55) function inherited from `MixinRoles` on the Lock. Use the address of the Stream Redirector Super App.

```
  function addLockManager(address deployedSuperApp) public;
```

### 6. Give the Caller the Manager Role

### 7. Deployer renounces Manager Role

Call the [renounceLockManager()](https://github.com/unlock-protocol/unlock/blob/master/smart-contracts/contracts/mixins/MixinRoles.sol#L61) function inherited from `MixinRoles` on the Lock. Use address(this).

```
  function renounceLockManager() public;
```