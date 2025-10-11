import { logger } from "@/infrastructure/logging/Logger";
import React, { useState, useEffect, useCallback } from 'react';
import '@/scss/pages/_git.scss';;
import { apiCall, APIChatRepository } from '@/infrastructure/repositories/APIChatRepository.jsx';
import PideaAgentBranchComponent from '../pidea-agent/PideaAgentBranchComponent.jsx';
import VersionManagementComponent from '../version/VersionManagementComponent.jsx';
import { useGitStatus, useGitBranches, useActiveIDE, useProjectDataActions } from '@/infrastructure/stores/selectors/ProjectSelectors.jsx';
import { useRefreshService } from '@/hooks/useRefreshService';

// Initialize API repository
const apiRepository = new APIChatRepository();

// Utility function to convert workspace path to project ID
const getProjectIdFromWorkspace = (workspacePath) => {
  if (!workspacePath) return 'default';
  
  // Extract project name from path
  const pathParts = workspacePath.split('/');
  const projectName = pathParts[pathParts.length - 1];
  
  // Keep original case - Backend now supports it
  return projectName.replace(/[^a-zA-Z0-9]/g, '_');
};

const GitManagementComponent = ({ activePort, onGitOperation, onGitStatusChange, eventBus }) => {
  // ✅ REFACTORED: Use global state selectors instead of local state
  const gitStatus = useGitStatus();
  const gitBranches = useGitBranches();
  const activeIDE = useActiveIDE();
  const { refreshGitStatus } = useProjectDataActions();

  // ✅ DISABLED: RefreshService for git - NO MORE AUTOMATIC POLLING!
  // const { forceRefresh, getStats } = useRefreshService('git', {
  //   fetchData: async () => {
  //     if (activeIDE.workspacePath) {
  //       const projectId = getProjectIdFromWorkspace(activeIDE.workspacePath);
  //       return await apiRepository.getGitStatus(projectId);
  //     }
  //     return null;
  //   },
  //   updateData: (data) => {
  //     // Update global state with new data
  //     if (data) {
  //       refreshGitStatus();
  //     }
  //   }
  // });

  
  // Local state for UI interactions
  const [isLoading, setIsLoading] = useState(false);
  const [operationResult, setOperationResult] = useState(null);
  const [showDiff, setShowDiff] = useState(false);
  const [diffContent, setDiffContent] = useState('');
  const [showPideaAgent, setShowPideaAgent] = useState(false);
  const [activeGitTab, setActiveGitTab] = useState('git-operations');

  // ✅ FIXED: No more manual data loading - global state handles it automatically
  useEffect(() => {
    if (activeIDE.workspacePath) {
      logger.info('GitManagementComponent: active IDE changed to:', activeIDE.workspacePath);
    }
  }, [activeIDE.workspacePath]);

  // ✅ REFACTORED: Setup WebSocket listeners for real-time updates
  useEffect(() => {
    if (eventBus) {
      logger.info('Setting up WebSocket listeners for GitManagementComponent');
      
      // Listen to WebSocket events directly (like Queue component does)
      import('@/infrastructure/services/WebSocketService.jsx').then(module => {
        const WebSocketService = module.default;
        if (WebSocketService) {
          WebSocketService.on('git-status-updated', (data) => {
            logger.info('Git status updated via WebSocket:', data);
            // The global state will handle the update automatically
          });
          WebSocketService.on('git-branch-changed', (data) => {
            logger.info('Git branch changed via WebSocket:', data);
            // The global state will handle the update automatically
          });
          logger.info('WebSocket events connected for GitManagementComponent');
        }
      }).catch(error => {
        logger.warn('Could not import WebSocketService for GitManagementComponent', error);
      });
      
      // ✅ NEW: Listen for git view opened event
      eventBus.on('git-view-opened', (data) => {
        logger.info('Git view opened - auto-refreshing git status');
        refreshGitStatus();
      });
    }
  }, [eventBus, refreshGitStatus]);

  // ✅ NEW: Auto-refresh git status when tab becomes visible or focused
  useEffect(() => {
    let lastRefreshTime = 0;
    const MIN_REFRESH_INTERVAL = 2000; // Minimum 2 seconds between refreshes

    const handleVisibilityChange = () => {
      if (!document.hidden && activeIDE.workspacePath) {
        const now = Date.now();
        if (now - lastRefreshTime > MIN_REFRESH_INTERVAL) {
          logger.info('Tab became visible, refreshing git status');
          lastRefreshTime = now;
          refreshGitStatus();
        } else {
          logger.info('Tab became visible, but skipping refresh (too soon)');
        }
      }
    };

    const handleFocus = () => {
      if (activeIDE.workspacePath) {
        const now = Date.now();
        if (now - lastRefreshTime > MIN_REFRESH_INTERVAL) {
          logger.info('Window focused, refreshing git status');
          lastRefreshTime = now;
          refreshGitStatus();
        } else {
          logger.info('Window focused, but skipping refresh (too soon)');
        }
      }
    };

    // Listen for visibility changes (tab switching)
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Listen for window focus (returning to browser)
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [activeIDE.workspacePath, refreshGitStatus]);

  // ✅ REMOVED: Old periodic refresh - now handled by RefreshService

  // ✅ REFACTORED: Use global state instead of local state
  const currentBranch = gitStatus.currentBranch;
  const branches = gitBranches.branches;
  const workspacePath = activeIDE.workspacePath;

  const handleGitOperation = async (operation, options = {}) => {
    try {
      if (!workspacePath) {
        setOperationResult({ type: 'error', message: 'No workspace path available' });
        return;
      }
      setIsLoading(true);
      setOperationResult(null);
      
      // Get project ID from workspace path
      const projectId = getProjectIdFromWorkspace(workspacePath);
      
      const result = await apiRepository.performGitOperation(projectId, workspacePath, operation, options);
      setOperationResult({ type: 'success', message: result.message, data: result.data });
      
      // ✅ FIXED: No need to reload - global state will update via WebSocket
      logger.info('Git operation completed, global state will update automatically');
      
      if (onGitOperation) {
        onGitOperation(operation, result);
      }
    } catch (error) {
      setOperationResult({ type: 'error', message: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleValidate = async () => {
    await handleGitOperation('validate');
  };

  const handleCompare = async () => {
    try {
      if (!workspacePath) {
        setOperationResult({ type: 'error', message: 'No workspace path available' });
        return;
      }
      setIsLoading(true);
      
      // Get project ID from workspace path
      const projectId = getProjectIdFromWorkspace(workspacePath);
      
      const result = await apiRepository.compareBranches(projectId, workspacePath, currentBranch, 'main');
      setDiffContent(result.diff);
      setShowDiff(true);
    } catch (error) {
      setOperationResult({ type: 'error', message: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePull = async () => {
    await handleGitOperation('pull', { branch: 'main' });
  };

  const handleMerge = async () => {
    if (window.confirm(`Are you sure you want to merge ${currentBranch} into main?`)) {
      await handleGitOperation('merge', { 
        sourceBranch: currentBranch, 
        targetBranch: 'main' 
      });
    }
  };

  const handleSwitchBranch = async (branchName) => {
    if (branchName === currentBranch) {
      alert(`You are already on the branch "${branchName}".`);
      return;
    }
    const confirmed = window.confirm(`Are you sure you want to switch to branch "${branchName}"?`);
    if (confirmed) {
      await handleGitOperation('checkout', { branch: branchName });
      // Backend should send git:checkout:completed event which gets translated to git-branch-changed
    }
  };

  // ✅ REFACTORED: Use global state for status information
  const getStatusIcon = () => {
    if (!gitStatus.status) return '❓';
    if (gitStatus.hasChanges) return '⚠️';
    return '✅';
  };

  const getStatusText = () => {
    if (!gitStatus.status) return 'Unknown';
    if (!gitStatus.hasChanges) return 'Clean';
    const totalChanges = gitStatus.modifiedFiles.length + gitStatus.addedFiles.length + gitStatus.deletedFiles.length;
    return `${totalChanges} changes`;
  };

  // ✅ REFACTORED: Use global state for branches
  const localBranches = gitBranches.localBranches;

  return (
    <div className="git__git-management">
      {/* Git Status Header */}
      <div className="git__git-status-header">
        <div className="git__git-status-info">
          <span className="git__git-status-icon">{getStatusIcon()}</span>
          <span className="git__git-status-text">{getStatusText()}</span>
          <span className="git__git-branch-name">branch: {currentBranch || 'Loading...'}</span>
        </div>
        
        <div className="git__git-actions">
          <button
            onClick={async () => {
              logger.info('Refresh button clicked - refreshing git status');
              try {
                setIsLoading(true);
                await refreshGitStatus();
                logger.info('Git status refreshed successfully');
              } catch (error) {
                logger.error('Failed to refresh git status:', error);
              } finally {
                setIsLoading(false);
              }
            }}
            className="git__git-btn git__refresh-btn"
            disabled={isLoading}
            title="Refresh Git status"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Git Tab Navigation */}
      <div className="git__git-tabs">
        <button
          className={`git__git-tab ${activeGitTab === 'git-operations' ? 'git__active' : ''}`}
          onClick={() => setActiveGitTab('git-operations')}
        >
          🔧 Git Operations
        </button>
        <button
          className={`git__git-tab ${activeGitTab === 'version-management' ? 'git__active' : ''}`}
          onClick={() => setActiveGitTab('version-management')}
        >
          📦 Version Management
        </button>
      </div>

      {/* Workspace Info */}
      {workspacePath && (
        <div className="git__workspace-info">
          <span className="git__workspace-label">Workspace:</span>
          <span className="git__workspace-path">{workspacePath}</span>
        </div>
      )}

      {/* Tab Content */}
      <div className="git__git-tab-content">
        {/* Git Operations Tab */}
        {activeGitTab === 'git-operations' && (
          <div className="git-operations-content">
            {/* Git Management Buttons */}
            <div className="git__git-controls">
              <div className="git__git-button-group">
                <button
                  onClick={handleValidate}
                  className="git__git-btn git__validate-btn"
                  disabled={isLoading}
                  title="Validate current changes"
                >
                  <span className="git__btn-icon">✅</span>
                  <span className="git__btn-text">Validate</span>
                </button>

                <button
                  onClick={handleCompare}
                  className="git__git-btn compare-btn"
                  disabled={isLoading}
                  title="Compare with main branch"
                >
                  <span className="git__btn-icon">🔍</span>
                  <span className="git__btn-text">Compare</span>
                </button>

                <button
                  onClick={handlePull}
                  className="git__git-btn pull-btn"
                  disabled={isLoading}
                  title="Pull latest changes from main"
                >
                  <span className="git__btn-icon">⬇️</span>
                  <span className="git__btn-text">Pull</span>
                </button>

                <button
                  onClick={handleMerge}
                  className="git__git-btn merge-btn"
                  disabled={isLoading || currentBranch === 'main'}
                  title="Merge current branch into main"
                >
                  <span className="git__btn-icon">🔀</span>
                  <span className="git__btn-text">Merge</span>
                </button>

                <button
                  onClick={() => setShowPideaAgent(!showPideaAgent)}
                  className="git__git-btn pidea-agent-toggle-btn"
                  disabled={isLoading}
                  title="Toggle Pidea-Agent branch management"
                >
                  <span className="git__btn-icon">🤖</span>
                  <span className="git__btn-text">Pidea-Agent</span>
                </button>
              </div>
            </div>

            {/* Branch Selector */}
            <div className="branch-selector">
              <label className="branch-label">Switch Branch:</label>
              <select
                value={currentBranch}
                onChange={(e) => handleSwitchBranch(e.target.value)}
                disabled={isLoading}
                className="branch-select"
              >
                {localBranches.map(branch => (
                  <option key={branch} value={branch}>
                    {branch === currentBranch ? `📍 ${branch}` : branch}
                  </option>
                ))}
              </select>
            </div>

            {/* Git Status Details */}
            {gitStatus.status && (
              <div className="git__git-status-details">
                <div className="git__status-section">
                  <h4>📝 Modified Files ({gitStatus.modifiedFiles.length})</h4>
                  <ul className="git__file-list">
                    {gitStatus.modifiedFiles.map(file => (
                      <li key={file} className="git__file-item modified">{file}</li>
                    ))}
                  </ul>
                </div>

                <div className="git__status-section">
                  <h4>➕ Added Files ({gitStatus.addedFiles.length})</h4>
                  <ul className="git__file-list">
                    {gitStatus.addedFiles.map(file => (
                      <li key={file} className="git__file-item added">{file}</li>
                    ))}
                  </ul>
                </div>

                <div className="git__status-section">
                  <h4>🗑️ Deleted Files ({gitStatus.deletedFiles.length})</h4>
                  <ul className="git__file-list">
                    {gitStatus.deletedFiles.map(file => (
                      <li key={file} className="git__file-item deleted">{file}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Version Management Tab */}
        {activeGitTab === 'version-management' && (
          <div className="version-management-content">
            <VersionManagementComponent 
              activePort={activePort}
              eventBus={eventBus}
            />
          </div>
        )}
      </div>

      {/* Operation Result */}
      {operationResult && (
        <div className={`operation-result ${operationResult.type}`}>
          <span className="git__result-icon">
            {operationResult.type === 'success' ? '✅' : '❌'}
          </span>
          <span className="git__result-message">{operationResult.message}</span>
        </div>
      )}

      {/* Diff Modal */}
      {showDiff && (
        <div className="git__diff-modal-overlay" onClick={() => setShowDiff(false)}>
          <div className="git__diff-modal" onClick={(e) => e.stopPropagation()}>
            <div className="git__diff-header">
              <h3>🔍 Changes vs Main Branch</h3>
              <button 
                className="git__close-btn"
                onClick={() => setShowDiff(false)}
              >
                ✕
              </button>
            </div>
            <div className="git__diff-content">
              <pre className="git__diff-text">{diffContent}</pre>
            </div>
          </div>
        </div>
      )}

      {/* Pidea-Agent Branch Management */}
      {showPideaAgent && (
        <div className="git__pidea-agent-section">
          <div className="git__pidea-agent-header">
            <h3>🤖 Pidea-Agent Branch Management</h3>
            <button 
              className="git__close-btn"
              onClick={() => setShowPideaAgent(false)}
            >
              ✕
            </button>
          </div>
          <PideaAgentBranchComponent
            activePort={activePort}
            onPideaAgentOperation={(operation, result) => {
              logger.info('Pidea-Agent operation completed:', operation, result);
              // ✅ FIXED: No need to refresh - global state handles updates
            }}
            onPideaAgentStatusChange={(status) => {
              logger.info('Pidea-Agent status changed:', status);
            }}
          />
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="git__loading-overlay">
          <div className="git__loading-spinner">⏳</div>
          <span>Processing Git operation...</span>
        </div>
      )}
    </div>
  );
};

export default GitManagementComponent; 