/**
 * ActiveTaskItem - Component for displaying active queue items with step progress
 * Provides detailed task information, progress tracking, and control actions
 */

import React, { useState } from 'react';
import QueueRepository from '@/infrastructure/repositories/QueueRepository.jsx';

const ActiveTaskItem = ({ 
    item, 
    isSelected, 
    onSelect, 
    onCancel, 
    onUpdatePriority 
}) => {
    const [showDetails, setShowDetails] = useState(false);
    const [showPriorityMenu, setShowPriorityMenu] = useState(false);
    const [confirmCancel, setConfirmCancel] = useState(false);

    const queueRepository = new QueueRepository();
    const formattedItem = queueRepository.formatQueueItem(item);

    /**
     * Handle priority change
     */
    const handlePriorityChange = (priority) => {
        onUpdatePriority(priority);
        setShowPriorityMenu(false);
    };

    /**
     * Handle cancel confirmation
     */
    const handleCancelConfirm = () => {
        onCancel();
        setConfirmCancel(false);
    };

    /**
     * Get status icon
     */
    const getStatusIcon = (status) => {
        const icons = {
            running: '🟢',
            queued: '🟡',
            paused: '⏸️',
            failed: '🔴',
            completed: '✅',
            cancelled: '❌'
        };
        return icons[status] || '❓';
    };

    /**
     * Get priority color
     */
    const getPriorityColor = (priority) => {
        const colors = {
            high: '#ff4444',
            normal: '#44aa44',
            low: '#888888'
        };
        return colors[priority] || colors.normal;
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
     * Calculate progress percentage
     */
    const calculateProgress = () => {
        if (item.status === 'completed') return 100;
        if (item.status === 'queued') return 0;
        if (item.status === 'failed') return 0;
        
        // For running tasks, estimate progress based on time
        if (item.startedAt) {
            const startTime = new Date(item.startedAt).getTime();
            const currentTime = Date.now();
            const elapsed = currentTime - startTime;
            const estimatedDuration = 30000; // 30 seconds default
            return Math.min(90, Math.round((elapsed / estimatedDuration) * 100));
        }
        
        return 0;
    };

    const progressPercentage = calculateProgress();

    return (
        <div className={`active-task-item ${isSelected ? 'selected' : ''} ${item.status}`}>
            {/* Main Task Info */}
            <div className="task-header" onClick={() => onSelect()}>
                <div className="task-status">
                    <span className="status-icon">{getStatusIcon(item.status)}</span>
                    <span className="status-label">{formattedItem.statusLabel}</span>
                </div>
                
                <div className="task-info">
                    <div className="task-name">
                        {item.workflow?.name || item.workflow?.type || 'Unknown Task'}
                    </div>
                    <div className="task-meta">
                        <span className="task-type">{formattedItem.workflowTypeLabel}</span>
                        <span className="task-position">#{item.position}</span>
                        <span className="task-added">
                            Added: {formattedItem.formattedAddedAt}
                        </span>
                    </div>
                </div>

                <div className="task-progress">
                    <div className="progress-bar">
                        <div 
                            className="progress-fill" 
                            style={{ width: `${progressPercentage}%` }}
                        />
                    </div>
                    <span className="progress-text">{progressPercentage}%</span>
                </div>

                <div className="task-actions">
                    <button 
                        className="btn-toggle-details"
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowDetails(!showDetails);
                        }}
                        title={showDetails ? 'Hide details' : 'Show details'}
                    >
                        {showDetails ? '▼' : '▶'}
                    </button>
                </div>
            </div>

            {/* Task Details */}
            {showDetails && (
                <div className="task-details">
                    <div className="detail-row">
                        <div className="detail-item">
                            <span className="detail-label">Priority:</span>
                            <div className="priority-selector">
                                <span 
                                    className="priority-badge"
                                    style={{ backgroundColor: getPriorityColor(item.options?.priority) }}
                                >
                                    {formattedItem.priorityLabel}
                                </span>
                                <button 
                                    className="btn-change-priority"
                                    onClick={() => setShowPriorityMenu(!showPriorityMenu)}
                                    title="Change priority"
                                >
                                    ✏️
                                </button>
                                
                                {showPriorityMenu && (
                                    <div className="priority-menu">
                                        <button 
                                            onClick={() => handlePriorityChange('high')}
                                            className={`priority-option ${item.options?.priority === 'high' ? 'active' : ''}`}
                                        >
                                            🔴 High
                                        </button>
                                        <button 
                                            onClick={() => handlePriorityChange('normal')}
                                            className={`priority-option ${item.options?.priority === 'normal' ? 'active' : ''}`}
                                        >
                                            🟢 Normal
                                        </button>
                                        <button 
                                            onClick={() => handlePriorityChange('low')}
                                            className={`priority-option ${item.options?.priority === 'low' ? 'active' : ''}`}
                                        >
                                            ⚪ Low
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <div className="detail-item">
                            <span className="detail-label">Duration:</span>
                            <span className="detail-value">
                                {item.startedAt ? formatDuration(Date.now() - new Date(item.startedAt).getTime()) : '0s'}
                            </span>
                        </div>
                    </div>

                    <div className="detail-row">
                        <div className="detail-item">
                            <span className="detail-label">Estimated Start:</span>
                            <span className="detail-value">
                                {formattedItem.formattedEstimatedStartTime || 'Unknown'}
                            </span>
                        </div>
                        
                        <div className="detail-item">
                            <span className="detail-label">Retries:</span>
                            <span className="detail-value">
                                {item.options?.retryCount || 0} / {item.options?.maxRetries || 3}
                            </span>
                        </div>
                    </div>

                    {item.workflow?.description && (
                        <div className="detail-row">
                            <div className="detail-item full-width">
                                <span className="detail-label">Description:</span>
                                <span className="detail-value">{item.workflow.description}</span>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="task-action-buttons">
                        {item.status === 'running' && (
                            <button 
                                className="btn-pause"
                                title="Pause task"
                                onClick={() => {
                                    // TODO: Implement pause functionality
                                    console.log('Pause task:', item.id);
                                }}
                            >
                                ⏸️ Pause
                            </button>
                        )}
                        
                        {item.status === 'paused' && (
                            <button 
                                className="btn-resume"
                                title="Resume task"
                                onClick={() => {
                                    // TODO: Implement resume functionality
                                    console.log('Resume task:', item.id);
                                }}
                            >
                                ▶️ Resume
                            </button>
                        )}
                        
                        {(item.status === 'queued' || item.status === 'running' || item.status === 'paused') && (
                            <button 
                                className="btn-cancel"
                                title="Cancel task"
                                onClick={() => setConfirmCancel(true)}
                            >
                                ❌ Cancel
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Cancel Confirmation Modal */}
            {confirmCancel && (
                <div className="cancel-confirmation">
                    <div className="confirmation-content">
                        <p>Are you sure you want to cancel this task?</p>
                        <p className="task-name">{item.workflow?.name || item.workflow?.type || 'Unknown Task'}</p>
                        <div className="confirmation-buttons">
                            <button 
                                className="btn-confirm-cancel"
                                onClick={handleCancelConfirm}
                            >
                                Yes, Cancel
                            </button>
                            <button 
                                className="btn-cancel-confirmation"
                                onClick={() => setConfirmCancel(false)}
                            >
                                No, Keep
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ActiveTaskItem; 