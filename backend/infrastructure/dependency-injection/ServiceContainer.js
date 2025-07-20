
/**
 * ServiceContainer - Centralized Dependency Injection Container
 * Provides consistent service registration and resolution across the application
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
        
        // logger.info(`Registered service: ${name} (singleton: ${singleton})`);
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
     * Resolve a service
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
                
                // Store as singleton if needed
                if (singleton) {
                    this.singletons.set(name, instance);
                }
                
                return instance;
            } catch (error) {
                logger.error(`Failed to resolve service '${name}':`, error.message);
                logger.error(`Dependencies for '${name}': ${dependencies.join(', ')}`);
                throw new Error(`Service resolution failed for '${name}': ${error.message}`);
            }
        }

        // Log available services for debugging
        const availableServices = Array.from(this.factories.keys()).join(', ');
        logger.error(`Service '${name}' not found. Available services: ${availableServices}`);
        logger.error(`Available singletons: ${Array.from(this.singletons.keys()).join(', ')}`);
        throw new Error(`Service not found: ${name}`);
    }

    /**
     * Set project context
     * @param {Object} context - Project context
     */
    setProjectContext(context) {
        this.projectContext = { ...this.projectContext, ...context };
        logger.info(`Project context updated:`, this.projectContext);
    }

    /**
     * Get project context
     * @returns {Object} Project context
     */
    getProjectContext() {
        return { ...this.projectContext };
    }

    /**
     * Get project path
     * @returns {string|null} Project path
     */
    getProjectPath() {
        return this.projectContext.projectPath;
    }

    /**
     * Get project ID
     * @returns {string|null} Project ID
     */
    getProjectId() {
        return this.projectContext.projectId;
    }

    /**
     * Get workspace path
     * @returns {string|null} Workspace path
     */
    getWorkspacePath() {
        return this.projectContext.workspacePath;
    }

    /**
     * Auto-detect project path
     * @returns {Promise<string|null>} Project path or null
     */
    async autoDetectProject() {
        try {
            const cwd = process.cwd();
            const files = await fs.readdir(cwd);
            
            const projectIndicators = [
                'package.json', 'pyproject.toml', 'requirements.txt',
                'Cargo.toml', 'composer.json', 'pom.xml', 'build.gradle',
                '.git', 'README.md', 'src', 'app', 'lib'
            ];

            for (const indicator of projectIndicators) {
                if (files.includes(indicator)) {
                    return cwd;
                }
            }

            // Check parent directories
            const parentDir = path.dirname(cwd);
            if (parentDir !== cwd) {
                const parentFiles = await fs.readdir(parentDir);
                for (const indicator of projectIndicators) {
                    if (parentFiles.includes(indicator)) {
                        return parentDir;
                    }
                }
            }

            return null;
        } catch (error) {
            logger.error('Auto-detect failed:', error.message);
            return null;
        }
    }

    /**
     * Clear all services
     */
    clear() {
        this.services.clear();
        this.singletons.clear();
        this.factories.clear();
        this.projectContext = {
            projectPath: null,
            projectId: null,
            workspacePath: null
        };
        logger.info('All services cleared');
    }

    /**
     * Get all registered services
     * @returns {Object} Service registry
     */
    getRegistry() {
        return {
            services: Array.from(this.services.keys()),
            singletons: Array.from(this.singletons.keys()),
            factories: Array.from(this.factories.keys()),
            projectContext: this.projectContext
        };
    }
}

// Global singleton instance
let globalContainer = null;

/**
 * Get global service container
 * @returns {ServiceContainer} Global container instance
 */
function getServiceContainer() {
    if (!globalContainer) {
        globalContainer = new ServiceContainer();
    }
    return globalContainer;
}

/**
 * Set global service container
 * @param {ServiceContainer} container - Service container
 */
function setServiceContainer(container) {
    globalContainer = container;
}

module.exports = {
    ServiceContainer,
    getServiceContainer,
    setServiceContainer
}; 