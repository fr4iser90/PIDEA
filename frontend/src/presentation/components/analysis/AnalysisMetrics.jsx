import { logger } from "@/infrastructure/logging/Logger";
import React from 'react';
import '@/scss/components/_analysis-metrics.scss';;

const AnalysisMetrics = ({ metrics, loading }) => {
  const formatNumber = (num) => {
    if (num === null || num === undefined) return '0';
    return num.toLocaleString();
  };

  const formatPercentage = (num) => {
    if (num === null || num === undefined) return '0%';
    return `${(num * 100).toFixed(1)}%`;
  };

  const formatDuration = (milliseconds) => {
    if (!milliseconds) return '0s';
    const seconds = Math.round(milliseconds / 1000);
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getMetricIcon = (metricType) => {
    switch (metricType) {
      case 'total':
        return '📊';
      case 'completed':
        return '✅';
      case 'failed':
        return '❌';
      case 'success':
        return '📈';
      case 'duration':
        return '⏱️';
      case 'last':
        return '🕒';
      default:
        return '📋';
    }
  };

  const getMetricColor = (metricType, value) => {
    switch (metricType) {
      case 'success':
        if (value >= 0.9) return 'success';
        if (value >= 0.7) return 'warning';
        return 'error';
      case 'failed':
        return 'error';
      case 'completed':
        return 'success';
      default:
        return 'neutral';
    }
  };

  if (loading) {
    return (
      <div className="analysis-metrics loading">
        <div className="loading-spinner"></div>
        <p>Loading metrics...</p>
      </div>
    );
  }

  // Default metrics if none provided
  const defaultMetrics = {
    totalAnalyses: 0,
    completedAnalyses: 0,
    failedAnalyses: 0,
    averageDuration: 0,
    successRate: 0,
    lastAnalysisDate: null,
    analysisTypes: {}
  };

  const displayMetrics = metrics || defaultMetrics;

  const metricCards = [
    {
      key: 'total',
      label: 'Total Analyses',
      value: formatNumber(displayMetrics.totalAnalyses),
      icon: getMetricIcon('total'),
      color: getMetricColor('total')
    },
    {
      key: 'completed',
      label: 'Completed',
      value: formatNumber(displayMetrics.completedAnalyses),
      icon: getMetricIcon('completed'),
      color: getMetricColor('completed')
    },
    {
      key: 'failed',
      label: 'Failed',
      value: formatNumber(displayMetrics.failedAnalyses),
      icon: getMetricIcon('failed'),
      color: getMetricColor('failed')
    },
    {
      key: 'success',
      label: 'Success Rate',
      value: formatPercentage(displayMetrics.successRate),
      icon: getMetricIcon('success'),
      color: getMetricColor('success', displayMetrics.successRate)
    },
    {
      key: 'duration',
      label: 'Avg Duration',
      value: formatDuration(displayMetrics.averageDuration),
      icon: getMetricIcon('duration'),
      color: getMetricColor('duration')
    },
    {
      key: 'last',
      label: 'Last Analysis',
      value: displayMetrics.lastAnalysisDate 
        ? new Date(displayMetrics.lastAnalysisDate).toLocaleDateString()
        : 'Never',
      icon: getMetricIcon('last'),
      color: getMetricColor('last')
    }
  ];

  const renderAnalysisTypes = () => {
    if (!displayMetrics.analysisTypes || Object.keys(displayMetrics.analysisTypes).length === 0) {
      return (
        <div className="no-types-message">
          <p>No analysis types data available</p>
        </div>
      );
    }

    return (
      <div className="analysis-types">
        <h4>Analysis Types</h4>
        <div className="types-grid">
          {Object.entries(displayMetrics.analysisTypes).map(([type, count]) => (
            <div key={type} className="type-item">
              <span className="type-name">{type}</span>
              <span className="type-count">{formatNumber(count)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="analysis-metrics">
      <div className="metrics-header">
        <h3>📊 Analysis Metrics</h3>
        <div className="metrics-summary">
          <span className="summary-text">
            {displayMetrics.totalAnalyses > 0 
              ? `${formatNumber(displayMetrics.totalAnalyses)} total analyses`
              : 'No analyses yet'
            }
          </span>
        </div>
      </div>

      <div className="metrics-grid">
        {metricCards.map((metric) => (
          <div 
            key={metric.key} 
            className={`metric-card ${metric.color}`}
          >
            <div className="metric-icon">
              {metric.icon}
            </div>
            <div className="metric-content">
              <div className="metric-label">{metric.label}</div>
              <div className="metric-value">{metric.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="metrics-details">
        {renderAnalysisTypes()}
      </div>

      {displayMetrics.totalAnalyses === 0 && (
        <div className="no-data-message">
          <p>No analysis data available. Run your first analysis to see metrics.</p>
        </div>
      )}
    </div>
  );
};

export default AnalysisMetrics; 