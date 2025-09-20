/**
 * Trivy Security Step - Specialized Security Analysis
 * Detects security vulnerabilities using Trivy-like patterns
 * 
 * Created: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
 * Purpose: Specialized step for vulnerability detection and security scanning
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const fs = require('fs').promises;
const path = require('path');

const logger = new Logger('trivy_security_step');

// Step configuration
const config = {
  name: 'TrivySecurityStep',
  type: 'analysis',
  description: 'Detects security vulnerabilities using Trivy-like patterns',
  category: 'security',
  version: '1.0.0',
  dependencies: [],
  settings: {
    timeout: 30000,
    includeVulnerabilities: true,
    includeBestPractices: true
  },
  validation: {
    requiredFiles: ['package.json'],
    supportedProjects: ['nodejs', 'react', 'vue', 'angular', 'express', 'nest']
  }
};

class TrivySecurityStep {
  constructor() {
    this.name = 'TrivySecurityStep';
    this.description = 'Detects security vulnerabilities using Trivy-like patterns';
    this.category = 'security';
    this.dependencies = [];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = TrivySecurityStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`🔒 Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);

      const projectPath = context.projectPath;
      const projectId = context.projectId;
      
      logger.info(`📊 Starting Trivy security analysis for: ${projectPath}`);

      // Execute Trivy security analysis
      const security = await this.analyzeTrivySecurity(projectPath, {
        includeVulnerabilities: context.includeVulnerabilities !== false,
        includeBestPractices: context.includeBestPractices !== false
      });

      // Clean and format result - Return only standardized format
      const cleanResult = this.cleanResult(security);

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

      logger.info(`✅ Trivy security analysis completed successfully`);

      return {
        success: true,
        result: cleanResult,
        metadata: {
          stepName: 'TrivySecurityStep',
          projectPath,
          projectId,
          timestamp: new Date()
        }
      };

    } catch (error) {
      logger.error(`❌ Trivy security analysis failed: ${error.message}`);
      
      return {
        success: false,
        error: error.message,
        metadata: {
          stepName: 'TrivySecurityStep',
          projectPath: context.projectPath,
          timestamp: new Date()
        }
      };
    }
  }

  /**
   * Analyze security using Trivy-like vulnerability detection
   */
  async analyzeTrivySecurity(projectPath, options = {}) {
    try {
      const vulnerabilities = [];
      const bestPractices = [];

      // Get JavaScript files for analysis
      const jsFiles = await this.getJavaScriptFiles(projectPath);

      // Analyze each file for security issues
      for (const file of jsFiles) { // ANALYZE ALL FILES - NO LIMITS!
        try {
          const content = await fs.readFile(file, 'utf8');
          const fileIssues = this.detectSecurityIssues(content, file);
          vulnerabilities.push(...fileIssues.vulnerabilities);
          bestPractices.push(...fileIssues.bestPractices);
        } catch (error) {
          // Skip files that can't be read
          logger.warn(`Could not read file: ${file}`);
        }
      }

      // Calculate security metrics
      const securityScore = this.calculateSecurityScore(vulnerabilities);
      const coverage = this.calculateCoverage(jsFiles, projectPath);
      const confidence = this.calculateConfidence({ vulnerabilities, bestPractices });

      return {
        vulnerabilities,
        bestPractices,
        metrics: {
          securityScore,
          coverage,
          confidence,
          filesAnalyzed: jsFiles.length,
          vulnerabilitiesFound: vulnerabilities.length,
          bestPracticesFound: bestPractices.length
        }
      };

    } catch (error) {
      logger.error(`Trivy security analysis failed: ${error.message}`);
      return {
        vulnerabilities: [],
        bestPractices: [],
        metrics: {
          securityScore: 0,
          coverage: 0,
          confidence: 0,
          filesAnalyzed: 0,
          vulnerabilitiesFound: 0,
          bestPracticesFound: 0
        }
      };
    }
  }

  /**
   * Detect security issues in code content
   */
  detectSecurityIssues(content, filePath) {
    const vulnerabilities = [];
    const bestPractices = [];

    // Check for dangerous patterns (Trivy-like vulnerability detection)
    const dangerousPatterns = [
      { pattern: /eval\s*\(/, severity: 'critical', message: 'eval() usage detected', cve: 'CWE-78' },
      { pattern: /innerHTML\s*=/, severity: 'high', message: 'innerHTML assignment detected', cve: 'CWE-79' },
      { pattern: /document\.write\s*\(/, severity: 'high', message: 'document.write() usage detected', cve: 'CWE-79' },
      { pattern: /localStorage\.[a-zA-Z_][a-zA-Z0-9_]*\s*=/, severity: 'medium', message: 'localStorage usage detected', cve: 'CWE-200' },
      { pattern: /sessionStorage\.[a-zA-Z_][a-zA-Z0-9_]*\s*=/, severity: 'medium', message: 'sessionStorage usage detected', cve: 'CWE-200' },
      { pattern: /process\.env\.[A-Z_]+/, severity: 'medium', message: 'Environment variable access detected', cve: 'CWE-200' },
      { pattern: /console\.log\s*\(/, severity: 'low', message: 'Console logging detected', cve: 'CWE-200' },
      { pattern: /debugger;/, severity: 'medium', message: 'Debugger statement detected', cve: 'CWE-489' }
    ];

    dangerousPatterns.forEach(({ pattern, severity, message, cve }) => {
      if (pattern.test(content)) {
        vulnerabilities.push({
          type: 'code',
          severity,
          file: path.relative(process.cwd(), filePath),
          message,
          cve,
          suggestion: 'Review and secure this code pattern',
          scanner: 'TrivySecurityStep'
        });
      }
    });

    // Check for security best practices
    if (content.includes('Content-Security-Policy')) {
      bestPractices.push({
        type: 'code',
        message: 'Content Security Policy detected',
        suggestion: 'Ensure CSP is properly configured',
        scanner: 'TrivySecurityStep'
      });
    }

    if (content.includes('helmet')) {
      bestPractices.push({
        type: 'code',
        message: 'Helmet security middleware detected',
        suggestion: 'Ensure helmet is properly configured',
        scanner: 'TrivySecurityStep'
      });
    }

    if (content.includes('cors')) {
      bestPractices.push({
        type: 'code',
        message: 'CORS configuration detected',
        suggestion: 'Ensure CORS is properly configured for production',
        scanner: 'TrivySecurityStep'
      });
    }

    return { vulnerabilities, bestPractices };
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
          if (!['node_modules', '.git', 'dist', 'build', 'coverage'].includes(item)) {
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
   * Clean and format result - Return only standardized format
   */
  cleanResult(result) {
    // Convert vulnerabilities to standardized issues
    const issues = [];
    if (result.vulnerabilities && result.vulnerabilities.length > 0) {
      issues.push(...result.vulnerabilities.map(vuln => ({
        id: `sec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        category: 'security',
        subcategory: 'vulnerability',
        severity: vuln.severity || 'medium',
        title: vuln.message || 'Security Vulnerability Detected',
        description: vuln.description || vuln.message || 'Security vulnerability found',
        file: vuln.file || 'unknown',
        line: vuln.line || 0,
        suggestion: vuln.suggestion || 'Review and fix security vulnerability',
        metadata: {
          cve: vuln.cve || 'N/A',
          scanner: 'trivy',
          confidence: vuln.confidence || 80
        }
      })));
    }

    // Convert best practices to standardized issues
    if (result.bestPractices && result.bestPractices.length > 0) {
      issues.push(...result.bestPractices.map(bp => ({
        id: `bp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        category: 'security',
        subcategory: 'best-practice',
        severity: 'low',
        title: bp.title || 'Security Best Practice',
        description: bp.description || 'Security best practice recommendation',
        file: bp.file || 'unknown',
        line: bp.line || 0,
        suggestion: bp.suggestion || 'Follow security best practices',
        metadata: {
          scanner: 'trivy',
          confidence: bp.confidence || 90
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
   * Calculate security score based on vulnerabilities
   */
  calculateSecurityScore(issues) {
    if (!issues || issues.length === 0) return 100;

    const severityWeights = {
      critical: 10,
      high: 7,
      medium: 4,
      low: 1
    };

    const totalWeight = issues.reduce((sum, issue) => {
      return sum + (severityWeights[issue.severity] || 1);
    }, 0);

    const maxScore = 100;
    const score = Math.max(0, maxScore - totalWeight);
    
    return Math.round(score);
  }

  /**
   * Calculate analysis coverage
   */
  calculateCoverage(files, projectPath) {
    if (!files || files.length === 0) return 0;
    
    // Simple coverage calculation based on file count
    // In a real implementation, this would be more sophisticated
    return Math.min(100, Math.round((files.length / 100) * 100));
  }

  /**
   * Calculate analysis confidence
   */
  calculateConfidence(result) {
    const { vulnerabilities, bestPractices } = result;
    
    if (!vulnerabilities && !bestPractices) return 0;
    
    const totalIssues = (vulnerabilities?.length || 0) + (bestPractices?.length || 0);
    
    if (totalIssues === 0) return 50; // Neutral confidence when no issues found
    
    // Higher confidence when more issues are found (indicates thorough analysis)
    return Math.min(100, Math.round(50 + (totalIssues * 2)));
  }

  /**
   * Generate issues from analysis results
   * @param {Object} result - Analysis result
   * @returns {Array} Issues array
   */
  generateIssues(result) {
    const issues = [];
    
    // Check for low security score
    if (result.metrics && result.metrics.securityScore < 80) {
      issues.push({
        type: 'low-security-score',
        title: 'Low Security Score',
        description: `Security score of ${result.metrics.securityScore}% indicates security vulnerabilities`,
        severity: 'high',
        priority: 'high',
        category: 'security',
        source: 'TrivySecurityStep',
        location: 'security-analysis',
        suggestion: 'Address security vulnerabilities to improve security score'
      });
    }

    // Check for critical vulnerabilities
    if (result.vulnerabilities && result.vulnerabilities.some(v => v.severity === 'critical')) {
      issues.push({
        type: 'critical-vulnerabilities',
        title: 'Critical Vulnerabilities Detected',
        description: 'Critical security vulnerabilities found in the codebase',
        severity: 'critical',
        priority: 'critical',
        category: 'security',
        source: 'TrivySecurityStep',
        location: 'security-analysis',
        suggestion: 'Immediately address critical security vulnerabilities'
      });
    }

    // Check for high severity vulnerabilities
    if (result.vulnerabilities && result.vulnerabilities.some(v => v.severity === 'high')) {
      issues.push({
        type: 'high-vulnerabilities',
        title: 'High Severity Vulnerabilities Detected',
        description: 'High severity security vulnerabilities found in the codebase',
        severity: 'high',
        priority: 'high',
        category: 'security',
        source: 'TrivySecurityStep',
        location: 'security-analysis',
        suggestion: 'Address high severity security vulnerabilities promptly'
      });
    }

    // Check for eval usage
    if (result.vulnerabilities && result.vulnerabilities.some(v => v.message.includes('eval()'))) {
      issues.push({
        type: 'eval-usage',
        title: 'Eval() Usage Detected',
        description: 'eval() function usage detected, which is a security risk',
        severity: 'critical',
        priority: 'critical',
        category: 'security',
        source: 'TrivySecurityStep',
        location: 'security-analysis',
        suggestion: 'Replace eval() with safer alternatives to prevent code injection'
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
        category: 'security',
        source: 'TrivySecurityStep',
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
        category: 'security',
        source: 'TrivySecurityStep',
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
        category: 'security',
        source: 'TrivySecurityStep',
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
        category: 'security',
        source: 'TrivySecurityStep',
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
      id: `${this.name.toLowerCase()}-improvement-${Date.now()}`,
      title: `Improve ${this.name} Results`,
      description: `Address issues and implement recommendations from ${this.name} analysis`,
      type: 'improvement',
      category: 'security',
      priority: 'medium',
      status: 'pending',
      projectId: projectId,
      metadata: {
        source: 'TrivySecurityStep',
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
        id: `${this.name.toLowerCase()}-critical-${Date.now()}`,
        title: `Fix Critical Issues from ${this.name}`,
        description: 'Address critical issues identified in analysis',
        type: 'fix',
        category: 'security',
        priority: 'critical',
        status: 'pending',
        projectId: projectId,
        parentTaskId: mainTask.id,
        metadata: {
          source: 'TrivySecurityStep',
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
        id: `${this.name.toLowerCase()}-high-${Date.now()}`,
        title: `Fix High Priority Issues from ${this.name}`,
        description: 'Address high priority issues identified in analysis',
        type: 'fix',
        category: 'security',
        priority: 'high',
        status: 'pending',
        projectId: projectId,
        parentTaskId: mainTask.id,
        metadata: {
          source: 'TrivySecurityStep',
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
    const docsDir = path.join(projectPath, 'docs', 'analysis', 'security', 'trivy-security-step');
    
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
    const docPath = path.join(docsDir, 'trivy-security-implementation.md');
    
    const content = `# Trivy Security Analysis Implementation

## 📋 Analysis Overview
- **Step Name**: ${this.name}
- **Category**: security
- **Analysis Date**: ${new Date().toISOString()}
- **Security Score**: ${result.summary?.securityScore || 0}%
- **Coverage**: ${result.summary?.coverage || 0}%

## 📊 Analysis Results
- **Vulnerabilities**: ${result.summary?.totalVulnerabilities || 0}
- **Best Practices**: ${result.summary?.totalBestPractices || 0}
- **Confidence**: ${result.summary?.confidence || 0}%

## 🎯 Key Findings
${result.vulnerabilities ? result.vulnerabilities.map(vuln => `- **${vuln.type}**: ${vuln.description}`).join('\n') : '- No vulnerabilities detected'}

## 📝 Recommendations
${result.recommendations ? result.recommendations.map(rec => `- **${rec.title}**: ${rec.description}`).join('\n') : '- No recommendations'}

## 🔧 Implementation Tasks
${result.tasks ? result.tasks.map(task => `- **${task.title}**: ${task.description} (${task.estimatedHours}h)`).join('\n') : '- No tasks generated'}
`;

    await fs.writeFile(docPath, content, 'utf8');
    
    return {
      type: 'implementation',
      title: 'Trivy Security Analysis Implementation',
      path: docPath,
      category: 'security',
      source: 'TrivySecurityStep'
    };
  }

  /**
   * Create analysis report
   * @param {Object} result - Analysis result
   * @param {string} docsDir - Documentation directory
   * @returns {Object} Analysis report
   */
  async createAnalysisReport(result, docsDir) {
    const docPath = path.join(docsDir, 'trivy-security-report.md');
    
    const content = `# Trivy Security Analysis Report

## 📊 Executive Summary
Trivy security analysis completed with a score of ${result.summary?.securityScore || 0}% and ${result.summary?.coverage || 0}% coverage.

## 🔍 Detailed Analysis
${result.vulnerabilities ? result.vulnerabilities.map(vuln => `
### ${vuln.type} Vulnerability
- **File**: ${vuln.file || 'N/A'}
- **Description**: ${vuln.description}
- **Severity**: ${vuln.severity}
- **Suggestion**: ${vuln.suggestion}
`).join('\n') : 'No vulnerabilities found'}

## 📈 Metrics
- **Vulnerabilities**: ${result.summary?.totalVulnerabilities || 0} found
- **Best Practices**: ${result.summary?.totalBestPractices || 0} identified
- **Confidence**: ${result.summary?.confidence || 0}% analysis confidence

## 🎯 Next Steps
Based on the analysis, consider addressing identified vulnerabilities and implementing security best practices.
`;

    await fs.writeFile(docPath, content, 'utf8');
    
    return {
      type: 'report',
      title: 'Trivy Security Analysis Report',
      path: docPath,
      category: 'security',
      source: 'TrivySecurityStep'
    };
  }
}

// Create instance for execution
const stepInstance = new TrivySecurityStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
};