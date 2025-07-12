const ProjectRepository = require('@repositories/ProjectRepository');
const path = require('path');

class SQLiteProjectRepository extends ProjectRepository {
  constructor(databaseConnection) {
    super();
    this.databaseConnection = databaseConnection;
    this.tableName = 'projects';
  }

  /**
   * Create a new project
   * @param {Object} projectData - Project data
   * @returns {Promise<Object>} Created project
   */
  async create(projectData) {
    const sql = `
      INSERT INTO ${this.tableName} (
        id, name, description, workspace_path, type, status, metadata, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const now = new Date().toISOString();
    const params = [
      projectData.id || this.generateId(),
      projectData.name,
      projectData.description || null,
      projectData.workspacePath,
      projectData.type || 'development',
      projectData.status || 'active',
      JSON.stringify(projectData.metadata || {}),
      projectData.createdBy || 'me',
      now,
      now
    ];

    await this.databaseConnection.execute(sql, params);
    return projectData;
  }

  /**
   * Save a project (create or update)
   * @param {Object} projectData - Project data
   * @returns {Promise<Object>} Saved project
   */
  async save(projectData) {
    // Check if project exists
    const existing = await this.findById(projectData.id);
    if (existing) {
      return this.update(projectData);
    } else {
      return this.create(projectData);
    }
  }

  /**
   * Update a project
   * @param {Object} projectData - Project data
   * @returns {Promise<Object>} Updated project
   */
  async update(projectData) {
    const sql = `
      UPDATE ${this.tableName} SET
        name = ?, description = ?, workspace_path = ?, type = ?, status = ?,
        metadata = ?, updated_at = ?
      WHERE id = ?
    `;

    const now = new Date().toISOString();
    const params = [
      projectData.name,
      projectData.description || null,
      projectData.workspacePath,
      projectData.type || 'development',
      projectData.status || 'active',
      JSON.stringify(projectData.metadata || {}),
      now,
      projectData.id
    ];

    await this.databaseConnection.execute(sql, params);
    return projectData;
  }

  /**
   * Find project by ID
   * @param {string} id - Project ID
   * @returns {Promise<Object|null>} Project or null
   */
  async findById(id) {
    const sql = `SELECT * FROM ${this.tableName} WHERE id = ?`;
    const results = await this.databaseConnection.query(sql, [id]);
    return results.length > 0 ? this._rowToProject(results[0]) : null;
  }

  /**
   * Find project by workspace path
   * @param {string} workspacePath - Workspace path
   * @returns {Promise<Object|null>} Project or null
   */
  async findByWorkspacePath(workspacePath) {
    const sql = `SELECT * FROM ${this.tableName} WHERE workspace_path = ?`;
    const results = await this.databaseConnection.query(sql, [workspacePath]);
    return results.length > 0 ? this._rowToProject(results[0]) : null;
  }

  /**
   * Find or create project by workspace path
   * @param {string} workspacePath - Workspace path
   * @param {Object} options - Project options
   * @returns {Promise<Object>} Project (created or existing)
   */
  async findOrCreateByWorkspacePath(workspacePath, options = {}) {
    // Try to find existing project
    let project = await this.findByWorkspacePath(workspacePath);
    
    if (!project) {
      // Create new project
      const projectName = options.name || path.basename(workspacePath);
      const projectId = options.id || this.generateProjectId(workspacePath);
      
      project = {
        id: projectId,
        name: projectName,
        description: options.description || `Project at ${workspacePath}`,
        workspacePath: workspacePath,
        type: options.type || 'development',
        status: 'active',
        metadata: options.metadata || {},
        createdBy: 'me'
      };
      
      await this.create(project);
    }
    
    return project;
  }

  /**
   * Get all projects
   * @returns {Promise<Object[]>} All projects
   */
  async findAll() {
    const sql = `SELECT * FROM ${this.tableName} ORDER BY created_at DESC`;
    const results = await this.databaseConnection.query(sql);
    return results.map(row => this._rowToProject(row));
  }

  /**
   * Update project metadata
   * @param {string} projectId - Project ID
   * @param {Object} metadata - Metadata to update
   * @returns {Promise<Object>} Updated project
   */
  async updateMetadata(projectId, metadata) {
    const project = await this.findById(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    const updatedMetadata = { ...project.metadata, ...metadata };
    const sql = `
      UPDATE ${this.tableName} SET
        metadata = ?, updated_at = ?
      WHERE id = ?
    `;

    const now = new Date().toISOString();
    await this.databaseConnection.execute(sql, [
      JSON.stringify(updatedMetadata),
      now,
      projectId
    ]);

    return { ...project, metadata: updatedMetadata };
  }

  /**
   * Delete project
   * @param {string} id - Project ID
   * @returns {Promise<boolean>} Success
   */
  async delete(id) {
    const sql = `DELETE FROM ${this.tableName} WHERE id = ?`;
    await this.databaseConnection.execute(sql, [id]);
    return true;
  }

  /**
   * Generate project ID from workspace path
   * @param {string} workspacePath - Workspace path
   * @returns {string} Project ID
   */
  generateProjectId(workspacePath) {
    const projectName = path.basename(workspacePath);
    return projectName.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  /**
   * Generate unique ID
   * @returns {string} Unique ID
   */
  generateId() {
    return `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Convert database row to project object
   * @param {Object} row - Database row
   * @returns {Object} Project object
   */
  _rowToProject(row) {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      workspacePath: row.workspace_path,
      type: row.type,
      status: row.status,
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

module.exports = SQLiteProjectRepository; 