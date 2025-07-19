
/**
 * Analysis Step - Analysis Workflow Orchestrator
 * Orchestrates individual analysis steps for comprehensive project analysis
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('analysis_step');

// Step configuration
const config = {
  name: 'AnalysisStep',
  type: 'analysis',
  description: 'Comprehensive project analysis orchestrator using modular steps',
  category: 'analysis',
  version: '2.0.0',
  dependencies: ['stepRegistry'],
  settings: {
    timeout: 120000,
    parallel: true,
    includeCodeQuality: true,
    includeArchitecture: true,
    includeTechStack: true,
    includeDependencies: true,
    includeRepoStructure: true,
    includeSecurity: true,
    includePerformance: true,
    includeManifest: true
  },
  validation: {
    requiredFiles: ['package.json'],
    supportedProjects: ['nodejs', 'react', 'vue', 'angular', 'express', 'nest']
  }
};

class AnalysisStep {
  constructor() {
    this.name = 'AnalysisStep';
    this.description = 'Comprehensive project analysis orchestrator using modular steps';
    this.category = 'analysis';
    this.dependencies = ['stepRegistry'];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = AnalysisStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`🔍 Executing ${this.name} (Orchestrator)...`);
      
      // Validate context
      this.validateContext(context);
      
      // Get step registry from application
      const application = global.application;
      if (!application) {
        throw new Error('Application not available');
      }

      const { stepRegistry } = application;
      if (!stepRegistry) {
        throw new Error('Step registry not available');
      }

      const projectPath = context.projectPath;
      const results = {
        projectAnalysis: null,
        architectureAnalysis: null,
        codeQualityAnalysis: null,
        techStackAnalysis: null,
        manifestAnalysis: null,
        securityAnalysis: null,
        performanceAnalysis: null,
        dependencyAnalysis: null,
        summary: null
      };

      logger.info(`📊 Starting comprehensive analysis orchestration for: ${projectPath}`);

      // Define analysis steps to execute
      const analysisSteps = this.getAnalysisStepsToExecute(context);
      
      logger.info(`🎯 Will execute ${analysisSteps.length} analysis steps:`, 
        analysisSteps.map(step => step.name));

      // Execute analysis steps
      for (const stepConfig of analysisSteps) {
        try {
          logger.info(`🔄 Executing ${stepConfig.name}...`);
          
          const stepResult = await stepRegistry.executeStep(stepConfig.name, {
            ...context,
            ...stepConfig.options
          });
          
          if (stepResult.success) {
            results[stepConfig.resultKey] = stepResult.result;
            logger.info(`✅ ${stepConfig.name} completed successfully`);
          } else {
            logger.warn(`⚠️ ${stepConfig.name} failed: ${stepResult.error}`);
            results[stepConfig.resultKey] = { error: stepResult.error, status: 'failed' };
          }
        } catch (error) {
          logger.error(`❌ ${stepConfig.name} failed: ${error.message}`);
          results[stepConfig.resultKey] = { error: error.message, status: 'failed' };
        }
      }

      // Generate comprehensive summary
      results.summary = this.generateSummary(results);

      logger.info(`✅ Comprehensive analysis orchestration completed successfully`);

      return {
        success: true,
        result: results,
        metadata: {
          stepName: this.name,
          projectPath,
          analysisType: 'comprehensive',
          stepsExecuted: analysisSteps.length,
          timestamp: new Date()
        }
      };

    } catch (error) {
      logger.error(`❌ Analysis orchestration failed: ${error.message}`);
      
      return {
        success: false,
        error: error.message,
        metadata: {
          stepName: this.name,
          projectPath: context.projectPath,
          analysisType: 'comprehensive',
          timestamp: new Date()
        }
      };
    }
  }

  getAnalysisStepsToExecute(context) {
    const steps = [];

    // Always include project analysis
    steps.push({
      name: 'ProjectAnalysisStep',
      resultKey: 'projectAnalysis',
      options: {
        includeRepoStructure: context.includeRepoStructure !== false,
        includeDependencies: context.includeDependencies !== false
      }
    });

    // Conditional steps based on context
    if (context.includeArchitecture !== false) {
      steps.push({
        name: 'ArchitectureAnalysisStep',
        resultKey: 'architectureAnalysis',
        options: {
          includePatterns: true,
          includeStructure: true,
          includeRecommendations: true
        }
      });
    }

    if (context.includeCodeQuality !== false) {
      steps.push({
        name: 'CodeQualityAnalysisStep',
        resultKey: 'codeQualityAnalysis',
        options: {
          includeMetrics: true,
          includeIssues: true,
          includeSuggestions: true
        }
      });
    }

    if (context.includeTechStack !== false) {
      steps.push({
        name: 'TechStackAnalysisStep',
        resultKey: 'techStackAnalysis',
        options: {
          includeFrameworks: true,
          includeLibraries: true,
          includeTools: true
        }
      });
    }

    if (context.includeManifest !== false) {
      steps.push({
        name: 'ManifestAnalysisStep',
        resultKey: 'manifestAnalysis',
        options: {
          includePackageJson: true,
          includeConfigFiles: true,
          includeDockerFiles: true,
          includeCIFiles: true
        }
      });
    }

    if (context.includeSecurity !== false) {
      steps.push({
        name: 'SecurityAnalysisStep',
        resultKey: 'securityAnalysis',
        options: {
          includeVulnerabilities: true,
          includeBestPractices: true,
          includeDependencies: true
        }
      });
    }

    if (context.includePerformance !== false) {
      steps.push({
        name: 'PerformanceAnalysisStep',
        resultKey: 'performanceAnalysis',
        options: {
          includeMetrics: true,
          includeOptimizations: true,
          includeBottlenecks: true
        }
      });
    }

    if (context.includeDependencies !== false) {
      steps.push({
        name: 'DependencyAnalysisStep',
        resultKey: 'dependencyAnalysis',
        options: {
          includeOutdated: true,
          includeVulnerabilities: true,
          includeRecommendations: true
        }
      });
    }

    return steps;
  }

  generateSummary(results) {
    const summary = {
      totalSteps: 8,
      completedSteps: 0,
      failedSteps: 0,
      analysisTypes: [],
      projectType: 'unknown',
      frameworks: [],
      buildTools: [],
      packageManager: 'unknown',
      securityIssues: 0,
      performanceIssues: 0,
      codeQualityIssues: 0,
      outdatedDependencies: 0,
      vulnerabilities: 0
    };

    // Count completed and failed steps
    Object.entries(results).forEach(([key, result]) => {
      if (key === 'summary') return;
      
      if (result && !result.error) {
        summary.completedSteps++;
        summary.analysisTypes.push(key.replace('Analysis', ''));
      } else if (result && result.error) {
        summary.failedSteps++;
      }
    });

    // Extract information from results
    if (results.manifestAnalysis && results.manifestAnalysis.summary) {
      const manifest = results.manifestAnalysis.summary;
      summary.projectType = manifest.projectType || 'unknown';
      summary.frameworks = manifest.frameworks || [];
      summary.buildTools = manifest.buildTools || [];
      summary.packageManager = manifest.packageManager || 'unknown';
    }

    if (results.securityAnalysis && results.securityAnalysis.vulnerabilities) {
      summary.securityIssues = results.securityAnalysis.vulnerabilities.length || 0;
    }

    if (results.performanceAnalysis && results.performanceAnalysis.issues) {
      summary.performanceIssues = results.performanceAnalysis.issues.length || 0;
    }

    if (results.codeQualityAnalysis && results.codeQualityAnalysis.issues) {
      summary.codeQualityIssues = results.codeQualityAnalysis.issues.length || 0;
    }

    if (results.dependencyAnalysis && results.dependencyAnalysis.outdated) {
      summary.outdatedDependencies = results.dependencyAnalysis.outdated.length || 0;
    }

    if (results.dependencyAnalysis && results.dependencyAnalysis.vulnerabilities) {
      summary.vulnerabilities = results.dependencyAnalysis.vulnerabilities.length || 0;
    }

    return summary;
  }

  validateContext(context) {
    if (!context.projectPath) {
      throw new Error('Project path is required for analysis');
    }
  }
}

module.exports = AnalysisStep; 