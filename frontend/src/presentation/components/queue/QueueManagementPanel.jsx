/**
 * QueueManagementPanel - Main queue management interface
 * Provides comprehensive queue monitoring, control, and step progress tracking
 */

import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '@/infrastructure/logging/Logger';
import QueueRepository from '@/infrastructure/repositories/QueueRepository.jsx';
import WebSocketService from '@/infrastructure/services/WebSocketService.jsx';
import { useActiveIDE } from '@/infrastructure/stores/selectors/ProjectSelectors.jsx';
import { useRefreshService } from '@/hooks/useRefreshService';
import ActiveTaskItem from './ActiveTaskItem.jsx';
import QueueItem from './QueueItem.jsx';
import QueueControls from './QueueControls.jsx';
import StepTimeline from './StepTimeline.jsx';
import QueueHistoryPanel from './QueueHistoryPanel.jsx';
import '@/scss/components/_queue-panel.scss';;

const QueueManagementPanel = ({ eventBus, activePort }) => {
    const [queueStatus, setQueueStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedTask, setSelectedTask] = useState(null);
    const [stepProgress, setStepProgress] = useState(null);

    const [activeTab, setActiveTab] = useState('active'); // 'active' or 'history'

    const queueRepository = new QueueRepository();
    const webSocketService = WebSocketService; // Use the singleton instance

    // ✅ NEW: Integrate with RefreshService
    const { forceRefresh, getStats } = useRefreshService('queue', {
        fetchData: async () => {
            try {
                const status = await queueRepository.getQueueStatus();
                return status;
            } catch (error) {
                logger.error('Failed to fetch queue data:', error);
                throw error;
            }
        },
        updateData: (data) => {
            if (data) {
                setQueueStatus(data);
                setLoading(false);
                setError(null);
            }
        }
    });


    const { projectId } = useActiveIDE();

    /**
     * Load queue status
     */
    const loadQueueStatus = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            logger.debug('Loading queue status', { projectId });
            const status = await queueRepository.getQueueStatus(projectId);
            setQueueStatus(status);

            logger.debug('Queue status loaded', { 
                projectId, 
                totalItems: status?.queue?.total || 0,
                running: status?.queue?.running || 0,
                queued: status?.queue?.queued || 0
            });

        } catch (error) {
            logger.error('Failed to load queue status', { projectId, error: error.message });
            setError(error.message);
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    // Load queue status when projectId changes
    useEffect(() => {
        if (projectId) {
            logger.debug('Project ID changed, loading queue status', { projectId });
            loadQueueStatus();
        }
    }, [projectId, loadQueueStatus]);

    /**
     * Load step progress for selected task from queue data
     */
    const loadStepProgress = useCallback(async (taskId) => {
        if (!taskId || !queueStatus) return;

        try {
            logger.debug('Loading step progress from queue data', { projectId, taskId });
            
            // Find the task in the queue
            const task = queueStatus.queue?.find(item => item.id === taskId);
            if (!task) {
                logger.warn('Task not found in queue', { projectId, taskId });
                return;
            }

            // Extract step progress from queue item
            const progress = {
                projectId,
                taskId,
                currentStep: task.workflow?.currentStep || 0,
                totalSteps: task.workflow?.steps?.length || 0,
                progressPercentage: task.workflow?.progress || 0,
                steps: task.workflow?.steps || [],
                status: task.status,
                startedAt: task.startedAt,
                completedAt: task.completedAt
            };

            setStepProgress(progress);

            logger.debug('Step progress loaded from queue data', { 
                projectId, 
                taskId, 
                currentStep: progress.currentStep,
                progressPercentage: progress.progressPercentage,
                totalSteps: progress.totalSteps
            });

        } catch (error) {
            logger.error('Failed to load step progress from queue data', { 
                projectId, 
                taskId, 
                error: error.message 
            });
        }
    }, [projectId, queueStatus]);

    /**
     * Cancel queue item
     */
    const handleCancelItem = async (itemId) => {
        try {
            logger.info('Cancelling queue item', { projectId, itemId });
            await queueRepository.cancelQueueItem(projectId, itemId);
            
            // Reload queue status
            await loadQueueStatus();
            
            logger.info('Queue item cancelled successfully', { projectId, itemId });

        } catch (error) {
            logger.error('Failed to cancel queue item', { 
                projectId, 
                itemId, 
                error: error.message 
            });
            setError(error.message);
        }
    };

    /**
     * Update queue item priority
     */
    const handleUpdatePriority = async (itemId, priority) => {
        try {
            logger.info('Updating queue item priority', { projectId, itemId, priority });
            await queueRepository.updateQueueItemPriority(projectId, itemId, priority);
            
            // Reload queue status
            await loadQueueStatus();
            
            logger.info('Queue item priority updated successfully', { 
                projectId, 
                itemId, 
                priority 
            });

        } catch (error) {
            logger.error('Failed to update queue item priority', { 
                projectId, 
                itemId, 
                priority, 
                error: error.message 
            });
            setError(error.message);
        }
    };

    /**
     * Toggle step status
     */
    const handleToggleStepStatus = async (stepId, action) => {
        if (!selectedTask) return;

        try {
            logger.info('Toggling step status', { 
                projectId, 
                taskId: selectedTask.id, 
                stepId, 
                action 
            });
            
            await queueRepository.toggleStepStatus(projectId, selectedTask.id, stepId, action);
            
            // Reload step progress
            await loadStepProgress(selectedTask.id);
            
            logger.info('Step status toggled successfully', { 
                projectId, 
                taskId: selectedTask.id, 
                stepId, 
                action 
            });

        } catch (error) {
            logger.error('Failed to toggle step status', { 
                projectId, 
                taskId: selectedTask.id, 
                stepId, 
                action, 
                error: error.message 
            });
            setError(error.message);
        }
    };

    /**
     * Clear completed items
     */
    const handleClearCompleted = async () => {
        try {
            logger.info('Clearing completed items', { projectId });
            await queueRepository.clearCompletedItems(projectId);
            
            // Reload queue status
            await loadQueueStatus();
            
            logger.info('Completed items cleared successfully', { projectId });

        } catch (error) {
            logger.error('Failed to clear completed items', { 
                projectId, 
                error: error.message 
            });
            setError(error.message);
        }
    };

    /**
     * Handle task selection
     */
    const handleTaskSelect = (task) => {
        setSelectedTask(task);
        if (task) {
            loadStepProgress(task.id);
        } else {
            setStepProgress(null);
        }
    };

    /**
     * Setup WebSocket event listeners
     */
    useEffect(() => {
        const setupWebSocket = async () => {
            try {
                await webSocketService.connect();
                
                // Subscribe to queue events
                webSocketService.on('queue:updated', (data) => {
                    logger.debug('Queue updated via WebSocket', { projectId, data });
                    loadQueueStatus();
                });

                webSocketService.on('queue:item:added', (data) => {
                    logger.debug('Queue item added via WebSocket', { projectId, data });
                    loadQueueStatus();
                });

                webSocketService.on('queue:item:cancelled', (data) => {
                    logger.debug('Queue item cancelled via WebSocket', { projectId, data });
                    loadQueueStatus();
                });

                webSocketService.on('queue:item:updated', (data) => {
                    logger.debug('Queue item updated via WebSocket', { projectId, data });
                    
                    // Update specific queue item with progress data if available
                    if (data.item && data.item.workflow) {
                        setQueueStatus(prevStatus => {
                            if (!prevStatus || !prevStatus.queue) return prevStatus;
                            
                            // Handle queue structure (could be array or object with active/completed)
                            const queueItems = Array.isArray(prevStatus.queue) 
                                ? prevStatus.queue 
                                : [
                                    ...(Array.isArray(prevStatus.queue.active) ? prevStatus.queue.active : []),
                                    ...(Array.isArray(prevStatus.queue.completed) ? prevStatus.queue.completed : [])
                                ];
                            
                            const updatedQueue = queueItems.map(item => {
                                if (item.id === data.itemId) {
                                    return {
                                        ...item,
                                        ...data.item,
                                        workflow: {
                                            ...item.workflow,
                                            ...data.item.workflow
                                        }
                                    };
                                }
                                return item;
                            });
                            
                            // Return appropriate structure
                            if (Array.isArray(prevStatus.queue)) {
                                return {
                                    ...prevStatus,
                                    queue: updatedQueue
                                };
                            } else {
                                // Split back into active/completed
                                const active = updatedQueue.filter(item => 
                                    item.status === 'running' || item.status === 'queued'
                                );
                                const completed = updatedQueue.filter(item => 
                                    item.status === 'completed' || item.status === 'failed'
                                );
                                
                                return {
                                    ...prevStatus,
                                    queue: {
                                        ...prevStatus.queue,
                                        active,
                                        completed,
                                        total: updatedQueue.length,
                                        running: active.filter(item => item.status === 'running').length,
                                        queued: active.filter(item => item.status === 'queued').length,
                                        completedCount: completed.filter(item => item.status === 'completed').length,
                                        failed: completed.filter(item => item.status === 'failed').length
                                    }
                                };
                            }
                        });
                        
                        // Update step progress if this is the selected task
                        if (selectedTask && data.itemId === selectedTask.id) {
                            setTimeout(() => loadStepProgress(selectedTask.id), 100);
                        }
                    } else {
                        // Fallback: reload entire queue status
                        loadQueueStatus();
                    }
                });

                // Subscribe to step progress events
                webSocketService.on('workflow:step:progress', (data) => {
                    logger.debug('Step progress updated via WebSocket', { projectId, data });
                    
                    // Update queue item with step progress data
                    if (data.workflowId && data.overallProgress !== undefined) {
                        setQueueStatus(prevStatus => {
                            if (!prevStatus || !prevStatus.queue) return prevStatus;
                            
                            // Handle queue structure (could be array or object with active/completed)
                            const queueItems = Array.isArray(prevStatus.queue) 
                                ? prevStatus.queue 
                                : [
                                    ...(Array.isArray(prevStatus.queue.active) ? prevStatus.queue.active : []),
                                    ...(Array.isArray(prevStatus.queue.completed) ? prevStatus.queue.completed : [])
                                ];
                            
                            const updatedQueue = queueItems.map(item => {
                                if (item.id === data.workflowId) {
                                    return {
                                        ...item,
                                        workflow: {
                                            ...item.workflow,
                                            progress: data.overallProgress,
                                            currentStep: data.currentStep || item.workflow?.currentStep
                                        }
                                    };
                                }
                                return item;
                            });
                            
                            // Return appropriate structure
                            if (Array.isArray(prevStatus.queue)) {
                                return {
                                    ...prevStatus,
                                    queue: updatedQueue
                                };
                            } else {
                                // Split back into active/completed
                                const active = updatedQueue.filter(item => 
                                    item.status === 'running' || item.status === 'queued'
                                );
                                const completed = updatedQueue.filter(item => 
                                    item.status === 'completed' || item.status === 'failed'
                                );
                                
                                return {
                                    ...prevStatus,
                                    queue: {
                                        ...prevStatus.queue,
                                        active,
                                        completed,
                                        total: updatedQueue.length,
                                        running: active.filter(item => item.status === 'running').length,
                                        queued: active.filter(item => item.status === 'queued').length,
                                        completedCount: completed.filter(item => item.status === 'completed').length,
                                        failed: completed.filter(item => item.status === 'failed').length
                                    }
                                };
                            }
                        });
                    }
                    
                    // Load detailed step progress for selected task
                    if (selectedTask && data.workflowId === selectedTask.id) {
                        loadStepProgress(selectedTask.id);
                    }
                });

                webSocketService.on('workflow:step:started', (data) => {
                    logger.debug('Step started via WebSocket', { projectId, data });
                    if (selectedTask && data.workflowId === selectedTask.id) {
                        loadStepProgress(selectedTask.id);
                    }
                });

                webSocketService.on('workflow:step:completed', (data) => {
                    logger.debug('Step completed via WebSocket', { projectId, data });
                    if (selectedTask && data.workflowId === selectedTask.id) {
                        loadStepProgress(selectedTask.id);
                    }
                });

                logger.info('WebSocket event listeners setup complete', { projectId });

            } catch (error) {
                logger.error('Failed to setup WebSocket', { projectId, error: error.message });
            }
        };

        setupWebSocket();

        return () => {
            // Cleanup WebSocket listeners
            webSocketService.off('queue:updated');
            webSocketService.off('queue:item:added');
            webSocketService.off('queue:item:cancelled');
            webSocketService.off('queue:item:updated');
            webSocketService.off('workflow:step:progress');
            webSocketService.off('workflow:step:started');
            webSocketService.off('workflow:step:completed');
        };
    }, [projectId, selectedTask]);



    /**
     * Initial load
     */
    useEffect(() => {
        loadQueueStatus();
    }, [loadQueueStatus]);

    /**
     * Handle refresh button click
     */
    const handleRefresh = () => {
        loadQueueStatus();
        if (selectedTask) {
            loadStepProgress(selectedTask.id);
        }
    };



    if (loading && !queueStatus) {
        return (
            <div className="queue-panel__queue-panel">
                <div className="queue-panel__queue-panel-header">
                    <h3>🔄 Queue Management</h3>
                </div>
                <div className="queue-panel__queue-panel-content">
                    <div className="loading-spinner">Loading queue status...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="queue-panel__queue-panel">
                <div className="queue-panel__queue-panel-header">
                    <h3>🔄 Queue Management</h3>
                </div>
                <div className="queue-panel__queue-panel-content">
                    <div className="error-message">
                        <p>❌ Error loading queue status: {error}</p>
                        <button onClick={loadQueueStatus} className="btn-retry">
                            Retry
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const activeItems = queueStatus?.queue?.active || [];
    const completedItems = queueStatus?.queue?.completed || [];
    const statistics = queueStatus?.statistics || {};

    return (
        <div className="queue-panel__queue-panel">
            <div className="queue-panel__queue-panel-header">
                <h3>🔄 Queue Management</h3>
                <div className="queue-panel__queue-panel-controls">
                    <button 
                        onClick={handleRefresh} 
                        className="queue-panel__btn-refresh"
                        title="Refresh queue status"
                    >
                        🔄
                    </button>

                </div>
            </div>

            <div className="queue-panel__queue-panel-content">
                {/* Tab Navigation */}
                <div className="queue-panel__queue-tabs">
                    <button 
                        className={`queue-panel__queue-tab ${activeTab === 'active' ? 'active' : ''}`}
                        onClick={() => setActiveTab('active')}
                    >
                        🟢 Active Tasks
                    </button>
                    <button 
                        className={`queue-panel__queue-tab ${activeTab === 'history' ? 'active' : ''}`}
                        onClick={() => setActiveTab('history')}
                    >
                        📚 History
                    </button>
                </div>

                {/* Active Tab Content */}
                {activeTab === 'active' && (
                    <>
                        {/* Queue Statistics */}
                        <div className="queue-panel__queue-statistics">
                            <div className="queue-panel__stat-item">
                                <span className="queue-panel__stat-label">Total:</span>
                                <span className="queue-panel__stat-value">{statistics.totalItems || 0}</span>
                            </div>
                            <div className="queue-panel__stat-item">
                                <span className="queue-panel__stat-label">Running:</span>
                                <span className="queue-panel__stat-value running">{statistics.running || 0}</span>
                            </div>
                            <div className="queue-panel__stat-item">
                                <span className="queue-panel__stat-label">Queued:</span>
                                <span className="queue-panel__stat-value queued">{statistics.queued || 0}</span>
                            </div>
                            <div className="queue-panel__stat-item">
                                <span className="queue-panel__stat-label">Completed:</span>
                                <span className="queue-panel__stat-value completed">{statistics.completedCount || 0}</span>
                            </div>
                            <div className="queue-panel__stat-item">
                                <span className="queue-panel__stat-label">Failed:</span>
                                <span className="queue-panel__stat-value failed">{statistics.failed || 0}</span>
                            </div>
                        </div>

                        {/* Active Tasks */}
                        <div className="queue-panel__queue-section">
                            <h4>🟢 Active Tasks ({activeItems.length})</h4>
                            {activeItems.length === 0 ? (
                                <div className="queue-panel__empty-state">
                                    <p>No active tasks</p>
                                </div>
                            ) : (
                                <div className="queue-panel__queue-items">
                                    {activeItems.map((item) => (
                                        <ActiveTaskItem
                                            key={item.id}
                                            item={item}
                                            isSelected={selectedTask?.id === item.id}
                                            onSelect={() => handleTaskSelect(item)}
                                            onCancel={() => handleCancelItem(item.id)}
                                            onUpdatePriority={(priority) => handleUpdatePriority(item.id, priority)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Selected Task Step Progress */}
                        {selectedTask && stepProgress && (
                            <div className="queue-panel__queue-section">
                                <h4>📊 Step Progress: {selectedTask.workflow?.name || selectedTask.id}</h4>
                                <StepTimeline
                                    stepProgress={stepProgress}
                                    onToggleStepStatus={handleToggleStepStatus}
                                    taskId={selectedTask.id}
                                    projectId={projectId}
                                    taskMode={selectedTask.workflow?.type}
                                />
                            </div>
                        )}

                        {/* Completed Tasks */}
                        {completedItems.length > 0 && (
                            <div className="queue-panel__queue-section">
                                <div className="section-header">
                                    <h4>✅ Completed Tasks ({completedItems.length})</h4>
                                    <button 
                                        onClick={handleClearCompleted} 
                                        className="btn-clear-completed"
                                        title="Clear completed items"
                                    >
                                        🗑️ Clear
                                    </button>
                                </div>
                                <div className="queue-panel__queue-items">
                                    {completedItems.slice(0, 5).map((item) => (
                                        <QueueItem
                                            key={item.id}
                                            item={item}
                                            showActions={false}
                                        />
                                    ))}
                                    {completedItems.length > 5 && (
                                        <div className="more-items">
                                            <p>... and {completedItems.length - 5} more completed items</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Queue Controls */}
                        <QueueControls
                            onRefresh={handleRefresh}
                            onClearCompleted={handleClearCompleted}
                            hasCompletedItems={completedItems.length > 0}
                        />
                    </>
                )}

                {/* History Tab Content */}
                {activeTab === 'history' && (
                    <QueueHistoryPanel 
                        eventBus={eventBus}
                        activePort={activePort}
                    />
                )}
            </div>
        </div>
    );
};

export default QueueManagementPanel; 