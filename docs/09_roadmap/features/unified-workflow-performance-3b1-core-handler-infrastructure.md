# Unified Workflow Performance 3B.1: Core Handler Infrastructure

## 1. Project Overview
- **Feature/Component Name**: Core Handler Infrastructure
- **Priority**: High
- **Estimated Time**: 20 hours (2.5 days)
- **Dependencies**: Foundation 1A (Core Interfaces & Context), Foundation 1B (Builder Pattern & Common Steps)
- **Related Issues**: Fragmented handlers, no unified handler system, inconsistent patterns

## 2. Technical Requirements
- **Tech Stack**: Node.js, JavaScript ES6+, Domain-Driven Design, Handler patterns
- **Architecture Pattern**: DDD with unified handler system foundation
- **Database Changes**: None (uses existing infrastructure)
- **API Changes**: None (foundation only)
- **Frontend Changes**: None (backend foundation)
- **Backend Changes**: Core handler infrastructure

## 3. Implementation Files

#### Files to Create:
- [ ] `backend/domain/workflows/handlers/UnifiedWorkflowHandler.js` - Basic unified workflow handler
- [ ] `backend/domain/workflows/handlers/HandlerRegistry.js` - Handler registry and management
- [ ] `backend/domain/workflows/handlers/HandlerFactory.js` - Handler factory
- [ ] `backend/domain/workflows/handlers/HandlerContext.js` - Handler context
- [ ] `backend/domain/workflows/handlers/HandlerResult.js` - Handler result
- [ ] `backend/domain/workflows/handlers/HandlerValidator.js` - Basic handler validation
- [ ] `backend/domain/workflows/handlers/interfaces/IHandler.js` - Handler interface
- [ ] `backend/domain/workflows/handlers/interfaces/IHandlerAdapter.js` - Handler adapter interface
- [ ] `backend/domain/workflows/handlers/index.js` - Module exports

#### Files to Modify:
- [ ] `backend/domain/services/WorkflowOrchestrationService.js` - Add unified handler integration
- [ ] `backend/domain/services/TaskService.js` - Add unified handler support

## 4. Implementation Phases

#### Phase 1: Core Infrastructure (8 hours)
- [ ] Create `backend/domain/workflows/handlers/` directory structure
- [ ] Implement basic `UnifiedWorkflowHandler.js` with core functionality
- [ ] Create `HandlerRegistry.js` with handler management
- [ ] Implement `HandlerFactory.js` with handler creation
- [ ] Add `HandlerContext.js` and `HandlerResult.js`

#### Phase 2: Interfaces & Validation (6 hours)
- [ ] Create `IHandler.js` interface for handlers
- [ ] Implement `IHandlerAdapter.js` interface for adapters
- [ ] Add `HandlerValidator.js` with basic validation
- [ ] Create handler metadata and configuration

#### Phase 3: Integration & Testing (6 hours)
- [ ] Integrate unified handler system with `WorkflowOrchestrationService`
- [ ] Update `TaskService` to use unified handlers
- [ ] Add basic unit tests
- [ ] Create module exports

## 5. Core Handler Infrastructure Design

#### UnifiedWorkflowHandler Implementation
```javascript
/**
 * Basic unified workflow handler for workflow orchestration
 */
class UnifiedWorkflowHandler {
  constructor(dependencies = {}) {
    this.handlerRegistry = dependencies.handlerRegistry || new HandlerRegistry();
    this.handlerFactory = dependencies.handlerFactory || new HandlerFactory();
    this.handlerValidator = dependencies.handlerValidator || new HandlerValidator();
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
        throw new Error(`Request validation failed: ${validationResult.errors.join(', ')}`);
      }

      // Get appropriate handler
      const handler = await this.getHandler(request, context);
      
      // Execute handler
      const result = await this.executeHandler(handler, context);
      
      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.logger.error('UnifiedWorkflowHandler: Handler execution failed', {
        handlerId,
        error: error.message,
        duration
      });

      throw new Error(`Handler execution failed: ${error.message}`);
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
        throw new Error(`Handler validation failed: ${validationResult.errors.join(', ')}`);
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
      handlerTypes: this.handlerRegistry.getHandlerTypes()
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
    this.handlerCache = new Map();
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
    
    // Check cache first
    const cacheKey = this.generateCacheKey(request, handlerType);
    if (this.handlerCache.has(cacheKey)) {
      return this.handlerCache.get(cacheKey);
    }
    
    // Get appropriate adapter
    const adapter = this.adapters.get(handlerType);
    if (!adapter) {
      throw new Error(`No adapter found for handler type: ${handlerType}`);
    }
    
    // Create handler using adapter
    const handler = await adapter.createHandler(request, context);
    
    // Cache handler
    this.handlerCache.set(cacheKey, handler);
    
    return handler;
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

  /**
   * Generate cache key
   * @param {Object} request - Handler request
   * @param {string} handlerType - Handler type
   * @returns {string} Cache key
   */
  generateCacheKey(request, handlerType) {
    const requestStr = JSON.stringify(request);
    return `${handlerType}_${require('crypto').createHash('md5').update(requestStr).digest('hex')}`;
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.handlerCache.clear();
  }
}
```

#### HandlerContext Implementation
```javascript
/**
 * Handler context for execution context
 */
class HandlerContext {
  constructor(request, response, handlerId) {
    this.request = request;
    this.response = response;
    this.handlerId = handlerId;
    this.data = new Map();
    this.metadata = new Map();
    this.createdAt = new Date();
  }

  /**
   * Set data
   * @param {string} key - Data key
   * @param {*} value - Data value
   */
  set(key, value) {
    this.data.set(key, value);
  }

  /**
   * Get data
   * @param {string} key - Data key
   * @returns {*} Data value
   */
  get(key) {
    return this.data.get(key);
  }

  /**
   * Check if data exists
   * @param {string} key - Data key
   * @returns {boolean} True if exists
   */
  has(key) {
    return this.data.has(key);
  }

  /**
   * Delete data
   * @param {string} key - Data key
   * @returns {boolean} True if deleted
   */
  delete(key) {
    return this.data.delete(key);
  }

  /**
   * Get all data
   * @returns {Object} All data
   */
  getAll() {
    const result = {};
    for (const [key, value] of this.data) {
      result[key] = value;
    }
    return result;
  }

  /**
   * Set metadata
   * @param {string} key - Metadata key
   * @param {*} value - Metadata value
   */
  setMetadata(key, value) {
    this.metadata.set(key, value);
  }

  /**
   * Get metadata
   * @param {string} key - Metadata key
   * @returns {*} Metadata value
   */
  getMetadata(key) {
    return this.metadata.get(key);
  }

  /**
   * Get all metadata
   * @returns {Object} All metadata
   */
  getAllMetadata() {
    const result = {};
    for (const [key, value] of this.metadata) {
      result[key] = value;
    }
    return result;
  }

  /**
   * Get context age
   * @returns {number} Age in milliseconds
   */
  getAge() {
    return Date.now() - this.createdAt.getTime();
  }
}
```

#### HandlerResult Implementation
```javascript
/**
 * Handler result for execution results
 */
class HandlerResult {
  constructor(data = {}) {
    this.success = data.success || false;
    this.handlerId = data.handlerId || null;
    this.handlerName = data.handlerName || null;
    this.result = data.result || null;
    this.error = data.error || null;
    this.duration = data.duration || 0;
    this.timestamp = data.timestamp || new Date();
    this.metadata = data.metadata || {};
  }

  /**
   * Check if result is successful
   * @returns {boolean} True if successful
   */
  isSuccess() {
    return this.success === true;
  }

  /**
   * Check if result has error
   * @returns {boolean} True if has error
   */
  hasError() {
    return this.error !== null && this.error !== undefined;
  }

  /**
   * Get error message
   * @returns {string|null} Error message
   */
  getErrorMessage() {
    return this.error;
  }

  /**
   * Get execution duration
   * @returns {number} Duration in milliseconds
   */
  getDuration() {
    return this.duration;
  }

  /**
   * Get result data
   * @returns {*} Result data
   */
  getResult() {
    return this.result;
  }

  /**
   * Get metadata
   * @returns {Object} Metadata
   */
  getMetadata() {
    return this.metadata;
  }

  /**
   * Set metadata
   * @param {string} key - Metadata key
   * @param {*} value - Metadata value
   */
  setMetadata(key, value) {
    this.metadata[key] = value;
  }

  /**
   * Convert to plain object
   * @returns {Object} Plain object
   */
  toObject() {
    return {
      success: this.success,
      handlerId: this.handlerId,
      handlerName: this.handlerName,
      result: this.result,
      error: this.error,
      duration: this.duration,
      timestamp: this.timestamp,
      metadata: this.metadata
    };
  }

  /**
   * Create success result
   * @param {Object} data - Result data
   * @returns {HandlerResult} Success result
   */
  static success(data = {}) {
    return new HandlerResult({
      success: true,
      ...data
    });
  }

  /**
   * Create error result
   * @param {string} error - Error message
   * @param {Object} data - Additional data
   * @returns {HandlerResult} Error result
   */
  static error(error, data = {}) {
    return new HandlerResult({
      success: false,
      error,
      ...data
    });
  }
}
```

## 6. Interfaces

#### IHandler Interface
```javascript
/**
 * Handler interface
 */
class IHandler {
  /**
   * Execute handler
   * @param {HandlerContext} context - Handler context
   * @returns {Promise<HandlerResult>} Handler result
   */
  async execute(context) {
    throw new Error('execute method must be implemented');
  }

  /**
   * Get handler metadata
   * @returns {Object} Handler metadata
   */
  getMetadata() {
    throw new Error('getMetadata method must be implemented');
  }

  /**
   * Validate handler
   * @param {HandlerContext} context - Handler context
   * @returns {Promise<ValidationResult>} Validation result
   */
  async validate(context) {
    throw new Error('validate method must be implemented');
  }
}
```

#### IHandlerAdapter Interface
```javascript
/**
 * Handler adapter interface
 */
class IHandlerAdapter {
  /**
   * Create handler
   * @param {Object} request - Handler request
   * @param {HandlerContext} context - Handler context
   * @returns {Promise<IHandler>} Handler instance
   */
  async createHandler(request, context) {
    throw new Error('createHandler method must be implemented');
  }

  /**
   * Check if adapter can handle request
   * @param {Object} request - Handler request
   * @returns {boolean} True if can handle
   */
  canHandle(request) {
    throw new Error('canHandle method must be implemented');
  }
}
```

## 7. Code Standards & Patterns
- **Coding Style**: ESLint with existing project rules, Prettier formatting
- **Naming Conventions**: camelCase for variables/functions, PascalCase for classes, kebab-case for files
- **Error Handling**: Try-catch with specific error types, proper error logging
- **Logging**: Winston logger with structured logging, different levels for operations
- **Testing**: Jest framework, 90% coverage requirement
- **Documentation**: JSDoc for all public methods, README updates

## 8. Testing Strategy

#### Unit Tests: 9 test files (1 per implementation file)
- **Core Handlers**: 3 test files for unified handler system
- **Registry & Factory**: 2 test files for registry and factory
- **Context & Results**: 2 test files for context and result classes
- **Interfaces**: 2 test files for interfaces

#### Test Coverage Requirements:
- **Line Coverage**: 90% minimum
- **Branch Coverage**: 85% minimum
- **Function Coverage**: 100% minimum

## 9. Success Criteria

#### Technical Metrics:
- [ ] Core handler infrastructure fully functional
- [ ] Handler registry and factory working
- [ ] Handler context and result classes implemented
- [ ] 90% test coverage achieved
- [ ] Zero breaking changes to existing APIs

#### Integration Metrics:
- [ ] Integration with WorkflowOrchestrationService working
- [ ] TaskService can use unified handlers
- [ ] Basic handler system functional
- [ ] All existing functionality preserved

## 10. Risk Assessment

#### Medium Risk:
- [ ] Integration complexity - Mitigation: Gradual integration with existing services
- [ ] Handler compatibility - Mitigation: Adapter pattern for backward compatibility

#### Low Risk:
- [ ] API design - Mitigation: Follow existing patterns
- [ ] Documentation completeness - Mitigation: Comprehensive JSDoc

## 11. AI Auto-Implementation Instructions

#### Task Database Fields:
- **source_type**: 'markdown_doc'
- **source_path**: 'docs/09_roadmap/features/unified-workflow-performance-3b1-core-handler-infrastructure.md'
- **automation_level**: 'semi_auto'
- **confirmation_required**: true
- **max_attempts**: 3
- **git_branch_required**: true
- **new_chat_required**: true

#### AI Execution Context:
```json
{
  "requires_new_chat": true,
  "git_branch_name": "feature/unified-workflow-performance-3b1",
  "confirmation_keywords": ["fertig", "done", "complete", "core handler infrastructure ready"],
  "fallback_detection": true,
  "max_confirmation_attempts": 3,
  "timeout_seconds": 1800
}
```

#### Success Indicators:
- [ ] All 9 new files created with proper JSDoc
- [ ] All 2 existing files modified correctly
- [ ] Core handler infrastructure functional
- [ ] Handler registry and factory working
- [ ] Handler context and result classes implemented
- [ ] All tests passing
- [ ] No build errors
- [ ] Code follows standards
- [ ] Documentation updated

## 12. References & Resources
- **Technical Documentation**: Handler patterns, Registry patterns, Factory patterns
- **API References**: Existing PIDEA handler patterns and conventions
- **Design Patterns**: Registry pattern, Factory pattern, Strategy pattern
- **Best Practices**: Handler design patterns, Context management
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
  'Unified Workflow Performance 3B.1: Core Handler Infrastructure', -- From section 1
  '[Full markdown content]', -- Complete description
  'feature', -- Derived from Technical Requirements
  'backend', -- Derived from context
  'high', -- From section 1
  'pending', -- Initial status
  'markdown_doc', -- Source type
  'docs/09_roadmap/features/unified-workflow-performance-3b1-core-handler-infrastructure.md', -- Source path
  '[Full markdown content]', -- For reference
  '[JSON with all metadata]', -- All technical details
  20 -- From section 1 (total hours)
);
``` 