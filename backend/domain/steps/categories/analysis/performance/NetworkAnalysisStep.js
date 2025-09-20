/**
 * Network Analysis Step - Performance Analysis Step
 * Analyzes network performance patterns and optimizations
 * 
 * Created: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
 * Purpose: Specialized network performance analysis for build configurations and resource optimization
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const fs = require('fs').promises;
const path = require('path');

const logger = new Logger('network_analysis_step');

// Step configuration
const config = {
  name: 'NetworkAnalysisStep',
  type: 'analysis',
  description: 'Analyzes network performance patterns and optimizations',
  category: 'analysis',
  subcategory: 'performance',
  version: '1.0.0',
  dependencies: [],
  settings: {
    timeout: 30000,
    includeBuildConfig: true,
    includeResourceUsage: true,
    includeOptimizations: true
  },
  validation: {
    requiredFiles: ['package.json'],
    supportedProjects: ['nodejs', 'react', 'vue', 'angular', 'express', 'nest']
  }
};

class NetworkAnalysisStep {
  constructor() {
    this.name = 'NetworkAnalysisStep';
    this.description = 'Analyzes network performance patterns and optimizations';
    this.category = 'analysis';
    this.subcategory = 'performance';
    this.dependencies = [];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = NetworkAnalysisStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`⚡ Executing NetworkAnalysisStep...`);
      
      // Validate context
      this.validateContext(context);

      const projectPath = context.projectPath;
      
      logger.info(`🌐 Starting network performance analysis for: ${projectPath}`);

      // Execute network performance analysis
      const networkAnalysis = await this.analyzeNetworkPerformance(projectPath, {
        includeBuildConfig: context.includeBuildConfig !== false,
        includeResourceUsage: context.includeResourceUsage !== false,
        includeOptimizations: context.includeOptimizations !== false
      });

      // Clean and format result
      const cleanResult = this.cleanResult(networkAnalysis);

      // Generate issues if requested
      if (context.includeIssues !== false) {
        cleanResult.issues = this.generateIssues(cleanResult);
      }

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

      logger.info(`✅ Network performance analysis completed successfully`);

      return {
        success: true,
        result: cleanResult,
        metadata: {
          stepName: "NetworkAnalysisStep",
          projectPath,
          timestamp: new Date()
        }
      };

    } catch (error) {
      logger.error(`❌ Network performance analysis failed: ${error.message}`);
      
      return {
        success: false,
        error: error.message,
        metadata: {
          stepName: "NetworkAnalysisStep",
          projectPath: context.projectPath,
          timestamp: new Date()
        }
      };
    }
  }

  /**
   * Analyze network performance for a project
   * @param {string} projectPath - Path to the project
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Network performance analysis result
   */
  async analyzeNetworkPerformance(projectPath, options = {}) {
    try {
      const metrics = {};
      const optimizations = [];
      const bottlenecks = [];

      // Analyze build configuration
      if (options.includeBuildConfig) {
        const buildAnalysis = await this.analyzeBuildConfiguration(projectPath);
        optimizations.push(...buildAnalysis.optimizations);
        bottlenecks.push(...buildAnalysis.bottlenecks);
        Object.assign(metrics, buildAnalysis.metrics);
      }

      // Analyze resource usage
      if (options.includeResourceUsage) {
        const resourceAnalysis = await this.analyzeResourceUsage(projectPath);
        optimizations.push(...resourceAnalysis.optimizations);
        bottlenecks.push(...resourceAnalysis.bottlenecks);
        Object.assign(metrics, resourceAnalysis.metrics);
      }

      // Calculate network performance score
      const networkScore = this.calculateNetworkScore({
        metrics,
        bottlenecks: bottlenecks.length,
        optimizations: optimizations.length
      });

      return {
        metrics,
        optimizations,
        bottlenecks,
        score: networkScore,
        level: this.getNetworkLevel(networkScore)
      };
    } catch (error) {
      logger.error(`Network performance analysis failed: ${error.message}`);
      return { 
        metrics: {}, 
        optimizations: [], 
        bottlenecks: [],
        score: 0,
        level: 'unknown'
      };
    }
  }

  /**
   * Analyze build configuration
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Build configuration analysis
   */
  async analyzeBuildConfiguration(projectPath) {
    try {
      const metrics = {};
      const optimizations = [];
      const bottlenecks = [];

      // Check for common build configuration files
      const buildFiles = [
        'webpack.config.js',
        'vite.config.js',
        'rollup.config.js',
        'babel.config.js',
        'tsconfig.json',
        'package.json'
      ];

      for (const buildFile of buildFiles) {
        const buildPath = path.join(projectPath, buildFile);
        try {
          const content = await fs.readFile(buildPath, 'utf8');
          const analysis = this.analyzeBuildFile(buildFile, content);
          optimizations.push(...analysis.optimizations);
          bottlenecks.push(...analysis.bottlenecks);
        } catch (error) {
          // File doesn't exist or can't be read
        }
      }

      metrics.buildFilesAnalyzed = buildFiles.length;

      return { metrics, optimizations, bottlenecks };
    } catch (error) {
      logger.error(`Build configuration analysis failed: ${error.message}`);
      return { metrics: {}, optimizations: [], bottlenecks: [] };
    }
  }

  /**
   * Analyze resource usage patterns
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Resource usage analysis
   */
  async analyzeResourceUsage(projectPath) {
    try {
      const metrics = {};
      const optimizations = [];
      const bottlenecks = [];

      // Analyze static assets
      const staticAssets = await this.getStaticAssets(projectPath);
      metrics.staticAssets = staticAssets.length;

      // Check for large assets
      const largeAssets = staticAssets.filter(asset => 
        asset.size > 1024 * 1024 // 1MB
      );

      if (largeAssets.length > 0) {
        bottlenecks.push({
          type: 'network',
          severity: 'medium',
          message: `${largeAssets.length} large static assets detected`,
          suggestion: 'Optimize images and compress large files for better network performance'
        });
      }

      // Check for optimization opportunities
      const imageFiles = staticAssets.filter(asset => 
        /\.(jpg|jpeg|png|gif|svg|webp)$/i.test(asset.path)
      );

      if (imageFiles.length > 0) {
        optimizations.push({
          type: 'network',
          message: `${imageFiles.length} image files detected`,
          suggestion: 'Use modern image formats (WebP) and implement lazy loading for better network performance'
        });
      }

      // Check for CDN usage
      const hasCdnConfig = await this.checkCdnConfiguration(projectPath);
      if (!hasCdnConfig) {
        bottlenecks.push({
          type: 'network',
          severity: 'low',
          message: 'No CDN configuration detected',
          suggestion: 'Consider using a CDN for static assets to improve network performance'
        });
      }

      return { metrics, optimizations, bottlenecks };
    } catch (error) {
      logger.error(`Resource usage analysis failed: ${error.message}`);
      return { metrics: {}, optimizations: [], bottlenecks: [] };
    }
  }

  /**
   * Analyze build configuration file
   * @param {string} filename - Build file name
   * @param {string} content - File content
   * @returns {Object} Build file analysis
   */
  analyzeBuildFile(filename, content) {
    const optimizations = [];
    const bottlenecks = [];

    switch (filename) {
      case 'webpack.config.js':
        if (content.includes('optimization')) {
          optimizations.push({
            type: 'network',
            message: 'Webpack optimization configured',
            suggestion: 'Review optimization settings for best network performance'
          });
        }
        
        if (!content.includes('splitChunks')) {
          bottlenecks.push({
            type: 'network',
            severity: 'medium',
            file: filename,
            message: 'No code splitting configuration detected',
            suggestion: 'Configure splitChunks for better caching and network performance'
          });
        }

        if (content.includes('compression')) {
          optimizations.push({
            type: 'network',
            message: 'Compression configured in webpack',
            suggestion: 'Good for reducing network payload size'
          });
        }
        break;

      case 'vite.config.js':
        if (content.includes('build.rollupOptions')) {
          optimizations.push({
            type: 'network',
            message: 'Vite build optimization configured',
            suggestion: 'Review rollup options for best network performance'
          });
        }

        if (content.includes('build.assetsInlineLimit')) {
          optimizations.push({
            type: 'network',
            message: 'Asset inlining configured',
            suggestion: 'Good for reducing HTTP requests'
          });
        }
        break;

      case 'tsconfig.json':
        try {
          const config = JSON.parse(content);
          if (config.compilerOptions && config.compilerOptions.incremental) {
            optimizations.push({
              type: 'network',
              message: 'TypeScript incremental compilation enabled',
              suggestion: 'Good for build performance and faster deployments'
            });
          }
        } catch (error) {
          // Invalid JSON
        }
        break;

      case 'package.json':
        try {
          const config = JSON.parse(content);
          if (config.scripts && config.scripts.build) {
            optimizations.push({
              type: 'network',
              message: 'Build script configured',
              suggestion: 'Ensure build process optimizes for network performance'
            });
          }
        } catch (error) {
          // Invalid JSON
        }
        break;
    }

    return { optimizations, bottlenecks };
  }

  /**
   * Check for CDN configuration
   * @param {string} projectPath - Project path
   * @returns {Promise<boolean>} Has CDN configuration
   */
  async checkCdnConfiguration(projectPath) {
    try {
      const configFiles = [
        'next.config.js',
        'nuxt.config.js',
        'vite.config.js',
        'webpack.config.js'
      ];

      for (const configFile of configFiles) {
        const configPath = path.join(projectPath, configFile);
        try {
          const content = await fs.readFile(configPath, 'utf8');
          if (content.includes('cdn') || content.includes('assetPrefix') || content.includes('publicPath')) {
            return true;
          }
        } catch (error) {
          // File doesn't exist
        }
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get static assets from project
   * @param {string} projectPath - Project path
   * @returns {Promise<Array>} Static assets
   */
  async getStaticAssets(projectPath) {
    const assets = [];
    const assetDirs = ['public', 'static', 'assets', 'images', 'media'];
    
    for (const dir of assetDirs) {
      const assetPath = path.join(projectPath, dir);
      try {
        const files = await this.getAllFiles(assetPath);
        for (const file of files) {
          try {
            const stat = await fs.stat(file);
            assets.push({
              path: file,
              size: stat.size,
              relativePath: path.relative(projectPath, file)
            });
          } catch (error) {
            // Skip files that can't be stat'd
          }
        }
      } catch (error) {
        // Directory doesn't exist
      }
    }
    
    return assets;
  }

  /**
   * Get all files from directory recursively
   * @param {string} dir - Directory path
   * @returns {Promise<Array>} All files
   */
  async getAllFiles(dir) {
    const files = [];
    
    try {
      const items = await fs.readdir(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = await fs.stat(fullPath);
        
        if (stat.isDirectory()) {
          if (!item.startsWith('.') && item !== 'node_modules' && item !== '.git') {
            files.push(...await this.getAllFiles(fullPath));
          }
        } else {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read
    }
    
    return files;
  }

  /**
   * Calculate network performance score
   * @param {Object} data - Analysis data
   * @returns {number} Network performance score (0-100)
   */
  calculateNetworkScore(data) {
    const { metrics, bottlenecks, optimizations } = data;
    
    // Base score starts at 100
    let score = 100;

    // Penalize for bottlenecks (up to -40 points)
    const bottleneckPenalty = Math.min(bottlenecks * 5, 40);
    score -= bottleneckPenalty;

    // Reward for optimizations (up to +30 points)
    const optimizationBonus = Math.min(optimizations * 3, 30);
    score += optimizationBonus;

    // Bonus for build configuration (up to +10 points)
    if (metrics.buildFilesAnalyzed > 0) {
      score += 10;
    }

    // Bonus for static assets optimization (up to +10 points)
    if (metrics.staticAssets > 0) {
      score += Math.min(metrics.staticAssets * 0.5, 10);
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Get network performance level
   * @param {number} score - Network performance score
   * @returns {string} Performance level
   */
  getNetworkLevel(score) {
    if (score >= 90) return 'excellent';
    if (score >= 80) return 'good';
    if (score >= 70) return 'fair';
    if (score >= 60) return 'poor';
    return 'critical';
  }

  /**
   * Clean and format result
   * @param {Object} result - Analysis result
   * @returns {Object} Cleaned result
   */
  cleanResult(result) {
    return {
      ...result,
      timestamp: new Date().toISOString(),
      step: NetworkAnalysisStep,
      category: 'performance',
      subcategory: 'network'
    };
  }

  /**
   * Validate execution context
   * @param {Object} context - Execution context
   */
  validateContext(context) {
    if (!context.projectPath) {
      throw new Error('Project path is required for network performance analysis');
    }
  }

  /**
   * Calculate analysis coverage
   * @param {Array} files - Analyzed files
   * @param {string} projectPath - Project path
   * @returns {number} Coverage percentage
   */
  calculateCoverage(files, projectPath) {
    // This is a simplified coverage calculation
    return Math.min((files.length / 50) * 100, 100);
  }

  /**
   * Calculate analysis confidence
   * @param {Object} result - Analysis result
   * @returns {number} Confidence percentage
   */
  calculateConfidence(result) {
    const { metrics, bottlenecks, optimizations } = result;
    
    if (!metrics || !bottlenecks || !optimizations) return 0;
    
    // Higher confidence with more data points
    const dataPoints = bottlenecks.length + optimizations.length;
    const baseConfidence = Math.min(dataPoints * 5, 80);
    
    // Additional confidence for comprehensive analysis
    const coverageBonus = metrics.buildFilesAnalyzed > 0 ? 20 : 0;
    
    return Math.min(baseConfidence + coverageBonus, 100);
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
        category: 'performance',
        source: 'NetworkAnalysisStep',
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
        category: 'performance',
        source: 'NetworkAnalysisStep',
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
        category: 'performance',
        source: 'NetworkAnalysisStep',
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
        category: 'performance',
        source: 'NetworkAnalysisStep',
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
        category: 'performance',
        source: 'NetworkAnalysisStep',
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
        category: 'performance',
        source: 'NetworkAnalysisStep',
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
        category: 'performance',
        source: 'NetworkAnalysisStep',
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
      id: `network-analysis-step-improvement-${Date.now()}`,
      title: `Improve ${NetworkAnalysisStep} Results`,
      description: `Address issues and implement recommendations from ${NetworkAnalysisStep} analysis`,
      type: 'improvement',
      category: 'performance',
      priority: 'medium',
      status: 'pending',
      projectId: projectId,
      metadata: {
        source: 'NetworkAnalysisStep',
        score: result.score || 0,
        issues: result.issues ? result.issues.length : 0,
        recommendations: result.recommendations ? result.recommendations.length : 0
      },
      estimatedHours: 4,
      phase: 'improvement',
      stage: 'planning'
    };
    
    tasks.push(mainTask);
    
    // Create subtasks for critical issues
    if (result.issues && result.issues.some(issue => issue.severity === 'critical')) {
      const criticalTask = {
        id: `network-analysis-step-critical-${Date.now()}`,
        title: `Fix Critical Issues from ${NetworkAnalysisStep}`,
        description: 'Address critical issues identified in analysis',
        type: 'fix',
        category: 'performance',
        priority: 'critical',
        status: 'pending',
        projectId: projectId,
        parentTaskId: mainTask.id,
        metadata: {
          source: 'NetworkAnalysisStep',
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
        id: `network-analysis-step-high-${Date.now()}`,
        title: `Fix High Priority Issues from ${NetworkAnalysisStep}`,
        description: 'Address high priority issues identified in analysis',
        type: 'fix',
        category: 'performance',
        priority: 'high',
        status: 'pending',
        projectId: projectId,
        parentTaskId: mainTask.id,
        metadata: {
          source: 'NetworkAnalysisStep',
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
    const docsDir = path.join(projectPath, 'docs', 'analysis', 'performance', 'network-analysis-step');
    
    // Ensure directory exists
    try {
      await fs.mkdir(docsDir, { recursive: true });
    } catch (error) {
      // Directory might already exist, continue
    }
    
    
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
    const docPath = path.join(docsDir, 'network-analysis-implementation.md');
    
    const content = `# Network Performance Analysis Implementation

## 📋 Analysis Overview
- **Step Name**: ${NetworkAnalysisStep}
- **Category**: performance
- **Analysis Date**: ${new Date().toISOString()}
- **Score**: ${result.score || 0}%
- **Level**: ${result.level || 'unknown'}

## 📊 Analysis Results
- **Build Files**: ${result.metrics?.buildFilesAnalyzed || 0}
- **Static Assets**: ${result.metrics?.staticAssets || 0}
- **Files Analyzed**: ${result.metrics?.totalFiles || 0}

## 🎯 Key Findings
${result.bottlenecks ? result.bottlenecks.map(bottleneck => `- **${bottleneck.type}**: ${bottleneck.description}`).join('\n') : '- No bottlenecks detected'}

## 📝 Recommendations
${result.recommendations ? result.recommendations.map(rec => `- **${rec.title}**: ${rec.description}`).join('\n') : '- No recommendations'}

## 🔧 Implementation Tasks
${result.tasks ? result.tasks.map(task => `- **${task.title}**: ${task.description} (${task.estimatedHours}h)`).join('\n') : '- No tasks generated'}
`;

    await fs.writeFile(docPath, content, 'utf8');
    
    return {
      type: 'implementation',
      title: 'Network Performance Analysis Implementation',
      path: docPath,
      category: 'performance',
      source: NetworkAnalysisStep
    };
  }

  /**
   * Create analysis report
   * @param {Object} result - Analysis result
   * @param {string} docsDir - Documentation directory
   * @returns {Object} Analysis report
   */
  async createAnalysisReport(result, docsDir) {
    const docPath = path.join(docsDir, 'network-analysis-report.md');
    
    const content = `# Network Performance Analysis Report

## 📊 Executive Summary
Network performance analysis completed with a score of ${result.score || 0}% (${result.level || 'unknown'} level).

## 🔍 Detailed Analysis
${result.bottlenecks ? result.bottlenecks.map(bottleneck => `
### ${bottleneck.type} Bottleneck
- **File**: ${bottleneck.file || 'N/A'}
- **Description**: ${bottleneck.description}
- **Severity**: ${bottleneck.severity}
- **Suggestion**: ${bottleneck.suggestion}
`).join('\n') : 'No bottlenecks found'}

## 📈 Metrics
- **Build Files**: ${result.metrics?.buildFilesAnalyzed || 0} analyzed
- **Static Assets**: ${result.metrics?.staticAssets || 0} found
- **File Coverage**: ${result.metrics?.totalFiles || 0} files analyzed

## 🎯 Next Steps
Based on the analysis, consider optimizing network performance through better build configurations and asset optimization.
`;

    await fs.writeFile(docPath, content, 'utf8');
    
    return {
      type: 'report',
      title: 'Network Performance Analysis Report',
      path: docPath,
      category: 'performance',
      source: NetworkAnalysisStep
    };
  }
}

// Create instance for execution
const stepInstance = new NetworkAnalysisStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
};