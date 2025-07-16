# Logging System Improvement – Phase 1: Core Infrastructure Setup

## Overview
Create the foundational infrastructure for the improved logging system with proper DI integration, centralized configuration, and naming services.

## Objectives
- [ ] Create LoggerFactory for centralized logger creation
- [ ] Implement LoggerProvider for DI integration
- [ ] Create LoggerConfig for configuration management
- [ ] Implement LoggerNamingService for consistent naming
- [ ] Update ServiceRegistry with proper logger registration

## Deliverables
- File: `backend/infrastructure/logging/LoggerFactory.js` - Centralized logger creation with caching
- File: `backend/infrastructure/logging/LoggerProvider.js` - DI provider for loggers
- File: `backend/infrastructure/logging/LoggerConfig.js` - Configuration management service
- File: `backend/infrastructure/logging/LoggerNamingService.js` - Automatic naming detection and validation
- File: `backend/infrastructure/logging/constants.js` - Updated with DI-related constants
- File: `backend/infrastructure/di/ServiceRegistry.js` - Enhanced logger registration

## Dependencies
- Requires: None (foundation phase)
- Blocks: Phase 2 - DI Integration

## Estimated Time
4 hours

## Success Criteria
- [ ] All objectives completed
- [ ] All deliverables created
- [ ] LoggerFactory supports caching and validation
- [ ] LoggerProvider integrates with DI container
- [ ] LoggerConfig manages environment-specific settings
- [ ] LoggerNamingService detects and validates service names
- [ ] ServiceRegistry properly registers logger services
- [ ] Tests passing for new components

## Implementation Details

### LoggerFactory.js
```javascript
/**
 * LoggerFactory - Centralized logger creation with caching and validation
 * Provides consistent logger creation across the application
 */
const Logger = require('@logging/Logger');
const ServiceLogger = require('@logging/ServiceLogger');
const LoggerNamingService = require('./LoggerNamingService');

class LoggerFactory {
    constructor(container, config) {
        this.container = container;
        this.config = config;
        this.cache = new Map();
        this.namingService = new LoggerNamingService();
    }
    
    createLogger(serviceName, options = {}) {
        // Validate service name
        const validatedName = this.namingService.validateName(serviceName);
        
        // Check cache
        if (this.cache.has(validatedName)) {
            return this.cache.get(validatedName);
        }
        
        // Create logger with DI
        const logger = new Logger(validatedName, options);
        
        // Cache for performance
        this.cache.set(validatedName, logger);
        
        return logger;
    }
    
    createServiceLogger(serviceName, options = {}) {
        const validatedName = this.namingService.validateName(serviceName);
        const cacheKey = `service_${validatedName}`;
        
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        
        const logger = new ServiceLogger(validatedName, options);
        this.cache.set(cacheKey, logger);
        
        return logger;
    }
    
    clearCache() {
        this.cache.clear();
    }
    
    getCacheStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }
}

module.exports = LoggerFactory;
```

### LoggerProvider.js
```javascript
/**
 * LoggerProvider - DI provider for loggers
 * Integrates with the DI container to provide logger instances
 */
class LoggerProvider {
    constructor(factory) {
        this.factory = factory;
    }
    
    provide(serviceName) {
        return this.factory.createLogger(serviceName);
    }
    
    provideServiceLogger(serviceName) {
        return this.factory.createServiceLogger(serviceName);
    }
    
    provideForClass(className) {
        return this.factory.createLogger(className);
    }
    
    provideForFile(filePath) {
        const serviceName = this.extractServiceNameFromPath(filePath);
        return this.factory.createLogger(serviceName);
    }
    
    extractServiceNameFromPath(filePath) {
        // Extract service name from file path
        const fileName = filePath.split('/').pop().replace('.js', '');
        return this.factory.namingService.validateName(fileName);
    }
}

module.exports = LoggerProvider;
```

### LoggerConfig.js
```javascript
/**
 * LoggerConfig - Configuration management for logging system
 * Manages environment-specific logging configuration
 */
const LOG_LEVELS = require('./constants').LOG_LEVELS;
const DEFAULT_LOG_LEVELS = require('./constants').DEFAULT_LOG_LEVELS;

class LoggerConfig {
    constructor() {
        this.config = this.loadConfiguration();
    }
    
    loadConfiguration() {
        const env = process.env.NODE_ENV || 'development';
        
        return {
            level: process.env.LOG_LEVEL || DEFAULT_LOG_LEVELS[env],
            enableConsole: process.env.LOG_CONSOLE !== 'false',
            enableFile: process.env.LOG_FILE !== 'false',
            enableStructured: process.env.LOG_STRUCTURED === 'true',
            maxCacheSize: parseInt(process.env.LOG_CACHE_SIZE) || 1000,
            enablePerformanceLogging: process.env.LOG_PERFORMANCE === 'true',
            enableMemoryLogging: process.env.LOG_MEMORY === 'true',
            logDirectory: process.env.LOG_DIRECTORY || 'logs',
            retention: {
                days: parseInt(process.env.LOG_RETENTION_DAYS) || 30,
                maxSize: process.env.LOG_MAX_SIZE || '100m'
            }
        };
    }
    
    getLevel() {
        return this.config.level;
    }
    
    isConsoleEnabled() {
        return this.config.enableConsole;
    }
    
    isFileEnabled() {
        return this.config.enableFile;
    }
    
    isStructuredEnabled() {
        return this.config.enableStructured;
    }
    
    getMaxCacheSize() {
        return this.config.maxCacheSize;
    }
    
    isPerformanceLoggingEnabled() {
        return this.config.enablePerformanceLogging;
    }
    
    isMemoryLoggingEnabled() {
        return this.config.enableMemoryLogging;
    }
    
    getLogDirectory() {
        return this.config.logDirectory;
    }
    
    getRetentionConfig() {
        return this.config.retention;
    }
    
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }
}

module.exports = LoggerConfig;
```

### LoggerNamingService.js
```javascript
/**
 * LoggerNamingService - Automatic service name detection and validation
 * Ensures consistent and descriptive logger names across the application
 */
const path = require('path');

class LoggerNamingService {
    constructor() {
        this.genericNames = ['Logger', 'Log', 'Service', 'Manager', 'Controller'];
        this.nameCache = new Map();
    }
    
    validateName(name) {
        // Check cache first
        if (this.nameCache.has(name)) {
            return this.nameCache.get(name);
        }
        
        let validatedName = name;
        
        // Remove generic names
        if (this.genericNames.includes(name)) {
            validatedName = this.detectServiceName();
        }
        
        // Ensure PascalCase
        validatedName = this.toPascalCase(validatedName);
        
        // Cache result
        this.nameCache.set(name, validatedName);
        
        return validatedName;
    }
    
    detectServiceName() {
        try {
            const stack = new Error().stack;
            const callerLine = stack.split('\n')[3]; // Skip Error, validateName, detectServiceName
            
            // Extract file path from stack trace
            const match = callerLine.match(/\((.+):\d+:\d+\)/);
            if (match) {
                const filePath = match[1];
                return this.extractServiceNameFromPath(filePath);
            }
            
            return 'UnknownService';
        } catch (error) {
            return 'UnknownService';
        }
    }
    
    extractServiceNameFromPath(filePath) {
        const fileName = path.basename(filePath, '.js');
        
        // Handle different naming patterns
        if (fileName.includes('-')) {
            return this.kebabToPascal(fileName);
        } else if (fileName.includes('_')) {
            return this.snakeToPascal(fileName);
        } else {
            return this.toPascalCase(fileName);
        }
    }
    
    toPascalCase(str) {
        return str
            .replace(/[^a-zA-Z0-9]/g, ' ')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join('')
            .replace(/[^a-zA-Z0-9]/g, '');
    }
    
    kebabToPascal(str) {
        return str
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join('');
    }
    
    snakeToPascal(str) {
        return str
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join('');
    }
    
    clearCache() {
        this.nameCache.clear();
    }
    
    getCacheStats() {
        return {
            size: this.nameCache.size,
            mappings: Object.fromEntries(this.nameCache)
        };
    }
}

module.exports = LoggerNamingService;
```

### Updated ServiceRegistry.js
```javascript
// Add to registerInfrastructureServices() method:

// Logger Factory
this.container.register('loggerFactory', (loggerConfig) => {
    const LoggerFactory = require('@logging/LoggerFactory');
    return new LoggerFactory(this.container, loggerConfig);
}, { singleton: true, dependencies: ['loggerConfig'] });

// Logger Provider
this.container.register('loggerProvider', (loggerFactory) => {
    const LoggerProvider = require('@logging/LoggerProvider');
    return new LoggerProvider(loggerFactory);
}, { singleton: true, dependencies: ['loggerFactory'] });

// Logger Config
this.container.register('loggerConfig', () => {
    const LoggerConfig = require('@logging/LoggerConfig');
    return new LoggerConfig();
}, { singleton: true });

// Logger Naming Service
this.container.register('loggerNamingService', () => {
    const LoggerNamingService = require('@logging/LoggerNamingService');
    return new LoggerNamingService();
}, { singleton: true });

// Update existing logger registration
this.container.register('logger', (loggerProvider) => {
    return loggerProvider.provide('ServiceRegistry');
}, { singleton: true, dependencies: ['loggerProvider'] });
```

### Updated constants.js
```javascript
// Add to existing constants:

// DI-related constants
const DI_CONSTANTS = {
    LOGGER_FACTORY: 'loggerFactory',
    LOGGER_PROVIDER: 'loggerProvider',
    LOGGER_CONFIG: 'loggerConfig',
    LOGGER_NAMING: 'loggerNamingService',
    LOGGER_CACHE_SIZE: 1000,
    LOGGER_DEFAULT_TIMEOUT: 5000
};

// Naming patterns
const NAMING_PATTERNS = {
    PASCAL_CASE: /^[A-Z][a-zA-Z0-9]*$/,
    KEBAB_CASE: /^[a-z][a-z0-9-]*$/,
    SNAKE_CASE: /^[a-z][a-z0-9_]*$/,
    GENERIC_NAMES: ['Logger', 'Log', 'Service', 'Manager', 'Controller', 'Handler']
};

// Export new constants
module.exports = {
    // ... existing exports
    DI_CONSTANTS,
    NAMING_PATTERNS
};
```

## Testing Strategy

### Unit Tests
- [ ] Test LoggerFactory caching and validation
- [ ] Test LoggerProvider DI integration
- [ ] Test LoggerConfig environment handling
- [ ] Test LoggerNamingService name detection
- [ ] Test ServiceRegistry logger registration

### Integration Tests
- [ ] Test complete logger creation flow
- [ ] Test DI container integration
- [ ] Test configuration loading
- [ ] Test naming service with real file paths

## Validation Checklist
- [ ] All files created with proper structure
- [ ] DI integration working correctly
- [ ] Naming service detects service names accurately
- [ ] Configuration loads from environment variables
- [ ] Caching improves performance
- [ ] Tests pass with good coverage
- [ ] No breaking changes to existing logging
- [ ] Documentation updated 