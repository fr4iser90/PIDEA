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
        id, name, description, workspace_path, type,
        ide_type, ide_port, ide_status,
        backend_port, frontend_port, database_port,
        start_command, build_command, dev_command, test_command,
        framework, language, package_manager,
        status, priority, last_accessed, access_count,
        metadata, config, created_at, updated_at, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        name = ?, description = ?, workspace_path = ?, type = ?,
        ide_type = ?, ide_port = ?, ide_status = ?,
        backend_port = ?, frontend_port = ?, database_port = ?,
        start_command = ?, build_command = ?, dev_command = ?, test_command = ?,
        framework = ?, language = ?, package_manager = ?,
        status = ?, priority = ?, last_accessed = ?, access_count = ?,
        metadata = ?, config = ?, updated_at = ?
      WHERE id = ?
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
   * Find project by IDE port
   * @param {number} idePort - IDE port
   * @returns {Promise<Object|null>} Project or null
   */
  async findByIDEPort(idePort) {
    const sql = `SELECT * FROM ${this.tableName} WHERE ide_port = ?`;
    const results = await this.databaseConnection.query(sql, [idePort]);
    return results.length > 0 ? this._rowToProject(results[0]) : null;
  }

  /**
   * Find projects by framework
   * @param {string} framework - Framework name
   * @returns {Promise<Object[]>} Projects
   */
  async findByFramework(framework) {
    const sql = `SELECT * FROM ${this.tableName} WHERE framework = ? ORDER BY last_accessed DESC`;
    const results = await this.databaseConnection.query(sql, [framework]);
    return results.map(row => this._rowToProject(row));
  }

  /**
   * Find projects by language
   * @param {string} language - Programming language
   * @returns {Promise<Object[]>} Projects
   */
  async findByLanguage(language) {
    const sql = `SELECT * FROM ${this.tableName} WHERE language = ? ORDER BY last_accessed DESC`;
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
        
        // IDE Configuration
        ideType: options.ideType || 'cursor',
        idePort: options.idePort || null,
        ideStatus: 'inactive',
        
        // Development Server Configuration
        backendPort: options.backendPort || null,
        frontendPort: options.frontendPort || null,
        databasePort: options.databasePort || null,
        
        // Startup Configuration
        startCommand: options.startCommand || null,
        buildCommand: options.buildCommand || null,
        devCommand: options.devCommand || null,
        testCommand: options.testCommand || null,
        
        // Project Metadata
        framework: options.framework || null,
        language: options.language || null,
        packageManager: options.packageManager || null,
        
        status: 'active',
        priority: options.priority || 0,
        metadata: options.metadata || {},
        config: options.config || {},
        createdBy: 'me'
      };
      
      await this.create(project);
    }
    
    return project;
  }

  /**
   * Update project IDE status
   * @param {string} projectId - Project ID
   * @param {string} ideStatus - IDE status
   * @param {number} idePort - IDE port
   * @returns {Promise<Object>} Updated project
   */
  async updateIDEStatus(projectId, ideStatus, idePort = null) {
    const project = await this.findById(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    const sql = `
      UPDATE ${this.tableName} SET
        ide_status = ?, ide_port = ?, updated_at = ?
      WHERE id = ?
    `;

    const now = new Date().toISOString();
    await this.databaseConnection.execute(sql, [
      ideStatus,
      idePort,
      now,
      projectId
    ]);

    return { ...project, ideStatus, idePort };
  }

  /**
   * Update project access
   * @param {string} projectId - Project ID
   * @returns {Promise<Object>} Updated project
   */
  async updateAccess(projectId) {
    const project = await this.findById(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    const sql = `
      UPDATE ${this.tableName} SET
        last_accessed = ?, access_count = access_count + 1, updated_at = ?
      WHERE id = ?
    `;

    const now = new Date().toISOString();
    await this.databaseConnection.execute(sql, [
      now,
      now,
      projectId
    ]);

    return { ...project, lastAccessed: now, accessCount: (project.accessCount || 0) + 1 };
  }

  /**
   * Update project configuration
   * @param {string} projectId - Project ID
   * @param {Object} config - Configuration to update
   * @returns {Promise<Object>} Updated project
   */
  async updateConfiguration(projectId, config) {
    const project = await this.findById(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    const updatedConfig = { ...project.config, ...config };
    const sql = `
      UPDATE ${this.tableName} SET
        config = ?, updated_at = ?
      WHERE id = ?
    `;

    const now = new Date().toISOString();
    await this.databaseConnection.execute(sql, [
      JSON.stringify(updatedConfig),
      now,
      projectId
    ]);

    return { ...project, config: updatedConfig };
  }

  /**
   * Get all projects
   * @returns {Promise<Object[]>} All projects
   */
  async findAll() {
    const sql = `SELECT * FROM ${this.tableName} ORDER BY last_accessed DESC, created_at DESC`;
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
      
      // IDE Configuration
      ideType: row.ide_type,
      idePort: row.ide_port,
      ideStatus: row.ide_status,
      
      // Development Server Configuration
      backendPort: row.backend_port,
      frontendPort: row.frontend_port,
      databasePort: row.database_port,
      
      // Startup Configuration
      startCommand: row.start_command,
      buildCommand: row.build_command,
      devCommand: row.dev_command,
      testCommand: row.test_command,
      
      // Project Metadata
      framework: row.framework,
      language: row.language,
      packageManager: row.package_manager,
      
      // Status and Management
      status: row.status,
      priority: row.priority,
      lastAccessed: row.last_accessed,
      accessCount: row.access_count,
      
      // Extended Metadata
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      config: row.config ? JSON.parse(row.config) : {},
      
      // Timestamps
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by
    };
  }
}

module.exports = SQLiteProjectRepository; 