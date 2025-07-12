/**
 * Migration End-to-End Tests
 * 
 * Tests complete user workflows from API request to final result,
 * including real-world scenarios with migrated handlers and unified workflows.
 */

const { expect } = require('chai');
const request = require('supertest');
const express = require('express');
const HandlersController = require('../../../backend/presentation/api/handlers');
const WorkflowsController = require('../../../backend/presentation/api/workflows');
const { createIntegrationSystem } = require('../../../backend/domain/workflows/integration');
const { UnifiedWorkflowHandler } = require('../../../backend/domain/workflows/handlers');

describe('Migration End-to-End Tests', () => {
  let app;
  let handlersController;
  let workflowsController;
  let integrationSystem;

  before(async () => {
    // Create Express app for testing
    app = express();
    app.use(express.json());

    // Initialize integration system
    integrationSystem = createIntegrationSystem({
      logger: console,
      eventBus: { emit: () => {}, subscribe: () => {} }
    });

    await integrationSystem.initialize();

    // Initialize controllers
    handlersController = new HandlersController({
      unifiedHandler: integrationSystem.manager.unifiedHandler,
      handlerRegistry: integrationSystem.manager.unifiedHandler.handlerRegistry,
      handlerFactory: integrationSystem.manager.unifiedHandler.handlerFactory,
      logger: console
    });

    workflowsController = new WorkflowsController({
      integrationSystem,
      unifiedHandler: integrationSystem.manager.unifiedHandler,
      stepRegistry: integrationSystem.manager.stepRegistry,
      logger: console
    });

    // Mount API routes
    app.use('/api/handlers', handlersController.getRouter());
    app.use('/api/workflows', workflowsController.getRouter());
  });

  after(async () => {
    await integrationSystem.cleanup();
  });

  describe('Complete Migration Workflow', () => {
    it('should execute complete migration workflow end-to-end', async () => {
      // Step 1: Check migration status
      const statusResponse = await request(app)
        .get('/api/handlers/migration/status')
        .expect(200);

      expect(statusResponse.body.success).to.be.true;
      expect(statusResponse.body.data).to.be.an('object');

      // Step 2: Get migrated handlers
      const handlersResponse = await request(app)
        .get('/api/handlers/migration/handlers')
        .query({ status: 'completed' })
        .expect(200);

      expect(handlersResponse.body.success).to.be.true;
      expect(handlersResponse.body.data).to.be.an('array');
      expect(handlersResponse.body.count).to.be.greaterThan(0);

      // Step 3: Execute analysis workflow
      const analysisResponse = await request(app)
        .post('/api/handlers/execute')
        .send({
          request: {
            type: 'architecture-analysis',
            projectPath: '/test/project',
            options: { depth: 'comprehensive' }
          }
        })
        .expect(200);

      expect(analysisResponse.body.success).to.be.true;
      expect(analysisResponse.body.data).to.be.an('object');

      // Step 4: Execute VibeCoder workflow
      const vibecoderResponse = await request(app)
        .post('/api/handlers/execute')
        .send({
          request: {
            type: 'vibecoder-analyze',
            projectPath: '/test/project',
            options: { comprehensive: true }
          }
        })
        .expect(200);

      expect(vibecoderResponse.body.success).to.be.true;
      expect(vibecoderResponse.body.data).to.be.an('object');

      // Step 5: Execute generate workflow
      const generateResponse = await request(app)
        .post('/api/handlers/execute')
        .send({
          request: {
            type: 'generate-script',
            projectPath: '/test/project',
            options: { framework: 'nodejs' }
          }
        })
        .expect(200);

      expect(generateResponse.body.success).to.be.true;
      expect(generateResponse.body.data).to.be.an('object');

      // Step 6: Check system health
      const healthResponse = await request(app)
        .get('/api/handlers/health')
        .expect(200);

      expect(healthResponse.body.success).to.be.true;
      expect(healthResponse.body.data.status).to.equal('healthy');
    });

    it('should handle complete development workflow', async () => {
      const projectId = 'e2e-development-workflow';

      // Step 1: Analyze project architecture
      const analysisResponse = await request(app)
        .post('/api/handlers/execute')
        .send({
          request: {
            type: 'architecture-analysis',
            projectPath: projectId,
            options: { depth: 'comprehensive' }
          }
        })
        .expect(200);

      expect(analysisResponse.body.success).to.be.true;

      // Step 2: Analyze code quality
      const qualityResponse = await request(app)
        .post('/api/handlers/execute')
        .send({
          request: {
            type: 'code-quality-analysis',
            projectPath: projectId,
            options: { linting: true, complexity: true }
          }
        })
        .expect(200);

      expect(qualityResponse.body.success).to.be.true;

      // Step 3: Generate tests based on analysis
      const testResponse = await request(app)
        .post('/api/handlers/execute')
        .send({
          request: {
            type: 'generate-tests',
            projectPath: projectId,
            options: { 
              framework: 'jest',
              coverage: 80,
              basedOnAnalysis: true
            }
          }
        })
        .expect(200);

      expect(testResponse.body.success).to.be.true;

      // Step 4: Execute VibeCoder refactoring
      const refactorResponse = await request(app)
        .post('/api/handlers/execute')
        .send({
          request: {
            type: 'vibecoder-refactor',
            projectPath: projectId,
            options: { 
              strategy: 'comprehensive',
              validateResults: true
            }
          }
        })
        .expect(200);

      expect(refactorResponse.body.success).to.be.true;

      // Step 5: Generate documentation
      const docResponse = await request(app)
        .post('/api/handlers/execute')
        .send({
          request: {
            type: 'generate-documentation',
            projectPath: projectId,
            options: { 
              format: 'markdown',
              includeArchitecture: true
            }
          }
        })
        .expect(200);

      expect(docResponse.body.success).to.be.true;
    });
  });

  describe('API Integration Testing', () => {
    it('should provide comprehensive handler management', async () => {
      // List all handlers
      const listResponse = await request(app)
        .get('/api/handlers/list')
        .expect(200);

      expect(listResponse.body.success).to.be.true;
      expect(listResponse.body.data).to.be.an('array');
      expect(listResponse.body.count).to.be.greaterThan(0);

      // Get handler types
      const typesResponse = await request(app)
        .get('/api/handlers/types')
        .expect(200);

      expect(typesResponse.body.success).to.be.true;
      expect(typesResponse.body.data).to.be.an('array');
      expect(typesResponse.body.count).to.be.greaterThan(0);

      // Get handler metadata
      const handlerType = listResponse.body.data[0].type;
      const metadataResponse = await request(app)
        .get(`/api/handlers/${handlerType}/metadata`)
        .expect(200);

      expect(metadataResponse.body.success).to.be.true;
      expect(metadataResponse.body.data).to.be.an('object');
      expect(metadataResponse.body.data.migrationStatus).to.be.a('string');
      expect(metadataResponse.body.data.automationLevel).to.be.a('string');
    });

    it('should provide comprehensive workflow management', async () => {
      // List workflows
      const listResponse = await request(app)
        .get('/api/workflows/list')
        .expect(200);

      expect(listResponse.body.success).to.be.true;
      expect(listResponse.body.data).to.be.an('object');

      // Get workflow types
      const typesResponse = await request(app)
        .get('/api/workflows/types')
        .expect(200);

      expect(typesResponse.body.success).to.be.true;
      expect(typesResponse.body.data).to.be.an('array');
      expect(typesResponse.body.data).to.include('analysis');
      expect(typesResponse.body.data).to.include('vibecoder');
      expect(typesResponse.body.data).to.include('unified');

      // Get migration status
      const migrationResponse = await request(app)
        .get('/api/workflows/migration/status')
        .expect(200);

      expect(migrationResponse.body.success).to.be.true;
      expect(migrationResponse.body.data).to.be.an('object');
      expect(migrationResponse.body.data.overall.status).to.equal('completed');
    });

    it('should support batch operations', async () => {
      // Execute batch handlers
      const batchResponse = await request(app)
        .post('/api/handlers/execute/batch')
        .send({
          handlers: [
            {
              request: {
                type: 'architecture-analysis',
                projectPath: '/test/project1'
              }
            },
            {
              request: {
                type: 'code-quality-analysis',
                projectPath: '/test/project2'
              }
            },
            {
              request: {
                type: 'vibecoder-analyze',
                projectPath: '/test/project3'
              }
            }
          ]
        })
        .expect(200);

      expect(batchResponse.body.success).to.be.true;
      expect(batchResponse.body.data).to.be.an('array');
      expect(batchResponse.body.count).to.equal(3);

      batchResponse.body.data.forEach(result => {
        expect(result.success).to.be.true;
        expect(result.data).to.be.an('object');
      });
    });
  });

  describe('Automation Level Testing', () => {
    it('should provide automation level information', async () => {
      // Get automation levels
      const levelsResponse = await request(app)
        .get('/api/handlers/automation/levels')
        .expect(200);

      expect(levelsResponse.body.success).to.be.true;
      expect(levelsResponse.body.data).to.be.an('array');
      expect(levelsResponse.body.data).to.include('basic');
      expect(levelsResponse.body.data).to.include('enhanced');
      expect(levelsResponse.body.data).to.include('full');

      // Get handlers by automation level
      const fullHandlersResponse = await request(app)
        .get('/api/handlers/automation/full/handlers')
        .expect(200);

      expect(fullHandlersResponse.body.success).to.be.true;
      expect(fullHandlersResponse.body.data).to.be.an('array');
      expect(fullHandlersResponse.body.count).to.be.greaterThan(0);

      // Verify all full automation handlers are migrated
      fullHandlersResponse.body.data.forEach(handler => {
        expect(handler.automationLevel).to.equal('full');
        expect(handler.migrationStatus).to.be.oneOf(['completed', 'validated']);
      });
    });

    it('should execute handlers with appropriate automation levels', async () => {
      // Test full automation handler
      const fullResponse = await request(app)
        .post('/api/handlers/execute')
        .send({
          request: {
            type: 'architecture-analysis',
            projectPath: '/test/project',
            automationLevel: 'full'
          }
        })
        .expect(200);

      expect(fullResponse.body.success).to.be.true;

      // Test enhanced automation handler
      const enhancedResponse = await request(app)
        .post('/api/handlers/execute')
        .send({
          request: {
            type: 'unified_workflow',
            projectPath: '/test/project',
            automationLevel: 'enhanced'
          }
        })
        .expect(200);

      expect(enhancedResponse.body.success).to.be.true;
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle invalid requests gracefully', async () => {
      // Test invalid handler type
      const invalidHandlerResponse = await request(app)
        .post('/api/handlers/execute')
        .send({
          request: {
            type: 'invalid_handler_type',
            projectPath: '/test/project'
          }
        })
        .expect(200);

      expect(invalidHandlerResponse.body.success).to.be.false;
      expect(invalidHandlerResponse.body.data.error).to.be.a('string');

      // Test invalid workflow
      const invalidWorkflowResponse = await request(app)
        .post('/api/workflows/execute')
        .send({
          workflow: null
        })
        .expect(400);

      expect(invalidWorkflowResponse.body.success).to.be.false;
      expect(invalidWorkflowResponse.body.error).to.be.a('string');
    });

    it('should handle system errors gracefully', async () => {
      // Test with invalid project path
      const errorResponse = await request(app)
        .post('/api/handlers/execute')
        .send({
          request: {
            type: 'architecture-analysis',
            projectPath: '/invalid/path/that/does/not/exist'
          }
        })
        .expect(200);

      expect(errorResponse.body.success).to.be.false;
      expect(errorResponse.body.data.error).to.be.a('string');
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle concurrent requests', async () => {
      const requests = [
        { type: 'architecture-analysis', projectPath: '/test/project1' },
        { type: 'code-quality-analysis', projectPath: '/test/project2' },
        { type: 'vibecoder-analyze', projectPath: '/test/project3' },
        { type: 'generate-script', projectPath: '/test/project4' },
        { type: 'tech-stack-analysis', projectPath: '/test/project5' }
      ];

      const promises = requests.map(req => 
        request(app)
          .post('/api/handlers/execute')
          .send({ request: req })
      );

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).to.equal(200);
        expect(response.body.success).to.be.true;
      });
    });

    it('should maintain performance under load', async () => {
      const startTime = Date.now();
      
      // Execute multiple requests
      for (let i = 0; i < 10; i++) {
        await request(app)
          .post('/api/handlers/execute')
          .send({
            request: {
              type: 'architecture-analysis',
              projectPath: `/test/project${i}`
            }
          });
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (10 seconds)
      expect(duration).to.be.lessThan(10000);
    });
  });

  describe('Migration Validation', () => {
    it('should validate migration completeness', async () => {
      // Validate migration
      const validationResponse = await request(app)
        .post('/api/workflows/migration/validate')
        .send({
          components: ['handlers', 'steps', 'workflows']
        })
        .expect(200);

      expect(validationResponse.body.success).to.be.true;
      expect(validationResponse.body.data.overall).to.be.true;
      expect(validationResponse.body.data.handlers).to.be.true;
      expect(validationResponse.body.data.steps).to.be.true;
      expect(validationResponse.body.data.workflows).to.be.true;
    });

    it('should provide migration statistics', async () => {
      // Get migration statistics
      const statsResponse = await request(app)
        .get('/api/handlers/migration/statistics')
        .expect(200);

      expect(statsResponse.body.success).to.be.true;
      expect(statsResponse.body.data).to.be.an('object');
      expect(statsResponse.body.data.byMigrationStatus).to.be.an('object');
      expect(statsResponse.body.data.byAutomationLevel).to.be.an('object');
      expect(statsResponse.body.data.byCategory).to.be.an('object');

      // Verify we have completed migrations
      expect(statsResponse.body.data.byMigrationStatus.completed).to.be.greaterThan(0);
      expect(statsResponse.body.data.byMigrationStatus.validated).to.be.greaterThan(0);
      expect(statsResponse.body.data.byAutomationLevel.full).to.be.greaterThan(0);
    });
  });

  describe('System Health and Monitoring', () => {
    it('should provide comprehensive health checks', async () => {
      // Check handlers health
      const handlersHealthResponse = await request(app)
        .get('/api/handlers/health')
        .expect(200);

      expect(handlersHealthResponse.body.success).to.be.true;
      expect(handlersHealthResponse.body.data.status).to.equal('healthy');
      expect(handlersHealthResponse.body.data.handlerCount).to.be.greaterThan(0);

      // Check workflows health
      const workflowsHealthResponse = await request(app)
        .get('/api/workflows/health')
        .expect(200);

      expect(workflowsHealthResponse.body.success).to.be.true;
      expect(workflowsHealthResponse.body.data.status).to.equal('healthy');
      expect(workflowsHealthResponse.body.data.workflowCount).to.be.greaterThanOrEqual(0);
    });

    it('should provide system status information', async () => {
      // Get handlers status
      const handlersStatusResponse = await request(app)
        .get('/api/handlers/status')
        .expect(200);

      expect(handlersStatusResponse.body.success).to.be.true;
      expect(handlersStatusResponse.body.data).to.be.an('object');
      expect(handlersStatusResponse.body.data.handlerCount).to.be.greaterThan(0);
      expect(handlersStatusResponse.body.data.handlerTypes).to.be.an('array');

      // Get workflows status
      const workflowsStatusResponse = await request(app)
        .get('/api/workflows/status')
        .expect(200);

      expect(workflowsStatusResponse.body.success).to.be.true;
      expect(workflowsStatusResponse.body.data).to.be.an('object');
      expect(workflowsStatusResponse.body.data.stepCount).to.be.greaterThan(0);
      expect(workflowsStatusResponse.body.data.stepTypes).to.be.an('array');
    });
  });
}); 