/**
 * ServiceOrderResolver - Automatically resolves service registration order
 * Uses dependency graph to determine optimal service registration sequence
 */
const DependencyGraph = require('./DependencyGraph');
const ServiceLogger = require('@logging/ServiceLogger');

class ServiceOrderResolver {
    constructor() {
        this.dependencyGraph = new DependencyGraph();
        this.logger = new ServiceLogger('ServiceOrderResolver');
        this.serviceCategories = new Map(); // serviceName -> category
        this.categoryOrder = []; // ordered list of categories
    }

    /**
     * Add a service with its dependencies and category
     * @param {string} serviceName - Name of the service
     * @param {Array<string>} dependencies - Array of dependency service names
     * @param {string} category - Service category (e.g., 'infrastructure', 'domain')
     */
    addService(serviceName, dependencies = [], category = 'unknown') {
        this.dependencyGraph.addNode(serviceName, dependencies);
        this.serviceCategories.set(serviceName, category);
        
        if (!this.categoryOrder.includes(category)) {
            this.categoryOrder.push(category);
        }
        
        this.logger.debug(`Added service: ${serviceName} (${category}) with dependencies: [${dependencies.join(', ')}]`);
    }

    /**
     * Add multiple services at once
     * @param {Array<Object>} services - Array of service objects
     * @param {string} category - Category for all services
     */
    addServices(services, category) {
        services.forEach(service => {
            this.addService(service.name, service.dependencies || [], category);
        });
    }

    /**
     * Set the preferred order of categories
     * @param {Array<string>} categories - Ordered list of categories
     */
    setCategoryOrder(categories) {
        this.categoryOrder = [...categories];
        this.logger.info(`Set category order: [${categories.join(' -> ')}]`);
    }

    /**
     * Resolve the optimal service registration order
     * @returns {Object} Resolution result with ordered services and validation
     */
    resolveOrder() {
        try {
            // Validate dependencies first
            const validation = this.dependencyGraph.validateDependencies();
            if (!validation.isValid) {
                return {
                    success: false,
                    error: 'Missing dependencies detected',
                    missingDependencies: validation.missingDependencies
                };
            }

            // Check for circular dependencies
            const cycles = this.dependencyGraph.detectCircularDependencies();
            if (cycles.length > 0) {
                return {
                    success: false,
                    error: 'Circular dependencies detected',
                    cycles: cycles
                };
            }

            // Perform topological sort
            const sortedServices = this.dependencyGraph.topologicalSort();
            
            // Group services by category
            const servicesByCategory = new Map();
            for (const serviceName of sortedServices) {
                const category = this.serviceCategories.get(serviceName) || 'unknown';
                if (!servicesByCategory.has(category)) {
                    servicesByCategory.set(category, []);
                }
                servicesByCategory.get(category).push(serviceName);
            }

            // Create ordered registration plan
            const registrationPlan = [];
            const categoryOrder = this.getEffectiveCategoryOrder(servicesByCategory);

            for (const category of categoryOrder) {
                const services = servicesByCategory.get(category) || [];
                if (services.length > 0) {
                    registrationPlan.push({
                        category,
                        services,
                        dependencies: this.getCategoryDependencies(services)
                    });
                }
            }

            const stats = this.dependencyGraph.getStats();
            
            this.logger.info(`Service order resolved successfully: ${sortedServices.length} services in ${registrationPlan.length} categories`);
            
            return {
                success: true,
                orderedServices: sortedServices,
                registrationPlan,
                stats,
                categoryOrder: categoryOrder
            };

        } catch (error) {
            this.logger.error('Failed to resolve service order:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get effective category order based on dependencies and preferences
     * @param {Map} servicesByCategory - Services grouped by category
     * @returns {Array<string>} Effective category order
     */
    getEffectiveCategoryOrder(servicesByCategory) {
        // Start with preferred order
        const effectiveOrder = [...this.categoryOrder];
        
        // Add any missing categories at the end
        for (const category of servicesByCategory.keys()) {
            if (!effectiveOrder.includes(category)) {
                effectiveOrder.push(category);
            }
        }
        
        return effectiveOrder;
    }

    /**
     * Get all dependencies for services in a category
     * @param {Array<string>} services - Services in the category
     * @returns {Set<string>} Set of dependency service names
     */
    getCategoryDependencies(services) {
        const dependencies = new Set();
        
        for (const serviceName of services) {
            const serviceDeps = this.dependencyGraph.getDependencies(serviceName);
            for (const dep of serviceDeps) {
                dependencies.add(dep);
            }
        }
        
        return Array.from(dependencies);
    }

    /**
     * Validate that a service can be registered at a specific position
     * @param {string} serviceName - Name of the service
     * @param {Array<string>} registeredServices - Already registered services
     * @returns {Object} Validation result
     */
    validateServiceRegistration(serviceName, registeredServices) {
        const dependencies = this.dependencyGraph.getDependencies(serviceName);
        const missingDependencies = [];
        
        for (const dep of dependencies) {
            if (!registeredServices.includes(dep)) {
                missingDependencies.push(dep);
            }
        }
        
        return {
            canRegister: missingDependencies.length === 0,
            missingDependencies,
            dependencies: Array.from(dependencies)
        };
    }

    /**
     * Get services that can be registered next
     * @param {Array<string>} registeredServices - Already registered services
     * @returns {Array<string>} Services ready for registration
     */
    getReadyServices(registeredServices) {
        const readyServices = [];
        
        for (const serviceName of this.dependencyGraph.nodes.keys()) {
            if (!registeredServices.includes(serviceName)) {
                const validation = this.validateServiceRegistration(serviceName, registeredServices);
                if (validation.canRegister) {
                    readyServices.push(serviceName);
                }
            }
        }
        
        return readyServices;
    }

    /**
     * Create a dependency resolution queue
     * @returns {Array<string>} Services in dependency resolution order
     */
    createResolutionQueue() {
        const result = this.resolveOrder();
        if (!result.success) {
            throw new Error(`Cannot create resolution queue: ${result.error}`);
        }
        
        return result.orderedServices;
    }

    /**
     * Get dependency statistics for a specific service
     * @param {string} serviceName - Name of the service
     * @returns {Object} Service dependency statistics
     */
    getServiceStats(serviceName) {
        if (!this.dependencyGraph.hasNode(serviceName)) {
            return null;
        }
        
        const dependencies = this.dependencyGraph.getDependencies(serviceName);
        const dependents = this.dependencyGraph.getDependents(serviceName);
        const category = this.serviceCategories.get(serviceName);
        
        return {
            serviceName,
            category,
            dependencyCount: dependencies.size,
            dependentCount: dependents.size,
            dependencies: Array.from(dependencies),
            dependents: Array.from(dependents),
            isLeaf: dependents.size === 0,
            isRoot: dependencies.size === 0
        };
    }

    /**
     * Get all services in a category
     * @param {string} category - Category name
     * @returns {Array<string>} Services in the category
     */
    getServicesByCategory(category) {
        const services = [];
        
        for (const [serviceName, serviceCategory] of this.serviceCategories.entries()) {
            if (serviceCategory === category) {
                services.push(serviceName);
            }
        }
        
        return services;
    }

    /**
     * Get all categories with their service counts
     * @returns {Object} Category statistics
     */
    getCategoryStats() {
        const stats = {};
        
        for (const [serviceName, category] of this.serviceCategories.entries()) {
            if (!stats[category]) {
                stats[category] = {
                    count: 0,
                    services: []
                };
            }
            stats[category].count++;
            stats[category].services.push(serviceName);
        }
        
        return stats;
    }

    /**
     * Clear all services and categories
     */
    clear() {
        this.dependencyGraph.clear();
        this.serviceCategories.clear();
        this.categoryOrder = [];
        this.logger.info('ServiceOrderResolver cleared');
    }

    /**
     * Get a string representation of the resolver state
     * @returns {string} Resolver state visualization
     */
    toString() {
        const lines = ['ServiceOrderResolver:'];
        lines.push(`  Categories: [${this.categoryOrder.join(' -> ')}]`);
        lines.push(`  Total Services: ${this.dependencyGraph.nodes.size}`);
        
        const categoryStats = this.getCategoryStats();
        for (const [category, stats] of Object.entries(categoryStats)) {
            lines.push(`  ${category}: ${stats.count} services`);
        }
        
        lines.push('');
        lines.push(this.dependencyGraph.toString());
        
        return lines.join('\n');
    }
}

module.exports = ServiceOrderResolver; 