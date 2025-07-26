/**
 * Code Quality Analysis Step - Core Analysis Step
 * Analyzes code quality metrics and issues
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const fs = require('fs').promises;
const path = require('path');

const logger = new Logger('code_quality_analysis_step');

// Step configuration
const config = {
  name: 'CodeQualityAnalysisStep',
  type: 'analysis',
  description: 'Analyzes code quality metrics and issues',
  category: 'analysis',
  version: '1.0.0',
  dependencies: [],
  settings: {
    timeout: 60000,
    includeMetrics: true,
    includeIssues: true,
    includeSuggestions: true
  },
  validation: {
    requiredFiles: ['package.json'],
    supportedProjects: ['nodejs', 'react', 'vue', 'angular', 'express', 'nest']
  }
};

class CodeQualityAnalysisStep {
  constructor() {
    this.name = 'CodeQualityAnalysisStep';
    this.description = 'Analyzes code quality metrics and issues';
    this.category = 'analysis';
    this.dependencies = [];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = CodeQualityAnalysisStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`📊 Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);

      const projectPath = context.projectPath;
      const projectId = context.projectId || this.extractProjectId(projectPath);
      
      logger.info(`📊 Starting code quality analysis for: ${projectPath}`);

      // Execute code quality analysis
      const codeQuality = await this.analyzeCodeQuality(projectPath, {
        includeMetrics: context.includeMetrics !== false,
        includeIssues: context.includeIssues !== false,
        includeSuggestions: context.includeSuggestions !== false
      });

      // Clean and format result
      const cleanResult = this.cleanResult(codeQuality);

      // Note: Database saving is handled by Application Layer
      // Steps should only execute business logic

      logger.info(`✅ Code quality analysis completed successfully`);

      return {
        success: true,
        result: cleanResult,
        metadata: {
          stepName: this.name,
          projectPath,
          projectId,
          analysisType: 'code-quality',
          timestamp: new Date()
        }
      };

    } catch (error) {
      logger.error(`❌ Code quality analysis failed: ${error.message}`);
      
      return {
        success: false,
        error: error.message,
        metadata: {
          stepName: this.name,
          projectPath: context.projectPath,
          analysisType: 'code-quality',
          timestamp: new Date()
        }
      };
    }
  }

  /**
   * Save analysis result to database
   * @param {string} projectId - Project ID
   * @param {Object} result - Analysis result
   * @param {Object} context - Execution context
   */
  async saveAnalysisResult(projectId, result, context) {
    try {
      // Get analysis repository from dependency injection
      const analysisRepository = this.getAnalysisRepository();
      if (!analysisRepository) {
        logger.warn('Analysis repository not available, skipping database save');
        return;
      }

      // Create analysis entity
      const Analysis = require('@domain/entities/Analysis');
      const analysis = Analysis.create(projectId, 'code-quality', {
        result: result,
        metadata: {
          stepName: this.name,
          projectPath: context.projectPath,
          analysisType: 'code-quality',
          executionContext: context,
          timestamp: new Date().toISOString()
        }
      });

      // Save to database
      await analysisRepository.save(analysis);
      
      logger.info(`💾 Analysis result saved to database: ${analysis.id}`);
      
    } catch (error) {
      logger.error(`❌ Failed to save analysis result: ${error.message}`);
      // Don't throw error - analysis execution was successful, just saving failed
    }
  }

  /**
   * Get analysis repository from dependency injection
   * @returns {Object|null} Analysis repository or null
   */
  getAnalysisRepository() {
    try {
      // Try to get from global dependency injection
      if (global.dependencyContainer) {
        return global.dependencyContainer.get('analysisRepository');
      }
      
      // Try to get from step context
      if (this.context && this.context.analysisRepository) {
        return this.context.analysisRepository;
      }
      
      return null;
    } catch (error) {
      logger.warn('Could not get analysis repository:', error.message);
      return null;
    }
  }

  /**
   * Extract project ID from project path
   * @param {string} projectPath - Project path
   * @returns {string} Project ID
   */
  extractProjectId(projectPath) {
    try {
      // Try to get from package.json
      const packageJsonPath = path.join(projectPath, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        return packageJson.name || path.basename(projectPath);
      }
      
      // Fallback to directory name
      return path.basename(projectPath);
    } catch (error) {
      logger.warn('Could not extract project ID:', error.message);
      return path.basename(projectPath);
    }
  }

  /**
   * Analyze code quality for a project
   * @param {string} projectPath - Path to the project
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Code quality analysis result
   */
  async analyzeCodeQuality(projectPath, options = {}) {
    const startTime = Date.now();
    
    try {
      const result = {
        score: 0,
        results: {},
        issues: [],
        recommendations: [],
        summary: {},
        metadata: {
          analysisType: 'code-quality',
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        }
      };

      // Analyze project structure
      const structureAnalysis = await this.analyzeProjectStructure(projectPath);
      
      // Analyze code complexity
      const complexityAnalysis = await this.analyzeCodeComplexity(projectPath);
      
      // Analyze code style and patterns
      const styleAnalysis = await this.analyzeCodeStyle(projectPath);
      
      // Analyze dependencies
      const dependencyAnalysis = await this.analyzeDependencies(projectPath);
      
      // Analyze test coverage
      const testAnalysis = await this.analyzeTestCoverage(projectPath);

      // Calculate overall score
      result.score = this.calculateQualityScore({
        structure: structureAnalysis,
        complexity: complexityAnalysis,
        style: styleAnalysis,
        dependencies: dependencyAnalysis,
        tests: testAnalysis
      });

      // Aggregate results (detailed analysis data)
      if (options.includeMetrics) {
        result.results = {
          complexity: complexityAnalysis,
          structure: structureAnalysis.metrics,
          style: styleAnalysis.metrics,
          dependencies: dependencyAnalysis.metrics,
          tests: testAnalysis.metrics
        };
      }

      // Aggregate issues
      if (options.includeIssues) {
        result.issues = [
          ...structureAnalysis.issues,
          ...complexityAnalysis.issues,
          ...styleAnalysis.issues,
          ...dependencyAnalysis.issues,
          ...testAnalysis.issues
        ];
      }

      // Generate recommendations
      if (options.includeSuggestions) {
        result.recommendations = this.generateSuggestions(result);
      }

      // Create summary
      result.summary = {
        overallScore: result.score,
        totalIssues: result.issues.length,
        totalRecommendations: result.recommendations.length,
        status: this.getQualityLevel(result.score),
        qualityLevel: this.getQualityLevel(result.score)
      };

      // Add metadata
      const executionTime = Date.now() - startTime;
      const files = await this.getAllFiles(projectPath);
      
      result.metadata = {
        ...result.metadata,
        executionTime,
        filesAnalyzed: files.length,
        coverage: this.calculateCoverage(files, projectPath),
        confidence: this.calculateConfidence(result)
      };

      return result;

    } catch (error) {
      logger.error(`Code quality analysis failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Analyze project structure
   */
  async analyzeProjectStructure(projectPath) {
    try {
      const files = await this.getAllFiles(projectPath);
      const directories = await this.getAllDirectories(projectPath);
      
      const metrics = {
        totalFiles: files.length,
        totalDirectories: directories.length,
        fileTypes: this.analyzeFileTypes(files),
        directoryDepth: this.calculateDirectoryDepth(directories, projectPath)
      };

      const issues = [];
      
      // Check for common structural issues
      if (files.length > 1000) {
        issues.push({
          type: 'structure',
          severity: 'medium',
          message: 'Large number of files detected. Consider organizing into modules.',
          suggestion: 'Break down the project into smaller, focused modules'
        });
      }

      if (metrics.directoryDepth > 8) {
        issues.push({
          type: 'structure',
          severity: 'high',
          message: 'Deep directory structure detected. This can impact maintainability.',
          suggestion: 'Flatten the directory structure where possible'
        });
      }

      return { metrics, issues };
    } catch (error) {
      logger.error(`Structure analysis failed: ${error.message}`);
      return { metrics: {}, issues: [] };
    }
  }

  /**
   * Analyze code complexity
   */
  async analyzeCodeComplexity(projectPath) {
    try {
      const jsFiles = await this.getJavaScriptFiles(projectPath);
      let totalComplexity = 0;
      let highComplexityFiles = 0;
      const issues = [];

      for (const file of jsFiles.slice(0, 50)) { // Limit to first 50 files for performance
        try {
          const content = await fs.readFile(file, 'utf8');
          const complexity = this.calculateFileComplexity(content);
          totalComplexity += complexity;

          if (complexity > 10) {
            highComplexityFiles++;
            issues.push({
              type: 'complexity',
              severity: 'medium',
              message: `High complexity detected in ${path.relative(projectPath, file)}`,
              suggestion: 'Consider breaking down complex functions into smaller, more manageable pieces'
            });
          }
        } catch (error) {
          // Skip files that can't be read
        }
      }

      const avgComplexity = jsFiles.length > 0 ? totalComplexity / jsFiles.length : 0;

      return {
        averageComplexity: avgComplexity,
        totalComplexity,
        highComplexityFiles,
        totalFiles: jsFiles.length,
        issues
      };
    } catch (error) {
      logger.error(`Complexity analysis failed: ${error.message}`);
      return { averageComplexity: 0, totalComplexity: 0, highComplexityFiles: 0, totalFiles: 0, issues: [] };
    }
  }

  /**
   * Analyze code style
   */
  async analyzeCodeStyle(projectPath) {
    try {
      const jsFiles = await this.getJavaScriptFiles(projectPath);
      const issues = [];
      const metrics = {
        totalFiles: jsFiles.length,
        filesWithIssues: 0
      };

      // Check for common style issues
      for (const file of jsFiles.slice(0, 20)) { // Limit for performance
        try {
          const content = await fs.readFile(file, 'utf8');
          const fileIssues = this.detectStyleIssues(content, file);
          
          if (fileIssues.length > 0) {
            metrics.filesWithIssues++;
            issues.push(...fileIssues);
          }
        } catch (error) {
          // Skip files that can't be read
        }
      }

      return { metrics, issues };
    } catch (error) {
      logger.error(`Style analysis failed: ${error.message}`);
      return { metrics: {}, issues: [] };
    }
  }

  /**
   * Analyze dependencies
   */
  async analyzeDependencies(projectPath) {
    try {
      const packageJsonPath = path.join(projectPath, 'package.json');
      const issues = [];
      const metrics = {};

      try {
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
        
        metrics.dependencies = Object.keys(packageJson.dependencies || {}).length;
        metrics.devDependencies = Object.keys(packageJson.devDependencies || {}).length;
        metrics.totalDependencies = metrics.dependencies + metrics.devDependencies;

        // Check for potential issues
        if (metrics.totalDependencies > 100) {
          issues.push({
            type: 'dependencies',
            severity: 'medium',
            message: 'Large number of dependencies detected',
            suggestion: 'Review and remove unused dependencies to reduce bundle size and security risks'
          });
        }

        if (metrics.dependencies > 50) {
          issues.push({
            type: 'dependencies',
            severity: 'low',
            message: 'Many production dependencies detected',
            suggestion: 'Consider if all dependencies are necessary for production'
          });
        }

      } catch (error) {
        issues.push({
          type: 'dependencies',
          severity: 'high',
          message: 'Could not read package.json',
          suggestion: 'Ensure package.json exists and is valid JSON'
        });
      }

      return { metrics, issues };
    } catch (error) {
      logger.error(`Dependency analysis failed: ${error.message}`);
      return { metrics: {}, issues: [] };
    }
  }

  /**
   * Analyze test coverage
   */
  async analyzeTestCoverage(projectPath) {
    try {
      const testFiles = await this.getTestFiles(projectPath);
      const sourceFiles = await this.getJavaScriptFiles(projectPath);
      const issues = [];
      
      const metrics = {
        testFiles: testFiles.length,
        sourceFiles: sourceFiles.length,
        testRatio: sourceFiles.length > 0 ? testFiles.length / sourceFiles.length : 0
      };

      // Check for test coverage issues
      if (metrics.testRatio < 0.1) {
        issues.push({
          type: 'testing',
          severity: 'high',
          message: 'Low test coverage detected',
          suggestion: 'Add more unit tests to improve code reliability'
        });
      }

      if (testFiles.length === 0) {
        issues.push({
          type: 'testing',
          severity: 'critical',
          message: 'No test files found',
          suggestion: 'Implement unit tests for critical functionality'
        });
      }

      return { metrics, issues };
    } catch (error) {
      logger.error(`Test analysis failed: ${error.message}`);
      return { metrics: {}, issues: [] };
    }
  }

  /**
   * Calculate quality score based on analysis results
   */
  calculateQualityScore(analyses) {
    let score = 100;

    // Deduct points for issues
    const totalIssues = analyses.structure.issues.length + 
                       analyses.complexity.issues.length + 
                       analyses.style.issues.length + 
                       analyses.dependencies.issues.length + 
                       analyses.tests.issues.length;

    score -= totalIssues * 5; // 5 points per issue

    // Deduct points for complexity
    if (analyses.complexity.averageComplexity > 5) {
      score -= (analyses.complexity.averageComplexity - 5) * 2;
    }

    // Deduct points for low test coverage
    if (analyses.tests.metrics.testRatio < 0.2) {
      score -= (0.2 - analyses.tests.metrics.testRatio) * 100;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate suggestions based on analysis results
   */
  generateSuggestions(result) {
    const suggestions = [];

    if (result.score < 70) {
      suggestions.push({
        priority: 'high',
        category: 'general',
        message: 'Overall code quality needs improvement',
        action: 'Address critical issues and implement suggested improvements'
      });
    }

    if (result.issues.some(issue => issue.type === 'complexity')) {
      suggestions.push({
        priority: 'medium',
        category: 'complexity',
        message: 'Reduce code complexity',
        action: 'Break down complex functions and reduce nesting levels'
      });
    }

    if (result.issues.some(issue => issue.type === 'testing')) {
      suggestions.push({
        priority: 'high',
        category: 'testing',
        message: 'Improve test coverage',
        action: 'Add unit tests for critical functionality and edge cases'
      });
    }

    if (result.issues.some(issue => issue.type === 'dependencies')) {
      suggestions.push({
        priority: 'medium',
        category: 'dependencies',
        message: 'Review dependencies',
        action: 'Remove unused dependencies and keep production dependencies minimal'
      });
    }

    return suggestions;
  }

  /**
   * Get quality level based on score
   */
  getQualityLevel(score) {
    if (score >= 90) return 'excellent';
    if (score >= 80) return 'good';
    if (score >= 70) return 'fair';
    if (score >= 60) return 'poor';
    return 'critical';
  }

  // Helper methods
  async getAllFiles(dir) {
    const files = [];
    try {
      const items = await fs.readdir(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = await fs.stat(fullPath);
        if (stat.isFile()) {
          files.push(fullPath);
        } else if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          files.push(...(await this.getAllFiles(fullPath)));
        }
      }
    } catch (error) {
      // Skip directories that can't be read
    }
    return files;
  }

  async getAllDirectories(dir) {
    const directories = [];
    try {
      const items = await fs.readdir(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = await fs.stat(fullPath);
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          directories.push(fullPath);
          directories.push(...(await this.getAllDirectories(fullPath)));
        }
      }
    } catch (error) {
      // Skip directories that can't be read
    }
    return directories;
  }

  async getJavaScriptFiles(projectPath) {
    const allFiles = await this.getAllFiles(projectPath);
    return allFiles.filter(file => 
      file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.ts') || file.endsWith('.tsx')
    );
  }

  async getTestFiles(projectPath) {
    const allFiles = await this.getAllFiles(projectPath);
    return allFiles.filter(file => 
      file.includes('.test.') || file.includes('.spec.') || file.includes('__tests__')
    );
  }

  analyzeFileTypes(files) {
    const types = {};
    files.forEach(file => {
      const ext = path.extname(file);
      types[ext] = (types[ext] || 0) + 1;
    });
    return types;
  }

  calculateDirectoryDepth(directories, projectPath) {
    if (directories.length === 0) return 0;
    const depths = directories.map(dir => {
      const relativePath = path.relative(projectPath, dir);
      return relativePath.split(path.sep).length;
    });
    return Math.max(...depths);
  }

  calculateFileComplexity(content) {
    // Simple complexity calculation based on control flow statements
    const complexityIndicators = [
      /\bif\b/g,
      /\belse\b/g,
      /\bfor\b/g,
      /\bwhile\b/g,
      /\bswitch\b/g,
      /\bcase\b/g,
      /\bcatch\b/g,
      /\bthrow\b/g,
      /\breturn\b/g,
      /\b&&\b/g,
      /\b\|\|\b/g
    ];

    let complexity = 1; // Base complexity
    complexityIndicators.forEach(indicator => {
      const matches = content.match(indicator);
      if (matches) {
        complexity += matches.length;
      }
    });

    return complexity;
  }

  detectStyleIssues(content, filePath) {
    const issues = [];
    
    // Check for long lines
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      if (line.length > 120) {
        issues.push({
          type: 'style',
          severity: 'low',
          message: `Long line detected in ${path.basename(filePath)}:${index + 1}`,
          suggestion: 'Keep lines under 120 characters for better readability'
        });
      }
    });

    // Check for inconsistent indentation
    if (content.includes('\t') && content.includes('  ')) {
      issues.push({
        type: 'style',
        severity: 'medium',
        message: `Mixed indentation detected in ${path.basename(filePath)}`,
        suggestion: 'Use consistent indentation (spaces or tabs, but not both)'
      });
    }

    return issues;
  }

  cleanResult(result) {
    if (!result) return null;
    
    // Remove sensitive information and large objects
    const clean = { ...result };
    
    // Remove internal properties
    delete clean._internal;
    delete clean.debug;
    
    return clean;
  }

  validateContext(context) {
    if (!context.projectPath) {
      throw new Error('Project path is required for code quality analysis');
    }
  }

  /**
   * Calculate coverage percentage
   * @param {Array} files - Analyzed files
   * @param {string} projectPath - Project path
   * @returns {number} Coverage percentage
   */
  calculateCoverage(files, projectPath) {
    try {
      // Get all files in project
      const allFiles = this.getAllFilesSync(projectPath);
      return allFiles.length > 0 ? Math.round((files.length / allFiles.length) * 100) : 100;
    } catch (error) {
      return 100; // Default to 100% if calculation fails
    }
  }

  /**
   * Calculate confidence level based on analysis quality
   * @param {Object} result - Analysis result
   * @returns {number} Confidence percentage
   */
  calculateConfidence(result) {
    let confidence = 80; // Base confidence
    
    // Increase confidence based on data quality
    if (result.issues.length > 0) confidence += 10;
    if (result.recommendations.length > 0) confidence += 5;
    if (result.results && Object.keys(result.results).length > 0) confidence += 5;
    
    return Math.min(confidence, 100);
  }

  /**
   * Get all files synchronously (for coverage calculation)
   * @param {string} dir - Directory path
   * @returns {Array} File paths
   */
  getAllFilesSync(dir) {
    const files = [];
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        files.push(...this.getAllFilesSync(fullPath));
      } else if (stat.isFile()) {
        files.push(fullPath);
      }
    }
    
    return files;
  }
}

// Create instance for execution
const stepInstance = new CodeQualityAnalysisStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
}; 