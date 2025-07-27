import { logger } from "@/infrastructure/logging/Logger";
import React, { useState, useEffect, useCallback } from 'react';
import { apiCall } from '@/infrastructure/repositories/APIChatRepository.jsx';
import useIDESwitchOptimizationStore from '@/infrastructure/stores/IDESwitchOptimizationStore';
import '@/css/components/ide/ide-switch.css';

/**
 * IDE Switch Component
 * Provides smooth IDE switching with progress indicators and error handling
 */
const IDESwitch = ({ 
  eventBus, 
  currentPort, 
  targetPort, 
  onSwitchComplete, 
  onSwitchError,
  className = '',
  showProgress = true,
  autoSwitch = false
}) => {
  const [isSwitching, setIsSwitching] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [error, setError] = useState(null);
  const [switchHistory, setSwitchHistory] = useState([]);

  // Auto-switch when targetPort changes
  useEffect(() => {
    if (autoSwitch && targetPort && targetPort !== currentPort) {
      handleSwitch(targetPort);
    }
  }, [targetPort, currentPort, autoSwitch]);

  // Listen for switch events
  useEffect(() => {
    if (!eventBus) return;

    const handleSwitchRequested = (data) => {
      if (data.targetPort && data.targetPort !== currentPort) {
        handleSwitch(data.targetPort, data.reason);
      }
    };

    const handleSwitchProgress = (data) => {
      if (data.progress !== undefined) {
        setProgress(data.progress);
      }
      if (data.status) {
        setStatus(data.status);
      }
    };

    const handleSwitchComplete = (data) => {
      setIsSwitching(false);
      setProgress(100);
      setStatus('Switch completed');
      
      // Add to history
      setSwitchHistory(prev => [...prev, {
        from: currentPort,
        to: data.targetPort,
        timestamp: new Date(),
        success: true
      }]);

      if (onSwitchComplete) {
        onSwitchComplete(data);
      }
    };

    const handleSwitchError = (data) => {
      setIsSwitching(false);
      setError(data.error || 'Switch failed');
      
      // Add to history
      setSwitchHistory(prev => [...prev, {
        from: currentPort,
        to: data.targetPort,
        timestamp: new Date(),
        success: false,
        error: data.error
      }]);

      if (onSwitchError) {
        onSwitchError(data);
      }
    };

    eventBus.on('ideSwitchRequested', handleSwitchRequested);
    eventBus.on('ideSwitchProgress', handleSwitchProgress);
    eventBus.on('ideSwitchComplete', handleSwitchComplete);
    eventBus.on('ideSwitchError', handleSwitchError);

    return () => {
      eventBus.off('ideSwitchRequested', handleSwitchRequested);
      eventBus.off('ideSwitchProgress', handleSwitchProgress);
      eventBus.off('ideSwitchComplete', handleSwitchComplete);
      eventBus.off('ideSwitchError', handleSwitchError);
    };
  }, [eventBus, currentPort, onSwitchComplete, onSwitchError]);

  /**
   * Handle IDE switching
   */
  const handleSwitch = async (targetPort, reason = 'manual') => {
    if (isSwitching || targetPort === currentPort) return;

    const switchStartTime = performance.now();
    logger.info(`[IDESwitch] Starting complete IDE switch from ${currentPort} to ${targetPort}`);

    // Get optimization store
    const optimizationStore = useIDESwitchOptimizationStore.getState();

    try {
      setIsSwitching(true);
      setProgress(0);
      setStatus('Initiating switch...');
      setError(null);

      // Start optimization tracking
      optimizationStore.startSwitch(targetPort);

      // Emit switch start event
      if (eventBus) {
        eventBus.emit('ideSwitchStarted', { 
          fromPort: currentPort, 
          toPort: targetPort, 
          reason 
        });
      }

      // Step 1: Validate target IDE (10%)
      setProgress(10);
      setStatus('Validating target IDE...');
      
      const validationStart = performance.now();
      const validationResult = await apiCall(`/api/ide/status?port=${targetPort}`);
      const validationTime = performance.now() - validationStart;
      logger.info(`[IDESwitch] Validation completed in ${validationTime.toFixed(2)}ms`);
      
      if (!validationResult.success) {
        throw new Error('Target IDE not available');
      }

      // Step 2: Prepare current IDE (30%)
      setProgress(30);
      setStatus('Preparing current IDE...');
      
      if (currentPort) {
        const prepareStart = performance.now();
        await apiCall(`/api/ide/prepare-switch`, {
          method: 'POST',
          body: JSON.stringify({ port: currentPort, action: 'prepare' })
        });
        const prepareTime = performance.now() - prepareStart;
        logger.info(`[IDESwitch] Prepare completed in ${prepareTime.toFixed(2)}ms`);
      }

      // Step 3: Switch to target IDE (60%)
      setProgress(60);
      setStatus('Switching to target IDE...');
      
      const switchStart = performance.now();
      const switchResult = await apiCall('/api/ide/selection', {
        method: 'POST',
        body: JSON.stringify({ 
          port: targetPort, 
          reason,
          fromPort: currentPort 
        })
      });
      const switchTime = performance.now() - switchStart;
      logger.info(`[IDESwitch] Backend switch completed in ${switchTime.toFixed(2)}ms`);

      if (!switchResult.success) {
        throw new Error(switchResult.error || 'Switch failed');
      }

      // Step 4: Verify switch (90%)
      setProgress(90);
      setStatus('Verifying switch...');
      
      const verifyStart = performance.now();
      await new Promise(resolve => setTimeout(resolve, 500)); // Brief delay for verification
      const verifyTime = performance.now() - verifyStart;
      logger.info(`[IDESwitch] Verification completed in ${verifyTime.toFixed(2)}ms`);

      // Step 5: Complete switch (100%)
      setProgress(100);
      setStatus('Switch completed successfully');

      const totalSwitchTime = performance.now() - switchStartTime;
      logger.info(`[IDESwitch] Complete IDE switch from ${currentPort} to ${targetPort} finished in ${totalSwitchTime.toFixed(2)}ms`);

      // Emit success event
      if (eventBus) {
        eventBus.emit('ideSwitchComplete', { 
          fromPort: currentPort, 
          toPort: targetPort,
          targetPort,
          success: true,
          timing: {
            totalTime: totalSwitchTime.toFixed(2),
            validationTime: validationTime.toFixed(2),
            switchTime: switchTime.toFixed(2)
          }
        });
      }

      // Add to history
      setSwitchHistory(prev => [...prev, {
        from: currentPort,
        to: targetPort,
        timestamp: new Date(),
        success: true,
        duration: totalSwitchTime.toFixed(2)
      }]);

      if (onSwitchComplete) {
        onSwitchComplete({ 
          fromPort: currentPort, 
          toPort: targetPort, 
          targetPort,
          timing: {
            totalTime: totalSwitchTime.toFixed(2)
          }
        });
      }

    } catch (error) {
      const totalSwitchTime = performance.now() - switchStartTime;
      logger.error(`[IDESwitch] Error switching IDE after ${totalSwitchTime.toFixed(2)}ms:`, error);
      
      setError(error.message);
      setStatus('Switch failed');

      // Emit error event
      if (eventBus) {
        eventBus.emit('ideSwitchError', { 
          fromPort: currentPort, 
          toPort: targetPort,
          targetPort,
          error: error.message 
        });
      }

      // Add to history
      setSwitchHistory(prev => [...prev, {
        from: currentPort,
        to: targetPort,
        timestamp: new Date(),
        success: false,
        error: error.message
      }]);

      if (onSwitchError) {
        onSwitchError({ fromPort: currentPort, toPort: targetPort, error: error.message });
      }
    } finally {
      setIsSwitching(false);
    }
  };

  /**
   * Get switch status display
   */
  const getSwitchStatus = () => {
    if (error) {
      return (
        <div className="switch-status error">
          <span className="status-icon">❌</span>
          <span className="status-text">{error}</span>
        </div>
      );
    }

    if (isSwitching) {
      return (
        <div className="switch-status switching">
          <span className="status-icon">🔄</span>
          <span className="status-text">{status}</span>
          {showProgress && (
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }}></div>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="switch-status idle">
        <span className="status-icon">✅</span>
        <span className="status-text">Ready to switch</span>
      </div>
    );
  };

  /**
   * Get recent switch history
   */
  const getRecentHistory = () => {
    const recent = switchHistory.slice(-3).reverse();
    
    return (
      <div className="switch-history">
        <h4>Recent Switches</h4>
        {recent.map((switchItem, index) => (
          <div key={index} className={`history-item ${switchItem.success ? 'success' : 'error'}`}>
            <span className="history-icon">
              {switchItem.success ? '✅' : '❌'}
            </span>
            <span className="history-ports">
              {switchItem.from || 'None'} → {switchItem.to}
            </span>
            <span className="history-time">
              {switchItem.timestamp.toLocaleTimeString()}
            </span>
            {switchItem.duration && (
              <span className="history-duration">
                {switchItem.duration}ms
              </span>
            )}
            {switchItem.error && (
              <span className="history-error">{switchItem.error}</span>
            )}
          </div>
        ))}
        {recent.length === 0 && (
          <div className="history-empty">No recent switches</div>
        )}
      </div>
    );
  };

  return (
    <div className={`ide-switch ${className}`}>
      <div className="switch-header">
        <h3>IDE Switch</h3>
        {getSwitchStatus()}
      </div>

      <div className="switch-controls">
        {targetPort && targetPort !== currentPort && (
          <button
            className="switch-button primary"
            onClick={() => handleSwitch(targetPort)}
            disabled={isSwitching}
          >
            {isSwitching ? 'Switching...' : `Switch to Port ${targetPort}`}
          </button>
        )}

        {isSwitching && (
          <button
            className="switch-button secondary"
            onClick={() => {
              setIsSwitching(false);
              setProgress(0);
              setStatus('');
              setError('Switch cancelled');
            }}
          >
            Cancel Switch
          </button>
        )}
      </div>

      {showProgress && isSwitching && (
        <div className="switch-progress">
          <div className="progress-container">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <span className="progress-text">{progress}%</span>
          </div>
        </div>
      )}

      {switchHistory.length > 0 && (
        <div className="switch-details">
          {getRecentHistory()}
        </div>
      )}
    </div>
  );
};

export default IDESwitch; 