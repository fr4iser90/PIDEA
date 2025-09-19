/**
 * Layer Analysis Step - Architecture Analysis Step
 * Analyzes layer organization and separation of concerns
 * 
 * Created: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
 * Purpose: Specialized layer organization analysis for architectural layer separation and boundaries
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const fs = require('fs').promises;
const path = require('path');

const logger = new Logger('layer_analysis_step');

// Step configuration
const config = {
  name: 'LayerAnalysisStep',
  type: 'analysis',
  description: 'Analyzes layer organization and separation of concerns',
  category: 'analysis',
  subcategory: 'architecture',
  version: '1.0.0',
  dependencies: [],
  settings: {
    timeout: 30000,
    includeLayers: true,
    includeBoundaries: true,
    includeRecommendations: true
  },
  validation: {
    requiredFiles: ['package.json'],
    supportedProjects: ['nodejs', 'react', 'vue', 'angular', 'express', 'nest']
  }
};

class LayerAnalysisStep {
  constructor() {
    LayerAnalysisStep = 'LayerAnalysisStep';
    this.description = 'Analyzes layer organization and separation of concerns';
    this.category = 'analysis';
    this.subcategory = 'architecture';
    this.dependencies = [];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = LayerAnalysisStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`⚡ Executing ${LayerAnalysisStep}...`);
      
      // Validate context
      this.validateContext(context);

      const projectPath = context.projectPath;
      
      logger.info(`🏗️ Starting layer analysis for: ${projectPath}`);

      // Execute layer analysis
      const layerAnalysis = await this.analyzeLayerOrganization(projectPath, {
        includeLayers: context.includeLayers !== false,
        includeBoundaries: context.includeBoundaries !== false,
        includeRecommendations: context.includeRecommendations !== false
      });

      // Clean and format result
      const cleanResult = this.cleanResult(layerAnalysis);

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

      logger.info(`✅ Layer analysis completed successfully`);

      return {
        success: true,
        result: cleanResult,
        metadata: {
          stepName: "LayerAnalysisStep",
          projectPath,
          timestamp: new Date()
        }
      };

    } catch (error) {
      logger.error(`❌ Layer analysis failed: ${error.message}`);
      
      return {
        success: false,
        error: error.message,
        metadata: {
          stepName: "LayerAnalysisStep",
          projectPath: context.projectPath,
          timestamp: new Date()
        }
      };
    }
  }

  /**
   * Analyze layer organization for a project
   * @param {string} projectPath - Path to the project
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Layer analysis result
   */
  async analyzeLayerOrganization(projectPath, options = {}) {
    try {
      const layers = [];
      const boundaries = [];
      const directories = await this.getAllDirectories(projectPath);

      // Common layer patterns
      const layerPatterns = [
        {
          name: 'Presentation Layer',
          indicators: ['components', 'views', 'pages', 'ui', 'presentation', 'controllers'],
          type: 'presentation',
          description: 'User interface and presentation logic'
        },
        {
          name: 'Business Logic Layer',
          indicators: ['services', 'business', 'logic', 'handlers', 'application', 'use-cases'],
          type: 'business',
          description: 'Business rules and application logic'
        },
        {
          name: 'Data Access Layer',
          indicators: ['repositories', 'models', 'entities', 'data', 'database', 'dao'],
          type: 'data',
          description: 'Data persistence and access logic'
        },
        {
          name: 'Infrastructure Layer',
          indicators: ['infrastructure', 'external', 'adapters', 'config', 'middleware'],
          type: 'infrastructure',
          description: 'External services and infrastructure concerns'
        },
        {
          name: 'Domain Layer',
          indicators: ['domain', 'entities', 'value-objects', 'aggregates', 'events'],
          type: 'domain',
          description: 'Core business domain models and logic'
        }
      ];

      layerPatterns.forEach(layerPattern => {
        const matchingDirs = directories.filter(dir => {
          const dirName = path.basename(dir).toLowerCase();
          return layerPattern.indicators.some(indicator => 
            dirName.includes(indicator)
          );
        });

        if (matchingDirs.length > 0) {
          layers.push({
            name: layerPattern.name,
            type: layerPattern.type,
            description: layerPattern.description,
            directories: matchingDirs.map(dir => path.relative(projectPath, dir)),
            confidence: this.calculateLayerConfidence(matchingDirs.length),
            fileCount: matchingDirs.length
          });
        }
      });

      // Analyze layer boundaries
      const boundaryAnalysis = this.analyzeLayerBoundaries(layers, directories);

      // Generate recommendations
      const recommendations = this.generateLayerRecommendations({
        layers,
        boundaries: boundaryAnalysis,
        totalDirectories: directories.length
      });

      // Calculate layer score
      const layerScore = this.calculateLayerScore({
        layers: layers.length,
        boundaries: boundaryAnalysis.length,
        totalDirectories: directories.length
      });

      return {
        layers,
        boundaries: boundaryAnalysis,
        recommendations,
        metrics: {
          totalDirectories: directories.length,
          layersDetected: layers.length,
          boundariesAnalyzed: boundaryAnalysis.length
        },
        score: layerScore,
        level: this.getLayerLevel(layerScore)
      };
    } catch (error) {
      logger.error(`Layer organization analysis failed: ${error.message}`);
      return { 
        layers: [],
        boundaries: [],
        recommendations: [],
        metrics: {},
        score: 0,
        level: 'unknown'
      };
    }
  }

  /**
   * Calculate layer confidence
   * @param {number} directoryCount - Number of matching directories
   * @returns {string} Confidence level
   */
  calculateLayerConfidence(directoryCount) {
    if (directoryCount >= 5) return 'high';
    if (directoryCount >= 3) return 'medium';
    return 'low';
  }

  /**
   * Analyze layer boundaries
   * @param {Array} layers - Detected layers
   * @param {Array} directories - All directories
   * @returns {Array} Boundary analysis
   */
  analyzeLayerBoundaries(layers, directories) {
    const boundaries = [];

    // Check for clear layer separation
    if (layers.length >= 3) {
      boundaries.push({
        type: 'separation',
        status: 'good',
        message: 'Clear layer separation detected',
        description: 'Multiple architectural layers identified with distinct responsibilities'
      });
    } else if (layers.length >= 2) {
      boundaries.push({
        type: 'separation',
        status: 'partial',
        message: 'Partial layer separation detected',
        description: 'Some architectural layers identified, consider adding more layers'
      });
    } else {
      boundaries.push({
        type: 'separation',
        status: 'poor',
        message: 'Limited layer separation detected',
        description: 'Consider implementing clear architectural layers'
      });
    }

    // Check for layer organization
    const organizedLayers = layers.filter(layer => layer.fileCount > 1);
    if (organizedLayers.length >= 3) {
      boundaries.push({
        type: 'organization',
        status: 'good',
        message: 'Well-organized layer structure',
        description: 'Layers contain multiple components with clear organization'
      });
    } else if (organizedLayers.length >= 2) {
      boundaries.push({
        type: 'organization',
        status: 'partial',
        message: 'Moderate layer organization',
        description: 'Some layers are well-organized, others may need improvement'
      });
    } else {
      boundaries.push({
        type: 'organization',
        status: 'poor',
        message: 'Poor layer organization',
        description: 'Layers lack proper organization and component distribution'
      });
    }

    // Check for domain-driven design patterns
    const domainLayer = layers.find(layer => layer.type === 'domain');
    if (domainLayer) {
      boundaries.push({
        type: 'ddd',
        status: 'good',
        message: 'Domain layer detected',
        description: 'Domain-driven design principles appear to be followed'
      });
    } else {
      boundaries.push({
        type: 'ddd',
        status: 'missing',
        message: 'No domain layer detected',
        description: 'Consider implementing a domain layer for better separation of concerns'
      });
    }

    return boundaries;
  }

  /**
   * Generate layer recommendations
   * @param {Object} data - Analysis data
   * @returns {Array} Recommendations
   */
  generateLayerRecommendations(data) {
    const { layers, boundaries, totalDirectories } = data;
    const recommendations = [];

    // Check for missing layers
    const layerTypes = layers.map(layer => layer.type);
    const missingLayers = [];

    if (!layerTypes.includes('presentation')) {
      missingLayers.push('Presentation Layer');
    }
    if (!layerTypes.includes('business')) {
      missingLayers.push('Business Logic Layer');
    }
    if (!layerTypes.includes('data')) {
      missingLayers.push('Data Access Layer');
    }
    if (!layerTypes.includes('infrastructure')) {
      missingLayers.push('Infrastructure Layer');
    }

    if (missingLayers.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'layers',
        message: `Missing architectural layers: ${missingLayers.join(', ')}`,
        action: 'Implement missing layers to improve separation of concerns',
        missingLayers
      });
    }

    // Check for layer balance
    const layerDistribution = layers.map(layer => ({
      name: layer.name,
      fileCount: layer.fileCount,
      percentage: (layer.fileCount / totalDirectories) * 100
    }));

    const unbalancedLayers = layerDistribution.filter(layer => layer.percentage > 40);
    if (unbalancedLayers.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'balance',
        message: 'Unbalanced layer distribution detected',
        action: 'Consider redistributing components to achieve better layer balance',
        unbalancedLayers: unbalancedLayers.map(l => l.name)
      });
    }

    // Check for boundary violations
    const poorBoundaries = boundaries.filter(b => b.status === 'poor');
    if (poorBoundaries.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'boundaries',
        message: 'Layer boundary issues detected',
        action: 'Review and improve layer boundaries and separation of concerns',
        issues: poorBoundaries.map(b => b.message)
      });
    }

    return recommendations;
  }

  /**
   * Calculate layer score
   * @param {Object} data - Analysis data
   * @returns {number} Layer score (0-100)
   */
  calculateLayerScore(data) {
    const { layers, boundaries, totalDirectories } = data;
    
    // Base score starts at 50
    let score = 50;

    // Reward for layer diversity (up to +30 points)
    const layerBonus = Math.min(layers * 6, 30);
    score += layerBonus;

    // Reward for good boundaries (up to +20 points)
    const goodBoundaries = boundaries.filter(b => b.status === 'good').length;
    const boundaryBonus = Math.min(goodBoundaries * 5, 20);
    score += boundaryBonus;

    // Bonus for layer organization (up to +10 points)
    if (layers >= 3 && totalDirectories > 10) {
      score += 10;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Get layer level
   * @param {number} score - Layer score
   * @returns {string} Layer level
   */
  getLayerLevel(score) {
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
   * Clean and format result
   * @param {Object} result - Analysis result
   * @returns {Object} Cleaned result
   */
  cleanResult(result) {
    return {
      ...result,
      timestamp: new Date().toISOString(),
      step: LayerAnalysisStep,
      category: 'architecture',
      subcategory: 'layer'
    };
  }

  /**
   * Validate execution context
   * @param {Object} context - Execution context
   */
  validateContext(context) {
    if (!context.projectPath) {
      throw new Error('Project path is required for layer analysis');
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
    const { layers, boundaries, metrics } = result;
    
    if (!layers || !boundaries || !metrics) return 0;
    
    // Higher confidence with more layers
    const layerConfidence = Math.min(layers.length * 10, 50);
    
    // Additional confidence for boundaries
    const boundaryConfidence = Math.min(boundaries.length * 5, 30);
    
    // Additional confidence for comprehensive analysis
    const coverageBonus = metrics.totalDirectories > 10 ? 20 : 0;
    
    return Math.min(layerConfidence + boundaryConfidence + coverageBonus, 100);
  }

  /**
   * Generate issues from analysis results
   * @param {Object} result - Analysis result
   * @returns {Array} Issues array
   */
  generateIssues(result) {
    const issues = [];
    
    // Check for low layer score
    if (result.score < 70) {
      issues.push({
        type: 'low-layer-score',
        title: 'Low Layer Organization Score',
        description: `Layer analysis score of ${result.score}% indicates poor layer organization`,
        severity: 'medium',
        priority: 'medium',
        category: this.category,
        source: LayerAnalysisStep,
        location: 'layer-organization',
        suggestion: 'Improve layer separation and organization following architectural principles'
      });
    }

    // Check for missing layers
    if (result.layers && result.layers.length < 3) {
      issues.push({
        type: 'insufficient-layers',
        title: 'Insufficient Layer Separation',
        description: `Only ${result.layers.length} layers detected, insufficient for proper architecture`,
        severity: 'high',
        priority: 'high',
        category: this.category,
        source: LayerAnalysisStep,
        location: 'layer-organization',
        suggestion: 'Implement proper layer separation (presentation, business, data, infrastructure)'
      });
    }

    // Check for layer boundary violations
    if (result.boundaries && result.boundaries.violations && result.boundaries.violations.length > 0) {
      issues.push({
        type: 'layer-boundary-violations',
        title: 'Layer Boundary Violations Detected',
        description: `${result.boundaries.violations.length} layer boundary violations found`,
        severity: 'high',
        priority: 'high',
        category: this.category,
        source: LayerAnalysisStep,
        location: 'layer-boundaries',
        suggestion: 'Fix layer boundary violations to maintain architectural integrity'
      });
    }

    // Check for missing domain layer
    const hasDomainLayer = result.layers && result.layers.some(layer => 
      layer.type === 'domain' || layer.name.toLowerCase().includes('domain')
    );
    if (!hasDomainLayer) {
      issues.push({
        type: 'missing-domain-layer',
        title: 'Missing Domain Layer',
        description: 'No domain layer detected in the architecture',
        severity: 'medium',
        priority: 'medium',
        category: this.category,
        source: LayerAnalysisStep,
        location: 'layer-organization',
        suggestion: 'Implement a domain layer to encapsulate core business logic'
      });
    }

    return issues;
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
      id: `${LayerAnalysisStep.toLowerCase()}-improvement-${Date.now()}`,
      title: `Improve ${LayerAnalysisStep} Results`,
      description: `Address issues and implement recommendations from ${LayerAnalysisStep} analysis`,
      type: 'improvement',
      category: this.category,
      priority: 'medium',
      status: 'pending',
      projectId: projectId,
      metadata: {
        source: LayerAnalysisStep,
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
        id: `${LayerAnalysisStep.toLowerCase()}-critical-${Date.now()}`,
        title: `Fix Critical Issues from ${LayerAnalysisStep}`,
        description: 'Address critical issues identified in analysis',
        type: 'fix',
        category: this.category,
        priority: 'critical',
        status: 'pending',
        projectId: projectId,
        parentTaskId: mainTask.id,
        metadata: {
          source: LayerAnalysisStep,
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
        id: `${LayerAnalysisStep.toLowerCase()}-high-${Date.now()}`,
        title: `Fix High Priority Issues from ${LayerAnalysisStep}`,
        description: 'Address high priority issues identified in analysis',
        type: 'fix',
        category: this.category,
        priority: 'high',
        status: 'pending',
        projectId: projectId,
        parentTaskId: mainTask.id,
        metadata: {
          source: LayerAnalysisStep,
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
    
    // Check for low layer score
    if (result.score < 80) {
      recommendations.push({
        type: 'improve-layer-score',
        title: 'Improve Layer Organization Score',
        description: `Current score of ${result.score}% can be improved`,
        priority: 'medium',
        category: this.category,
        source: LayerAnalysisStep,
        action: 'Implement better layer separation and organization',
        impact: 'Better code organization and maintainability'
      });
    }

    // Check for missing layers
    if (result.layers && result.layers.length < 3) {
      recommendations.push({
        type: 'add-layers',
        title: 'Add More Layers',
        description: 'Consider implementing additional layers',
        priority: 'medium',
        category: this.category,
        source: LayerAnalysisStep,
        action: 'Research and implement appropriate layer patterns',
        impact: 'Improved separation of concerns'
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
    const docsDir = path.join(projectPath, `{{taskDocumentationPath}}${this.category}/${LayerAnalysisStep.toLowerCase()}`);
    
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
    const implementationPath = path.join(docsDir, `${LayerAnalysisStep.toLowerCase()}-implementation.md`);
    
    let content = `# ${LayerAnalysisStep} Implementation

## 1. Project Overview
- **Feature/Component Name**: ${LayerAnalysisStep}
- **Priority**: Medium
- **Category**: ${this.category}
- **Estimated Time**: ${this.calculateEstimatedHours(result)} hours
- **Dependencies**: None
- **Related Issues**: Layer organization improvements

## 2. Technical Requirements
- **Tech Stack**: Node.js, DDD Architecture
- **Architecture Pattern**: Domain-Driven Design (DDD)
- **Database Changes**: None
- **API Changes**: None
- **Backend Changes**: Improve layer organization
- **Frontend Changes**: None
- **Infrastructure Changes**: None

## 3. Implementation Phases

#### Phase 1: Layer Analysis (${Math.round(this.calculateEstimatedHours(result) * 0.3)} hours)
- [ ] Analyze current layer organization
- [ ] Identify improvement areas
- [ ] Plan layer restructuring

#### Phase 2: Implementation (${Math.round(this.calculateEstimatedHours(result) * 0.7)} hours)
- [ ] Implement layer improvements
- [ ] Validate changes
- [ ] Update documentation

## 4. Success Criteria
- [ ] Layer score improved
- [ ] Layer separation enhanced
- [ ] Code organization improved
- [ ] Maintainability enhanced

## 5. Risk Assessment
- **Low Risk**: Well-defined improvements
- **Mitigation**: Phase-by-phase implementation
`;
    
    await fs.writeFile(implementationPath, content);
    
    return {
      type: 'implementation',
      file: implementationPath,
      title: `${LayerAnalysisStep} Implementation`,
      description: 'Implementation plan for layer organization improvements'
    };
  }
}

// Create instance for execution
const stepInstance = new LayerAnalysisStep();

// Export in StepRegistry format
module.exports = {
  config: LayerAnalysisStep.getConfig(),
  execute: async (context) => await stepInstance.execute(context)
};