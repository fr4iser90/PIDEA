/**
 * Coupling Analysis Step - Architecture Analysis Step
 * Analyzes coupling between components and dependencies
 * 
 * Created: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
 * Purpose: Specialized coupling analysis for component dependencies and architectural coupling
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const fs = require('fs').promises;
const path = require('path');

const logger = new Logger('coupling_analysis_step');

// Step configuration
const config = {
  name: 'CouplingAnalysisStep',
  type: 'analysis',
  description: 'Analyzes coupling between components and dependencies',
  category: 'analysis',
  subcategory: 'architecture',
  version: '1.0.0',
  dependencies: [],
  settings: {
    timeout: 30000,
    includeImports: true,
    includeDependencies: true,
    includeRecommendations: true
  },
  validation: {
    requiredFiles: ['package.json'],
    supportedProjects: ['nodejs', 'react', 'vue', 'angular', 'express', 'nest']
  }
};

class CouplingAnalysisStep {
  constructor() {
    this.name = 'CouplingAnalysisStep';
    this.description = 'Analyzes coupling between components and dependencies';
    this.category = 'analysis';
    this.subcategory = 'architecture';
    this.dependencies = [];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = CouplingAnalysisStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`⚡ Executing CouplingAnalysisStep...`);
      
      // Validate context
      this.validateContext(context);

      const projectPath = context.projectPath;
      
      logger.info(`🔗 Starting coupling analysis for: ${projectPath}`);

      // Execute coupling analysis
      const couplingAnalysis = await this.analyzeCoupling(projectPath, {
        includeImports: context.includeImports !== false,
        includeDependencies: context.includeDependencies !== false,
        includeRecommendations: context.includeRecommendations !== false
      });

      // Clean and format result
      const cleanResult = this.cleanResult(couplingAnalysis);

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

      logger.info(`✅ Coupling analysis completed successfully`);

      return {
        success: true,
        result: cleanResult,
        metadata: {
          stepName: "CouplingAnalysisStep",
          projectPath,
          timestamp: new Date()
        }
      };

    } catch (error) {
      logger.error(`❌ Coupling analysis failed: ${error.message}`);
      
      return {
        success: false,
        error: error.message,
        metadata: {
          stepName: "CouplingAnalysisStep",
          projectPath: context.projectPath,
          timestamp: new Date()
        }
      };
    }
  }

  /**
   * Analyze coupling for a project
   * @param {string} projectPath - Path to the project
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Coupling analysis result
   */
  async analyzeCoupling(projectPath, options = {}) {
    try {
      const coupling = {
        high: [],
        medium: [],
        low: []
      };
      const jsFiles = await this.getJavaScriptFiles(projectPath);

      for (const file of jsFiles) {
        try {
          const content = await fs.readFile(file, 'utf8');
          const fileCoupling = this.analyzeFileCoupling(content, file);
          
          if (fileCoupling.level === 'high') {
            coupling.high.push(fileCoupling);
          } else if (fileCoupling.level === 'medium') {
            coupling.medium.push(fileCoupling);
          } else {
            coupling.low.push(fileCoupling);
          }
        } catch (error) {
          // Skip files that can't be read
        }
      }

      // Analyze package dependencies
      const packageDependencies = await this.analyzePackageDependencies(projectPath);

      // Generate recommendations
      const recommendations = this.generateCouplingRecommendations({
        coupling,
        packageDependencies
      });

      // Calculate coupling score
      const couplingScore = this.calculateCouplingScore({
        high: coupling.high.length,
        medium: coupling.medium.length,
        low: coupling.low.length,
        totalFiles: jsFiles.length,
        dependencies: packageDependencies.length
      });

      return {
        coupling,
        packageDependencies,
        recommendations,
        metrics: {
          totalFiles: jsFiles.length,
          highCouplingFiles: coupling.high.length,
          mediumCouplingFiles: coupling.medium.length,
          lowCouplingFiles: coupling.low.length,
          totalDependencies: packageDependencies.length
        },
        score: couplingScore,
        level: this.getCouplingLevel(couplingScore)
      };
    } catch (error) {
      logger.error(`Coupling analysis failed: ${error.message}`);
      return { 
        coupling: { high: [], medium: [], low: [] },
        packageDependencies: [],
        recommendations: [],
        metrics: {},
        score: 0,
        level: 'unknown'
      };
    }
  }

  /**
   * Analyze file coupling
   * @param {string} content - File content
   * @param {string} filePath - File path
   * @returns {Object} File coupling analysis
   */
  analyzeFileCoupling(content, filePath) {
    const imports = content.match(/require\(['"]([^'"]+)['"]\)/g) || [];
    const es6Imports = content.match(/import\s+.*\s+from\s+['"]([^'"]+)['"]/g) || [];
    const allImports = [...imports, ...es6Imports];
    const importCount = allImports.length;
    
    let level = 'low';
    if (importCount > 10) {
      level = 'high';
    } else if (importCount > 5) {
      level = 'medium';
    }

    // Analyze import types
    const importTypes = this.analyzeImportTypes(allImports);

    return {
      file: path.relative(process.cwd(), filePath),
      level,
      importCount,
      imports: allImports.map(imp => {
        const match = imp.match(/['"]([^'"]+)['"]/);
        return match ? match[1] : imp;
      }),
      importTypes,
      complexity: this.calculateFileComplexity(content)
    };
  }

  /**
   * Analyze import types
   * @param {Array} imports - Import statements
   * @returns {Object} Import type analysis
   */
  analyzeImportTypes(imports) {
    const types = {
      internal: 0,
      external: 0,
      relative: 0,
      absolute: 0
    };

    imports.forEach(imp => {
      const match = imp.match(/['"]([^'"]+)['"]/);
      if (match) {
        const importPath = match[1];
        
        if (importPath.startsWith('.')) {
          types.relative++;
        } else if (importPath.startsWith('/')) {
          types.absolute++;
        } else if (importPath.includes('@') || importPath.includes('~')) {
          types.internal++;
        } else {
          types.external++;
        }
      }
    });

    return types;
  }

  /**
   * Calculate file complexity
   * @param {string} content - File content
   * @returns {number} Complexity score
   */
  calculateFileComplexity(content) {
    let complexity = 0;
    
    // Count functions
    const functions = content.match(/function\s+\w+|=>\s*\{/g) || [];
    complexity += functions.length * 2;
    
    // Count classes
    const classes = content.match(/class\s+\w+/g) || [];
    complexity += classes.length * 3;
    
    // Count conditional statements
    const conditionals = content.match(/if\s*\(|else\s*if|switch\s*\(/g) || [];
    complexity += conditionals.length;
    
    // Count loops
    const loops = content.match(/for\s*\(|while\s*\(|forEach\s*\(/g) || [];
    complexity += loops.length;
    
    return complexity;
  }

  /**
   * Analyze package dependencies
   * @param {string} projectPath - Project path
   * @returns {Promise<Array>} Package dependencies
   */
  async analyzePackageDependencies(projectPath) {
    try {
      const packagePath = path.join(projectPath, 'package.json');
      const content = await fs.readFile(packagePath, 'utf8');
      const packageJson = JSON.parse(content);
      
      const dependencies = [];
      
      // Analyze dependencies
      if (packageJson.dependencies) {
        Object.entries(packageJson.dependencies).forEach(([name, version]) => {
          dependencies.push({
            name,
            version,
            type: 'dependency',
            category: this.categorizeDependency(name)
          });
        });
      }
      
      // Analyze devDependencies
      if (packageJson.devDependencies) {
        Object.entries(packageJson.devDependencies).forEach(([name, version]) => {
          dependencies.push({
            name,
            version,
            type: 'devDependency',
            category: this.categorizeDependency(name)
          });
        });
      }
      
      return dependencies;
    } catch (error) {
      logger.error(`Package dependencies analysis failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Categorize dependency
   * @param {string} name - Dependency name
   * @returns {string} Dependency category
   */
  categorizeDependency(name) {
    const categories = {
      framework: ['react', 'vue', 'angular', 'express', 'nest', 'next', 'nuxt'],
      database: ['mongoose', 'sequelize', 'prisma', 'knex', 'typeorm'],
      testing: ['jest', 'mocha', 'chai', 'cypress', 'playwright'],
      build: ['webpack', 'vite', 'rollup', 'babel', 'typescript'],
      utility: ['lodash', 'moment', 'axios', 'uuid', 'validator'],
      security: ['bcrypt', 'jsonwebtoken', 'helmet', 'cors'],
      monitoring: ['winston', 'morgan', 'sentry', 'newrelic']
    };

    for (const [category, deps] of Object.entries(categories)) {
      if (deps.some(dep => name.includes(dep))) {
        return category;
      }
    }

    return 'other';
  }

  /**
   * Generate coupling recommendations
   * @param {Object} data - Analysis data
   * @returns {Array} Recommendations
   */
  generateCouplingRecommendations(data) {
    const { coupling, packageDependencies } = data;
    const recommendations = [];

    // Check for high coupling
    if (coupling.high.length > 5) {
      recommendations.push({
        priority: 'high',
        category: 'coupling',
        message: 'High coupling detected in multiple files',
        action: 'Consider refactoring to reduce dependencies between components',
        files: coupling.high.slice(0, 3).map(f => f.file)
      });
    }

    // Check for external dependencies
    const externalDeps = packageDependencies.filter(dep => dep.type === 'dependency');
    if (externalDeps.length > 20) {
      recommendations.push({
        priority: 'medium',
        category: 'dependencies',
        message: 'High number of external dependencies',
        action: 'Consider if all dependencies are necessary and look for alternatives',
        count: externalDeps.length
      });
    }

    // Check for relative imports
    const highRelativeImports = coupling.high.filter(f => f.importTypes.relative > 5);
    if (highRelativeImports.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'imports',
        message: 'High number of relative imports detected',
        action: 'Consider using absolute imports or barrel exports to reduce coupling',
        files: highRelativeImports.slice(0, 3).map(f => f.file)
      });
    }

    return recommendations;
  }

  /**
   * Calculate coupling score
   * @param {Object} data - Analysis data
   * @returns {number} Coupling score (0-100)
   */
  calculateCouplingScore(data) {
    const { high, medium, low, totalFiles, dependencies } = data;
    
    // Base score starts at 100
    let score = 100;

    // Penalize for high coupling (up to -40 points)
    const highCouplingPenalty = Math.min(high * 4, 40);
    score -= highCouplingPenalty;

    // Penalize for medium coupling (up to -20 points)
    const mediumCouplingPenalty = Math.min(medium * 2, 20);
    score -= mediumCouplingPenalty;

    // Penalize for too many dependencies (up to -20 points)
    const dependencyPenalty = Math.min(dependencies * 0.5, 20);
    score -= dependencyPenalty;

    // Reward for low coupling (up to +10 points)
    const lowCouplingBonus = Math.min(low * 0.5, 10);
    score += lowCouplingBonus;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Get coupling level
   * @param {number} score - Coupling score
   * @returns {string} Coupling level
   */
  getCouplingLevel(score) {
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
      !file.includes('node_modules') &&  // SKIP node_modules (correct!)
      !file.includes('.git')             // SKIP .git (correct!)
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
          // SKIP node_modules and .git (correct!)
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
      step: CouplingAnalysisStep,
      category: 'architecture',
      subcategory: 'coupling'
    };
  }

  /**
   * Validate execution context
   * @param {Object} context - Execution context
   */
  validateContext(context) {
    if (!context.projectPath) {
      throw new Error('Project path is required for coupling analysis');
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
    return Math.min((files.length / 100) * 100, 100);
  }

  /**
   * Calculate analysis confidence
   * @param {Object} result - Analysis result
   * @returns {number} Confidence percentage
   */
  calculateConfidence(result) {
    const { coupling, packageDependencies, metrics } = result;
    
    if (!coupling || !packageDependencies || !metrics) return 0;
    
    // Higher confidence with more data points
    const fileConfidence = Math.min(metrics.totalFiles * 2, 50);
    const dependencyConfidence = Math.min(packageDependencies.length * 2, 30);
    
    // Additional confidence for comprehensive analysis
    const couplingConfidence = Math.min(
      (coupling.high.length + coupling.medium.length + coupling.low.length) * 3, 
      20
    );
    
    return Math.min(fileConfidence + dependencyConfidence + couplingConfidence, 100);
  }

  /**
   * Generate issues from analysis results
   * @param {Object} result - Analysis result
   * @returns {Array} Issues array
   */
  generateIssues(result) {
    const issues = [];
    
    // Check for low coupling score
    if (result.score < 70) {
      issues.push({
        type: 'low-coupling-score',
        title: 'Low Coupling Analysis Score',
        description: `Coupling analysis score of ${result.score}% indicates poor coupling management`,
        severity: 'medium',
        priority: 'medium',
        category: 'architecture',
        source: 'CouplingAnalysisStep',
        location: 'coupling-analysis',
        suggestion: 'Improve coupling management and reduce tight coupling between components'
      });
    }

    // Check for high coupling files
    if (result.metrics && result.metrics.highCouplingFiles > 5) {
      issues.push({
        type: 'high-coupling-files',
        title: 'High Coupling Files Detected',
        description: `${result.metrics.highCouplingFiles} files with high coupling detected`,
        severity: 'high',
        priority: 'high',
        category: 'architecture',
        source: 'CouplingAnalysisStep',
        location: 'coupling-analysis',
        suggestion: 'Refactor high coupling files to reduce dependencies and improve maintainability'
      });
    }

    // Check for excessive dependencies
    if (result.metrics && result.metrics.totalDependencies > 50) {
      issues.push({
        type: 'excessive-dependencies',
        title: 'Excessive Package Dependencies',
        description: `${result.metrics.totalDependencies} package dependencies detected, may indicate over-coupling`,
        severity: 'medium',
        priority: 'medium',
        category: 'architecture',
        source: 'CouplingAnalysisStep',
        location: 'package-dependencies',
        suggestion: 'Review and reduce unnecessary package dependencies'
      });
    }

    // Check for circular dependencies
    if (result.packageDependencies && result.packageDependencies.some(dep => dep.circular)) {
      issues.push({
        type: 'circular-dependencies',
        title: 'Circular Dependencies Detected',
        description: 'Circular dependencies found in package structure',
        severity: 'critical',
        priority: 'critical',
        category: 'architecture',
        source: 'CouplingAnalysisStep',
        location: 'package-dependencies',
        suggestion: 'Break circular dependencies to prevent build and runtime issues'
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
        category: 'architecture',
        source: 'CouplingAnalysisStep',
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
        category: 'architecture',
        source: 'CouplingAnalysisStep',
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
        category: 'architecture',
        source: 'CouplingAnalysisStep',
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
        category: 'architecture',
        source: 'CouplingAnalysisStep',
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
      id: `coupling-analysis-step-improvement-${Date.now()}`,
      title: `Improve ${CouplingAnalysisStep} Results`,
      description: `Address issues and implement recommendations from ${CouplingAnalysisStep} analysis`,
      type: 'improvement',
      category: 'architecture',
      priority: 'medium',
      status: 'pending',
      projectId: projectId,
      metadata: {
        source: 'CouplingAnalysisStep',
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
        id: `coupling-analysis-step-critical-${Date.now()}`,
        title: `Fix Critical Issues from ${CouplingAnalysisStep}`,
        description: 'Address critical issues identified in analysis',
        type: 'fix',
        category: 'architecture',
        priority: 'critical',
        status: 'pending',
        projectId: projectId,
        parentTaskId: mainTask.id,
        metadata: {
          source: 'CouplingAnalysisStep',
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
        id: `coupling-analysis-step-high-${Date.now()}`,
        title: `Fix High Priority Issues from ${CouplingAnalysisStep}`,
        description: 'Address high priority issues identified in analysis',
        type: 'fix',
        category: 'architecture',
        priority: 'high',
        status: 'pending',
        projectId: projectId,
        parentTaskId: mainTask.id,
        metadata: {
          source: 'CouplingAnalysisStep',
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
    const docsDir = path.join(projectPath, 'docs', 'analysis', 'architecture', 'coupling-analysis-step');
    
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
    const docPath = path.join(docsDir, 'coupling-analysis-implementation.md');
    
    const content = `# Coupling Analysis Implementation

## 📋 Analysis Overview
- **Step Name**: ${CouplingAnalysisStep}
- **Category**: architecture
- **Analysis Date**: ${new Date().toISOString()}
- **Score**: ${result.score || 0}%
- **Level**: ${result.level || 'unknown'}

## 📊 Analysis Results
- **High Coupling Modules**: ${result.metrics?.highCouplingModules || 0}
- **Low Coupling Modules**: ${result.metrics?.lowCouplingModules || 0}
- **Files Analyzed**: ${result.metrics?.totalFiles || 0}

## 🎯 Key Findings
${result.couplingIssues ? result.couplingIssues.map(issue => `- **${issue.type}**: ${issue.description}`).join('\n') : '- No coupling issues detected'}

## 📝 Recommendations
${result.recommendations ? result.recommendations.map(rec => `- **${rec.title}**: ${rec.description}`).join('\n') : '- No recommendations'}

## 🔧 Implementation Tasks
${result.tasks ? result.tasks.map(task => `- **${task.title}**: ${task.description} (${task.estimatedHours}h)`).join('\n') : '- No tasks generated'}
`;

    await fs.writeFile(docPath, content, 'utf8');
    
    return {
      type: 'implementation',
      title: 'Coupling Analysis Implementation',
      path: docPath,
      category: 'architecture',
      source: CouplingAnalysisStep
    };
  }

  /**
   * Create analysis report
   * @param {Object} result - Analysis result
   * @param {string} docsDir - Documentation directory
   * @returns {Object} Analysis report
   */
  async createAnalysisReport(result, docsDir) {
    const docPath = path.join(docsDir, 'coupling-analysis-report.md');
    
    const content = `# Coupling Analysis Report

## 📊 Executive Summary
Coupling analysis completed with a score of ${result.score || 0}% (${result.level || 'unknown'} level).

## 🔍 Detailed Analysis
${result.couplingIssues ? result.couplingIssues.map(issue => `
### ${issue.type} Coupling
- **File**: ${issue.file}
- **Description**: ${issue.description}
- **Severity**: ${issue.severity}
- **Suggestion**: ${issue.suggestion}
`).join('\n') : 'No coupling issues found'}

## 📈 Metrics
- **High Coupling**: ${result.metrics?.highCouplingModules || 0} modules
- **Low Coupling**: ${result.metrics?.lowCouplingModules || 0} modules
- **File Coverage**: ${result.metrics?.totalFiles || 0} files analyzed

## 🎯 Next Steps
Based on the analysis, consider reducing coupling between modules to improve maintainability and testability.
`;

    await fs.writeFile(docPath, content, 'utf8');
    
    return {
      type: 'report',
      title: 'Coupling Analysis Report',
      path: docPath,
      category: 'architecture',
      source: CouplingAnalysisStep
    };
  }
} 

// Create instance for execution
const stepInstance = new CouplingAnalysisStep();

// Export in StepRegistry format
module.exports = {
  config: CouplingAnalysisStep.getConfig(),
  execute: async (context) => await stepInstance.execute(context)
}; 