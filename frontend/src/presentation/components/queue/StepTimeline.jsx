/**
 * StepTimeline - Component for visualizing step-by-step progress
 * Provides interactive timeline with step status, progress, and control actions
 */

import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '@/infrastructure/logging/Logger';
import QueueRepository from '@/infrastructure/repositories/QueueRepository.jsx';
import WebSocketService from '@/infrastructure/services/WebSocketService.jsx';
import WorkflowTypeBadge from './WorkflowTypeBadge.jsx';

const StepTimeline = ({ stepProgress, onToggleStepStatus, taskId, projectId, workflowType: propWorkflowType }) => {
    const [expandedSteps, setExpandedSteps] = useState(new Set());
    const [showStepDetails, setShowStepDetails] = useState({});
    const [realTimeProgress, setRealTimeProgress] = useState(stepProgress);
    const [workflowType, setWorkflowType] = useState(null);
    const [lastUpdate, setLastUpdate] = useState(null);

    const queueRepository = new QueueRepository();
    const webSocketService = WebSocketService;

    /**
     * Get workflow type from props or stepProgress data
     */
    const getWorkflowType = useCallback(() => {
        // Use prop first, then fallback to stepProgress data
        if (propWorkflowType) return propWorkflowType;
        if (!stepProgress || !stepProgress.workflow) return null;
        return stepProgress.workflow.type;
    }, [propWorkflowType, stepProgress]);

    useEffect(() => {
        const type = getWorkflowType();
        setWorkflowType(type);
        logger.debug('Got workflow type for StepTimeline', { 
            projectId, 
            taskId,
            type,
            fromProp: !!propWorkflowType
        });
    }, [getWorkflowType, projectId, taskId]);

    /**
     * Set up real-time updates
     */
    const setupRealTimeUpdates = useCallback(() => {
        if (!taskId || !projectId) return;

        const handleStepUpdate = (data) => {
            if (data.taskId === taskId && data.projectId === projectId) {
                logger.debug('Received real-time step update', { 
                    projectId, 
                    taskId, 
                    currentStep: data.currentStep,
                    progressPercentage: data.progressPercentage 
                });
                setRealTimeProgress(data);
                setLastUpdate(new Date());
            }
        };

        // Subscribe to step progress updates
        webSocketService.subscribe('step-progress-update', handleStepUpdate);

        return () => {
            webSocketService.unsubscribe('step-progress-update', handleStepUpdate);
        };
    }, [taskId, projectId, webSocketService, queueRepository]);

    // Set up real-time updates when component mounts or taskId changes
    useEffect(() => {
        const cleanup = setupRealTimeUpdates();
        return cleanup;
    }, [setupRealTimeUpdates]);

    // Update real-time progress when stepProgress prop changes
    useEffect(() => {
        setRealTimeProgress(stepProgress);
    }, [stepProgress]);

    /**
     * Toggle step expansion
     */
    const toggleStepExpansion = (stepId) => {
        const newExpanded = new Set(expandedSteps);
        if (newExpanded.has(stepId)) {
            newExpanded.delete(stepId);
        } else {
            newExpanded.add(stepId);
        }
        setExpandedSteps(newExpanded);
    };

    /**
     * Toggle step details
     */
    const toggleStepDetails = (stepId) => {
        setShowStepDetails(prev => ({
            ...prev,
            [stepId]: !prev[stepId]
        }));
    };

    /**
     * Handle step action
     */
    const handleStepAction = (stepId, action) => {
        onToggleStepStatus(stepId, action);
    };

    /**
     * Get step status icon
     */
    const getStepStatusIcon = (status) => {
        const icons = {
            pending: '⏳',
            running: '🔄',
            completed: '✅',
            failed: '❌',
            paused: '⏸️',
            cancelled: '🚫'
        };
        return icons[status] || '❓';
    };

    /**
     * Get step status color
     */
    const getStepStatusColor = (status) => {
        const colors = {
            pending: '#888888',
            running: '#44aa44',
            completed: '#44aa44',
            failed: '#ff4444',
            paused: '#ffaa00',
            cancelled: '#888888'
        };
        return colors[status] || '#888888';
    };

    /**
     * Format duration
     */
    const formatDuration = (milliseconds) => {
        if (!milliseconds || milliseconds === 0) return '0s';
        
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    };

    /**
     * Calculate step progress percentage
     */
    const calculateStepProgress = (step) => {
        if (step.status === 'completed') return 100;
        if (step.status === 'failed' || step.status === 'cancelled') return 0;
        if (step.status === 'pending') return 0;
        
        return step.progress || 0;
    };

    /**
     * Check if step can be controlled
     */
    const canControlStep = (step) => {
        return step.status === 'running' || step.status === 'paused';
    };

    /**
     * Get step dependencies status
     */
    const getDependenciesStatus = (step) => {
        if (!step.dependencies || step.dependencies.length === 0) {
            return { met: true, count: 0 };
        }

        const steps = stepProgress.steps || [];
        const metDependencies = step.dependencies.filter(depId => {
            const depStep = steps.find(s => s.id === depId);
            return depStep && depStep.status === 'completed';
        });

        return {
            met: metDependencies.length === step.dependencies.length,
            count: metDependencies.length,
            total: step.dependencies.length
        };
    };

    if (!stepProgress || !stepProgress.steps) {
        return (
            <div className="step-timeline">
                <div className="empty-state">
                    <p>No step progress available</p>
                </div>
            </div>
        );
    }

    const { steps, currentStep, totalSteps, progressPercentage } = stepProgress;

    return (
        <div className="step-timeline">
            {/* Overall Progress */}
            <div className="overall-progress">
                <div className="progress-header">
                    <div className="progress-title">
                        <h5>Overall Progress: {realTimeProgress?.progressPercentage || progressPercentage}%</h5>
                        {workflowType && (
                            <WorkflowTypeBadge 
                                type={workflowType} 
                                size="small"
                            />
                        )}
                    </div>
                    <div className="progress-meta">
                        <span className="step-counter">
                            Step {realTimeProgress?.currentStep || currentStep} of {realTimeProgress?.totalSteps || totalSteps}
                        </span>
                        {lastUpdate && (
                            <span className="last-update">
                                Last update: {lastUpdate.toLocaleTimeString()}
                            </span>
                        )}
                    </div>
                </div>
                <div className="progress-bar">
                    <div 
                        className="progress-fill" 
                        style={{ width: `${realTimeProgress?.progressPercentage || progressPercentage}%` }}
                    />
                </div>
            </div>

            {/* Steps Timeline */}
            <div className="steps-container">
                {steps.map((step, index) => {
                    const stepProgress = calculateStepProgress(step);
                    const dependenciesStatus = getDependenciesStatus(step);
                    const isExpanded = expandedSteps.has(step.id);
                    const showDetails = showStepDetails[step.id];
                    const canControl = canControlStep(step);

                    return (
                        <div 
                            key={step.id} 
                            className={`step-item ${step.status} ${isExpanded ? 'expanded' : ''}`}
                        >
                            {/* Step Header */}
                            <div className="step-header" onClick={() => toggleStepExpansion(step.id)}>
                                <div className="step-status">
                                    <span 
                                        className="step-icon"
                                        style={{ color: getStepStatusColor(step.status) }}
                                    >
                                        {getStepStatusIcon(step.status)}
                                    </span>
                                    <span className="step-number">{index + 1}</span>
                                </div>

                                <div className="step-info">
                                    <div className="step-name">{step.name}</div>
                                    <div className="step-meta">
                                        <span className="step-status-label">{step.status}</span>
                                        {step.startedAt && (
                                            <span className="step-duration">
                                                {formatDuration(step.duration)}
                                            </span>
                                        )}
                                        {dependenciesStatus.count > 0 && (
                                            <span className="step-dependencies">
                                                Dependencies: {dependenciesStatus.count}/{dependenciesStatus.total}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="step-progress">
                                    <div className="step-progress-bar">
                                        <div 
                                            className="step-progress-fill" 
                                            style={{ width: `${stepProgress}%` }}
                                        />
                                    </div>
                                    <span className="step-progress-text">{stepProgress}%</span>
                                </div>

                                <div className="step-actions">
                                    {canControl && (
                                        <button 
                                            className={`btn-step-action ${step.status === 'paused' ? 'resume' : 'pause'}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleStepAction(step.id, step.status === 'paused' ? 'resume' : 'pause');
                                            }}
                                            title={step.status === 'paused' ? 'Resume step' : 'Pause step'}
                                        >
                                            {step.status === 'paused' ? '▶️' : '⏸️'}
                                        </button>
                                    )}
                                    
                                    <button 
                                        className="btn-toggle-details"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleStepDetails(step.id);
                                        }}
                                        title={showDetails ? 'Hide details' : 'Show details'}
                                    >
                                        {showDetails ? '▼' : '▶'}
                                    </button>
                                </div>
                            </div>

                            {/* Step Details */}
                            {isExpanded && (
                                <div className="step-details">
                                    <div className="detail-row">
                                        <div className="detail-item">
                                            <span className="detail-label">Description:</span>
                                            <span className="detail-value">{step.description || 'No description'}</span>
                                        </div>
                                    </div>

                                    <div className="detail-row">
                                        <div className="detail-item">
                                            <span className="detail-label">Started:</span>
                                            <span className="detail-value">
                                                {step.startedAt ? new Date(step.startedAt).toLocaleString() : 'Not started'}
                                            </span>
                                        </div>
                                        
                                        <div className="detail-item">
                                            <span className="detail-label">Completed:</span>
                                            <span className="detail-value">
                                                {step.completedAt ? new Date(step.completedAt).toLocaleString() : 'Not completed'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="detail-row">
                                        <div className="detail-item">
                                            <span className="detail-label">Duration:</span>
                                            <span className="detail-value">
                                                {formatDuration(step.duration)}
                                            </span>
                                        </div>
                                        
                                        <div className="detail-item">
                                            <span className="detail-label">Retries:</span>
                                            <span className="detail-value">
                                                {step.retryCount || 0} / {step.maxRetries || 3}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Dependencies */}
                                    {step.dependencies && step.dependencies.length > 0 && (
                                        <div className="detail-row">
                                            <div className="detail-item full-width">
                                                <span className="detail-label">Dependencies:</span>
                                                <div className="dependencies-list">
                                                    {step.dependencies.map(depId => {
                                                        const depStep = steps.find(s => s.id === depId);
                                                        return (
                                                            <span 
                                                                key={depId}
                                                                className={`dependency-item ${depStep?.status === 'completed' ? 'completed' : 'pending'}`}
                                                            >
                                                                {depStep?.name || depId}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Error Information */}
                                    {step.error && (
                                        <div className="detail-row">
                                            <div className="detail-item full-width">
                                                <span className="detail-label">Error:</span>
                                                <div className="error-details">
                                                    <p className="error-message">{step.error.message}</p>
                                                    {step.error.stack && (
                                                        <details className="error-stack">
                                                            <summary>Stack Trace</summary>
                                                            <pre>{step.error.stack}</pre>
                                                        </details>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Step Result */}
                                    {step.result && (
                                        <div className="detail-row">
                                            <div className="detail-item full-width">
                                                <span className="detail-label">Result:</span>
                                                <div className="step-result">
                                                    <pre>{JSON.stringify(step.result, null, 2)}</pre>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Step Metadata */}
                                    {step.metadata && Object.keys(step.metadata).length > 0 && (
                                        <div className="detail-row">
                                            <div className="detail-item full-width">
                                                <span className="detail-label">Metadata:</span>
                                                <div className="step-metadata">
                                                    <pre>{JSON.stringify(step.metadata, null, 2)}</pre>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Timeline Legend */}
            <div className="timeline-legend">
                <div className="legend-item">
                    <span className="legend-icon">⏳</span>
                    <span className="legend-label">Pending</span>
                </div>
                <div className="legend-item">
                    <span className="legend-icon">🔄</span>
                    <span className="legend-label">Running</span>
                </div>
                <div className="legend-item">
                    <span className="legend-icon">✅</span>
                    <span className="legend-label">Completed</span>
                </div>
                <div className="legend-item">
                    <span className="legend-icon">❌</span>
                    <span className="legend-label">Failed</span>
                </div>
                <div className="legend-item">
                    <span className="legend-icon">⏸️</span>
                    <span className="legend-label">Paused</span>
                </div>
            </div>
        </div>
    );
};

export default StepTimeline; 