import React from 'react';
import '@/css/components/analysis/security-scanner-card.css';

const SecurityScannerCard = ({ scanner, data, isExpanded, isSelected, onExpand, onSelect }) => {
  const getScannerIcon = (scannerName) => {
    switch (scannerName.toLowerCase()) {
      case 'trivy': return '🔍';
      case 'snyk': return '🛡️';
      case 'semgrep': return '🔎';
      case 'secretscanning': return '🔐';
      case 'zap': return '🕷️';
      case 'compliance': return '📋';
      default: return '🔒';
    }
  };

  const getScannerStatus = (scannerData) => {
    const status = scannerData.status;
    const icon = status === 'completed' ? '✅' : '❌';
    const color = status === 'completed' ? 'success' : 'error';
    const label = status === 'completed' ? 'Completed' : 'Failed';
    
    return { icon, color, label };
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical': return '🔴';
      case 'high': return '🟠';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  };

  const status = getScannerStatus(data);

  return (
    <div className={`scanner-card ${status.color} ${isSelected ? 'selected' : ''}`}>
      <div className="scanner-header" onClick={onSelect}>
        <div className="scanner-info">
          <span className="scanner-icon">{getScannerIcon(scanner)}</span>
          <span className="scanner-name">{scanner}</span>
        </div>
        <span className={`status-badge ${status.color}`}>
          {status.icon} {status.label}
        </span>
      </div>

      <div className="scanner-metrics">
        <div className="metric">
          <span className="metric-value">{data.vulnerabilities}</span>
          <span className="metric-label">Vulnerabilities</span>
        </div>
        <div className="metric">
          <span className="metric-value">{data.bestPractices}</span>
          <span className="metric-label">Best Practices</span>
        </div>
        <div className="metric">
          <span className="metric-value">{data.severity || 'N/A'}</span>
          <span className="metric-label">Severity</span>
        </div>
      </div>

      <div className="scanner-actions">
        <button 
          className="expand-btn" 
          onClick={onExpand}
          title={isExpanded ? 'Collapse details' : 'Expand details'}
        >
          {isExpanded ? '▼' : '▶'}
        </button>
      </div>

      {isExpanded && (
        <div className="scanner-details">
          <div className="details-section">
            <h5>Scanner Information</h5>
            <div className="detail-item">
              <span className="detail-label">Status:</span>
              <span className={`detail-value ${status.color}`}>{status.label}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Last Updated:</span>
              <span className="detail-value">
                {data.lastUpdated ? new Date(data.lastUpdated).toLocaleString() : 'N/A'}
              </span>
            </div>
          </div>

          {data.details?.result?.vulnerabilities && data.details.result.vulnerabilities.length > 0 && (
            <div className="details-section">
              <h5>Recent Vulnerabilities</h5>
              <div className="vulnerabilities-list">
                {data.details.result.vulnerabilities.slice(0, 3).map((vuln, index) => (
                  <div key={index} className="vulnerability-item">
                    <div className="vulnerability-header">
                      <span className={`severity-badge ${vuln.severity?.toLowerCase() || 'low'}`}>
                        {getSeverityIcon(vuln.severity?.toLowerCase() || 'low')} {vuln.severity?.toUpperCase() || 'LOW'}
                      </span>
                    </div>
                    <div className="vulnerability-title">
                      {vuln.title || vuln.name || 'Unknown Vulnerability'}
                    </div>
                    {vuln.description && (
                      <div className="vulnerability-description">
                        {vuln.description.length > 100 
                          ? `${vuln.description.substring(0, 100)}...` 
                          : vuln.description
                        }
                      </div>
                    )}
                  </div>
                ))}
                {data.details.result.vulnerabilities.length > 3 && (
                  <div className="more-vulnerabilities">
                    +{data.details.result.vulnerabilities.length - 3} more vulnerabilities
                  </div>
                )}
              </div>
            </div>
          )}

          {data.details?.result?.bestPractices && data.details.result.bestPractices.length > 0 && (
            <div className="details-section">
              <h5>Best Practices</h5>
              <div className="best-practices-list">
                {data.details.result.bestPractices.slice(0, 3).map((practice, index) => (
                  <div key={index} className="best-practice-item">
                    <div className="practice-title">
                      {practice.title || practice.name || 'Best Practice'}
                    </div>
                    {practice.description && (
                      <div className="practice-description">
                        {practice.description.length > 100 
                          ? `${practice.description.substring(0, 100)}...` 
                          : practice.description
                        }
                      </div>
                    )}
                  </div>
                ))}
                {data.details.result.bestPractices.length > 3 && (
                  <div className="more-practices">
                    +{data.details.result.bestPractices.length - 3} more best practices
                  </div>
                )}
              </div>
            </div>
          )}

          {data.details?.error && (
            <div className="details-section error">
              <h5>Error Information</h5>
              <div className="error-message">
                <span className="error-icon">❌</span>
                <span className="error-text">{data.details.error}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SecurityScannerCard; 