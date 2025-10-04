/**
 * Cache Invalidation Integration Tests
 * Tests for event-driven cache invalidation and frontend-backend sync
 * Covers selective invalidation patterns, TTL consistency, and performance metrics
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { CacheService } from '@/infrastructure/services/CacheService';
import { CacheInvalidationService } from '@/infrastructure/services/CacheInvalidationService';
import { EventCoordinator } from '@/infrastructure/services/EventCoordinator';

// Mock dependencies
jest.mock('@/infrastructure/logging/Logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

jest.mock('@/infrastructure/services/EventCoordinator', () => ({
  EventCoordinator: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    emit: jest.fn()
  }))
}));

describe('Cache Invalidation Integration', () => {
  let cacheService;
  let cacheInvalidationService;
  let mockEventCoordinator;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create instances
    cacheService = new CacheService();
    mockEventCoordinator = new EventCoordinator();
    cacheService.eventCoordinator = mockEventCoordinator;
    
    cacheInvalidationService = new CacheInvalidationService(cacheService);
    cacheInvalidationService.eventCoordinator = mockEventCoordinator;
  });

  afterEach(() => {
    if (cacheService) {
      cacheService.clear();
    }
  });

  describe('Event-Driven Invalidation', () => {
    beforeEach(async () => {
      await cacheService.initialize();
    });

    it('should handle IDE switch events', () => {
      // Set up test data
      cacheService.set('ide:9222', { port: 9222, data: 'ide1' }, 'ide', 'ide');
      cacheService.set('ide:9224', { port: 9224, data: 'ide2' }, 'ide', 'ide');
      cacheService.set('project:proj1', { project: 'data' }, 'project', 'project');
      
      // Simulate IDE switch event
      const ideSwitchHandler = mockEventCoordinator.on.mock.calls
        .find(call => call[0] === 'ide:switch')[1];
      
      ideSwitchHandler({ port: 9222 });
      
      // IDE-specific cache should be invalidated
      expect(cacheService.memoryCache.has('ide:9222')).toBe(false);
      expect(cacheService.memoryCache.has('ide:9224')).toBe(false);
      expect(cacheService.memoryCache.has('project:proj1')).toBe(true);
    });

    it('should handle project change events', () => {
      // Set up test data
      cacheService.set('project:proj1', { project: 'data1' }, 'project', 'project');
      cacheService.set('analysis:proj1', { analysis: 'data1' }, 'codeQuality', 'analysis');
      cacheService.set('ide:9222', { port: 9222, data: 'ide1' }, 'ide', 'ide');
      
      // Simulate project change event
      const projectChangeHandler = mockEventCoordinator.on.mock.calls
        .find(call => call[0] === 'project:change')[1];
      
      projectChangeHandler({ projectId: 'proj1' });
      
      // Project and analysis cache should be invalidated
      expect(cacheService.memoryCache.has('project:proj1')).toBe(false);
      expect(cacheService.memoryCache.has('analysis:proj1')).toBe(false);
      expect(cacheService.memoryCache.has('ide:9222')).toBe(true);
    });

    it('should handle analysis complete events', () => {
      // Set up test data
      cacheService.set('analysis:codeQuality:proj1', { analysis: 'data1' }, 'codeQuality', 'analysis');
      cacheService.set('analysis:security:proj1', { analysis: 'data2' }, 'security', 'analysis');
      cacheService.set('project:proj1', { project: 'data' }, 'project', 'project');
      
      // Simulate analysis complete event
      const analysisCompleteHandler = mockEventCoordinator.on.mock.calls
        .find(call => call[0] === 'analysis:complete')[1];
      
      analysisCompleteHandler({ type: 'codeQuality', projectId: 'proj1' });
      
      // Specific analysis type should be invalidated
      expect(cacheService.memoryCache.has('analysis:codeQuality:proj1')).toBe(false);
      expect(cacheService.memoryCache.has('analysis:security:proj1')).toBe(true);
      expect(cacheService.memoryCache.has('project:proj1')).toBe(true);
    });

    it('should handle chat events', () => {
      // Set up test data
      cacheService.set('chat:9222', { port: 9222, messages: [] }, 'chat', 'chat');
      cacheService.set('chat:9224', { port: 9224, messages: [] }, 'chat', 'chat');
      cacheService.set('ide:9222', { port: 9222, data: 'ide1' }, 'ide', 'ide');
      
      // Simulate chat event
      const chatHandler = mockEventCoordinator.on.mock.calls
        .find(call => call[0] === 'chat:new')[1];
      
      chatHandler({ port: 9222 });
      
      // Chat-specific cache should be invalidated
      expect(cacheService.memoryCache.has('chat:9222')).toBe(false);
      expect(cacheService.memoryCache.has('chat:9224')).toBe(true);
      expect(cacheService.memoryCache.has('ide:9222')).toBe(true);
    });
  });

  describe('Selective Invalidation Patterns', () => {
    beforeEach(async () => {
      await cacheService.initialize();
    });

    it('should invalidate by pattern with wildcards', () => {
      // Set up test data
      cacheService.set('ide:port1', { data: 1 }, 'ide', 'ide');
      cacheService.set('ide:port2', { data: 2 }, 'ide', 'ide');
      cacheService.set('project:proj1', { data: 3 }, 'project', 'project');
      cacheService.set('analysis:proj1', { data: 4 }, 'codeQuality', 'analysis');
      
      // Mock getAllKeys method
      cacheService.getAllKeys = jest.fn(() => [
        'ide:port1', 'ide:port2', 'project:proj1', 'analysis:proj1'
      ]);
      
      // Invalidate all IDE-related cache
      cacheInvalidationService.invalidateByPattern('ide:*');
      
      expect(cacheService.memoryCache.has('ide:port1')).toBe(false);
      expect(cacheService.memoryCache.has('ide:port2')).toBe(false);
      expect(cacheService.memoryCache.has('project:proj1')).toBe(true);
      expect(cacheService.memoryCache.has('analysis:proj1')).toBe(true);
    });

    it('should invalidate by pattern with identifier', () => {
      // Set up test data
      cacheService.set('ide:port1', { data: 1 }, 'ide', 'ide');
      cacheService.set('ide:port2', { data: 2 }, 'ide', 'ide');
      cacheService.set('project:proj1', { data: 3 }, 'project', 'project');
      
      // Mock getAllKeys method
      cacheService.getAllKeys = jest.fn(() => [
        'ide:port1', 'ide:port2', 'project:proj1'
      ]);
      
      // Invalidate IDE cache for specific port
      cacheInvalidationService.invalidateByPattern('ide:*', 'port1');
      
      expect(cacheService.memoryCache.has('ide:port1')).toBe(false);
      expect(cacheService.memoryCache.has('ide:port2')).toBe(true);
      expect(cacheService.memoryCache.has('project:proj1')).toBe(true);
    });

    it('should invalidate by namespace', () => {
      // Set up test data
      cacheService.set('ide:port1', { data: 1 }, 'ide', 'ide');
      cacheService.set('ide:port2', { data: 2 }, 'ide', 'ide');
      cacheService.set('project:proj1', { data: 3 }, 'project', 'project');
      
      // Invalidate IDE namespace
      cacheInvalidationService.invalidateByNamespace('ide');
      
      expect(cacheService.memoryCache.has('ide:port1')).toBe(false);
      expect(cacheService.memoryCache.has('ide:port2')).toBe(false);
      expect(cacheService.memoryCache.has('project:proj1')).toBe(true);
    });

    it('should invalidate by data type', () => {
      // Set up test data
      cacheService.set('analysis1', { data: 1 }, 'codeQuality', 'analysis');
      cacheService.set('analysis2', { data: 2 }, 'security', 'analysis');
      cacheService.set('project1', { data: 3 }, 'project', 'project');
      
      // Mock getCacheItem method
      cacheService.getCacheItem = jest.fn((key) => {
        const items = {
          'analysis1': { dataType: 'codeQuality', namespace: 'analysis' },
          'analysis2': { dataType: 'security', namespace: 'analysis' },
          'project1': { dataType: 'project', namespace: 'project' }
        };
        return items[key] || null;
      });
      
      // Mock getAllKeys method
      cacheService.getAllKeys = jest.fn(() => ['analysis1', 'analysis2', 'project1']);
      
      // Invalidate codeQuality data type
      cacheInvalidationService.invalidateByDataType('codeQuality');
      
      expect(cacheService.memoryCache.has('analysis1')).toBe(false);
      expect(cacheService.memoryCache.has('analysis2')).toBe(true);
      expect(cacheService.memoryCache.has('project1')).toBe(true);
    });
  });

  describe('TTL Consistency', () => {
    beforeEach(async () => {
      await cacheService.initialize();
    });

    it('should maintain consistent TTL across data types', () => {
      const projectData = { project: 'data' };
      const ideData = { ide: 'data' };
      const chatData = { chat: 'data' };
      
      cacheService.set('project:test', projectData, 'project', 'project');
      cacheService.set('ide:test', ideData, 'ide', 'ide');
      cacheService.set('chat:test', chatData, 'chat', 'chat');
      
      const projectItem = cacheService.memoryCache.get('project:test');
      const ideItem = cacheService.memoryCache.get('ide:test');
      const chatItem = cacheService.memoryCache.get('chat:test');
      
      // Project data should have longest TTL (24 hours)
      expect(projectItem.ttl).toBe(24 * 60 * 60 * 1000);
      
      // IDE data should have medium TTL (5 minutes)
      expect(ideItem.ttl).toBe(5 * 60 * 1000);
      
      // Chat data should have short TTL (5 minutes)
      expect(chatItem.ttl).toBe(5 * 60 * 1000);
    });

    it('should handle TTL updates consistently', () => {
      const data = { test: 'data' };
      
      // Set with default TTL
      cacheService.set('test:default', data, 'default', 'test');
      const defaultItem = cacheService.memoryCache.get('test:default');
      
      // Set with custom TTL
      cacheService.set('test:custom', data, 'ide', 'test'); // 5 minutes
      const customItem = cacheService.memoryCache.get('test:custom');
      
      expect(defaultItem.ttl).toBe(12 * 60 * 60 * 1000); // 12 hours
      expect(customItem.ttl).toBe(5 * 60 * 1000); // 5 minutes
    });
  });

  describe('Performance Metrics', () => {
    beforeEach(async () => {
      await cacheService.initialize();
    });

    it('should track invalidation performance', () => {
      // Set up test data
      cacheService.set('ide:port1', { data: 1 }, 'ide', 'ide');
      cacheService.set('ide:port2', { data: 2 }, 'ide', 'ide');
      
      // Mock getAllKeys method
      cacheService.getAllKeys = jest.fn(() => ['ide:port1', 'ide:port2']);
      
      // Perform invalidation
      cacheInvalidationService.invalidateByPattern('ide:*');
      
      const stats = cacheInvalidationService.getStats();
      
      expect(stats.selectiveInvalidations).toBe(1);
      expect(stats.totalInvalidations).toBe(1);
      expect(stats.averageInvalidationTime).toBeGreaterThan(0);
    });

    it('should track cache hit rate after invalidation', () => {
      // Set up test data
      cacheService.set('ide:port1', { data: 1 }, 'ide', 'ide');
      cacheService.set('project:proj1', { data: 2 }, 'project', 'project');
      
      // Get data (hit)
      cacheService.get('ide:port1');
      cacheService.get('project:proj1');
      
      // Invalidate IDE cache
      cacheService.invalidateByNamespace('ide');
      
      // Try to get invalidated data (miss)
      cacheService.get('ide:port1');
      
      // Try to get non-invalidated data (hit)
      cacheService.get('project:proj1');
      
      const stats = cacheService.getStats();
      
      // Should have 3 hits and 1 miss
      expect(stats.hits).toBe(3);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0.75);
    });

    it('should provide comprehensive invalidation statistics', () => {
      // Set up test data
      cacheService.set('ide:port1', { data: 1 }, 'ide', 'ide');
      cacheService.set('project:proj1', { data: 2 }, 'project', 'project');
      
      // Mock getAllKeys method
      cacheService.getAllKeys = jest.fn(() => ['ide:port1', 'project:proj1']);
      
      // Perform different types of invalidation
      cacheInvalidationService.invalidateByPattern('ide:*');
      cacheInvalidationService.invalidateByNamespace('project');
      
      const stats = cacheInvalidationService.getStats();
      
      expect(stats.totalInvalidations).toBe(2);
      expect(stats.selectiveInvalidations).toBe(2);
      expect(stats.globalInvalidations).toBe(0);
      expect(stats.namespaceInvalidations.ide).toBe(1);
      expect(stats.namespaceInvalidations.project).toBe(1);
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await cacheService.initialize();
    });

    it('should handle invalidation errors gracefully', () => {
      // Mock getAllKeys to throw error
      cacheService.getAllKeys = jest.fn(() => {
        throw new Error('Cache access failed');
      });
      
      // Should not throw error
      expect(() => {
        cacheInvalidationService.invalidateByPattern('ide:*');
      }).not.toThrow();
    });

    it('should handle event handler errors gracefully', () => {
      // Set up test data
      cacheService.set('ide:port1', { data: 1 }, 'ide', 'ide');
      
      // Mock delete method to throw error
      const originalDelete = cacheService.delete;
      cacheService.delete = jest.fn(() => {
        throw new Error('Delete failed');
      });
      
      // Mock getAllKeys method
      cacheService.getAllKeys = jest.fn(() => ['ide:port1']);
      
      // Should not throw error
      expect(() => {
        cacheInvalidationService.invalidateByPattern('ide:*');
      }).not.toThrow();
      
      // Restore original method
      cacheService.delete = originalDelete;
    });

    it('should handle missing event handlers gracefully', () => {
      // Simulate missing event handler
      const missingHandler = mockEventCoordinator.on.mock.calls
        .find(call => call[0] === 'missing:event');
      
      expect(missingHandler).toBeUndefined();
      
      // Should not cause issues
      expect(() => {
        cacheInvalidationService.triggerInvalidation('missing:event', {});
      }).not.toThrow();
    });
  });

  describe('Integration Scenarios', () => {
    beforeEach(async () => {
      await cacheService.initialize();
    });

    it('should handle complex IDE switching scenario', () => {
      // Set up complex test data
      cacheService.set('ide:9222', { port: 9222, data: 'ide1' }, 'ide', 'ide');
      cacheService.set('ide:9224', { port: 9224, data: 'ide2' }, 'ide', 'ide');
      cacheService.set('chat:9222', { port: 9222, messages: [] }, 'chat', 'chat');
      cacheService.set('chat:9224', { port: 9224, messages: [] }, 'chat', 'chat');
      cacheService.set('project:proj1', { project: 'data' }, 'project', 'project');
      cacheService.set('analysis:proj1', { analysis: 'data' }, 'codeQuality', 'analysis');
      
      // Simulate IDE switch from 9222 to 9224
      const ideSwitchHandler = mockEventCoordinator.on.mock.calls
        .find(call => call[0] === 'ide:switch')[1];
      
      ideSwitchHandler({ port: 9224 });
      
      // IDE and chat cache should be invalidated
      expect(cacheService.memoryCache.has('ide:9222')).toBe(false);
      expect(cacheService.memoryCache.has('ide:9224')).toBe(false);
      expect(cacheService.memoryCache.has('chat:9222')).toBe(false);
      expect(cacheService.memoryCache.has('chat:9224')).toBe(false);
      
      // Project and analysis cache should remain
      expect(cacheService.memoryCache.has('project:proj1')).toBe(true);
      expect(cacheService.memoryCache.has('analysis:proj1')).toBe(true);
    });

    it('should handle project analysis workflow', () => {
      // Set up project analysis data
      cacheService.set('project:proj1', { project: 'data' }, 'project', 'project');
      cacheService.set('analysis:codeQuality:proj1', { analysis: 'data1' }, 'codeQuality', 'analysis');
      cacheService.set('analysis:security:proj1', { analysis: 'data2' }, 'security', 'analysis');
      cacheService.set('analysis:performance:proj1', { analysis: 'data3' }, 'performance', 'analysis');
      
      // Simulate code quality analysis completion
      const analysisCompleteHandler = mockEventCoordinator.on.mock.calls
        .find(call => call[0] === 'analysis:complete')[1];
      
      analysisCompleteHandler({ type: 'codeQuality', projectId: 'proj1' });
      
      // Only code quality analysis should be invalidated
      expect(cacheService.memoryCache.has('analysis:codeQuality:proj1')).toBe(false);
      expect(cacheService.memoryCache.has('analysis:security:proj1')).toBe(true);
      expect(cacheService.memoryCache.has('analysis:performance:proj1')).toBe(true);
      expect(cacheService.memoryCache.has('project:proj1')).toBe(true);
    });

    it('should handle emergency global invalidation', () => {
      // Set up test data
      cacheService.set('ide:port1', { data: 1 }, 'ide', 'ide');
      cacheService.set('project:proj1', { data: 2 }, 'project', 'project');
      cacheService.set('analysis:proj1', { data: 3 }, 'codeQuality', 'analysis');
      
      // Perform emergency global invalidation
      cacheInvalidationService.emergencyGlobalInvalidation('System error');
      
      // All cache should be cleared
      expect(cacheService.memoryCache.size).toBe(0);
      expect(cacheService.namespaces.size).toBe(0);
      
      const stats = cacheInvalidationService.getStats();
      expect(stats.globalInvalidations).toBe(1);
    });
  });
});
