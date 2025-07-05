/**
 * GetGeneratedScriptsQuery - Query to retrieve generated scripts
 * Implements the Query pattern for script retrieval
 */
class GetGeneratedScriptsQuery {
    constructor(params = {}) {
        this.validateParams(params);
        
        this.projectPath = params.projectPath;
        this.scriptId = params.scriptId;
        this.filters = params.filters || {};
        this.sortBy = params.sortBy || 'createdAt';
        this.sortOrder = params.sortOrder || 'desc';
        this.page = params.page || 1;
        this.limit = params.limit || 15;
        this.includeContent = params.includeContent || false;
        this.includeExecutionHistory = params.includeExecutionHistory || false;
        this.includeMetadata = params.includeMetadata || false;
        this.includeTemplates = params.includeTemplates || false;
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

        if (params.scriptId && typeof params.scriptId !== 'string') {
            throw new Error('Script ID must be a string');
        }

        if (params.page && (typeof params.page !== 'number' || params.page < 1)) {
            throw new Error('Page must be a positive number');
        }

        if (params.limit && (typeof params.limit !== 'number' || params.limit < 1 || params.limit > 30)) {
            throw new Error('Limit must be between 1 and 30');
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
        return `get_scripts_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get query summary
     * @returns {Object} Query summary
     */
    getSummary() {
        return {
            queryId: this.queryId,
            type: 'GetGeneratedScriptsQuery',
            projectPath: this.projectPath,
            scriptId: this.scriptId,
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
            projectPath: this.projectPath,
            scriptId: this.scriptId,
            filters: Object.keys(this.filters),
            sortBy: this.sortBy,
            sortOrder: this.sortOrder,
            page: this.page,
            limit: this.limit,
            includeContent: this.includeContent,
            includeExecutionHistory: this.includeExecutionHistory,
            includeMetadata: this.includeMetadata,
            includeTemplates: this.includeTemplates,
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

        // Check if projectPath or scriptId is provided
        if (!this.projectPath && !this.scriptId) {
            errors.push('Either projectPath or scriptId must be provided');
        }

        // Check limit size
        if (this.limit > 25) {
            warnings.push('Large limit may impact performance');
        }

        // Check include options
        if (this.includeContent && this.includeExecutionHistory) {
            warnings.push('Including content and execution history may impact performance');
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
            allowedFields: ['id', 'name', 'scriptType', 'status', 'createdAt', 'updatedAt', 'executionCount', 'lastExecutedAt']
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
            scriptId: this.scriptId,
            includeActive: this.filters.includeActive !== false, // Default true
            includeInactive: this.filters.includeInactive !== false, // Default true
            includeFailed: this.filters.includeFailed !== false // Default true
        };
    }

    /**
     * Get include configuration
     * @returns {Object} Include configuration
     */
    getIncludeConfig() {
        return {
            content: this.includeContent,
            executionHistory: this.includeExecutionHistory,
            metadata: this.includeMetadata,
            templates: this.includeTemplates,
            limitContent: this.limit > 20 ? 1000 : 5000, // Limit content for large queries
            limitHistory: this.limit > 20 ? 5 : 10 // Limit execution history for large queries
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
            scriptId: this.scriptId,
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
            projectPath: this.projectPath,
            scriptId: this.scriptId,
            filters: this.filters,
            sortBy: this.sortBy,
            sortOrder: this.sortOrder,
            page: this.page,
            limit: this.limit,
            includeContent: this.includeContent,
            includeExecutionHistory: this.includeExecutionHistory,
            includeMetadata: this.includeMetadata,
            includeTemplates: this.includeTemplates,
            requestedBy: this.requestedBy,
            metadata: this.metadata,
            timestamp: this.timestamp
        };
    }

    /**
     * Create query from JSON
     * @param {Object} json - JSON representation
     * @returns {GetGeneratedScriptsQuery} Query instance
     */
    static fromJSON(json) {
        const params = { ...json };
        
        // Convert date strings back to Date objects
        if (params.timestamp) {
            params.timestamp = new Date(params.timestamp);
        }

        return new GetGeneratedScriptsQuery(params);
    }

    /**
     * Create query by project path
     * @param {string} projectPath - Project path
     * @param {Object} options - Query options
     * @returns {GetGeneratedScriptsQuery} Query instance
     */
    static byProject(projectPath, options = {}) {
        return new GetGeneratedScriptsQuery({
            projectPath,
            ...options
        });
    }

    /**
     * Create query by script ID
     * @param {string} scriptId - Script ID
     * @param {Object} options - Query options
     * @returns {GetGeneratedScriptsQuery} Query instance
     */
    static byScriptId(scriptId, options = {}) {
        return new GetGeneratedScriptsQuery({
            scriptId,
            ...options
        });
    }

    /**
     * Create query by script type
     * @param {string} scriptType - Script type
     * @param {Object} options - Query options
     * @returns {GetGeneratedScriptsQuery} Query instance
     */
    static byType(scriptType, options = {}) {
        return new GetGeneratedScriptsQuery({
            filters: { scriptType },
            ...options
        });
    }

    /**
     * Create query for active scripts
     * @param {Object} options - Query options
     * @returns {GetGeneratedScriptsQuery} Query instance
     */
    static active(options = {}) {
        return new GetGeneratedScriptsQuery({
            filters: { status: 'active' },
            sortBy: 'lastExecutedAt',
            sortOrder: 'desc',
            ...options
        });
    }

    /**
     * Create query for inactive scripts
     * @param {Object} options - Query options
     * @returns {GetGeneratedScriptsQuery} Query instance
     */
    static inactive(options = {}) {
        return new GetGeneratedScriptsQuery({
            filters: { status: 'inactive' },
            sortBy: 'createdAt',
            sortOrder: 'desc',
            ...options
        });
    }

    /**
     * Create query for failed scripts
     * @param {Object} options - Query options
     * @returns {GetGeneratedScriptsQuery} Query instance
     */
    static failed(options = {}) {
        return new GetGeneratedScriptsQuery({
            filters: { status: 'failed' },
            sortBy: 'lastExecutedAt',
            sortOrder: 'desc',
            ...options
        });
    }

    /**
     * Create query for recent scripts
     * @param {number} hours - Number of hours
     * @param {Object} options - Query options
     * @returns {GetGeneratedScriptsQuery} Query instance
     */
    static recent(hours = 24, options = {}) {
        const startDate = new Date();
        startDate.setHours(startDate.getHours() - hours);

        return new GetGeneratedScriptsQuery({
            filters: { 
                createdAt: { $gte: startDate } 
            },
            sortBy: 'createdAt',
            sortOrder: 'desc',
            ...options
        });
    }

    /**
     * Create query with content
     * @param {Object} options - Query options
     * @returns {GetGeneratedScriptsQuery} Query instance
     */
    static withContent(options = {}) {
        return new GetGeneratedScriptsQuery({
            includeContent: true,
            ...options
        });
    }

    /**
     * Create query with execution history
     * @param {Object} options - Query options
     * @returns {GetGeneratedScriptsQuery} Query instance
     */
    static withExecutionHistory(options = {}) {
        return new GetGeneratedScriptsQuery({
            includeExecutionHistory: true,
            ...options
        });
    }

    /**
     * Create query with metadata
     * @param {Object} options - Query options
     * @returns {GetGeneratedScriptsQuery} Query instance
     */
    static withMetadata(options = {}) {
        return new GetGeneratedScriptsQuery({
            includeMetadata: true,
            ...options
        });
    }

    /**
     * Create query for build scripts
     * @param {Object} options - Query options
     * @returns {GetGeneratedScriptsQuery} Query instance
     */
    static buildScripts(options = {}) {
        return new GetGeneratedScriptsQuery({
            filters: { scriptType: 'build' },
            includeContent: true,
            ...options
        });
    }

    /**
     * Create query for deployment scripts
     * @param {Object} options - Query options
     * @returns {GetGeneratedScriptsQuery} Query instance
     */
    static deploymentScripts(options = {}) {
        return new GetGeneratedScriptsQuery({
            filters: { scriptType: 'deployment' },
            includeContent: true,
            includeExecutionHistory: true,
            ...options
        });
    }

    /**
     * Create query for test scripts
     * @param {Object} options - Query options
     * @returns {GetGeneratedScriptsQuery} Query instance
     */
    static testScripts(options = {}) {
        return new GetGeneratedScriptsQuery({
            filters: { scriptType: 'test' },
            includeContent: true,
            includeExecutionHistory: true,
            ...options
        });
    }

    /**
     * Create query for utility scripts
     * @param {Object} options - Query options
     * @returns {GetGeneratedScriptsQuery} Query instance
     */
    static utilityScripts(options = {}) {
        return new GetGeneratedScriptsQuery({
            filters: { scriptType: 'utility' },
            includeContent: true,
            ...options
        });
    }

    /**
     * Create query for frequently executed scripts
     * @param {number} minExecutions - Minimum execution count
     * @param {Object} options - Query options
     * @returns {GetGeneratedScriptsQuery} Query instance
     */
    static frequentlyExecuted(minExecutions = 5, options = {}) {
        return new GetGeneratedScriptsQuery({
            filters: { executionCount: { $gte: minExecutions } },
            sortBy: 'executionCount',
            sortOrder: 'desc',
            includeExecutionHistory: true,
            ...options
        });
    }

    /**
     * Create query for recently executed scripts
     * @param {number} hours - Number of hours
     * @param {Object} options - Query options
     * @returns {GetGeneratedScriptsQuery} Query instance
     */
    static recentlyExecuted(hours = 24, options = {}) {
        const startDate = new Date();
        startDate.setHours(startDate.getHours() - hours);

        return new GetGeneratedScriptsQuery({
            filters: { 
                lastExecutedAt: { $gte: startDate } 
            },
            sortBy: 'lastExecutedAt',
            sortOrder: 'desc',
            includeExecutionHistory: true,
            ...options
        });
    }
}

module.exports = GetGeneratedScriptsQuery; 