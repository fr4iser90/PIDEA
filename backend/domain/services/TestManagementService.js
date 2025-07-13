
/**
 * TestManagementService - Core service for test management operations
 * Handles test metadata management, legacy detection, versioning, and analytics
 */
const TestMetadata = require('@entities/TestMetadata');
const TestMetadataRepository = require('@repositories/TestMetadataRepository');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

const execAsync = promisify(exec);

class TestManagementService {
  constructor(testMetadataRepository = new TestMetadataRepository()) {
    this.testMetadataRepository = testMetadataRepository;
    this.legacyDetectionRules = [
      { pattern: /describe\(['"`].*legacy.*['"`]/i, score: 30 },
      { pattern: /test\(['"`].*old.*['"`]/i, score: 25 },
      { pattern: /it\(['"`].*deprecated.*['"`]/i, score: 40 },
      { pattern: /TODO.*legacy/i, score: 20 },
      { pattern: /FIXME.*legacy/i, score: 20 },
      { pattern: /@deprecated/i, score: 50 },
      { pattern: /console\.log\(/g, score: 5 },
      { pattern: /console\.warn\(/g, score: 5 },
      { pattern: /console\.error\(/g, score: 5 },
      { pattern: /setTimeout\(/g, score: 10 },
      { pattern: /setInterval\(/g, score: 10 },
      { pattern: /eval\(/g, score: 50 },
      { pattern: /new Function\(/g, score: 40 }
    ];
  }

  /**
   * Register a test file with metadata
   * @param {string} filePath - Path to the test file
   * @param {string} testName - Name of the test
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<TestMetadata>} - The created test metadata
   */
  async registerTest(filePath, testName, metadata = {}) {
    try {
      const fileName = path.basename(filePath);
      
      // Check if test already exists
      const existingTest = await this.testMetadataRepository.findByFilePathAndTestName(filePath, testName);
      if (existingTest) {
        return existingTest;
      }
      
      // Create new test metadata
      const testMetadata = TestMetadata.create(filePath, fileName, testName, metadata);
      
      // Analyze legacy indicators immediately
      await this.analyzeLegacyIndicators(testMetadata);
      
      // Save to repository
      await this.testMetadataRepository.save(testMetadata);
      
      return testMetadata;
    } catch (error) {
      throw new Error(`Failed to register test: ${error.message}`);
    }
  }

  /**
   * Update test status after execution
   * @param {string} filePath - Path to the test file
   * @param {string} testName - Name of the test
   * @param {string} status - Test status (passing, failing, skipped)
   * @param {number} duration - Test execution duration in milliseconds
   * @param {string} error - Error message if test failed
   * @returns {Promise<TestMetadata>} - The updated test metadata
   */
  async updateTestStatus(filePath, testName, status, duration = 0, error = null) {
    try {
      let testMetadata = await this.testMetadataRepository.findByFilePathAndTestName(filePath, testName);
      
      if (!testMetadata) {
        // Create new test metadata if it doesn't exist
        testMetadata = await this.registerTest(filePath, testName);
      }
      
      // Update status based on result
      switch (status.toLowerCase()) {
        case 'passing':
        case 'passed':
          testMetadata.markAsPassing(duration);
          break;
        case 'failing':
        case 'failed':
          testMetadata.markAsFailing(duration, error);
          break;
        case 'skipped':
          testMetadata.markAsSkipped();
          break;
        case 'pending':
          testMetadata.markAsPending();
          break;
        default:
          throw new Error(`Invalid test status: ${status}`);
      }
      
      return await this.testMetadataRepository.save(testMetadata);
    } catch (error) {
      throw new Error(`Failed to update test status: ${error.message}`);
    }
  }

  /**
   * Analyze test file for legacy indicators
   * @param {TestMetadata} testMetadata - The test metadata to analyze
   * @returns {Promise<void>}
   */
  async analyzeLegacyIndicators(testMetadata) {
    try {
      logger.debug(`🔍 Analyzing legacy indicators for: ${testMetadata.filePath}`);
      const content = await fs.readFile(testMetadata.filePath, 'utf8');
      let legacyScore = 0;
      let complexityScore = 0;
      let maintenanceScore = 0;
      
      // Check for legacy patterns
      this.legacyDetectionRules.forEach(rule => {
        const matches = content.match(rule.pattern);
        if (matches) {
          legacyScore += rule.score * matches.length;
        }
      });
      
      // Calculate complexity score based on file metrics
      const lines = content.split('\n').length;
      const functions = (content.match(/function\s+\w+|=>\s*{/g) || []).length;
      const imports = (content.match(/require\(|import\s+/g) || []).length;
      
      complexityScore = Math.min(100, (lines * 0.5) + (functions * 5) + (imports * 3));
      
      // Calculate maintenance score
      const hasComments = content.includes('//') || content.includes('/*');
      const hasDocumentation = content.includes('/**') || content.includes('@param') || content.includes('@return');
      const hasErrorHandling = content.includes('try') && content.includes('catch');
      const hasLogging = content.includes('logger.log') || content.includes('logger.warn') || content.includes('console.error');
      
      maintenanceScore = 100;
      if (!hasComments) maintenanceScore -= 20;
      if (!hasDocumentation) maintenanceScore -= 30;
      if (!hasErrorHandling) maintenanceScore -= 25;
      if (hasLogging) maintenanceScore -= 15;
      
      logger.log(`📊 Scores calculated - Legacy: ${legacyScore}, Complexity: ${complexityScore}, Maintenance: ${maintenanceScore}`);
      
      // Update test metadata with scores
      testMetadata.setComplexityScore(complexityScore);
      testMetadata.setMaintenanceScore(maintenanceScore);
      
      if (legacyScore > 50) {
        testMetadata.markAsLegacy(legacyScore);
      }
      
      // Add tags based on analysis
      if (legacyScore > 30) testMetadata.addTag('legacy');
      if (complexityScore > 70) testMetadata.addTag('complex');
      if (maintenanceScore < 50) testMetadata.addTag('needs-maintenance');
      if (hasErrorHandling) testMetadata.addTag('error-handled');
      if (hasDocumentation) testMetadata.addTag('documented');
      
      logger.debug(`✅ Analysis complete for: ${testMetadata.filePath}`);
    } catch (error) {
      logger.warn(`Failed to analyze legacy indicators for ${testMetadata.filePath}: ${error.message}`);
    }
  }

  /**
   * Scan directory for test files and register them
   * @param {string} directory - Directory to scan
   * @param {string} pattern - File pattern to match
   * @returns {Promise<TestMetadata[]>} - Array of registered test metadata
   */
  async scanAndRegisterTests(directory, pattern = '**/*.test.js') {
    try {
      const { stdout } = await execAsync(`find ${directory} -name "*.test.js" -o -name "*.spec.js"`);
      const testFiles = stdout.trim().split('\n').filter(file => file.length > 0);
      
      const registeredTests = [];
      
      for (const filePath of testFiles) {
        try {
          const content = await fs.readFile(filePath, 'utf8');
          const testNames = this.extractTestNames(content);
          
          for (const testName of testNames) {
            const testMetadata = await this.registerTest(filePath, testName);
            registeredTests.push(testMetadata);
          }
        } catch (error) {
          logger.warn(`Failed to process test file ${filePath}: ${error.message}`);
        }
      }
      
      return registeredTests;
    } catch (error) {
      throw new Error(`Failed to scan and register tests: ${error.message}`);
    }
  }

  /**
   * Extract test names from test file content
   * @param {string} content - Test file content
   * @returns {string[]} - Array of test names
   */
  extractTestNames(content) {
    const testNames = [];
    
    // Extract describe blocks
    const describeMatches = content.match(/describe\(['"`]([^'"`]+)['"`]/g);
    if (describeMatches) {
      describeMatches.forEach(match => {
        const name = match.match(/describe\(['"`]([^'"`]+)['"`]/)[1];
        testNames.push(name);
      });
    }
    
    // Extract test/it blocks
    const testMatches = content.match(/(?:test|it)\(['"`]([^'"`]+)['"`]/g);
    if (testMatches) {
      testMatches.forEach(match => {
        const name = match.match(/(?:test|it)\(['"`]([^'"`]+)['"`]/)[1];
        testNames.push(name);
      });
    }
    
    // If no specific test names found, use file name
    if (testNames.length === 0) {
      testNames.push('default');
    }
    
    return testNames;
  }

  /**
   * Get test statistics and analytics
   * @returns {Promise<Object>} - Statistics object
   */
  async getTestStatistics() {
    try {
      const stats = await this.testMetadataRepository.getStatistics();
      const legacyTests = await this.testMetadataRepository.findLegacyTests();
      const maintenanceTests = await this.testMetadataRepository.findNeedingMaintenance();
      
      return {
        ...stats,
        legacyCount: legacyTests.length,
        maintenanceCount: maintenanceTests.length,
        healthDistribution: await this.getHealthDistribution(),
        complexityDistribution: await this.getComplexityDistribution(),
        recommendations: await this.generateRecommendations()
      };
    } catch (error) {
      throw new Error(`Failed to get test statistics: ${error.message}`);
    }
  }

  /**
   * Get health score distribution
   * @returns {Promise<Object>} - Health distribution
   */
  async getHealthDistribution() {
    const allTests = await this.testMetadataRepository.findAll();
    const distribution = {
      excellent: 0, // 90-100
      good: 0,      // 70-89
      fair: 0,      // 50-69
      poor: 0,      // 30-49
      critical: 0   // 0-29
    };
    
    allTests.forEach(test => {
      const healthScore = test.getHealthScore();
      if (healthScore >= 90) distribution.excellent++;
      else if (healthScore >= 70) distribution.good++;
      else if (healthScore >= 50) distribution.fair++;
      else if (healthScore >= 30) distribution.poor++;
      else distribution.critical++;
    });
    
    return distribution;
  }

  /**
   * Get complexity distribution
   * @returns {Promise<Object>} - Complexity distribution
   */
  async getComplexityDistribution() {
    const low = await this.testMetadataRepository.findByComplexity('low');
    const medium = await this.testMetadataRepository.findByComplexity('medium');
    const high = await this.testMetadataRepository.findByComplexity('high');
    
    return {
      low: low.length,
      medium: medium.length,
      high: high.length
    };
  }

  /**
   * Generate recommendations based on test analysis
   * @returns {Promise<Object[]>} - Array of recommendations
   */
  async generateRecommendations() {
    const recommendations = [];
    const allTests = await this.testMetadataRepository.findAll();
    
    // Legacy test recommendations
    const legacyTests = allTests.filter(test => test.isLegacy);
    if (legacyTests.length > 0) {
      recommendations.push({
        type: 'legacy',
        priority: 'high',
        message: `${legacyTests.length} legacy tests detected. Consider refactoring or removing these tests.`,
        affectedTests: legacyTests.map(test => test.filePath)
      });
    }
    
    // Maintenance recommendations
    const maintenanceTests = allTests.filter(test => test.needsMaintenance());
    if (maintenanceTests.length > 0) {
      recommendations.push({
        type: 'maintenance',
        priority: 'medium',
        message: `${maintenanceTests.length} tests need maintenance. Add documentation and error handling.`,
        affectedTests: maintenanceTests.map(test => test.filePath)
      });
    }
    
    // Failing test recommendations
    const failingTests = allTests.filter(test => test.isFailing());
    if (failingTests.length > 0) {
      recommendations.push({
        type: 'failing',
        priority: 'critical',
        message: `${failingTests.length} tests are currently failing. Fix these tests immediately.`,
        affectedTests: failingTests.map(test => test.filePath)
      });
    }
    
    // High complexity recommendations
    const complexTests = allTests.filter(test => test.isHighComplexity());
    if (complexTests.length > 0) {
      recommendations.push({
        type: 'complexity',
        priority: 'medium',
        message: `${complexTests.length} tests have high complexity. Consider breaking them into smaller tests.`,
        affectedTests: complexTests.map(test => test.filePath)
      });
    }
    
    return recommendations;
  }

  /**
   * Generate comprehensive health report
   * @returns {Promise<Object>} - Health report with statistics and recommendations
   */
  async generateHealthReport() {
    try {
      const statistics = await this.getTestStatistics();
      const healthDistribution = await this.getHealthDistribution();
      const complexityDistribution = await this.getComplexityDistribution();
      const recommendations = await this.generateRecommendations();
      
      const allTests = await this.testMetadataRepository.findAll();
      const legacyTests = allTests.filter(test => test.isLegacy);
      const failingTests = allTests.filter(test => test.isFailing());
      const maintenanceTests = allTests.filter(test => test.needsMaintenance());
      const complexTests = allTests.filter(test => test.isHighComplexity());
      
      const healthReport = {
        generatedAt: new Date().toISOString(),
        summary: {
          totalTests: statistics.total,
          overallHealthScore: statistics.averageHealthScore,
          criticalIssues: failingTests.length,
          warnings: legacyTests.length + maintenanceTests.length + complexTests.length
        },
        statistics,
        healthDistribution,
        complexityDistribution,
        criticalTests: failingTests.map(test => ({
          filePath: test.filePath,
          testName: test.testName,
          status: test.status,
          healthScore: test.getHealthScore(),
          lastError: test.getMetadata('lastError')
        })),
        legacyTests: legacyTests.map(test => ({
          filePath: test.filePath,
          testName: test.testName,
          legacyScore: test.legacyScore,
          healthScore: test.getHealthScore()
        })),
        maintenanceNeeded: maintenanceTests.map(test => ({
          filePath: test.filePath,
          testName: test.testName,
          maintenanceScore: test.maintenanceScore,
          healthScore: test.getHealthScore()
        })),
        recommendations,
        trends: {
          recentFailures: allTests.filter(test => 
            test.isFailing() && test.lastRunAt && 
            (new Date() - test.lastRunAt) < (7 * 24 * 60 * 60 * 1000)
          ).length,
          stableTests: allTests.filter(test => test.isStable()).length,
          unstableTests: allTests.filter(test => !test.isStable() && test.hasBeenRun()).length
        }
      };
      
      return healthReport;
    } catch (error) {
      throw new Error(`Failed to generate health report: ${error.message}`);
    }
  }

  /**
   * Version a test file
   * @param {string} filePath - Path to the test file
   * @param {string} version - New version
   * @returns {Promise<TestMetadata>} - Updated test metadata
   */
  async versionTest(filePath, version) {
    try {
      const testMetadata = await this.testMetadataRepository.findByFilePath(filePath);
      if (!testMetadata) {
        throw new Error(`Test metadata not found for file: ${filePath}`);
      }
      
      testMetadata.updateVersion(version);
      return await this.testMetadataRepository.save(testMetadata);
    } catch (error) {
      throw new Error(`Failed to version test: ${error.message}`);
    }
  }

  /**
   * Get test metadata by various filters
   * @param {Object} filters - Filter options
   * @returns {Promise<TestMetadata[]>} - Filtered test metadata
   */
  async getTestsByFilters(filters = {}) {
    try {
      let tests = await this.testMetadataRepository.findAll();
      
      if (filters.status) {
        tests = tests.filter(test => test.status === filters.status);
      }
      
      if (filters.isLegacy !== undefined) {
        tests = tests.filter(test => test.isLegacy === filters.isLegacy);
      }
      
      if (filters.tag) {
        tests = tests.filter(test => test.hasTag(filters.tag));
      }
      
      if (filters.minHealthScore !== undefined) {
        tests = tests.filter(test => test.getHealthScore() >= filters.minHealthScore);
      }
      
      if (filters.maxHealthScore !== undefined) {
        tests = tests.filter(test => test.getHealthScore() <= filters.maxHealthScore);
      }
      
      if (filters.complexity) {
        tests = tests.filter(test => {
          const score = test.complexityScore;
          switch (filters.complexity) {
            case 'low': return score < 30;
            case 'medium': return score >= 30 && score < 70;
            case 'high': return score >= 70;
            default: return true;
          }
        });
      }
      
      return tests;
    } catch (error) {
      throw new Error(`Failed to get tests by filters: ${error.message}`);
    }
  }

  /**
   * Export test metadata to JSON
   * @param {string} filePath - Output file path
   * @returns {Promise<void>}
   */
  async exportTestMetadata(filePath) {
    try {
      const allTests = await this.testMetadataRepository.findAll();
      const exportData = {
        exportedAt: new Date().toISOString(),
        totalTests: allTests.length,
        tests: allTests.map(test => test.toJSON())
      };
      
      await fs.writeFile(filePath, JSON.stringify(exportData, null, 2));
    } catch (error) {
      throw new Error(`Failed to export test metadata: ${error.message}`);
    }
  }

  /**
   * Import test metadata from JSON
   * @param {string} filePath - Input file path
   * @returns {Promise<number>} - Number of imported tests
   */
  async importTestMetadata(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const importData = JSON.parse(content);
      
      let importedCount = 0;
      
      for (const testData of importData.tests) {
        try {
          const testMetadata = TestMetadata.fromJSON(testData);
          await this.testMetadataRepository.save(testMetadata);
          importedCount++;
        } catch (error) {
          logger.warn(`Failed to import test metadata: ${error.message}`);
        }
      }
      
      return importedCount;
    } catch (error) {
      throw new Error(`Failed to import test metadata: ${error.message}`);
    }
  }
}

module.exports = TestManagementService; 