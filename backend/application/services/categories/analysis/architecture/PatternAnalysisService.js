/**
 * PatternAnalysisService - Application Layer
 * Specialized service for code patterns analysis orchestration
 */

const Logger = require('@logging/Logger');
const { PatternAnalysisStep } = require('@domain/steps/categories/analysis/architecture');

class PatternAnalysisService {
  constructor() {
    this.logger = new Logger('PatternAnalysisService');
    this.patternStep = new PatternAnalysisStep();
  }

  /**
   * Execute code patterns analysis
   * @param {Object} params - Analysis parameters
   * @param {string} params.projectId - Project identifier
   * @param {string} params.projectPath - Project file path
   * @param {Object} params.config - Pattern analysis configuration
   * @returns {Promise<Object>} Pattern analysis results
   */
  async executePatternAnalysis(params) {
    try {
      this.logger.info('Starting code patterns analysis', { projectId: params.projectId });

      const result = await this.patternStep.execute(params);

      this.logger.info('Pattern analysis completed', { 
        projectId: params.projectId,
        patternsDetected: result.patterns?.length || 0,
        issuesFound: result.issues?.length || 0
      });

      return result;

    } catch (error) {
      this.logger.error('Pattern analysis failed', { 
        projectId: params.projectId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get pattern analysis configuration
   * @returns {Object} Pattern analysis configuration
   */
  getConfiguration() {
    return {
      name: 'Code Patterns Analyzer',
      version: '1.0.0',
      description: 'Code patterns and design patterns analysis',
      metrics: ['design-patterns', 'anti-patterns', 'code-smells', 'best-practices'],
      severityLevels: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
    };
  }
}

module.exports = PatternAnalysisService; 