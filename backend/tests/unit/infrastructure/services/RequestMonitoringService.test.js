/**
 * RequestMonitoringService Unit Tests
 * 
 * Comprehensive tests for request monitoring functionality,
 * analytics tracking, and performance insights.
 */

import { jest } from '@jest/globals';
import RequestMonitoringService from '@/infrastructure/services/RequestMonitoringService';

// Mock logger
jest.mock('@/infrastructure/logging/Logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('RequestMonitoringService', () => {
  let service;

  beforeEach(() => {
    service = new RequestMonitoringService();
  });

  afterEach(() => {
    service.destroy();
  });

  describe('Constructor', () => {
    test('should initialize with default configuration', () => {
      expect(service.maxRequests).toBe(1000);
      expect(service.cleanupInterval).toBe(5 * 60 * 1000); // 5 minutes
      expect(service.exportFormats).toEqual(['json', 'csv']);
    });

    test('should initialize with custom configuration', () => {
      const customService = new RequestMonitoringService({
        maxRequests: 500,
        cleanupInterval: 2 * 60 * 1000
      });

      expect(customService.maxRequests).toBe(500);
      expect(customService.cleanupInterval).toBe(2 * 60 * 1000);

      customService.destroy();
    });
  });

  describe('Request Tracking', () => {
    test('should track request start', () => {
      const requestId = service.trackRequestStart('/api/test', 'user123', { method: 'GET' });

      expect(requestId).toBeDefined();
      expect(service.requests.has(requestId)).toBe(true);
      expect(service.performanceMetrics.totalRequests).toBe(1);
    });

    test('should track request completion', () => {
      const requestId = service.trackRequestStart('/api/test', 'user123');
      
      service.trackRequestComplete(requestId, true, 150, { success: true });

      const request = service.requests.get(requestId);
      expect(request.status).toBe('completed');
      expect(request.responseTime).toBe(150);
      expect(request.success).toBe(true);
      expect(service.performanceMetrics.successfulRequests).toBe(1);
    });

    test('should track failed request', () => {
      const requestId = service.trackRequestStart('/api/test', 'user123');
      
      service.trackRequestComplete(requestId, false, 500, new Error('Test error'));

      const request = service.requests.get(requestId);
      expect(request.success).toBe(false);
      expect(request.error).toBeInstanceOf(Error);
      expect(service.performanceMetrics.failedRequests).toBe(1);
    });

    test('should track duplicate request', () => {
      service.trackDuplicateRequest('/api/test', 'user123');

      const stats = service.getStats();
      expect(stats.endpoints['/api/test'].duplicateRequests).toBe(1);
      expect(stats.users['user123'].duplicateRequests).toBe(1);
    });
  });

  describe('Statistics', () => {
    test('should calculate correct statistics', () => {
      // Track multiple requests
      const req1 = service.trackRequestStart('/api/test1', 'user1');
      const req2 = service.trackRequestStart('/api/test2', 'user2');
      
      service.trackRequestComplete(req1, true, 100, { success: true });
      service.trackRequestComplete(req2, false, 200, new Error('Error'));

      const stats = service.getStats();

      expect(stats.performance.totalRequests).toBe(2);
      expect(stats.performance.successfulRequests).toBe(1);
      expect(stats.performance.failedRequests).toBe(1);
      expect(stats.performance.successRate).toBe('50.00%');
      expect(stats.performance.averageResponseTime).toBe(150);
    });

    test('should track endpoint statistics', () => {
      const req1 = service.trackRequestStart('/api/test', 'user1');
      const req2 = service.trackRequestStart('/api/test', 'user2');
      
      service.trackRequestComplete(req1, true, 100, { success: true });
      service.trackRequestComplete(req2, false, 200, new Error('Error'));

      const stats = service.getStats();
      const endpointStats = stats.endpoints['/api/test'];

      expect(endpointStats.totalRequests).toBe(2);
      expect(endpointStats.successfulRequests).toBe(1);
      expect(endpointStats.failedRequests).toBe(1);
      expect(endpointStats.successRate).toBe('50.00%');
    });

    test('should track user statistics', () => {
      const req1 = service.trackRequestStart('/api/test', 'user1');
      const req2 = service.trackRequestStart('/api/test', 'user1');
      
      service.trackRequestComplete(req1, true, 100, { success: true });
      service.trackRequestComplete(req2, true, 150, { success: true });

      const stats = service.getStats();
      const userStats = stats.users['user1'];

      expect(userStats.totalRequests).toBe(2);
      expect(userStats.successfulRequests).toBe(2);
      expect(userStats.failedRequests).toBe(0);
      expect(userStats.successRate).toBe('100.00%');
    });
  });

  describe('Request Queries', () => {
    test('should get recent requests', () => {
      const req1 = service.trackRequestStart('/api/test1', 'user1');
      const req2 = service.trackRequestStart('/api/test2', 'user2');
      
      service.trackRequestComplete(req1, true, 100, { success: true });
      service.trackRequestComplete(req2, false, 200, new Error('Error'));

      const recent = service.getRecentRequests(10);
      expect(recent.length).toBe(2);
      expect(recent[0].endpoint).toBe('/api/test2'); // Most recent first
    });

    test('should get slow requests', () => {
      const req1 = service.trackRequestStart('/api/test1', 'user1');
      const req2 = service.trackRequestStart('/api/test2', 'user2');
      
      service.trackRequestComplete(req1, true, 500, { success: true });
      service.trackRequestComplete(req2, true, 1500, { success: true });

      const slow = service.getSlowRequests(1000);
      expect(slow.length).toBe(1);
      expect(slow[0].responseTime).toBe(1500);
    });

    test('should get failed requests', () => {
      const req1 = service.trackRequestStart('/api/test1', 'user1');
      const req2 = service.trackRequestStart('/api/test2', 'user2');
      
      service.trackRequestComplete(req1, true, 100, { success: true });
      service.trackRequestComplete(req2, false, 200, new Error('Error'));

      const failed = service.getFailedRequests();
      expect(failed.length).toBe(1);
      expect(failed[0].success).toBe(false);
    });
  });

  describe('Data Export', () => {
    test('should export data as JSON', () => {
      const req1 = service.trackRequestStart('/api/test', 'user1');
      service.trackRequestComplete(req1, true, 100, { success: true });

      const jsonData = service.exportData('json');
      const parsed = JSON.parse(jsonData);

      expect(parsed.stats).toBeDefined();
      expect(parsed.requests).toBeDefined();
      expect(parsed.timestamp).toBeDefined();
    });

    test('should export data as CSV', () => {
      const req1 = service.trackRequestStart('/api/test', 'user1');
      service.trackRequestComplete(req1, true, 100, { success: true });

      const csvData = service.exportData('csv');
      expect(csvData).toContain(',');
      expect(csvData).toContain('id,endpoint,userId');
    });

    test('should throw error for unsupported format', () => {
      expect(() => service.exportData('xml')).toThrow('Unsupported export format: xml');
    });
  });

  describe('Cleanup', () => {
    test('should cleanup old requests', () => {
      // Mock Date.now to simulate old requests
      const originalNow = Date.now;
      Date.now = jest.fn(() => 1000);

      const req1 = service.trackRequestStart('/api/test', 'user1');
      service.trackRequestComplete(req1, true, 100, { success: true });

      // Advance time to make request old
      Date.now = jest.fn(() => 25 * 60 * 60 * 1000); // 25 hours later

      service.cleanup();

      expect(service.requests.size).toBe(0);

      // Restore Date.now
      Date.now = originalNow;
    });
  });

  describe('Statistics Reset', () => {
    test('should reset all statistics', () => {
      const req1 = service.trackRequestStart('/api/test', 'user1');
      service.trackRequestComplete(req1, true, 100, { success: true });

      service.resetStats();

      expect(service.requests.size).toBe(0);
      expect(service.endpointStats.size).toBe(0);
      expect(service.userStats.size).toBe(0);
      expect(service.performanceMetrics.totalRequests).toBe(0);
    });
  });

  describe('Request Details', () => {
    test('should get request details', () => {
      const requestId = service.trackRequestStart('/api/test', 'user1');
      service.trackRequestComplete(requestId, true, 100, { success: true });

      const details = service.getRequestDetails(requestId);
      expect(details).toBeDefined();
      expect(details.endpoint).toBe('/api/test');
      expect(details.userId).toBe('user1');
    });

    test('should return null for non-existent request', () => {
      const details = service.getRequestDetails('non-existent');
      expect(details).toBeNull();
    });
  });

  describe('Performance Metrics', () => {
    test('should calculate average response time correctly', () => {
      const req1 = service.trackRequestStart('/api/test1', 'user1');
      const req2 = service.trackRequestStart('/api/test2', 'user2');
      
      service.trackRequestComplete(req1, true, 100, { success: true });
      service.trackRequestComplete(req2, true, 300, { success: true });

      const stats = service.getStats();
      expect(stats.performance.averageResponseTime).toBe(200);
    });

    test('should handle zero requests gracefully', () => {
      const stats = service.getStats();
      expect(stats.performance.successRate).toBe('0.00%');
      expect(stats.performance.averageResponseTime).toBe(0);
    });
  });
}); 