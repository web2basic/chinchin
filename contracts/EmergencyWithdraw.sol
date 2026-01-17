// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title EmergencyWithdraw
 * @dev Timelock mechanism for emergency withdrawals with reputation penalty
 */
contract EmergencyWithdraw is Ownable, ReentrancyGuard {
    struct WithdrawalRequest {
        address user;
        uint256 amount;
        uint256 requestTime;
        bool executed;
    }

    // Timelock period (e.g., 7 days)
    uint256 public constant TIMELOCK_PERIOD = 7 days;

    // Reputation penalty for emergency withdrawal
    uint256 public constant EMERGENCY_PENALTY = 50;

    // Mapping from user to withdrawal request
    mapping(address => WithdrawalRequest) public withdrawalRequests;

    // Events
    event WithdrawalRequested(address indexed user, uint256 amount, uint256 executionTime);
    event WithdrawalExecuted(address indexed user, uint256 amount);
    event WithdrawalCancelled(address indexed user);

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Request emergency withdrawal
     * @param amount Amount to withdraw
     */
    function requestWithdrawal(uint256 amount) external {
        require(amount > 0, "Invalid amount");
        require(withdrawalRequests[msg.sender].requestTime == 0, "Withdrawal already requested");

        withdrawalRequests[msg.sender] = WithdrawalRequest({
            user: msg.sender,
            amount: amount,
            requestTime: block.timestamp,
            executed: false
        });

        emit WithdrawalRequested(msg.sender, amount, block.timestamp + TIMELOCK_PERIOD);
    }

    /**
     * @dev Execute emergency withdrawal after timelock
     */
    function executeWithdrawal() external nonReentrant {
        WithdrawalRequest storage request = withdrawalRequests[msg.sender];
        require(request.requestTime > 0, "No withdrawal request");
        require(!request.executed, "Already executed");
        require(block.timestamp >= request.requestTime + TIMELOCK_PERIOD, "Timelock not expired");

        request.executed = true;

        emit WithdrawalExecuted(msg.sender, request.amount);

        // Note: Actual withdrawal logic would be in LendingPool
        // This contract just manages the timelock
    }

    /**
     * @dev Cancel withdrawal request
     */
    function cancelWithdrawal() external {
        WithdrawalRequest storage request = withdrawalRequests[msg.sender];
        require(request.requestTime > 0, "No withdrawal request");
        require(!request.executed, "Already executed");

        delete withdrawalRequests[msg.sender];

        emit WithdrawalCancelled(msg.sender);
    }

    /**
     * @dev Check if withdrawal is ready
     * @param user Address to check
     */
    function isWithdrawalReady(address user) external view returns (bool) {
        WithdrawalRequest memory request = withdrawalRequests[user];
        if (request.requestTime == 0 || request.executed) {
            return false;
        }
        return block.timestamp >= request.requestTime + TIMELOCK_PERIOD;
    }

    /**
     * @dev Get time remaining until withdrawal ready
     * @param user Address to check
     */
    function getTimeRemaining(address user) external view returns (uint256) {
        WithdrawalRequest memory request = withdrawalRequests[user];
        if (request.requestTime == 0 || request.executed) {
            return 0;
        }
        
        uint256 executionTime = request.requestTime + TIMELOCK_PERIOD;
        if (block.timestamp >= executionTime) {
            return 0;
        }
        
        return executionTime - block.timestamp;
    }
}
