/**
 * LayerTaskHandler - Application Handler for Layer Task Operations
 * Handles layer task operations and coordination
 */

class LayerTaskHandler {
  constructor(dependencies = {}) {
    this.layerManager = dependencies.layerManager;
    this.taskDistributionManager = dependencies.taskDistributionManager;
    this.statusCoordinator = dependencies.statusCoordinator;
    this.taskRepository = dependencies.taskRepository;
    this.eventBus = dependencies.eventBus;
    this.logger = dependencies.logger || null;

    this.initialize();
  }

  initialize() {
    // Initialize logger
    const ServiceLogger = require("@logging/ServiceLogger");
    this.logger = this.logger || new ServiceLogger("LayerTaskHandler");
  }

  async handleTaskDistribution(taskId, options = {}) {
    try {
      this.logger.info("Handling task distribution", { taskId, options });

      // Get task
      const task = await this.taskRepository.findById(taskId);
      if (!task) {
        throw new Error(`Task with id '${taskId}' not found`);
      }

      // Distribute task
      const distributionResults =
        await this.taskDistributionManager.distributeTask(
          task,
          options.targetLayers,
        );

      this.logger.info("Task distribution handled successfully", {
        taskId,
        distributedTo: distributionResults.length,
      });

      return {
        taskId,
        distributionResults,
      };
    } catch (error) {
      this.logger.error("Failed to handle task distribution", {
        taskId,
        error: error.message,
      });
      throw error;
    }
  }

  async handleStatusUpdate(taskId, layerId, status, options = {}) {
    try {
      this.logger.info("Handling status update", {
        taskId,
        layerId,
        status,
        options,
      });

      // Validate status transition
      await this.statusCoordinator.validateStatusTransition(
        taskId,
        layerId,
        status,
      );

      // Update layer task status
      await this.taskDistributionManager.updateTaskLayerStatus(
        taskId,
        layerId,
        status,
      );

      // Coordinate status if requested
      if (options.coordinate !== false) {
        const coordinationType = options.coordinationType || "sync";
        await this.statusCoordinator.coordinateStatus(
          taskId,
          layerId,
          status,
          coordinationType,
        );
      }

      this.logger.info("Status update handled successfully", {
        taskId,
        layerId,
        status,
      });

      return {
        taskId,
        layerId,
        status,
      };
    } catch (error) {
      this.logger.error("Failed to handle status update", {
        taskId,
        layerId,
        error: error.message,
      });
      throw error;
    }
  }

  async handleTaskAssignment(taskId, layerId, options = {}) {
    try {
      this.logger.info("Handling task assignment", {
        taskId,
        layerId,
        options,
      });

      // Get task
      const task = await this.taskRepository.findById(taskId);
      if (!task) {
        throw new Error(`Task with id '${taskId}' not found`);
      }

      // Get layer
      const layer = await this.layerManager.getLayer(layerId);
      if (!layer) {
        throw new Error(`Layer with id '${layerId}' not found`);
      }

      // Assign task to layer
      const assignmentResult =
        await this.taskDistributionManager.assignTaskToLayer(task, layer);

      this.logger.info("Task assignment handled successfully", {
        taskId,
        layerId,
        assignmentId: assignmentResult.assignmentId,
      });

      return {
        taskId,
        layerId,
        assignmentResult,
      };
    } catch (error) {
      this.logger.error("Failed to handle task assignment", {
        taskId,
        layerId,
        error: error.message,
      });
      throw error;
    }
  }

  async handleTaskRemoval(taskId, layerId) {
    try {
      this.logger.info("Handling task removal", { taskId, layerId });

      // Remove task from layer
      await this.taskDistributionManager.removeTaskFromLayer(taskId, layerId);

      this.logger.info("Task removal handled successfully", {
        taskId,
        layerId,
      });

      return {
        taskId,
        layerId,
      };
    } catch (error) {
      this.logger.error("Failed to handle task removal", {
        taskId,
        layerId,
        error: error.message,
      });
      throw error;
    }
  }

  async handleLayerCreation(layerData) {
    try {
      this.logger.info("Handling layer creation", { layerData });

      // Create layer
      const layer = await this.layerManager.createLayer(
        layerData.name,
        layerData.layerType,
        layerData.description,
        layerData.orderIndex,
      );

      this.logger.info("Layer creation handled successfully", {
        layerId: layer.id,
        layerName: layer.name,
      });

      return {
        layer,
      };
    } catch (error) {
      this.logger.error("Failed to handle layer creation", {
        layerData,
        error: error.message,
      });
      throw error;
    }
  }

  async handleLayerUpdate(layerId, updates) {
    try {
      this.logger.info("Handling layer update", { layerId, updates });

      // Update layer
      const layer = await this.layerManager.updateLayer(layerId, updates);

      this.logger.info("Layer update handled successfully", {
        layerId: layer.id,
        layerName: layer.name,
      });

      return {
        layer,
      };
    } catch (error) {
      this.logger.error("Failed to handle layer update", {
        layerId,
        error: error.message,
      });
      throw error;
    }
  }

  async handleLayerDeletion(layerId) {
    try {
      this.logger.info("Handling layer deletion", { layerId });

      // Check if layer has assigned tasks
      const layerTasks =
        await this.taskDistributionManager.getLayerTasks(layerId);
      if (layerTasks.length > 0) {
        throw new Error(
          `Cannot delete layer with ${layerTasks.length} assigned tasks`,
        );
      }

      // Delete layer
      await this.layerManager.deleteLayer(layerId);

      this.logger.info("Layer deletion handled successfully", {
        layerId,
      });

      return {
        layerId,
      };
    } catch (error) {
      this.logger.error("Failed to handle layer deletion", {
        layerId,
        error: error.message,
      });
      throw error;
    }
  }

  async handleCoordinationResolution(coordinationId) {
    try {
      this.logger.info("Handling coordination resolution", { coordinationId });

      // Resolve pending coordination
      const result =
        await this.statusCoordinator.resolvePendingCoordination(coordinationId);

      this.logger.info("Coordination resolution handled successfully", {
        coordinationId,
        coordinated: result.coordinated,
      });

      return {
        coordinationId,
        result,
      };
    } catch (error) {
      this.logger.error("Failed to handle coordination resolution", {
        coordinationId,
        error: error.message,
      });
      throw error;
    }
  }

  async handleDistributionRuleCreation(ruleData) {
    try {
      this.logger.info("Handling distribution rule creation", { ruleData });

      // Create distribution rule
      const rule =
        await this.taskDistributionManager.createDistributionRule(ruleData);

      this.logger.info("Distribution rule creation handled successfully", {
        ruleId: rule.id,
        ruleName: rule.rule_name,
      });

      return {
        rule,
      };
    } catch (error) {
      this.logger.error("Failed to handle distribution rule creation", {
        ruleData,
        error: error.message,
      });
      throw error;
    }
  }

  async handleTaskLayerQuery(taskId) {
    try {
      this.logger.info("Handling task layer query", { taskId });

      // Get task layer assignments
      const assignments =
        await this.taskDistributionManager.getTaskLayerAssignments(taskId);

      this.logger.info("Task layer query handled successfully", {
        taskId,
        assignments: assignments.length,
      });

      return {
        taskId,
        assignments,
      };
    } catch (error) {
      this.logger.error("Failed to handle task layer query", {
        taskId,
        error: error.message,
      });
      throw error;
    }
  }

  async handleLayerTaskQuery(layerId, status = null) {
    try {
      this.logger.info("Handling layer task query", { layerId, status });

      // Get layer tasks
      const tasks = await this.taskDistributionManager.getLayerTasks(
        layerId,
        status,
      );

      this.logger.info("Layer task query handled successfully", {
        layerId,
        tasks: tasks.length,
      });

      return {
        layerId,
        tasks,
      };
    } catch (error) {
      this.logger.error("Failed to handle layer task query", {
        layerId,
        error: error.message,
      });
      throw error;
    }
  }

  async handleCoordinationHistoryQuery(taskId, limit = 50) {
    try {
      this.logger.info("Handling coordination history query", {
        taskId,
        limit,
      });

      // Get coordination history
      const history = await this.statusCoordinator.getCoordinationHistory(
        taskId,
        limit,
      );

      this.logger.info("Coordination history query handled successfully", {
        taskId,
        history: history.length,
      });

      return {
        taskId,
        history,
      };
    } catch (error) {
      this.logger.error("Failed to handle coordination history query", {
        taskId,
        error: error.message,
      });
      throw error;
    }
  }

  async handlePendingCoordinationsQuery() {
    try {
      this.logger.info("Handling pending coordinations query");

      // Get pending coordinations
      const coordinations =
        await this.statusCoordinator.getPendingCoordinations();

      this.logger.info("Pending coordinations query handled successfully", {
        coordinations: coordinations.length,
      });

      return {
        coordinations,
      };
    } catch (error) {
      this.logger.error("Failed to handle pending coordinations query", {
        error: error.message,
      });
      throw error;
    }
  }

  async handleLayerHierarchyQuery() {
    try {
      this.logger.info("Handling layer hierarchy query");

      // Get layer hierarchy
      const hierarchy = await this.layerManager.getLayerHierarchy();

      this.logger.info("Layer hierarchy query handled successfully", {
        layers: hierarchy.length,
      });

      return {
        hierarchy,
      };
    } catch (error) {
      this.logger.error("Failed to handle layer hierarchy query", {
        error: error.message,
      });
      throw error;
    }
  }

  async handleDefaultLayersInitialization() {
    try {
      this.logger.info("Handling default layers initialization");

      // Initialize default layers
      const layers = await this.layerManager.initializeDefaultLayers();

      this.logger.info("Default layers initialization handled successfully", {
        layers: layers.length,
      });

      return {
        layers,
      };
    } catch (error) {
      this.logger.error("Failed to handle default layers initialization", {
        error: error.message,
      });
      throw error;
    }
  }
}

module.exports = LayerTaskHandler;
