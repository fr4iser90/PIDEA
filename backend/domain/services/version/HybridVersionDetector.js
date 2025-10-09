/**
 * HybridVersionDetector - Combines rule-based and AI analysis for version detection
 * Provides intelligent version bump recommendations using multiple detection methods
 */

const Logger = require('@logging/Logger');
const AIVersionAnalysisService = require('./AIVersionAnalysisService');
const VersionManagementService = require('./VersionManagementService');
const CodeChangeAnalyzer = require('./CodeChangeAnalyzer');
const CommitMessageAnalyzer = require('./CommitMessageAnalyzer');
const DependencyChangeAnalyzer = require('./DependencyChangeAnalyzer');

class HybridVersionDetector {
  constructor(dependencies = {}) {
    // All services MUST come from DI container - no direct instantiation!
    this.aiAnalysisService = dependencies.aiAnalysisService;
    this.versionManagementService = dependencies.versionManagementService;
    this.codeChangeAnalyzer = dependencies.codeChangeAnalyzer;
    this.commitMessageAnalyzer = dependencies.commitMessageAnalyzer;
    this.dependencyChangeAnalyzer = dependencies.dependencyChangeAnalyzer;
    this.logger = new Logger('HybridVersionDetector');
    
    // Configuration
    this.config = {
      aiWeight: 0.4, // Weight for AI analysis
      ruleWeight: 0.2, // Weight for rule-based analysis
      codeWeight: 0.2, // Weight for code change analysis
      commitWeight: 0.1, // Weight for commit message analysis
      dependencyWeight: 0.1, // Weight for dependency analysis
      confidenceThreshold: 0.6, // Minimum confidence for AI recommendations
      fallbackToRules: true, // Fallback to rules if AI fails
      maxAnalysisTime: 15000, // 15 seconds max for analysis
      enableEnhancedAnalysis: true, // Enable enhanced detection methods
      ...dependencies.config
    };
    
    // Analysis cache
    this.analysisCache = new Map();
    this.cacheTimeout = 300000; // 5 minutes
  }

  /**
   * Determine version bump type using hybrid approach
   * @param {string} changelog - Description of the task/changes
   * @param {string} projectPath - Path to the project
   * @param {Object} context - Additional context
   * @returns {Promise<Object>} Hybrid analysis result
   */
  async determineBumpType(changelog, projectPath, context = {}) {
    try {
      this.logger.info('Starting hybrid version analysis', {
        changelog: changelog.substring(0, 100) + '...',
        projectPath,
        contextKeys: Object.keys(context)
      });

      // Check cache first
      const cacheKey = this.generateCacheKey(changelog, projectPath, context);
      const cachedResult = this.getCachedResult(cacheKey);
      if (cachedResult) {
        this.logger.info('Using cached hybrid analysis result');
        return cachedResult;
      }

      // Run all analyses in parallel with timeout
      const analysisPromise = this.runParallelAnalysis(changelog, projectPath, context);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Analysis timeout')), this.config.maxAnalysisTime)
      );

      const analysisResults = await Promise.race([analysisPromise, timeoutPromise]);
      const { aiResult, ruleResult, codeResult, commitResult, dependencyResult } = analysisResults;

      // Combine results
      const hybridResult = this.combineResults(aiResult, ruleResult, codeResult, commitResult, dependencyResult, changelog);

      // Cache the result
      this.cacheResult(cacheKey, hybridResult);

      this.logger.info('Hybrid version analysis completed', {
        recommendedType: hybridResult.recommendedType,
        confidence: hybridResult.confidence,
        sources: hybridResult.sources
      });

      return hybridResult;

    } catch (error) {
      this.logger.error('Hybrid version analysis failed', {
        error: error.message,
        changelog: changelog.substring(0, 100) + '...'
      });

      // Return fallback result
      return this.getFallbackResult(changelog, error);
    }
  }

  /**
   * Perform direct AI analysis without recursion
   * @param {string} changelog - Task description
   * @param {string} projectPath - Project path
   * @param {Object} context - Additional context
   * @returns {Promise<Object>} AI analysis result
   */
  async performDirectAIAnalysis(changelog, projectPath, context) {
    try {
      // Use simple rule-based analysis to avoid recursion
      if (changelog && changelog.includes('fix') || changelog.includes('bug')) {
        return {
          recommendedType: 'patch',
          confidence: 0.8,
          reasoning: 'Bug fix detected in task description',
          autoDetected: true
        };
      } else if (changelog && changelog.includes('feat') || changelog.includes('add')) {
        return {
          recommendedType: 'minor',
          confidence: 0.8,
          reasoning: 'New feature detected in task description',
          autoDetected: true
        };
      } else if (changelog && changelog.includes('refactor')) {
        return {
          recommendedType: 'patch',
          confidence: 0.7,
          reasoning: 'Refactoring detected in task description',
          autoDetected: true
        };
      } else {
        return {
          recommendedType: 'patch',
          confidence: 0.6,
          reasoning: 'Default patch recommendation for auto-detected changes',
          autoDetected: true
        };
      }
    } catch (error) {
      this.logger.warn('Direct AI analysis failed', { error: error.message });
      return this.getAIFallbackResult(changelog, error);
    }
  }

  /**
   * Run all analyses in parallel
   * @param {string} changelog - Task description
   * @param {string} projectPath - Project path
   * @param {Object} context - Additional context
   * @returns {Promise<Object>} Analysis results
   */
  async runParallelAnalysis(changelog, projectPath, context) {
    const promises = {};

    // AI analysis - use direct AI integration to avoid recursion
    promises.aiAnalysis = this.performDirectAIAnalysis(changelog, projectPath, context)
      .catch(error => {
        this.logger.warn('AI analysis failed, using fallback', { error: error.message });
        return this.getAIFallbackResult(changelog, error);
      });

    // Rule-based analysis
    promises.ruleAnalysis = this.runRuleBasedAnalysis(changelog, projectPath, context)
      .catch(error => {
        this.logger.warn('Rule-based analysis failed, using fallback', { error: error.message });
        return this.getRuleFallbackResult(changelog, error);
      });

    // Enhanced analysis methods if enabled
    if (this.config.enableEnhancedAnalysis) {
      // Code change analysis
      promises.codeAnalysis = this.codeChangeAnalyzer.analyzeCodeChanges(projectPath, context)
        .catch(error => {
          this.logger.warn('Code change analysis failed, using fallback', { error: error.message });
          return this.getCodeFallbackResult(error);
        });

      // Commit message analysis
      promises.commitAnalysis = this.commitMessageAnalyzer.analyzeCommitMessages(
        context.commitMessages || [], 
        context
      ).catch(error => {
        this.logger.warn('Commit message analysis failed, using fallback', { error: error.message });
        return this.getCommitFallbackResult(error);
      });

      // Dependency change analysis
      promises.dependencyAnalysis = this.dependencyChangeAnalyzer.analyzeDependencyChanges(projectPath, context)
        .catch(error => {
          this.logger.warn('Dependency change analysis failed, using fallback', { error: error.message });
          return this.getDependencyFallbackResult(error);
        });
    } else {
      // Provide fallback results for disabled analyses
      promises.codeAnalysis = Promise.resolve(this.getCodeFallbackResult());
      promises.commitAnalysis = Promise.resolve(this.getCommitFallbackResult());
      promises.dependencyAnalysis = Promise.resolve(this.getDependencyFallbackResult());
    }

    const results = await Promise.all([
      promises.aiAnalysis,
      promises.ruleAnalysis,
      promises.codeAnalysis,
      promises.commitAnalysis,
      promises.dependencyAnalysis
    ]);

    return {
      aiResult: results[0],
      ruleResult: results[1],
      codeResult: results[2],
      commitResult: results[3],
      dependencyResult: results[4]
    };
  }

  /**
   * Run rule-based analysis using existing VersionManagementService
   * @param {string} changelog - Task description
   * @param {string} projectPath - Project path
   * @param {Object} context - Additional context
   * @returns {Promise<Object>} Rule-based analysis result
   */
  async runRuleBasedAnalysis(changelog, projectPath, context) {
    try {
      // Create a mock task object for the existing service
      const mockTask = {
        id: 'hybrid-analysis',
        description: changelog,
        title: changelog,
        type: { value: 'analysis' }
      };

      // Use existing determineBumpType method
      const bumpType = await this.versionManagementService.determineBumpType(mockTask, projectPath, context);

      return {
        recommendedType: bumpType,
        confidence: 0.8, // High confidence for rule-based
        reasoning: 'Rule-based analysis using keyword matching and semantic patterns',
        factors: ['keyword-analysis', 'semantic-patterns', 'rule-based-logic'],
        source: 'rule-based',
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('Rule-based analysis failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Combine all analysis results
   * @param {Object} aiResult - AI analysis result
   * @param {Object} ruleResult - Rule-based analysis result
   * @param {Object} codeResult - Code change analysis result
   * @param {Object} commitResult - Commit message analysis result
   * @param {Object} dependencyResult - Dependency change analysis result
   * @param {string} changelog - Task description
   * @returns {Object} Combined hybrid result
   */
  combineResults(aiResult, ruleResult, codeResult, commitResult, dependencyResult, changelog) {
    // Calculate weighted scores for each analysis
    const scores = {
      ai: this.getBumpTypeScore(aiResult.recommendedType) * this.config.aiWeight * aiResult.confidence,
      rule: this.getBumpTypeScore(ruleResult.recommendedType) * this.config.ruleWeight * ruleResult.confidence,
      code: this.getBumpTypeScore(this.getRecommendedTypeFromCode(codeResult)) * this.config.codeWeight * (codeResult.confidence || 0.5),
      commit: this.getBumpTypeScore(commitResult.recommendedType) * this.config.commitWeight * (commitResult.confidence || 0.5),
      dependency: this.getBumpTypeScore(this.getRecommendedTypeFromDependency(dependencyResult)) * this.config.dependencyWeight * (dependencyResult.confidence || 0.5)
    };

    // Find the highest scoring recommendation
    const maxScore = Math.max(...Object.values(scores));
    const winningAnalysis = Object.keys(scores).find(key => scores[key] === maxScore);

    let recommendedType;
    let confidence;
    let reasoning;
    let sources = ['hybrid'];

    switch (winningAnalysis) {
      case 'ai':
        recommendedType = aiResult.recommendedType;
        confidence = aiResult.confidence * this.config.aiWeight;
        reasoning = `AI analysis suggests ${recommendedType} bump. ${aiResult.reasoning}`;
        sources.push('ai');
        break;
      case 'rule':
        recommendedType = ruleResult.recommendedType;
        confidence = ruleResult.confidence * this.config.ruleWeight;
        reasoning = `Rule-based analysis suggests ${recommendedType} bump. ${ruleResult.reasoning}`;
        sources.push('rule-based');
        break;
      case 'code':
        recommendedType = this.getRecommendedTypeFromCode(codeResult);
        confidence = (codeResult.confidence || 0.5) * this.config.codeWeight;
        reasoning = `Code change analysis suggests ${recommendedType} bump. Found ${codeResult.modifiedFiles?.length || 0} modified files.`;
        sources.push('code-analysis');
        break;
      case 'commit':
        recommendedType = commitResult.recommendedType;
        confidence = (commitResult.confidence || 0.5) * this.config.commitWeight;
        reasoning = `Commit message analysis suggests ${recommendedType} bump. ${commitResult.commitAnalysis?.length || 0} commits analyzed.`;
        sources.push('commit-analysis');
        break;
      case 'dependency':
        recommendedType = this.getRecommendedTypeFromDependency(dependencyResult);
        confidence = (dependencyResult.confidence || 0.5) * this.config.dependencyWeight;
        reasoning = `Dependency analysis suggests ${recommendedType} bump. ${dependencyResult.dependencyChanges?.length || 0} dependency changes found.`;
        sources.push('dependency-analysis');
        break;
      default:
        recommendedType = 'patch';
        confidence = 0.3;
        reasoning = 'Fallback to patch version';
        sources.push('fallback');
    }

    // Combine factors
    const factors = [
      ...(aiResult.factors || []),
      ...(ruleResult.factors || []),
      ...(codeResult.factors || []),
      ...(commitResult.factors || []),
      ...(dependencyResult.factors || []),
      'hybrid-analysis'
    ];

    return {
      recommendedType,
      confidence: Math.min(confidence, 1.0), // Cap at 1.0
      reasoning,
      factors: [...new Set(factors)], // Remove duplicates
      sources,
      aiResult,
      ruleResult,
      codeResult,
      commitResult,
      dependencyResult,
      scores,
      winningAnalysis,
      timestamp: new Date()
    };
  }

  /**
   * Get numeric score for bump type (for comparison)
   * @param {string} bumpType - Bump type
   * @returns {number} Numeric score
   */
  getBumpTypeScore(bumpType) {
    const scores = {
      'patch': 1,
      'minor': 2,
      'major': 3
    };
    return scores[bumpType] || 1;
  }

  /**
   * Get AI fallback result when AI analysis fails
   * @param {string} changelog - Task description
   * @param {Error} error - Error that occurred
   * @returns {Object} AI fallback result
   */
  getAIFallbackResult(changelog, error) {
    return {
      recommendedType: 'patch',
      confidence: 0.3,
      reasoning: 'AI analysis failed, using conservative patch recommendation',
      factors: ['ai-fallback', 'conservative-approach'],
      source: 'ai-fallback',
      error: error.message,
      timestamp: new Date()
    };
  }

  /**
   * Get rule-based fallback result when rule analysis fails
   * @param {string} changelog - Task description
   * @param {Error} error - Error that occurred
   * @returns {Object} Rule-based fallback result
   */
  getRuleFallbackResult(changelog, error) {
    return {
      recommendedType: 'patch',
      confidence: 0.4,
      reasoning: 'Rule-based analysis failed, using conservative patch recommendation',
      factors: ['rule-fallback', 'conservative-approach'],
      source: 'rule-fallback',
      error: error.message,
      timestamp: new Date()
    };
  }

  /**
   * Get fallback result when hybrid analysis fails
   * @param {string} changelog - Task description
   * @param {Error} error - Error that occurred
   * @returns {Object} Fallback result
   */
  getFallbackResult(changelog, error) {
    // Simple rule-based fallback
    const lowerTask = changelog.toLowerCase();
    
    let recommendedType = 'patch';
    let confidence = 0.2;
    let reasoning = 'Hybrid analysis failed, using simple rule-based fallback';
    
    if (lowerTask.includes('breaking') || lowerTask.includes('major') || lowerTask.includes('api change')) {
      recommendedType = 'major';
      confidence = 0.3;
      reasoning = 'Fallback: Detected potential breaking changes';
    } else if (lowerTask.includes('feature') || lowerTask.includes('new') || lowerTask.includes('add')) {
      recommendedType = 'minor';
      confidence = 0.3;
      reasoning = 'Fallback: Detected potential new features';
    }
    
    return {
      recommendedType,
      confidence,
      reasoning,
      factors: ['hybrid-fallback', 'simple-rules'],
      source: 'hybrid-fallback',
      error: error.message,
      timestamp: new Date()
    };
  }

  /**
   * Generate cache key for analysis result
   * @param {string} changelog - Task description
   * @param {string} projectPath - Project path
   * @param {Object} context - Additional context
   * @returns {string} Cache key
   */
  generateCacheKey(changelog, projectPath, context) {
    const keyData = {
      task: changelog.toLowerCase().trim(),
      path: projectPath,
      contextHash: this.hashContext(context),
      config: {
        aiWeight: this.config.aiWeight,
        ruleWeight: this.config.ruleWeight
      }
    };
    
    return Buffer.from(JSON.stringify(keyData)).toString('base64');
  }

  /**
   * Hash context object for cache key
   * @param {Object} context - Context object
   * @returns {string} Context hash
   */
  hashContext(context) {
    try {
      return Buffer.from(JSON.stringify(context)).toString('base64').substring(0, 16);
    } catch (error) {
      return 'default';
    }
  }

  /**
   * Get cached analysis result
   * @param {string} cacheKey - Cache key
   * @returns {Object|null} Cached result or null
   */
  getCachedResult(cacheKey) {
    const cached = this.analysisCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return cached.result;
    }
    
    // Remove expired cache entry
    if (cached) {
      this.analysisCache.delete(cacheKey);
    }
    
    return null;
  }

  /**
   * Cache analysis result
   * @param {string} cacheKey - Cache key
   * @param {Object} result - Analysis result
   */
  cacheResult(cacheKey, result) {
    this.analysisCache.set(cacheKey, {
      result,
      timestamp: Date.now()
    });
    
    // Clean up old cache entries periodically
    if (this.analysisCache.size > 50) {
      this.cleanupCache();
    }
  }

  /**
   * Clean up expired cache entries
   */
  cleanupCache() {
    const now = Date.now();
    for (const [key, value] of this.analysisCache.entries()) {
      if ((now - value.timestamp) > this.cacheTimeout) {
        this.analysisCache.delete(key);
      }
    }
  }

  /**
   * Get recommended type from code analysis
   * @param {Object} codeResult - Code analysis result
   * @returns {string} Recommended bump type
   */
  getRecommendedTypeFromCode(codeResult) {
    if (codeResult.hasBreakingChanges) return 'major';
    if (codeResult.hasNewFeatures) return 'minor';
    if (codeResult.hasBugFixes) return 'patch';
    return 'patch';
  }

  /**
   * Get recommended type from dependency analysis
   * @param {Object} dependencyResult - Dependency analysis result
   * @returns {string} Recommended bump type
   */
  getRecommendedTypeFromDependency(dependencyResult) {
    if (dependencyResult.hasBreakingChanges) return 'major';
    if (dependencyResult.hasMajorUpdates) return 'major';
    if (dependencyResult.hasMinorUpdates) return 'minor';
    if (dependencyResult.hasPatchUpdates) return 'patch';
    return 'patch';
  }

  /**
   * Get code analysis fallback result
   * @param {Error} error - Error that occurred
   * @returns {Object} Fallback result
   */
  getCodeFallbackResult(error = null) {
    return {
      hasBreakingChanges: false,
      hasApiChanges: false,
      hasNewFeatures: false,
      hasBugFixes: false,
      modifiedFiles: [],
      apiChanges: [],
      breakingChanges: [],
      confidence: 0.1,
      factors: ['code-analysis-fallback'],
      error: error?.message,
      timestamp: new Date()
    };
  }

  /**
   * Get commit analysis fallback result
   * @param {Error} error - Error that occurred
   * @returns {Object} Fallback result
   */
  getCommitFallbackResult(error = null) {
    return {
      hasBreakingChanges: false,
      hasNewFeatures: false,
      hasBugFixes: false,
      recommendedType: 'patch',
      confidence: 0.1,
      commitAnalysis: [],
      factors: ['commit-analysis-fallback'],
      error: error?.message,
      timestamp: new Date()
    };
  }

  /**
   * Get dependency analysis fallback result
   * @param {Error} error - Error that occurred
   * @returns {Object} Fallback result
   */
  getDependencyFallbackResult(error = null) {
    return {
      hasBreakingChanges: false,
      hasMajorUpdates: false,
      hasMinorUpdates: false,
      hasPatchUpdates: false,
      hasNewDependencies: false,
      hasRemovedDependencies: false,
      dependencyChanges: [],
      packageFiles: [],
      confidence: 0.1,
      factors: ['dependency-analysis-fallback'],
      error: error?.message,
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
      cacheSize: this.analysisCache.size,
      config: {
        aiWeight: this.config.aiWeight,
        ruleWeight: this.config.ruleWeight,
        codeWeight: this.config.codeWeight,
        commitWeight: this.config.commitWeight,
        dependencyWeight: this.config.dependencyWeight,
        confidenceThreshold: this.config.confidenceThreshold,
        fallbackToRules: this.config.fallbackToRules,
        maxAnalysisTime: this.config.maxAnalysisTime,
        enableEnhancedAnalysis: this.config.enableEnhancedAnalysis
      },
      aiService: this.aiAnalysisService.getHealthStatus(),
      codeAnalyzer: this.codeChangeAnalyzer.getHealthStatus(),
      commitAnalyzer: this.commitMessageAnalyzer.getHealthStatus(),
      dependencyAnalyzer: this.dependencyChangeAnalyzer.getHealthStatus(),
      timestamp: new Date()
    };
  }

  /**
   * Update configuration
   * @param {Object} newConfig - New configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.logger.info('Configuration updated', { config: this.config });
  }
}

module.exports = HybridVersionDetector;
