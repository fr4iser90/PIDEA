/**
 * MigrationTracker Unit Tests
 * 
 * Tests for the MigrationTracker class including progress tracking,
 * status updates, event emission, and database operations.
 */

const { EventEmitter } = require('events');
const { MigrationTracker } = require('../../../domain/workflows/migration');

// Mock dependencies
jest.mock('../../../infrastructure/database/repositories/MigrationRepository');
jest.mock('../../../infrastructure/logging/logger');

describe('MigrationTracker', () => {
  let migrationTracker;
  let mockMigrationRepository;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock repository
    mockMigrationRepository = {
      updateMigrationProgress: jest.fn(),
      updateMigrationStatus: jest.fn(),
      updatePhaseStatus: jest.fn(),
      updateStepStatus: jest.fn(),
      getMigrationStatus: jest.fn(),
      getMigrationHistory: jest.fn(),
      createMigrationPhase: jest.fn(),
      createMigrationStep: jest.fn()
    };

    // Create MigrationTracker instance
    migrationTracker = new MigrationTracker({
      enableHistory: true,
      maxHistorySize: 100,
      enableRealTimeUpdates: true
    });

    // Set mock dependencies
    migrationTracker.migrationRepository = mockMigrationRepository;
  });

  describe('Initialization', () => {
    test('should initialize with default configuration', () => {
      const tracker = new MigrationTracker();
      
      expect(tracker).toBeInstanceOf(EventEmitter);
      expect(tracker.config.enableHistory).toBe(true);
      expect(tracker.config.maxHistorySize).toBe(1000);
      expect(tracker.config.enableRealTimeUpdates).toBe(true);
    });

    test('should initialize with custom configuration', () => {
      const config = {
        enableHistory: false,
        maxHistorySize: 50,
        enableRealTimeUpdates: false
      };

      const tracker = new MigrationTracker(config);
      
      expect(tracker.config.enableHistory).toBe(false);
      expect(tracker.config.maxHistorySize).toBe(50);
      expect(tracker.config.enableRealTimeUpdates).toBe(false);
    });

    test('should initialize successfully', async () => {
      await migrationTracker.initialize();

      expect(migrationTracker.initialized).toBe(true);
    });

    test('should handle initialization errors', async () => {
      mockMigrationRepository.updateMigrationProgress.mockRejectedValue(new Error('DB error'));

      await expect(migrationTracker.initialize()).rejects.toThrow('DB error');
    });
  });

  describe('Migration Tracking', () => {
    const mockMigration = {
      id: 'test-migration-1',
      name: 'Test Migration',
      status: 'pending'
    };

    beforeEach(() => {
      mockMigrationRepository.updateMigrationProgress.mockResolvedValue(true);
      mockMigrationRepository.updateMigrationStatus.mockResolvedValue(true);
    });

    test('should track new migration', async () => {
      const result = await migrationTracker.trackMigration(mockMigration);

      expect(result).toBe(true);
      expect(mockMigrationRepository.updateMigrationStatus).toHaveBeenCalledWith(
        'test-migration-1',
        'pending'
      );
    });

    test('should emit migration tracked event', async () => {
      const events = [];
      migrationTracker.on('migration.tracked', (data) => events.push(data));

      await migrationTracker.trackMigration(mockMigration);

      expect(events).toHaveLength(1);
      expect(events[0].migrationId).toBe('test-migration-1');
      expect(events[0].status).toBe('pending');
    });

    test('should handle tracking errors', async () => {
      mockMigrationRepository.updateMigrationStatus.mockRejectedValue(new Error('Tracking failed'));

      await expect(migrationTracker.trackMigration(mockMigration))
        .rejects.toThrow('Tracking failed');
    });
  });

  describe('Progress Updates', () => {
    beforeEach(() => {
      mockMigrationRepository.updateMigrationProgress.mockResolvedValue(true);
    });

    test('should update migration progress', async () => {
      const progress = {
        migrationId: 'test-migration-1',
        currentPhase: 'phase-1',
        currentStep: 'step-1',
        progressPercentage: 50,
        completedPhases: 1,
        totalPhases: 2,
        completedSteps: 5,
        totalSteps: 10
      };

      const result = await migrationTracker.updateProgress(progress);

      expect(result).toBe(true);
      expect(mockMigrationRepository.updateMigrationProgress).toHaveBeenCalledWith(progress);
    });

    test('should emit progress update event', async () => {
      const events = [];
      migrationTracker.on('progress.updated', (data) => events.push(data));

      const progress = {
        migrationId: 'test-migration-1',
        progressPercentage: 75
      };

      await migrationTracker.updateProgress(progress);

      expect(events).toHaveLength(1);
      expect(events[0].migrationId).toBe('test-migration-1');
      expect(events[0].progressPercentage).toBe(75);
    });

    test('should validate progress data', async () => {
      const invalidProgress = {
        migrationId: 'test-migration-1',
        progressPercentage: 150 // Invalid: > 100
      };

      await expect(migrationTracker.updateProgress(invalidProgress))
        .rejects.toThrow('Invalid progress percentage: must be between 0 and 100');
    });

    test('should handle progress update errors', async () => {
      mockMigrationRepository.updateMigrationProgress.mockRejectedValue(new Error('Update failed'));

      const progress = {
        migrationId: 'test-migration-1',
        progressPercentage: 50
      };

      await expect(migrationTracker.updateProgress(progress))
        .rejects.toThrow('Update failed');
    });
  });

  describe('Status Updates', () => {
    beforeEach(() => {
      mockMigrationRepository.updateMigrationStatus.mockResolvedValue(true);
      mockMigrationRepository.updatePhaseStatus.mockResolvedValue(true);
      mockMigrationRepository.updateStepStatus.mockResolvedValue(true);
    });

    test('should update migration status', async () => {
      const result = await migrationTracker.updateStatus('test-migration-1', 'running');

      expect(result).toBe(true);
      expect(mockMigrationRepository.updateMigrationStatus).toHaveBeenCalledWith(
        'test-migration-1',
        'running'
      );
    });

    test('should update phase status', async () => {
      const result = await migrationTracker.updatePhaseStatus('test-migration-1', 'phase-1', 'completed');

      expect(result).toBe(true);
      expect(mockMigrationRepository.updatePhaseStatus).toHaveBeenCalledWith(
        'test-migration-1',
        'phase-1',
        'completed'
      );
    });

    test('should update step status', async () => {
      const result = await migrationTracker.updateStepStatus('test-migration-1', 'phase-1', 'step-1', 'completed');

      expect(result).toBe(true);
      expect(mockMigrationRepository.updateStepStatus).toHaveBeenCalledWith(
        'test-migration-1',
        'phase-1',
        'step-1',
        'completed'
      );
    });

    test('should emit status update events', async () => {
      const events = [];
      migrationTracker.on('status.updated', (data) => events.push(data));

      await migrationTracker.updateStatus('test-migration-1', 'completed');

      expect(events).toHaveLength(1);
      expect(events[0].migrationId).toBe('test-migration-1');
      expect(events[0].status).toBe('completed');
    });

    test('should validate status values', async () => {
      await expect(migrationTracker.updateStatus('test-migration-1', 'invalid-status'))
        .rejects.toThrow('Invalid status: invalid-status');
    });
  });

  describe('Error and Warning Tracking', () => {
    beforeEach(() => {
      mockMigrationRepository.updateMigrationProgress.mockResolvedValue(true);
    });

    test('should track migration errors', async () => {
      const error = {
        migrationId: 'test-migration-1',
        phaseId: 'phase-1',
        stepId: 'step-1',
        error: 'Database connection failed',
        timestamp: new Date()
      };

      const result = await migrationTracker.trackError(error);

      expect(result).toBe(true);
      expect(mockMigrationRepository.updateMigrationProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          migrationId: 'test-migration-1',
          errorCount: 1
        })
      );
    });

    test('should track migration warnings', async () => {
      const warning = {
        migrationId: 'test-migration-1',
        phaseId: 'phase-1',
        stepId: 'step-1',
        warning: 'Slow performance detected',
        timestamp: new Date()
      };

      const result = await migrationTracker.trackWarning(warning);

      expect(result).toBe(true);
      expect(mockMigrationRepository.updateMigrationProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          migrationId: 'test-migration-1',
          warningCount: 1
        })
      );
    });

    test('should emit error and warning events', async () => {
      const events = [];
      migrationTracker.on('migration.error', (data) => events.push({ type: 'error', data }));
      migrationTracker.on('migration.warning', (data) => events.push({ type: 'warning', data }));

      await migrationTracker.trackError({
        migrationId: 'test-migration-1',
        error: 'Test error'
      });

      await migrationTracker.trackWarning({
        migrationId: 'test-migration-1',
        warning: 'Test warning'
      });

      expect(events).toHaveLength(2);
      expect(events[0].type).toBe('error');
      expect(events[1].type).toBe('warning');
    });
  });

  describe('Status Retrieval', () => {
    test('should get migration status', async () => {
      const mockStatus = {
        id: 'test-migration-1',
        status: 'running',
        progress: 50,
        currentPhase: 'phase-1',
        currentStep: 'step-1'
      };

      mockMigrationRepository.getMigrationStatus.mockResolvedValue(mockStatus);

      const status = await migrationTracker.getMigrationStatus('test-migration-1');

      expect(status).toEqual(mockStatus);
      expect(mockMigrationRepository.getMigrationStatus).toHaveBeenCalledWith('test-migration-1');
    });

    test('should get migration history', async () => {
      const mockHistory = [
        { id: 'migration-1', status: 'completed', completedAt: new Date() },
        { id: 'migration-2', status: 'failed', completedAt: new Date() }
      ];

      mockMigrationRepository.getMigrationHistory.mockResolvedValue(mockHistory);

      const history = await migrationTracker.getMigrationHistory({ limit: 10 });

      expect(history).toEqual(mockHistory);
      expect(mockMigrationRepository.getMigrationHistory).toHaveBeenCalledWith({ limit: 10 });
    });

    test('should handle status retrieval errors', async () => {
      mockMigrationRepository.getMigrationStatus.mockRejectedValue(new Error('Status retrieval failed'));

      await expect(migrationTracker.getMigrationStatus('test-migration-1'))
        .rejects.toThrow('Status retrieval failed');
    });
  });

  describe('Statistics', () => {
    test('should get tracker statistics', async () => {
      const stats = migrationTracker.getStatistics();

      expect(stats).toHaveProperty('totalMigrations');
      expect(stats).toHaveProperty('activeMigrations');
      expect(stats).toHaveProperty('completedMigrations');
      expect(stats).toHaveProperty('failedMigrations');
      expect(stats).toHaveProperty('averageProgress');
    });

    test('should calculate statistics correctly', async () => {
      // Mock some migration data
      migrationTracker.migrationStats = {
        total: 10,
        active: 2,
        completed: 6,
        failed: 2,
        totalProgress: 600
      };

      const stats = migrationTracker.getStatistics();

      expect(stats.totalMigrations).toBe(10);
      expect(stats.activeMigrations).toBe(2);
      expect(stats.completedMigrations).toBe(6);
      expect(stats.failedMigrations).toBe(2);
      expect(stats.averageProgress).toBe(60);
    });
  });

  describe('History Management', () => {
    test('should add to history when enabled', async () => {
      migrationTracker.config.enableHistory = true;
      migrationTracker.config.maxHistorySize = 5;

      const migration = { id: 'test-migration-1', status: 'completed' };

      await migrationTracker.addToHistory(migration);

      expect(migrationTracker.history).toHaveLength(1);
      expect(migrationTracker.history[0]).toEqual(migration);
    });

    test('should not add to history when disabled', async () => {
      migrationTracker.config.enableHistory = false;

      const migration = { id: 'test-migration-1', status: 'completed' };

      await migrationTracker.addToHistory(migration);

      expect(migrationTracker.history).toHaveLength(0);
    });

    test('should limit history size', async () => {
      migrationTracker.config.enableHistory = true;
      migrationTracker.config.maxHistorySize = 3;

      // Add more items than the limit
      for (let i = 0; i < 5; i++) {
        await migrationTracker.addToHistory({ id: `migration-${i}`, status: 'completed' });
      }

      expect(migrationTracker.history).toHaveLength(3);
      expect(migrationTracker.history[0].id).toBe('migration-2'); // Oldest removed
      expect(migrationTracker.history[2].id).toBe('migration-4'); // Newest kept
    });
  });

  describe('Cleanup', () => {
    test('should cleanup successfully', async () => {
      await migrationTracker.cleanup();

      expect(migrationTracker.initialized).toBe(false);
      expect(migrationTracker.history).toHaveLength(0);
    });

    test('should handle cleanup errors', async () => {
      mockMigrationRepository.updateMigrationProgress.mockRejectedValue(new Error('Cleanup failed'));

      await expect(migrationTracker.cleanup()).rejects.toThrow('Cleanup failed');
    });
  });

  describe('Real-time Updates', () => {
    test('should emit real-time updates when enabled', async () => {
      migrationTracker.config.enableRealTimeUpdates = true;

      const events = [];
      migrationTracker.on('realtime.update', (data) => events.push(data));

      const progress = {
        migrationId: 'test-migration-1',
        progressPercentage: 25
      };

      await migrationTracker.updateProgress(progress);

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('progress');
      expect(events[0].data).toEqual(progress);
    });

    test('should not emit real-time updates when disabled', async () => {
      migrationTracker.config.enableRealTimeUpdates = false;

      const events = [];
      migrationTracker.on('realtime.update', (data) => events.push(data));

      const progress = {
        migrationId: 'test-migration-1',
        progressPercentage: 25
      };

      await migrationTracker.updateProgress(progress);

      expect(events).toHaveLength(0);
    });
  });
}); 