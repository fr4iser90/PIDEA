/**
 * Testing analyzer service for SingleRepoStrategy
 */
const path = require('path');
const { TEST_CONFIGS } = require('../constants');

class TestingAnalyzer {
    constructor(logger, fileUtils, directoryScanner) {
        this.logger = logger;
        this.fileUtils = fileUtils;
        this.directoryScanner = directoryScanner;
    }

    /**
     * Analyze testing setup
     * @param {string} projectPath - Project path
     * @returns {Promise<Object>} Testing analysis
     */
    async analyzeTesting(projectPath) {
        try {
            const testing = {
                hasTests: false,
                testFiles: [],
                testConfigs: [],
                coverage: false,
                e2e: false,
                unit: false,
                integration: false
            };

            // Check for test files
            const testFiles = await this.findTestFiles(projectPath);
            testing.testFiles = testFiles;
            testing.hasTests = testFiles.length > 0;

            // Check for test configurations
            if (this.fileUtils && this.fileUtils.fileExists) {
                for (const config of TEST_CONFIGS) {
                    try {
                        if (await this.fileUtils.fileExists(path.join(projectPath, config))) {
                            testing.testConfigs.push(config);
                        }
                    } catch (error) {
                        // Continue checking other configs even if one fails
                        continue;
                    }
                }
            }

            // Determine test types
            testing.unit = testFiles.some(file => file.includes('.test.') || file.includes('.spec.'));
            testing.integration = testFiles.some(file => file.includes('integration') || file.includes('e2e'));
            testing.e2e = testFiles.some(file => file.includes('e2e') || file.includes('cypress') || file.includes('playwright'));

            return testing;
        } catch (error) {
            if (this.logger && this.logger.error) {
                this.logger.error('TestingAnalyzer: Failed to analyze testing', {
                    projectPath,
                    error: error.message
                });
            }
            return {};
        }
    }

    /**
     * Find test files
     * @param {string} projectPath - Project path
     * @returns {Promise<Array>} Test files
     */
    async findTestFiles(projectPath) {
        const testFiles = [];

        // Simple implementation - in production, use glob patterns
        try {
            if (this.directoryScanner && this.directoryScanner.scanForTestFiles) {
                const result = await this.directoryScanner.scanForTestFiles(projectPath, testFiles);
                return result || testFiles;
            }
        } catch (error) {
            if (this.logger && this.logger.warn) {
                this.logger.warn('TestingAnalyzer: Failed to scan for test files', {
                    projectPath,
                    error: error.message
                });
            }
        }

        return testFiles;
    }
}

module.exports = TestingAnalyzer; 