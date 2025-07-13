const request = require('supertest');
const { Application } = require('../../backend/Application');

describe('Categories System Integration Validation', () => {
    let app;
    let server;

    beforeAll(async () => {
        app = new Application();
        await app.initialize();
        server = app.server;
    });

    afterAll(async () => {
        await app.stop();
    });

    describe('API Controllers', () => {
        test('AutoModeController should use Categories system', async () => {
            const response = await request(server)
                .post('/api/auto/execute')
                .send({
                    projectPath: process.cwd(),
                    mode: 'analysis'
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.executionMethod).toBe('categories');
        });

        test('TaskController should use Categories system', async () => {
            // Create a test task first
            const createResponse = await request(server)
                .post('/api/projects/test-project/tasks')
                .send({
                    title: 'Test Task',
                    description: 'Test Description',
                    type: 'analysis'
                });

            expect(createResponse.status).toBe(201);
            const taskId = createResponse.body.data.id;

            // Execute the task
            const executeResponse = await request(server)
                .post(`/api/projects/test-project/tasks/${taskId}/execute`)
                .send({});

            expect(executeResponse.status).toBe(200);
            expect(executeResponse.body.success).toBe(true);
            expect(executeResponse.body.data.metadata.executionMethod).toBe('categories');
        });
    });

    describe('Service Dependencies', () => {
        test('WorkflowOrchestrationService should not have unified workflow dependencies', () => {
            const WorkflowOrchestrationService = require('../../backend/domain/services/WorkflowOrchestrationService');
            const service = new WorkflowOrchestrationService();
            
            expect(service.unifiedHandler).toBeUndefined();
            expect(service.stepRegistry).toBeDefined();
            expect(service.frameworkRegistry).toBeDefined();
        });

        test('TaskService should not have unified workflow dependencies', () => {
            const TaskService = require('../../backend/domain/services/TaskService');
            const service = new TaskService();
            
            expect(service.unifiedHandler).toBeUndefined();
            expect(service.stepRegistry).toBeDefined();
            expect(service.frameworkRegistry).toBeDefined();
        });
    });

    describe('Categories System Functionality', () => {
        test('StepRegistry should be functional', async () => {
            const StepRegistry = require('../../backend/domain/steps/StepRegistry');
            const registry = new StepRegistry();
            
            await registry.loadStepsFromCategories();
            const steps = registry.getAllSteps();
            
            expect(steps.length).toBeGreaterThan(0);
        });

        test('FrameworkRegistry should be functional', async () => {
            const FrameworkRegistry = require('../../backend/domain/frameworks/FrameworkRegistry');
            const registry = new FrameworkRegistry();
            
            const frameworks = registry.getAllFrameworks();
            expect(Array.isArray(frameworks)).toBe(true);
        });
    });

    describe('Import Validation', () => {
        test('Application.js should not import unified workflow modules', () => {
            const fs = require('fs');
            const content = fs.readFileSync('backend/Application.js', 'utf8');
            
            expect(content).not.toContain('UnifiedWorkflowService');
            expect(content).not.toContain('UnifiedWorkflowHandler');
            expect(content).not.toContain('unifiedWorkflowService');
        });

        test('ServiceRegistry should not register unified workflow services', () => {
            const fs = require('fs');
            const content = fs.readFileSync('backend/infrastructure/di/ServiceRegistry.js', 'utf8');
            
            expect(content).not.toContain('unifiedWorkflowService');
            expect(content).not.toContain('UnifiedWorkflowService');
        });
    });

    describe('API Response Validation', () => {
        test('Auto mode responses should include executionMethod', async () => {
            const response = await request(server)
                .post('/api/auto/execute')
                .send({
                    projectPath: process.cwd(),
                    mode: 'analysis'
                });

            expect(response.body.data).toHaveProperty('executionMethod');
            expect(response.body.data.executionMethod).toBe('categories');
        });

        test('Task execution responses should include executionMethod', async () => {
            // Create and execute a test task
            const createResponse = await request(server)
                .post('/api/projects/test-project/tasks')
                .send({
                    title: 'Integration Test Task',
                    description: 'Test Description',
                    type: 'analysis'
                });

            const taskId = createResponse.body.data.id;
            const executeResponse = await request(server)
                .post(`/api/projects/test-project/tasks/${taskId}/execute`)
                .send({});

            expect(executeResponse.body.data.metadata).toHaveProperty('executionMethod');
            expect(executeResponse.body.data.metadata.executionMethod).toBe('categories');
        });
    });

    describe('Error Handling', () => {
        test('Should handle missing project path gracefully', async () => {
            const response = await request(server)
                .post('/api/auto/execute')
                .send({
                    mode: 'analysis'
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        test('Should handle invalid task execution gracefully', async () => {
            const response = await request(server)
                .post('/api/projects/test-project/tasks/invalid-id/execute')
                .send({});

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });
    });
}); 