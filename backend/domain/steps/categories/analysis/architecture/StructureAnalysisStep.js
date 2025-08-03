/**
 * Structure Analysis Step - Architecture Analysis Step
 * Analyzes project structure and architectural patterns
 * 
 * Created: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
 * Purpose: Specialized project structure analysis for architectural patterns and organization
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const fs = require('fs').promises;
const path = require('path');

const logger = new Logger('structure_analysis_step');

// Step configuration
const config = {
  name: 'StructureAnalysisStep',
  type: 'analysis',
  description: 'Analyzes project structure and architectural patterns',
  category: 'analysis',
  subcategory: 'architecture',
  version: '1.0.0',
  dependencies: [],
  settings: {
    timeout: 30000,
    includePatterns: true,
    includeLayers: true,
    includeRecommendations: true
  },
  validation: {
    requiredFiles: ['package.json'],
    supportedProjects: ['nodejs', 'react', 'vue', 'angular', 'express', 'nest']
  }
};

class StructureAnalysisStep {
  constructor() {
    StructureAnalysisStep = 'StructureAnalysisStep';
    this.description = 'Analyzes project structure and architectural patterns';
    this.category = 'analysis';
    this.subcategory = 'architecture';
    this.dependencies = [];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = StructureAnalysisStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`⚡ Executing ${StructureAnalysisStep}...`);
      
      // Validate context
      this.validateContext(context);

      const projectPath = context.projectPath;
      
      logger.info(`🏗️ Starting structure analysis for: ${projectPath}`);

      // Execute structure analysis
      const structureAnalysis = await this.analyzeProjectStructure(projectPath, {
        includePatterns: context.includePatterns !== false,
        includeLayers: context.includeLayers !== false,
        includeRecommendations: context.includeRecommendations !== false
      });

      // Clean and format result
      const cleanResult = this.cleanResult(structureAnalysis);

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
      if (context.createDocs !== false) {
        cleanResult.documentation = await this.createDocumentation(cleanResult, projectPath, context);
      }

      logger.info(`✅ Structure analysis completed successfully`);

      return {
        success: true,
        result: cleanResult,
        metadata: {
          stepName: "StructureAnalysisStep",
          projectPath,
          timestamp: new Date()
        }
      };

    } catch (error) {
      logger.error(`❌ Structure analysis failed: ${error.message}`);
      
      return {
        success: false,
        error: error.message,
        metadata: {
          stepName: "StructureAnalysisStep",
          projectPath: context.projectPath,
          timestamp: new Date()
        }
      };
    }
  }

  /**
   * Analyze project structure
   * @param {string} projectPath - Path to the project
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Structure analysis result
   */
  async analyzeProjectStructure(projectPath, options = {}) {
    try {
      const patterns = [];
      const layers = [];
      const directories = await this.getAllDirectories(projectPath);
      const files = await this.getAllFiles(projectPath);

      // Analyze directory structure
      const structure = this.analyzeDirectoryStructure(directories, projectPath);
      
      // Detect common architectural patterns
      if (this.hasMVCStructure(directories)) {
        patterns.push({
          type: 'structural',
          name: 'MVC Pattern',
          confidence: 'high',
          description: 'Model-View-Controller architecture detected',
          evidence: 'Separate directories for models, views, and controllers'
        });
        layers.push(
          { name: 'Model', type: 'data', directories: structure.models },
          { name: 'View', type: 'presentation', directories: structure.views },
          { name: 'Controller', type: 'logic', directories: structure.controllers }
        );
      }

      if (this.hasLayeredArchitecture(directories)) {
        patterns.push({
          type: 'structural',
          name: 'Layered Architecture',
          confidence: 'medium',
          description: 'Multi-layer architecture detected',
          evidence: 'Clear separation of concerns across layers'
        });
      }

      if (this.hasMicroservicesStructure(directories)) {
        patterns.push({
          type: 'structural',
          name: 'Microservices',
          confidence: 'medium',
          description: 'Microservices architecture detected',
          evidence: 'Multiple service directories with independent configurations'
        });
      }

      if (this.hasMonorepoStructure(directories)) {
        patterns.push({
          type: 'structural',
          name: 'Monorepo',
          confidence: 'high',
          description: 'Monorepo structure detected',
          evidence: 'Multiple packages or applications in single repository'
        });
      }

      if (this.hasDomainDrivenDesign(directories)) {
        patterns.push({
          type: 'structural',
          name: 'Domain-Driven Design',
          confidence: 'medium',
          description: 'DDD architecture detected',
          evidence: 'Domain-focused directory structure with bounded contexts'
        });
      }

      // Calculate structure score
      const structureScore = this.calculateStructureScore({
        patterns: patterns.length,
        layers: layers.length,
        directories: directories.length,
        files: files.length
      });

      return {
        patterns,
        layers,
        structure,
        metrics: {
          totalDirectories: directories.length,
          totalFiles: files.length,
          patternsDetected: patterns.length,
          layersDetected: layers.length
        },
        score: structureScore,
        level: this.getStructureLevel(structureScore)
      };
    } catch (error) {
      logger.error(`Project structure analysis failed: ${error.message}`);
      return { 
        patterns: [], 
        layers: [],
        structure: {},
        metrics: {},
        score: 0,
        level: 'unknown'
      };
    }
  }

  /**
   * Analyze directory structure
   * @param {Array} directories - List of directories
   * @param {string} projectPath - Project path
   * @returns {Object} Structure analysis
   */
  analyzeDirectoryStructure(directories, projectPath) {
    const structure = {
      models: [],
      views: [],
      controllers: [],
      services: [],
      repositories: [],
      components: [],
      utils: [],
      config: [],
      tests: []
    };

    directories.forEach(dir => {
      const relativePath = path.relative(projectPath, dir);
      const dirName = path.basename(dir).toLowerCase();

      // Categorize directories
      if (dirName.includes('model') || dirName.includes('entity')) {
        structure.models.push(relativePath);
      } else if (dirName.includes('view') || dirName.includes('page') || dirName.includes('component')) {
        structure.views.push(relativePath);
      } else if (dirName.includes('controller') || dirName.includes('handler')) {
        structure.controllers.push(relativePath);
      } else if (dirName.includes('service') || dirName.includes('business')) {
        structure.services.push(relativePath);
      } else if (dirName.includes('repository') || dirName.includes('data')) {
        structure.repositories.push(relativePath);
      } else if (dirName.includes('component') || dirName.includes('ui')) {
        structure.components.push(relativePath);
      } else if (dirName.includes('util') || dirName.includes('helper')) {
        structure.utils.push(relativePath);
      } else if (dirName.includes('config') || dirName.includes('setting')) {
        structure.config.push(relativePath);
      } else if (dirName.includes('test') || dirName.includes('spec')) {
        structure.tests.push(relativePath);
      }
    });

    return structure;
  }

  /**
   * Check for MVC structure
   * @param {Array} directories - List of directories
   * @returns {boolean} Has MVC structure
   */
  hasMVCStructure(directories) {
    const dirNames = directories.map(dir => path.basename(dir).toLowerCase());
    const hasModels = dirNames.some(name => name.includes('model') || name.includes('entity'));
    const hasViews = dirNames.some(name => name.includes('view') || name.includes('page') || name.includes('component'));
    const hasControllers = dirNames.some(name => name.includes('controller') || name.includes('handler'));
    
    return hasModels && hasViews && hasControllers;
  }

  /**
   * Check for layered architecture
   * @param {Array} directories - List of directories
   * @returns {boolean} Has layered architecture
   */
  hasLayeredArchitecture(directories) {
    const dirNames = directories.map(dir => path.basename(dir).toLowerCase());
    const layerIndicators = [
      'presentation', 'view', 'component',
      'business', 'service', 'logic',
      'data', 'repository', 'model',
      'infrastructure', 'external', 'adapter'
    ];
    
    const layerCount = layerIndicators.filter(indicator => 
      dirNames.some(name => name.includes(indicator))
    ).length;
    
    return layerCount >= 3;
  }

  /**
   * Check for microservices structure
   * @param {Array} directories - List of directories
   * @returns {boolean} Has microservices structure
   */
  hasMicroservicesStructure(directories) {
    const dirNames = directories.map(dir => path.basename(dir).toLowerCase());
    const serviceDirs = dirNames.filter(name => 
      name.includes('service') && !name.includes('test')
    );
    
    return serviceDirs.length >= 3;
  }

  /**
   * Check for monorepo structure
   * @param {Array} directories - List of directories
   * @returns {boolean} Has monorepo structure
   */
  hasMonorepoStructure(directories) {
    const dirNames = directories.map(dir => path.basename(dir).toLowerCase());
    const monorepoIndicators = ['packages', 'apps', 'services', 'frontend', 'backend'];
    
    return monorepoIndicators.some(indicator => 
      dirNames.some(name => name.includes(indicator))
    );
  }

  /**
   * Check for Domain-Driven Design structure
   * @param {Array} directories - List of directories
   * @returns {boolean} Has DDD structure
   */
  hasDomainDrivenDesign(directories) {
    const dirNames = directories.map(dir => path.basename(dir).toLowerCase());
    const dddIndicators = ['domain', 'bounded', 'context', 'aggregate', 'entity', 'value'];
    
    const dddCount = dddIndicators.filter(indicator => 
      dirNames.some(name => name.includes(indicator))
    ).length;
    
    return dddCount >= 2;
  }

  /**
   * Calculate structure score
   * @param {Object} data - Analysis data
   * @returns {number} Structure score (0-100)
   */
  calculateStructureScore(data) {
    const { patterns, layers, directories, files } = data;
    
    // Base score starts at 50
    let score = 50;

    // Reward for architectural patterns (up to +30 points)
    const patternBonus = Math.min(patterns * 6, 30);
    score += patternBonus;

    // Reward for layer separation (up to +20 points)
    const layerBonus = Math.min(layers * 4, 20);
    score += layerBonus;

    // Bonus for organized structure (up to +10 points)
    if (directories > 5 && files > 20) {
      score += 10;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Get structure level
   * @param {number} score - Structure score
   * @returns {string} Structure level
   */
  getStructureLevel(score) {
    if (score >= 90) return 'excellent';
    if (score >= 80) return 'good';
    if (score >= 70) return 'fair';
    if (score >= 60) return 'poor';
    return 'critical';
  }

  /**
   * Get all directories from project
   * @param {string} projectPath - Project path
   * @returns {Promise<Array>} All directories
   */
  async getAllDirectories(dir) {
    const directories = [];
    
    try {
      const items = await fs.readdir(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = await fs.stat(fullPath);
        
        if (stat.isDirectory()) {
          // SKIP node_modules and .git (correct!)
          if (!item.startsWith('.') && item !== 'node_modules' && item !== '.git') {
            directories.push(fullPath);
            directories.push(...await this.getAllDirectories(fullPath));
          }
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read
    }
    
    return directories;
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
      step: StructureAnalysisStep,
      category: 'architecture',
      subcategory: 'structure'
    };
  }

  /**
   * Validate execution context
   * @param {Object} context - Execution context
   */
  validateContext(context) {
    if (!context.projectPath) {
      throw new Error('Project path is required for structure analysis');
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
    const { patterns, layers, metrics } = result;
    
    if (!patterns || !layers || !metrics) return 0;
    
    // Higher confidence with more patterns and layers
    const patternConfidence = Math.min(patterns.length * 10, 40);
    const layerConfidence = Math.min(layers.length * 8, 40);
    
    // Additional confidence for comprehensive analysis
    const coverageBonus = metrics.totalDirectories > 10 ? 20 : 0;
    
    return Math.min(patternConfidence + layerConfidence + coverageBonus, 100);
  }

  /**
   * Generate issues from analysis results
   * @param {Object} result - Analysis result
   * @returns {Array} Issues array
   */
  generateIssues(result) {
    const issues = [];
    
    // Check for low structure score
    if (result.score < 70) {
      issues.push({
        type: 'low-structure-score',
        title: 'Low Structure Score',
        description: `Structure analysis score of ${result.score}% indicates poor architectural organization`,
        severity: 'medium',
        priority: 'medium',
        category: this.category,
        source: StructureAnalysisStep,
        location: 'project-structure',
        suggestion: 'Consider reorganizing project structure following architectural best practices'
      });
    }

    // Check for missing architectural patterns
    if (result.patterns && result.patterns.length === 0) {
      issues.push({
        type: 'no-architectural-patterns',
        title: 'No Architectural Patterns Detected',
        description: 'No clear architectural patterns were identified in the project structure',
        severity: 'high',
        priority: 'high',
        category: this.category,
        source: StructureAnalysisStep,
        location: 'project-structure',
        suggestion: 'Implement a clear architectural pattern (MVC, DDD, Layered Architecture, etc.)'
      });
    }

    // Check for missing layers
    if (result.layers && result.layers.length === 0) {
      issues.push({
        type: 'no-layer-separation',
        title: 'No Layer Separation Detected',
        description: 'No clear layer separation was identified in the project structure',
        severity: 'medium',
        priority: 'medium',
        category: this.category,
        source: StructureAnalysisStep,
        location: 'project-structure',
        suggestion: 'Organize code into logical layers (presentation, business, data, etc.)'
      });
    }

    // Check for poor directory organization
    if (result.metrics && result.metrics.totalDirectories > 50 && result.patterns && result.patterns.length < 2) {
      issues.push({
        type: 'poor-directory-organization',
        title: 'Poor Directory Organization',
        description: `Large number of directories (${result.metrics.totalDirectories}) without clear architectural patterns`,
        severity: 'medium',
        priority: 'medium',
        category: this.category,
        source: StructureAnalysisStep,
        location: 'project-structure',
        suggestion: 'Reorganize directories following architectural principles and best practices'
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
        source: StructureAnalysisStep,
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
        source: StructureAnalysisStep,
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
        source: StructureAnalysisStep,
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
        source: StructureAnalysisStep,
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
      id: `${StructureAnalysisStep.toLowerCase()}-improvement-${Date.now()}`,
      title: `Improve ${StructureAnalysisStep} Results`,
      description: `Address issues and implement recommendations from ${StructureAnalysisStep} analysis`,
      type: 'improvement',
      category: this.category,
      priority: 'medium',
      status: 'pending',
      projectId: projectId,
      metadata: {
        source: StructureAnalysisStep,
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
        id: `${StructureAnalysisStep.toLowerCase()}-critical-${Date.now()}`,
        title: `Fix Critical Issues from ${StructureAnalysisStep}`,
        description: 'Address critical issues identified in analysis',
        type: 'fix',
        category: this.category,
        priority: 'critical',
        status: 'pending',
        projectId: projectId,
        parentTaskId: mainTask.id,
        metadata: {
          source: StructureAnalysisStep,
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
        id: `${StructureAnalysisStep.toLowerCase()}-high-${Date.now()}`,
        title: `Fix High Priority Issues from ${StructureAnalysisStep}`,
        description: 'Address high priority issues identified in analysis',
        type: 'fix',
        category: this.category,
        priority: 'high',
        status: 'pending',
        projectId: projectId,
        parentTaskId: mainTask.id,
        metadata: {
          source: StructureAnalysisStep,
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
        title: 'Improve Structure Analysis Score',
        description: `Current score of ${result.score}% can be improved`,
        priority: 'medium',
        category: this.category,
        source: StructureAnalysisStep,
        action: 'Implement architectural best practices to improve structure score',
        impact: 'Better code organization and maintainability'
      });
    }

    // Check for missing patterns
    if (result.patterns && result.patterns.length < 3) {
      recommendations.push({
        type: 'add-patterns',
        title: 'Add More Architectural Patterns',
        description: 'Consider implementing additional architectural patterns',
        priority: 'medium',
        category: this.category,
        source: StructureAnalysisStep,
        action: 'Research and implement appropriate architectural patterns',
        impact: 'Improved code organization and maintainability'
      });
    }

    return recommendations;
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
    const docsDir = path.join(projectPath, `docs/09_roadmap/tasks/${this.category}/${StructureAnalysisStep.toLowerCase()}`);
    
    // Ensure docs directory exists
    await fs.mkdir(docsDir, { recursive: true });
    
    // Create implementation file
    const implementationDoc = await this.createImplementationDoc(result, docsDir);
    docs.push(implementationDoc);
    
    return docs;
  }

  /**
   * Create implementation documentation
   * @param {Object} result - Analysis result
   * @param {string} docsDir - Documentation directory
   * @returns {Promise<Object>} Implementation doc
   */
  async createImplementationDoc(result, docsDir) {
    const implementationPath = path.join(docsDir, `${StructureAnalysisStep.toLowerCase()}-implementation.md`);
    
    let content = `# ${StructureAnalysisStep} Implementation

## 1. Project Overview
- **Feature/Component Name**: ${StructureAnalysisStep}
- **Priority**: Medium
- **Category**: ${this.category}
- **Estimated Time**: ${this.calculateEstimatedHours(result)} hours
- **Dependencies**: None
- **Related Issues**: Structure analysis improvements

## 2. Technical Requirements
- **Tech Stack**: Node.js, DDD Architecture
- **Architecture Pattern**: Domain-Driven Design (DDD)
- **Database Changes**: None
- **API Changes**: None
- **Backend Changes**: Improve project structure
- **Frontend Changes**: None
- **Infrastructure Changes**: None

## 3. Implementation Phases

#### Phase 1: Structure Analysis (${Math.round(this.calculateEstimatedHours(result) * 0.3)} hours)
- [ ] Analyze current structure
- [ ] Identify improvement areas
- [ ] Plan restructuring

#### Phase 2: Implementation (${Math.round(this.calculateEstimatedHours(result) * 0.7)} hours)
- [ ] Implement structural improvements
- [ ] Validate changes
- [ ] Update documentation

## 4. Success Criteria
- [ ] Structure score improved
- [ ] Architectural patterns implemented
- [ ] Code organization enhanced
- [ ] Maintainability improved

## 5. Risk Assessment
- **Low Risk**: Well-defined improvements
- **Mitigation**: Phase-by-phase implementation
`;
    
    await fs.writeFile(implementationPath, content);
    
    return {
      type: 'implementation',
      file: implementationPath,
      title: `${StructureAnalysisStep} Implementation`,
      description: 'Implementation plan for structure improvements'
    };
  }
}

// Create instance for execution
const stepInstance = new StructureAnalysisStep();

// Export in StepRegistry format
module.exports = {
  config: StructureAnalysisStep.getConfig(),
  execute: async (context) => await stepInstance.execute(context)
}; 