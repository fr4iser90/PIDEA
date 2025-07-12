/**
 * Migration System Integration Tests
 * 
 * Comprehensive tests for the complete migration system integration,
 * including validation, monitoring, and end-to-end workflow execution.
 */

const { expect } = require('chai');
const { MigrationInfrastructureFactory } = require('../../../backend/domain/workflows/migration');
const { UnifiedWorkflowHandler } = require('../../../backend/domain/workflows/handlers');
const { HandlerRegistry } = require('../../../backend/domain/workflows/handlers');
const { StepRegistry } = require('../../../backend/domain/workflows/steps');

describe('Migration System Integration Tests', () => {
  let migrationInfrastructure;
  let unifiedHandler;
  let handlerRegistry;
  let stepRegistry;
  let validator;
  let metrics;

  before(async () => {
    // Initialize migration infrastructure
    migrationInfrastructure = await MigrationInfrastructureFactory.create({
      manager: {
        enableRollback: true,
        enableValidation: true,
        enableMetrics: true,
        maxConcurrentMigrations: 5,
        timeoutSeconds: 300
      },
      tracker: {
        enableHistory: true,
        maxHistorySize: 1000,
        enableRealTimeUpdates: true
      },
      rollback: {
        enableAutomaticRollback: true,
        enableBackup: true,
        backupRetentionDays: 30
      },
      validator: {
        enableStrictValidation: true,
        enableSchemaValidation: true,
        enableDataIntegrity: true
      },
      metrics: {
        enableRealTimeMetrics: true,
        enableResourceTracking: true,
        enablePerformanceAlerts: true
      }
    });

    // Initialize unified workflow system
    unifiedHandler = new UnifiedWorkflowHandler({
      logger: console,
      eventBus: { emit: () => {}, subscribe: () => {} }
    });

    handlerRegistry = unifiedHandler.handlerRegistry;
    stepRegistry = new StepRegistry();
    validator = migrationInfrastructure.validator;
    metrics = migrationInfrastructure.metrics;
  });

  after(async () => {
    if (migrationInfrastructure) {
      await migrationInfrastructure.cleanup();
    }
  });

  describe('Migration Infrastructure Integration', () => {
    it('should have complete migration infrastructure', async () => {
      expect(migrationInfrastructure.manager).to.be.an('object');
      expect(migrationInfrastructure.tracker).to.be.an('object');
      expect(migrationInfrastructure.rollback).to.be.an('object');
      expect(migrationInfrastructure.validator).to.be.an('object');
      expect(migrationInfrastructure.metrics).to.be.an('object');
    });

    it('should validate migration system health', async () => {
      const validation = await validator.validateMigrationSystem({
        handlerRegistry,
        stepRegistry,
        integrationSystem: { isHealthy: () => true, getStatus: () => ({ isInitialized: true, errorCount: 0 }) }
      });

      expect(validation.isValid).to.be.true;
      expect(validation.summary.successRate).to.be.greaterThan(80);
    });

    it('should track migration metrics', async () => {
      const migrationId = 'test-migration-123';
      
      await metrics.startCollection(migrationId);
      
      await metrics.updateMetrics(migrationId, {
        memoryUsage: 100 * 1024 * 1024, // 100MB
        cpuUsage: 25,
        databaseQueries: 10,
        databaseQueryTime: 50
      });

      const collectedMetrics = await metrics.getMetrics(migrationId);
      expect(collectedMetrics).to.be.an('object');
      expect(collectedMetrics.metrics.executionTime).to.be.greaterThan(0);
    });
  });

  describe('Handler Migration Validation', () => {
    it('should validate all migrated handlers', async () => {
      const handlers = handlerRegistry.listHandlers();
      
      for (const handler of handlers) {
        const metadata = handlerRegistry.getHandlerMetadata(handler.type);
        expect(metadata).to.not.be.null;
        
        if (metadata.migrationStatus === 'completed' || metadata.migrationStatus === 'validated') {
          expect(metadata.automationLevel).to.equal('full');
        }
      }
    });

    it('should validate automation level consistency', async () => {
      const validation = await validator.validateAutomationLevelConsistency({
        handlerRegistry
      });

      expect(validation.isValid).to.be.true;
      expect(validation.details.consistentHandlers).to.be.greaterThan(0);
    });

    it('should validate step registration for migrated handlers', async () => {
      const validation = await validator.validateStepRegistration({
        handlerRegistry,
        stepRegistry
      });

      expect(validation.isValid).to.be.true;
    });
  });

  describe('Workflow Execution with Migration', () => {
    it('should execute analysis workflow with migrated handlers', async () => {
      const request = {
        type: 'architecture-analysis',
        projectPath: '/test/project',
        options: {
          depth: 'comprehensive',
          includeDependencies: true
        }
      };

      const result = await unifiedHandler.handle(request, {}, {});
      
      expect(result.isSuccess()).to.be.true;
      expect(result.getHandlerId()).to.be.a('string');
      expect(result.getDuration()).to.be.a('number');
    });

    it('should execute VibeCoder workflow with validated handlers', async () => {
      const request = {
        type: 'vibecoder-analyze',
        projectPath: '/test/project',
        options: {
          comprehensive: true,
          includeSuggestions: true
        }
      };

      const result = await unifiedHandler.handle(request, {}, {});
      
      expect(result.isSuccess()).to.be.true;
      expect(result.getHandlerId()).to.be.a('string');
      expect(result.getDuration()).to.be.a('number');
    });

    it('should execute generate workflow with migrated handlers', async () => {
      const request = {
        type: 'generate-script',
        projectPath: '/test/project',
        options: {
          framework: 'nodejs',
          template: 'basic'
        }
      };

      const result = await unifiedHandler.handle(request, {}, {});
      
      expect(result.isSuccess()).to.be.true;
      expect(result.getHandlerId()).to.be.a('string');
      expect(result.getDuration()).to.be.a('number');
    });
  });

  describe('Migration Performance Monitoring', () => {
    it('should monitor handler execution performance', async () => {
      const migrationId = 'performance-test-123';
      
      await metrics.startCollection(migrationId);
      
      const startTime = Date.now();
      
      // Execute multiple handlers to test performance
      const requests = [
        { type: 'architecture-analysis', projectPath: '/test/project', options: { depth: 'basic' } },
        { type: 'vibecoder-analyze', projectPath: '/test/project', options: { comprehensive: false } },
        { type: 'generate-script', projectPath: '/test/project', options: { framework: 'basic' } }
      ];

      for (const request of requests) {
        await unifiedHandler.handle(request, {}, {});
      }
      
      const duration = Date.now() - startTime;
      
      await metrics.updateMetrics(migrationId, {
        memoryUsage: 150 * 1024 * 1024, // 150MB
        cpuUsage: 35,
        databaseQueries: 25,
        databaseQueryTime: 120
      });

      const performanceMetrics = await metrics.getMetrics(migrationId);
      expect(performanceMetrics.metrics.executionTime).to.be.greaterThan(0);
      expect(performanceMetrics.metrics.memoryUsage).to.have.length.greaterThan(0);
    });

    it('should generate performance alerts for threshold violations', async () => {
      const migrationId = 'alert-test-456';
      
      await metrics.startCollection(migrationId);
      
      // Simulate high resource usage
      await metrics.updateMetrics(migrationId, {
        memoryUsage: 1024 * 1024 * 1024, // 1GB (should trigger alert)
        cpuUsage: 95, // 95% (should trigger alert)
        databaseQueries: 2000, // High query count (should trigger alert)
        databaseQueryTime: 5000
      });

      const metricsData = await metrics.getMetrics(migrationId);
      expect(metricsData.alerts).to.have.length.greaterThan(0);
    });
  });

  describe('Migration Rollback and Recovery', () => {
    it('should support migration rollback', async () => {
      const migrationId = 'rollback-test-789';
      
      // Create a test migration
      const migrationConfig = {
        id: migrationId,
        name: 'Test Migration',
        description: 'Test migration for rollback validation',
        type: 'test',
        phases: [
          {
            id: 'phase-1',
            name: 'Test Phase',
            steps: [
              {
                id: 'step-1',
                name: 'Test Step',
                type: 'script',
                script: 'echo "test"'
              }
            ]
          }
        ]
      };

      // Execute migration
      const result = await migrationInfrastructure.executeMigration(migrationConfig);
      expect(result.success).to.be.true;

      // Test rollback
      const rollbackResult = await migrationInfrastructure.rollbackMigration(migrationId, {
        reason: 'Test rollback',
        restoreBackup: true
      });

      expect(rollbackResult.success).to.be.true;
    });

    it('should handle migration failures gracefully', async () => {
      const migrationId = 'failure-test-999';
      
      // Create a migration that will fail
      const failingMigrationConfig = {
        id: migrationId,
        name: 'Failing Migration',
        description: 'Migration designed to fail for testing',
        type: 'test',
        phases: [
          {
            id: 'phase-1',
            name: 'Failing Phase',
            steps: [
              {
                id: 'step-1',
                name: 'Failing Step',
                type: 'script',
                script: 'exit 1' // This will fail
              }
            ]
          }
        ]
      };

      try {
        await migrationInfrastructure.executeMigration(failingMigrationConfig);
      } catch (error) {
        // Expected to fail
        expect(error).to.be.an('error');
      }

      // Check that rollback mechanisms are available
      const rollbackResult = await migrationInfrastructure.rollbackMigration(migrationId, {
        reason: 'Recovery from failure',
        restoreBackup: true
      });

      expect(rollbackResult.success).to.be.true;
    });
  });

  describe('System Integration Validation', () => {
    it('should validate complete system integration', async () => {
      const systemValidation = await validator.validateCompleteSystem({
        handlerRegistry,
        stepRegistry,
        unifiedHandler,
        migrationInfrastructure
      });

      expect(systemValidation.isValid).to.be.true;
      expect(systemValidation.summary.successRate).to.be.greaterThan(90);
    });

    it('should validate API endpoint availability', async () => {
      const apiValidation = await validator.validateAPIEndpointAvailability({
        baseUrl: 'http://localhost:3000'
      });

      expect(apiValidation.isValid).to.be.true;
    });

    it('should validate performance requirements', async () => {
      const performanceValidation = await validator.validatePerformanceRequirements({
        unifiedHandler,
        metrics
      });

      expect(performanceValidation.isValid).to.be.true;
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle component failures gracefully', async () => {
      // Simulate a component failure
      const originalHandler = unifiedHandler.getHandlerByType('architecture-analysis');
      
      // Temporarily replace with failing handler
      const failingHandler = {
        handle: async () => { throw new Error('Simulated failure'); },
        getMetadata: () => ({ name: 'Failing Handler', migrationStatus: 'completed' })
      };
      
      unifiedHandler.registerHandler('architecture-analysis', failingHandler);
      
      const request = {
        type: 'architecture-analysis',
        projectPath: '/test/project',
        options: { depth: 'basic' }
      };

      const result = await unifiedHandler.handle(request, {}, {});
      
      expect(result.isSuccess()).to.be.false;
      expect(result.getError()).to.include('Simulated failure');
      
      // Restore original handler
      if (originalHandler) {
        unifiedHandler.registerHandler('architecture-analysis', originalHandler);
      }
    });

    it('should recover from temporary failures', async () => {
      const request = {
        type: 'architecture-analysis',
        projectPath: '/test/project',
        options: { depth: 'basic' }
      };

      // First execution should succeed
      const result1 = await unifiedHandler.handle(request, {}, {});
      expect(result1.isSuccess()).to.be.true;
      
      // Second execution should also succeed
      const result2 = await unifiedHandler.handle(request, {}, {});
      expect(result2.isSuccess()).to.be.true;
    });
  });
}); 