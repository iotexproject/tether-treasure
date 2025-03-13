// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract TetherTreasure is Ownable {
    IERC20 public immutable tether;

    constructor(IERC20 _tether) Ownable(msg.sender) {
        tether = _tether;
    }

    function increaseAllowance(address _spender, uint256 _amount) public onlyOwner {
        require(_amount > 0, "Amount must be greater than 0");
        require(_spender != address(0), "Spender cannot be zero address");
        require(tether.approve(_spender, tether.allowance(address(this), _spender) + _amount), "Approval failed");
    }

    function decreaseAllowance(address _spender, uint256 _amount) public onlyOwner {
        require(_amount > 0, "Amount must be greater than 0");
        require(_spender != address(0), "Spender cannot be zero address");
        // negative allowance - _amount will underflow and trigger an exception
        require(tether.approve(_spender, tether.allowance(address(this), _spender) - _amount), "Approval failed");
    }

    function resetAllowance(address _spender) public onlyOwner {
        require(_spender != address(0), "Spender cannot be zero address");
        require(tether.approve(_spender, 0), "Approval failed");
    }

    function repay(uint256 _amount) public {
        require(_amount > 0, "Amount must be greater than 0");
        require(tether.transferFrom(msg.sender, address(this), _amount), "Transfer failed");
        require(tether.approve(msg.sender, tether.allowance(address(this), msg.sender) + _amount), "Approval failed");
    }

    function withdraw(address _recipient, uint256 _amount) public onlyOwner {
        require(tether.balanceOf(address(this)) >= _amount, "Not enough balance");
        require(tether.transfer(_recipient, _amount), "Transfer failed");
    }
}
