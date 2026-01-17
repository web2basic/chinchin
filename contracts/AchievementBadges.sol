// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./ReputationNFT.sol";

/**
 * @title AchievementBadges
 * @dev Gamification layer with achievement NFTs that provide reputation bonuses
 */
contract AchievementBadges is ERC721, Ownable {
    ReputationNFT public reputationNFT;

    enum AchievementType {
        FirstLoan,           // First loan taken
        FirstRepayment,      // First loan fully repaid
        PerfectPayback,      // Repaid early
        TenXBorrower,        // Completed 10 loans
        CircleBuilder,       // Created a trust circle
        TrustedMember,       // Received 5 vouches
        DiamondTier,         // Reached Diamond tier
        Lender,              // Deposited liquidity
        BigLender            // Deposited over 1 ETH
    }

    struct Achievement {
        string name;
        string description;
        uint256 reputationBonus;
        string imageURI;
    }

    // Token ID counter
    uint256 private _tokenIdCounter;

    // Achievement definitions
    mapping(AchievementType => Achievement) public achievements;

    // Track unlocked achievements per user
    mapping(address => mapping(AchievementType => bool)) public hasAchievement;
    mapping(address => mapping(AchievementType => uint256)) public achievementTokenId;

    // Authorized contracts
    mapping(address => bool) public authorizedUnlockers;

    // Events
    event AchievementUnlocked(address indexed user, AchievementType indexed achievementType, uint256 tokenId);

    constructor(address _reputationNFT) ERC721("TrustCircle Achievements", "ACHIEVE") Ownable(msg.sender) {
        reputationNFT = ReputationNFT(_reputationNFT);
        _tokenIdCounter = 1;
        _initializeAchievements();
    }

    /**
     * @dev Initialize achievement definitions
     */
    function _initializeAchievements() internal {
        achievements[AchievementType.FirstLoan] = Achievement({
            name: "First Steps",
            description: "Took your first loan",
            reputationBonus: 20,
            imageURI: "ipfs://QmFirstLoan"
        });

        achievements[AchievementType.FirstRepayment] = Achievement({
            name: "Trustworthy",
            description: "Repaid your first loan",
            reputationBonus: 30,
            imageURI: "ipfs://QmFirstRepayment"
        });

        achievements[AchievementType.PerfectPayback] = Achievement({
            name: "Early Bird",
            description: "Repaid a loan early",
            reputationBonus: 40,
            imageURI: "ipfs://QmPerfectPayback"
        });

        achievements[AchievementType.TenXBorrower] = Achievement({
            name: "Veteran Borrower",
            description: "Completed 10 loans successfully",
            reputationBonus: 100,
            imageURI: "ipfs://QmTenXBorrower"
        });

        achievements[AchievementType.CircleBuilder] = Achievement({
            name: "Circle Builder",
            description: "Created a trust circle",
            reputationBonus: 50,
            imageURI: "ipfs://QmCircleBuilder"
        });

        achievements[AchievementType.TrustedMember] = Achievement({
            name: "Community Trusted",
            description: "Received 5 vouches from circle members",
            reputationBonus: 60,
            imageURI: "ipfs://QmTrustedMember"
        });

        achievements[AchievementType.DiamondTier] = Achievement({
            name: "Diamond Elite",
            description: "Reached Diamond reputation tier",
            reputationBonus: 150,
            imageURI: "ipfs://QmDiamondTier"
        });

        achievements[AchievementType.Lender] = Achievement({
            name: "Supporter",
            description: "Provided liquidity to the pool",
            reputationBonus: 25,
            imageURI: "ipfs://QmLender"
        });

        achievements[AchievementType.BigLender] = Achievement({
            name: "Whale",
            description: "Deposited over 1 ETH",
            reputationBonus: 75,
            imageURI: "ipfs://QmBigLender"
        });
    }

    /**
     * @dev Unlock an achievement for a user
     * @param user Address of the user
     * @param achievementType Type of achievement
     */
    function unlockAchievement(address user, AchievementType achievementType) external {
        require(authorizedUnlockers[msg.sender] || msg.sender == owner(), "Not authorized");
        require(!hasAchievement[user][achievementType], "Achievement already unlocked");

        uint256 tokenId = _tokenIdCounter++;
        _safeMint(user, tokenId);

        hasAchievement[user][achievementType] = true;
        achievementTokenId[user][achievementType] = tokenId;

        // Award reputation bonus
        Achievement memory achievement = achievements[achievementType];
        reputationNFT.updateReputation(user, int256(achievement.reputationBonus));

        emit AchievementUnlocked(user, achievementType, tokenId);
    }

    /**
     * @dev Set authorized contract
     * @param unlocker Address of the contract
     * @param authorized Authorization status
     */
    function setAuthorizedUnlocker(address unlocker, bool authorized) external onlyOwner {
        authorizedUnlockers[unlocker] = authorized;
    }

    /**
     * @dev Check if user has specific achievement
     * @param user Address of the user
     * @param achievementType Type of achievement
     */
    function checkAchievement(address user, AchievementType achievementType) external view returns (bool) {
        return hasAchievement[user][achievementType];
    }

    /**
     * @dev Get all unlocked achievements for a user
     * @param user Address of the user
     */
    function getUserAchievements(address user) external view returns (AchievementType[] memory) {
        uint256 count = 0;
        
        // Count unlocked achievements
        for (uint256 i = 0; i < 9; i++) {
            if (hasAchievement[user][AchievementType(i)]) {
                count++;
            }
        }
        
        // Build array
        AchievementType[] memory userAchievements = new AchievementType[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < 9; i++) {
            if (hasAchievement[user][AchievementType(i)]) {
                userAchievements[index] = AchievementType(i);
                index++;
            }
        }
        
        return userAchievements;
    }

    /**
     * @dev Get token URI for achievement badge
     * @param tokenId Token ID
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        
        // Find achievement type for this token
        address owner = ownerOf(tokenId);
        AchievementType achievementType;
        
        for (uint256 i = 0; i < 9; i++) {
            if (achievementTokenId[owner][AchievementType(i)] == tokenId) {
                achievementType = AchievementType(i);
                break;
            }
        }
        
        Achievement memory achievement = achievements[achievementType];
        
        return string(abi.encodePacked(
            "data:application/json;base64,",
            Base64.encode(bytes(string(abi.encodePacked(
                '{"name":"', achievement.name, '",',
                '"description":"', achievement.description, '",',
                '"image":"', achievement.imageURI, '",',
                '"attributes":[',
                '{"trait_type":"Reputation Bonus","value":', uint256(achievement.reputationBonus), '}',
                ']}'
            ))))
        ));
    }
}
