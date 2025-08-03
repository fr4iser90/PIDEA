/**
 * AnalysisRepository - Frontend repository for analysis data
 * Uses category-based API routes for cleaner data access
 */

import { apiCall } from './APIChatRepository.jsx';

class AnalysisRepository {
  constructor(baseURL = '/api') {
    this.baseURL = baseURL;
  }

  /**
   * Get aggregated issues for a specific analysis category
   * @param {string} projectId - Project ID
   * @param {string} category - Analysis category (security, code-quality, etc.)
   * @returns {Promise<Array>} Aggregated issues
   */
  async getAnalysisIssues(projectId, category = 'security') {
    try {
      const url = `${this.baseURL}/projects/${projectId}/analysis/${category}/issues`;
      console.log(`🔍 [FRONTEND] Fetching ${category} issues for project: ${projectId}`);
      console.log(`🔍 [FRONTEND] Request URL: ${url}`);
      
      const data = await apiCall(url, {}, projectId);
      console.log(`🔍 [FRONTEND] ${category} issues raw response:`, JSON.stringify(data, null, 2));
      console.log(`🔍 [FRONTEND] ${category} issues response structure:`, {
        success: data.success,
        hasData: !!data.data,
        dataKeys: data.data ? Object.keys(data.data) : 'NO_DATA',
        issuesCount: data.data?.issues ? data.data.issues.length : 'NO_ISSUES',
        category: data.data?.category,
        count: data.data?.count
      });
      
      const issues = data.data?.issues || [];
      console.log(`🔍 [FRONTEND] ${category} issues extracted: ${issues.length} items`);
      return issues;
    } catch (error) {
      console.error(`🔍 [FRONTEND] Error fetching ${category} issues:`, error);
      return [];
    }
  }

  /**
   * Get aggregated recommendations for a specific category
   * @param {string} projectId - Project ID
   * @param {string} category - Analysis category
   * @returns {Promise<Array>} Aggregated recommendations
   */
  async getAnalysisRecommendations(projectId, category = 'security') {
    try {
      const url = `${this.baseURL}/projects/${projectId}/analysis/${category}/recommendations`;
      console.log(`🔍 [FRONTEND] Fetching ${category} recommendations for project: ${projectId}`);
      console.log(`🔍 [FRONTEND] Request URL: ${url}`);
      
      const data = await apiCall(url, {}, projectId);
      console.log(`🔍 [FRONTEND] ${category} recommendations raw response:`, JSON.stringify(data, null, 2));
      console.log(`🔍 [FRONTEND] ${category} recommendations response structure:`, {
        success: data.success,
        hasData: !!data.data,
        dataKeys: data.data ? Object.keys(data.data) : 'NO_DATA',
        recommendationsCount: data.data?.recommendations ? data.data.recommendations.length : 'NO_RECOMMENDATIONS',
        category: data.data?.category,
        count: data.data?.count
      });
      
      const recommendations = data.data?.recommendations || [];
      console.log(`🔍 [FRONTEND] ${category} recommendations extracted: ${recommendations.length} items`);
      return recommendations;
    } catch (error) {
      console.error(`🔍 [FRONTEND] Error fetching ${category} recommendations:`, error);
      return [];
    }
  }

  /**
   * Get aggregated tasks for a specific category
   * @param {string} projectId - Project ID
   * @param {string} category - Analysis category
   * @returns {Promise<Array>} Aggregated tasks
   */
  async getAnalysisTasks(projectId, category = 'security') {
    try {
      const data = await apiCall(`${this.baseURL}/projects/${projectId}/analysis/${category}/tasks`, {}, projectId);
      return data.tasks || [];
    } catch (error) {
      console.error('Failed to fetch analysis tasks:', error);
      throw error;
    }
  }

  /**
   * Get aggregated documentation for a specific category
   * @param {string} projectId - Project ID
   * @param {string} category - Analysis category
   * @returns {Promise<Array>} Aggregated documentation
   */
  async getAnalysisDocumentation(projectId, category = 'security') {
    try {
      const data = await apiCall(`${this.baseURL}/projects/${projectId}/analysis/${category}/documentation`, {}, projectId);
      return data.documentation || [];
    } catch (error) {
      console.error('Failed to fetch analysis documentation:', error);
      throw error;
    }
  }

  /**
   * Get complete analysis results for a specific category
   * @param {string} projectId - Project ID
   * @param {string} category - Analysis category
   * @returns {Promise<Object>} Complete analysis results
   */
  async getAnalysisResults(projectId, category = 'security') {
    try {
      const data = await apiCall(`${this.baseURL}/projects/${projectId}/analysis/${category}/results`, {}, projectId);
      return data.results || {};
    } catch (error) {
      console.error('Failed to fetch analysis results:', error);
      throw error;
    }
  }

  /**
   * Get analysis summary for a specific category
   * @param {string} projectId - Project ID
   * @param {string} category - Analysis category
   * @returns {Promise<Object>} Analysis summary
   */
  async getAnalysisSummary(projectId, category = 'security') {
    try {
      const data = await apiCall(`${this.baseURL}/projects/${projectId}/analysis/${category}/summary`, {}, projectId);
      return data.summary || {};
    } catch (error) {
      console.error('Failed to fetch analysis summary:', error);
      throw error;
    }
  }

  /**
   * Get analysis metrics for a specific category
   * @param {string} projectId - Project ID
   * @param {string} category - Analysis category
   * @returns {Promise<Object>} Analysis metrics
   */
  async getAnalysisMetrics(projectId, category = 'security') {
    try {
      const data = await apiCall(`${this.baseURL}/projects/${projectId}/analysis/${category}/metrics`, {}, projectId);
      return data.metrics || {};
    } catch (error) {
      console.error('Failed to fetch analysis metrics:', error);
      throw error;
    }
  }

  /**
   * Get all analysis data for a specific category (convenience method)
   * @param {string} projectId - Project ID
   * @param {string} category - Analysis category
   * @returns {Promise<Object>} All analysis data
   */
  async getAllAnalysisData(projectId, category = 'security') {
    try {
      const [issues, recommendations, tasks, documentation, metrics, summary] = await Promise.all([
        this.getAnalysisIssues(projectId, category),
        this.getAnalysisRecommendations(projectId, category),
        this.getAnalysisTasks(projectId, category),
        this.getAnalysisDocumentation(projectId, category),
        this.getAnalysisMetrics(projectId, category),
        this.getAnalysisSummary(projectId, category)
      ]);

      return {
        issues,
        recommendations,
        tasks,
        documentation,
        metrics,
        summary,
        category,
        projectId
      };
    } catch (error) {
      console.error('Failed to fetch all analysis data:', error);
      throw error;
    }
  }

  /**
   * Request new analysis execution for a specific category
   * @param {string} projectId - Project ID
   * @param {string} category - Analysis category
   * @returns {Promise<Object>} Analysis request result
   */
  async requestAnalysis(projectId, category = 'security') {
    try {
      const data = await apiCall(`${this.baseURL}/projects/${projectId}/analysis/${category}`, {
        method: 'POST',
        body: JSON.stringify({
          category: category
        })
      }, projectId);
      return data;
    } catch (error) {
      console.error('Failed to request analysis:', error);
      throw error;
    }
  }

  /**
   * Get available analysis categories
   * @returns {Array<string>} Available categories
   */
  getAvailableCategories() {
    return [
      'security',
      'code-quality',
      'architecture',
      'performance',
      'tech-stack',
      'dependencies',
      'manifest'
    ];
  }

  async getSecurityIssues(projectId) {
    try {
      console.log(`🔍 [FRONTEND] Fetching security issues for project: ${projectId}`);
      const data = await apiCall(`${this.baseURL}/projects/${projectId}/analysis/security/issues`, {}, projectId);
      console.log(`🔍 [FRONTEND] Security issues raw response:`, JSON.stringify(data, null, 2));
      console.log(`🔍 [FRONTEND] Security issues count:`, data.issues ? data.issues.length : 'undefined');
      return data.issues || [];
    } catch (error) {
      console.error(`🔍 [FRONTEND] Error fetching security issues:`, error);
      return [];
    }
  }

  async getSecurityRecommendations(projectId) {
    try {
      console.log(`🔍 [FRONTEND] Fetching security recommendations for project: ${projectId}`);
      const data = await apiCall(`${this.baseURL}/projects/${projectId}/analysis/security/recommendations`, {}, projectId);
      console.log(`🔍 [FRONTEND] Security recommendations raw response:`, JSON.stringify(data, null, 2));
      console.log(`🔍 [FRONTEND] Security recommendations count:`, data.recommendations ? data.recommendations.length : 'undefined');
      return data.recommendations || [];
    } catch (error) {
      console.error(`🔍 [FRONTEND] Error fetching security recommendations:`, error);
      return [];
    }
  }
}

export default AnalysisRepository; 