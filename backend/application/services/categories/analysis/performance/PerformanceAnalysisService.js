/**
 * PerformanceAnalysisService - Application Layer
 * Orchestrates all performance analysis steps and coordinates results
 */

const Logger = require('@logging/Logger');
const { 
  MemoryAnalysisStep, 
  CpuAnalysisStep, 
  NetworkAnalysisStep, 
  DatabaseAnalysisStep 
} = require('@domain/steps/categories/analysis/performance');

class PerformanceAnalysisService {
  constructor() {
    this.logger = new Logger('PerformanceAnalysisService');
    this.memoryStep = new MemoryAnalysisStep();
    this.cpuStep = new CpuAnalysisStep();
    this.networkStep = new NetworkAnalysisStep();
    this.databaseStep = new DatabaseAnalysisStep();
  }

  /**
   * Execute comprehensive performance analysis
   * @param {Object} params - Analysis parameters
   * @param {string} params.projectId - Project identifier
   * @param {string} params.projectPath - Project file path
   * @param {Object} params.config - Analysis configuration
   * @returns {Promise<Object>} Combined performance analysis results
   */
  async executePerformanceAnalysis(params) {
    try {
      this.logger.info('Starting comprehensive performance analysis', { projectId: params.projectId });

      // Execute all performance analysis steps in parallel
      const [
        memoryResults,
        cpuResults,
        networkResults,
        databaseResults
      ] = await Promise.allSettled([
        this.memoryStep.execute(params),
        this.cpuStep.execute(params),
        this.networkStep.execute(params),
        this.databaseStep.execute(params)
      ]);

      // Process results and handle failures
      const results = {
        memory: this.processResult(memoryResults, 'Memory'),
        cpu: this.processResult(cpuResults, 'CPU'),
        network: this.processResult(networkResults, 'Network'),
        database: this.processResult(databaseResults, 'Database')
      };

      // Calculate overall performance score
      const performanceScore = this.calculatePerformanceScore(results);

      // Generate performance recommendations
      const recommendations = this.generatePerformanceRecommendations(results);

      const analysisResult = {
        projectId: params.projectId,
        timestamp: new Date().toISOString(),
        performanceScore,
        results,
        recommendations,
        summary: this.generatePerformanceSummary(results)
      };

      this.logger.info('Performance analysis completed', { 
        projectId: params.projectId, 
        performanceScore 
      });

      return analysisResult;

    } catch (error) {
      this.logger.error('Performance analysis failed', { 
        projectId: params.projectId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Process individual step results
   * @param {PromiseSettledResult} result - Promise result
   * @param {string} stepName - Name of the step
   * @returns {Object} Processed result
   */
  processResult(result, stepName) {
    if (result.status === 'fulfilled') {
      return {
        success: true,
        data: result.value,
        error: null
      };
    } else {
      this.logger.warn(`${stepName} analysis failed`, { error: result.reason.message });
      return {
        success: false,
        data: null,
        error: result.reason.message
      };
    }
  }

  /**
   * Calculate overall performance score
   * @param {Object} results - All performance analysis results
   * @returns {number} Performance score (0-100)
   */
  calculatePerformanceScore(results) {
    const weights = {
      memory: 0.30,
      cpu: 0.30,
      network: 0.20,
      database: 0.20
    };

    let totalScore = 0;
    let totalWeight = 0;

    Object.entries(results).forEach(([key, result]) => {
      if (result.success && result.data && result.data.score !== undefined) {
        totalScore += result.data.score * weights[key];
        totalWeight += weights[key];
      }
    });

    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  }

  /**
   * Generate performance recommendations
   * @param {Object} results - All performance analysis results
   * @returns {Array} List of performance recommendations
   */
  generatePerformanceRecommendations(results) {
    const recommendations = [];

    // Memory recommendations
    if (results.memory.success && results.memory.data.issues) {
      const memoryIssues = results.memory.data.issues.filter(i => i.severity === 'HIGH');
      if (memoryIssues.length > 0) {
        recommendations.push({
          priority: 'HIGH',
          category: 'Memory',
          message: `Found ${memoryIssues.length} high-severity memory performance issues.`,
          details: memoryIssues.map(i => i.description)
        });
      }
    }

    // CPU recommendations
    if (results.cpu.success && results.cpu.data.issues) {
      const cpuIssues = results.cpu.data.issues.filter(i => i.severity === 'HIGH');
      if (cpuIssues.length > 0) {
        recommendations.push({
          priority: 'HIGH',
          category: 'CPU',
          message: `Found ${cpuIssues.length} high-severity CPU performance issues.`,
          details: cpuIssues.map(i => i.description)
        });
      }
    }

    // Network recommendations
    if (results.network.success && results.network.data.issues) {
      const networkIssues = results.network.data.issues.filter(i => i.severity === 'HIGH');
      if (networkIssues.length > 0) {
        recommendations.push({
          priority: 'HIGH',
          category: 'Network',
          message: `Found ${networkIssues.length} high-severity network performance issues.`,
          details: networkIssues.map(i => i.description)
        });
      }
    }

    // Database recommendations
    if (results.database.success && results.database.data.issues) {
      const databaseIssues = results.database.data.issues.filter(i => i.severity === 'HIGH');
      if (databaseIssues.length > 0) {
        recommendations.push({
          priority: 'HIGH',
          category: 'Database',
          message: `Found ${databaseIssues.length} high-severity database performance issues.`,
          details: databaseIssues.map(i => i.description)
        });
      }
    }

    return recommendations;
  }

  /**
   * Generate performance summary
   * @param {Object} results - All performance analysis results
   * @returns {Object} Performance summary
   */
  generatePerformanceSummary(results) {
    const summary = {
      totalIssues: 0,
      criticalIssues: 0,
      highIssues: 0,
      mediumIssues: 0,
      lowIssues: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      networkLatency: 0,
      databaseQueries: 0
    };

    // Aggregate performance metrics
    Object.values(results).forEach(result => {
      if (result.success && result.data) {
        if (result.data.issues) {
          summary.totalIssues += result.data.issues.length;
          result.data.issues.forEach(i => {
            summary[`${i.severity.toLowerCase()}Issues`]++;
          });
        }
        if (result.data.metrics) {
          if (result.data.metrics.memoryUsage) summary.memoryUsage = result.data.metrics.memoryUsage;
          if (result.data.metrics.cpuUsage) summary.cpuUsage = result.data.metrics.cpuUsage;
          if (result.data.metrics.networkLatency) summary.networkLatency = result.data.metrics.networkLatency;
          if (result.data.metrics.databaseQueries) summary.databaseQueries = result.data.metrics.databaseQueries;
        }
      }
    });

    return summary;
  }

  /**
   * Execute specific performance analysis step
   * @param {string} stepType - Type of performance analysis
   * @param {Object} params - Analysis parameters
   * @returns {Promise<Object>} Step-specific results
   */
  async executeSpecificStep(stepType, params) {
    const stepMap = {
      memory: this.memoryStep,
      cpu: this.cpuStep,
      network: this.networkStep,
      database: this.databaseStep
    };

    const step = stepMap[stepType];
    if (!step) {
      throw new Error(`Unknown performance step type: ${stepType}`);
    }

    return await step.execute(params);
  }
}

module.exports = PerformanceAnalysisService; 