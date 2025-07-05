/**
 * GenerateScriptCommand - Command to generate automated scripts
 * Implements the Command pattern for script generation with AI assistance
 */
class GenerateScriptCommand {
    constructor(params) {
        this.validateParams(params);
        
        this.scriptType = params.scriptType;
        this.targetPath = params.targetPath;
        this.projectPath = params.projectPath;
        this.options = params.options || {};
        this.requestedBy = params.requestedBy;
        this.scheduledAt = params.scheduledAt;
        this.timeout = params.timeout || 180000; // 3 minutes default
        this.aiModel = params.aiModel || 'gpt-4';
        this.includeValidation = params.includeValidation || true;
        this.includeDocumentation = params.includeDocumentation || true;
        this.includeErrorHandling = params.includeErrorHandling || true;
        this.autoExecute = params.autoExecute || false;
        this.dryRun = params.dryRun || false;
        this.outputFormat = params.outputFormat || 'javascript';
        this.metadata = params.metadata || {};
        
        this.timestamp = new Date();
        this.commandId = this.generateCommandId();
    }

    /**
     * Validate command parameters
     * @param {Object} params - Command parameters
     * @throws {Error} If parameters are invalid
     */
    validateParams(params) {
        if (!params.scriptType || typeof params.scriptType !== 'string') {
            throw new Error('Script type is required and must be a string');
        }

        if (!params.targetPath || typeof params.targetPath !== 'string') {
            throw new Error('Target path is required and must be a string');
        }

        if (!params.projectPath || typeof params.projectPath !== 'string') {
            throw new Error('Project path is required and must be a string');
        }

        if (params.timeout && (typeof params.timeout !== 'number' || params.timeout < 60000)) {
            throw new Error('Timeout must be at least 60 seconds');
        }

        if (params.aiModel && typeof params.aiModel !== 'string') {
            throw new Error('AI model must be a string');
        }

        if (params.scheduledAt && !(params.scheduledAt instanceof Date)) {
            throw new Error('Scheduled at must be a valid Date object');
        }

        if (params.outputFormat && !['javascript', 'python', 'bash', 'powershell', 'json', 'yaml'].includes(params.outputFormat)) {
            throw new Error('Invalid output format');
        }

        if (params.metadata && typeof params.metadata !== 'object') {
            throw new Error('Metadata must be an object');
        }
    }

    /**
     * Generate unique command ID
     * @returns {string} Unique command ID
     */
    generateCommandId() {
        return `generate_script_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get command summary
     * @returns {Object} Command summary
     */
    getSummary() {
        return {
            commandId: this.commandId,
            type: 'GenerateScriptCommand',
            scriptType: this.scriptType,
            targetPath: this.targetPath,
            outputFormat: this.outputFormat,
            scheduledAt: this.scheduledAt,
            timestamp: this.timestamp,
            requestedBy: this.requestedBy
        };
    }

    /**
     * Get command parameters for logging
     * @returns {Object} Command parameters
     */
    getLoggableParams() {
        return {
            scriptType: this.scriptType,
            targetPath: this.targetPath,
            projectPath: this.projectPath,
            scheduledAt: this.scheduledAt,
            timeout: this.timeout,
            aiModel: this.aiModel,
            includeValidation: this.includeValidation,
            includeDocumentation: this.includeDocumentation,
            includeErrorHandling: this.includeErrorHandling,
            autoExecute: this.autoExecute,
            dryRun: this.dryRun,
            outputFormat: this.outputFormat,
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

        // Check timeout limits
        if (this.timeout > 900000) { // 15 minutes
            warnings.push('Script generation timeout is very high (over 15 minutes)');
        }

        // Check scheduled time
        if (this.scheduledAt && this.scheduledAt < new Date()) {
            errors.push('Scheduled time cannot be in the past');
        }

        // Check auto-execute with dry run
        if (this.autoExecute && this.dryRun) {
            warnings.push('Auto-execute conflicts with dry run mode');
        }

        // Check AI model compatibility
        if (this.aiModel === 'gpt-4' && this.timeout < 300000) {
            warnings.push('GPT-4 script generation may need more time than current timeout');
        }

        // Check output format compatibility
        if (this.outputFormat === 'powershell' && process.platform !== 'win32') {
            warnings.push('PowerShell format may not be optimal on non-Windows systems');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Get script configuration
     * @returns {Object} Script configuration
     */
    getScriptConfiguration() {
        return {
            type: this.scriptType,
            targetPath: this.targetPath,
            projectPath: this.projectPath,
            outputFormat: this.outputFormat,
            includeValidation: this.includeValidation,
            includeDocumentation: this.includeDocumentation,
            includeErrorHandling: this.includeErrorHandling,
            autoExecute: this.autoExecute,
            dryRun: this.dryRun
        };
    }

    /**
     * Get AI configuration
     * @returns {Object} AI configuration
     */
    getAIConfiguration() {
        return {
            model: this.aiModel,
            timeout: this.timeout,
            maxTokens: this.options.maxTokens || 4000,
            temperature: this.options.temperature || 0.1,
            includeContext: this.options.includeContext || true,
            scriptDepth: this.options.scriptDepth || 'detailed',
            includeExamples: this.options.includeExamples || true
        };
    }

    /**
     * Get execution configuration
     * @returns {Object} Execution configuration
     */
    getExecutionConfiguration() {
        return {
            autoExecute: this.autoExecute,
            dryRun: this.dryRun,
            validateBeforeExecute: this.options.validateBeforeExecute || true,
            backupBeforeExecute: this.options.backupBeforeExecute || true,
            rollbackOnError: this.options.rollbackOnError || true,
            executionTimeout: this.options.executionTimeout || 300000 // 5 minutes
        };
    }

    /**
     * Get command metadata
     * @returns {Object} Command metadata
     */
    getMetadata() {
        return {
            commandId: this.commandId,
            timestamp: this.timestamp,
            requestedBy: this.requestedBy,
            scriptType: this.scriptType,
            aiModel: this.aiModel,
            options: this.options,
            metadata: this.metadata
        };
    }

    /**
     * Check if script generation should be immediate
     * @returns {boolean} True if immediate generation
     */
    isImmediate() {
        return !this.scheduledAt || this.scheduledAt <= new Date();
    }

    /**
     * Check if script generation is scheduled
     * @returns {boolean} True if scheduled generation
     */
    isScheduled() {
        return !!this.scheduledAt && this.scheduledAt > new Date();
    }

    /**
     * Get script generation priority
     * @returns {number} Generation priority
     */
    getGenerationPriority() {
        let priority = 0;

        // Higher priority for immediate generation
        if (this.isImmediate()) {
            priority += 100;
        }

        // Higher priority for auto-execute scripts
        if (this.autoExecute) {
            priority += 50;
        }

        // Higher priority for critical script types
        if (['deployment', 'security', 'backup'].includes(this.scriptType)) {
            priority += 75;
        }

        // Lower priority for scheduled generation
        if (this.isScheduled()) {
            priority -= 25;
        }

        // Lower priority for dry runs
        if (this.dryRun) {
            priority -= 10;
        }

        return priority;
    }

    /**
     * Convert command to JSON
     * @returns {Object} JSON representation
     */
    toJSON() {
        return {
            commandId: this.commandId,
            scriptType: this.scriptType,
            targetPath: this.targetPath,
            projectPath: this.projectPath,
            options: this.options,
            requestedBy: this.requestedBy,
            scheduledAt: this.scheduledAt,
            timeout: this.timeout,
            aiModel: this.aiModel,
            includeValidation: this.includeValidation,
            includeDocumentation: this.includeDocumentation,
            includeErrorHandling: this.includeErrorHandling,
            autoExecute: this.autoExecute,
            dryRun: this.dryRun,
            outputFormat: this.outputFormat,
            metadata: this.metadata,
            timestamp: this.timestamp
        };
    }

    /**
     * Create command from JSON
     * @param {Object} json - JSON representation
     * @returns {GenerateScriptCommand} Command instance
     */
    static fromJSON(json) {
        const params = { ...json };
        
        // Convert date strings back to Date objects
        if (params.scheduledAt) {
            params.scheduledAt = new Date(params.scheduledAt);
        }
        if (params.timestamp) {
            params.timestamp = new Date(params.timestamp);
        }

        return new GenerateScriptCommand(params);
    }

    /**
     * Create build script command
     * @param {string} targetPath - Target path
     * @param {string} projectPath - Project path
     * @param {Object} options - Generation options
     * @returns {GenerateScriptCommand} Command instance
     */
    static build(targetPath, projectPath, options = {}) {
        return new GenerateScriptCommand({
            scriptType: 'build',
            targetPath,
            projectPath,
            outputFormat: 'javascript',
            includeValidation: true,
            includeErrorHandling: true,
            ...options
        });
    }

    /**
     * Create deployment script command
     * @param {string} targetPath - Target path
     * @param {string} projectPath - Project path
     * @param {Object} options - Generation options
     * @returns {GenerateScriptCommand} Command instance
     */
    static deployment(targetPath, projectPath, options = {}) {
        return new GenerateScriptCommand({
            scriptType: 'deployment',
            targetPath,
            projectPath,
            outputFormat: 'bash',
            includeValidation: true,
            includeErrorHandling: true,
            includeDocumentation: true,
            ...options
        });
    }

    /**
     * Create testing script command
     * @param {string} targetPath - Target path
     * @param {string} projectPath - Project path
     * @param {Object} options - Generation options
     * @returns {GenerateScriptCommand} Command instance
     */
    static testing(targetPath, projectPath, options = {}) {
        return new GenerateScriptCommand({
            scriptType: 'testing',
            targetPath,
            projectPath,
            outputFormat: 'javascript',
            includeValidation: true,
            includeErrorHandling: true,
            ...options
        });
    }

    /**
     * Create database script command
     * @param {string} targetPath - Target path
     * @param {string} projectPath - Project path
     * @param {Object} options - Generation options
     * @returns {GenerateScriptCommand} Command instance
     */
    static database(targetPath, projectPath, options = {}) {
        return new GenerateScriptCommand({
            scriptType: 'database',
            targetPath,
            projectPath,
            outputFormat: 'sql',
            includeValidation: true,
            includeErrorHandling: true,
            includeDocumentation: true,
            ...options
        });
    }

    /**
     * Create backup script command
     * @param {string} targetPath - Target path
     * @param {string} projectPath - Project path
     * @param {Object} options - Generation options
     * @returns {GenerateScriptCommand} Command instance
     */
    static backup(targetPath, projectPath, options = {}) {
        return new GenerateScriptCommand({
            scriptType: 'backup',
            targetPath,
            projectPath,
            outputFormat: 'bash',
            includeValidation: true,
            includeErrorHandling: true,
            includeDocumentation: true,
            ...options
        });
    }

    /**
     * Create security script command
     * @param {string} targetPath - Target path
     * @param {string} projectPath - Project path
     * @param {Object} options - Generation options
     * @returns {GenerateScriptCommand} Command instance
     */
    static security(targetPath, projectPath, options = {}) {
        return new GenerateScriptCommand({
            scriptType: 'security',
            targetPath,
            projectPath,
            outputFormat: 'javascript',
            includeValidation: true,
            includeErrorHandling: true,
            includeDocumentation: true,
            ...options
        });
    }

    /**
     * Create scheduled script command
     * @param {string} scriptType - Script type
     * @param {string} targetPath - Target path
     * @param {string} projectPath - Project path
     * @param {Date} scheduledAt - Scheduled time
     * @param {Object} options - Generation options
     * @returns {GenerateScriptCommand} Command instance
     */
    static scheduled(scriptType, targetPath, projectPath, scheduledAt, options = {}) {
        return new GenerateScriptCommand({
            scriptType,
            targetPath,
            projectPath,
            scheduledAt,
            ...options
        });
    }

    /**
     * Create auto-execute script command
     * @param {string} scriptType - Script type
     * @param {string} targetPath - Target path
     * @param {string} projectPath - Project path
     * @param {Object} options - Generation options
     * @returns {GenerateScriptCommand} Command instance
     */
    static autoExecute(scriptType, targetPath, projectPath, options = {}) {
        return new GenerateScriptCommand({
            scriptType,
            targetPath,
            projectPath,
            autoExecute: true,
            includeValidation: true,
            includeErrorHandling: true,
            ...options
        });
    }
}

module.exports = GenerateScriptCommand; 