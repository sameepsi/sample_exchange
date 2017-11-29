var fixedSupplyToken = artifacts.require("./FixedSupplyToken.sol");
var myExchange = artifacts.require("./Exchange.sol");

contract("Simple Trading test cases", function(accounts){

    before(function(){
        var exchangeInstance;
        var tokenInstance;

        return myExchange.deployed().then(function(instance){
            exchangeInstance = instance;
            return exchangeInstance.depositEther({from:accounts[0], value: web3.toWei(10, "ether")});
        }).then(function(txHash){

            return fixedSupplyToken.deployed();
        }).then(function(instance){
            tokenInstance = instance;
            return exchangeInstance.addToken("FIXED", tokenInstance.address);
        }).then(function(){

            return tokenInstance.approve(exchangeInstance.address, 2000);
        }).then(function(){

            return exchangeInstance.depositToken("FIXED", 1000);
        });
    });

    it("Add limit buy order", function(){
        var exchangeInstance;
        return myExchange.deployed().then(function(instance){

            exchangeInstance = instance;
             return exchangeInstance.buyToken("FIXED",web3.toWei(1, "finney"), 10);
        }).then(function(txHash){
            assert.equal(txHash.logs.length, 1, "There should have been one Log Message emitted.");
            assert.equal(txHash.logs[0].event, "LimitBuyOrderCreated", "The Log-Event should be LimitBuyOrderCreated");
            
            return exchangeInstance.getBuyOrderBook("FIXED");
        }).then(function(buyOrderBook){
           
            assert.equal(buyOrderBook.length,2, "should have 2 elements");
            assert.equal(buyOrderBook[0].length,1,"Should have 1 order");
            assert.equal(buyOrderBook[1].length,1,"Volume should be there");
            assert.equal(buyOrderBook[0][0], web3.toWei(1,"finney"),"Price is invalid");
            assert.equal(buyOrderBook[1][0].toNumber(), 10, "Volume is incorrect");
        });
    });

    it("add 2 buy orders", function(){
        var exchangeInstance;

        return myExchange.deployed().then(function(instance){
            exchangeInstance = instance;
            return exchangeInstance.buyToken("FIXED",web3.toWei(1, "finney"), 10);
        }).then(function(tx){
            assert.equal(tx.logs.length,1,"There should have been one log message emitted");
            assert.equal(tx.logs[0].event, "LimitBuyOrderCreated", "The log-event should be LimitBuyOrderCreated");

            return exchangeInstance.buyToken("FIXED",web3.toWei(1.5, "finney"), 10);
        }).then(function(tx){
            assert.equal(tx.logs.length,1,"There should have been one log message emitted");
            assert.equal(tx.logs[0].event, "LimitBuyOrderCreated", "The log-event should be LimitBuyOrderCreated");

            return exchangeInstance.getBuyOrderBook("FIXED");
        }).then(function(buyOrderBook){
            assert.equal(buyOrderBook.length,2, "should have 2 elements");
            assert.equal(buyOrderBook[0].length,2,"Should have 1 order");
            assert.equal(buyOrderBook[1].length,2,"Volume should be there");
            assert.equal(buyOrderBook[0][0], web3.toWei(1,"finney"),"Price is invalid");
            assert.equal(buyOrderBook[1][0].toNumber(), 20, "Volume is incorrect");
            assert.equal(buyOrderBook[0][1], web3.toWei(1.5,"finney"),"Price is invalid");
            assert.equal(buyOrderBook[1][1].toNumber(), 10, "Volume is incorrect");
        });
    });

    it("Add 2 sell orders", function(){
        var exchangeInstance;

        return myExchange.deployed().then(function(instance){
            exchangeInstance = instance;

            return exchangeInstance.sellToken("FIXED", web3.toWei(2.5, "finney"), 10);
        }).then(function(tx){
            assert.equal(tx.logs.length,1,"There should have been one log message emitted");
            assert.equal(tx.logs[0].event, "LimitSellOrderCreated", "The log-event should be LimitSellOrderCreated");
            return exchangeInstance.sellToken("FIXED", web3.toWei(3.5, "finney"), 20);
        }).then(function(tx){
            assert.equal(tx.logs.length,1,"There should have been one log message emitted");
            assert.equal(tx.logs[0].event, "LimitSellOrderCreated", "The log-event should be LimitSellOrderCreated");
            return exchangeInstance.getSellOrderBook("FIXED"); 
        }).then(function(sellOrderBook){
            assert.equal(sellOrderBook.length,2, "should have 2 elements");
            assert.equal(sellOrderBook[0].length,2,"Should have 1 order");
            assert.equal(sellOrderBook[1].length,2,"Volume should be there");
            assert.equal(sellOrderBook[0][0], web3.toWei(2.5,"finney"),"Price is invalid");
            assert.equal(sellOrderBook[1][0].toNumber(), 10, "Volume is incorrect");
            assert.equal(sellOrderBook[0][1], web3.toWei(3.5,"finney"),"Price is invalid");
            assert.equal(sellOrderBook[1][1].toNumber(), 20, "Volume is incorrect");
        })
    });

    it("Add a new buy order and cancel it", function(){
        var exchangeInstance;
        var orderBookBeforeBuyOrder, orderBookAfterBuyOrder, orderKey;

        return myExchange.deployed().then(function(instance){
            exchangeInstance=instance;

            return exchangeInstance.getBuyOrderBook("FIXED");
        }).then(function(buyOrderBook){
            orderBookBeforeBuyOrder=buyOrderBook;

            return exchangeInstance.buyToken("FIXED", web3.toWei(1.6,"finney"),5);
        }).then(function(tx){
            assert.equal(tx.logs.length, 1, "One event should be fired");
            assert.equal(tx.logs[0].event,"LimitBuyOrderCreated","LimitBuyOrderCreated event should be fired");
            orderKey = tx.logs[0].args._orderKey;
            return exchangeInstance.getBuyOrderBook("FIXED");
        }).then(function(buyOrderBook){
            orderBookAfterBuyOrder=buyOrderBook;
            assert.equal(orderBookBeforeBuyOrder[0].length+1, orderBookAfterBuyOrder[0].length, "Length before order and after order should differ by 1");
            return exchangeInstance.cancelOrder("FIXED", false, web3.toWei(1.6,"finney"), orderKey);
        }).then(function(tx){
            assert.equal(tx.logs.length,1,"One event should be fired");
            assert.equal(tx.logs[0].event,"BuyOrderCanceled","BuyOrderCanceled event should be fired");

            return exchangeInstance.getBuyOrderBook("FIXED");
        }).then(function(buyOrderBook){
            assert.equal(buyOrderBook[0].length, orderBookAfterBuyOrder[0].length,"Length of order book before and after cancellation should be same");
            assert.equal(buyOrderBook[1][orderBookAfterBuyOrder[0].length-1].toNumber(),0,"Volume should be 0");
        });
    });

});