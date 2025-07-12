/**
 * TestReportParser - Parse test output files into structured data for task generation
 * Parses test-report.md, coverage.md, and test-analysis-full.json
 */
const fs = require('fs');
const path = require('path');
class TestReportParser {
  constructor() {
    this.logger = console;
  }
  /**
   * Parse all test output files and extract tasks
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Parsed data with tasks
   */
  async parseAllTestOutputs(projectPath = process.cwd()) {
    try {
      this.logger.info('[TestReportParser] Parsing all test output files...');
      const results = {
        failingTests: [],
        coverageIssues: [],
        Tests: [],
        complexTests: [],
        summary: {},
        timestamp: new Date()
      };
      // Parse test-report.md
      const testReportPath = path.join(projectPath, 'test-report.md');
      if (fs.existsSync(testReportPath)) {
        this.logger.info('[TestReportParser] Found test-report.md, parsing...');
        const testReportData = await this.parseTestReport(testReportPath);
        results.failingTests = testReportData.failingTests;
        results.Tests = testReportData.Tests;
        results.complexTests = testReportData.complexTests;
        results.summary.testReport = testReportData.summary;
      } else {
        this.logger.warn('[TestReportParser] test-report.md not found, skipping...');
      }
      // Parse test-report-full.md
      const testReportFullPath = path.join(projectPath, 'test-report-full.md');
      if (fs.existsSync(testReportFullPath)) {
        this.logger.info('[TestReportParser] Found test-report-full.md, parsing...');
        const testReportFullData = await this.parseTestReport(testReportFullPath);
        // Merge with existing data
        results.failingTests = this.mergeTestData(results.failingTests, testReportFullData.failingTests);
        results.Tests = this.mergeTestData(results.Tests, testReportFullData.Tests);
        results.complexTests = this.mergeTestData(results.complexTests, testReportFullData.complexTests);
      } else {
        this.logger.warn('[TestReportParser] test-report-full.md not found, skipping...');
      }
      // Parse coverage.md
      const coveragePath = path.join(projectPath, 'coverage.md');
      if (fs.existsSync(coveragePath)) {
        this.logger.info('[TestReportParser] Found coverage.md, parsing...');
        const coverageData = await this.parseCoverageReport(coveragePath);
        results.coverageIssues = coverageData.coverageIssues;
        results.summary.coverage = coverageData.summary;
      } else {
        this.logger.warn('[TestReportParser] coverage.md not found, skipping...');
      }
      // Parse test-analysis-full.json
      const analysisPath = path.join(projectPath, 'test-analysis-full.json');
      if (fs.existsSync(analysisPath)) {
        this.logger.info('[TestReportParser] Found test-analysis-full.json, parsing...');
        const analysisData = await this.parseAnalysisJson(analysisPath);
        results.summary.analysis = analysisData.summary;
        // Merge with existing data
        results.failingTests = this.mergeTestData(results.failingTests, analysisData.failingTests);
        results.Tests = this.mergeTestData(results.Tests, analysisData.Tests);
      } else {
        this.logger.warn('[TestReportParser] test-analysis-full.json not found, skipping...');
      }
      // Parse test-data.json (from test:export)
      const testDataPath = path.join(projectPath, 'test-data.json');
      if (fs.existsSync(testDataPath)) {
        this.logger.info('[TestReportParser] Found test-data.json, parsing...');
        const testData = await this.parseTestDataJson(testDataPath);
        // Merge with existing data
        results.failingTests = this.mergeTestData(results.failingTests, testData.failingTests);
        results.Tests = this.mergeTestData(results.Tests, testData.Tests);
        results.complexTests = this.mergeTestData(results.complexTests, testData.complexTests);
      } else {
        this.logger.warn('[TestReportParser] test-data.json not found, skipping...');
      }
      this.logger.info(`[TestReportParser] Parsed ${results.failingTests.length} failing tests, ${results.coverageIssues.length} coverage issues, ${results.Tests.length}  tests, ${results.complexTests.length} complex tests`);
      return results;
    } catch (error) {
      this.logger.error('[TestReportParser] Error parsing test outputs:', error.message);
      throw error;
    }
  }
  /**
   * Parse test-report.md file
   * @param {string} filePath - Path to test-report.md
   * @returns {Promise<Object>} Parsed test report data
   */
  async parseTestReport(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const result = {
      failingTests: [],
      Tests: [],
      complexTests: [],
      summary: {}
    };
    let currentSection = '';
    for (const line of lines) {
      // Parse summary section
      if (line.includes('| Total Tests |')) {
        const match = line.match(/\| Total Tests \| (\d+) \|/);
        if (match) result.summary.totalTests = parseInt(match[1]);
      }
      if (line.includes('| Failing |')) {
        const match = line.match(/\| Failing \| (\d+) \|/);
        if (match) result.summary.failingTests = parseInt(match[1]);
      }
      if (line.includes('|  |')) {
        if (match) result.summary.Tests = parseInt(match[1]);
      }
      // Parse failing tests section
      if (line.includes('❌ Failing Tests')) {
        currentSection = 'failing';
        continue;
      }
      if (line.includes('🗑️  Tests')) {
        currentSection = '';
        continue;
      }
      if (line.includes('🧩 Complex Tests')) {
        currentSection = 'complex';
        continue;
      }
      // Parse table rows
      if (line.includes('| `') && currentSection) {
        const testData = this.parseTestTableRow(line);
        if (testData) {
          switch (currentSection) {
            case 'failing':
              result.failingTests.push(testData);
              break;
            case '':
              result.Tests.push(testData);
              break;
            case 'complex':
              result.complexTests.push(testData);
              break;
          }
        }
      }
    }
    return result;
  }
  /**
   * Parse coverage.md file
   * @param {string} filePath - Path to coverage.md
   * @returns {Promise<Object>} Parsed coverage data
   */
  async parseCoverageReport(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const result = {
      coverageIssues: [],
      summary: {}
    };
    let inFileDetails = false;
    for (const line of lines) {
      // Parse summary
      if (line.includes('Overall Coverage:')) {
        const match = line.match(/Overall Coverage:\s*(\d+)%/);
        if (match) result.summary.overallCoverage = parseInt(match[1]);
      }
      if (line.includes('Files Analyzed:')) {
        const match = line.match(/Files Analyzed:\s*(\d+)/);
        if (match) result.summary.filesAnalyzed = parseInt(match[1]);
      }
      // Parse file details table
      if (line.includes('| File | Functions | Lines | Branches | Average | Status |')) {
        inFileDetails = true;
        continue;
      }
      if (line.includes('## 🎯 Coverage Improvement Tasks')) {
        inFileDetails = false;
        continue;
      }
      if (inFileDetails && line.includes('| `') && line.includes('❌')) {
        const coverageData = this.parseCoverageTableRow(line);
        if (coverageData) {
          result.coverageIssues.push(coverageData);
        }
      }
    }
    return result;
  }
  /**
   * Parse test-analysis-full.json file
   * @param {string} filePath - Path to test-analysis-full.json
   * @returns {Promise<Object>} Parsed analysis data
   */
  async parseAnalysisJson(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    return {
      summary: data.summary,
      failingTests: data.failingTests || [],
      Tests: data.Tests || [],
      maintenanceTests: data.maintenanceTests || [],
      complexTests: data.complexTests || []
    };
  }
  /**
   * Parse test-data.json file (from test:export)
   * @param {string} filePath - Path to test-data.json
   * @returns {Promise<Object>} Parsed test data
   */
  async parseTestDataJson(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    const result = {
      failingTests: [],
      Tests: [],
      complexTests: []
    };
    // Convert TestMetadata objects to test data format
    if (data.tests && Array.isArray(data.tests)) {
      for (const test of data.tests) {
        const testData = {
          fileName: test.fileName,
          testName: test.testName,
          error: test.getMetadata('lastError') || 'Unknown error',
          healthScore: test.getHealthScore(),
          Score: test.Score,
          complexityScore: test.complexityScore,
          source: 'test-data-export'
        };
        if (test.isFailing()) {
          result.failingTests.push(testData);
        } else if (test.is || test.Score > 70) {
          result.Tests.push(testData);
        } else if (test.isHighComplexity()) {
          result.complexTests.push(testData);
        }
      }
    }
    return result;
  }
  /**
   * Parse a test table row from markdown
   * @param {string} line - Table row line
   * @returns {Object|null} Parsed test data
   */
  parseTestTableRow(line) {
    // Match pattern: | `fileName` | `testName` | `error` | score% |
    const match = line.match(/\| `([^`]+)` \| `([^`]+)` \| `([^`]+)` \| (\d+)% \|/);
    if (match) {
      return {
        fileName: match[1],
        testName: match[2],
        error: match[3],
        healthScore: parseInt(match[4]),
        source: 'test-report'
      };
    }
    return null;
  }
  /**
   * Parse a coverage table row from markdown
   * @param {string} line - Table row line
   * @returns {Object|null} Parsed coverage data
   */
  parseCoverageTableRow(line) {
    // Match pattern: | `file` | func% | line% | branch% | avg% | ❌ |
    const match = line.match(/\| `([^`]+)` \| (\d+)% \| (\d+)% \| (\d+)% \| (\d+)% \| ❌ \|/);
    if (match) {
      return {
        file: match[1],
        functions: parseInt(match[2]),
        lines: parseInt(match[3]),
        branches: parseInt(match[4]),
        average: parseInt(match[5]),
        source: 'coverage-report'
      };
    }
    return null;
  }
  /**
   * Merge test data from different sources
   * @param {Array} existing - Existing test data
   * @param {Array} newData - New test data
   * @returns {Array} Merged data
   */
  mergeTestData(existing, newData) {
    const merged = [...existing];
    for (const newTest of newData) {
      const existingIndex = merged.findIndex(test => 
        test.fileName === newTest.fileName && test.testName === newTest.testName
      );
      if (existingIndex >= 0) {
        // Merge metadata
        merged[existingIndex] = { ...merged[existingIndex], ...newTest };
      } else {
        merged.push(newTest);
      }
    }
    return merged;
  }
}
module.exports = TestReportParser; 