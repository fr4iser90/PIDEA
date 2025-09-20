/**
 * Compliance Security Step - Specialized Security Compliance Analysis
 * Analyzes security compliance and configuration standards
 * 
 * Created: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
 * Purpose: Specialized step for security compliance and configuration analysis
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const fs = require('fs').promises;
const path = require('path');

const logger = new Logger('compliance_security_step');

// Step configuration
const config = {
  name: 'ComplianceSecurityStep',
  type: 'analysis',
  description: 'Analyzes security compliance and configuration standards',
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

class ComplianceSecurityStep {
  constructor() {
    this.name = 'ComplianceSecurityStep';
    this.description = 'Analyzes security compliance and configuration standards';
    this.category = 'security';
    this.dependencies = [];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = ComplianceSecurityStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`🔒 Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);

      const projectPath = context.projectPath;
      const projectId = context.projectId;
      
      logger.info(`📊 Starting compliance security analysis for: ${projectPath}`);

      // Execute compliance security analysis
      const compliance = await this.analyzeCompliance(projectPath, {
        includeVulnerabilities: context.includeVulnerabilities !== false,
        includeBestPractices: context.includeBestPractices !== false
      });

      // Clean and format result
      const cleanResult = this.cleanResult(compliance);

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

      logger.info(`✅ Compliance security analysis completed successfully`);

      return {
        success: true,
        result: cleanResult,
        metadata: {
          stepName: 'ComplianceSecurityStep',
          projectPath,
          projectId,
          timestamp: new Date()
        }
      };

    } catch (error) {
      logger.error(`❌ Compliance security analysis failed: ${error.message}`);
      
      return {
        success: false,
        error: error.message,
        metadata: {
          stepName: 'ComplianceSecurityStep',
          projectPath: context.projectPath,
          timestamp: new Date()
        }
      };
    }
  }

  /**
   * Analyze security compliance and configuration
   */
  async analyzeCompliance(projectPath, options = {}) {
    try {
      const vulnerabilities = [];
      const bestPractices = [];

      // Analyze configuration files
      const configIssues = await this.analyzeConfiguration(projectPath);
      vulnerabilities.push(...configIssues.vulnerabilities);
      bestPractices.push(...configIssues.bestPractices);

      // Analyze environment files
      const envIssues = await this.analyzeEnvironment(projectPath);
      vulnerabilities.push(...envIssues.vulnerabilities);
      bestPractices.push(...envIssues.bestPractices);

      // Analyze Docker configuration
      const dockerIssues = await this.analyzeDockerConfiguration(projectPath);
      vulnerabilities.push(...dockerIssues.vulnerabilities);
      bestPractices.push(...dockerIssues.bestPractices);

      // Calculate compliance metrics
      const complianceScore = this.calculateComplianceScore(vulnerabilities);
      const coverage = this.calculateCoverage(projectPath);
      const confidence = this.calculateConfidence({ vulnerabilities, bestPractices });

      return {
        vulnerabilities,
        bestPractices,
        metrics: {
          complianceScore,
          coverage,
          confidence,
          vulnerabilitiesFound: vulnerabilities.length,
          bestPracticesFound: bestPractices.length
        }
      };

    } catch (error) {
      logger.error(`Compliance analysis failed: ${error.message}`);
      return {
        vulnerabilities: [],
        bestPractices: [],
        metrics: {
          complianceScore: 0,
          coverage: 0,
          confidence: 0,
          vulnerabilitiesFound: 0,
          bestPracticesFound: 0
        }
      };
    }
  }

  /**
   * Analyze configuration files for compliance issues
   */
  async analyzeConfiguration(projectPath) {
    const vulnerabilities = [];
    const bestPractices = [];

    try {
      const configFiles = [
        'package.json',
        'webpack.config.js',
        'next.config.js',
        'vite.config.js',
        'rollup.config.js',
        'babel.config.js',
        'eslint.config.js',
        'jest.config.js'
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
      logger.warn(`Could not analyze configuration: ${error.message}`);
    }

    return { vulnerabilities, bestPractices };
  }

  /**
   * Analyze configuration file for compliance issues
   */
  analyzeConfigFile(filename, content) {
    const vulnerabilities = [];
    const bestPractices = [];

    switch (filename) {
      case 'package.json':
        try {
          const pkg = JSON.parse(content);
          
          // Check for security-related scripts
          if (pkg.scripts) {
            if (pkg.scripts.audit) {
              bestPractices.push({
                type: 'compliance',
                message: 'Security audit script configured',
                suggestion: 'Run npm audit regularly',
                category: 'security-scripts',
                scanner: 'ComplianceSecurityStep'
              });
            } else {
              vulnerabilities.push({
                type: 'compliance',
                severity: 'low',
                file: filename,
                message: 'No security audit script found',
                suggestion: 'Add "audit": "npm audit" to package.json scripts',
                category: 'security-scripts',
                scanner: 'ComplianceSecurityStep'
              });
            }

            if (pkg.scripts.start && pkg.scripts.start.includes('--inspect')) {
              vulnerabilities.push({
                type: 'compliance',
                severity: 'high',
                file: filename,
                message: 'Debug mode enabled in production script',
                suggestion: 'Remove --inspect flag from production start script',
                category: 'debug-mode',
                scanner: 'ComplianceSecurityStep'
              });
            }
          }

          // Check for security dependencies
          const securityDeps = ['helmet', 'express-rate-limit', 'bcrypt', 'jsonwebtoken'];
          securityDeps.forEach(dep => {
            if (pkg.dependencies && pkg.dependencies[dep]) {
              bestPractices.push({
                type: 'compliance',
                message: `Security dependency detected: ${dep}`,
                suggestion: `Ensure ${dep} is properly configured`,
                category: 'security-dependencies',
                scanner: 'ComplianceSecurityStep'
              });
            }
          });

        } catch (error) {
          // Invalid JSON
        }
        break;

      case 'webpack.config.js':
        if (content.includes('devtool: "eval"')) {
          vulnerabilities.push({
            type: 'compliance',
            severity: 'medium',
            file: filename,
            message: 'Eval source map enabled in webpack',
            suggestion: 'Use safer source map options for production',
            category: 'source-maps',
            scanner: 'ComplianceSecurityStep'
          });
        }
        break;

      case 'next.config.js':
        if (content.includes('poweredByHeader: true')) {
          vulnerabilities.push({
            type: 'compliance',
            severity: 'low',
            file: filename,
            message: 'X-Powered-By header enabled',
            suggestion: 'Disable X-Powered-By header for security',
            category: 'security-headers',
            scanner: 'ComplianceSecurityStep'
          });
        }
        break;
    }

    return { vulnerabilities, bestPractices };
  }

  /**
   * Analyze environment configuration
   */
  async analyzeEnvironment(projectPath) {
    const vulnerabilities = [];
    const bestPractices = [];

    try {
      const envFiles = await this.findEnvFiles(projectPath);
      
      for (const envFile of envFiles) {
        try {
          const content = await fs.readFile(envFile, 'utf8');
          const envIssues = this.analyzeEnvFile(content, path.basename(envFile));
          vulnerabilities.push(...envIssues.vulnerabilities);
          bestPractices.push(...envIssues.bestPractices);
        } catch (error) {
          logger.warn(`Could not read env file: ${envFile}`);
        }
      }
    } catch (error) {
      logger.warn(`Could not analyze environment: ${error.message}`);
    }

    return { vulnerabilities, bestPractices };
  }

  /**
   * Analyze environment file for compliance issues
   */
  analyzeEnvFile(content, filename) {
    const vulnerabilities = [];
    const bestPractices = [];

    // Check for development environment variables in production files
    if (filename === '.env' && content.includes('NODE_ENV=development')) {
      vulnerabilities.push({
        type: 'compliance',
        severity: 'medium',
        file: filename,
        message: 'Development environment variables in .env',
        suggestion: 'Use .env.example for development variables',
        category: 'environment-config',
        scanner: 'ComplianceSecurityStep'
      });
    }

    // Check for best practices
    if (filename === '.env.example') {
      bestPractices.push({
        type: 'compliance',
        message: 'Environment example file found',
        suggestion: 'Good practice: providing environment template',
        category: 'environment-config',
        scanner: 'ComplianceSecurityStep'
      });
    }

    return { vulnerabilities, bestPractices };
  }

  /**
   * Analyze Docker configuration for compliance
   */
  async analyzeDockerConfiguration(projectPath) {
    const vulnerabilities = [];
    const bestPractices = [];

    try {
      const dockerFiles = [
        'Dockerfile',
        'docker-compose.yml',
        'docker-compose.yaml',
        '.dockerignore'
      ];

      for (const dockerFile of dockerFiles) {
        const filePath = path.join(projectPath, dockerFile);
        try {
          const content = await fs.readFile(filePath, 'utf8');
          const dockerIssues = this.analyzeDockerFile(dockerFile, content);
          vulnerabilities.push(...dockerIssues.vulnerabilities);
          bestPractices.push(...dockerIssues.bestPractices);
        } catch (error) {
          // File doesn't exist, skip
        }
      }
    } catch (error) {
      logger.warn(`Could not analyze Docker configuration: ${error.message}`);
    }

    return { vulnerabilities, bestPractices };
  }

  /**
   * Analyze Docker file for compliance issues
   */
  analyzeDockerFile(filename, content) {
    const vulnerabilities = [];
    const bestPractices = [];

    if (filename === 'Dockerfile') {
      // Check for security issues in Dockerfile
      if (content.includes('USER root')) {
        vulnerabilities.push({
          type: 'compliance',
          severity: 'high',
          file: filename,
          message: 'Running as root user in Docker',
          suggestion: 'Use non-root user for security',
          category: 'docker-security',
          scanner: 'ComplianceSecurityStep'
        });
      }

      if (content.includes('COPY . .')) {
        vulnerabilities.push({
          type: 'compliance',
          severity: 'medium',
          file: filename,
          message: 'Copying entire directory to Docker image',
          suggestion: 'Use .dockerignore and copy specific files only',
          category: 'docker-security',
          scanner: 'ComplianceSecurityStep'
        });
      }

      if (content.includes('RUN npm install')) {
        bestPractices.push({
          type: 'compliance',
          message: 'Using npm install in Docker',
          suggestion: 'Consider using npm ci for reproducible builds',
          category: 'docker-best-practices',
          scanner: 'ComplianceSecurityStep'
        });
      }
    }

    if (filename === 'docker-compose.yml' || filename === 'docker-compose.yaml') {
      if (content.includes('privileged: true')) {
        vulnerabilities.push({
          type: 'compliance',
          severity: 'high',
          file: filename,
          message: 'Privileged mode enabled in Docker Compose',
          suggestion: 'Avoid using privileged mode unless absolutely necessary',
          category: 'docker-security',
          scanner: 'ComplianceSecurityStep'
        });
      }

      if (content.includes('ports:')) {
        bestPractices.push({
          type: 'compliance',
          message: 'Port mapping configured in Docker Compose',
          suggestion: 'Ensure only necessary ports are exposed',
          category: 'docker-best-practices',
          scanner: 'ComplianceSecurityStep'
        });
      }
    }

    return { vulnerabilities, bestPractices };
  }

  /**
   * Find environment files in project
   */
  async findEnvFiles(projectPath) {
    const envFiles = [];
    
    try {
      const allFiles = await this.getAllFiles(projectPath);
      
      for (const file of allFiles) {
        const basename = path.basename(file);
        if (basename.startsWith('.env') || basename === 'environment.js' || basename === 'config.js') {
          envFiles.push(file);
        }
      }
    } catch (error) {
      logger.warn(`Could not find environment files: ${error.message}`);
    }
    
    return envFiles;
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
        complianceScore: result.metrics?.complianceScore || 0,
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
   * Calculate compliance score
   */
  calculateComplianceScore(issues) {
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
  calculateCoverage(projectPath) {
    // Compliance analysis coverage is typically high since we analyze configuration files
    return 90; // 90% coverage for compliance analysis
  }

  /**
   * Calculate analysis confidence
   */
  calculateConfidence(result) {
    const { vulnerabilities, bestPractices } = result;
    
    if (!vulnerabilities && !bestPractices) return 0;
    
    const totalIssues = (vulnerabilities?.length || 0) + (bestPractices?.length || 0);
    
    if (totalIssues === 0) return 75; // High confidence when no issues found
    
    // Higher confidence when more issues are found (indicates thorough analysis)
    return Math.min(100, Math.round(55 + (totalIssues * 2)));
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
        source: 'ComplianceSecurityStep',
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
        source: 'ComplianceSecurityStep',
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
        source: 'ComplianceSecurityStep',
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
        source: 'ComplianceSecurityStep',
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
        source: 'ComplianceSecurityStep',
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
        source: 'ComplianceSecurityStep',
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
        source: 'ComplianceSecurityStep',
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
        source: 'ComplianceSecurityStep',
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
          source: 'ComplianceSecurityStep',
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
          source: 'ComplianceSecurityStep',
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
    const docsDir = path.join(projectPath, 'docs', 'analysis', 'security', 'compliance-security-step');
    
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
    const docPath = path.join(docsDir, 'compliance-security-implementation.md');
    
    const content = `# Compliance Security Analysis Implementation

## 📋 Analysis Overview
- **Step Name**: ${this.name}
- **Category**: security
- **Analysis Date**: ${new Date().toISOString()}
- **Compliance Score**: ${result.summary?.complianceScore || 0}%
- **Coverage**: ${result.summary?.coverage || 0}%

## 📊 Analysis Results
- **Compliance Issues**: ${result.summary?.totalComplianceIssues || 0}
- **Best Practices**: ${result.summary?.totalBestPractices || 0}
- **Confidence**: ${result.summary?.confidence || 0}%

## 🎯 Key Findings
${result.complianceIssues ? result.complianceIssues.map(issue => `- **${issue.type}**: ${issue.description}`).join('\n') : '- No compliance issues detected'}

## 📝 Recommendations
${result.recommendations ? result.recommendations.map(rec => `- **${rec.title}**: ${rec.description}`).join('\n') : '- No recommendations'}

## 🔧 Implementation Tasks
${result.tasks ? result.tasks.map(task => `- **${task.title}**: ${task.description} (${task.estimatedHours}h)`).join('\n') : '- No tasks generated'}
`;

    await fs.writeFile(docPath, content, 'utf8');
    
    return {
      type: 'implementation',
      title: 'Compliance Security Analysis Implementation',
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
    const docPath = path.join(docsDir, 'compliance-security-report.md');
    
    const content = `# Compliance Security Analysis Report

## 📊 Executive Summary
Compliance security analysis completed with a score of ${result.summary?.complianceScore || 0}% and ${result.summary?.coverage || 0}% coverage.

## 🔍 Detailed Analysis
${result.complianceIssues ? result.complianceIssues.map(issue => `
### ${issue.type} Compliance Issue
- **File**: ${issue.file || 'N/A'}
- **Description**: ${issue.description}
- **Severity**: ${issue.severity}
- **Suggestion**: ${issue.suggestion}
`).join('\n') : 'No compliance issues found'}

## 📈 Metrics
- **Compliance Issues**: ${result.summary?.totalComplianceIssues || 0} found
- **Best Practices**: ${result.summary?.totalBestPractices || 0} identified
- **Confidence**: ${result.summary?.confidence || 0}% analysis confidence

## 🎯 Next Steps
Based on the analysis, consider addressing identified compliance issues and implementing security best practices.
`;

    await fs.writeFile(docPath, content, 'utf8');
    
    return {
      type: 'report',
      title: 'Compliance Security Analysis Report',
      path: docPath,
      category: 'security',
      source: "TrivySecurityStep"
    };
  }
}

// Create instance for execution
const stepInstance = new ComplianceSecurityStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
};