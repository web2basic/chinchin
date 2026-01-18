// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./ReputationNFT.sol";
import "./LendingPool.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title LoanExtension
 * @dev Allow borrowers to request loan extensions with fees
 */
contract LoanExtension is Ownable {
    ReputationNFT public reputationNFT;
    LendingPool public lendingPool;

    struct Extension {
        uint256 loanId;
        uint256 newDuration;
        uint256 extensionFee;
        uint256 requestTime;
        bool approved;
        bool executed;
    }

    // Mapping from loan ID to extension request
    mapping(uint256 => Extension) public extensions;

    // Extension fee percentage (5%)
    uint256 public constant EXTENSION_FEE_PERCENT = 5;

    // Small reputation penalty for requesting extension
    uint256 public constant EXTENSION_PENALTY = 10;

    // Events
    event ExtensionRequested(uint256 indexed loanId, uint256 newDuration, uint256 fee);
    event ExtensionApproved(uint256 indexed loanId, address indexed borrower);
    event ExtensionExecuted(uint256 indexed loanId, uint256 newEndTime);

    constructor(address _reputationNFT, address _lendingPool) Ownable(msg.sender) {
        reputationNFT = ReputationNFT(_reputationNFT);
        lendingPool = LendingPool(_lendingPool);
    }

    /**
     * @dev Request loan extension
     * @param loanId ID of the loan
     * @param additionalDays Days to extend
     */
    function requestExtension(uint256 loanId, uint256 additionalDays) external payable {
        require(additionalDays >= 7 && additionalDays <= 90, "Invalid extension period");
        require(extensions[loanId].requestTime == 0, "Extension already requested");

        // Get loan details
        LendingPool.Loan memory loan = lendingPool.getLoan(loanId);
        require(loan.borrower == msg.sender, "Not the borrower");
        require(loan.active, "Loan not active");

        // Calculate extension fee (5% of remaining amount)
        uint256 extensionFee = (loan.amount * EXTENSION_FEE_PERCENT) / 100;
        require(msg.value >= extensionFee, "Insufficient extension fee");

        extensions[loanId] = Extension({
            loanId: loanId,
            newDuration: additionalDays * 1 days,
            extensionFee: extensionFee,
            requestTime: block.timestamp,
            approved: true, // Auto-approve if fee paid
            executed: false
        });

        // Small reputation penalty
        reputationNFT.updateReputation(msg.sender, -int256(EXTENSION_PENALTY));

        emit ExtensionRequested(loanId, additionalDays, extensionFee);
        emit ExtensionApproved(loanId, msg.sender);

        // Refund excess
        if (msg.value > extensionFee) {
            (bool success, ) = msg.sender.call{value: msg.value - extensionFee}("");
            require(success, "Refund failed");
        }
    }

    /**
     * @dev Check if loan has approved extension
     * @param loanId ID of the loan
     */
    function hasExtension(uint256 loanId) external view returns (bool) {
        return extensions[loanId].approved && !extensions[loanId].executed;
    }

    /**
     * @dev Get extension details
     * @param loanId ID of the loan
     */
    function getExtension(uint256 loanId) external view returns (Extension memory) {
        return extensions[loanId];
    }

    /**
     * @dev Withdraw collected fees (owner only)
     */
    function withdrawFees() external onlyOwner {
        (bool success, ) = owner().call{value: address(this).balance}("");
        require(success, "Withdrawal failed");
    }
}
