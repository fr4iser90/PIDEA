/**
 * Database Analysis Step - Performance Analysis Step
 * Analyzes database performance patterns and optimizations
 * 
 * Created: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
 * Purpose: Specialized database performance analysis for database queries and connection patterns
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const fs = require('fs').promises;
const path = require('path');

const logger = new Logger('database_analysis_step');

// Step configuration
const config = {
  name: 'DatabaseAnalysisStep',
  type: 'analysis',
  description: 'Analyzes database performance patterns and optimizations',
  category: 'analysis',
  subcategory: 'performance',
  version: '1.0.0',
  dependencies: [],
  settings: {
    timeout: 30000,
    includeQueries: true,
    includeConnections: true,
    includeOptimizations: true
  },
  validation: {
    requiredFiles: ['package.json'],
    supportedProjects: ['nodejs', 'react', 'vue', 'angular', 'express', 'nest']
  }
};

class DatabaseAnalysisStep {
  constructor() {
    this.name = 'DatabaseAnalysisStep';
    this.description = 'Analyzes database performance patterns and optimizations';
    this.category = 'analysis';
    this.subcategory = 'performance';
    this.dependencies = [];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = DatabaseAnalysisStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`⚡ Executing DatabaseAnalysisStep...`);
      
      // Validate context
      this.validateContext(context);

      const projectPath = context.projectPath;
      
      logger.info(`🗄️ Starting database performance analysis for: ${projectPath}`);

      // Execute database performance analysis
      const databaseAnalysis = await this.analyzeDatabasePerformance(projectPath, {
        includeQueries: context.includeQueries !== false,
        includeConnections: context.includeConnections !== false,
        includeOptimizations: context.includeOptimizations !== false
      });

      // Clean and format result
      const cleanResult = this.cleanResult(databaseAnalysis);

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

      logger.info(`✅ Database performance analysis completed successfully`);

      return {
        success: true,
        result: cleanResult,
        metadata: {
          stepName: "DatabaseAnalysisStep",
          projectPath,
          timestamp: new Date()
        }
      };

    } catch (error) {
      logger.error(`❌ Database performance analysis failed: ${error.message}`);
      
      return {
        success: false,
        error: error.message,
        metadata: {
          stepName: "DatabaseAnalysisStep",
          projectPath: context.projectPath,
          timestamp: new Date()
        }
      };
    }
  }

  /**
   * Analyze database performance for a project
   * @param {string} projectPath - Path to the project
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Database performance analysis result
   */
  async analyzeDatabasePerformance(projectPath, options = {}) {
    try {
      const metrics = {};
      const optimizations = [];
      const bottlenecks = [];

      // Analyze database queries
      if (options.includeQueries) {
        const queryAnalysis = await this.analyzeDatabaseQueries(projectPath);
        optimizations.push(...queryAnalysis.optimizations);
        bottlenecks.push(...queryAnalysis.bottlenecks);
        Object.assign(metrics, queryAnalysis.metrics);
      }

      // Analyze database connections
      if (options.includeConnections) {
        const connectionAnalysis = await this.analyzeDatabaseConnections(projectPath);
        optimizations.push(...connectionAnalysis.optimizations);
        bottlenecks.push(...connectionAnalysis.bottlenecks);
        Object.assign(metrics, connectionAnalysis.metrics);
      }

      // Calculate database performance score
      const databaseScore = this.calculateDatabaseScore({
        metrics,
        bottlenecks: bottlenecks.length,
        optimizations: optimizations.length
      });

      return {
        metrics,
        optimizations,
        bottlenecks,
        score: databaseScore,
        level: this.getDatabaseLevel(databaseScore)
      };
    } catch (error) {
      logger.error(`Database performance analysis failed: ${error.message}`);
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
   * Analyze database queries
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Query analysis result
   */
  async analyzeDatabaseQueries(projectPath) {
    try {
      const metrics = {};
      const optimizations = [];
      const bottlenecks = [];
      const jsFiles = await this.getJavaScriptFiles(projectPath);

      metrics.totalFiles = jsFiles.length;
      let filesWithQueries = 0;
      let filesWithIssues = 0;

      for (const file of jsFiles) { // ANALYZE ALL FILES - NO LIMITS!
        try {
          const content = await fs.readFile(file, 'utf8');
          const fileAnalysis = this.analyzeFileDatabaseQueries(content, file);
          
          if (fileAnalysis.queries.length > 0) {
            filesWithQueries++;
          }
          
          if (fileAnalysis.bottlenecks.length > 0) {
            filesWithIssues++;
            bottlenecks.push(...fileAnalysis.bottlenecks);
          }
          
          if (fileAnalysis.optimizations.length > 0) {
            optimizations.push(...fileAnalysis.optimizations);
          }
        } catch (error) {
          // Skip files that can't be read
        }
      }

      metrics.filesWithQueries = filesWithQueries;
      metrics.filesWithIssues = filesWithIssues;

      return { metrics, optimizations, bottlenecks };
    } catch (error) {
      logger.error(`Database query analysis failed: ${error.message}`);
      return { metrics: {}, optimizations: [], bottlenecks: [] };
    }
  }

  /**
   * Analyze database connections
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Connection analysis result
   */
  async analyzeDatabaseConnections(projectPath) {
    try {
      const metrics = {};
      const optimizations = [];
      const bottlenecks = [];

      // Check for database configuration files
      const configFiles = [
        'database.config.js',
        'db.config.js',
        'knexfile.js',
        'sequelize.config.js',
        'prisma/schema.prisma',
        '.env',
        '.env.example'
      ];

      for (const configFile of configFiles) {
        const configPath = path.join(projectPath, configFile);
        try {
          const content = await fs.readFile(configPath, 'utf8');
          const analysis = this.analyzeDatabaseConfig(configFile, content);
          optimizations.push(...analysis.optimizations);
          bottlenecks.push(...analysis.bottlenecks);
        } catch (error) {
          // File doesn't exist or can't be read
        }
      }

      // Check for connection pooling
      const hasConnectionPooling = await this.checkConnectionPooling(projectPath);
      if (hasConnectionPooling) {
        optimizations.push({
          type: 'database',
          message: 'Connection pooling detected',
          suggestion: 'Good for managing database connections efficiently'
        });
      } else {
        bottlenecks.push({
          type: 'database',
          severity: 'medium',
          message: 'No connection pooling detected',
          suggestion: 'Implement connection pooling for better database performance'
        });
      }

      metrics.configFilesAnalyzed = configFiles.length;

      return { metrics, optimizations, bottlenecks };
    } catch (error) {
      logger.error(`Database connection analysis failed: ${error.message}`);
      return { metrics: {}, optimizations: [], bottlenecks: [] };
    }
  }

  /**
   * Analyze file database queries
   * @param {string} content - File content
   * @param {string} filePath - File path
   * @returns {Object} File analysis result
   */
  analyzeFileDatabaseQueries(content, filePath) {
    const queries = [];
    const optimizations = [];
    const bottlenecks = [];

    // Check for database query patterns
    const queryPatterns = [
      { 
        pattern: /SELECT\s+\*\s+FROM/i, 
        message: 'SELECT * query detected',
        suggestion: 'Specify only needed columns to reduce data transfer',
        severity: 'medium'
      },
      { 
        pattern: /WHERE\s+.*\s+LIKE\s+['"]%[^%]*%['"]/i, 
        message: 'Leading wildcard LIKE query detected',
        suggestion: 'Avoid leading wildcards as they prevent index usage',
        severity: 'high'
      },
      { 
        pattern: /ORDER BY\s+.*\s+DESC/i, 
        message: 'DESC ordering detected',
        suggestion: 'Consider if DESC ordering is necessary for performance',
        severity: 'low'
      },
      { 
        pattern: /GROUP BY\s+.*\s+HAVING/i, 
        message: 'GROUP BY with HAVING detected',
        suggestion: 'Consider filtering with WHERE before GROUP BY',
        severity: 'medium'
      },
      { 
        pattern: /JOIN\s+.*\s+ON\s+.*\s+OR/i, 
        message: 'OR condition in JOIN detected',
        suggestion: 'OR conditions in JOINs can cause performance issues',
        severity: 'high'
      }
    ];

    queryPatterns.forEach(({ pattern, message, suggestion, severity }) => {
      if (pattern.test(content)) {
        bottlenecks.push({
          type: 'database',
          severity,
          file: path.relative(process.cwd(), filePath),
          message,
          suggestion
        });
      }
    });

    // Check for database optimization patterns
    const optimizationPatterns = [
      { 
        pattern: /LIMIT\s+\d+/i, 
        message: 'LIMIT clause detected',
        suggestion: 'Good for limiting result set size'
      },
      { 
        pattern: /INDEX\s+ON/i, 
        message: 'Index creation detected',
        suggestion: 'Good for improving query performance'
      },
      { 
        pattern: /EXPLAIN\s+/i, 
        message: 'EXPLAIN query detected',
        suggestion: 'Good for query performance analysis'
      },
      { 
        pattern: /transaction/i, 
        message: 'Transaction usage detected',
        suggestion: 'Good for data consistency and performance'
      },
      { 
        pattern: /prepared\s+statement/i, 
        message: 'Prepared statement detected',
        suggestion: 'Good for query optimization and security'
      }
    ];

    optimizationPatterns.forEach(({ pattern, message, suggestion }) => {
      if (pattern.test(content)) {
        optimizations.push({
          type: 'database',
          file: path.relative(process.cwd(), filePath),
          message,
          suggestion
        });
      }
    });

    // Check for ORM usage
    const ormPatterns = [
      /sequelize/i,
      /mongoose/i,
      /prisma/i,
      /typeorm/i,
      /knex/i
    ];

    ormPatterns.forEach(pattern => {
      if (pattern.test(content)) {
        queries.push({
          type: 'orm',
          file: path.relative(process.cwd(), filePath)
        });
      }
    });

    return { queries, optimizations, bottlenecks };
  }

  /**
   * Analyze database configuration file
   * @param {string} filename - Config file name
   * @param {string} content - File content
   * @returns {Object} Config analysis result
   */
  analyzeDatabaseConfig(filename, content) {
    const optimizations = [];
    const bottlenecks = [];

    switch (filename) {
      case 'prisma/schema.prisma':
        if (content.includes('@@index')) {
          optimizations.push({
            type: 'database',
            message: 'Prisma indexes configured',
            suggestion: 'Good for query performance optimization'
          });
        }
        
        if (content.includes('@@unique')) {
          optimizations.push({
            type: 'database',
            message: 'Prisma unique constraints configured',
            suggestion: 'Good for data integrity and performance'
          });
        }
        break;

      case 'knexfile.js':
        if (content.includes('pool')) {
          optimizations.push({
            type: 'database',
            message: 'Knex connection pooling configured',
            suggestion: 'Good for managing database connections'
          });
        }
        break;

      case '.env':
      case '.env.example':
        if (content.includes('DB_POOL_SIZE') || content.includes('DATABASE_POOL_SIZE')) {
          optimizations.push({
            type: 'database',
            message: 'Database pool size configured',
            suggestion: 'Good for connection management'
          });
        }
        
        if (content.includes('DB_TIMEOUT') || content.includes('DATABASE_TIMEOUT')) {
          optimizations.push({
            type: 'database',
            message: 'Database timeout configured',
            suggestion: 'Good for preventing hanging connections'
          });
        }
        break;
    }

    return { optimizations, bottlenecks };
  }

  /**
   * Check for connection pooling configuration
   * @param {string} projectPath - Project path
   * @returns {Promise<boolean>} Has connection pooling
   */
  async checkConnectionPooling(projectPath) {
    try {
      const configFiles = [
        'knexfile.js',
        'database.config.js',
        'db.config.js',
        'sequelize.config.js'
      ];

      for (const configFile of configFiles) {
        const configPath = path.join(projectPath, configFile);
        try {
          const content = await fs.readFile(configPath, 'utf8');
          if (content.includes('pool') || content.includes('connectionLimit')) {
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
   * Get JavaScript files from project
   * @param {string} projectPath - Project path
   * @returns {Promise<Array>} JavaScript files
   */
  async getJavaScriptFiles(projectPath) {
    const allFiles = await this.getAllFiles(projectPath);
    return allFiles.filter(file => 
      /\.(js|jsx|ts|tsx)$/i.test(file) && 
      !file.includes('node_modules') &&
      !file.includes('.git')
    );
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
   * Calculate database performance score
   * @param {Object} data - Analysis data
   * @returns {number} Database performance score (0-100)
   */
  calculateDatabaseScore(data) {
    const { metrics, bottlenecks, optimizations } = data;
    
    // Base score starts at 100
    let score = 100;

    // Penalize for bottlenecks (up to -50 points)
    const bottleneckPenalty = Math.min(bottlenecks * 5, 50);
    score -= bottleneckPenalty;

    // Reward for optimizations (up to +30 points)
    const optimizationBonus = Math.min(optimizations * 3, 30);
    score += optimizationBonus;

    // Bonus for database configuration (up to +10 points)
    if (metrics.configFilesAnalyzed > 0) {
      score += 10;
    }

    // Bonus for query files (up to +10 points)
    if (metrics.filesWithQueries > 0) {
      score += Math.min(metrics.filesWithQueries * 2, 10);
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Get database performance level
   * @param {number} score - Database performance score
   * @returns {string} Performance level
   */
  getDatabaseLevel(score) {
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
      step: DatabaseAnalysisStep,
      category: 'performance',
      subcategory: 'database'
    };
  }

  /**
   * Validate execution context
   * @param {Object} context - Execution context
   */
  validateContext(context) {
    if (!context.projectPath) {
      throw new Error('Project path is required for database performance analysis');
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
    const coverageBonus = metrics.filesWithQueries > 0 ? 20 : 0;
    
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
        source: 'DatabaseAnalysisStep',
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
        source: 'DatabaseAnalysisStep',
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
        source: 'DatabaseAnalysisStep',
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
        source: 'DatabaseAnalysisStep',
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
        source: 'DatabaseAnalysisStep',
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
        source: 'DatabaseAnalysisStep',
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
        source: 'DatabaseAnalysisStep',
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
      id: `database-analysis-step-improvement-${Date.now()}`,
      title: `Improve ${DatabaseAnalysisStep} Results`,
      description: `Address issues and implement recommendations from ${DatabaseAnalysisStep} analysis`,
      type: 'improvement',
      category: 'performance',
      priority: 'medium',
      status: 'pending',
      projectId: projectId,
      metadata: {
        source: 'DatabaseAnalysisStep',
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
        id: `database-analysis-step-critical-${Date.now()}`,
        title: `Fix Critical Issues from ${DatabaseAnalysisStep}`,
        description: 'Address critical issues identified in analysis',
        type: 'fix',
        category: 'performance',
        priority: 'critical',
        status: 'pending',
        projectId: projectId,
        parentTaskId: mainTask.id,
        metadata: {
          source: 'DatabaseAnalysisStep',
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
        id: `database-analysis-step-high-${Date.now()}`,
        title: `Fix High Priority Issues from ${DatabaseAnalysisStep}`,
        description: 'Address high priority issues identified in analysis',
        type: 'fix',
        category: 'performance',
        priority: 'high',
        status: 'pending',
        projectId: projectId,
        parentTaskId: mainTask.id,
        metadata: {
          source: 'DatabaseAnalysisStep',
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
    const docsDir = path.join(projectPath, 'docs', 'analysis', 'performance', 'database-analysis-step');
    
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
    const docPath = path.join(docsDir, 'database-analysis-implementation.md');
    
    const content = `# Database Performance Analysis Implementation

## 📋 Analysis Overview
- **Step Name**: ${DatabaseAnalysisStep}
- **Category**: performance
- **Analysis Date**: ${new Date().toISOString()}
- **Score**: ${result.score || 0}%
- **Level**: ${result.level || 'unknown'}

## 📊 Analysis Results
- **Database Queries**: ${result.metrics?.filesWithQueries || 0}
- **Config Files**: ${result.metrics?.configFilesAnalyzed || 0}
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
      title: 'Database Performance Analysis Implementation',
      path: docPath,
      category: 'performance',
      source: DatabaseAnalysisStep
    };
  }

  /**
   * Create analysis report
   * @param {Object} result - Analysis result
   * @param {string} docsDir - Documentation directory
   * @returns {Object} Analysis report
   */
  async createAnalysisReport(result, docsDir) {
    const docPath = path.join(docsDir, 'database-analysis-report.md');
    
    const content = `# Database Performance Analysis Report

## 📊 Executive Summary
Database performance analysis completed with a score of ${result.score || 0}% (${result.level || 'unknown'} level).

## 🔍 Detailed Analysis
${result.bottlenecks ? result.bottlenecks.map(bottleneck => `
### ${bottleneck.type} Bottleneck
- **File**: ${bottleneck.file || 'N/A'}
- **Description**: ${bottleneck.description}
- **Severity**: ${bottleneck.severity}
- **Suggestion**: ${bottleneck.suggestion}
`).join('\n') : 'No bottlenecks found'}

## 📈 Metrics
- **Queries**: ${result.metrics?.filesWithQueries || 0} files with queries
- **Config Files**: ${result.metrics?.configFilesAnalyzed || 0} analyzed
- **File Coverage**: ${result.metrics?.totalFiles || 0} files analyzed

## 🎯 Next Steps
Based on the analysis, consider optimizing database queries and connection pooling to improve performance.
`;

    await fs.writeFile(docPath, content, 'utf8');
    
    return {
      type: 'report',
      title: 'Database Performance Analysis Report',
      path: docPath,
      category: 'performance',
      source: DatabaseAnalysisStep
    };
  }
} 

// Create instance for execution
const stepInstance = new DatabaseAnalysisStep();

// Export in StepRegistry format
module.exports = {
  config: DatabaseAnalysisStep.getConfig(),
  execute: async (context) => await stepInstance.execute(context)
}; 