/**
 * StatusCoordinator - Infrastructure Service for Status Coordination
 * Handles status synchronization between architectural layers
 */

class StatusCoordinator {
  constructor(databaseConnection, eventBus = null) {
    this.databaseConnection = databaseConnection;
    this.eventBus = eventBus;
    this.logger = null;

    this.initialize();
  }

  initialize() {
    // Initialize logger
    const ServiceLogger = require("@logging/ServiceLogger");
    this.logger = new ServiceLogger("StatusCoordinator");
  }

  async coordinateStatus(taskId, layerId, status, coordinationType = "sync") {
    try {
      this.logger.info("Coordinating status", {
        taskId,
        layerId,
        status,
        coordinationType,
      });

      // Get task layer assignments
      const assignments = await this.getTaskLayerAssignments(taskId);
      if (assignments.length === 0) {
        throw new Error("No layer assignments found for task");
      }

      // Find the source layer
      const sourceLayer = assignments.find((a) => a.layer_id === layerId);
      if (!sourceLayer) {
        throw new Error("Source layer not found in task assignments");
      }

      // Determine target layers (all other layers)
      const targetLayers = assignments
        .filter((a) => a.layer_id !== layerId)
        .map((a) => a.layer_id);

      if (targetLayers.length === 0) {
        this.logger.info("No target layers for coordination", {
          taskId,
          layerId,
        });
        return { coordinated: 0 };
      }

      // Create coordination record
      const coordinationId = await this.createCoordinationRecord(
        layerId,
        taskId,
        status,
        coordinationType,
        sourceLayer.layer_id,
        targetLayers,
      );

      // Execute coordination based on type
      let coordinationResult;
      switch (coordinationType) {
        case "sync":
          coordinationResult = await this.executeSyncCoordination(
            taskId,
            layerId,
            status,
            targetLayers,
          );
          break;
        case "async":
          coordinationResult = await this.executeAsyncCoordination(
            taskId,
            layerId,
            status,
            targetLayers,
          );
          break;
        case "manual":
          coordinationResult = await this.executeManualCoordination(
            taskId,
            layerId,
            status,
            targetLayers,
          );
          break;
        default:
          throw new Error(`Unknown coordination type: ${coordinationType}`);
      }

      // Update coordination record
      await this.updateCoordinationRecord(coordinationId, coordinationResult);

      this.logger.info("Status coordination completed", {
        taskId,
        layerId,
        status,
        coordinated: coordinationResult.coordinated,
      });

      // Emit event
      if (this.eventBus) {
        this.eventBus.emit("status.coordinated", {
          taskId,
          sourceLayerId: layerId,
          status,
          coordinationType,
          coordinationResult,
        });
      }

      return coordinationResult;
    } catch (error) {
      this.logger.error("Failed to coordinate status", {
        taskId,
        layerId,
        error: error.message,
      });
      throw error;
    }
  }

  async executeSyncCoordination(taskId, sourceLayerId, status, targetLayers) {
    try {
      const results = [];
      let successCount = 0;
      let failureCount = 0;

      for (const targetLayerId of targetLayers) {
        try {
          // Update layer task status
          await this.updateLayerTaskStatus(taskId, targetLayerId, status);
          results.push({ layerId: targetLayerId, status: "success" });
          successCount++;
        } catch (error) {
          this.logger.error("Failed to update layer task status", {
            taskId,
            targetLayerId,
            error: error.message,
          });
          results.push({
            layerId: targetLayerId,
            status: "failed",
            error: error.message,
          });
          failureCount++;
        }
      }

      return {
        coordinationStatus:
          failureCount === 0
            ? "success"
            : successCount > 0
              ? "partial"
              : "failed",
        coordinated: successCount,
        failed: failureCount,
        results,
      };
    } catch (error) {
      this.logger.error("Failed to execute sync coordination", {
        error: error.message,
      });
      throw error;
    }
  }

  async executeAsyncCoordination(taskId, sourceLayerId, status, targetLayers) {
    try {
      // For async coordination, we just queue the updates
      const results = [];

      for (const targetLayerId of targetLayers) {
        try {
          // Queue the status update
          await this.queueLayerTaskStatusUpdate(taskId, targetLayerId, status);
          results.push({ layerId: targetLayerId, status: "queued" });
        } catch (error) {
          this.logger.error("Failed to queue layer task status update", {
            taskId,
            targetLayerId,
            error: error.message,
          });
          results.push({
            layerId: targetLayerId,
            status: "failed",
            error: error.message,
          });
        }
      }

      return {
        coordinationStatus: "pending",
        coordinated: results.filter((r) => r.status === "queued").length,
        failed: results.filter((r) => r.status === "failed").length,
        results,
      };
    } catch (error) {
      this.logger.error("Failed to execute async coordination", {
        error: error.message,
      });
      throw error;
    }
  }

  async executeManualCoordination(taskId, sourceLayerId, status, targetLayers) {
    try {
      // For manual coordination, we just record the need for coordination
      const results = [];

      for (const targetLayerId of targetLayers) {
        results.push({ layerId: targetLayerId, status: "pending_manual" });
      }

      return {
        coordinationStatus: "pending",
        coordinated: 0,
        failed: 0,
        results,
      };
    } catch (error) {
      this.logger.error("Failed to execute manual coordination", {
        error: error.message,
      });
      throw error;
    }
  }

  async createCoordinationRecord(
    layerId,
    taskId,
    status,
    coordinationType,
    sourceLayerId,
    targetLayers,
  ) {
    try {
      const sql = `
        INSERT INTO layer_status_coordination (
          layer_id, task_id, status, coordination_type, source_layer_id, 
          target_layers, coordination_status, metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `;

      const values = [
        layerId,
        taskId,
        status,
        coordinationType,
        sourceLayerId,
        JSON.stringify(targetLayers),
        "pending",
        JSON.stringify({ createdAt: new Date().toISOString() }),
      ];

      const result = await this.databaseConnection.execute(sql, values);
      return result.rows[0].id;
    } catch (error) {
      this.logger.error("Failed to create coordination record", {
        error: error.message,
      });
      throw error;
    }
  }

  async updateCoordinationRecord(coordinationId, coordinationResult) {
    try {
      const sql = `
        UPDATE layer_status_coordination
        SET coordination_status = $1, updated_at = CURRENT_TIMESTAMP, metadata = $2
        WHERE id = $3
      `;

      const metadata = {
        coordinationResult,
        updatedAt: new Date().toISOString(),
      };

      await this.databaseConnection.execute(sql, [
        coordinationResult.coordinationStatus,
        JSON.stringify(metadata),
        coordinationId,
      ]);
    } catch (error) {
      this.logger.error("Failed to update coordination record", {
        error: error.message,
      });
      throw error;
    }
  }

  async updateLayerTaskStatus(taskId, layerId, status) {
    try {
      const sql = `
        UPDATE layer_tasks
        SET status = $1, updated_at = CURRENT_TIMESTAMP
        WHERE task_id = $2 AND layer_id = $3
        RETURNING *
      `;

      const result = await this.databaseConnection.execute(sql, [
        status,
        taskId,
        layerId,
      ]);

      if (result.rows.length === 0) {
        throw new Error("Layer task assignment not found");
      }

      return result.rows[0];
    } catch (error) {
      this.logger.error("Failed to update layer task status", {
        taskId,
        layerId,
        error: error.message,
      });
      throw error;
    }
  }

  async queueLayerTaskStatusUpdate(taskId, layerId, status) {
    try {
      // For now, we'll just update the status directly
      // In a real implementation, this would queue the update for background processing
      return await this.updateLayerTaskStatus(taskId, layerId, status);
    } catch (error) {
      this.logger.error("Failed to queue layer task status update", {
        taskId,
        layerId,
        error: error.message,
      });
      throw error;
    }
  }

  async getTaskLayerAssignments(taskId) {
    try {
      const sql = `
        SELECT lt.*, l.name as layer_name, l.layer_type
        FROM layer_tasks lt
        JOIN layers l ON lt.layer_id = l.id
        WHERE lt.task_id = $1
        ORDER BY lt.assigned_at DESC
      `;

      const result = await this.databaseConnection.execute(sql, [taskId]);
      return result.rows;
    } catch (error) {
      this.logger.error("Failed to get task layer assignments", {
        taskId,
        error: error.message,
      });
      throw error;
    }
  }

  async getCoordinationHistory(taskId, limit = 50) {
    try {
      const sql = `
        SELECT lsc.*, l.name as layer_name, l.layer_type
        FROM layer_status_coordination lsc
        JOIN layers l ON lsc.layer_id = l.id
        WHERE lsc.task_id = $1
        ORDER BY lsc.created_at DESC
        LIMIT $2
      `;

      const result = await this.databaseConnection.execute(sql, [
        taskId,
        limit,
      ]);
      return result.rows;
    } catch (error) {
      this.logger.error("Failed to get coordination history", {
        taskId,
        error: error.message,
      });
      throw error;
    }
  }

  async getPendingCoordinations() {
    try {
      const sql = `
        SELECT lsc.*, l.name as layer_name, l.layer_type
        FROM layer_status_coordination lsc
        JOIN layers l ON lsc.layer_id = l.id
        WHERE lsc.coordination_status = 'pending'
        ORDER BY lsc.created_at ASC
      `;

      const result = await this.databaseConnection.execute(sql);
      return result.rows;
    } catch (error) {
      this.logger.error("Failed to get pending coordinations", {
        error: error.message,
      });
      throw error;
    }
  }

  async resolvePendingCoordination(coordinationId) {
    try {
      const sql = `
        SELECT * FROM layer_status_coordination
        WHERE id = $1 AND coordination_status = 'pending'
      `;

      const result = await this.databaseConnection.execute(sql, [
        coordinationId,
      ]);

      if (result.rows.length === 0) {
        throw new Error("Pending coordination not found");
      }

      const coordination = result.rows[0];
      const targetLayers = JSON.parse(coordination.target_layers);

      // Execute the coordination
      const coordinationResult = await this.executeSyncCoordination(
        coordination.task_id,
        coordination.layer_id,
        coordination.status,
        targetLayers,
      );

      // Update the coordination record
      await this.updateCoordinationRecord(coordinationId, coordinationResult);

      this.logger.info("Pending coordination resolved", { coordinationId });

      return coordinationResult;
    } catch (error) {
      this.logger.error("Failed to resolve pending coordination", {
        coordinationId,
        error: error.message,
      });
      throw error;
    }
  }

  async getLayerDependencies(layerId) {
    try {
      const sql = `
        SELECT ld.*, l.name as target_layer_name, l.layer_type as target_layer_type
        FROM layer_dependencies ld
        JOIN layers l ON ld.target_layer_id = l.id
        WHERE ld.source_layer_id = $1 AND ld.is_active = true
        ORDER BY ld.created_at ASC
      `;

      const result = await this.databaseConnection.execute(sql, [layerId]);
      return result.rows;
    } catch (error) {
      this.logger.error("Failed to get layer dependencies", {
        layerId,
        error: error.message,
      });
      throw error;
    }
  }

  async validateStatusTransition(taskId, layerId, newStatus) {
    try {
      // Get current status
      const assignments = await this.getTaskLayerAssignments(taskId);
      const currentAssignment = assignments.find((a) => a.layer_id === layerId);

      if (!currentAssignment) {
        throw new Error("Layer assignment not found");
      }

      const currentStatus = currentAssignment.status;

      // Define valid status transitions
      const validTransitions = {
        pending: ["in_progress", "cancelled"],
        in_progress: ["completed", "failed", "cancelled"],
        completed: ["in_progress"], // Allow reopening
        failed: ["in_progress", "cancelled"],
        cancelled: [], // No transitions from cancelled
      };

      const allowedStatuses = validTransitions[currentStatus] || [];

      if (!allowedStatuses.includes(newStatus)) {
        throw new Error(
          `Invalid status transition from '${currentStatus}' to '${newStatus}'`,
        );
      }

      return true;
    } catch (error) {
      this.logger.error("Failed to validate status transition", {
        taskId,
        layerId,
        error: error.message,
      });
      throw error;
    }
  }
}

module.exports = StatusCoordinator;
