/**
 * Secret Scanning Step - Specialized Secret Detection Analysis
 * Detects hardcoded secrets and sensitive information in code
 * 
 * Created: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
 * Purpose: Specialized step for secret detection and sensitive data analysis
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const fs = require('fs').promises;
const path = require('path');

const logger = new Logger('secret_scanning_step');

// Step configuration
const config = {
  name: 'SecretScanningStep',
  type: 'analysis',
  description: 'Detects hardcoded secrets and sensitive information in code',
  category: 'security',
  version: '1.0.0',
  dependencies: [],
  settings: {
    timeout: 30000,
    includeVulnerabilities: true,
    includeBestPractices: true,
    maxFiles: 200
  },
  validation: {
    requiredFiles: ['package.json'],
    supportedProjects: ['nodejs', 'react', 'vue', 'angular', 'express', 'nest']
  }
};

class SecretScanningStep {
  constructor() {
    this.name = 'SecretScanningStep';
    this.description = 'Detects hardcoded secrets and sensitive information in code';
    this.category = 'security';
    this.dependencies = [];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = SecretScanningStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`🔒 Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);

      const projectPath = context.projectPath;
      const projectId = context.projectId;
      
      logger.info(`📊 Starting secret scanning analysis for: ${projectPath}`);

      // Execute secret scanning analysis
      const secrets = await this.analyzeSecrets(projectPath, {
        includeVulnerabilities: context.includeVulnerabilities !== false,
        includeBestPractices: context.includeBestPractices !== false,
        maxFiles: context.maxFiles || config.settings.maxFiles
      });

      // Clean and format result
      const cleanResult = this.cleanResult(secrets);

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

      logger.info(`✅ Secret scanning analysis completed successfully`);

      return {
        success: true,
        result: cleanResult,
        metadata: {
          stepName: 'SecretScanningStep',
          projectPath,
          projectId,
          timestamp: new Date()
        }
      };

    } catch (error) {
      logger.error(`❌ Secret scanning analysis failed: ${error.message}`);
      
      return {
        success: false,
        error: error.message,
        metadata: {
          stepName: 'SecretScanningStep',
          projectPath: context.projectPath,
          timestamp: new Date()
        }
      };
    }
  }

  /**
   * Analyze project for hardcoded secrets and sensitive information
   */
  async analyzeSecrets(projectPath, options = {}) {
    try {
      const vulnerabilities = [];
      const bestPractices = [];
      const allFiles = await this.getAllFiles(projectPath);
      const maxFiles = options.maxFiles || config.settings.maxFiles;

      logger.info(`Scanning ${Math.min(allFiles.length, maxFiles)} files for secrets`);

      // Analyze each file for secrets
      for (const file of allFiles) { // ANALYZE ALL FILES - NO LIMITS!
        try {
          const content = await fs.readFile(file, 'utf8');
          const fileSecrets = this.detectSecrets(content, file);
          vulnerabilities.push(...fileSecrets.vulnerabilities);
          bestPractices.push(...fileSecrets.bestPractices);
        } catch (error) {
          logger.warn(`Could not read file: ${file}`);
        }
      }

      // Analyze environment files specifically
      const envSecrets = await this.analyzeEnvironmentFiles(projectPath);
      vulnerabilities.push(...envSecrets.vulnerabilities);
      bestPractices.push(...envSecrets.bestPractices);

      // Calculate secret scanning metrics
      const secretScore = this.calculateSecretScore(vulnerabilities);
      const coverage = this.calculateCoverage(allFiles, projectPath);
      const confidence = this.calculateConfidence({ vulnerabilities, bestPractices });

      return {
        vulnerabilities,
        bestPractices,
        metrics: {
          secretScore,
          coverage,
          confidence,
          filesAnalyzed: Math.min(allFiles.length, maxFiles),
          totalFiles: allFiles.length,
          secretsFound: vulnerabilities.length,
          bestPracticesFound: bestPractices.length
        }
      };

    } catch (error) {
      logger.error(`Secret scanning analysis failed: ${error.message}`);
      return {
        vulnerabilities: [],
        bestPractices: [],
        metrics: {
          secretScore: 0,
          coverage: 0,
          confidence: 0,
          filesAnalyzed: 0,
          totalFiles: 0,
          secretsFound: 0,
          bestPracticesFound: 0
        }
      };
    }
  }

  /**
   * Detect secrets in file content
   */
  detectSecrets(content, filePath) {
    const vulnerabilities = [];
    const bestPractices = [];

    // Secret patterns to detect
    const secretPatterns = [
      // API Keys
      {
        pattern: /api[_-]?key\s*[:=]\s*['"`][^'"`]{20,}['"`]/i,
        severity: 'high',
        message: 'API key detected in code',
        category: 'api-key',
        suggestion: 'Move API key to environment variables'
      },
      {
        pattern: /api[_-]?token\s*[:=]\s*['"`][^'"`]{20,}['"`]/i,
        severity: 'high',
        message: 'API token detected in code',
        category: 'api-token',
        suggestion: 'Move API token to environment variables'
      },
      
      // Passwords
      {
        pattern: /password\s*[:=]\s*['"`][^'"`]+['"`]/i,
        severity: 'high',
        message: 'Hardcoded password detected',
        category: 'password',
        suggestion: 'Move password to environment variables'
      },
      {
        pattern: /passwd\s*[:=]\s*['"`][^'"`]+['"`]/i,
        severity: 'high',
        message: 'Hardcoded password detected',
        category: 'password',
        suggestion: 'Move password to environment variables'
      },
      
      // Database credentials
      {
        pattern: /db[_-]?password\s*[:=]\s*['"`][^'"`]+['"`]/i,
        severity: 'high',
        message: 'Database password detected',
        category: 'database-credentials',
        suggestion: 'Move database credentials to environment variables'
      },
      {
        pattern: /database[_-]?password\s*[:=]\s*['"`][^'"`]+['"`]/i,
        severity: 'high',
        message: 'Database password detected',
        category: 'database-credentials',
        suggestion: 'Move database credentials to environment variables'
      },
      
      // JWT secrets
      {
        pattern: /jwt[_-]?secret\s*[:=]\s*['"`][^'"`]{20,}['"`]/i,
        severity: 'critical',
        message: 'JWT secret detected in code',
        category: 'jwt-secret',
        suggestion: 'Move JWT secret to environment variables'
      },
      {
        pattern: /jwt[_-]?key\s*[:=]\s*['"`][^'"`]{20,}['"`]/i,
        severity: 'critical',
        message: 'JWT key detected in code',
        category: 'jwt-secret',
        suggestion: 'Move JWT key to environment variables'
      },
      
      // Private keys
      {
        pattern: /private[_-]?key\s*[:=]\s*['"`]-----BEGIN[^'"`]+-----END[^'"`]+-----['"`]/i,
        severity: 'critical',
        message: 'Private key detected in code',
        category: 'private-key',
        suggestion: 'Move private key to secure file or environment'
      },
      
      // AWS credentials
      {
        pattern: /aws[_-]?access[_-]?key[_-]?id\s*[:=]\s*['"`][^'"`]{20,}['"`]/i,
        severity: 'high',
        message: 'AWS access key detected',
        category: 'aws-credentials',
        suggestion: 'Move AWS credentials to environment variables'
      },
      {
        pattern: /aws[_-]?secret[_-]?access[_-]?key\s*[:=]\s*['"`][^'"`]{20,}['"`]/i,
        severity: 'high',
        message: 'AWS secret key detected',
        category: 'aws-credentials',
        suggestion: 'Move AWS credentials to environment variables'
      },
      
      // OAuth secrets
      {
        pattern: /oauth[_-]?secret\s*[:=]\s*['"`][^'"`]{20,}['"`]/i,
        severity: 'high',
        message: 'OAuth secret detected',
        category: 'oauth-secret',
        suggestion: 'Move OAuth secret to environment variables'
      },
      {
        pattern: /client[_-]?secret\s*[:=]\s*['"`][^'"`]{20,}['"`]/i,
        severity: 'high',
        message: 'Client secret detected',
        category: 'oauth-secret',
        suggestion: 'Move client secret to environment variables'
      },
      
      // Generic secrets
      {
        pattern: /secret\s*[:=]\s*['"`][^'"`]{10,}['"`]/i,
        severity: 'medium',
        message: 'Generic secret detected',
        category: 'generic-secret',
        suggestion: 'Review and move to environment variables if sensitive'
      },
      
      // Email credentials
      {
        pattern: /email[_-]?password\s*[:=]\s*['"`][^'"`]+['"`]/i,
        severity: 'high',
        message: 'Email password detected',
        category: 'email-credentials',
        suggestion: 'Move email credentials to environment variables'
      },
      {
        pattern: /smtp[_-]?password\s*[:=]\s*['"`][^'"`]+['"`]/i,
        severity: 'high',
        message: 'SMTP password detected',
        category: 'email-credentials',
        suggestion: 'Move SMTP credentials to environment variables'
      }
    ];

    // Check for secret patterns
    secretPatterns.forEach(({ pattern, severity, message, category, suggestion }) => {
      if (pattern.test(content)) {
        vulnerabilities.push({
          type: 'secret',
          severity,
          file: path.relative(process.cwd(), filePath),
          message,
          category,
          suggestion,
          scanner: 'SecretScanningStep'
        });
      }
    });

    // Check for best practices
    const bestPracticePatterns = [
      {
        pattern: /process\.env\./,
        message: 'Environment variable usage detected',
        suggestion: 'Good practice: using environment variables',
        category: 'env-usage'
      },
      {
        pattern: /dotenv\.config/,
        message: 'Dotenv configuration detected',
        suggestion: 'Good practice: using dotenv for environment management',
        category: 'dotenv'
      },
      {
        pattern: /\.env\.example/,
        message: 'Environment example file detected',
        suggestion: 'Good practice: providing environment template',
        category: 'env-template'
      }
    ];

    bestPracticePatterns.forEach(({ pattern, message, suggestion, category }) => {
      if (pattern.test(content)) {
        bestPractices.push({
          type: 'secret',
          message,
          suggestion,
          category,
          scanner: 'SecretScanningStep'
        });
      }
    });

    return { vulnerabilities, bestPractices };
  }

  /**
   * Analyze environment files for secrets
   */
  async analyzeEnvironmentFiles(projectPath) {
    const vulnerabilities = [];
    const bestPractices = [];

    try {
      const envFiles = await this.findEnvFiles(projectPath);
      
      for (const envFile of envFiles) {
        try {
          const content = await fs.readFile(envFile, 'utf8');
          const envSecrets = this.analyzeEnvFile(content, path.basename(envFile));
          vulnerabilities.push(...envSecrets.vulnerabilities);
          bestPractices.push(...envSecrets.bestPractices);
        } catch (error) {
          logger.warn(`Could not read env file: ${envFile}`);
        }
      }
    } catch (error) {
      logger.warn(`Could not analyze environment files: ${error.message}`);
    }

    return { vulnerabilities, bestPractices };
  }

  /**
   * Analyze environment file content
   */
  analyzeEnvFile(content, filename) {
    const vulnerabilities = [];
    const bestPractices = [];

    // Check for actual secrets in .env files
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      // Skip comments and empty lines
      if (trimmedLine.startsWith('#') || trimmedLine === '') {
        return;
      }

      // Check for actual values (not just variable names)
      if (trimmedLine.includes('=')) {
        const [key, value] = trimmedLine.split('=', 2);
        const cleanValue = value.replace(/['"`]/g, '').trim();
        
        // Check if value looks like a secret
        if (cleanValue.length > 10 && !cleanValue.startsWith('$')) {
          vulnerabilities.push({
            type: 'secret',
            severity: 'medium',
            file: filename,
            line: index + 1,
            message: `Potential secret value in environment file: ${key}`,
            category: 'env-secret',
            suggestion: 'Review if this value should be in version control',
            scanner: 'SecretScanningStep'
          });
        }
      }
    });

    // Check for best practices
    if (filename === '.env.example') {
      bestPractices.push({
        type: 'secret',
        message: 'Environment example file found',
        suggestion: 'Good practice: providing environment template',
        category: 'env-template',
        scanner: 'SecretScanningStep'
      });
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
        secretScore: result.metrics?.secretScore || 0,
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
   * Calculate secret security score
   */
  calculateSecretScore(issues) {
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
    
    // Secret scanning coverage calculation
    return Math.min(100, Math.round((files.length / 300) * 100));
  }

  /**
   * Calculate analysis confidence
   */
  calculateConfidence(result) {
    const { vulnerabilities, bestPractices } = result;
    
    if (!vulnerabilities && !bestPractices) return 0;
    
    const totalIssues = (vulnerabilities?.length || 0) + (bestPractices?.length || 0);
    
    if (totalIssues === 0) return 70; // High confidence when no secrets found
    
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
    
    // Check for low analysis score
    if (result.score < 70) {
      issues.push({
        type: 'low-analysis-score',
        title: 'Low Analysis Score',
        description: `Analysis score of ${result.score}% indicates areas for improvement`,
        severity: 'medium',
        priority: 'medium',
        category: 'security',
        source: 'SecretScanningStep',
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
        source: 'SecretScanningStep',
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
        source: 'SecretScanningStep',
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
        source: 'SecretScanningStep',
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
        source: 'SecretScanningStep',
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
        source: 'SecretScanningStep',
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
        source: 'SecretScanningStep',
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
        source: 'SecretScanningStep',
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
          source: 'SecretScanningStep',
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
          source: 'SecretScanningStep',
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
    const docPath = path.join(docsDir, 'secret-scanning-implementation.md');
    
    const content = `# Secret Scanning Analysis Implementation

## 📋 Analysis Overview
- **Step Name**: ${this.name}
- **Category**: ${this.category}
- **Analysis Date**: ${new Date().toISOString()}
- **Secret Security Score**: ${result.summary?.secretSecurityScore || 0}%
- **Coverage**: ${result.summary?.coverage || 0}%

## 📊 Analysis Results
- **Secrets Found**: ${result.summary?.totalSecrets || 0}
- **Best Practices**: ${result.summary?.totalBestPractices || 0}
- **Confidence**: ${result.summary?.confidence || 0}%

## 🎯 Key Findings
${result.secrets ? result.secrets.map(secret => `- **${secret.type}**: ${secret.description}`).join('\n') : '- No secrets detected'}

## 📝 Recommendations
${result.recommendations ? result.recommendations.map(rec => `- **${rec.title}**: ${rec.description}`).join('\n') : '- No recommendations'}

## 🔧 Implementation Tasks
${result.tasks ? result.tasks.map(task => `- **${task.title}**: ${task.description} (${task.estimatedHours}h)`).join('\n') : '- No tasks generated'}
`;

    await fs.writeFile(docPath, content, 'utf8');
    
    return {
      type: 'implementation',
      title: 'Secret Scanning Analysis Implementation',
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
    const docPath = path.join(docsDir, 'secret-scanning-report.md');
    
    const content = `# Secret Scanning Analysis Report

## 📊 Executive Summary
Secret scanning analysis completed with a score of ${result.summary?.secretSecurityScore || 0}% and ${result.summary?.coverage || 0}% coverage.

## 🔍 Detailed Analysis
${result.secrets ? result.secrets.map(secret => `
### ${secret.type} Secret
- **File**: ${secret.file || 'N/A'}
- **Description**: ${secret.description}
- **Severity**: ${secret.severity}
- **Suggestion**: ${secret.suggestion}
`).join('\n') : 'No secrets found'}

## 📈 Metrics
- **Secrets**: ${result.summary?.totalSecrets || 0} found
- **Best Practices**: ${result.summary?.totalBestPractices || 0} identified
- **Confidence**: ${result.summary?.confidence || 0}% analysis confidence

## 🎯 Next Steps
Based on the analysis, consider removing exposed secrets and implementing proper secret management practices.
`;

    await fs.writeFile(docPath, content, 'utf8');
    
    return {
      type: 'report',
      title: 'Secret Scanning Analysis Report',
      path: docPath,
      category: 'security',
      source: "TrivySecurityStep"
    };
  }
}

// Create instance for execution
const stepInstance = new SecretScanningStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
};