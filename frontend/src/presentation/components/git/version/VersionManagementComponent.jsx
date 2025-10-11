/**
 * VersionManagementComponent - Comprehensive version management UI
 * Provides version bumping, history, configuration, and smart recommendations
 */

import { logger } from "@/infrastructure/logging/Logger";
import React, { useState, useEffect, useCallback } from 'react';
import '@/scss/pages/_version-management.scss';;
import VersionManagementRepository from '@/infrastructure/repositories/VersionManagementRepository.jsx';
import { useActiveIDE } from '@/infrastructure/stores/selectors/ProjectSelectors.jsx';
import useIDEStore from '@/infrastructure/stores/IDEStore.jsx';
import AIRecommendationDisplay from './AIRecommendationDisplay.jsx';

// Initialize repository
const versionRepository = new VersionManagementRepository();

// Utility function to convert workspace path to project ID
const getProjectIdFromWorkspace = (workspacePath) => {
  if (!workspacePath) return 'default';
  
  // Extract project name from path
  const pathParts = workspacePath.split('/');
  const projectName = pathParts[pathParts.length - 1];
  
  // Keep original case - Backend now supports it
  return projectName.replace(/[^a-zA-Z0-9]/g, '_');
};

const VersionManagementComponent = ({ activePort, eventBus }) => {
  // Global state
  const activeIDE = useActiveIDE();
  const workspacePath = activeIDE.workspacePath;
  const { aiVersionAnalysis } = useIDEStore();

  // Local state for UI
  const [activeTab, setActiveTab] = useState('current');
  const [isLoading, setIsLoading] = useState(false);
  const [operationResult, setOperationResult] = useState(null);
  
  // Version data state
  const [currentVersion, setCurrentVersion] = useState(null);
  const [versionHistory, setVersionHistory] = useState([]);
  const [configuration, setConfiguration] = useState(null);
  const [bumpRecommendation, setBumpRecommendation] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Form state
  const [bumpForm, setBumpForm] = useState({
    changelog: '',
    bumpType: 'auto',
    customVersion: ''
  });

  // Handle AI recommendation selection
  const handleAIRecommendationSelect = useCallback((recommendation) => {
    if (recommendation && recommendation.recommendedType) {
      logger.info('🔍 handleAIRecommendationSelect called with:', recommendation);
      logger.info('🔍 recommendation.newVersion:', recommendation.newVersion);
      logger.info('🔍 recommendation.currentVersion:', recommendation.currentVersion);
      
      // Set the bump type and use the new version from backend
      setBumpForm(prev => {
        const newForm = { 
          ...prev, 
          bumpType: recommendation.recommendedType,
          customVersion: recommendation.newVersion || '' // Use newVersion from backend
        };
        logger.info('🔍 Setting bumpForm to:', newForm);
        return newForm;
      });
      setBumpRecommendation(recommendation);
      
      logger.info(`✅ AI recommendation selected: ${recommendation.recommendedType} → ${recommendation.newVersion} (confidence: ${recommendation.confidence})`);
      
      // Auto-fill changelog if empty and AI has generated one
      if (!bumpForm.changelog.trim()) {
        let autoDescription = '';
        
        // Priority 1: Use the new changelog field (user-friendly changelog)
        if (recommendation.changelog && Array.isArray(recommendation.changelog)) {
          autoDescription = recommendation.changelog.join('\n• ');
          if (autoDescription) {
            autoDescription = '• ' + autoDescription;
          }
          logger.info('✅ AI auto-filled changelog with user-friendly changelog:', autoDescription);
        }
        // Priority 2: Use factors array (analysis factors)
        else if (recommendation.factors && Array.isArray(recommendation.factors)) {
          autoDescription = recommendation.factors.join('\n• ');
          if (autoDescription) {
            autoDescription = '• ' + autoDescription;
          }
          logger.info('✅ AI auto-filled changelog with analysis factors:', autoDescription);
        } 
        // Priority 3: Fallback to reasoning if no structured data available
        else if (recommendation.reasoning) {
          autoDescription = recommendation.reasoning.length > 200 
            ? recommendation.reasoning.substring(0, 200) + '...'
            : recommendation.reasoning;
          logger.info('✅ AI auto-filled changelog with reasoning fallback:', autoDescription);
        }
        
        if (autoDescription) {
          setBumpForm(prev => ({ 
            ...prev, 
            changelog: autoDescription,
            bumpType: recommendation.recommendedType,
            customVersion: recommendation.newVersion || '' // Use newVersion from backend
          }));
        }
      }
      
      logger.info('✅ AI recommendation selected:', recommendation);
    }
  }, [bumpForm.changelog]);

  // Get AI analysis (supports empty changelog for auto-detection)
  const getAIAnalysis = useCallback(async (changelog) => {
    if (!workspacePath) return;
    
    try {
      setIsAnalyzing(true);
      
      // Start AI analysis via HTTP (triggers backend)
      const result = await versionRepository.getAIAnalysis(changelog || '', workspacePath, {
        autoDetectChanges: !changelog || !changelog.trim(),
        analyzeGitDiff: true,
        analyzeCommits: true,
        analyzeDependencies: true,
        bumpType: bumpForm.bumpType,
        // Removed customVersion - backend handles version calculation
      });
      
      // The result will come via Event System, not HTTP response
      logger.info('✅ AI analysis started, waiting for event...');
      
    } catch (error) {
      logger.error('❌ Error starting AI analysis:', error);
      setAiAnalysis(null);
      setIsAnalyzing(false);
    }
  }, [workspacePath, handleAIRecommendationSelect]);

  // Load initial data
  useEffect(() => {
    if (workspacePath) {
      loadCurrentVersion();
      loadVersionHistory();
      loadConfiguration();
    }
  }, [workspacePath]);

  // Listen for AI analysis from IDEStore
  useEffect(() => {
    if (aiVersionAnalysis && aiVersionAnalysis.recommendedType) {
      logger.info('🔍 AI analysis received from IDEStore:', aiVersionAnalysis);
      setAiAnalysis(aiVersionAnalysis);
      setIsAnalyzing(false);
      
      // Automatically trigger the recommendation selection to fill the form
      logger.info('🚀 Calling handleAIRecommendationSelect with:', aiVersionAnalysis);
      logger.info('🔍 AI analysis has newVersion:', aiVersionAnalysis.newVersion);
      handleAIRecommendationSelect(aiVersionAnalysis);
    }
  }, [aiVersionAnalysis, handleAIRecommendationSelect]);

  // Load current version
  const loadCurrentVersion = useCallback(async () => {
    if (!workspacePath) return;
    
    try {
      setIsLoading(true);
      const result = await versionRepository.getCurrentVersion(workspacePath);
      
      if (result.success) {
        setCurrentVersion(result.data);
        logger.info('✅ Current version loaded:', result.data);
      } else {
        setOperationResult({ type: 'error', message: result.error || 'Failed to load current version' });
      }
    } catch (error) {
      logger.error('❌ Error loading current version:', error);
      setOperationResult({ type: 'error', message: error.message });
    } finally {
      setIsLoading(false);
    }
  }, [workspacePath]);

  // Load version history
  const loadVersionHistory = useCallback(async () => {
    if (!workspacePath) return;
    
    try {
      const result = await versionRepository.getVersionHistory();
      
      if (result.success) {
        setVersionHistory(result.data || []);
        logger.info('✅ Version history loaded:', result.data);
      } else {
        logger.warn('⚠️ Failed to load version history:', result.error);
      }
    } catch (error) {
      logger.error('❌ Error loading version history:', error);
    }
  }, []);

  // Load configuration
  const loadConfiguration = useCallback(async () => {
    try {
      const result = await versionRepository.getConfiguration();
      
      if (result.success) {
        setConfiguration(result.data);
        logger.info('✅ Configuration loaded:', result.data);
      } else {
        logger.warn('⚠️ Failed to load configuration:', result.error);
      }
    } catch (error) {
      logger.error('❌ Error loading configuration:', error);
    }
  }, []);

  // Determine bump type
  const determineBumpType = useCallback(async (changelog) => {
    if (!workspacePath || !changelog.trim()) return;
    
    try {
      setIsLoading(true);
      const result = await versionRepository.determineBumpType(changelog, workspacePath);
      
      if (result.success) {
        setBumpRecommendation(result.data);
        setBumpForm(prev => ({ ...prev, bumpType: result.data.recommendedType || 'auto' }));
        logger.info('✅ Bump type determined:', result.data);
      } else {
        setOperationResult({ type: 'error', message: result.error || 'Failed to determine bump type' });
      }
    } catch (error) {
      logger.error('❌ Error determining bump type:', error);
      setOperationResult({ type: 'error', message: error.message });
    } finally {
      setIsLoading(false);
    }
  }, [workspacePath]);

  // Bump version (with dry run support)
  const handleBumpVersion = async (actualBump = false) => {
    if (!workspacePath) {
      setOperationResult({ type: 'error', message: 'Workspace path is required' });
      return;
    }

    // Task description is now optional - AI will auto-detect changes
    const changelogDescription = bumpForm.changelog.trim() || 'Auto-detected changes';

    try {
      setIsLoading(true);
      setOperationResult(null);
      
      const bumpType = bumpForm.bumpType === 'auto' ? null : bumpForm.bumpType;
      
      const result = await versionRepository.bumpVersion(
        changelogDescription,
        workspacePath,
        bumpType,
        { 
          // Removed customVersion - backend handles version calculation,
          dryRun: !actualBump, // true = dry run, false = actual bump
          autoDetectChanges: !bumpForm.changelog.trim(), // Auto-detect if no description provided
          analyzeGitDiff: true,
          analyzeCommits: true,
          analyzeDependencies: true
        }
      );
      
      if (result.success) {
        if (actualBump) {
          setOperationResult({ type: 'success', message: result.message || 'Version bumped successfully!' });
          
          // Reload data only for actual bump
          await Promise.all([
            loadCurrentVersion(),
            loadVersionHistory()
          ]);
          
          // Reset form only for actual bump
          setBumpForm({ changelog: '', bumpType: 'auto', customVersion: '' });
          setBumpRecommendation(null);
          
          logger.info('✅ Version bumped successfully:', result.data);
        } else {
          // Dry run - show preview
          setOperationResult({ 
            type: 'info', 
            message: `Preview: Would bump to ${result.data.newVersion} (${result.data.bumpType})`,
            preview: result.data
          });
          logger.info('🔍 Version bump preview:', result.data);
        }
      } else {
        setOperationResult({ type: 'error', message: result.error || 'Failed to analyze version bump' });
      }
    } catch (error) {
      logger.error('❌ Error bumping version:', error);
      setOperationResult({ type: 'error', message: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  // Validate version
  const handleValidateVersion = async (version) => {
    try {
      setIsLoading(true);
      const result = await versionRepository.validateVersion(version);
      
      if (result.success) {
        setOperationResult({ type: 'success', message: `Version ${version} is valid` });
      } else {
        setOperationResult({ type: 'error', message: result.error || 'Invalid version format' });
      }
    } catch (error) {
      logger.error('❌ Error validating version:', error);
      setOperationResult({ type: 'error', message: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  // Format version for display
  const formatVersion = (version) => {
    if (!version) return 'Unknown';
    return version.startsWith('v') ? version : `v${version}`;
  };

  // Get version type color
  const getVersionTypeColor = (version) => {
    if (!version) return '#666';
    const parts = version.split('.');
    if (parts.length >= 3) {
      const patch = parseInt(parts[2]);
      const minor = parseInt(parts[1]);
      const major = parseInt(parts[0]);
      
      if (major > 0) return '#e74c3c'; // Red for major
      if (minor > 0) return '#f39c12'; // Orange for minor
      return '#27ae60'; // Green for patch
    }
    return '#666';
  };

  // Get bump type description
  const getBumpTypeDescription = (type) => {
    const descriptions = {
      major: 'Breaking changes - not backward compatible',
      minor: 'New features - backward compatible',
      patch: 'Bug fixes and minor changes',
      auto: 'Automatically determine based on changes'
    };
    return descriptions[type] || 'Unknown bump type';
  };

  return (
    <div className="version-management__version-management">
      {/* Header */}
      <div className="version-management__version-header">
        <div className="version-management__version-title">
          <h3>📦 Version Management</h3>
          {currentVersion && (
            <div className="version-management__current-version-display">
              <span 
                className="version-management__version-badge"
                style={{ backgroundColor: getVersionTypeColor(currentVersion.version) }}
              >
                {formatVersion(currentVersion.version)}
              </span>
              <span className={`version-management__version-status ${currentVersion.isValid ? 'version-management__status-valid' : 'version-management__status-invalid'}`}>
                {currentVersion.isValid ? '✅ Valid' : '❌ Invalid'}
              </span>
            </div>
          )}
        </div>
        
        <div className="version-management__version-actions">
          <button
            onClick={loadCurrentVersion}
            className="version-management__action-btn"
            disabled={isLoading}
            title="Refresh version data"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Workspace Info */}
      {workspacePath && (
        <div className="version-management__workspace-info">
          <span className="version-management__workspace-label">Workspace:</span>
          <span className="version-management__workspace-path">{workspacePath}</span>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="version-management__version-nav">
        <button
          className={`version-management__version-nav-item ${activeTab === 'current' ? 'active' : ''}`}
          onClick={() => setActiveTab('current')}
        >
          📍 Current
        </button>
        <button
          className={`version-management__version-nav-item ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          📚 History
        </button>
        <button
          className={`version-management__version-nav-item ${activeTab === 'bump' ? 'active' : ''}`}
          onClick={() => setActiveTab('bump')}
        >
          🚀 Bump
        </button>
        <button
          className={`version-management__version-nav-item ${activeTab === 'config' ? 'active' : ''}`}
          onClick={() => setActiveTab('config')}
        >
          ⚙️ Config
        </button>
      </div>

      {/* Tab Content */}
      <div className="version-management__version-content">
        {/* Current Version Tab */}
        {activeTab === 'current' && (
          <div className="version-management__current-section">
            {currentVersion ? (
              <div>
                <div className="version-management__version-info">
                  <div className="version-management__info-item">
                    <span className="version-management__info-label">Current Version:</span>
                    <span className="version-management__info-value">{formatVersion(currentVersion.version)}</span>
                  </div>
                  <div className="version-management__info-item">
                    <span className="version-management__info-label">Package Files:</span>
                    <span className="version-management__info-value">{currentVersion.packageFiles || 0} files</span>
                  </div>
                  <div className="version-management__info-item">
                    <span className="version-management__info-label">Last Updated:</span>
                    <span className="version-management__info-value">
                      {currentVersion.lastUpdated ? new Date(currentVersion.lastUpdated).toLocaleString() : 'Unknown'}
                    </span>
                  </div>
                  <div className="version-management__info-item">
                    <span className="version-management__info-label">Git Tag:</span>
                    <span className="version-management__info-value">
                      {currentVersion.gitTag ? `✅ ${currentVersion.gitTag}` : '❌ No tag'}
                    </span>
                  </div>
                </div>

                {currentVersion.packageFiles && currentVersion.packageFiles.length > 0 && (
                  <div className="version-management__package-files-card">
                    <h4>Package Files</h4>
                    <ul className="version-management__package-files-list">
                      {currentVersion.packageFiles.map((file, index) => (
                        <li key={index} className="version-management__package-file-item">
                          <span className="version-management__file-path">{file.path}</span>
                          <span className="version-management__file-version">{formatVersion(file.version)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="no-data">
                <p>No version information available</p>
                <button onClick={loadCurrentVersion} className="version-btn">
                  Load Version Info
                </button>
              </div>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="version-tab-content">
            <div className="version-history">
              <h4>Version History</h4>
              {versionHistory.length > 0 ? (
                <div className="history-timeline">
                  {versionHistory.map((entry, index) => (
                    <div key={index} className="history-entry">
                      <div className="history-version">
                        <span 
                          className="version-badge"
                          style={{ backgroundColor: getVersionTypeColor(entry.version) }}
                        >
                          {formatVersion(entry.version)}
                        </span>
                        <span className="history-date">
                          {new Date(entry.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div className="history-details">
                        <div className="history-changelog">{entry.changelog || 'No description'}</div>
                        <div className="history-bump-type">
                          Bump Type: <span className="bump-type-badge">{entry.bumpType}</span>
                        </div>
                        {entry.changes && (
                          <div className="history-changes">
                            Changes: {entry.changes.files} files, {entry.changes.lines} lines
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-data">
                  <p>No version history available</p>
                  <button onClick={loadVersionHistory} className="version-btn">
                    Load History
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bump Tab */}
        {activeTab === 'bump' && (
          <div className="version-tab-content">
            <div className="version-bump">
              <h4>Bump Version</h4>
              
              <div className="version-management__bump-form">
                <div className="version-management__form-group">
                  <label htmlFor="changelog" className="version-management__form-label">
                    Changelog 
                    <span className="version-management__optional-label">(Optional - AI will analyze your changes automatically)</span>
                  </label>
                  <textarea
                    id="changelog"
                    value={bumpForm.changelog}
                    onChange={(e) => {
                      setBumpForm(prev => ({ ...prev, changelog: e.target.value }));
                      // No automatic analysis on typing - only when user clicks "Generate with AI"
                    }}
                    placeholder="Describe what changes you made in this changelog (optional - leave empty for AI auto-detection)"
                    rows={3}
                    className="version-management__form-textarea"
                  />
                  <div className="version-management__form-help">
                    💡 <strong>Smart Tip:</strong> Leave empty to let AI automatically analyze your git changes!
                  </div>
                </div>

                <div className="version-management__form-group">
                  <label htmlFor="bumpType" className="version-management__form-label">Bump Type</label>
                  <select
                    id="bumpType"
                    value={bumpForm.bumpType}
                    onChange={(e) => setBumpForm(prev => ({ ...prev, bumpType: e.target.value }))}
                    className="version-management__form-select"
                  >
                    <option value="auto">🤖 Smart Detection (Recommended)</option>
                    <option value="patch">🔧 Patch (Bug fixes)</option>
                    <option value="minor">✨ Minor (New features)</option>
                    <option value="major">💥 Major (Breaking changes)</option>
                  </select>
                  <div className="version-management__bump-type-description">
                    {getBumpTypeDescription(bumpForm.bumpType)}
                  </div>
                </div>

                {/* AI Analysis Display */}
                <AIRecommendationDisplay
                  recommendation={aiAnalysis}
                  isLoading={isAnalyzing}
                  onRecommendationSelect={handleAIRecommendationSelect}
                  className="ai-analysis-section"
                />

                {/* Legacy Recommendation Display (fallback) */}
                {bumpRecommendation && !aiAnalysis && (
                  <div className="bump-recommendation">
                    <h5>🤖 Smart Detection Result</h5>
                    <div className="recommendation-content">
                      <div className="recommended-type">
                        Recommended: <span className="recommended-badge">{bumpRecommendation.recommendedType}</span>
                      </div>
                      <div className="recommendation-reason">
                        {bumpRecommendation.reason}
                      </div>
                      {bumpRecommendation.confidence && (
                        <div className="confidence-level">
                          Confidence: {Math.round(bumpRecommendation.confidence * 100)}%
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="version-management__form-group">
                  <label htmlFor="customVersion" className="version-management__form-label">
                    Custom Version (Optional){currentVersion ? ` - Current: ${typeof currentVersion === 'string' ? currentVersion : currentVersion.version || 'Unknown'}` : ''}
                  </label>
                  <input
                    id="customVersion"
                    type="text"
                    value={bumpForm.customVersion}
                    onChange={(e) => setBumpForm(prev => ({ ...prev, customVersion: e.target.value }))}
                    placeholder="e.g., 2.1.0-beta.1"
                    className="version-management__form-input"
                  />
                </div>

                <div className="version-management__form-actions">
                  <button
                    onClick={() => getAIAnalysis(bumpForm.changelog)} // AI Analysis
                    disabled={isAnalyzing}
                    className="version-management__analyze-btn"
                  >
                    {isAnalyzing ? '🤖 AI Analyzing...' : '🤖 Generate with AI'}
                  </button>
                  
                  <button
                    onClick={() => handleBumpVersion(true)} // true = actual bump
                    disabled={isLoading}
                    className="version-management__bump-btn"
                  >
                    {isLoading ? '⏳ Bumping...' : '🚀 Bump Version'}
                  </button>
                  
                  {bumpForm.customVersion && (
                    <button
                      onClick={() => handleValidateVersion(bumpForm.customVersion)}
                      disabled={isLoading}
                      className="version-btn secondary"
                    >
                      ✅ Validate
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Config Tab */}
        {activeTab === 'config' && (
          <div className="version-tab-content">
            <div className="version-config">
              <h4>Configuration</h4>
              {configuration ? (
                <div className="config-details">
                  <div className="config-section">
                    <h5>Version Management</h5>
                    <div className="config-item">
                      <span className="config-label">Auto Bump:</span>
                      <span className="config-value">{configuration.versionManagement?.autoBump ? '✅ Enabled' : '❌ Disabled'}</span>
                    </div>
                    <div className="config-item">
                      <span className="config-label">Semantic Versioning:</span>
                      <span className="config-value">{configuration.versionManagement?.semanticVersioning ? '✅ Enabled' : '❌ Disabled'}</span>
                    </div>
                    <div className="config-item">
                      <span className="config-label">Create Git Tags:</span>
                      <span className="config-value">{configuration.versionManagement?.createGitTags ? '✅ Enabled' : '❌ Disabled'}</span>
                    </div>
                  </div>

                  <div className="config-section">
                    <h5>Changelog</h5>
                    <div className="config-item">
                      <span className="config-label">Enabled:</span>
                      <span className="config-value">{configuration.changelog?.enabled ? '✅ Enabled' : '❌ Disabled'}</span>
                    </div>
                    <div className="config-item">
                      <span className="config-label">Conventional Commits:</span>
                      <span className="config-value">{configuration.changelog?.conventionalCommits ? '✅ Enabled' : '❌ Disabled'}</span>
                    </div>
                    <div className="config-item">
                      <span className="config-label">Output Path:</span>
                      <span className="config-value">{configuration.changelog?.outputPath || 'Not set'}</span>
                    </div>
                  </div>

                  <div className="config-section">
                    <h5>Security</h5>
                    <div className="config-item">
                      <span className="config-label">Validate Versions:</span>
                      <span className="config-value">{configuration.security?.validateVersions ? '✅ Enabled' : '❌ Disabled'}</span>
                    </div>
                    <div className="config-item">
                      <span className="config-label">Rate Limiting:</span>
                      <span className="config-value">{configuration.security?.rateLimit?.enabled ? '✅ Enabled' : '❌ Disabled'}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="no-data">
                  <p>No configuration available</p>
                  <button onClick={loadConfiguration} className="version-btn">
                    Load Configuration
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Operation Result */}
      {operationResult && (
        <div className={`operation-result ${operationResult.type}`}>
          <span className="result-icon">
            {operationResult.type === 'success' ? '✅' : '❌'}
          </span>
          <span className="result-message">{operationResult.message}</span>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner">⏳</div>
          <span>Processing version operation...</span>
        </div>
      )}
    </div>
  );
};

export default VersionManagementComponent;
