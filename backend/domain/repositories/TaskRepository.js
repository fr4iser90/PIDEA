/**
 * TaskRepository - Interface for project-based task persistence
 */
class TaskRepository {
  /**
   * Create a new task
   * @param {Task} task - Task entity
   * @returns {Promise<Task>} Created task
   */
  async create(task) {
    throw new Error('create method must be implemented');
  }

  /**
   * Find task by ID
   * @param {string} id - Task ID
   * @returns {Promise<Task|null>} Task or null
   */
  async findById(id) {
    throw new Error('findById method must be implemented');
  }

  /**
   * Find tasks by project ID
   * @param {string} projectId - Project ID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array<Task>>} Array of tasks
   */
  async findByProject(projectId, filters = {}) {
    throw new Error('findByProject method must be implemented');
  }

  /**
   * Update task
   * @param {string} id - Task ID
   * @param {Object} updates - Update data
   * @returns {Promise<Task>} Updated task
   */
  async update(id, updates) {
    throw new Error('update method must be implemented');
  }

  /**
   * Delete task
   * @param {string} id - Task ID
   * @returns {Promise<boolean>} Success status
   */
  async delete(id) {
    throw new Error('delete method must be implemented');
  }

  /**
   * Find tasks by status
   * @param {string} projectId - Project ID
   * @param {string} status - Task status
   * @returns {Promise<Array<Task>>} Array of tasks
   */
  async findByStatus(projectId, status) {
    throw new Error('findByStatus method must be implemented');
  }

  /**
   * Find tasks by priority
   * @param {string} projectId - Project ID
   * @param {string} priority - Task priority
   * @returns {Promise<Array<Task>>} Array of tasks
   */
  async findByPriority(projectId, priority) {
    throw new Error('findByPriority method must be implemented');
  }

  /**
   * Find tasks by type
   * @param {string} projectId - Project ID
   * @param {string} type - Task type
   * @returns {Promise<Array<Task>>} Array of tasks
   */
  async findByType(projectId, type) {
    throw new Error('findByType method must be implemented');
  }

  /**
   * Get task statistics for a project
   * @param {string} projectId - Project ID
   * @returns {Promise<Object>} Task statistics
   */
  async getProjectStats(projectId) {
    throw new Error('getProjectStats method must be implemented');
  }
}

module.exports = TaskRepository; 