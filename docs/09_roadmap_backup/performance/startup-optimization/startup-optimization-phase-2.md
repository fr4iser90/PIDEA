# Startup Performance Optimization – Phase 2: Lazy Service Loading

## Overview
Implement lazy loading for services to reduce startup time by loading only critical services initially and deferring non-critical service initialization until first use.

## Objectives
- [ ] Modify ServiceRegistry to support lazy loading
- [ ] Implement service dependency tracking and prioritization
- [ ] Create critical vs non-critical service separation
- [ ] Add service loading on first use mechanism
- [ ] Implement service dependency caching

## Deliverables
- File: `backend/infrastructure/dependency-injection/ServiceRegistry.js` - Modified with lazy loading support
- File: `backend/infrastructure/dependency-injection/LazyServiceLoader.js` - New lazy loading service
- File: `backend/infrastructure/dependency-injection/ServicePriorityManager.js` - Service prioritization
- API: `/api/startup/services/status` - Service loading status endpoint
- API: `/api/startup/services/load` - Manual service loading endpoint
- Test: `tests/unit/LazyServiceLoader.test.js` - Unit tests for lazy loading

## Dependencies
- Requires: Phase 1 (Startup Cache Infrastructure) completion
- Blocks: Phase 3 (IDE Detection Optimization) start

## Estimated Time
2 hours

## Technical Implementation

### 1. Service Priority Classification
```javascript
const SERVICE_PRIORITIES = {
    CRITICAL: {
        level: 1,
        services: [
            'databaseConnection',
            'eventBus',
            'logger',
            'authService',
            'browserManager'
        ]
    },
    HIGH: {
        level: 2,
        services: [
            'ideManager',
            'projectRepository',
            'taskRepository',
            'userRepository'
        ]
    },
    MEDIUM: {
        level: 3,
        services: [
            'cursorIDEService',
            'aiService',
            'analysisOrchestrator',
            'workflowOrchestrationService'
        ]
    },
    LOW: {
        level: 4,
        services: [
            'terminalLogCaptureService',
            'ideAutomationService',
            'advancedAnalysisService',
            'recommendationsService'
        ]
    }
};
```

### 2. LazyServiceLoader
```javascript
class LazyServiceLoader {
    constructor(serviceRegistry, startupCache, logger) {
        this.serviceRegistry = serviceRegistry;
        this.cache = startupCache;
        this.logger = logger;
        this.loadedServices = new Set();
        this.loadingPromises = new Map();
        this.serviceDependencies = new Map();
    }

    async loadCriticalServices() {
        this.logger.info('Loading critical services for startup...');
        
        const criticalServices = SERVICE_PRIORITIES.CRITICAL.services;
        const loadPromises = criticalServices.map(serviceName => 
            this.loadService(serviceName)
        );

        await Promise.all(loadPromises);
        this.logger.info(`Loaded ${criticalServices.length} critical services`);
    }

    async loadService(serviceName) {
        // Check if already loaded
        if (this.loadedServices.has(serviceName)) {
            return this.serviceRegistry.getService(serviceName);
        }

        // Check if currently loading
        if (this.loadingPromises.has(serviceName)) {
            return this.loadingPromises.get(serviceName);
        }

        // Start loading
        const loadPromise = this._loadServiceWithDependencies(serviceName);
        this.loadingPromises.set(serviceName, loadPromise);

        try {
            const service = await loadPromise;
            this.loadedServices.add(serviceName);
            this.logger.debug(`Service loaded: ${serviceName}`);
            return service;
        } finally {
            this.loadingPromises.delete(serviceName);
        }
    }

    async _loadServiceWithDependencies(serviceName) {
        // Get cached dependencies if available
        const cachedDeps = await this.cache.get(`service_deps_${serviceName}`, 'service_deps');
        
        if (cachedDeps) {
            this.logger.debug(`Using cached dependencies for ${serviceName}`);
            this.serviceDependencies.set(serviceName, cachedDeps);
        } else {
            // Resolve dependencies
            const deps = this.serviceRegistry.getServiceDependencies(serviceName);
            this.serviceDependencies.set(serviceName, deps);
            
            // Cache dependencies
            await this.cache.set(`service_deps_${serviceName}`, deps, 'service_deps', 3600);
        }

        // Load dependencies first
        const dependencyPromises = this.serviceDependencies.get(serviceName)
            .map(dep => this.loadService(dep));
        
        await Promise.all(dependencyPromises);

        // Load the service itself
        return this.serviceRegistry.getService(serviceName);
    }

    async preloadServices(priorityLevel) {
        const servicesToLoad = this._getServicesByPriority(priorityLevel);
        this.logger.info(`Preloading ${servicesToLoad.length} services with priority ${priorityLevel}`);
        
        const loadPromises = servicesToLoad.map(serviceName => 
            this.loadService(serviceName)
        );

        await Promise.all(loadPromises);
    }

    getLoadedServices() {
        return Array.from(this.loadedServices);
    }

    getLoadingStatus() {
        return {
            loaded: this.getLoadedServices(),
            loading: Array.from(this.loadingPromises.keys()),
            total: this.serviceRegistry.getTotalServiceCount()
        };
    }
}
```

### 3. Modified ServiceRegistry
```javascript
class ServiceRegistry {
    constructor() {
        // ... existing constructor code ...
        this.lazyLoader = null; // Will be set after initialization
        this.servicePriorities = new Map();
        this._initializeServicePriorities();
    }

    _initializeServicePriorities() {
        Object.entries(SERVICE_PRIORITIES).forEach(([priority, config]) => {
            config.services.forEach(serviceName => {
                this.servicePriorities.set(serviceName, config.level);
            });
        });
    }

    async initializeWithLazyLoading(startupCache, logger) {
        this.lazyLoader = new LazyServiceLoader(this, startupCache, logger);
        
        // Load only critical services initially
        await this.lazyLoader.loadCriticalServices();
        
        this.logger.info('ServiceRegistry initialized with lazy loading');
    }

    async getService(serviceName) {
        if (this.lazyLoader) {
            return await this.lazyLoader.loadService(serviceName);
        }
        
        // Fallback to direct resolution
        return this.container.resolve(serviceName);
    }

    getServicePriority(serviceName) {
        return this.servicePriorities.get(serviceName) || 5; // Default to lowest priority
    }

    getServicesByPriority(priorityLevel) {
        return Array.from(this.servicePriorities.entries())
            .filter(([_, level]) => level <= priorityLevel)
            .map(([serviceName, _]) => serviceName);
    }

    getTotalServiceCount() {
        return this.servicePriorities.size;
    }
}
```

### 4. Service Priority Manager
```javascript
class ServicePriorityManager {
    constructor() {
        this.priorityRules = new Map();
        this._initializePriorityRules();
    }

    _initializePriorityRules() {
        // Database and infrastructure first
        this.priorityRules.set('databaseConnection', 1);
        this.priorityRules.set('eventBus', 1);
        this.priorityRules.set('logger', 1);
        
        // Core services second
        this.priorityRules.set('authService', 2);
        this.priorityRules.set('browserManager', 2);
        this.priorityRules.set('ideManager', 2);
        
        // Repository services third
        this.priorityRules.set('projectRepository', 3);
        this.priorityRules.set('taskRepository', 3);
        this.priorityRules.set('userRepository', 3);
        
        // Domain services fourth
        this.priorityRules.set('cursorIDEService', 4);
        this.priorityRules.set('aiService', 4);
        this.priorityRules.set('analysisOrchestrator', 4);
        
        // Utility services last
        this.priorityRules.set('terminalLogCaptureService', 5);
        this.priorityRules.set('ideAutomationService', 5);
        this.priorityRules.set('recommendationsService', 5);
    }

    getPriority(serviceName) {
        return this.priorityRules.get(serviceName) || 5;
    }

    isCritical(serviceName) {
        return this.getPriority(serviceName) <= 2;
    }

    getLoadOrder() {
        return Array.from(this.priorityRules.entries())
            .sort((a, b) => a[1] - b[1])
            .map(([serviceName, _]) => serviceName);
    }
}
```

## Success Criteria
- [ ] Only critical services loaded at startup
- [ ] Non-critical services loaded on first use
- [ ] Service dependency caching working
- [ ] Startup time reduced by 60-70%
- [ ] Memory usage reduced by 40-50%
- [ ] All services accessible when needed
- [ ] Service loading status endpoint functional
- [ ] Unit tests passing with >90% coverage

## Testing Strategy
- **Unit Tests**: Lazy loading logic, dependency resolution, priority management
- **Integration Tests**: Service loading sequence, dependency caching
- **Performance Tests**: Startup time reduction, memory usage
- **Error Handling**: Dependency failures, circular dependencies

## Risk Mitigation
- **Service Dependencies**: Comprehensive dependency validation
- **Circular Dependencies**: Detection and prevention mechanisms
- **Memory Leaks**: Service cleanup and garbage collection
- **Performance Regression**: Continuous monitoring and benchmarks

## Next Phase Dependencies
This phase enables Phase 3 (IDE Detection Optimization) by providing the lazy loading infrastructure needed to defer IDE detection until actually required. 