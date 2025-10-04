/**
 * CacheWarmingService Tests
 * Comprehensive test suite for cache warming functionality
 * Tests predictive loading, background warming, and performance
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { CacheWarmingService } from '@/infrastructure/services/CacheWarmingService';

// Mock dependencies
jest.mock('@/infrastructure/logging/Logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

jest.mock('@/infrastructure/services/CacheService', () => ({
  cacheService: {
    warmCache: jest.fn(),
    get: jest.fn(),
    set: jest.fn()
  }
}));

jest.mock('@/config/cache-config', () => ({
  cacheConfig: {
    warming: {
      enabled: true,
      strategies: {
        predictive: true,
        preload: true,
        background: true
      },
      triggers: ['ide:switch', 'project:load', 'analysis:start']
    }
  }
}));

describe('CacheWarmingService', () => {
  let cacheWarmingService;

  beforeEach(() => {
    cacheWarmingService = new CacheWarmingService();
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (cacheWarmingService) {
      cacheWarmingService.cleanup();
    }
  });

  describe('Initialization', () => {
    it('should initialize with correct configuration', () => {
      expect(cacheWarmingService.isEnabled).toBe(true);
      expect(cacheWarmingService.strategies.predictive).toBe(true);
      expect(cacheWarmingService.strategies.background).toBe(true);
      expect(cacheWarmingService.triggers).toContain('ide:switch');
    });

    it('should set up warming patterns', () => {
      expect(cacheWarmingService.warmingPatterns.has('ide:switch')).toBe(true);
      expect(cacheWarmingService.warmingPatterns.has('project:load')).toBe(true);
      expect(cacheWarmingService.warmingPatterns.has('analysis:start')).toBe(true);
    });

    it('should initialize statistics', () => {
      expect(cacheWarmingService.stats.totalWarming).toBe(0);
      expect(cacheWarmingService.stats.successfulWarming).toBe(0);
      expect(cacheWarmingService.stats.failedWarming).toBe(0);
    });
  });

  describe('Warming Patterns', () => {
    it('should have correct IDE switch patterns', () => {
      const patterns = cacheWarmingService.warmingPatterns.get('ide:switch');
      expect(patterns).toHaveLength(4);
      expect(patterns).toContainEqual({ namespace: 'ide', dataType: 'ide', priority: 'high' });
      expect(patterns).toContainEqual({ namespace: 'tasks', dataType: 'tasks', priority: 'high' });
    });

    it('should have correct project load patterns', () => {
      const patterns = cacheWarmingService.warmingPatterns.get('project:load');
      expect(patterns).toHaveLength(4);
      expect(patterns).toContainEqual({ namespace: 'project', dataType: 'project', priority: 'high' });
      expect(patterns).toContainEqual({ namespace: 'tasks', dataType: 'tasks', priority: 'high' });
    });

    it('should have correct analysis start patterns', () => {
      const patterns = cacheWarmingService.warmingPatterns.get('analysis:start');
      expect(patterns).toHaveLength(3);
      expect(patterns).toContainEqual({ namespace: 'analysis', dataType: 'analysis', priority: 'high' });
    });
  });

  describe('Warming for Triggers', () => {
    beforeEach(() => {
      const { cacheService } = require('@/infrastructure/services/CacheService');
      cacheService.warmCache.mockResolvedValue({
        warmed: [{ pattern: { namespace: 'tasks', dataType: 'tasks' }, status: 'warmed' }],
        failed: [],
        totalTime: 100
      });
    });

    it('should warm cache for IDE switch trigger', async () => {
      const port = '9222';
      const projectId = 'project123';
      
      const results = await cacheWarmingService.warmForTrigger('ide:switch', port, projectId);
      
      expect(results.warmed).toHaveLength(1);
      expect(results.failed).toHaveLength(0);
      expect(results.totalTime).toBe(100);
    });

    it('should warm cache for project load trigger', async () => {
      const port = '9222';
      const projectId = 'project123';
      
      const results = await cacheWarmingService.warmForTrigger('project:load', port, projectId);
      
      expect(results.warmed).toHaveLength(1);
      expect(results.failed).toHaveLength(0);
    });

    it('should skip warming when disabled', async () => {
      cacheWarmingService.isEnabled = false;
      
      const results = await cacheWarmingService.warmForTrigger('ide:switch', '9222', 'project123');
      
      expect(results.skipped).toBe(true);
      expect(results.reason).toBe('disabled');
    });

    it('should skip warming for unknown trigger', async () => {
      const results = await cacheWarmingService.warmForTrigger('unknown:trigger', '9222', 'project123');
      
      expect(results.skipped).toBe(true);
      expect(results.reason).toBe('no_patterns');
    });

    it('should prevent duplicate warming', async () => {
      const port = '9222';
      const projectId = 'project123';
      
      // Start first warming
      const promise1 = cacheWarmingService.warmForTrigger('ide:switch', port, projectId);
      
      // Try to start second warming immediately
      const promise2 = cacheWarmingService.warmForTrigger('ide:switch', port, projectId);
      
      const [result1, result2] = await Promise.all([promise1, promise2]);
      
      expect(result1.skipped).toBeFalsy();
      expect(result2.skipped).toBe(true);
      expect(result2.reason).toBe('in_progress');
    });

    it('should filter patterns by priority', async () => {
      const port = '9222';
      const projectId = 'project123';
      
      const results = await cacheWarmingService.warmForTrigger('ide:switch', port, projectId, { priority: 'high' });
      
      expect(results.warmed).toHaveLength(1);
      expect(results.failed).toHaveLength(0);
    });
  });

  describe('Predictive Warming', () => {
    beforeEach(() => {
      // Mock usage patterns
      cacheWarmingService.warmingHistory = [
        { trigger: 'ide:switch', port: '9222', projectId: 'project123', timestamp: Date.now() - 1000 },
        { trigger: 'ide:switch', port: '9222', projectId: 'project123', timestamp: Date.now() - 2000 },
        { trigger: 'ide:switch', port: '9222', projectId: 'project123', timestamp: Date.now() - 3000 },
        { trigger: 'project:load', port: '9222', projectId: 'project123', timestamp: Date.now() - 4000 }
      ];
    });

    it('should analyze usage patterns correctly', () => {
      const patterns = cacheWarmingService.analyzeUsagePatterns('9222', 'project123');
      
      expect(patterns.frequentTriggers['ide:switch']).toBe(3);
      expect(patterns.frequentTriggers['project:load']).toBe(1);
      expect(patterns.averageWarmingTime).toBeGreaterThan(0);
      expect(patterns.successRate).toBeGreaterThanOrEqual(0);
    });

    it('should generate predictive patterns', () => {
      const usagePatterns = {
        frequentTriggers: {
          'ide:switch': 3,
          'project:load': 1
        },
        averageWarmingTime: 100,
        successRate: 0.9
      };
      
      const patterns = cacheWarmingService.generatePredictivePatterns(usagePatterns);
      
      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns.every(p => p.priority === 'high')).toBe(true);
    });

    it('should perform predictive warming', async () => {
      const { cacheService } = require('@/infrastructure/services/CacheService');
      cacheService.warmCache.mockResolvedValue({
        warmed: [{ pattern: { namespace: 'tasks', dataType: 'tasks' }, status: 'warmed' }],
        failed: [],
        totalTime: 50
      });
      
      const results = await cacheWarmingService.predictiveWarming('9222', 'project123');
      
      expect(results.warmed).toHaveLength(1);
      expect(results.failed).toHaveLength(0);
    });

    it('should skip predictive warming when disabled', async () => {
      cacheWarmingService.strategies.predictive = false;
      
      const results = await cacheWarmingService.predictiveWarming('9222', 'project123');
      
      expect(results.skipped).toBe(true);
      expect(results.reason).toBe('predictive_disabled');
    });
  });

  describe('Background Warming', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should start background warming', () => {
      cacheWarmingService.startBackgroundWarming();
      
      expect(cacheWarmingService.backgroundInterval).toBeDefined();
    });

    it('should stop background warming', () => {
      cacheWarmingService.startBackgroundWarming();
      cacheWarmingService.stopBackgroundWarming();
      
      expect(cacheWarmingService.backgroundInterval).toBeNull();
    });

    it('should skip background warming when disabled', () => {
      cacheWarmingService.strategies.background = false;
      
      cacheWarmingService.startBackgroundWarming();
      
      expect(cacheWarmingService.backgroundInterval).toBeUndefined();
    });
  });

  describe('Statistics and History', () => {
    it('should update statistics correctly', () => {
      const results = {
        warmed: [{ pattern: { namespace: 'tasks' }, status: 'warmed' }],
        failed: [],
        totalTime: 100
      };
      
      cacheWarmingService.updateStats(results, 100);
      
      expect(cacheWarmingService.stats.totalWarming).toBe(1);
      expect(cacheWarmingService.stats.successfulWarming).toBe(1);
      expect(cacheWarmingService.stats.failedWarming).toBe(0);
      expect(cacheWarmingService.stats.averageWarmingTime).toBe(100);
    });

    it('should record warming history', () => {
      const results = {
        warmed: [{ pattern: { namespace: 'tasks' }, status: 'warmed' }],
        failed: [],
        totalTime: 100
      };
      
      cacheWarmingService.recordWarmingHistory('ide:switch', '9222', 'project123', results, 100);
      
      expect(cacheWarmingService.warmingHistory).toHaveLength(1);
      expect(cacheWarmingService.warmingHistory[0].trigger).toBe('ide:switch');
      expect(cacheWarmingService.warmingHistory[0].port).toBe('9222');
      expect(cacheWarmingService.warmingHistory[0].projectId).toBe('project123');
    });

    it('should limit history size', () => {
      const results = { warmed: [], failed: [], totalTime: 100 };
      
      // Add more entries than max size
      for (let i = 0; i < 150; i++) {
        cacheWarmingService.recordWarmingHistory('ide:switch', '9222', 'project123', results, 100);
      }
      
      expect(cacheWarmingService.warmingHistory.length).toBeLessThanOrEqual(100);
    });

    it('should return correct statistics', () => {
      const stats = cacheWarmingService.getStats();
      
      expect(stats.totalWarming).toBe(0);
      expect(stats.successfulWarming).toBe(0);
      expect(stats.failedWarming).toBe(0);
      expect(stats.activeWarming).toBe(0);
      expect(stats.historySize).toBe(0);
      expect(stats.patterns).toContain('ide:switch');
    });
  });

  describe('Error Handling', () => {
    it('should handle warming errors gracefully', async () => {
      const { cacheService } = require('@/infrastructure/services/CacheService');
      cacheService.warmCache.mockRejectedValue(new Error('Warming failed'));
      
      const results = await cacheWarmingService.warmForTrigger('ide:switch', '9222', 'project123');
      
      expect(results.error).toBe('Warming failed');
      expect(results.failed).toBe(true);
      expect(cacheWarmingService.stats.failedWarming).toBe(1);
    });

    it('should handle predictive warming errors', async () => {
      const { cacheService } = require('@/infrastructure/services/CacheService');
      cacheService.warmCache.mockRejectedValue(new Error('Predictive warming failed'));
      
      const results = await cacheWarmingService.predictiveWarming('9222', 'project123');
      
      expect(results.error).toBe('Predictive warming failed');
      expect(results.failed).toBe(true);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup properly', () => {
      cacheWarmingService.startBackgroundWarming();
      cacheWarmingService.activeWarming.add('test:warming');
      cacheWarmingService.warmingHistory.push({ test: 'data' });
      
      cacheWarmingService.cleanup();
      
      expect(cacheWarmingService.backgroundInterval).toBeNull();
      expect(cacheWarmingService.activeWarming.size).toBe(0);
      expect(cacheWarmingService.warmingHistory.length).toBe(0);
    });
  });
});
