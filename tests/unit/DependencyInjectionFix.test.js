/**
 * Unit tests for Dependency Injection Ordering Fix
 * Tests the automatic dependency resolution and circular dependency detection
 */
const assert = require('assert');
const { getServiceRegistry } = require('../../backend/infrastructure/dependency-injection/ServiceRegistry');
const { getServiceContainer } = require('../../backend/infrastructure/dependency-injection/ServiceContainer');
const DependencyGraph = require('../../backend/infrastructure/dependency-injection/DependencyGraph');
const ServiceOrderResolver = require('../../backend/infrastructure/dependency-injection/ServiceOrderResolver');

describe('Dependency Injection Ordering Fix', () => {
    let serviceRegistry;
    let serviceContainer;
    let dependencyGraph;
    let serviceOrderResolver;

    beforeEach(() => {
        serviceRegistry = getServiceRegistry();
        serviceContainer = getServiceContainer();
        dependencyGraph = new DependencyGraph();
        serviceOrderResolver = new ServiceOrderResolver();
    });

    afterEach(() => {
        serviceContainer.clear();
    });

    describe('DependencyGraph', () => {
        it('should detect circular dependencies', () => {
            dependencyGraph.addNode('A', ['B']);
            dependencyGraph.addNode('B', ['C']);
            dependencyGraph.addNode('C', ['A']);

            const cycles = dependencyGraph.detectCircularDependencies();
            assert(cycles.length > 0, 'Should detect circular dependency');
            assert(cycles[0].includes('A'), 'Cycle should include A');
            assert(cycles[0].includes('B'), 'Cycle should include B');
            assert(cycles[0].includes('C'), 'Cycle should include C');
        });

        it('should perform topological sort correctly', () => {
            dependencyGraph.addNode('A', []);
            dependencyGraph.addNode('B', ['A']);
            dependencyGraph.addNode('C', ['A', 'B']);

            const sorted = dependencyGraph.topologicalSort();
            assert(sorted.includes('A'), 'A should be in sorted list');
            assert(sorted.includes('B'), 'B should be in sorted list');
            assert(sorted.includes('C'), 'C should be in sorted list');
            
            // A should come before B and C
            const aIndex = sorted.indexOf('A');
            const bIndex = sorted.indexOf('B');
            const cIndex = sorted.indexOf('C');
            assert(aIndex < bIndex, 'A should come before B');
            assert(bIndex < cIndex, 'B should come before C');
        });

        it('should validate dependencies', () => {
            dependencyGraph.addNode('A', ['B']);
            dependencyGraph.addNode('C', ['D']);

            const validation = dependencyGraph.validateDependencies();
            assert(!validation.isValid, 'Should detect missing dependencies');
            assert(validation.missingDependencies['A'], 'Should report missing B for A');
            assert(validation.missingDependencies['C'], 'Should report missing D for C');
        });
    });

    describe('ServiceOrderResolver', () => {
        it('should resolve service order correctly', () => {
            serviceOrderResolver.addService('A', [], 'infrastructure');
            serviceOrderResolver.addService('B', ['A'], 'domain');
            serviceOrderResolver.addService('C', ['B'], 'handlers');

            const resolution = serviceOrderResolver.resolveOrder();
            assert(resolution.success, 'Resolution should succeed');
            assert(resolution.orderedServices.length === 3, 'Should have 3 services');
            assert(resolution.orderedServices.includes('A'), 'Should include A');
            assert(resolution.orderedServices.includes('B'), 'Should include B');
            assert(resolution.orderedServices.includes('C'), 'Should include C');
        });

        it('should detect circular dependencies in service order', () => {
            serviceOrderResolver.addService('A', ['B'], 'infrastructure');
            serviceOrderResolver.addService('B', ['C'], 'domain');
            serviceOrderResolver.addService('C', ['A'], 'handlers');

            const resolution = serviceOrderResolver.resolveOrder();
            assert(!resolution.success, 'Resolution should fail with circular dependency');
            assert(resolution.error.includes('Circular dependencies detected'), 'Should report circular dependency');
        });

        it('should group services by category', () => {
            serviceOrderResolver.addService('A', [], 'infrastructure');
            serviceOrderResolver.addService('B', ['A'], 'domain');
            serviceOrderResolver.addService('C', ['B'], 'handlers');

            const resolution = serviceOrderResolver.resolveOrder();
            assert(resolution.registrationPlan.length > 0, 'Should have registration plan');
            
            const infrastructurePlan = resolution.registrationPlan.find(p => p.category === 'infrastructure');
            const domainPlan = resolution.registrationPlan.find(p => p.category === 'domain');
            const handlersPlan = resolution.registrationPlan.find(p => p.category === 'handlers');
            
            assert(infrastructurePlan, 'Should have infrastructure plan');
            assert(domainPlan, 'Should have domain plan');
            assert(handlersPlan, 'Should have handlers plan');
        });
    });

    describe('ServiceContainer', () => {
        it('should detect circular dependencies during resolution', () => {
            serviceContainer.register('A', () => ({}), { dependencies: ['B'] });
            serviceContainer.register('B', () => ({}), { dependencies: ['C'] });
            serviceContainer.register('C', () => ({}), { dependencies: ['A'] });

            assert.throws(() => {
                serviceContainer.resolve('A');
            }, /Circular dependency detected/, 'Should throw circular dependency error');
        });

        it('should validate dependencies', () => {
            serviceContainer.register('A', () => ({}), { dependencies: ['B'] });
            serviceContainer.register('C', () => ({}), { dependencies: ['D'] });

            const validation = serviceContainer.validateDependencies();
            assert(!validation.isValid, 'Should detect missing dependencies');
            assert(validation.missingDependencies['A'], 'Should report missing B for A');
            assert(validation.missingDependencies['C'], 'Should report missing D for C');
        });

        it('should provide dependency information', () => {
            serviceContainer.register('A', () => ({}), { dependencies: ['B'] });
            serviceContainer.register('B', () => ({}), { dependencies: [] });

            const info = serviceContainer.getDependencyInfo('A');
            assert(info, 'Should provide dependency info');
            assert(info.serviceName === 'A', 'Should have correct service name');
            assert(info.dependencies.includes('B'), 'Should list dependencies');
            assert(info.dependencyCount === 1, 'Should have correct dependency count');
        });
    });

    describe('ServiceRegistry Integration', () => {
        it('should register services with automatic dependency resolution', () => {
            // This test validates that the ServiceRegistry can register services
            // without manual ordering using the new automatic system
            assert(serviceRegistry.serviceOrderResolver, 'Should have service order resolver');
            assert(typeof serviceRegistry.collectServiceDefinitions === 'function', 'Should have collectServiceDefinitions method');
            assert(typeof serviceRegistry.registerServiceByName === 'function', 'Should have registerServiceByName method');
        });

        it('should resolve WorkflowOrchestrationService dependencies', () => {
            // Test that WorkflowOrchestrationService can be resolved with cursorIDEService
            serviceRegistry.addServiceDefinition('workflowOrchestrationService', ['taskRepository', 'eventBus', 'logger', 'stepRegistry', 'cursorIDEService'], 'external');
            serviceRegistry.addServiceDefinition('cursorIDEService', ['browserManager', 'ideManager', 'eventBus'], 'domain');
            
            const resolution = serviceRegistry.serviceOrderResolver.resolveOrder();
            assert(resolution.success, 'Should resolve dependencies successfully');
            assert(resolution.orderedServices.includes('cursorIDEService'), 'Should include cursorIDEService');
            assert(resolution.orderedServices.includes('workflowOrchestrationService'), 'Should include workflowOrchestrationService');
            
            // cursorIDEService should come before workflowOrchestrationService
            const cursorIndex = resolution.orderedServices.indexOf('cursorIDEService');
            const workflowIndex = resolution.orderedServices.indexOf('workflowOrchestrationService');
            assert(cursorIndex < workflowIndex, 'cursorIDEService should be resolved before workflowOrchestrationService');
        });
    });

    describe('Performance', () => {
        it('should complete dependency resolution within reasonable time', () => {
            const startTime = Date.now();
            
            // Add a reasonable number of services
            for (let i = 0; i < 50; i++) {
                const dependencies = i > 0 ? [`service${i - 1}`] : [];
                serviceOrderResolver.addService(`service${i}`, dependencies, 'domain');
            }
            
            const resolution = serviceOrderResolver.resolveOrder();
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            assert(resolution.success, 'Should resolve successfully');
            assert(duration < 100, 'Should complete within 100ms');
        });
    });
}); 