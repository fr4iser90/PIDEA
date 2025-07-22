import { logger } from "@/infrastructure/logging/Logger";
import React, { useState, useEffect } from 'react';
import '@/css/main/git.css';
import { apiCall } from '@/infrastructure/repositories/APIChatRepository.jsx';
import PideaAgentBranchComponent from '../pidea-agent/PideaAgentBranchComponent.jsx';

// Utility function to convert workspace path to project ID
const getProjectIdFromWorkspace = (workspacePath) => {
  if (!workspacePath) return 'default';
  
  // Extract project name from path
  const pathParts = workspacePath.split('/');
  const projectName = pathParts[pathParts.length - 1];
  
  // Convert to lowercase and remove special characters
  return projectName.toLowerCase().replace(/[^a-z0-9]/g, '');
};

const GitManagementComponent = ({ activePort, onGitOperation, onGitStatusChange }) => {
  const [gitStatus, setGitStatus] = useState(null);
  const [currentBranch, setCurrentBranch] = useState('');
  const [branches, setBranches] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [operationResult, setOperationResult] = useState(null);
  const [showDiff, setShowDiff] = useState(false);
  const [diffContent, setDiffContent] = useState('');
  const [workspacePath, setWorkspacePath] = useState('');
  const [showPideaAgent, setShowPideaAgent] = useState(false);

  useEffect(() => {
    if (activePort) {
      loadWorkspacePath();
    }
  }, [activePort]);

  useEffect(() => {
    if (workspacePath) {
      loadGitStatus();
      loadBranches();
    }
  }, [workspacePath]);

  const loadWorkspacePath = async () => {
    try {
      const result = await apiCall('/api/ide/available');
      if (result.success && result.data) {
        const activeIDE = result.data.find(ide => ide.port === activePort);
        if (activeIDE && activeIDE.workspacePath) {
          setWorkspacePath(activeIDE.workspacePath);
        }
      }
    } catch (error) {
      logger.error('Failed to load workspace path:', error);
    }
  };

  const loadGitStatus = async () => {
    try {
      if (!workspacePath) return;
      setIsLoading(true);
      
      // Get project ID from workspace path
      const projectId = getProjectIdFromWorkspace(workspacePath);
      
      const data = await apiCall(`/api/projects/${projectId}/git/status`, {
        method: 'POST',
        body: JSON.stringify({ projectPath: workspacePath })
      });
      setGitStatus(data.data?.status);
      setCurrentBranch(data.data?.currentBranch);
      if (onGitStatusChange) {
        onGitStatusChange(data.data?.status);
      }
    } catch (error) {
      logger.error('Failed to load Git status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadBranches = async () => {
    try {
      if (!workspacePath) return;
      
      // Get project ID from workspace path
      const projectId = getProjectIdFromWorkspace(workspacePath);
      
      const data = await apiCall(`/api/projects/${projectId}/git/branches`, {
        method: 'POST',
        body: JSON.stringify({ projectPath: workspacePath })
      });
      // Backend now returns branches directly in result.result
      setBranches((data && data.result) ? data.result : []);
    } catch (error) {
      logger.error('Failed to load branches:', error);
    }
  };

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
      
      const result = await apiCall(`/api/projects/${projectId}/git/${operation}`, {
        method: 'POST',
        body: JSON.stringify({ projectPath: workspacePath, ...options })
      });
      setOperationResult({ type: 'success', message: result.message, data: result.data });
      await loadGitStatus();
      await loadBranches();
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
      
      const result = await apiCall(`/api/projects/${projectId}/git/compare`, {
        method: 'POST',
        body: JSON.stringify({ 
          projectPath: workspacePath, 
          sourceBranch: currentBranch, 
          targetBranch: 'main' 
        })
      });
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
    }
  };

  const getStatusIcon = () => {
    if (!gitStatus) return '❓';
    if (gitStatus.modified.length > 0 || gitStatus.added.length > 0) return '⚠️';
    return '✅';
  };

  const getStatusText = () => {
    if (!gitStatus) return 'Unknown';
    const totalChanges = gitStatus.modified.length + gitStatus.added.length + gitStatus.deleted.length;
    if (totalChanges === 0) return 'Clean';
    return `${totalChanges} changes`;
  };

  // Filtere nur lokale Branches (ohne 'remotes/')
  const localBranches = branches.filter(branch => !branch.startsWith('remotes/'));

  return (
    <div className="git-management">
      {/* Git Status Header */}
      <div className="git-status-header">
        <div className="git-status-info">
          <span className="git-status-icon">{getStatusIcon()}</span>
          <span className="git-status-text">{getStatusText()}</span>
          <span className="git-branch-name">branch: {currentBranch}</span>
        </div>
        
        <div className="git-actions">
          <button
            onClick={loadGitStatus}
            className="git-btn refresh-btn"
            disabled={isLoading}
            title="Refresh Git status"
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

      {/* Git Management Buttons */}
      <div className="git-controls">
        <div className="git-button-group">
          <button
            onClick={handleValidate}
            className="git-btn validate-btn"
            disabled={isLoading}
            title="Validate current changes"
          >
            <span className="btn-icon">✅</span>
            <span className="btn-text">Validate</span>
          </button>

          <button
            onClick={handleCompare}
            className="git-btn compare-btn"
            disabled={isLoading}
            title="Compare with main branch"
          >
            <span className="btn-icon">🔍</span>
            <span className="btn-text">Compare</span>
          </button>

          <button
            onClick={handlePull}
            className="git-btn pull-btn"
            disabled={isLoading}
            title="Pull latest changes from main"
          >
            <span className="btn-icon">⬇️</span>
            <span className="btn-text">Pull</span>
          </button>

          <button
            onClick={handleMerge}
            className="git-btn merge-btn"
            disabled={isLoading || currentBranch === 'main'}
            title="Merge current branch into main"
          >
            <span className="btn-icon">🔀</span>
            <span className="btn-text">Merge</span>
          </button>

          <button
            onClick={() => setShowPideaAgent(!showPideaAgent)}
            className="git-btn pidea-agent-toggle-btn"
            disabled={isLoading}
            title="Toggle Pidea-Agent branch management"
          >
            <span className="btn-icon">🤖</span>
            <span className="btn-text">Pidea-Agent</span>
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
      {gitStatus && (
        <div className="git-status-details">
          <div className="status-section">
            <h4>📝 Modified Files ({gitStatus.modified.length})</h4>
            <ul className="file-list">
              {gitStatus.modified.map(file => (
                <li key={file} className="file-item modified">{file}</li>
              ))}
            </ul>
          </div>

          <div className="status-section">
            <h4>➕ Added Files ({gitStatus.added.length})</h4>
            <ul className="file-list">
              {gitStatus.added.map(file => (
                <li key={file} className="file-item added">{file}</li>
              ))}
            </ul>
          </div>

          <div className="status-section">
            <h4>🗑️ Deleted Files ({gitStatus.deleted.length})</h4>
            <ul className="file-list">
              {gitStatus.deleted.map(file => (
                <li key={file} className="file-item deleted">{file}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Operation Result */}
      {operationResult && (
        <div className={`operation-result ${operationResult.type}`}>
          <span className="result-icon">
            {operationResult.type === 'success' ? '✅' : '❌'}
          </span>
          <span className="result-message">{operationResult.message}</span>
        </div>
      )}

      {/* Diff Modal */}
      {showDiff && (
        <div className="diff-modal-overlay" onClick={() => setShowDiff(false)}>
          <div className="diff-modal" onClick={(e) => e.stopPropagation()}>
            <div className="diff-header">
              <h3>🔍 Changes vs Main Branch</h3>
              <button 
                className="close-btn"
                onClick={() => setShowDiff(false)}
              >
                ✕
              </button>
            </div>
            <div className="diff-content">
              <pre className="diff-text">{diffContent}</pre>
            </div>
          </div>
        </div>
      )}

      {/* Pidea-Agent Branch Management */}
      {showPideaAgent && (
        <div className="pidea-agent-section">
          <div className="pidea-agent-header">
            <h3>🤖 Pidea-Agent Branch Management</h3>
            <button 
              className="close-btn"
              onClick={() => setShowPideaAgent(false)}
            >
              ✕
            </button>
          </div>
          <PideaAgentBranchComponent
            activePort={activePort}
            onPideaAgentOperation={(operation, result) => {
              logger.info('Pidea-Agent operation completed:', operation, result);
              // Refresh git status after pidea-agent operation
              loadGitStatus();
              loadBranches();
            }}
            onPideaAgentStatusChange={(status) => {
              logger.info('Pidea-Agent status changed:', status);
            }}
          />
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner">⏳</div>
          <span>Processing Git operation...</span>
        </div>
      )}
    </div>
  );
};

export default GitManagementComponent; 