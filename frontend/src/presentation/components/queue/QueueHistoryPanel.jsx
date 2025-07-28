/**
 * QueueHistoryPanel - Queue history management interface
 * Provides comprehensive history viewing, filtering, search, and export functionality
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { logger } from '@/infrastructure/logging/Logger';
import QueueRepository from '@/infrastructure/repositories/QueueRepository.jsx';
import WebSocketService from '@/infrastructure/services/WebSocketService.jsx';
import { useActiveIDE } from '@/infrastructure/stores/selectors/ProjectSelectors.jsx';
import WorkflowTypeBadge from './WorkflowTypeBadge.jsx';
import '@/css/panel/queue-history-panel.css';

const QueueHistoryPanel = ({ eventBus, activePort }) => {
    const [historyItems, setHistoryItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        totalItems: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false
    });
    const [filters, setFilters] = useState({
        type: '',
        status: '',
        startDate: '',
        endDate: '',
        search: ''
    });
    const [statistics, setStatistics] = useState(null);
    const [selectedItem, setSelectedItem] = useState(null);
    const [exporting, setExporting] = useState(false);
    const [cleanupLoading, setCleanupLoading] = useState(false);

    const queueRepository = useMemo(() => new QueueRepository(), []);
    const webSocketService = WebSocketService;
    const { projectId } = useActiveIDE();

    /**
     * Load queue history
     */
    const loadHistory = useCallback(async (page = 1, newFilters = null) => {
        try {
            setLoading(true);
            setError(null);

            const currentFilters = newFilters || filters;
            const result = await queueRepository.getQueueHistory(projectId, currentFilters, { page, limit: pagination.limit });

            setHistoryItems(result.items || []);
            setPagination(prev => ({
                ...prev,
                page: result.pagination.page,
                totalItems: result.pagination.totalItems,
                totalPages: result.pagination.totalPages,
                hasNext: result.pagination.hasNext,
                hasPrev: result.pagination.hasPrev
            }));

            logger.info('Queue history loaded', { 
                itemCount: result.items?.length || 0,
                totalItems: result.pagination.totalItems 
            });

        } catch (error) {
            logger.error('Failed to load queue history', { error: error.message });
            setError(error.message);
        } finally {
            setLoading(false);
        }
    }, [filters, pagination.limit, queueRepository]);

    /**
     * Load history statistics
     */
    const loadStatistics = useCallback(async () => {
        try {
            const stats = await queueRepository.getHistoryStatistics(projectId, filters);
            setStatistics(stats);
        } catch (error) {
            logger.error('Failed to load history statistics', { error: error.message });
        }
    }, [filters, queueRepository]);

    /**
     * Handle filter changes
     */
    const handleFilterChange = useCallback((filterName, value) => {
        setFilters(prev => ({
            ...prev,
            [filterName]: value
        }));
    }, []);

    /**
     * Apply filters
     */
    const applyFilters = useCallback(() => {
        setPagination(prev => ({ ...prev, page: 1 }));
        loadHistory(1, filters);
        loadStatistics();
    }, [filters, loadHistory, loadStatistics]);

    /**
     * Clear filters
     */
    const clearFilters = useCallback(() => {
        const clearedFilters = {
            type: '',
            status: '',
            startDate: '',
            endDate: '',
            search: ''
        };
        setFilters(clearedFilters);
        setPagination(prev => ({ ...prev, page: 1 }));
        loadHistory(1, clearedFilters);
        loadStatistics();
    }, [loadHistory, loadStatistics]);

    /**
     * Navigate to page
     */
    const goToPage = useCallback((page) => {
        if (page >= 1 && page <= pagination.totalPages) {
            loadHistory(page);
        }
    }, [pagination.totalPages, loadHistory]);

    /**
     * Export history to CSV
     */
    const exportHistory = useCallback(async () => {
        try {
            setExporting(true);
            
            const csv = await queueRepository.exportHistoryToCSV(projectId, filters);
            
            // Create and download file
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `queue-history-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            logger.info('History exported to CSV', { filters });

        } catch (error) {
            logger.error('Failed to export history', { error: error.message });
            setError('Failed to export history: ' + error.message);
        } finally {
            setExporting(false);
        }
    }, [filters, queueRepository]);

    /**
     * Cleanup old history items
     */
    const cleanupHistory = useCallback(async (retentionDays = 30) => {
        try {
            setCleanupLoading(true);
            
            const result = await queueRepository.deleteHistory(retentionDays);
            
            logger.info('History cleanup completed', { 
                deletedCount: result.deletedCount 
            });

            // Reload history after cleanup
            loadHistory();
            loadStatistics();

        } catch (error) {
            logger.error('Failed to cleanup history', { error: error.message });
            setError('Failed to cleanup history: ' + error.message);
        } finally {
            setCleanupLoading(false);
        }
    }, [queueRepository, loadHistory, loadStatistics]);

    /**
     * Format duration
     */
    const formatDuration = useCallback((ms) => {
        if (!ms) return 'N/A';
        
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }, []);

    /**
     * Format date
     */
    const formatDate = useCallback((dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString();
    }, []);

    /**
     * Handle WebSocket events
     */
    useEffect(() => {
        if (!webSocketService) return;

        const handleQueueUpdate = (data) => {
            logger.debug('Queue update received', data);
            // Reload history when queue items are updated
            loadHistory(pagination.page);
        };

        webSocketService.on('queue:item:updated', handleQueueUpdate);
        webSocketService.on('queue:item:added', handleQueueUpdate);

        return () => {
            webSocketService.off('queue:item:updated', handleQueueUpdate);
            webSocketService.off('queue:item:added', handleQueueUpdate);
        };
    }, [webSocketService, loadHistory, pagination.page]);

    /**
     * Initial load
     */
    useEffect(() => {
        if (projectId) {
            loadHistory();
            loadStatistics();
        }
    }, [projectId, loadHistory, loadStatistics]);

    if (!projectId) {
        return (
            <div className="queue-history-panel">
                <div className="no-project-message">
                    <h3>No Active Project</h3>
                    <p>Please select a project to view queue history.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="queue-history-panel">
            <div className="queue-history-header">
                <h2>Queue History</h2>
                <div className="queue-history-actions">
                    <button 
                        className="btn btn-secondary"
                        onClick={exportHistory}
                        disabled={exporting}
                    >
                        {exporting ? 'Exporting...' : 'Export CSV'}
                    </button>
                    <button 
                        className="btn btn-warning"
                        onClick={() => cleanupHistory(30)}
                        disabled={cleanupLoading}
                    >
                        {cleanupLoading ? 'Cleaning...' : 'Cleanup (30 days)'}
                    </button>
                </div>
            </div>

            {/* Statistics */}
            {statistics && (
                <div className="queue-history-statistics">
                    <div className="stat-item">
                        <span className="stat-label">Total Items:</span>
                        <span className="stat-value">{statistics.totalItems}</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">Completed:</span>
                        <span className="stat-value success">{statistics.completedCount}</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">Failed:</span>
                        <span className="stat-value error">{statistics.failedCount}</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">Success Rate:</span>
                        <span className="stat-value">{statistics.successRate.toFixed(1)}%</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">Avg Duration:</span>
                        <span className="stat-value">{formatDuration(statistics.avgExecutionTime)}</span>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="queue-history-filters">
                <div className="filter-row">
                    <div className="filter-group">
                        <label htmlFor="type-filter">Workflow Type:</label>
                        <select 
                            id="type-filter"
                            value={filters.type}
                            onChange={(e) => handleFilterChange('type', e.target.value)}
                        >
                            <option value="">All Types</option>
                            <option value="refactoring">Refactoring</option>
                            <option value="testing">Testing</option>
                            <option value="analysis">Analysis</option>
                            <option value="feature">Feature</option>
                            <option value="bugfix">Bug Fix</option>
                            <option value="documentation">Documentation</option>
                            <option value="manual">Manual</option>
                            <option value="optimization">Optimization</option>
                            <option value="security">Security</option>
                            <option value="generic">Generic</option>
                        </select>
                    </div>

                    <div className="filter-group">
                        <label htmlFor="status-filter">Status:</label>
                        <select 
                            id="status-filter"
                            value={filters.status}
                            onChange={(e) => handleFilterChange('status', e.target.value)}
                        >
                            <option value="">All Status</option>
                            <option value="completed">Completed</option>
                            <option value="failed">Failed</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>

                    <div className="filter-group">
                        <label htmlFor="search-filter">Search:</label>
                        <input 
                            id="search-filter"
                            type="text"
                            placeholder="Search workflow ID or error message..."
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                        />
                    </div>
                </div>

                <div className="filter-row">
                    <div className="filter-group">
                        <label htmlFor="start-date">Start Date:</label>
                        <input 
                            id="start-date"
                            type="datetime-local"
                            value={filters.startDate}
                            onChange={(e) => handleFilterChange('startDate', e.target.value)}
                        />
                    </div>

                    <div className="filter-group">
                        <label htmlFor="end-date">End Date:</label>
                        <input 
                            id="end-date"
                            type="datetime-local"
                            value={filters.endDate}
                            onChange={(e) => handleFilterChange('endDate', e.target.value)}
                        />
                    </div>

                    <div className="filter-actions">
                        <button className="btn btn-primary" onClick={applyFilters}>
                            Apply Filters
                        </button>
                        <button className="btn btn-secondary" onClick={clearFilters}>
                            Clear
                        </button>
                    </div>
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className="error-message">
                    <span className="error-icon">⚠️</span>
                    {error}
                    <button 
                        className="error-close"
                        onClick={() => setError(null)}
                    >
                        ×
                    </button>
                </div>
            )}

            {/* History Items */}
            <div className="queue-history-content">
                {loading ? (
                    <div className="loading-message">
                        <div className="spinner"></div>
                        Loading queue history...
                    </div>
                ) : historyItems.length === 0 ? (
                    <div className="no-history-message">
                        <h3>No History Items</h3>
                        <p>No queue history items found matching your filters.</p>
                    </div>
                ) : (
                    <div className="history-items">
                        {historyItems.map((item) => (
                            <div 
                                key={item.id} 
                                className={`history-item ${item.status} ${selectedItem?.id === item.id ? 'selected' : ''}`}
                                onClick={() => setSelectedItem(selectedItem?.id === item.id ? null : item)}
                            >
                                <div className="history-item-header">
                                    <div className="history-item-type">
                                        <WorkflowTypeBadge type={item.workflowType} />
                                    </div>
                                    <div className="history-item-status">
                                        <span className={`status-badge ${item.status}`}>
                                            {item.status}
                                        </span>
                                    </div>
                                    <div className="history-item-date">
                                        {formatDate(item.createdAt)}
                                    </div>
                                </div>

                                <div className="history-item-details">
                                    <div className="history-item-id">
                                        <strong>ID:</strong> {item.workflowId}
                                    </div>
                                    <div className="history-item-duration">
                                        <strong>Duration:</strong> {formatDuration(item.executionTimeMs)}
                                    </div>
                                    {item.completedAt && (
                                        <div className="history-item-completed">
                                            <strong>Completed:</strong> {formatDate(item.completedAt)}
                                        </div>
                                    )}
                                    {item.errorMessage && (
                                        <div className="history-item-error">
                                            <strong>Error:</strong> {item.errorMessage}
                                        </div>
                                    )}
                                </div>

                                {selectedItem?.id === item.id && (
                                    <div className="history-item-expanded">
                                        <div className="history-item-metadata">
                                            <h4>Metadata</h4>
                                            <pre>{JSON.stringify(item.metadata, null, 2)}</pre>
                                        </div>
                                        {item.stepsData && item.stepsData.length > 0 && (
                                            <div className="history-item-steps">
                                                <h4>Steps ({item.stepsData.length})</h4>
                                                <div className="steps-list">
                                                    {item.stepsData.map((step, index) => (
                                                        <div key={index} className="step-item">
                                                            <span className="step-number">{index + 1}</span>
                                                            <span className="step-action">{step.action}</span>
                                                            {step.parameters && (
                                                                <span className="step-params">
                                                                    {JSON.stringify(step.parameters)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <div className="queue-history-pagination">
                    <button 
                        className="btn btn-secondary"
                        onClick={() => goToPage(pagination.page - 1)}
                        disabled={!pagination.hasPrev}
                    >
                        Previous
                    </button>
                    
                    <span className="pagination-info">
                        Page {pagination.page} of {pagination.totalPages} 
                        ({pagination.totalItems} total items)
                    </span>
                    
                    <button 
                        className="btn btn-secondary"
                        onClick={() => goToPage(pagination.page + 1)}
                        disabled={!pagination.hasNext}
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
};

export default QueueHistoryPanel; 