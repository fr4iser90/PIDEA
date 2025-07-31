import React from 'react';
import '@/css/components/analysis/security-score-chart.css';

const SecurityScoreChart = ({ score }) => {
  const getScoreColor = (score) => {
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'warning';
    return 'poor';
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  };

  const getScoreIcon = (score) => {
    if (score >= 80) return '🟢';
    if (score >= 60) return '🟡';
    if (score >= 40) return '🟠';
    return '🔴';
  };

  const scoreColor = getScoreColor(score);
  const scoreLabel = getScoreLabel(score);
  const scoreIcon = getScoreIcon(score);

  // Calculate circle progress
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const strokeDasharray = `${progress} ${circumference}`;

  return (
    <div className="security-score-chart">
      <div className="score-display">
        <div className="score-circle">
          <svg className="score-svg" width="140" height="140">
            {/* Background circle */}
            <circle
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke="#e0e0e0"
              strokeWidth="8"
            />
            {/* Progress circle */}
            <circle
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke={`var(--score-${scoreColor}-color)`}
              strokeWidth="8"
              strokeDasharray={strokeDasharray}
              strokeLinecap="round"
              transform="rotate(-90 70 70)"
            />
          </svg>
          <div className="score-content">
            <span className="score-icon">{scoreIcon}</span>
            <span className="score-value">{score}</span>
            <span className="score-max">/100</span>
          </div>
        </div>
        
        <div className="score-info">
          <h4 className="score-label">{scoreLabel} Security</h4>
          <p className="score-description">
            {score >= 80 ? 'Excellent security posture with minimal risks' :
             score >= 60 ? 'Good security posture with some areas for improvement' :
             score >= 40 ? 'Fair security posture requiring attention' :
             'Poor security posture requiring immediate action'}
          </p>
        </div>
      </div>

      <div className="score-breakdown">
        <h5>Score Breakdown</h5>
        <div className="breakdown-items">
          <div className="breakdown-item">
            <span className="breakdown-label">Vulnerability Assessment</span>
            <div className="breakdown-bar">
              <div 
                className={`breakdown-progress ${scoreColor}`}
                style={{ width: `${Math.min(score, 100)}%` }}
              ></div>
            </div>
            <span className="breakdown-value">{score}%</span>
          </div>
          
          <div className="breakdown-item">
            <span className="breakdown-label">Best Practices</span>
            <div className="breakdown-bar">
              <div 
                className={`breakdown-progress ${scoreColor}`}
                style={{ width: `${Math.min(score + 10, 100)}%` }}
              ></div>
            </div>
            <span className="breakdown-value">{Math.min(score + 10, 100)}%</span>
          </div>
          
          <div className="breakdown-item">
            <span className="breakdown-label">Scanner Coverage</span>
            <div className="breakdown-bar">
              <div 
                className="breakdown-progress excellent"
                style={{ width: '100%' }}
              ></div>
            </div>
            <span className="breakdown-value">100%</span>
          </div>
        </div>
      </div>

      <div className="score-recommendations">
        <h5>Recommendations</h5>
        <div className="recommendations-list">
          {score < 80 && (
            <div className="recommendation-item">
              <span className="recommendation-icon">💡</span>
              <span className="recommendation-text">
                Review and address high-priority vulnerabilities
              </span>
            </div>
          )}
          {score < 60 && (
            <div className="recommendation-item">
              <span className="recommendation-icon">🔧</span>
              <span className="recommendation-text">
                Implement security best practices and coding standards
              </span>
            </div>
          )}
          {score < 40 && (
            <div className="recommendation-item">
              <span className="recommendation-icon">🚨</span>
              <span className="recommendation-text">
                Conduct comprehensive security audit and remediation
              </span>
            </div>
          )}
          <div className="recommendation-item">
            <span className="recommendation-icon">📊</span>
            <span className="recommendation-text">
              Monitor security trends and maintain regular scans
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityScoreChart; 