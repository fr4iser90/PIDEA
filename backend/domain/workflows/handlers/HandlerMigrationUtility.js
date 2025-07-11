/**
 * HandlerMigrationUtility - Migration utilities for existing handlers
 * 
 * This class provides utilities for migrating existing handlers to the
 * unified handler system, including validation, testing, and rollback capabilities.
 */
const HandlerException = require('./exceptions/HandlerException');

class HandlerMigrationUtility {
  /**
   * Create a new handler migration utility
   * @param {Object} options - Migration options
   */
  constructor(options = {}) {
    this.migrationRegistry = new Map();
    this.migrationHistory = new Map();
    this.options = {
      enableValidation: options.enableValidation !== false,
      enableTesting: options.enableTesting !== false,
      enableRollback: options.enableRollback !== false,
      enableBackup: options.enableBackup !== false,
      maxMigrationAttempts: options.maxMigrationAttempts || 3,
      migrationTimeout: options.migrationTimeout || 30000, // 30 seconds
      ...options
    };
  }

  /**
   * Migrate existing handler to unified system
   * @param {string} handlerType - Handler type
   * @param {Object} handlerConfig - Handler configuration
   * @returns {Promise<Object>} Migration result
   */
  async migrateHandler(handlerType, handlerConfig) {
    const migrationId = this.generateMigrationId();
    const startTime = Date.now();
    
    try {
      console.log('HandlerMigrationUtility: Starting handler migration', {
        migrationId,
        handlerType,
        handlerConfig
      });

      // Create migration plan
      const migrationPlan = this.createMigrationPlan(handlerType, handlerConfig);
      
      // Execute migration steps
      const results = [];
      for (const step of migrationPlan.steps) {
        const stepResult = await this.executeMigrationStep(step);
        results.push(stepResult);
        
        if (!stepResult.success) {
          throw new Error(`Migration step failed: ${stepResult.error}`);
        }
      }
      
      // Register migrated handler
      const migratedHandler = await this.registerMigratedHandler(handlerType, handlerConfig);
      
      const duration = Date.now() - startTime;
      
      const result = {
        success: true,
        migrationId,
        handlerType,
        duration,
        results,
        migratedHandler: migratedHandler.getMetadata()
      };
      
      // Record migration history
      this.migrationHistory.set(migrationId, result);
      
      console.log('HandlerMigrationUtility: Handler migration completed successfully', {
        migrationId,
        handlerType,
        duration
      });
      
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      console.error('HandlerMigrationUtility: Handler migration failed', {
        migrationId,
        handlerType,
        error: error.message,
        duration
      });
      
      return {
        success: false,
        migrationId,
        handlerType,
        error: error.message,
        duration
      };
    }
  }

  /**
   * Create migration plan
   * @param {string} handlerType - Handler type
   * @param {Object} handlerConfig - Handler configuration
   * @returns {Object} Migration plan
   */
  createMigrationPlan(handlerType, handlerConfig) {
    const steps = [
      {
        name: 'validate_handler',
        description: 'Validate existing handler',
        execute: () => this.validateExistingHandler(handlerType, handlerConfig)
      },
      {
        name: 'create_backup',
        description: 'Create handler backup',
        execute: () => this.createHandlerBackup(handlerType, handlerConfig)
      },
      {
        name: 'create_adapter',
        description: 'Create handler adapter',
        execute: () => this.createHandlerAdapter(handlerType, handlerConfig)
      },
      {
        name: 'test_migration',
        description: 'Test migrated handler',
        execute: () => this.testMigratedHandler(handlerType, handlerConfig)
      },
      {
        name: 'register_handler',
        description: 'Register migrated handler',
        execute: () => this.registerMigratedHandler(handlerType, handlerConfig)
      }
    ];
    
    return {
      handlerType,
      steps,
      estimatedDuration: steps.length * 5000 // 5 seconds per step
    };
  }

  /**
   * Execute migration step
   * @param {Object} step - Migration step
   * @returns {Promise<Object>} Step result
   */
  async executeMigrationStep(step) {
    const startTime = Date.now();
    
    try {
      const result = await step.execute();
      
      return {
        success: true,
        stepName: step.name,
        description: step.description,
        result,
        duration: Date.now() - startTime
      };
      
    } catch (error) {
      return {
        success: false,
        stepName: step.name,
        description: step.description,
        error: error.message,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Validate existing handler
   * @param {string} handlerType - Handler type
   * @param {Object} handlerConfig - Handler configuration
   * @returns {Promise<Object>} Validation result
   */
  async validateExistingHandler(handlerType, handlerConfig) {
    if (!this.options.enableValidation) {
      return { validated: true, reason: 'Validation disabled' };
    }

    try {
      // Check if handler class exists
      const handlerClass = this.loadHandlerClass(handlerType);
      if (!handlerClass) {
        throw new Error(`Handler class not found: ${handlerType}`);
      }

      // Check if handler has required methods
      const handler = new handlerClass();
      const requiredMethods = ['handle'];
      const missingMethods = requiredMethods.filter(method => typeof handler[method] !== 'function');

      if (missingMethods.length > 0) {
        throw new Error(`Handler missing required methods: ${missingMethods.join(', ')}`);
      }

      // Validate handler configuration
      const configValidation = this.validateHandlerConfig(handlerConfig);
      if (!configValidation.isValid) {
        throw new Error(`Handler configuration invalid: ${configValidation.errors.join(', ')}`);
      }

      return {
        validated: true,
        handlerClass: handlerClass.name,
        methods: Object.getOwnPropertyNames(handlerClass.prototype),
        config: configValidation
      };

    } catch (error) {
      throw new HandlerException.validationError(
        `Handler validation failed: ${error.message}`,
        { handlerType, handlerConfig }
      );
    }
  }

  /**
   * Create handler backup
   * @param {string} handlerType - Handler type
   * @param {Object} handlerConfig - Handler configuration
   * @returns {Promise<Object>} Backup result
   */
  async createHandlerBackup(handlerType, handlerConfig) {
    if (!this.options.enableBackup) {
      return { backedUp: true, reason: 'Backup disabled' };
    }

    try {
      const backupId = this.generateBackupId();
      const backupData = {
        id: backupId,
        handlerType,
        handlerConfig,
        timestamp: new Date(),
        originalHandler: this.loadHandlerClass(handlerType)
      };

      // Store backup
      this.migrationRegistry.set(backupId, backupData);

      return {
        backedUp: true,
        backupId,
        timestamp: backupData.timestamp
      };

    } catch (error) {
      throw new HandlerException.migrationError(
        `Handler backup failed: ${error.message}`,
        { handlerType, handlerConfig }
      );
    }
  }

  /**
   * Create handler adapter
   * @param {string} handlerType - Handler type
   * @param {Object} handlerConfig - Handler configuration
   * @returns {Promise<Object>} Adapter creation result
   */
  async createHandlerAdapter(handlerType, handlerConfig) {
    try {
      // Determine adapter type based on handler characteristics
      const adapterType = this.determineAdapterType(handlerType, handlerConfig);
      
      // Create adapter instance
      const adapter = this.createAdapterInstance(adapterType, handlerConfig);
      
      // Test adapter
      const adapterTest = await this.testAdapter(adapter, handlerType);
      if (!adapterTest.success) {
        throw new Error(`Adapter test failed: ${adapterTest.error}`);
      }

      return {
        adapterCreated: true,
        adapterType,
        adapter: adapter.getMetadata(),
        testResult: adapterTest
      };

    } catch (error) {
      throw new HandlerException.migrationError(
        `Handler adapter creation failed: ${error.message}`,
        { handlerType, handlerConfig }
      );
    }
  }

  /**
   * Test migrated handler
   * @param {string} handlerType - Handler type
   * @param {Object} handlerConfig - Handler configuration
   * @returns {Promise<Object>} Test result
   */
  async testMigratedHandler(handlerType, handlerConfig) {
    if (!this.options.enableTesting) {
      return { tested: true, reason: 'Testing disabled' };
    }

    try {
      // Create test request
      const testRequest = this.createTestRequest(handlerType, handlerConfig);
      
      // Execute test
      const testResult = await this.executeHandlerTest(handlerType, testRequest);
      
      // Validate test result
      const validationResult = this.validateTestResult(testResult);
      if (!validationResult.isValid) {
        throw new Error(`Test validation failed: ${validationResult.errors.join(', ')}`);
      }

      return {
        tested: true,
        testRequest,
        testResult,
        validation: validationResult
      };

    } catch (error) {
      throw new HandlerException.migrationError(
        `Handler test failed: ${error.message}`,
        { handlerType, handlerConfig }
      );
    }
  }

  /**
   * Register migrated handler
   * @param {string} handlerType - Handler type
   * @param {Object} handlerConfig - Handler configuration
   * @returns {Promise<Object>} Registration result
   */
  async registerMigratedHandler(handlerType, handlerConfig) {
    try {
      // Create unified handler
      const unifiedHandler = this.createUnifiedHandler(handlerType, handlerConfig);
      
      // Register with registry
      const registrationResult = await this.registerHandler(handlerType, unifiedHandler);
      
      if (!registrationResult.success) {
        throw new Error(`Handler registration failed: ${registrationResult.error}`);
      }

      return unifiedHandler;

    } catch (error) {
      throw new HandlerException.migrationError(
        `Handler registration failed: ${error.message}`,
        { handlerType, handlerConfig }
      );
    }
  }

  /**
   * Load handler class
   * @param {string} handlerType - Handler type
   * @returns {Function|null} Handler class
   */
  loadHandlerClass(handlerType) {
    try {
      // Map handler types to class paths
      const handlerMap = {
        'analyze_architecture': require('@/application/handlers/analyze/AnalyzeArchitectureHandler'),
        'analyze_code_quality': require('@/application/handlers/analyze/AnalyzeCodeQualityHandler'),
        'analyze_tech_stack': require('@/application/handlers/analyze/AnalyzeTechStackHandler'),
        'analyze_repo_structure': require('@/application/handlers/analyze/AnalyzeRepoStructureHandler'),
        'analyze_dependencies': require('@/application/handlers/analyze/AnalyzeDependenciesHandler'),
        'vibecoder_analyze': require('@/application/handlers/vibecoder/VibeCoderAnalyzeHandler'),
        'vibecoder_generate': require('@/application/handlers/vibecoder/VibeCoderGenerateHandler'),
        'vibecoder_refactor': require('@/application/handlers/vibecoder/VibeCoderRefactorHandler'),
        'vibecoder_mode': require('@/application/handlers/vibecoder/VibeCoderModeHandler'),
        'generate_script': require('@/application/handlers/generate/GenerateScriptHandler'),
        'generate_scripts': require('@/application/handlers/generate/GenerateScriptsHandler'),
        'auto_test_fix': require('@/application/handlers/AutoTestFixHandler'),
        'test_correction': require('@/application/handlers/TestCorrectionHandler')
      };
      
      return handlerMap[handlerType] || null;
    } catch (error) {
      console.warn(`Failed to load handler class ${handlerType}:`, error.message);
      return null;
    }
  }

  /**
   * Validate handler configuration
   * @param {Object} handlerConfig - Handler configuration
   * @returns {Object} Validation result
   */
  validateHandlerConfig(handlerConfig) {
    const errors = [];
    const warnings = [];

    if (!handlerConfig) {
      errors.push('Handler configuration is required');
    } else {
      // Add specific validation rules based on handler type
      if (handlerConfig.dependencies && !Array.isArray(handlerConfig.dependencies)) {
        errors.push('Dependencies must be an array');
      }

      if (handlerConfig.options && typeof handlerConfig.options !== 'object') {
        errors.push('Options must be an object');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Determine adapter type
   * @param {string} handlerType - Handler type
   * @param {Object} handlerConfig - Handler configuration
   * @returns {string} Adapter type
   */
  determineAdapterType(handlerType, handlerConfig) {
    // Determine adapter type based on handler characteristics
    if (handlerConfig.commandBased) {
      return 'command';
    } else if (handlerConfig.serviceBased) {
      return 'service';
    } else {
      return 'legacy';
    }
  }

  /**
   * Create adapter instance
   * @param {string} adapterType - Adapter type
   * @param {Object} handlerConfig - Handler configuration
   * @returns {Object} Adapter instance
   */
  createAdapterInstance(adapterType, handlerConfig) {
    const adapterClasses = {
      'legacy': require('./adapters/LegacyHandlerAdapter'),
      'command': require('./adapters/CommandHandlerAdapter'),
      'service': require('./adapters/ServiceHandlerAdapter')
    };

    const AdapterClass = adapterClasses[adapterType];
    if (!AdapterClass) {
      throw new Error(`Unknown adapter type: ${adapterType}`);
    }

    return new AdapterClass(handlerConfig);
  }

  /**
   * Test adapter
   * @param {Object} adapter - Adapter instance
   * @param {string} handlerType - Handler type
   * @returns {Promise<Object>} Test result
   */
  async testAdapter(adapter, handlerType) {
    try {
      // Test adapter interface
      const requiredMethods = ['createHandler', 'canHandle', 'getMetadata'];
      const missingMethods = requiredMethods.filter(method => typeof adapter[method] !== 'function');

      if (missingMethods.length > 0) {
        throw new Error(`Adapter missing required methods: ${missingMethods.join(', ')}`);
      }

      // Test adapter metadata
      const metadata = adapter.getMetadata();
      if (!metadata || typeof metadata !== 'object') {
        throw new Error('Adapter metadata is invalid');
      }

      // Test adapter can handle the handler type
      const testRequest = { type: handlerType };
      const canHandle = adapter.canHandle(testRequest);
      if (!canHandle) {
        throw new Error(`Adapter cannot handle handler type: ${handlerType}`);
      }

      return {
        success: true,
        metadata,
        canHandle
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create test request
   * @param {string} handlerType - Handler type
   * @param {Object} handlerConfig - Handler configuration
   * @returns {Object} Test request
   */
  createTestRequest(handlerType, handlerConfig) {
    return {
      type: handlerType,
      test: true,
      timestamp: new Date(),
      config: handlerConfig
    };
  }

  /**
   * Execute handler test
   * @param {string} handlerType - Handler type
   * @param {Object} testRequest - Test request
   * @returns {Promise<Object>} Test result
   */
  async executeHandlerTest(handlerType, testRequest) {
    try {
      // Load original handler
      const handlerClass = this.loadHandlerClass(handlerType);
      if (!handlerClass) {
        throw new Error(`Handler class not found: ${handlerType}`);
      }

      // Create handler instance
      const handler = new handlerClass();
      
      // Execute test
      const result = await handler.handle(testRequest, {});
      
      return {
        success: true,
        result,
        duration: Date.now() - testRequest.timestamp.getTime()
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Validate test result
   * @param {Object} testResult - Test result
   * @returns {Object} Validation result
   */
  validateTestResult(testResult) {
    const errors = [];
    const warnings = [];

    if (!testResult.success) {
      errors.push(`Test execution failed: ${testResult.error}`);
    } else {
      if (testResult.duration > 10000) { // 10 seconds
        warnings.push('Test execution time is high');
      }

      if (!testResult.result) {
        warnings.push('Test result is empty');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Create unified handler
   * @param {string} handlerType - Handler type
   * @param {Object} handlerConfig - Handler configuration
   * @returns {Object} Unified handler
   */
  createUnifiedHandler(handlerType, handlerConfig) {
    // This would create a unified handler wrapper
    // For now, return a mock unified handler
    return {
      getMetadata: () => ({
        name: `Unified_${handlerType}`,
        description: `Unified handler for ${handlerType}`,
        type: 'unified',
        version: '1.0.0',
        originalType: handlerType
      }),
      execute: async (context) => {
        // Execute the original handler through adapter
        const handlerClass = this.loadHandlerClass(handlerType);
        const handler = new handlerClass();
        return await handler.handle(context.getRequest(), context.getResponse());
      }
    };
  }

  /**
   * Register handler
   * @param {string} handlerType - Handler type
   * @param {Object} handler - Handler instance
   * @returns {Promise<Object>} Registration result
   */
  async registerHandler(handlerType, handler) {
    try {
      // This would register the handler with the unified system
      // For now, return success
      return {
        success: true,
        handlerType,
        registered: true
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate migration ID
   * @returns {string} Migration ID
   */
  generateMigrationId() {
    return `migration_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate backup ID
   * @returns {string} Backup ID
   */
  generateBackupId() {
    return `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get migration history
   * @returns {Array<Object>} Migration history
   */
  getMigrationHistory() {
    return Array.from(this.migrationHistory.values());
  }

  /**
   * Get migration statistics
   * @returns {Object} Migration statistics
   */
  getMigrationStatistics() {
    const history = this.getMigrationHistory();
    const successful = history.filter(m => m.success).length;
    const failed = history.filter(m => !m.success).length;
    const total = history.length;
    
    return {
      total,
      successful,
      failed,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      averageDuration: total > 0 ? 
        history.reduce((sum, m) => sum + m.duration, 0) / total : 0
    };
  }

  /**
   * Rollback migration
   * @param {string} migrationId - Migration ID
   * @returns {Promise<Object>} Rollback result
   */
  async rollbackMigration(migrationId) {
    if (!this.options.enableRollback) {
      return { rolledBack: false, reason: 'Rollback disabled' };
    }

    try {
      const migration = this.migrationHistory.get(migrationId);
      if (!migration) {
        throw new Error(`Migration not found: ${migrationId}`);
      }

      // Restore from backup
      const backup = this.migrationRegistry.get(migrationId);
      if (backup) {
        // Restore original handler
        // This would involve restoring the original handler configuration
        return {
          rolledBack: true,
          migrationId,
          restored: true
        };
      }

      return {
        rolledBack: false,
        reason: 'No backup available'
      };

    } catch (error) {
      return {
        rolledBack: false,
        error: error.message
      };
    }
  }
}

module.exports = HandlerMigrationUtility; 