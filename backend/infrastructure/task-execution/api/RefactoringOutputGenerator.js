/**
 * RefactoringOutputGenerator - Generates refactoring tasks based on project analysis
 * Located in infrastructure/api/output as it's an external concern
 */
const { v4: uuidv4 } = require('uuid');
const Logger = require('@logging/Logger');
const logger = new Logger('RefactoringOutputGenerator');

class RefactoringOutputGenerator {
    constructor(options = {}) {
        this.logger = logger;
    }

    /**
     * Generate refactoring tasks based on analysis
     * @param {Object} analysis - Project analysis results
     * @param {Object} options - Generation options
     * @returns {Promise<Array>} Array of refactoring tasks
     */
    async generateRefactoringTasks(analysis, options = {}) {
        try {
            // this.logger.info('RefactoringOutputGenerator: Generating refactoring tasks');

            const tasks = [];
            const { requestedBy, projectId } = options;

            // Generate tasks based on refactoring opportunities
            for (const opportunity of analysis.refactoringOpportunities) {
                const task = this.createTaskFromOpportunity(opportunity, analysis, {
                    requestedBy,
                    projectId
                });
                
                if (task) {
                    tasks.push(task);
                }
            }

            // Add default tasks if no opportunities found
            if (tasks.length === 0) {
                tasks.push(...this.generateDefaultTasks(analysis, options));
            }

            this.// logger.info(`RefactoringOutputGenerator: Generated ${tasks.length} refactoring tasks`);

            return tasks;

        } catch (error) {
            this.logger.error('RefactoringOutputGenerator: Failed to generate tasks', {
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Create task from refactoring opportunity
     * @param {Object} opportunity - Refactoring opportunity
     * @param {Object} analysis - Project analysis
     * @param {Object} options - Task options
     * @returns {Object|null} Task object or null
     */
    createTaskFromOpportunity(opportunity, analysis, options) {
        const { requestedBy, projectId } = options;

        switch (opportunity.type) {
            case 'split_large_files':
                return this.createSplitLargeFilesTask(opportunity, analysis, {
                    requestedBy,
                    projectId
                });

            case 'clean_dependencies':
                return this.createCleanDependenciesTask(opportunity, analysis, {
                    requestedBy,
                    projectId
                });

            case 'organize_modules':
                return this.createOrganizeModulesTask(opportunity, analysis, {
                    requestedBy,
                    projectId
                });

            case 'restructure_architecture':
                return this.createRestructureArchitectureTask(opportunity, analysis, {
                    requestedBy,
                    projectId
                });

            default:
                this.logger.warn('RefactoringOutputGenerator: Unknown opportunity type', {
                    type: opportunity.type
                });
                return null;
        }
    }

    /**
     * Create split large files task
     * @param {Object} opportunity - Opportunity data
     * @param {Object} analysis - Project analysis
     * @param {Object} options - Task options
     * @returns {Object} Task object
     */
    createSplitLargeFilesTask(opportunity, analysis, options) {
        const { requestedBy, projectId } = options;
        const files = opportunity.files || [];

        return {
            id: `split_large_files_${uuidv4()}`,
            title: 'Split Large Files',
            description: `Split ${files.length} files that exceed 500 lines into smaller, more manageable modules`,
            type: 'refactor',
            priority: opportunity.priority || 'high',
            category: 'files',
            estimatedDuration: 300000, // 5 minutes
            command: { type: 'SplitLargeFilesCommand',
                params, filePath: opportunity.filePath,
                    options: {
                        maxFileSize: 10000, // 10KB
                        splitStrategy: 'function',
                        preserveOriginal: true,
                        createIndexFiles: true,
                        analyzeDependencies: true,
                        validateSplit: true,
                        backupOriginal: true,
                    requestedBy,
                    projectId }
            },
            files: files.map(f => ({
                    path: f.relativePath,
                    lines: f.lines,
                    size: f.size)),
                totalFiles: files.length,
                totalLines: files.reduce((sum, f) => sum + f.lines, 0)
            }
        };
    }

    /**
     * Create clean [REDACTED]} opportunity - Opportunity data
     * @param {Object} analysis - Project analysis
     * @param {Object} options - Task options
     * @returns {Object} Task object
     */
    createCleanDependenciesTask(opportunity, analysis, options) {
        const { requestedBy, projectId } = options;
        const deps = analysis.[REDACTED]}`,
            title: 'Clean Dependencies',
            description: `Clean and optimize ${deps.[REDACTED]} [REDACTED],
            type: 'refactor',
            priority: opportunity.priority || 'medium',
            category: '[REDACTED],
            estimatedDuration: 180000, // 3 minutes
            command: { type: 'CleanDependenciesCommand',
                params, [REDACTED],
                    options: {
                        removeUnused: true,
                        updateVersions: false,
                        consolidateDuplicates: true,
                        checkSecurity: true,
                        analyzeTransitive: true,
                        optimizeBundle: false,
                        backupPackageJson: true,
                        validateChanges: true,
                    requestedBy,
                    projectId }
            },
            [REDACTED],
                devDependencies: deps.devDependencies,
                totalDependencies: deps.[REDACTED],
                hasPackageJson: deps.hasPackageJson
        };
    }

    /**
     * Create organize modules task
     * @param {Object} opportunity - Opportunity data
     * @param {Object} analysis - Project analysis
     * @param {Object} options - Task options
     * @returns {Object} Task object
     */
    createOrganizeModulesTask(opportunity, analysis, options) {
        const { requestedBy, projectId } = options;
        const arch = analysis.architecture;

        return {
            id: `organize_modules_${uuidv4()}`,
            title: 'Organize Modules',
            description: 'Reorganize project structure using feature-based architecture',
            type: 'refactor',
            priority: opportunity.priority || 'medium',
            category: 'architecture',
            estimatedDuration: 240000, // 4 minutes
            command: { type: 'OrganizeModulesCommand',
                params, [REDACTED],
                    options: {
                        organizationStrategy: 'feature',
                        createIndexFiles: true,
                        moveFiles: true,
                        updateImports: true,
                        analyzeDependencies: true,
                        validateOrganization: true,
                        backupOriginal: true,
                        createDocumentation: false,
                    requestedBy,
                    projectId }
            },
            currentStructure: arch.structure,
                hasSrc: arch.structure.hasSrc,
                hasComponents: arch.structure.hasComponents,
                hasServices: arch.structure.hasServices,
                hasUtils: arch.structure.hasUtils,
                suggestion: opportunity.suggestion
        };
    }

    /**
     * Create restructure architecture task
     * @param {Object} opportunity - Opportunity data
     * @param {Object} analysis - Project analysis
     * @param {Object} options - Task options
     * @returns {Object} Task object
     */
    createRestructureArchitectureTask(opportunity, analysis, options) {
        const { requestedBy, projectId } = options;
        const quality = analysis.codeQuality;

        return {
            id: `restructure_architecture_${uuidv4()}`,
            title: 'Restructure Architecture',
            description: 'Apply Clean Architecture patterns to improve code organization',
            type: 'refactor',
            priority: opportunity.priority || 'high',
            category: 'architecture',
            estimatedDuration: 300000, // 5 minutes
            command: { type: 'RestructureArchitectureCommand',
                params, [REDACTED],
                    options: {
                        architecturePattern: 'clean',
                        restructureStrategy: 'gradual',
                        backupOriginal: true,
                        createNewStructure: true,
                        migrateExisting: true,
                        updateImports: true,
                        createDocumentation: true,
                        validateArchitecture: true,
                        includeExamples: true,
                    requestedBy,
                    projectId }
            },
            maintainability: quality.maintainability,
                testability: quality.testability,
                readability: quality.readability,
                issues: quality.issues,
                reason: opportunity.reason
        };
    }

    /**
     * Generate default tasks when no opportunities found
     * @param {Object} analysis - Project analysis
     * @param {Object} options - Task options
     * @returns {Array} Array of default tasks
     */
    generateDefaultTasks(analysis, options) {
        const { requestedBy, projectId } = options;
        const tasks = [];

        // Always include basic refactoring tasks
        tasks.push({
            id: `clean_[REDACTED]}`,
            title: 'Clean Dependencies',
            description: 'Remove unused [REDACTED],
            type: 'refactor',
            priority: 'medium',
            category: '[REDACTED],
            estimatedDuration: 180000,
            command: { type: 'CleanDependenciesCommand',
                params, [REDACTED],
                    options: {
                        removeUnused: true,
                        updateVersions: false,
                        consolidateDuplicates: true,
                        checkSecurity: true,
                    requestedBy,
                    projectId }
            }
        });

        tasks.push({
            id: `organize_modules_default_${uuidv4()}`,
            title: 'Organize Modules',
            description: 'Reorganize project structure for better maintainability',
            type: 'refactor',
            priority: 'medium',
            category: 'architecture',
            estimatedDuration: 240000,
            command: { type: 'OrganizeModulesCommand',
                params, [REDACTED],
                    options: {
                        organizationStrategy: 'feature',
                        createIndexFiles: true,
                        moveFiles: true,
                        updateImports: true,
                    requestedBy,
                    projectId }
            }
        });

        return tasks;
    }
}

module.exports = RefactoringOutputGenerator; 