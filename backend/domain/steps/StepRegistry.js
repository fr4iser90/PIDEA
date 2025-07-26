
/**
 * Step Registry - Domain Layer
 * Manages atomic steps and provides step validation
 * Implements IStandardRegistry interface for consistent patterns
 * Enhanced with parallel execution support for performance optimization
 */

require('module-alias/register');
const path = require('path');
const fs = require('fs').promises;
const { STANDARD_CATEGORIES, isValidCategory, getDefaultCategory } = require('../constants/Categories');
const IStandardRegistry = require('../interfaces/IStandardRegistry');
const ServiceLogger = require('@logging/ServiceLogger');
const StepClassifier = require('./execution/StepClassifier');
const ParallelExecutionEngine = require('./execution/ParallelExecutionEngine');

class StepRegistry {
  constructor(serviceRegistry = null) {
    this.steps = new Map();
    this.categories = new Map();
    this.executors = new Map();
    this.logger = new ServiceLogger('StepRegistry');
    this.serviceRegistry = serviceRegistry;
    
    // Initialize parallel execution components
    this.stepClassifier = new StepClassifier({ logger: this.logger });
    this.parallelEngine = new ParallelExecutionEngine({ 
      logger: this.logger,
      stepRegistry: this
    });
    
    // Execution statistics
    this.executionStats = {
      totalExecutions: 0,
      sequentialExecutions: 0,
      parallelExecutions: 0,
      totalExecutionTime: 0,
      averageExecutionTime: 0
    };
  }

  /**
   * Register an atomic step
   * @param {string} name - Step name
   * @param {Object} config - Step configuration
   * @param {string} category - Step category
   * @param {Function} executor - Step execution function
   */
  async registerStep(name, config, category = null, executor = null) {
    try {
      // Use default category if not provided
      const finalCategory = category || getDefaultCategory('step');
      
      // Validate category
      if (!isValidCategory(finalCategory)) {
        throw new Error(`Invalid category: ${finalCategory}. Valid categories: ${Object.values(STANDARD_CATEGORIES).join(', ')}`);
      }
      
      // Validate step configuration
      this.validateStepConfig(config);
      
      // Store step configuration
      this.steps.set(name, {
        name,
        config,
        category: finalCategory,
        executor,
        registeredAt: new Date(),
        status: 'active',
        executionCount: 0,
        lastExecuted: null,
        metadata: {
          type: 'step',
          category: finalCategory,
          version: config.version || '1.0.0'
        }
      });

      // Add to category
      if (!this.categories.has(finalCategory)) {
        this.categories.set(finalCategory, new Set());
      }
      this.categories.get(finalCategory).add(name);

      // Store executor if provided
      if (executor && typeof executor === 'function') {
              this.executors.set(name, executor);
    }

    return true;
    } catch (error) {
      this.logger.error(`❌ Failed to register step "${name}":`, error.message);
      throw error;
    }
  }

  /**
   * Load steps from categories directory
   */
  async loadStepsFromCategories() {
    try {
      const categoriesDir = path.join(__dirname, 'categories');
      
      // Check if categories directory exists
      try {
        await fs.access(categoriesDir);
      } catch {
        this.logger.info('📁 Categories directory not found, trying alternative path...');
        // Try alternative path for development
        const altCategoriesDir = path.join(process.cwd(), 'domain', 'steps', 'categories');
        try {
          await fs.access(altCategoriesDir);
          this.logger.info('📁 Found categories in alternative path');
          const categories = await fs.readdir(altCategoriesDir);
          
          for (const category of categories) {
            const categoryPath = path.join(altCategoriesDir, category);
            const categoryStats = await fs.stat(categoryPath);
            
            if (categoryStats.isDirectory()) {
              await this.loadStepsFromCategory(category, categoryPath);
            }
          }
          
          this.logger.info(`📦 Loaded ${this.steps.size} steps from alternative categories path`);
          return;
        } catch {
          this.logger.info('📁 Creating categories directory...');
          await fs.mkdir(categoriesDir, { recursive: true });
          return;
        }
      }

      const categories = await fs.readdir(categoriesDir);
      
      for (const category of categories) {
        const categoryPath = path.join(categoriesDir, category);
        const categoryStats = await fs.stat(categoryPath);
        
        if (categoryStats.isDirectory()) {
          await this.loadStepsFromCategory(category, categoryPath);
        }
      }

      this.logger.info(`📦 Loaded ${this.steps.size} steps from categories`);
      
      // Log step summary in debug mode
      if (process.env.DEBUG_STEPS === 'true') {
        const categories = this.getCategories();
        for (const category of categories) {
          const steps = this.getStepsByCategory(category);
          this.logger.info(`  📁 ${category}: ${steps.length} steps`);
        }
      }
    } catch (error) {
      this.logger.error('❌ Failed to load steps from categories:', error.message);
      throw error;
    }
  }

  /**
   * Load steps from a specific category directory
   * @param {string} category - Category name
   * @param {string} categoryPath - Category directory path
   */
  async loadStepsFromCategory(category, categoryPath) {
    try {
      const files = await fs.readdir(categoryPath);
      const jsFiles = files.filter(file => file.endsWith('.js'));
      let loadedCount = 0;

      for (const file of jsFiles) {
        try {
          const stepPath = path.join(categoryPath, file);
          const stepModule = require(stepPath);
          
          const config = stepModule.config || {};
          const executor = stepModule.execute || null;
          const stepName = config.name || path.basename(file, '.js');
          
          await this.registerStep(stepName, config, category, executor);
          loadedCount++;
        } catch (error) {
          this.logger.error(`❌ Failed to load step "${file}" from category "${category}":`, error.message);
        }
      }
      
      // Log summary instead of individual steps
      this.logger.info(`📦 Loaded ${loadedCount} steps from category "${category}"`);
    } catch (error) {
      this.logger.error(`❌ Failed to load category "${category}":`, error.message);
    }
  }

  /**
   * Get step by name
   * @param {string} name - Step name (filename without .js)
   */
  getStep(name) {
    // Remove category prefix if present (e.g., "chat/get_chat_history_step" -> "get_chat_history_step")
    const stepName = name.includes('/') ? name.split('/').pop() : name;
    
    const step = this.steps.get(stepName);
    if (!step) {
      throw new Error(`Step "${stepName}" not found`);
    }
    return step;
  }

  /**
   * Get all steps in a category
   * @param {string} category - Step category
   */
  getStepsByCategory(category) {
    const stepNames = this.categories.get(category) || new Set();
    return Array.from(stepNames).map(name => this.getStep(name));
  }

  /**
   * Get all registered steps
   */
  getAllSteps() {
    return Array.from(this.steps.values());
  }

  /**
   * Get all categories
   */
  getCategories() {
    return Array.from(this.categories.keys());
  }

  /**
   * Execute a step
   * @param {string} name - Step name (filename without .js)
   * @param {Object} context - Execution context
   * @param {Object} options - Execution options
   */
  async executeStep(name, context = {}, options = {}) {
    try {
      const step = this.getStep(name);
      
      if (step.status !== 'active') {
        throw new Error(`Step "${step.name}" is not active (status: ${step.status})`);
      }

      // Get executor
      const executor = this.executors.get(step.name);
      if (!executor) {
        throw new Error(`No executor found for step "${step.name}"`);
      }

      // Enhance context with services from DI container
      const enhancedContext = this.enhanceContextWithServices(context);

      // Execute step
      this.logger.info(`🚀 Executing step "${step.name}"...`);
      const startTime = Date.now();
      
      const result = await executor(enhancedContext, options);
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Update step statistics
      step.executionCount++;
      step.lastExecuted = new Date();
      step.lastDuration = duration;

      this.logger.info(`✅ Step "${step.name}" executed successfully in ${duration}ms`);
      return {
        success: true,
        result,
        duration,
        step: step.name,
        timestamp: new Date(),
        executionMode: 'individual'
      };
    } catch (error) {
      this.logger.error(`❌ Failed to execute step "${name}":`, error.message);
      
      // Update step statistics
      const step = this.steps.get(name);
      if (step) {
        step.executionCount++;
        step.lastExecuted = new Date();
        step.lastError = error.message;
      }

      return {
        success: false,
        error: error.message,
        step: name,
        timestamp: new Date()
      };
    }
  }

  /**
   * Check if a step is a critical workflow step that requires sequential execution
   * @param {string} stepName - Step name
   * @param {Object} context - Execution context
   * @returns {boolean} True if critical workflow step
   */
  isCriticalWorkflowStep(stepName, context) {
    // Critical workflow steps that must be sequential
    const criticalSteps = [
      'IDESendMessageStep',
      'CreateChatStep', 
      'TaskExecutionStep',
      'WorkflowExecutionStep',
      'AnalysisExecutionStep',
      'RefactoringStep',
      'TestingStep',
      'DeploymentStep'
    ];
    
    // Check if step name contains critical keywords
    const isCriticalByName = criticalSteps.some(critical => 
      stepName.includes(critical) || stepName.toLowerCase().includes('workflow')
    );
    
    // Check if context indicates this is a workflow execution
    const isWorkflowContext = context.workflowId || 
                             context.taskId || 
                             context.analysisId ||
                             context.executionMode === 'workflow';
    
    return isCriticalByName || isWorkflowContext;
  }

  /**
   * Enhance context with services from DI container
   * @param {Object} context - Original context
   * @returns {Object} Enhanced context with services
   */
  enhanceContextWithServices(context) {
    const enhancedContext = { ...context };
    
    // Add getService method to context
    enhancedContext.getService = (serviceName) => {
      if (!this.serviceRegistry) {
        throw new Error(`Service "${serviceName}" not available - serviceRegistry not found`);
      }
      
      try {
        return this.serviceRegistry.getService(serviceName);
      } catch (error) {
        throw new Error(`Service "${serviceName}" not found in DI container: ${error.message}`);
      }
    };
    
    return enhancedContext;
  }

  /**
   * Execute multiple steps
   * @param {Array} stepNames - Array of step names
   * @param {Object} context - Execution context
   * @param {Object} options - Execution options
   */
  async executeSteps(stepNames, context = {}, options = {}) {
    try {
      this.logger.info('Starting step execution with parallel support', {
        totalSteps: stepNames.length,
        context: this.getContextSummary(context)
      });

      const startTime = Date.now();

      // 1. Classify steps
      const { critical, nonCritical } = this.stepClassifier.classifySteps(stepNames, context);

      const results = {
        successful: [],
        failed: [],
        total: stepNames.length,
        critical: { successful: [], failed: [] },
        parallel: { successful: [], failed: [] },
        executionMode: 'hybrid',
        classification: {
          criticalCount: critical.length,
          nonCriticalCount: nonCritical.length,
          parallelizationRatio: nonCritical.length / stepNames.length
        }
      };

      // 2. Execute critical steps sequentially
      if (critical.length > 0) {
        this.logger.info(`Executing ${critical.length} critical steps sequentially`);
        const criticalResults = await this.executeStepsSequential(critical, context, options);
        results.critical = criticalResults;
        results.successful.push(...criticalResults.successful);
        results.failed.push(...criticalResults.failed);
        this.executionStats.sequentialExecutions += critical.length;
      }

      // 3. Execute non-critical steps in parallel
      if (nonCritical.length > 0) {
        this.logger.info(`Executing ${nonCritical.length} non-critical steps in parallel`);
        const parallelResults = await this.parallelEngine.executeStepsParallel(nonCritical, context, options);
        
        // Process parallel results
        parallelResults.forEach(result => {
          if (result.success) {
            results.parallel.successful.push(result);
            results.successful.push(result);
          } else {
            results.parallel.failed.push(result);
            results.failed.push(result);
          }
        });
        
        this.executionStats.parallelExecutions += nonCritical.length;
      }

      const endTime = Date.now();
      const totalDuration = endTime - startTime;

      // Update execution statistics
      this.updateExecutionStatistics(totalDuration);

      this.logger.info('Step execution completed', {
        total: results.total,
        successful: results.successful.length,
        failed: results.failed.length,
        criticalSuccessful: results.critical.successful.length,
        parallelSuccessful: results.parallel.successful.length,
        totalDuration: `${totalDuration}ms`,
        parallelizationRatio: `${(results.classification.parallelizationRatio * 100).toFixed(1)}%`
      });

      return results;

    } catch (error) {
      this.logger.error('Step execution failed:', error.message);
      
      // Fallback to sequential execution
      this.logger.warn('Falling back to sequential execution due to error');
      return await this.executeStepsSequential(stepNames, context, options);
    }
  }

  /**
   * Execute steps sequentially (fallback method)
   * @param {Array<string>} stepNames - Array of step names
   * @param {Object} context - Execution context
   * @param {Object} options - Execution options
   * @returns {Object} Execution results
   */
  async executeStepsSequential(stepNames, context = {}, options = {}) {
    const results = {
      successful: [],
      failed: [],
      total: stepNames.length,
      executionMode: 'sequential'
    };

    for (const stepName of stepNames) {
      try {
        const result = await this.executeStep(stepName, context, options);
        
        if (result.success) {
          results.successful.push(result);
        } else {
          results.failed.push(result);
        }

        // Stop on first failure if configured
        if (!result.success && options.stopOnError) {
          break;
        }
      } catch (error) {
        results.failed.push({
          success: false,
          error: error.message,
          step: stepName,
          timestamp: new Date(),
          executionMode: 'sequential'
        });

        if (options.stopOnError) {
          break;
        }
      }
    }

    return results;
  }

  /**
   * Update execution statistics
   * @param {number} duration - Execution duration
   */
  updateExecutionStatistics(duration) {
    this.executionStats.totalExecutions++;
    this.executionStats.totalExecutionTime += duration;
    
    if (this.executionStats.totalExecutions > 0) {
      this.executionStats.averageExecutionTime = Math.round(
        this.executionStats.totalExecutionTime / this.executionStats.totalExecutions
      );
    }
  }

  /**
   * Get context summary for logging
   * @param {Object} context - Execution context
   * @returns {Object} Context summary
   */
  getContextSummary(context) {
    return {
      hasUserId: !!context.userId,
      hasProjectId: !!context.projectId,
      hasWorkflowId: !!context.workflowId,
      hasTaskId: !!context.taskId,
      executionMode: context.executionMode,
      priority: context.priority
    };
  }

  /**
   * Get execution statistics
   * @returns {Object} Execution statistics
   */
  getExecutionStatistics() {
    return {
      ...this.executionStats,
      parallelizationRatio: this.executionStats.totalExecutions > 0 
        ? (this.executionStats.parallelExecutions / this.executionStats.totalExecutions * 100).toFixed(2) + '%'
        : '0%',
      sequentialRatio: this.executionStats.totalExecutions > 0 
        ? (this.executionStats.sequentialExecutions / this.executionStats.totalExecutions * 100).toFixed(2) + '%'
        : '0%'
    };
  }

  /**
   * Reset execution statistics
   */
  resetExecutionStatistics() {
    this.executionStats = {
      totalExecutions: 0,
      sequentialExecutions: 0,
      parallelExecutions: 0,
      totalExecutionTime: 0,
      averageExecutionTime: 0
    };
    
    this.logger.info('StepRegistry execution statistics reset');
  }

  /**
   * Update step configuration
   * @param {string} name - Step name
   * @param {Object} newConfig - New configuration
   */
  async updateStep(name, newConfig) {
    const step = this.getStep(name);
    
    // Validate new configuration
    this.validateStepConfig(newConfig);
    
    // Update step
    step.config = { ...step.config, ...newConfig };
    step.updatedAt = new Date();
    
    this.logger.info(`✅ Step "${name}" updated successfully`);
    return step;
  }

  /**
   * Remove step
   * @param {string} name - Step name
   */
  removeStep(name) {
    const step = this.getStep(name);
    
    // Remove from steps map
    this.steps.delete(name);
    
    // Remove from category
    const category = step.category;
    if (this.categories.has(category)) {
      this.categories.get(category).delete(name);
      
      // Remove empty category
      if (this.categories.get(category).size === 0) {
        this.categories.delete(category);
      }
    }
    
    // Remove executor
    this.executors.delete(name);
    
    this.logger.info(`🗑️ Step "${name}" removed successfully`);
    return true;
  }

  /**
   * Validate step configuration
   * @param {Object} config - Step configuration
   */
  validateStepConfig(config) {
    if (!config || typeof config !== 'object') {
      throw new Error('Step configuration must be an object');
    }

    if (!config.name) {
      throw new Error('Step configuration must have a "name" property');
    }

    if (!config.description) {
      throw new Error('Step configuration must have a "description" property');
    }

    if (!config.type) {
      throw new Error('Step configuration must have a "type" property');
    }

    return true;
  }

  /**
   * Check if step exists
   * @param {string} name - Step name
   */
  hasStep(name) {
    return this.steps.has(name);
  }

  /**
   * Get step status
   * @param {string} name - Step name
   */
  getStepStatus(name) {
    const step = this.getStep(name);
    return step.status;
  }

  /**
   * Set step status
   * @param {string} name - Step name
   * @param {string} status - New status
   */
  setStepStatus(name, status) {
    const step = this.getStep(name);
    step.status = status;
    step.updatedAt = new Date();
    
    this.logger.info(`✅ Step "${name}" status set to "${status}"`);
    return step;
  }

  /**
   * Get step statistics
   * @param {string} name - Step name
   */
  getStepStats(name) {
    const step = this.getStep(name);
    return {
      name: step.name,
      category: step.category,
      executionCount: step.executionCount,
      lastExecuted: step.lastExecuted,
      lastDuration: step.lastDuration,
      lastError: step.lastError,
      status: step.status
    };
  }

  /**
   * Get registry statistics
   */
  getStats() {
    return {
      totalSteps: this.steps.size,
      categories: this.categories.size,
      activeSteps: Array.from(this.steps.values()).filter(s => s.status === 'active').length,
      inactiveSteps: Array.from(this.steps.values()).filter(s => s.status === 'inactive').length,
      totalExecutions: Array.from(this.steps.values()).reduce((sum, step) => sum + step.executionCount, 0)
    };
  }

  // ==================== IStandardRegistry Interface Implementation ====================

  /**
   * Get component by category (IStandardRegistry interface)
   * @param {string} category - Component category
   * @returns {Array} Components in category
   */
  static getByCategory(category) {
    const instance = new StepRegistry();
    return instance.getStepsByCategory(category);
  }

  /**
   * Build component from category (IStandardRegistry interface)
   * @param {string} category - Component category
   * @param {string} name - Component name
   * @param {Object} params - Component parameters
   * @returns {Object|null} Component instance
   */
  static buildFromCategory(category, name, params = {}) {
    const instance = new StepRegistry();
    const steps = instance.getStepsByCategory(category);
    return steps.find(s => s.name === name) || null;
  }

  /**
   * Register component (IStandardRegistry interface)
   * @param {string} name - Component name
   * @param {Object} config - Component configuration
   * @param {string} category - Component category
   * @param {Function} executor - Component executor (optional)
   * @returns {Promise<boolean>} Registration success
   */
  static async register(name, config, category, executor = null) {
    const instance = new StepRegistry();
    return await instance.registerStep(name, config, category, executor);
  }

  /**
   * Execute component (IStandardRegistry interface)
   * @param {string} name - Component name
   * @param {Object} context - Execution context
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Execution result
   */
  static async execute(name, context = {}, options = {}) {
    const instance = new StepRegistry();
    return await instance.executeStep(name, context, options);
  }

  /**
   * Get all categories (IStandardRegistry interface)
   * @returns {Array} All available categories
   */
  static getCategories() {
    const instance = new StepRegistry();
    return instance.getCategories();
  }

  /**
   * Get component by name (IStandardRegistry interface)
   * @param {string} name - Component name
   * @returns {Object} Component instance
   */
  static get(name) {
    const instance = new StepRegistry();
    return instance.getStep(name);
  }

  /**
   * Check if component exists (IStandardRegistry interface)
   * @param {string} name - Component name
   * @returns {boolean} True if exists
   */
  static has(name) {
    const instance = new StepRegistry();
    return instance.hasStep(name);
  }

  /**
   * Remove component (IStandardRegistry interface)
   * @param {string} name - Component name
   * @returns {boolean} Removal success
   */
  static remove(name) {
    const instance = new StepRegistry();
    return instance.removeStep(name);
  }

  /**
   * Validate component configuration (IStandardRegistry interface)
   * @param {Object} config - Component configuration
   * @returns {Object} Validation result
   */
  static validateConfig(config) {
    const instance = new StepRegistry();
    try {
      instance.validateStepConfig(config);
      return { isValid: true, errors: [] };
    } catch (error) {
      return { isValid: false, errors: [error.message] };
    }
  }

  /**
   * Get component metadata (IStandardRegistry interface)
   * @param {string} name - Component name
   * @returns {Object} Component metadata
   */
  static getMetadata(name) {
    const instance = new StepRegistry();
    const step = instance.getStep(name);
    return step.metadata || {};
  }

  /**
   * Update component metadata (IStandardRegistry interface)
   * @param {string} name - Component name
   * @param {Object} metadata - New metadata
   * @returns {boolean} Update success
   */
  static updateMetadata(name, metadata) {
    const instance = new StepRegistry();
    const step = instance.getStep(name);
    step.metadata = { ...step.metadata, ...metadata };
    step.updatedAt = new Date();
    return true;
  }

  /**
   * Get component execution history (IStandardRegistry interface)
   * @param {string} name - Component name
   * @returns {Array} Execution history
   */
  static getExecutionHistory(name) {
    const instance = new StepRegistry();
    const step = instance.getStep(name);
    return [{
      step: step.name,
      executionCount: step.executionCount,
      lastExecuted: step.lastExecuted,
      lastDuration: step.lastDuration,
      lastError: step.lastError
    }];
  }

  /**
   * Clear registry (IStandardRegistry interface)
   * @returns {boolean} Clear success
   */
  static clear() {
    const instance = new StepRegistry();
    instance.steps.clear();
    instance.categories.clear();
    instance.executors.clear();
    return true;
  }

  /**
   * Export registry data (IStandardRegistry interface)
   * @returns {Object} Registry data
   */
  static export() {
    const instance = new StepRegistry();
    return {
      steps: Array.from(instance.steps.entries()),
      categories: Array.from(instance.categories.entries()),
      executors: Array.from(instance.executors.keys())
    };
  }

  /**
   * Import registry data (IStandardRegistry interface)
   * @param {Object} data - Registry data
   * @returns {boolean} Import success
   */
  static import(data) {
    const instance = new StepRegistry();
    
    if (data.steps) {
      data.steps.forEach(([name, step]) => {
        instance.steps.set(name, step);
      });
    }
    
    if (data.categories) {
      data.categories.forEach(([category, names]) => {
        instance.categories.set(category, new Set(names));
      });
    }
    
    if (data.executors) {
      data.executors.forEach(name => {
        // Note: Executors would need to be re-registered
        this.logger.warn(`Executor for step "${name}" needs to be re-registered`);
      });
    }
    
    return true;
  }
}

module.exports = StepRegistry; 