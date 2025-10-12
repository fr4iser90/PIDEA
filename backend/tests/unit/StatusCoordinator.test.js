/**
 * StatusCoordinator Unit Tests
 * Tests for status coordination functionality
 */

const StatusCoordinator = require('../../infrastructure/database/StatusCoordinator');

describe('StatusCoordinator', () => {
  let statusCoordinator;
  let mockDatabaseConnection;
  let mockEventBus;

  beforeEach(() => {
    mockDatabaseConnection = {
      execute: jest.fn()
    };
    mockEventBus = {
      emit: jest.fn()
    };
    
    statusCoordinator = new StatusCoordinator(mockDatabaseConnection, mockEventBus);
  });

  describe('coordinateStatus', () => {
    it('should coordinate status synchronously', async () => {
      const mockAssignments = [
        { layer_id: 'layer-1', task_id: 'task-1' },
        { layer_id: 'layer-2', task_id: 'task-1' }
      ];

      mockDatabaseConnection.execute
        .mockResolvedValueOnce({ rows: mockAssignments }) // getTaskLayerAssignments
        .mockResolvedValueOnce({ rows: [{ id: 'coord-1' }] }) // createCoordinationRecord
        .mockResolvedValueOnce({ rows: [{ id: 'assignment-1' }] }) // updateLayerTaskStatus
        .mockResolvedValueOnce({ rows: [{ id: 'assignment-2' }] }) // updateLayerTaskStatus
        .mockResolvedValueOnce({ rows: [{ id: 'coord-1' }] }); // updateCoordinationRecord

      const result = await statusCoordinator.coordinateStatus('task-1', 'layer-1', 'in_progress', 'sync');

      expect(result.coordinationStatus).toBe('success');
      expect(result.coordinated).toBe(2);
      expect(mockEventBus.emit).toHaveBeenCalledWith('status.coordinated', expect.any(Object));
    });

    it('should coordinate status asynchronously', async () => {
      const mockAssignments = [
        { layer_id: 'layer-1', task_id: 'task-1' },
        { layer_id: 'layer-2', task_id: 'task-1' }
      ];

      mockDatabaseConnection.execute
        .mockResolvedValueOnce({ rows: mockAssignments }) // getTaskLayerAssignments
        .mockResolvedValueOnce({ rows: [{ id: 'coord-1' }] }) // createCoordinationRecord
        .mockResolvedValueOnce({ rows: [{ id: 'assignment-1' }] }) // queueLayerTaskStatusUpdate
        .mockResolvedValueOnce({ rows: [{ id: 'assignment-2' }] }) // queueLayerTaskStatusUpdate
        .mockResolvedValueOnce({ rows: [{ id: 'coord-1' }] }); // updateCoordinationRecord

      const result = await statusCoordinator.coordinateStatus('task-1', 'layer-1', 'in_progress', 'async');

      expect(result.coordinationStatus).toBe('pending');
      expect(result.coordinated).toBe(2);
    });

    it('should coordinate status manually', async () => {
      const mockAssignments = [
        { layer_id: 'layer-1', task_id: 'task-1' },
        { layer_id: 'layer-2', task_id: 'task-1' }
      ];

      mockDatabaseConnection.execute
        .mockResolvedValueOnce({ rows: mockAssignments }) // getTaskLayerAssignments
        .mockResolvedValueOnce({ rows: [{ id: 'coord-1' }] }) // createCoordinationRecord
        .mockResolvedValueOnce({ rows: [{ id: 'coord-1' }] }); // updateCoordinationRecord

      const result = await statusCoordinator.coordinateStatus('task-1', 'layer-1', 'in_progress', 'manual');

      expect(result.coordinationStatus).toBe('pending');
      expect(result.coordinated).toBe(0);
    });

    it('should throw error for no layer assignments', async () => {
      mockDatabaseConnection.execute.mockResolvedValue({
        rows: []
      });

      await expect(statusCoordinator.coordinateStatus('task-1', 'layer-1', 'in_progress'))
        .rejects.toThrow('No layer assignments found for task');
    });

    it('should throw error for unknown coordination type', async () => {
      const mockAssignments = [
        { layer_id: 'layer-1', task_id: 'task-1' }
      ];

      mockDatabaseConnection.execute
        .mockResolvedValueOnce({ rows: mockAssignments }) // getTaskLayerAssignments
        .mockResolvedValueOnce({ rows: [{ id: 'coord-1' }] }); // createCoordinationRecord

      await expect(statusCoordinator.coordinateStatus('task-1', 'layer-1', 'in_progress', 'invalid'))
        .rejects.toThrow('Unknown coordination type: invalid');
    });
  });

  describe('executeSyncCoordination', () => {
    it('should execute sync coordination successfully', async () => {
      mockDatabaseConnection.execute.mockResolvedValue({
        rows: [{ id: 'assignment-1' }]
      });

      const result = await statusCoordinator.executeSyncCoordination(
        'task-1',
        'layer-1',
        'in_progress',
        ['layer-2', 'layer-3']
      );

      expect(result.coordinationStatus).toBe('success');
      expect(result.coordinated).toBe(2);
      expect(result.failed).toBe(0);
    });

    it('should handle partial failures', async () => {
      mockDatabaseConnection.execute
        .mockResolvedValueOnce({ rows: [{ id: 'assignment-1' }] }) // Success
        .mockRejectedValueOnce(new Error('Database error')); // Failure

      const result = await statusCoordinator.executeSyncCoordination(
        'task-1',
        'layer-1',
        'in_progress',
        ['layer-2', 'layer-3']
      );

      expect(result.coordinationStatus).toBe('partial');
      expect(result.coordinated).toBe(1);
      expect(result.failed).toBe(1);
    });
  });

  describe('updateLayerTaskStatus', () => {
    it('should update layer task status', async () => {
      mockDatabaseConnection.execute.mockResolvedValue({
        rows: [{ id: 'assignment-1', layer_id: 'layer-1', task_id: 'task-1', status: 'in_progress' }]
      });

      const result = await statusCoordinator.updateLayerTaskStatus('task-1', 'layer-1', 'in_progress');

      expect(result.status).toBe('in_progress');
    });

    it('should throw error for non-existent assignment', async () => {
      mockDatabaseConnection.execute.mockResolvedValue({
        rows: []
      });

      await expect(statusCoordinator.updateLayerTaskStatus('task-1', 'layer-1', 'in_progress'))
        .rejects.toThrow('Layer task assignment not found');
    });
  });

  describe('getTaskLayerAssignments', () => {
    it('should return task layer assignments', async () => {
      const mockAssignments = [
        { id: 'assignment-1', layer_id: 'layer-1', task_id: 'task-1', layer_name: 'Domain Layer' }
      ];

      mockDatabaseConnection.execute.mockResolvedValue({
        rows: mockAssignments
      });

      const result = await statusCoordinator.getTaskLayerAssignments('task-1');

      expect(result).toHaveLength(1);
      expect(result[0].layer_name).toBe('Domain Layer');
    });
  });

  describe('getCoordinationHistory', () => {
    it('should return coordination history', async () => {
      const mockHistory = [
        { id: 'coord-1', task_id: 'task-1', status: 'in_progress', layer_name: 'Domain Layer' }
      ];

      mockDatabaseConnection.execute.mockResolvedValue({
        rows: mockHistory
      });

      const result = await statusCoordinator.getCoordinationHistory('task-1', 10);

      expect(result).toHaveLength(1);
      expect(result[0].layer_name).toBe('Domain Layer');
    });
  });

  describe('getPendingCoordinations', () => {
    it('should return pending coordinations', async () => {
      const mockCoordinations = [
        { id: 'coord-1', task_id: 'task-1', coordination_status: 'pending', layer_name: 'Domain Layer' }
      ];

      mockDatabaseConnection.execute.mockResolvedValue({
        rows: mockCoordinations
      });

      const result = await statusCoordinator.getPendingCoordinations();

      expect(result).toHaveLength(1);
      expect(result[0].coordination_status).toBe('pending');
    });
  });

  describe('resolvePendingCoordination', () => {
    it('should resolve pending coordination', async () => {
      const mockCoordination = {
        id: 'coord-1',
        task_id: 'task-1',
        layer_id: 'layer-1',
        status: 'in_progress',
        target_layers: '["layer-2", "layer-3"]',
        coordination_status: 'pending'
      };

      mockDatabaseConnection.execute
        .mockResolvedValueOnce({ rows: [mockCoordination] }) // getPendingCoordination
        .mockResolvedValueOnce({ rows: [{ id: 'assignment-1' }] }) // updateLayerTaskStatus
        .mockResolvedValueOnce({ rows: [{ id: 'assignment-2' }] }) // updateLayerTaskStatus
        .mockResolvedValueOnce({ rows: [{ id: 'coord-1' }] }); // updateCoordinationRecord

      const result = await statusCoordinator.resolvePendingCoordination('coord-1');

      expect(result.coordinationStatus).toBe('success');
      expect(result.coordinated).toBe(2);
    });

    it('should throw error for non-existent coordination', async () => {
      mockDatabaseConnection.execute.mockResolvedValue({
        rows: []
      });

      await expect(statusCoordinator.resolvePendingCoordination('non-existent'))
        .rejects.toThrow('Pending coordination not found');
    });
  });

  describe('validateStatusTransition', () => {
    it('should validate valid status transition', async () => {
      const mockAssignments = [
        { layer_id: 'layer-1', task_id: 'task-1', status: 'pending' }
      ];

      mockDatabaseConnection.execute.mockResolvedValue({
        rows: mockAssignments
      });

      const result = await statusCoordinator.validateStatusTransition('task-1', 'layer-1', 'in_progress');

      expect(result).toBe(true);
    });

    it('should throw error for invalid status transition', async () => {
      const mockAssignments = [
        { layer_id: 'layer-1', task_id: 'task-1', status: 'cancelled' }
      ];

      mockDatabaseConnection.execute.mockResolvedValue({
        rows: mockAssignments
      });

      await expect(statusCoordinator.validateStatusTransition('task-1', 'layer-1', 'in_progress'))
        .rejects.toThrow("Invalid status transition from 'cancelled' to 'in_progress'");
    });

    it('should throw error for non-existent assignment', async () => {
      mockDatabaseConnection.execute.mockResolvedValue({
        rows: []
      });

      await expect(statusCoordinator.validateStatusTransition('task-1', 'layer-1', 'in_progress'))
        .rejects.toThrow('Layer assignment not found');
    });
  });

  describe('getLayerDependencies', () => {
    it('should return layer dependencies', async () => {
      const mockDependencies = [
        { id: 'dep-1', source_layer_id: 'layer-1', target_layer_id: 'layer-2', target_layer_name: 'Domain Layer' }
      ];

      mockDatabaseConnection.execute.mockResolvedValue({
        rows: mockDependencies
      });

      const result = await statusCoordinator.getLayerDependencies('layer-1');

      expect(result).toHaveLength(1);
      expect(result[0].target_layer_name).toBe('Domain Layer');
    });
  });
});
