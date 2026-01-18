// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Leaderboard
 * @dev Track and display top performers
 */
contract Leaderboard is Ownable {
    struct UserStats {
        address user;
        uint256 reputation;
        uint256 loansCompleted;
        uint256 totalRepaid;
        uint256 trustScore;
        uint256 lastUpdated;
    }

    // All user addresses
    address[] public users;
    
    // Mapping from user to their stats
    mapping(address => UserStats) public userStats;
    
    // Track if user is registered
    mapping(address => bool) public isRegistered;

    // Events
    event UserRegistered(address indexed user);
    event StatsUpdated(address indexed user, uint256 reputation, uint256 loansCompleted);

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Register user in leaderboard
     * @param user Address of user
     */
    function registerUser(address user) external onlyOwner {
        if (!isRegistered[user]) {
            users.push(user);
            isRegistered[user] = true;
            emit UserRegistered(user);
        }
    }

    /**
     * @dev Update user stats
     * @param user Address of user
     * @param reputation Current reputation score
     * @param loansCompleted Total loans completed
     * @param totalRepaid Total amount repaid
     * @param trustScore Current trust score
     */
    function updateStats(
        address user,
        uint256 reputation,
        uint256 loansCompleted,
        uint256 totalRepaid,
        uint256 trustScore
    ) external onlyOwner {
        userStats[user] = UserStats({
            user: user,
            reputation: reputation,
            loansCompleted: loansCompleted,
            totalRepaid: totalRepaid,
            trustScore: trustScore,
            lastUpdated: block.timestamp
        });

        emit StatsUpdated(user, reputation, loansCompleted);
    }

    /**
     * @dev Get top users by reputation
     * @param count Number of top users to return
     */
    function getTopByReputation(uint256 count) external view returns (UserStats[] memory) {
        if (count > users.length) count = users.length;
        
        UserStats[] memory topUsers = new UserStats[](count);
        
        // Simple bubble sort for top N (good enough for hackathon demo)
        for (uint256 i = 0; i < count; i++) {
            uint256 maxRep = 0;
            uint256 maxIndex = 0;
            
            for (uint256 j = 0; j < users.length; j++) {
                if (userStats[users[j]].reputation > maxRep) {
                    bool alreadyIncluded = false;
                    for (uint256 k = 0; k < i; k++) {
                        if (topUsers[k].user == users[j]) {
                            alreadyIncluded = true;
                            break;
                        }
                    }
                    if (!alreadyIncluded) {
                        maxRep = userStats[users[j]].reputation;
                        maxIndex = j;
                    }
                }
            }
            
            if (maxRep > 0) {
                topUsers[i] = userStats[users[maxIndex]];
            }
        }
        
        return topUsers;
    }

    /**
     * @dev Get top users by loans completed
     * @param count Number of top users to return
     */
    function getTopByLoans(uint256 count) external view returns (UserStats[] memory) {
        if (count > users.length) count = users.length;
        
        UserStats[] memory topUsers = new UserStats[](count);
        
        for (uint256 i = 0; i < count; i++) {
            uint256 maxLoans = 0;
            uint256 maxIndex = 0;
            
            for (uint256 j = 0; j < users.length; j++) {
                if (userStats[users[j]].loansCompleted > maxLoans) {
                    bool alreadyIncluded = false;
                    for (uint256 k = 0; k < i; k++) {
                        if (topUsers[k].user == users[j]) {
                            alreadyIncluded = true;
                            break;
                        }
                    }
                    if (!alreadyIncluded) {
                        maxLoans = userStats[users[j]].loansCompleted;
                        maxIndex = j;
                    }
                }
            }
            
            if (maxLoans > 0) {
                topUsers[i] = userStats[users[maxIndex]];
            }
        }
        
        return topUsers;
    }

    /**
     * @dev Get user's rank by reputation
     * @param user Address to check
     */
    function getUserRank(address user) external view returns (uint256) {
        uint256 rank = 1;
        uint256 userRep = userStats[user].reputation;
        
        for (uint256 i = 0; i < users.length; i++) {
            if (users[i] != user && userStats[users[i]].reputation > userRep) {
                rank++;
            }
        }
        
        return rank;
    }

    /**
     * @dev Get total registered users
     */
    function getTotalUsers() external view returns (uint256) {
        return users.length;
    }
}
