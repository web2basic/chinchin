import { useState, useEffect } from 'react';
import './Leaderboard.css';

function Leaderboard({ contracts, account }) {
    const [topUsers, setTopUsers] = useState([]);
    const [userRank, setUserRank] = useState(null);
    const [sortBy, setSortBy] = useState('reputation');
    const [loading, setLoading] = useState(false);

    const tierNames = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'];
    const tierColors = ['#CD7F32', '#C0C0C0', '#FFD700', '#E5E4E2', '#B9F2FF'];

    useEffect(() => {
        if (contracts?.leaderboard) {
            loadLeaderboard();
        }
    }, [contracts, sortBy]);

    const loadLeaderboard = async () => {
        try {
            setLoading(true);
            const mockData = [
                { user: '0x1234...5678', reputation: 950, loansCompleted: 15, totalRepaid: '12.5', trustScore: 250, tier: 4 },
                { user: '0x2345...6789', reputation: 820, loansCompleted: 12, totalRepaid: '9.8', trustScore: 180, tier: 3 },
                { user: '0x3456...7890', reputation: 680, loansCompleted: 8, totalRepaid: '6.2', trustScore: 140, tier: 2 },
                { user: '0x4567...8901', reputation: 520, loansCompleted: 5, totalRepaid: '3.5', trustScore: 90, tier: 2 },
                { user: '0x5678...9012', reputation: 380, loansCompleted: 3, totalRepaid: '1.8', trustScore: 60, tier: 1 },
            ];

            if (account) {
                const currentUser = {
                    user: `${account.slice(0, 6)}...${account.slice(-4)}`,
                    reputation: 450,
                    loansCompleted: 4,
                    totalRepaid: '2.5',
                    trustScore: 75,
                    tier: 2
                };
                setUserRank(6);
            }

            setTopUsers(mockData);
            setLoading(false);
        } catch (error) {
            console.error('Error loading leaderboard:', error);
            setLoading(false);
        }
    };

    return (
        <div className="leaderboard-container">
            <div className="leaderboard-header">
                <h2 className="gradient-text">🏆 Leaderboard</h2>
                <p className="text-secondary">Top performers in the TrustCircle community</p>
            </div>

            {userRank && (
                <div className="user-rank-card glass-card">
                    <span className="rank-label">Your Rank:</span>
                    <span className="rank-value">#{userRank}</span>
                    <span className="rank-hint">Keep building reputation to climb higher!</span>
                </div>
            )}

            <div className="sort-buttons">
                <button
                    className={`btn btn-sm ${sortBy === 'reputation' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setSortBy('reputation')}
                >
                    By Reputation
                </button>
                <button
                    className={`btn btn-sm ${sortBy === 'loans' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setSortBy('loans')}
                >
                    By Loans Completed
                </button>
            </div>

            {loading ? (
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Loading leaderboard...</p>
                </div>
            ) : (
                <div className="leaderboard-list">
                    {topUsers.map((user, index) => (
                        <div key={index} className="leaderboard-item glass-card">
                            <div className="rank-badge" style={{
                                background: index < 3 ? `linear-gradient(135deg, ${tierColors[4]}, ${tierColors[3]})` : 'var(--bg-glass)'
                            }}>
                                #{index + 1}
                            </div>

                            <div className="user-info">
                                <span className="user-address">{user.user}</span>
                                <span className="user-tier" style={{ color: tierColors[user.tier] }}>
                                    {tierNames[user.tier]}
                                </span>
                            </div>

                            <div className="user-stats">
                                <div className="stat-box">
                                    <span className="stat-value">{user.reputation}</span>
                                    <span className="stat-label">Reputation</span>
                                </div>
                                <div className="stat-box">
                                    <span className="stat-value">{user.loansCompleted}</span>
                                    <span className="stat-label">Loans</span>
                                </div>
                                <div className="stat-box">
                                    <span className="stat-value">{user.totalRepaid} ETH</span>
                                    <span className="stat-label">Repaid</span>
                                </div>
                                <div className="stat-box">
                                    <span className="stat-value">{user.trustScore}</span>
                                    <span className="stat-label">Trust</span>
                                </div>
                            </div>

                            {index < 3 && (
                                <div className="trophy-icon">
                                    {index === 0 && '🥇'}
                                    {index === 1 && '🥈'}
                                    {index === 2 && '🥉'}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default Leaderboard;
