/**
 * Security Analysis Step - Core Analysis Step
 * Analyzes security vulnerabilities and best practices
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const fs = require('fs').promises;
const path = require('path');

const logger = new Logger('security_analysis_step');

// Step configuration
const config = {
  name: 'SecurityAnalysisStep',
  type: 'analysis',
  description: 'Analyzes security vulnerabilities and best practices',
  category: 'analysis',
  version: '1.0.0',
  dependencies: [],
  settings: {
    timeout: 45000,
    includeVulnerabilities: true,
    includeBestPractices: true,
    includeDependencies: true
  },
  validation: {
    requiredFiles: ['package.json'],
    supportedProjects: ['nodejs', 'react', 'vue', 'angular', 'express', 'nest']
  }
};

class SecurityAnalysisStep {
  constructor() {
    this.name = 'SecurityAnalysisStep';
    this.description = 'Analyzes security vulnerabilities and best practices';
    this.category = 'analysis';
    this.dependencies = [];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = SecurityAnalysisStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`🔒 Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);

      const projectPath = context.projectPath;
      
      logger.info(`📊 Starting security analysis for: ${projectPath}`);

      // Execute security analysis
      const security = await this.analyzeSecurity(projectPath, {
        includeVulnerabilities: context.includeVulnerabilities !== false,
        includeBestPractices: context.includeBestPractices !== false,
        includeDependencies: context.includeDependencies !== false
      });

      // Clean and format result
      const cleanResult = this.cleanResult(security);

      logger.info(`✅ Security analysis completed successfully`);

      return {
        success: true,
        result: cleanResult,
        metadata: {
          stepName: this.name,
          projectPath,
          analysisType: 'security',
          timestamp: new Date()
        }
      };

    } catch (error) {
      logger.error(`❌ Security analysis failed: ${error.message}`);
      
      return {
        success: false,
        error: error.message,
        metadata: {
          stepName: this.name,
          projectPath: context.projectPath,
          analysisType: 'security',
          timestamp: new Date()
        }
      };
    }
  }

  /**
   * Analyze security for a project
   * @param {string} projectPath - Path to the project
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Security analysis result
   */
  async analyzeSecurity(projectPath, options = {}) {
    try {
      const result = {
        riskLevel: 'unknown',
        vulnerabilities: [],
        bestPractices: [],
        dependencies: [],
        summary: {}
      };

      // Analyze dependencies for vulnerabilities
      if (options.includeDependencies) {
        const dependencyAnalysis = await this.analyzeDependencies(projectPath);
        result.dependencies = dependencyAnalysis;
      }

      // Analyze code for security issues
      const codeAnalysis = await this.analyzeCodeSecurity(projectPath);
      
      // Analyze configuration files
      const configAnalysis = await this.analyzeConfiguration(projectPath);
      
      // Analyze environment and secrets
      const environmentAnalysis = await this.analyzeEnvironment(projectPath);

      // Aggregate vulnerabilities
      if (options.includeVulnerabilities) {
        result.vulnerabilities = [
          ...dependencyAnalysis.vulnerabilities,
          ...codeAnalysis.vulnerabilities,
          ...configAnalysis.vulnerabilities,
          ...environmentAnalysis.vulnerabilities
        ];
      }

      // Aggregate best practices
      if (options.includeBestPractices) {
        result.bestPractices = [
          ...dependencyAnalysis.bestPractices,
          ...codeAnalysis.bestPractices,
          ...configAnalysis.bestPractices,
          ...environmentAnalysis.bestPractices
        ];
      }

      // Calculate risk level
      result.riskLevel = this.calculateRiskLevel(result.vulnerabilities);

      // Create summary
      result.summary = {
        riskLevel: result.riskLevel,
        totalVulnerabilities: result.vulnerabilities.length,
        totalBestPractices: result.bestPractices.length,
        criticalIssues: result.vulnerabilities.filter(v => v.severity === 'critical').length,
        highIssues: result.vulnerabilities.filter(v => v.severity === 'high').length,
        mediumIssues: result.vulnerabilities.filter(v => v.severity === 'medium').length,
        lowIssues: result.vulnerabilities.filter(v => v.severity === 'low').length
      };

      return result;

    } catch (error) {
      logger.error(`Security analysis failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Analyze dependencies for security vulnerabilities
   */
  async analyzeDependencies(projectPath) {
    try {
      const vulnerabilities = [];
      const bestPractices = [];
      const packageJsonPath = path.join(projectPath, 'package.json');

      try {
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
        const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

        // Check for known vulnerable packages (simplified check)
        const vulnerablePackages = [
          'lodash', // Example - would normally check against vulnerability database
          'moment',
          'jquery'
        ];

        Object.keys(dependencies).forEach(pkg => {
          if (vulnerablePackages.includes(pkg)) {
            vulnerabilities.push({
              type: 'dependency',
              severity: 'medium',
              package: pkg,
              message: `Potentially vulnerable package: ${pkg}`,
              suggestion: `Update ${pkg} to latest version or consider alternatives`
            });
          }
        });

        // Check for best practices
        if (packageJson.scripts && packageJson.scripts.audit) {
          bestPractices.push({
            type: 'dependency',
            message: 'Security audit script configured',
            suggestion: 'Run npm audit regularly'
          });
        } else {
          vulnerabilities.push({
            type: 'dependency',
            severity: 'low',
            message: 'No security audit script found',
            suggestion: 'Add "audit": "npm audit" to package.json scripts'
          });
        }

      } catch (error) {
        vulnerabilities.push({
          type: 'dependency',
          severity: 'high',
          message: 'Could not read package.json',
          suggestion: 'Ensure package.json exists and is valid JSON'
        });
      }

      return { vulnerabilities, bestPractices };
    } catch (error) {
      logger.error(`Dependency security analysis failed: ${error.message}`);
      return { vulnerabilities: [], bestPractices: [] };
    }
  }

  /**
   * Analyze code for security issues
   */
  async analyzeCodeSecurity(projectPath) {
    try {
      const vulnerabilities = [];
      const bestPractices = [];
      const jsFiles = await this.getJavaScriptFiles(projectPath);

      for (const file of jsFiles.slice(0, 30)) { // Limit for performance
        try {
          const content = await fs.readFile(file, 'utf8');
          const fileIssues = this.detectSecurityIssues(content, file);
          vulnerabilities.push(...fileIssues.vulnerabilities);
          bestPractices.push(...fileIssues.bestPractices);
        } catch (error) {
          // Skip files that can't be read
        }
      }

      return { vulnerabilities, bestPractices };
    } catch (error) {
      logger.error(`Code security analysis failed: ${error.message}`);
      return { vulnerabilities: [], bestPractices: [] };
    }
  }

  /**
   * Analyze configuration files for security issues
   */
  async analyzeConfiguration(projectPath) {
    try {
      const vulnerabilities = [];
      const bestPractices = [];

      // Check for common configuration files
      const configFiles = [
        'package.json',
        '.env',
        '.env.example',
        'docker-compose.yml',
        'Dockerfile',
        'nginx.conf',
        'webpack.config.js',
        'babel.config.js'
      ];

      for (const configFile of configFiles) {
        const configPath = path.join(projectPath, configFile);
        try {
          const content = await fs.readFile(configPath, 'utf8');
          const issues = this.analyzeConfigFile(configFile, content);
          vulnerabilities.push(...issues.vulnerabilities);
          bestPractices.push(...issues.bestPractices);
        } catch (error) {
          // File doesn't exist or can't be read
        }
      }

      return { vulnerabilities, bestPractices };
    } catch (error) {
      logger.error(`Configuration security analysis failed: ${error.message}`);
      return { vulnerabilities: [], bestPractices: [] };
    }
  }

  /**
   * Analyze environment and secrets
   */
  async analyzeEnvironment(projectPath) {
    try {
      const vulnerabilities = [];
      const bestPractices = [];

      // Check for .env files
      const envFiles = await this.findEnvFiles(projectPath);
      
      for (const envFile of envFiles) {
        try {
          const content = await fs.readFile(envFile, 'utf8');
          const issues = this.analyzeEnvFile(content, envFile);
          vulnerabilities.push(...issues.vulnerabilities);
          bestPractices.push(...issues.bestPractices);
        } catch (error) {
          // Skip files that can't be read
        }
      }

      // Check for hardcoded secrets in code
      const jsFiles = await this.getJavaScriptFiles(projectPath);
      for (const file of jsFiles.slice(0, 20)) {
        try {
          const content = await fs.readFile(file, 'utf8');
          const secretIssues = this.detectHardcodedSecrets(content, file);
          vulnerabilities.push(...secretIssues);
        } catch (error) {
          // Skip files that can't be read
        }
      }

      return { vulnerabilities, bestPractices };
    } catch (error) {
      logger.error(`Environment security analysis failed: ${error.message}`);
      return { vulnerabilities: [], bestPractices: [] };
    }
  }

  /**
   * Detect security issues in code
   */
  detectSecurityIssues(content, filePath) {
    const vulnerabilities = [];
    const bestPractices = [];

    // Check for dangerous patterns
    const dangerousPatterns = [
      { pattern: /eval\s*\(/, severity: 'critical', message: 'eval() usage detected' },
      { pattern: /innerHTML\s*=/, severity: 'high', message: 'innerHTML assignment detected' },
      { pattern: /document\.write\s*\(/, severity: 'high', message: 'document.write() usage detected' },
      { pattern: /localStorage\.[a-zA-Z_][a-zA-Z0-9_]*\s*=/, severity: 'medium', message: 'localStorage usage detected' },
      { pattern: /sessionStorage\.[a-zA-Z_][a-zA-Z0-9_]*\s*=/, severity: 'medium', message: 'sessionStorage usage detected' }
    ];

    dangerousPatterns.forEach(({ pattern, severity, message }) => {
      if (pattern.test(content)) {
        vulnerabilities.push({
          type: 'code',
          severity,
          file: path.relative(process.cwd(), filePath),
          message,
          suggestion: 'Review and secure this code pattern'
        });
      }
    });

    // Check for security best practices
    if (content.includes('Content-Security-Policy')) {
      bestPractices.push({
        type: 'code',
        message: 'Content Security Policy detected',
        suggestion: 'Ensure CSP is properly configured'
      });
    }

    if (content.includes('helmet')) {
      bestPractices.push({
        type: 'code',
        message: 'Helmet security middleware detected',
        suggestion: 'Ensure helmet is properly configured'
      });
    }

    return { vulnerabilities, bestPractices };
  }

  /**
   * Analyze configuration file for security issues
   */
  analyzeConfigFile(filename, content) {
    const vulnerabilities = [];
    const bestPractices = [];

    switch (filename) {
      case 'package.json':
        try {
          const pkg = JSON.parse(content);
          if (pkg.scripts && pkg.scripts.start && pkg.scripts.start.includes('--inspect')) {
            vulnerabilities.push({
              type: 'config',
              severity: 'high',
              file: filename,
              message: 'Debug mode enabled in production script',
              suggestion: 'Remove --inspect flag from production start script'
            });
          }
        } catch (error) {
          // Invalid JSON
        }
        break;

      case '.env':
        if (content.includes('NODE_ENV=development')) {
          vulnerabilities.push({
            type: 'config',
            severity: 'medium',
            file: filename,
            message: 'Development environment variables in .env',
            suggestion: 'Use .env.example for development variables'
          });
        }
        break;

      case 'docker-compose.yml':
        if (content.includes('privileged: true')) {
          vulnerabilities.push({
            type: 'config',
            severity: 'high',
            file: filename,
            message: 'Privileged mode enabled in Docker',
            suggestion: 'Avoid using privileged mode unless absolutely necessary'
          });
        }
        break;
    }

    return { vulnerabilities, bestPractices };
  }

  /**
   * Analyze environment file for security issues
   */
  analyzeEnvFile(content, filename) {
    const vulnerabilities = [];
    const bestPractices = [];

    // Check for sensitive data patterns
    const sensitivePatterns = [
      /PASSWORD\s*=/i,
      /SECRET\s*=/i,
      /KEY\s*=/i,
      /TOKEN\s*=/i,
      /API_KEY\s*=/i
    ];

    sensitivePatterns.forEach(pattern => {
      if (pattern.test(content)) {
        vulnerabilities.push({
          type: 'environment',
          severity: 'high',
          file: path.basename(filename),
          message: 'Sensitive data detected in environment file',
          suggestion: 'Use environment variables or secure secret management'
        });
      }
    });

    return { vulnerabilities, bestPractices };
  }

      /**
     * Detect hardcoded secrets in code
     */
    detectHardcodedSecrets(content, filePath) {
        const vulnerabilities = [];

        // Check for hardcoded secrets
        const secretPatterns = [
            { pattern: /password\s*[:=]\s*['"][^'"]{8,}['"]/gi, message: 'Hardcoded password detected' },
            { pattern: /secret\s*[:=]\s*['"][^'"]{8,}['"]/gi, message: 'Hardcoded secret detected' },
            { pattern: /api_key\s*[:=]\s*['"][^'"]{8,}['"]/gi, message: 'Hardcoded API key detected' }
        ];

        secretPatterns.forEach(({ pattern, message }) => {
            if (pattern.test(content)) {
                vulnerabilities.push({
                    type: 'code',
                    severity: 'critical',
                    file: path.relative(process.cwd(), filePath),
                    message,
                    suggestion: 'Move secrets to environment variables or secure configuration'
                });
            }
        });

        return vulnerabilities;
    }

  /**
   * Calculate risk level based on vulnerabilities
   */
  calculateRiskLevel(vulnerabilities) {
    const criticalCount = vulnerabilities.filter(v => v.severity === 'critical').length;
    const highCount = vulnerabilities.filter(v => v.severity === 'high').length;
    const mediumCount = vulnerabilities.filter(v => v.severity === 'medium').length;

    if (criticalCount > 0) return 'critical';
    if (highCount > 2) return 'high';
    if (highCount > 0 || mediumCount > 5) return 'medium';
    if (mediumCount > 0 || vulnerabilities.length > 10) return 'low';
    return 'minimal';
  }

  // Helper methods
  async getJavaScriptFiles(projectPath) {
    const allFiles = await this.getAllFiles(projectPath);
    return allFiles.filter(file => 
      file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.ts') || file.endsWith('.tsx')
    );
  }

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

  async findEnvFiles(projectPath) {
    const allFiles = await this.getAllFiles(projectPath);
    return allFiles.filter(file => 
      file.includes('.env') || file.endsWith('.env')
    );
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
      throw new Error('Project path is required for security analysis');
    }
  }
}

// Create instance for execution
const stepInstance = new SecurityAnalysisStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
}; 