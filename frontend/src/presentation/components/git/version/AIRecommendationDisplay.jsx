/**
 * AIRecommendationDisplay - Component for displaying AI-powered version recommendations
 * Shows confidence levels, multiple recommendations, and detection method indicators
 */

import React, { useState, useEffect } from 'react';
import { logger } from '@/infrastructure/logging/Logger';

const AIRecommendationDisplay = ({ 
  recommendation, 
  isLoading = false, 
  onRecommendationSelect,
  className = '' 
}) => {
  const [selectedRecommendation, setSelectedRecommendation] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  // Set initial selection when recommendation changes
  useEffect(() => {
    if (recommendation && !selectedRecommendation) {
      setSelectedRecommendation(recommendation);
    }
  }, [recommendation, selectedRecommendation]);

  // Handle recommendation selection
  const handleRecommendationSelect = (rec) => {
    setSelectedRecommendation(rec);
    if (onRecommendationSelect) {
      onRecommendationSelect(rec);
    }
  };

  // Get confidence color based on level
  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return '#27ae60'; // Green - High confidence
    if (confidence >= 0.6) return '#f39c12'; // Orange - Medium confidence
    return '#e74c3c'; // Red - Low confidence
  };

  // Get confidence label
  const getConfidenceLabel = (confidence) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  // Get bump type color
  const getBumpTypeColor = (type) => {
    switch (type) {
      case 'major': return '#e74c3c'; // Red
      case 'minor': return '#f39c12'; // Orange
      case 'patch': return '#27ae60'; // Green
      default: return '#95a5a6'; // Gray
    }
  };

  // Get bump type icon
  const getBumpTypeIcon = (type) => {
    switch (type) {
      case 'major': return '💥';
      case 'minor': return '✨';
      case 'patch': return '🔧';
      default: return '📦';
    }
  };

  // Get detection method label
  const getDetectionMethodLabel = (source) => {
    switch (source) {
      case 'ai': return 'AI Analysis';
      case 'hybrid': return 'Smart Detection';
      case 'rule-based': return 'Rule-Based';
      case 'fallback': return 'Fallback';
      default: return 'Unknown';
    }
  };

  // Get detection method icon
  const getDetectionMethodIcon = (source) => {
    switch (source) {
      case 'ai': return '🤖';
      case 'hybrid': return '🧠';
      case 'rule-based': return '📋';
      case 'fallback': return '⚠️';
      default: return '❓';
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={`ai-recommendation-display loading ${className}`}>
        <div className="recommendation-header">
          <h5>🤖 Smart Detection Analysis</h5>
          <div className="loading-indicator">
            <div className="spinner"></div>
            <span>Analyzing changes...</span>
          </div>
        </div>
      </div>
    );
  }

  // No recommendation state
  if (!recommendation) {
    return (
      <div className={`ai-recommendation-display no-recommendation ${className}`}>
        <div className="recommendation-header">
          <h5>🤖 Smart Detection</h5>
          <p className="no-recommendation-text">
            {isLoading 
              ? 'AI is analyzing your changes automatically...' 
              : 'Enter a task description or leave empty for AI auto-detection'
            }
          </p>
        </div>
      </div>
    );
  }

  // Handle multiple recommendations
  const recommendations = Array.isArray(recommendation) ? recommendation : [recommendation];
  const primaryRecommendation = recommendations[0];

  return (
    <div className={`ai-recommendation-display ${className}`}>
      <div className="recommendation-header">
        <h5>
          {getDetectionMethodIcon(primaryRecommendation.source)} 
          {primaryRecommendation.autoDetected ? 'Auto-Detection' : getDetectionMethodLabel(primaryRecommendation.source)} Result
        </h5>
        <button
          className="details-toggle"
          onClick={() => setShowDetails(!showDetails)}
          title={showDetails ? 'Hide details' : 'Show details'}
        >
          {showDetails ? '▼' : '▶'}
        </button>
      </div>

      {/* Primary Recommendation */}
      <div className="primary-recommendation">
        <div className="recommendation-card">
          <div className="recommendation-main">
            <div className="bump-type-section">
              <div 
                className="bump-type-badge"
                style={{ backgroundColor: getBumpTypeColor(primaryRecommendation.recommendedType) }}
              >
                {getBumpTypeIcon(primaryRecommendation.recommendedType)}
                {primaryRecommendation.recommendedType.toUpperCase()}
              </div>
              <div className="confidence-section">
                <div className="confidence-label">Confidence</div>
                <div 
                  className="confidence-bar"
                  style={{ backgroundColor: getConfidenceColor(primaryRecommendation.confidence) }}
                >
                  <div 
                    className="confidence-fill"
                    style={{ 
                      width: `${primaryRecommendation.confidence * 100}%`,
                      backgroundColor: getConfidenceColor(primaryRecommendation.confidence)
                    }}
                  ></div>
                </div>
                <div 
                  className="confidence-text"
                  style={{ color: getConfidenceColor(primaryRecommendation.confidence) }}
                >
                  {Math.round(primaryRecommendation.confidence * 100)}% ({getConfidenceLabel(primaryRecommendation.confidence)})
                </div>
              </div>
            </div>
            
            <div className="recommendation-reasoning">
              <p>{primaryRecommendation.reasoning}</p>
              {primaryRecommendation.autoDetected && (
                <div className="auto-detection-badge">
                  🤖 <strong>Auto-Detected:</strong> AI analyzed your git changes automatically
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Multiple Recommendations */}
      {recommendations.length > 1 && (
        <div className="multiple-recommendations">
          <h6>Alternative Recommendations</h6>
          <div className="recommendation-options">
            {recommendations.slice(1).map((rec, index) => (
              <div
                key={index}
                className={`recommendation-option ${selectedRecommendation === rec ? 'selected' : ''}`}
                onClick={() => handleRecommendationSelect(rec)}
              >
                <div className="option-header">
                  <div 
                    className="option-bump-type"
                    style={{ backgroundColor: getBumpTypeColor(rec.recommendedType) }}
                  >
                    {getBumpTypeIcon(rec.recommendedType)} {rec.recommendedType.toUpperCase()}
                  </div>
                  <div 
                    className="option-confidence"
                    style={{ color: getConfidenceColor(rec.confidence) }}
                  >
                    {Math.round(rec.confidence * 100)}%
                  </div>
                </div>
                <div className="option-reasoning">
                  {rec.reasoning.substring(0, 100)}...
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Information */}
      {showDetails && (
        <div className="recommendation-details">
          {/* User-Friendly Changelog */}
          {primaryRecommendation.changelog && Array.isArray(primaryRecommendation.changelog) && primaryRecommendation.changelog.length > 0 && (
            <div className="details-section">
              <h6>📝 Generated Changelog</h6>
              <ul className="changelog-list">
                {primaryRecommendation.changelog.map((item, index) => (
                  <li key={index} className="changelog-item">
                    <span className="changelog-icon">•</span>
                    <span className="changelog-text">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Categorized Changes */}
          {(primaryRecommendation.features || primaryRecommendation.fixes || primaryRecommendation.breaking) && (
            <div className="details-section">
              <h6>📋 Categorized Changes</h6>
              
              {primaryRecommendation.features && Array.isArray(primaryRecommendation.features) && primaryRecommendation.features.length > 0 && (
                <div className="change-category">
                  <h7>✨ New Features</h7>
                  <ul className="changes-list">
                    {primaryRecommendation.features.map((feature, index) => (
                      <li key={index} className="change-item">
                        <span className="change-icon">•</span>
                        <span className="change-text">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {primaryRecommendation.fixes && Array.isArray(primaryRecommendation.fixes) && primaryRecommendation.fixes.length > 0 && (
                <div className="change-category">
                  <h7>🔧 Bug Fixes</h7>
                  <ul className="changes-list">
                    {primaryRecommendation.fixes.map((fix, index) => (
                      <li key={index} className="change-item">
                        <span className="change-icon">•</span>
                        <span className="change-text">{fix}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {primaryRecommendation.breaking && Array.isArray(primaryRecommendation.breaking) && primaryRecommendation.breaking.length > 0 && (
                <div className="change-category">
                  <h7>💥 Breaking Changes</h7>
                  <ul className="changes-list">
                    {primaryRecommendation.breaking.map((breaking, index) => (
                      <li key={index} className="change-item">
                        <span className="change-icon">•</span>
                        <span className="change-text">{breaking}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Analysis Factors (Technical) */}
          {primaryRecommendation.factors && Array.isArray(primaryRecommendation.factors) && primaryRecommendation.factors.length > 0 && (
            <div className="details-section">
              <h6>🔍 Analysis Factors</h6>
              <ul className="factors-list">
                {primaryRecommendation.factors.map((factor, index) => (
                  <li key={index} className="factor-item">
                    <span className="factor-icon">•</span>
                    <span className="factor-text">{factor}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="details-section">
            <h6>Detection Method</h6>
            <div className="detection-method-info">
              <div className="method-badge">
                {getDetectionMethodIcon(primaryRecommendation.source)}
                {getDetectionMethodLabel(primaryRecommendation.source)}
              </div>
              {primaryRecommendation.timestamp && (
                <div className="analysis-timestamp">
                  Analyzed: {new Date(primaryRecommendation.timestamp).toLocaleString()}
                </div>
              )}
            </div>
          </div>

          {primaryRecommendation.error && (
            <div className="details-section error-section">
              <h6>Analysis Notes</h6>
              <div className="error-info">
                <span className="error-icon">⚠️</span>
                <span className="error-text">{primaryRecommendation.error}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="recommendation-actions">
        <button
          className="action-btn primary"
          onClick={() => handleRecommendationSelect(primaryRecommendation)}
        >
          Use {primaryRecommendation.recommendedType.toUpperCase()} Recommendation
        </button>
        
        {recommendations.length > 1 && (
          <button
            className="action-btn secondary"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? 'Hide' : 'View'} All Options
          </button>
        )}
      </div>
    </div>
  );
};

export default AIRecommendationDisplay;
