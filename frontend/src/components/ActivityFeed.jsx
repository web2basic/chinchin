import { useState, useEffect } from 'react';
import './ActivityFeed.css';

function ActivityFeed({ account, contracts }) {
    const [activities, setActivities] = useState([]);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        loadActivities();
    }, [account, filter]);

    const loadActivities = () => {
        // Mock activity data - replace with actual event listening
        const mockActivities = [
            {
                id: 1,
                type: 'borrow',
                amount: '0.5 ETH',
                timestamp: Date.now() - 3600000,
                status: 'completed',
                description: 'Borrowed 0.5 ETH at 5% APR'
            },
            {
                id: 2,
                type: 'repay',
                amount: '0.52 ETH',
                timestamp: Date.now() - 7200000,
                status: 'completed',
                description: 'Repaid loan with interest'
            },
            {
                id: 3,
                type: 'circle',
                timestamp: Date.now() - 86400000,
                status: 'completed',
                description: 'Joined "DeFi Enthusiasts" trust circle'
            },
            {
                id: 4,
                type: 'achievement',
                timestamp: Date.now() - 172800000,
                status: 'completed',
                description: 'Unlocked "First Repayment" achievement (+30 reputation)'
            },
            {
                id: 5,
                type: 'vouch',
                timestamp: Date.now() - 259200000,
                status: 'completed',
                description: 'Received vouch from 0x789...def'
            },
        ];

        setActivities(mockActivities);
    };

    const getActivityIcon = (type) => {
        switch (type) {
            case 'borrow': return '💰';
            case 'repay': return '✅';
            case 'circle': return '🤝';
            case 'achievement': return '🏆';
            case 'vouch': return '👍';
            default: return '📌';
        }
    };

    const getActivityColor = (type) => {
        switch (type) {
            case 'borrow': return 'var(--secondary)';
            case 'repay': return 'var(--success)';
            case 'circle': return 'var(--primary)';
            case 'achievement': return 'var(--accent)';
            case 'vouch': return 'var(--primary-light)';
            default: return 'var(--text-secondary)';
        }
    };

    const formatTimestamp = (timestamp) => {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    };

    return (
        <div className="activity-feed-container">
            <div className="activity-header">
                <h3>Recent Activity</h3>
                <div className="activity-filters">
                    <button
                        className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                        onClick={() => setFilter('all')}
                    >
                        All
                    </button>
                    <button
                        className={`filter-btn ${filter === 'loans' ? 'active' : ''}`}
                        onClick={() => setFilter('loans')}
                    >
                        Loans
                    </button>
                    <button
                        className={`filter-btn ${filter === 'social' ? 'active' : ''}`}
                        onClick={() => setFilter('social')}
                    >
                        Social
                    </button>
                </div>
            </div>

            <div className="activity-list">
                {activities.map((activity) => (
                    <div key={activity.id} className="activity-item slide-in">
                        <div className="activity-icon" style={{ color: getActivityColor(activity.type) }}>
                            {getActivityIcon(activity.type)}
                        </div>
                        <div className="activity-content">
                            <p className="activity-description">{activity.description}</p>
                            {activity.amount && (
                                <span className="activity-amount">{activity.amount}</span>
                            )}
                            <span className="activity-time">{formatTimestamp(activity.timestamp)}</span>
                        </div>
                        <div className="activity-status">
                            <span className={`status-indicator ${activity.status}`}></span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default ActivityFeed;
