const TaskPriority = require('@value-objects/TaskPriority');
const TaskType = require('@value-objects/TaskType');

/**
 * AnalyzeLayerViolationsCommand - Command for analyzing layer boundary violations
 */
class AnalyzeLayerViolationsCommand {
    constructor(projectIdOrData, options = {}) {
        // Support both old format (projectId, options) and new format ({projectId, options})
        if (typeof projectIdOrData === 'object') {
            const data = projectIdOrData;
            this.commandId = `analyze_layer_violations_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            this.projectId = data.projectId || 'default-project';
            this.projectPath = data.projectPath || process.cwd();
            this.options = data.options || {};
            this.requestedBy = data.requestedBy || 'system';
            this.timestamp = new Date();
        } else {
            // Old format
            const projectId = projectIdOrData;
            if (!projectId) {
                throw new Error('Project ID is required for layer violation analysis');
            }
            
            this.commandId = `analyze_layer_violations_${projectId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            this.projectId = projectId;
            this.projectPath = options.projectPath || process.cwd();
            this.options = options;
            this.requestedBy = options.requestedBy || 'system';
            this.timestamp = new Date();
        }

        // Set default options
        this.options = {
            includeViolations: true,
            includeFixes: true,
            includeFixPlans: true,
            generateTasks: true,
            createDocs: true,
            ...this.options
        };
    }

    static create(projectId, options = {}) {
        return new AnalyzeLayerViolationsCommand(projectId, options);
    }

    /**
     * Validate business rules
     * @returns {Object} Validation result
     */
    validateBusinessRules() {
        const errors = [];
        const warnings = [];

        // Validate project path exists
        if (!this.projectPath) {
            errors.push('Project path is required');
        }

        // Validate project ID
        if (!this.projectId) {
            errors.push('Project ID is required');
        }

        // Validate options
        if (this.options && typeof this.options !== 'object') {
            errors.push('Options must be an object');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Get command metadata
     * @returns {Object} Metadata
     */
    getMetadata() {
        return {
            commandId: this.commandId,
            projectId: this.projectId,
            projectPath: this.projectPath,
            options: this.options,
            requestedBy: this.requestedBy,
            timestamp: this.timestamp,
            type: 'layer-violation-analysis'
        };
    }

    /**
     * Convert to task creation parameters
     * @returns {Object} Task parameters
     */
    toTaskParameters() {
        return {
            title: 'Analyze Layer Boundary Violations',
            description: 'Analyze and identify layer boundary violations in the codebase',
            type: TaskType.ANALYSIS,
            priority: TaskPriority.HIGH,
            category: 'backend',
            projectId: this.projectId,
            projectPath: this.projectPath,
            metadata: {
                ...this.getMetadata(),
                analysisType: 'layer-violations',
                source: 'AnalyzeLayerViolationsCommand'
            },
            estimatedHours: 1, // Quick analysis
            dependencies: [],
            tags: ['analysis', 'layer-violations', 'architecture', 'ddd']
        };
    }
}

module.exports = AnalyzeLayerViolationsCommand; 