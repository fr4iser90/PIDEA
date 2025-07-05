/**
 * Performance and Load Testing for Task Management System
 */
const Application = require('@/Application');
const path = require('path');
const os = require('os');

describe('Task Management System Performance Tests', () => {
    let application;
    let testProjectPath;

    beforeAll(async () => {
        // Initialize application
        application = new Application();
        await application.initialize();

        // Create test project
        testProjectPath = await createTestProject();
    });

    afterAll(async () => {
        await cleanupTestProject(testProjectPath);
        await application.cleanup();
    });

    beforeEach(async () => {
        await application.reset();
    });

    describe('Concurrent Task Creation', () => {
        test('should handle 100 concurrent task creations', async () => {
            const numTasks = 100;
            const startTime = Date.now();

            const tasks = Array.from({ length: numTasks }, (_, i) => ({
                title: `Concurrent Task ${i}`,
                description: `Task ${i} for concurrent testing`,
                type: 'analysis',
                priority: 'normal',
                createdBy: 'load-test-user'
            }));

            const results = await Promise.all(
                tasks.map(task => application.commandBus.execute('CreateTaskCommand', task))
            );

            const endTime = Date.now();
            const duration = endTime - startTime;

            // Verify all tasks were created successfully
            expect(results).toHaveLength(numTasks);
            expect(results.every(result => result.success)).toBe(true);

            // Verify performance requirements
            expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
            expect(duration / numTasks).toBeLessThan(50); // Average time per task < 50ms

            console.log(`Created ${numTasks} tasks in ${duration}ms (${duration / numTasks}ms per task)`);
        });

        test('should handle 500 concurrent task creations', async () => {
            const numTasks = 500;
            const startTime = Date.now();

            const tasks = Array.from({ length: numTasks }, (_, i) => ({
                title: `Load Task ${i}`,
                description: `Task ${i} for load testing`,
                type: 'script',
                priority: 'normal',
                createdBy: 'load-test-user'
            }));

            const results = await Promise.all(
                tasks.map(task => application.commandBus.execute('CreateTaskCommand', task))
            );

            const endTime = Date.now();
            const duration = endTime - startTime;

            expect(results).toHaveLength(numTasks);
            expect(results.every(result => result.success)).toBe(true);
            expect(duration).toBeLessThan(10000); // Should complete within 10 seconds

            console.log(`Created ${numTasks} tasks in ${duration}ms (${duration / numTasks}ms per task)`);
        });

        test('should handle mixed priority concurrent task creation', async () => {
            const numTasks = 200;
            const priorities = ['low', 'normal', 'high', 'critical'];
            
            const startTime = Date.now();

            const tasks = Array.from({ length: numTasks }, (_, i) => ({
                title: `Mixed Priority Task ${i}`,
                description: `Task ${i} with mixed priority`,
                type: 'analysis',
                priority: priorities[i % priorities.length],
                createdBy: 'load-test-user'
            }));

            const results = await Promise.all(
                tasks.map(task => application.commandBus.execute('CreateTaskCommand', task))
            );

            const endTime = Date.now();
            const duration = endTime - startTime;

            expect(results).toHaveLength(numTasks);
            expect(results.every(result => result.success)).toBe(true);
            expect(duration).toBeLessThan(5000);

            console.log(`Created ${numTasks} mixed priority tasks in ${duration}ms`);
        });
    });

    describe('Concurrent Task Execution', () => {
        test('should handle 50 concurrent task executions', async () => {
            // First create tasks
            const numTasks = 50;
            const createPromises = Array.from({ length: numTasks }, (_, i) => 
                application.commandBus.execute('CreateTaskCommand', {
                    title: `Execution Task ${i}`,
                    type: 'analysis',
                    createdBy: 'load-test-user'
                })
            );

            const createdTasks = await Promise.all(createPromises);
            const taskIds = createdTasks.map(result => result.task.id);

            // Then execute them concurrently
            const startTime = Date.now();

            const executionPromises = taskIds.map(taskId =>
                application.commandBus.execute('ExecuteTaskCommand', {
                    taskId,
                    executedBy: 'load-test-user'
                })
            );

            const results = await Promise.all(executionPromises);

            const endTime = Date.now();
            const duration = endTime - startTime;

            expect(results).toHaveLength(numTasks);
            expect(results.every(result => result.success)).toBe(true);
            expect(duration).toBeLessThan(15000); // Should complete within 15 seconds

            console.log(`Executed ${numTasks} tasks in ${duration}ms (${duration / numTasks}ms per task)`);
        });

        test('should handle concurrent task execution with different types', async () => {
            const taskTypes = ['analysis', 'script', 'optimization', 'security', 'refactoring'];
            const numTasks = 100;

            // Create tasks with different types
            const createPromises = Array.from({ length: numTasks }, (_, i) => 
                application.commandBus.execute('CreateTaskCommand', {
                    title: `Type Task ${i}`,
                    type: taskTypes[i % taskTypes.length],
                    createdBy: 'load-test-user'
                })
            );

            const createdTasks = await Promise.all(createPromises);
            const taskIds = createdTasks.map(result => result.task.id);

            // Execute concurrently
            const startTime = Date.now();

            const executionPromises = taskIds.map(taskId =>
                application.commandBus.execute('ExecuteTaskCommand', {
                    taskId,
                    executedBy: 'load-test-user'
                })
            );

            const results = await Promise.all(executionPromises);

            const endTime = Date.now();
            const duration = endTime - startTime;

            expect(results).toHaveLength(numTasks);
            expect(results.every(result => result.success)).toBe(true);
            expect(duration).toBeLessThan(20000);

            console.log(`Executed ${numTasks} mixed type tasks in ${duration}ms`);
        });
    });

    describe('Concurrent Auto Mode Operations', () => {
        test('should handle 10 concurrent auto mode operations', async () => {
            const numOperations = 10;
            const startTime = Date.now();

            const operations = Array.from({ length: numOperations }, (_, i) => ({
                projectPath: testProjectPath,
                mode: 'analysis',
                options: {
                    aiModel: 'gpt-4',
                    dryRun: true
                }
            }));

            const results = await Promise.all(
                operations.map(op => application.commandBus.execute('AutoModeCommand', op))
            );

            const endTime = Date.now();
            const duration = endTime - startTime;

            expect(results).toHaveLength(numOperations);
            expect(results.every(result => result.session)).toBe(true);
            expect(duration).toBeLessThan(30000); // Should complete within 30 seconds

            console.log(`Completed ${numOperations} auto mode operations in ${duration}ms`);
        });

        test('should handle concurrent auto mode with different modes', async () => {
            const modes = ['analysis', 'optimization', 'security', 'refactoring'];
            const numOperations = 20;

            const operations = Array.from({ length: numOperations }, (_, i) => ({
                projectPath: testProjectPath,
                mode: modes[i % modes.length],
                options: {
                    aiModel: 'gpt-4',
                    dryRun: true
                }
            }));

            const startTime = Date.now();

            const results = await Promise.all(
                operations.map(op => application.commandBus.execute('AutoModeCommand', op))
            );

            const endTime = Date.now();
            const duration = endTime - startTime;

            expect(results).toHaveLength(numOperations);
            expect(results.every(result => result.session)).toBe(true);
            expect(duration).toBeLessThan(60000); // Should complete within 60 seconds

            console.log(`Completed ${numOperations} mixed mode auto operations in ${duration}ms`);
        });
    });

    describe('Database Performance', () => {
        test('should handle large dataset queries efficiently', async () => {
            // Create large dataset
            const numTasks = 1000;
            const createPromises = Array.from({ length: numTasks }, (_, i) => 
                application.commandBus.execute('CreateTaskCommand', {
                    title: `Dataset Task ${i}`,
                    type: 'analysis',
                    priority: ['low', 'normal', 'high', 'critical'][i % 4],
                    createdBy: 'load-test-user'
                })
            );

            await Promise.all(createPromises);

            // Test query performance
            const startTime = Date.now();

            const query = {
                page: 1,
                limit: 100,
                filters: {}
            };

            const result = await application.queryBus.execute('GetTasksQuery', query);

            const endTime = Date.now();
            const duration = endTime - startTime;

            expect(result.tasks).toBeDefined();
            expect(result.total).toBeGreaterThanOrEqual(numTasks);
            expect(duration).toBeLessThan(1000); // Should complete within 1 second

            console.log(`Queried ${result.total} tasks in ${duration}ms`);
        });

        test('should handle filtered queries efficiently', async () => {
            // Create tasks with different priorities
            const priorities = ['low', 'normal', 'high', 'critical'];
            const numTasks = 500;

            const createPromises = Array.from({ length: numTasks }, (_, i) => 
                application.commandBus.execute('CreateTaskCommand', {
                    title: `Filter Task ${i}`,
                    type: 'analysis',
                    priority: priorities[i % priorities.length],
                    createdBy: 'load-test-user'
                })
            );

            await Promise.all(createPromises);

            // Test filtered queries
            const startTime = Date.now();

            const highPriorityQuery = {
                page: 1,
                limit: 50,
                filters: { priority: 'high' }
            };

            const result = await application.queryBus.execute('GetTasksQuery', highPriorityQuery);

            const endTime = Date.now();
            const duration = endTime - startTime;

            expect(result.tasks).toBeDefined();
            expect(result.tasks.every(task => task.priority === 'high')).toBe(true);
            expect(duration).toBeLessThan(500); // Should complete within 500ms

            console.log(`Filtered ${result.tasks.length} high priority tasks in ${duration}ms`);
        });
    });

    describe('AI Service Performance', () => {
        test('should handle concurrent AI requests efficiently', async () => {
            const numRequests = 20;
            const startTime = Date.now();

            const requests = Array.from({ length: numRequests }, (_, i) => ({
                projectPath: testProjectPath,
                analysisType: 'full',
                includeAI: true,
                options: { aiModel: 'gpt-4' }
            }));

            const results = await Promise.all(
                requests.map(req => application.commandBus.execute('AnalyzeProjectCommand', req))
            );

            const endTime = Date.now();
            const duration = endTime - startTime;

            expect(results).toHaveLength(numRequests);
            expect(results.every(result => result.analysis)).toBe(true);
            expect(duration).toBeLessThan(30000); // Should complete within 30 seconds

            console.log(`Completed ${numRequests} AI analysis requests in ${duration}ms`);
        });

        test('should handle AI model switching efficiently', async () => {
            const models = ['gpt-4', 'gpt-3.5-turbo', 'claude-3'];
            const numRequests = 15;

            const requests = Array.from({ length: numRequests }, (_, i) => ({
                projectPath: testProjectPath,
                analysisType: 'full',
                includeAI: true,
                options: { aiModel: models[i % models.length] }
            }));

            const startTime = Date.now();

            const results = await Promise.all(
                requests.map(req => application.commandBus.execute('AnalyzeProjectCommand', req))
            );

            const endTime = Date.now();
            const duration = endTime - startTime;

            expect(results).toHaveLength(numRequests);
            expect(results.every(result => result.analysis)).toBe(true);
            expect(duration).toBeLessThan(45000); // Should complete within 45 seconds

            console.log(`Completed ${numRequests} multi-model AI requests in ${duration}ms`);
        });
    });

    describe('Memory Usage', () => {
        test('should maintain stable memory usage during load', async () => {
            const initialMemory = process.memoryUsage();
            const numOperations = 100;

            const operations = Array.from({ length: numOperations }, (_, i) => 
                application.commandBus.execute('CreateTaskCommand', {
                    title: `Memory Task ${i}`,
                    type: 'analysis',
                    createdBy: 'load-test-user'
                })
            );

            await Promise.all(operations);

            const finalMemory = process.memoryUsage();
            const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

            // Memory increase should be reasonable (less than 50MB)
            expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);

            console.log(`Memory usage: ${Math.round(memoryIncrease / 1024 / 1024)}MB increase`);
        });

        test('should handle memory cleanup after large operations', async () => {
            const initialMemory = process.memoryUsage();

            // Perform large operation
            const numTasks = 500;
            const createPromises = Array.from({ length: numTasks }, (_, i) => 
                application.commandBus.execute('CreateTaskCommand', {
                    title: `Cleanup Task ${i}`,
                    type: 'analysis',
                    createdBy: 'load-test-user'
                })
            );

            await Promise.all(createPromises);

            // Force garbage collection if available
            if (global.gc) {
                global.gc();
            }

            const finalMemory = process.memoryUsage();
            const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

            // Memory should be reasonable after cleanup
            expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);

            console.log(`Memory after cleanup: ${Math.round(memoryIncrease / 1024 / 1024)}MB increase`);
        });
    });

    describe('Response Time Performance', () => {
        test('should respond to simple queries within 100ms', async () => {
            const startTime = Date.now();

            const query = {
                page: 1,
                limit: 10,
                filters: {}
            };

            await application.queryBus.execute('GetTasksQuery', query);

            const endTime = Date.now();
            const duration = endTime - startTime;

            expect(duration).toBeLessThan(100); // Should respond within 100ms

            console.log(`Simple query response time: ${duration}ms`);
        });

        test('should respond to task creation within 200ms', async () => {
            const startTime = Date.now();

            await application.commandBus.execute('CreateTaskCommand', {
                title: 'Response Time Test',
                type: 'analysis',
                createdBy: 'load-test-user'
            });

            const endTime = Date.now();
            const duration = endTime - startTime;

            expect(duration).toBeLessThan(200); // Should respond within 200ms

            console.log(`Task creation response time: ${duration}ms`);
        });

        test('should respond to task execution within 500ms', async () => {
            // Create task first
            const createResult = await application.commandBus.execute('CreateTaskCommand', {
                title: 'Execution Response Test',
                type: 'analysis',
                createdBy: 'load-test-user'
            });

            const startTime = Date.now();

            await application.commandBus.execute('ExecuteTaskCommand', {
                taskId: createResult.task.id,
                executedBy: 'load-test-user'
            });

            const endTime = Date.now();
            const duration = endTime - startTime;

            expect(duration).toBeLessThan(500); // Should respond within 500ms

            console.log(`Task execution response time: ${duration}ms`);
        });
    });

    describe('Scalability Tests', () => {
        test('should scale linearly with increasing load', async () => {
            const loads = [10, 50, 100, 200];
            const results = [];

            for (const load of loads) {
                const startTime = Date.now();

                const operations = Array.from({ length: load }, (_, i) => 
                    application.commandBus.execute('CreateTaskCommand', {
                        title: `Scalability Task ${i}`,
                        type: 'analysis',
                        createdBy: 'load-test-user'
                    })
                );

                await Promise.all(operations);

                const endTime = Date.now();
                const duration = endTime - startTime;

                results.push({ load, duration, avgTime: duration / load });
            }

            // Verify linear scaling (each load should take roughly proportional time)
            for (let i = 1; i < results.length; i++) {
                const ratio = results[i].avgTime / results[i - 1].avgTime;
                expect(ratio).toBeLessThan(2); // Should not degrade more than 2x
            }

            console.log('Scalability results:', results);
        });

        test('should maintain performance under sustained load', async () => {
            const numBatches = 10;
            const batchSize = 50;
            const results = [];

            for (let batch = 0; batch < numBatches; batch++) {
                const startTime = Date.now();

                const operations = Array.from({ length: batchSize }, (_, i) => 
                    application.commandBus.execute('CreateTaskCommand', {
                        title: `Sustained Task ${batch}-${i}`,
                        type: 'analysis',
                        createdBy: 'load-test-user'
                    })
                );

                await Promise.all(operations);

                const endTime = Date.now();
                const duration = endTime - startTime;

                results.push({ batch, duration, avgTime: duration / batchSize });
            }

            // Verify consistent performance across batches
            const avgTimes = results.map(r => r.avgTime);
            const maxAvg = Math.max(...avgTimes);
            const minAvg = Math.min(...avgTimes);

            expect(maxAvg / minAvg).toBeLessThan(3); // Should not vary more than 3x

            console.log('Sustained load results:', results);
        });
    });
});

// Helper function to create test project
async function createTestProject() {
    const fs = require('fs').promises;
    const projectPath = path.join(os.tmpdir(), `perf-test-project-${Date.now()}`);
    
    await fs.mkdir(projectPath, { recursive: true });
    
    const packageJson = {
        name: 'perf-test-project',
        version: '1.0.0',
        dependencies: {
            express: '^4.17.1'
        }
    };
    
    await fs.writeFile(
        path.join(projectPath, 'package.json'),
        JSON.stringify(packageJson, null, 2)
    );
    
    return projectPath;
}

// Helper function to cleanup test project
async function cleanupTestProject(projectPath) {
    try {
        const fs = require('fs').promises;
        await fs.rm(projectPath, { recursive: true, force: true });
    } catch (error) {
        // Ignore cleanup errors
    }
} 