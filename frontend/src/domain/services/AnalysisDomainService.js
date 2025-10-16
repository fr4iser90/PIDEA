/**
 * Analysis Domain Service
 * Contains business logic for analysis management
 */
import { AnalysisResult } from '../entities/AnalysisResult.js';
import { AnalysisCategory } from '../value-objects/AnalysisCategory.js';

export class AnalysisDomainService {
  constructor(analysisRepository) {
    this._analysisRepository = analysisRepository;
  }

  /**
   * Creates a new analysis with validation
   */
  async createAnalysis(projectId, category, options = {}) {
    // Validate project exists
    const project = await this._analysisRepository.findProjectById(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    // Check if analysis is already running for this category
    const existingAnalysis = await this._analysisRepository.findRunningByProjectAndCategory(projectId, category);
    if (existingAnalysis) {
      throw new Error(`Analysis for category "${category.value}" is already running`);
    }

    // Generate unique analysis ID
    const analysisId = this.generateAnalysisId();

    // Create analysis result
    const analysisResult = new AnalysisResult(analysisId, projectId, category, {
      ...options,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return analysisResult;
  }

  /**
   * Validates if an analysis can be started
   */
  async canStartAnalysis(analysisId) {
    const analysis = await this._analysisRepository.findById(analysisId);
    if (!analysis) {
      throw new Error('Analysis not found');
    }

    if (analysis.status !== 'pending') {
      throw new Error('Only pending analyses can be started');
    }

    // Check if project is active
    const project = await this._analysisRepository.findProjectById(analysis.projectId);
    if (!project || !project.isActive) {
      throw new Error('Cannot start analysis for inactive project');
    }

    return true;
  }

  /**
   * Validates if an analysis can be completed
   */
  async canCompleteAnalysis(analysisId) {
    const analysis = await this._analysisRepository.findById(analysisId);
    if (!analysis) {
      throw new Error('Analysis not found');
    }

    if (analysis.status !== 'running') {
      throw new Error('Only running analyses can be completed');
    }

    return true;
  }

  /**
   * Gets analysis statistics for a project
   */
  async getProjectAnalysisStatistics(projectId) {
    const analyses = await this._analysisRepository.findByProjectId(projectId);
    
    const stats = {
      total: analyses.length,
      pending: 0,
      running: 0,
      completed: 0,
      failed: 0,
      byCategory: {},
      lastAnalysis: null,
      averageCompletionTime: 0
    };

    let totalCompletionTime = 0;
    let completedCount = 0;

    analyses.forEach(analysis => {
      stats[analysis.status]++;
      
      if (!stats.byCategory[analysis.category.value]) {
        stats.byCategory[analysis.category.value] = 0;
      }
      stats.byCategory[analysis.category.value]++;
      
      if (analysis.completedAt) {
        const completionTime = analysis.completedAt.getTime() - analysis.createdAt.getTime();
        totalCompletionTime += completionTime;
        completedCount++;
      }
      
      if (!stats.lastAnalysis || analysis.createdAt > stats.lastAnalysis) {
        stats.lastAnalysis = analysis.createdAt;
      }
    });

    stats.averageCompletionTime = completedCount > 0 ? totalCompletionTime / completedCount : 0;

    return stats;
  }

  /**
   * Validates analysis configuration
   */
  validateAnalysisConfiguration(config) {
    const errors = [];

    if (!config.category) {
      errors.push('Analysis category is required');
    } else {
      try {
        new AnalysisCategory(config.category);
      } catch (error) {
        errors.push(error.message);
      }
    }

    if (!config.projectId) {
      errors.push('Project ID is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Generates a unique analysis ID
   */
  generateAnalysisId() {
    return `analysis_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * Determines analysis priority based on category
   */
  getAnalysisPriority(category) {
    const priorityMap = {
      [AnalysisCategory.SECURITY.value]: 'high',
      [AnalysisCategory.PERFORMANCE.value]: 'medium',
      [AnalysisCategory.ARCHITECTURE.value]: 'medium',
      [AnalysisCategory.CODE_QUALITY.value]: 'medium',
      [AnalysisCategory.DEPENDENCIES.value]: 'low',
      [AnalysisCategory.MANIFEST.value]: 'low',
      [AnalysisCategory.TECH_STACK.value]: 'low'
    };

    return priorityMap[category.value] || 'medium';
  }

  /**
   * Estimates analysis duration based on category and project size
   */
  estimateAnalysisDuration(category, projectSize = 'medium') {
    const baseDurations = {
      [AnalysisCategory.SECURITY.value]: 120, // minutes
      [AnalysisCategory.PERFORMANCE.value]: 90,
      [AnalysisCategory.ARCHITECTURE.value]: 60,
      [AnalysisCategory.CODE_QUALITY.value]: 45,
      [AnalysisCategory.DEPENDENCIES.value]: 30,
      [AnalysisCategory.MANIFEST.value]: 15,
      [AnalysisCategory.TECH_STACK.value]: 20
    };

    const sizeMultipliers = {
      small: 0.5,
      medium: 1.0,
      large: 2.0,
      xlarge: 3.0
    };

    const baseDuration = baseDurations[category.value] || 60;
    const multiplier = sizeMultipliers[projectSize] || 1.0;

    return Math.round(baseDuration * multiplier);
  }

  /**
   * Determines if analysis should be run automatically
   */
  shouldRunAutomatically(category, projectMetadata = {}) {
    const autoRunCategories = [
      AnalysisCategory.SECURITY.value,
      AnalysisCategory.CODE_QUALITY.value,
      AnalysisCategory.DEPENDENCIES.value
    ];

    return autoRunCategories.includes(category.value) && 
           projectMetadata.autoAnalysis !== false;
  }

  /**
   * Gets recommended analysis categories for a project
   */
  getRecommendedCategories(projectMetadata = {}) {
    const recommendations = [];

    // Always recommend security and code quality
    recommendations.push(AnalysisCategory.SECURITY);
    recommendations.push(AnalysisCategory.CODE_QUALITY);

    // Add based on project type
    if (projectMetadata.framework) {
      recommendations.push(AnalysisCategory.TECH_STACK);
    }

    if (projectMetadata.hasTests) {
      recommendations.push(AnalysisCategory.PERFORMANCE);
    }

    if (projectMetadata.isLargeProject) {
      recommendations.push(AnalysisCategory.ARCHITECTURE);
    }

    return recommendations;
  }
}
