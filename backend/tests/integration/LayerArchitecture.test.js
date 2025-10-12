/**
 * Layer Architecture Integration Tests
 * Tests for complete layer architecture functionality
 */

const LayerManager = require('../../infrastructure/database/LayerManager');
const TaskDistributionManager = require('../../infrastructure/database/TaskDistributionManager');
const StatusCoordinator = require('../../infrastructure/database/StatusCoordinator');
const LayerTaskHandler = require('../../application/handlers/LayerTaskHandler');
const Layer = require('../../domain/entities/Layer');
const LayerType = require('../../domain/value-objects/LayerType');

describe('Layer Architecture Integration', () => {
  let layerManager;
  let taskDistributionManager;
  let statusCoordinator;
  let layerTaskHandler;
  let mockDatabaseConnection;
  let mockEventBus;

  beforeEach(() => {
    mockDatabaseConnection = {
      execute: jest.fn()
    };
    mockEventBus = {
      emit: jest.fn()
    };

    layerManager = new LayerManager(mockDatabaseConnection, mockEventBus);
    taskDistributionManager = new TaskDistributionManager(mockDatabaseConnection, layerManager, mockEventBus);
    statusCoordinator = new StatusCoordinator(mockDatabaseConnection, mockEventBus);
    layerTaskHandler = new LayerTaskHandler({
      layerManager,
      taskDistributionManager,
      statusCoordinator,
      taskRepository: { findById: jest.fn() },
      eventBus: mockEventBus
    });
  });

  describe('Complete Layer Workflow', () => {
    it('should handle complete layer task workflow', async () => {
      // Mock data
      const mockTask = { id: 'task-1', category: 'domain', type: 'feature', priority: 'high' };
      const mockLayers = [
        Layer.create('Domain Layer', LayerType.DOMAIN, '', 1),
        Layer.create('Application Layer', LayerType.APPLICATION, '', 2)
      ];

      // Mock database responses
      mockDatabaseConnection.execute
        .mockResolvedValueOnce({ rows: mockLayers.map(l => l.toDatabaseRow()) }) // getActiveLayers
        .mockResolvedValueOnce({ rows: [{ id: 'assignment-1', layer_id: 'layer-1', task_id: 'task-1' }] }) // assignTaskToLayer
        .mockResolvedValueOnce({ rows: [{ id: 'assignment-2', layer_id: 'layer-2', task_id: 'task-1' }] }) // assignTaskToLayer
        .mockResolvedValueOnce({ rows: [{ id: 'assignment-1', layer_id: 'layer-1', task_id: 'task-1', status: 'in_progress' }] }) // updateTaskLayerStatus
        .mockResolvedValueOnce({ rows: [{ id: 'assignment-2', layer_id: 'layer-2', task_id: 'task-1', status: 'in_progress' }] }) // updateLayerTaskStatus
        .mockResolvedValueOnce({ rows: [{ id: 'coord-1' }] }) // createCoordinationRecord
        .mockResolvedValueOnce({ rows: [{ id: 'coord-1' }] }); // updateCoordinationRecord

      // Execute workflow
      const distributionResult = await layerTaskHandler.handleTaskDistribution('task-1');
      const statusResult = await layerTaskHandler.handleStatusUpdate('task-1', 'layer-1', 'in_progress');

      // Verify results
      expect(distributionResult.success).toBe(true);
      expect(distributionResult.distributionResults).toHaveLength(1);
      expect(statusResult.success).toBe(true);
      expect(statusResult.status).toBe('in_progress');

      // Verify events were emitted
      expect(mockEventBus.emit).toHaveBeenCalledWith('task.distributed', expect.any(Object));
      expect(mockEventBus.emit).toHaveBeenCalledWith('status.coordinated', expect.any(Object));
    });

    it('should handle layer creation and task assignment', async () => {
      // Mock layer creation
      const mockLayer = Layer.create('Test Layer', LayerType.DOMAIN, 'Test description', 1);
      mockDatabaseConnection.execute
        .mockResolvedValueOnce({ rows: [] }) // findByName
        .mockResolvedValueOnce({ rows: [mockLayer.toDatabaseRow()] }); // create

      // Mock task assignment
      const mockTask = { id: 'task-1', category: 'domain', type: 'feature' };
      mockDatabaseConnection.execute
        .mockResolvedValueOnce({ rows: [{ id: 'assignment-1', layer_id: 'layer-1', task_id: 'task-1' }] });

      // Execute workflow
      const layerResult = await layerTaskHandler.handleLayerCreation({
        name: 'Test Layer',
        layerType: LayerType.DOMAIN,
        description: 'Test description'
      });
      const assignmentResult = await layerTaskHandler.handleTaskAssignment('task-1', 'layer-1');

      // Verify results
      expect(layerResult.success).toBe(true);
      expect(layerResult.layer).toBeInstanceOf(Layer);
      expect(assignmentResult.success).toBe(true);
      expect(assignmentResult.assignmentResult.status).toBe('assigned');
    });

    it('should handle status coordination across multiple layers', async () => {
      // Mock task layer assignments
      const mockAssignments = [
        { layer_id: 'layer-1', task_id: 'task-1', layer_name: 'Domain Layer' },
        { layer_id: 'layer-2', task_id: 'task-1', layer_name: 'Application Layer' }
      ];

      // Mock coordination
      mockDatabaseConnection.execute
        .mockResolvedValueOnce({ rows: mockAssignments }) // getTaskLayerAssignments
        .mockResolvedValueOnce({ rows: [{ id: 'coord-1' }] }) // createCoordinationRecord
        .mockResolvedValueOnce({ rows: [{ id: 'assignment-1' }] }) // updateLayerTaskStatus
        .mockResolvedValueOnce({ rows: [{ id: 'assignment-2' }] }) // updateLayerTaskStatus
        .mockResolvedValueOnce({ rows: [{ id: 'coord-1' }] }); // updateCoordinationRecord

      // Execute coordination
      const result = await statusCoordinator.coordinateStatus('task-1', 'layer-1', 'completed', 'sync');

      // Verify results
      expect(result.coordinationStatus).toBe('success');
      expect(result.coordinated).toBe(2);
      expect(mockEventBus.emit).toHaveBeenCalledWith('status.coordinated', expect.any(Object));
    });
  });

  describe('Layer Management Integration', () => {
    it('should handle layer hierarchy and dependencies', async () => {
      // Mock layers with dependencies
      const mockLayers = [
        Layer.create('Domain Layer', LayerType.DOMAIN, '', 1),
        Layer.create('Application Layer', LayerType.APPLICATION, '', 2),
        Layer.create('Infrastructure Layer', LayerType.INFRASTRUCTURE, '', 3),
        Layer.create('Presentation Layer', LayerType.PRESENTATION, '', 4)
      ];

      mockDatabaseConnection.execute.mockResolvedValue({
        rows: mockLayers.map(l => l.toDatabaseRow())
      });

      // Get layer hierarchy
      const hierarchy = await layerManager.getLayerHierarchy();

      // Verify hierarchy order
      expect(hierarchy).toHaveLength(4);
      expect(hierarchy[0].layerType.value).toBe(LayerType.DOMAIN);
      expect(hierarchy[1].layerType.value).toBe(LayerType.APPLICATION);
      expect(hierarchy[2].layerType.value).toBe(LayerType.INFRASTRUCTURE);
      expect(hierarchy[3].layerType.value).toBe(LayerType.PRESENTATION);
    });

    it('should handle layer activation and deactivation', async () => {
      // Mock layer
      const mockLayer = Layer.create('Test Layer', LayerType.DOMAIN);
      mockDatabaseConnection.execute
        .mockResolvedValueOnce({ rows: [mockLayer.toDatabaseRow()] }) // getLayer
        .mockResolvedValueOnce({ rows: [mockLayer.toDatabaseRow()] }); // update

      // Deactivate layer
      const deactivatedLayer = await layerManager.deactivateLayer('layer-1');
      expect(deactivatedLayer.isActive).toBe(false);

      // Reactivate layer
      const activatedLayer = await layerManager.activateLayer('layer-1');
      expect(activatedLayer.isActive).toBe(true);

      // Verify events
      expect(mockEventBus.emit).toHaveBeenCalledWith('layer.deactivated', expect.any(Object));
      expect(mockEventBus.emit).toHaveBeenCalledWith('layer.activated', expect.any(Object));
    });
  });

  describe('Task Distribution Integration', () => {
    it('should handle automatic task distribution based on rules', async () => {
      // Mock task and rules
      const mockTask = { id: 'task-1', category: 'domain', type: 'feature' };
      const mockRules = [
        {
          id: 'rule-1',
          rule_name: 'domain-tasks',
          conditions: '{"category": "domain"}',
          target_layers: '["layer-1"]',
          priority: 1
        }
      ];

      // Mock database responses
      mockDatabaseConnection.execute
        .mockResolvedValueOnce({ rows: mockRules }) // getDistributionRules
        .mockResolvedValueOnce({ rows: [{ id: 'assignment-1', layer_id: 'layer-1', task_id: 'task-1' }] }); // distributeTask

      // Apply distribution rules
      const result = await taskDistributionManager.applyDistributionRules(mockTask);

      // Verify result
      expect(result).toHaveLength(1);
      expect(result[0].layerId).toBe('layer-1');
      expect(result[0].status).toBe('assigned');
    });

    it('should handle task removal from layers', async () => {
      // Mock task removal
      mockDatabaseConnection.execute.mockResolvedValue({
        rows: [{ id: 'assignment-1', layer_id: 'layer-1', task_id: 'task-1' }]
      });

      // Remove task from layer
      const result = await taskDistributionManager.removeTaskFromLayer('task-1', 'layer-1');

      // Verify result
      expect(result.layer_id).toBe('layer-1');
      expect(result.task_id).toBe('task-1');
      expect(mockEventBus.emit).toHaveBeenCalledWith('task.layer.removed', expect.any(Object));
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle layer deletion with assigned tasks', async () => {
      // Mock layer with assigned tasks
      const mockLayer = Layer.create('Test Layer', LayerType.DOMAIN);
      mockDatabaseConnection.execute
        .mockResolvedValueOnce({ rows: [mockLayer.toDatabaseRow()] }) // getLayer
        .mockResolvedValueOnce({ rows: [{ id: 'assignment-1', layer_id: 'layer-1', task_id: 'task-1' }] }); // getLayerTasks

      // Attempt to delete layer
      await expect(layerTaskHandler.handleLayerDeletion('layer-1'))
        .rejects.toThrow('Cannot delete layer with 1 assigned tasks');
    });

    it('should handle invalid status transitions', async () => {
      // Mock invalid status transition
      const mockAssignments = [
        { layer_id: 'layer-1', task_id: 'task-1', status: 'cancelled' }
      ];

      mockDatabaseConnection.execute.mockResolvedValue({
        rows: mockAssignments
      });

      // Attempt invalid transition
      await expect(statusCoordinator.validateStatusTransition('task-1', 'layer-1', 'in_progress'))
        .rejects.toThrow("Invalid status transition from 'cancelled' to 'in_progress'");
    });
  });

  describe('Performance Integration', () => {
    it('should handle bulk task distribution efficiently', async () => {
      // Mock bulk task distribution
      const mockTasks = Array.from({ length: 10 }, (_, i) => ({
        id: `task-${i}`,
        category: 'domain',
        type: 'feature'
      }));

      const mockLayers = [
        Layer.create('Domain Layer', LayerType.DOMAIN),
        Layer.create('Application Layer', LayerType.APPLICATION)
      ];

      // Mock database responses
      mockDatabaseConnection.execute
        .mockResolvedValue({ rows: mockLayers.map(l => l.toDatabaseRow()) }) // getActiveLayers
        .mockResolvedValue({ rows: [{ id: 'assignment-1', layer_id: 'layer-1', task_id: 'task-1' }] }); // assignTaskToLayer

      // Distribute multiple tasks
      const promises = mockTasks.map(task => 
        taskDistributionManager.distributeTask(task)
      );

      const results = await Promise.all(promises);

      // Verify all tasks were distributed
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result).toHaveLength(1);
        expect(result[0].status).toBe('assigned');
      });
    });
  });
});
