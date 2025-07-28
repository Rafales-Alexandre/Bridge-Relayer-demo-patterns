// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

error OnlyRelayer();

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
        token.safeTransferFrom(msg.sender, address(this), amount);
        emit TokenLocked(msg.sender, amount, destination);
    }

    // Relayer releases tokens on reverse bridge
    function release(address user, uint256 amount) external {
        if(msg.sender != relayer) revert OnlyRelayer();
        token.safeTransfer(user, amount);
    }
}