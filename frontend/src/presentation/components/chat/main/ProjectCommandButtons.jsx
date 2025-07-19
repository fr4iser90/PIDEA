import { logger } from "@/infrastructure/logging/Logger";
import React, { useState, useEffect, useCallback } from 'react';
import APIChatRepository from '@/infrastructure/repositories/APIChatRepository.jsx';

/**
 * ProjectCommandButtons Component
 * Component for executing project commands (start, dev, build, test)
 * 
 * @param {Object} props - Component props
 * @param {string} props.projectId - Project identifier
 * @param {number} props.activePort - Active port for the project
 * @param {Function} props.onCommandExecute - Callback when command executes
 * @param {string} props.className - Additional CSS classes
 */
const ProjectCommandButtons = ({ 
  projectId, 
  activePort, 
  onCommandExecute,
  className = '' 
}) => {
  const [projectCommands, setProjectCommands] = useState(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentCommand, setCurrentCommand] = useState(null);
  const [error, setError] = useState(null);
  const [commandStatus, setCommandStatus] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  
  const apiRepository = new APIChatRepository();

  // Load project commands on mount
  useEffect(() => {
    if (projectId) {
      loadProjectCommands();
    }
  }, [projectId]);

  // Clear status after 5 seconds
  useEffect(() => {
    if (commandStatus.message) {
      const timeoutId = setTimeout(() => {
        setCommandStatus({});
      }, 5000);
      return () => clearTimeout(timeoutId);
    }
  }, [commandStatus]);

  /**
   * Load project commands from API
   */
  const loadProjectCommands = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      logger.info('Loading project commands for project:', projectId);
      
      const result = await apiRepository.getProjectCommands(projectId);
      
      if (result.success && result.data) {
        setProjectCommands(result.data);
        logger.info('Project commands loaded:', result.data);
      } else {
        logger.warn('No project commands found for project:', projectId);
        setProjectCommands(null);
      }
    } catch (error) {
      logger.error('Failed to load project commands:', error);
      setError('Failed to load project commands');
      setProjectCommands(null);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, apiRepository]);

  /**
   * Execute a project command
   * @param {string} commandType - Type of command (start, dev, build, test)
   */
  const executeCommand = useCallback(async (commandType) => {
    try {
      setIsExecuting(true);
      setCurrentCommand(commandType);
      setError(null);
      
      logger.info('Executing project command:', { projectId, commandType });
      
      const result = await apiRepository.executeProjectCommand(projectId, commandType, {
        port: activePort
      });
      
      if (result.success) {
        const statusMessage = `Command '${commandType}' executed successfully`;
        setCommandStatus({
          type: 'success',
          message: statusMessage,
          timestamp: new Date().toISOString()
        });
        
        logger.info('Project command executed successfully:', { commandType, result: result.data });
        
        // Call external callback
        onCommandExecute?.(commandType, result);
      } else {
        const errorMessage = result.error || `Failed to execute command '${commandType}'`;
        setError(errorMessage);
        setCommandStatus({
          type: 'error',
          message: errorMessage,
          timestamp: new Date().toISOString()
        });
        
        logger.error('Project command execution failed:', { commandType, error: result.error });
      }
    } catch (error) {
      logger.error('Error executing project command:', error);
      const errorMessage = `Failed to execute command '${commandType}': ${error.message}`;
      setError(errorMessage);
      setCommandStatus({
        type: 'error',
        message: errorMessage,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsExecuting(false);
      setCurrentCommand(null);
    }
  }, [projectId, activePort, apiRepository, onCommandExecute]);

  /**
   * Get command icon based on command type
   * @param {string} commandType - Command type
   * @returns {string} Icon character
   */
  const getCommandIcon = (commandType) => {
    const icons = {
      start: '▶',
      dev: '⚡',
      build: '🔨',
      test: '🧪',
      stop: '⏹',
      restart: '🔄'
    };
    return icons[commandType] || '▶';
  };

  /**
   * Get command label
   * @param {string} commandType - Command type
   * @returns {string} Display label
   */
  const getCommandLabel = (commandType) => {
    const labels = {
      start: 'Start',
      dev: 'Dev',
      build: 'Build',
      test: 'Test',
      stop: 'Stop',
      restart: 'Restart'
    };
    return labels[commandType] || commandType;
  };

  /**
   * Check if command is available
   * @param {string} commandType - Command type
   * @returns {boolean} Whether command is available
   */
  const isCommandAvailable = (commandType) => {
    if (!projectCommands) return false;
    return projectCommands[`${commandType}_command`] || false;
  };

  /**
   * Check if command is currently executing
   * @param {string} commandType - Command type
   * @returns {boolean} Whether command is executing
   */
  const isCommandExecuting = (commandType) => {
    return isExecuting && currentCommand === commandType;
  };

  /**
   * Get command button classes
   * @param {string} commandType - Command type
   * @returns {string} CSS classes
   */
  const getCommandClasses = (commandType) => {
    const classes = ['command-button'];
    
    if (isCommandAvailable(commandType)) {
      classes.push('command-available');
    } else {
      classes.push('command-unavailable');
    }
    
    if (isCommandExecuting(commandType)) {
      classes.push('command-executing');
    }
    
    if (commandStatus.type === 'success' && commandStatus.message.includes(commandType)) {
      classes.push('command-success');
    }
    
    if (commandStatus.type === 'error' && commandStatus.message.includes(commandType)) {
      classes.push('command-error');
    }
    
    return classes.join(' ');
  };

  /**
   * Clear command status
   */
  const clearStatus = () => {
    setCommandStatus({});
    setError(null);
  };

  // Don't render if no project ID
  if (!projectId) {
    return null;
  }

  return (
    <div className={`project-command-buttons ${className}`}>
      <div className="command-buttons-container">
        <div className="command-buttons-header">
          <span className="command-buttons-title">Project Commands</span>
          {error && (
            <div className="command-error-message">
              <span>⚠</span>
              <span>{error}</span>
            </div>
          )}
        </div>
        
        <div className="command-buttons-grid">
          {['start', 'dev', 'build', 'test'].map((commandType) => (
            <button
              key={commandType}
              className={getCommandClasses(commandType)}
              onClick={() => executeCommand(commandType)}
              disabled={!isCommandAvailable(commandType) || isExecuting}
              title={`Execute ${getCommandLabel(commandType)} command`}
            >
              <span className="command-icon">{getCommandIcon(commandType)}</span>
              <span className="command-label">{getCommandLabel(commandType)}</span>
              
              {isCommandExecuting(commandType) && (
                <div className="command-loading">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="31.416" strokeDashoffset="31.416">
                      <animate attributeName="stroke-dasharray" dur="1s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite"/>
                      <animate attributeName="stroke-dashoffset" dur="1s" values="0;-15.708;-31.416" repeatCount="indefinite"/>
                    </circle>
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
        
        {commandStatus.message && (
          <div className="command-status">
            <div className="status-header">
              <span className="status-command">
                {commandStatus.type === 'success' ? '✅' : '❌'} 
                {commandStatus.message}
              </span>
              <button
                type="button"
                className="status-clear"
                onClick={clearStatus}
                title="Clear status"
              >
                ×
              </button>
            </div>
            <div className="status-timestamp">
              {new Date(commandStatus.timestamp).toLocaleTimeString()}
            </div>
          </div>
        )}
        
        {isLoading && (
          <div className="command-loading">
            <span>Loading project commands...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectCommandButtons; 