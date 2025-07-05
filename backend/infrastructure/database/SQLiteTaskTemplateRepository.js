const { TaskTemplate } = require('../../domain/entities');
const { TaskType, TaskPriority } = require('../../domain/value-objects');

/**
 * SQLiteTaskTemplateRepository - SQLite implementation of TaskTemplateRepository
 * Provides persistence for task templates using SQLite database
 */
class SQLiteTaskTemplateRepository {
    constructor(database) {
        this.database = database;
        this.tableName = 'task_templates';
        this.initTable();
    }

    /**
     * Initialize the task_templates table
     */
    async initTable() {
        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS ${this.tableName} (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                description TEXT,
                type TEXT NOT NULL,
                defaultPriority TEXT NOT NULL,
                estimatedTime INTEGER,
                tags TEXT,
                content TEXT NOT NULL,
                variables TEXT,
                metadata TEXT,
                isActive BOOLEAN DEFAULT 1,
                version TEXT DEFAULT '1.0.0',
                createdBy TEXT,
                createdAt TEXT NOT NULL,
                updatedAt TEXT NOT NULL
            )
        `;

        await this.database.run(createTableSQL);
        
        // Create indexes for better performance
        await this.database.run(`CREATE INDEX IF NOT EXISTS idx_task_templates_name ON ${this.tableName} (name)`);
        await this.database.run(`CREATE INDEX IF NOT EXISTS idx_task_templates_type ON ${this.tableName} (type)`);
        await this.database.run(`CREATE INDEX IF NOT EXISTS idx_task_templates_active ON ${this.tableName} (isActive)`);
        await this.database.run(`CREATE INDEX IF NOT EXISTS idx_task_templates_version ON ${this.tableName} (version)`);
    }

    /**
     * Save task template
     * @param {TaskTemplate} taskTemplate - Task template to save
     * @returns {Promise<TaskTemplate>} Saved task template
     */
    async save(taskTemplate) {
        const now = new Date().toISOString();
        
        if (taskTemplate.id) {
            // Update existing template
            return await this.update(taskTemplate, now);
        } else {
            // Create new template
            return await this.create(taskTemplate, now);
        }
    }

    /**
     * Create new task template
     * @param {TaskTemplate} taskTemplate - Task template to create
     * @param {string} now - Current timestamp
     * @returns {Promise<TaskTemplate>} Created task template
     */
    async create(taskTemplate, now) {
        const id = taskTemplate.id || this.generateId();
        taskTemplate.id = id;

        const insertSQL = `
            INSERT INTO ${this.tableName} (
                id, name, description, type, defaultPriority, estimatedTime,
                tags, content, variables, metadata, isActive, version,
                createdBy, createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const params = [
            id,
            taskTemplate.name,
            taskTemplate.description,
            taskTemplate.type.value,
            taskTemplate.defaultPriority.value,
            taskTemplate.estimatedTime || null,
            taskTemplate.tags ? JSON.stringify(taskTemplate.tags) : null,
            taskTemplate.content,
            taskTemplate.variables ? JSON.stringify(taskTemplate.variables) : null,
            taskTemplate.metadata ? JSON.stringify(taskTemplate.metadata) : null,
            taskTemplate.isActive ? 1 : 0,
            taskTemplate.version,
            taskTemplate.createdBy || null,
            now,
            now
        ];

        await this.database.run(insertSQL, params);
        return taskTemplate;
    }

    /**
     * Update existing task template
     * @param {TaskTemplate} taskTemplate - Task template to update
     * @param {string} now - Current timestamp
     * @returns {Promise<TaskTemplate>} Updated task template
     */
    async update(taskTemplate, now) {
        const updateSQL = `
            UPDATE ${this.tableName} SET
                name = ?,
                description = ?,
                type = ?,
                defaultPriority = ?,
                estimatedTime = ?,
                tags = ?,
                content = ?,
                variables = ?,
                metadata = ?,
                isActive = ?,
                version = ?,
                updatedAt = ?
            WHERE id = ?
        `;

        const params = [
            taskTemplate.name,
            taskTemplate.description,
            taskTemplate.type.value,
            taskTemplate.defaultPriority.value,
            taskTemplate.estimatedTime || null,
            taskTemplate.tags ? JSON.stringify(taskTemplate.tags) : null,
            taskTemplate.content,
            taskTemplate.variables ? JSON.stringify(taskTemplate.variables) : null,
            taskTemplate.metadata ? JSON.stringify(taskTemplate.metadata) : null,
            taskTemplate.isActive ? 1 : 0,
            taskTemplate.version,
            now,
            taskTemplate.id
        ];

        await this.database.run(updateSQL, params);
        return taskTemplate;
    }

    /**
     * Find task template by ID
     * @param {string} id - Task template ID
     * @returns {Promise<TaskTemplate|null>} Task template or null
     */
    async findById(id) {
        const selectSQL = `SELECT * FROM ${this.tableName} WHERE id = ?`;
        const row = await this.database.get(selectSQL, [id]);
        
        if (!row) {
            return null;
        }

        return this.mapRowToTaskTemplate(row);
    }

    /**
     * Find task template by name
     * @param {string} name - Task template name
     * @returns {Promise<TaskTemplate|null>} Task template or null
     */
    async findByName(name) {
        const selectSQL = `SELECT * FROM ${this.tableName} WHERE name = ?`;
        const row = await this.database.get(selectSQL, [name]);
        
        if (!row) {
            return null;
        }

        return this.mapRowToTaskTemplate(row);
    }

    /**
     * Find task templates by type
     * @param {string} type - Task type
     * @returns {Promise<Array<TaskTemplate>>} Task templates
     */
    async findByType(type) {
        const selectSQL = `
            SELECT * FROM ${this.tableName} 
            WHERE type = ? AND isActive = 1
            ORDER BY name ASC
        `;
        
        const rows = await this.database.all(selectSQL, [type]);
        return rows.map(row => this.mapRowToTaskTemplate(row));
    }

    /**
     * Find active task templates
     * @returns {Promise<Array<TaskTemplate>>} Active task templates
     */
    async findActive() {
        const selectSQL = `
            SELECT * FROM ${this.tableName} 
            WHERE isActive = 1 
            ORDER BY name ASC
        `;
        
        const rows = await this.database.all(selectSQL);
        return rows.map(row => this.mapRowToTaskTemplate(row));
    }

    /**
     * Find task templates by tags
     * @param {Array<string>} tags - Tags to search for
     * @returns {Promise<Array<TaskTemplate>>} Task templates
     */
    async findByTags(tags) {
        if (!tags || tags.length === 0) {
            return [];
        }

        const placeholders = tags.map(() => '?').join(',');
        const selectSQL = `
            SELECT * FROM ${this.tableName} 
            WHERE isActive = 1 
            AND (
                ${tags.map(() => `tags LIKE '%' || ? || '%'`).join(' OR ')}
            )
            ORDER BY name ASC
        `;
        
        const params = [...tags, ...tags]; // For both placeholders and LIKE conditions
        const rows = await this.database.all(selectSQL, params);
        return rows.map(row => this.mapRowToTaskTemplate(row));
    }

    /**
     * Find task templates by creator
     * @param {string} createdBy - Creator ID
     * @returns {Promise<Array<TaskTemplate>>} Task templates
     */
    async findByCreator(createdBy) {
        const selectSQL = `
            SELECT * FROM ${this.tableName} 
            WHERE createdBy = ? 
            ORDER BY createdAt DESC
        `;
        
        const rows = await this.database.all(selectSQL, [createdBy]);
        return rows.map(row => this.mapRowToTaskTemplate(row));
    }

    /**
     * Search task templates
     * @param {string} query - Search query
     * @returns {Promise<Array<TaskTemplate>>} Matching task templates
     */
    async search(query) {
        const selectSQL = `
            SELECT * FROM ${this.tableName} 
            WHERE isActive = 1 
            AND (
                name LIKE ? 
                OR description LIKE ? 
                OR content LIKE ?
            )
            ORDER BY name ASC
        `;
        
        const searchPattern = `%${query}%`;
        const params = [searchPattern, searchPattern, searchPattern];
        
        const rows = await this.database.all(selectSQL, params);
        return rows.map(row => this.mapRowToTaskTemplate(row));
    }

    /**
     * Get all task templates
     * @param {Object} options - Query options
     * @returns {Promise<Array<TaskTemplate>>} All task templates
     */
    async findAll(options = {}) {
        let selectSQL = `SELECT * FROM ${this.tableName}`;
        const params = [];

        // Add filters
        const filters = [];
        if (options.activeOnly !== false) {
            filters.push('isActive = 1');
        }
        if (options.type) {
            filters.push('type = ?');
            params.push(options.type);
        }
        if (options.createdBy) {
            filters.push('createdBy = ?');
            params.push(options.createdBy);
        }

        if (filters.length > 0) {
            selectSQL += ` WHERE ${filters.join(' AND ')}`;
        }

        // Add ordering
        selectSQL += ` ORDER BY ${options.orderBy || 'name'} ${options.orderDirection || 'ASC'}`;

        // Add limit
        if (options.limit) {
            selectSQL += ` LIMIT ?`;
            params.push(options.limit);
        }

        const rows = await this.database.all(selectSQL, params);
        return rows.map(row => this.mapRowToTaskTemplate(row));
    }

    /**
     * Delete task template by ID
     * @param {string} id - Task template ID
     * @returns {Promise<boolean>} Success status
     */
    async deleteById(id) {
        const deleteSQL = `DELETE FROM ${this.tableName} WHERE id = ?`;
        const result = await this.database.run(deleteSQL, [id]);
        return result.changes > 0;
    }

    /**
     * Delete task template by name
     * @param {string} name - Task template name
     * @returns {Promise<boolean>} Success status
     */
    async deleteByName(name) {
        const deleteSQL = `DELETE FROM ${this.tableName} WHERE name = ?`;
        const result = await this.database.run(deleteSQL, [name]);
        return result.changes > 0;
    }

    /**
     * Activate task template
     * @param {string} id - Task template ID
     * @returns {Promise<boolean>} Success status
     */
    async activate(id) {
        const updateSQL = `UPDATE ${this.tableName} SET isActive = 1, updatedAt = ? WHERE id = ?`;
        const result = await this.database.run(updateSQL, [new Date().toISOString(), id]);
        return result.changes > 0;
    }

    /**
     * Deactivate task template
     * @param {string} id - Task template ID
     * @returns {Promise<boolean>} Success status
     */
    async deactivate(id) {
        const updateSQL = `UPDATE ${this.tableName} SET isActive = 0, updatedAt = ? WHERE id = ?`;
        const result = await this.database.run(updateSQL, [new Date().toISOString(), id]);
        return result.changes > 0;
    }

    /**
     * Update template version
     * @param {string} id - Task template ID
     * @param {string} version - New version
     * @returns {Promise<boolean>} Success status
     */
    async updateVersion(id, version) {
        const updateSQL = `UPDATE ${this.tableName} SET version = ?, updatedAt = ? WHERE id = ?`;
        const result = await this.database.run(updateSQL, [version, new Date().toISOString(), id]);
        return result.changes > 0;
    }

    /**
     * Count task templates
     * @param {Object} options - Count options
     * @returns {Promise<number>} Count of templates
     */
    async count(options = {}) {
        let countSQL = `SELECT COUNT(*) as count FROM ${this.tableName}`;
        const params = [];

        // Add filters
        const filters = [];
        if (options.activeOnly !== false) {
            filters.push('isActive = 1');
        }
        if (options.type) {
            filters.push('type = ?');
            params.push(options.type);
        }
        if (options.createdBy) {
            filters.push('createdBy = ?');
            params.push(options.createdBy);
        }

        if (filters.length > 0) {
            countSQL += ` WHERE ${filters.join(' AND ')}`;
        }

        const result = await this.database.get(countSQL, params);
        return result.count;
    }

    /**
     * Get template statistics
     * @returns {Promise<Object>} Template statistics
     */
    async getTemplateStatistics() {
        const statsSQL = `
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN isActive = 1 THEN 1 END) as active,
                COUNT(CASE WHEN isActive = 0 THEN 1 END) as inactive,
                COUNT(DISTINCT type) as uniqueTypes,
                COUNT(DISTINCT createdBy) as uniqueCreators,
                AVG(estimatedTime) as averageEstimatedTime
            FROM ${this.tableName}
        `;

        const result = await this.database.get(statsSQL);
        
        // Get type distribution
        const typeSQL = `
            SELECT type, COUNT(*) as count 
            FROM ${this.tableName} 
            WHERE isActive = 1 
            GROUP BY type
        `;
        
        const typeRows = await this.database.all(typeSQL);
        const typeDistribution = {};
        typeRows.forEach(row => {
            typeDistribution[row.type] = row.count;
        });

        return {
            total: result.total,
            active: result.active,
            inactive: result.inactive,
            uniqueTypes: result.uniqueTypes,
            uniqueCreators: result.uniqueCreators,
            averageEstimatedTime: result.averageEstimatedTime || 0,
            typeDistribution
        };
    }

    /**
     * Get recent templates
     * @param {number} limit - Limit number of results
     * @returns {Promise<Array<TaskTemplate>>} Recent templates
     */
    async getRecentTemplates(limit = 10) {
        const selectSQL = `
            SELECT * FROM ${this.tableName} 
            ORDER BY createdAt DESC 
            LIMIT ?
        `;
        
        const rows = await this.database.all(selectSQL, [limit]);
        return rows.map(row => this.mapRowToTaskTemplate(row));
    }

    /**
     * Get popular templates
     * @param {number} limit - Limit number of results
     * @returns {Promise<Array<TaskTemplate>>} Popular templates
     */
    async getPopularTemplates(limit = 10) {
        // This would require a usage tracking table
        // For now, return recent active templates
        const selectSQL = `
            SELECT * FROM ${this.tableName} 
            WHERE isActive = 1 
            ORDER BY updatedAt DESC 
            LIMIT ?
        `;
        
        const rows = await this.database.all(selectSQL, [limit]);
        return rows.map(row => this.mapRowToTaskTemplate(row));
    }

    /**
     * Map database row to TaskTemplate entity
     * @param {Object} row - Database row
     * @returns {TaskTemplate} TaskTemplate entity
     */
    mapRowToTaskTemplate(row) {
        return new TaskTemplate({
            id: row.id,
            name: row.name,
            description: row.description,
            type: TaskType.fromValue(row.type),
            defaultPriority: TaskPriority.fromValue(row.defaultPriority),
            estimatedTime: row.estimatedTime,
            tags: row.tags ? JSON.parse(row.tags) : [],
            content: row.content,
            variables: row.variables ? JSON.parse(row.variables) : {},
            metadata: row.metadata ? JSON.parse(row.metadata) : {},
            isActive: Boolean(row.isActive),
            version: row.version,
            createdBy: row.createdBy,
            createdAt: new Date(row.createdAt),
            updatedAt: new Date(row.updatedAt)
        });
    }

    /**
     * Generate unique ID
     * @returns {string} Unique ID
     */
    generateId() {
        return `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Import templates from JSON
     * @param {Array<Object>} templates - Templates to import
     * @returns {Promise<Array<TaskTemplate>>} Imported templates
     */
    async importTemplates(templates) {
        const importedTemplates = [];

        for (const templateData of templates) {
            try {
                const template = new TaskTemplate(templateData);
                const savedTemplate = await this.save(template);
                importedTemplates.push(savedTemplate);
            } catch (error) {
                console.error(`Failed to import template ${templateData.name}:`, error);
            }
        }

        return importedTemplates;
    }

    /**
     * Export templates to JSON
     * @param {Object} options - Export options
     * @returns {Promise<Array<Object>>} Exported templates
     */
    async exportTemplates(options = {}) {
        const templates = await this.findAll(options);
        return templates.map(template => template.toJSON());
    }

    /**
     * Get database size information
     * @returns {Promise<Object>} Database size information
     */
    async getDatabaseInfo() {
        const countSQL = `SELECT COUNT(*) as count FROM ${this.tableName}`;
        const activeSQL = `SELECT COUNT(*) as active FROM ${this.tableName} WHERE isActive = 1`;
        
        const countResult = await this.database.get(countSQL);
        const activeResult = await this.database.get(activeSQL);
        
        return {
            totalTemplates: countResult.count,
            activeTemplates: activeResult.active,
            tableName: this.tableName
        };
    }
}

module.exports = SQLiteTaskTemplateRepository; 