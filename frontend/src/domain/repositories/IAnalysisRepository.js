/**
 * IAnalysisRepository Interface
 * Defines the contract for analysis data access
 */
export class IAnalysisRepository {
  /**
   * Find analysis by ID
   * @param {string} analysisId - The analysis ID
   * @returns {Promise<AnalysisResult|null>} The analysis or null if not found
   */
  async findById(analysisId) {
    throw new Error('Method must be implemented by concrete repository');
  }

  /**
   * Find analyses by project ID
   * @param {string} projectId - The project ID
   * @param {Object} options - Query options
   * @returns {Promise<AnalysisResult[]>} Array of analyses
   */
  async findByProjectId(projectId, options = {}) {
    throw new Error('Method must be implemented by concrete repository');
  }

  /**
   * Find analyses by category
   * @param {AnalysisCategory} category - The analysis category
   * @param {Object} options - Query options
   * @returns {Promise<AnalysisResult[]>} Array of analyses
   */
  async findByCategory(category, options = {}) {
    throw new Error('Method must be implemented by concrete repository');
  }

  /**
   * Find analyses by status
   * @param {string} status - The analysis status
   * @param {Object} options - Query options
   * @returns {Promise<AnalysisResult[]>} Array of analyses
   */
  async findByStatus(status, options = {}) {
    throw new Error('Method must be implemented by concrete repository');
  }

  /**
   * Find running analysis by project and category
   * @param {string} projectId - The project ID
   * @param {AnalysisCategory} category - The analysis category
   * @returns {Promise<AnalysisResult|null>} The running analysis or null
   */
  async findRunningByProjectAndCategory(projectId, category) {
    throw new Error('Method must be implemented by concrete repository');
  }

  /**
   * Find project by ID (for validation)
   * @param {string} projectId - The project ID
   * @returns {Promise<Project|null>} The project or null if not found
   */
  async findProjectById(projectId) {
    throw new Error('Method must be implemented by concrete repository');
  }

  /**
   * Save analysis
   * @param {AnalysisResult} analysis - The analysis to save
   * @returns {Promise<AnalysisResult>} The saved analysis
   */
  async save(analysis) {
    throw new Error('Method must be implemented by concrete repository');
  }

  /**
   * Update analysis
   * @param {AnalysisResult} analysis - The analysis to update
   * @returns {Promise<AnalysisResult>} The updated analysis
   */
  async update(analysis) {
    throw new Error('Method must be implemented by concrete repository');
  }

  /**
   * Delete analysis
   * @param {string} analysisId - The analysis ID to delete
   * @returns {Promise<boolean>} True if deleted successfully
   */
  async delete(analysisId) {
    throw new Error('Method must be implemented by concrete repository');
  }

  /**
   * Get analysis count by project
   * @param {string} projectId - The project ID
   * @returns {Promise<number>} Number of analyses
   */
  async countByProject(projectId) {
    throw new Error('Method must be implemented by concrete repository');
  }

  /**
   * Get analysis count by category
   * @param {AnalysisCategory} category - The analysis category
   * @returns {Promise<number>} Number of analyses
   */
  async countByCategory(category) {
    throw new Error('Method must be implemented by concrete repository');
  }

  /**
   * Get analysis count by status
   * @param {string} status - The analysis status
   * @returns {Promise<number>} Number of analyses
   */
  async countByStatus(status) {
    throw new Error('Method must be implemented by concrete repository');
  }

  /**
   * Get analysis statistics
   * @param {string} projectId - The project ID
   * @returns {Promise<Object>} Analysis statistics
   */
  async getStatistics(projectId) {
    throw new Error('Method must be implemented by concrete repository');
  }

  /**
   * Get latest analysis by project and category
   * @param {string} projectId - The project ID
   * @param {AnalysisCategory} category - The analysis category
   * @returns {Promise<AnalysisResult|null>} The latest analysis or null
   */
  async getLatestByProjectAndCategory(projectId, category) {
    throw new Error('Method must be implemented by concrete repository');
  }

  /**
   * Search analyses by query
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<AnalysisResult[]>} Array of matching analyses
   */
  async search(query, options = {}) {
    throw new Error('Method must be implemented by concrete repository');
  }
}
