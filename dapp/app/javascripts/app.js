//import jquery and bootstrap
import 'jquery';
import 'bootstrap-loader';
// Import the page's CSS. Webpack will know what to do with it.
import "../stylesheets/app.css";

// Import libraries we need.
import { default as Web3} from 'web3';
import { default as contract } from 'truffle-contract'

// Import our contract artifacts and turn them into usable abstractions.
import exchange_artifacts from '../../../build/contracts/Exchange.json'
import token_artifacts from '../../../build/contracts/FixedSupplyToken.json'
import { inspect } from 'util';

// MetaCoin is our usable abstraction, which we'll use through the code below.
var ExchangeContract = contract(exchange_artifacts);
var TokenContract = contract(token_artifacts);

// The following code is simple to show off interacting with your contracts.
// As your needs grow you will likely need to change its form and structure.
// For application bootstrapping, check out window.addEventListener below.
var accounts;
var account;

window.App = {
  start: function() {
   //bootstrap everything
   var self = this;
   
       // Bootstrap the MetaCoin abstraction for Use.
       ExchangeContract.setProvider(web3.currentProvider);
       TokenContract.setProvider(web3.currentProvider);
   
       // Get the initial account balance so it can be displayed.
       web3.eth.getAccounts(function(err, accs) {
         if (err != null) {
           alert("There was an error fetching your accounts.");
           return;
         }
   
         if (accs.length == 0) {
           alert("Couldn't get any accounts! Make sure your Ethereum client is configured correctly.");
           return;
         }
   
         accounts = accs;
         console.log(accounts);
         account = accounts[0];
         console.log(account);
       });
  },

  setStatus: function(message) {
    var status = document.getElementById("status");
    status.innerHTML = message;
  },
  printImportantInformation: function() {
    //print out some important information
    ExchangeContract.deployed().then(function(instance) {
      var divAddress = document.createElement("div");
      divAddress.appendChild(document.createTextNode("Address Exchange: " + instance.address));
      divAddress.setAttribute("class", "alert alert-info");
      document.getElementById("importantInformation").appendChild(divAddress);
    });
    TokenContract.deployed().then(function(instance) {
      var divAddress = document.createElement("div");
      divAddress.appendChild(document.createTextNode("Address Token: " + instance.address));
      divAddress.setAttribute("class", "alert alert-info");
      document.getElementById("importantInformation").appendChild(divAddress);
    });

    web3.eth.getAccounts(function(err, accs) {
      web3.eth.getBalance(accs[0], function(err1, balance) {
        var divAddress = document.createElement("div");
        var div = document.createElement("div");
        div.appendChild(document.createTextNode("Active Account: " + accs[0]));
        var div2 = document.createElement("div");
        div2.appendChild(document.createTextNode("Balance in Ether: " + web3.fromWei(balance, "ether")));
        divAddress.appendChild(div);
        divAddress.appendChild(div2);
        divAddress.setAttribute("class", "alert alert-info");
        document.getElementById("importantInformation").appendChild(divAddress);
      });

    });
  },
  /**
   * Exchange specific functions here
   */
  initExchange: function() {
    App.refreshBalanceExchange();
    App.printImportantInformation();
    App.watchExchangeEvents();

  },
  watchExchangeEvents: function() {
    //watch for Exchange Events
  },
  addTokenToExchange: function() {
  //function to add tokens to the exchange
    var tokenName = document.getElementById("inputNameTokenAddExchange").value;
    var tokenAddress = document.getElementById("inputAddressTokenAddExchange").value;
    App.setStatus("Adding token to the Exchange....");
    ExchangeContract.deployed().then(function(instance){
      return instance.addToken(tokenName, tokenAddress, {from:account});
    }).then(function(result){
        console.log(result)
      App.setStatus("Token added to the Exchange");
    }).catch(function(e){
      console.log(e);
      App.setStatus("Failed to add token to the Exchange. Please see the logs!!");
    })
  },
  refreshBalanceExchange: function() {
  //refresh your balance
    var exchangeInstance;
    ExchangeContract.deployed().then(function(instance){
      exchangeInstance = instance;
      return exchangeInstance.getBalance("FIXED", {from:account});
    }).then(function(value){
      var tokenDiv = document.getElementById("balanceTokenInExchange");
      if(value){
        tokenDiv.innerHTML = value.toNumber();
      }
      else{
        tokenDiv.innerHTML = 0;
      }
      return exchangeInstance.getEthBalanceInWei({from:account});
    }).then(function(value){
      var etherDiv = document.getElementById("balanceEtherInExchange");
      if(value){
        etherDiv.innerHTML = web3.fromWei(value, "ether");
      }else{
        etherDiv.innerHTML = 0;
      }
    }).catch(function(e){
      console.log(e);
      App.setStatus("Failed to fetch balances from exchange. Please see logs!!");
    });
  },
  depositEther: function() {
      //deposit ether function
      var exchangeInstance;
      App.setStatus("Depositing ether to the exchange!!");
      ExchangeContract.deployed().then(function(instance){
        exchangeInstance = instance;
        var etherAmount = document.getElementById("inputAmountDepositEther").value;
        return exchangeInstance.depositEther({from:account,value: web3.toWei(etherAmount, "Ether")});
      }).then(function(txResult){
        App.setStatus("Ether successfully deposited!!");
        console.log(txResult);
        App.refreshBalanceExchange();
        document.getElementById("inputAmountDepositEther").value = "";
      }).catch(function(e){
        console.log(e);
        App.setStatus("Failed to deposit ether. Please check logs!!");
      });
  },
  withdrawEther: function() {
  //withdraw ether function
  var exchangeInstance;
  App.setStatus("Withdrawing ether from exchange!!");
  ExchangeContract.deployed().then(function(instance){
    exchangeInstance = instance;
    var etherAmount = document.getElementById("inputAmountWithdrawalEther").value;
    console.log(web3.toWei(etherAmount, "Ether"))
    return exchangeInstance.withdrawEther(web3.toWei(etherAmount, "Ether"),{from:account, gas:6000000});
  }).then(function(txResult){
    App.setStatus("Ether withdrawn successfully!!");
    console.log(txResult);
    App.refreshBalanceExchange();
    document.getElementById("inputAmountWithdrawalEther").value = "";
  }).catch(function(e){
    console.log(e);
    App.setStatus("Failed to withdraw ether. Please check logs!!");
  });
  },
  depositToken: function() {
  //deposit token function
    var exchangeInstance;
    App.setStatus("Depositing token to the exchange!!");
    ExchangeContract.deployed().then(function(instance){
      exchangeInstance = instance;
      var symbolName = document.getElementById("inputNameDepositToken").value;
      var tokenAmount = document.getElementById("inputAmountDepositToken").value;
      return exchangeInstance.depositToken(symbolName, tokenAmount, {from:account, gas:6000000});
    }).then(function(txResult){
        console.log(txResult);
        App.setStatus("Tokens deposited successfully!!");
        App.refreshBalanceExchange();
    }).catch(function(e){
      console.log(e);
      App.setStatus("Failed to deposit token. Please check logs!!");
    })
  },
  withdrawToken: function() {
    //deposit token function
      var exchangeInstance;
      App.setStatus("Withdrawing tokens from the exchange!!");
      ExchangeContract.deployed().then(function(instance){
        exchangeInstance = instance;
        var symbolName = document.getElementById("inputNameWithdrawalToken").value;
        var tokenAmount = document.getElementById("inputAmountWithdrawalToken").value;
        return exchangeInstance.withdrawToken(symbolName, tokenAmount,{from:account, gas:6000000});
      }).then(function(txResult){
          console.log(txResult);
          App.setStatus("Tokens withdrawn successfully!!");
          App.refreshBalanceExchange();
      }).catch(function(e){
        console.log(e);
        App.setStatus("Failed to withdraw token. Please check logs!!");
      })
    },
  /**
   * TRADING FUNCTIONS FROM HERE ON
   */
  initTrading: function() {
    App.refreshBalanceExchange();
    App.printImportantInformation();
    App.updateOrderBooks();
    App.listenToTradingEvents();
  },
  updateOrderBooks: function() {
    //update the order books function
    var exchangeInstance;
    var buyOrderBookDiv = document.getElementById("buyOrderBook");
    var sellOrderBookDiv = document.getElementById("sellOrderBook");
    

    ExchangeContract.deployed().then(function(instance){
      exchangeInstance = instance;
      return exchangeInstance.getBuyOrderBook("FIXED");
    }).then(function(buyOrderBook){
      buyOrderBookDiv.innerHTML = null;
      if(buyOrderBook[0].length==0){
        buyOrderBookDiv.innerHTML = '<span>No Buy Orders at the moment.</span>';
      }else{
        console.log(buyOrderBook)
        for(var i = 0; i < buyOrderBook[0].length; i++) {
          buyOrderBookDiv.innerHTML += '<div>buy '+buyOrderBook[1][i]+'@'+buyOrderBook[0][i]+'</div>'; //buy 650@5000: buy 650 token for 5000 wei.
      }
      }
      return exchangeInstance.getSellOrderBook("FIXED");
    }).then(function(sellOrderBook){
      sellOrderBookDiv.innerHTML = null;
      
      if(sellOrderBook[0].length==0){
        sellOrderBookDiv.innerHTML = '<span>No Sell Orders at the moment.</span>';
      }else{
        for(var i = 0; i < sellOrderBook[0].length; i++) {
          sellOrderBookDiv.innerHTML += '<div>sell '+sellOrderBook[1][i]+'@'+sellOrderBook[0][i]+'</div>'; //sell 650@5000: sell 650 token for 5000 wei.
      }
      }
    })
  },
  listenToTradingEvents: function() {
//listen to trading events
    var exchangeInstance;
    ExchangeContract.deployed().then(function(instance){
      exchangeInstance = instance;
      exchangeInstance.LimitSellOrderCreated({},{fromBlock:0, toBlock:'latest'}).watch(function(error, result){
        var alertbox = document.createElement("div");
        alertbox.setAttribute("class", "alert alert-info  alert-dismissible");
        var closeBtn = document.createElement("button");
        closeBtn.setAttribute("type", "button");
        closeBtn.setAttribute("class", "close");
        closeBtn.setAttribute("data-dismiss", "alert");
        closeBtn.innerHTML = "<span>&times;</span>";
        alertbox.appendChild(closeBtn);

        var eventTitle = document.createElement("div");
        eventTitle.innerHTML = '<strong>New Event: ' + result.event + '</strong>';
        alertbox.appendChild(eventTitle);


        var argsBox = document.createElement("textarea");
        argsBox.setAttribute("class", "form-control");
        argsBox.innerText = JSON.stringify(result.args);
        alertbox.appendChild(argsBox);
        document.getElementById("limitdorderEvents").appendChild(alertbox);
        App.updateOrderBooks();
      });
      exchangeInstance.LimitBuyOrderCreated({}, {
        fromBlock: 0,
        toBlock: 'latest'
    }).watch(function (error, result) {
        var alertbox = document.createElement("div");
        alertbox.setAttribute("class", "alert alert-info  alert-dismissible");
        var closeBtn = document.createElement("button");
        closeBtn.setAttribute("type", "button");
        closeBtn.setAttribute("class", "close");
        closeBtn.setAttribute("data-dismiss", "alert");
        closeBtn.innerHTML = "<span>&times;</span>";
        alertbox.appendChild(closeBtn);

        var eventTitle = document.createElement("div");
        eventTitle.innerHTML = '<strong>New Event: ' + result.event + '</strong>';
        alertbox.appendChild(eventTitle);


        var argsBox = document.createElement("textarea");
        argsBox.setAttribute("class", "form-control");
        argsBox.innerText = JSON.stringify(result.args);
        alertbox.appendChild(argsBox);
        document.getElementById("limitdorderEvents").appendChild(alertbox);
        App.updateOrderBooks();
        //document.getElementById("tokenEvents").innerHTML += '<div class="alert alert-info  alert-dismissible" role="alert"> <button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button><div></div><div>Args: '+JSON.stringify(result.args) + '</div></div>';
    });



    exchangeInstance.SellOrderFulfilled({}, {fromBlock: 0, toBlock: 'latest'}).watch(function (error, result) {
        var alertbox = document.createElement("div");
        alertbox.setAttribute("class", "alert alert-info  alert-dismissible");
        var closeBtn = document.createElement("button");
        closeBtn.setAttribute("type", "button");
        closeBtn.setAttribute("class", "close");
        closeBtn.setAttribute("data-dismiss", "alert");
        closeBtn.innerHTML = "<span>&times;</span>";
        alertbox.appendChild(closeBtn);

        var eventTitle = document.createElement("div");
        eventTitle.innerHTML = '<strong>New Event: ' + result.event + '</strong>';
        alertbox.appendChild(eventTitle);


        var argsBox = document.createElement("textarea");
        argsBox.setAttribute("class", "form-control");
        argsBox.innerText = JSON.stringify(result.args);
        alertbox.appendChild(argsBox);
        document.getElementById("fulfilledorderEvents").appendChild(alertbox);
        App.updateOrderBooks();
        //document.getElementById("tokenEvents").innerHTML += '<div class="alert alert-info  alert-dismissible" role="alert"> <button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button><div></div><div>Args: '+JSON.stringify(result.args) + '</div></div>';
    });


    exchangeInstance.BuyOrderFulfilled({}, {fromBlock: 0, toBlock: 'latest'}).watch(function (error, result) {
        var alertbox = document.createElement("div");
        alertbox.setAttribute("class", "alert alert-info  alert-dismissible");
        var closeBtn = document.createElement("button");
        closeBtn.setAttribute("type", "button");
        closeBtn.setAttribute("class", "close");
        closeBtn.setAttribute("data-dismiss", "alert");
        closeBtn.innerHTML = "<span>&times;</span>";
        alertbox.appendChild(closeBtn);

        var eventTitle = document.createElement("div");
        eventTitle.innerHTML = '<strong>New Event: ' + result.event + '</strong>';
        alertbox.appendChild(eventTitle);


        var argsBox = document.createElement("textarea");
        argsBox.setAttribute("class", "form-control");
        argsBox.innerText = JSON.stringify(result.args);
        alertbox.appendChild(argsBox);
        document.getElementById("fulfilledorderEvents").appendChild(alertbox);
        App.updateOrderBooks();
        //document.getElementById("tokenEvents").innerHTML += '<div class="alert alert-info  alert-dismissible" role="alert"> <button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button><div></div><div>Args: '+JSON.stringify(result.args) + '</div></div>';
    });

    }).catch(function(e){
      console.log(e);
      App.setStatus("Error occured, please check log!!");
    })
  },
  sellToken: function() {
 //sell token
 var exchangeInstance;
 App.setStatus("Placing sell token order!!");
 ExchangeContract.deployed().then(function(instance){
   exchangeInstance = instance;
   var symbolName = document.getElementById("inputNameSellToken").value;
   var tokenAmount = document.getElementById("inputAmountSellToken").value;
   var priceInWie = document.getElementById("inputPriceSellToken").value;
   console.log(symbolName, tokenAmount, priceInWie);
   return exchangeInstance.sellToken(symbolName, priceInWie, tokenAmount, {from:account, gas:6000000});
 }).then(function(txResult){
   App.setStatus("Sell order placed!!");
   App.refreshBalanceExchange();
   App.updateOrderBooks();
}).catch(function(e) {
   console.log(e);
   App.setStatus("Error while selling tokens. Please see log.");
});
  },

  buyToken: function() {
//buy token
    var exchangeInstance;
    App.setStatus("Placing buy token order!!");
    ExchangeContract.deployed().then(function(instance){
      exchangeInstance = instance;
      var symbolName = document.getElementById("inputNameBuyToken").value;
      var tokenAmount = document.getElementById("inputAmountBuyToken").value;
      var priceInWie = document.getElementById("inputPriceBuyToken").value;
      console.log(symbolName, tokenAmount, priceInWie);
      return exchangeInstance.buyToken(symbolName,priceInWie, tokenAmount, {from:account, gas:6000000});
    }).then(function(txResult){
      App.setStatus("Buy order placed successfully!!");
      App.refreshBalanceExchange();
      App.updateOrderBooks();
  }).catch(function(e) {
      console.log(e);
      App.setStatus("Error while buying tokens. Please see log.");
  });
  },

  /**
   * TOKEN FUNCTIONS FROM HERE ON
   */
  initManageToken: function() {
    App.updateTokenBalance();
    App.watchTokenEvents();
    App.printImportantInformation();
  },
  updateTokenBalance: function() {
    //update the token balance
    var tokenInstance;
    TokenContract.deployed().then(function(instance){
      tokenInstance = instance;
      return tokenInstance.balanceOf.call(account);
    }).then(function(value){
      var balance_element = document.getElementById("balanceTokenInToken");
      balance_element.innerHTML = value.valueOf();
    }).catch(function(e){
      console.log(e);
      App.setStatus("Error getting balance: see logs.")
    });
  },
  watchTokenEvents: function() {
    //watch for token events
    var tokenInstance;
    TokenContract.deployed().then(function(instance){
      tokenInstance = instance;
      tokenInstance.allEvents({},{fromBlock:0,toBlock:'latest'}).watch(function(error, result){
        if(error){
          console.log(error);
          App.setStatus("Error occured while setting up events listener. Please check the logs!!");
          return;
        }
        var alertbox = document.createElement("div");
        alertbox.setAttribute("class", "alert alert-info  alert-dismissible");
        var closeBtn = document.createElement("button");
        closeBtn.setAttribute("type", "button");
        closeBtn.setAttribute("class", "close");
        closeBtn.setAttribute("data-dismiss", "alert");
        closeBtn.innerHTML = "<span>&times;</span>";
        alertbox.appendChild(closeBtn);

        var eventTitle = document.createElement("div");
        eventTitle.innerHTML = '<strong>New Event: '+result.event+'</strong>';
        alertbox.appendChild(eventTitle);


        var argsBox = document.createElement("textarea");
        argsBox.setAttribute("class", "form-control");
        argsBox.innerText= JSON.stringify(result.args);
        alertbox.appendChild(argsBox);
        document.getElementById("tokenEvents").appendChild(alertbox);
      });
    }).catch(function(e){
      console.log(e);
      App.setStatus("Error occured while setting up events listener. Please check the logs!!");
    })
  },

  sendToken: function() {

   //send tokens
   var tokenInstance;
   App.setStatus("Sending tokens!!");
   App.setStatus("Initiating transaction... (please wait)");
   TokenContract.deployed().then(function(instance){
     tokenInstance = instance;
     var amount = document.getElementById("inputAmountSendToken").value;
     var receiver = document.getElementById("inputBeneficiarySendToken").value;
     return tokenInstance.transfer(receiver, amount, {from: account});
   }).then(function(tx){
    App.setStatus("Tokens sent!!");
    App.updateTokenBalance();
   }).catch(function(e){
     console.log(e);
     App.setStatus("Transaction Failed. Please see the logs!!");
   });
  },

  allowanceToken: function() {
    //token allowance
    var tokenInstance;
    App.setStatus("Approving address!!");
    
    TokenContract.deployed().then(function(instance){
      tokenInstance = instance;
      var allowanceAddress = document.getElementById("inputBeneficiaryAllowanceToken").value;
      var allowanceAmount = document.getElementById("inputAmountAllowanceToken").value;
      return tokenInstance.approve(allowanceAddress, allowanceAmount, {from:account});
    }).then(function(tx){
      App.setStatus("Approval request complete!!");
    }).catch(function(e){
      console.log(e);
      App.setStatus("Failed to approve user. Please check logs!!");
    });
  }
};

window.addEventListener('load', function() {
  // Checking if Web3 has been injected by the browser (Mist/MetaMask)
  if (typeof web3 !== 'undefined') {
    console.warn("Using web3 detected from external source. If you find that your accounts don't appear or you have 0 MetaCoin, ensure you've configured that source properly. If using MetaMask, see the following link. Feel free to delete this warning. :) http://truffleframework.com/tutorials/truffle-and-metamask")
    // Use Mist/MetaMask's provider
    window.web3 = new Web3(web3.currentProvider);
  } else {
    console.warn("No web3 detected. Falling back to http://localhost:8545. You should remove this fallback when you deploy live, as it's inherently insecure. Consider switching to Metamask for development. More info here: http://truffleframework.com/tutorials/truffle-and-metamask");
    // fallback - use your fallback strategy (local node / hosted node + in-dapp id mgmt / fail)
    window.web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
  }

  App.start();
});
