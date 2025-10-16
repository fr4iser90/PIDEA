/**
 * AnalysisQueryHandler
 * Handles analysis-related queries
 */
import { AnalysisApplicationService } from '../services/AnalysisApplicationService.js';
import { GetAnalysisQuery } from '../queries/GetAnalysisQuery.js';

export class AnalysisQueryHandler {
  constructor(analysisApplicationService) {
    this._analysisApplicationService = analysisApplicationService;
  }

  /**
   * Handle get analysis query
   * @param {GetAnalysisQuery} query - The get analysis query
   * @returns {Promise<Object>} Analysis results with pagination
   */
  async handleGetAnalysis(query) {
    return await this._analysisApplicationService.getAnalysis(query);
  }

  /**
   * Handle get latest analysis query
   * @param {string} projectId - The project ID
   * @param {string} category - The analysis category
   * @returns {Promise<AnalysisResult|null>} The latest analysis or null
   */
  async handleGetLatestAnalysis(projectId, category) {
    return await this._analysisApplicationService.getLatestAnalysis(projectId, category);
  }

  /**
   * Handle get analysis statistics query
   * @param {string} projectId - The project ID
   * @returns {Promise<Object>} Analysis statistics
   */
  async handleGetAnalysisStatistics(projectId) {
    return await this._analysisApplicationService.getAnalysisStatistics(projectId);
  }

  /**
   * Handle get recommended categories query
   * @param {string} projectId - The project ID
   * @returns {Promise<AnalysisCategory[]>} Recommended categories
   */
  async handleGetRecommendedCategories(projectId) {
    return await this._analysisApplicationService.getRecommendedCategories(projectId);
  }
}
