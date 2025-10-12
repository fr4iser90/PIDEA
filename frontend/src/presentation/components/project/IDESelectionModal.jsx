/**
 * IDESelectionModal - Modal component for IDE selection during project creation
 * 
 * This component provides a modal interface for users to select from available IDEs
 * when creating a new project. It displays a list of detected IDEs with their
 * workspace paths and allows the user to choose which one to use.
 */

import React, { useState, useEffect } from 'react';
import { logger } from '@/infrastructure/logging/Logger';
import ProjectRepository from '@/infrastructure/repositories/ProjectRepository';

const IDESelectionModal = ({ isOpen, onClose, onIDESelected }) => {
  const [ides, setIDEs] = useState([]);
  const [selectedIDE, setSelectedIDE] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load available IDEs when modal opens
  useEffect(() => {
    if (isOpen) {
      loadAvailableIDEs();
    }
  }, [isOpen]);

  const loadAvailableIDEs = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const projectRepo = new ProjectRepository();
      const result = await projectRepo.getAvailableIDEs();
      
      if (result.success && result.data) {
        setIDEs(result.data);
        logger.info('✅ Loaded available IDEs:', result.data);
      } else {
        setError(result.error || 'Failed to load IDEs');
        logger.error('❌ Failed to load IDEs:', result.error);
      }
    } catch (err) {
      setError('Failed to load IDEs. Please try again.');
      logger.error('❌ Error loading IDEs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleIDESelect = (ide) => {
    setSelectedIDE(ide);
  };

  const handleConfirm = () => {
    if (selectedIDE && onIDESelected) {
      onIDESelected(selectedIDE);
      onClose();
    }
  };

  const handleCancel = () => {
    setSelectedIDE(null);
    onClose();
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="ide-selection-modal-overlay" onClick={handleBackdropClick}>
      <div className="ide-selection-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ide-selection-modal-header">
          <h3>Select IDE for Project</h3>
          <button 
            className="ide-selection-modal-close"
            onClick={handleCancel}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>
        
        <div className="ide-selection-modal-content">
          {isLoading && (
            <div className="ide-selection-loading">
              <div className="loading-spinner"></div>
              <p>Loading available IDEs...</p>
            </div>
          )}
          
          {error && (
            <div className="ide-selection-error">
              <p>❌ {error}</p>
              <button onClick={loadAvailableIDEs} className="retry-button">
                Try Again
              </button>
            </div>
          )}
          
          {!isLoading && !error && ides.length === 0 && (
            <div className="ide-selection-empty">
              <p>No IDEs with workspace paths found.</p>
              <p>Please open an IDE with a project workspace and try again.</p>
            </div>
          )}
          
          {!isLoading && !error && ides.length > 0 && (
            <div className="ide-selection-list">
              <p className="ide-selection-instruction">
                Select an IDE to auto-fill the project form:
              </p>
              
              <div className="ide-list">
                {ides.map((ide) => (
                  <div
                    key={ide.port}
                    className={`ide-item ${selectedIDE?.port === ide.port ? 'selected' : ''}`}
                    onClick={() => handleIDESelect(ide)}
                  >
                    <div className="ide-item-header">
                      <div className="ide-name">
                        <strong>{ide.name}</strong>
                        <span className="ide-type">({ide.type})</span>
                      </div>
                      <div className="ide-status">
                        <span className={`status-badge ${ide.status}`}>
                          {ide.status}
                        </span>
                      </div>
                    </div>
                    
                    <div className="ide-item-details">
                      <div className="ide-workspace">
                        <span className="label">Workspace:</span>
                        <span className="path">{ide.workspacePath}</span>
                      </div>
                      <div className="ide-port">
                        <span className="label">Port:</span>
                        <span className="port">{ide.port}</span>
                      </div>
                      {ide.version && (
                        <div className="ide-version">
                          <span className="label">Version:</span>
                          <span className="version">{ide.version}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="ide-selection-modal-footer">
          <button 
            className="btn-cancel"
            onClick={handleCancel}
          >
            Cancel
          </button>
          <button 
            className="btn-confirm"
            onClick={handleConfirm}
            disabled={!selectedIDE}
          >
            Select IDE
          </button>
        </div>
      </div>
    </div>
  );
};

export default IDESelectionModal;
