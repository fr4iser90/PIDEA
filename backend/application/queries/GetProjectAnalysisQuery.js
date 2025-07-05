/**
 * GetProjectAnalysisQuery - Query to retrieve project analysis results
 * Implements the Query pattern for project analysis retrieval
 */
class GetProjectAnalysisQuery {
    constructor(params = {}) {
        this.validateParams(params);
        
        this.projectPath = params.projectPath;
        this.analysisId = params.analysisId;
        this.filters = params.filters || {};
        this.sortBy = params.sortBy || 'createdAt';
        this.sortOrder = params.sortOrder || 'desc';
        this.page = params.page || 1;
        this.limit = params.limit || 10;
        this.includeRawData = params.includeRawData || false;
        this.includeRecommendations = params.includeRecommendations || true;
        this.includeMetrics = params.includeMetrics || true;
        this.includeCharts = params.includeCharts || false;
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

        if (params.analysisId && typeof params.analysisId !== 'string') {
            throw new Error('Analysis ID must be a string');
        }

        if (params.page && (typeof params.page !== 'number' || params.page < 1)) {
            throw new Error('Page must be a positive number');
        }

        if (params.limit && (typeof params.limit !== 'number' || params.limit < 1 || params.limit > 20)) {
            throw new Error('Limit must be between 1 and 20');
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
        return `get_analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get query summary
     * @returns {Object} Query summary
     */
    getSummary() {
        return {
            queryId: this.queryId,
            type: 'GetProjectAnalysisQuery',
            projectPath: this.projectPath,
            analysisId: this.analysisId,
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
            analysisId: this.analysisId,
            filters: Object.keys(this.filters),
            sortBy: this.sortBy,
            sortOrder: this.sortOrder,
            page: this.page,
            limit: this.limit,
            includeRawData: this.includeRawData,
            includeRecommendations: this.includeRecommendations,
            includeMetrics: this.includeMetrics,
            includeCharts: this.includeCharts,
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

        // Check if projectPath or analysisId is provided
        if (!this.projectPath && !this.analysisId) {
            errors.push('Either projectPath or analysisId must be provided');
        }

        // Check limit size
        if (this.limit > 15) {
            warnings.push('Large limit may impact performance');
        }

        // Check include options
        if (this.includeRawData && this.includeCharts) {
            warnings.push('Including raw data and charts may impact performance');
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
            allowedFields: ['id', 'projectPath', 'analysisType', 'status', 'createdAt', 'completedAt', 'duration']
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
            analysisId: this.analysisId,
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
            rawData: this.includeRawData,
            recommendations: this.includeRecommendations,
            metrics: this.includeMetrics,
            charts: this.includeCharts,
            limitRawData: this.limit > 10 ? 1000 : 5000, // Limit raw data for large queries
            limitMetrics: this.limit > 10 ? 20 : 50 // Limit metrics for large queries
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
            analysisId: this.analysisId,
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
            analysisId: this.analysisId,
            filters: this.filters,
            sortBy: this.sortBy,
            sortOrder: this.sortOrder,
            page: this.page,
            limit: this.limit,
            includeRawData: this.includeRawData,
            includeRecommendations: this.includeRecommendations,
            includeMetrics: this.includeMetrics,
            includeCharts: this.includeCharts,
            requestedBy: this.requestedBy,
            metadata: this.metadata,
            timestamp: this.timestamp
        };
    }

    /**
     * Create query from JSON
     * @param {Object} json - JSON representation
     * @returns {GetProjectAnalysisQuery} Query instance
     */
    static fromJSON(json) {
        const params = { ...json };
        
        // Convert date strings back to Date objects
        if (params.timestamp) {
            params.timestamp = new Date(params.timestamp);
        }

        return new GetProjectAnalysisQuery(params);
    }

    /**
     * Create query by project path
     * @param {string} projectPath - Project path
     * @param {Object} options - Query options
     * @returns {GetProjectAnalysisQuery} Query instance
     */
    static byProject(projectPath, options = {}) {
        return new GetProjectAnalysisQuery({
            projectPath,
            ...options
        });
    }

    /**
     * Create query by analysis ID
     * @param {string} analysisId - Analysis ID
     * @param {Object} options - Query options
     * @returns {GetProjectAnalysisQuery} Query instance
     */
    static byAnalysisId(analysisId, options = {}) {
        return new GetProjectAnalysisQuery({
            analysisId,
            ...options
        });
    }

    /**
     * Create query by analysis type
     * @param {string} analysisType - Analysis type
     * @param {Object} options - Query options
     * @returns {GetProjectAnalysisQuery} Query instance
     */
    static byType(analysisType, options = {}) {
        return new GetProjectAnalysisQuery({
            filters: { analysisType },
            ...options
        });
    }

    /**
     * Create query for completed analyses
     * @param {Object} options - Query options
     * @returns {GetProjectAnalysisQuery} Query instance
     */
    static completed(options = {}) {
        return new GetProjectAnalysisQuery({
            filters: { status: 'completed' },
            sortBy: 'completedAt',
            sortOrder: 'desc',
            ...options
        });
    }

    /**
     * Create query for failed analyses
     * @param {Object} options - Query options
     * @returns {GetProjectAnalysisQuery} Query instance
     */
    static failed(options = {}) {
        return new GetProjectAnalysisQuery({
            filters: { status: 'failed' },
            sortBy: 'completedAt',
            sortOrder: 'desc',
            ...options
        });
    }

    /**
     * Create query for running analyses
     * @param {Object} options - Query options
     * @returns {GetProjectAnalysisQuery} Query instance
     */
    static running(options = {}) {
        return new GetProjectAnalysisQuery({
            filters: { status: 'running' },
            sortBy: 'startedAt',
            sortOrder: 'desc',
            ...options
        });
    }

    /**
     * Create query for recent analyses
     * @param {number} hours - Number of hours
     * @param {Object} options - Query options
     * @returns {GetProjectAnalysisQuery} Query instance
     */
    static recent(hours = 24, options = {}) {
        const startDate = new Date();
        startDate.setHours(startDate.getHours() - hours);

        return new GetProjectAnalysisQuery({
            filters: { 
                createdAt: { $gte: startDate } 
            },
            sortBy: 'createdAt',
            sortOrder: 'desc',
            ...options
        });
    }

    /**
     * Create query with recommendations
     * @param {Object} options - Query options
     * @returns {GetProjectAnalysisQuery} Query instance
     */
    static withRecommendations(options = {}) {
        return new GetProjectAnalysisQuery({
            includeRecommendations: true,
            ...options
        });
    }

    /**
     * Create query with metrics
     * @param {Object} options - Query options
     * @returns {GetProjectAnalysisQuery} Query instance
     */
    static withMetrics(options = {}) {
        return new GetProjectAnalysisQuery({
            includeMetrics: true,
            ...options
        });
    }

    /**
     * Create query with charts
     * @param {Object} options - Query options
     * @returns {GetProjectAnalysisQuery} Query instance
     */
    static withCharts(options = {}) {
        return new GetProjectAnalysisQuery({
            includeCharts: true,
            ...options
        });
    }

    /**
     * Create query for comprehensive analyses
     * @param {Object} options - Query options
     * @returns {GetProjectAnalysisQuery} Query instance
     */
    static comprehensive(options = {}) {
        return new GetProjectAnalysisQuery({
            filters: { analysisType: 'comprehensive' },
            includeRecommendations: true,
            includeMetrics: true,
            ...options
        });
    }

    /**
     * Create query for security analyses
     * @param {Object} options - Query options
     * @returns {GetProjectAnalysisQuery} Query instance
     */
    static security(options = {}) {
        return new GetProjectAnalysisQuery({
            filters: { analysisType: 'security' },
            includeRecommendations: true,
            includeMetrics: true,
            ...options
        });
    }

    /**
     * Create query for performance analyses
     * @param {Object} options - Query options
     * @returns {GetProjectAnalysisQuery} Query instance
     */
    static performance(options = {}) {
        return new GetProjectAnalysisQuery({
            filters: { analysisType: 'performance' },
            includeMetrics: true,
            includeCharts: true,
            ...options
        });
    }
}

module.exports = GetProjectAnalysisQuery; 