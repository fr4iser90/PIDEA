/**
 * MigrationManager Unit Tests
 * 
 * Tests for the MigrationManager class including orchestration,
 * error handling, event emission, and integration with other components.
 */

const { EventEmitter } = require('events');
const { MigrationManager } = require('../../../domain/workflows/migration');

// Mock dependencies
jest.mock('../../../infrastructure/database/repositories/MigrationRepository');
jest.mock('../../../infrastructure/logging/logger');

describe('MigrationManager', () => {
  let migrationManager;
  let mockMigrationRepository;
  let mockTracker;
  let mockRollback;
  let mockValidator;
  let mockMetrics;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock components
    mockMigrationRepository = {
      getMigrationById: jest.fn(),
      updateMigrationStatus: jest.fn(),
      createMigration: jest.fn(),
      updateMigration: jest.fn(),
      deleteMigration: jest.fn(),
      getMigrationsByStatus: jest.fn(),
      getMigrationHistory: jest.fn()
    };

    mockTracker = {
      initialize: jest.fn(),
      trackMigration: jest.fn(),
      updateProgress: jest.fn(),
      getMigrationStatus: jest.fn(),
      getStatistics: jest.fn(),
      cleanup: jest.fn()
    };

    mockRollback = {
      initialize: jest.fn(),
      manualRollback: jest.fn(),
      automaticRollback: jest.fn(),
      createBackup: jest.fn(),
      restoreBackup: jest.fn(),
      getStatistics: jest.fn(),
      cleanup: jest.fn()
    };

    mockValidator = {
      initialize: jest.fn(),
      validateMigrationConfig: jest.fn(),
      validateMigrationResult: jest.fn(),
      validateStep: jest.fn(),
      getStatistics: jest.fn(),
      cleanup: jest.fn()
    };

    mockMetrics = {
      initialize: jest.fn(),
      trackMetrics: jest.fn(),
      getMetrics: jest.fn(),
      generateReport: jest.fn(),
      getStatistics: jest.fn(),
      cleanup: jest.fn()
    };

    // Create MigrationManager instance
    migrationManager = new MigrationManager({
      enableRollback: true,
      enableValidation: true,
      enableMetrics: true,
      maxConcurrentMigrations: 5,
      timeoutSeconds: 300
    });

    // Set mock dependencies
    migrationManager.migrationRepository = mockMigrationRepository;
    migrationManager.tracker = mockTracker;
    migrationManager.rollback = mockRollback;
    migrationManager.validator = mockValidator;
    migrationManager.metrics = mockMetrics;
  });

  describe('Initialization', () => {
    test('should initialize with default configuration', () => {
      const manager = new MigrationManager();
      
      expect(manager).toBeInstanceOf(EventEmitter);
      expect(manager.config.enableRollback).toBe(true);
      expect(manager.config.enableValidation).toBe(true);
      expect(manager.config.enableMetrics).toBe(true);
      expect(manager.config.maxConcurrentMigrations).toBe(10);
      expect(manager.config.timeoutSeconds).toBe(300);
    });

    test('should initialize with custom configuration', () => {
      const config = {
        enableRollback: false,
        enableValidation: false,
        enableMetrics: false,
        maxConcurrentMigrations: 3,
        timeoutSeconds: 600
      };

      const manager = new MigrationManager(config);
      
      expect(manager.config.enableRollback).toBe(false);
      expect(manager.config.enableValidation).toBe(false);
      expect(manager.config.enableMetrics).toBe(false);
      expect(manager.config.maxConcurrentMigrations).toBe(3);
      expect(manager.config.timeoutSeconds).toBe(600);
    });

    test('should initialize all components', async () => {
      await migrationManager.initialize({
        tracker: mockTracker,
        rollback: mockRollback,
        validator: mockValidator,
        metrics: mockMetrics
      });

      expect(mockTracker.initialize).toHaveBeenCalled();
      expect(mockRollback.initialize).toHaveBeenCalled();
      expect(mockValidator.initialize).toHaveBeenCalled();
      expect(mockMetrics.initialize).toHaveBeenCalled();
    });

    test('should handle initialization errors', async () => {
      mockTracker.initialize.mockRejectedValue(new Error('Tracker init failed'));

      await expect(migrationManager.initialize({
        tracker: mockTracker,
        rollback: mockRollback,
        validator: mockValidator,
        metrics: mockMetrics
      })).rejects.toThrow('Tracker init failed');
    });
  });

  describe('Migration Execution', () => {
    const mockMigration = {
      id: 'test-migration-1',
      name: 'Test Migration',
      description: 'Test migration for unit testing',
      status: 'pending',
      phases: [
        {
          id: 'phase-1',
          name: 'Test Phase 1',
          steps: [
            {
              id: 'step-1',
              name: 'Test Step 1',
              type: 'database',
              action: 'CREATE_TABLE'
            }
          ]
        }
      ]
    };

    beforeEach(() => {
      mockMigrationRepository.getMigrationById.mockResolvedValue(mockMigration);
      mockMigrationRepository.updateMigrationStatus.mockResolvedValue(true);
      mockValidator.validateMigrationConfig.mockResolvedValue({ valid: true });
      mockTracker.trackMigration.mockResolvedValue(true);
      mockMetrics.trackMetrics.mockResolvedValue(true);
    });

    test('should execute migration successfully', async () => {
      const result = await migrationManager.executeMigration('test-migration-1');

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(mockMigrationRepository.getMigrationById).toHaveBeenCalledWith('test-migration-1');
      expect(mockMigrationRepository.updateMigrationStatus).toHaveBeenCalledWith('test-migration-1', 'running');
      expect(mockTracker.trackMigration).toHaveBeenCalled();
      expect(mockMetrics.trackMetrics).toHaveBeenCalled();
    });

    test('should reject if migration is already running', async () => {
      // Set migration as already running
      migrationManager.activeMigrations.set('test-migration-1', { migration: mockMigration });

      await expect(migrationManager.executeMigration('test-migration-1'))
        .rejects.toThrow('Migration test-migration-1 is already running');
    });

    test('should reject if migration not found', async () => {
      mockMigrationRepository.getMigrationById.mockResolvedValue(null);

      await expect(migrationManager.executeMigration('non-existent-migration'))
        .rejects.toThrow('Migration non-existent-migration not found');
    });

    test('should reject if migration already completed', async () => {
      const completedMigration = { ...mockMigration, status: 'completed' };
      mockMigrationRepository.getMigrationById.mockResolvedValue(completedMigration);

      await expect(migrationManager.executeMigration('test-migration-1'))
        .rejects.toThrow('Migration test-migration-1 has already been completed');
    });

    test('should reject if concurrent limit reached', async () => {
      // Fill up active migrations
      for (let i = 0; i < 5; i++) {
        migrationManager.activeMigrations.set(`migration-${i}`, { migration: mockMigration });
      }

      await expect(migrationManager.executeMigration('test-migration-1'))
        .rejects.toThrow('Maximum concurrent migrations limit reached (5)');
    });

    test('should emit migration events', async () => {
      const events = [];
      migrationManager.on('migration.started', (data) => events.push({ type: 'started', data }));
      migrationManager.on('migration.completed', (data) => events.push({ type: 'completed', data }));

      await migrationManager.executeMigration('test-migration-1');

      expect(events).toHaveLength(2);
      expect(events[0].type).toBe('started');
      expect(events[1].type).toBe('completed');
      expect(events[0].data.migrationId).toBe('test-migration-1');
      expect(events[1].data.migrationId).toBe('test-migration-1');
    });
  });

  describe('Error Handling', () => {
    test('should handle migration execution errors', async () => {
      mockMigrationRepository.getMigrationById.mockRejectedValue(new Error('Database error'));

      await expect(migrationManager.executeMigration('test-migration-1'))
        .rejects.toThrow('Database error');
    });

    test('should handle validation errors', async () => {
      const mockMigration = {
        id: 'test-migration-1',
        name: 'Test Migration',
        status: 'pending'
      };

      mockMigrationRepository.getMigrationById.mockResolvedValue(mockMigration);
      mockValidator.validateMigrationConfig.mockResolvedValue({ 
        valid: false, 
        errors: ['Invalid configuration'] 
      });

      await expect(migrationManager.executeMigration('test-migration-1'))
        .rejects.toThrow('Migration validation failed');
    });

    test('should handle timeout errors', async () => {
      const mockMigration = {
        id: 'test-migration-1',
        name: 'Test Migration',
        status: 'pending'
      };

      mockMigrationRepository.getMigrationById.mockResolvedValue(mockMigration);
      mockMigrationRepository.updateMigrationStatus.mockImplementation(() => {
        return new Promise(resolve => setTimeout(resolve, 1000));
      });

      // Set short timeout
      migrationManager.config.timeoutSeconds = 0.1;

      await expect(migrationManager.executeMigration('test-migration-1'))
        .rejects.toThrow('Migration execution timeout');
    });
  });

  describe('Rollback Operations', () => {
    test('should execute manual rollback', async () => {
      mockRollback.manualRollback.mockResolvedValue({ success: true });

      const result = await migrationManager.rollbackMigration('test-migration-1', {
        reason: 'Test rollback'
      });

      expect(result.success).toBe(true);
      expect(mockRollback.manualRollback).toHaveBeenCalledWith('test-migration-1', {
        reason: 'Test rollback'
      });
    });

    test('should handle rollback errors', async () => {
      mockRollback.manualRollback.mockRejectedValue(new Error('Rollback failed'));

      await expect(migrationManager.rollbackMigration('test-migration-1'))
        .rejects.toThrow('Rollback failed');
    });
  });

  describe('Status and Monitoring', () => {
    test('should get migration status', async () => {
      const mockStatus = {
        id: 'test-migration-1',
        status: 'running',
        progress: 50
      };

      mockTracker.getMigrationStatus.mockResolvedValue(mockStatus);

      const status = await migrationManager.getMigrationStatus('test-migration-1');

      expect(status).toEqual(mockStatus);
      expect(mockTracker.getMigrationStatus).toHaveBeenCalledWith('test-migration-1');
    });

    test('should get manager statistics', () => {
      const stats = migrationManager.getStatus();

      expect(stats).toHaveProperty('activeMigrations');
      expect(stats).toHaveProperty('totalMigrations');
      expect(stats).toHaveProperty('config');
      expect(stats.activeMigrations).toBe(0);
    });

    test('should get all migration statistics', async () => {
      const mockStats = {
        tracker: { total: 10, completed: 5 },
        rollback: { total: 2, successful: 1 },
        validator: { total: 10, valid: 9 },
        metrics: { averageDuration: 120 }
      };

      mockTracker.getStatistics.mockResolvedValue(mockStats.tracker);
      mockRollback.getStatistics.mockResolvedValue(mockStats.rollback);
      mockValidator.getStatistics.mockResolvedValue(mockStats.validator);
      mockMetrics.getStatistics.mockResolvedValue(mockStats.metrics);

      const stats = await migrationManager.getStatistics();

      expect(stats).toEqual(mockStats);
    });
  });

  describe('Cleanup', () => {
    test('should cleanup all components', async () => {
      await migrationManager.cleanup();

      expect(mockTracker.cleanup).toHaveBeenCalled();
      expect(mockRollback.cleanup).toHaveBeenCalled();
      expect(mockValidator.cleanup).toHaveBeenCalled();
      expect(mockMetrics.cleanup).toHaveBeenCalled();
    });

    test('should handle cleanup errors', async () => {
      mockTracker.cleanup.mockRejectedValue(new Error('Cleanup failed'));

      await expect(migrationManager.cleanup()).rejects.toThrow('Cleanup failed');
    });
  });

  describe('Configuration Management', () => {
    test('should update configuration', () => {
      const newConfig = {
        maxConcurrentMigrations: 15,
        timeoutSeconds: 600
      };

      migrationManager.updateConfig(newConfig);

      expect(migrationManager.config.maxConcurrentMigrations).toBe(15);
      expect(migrationManager.config.timeoutSeconds).toBe(600);
    });

    test('should validate configuration updates', () => {
      const invalidConfig = {
        maxConcurrentMigrations: -1,
        timeoutSeconds: 0
      };

      expect(() => migrationManager.updateConfig(invalidConfig))
        .toThrow('Invalid configuration: maxConcurrentMigrations must be positive');
    });
  });
}); 