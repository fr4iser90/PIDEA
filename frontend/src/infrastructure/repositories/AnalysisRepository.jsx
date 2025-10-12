/**
 * AnalysisRepository - Frontend repository for analysis data
 * Uses category-based API routes for cleaner data access
 */

import { apiCall } from './ChatRepository.jsx';

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

  // ============================================================================
  // ENHANCED ANALYSIS METHODS (merged from ChatRepository)
  // ============================================================================

  /**
   * Get analysis status
   * @param {string} projectId - Project ID (optional)
   * @returns {Promise<Object>} Analysis status
   */
  async getAnalysisStatus(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/status`, {}, currentProjectId);
  }

  /**
   * Get analysis charts
   * @param {string} projectId - Project ID (optional)
   * @param {string} type - Chart type (default: trends)
   * @returns {Promise<Object>} Analysis charts
   */
  async getAnalysisCharts(projectId = null, type = 'trends') {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/charts/${type}`, {}, currentProjectId);
  }

  /**
   * Get analysis history
   * @param {string} projectId - Project ID (optional)
   * @returns {Promise<Object>} Analysis history
   */
  async getAnalysisHistory(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/history`, {}, currentProjectId);
  }

  /**
   * Get analysis tech stack (enhanced)
   * @param {string} projectId - Project ID (optional)
   * @returns {Promise<Object>} Analysis tech stack
   */
  async getAnalysisTechStack(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/techstack`, {}, currentProjectId);
  }

  /**
   * Get analysis architecture (enhanced)
   * @param {string} projectId - Project ID (optional)
   * @returns {Promise<Object>} Analysis architecture
   */
  async getAnalysisArchitecture(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/architecture`, {}, currentProjectId);
  }

  /**
   * Get current project ID (delegates to ProjectRepository)
   * @returns {Promise<string>} Current project ID
   */
  async getCurrentProjectId() {
    const { default: ProjectRepository } = await import('./ProjectRepository.jsx');
    const projectRepo = new ProjectRepository();
    return projectRepo.getCurrentProjectId();
  }

  /**
   * Execute analysis step
   * @param {string} projectId - Project ID (optional)
   * @param {string} analysisType - Analysis type
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Analysis result
   */
  async executeAnalysisStep(projectId = null, analysisType, options = {}) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    
    // Map frontend analysis types to backend route names
    const routeMapping = {
      'code-quality': 'code-quality',
      'security': 'security',
      'performance': 'performance',
      'architecture': 'architecture',
      'tech-stack': 'tech-stack',
      'manifest': 'manifest',
      'dependencies': 'dependencies',
      'recommendations': 'recommendations',
      'security-recommendations': 'security-recommendations',
      'code-quality-recommendations': 'code-quality-recommendations',
      'architecture-recommendations': 'architecture-recommendations'
    };
    
    const routeName = routeMapping[analysisType] || analysisType;
    
    return apiCall(`/api/projects/${currentProjectId}/analysis/${routeName}`, {
      method: 'POST',
      body: JSON.stringify(options)
    }, currentProjectId);
  }

  /**
   * Start analysis
   * @param {string} projectId - Project ID (optional)
   * @param {string} analysisType - Analysis type
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Analysis result
   */
  async startAnalysis(projectId = null, analysisType, options = {}) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    
    // Map frontend analysis types to backend step names
    const stepMapping = {
      'code-quality': 'CodeQualityAnalysisOrchestrator',
      'security': 'SecurityAnalysisOrchestrator',
      'performance': 'PerformanceAnalysisOrchestrator',
      'architecture': 'ArchitectureAnalysisOrchestrator',
      'tech-stack': 'TechStackAnalysisOrchestrator',
      'manifest': 'ManifestAnalysisOrchestrator',
      'dependencies': 'DependencyAnalysisOrchestrator',
      'recommendations': 'RecommendationsStep'
    };
    
    const stepName = stepMapping[analysisType] || analysisType;
    
    // Use task enqueue endpoint to run the specific step
    return apiCall(`/api/projects/${currentProjectId}/tasks/enqueue`, {
      method: 'POST',
      body: JSON.stringify({
        workflow: analysisType + '-analysis',
        steps: [stepName],
        projectPath: options.projectPath || '/home/fr4iser/Documents/Git/PIDEA',
        options: {
          ...options,
          analysisType: analysisType
        }
      })
    }, currentProjectId);
  }

  /**
   * Get analysis data directly (fast, no workflow)
   * @param {string} projectId - Project ID (optional)
   * @param {string} analysisType - Analysis type (optional)
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Analysis data
   */
  async getAnalysisData(projectId = null, analysisType = null, options = {}) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    
    // Map analysis types to specific endpoints
    const endpointMapping = {
      'security': 'issues',
      'code-quality': 'issues',
      'architecture': 'architecture',
      'tech-stack': 'techstack',
      'recommendations': 'recommendations',
      'charts': 'charts'
    };
    
    const endpoint = endpointMapping[analysisType] || 'issues';
    
    if (endpoint === 'issues') {
      return this.getAnalysisIssuesDirect(currentProjectId, analysisType);
    } else if (endpoint === 'charts') {
      return this.getAnalysisChartsDirect(currentProjectId, options.chartType || 'trends');
    } else {
      const methodName = `getAnalysis${endpoint.charAt(0).toUpperCase() + endpoint.slice(1)}Direct`;
      return this[methodName]?.(currentProjectId) || Promise.resolve({ success: false, data: null });
    }
  }

  /**
   * Get analysis status directly (fast, no workflow)
   * @param {string} projectId - Project ID (optional)
   * @returns {Promise<Object>} Analysis status
   */
  async getAnalysisStatusDirect(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/status`, {}, currentProjectId);
  }

  /**
   * Get analysis metrics directly (fast, no workflow)
   * @param {string} projectId - Project ID (optional)
   * @returns {Promise<Object>} Analysis metrics
   */
  async getAnalysisMetricsDirect(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/metrics`, {}, currentProjectId);
  }

  /**
   * Get analysis history directly (fast, no workflow)
   * @param {string} projectId - Project ID (optional)
   * @param {Object} options - History options
   * @returns {Promise<Object>} Analysis history
   */
  async getAnalysisHistoryDirect(projectId = null, options = {}) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    
    const queryParams = new URLSearchParams();
    if (options.limit) queryParams.append('limit', options.limit);
    if (options.offset) queryParams.append('offset', options.offset);
    if (options.types) queryParams.append('types', options.types);
    
    return apiCall(`/api/projects/${currentProjectId}/analysis/history?${queryParams}`, {}, currentProjectId);
  }

  /**
   * Get analysis issues directly (fast, no workflow)
   * @param {string} projectId - Project ID (optional)
   * @param {string} type - Issue type (default: code-quality)
   * @returns {Promise<Object>} Analysis issues
   */
  async getAnalysisIssuesDirect(projectId = null, type = 'code-quality') {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/issues?type=${type}`, {}, currentProjectId);
  }

  /**
   * Get analysis tech stack directly (fast, no workflow)
   * @param {string} projectId - Project ID (optional)
   * @returns {Promise<Object>} Analysis tech stack
   */
  async getAnalysisTechStackDirect(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/techstack`, {}, currentProjectId);
  }

  /**
   * Get analysis architecture directly (fast, no workflow)
   * @param {string} projectId - Project ID (optional)
   * @returns {Promise<Object>} Analysis architecture
   */
  async getAnalysisArchitectureDirect(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/architecture`, {}, currentProjectId);
  }

  /**
   * Get analysis recommendations directly (fast, no workflow)
   * @param {string} projectId - Project ID (optional)
   * @returns {Promise<Object>} Analysis recommendations
   */
  async getAnalysisRecommendationsDirect(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/recommendations`, {}, currentProjectId);
  }

  /**
   * Get analysis charts directly (fast, no workflow)
   * @param {string} projectId - Project ID (optional)
   * @param {string} type - Chart type (default: trends)
   * @returns {Promise<Object>} Analysis charts
   */
  async getAnalysisChartsDirect(projectId = null, type = 'trends') {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/charts/${type}`, {}, currentProjectId);
  }

  /**
   * Execute analysis workflow (for complex runs like "Run All Analysis")
   * @param {string} projectId - Project ID (optional)
   * @param {string} analysisType - Analysis type
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Analysis result
   */
  async executeAnalysisWorkflow(projectId = null, analysisType, options = {}) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    
    return apiCall(`/api/projects/${currentProjectId}/analysis/execute`, {
      method: 'POST',
      body: JSON.stringify({
        analysisType,
        options
      })
    }, currentProjectId);
  }

  /**
   * Get analysis steps
   * @param {string} projectId - Project ID (optional)
   * @param {Object} options - Step options
   * @returns {Promise<Object>} Analysis steps
   */
  async getAnalysisSteps(projectId = null, options = {}) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    const queryParams = new URLSearchParams(options).toString();
    return apiCall(`/api/projects/${currentProjectId}/analysis/steps?${queryParams}`, {}, currentProjectId);
  }

  /**
   * Get analysis step by ID
   * @param {string} stepId - Step ID
   * @param {string} projectId - Project ID (optional)
   * @returns {Promise<Object>} Analysis step
   */
  async getAnalysisStep(stepId, projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/steps/${stepId}`, {}, currentProjectId);
  }

  /**
   * Get active analysis steps
   * @param {string} projectId - Project ID (optional)
   * @returns {Promise<Object>} Active analysis steps
   */
  async getActiveAnalysisSteps(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/steps/active`, {}, currentProjectId);
  }

  /**
   * Cancel analysis step
   * @param {string} stepId - Step ID
   * @param {string} projectId - Project ID (optional)
   * @returns {Promise<Object>} Cancel result
   */
  async cancelAnalysisStep(stepId, projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/steps/${stepId}/cancel`, {
      method: 'POST'
    }, currentProjectId);
  }

  /**
   * Retry analysis step
   * @param {string} stepId - Step ID
   * @param {string} projectId - Project ID (optional)
   * @param {Object} options - Retry options
   * @returns {Promise<Object>} Retry result
   */
  async retryAnalysisStep(stepId, projectId = null, options = {}) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/steps/${stepId}/retry`, {
      method: 'POST',
      body: JSON.stringify(options)
    }, currentProjectId);
  }

  /**
   * Get analysis step statistics
   * @param {string} projectId - Project ID (optional)
   * @returns {Promise<Object>} Analysis step statistics
   */
  async getAnalysisStepStats(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/steps/stats`, {}, currentProjectId);
  }

  /**
   * Get completion status
   * @param {string} projectId - Project ID (optional)
   * @returns {Promise<Object>} Completion status
   */
  async getCompletionStatus(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/completion/status`, {}, currentProjectId);
  }

  /**
   * Get completion history
   * @param {string} projectId - Project ID (optional)
   * @returns {Promise<Object>} Completion history
   */
  async getCompletionHistory(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/completion/history`, {}, currentProjectId);
  }

  /**
   * Cancel completion workflow
   * @param {string} projectId - Project ID (optional)
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object>} Cancel result
   */
  async cancelCompletionWorkflow(projectId = null, sessionId) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/completion/cancel`, {
      method: 'POST',
      body: JSON.stringify({ sessionId })
    }, currentProjectId);
  }
}

export default AnalysisRepository; 