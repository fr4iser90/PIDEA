/**
 * Git Version Analysis Step
 * Analyzes changes to determine version bump type and impact
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const SemanticVersioningService = require('@domain/services/version/SemanticVersioningService');
const logger = new Logger('GitVersionAnalysisStep');

// Step configuration
const config = {
  name: 'GitVersionAnalysisStep',
  type: 'git',
  description: 'Analyzes changes to determine version bump type and impact',
  category: 'git',
  version: '1.0.0',
  dependencies: ['gitService', 'fileSystemService'],
  settings: {
    timeout: 30000,
    analyzeCommitMessages: true,
    analyzeFileChanges: true,
    analyzeTaskContent: true
  },
  validation: {
    required: ['projectPath'],
    optional: ['sinceCommit', 'includePatterns', 'excludePatterns', 'task']
  }
};

class GitVersionAnalysisStep {
  constructor() {
    this.name = 'GitVersionAnalysisStep';
    this.description = 'Analyzes changes to determine version bump type and impact';
    this.category = 'git';
    this.dependencies = ['gitService', 'fileSystemService'];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = GitVersionAnalysisStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`🔧 Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);
      
      const { projectPath, sinceCommit, includePatterns, excludePatterns, task, ...otherParams } = context;
      
      logger.info('Executing Git Version Analysis step', {
        projectPath,
        sinceCommit: sinceCommit || 'HEAD~1',
        includePatterns,
        excludePatterns,
        taskId: task?.id,
        ...otherParams
      });

      // Initialize semantic versioning service
      const semanticVersioning = new SemanticVersioningService();

      // Analyze changes
      const analysisResult = await this.analyzeChanges(
        projectPath,
        sinceCommit,
        includePatterns,
        excludePatterns,
        task,
        context
      );

      // Determine suggested bump type
      const suggestedBumpType = semanticVersioning.determineBumpType(analysisResult.changes);

      // Calculate impact score
      const impactScore = this.calculateImpactScore(analysisResult.changes);

      // Generate recommendations
      const recommendations = this.generateRecommendations(analysisResult, suggestedBumpType);

      logger.info('Git Version Analysis step completed successfully', {
        suggestedBumpType,
        impactScore,
        changesDetected: Object.keys(analysisResult.changes).length,
        filesAnalyzed: analysisResult.filesAnalyzed
      });

      return {
        success: true,
        result: {
          suggestedBumpType,
          impactScore,
          changes: analysisResult.changes,
          filesAnalyzed: analysisResult.filesAnalyzed,
          commitsAnalyzed: analysisResult.commitsAnalyzed,
          recommendations,
          analysis: analysisResult
        },
        timestamp: new Date()
      };

    } catch (error) {
      logger.error(`${this.name} failed`, {
        error: error.message,
        context: {
          projectPath: context.projectPath,
          sinceCommit: context.sinceCommit
        }
      });

      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  async analyzeChanges(projectPath, sinceCommit, includePatterns, excludePatterns, task, context) {
    const changes = {
      breakingChanges: 0,
      newFeatures: 0,
      bugFixes: 0,
      documentation: 0,
      refactoring: 0,
      performance: 0,
      tests: 0,
      configuration: 0
    };

    let filesAnalyzed = 0;
    let commitsAnalyzed = 0;

    try {
      // Analyze git diff if git service is available
      if (context.gitService) {
        const diffResult = await this.analyzeGitDiff(projectPath, sinceCommit, context);
        Object.assign(changes, diffResult.changes);
        filesAnalyzed += diffResult.filesAnalyzed;
        commitsAnalyzed += diffResult.commitsAnalyzed;
      }

      // Analyze task content if task is provided
      if (task) {
        const taskAnalysis = this.analyzeTaskContent(task);
        Object.assign(changes, taskAnalysis);
      }

      // Analyze file patterns
      if (includePatterns || excludePatterns) {
        const patternAnalysis = await this.analyzeFilePatterns(
          projectPath,
          includePatterns,
          excludePatterns,
          context
        );
        Object.assign(changes, patternAnalysis.changes);
        filesAnalyzed += patternAnalysis.filesAnalyzed;
      }

    } catch (error) {
      logger.warn('Error during change analysis', { error: error.message });
    }

    return {
      changes,
      filesAnalyzed,
      commitsAnalyzed,
      sinceCommit: sinceCommit || 'HEAD~1'
    };
  }

  async analyzeGitDiff(projectPath, sinceCommit, context) {
    try {
      const diff = await context.gitService.getDiff(projectPath, sinceCommit);
      const changes = {
        breakingChanges: 0,
        newFeatures: 0,
        bugFixes: 0,
        documentation: 0,
        refactoring: 0,
        performance: 0,
        tests: 0,
        configuration: 0
      };

      let filesAnalyzed = 0;
      let commitsAnalyzed = 0;

      if (diff && diff.files) {
        for (const file of diff.files) {
          filesAnalyzed++;
          const fileName = file.filename.toLowerCase();
          const additions = file.additions || 0;
          const deletions = file.deletions || 0;
          const changesCount = additions + deletions;

          // Analyze file type and changes
          if (fileName.includes('test') || fileName.includes('spec')) {
            changes.tests += changesCount;
          } else if (fileName.includes('readme') || fileName.includes('doc') || fileName.includes('.md')) {
            changes.documentation += changesCount;
          } else if (fileName.includes('package.json') || fileName.includes('config') || fileName.includes('.json')) {
            changes.configuration += 1;
          } else if (fileName.includes('performance') || fileName.includes('optimize')) {
            changes.performance += changesCount;
          } else if (changesCount > 100) {
            changes.refactoring += 1;
          } else if (additions > deletions * 2) {
            changes.newFeatures += additions;
          } else {
            changes.bugFixes += changesCount;
          }

          // Check for breaking changes in specific files
          if (fileName.includes('api') || fileName.includes('interface') || fileName.includes('schema')) {
            if (deletions > 0) {
              changes.breakingChanges += 1;
            }
          }
        }
      }

      // Analyze commit messages
      if (context.gitService && context.analyzeCommitMessages !== false) {
        const commits = await context.gitService.getCommitHistory(projectPath, { since: sinceCommit, limit: 10 });
        commitsAnalyzed = commits.length;
        
        for (const commit of commits) {
          const message = commit.message.toLowerCase();
          
          if (message.includes('breaking') || message.includes('incompatible')) {
            changes.breakingChanges += 1;
          } else if (message.includes('feat') || message.includes('feature')) {
            changes.newFeatures += 1;
          } else if (message.includes('fix') || message.includes('bug')) {
            changes.bugFixes += 1;
          } else if (message.includes('refactor')) {
            changes.refactoring += 1;
          } else if (message.includes('perf') || message.includes('performance')) {
            changes.performance += 1;
          } else if (message.includes('docs') || message.includes('doc')) {
            changes.documentation += 1;
          }
        }
      }

      return { changes, filesAnalyzed, commitsAnalyzed };

    } catch (error) {
      logger.warn('Error analyzing git diff', { error: error.message });
      return { changes: {}, filesAnalyzed: 0, commitsAnalyzed: 0 };
    }
  }

  analyzeTaskContent(task) {
    const changes = {
      breakingChanges: 0,
      newFeatures: 0,
      bugFixes: 0,
      documentation: 0,
      refactoring: 0,
      performance: 0,
      tests: 0,
      configuration: 0
    };

    const text = `${task.title || ''} ${task.description || ''}`.toLowerCase();
    const taskType = task.type?.value || task.type;

    // Analyze task type
    switch (taskType) {
      case 'feature':
        changes.newFeatures += 1;
        break;
      case 'bug':
      case 'hotfix':
        changes.bugFixes += 1;
        break;
      case 'refactor':
        changes.refactoring += 1;
        break;
      case 'optimization':
        changes.performance += 1;
        break;
      case 'documentation':
        changes.documentation += 1;
        break;
      case 'test':
        changes.tests += 1;
        break;
    }

    // Analyze text content for keywords
    if (text.includes('breaking') || text.includes('incompatible') || text.includes('deprecate')) {
      changes.breakingChanges += 1;
    }
    if (text.includes('performance') || text.includes('optimize') || text.includes('speed')) {
      changes.performance += 1;
    }
    if (text.includes('refactor') || text.includes('restructure') || text.includes('reorganize')) {
      changes.refactoring += 1;
    }
    if (text.includes('test') || text.includes('spec') || text.includes('coverage')) {
      changes.tests += 1;
    }
    if (text.includes('config') || text.includes('setting') || text.includes('environment')) {
      changes.configuration += 1;
    }

    return changes;
  }

  async analyzeFilePatterns(projectPath, includePatterns, excludePatterns, context) {
    const changes = {
      breakingChanges: 0,
      newFeatures: 0,
      bugFixes: 0,
      documentation: 0,
      refactoring: 0,
      performance: 0,
      tests: 0,
      configuration: 0
    };

    let filesAnalyzed = 0;

    try {
      if (context.fileSystemService) {
        // This would require implementing file pattern matching
        // For now, return basic analysis
        filesAnalyzed = 1;
        changes.bugFixes = 1; // Default to patch level
      }
    } catch (error) {
      logger.warn('Error analyzing file patterns', { error: error.message });
    }

    return { changes, filesAnalyzed };
  }

  calculateImpactScore(changes) {
    const weights = {
      breakingChanges: 10,
      newFeatures: 5,
      bugFixes: 2,
      documentation: 1,
      refactoring: 3,
      performance: 4,
      tests: 1,
      configuration: 2
    };

    let score = 0;
    for (const [type, count] of Object.entries(changes)) {
      score += (count || 0) * (weights[type] || 1);
    }

    // Normalize to 0-100 scale
    return Math.min(100, Math.max(0, score));
  }

  generateRecommendations(analysisResult, suggestedBumpType) {
    const recommendations = [];

    if (analysisResult.changes.breakingChanges > 0) {
      recommendations.push({
        type: 'warning',
        message: 'Breaking changes detected - consider major version bump',
        action: 'major'
      });
    }

    if (analysisResult.changes.newFeatures > 0) {
      recommendations.push({
        type: 'info',
        message: 'New features detected - consider minor version bump',
        action: 'minor'
      });
    }

    if (analysisResult.changes.bugFixes > 0) {
      recommendations.push({
        type: 'info',
        message: 'Bug fixes detected - patch version bump recommended',
        action: 'patch'
      });
    }

    if (analysisResult.changes.tests > 0) {
      recommendations.push({
        type: 'success',
        message: 'Test improvements detected - good practice',
        action: 'patch'
      });
    }

    if (analysisResult.changes.documentation > 0) {
      recommendations.push({
        type: 'info',
        message: 'Documentation updates detected - patch version bump',
        action: 'patch'
      });
    }

    return recommendations;
  }

  validateContext(context) {
    if (!context.projectPath) {
      throw new Error('Project path is required');
    }
  }
}

// Create instance for execution
const stepInstance = new GitVersionAnalysisStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
};
