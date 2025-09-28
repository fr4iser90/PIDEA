/**
 * Frontend Integration Example for TaskStatusSyncStep
 * Shows how to use the new Task Status Sync functionality
 * Created: 2025-09-28T17:54:16.000Z
 */

// Example: Enhanced Sync Button Handler
const handleEnhancedSyncTasks = async () => {
  if (!projectId || !activeIDE?.workspacePath) {
    setFeedback('No project selected for task sync');
    return;
  }
  
  setIsLoadingManualTasks(true);
  setIsWaitingForSync(true);
  try {
    // Step 1: Sync manual tasks (existing functionality)
    const syncResponse = await apiCall(`/api/projects/${projectId}/tasks/sync-manual`, {
      method: 'POST',
      body: JSON.stringify({ projectPath: activeIDE.workspacePath })
    });
    
    if (syncResponse && syncResponse.success) {
      // Step 2: Validate task statuses (NEW functionality)
      try {
        const validationResponse = await apiCall(`/api/projects/${projectId}/tasks/validate-status`, {
          method: 'POST',
          body: JSON.stringify({
            taskIds: [], // Empty array means validate all tasks
            targetStatus: 'pending'
          })
        });

        if (validationResponse && validationResponse.success) {
          const validation = validationResponse.data;
          logger.info('🔍 Task status validation completed:', {
            totalTasks: validation.totalTasks,
            validTasks: validation.validTasks,
            invalidTasks: validation.invalidTasks
          });

          // Show validation results in feedback
          if (validation.invalidTasks > 0) {
            setFeedback(`Tasks synced successfully (${syncResponse.data?.importedCount || 0} imported). ⚠️ Found ${validation.invalidTasks} invalid status transitions.`);
          } else {
            setFeedback(`Tasks synced successfully (${syncResponse.data?.importedCount || 0} imported). ✅ All task statuses validated.`);
          }
        }
      } catch (validationError) {
        logger.warn('Status validation failed (non-critical):', validationError);
        setFeedback(`Tasks synced successfully (${syncResponse.data?.importedCount || 0} imported). Status validation skipped.`);
      }

      // Reload tasks after sync
      await loadProjectTasks(activeIDE.workspacePath);
      setLastLoadTime(Date.now());
      setIsInitialSyncComplete(true);
      setIsWaitingForSync(false);
      logger.info('Enhanced sync completed successfully:', { 
        taskCount: manualTasks.length, 
        importedCount: syncResponse.data?.importedCount || 0,
        projectId 
      });
    } else {
      throw new Error(syncResponse?.error || 'Task sync failed');
    }
  } catch (error) {
    logger.error('Error in enhanced sync:', error);
    setFeedback('Error syncing tasks');
    setIsWaitingForSync(false);
  } finally {
    setIsLoadingManualTasks(false);
  }
};

// Example: Batch Status Sync
const handleBatchStatusSync = async (taskIds, targetStatus) => {
  try {
    const response = await apiCall(`/api/projects/${projectId}/tasks/sync-status`, {
      method: 'POST',
      body: JSON.stringify({
        operation: 'batch-sync',
        taskIds,
        targetStatus,
        sourceSystem: 'manual',
        targetSystem: 'automated',
        options: {
          validateTransitions: true,
          moveFiles: true,
          emitEvents: true
        }
      })
    });

    if (response && response.success) {
      logger.info('Batch status sync completed:', {
        processedTasks: response.data.processedTasks,
        successfulTasks: response.data.successfulTasks,
        failedTasks: response.data.failedTasks
      });
      
      setFeedback(`Batch sync completed: ${response.data.successfulTasks} successful, ${response.data.failedTasks} failed`);
    }
  } catch (error) {
    logger.error('Batch status sync failed:', error);
    setFeedback('Error in batch status sync');
  }
};

// Example: Status Rollback
const handleStatusRollback = async (taskIds, previousStatus) => {
  try {
    const response = await apiCall(`/api/projects/${projectId}/tasks/rollback-status`, {
      method: 'POST',
      body: JSON.stringify({
        taskIds,
        previousStatus
      })
    });

    if (response && response.success) {
      logger.info('Status rollback completed:', {
        successfulRollbacks: response.data.successfulRollbacks,
        failedRollbacks: response.data.failedRollbacks
      });
      
      setFeedback(`Rollback completed: ${response.data.successfulRollbacks} successful, ${response.data.failedRollbacks} failed`);
    }
  } catch (error) {
    logger.error('Status rollback failed:', error);
    setFeedback('Error in status rollback');
  }
};

// Example: Status Validation Only
const handleValidateStatuses = async (taskIds, targetStatus) => {
  try {
    const response = await apiCall(`/api/projects/${projectId}/tasks/validate-status`, {
      method: 'POST',
      body: JSON.stringify({
        taskIds,
        targetStatus
      })
    });

    if (response && response.success) {
      const validation = response.data;
      logger.info('Status validation completed:', {
        totalTasks: validation.totalTasks,
        validTasks: validation.validTasks,
        invalidTasks: validation.invalidTasks
      });
      
      if (validation.invalidTasks > 0) {
        const invalidTasks = validation.results.filter(r => !r.valid);
        logger.warn('Invalid status transitions found:', invalidTasks);
        setFeedback(`Validation completed: ${validation.validTasks} valid, ${validation.invalidTasks} invalid`);
      } else {
        setFeedback(`Validation completed: All ${validation.totalTasks} tasks have valid status transitions`);
      }
    }
  } catch (error) {
    logger.error('Status validation failed:', error);
    setFeedback('Error in status validation');
  }
};

export {
  handleEnhancedSyncTasks,
  handleBatchStatusSync,
  handleStatusRollback,
  handleValidateStatuses
};
