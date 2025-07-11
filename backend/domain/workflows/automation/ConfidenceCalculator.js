/**
 * ConfidenceCalculator - AI confidence calculation
 * Calculates confidence scores for task automation based on multiple factors
 */
class ConfidenceCalculator {
  constructor() {
    this.factors = {
      taskComplexity: 0.3,
      historicalSuccess: 0.25,
      codeQuality: 0.2,
      userExperience: 0.15,
      systemHealth: 0.1
    };
  }

  /**
   * Calculate confidence for task
   * @param {Object} task - Task to analyze
   * @param {Object} context - Execution context
   * @returns {Promise<number>} Confidence score (0-1)
   */
  async calculate(task, context) {
    const scores = {};

    // Calculate task complexity score
    scores.taskComplexity = await this.calculateTaskComplexity(task, context);
    
    // Calculate historical success score
    scores.historicalSuccess = await this.calculateHistoricalSuccess(task, context);
    
    // Calculate code quality score
    scores.codeQuality = await this.calculateCodeQuality(task, context);
    
    // Calculate user experience score
    scores.userExperience = await this.calculateUserExperience(task, context);
    
    // Calculate system health score
    scores.systemHealth = await this.calculateSystemHealth(task, context);

    // Weighted average
    let totalScore = 0;
    let totalWeight = 0;

    for (const [factor, weight] of Object.entries(this.factors)) {
      totalScore += scores[factor] * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }

  /**
   * Calculate task complexity score
   * @param {Object} task - Task to analyze
   * @param {Object} context - Execution context
   * @returns {Promise<number>} Complexity score (0-1)
   */
  async calculateTaskComplexity(task, context) {
    const complexityFactors = {
      fileCount: 0.3,
      codeLines: 0.2,
      dependencies: 0.2,
      taskType: 0.15,
      projectSize: 0.15
    };

    // Analyze task metadata
    const fileCount = task.metadata?.fileCount || 1;
    const codeLines = task.metadata?.codeLines || 100;
    const dependencies = task.metadata?.dependencies || 0;
    const projectSize = context.get('projectSize') || 'medium';

    // Normalize scores
    const fileScore = Math.min(fileCount / 10, 1);
    const lineScore = Math.min(codeLines / 1000, 1);
    const depScore = Math.min(dependencies / 20, 1);
    const projectScore = this.getProjectSizeScore(projectSize);
    const typeScore = this.getTaskTypeComplexityScore(task.type?.value || 'general');

    return (
      fileScore * complexityFactors.fileCount +
      lineScore * complexityFactors.codeLines +
      depScore * complexityFactors.dependencies +
      projectScore * complexityFactors.projectSize +
      typeScore * complexityFactors.taskType
    );
  }

  /**
   * Calculate historical success score
   * @param {Object} task - Task to analyze
   * @param {Object} context - Execution context
   * @returns {Promise<number>} Historical success score (0-1)
   */
  async calculateHistoricalSuccess(task, context) {
    const taskRepository = context.get('taskRepository');
    if (!taskRepository) {
      return 0.5; // Default score
    }

    try {
      // Get historical tasks of same type
      const historicalTasks = await taskRepository.findByType(task.type?.value || 'general', {
        limit: 50,
        status: 'completed'
      });

      if (historicalTasks.length === 0) {
        return 0.5; // Default score for new task types
      }

      // Calculate success rate
      const successfulTasks = historicalTasks.filter(t => 
        t.metadata?.result?.success === true
      );

      return successfulTasks.length / historicalTasks.length;
    } catch (error) {
      return 0.5; // Default score on error
    }
  }

  /**
   * Calculate code quality score
   * @param {Object} task - Task to analyze
   * @param {Object} context - Execution context
   * @returns {Promise<number>} Code quality score (0-1)
   */
  async calculateCodeQuality(task, context) {
    const analysisService = context.get('analysisService');
    if (!analysisService) {
      return 0.5; // Default score
    }

    try {
      const qualityMetrics = await analysisService.getCodeQualityMetrics(
        task.metadata?.projectPath,
        task.metadata?.filePath
      );

      return this.normalizeQualityMetrics(qualityMetrics);
    } catch (error) {
      return 0.5; // Default score on error
    }
  }

  /**
   * Calculate user experience score
   * @param {Object} task - Task to analyze
   * @param {Object} context - Execution context
   * @returns {Promise<number>} User experience score (0-1)
   */
  async calculateUserExperience(task, context) {
    const userId = context.get('userId');
    const userRepository = context.get('userRepository');
    
    if (!userId || !userRepository) {
      return 0.5; // Default score
    }

    try {
      const user = await userRepository.findById(userId);
      if (!user) {
        return 0.5;
      }

      // Consider user's experience level and preferences
      const experienceLevel = user.metadata?.experienceLevel || 'intermediate';
      const automationPreference = user.metadata?.automationPreference || 'balanced';

      return this.calculateUserExperienceScore(experienceLevel, automationPreference);
    } catch (error) {
      return 0.5; // Default score on error
    }
  }

  /**
   * Calculate system health score
   * @param {Object} task - Task to analyze
   * @param {Object} context - Execution context
   * @returns {Promise<number>} System health score (0-1)
   */
  async calculateSystemHealth(task, context) {
    const systemHealthService = context.get('systemHealthService');
    if (!systemHealthService) {
      return 0.8; // Default healthy score
    }

    try {
      const healthMetrics = await systemHealthService.getHealthMetrics();
      return this.normalizeHealthMetrics(healthMetrics);
    } catch (error) {
      return 0.8; // Default healthy score on error
    }
  }

  /**
   * Get project size score
   * @param {string} projectSize - Project size
   * @returns {number} Project size score (0-1)
   */
  getProjectSizeScore(projectSize) {
    const scores = {
      'small': 0.9,
      'medium': 0.7,
      'large': 0.5,
      'enterprise': 0.3
    };
    return scores[projectSize] || 0.7;
  }

  /**
   * Get task type complexity score
   * @param {string} taskType - Task type
   * @returns {number} Task type complexity score (0-1)
   */
  getTaskTypeComplexityScore(taskType) {
    const scores = {
      'refactor': 0.6,
      'analysis': 0.8,
      'testing': 0.7,
      'documentation': 0.9,
      'deployment': 0.4,
      'security': 0.5,
      'feature': 0.6,
      'bug': 0.5,
      'optimization': 0.7
    };
    return scores[taskType] || 0.7;
  }

  /**
   * Normalize quality metrics
   * @param {Object} metrics - Quality metrics
   * @returns {number} Normalized quality score (0-1)
   */
  normalizeQualityMetrics(metrics) {
    // Normalize various quality metrics to 0-1 scale
    const normalizedMetrics = {
      testCoverage: Math.min((metrics.testCoverage || 0) / 100, 1),
      codeComplexity: Math.max(1 - (metrics.complexity || 0) / 10, 0),
      maintainability: Math.min((metrics.maintainability || 0) / 100, 1),
      securityScore: Math.min((metrics.securityScore || 0) / 100, 1)
    };

    return Object.values(normalizedMetrics).reduce((sum, score) => sum + score, 0) / Object.keys(normalizedMetrics).length;
  }

  /**
   * Calculate user experience score
   * @param {string} experienceLevel - User experience level
   * @param {string} automationPreference - User automation preference
   * @returns {number} User experience score (0-1)
   */
  calculateUserExperienceScore(experienceLevel, automationPreference) {
    const experienceScores = {
      'beginner': 0.3,
      'intermediate': 0.6,
      'advanced': 0.9,
      'expert': 1.0
    };

    const preferenceScores = {
      'manual': 0.2,
      'assisted': 0.4,
      'balanced': 0.6,
      'automated': 0.8,
      'full_auto': 1.0
    };

    const experienceScore = experienceScores[experienceLevel] || 0.6;
    const preferenceScore = preferenceScores[automationPreference] || 0.6;

    return (experienceScore + preferenceScore) / 2;
  }

  /**
   * Normalize system health metrics
   * @param {Object} metrics - Health metrics
   * @returns {number} Normalized health score (0-1)
   */
  normalizeHealthMetrics(metrics) {
    // Normalize system health metrics to 0-1 scale
    const normalizedMetrics = {
      cpuUsage: Math.max(1 - (metrics.cpuUsage || 0) / 100, 0),
      memoryUsage: Math.max(1 - (metrics.memoryUsage || 0) / 100, 0),
      diskUsage: Math.max(1 - (metrics.diskUsage || 0) / 100, 0),
      networkLatency: Math.max(1 - (metrics.networkLatency || 0) / 1000, 0)
    };

    return Object.values(normalizedMetrics).reduce((sum, score) => sum + score, 0) / Object.keys(normalizedMetrics).length;
  }

  /**
   * Update factor weights
   * @param {Object} newFactors - New factor weights
   */
  updateFactors(newFactors) {
    this.factors = { ...this.factors, ...newFactors };
  }

  /**
   * Get current factor weights
   * @returns {Object} Current factor weights
   */
  getFactors() {
    return { ...this.factors };
  }
}

module.exports = ConfidenceCalculator; 