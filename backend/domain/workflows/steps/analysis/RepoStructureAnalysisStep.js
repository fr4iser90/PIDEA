/**
 * RepoStructureAnalysisStep - Repository structure analysis workflow step
 * 
 * This step performs repository structure analysis on codebases, including file organization,
 * directory structure analysis, and project layout assessment.
 */
const BaseWorkflowStep = require('../BaseWorkflowStep');
const ValidationResult = require('../../validation/ValidationResult');

/**
 * Repository structure analysis workflow step
 */
class RepoStructureAnalysisStep extends BaseWorkflowStep {
  /**
   * Create a new repository structure analysis step
   * @param {Object} options - Step options
   */
  constructor(options = {}) {
    super('RepoStructureAnalysisStep', 'Performs repository structure analysis', 'analysis');
    
    this.options = {
      includeHidden: options.includeHidden !== false,
      maxDepth: options.maxDepth || 10,
      fileTypes: options.fileTypes || ['*'],
      excludePatterns: options.excludePatterns || [],
      includeStats: options.includeStats !== false,
      ...options
    };
  }

  /**
   * Execute repository structure analysis step
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<Object>} Repository structure analysis result
   */
  async executeStep(context) {
    const projectPath = context.get('projectPath');
    const projectAnalyzer = context.get('projectAnalyzer');
    const logger = context.get('logger') || console;
    
    if (!projectPath) {
      throw new Error('Project path not found in context');
    }
    
    if (!projectAnalyzer) {
      throw new Error('Project analyzer not found in context');
    }

    const startTime = Date.now();
    
    try {
      logger.info('RepoStructureAnalysisStep: Starting repository structure analysis', {
        projectPath,
        options: this.options
      });

      // Get project information
      const projectInfo = await this.getProjectInfo(projectPath, context);

      // Perform repository structure analysis
      const analysis = await this.performRepoStructureAnalysis(projectInfo, context);

      // Generate metrics
      const metrics = this.generateMetrics(analysis);

      // Generate recommendations
      const recommendations = this.generateRecommendations(analysis, context);

      const duration = Date.now() - startTime;

      logger.info('RepoStructureAnalysisStep: Repository structure analysis completed', {
        projectPath,
        duration,
        fileCount: analysis.fileCount || 0,
        directoryCount: analysis.directoryCount || 0
      });

      return {
        success: true,
        analysis,
        metrics,
        recommendations,
        duration,
        metadata: {
          stepName: this._name,
          projectPath,
          analysisOptions: this.options,
          timestamp: new Date()
        }
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('RepoStructureAnalysisStep: Repository structure analysis failed', {
        projectPath,
        duration,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get project information
   * @param {string} projectPath - Project path
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<Object>} Project information
   */
  async getProjectInfo(projectPath, context) {
    const fileSystemService = context.get('fileSystemService');
    
    if (fileSystemService) {
      return await fileSystemService.getProjectInfo(projectPath);
    }

    // Fallback to basic project info
    return {
      path: projectPath,
      name: projectPath.split('/').pop(),
      type: 'unknown'
    };
  }

  /**
   * Perform repository structure analysis
   * @param {Object} projectInfo - Project information
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<Object>} Repository structure analysis result
   */
  async performRepoStructureAnalysis(projectInfo, context) {
    const projectAnalyzer = context.get('projectAnalyzer');
    
    // Use project analyzer to analyze repository structure
    let structure = await projectAnalyzer.analyzeStructure(
      projectInfo.path,
      {
        includeHidden: this.options.includeHidden,
        maxDepth: this.options.maxDepth,
        fileTypes: this.options.fileTypes,
        excludePatterns: this.options.excludePatterns,
        includeStats: this.options.includeStats
      }
    );

    // Patch: convert files/dirs to objects if needed
    if (structure.files && typeof structure.files[0] === 'string') {
      structure.files = structure.files.map(f => ({ path: f, size: 0, extension: f.split('.').pop() }));
    }
    if (structure.directories && typeof structure.directories[0] === 'string') {
      structure.directories = structure.directories.map(d => ({ path: d, size: 0, fileCount: 0 }));
    }

    return {
      projectInfo,
      structure,
      fileCount: structure.files.length,
      directoryCount: structure.directories.length,
      totalSize: structure.totalSize,
      analysisOptions: this.options,
      timestamp: new Date()
    };
  }

  /**
   * Generate metrics from analysis
   * @param {Object} analysis - Analysis result
   * @returns {Object} Metrics
   */
  generateMetrics(analysis) {
    const metrics = {
      fileCount: analysis.fileCount || 0,
      directoryCount: analysis.directoryCount || 0,
      totalSize: analysis.totalSize || 0,
      averageFileSize: 0,
      fileTypeDistribution: {},
      directoryDepth: 0
    };

    // Calculate average file size
    if (metrics.fileCount > 0 && metrics.totalSize > 0) {
      metrics.averageFileSize = Math.round(metrics.totalSize / metrics.fileCount);
    }

    // Calculate file type distribution
    if (analysis.structure && analysis.structure.files) {
      const fileTypes = {};
      for (const file of analysis.structure.files) {
        const extension = file.extension || 'unknown';
        fileTypes[extension] = (fileTypes[extension] || 0) + 1;
      }
      metrics.fileTypeDistribution = fileTypes;
    }

    // Calculate maximum directory depth
    if (analysis.structure && analysis.structure.directories) {
      let maxDepth = 0;
      for (const dir of analysis.structure.directories) {
        const depth = (dir.path.match(/\//g) || []).length;
        maxDepth = Math.max(maxDepth, depth);
      }
      metrics.directoryDepth = maxDepth;
    }

    return metrics;
  }

  /**
   * Generate recommendations from analysis
   * @param {Object} analysis - Analysis result
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Array} Recommendations
   */
  generateRecommendations(analysis, context) {
    const recommendations = [];
    const metrics = this.generateMetrics(analysis);

    // File count recommendations
    if (metrics.fileCount > 1000) {
      recommendations.push({
        type: 'file-count',
        severity: 'medium',
        message: `Large number of files (${metrics.fileCount}). Consider organizing into subdirectories.`,
        details: []
      });
    }

    // Directory depth recommendations
    if (metrics.directoryDepth > 8) {
      recommendations.push({
        type: 'directory-depth',
        severity: 'medium',
        message: `Deep directory structure (${metrics.directoryDepth} levels). Consider flattening the structure.`,
        details: []
      });
    }

    // File type distribution recommendations
    const fileTypes = Object.keys(metrics.fileTypeDistribution);
    if (fileTypes.length > 20) {
      recommendations.push({
        type: 'file-types',
        severity: 'low',
        message: `Many file types detected (${fileTypes.length}). Consider standardizing file types.`,
        details: fileTypes.slice(0, 10)
      });
    }

    // Missing common directories
    const commonDirs = ['src', 'tests', 'docs', 'config'];
    const missingDirs = commonDirs.filter(dir => 
      !analysis.structure.directories.some(d => d.path.includes(dir))
    );
    
    if (missingDirs.length > 0) {
      recommendations.push({
        type: 'missing-directories',
        severity: 'low',
        message: `Consider adding common directories: ${missingDirs.join(', ')}`,
        details: missingDirs
      });
    }

    // Large files recommendations
    if (analysis.structure && analysis.structure.files) {
      const largeFiles = analysis.structure.files
        .filter(f => f.size > 1024 * 1024) // > 1MB
        .slice(0, 5);
      
      if (largeFiles.length > 0) {
        recommendations.push({
          type: 'large-files',
          severity: 'medium',
          message: `Found ${largeFiles.length} large files. Consider optimizing or splitting them.`,
          details: largeFiles.map(f => ({ path: f.path, size: f.size }))
        });
      }
    }

    return recommendations;
  }

  /**
   * Validate repository structure analysis step
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<ValidationResult>} Validation result
   */
  async validate(context) {
    const baseValidation = await super.validate(context);
    
    if (!baseValidation.isValid) {
      return baseValidation;
    }

    // Check if project path exists
    const projectPath = context.get('projectPath');
    if (!projectPath) {
      return new ValidationResult(false, ['Project path is required for repository structure analysis']);
    }

    // Check if project analyzer is available
    const projectAnalyzer = context.get('projectAnalyzer');
    if (!projectAnalyzer) {
      return new ValidationResult(false, ['Project analyzer is required for repository structure analysis']);
    }

    // Validate options
    if (this.options.maxDepth && (this.options.maxDepth < 1 || this.options.maxDepth > 50)) {
      return new ValidationResult(false, ['Max depth must be between 1 and 50']);
    }

    return new ValidationResult(true, []);
  }

  /**
   * Rollback repository structure analysis step
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<Object>} Rollback result
   */
  async rollback(context) {
    // Repository structure analysis steps typically don't need rollback as they don't modify files
    return {
      success: true,
      stepName: this._name,
      message: 'Repository structure analysis step rollback completed (no changes to revert)'
    };
  }

  /**
   * Clone repository structure analysis step
   * @returns {RepoStructureAnalysisStep} Cloned step
   */
  clone() {
    const clonedStep = new RepoStructureAnalysisStep(this.options);
    clonedStep._metadata = { ...this._metadata };
    clonedStep._validationRules = [...this._validationRules];
    clonedStep._dependencies = [...this._dependencies];
    return clonedStep;
  }

  /**
   * Get step metadata
   * @returns {Object} Step metadata
   */
  getMetadata() {
    return {
      ...super.getMetadata(),
      options: this.options,
      type: 'repo-structure-analysis'
    };
  }

  /**
   * Convert step to JSON
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      ...super.toJSON(),
      options: this.options,
      type: 'repo-structure-analysis'
    };
  }

  /**
   * Create step from JSON
   * @param {Object} json - JSON representation
   * @returns {RepoStructureAnalysisStep} Step instance
   */
  static fromJSON(json) {
    const step = new RepoStructureAnalysisStep(json.options);
    step._metadata = json.metadata || {};
    step._dependencies = json.dependencies || [];
    return step;
  }
}

module.exports = RepoStructureAnalysisStep; 