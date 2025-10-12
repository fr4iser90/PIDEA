/**
 * TaskDistributionManager - Infrastructure Service for Task Distribution
 * Handles task distribution across architectural layers
 */

class TaskDistributionManager {
  constructor(databaseConnection, layerManager, eventBus = null) {
    this.databaseConnection = databaseConnection;
    this.layerManager = layerManager;
    this.eventBus = eventBus;
    this.logger = null;
    
    this.initialize();
  }

  initialize() {
    // Initialize logger
    const ServiceLogger = require('@logging/ServiceLogger');
    this.logger = new ServiceLogger('TaskDistributionManager');
  }

  async distributeTask(task, targetLayers = null) {
    try {
      this.logger.info('Distributing task', { taskId: task.id, taskType: task.type });

      // If no target layers specified, determine based on task properties
      if (!targetLayers) {
        targetLayers = await this.determineTargetLayers(task);
      }

      // Validate target layers
      const validLayers = await this.validateTargetLayers(targetLayers);
      if (validLayers.length === 0) {
        throw new Error('No valid target layers found');
      }

      // Distribute task to layers
      const distributionResults = [];
      for (const layer of validLayers) {
        const result = await this.assignTaskToLayer(task, layer);
        distributionResults.push(result);
      }

      this.logger.info('Task distributed successfully', { 
        taskId: task.id, 
        distributedTo: distributionResults.length 
      });

      // Emit event
      if (this.eventBus) {
        this.eventBus.emit('task.distributed', {
          taskId: task.id,
          targetLayers: validLayers.map(l => l.id),
          distributionResults
        });
      }

      return distributionResults;
    } catch (error) {
      this.logger.error('Failed to distribute task', { taskId: task.id, error: error.message });
      throw error;
    }
  }

  async determineTargetLayers(task) {
    try {
      const layers = await this.layerManager.getActiveLayers();
      const targetLayers = [];

      // Determine layers based on task properties
      if (task.category) {
        const categoryLayers = layers.filter(layer => 
          layer.getTaskCategories().includes(task.category)
        );
        targetLayers.push(...categoryLayers);
      }

      if (task.type) {
        const typeLayers = layers.filter(layer => 
          layer.getTaskTypes().includes(task.type)
        );
        targetLayers.push(...typeLayers);
      }

      // If no specific layers found, use default distribution
      if (targetLayers.length === 0) {
        const defaultLayer = layers.find(layer => layer.layerType.value === 'application');
        if (defaultLayer) {
          targetLayers.push(defaultLayer);
        }
      }

      return targetLayers;
    } catch (error) {
      this.logger.error('Failed to determine target layers', { error: error.message });
      throw error;
    }
  }

  async validateTargetLayers(targetLayers) {
    try {
      const validLayers = [];
      
      for (const layer of targetLayers) {
        const layerEntity = await this.layerManager.getLayer(layer.id || layer);
        if (layerEntity && layerEntity.isActive) {
          validLayers.push(layerEntity);
        }
      }

      return validLayers;
    } catch (error) {
      this.logger.error('Failed to validate target layers', { error: error.message });
      throw error;
    }
  }

  async assignTaskToLayer(task, layer) {
    try {
      const sql = `
        INSERT INTO layer_tasks (layer_id, task_id, assignment_type, priority, status, assigned_at, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (layer_id, task_id) DO UPDATE SET
          assignment_type = EXCLUDED.assignment_type,
          priority = EXCLUDED.priority,
          status = EXCLUDED.status,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `;

      const values = [
        layer.id,
        task.id,
        'direct',
        task.priority || 0,
        'pending',
        new Date().toISOString(),
        JSON.stringify({ assignedAt: new Date().toISOString() })
      ];

      const result = await this.databaseConnection.execute(sql, values);
      
      this.logger.info('Task assigned to layer', { 
        taskId: task.id, 
        layerId: layer.id, 
        layerName: layer.name 
      });

      return {
        layerId: layer.id,
        layerName: layer.name,
        assignmentId: result.rows[0].id,
        status: 'assigned'
      };
    } catch (error) {
      this.logger.error('Failed to assign task to layer', { 
        taskId: task.id, 
        layerId: layer.id, 
        error: error.message 
      });
      throw error;
    }
  }

  async getTaskLayerAssignments(taskId) {
    try {
      const sql = `
        SELECT lt.*, l.name as layer_name, l.layer_type, l.description as layer_description
        FROM layer_tasks lt
        JOIN layers l ON lt.layer_id = l.id
        WHERE lt.task_id = $1
        ORDER BY lt.assigned_at DESC
      `;

      const result = await this.databaseConnection.execute(sql, [taskId]);
      return result.rows;
    } catch (error) {
      this.logger.error('Failed to get task layer assignments', { taskId, error: error.message });
      throw error;
    }
  }

  async getLayerTasks(layerId, status = null) {
    try {
      let sql = `
        SELECT lt.*, t.title, t.description, t.type, t.priority, t.status as task_status
        FROM layer_tasks lt
        JOIN tasks t ON lt.task_id = t.id
        WHERE lt.layer_id = $1
      `;
      
      const values = [layerId];
      
      if (status) {
        sql += ' AND lt.status = $2';
        values.push(status);
      }
      
      sql += ' ORDER BY lt.priority DESC, lt.assigned_at ASC';

      const result = await this.databaseConnection.execute(sql, values);
      return result.rows;
    } catch (error) {
      this.logger.error('Failed to get layer tasks', { layerId, error: error.message });
      throw error;
    }
  }

  async updateTaskLayerStatus(taskId, layerId, status) {
    try {
      const sql = `
        UPDATE layer_tasks
        SET status = $1, updated_at = CURRENT_TIMESTAMP
        WHERE task_id = $2 AND layer_id = $3
        RETURNING *
      `;

      const result = await this.databaseConnection.execute(sql, [status, taskId, layerId]);
      
      if (result.rows.length === 0) {
        throw new Error('Task layer assignment not found');
      }

      this.logger.info('Task layer status updated', { 
        taskId, 
        layerId, 
        status 
      });

      // Emit event
      if (this.eventBus) {
        this.eventBus.emit('task.layer.status.updated', {
          taskId,
          layerId,
          status
        });
      }

      return result.rows[0];
    } catch (error) {
      this.logger.error('Failed to update task layer status', { 
        taskId, 
        layerId, 
        error: error.message 
      });
      throw error;
    }
  }

  async removeTaskFromLayer(taskId, layerId) {
    try {
      const sql = `
        DELETE FROM layer_tasks
        WHERE task_id = $1 AND layer_id = $2
        RETURNING *
      `;

      const result = await this.databaseConnection.execute(sql, [taskId, layerId]);
      
      if (result.rows.length === 0) {
        throw new Error('Task layer assignment not found');
      }

      this.logger.info('Task removed from layer', { 
        taskId, 
        layerId 
      });

      // Emit event
      if (this.eventBus) {
        this.eventBus.emit('task.layer.removed', {
          taskId,
          layerId
        });
      }

      return result.rows[0];
    } catch (error) {
      this.logger.error('Failed to remove task from layer', { 
        taskId, 
        layerId, 
        error: error.message 
      });
      throw error;
    }
  }

  async getDistributionRules() {
    try {
      const sql = `
        SELECT * FROM task_distribution_rules
        WHERE is_active = true
        ORDER BY priority DESC, created_at ASC
      `;

      const result = await this.databaseConnection.execute(sql);
      return result.rows;
    } catch (error) {
      this.logger.error('Failed to get distribution rules', { error: error.message });
      throw error;
    }
  }

  async createDistributionRule(ruleData) {
    try {
      const sql = `
        INSERT INTO task_distribution_rules (rule_name, description, rule_type, conditions, target_layers, priority, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;

      const values = [
        ruleData.ruleName,
        ruleData.description || '',
        ruleData.ruleType || 'automatic',
        JSON.stringify(ruleData.conditions),
        JSON.stringify(ruleData.targetLayers),
        ruleData.priority || 0,
        JSON.stringify(ruleData.metadata || {})
      ];

      const result = await this.databaseConnection.execute(sql, values);
      
      this.logger.info('Distribution rule created', { 
        ruleId: result.rows[0].id, 
        ruleName: result.rows[0].rule_name 
      });

      return result.rows[0];
    } catch (error) {
      this.logger.error('Failed to create distribution rule', { error: error.message });
      throw error;
    }
  }

  async applyDistributionRules(task) {
    try {
      const rules = await this.getDistributionRules();
      const applicableRules = [];

      for (const rule of rules) {
        if (await this.isRuleApplicable(task, rule)) {
          applicableRules.push(rule);
        }
      }

      // Sort by priority
      applicableRules.sort((a, b) => b.priority - a.priority);

      // Apply the highest priority rule
      if (applicableRules.length > 0) {
        const rule = applicableRules[0];
        const targetLayers = JSON.parse(rule.target_layers);
        return await this.distributeTask(task, targetLayers);
      }

      return [];
    } catch (error) {
      this.logger.error('Failed to apply distribution rules', { error: error.message });
      throw error;
    }
  }

  async isRuleApplicable(task, rule) {
    try {
      const conditions = JSON.parse(rule.conditions);
      
      // Check category condition
      if (conditions.category && task.category !== conditions.category) {
        return false;
      }

      // Check type condition
      if (conditions.type && task.type !== conditions.type) {
        return false;
      }

      // Check priority condition
      if (conditions.priority && task.priority !== conditions.priority) {
        return false;
      }

      // Check metadata conditions
      if (conditions.metadata) {
        for (const [key, value] of Object.entries(conditions.metadata)) {
          if (task.metadata && task.metadata[key] !== value) {
            return false;
          }
        }
      }

      return true;
    } catch (error) {
      this.logger.error('Failed to check rule applicability', { error: error.message });
      return false;
    }
  }
}

module.exports = TaskDistributionManager;
