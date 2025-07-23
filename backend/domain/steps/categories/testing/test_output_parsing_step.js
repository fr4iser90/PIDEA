/**
 * TestOutputParsingStep - Parse existing test output files for failing tests and coverage issues
 * Extracted from AutoTestFixSystem
 */

const Logger = require('@logging/Logger');
const logger = new Logger('test_output_parsing_step');

/**
 * TestOutputParsingStep - Parse test outputs for analysis
 */
class TestOutputParsingStep {
  constructor() {
    this.name = 'TestOutputParsingStep';
    this.description = 'Parse existing test output files for failing tests and coverage issues';
    this.category = 'testing';
    this.version = '1.0.0';
  }

  static getConfig() {
    return config;
  }

  /**
   * Execute the test output parsing step
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} Step execution result
   */
  async execute(context = {}) {
    const stepId = `test_output_parsing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      logger.info('🚀 Starting TestOutputParsingStep execution', {
        stepId,
        projectId: context.projectId
      });

      // Validate context
      this.validateContext(context);
      
      // Get services via dependency injection
      const services = this.validateServices(context);
      
      const { projectPath, options = {} } = context;
      
      // Parse test outputs
      const parsedData = await this.parseAllTestOutputs(projectPath, options);
      
      logger.info('✅ Test output parsing completed', {
        stepId,
        failingTests: parsedData.failingTests.length,
        coverageIssues: parsedData.coverageIssues.length,
        legacyTests: parsedData.legacyTests.length,
        complexTests: parsedData.complexTests.length
      });

      return {
        success: true,
        stepId,
        projectId: context.projectId,
        message: 'Test output parsing completed',
        data: parsedData,
        timestamp: new Date()
      };
      
    } catch (error) {
      logger.error('❌ Test output parsing failed', {
        stepId,
        projectId: context.projectId,
        error: error.message
      });

      return {
        success: false,
        error: error.message,
        stepId,
        projectId: context.projectId,
        timestamp: new Date()
      };
    }
  }

  /**
   * Validate execution context
   * @param {Object} context - Execution context
   */
  validateContext(context) {
    if (!context.projectId) {
      throw new Error('Project ID is required');
    }
    if (!context.projectPath) {
      throw new Error('Project path is required');
    }
  }

  /**
   * Validate and get required services
   * @param {Object} context - Execution context
   * @returns {Object} Services object
   */
  validateServices(context) {
    const services = {};

    // Optional services
    try {
      services.testReportParser = context.getService('testReportParser');
    } catch (error) {
      logger.warn('⚠️ testReportParser not available, using local parsing');
    }

    try {
      services.eventBus = context.getService('eventBus');
    } catch (error) {
      logger.warn('⚠️ eventBus not available, continuing without event publishing');
    }

    return services;
  }

  /**
   * Parse all test outputs in project
   * @param {string} projectPath - Project path
   * @param {Object} options - Parsing options
   * @returns {Promise<Object>} Parsed data
   */
  async parseAllTestOutputs(projectPath, options = {}) {
    try {
      const fs = require('fs').promises;
      const path = require('path');

      const parsedData = {
        failingTests: [],
        coverageIssues: [],
        legacyTests: [],
        complexTests: [],
        projectPath,
        timestamp: new Date()
      };

      // Common test output file patterns
      const testOutputPatterns = [
        'test-output.log',
        'test-results.json',
        'coverage.json',
        'junit.xml',
        'test-report.xml',
        '*.test.log',
        '*.spec.log'
      ];

      // Find test output files
      const testFiles = await this.findTestOutputFiles(projectPath, testOutputPatterns);
      
      for (const file of testFiles) {
        try {
          const content = await fs.readFile(file, 'utf8');
          const fileData = this.parseTestOutputFile(content, file, options);
          
          // Merge data
          parsedData.failingTests.push(...fileData.failingTests);
          parsedData.coverageIssues.push(...fileData.coverageIssues);
          parsedData.legacyTests.push(...fileData.legacyTests);
          parsedData.complexTests.push(...fileData.complexTests);
          
        } catch (error) {
          logger.warn(`Failed to parse test file ${file}:`, error.message);
        }
      }

      // Remove duplicates
      parsedData.failingTests = this.removeDuplicates(parsedData.failingTests, 'testName');
      parsedData.coverageIssues = this.removeDuplicates(parsedData.coverageIssues, 'file');
      parsedData.legacyTests = this.removeDuplicates(parsedData.legacyTests, 'testName');
      parsedData.complexTests = this.removeDuplicates(parsedData.complexTests, 'testName');

      return parsedData;

    } catch (error) {
      logger.error('Failed to parse test outputs:', error.message);
      return {
        failingTests: [],
        coverageIssues: [],
        legacyTests: [],
        complexTests: [],
        projectPath,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Find test output files in project
   * @param {string} projectPath - Project path
   * @param {Array} patterns - File patterns
   * @returns {Promise<Array>} Found files
   */
  async findTestOutputFiles(projectPath, patterns) {
    const fs = require('fs').promises;
    const path = require('path');
    const glob = require('glob');

    const files = [];
    
    for (const pattern of patterns) {
      try {
        const matches = await glob.glob(path.join(projectPath, '**', pattern), {
          ignore: ['node_modules/**', '.git/**', 'dist/**', 'build/**']
        });
        files.push(...matches);
      } catch (error) {
        logger.warn(`Failed to find files with pattern ${pattern}:`, error.message);
      }
    }

    return [...new Set(files)]; // Remove duplicates
  }

  /**
   * Parse individual test output file
   * @param {string} content - File content
   * @param {string} filePath - File path
   * @param {Object} options - Parsing options
   * @returns {Object} Parsed data
   */
  parseTestOutputFile(content, filePath, options = {}) {
    const data = {
      failingTests: [],
      coverageIssues: [],
      legacyTests: [],
      complexTests: []
    };

    // Parse failing tests
    if (options.parseFailingTests !== false) {
      data.failingTests = this.parseFailingTests(content, filePath);
    }

    // Parse coverage issues
    if (options.parseCoverageIssues !== false) {
      data.coverageIssues = this.parseCoverageIssues(content, filePath);
    }

    // Parse legacy tests
    if (options.parseLegacyTests !== false) {
      data.legacyTests = this.parseLegacyTests(content, filePath);
    }

    // Parse complex tests
    if (options.parseComplexTests !== false) {
      data.complexTests = this.parseComplexTests(content, filePath);
    }

    return data;
  }

  /**
   * Parse failing tests from output
   * @param {string} content - Test output content
   * @param {string} filePath - File path
   * @returns {Array} Failing tests
   */
  parseFailingTests(content, filePath) {
    const failingTests = [];
    
    // Jest failing test patterns
    const jestPatterns = [
      /✗\s+(.+?)\s+\((.+?)\)/g,
      /FAIL\s+(.+?)\s+\((.+?)\)/g,
      /Test\s+failed:\s+(.+?)\s+in\s+(.+?)/g
    ];

    for (const pattern of jestPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        failingTests.push({
          testName: match[1].trim(),
          file: match[2].trim(),
          source: 'jest',
          filePath
        });
      }
    }

    return failingTests;
  }

  /**
   * Parse coverage issues from output
   * @param {string} content - Test output content
   * @param {string} filePath - File path
   * @returns {Array} Coverage issues
   */
  parseCoverageIssues(content, filePath) {
    const coverageIssues = [];
    
    // Coverage patterns
    const coveragePatterns = [
      /(.+?)\s+\|\s+(\d+(?:\.\d+)?)%\s+\|\s+(\d+)\s+\|\s+(\d+)/g,
      /File\s+(.+?)\s+coverage:\s+(\d+(?:\.\d+)?)%/g
    ];

    for (const pattern of coveragePatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const coverage = parseFloat(match[2]);
        if (coverage < 80) { // Threshold for coverage issues
          coverageIssues.push({
            file: match[1].trim(),
            currentCoverage: coverage,
            targetCoverage: 80,
            source: 'coverage',
            filePath
          });
        }
      }
    }

    return coverageIssues;
  }

  /**
   * Parse legacy tests from output
   * @param {string} content - Test output content
   * @param {string} filePath - File path
   * @returns {Array} Legacy tests
   */
  parseLegacyTests(content, filePath) {
    const legacyTests = [];
    
    // Legacy test patterns
    const legacyPatterns = [
      /describe\('(.+?)',\s*function\s*\(\)/g,
      /it\('(.+?)',\s*function\s*\(\)/g,
      /test\('(.+?)',\s*function\s*\(\)/g
    ];

    for (const pattern of legacyPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        legacyTests.push({
          testName: match[1].trim(),
          file: filePath,
          source: 'legacy',
          filePath
        });
      }
    }

    return legacyTests;
  }

  /**
   * Parse complex tests from output
   * @param {string} content - Test output content
   * @param {string} filePath - File path
   * @returns {Array} Complex tests
   */
  parseComplexTests(content, filePath) {
    const complexTests = [];
    
    // Complex test patterns (long test names, multiple assertions)
    const complexPatterns = [
      /it\('(.{50,})'/g, // Long test names
      /expect\(.+?\)\.toBe\(.+?\)\s*expect\(.+?\)\.toBe\(.+?\)/g, // Multiple assertions
      /describe\('(.+?)',\s*function\s*\(\)\s*\{[\s\S]{200,}/g // Large test blocks
    ];

    for (const pattern of complexPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        complexTests.push({
          testName: match[1] || 'Complex Test',
          file: filePath,
          source: 'complex',
          filePath
        });
      }
    }

    return complexTests;
  }

  /**
   * Remove duplicates from array
   * @param {Array} array - Array to deduplicate
   * @param {string} key - Key to check for duplicates
   * @returns {Array} Deduplicated array
   */
  removeDuplicates(array, key) {
    const seen = new Set();
    return array.filter(item => {
      const value = item[key];
      if (seen.has(value)) {
        return false;
      }
      seen.add(value);
      return true;
    });
  }
}

// Step configuration
const config = {
  name: 'TestOutputParsingStep',
  type: 'testing',
  category: 'testing',
  description: 'Parse existing test output files for failing tests and coverage issues',
  version: '1.0.0',
  dependencies: ['testReportParser', 'eventBus'],
  settings: {
    parseFailingTests: true,
    parseCoverageIssues: true,
    parseLegacyTests: true,
    parseComplexTests: true,
    timeout: 60000
  },
  validation: {
    required: ['projectId', 'projectPath'],
    optional: ['options']
  }
};

// Create instance for execution
const stepInstance = new TestOutputParsingStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
};

// Also export the class for testing
module.exports.TestOutputParsingStep = TestOutputParsingStep; 