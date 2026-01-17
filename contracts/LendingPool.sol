// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./ReputationNFT.sol";
import "./TrustCircle.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title LendingPool
 * @dev Core lending and borrowing functionality with reputation-based rates
 */
contract LendingPool is Ownable, ReentrancyGuard {
    ReputationNFT public reputationNFT;
    TrustCircle public trustCircle;

    struct Loan {
        address borrower;
        uint256 amount;
        uint256 interestRate;      // Annual rate in basis points (e.g., 500 = 5%)
        uint256 startTime;
        uint256 duration;          // Loan duration in seconds
        uint256 amountRepaid;
        bool active;
        bool defaulted;
    }

    struct LenderInfo {
        uint256 deposited;
        uint256 earned;
        uint256 lastDepositTime;
    }

    // Loan ID counter
    uint256 private _loanIdCounter;

    // Mapping from loan ID to loan data
    mapping(uint256 => Loan) public loans;

    // Mapping from borrower to their loan IDs
    mapping(address => uint256[]) public borrowerLoans;

    // Mapping from lender to their info
    mapping(address => LenderInfo) public lenders;

    // Total liquidity in the pool
    uint256 public totalLiquidity;

    // Total amount currently borrowed
    uint256 public totalBorrowed;

    // Constants
    uint256 public constant BASE_RATE = 1000;        // 10% base rate (in basis points)
    uint256 public constant MIN_RATE = 300;          // 3% minimum rate
    uint256 public constant MAX_RATE = 3000;         // 30% maximum rate
    uint256 public constant GRACE_PERIOD = 7 days;   // Grace period before default
    uint256 public constant MIN_LOAN = 0.01 ether;   // Minimum loan amount
    uint256 public constant MAX_LOAN = 10 ether;     // Maximum single loan
    
    // Events
    event Deposited(address indexed lender, uint256 amount);
    event Withdrawn(address indexed lender, uint256 amount);
    event LoanRequested(uint256 indexed loanId, address indexed borrower, uint256 amount, uint256 rate);
    event LoanRepaid(uint256 indexed loanId, address indexed borrower, uint256 amount, bool early);
    event LoanDefaulted(uint256 indexed loanId, address indexed borrower, uint256 amountOwed);

    constructor(address _reputationNFT, address _trustCircle) Ownable(msg.sender) {
        reputationNFT = ReputationNFT(_reputationNFT);
        trustCircle = TrustCircle(_trustCircle);
        _loanIdCounter = 1;
    }

    /**
     * @dev Deposit liquidity to the pool
     */
    function deposit() external payable nonReentrant {
        require(msg.value > 0, "Must deposit some ETH");
        
        LenderInfo storage lender = lenders[msg.sender];
        lender.deposited += msg.value;
        lender.lastDepositTime = block.timestamp;
        totalLiquidity += msg.value;

        emit Deposited(msg.sender, msg.value);
    }

    /**
     * @dev Withdraw liquidity from the pool
     * @param amount Amount to withdraw
     */
    function withdraw(uint256 amount) external nonReentrant {
        LenderInfo storage lender = lenders[msg.sender];
        require(lender.deposited >= amount, "Insufficient deposited balance");
        require(totalLiquidity >= totalBorrowed + amount, "Insufficient pool liquidity");
        
        lender.deposited -= amount;
        totalLiquidity -= amount;
        
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");

        emit Withdrawn(msg.sender, amount);
    }

    /**
     * @dev Request a loan
     * @param amount Amount to borrow
     * @param duration Loan duration in days
     */
    function borrow(uint256 amount, uint256 duration) external nonReentrant returns (uint256) {
        require(amount >= MIN_LOAN && amount <= MAX_LOAN, "Invalid loan amount");
        require(duration >= 7 && duration <= 365, "Invalid duration (7-365 days)");
        require(totalLiquidity - totalBorrowed >= amount, "Insufficient pool liquidity");
        
        // Check reputation
        uint256 reputation = reputationNFT.getReputationScore(msg.sender);
        require(reputation > 0, "No reputation NFT");
        
        // Calculate borrowing limit based on reputation and trust score
        uint256 borrowingLimit = _calculateBorrowingLimit(msg.sender, reputation);
        require(amount <= borrowingLimit, "Amount exceeds borrowing limit");
        
        // Calculate interest rate based on reputation
        uint256 interestRate = _calculateInterestRate(msg.sender, reputation);
        
        uint256 loanId = _loanIdCounter++;
        loans[loanId] = Loan({
            borrower: msg.sender,
            amount: amount,
            interestRate: interestRate,
            startTime: block.timestamp,
            duration: duration * 1 days,
            amountRepaid: 0,
            active: true,
            defaulted: false
        });
        
        borrowerLoans[msg.sender].push(loanId);
        totalBorrowed += amount;
        
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");

        emit LoanRequested(loanId, msg.sender, amount, interestRate);
        
        // Small reputation boost for taking responsible loan
        if (amount <= borrowingLimit / 2) {
            reputationNFT.updateReputation(msg.sender, 5);
        }
        
        return loanId;
    }

    /**
     * @dev Repay a loan (full or partial)
     * @param loanId ID of the loan to repay
     */
    function repay(uint256 loanId) external payable nonReentrant {
        Loan storage loan = loans[loanId];
        require(loan.active, "Loan is not active");
        require(msg.sender == loan.borrower, "Not the borrower");
        require(msg.value > 0, "Must send some ETH");
        
        uint256 totalOwed = _calculateTotalOwed(loanId);
        uint256 payment = msg.value;
        
        // Cap payment at total owed
        if (payment > totalOwed - loan.amountRepaid) {
            payment = totalOwed - loan.amountRepaid;
        }
        
        loan.amountRepaid += payment;
        totalBorrowed -= payment > loan.amount ? loan.amount : payment;
        
        // Check if loan is fully repaid
        bool fullyRepaid = loan.amountRepaid >= totalOwed;
        bool earlyRepayment = fullyRepaid && block.timestamp < loan.startTime + loan.duration;
        
        if (fullyRepaid) {
            loan.active = false;
            
            // Record successful loan completion
            reputationNFT.recordLoan(msg.sender, loan.amount, loan.amountRepaid);
            
            // Reputation boost for repayment
            int256 reputationBonus = 30;
            if (earlyRepayment) {
                reputationBonus = 50; // Extra bonus for early repayment
            }
            reputationNFT.updateReputation(msg.sender, reputationBonus);
            
            emit LoanRepaid(loanId, msg.sender, loan.amountRepaid, earlyRepayment);
        }
        
        // Return excess payment
        if (msg.value > payment) {
            (bool success, ) = msg.sender.call{value: msg.value - payment}("");
            require(success, "Refund failed");
        }
    }

    /**
     * @dev Mark a loan as defaulted (can be called by anyone after grace period)
     * @param loanId ID of the loan
     */
    function markDefaulted(uint256 loanId) external {
        Loan storage loan = loans[loanId];
        require(loan.active, "Loan is not active");
        require(!loan.defaulted, "Already marked as defaulted");
        
        uint256 deadline = loan.startTime + loan.duration + GRACE_PERIOD;
        require(block.timestamp > deadline, "Grace period not over");
        
        uint256 totalOwed = _calculateTotalOwed(loanId);
        require(loan.amountRepaid < totalOwed, "Loan is repaid");
        
        loan.active = false;
        loan.defaulted = true;
        
        // Severe reputation penalty for default
        reputationNFT.updateReputation(loan.borrower, -200);
        
        // Slash trust circles
        uint256[] memory circles = trustCircle.getUserCircles(loan.borrower);
        for (uint256 i = 0; i < circles.length; i++) {
            trustCircle.slashCircle(circles[i], loan.borrower);
        }
        
        emit LoanDefaulted(loanId, loan.borrower, totalOwed - loan.amountRepaid);
    }

    /**
     * @dev Calculate interest rate based on reputation
     * @param borrower Address of the borrower
     * @param reputation Reputation score
     */
    function _calculateInterestRate(address borrower, uint256 reputation) internal view returns (uint256) {
        // Base rate adjusted by reputation
        // Higher reputation = lower rate
        uint256 rate = BASE_RATE;
        
        if (reputation >= 800) {
            rate = MIN_RATE; // Diamond/Platinum: 3%
        } else if (reputation >= 500) {
            rate = 500; // Gold: 5%
        } else if (reputation >= 200) {
            rate = 800; // Silver: 8%
        }
        
        // Trust circle discount (up to 2% reduction)
        uint256 trustScore = trustCircle.getTrustScore(borrower);
        uint256 discount = (trustScore / 100) * 20; // 0.2% per 100 trust points
        if (discount > 200) discount = 200; // Cap at 2%
        
        if (rate > discount) {
            rate -= discount;
        } else {
            rate = MIN_RATE;
        }
        
        return rate < MIN_RATE ? MIN_RATE : rate;
    }

    /**
     * @dev Calculate borrowing limit
     * @param borrower Address of the borrower
     * @param reputation Reputation score
     */
    function _calculateBorrowingLimit(address borrower, uint256 reputation) internal view returns (uint256) {
        // Base limit from reputation (0.1 ETH per 100 reputation points)
        uint256 baseLimit = (reputation * 0.001 ether) / 100 * 100;
        
        // Trust circle multiplier (up to 2x)
        uint256 trustScore = trustCircle.getTrustScore(borrower);
        uint256 multiplier = 100 + (trustScore / 10); // 1.0x to 2.0x
        if (multiplier > 200) multiplier = 200;
        
        uint256 limit = (baseLimit * multiplier) / 100;
        
        // Cap at MAX_LOAN
        return limit > MAX_LOAN ? MAX_LOAN : limit;
    }

    /**
     * @dev Calculate total amount owed for a loan
     * @param loanId ID of the loan
     */
    function _calculateTotalOwed(uint256 loanId) internal view returns (uint256) {
        Loan storage loan = loans[loanId];
        
        // Simple interest calculation
        uint256 interest = (loan.amount * loan.interestRate * loan.duration) / (365 days * 10000);
        return loan.amount + interest;
    }

    /**
     * @dev Get borrowing limit for a user
     * @param borrower Address of the borrower
     */
    function getBorrowingLimit(address borrower) external view returns (uint256) {
        uint256 reputation = reputationNFT.getReputationScore(borrower);
        if (reputation == 0) return 0;
        return _calculateBorrowingLimit(borrower, reputation);
    }

    /**
     * @dev Get interest rate for a user
     * @param borrower Address of the borrower
     */
    function getInterestRate(address borrower) external view returns (uint256) {
        uint256 reputation = reputationNFT.getReputationScore(borrower);
        if (reputation == 0) return MAX_RATE;
        return _calculateInterestRate(borrower, reputation);
    }

    /**
     * @dev Get loan details
     * @param loanId ID of the loan
     */
    function getLoan(uint256 loanId) external view returns (Loan memory) {
        return loans[loanId];
    }

    /**
     * @dev Get total owed for a loan
     * @param loanId ID of the loan
     */
    function getTotalOwed(uint256 loanId) external view returns (uint256) {
        return _calculateTotalOwed(loanId);
    }

    /**
     * @dev Get all loans for a borrower
     * @param borrower Address of the borrower
     */
    function getBorrowerLoans(address borrower) external view returns (uint256[] memory) {
        return borrowerLoans[borrower];
    }
}
