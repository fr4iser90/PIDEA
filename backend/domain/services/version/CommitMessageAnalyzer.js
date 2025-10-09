/**
 * CommitMessageAnalyzer - Analyzes commit messages for version bump determination
 * Uses conventional commits and semantic analysis
 */

const Logger = require('@logging/Logger');

class CommitMessageAnalyzer {
  constructor(dependencies = {}) {
    this.logger = new Logger('CommitMessageAnalyzer');
    
    // Configuration
    this.config = {
      conventionalCommitTypes: {
        'feat': { type: 'minor', weight: 0.8, description: 'New feature' },
        'fix': { type: 'patch', weight: 0.7, description: 'Bug fix' },
        'docs': { type: 'patch', weight: 0.3, description: 'Documentation' },
        'style': { type: 'patch', weight: 0.2, description: 'Code style' },
        'refactor': { type: 'minor', weight: 0.6, description: 'Code refactoring' },
        'perf': { type: 'patch', weight: 0.5, description: 'Performance improvement' },
        'test': { type: 'patch', weight: 0.2, description: 'Test addition/modification' },
        'chore': { type: 'patch', weight: 0.1, description: 'Maintenance' },
        'ci': { type: 'patch', weight: 0.1, description: 'CI/CD changes' },
        'build': { type: 'patch', weight: 0.1, description: 'Build system changes' }
      },
      breakingChangeKeywords: [
        'BREAKING CHANGE',
        'breaking change',
        'breaking',
        'major',
        'incompatible',
        'deprecate',
        'remove',
        'delete'
      ],
      featureKeywords: [
        'add',
        'new',
        'feature',
        'implement',
        'create',
        'introduce',
        'support'
      ],
      bugFixKeywords: [
        'fix',
        'bug',
        'issue',
        'error',
        'problem',
        'resolve',
        'correct',
        'patch'
      ],
      ...dependencies.config
    };
  }

  /**
   * Analyze commit messages for version impact
   * @param {Array} commitMessages - Array of commit messages
   * @param {Object} context - Analysis context
   * @returns {Promise<Object>} Analysis result
   */
  async analyzeCommitMessages(commitMessages, context = {}) {
    try {
      this.logger.info('Starting commit message analysis', {
        commitCount: commitMessages.length
      });

      const analysis = {
        hasBreakingChanges: false,
        hasNewFeatures: false,
        hasBugFixes: false,
        recommendedType: 'patch',
        confidence: 0.5,
        commitAnalysis: [],
        factors: ['commit-analysis'],
        timestamp: new Date()
      };

      if (commitMessages.length === 0) {
        this.logger.warn('No commit messages provided for analysis');
        return analysis;
      }

      // Analyze each commit message
      for (const commitMessage of commitMessages) {
        const commitAnalysis = this.analyzeCommitMessage(commitMessage);
        analysis.commitAnalysis.push(commitAnalysis);
        
        // Update overall analysis
        this.updateOverallAnalysis(analysis, commitAnalysis);
      }

      // Determine recommended version bump type
      analysis.recommendedType = this.determineRecommendedType(analysis);
      
      // Calculate confidence
      analysis.confidence = this.calculateConfidence(analysis);

      this.logger.info('Commit message analysis completed', {
        recommendedType: analysis.recommendedType,
        confidence: analysis.confidence,
        hasBreakingChanges: analysis.hasBreakingChanges
      });

      return analysis;

    } catch (error) {
      this.logger.error('Commit message analysis failed', { error: error.message });
      return this.getFallbackAnalysis(error);
    }
  }

  /**
   * Analyze individual commit message
   * @param {string} commitMessage - Commit message
   * @returns {Object} Commit analysis result
   */
  analyzeCommitMessage(commitMessage) {
    try {
      const analysis = {
        message: commitMessage,
        type: null,
        scope: null,
        isBreakingChange: false,
        hasNewFeature: false,
        hasBugFix: false,
        confidence: 0.5,
        factors: []
      };

      // Parse conventional commit format
      const conventionalMatch = this.parseConventionalCommit(commitMessage);
      if (conventionalMatch) {
        analysis.type = conventionalMatch.type;
        analysis.scope = conventionalMatch.scope;
        analysis.isBreakingChange = conventionalMatch.isBreakingChange;
        analysis.confidence = this.config.conventionalCommitTypes[conventionalMatch.type]?.weight || 0.5;
        analysis.factors.push('conventional-commit');
      }

      // Analyze content for features and bug fixes
      analysis.hasNewFeature = this.detectNewFeature(commitMessage);
      analysis.hasBugFix = this.detectBugFix(commitMessage);

      // Check for breaking changes
      if (!analysis.isBreakingChange) {
        analysis.isBreakingChange = this.detectBreakingChange(commitMessage);
      }

      // Update factors
      if (analysis.hasNewFeature) analysis.factors.push('new-feature');
      if (analysis.hasBugFix) analysis.factors.push('bug-fix');
      if (analysis.isBreakingChange) analysis.factors.push('breaking-change');

      return analysis;

    } catch (error) {
      this.logger.warn('Failed to analyze commit message', { 
        message: commitMessage.substring(0, 100),
        error: error.message 
      });
      
      return {
        message: commitMessage,
        type: null,
        scope: null,
        isBreakingChange: false,
        hasNewFeature: false,
        hasBugFix: false,
        confidence: 0.1,
        factors: ['analysis-failed'],
        error: error.message
      };
    }
  }

  /**
   * Parse conventional commit format
   * @param {string} commitMessage - Commit message
   * @returns {Object|null} Parsed conventional commit
   */
  parseConventionalCommit(commitMessage) {
    try {
      // Conventional commit format: type(scope): description
      const conventionalPattern = /^(\w+)(?:\(([^)]+)\))?(!)?:\s*(.+)$/;
      const match = commitMessage.match(conventionalPattern);
      
      if (!match) return null;

      const [, type, scope, breakingIndicator, description] = match;
      
      return {
        type: type.toLowerCase(),
        scope: scope || null,
        isBreakingChange: !!breakingIndicator || this.detectBreakingChange(description),
        description: description
      };

    } catch (error) {
      this.logger.warn('Failed to parse conventional commit', { error: error.message });
      return null;
    }
  }

  /**
   * Detect new feature in commit message
   * @param {string} commitMessage - Commit message
   * @returns {boolean} Has new feature
   */
  detectNewFeature(commitMessage) {
    try {
      const lowerMessage = commitMessage.toLowerCase();
      
      for (const keyword of this.config.featureKeywords) {
        if (lowerMessage.includes(keyword.toLowerCase())) {
          return true;
        }
      }

      return false;

    } catch (error) {
      this.logger.warn('Failed to detect new feature', { error: error.message });
      return false;
    }
  }

  /**
   * Detect bug fix in commit message
   * @param {string} commitMessage - Commit message
   * @returns {boolean} Has bug fix
   */
  detectBugFix(commitMessage) {
    try {
      const lowerMessage = commitMessage.toLowerCase();
      
      for (const keyword of this.config.bugFixKeywords) {
        if (lowerMessage.includes(keyword.toLowerCase())) {
          return true;
        }
      }

      return false;

    } catch (error) {
      this.logger.warn('Failed to detect bug fix', { error: error.message });
      return false;
    }
  }

  /**
   * Detect breaking change in commit message
   * @param {string} commitMessage - Commit message
   * @returns {boolean} Is breaking change
   */
  detectBreakingChange(commitMessage) {
    try {
      const lowerMessage = commitMessage.toLowerCase();
      
      for (const keyword of this.config.breakingChangeKeywords) {
        if (lowerMessage.includes(keyword.toLowerCase())) {
          return true;
        }
      }

      return false;

    } catch (error) {
      this.logger.warn('Failed to detect breaking change', { error: error.message });
      return false;
    }
  }

  /**
   * Update overall analysis with commit analysis
   * @param {Object} analysis - Overall analysis
   * @param {Object} commitAnalysis - Commit analysis
   */
  updateOverallAnalysis(analysis, commitAnalysis) {
    analysis.hasBreakingChanges = analysis.hasBreakingChanges || commitAnalysis.isBreakingChange;
    analysis.hasNewFeatures = analysis.hasNewFeatures || commitAnalysis.hasNewFeature;
    analysis.hasBugFixes = analysis.hasBugFixes || commitAnalysis.hasBugFix;
  }

  /**
   * Determine recommended version bump type
   * @param {Object} analysis - Analysis result
   * @returns {string} Recommended bump type
   */
  determineRecommendedType(analysis) {
    // Breaking changes always require major version
    if (analysis.hasBreakingChanges) {
      return 'major';
    }

    // New features require minor version
    if (analysis.hasNewFeatures) {
      return 'minor';
    }

    // Bug fixes require patch version
    if (analysis.hasBugFixes) {
      return 'patch';
    }

    // Analyze conventional commit types
    const typeCounts = { major: 0, minor: 0, patch: 0 };
    
    for (const commitAnalysis of analysis.commitAnalysis) {
      if (commitAnalysis.type && this.config.conventionalCommitTypes[commitAnalysis.type]) {
        const typeConfig = this.config.conventionalCommitTypes[commitAnalysis.type];
        typeCounts[typeConfig.type]++;
      }
    }

    // Return the highest type found
    if (typeCounts.major > 0) return 'major';
    if (typeCounts.minor > 0) return 'minor';
    return 'patch';
  }

  /**
   * Calculate confidence score for analysis
   * @param {Object} analysis - Analysis result
   * @returns {number} Confidence score
   */
  calculateConfidence(analysis) {
    let confidence = 0.5; // Base confidence

    // Increase confidence based on findings
    if (analysis.hasBreakingChanges) confidence += 0.3;
    if (analysis.hasNewFeatures) confidence += 0.2;
    if (analysis.hasBugFixes) confidence += 0.1;

    // Increase confidence based on number of commits analyzed
    if (analysis.commitAnalysis.length > 0) {
      confidence += Math.min(analysis.commitAnalysis.length * 0.05, 0.2);
    }

    // Increase confidence if using conventional commits
    const conventionalCommits = analysis.commitAnalysis.filter(c => c.factors.includes('conventional-commit'));
    if (conventionalCommits.length > 0) {
      confidence += Math.min(conventionalCommits.length * 0.1, 0.3);
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Get fallback analysis when analysis fails
   * @param {Error} error - Error that occurred
   * @returns {Object} Fallback analysis
   */
  getFallbackAnalysis(error) {
    return {
      hasBreakingChanges: false,
      hasNewFeatures: false,
      hasBugFixes: false,
      recommendedType: 'patch',
      confidence: 0.1,
      commitAnalysis: [],
      factors: ['commit-analysis-fallback'],
      error: error.message,
      timestamp: new Date()
    };
  }

  /**
   * Get service health status
   * @returns {Object} Health status
   */
  getHealthStatus() {
    return {
      status: 'healthy',
      config: {
        conventionalCommitTypes: Object.keys(this.config.conventionalCommitTypes).length,
        breakingChangeKeywords: this.config.breakingChangeKeywords.length,
        featureKeywords: this.config.featureKeywords.length,
        bugFixKeywords: this.config.bugFixKeywords.length
      },
      timestamp: new Date()
    };
  }
}

module.exports = CommitMessageAnalyzer;
