import { logger } from "@/infrastructure/logging/Logger";
import React, { useState, useEffect } from 'react';
import TaskProgressComponent from './TaskProgressComponent';
import AutoFinishService from '../../application/services/AutoFinishService';
import './AutoFinishDemo.css';

/**
 * AutoFinishDemo - Demo component for the Auto-Finish System
 * Shows TODO input, processing, and real-time progress
 */
const AutoFinishDemo = () => {
  const [todoInput, setTodoInput] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [autoFinishService, setAutoFinishService] = useState(null);
  const [supportedPatterns, setSupportedPatterns] = useState([]);
  const [taskTypes, setTaskTypes] = useState({});

  useEffect(() => {
    initializeAutoFinishService();
  }, []);

  const initializeAutoFinishService = async () => {
    try {
      const service = new AutoFinishService();
      await service.initialize();
      setAutoFinishService(service);

      // Load supported patterns and task types
      const patterns = await service.getSupportedPatterns();
      const types = await service.getTaskTypeKeywords();
      
      setSupportedPatterns(patterns);
      setTaskTypes(types);
    } catch (error) {
      logger.error('Failed to initialize Auto-Finish service:', error);
      setError('Failed to initialize Auto-Finish service');
    }
  };

  const handleProcessTodo = async () => {
    if (!todoInput.trim()) {
      setError('Please enter a TODO list');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      const result = await autoFinishService.processTodoList(todoInput, {
        stopOnError: false,
        maxConfirmationAttempts: 3
      });

      setSessionId(result.sessionId);
      logger.log('TODO processing started:', result);
    } catch (error) {
      logger.error('Failed to process TODO list:', error);
      setError(error.message || 'Failed to process TODO list');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleComplete = (result) => {
    logger.log('TODO processing completed:', result);
    setSessionId(null);
    setTodoInput('');
  };

  const handleError = (errorMessage) => {
    logger.error('TODO processing failed:', errorMessage);
    setError(errorMessage);
    setSessionId(null);
  };

  const handleCancel = () => {
    logger.log('TODO processing cancelled');
    setSessionId(null);
  };

  const getExampleTodo = () => {
    return `TODO: Create a new button component
- Add form validation
1. Update API endpoint
[ ] Write unit tests
FIXME: Fix authentication bug
NOTE: Consider adding error handling`;
  };

  const loadExample = () => {
    setTodoInput(getExampleTodo());
  };

  const clearInput = () => {
    setTodoInput('');
    setError(null);
  };

  return (
    <div className="auto-finish-demo">
      <div className="demo-header">
        <h1>Auto-Finish System Demo</h1>
        <p>Automatically process TODO lists with AI-powered task completion</p>
      </div>

      <div className="demo-content">
        <div className="input-section">
          <div className="input-header">
            <h2>TODO List Input</h2>
            <div className="input-actions">
              <button onClick={loadExample} className="btn btn-secondary">
                Load Example
              </button>
              <button onClick={clearInput} className="btn btn-secondary">
                Clear
              </button>
            </div>
          </div>

          <textarea
            value={todoInput}
            onChange={(e) => setTodoInput(e.target.value)}
            placeholder="Enter your TODO list here...
Examples:
TODO: Create a new component
- Add validation
1. Update API
[ ] Write tests"
            className="todo-input"
            rows={10}
            disabled={isProcessing}
          />

          <div className="input-footer">
            <button
              onClick={handleProcessTodo}
              disabled={isProcessing || !todoInput.trim()}
              className="btn btn-primary"
            >
              {isProcessing ? 'Processing...' : 'Process TODO List'}
            </button>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}
          </div>
        </div>

        {sessionId && (
          <div className="progress-section">
            <h2>Processing Progress</h2>
            <TaskProgressComponent
              sessionId={sessionId}
              onComplete={handleComplete}
              onError={handleError}
              onCancel={handleCancel}
            />
          </div>
        )}

        <div className="info-section">
          <div className="patterns-info">
            <h3>Supported Patterns</h3>
            <ul>
              {supportedPatterns.map((pattern, index) => (
                <li key={index}>
                  <code>{pattern.pattern}</code> - {pattern.description}
                </li>
              ))}
            </ul>
          </div>

          <div className="task-types-info">
            <h3>Task Types</h3>
            <div className="task-types-grid">
              {Object.entries(taskTypes).map(([type, keywords]) => (
                <div key={type} className="task-type">
                  <h4>{type}</h4>
                  <p>{keywords.join(', ')}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutoFinishDemo; 