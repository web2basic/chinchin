// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./ReputationNFT.sol";

/**
 * @title ReferralSystem
 * @dev Incentivize user growth through referral bonuses
 */
contract ReferralSystem {
    ReputationNFT public reputationNFT;

    struct Referral {
        address referrer;
        address referred;
        uint256 timestamp;
        bool rewardClaimed;
    }

    // Mapping from referred user to referral info
    mapping(address => Referral) public referrals;

    // Mapping from referrer to list of referred users
    mapping(address => address[]) public referrerToReferrals;

    // Referral rewards
    uint256 public constant REFERRER_BONUS = 30; // Referrer gets 30 reputation
    uint256 public constant REFERRED_BONUS = 20; // New user gets 20 reputation
    uint256 public constant MILESTONE_BONUS = 50; // Bonus for every 5 referrals

    // Events
    event UserReferred(address indexed referrer, address indexed referred, uint256 timestamp);
    event ReferralRewardClaimed(address indexed referrer, address indexed referred, uint256 referrerBonus, uint256 referredBonus);
    event MilestoneReached(address indexed referrer, uint256 totalReferrals, uint256 bonus);

    constructor(address _reputationNFT) {
        reputationNFT = ReputationNFT(_reputationNFT);
    }

    /**
     * @dev Register a referral
     * @param referrer Address of the referrer
     */
    function registerReferral(address referrer) external {
        require(referrer != address(0), "Invalid referrer");
        require(referrer != msg.sender, "Cannot refer yourself");
        require(referrals[msg.sender].referrer == address(0), "Already referred");
        
        // Check that both users have reputation NFTs
        require(reputationNFT.userToTokenId(referrer) != 0, "Referrer has no reputation NFT");
        require(reputationNFT.userToTokenId(msg.sender) != 0, "User has no reputation NFT");

        referrals[msg.sender] = Referral({
            referrer: referrer,
            referred: msg.sender,
            timestamp: block.timestamp,
            rewardClaimed: false
        });

        referrerToReferrals[referrer].push(msg.sender);

        emit UserReferred(referrer, msg.sender, block.timestamp);
    }

    /**
     * @dev Claim referral rewards (called when referred user completes first loan)
     * @param referred Address of the referred user
     */
    function claimReferralReward(address referred) external {
        Referral storage referral = referrals[referred];
        require(referral.referrer != address(0), "No referral found");
        require(!referral.rewardClaimed, "Reward already claimed");
        require(msg.sender == referral.referrer, "Not the referrer");

        // Mark as claimed
        referral.rewardClaimed = true;

        // Award bonuses
        reputationNFT.updateReputation(referral.referrer, int256(REFERRER_BONUS));
        reputationNFT.updateReputation(referred, int256(REFERRED_BONUS));

        emit ReferralRewardClaimed(
            referral.referrer,
            referred,
            REFERRER_BONUS,
            REFERRED_BONUS
        );

        // Check for milestone bonus
        uint256 totalReferrals = referrerToReferrals[referral.referrer].length;
        if (totalReferrals % 5 == 0) {
            reputationNFT.updateReputation(referral.referrer, int256(MILESTONE_BONUS));
            emit MilestoneReached(referral.referrer, totalReferrals, MILESTONE_BONUS);
        }
    }

    /**
     * @dev Get all referrals for a referrer
     * @param referrer Address of the referrer
     */
    function getReferrals(address referrer) external view returns (address[] memory) {
        return referrerToReferrals[referrer];
    }

    /**
     * @dev Get referral count for a referrer
     * @param referrer Address of the referrer
     */
    function getReferralCount(address referrer) external view returns (uint256) {
        return referrerToReferrals[referrer].length;
    }

    /**
     * @dev Check if user was referred
     * @param user Address to check
     */
    function isReferred(address user) external view returns (bool) {
        return referrals[user].referrer != address(0);
    }

    /**
     * @dev Get referrer of a user
     * @param user Address of the referred user
     */
    function getReferrer(address user) external view returns (address) {
        return referrals[user].referrer;
    }
}
