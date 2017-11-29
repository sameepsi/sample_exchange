var fixedSupplyToken = artifacts.require("./FixedSupplyToken.sol");

contract('MyToken', function(accounts){
    it("owner account should own all tokens", function(){
            var _totalSupply;
            var myTokenInstance;
            return fixedSupplyToken.deployed().then(function(instance){
                myTokenInstance = instance;
                return myTokenInstance.totalSupply.call();
            }).then(function(totalSupply){
                _totalSupply = totalSupply;
                return myTokenInstance.balanceOf(accounts[0]);
            }).then(function(balanceAccountOwner){
                assert.equal(balanceAccountOwner.toNumber(),_totalSupply.toNumber(), "Total amount of tokens is owned by the contract creator");
            });
    });

    it("Second account should not have any tokens", function(){
        var myTokenInstance;

        return fixedSupplyToken.deployed().then(function(instance){
            myTokenInstance = instance;
            return myTokenInstance.balanceOf(accounts[1]);
        }).then(function(balance){
            assert.equal(balance.toNumber(),0,"Second account holds no token");
        });
    });

    it("Should send tokens to correct address", function(){
        var receiverAddress = accounts[1];
        var senderAddress = accounts[0];
        var tokenToSend = 10;
        var _receiverIntialBalance;
        var _receiverFinalBalance;
        var _senderInitialBalance;
        var _senderFinalBalance;

        var myTokenInstance;
        return fixedSupplyToken.deployed().then(function(instance){
            myTokenInstance = instance;
           return myTokenInstance.balanceOf(senderAddress);
        }).then(function(senderInitialBalance){
            _senderInitialBalance = senderInitialBalance;
            return myTokenInstance.balanceOf(receiverAddress);
        }).then(function(receiverIntialBalance){
            _receiverIntialBalance = receiverIntialBalance;
            return myTokenInstance.transfer(receiverAddress, tokenToSend)
        }).then(function(){
            return myTokenInstance.balanceOf(senderAddress);
        }).then(function(senderFinalBalance){
            _senderFinalBalance = senderFinalBalance;
            return myTokenInstance.balanceOf(receiverAddress);
        }).then(function(receiverFinalBalance){
            _receiverFinalBalance = receiverFinalBalance;

            assert.equal(_senderFinalBalance.toNumber(), _senderInitialBalance.toNumber()-tokenToSend, "Correct amount of tokens are deducted from senders account");
            assert.equal(_receiverFinalBalance.toNumber(), _receiverIntialBalance.toNumber()+tokenToSend, "Receiver received the correct amount of tokens");
        })
    });
});