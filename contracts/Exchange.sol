pragma solidity ^0.4.15;

import "./owned.sol";
import "./FixedSupplyToken.sol";

contract Exchange is owned {
    
    
    //GENERAL STRUCTURE
    
    //its a stack
    struct Offer {
        uint amount;
        address who;
    }
    
    //its a linked list
    struct OrderBook {
        uint higherPrice;
        uint lowerPrice;
        mapping(uint=>Offer) offers;
        uint offerKey;
        uint offerLength;
    }
    
    struct Token {
        address tokenContract;
        string symbolName;
        
        mapping(uint=>OrderBook) buyOrderBook;
        uint curBuyPrice;
        uint lowestBuyPrice;
        uint amountBuyPrices;
        
        mapping(uint=>OrderBook) sellOrderBook;
        uint curSellPrice;
        uint highestSellPrice;
        uint amountSellPrices;
    }
    
    mapping(uint8 => Token) tokens;
    
    uint8 symbolNameIndex;
    
    
    //BALANCES DATA STRUCTURE
    
    mapping(address => mapping(uint8 => uint)) tokenBalanceForAddress;
    
    mapping(address => uint) ethBalanceForAddress;
    
    //EVENTS
    event TokenAddedToSystem(uint _symbolIndex, string token, uint _timeStamp);
    event DepositForTokenReceived(address indexed_from, uint indexed_symbolIndex, uint _amount, uint _timeStamp);
    event WithdrawalToken(address indexed_to, uint indexed_symbolIndex, uint _amount, uint _timeStamp);
    event DepositForEthReceived(address indexed_from, uint _amount, uint _timeStamp);
    event WithdrawalEth(address indexed_to, uint _amount, uint _timeStamp);
    event LimitSellOrderCreated(uint indexed _symbolIndex, address indexed _who, uint _amountTokens, uint _priceInWei, uint _orderKey);
    event SellOrderFulfilled(uint indexed _symbolIndex, uint _amount, uint _priceInWei, uint _orderKey);
    event SellOrderCanceled(uint indexed _symbolIndex, uint _priceInWei, uint _orderKey);
    event LimitBuyOrderCreated(uint indexed _symbolIndex, address indexed _who, uint _amountTokens, uint _priceInWei, uint _orderKey);
    event BuyOrderFulfilled(uint indexed _symbolIndex, uint _amount, uint _priceInWei, uint _orderKey);
    event BuyOrderCanceled(uint indexed _symbolIndex, uint _priceInWei, uint _orderKey); 
    
    
    //FUNDS MANAGEMENT
    
    function depositEther()payable {
      require(ethBalanceForAddress[msg.sender]+msg.value>ethBalanceForAddress[msg.sender]);
      ethBalanceForAddress[msg.sender]+=msg.value;
      DepositForEthReceived(msg.sender, msg.value, now);
    }
    
    function withdrawEther(uint amountInWei){
        require(ethBalanceForAddress[msg.sender]>=amountInWei);
        require(ethBalanceForAddress[msg.sender]-amountInWei<=ethBalanceForAddress[msg.sender]);
        ethBalanceForAddress[msg.sender]-=amountInWei;
        msg.sender.transfer(amountInWei);
        WithdrawalEth(msg.sender, amountInWei, now);
    }
    
    function getEthBalanceInWei()constant returns(uint){
        return ethBalanceForAddress[msg.sender];
    }
    
    //TOKEN MANAGEMENT
    
    function addToken(string symbolName, address erc20TokenAddress)onlyOwner {
        require(!hasToken(symbolName));
        symbolNameIndex++;
        tokens[symbolNameIndex].symbolName = symbolName;
        tokens[symbolNameIndex].tokenContract = erc20TokenAddress;
        TokenAddedToSystem(symbolNameIndex, symbolName, now);
    }
    
    function hasToken(string symbolName)constant returns(bool){
        if(getSymbolIndex(symbolName)==0){
            return false;
        }
        return true;
    }
    
    function getSymbolIndex(string symbolName)constant returns(uint8){
        for(uint8 j=1;j<=symbolNameIndex;j++) {
            if(stringComparison(tokens[j].symbolName, symbolName)){
                return j;
            }
        }
        return 0;
    }
    
    //DEPOSIT AND WITHDRAW TOKENS
    
    function depositToken(string symbolName, uint amount){
        require(hasToken(symbolName));
        uint8 tokenIndex = getSymbolIndex(symbolName);

        require(tokenIndex>0);
        require(tokens[tokenIndex].tokenContract!=address(0));

        require(tokenBalanceForAddress[msg.sender][tokenIndex] + amount >= tokenBalanceForAddress[msg.sender][tokenIndex]);

        ERC20Interface token = ERC20Interface(tokens[tokenIndex].tokenContract);

        require(token.transferFrom(msg.sender,address(this), amount)==true);
        tokenBalanceForAddress[msg.sender][tokenIndex]+=amount;
        DepositForTokenReceived(msg.sender, tokenIndex, amount, now);

    }
    
    function withdrawToken(string symbolName, uint amount){
        require(hasToken(symbolName));
        uint8 tokenIndex = getSymbolIndex(symbolName);

        require(tokenIndex>0);
        require(tokens[tokenIndex].tokenContract!=address(0));

        require(tokenBalanceForAddress[msg.sender][tokenIndex]>=amount);
        require(tokenBalanceForAddress[msg.sender][tokenIndex] - amount <= tokenBalanceForAddress[msg.sender][tokenIndex]);

        ERC20Interface token = ERC20Interface(tokens[tokenIndex].tokenContract);

        tokenBalanceForAddress[msg.sender][tokenIndex]-=amount;

        require(token.transfer(msg.sender, amount)==true);
        
        WithdrawalToken(msg.sender, tokenIndex, amount, now);
    }
    
    function getBalance(string symbolName)constant returns(uint){
        require(hasToken(symbolName));
        uint8 tokenIndex = getSymbolIndex(symbolName);
        return tokenBalanceForAddress[msg.sender][tokenIndex];
    }
    
    //PLACE ORDERS
    
    function buyToken(string symbolName, uint priceInWei, uint amount){
        uint8 tokenNameIndex = getSymbolIndex(symbolName);
        require(tokenNameIndex>0);
        uint totalEtherRequired = priceInWei * amount;
        uint total_amount_ether_available;
        require(totalEtherRequired>=priceInWei);
        require(totalEtherRequired>=amount);
        require(ethBalanceForAddress[msg.sender]>=totalEtherRequired);
        require(ethBalanceForAddress[msg.sender]-totalEtherRequired>=0);
        ethBalanceForAddress[msg.sender] -= totalEtherRequired;

        if(tokens[tokenNameIndex].amountSellPrices==0 || (tokens[tokenNameIndex].curSellPrice>priceInWei)){
                addBuyOffer(tokenNameIndex, priceInWei, amount, msg.sender);
                LimitBuyOrderCreated(tokenNameIndex, msg.sender, amount, priceInWei, tokens[tokenNameIndex].buyOrderBook[priceInWei].offerLength);
        } else{
            //its a market and should be fullfilled
            uint whilePrice = tokens[tokenNameIndex].curSellPrice;
            uint amountRequired = amount;

            while(whilePrice<=priceInWei && amountRequired>0){
                uint offerKey = tokens[tokenNameIndex].sellOrderBook[whilePrice].offerKey;

                while(offerKey<=tokens[tokenNameIndex].sellOrderBook[whilePrice].offerLength && amountRequired>0){
                    uint amountAvailableToSell = tokens[tokenNameIndex].sellOrderBook[whilePrice].offers[offerKey].amount;

                    if(amountAvailableToSell<=amountRequired){
                       total_amount_ether_available = amountAvailableToSell * priceInWei;
                        require(ethBalanceForAddress[msg.sender] >= total_amount_ether_available);
                        require(ethBalanceForAddress[msg.sender] - total_amount_ether_available <= ethBalanceForAddress[msg.sender]);
                        ethBalanceForAddress[msg.sender]-=total_amount_ether_available;
                        require(tokenBalanceForAddress[msg.sender][tokenNameIndex] + amountAvailableToSell >= tokenBalanceForAddress[msg.sender][tokenNameIndex]);
                        require(ethBalanceForAddress[tokens[tokenNameIndex].sellOrderBook[whilePrice].offers[offerKey].who] + total_amount_ether_available >= ethBalanceForAddress[tokens[tokenNameIndex].sellOrderBook[whilePrice].offers[offerKey].who]);
                        tokenBalanceForAddress[msg.sender][tokenNameIndex]+=amountAvailableToSell;
                        tokens[tokenNameIndex].sellOrderBook[whilePrice].offers[offerKey].amount=0;
                        tokens[tokenNameIndex].sellOrderBook[whilePrice].offerKey++;
                        ethBalanceForAddress[tokens[tokenNameIndex].sellOrderBook[whilePrice].offers[offerKey].who]+=total_amount_ether_available;
                        BuyOrderFulfilled(tokenNameIndex, amountAvailableToSell, whilePrice, offerKey);

                        amountRequired-=amountAvailableToSell;                    
                    }
                    else{
                        require(tokens[tokenNameIndex].sellOrderBook[whilePrice].offers[offerKey].amount > amountRequired);//sanity
                        totalEtherRequired = amountRequired * whilePrice;
                        ethBalanceForAddress[msg.sender] -= totalEtherRequired;
                        require(ethBalanceForAddress[tokens[tokenNameIndex].sellOrderBook[whilePrice].offers[offerKey].who] + totalEtherRequired >= ethBalanceForAddress[tokens[tokenNameIndex].sellOrderBook[whilePrice].offers[offerKey].who]);

                        tokens[tokenNameIndex].sellOrderBook[whilePrice].offers[offerKey].amount-=amountRequired;
                        ethBalanceForAddress[tokens[tokenNameIndex].sellOrderBook[whilePrice].offers[offerKey].who]+=totalEtherRequired;
                        tokenBalanceForAddress[msg.sender][tokenNameIndex]+=amountRequired;
                        amountRequired=0;
                        BuyOrderFulfilled(tokenNameIndex, amountRequired, whilePrice, offerKey);


                    }

                    if(offerKey==tokens[tokenNameIndex].sellOrderBook[whilePrice].offerLength && tokens[tokenNameIndex].sellOrderBook[whilePrice].offers[offerKey].amount==0){
                        tokens[tokenNameIndex].amountSellPrices--;

                        if(whilePrice==tokens[tokenNameIndex].sellOrderBook[whilePrice].higherPrice || tokens[tokenNameIndex].sellOrderBook[whilePrice].higherPrice==0){
                            tokens[tokenNameIndex].curSellPrice=0;
                        }else{
                            tokens[tokenNameIndex].curSellPrice=tokens[tokenNameIndex].sellOrderBook[whilePrice].higherPrice;
                            tokens[tokenNameIndex].sellOrderBook[tokens[tokenNameIndex].curSellPrice].lowerPrice=0;
                        }
                    }
                    offerKey++;
                }
                whilePrice = tokens[tokenNameIndex].curSellPrice;
            }

            if(amountRequired>0){
                buyToken(symbolName, priceInWei, amountRequired);
            }
        }
    }
    
    function addBuyOffer(uint8 tokenNameIndex, uint priceInWei, uint amount, address sender)internal{
        tokens[tokenNameIndex].buyOrderBook[priceInWei].offerLength++;
        tokens[tokenNameIndex].buyOrderBook[priceInWei].offers[tokens[tokenNameIndex].buyOrderBook[priceInWei].offerLength]=Offer(amount, sender);
        if(tokens[tokenNameIndex].buyOrderBook[priceInWei].offerLength==1){
            tokens[tokenNameIndex].buyOrderBook[priceInWei].offerKey=1;
            tokens[tokenNameIndex].amountBuyPrices++;
            uint currBuyPrice = tokens[tokenNameIndex].curBuyPrice;
            uint lowestBuyPrice = tokens[tokenNameIndex].lowestBuyPrice;

            if(lowestBuyPrice==0 || lowestBuyPrice>priceInWei){
                if(currBuyPrice==0){
                    tokens[tokenNameIndex].curBuyPrice = priceInWei;
                    tokens[tokenNameIndex].buyOrderBook[priceInWei].lowerPrice = 0;
                    tokens[tokenNameIndex].buyOrderBook[priceInWei].higherPrice = priceInWei;
                }
                else{
                    tokens[tokenNameIndex].buyOrderBook[lowestBuyPrice].lowerPrice = priceInWei;
                    tokens[tokenNameIndex].buyOrderBook[priceInWei].lowerPrice = 0;
                    tokens[tokenNameIndex].buyOrderBook[priceInWei].higherPrice = lowestBuyPrice;
                }
                tokens[tokenNameIndex].lowestBuyPrice = priceInWei;
            }

            else if(priceInWei>currBuyPrice){
                tokens[tokenNameIndex].buyOrderBook[currBuyPrice].higherPrice = priceInWei;
                tokens[tokenNameIndex].buyOrderBook[priceInWei].lowerPrice = currBuyPrice;
                tokens[tokenNameIndex].buyOrderBook[priceInWei].higherPrice = priceInWei;
                tokens[tokenNameIndex].curBuyPrice = priceInWei;
            }
            else{
                uint buyPrice = tokens[tokenNameIndex].curBuyPrice;
                bool posFound = false;

                while(buyPrice>0 && !posFound){
                    if(buyPrice<priceInWei && (tokens[tokenNameIndex].buyOrderBook[buyPrice].higherPrice>priceInWei)){
                    tokens[tokenNameIndex].buyOrderBook[priceInWei].higherPrice = tokens[tokenNameIndex].buyOrderBook[buyPrice].higherPrice;
                    tokens[tokenNameIndex].buyOrderBook[tokens[tokenNameIndex].buyOrderBook[buyPrice].higherPrice].lowerPrice = priceInWei;
                    tokens[tokenNameIndex].buyOrderBook[buyPrice].higherPrice = priceInWei;
                    tokens[tokenNameIndex].buyOrderBook[priceInWei].lowerPrice = buyPrice;
                    posFound = true;
                    }

                    buyPrice = tokens[tokenNameIndex].buyOrderBook[buyPrice].lowerPrice;
                } 
            }
        }
    }
    function sellToken(string symbolName, uint priceInWei, uint amount){
        uint8 tokenNameIndex = getSymbolIndex(symbolName);
        uint total_amount_ether_necessary = 0;
        uint total_amount_ether_available = 0;
        require(tokenNameIndex>0);
        require(tokenBalanceForAddress[msg.sender][tokenNameIndex]>=amount);
        require(tokenBalanceForAddress[msg.sender][tokenNameIndex] - amount>=0);

        tokenBalanceForAddress[msg.sender][tokenNameIndex]-=amount;

        if(tokens[tokenNameIndex].amountBuyPrices == 0 || tokens[tokenNameIndex].curBuyPrice<priceInWei){
            addSellOffer(tokenNameIndex, priceInWei, amount, msg.sender);
            LimitSellOrderCreated(tokenNameIndex, msg.sender, amount, priceInWei, tokens[tokenNameIndex].sellOrderBook[priceInWei].offerLength);

        }else{
            //its a market order and can be executed right away
            
            //its a market order which can be served by current sell orders;
            uint whilePrice = tokens[tokenNameIndex].curBuyPrice;
            uint amountRequired = amount;
            while(whilePrice>=priceInWei && amountRequired>0){
                uint offerKey = tokens[tokenNameIndex].buyOrderBook[whilePrice].offerKey;
                while(offerKey<=tokens[tokenNameIndex].buyOrderBook[whilePrice].offerLength &&  amountRequired>0){
                uint amountAvailable = tokens[tokenNameIndex].buyOrderBook[whilePrice].offers[offerKey].amount;
                if(amountAvailable<=amountRequired){
                    total_amount_ether_available = amountAvailable * whilePrice;
                    require(tokenBalanceForAddress[msg.sender][tokenNameIndex]>=amountAvailable);
                    require(tokenBalanceForAddress[msg.sender][tokenNameIndex]-amountAvailable>=0);
                    tokenBalanceForAddress[msg.sender][tokenNameIndex] -= amountAvailable;
                    require(tokenBalanceForAddress[msg.sender][tokenNameIndex] - amountAvailable >= 0);
                    require(tokenBalanceForAddress[tokens[tokenNameIndex].buyOrderBook[whilePrice].offers[offerKey].who][tokenNameIndex] + amountAvailable >= tokenBalanceForAddress[tokens[tokenNameIndex].buyOrderBook[whilePrice].offers[offerKey].who][tokenNameIndex]);
                    require(ethBalanceForAddress[msg.sender] + total_amount_ether_available >= ethBalanceForAddress[msg.sender]);
                    tokenBalanceForAddress[tokens[tokenNameIndex].buyOrderBook[whilePrice].offers[offerKey].who][tokenNameIndex]+=amountAvailable;
                    tokens[tokenNameIndex].buyOrderBook[whilePrice].offers[offerKey].amount=0;
                    ethBalanceForAddress[msg.sender]+=total_amount_ether_available;
                    tokens[tokenNameIndex].buyOrderBook[whilePrice].offerKey++;
                    SellOrderFulfilled(tokenNameIndex, amountAvailable, whilePrice, offerKey);
                    amountRequired -= amountAvailable;
                }
                else{
                    require(amountAvailable-amountRequired>0);
                    total_amount_ether_necessary = amountRequired * whilePrice;
                    require(tokenBalanceForAddress[msg.sender][tokenNameIndex] >= amountRequired);
                    tokenBalanceForAddress[msg.sender][tokenNameIndex]-=amountRequired;
                    require(tokenBalanceForAddress[msg.sender][tokenNameIndex] - amountRequired >= 0);
                    require(tokenBalanceForAddress[tokens[tokenNameIndex].buyOrderBook[whilePrice].offers[offerKey].who][tokenNameIndex] + amountRequired >= tokenBalanceForAddress[tokens[tokenNameIndex].buyOrderBook[whilePrice].offers[offerKey].who][tokenNameIndex]);
                    require(ethBalanceForAddress[msg.sender] + total_amount_ether_necessary >= ethBalanceForAddress[msg.sender]);
                    tokenBalanceForAddress[tokens[tokenNameIndex].buyOrderBook[whilePrice].offers[offerKey].who][tokenNameIndex]+=amountRequired;
                    tokens[tokenNameIndex].buyOrderBook[whilePrice].offers[offerKey].amount-=amountRequired;
                    ethBalanceForAddress[msg.sender]+=total_amount_ether_necessary;
                    SellOrderFulfilled(tokenNameIndex, amountRequired, whilePrice, offerKey);
                    amountRequired = 0;


                }
                if(offerKey==tokens[tokenNameIndex].buyOrderBook[whilePrice].offerLength && tokens[tokenNameIndex].buyOrderBook[whilePrice].offers[offerKey].amount==0){
                    tokens[tokenNameIndex].amountBuyPrices--;
                    if(whilePrice==tokens[tokenNameIndex].buyOrderBook[whilePrice].lowerPrice || tokens[tokenNameIndex].buyOrderBook[whilePrice].lowerPrice==0){
                        tokens[tokenNameIndex].curBuyPrice=0;
                    }
                    else{
                        tokens[tokenNameIndex].curBuyPrice = tokens[tokenNameIndex].buyOrderBook[whilePrice].lowerPrice;
                        tokens[tokenNameIndex].buyOrderBook[tokens[tokenNameIndex].buyOrderBook[whilePrice].lowerPrice].higherPrice = tokens[tokenNameIndex].curBuyPrice; 
                    }
                }
                offerKey++;
                }
                whilePrice = tokens[tokenNameIndex].curBuyPrice;
            }
            if(amountRequired>0){
                //place limit order for remaining amount of tokens
                 sellToken(symbolName, priceInWei, amountRequired);
            }
        }
    }
    
    function addSellOffer(uint8 tokenIndex, uint priceInWei, uint amount, address sender){
        tokens[tokenIndex].sellOrderBook[priceInWei].offerLength++;
        tokens[tokenIndex].sellOrderBook[priceInWei].offers[tokens[tokenIndex].sellOrderBook[priceInWei].offerLength] = Offer(amount, sender);
        if(tokens[tokenIndex].sellOrderBook[priceInWei].offerLength==1){
            tokens[tokenIndex].sellOrderBook[priceInWei].offerKey=1;
            tokens[tokenIndex].amountSellPrices++;

            uint currSellPrice = tokens[tokenIndex].curSellPrice;
            uint highestSellPrice = tokens[tokenIndex].highestSellPrice;

            if(highestSellPrice==0 || highestSellPrice<priceInWei){
                if(currSellPrice==0){
                    tokens[tokenIndex].sellOrderBook[priceInWei].higherPrice=0;
                    tokens[tokenIndex].sellOrderBook[priceInWei].lowerPrice=0;
                    tokens[tokenIndex].curSellPrice = priceInWei;
                }
                else{
                    tokens[tokenIndex].sellOrderBook[highestSellPrice].higherPrice = priceInWei;
                    tokens[tokenIndex].sellOrderBook[priceInWei].lowerPrice = highestSellPrice;
                    tokens[tokenIndex].sellOrderBook[priceInWei].higherPrice = 0;
                }
                tokens[tokenIndex].highestSellPrice = priceInWei;
            }
            else if(currSellPrice>priceInWei){
                //lowest sell price
                tokens[tokenIndex].sellOrderBook[currSellPrice].lowerPrice = priceInWei;
                tokens[tokenIndex].sellOrderBook[priceInWei].higherPrice = currSellPrice;
                tokens[tokenIndex].sellOrderBook[priceInWei].lowerPrice = 0;
                tokens[tokenIndex].curSellPrice = priceInWei;
            }
            else{
                uint sellPrice = tokens[tokenIndex].curSellPrice;
                bool posFound = false;
                while(sellPrice>0 && !posFound){
                    if(sellPrice<priceInWei && (tokens[tokenIndex].sellOrderBook[sellPrice].higherPrice>priceInWei)){
                        tokens[tokenIndex].sellOrderBook[priceInWei].lowerPrice = sellPrice;
                        tokens[tokenIndex].sellOrderBook[priceInWei].higherPrice = tokens[tokenIndex].sellOrderBook[sellPrice].higherPrice;
                        tokens[tokenIndex].sellOrderBook[tokens[tokenIndex].sellOrderBook[sellPrice].higherPrice].lowerPrice = priceInWei;
                        tokens[tokenIndex].sellOrderBook[sellPrice].higherPrice = priceInWei;
                        posFound = true;
                    }
                    sellPrice = tokens[tokenIndex].sellOrderBook[sellPrice].higherPrice;
                }
            }

        }
    }

    //ORDER MANAGEMENT
    
    function cancelOrder(string symbolName, bool isSellOrder, uint priceInWei, uint offerKey){
        uint8 tokenNameIndex = getSymbolIndex(symbolName);
        require(tokenNameIndex>0);
        if(isSellOrder){
            require(tokens[tokenNameIndex].sellOrderBook[priceInWei].offers[offerKey].who==msg.sender);
            uint tokenAmount = tokens[tokenNameIndex].sellOrderBook[priceInWei].offers[offerKey].amount;
            require(tokenBalanceForAddress[msg.sender][tokenNameIndex]+tokenAmount>=tokenBalanceForAddress[msg.sender][tokenNameIndex]);
            tokenBalanceForAddress[msg.sender][tokenNameIndex]+=tokenAmount;
            tokens[tokenNameIndex].sellOrderBook[priceInWei].offers[offerKey].amount=0;
            SellOrderCanceled(tokenNameIndex, priceInWei, offerKey);
        }else{
            require(tokens[tokenNameIndex].buyOrderBook[priceInWei].offers[offerKey].who==msg.sender);
            uint etherToRefund = tokens[tokenNameIndex].buyOrderBook[priceInWei].offers[offerKey].amount*priceInWei;
            require(ethBalanceForAddress[msg.sender]+etherToRefund>=ethBalanceForAddress[msg.sender]);
            ethBalanceForAddress[msg.sender]+=etherToRefund;
            tokens[tokenNameIndex].buyOrderBook[priceInWei].offers[offerKey].amount=0;
            BuyOrderCanceled(tokenNameIndex, priceInWei, offerKey);
        }
    }
    
    function getSellOrderBook(string symbolName)constant returns(uint[], uint[]){
    uint8 tokenNameIndex = getSymbolIndex(symbolName);
        require(tokenNameIndex>0);
        uint[] memory arrPricesSell = new uint[](tokens[tokenNameIndex].amountSellPrices);
        uint[] memory arrVolumeSell = new uint[](tokens[tokenNameIndex].amountSellPrices);

        uint lowestSellPrice = tokens[tokenNameIndex].curSellPrice;
        uint counter = 0;
        if(tokens[tokenNameIndex].curSellPrice>0){
        while(lowestSellPrice<=tokens[tokenNameIndex].highestSellPrice){
            arrPricesSell[counter] = lowestSellPrice;

            uint offerKey = tokens[tokenNameIndex].sellOrderBook[lowestSellPrice].offerKey;
            uint vol = 0;
            while(offerKey<=tokens[tokenNameIndex].sellOrderBook[lowestSellPrice].offerLength){
                vol+=tokens[tokenNameIndex].sellOrderBook[lowestSellPrice].offers[offerKey].amount;
                offerKey++;
            }
            arrVolumeSell[counter]=vol;

            if(tokens[tokenNameIndex].sellOrderBook[lowestSellPrice].higherPrice==0){
                break;
            }
            else{
                lowestSellPrice = tokens[tokenNameIndex].sellOrderBook[lowestSellPrice].higherPrice;
            }
            counter++;

        }
    }
    return (arrPricesSell, arrVolumeSell);

        
    }
    
    function getBuyOrderBook(string symbolName)constant returns(uint[], uint[]){
        uint8 tokenNameIndex = getSymbolIndex(symbolName);
        require(tokenNameIndex>0);
        uint[] memory arrPricesBuy = new uint[](tokens[tokenNameIndex].amountBuyPrices);
        uint[] memory arrVolumeBuy = new uint[](tokens[tokenNameIndex].amountBuyPrices);
        uint lowestBuyPrice = tokens[tokenNameIndex].lowestBuyPrice;
        uint counter = 0;
        if(tokens[tokenNameIndex].curBuyPrice>0){
            while(lowestBuyPrice<=tokens[tokenNameIndex].curBuyPrice){
                arrPricesBuy[counter] = lowestBuyPrice;

                uint offerKey = tokens[tokenNameIndex].buyOrderBook[lowestBuyPrice].offerKey;
                uint volume = 0;
                while(offerKey<=tokens[tokenNameIndex].buyOrderBook[lowestBuyPrice].offerLength){
                    volume += tokens[tokenNameIndex].buyOrderBook[lowestBuyPrice].offers[offerKey].amount;
                    offerKey++;
                    
                }
                arrVolumeBuy[counter]=volume;
                if(lowestBuyPrice == tokens[tokenNameIndex].curBuyPrice){
                    break;
                }
                else{
                    lowestBuyPrice = tokens[tokenNameIndex].buyOrderBook[lowestBuyPrice].higherPrice;
                }
                counter++;
            }
        }
        return(arrPricesBuy, arrVolumeBuy);
    }
    
    //String comparison function
    
    function stringComparison(string storage _a, string memory _b)internal returns(bool) {
        
        bytes storage a = bytes(_a);
        bytes memory b = bytes(_b);
        
        if(a.length!=b.length){
            return false;
        }
        
        for(uint i=0;i<a.length;i++){
            if(a[i]!=b[i]){
                return false;
            }
        }
        return true;
    }
}