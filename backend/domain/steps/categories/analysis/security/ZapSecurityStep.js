/**
 * ZAP Security Step - Specialized Web Application Security Testing
 * Performs web application security testing using ZAP-like patterns
 * 
 * Created: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
 * Purpose: Specialized step for web application security testing
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const fs = require('fs').promises;
const path = require('path');

const logger = new Logger('zap_security_step');

// Step configuration
const config = {
  name: 'ZapSecurityStep',
  type: 'analysis',
  description: 'Performs web application security testing using ZAP-like patterns',
  category: 'security',
  version: '1.0.0',
  dependencies: [],
  settings: {
    timeout: 60000,
    includeVulnerabilities: true,
    includeBestPractices: true
  },
  validation: {
    requiredFiles: ['package.json'],
    supportedProjects: ['nodejs', 'react', 'vue', 'angular', 'express', 'nest']
  }
};

class ZapSecurityStep {
  constructor() {
    this.name = 'ZapSecurityStep';
    this.description = 'Performs web application security testing using ZAP-like patterns';
    this.category = 'security';
    this.dependencies = [];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = ZapSecurityStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`🔒 Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);

      const projectPath = context.projectPath;
      const projectId = context.projectId;
      
      logger.info(`📊 Starting ZAP web application security testing for: ${projectPath}`);

      // Execute ZAP security testing
      const webSecurity = await this.analyzeWebSecurity(projectPath, {
        includeVulnerabilities: context.includeVulnerabilities !== false,
        includeBestPractices: context.includeBestPractices !== false
      });

      // Clean and format result
      const cleanResult = this.cleanResult(webSecurity);

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

      logger.info(`✅ ZAP security analysis completed successfully`);

      return {
        success: true,
        result: cleanResult,
        metadata: {
          stepName: this.name,
          projectPath,
          projectId,
          timestamp: new Date()
        }
      };

    } catch (error) {
      logger.error(`❌ ZAP web application security testing failed: ${error.message}`);
      
      return {
        success: false,
        error: error.message,
        metadata: {
          stepName: this.name,
          projectPath: context.projectPath,
          timestamp: new Date()
        }
      };
    }
  }

  /**
   * Analyze web application security using ZAP-like patterns
   */
  async analyzeWebSecurity(projectPath, options = {}) {
    try {
      const vulnerabilities = [];
      const bestPractices = [];

      // Analyze web application files
      const webFiles = await this.getWebApplicationFiles(projectPath);
      
      for (const file of webFiles) {
        try {
          const content = await fs.readFile(file, 'utf8');
          const fileIssues = this.detectWebSecurityIssues(content, file);
          vulnerabilities.push(...fileIssues.vulnerabilities);
          bestPractices.push(...fileIssues.bestPractices);
        } catch (error) {
          logger.warn(`Could not read file: ${file}`);
        }
      }

      // Analyze configuration files for web security
      const configIssues = await this.analyzeWebConfiguration(projectPath);
      vulnerabilities.push(...configIssues.vulnerabilities);
      bestPractices.push(...configIssues.bestPractices);

      // Calculate web security metrics
      const webSecurityScore = this.calculateWebSecurityScore(vulnerabilities);
      const coverage = this.calculateCoverage(webFiles, projectPath);
      const confidence = this.calculateConfidence({ vulnerabilities, bestPractices });

      return {
        vulnerabilities,
        bestPractices,
        metrics: {
          webSecurityScore,
          coverage,
          confidence,
          filesAnalyzed: webFiles.length,
          vulnerabilitiesFound: vulnerabilities.length,
          bestPracticesFound: bestPractices.length
        }
      };

    } catch (error) {
      logger.error(`ZAP web security analysis failed: ${error.message}`);
      return {
        vulnerabilities: [],
        bestPractices: [],
        metrics: {
          webSecurityScore: 0,
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
   * Detect web security issues in file content
   */
  detectWebSecurityIssues(content, filePath) {
    const vulnerabilities = [];
    const bestPractices = [];

    // Web security patterns to detect
    const webSecurityPatterns = [
      // XSS vulnerabilities
      {
        pattern: /innerHTML\s*=\s*\w+/,
        severity: 'high',
        message: 'Potential XSS via innerHTML assignment',
        category: 'xss',
        suggestion: 'Use textContent or sanitize input'
      },
      {
        pattern: /document\.write\s*\(\s*\w+/,
        severity: 'high',
        message: 'Potential XSS via document.write',
        category: 'xss',
        suggestion: 'Avoid document.write with user input'
      },
      
      // CSRF vulnerabilities
      {
        pattern: /fetch\s*\(\s*['"`][^'"`]*['"`]\s*,\s*\{[^}]*method\s*:\s*['"`]POST['"`][^}]*\}/,
        severity: 'medium',
        message: 'Potential CSRF vulnerability in fetch request',
        category: 'csrf',
        suggestion: 'Include CSRF token in POST requests'
      },
      
      // Clickjacking
      {
        pattern: /X-Frame-Options/,
        severity: 'low',
        message: 'X-Frame-Options header detected',
        category: 'clickjacking',
        suggestion: 'Ensure X-Frame-Options is properly configured'
      },
      
      // Content Security Policy
      {
        pattern: /Content-Security-Policy/,
        severity: 'low',
        message: 'Content Security Policy detected',
        category: 'csp',
        suggestion: 'Ensure CSP is properly configured'
      },
      
      // Secure headers
      {
        pattern: /X-Content-Type-Options/,
        severity: 'low',
        message: 'X-Content-Type-Options header detected',
        category: 'secure-headers',
        suggestion: 'Ensure secure headers are properly configured'
      },
      
      // Authentication bypass
      {
        pattern: /if\s*\(\s*!user\s*\)\s*return/,
        severity: 'medium',
        message: 'Potential authentication bypass pattern',
        category: 'auth-bypass',
        suggestion: 'Review authentication logic'
      },
      
      // SQL injection in web context
      {
        pattern: /query\s*\(\s*['"`].*\+\s*\w+/,
        severity: 'high',
        message: 'Potential SQL injection in web query',
        category: 'sql-injection',
        suggestion: 'Use parameterized queries'
      }
    ];

    // Check for web security patterns
    webSecurityPatterns.forEach(({ pattern, severity, message, category, suggestion }) => {
      if (pattern.test(content)) {
        vulnerabilities.push({
          type: 'web-security',
          severity,
          file: path.relative(process.cwd(), filePath),
          message,
          category,
          suggestion,
          scanner: 'ZapSecurityStep'
        });
      }
    });

    // Check for web security best practices
    const webBestPracticePatterns = [
      {
        pattern: /helmet\s*\(\s*\)/,
        message: 'Helmet security middleware detected',
        suggestion: 'Ensure helmet is properly configured',
        category: 'security-headers'
      },
      {
        pattern: /cors\s*\(\s*\)/,
        message: 'CORS configuration detected',
        suggestion: 'Ensure CORS is properly configured for production',
        category: 'cors'
      },
      {
        pattern: /rateLimit\s*\(\s*\)/,
        message: 'Rate limiting detected',
        suggestion: 'Ensure rate limiting is properly configured',
        category: 'rate-limiting'
      },
      {
        pattern: /express-rate-limit/,
        message: 'Express rate limiting detected',
        suggestion: 'Ensure rate limiting is properly configured',
        category: 'rate-limiting'
      },
      {
        pattern: /bcrypt\.hash/,
        message: 'Bcrypt password hashing detected',
        suggestion: 'Ensure bcrypt is properly configured',
        category: 'password-hashing'
      },
      {
        pattern: /jwt\.verify/,
        message: 'JWT token verification detected',
        suggestion: 'Ensure JWT verification is properly configured',
        category: 'jwt'
      }
    ];

    webBestPracticePatterns.forEach(({ pattern, message, suggestion, category }) => {
      if (pattern.test(content)) {
        bestPractices.push({
          type: 'web-security',
          message,
          suggestion,
          category,
          scanner: 'ZapSecurityStep'
        });
      }
    });

    return { vulnerabilities, bestPractices };
  }

  /**
   * Analyze web configuration files
   */
  async analyzeWebConfiguration(projectPath) {
    const vulnerabilities = [];
    const bestPractices = [];

    try {
      const configFiles = [
        'package.json',
        'webpack.config.js',
        'next.config.js',
        'vite.config.js',
        'rollup.config.js',
        'server.js',
        'app.js',
        'index.js'
      ];

      for (const configFile of configFiles) {
        const filePath = path.join(projectPath, configFile);
        try {
          const content = await fs.readFile(filePath, 'utf8');
          const configIssues = this.analyzeConfigFile(configFile, content);
          vulnerabilities.push(...configIssues.vulnerabilities);
          bestPractices.push(...configIssues.bestPractices);
        } catch (error) {
          // File doesn't exist, skip
        }
      }
    } catch (error) {
      logger.warn(`Could not analyze web configuration: ${error.message}`);
    }

    return { vulnerabilities, bestPractices };
  }

  /**
   * Analyze configuration file for web security issues
   */
  analyzeConfigFile(filename, content) {
    const vulnerabilities = [];
    const bestPractices = [];

    switch (filename) {
      case 'package.json':
        try {
          const pkg = JSON.parse(content);
          
          // Check for security-related dependencies
          const securityDeps = ['helmet', 'express-rate-limit', 'bcrypt', 'jsonwebtoken'];
          securityDeps.forEach(dep => {
            if (pkg.dependencies && pkg.dependencies[dep]) {
              bestPractices.push({
                type: 'web-security',
                message: `Security dependency detected: ${dep}`,
                suggestion: `Ensure ${dep} is properly configured`,
                category: 'security-dependencies',
                scanner: 'ZapSecurityStep'
              });
            }
          });

          // Check for scripts
          if (pkg.scripts && pkg.scripts.start && pkg.scripts.start.includes('--inspect')) {
            vulnerabilities.push({
              type: 'web-security',
              severity: 'high',
              file: filename,
              message: 'Debug mode enabled in production script',
              suggestion: 'Remove --inspect flag from production start script',
              category: 'debug-mode',
              scanner: 'ZapSecurityStep'
            });
          }
        } catch (error) {
          // Invalid JSON
        }
        break;

      case 'webpack.config.js':
        if (content.includes('devtool: "eval"')) {
          vulnerabilities.push({
            type: 'web-security',
            severity: 'medium',
            file: filename,
            message: 'Eval source map enabled in webpack',
            suggestion: 'Use safer source map options for production',
            category: 'source-maps',
            scanner: 'ZapSecurityStep'
          });
        }
        break;

      case 'next.config.js':
        if (content.includes('poweredByHeader: true')) {
          vulnerabilities.push({
            type: 'web-security',
            severity: 'low',
            file: filename,
            message: 'X-Powered-By header enabled',
            suggestion: 'Disable X-Powered-By header for security',
            category: 'security-headers',
            scanner: 'ZapSecurityStep'
          });
        }
        break;
    }

    return { vulnerabilities, bestPractices };
  }

  /**
   * Get web application files from project
   */
  async getWebApplicationFiles(projectPath) {
    try {
      const allFiles = await this.getAllFiles(projectPath);
      return allFiles.filter(file => 
        file.endsWith('.js') || 
        file.endsWith('.jsx') || 
        file.endsWith('.ts') || 
        file.endsWith('.tsx') ||
        file.endsWith('.html') ||
        file.endsWith('.css')
      );
    } catch (error) {
      logger.error(`Failed to get web application files: ${error.message}`);
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
    return {
      vulnerabilities: result.vulnerabilities || [],
      bestPractices: result.bestPractices || [],
      metrics: result.metrics || {},
      summary: {
        totalVulnerabilities: (result.vulnerabilities || []).length,
        totalBestPractices: (result.bestPractices || []).length,
        webSecurityScore: result.metrics?.webSecurityScore || 0,
        coverage: result.metrics?.coverage || 0,
        confidence: result.metrics?.confidence || 0
      }
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
   * Calculate web security score
   */
  calculateWebSecurityScore(issues) {
    if (!issues || issues.length === 0) return 100;

    const severityWeights = {
      critical: 20,
      high: 15,
      medium: 8,
      low: 3
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
    
    // Web security coverage calculation
    return Math.min(100, Math.round((files.length / 150) * 100));
  }

  /**
   * Calculate analysis confidence
   */
  calculateConfidence(result) {
    const { vulnerabilities, bestPractices } = result;
    
    if (!vulnerabilities && !bestPractices) return 0;
    
    const totalIssues = (vulnerabilities?.length || 0) + (bestPractices?.length || 0);
    
    if (totalIssues === 0) return 65; // Medium-high confidence when no issues found
    
    // Higher confidence when more issues are found (indicates thorough analysis)
    return Math.min(100, Math.round(45 + (totalIssues * 2)));
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
        source: this.name,
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
        source: this.name,
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
        source: this.name,
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
        source: this.name,
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
        source: this.name,
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
        source: this.name,
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
        source: this.name,
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
      category: this.category,
      priority: 'medium',
      status: 'pending',
      projectId: projectId,
      metadata: {
        source: this.name,
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
        id: `${this.name.toLowerCase()}-critical-${Date.now()}`,
        title: `Fix Critical Issues from ${this.name}`,
        description: 'Address critical issues identified in analysis',
        type: 'fix',
        category: this.category,
        priority: 'critical',
        status: 'pending',
        projectId: projectId,
        parentTaskId: mainTask.id,
        metadata: {
          source: this.name,
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
        category: this.category,
        priority: 'high',
        status: 'pending',
        projectId: projectId,
        parentTaskId: mainTask.id,
        metadata: {
          source: this.name,
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
    const docsDir = path.join(projectPath, `docs/09_roadmap/tasks/${this.category}/${this.name.toLowerCase()}`);
    
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
    const docPath = path.join(docsDir, 'zap-security-implementation.md');
    
    const content = `# ZAP Security Analysis Implementation

## 📋 Analysis Overview
- **Step Name**: ${this.name}
- **Category**: ${this.category}
- **Analysis Date**: ${new Date().toISOString()}
- **Web Security Score**: ${result.summary?.webSecurityScore || 0}%
- **Coverage**: ${result.summary?.coverage || 0}%

## 📊 Analysis Results
- **Vulnerabilities**: ${result.summary?.totalVulnerabilities || 0}
- **Best Practices**: ${result.summary?.totalBestPractices || 0}
- **Confidence**: ${result.summary?.confidence || 0}%

## 🎯 Key Findings
${result.vulnerabilities ? result.vulnerabilities.map(vuln => `- **${vuln.type}**: ${vuln.message}`).join('\n') : '- No vulnerabilities detected'}

## 📝 Recommendations
${result.recommendations ? result.recommendations.map(rec => `- **${rec.title}**: ${rec.description}`).join('\n') : '- No recommendations'}

## 🔧 Implementation Tasks
${result.tasks ? result.tasks.map(task => `- **${task.title}**: ${task.description} (${task.estimatedHours}h)`).join('\n') : '- No tasks generated'}
`;

    await fs.writeFile(docPath, content, 'utf8');
    
    return {
      type: 'implementation',
      title: 'ZAP Security Analysis Implementation',
      path: docPath,
      category: this.category,
      source: this.name
    };
  }

  /**
   * Create analysis report
   * @param {Object} result - Analysis result
   * @param {string} docsDir - Documentation directory
   * @returns {Object} Analysis report
   */
  async createAnalysisReport(result, docsDir) {
    const docPath = path.join(docsDir, 'zap-security-report.md');
    
    const content = `# ZAP Security Analysis Report

## 📊 Executive Summary
ZAP security analysis completed with a score of ${result.summary?.webSecurityScore || 0}% and ${result.summary?.coverage || 0}% coverage.

## 🔍 Detailed Analysis
${result.vulnerabilities ? result.vulnerabilities.map(vuln => `
### ${vuln.type} Vulnerability
- **File**: ${vuln.file || 'N/A'}
- **Message**: ${vuln.message}
- **Severity**: ${vuln.severity}
- **Suggestion**: ${vuln.suggestion}
`).join('\n') : 'No vulnerabilities found'}

## 📈 Metrics
- **Vulnerabilities**: ${result.summary?.totalVulnerabilities || 0} found
- **Best Practices**: ${result.summary?.totalBestPractices || 0} identified
- **Confidence**: ${result.summary?.confidence || 0}% analysis confidence

## 🎯 Next Steps
Based on the analysis, consider addressing identified web security vulnerabilities and implementing security best practices.
`;

    await fs.writeFile(docPath, content, 'utf8');
    
    return {
      type: 'report',
      title: 'ZAP Security Analysis Report',
      path: docPath,
      category: this.category,
      source: this.name
    };
  }
}

// Create instance for execution
const stepInstance = new ZapSecurityStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
};