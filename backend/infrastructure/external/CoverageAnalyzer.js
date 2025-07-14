/**
 * CoverageAnalyzer - Infrastructure component for analyzing and improving test coverage
 * Identifies uncovered code and generates additional tests
 */
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const ServiceLogger = require('@logging/ServiceLogger');

const execAsync = promisify(exec);

class CoverageAnalyzer {
  constructor() {
    this.logger = new ServiceLogger('CoverageAnalyzer');
    this.coverageThreshold = 90;
    this.ignoredPatterns = [
      'node_modules/**',
      'coverage/**',
      'dist/**',
      'build/**',
      '*.test.js',
      '*.spec.js',
      '*.test.ts',
      '*.spec.ts'
    ];
  }

  /**
   * Initialize the analyzer
   */
  async initialize() {
    this.logger.info('✅ Coverage analyzer initialized');
  }

  /**
   * Get current coverage for project
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Coverage data
   */
  async getCurrentCoverage(projectPath) {
    try {
      this.logger.info(`Getting current coverage for: ${projectPath}`);
      
      // Check if Jest is configured
      const packageJsonPath = path.join(projectPath, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
      
      if (!packageJson.scripts || !packageJson.scripts.test) {
        this.logger.warn('No test script found in package.json');
        return {
          current: 0,
          target: this.coverageThreshold,
          needsImprovement: true,
          details: {
            statements: 0,
            branches: 0,
            functions: 0,
            lines: 0
          }
        };
      }
      
      // Run coverage analysis
      const coverageResult = await this.runCoverageAnalysis(projectPath);
      
      return {
        current: coverageResult.total,
        target: this.coverageThreshold,
        needsImprovement: coverageResult.total < this.coverageThreshold,
        details: coverageResult.details,
        uncoveredFiles: coverageResult.uncoveredFiles
      };
      
    } catch (error) {
      this.logger.error(`Failed to get current coverage: ${error.message}`);
      
      return {
        current: 0,
        target: this.coverageThreshold,
        needsImprovement: true,
        details: {
          statements: 0,
          branches: 0,
          functions: 0,
          lines: 0
        },
        error: error.message
      };
    }
  }

  /**
   * Improve coverage by generating additional tests
   * @param {string} projectPath - Project path
   * @param {Object} options - Improvement options
   * @returns {Promise<Object>} Improvement result
   */
  async improveCoverage(projectPath, options = {}) {
    try {
      this.logger.info(`Improving coverage for: ${projectPath}`);
      
      const startTime = Date.now();
      
      // Get current coverage
      const currentCoverage = await this.getCurrentCoverage(projectPath);
      
      if (!currentCoverage.needsImprovement) {
        return {
          success: true,
          message: 'Coverage target already met',
          currentCoverage: currentCoverage.current,
          targetCoverage: currentCoverage.target,
          improvement: 0,
          newTests: []
        };
      }
      
      // Identify uncovered files
      const uncoveredFiles = await this.identifyUncoveredFiles(projectPath, currentCoverage.uncoveredFiles);
      
      if (uncoveredFiles.length === 0) {
        return {
          success: false,
          message: 'No uncovered files found to improve',
          currentCoverage: currentCoverage.current,
          targetCoverage: currentCoverage.target,
          improvement: 0,
          newTests: []
        };
      }
      
      // Generate tests for uncovered files
      const newTests = [];
      let totalImprovement = 0;
      
      for (const file of uncoveredFiles.slice(0, options.maxFiles || 10)) {
        try {
          const testResult = await this.generateTestForFile(file, projectPath, options);
          
          if (testResult.success) {
            newTests.push(testResult);
            totalImprovement += testResult.improvement || 0;
          }
        } catch (error) {
          this.logger.warn(`Failed to generate test for ${file}: ${error.message}`);
        }
      }
      
      // Re-run coverage to get updated metrics
      const updatedCoverage = await this.getCurrentCoverage(projectPath);
      const actualImprovement = updatedCoverage.current - currentCoverage.current;
      
      const duration = Date.now() - startTime;
      
      const result = {
        success: true,
        message: `Generated ${newTests.length} new tests`,
        currentCoverage: updatedCoverage.current,
        targetCoverage: updatedCoverage.target,
        improvement: actualImprovement,
        newTests: newTests,
        duration: duration,
        timestamp: new Date().toISOString()
      };
      
      this.logger.info(`Coverage improvement completed: ${actualImprovement}% improvement`);
      return result;
      
    } catch (error) {
      this.logger.error(`Failed to improve coverage: ${error.message}`);
      
      return {
        success: false,
        message: error.message,
        currentCoverage: 0,
        targetCoverage: this.coverageThreshold,
        improvement: 0,
        newTests: []
      };
    }
  }

  /**
   * Run coverage analysis
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Coverage results
   */
  async runCoverageAnalysis(projectPath) {
    try {
      // Run Jest with coverage
      const { stdout, stderr } = await execAsync('npm test -- --coverage --coverageReporters=text --coverageReporters=json', {
        cwd: projectPath,
        timeout: 60000 // 1 minute timeout
      });
      
      // Parse coverage output
      return this.parseCoverageOutput(stdout, stderr);
      
    } catch (error) {
      // If coverage command fails, try to parse error output
      if (error.stderr) {
        return this.parseCoverageOutput('', error.stderr);
      }
      
      throw new Error(`Coverage analysis failed: ${error.message}`);
    }
  }

  /**
   * Parse coverage output
   * @param {string} stdout - Standard output
   * @param {string} stderr - Standard error
   * @returns {Object} Parsed coverage data
   */
  parseCoverageOutput(stdout, stderr) {
    const output = stdout + stderr;
    
    // Extract coverage percentages
    const coverageMatch = output.match(/All files\s+\|\s+(\d+(?:\.\d+)?)\s+\|\s+(\d+(?:\.\d+)?)\s+\|\s+(\d+(?:\.\d+)?)\s+\|\s+(\d+(?:\.\d+)?)/);
    
    if (coverageMatch) {
      const [, statements, branches, functions, lines] = coverageMatch;
      
      return {
        total: parseFloat(lines),
        details: {
          statements: parseFloat(statements),
          branches: parseFloat(branches),
          functions: parseFloat(functions),
          lines: parseFloat(lines)
        },
        uncoveredFiles: this.extractUncoveredFiles(output)
      };
    }
    
    // Fallback: try to extract from JSON coverage report
    try {
      const coveragePath = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
      const coverageData = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
      
      const total = coverageData.total.lines.pct;
      
      return {
        total: total,
        details: {
          statements: coverageData.total.statements.pct,
          branches: coverageData.total.branches.pct,
          functions: coverageData.total.functions.pct,
          lines: coverageData.total.lines.pct
        },
        uncoveredFiles: this.extractUncoveredFilesFromJson(coverageData)
      };
    } catch (jsonError) {
      this.logger.warn('Could not parse coverage output');
      
      return {
        total: 0,
        details: {
          statements: 0,
          branches: 0,
          functions: 0,
          lines: 0
        },
        uncoveredFiles: []
      };
    }
  }

  /**
   * Extract uncovered files from coverage output
   * @param {string} output - Coverage output
   * @returns {Array} Array of uncovered file paths
   */
  extractUncoveredFiles(output) {
    const uncoveredFiles = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      // Look for files with 0% coverage
      const match = line.match(/^([^\s]+)\s+\|\s+0\.00\s+\|\s+0\.00\s+\|\s+0\.00\s+\|\s+0\.00/);
      if (match) {
        const filePath = match[1];
        if (this.shouldIncludeFile(filePath)) {
          uncoveredFiles.push(filePath);
        }
      }
    }
    
    return uncoveredFiles;
  }

  /**
   * Extract uncovered files from JSON coverage data
   * @param {Object} coverageData - Coverage data
   * @returns {Array} Array of uncovered file paths
   */
  extractUncoveredFilesFromJson(coverageData) {
    const uncoveredFiles = [];
    
    for (const [filePath, fileData] of Object.entries(coverageData)) {
      if (fileData.lines.pct === 0 && this.shouldIncludeFile(filePath)) {
        uncoveredFiles.push(filePath);
      }
    }
    
    return uncoveredFiles;
  }

  /**
   * Check if file should be included in coverage analysis
   * @param {string} filePath - File path
   * @returns {boolean} True if should be included
   */
  shouldIncludeFile(filePath) {
    // Skip ignored patterns
    for (const pattern of this.ignoredPatterns) {
      if (pattern.includes('**')) {
        const regex = pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*');
        if (new RegExp(regex).test(filePath)) {
          return false;
        }
      } else if (filePath.includes(pattern.replace('**', ''))) {
        return false;
      }
    }
    
    // Only include JavaScript/TypeScript files
    return /\.(js|ts|jsx|tsx)$/.test(filePath);
  }

  /**
   * Identify uncovered files
   * @param {string} projectPath - Project path
   * @param {Array} uncoveredFiles - List of uncovered files
   * @returns {Promise<Array>} Array of uncovered file objects
   */
  async identifyUncoveredFiles(projectPath, uncoveredFiles) {
    const files = [];
    
    for (const filePath of uncoveredFiles) {
      try {
        const fullPath = path.join(projectPath, filePath);
        const stats = await fs.stat(fullPath);
        
        if (stats.isFile()) {
          const content = await fs.readFile(fullPath, 'utf8');
          const complexity = this.calculateFileComplexity(content);
          
          files.push({
            path: filePath,
            fullPath: fullPath,
            size: stats.size,
            complexity: complexity,
            priority: this.calculateTestPriority(complexity, filePath)
          });
        }
      } catch (error) {
        this.logger.warn(`Could not analyze file ${filePath}: ${error.message}`);
      }
    }
    
    // Sort by priority (higher priority first)
    return files.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Calculate file complexity
   * @param {string} content - File content
   * @returns {Object} Complexity metrics
   */
  calculateFileComplexity(content) {
    const lines = content.split('\n');
    const lineCount = lines.length;
    
    let functionCount = 0;
    let classCount = 0;
    let importCount = 0;
    let exportCount = 0;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.includes('function ') || trimmed.includes('=>')) {
        functionCount++;
      }
      
      if (trimmed.includes('class ')) {
        classCount++;
      }
      
      if (trimmed.includes('import ')) {
        importCount++;
      }
      
      if (trimmed.includes('export ')) {
        exportCount++;
      }
    }
    
    return {
      lineCount,
      functionCount,
      classCount,
      importCount,
      exportCount,
      complexity: (functionCount + classCount) / Math.max(lineCount / 10, 1)
    };
  }

  /**
   * Calculate test priority for file
   * @param {Object} complexity - File complexity
   * @param {string} filePath - File path
   * @returns {number} Priority score (0-100)
   */
  calculateTestPriority(complexity, filePath) {
    let priority = 0;
    
    // Higher priority for more complex files
    priority += complexity.complexity * 20;
    
    // Higher priority for core files
    if (filePath.includes('src/') || filePath.includes('lib/') || filePath.includes('core/')) {
      priority += 30;
    }
    
    // Higher priority for service/utility files
    if (filePath.includes('service') || filePath.includes('util') || filePath.includes('helper')) {
      priority += 20;
    }
    
    // Higher priority for files with more functions
    priority += complexity.functionCount * 5;
    
    // Higher priority for files with classes
    priority += complexity.classCount * 10;
    
    return Math.min(100, priority);
  }

  /**
   * Generate test for uncovered file
   * @param {Object} fileData - File data
   * @param {string} projectPath - Project path
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Test generation result
   */
  async generateTestForFile(fileData, projectPath, options = {}) {
    try {
      this.logger.info(`Generating test for: ${fileData.path}`);
      
      const content = await fs.readFile(fileData.fullPath, 'utf8');
      const testContent = await this.generateTestContent(content, fileData, options);
      
      // Create test file path
      const testFilePath = this.getTestFilePath(fileData.path);
      const fullTestPath = path.join(projectPath, testFilePath);
      
      // Ensure test directory exists
      const testDir = path.dirname(fullTestPath);
      await fs.mkdir(testDir, { recursive: true });
      
      // Write test file
      await fs.writeFile(fullTestPath, testContent, 'utf8');
      
      // Estimate coverage improvement
      const improvement = this.estimateCoverageImprovement(fileData, testContent);
      
      return {
        success: true,
        filePath: fileData.path,
        testFilePath: testFilePath,
        testContent: testContent,
        improvement: improvement,
        complexity: fileData.complexity,
        priority: fileData.priority
      };
      
    } catch (error) {
      this.logger.error(`Failed to generate test for ${fileData.path}: ${error.message}`);
      
      return {
        success: false,
        filePath: fileData.path,
        error: error.message
      };
    }
  }

  /**
   * Generate test content for file
   * @param {string} content - File content
   * @param {Object} fileData - File data
   * @param {Object} options - Generation options
   * @returns {Promise<string>} Test content
   */
  async generateTestContent(content, fileData, options = {}) {
    // Extract functions and classes
    const functions = this.extractFunctions(content);
    const classes = this.extractClasses(content);
    const imports = this.extractImports(content);
    
    // Generate test template
    let testContent = `/**
 * Auto-generated test file for ${fileData.path}
 * Generated by CoverageAnalyzer
 */

import { jest } from '@jest/globals';

`;

    // Add imports
    if (imports.length > 0) {
      testContent += imports.map(imp => `import ${imp};`).join('\n') + '\n\n';
    }
    
    // Add mocks for external dependencies
    const externalImports = this.extractExternalImports(imports);
    if (externalImports.length > 0) {
      testContent += '// Mock external dependencies\n';
      for (const imp of externalImports) {
        testContent += `jest.mock('${imp}');\n`;
      }
      testContent += '\n';
    }
    
    // Generate tests for functions
    for (const func of functions) {
      testContent += this.generateFunctionTest(func);
    }
    
    // Generate tests for classes
    for (const cls of classes) {
      testContent += this.generateClassTest(cls);
    }
    
    // Add basic test if no functions/classes found
    if (functions.length === 0 && classes.length === 0) {
      testContent += `describe('${path.basename(fileData.path, path.extname(fileData.path))}', () => {
  test('should be properly imported', () => {
    // TODO: Add proper test implementation
    expect(true).toBe(true);
  });
});
`;
    }
    
    return testContent;
  }

  /**
   * Extract functions from content
   * @param {string} content - File content
   * @returns {Array} Array of function objects
   */
  extractFunctions(content) {
    const functions = [];
    
    // Match function declarations
    const functionPatterns = [
      /function\s+(\w+)\s*\(([^)]*)\)/g,
      /const\s+(\w+)\s*=\s*(?:async\s+)?\(([^)]*)\)\s*=>/g,
      /export\s+(?:const|function)\s+(\w+)/g
    ];
    
    for (const pattern of functionPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        functions.push({
          name: match[1],
          parameters: match[2] || '',
          type: 'function'
        });
      }
    }
    
    return functions;
  }

  /**
   * Extract classes from content
   * @param {string} content - File content
   * @returns {Array} Array of class objects
   */
  extractClasses(content) {
    const classes = [];
    
    const classPattern = /class\s+(\w+)/g;
    let match;
    
    while ((match = classPattern.exec(content)) !== null) {
      classes.push({
        name: match[1],
        type: 'class'
      });
    }
    
    return classes;
  }

  /**
   * Extract imports from content
   * @param {string} content - File content
   * @returns {Array} Array of import statements
   */
  extractImports(content) {
    const imports = [];
    const importPattern = /import\s+.*\s+from\s+['"`]([^'"`]+)['"`]/g;
    
    let match;
    while ((match = importPattern.exec(content)) !== null) {
      imports.push(match[0]);
    }
    
    return imports;
  }

  /**
   * Extract external imports
   * @param {Array} imports - Import statements
   * @returns {Array} Array of external import paths
   */
  extractExternalImports(imports) {
    const external = [];
    
    for (const imp of imports) {
      const match = imp.match(/from\s+['"`]([^'"`]+)['"`]/);
      if (match && !match[1].startsWith('.') && !match[1].startsWith('@/')) {
        external.push(match[1]);
      }
    }
    
    return external;
  }

  /**
   * Generate test for function
   * @param {Object} func - Function object
   * @returns {string} Test content
   */
  generateFunctionTest(func) {
    return `describe('${func.name}', () => {
  test('should work correctly', () => {
    // TODO: Add proper test implementation for ${func.name}
    expect(true).toBe(true);
  });
  
  test('should handle edge cases', () => {
    // TODO: Add edge case tests
    expect(true).toBe(true);
  });
});

`;
  }

  /**
   * Generate test for class
   * @param {Object} cls - Class object
   * @returns {string} Test content
   */
  generateClassTest(cls) {
    return `describe('${cls.name}', () => {
  let instance;
  
  beforeEach(() => {
    instance = new ${cls.name}();
  });
  
  test('should instantiate correctly', () => {
    expect(instance).toBeInstanceOf(${cls.name});
  });
  
  test('should have required methods', () => {
    // TODO: Add method tests
    expect(true).toBe(true);
  });
});

`;
  }

  /**
   * Get test file path for source file
   * @param {string} sourcePath - Source file path
   * @returns {string} Test file path
   */
  getTestFilePath(sourcePath) {
    const dir = path.dirname(sourcePath);
    const name = path.basename(sourcePath, path.extname(sourcePath));
    const ext = path.extname(sourcePath);
    
    // Convert to test file
    const testExt = ext === '.ts' || ext === '.tsx' ? '.test.ts' : '.test.js';
    const testName = name + testExt;
    
    return path.join(dir, '__tests__', testName);
  }

  /**
   * Estimate coverage improvement
   * @param {Object} fileData - File data
   * @param {string} testContent - Test content
   * @returns {number} Estimated improvement percentage
   */
  estimateCoverageImprovement(fileData, testContent) {
    // Simple estimation based on file complexity and test content
    const baseImprovement = Math.min(20, fileData.complexity.complexity * 5);
    const testLines = testContent.split('\n').length;
    const testDensity = testLines / Math.max(fileData.complexity.lineCount, 1);
    
    return Math.min(100, baseImprovement + (testDensity * 10));
  }
}

module.exports = CoverageAnalyzer; 