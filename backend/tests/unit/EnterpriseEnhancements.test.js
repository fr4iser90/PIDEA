/**
 * Enterprise Enhancements Unit Tests
 * Tests for lifecycle hooks, performance monitoring, and health checks
 */
// Register module aliases for tests
require('module-alias/register');

const { ServiceContainer } = require('@infrastructure/dependency-injection/ServiceContainer');
const { DependencyGraph } = require('@infrastructure/dependency-injection/DependencyGraph');
const DependencyValidator = require('../../tools/validate-deps');
const DependencyGraphVisualizer = require('../../tools/dependency-graph');
const PerformanceAnalyzer = require('../../tools/performance-analyzer');
const HealthChecker = require('../../tools/health-check');

describe('Enterprise Enhancements', () => {
    let serviceContainer;

    beforeEach(() => {
        serviceContainer = new ServiceContainer();
    });

    afterEach(() => {
        serviceContainer.clear();
    });

    describe('Lifecycle Hooks', () => {
        test('should register service with lifecycle hooks', () => {
            const lifecycleHooks = {
                onStart: jest.fn(),
                onStop: jest.fn(),
                onError: jest.fn()
            };

            serviceContainer.register('testService', () => ({ name: 'test' }), {
                lifecycle: lifecycleHooks
            });

            const lifecycleInfo = serviceContainer.getServiceLifecycleInfo('testService');
            expect(lifecycleInfo.hasLifecycleHooks).toBe(true);
            expect(lifecycleInfo.lifecycleHooks).toContain('onStart');
            expect(lifecycleInfo.lifecycleHooks).toContain('onStop');
            expect(lifecycleInfo.lifecycleHooks).toContain('onError');
        });

        test('should execute onStart hook when starting services', async () => {
            const onStartMock = jest.fn();
            const lifecycleHooks = { onStart: onStartMock };

            serviceContainer.register('testService', () => ({ name: 'test' }), {
                lifecycle: lifecycleHooks
            });

            const results = await serviceContainer.startAllServices();
            
            expect(results.started).toContain('testService');
            expect(onStartMock).toHaveBeenCalledTimes(1);
            expect(onStartMock).toHaveBeenCalledWith(expect.objectContaining({ name: 'test' }));
        });

        test('should execute onStop hook when stopping services', async () => {
            const onStopMock = jest.fn();
            const lifecycleHooks = { onStop: onStopMock };

            serviceContainer.register('testService', () => ({ name: 'test' }), {
                lifecycle: lifecycleHooks
            });

            // Start the service first
            await serviceContainer.startAllServices();

            // Then stop it
            const results = await serviceContainer.stopAllServices();
            
            expect(results.stopped).toContain('testService');
            expect(onStopMock).toHaveBeenCalledTimes(1);
            expect(onStopMock).toHaveBeenCalledWith(expect.objectContaining({ name: 'test' }));
        });

        test('should execute onError hook when handling errors', async () => {
            const onErrorMock = jest.fn();
            const lifecycleHooks = { onError: onErrorMock };

            serviceContainer.register('testService', () => ({ name: 'test' }), {
                lifecycle: lifecycleHooks
            });

            const error = new Error('Test error');
            await serviceContainer.handleServiceError('testService', error);
            
            expect(onErrorMock).toHaveBeenCalledTimes(1);
            expect(onErrorMock).toHaveBeenCalledWith(expect.objectContaining({ name: 'test' }), error);
        });

        test('should track service state correctly', async () => {
            const lifecycleHooks = {
                onStart: jest.fn(),
                onStop: jest.fn()
            };

            serviceContainer.register('testService', () => ({ name: 'test' }), {
                lifecycle: lifecycleHooks
            });

            // Check initial state
            let lifecycleInfo = serviceContainer.getServiceLifecycleInfo('testService');
            expect(lifecycleInfo.state.status).toBe('registered');

            // Start service
            await serviceContainer.startAllServices();
            lifecycleInfo = serviceContainer.getServiceLifecycleInfo('testService');
            expect(lifecycleInfo.state.status).toBe('started');
            expect(lifecycleInfo.state.startTime).toBeInstanceOf(Date);

            // Stop service
            await serviceContainer.stopAllServices();
            lifecycleInfo = serviceContainer.getServiceLifecycleInfo('testService');
            expect(lifecycleInfo.state.status).toBe('stopped');
            expect(lifecycleInfo.state.stopTime).toBeInstanceOf(Date);
        });

        test('should handle lifecycle hook errors gracefully', async () => {
            const lifecycleHooks = {
                onStart: jest.fn().mockRejectedValue(new Error('Start failed')),
                onStop: jest.fn().mockRejectedValue(new Error('Stop failed'))
            };

            serviceContainer.register('testService', () => ({ name: 'test' }), {
                lifecycle: lifecycleHooks
            });

            // Test startup error
            const startupResults = await serviceContainer.startAllServices();
            expect(startupResults.failed).toHaveLength(1);
            expect(startupResults.failed[0].service).toBe('testService');
            expect(startupResults.failed[0].error).toBe('Start failed');

            // Test shutdown error
            const shutdownResults = await serviceContainer.stopAllServices();
            expect(shutdownResults.failed).toHaveLength(1);
            expect(shutdownResults.failed[0].service).toBe('testService');
            expect(shutdownResults.failed[0].error).toBe('Stop failed');
        });

        test('should get all lifecycle information', () => {
            serviceContainer.register('service1', () => ({}), {
                lifecycle: { onStart: jest.fn() }
            });
            serviceContainer.register('service2', () => ({}), {
                lifecycle: { onStop: jest.fn() }
            });
            serviceContainer.register('service3', () => ({}));

            const allInfo = serviceContainer.getAllLifecycleInfo();
            
            expect(allInfo.service1.hasLifecycleHooks).toBe(true);
            expect(allInfo.service2.hasLifecycleHooks).toBe(true);
            expect(allInfo.service3.hasLifecycleHooks).toBe(false);
            expect(Object.keys(allInfo)).toHaveLength(3);
        });
    });

    describe('Performance Monitoring', () => {
        test('should measure service resolution performance', async () => {
            serviceContainer.register('service1', () => ({}));
            serviceContainer.register('service2', () => ({}));
            serviceContainer.register('service3', () => ({}));

            const analyzer = new PerformanceAnalyzer();
            analyzer.serviceContainer = serviceContainer;

            const results = await analyzer.measureServiceResolution();
            
            expect(results.totalServices).toBe(3);
            expect(results.resolutionTimes).toHaveLength(3);
            expect(results.averageTime).toBeGreaterThan(0);
            expect(results.maxTime).toBeGreaterThan(0);
            expect(results.minTime).toBeGreaterThan(0);
        });

        test('should measure dependency graph performance', () => {
            serviceContainer.dependencyGraph.addNode('A', ['B']);
            serviceContainer.dependencyGraph.addNode('B', ['C']);
            serviceContainer.dependencyGraph.addNode('C', []);

            const analyzer = new PerformanceAnalyzer();
            analyzer.serviceContainer = serviceContainer;

            const results = analyzer.measureDependencyGraphPerformance();
            
            expect(results.topologicalSort).toBeGreaterThan(0);
            expect(results.circularDetection).toBeGreaterThan(0);
            expect(results.dependencyValidation).toBeGreaterThan(0);
            expect(results.graphStats).toBeGreaterThan(0);
        });

        test('should measure memory usage', () => {
            const analyzer = new PerformanceAnalyzer();
            analyzer.startMonitoring();

            // Create some objects to use memory
            const testArray = new Array(1000).fill('test');

            const results = analyzer.measureMemoryUsage();
            
            expect(results.current.rss).toBeDefined();
            expect(results.current.heapUsed).toBeDefined();
            expect(results.current.heapTotal).toBeDefined();
            expect(results.difference.rss).toBeDefined();
        });

        test('should measure lifecycle performance', async () => {
            const onStartMock = jest.fn();
            const onStopMock = jest.fn();

            serviceContainer.register('testService', () => ({}), {
                lifecycle: { onStart: onStartMock, onStop: onStopMock }
            });

            const analyzer = new PerformanceAnalyzer();
            analyzer.serviceContainer = serviceContainer;

            const results = await analyzer.measureLifecyclePerformance();
            
            expect(results.startup.time).toBeGreaterThan(0);
            expect(results.startup.success).toBe(true);
            expect(results.shutdown.time).toBeGreaterThan(0);
            expect(results.shutdown.success).toBe(true);
        });

        test('should generate performance report', async () => {
            serviceContainer.register('service1', () => ({}));
            serviceContainer.register('service2', () => ({}));

            const analyzer = new PerformanceAnalyzer();
            analyzer.serviceContainer = serviceContainer;

            const report = await analyzer.generatePerformanceReport();
            
            expect(report.serviceResolution).toBeDefined();
            expect(report.graphPerformance).toBeDefined();
            expect(report.memoryUsage).toBeDefined();
            expect(report.lifecyclePerformance).toBeDefined();
            expect(report.totalTime).toBeGreaterThan(0);
        });

        test('should run performance benchmarks', async () => {
            serviceContainer.register('service1', () => ({}));
            serviceContainer.register('service2', () => ({}));

            const analyzer = new PerformanceAnalyzer();
            analyzer.serviceContainer = serviceContainer;

            const stats = await analyzer.runBenchmarks(3);
            
            expect(stats.serviceResolution.mean).toBeGreaterThan(0);
            expect(stats.serviceResolution.median).toBeGreaterThan(0);
            expect(stats.graphOperations.mean).toBeGreaterThan(0);
            expect(stats.memoryUsage.mean).toBeGreaterThan(0);
        });
    });

    describe('Health Checks', () => {
        test('should check service registry health', async () => {
            serviceContainer.register('service1', () => ({}));
            serviceContainer.register('service2', () => ({}));

            const checker = new HealthChecker();
            checker.serviceContainer = serviceContainer;

            await checker.checkServiceRegistry();
            
            const check = checker.healthStatus.checks.serviceRegistry;
            expect(check.status).toBe('healthy');
            expect(check.details.totalServices).toBe(2);
        });

        test('should check service container health', async () => {
            serviceContainer.register('service1', () => ({}));
            serviceContainer.register('service2', () => ({}));

            const checker = new HealthChecker();
            checker.serviceContainer = serviceContainer;

            await checker.checkServiceContainer();
            
            const check = checker.healthStatus.checks.serviceContainer;
            expect(check.status).toBe('healthy');
            expect(check.details.totalFactories).toBe(2);
        });

        test('should check dependency graph health', async () => {
            serviceContainer.dependencyGraph.addNode('A', ['B']);
            serviceContainer.dependencyGraph.addNode('B', ['C']);
            serviceContainer.dependencyGraph.addNode('C', []);

            const checker = new HealthChecker();
            checker.serviceContainer = serviceContainer;

            await checker.checkDependencyGraph();
            
            const check = checker.healthStatus.checks.dependencyGraph;
            expect(check.status).toBe('healthy');
            expect(check.details.totalNodes).toBe(3);
        });

        test('should detect circular dependencies in health check', async () => {
            serviceContainer.dependencyGraph.addNode('A', ['B']);
            serviceContainer.dependencyGraph.addNode('B', ['C']);
            serviceContainer.dependencyGraph.addNode('C', ['A']); // Circular dependency

            const checker = new HealthChecker();
            checker.serviceContainer = serviceContainer;

            await checker.checkDependencyGraph();
            
            const check = checker.healthStatus.checks.dependencyGraph;
            expect(check.status).toBe('critical');
            expect(check.errors).toHaveLength(1);
            expect(check.errors[0]).toContain('circular dependency');
        });

        test('should check lifecycle hooks health', async () => {
            serviceContainer.register('service1', () => ({}), {
                lifecycle: { onStart: jest.fn() }
            });
            serviceContainer.register('service2', () => ({}));

            const checker = new HealthChecker();
            checker.serviceContainer = serviceContainer;

            await checker.checkLifecycleHooks();
            
            const check = checker.healthStatus.checks.lifecycleHooks;
            expect(check.status).toBe('healthy');
            expect(check.details.servicesWithLifecycle).toBe(1);
            expect(check.details.totalServices).toBe(2);
        });

        test('should check service resolution health', async () => {
            serviceContainer.register('service1', () => ({}));
            serviceContainer.register('service2', () => ({}));

            const checker = new HealthChecker();
            checker.serviceContainer = serviceContainer;

            await checker.checkServiceResolution();
            
            const check = checker.healthStatus.checks.serviceResolution;
            expect(check.status).toBe('healthy');
            expect(check.details.resolutionResults.successful).toBe(2);
            expect(check.details.resolutionResults.failed).toBe(0);
        });

        test('should check memory usage health', async () => {
            const checker = new HealthChecker();
            checker.serviceContainer = serviceContainer;

            await checker.checkMemoryUsage();
            
            const check = checker.healthStatus.checks.memoryUsage;
            expect(check.status).toBe('healthy');
            expect(check.details.current.rss).toBeDefined();
            expect(check.details.usagePercentage).toBeDefined();
        });

        test('should check performance health', async () => {
            serviceContainer.dependencyGraph.addNode('A', []);
            serviceContainer.dependencyGraph.addNode('B', []);

            const checker = new HealthChecker();
            checker.serviceContainer = serviceContainer;

            await checker.checkPerformance();
            
            const check = checker.healthStatus.checks.performance;
            expect(check.status).toBe('healthy');
            expect(check.details.topologicalSortTime).toBeDefined();
        });

        test('should determine overall health status', async () => {
            serviceContainer.register('service1', () => ({}));
            serviceContainer.register('service2', () => ({}));

            const checker = new HealthChecker();
            checker.serviceContainer = serviceContainer;

            await checker.runHealthCheck();
            
            expect(checker.healthStatus.overall).toBe('healthy');
            expect(checker.healthStatus.summary.total).toBeGreaterThan(0);
            expect(checker.healthStatus.summary.healthy).toBeGreaterThan(0);
        });

        test('should handle critical health issues', async () => {
            // Create a circular dependency to trigger critical status
            serviceContainer.dependencyGraph.addNode('A', ['B']);
            serviceContainer.dependencyGraph.addNode('B', ['A']);

            const checker = new HealthChecker();
            checker.serviceContainer = serviceContainer;

            await checker.runHealthCheck();
            
            expect(checker.healthStatus.overall).toBe('critical');
            expect(checker.healthStatus.summary.critical).toBeGreaterThan(0);
        });
    });

    describe('DevTools Integration', () => {
        test('should validate dependencies', async () => {
            serviceContainer.register('service1', () => ({}));
            serviceContainer.register('service2', () => ({}));

            const validator = new DependencyValidator();
            validator.serviceContainer = serviceContainer;

            const result = await validator.validate();
            
            expect(result).toBe(0); // Exit code 0 means success
        });

        test('should generate dependency graph visualization', () => {
            serviceContainer.dependencyGraph.addNode('A', ['B']);
            serviceContainer.dependencyGraph.addNode('B', ['C']);
            serviceContainer.dependencyGraph.addNode('C', []);

            const visualizer = new DependencyGraphVisualizer();
            visualizer.serviceContainer = serviceContainer;

            const dot = visualizer.generateDotFormat();
            expect(dot).toContain('digraph DependencyGraph');
            expect(dot).toContain('A -> B');
            expect(dot).toContain('B -> C');
        });

        test('should generate ASCII dependency tree', () => {
            serviceContainer.dependencyGraph.addNode('A', ['B']);
            serviceContainer.dependencyGraph.addNode('B', ['C']);
            serviceContainer.dependencyGraph.addNode('C', []);

            const visualizer = new DependencyGraphVisualizer();
            visualizer.serviceContainer = serviceContainer;

            const tree = visualizer.generateAsciiTree();
            expect(tree).toContain('Dependency Tree');
            expect(tree).toContain('A');
            expect(tree).toContain('B');
            expect(tree).toContain('C');
        });

        test('should generate dependency statistics', () => {
            serviceContainer.dependencyGraph.addNode('A', ['B']);
            serviceContainer.dependencyGraph.addNode('B', ['C']);
            serviceContainer.dependencyGraph.addNode('C', []);

            const visualizer = new DependencyGraphVisualizer();
            visualizer.serviceContainer = serviceContainer;

            const stats = visualizer.generateStatistics();
            expect(stats).toContain('Dependency Statistics');
            expect(stats).toContain('Total Services: 3');
        });
    });

    describe('Error Handling and Edge Cases', () => {
        test('should handle missing lifecycle hooks gracefully', async () => {
            serviceContainer.register('testService', () => ({}));

            const results = await serviceContainer.startAllServices();
            expect(results.skipped).toContain('testService');
            expect(results.started).toHaveLength(0);
        });

        test('should handle lifecycle hook exceptions', async () => {
            const lifecycleHooks = {
                onStart: jest.fn().mockImplementation(() => {
                    throw new Error('Start hook failed');
                })
            };

            serviceContainer.register('testService', () => ({}), {
                lifecycle: lifecycleHooks
            });

            const results = await serviceContainer.startAllServices();
            expect(results.failed).toHaveLength(1);
            expect(results.failed[0].service).toBe('testService');
        });

        test('should handle service resolution failures in lifecycle', async () => {
            const lifecycleHooks = {
                onStart: jest.fn()
            };

            // Register a service that will fail to resolve
            serviceContainer.register('testService', () => {
                throw new Error('Service creation failed');
            }, {
                lifecycle: lifecycleHooks
            });

            const results = await serviceContainer.startAllServices();
            expect(results.failed).toHaveLength(1);
            expect(results.failed[0].service).toBe('testService');
        });

        test('should handle concurrent lifecycle operations', async () => {
            const lifecycleHooks = {
                onStart: jest.fn(),
                onStop: jest.fn()
            };

            serviceContainer.register('service1', () => ({}), {
                lifecycle: lifecycleHooks
            });
            serviceContainer.register('service2', () => ({}), {
                lifecycle: lifecycleHooks
            });

            // Start and stop concurrently
            const [startResults, stopResults] = await Promise.all([
                serviceContainer.startAllServices(),
                serviceContainer.stopAllServices()
            ]);

            expect(startResults.started.length + startResults.failed.length).toBe(2);
            expect(stopResults.stopped.length + stopResults.failed.length).toBe(2);
        });
    });
}); 