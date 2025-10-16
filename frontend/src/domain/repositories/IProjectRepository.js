/**
 * IProjectRepository Interface
 * Defines the contract for project data access
 */
export class IProjectRepository {
  /**
   * Find project by ID
   * @param {ProjectId} projectId - The project ID
   * @returns {Promise<Project|null>} The project or null if not found
   */
  async findById(projectId) {
    throw new Error('Method must be implemented by concrete repository');
  }

  /**
   * Find project by name
   * @param {string} name - The project name
   * @returns {Promise<Project|null>} The project or null if not found
   */
  async findByName(name) {
    throw new Error('Method must be implemented by concrete repository');
  }

  /**
   * Find project by workspace path
   * @param {string} workspacePath - The workspace path
   * @returns {Promise<Project|null>} The project or null if not found
   */
  async findByWorkspacePath(workspacePath) {
    throw new Error('Method must be implemented by concrete repository');
  }

  /**
   * Find all projects
   * @param {Object} options - Query options
   * @returns {Promise<Project[]>} Array of projects
   */
  async findAll(options = {}) {
    throw new Error('Method must be implemented by concrete repository');
  }

  /**
   * Find active projects
   * @returns {Promise<Project[]>} Array of active projects
   */
  async findActive() {
    throw new Error('Method must be implemented by concrete repository');
  }

  /**
   * Save project
   * @param {Project} project - The project to save
   * @returns {Promise<Project>} The saved project
   */
  async save(project) {
    throw new Error('Method must be implemented by concrete repository');
  }

  /**
   * Update project
   * @param {Project} project - The project to update
   * @returns {Promise<Project>} The updated project
   */
  async update(project) {
    throw new Error('Method must be implemented by concrete repository');
  }

  /**
   * Delete project
   * @param {ProjectId} projectId - The project ID to delete
   * @returns {Promise<boolean>} True if deleted successfully
   */
  async delete(projectId) {
    throw new Error('Method must be implemented by concrete repository');
  }

  /**
   * Check if project has active tasks
   * @param {ProjectId} projectId - The project ID
   * @returns {Promise<boolean>} True if has active tasks
   */
  async hasActiveTasks(projectId) {
    throw new Error('Method must be implemented by concrete repository');
  }

  /**
   * Check if project has active analysis
   * @param {ProjectId} projectId - The project ID
   * @returns {Promise<boolean>} True if has active analysis
   */
  async hasActiveAnalysis(projectId) {
    throw new Error('Method must be implemented by concrete repository');
  }

  /**
   * Get task count for project
   * @param {ProjectId} projectId - The project ID
   * @returns {Promise<number>} Number of tasks
   */
  async getTaskCount(projectId) {
    throw new Error('Method must be implemented by concrete repository');
  }

  /**
   * Get analysis count for project
   * @param {ProjectId} projectId - The project ID
   * @returns {Promise<number>} Number of analyses
   */
  async getAnalysisCount(projectId) {
    throw new Error('Method must be implemented by concrete repository');
  }

  /**
   * Get chat session count for project
   * @param {ProjectId} projectId - The project ID
   * @returns {Promise<number>} Number of chat sessions
   */
  async getChatSessionCount(projectId) {
    throw new Error('Method must be implemented by concrete repository');
  }

  /**
   * Search projects by query
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Project[]>} Array of matching projects
   */
  async search(query, options = {}) {
    throw new Error('Method must be implemented by concrete repository');
  }

  /**
   * Get project statistics
   * @param {ProjectId} projectId - The project ID
   * @returns {Promise<Object>} Project statistics
   */
  async getStatistics(projectId) {
    throw new Error('Method must be implemented by concrete repository');
  }
}
