/**
 * TaskDistributionManager Unit Tests
 * Tests for task distribution functionality
 */

const TaskDistributionManager = require("../../infrastructure/database/TaskDistributionManager");
const LayerManager = require("../../infrastructure/database/LayerManager");
const Layer = require("../../domain/entities/Layer");
const LayerType = require("../../domain/value-objects/LayerType");

describe("TaskDistributionManager", () => {
  let taskDistributionManager;
  let mockDatabaseConnection;
  let mockLayerManager;
  let mockEventBus;

  beforeEach(() => {
    mockDatabaseConnection = {
      execute: jest.fn(),
    };
    mockLayerManager = {
      getActiveLayers: jest.fn(),
      getLayer: jest.fn(),
    };
    mockEventBus = {
      emit: jest.fn(),
    };

    taskDistributionManager = new TaskDistributionManager(
      mockDatabaseConnection,
      mockLayerManager,
      mockEventBus,
    );
  });

  describe("distributeTask", () => {
    it("should distribute task to target layers", async () => {
      const mockTask = { id: "task-1", category: "domain", type: "feature" };
      const mockLayers = [
        Layer.create("Domain Layer", LayerType.DOMAIN),
        Layer.create("Application Layer", LayerType.APPLICATION),
      ];

      mockDatabaseConnection.execute.mockResolvedValue({
        rows: [{ id: "assignment-1", layer_id: "layer-1", task_id: "task-1" }],
      });

      const result = await taskDistributionManager.distributeTask(
        mockTask,
        mockLayers,
      );

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe("assigned");
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        "task.distributed",
        expect.any(Object),
      );
    });

    it("should determine target layers automatically", async () => {
      const mockTask = { id: "task-1", category: "domain", type: "feature" };
      const mockLayers = [
        Layer.create("Domain Layer", LayerType.DOMAIN),
        Layer.create("Application Layer", LayerType.APPLICATION),
      ];

      mockLayerManager.getActiveLayers.mockResolvedValue(mockLayers);
      mockDatabaseConnection.execute.mockResolvedValue({
        rows: [{ id: "assignment-1", layer_id: "layer-1", task_id: "task-1" }],
      });

      const result = await taskDistributionManager.distributeTask(mockTask);

      expect(result).toHaveLength(1);
      expect(mockLayerManager.getActiveLayers).toHaveBeenCalled();
    });

    it("should throw error for no valid target layers", async () => {
      const mockTask = { id: "task-1", category: "invalid", type: "feature" };
      mockLayerManager.getActiveLayers.mockResolvedValue([]);

      await expect(
        taskDistributionManager.distributeTask(mockTask),
      ).rejects.toThrow("No valid target layers found");
    });
  });

  describe("determineTargetLayers", () => {
    it("should determine layers based on task category", async () => {
      const mockTask = { id: "task-1", category: "domain", type: "feature" };
      const mockLayers = [
        Layer.create("Domain Layer", LayerType.DOMAIN),
        Layer.create("Application Layer", LayerType.APPLICATION),
      ];

      mockLayerManager.getActiveLayers.mockResolvedValue(mockLayers);

      const result =
        await taskDistributionManager.determineTargetLayers(mockTask);

      expect(result).toHaveLength(1);
      expect(result[0].layerType.value).toBe(LayerType.DOMAIN);
    });

    it("should determine layers based on task type", async () => {
      const mockTask = {
        id: "task-1",
        category: "application",
        type: "feature",
      };
      const mockLayers = [
        Layer.create("Domain Layer", LayerType.DOMAIN),
        Layer.create("Application Layer", LayerType.APPLICATION),
      ];

      mockLayerManager.getActiveLayers.mockResolvedValue(mockLayers);

      const result =
        await taskDistributionManager.determineTargetLayers(mockTask);

      expect(result).toHaveLength(2);
    });

    it("should use default layer when no specific match", async () => {
      const mockTask = { id: "task-1", category: "unknown", type: "unknown" };
      const mockLayers = [
        Layer.create("Domain Layer", LayerType.DOMAIN),
        Layer.create("Application Layer", LayerType.APPLICATION),
      ];

      mockLayerManager.getActiveLayers.mockResolvedValue(mockLayers);

      const result =
        await taskDistributionManager.determineTargetLayers(mockTask);

      expect(result).toHaveLength(1);
      expect(result[0].layerType.value).toBe(LayerType.APPLICATION);
    });
  });

  describe("assignTaskToLayer", () => {
    it("should assign task to layer successfully", async () => {
      const mockTask = { id: "task-1", priority: "high" };
      const mockLayer = Layer.create("Domain Layer", LayerType.DOMAIN);

      mockDatabaseConnection.execute.mockResolvedValue({
        rows: [{ id: "assignment-1", layer_id: "layer-1", task_id: "task-1" }],
      });

      const result = await taskDistributionManager.assignTaskToLayer(
        mockTask,
        mockLayer,
      );

      expect(result.status).toBe("assigned");
      expect(result.layerId).toBe(mockLayer.id);
    });
  });

  describe("getTaskLayerAssignments", () => {
    it("should return task layer assignments", async () => {
      const mockAssignments = [
        {
          id: "assignment-1",
          layer_id: "layer-1",
          task_id: "task-1",
          layer_name: "Domain Layer",
        },
      ];

      mockDatabaseConnection.execute.mockResolvedValue({
        rows: mockAssignments,
      });

      const result =
        await taskDistributionManager.getTaskLayerAssignments("task-1");

      expect(result).toHaveLength(1);
      expect(result[0].layer_name).toBe("Domain Layer");
    });
  });

  describe("getLayerTasks", () => {
    it("should return layer tasks", async () => {
      const mockTasks = [
        {
          id: "assignment-1",
          layer_id: "layer-1",
          task_id: "task-1",
          title: "Test Task",
        },
      ];

      mockDatabaseConnection.execute.mockResolvedValue({
        rows: mockTasks,
      });

      const result = await taskDistributionManager.getLayerTasks("layer-1");

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Test Task");
    });

    it("should filter by status", async () => {
      const mockTasks = [
        {
          id: "assignment-1",
          layer_id: "layer-1",
          task_id: "task-1",
          status: "pending",
        },
      ];

      mockDatabaseConnection.execute.mockResolvedValue({
        rows: mockTasks,
      });

      const result = await taskDistributionManager.getLayerTasks(
        "layer-1",
        "pending",
      );

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe("pending");
    });
  });

  describe("updateTaskLayerStatus", () => {
    it("should update task layer status", async () => {
      mockDatabaseConnection.execute.mockResolvedValue({
        rows: [
          {
            id: "assignment-1",
            layer_id: "layer-1",
            task_id: "task-1",
            status: "in_progress",
          },
        ],
      });

      const result = await taskDistributionManager.updateTaskLayerStatus(
        "task-1",
        "layer-1",
        "in_progress",
      );

      expect(result.status).toBe("in_progress");
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        "task.layer.status.updated",
        expect.any(Object),
      );
    });

    it("should throw error for non-existent assignment", async () => {
      mockDatabaseConnection.execute.mockResolvedValue({
        rows: [],
      });

      await expect(
        taskDistributionManager.updateTaskLayerStatus(
          "task-1",
          "layer-1",
          "in_progress",
        ),
      ).rejects.toThrow("Task layer assignment not found");
    });
  });

  describe("removeTaskFromLayer", () => {
    it("should remove task from layer", async () => {
      mockDatabaseConnection.execute.mockResolvedValue({
        rows: [{ id: "assignment-1", layer_id: "layer-1", task_id: "task-1" }],
      });

      const result = await taskDistributionManager.removeTaskFromLayer(
        "task-1",
        "layer-1",
      );

      expect(result.layer_id).toBe("layer-1");
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        "task.layer.removed",
        expect.any(Object),
      );
    });
  });

  describe("getDistributionRules", () => {
    it("should return active distribution rules", async () => {
      const mockRules = [
        { id: "rule-1", rule_name: "domain-tasks", is_active: true },
      ];

      mockDatabaseConnection.execute.mockResolvedValue({
        rows: mockRules,
      });

      const result = await taskDistributionManager.getDistributionRules();

      expect(result).toHaveLength(1);
      expect(result[0].rule_name).toBe("domain-tasks");
    });
  });

  describe("createDistributionRule", () => {
    it("should create distribution rule", async () => {
      const ruleData = {
        ruleName: "test-rule",
        description: "Test rule",
        ruleType: "automatic",
        conditions: { category: "domain" },
        targetLayers: ["layer-1"],
        priority: 1,
      };

      mockDatabaseConnection.execute.mockResolvedValue({
        rows: [{ id: "rule-1", rule_name: "test-rule" }],
      });

      const result =
        await taskDistributionManager.createDistributionRule(ruleData);

      expect(result.rule_name).toBe("test-rule");
    });
  });

  describe("applyDistributionRules", () => {
    it("should apply applicable distribution rules", async () => {
      const mockTask = { id: "task-1", category: "domain", type: "feature" };
      const mockRules = [
        {
          id: "rule-1",
          rule_name: "domain-tasks",
          conditions: '{"category": "domain"}',
          target_layers: '["layer-1"]',
          priority: 1,
        },
      ];

      mockDatabaseConnection.execute.mockResolvedValue({
        rows: mockRules,
      });

      // Mock distributeTask method
      taskDistributionManager.distributeTask = jest
        .fn()
        .mockResolvedValue([{ layerId: "layer-1", status: "assigned" }]);

      const result =
        await taskDistributionManager.applyDistributionRules(mockTask);

      expect(result).toHaveLength(1);
      expect(result[0].layerId).toBe("layer-1");
    });
  });
});
