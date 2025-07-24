/**
 * PostgreSQLTaskSuggestionRepository - PostgreSQL implementation of TaskSuggestionRepository
 * Uses snake_case column names to match PostgreSQL schema
 */

const TaskSuggestionRepository = require('@domain/repositories/TaskSuggestionRepository');
const logger = require('@infrastructure/logging/Logger');

class PostgreSQLTaskSuggestionRepository extends TaskSuggestionRepository {
  constructor(databaseConnection) {
    super();
    this.databaseConnection = databaseConnection;
    this.tableName = 'task_suggestions';
  }

  async init() {
    try {
      // Create index for project path
      await this.databaseConnection.execute(`CREATE INDEX IF NOT EXISTS idx_task_suggestions_project ON ${this.tableName} (project_path)`);
      logger.info(`✅ TaskSuggestionRepository initialized for PostgreSQL`);
    } catch (error) {
      logger.error(`❌ Failed to initialize TaskSuggestionRepository: ${error.message}`);
      throw error;
    }
  }

  async create(suggestion) {
    try {
      const sql = `
        INSERT INTO ${this.tableName} (
          id, title, description, task_type, priority, estimated_time,
          tags, confidence, reasoning, context, project_path, metadata,
          status, is_approved, is_rejected, applied_at, applied_by,
          ai_model, ai_response, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        suggestion.id,
        suggestion.title,
        suggestion.description,
        suggestion.taskType,
        suggestion.priority,
        suggestion.estimatedTime,
        JSON.stringify(suggestion.tags || []),
        suggestion.confidence,
        suggestion.reasoning,
        suggestion.context,
        suggestion.projectPath,
        JSON.stringify(suggestion.metadata || {}),
        suggestion.status,
        suggestion.isApproved ? 1 : 0,
        suggestion.isRejected ? 1 : 0,
        suggestion.appliedAt ? suggestion.appliedAt.toISOString() : null,
        suggestion.appliedBy,
        suggestion.aiModel,
        suggestion.aiResponse,
        suggestion.createdAt ? suggestion.createdAt.toISOString() : new Date().toISOString(),
        suggestion.updatedAt ? suggestion.updatedAt.toISOString() : new Date().toISOString()
      ];

      await this.databaseConnection.execute(sql, params);
      return suggestion;
    } catch (error) {
      throw new Error(`Failed to create task suggestion: ${error.message}`);
    }
  }

  async update(suggestion) {
    try {
      const sql = `
        UPDATE ${this.tableName} SET
          title = ?, description = ?, task_type = ?, priority = ?, estimated_time = ?,
          tags = ?, confidence = ?, reasoning = ?, context = ?, project_path = ?, metadata = ?,
          status = ?, is_approved = ?, is_rejected = ?, applied_at = ?, applied_by = ?,
          ai_model = ?, ai_response = ?, updated_at = ?
        WHERE id = ?
      `;

      const params = [
        suggestion.title,
        suggestion.description,
        suggestion.taskType,
        suggestion.priority,
        suggestion.estimatedTime,
        JSON.stringify(suggestion.tags || []),
        suggestion.confidence,
        suggestion.reasoning,
        suggestion.context,
        suggestion.projectPath,
        JSON.stringify(suggestion.metadata || {}),
        suggestion.status,
        suggestion.isApproved ? 1 : 0,
        suggestion.isRejected ? 1 : 0,
        suggestion.appliedAt ? suggestion.appliedAt.toISOString() : null,
        suggestion.appliedBy,
        suggestion.aiModel,
        suggestion.aiResponse,
        new Date().toISOString(),
        suggestion.id
      ];

      await this.databaseConnection.execute(sql, params);
      return suggestion;
    } catch (error) {
      throw new Error(`Failed to update task suggestion: ${error.message}`);
    }
  }

  async findById(id) {
    try {
      const sql = `SELECT * FROM ${this.tableName} WHERE id = ?`;
      const row = await this.databaseConnection.getOne(sql, [id]);
      return row ? this._rowToSuggestion(row) : null;
    } catch (error) {
      throw new Error(`Failed to find task suggestion by ID: ${error.message}`);
    }
  }

  async findByProject(projectPath) {
    try {
      const sql = `SELECT * FROM ${this.tableName} WHERE project_path = ? ORDER BY created_at DESC`;
      const rows = await this.databaseConnection.query(sql, [projectPath]);
      return rows.map(row => this._rowToSuggestion(row));
    } catch (error) {
      throw new Error(`Failed to find task suggestions by project: ${error.message}`);
    }
  }

  async findByStatus(status) {
    try {
      const sql = `SELECT * FROM ${this.tableName} WHERE status = ? ORDER BY created_at DESC`;
      const rows = await this.databaseConnection.query(sql, [status]);
      return rows.map(row => this._rowToSuggestion(row));
    } catch (error) {
      throw new Error(`Failed to find task suggestions by status: ${error.message}`);
    }
  }

  async findPending() {
    try {
      const sql = `SELECT * FROM ${this.tableName} WHERE status = 'pending' ORDER BY created_at DESC`;
      const rows = await this.databaseConnection.query(sql);
      return rows.map(row => this._rowToSuggestion(row));
    } catch (error) {
      throw new Error(`Failed to find pending task suggestions: ${error.message}`);
    }
  }

  async findApproved() {
    try {
      const sql = `SELECT * FROM ${this.tableName} WHERE is_approved = 1 ORDER BY created_at DESC`;
      const rows = await this.databaseConnection.query(sql);
      return rows.map(row => this._rowToSuggestion(row));
    } catch (error) {
      throw new Error(`Failed to find approved task suggestions: ${error.message}`);
    }
  }

  async findRejected() {
    try {
      const sql = `SELECT * FROM ${this.tableName} WHERE is_rejected = 1 ORDER BY created_at DESC`;
      const rows = await this.databaseConnection.query(sql);
      return rows.map(row => this._rowToSuggestion(row));
    } catch (error) {
      throw new Error(`Failed to find rejected task suggestions: ${error.message}`);
    }
  }

  async findAll() {
    try {
      const sql = `SELECT * FROM ${this.tableName} ORDER BY created_at DESC`;
      const rows = await this.databaseConnection.query(sql);
      return rows.map(row => this._rowToSuggestion(row));
    } catch (error) {
      throw new Error(`Failed to find all task suggestions: ${error.message}`);
    }
  }

  async search(query, filters = {}) {
    try {
      let sql = `SELECT * FROM ${this.tableName}`;
      const params = [];
      const conditions = [];

      if (query) {
        conditions.push('(title LIKE ? OR description LIKE ? OR reasoning LIKE ?)');
        const searchTerm = `%${query}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      if (filters.status) {
        conditions.push('status = ?');
        params.push(filters.status);
      }

      if (filters.taskType) {
        conditions.push('task_type = ?');
        params.push(filters.taskType);
      }

      if (filters.priority) {
        conditions.push('priority = ?');
        params.push(filters.priority);
      }

      if (filters.projectPath) {
        conditions.push('project_path = ?');
        params.push(filters.projectPath);
      }

      if (filters.isApproved !== undefined) {
        conditions.push('is_approved = ?');
        params.push(filters.isApproved ? 1 : 0);
      }

      if (filters.isRejected !== undefined) {
        conditions.push('is_rejected = ?');
        params.push(filters.isRejected ? 1 : 0);
      }

      if (filters.minConfidence) {
        conditions.push('confidence >= ?');
        params.push(filters.minConfidence);
      }

      if (conditions.length > 0) {
        sql += ` WHERE ${conditions.join(' AND ')}`;
      }

      sql += ' ORDER BY created_at DESC';

      const rows = await this.databaseConnection.query(sql, params);
      return rows.map(row => this._rowToSuggestion(row));
    } catch (error) {
      throw new Error(`Failed to search task suggestions: ${error.message}`);
    }
  }

  async delete(id) {
    try {
      const sql = `DELETE FROM ${this.tableName} WHERE id = ?`;
      await this.databaseConnection.execute(sql, [id]);
      return true;
    } catch (error) {
      throw new Error(`Failed to delete task suggestion: ${error.message}`);
    }
  }

  async approve(id, appliedBy = null) {
    try {
      const sql = `
        UPDATE ${this.tableName} SET 
          status = 'approved', is_approved = 1, is_rejected = 0, 
          applied_at = ?, applied_by = ?, updated_at = ?
        WHERE id = ?
      `;
      await this.databaseConnection.execute(sql, [
        new Date().toISOString(),
        appliedBy,
        new Date().toISOString(),
        id
      ]);
      return true;
    } catch (error) {
      throw new Error(`Failed to approve task suggestion: ${error.message}`);
    }
  }

  async reject(id) {
    try {
      const sql = `
        UPDATE ${this.tableName} SET 
          status = 'rejected', is_approved = 0, is_rejected = 1, 
          updated_at = ?
        WHERE id = ?
      `;
      await this.databaseConnection.execute(sql, [
        new Date().toISOString(),
        id
      ]);
      return true;
    } catch (error) {
      throw new Error(`Failed to reject task suggestion: ${error.message}`);
    }
  }

  async apply(id, appliedBy) {
    try {
      const sql = `
        UPDATE ${this.tableName} SET 
          status = 'applied', is_approved = 1, is_rejected = 0,
          applied_at = ?, applied_by = ?, updated_at = ?
        WHERE id = ?
      `;
      await this.databaseConnection.execute(sql, [
        new Date().toISOString(),
        appliedBy,
        new Date().toISOString(),
        id
      ]);
      return true;
    } catch (error) {
      throw new Error(`Failed to apply task suggestion: ${error.message}`);
    }
  }

  async getStats() {
    try {
      const sql = `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
          COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
          COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
          COUNT(CASE WHEN status = 'applied' THEN 1 END) as applied,
          AVG(confidence) as avg_confidence,
          COUNT(DISTINCT project_path) as projects,
          COUNT(DISTINCT task_type) as types
        FROM ${this.tableName}
      `;
      const row = await this.databaseConnection.getOne(sql);
      return {
        total: row.total,
        pending: row.pending,
        approved: row.approved,
        rejected: row.rejected,
        applied: row.applied,
        avgConfidence: row.avg_confidence,
        projects: row.projects,
        types: row.types
      };
    } catch (error) {
      throw new Error(`Failed to get task suggestion stats: ${error.message}`);
    }
  }

  async findByConfidence(minConfidence) {
    try {
      const sql = `SELECT * FROM ${this.tableName} WHERE confidence >= ? ORDER BY confidence DESC`;
      const rows = await this.databaseConnection.query(sql, [minConfidence]);
      return rows.map(row => this._rowToSuggestion(row));
    } catch (error) {
      throw new Error(`Failed to find task suggestions by confidence: ${error.message}`);
    }
  }

  async findByAIModel(aiModel) {
    try {
      const sql = `SELECT * FROM ${this.tableName} WHERE ai_model = ? ORDER BY created_at DESC`;
      const rows = await this.databaseConnection.query(sql, [aiModel]);
      return rows.map(row => this._rowToSuggestion(row));
    } catch (error) {
      throw new Error(`Failed to find task suggestions by AI model: ${error.message}`);
    }
  }

  async getByDateRange(startDate, endDate) {
    try {
      const sql = `SELECT * FROM ${this.tableName} WHERE created_at >= ? AND created_at <= ? ORDER BY created_at DESC`;
      const rows = await this.databaseConnection.query(sql, [startDate, endDate]);
      return rows.map(row => this._rowToSuggestion(row));
    } catch (error) {
      throw new Error(`Failed to get task suggestions by date range: ${error.message}`);
    }
  }

  _rowToSuggestion(row) {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      taskType: row.task_type,
      priority: row.priority,
      estimatedTime: row.estimated_time,
      tags: row.tags ? JSON.parse(row.tags) : [],
      confidence: row.confidence,
      reasoning: row.reasoning,
      context: row.context,
      projectPath: row.project_path,
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      status: row.status,
      isApproved: Boolean(row.is_approved),
      isRejected: Boolean(row.is_rejected),
      appliedAt: row.applied_at ? new Date(row.applied_at) : null,
      appliedBy: row.applied_by,
      aiModel: row.ai_model,
      aiResponse: row.ai_response,
      createdAt: row.created_at ? new Date(row.created_at) : new Date(),
      updatedAt: row.updated_at ? new Date(row.updated_at) : new Date()
    };
  }
}

module.exports = PostgreSQLTaskSuggestionRepository; 