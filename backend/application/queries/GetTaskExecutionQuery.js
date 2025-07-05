/**
 * GetTaskExecutionQuery - Query to retrieve task execution details
 * Implements the Query pattern for task execution retrieval
 */
class GetTaskExecutionQuery {
    constructor(params = {}) {
        this.validateParams(params);
        
        this.taskId = params.taskId;
        this.executionId = params.executionId;
        this.filters = params.filters || {};
        this.sortBy = params.sortBy || 'startedAt';
        this.sortOrder = params.sortOrder || 'desc';
        this.page = params.page || 1;
        this.limit = params.limit || 10;
        this.includeLogs = params.includeLogs || false;
        this.includeMetrics = params.includeMetrics || false;
        this.includeArtifacts = params.includeArtifacts || false;
        this.includeMetadata = params.includeMetadata || false;
        this.requestedBy = params.requestedBy;
        this.metadata = params.metadata || {};
        
        this.timestamp = new Date();
        this.queryId = this.generateQueryId();
    }

    /**
     * Validate query parameters
     * @param {Object} params - Query parameters
     * @throws {Error} If parameters are invalid
     */
    validateParams(params) {
        if (params.taskId && typeof params.taskId !== 'string') {
            throw new Error('Task ID must be a string');
        }

        if (params.executionId && typeof params.executionId !== 'string') {
            throw new Error('Execution ID must be a string');
        }

        if (params.page && (typeof params.page !== 'number' || params.page < 1)) {
            throw new Error('Page must be a positive number');
        }

        if (params.limit && (typeof params.limit !== 'number' || params.limit < 1 || params.limit > 50)) {
            throw new Error('Limit must be between 1 and 50');
        }

        if (params.sortOrder && !['asc', 'desc'].includes(params.sortOrder)) {
            throw new Error('Sort order must be "asc" or "desc"');
        }

        if (params.filters && typeof params.filters !== 'object') {
            throw new Error('Filters must be an object');
        }

        if (params.metadata && typeof params.metadata !== 'object') {
            throw new Error('Metadata must be an object');
        }
    }

    /**
     * Generate unique query ID
     * @returns {string} Unique query ID
     */
    generateQueryId() {
        return `get_execution_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get query summary
     * @returns {Object} Query summary
     */
    getSummary() {
        return {
            queryId: this.queryId,
            type: 'GetTaskExecutionQuery',
            taskId: this.taskId,
            executionId: this.executionId,
            filters: Object.keys(this.filters),
            sortBy: this.sortBy,
            sortOrder: this.sortOrder,
            page: this.page,
            limit: this.limit,
            timestamp: this.timestamp,
            requestedBy: this.requestedBy
        };
    }

    /**
     * Get query parameters for logging
     * @returns {Object} Query parameters
     */
    getLoggableParams() {
        return {
            taskId: this.taskId,
            executionId: this.executionId,
            filters: Object.keys(this.filters),
            sortBy: this.sortBy,
            sortOrder: this.sortOrder,
            page: this.page,
            limit: this.limit,
            includeLogs: this.includeLogs,
            includeMetrics: this.includeMetrics,
            includeArtifacts: this.includeArtifacts,
            includeMetadata: this.includeMetadata,
            hasMetadata: Object.keys(this.metadata).length > 0
        };
    }

    /**
     * Validate business rules
     * @returns {Object} Validation result
     */
    validateBusinessRules() {
        const errors = [];
        const warnings = [];

        // Check if taskId or executionId is provided
        if (!this.taskId && !this.executionId) {
            errors.push('Either taskId or executionId must be provided');
        }

        // Check limit size
        if (this.limit > 20) {
            warnings.push('Large limit may impact performance');
        }

        // Check include options
        if (this.includeLogs && this.includeMetrics && this.includeArtifacts) {
            warnings.push('Including all related data may impact performance');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Get pagination configuration
     * @returns {Object} Pagination configuration
     */
    getPaginationConfig() {
        return {
            page: this.page,
            limit: this.limit,
            offset: (this.page - 1) * this.limit,
            includeTotal: true,
            includePages: true
        };
    }

    /**
     * Get sorting configuration
     * @returns {Object} Sorting configuration
     */
    getSortingConfig() {
        return {
            sortBy: this.sortBy,
            sortOrder: this.sortOrder,
            allowedFields: ['id', 'taskId', 'status', 'startedAt', 'completedAt', 'duration', 'exitCode']
        };
    }

    /**
     * Get filter configuration
     * @returns {Object} Filter configuration
     */
    getFilterConfig() {
        return {
            filters: this.filters,
            taskId: this.taskId,
            executionId: this.executionId,
            includeCompleted: this.filters.includeCompleted !== false, // Default true
            includeFailed: this.filters.includeFailed !== false, // Default true
            includeRunning: this.filters.includeRunning !== false // Default true
        };
    }

    /**
     * Get include configuration
     * @returns {Object} Include configuration
     */
    getIncludeConfig() {
        return {
            logs: this.includeLogs,
            metrics: this.includeMetrics,
            artifacts: this.includeArtifacts,
            metadata: this.includeMetadata,
            limitLogs: this.limit > 10 ? 100 : 500, // Limit logs for large queries
            limitMetrics: this.limit > 10 ? 10 : 50 // Limit metrics for large queries
        };
    }

    /**
     * Get query metadata
     * @returns {Object} Query metadata
     */
    getMetadata() {
        return {
            queryId: this.queryId,
            timestamp: this.timestamp,
            requestedBy: this.requestedBy,
            taskId: this.taskId,
            executionId: this.executionId,
            filters: this.filters,
            sortBy: this.sortBy,
            sortOrder: this.sortOrder,
            metadata: this.metadata
        };
    }

    /**
     * Convert query to JSON
     * @returns {Object} JSON representation
     */
    toJSON() {
        return {
            queryId: this.queryId,
            taskId: this.taskId,
            executionId: this.executionId,
            filters: this.filters,
            sortBy: this.sortBy,
            sortOrder: this.sortOrder,
            page: this.page,
            limit: this.limit,
            includeLogs: this.includeLogs,
            includeMetrics: this.includeMetrics,
            includeArtifacts: this.includeArtifacts,
            includeMetadata: this.includeMetadata,
            requestedBy: this.requestedBy,
            metadata: this.metadata,
            timestamp: this.timestamp
        };
    }

    /**
     * Create query from JSON
     * @param {Object} json - JSON representation
     * @returns {GetTaskExecutionQuery} Query instance
     */
    static fromJSON(json) {
        const params = { ...json };
        
        // Convert date strings back to Date objects
        if (params.timestamp) {
            params.timestamp = new Date(params.timestamp);
        }

        return new GetTaskExecutionQuery(params);
    }

    /**
     * Create query by task ID
     * @param {string} taskId - Task ID
     * @param {Object} options - Query options
     * @returns {GetTaskExecutionQuery} Query instance
     */
    static byTaskId(taskId, options = {}) {
        return new GetTaskExecutionQuery({
            taskId,
            ...options
        });
    }

    /**
     * Create query by execution ID
     * @param {string} executionId - Execution ID
     * @param {Object} options - Query options
     * @returns {GetTaskExecutionQuery} Query instance
     */
    static byExecutionId(executionId, options = {}) {
        return new GetTaskExecutionQuery({
            executionId,
            ...options
        });
    }

    /**
     * Create query by status
     * @param {string} status - Execution status
     * @param {Object} options - Query options
     * @returns {GetTaskExecutionQuery} Query instance
     */
    static byStatus(status, options = {}) {
        return new GetTaskExecutionQuery({
            filters: { status },
            ...options
        });
    }

    /**
     * Create query for completed executions
     * @param {Object} options - Query options
     * @returns {GetTaskExecutionQuery} Query instance
     */
    static completed(options = {}) {
        return new GetTaskExecutionQuery({
            filters: { status: 'completed' },
            sortBy: 'completedAt',
            sortOrder: 'desc',
            ...options
        });
    }

    /**
     * Create query for failed executions
     * @param {Object} options - Query options
     * @returns {GetTaskExecutionQuery} Query instance
     */
    static failed(options = {}) {
        return new GetTaskExecutionQuery({
            filters: { status: 'failed' },
            sortBy: 'completedAt',
            sortOrder: 'desc',
            ...options
        });
    }

    /**
     * Create query for running executions
     * @param {Object} options - Query options
     * @returns {GetTaskExecutionQuery} Query instance
     */
    static running(options = {}) {
        return new GetTaskExecutionQuery({
            filters: { status: 'running' },
            sortBy: 'startedAt',
            sortOrder: 'desc',
            ...options
        });
    }

    /**
     * Create query for recent executions
     * @param {number} hours - Number of hours
     * @param {Object} options - Query options
     * @returns {GetTaskExecutionQuery} Query instance
     */
    static recent(hours = 24, options = {}) {
        const startDate = new Date();
        startDate.setHours(startDate.getHours() - hours);

        return new GetTaskExecutionQuery({
            filters: { 
                startedAt: { $gte: startDate } 
            },
            sortBy: 'startedAt',
            sortOrder: 'desc',
            ...options
        });
    }

    /**
     * Create query with logs
     * @param {Object} options - Query options
     * @returns {GetTaskExecutionQuery} Query instance
     */
    static withLogs(options = {}) {
        return new GetTaskExecutionQuery({
            includeLogs: true,
            ...options
        });
    }

    /**
     * Create query with metrics
     * @param {Object} options - Query options
     * @returns {GetTaskExecutionQuery} Query instance
     */
    static withMetrics(options = {}) {
        return new GetTaskExecutionQuery({
            includeMetrics: true,
            ...options
        });
    }

    /**
     * Create query with artifacts
     * @param {Object} options - Query options
     * @returns {GetTaskExecutionQuery} Query instance
     */
    static withArtifacts(options = {}) {
        return new GetTaskExecutionQuery({
            includeArtifacts: true,
            ...options
        });
    }

    /**
     * Create query for long-running executions
     * @param {number} minutes - Minimum duration in minutes
     * @param {Object} options - Query options
     * @returns {GetTaskExecutionQuery} Query instance
     */
    static longRunning(minutes = 30, options = {}) {
        return new GetTaskExecutionQuery({
            filters: { 
                duration: { $gte: minutes * 60 * 1000 } // Convert to milliseconds
            },
            sortBy: 'duration',
            sortOrder: 'desc',
            ...options
        });
    }

    /**
     * Create query for successful executions
     * @param {Object} options - Query options
     * @returns {GetTaskExecutionQuery} Query instance
     */
    static successful(options = {}) {
        return new GetTaskExecutionQuery({
            filters: { 
                status: 'completed',
                exitCode: 0
            },
            sortBy: 'completedAt',
            sortOrder: 'desc',
            ...options
        });
    }

    /**
     * Create query for failed executions with error codes
     * @param {Object} options - Query options
     * @returns {GetTaskExecutionQuery} Query instance
     */
    static withErrors(options = {}) {
        return new GetTaskExecutionQuery({
            filters: { 
                status: 'failed',
                exitCode: { $ne: 0 }
            },
            sortBy: 'completedAt',
            sortOrder: 'desc',
            ...options
        });
    }
}

module.exports = GetTaskExecutionQuery; 