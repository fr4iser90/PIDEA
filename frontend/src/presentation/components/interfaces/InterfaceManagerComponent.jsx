/**
 * InterfaceManagerComponent - Interface management for sidebar
 * 
 * This component provides interface management functionality for the sidebar,
 * including interface listing, switching, and management for the selected project.
 */

import React, { useState, useEffect } from 'react';
import { logger } from '@/infrastructure/logging/Logger';
import { useProjectManagement } from '@/infrastructure/stores/hooks/useProjectStore';
import useIDEStore from '@/infrastructure/stores/IDEStore.jsx';
import InterfaceItemComponent from './InterfaceItemComponent.jsx';
import { ApiService } from '@/infrastructure/services/ApiService.js';
import '@/scss/components/_interface-management.scss';

const InterfaceManagerComponent = ({ eventBus, selectedProjectId }) => {
  const { selectedProject } = useProjectManagement();
  const { availableIDEs, switchIDE, loadAvailableIDEs } = useIDEStore();
  const [interfaces, setInterfaces] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load interfaces for selected project
  useEffect(() => {
    if (selectedProjectId) {
      loadProjectInterfaces(selectedProjectId);
    }
  }, [selectedProjectId]);

  // Listen for IDE updates
  useEffect(() => {
    if (eventBus) {
      const handleIDEListUpdated = () => {
        loadProjectInterfaces(selectedProjectId);
      };

      eventBus.on('ideListUpdated', handleIDEListUpdated);
      return () => {
        eventBus.off('ideListUpdated', handleIDEListUpdated);
      };
    }
  }, [eventBus, selectedProjectId]);

  const loadProjectInterfaces = async (projectId) => {
    if (!projectId) return;

    setIsLoading(true);
    setError(null);

    try {
      const apiService = new ApiService();
      const result = await apiService.call(`/api/projects/${projectId}/interfaces`);

      if (result.success !== false) {
        const projectInterfaces = Array.isArray(result) ? result : result.interfaces || [];
        setInterfaces(projectInterfaces);
        logger.info('Loaded project interfaces:', projectId, projectInterfaces);
      } else {
        logger.warn('Failed to load project interfaces:', result.error);
        setInterfaces([]);
      }
    } catch (error) {
      logger.error('Error loading project interfaces:', error);
      setError(error.message);
      setInterfaces([]);
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

  if (!selectedProjectId) {
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
        <button onClick={() => loadProjectInterfaces(selectedProjectId)} className="btn btn-secondary">
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
        <p className="project-name">Project: {selectedProject?.name || 'Unknown'}</p>
        <p className="project-path">{selectedProject?.workspacePath || ''}</p>
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
              key={interfaceItem.port || interfaceItem.id}
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
