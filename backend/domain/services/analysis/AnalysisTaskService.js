/**
 * AnalysisTaskService - Unified Task Creation for Analysis Results
 * 
 * This service provides a unified way to create tasks from analysis results
 * following the project's task management standards and database structure.
 */

const Logger = require('@logging/Logger');
const { v4: uuidv4 } = require('uuid');

class AnalysisTaskService {
  constructor(taskRepository = null, logger = null) {
    this.taskRepository = taskRepository;
    this.logger = logger || new Logger('AnalysisTaskService');
  }

  /**
   * Create tasks from analysis results using unified structure
   * @param {Object} analysisResult - Analysis result object
   * @param {Object} context - Execution context
   * @param {string} analysisType - Type of analysis (e.g., 'SecurityAnalysisOrchestrator')
   * @returns {Promise<Array>} Array of created tasks
   */
  async createTasksFromAnalysis(analysisResult, context, analysisType) {
    try {
      this.logger.info(`Creating tasks from ${analysisType} analysis results`);
      
      const tasks = [];
      const projectId = context.projectId || 'default-project';
      const timestamp = new Date().toISOString();
      
      // Extract data from analysis result
      const issues = analysisResult.issues || [];
      const recommendations = analysisResult.recommendations || [];
      const score = analysisResult.score || analysisResult.overallScore || 0;
      
      // Create main improvement task
      const mainTask = await this.createMainImprovementTask(
        analysisType, 
        projectId, 
        issues, 
        recommendations, 
        score, 
        timestamp
      );
      tasks.push(mainTask);
      
      // Create priority-based subtasks
      const priorityTasks = await this.createPriorityTasks(
        mainTask.id,
        analysisType,
        projectId,
        issues,
        recommendations,
        timestamp
      );
      tasks.push(...priorityTasks);
      
      // Create recommendation tasks
      const recommendationTasks = await this.createRecommendationTasks(
        mainTask.id,
        analysisType,
        projectId,
        recommendations,
        timestamp
      );
      tasks.push(...recommendationTasks);
      
      // Save tasks to database if repository is available
      if (this.taskRepository) {
        for (const task of tasks) {
          try {
            await this.taskRepository.create(task);
            this.logger.info(`✅ Task created: ${task.title}`);
          } catch (error) {
            this.logger.error(`❌ Failed to create task: ${task.title}`, error);
          }
        }
      }
      
      this.logger.info(`✅ Created ${tasks.length} tasks from ${analysisType} analysis`);
      return tasks;
      
    } catch (error) {
      this.logger.error(`❌ Failed to create tasks from analysis:`, error);
      return [];
    }
  }

  /**
   * Create main improvement task
   * @param {string} analysisType - Analysis type
   * @param {string} projectId - Project ID
   * @param {Array} issues - Issues array
   * @param {Array} recommendations - Recommendations array
   * @param {number} score - Analysis score
   * @param {string} timestamp - Timestamp
   * @returns {Object} Main task object
   */
  async createMainImprovementTask(analysisType, projectId, issues, recommendations, score, timestamp) {
    const category = this.mapAnalysisTypeToCategory(analysisType);
    const estimatedHours = this.calculateEstimatedHours(issues, recommendations);
    
    return {
      id: uuidv4(),
      projectId: projectId,
      title: `Improve ${this.getAnalysisDisplayName(analysisType)} Results`,
      description: this.generateMainTaskDescription(analysisType, issues, recommendations, score),
      type: 'improvement',
      category: category,
      priority: this.determinePriority(score, issues),
      status: 'pending',
      sourceType: 'analysis_result',
      sourcePath: `analysis/${analysisType.toLowerCase()}`,
      sourceContent: JSON.stringify({ analysisType, score, issuesCount: issues.length, recommendationsCount: recommendations.length }),
      metadata: {
        analysisType: analysisType,
        analysisScore: score,
        issuesCount: issues.length,
        recommendationsCount: recommendations.length,
        criticalIssues: issues.filter(issue => issue.severity === 'critical').length,
        highIssues: issues.filter(issue => issue.severity === 'high').length,
        mediumIssues: issues.filter(issue => issue.severity === 'medium').length,
        lowIssues: issues.filter(issue => issue.severity === 'low').length,
        estimatedHours: estimatedHours,
        createdAt: timestamp,
        automationLevel: 'semi_auto',
        confirmationRequired: true,
        maxAttempts: 3,
        gitBranchRequired: true,
        newChatRequired: true
      },
      estimatedHours: estimatedHours,
      createdAt: timestamp,
      updatedAt: timestamp
    };
  }

  /**
   * Create priority-based subtasks
   * @param {string} parentTaskId - Parent task ID
   * @param {string} analysisType - Analysis type
   * @param {string} projectId - Project ID
   * @param {Array} issues - Issues array
   * @param {Array} recommendations - Recommendations array
   * @param {string} timestamp - Timestamp
   * @returns {Array} Priority tasks array
   */
  async createPriorityTasks(parentTaskId, analysisType, projectId, issues, recommendations, timestamp) {
    const tasks = [];
    const category = this.mapAnalysisTypeToCategory(analysisType);
    
    // Critical issues task
    const criticalIssues = issues.filter(issue => issue.severity === 'critical');
    if (criticalIssues.length > 0) {
      tasks.push({
        id: uuidv4(),
        projectId: projectId,
        parentTaskId: parentTaskId,
        title: `Fix Critical Issues from ${this.getAnalysisDisplayName(analysisType)}`,
        description: `Address ${criticalIssues.length} critical issues identified in ${analysisType} analysis`,
        type: 'fix',
        category: category,
        priority: 'critical',
        status: 'pending',
        sourceType: 'analysis_result',
        sourcePath: `analysis/${analysisType.toLowerCase()}/critical-issues`,
        metadata: {
          analysisType: analysisType,
          issues: criticalIssues,
          issuesCount: criticalIssues.length,
          estimatedHours: 4,
          automationLevel: 'semi_auto',
          confirmationRequired: true
        },
        estimatedHours: 4,
        createdAt: timestamp,
        updatedAt: timestamp
      });
    }
    
    // High priority issues task
    const highIssues = issues.filter(issue => issue.severity === 'high');
    if (highIssues.length > 0) {
      tasks.push({
        id: uuidv4(),
        projectId: projectId,
        parentTaskId: parentTaskId,
        title: `Fix High Priority Issues from ${this.getAnalysisDisplayName(analysisType)}`,
        description: `Address ${highIssues.length} high priority issues identified in ${analysisType} analysis`,
        type: 'fix',
        category: category,
        priority: 'high',
        status: 'pending',
        sourceType: 'analysis_result',
        sourcePath: `analysis/${analysisType.toLowerCase()}/high-issues`,
        metadata: {
          analysisType: analysisType,
          issues: highIssues,
          issuesCount: highIssues.length,
          estimatedHours: 2,
          automationLevel: 'semi_auto',
          confirmationRequired: true
        },
        estimatedHours: 2,
        createdAt: timestamp,
        updatedAt: timestamp
      });
    }
    
    return tasks;
  }

  /**
   * Create recommendation tasks
   * @param {string} parentTaskId - Parent task ID
   * @param {string} analysisType - Analysis type
   * @param {string} projectId - Project ID
   * @param {Array} recommendations - Recommendations array
   * @param {string} timestamp - Timestamp
   * @returns {Array} Recommendation tasks array
   */
  async createRecommendationTasks(parentTaskId, analysisType, projectId, recommendations, timestamp) {
    const tasks = [];
    const category = this.mapAnalysisTypeToCategory(analysisType);
    
    // Group recommendations by priority
    const highPriorityRecommendations = recommendations.filter(rec => rec.priority === 'high');
    const mediumPriorityRecommendations = recommendations.filter(rec => rec.priority === 'medium');
    
    if (highPriorityRecommendations.length > 0) {
      tasks.push({
        id: uuidv4(),
        projectId: projectId,
        parentTaskId: parentTaskId,
        title: `Implement High Priority Recommendations from ${this.getAnalysisDisplayName(analysisType)}`,
        description: `Implement ${highPriorityRecommendations.length} high priority recommendations`,
        type: 'enhancement',
        category: category,
        priority: 'high',
        status: 'pending',
        sourceType: 'analysis_result',
        sourcePath: `analysis/${analysisType.toLowerCase()}/high-recommendations`,
        metadata: {
          analysisType: analysisType,
          recommendations: highPriorityRecommendations,
          recommendationsCount: highPriorityRecommendations.length,
          estimatedHours: 3,
          automationLevel: 'semi_auto',
          confirmationRequired: true
        },
        estimatedHours: 3,
        createdAt: timestamp,
        updatedAt: timestamp
      });
    }
    
    if (mediumPriorityRecommendations.length > 0) {
      tasks.push({
        id: uuidv4(),
        projectId: projectId,
        parentTaskId: parentTaskId,
        title: `Implement Medium Priority Recommendations from ${this.getAnalysisDisplayName(analysisType)}`,
        description: `Implement ${mediumPriorityRecommendations.length} medium priority recommendations`,
        type: 'enhancement',
        category: category,
        priority: 'medium',
        status: 'pending',
        sourceType: 'analysis_result',
        sourcePath: `analysis/${analysisType.toLowerCase()}/medium-recommendations`,
        metadata: {
          analysisType: analysisType,
          recommendations: mediumPriorityRecommendations,
          recommendationsCount: mediumPriorityRecommendations.length,
          estimatedHours: 2,
          automationLevel: 'semi_auto',
          confirmationRequired: true
        },
        estimatedHours: 2,
        createdAt: timestamp,
        updatedAt: timestamp
      });
    }
    
    return tasks;
  }

  /**
   * Map analysis type to category
   * @param {string} analysisType - Analysis type
   * @returns {string} Category
   */
  mapAnalysisTypeToCategory(analysisType) {
    const mapping = {
      'SecurityAnalysisOrchestrator': 'security',
      'CodeQualityAnalysisOrchestrator': 'backend',
      'ArchitectureAnalysisOrchestrator': 'backend',
      'PerformanceAnalysisOrchestrator': 'performance',
      'TechStackAnalysisOrchestrator': 'backend',
      'DependencyAnalysisOrchestrator': 'backend',
      'ManifestAnalysisOrchestrator': 'backend'
    };
    
    return mapping[analysisType] || 'backend';
  }

  /**
   * Get display name for analysis type
   * @param {string} analysisType - Analysis type
   * @returns {string} Display name
   */
  getAnalysisDisplayName(analysisType) {
    const mapping = {
      'SecurityAnalysisOrchestrator': 'Security Analysis',
      'CodeQualityAnalysisOrchestrator': 'Code Quality Analysis',
      'ArchitectureAnalysisOrchestrator': 'Architecture Analysis',
      'PerformanceAnalysisOrchestrator': 'Performance Analysis',
      'TechStackAnalysisOrchestrator': 'Tech Stack Analysis',
      'DependencyAnalysisOrchestrator': 'Dependency Analysis',
      'ManifestAnalysisOrchestrator': 'Manifest Analysis'
    };
    
    return mapping[analysisType] || analysisType;
  }

  /**
   * Generate main task description
   * @param {string} analysisType - Analysis type
   * @param {Array} issues - Issues array
   * @param {Array} recommendations - Recommendations array
   * @param {number} score - Analysis score
   * @returns {string} Description
   */
  generateMainTaskDescription(analysisType, issues, recommendations, score) {
    const displayName = this.getAnalysisDisplayName(analysisType);
    const criticalCount = issues.filter(issue => issue.severity === 'critical').length;
    const highCount = issues.filter(issue => issue.severity === 'high').length;
    
    let description = `Address issues and implement recommendations from ${displayName}.\n\n`;
    description += `**Analysis Score:** ${score}/100\n`;
    description += `**Issues Found:** ${issues.length} total (${criticalCount} critical, ${highCount} high priority)\n`;
    description += `**Recommendations:** ${recommendations.length} total\n\n`;
    
    if (criticalCount > 0) {
      description += `**Critical Issues:** ${criticalCount} issues require immediate attention.\n`;
    }
    
    if (highCount > 0) {
      description += `**High Priority Issues:** ${highCount} issues should be addressed soon.\n`;
    }
    
    description += `\n**Next Steps:**\n`;
    description += `1. Review critical issues and fix immediately\n`;
    description += `2. Address high priority issues\n`;
    description += `3. Implement high priority recommendations\n`;
    description += `4. Consider medium priority improvements\n`;
    
    return description;
  }

  /**
   * Determine priority based on score and issues
   * @param {number} score - Analysis score
   * @param {Array} issues - Issues array
   * @returns {string} Priority
   */
  determinePriority(score, issues) {
    const criticalCount = issues.filter(issue => issue.severity === 'critical').length;
    const highCount = issues.filter(issue => issue.severity === 'high').length;
    
    if (criticalCount > 0 || score < 30) {
      return 'critical';
    } else if (highCount > 0 || score < 60) {
      return 'high';
    } else if (score < 80) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Calculate estimated hours based on issues and recommendations
   * @param {Array} issues - Issues array
   * @param {Array} recommendations - Recommendations array
   * @returns {number} Estimated hours
   */
  calculateEstimatedHours(issues, recommendations) {
    let hours = 0;
    
    // Base hours for review and planning
    hours += 1;
    
    // Hours based on issues
    const criticalCount = issues.filter(issue => issue.severity === 'critical').length;
    const highCount = issues.filter(issue => issue.severity === 'high').length;
    const mediumCount = issues.filter(issue => issue.severity === 'medium').length;
    
    hours += criticalCount * 2; // 2 hours per critical issue
    hours += highCount * 1; // 1 hour per high issue
    hours += mediumCount * 0.5; // 30 minutes per medium issue
    
    // Hours based on recommendations
    const highRecCount = recommendations.filter(rec => rec.priority === 'high').length;
    const mediumRecCount = recommendations.filter(rec => rec.priority === 'medium').length;
    
    hours += highRecCount * 1.5; // 1.5 hours per high priority recommendation
    hours += mediumRecCount * 1; // 1 hour per medium priority recommendation
    
    return Math.max(1, Math.round(hours)); // Minimum 1 hour
  }
}

module.exports = AnalysisTaskService;
