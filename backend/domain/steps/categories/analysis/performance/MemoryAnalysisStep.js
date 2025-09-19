/**
 * Memory Analysis Step - Specialized Memory Performance Analysis
 * Analyzes memory usage patterns and optimizations
 * 
 * Created: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
 * Purpose: Specialized step for memory performance analysis and optimization
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const fs = require('fs').promises;
const path = require('path');

const logger = new Logger('memory_analysis_step');

// Step configuration
const config = {
  name: 'MemoryAnalysisStep',
  type: 'analysis',
  description: 'Analyzes memory usage patterns and optimizations',
  category: 'performance',
  version: '1.0.0',
  dependencies: [],
  settings: {
    timeout: 30000,
    includeMetrics: true,
    includeOptimizations: true,
    includeBottlenecks: true
  },
  validation: {
    requiredFiles: ['package.json'],
    supportedProjects: ['nodejs', 'react', 'vue', 'angular', 'express', 'nest']
  }
};

class MemoryAnalysisStep {
  constructor() {
    MemoryAnalysisStep = 'MemoryAnalysisStep';
    this.description = 'Analyzes memory usage patterns and optimizations';
    this.category = 'performance';
    this.dependencies = [];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = MemoryAnalysisStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`⚡ Executing ${MemoryAnalysisStep}...`);
      
      // Validate context
      this.validateContext(context);

      const projectPath = context.projectPath;
      const projectId = context.projectId;
      
      logger.info(`📊 Starting memory performance analysis for: ${projectPath}`);

      // Execute memory performance analysis
      const memory = await this.analyzeMemoryPerformance(projectPath, {
        includeMetrics: context.includeMetrics !== false,
        includeOptimizations: context.includeOptimizations !== false,
        includeBottlenecks: context.includeBottlenecks !== false
      });

      // Clean and format result - Return only standardized format
      const cleanResult = this.cleanResult(memory);

      // Generate recommendations if requested
      if (context.includeRecommendations !== false) {
        cleanResult.recommendations = this.generateRecommendations(cleanResult);
      }

      // Generate tasks if requested
      if (context.generateTasks !== false) {
        cleanResult.tasks = await this.generateTasks(cleanResult, context);
      }

      // Generate documentation if requested
      if (context.includeDocumentation !== false) {
        cleanResult.documentation = await this.createDocumentation(cleanResult, projectPath, context);
      }

      logger.info(`✅ Memory performance analysis completed successfully`);

      return {
        success: true,
        result: cleanResult,
        metadata: {
          stepName: "MemoryAnalysisStep",
          projectPath,
          projectId,
          timestamp: new Date()
        }
      };

    } catch (error) {
      logger.error(`❌ Memory performance analysis failed: ${error.message}`);
      
      return {
        success: false,
        error: error.message,
        metadata: {
          stepName: "MemoryAnalysisStep",
          projectPath: context.projectPath,
          timestamp: new Date()
        }
      };
    }
  }

  /**
   * Analyze memory performance for a project
   */
  async analyzeMemoryPerformance(projectPath, options = {}) {
    try {
      const metrics = {};
      const optimizations = [];
      const bottlenecks = [];

      // Analyze bundle size and memory impact
      const bundleAnalysis = await this.analyzeBundleSize(projectPath);
      metrics.bundle = bundleAnalysis.metrics;
      optimizations.push(...bundleAnalysis.optimizations);
      bottlenecks.push(...bundleAnalysis.bottlenecks);

      // Analyze code for memory patterns
      const codeAnalysis = await this.analyzeCodeMemoryPatterns(projectPath);
      metrics.code = codeAnalysis.metrics;
      optimizations.push(...codeAnalysis.optimizations);
      bottlenecks.push(...codeAnalysis.bottlenecks);

      // Analyze static assets
      const assetsAnalysis = await this.analyzeStaticAssets(projectPath);
      metrics.assets = assetsAnalysis.metrics;
      optimizations.push(...assetsAnalysis.optimizations);
      bottlenecks.push(...assetsAnalysis.bottlenecks);

      // Calculate memory performance metrics
      const memoryScore = this.calculateMemoryScore(bottlenecks);
      const coverage = this.calculateCoverage(projectPath);
      const confidence = this.calculateConfidence({ metrics, optimizations, bottlenecks });

      return {
        metrics,
        optimizations,
        bottlenecks,
        performance: {
          memoryScore,
          coverage,
          confidence,
          totalOptimizations: optimizations.length,
          totalBottlenecks: bottlenecks.length
        }
      };

    } catch (error) {
      logger.error(`Memory performance analysis failed: ${error.message}`);
      return {
        metrics: {},
        optimizations: [],
        bottlenecks: [],
        performance: {
          memoryScore: 0,
          coverage: 0,
          confidence: 0,
          totalOptimizations: 0,
          totalBottlenecks: 0
        }
      };
    }
  }

  /**
   * Analyze bundle size and memory impact
   */
  async analyzeBundleSize(projectPath) {
    try {
      const metrics = {};
      const optimizations = [];
      const bottlenecks = [];

      // Analyze package.json for dependencies
      const packageJsonPath = path.join(projectPath, 'package.json');
      try {
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
        const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
        
        metrics.totalDependencies = Object.keys(dependencies).length;
        metrics.productionDependencies = Object.keys(packageJson.dependencies || {}).length;
        metrics.devDependencies = Object.keys(packageJson.devDependencies || {}).length;

        // Check for memory-heavy dependencies
        const memoryHeavyDependencies = [
          'lodash', 'moment', 'jquery', 'bootstrap', 'material-ui', 'antd',
          'chart.js', 'd3', 'three.js', 'pixi.js', 'babylon.js'
        ];

        const foundHeavyDeps = Object.keys(dependencies).filter(dep => 
          memoryHeavyDependencies.includes(dep)
        );

        if (foundHeavyDeps.length > 0) {
          bottlenecks.push({
            type: 'memory',
            severity: 'medium',
            message: `Memory-heavy dependencies detected: ${foundHeavyDeps.join(', ')}`,
            suggestion: 'Consider using lighter alternatives or implement tree-shaking',
            scanner: 'MemoryAnalysisStep'
          });
        }

        if (metrics.totalDependencies > 50) {
          bottlenecks.push({
            type: 'memory',
            severity: 'medium',
            message: 'High number of dependencies detected',
            suggestion: 'Review and remove unused dependencies to reduce memory footprint',
            scanner: 'MemoryAnalysisStep'
          });
        }

        // Check for optimization tools
        if (packageJson.devDependencies) {
          const optimizationTools = [
            'webpack-bundle-analyzer', 'source-map-explorer', 'bundle-analyzer',
            'webpack-bundle-size-analyzer', 'import-cost'
          ];

          const foundTools = Object.keys(packageJson.devDependencies).filter(dep =>
            optimizationTools.some(tool => dep.includes(tool))
          );

          if (foundTools.length > 0) {
            optimizations.push({
              type: 'memory',
              message: 'Bundle analysis tools detected',
              suggestion: 'Use these tools to identify memory-heavy packages',
              scanner: 'MemoryAnalysisStep'
            });
          }
        }

        // Check for tree-shaking support
        if (packageJson.sideEffects === false) {
          optimizations.push({
            type: 'memory',
            message: 'Tree-shaking enabled in package.json',
            suggestion: 'Good practice: enables webpack to remove unused code',
            scanner: 'MemoryAnalysisStep'
          });
        }

      } catch (error) {
        bottlenecks.push({
          type: 'memory',
          severity: 'high',
          message: 'Could not read package.json',
          suggestion: 'Ensure package.json exists and is valid JSON',
          scanner: 'MemoryAnalysisStep'
        });
      }

      return { metrics, optimizations, bottlenecks };
    } catch (error) {
      logger.error(`Bundle memory analysis failed: ${error.message}`);
      return { metrics: {}, optimizations: [], bottlenecks: [] };
    }
  }

  /**
   * Analyze code for memory patterns
   */
  async analyzeCodeMemoryPatterns(projectPath) {
    try {
      const metrics = {};
      const optimizations = [];
      const bottlenecks = [];
      const jsFiles = await this.getJavaScriptFiles(projectPath);

      metrics.totalFiles = jsFiles.length;
      let filesWithMemoryIssues = 0;

      for (const file of jsFiles) { // ANALYZE ALL FILES - NO LIMITS!
        try {
          const content = await fs.readFile(file, 'utf8');
          const fileAnalysis = this.analyzeFileMemoryPatterns(content, file);
          
          if (fileAnalysis.bottlenecks.length > 0) {
            filesWithMemoryIssues++;
            bottlenecks.push(...fileAnalysis.bottlenecks);
          }
          
          if (fileAnalysis.optimizations.length > 0) {
            optimizations.push(...fileAnalysis.optimizations);
          }
        } catch (error) {
          // Skip files that can't be read
        }
      }

      metrics.filesWithMemoryIssues = filesWithMemoryIssues;
      metrics.memoryIssueRate = jsFiles.length > 0 ? (filesWithMemoryIssues / jsFiles.length) * 100 : 0;

      return { metrics, optimizations, bottlenecks };
    } catch (error) {
      logger.error(`Code memory analysis failed: ${error.message}`);
      return { metrics: {}, optimizations: [], bottlenecks: [] };
    }
  }

  /**
   * Analyze file for memory patterns
   */
  analyzeFileMemoryPatterns(content, filePath) {
    const optimizations = [];
    const bottlenecks = [];

    // Memory leak patterns
    const memoryLeakPatterns = [
      {
        pattern: /setInterval\s*\(\s*[^,]+,\s*\d+\s*\)/,
        severity: 'medium',
        message: 'setInterval detected without clearInterval',
        suggestion: 'Ensure setInterval is cleared to prevent memory leaks',
        category: 'memory-leak'
      },
      {
        pattern: /setTimeout\s*\(\s*[^,]+,\s*\d+\s*\)/,
        severity: 'low',
        message: 'setTimeout detected',
        suggestion: 'Consider if setTimeout is necessary or could cause memory issues',
        category: 'memory-leak'
      },
      {
        pattern: /addEventListener\s*\(\s*['"`][^'"`]+['"`]\s*,\s*[^)]+\)/,
        severity: 'medium',
        message: 'Event listener detected',
        suggestion: 'Ensure event listeners are removed to prevent memory leaks',
        category: 'memory-leak'
      }
    ];

    // Memory optimization patterns
    const memoryOptimizationPatterns = [
      {
        pattern: /Object\.freeze\s*\(/,
        message: 'Object.freeze detected',
        suggestion: 'Good practice: prevents object modifications and reduces memory usage',
        category: 'memory-optimization'
      },
      {
        pattern: /WeakMap\s*\(/,
        message: 'WeakMap detected',
        suggestion: 'Good practice: allows garbage collection of keys',
        category: 'memory-optimization'
      },
      {
        pattern: /WeakSet\s*\(/,
        message: 'WeakSet detected',
        suggestion: 'Good practice: allows garbage collection of values',
        category: 'memory-optimization'
      },
      {
        pattern: /\.slice\s*\(\s*\)/,
        message: 'Array.slice() detected',
        suggestion: 'Good practice: creates shallow copy without modifying original',
        category: 'memory-optimization'
      }
    ];

    // Check for memory leak patterns
    memoryLeakPatterns.forEach(({ pattern, severity, message, suggestion, category }) => {
      if (pattern.test(content)) {
        bottlenecks.push({
          type: 'memory',
          severity,
          file: path.relative(process.cwd(), filePath),
          message,
          suggestion,
          category,
          scanner: 'MemoryAnalysisStep'
        });
      }
    });

    // Check for memory optimization patterns
    memoryOptimizationPatterns.forEach(({ pattern, message, suggestion, category }) => {
      if (pattern.test(content)) {
        optimizations.push({
          type: 'memory',
          file: path.relative(process.cwd(), filePath),
          message,
          suggestion,
          category,
          scanner: 'MemoryAnalysisStep'
        });
      }
    });

    return { optimizations, bottlenecks };
  }

  /**
   * Analyze static assets for memory impact
   */
  async analyzeStaticAssets(projectPath) {
    try {
      const metrics = {};
      const optimizations = [];
      const bottlenecks = [];

      const staticAssets = await this.getStaticAssets(projectPath);
      
      metrics.totalAssets = staticAssets.length;
      metrics.imageAssets = staticAssets.filter(asset => 
        asset.endsWith('.jpg') || asset.endsWith('.jpeg') || 
        asset.endsWith('.png') || asset.endsWith('.gif') || 
        asset.endsWith('.svg') || asset.endsWith('.webp')
      ).length;
      metrics.videoAssets = staticAssets.filter(asset => 
        asset.endsWith('.mp4') || asset.endsWith('.avi') || 
        asset.endsWith('.mov') || asset.endsWith('.webm')
      ).length;

      // Check for large assets
      let largeAssets = 0;
      for (const asset of staticAssets) { // ANALYZE ALL ASSETS - NO LIMITS!
        try {
          const stats = await fs.stat(asset);
          if (stats.size > 1024 * 1024) { // 1MB
            largeAssets++;
          }
        } catch (error) {
          // Skip files that can't be read
        }
      }

      if (largeAssets > 0) {
        bottlenecks.push({
          type: 'memory',
          severity: 'medium',
          message: `${largeAssets} large static assets detected`,
          suggestion: 'Consider optimizing images and videos for web delivery',
          scanner: 'MemoryAnalysisStep'
        });
      }

      // Check for optimization tools
      const packageJsonPath = path.join(projectPath, 'package.json');
      try {
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
        const optimizationTools = [
          'imagemin', 'gulp-imagemin', 'webpack-image-loader', 'file-loader'
        ];

        const foundTools = Object.keys(packageJson.devDependencies || {}).filter(dep =>
          optimizationTools.some(tool => dep.includes(tool))
        );

        if (foundTools.length > 0) {
          optimizations.push({
            type: 'memory',
            message: 'Asset optimization tools detected',
            suggestion: 'Use these tools to optimize static assets',
            scanner: 'MemoryAnalysisStep'
          });
        }
      } catch (error) {
        // Package.json not found or invalid
      }

      return { metrics, optimizations, bottlenecks };
    } catch (error) {
      logger.error(`Static assets analysis failed: ${error.message}`);
      return { metrics: {}, optimizations: [], bottlenecks: [] };
    }
  }

  /**
   * Get JavaScript files from project
   */
  async getJavaScriptFiles(projectPath) {
    try {
      const allFiles = await this.getAllFiles(projectPath);
      return allFiles.filter(file => 
        file.endsWith('.js') || 
        file.endsWith('.jsx') || 
        file.endsWith('.ts') || 
        file.endsWith('.tsx')
      );
    } catch (error) {
      logger.error(`Failed to get JavaScript files: ${error.message}`);
      return [];
    }
  }

  /**
   * Get static assets from project
   */
  async getStaticAssets(projectPath) {
    try {
      const allFiles = await this.getAllFiles(projectPath);
      return allFiles.filter(file => 
        file.endsWith('.jpg') || file.endsWith('.jpeg') || 
        file.endsWith('.png') || file.endsWith('.gif') || 
        file.endsWith('.svg') || file.endsWith('.webp') ||
        file.endsWith('.mp4') || file.endsWith('.avi') || 
        file.endsWith('.mov') || file.endsWith('.webm') ||
        file.endsWith('.mp3') || file.endsWith('.wav') || 
        file.endsWith('.ogg')
      );
    } catch (error) {
      logger.error(`Failed to get static assets: ${error.message}`);
      return [];
    }
  }

  /**
   * Get all files recursively from directory
   */
  async getAllFiles(dir) {
    const files = [];
    
    try {
      const items = await fs.readdir(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = await fs.stat(fullPath);
        
        if (stat.isDirectory()) {
          // Skip node_modules and other common exclusions
          if (!['node_modules', '.git', 'dist', 'build', 'coverage', '.next'].includes(item)) {
            files.push(...await this.getAllFiles(fullPath));
          }
        } else {
          files.push(fullPath);
        }
      }
    } catch (error) {
      logger.warn(`Could not read directory: ${dir}`);
    }
    
    return files;
  }

  /**
   * Clean and format result
   */
  cleanResult(result) {
    // Convert optimizations and bottlenecks to standardized issues
    const issues = [];
    
    if (result.optimizations && result.optimizations.length > 0) {
      issues.push(...result.optimizations.map(opt => ({
        id: `opt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        category: 'performance',
        subcategory: 'optimization',
        severity: 'low',
        title: opt.title || 'Performance Optimization Available',
        description: opt.description || 'Performance optimization opportunity identified',
        file: opt.file || 'unknown',
        line: opt.line || 0,
        suggestion: opt.suggestion || 'Consider implementing performance optimization',
        metadata: {
          scanner: 'memory-analysis',
          confidence: opt.confidence || 80
        }
      })));
    }
    
    if (result.bottlenecks && result.bottlenecks.length > 0) {
      issues.push(...result.bottlenecks.map(bottleneck => ({
        id: `bottleneck-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        category: 'performance',
        subcategory: 'bottleneck',
        severity: bottleneck.severity || 'medium',
        title: bottleneck.title || 'Performance Bottleneck Detected',
        description: bottleneck.description || 'Performance bottleneck identified',
        file: bottleneck.file || 'unknown',
        line: bottleneck.line || 0,
        suggestion: bottleneck.suggestion || 'Address performance bottleneck',
        metadata: {
          scanner: 'memory-analysis',
          confidence: bottleneck.confidence || 85
        }
      })));
    }

    return {
      issues,
      recommendations: [],
      tasks: [],
      documentation: []
    };
  }

  /**
   * Validate execution context
   */
  validateContext(context) {
    if (!context.projectPath) {
      throw new Error('Project path is required');
    }
  }

  /**
   * Calculate memory performance score
   */
  calculateMemoryScore(bottlenecks) {
    if (!bottlenecks || bottlenecks.length === 0) return 100;

    const severityWeights = {
      critical: 20,
      high: 15,
      medium: 8,
      low: 3
    };

    const totalWeight = bottlenecks.reduce((sum, bottleneck) => {
      return sum + (severityWeights[bottleneck.severity] || 1);
    }, 0);

    const maxScore = 100;
    const score = Math.max(0, maxScore - totalWeight);
    
    return Math.round(score);
  }

  /**
   * Calculate analysis coverage
   */
  calculateCoverage(projectPath) {
    // Memory analysis coverage calculation
    return 85; // 85% coverage for memory analysis
  }

  /**
   * Calculate analysis confidence
   */
  calculateConfidence(result) {
    const { metrics, optimizations, bottlenecks } = result;
    
    if (!metrics && !optimizations && !bottlenecks) return 0;
    
    const totalIssues = (optimizations?.length || 0) + (bottlenecks?.length || 0);
    
    if (totalIssues === 0) return 60; // Medium confidence when no issues found
    
    // Higher confidence when more issues are found (indicates thorough analysis)
    return Math.min(100, Math.round(40 + (totalIssues * 2)));
  }

  /**
   * Generate issues from analysis results
   * @param {Object} result - Analysis result
   * @returns {Array} Issues array
   */
  generateIssues(result) {
    const issues = [];
    
    // Check for low analysis score
    if (result.score < 70) {
      issues.push({
        type: 'low-analysis-score',
        title: 'Low Analysis Score',
        description: `Analysis score of ${result.score}% indicates areas for improvement`,
        severity: 'medium',
        priority: 'medium',
        category: this.category,
        source: MemoryAnalysisStep,
        location: 'analysis-results',
        suggestion: 'Improve analysis results by addressing identified issues'
      });
    }

    // Check for critical issues
    if (result.vulnerabilities && result.vulnerabilities.some(v => v.severity === 'critical')) {
      issues.push({
        type: 'critical-issues',
        title: 'Critical Issues Detected',
        description: 'Critical issues found in the analysis',
        severity: 'critical',
        priority: 'critical',
        category: this.category,
        source: MemoryAnalysisStep,
        location: 'analysis-results',
        suggestion: 'Immediately address critical issues'
      });
    }

    // Check for high severity issues
    if (result.vulnerabilities && result.vulnerabilities.some(v => v.severity === 'high')) {
      issues.push({
        type: 'high-issues',
        title: 'High Severity Issues Detected',
        description: 'High severity issues found in the analysis',
        severity: 'high',
        priority: 'high',
        category: this.category,
        source: MemoryAnalysisStep,
        location: 'analysis-results',
        suggestion: 'Address high severity issues promptly'
      });
    }

    return issues;
  }
  /**
   * Generate recommendations from analysis results
   * @param {Object} result - Analysis result
   * @returns {Array} Recommendations array
   */
  generateRecommendations(result) {
    const recommendations = [];
    
    // Check for low analysis score
    if (result.score < 80) {
      recommendations.push({
        type: 'improve-score',
        title: 'Improve Analysis Score',
        description: `Current score of ${result.score}% can be improved`,
        priority: 'medium',
        category: this.category,
        source: MemoryAnalysisStep,
        action: 'Implement best practices to improve analysis score',
        impact: 'Better code quality and maintainability'
      });
    }

    // Check for missing patterns
    if (result.patterns && result.patterns.length < 3) {
      recommendations.push({
        type: 'add-patterns',
        title: 'Add More Design Patterns',
        description: 'Consider implementing additional design patterns',
        priority: 'medium',
        category: this.category,
        source: MemoryAnalysisStep,
        action: 'Research and implement appropriate design patterns',
        impact: 'Improved code organization and maintainability'
      });
    }

    // Check for security improvements
    if (result.vulnerabilities && result.vulnerabilities.length > 0) {
      recommendations.push({
        type: 'security-improvements',
        title: 'Address Security Vulnerabilities',
        description: `${result.vulnerabilities.length} vulnerabilities found`,
        priority: 'high',
        category: this.category,
        source: MemoryAnalysisStep,
        action: 'Review and fix identified security vulnerabilities',
        impact: 'Enhanced security posture'
      });
    }

    // Check for performance improvements
    if (result.metrics && result.metrics.performanceScore < 80) {
      recommendations.push({
        type: 'performance-improvements',
        title: 'Improve Performance',
        description: 'Performance analysis indicates room for improvement',
        priority: 'medium',
        category: this.category,
        source: MemoryAnalysisStep,
        action: 'Optimize code for better performance',
        impact: 'Faster execution and better user experience'
      });
    }

    return recommendations;
  }
  /**
   * Generate tasks from analysis results
   * @param {Object} result - Analysis result
   * @param {Object} context - Execution context
   * @returns {Array} Tasks array
   */
  async generateTasks(result, context) {
    const tasks = [];
    const projectId = context.projectId || 'default-project';
    
    // Create main improvement task
    const mainTask = {
      id: `${MemoryAnalysisStep.toLowerCase()}-improvement-${Date.now()}`,
      title: `Improve ${MemoryAnalysisStep} Results`,
      description: `Address issues and implement recommendations from ${MemoryAnalysisStep} analysis`,
      type: 'improvement',
      category: this.category,
      priority: 'medium',
      status: 'pending',
      projectId: projectId,
      metadata: {
        source: MemoryAnalysisStep,
        score: result.score || 0,
        issues: result.issues ? result.issues.length : 0,
        recommendations: result.recommendations ? result.recommendations.length : 0
      },
      estimatedHours: this.calculateEstimatedHours(result),
      phase: 'improvement',
      stage: 'planning'
    };
    
    tasks.push(mainTask);
    
    // Create subtasks for critical issues
    if (result.issues && result.issues.some(issue => issue.severity === 'critical')) {
      const criticalTask = {
        id: `${MemoryAnalysisStep.toLowerCase()}-critical-${Date.now()}`,
        title: `Fix Critical Issues from ${MemoryAnalysisStep}`,
        description: 'Address critical issues identified in analysis',
        type: 'fix',
        category: this.category,
        priority: 'critical',
        status: 'pending',
        projectId: projectId,
        parentTaskId: mainTask.id,
        metadata: {
          source: MemoryAnalysisStep,
          issues: result.issues.filter(issue => issue.severity === 'critical')
        },
        estimatedHours: 4,
        phase: 'critical-fixes',
        stage: 'implementation'
      };
      tasks.push(criticalTask);
    }
    
    // Create subtasks for high priority issues
    if (result.issues && result.issues.some(issue => issue.severity === 'high')) {
      const highTask = {
        id: `${MemoryAnalysisStep.toLowerCase()}-high-${Date.now()}`,
        title: `Fix High Priority Issues from ${MemoryAnalysisStep}`,
        description: 'Address high priority issues identified in analysis',
        type: 'fix',
        category: this.category,
        priority: 'high',
        status: 'pending',
        projectId: projectId,
        parentTaskId: mainTask.id,
        metadata: {
          source: MemoryAnalysisStep,
          issues: result.issues.filter(issue => issue.severity === 'high')
        },
        estimatedHours: 3,
        phase: 'high-fixes',
        stage: 'implementation'
      };
      tasks.push(highTask);
    }
    
    return tasks;
  }

  /**
   * Calculate estimated hours for tasks
   * @param {Object} result - Analysis result
   * @returns {number} Estimated hours
   */
  calculateEstimatedHours(result) {
    let totalHours = 2; // Base hours for improvement
    
    if (result.issues) {
      result.issues.forEach(issue => {
        switch (issue.severity) {
          case 'critical':
            totalHours += 2;
            break;
          case 'high':
            totalHours += 1.5;
            break;
          case 'medium':
            totalHours += 1;
            break;
          case 'low':
            totalHours += 0.5;
            break;
        }
      });
    }
    
    if (result.recommendations) {
      totalHours += result.recommendations.length * 0.5;
    }
    
    return Math.round(totalHours * 10) / 10; // Round to 1 decimal place
  }

  /**
   * Create documentation from analysis results
   * @param {Object} result - Analysis result
   * @param {string} projectPath - Project path
   * @param {Object} context - Execution context
   * @returns {Array} Documentation array
   */
  async createDocumentation(result, projectPath, context) {
    const docs = [];
    const docsDir = path.join(projectPath, `{{taskDocumentationPath}}${this.category}/${MemoryAnalysisStep.toLowerCase()}`);
    
    // Ensure docs directory exists
    await fs.mkdir(docsDir, { recursive: true });
    
    // Create implementation file
    const implementationDoc = await this.createImplementationDoc(result, docsDir);
    docs.push(implementationDoc);
    
    // Create analysis report
    const analysisReport = await this.createAnalysisReport(result, docsDir);
    docs.push(analysisReport);
    
    return docs;
  }

  /**
   * Create implementation documentation
   * @param {Object} result - Analysis result
   * @param {string} docsDir - Documentation directory
   * @returns {Object} Implementation document
   */
  async createImplementationDoc(result, docsDir) {
    const docPath = path.join(docsDir, 'memory-analysis-implementation.md');
    
    const content = `# Memory Performance Analysis Implementation

## 📋 Analysis Overview
- **Step Name**: ${MemoryAnalysisStep}
- **Category**: ${this.category}
- **Analysis Date**: ${new Date().toISOString()}
- **Score**: ${result.summary?.memoryScore || 0}%
- **Coverage**: ${result.summary?.coverage || 0}%

## 📊 Analysis Results
- **Optimizations**: ${result.summary?.totalOptimizations || 0}
- **Bottlenecks**: ${result.summary?.totalBottlenecks || 0}
- **Confidence**: ${result.summary?.confidence || 0}%

## 🎯 Key Findings
${result.optimizations ? result.optimizations.map(opt => `- **${opt.type}**: ${opt.description}`).join('\n') : '- No optimizations detected'}

## 📝 Recommendations
${result.recommendations ? result.recommendations.map(rec => `- **${rec.title}**: ${rec.description}`).join('\n') : '- No recommendations'}

## 🔧 Implementation Tasks
${result.tasks ? result.tasks.map(task => `- **${task.title}**: ${task.description} (${task.estimatedHours}h)`).join('\n') : '- No tasks generated'}
`;

    await fs.writeFile(docPath, content, 'utf8');
    
    return {
      type: 'implementation',
      title: 'Memory Performance Analysis Implementation',
      path: docPath,
      category: this.category,
      source: MemoryAnalysisStep
    };
  }

  /**
   * Create analysis report
   * @param {Object} result - Analysis result
   * @param {string} docsDir - Documentation directory
   * @returns {Object} Analysis report
   */
  async createAnalysisReport(result, docsDir) {
    const docPath = path.join(docsDir, 'memory-analysis-report.md');
    
    const content = `# Memory Performance Analysis Report

## 📊 Executive Summary
Memory performance analysis completed with a score of ${result.summary?.memoryScore || 0}% and ${result.summary?.coverage || 0}% coverage.

## 🔍 Detailed Analysis
${result.bottlenecks ? result.bottlenecks.map(bottleneck => `
### ${bottleneck.type} Bottleneck
- **Description**: ${bottleneck.description}
- **Severity**: ${bottleneck.severity}
- **Suggestion**: ${bottleneck.suggestion}
`).join('\n') : 'No bottlenecks found'}

## 📈 Metrics
- **Optimizations**: ${result.summary?.totalOptimizations || 0} opportunities
- **Bottlenecks**: ${result.summary?.totalBottlenecks || 0} issues found
- **Confidence**: ${result.summary?.confidence || 0}% analysis confidence

## 🎯 Next Steps
Based on the analysis, consider implementing memory optimizations to improve performance and reduce memory usage.
`;

    await fs.writeFile(docPath, content, 'utf8');
    
    return {
      type: 'report',
      title: 'Memory Performance Analysis Report',
      path: docPath,
      category: this.category,
      source: MemoryAnalysisStep
    };
  }
}

// Create instance for execution
const stepInstance = new MemoryAnalysisStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
};