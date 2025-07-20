/**
 * Architecture Analysis Step - Core Analysis Step
 * Analyzes software architecture patterns and structure
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const fs = require('fs').promises;
const path = require('path');

const logger = new Logger('architecture_analysis_step');

// Step configuration
const config = {
  name: 'ArchitectureAnalysisStep',
  type: 'analysis',
  description: 'Analyzes software architecture patterns and structure',
  category: 'analysis',
  version: '1.0.0',
  dependencies: [],
  settings: {
    timeout: 45000,
    includePatterns: true,
    includeLayers: true,
    includeRecommendations: true
  },
  validation: {
    requiredFiles: ['package.json'],
    supportedProjects: ['nodejs', 'react', 'vue', 'angular', 'express', 'nest']
  }
};

class ArchitectureAnalysisStep {
  constructor() {
    this.name = 'ArchitectureAnalysisStep';
    this.description = 'Analyzes software architecture patterns and structure';
    this.category = 'analysis';
    this.dependencies = [];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = ArchitectureAnalysisStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`🏗️ Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);

      const projectPath = context.projectPath;
      
      logger.info(`📊 Starting architecture analysis for: ${projectPath}`);

      // Execute architecture analysis
      const architecture = await this.analyzeArchitecture(projectPath, {
        includePatterns: context.includePatterns !== false,
        includeLayers: context.includeLayers !== false,
        includeRecommendations: context.includeRecommendations !== false
      });

      // Clean and format result
      const cleanResult = this.cleanResult(architecture);

      logger.info(`✅ Architecture analysis completed successfully`);

      return {
        success: true,
        result: cleanResult,
        metadata: {
          stepName: this.name,
          projectPath,
          analysisType: 'architecture',
          timestamp: new Date()
        }
      };

    } catch (error) {
      logger.error(`❌ Architecture analysis failed: ${error.message}`);
      
      return {
        success: false,
        error: error.message,
        metadata: {
          stepName: this.name,
          projectPath: context.projectPath,
          analysisType: 'architecture',
          timestamp: new Date()
        }
      };
    }
  }

  /**
   * Analyze architecture for a project
   * @param {string} projectPath - Path to the project
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Architecture analysis result
   */
  async analyzeArchitecture(projectPath, options = {}) {
    try {
      const result = {
        patterns: [],
        layers: [],
        recommendations: [],
        summary: {}
      };

      // Analyze project structure and patterns
      const structureAnalysis = await this.analyzeProjectStructure(projectPath);
      
      // Analyze architectural patterns
      const patternAnalysis = await this.analyzeArchitecturalPatterns(projectPath);
      
      // Analyze layer organization
      const layerAnalysis = await this.analyzeLayerOrganization(projectPath);
      
      // Analyze dependencies and coupling
      const couplingAnalysis = await this.analyzeCoupling(projectPath);

      // Aggregate patterns
      if (options.includePatterns) {
        result.patterns = [
          ...structureAnalysis.patterns,
          ...patternAnalysis.patterns
        ];
      }

      // Aggregate layers
      if (options.includeLayers) {
        result.layers = [
          ...structureAnalysis.layers,
          ...layerAnalysis.layers
        ];
      }

      // Generate recommendations
      if (options.includeRecommendations) {
        result.recommendations = this.generateRecommendations({
          structure: structureAnalysis,
          patterns: patternAnalysis,
          layers: layerAnalysis,
          coupling: couplingAnalysis
        });
      }

      // Create summary
      result.summary = {
        totalPatterns: result.patterns.length,
        totalLayers: result.layers.length,
        totalRecommendations: result.recommendations.length,
        architectureType: this.determineArchitectureType(result.patterns),
        complexityLevel: this.calculateComplexityLevel(result)
      };

      return result;

    } catch (error) {
      logger.error(`Architecture analysis failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Analyze project structure
   */
  async analyzeProjectStructure(projectPath) {
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

      return { patterns, layers };
    } catch (error) {
      logger.error(`Project structure analysis failed: ${error.message}`);
      return { patterns: [], layers: [] };
    }
  }

  /**
   * Analyze architectural patterns in code
   */
  async analyzeArchitecturalPatterns(projectPath) {
    try {
      const patterns = [];
      const jsFiles = await this.getJavaScriptFiles(projectPath);

      for (const file of jsFiles.slice(0, 40)) { // Limit for performance
        try {
          const content = await fs.readFile(file, 'utf8');
          const filePatterns = this.detectCodePatterns(content, file);
          patterns.push(...filePatterns);
        } catch (error) {
          // Skip files that can't be read
        }
      }

      // Remove duplicates and aggregate
      const uniquePatterns = this.aggregatePatterns(patterns);

      return { patterns: uniquePatterns };
    } catch (error) {
      logger.error(`Architectural patterns analysis failed: ${error.message}`);
      return { patterns: [] };
    }
  }

  /**
   * Analyze layer organization
   */
  async analyzeLayerOrganization(projectPath) {
    try {
      const layers = [];
      const directories = await this.getAllDirectories(projectPath);

      // Common layer patterns
      const layerPatterns = [
        {
          name: 'Presentation Layer',
          indicators: ['components', 'views', 'pages', 'ui', 'presentation'],
          type: 'presentation'
        },
        {
          name: 'Business Logic Layer',
          indicators: ['services', 'business', 'logic', 'handlers', 'controllers'],
          type: 'business'
        },
        {
          name: 'Data Access Layer',
          indicators: ['repositories', 'models', 'entities', 'data', 'database'],
          type: 'data'
        },
        {
          name: 'Infrastructure Layer',
          indicators: ['infrastructure', 'external', 'adapters', 'config'],
          type: 'infrastructure'
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
            directories: matchingDirs.map(dir => path.relative(projectPath, dir)),
            confidence: 'medium'
          });
        }
      });

      return { layers };
    } catch (error) {
      logger.error(`Layer organization analysis failed: ${error.message}`);
      return { layers: [] };
    }
  }

  /**
   * Analyze coupling between components
   */
  async analyzeCoupling(projectPath) {
    try {
      const coupling = {
        high: [],
        medium: [],
        low: []
      };

      const jsFiles = await this.getJavaScriptFiles(projectPath);

      for (const file of jsFiles.slice(0, 30)) {
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

      return coupling;
    } catch (error) {
      logger.error(`Coupling analysis failed: ${error.message}`);
      return { high: [], medium: [], low: [] };
    }
  }

  /**
   * Analyze directory structure
   */
  analyzeDirectoryStructure(directories, projectPath) {
    const structure = {
      models: [],
      views: [],
      controllers: [],
      services: [],
      utils: [],
      config: []
    };

    directories.forEach(dir => {
      const relativePath = path.relative(projectPath, dir);
      const dirName = path.basename(dir).toLowerCase();

      if (dirName.includes('model') || dirName.includes('entity')) {
        structure.models.push(relativePath);
      } else if (dirName.includes('view') || dirName.includes('component')) {
        structure.views.push(relativePath);
      } else if (dirName.includes('controller') || dirName.includes('handler')) {
        structure.controllers.push(relativePath);
      } else if (dirName.includes('service')) {
        structure.services.push(relativePath);
      } else if (dirName.includes('util') || dirName.includes('helper')) {
        structure.utils.push(relativePath);
      } else if (dirName.includes('config') || dirName.includes('conf')) {
        structure.config.push(relativePath);
      }
    });

    return structure;
  }

  /**
   * Detect MVC structure
   */
  hasMVCStructure(directories) {
    const dirNames = directories.map(dir => path.basename(dir).toLowerCase());
    const hasModels = dirNames.some(name => name.includes('model') || name.includes('entity'));
    const hasViews = dirNames.some(name => name.includes('view') || name.includes('component'));
    const hasControllers = dirNames.some(name => name.includes('controller') || name.includes('handler'));
    
    return hasModels && hasViews && hasControllers;
  }

  /**
   * Detect layered architecture
   */
  hasLayeredArchitecture(directories) {
    const dirNames = directories.map(dir => path.basename(dir).toLowerCase());
    const layerIndicators = ['presentation', 'business', 'data', 'infrastructure'];
    const layerCount = layerIndicators.filter(indicator => 
      dirNames.some(name => name.includes(indicator))
    ).length;
    
    return layerCount >= 3;
  }

  /**
   * Detect microservices structure
   */
  hasMicroservicesStructure(directories) {
    const dirNames = directories.map(dir => path.basename(dir).toLowerCase());
    const serviceDirs = dirNames.filter(name => name.includes('service'));
    const hasMultipleServices = serviceDirs.length > 2;
    const hasIndependentConfigs = dirNames.some(name => name.includes('config'));
    
    return hasMultipleServices && hasIndependentConfigs;
  }

  /**
   * Detect monorepo structure
   */
  hasMonorepoStructure(directories) {
    const dirNames = directories.map(dir => path.basename(dir).toLowerCase());
    const hasPackages = dirNames.includes('packages') || dirNames.includes('apps');
    const hasMultipleApps = dirNames.filter(name => name.includes('app')).length > 1;
    
    return hasPackages || hasMultipleApps;
  }

  /**
   * Detect code patterns
   */
  detectCodePatterns(content, filePath) {
    const patterns = [];

    // Singleton pattern
    if (content.includes('getInstance') || content.includes('instance')) {
      patterns.push({
        type: 'creational',
        name: 'Singleton Pattern',
        confidence: 'medium',
        file: path.relative(process.cwd(), filePath),
        description: 'Singleton pattern usage detected'
      });
    }

    // Factory pattern
    if (content.includes('create') && content.includes('factory')) {
      patterns.push({
        type: 'creational',
        name: 'Factory Pattern',
        confidence: 'medium',
        file: path.relative(process.cwd(), filePath),
        description: 'Factory pattern usage detected'
      });
    }

    // Observer pattern
    if (content.includes('addEventListener') || content.includes('on(') || content.includes('emit(')) {
      patterns.push({
        type: 'behavioral',
        name: 'Observer Pattern',
        confidence: 'high',
        file: path.relative(process.cwd(), filePath),
        description: 'Observer pattern usage detected'
      });
    }

    // Strategy pattern
    if (content.includes('strategy') || (content.includes('function') && content.includes('switch'))) {
      patterns.push({
        type: 'behavioral',
        name: 'Strategy Pattern',
        confidence: 'medium',
        file: path.relative(process.cwd(), filePath),
        description: 'Strategy pattern usage detected'
      });
    }

    // Repository pattern
    if (content.includes('repository') || content.includes('findBy') || content.includes('save(')) {
      patterns.push({
        type: 'structural',
        name: 'Repository Pattern',
        confidence: 'medium',
        file: path.relative(process.cwd(), filePath),
        description: 'Repository pattern usage detected'
      });
    }

    return patterns;
  }

  /**
   * Analyze file coupling
   */
  analyzeFileCoupling(content, filePath) {
    const imports = content.match(/require\(['"]([^'"]+)['"]\)/g) || [];
    const importCount = imports.length;
    
    let level = 'low';
    if (importCount > 10) {
      level = 'high';
    } else if (importCount > 5) {
      level = 'medium';
    }

    return {
      file: path.relative(process.cwd(), filePath),
      level,
      importCount,
      imports: imports.map(imp => imp.replace(/require\(['"]([^'"]+)['"]\)/, '$1'))
    };
  }

  /**
   * Aggregate patterns to remove duplicates
   */
  aggregatePatterns(patterns) {
    const patternMap = new Map();
    
    patterns.forEach(pattern => {
      const key = pattern.name;
      if (patternMap.has(key)) {
        const existing = patternMap.get(key);
        existing.files = existing.files || [];
        existing.files.push(pattern.file);
        existing.confidence = existing.confidence === 'high' ? 'high' : pattern.confidence;
      } else {
        patternMap.set(key, {
          ...pattern,
          files: pattern.file ? [pattern.file] : []
        });
      }
    });

    return Array.from(patternMap.values());
  }

  /**
   * Generate architecture recommendations
   */
  generateRecommendations(analysis) {
    const recommendations = [];

    // Check for high coupling
    if (analysis.coupling.high.length > 5) {
      recommendations.push({
        priority: 'high',
        category: 'coupling',
        message: 'High coupling detected in multiple files',
        action: 'Consider refactoring to reduce dependencies between components'
      });
    }

    // Check for missing layers
    if (analysis.layers.layers.length < 3) {
      recommendations.push({
        priority: 'medium',
        category: 'layers',
        message: 'Limited layer separation detected',
        action: 'Consider implementing clear layer boundaries (presentation, business, data)'
      });
    }

    // Check for architectural patterns
    if (analysis.patterns.patterns.length === 0) {
      recommendations.push({
        priority: 'medium',
        category: 'patterns',
        message: 'No clear architectural patterns detected',
        action: 'Consider implementing established patterns like MVC, Repository, or Service Layer'
      });
    }

    return recommendations;
  }

  /**
   * Determine architecture type
   */
  determineArchitectureType(patterns) {
    const patternNames = patterns.map(p => p.name.toLowerCase());
    
    if (patternNames.some(name => name.includes('microservice'))) {
      return 'microservices';
    } else if (patternNames.some(name => name.includes('mvc'))) {
      return 'mvc';
    } else if (patternNames.some(name => name.includes('layered'))) {
      return 'layered';
    } else if (patternNames.some(name => name.includes('monorepo'))) {
      return 'monorepo';
    } else {
      return 'custom';
    }
  }

  /**
   * Calculate complexity level
   */
  calculateComplexityLevel(result) {
    const totalPatterns = result.patterns.length;
    const totalLayers = result.layers.length;
    const totalRecommendations = result.recommendations.length;

    if (totalPatterns > 5 || totalLayers > 4) {
      return 'high';
    } else if (totalPatterns > 2 || totalLayers > 2) {
      return 'medium';
    } else {
      return 'low';
    }
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

  async getAllDirectories(dir) {
    const directories = [];
    try {
      const items = await fs.readdir(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = await fs.stat(fullPath);
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          directories.push(fullPath);
          directories.push(...(await this.getAllDirectories(fullPath)));
        }
      }
    } catch (error) {
      // Skip directories that can't be read
    }
    return directories;
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
      throw new Error('Project path is required for architecture analysis');
    }
  }
}

// Create instance for execution
const stepInstance = new ArchitectureAnalysisStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
}; 