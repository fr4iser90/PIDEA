/**
 * ProjectCardComponent - Hierarchical project card with expandable interface sections
 * 
 * This component displays a project with expandable sections for different interface types:
 * - IDE Interfaces (Cursor, VSCode, etc.)
 * - API Interfaces (REST API, GraphQL, etc.)
 * - Web Interfaces (WebSocket, HTTP, etc.)
 */

import React, { useState, useEffect } from 'react';
import { logger } from '@/infrastructure/logging/Logger';
import useIDEStore from '@/infrastructure/stores/IDEStore.jsx';
import InterfaceItemComponent from '../interfaces/InterfaceItemComponent.jsx';
import { ApiService } from '@/infrastructure/services/ApiService.js';
import '@/scss/components/_project-card.scss';

const ProjectCardComponent = ({ 
  project, 
  isActive, 
  onClick, 
  eventBus,
  onInterfaceSwitch 
}) => {
  // DEBUG: Log project data
  useEffect(() => {
    logger.info('🔍 [ProjectCardComponent] Project data:', {
      project,
      hasProject: !!project,
      projectName: project?.name,
      projectId: project?.id,
      projectWorkspacePath: project?.workspacePath
    });
  }, [project]);

  const { availableIDEs } = useIDEStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [interfaces, setInterfaces] = useState({
    ide: [],
    api: [],
    web: []
  });

  // Load interfaces for this project
  useEffect(() => {
    loadProjectInterfaces();
  }, [project]);

  const loadProjectInterfaces = async () => {
    if (!project) return;

    try {
      // Use correct project interfaces route - 2025 Standard
      const apiService = new ApiService();
      const result = await apiService.call(`/api/projects/${project.id}/interfaces`);
      
      if (result.success !== false) {
        // 2025 Standard: Flat structure, interfaces are direct array
        const projectInterfaces = Array.isArray(result) ? result : result.interfaces || [];
        
        // Categorize interfaces
        const categorized = {
          ide: projectInterfaces.filter(ide => {
            const ideType = ide.ideType || ide.type;
            return ideType && ['cursor', 'vscode', 'webstorm', 'sublime', 'atom'].includes(ideType.toLowerCase());
          }),
          api: projectInterfaces.filter(ide => {
            const ideType = ide.ideType || ide.type;
            return ideType && ['api', 'rest', 'graphql', 'grpc'].includes(ideType.toLowerCase());
          }),
          web: projectInterfaces.filter(ide => {
            const ideType = ide.ideType || ide.type;
            return ideType && ['websocket', 'http', 'web'].includes(ideType.toLowerCase());
          })
        };

        setInterfaces(categorized);
        logger.info('Loaded project interfaces:', project.name, categorized);
      } else {
        logger.warn('Failed to load project interfaces:', result.error);
        setInterfaces({ ide: [], api: [], web: [] });
      }
    } catch (error) {
      logger.error('Error loading project interfaces:', error);
      setInterfaces({ ide: [], api: [], web: [] });
    }
  };

  const handleCardClick = () => {
    onClick(project.id);
  };

  const handleExpandToggle = (e) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const handleInterfaceClick = (interfaceItem) => {
    if (onInterfaceSwitch) {
      onInterfaceSwitch(interfaceItem);
    }
    eventBus?.emit('interface-switched', { interfaceId: interfaceItem.port });
  };

  const handleAddInterface = (type, e) => {
    e.stopPropagation();
    eventBus?.emit('sidebar-left:new-ide', { projectId: project.id, type });
  };

  const getTotalInterfaces = () => {
    return interfaces.ide.length + interfaces.api.length + interfaces.web.length;
  };

  const getActiveInterfaces = () => {
    return [...interfaces.ide, ...interfaces.api, ...interfaces.web].filter(ide => ide.active).length;
  };

  return (
    <div 
      className={`project-card ${isActive ? 'active' : ''} ${isExpanded ? 'expanded' : ''}`}
      onClick={handleCardClick}
    >
      {/* Project Header */}
      <div className="project-card-header">
        <div className="project-info">
          <div className="project-icon">📁</div>
          <div className="project-details">
            <h4 className="project-name">{project.name}</h4>
            <p className="project-path">{project.workspacePath}</p>
            <div className="project-stats">
              <span className="interface-count">
                {getTotalInterfaces()} interfaces
              </span>
              {getActiveInterfaces() > 0 && (
                <span className="active-count">
                  {getActiveInterfaces()} active
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="project-actions">
          <button 
            className={`expand-btn ${isExpanded ? 'expanded' : ''}`}
            onClick={handleExpandToggle}
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        </div>
      </div>

      {/* Expandable Interface Sections */}
      {isExpanded && (
        <div className="project-interfaces">
          <div className="interface-section">
            <div className="interface-section-header">
              <h5>🖥️ IDE Interfaces ({interfaces.ide.length})</h5>
              <button 
                className="add-interface-btn"
                onClick={(e) => handleAddInterface('ide', e)}
                title="Add IDE Interface"
              >
                ➕
              </button>
            </div>
            <div className="interface-list">
              {interfaces.ide.length === 0 ? (
                <div className="empty-state">
                  <p>No IDE interfaces</p>
                </div>
              ) : (
                interfaces.ide.map(interfaceItem => (
                  <div key={interfaceItem.port || interfaceItem.id} className="interface-item">
                    {(interfaceItem.ideType || interfaceItem.type || 'Unknown')} - Port {interfaceItem.port}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectCardComponent;
