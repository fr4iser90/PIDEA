/**
 * CPU Analysis Step - Performance Analysis Step
 * Analyzes CPU performance patterns and optimizations
 * 
 * Created: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
 * Purpose: Specialized CPU performance analysis for code patterns and optimizations
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const fs = require('fs').promises;
const path = require('path');

const logger = new Logger('cpu_analysis_step');

// Step configuration
const config = {
  name: 'CpuAnalysisStep',
  type: 'analysis',
  description: 'Analyzes CPU performance patterns and optimizations',
  category: 'analysis',
  subcategory: 'performance',
  version: '1.0.0',
  dependencies: [],
  settings: {
    timeout: 30000,
    includeAntiPatterns: true,
    includeOptimizations: true,
    includeBottlenecks: true
  },
  validation: {
    requiredFiles: ['package.json'],
    supportedProjects: ['nodejs', 'react', 'vue', 'angular', 'express', 'nest']
  }
};

class CpuAnalysisStep {
  constructor() {
    CpuAnalysisStep = 'CpuAnalysisStep';
    this.description = 'Analyzes CPU performance patterns and optimizations';
    this.category = 'analysis';
    this.subcategory = 'performance';
    this.dependencies = [];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = CpuAnalysisStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`⚡ Executing ${CpuAnalysisStep}...`);
      
      // Validate context
      this.validateContext(context);

      const projectPath = context.projectPath;
      
      logger.info(`🖥️ Starting CPU performance analysis for: ${projectPath}`);

      // Execute CPU performance analysis
      const cpuAnalysis = await this.analyzeCpuPerformance(projectPath, {
        includeAntiPatterns: context.includeAntiPatterns !== false,
        includeOptimizations: context.includeOptimizations !== false,
        includeBottlenecks: context.includeBottlenecks !== false
      });

      // Clean and format result
      const cleanResult = this.cleanResult(cpuAnalysis);

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

      logger.info(`✅ CPU performance analysis completed successfully`);

      return {
        success: true,
        result: cleanResult,
        metadata: {
          stepName: "CpuAnalysisStep",
          projectPath,
          timestamp: new Date()
        }
      };

    } catch (error) {
      logger.error(`❌ CPU performance analysis failed: ${error.message}`);
      
      return {
        success: false,
        error: error.message,
        metadata: {
          stepName: "CpuAnalysisStep",
          projectPath: context.projectPath,
          timestamp: new Date()
        }
      };
    }
  }

  /**
   * Analyze CPU performance for a project
   * @param {string} projectPath - Path to the project
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} CPU performance analysis result
   */
  async analyzeCpuPerformance(projectPath, options = {}) {
    try {
      const metrics = {};
      const optimizations = [];
      const bottlenecks = [];
      const jsFiles = await this.getJavaScriptFiles(projectPath);

      metrics.totalFiles = jsFiles.length;
      let filesWithIssues = 0;
      let filesWithOptimizations = 0;

      for (const file of jsFiles) { // ANALYZE ALL FILES - NO LIMITS!
        try {
          const content = await fs.readFile(file, 'utf8');
          const fileAnalysis = this.analyzeFileCpuPerformance(content, file);
          
          if (fileAnalysis.bottlenecks.length > 0) {
            filesWithIssues++;
            bottlenecks.push(...fileAnalysis.bottlenecks);
          }
          
          if (fileAnalysis.optimizations.length > 0) {
            filesWithOptimizations++;
            optimizations.push(...fileAnalysis.optimizations);
          }
        } catch (error) {
          // Skip files that can't be read
        }
      }

      metrics.filesWithIssues = filesWithIssues;
      metrics.filesWithOptimizations = filesWithOptimizations;

      // Calculate CPU performance score
      const cpuScore = this.calculateCpuScore({
        totalFiles: metrics.totalFiles,
        filesWithIssues,
        filesWithOptimizations,
        bottlenecks: bottlenecks.length,
        optimizations: optimizations.length
      });

      return {
        metrics,
        optimizations,
        bottlenecks,
        score: cpuScore,
        level: this.getCpuLevel(cpuScore)
      };
    } catch (error) {
      logger.error(`CPU performance analysis failed: ${error.message}`);
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
   * Analyze file CPU performance patterns
   * @param {string} content - File content
   * @param {string} filePath - File path
   * @returns {Object} File analysis result
   */
  analyzeFileCpuPerformance(content, filePath) {
    const optimizations = [];
    const bottlenecks = [];

    // Check for CPU performance anti-patterns
    const antiPatterns = [
      { 
        pattern: /\.forEach\s*\(.*=>\s*\{[\s\S]*await/, 
        message: 'Async operations in forEach detected',
        suggestion: 'Use for...of loop or Promise.all for async operations'
      },
      { 
        pattern: /for\s*\(\s*let\s+i\s*=\s*0\s*;\s*i\s*<\s*array\.length\s*;\s*i\+\+\)/, 
        message: 'Inefficient for loop detected',
        suggestion: 'Use for...of or array methods for better performance'
      },
      { 
        pattern: /\.map\s*\(.*=>\s*\{[\s\S]*\.map/, 
        message: 'Nested map operations detected',
        suggestion: 'Combine map operations or use flatMap'
      },
      { 
        pattern: /JSON\.parse\s*\(.*JSON\.stringify/, 
        message: 'Unnecessary JSON parse/stringify detected',
        suggestion: 'Avoid unnecessary serialization/deserialization'
      },
      { 
        pattern: /setTimeout\s*\(.*0\)/, 
        message: 'setTimeout with 0 delay detected',
        suggestion: 'Use requestAnimationFrame or microtasks for better performance'
      },
      { 
        pattern: /while\s*\(true\)/, 
        message: 'Infinite loop pattern detected',
        suggestion: 'Add proper exit conditions to prevent infinite loops'
      },
      { 
        pattern: /\.filter\s*\(.*\)\.map\s*\(/, 
        message: 'Filter followed by map detected',
        suggestion: 'Use reduce or combine operations for better performance'
      }
    ];

    antiPatterns.forEach(({ pattern, message, suggestion }) => {
      if (pattern.test(content)) {
        bottlenecks.push({
          type: 'cpu',
          severity: 'medium',
          file: path.relative(process.cwd(), filePath),
          message,
          suggestion
        });
      }
    });

    // Check for CPU performance optimizations
    const optimizationPatterns = [
      { 
        pattern: /useMemo\s*\(/, 
        message: 'React useMemo detected',
        suggestion: 'Good for preventing unnecessary recalculations'
      },
      { 
        pattern: /useCallback\s*\(/, 
        message: 'React useCallback detected',
        suggestion: 'Good for preventing unnecessary re-renders'
      },
      { 
        pattern: /React\.memo\s*\(/, 
        message: 'React.memo detected',
        suggestion: 'Good for preventing unnecessary re-renders'
      },
      { 
        pattern: /lazy\s*\(/, 
        message: 'Code splitting with lazy detected',
        suggestion: 'Good for reducing initial bundle size'
      },
      { 
        pattern: /webpackChunkName/, 
        message: 'Webpack chunk naming detected',
        suggestion: 'Good for better caching and loading performance'
      },
      { 
        pattern: /requestAnimationFrame/, 
        message: 'requestAnimationFrame detected',
        suggestion: 'Good for smooth animations and performance'
      },
      { 
        pattern: /\.reduce\s*\(/, 
        message: 'Reduce operation detected',
        suggestion: 'Good for combining multiple operations efficiently'
      }
    ];

    optimizationPatterns.forEach(({ pattern, message, suggestion }) => {
      if (pattern.test(content)) {
        optimizations.push({
          type: 'cpu',
          file: path.relative(process.cwd(), filePath),
          message,
          suggestion
        });
      }
    });

    return { optimizations, bottlenecks };
  }

  /**
   * Calculate CPU performance score
   * @param {Object} data - Analysis data
   * @returns {number} CPU performance score (0-100)
   */
  calculateCpuScore(data) {
    const { totalFiles, filesWithIssues, filesWithOptimizations, bottlenecks, optimizations } = data;
    
    if (totalFiles === 0) return 0;

    // Base score starts at 100
    let score = 100;

    // Penalize for files with issues (up to -40 points)
    const issuePenalty = (filesWithIssues / totalFiles) * 40;
    score -= issuePenalty;

    // Penalize for bottlenecks (up to -30 points)
    const bottleneckPenalty = Math.min(bottlenecks * 2, 30);
    score -= bottleneckPenalty;

    // Reward for optimizations (up to +20 points)
    const optimizationBonus = Math.min(optimizations * 1, 20);
    score += optimizationBonus;

    // Reward for files with optimizations (up to +10 points)
    const optimizationFileBonus = (filesWithOptimizations / totalFiles) * 10;
    score += optimizationFileBonus;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Get CPU performance level
   * @param {number} score - CPU performance score
   * @returns {string} Performance level
   */
  getCpuLevel(score) {
    if (score >= 90) return 'excellent';
    if (score >= 80) return 'good';
    if (score >= 70) return 'fair';
    if (score >= 60) return 'poor';
    return 'critical';
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
   * Clean and format result
   * @param {Object} result - Analysis result
   * @returns {Object} Cleaned result
   */
  cleanResult(result) {
    return {
      ...result,
      timestamp: new Date().toISOString(),
      step: CpuAnalysisStep,
      category: 'performance',
      subcategory: 'cpu'
    };
  }

  /**
   * Validate execution context
   * @param {Object} context - Execution context
   */
  validateContext(context) {
    if (!context.projectPath) {
      throw new Error('Project path is required for CPU performance analysis');
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
    // In a real implementation, you might want to count total lines or complexity
    return Math.min((files.length / 100) * 100, 100);
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
    const coverageBonus = metrics.totalFiles > 10 ? 20 : 0;
    
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
        category: this.category,
        source: CpuAnalysisStep,
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
        source: CpuAnalysisStep,
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
        source: CpuAnalysisStep,
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
        source: CpuAnalysisStep,
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
        source: CpuAnalysisStep,
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
        source: CpuAnalysisStep,
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
        source: CpuAnalysisStep,
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
      id: `${CpuAnalysisStep.toLowerCase()}-improvement-${Date.now()}`,
      title: `Improve ${CpuAnalysisStep} Results`,
      description: `Address issues and implement recommendations from ${CpuAnalysisStep} analysis`,
      type: 'improvement',
      category: this.category,
      priority: 'medium',
      status: 'pending',
      projectId: projectId,
      metadata: {
        source: CpuAnalysisStep,
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
        id: `${CpuAnalysisStep.toLowerCase()}-critical-${Date.now()}`,
        title: `Fix Critical Issues from ${CpuAnalysisStep}`,
        description: 'Address critical issues identified in analysis',
        type: 'fix',
        category: this.category,
        priority: 'critical',
        status: 'pending',
        projectId: projectId,
        parentTaskId: mainTask.id,
        metadata: {
          source: CpuAnalysisStep,
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
        id: `${CpuAnalysisStep.toLowerCase()}-high-${Date.now()}`,
        title: `Fix High Priority Issues from ${CpuAnalysisStep}`,
        description: 'Address high priority issues identified in analysis',
        type: 'fix',
        category: this.category,
        priority: 'high',
        status: 'pending',
        projectId: projectId,
        parentTaskId: mainTask.id,
        metadata: {
          source: CpuAnalysisStep,
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
    const docsDir = path.join(projectPath, `docs/09_roadmap/tasks/${this.category}/${CpuAnalysisStep.toLowerCase()}`);
    
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
    const docPath = path.join(docsDir, 'cpu-analysis-implementation.md');
    
    const content = `# CPU Performance Analysis Implementation

## 📋 Analysis Overview
- **Step Name**: ${CpuAnalysisStep}
- **Category**: ${this.category}
- **Analysis Date**: ${new Date().toISOString()}
- **Score**: ${result.score || 0}%
- **Level**: ${result.level || 'unknown'}

## 📊 Analysis Results
- **CPU Bottlenecks**: ${result.metrics?.bottlenecks || 0}
- **Optimizations Found**: ${result.metrics?.optimizations || 0}
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
      title: 'CPU Performance Analysis Implementation',
      path: docPath,
      category: this.category,
      source: CpuAnalysisStep
    };
  }

  /**
   * Create analysis report
   * @param {Object} result - Analysis result
   * @param {string} docsDir - Documentation directory
   * @returns {Object} Analysis report
   */
  async createAnalysisReport(result, docsDir) {
    const docPath = path.join(docsDir, 'cpu-analysis-report.md');
    
    const content = `# CPU Performance Analysis Report

## 📊 Executive Summary
CPU performance analysis completed with a score of ${result.score || 0}% (${result.level || 'unknown'} level).

## 🔍 Detailed Analysis
${result.bottlenecks ? result.bottlenecks.map(bottleneck => `
### ${bottleneck.type} Bottleneck
- **File**: ${bottleneck.file || 'N/A'}
- **Description**: ${bottleneck.description}
- **Severity**: ${bottleneck.severity}
- **Suggestion**: ${bottleneck.suggestion}
`).join('\n') : 'No bottlenecks found'}

## 📈 Metrics
- **Bottlenecks**: ${result.metrics?.bottlenecks || 0} issues found
- **Optimizations**: ${result.metrics?.optimizations || 0} opportunities
- **File Coverage**: ${result.metrics?.totalFiles || 0} files analyzed

## 🎯 Next Steps
Based on the analysis, consider implementing CPU optimizations to improve performance and reduce bottlenecks.
`;

    await fs.writeFile(docPath, content, 'utf8');
    
    return {
      type: 'report',
      title: 'CPU Performance Analysis Report',
      path: docPath,
      category: this.category,
      source: CpuAnalysisStep
    };
  }
}

// Create instance for execution
const stepInstance = new CpuAnalysisStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
};