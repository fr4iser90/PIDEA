/**
 * AnalysisApplicationService
 * Application service for analysis management use cases
 */
import { AnalysisDomainService } from '../../domain/services/AnalysisDomainService.js';
import { StartAnalysisCommand } from '../commands/StartAnalysisCommand.js';
import { GetAnalysisQuery } from '../queries/GetAnalysisQuery.js';
import { AnalysisCompletedEvent } from '../../domain/events/AnalysisCompletedEvent.js';

export class AnalysisApplicationService {
  constructor(analysisRepository, eventBus) {
    this._analysisRepository = analysisRepository;
    this._eventBus = eventBus;
    this._domainService = new AnalysisDomainService(analysisRepository);
  }

  /**
   * Start an analysis
   * @param {StartAnalysisCommand} command - The start analysis command
   * @returns {Promise<AnalysisResult>} The started analysis
   */
  async startAnalysis(command) {
    try {
      if (!command || !(command instanceof StartAnalysisCommand)) {
        throw new Error('Invalid command provided');
      }

      // Validate analysis configuration
      const validation = this._domainService.validateAnalysisConfiguration({
        category: command.category,
        projectId: command.projectId
      });

      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Create analysis using domain service
      const analysis = await this._domainService.createAnalysis(
        command.projectId,
        command.category,
        {
          priority: command.priority,
          metadata: command.metadata,
          parameters: command.parameters,
          timeout: command.timeout
        }
      );

      // Save analysis
      const savedAnalysis = await this._analysisRepository.save(analysis);
      return savedAnalysis;
    } catch (error) {
      throw new Error(`Failed to start analysis: ${error.message}`);
    }
  }

  /**
   * Complete an analysis
   * @param {string} analysisId - The analysis ID
   * @param {Object} results - The analysis results
   * @returns {Promise<AnalysisResult>} The completed analysis
   */
  async completeAnalysis(analysisId, results) {
    try {
      const analysis = await this._analysisRepository.findById(analysisId);
      if (!analysis) {
        throw new Error('Analysis not found');
      }

      // Validate if analysis can be completed
      await this._domainService.canCompleteAnalysis(analysisId);

      const startTime = analysis.createdAt;
      
      // Complete the analysis
      analysis.complete(
        results.summary,
        results.recommendations,
        results.issues,
        results.metrics,
        results.data
      );

      // Calculate duration
      const duration = Date.now() - startTime.getTime();

      // Save updated analysis
      const updatedAnalysis = await this._analysisRepository.update(analysis);

      // Publish domain event
      const event = new AnalysisCompletedEvent(
        analysisId,
        analysis.projectId,
        analysis.category.value,
        analysis.completedAt,
        duration,
        results.issues ? results.issues.length : 0,
        results.recommendations ? results.recommendations.length : 0
      );
      await this._eventBus.publish(event);

      return updatedAnalysis;
    } catch (error) {
      throw new Error(`Failed to complete analysis: ${error.message}`);
    }
  }

  /**
   * Get analysis results
   * @param {GetAnalysisQuery} query - The get analysis query
   * @returns {Promise<Object>} Analysis results with pagination info
   */
  async getAnalysis(query) {
    try {
      if (!query || !(query instanceof GetAnalysisQuery)) {
        throw new Error('Invalid query provided');
      }

      let analyses;
      
      if (query.projectId) {
        analyses = await this._analysisRepository.findByProjectId(query.projectId, {
          category: query.category,
          status: query.status,
          limit: query.limit,
          offset: query.offset,
          sortBy: query.sortBy,
          sortOrder: query.sortOrder,
          includeResults: query.includeResults
        });
      } else if (query.category) {
        analyses = await this._analysisRepository.findByCategory(query.category, {
          status: query.status,
          limit: query.limit,
          offset: query.offset,
          sortBy: query.sortBy,
          sortOrder: query.sortOrder,
          includeResults: query.includeResults
        });
      } else if (query.status) {
        analyses = await this._analysisRepository.findByStatus(query.status, {
          category: query.category,
          limit: query.limit,
          offset: query.offset,
          sortBy: query.sortBy,
          sortOrder: query.sortOrder,
          includeResults: query.includeResults
        });
      } else {
        analyses = await this._analysisRepository.findAll({
          category: query.category,
          status: query.status,
          limit: query.limit,
          offset: query.offset,
          sortBy: query.sortBy,
          sortOrder: query.sortOrder,
          includeResults: query.includeResults
        });
      }

      return {
        analyses: analyses.map(analysis => analysis.toJSON()),
        pagination: {
          limit: query.limit,
          offset: query.offset,
          total: analyses.length
        }
      };
    } catch (error) {
      throw new Error(`Failed to get analysis: ${error.message}`);
    }
  }

  /**
   * Get latest analysis by project and category
   * @param {string} projectId - The project ID
   * @param {string} category - The analysis category
   * @returns {Promise<AnalysisResult|null>} The latest analysis or null
   */
  async getLatestAnalysis(projectId, category) {
    try {
      return await this._analysisRepository.getLatestByProjectAndCategory(projectId, category);
    } catch (error) {
      throw new Error(`Failed to get latest analysis: ${error.message}`);
    }
  }

  /**
   * Get analysis statistics
   * @param {string} projectId - The project ID
   * @returns {Promise<Object>} Analysis statistics
   */
  async getAnalysisStatistics(projectId) {
    try {
      return await this._domainService.getProjectAnalysisStatistics(projectId);
    } catch (error) {
      throw new Error(`Failed to get analysis statistics: ${error.message}`);
    }
  }

  /**
   * Get recommended analysis categories
   * @param {string} projectId - The project ID
   * @returns {Promise<AnalysisCategory[]>} Recommended categories
   */
  async getRecommendedCategories(projectId) {
    try {
      const project = await this._analysisRepository.findProjectById(projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      return this._domainService.getRecommendedCategories(project.metadata);
    } catch (error) {
      throw new Error(`Failed to get recommended categories: ${error.message}`);
    }
  }

  /**
   * Estimate analysis duration
   * @param {string} category - The analysis category
   * @param {string} projectSize - The project size
   * @returns {number} Estimated duration in minutes
   */
  estimateAnalysisDuration(category, projectSize = 'medium') {
    return this._domainService.estimateAnalysisDuration(category, projectSize);
  }

  /**
   * Get analysis priority
   * @param {string} category - The analysis category
   * @returns {string} The analysis priority
   */
  getAnalysisPriority(category) {
    return this._domainService.getAnalysisPriority(category);
  }

  /**
   * Check if analysis should run automatically
   * @param {string} category - The analysis category
   * @param {Object} projectMetadata - The project metadata
   * @returns {boolean} True if should run automatically
   */
  shouldRunAutomatically(category, projectMetadata = {}) {
    return this._domainService.shouldRunAutomatically(category, projectMetadata);
  }
}
