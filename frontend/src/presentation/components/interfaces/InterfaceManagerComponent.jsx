/**
 * InterfaceManagerComponent - Interface management for sidebar
 * 
 * This component provides interface management functionality for the sidebar,
 * including interface listing, switching, and management for the active project.
 */

import React, { useState, useEffect } from 'react';
import { logger } from '@/infrastructure/logging/Logger';
import { useProjectManagement } from '@/infrastructure/stores/hooks/useProjectStore';
import useIDEStore from '@/infrastructure/stores/IDEStore.jsx';
import InterfaceItemComponent from './InterfaceItemComponent.jsx';
import '@/scss/components/_interface-management.scss';

const InterfaceManagerComponent = ({ eventBus, activeProjectId }) => {
  const { activeProject } = useProjectManagement();
  const { availableIDEs, switchIDE, loadAvailableIDEs } = useIDEStore();
  const [interfaces, setInterfaces] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load interfaces for active project
  useEffect(() => {
    if (activeProjectId) {
      loadProjectInterfaces(activeProjectId);
    }
  }, [activeProjectId]);

  // Listen for IDE updates
  useEffect(() => {
    if (eventBus) {
      const handleIDEListUpdated = () => {
        loadProjectInterfaces(activeProjectId);
      };

      eventBus.on('ideListUpdated', handleIDEListUpdated);
      return () => {
        eventBus.off('ideListUpdated', handleIDEListUpdated);
      };
    }
  }, [eventBus, activeProjectId]);

  const loadProjectInterfaces = async (projectId) => {
    if (!projectId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Filter IDEs that belong to this project
      const projectInterfaces = availableIDEs.filter(ide => 
        ide.workspacePath && 
        ide.workspacePath.includes(projectId) ||
        ide.projectId === projectId
      );

      setInterfaces(projectInterfaces);
      logger.info('Loaded interfaces for project:', projectId, projectInterfaces);
    } catch (error) {
      logger.error('Failed to load project interfaces:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInterfaceSwitch = async (interfaceId) => {
    try {
      await switchIDE(interfaceId, 'sidebar');
      logger.info('Interface switched:', interfaceId);
      eventBus?.emit('interface-switched', { interfaceId });
    } catch (error) {
      logger.error('Failed to switch interface:', error);
    }
  };

  const handleAddInterface = () => {
    eventBus?.emit('sidebar-left:new-ide');
  };

  if (!activeProjectId) {
    return (
      <div className="interface-manager-empty">
        <div className="empty-state">
          <p>Select a project to manage interfaces</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="interface-manager-loading">
        <div className="loading-spinner"></div>
        <p>Loading interfaces...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="interface-manager-error">
        <div className="error-icon">⚠️</div>
        <p>Failed to load interfaces</p>
        <button onClick={() => loadProjectInterfaces(activeProjectId)} className="btn btn-secondary">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="interface-manager">
      {/* Header */}
      <div className="interface-manager-header">
        <h3>Interfaces</h3>
        <button 
          onClick={handleAddInterface}
          className="btn btn-primary btn-sm"
          title="Add new interface"
        >
          + Add Interface
        </button>
      </div>

      {/* Project Info */}
      <div className="project-info">
        <p className="project-name">Project: {activeProject?.name || 'Unknown'}</p>
        <p className="project-path">{activeProject?.workspacePath || ''}</p>
      </div>

      {/* Interface List */}
      <div className="interface-list">
        {interfaces.length === 0 ? (
          <div className="empty-state">
            <p>No interfaces available for this project</p>
            <button onClick={handleAddInterface} className="btn btn-primary">
              Add Interface
            </button>
          </div>
        ) : (
          interfaces.map(interfaceItem => (
            <InterfaceItemComponent
              key={interfaceItem.port}
              interface={interfaceItem}
              isActive={interfaceItem.active}
              onClick={() => handleInterfaceSwitch(interfaceItem.port)}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default InterfaceManagerComponent;
