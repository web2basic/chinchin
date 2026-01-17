// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

/**
 * @title ReputationNFT
 * @dev Dynamic, soulbound NFT representing user reputation in TrustCircle
 * Reputation evolves based on lending behavior and cannot be transferred
 */
contract ReputationNFT is ERC721, Ownable {
    using Strings for uint256;

    // Reputation tiers
    enum Tier {
        Bronze,    // 0-199 points
        Silver,    // 200-499 points
        Gold,      // 500-799 points
        Platinum,  // 800-949 points
        Diamond    // 950-1000 points
    }

    struct ReputationData {
        uint256 score;           // Current reputation score (0-1000)
        uint256 loansCompleted;  // Number of loans successfully repaid
        uint256 totalBorrowed;   // Total amount borrowed (in wei)
        uint256 totalRepaid;     // Total amount repaid (in wei)
        uint256 lastUpdated;     // Timestamp of last reputation update
        Tier currentTier;        // Current reputation tier
    }

    // Token ID counter
    uint256 private _tokenIdCounter;

    // Mapping from user address to token ID
    mapping(address => uint256) public userToTokenId;

    // Mapping from token ID to reputation data
    mapping(uint256 => ReputationData) public reputationData;

    // Authorized contracts that can update reputation
    mapping(address => bool) public authorizedUpdaters;

    // Events
    event ReputationMinted(address indexed user, uint256 indexed tokenId);
    event ReputationUpdated(uint256 indexed tokenId, int256 delta, uint256 newScore, Tier newTier);
    event AuthorizedUpdaterSet(address indexed updater, bool authorized);

    constructor() ERC721("TrustCircle Reputation", "TRUST") Ownable(msg.sender) {
        _tokenIdCounter = 1; // Start token IDs at 1
    }

    /**
     * @dev Mint a new reputation NFT to a user
     * @param user Address to mint the NFT to
     */
    function mint(address user) external onlyOwner returns (uint256) {
        require(userToTokenId[user] == 0, "User already has reputation NFT");
        
        uint256 tokenId = _tokenIdCounter++;
        _safeMint(user, tokenId);
        
        userToTokenId[user] = tokenId;
        reputationData[tokenId] = ReputationData({
            score: 100, // Start with base score
            loansCompleted: 0,
            totalBorrowed: 0,
            totalRepaid: 0,
            lastUpdated: block.timestamp,
            currentTier: Tier.Bronze
        });

        emit ReputationMinted(user, tokenId);
        return tokenId;
    }

    /**
     * @dev Update user's reputation score
     * @param user Address of the user
     * @param delta Change in reputation (can be negative)
     */
    function updateReputation(address user, int256 delta) external {
        require(authorizedUpdaters[msg.sender], "Not authorized to update reputation");
        
        uint256 tokenId = userToTokenId[user];
        require(tokenId != 0, "User has no reputation NFT");
        
        ReputationData storage data = reputationData[tokenId];
        
        // Calculate new score with bounds checking
        int256 newScore = int256(data.score) + delta;
        if (newScore < 0) newScore = 0;
        if (newScore > 1000) newScore = 1000;
        
        data.score = uint256(newScore);
        data.lastUpdated = block.timestamp;
        data.currentTier = _getTier(data.score);

        emit ReputationUpdated(tokenId, delta, data.score, data.currentTier);
    }

    /**
     * @dev Record a completed loan
     * @param user Address of the borrower
     * @param amount Amount borrowed
     * @param repaid Amount repaid
     */
    function recordLoan(address user, uint256 amount, uint256 repaid) external {
        require(authorizedUpdaters[msg.sender], "Not authorized");
        
        uint256 tokenId = userToTokenId[user];
        require(tokenId != 0, "User has no reputation NFT");
        
        ReputationData storage data = reputationData[tokenId];
        data.loansCompleted++;
        data.totalBorrowed += amount;
        data.totalRepaid += repaid;
        data.lastUpdated = block.timestamp;
    }

    /**
     * @dev Set authorized contract that can update reputation
     * @param updater Address of the contract
     * @param authorized Whether the contract is authorized
     */
    function setAuthorizedUpdater(address updater, bool authorized) external onlyOwner {
        authorizedUpdaters[updater] = authorized;
        emit AuthorizedUpdaterSet(updater, authorized);
    }

    /**
     * @dev Get reputation score for a user
     * @param user Address of the user
     */
    function getReputationScore(address user) external view returns (uint256) {
        uint256 tokenId = userToTokenId[user];
        if (tokenId == 0) return 0;
        return reputationData[tokenId].score;
    }

    /**
     * @dev Get full reputation data for a user
     * @param user Address of the user
     */
    function getReputationData(address user) external view returns (ReputationData memory) {
        uint256 tokenId = userToTokenId[user];
        require(tokenId != 0, "User has no reputation NFT");
        return reputationData[tokenId];
    }

    /**
     * @dev Get tier based on score
     * @param score Reputation score
     */
    function _getTier(uint256 score) internal pure returns (Tier) {
        if (score >= 950) return Tier.Diamond;
        if (score >= 800) return Tier.Platinum;
        if (score >= 500) return Tier.Gold;
        if (score >= 200) return Tier.Silver;
        return Tier.Bronze;
    }

    /**
     * @dev Generate SVG for reputation NFT
     * @param tokenId Token ID
     */
    function _generateSVG(uint256 tokenId) internal view returns (string memory) {
        ReputationData memory data = reputationData[tokenId];
        
        string[5] memory tierColors = [
            "#CD7F32", // Bronze
            "#C0C0C0", // Silver
            "#FFD700", // Gold
            "#E5E4E2", // Platinum
            "#B9F2FF"  // Diamond
        ];
        
        string[5] memory tierNames = ["Bronze", "Silver", "Gold", "Platinum", "Diamond"];
        
        return string(abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600">',
            '<defs>',
            '<linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">',
            '<stop offset="0%" style="stop-color:#1a1a2e"/>',
            '<stop offset="100%" style="stop-color:#16213e"/>',
            '</linearGradient>',
            '</defs>',
            '<rect width="400" height="600" fill="url(#bg)"/>',
            '<circle cx="200" cy="200" r="80" fill="', tierColors[uint256(data.currentTier)], '" opacity="0.3"/>',
            '<circle cx="200" cy="200" r="60" fill="', tierColors[uint256(data.currentTier)], '"/>',
            '<text x="200" y="210" font-family="Arial" font-size="24" fill="white" text-anchor="middle" font-weight="bold">',
            data.score.toString(),
            '</text>',
            '<text x="200" y="320" font-family="Arial" font-size="32" fill="white" text-anchor="middle" font-weight="bold">',
            tierNames[uint256(data.currentTier)],
            '</text>',
            '<text x="200" y="380" font-family="Arial" font-size="18" fill="#aaa" text-anchor="middle">',
            'Loans Completed: ', data.loansCompleted.toString(),
            '</text>',
            '<text x="200" y="420" font-family="Arial" font-size="18" fill="#aaa" text-anchor="middle">',
            'TrustCircle Member',
            '</text>',
            '</svg>'
        ));
    }

    /**
     * @dev Generate token URI with dynamic metadata
     * @param tokenId Token ID
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        
        ReputationData memory data = reputationData[tokenId];
        string[5] memory tierNames = ["Bronze", "Silver", "Gold", "Platinum", "Diamond"];
        
        string memory svg = _generateSVG(tokenId);
        string memory json = Base64.encode(
            bytes(
                string(
                    abi.encodePacked(
                        '{"name": "TrustCircle Reputation #', tokenId.toString(), '",',
                        '"description": "Dynamic reputation NFT for TrustCircle lending protocol",',
                        '"image": "data:image/svg+xml;base64,', Base64.encode(bytes(svg)), '",',
                        '"attributes": [',
                        '{"trait_type": "Reputation Score", "value": ', data.score.toString(), '},',
                        '{"trait_type": "Tier", "value": "', tierNames[uint256(data.currentTier)], '"},',
                        '{"trait_type": "Loans Completed", "value": ', data.loansCompleted.toString(), '},',
                        '{"trait_type": "Total Borrowed", "value": ', (data.totalBorrowed / 1e18).toString(), '},',
                        '{"trait_type": "Total Repaid", "value": ', (data.totalRepaid / 1e18).toString(), '}',
                        ']}'
                    )
                )
            )
        );
        
        return string(abi.encodePacked("data:application/json;base64,", json));
    }

    /**
     * @dev Override transfer functions to make NFT soulbound (non-transferable)
     */
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        
        // Allow minting (from == address(0)) but not transfers
        if (from != address(0) && to != address(0)) {
            revert("Reputation NFTs are soulbound and cannot be transferred");
        }
        
        return super._update(to, tokenId, auth);
    }
}
