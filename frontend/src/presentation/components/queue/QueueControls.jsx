/**
 * QueueControls - Component for queue management actions
 * Provides control buttons for queue operations
 */

import React from 'react';

const QueueControls = ({ 
    onRefresh, 
    onClearCompleted, 
    autoRefresh, 
    onAutoRefreshToggle, 
    hasCompletedItems 
}) => {
    return (
        <div className="queue-controls">
            <div className="control-group">
                <button 
                    onClick={onRefresh} 
                    className="btn-refresh"
                    title="Refresh queue status"
                >
                    🔄 Refresh
                </button>
                
                <button 
                    onClick={onAutoRefreshToggle} 
                    className={`btn-auto-refresh ${autoRefresh ? 'active' : ''}`}
                    title={`Auto-refresh ${autoRefresh ? 'enabled' : 'disabled'}`}
                >
                    {autoRefresh ? '⏸️ Pause Auto-refresh' : '▶️ Enable Auto-refresh'}
                </button>
            </div>

            {hasCompletedItems && (
                <div className="control-group">
                    <button 
                        onClick={onClearCompleted} 
                        className="btn-clear-completed"
                        title="Clear completed items"
                    >
                        🗑️ Clear Completed
                    </button>
                </div>
            )}

            <div className="control-info">
                <span className="info-text">
                    Auto-refresh: {autoRefresh ? 'Enabled' : 'Disabled'}
                </span>
            </div>
        </div>
    );
};

export default QueueControls; 