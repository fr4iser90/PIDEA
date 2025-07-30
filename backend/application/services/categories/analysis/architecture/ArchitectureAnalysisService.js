/**
 * ArchitectureAnalysisService - Application Layer
 * Orchestrates all architecture analysis steps and coordinates results
 */

const Logger = require('@logging/Logger');
const { 
  StructureAnalysisStep, 
  PatternAnalysisStep, 
  CouplingAnalysisStep, 
  LayerAnalysisStep 
} = require('@domain/steps/categories/analysis/architecture');

class ArchitectureAnalysisService {
  constructor() {
    this.logger = new Logger('ArchitectureAnalysisService');
    this.structureStep = new StructureAnalysisStep();
    this.patternStep = new PatternAnalysisStep();
    this.couplingStep = new CouplingAnalysisStep();
    this.layerStep = new LayerAnalysisStep();
  }

  /**
   * Execute comprehensive architecture analysis
   * @param {Object} params - Analysis parameters
   * @param {string} params.projectId - Project identifier
   * @param {string} params.projectPath - Project file path
   * @param {Object} params.config - Analysis configuration
   * @returns {Promise<Object>} Combined architecture analysis results
   */
  async executeArchitectureAnalysis(params) {
    try {
      this.logger.info('Starting comprehensive architecture analysis', { projectId: params.projectId });

      // Execute all architecture analysis steps in parallel
      const [
        structureResults,
        patternResults,
        couplingResults,
        layerResults
      ] = await Promise.allSettled([
        this.structureStep.execute(params),
        this.patternStep.execute(params),
        this.couplingStep.execute(params),
        this.layerStep.execute(params)
      ]);

      // Process results and handle failures
      const results = {
        structure: this.processResult(structureResults, 'Structure'),
        patterns: this.processResult(patternResults, 'Patterns'),
        coupling: this.processResult(couplingResults, 'Coupling'),
        layers: this.processResult(layerResults, 'Layers')
      };

      // Calculate overall architecture score
      const architectureScore = this.calculateArchitectureScore(results);

      // Generate architecture recommendations
      const recommendations = this.generateArchitectureRecommendations(results);

      const analysisResult = {
        projectId: params.projectId,
        timestamp: new Date().toISOString(),
        architectureScore,
        results,
        recommendations,
        summary: this.generateArchitectureSummary(results)
      };

      this.logger.info('Architecture analysis completed', { 
        projectId: params.projectId, 
        architectureScore 
      });

      return analysisResult;

    } catch (error) {
      this.logger.error('Architecture analysis failed', { 
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
   * Calculate overall architecture score
   * @param {Object} results - All architecture analysis results
   * @returns {number} Architecture score (0-100)
   */
  calculateArchitectureScore(results) {
    const weights = {
      structure: 0.25,
      patterns: 0.25,
      coupling: 0.25,
      layers: 0.25
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
   * Generate architecture recommendations
   * @param {Object} results - All architecture analysis results
   * @returns {Array} List of architecture recommendations
   */
  generateArchitectureRecommendations(results) {
    const recommendations = [];

    // Structure recommendations
    if (results.structure.success && results.structure.data.issues) {
      const structureIssues = results.structure.data.issues.filter(i => i.severity === 'HIGH');
      if (structureIssues.length > 0) {
        recommendations.push({
          priority: 'HIGH',
          category: 'Structure',
          message: `Found ${structureIssues.length} high-severity structural issues.`,
          details: structureIssues.map(i => i.description)
        });
      }
    }

    // Pattern recommendations
    if (results.patterns.success && results.patterns.data.issues) {
      const patternIssues = results.patterns.data.issues.filter(i => i.severity === 'HIGH');
      if (patternIssues.length > 0) {
        recommendations.push({
          priority: 'HIGH',
          category: 'Patterns',
          message: `Found ${patternIssues.length} high-severity pattern issues.`,
          details: patternIssues.map(i => i.description)
        });
      }
    }

    // Coupling recommendations
    if (results.coupling.success && results.coupling.data.issues) {
      const couplingIssues = results.coupling.data.issues.filter(i => i.severity === 'HIGH');
      if (couplingIssues.length > 0) {
        recommendations.push({
          priority: 'HIGH',
          category: 'Coupling',
          message: `Found ${couplingIssues.length} high-severity coupling issues.`,
          details: couplingIssues.map(i => i.description)
        });
      }
    }

    // Layer recommendations
    if (results.layers.success && results.layers.data.issues) {
      const layerIssues = results.layers.data.issues.filter(i => i.severity === 'HIGH');
      if (layerIssues.length > 0) {
        recommendations.push({
          priority: 'HIGH',
          category: 'Layers',
          message: `Found ${layerIssues.length} high-severity layer organization issues.`,
          details: layerIssues.map(i => i.description)
        });
      }
    }

    return recommendations;
  }

  /**
   * Generate architecture summary
   * @param {Object} results - All architecture analysis results
   * @returns {Object} Architecture summary
   */
  generateArchitectureSummary(results) {
    const summary = {
      totalIssues: 0,
      criticalIssues: 0,
      highIssues: 0,
      mediumIssues: 0,
      lowIssues: 0,
      patternsDetected: 0,
      couplingScore: 0,
      layerViolations: 0
    };

    // Aggregate architecture metrics
    Object.values(results).forEach(result => {
      if (result.success && result.data) {
        if (result.data.issues) {
          summary.totalIssues += result.data.issues.length;
          result.data.issues.forEach(i => {
            summary[`${i.severity.toLowerCase()}Issues`]++;
          });
        }
        if (result.data.patterns) {
          summary.patternsDetected += result.data.patterns.length;
        }
        if (result.data.couplingScore !== undefined) {
          summary.couplingScore = result.data.couplingScore;
        }
        if (result.data.layerViolations) {
          summary.layerViolations += result.data.layerViolations.length;
        }
      }
    });

    return summary;
  }

  /**
   * Execute specific architecture analysis step
   * @param {string} stepType - Type of architecture analysis
   * @param {Object} params - Analysis parameters
   * @returns {Promise<Object>} Step-specific results
   */
  async executeSpecificStep(stepType, params) {
    const stepMap = {
      structure: this.structureStep,
      patterns: this.patternStep,
      coupling: this.couplingStep,
      layers: this.layerStep
    };

    const step = stepMap[stepType];
    if (!step) {
      throw new Error(`Unknown architecture step type: ${stepType}`);
    }

    return await step.execute(params);
  }
}

module.exports = ArchitectureAnalysisService; 