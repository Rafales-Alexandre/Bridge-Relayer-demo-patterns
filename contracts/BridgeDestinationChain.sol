// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol"; // For wrapped token
import "@openzeppelin/contracts/access/Ownable.sol";

contract WrappedToken is ERC20 {
    constructor() ERC20("Wrapped Token", "wTOKEN") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function burnFrom(address from, uint256 amount) external {
        _burn(from, amount);
    }
}

contract BridgeDestinationChain is Ownable {
    WrappedToken public wrappedToken; // The wrapped ERC20
    address public relayer;

    event TokenBurned(address indexed user, uint256 amount, address destination);

    constructor(WrappedToken _wrappedToken, address _relayer) Ownable(msg.sender) {
        wrappedToken = _wrappedToken;
        relayer = _relayer;
    }

    // Relayer mints wrapped tokens
    function mintWrapped(address user, uint256 amount) external {
        require(msg.sender == relayer, "Only relayer");
        wrappedToken.mint(user, amount);
    }

    // User burns wrapped tokens to bridge back
    function burn(uint256 amount, address destination) external {
        wrappedToken.burnFrom(msg.sender, amount);
        emit TokenBurned(msg.sender, amount, destination);
    }
}