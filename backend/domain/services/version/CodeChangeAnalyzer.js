/**
 * CodeChangeAnalyzer - Analyzes code changes for version bump determination
 * Detects API changes, breaking changes, and code modifications
 */

const Logger = require('@logging/Logger');
const fs = require('fs').promises;
const path = require('path');

class CodeChangeAnalyzer {
  constructor(dependencies = {}) {
    this.logger = new Logger('CodeChangeAnalyzer');
    this.fileSystemService = dependencies.fileSystemService;
    this.gitService = dependencies.gitService;
    
    // Configuration
    this.config = {
      apiPatterns: [
        /export\s+(?:function|class|const|let|var)\s+(\w+)/g,
        /module\.exports\s*=\s*{([^}]+)}/g,
        /exports\.(\w+)\s*=/g,
        /public\s+(?:static\s+)?(?:async\s+)?(\w+)\s*\(/g,
        /def\s+(\w+)\s*\(/g,
        /function\s+(\w+)\s*\(/g
      ],
      breakingChangePatterns: [
        /remove|delete|deprecate|break|breaking/i,
        /rename|change.*signature|modify.*interface/i,
        /update.*api|change.*method/i
      ],
      fileExtensions: ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cs', '.php', '.rb', '.go'],
      ...dependencies.config
    };
  }

  /**
   * Analyze code changes for version impact
   * @param {string} projectPath - Project path
   * @param {Object} context - Analysis context
   * @returns {Promise<Object>} Analysis result
   */
  async analyzeCodeChanges(projectPath, context = {}) {
    try {
      this.logger.info('Starting code change analysis', { projectPath });

      const analysis = {
        hasBreakingChanges: false,
        hasApiChanges: false,
        hasNewFeatures: false,
        hasBugFixes: false,
        modifiedFiles: [],
        apiChanges: [],
        breakingChanges: [],
        confidence: 0.5,
        factors: ['code-analysis'],
        timestamp: new Date()
      };

      // Get modified files from git if available
      const modifiedFiles = await this.getModifiedFiles(projectPath, context);
      analysis.modifiedFiles = modifiedFiles;

      if (modifiedFiles.length === 0) {
        this.logger.warn('No modified files found for analysis');
        return analysis;
      }

      // Analyze each modified file
      for (const file of modifiedFiles) {
        const fileAnalysis = await this.analyzeFile(file, projectPath, context);
        this.mergeFileAnalysis(analysis, fileAnalysis);
      }

      // Calculate overall confidence
      analysis.confidence = this.calculateConfidence(analysis);

      this.logger.info('Code change analysis completed', {
        hasBreakingChanges: analysis.hasBreakingChanges,
        hasApiChanges: analysis.hasApiChanges,
        modifiedFiles: analysis.modifiedFiles.length
      });

      return analysis;

    } catch (error) {
      this.logger.error('Code change analysis failed', { error: error.message });
      return this.getFallbackAnalysis(error);
    }
  }

  /**
   * Get modified files from git or context
   * @param {string} projectPath - Project path
   * @param {Object} context - Analysis context
   * @returns {Promise<Array>} Modified files
   */
  async getModifiedFiles(projectPath, context) {
    try {
      // Check if git service is available
      if (this.gitService && context.gitChanges) {
        return context.gitChanges.modified || [];
      }

      // Fallback: scan for recently modified files
      if (context.recentFiles) {
        return context.recentFiles;
      }

      // Last resort: return empty array
      return [];

    } catch (error) {
      this.logger.warn('Failed to get modified files', { error: error.message });
      return [];
    }
  }

  /**
   * Analyze individual file for changes
   * @param {string} filePath - File path
   * @param {string} projectPath - Project path
   * @param {Object} context - Analysis context
   * @returns {Promise<Object>} File analysis result
   */
  async analyzeFile(filePath, projectPath, context) {
    try {
      const fullPath = path.resolve(projectPath, filePath);
      const fileExtension = path.extname(filePath).toLowerCase();

      // Skip non-code files
      if (!this.config.fileExtensions.includes(fileExtension)) {
        return {
          hasBreakingChanges: false,
          hasApiChanges: false,
          hasNewFeatures: false,
          hasBugFixes: false,
          apiChanges: [],
          breakingChanges: []
        };
      }

      // Read file content
      const content = await fs.readFile(fullPath, 'utf8');
      
      // Analyze file content
      const analysis = {
        hasBreakingChanges: false,
        hasApiChanges: false,
        hasNewFeatures: false,
        hasBugFixes: false,
        apiChanges: [],
        breakingChanges: []
      };

      // Detect API changes
      analysis.apiChanges = this.detectApiChanges(content, filePath);
      analysis.hasApiChanges = analysis.apiChanges.length > 0;

      // Detect breaking changes
      analysis.breakingChanges = this.detectBreakingChanges(content, filePath);
      analysis.hasBreakingChanges = analysis.breakingChanges.length > 0;

      // Detect new features
      analysis.hasNewFeatures = this.detectNewFeatures(content, filePath);

      // Detect bug fixes
      analysis.hasBugFixes = this.detectBugFixes(content, filePath);

      return analysis;

    } catch (error) {
      this.logger.warn('Failed to analyze file', { filePath, error: error.message });
      return {
        hasBreakingChanges: false,
        hasApiChanges: false,
        hasNewFeatures: false,
        hasBugFixes: false,
        apiChanges: [],
        breakingChanges: []
      };
    }
  }

  /**
   * Detect API changes in file content
   * @param {string} content - File content
   * @param {string} filePath - File path
   * @returns {Array} API changes
   */
  detectApiChanges(content, filePath) {
    const apiChanges = [];

    try {
      // Extract exported functions, classes, and constants
      for (const pattern of this.config.apiPatterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          apiChanges.push({
            type: 'export',
            name: match[1] || match[0],
            file: filePath,
            line: this.getLineNumber(content, match.index)
          });
        }
      }

      // Look for API-related comments
      const apiComments = content.match(/\/\*\*[\s\S]*?\*\//g) || [];
      for (const comment of apiComments) {
        if (comment.includes('@api') || comment.includes('@public') || comment.includes('@deprecated')) {
          apiChanges.push({
            type: 'api-comment',
            content: comment.substring(0, 100),
            file: filePath
          });
        }
      }

    } catch (error) {
      this.logger.warn('Failed to detect API changes', { filePath, error: error.message });
    }

    return apiChanges;
  }

  /**
   * Detect breaking changes in file content
   * @param {string} content - File content
   * @param {string} filePath - File path
   * @returns {Array} Breaking changes
   */
  detectBreakingChanges(content, filePath) {
    const breakingChanges = [];

    try {
      // Check for breaking change patterns
      for (const pattern of this.config.breakingChangePatterns) {
        const matches = content.match(pattern);
        if (matches) {
          breakingChanges.push({
            type: 'breaking-change',
            pattern: pattern.source,
            matches: matches.length,
            file: filePath
          });
        }
      }

      // Look for deprecation warnings
      const deprecationPattern = /deprecat(?:ed|ion)/gi;
      const deprecationMatches = content.match(deprecationPattern);
      if (deprecationMatches) {
        breakingChanges.push({
          type: 'deprecation',
          count: deprecationMatches.length,
          file: filePath
        });
      }

      // Look for TODO/FIXME comments about breaking changes
      const todoPattern = /(?:TODO|FIXME|NOTE).*break(?:ing)?/gi;
      const todoMatches = content.match(todoPattern);
      if (todoMatches) {
        breakingChanges.push({
          type: 'todo-breaking',
          count: todoMatches.length,
          file: filePath
        });
      }

    } catch (error) {
      this.logger.warn('Failed to detect breaking changes', { filePath, error: error.message });
    }

    return breakingChanges;
  }

  /**
   * Detect new features in file content
   * @param {string} content - File content
   * @param {string} filePath - File path
   * @returns {boolean} Has new features
   */
  detectNewFeatures(content, filePath) {
    try {
      // Look for feature-related keywords
      const featurePatterns = [
        /add(?:ed)?\s+(?:new\s+)?(?:feature|functionality|method|class|api)/i,
        /implement(?:ed)?\s+(?:new\s+)?(?:feature|functionality)/i,
        /create(?:d)?\s+(?:new\s+)?(?:feature|functionality|api)/i,
        /introduce(?:d)?\s+(?:new\s+)?(?:feature|functionality)/i
      ];

      for (const pattern of featurePatterns) {
        if (pattern.test(content)) {
          return true;
        }
      }

      return false;

    } catch (error) {
      this.logger.warn('Failed to detect new features', { filePath, error: error.message });
      return false;
    }
  }

  /**
   * Detect bug fixes in file content
   * @param {string} content - File content
   * @param {string} filePath - File path
   * @returns {boolean} Has bug fixes
   */
  detectBugFixes(content, filePath) {
    try {
      // Look for bug fix-related keywords
      const bugFixPatterns = [
        /fix(?:ed)?\s+(?:bug|issue|problem|error)/i,
        /resolve(?:d)?\s+(?:bug|issue|problem)/i,
        /correct(?:ed)?\s+(?:bug|issue|problem)/i,
        /patch(?:ed)?\s+(?:bug|issue|problem)/i
      ];

      for (const pattern of bugFixPatterns) {
        if (pattern.test(content)) {
          return true;
        }
      }

      return false;

    } catch (error) {
      this.logger.warn('Failed to detect bug fixes', { filePath, error: error.message });
      return false;
    }
  }

  /**
   * Merge file analysis into overall analysis
   * @param {Object} analysis - Overall analysis
   * @param {Object} fileAnalysis - File analysis
   */
  mergeFileAnalysis(analysis, fileAnalysis) {
    analysis.hasBreakingChanges = analysis.hasBreakingChanges || fileAnalysis.hasBreakingChanges;
    analysis.hasApiChanges = analysis.hasApiChanges || fileAnalysis.hasApiChanges;
    analysis.hasNewFeatures = analysis.hasNewFeatures || fileAnalysis.hasNewFeatures;
    analysis.hasBugFixes = analysis.hasBugFixes || fileAnalysis.hasBugFixes;

    analysis.apiChanges.push(...fileAnalysis.apiChanges);
    analysis.breakingChanges.push(...fileAnalysis.breakingChanges);
  }

  /**
   * Calculate confidence score for analysis
   * @param {Object} analysis - Analysis result
   * @returns {number} Confidence score
   */
  calculateConfidence(analysis) {
    let confidence = 0.5; // Base confidence

    // Increase confidence based on findings
    if (analysis.hasBreakingChanges) confidence += 0.3;
    if (analysis.hasApiChanges) confidence += 0.2;
    if (analysis.hasNewFeatures) confidence += 0.1;
    if (analysis.hasBugFixes) confidence += 0.1;

    // Increase confidence based on number of modified files
    if (analysis.modifiedFiles.length > 0) {
      confidence += Math.min(analysis.modifiedFiles.length * 0.05, 0.2);
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Get line number for character index
   * @param {string} content - File content
   * @param {number} index - Character index
   * @returns {number} Line number
   */
  getLineNumber(content, index) {
    return content.substring(0, index).split('\n').length;
  }

  /**
   * Get fallback analysis when analysis fails
   * @param {Error} error - Error that occurred
   * @returns {Object} Fallback analysis
   */
  getFallbackAnalysis(error) {
    return {
      hasBreakingChanges: false,
      hasApiChanges: false,
      hasNewFeatures: false,
      hasBugFixes: false,
      modifiedFiles: [],
      apiChanges: [],
      breakingChanges: [],
      confidence: 0.1,
      factors: ['code-analysis-fallback'],
      error: error.message,
      timestamp: new Date()
    };
  }

  /**
   * Get service health status
   * @returns {Object} Health status
   */
  getHealthStatus() {
    return {
      status: 'healthy',
      config: {
        apiPatterns: this.config.apiPatterns.length,
        breakingChangePatterns: this.config.breakingChangePatterns.length,
        fileExtensions: this.config.fileExtensions
      },
      timestamp: new Date()
    };
  }
}

module.exports = CodeChangeAnalyzer;
