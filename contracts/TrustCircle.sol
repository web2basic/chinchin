// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./ReputationNFT.sol";

/**
 * @title TrustCircle
 * @dev Manages trust circles where users vouch for each other to increase lending capacity
 */
contract TrustCircle {
    ReputationNFT public reputationNFT;

    struct Circle {
        string name;
        address creator;
        uint256 minReputation;      // Minimum reputation to join
        uint256 createdAt;
        bool active;
        address[] members;
        mapping(address => bool) isMember;
        mapping(address => address[]) vouches; // who vouched for whom
        mapping(address => bool) invitations;  // pending invitations
    }

    // Circle ID counter
    uint256 private _circleIdCounter;

    // Mapping from circle ID to circle data
    mapping(uint256 => Circle) public circles;

    // Mapping from user to their circles
    mapping(address => uint256[]) public userCircles;

    // Constants
    uint256 public constant MAX_MEMBERS = 15;
    uint256 public constant MIN_MEMBERS = 3;
    uint256 public constant VOUCHES_REQUIRED = 2; // Members need 2 vouches to be fully verified

    // Events
    event CircleCreated(uint256 indexed circleId, address indexed creator, string name, uint256 minReputation);
    event MemberInvited(uint256 indexed circleId, address indexed member);
    event MemberJoined(uint256 indexed circleId, address indexed member);
    event MemberVouched(uint256 indexed circleId, address indexed voucher, address indexed member);
    event CircleSlashed(uint256 indexed circleId, address indexed defaulter, uint256 affectedMembers);

    constructor(address _reputationNFT) {
        reputationNFT = ReputationNFT(_reputationNFT);
        _circleIdCounter = 1;
    }

    /**
     * @dev Create a new trust circle
     * @param name Name of the circle
     * @param minReputation Minimum reputation score required to join
     */
    function createCircle(string memory name, uint256 minReputation) external returns (uint256) {
        require(bytes(name).length > 0 && bytes(name).length <= 50, "Invalid circle name");
        require(minReputation <= 1000, "Invalid minimum reputation");
        
        uint256 userReputation = reputationNFT.getReputationScore(msg.sender);
        require(userReputation >= 200, "Insufficient reputation to create circle");

        uint256 circleId = _circleIdCounter++;
        Circle storage circle = circles[circleId];
        
        circle.name = name;
        circle.creator = msg.sender;
        circle.minReputation = minReputation;
        circle.createdAt = block.timestamp;
        circle.active = true;
        circle.members.push(msg.sender);
        circle.isMember[msg.sender] = true;
        
        userCircles[msg.sender].push(circleId);

        emit CircleCreated(circleId, msg.sender, name, minReputation);
        return circleId;
    }

    /**
     * @dev Invite a member to the circle
     * @param circleId ID of the circle
     * @param member Address to invite
     */
    function inviteMember(uint256 circleId, address member) external {
        Circle storage circle = circles[circleId];
        require(circle.active, "Circle is not active");
        require(circle.isMember[msg.sender], "Only members can invite");
        require(!circle.isMember[member], "Already a member");
        require(!circle.invitations[member], "Already invited");
        require(circle.members.length < MAX_MEMBERS, "Circle is full");
        
        uint256 memberReputation = reputationNFT.getReputationScore(member);
        require(memberReputation >= circle.minReputation, "Member reputation too low");

        circle.invitations[member] = true;
        emit MemberInvited(circleId, member);
    }

    /**
     * @dev Accept invitation and join a circle
     * @param circleId ID of the circle
     */
    function acceptInvitation(uint256 circleId) external {
        Circle storage circle = circles[circleId];
        require(circle.active, "Circle is not active");
        require(circle.invitations[msg.sender], "No invitation found");
        require(!circle.isMember[msg.sender], "Already a member");
        
        circle.members.push(msg.sender);
        circle.isMember[msg.sender] = true;
        circle.invitations[msg.sender] = false;
        
        userCircles[msg.sender].push(circleId);

        emit MemberJoined(circleId, msg.sender);
        
        // Bonus reputation for joining circle
        reputationNFT.updateReputation(msg.sender, 10);
    }

    /**
     * @dev Vouch for a circle member
     * @param circleId ID of the circle
     * @param member Member to vouch for
     */
    function vouchForMember(uint256 circleId, address member) external {
        Circle storage circle = circles[circleId];
        require(circle.active, "Circle is not active");
        require(circle.isMember[msg.sender], "Not a member");
        require(circle.isMember[member], "Target is not a member");
        require(msg.sender != member, "Cannot vouch for yourself");
        
        // Check if already vouched
        address[] storage vouchers = circle.vouches[member];
        for (uint256 i = 0; i < vouchers.length; i++) {
            require(vouchers[i] != msg.sender, "Already vouched");
        }
        
        vouchers.push(msg.sender);
        emit MemberVouched(circleId, msg.sender, member);
        
        // Bonus reputation for receiving vouch
        if (vouchers.length >= VOUCHES_REQUIRED) {
            reputationNFT.updateReputation(member, 20);
        }
    }

    /**
     * @dev Slash circle reputation when a member defaults
     * @param circleId ID of the circle
     * @param defaulter Address of the defaulting member
     */
    function slashCircle(uint256 circleId, address defaulter) external {
        // Only lending pool contract can call this
        require(msg.sender == address(reputationNFT.owner()), "Only authorized contracts");
        
        Circle storage circle = circles[circleId];
        require(circle.isMember[defaulter], "Not a circle member");
        
        // Slash the defaulter heavily
        reputationNFT.updateReputation(defaulter, -150);
        
        // Slash vouchers moderately
        address[] storage vouchers = circle.vouches[defaulter];
        for (uint256 i = 0; i < vouchers.length; i++) {
            reputationNFT.updateReputation(vouchers[i], -30);
        }
        
        emit CircleSlashed(circleId, defaulter, vouchers.length);
    }

    /**
     * @dev Get circle members
     * @param circleId ID of the circle
     */
    function getCircleMembers(uint256 circleId) external view returns (address[] memory) {
        return circles[circleId].members;
    }

    /**
     * @dev Get vouches for a member in a circle
     * @param circleId ID of the circle
     * @param member Member address
     */
    function getVouches(uint256 circleId, address member) external view returns (address[] memory) {
        return circles[circleId].vouches[member];
    }

    /**
     * @dev Get user's circles
     * @param user User address
     */
    function getUserCircles(address user) external view returns (uint256[] memory) {
        return userCircles[user];
    }

    /**
     * @dev Check if user is member of circle
     * @param circleId ID of the circle
     * @param user User address
     */
    function isMember(uint256 circleId, address user) external view returns (bool) {
        return circles[circleId].isMember[user];
    }

    /**
     * @dev Get total trust score for a user across all circles
     * @param user User address
     */
    function getTrustScore(address user) external view returns (uint256) {
        uint256[] memory userCircleIds = userCircles[user];
        uint256 totalScore = 0;
        
        for (uint256 i = 0; i < userCircleIds.length; i++) {
            Circle storage circle = circles[userCircleIds[i]];
            if (circle.active) {
                // Base points for being in a circle
                totalScore += 50;
                
                // Additional points for vouches
                uint256 vouchCount = circle.vouches[user].length;
                totalScore += vouchCount * 25;
                
                // Bonus for established circles (older than 30 days)
                if (block.timestamp - circle.createdAt > 30 days) {
                    totalScore += 30;
                }
            }
        }
        
        return totalScore;
    }
}
