/**
 * AdvancedAnalysisCommand - Command for comprehensive analysis with layer and logic validation
 */
const { v4: uuidv4 } = require('uuid');

class AdvancedAnalysisCommand {
    constructor(params = {}) {
        this.commandId = uuidv4();
        this.projectPath = params.projectPath;
        this.requestedBy = params.requestedBy;
        this.scheduledAt = params.scheduledAt || new Date();
        this.timeout = params.timeout || 300000; // 5 minutes
        this.options = {
            includeLayerValidation: params.includeLayerValidation !== false,
            includeLogicValidation: params.includeLogicValidation !== false,
            includeStandardAnalysis: params.includeStandardAnalysis !== false,
            generateReport: params.generateReport !== false,
            exportFormat: params.exportFormat || 'json',
            detailedOutput: params.detailedOutput || false,
            ...params.options
        };
    }

    /**
     * Get analysis options
     * @returns {Object} Analysis options
     */
    getAnalysisOptions() {
        return {
            includeLayerValidation: this.options.includeLayerValidation,
            includeLogicValidation: this.options.includeLogicValidation,
            includeStandardAnalysis: this.options.includeStandardAnalysis,
            generateReport: this.options.generateReport,
            exportFormat: this.options.exportFormat,
            detailedOutput: this.options.detailedOutput
        };
    }

    /**
     * Get output configuration
     * @returns {Object} Output configuration
     */
    getOutputConfiguration() {
        return {
            includeRawData: this.options.detailedOutput,
            includeMetrics: true,
            includeViolations: true,
            includeRecommendations: true,
            includeInsights: true,
            exportFormat: this.options.exportFormat
        };
    }

    /**
     * Get metadata
     * @returns {Object} Command metadata
     */
    getMetadata() {
        return {
            commandType: 'AdvancedAnalysis',
            commandId: this.commandId,
            projectPath: this.projectPath,
            requestedBy: this.requestedBy,
            scheduledAt: this.scheduledAt,
            timeout: this.timeout,
            options: this.options
        };
    }

    /**
     * Validate business rules
     * @returns {Object} Validation result
     */
    validateBusinessRules() {
        const errors = [];
        const warnings = [];

        // Validate required fields
        if (!this.projectPath) {
            errors.push('Project path is required');
        }

        if (!this.requestedBy) {
            errors.push('Requested by is required');
        }

        // Validate timeout
        if (this.timeout < 60000) { // 1 minute minimum
            errors.push('Timeout must be at least 60 seconds');
        }

        if (this.timeout > 1800000) { // 30 minutes maximum
            warnings.push('Analysis timeout is very high (over 30 minutes)');
        }

        // Validate scheduled time
        if (this.scheduledAt && this.scheduledAt < new Date()) {
            errors.push('Scheduled time cannot be in the past');
        }

        // Validate export format
        const validFormats = ['json', 'markdown', 'html', 'pdf'];
        if (this.options.exportFormat && !validFormats.includes(this.options.exportFormat)) {
            errors.push(`Invalid export format. Must be one of: ${validFormats.join(', ')}`);
        }

        // Validate options
        if (!this.options.includeLayerValidation && !this.options.includeLogicValidation && !this.options.includeStandardAnalysis) {
            warnings.push('No analysis types selected. At least one analysis type should be enabled.');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Get command description
     * @returns {string} Command description
     */
    getDescription() {
        const analysisTypes = [];
        if (this.options.includeStandardAnalysis) analysisTypes.push('Standard');
        if (this.options.includeLayerValidation) analysisTypes.push('Layer');
        if (this.options.includeLogicValidation) analysisTypes.push('Logic');

        return `Advanced analysis with ${analysisTypes.join(', ')} validation for project: ${this.projectPath}`;
    }

    /**
     * Get estimated duration
     * @returns {number} Estimated duration in milliseconds
     */
    getEstimatedDuration() {
        let duration = 0;

        if (this.options.includeStandardAnalysis) {
            duration += 60000; // 1 minute for standard analysis
        }

        if (this.options.includeLayerValidation) {
            duration += 90000; // 1.5 minutes for layer validation
        }

        if (this.options.includeLogicValidation) {
            duration += 120000; // 2 minutes for logic validation
        }

        if (this.options.generateReport) {
            duration += 30000; // 30 seconds for report generation
        }

        return Math.min(duration, this.timeout);
    }

    /**
     * Get resource requirements
     * @returns {Object} Resource requirements
     */
    getResourceRequirements() {
        return {
            memory: '512MB',
            cpu: 'medium',
            disk: '100MB',
            network: 'low'
        };
    }

    /**
     * Get dependencies
     * @returns {Array} Dependencies
     */
    getDependencies() {
        return [];
    }

    /**
     * Get priority
     * @returns {string} Priority level
     */
    getPriority() {
        return 'medium';
    }

    /**
     * Get tags
     * @returns {Array} Tags
     */
    getTags() {
        const tags = ['analysis', 'advanced'];

        if (this.options.includeLayerValidation) {
            tags.push('layer-validation');
        }

        if (this.options.includeLogicValidation) {
            tags.push('logic-validation');
        }

        if (this.options.includeStandardAnalysis) {
            tags.push('standard-analysis');
        }

        return tags;
    }

    /**
     * Clone command with new parameters
     * @param {Object} newParams - New parameters
     * @returns {AdvancedAnalysisCommand} New command instance
     */
    clone(newParams = {}) {
        return new AdvancedAnalysisCommand({
            projectPath: newParams.projectPath || this.projectPath,
            requestedBy: newParams.requestedBy || this.requestedBy,
            scheduledAt: newParams.scheduledAt || this.scheduledAt,
            timeout: newParams.timeout || this.timeout,
            options: { ...this.options, ...newParams.options }
        });
    }

    /**
     * Serialize command
     * @returns {Object} Serialized command
     */
    serialize() {
        return {
            commandId: this.commandId,
            projectPath: this.projectPath,
            requestedBy: this.requestedBy,
            scheduledAt: this.scheduledAt,
            timeout: this.timeout,
            options: this.options
        };
    }

    /**
     * Deserialize command
     * @param {Object} data - Serialized data
     * @returns {AdvancedAnalysisCommand} Command instance
     */
    static deserialize(data) {
        return new AdvancedAnalysisCommand({
            projectPath: data.projectPath,
            requestedBy: data.requestedBy,
            scheduledAt: data.scheduledAt,
            timeout: data.timeout,
            options: data.options
        });
    }
}

module.exports = AdvancedAnalysisCommand; 