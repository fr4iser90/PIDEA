/**
 * RequestQueuingService Unit Tests
 *
 * Comprehensive tests for the RequestQueuingService to ensure
 * proper request queuing, deduplication, and performance tracking.
 */

import { jest } from '@jest/globals';
import RequestQueuingService from '../../../../../infrastructure/services/RequestQueuingService';

// Mock logger
jest.mock('@logging/Logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('RequestQueuingService', () => {
  let service;
  let mockRequestFn;

  beforeEach(() => {
    service = new RequestQueuingService();
    mockRequestFn = jest.fn().mockResolvedValue('test-result');
  });

  afterEach(() => {
    service.destroy();
  });

  describe('Constructor', () => {
    it('should initialize with default options', () => {
      const defaultService = new RequestQueuingService();
      
      expect(defaultService.maxConcurrent).toBe(5);
      expect(defaultService.requestTimeout).toBe(30000);
      expect(defaultService.queue).toEqual([]);
      expect(defaultService.processing.size).toBe(0);
      
      defaultService.destroy();
    });

    it('should initialize with custom options', () => {
      const customService = new RequestQueuingService({
        maxConcurrent: 10,
        requestTimeout: 60000
      });
      
      expect(customService.maxConcurrent).toBe(10);
      expect(customService.requestTimeout).toBe(60000);
      
      customService.destroy();
    });
  });

  describe('queueRequest', () => {
    it('should queue and execute a single request', async () => {
      const result = await service.queueRequest('test-key', mockRequestFn);
      
      expect(result).toBe('test-result');
      expect(mockRequestFn).toHaveBeenCalledTimes(1);
      expect(service.queue.length).toBe(0);
      expect(service.processing.size).toBe(0);
    });

    it('should handle concurrent requests within limit', async () => {
      const promises = [];
      const results = [];
      
      // Create 3 concurrent requests (within maxConcurrent of 5)
      for (let i = 0; i < 3; i++) {
        const requestFn = jest.fn().mockResolvedValue(`result-${i}`);
        promises.push(
          service.queueRequest(`key-${i}`, requestFn)
            .then(result => results.push(result))
        );
      }
      
      await Promise.all(promises);
      
      expect(results).toEqual(['result-0', 'result-1', 'result-2']);
      expect(service.queue.length).toBe(0);
      expect(service.processing.size).toBe(0);
    });

    it('should queue requests when at concurrent limit', async () => {
      // Create 6 requests (exceeds maxConcurrent of 5)
      const promises = [];
      const slowRequestFn = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('slow-result'), 100))
      );
      
      for (let i = 0; i < 6; i++) {
        promises.push(service.queueRequest(`key-${i}`, slowRequestFn));
      }
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(6);
      expect(results.every(r => r === 'slow-result')).toBe(true);
      expect(service.queue.length).toBe(0);
      expect(service.processing.size).toBe(0);
    });

    it('should deduplicate concurrent requests with same key', async () => {
      const requestFn1 = jest.fn().mockResolvedValue('result-1');
      const requestFn2 = jest.fn().mockResolvedValue('result-2');
      
      const promise1 = service.queueRequest('same-key', requestFn1);
      const promise2 = service.queueRequest('same-key', requestFn2);
      
      const [result1, result2] = await Promise.all([promise1, promise2]);
      
      expect(result1).toBe('result-1');
      expect(result2).toBe('result-1'); // Should get same result
      expect(requestFn1).toHaveBeenCalledTimes(1);
      expect(requestFn2).not.toHaveBeenCalled(); // Second request should not execute
    });

    it('should handle request timeouts', async () => {
      const timeoutRequestFn = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('timeout-result'), 1000))
      );
      
      await expect(
        service.queueRequest('timeout-key', timeoutRequestFn, { timeout: 100 })
      ).rejects.toThrow('Request timeout');
    });

    it('should handle request errors', async () => {
      const errorRequestFn = jest.fn().mockRejectedValue(new Error('Request failed'));
      
      await expect(
        service.queueRequest('error-key', errorRequestFn)
      ).rejects.toThrow('Request failed');
    });
  });

  describe('Statistics', () => {
    it('should track request statistics correctly', async () => {
      const successFn = jest.fn().mockResolvedValue('success');
      const errorFn = jest.fn().mockRejectedValue(new Error('error'));
      
      // Execute successful request
      await service.queueRequest('success-key', successFn);
      
      // Execute failed request
      try {
        await service.queueRequest('error-key', errorFn);
      } catch (error) {
        // Expected error
      }
      
      const stats = service.getStats();
      
      expect(stats.totalRequests).toBe(2);
      expect(stats.processedRequests).toBe(2);
      expect(stats.failedRequests).toBe(1);
      expect(stats.successRate).toBe('50.00%');
      expect(stats.uptime).toBeGreaterThan(0);
    });

    it('should reset statistics', async () => {
      await service.queueRequest('test-key', mockRequestFn);
      
      service.resetStats();
      
      const stats = service.getStats();
      expect(stats.totalRequests).toBe(0);
      expect(stats.processedRequests).toBe(0);
      expect(stats.failedRequests).toBe(0);
    });
  });

  describe('Queue Management', () => {
    it('should get queue status', () => {
      const status = service.getQueueStatus();
      
      expect(status).toEqual({
        queueLength: 0,
        processingCount: 0,
        maxConcurrent: 5,
        isFull: false
      });
    });

    it('should clear queue', async () => {
      // Add a request to queue
      const slowRequestFn = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('result'), 1000))
      );
      
      // Start 6 requests to fill the queue
      const promises = [];
      for (let i = 0; i < 6; i++) {
        promises.push(service.queueRequest(`key-${i}`, slowRequestFn));
      }
      
      // Clear queue before requests complete
      service.clearQueue();
      
      // Wait for processing requests to complete
      await Promise.allSettled(promises);
      
      expect(service.queue.length).toBe(0);
    });

    it('should cancel specific request', async () => {
      const slowRequestFn = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('result'), 1000))
      );
      
      // Start a request
      const promise = service.queueRequest('cancel-key', slowRequestFn);
      
      // Cancel it
      service.cancelRequest('cancel-key');
      
      await expect(promise).rejects.toThrow('Request cancelled');
    });
  });

  describe('Error Handling', () => {
    it('should handle processing request not found', async () => {
      // This tests the edge case where a request is removed from processing
      // before the waitForExistingRequest method is called
      const requestFn = jest.fn().mockResolvedValue('result');
      
      const promise1 = service.queueRequest('test-key', requestFn);
      const promise2 = service.queueRequest('test-key', requestFn);
      
      // Manually remove from processing to simulate edge case
      service.processing.delete('test-key');
      
      await expect(promise2).rejects.toThrow('Processing request not found');
      await expect(promise1).resolves.toBe('result');
    });
  });

  describe('Resource Management', () => {
    it('should destroy service and cleanup resources', async () => {
      const slowRequestFn = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('result'), 1000))
      );
      
      // Start a request
      const promise = service.queueRequest('destroy-key', slowRequestFn);
      
      // Destroy service
      service.destroy();
      
      await expect(promise).rejects.toThrow('Service destroyed');
      expect(service.queue.length).toBe(0);
      expect(service.processing.size).toBe(0);
    });
  });
}); 