import { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import confetti from 'canvas-confetti';
import ConstellationBackground from './components/ConstellationBackground';
import './App.css';

// Contract ABIs (simplified - include essential functions)
const REPUTATION_NFT_ABI = [
  "function mint(address user) external returns (uint256)",
  "function getReputationScore(address user) external view returns (uint256)",
  "function getReputationData(address user) external view returns (tuple(uint256 score, uint256 loansCompleted, uint256 totalBorrowed, uint256 totalRepaid, uint256 lastUpdated, uint8 currentTier))",
  "function userToTokenId(address user) external view returns (uint256)"
];

const LENDING_POOL_ABI = [
  "function deposit() external payable",
  "function withdraw(uint256 amount) external",
  "function borrow(uint256 amount, uint256 duration) external returns (uint256)",
  "function repay(uint256 loanId) external payable",
  "function getBorrowingLimit(address borrower) external view returns (uint256)",
  "function getInterestRate(address borrower) external view returns (uint256)",
  "function getLoan(uint256 loanId) external view returns (tuple(address borrower, uint256 amount, uint256 interestRate, uint256 startTime, uint256 duration, uint256 amountRepaid, bool active, bool defaulted))",
  "function getBorrowerLoans(address borrower) external view returns (uint256[])",
  "function getTotalOwed(uint256 loanId) external view returns (uint256)",
  "function totalLiquidity() external view returns (uint256)",
  "function lenders(address) external view returns (tuple(uint256 deposited, uint256 earned, uint256 lastDepositTime))"
];

const TRUST_CIRCLE_ABI = [
  "function createCircle(string memory name, uint256 minReputation) external returns (uint256)",
  "function getUserCircles(address user) external view returns (uint256[])",
  "function getCircleMembers(uint256 circleId) external view returns (address[])",
  "function getTrustScore(address user) external view returns (uint256)",
  "function inviteMember(uint256 circleId, address member) external",
  "function acceptInvitation(uint256 circleId) external",
  "function vouchForMember(uint256 circleId, address member) external"
];

// --- CRAZY COMPONENTS ---

const MarketPulse = () => {
  return (
    <div className="marquee-container">
      <div className="marquee-content">
        <span className="ticker-item">🔴 LIVE: <span className="ticker-highlight">User 0x8a...2b just borrowed 5.0 ETH</span></span>
        <span className="ticker-item">💎 INFO: <span className="ticker-highlight">TrustCircle TVL reaches $1.2M</span></span>
        <span className="ticker-item">🚀 NEW: <span className="ticker-highlight">Diamond Tier unlocked by User 0x9f...11</span></span>
        <span className="ticker-item">📊 RATE: <span className="ticker-highlight">Base interest rate adjusted to 4.2%</span></span>
        <span className="ticker-item">🤝 SOCIAL: <span className="ticker-highlight">New Trust Circle "DeFi Whales" created</span></span>
        <span className="ticker-item">🔴 LIVE: <span className="ticker-highlight">User 0x3c...9d repaid loan early (+50 Rep)</span></span>
      </div>
    </div>
  );
};

const HolographicCard = ({ children }) => {
  const [transform, setTransform] = useState('');

  const handleMouseMove = (e) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Calculate rotation based on mouse position
    const rotateX = ((y - centerY) / centerY) * -10; // Max 10deg tilt
    const rotateY = ((x - centerX) / centerX) * 10;

    setTransform(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`);
  };

  const handleMouseLeave = () => {
    setTransform('');
  };

  return (
    <div className="holographic-container">
      <div
        className="holographic-card-wrapper"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ transform }}
      >
        <div className="holographic-overlay"></div>
        {children}
      </div>
    </div>
  );
};


// --- AUDIO SYSTEM ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

const playSound = (type) => {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  const now = audioCtx.currentTime;

  if (type === 'hover') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc.start(now);
    osc.stop(now + 0.1);
  } else if (type === 'click') {
    osc.type = 'square';
    osc.frequency.setValueAtTime(200, now);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc.start(now);
    osc.stop(now + 0.1);
  } else if (type === 'success') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.linearRampToValueAtTime(800, now + 0.2);
    osc.frequency.linearRampToValueAtTime(1200, now + 0.4);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.linearRampToValueAtTime(0.1, now + 0.4);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    osc.start(now);
    osc.stop(now + 0.8);
  }
};

const speak = (text) => {
  if ('speechSynthesis' in window) {
    const msg = new SpeechSynthesisUtterance(text);
    msg.rate = 1.1;
    msg.pitch = 1.0;
    // Prefer a generic English voice
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.lang.includes('en') && v.name.includes('Google')) || voices[0];
    if (voice) msg.voice = voice;
    window.speechSynthesis.speak(msg);
  }
};

function App() {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contracts, setContracts] = useState(null);
  const [reputationData, setReputationData] = useState(null);
  const [loans, setLoans] = useState([]);
  const [circles, setCircles] = useState([]);
  const [poolStats, setPoolStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [txHash, setTxHash] = useState('');
  const [theme, setTheme] = useState(() => {
    // Get theme from localStorage or default to 'dark'
    return localStorage.getItem('theme') || 'dark';
  });

  // Contract addresses - update after deployment
  const CONTRACT_ADDRESSES = {
    reputationNFT: "0x...", // Update with deployed address
    lendingPool: "0x...",   // Update with deployed address
    trustCircle: "0x..."    // Update with deployed address
  };

  const tierNames = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'];
  const tierColors = ['#CD7F32', '#C0C0C0', '#FFD700', '#E5E4E2', '#B9F2FF'];

  // Theme toggle effect
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Toggle theme function
  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'dark' ? 'light' : 'dark');
  };

  // Connect Wallet
  const connectWallet = async () => {
    try {
      if (typeof window.ethereum === 'undefined') {
        alert('Please install MetaMask!');
        return;
      }

      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();

      setProvider(provider);
      setSigner(signer);
      setAccount(accounts[0]);

      // Initialize contracts
      const reputationNFT = new ethers.Contract(CONTRACT_ADDRESSES.reputationNFT, REPUTATION_NFT_ABI, signer);
      const lendingPool = new ethers.Contract(CONTRACT_ADDRESSES.lendingPool, LENDING_POOL_ABI, signer);
      const trustCircle = new ethers.Contract(CONTRACT_ADDRESSES.trustCircle, TRUST_CIRCLE_ABI, signer);

      setContracts({ reputationNFT, lendingPool, trustCircle });

      // Load user data
      await loadUserData(accounts[0], { reputationNFT, lendingPool, trustCircle });
      setLoading(false);
    } catch (error) {
      console.error('Error connecting wallet:', error);
      setLoading(false);
    }
  };

  // Load user reputation data
  const loadUserData = async (address, contractsObj) => {
    try {
      const contracts = contractsObj || contracts;
      if (!contracts) return;

      const score = await contracts.reputationNFT.getReputationScore(address);
      if (score > 0) {
        const data = await contracts.reputationNFT.getReputationData(address);
        const borrowingLimit = await contracts.lendingPool.getBorrowingLimit(address);
        const interestRate = await contracts.lendingPool.getInterestRate(address);
        const trustScore = await contracts.trustCircle.getTrustScore(address);
        const circleIds = await contracts.trustCircle.getUserCircles(address);
        const loanIds = await contracts.lendingPool.getBorrowerLoans(address);

        // Load loan details
        const loanDetails = await Promise.all(
          loanIds.map(async (id) => {
            const loan = await contracts.lendingPool.getLoan(id);
            const totalOwed = await contracts.lendingPool.getTotalOwed(id);
            return { id, ...loan, totalOwed };
          })
        );

        setLoans(loanDetails);

        // Load pool stats
        const totalLiquidity = await contracts.lendingPool.totalLiquidity();
        const lenderInfo = await contracts.lendingPool.lenders(address);

        setPoolStats({
          totalLiquidity: ethers.formatEther(totalLiquidity),
          userDeposited: ethers.formatEther(lenderInfo.deposited)
        });

        setReputationData({
          score: Number(data.score),
          tier: Number(data.currentTier),
          loansCompleted: Number(data.loansCompleted),
          totalBorrowed: ethers.formatEther(data.totalBorrowed),
          totalRepaid: ethers.formatEther(data.totalRepaid),
          borrowingLimit: ethers.formatEther(borrowingLimit),
          interestRate: Number(interestRate) / 100, // Convert from basis points
          trustScore: Number(trustScore),
          circles: circleIds.length
        });

        // Voice Welcome
        // Only speak if we haven't welcomed this address this session (simple check)
        if (!window.hasWelcomed) {
          speak(`Welcome back. Accessing Trust Circle protocol for account ${address.slice(0, 4)}`);
          window.hasWelcomed = true;
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  // Mint Reputation NFT
  const mintReputation = async () => {
    try {
      setLoading(true);
      const tx = await contracts.reputationNFT.mint(account);
      setTxHash(tx.hash);
      await tx.wait();
      await loadUserData(account);
      setLoading(false);
      setTxHash('');
      playSound('success');
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 }
      });
      speak("Reputation minting successful. Welcome to the circle.");
      alert('Reputation NFT minted successfully!');
    } catch (error) {
      console.error('Error minting:', error);
      setLoading(false);
      setTxHash('');
      alert('Error minting NFT');
    }
  };

  // Borrow functionality
  const [borrowAmount, setBorrowAmount] = useState('');
  const [borrowDuration, setBorrowDuration] = useState('30');

  const handleBorrow = async () => {
    try {
      if (!borrowAmount || parseFloat(borrowAmount) <= 0) {
        alert('Please enter a valid amount');
        return;
      }

      setLoading(true);
      const amount = ethers.parseEther(borrowAmount);
      const tx = await contracts.lendingPool.borrow(amount, parseInt(borrowDuration));
      setTxHash(tx.hash);
      await tx.wait();
      await loadUserData(account);
      setBorrowAmount('');
      setLoading(false);
      setTxHash('');
      alert('Loan borrowed successfully!');
    } catch (error) {
      console.error('Error borrowing:', error);
      setLoading(false);
      setTxHash('');
      alert('Error borrowing: ' + (error.reason || error.message));
    }
  };

  // Repay loan
  const handleRepay = async (loanId, totalOwed) => {
    try {
      setLoading(true);
      const tx = await contracts.lendingPool.repay(loanId, { value: totalOwed });
      setTxHash(tx.hash);
      await tx.wait();
      await loadUserData(account);
      setLoading(false);
      setTxHash('');
      confetti({
        particleCount: 100,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#10B981', '#34D399'] // Green tones for repayment
      });
      alert('Loan repaid successfully!');
    } catch (error) {
      console.error('Error repaying:', error);
      setLoading(false);
      setTxHash('');
      alert('Error repaying loan');
    }
  };

  // Lending functionality
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');

  const handleDeposit = async () => {
    try {
      if (!depositAmount || parseFloat(depositAmount) <= 0) {
        alert('Please enter a valid amount');
        return;
      }

      setLoading(true);
      const amount = ethers.parseEther(depositAmount);
      const tx = await contracts.lendingPool.deposit({ value: amount });
      setTxHash(tx.hash);
      await tx.wait();
      await loadUserData(account);
      setDepositAmount('');
      setLoading(false);
      setTxHash('');
      alert('Deposited successfully!');
    } catch (error) {
      console.error('Error depositing:', error);
      setLoading(false);
      setTxHash('');
      alert('Error depositing');
    }
  };

  const handleWithdraw = async () => {
    try {
      if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
        alert('Please enter a valid amount');
        return;
      }

      setLoading(true);
      const amount = ethers.parseEther(withdrawAmount);
      const tx = await contracts.lendingPool.withdraw(amount);
      setTxHash(tx.hash);
      await tx.wait();
      await loadUserData(account);
      setWithdrawAmount('');
      setLoading(false);
      setTxHash('');
      alert('Withdrawn successfully!');
    } catch (error) {
      console.error('Error withdrawing:', error);
      setLoading(false);
      setTxHash('');
      alert('Error withdrawing: ' + (error.reason || error.message));
    }
  };

  // Trust Circle functionality
  const [circleName, setCircleName] = useState('');
  const [minReputation, setMinReputation] = useState('100');

  const handleCreateCircle = async () => {
    try {
      if (!circleName) {
        alert('Please enter a circle name');
        return;
      }

      setLoading(true);
      const tx = await contracts.trustCircle.createCircle(circleName, parseInt(minReputation));
      setTxHash(tx.hash);
      await tx.wait();
      await loadUserData(account);
      setCircleName('');
      setLoading(false);
      setTxHash('');
      confetti({
        particleCount: 120,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#8B5CF6', '#C4B5FD'] // Purple tones for circles
      });
      alert('Trust circle created!');
    } catch (error) {
      console.error('Error creating circle:', error);
      setLoading(false);
      setTxHash('');
      alert('Error creating circle: ' + (error.reason || error.message));
    }
  };

  return (
    <div className="app">
      <ConstellationBackground />
      {/* Header */}
      <header className="header">
        <MarketPulse />
        <div className="header-content">
          <h1 className="logo gradient-text glitch-wrapper">
            <span className="glitch-text" data-text="TrustCircle">TrustCircle</span>
          </h1>
          <div className="wallet-info">
            <button
              className="theme-toggle-btn"
              onClick={() => { toggleTheme(); playSound('click'); }}
              aria-label="Toggle theme"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            {!account ? (
              <button className="btn btn-primary" onClick={connectWallet} disabled={loading}>
                {loading ? 'Connecting...' : 'Connect Wallet'}
              </button>
            ) : (
              <span className="badge badge-success">
                {account.slice(0, 6)}...{account.slice(-4)}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Transaction Status */}
      {txHash && (
        <div className="tx-notification">
          <div className="spinner"></div>
          <span>Transaction pending...</span>
          <a href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer">
            View on Etherscan
          </a>
        </div>
      )}

      {/* Main Content */}
      <main className="container">
        {!account ? (
          <div className="hero">
            <div className="hero-content fade-in">
              <h1 className="hero-title">Decentralized Social Lending</h1>
              <p className="hero-subtitle">
                Build your on-chain reputation, join trust circles, and access uncollateralized loans
              </p>
              <div className="hero-features">
                <div className="feature-item">
                  <span className="feature-icon">💎</span>
                  <h3>Dynamic Reputation</h3>
                  <p>Build credit through on-chain behavior</p>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">🤝</span>
                  <h3>Trust Circles</h3>
                  <p>Community vouching for better rates</p>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">💰</span>
                  <h3>3-30% Rates</h3>
                  <p>Dynamic rates based on reputation</p>
                </div>
              </div>
              <button className="btn btn-primary btn-lg" onClick={connectWallet}>
                Get Started
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Navigation Tabs */}
            <div className="tabs">
              <button
                className={`tab ${activeTab === 'dashboard' ? 'tab-active' : ''}`}
                onClick={() => setActiveTab('dashboard')}
              >
                Dashboard
              </button>
              <button
                className={`tab ${activeTab === 'borrow' ? 'tab-active' : ''}`}
                onClick={() => setActiveTab('borrow')}
              >
                Borrow
              </button>
              <button
                className={`tab ${activeTab === 'lend' ? 'tab-active' : ''}`}
                onClick={() => setActiveTab('lend')}
              >
                Lend
              </button>
              <button
                className={`tab ${activeTab === 'circles' ? 'tab-active' : ''}`}
                onClick={() => setActiveTab('circles')}
              >
                Trust Circles
              </button>
            </div>

            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && (
              <div className="dashboard fade-in">
                {!reputationData ? (
                  <div className="glass-card text-center">
                    <h2>Welcome to TrustCircle!</h2>
                    <p className="text-secondary mb-4">Mint your Reputation NFT to get started</p>
                    <button className="btn btn-primary btn-neon" onClick={mintReputation} disabled={loading}>
                      {loading ? 'Minting...' : 'Mint Reputation NFT'}
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Reputation Card */}
                    <HolographicCard>
                      <div className="glass-card reputation-card">
                        <h2 className="card-title">Your Reputation</h2>
                        <div className="reputation-display">
                          <div className="reputation-score">
                            <div
                              className="score-circle"
                              style={{
                                background: `linear-gradient(135deg, ${tierColors[reputationData.tier]}, ${tierColors[reputationData.tier]}99)`,
                                boxShadow: `0 0 40px ${tierColors[reputationData.tier]}66`
                              }}
                            >
                              <span className="score-value">{reputationData.score}</span>
                            </div>
                            <div className="tier-badge" style={{ color: tierColors[reputationData.tier] }}>
                              {tierNames[reputationData.tier]} Tier
                            </div>
                          </div>
                          <div className="reputation-stats">
                            <div className="stat-item">
                              <span className="stat-label">Loans Completed</span>
                              <span className="stat-value">{reputationData.loansCompleted}</span>
                            </div>
                            <div className="stat-item">
                              <span className="stat-label">Total Borrowed</span>
                              <span className="stat-value">{parseFloat(reputationData.totalBorrowed).toFixed(2)} ETH</span>
                            </div>
                            <div className="stat-item">
                              <span className="stat-label">Total Repaid</span>
                              <span className="stat-value">{parseFloat(reputationData.totalRepaid).toFixed(2)} ETH</span>
                            </div>
                            <div className="stat-item">
                              <span className="stat-label">Trust Circles</span>
                              <span className="stat-value">{reputationData.circles}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </HolographicCard>

                    {/* Quick Stats */}
                    <div className="grid grid-3">
                      <div className="stat-card">
                        <div className="stat-value gradient-text">{parseFloat(reputationData.borrowingLimit).toFixed(2)} ETH</div>
                        <div className="stat-label">Borrowing Limit</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-value gradient-text">{reputationData.interestRate}%</div>
                        <div className="stat-label">Your Interest Rate</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-value gradient-text">{reputationData.trustScore}</div>
                        <div className="stat-label">Trust Score</div>
                      </div>
                    </div>

                    {/* Active Loans */}
                    {loans.length > 0 && (
                      <div className="glass-card">
                        <h2 className="card-title">Your Loans</h2>
                        <div className="loan-list">
                          {loans.map((loan, index) => (
                            <div key={index} className="loan-item">
                              <div className="loan-info">
                                <span className="loan-amount">{ethers.formatEther(loan.amount)} ETH</span>
                                <span className={`badge ${loan.active ? 'badge-warning' : loan.defaulted ? 'badge-error' : 'badge-success'}`}>
                                  {loan.active ? 'Active' : loan.defaulted ? 'Defaulted' : 'Repaid'}
                                </span>
                              </div>
                              <div className="loan-details">
                                <span>Rate: {Number(loan.interestRate) / 100}%</span>
                                <span>Owed: {ethers.formatEther(loan.totalOwed)} ETH</span>
                                <span>Repaid: {ethers.formatEther(loan.amountRepaid)} ETH</span>
                              </div>
                              {loan.active && (
                                <button
                                  className="btn btn-primary btn-sm"
                                  onClick={() => handleRepay(loan.id, loan.totalOwed)}
                                  disabled={loading}
                                >
                                  Repay Loan
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Borrow Tab */}
            {activeTab === 'borrow' && reputationData && (
              <div className="fade-in">
                <div className="glass-card">
                  <h2 className="card-title">Borrow Funds</h2>
                  <p className="text-secondary">Access uncollateralized loans based on your reputation</p>

                  <div className="borrow-form">
                    <div className="input-group">
                      <label className="input-label">Amount (ETH)</label>
                      <input
                        type="number"
                        className="input-field"
                        placeholder="0.0"
                        value={borrowAmount}
                        onChange={(e) => setBorrowAmount(e.target.value)}
                        step="0.01"
                        max={reputationData.borrowingLimit}
                      />
                      <small className="text-muted">Maximum: {parseFloat(reputationData.borrowingLimit).toFixed(2)} ETH</small>
                    </div>

                    <div className="input-group">
                      <label className="input-label">Loan Duration (Days)</label>
                      <select
                        className="input-field"
                        value={borrowDuration}
                        onChange={(e) => setBorrowDuration(e.target.value)}
                      >
                        <option value="7">7 days</option>
                        <option value="14">14 days</option>
                        <option value="30">30 days</option>
                        <option value="60">60 days</option>
                        <option value="90">90 days</option>
                      </select>
                    </div>

                    <div className="loan-preview">
                      <div className="preview-item">
                        <span>Interest Rate:</span>
                        <span className="gradient-text">{reputationData.interestRate}%</span>
                      </div>
                      {borrowAmount && (
                        <div className="preview-item">
                          <span>Estimated Interest:</span>
                          <span>{(parseFloat(borrowAmount) * reputationData.interestRate / 100 * parseInt(borrowDuration) / 365).toFixed(4)} ETH</span>
                        </div>
                      )}
                    </div>

                    <button
                      className="btn btn-primary"
                      onClick={handleBorrow}
                      disabled={loading || !borrowAmount}
                    >
                      {loading ? 'Processing...' : 'Borrow'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Lend Tab */}
            {activeTab === 'lend' && (
              <div className="fade-in">
                <div className="glass-card">
                  <h2 className="card-title">Provide Liquidity</h2>
                  <p className="text-secondary">Earn interest by supplying liquidity to the pool</p>

                  {poolStats && (
                    <div className="grid grid-2 mb-4">
                      <div className="stat-card">
                        <div className="stat-value gradient-text">{parseFloat(poolStats.totalLiquidity).toFixed(2)} ETH</div>
                        <div className="stat-label">Total Pool Liquidity</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-value gradient-text">{parseFloat(poolStats.userDeposited).toFixed(2)} ETH</div>
                        <div className="stat-label">Your Deposited</div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-2">
                    <div className="lending-form">
                      <h3>Deposit</h3>
                      <div className="input-group">
                        <label className="input-label">Amount (ETH)</label>
                        <input
                          type="number"
                          className="input-field"
                          placeholder="0.0"
                          value={depositAmount}
                          onChange={(e) => setDepositAmount(e.target.value)}
                          step="0.01"
                        />
                      </div>
                      <button
                        className="btn btn-primary"
                        onClick={handleDeposit}
                        disabled={loading || !depositAmount}
                      >
                        {loading ? 'Processing...' : 'Deposit'}
                      </button>
                    </div>

                    <div className="lending-form">
                      <h3>Withdraw</h3>
                      <div className="input-group">
                        <label className="input-label">Amount (ETH)</label>
                        <input
                          type="number"
                          className="input-field"
                          placeholder="0.0"
                          value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(e.target.value)}
                          step="0.01"
                        />
                      </div>
                      <button
                        className="btn btn-secondary"
                        onClick={handleWithdraw}
                        disabled={loading || !withdrawAmount}
                      >
                        {loading ? 'Processing...' : 'Withdraw'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Trust Circles Tab */}
            {activeTab === 'circles' && reputationData && (
              <div className="fade-in">
                <div className="glass-card">
                  <h2 className="card-title">Trust Circles</h2>
                  <p className="text-secondary">Create or join circles to increase your trust score and get better rates</p>

                  <div className="circle-form">
                    <h3>Create New Circle</h3>
                    <div className="input-group">
                      <label className="input-label">Circle Name</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="My Trust Circle"
                        value={circleName}
                        onChange={(e) => setCircleName(e.target.value)}
                      />
                    </div>

                    <div className="input-group">
                      <label className="input-label">Minimum Reputation Required</label>
                      <input
                        type="number"
                        className="input-field"
                        placeholder="100"
                        value={minReputation}
                        onChange={(e) => setMinReputation(e.target.value)}
                        min="0"
                        max="1000"
                      />
                    </div>

                    <button
                      className="btn btn-primary"
                      onClick={handleCreateCircle}
                      disabled={loading || !circleName}
                    >
                      {loading ? 'Creating...' : 'Create Circle'}
                    </button>
                  </div>

                  <div className="circles-info">
                    <h3>Your Circles: {reputationData.circles}</h3>
                    <p className="text-secondary">
                      Join circles to receive vouches from trusted members and unlock better loan terms.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="footer">
        <p className="text-muted">Built with ❤️ for the hackathon • Powered by Ethereum</p>
      </footer>
    </div>
  );
}

export default App;
