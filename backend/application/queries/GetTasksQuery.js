/**
 * GetTasksQuery - Query to retrieve tasks
 * Implements the Query pattern for task retrieval with comprehensive filtering
 */
class GetTasksQuery {
    constructor(params = {}) {
        this.validateParams(params);
        
        this.filters = params.filters || {};
        this.sortBy = params.sortBy || 'createdAt';
        this.sortOrder = params.sortOrder || 'desc';
        this.page = params.page || 1;
        this.limit = params.limit || 20;
        this.includeExecutions = params.includeExecutions || false;
        this.includeSuggestions = params.includeSuggestions || false;
        this.includeTemplates = params.includeTemplates || false;
        this.includeMetadata = params.includeMetadata || false;
        this.requestedBy = params.requestedBy;
        this.projectPath = params.projectPath;
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
        if (params.page && (typeof params.page !== 'number' || params.page < 1)) {
            throw new Error('Page must be a positive number');
        }

        if (params.limit && (typeof params.limit !== 'number' || params.limit < 1 || params.limit > 100)) {
            throw new Error('Limit must be between 1 and 100');
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
        return `get_tasks_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get query summary
     * @returns {Object} Query summary
     */
    getSummary() {
        return {
            queryId: this.queryId,
            type: 'GetTasksQuery',
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
            filters: Object.keys(this.filters),
            sortBy: this.sortBy,
            sortOrder: this.sortOrder,
            page: this.page,
            limit: this.limit,
            includeExecutions: this.includeExecutions,
            includeSuggestions: this.includeSuggestions,
            includeTemplates: this.includeTemplates,
            includeMetadata: this.includeMetadata,
            projectPath: this.projectPath,
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

        // Check limit size
        if (this.limit > 50) {
            warnings.push('Large limit may impact performance');
        }

        // Check filter complexity
        if (Object.keys(this.filters).length > 10) {
            warnings.push('Many filters may impact query performance');
        }

        // Check include options
        if (this.includeExecutions && this.includeSuggestions && this.includeTemplates) {
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
            allowedFields: ['id', 'title', 'type', 'priority', 'status', 'createdAt', 'updatedAt', 'deadline', 'estimatedTime']
        };
    }

    /**
     * Get filter configuration
     * @returns {Object} Filter configuration
     */
    getFilterConfig() {
        return {
            filters: this.filters,
            projectPath: this.projectPath,
            includeArchived: this.filters.includeArchived || false,
            includeCompleted: this.filters.includeCompleted !== false, // Default true
            includePending: this.filters.includePending !== false, // Default true
            includeInProgress: this.filters.includeInProgress !== false // Default true
        };
    }

    /**
     * Get include configuration
     * @returns {Object} Include configuration
     */
    getIncludeConfig() {
        return {
            executions: this.includeExecutions,
            suggestions: this.includeSuggestions,
            templates: this.includeTemplates,
            metadata: this.includeMetadata,
            limitRelated: this.limit > 20 ? 5 : 10 // Limit related data for large queries
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
            filters: this.filters,
            sortBy: this.sortBy,
            sortOrder: this.sortOrder,
            page: this.page,
            limit: this.limit,
            includeExecutions: this.includeExecutions,
            includeSuggestions: this.includeSuggestions,
            includeTemplates: this.includeTemplates,
            includeMetadata: this.includeMetadata,
            requestedBy: this.requestedBy,
            projectPath: this.projectPath,
            metadata: this.metadata,
            timestamp: this.timestamp
        };
    }

    /**
     * Create query from JSON
     * @param {Object} json - JSON representation
     * @returns {GetTasksQuery} Query instance
     */
    static fromJSON(json) {
        const params = { ...json };
        
        // Convert date strings back to Date objects
        if (params.timestamp) {
            params.timestamp = new Date(params.timestamp);
        }

        return new GetTasksQuery(params);
    }

    /**
     * Create all tasks query
     * @param {Object} options - Query options
     * @returns {GetTasksQuery} Query instance
     */
    static all(options = {}) {
        return new GetTasksQuery({
            filters: {},
            ...options
        });
    }

    /**
     * Create tasks by status query
     * @param {string} status - Task status
     * @param {Object} options - Query options
     * @returns {GetTasksQuery} Query instance
     */
    static byStatus(status, options = {}) {
        return new GetTasksQuery({
            filters: { status },
            ...options
        });
    }

    /**
     * Create tasks by priority query
     * @param {string} priority - Task priority
     * @param {Object} options - Query options
     * @returns {GetTasksQuery} Query instance
     */
    static byPriority(priority, options = {}) {
        return new GetTasksQuery({
            filters: { priority },
            ...options
        });
    }

    /**
     * Create tasks by type query
     * @param {string} type - Task type
     * @param {Object} options - Query options
     * @returns {GetTasksQuery} Query instance
     */
    static byType(type, options = {}) {
        return new GetTasksQuery({
            filters: { type },
            ...options
        });
    }

    /**
     * Create tasks by project query
     * @param {string} projectPath - Project path
     * @param {Object} options - Query options
     * @returns {GetTasksQuery} Query instance
     */
    static byProject(projectPath, options = {}) {
        return new GetTasksQuery({
            projectPath,
            filters: { projectPath },
            ...options
        });
    }

    /**
     * Create tasks by user query
     * @param {string} userId - User ID
     * @param {Object} options - Query options
     * @returns {GetTasksQuery} Query instance
     */
    static byUser(userId, options = {}) {
        return new GetTasksQuery({
            filters: { createdBy: userId },
            ...options
        });
    }

    /**
     * Create tasks by date range query
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @param {Object} options - Query options
     * @returns {GetTasksQuery} Query instance
     */
    static byDateRange(startDate, endDate, options = {}) {
        return new GetTasksQuery({
            filters: { 
                createdAt: { 
                    $gte: startDate, 
                    $lte: endDate 
                } 
            },
            ...options
        });
    }

    /**
     * Create pending tasks query
     * @param {Object} options - Query options
     * @returns {GetTasksQuery} Query instance
     */
    static pending(options = {}) {
        return new GetTasksQuery({
            filters: { status: 'pending' },
            sortBy: 'priority',
            sortOrder: 'desc',
            ...options
        });
    }

    /**
     * Create in-progress tasks query
     * @param {Object} options - Query options
     * @returns {GetTasksQuery} Query instance
     */
    static inProgress(options = {}) {
        return new GetTasksQuery({
            filters: { status: 'in_progress' },
            sortBy: 'updatedAt',
            sortOrder: 'desc',
            ...options
        });
    }

    /**
     * Create completed tasks query
     * @param {Object} options - Query options
     * @returns {GetTasksQuery} Query instance
     */
    static completed(options = {}) {
        return new GetTasksQuery({
            filters: { status: 'completed' },
            sortBy: 'completedAt',
            sortOrder: 'desc',
            ...options
        });
    }

    /**
     * Create high priority tasks query
     * @param {Object} options - Query options
     * @returns {GetTasksQuery} Query instance
     */
    static highPriority(options = {}) {
        return new GetTasksQuery({
            filters: { priority: 'high' },
            sortBy: 'createdAt',
            sortOrder: 'desc',
            ...options
        });
    }

    /**
     * Create overdue tasks query
     * @param {Object} options - Query options
     * @returns {GetTasksQuery} Query instance
     */
    static overdue(options = {}) {
        return new GetTasksQuery({
            filters: { 
                deadline: { $lt: new Date() },
                status: { $nin: ['completed', 'cancelled'] }
            },
            sortBy: 'deadline',
            sortOrder: 'asc',
            ...options
        });
    }

    /**
     * Create recent tasks query
     * @param {number} days - Number of days
     * @param {Object} options - Query options
     * @returns {GetTasksQuery} Query instance
     */
    static recent(days = 7, options = {}) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        return new GetTasksQuery({
            filters: { 
                createdAt: { $gte: startDate } 
            },
            sortBy: 'createdAt',
            sortOrder: 'desc',
            ...options
        });
    }

    /**
     * Create tasks with executions query
     * @param {Object} options - Query options
     * @returns {GetTasksQuery} Query instance
     */
    static withExecutions(options = {}) {
        return new GetTasksQuery({
            includeExecutions: true,
            ...options
        });
    }

    /**
     * Create tasks with suggestions query
     * @param {Object} options - Query options
     * @returns {GetTasksQuery} Query instance
     */
    static withSuggestions(options = {}) {
        return new GetTasksQuery({
            includeSuggestions: true,
            ...options
        });
    }

    /**
     * Create paginated query
     * @param {number} page - Page number
     * @param {number} limit - Items per page
     * @param {Object} options - Query options
     * @returns {GetTasksQuery} Query instance
     */
    static paginated(page = 1, limit = 20, options = {}) {
        return new GetTasksQuery({
            page,
            limit,
            ...options
        });
    }
}

module.exports = GetTasksQuery; 