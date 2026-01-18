// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title GovernanceToken
 * @dev Simple governance for protocol parameter changes
 */
contract GovernanceToken is Ownable {
    struct Proposal {
        uint256 id;
        string description;
        address proposer;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 startTime;
        uint256 endTime;
        bool executed;
        ProposalType proposalType;
        uint256 newValue;
    }

    enum ProposalType {
        ChangeInterestRate,
        ChangeMinReputation,
        ChangeLoanDuration,
        ChangeExtensionFee
    }

    // Proposal storage
    mapping(uint256 => Proposal) public proposals;
    uint256 public proposalCount;

    // Voting records
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(uint256 => mapping(address => bool)) public votes; // true = for, false = against

    // Voting power based on reputation (simplified)
    mapping(address => uint256) public votingPower;

    // Constants
    uint256 public constant VOTING_PERIOD = 3 days;
    uint256 public constant QUORUM = 100; // Minimum votes needed

    // Events
    event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string description);
    event VoteCast(uint256 indexed proposalId, address indexed voter, bool support, uint256 weight);
    event ProposalExecuted(uint256 indexed proposalId, bool passed);

    constructor() Ownable(msg.sender) {
        proposalCount = 0;
    }

    /**
     * @dev Set voting power for user (called by ReputationNFT)
     * @param user Address of the user
     * @param power Voting power amount
     */
    function setVotingPower(address user, uint256 power) external onlyOwner {
        votingPower[user] = power;
    }

    /**
     * @dev Create a new proposal
     * @param description Proposal description
     * @param proposalType Type of proposal
     * @param newValue New value to set
     */
    function createProposal(
        string memory description,
        ProposalType proposalType,
        uint256 newValue
    ) external returns (uint256) {
        require(votingPower[msg.sender] > 0, "No voting power");
        
        uint256 proposalId = proposalCount++;
        
        proposals[proposalId] = Proposal({
            id: proposalId,
            description: description,
            proposer: msg.sender,
            forVotes: 0,
            againstVotes: 0,
            startTime: block.timestamp,
            endTime: block.timestamp + VOTING_PERIOD,
            executed: false,
            proposalType: proposalType,
            newValue: newValue
        });

        emit ProposalCreated(proposalId, msg.sender, description);
        return proposalId;
    }

    /**
     * @dev Cast vote on proposal
     * @param proposalId ID of the proposal
     * @param support True for yes, false for no
     */
    function castVote(uint256 proposalId, bool support) external {
        Proposal storage proposal = proposals[proposalId];
        require(block.timestamp < proposal.endTime, "Voting ended");
        require(!hasVoted[proposalId][msg.sender], "Already voted");
        require(votingPower[msg.sender] > 0, "No voting power");

        uint256 weight = votingPower[msg.sender];
        hasVoted[proposalId][msg.sender] = true;
        votes[proposalId][msg.sender] = support;

        if (support) {
            proposal.forVotes += weight;
        } else {
            proposal.againstVotes += weight;
        }

        emit VoteCast(proposalId, msg.sender, support, weight);
    }

    /**
     * @dev Execute proposal after voting ends
     * @param proposalId ID of the proposal
     */
    function executeProposal(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        require(block.timestamp >= proposal.endTime, "Voting not ended");
        require(!proposal.executed, "Already executed");

        proposal.executed = true;

        bool passed = proposal.forVotes > proposal.againstVotes && 
                     (proposal.forVotes + proposal.againstVotes) >= QUORUM;

        emit ProposalExecuted(proposalId, passed);

        // Note: Actual execution would update relevant contracts
    }

    /**
     * @dev Get proposal details
     * @param proposalId ID of the proposal
     */
    function getProposal(uint256 proposalId) external view returns (Proposal memory) {
        return proposals[proposalId];
    }

    /**
     * @dev Check if user has voted
     * @param proposalId ID of the proposal
     * @param user Address to check
     */
    function hasUserVoted(uint256 proposalId, address user) external view returns (bool) {
        return hasVoted[proposalId][user];
    }

    /**
     * @dev Get active proposals
     */
    function getActiveProposals() external view returns (uint256[] memory) {
        uint256 activeCount = 0;
        
        // Count active proposals
        for (uint256 i = 0; i < proposalCount; i++) {
            if (block.timestamp < proposals[i].endTime && !proposals[i].executed) {
                activeCount++;
            }
        }

        // Build array
        uint256[] memory activeProposals = new uint256[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < proposalCount; i++) {
            if (block.timestamp < proposals[i].endTime && !proposals[i].executed) {
                activeProposals[index] = i;
                index++;
            }
        }

        return activeProposals;
    }
}
