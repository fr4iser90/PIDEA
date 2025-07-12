const TaskPriority = require('@/domain/value-objects/TaskPriority');
const TaskType = require('@/domain/value-objects/TaskType');

/**
 * TestCorrectionCommand - Command for triggering automated test correction and coverage improvement
 */
class TestCorrectionCommand {
    constructor(projectIdOrData, correctionType = 'auto-fix', options = {}) {
        // Support both old format (projectId, correctionType, options) and new format ({projectId, type, ...})
        if (typeof projectIdOrData === 'object') {
            const data = projectIdOrData;
            this.commandId = `test_correction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            this.projectId = data.projectId || 'test-project';
            this.correctionType = data.correctionType || 'auto-fix';
            this.options = {
                watch: false,
                legacy: false,
                complex: false,
                dryRun: false,
                maxConcurrent: 5,
                retryAttempts: 3,
                coverageTarget: 90,
                targetCoverage: 90,
                minCoverage: 80,
                focusAreas: undefined,
                slow: false,
                all: false,
                format: 'markdown',
                outputFile: undefined,
                ...data.options
            };
            this.requestedBy = data.requestedBy || 'system';
            this.timestamp = new Date();
        } else {
            // Old format
            const projectId = projectIdOrData;
            if (!projectId) {
                throw new Error('Project ID is required for test correction command');
            }
            
            this.commandId = `test_correction_${projectId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            this.projectId = projectId;
            this.correctionType = correctionType;
            this.options = {
                watch: false,
                legacy: false,
                complex: false,
                dryRun: false,
                maxConcurrent: 5,
                retryAttempts: 3,
                coverageTarget: 90,
                targetCoverage: 90,
                minCoverage: 80,
                focusAreas: undefined,
                slow: false,
                all: false,
                format: 'markdown',
                outputFile: undefined,
                ...options
            };
            this.requestedBy = options.requestedBy || 'system';
            this.timestamp = new Date();
        }
    }

    static create(projectId, correctionType = 'auto-fix', options = {}) {
        return new TestCorrectionCommand(projectId, correctionType, options);
    }

    static createAutoFix(projectId, options = {}) {
        return new TestCorrectionCommand(projectId, 'auto-fix', options);
    }

    static createCoverageImprove(projectId, options = {}) {
        return new TestCorrectionCommand(projectId, 'coverage-improve', options);
    }

    static createRefactor(projectId, options = {}) {
        return new TestCorrectionCommand(projectId, 'refactor', options);
    }

    static createStatus(projectId, options = {}) {
        return new TestCorrectionCommand(projectId, 'status', options);
    }

    static createReport(projectId, options = {}) {
        return new TestCorrectionCommand(projectId, 'report', options);
    }

    toJSON() {
        return {
            commandId: this.commandId,
            projectId: this.projectId,
            correctionType: this.correctionType,
            options: this.options,
            requestedBy: this.requestedBy,
            timestamp: this.timestamp
        };
    }

    getMetadata() {
        return {
            correctionType: this.correctionType,
            options: this.options,
            requestedBy: this.requestedBy
        };
    }

    /**
     * Get the corresponding task type for this correction command
     */
    getTaskType() {
        switch (this.correctionType) {
            case 'auto-fix':
                return TaskType.TEST_FIX;
            case 'coverage-improve':
                return TaskType.TEST_COVERAGE;
            case 'refactor':
                return TaskType.TEST_REFACTOR;
            case 'status':
                return TaskType.TEST_STATUS;
            case 'report':
                return TaskType.TEST_REPORT;
            default:
                return TaskType.TEST_FIX;
        }
    }

    /**
     * Get the task priority based on correction type and options
     */
    getTaskPriority() {
        if (this.options.watch || this.options.legacy) {
            return TaskPriority.HIGH;
        }
        
        if (this.options.complex || this.options.coverageTarget > 95) {
            return TaskPriority.MEDIUM;
        }
        
        return TaskPriority.LOW;
    }

    /**
     * Get a human-readable title for the task
     */
    getTaskTitle() {
        const typeMap = {
            'auto-fix': 'Auto Fix Tests',
            'coverage-improve': 'Improve Test Coverage',
            'refactor': 'Refactor Tests',
            'status': 'Test Correction Status',
            'report': 'Generate Test Report'
        };
        
        const baseTitle = typeMap[this.correctionType] || 'Test Correction';
        
        if (this.options.legacy) {
            return `${baseTitle} - Legacy Tests`;
        }
        
        if (this.options.complex) {
            return `${baseTitle} - Complex Tests`;
        }
        
        if (this.options.watch) {
            return `${baseTitle} - Watch Mode`;
        }
        
        return baseTitle;
    }

    /**
     * Get a description for the task
     */
    getTaskDescription() {
        const descriptions = {
            'auto-fix': 'Automatically fix failing, legacy, and complex tests to improve test reliability and coverage.',
            'coverage-improve': 'Generate missing tests and improve existing test coverage to meet target coverage goals.',
            'refactor': 'Refactor tests for better maintainability, performance, and readability.',
            'status': 'Check current status of test correction tasks and progress.',
            'report': 'Generate detailed report of test correction activities and results.'
        };
        
        let description = descriptions[this.correctionType] || 'Perform test correction and improvement tasks.';
        
        if (this.options.dryRun) {
            description += ' (Dry run mode - no actual changes will be made)';
        }
        
        if (this.options.coverageTarget) {
            description += ` Target coverage: ${this.options.coverageTarget}%`;
        }
        
        return description;
    }
}

module.exports = TestCorrectionCommand; 