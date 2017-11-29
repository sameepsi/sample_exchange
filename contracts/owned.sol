pragma solidity ^0.4.15;

contract owned {
    
    address owner;
    
    function owned() {
        owner = msg.sender;
    }
    
    modifier onlyOwner(){
        require(owner==msg.sender);
        _;
    }
}
