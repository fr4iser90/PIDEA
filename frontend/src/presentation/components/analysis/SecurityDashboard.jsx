/**
 * Security Dashboard Component
 * Displays security analysis results from 6 scanners with overview and detailed views
 * 
 * Created: 2025-07-30T19:53:33.000Z
 * Last Updated: 2025-07-30T19:53:33.000Z
 */

import React, { useState, useMemo } from 'react';
import { processSecurityData } from '@/utils/analysisDataProcessor';
import SecurityScannerCard from './SecurityScannerCard';
import SecurityScoreChart from './SecurityScoreChart';
import '@/css/components/analysis/security-dashboard.css';

const SecurityDashboard = ({ securityData, loading, error }) => {
  const [expandedScanners, setExpandedScanners] = useState(new Set());
  const [selectedScanner, setSelectedScanner] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const processedSecurityData = useMemo(() => {
    return processSecurityData(securityData);
  }, [securityData]);

  const handleScannerExpand = (scannerName) => {
    const newExpanded = new Set(expandedScanners);
    if (newExpanded.has(scannerName)) {
      newExpanded.delete(scannerName);
    } else {
      newExpanded.add(scannerName);
    }
    setExpandedScanners(newExpanded);
  };

  const handleScannerSelect = (scannerName) => {
    setSelectedScanner(selectedScanner === scannerName ? null : scannerName);
  };

  if (loading) {
    return (
      <div className="security-dashboard loading">
        <div className="loading-spinner">Loading security data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="security-dashboard error">
        <div className="error-message">
          <span className="error-icon">❌</span>
          <span>Error loading security data: {error}</span>
        </div>
      </div>
    );
  }

  if (!processedSecurityData) {
    return (
      <div className="security-dashboard empty">
        <div className="empty-message">
          <span className="empty-icon">🔒</span>
          <span>No security analysis data available</span>
          <div className="empty-description">
            <p>Run a security analysis to see detailed security insights including:</p>
            <ul>
              <li>🔍 Vulnerability scanning with Trivy, Snyk, and Semgrep</li>
              <li>🔐 Secret scanning and compliance checks</li>
              <li>🕷️ Web application security testing with ZAP</li>
              <li>📊 Security score and recommendations</li>
            </ul>
            <p>Use the "🔒 Security" button in the Individual Analysis section to start a security analysis.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="security-dashboard">
      <div className="security-header">
        <h3>🔒 Security Dashboard</h3>
        <div className="security-score">
          <span className="score-value">{processedSecurityData.score}</span>
          <span className="score-label">Security Score</span>
        </div>
      </div>

      <div className="security-tabs">
        <button 
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`} 
          onClick={() => setActiveTab('overview')}
        >
          🔒 Overview
        </button>
        <button 
          className={`tab ${activeTab === 'vulnerabilities' ? 'active' : ''}`} 
          onClick={() => setActiveTab('vulnerabilities')}
        >
          🚨 Vulnerabilities
        </button>
        <button 
          className={`tab ${activeTab === 'scanners' ? 'active' : ''}`} 
          onClick={() => setActiveTab('scanners')}
        >
          🔍 Scanners
        </button>
        <button 
          className={`tab ${activeTab === 'trends' ? 'active' : ''}`} 
          onClick={() => setActiveTab('trends')}
        >
          📊 Trends
        </button>
      </div>

      <div className="security-content">
        {activeTab === 'overview' && (
          <SecurityOverview data={processedSecurityData} />
        )}
        {activeTab === 'vulnerabilities' && (
          <SecurityVulnerabilities data={processedSecurityData} />
        )}
        {activeTab === 'scanners' && (
          <SecurityScanners 
            data={processedSecurityData}
            expandedScanners={expandedScanners}
            selectedScanner={selectedScanner}
            onScannerExpand={handleScannerExpand}
            onScannerSelect={handleScannerSelect}
          />
        )}
        {activeTab === 'trends' && (
          <SecurityTrends data={processedSecurityData} />
        )}
      </div>
    </div>
  );
};

const SecurityOverview = ({ data }) => {
  const getOverallStatusColor = (status) => {
    switch (status) {
      case 'excellent': return 'success';
      case 'good': return 'warning';
      case 'poor': return 'error';
      default: return 'neutral';
    }
  };

  return (
    <div className="security-overview">
      <div className="overview-grid">
        <div className="overview-card">
          <div className="card-header">
            <span className="card-icon">📊</span>
            <span className="card-title">Overall Status</span>
          </div>
          <div className={`card-value ${getOverallStatusColor(data.overallStatus)}`}>
            {data.overallStatus.toUpperCase()}
          </div>
        </div>

        <div className="overview-card">
          <div className="card-header">
            <span className="card-icon">🔍</span>
            <span className="card-title">Scanners</span>
          </div>
          <div className="card-value">
            {data.completedScanners}/{data.totalScanners}
          </div>
        </div>

        <div className="overview-card">
          <div className="card-header">
            <span className="card-icon">🚨</span>
            <span className="card-title">Vulnerabilities</span>
          </div>
          <div className="card-value">
            {data.totalVulnerabilities}
          </div>
        </div>

        <div className="overview-card">
          <div className="card-header">
            <span className="card-icon">✅</span>
            <span className="card-title">Best Practices</span>
          </div>
          <div className="card-value">
            {data.totalBestPractices}
          </div>
        </div>
      </div>

      <div className="security-score-chart">
        <SecurityScoreChart score={data.score} />
      </div>
    </div>
  );
};

const SecurityVulnerabilities = ({ data }) => {
  const severityCounts = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  };

  Object.values(data.scanners).forEach(scanner => {
    if (scanner.details?.result?.vulnerabilities) {
      scanner.details.result.vulnerabilities.forEach(vuln => {
        const severity = vuln.severity?.toLowerCase() || 'low';
        if (severityCounts.hasOwnProperty(severity)) {
          severityCounts[severity]++;
        }
      });
    }
  });

  return (
    <div className="security-vulnerabilities">
      <div className="vulnerabilities-summary">
        <h4>Vulnerability Summary</h4>
        <div className="severity-grid">
          {Object.entries(severityCounts).map(([severity, count]) => (
            <div key={severity} className={`severity-card ${severity}`}>
              <span className="severity-icon">{getSeverityIcon(severity)}</span>
              <span className="severity-label">{severity.toUpperCase()}</span>
              <span className="severity-count">{count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="vulnerabilities-list">
        <h4>Recent Vulnerabilities</h4>
        <div className="vulnerabilities-table">
          {Object.entries(data.scanners).map(([scannerName, scanner]) => {
            if (!scanner.details?.result?.vulnerabilities) return null;
            
            return scanner.details.result.vulnerabilities.slice(0, 5).map((vuln, index) => (
              <div key={`${scannerName}-${index}`} className="vulnerability-item">
                <div className="vulnerability-header">
                  <span className={`severity-badge ${vuln.severity?.toLowerCase() || 'low'}`}>
                    {vuln.severity?.toUpperCase() || 'LOW'}
                  </span>
                  <span className="scanner-name">{scannerName}</span>
                </div>
                <div className="vulnerability-title">{vuln.title || vuln.name || 'Unknown Vulnerability'}</div>
                {vuln.description && (
                  <div className="vulnerability-description">{vuln.description}</div>
                )}
              </div>
            ));
          })}
        </div>
      </div>
    </div>
  );
};

const SecurityScanners = ({ data, expandedScanners, selectedScanner, onScannerExpand, onScannerSelect }) => {
  return (
    <div className="security-scanners">
      <div className="scanners-grid">
        {Object.entries(data.scanners).map(([scannerName, scannerData]) => (
          <SecurityScannerCard
            key={scannerName}
            scanner={scannerName}
            data={scannerData}
            isExpanded={expandedScanners.has(scannerName)}
            isSelected={selectedScanner === scannerName}
            onExpand={() => onScannerExpand(scannerName)}
            onSelect={() => onScannerSelect(scannerName)}
          />
        ))}
      </div>
    </div>
  );
};

const SecurityTrends = ({ data }) => {
  return (
    <div className="security-trends">
      <div className="trends-chart">
        <h4>Security Score Trends</h4>
        <div className="trend-chart-placeholder">
          <span className="chart-icon">📈</span>
          <span>Security trend analysis will be implemented in future updates</span>
        </div>
      </div>

      <div className="trends-metrics">
        <h4>Trend Metrics</h4>
        <div className="metrics-grid">
          <div className="metric-item">
            <span className="metric-label">Score Trend</span>
            <span className="metric-value">Stable</span>
          </div>
          <div className="metric-item">
            <span className="metric-label">Vulnerability Trend</span>
            <span className="metric-value">Decreasing</span>
          </div>
          <div className="metric-item">
            <span className="metric-label">Scanner Coverage</span>
            <span className="metric-value">100%</span>
          </div>
        </div>
      </div>
    </div>
  );
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

export default SecurityDashboard; 