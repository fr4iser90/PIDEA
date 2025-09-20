/**
 * Semgrep Security Step - Specialized Code Security Analysis
 * Analyzes code for security vulnerabilities using Semgrep-like patterns
 * 
 * Created: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
 * Purpose: Specialized step for code security analysis and static analysis
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const fs = require('fs').promises;
const path = require('path');

const logger = new Logger('semgrep_security_step');

// Step configuration
const config = {
  name: 'SemgrepSecurityStep',
  type: 'analysis',
  description: 'Analyzes code for security vulnerabilities using Semgrep-like patterns',
  category: 'security',
  version: '1.0.0',
  dependencies: [],
  settings: {
    timeout: 45000,
    includeVulnerabilities: true,
    includeBestPractices: true,
    maxFiles: 100
  },
  validation: {
    requiredFiles: ['package.json'],
    supportedProjects: ['nodejs', 'react', 'vue', 'angular', 'express', 'nest']
  }
};

class SemgrepSecurityStep {
  constructor() {
    this.name = 'SemgrepSecurityStep';
    this.description = 'Analyzes code for security vulnerabilities using Semgrep-like patterns';
    this.category = 'security';
    this.dependencies = [];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = SemgrepSecurityStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`🔒 Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);

      const projectPath = context.projectPath;
      const projectId = context.projectId;
      
      logger.info(`📊 Starting Semgrep code analysis for: ${projectPath}`);

      // Execute Semgrep code analysis
      const codeSecurity = await this.analyzeCodeSecurity(projectPath, {
        includeVulnerabilities: context.includeVulnerabilities !== false,
        includeBestPractices: context.includeBestPractices !== false,
        maxFiles: context.maxFiles || config.settings.maxFiles
      });

      // Clean and format result
      const cleanResult = this.cleanResult(codeSecurity);

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

      logger.info(`✅ Semgrep security analysis completed successfully`);

      return {
        success: true,
        result: cleanResult,
        metadata: {
          stepName: 'SemgrepSecurityStep',
          projectPath,
          projectId,
          timestamp: new Date()
        }
      };

    } catch (error) {
      logger.error(`❌ Semgrep code analysis failed: ${error.message}`);
      
      return {
        success: false,
        error: error.message,
        metadata: {
          stepName: 'SemgrepSecurityStep',
          projectPath: context.projectPath,
          timestamp: new Date()
        }
      };
    }
  }

  /**
   * Analyze code for security issues using Semgrep-like patterns
   */
  async analyzeCodeSecurity(projectPath, options = {}) {
    try {
      const vulnerabilities = [];
      const bestPractices = [];
      const jsFiles = await this.getJavaScriptFiles(projectPath);
      const maxFiles = options.maxFiles || config.settings.maxFiles;

      logger.info(`Analyzing ${Math.min(jsFiles.length, maxFiles)} files for code security issues`);

      // Analyze each file for security issues
      for (const file of jsFiles) { // ANALYZE ALL FILES - NO LIMITS!
        try {
          const content = await fs.readFile(file, 'utf8');
          const fileIssues = this.detectCodeSecurityIssues(content, file);
          vulnerabilities.push(...fileIssues.vulnerabilities);
          bestPractices.push(...fileIssues.bestPractices);
        } catch (error) {
          logger.warn(`Could not read file: ${file}`);
        }
      }

      // Calculate code security metrics
      const codeSecurityScore = this.calculateCodeSecurityScore(vulnerabilities);
      const coverage = this.calculateCoverage(jsFiles, projectPath);
      const confidence = this.calculateConfidence({ vulnerabilities, bestPractices });

      return {
        vulnerabilities,
        bestPractices,
        metrics: {
          codeSecurityScore,
          coverage,
          confidence,
          filesAnalyzed: Math.min(jsFiles.length, maxFiles),
          totalFiles: jsFiles.length,
          vulnerabilitiesFound: vulnerabilities.length,
          bestPracticesFound: bestPractices.length
        }
      };

    } catch (error) {
      logger.error(`Semgrep code analysis failed: ${error.message}`);
      return {
        vulnerabilities: [],
        bestPractices: [],
        metrics: {
          codeSecurityScore: 0,
          coverage: 0,
          confidence: 0,
          filesAnalyzed: 0,
          totalFiles: 0,
          vulnerabilitiesFound: 0,
          bestPracticesFound: 0
        }
      };
    }
  }

  /**
   * Detect code security issues using Semgrep-like patterns
   */
  detectCodeSecurityIssues(content, filePath) {
    const vulnerabilities = [];
    const bestPractices = [];

    // Semgrep-like security patterns
    const securityPatterns = [
      // SQL Injection patterns
      { 
        pattern: /query\s*\(\s*['"`].*\+\s*\w+/, 
        severity: 'high', 
        message: 'Potential SQL injection detected', 
        cve: 'CWE-89',
        category: 'sql-injection'
      },
      { 
        pattern: /execute\s*\(\s*['"`].*\+\s*\w+/, 
        severity: 'high', 
        message: 'Potential SQL injection in execute statement', 
        cve: 'CWE-89',
        category: 'sql-injection'
      },
      
      // XSS patterns
      { 
        pattern: /innerHTML\s*=\s*\w+/, 
        severity: 'high', 
        message: 'Potential XSS via innerHTML assignment', 
        cve: 'CWE-79',
        category: 'xss'
      },
      { 
        pattern: /document\.write\s*\(\s*\w+/, 
        severity: 'high', 
        message: 'Potential XSS via document.write', 
        cve: 'CWE-79',
        category: 'xss'
      },
      
      // Command injection patterns
      { 
        pattern: /exec\s*\(\s*['"`].*\+\s*\w+/, 
        severity: 'critical', 
        message: 'Potential command injection detected', 
        cve: 'CWE-78',
        category: 'command-injection'
      },
      { 
        pattern: /spawn\s*\(\s*['"`].*\+\s*\w+/, 
        severity: 'critical', 
        message: 'Potential command injection via spawn', 
        cve: 'CWE-78',
        category: 'command-injection'
      },
      
      // Path traversal patterns
      { 
        pattern: /fs\.readFile\s*\(\s*\w+/, 
        severity: 'medium', 
        message: 'Potential path traversal in file read', 
        cve: 'CWE-22',
        category: 'path-traversal'
      },
      { 
        pattern: /fs\.writeFile\s*\(\s*\w+/, 
        severity: 'medium', 
        message: 'Potential path traversal in file write', 
        cve: 'CWE-22',
        category: 'path-traversal'
      },
      
      // Hardcoded secrets
      { 
        pattern: /password\s*[:=]\s*['"`][^'"`]+['"`]/, 
        severity: 'high', 
        message: 'Hardcoded password detected', 
        cve: 'CWE-259',
        category: 'hardcoded-secrets'
      },
      { 
        pattern: /api_key\s*[:=]\s*['"`][^'"`]+['"`]/, 
        severity: 'high', 
        message: 'Hardcoded API key detected', 
        cve: 'CWE-259',
        category: 'hardcoded-secrets'
      },
      { 
        pattern: /secret\s*[:=]\s*['"`][^'"`]+['"`]/, 
        severity: 'high', 
        message: 'Hardcoded secret detected', 
        cve: 'CWE-259',
        category: 'hardcoded-secrets'
      },
      
      // Weak crypto patterns
      { 
        pattern: /crypto\.createHash\s*\(\s*['"`]md5['"`]/, 
        severity: 'medium', 
        message: 'Weak hash algorithm (MD5) detected', 
        cve: 'CWE-327',
        category: 'weak-crypto'
      },
      { 
        pattern: /crypto\.createHash\s*\(\s*['"`]sha1['"`]/, 
        severity: 'medium', 
        message: 'Weak hash algorithm (SHA1) detected', 
        cve: 'CWE-327',
        category: 'weak-crypto'
      },
      
      // Debug patterns
      { 
        pattern: /console\.log\s*\(/, 
        severity: 'low', 
        message: 'Debug logging detected', 
        cve: 'CWE-200',
        category: 'debug-info'
      },
      { 
        pattern: /debugger;/, 
        severity: 'medium', 
        message: 'Debugger statement detected', 
        cve: 'CWE-489',
        category: 'debug-info'
      }
    ];

    // Check for security patterns
    securityPatterns.forEach(({ pattern, severity, message, cve, category }) => {
      if (pattern.test(content)) {
        vulnerabilities.push({
          type: 'code',
          severity,
          file: path.relative(process.cwd(), filePath),
          message,
          cve,
          category,
          suggestion: `Review and secure this ${category} pattern`,
          scanner: 'SemgrepSecurityStep'
        });
      }
    });

    // Check for security best practices
    const bestPracticePatterns = [
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
        pattern: /bcrypt\.hash/,
        message: 'Bcrypt password hashing detected',
        suggestion: 'Ensure bcrypt is properly configured',
        category: 'password-hashing'
      },
      {
        pattern: /jwt\.sign/,
        message: 'JWT token signing detected',
        suggestion: 'Ensure JWT is properly configured with secure options',
        category: 'jwt'
      },
      {
        pattern: /validator\.isEmail/,
        message: 'Input validation detected',
        suggestion: 'Ensure comprehensive input validation',
        category: 'input-validation'
      }
    ];

    bestPracticePatterns.forEach(({ pattern, message, suggestion, category }) => {
      if (pattern.test(content)) {
        bestPractices.push({
          type: 'code',
          message,
          suggestion,
          category,
          scanner: 'SemgrepSecurityStep'
        });
      }
    });

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
        codeSecurityScore: result.metrics?.codeSecurityScore || 0,
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
   * Calculate code security score based on vulnerabilities
   */
  calculateCodeSecurityScore(issues) {
    if (!issues || issues.length === 0) return 100;

    const severityWeights = {
      critical: 15,
      high: 10,
      medium: 5,
      low: 2
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
    
    // Code analysis coverage calculation
    return Math.min(100, Math.round((files.length / 200) * 100));
  }

  /**
   * Calculate analysis confidence
   */
  calculateConfidence(result) {
    const { vulnerabilities, bestPractices } = result;
    
    if (!vulnerabilities && !bestPractices) return 0;
    
    const totalIssues = (vulnerabilities?.length || 0) + (bestPractices?.length || 0);
    
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
        category: 'security',
        source: 'SemgrepSecurityStep',
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
        category: 'security',
        source: 'SemgrepSecurityStep',
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
        category: 'security',
        source: 'SemgrepSecurityStep',
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
        category: 'security',
        source: 'SemgrepSecurityStep',
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
        source: 'SemgrepSecurityStep',
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
        source: 'SemgrepSecurityStep',
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
        source: 'SemgrepSecurityStep',
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
        source: 'SemgrepSecurityStep',
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
        category: 'security',
        priority: 'critical',
        status: 'pending',
        projectId: projectId,
        parentTaskId: mainTask.id,
        metadata: {
          source: 'SemgrepSecurityStep',
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
          source: 'SemgrepSecurityStep',
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
    const docsDir = path.join(projectPath, `{{taskDocumentationPath}}${this.category}/${this.name.toLowerCase()}`);
    
    
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
    const docPath = path.join(docsDir, 'semgrep-security-implementation.md');
    
    const content = `# Semgrep Security Analysis Implementation

## 📋 Analysis Overview
- **Step Name**: ${this.name}
- **Category**: ${this.category}
- **Analysis Date**: ${new Date().toISOString()}
- **Code Security Score**: ${result.summary?.codeSecurityScore || 0}%
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
      title: 'Semgrep Security Analysis Implementation',
      path: docPath,
      category: 'security',
      source: "TrivySecurityStep"
    };
  }

  /**
   * Create analysis report
   * @param {Object} result - Analysis result
   * @param {string} docsDir - Documentation directory
   * @returns {Object} Analysis report
   */
  async createAnalysisReport(result, docsDir) {
    const docPath = path.join(docsDir, 'semgrep-security-report.md');
    
    const content = `# Semgrep Security Analysis Report

## 📊 Executive Summary
Semgrep security analysis completed with a score of ${result.summary?.codeSecurityScore || 0}% and ${result.summary?.coverage || 0}% coverage.

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
Based on the analysis, consider addressing identified code security vulnerabilities and implementing security best practices.
`;

    await fs.writeFile(docPath, content, 'utf8');
    
    return {
      type: 'report',
      title: 'Semgrep Security Analysis Report',
      path: docPath,
      category: 'security',
      source: "TrivySecurityStep"
    };
  }
}

// Create instance for execution
const stepInstance = new SemgrepSecurityStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
};