const TestCorrectionService = require('@/domain/services/TestCorrectionService');
const CoverageAnalyzerService = require('@/domain/services/CoverageAnalyzerService');
const AutoFixTests = require('@/scripts/test-correction/auto-fix-tests');
const CoverageImprover = require('@/scripts/test-correction/coverage-improver');
const AutoRefactorCommand = require('@/scripts/test-correction/auto-refactor-command');
const logger = require('@/infrastructure/logging/logger');

/**
 * TestCorrectionHandler - Handles test correction commands
 */
class TestCorrectionHandler {
    constructor(testCorrectionService, coverageAnalyzerService) {
        this.testCorrectionService = testCorrectionService || new TestCorrectionService();
        this.coverageAnalyzerService = coverageAnalyzerService || new CoverageAnalyzerService();
    }

    /**
     * Handle test correction command
     */
    async handle(command) {
        logger.info('Handling test correction command', {
            commandId: command.commandId,
            correctionType: command.correctionType,
            projectId: command.projectId
        });

        try {
            let result;

            switch (command.correctionType) {
                case 'auto-fix':
                    result = await this.handleAutoFix(command);
                    break;
                case 'coverage-improve':
                    result = await this.handleCoverageImprove(command);
                    break;
                case 'refactor':
                    result = await this.handleRefactor(command);
                    break;
                case 'status':
                    result = await this.handleStatus(command);
                    break;
                case 'report':
                    result = await this.handleReport(command);
                    break;
                default:
                    throw new Error(`Unknown correction type: ${command.correctionType}`);
            }

            logger.info('Test correction command completed successfully', {
                commandId: command.commandId,
                result: result
            });

            return {
                success: true,
                commandId: command.commandId,
                result: result
            };

        } catch (error) {
            logger.error('Test correction command failed', {
                commandId: command.commandId,
                error: error.message,
                stack: error.stack
            });

            return {
                success: false,
                commandId: command.commandId,
                error: error.message
            };
        }
    }

    /**
     * Handle auto-fix command
     */
    async handleAutoFix(command) {
        const autoFix = new AutoFixTests({
            watch: command.options.watch,
            legacy: command.options.legacy,
            complex: command.options.complex,
            dryRun: command.options.dryRun,
            maxConcurrent: command.options.maxConcurrent,
            retryAttempts: command.options.retryAttempts,
            coverageTarget: command.options.coverageTarget
        });

        return await autoFix.run();
    }

    /**
     * Handle coverage improvement command
     */
    async handleCoverageImprove(command) {
        const coverageImprover = new CoverageImprover({
            targetCoverage: command.options.targetCoverage,
            minCoverage: command.options.minCoverage,
            dryRun: command.options.dryRun,
            focusAreas: command.options.focusAreas
        });

        return await coverageImprover.run();
    }

    /**
     * Handle refactor command
     */
    async handleRefactor(command) {
        const refactorCommand = new AutoRefactorCommand({
            complex: command.options.complex,
            legacy: command.options.legacy,
            slow: command.options.slow,
            all: command.options.all,
            dryRun: command.options.dryRun,
            maxConcurrent: command.options.maxConcurrent
        });

        return await refactorCommand.execute();
    }

    /**
     * Handle status command
     */
    async handleStatus(command) {
        const autoFix = new AutoFixTests();
        return await autoFix.showStatus();
    }

    /**
     * Handle report command
     */
    async handleReport(command) {
        const autoFix = new AutoFixTests();
        return await autoFix.generateReport(null, null, {
            format: command.options.format,
            outputFile: command.options.outputFile
        });
    }

    /**
     * Get current test correction status
     */
    async getStatus(projectId) {
        try {
            const status = await this.testCorrectionService.getStatus(projectId);
            const coverage = await this.coverageAnalyzerService.getCurrentCoverage(projectId);
            
            return {
                status,
                coverage,
                timestamp: new Date()
            };
        } catch (error) {
            logger.error('Failed to get test correction status', { error: error.message });
            throw error;
        }
    }

    /**
     * Stop ongoing test correction tasks
     */
    async stopCorrections(projectId) {
        try {
            await this.testCorrectionService.stopCorrections(projectId);
            return { success: true, message: 'Test corrections stopped successfully' };
        } catch (error) {
            logger.error('Failed to stop test corrections', { error: error.message });
            throw error;
        }
    }

    /**
     * Get test correction history
     */
    async getHistory(projectId, limit = 50) {
        try {
            return await this.testCorrectionService.getHistory(projectId, limit);
        } catch (error) {
            logger.error('Failed to get test correction history', { error: error.message });
            throw error;
        }
    }

    /**
     * Validate command options
     */
    validateCommand(command) {
        const errors = [];

        if (!command.projectId) {
            errors.push('Project ID is required');
        }

        if (!command.correctionType) {
            errors.push('Correction type is required');
        }

        if (command.options.maxConcurrent && (command.options.maxConcurrent < 1 || command.options.maxConcurrent > 20)) {
            errors.push('Max concurrent must be between 1 and 20');
        }

        if (command.options.coverageTarget && (command.options.coverageTarget < 0 || command.options.coverageTarget > 100)) {
            errors.push('Coverage target must be between 0 and 100');
        }

        if (command.options.retryAttempts && (command.options.retryAttempts < 0 || command.options.retryAttempts > 10)) {
            errors.push('Retry attempts must be between 0 and 10');
        }

        if (errors.length > 0) {
            throw new Error(`Validation failed: ${errors.join(', ')}`);
        }

        return true;
    }
}

module.exports = TestCorrectionHandler; 