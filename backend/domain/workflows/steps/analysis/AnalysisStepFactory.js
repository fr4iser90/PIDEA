/**
 * AnalysisStepFactory - Factory for creating analysis workflow steps
 * 
 * This factory provides methods to create different types of analysis steps
 * with proper configuration and dependencies.
 */
const BaseWorkflowStep = require('../BaseWorkflowStep');

/**
 * Analysis step factory
 */
class AnalysisStepFactory {
  /**
   * Create a new analysis step factory
   * @param {Object} options - Factory options
   */
  constructor(options = {}) {
    this.options = {
      enableValidation: options.enableValidation !== false,
      enableCaching: options.enableCaching !== false,
      cacheSize: options.cacheSize || 50,
      ...options
    };
    
    this.stepCache = new Map();
  }

  /**
   * Create architecture analysis step
   * @param {Object} options - Step options
   * @returns {ArchitectureAnalysisStep} Architecture analysis step
   */
  createArchitectureAnalysisStep(options = {}) {
    const ArchitectureAnalysisStep = require('./ArchitectureAnalysisStep');
    return new ArchitectureAnalysisStep(options);
  }

  /**
   * Create code quality analysis step
   * @param {Object} options - Step options
   * @returns {CodeQualityAnalysisStep} Code quality analysis step
   */
  createCodeQualityAnalysisStep(options = {}) {
    const CodeQualityAnalysisStep = require('./CodeQualityAnalysisStep');
    return new CodeQualityAnalysisStep(options);
  }

  /**
   * Create tech stack analysis step
   * @param {Object} options - Step options
   * @returns {TechStackAnalysisStep} Tech stack analysis step
   */
  createTechStackAnalysisStep(options = {}) {
    const TechStackAnalysisStep = require('./TechStackAnalysisStep');
    return new TechStackAnalysisStep(options);
  }

  /**
   * Create repository structure analysis step
   * @param {Object} options - Step options
   * @returns {RepoStructureAnalysisStep} Repository structure analysis step
   */
  createRepoStructureAnalysisStep(options = {}) {
    const RepoStructureAnalysisStep = require('./RepoStructureAnalysisStep');
    return new RepoStructureAnalysisStep(options);
  }

  /**
   * Create dependencies analysis step
   * @param {Object} options - Step options
   * @returns {DependenciesAnalysisStep} Dependencies analysis step
   */
  createDependenciesAnalysisStep(options = {}) {
    const DependenciesAnalysisStep = require('./DependenciesAnalysisStep');
    return new DependenciesAnalysisStep(options);
  }

  /**
   * Create advanced analysis step
   * @param {Object} options - Step options
   * @returns {AdvancedAnalysisStep} Advanced analysis step
   */
  createAdvancedAnalysisStep(options = {}) {
    const AdvancedAnalysisStep = require('./AdvancedAnalysisStep');
    return new AdvancedAnalysisStep(options);
  }

  /**
   * Create analysis step by type
   * @param {string} type - Analysis type
   * @param {Object} options - Step options
   * @returns {BaseWorkflowStep} Analysis step
   */
  createAnalysisStep(type, options = {}) {
    const cacheKey = `${type}-${JSON.stringify(options)}`;
    
    // Check cache first
    if (this.options.enableCaching && this.stepCache.has(cacheKey)) {
      return this.stepCache.get(cacheKey);
    }

    let step;
    
    switch (type) {
      case 'architecture':
        step = this.createArchitectureAnalysisStep(options);
        break;
      case 'code-quality':
        step = this.createCodeQualityAnalysisStep(options);
        break;
      case 'tech-stack':
        step = this.createTechStackAnalysisStep(options);
        break;
      case 'repo-structure':
        step = this.createRepoStructureAnalysisStep(options);
        break;
      case 'dependencies':
        step = this.createDependenciesAnalysisStep(options);
        break;
      case 'advanced':
        step = this.createAdvancedAnalysisStep(options);
        break;
      default:
        throw new Error(`Unknown analysis type: ${type}`);
    }

    // Cache step
    if (this.options.enableCaching) {
      this.cacheStep(cacheKey, step);
    }

    return step;
  }

  /**
   * Create comprehensive analysis workflow
   * @param {Object} options - Analysis options
   * @returns {Array<BaseWorkflowStep>} Array of analysis steps
   */
  createComprehensiveAnalysisWorkflow(options = {}) {
    const steps = [
      this.createArchitectureAnalysisStep(options.architecture || {}),
      this.createCodeQualityAnalysisStep(options.codeQuality || {}),
      this.createTechStackAnalysisStep(options.techStack || {}),
      this.createRepoStructureAnalysisStep(options.repoStructure || {}),
      this.createDependenciesAnalysisStep(options.dependencies || {}),
      this.createAdvancedAnalysisStep(options.advanced || {})
    ];

    return steps;
  }

  /**
   * Cache step
   * @param {string} key - Cache key
   * @param {BaseWorkflowStep} step - Step to cache
   */
  cacheStep(key, step) {
    // Implement LRU cache if needed
    if (this.stepCache.size >= this.options.cacheSize) {
      const firstKey = this.stepCache.keys().next().value;
      this.stepCache.delete(firstKey);
    }
    
    this.stepCache.set(key, step);
  }

  /**
   * Clear step cache
   */
  clearCache() {
    this.stepCache.clear();
  }

  /**
   * Get cached step count
   * @returns {number} Number of cached steps
   */
  getCacheSize() {
    return this.stepCache.size;
  }

  /**
   * Get factory metadata
   * @returns {Object} Factory metadata
   */
  getMetadata() {
    return {
      name: 'AnalysisStepFactory',
      description: 'Factory for creating analysis workflow steps',
      version: '1.0.0',
      supportedTypes: [
        'architecture',
        'code-quality',
        'tech-stack',
        'repo-structure',
        'dependencies',
        'advanced'
      ],
      options: this.options,
      cacheSize: this.getCacheSize()
    };
  }
}

module.exports = AnalysisStepFactory; 