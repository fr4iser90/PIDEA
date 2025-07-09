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
        legacyTests: [],
        complexTests: [],
        summary: {},
        timestamp: new Date()
      };

      // Parse test-report.md
      const testReportPath = path.join(projectPath, 'test-report.md');
      if (fs.existsSync(testReportPath)) {
        const testReportData = await this.parseTestReport(testReportPath);
        results.failingTests = testReportData.failingTests;
        results.legacyTests = testReportData.legacyTests;
        results.complexTests = testReportData.complexTests;
        results.summary.testReport = testReportData.summary;
      }

      // Parse coverage.md
      const coveragePath = path.join(projectPath, 'coverage.md');
      if (fs.existsSync(coveragePath)) {
        const coverageData = await this.parseCoverageReport(coveragePath);
        results.coverageIssues = coverageData.coverageIssues;
        results.summary.coverage = coverageData.summary;
      }

      // Parse test-analysis-full.json
      const analysisPath = path.join(projectPath, 'test-analysis-full.json');
      if (fs.existsSync(analysisPath)) {
        const analysisData = await this.parseAnalysisJson(analysisPath);
        results.summary.analysis = analysisData.summary;
        // Merge with existing data
        results.failingTests = this.mergeTestData(results.failingTests, analysisData.failingTests);
        results.legacyTests = this.mergeTestData(results.legacyTests, analysisData.legacyTests);
      }

      this.logger.info(`[TestReportParser] Parsed ${results.failingTests.length} failing tests, ${results.coverageIssues.length} coverage issues`);
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
      legacyTests: [],
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
      if (line.includes('| Legacy |')) {
        const match = line.match(/\| Legacy \| (\d+) \|/);
        if (match) result.summary.legacyTests = parseInt(match[1]);
      }

      // Parse failing tests section
      if (line.includes('❌ Failing Tests')) {
        currentSection = 'failing';
        continue;
      }
      if (line.includes('🗑️ Legacy Tests')) {
        currentSection = 'legacy';
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
            case 'legacy':
              result.legacyTests.push(testData);
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
      legacyTests: data.legacyTests || [],
      maintenanceTests: data.maintenanceTests || [],
      complexTests: data.complexTests || []
    };
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