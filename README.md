# TrustCircle - Decentralized Social Lending Protocol

<p align="center">
  <img src="https://img.shields.io/badge/Solidity-0.8.24-blue" />
  <img src="https://img.shields.io/badge/License-MIT-green" />
  <img src="https://img.shields.io/badge/Tests-15%2F15%20Passing-success" />
</p>

TrustCircle is an innovative EVM-compatible decentralized lending protocol that combines **on-chain reputation NFTs**, **social trust circles**, and **dynamic interest rates** to enable uncollateralized peer-to-peer lending. Built for hackathons to win with novel DeFi mechanics.

## 🌟 Key Features

### 💎 Dynamic Reputation NFTs
- **Soulbound NFTs** that represent user creditworthiness
- Evolving metadata with on-chain SVG generation
- 5 reputation tiers: Bronze → Silver → Gold → Platinum → Diamond
- Scores from 0-1000 points based on lending behavior

### 🤝 Trust Circles
- Create or join small communities (3-15 members)
- Member vouching system increases borrowing capacity
- Collective responsibility with slashing mechanisms
- Trust score calculation across all circles

### 💰 Uncollateralized Lending
- Borrow based on reputation and social proof, not collateral
- Dynamic interest rates (3%-30%) based on reputation tier
- Flexible loan terms (7-365 days)
- Early repayment bonuses boost reputation

### 🎮 Gamification Layer
- Achievement NFTs with 9 different badges
- Reputation bonuses for unlocking achievements
- Progress tracking and milestone rewards

### 📈 Referral System
- Invite friends and earn reputation bonuses
- 30 points for referrer, 20 for new user
- Milestone bonuses every 5 referrals (+50 points)

### 🔒 Emergency Withdrawals
- Timelock mechanism (7-day waiting period)
- Safer emergency fund access
- Reputation penalty for emergency use

### 💻 Premium Frontend
- **Complete Borrow Interface** - Loan amount, duration, interest preview
- **Complete Lend Interface** - Deposit/withdraw with pool statistics
- **Trust Circles Interface** - Create circles, set requirements
- **Loan Management** - View all loans, repay directly
- **Transaction Tracking** - Real-time tx notifications with Etherscan links
- **Enhanced Hero** - Feature showcase for new users

## 🏗️ Architecture

### Smart Contracts

- **ReputationNFT.sol** - Soulbound NFT with dynamic metadata and reputation scoring
- **TrustCircle.sol** - Circle creation, member management, and vouching system
- **LendingPool.sol** - Core lending/borrowing with dynamic rates
- **AchievementBadges.sol** - Gamification with achievement NFTs
- **ReferralSystem.sol** - User growth incentives with reputation bonuses
- **EmergencyWithdraw.sol** - Timelock mechanism for safer emergency withdrawals
- **LoanExtension.sol** - Request loan extensions with 5% fee
- **GovernanceToken.sol** - DAO-style voting on protocol parameters
- **Leaderboard.sol** - Track and rank top performers

### Frontend

- **React + Vite** - Modern, fast development experience
- **Ethers.js** - Web3 integration for wallet connection
- **Premium UI/UX** - Glassmorphism effects, gradient animations, responsive design

## 🚀 Quick Start

### Prerequisites

- Node.js v18+
- MetaMask or compatible Web3 wallet
- Test ETH (Sepolia or Alfajores testnet)

### Installation

```bash
# Clone the repository
git clone https://github.com/Gbangbolaoluwagbemiga/chinchin
cd chinchin

# Install dependencies
npm install

# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test

# Deploy to local network
npx hardhat node
npx hardhat run scripts/deploy.js --network localhost
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Update contract addresses in `frontend/src/App.jsx` after deployment.

## 🧪 Testing

All 15 integration tests passing:

```bash
npx hardhat test
```

Tests cover:
- ✅ Reputation NFT minting and soulbound mechanics
- ✅ Reputation score updates and tier calculation
- ✅ Trust circle creation and member management
- ✅ Vouching system and trust score calculation
- ✅ Lending pool deposits and withdrawals
- ✅ Dynamic interest rate calculation
- ✅ Loan borrowing and repayment
- ✅ Achievement unlocking and reputation bonuses
- ✅ Full user journey from mint to repayment

## 📊 Project Structure

```
chinchin/
├── contracts/              # Smart contracts
│   ├── ReputationNFT.sol
│   ├── TrustCircle.sol
│   ├── LendingPool.sol
│   └── AchievementBadges.sol
├── scripts/               # Deployment scripts
│   └── deploy.js
├── test/                  # Integration tests
│   └── Integration.test.js
├── frontend/              # React frontend
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── index.css
│   └── package.json
├── hardhat.config.js
└── package.json
```

## 🎯 Why This Wins Hackathons

1. **Novel Problem**: Addresses real financial inclusion challenges
2. **Technical Innovation**: Combines DeFi + social proof in a unique way
3. **On-Chain Everything**: All reputation and trust data verifiable on-chain
4. **Complete Solution**: Smart contracts + tests + beautiful UI
5. **Demonstrable**: Can show actual lending cycles in live demo
6. **Gamification**: Achievement system increases engagement
7. **Real Impact**: Enables lending for the unbanked/underbanked

## 💡 How It Works

1. **User mints Reputation NFT** - Starting with 100 points (Bronze tier)
2. **Joins/creates Trust Circles** - Connects with trusted community
3. **Receives vouches** - Circle members vouch to boost trust score
4. **Borrows funds** - Dynamic rate based on reputation (e.g., Diamond = 3%)
5. **Repays loan** - On-time payment boosts reputation, unlocks achievements
6. **Reputation grows** - Higher tier = better rates + higher limits

## 🔐 Security Features

- **Soulbound NFTs** prevent reputation trading
- **Access control** for reputation updates
- **Reentrancy guards** on all financial functions
- **Grace period** before loan defaults
- **Circle slashing** for defaulters affects vouchers

## 📈 Demo Scenarios

Perfect for hackathon demos:

1. **New User Journey** - Mint → Circle → Borrow → Repay
2. **Reputation Growth** - Show tier progression from Bronze to Diamond
3. **Trust Circle Impact** - Demonstrate how vouches reduce interest rates
4. **Achievement Unlocks** - Showcase gamification mechanics

## 🛠️ Tech Stack

- **Solidity 0.8.24** - Smart contract language
- **Hardhat** - Development environment
- **OpenZeppelin** - Battle-tested contract libraries
- **Ethers.js** - Web3 integration
- **React** - Frontend framework
- **Vite** - Build tool

## 📝 License

MIT

## 🙏 Acknowledgments

Built with inspiration from winning hackathon projects in DeFi, social lending, and on-chain reputation systems.

---

**Ready to revolutionize peer-to-peer lending? Deploy TrustCircle and win your hackathon! 🏆**