var fixedSupplyToken = artifacts.require("./FixedSupplyToken.sol");
var myExchange = artifacts.require("./Exchange.sol");

contract("Deposit Withdrawal", function(accounts){
    it("Add token", function(){
        var myExchangeInstance;
        var myTokenInstance;
        return fixedSupplyToken.deployed().then(function(tokenInstance){
            myTokenInstance = tokenInstance;
            return myExchange.deployed();
        }).then(function(exchangeInstance){
            myExchangeInstance = exchangeInstance;
            return myExchangeInstance.addToken("FIXED", myTokenInstance.address);
        }).then(function(txHash){
            assert.equal(txHash.logs[0].event, "TokenAddedToSystem", "TokenAddedToSystem event must be fired");
            return myExchangeInstance.hasToken("FIXED");
        }).then(function(tokenPresence){
            assert.equal(tokenPresence,true,"Token does not exists");
        })
    });

    it("Deposit and withdraw ether", function(){
        var myExchangeInstance;
        var account = accounts[0];
        var balanceBeforeDeposit = web3.eth.getBalance(account);
        var balanceAfterDeposit;
        var balanceAfterWithdrawal;
        var gasUsed = 0;

        return myExchange.deployed().then(function(instance){
            myExchangeInstance = instance;
            return myExchangeInstance.depositEther({from:account, value:web3.toWei(1,"ether")});
        }).then(function(txHash){
            gasUsed+= txHash.receipt.cumulativeGasUsed * web3.eth.getTransaction(txHash.receipt.transactionHash).gasPrice.toNumber(); 
            balanceAfterDeposit = web3.eth.getBalance(account);
            return myExchangeInstance.getEthBalanceInWei({from:account});
        }).then(function(userExchangeBalance){
            assert.equal(userExchangeBalance.toNumber(), web3.toWei(1,"ether"),"There should be 1 ether available");
            assert.isAtLeast(balanceBeforeDeposit.toNumber()-balanceAfterDeposit.toNumber(), web3.toWei(1, "ether"),"Balance should be reduced by 1 ether");
            return myExchangeInstance.withdrawEther(web3.toWei(1, "ether"));
        }).then(function(txHash){
            gasUsed+= txHash.receipt.cumulativeGasUsed * web3.eth.getTransaction(txHash.receipt.transactionHash).gasPrice.toNumber(); 
            balanceAfterWithdrawal = web3.eth.getBalance(account);
            return myExchangeInstance.getEthBalanceInWei({from:account});
        }).then(function(userExchangeBalance){
            assert.equal(userExchangeBalance.toNumber(), 0,"There should be no ether available");
            assert.isAtLeast(balanceAfterWithdrawal.toNumber(), balanceBeforeDeposit.toNumber()-gasUsed*2,"Balance should be atleast to before deposit");        })
    });

    it("DEPOSIT AND WITHDRAW TOKENS", function(){
        var myExchangeInstance;
        var myTokenInstance;
        var tokenBalanceBeforeTrans;
        var tokenBalanceAfterDeposit;
        var tokenBalanceAfterWithdrawal;
        
        return fixedSupplyToken.deployed().then(function(tokenInstance){
            myTokenInstance = tokenInstance;
            return myExchange.deployed();
        }).then(function(exchangeInstance){
            myExchangeInstance = exchangeInstance;
            return myTokenInstance.balanceOf(accounts[0]);
        }).then(function(balance){
            tokenBalanceBeforeTrans = balance;
            return myTokenInstance.approve(myExchangeInstance.address, 1000);
        }).then(function(){
            return myTokenInstance.allowance(accounts[0], myExchange.address);
        }).then(function(allowanc){
            assert.equal(allowanc.toNumber(),1000,"Approve request should be valid");
            return myExchangeInstance.depositToken("FIXED",1000);
        }).then(function(){
            return myTokenInstance.balanceOf(accounts[0]);
        }).then(function(balance){
            tokenBalanceAfterDeposit = balance;
            return myExchangeInstance.getBalance("FIXED");
        }).then(function(balance){
            assert.equal(tokenBalanceBeforeTrans.toNumber()-tokenBalanceAfterDeposit.toNumber(), 1000, "Tokens should be reduced by 1000");
            assert.equal(balance,1000, "Exchange balance should be 1000");
            return myExchangeInstance.withdrawToken("FIXED", 1000);
        }).then(function(){
            return myTokenInstance.balanceOf(accounts[0]);
        }).then(function(balance){
            tokenBalanceAfterWithdrawal = balance;
            return myExchangeInstance.getBalance("FIXED");
        }).then(function(balance){
            assert.equal(tokenBalanceAfterWithdrawal.toNumber(), tokenBalanceBeforeTrans.toNumber(),"Tokens balances before transaction and after withdrawal should be same");
            assert.equal(balance,0,"Token balance should be 0 after withdrawal");
        })
    });
});