/**
 * VersionManagementComponent - Comprehensive version management UI
 * Provides version bumping, history, configuration, and smart recommendations
 */

import { logger } from "@/infrastructure/logging/Logger";
import React, { useState, useEffect, useCallback } from 'react';
import '@/css/main/version-management.css';
import VersionManagementRepository from '@/infrastructure/repositories/VersionManagementRepository.jsx';
import { useActiveIDE } from '@/infrastructure/stores/selectors/ProjectSelectors.jsx';

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

  // Local state for UI
  const [activeTab, setActiveTab] = useState('current');
  const [isLoading, setIsLoading] = useState(false);
  const [operationResult, setOperationResult] = useState(null);
  
  // Version data state
  const [currentVersion, setCurrentVersion] = useState(null);
  const [versionHistory, setVersionHistory] = useState([]);
  const [configuration, setConfiguration] = useState(null);
  const [bumpRecommendation, setBumpRecommendation] = useState(null);
  
  // Form state
  const [bumpForm, setBumpForm] = useState({
    task: '',
    bumpType: 'auto',
    customVersion: ''
  });

  // Load initial data
  useEffect(() => {
    if (workspacePath) {
      loadCurrentVersion();
      loadVersionHistory();
      loadConfiguration();
    }
  }, [workspacePath]);

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
  const determineBumpType = useCallback(async (task) => {
    if (!workspacePath || !task.trim()) return;
    
    try {
      setIsLoading(true);
      const result = await versionRepository.determineBumpType(task, workspacePath);
      
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

  // Bump version
  const handleBumpVersion = async () => {
    if (!workspacePath || !bumpForm.task.trim()) {
      setOperationResult({ type: 'error', message: 'Task description is required' });
      return;
    }

    try {
      setIsLoading(true);
      setOperationResult(null);
      
      const bumpType = bumpForm.bumpType === 'auto' ? null : bumpForm.bumpType;
      
      const result = await versionRepository.bumpVersion(
        bumpForm.task,
        workspacePath,
        bumpType,
        { customVersion: bumpForm.customVersion }
      );
      
      if (result.success) {
        setOperationResult({ type: 'success', message: result.message || 'Version bumped successfully!' });
        
        // Reload data
        await Promise.all([
          loadCurrentVersion(),
          loadVersionHistory()
        ]);
        
        // Reset form
        setBumpForm({ task: '', bumpType: 'auto', customVersion: '' });
        setBumpRecommendation(null);
        
        logger.info('✅ Version bumped successfully:', result.data);
      } else {
        setOperationResult({ type: 'error', message: result.error || 'Failed to bump version' });
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
    <div className="version-management">
      {/* Header */}
      <div className="version-header">
        <div className="version-title">
          <h3>📦 Version Management</h3>
          {currentVersion && (
            <div className="current-version-display">
              <span 
                className="version-badge"
                style={{ backgroundColor: getVersionTypeColor(currentVersion.version) }}
              >
                {formatVersion(currentVersion.version)}
              </span>
              <span className="version-status">
                {currentVersion.isValid ? '✅ Valid' : '❌ Invalid'}
              </span>
            </div>
          )}
        </div>
        
        <div className="version-actions">
          <button
            onClick={loadCurrentVersion}
            className="version-btn refresh-btn"
            disabled={isLoading}
            title="Refresh version data"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Workspace Info */}
      {workspacePath && (
        <div className="workspace-info">
          <span className="workspace-label">Workspace:</span>
          <span className="workspace-path">{workspacePath}</span>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="version-tabs">
        <button
          className={`version-tab ${activeTab === 'current' ? 'active' : ''}`}
          onClick={() => setActiveTab('current')}
        >
          📍 Current
        </button>
        <button
          className={`version-tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          📚 History
        </button>
        <button
          className={`version-tab ${activeTab === 'bump' ? 'active' : ''}`}
          onClick={() => setActiveTab('bump')}
        >
          🚀 Bump
        </button>
        <button
          className={`version-tab ${activeTab === 'config' ? 'active' : ''}`}
          onClick={() => setActiveTab('config')}
        >
          ⚙️ Config
        </button>
      </div>

      {/* Tab Content */}
      <div className="version-content">
        {/* Current Version Tab */}
        {activeTab === 'current' && (
          <div className="version-tab-content">
            {currentVersion ? (
              <div className="current-version-details">
                <div className="version-info-card">
                  <h4>Version Information</h4>
                  <div className="version-details">
                    <div className="version-detail">
                      <span className="detail-label">Current Version:</span>
                      <span className="detail-value">{formatVersion(currentVersion.version)}</span>
                    </div>
                    <div className="version-detail">
                      <span className="detail-label">Package Files:</span>
                      <span className="detail-value">{currentVersion.packageFiles?.length || 0} files</span>
                    </div>
                    <div className="version-detail">
                      <span className="detail-label">Last Updated:</span>
                      <span className="detail-value">
                        {currentVersion.lastUpdated ? new Date(currentVersion.lastUpdated).toLocaleString() : 'Unknown'}
                      </span>
                    </div>
                    <div className="version-detail">
                      <span className="detail-label">Git Tag:</span>
                      <span className="detail-value">
                        {currentVersion.gitTag ? `✅ ${currentVersion.gitTag}` : '❌ No tag'}
                      </span>
                    </div>
                  </div>
                </div>

                {currentVersion.packageFiles && currentVersion.packageFiles.length > 0 && (
                  <div className="package-files-card">
                    <h4>Package Files</h4>
                    <ul className="package-files-list">
                      {currentVersion.packageFiles.map((file, index) => (
                        <li key={index} className="package-file-item">
                          <span className="file-path">{file.path}</span>
                          <span className="file-version">{formatVersion(file.version)}</span>
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
                        <div className="history-task">{entry.task || 'No description'}</div>
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
              
              <div className="bump-form">
                <div className="form-group">
                  <label htmlFor="task">Task Description *</label>
                  <textarea
                    id="task"
                    value={bumpForm.task}
                    onChange={(e) => {
                      setBumpForm(prev => ({ ...prev, task: e.target.value }));
                      if (e.target.value.trim()) {
                        determineBumpType(e.target.value);
                      }
                    }}
                    placeholder="Describe what changes you made (e.g., 'Added user authentication', 'Fixed login bug')"
                    rows={3}
                    className="form-textarea"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="bumpType">Bump Type</label>
                  <select
                    id="bumpType"
                    value={bumpForm.bumpType}
                    onChange={(e) => setBumpForm(prev => ({ ...prev, bumpType: e.target.value }))}
                    className="form-select"
                  >
                    <option value="auto">🤖 Auto (Recommended)</option>
                    <option value="patch">🔧 Patch (Bug fixes)</option>
                    <option value="minor">✨ Minor (New features)</option>
                    <option value="major">💥 Major (Breaking changes)</option>
                  </select>
                  <div className="bump-type-description">
                    {getBumpTypeDescription(bumpForm.bumpType)}
                  </div>
                </div>

                {bumpRecommendation && (
                  <div className="bump-recommendation">
                    <h5>🤖 AI Recommendation</h5>
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

                <div className="form-group">
                  <label htmlFor="customVersion">Custom Version (Optional)</label>
                  <input
                    id="customVersion"
                    type="text"
                    value={bumpForm.customVersion}
                    onChange={(e) => setBumpForm(prev => ({ ...prev, customVersion: e.target.value }))}
                    placeholder="e.g., 2.1.0-beta.1"
                    className="form-input"
                  />
                </div>

                <div className="form-actions">
                  <button
                    onClick={handleBumpVersion}
                    disabled={isLoading || !bumpForm.task.trim()}
                    className="version-btn primary"
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
