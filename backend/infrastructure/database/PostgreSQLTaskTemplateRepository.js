/**
 * PostgreSQLTaskTemplateRepository - PostgreSQL implementation of TaskTemplateRepository
 * Uses snake_case column names to match PostgreSQL schema
 */

const TaskTemplateRepository = require('@domain/repositories/TaskTemplateRepository');
const TaskTemplate = require('@domain/entities/TaskTemplate');
const logger = require('@infrastructure/logging/Logger');

class PostgreSQLTaskTemplateRepository extends TaskTemplateRepository {
  constructor(databaseConnection) {
    super();
    this.databaseConnection = databaseConnection;
    this.tableName = 'task_templates';
  }

  async init() {
    try {
      // Create index for active templates
      await this.databaseConnection.execute(`CREATE INDEX IF NOT EXISTS idx_task_templates_active ON ${this.tableName} (is_active)`);
      logger.info(`✅ TaskTemplateRepository initialized for PostgreSQL`);
    } catch (error) {
      logger.error(`❌ Failed to initialize TaskTemplateRepository: ${error.message}`);
      throw error;
    }
  }

  async create(taskTemplate) {
    try {
      const sql = `
        INSERT INTO ${this.tableName} (
          id, name, description, type, default_priority, estimated_time,
          tags, content, variables, metadata, is_active, version,
          created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        taskTemplate.id,
        taskTemplate.name,
        taskTemplate.description,
        taskTemplate.type,
        taskTemplate.defaultPriority,
        taskTemplate.estimatedTime,
        JSON.stringify(taskTemplate.tags || []),
        taskTemplate.content,
        JSON.stringify(taskTemplate.variables || []),
        JSON.stringify(taskTemplate.metadata || {}),
        taskTemplate.isActive ? 1 : 0,
        taskTemplate.version,
        taskTemplate.createdBy,
        taskTemplate.createdAt ? taskTemplate.createdAt.toISOString() : new Date().toISOString(),
        taskTemplate.updatedAt ? taskTemplate.updatedAt.toISOString() : new Date().toISOString()
      ];

      await this.databaseConnection.execute(sql, params);
      return taskTemplate;
    } catch (error) {
      throw new Error(`Failed to create task template: ${error.message}`);
    }
  }

  async update(taskTemplate) {
    try {
      const sql = `
        UPDATE ${this.tableName} SET
          name = ?, description = ?, type = ?, default_priority = ?, estimated_time = ?,
          tags = ?, content = ?, variables = ?, metadata = ?, is_active = ?, version = ?,
          updated_at = ?
        WHERE id = ?
      `;

      const params = [
        taskTemplate.name,
        taskTemplate.description,
        taskTemplate.type,
        taskTemplate.defaultPriority,
        taskTemplate.estimatedTime,
        JSON.stringify(taskTemplate.tags || []),
        taskTemplate.content,
        JSON.stringify(taskTemplate.variables || []),
        JSON.stringify(taskTemplate.metadata || {}),
        taskTemplate.isActive ? 1 : 0,
        taskTemplate.version,
        new Date().toISOString(),
        taskTemplate.id
      ];

      await this.databaseConnection.execute(sql, params);
      return taskTemplate;
    } catch (error) {
      throw new Error(`Failed to update task template: ${error.message}`);
    }
  }

  async findById(id) {
    try {
      const sql = `SELECT * FROM ${this.tableName} WHERE id = ? AND is_active = 1`;
      const row = await this.databaseConnection.getOne(sql, [id]);
      return row ? this._rowToTaskTemplate(row) : null;
    } catch (error) {
      throw new Error(`Failed to find task template by ID: ${error.message}`);
    }
  }

  async findByName(name) {
    try {
      const sql = `SELECT * FROM ${this.tableName} WHERE name = ? AND is_active = 1`;
      const row = await this.databaseConnection.getOne(sql, [name]);
      return row ? this._rowToTaskTemplate(row) : null;
    } catch (error) {
      throw new Error(`Failed to find task template by name: ${error.message}`);
    }
  }

  async findByType(type) {
    try {
      const sql = `SELECT * FROM ${this.tableName} WHERE type = ? AND is_active = 1 ORDER BY name`;
      const rows = await this.databaseConnection.query(sql, [type]);
      return rows.map(row => this._rowToTaskTemplate(row));
    } catch (error) {
      throw new Error(`Failed to find task templates by type: ${error.message}`);
    }
  }

  async findAll() {
    try {
      const sql = `SELECT * FROM ${this.tableName} WHERE is_active = 1 ORDER BY name`;
      const rows = await this.databaseConnection.query(sql);
      return rows.map(row => this._rowToTaskTemplate(row));
    } catch (error) {
      throw new Error(`Failed to find all task templates: ${error.message}`);
    }
  }

  async findActive() {
    try {
      const sql = `SELECT * FROM ${this.tableName} WHERE is_active = 1 ORDER BY name`;
      const rows = await this.databaseConnection.query(sql);
      return rows.map(row => this._rowToTaskTemplate(row));
    } catch (error) {
      throw new Error(`Failed to find active task templates: ${error.message}`);
    }
  }

  async search(query, filters = {}) {
    try {
      let sql = `SELECT * FROM ${this.tableName} WHERE is_active = 1`;
      const params = [];
      const conditions = [];

      if (query) {
        conditions.push('(name LIKE ? OR description LIKE ? OR content LIKE ?)');
        const searchTerm = `%${query}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      if (filters.type) {
        conditions.push('type = ?');
        params.push(filters.type);
      }

      if (filters.priority) {
        conditions.push('default_priority = ?');
        params.push(filters.priority);
      }

      if (conditions.length > 0) {
        sql += ` AND ${conditions.join(' AND ')}`;
      }

      sql += ' ORDER BY name';

      const rows = await this.databaseConnection.query(sql, params);
      return rows.map(row => this._rowToTaskTemplate(row));
    } catch (error) {
      throw new Error(`Failed to search task templates: ${error.message}`);
    }
  }

  async delete(id) {
    try {
      const sql = `UPDATE ${this.tableName} SET is_active = 0, updated_at = ? WHERE id = ?`;
      await this.databaseConnection.execute(sql, [new Date().toISOString(), id]);
      return true;
    } catch (error) {
      throw new Error(`Failed to delete task template: ${error.message}`);
    }
  }

  async hardDelete(id) {
    try {
      const sql = `DELETE FROM ${this.tableName} WHERE id = ?`;
      await this.databaseConnection.execute(sql, [id]);
      return true;
    } catch (error) {
      throw new Error(`Failed to hard delete task template: ${error.message}`);
    }
  }

  async restore(id) {
    try {
      const sql = `UPDATE ${this.tableName} SET is_active = 1, updated_at = ? WHERE id = ?`;
      await this.databaseConnection.execute(sql, [new Date().toISOString(), id]);
      return true;
    } catch (error) {
      throw new Error(`Failed to restore task template: ${error.message}`);
    }
  }

  async getStats() {
    try {
      const sql = `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN is_active = 1 THEN 1 END) as active,
          COUNT(CASE WHEN is_active = 0 THEN 1 END) as inactive,
          COUNT(DISTINCT type) as types,
          COUNT(DISTINCT default_priority) as priorities
        FROM ${this.tableName}
      `;
      const row = await this.databaseConnection.getOne(sql);
      return {
        total: row.total,
        active: row.active,
        inactive: row.inactive,
        types: row.types,
        priorities: row.priorities
      };
    } catch (error) {
      throw new Error(`Failed to get task template stats: ${error.message}`);
    }
  }

  async findByTags(tags) {
    try {
      const sql = `SELECT * FROM ${this.tableName} WHERE is_active = 1`;
      const rows = await this.databaseConnection.query(sql);
      
      return rows
        .map(row => this._rowToTaskTemplate(row))
        .filter(template => {
          const templateTags = template.tags || [];
          return tags.some(tag => templateTags.includes(tag));
        });
    } catch (error) {
      throw new Error(`Failed to find task templates by tags: ${error.message}`);
    }
  }

  async getByVersion(version) {
    try {
      const sql = `SELECT * FROM ${this.tableName} WHERE version = ? AND is_active = 1 ORDER BY name`;
      const rows = await this.databaseConnection.query(sql, [version]);
      return rows.map(row => this._rowToTaskTemplate(row));
    } catch (error) {
      throw new Error(`Failed to get task templates by version: ${error.message}`);
    }
  }

  async getActiveCount() {
    try {
      const sql = `SELECT COUNT(*) as active FROM ${this.tableName} WHERE is_active = 1`;
      const row = await this.databaseConnection.getOne(sql);
      return row.active;
    } catch (error) {
      throw new Error(`Failed to get active task template count: ${error.message}`);
    }
  }

  _rowToTaskTemplate(row) {
    return new TaskTemplate({
      id: row.id,
      name: row.name,
      description: row.description,
      type: row.type,
      defaultPriority: row.default_priority,
      estimatedTime: row.estimated_time,
      tags: row.tags ? JSON.parse(row.tags) : [],
      content: row.content,
      variables: row.variables ? JSON.parse(row.variables) : [],
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      isActive: Boolean(row.is_active),
      version: row.version,
      createdBy: row.created_by,
      createdAt: row.created_at ? new Date(row.created_at) : new Date(),
      updatedAt: row.updated_at ? new Date(row.updated_at) : new Date()
    });
  }
}

module.exports = PostgreSQLTaskTemplateRepository; 