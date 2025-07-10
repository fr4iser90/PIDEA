# Unified Workflow Performance 3B: Unified Handler System

## 1. Project Overview
- **Feature/Component Name**: Unified Handler System
- **Priority**: High
- **Estimated Time**: 80 hours (2 weeks)
- **Dependencies**: Foundation 1A (Core Interfaces & Context), Foundation 1B (Builder Pattern & Common Steps), Automation 2A (Automation Level System), Automation 2B (Enhanced Git Integration), Performance 3A (Sequential Workflow Optimization)
- **Related Issues**: Fragmented handlers, code duplication, inconsistent patterns, limited reusability

## 2. Technical Requirements
- **Tech Stack**: Node.js, JavaScript ES6+, Domain-Driven Design, Handler patterns
- **Architecture Pattern**: DDD with unified handler system
- **Database Changes**: None (uses existing infrastructure)
- **API Changes**: New unified handler endpoints
- **Frontend Changes**: None (backend system)
- **Backend Changes**: Unified handler system and migration utilities

## 3. Implementation Files

#### Files to Create:
- [ ] `backend/domain/workflows/handlers/UnifiedWorkflowHandler.js` - Main unified workflow handler
- [ ] `backend/domain/workflows/handlers/WorkflowStepHandler.js` - Individual step handler
- [ ] `backend/domain/workflows/handlers/HandlerRegistry.js` - Handler registry and management
- [ ] `backend/domain/workflows/handlers/HandlerFactory.js` - Handler factory
- [ ] `backend/domain/workflows/handlers/HandlerContext.js` - Handler context
- [ ] `backend/domain/workflows/handlers/HandlerResult.js` - Handler result
- [ ] `backend/domain/workflows/handlers/HandlerValidator.js` - Handler validation
- [ ] `backend/domain/workflows/handlers/HandlerMetrics.js` - Handler metrics
- [ ] `backend/domain/workflows/handlers/HandlerAudit.js` - Handler audit
- [ ] `backend/domain/workflows/handlers/HandlerOptimizer.js` - Handler optimization
- [ ] `backend/domain/workflows/handlers/adapters/LegacyHandlerAdapter.js` - Legacy handler adapter
- [ ] `backend/domain/workflows/handlers/adapters/CommandHandlerAdapter.js` - Command handler adapter
- [ ] `backend/domain/workflows/handlers/adapters/ServiceHandlerAdapter.js` - Service handler adapter
- [ ] `backend/domain/workflows/handlers/exceptions/HandlerException.js` - Handler exceptions
- [ ] `backend/domain/workflows/handlers/index.js` - Module exports

#### Files to Modify:
- [ ] `backend/application/handlers/AnalyzeArchitectureHandler.js` - Migrate to unified handler
- [ ] `backend/application/handlers/VibeCoderAnalyzeHandler.js` - Migrate to unified handler
- [ ] `backend/application/handlers/GenerateScriptHandler.js` - Migrate to unified handler
- [ ] `backend/application/handlers/AutoTestFixHandler.js` - Migrate to unified handler
- [ ] `backend/application/handlers/AutoRefactorCommand.js` - Migrate to unified handler
- [ ] `backend/domain/services/WorkflowOrchestrationService.js` - Use unified handlers
- [ ] `backend/domain/services/TaskService.js` - Use unified handlers

## 4. Implementation Phases

#### Phase 1: Core Handler System (30 hours)
- [ ] Implement UnifiedWorkflowHandler with workflow orchestration
- [ ] Create WorkflowStepHandler with individual step handling
- [ ] Implement HandlerRegistry with handler management
- [ ] Create HandlerFactory with handler creation
- [ ] Add HandlerContext with handler execution context

#### Phase 2: Adapters & Migration (30 hours)
- [ ] Implement LegacyHandlerAdapter for existing handlers
- [ ] Create CommandHandlerAdapter for command handlers
- [ ] Implement ServiceHandlerAdapter for service handlers
- [ ] Create migration utilities for existing handlers
- [ ] Add HandlerValidator with handler validation

#### Phase 3: Integration & Optimization (20 hours)
- [ ] Create handler metrics and audit system
- [ ] Implement HandlerOptimizer with optimization algorithms
- [ ] Integrate unified handler system with existing services
- [ ] Update WorkflowOrchestrationService to use unified handlers
- [ ] Add module exports and documentation

## 5. Unified Handler System Design

#### UnifiedWorkflowHandler Implementation
```javascript
/**
 * Unified workflow handler for workflow orchestration
 */
class UnifiedWorkflowHandler {
  constructor(dependencies = {}) {
    this.handlerRegistry = dependencies.handlerRegistry || new HandlerRegistry();
    this.handlerFactory = dependencies.handlerFactory || new HandlerFactory();
    this.handlerValidator = dependencies.handlerValidator || new HandlerValidator();
    this.handlerMetrics = dependencies.handlerMetrics || new HandlerMetrics();
    this.handlerAudit = dependencies.handlerAudit || new HandlerAudit();
    this.handlerOptimizer = dependencies.handlerOptimizer || new HandlerOptimizer();
    this.logger = dependencies.logger || console;
  }

  /**
   * Handle workflow execution
   * @param {Object} request - Handler request
   * @param {Object} response - Handler response
   * @returns {Promise<HandlerResult>} Handler result
   */
  async handle(request, response) {
    const startTime = Date.now();
    const handlerId = this.generateHandlerId();
    
    try {
      this.logger.info('UnifiedWorkflowHandler: Starting workflow handling', {
        handlerId,
        requestType: request.type,
        taskId: request.taskId
      });

      // Create handler context
      const context = new HandlerContext(request, response, handlerId);
      
      // Validate request
      const validationResult = await this.handlerValidator.validateRequest(request);
      if (!validationResult.isValid) {
        throw new HandlerException('Request validation failed', validationResult);
      }

      // Get appropriate handler
      const handler = await this.getHandler(request, context);
      
      // Execute handler
      const result = await this.executeHandler(handler, context);
      
      // Record metrics
      await this.handlerMetrics.recordHandlerExecution(handlerId, {
        request,
        handler: handler.getMetadata(),
        duration: Date.now() - startTime,
        result
      });

      // Audit handler execution
      await this.handlerAudit.auditHandlerExecution(handlerId, {
        request,
        handler: handler.getMetadata(),
        result
      });

      // Optimize future executions
      await this.handlerOptimizer.optimize(handlerId, result);

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.logger.error('UnifiedWorkflowHandler: Handler execution failed', {
        handlerId,
        error: error.message,
        duration
      });

      // Record failure metrics
      await this.handlerMetrics.recordHandlerFailure(handlerId, {
        request,
        error,
        duration
      });

      throw new HandlerException('Handler execution failed', error);
    }
  }

  /**
   * Get appropriate handler for request
   * @param {Object} request - Handler request
   * @param {HandlerContext} context - Handler context
   * @returns {Promise<IHandler>} Handler instance
   */
  async getHandler(request, context) {
    // Check if handler is already registered
    const registeredHandler = this.handlerRegistry.getHandler(request.type);
    if (registeredHandler) {
      return registeredHandler;
    }

    // Create handler using factory
    const handler = await this.handlerFactory.createHandler(request, context);
    
    // Register handler for future use
    this.handlerRegistry.registerHandler(request.type, handler);
    
    return handler;
  }

  /**
   * Execute handler
   * @param {IHandler} handler - Handler to execute
   * @param {HandlerContext} context - Handler context
   * @returns {Promise<HandlerResult>} Handler result
   */
  async executeHandler(handler, context) {
    const startTime = Date.now();
    
    try {
      // Validate handler
      const validationResult = await this.handlerValidator.validateHandler(handler, context);
      if (!validationResult.isValid) {
        throw new HandlerException('Handler validation failed', validationResult);
      }

      // Execute handler
      const result = await handler.execute(context);
      
      const duration = Date.now() - startTime;
      
      return new HandlerResult({
        success: true,
        handlerId: context.handlerId,
        handlerName: handler.getMetadata().name,
        result,
        duration,
        timestamp: new Date()
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      
      return new HandlerResult({
        success: false,
        handlerId: context.handlerId,
        handlerName: handler.getMetadata().name,
        error: error.message,
        duration,
        timestamp: new Date()
      });
    }
  }

  /**
   * Generate handler ID
   * @returns {string} Handler ID
   */
  generateHandlerId() {
    return `handler_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get handler statistics
   * @returns {Promise<Object>} Handler statistics
   */
  async getHandlerStatistics() {
    return {
      registeredHandlers: this.handlerRegistry.getHandlerCount(),
      handlerTypes: this.handlerRegistry.getHandlerTypes(),
      metrics: await this.handlerMetrics.getStatistics(),
      optimizations: await this.handlerOptimizer.getOptimizations()
    };
  }
}
```

#### HandlerRegistry Implementation
```javascript
/**
 * Handler registry for handler management
 */
class HandlerRegistry {
  constructor() {
    this.handlers = new Map();
    this.handlerTypes = new Map();
    this.handlerMetadata = new Map();
  }

  /**
   * Register handler
   * @param {string} type - Handler type
   * @param {IHandler} handler - Handler instance
   * @param {Object} metadata - Handler metadata
   */
  registerHandler(type, handler, metadata = {}) {
    this.handlers.set(type, handler);
    this.handlerTypes.set(type, handler.constructor.name);
    this.handlerMetadata.set(type, {
      ...handler.getMetadata(),
      ...metadata,
      registeredAt: new Date()
    });
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
      handlers.push({
        type,
        name: handler.getMetadata().name,
        description: handler.getMetadata().description,
        version: handler.getMetadata().version,
        registeredAt: this.handlerMetadata.get(type)?.registeredAt
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
  }
}
```

#### HandlerFactory Implementation
```javascript
/**
 * Handler factory for creating handlers
 */
class HandlerFactory {
  constructor() {
    this.adapters = new Map();
    this.initializeAdapters();
  }

  /**
   * Initialize adapters
   */
  initializeAdapters() {
    this.adapters.set('legacy', new LegacyHandlerAdapter());
    this.adapters.set('command', new CommandHandlerAdapter());
    this.adapters.set('service', new ServiceHandlerAdapter());
  }

  /**
   * Create handler for request
   * @param {Object} request - Handler request
   * @param {HandlerContext} context - Handler context
   * @returns {Promise<IHandler>} Handler instance
   */
  async createHandler(request, context) {
    // Determine handler type
    const handlerType = this.determineHandlerType(request);
    
    // Get appropriate adapter
    const adapter = this.adapters.get(handlerType);
    if (!adapter) {
      throw new Error(`No adapter found for handler type: ${handlerType}`);
    }
    
    // Create handler using adapter
    return await adapter.createHandler(request, context);
  }

  /**
   * Determine handler type from request
   * @param {Object} request - Handler request
   * @returns {string} Handler type
   */
  determineHandlerType(request) {
    // Check for legacy handler patterns
    if (request.handlerClass || request.handlerPath) {
      return 'legacy';
    }
    
    // Check for command handler patterns
    if (request.command || request.commandType) {
      return 'command';
    }
    
    // Check for service handler patterns
    if (request.service || request.serviceMethod) {
      return 'service';
    }
    
    // Default to legacy
    return 'legacy';
  }

  /**
   * Register adapter
   * @param {string} type - Adapter type
   * @param {IHandlerAdapter} adapter - Handler adapter
   */
  registerAdapter(type, adapter) {
    this.adapters.set(type, adapter);
  }

  /**
   * Get adapter
   * @param {string} type - Adapter type
   * @returns {IHandlerAdapter|null} Handler adapter
   */
  getAdapter(type) {
    return this.adapters.get(type) || null;
  }

  /**
   * List available adapters
   * @returns {Array<string>} Adapter types
   */
  listAdapters() {
    return Array.from(this.adapters.keys());
  }
}
```

## 6. Handler Adapters

#### LegacyHandlerAdapter Implementation
```javascript
/**
 * Legacy handler adapter for existing handlers
 */
class LegacyHandlerAdapter {
  constructor() {
    this.handlerCache = new Map();
  }

  /**
   * Create handler from legacy handler
   * @param {Object} request - Handler request
   * @param {HandlerContext} context - Handler context
   * @returns {Promise<IHandler>} Handler instance
   */
  async createHandler(request, context) {
    const handlerClass = request.handlerClass || this.determineHandlerClass(request);
    
    if (!handlerClass) {
      throw new Error('Could not determine handler class');
    }
    
    // Check cache first
    if (this.handlerCache.has(handlerClass)) {
      return this.handlerCache.get(handlerClass);
    }
    
    // Create handler instance
    const handler = new handlerClass();
    
    // Wrap with unified handler interface
    const unifiedHandler = this.wrapLegacyHandler(handler, request);
    
    // Cache handler
    this.handlerCache.set(handlerClass, unifiedHandler);
    
    return unifiedHandler;
  }

  /**
   * Determine handler class from request
   * @param {Object} request - Handler request
   * @returns {Function|null} Handler class
   */
  determineHandlerClass(request) {
    // Map request types to handler classes
    const handlerMap = {
      'analyze_architecture': require('@/application/handlers/AnalyzeArchitectureHandler'),
      'vibecoder_analyze': require('@/application/handlers/VibeCoderAnalyzeHandler'),
      'generate_script': require('@/application/handlers/GenerateScriptHandler'),
      'auto_test_fix': require('@/application/handlers/AutoTestFixHandler'),
      'auto_refactor': require('@/application/handlers/AutoRefactorCommand')
    };
    
    return handlerMap[request.type] || null;
  }

  /**
   * Wrap legacy handler with unified interface
   * @param {Object} legacyHandler - Legacy handler instance
   * @param {Object} request - Handler request
   * @returns {IHandler} Unified handler
   */
  wrapLegacyHandler(legacyHandler, request) {
    return {
      /**
       * Execute handler
       * @param {HandlerContext} context - Handler context
       * @returns {Promise<HandlerResult>} Handler result
       */
      async execute(context) {
        try {
          // Call legacy handler method
          const result = await legacyHandler.handle(context.request, context.response);
          
          return {
            success: true,
            data: result,
            metadata: {
              legacyHandler: true,
              handlerClass: legacyHandler.constructor.name
            }
          };
          
        } catch (error) {
          return {
            success: false,
            error: error.message,
            metadata: {
              legacyHandler: true,
              handlerClass: legacyHandler.constructor.name
            }
          };
        }
      },

      /**
       * Get handler metadata
       * @returns {Object} Handler metadata
       */
      getMetadata() {
        return {
          name: legacyHandler.constructor.name,
          description: 'Legacy handler adapter',
          type: 'legacy',
          version: '1.0.0',
          originalHandler: legacyHandler.constructor.name
        };
      },

      /**
       * Validate handler
       * @param {HandlerContext} context - Handler context
       * @returns {Promise<ValidationResult>} Validation result
       */
      async validate(context) {
        // Basic validation for legacy handlers
        return {
          isValid: true,
          errors: []
        };
      }
    };
  }
}
```

#### CommandHandlerAdapter Implementation
```javascript
/**
 * Command handler adapter for command handlers
 */
class CommandHandlerAdapter {
  constructor() {
    this.commandBus = null; // Will be injected
  }

  /**
   * Create handler from command
   * @param {Object} request - Handler request
   * @param {HandlerContext} context - Handler context
   * @returns {Promise<IHandler>} Handler instance
   */
  async createHandler(request, context) {
    const command = request.command || this.createCommand(request);
    
    return {
      /**
       * Execute command handler
       * @param {HandlerContext} context - Handler context
       * @returns {Promise<HandlerResult>} Handler result
       */
      async execute(context) {
        try {
          // Execute command through command bus
          const result = await this.commandBus.execute(command);
          
          return {
            success: true,
            data: result,
            metadata: {
              commandHandler: true,
              commandType: command.constructor.name
            }
          };
          
        } catch (error) {
          return {
            success: false,
            error: error.message,
            metadata: {
              commandHandler: true,
              commandType: command.constructor.name
            }
          };
        }
      },

      /**
       * Get handler metadata
       * @returns {Object} Handler metadata
       */
      getMetadata() {
        return {
          name: `CommandHandler_${command.constructor.name}`,
          description: 'Command handler adapter',
          type: 'command',
          version: '1.0.0',
          commandType: command.constructor.name
        };
      },

      /**
       * Validate command handler
       * @param {HandlerContext} context - Handler context
       * @returns {Promise<ValidationResult>} Validation result
       */
      async validate(context) {
        // Validate command
        const validationResult = await command.validate();
        return validationResult;
      }
    };
  }

  /**
   * Create command from request
   * @param {Object} request - Handler request
   * @returns {Object} Command instance
   */
  createCommand(request) {
    const commandType = request.commandType;
    const commandData = request.commandData || {};
    
    // Create command instance
    const CommandClass = require(`@/application/commands/${commandType}`);
    return new CommandClass(commandData);
  }
}
```

## 7. Migration Utilities

#### Migration Utility Implementation
```javascript
/**
 * Migration utilities for existing handlers
 */
class HandlerMigrationUtility {
  constructor() {
    this.migrationRegistry = new Map();
    this.migrationHistory = new Map();
  }

  /**
   * Migrate existing handler to unified system
   * @param {string} handlerType - Handler type
   * @param {Object} handlerConfig - Handler configuration
   * @returns {Promise<MigrationResult>} Migration result
   */
  async migrateHandler(handlerType, handlerConfig) {
    const migrationId = this.generateMigrationId();
    const startTime = Date.now();
    
    try {
      this.logger.info('HandlerMigrationUtility: Starting handler migration', {
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
      
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.logger.error('HandlerMigrationUtility: Handler migration failed', {
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
   * @returns {Promise<StepResult>} Step result
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
   * Generate migration ID
   * @returns {string} Migration ID
   */
  generateMigrationId() {
    return `migration_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
}
```

## 8. Code Standards & Patterns
- **Coding Style**: ESLint with existing project rules, Prettier formatting
- **Naming Conventions**: camelCase for variables/functions, PascalCase for classes, kebab-case for files
- **Error Handling**: Try-catch with specific error types, proper error logging
- **Logging**: Winston logger with structured logging, different levels for operations
- **Testing**: Jest framework, 95% coverage requirement
- **Documentation**: JSDoc for all public methods, README updates

## 9. Testing Strategy

#### Unit Tests: 15 test files (1 per implementation file)
- **Core Handlers**: 5 test files for unified handler system
- **Adapters**: 3 test files for handler adapters
- **Registry & Factory**: 3 test files for registry and factory
- **Migration**: 2 test files for migration utilities
- **Integration**: 2 test files for integration scenarios

#### Test Coverage Requirements:
- **Line Coverage**: 95% minimum
- **Branch Coverage**: 90% minimum
- **Function Coverage**: 100% minimum

## 10. Success Criteria

#### Technical Metrics:
- [ ] Unified handler system fully functional
- [ ] Handler adapters working correctly
- [ ] Migration utilities operational
- [ ] Handler registry and factory working
- [ ] 95% test coverage achieved
- [ ] Zero breaking changes to existing APIs

#### Migration Metrics:
- [ ] All existing handlers successfully migrated
- [ ] Handler performance improved
- [ ] Code duplication reduced by 40%
- [ ] All existing functionality preserved

## 11. Risk Assessment

#### High Risk:
- [ ] Handler migration breaking changes - Mitigation: Adapter pattern and backward compatibility
- [ ] Performance impact of unified system - Mitigation: Performance testing and optimization

#### Medium Risk:
- [ ] Adapter complexity - Mitigation: Comprehensive testing and documentation
- [ ] Migration conflicts - Mitigation: Clear migration procedures and rollback

#### Low Risk:
- [ ] API endpoint design - Mitigation: Early API review
- [ ] Documentation completeness - Mitigation: Automated documentation generation

## 12. AI Auto-Implementation Instructions

#### Task Database Fields:
- **source_type**: 'markdown_doc'
- **source_path**: 'docs/09_roadmap/features/unified-workflow-performance-3b-unified-handlers.md'
- **automation_level**: 'semi_auto'
- **confirmation_required**: true
- **max_attempts**: 3
- **git_branch_required**: true
- **new_chat_required**: true

#### AI Execution Context:
```json
{
  "requires_new_chat": true,
  "git_branch_name": "feature/unified-workflow-performance-3b",
  "confirmation_keywords": ["fertig", "done", "complete", "unified handlers ready"],
  "fallback_detection": true,
  "max_confirmation_attempts": 3,
  "timeout_seconds": 1800
}
```

#### Success Indicators:
- [ ] All 15 new files created with proper JSDoc
- [ ] All 7 existing files modified correctly
- [ ] Unified handler system functional
- [ ] Handler adapters working
- [ ] Migration utilities operational
- [ ] All existing handlers migrated
- [ ] All tests passing
- [ ] No build errors
- [ ] Code follows standards
- [ ] Documentation updated

## 13. References & Resources
- **Technical Documentation**: Handler patterns, Adapter patterns, Migration strategies
- **API References**: Existing PIDEA handler patterns and conventions
- **Design Patterns**: Adapter pattern, Factory pattern, Registry pattern
- **Best Practices**: Handler design patterns, Migration best practices
- **Similar Implementations**: Existing handler patterns in PIDEA

---

## Database Task Creation Instructions

This subtask will be parsed into a database task with the following mapping:

```sql
INSERT INTO tasks (
  id, project_id, title, description, type, category, priority, status,
  source_type, source_path, source_content, metadata, estimated_hours
) VALUES (
  uuid(), -- Generated
  'pidea-backend', -- From context
  'Unified Workflow Performance 3B: Unified Handler System', -- From section 1
  '[Full markdown content]', -- Complete description
  'feature', -- Derived from Technical Requirements
  'backend', -- Derived from context
  'high', -- From section 1
  'pending', -- Initial status
  'markdown_doc', -- Source type
  'docs/09_roadmap/features/unified-workflow-performance-3b-unified-handlers.md', -- Source path
  '[Full markdown content]', -- For reference
  '[JSON with all metadata]', -- All technical details
  80 -- From section 1 (total hours)
);
``` 