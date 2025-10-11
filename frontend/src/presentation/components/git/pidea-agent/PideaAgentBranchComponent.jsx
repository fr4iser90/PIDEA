import { logger } from "@/infrastructure/logging/Logger";
import React, { useState, useEffect } from 'react';
import { apiCall } from '@/infrastructure/repositories/APIChatRepository.jsx';
import { cacheService } from '@/infrastructure/services/CacheService';
import '@/scss/pages/_pidea-agent-git.scss';;

// Utility function to convert workspace path to project ID
const getProjectIdFromWorkspace = (workspacePath) => {
  if (!workspacePath) return 'default';
  
  // Extract project name from path
  const pathParts = workspacePath.split('/');
  const projectName = pathParts[pathParts.length - 1];
  
  // Keep original case - Backend now supports it
  return projectName.replace(/[^a-zA-Z0-9]/g, '_');
};

const PideaAgentBranchComponent = ({ 
  activePort, 
  onPideaAgentOperation, 
  onPideaAgentStatusChange 
}) => {
  const [pideaAgentStatus, setPideaAgentStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [operationResult, setOperationResult] = useState(null);
  const [workspacePath, setWorkspacePath] = useState('');
  const [showDiff, setShowDiff] = useState(false);
  const [diffContent, setDiffContent] = useState('');

  useEffect(() => {
    if (activePort) {
      loadWorkspacePath();
    }
  }, [activePort]);

  useEffect(() => {
    if (workspacePath) {
      loadPideaAgentStatus();
    }
  }, [workspacePath]);

  const loadWorkspacePath = async () => {
    try {
      // Use centralized cache function
      const result = await cacheService.getIDEData();
      
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

  const loadPideaAgentStatus = async () => {
    try {
      if (!workspacePath) return;
      setIsLoading(true);
      
      // Get project ID from workspace path
      const projectId = getProjectIdFromWorkspace(workspacePath);
      
      const data = await apiCall(`/api/projects/${projectId}/git/pidea-agent-status`, {
        method: 'POST',
        body: JSON.stringify({ projectPath: workspacePath })
      });
      
      setPideaAgentStatus(data.data);
      if (onPideaAgentStatusChange) {
        onPideaAgentStatusChange(data.data);
      }
    } catch (error) {
      logger.error('Failed to load pidea-agent status:', error);
      setPideaAgentStatus(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePideaAgentOperation = async (operation, options = {}) => {
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
      await loadPideaAgentStatus();
      
      if (onPideaAgentOperation) {
        onPideaAgentOperation(operation, result);
      }
    } catch (error) {
      setOperationResult({ type: 'error', message: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePullPideaAgent = async () => {
    await handlePideaAgentOperation('pull-pidea-agent');
  };

  const handleMergeToPideaAgent = async () => {
    if (!pideaAgentStatus?.currentBranch) {
      setOperationResult({ type: 'error', message: 'Current branch information not available' });
      return;
    }
    
    if (window.confirm(`Are you sure you want to merge ${pideaAgentStatus.currentBranch} into pidea-agent?`)) {
      await handlePideaAgentOperation('merge-to-pidea-agent', { 
        sourceBranch: pideaAgentStatus.currentBranch 
      });
    }
  };

  const handleCompareWithPideaAgent = async () => {
    try {
      if (!workspacePath) {
        setOperationResult({ type: 'error', message: 'No workspace path available' });
        return;
      }
      if (!pideaAgentStatus?.currentBranch) {
        setOperationResult({ type: 'error', message: 'Current branch information not available' });
        return;
      }
      
      setIsLoading(true);
      
      // Get project ID from workspace path
      const projectId = getProjectIdFromWorkspace(workspacePath);
      
      const result = await apiCall(`/api/projects/${projectId}/git/compare-pidea-agent`, {
        method: 'POST',
        body: JSON.stringify({ 
          projectPath: workspacePath, 
          sourceBranch: pideaAgentStatus.currentBranch
        })
      });
      
      setDiffContent(result.data?.diff || 'No differences found');
      setShowDiff(true);
    } catch (error) {
      setOperationResult({ type: 'error', message: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const getPideaAgentStatusIcon = () => {
    if (!pideaAgentStatus) return '❓';
    if (!pideaAgentStatus.pideaAgentExists) return '❌';
    if (pideaAgentStatus.isOnPideaAgentBranch) return '📍';
    return '✅';
  };

  const getPideaAgentStatusText = () => {
    if (!pideaAgentStatus) return 'Unknown';
    if (!pideaAgentStatus.pideaAgentExists) return 'Pidea-Agent branch not found';
    if (pideaAgentStatus.isOnPideaAgentBranch) return 'On Pidea-Agent branch';
    return 'Pidea-Agent branch available';
  };

  const isPideaAgentAvailable = pideaAgentStatus?.pideaAgentExists;

  return (
    <div className="pidea-agent-branch">
      {/* Pidea-Agent Status Header */}
      <div className="pidea-agent-status-header">
        <div className="pidea-agent-status-info">
          <span className="pidea-agent-status-icon">{getPideaAgentStatusIcon()}</span>
          <span className="pidea-agent-status-text">{getPideaAgentStatusText()}</span>
          {pideaAgentStatus?.currentBranch && (
            <span className="pidea-agent-branch-name">current: {pideaAgentStatus.currentBranch}</span>
          )}
        </div>
        
        <div className="pidea-agent-actions">
          <button
            onClick={loadPideaAgentStatus}
            className="pidea-agent-btn refresh-btn"
            disabled={isLoading}
            title="Refresh Pidea-Agent status"
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

      {/* Pidea-Agent Management Buttons */}
      {isPideaAgentAvailable && (
        <div className="pidea-agent-controls">
          <div className="pidea-agent-button-group">
            <button
              onClick={handlePullPideaAgent}
              className="pidea-agent-btn pull-btn"
              disabled={isLoading}
              title="Pull latest changes from pidea-agent branch"
            >
              <span className="btn-icon">⬇️</span>
              <span className="btn-text">Pull Pidea-Agent</span>
            </button>

            <button
              onClick={handleCompareWithPideaAgent}
              className="pidea-agent-btn compare-btn"
              disabled={isLoading}
              title="Compare current branch with pidea-agent branch"
            >
              <span className="btn-icon">🔍</span>
              <span className="btn-text">Compare Pidea-Agent</span>
            </button>

            <button
              onClick={handleMergeToPideaAgent}
              className="pidea-agent-btn merge-btn"
              disabled={isLoading || pideaAgentStatus?.isOnPideaAgentBranch}
              title="Merge current branch into pidea-agent branch"
            >
              <span className="btn-icon">🔀</span>
              <span className="btn-text">Merge to Pidea-Agent</span>
            </button>
          </div>
        </div>
      )}

      {/* Pidea-Agent Status Details */}
      {pideaAgentStatus && pideaAgentStatus.pideaAgentStatus && (
        <div className="pidea-agent-status-details">
          <div className="status-section">
            <h4>📝 Pidea-Agent Modified Files ({pideaAgentStatus.pideaAgentStatus.modified?.length || 0})</h4>
            <ul className="file-list">
              {(pideaAgentStatus.pideaAgentStatus.modified || []).map(file => (
                <li key={file} className="file-item modified">{file}</li>
              ))}
            </ul>
          </div>

          <div className="status-section">
            <h4>➕ Pidea-Agent Added Files ({pideaAgentStatus.pideaAgentStatus.added?.length || 0})</h4>
            <ul className="file-list">
              {(pideaAgentStatus.pideaAgentStatus.added || []).map(file => (
                <li key={file} className="file-item added">{file}</li>
              ))}
            </ul>
          </div>

          <div className="status-section">
            <h4>🗑️ Pidea-Agent Deleted Files ({pideaAgentStatus.pideaAgentStatus.deleted?.length || 0})</h4>
            <ul className="file-list">
              {(pideaAgentStatus.pideaAgentStatus.deleted || []).map(file => (
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
              <h3>🔍 Changes vs Pidea-Agent Branch</h3>
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

      {/* Loading Overlay */}
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner">⏳</div>
          <span>Processing Pidea-Agent operation...</span>
        </div>
      )}
    </div>
  );
};

export default PideaAgentBranchComponent; 