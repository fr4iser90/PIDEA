
#!/usr/bin/env node
require('module-alias/register');

/**
 * Legacy Test Detector
 * Scans test files for legacy indicators and provides recommendations
 */

const TestManagementService = require('@services/TestManagementService');
const path = require('path');
const fs = require('fs').promises;
const { exec } = require('child_process');
const { promisify } = require('util');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

const execAsync = promisify(exec);

class LegacyDetector {
  constructor() {
    this.testManagementService = new TestManagementService();
    this.legacyPatterns = [
      { pattern: /describe\(['"`].*legacy.*['"`]/i, score: 30, description: 'Legacy test description' },
      { pattern: /test\(['"`].*old.*['"`]/i, score: 25, description: 'Old test naming' },
      { pattern: /it\(['"`].*deprecated.*['"`]/i, score: 40, description: 'Deprecated test' },
      { pattern: /TODO.*legacy/i, score: 20, description: 'Legacy TODO comment' },
      { pattern: /FIXME.*legacy/i, score: 20, description: 'Legacy FIXME comment' },
      { pattern: /@deprecated/i, score: 50, description: 'Deprecated annotation' },
      { pattern: /console\.log\(/g, score: 5, description: 'Console logging' },
      { pattern: /console\.warn\(/g, score: 5, description: 'Console warning' },
      { pattern: /console\.error\(/g, score: 5, description: 'Console error' },
      { pattern: /setTimeout\(/g, score: 10, description: 'setTimeout usage' },
      { pattern: /setInterval\(/g, score: 10, description: 'setInterval usage' },
      { pattern: /eval\(/g, score: 50, description: 'eval usage' },
      { pattern: /new Function\(/g, score: 40, description: 'Function constructor' },
      { pattern: /jQuery/g, score: 30, description: 'jQuery usage' },
      { pattern: /\.ajax\(/g, score: 20, description: 'jQuery ajax' },
      { pattern: /document\.getElementById/g, score: 15, description: 'Direct DOM manipulation' },
      { pattern: /innerHTML\s*=/g, score: 20, description: 'innerHTML assignment' },
      { pattern: /onclick\s*=/g, score: 15, description: 'Inline event handlers' },
      { pattern: /var\s+\w+/g, score: 5, description: 'var declarations' },
      { pattern: /function\s+\w+\s*\(/g, score: 3, description: 'Function declarations' }
    ];
  }

  /**
   * Scan directory for legacy tests
   * @param {string} directory - Directory to scan
   * @param {Object} options - Scan options
   * @returns {Promise<Object>} - Scan results
   */
  async scanDirectory(directory, options = {}) {
    const {
      recursive = true,
      filePatterns = ['**/*.test.js', '**/*.spec.js'],
      minScore = 30,
      includeDetails = true
    } = options;

    logger.info(`🔍 Scanning directory: ${directory}`);
    logger.info(`📋 File patterns: ${filePatterns.join(', ')}`);
    logger.info(`🎯 Minimum legacy score: ${minScore}`);
    logger.info('');

    try {
      // Find test files
      const testFiles = await this.findTestFiles(directory, filePatterns, recursive);
      logger.debug(`📁 Found ${testFiles.length} test files`);

      const results = {
        scannedFiles: testFiles.length,
        legacyFiles: 0,
        totalLegacyScore: 0,
        files: [],
        recommendations: []
      };

      // Analyze each file
      for (const filePath of testFiles) {
        const fileResult = await this.analyzeFile(filePath, minScore, includeDetails);
        if (fileResult.legacyScore >= minScore) {
          results.legacyFiles++;
          results.totalLegacyScore += fileResult.legacyScore;
          results.files.push(fileResult);
        }
      }

      // Generate recommendations
      results.recommendations = this.generateRecommendations(results.files);

      // Print summary
      this.printSummary(results);

      return results;
    } catch (error) {
      logger.error(`❌ Error scanning directory: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find test files in directory
   * @param {string} directory - Directory to search
   * @param {string[]} patterns - File patterns
   * @param {boolean} recursive - Search recursively
   * @returns {Promise<string[]>} - Array of file paths
   */
  async findTestFiles(directory, patterns, recursive) {
    try {
      const findCommand = recursive 
        ? `find ${directory} -type f \\( -name "*.test.js" -o -name "*.spec.js" \\)`
        : `find ${directory} -maxdepth 1 -type f \\( -name "*.test.js" -o -name "*.spec.js" \\)`;

      const { stdout } = await execAsync(findCommand);
      return stdout.trim().split('\n').filter(file => file.length > 0);
    } catch (error) {
      logger.warn(`Warning: Could not use find command, falling back to manual search`);
      return this.findTestFilesManually(directory, patterns, recursive);
    }
  }

  /**
   * Manual file search fallback
   * @param {string} directory - Directory to search
   * @param {string[]} patterns - File patterns
   * @param {boolean} recursive - Search recursively
   * @returns {Promise<string[]>} - Array of file paths
   */
  async findTestFilesManually(directory, patterns, recursive) {
    const files = [];
    
    try {
      const entries = await fs.readdir(directory, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);
        
        if (entry.isFile()) {
          if (entry.name.endsWith('.test.js') || entry.name.endsWith('.spec.js')) {
            files.push(fullPath);
          }
        } else if (entry.isDirectory() && recursive) {
          const subFiles = await this.findTestFilesManually(fullPath, patterns, recursive);
          files.push(...subFiles);
        }
      }
    } catch (error) {
      logger.warn(`Warning: Could not read directory ${directory}: ${error.message}`);
    }
    
    return files;
  }

  /**
   * Analyze single file for legacy indicators
   * @param {string} filePath - File path to analyze
   * @param {number} minScore - Minimum score to report
   * @param {boolean} includeDetails - Include detailed analysis
   * @returns {Promise<Object>} - Analysis result
   */
  async analyzeFile(filePath, minScore = 30, includeDetails = true) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const fileName = path.basename(filePath);
      
      const result = {
        filePath,
        fileName,
        legacyScore: 0,
        issues: [],
        recommendations: [],
        complexityScore: 0,
        maintenanceScore: 0
      };

      // Analyze legacy patterns
      this.legacyPatterns.forEach(pattern => {
        const matches = content.match(pattern.pattern);
        if (matches) {
          const score = pattern.score * matches.length;
          result.legacyScore += score;
          
          if (includeDetails) {
            result.issues.push({
              type: 'legacy_pattern',
              description: pattern.description,
              score: pattern.score,
              occurrences: matches.length,
              totalScore: score
            });
          }
        }
      });

      // Calculate complexity score
      result.complexityScore = this.calculateComplexityScore(content);
      
      // Calculate maintenance score
      result.maintenanceScore = this.calculateMaintenanceScore(content);

      // Generate file-specific recommendations
      result.recommendations = this.generateFileRecommendations(result);

      // Only return if score meets minimum threshold
      if (result.legacyScore >= minScore) {
        logger.info(`⚠️  ${fileName} (Score: ${result.legacyScore})`);
        if (includeDetails && result.issues.length > 0) {
          result.issues.forEach(issue => {
            logger.info(`   - ${issue.description}: ${issue.occurrences} occurrences`);
          });
        }
      }

      return result;
    } catch (error) {
      logger.warn(`Warning: Could not analyze file ${filePath}: ${error.message}`);
      return {
        filePath,
        fileName: path.basename(filePath),
        legacyScore: 0,
        issues: [],
        recommendations: [],
        error: error.message
      };
    }
  }

  /**
   * Calculate complexity score for file
   * @param {string} content - File content
   * @returns {number} - Complexity score (0-100)
   */
  calculateComplexityScore(content) {
    const lines = content.split('\n').length;
    const functions = (content.match(/function\s+\w+|=>\s*{/g) || []).length;
    const imports = (content.match(/require\(|import\s+/g) || []).length;
    const conditionals = (content.match(/if\s*\(|else\s*{|switch\s*\(/g) || []).length;
    const loops = (content.match(/for\s*\(|while\s*\(|forEach\s*\(/g) || []).length;
    
    return Math.min(100, (lines * 0.3) + (functions * 3) + (imports * 2) + (conditionals * 2) + (loops * 2));
  }

  /**
   * Calculate maintenance score for file
   * @param {string} content - File content
   * @returns {number} - Maintenance score (0-100)
   */
  calculateMaintenanceScore(content) {
    let score = 100;
    
    const hasComments = content.includes('//') || content.includes('/*');
    const hasDocumentation = content.includes('/**') || content.includes('@param') || content.includes('@return');
    const hasErrorHandling = content.includes('try') && content.includes('catch');
    const hasLogging = content.includes('logger.info') || content.includes('logger.warn') || content.includes('logger.error');
    const hasTypeChecking = content.includes('typeof') || content.includes('instanceof') || content.includes('Array.isArray');
    const hasValidation = content.includes('validate') || content.includes('assert') || content.includes('expect');
    
    if (!hasComments) score -= 15;
    if (!hasDocumentation) score -= 25;
    if (!hasErrorHandling) score -= 20;
    if (hasLogging) score -= 10;
    if (!hasTypeChecking) score -= 10;
    if (!hasValidation) score -= 10;
    
    return Math.max(0, score);
  }

  /**
   * Generate file-specific recommendations
   * @param {Object} result - Analysis result
   * @returns {string[]} - Array of recommendations
   */
  generateFileRecommendations(result) {
    const recommendations = [];
    
    if (result.legacyScore > 50) {
      recommendations.push('Consider refactoring or removing this test file');
    }
    
    if (result.complexityScore > 80) {
      recommendations.push('Break down complex tests into smaller, focused tests');
    }
    
    if (result.maintenanceScore < 50) {
      recommendations.push('Add documentation, error handling, and type checking');
    }
    
    if (result.issues.some(issue => issue.description.includes('console'))) {
      recommendations.push('Remove console statements and use proper logging');
    }
    
    if (result.issues.some(issue => issue.description.includes('eval'))) {
      recommendations.push('Replace eval() with safer alternatives');
    }
    
    return recommendations;
  }

  /**
   * Generate overall recommendations
   * @param {Object[]} files - Array of file results
   * @returns {Object[]} - Array of recommendations
   */
  generateRecommendations(files) {
    const recommendations = [];
    
    const highScoreFiles = files.filter(f => f.legacyScore > 70);
    const complexFiles = files.filter(f => f.complexityScore > 80);
    const lowMaintenanceFiles = files.filter(f => f.maintenanceScore < 50);
    
    if (highScoreFiles.length > 0) {
      recommendations.push({
        type: 'critical',
        message: `${highScoreFiles.length} files have high legacy scores (>70). Prioritize these for refactoring.`,
        files: highScoreFiles.map(f => f.fileName)
      });
    }
    
    if (complexFiles.length > 0) {
      recommendations.push({
        type: 'high',
        message: `${complexFiles.length} files have high complexity (>80). Consider breaking them down.`,
        files: complexFiles.map(f => f.fileName)
      });
    }
    
    if (lowMaintenanceFiles.length > 0) {
      recommendations.push({
        type: 'medium',
        message: `${lowMaintenanceFiles.length} files need maintenance improvements. Add documentation and error handling.`,
        files: lowMaintenanceFiles.map(f => f.fileName)
      });
    }
    
    return recommendations;
  }

  /**
   * Print scan summary
   * @param {Object} results - Scan results
   */
  printSummary(results) {
    logger.info('\n📊 Scan Summary');
    logger.info('==============');
    logger.info(`📁 Total files scanned: ${results.scannedFiles}`);
    logger.info(`⚠️  Legacy files found: ${results.legacyFiles}`);
    logger.info(`🎯 Total legacy score: ${results.totalLegacyScore}`);
    logger.info(`📈 Average legacy score: ${results.legacyFiles > 0 ? Math.round(results.totalLegacyScore / results.legacyFiles) : 0}`);
    
    if (results.recommendations.length > 0) {
      logger.info('\n💡 Recommendations');
      logger.info('==================');
      results.recommendations.forEach((rec, index) => {
        logger.info(`${index + 1}. [${rec.type.toUpperCase()}] ${rec.message}`);
        if (rec.files && rec.files.length > 0) {
          logger.info(`   Files: ${rec.files.join(', ')}`);
        }
      });
    }
    
    logger.info('\n✅ Scan completed successfully!');
  }

  /**
   * Export results to JSON file
   * @param {Object} results - Scan results
   * @param {string} outputPath - Output file path
   */
  async exportResults(results, outputPath) {
    try {
      const exportData = {
        scanDate: new Date().toISOString(),
        ...results
      };
      
      await fs.writeFile(outputPath, JSON.stringify(exportData, null, 2));
      logger.info(`📄 Results exported to: ${outputPath}`);
    } catch (error) {
      logger.error(`❌ Failed to export results: ${error.message}`);
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const detector = new LegacyDetector();
  
  if (args.length === 0) {
    logger.info('Usage: node legacy-detector.js <directory> [options]');
    logger.info('');
    logger.info('Options:');
    logger.info('  --min-score <number>    Minimum legacy score to report (default: 30)');
    logger.info('  --output <file>         Export results to JSON file');
    logger.info('  --no-recursive          Do not search subdirectories');
    logger.info('  --no-details            Do not include detailed analysis');
    logger.info('');
    logger.info('Examples:');
    logger.debug('  node legacy-detector.js ./tests');
    logger.debug('  node legacy-detector.js ./tests --min-score 50 --output results.json');
    return;
  }
  
  const directory = args[0];
  const options = {
    minScore: 30,
    output: null,
    recursive: true,
    includeDetails: true
  };
  
  // Parse options
  for (let i = 1; i < args.length; i++) {
    switch (args[i]) {
      case '--min-score':
        options.minScore = parseInt(args[++i]) || 30;
        break;
      case '--output':
        options.output = args[++i];
        break;
      case '--no-recursive':
        options.recursive = false;
        break;
      case '--no-details':
        options.includeDetails = false;
        break;
    }
  }
  
  try {
    const results = await detector.scanDirectory(directory, options);
    
    if (options.output) {
      await detector.exportResults(results, options.output);
    }
  } catch (error) {
    logger.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = LegacyDetector; 