/**
 * Unit tests for ExecutionQueue
 */
const ExecutionQueue = require('@/domain/workflows/execution/ExecutionQueue');

describe('ExecutionQueue', () => {
  let executionQueue;

  beforeEach(() => {
    executionQueue = new ExecutionQueue({
      maxSize: 10,
      enablePriority: true,
      enableRetry: true,
      maxRetries: 3
    });
  });

  describe('constructor', () => {
    it('should create queue with default options', () => {
      const queue = new ExecutionQueue();
      expect(queue.getLength()).toBe(0);
      expect(queue.getStatistics().maxSize).toBe(50);
    });

    it('should create queue with custom options', () => {
      const queue = new ExecutionQueue({
        maxSize: 20,
        enablePriority: false,
        enableRetry: false
      });
      expect(queue.getStatistics().maxSize).toBe(20);
    });
  });

  describe('queue management', () => {
    it('should enqueue execution', () => {
      const execution = { id: 'test-1', priority: 1 };
      const result = executionQueue.enqueue(execution);
      
      expect(result).toBe(true);
      expect(executionQueue.getLength()).toBe(1);
    });

    it('should dequeue execution', () => {
      const execution = { id: 'test-1', priority: 1 };
      executionQueue.enqueue(execution);
      
      const dequeued = executionQueue.dequeue();
      expect(dequeued).toEqual(execution);
      expect(executionQueue.getLength()).toBe(0);
    });

    it('should return null when dequeuing empty queue', () => {
      const dequeued = executionQueue.dequeue();
      expect(dequeued).toBeNull();
    });

    it('should respect max size limit', () => {
      const queue = new ExecutionQueue({ maxSize: 2 });
      
      expect(queue.enqueue({ id: 'test-1' })).toBe(true);
      expect(queue.enqueue({ id: 'test-2' })).toBe(true);
      expect(queue.enqueue({ id: 'test-3' })).toBe(false);
      
      expect(queue.getLength()).toBe(2);
    });

    it('should check if queue is empty', () => {
      expect(executionQueue.isEmpty()).toBe(true);
      
      executionQueue.enqueue({ id: 'test-1' });
      expect(executionQueue.isEmpty()).toBe(false);
    });
  });

  describe('priority queue', () => {
    it('should dequeue highest priority first', () => {
      executionQueue.enqueue({ id: 'test-1', priority: 1 });
      executionQueue.enqueue({ id: 'test-2', priority: 3 });
      executionQueue.enqueue({ id: 'test-3', priority: 2 });
      
      expect(executionQueue.dequeue().id).toBe('test-2'); // highest priority
      expect(executionQueue.dequeue().id).toBe('test-3'); // medium priority
      expect(executionQueue.dequeue().id).toBe('test-1'); // lowest priority
    });

    it('should handle same priority FIFO', () => {
      executionQueue.enqueue({ id: 'test-1', priority: 1 });
      executionQueue.enqueue({ id: 'test-2', priority: 1 });
      
      expect(executionQueue.dequeue().id).toBe('test-1');
      expect(executionQueue.dequeue().id).toBe('test-2');
    });
  });

  describe('retry mechanism', () => {
    it('should track retry attempts', () => {
      const execution = { id: 'test-1', priority: 1 };
      executionQueue.enqueue(execution);
      
      executionQueue.markForRetry('test-1');
      expect(executionQueue.getRetryCount('test-1')).toBe(1);
    });

    it('should not retry beyond max retries', () => {
      const execution = { id: 'test-1', priority: 1 };
      executionQueue.enqueue(execution);
      
      // Mark for retry multiple times
      for (let i = 0; i < 5; i++) {
        executionQueue.markForRetry('test-1');
      }
      
      expect(executionQueue.getRetryCount('test-1')).toBe(3); // max retries
    });
  });

  describe('statistics', () => {
    it('should provide queue statistics', () => {
      executionQueue.enqueue({ id: 'test-1', priority: 1 });
      executionQueue.enqueue({ id: 'test-2', priority: 2 });
      
      const stats = executionQueue.getStatistics();
      expect(stats.queueLength).toBe(2);
      expect(stats.maxSize).toBe(10);
      expect(stats.oldestItem).toBeDefined();
      expect(stats.newestItem).toBeDefined();
    });

    it('should track processing statistics', () => {
      executionQueue.enqueue({ id: 'test-1', priority: 1 });
      executionQueue.enqueue({ id: 'test-2', priority: 2 });
      
      executionQueue.dequeue(); // Move to processing
      
      const stats = executionQueue.getStatistics();
      expect(stats.processingLength).toBe(1);
      expect(stats.queueLength).toBe(1);
    });
  });

  describe('queue operations', () => {
    it('should clear queue', () => {
      executionQueue.enqueue({ id: 'test-1' });
      executionQueue.enqueue({ id: 'test-2' });
      
      executionQueue.clear();
      expect(executionQueue.getLength()).toBe(0);
    });

    it('should clear completed executions', () => {
      executionQueue.enqueue({ id: 'test-1' });
      executionQueue.dequeue(); // Move to processing
      executionQueue.markCompleted('test-1');
      
      executionQueue.clearCompleted();
      expect(executionQueue.getStatistics().completedLength).toBe(0);
    });

    it('should clear failed executions', () => {
      executionQueue.enqueue({ id: 'test-1' });
      executionQueue.dequeue(); // Move to processing
      executionQueue.markFailed('test-1', new Error('Test error'));
      
      executionQueue.clearFailed();
      expect(executionQueue.getStatistics().failedLength).toBe(0);
    });
  });

  describe('health status', () => {
    it('should report healthy status', () => {
      const health = executionQueue.getHealthStatus();
      expect(health.healthy).toBe(true);
      expect(health.queueLength).toBe(0);
      expect(health.maxSize).toBe(10);
    });

    it('should report unhealthy when full', () => {
      // Fill the queue
      for (let i = 0; i < 10; i++) {
        executionQueue.enqueue({ id: `test-${i}`, priority: 1 });
      }
      
      const health = executionQueue.getHealthStatus();
      expect(health.healthy).toBe(false);
      expect(health.queueLength).toBe(10);
    });
  });

  describe('configuration', () => {
    it('should update configuration', () => {
      executionQueue.updateConfiguration({ maxSize: 25 });
      expect(executionQueue.getStatistics().maxSize).toBe(25);
    });

    it('should get configuration', () => {
      const config = executionQueue.getConfiguration();
      expect(config.maxSize).toBe(10);
      expect(config.enablePriority).toBe(true);
      expect(config.enableRetry).toBe(true);
      expect(config.maxRetries).toBe(3);
    });
  });

  describe('JSON serialization', () => {
    it('should convert to JSON', () => {
      executionQueue.enqueue({ id: 'test-1', priority: 1 });
      
      const json = executionQueue.toJSON();
      expect(json).toHaveProperty('queueLength', 1);
      expect(json).toHaveProperty('maxSize', 10);
      expect(json).toHaveProperty('enablePriority', true);
      expect(json).toHaveProperty('enableRetry', true);
    });
  });
}); 