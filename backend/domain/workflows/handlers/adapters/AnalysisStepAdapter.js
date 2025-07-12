/**
 * AnalysisStepAdapter - Adapter for analysis workflow steps
 * 
 * This adapter provides routing for analyze requests to the appropriate
 * analysis workflow steps, replacing  analyze handlers.
 */
const IHandlerAdapter = require('../interfaces/IHandlerAdapter');
const { AnalysisStepFactory } = require('../../steps/analysis');
/**
 * Analysis step adapter
 */
class AnalysisStepAdapter extends IHandlerAdapter {
  /**
   * Create a new analysis step adapter
   * @param {Object} options - Adapter options
   */
  constructor(options = {}) {
    super();
    this.factory = new AnalysisStepFactory(options);
    this.options = {
      enableCaching: options.enableCaching !== false,
      cacheSize: options.cacheSize || 50,
      enableValidation: options.enableValidation !== false,
      ...options
    };
    this.handlerCache = new Map();
  }
  /**
   * Create handler from analysis step
   * @param {Object} request - Handler request
   * @param {HandlerContext} context - Handler context
   * @returns {Promise<IHandler>} Handler instance
   */
  async createHandler(request, context) {
    try {
      const analysisType = this.determineAnalysisType(request);
      // Check cache first
      if (this.options.enableCaching) {
        const cacheKey = this.generateCacheKey(request, analysisType);
        if (this.handlerCache.has(cacheKey)) {
          return this.handlerCache.get(cacheKey);
        }
      }
      // Create analysis step
      const step = this.factory.createAnalysisStep(analysisType, this.extractStepOptions(request));
      // Wrap with unified handler interface
      const unifiedHandler = this.wrapAnalysisStep(step, request, analysisType);
      // Cache handler
      if (this.options.enableCaching) {
        const cacheKey = this.generateCacheKey(request, analysisType);
        this.cacheHandler(cacheKey, unifiedHandler);
      }
      return unifiedHandler;
    } catch (error) {
      throw new Error(`Analysis step handler creation failed: ${error.message}`);
    }
  }
  /**
   * Determine analysis type from request
   * @param {Object} request - Handler request
   * @returns {string} Analysis type
   */
  determineAnalysisType(request) {
    // Map request types to analysis step types
    const typeMap = {
      'analyze_architecture': 'architecture',
      'analyze_code_quality': 'code-quality',
      'analyze_tech_stack': 'tech-stack',
      'analyze_repo_structure': 'repo-structure',
      'analyze_dependencies': 'dependencies',
      'analyze_advanced': 'advanced'
    };
    return typeMap[request.type] || 'architecture';
  }
  /**
   * Extract step options from request
   * @param {Object} request - Handler request
   * @returns {Object} Step options
   */
  extractStepOptions(request) {
    const options = {};
    // Extract options from request
    if (request.options) {
      Object.assign(options, request.options);
    }
    // Extract options from command if available
    if (request.command && request.command.getAnalysisOptions) {
      Object.assign(options, request.command.getAnalysisOptions());
    }
    return options;
  }
  /**
   * Wrap analysis step with unified handler interface
   * @param {BaseWorkflowStep} step - Analysis step
   * @param {Object} request - Handler request
   * @param {string} analysisType - Analysis type
   * @returns {IHandler} Unified handler
   */
  wrapAnalysisStep(step, request, analysisType) {
    return {
      /**
       * Execute handler
       * @param {HandlerContext} context - Handler context
       * @returns {Promise<HandlerResult>} Handler result
       */
      async execute(context) {
        try {
          // Create workflow context from handler context
          const workflowContext = this.createWorkflowContext(context, request);
          // Execute analysis step
          const result = await step.executeStep(workflowContext);
          return {
            success: true,
            data: result,
            metadata: {
              analysisStep: true,
              stepType: analysisType,
              stepName: step._name,
              originalRequest: context.getRequest()
            }
          };
        } catch (error) {
          return {
            success: false,
            error: error.message,
            metadata: {
              analysisStep: true,
              stepType: analysisType,
              stepName: step._name,
              originalRequest: context.getRequest()
            }
          };
        }
      },
      /**
       * Create workflow context from handler context
       * @param {HandlerContext} handlerContext - Handler context
       * @param {Object} request - Original request
       * @returns {Object} Workflow context
       */
      createWorkflowContext(handlerContext, request) {
        const workflowContext = {
          get: (key) => {
            // Map workflow context keys to handler context
            const keyMap = {
              'projectPath': 'projectPath',
              'architectureAnalyzer': 'architectureAnalyzer',
              'codeQualityAnalyzer': 'codeQualityAnalyzer',
              'techStackAnalyzer': 'techStackAnalyzer',
              'projectAnalyzer': 'projectAnalyzer',
              'dependencyAnalyzer': 'dependencyAnalyzer',
              'advancedAnalysisService': 'advancedAnalysisService',
              'fileSystemService': 'fileSystemService',
              'logger': 'logger',
              'executionRepository': 'executionRepository',
              'executionId': 'executionId'
            };
            const mappedKey = keyMap[key] || key;
            return handlerContext.get(mappedKey);
          },
          set: (key, value) => {
            handlerContext.set(key, value);
          }
        };
        // Set project path from request
        if (request.projectPath) {
          workflowContext.set('projectPath', request.projectPath);
        }
        // Set project path from command if available
        if (request.command && request.command.projectPath) {
          workflowContext.set('projectPath', request.command.projectPath);
        }
        return workflowContext;
      }
    };
  }
  /**
   * Check if adapter can handle the given request
   * @param {Object} request - Handler request object
   * @returns {boolean} True if adapter can handle the request
   */
  canHandle(request) {
    // Handle analyze requests
    if (request.type && request.type.startsWith('analyze_')) {
      return true;
    }
    // Handle requests with analysis step type
    if (request.analysisStep || request.analysisType) {
      return true;
    }
    return false;
  }
  /**
   * Generate cache key
   * @param {Object} request - Handler request
   * @param {string} analysisType - Analysis type
   * @returns {string} Cache key
   */
  generateCacheKey(request, analysisType) {
    const options = this.extractStepOptions(request);
    return `${analysisType}-${JSON.stringify(options)}`;
  }
  /**
   * Cache handler
   * @param {string} key - Cache key
   * @param {IHandler} handler - Handler to cache
   */
  cacheHandler(key, handler) {
    // Implement LRU cache if needed
    if (this.handlerCache.size >= this.options.cacheSize) {
      const firstKey = this.handlerCache.keys().next().value;
      this.handlerCache.delete(firstKey);
    }
    this.handlerCache.set(key, handler);
  }
  /**
   * Clear handler cache
   */
  clearCache() {
    this.handlerCache.clear();
  }
  /**
   * Get cached handler count
   * @returns {number} Number of cached handlers
   */
  getCacheSize() {
    return this.handlerCache.size;
  }
  /**
   * Get adapter metadata
   * @returns {Object} Adapter metadata
   */
  getMetadata() {
    return {
      name: 'Analysis Step Adapter',
      description: 'Adapter for analysis workflow steps (replaces  analyze handlers)',
      version: '1.0.0',
      type: 'analysis-step',
      capabilities: ['analysis_step_routing', 'workflow_integration', 'caching'],
      supportedTypes: [
        'analyze_architecture',
        'analyze_code_quality',
        'analyze_tech_stack',
        'analyze_repo_structure',
        'analyze_dependencies',
        'analyze_advanced'
      ],
      factory: this.factory.getMetadata(),
      cacheSize: this.getCacheSize()
    };
  }
  /**
   * Get adapter type
   * @returns {string} Adapter type
   */
  getType() {
    return 'analysis-step';
  }
  /**
   * Get adapter version
   * @returns {string} Adapter version
   */
  getVersion() {
    return '1.0.0';
  }
  /**
   * Get supported request types
   * @returns {Array<string>} Array of supported request types
   */
  getSupportedTypes() {
    return [
      'analyze_architecture',
      'analyze_code_quality',
      'analyze_tech_stack',
      'analyze_repo_structure',
      'analyze_dependencies',
      'analyze_advanced'
    ];
  }
  /**
   * Validate adapter
   * @returns {boolean} True if adapter is valid
   */
  validate() {
    if (!this.factory) {
      return false;
    }
    if (typeof this.canHandle !== 'function') {
      return false;
    }
    if (typeof this.createHandler !== 'function') {
      return false;
    }
    return true;
  }
}
module.exports = AnalysisStepAdapter; 