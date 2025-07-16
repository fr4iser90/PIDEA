# Logging System Improvement – Phase 2: DI Integration

## Overview
Refactor existing logging classes to support proper DI injection and enhance the DI container with logger resolution capabilities.

## Objectives
- [ ] Refactor Logger.js to support DI injection
- [ ] Update ServiceLogger.js for DI compatibility
- [ ] Enhance ServiceContainer.js with logger resolution
- [ ] Create logger registration patterns
- [ ] Implement logger dependency injection

## Deliverables
- File: `backend/infrastructure/logging/Logger.js` - Refactored for DI support
- File: `backend/infrastructure/logging/ServiceLogger.js` - Enhanced DI compatibility
- File: `backend/infrastructure/di/ServiceContainer.js` - Enhanced logger resolution
- File: `backend/Application.js` - Updated logger setup
- Pattern: Logger registration patterns for services

## Dependencies
- Requires: Phase 1 - Core Infrastructure Setup
- Blocks: Phase 3 - Naming Convention Implementation

## Estimated Time
4 hours

## Success Criteria
- [ ] All objectives completed
- [ ] Logger.js supports DI injection
- [ ] ServiceLogger.js works with DI container
- [ ] ServiceContainer.js resolves loggers properly
- [ ] Application.js uses DI for logger setup
- [ ] Services can inject loggers via DI
- [ ] Tests pass for DI integration

## Implementation Details

### Refactored Logger.js
```javascript
const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, colorize, errors } = format;
const path = require('path');

// Custom format for console output
const consoleFormat = printf(({ level, message, timestamp, service, ...meta }) => {
    const serviceTag = service ? `[${service}]` : '';
    let metaStr = '';
    if (meta && Object.keys(meta).length) {
        try {
            metaStr = ` ${JSON.stringify(meta)}`;
        } catch (e) {
            metaStr = ' [meta: <circular structure>]';
        }
    }
    return `${timestamp} ${level.toUpperCase()} ${serviceTag} ${message}${metaStr}`;
});

// File format for structured logs
const fileFormat = printf(({ level, message, timestamp, service, ...meta }) => {
    let metaObj = {};
    if (meta && Object.keys(meta).length) {
        try {
            JSON.stringify(meta);
            metaObj = meta;
        } catch (e) {
            metaObj = { meta: '<circular structure>' };
        }
    }
    return JSON.stringify({
        timestamp,
        level,
        service,
        message,
        ...metaObj
    });
});

class Logger {
    constructor(serviceName = 'PIDEA', options = {}) {
        this.serviceName = serviceName;
        this.options = options;
        this.isDevelopment = process.env.NODE_ENV === 'development';
        this.isProduction = process.env.NODE_ENV === 'production';
        
        // Support DI injection
        if (options.container) {
            this.container = options.container;
        }
        
        if (options.config) {
            this.config = options.config;
        } else {
            this.config = this.loadDefaultConfig();
        }
        
        this.logger = this.createWinstonLogger();
    }
    
    loadDefaultConfig() {
        return {
            level: process.env.LOG_LEVEL || (this.isProduction ? 'warn' : 'info'),
            enableConsole: process.env.LOG_CONSOLE !== 'false',
            enableFile: process.env.LOG_FILE !== 'false',
            logDirectory: process.env.LOG_DIRECTORY || 'logs'
        };
    }
    
    createWinstonLogger() {
        const transports = [];
        
        // Console transport with colors
        if (this.config.enableConsole) {
            transports.push(new transports.Console({
                format: combine(
                    colorize(),
                    timestamp({ format: 'HH:mm:ss' }),
                    consoleFormat
                )
            }));
        }
        
        // File transports
        if (this.config.enableFile) {
            transports.push(new transports.File({
                filename: path.join(process.cwd(), this.config.logDirectory, 'error.log'),
                level: 'error',
                format: combine(
                    timestamp(),
                    fileFormat
                )
            }));
            
            transports.push(new transports.File({
                filename: path.join(process.cwd(), this.config.logDirectory, 'combined.log'),
                format: combine(
                    timestamp(),
                    fileFormat
                )
            }));
        }
        
        return createLogger({
            level: this.config.level,
            format: combine(
                timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                errors({ stack: true }),
                consoleFormat
            ),
            defaultMeta: { service: this.serviceName },
            transports
        });
    }
    
    // Logging methods
    info(message, meta = {}) {
        this.logger.info(message, meta);
    }
    
    warn(message, meta = {}) {
        this.logger.warn(message, meta);
    }
    
    error(message, meta = {}) {
        this.logger.error(message, meta);
    }
    
    debug(message, meta = {}) {
        this.logger.debug(message, meta);
    }
    
    success(message, meta = {}) {
        this.logger.info(`✅ ${message}`, meta);
    }
    
    failure(message, meta = {}) {
        this.logger.error(`💥 ${message}`, meta);
    }
    
    // DI support methods
    setContainer(container) {
        this.container = container;
    }
    
    setConfig(config) {
        this.config = { ...this.config, ...config };
        // Recreate logger with new config
        this.logger = this.createWinstonLogger();
    }
    
    getServiceName() {
        return this.serviceName;
    }
    
    getConfig() {
        return { ...this.config };
    }
}

module.exports = Logger;
```

### Enhanced ServiceLogger.js
```javascript
const Logger = require('@logging/Logger');

/**
 * ServiceLogger - A wrapper for service-specific logging with DI support
 * Provides consistent interface and metadata for service logging
 */
class ServiceLogger {
    constructor(serviceName, options = {}) {
        this.serviceName = serviceName;
        this.options = {
            enableSanitization: true,
            enablePerformanceLogging: false,
            logLevel: 'info',
            ...options
        };
        
        // Support DI injection
        if (options.container) {
            this.container = options.container;
        }
        
        if (options.config) {
            this.config = options.config;
        }
        
        // Create logger with service name
        this.logger = new Logger(serviceName, {
            container: this.container,
            config: this.config,
            ...options
        });
    }
    
    // Standard logging methods
    info(message, meta = {}) {
        this.logger.info(message, meta);
    }
    
    warn(message, meta = {}) {
        this.logger.warn(message, meta);
    }
    
    error(message, meta = {}) {
        this.logger.error(message, meta);
    }
    
    debug(message, meta = {}) {
        this.logger.debug(message, meta);
    }
    
    success(message, meta = {}) {
        this.logger.success(message, meta);
    }
    
    failure(message, meta = {}) {
        this.logger.failure(message, meta);
    }
    
    // Service-specific methods
    serviceMethod(methodName, message, meta = {}) {
        this.info(`[${methodName}] ${message}`, {
            method: methodName,
            ...meta
        });
    }
    
    serviceError(methodName, error, meta = {}) {
        this.error(`[${methodName}] Error: ${error.message}`, {
            method: methodName,
            error: error.stack,
            ...meta
        });
    }
    
    serviceStart(methodName, meta = {}) {
        this.info(`[${methodName}] Started`, {
            method: methodName,
            timestamp: new Date().toISOString(),
            ...meta
        });
    }
    
    serviceEnd(methodName, duration, meta = {}) {
        this.info(`[${methodName}] Completed in ${duration}ms`, {
            method: methodName,
            duration,
            timestamp: new Date().toISOString(),
            ...meta
        });
    }
    
    // Performance logging
    performance(methodName, duration, meta = {}) {
        if (this.options.enablePerformanceLogging) {
            this.info(`[${methodName}] Performance: ${duration}ms`, {
                method: methodName,
                duration,
                type: 'performance',
                ...meta
            });
        }
    }
    
    // DI support methods
    setContainer(container) {
        this.container = container;
        if (this.logger) {
            this.logger.setContainer(container);
        }
    }
    
    setConfig(config) {
        this.config = config;
        if (this.logger) {
            this.logger.setConfig(config);
        }
    }
    
    getServiceName() {
        return this.serviceName;
    }
    
    getLogger() {
        return this.logger;
    }
}

module.exports = ServiceLogger;
```

### Enhanced ServiceContainer.js
```javascript
/**
 * ServiceContainer - Centralized Dependency Injection Container
 * Enhanced with logger resolution capabilities
 */
const path = require('path');
const fs = require('fs').promises;
const Logger = require('@logging/Logger');
const logger = new Logger('DIServiceContainer');

class ServiceContainer {
    constructor() {
        this.services = new Map();
        this.singletons = new Map();
        this.factories = new Map();
        this.loggerCache = new Map();
        this.projectContext = {
            projectPath: null,
            projectId: null,
            workspacePath: null
        };
    }
    
    /**
     * Register a service factory
     * @param {string} name - Service name
     * @param {Function} factory - Factory function
     * @param {Object} options - Registration options
     */
    register(name, factory, options = {}) {
        const { singleton = false, dependencies = [] } = options;
        
        this.factories.set(name, {
            factory,
            singleton,
            dependencies
        });
        
        logger.debug(`Registered service: ${name} (singleton: ${singleton})`);
    }
    
    /**
     * Register a singleton instance
     * @param {string} name - Service name
     * @param {any} instance - Service instance
     */
    registerSingleton(name, instance) {
        this.singletons.set(name, instance);
        logger.info(`Registered singleton: ${name}`);
    }
    
    /**
     * Resolve a service with logger injection
     * @param {string} name - Service name
     * @returns {any} Service instance
     */
    resolve(name) {
        // Check if singleton already exists
        if (this.singletons.has(name)) {
            return this.singletons.get(name);
        }
        
        // Check if factory exists
        if (this.factories.has(name)) {
            const { factory, singleton, dependencies } = this.factories.get(name);
            
            try {
                // Resolve dependencies
                const resolvedDependencies = dependencies.map(dep => this.resolve(dep));
                
                // Create instance
                const instance = factory(...resolvedDependencies);
                
                // Inject logger if not already present
                this.injectLogger(instance, name);
                
                // Store as singleton if needed
                if (singleton) {
                    this.singletons.set(name, instance);
                }
                
                return instance;
            } catch (error) {
                logger.error(`Failed to resolve service '${name}':`, error.message);
                throw new Error(`Service resolution failed for '${name}': ${error.message}`);
            }
        }
        
        // Log available services for debugging
        const availableServices = Array.from(this.factories.keys()).join(', ');
        logger.error(`Service '${name}' not found. Available services: ${availableServices}`);
        throw new Error(`Service not found: ${name}`);
    }
    
    /**
     * Inject logger into service instance
     * @param {Object} instance - Service instance
     * @param {string} serviceName - Service name
     */
    injectLogger(instance, serviceName) {
        if (!instance || typeof instance !== 'object') {
            return;
        }
        
        // Check if instance already has a logger
        if (instance.logger) {
            return;
        }
        
        // Try to get logger from cache or create new one
        let logger = this.loggerCache.get(serviceName);
        
        if (!logger) {
            // Create logger using LoggerProvider if available
            try {
                const loggerProvider = this.resolve('loggerProvider');
                if (loggerProvider) {
                    logger = loggerProvider.provide(serviceName);
                } else {
                    // Fallback to direct creation
                    const Logger = require('@logging/Logger');
                    logger = new Logger(serviceName);
                }
                
                this.loggerCache.set(serviceName, logger);
            } catch (error) {
                logger.debug(`Could not inject logger for ${serviceName}: ${error.message}`);
            }
        }
        
        if (logger) {
            instance.logger = logger;
        }
    }
    
    /**
     * Get logger for a service
     * @param {string} serviceName - Service name
     * @returns {Logger} Logger instance
     */
    getLogger(serviceName) {
        if (this.loggerCache.has(serviceName)) {
            return this.loggerCache.get(serviceName);
        }
        
        try {
            const loggerProvider = this.resolve('loggerProvider');
            if (loggerProvider) {
                const logger = loggerProvider.provide(serviceName);
                this.loggerCache.set(serviceName, logger);
                return logger;
            }
        } catch (error) {
            logger.debug(`Could not get logger for ${serviceName}: ${error.message}`);
        }
        
        // Fallback
        const Logger = require('@logging/Logger');
        return new Logger(serviceName);
    }
    
    /**
     * Clear logger cache
     */
    clearLoggerCache() {
        this.loggerCache.clear();
        logger.info('Logger cache cleared');
    }
    
    /**
     * Get logger cache statistics
     */
    getLoggerCacheStats() {
        return {
            size: this.loggerCache.size,
            keys: Array.from(this.loggerCache.keys())
        };
    }
    
    // ... existing methods remain the same
    
    /**
     * Clear all services and caches
     */
    clear() {
        this.services.clear();
        this.singletons.clear();
        this.factories.clear();
        this.loggerCache.clear();
        this.projectContext = {
            projectPath: null,
            projectId: null,
            workspacePath: null
        };
        logger.info('All services and caches cleared');
    }
    
    /**
     * Get all registered services and cache stats
     */
    getRegistry() {
        return {
            services: Array.from(this.services.keys()),
            singletons: Array.from(this.singletons.keys()),
            factories: Array.from(this.factories.keys()),
            loggerCache: this.getLoggerCacheStats(),
            projectContext: this.projectContext
        };
    }
}

// ... rest of the file remains the same
```

### Updated Application.js
```javascript
// Update the setupLogger method in Application.js

setupLogger() {
    // Use DI container for logger setup
    try {
        const { getServiceRegistry } = require('./infrastructure/di/ServiceRegistry');
        const serviceRegistry = getServiceRegistry();
        
        // Get logger from DI container
        const logger = serviceRegistry.getContainer().getLogger('Application');
        
        return {
            info: (message, ...args) => logger.info(message, ...args),
            error: (message, ...args) => logger.error(message, ...args),
            debug: (message, ...args) => {
                if (!this.autoSecurityManager.isProduction()) {
                    logger.debug(message, ...args);
                }
            },
            warn: (message, ...args) => logger.warn(message, ...args)
        };
    } catch (error) {
        // Fallback to direct logger creation
        const ServiceLogger = require('@logging/ServiceLogger');
        const logger = new ServiceLogger('Application');
        
        return {
            info: (message, ...args) => logger.info(message, ...args),
            error: (message, ...args) => logger.error(message, ...args),
            debug: (message, ...args) => {
                if (!this.autoSecurityManager.isProduction()) {
                    logger.debug(message, ...args);
                }
            },
            warn: (message, ...args) => logger.warn(message, ...args)
        };
    }
}

// Update initializeInfrastructure method
async initializeInfrastructure() {
    this.logger.info('🏗️ Initializing infrastructure...');

    // Initialize DI system first
    const { getServiceRegistry } = require('./infrastructure/di/ServiceRegistry');
    const { getProjectContextService } = require('./infrastructure/di/ProjectContextService');
    
    this.serviceRegistry = getServiceRegistry();
    this.projectContext = getProjectContextService();
    
    // Register all services (including handlers)
    this.serviceRegistry.registerAllServices();
    
    // Get logger from DI container instead of registering manually
    this.logger = this.serviceRegistry.getContainer().getLogger('Application');
    
    // Replace the DI container's database connection with the properly configured one
    this.serviceRegistry.getContainer().registerSingleton('databaseConnection', this.databaseConnection);
    
    // ... rest of the method remains the same
}
```

## Logger Registration Patterns

### Pattern 1: Constructor Injection
```javascript
class MyService {
    constructor(logger) {
        this.logger = logger;
    }
    
    doSomething() {
        this.logger.info('Doing something');
    }
}

// Registration
this.container.register('myService', (logger) => {
    return new MyService(logger);
}, { singleton: true, dependencies: ['logger'] });
```

### Pattern 2: Property Injection
```javascript
class MyService {
    constructor() {
        // Logger will be injected by DI container
    }
    
    doSomething() {
        this.logger.info('Doing something');
    }
}

// Registration
this.container.register('myService', () => {
    return new MyService();
}, { singleton: true });
```

### Pattern 3: Factory Pattern
```javascript
class MyServiceFactory {
    constructor(loggerProvider) {
        this.loggerProvider = loggerProvider;
    }
    
    create(serviceName) {
        const logger = this.loggerProvider.provide(serviceName);
        return new MyService(logger);
    }
}

// Registration
this.container.register('myServiceFactory', (loggerProvider) => {
    return new MyServiceFactory(loggerProvider);
}, { singleton: true, dependencies: ['loggerProvider'] });
```

## Testing Strategy

### Unit Tests
- [ ] Test Logger.js DI injection
- [ ] Test ServiceLogger.js DI compatibility
- [ ] Test ServiceContainer.js logger resolution
- [ ] Test Application.js logger setup
- [ ] Test logger registration patterns

### Integration Tests
- [ ] Test complete DI logger flow
- [ ] Test logger injection in services
- [ ] Test logger caching
- [ ] Test fallback mechanisms

## Validation Checklist
- [ ] Logger.js supports DI injection
- [ ] ServiceLogger.js works with DI container
- [ ] ServiceContainer.js resolves loggers properly
- [ ] Application.js uses DI for logger setup
- [ ] Services can inject loggers via DI
- [ ] Logger caching works correctly
- [ ] Fallback mechanisms work
- [ ] Tests pass for DI integration
- [ ] No breaking changes to existing services
- [ ] Performance is maintained or improved 