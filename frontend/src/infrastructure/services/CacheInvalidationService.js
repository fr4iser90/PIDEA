/**
 * CacheInvalidationService - Selective cache invalidation
 * Replaces global cache clearing with targeted invalidation
 * Implements event-driven cache management
 */

import { logger } from "@/infrastructure/logging/Logger";
import { EventCoordinator } from "@/infrastructure/services/EventCoordinator";
import { getInvalidationRule, getNamespacePatterns } from "@/config/cache-config";
import { cacheService } from './CacheService.js';

export class CacheInvalidationService {
  constructor(cacheService) {
    this.cacheService = cacheService;
    this.eventCoordinator = new EventCoordinator();
    
    // Invalidation statistics
    this.stats = {
      totalInvalidations: 0,
      selectiveInvalidations: 0,
      globalInvalidations: 0,
      namespaceInvalidations: {},
      averageInvalidationTime: 0,
      lastInvalidationTime: 0
    };
    
    // Setup event listeners
    this.setupEventListeners();
    
    logger.info('CacheInvalidationService initialized with selective invalidation');
  }

  /**
   * Setup event listeners for automatic cache invalidation
   */
  setupEventListeners() {
    // IDE switch events
    this.eventCoordinator.on('ide:switch', (data) => {
      this.handleIDEChange(data);
    });
    
    // Project change events
    this.eventCoordinator.on('project:change', (data) => {
      this.handleProjectChange(data);
    });
    
    // Analysis complete events
    this.eventCoordinator.on('analysis:complete', (data) => {
      this.handleAnalysisComplete(data);
    });
    
    // Chat events
    this.eventCoordinator.on('chat:new', (data) => {
      this.handleChatUpdate(data);
    });
    
    // Workflow events
    this.eventCoordinator.on('workflow:update', (data) => {
      this.handleWorkflowUpdate(data);
    });
    
    // User action events
    this.eventCoordinator.on('user:action', (data) => {
      this.handleUserAction(data);
    });
    
    logger.info('Event listeners configured for selective cache invalidation');
  }

  /**
   * Handle IDE change events
   * @param {Object} data - IDE change data
   */
  handleIDEChange(data) {
    const startTime = performance.now();
    
    try {
      // Invalidate IDE-specific cache
      this.invalidateByPattern('ide:*', data.port);
      
      // Invalidate port-specific cache
      if (data.port) {
        this.invalidateByPattern(`*:${data.port}`, data.port);
      }
      
      this.updateStats('ide', performance.now() - startTime);
      
      logger.info(`🔄 IDE change invalidation: port ${data.port}`);
      
    } catch (error) {
      logger.error('Failed to handle IDE change:', error);
    }
  }

  /**
   * Handle project change events
   * @param {Object} data - Project change data
   */
  handleProjectChange(data) {
    const startTime = performance.now();
    
    try {
      // Invalidate project-specific cache
      this.invalidateByPattern('project:*', data.projectId);
      
      // Invalidate analysis cache for this project
      this.invalidateByPattern('analysis:*', data.projectId);
      
      this.updateStats('project', performance.now() - startTime);
      
      logger.info(`🔄 Project change invalidation: ${data.projectId}`);
      
    } catch (error) {
      logger.error('Failed to handle project change:', error);
    }
  }

  /**
   * Handle analysis complete events
   * @param {Object} data - Analysis complete data
   */
  handleAnalysisComplete(data) {
    const startTime = performance.now();
    
    try {
      // Invalidate specific analysis type cache
      this.invalidateByPattern(`analysis:${data.type}`, data.projectId);
      
      // Invalidate related analysis cache
      this.invalidateByPattern('analysis:*', data.projectId);
      
      this.updateStats('analysis', performance.now() - startTime);
      
      logger.info(`🔄 Analysis complete invalidation: ${data.type} for ${data.projectId}`);
      
    } catch (error) {
      logger.error('Failed to handle analysis complete:', error);
    }
  }

  /**
   * Handle chat update events
   * @param {Object} data - Chat update data
   */
  handleChatUpdate(data) {
    const startTime = performance.now();
    
    try {
      // Invalidate chat-specific cache
      this.invalidateByPattern('chat:*', data.port);
      
      // Invalidate port-specific chat cache
      if (data.port) {
        this.invalidateByPattern(`chat:${data.port}`, data.port);
      }
      
      this.updateStats('chat', performance.now() - startTime);
      
      logger.info(`🔄 Chat update invalidation: port ${data.port}`);
      
    } catch (error) {
      logger.error('Failed to handle chat update:', error);
    }
  }

  /**
   * Handle workflow update events
   * @param {Object} data - Workflow update data
   */
  handleWorkflowUpdate(data) {
    const startTime = performance.now();
    
    try {
      // Invalidate workflow-specific cache
      this.invalidateByPattern('workflow:*', data.workflowId);
      
      // Invalidate step-specific cache
      if (data.stepId) {
        this.invalidateByPattern(`workflow:${data.stepId}`, data.workflowId);
      }
      
      this.updateStats('workflow', performance.now() - startTime);
      
      logger.info(`🔄 Workflow update invalidation: ${data.workflowId}`);
      
    } catch (error) {
      logger.error('Failed to handle workflow update:', error);
    }
  }

  /**
   * Handle user action events
   * @param {Object} data - User action data
   */
  handleUserAction(data) {
    const startTime = performance.now();
    
    try {
      // Determine invalidation based on action type
      switch (data.action) {
        case 'refresh':
          this.handleRefreshAction(data);
          break;
        case 'reset':
          this.handleResetAction(data);
          break;
        case 'clear':
          this.handleClearAction(data);
          break;
        default:
          logger.debug(`No specific invalidation for action: ${data.action}`);
      }
      
      this.updateStats('user', performance.now() - startTime);
      
    } catch (error) {
      logger.error('Failed to handle user action:', error);
    }
  }

  /**
   * Handle refresh action
   * @param {Object} data - Refresh action data
   */
  handleRefreshAction(data) {
    if (data.scope === 'all') {
      // Selective refresh instead of global clear
      this.invalidateByPattern('*', data.identifier);
    } else if (data.scope) {
      this.invalidateByPattern(`${data.scope}:*`, data.identifier);
    }
    
    logger.info(`🔄 Refresh action invalidation: ${data.scope || 'all'}`);
  }

  /**
   * Handle reset action
   * @param {Object} data - Reset action data
   */
  handleResetAction(data) {
    if (data.scope) {
      this.invalidateByPattern(`${data.scope}:*`, data.identifier);
    }
    
    logger.info(`🔄 Reset action invalidation: ${data.scope}`);
  }

  /**
   * Handle clear action
   * @param {Object} data - Clear action data
   */
  handleClearAction(data) {
    if (data.scope === 'all') {
      // Use selective invalidation instead of global clear
      this.invalidateByPattern('*', data.identifier);
    } else if (data.scope) {
      this.invalidateByPattern(`${data.scope}:*`, data.identifier);
    }
    
    logger.info(`🔄 Clear action invalidation: ${data.scope || 'all'}`);
  }

  /**
   * Invalidate cache entries by pattern
   * @param {string} pattern - Cache key pattern
   * @param {string} identifier - Optional identifier for more specific invalidation
   */
  invalidateByPattern(pattern, identifier = null) {
    const startTime = performance.now();
    
    try {
      let invalidatedCount = 0;
      const cacheStats = this.cacheService.getStats();
      
      // Get all cache keys (this would need to be implemented in CacheService)
      const cacheKeys = this.cacheService.getAllKeys();
      
      for (const key of cacheKeys) {
        if (this.matchesPattern(key, pattern) && (!identifier || key.includes(identifier))) {
          this.cacheService.delete(key);
          invalidatedCount++;
        }
      }
      
      this.stats.selectiveInvalidations++;
      this.stats.totalInvalidations++;
      this.updateStats('pattern', performance.now() - startTime);
      
      logger.info(`🔄 Pattern invalidation: ${pattern}${identifier ? ` (${identifier})` : ''}, invalidated: ${invalidatedCount} entries`);
      
    } catch (error) {
      logger.error('Failed to invalidate by pattern:', error);
    }
  }

  /**
   * Check if cache key matches pattern
   * @param {string} key - Cache key
   * @param {string} pattern - Pattern to match
   * @returns {boolean} Match result
   */
  matchesPattern(key, pattern) {
    if (pattern === '*') return true;
    
    // Convert pattern to regex
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(key);
  }

  /**
   * Invalidate cache by namespace
   * @param {string} namespace - Namespace to invalidate
   * @param {string} identifier - Optional identifier
   */
  invalidateByNamespace(namespace, identifier = null) {
    const startTime = performance.now();
    
    try {
      const patterns = getNamespacePatterns(namespace);
      let totalInvalidated = 0;
      
      for (const pattern of patterns) {
        const invalidatedCount = this.invalidateByPattern(pattern, identifier);
        totalInvalidated += invalidatedCount;
      }
      
      this.updateStats(namespace, performance.now() - startTime);
      
      logger.info(`🔄 Namespace invalidation: ${namespace}${identifier ? ` (${identifier})` : ''}, invalidated: ${totalInvalidated} entries`);
      
    } catch (error) {
      logger.error('Failed to invalidate by namespace:', error);
    }
  }

  /**
   * Invalidate cache by data type
   * @param {string} dataType - Data type to invalidate
   * @param {string} identifier - Optional identifier
   */
  invalidateByDataType(dataType, identifier = null) {
    const startTime = performance.now();
    
    try {
      let invalidatedCount = 0;
      const cacheKeys = this.cacheService.getAllKeys();
      
      for (const key of cacheKeys) {
        const cacheItem = this.cacheService.getCacheItem(key);
        if (cacheItem && cacheItem.dataType === dataType && (!identifier || key.includes(identifier))) {
          this.cacheService.delete(key);
          invalidatedCount++;
        }
      }
      
      this.updateStats(dataType, performance.now() - startTime);
      
      logger.info(`🔄 Data type invalidation: ${dataType}${identifier ? ` (${identifier})` : ''}, invalidated: ${invalidatedCount} entries`);
      
    } catch (error) {
      logger.error('Failed to invalidate by data type:', error);
    }
  }

  /**
   * Invalidate expired cache entries
   */
  invalidateExpired() {
    const startTime = performance.now();
    
    try {
      let invalidatedCount = 0;
      const cacheKeys = this.cacheService.getAllKeys();
      const now = Date.now();
      
      for (const key of cacheKeys) {
        const cacheItem = this.cacheService.getCacheItem(key);
        if (cacheItem && now > cacheItem.expires) {
          this.cacheService.delete(key);
          invalidatedCount++;
        }
      }
      
      this.updateStats('expired', performance.now() - startTime);
      
      if (invalidatedCount > 0) {
        logger.info(`🔄 Expired invalidation: ${invalidatedCount} entries`);
      }
      
    } catch (error) {
      logger.error('Failed to invalidate expired entries:', error);
    }
  }

  /**
   * Update invalidation statistics
   * @param {string} type - Invalidation type
   * @param {number} duration - Duration in milliseconds
   */
  updateStats(type, duration) {
    this.stats.lastInvalidationTime = Date.now();
    this.stats.averageInvalidationTime = this.stats.totalInvalidations > 0 
      ? (this.stats.averageInvalidationTime * (this.stats.totalInvalidations - 1) + duration) / this.stats.totalInvalidations
      : duration;
    
    if (!this.stats.namespaceInvalidations[type]) {
      this.stats.namespaceInvalidations[type] = 0;
    }
    this.stats.namespaceInvalidations[type]++;
  }

  /**
   * Get invalidation statistics
   * @returns {Object} Invalidation statistics
   */
  getStats() {
    return {
      ...this.stats,
      cacheStats: this.cacheService.getStats()
    };
  }

  /**
   * Manual invalidation trigger
   * @param {string} eventType - Event type
   * @param {Object} data - Event data
   */
  triggerInvalidation(eventType, data) {
    const rule = getInvalidationRule(eventType);
    
    if (rule) {
      this.invalidateByPattern(rule.pattern, data.identifier);
    } else {
      logger.warn(`No invalidation rule found for event: ${eventType}`);
    }
  }

  /**
   * Emergency global invalidation (use sparingly)
   * @param {string} reason - Reason for global invalidation
   */
  emergencyGlobalInvalidation(reason) {
    logger.warn(`⚠️ Emergency global invalidation triggered: ${reason}`);
    
    const startTime = performance.now();
    this.cacheService.clear();
    
    this.stats.globalInvalidations++;
    this.stats.totalInvalidations++;
    this.updateStats('emergency', performance.now() - startTime);
    
    logger.warn(`🔄 Emergency global invalidation completed: ${reason}`);
  }
}

// Export singleton instance
export const cacheInvalidationService = new CacheInvalidationService(cacheService);
