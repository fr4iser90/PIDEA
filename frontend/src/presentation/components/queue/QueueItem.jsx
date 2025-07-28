/**
 * QueueItem - Component for displaying individual queue items
 * Provides compact display of queue item information
 */

import React from 'react';
import QueueRepository from '@/infrastructure/repositories/QueueRepository.jsx';

const QueueItem = ({ item, showActions = true }) => {
    const queueRepository = new QueueRepository();
    const formattedItem = queueRepository.formatQueueItem(item);

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

    return (
        <div className={`queue-item ${item.status}`}>
            <div className="item-header">
                <div className="item-status">
                    <span className="status-icon">{getStatusIcon(item.status)}</span>
                    <span className="status-label">{formattedItem.statusLabel}</span>
                </div>
                
                <div className="item-info">
                    <div className="item-name">
                        {item.workflow?.name || item.workflow?.type || 'Unknown Task'}
                    </div>
                    <div className="item-meta">
                        <span className="item-type">{formattedItem.workflowTypeLabel}</span>
                        <span className="item-position">#{item.position}</span>
                        <span className="item-added">
                            {formattedItem.formattedAddedAt}
                        </span>
                    </div>
                </div>

                <div className="item-details">
                    <div className="priority-badge" style={{ backgroundColor: getPriorityColor(item.options?.priority) }}>
                        {formattedItem.priorityLabel}
                    </div>
                    
                    {item.startedAt && (
                        <span className="item-duration">
                            {formatDuration(item.duration || (Date.now() - new Date(item.startedAt).getTime()))}
                        </span>
                    )}
                </div>
            </div>

            {item.workflow?.description && (
                <div className="item-description">
                    {item.workflow.description}
                </div>
            )}

            {item.error && (
                <div className="item-error">
                    <span className="error-icon">❌</span>
                    <span className="error-message">{item.error.message}</span>
                </div>
            )}
        </div>
    );
};

export default QueueItem; 