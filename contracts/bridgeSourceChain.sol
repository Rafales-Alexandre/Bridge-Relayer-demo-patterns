// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BridgeSourceChain is Ownable {
    IERC20 public token; // The ERC20 token to bridge
    address public relayer; // Authorized relayer address

    event TokenLocked(address indexed user, uint256 amount, address destination);

    constructor(IERC20 _token, address _relayer) Ownable(msg.sender) {
        token = _token;
        relayer = _relayer;
    }

    // User locks tokens to bridge
    function lock(uint256 amount, address destination) external {
        require(token.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        emit TokenLocked(msg.sender, amount, destination);
    }

    // Relayer releases tokens on reverse bridge
    function release(address user, uint256 amount) external {
        require(msg.sender == relayer, "Only relayer");
        require(token.transfer(user, amount), "Transfer failed");
    }
}