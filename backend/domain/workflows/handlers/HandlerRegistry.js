/**
 * HandlerRegistry - Handler registration and management
 * 
 * This class provides a centralized registry for managing handlers,
 * including registration, lookup, lifecycle management, and metadata
 * tracking. It follows the registry pattern for handler management.
 */
class HandlerRegistry {
  /**
   * Create a new handler registry
   * @param {Object} options - Registry options
   */
  constructor(options = {}) {
    this.handlers = new Map();
    this.handlerTypes = new Map();
    this.handlerMetadata = new Map();
    this.handlerStatistics = new Map();
    this.options = {
      enableStatistics: options.enableStatistics !== false,
      maxHandlers: options.maxHandlers || 1000,
      enableValidation: options.enableValidation !== false,
      autoRegisterAnalysisSteps: options.autoRegisterAnalysisSteps !== false,
      ...options
    };
    
    // Auto-register analysis steps if enabled
    if (this.options.autoRegisterAnalysisSteps) {
      this.registerDefaultAnalysisSteps();
    }
  }

  /**
   * Register handler
   * @param {string} type - Handler type
   * @param {IHandler} handler - Handler instance
   * @param {Object} metadata - Handler metadata
   * @returns {boolean} True if registration successful
   */
  registerHandler(type, handler, metadata = {}) {
    try {
      // Validate inputs
      if (!type || typeof type !== 'string') {
        throw new Error('Handler type must be a non-empty string');
      }

      if (!handler) {
        throw new Error('Handler instance is required');
      }

      // Check registry capacity
      if (this.handlers.size >= this.options.maxHandlers) {
        throw new Error(`Registry capacity exceeded (max: ${this.options.maxHandlers})`);
      }

      // Validate handler if enabled
      if (this.options.enableValidation) {
        this.validateHandlerForRegistration(handler);
      }

      // Register handler
      this.handlers.set(type, handler);
      this.handlerTypes.set(type, handler.constructor.name);
      
      // Store metadata with integration information
      const fullMetadata = {
        ...handler.getMetadata(),
        ...metadata,
        registeredAt: new Date(),
        type,
        className: handler.constructor.name,
        integration: {
          status: 'registered',
          timestamp: new Date(),
          version: metadata.version || '1.0.0',
          compatibility: metadata.compatibility || 'unified',
          dependencies: metadata.dependencies || [],
          capabilities: metadata.capabilities || []
        }
      };
      this.handlerMetadata.set(type, fullMetadata);

      // Initialize statistics with integration tracking
      if (this.options.enableStatistics) {
        this.handlerStatistics.set(type, {
          executions: 0,
          successes: 0,
          failures: 0,
          totalDuration: 0,
          lastExecuted: null,
          averageDuration: 0,
          integrationMetrics: {
            integrationSuccess: 0,
            integrationFailures: 0,
            lastIntegrationCheck: null,
            integrationHealth: 'unknown'
          }
        });
      }

      return true;

    } catch (error) {
      console.error('Handler registration failed:', error.message);
      return false;
    }
  }

  /**
   * Get handler by type
   * @param {string} type - Handler type
   * @returns {IHandler|null} Handler instance
   */
  getHandler(type) {
    return this.handlers.get(type) || null;
  }

  /**
   * Check if handler exists
   * @param {string} type - Handler type
   * @returns {boolean} True if handler exists
   */
  hasHandler(type) {
    return this.handlers.has(type);
  }

  /**
   * Get handler metadata
   * @param {string} type - Handler type
   * @returns {Object|null} Handler metadata
   */
  getHandlerMetadata(type) {
    return this.handlerMetadata.get(type) || null;
  }

  /**
   * Get handler count
   * @returns {number} Number of registered handlers
   */
  getHandlerCount() {
    return this.handlers.size;
  }

  /**
   * Get handler types
   * @returns {Array<string>} Handler types
   */
  getHandlerTypes() {
    return Array.from(this.handlers.keys());
  }

  /**
   * List all handlers
   * @returns {Array<Object>} Handler information
   */
  listHandlers() {
    const handlers = [];
    
    for (const [type, handler] of this.handlers) {
      const metadata = this.handlerMetadata.get(type);
      const statistics = this.handlerStatistics.get(type);
      
      handlers.push({
        type,
        name: metadata?.name || handler.constructor.name,
        description: metadata?.description || '',
        version: metadata?.version || '1.0.0',
        registeredAt: metadata?.registeredAt,
        statistics: statistics || null
      });
    }
    
    return handlers;
  }

  /**
   * Unregister handler
   * @param {string} type - Handler type
   * @returns {boolean} True if handler was unregistered
   */
  unregisterHandler(type) {
    const wasRegistered = this.handlers.has(type);
    
    if (wasRegistered) {
      this.handlers.delete(type);
      this.handlerTypes.delete(type);
      this.handlerMetadata.delete(type);
      this.handlerStatistics.delete(type);
    }
    
    return wasRegistered;
  }

  /**
   * Clear all handlers
   */
  clearHandlers() {
    this.handlers.clear();
    this.handlerTypes.clear();
    this.handlerMetadata.clear();
    this.handlerStatistics.clear();
  }

  /**
   * Update handler statistics
   * @param {string} type - Handler type
   * @param {Object} result - Execution result
   */
  updateStatistics(type, result) {
    if (!this.options.enableStatistics) {
      return;
    }

    const stats = this.handlerStatistics.get(type);
    if (!stats) {
      return;
    }

    stats.executions++;
    stats.lastExecuted = new Date();

    if (result.isSuccess()) {
      stats.successes++;
    } else {
      stats.failures++;
    }

    if (result.getDuration) {
      const duration = result.getDuration();
      stats.totalDuration += duration;
      stats.averageDuration = stats.totalDuration / stats.executions;
    }
  }

  /**
   * Get handler statistics
   * @param {string} type - Handler type
   * @returns {Object|null} Handler statistics
   */
  getHandlerStatistics(type) {
    return this.handlerStatistics.get(type) || null;
  }

  /**
   * Get all statistics
   * @returns {Object} All handler statistics
   */
  getAllStatistics() {
    const result = {};
    
    for (const [type, stats] of this.handlerStatistics) {
      result[type] = { ...stats };
    }
    
    return result;
  }

  /**
   * Find handlers by criteria
   * @param {Object} criteria - Search criteria
   * @param {string} criteria.name - Handler name pattern
   * @param {string} criteria.type - Handler type pattern
   * @param {string} criteria.version - Handler version
   * @returns {Array<Object>} Matching handlers
   */
  findHandlers(criteria = {}) {
    const matches = [];
    
    for (const [type, handler] of this.handlers) {
      const metadata = this.handlerMetadata.get(type);
      
      let matchesCriteria = true;
      
      if (criteria.name && metadata?.name) {
        matchesCriteria = matchesCriteria && metadata.name.includes(criteria.name);
      }
      
      if (criteria.type) {
        matchesCriteria = matchesCriteria && type.includes(criteria.type);
      }
      
      if (criteria.version && metadata?.version) {
        matchesCriteria = matchesCriteria && metadata.version === criteria.version;
      }
      
      if (matchesCriteria) {
        matches.push({
          type,
          handler,
          metadata
        });
      }
    }
    
    return matches;
  }

  /**
   * Get registry summary
   * @returns {Object} Registry summary
   */
  getSummary() {
    const totalExecutions = Array.from(this.handlerStatistics.values())
      .reduce((sum, stats) => sum + stats.executions, 0);
    
    const totalSuccesses = Array.from(this.handlerStatistics.values())
      .reduce((sum, stats) => sum + stats.successes, 0);
    
    const totalFailures = Array.from(this.handlerStatistics.values())
      .reduce((sum, stats) => sum + stats.failures, 0);
    
    const integrationMetrics = this.getIntegrationMetrics();
    
    return {
      totalHandlers: this.handlers.size,
      totalExecutions,
      totalSuccesses,
      totalFailures,
      successRate: totalExecutions > 0 ? (totalSuccesses / totalExecutions) * 100 : 0,
      handlerTypes: this.getHandlerTypes(),
      statisticsEnabled: this.options.enableStatistics,
      integration: integrationMetrics
    };
  }

  /**
   * Get integration metrics
   * @returns {Object} Integration metrics
   */
  getIntegrationMetrics() {
    const handlers = this.listHandlers();
    const integrationMetrics = {
      totalHandlers: handlers.length,
      integratedHandlers: 0,
      healthyHandlers: 0,
      degradedHandlers: 0,
      unhealthyHandlers: 0,
      integrationSuccessRate: 0,
      lastIntegrationCheck: null
    };

    for (const handler of handlers) {
      const stats = handler.statistics?.integrationMetrics;
      if (stats) {
        integrationMetrics.integratedHandlers++;
        
        if (stats.integrationHealth === 'healthy') {
          integrationMetrics.healthyHandlers++;
        } else if (stats.integrationHealth === 'degraded') {
          integrationMetrics.degradedHandlers++;
        } else if (stats.integrationHealth === 'unhealthy') {
          integrationMetrics.unhealthyHandlers++;
        }

        if (stats.lastIntegrationCheck) {
          const checkTime = new Date(stats.lastIntegrationCheck);
          if (!integrationMetrics.lastIntegrationCheck || checkTime > integrationMetrics.lastIntegrationCheck) {
            integrationMetrics.lastIntegrationCheck = checkTime;
          }
        }
      }
    }

    if (integrationMetrics.integratedHandlers > 0) {
      integrationMetrics.integrationSuccessRate = 
        (integrationMetrics.healthyHandlers / integrationMetrics.integratedHandlers) * 100;
    }

    return integrationMetrics;
  }

  /**
   * Update integration health
   * @param {string} type - Handler type
   * @param {string} health - Health status
   * @param {Object} details - Health details
   */
  updateIntegrationHealth(type, health, details = {}) {
    const stats = this.handlerStatistics.get(type);
    if (stats && stats.integrationMetrics) {
      stats.integrationMetrics.integrationHealth = health;
      stats.integrationMetrics.lastIntegrationCheck = new Date();
      
      if (health === 'healthy') {
        stats.integrationMetrics.integrationSuccess++;
      } else {
        stats.integrationMetrics.integrationFailures++;
      }
    }
  }

  /**
   * Get integration status
   * @returns {Object} Integration status
   */
  getIntegrationStatus() {
    const handlers = this.listHandlers();
    const status = {
      overall: 'unknown',
      handlers: {},
      timestamp: new Date()
    };

    let healthyCount = 0;
    let totalCount = 0;

    for (const handler of handlers) {
      const health = handler.statistics?.integrationMetrics?.integrationHealth || 'unknown';
      status.handlers[handler.type] = health;
      
      if (health !== 'unknown') {
        totalCount++;
        if (health === 'healthy') {
          healthyCount++;
        }
      }
    }

    if (totalCount > 0) {
      if (healthyCount === totalCount) {
        status.overall = 'healthy';
      } else if (healthyCount > 0) {
        status.overall = 'degraded';
      } else {
        status.overall = 'unhealthy';
      }
    }

    return status;
  }

  /**
   * Validate handler for registration
   * @param {IHandler} handler - Handler to validate
   * @throws {Error} If validation fails
   */
  validateHandlerForRegistration(handler) {
    const requiredMethods = [
      'execute',
      'getMetadata',
      'validate',
      'canHandle',
      'getDependencies',
      'getVersion',
      'getType'
    ];

    for (const method of requiredMethods) {
      if (typeof handler[method] !== 'function') {
        throw new Error(`Handler must implement ${method} method`);
      }
    }

    // Validate metadata
    try {
      const metadata = handler.getMetadata();
      if (!metadata || typeof metadata !== 'object') {
        throw new Error('Handler must return valid metadata object');
      }
    } catch (error) {
      throw new Error(`Handler metadata validation failed: ${error.message}`);
    }
  }

  /**
   * Get registry options
   * @returns {Object} Registry options
   */
  getOptions() {
    return { ...this.options };
  }

  /**
   * Set registry options
   * @param {Object} options - New options
   */
  setOptions(options) {
    this.options = { ...this.options, ...options };
  }

  /**
   * Export registry state
   * @returns {Object} Registry state
   */
  exportState() {
    const state = {
      handlers: {},
      metadata: {},
      statistics: {},
      options: this.options
    };

    for (const [type, handler] of this.handlers) {
      state.handlers[type] = {
        className: handler.constructor.name,
        type: handler.getType(),
        version: handler.getVersion()
      };
    }

    for (const [type, metadata] of this.handlerMetadata) {
      state.metadata[type] = metadata;
    }

    for (const [type, stats] of this.handlerStatistics) {
      state.statistics[type] = stats;
    }

    return state;
  }

  /**
   * Register default analysis steps
   */
  registerDefaultAnalysisSteps() {
    try {
      // Import analysis steps
      const {
        ArchitectureAnalysisStep,
        CodeQualityAnalysisStep,
        TechStackAnalysisStep,
        RepoStructureAnalysisStep,
        DependenciesAnalysisStep,
        AdvancedAnalysisStep
      } = require('../steps/analysis');

      // Import VibeCoder steps
      const {
        VibeCoderAnalyzeStep,
        VibeCoderGenerateStep,
        VibeCoderRefactorStep,
        VibeCoderModeStep
      } = require('../steps/vibecoder');

      // Import VibeCoder handler adapter
      const VibeCoderHandlerAdapter = require('./adapters/VibeCoderHandlerAdapter');

      // Register analysis steps as handlers
      const analysisSteps = [
        {
          type: 'architecture-analysis',
          step: ArchitectureAnalysisStep,
          metadata: {
            name: 'Architecture Analysis',
            description: 'Performs architecture analysis on codebases',
            version: '1.0.0',
            category: 'analysis',
            capabilities: ['pattern_detection', 'complexity_analysis', 'dependency_analysis'],
            compatibility: 'unified',
            migrationStatus: 'completed',
            migrationDate: '2024-01-01',
            automationLevel: 'full'
          }
        },
        {
          type: 'code-quality-analysis',
          step: CodeQualityAnalysisStep,
          metadata: {
            name: 'Code Quality Analysis',
            description: 'Performs code quality analysis including linting and metrics',
            version: '1.0.0',
            category: 'analysis',
            capabilities: ['linting_analysis', 'complexity_analysis', 'maintainability_analysis'],
            compatibility: 'unified',
            migrationStatus: 'completed',
            migrationDate: '2024-01-01',
            automationLevel: 'full'
          }
        },
        {
          type: 'tech-stack-analysis',
          step: TechStackAnalysisStep,
          metadata: {
            name: 'Tech Stack Analysis',
            description: 'Analyzes technology stack and frameworks used',
            version: '1.0.0',
            category: 'analysis',
            capabilities: ['framework_detection', 'library_analysis', 'tool_analysis'],
            compatibility: 'unified',
            migrationStatus: 'completed',
            migrationDate: '2024-01-01',
            automationLevel: 'full'
          }
        },
        {
          type: 'repo-structure-analysis',
          step: RepoStructureAnalysisStep,
          metadata: {
            name: 'Repository Structure Analysis',
            description: 'Analyzes repository structure and organization',
            version: '1.0.0',
            category: 'analysis',
            capabilities: ['structure_analysis', 'file_analysis', 'organization_analysis'],
            compatibility: 'unified',
            migrationStatus: 'completed',
            migrationDate: '2024-01-01',
            automationLevel: 'full'
          }
        },
        {
          type: 'dependencies-analysis',
          step: DependenciesAnalysisStep,
          metadata: {
            name: 'Dependencies Analysis',
            description: 'Analyzes project dependencies and vulnerabilities',
            version: '1.0.0',
            category: 'analysis',
            capabilities: ['dependency_analysis', 'vulnerability_checking', 'version_analysis'],
            compatibility: 'unified',
            migrationStatus: 'completed',
            migrationDate: '2024-01-01',
            automationLevel: 'full'
          }
        },
        {
          type: 'advanced-analysis',
          step: AdvancedAnalysisStep,
          metadata: {
            name: 'Advanced Analysis',
            description: 'Performs comprehensive advanced analysis',
            version: '1.0.0',
            category: 'analysis',
            capabilities: ['layer_validation', 'logic_analysis', 'architectural_assessment'],
            compatibility: 'unified',
            migrationStatus: 'completed',
            migrationDate: '2024-01-01',
            automationLevel: 'full'
          }
        }
      ];

      // Register VibeCoder steps as handlers
      const vibecoderSteps = [
        {
          type: 'vibecoder-analyze',
          step: VibeCoderAnalyzeStep,
          metadata: {
            name: 'VibeCoder Analyze',
            description: 'Performs comprehensive VibeCoder analysis operations',
            version: '1.0.0',
            category: 'vibecoder',
            capabilities: ['comprehensive_analysis', 'sub_command_orchestration', 'result_consolidation'],
            compatibility: 'unified',
            migrationStatus: 'validated',
            migrationDate: '2024-01-01',
            automationLevel: 'full'
          }
        },
        {
          type: 'vibecoder-generate',
          step: VibeCoderGenerateStep,
          metadata: {
            name: 'VibeCoder Generate',
            description: 'Performs comprehensive VibeCoder generation operations',
            version: '1.0.0',
            category: 'vibecoder',
            capabilities: ['code_generation', 'strategy_determination', 'validation'],
            compatibility: 'unified',
            migrationStatus: 'validated',
            migrationDate: '2024-01-01',
            automationLevel: 'full'
          }
        },
        {
          type: 'vibecoder-refactor',
          step: VibeCoderRefactorStep,
          metadata: {
            name: 'VibeCoder Refactor',
            description: 'Performs comprehensive VibeCoder refactoring operations',
            version: '1.0.0',
            category: 'vibecoder',
            capabilities: ['code_refactoring', 'strategy_determination', 'validation'],
            compatibility: 'unified',
            migrationStatus: 'validated',
            migrationDate: '2024-01-01',
            automationLevel: 'full'
          }
        },
        {
          type: 'vibecoder-mode',
          step: VibeCoderModeStep,
          metadata: {
            name: 'VibeCoder Mode',
            description: 'Performs comprehensive VibeCoder mode operations',
            version: '1.0.0',
            category: 'vibecoder',
            capabilities: ['comprehensive_orchestration', 'phase_execution', 'result_validation'],
            compatibility: 'unified',
            migrationStatus: 'validated',
            migrationDate: '2024-01-01',
            automationLevel: 'full'
          }
        }
      ];

      // Register each analysis step
      for (const { type, step, metadata } of analysisSteps) {
        const stepInstance = new step();
        this.registerHandler(type, stepInstance, metadata);
      }

      // Register each VibeCoder step using adapter
      for (const { type, step, metadata } of vibecoderSteps) {
        const stepInstance = new step();
        const handlerAdapter = new VibeCoderHandlerAdapter(stepInstance, {
          ...metadata,
          type: type
        });
        this.registerHandler(type, handlerAdapter, metadata);
      }

      console.log(`HandlerRegistry: Registered ${analysisSteps.length} analysis steps and ${vibecoderSteps.length} VibeCoder steps`);
    } catch (error) {
      console.error('HandlerRegistry: Failed to register default analysis steps:', error.message);
    }
  }

  /**
   * Import registry state
   * @param {Object} state - Registry state
   * @returns {boolean} True if import successful
   */
  importState(state) {
    try {
      if (state.options) {
        this.options = { ...this.options, ...state.options };
      }

      // Note: This is a basic import. In a real implementation,
      // you would need to reconstruct handler instances from the state.
      
      return true;
    } catch (error) {
      console.error('Registry state import failed:', error.message);
      return false;
    }
  }
}

module.exports = HandlerRegistry; 