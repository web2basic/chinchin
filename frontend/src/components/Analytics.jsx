import { useState, useEffect } from 'react';
import './Analytics.css';

function Analytics({ reputationData, poolStats }) {
    const [chartData, setChartData] = useState([]);

    useEffect(() => {
        // Mock reputation history - replace with actual historical data
        const mockHistory = [
            { date: 'Jan 10', score: 100 },
            { date: 'Jan 12', score: 150 },
            { date: 'Jan 14', score: 180 },
            { date: 'Jan 16', score: 220 },
            { date: 'Jan 18', score: 200 }, // Example of score decrease
            { date: 'Today', score: reputationData?.score || 250 },
        ];
        setChartData(mockHistory);
    }, [reputationData]);

    const maxScore = Math.max(...chartData.map(d => d.score), 100);

    return (
        <div className="analytics-container">
            <h3 className="analytics-title">📊 Analytics Dashboard</h3>

            {/* Reputation Chart */}
            <div className="chart-container glass-card">
                <h4>Reputation History</h4>
                <div className="chart">
                    <div className="chart-grid">
                        {[1000, 750, 500, 250, 0].map(value => (
                            <div key={value} className="grid-line">
                                <span className="grid-label">{value}</span>
                            </div>
                        ))}
                    </div>
                    <div className="chart-bars">
                        {chartData.map((data, index) => {
                            const height = (data.score / 1000) * 100;
                            return (
                                <div key={index} className="bar-container">
                                    <div
                                        className="bar"
                                        style={{ height: `${height}%` }}
                                        data-value={data.score}
                                    >
                                        <div className="bar-fill"></div>
                                    </div>
                                    <span className="bar-label">{data.date}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="metrics-grid">
                <div className="metric-card glass-card">
                    <div className="metric-icon">💎</div>
                    <div className="metric-content">
                        <span className="metric-value">{reputationData?.score || 0}</span>
                        <span className="metric-label">Current Reputation</span>
                        <span className="metric-change positive">+{Math.floor(Math.random() * 50)} this week</span>
                    </div>
                </div>

                <div className="metric-card glass-card">
                    <div className="metric-icon">📈</div>
                    <div className="metric-content">
                        <span className="metric-value">{reputationData?.loansCompleted || 0}</span>
                        <span className="metric-label">Loans Completed</span>
                        <span className="metric-change positive">100% on-time</span>
                    </div>
                </div>

                <div className="metric-card glass-card">
                    <div className="metric-icon">💰</div>
                    <div className="metric-content">
                        <span className="metric-value">{parseFloat(reputationData?.totalRepaid || 0).toFixed(2)} ETH</span>
                        <span className="metric-label">Total Repaid</span>
                        <span className="metric-change">Lifetime</span>
                    </div>
                </div>

                <div className="metric-card glass-card">
                    <div className="metric-icon">🎯</div>
                    <div className="metric-content">
                        <span className="metric-value">{reputationData?.trustScore || 0}</span>
                        <span className="metric-label">Trust Score</span>
                        <span className="metric-change positive">Top 20%</span>
                    </div>
                </div>
            </div>

            {/* Insights */}
            <div className="insights-container glass-card">
                <h4>Insights & Tips</h4>
                <div className="insight-list">
                    <div className="insight-item">
                        <span className="insight-icon">💡</span>
                        <p>Join 2 more trust circles to increase your borrowing limit by 30%</p>
                    </div>
                    <div className="insight-item">
                        <span className="insight-icon">🚀</span>
                        <p>You're {250 - (reputationData?.score || 0)} points away from Silver tier</p>
                    </div>
                    <div className="insight-item">
                        <span className="insight-icon">⭐</span>
                        <p>Complete one more loan to unlock the "Veteran Borrower" achievement</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Analytics;
