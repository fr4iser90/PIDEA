/**
 * Testing analyzer service for SingleRepoStrategy
 */
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
            for (const config of TEST_CONFIGS) {
                if (await this.fileUtils.fileExists(path.join(projectPath, config))) {
                    testing.testConfigs.push(config);
                }
            }

            // Determine test types
            testing.unit = testFiles.some(file => file.includes('.test.') || file.includes('.spec.'));
            testing.integration = testFiles.some(file => file.includes('integration') || file.includes('e2e'));
            testing.e2e = testFiles.some(file => file.includes('e2e') || file.includes('cypress') || file.includes('playwright'));

            return testing;
        } catch (error) {
            this.logger.error('TestingAnalyzer: Failed to analyze testing', {
                projectPath,
                error: error.message
            });
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
            await this.directoryScanner.scanForTestFiles(projectPath, testFiles);
        } catch (error) {
            this.logger.warn('TestingAnalyzer: Failed to scan for test files', {
                projectPath,
                error: error.message
            });
        }

        return testFiles;
    }
}

module.exports = TestingAnalyzer; 