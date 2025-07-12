/**
 * ProjectRepository - Interface for project persistence
 */
class ProjectRepository {
  /**
   * Create a new project
   * @param {Project} project - Project entity
   * @returns {Promise<Project>} Created project
   */
  async create(project) {
    throw new Error('create method must be implemented');
  }

  /**
   * Save a project (create or update)
   * @param {Project} project - Project entity
   * @returns {Promise<Project>} Saved project
   */
  async save(project) {
    throw new Error('save method must be implemented');
  }

  /**
   * Find project by ID
   * @param {string} id - Project ID
   * @returns {Promise<Project|null>} Project or null
   */
  async findById(id) {
    throw new Error('findById method must be implemented');
  }

  /**
   * Find project by workspace path
   * @param {string} workspacePath - Workspace path
   * @returns {Promise<Project|null>} Project or null
   */
  async findByWorkspacePath(workspacePath) {
    throw new Error('findByWorkspacePath method must be implemented');
  }

  /**
   * Find or create project by workspace path
   * @param {string} workspacePath - Workspace path
   * @param {Object} options - Project options
   * @returns {Promise<Project>} Project (created or existing)
   */
  async findOrCreateByWorkspacePath(workspacePath, options = {}) {
    throw new Error('findOrCreateByWorkspacePath method must be implemented');
  }

  /**
   * Get all projects
   * @returns {Promise<Project[]>} All projects
   */
  async findAll() {
    throw new Error('findAll method must be implemented');
  }

  /**
   * Update project metadata
   * @param {string} projectId - Project ID
   * @param {Object} metadata - Metadata to update
   * @returns {Promise<Project>} Updated project
   */
  async updateMetadata(projectId, metadata) {
    throw new Error('updateMetadata method must be implemented');
  }

  /**
   * Delete project
   * @param {string} id - Project ID
   * @returns {Promise<boolean>} Success
   */
  async delete(id) {
    throw new Error('delete method must be implemented');
  }
}

module.exports = ProjectRepository; 