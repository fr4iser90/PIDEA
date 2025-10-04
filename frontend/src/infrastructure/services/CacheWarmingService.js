/**
 * CacheWarmingService - Proactive cache loading service
 * Implements predictive loading, background warming, and intelligent preloading
 * Reduces cache misses during IDE switching and improves performance
 */

import { logger } from "@/infrastructure/logging/Logger";
import { cacheService } from "@/infrastructure/services/CacheService";
import { cacheConfig } from "@/config/cache-config";

export class CacheWarmingService {
  constructor() {
    this.isEnabled = cacheConfig.warming.enabled;
    this.strategies = cacheConfig.warming.strategies;
    this.triggers = cacheConfig.warming.triggers;
    this.warmingPatterns = new Map();
    this.activeWarming = new Set();
    this.warmingHistory = [];
    this.maxHistorySize = 100;
    
    // Performance tracking
    this.stats = {
      totalWarming: 0,
      successfulWarming: 0,
      failedWarming: 0,
      averageWarmingTime: 0,
      cacheHitImprovement: 0
    };
    
    logger.info('CacheWarmingService initialized', {
      enabled: this.isEnabled,
      strategies: Object.keys(this.strategies),
      triggers: this.triggers
    });
  }

  /**
   * Initialize warming service
   */
  async initialize() {
    if (!this.isEnabled) {
      logger.info('Cache warming disabled in configuration');
      return;
    }

    try {
      // Set up warming patterns
      this.setupWarmingPatterns();
      
      // Start background warming if enabled
      if (this.strategies.background) {
        this.startBackgroundWarming();
      }
      
      logger.info('CacheWarmingService initialization complete');
      
    } catch (error) {
      logger.error('CacheWarmingService initialization failed:', error);
      throw error;
    }
  }

  /**
   * Set up warming patterns for different scenarios
   */
  setupWarmingPatterns() {
    // IDE switching patterns
    this.warmingPatterns.set('ide:switch', [
      { namespace: 'ide', dataType: 'ide', priority: 'high' },
      { namespace: 'tasks', dataType: 'tasks', priority: 'high' },
      { namespace: 'git', dataType: 'git', priority: 'medium' },
      { namespace: 'analysisBundle', dataType: 'analysisBundle', priority: 'high' }
    ]);

    // Project loading patterns
    this.warmingPatterns.set('project:load', [
      { namespace: 'project', dataType: 'project', priority: 'high' },
      { namespace: 'tasks', dataType: 'tasks', priority: 'high' },
      { namespace: 'analysis', dataType: 'analysis', priority: 'medium' },
      { namespace: 'git', dataType: 'git', priority: 'medium' }
    ]);

    // Analysis start patterns
    this.warmingPatterns.set('analysis:start', [
      { namespace: 'analysis', dataType: 'analysis', priority: 'high' },
      { namespace: 'project', dataType: 'project', priority: 'medium' },
      { namespace: 'tasks', dataType: 'tasks', priority: 'medium' }
    ]);

    logger.info('Warming patterns configured', {
      patterns: Array.from(this.warmingPatterns.keys())
    });
  }

  /**
   * Warm cache for specific trigger
   * @param {string} trigger - Warming trigger
   * @param {string} port - IDE port
   * @param {string} projectId - Project identifier
   * @param {Object} options - Warming options
   * @returns {Promise<Object>} Warming results
   */
  async warmForTrigger(trigger, port, projectId, options = {}) {
    if (!this.isEnabled) {
      logger.debug('Cache warming disabled, skipping');
      return { skipped: true, reason: 'disabled' };
    }

    const warmingId = `${trigger}:${port}:${projectId}`;
    
    // Prevent duplicate warming
    if (this.activeWarming.has(warmingId)) {
      logger.debug(`Warming already in progress for ${warmingId}`);
      return { skipped: true, reason: 'in_progress' };
    }

    const startTime = performance.now();
    this.activeWarming.add(warmingId);

    try {
      logger.info(`🔥 Starting cache warming for trigger: ${trigger}, port: ${port}, project: ${projectId}`);

      const patterns = this.warmingPatterns.get(trigger) || [];
      if (patterns.length === 0) {
        logger.warn(`No warming patterns found for trigger: ${trigger}`);
        return { skipped: true, reason: 'no_patterns' };
      }

      // Filter patterns by priority if specified
      const filteredPatterns = options.priority 
        ? patterns.filter(p => p.priority === options.priority)
        : patterns;

      // Warm cache using CacheService
      const results = await cacheService.warmCache(filteredPatterns, port, projectId);
      
      // Update statistics
      this.updateStats(results, performance.now() - startTime);
      
      // Record warming history
      this.recordWarmingHistory(trigger, port, projectId, results, performance.now() - startTime);
      
      logger.info(`🔥 Cache warming completed for ${trigger}`, {
        port,
        projectId,
        warmed: results.warmed.length,
        failed: results.failed.length,
        totalTime: results.totalTime
      });

      return results;

    } catch (error) {
      logger.error(`Cache warming failed for ${trigger}:`, error);
      this.stats.failedWarming++;
      return { error: error.message, failed: true };
      
    } finally {
      this.activeWarming.delete(warmingId);
    }
  }

  /**
   * Predictive warming based on usage patterns
   * @param {string} port - IDE port
   * @param {string} projectId - Project identifier
   * @returns {Promise<Object>} Predictive warming results
   */
  async predictiveWarming(port, projectId) {
    if (!this.strategies.predictive) {
      logger.debug('Predictive warming disabled');
      return { skipped: true, reason: 'predictive_disabled' };
    }

    try {
      logger.info(`🔮 Starting predictive warming for port: ${port}, project: ${projectId}`);

      // Analyze usage patterns from history
      const usagePatterns = this.analyzeUsagePatterns(port, projectId);
      
      // Generate predictive patterns
      const predictivePatterns = this.generatePredictivePatterns(usagePatterns);
      
      if (predictivePatterns.length === 0) {
        logger.debug('No predictive patterns generated');
        return { skipped: true, reason: 'no_patterns' };
      }

      // Warm cache with predictive patterns
      const results = await cacheService.warmCache(predictivePatterns, port, projectId);
      
      logger.info(`🔮 Predictive warming completed`, {
        port,
        projectId,
        patterns: predictivePatterns.length,
        warmed: results.warmed.length
      });

      return results;

    } catch (error) {
      logger.error('Predictive warming failed:', error);
      return { error: error.message, failed: true };
    }
  }

  /**
   * Start background warming process
   */
  startBackgroundWarming() {
    if (!this.strategies.background) {
      logger.debug('Background warming disabled');
      return;
    }

    // Background warming every 5 minutes
    this.backgroundInterval = setInterval(async () => {
      try {
        await this.performBackgroundWarming();
      } catch (error) {
        logger.error('Background warming failed:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes

    logger.info('Background warming started');
  }

  /**
   * Perform background warming
   */
  async performBackgroundWarming() {
    logger.debug('Performing background cache warming');

    // Get active projects and ports from cache
    const activeProjects = this.getActiveProjects();
    
    for (const { port, projectId } of activeProjects) {
      try {
        // Warm common patterns in background
        await this.warmForTrigger('project:load', port, projectId, { priority: 'high' });
      } catch (error) {
        logger.error(`Background warming failed for ${port}:${projectId}:`, error);
      }
    }
  }

  /**
   * Analyze usage patterns from warming history
   * @param {string} port - IDE port
   * @param {string} projectId - Project identifier
   * @returns {Object} Usage patterns
   */
  analyzeUsagePatterns(port, projectId) {
    const relevantHistory = this.warmingHistory.filter(entry => 
      entry.port === port && entry.projectId === projectId
    );

    const patterns = {
      frequentTriggers: {},
      averageWarmingTime: 0,
      successRate: 0,
      commonPatterns: []
    };

    // Analyze trigger frequency
    relevantHistory.forEach(entry => {
      patterns.frequentTriggers[entry.trigger] = (patterns.frequentTriggers[entry.trigger] || 0) + 1;
    });

    // Calculate averages
    if (relevantHistory.length > 0) {
      patterns.averageWarmingTime = relevantHistory.reduce((sum, entry) => sum + entry.totalTime, 0) / relevantHistory.length;
      patterns.successRate = relevantHistory.filter(entry => !entry.failed).length / relevantHistory.length;
    }

    return patterns;
  }

  /**
   * Generate predictive patterns based on usage analysis
   * @param {Object} usagePatterns - Usage patterns
   * @returns {Array} Predictive patterns
   */
  generatePredictivePatterns(usagePatterns) {
    const patterns = [];

    // Add patterns based on frequent triggers
    Object.entries(usagePatterns.frequentTriggers).forEach(([trigger, count]) => {
      if (count >= 3) { // If triggered 3+ times
        const triggerPatterns = this.warmingPatterns.get(trigger) || [];
        patterns.push(...triggerPatterns.filter(p => p.priority === 'high'));
      }
    });

    // Remove duplicates
    const uniquePatterns = patterns.filter((pattern, index, self) => 
      index === self.findIndex(p => p.namespace === pattern.namespace && p.dataType === pattern.dataType)
    );

    return uniquePatterns;
  }

  /**
   * Get active projects from cache
   * @returns {Array} Active projects
   */
  getActiveProjects() {
    // This would typically come from IDEStore or similar
    // For now, return empty array - would be implemented based on actual usage
    return [];
  }

  /**
   * Update warming statistics
   * @param {Object} results - Warming results
   * @param {number} totalTime - Total warming time
   */
  updateStats(results, totalTime) {
    this.stats.totalWarming++;
    
    if (results.warmed && results.warmed.length > 0) {
      this.stats.successfulWarming++;
    } else {
      this.stats.failedWarming++;
    }

    // Update average warming time
    this.stats.averageWarmingTime = 
      (this.stats.averageWarmingTime * (this.stats.totalWarming - 1) + totalTime) / this.stats.totalWarming;
  }

  /**
   * Record warming history
   * @param {string} trigger - Warming trigger
   * @param {string} port - IDE port
   * @param {string} projectId - Project identifier
   * @param {Object} results - Warming results
   * @param {number} totalTime - Total warming time
   */
  recordWarmingHistory(trigger, port, projectId, results, totalTime) {
    const historyEntry = {
      timestamp: Date.now(),
      trigger,
      port,
      projectId,
      warmed: results.warmed?.length || 0,
      failed: results.failed?.length || 0,
      totalTime,
      failed: !!results.error
    };

    this.warmingHistory.push(historyEntry);

    // Keep history size manageable
    if (this.warmingHistory.length > this.maxHistorySize) {
      this.warmingHistory = this.warmingHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Get warming statistics
   * @returns {Object} Warming statistics
   */
  getStats() {
    return {
      ...this.stats,
      activeWarming: this.activeWarming.size,
      historySize: this.warmingHistory.length,
      patterns: Array.from(this.warmingPatterns.keys())
    };
  }

  /**
   * Stop background warming
   */
  stopBackgroundWarming() {
    if (this.backgroundInterval) {
      clearInterval(this.backgroundInterval);
      this.backgroundInterval = null;
      logger.info('Background warming stopped');
    }
  }

  /**
   * Cleanup warming service
   */
  cleanup() {
    this.stopBackgroundWarming();
    this.activeWarming.clear();
    this.warmingHistory = [];
    logger.info('CacheWarmingService cleaned up');
  }
}

// Create singleton instance
export const cacheWarmingService = new CacheWarmingService();

// Export for use in other modules
export default cacheWarmingService;
