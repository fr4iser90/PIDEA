const ProjectRepository = require('@repositories/ProjectRepository');
const path = require('path');

class PostgreSQLProjectRepository extends ProjectRepository {
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
        id, name, description, workspace_path, type,
        ide_type, ide_port, ide_status,
        backend_port, frontend_port, database_port,
        start_command, build_command, dev_command, test_command,
        framework, language, package_manager,
        status, priority, last_accessed, access_count,
        metadata, config, created_at, updated_at, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27)
    `;

    const now = new Date().toISOString();
    const params = [
      projectData.id || this.generateId(),
      projectData.name,
      projectData.description || null,
      projectData.workspacePath,
      projectData.type || 'development',
      
      // IDE Configuration
      projectData.ideType || 'cursor',
      projectData.idePort || null,
      projectData.ideStatus || 'inactive',
      
      // Development Server Configuration
      projectData.backendPort || null,
      projectData.frontendPort || null,
      projectData.databasePort || null,
      
      // Startup Configuration
      projectData.startCommand || null,
      projectData.buildCommand || null,
      projectData.devCommand || null,
      projectData.testCommand || null,
      
      // Project Metadata
      projectData.framework || null,
      projectData.language || null,
      projectData.packageManager || null,
      
      // Status and Management
      projectData.status || 'active',
      projectData.priority || 0,
      projectData.lastAccessed || null,
      projectData.accessCount || 0,
      
      // Extended Metadata
      JSON.stringify(projectData.metadata || {}),
      JSON.stringify(projectData.config || {}),
      
      // Timestamps
      now,
      now,
      projectData.createdBy || 'me'
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
        name = $1, description = $2, workspace_path = $3, type = $4,
        ide_type = $5, ide_port = $6, ide_status = $7,
        backend_port = $8, frontend_port = $9, database_port = $10,
        start_command = $11, build_command = $12, dev_command = $13, test_command = $14,
        framework = $15, language = $16, package_manager = $17,
        status = $18, priority = $19, last_accessed = $20, access_count = $21,
        metadata = $22, config = $23, updated_at = $24
      WHERE id = $25
    `;

    const now = new Date().toISOString();
    const params = [
      projectData.name,
      projectData.description || null,
      projectData.workspacePath,
      projectData.type || 'development',
      
      // IDE Configuration
      projectData.ideType || 'cursor',
      projectData.idePort || null,
      projectData.ideStatus || 'inactive',
      
      // Development Server Configuration
      projectData.backendPort || null,
      projectData.frontendPort || null,
      projectData.databasePort || null,
      
      // Startup Configuration
      projectData.startCommand || null,
      projectData.buildCommand || null,
      projectData.devCommand || null,
      projectData.testCommand || null,
      
      // Project Metadata
      projectData.framework || null,
      projectData.language || null,
      projectData.packageManager || null,
      
      // Status and Management
      projectData.status || 'active',
      projectData.priority || 0,
      projectData.lastAccessed || null,
      projectData.accessCount || 0,
      
      // Extended Metadata
      JSON.stringify(projectData.metadata || {}),
      JSON.stringify(projectData.config || {}),
      
      // Timestamps
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
    const sql = `SELECT * FROM ${this.tableName} WHERE id = $1`;
    const results = await this.databaseConnection.query(sql, [id]);
    return results.length > 0 ? this._rowToProject(results[0]) : null;
  }

  /**
   * Find project by workspace path
   * @param {string} workspacePath - Workspace path
   * @returns {Promise<Object|null>} Project or null
   */
  async findByWorkspacePath(workspacePath) {
    const sql = `SELECT * FROM ${this.tableName} WHERE workspace_path = $1`;
    const results = await this.databaseConnection.query(sql, [workspacePath]);
    return results.length > 0 ? this._rowToProject(results[0]) : null;
  }

  /**
   * Find project by IDE port
   * @param {number} idePort - IDE port
   * @returns {Promise<Object|null>} Project or null
   */
  async findByIDEPort(idePort) {
    const sql = `SELECT * FROM ${this.tableName} WHERE ide_port = $1`;
    const results = await this.databaseConnection.query(sql, [idePort]);
    return results.length > 0 ? this._rowToProject(results[0]) : null;
  }

  /**
   * Find projects by framework
   * @param {string} framework - Framework name
   * @returns {Promise<Object[]>} Projects
   */
  async findByFramework(framework) {
    const sql = `SELECT * FROM ${this.tableName} WHERE framework = $1 ORDER BY last_accessed DESC`;
    const results = await this.databaseConnection.query(sql, [framework]);
    return results.map(row => this._rowToProject(row));
  }

  /**
   * Find projects by language
   * @param {string} language - Programming language
   * @returns {Promise<Object[]>} Projects
   */
  async findByLanguage(language) {
    const sql = `SELECT * FROM ${this.tableName} WHERE language = $1 ORDER BY last_accessed DESC`;
    const results = await this.databaseConnection.query(sql, [language]);
    return results.map(row => this._rowToProject(row));
  }

  /**
   * Find active projects
   * @returns {Promise<Object[]>} Active projects
   */
  async findActive() {
    const sql = `SELECT * FROM ${this.tableName} WHERE status = 'active' ORDER BY last_accessed DESC`;
    const results = await this.databaseConnection.query(sql);
    return results.map(row => this._rowToProject(row));
  }

  /**
   * Find or create project by workspace path
   * @param {string} workspacePath - Workspace path
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Project
   */
  async findOrCreateByWorkspacePath(workspacePath, options = {}) {
    let project = await this.findByWorkspacePath(workspacePath);
    
    if (!project) {
      const projectName = path.basename(workspacePath);
      const projectId = this.generateProjectId(workspacePath);
      
      project = await this.create({
        id: projectId,
        name: projectName,
        workspacePath: workspacePath,
        type: options.type || 'development',
        ideType: options.ideType || 'cursor',
        framework: options.framework || null,
        language: options.language || null,
        packageManager: options.packageManager || null,
        ...options
      });
    }
    
    return project;
  }

  /**
   * Update IDE status for a project
   * @param {string} projectId - Project ID
   * @param {string} ideStatus - IDE status
   * @param {number|null} idePort - IDE port
   * @returns {Promise<Object>} Updated project
   */
  async updateIDEStatus(projectId, ideStatus, idePort = null) {
    const sql = `
      UPDATE ${this.tableName} 
      SET ide_status = $1, ide_port = $2, updated_at = $3
      WHERE id = $4
    `;
    
    const now = new Date().toISOString();
    await this.databaseConnection.execute(sql, [ideStatus, idePort, now, projectId]);
    
    return this.findById(projectId);
  }

  /**
   * Update access information for a project
   * @param {string} projectId - Project ID
   * @returns {Promise<Object>} Updated project
   */
  async updateAccess(projectId) {
    const sql = `
      UPDATE ${this.tableName} 
      SET last_accessed = $1, access_count = access_count + 1, updated_at = $2
      WHERE id = $3
    `;
    
    const now = new Date().toISOString();
    await this.databaseConnection.execute(sql, [now, now, projectId]);
    
    return this.findById(projectId);
  }

  /**
   * Update project configuration
   * @param {string} projectId - Project ID
   * @param {Object} config - Configuration object
   * @returns {Promise<Object>} Updated project
   */
  async updateConfiguration(projectId, config) {
    const sql = `
      UPDATE ${this.tableName} 
      SET config = $1, updated_at = $2
      WHERE id = $3
    `;
    
    const now = new Date().toISOString();
    await this.databaseConnection.execute(sql, [JSON.stringify(config), now, projectId]);
    
    return this.findById(projectId);
  }

  /**
   * Find all projects
   * @returns {Promise<Object[]>} All projects
   */
  async findAll() {
    const sql = `SELECT * FROM ${this.tableName} ORDER BY last_accessed DESC`;
    const results = await this.databaseConnection.query(sql);
    return results.map(row => this._rowToProject(row));
  }

  /**
   * Update project metadata
   * @param {string} projectId - Project ID
   * @param {Object} metadata - Metadata object
   * @returns {Promise<Object>} Updated project
   */
  async updateMetadata(projectId, metadata) {
    const sql = `
      UPDATE ${this.tableName} 
      SET metadata = $1, updated_at = $2
      WHERE id = $3
    `;
    
    const now = new Date().toISOString();
    await this.databaseConnection.execute(sql, [JSON.stringify(metadata), now, projectId]);
    
    return this.findById(projectId);
  }

  /**
   * Delete a project
   * @param {string} id - Project ID
   * @returns {Promise<boolean>} Success status
   */
  async delete(id) {
    const sql = `DELETE FROM ${this.tableName} WHERE id = $1`;
    const result = await this.databaseConnection.execute(sql, [id]);
    return result.rowCount > 0;
  }

  /**
   * Generate project ID from workspace path
   * @param {string} workspacePath - Workspace path
   * @returns {string} Project ID
   */
  generateProjectId(workspacePath) {
    const basename = path.basename(workspacePath);
    return basename.toLowerCase().replace(/[^a-z0-9]/g, '-');
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
      ideType: row.ide_type,
      idePort: row.ide_port,
      ideStatus: row.ide_status,
      backendPort: row.backend_port,
      frontendPort: row.frontend_port,
      databasePort: row.database_port,
      startCommand: row.start_command,
      buildCommand: row.build_command,
      devCommand: row.dev_command,
      testCommand: row.test_command,
      framework: row.framework,
      language: row.language,
      packageManager: row.package_manager,
      status: row.status,
      priority: row.priority,
      lastAccessed: row.last_accessed,
      accessCount: row.access_count,
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      config: row.config ? JSON.parse(row.config) : {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by
    };
  }
}

module.exports = PostgreSQLProjectRepository; 