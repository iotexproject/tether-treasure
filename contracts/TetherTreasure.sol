// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract TetherTreasure is Ownable {
    IERC20 public immutable tether;

    error TetherTreasureInvalidSpender(address);
    error TetherTreasureInvalidAmount(uint256);

    constructor(IERC20 _tether) Ownable(msg.sender) {
        tether = _tether;
    }

    function increaseAllowance(address _spender, uint256 _amount) public onlyOwner {
        if (_amount == 0) {
            revert TetherTreasureInvalidAmount(_amount);
        }
        if (_spender == address(0)) {
            revert TetherTreasureInvalidSpender(_spender);
        }
        require(tether.approve(_spender, tether.allowance(address(this), _spender) + _amount));
    }

    function decreaseAllowance(address _spender, uint256 _amount) public onlyOwner {
        if (_amount == 0) {
            revert TetherTreasureInvalidAmount(_amount);
        }
        if (_spender == address(0)) {
            revert TetherTreasureInvalidSpender(_spender);
        }
        // negative allowance - _amount will underflow and trigger an exception
        require(tether.approve(_spender, tether.allowance(address(this), _spender) - _amount));
    }

    function resetAllowance(address _spender) public onlyOwner {
        if (_spender == address(0)) {
            revert TetherTreasureInvalidSpender(_spender);
        }
        require(tether.approve(_spender, 0));
    }

    function repay(uint256 _amount) public {
        if (_amount == 0) {
            revert TetherTreasureInvalidAmount(_amount);
        }
        require(tether.transferFrom(msg.sender, address(this), _amount));
        require(tether.approve(msg.sender, tether.allowance(address(this), msg.sender) + _amount));
    }

    function withdraw(address _recipient, uint256 _amount) public onlyOwner {
        require(tether.transfer(_recipient, _amount));
    }
}
