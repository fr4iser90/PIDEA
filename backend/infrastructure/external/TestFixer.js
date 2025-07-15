/**
 * TestFixer - Infrastructure component for fixing failing tests
 * Applies AI-powered fixes to test files
 */
const fs = require('fs').promises;
const path = require('path');
const ServiceLogger = require('@logging/ServiceLogger');

class TestFixer {
  constructor() {
    this.logger = new ServiceLogger('TestFixer');
    this.fixStrategies = {
      timeout: this.fixTimeoutIssue.bind(this),
      async: this.fixAsyncIssue.bind(this),
      mock: this.fixMockIssue.bind(this),
      import: this.fixImportIssue.bind(this),
      syntax: this.fixSyntaxIssue.bind(this),
      type: this.fixTypeIssue.bind(this),
      undefined: this.fixUndefinedIssue.bind(this),
      null: this.fixNullIssue.bind(this),
      general: this.fixIssue.bind(this)
    };
  }

  /**
   * Initialize the fixer
   */
  async initialize() {
    this.logger.info('✅ Test fixer initialized');
  }

  /**
   * Fix a failing test
   * @param {Object} testData - Test data object
   * @param {Object} options - Fix options
   * @returns {Promise<Object>} Fix result
   */
  async fixTest(testData, options = {}) {
    try {
      this.logger.info(`Fixing test`);
      
      const startTime = Date.now();
      
      // Read test file
      const content = await fs.readFile(testData.filePath, 'utf8');
      
      // Determine fix strategy based on failure type
      const failureType = testData.metadata?.failureType || '';
      const fixStrategy = this.fixStrategies[failureType];
      
      if (!fixStrategy) {
        throw new Error(`Unknown failure type: ${failureType}`);
      }
      
      // Apply fix
      const fixedContent = await fixStrategy(content, testData, options);
      
      // Write fixed content back to file
      await fs.writeFile(testData.filePath, fixedContent, 'utf8');
      
      const duration = Date.now() - startTime;
      
      const result = {
        success: true,
        testId: testData.id,
        filePath: testData.filePath,
        failureType: failureType,
        originalContent: content,
        fixedContent: fixedContent,
        changes: this.diffContent(content, fixedContent),
        duration: duration,
        timestamp: new Date().toISOString()
      };
      
      this.logger.info(`Successfully fixed test in ${duration}ms`);
      return result;
      
    } catch (error) {
      this.logger.error(`Failed to fix test: ${error.message}`);
      
      return {
        success: false,
        testId: testData.id,
        filePath: testData.filePath,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Fix timeout issues
   * @param {string} content - Test file content
   * @param {Object} testData - Test data
   * @param {Object} options - Fix options
   * @returns {Promise<string>} Fixed content
   */
  async fixTimeoutIssue(content, testData, options) {
    let fixedContent = content;
    
    // Add timeout to test functions
    const timeoutPatterns = [
      /(it\s*\(\s*['"`][^'"`]+['"`]\s*,\s*)(async\s+)?function\s*\(/g,
      /(test\s*\(\s*['"`][^'"`]+['"`]\s*,\s*)(async\s+)?function\s*\(/g,
      /(describe\s*\(\s*['"`][^'"`]+['"`]\s*,\s*)(async\s+)?function\s*\(/g
    ];
    
    for (const pattern of timeoutPatterns) {
      fixedContent = fixedContent.replace(pattern, (match, prefix, asyncKeyword) => {
        const timeout = options.timeout || 10000;
        return `${prefix}${asyncKeyword || ''}function(done) {\n  jest.setTimeout(${timeout});\n  `;
      });
    }
    
    // Add timeout to arrow functions
    const arrowTimeoutPatterns = [
      /(it\s*\(\s*['"`][^'"`]+['"`]\s*,\s*)(async\s+)?\(/g,
      /(test\s*\(\s*['"`][^'"`]+['"`]\s*,\s*)(async\s+)?\(/g,
      /(describe\s*\(\s*['"`][^'"`]+['"`]\s*,\s*)(async\s+)?\(/g
    ];
    
    for (const pattern of arrowTimeoutPatterns) {
      fixedContent = fixedContent.replace(pattern, (match, prefix, asyncKeyword) => {
        const timeout = options.timeout || 10000;
        return `${prefix}${asyncKeyword || ''}() => {\n  jest.setTimeout(${timeout});\n  `;
      });
    }
    
    return fixedContent;
  }

  /**
   * Fix async issues
   * @param {string} content - Test file content
   * @param {Object} testData - Test data
   * @param {Object} options - Fix options
   * @returns {Promise<string>} Fixed content
   */
  async fixAsyncIssue(content, testData, options) {
    let fixedContent = content;
    
    // Add async/await to test functions
    const asyncPatterns = [
      /(it\s*\(\s*['"`][^'"`]+['"`]\s*,\s*)function\s*\(/g,
      /(test\s*\(\s*['"`][^'"`]+['"`]\s*,\s*)function\s*\(/g
    ];
    
    for (const pattern of asyncPatterns) {
      fixedContent = fixedContent.replace(pattern, '$1async function(');
    }
    
    // Add await to promise calls
    const promisePatterns = [
      /(\s+)(\w+\.\w+\([^)]*\)\.then\()/g,
      /(\s+)(\w+\.\w+\([^)]*\)\.catch\()/g
    ];
    
    for (const pattern of promisePatterns) {
      fixedContent = fixedContent.replace(pattern, '$1await $2');
    }
    
    return fixedContent;
  }

  /**
   * Fix mock issues
   * @param {string} content - Test file content
   * @param {Object} testData - Test data
   * @param {Object} options - Fix options
   * @returns {Promise<string>} Fixed content
   */
  async fixMockIssue(content, testData, options) {
    let fixedContent = content;
    
    // Add jest.mock() calls at the top
    const mockImports = this.extractMockImports(content);
    
    if (mockImports.length > 0) {
      const mockCalls = mockImports.map(importPath => 
        `jest.mock('${importPath}');`
      ).join('\n');
      
      // Insert mock calls after imports
      const importEndIndex = this.findImportEndIndex(content);
      if (importEndIndex > 0) {
        fixedContent = content.slice(0, importEndIndex) + 
                      '\n\n' + mockCalls + '\n' + 
                      content.slice(importEndIndex);
      } else {
        fixedContent = mockCalls + '\n\n' + content;
      }
    }
    
    return fixedContent;
  }

  /**
   * Fix import issues
   * @param {string} content - Test file content
   * @param {Object} testData - Test data
   * @param {Object} options - Fix options
   * @returns {Promise<string>} Fixed content
   */
  async fixImportIssue(content, testData, options) {
    let fixedContent = content;
    
    // Fix common import issues
    const importFixes = [
      // Fix relative imports
      [/from\s+['"`]\.\.\/\.\.\/\.\.\/src\/([^'"`]+)['"`]/g, "from '@/src/$1'"],
      [/from\s+['"`]\.\.\/\.\.\/src\/([^'"`]+)['"`]/g, "from '@/src/$1'"],
      [/from\s+['"`]\.\.\/src\/([^'"`]+)['"`]/g, "from '@/src/$1'"],
      
      // Fix missing extensions
      [/from\s+['"`]([^'"`]+)['"`](?!\s*;)/g, "from '$1'"],
      
      // Fix default imports
      [/import\s+(\w+)\s+from\s+['"`]([^'"`]+)['"`]/g, "import $1 from '$2'"]
    ];
    
    for (const [pattern, replacement] of importFixes) {
      fixedContent = fixedContent.replace(pattern, replacement);
    }
    
    return fixedContent;
  }

  /**
   * Fix syntax issues
   * @param {string} content - Test file content
   * @param {Object} testData - Test data
   * @param {Object} options - Fix options
   * @returns {Promise<string>} Fixed content
   */
  async fixSyntaxIssue(content, testData, options) {
    let fixedContent = content;
    
    // Fix common syntax issues
    const syntaxFixes = [
      // Fix missing semicolons
      [/(\w+)\s*=\s*([^;]+)(?!\s*;)/g, '$1 = $2;'],
      
      // Fix missing parentheses
      [/(\w+)\s*{\s*([^}]+)\s*}/g, '$1() {\n  $2\n}'],
      
      // Fix missing quotes
      [/(\w+):\s*([^,}]+)(?=[,}])/g, '$1: "$2"']
    ];
    
    for (const [pattern, replacement] of syntaxFixes) {
      fixedContent = fixedContent.replace(pattern, replacement);
    }
    
    return fixedContent;
  }

  /**
   * Fix type issues
   * @param {string} content - Test file content
   * @param {Object} testData - Test data
   * @param {Object} options - Fix options
   * @returns {Promise<string>} Fixed content
   */
  async fixTypeIssue(content, testData, options) {
    let fixedContent = content;
    
    // Add type annotations for TypeScript
    const typeFixes = [
      // Add function parameter types
      [/function\s+(\w+)\s*\(([^)]+)\)/g, 'function $1($2: any)'],
      
      // Add variable types
      [/(const|let|var)\s+(\w+)\s*=\s*([^;]+);/g, '$1 $2: any = $3;'],
      
      // Add return types
      [/function\s+(\w+)\s*\([^)]*\)\s*{/g, 'function $1(): any {']
    ];
    
    for (const [pattern, replacement] of typeFixes) {
      fixedContent = fixedContent.replace(pattern, replacement);
    }
    
    return fixedContent;
  }

  /**
   * Fix undefined issues
   * @param {string} content - Test file content
   * @param {Object} testData - Test data
   * @param {Object} options - Fix options
   * @returns {Promise<string>} Fixed content
   */
  async fixUndefinedIssue(content, testData, options) {
    let fixedContent = content;
    
    // Add null checks and default values
    const undefinedFixes = [
      // Add optional chaining
      [/(\w+)\.(\w+)/g, '$1?.$2'],
      
      // Add default values
      [/(\w+)\s*=\s*([^;]+);/g, '$1 = $2 || null;'],
      
      // Add existence checks
      [/(\w+)\s*\.\s*(\w+)/g, '$1 && $1.$2']
    ];
    
    for (const [pattern, replacement] of undefinedFixes) {
      fixedContent = fixedContent.replace(pattern, replacement);
    }
    
    return fixedContent;
  }

  /**
   * Fix null issues
   * @param {string} content - Test file content
   * @param {Object} testData - Test data
   * @param {Object} options - Fix options
   * @returns {Promise<string>} Fixed content
   */
  async fixNullIssue(content, testData, options) {
    let fixedContent = content;
    
    // Add null checks
    const nullFixes = [
      // Add null checks before property access
      [/(\w+)\.(\w+)/g, '$1 && $1.$2'],
      
      // Add default values for null
      [/(\w+)\s*=\s*([^;]+);/g, '$1 = $2 || {};'],
      
      // Add null assertions
      [/(\w+)\s*\.\s*(\w+)/g, '$1!.$2']
    ];
    
    for (const [pattern, replacement] of nullFixes) {
      fixedContent = fixedContent.replace(pattern, replacement);
    }
    
    return fixedContent;
  }

  /**
   * Fix  issues
   * @param {string} content - Test file content
   * @param {Object} testData - Test data
   * @param {Object} options - Fix options
   * @returns {Promise<string>} Fixed content
   */
  async fixIssue(content, testData, options) {
    let fixedContent = content;
    
    // Apply  fixes
    const Fixes = [
      // Fix common test patterns
      [/expect\(([^)]+)\)\.toBe\(([^)]+)\)/g, 'expect($1).toBe($2)'],
      
      // Add proper test structure
      [/describe\(([^)]+),\s*\(\)\s*=>\s*{/g, 'describe($1, () => {'],
      
      // Fix assertion syntax
      [/assert\(([^)]+)\)/g, 'expect($1).toBeTruthy()']
    ];
    
    for (const [pattern, replacement] of Fixes) {
      fixedContent = fixedContent.replace(pattern, replacement);
    }
    
    return fixedContent;
  }

  /**
   * Extract mock imports from content
   * @param {string} content - Test file content
   * @returns {Array} Array of import paths
   */
  extractMockImports(content) {
    const imports = [];
    const importPattern = /import\s+.*\s+from\s+['"`]([^'"`]+)['"`]/g;
    
    let match;
    while ((match = importPattern.exec(content)) !== null) {
      imports.push(match[1]);
    }
    
    return imports;
  }

  /**
   * Find the end index of imports section
   * @param {string} content - Test file content
   * @returns {number} End index
   */
  findImportEndIndex(content) {
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Stop at first non-import line
      if (line && !line.startsWith('import') && !line.startsWith('const') && !line.startsWith('let') && !line.startsWith('var')) {
        return content.indexOf(lines[i]);
      }
    }
    
    return -1;
  }

  /**
   * Generate diff between original and fixed content
   * @param {string} original - Original content
   * @param {string} fixed - Fixed content
   * @returns {Object} Diff object
   */
  diffContent(original, fixed) {
    const originalLines = original.split('\n');
    const fixedLines = fixed.split('\n');
    
    const changes = {
      added: [],
      removed: [],
      modified: []
    };
    
    // Simple line-by-line comparison
    for (let i = 0; i < Math.max(originalLines.length, fixedLines.length); i++) {
      const originalLine = originalLines[i] || '';
      const fixedLine = fixedLines[i] || '';
      
      if (originalLine !== fixedLine) {
        if (i < originalLines.length && i < fixedLines.length) {
          changes.modified.push({
            line: i + 1,
            original: originalLine,
            fixed: fixedLine
          });
        } else if (i >= originalLines.length) {
          changes.added.push({
            line: i + 1,
            content: fixedLine
          });
        } else {
          changes.removed.push({
            line: i + 1,
            content: originalLine
          });
        }
      }
    }
    
    return changes;
  }
}

module.exports = TestFixer; 