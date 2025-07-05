/**
 * GetTaskSuggestionsQuery - Query to retrieve AI-generated task suggestions
 * Implements the Query pattern for task suggestion retrieval
 */
class GetTaskSuggestionsQuery {
    constructor(params = {}) {
        this.validateParams(params);
        
        this.projectPath = params.projectPath;
        this.filters = params.filters || {};
        this.sortBy = params.sortBy || 'confidence';
        this.sortOrder = params.sortOrder || 'desc';
        this.page = params.page || 1;
        this.limit = params.limit || 15;
        this.includeReasoning = params.includeReasoning || false;
        this.includeMetadata = params.includeMetadata || false;
        this.includeAppliedTasks = params.includeAppliedTasks || false;
        this.confidenceThreshold = params.confidenceThreshold || 0.5;
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
        if (params.projectPath && typeof params.projectPath !== 'string') {
            throw new Error('Project path must be a string');
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

        if (params.confidenceThreshold && (typeof params.confidenceThreshold !== 'number' || params.confidenceThreshold < 0 || params.confidenceThreshold > 1)) {
            throw new Error('Confidence threshold must be between 0 and 1');
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
        return `get_suggestions_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get query summary
     * @returns {Object} Query summary
     */
    getSummary() {
        return {
            queryId: this.queryId,
            type: 'GetTaskSuggestionsQuery',
            projectPath: this.projectPath,
            filters: Object.keys(this.filters),
            sortBy: this.sortBy,
            sortOrder: this.sortOrder,
            page: this.page,
            limit: this.limit,
            confidenceThreshold: this.confidenceThreshold,
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
            projectPath: this.projectPath,
            filters: Object.keys(this.filters),
            sortBy: this.sortBy,
            sortOrder: this.sortOrder,
            page: this.page,
            limit: this.limit,
            includeReasoning: this.includeReasoning,
            includeMetadata: this.includeMetadata,
            includeAppliedTasks: this.includeAppliedTasks,
            confidenceThreshold: this.confidenceThreshold,
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
        if (this.limit > 30) {
            warnings.push('Large limit may impact performance');
        }

        // Check filter complexity
        if (Object.keys(this.filters).length > 8) {
            warnings.push('Many filters may impact query performance');
        }

        // Check confidence threshold
        if (this.confidenceThreshold > 0.9) {
            warnings.push('Very high confidence threshold may return few results');
        }

        // Check include options
        if (this.includeReasoning && this.includeMetadata && this.includeAppliedTasks) {
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
            allowedFields: ['id', 'title', 'taskType', 'priority', 'confidence', 'createdAt', 'updatedAt', 'estimatedTime']
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
            confidenceThreshold: this.confidenceThreshold,
            includeApplied: this.filters.includeApplied !== false, // Default true
            includePending: this.filters.includePending !== false, // Default true
            includeRejected: this.filters.includeRejected !== false // Default true
        };
    }

    /**
     * Get include configuration
     * @returns {Object} Include configuration
     */
    getIncludeConfig() {
        return {
            reasoning: this.includeReasoning,
            metadata: this.includeMetadata,
            appliedTasks: this.includeAppliedTasks,
            limitReasoning: this.limit > 20 ? 200 : 500, // Limit reasoning text for large queries
            limitMetadata: this.limit > 20 ? 10 : 25 // Limit metadata fields for large queries
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
            projectPath: this.projectPath,
            filters: this.filters,
            sortBy: this.sortBy,
            sortOrder: this.sortOrder,
            confidenceThreshold: this.confidenceThreshold,
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
            projectPath: this.projectPath,
            filters: this.filters,
            sortBy: this.sortBy,
            sortOrder: this.sortOrder,
            page: this.page,
            limit: this.limit,
            includeReasoning: this.includeReasoning,
            includeMetadata: this.includeMetadata,
            includeAppliedTasks: this.includeAppliedTasks,
            confidenceThreshold: this.confidenceThreshold,
            requestedBy: this.requestedBy,
            metadata: this.metadata,
            timestamp: this.timestamp
        };
    }

    /**
     * Create query from JSON
     * @param {Object} json - JSON representation
     * @returns {GetTaskSuggestionsQuery} Query instance
     */
    static fromJSON(json) {
        const params = { ...json };
        
        // Convert date strings back to Date objects
        if (params.timestamp) {
            params.timestamp = new Date(params.timestamp);
        }

        return new GetTaskSuggestionsQuery(params);
    }

    /**
     * Create all suggestions query
     * @param {string} projectPath - Project path
     * @param {Object} options - Query options
     * @returns {GetTaskSuggestionsQuery} Query instance
     */
    static all(projectPath, options = {}) {
        return new GetTaskSuggestionsQuery({
            projectPath,
            filters: {},
            ...options
        });
    }

    /**
     * Create suggestions by project query
     * @param {string} projectPath - Project path
     * @param {Object} options - Query options
     * @returns {GetTaskSuggestionsQuery} Query instance
     */
    static byProject(projectPath, options = {}) {
        return new GetTaskSuggestionsQuery({
            projectPath,
            filters: { projectPath },
            ...options
        });
    }

    /**
     * Create suggestions by type query
     * @param {string} taskType - Task type
     * @param {Object} options - Query options
     * @returns {GetTaskSuggestionsQuery} Query instance
     */
    static byType(taskType, options = {}) {
        return new GetTaskSuggestionsQuery({
            filters: { taskType },
            ...options
        });
    }

    /**
     * Create suggestions by priority query
     * @param {string} priority - Task priority
     * @param {Object} options - Query options
     * @returns {GetTaskSuggestionsQuery} Query instance
     */
    static byPriority(priority, options = {}) {
        return new GetTaskSuggestionsQuery({
            filters: { priority },
            ...options
        });
    }

    /**
     * Create high confidence suggestions query
     * @param {number} threshold - Confidence threshold
     * @param {Object} options - Query options
     * @returns {GetTaskSuggestionsQuery} Query instance
     */
    static highConfidence(threshold = 0.8, options = {}) {
        return new GetTaskSuggestionsQuery({
            filters: { confidence: { $gte: threshold } },
            sortBy: 'confidence',
            sortOrder: 'desc',
            ...options
        });
    }

    /**
     * Create applied suggestions query
     * @param {Object} options - Query options
     * @returns {GetTaskSuggestionsQuery} Query instance
     */
    static applied(options = {}) {
        return new GetTaskSuggestionsQuery({
            filters: { status: 'applied' },
            sortBy: 'appliedAt',
            sortOrder: 'desc',
            includeAppliedTasks: true,
            ...options
        });
    }

    /**
     * Create pending suggestions query
     * @param {Object} options - Query options
     * @returns {GetTaskSuggestionsQuery} Query instance
     */
    static pending(options = {}) {
        return new GetTaskSuggestionsQuery({
            filters: { status: 'pending' },
            sortBy: 'confidence',
            sortOrder: 'desc',
            ...options
        });
    }

    /**
     * Create rejected suggestions query
     * @param {Object} options - Query options
     * @returns {GetTaskSuggestionsQuery} Query instance
     */
    static rejected(options = {}) {
        return new GetTaskSuggestionsQuery({
            filters: { status: 'rejected' },
            sortBy: 'rejectedAt',
            sortOrder: 'desc',
            ...options
        });
    }

    /**
     * Create recent suggestions query
     * @param {number} hours - Number of hours
     * @param {Object} options - Query options
     * @returns {GetTaskSuggestionsQuery} Query instance
     */
    static recent(hours = 24, options = {}) {
        const startDate = new Date();
        startDate.setHours(startDate.getHours() - hours);

        return new GetTaskSuggestionsQuery({
            filters: { 
                createdAt: { $gte: startDate } 
            },
            sortBy: 'createdAt',
            sortOrder: 'desc',
            ...options
        });
    }

    /**
     * Create suggestions with reasoning query
     * @param {Object} options - Query options
     * @returns {GetTaskSuggestionsQuery} Query instance
     */
    static withReasoning(options = {}) {
        return new GetTaskSuggestionsQuery({
            includeReasoning: true,
            ...options
        });
    }

    /**
     * Create suggestions with metadata query
     * @param {Object} options - Query options
     * @returns {GetTaskSuggestionsQuery} Query instance
     */
    static withMetadata(options = {}) {
        return new GetTaskSuggestionsQuery({
            includeMetadata: true,
            ...options
        });
    }

    /**
     * Create suggestions by AI model query
     * @param {string} aiModel - AI model name
     * @param {Object} options - Query options
     * @returns {GetTaskSuggestionsQuery} Query instance
     */
    static byAIModel(aiModel, options = {}) {
        return new GetTaskSuggestionsQuery({
            filters: { aiModel },
            sortBy: 'createdAt',
            sortOrder: 'desc',
            ...options
        });
    }

    /**
     * Create suggestions by user query
     * @param {string} userId - User ID
     * @param {Object} options - Query options
     * @returns {GetTaskSuggestionsQuery} Query instance
     */
    static byUser(userId, options = {}) {
        return new GetTaskSuggestionsQuery({
            filters: { requestedBy: userId },
            sortBy: 'createdAt',
            sortOrder: 'desc',
            ...options
        });
    }

    /**
     * Create paginated query
     * @param {number} page - Page number
     * @param {number} limit - Items per page
     * @param {Object} options - Query options
     * @returns {GetTaskSuggestionsQuery} Query instance
     */
    static paginated(page = 1, limit = 15, options = {}) {
        return new GetTaskSuggestionsQuery({
            page,
            limit,
            ...options
        });
    }
}

module.exports = GetTaskSuggestionsQuery; 