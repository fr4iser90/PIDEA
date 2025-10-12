/**
 * Project Store Integration Component
 * Component that demonstrates ProjectStore integration with IDEStore
 * Shows synchronization status and provides manual sync controls
 */

import React, { useState, useEffect } from 'react';
import { logger } from '@/infrastructure/logging/Logger';
import { useProjectStoreIntegration, useProjectSyncStatus } from '@/hooks/useProjectStoreIntegration';
import { useProjectManagement } from '@/infrastructure/stores/hooks/useProjectStore';
import { useProjects, useActiveProject } from '@/infrastructure/stores/selectors/ProjectSelectors';

const ProjectStoreIntegrationComponent = ({ onSync, onError }) => {
  // Hooks
  const {
    activeProject,
    activeIDE,
    isSynchronized,
    syncProjectWithIDE,
    syncIDEWithProject,
    getSynchronizedData
  } = useProjectStoreIntegration();

  const syncStatus = useProjectSyncStatus();
  const { projects, isLoading, error } = useProjectManagement();
  const activeProjectData = useActiveProject();

  // Local state
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Handle sync events
  const handleSync = async (type, id) => {
    try {
      setSyncInProgress(true);
      setLastSyncTime(new Date().toISOString());

      if (type === 'project' && id) {
        await syncProjectWithIDE(id);
      } else if (type === 'ide' && id) {
        await syncIDEWithProject(id);
      }

      onSync?.(type, id);
      logger.info(`Manual sync completed: ${type}`, id);
    } catch (error) {
      logger.error('Manual sync failed:', error);
      onError?.(error);
    } finally {
      setSyncInProgress(false);
    }
  };

  // Auto-sync when synchronization status changes
  useEffect(() => {
    if (!isSynchronized && activeProject && activeIDE) {
      logger.info('Auto-syncing project with IDE');
      handleSync('project', activeProject.id);
    }
  }, [isSynchronized, activeProject, activeIDE]);

  // Render sync status indicator
  const renderSyncStatus = () => {
    const statusColors = {
      synchronized: 'text-green-600',
      unsynchronized: 'text-yellow-600',
      'project-only': 'text-blue-600',
      'ide-only': 'text-purple-600',
      none: 'text-gray-600'
    };

    const statusLabels = {
      synchronized: 'Synchronized',
      unsynchronized: 'Unsynchronized',
      'project-only': 'Project Only',
      'ide-only': 'IDE Only',
      none: 'No Data'
    };

    return (
      <div className="sync-status">
        <div className={`status-indicator ${statusColors[syncStatus.status]}`}>
          <div className="status-dot"></div>
          <span className="status-label">{statusLabels[syncStatus.status]}</span>
        </div>
        {lastSyncTime && (
          <div className="last-sync">
            Last sync: {new Date(lastSyncTime).toLocaleTimeString()}
          </div>
        )}
      </div>
    );
  };

  // Render project info
  const renderProjectInfo = () => {
    if (!activeProjectData) {
      return (
        <div className="project-info">
          <div className="info-item">
            <span className="label">Project:</span>
            <span className="value">No active project</span>
          </div>
        </div>
      );
    }

    return (
      <div className="project-info">
        <div className="info-item">
          <span className="label">Project:</span>
          <span className="value">{activeProjectData.name}</span>
        </div>
        <div className="info-item">
          <span className="label">Workspace:</span>
          <span className="value">{activeProjectData.workspacePath}</span>
        </div>
        <div className="info-item">
          <span className="label">Type:</span>
          <span className="value">{activeProjectData.type}</span>
        </div>
        {activeProjectData.framework && (
          <div className="info-item">
            <span className="label">Framework:</span>
            <span className="value">{activeProjectData.framework}</span>
          </div>
        )}
      </div>
    );
  };

  // Render IDE info
  const renderIDEInfo = () => {
    if (!activeIDE) {
      return (
        <div className="ide-info">
          <div className="info-item">
            <span className="label">IDE:</span>
            <span className="value">No active IDE</span>
          </div>
        </div>
      );
    }

    return (
      <div className="ide-info">
        <div className="info-item">
          <span className="label">IDE:</span>
          <span className="value">{activeIDE.name}</span>
        </div>
        <div className="info-item">
          <span className="label">Port:</span>
          <span className="value">{activeIDE.port}</span>
        </div>
        <div className="info-item">
          <span className="label">Workspace:</span>
          <span className="value">{activeIDE.workspacePath}</span>
        </div>
      </div>
    );
  };

  // Render sync controls
  const renderSyncControls = () => {
    return (
      <div className="sync-controls">
        <button
          onClick={() => handleSync('project', activeProject?.id)}
          disabled={!activeProject || syncInProgress}
          className="btn btn-primary btn-sm"
        >
          {syncInProgress ? 'Syncing...' : 'Sync Project → IDE'}
        </button>
        
        <button
          onClick={() => handleSync('ide', activeIDE?.port)}
          disabled={!activeIDE || syncInProgress}
          className="btn btn-secondary btn-sm"
        >
          {syncInProgress ? 'Syncing...' : 'Sync IDE → Project'}
        </button>
        
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="btn btn-outline btn-sm"
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
        </button>
      </div>
    );
  };

  // Render detailed information
  const renderDetails = () => {
    if (!showDetails) return null;

    const synchronizedData = getSynchronizedData();

    return (
      <div className="details-panel">
        <h4>Synchronization Details</h4>
        
        <div className="detail-section">
          <h5>Project Store</h5>
          <div className="detail-item">
            <span className="label">Active Project:</span>
            <span className="value">{synchronizedData.projectStore.activeProject || 'None'}</span>
          </div>
          <div className="detail-item">
            <span className="label">Total Projects:</span>
            <span className="value">{Object.keys(synchronizedData.projectStore.projects).length}</span>
          </div>
          <div className="detail-item">
            <span className="label">Loading:</span>
            <span className="value">{synchronizedData.projectStore.isLoading ? 'Yes' : 'No'}</span>
          </div>
          {synchronizedData.projectStore.error && (
            <div className="detail-item error">
              <span className="label">Error:</span>
              <span className="value">{synchronizedData.projectStore.error}</span>
            </div>
          )}
        </div>

        <div className="detail-section">
          <h5>IDE Store</h5>
          <div className="detail-item">
            <span className="label">Active Port:</span>
            <span className="value">{synchronizedData.ideStore.activePort || 'None'}</span>
          </div>
          <div className="detail-item">
            <span className="label">Available IDEs:</span>
            <span className="value">{synchronizedData.ideStore.availableIDEs.length}</span>
          </div>
          <div className="detail-item">
            <span className="label">Loading:</span>
            <span className="value">{synchronizedData.ideStore.isLoading ? 'Yes' : 'No'}</span>
          </div>
          {synchronizedData.ideStore.error && (
            <div className="detail-item error">
              <span className="label">Error:</span>
              <span className="value">{synchronizedData.ideStore.error}</span>
            </div>
          )}
        </div>

        <div className="detail-section">
          <h5>Synchronization</h5>
          <div className="detail-item">
            <span className="label">Status:</span>
            <span className="value">{isSynchronized ? 'Synchronized' : 'Not Synchronized'}</span>
          </div>
          <div className="detail-item">
            <span className="label">Service Active:</span>
            <span className="value">{synchronizedData.synchronized ? 'Yes' : 'No'}</span>
          </div>
        </div>
      </div>
    );
  };

  // Render error state
  if (error) {
    return (
      <div className="project-store-integration error">
        <div className="error-message">
          <h3>Integration Error</h3>
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="btn btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Render loading state
  if (isLoading) {
    return (
      <div className="project-store-integration loading">
        <div className="loading-message">
          <div className="spinner"></div>
          <span>Loading project integration...</span>
        </div>
      </div>
    );
  }

  // Render main component
  return (
    <div className="project-store-integration">
      <div className="integration-header">
        <h3>Project Store Integration</h3>
        {renderSyncStatus()}
      </div>

      <div className="integration-content">
        <div className="info-sections">
          {renderProjectInfo()}
          {renderIDEInfo()}
        </div>

        {renderSyncControls()}
        {renderDetails()}
      </div>
    </div>
  );
};

export default ProjectStoreIntegrationComponent;
