/**
 * QueueControls - Component for queue management actions
 * Provides control buttons for queue operations
 */

import React from 'react';

const QueueControls = ({ 
    onRefresh, 
    onClearCompleted, 
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
        </div>
    );
};

export default QueueControls; 