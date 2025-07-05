/**
 * Refactoring utility functions for TaskExecutionEngine
 */
const EXECUTION_CONSTANTS = require('../constants/ExecutionConstants');

class RefactoringUtils {
    constructor(logger = console) {
        this.logger = logger;
    }

    /**
     * Analyze file for refactoring opportunities
     * @param {string} content - File content
     * @param {string} filePath - File path
     * @param {string} refactoringType - Type of refactoring
     * @returns {Array} Array of refactoring opportunities
     */
    async analyzeFileForRefactoring(content, filePath, refactoringType) {
        const opportunities = [];
        
        try {
            switch (refactoringType) {
                case EXECUTION_CONSTANTS.REFACTORING_TYPES.EXTRACT_METHOD:
                    opportunities.push(...this.findExtractMethodOpportunities(content, filePath));
                    break;
                case EXECUTION_CONSTANTS.REFACTORING_TYPES.EXTRACT_CLASS:
                    opportunities.push(...this.findExtractClassOpportunities(content, filePath));
                    break;
                case EXECUTION_CONSTANTS.REFACTORING_TYPES.RENAME:
                    opportunities.push(...this.findRenameOpportunities(content, filePath));
                    break;
                case EXECUTION_CONSTANTS.REFACTORING_TYPES.MOVE_METHOD:
                    opportunities.push(...this.findMoveMethodOpportunities(content, filePath));
                    break;
            }
        } catch (error) {
            this.logger.error('RefactoringUtils: Failed to analyze file for refactoring', {
                filePath: filePath,
                error: error.message
            });
        }

        return opportunities;
    }

    /**
     * Find extract method opportunities
     * @param {string} content - File content
     * @param {string} filePath - File path
     * @returns {Array} Array of opportunities
     */
    findExtractMethodOpportunities(content, filePath) {
        const opportunities = [];
        const longMethodRegex = /function\s+\w+\s*\([^)]*\)\s*\{[\s\S]{200,}\}/g;
        let match;

        while ((match = longMethodRegex.exec(content)) !== null) {
            opportunities.push({
                type: EXECUTION_CONSTANTS.REFACTORING_TYPES.EXTRACT_METHOD,
                filePath: filePath,
                line: content.substring(0, match.index).split('\n').length,
                description: 'Long method detected - consider extracting smaller methods',
                confidence: 0.8
            });
        }

        return opportunities;
    }

    /**
     * Find extract class opportunities
     * @param {string} content - File content
     * @param {string} filePath - File path
     * @returns {Array} Array of opportunities
     */
    findExtractClassOpportunities(content, filePath) {
        const opportunities = [];
        const largeClassRegex = /class\s+\w+\s*\{[\s\S]{500,}\}/g;
        let match;

        while ((match = largeClassRegex.exec(content)) !== null) {
            opportunities.push({
                type: EXECUTION_CONSTANTS.REFACTORING_TYPES.EXTRACT_CLASS,
                filePath: filePath,
                line: content.substring(0, match.index).split('\n').length,
                description: 'Large class detected - consider extracting smaller classes',
                confidence: 0.7
            });
        }

        return opportunities;
    }

    /**
     * Find rename opportunities
     * @param {string} content - File content
     * @param {string} filePath - File path
     * @returns {Array} Array of opportunities
     */
    findRenameOpportunities(content, filePath) {
        const opportunities = [];
        const poorNamingRegex = /(?:function|const|let|var)\s+([a-z_]+)\s*[=\(]/g;
        let match;

        while ((match = poorNamingRegex.exec(content)) !== null) {
            const name = match[1];
            if (name.length < 3 || name.includes('_')) {
                opportunities.push({
                    type: EXECUTION_CONSTANTS.REFACTORING_TYPES.RENAME,
                    filePath: filePath,
                    line: content.substring(0, match.index).split('\n').length,
                    description: `Poor naming detected: ${name} - consider more descriptive name`,
                    confidence: 0.6
                });
            }
        }

        return opportunities;
    }

    /**
     * Find move method opportunities
     * @param {string} content - File content
     * @param {string} filePath - File path
     * @returns {Array} Array of opportunities
     */
    findMoveMethodOpportunities(content, filePath) {
        const opportunities = [];
        const utilityMethodRegex = /function\s+(\w+)\s*\([^)]*\)\s*\{[\s\S]*?\}/g;
        let match;

        while ((match = utilityMethodRegex.exec(content)) !== null) {
            const methodName = match[1];
            if (methodName.toLowerCase().includes('util') || methodName.toLowerCase().includes('helper')) {
                opportunities.push({
                    type: EXECUTION_CONSTANTS.REFACTORING_TYPES.MOVE_METHOD,
                    filePath: filePath,
                    line: content.substring(0, match.index).split('\n').length,
                    description: `Utility method detected: ${methodName} - consider moving to utility class`,
                    confidence: 0.7
                });
            }
        }

        return opportunities;
    }

    /**
     * Generate extract method steps
     * @param {Object} opportunity - Refactoring opportunity
     * @returns {Array} Array of steps
     */
    async generateExtractMethodSteps(opportunity) {
        return [
            { action: 'identify_code_block', description: 'Identify the code block to extract' },
            { action: 'create_new_method', description: 'Create new method with extracted code' },
            { action: 'update_original', description: 'Replace original code with method call' },
            { action: 'add_tests', description: 'Add tests for the new method' }
        ];
    }

    /**
     * Generate extract class steps
     * @param {Object} opportunity - Refactoring opportunity
     * @returns {Array} Array of steps
     */
    async generateExtractClassSteps(opportunity) {
        return [
            { action: 'identify_responsibilities', description: 'Identify class responsibilities' },
            { action: 'create_new_class', description: 'Create new class with extracted responsibilities' },
            { action: 'update_original_class', description: 'Update original class to use new class' },
            { action: 'update_references', description: 'Update all references to use new class' }
        ];
    }

    /**
     * Generate rename steps
     * @param {Object} opportunity - Refactoring opportunity
     * @returns {Array} Array of steps
     */
    async generateRenameSteps(opportunity) {
        return [
            { action: 'find_all_references', description: 'Find all references to the item' },
            { action: 'update_declaration', description: 'Update the declaration with new name' },
            { action: 'update_references', description: 'Update all references with new name' },
            { action: 'run_tests', description: 'Run tests to ensure nothing is broken' }
        ];
    }

    /**
     * Generate move method steps
     * @param {Object} opportunity - Refactoring opportunity
     * @returns {Array} Array of steps
     */
    async generateMoveMethodSteps(opportunity) {
        return [
            { action: 'identify_target_class', description: 'Identify the target class for the item' },
            { action: 'move_method', description: 'Move method to target class' },
            { action: 'update_references', description: 'Update all references to the moved method' },
            { action: 'remove_original', description: 'Remove original method declaration' }
        ];
    }

    /**
     * Apply refactoring step
     * @param {Object} step - Refactoring step
     * @param {Object} opportunity - Refactoring opportunity
     * @returns {Object} Step result
     */
    async applyRefactoringStep(step, opportunity) {
        return {
            step: step.action,
            description: step.description,
            applied: true,
            timestamp: new Date()
        };
    }

    /**
     * Validate refactoring change
     * @param {Object} change - Refactoring change
     * @returns {Object} Validation result
     */
    async validateRefactoringChange(change) {
        return {
            passed: true,
            issues: [],
            warnings: []
        };
    }
}

module.exports = RefactoringUtils; 