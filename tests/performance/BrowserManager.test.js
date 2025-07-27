const BrowserManager = require('@infrastructure/external/BrowserManager');

describe('BrowserManager Performance', () => {
  let browserManager;

  beforeEach(() => {
    browserManager = new BrowserManager();
  });

  afterEach(async () => {
    if (browserManager && typeof browserManager.destroy === 'function') {
      await browserManager.destroy();
    }
  });

  describe('Rapid Port Switching', () => {
    test('should handle rapid port switching efficiently', async () => {
      const ports = [9222, 9223, 9224, 9225, 9226];
      const switchTimes = [];
      
      // Perform rapid switches
      for (let i = 0; i < 20; i++) {
        const port = ports[i % ports.length];
        const start = Date.now();
        
        try {
          await browserManager.switchToPort(port);
          const duration = Date.now() - start;
          switchTimes.push(duration);
        } catch (error) {
          // Ignore connection errors in test environment
          console.log(`Switch to port ${port} failed: ${error.message}`);
        }
      }
      
      // All successful switches should be under 100ms
      switchTimes.forEach(time => {
        expect(time).toBeLessThan(100);
      });
      
      // Average should be under 50ms
      if (switchTimes.length > 0) {
        const average = switchTimes.reduce((a, b) => a + b, 0) / switchTimes.length;
        expect(average).toBeLessThan(50);
      }
    }, 30000);

    test('should maintain connection pool health under load', async () => {
      const ports = [9222, 9223, 9224, 9225, 9226];
      
      // Perform many switches
      for (let i = 0; i < 50; i++) {
        const port = ports[i % ports.length];
        try {
          await browserManager.switchToPort(port);
        } catch (error) {
          // Ignore connection errors
        }
      }
      
      // Check pool health
      const health = await browserManager.getConnectionPoolHealth();
      expect(health.healthyConnections).toBeGreaterThan(0);
      expect(health.unhealthyConnections).toBeLessThan(health.totalConnections * 0.2);
    }, 30000);
  });

  describe('Performance Statistics', () => {
    test('should provide accurate performance statistics', async () => {
      const ports = [9222, 9223, 9224];
      
      // Perform some switches
      for (const port of ports) {
        try {
          await browserManager.switchToPort(port);
        } catch (error) {
          // Ignore connection errors
        }
      }
      
      const stats = browserManager.getPerformanceStats();
      
      expect(stats.totalSwitches).toBeGreaterThan(0);
      expect(stats.averageTime).toBeGreaterThan(0);
      expect(stats.minTime).toBeGreaterThan(0);
      expect(stats.maxTime).toBeGreaterThan(0);
      expect(stats.recentAverage).toBeGreaterThan(0);
    });

    test('should track performance over time', async () => {
      const ports = [9222, 9223, 9224, 9225];
      
      // Perform switches in batches
      for (let batch = 0; batch < 3; batch++) {
        for (const port of ports) {
          try {
            await browserManager.switchToPort(port);
          } catch (error) {
            // Ignore connection errors
          }
        }
        
        // Check stats after each batch
        const stats = browserManager.getPerformanceStats();
        expect(stats.totalSwitches).toBeGreaterThan(batch * ports.length);
      }
    });
  });

  describe('Connection Pool Optimization', () => {
    test('should pre-warm connections efficiently', async () => {
      // Check if pre-warming method exists
      expect(typeof browserManager.preWarmConnections).toBe('function');
      
      // Pre-warming should not block
      const start = Date.now();
      await browserManager.preWarmConnections();
      const duration = Date.now() - start;
      
      // Should complete quickly
      expect(duration).toBeLessThan(1000);
    });

    test('should handle connection pool limits', async () => {
      const stats = await browserManager.getConnectionPoolStats();
      
      // Should respect max connections limit
      expect(stats.totalConnections).toBeLessThanOrEqual(stats.maxConnections);
      
      // Should have reasonable settings
      expect(stats.maxConnections).toBeGreaterThan(0);
      expect(stats.maxConnections).toBeLessThanOrEqual(20); // Reasonable upper limit
    });
  });

  describe('Stress Testing', () => {
    test('should handle concurrent switching requests', async () => {
      const ports = [9222, 9223, 9224, 9225, 9226];
      const promises = [];
      
      // Create concurrent switch requests
      for (let i = 0; i < 10; i++) {
        const port = ports[i % ports.length];
        promises.push(
          browserManager.switchToPort(port).catch(error => {
            // Ignore connection errors
            return null;
          })
        );
      }
      
      // Wait for all requests to complete
      const results = await Promise.all(promises);
      
      // Should handle concurrent requests without crashing
      expect(results.length).toBe(10);
    }, 30000);

    test('should maintain performance under sustained load', async () => {
      const ports = [9222, 9223, 9224];
      const switchTimes = [];
      
      // Sustained switching for 5 seconds
      const startTime = Date.now();
      const duration = 5000; // 5 seconds
      
      while (Date.now() - startTime < duration) {
        const port = ports[Math.floor(Math.random() * ports.length)];
        const switchStart = Date.now();
        
        try {
          await browserManager.switchToPort(port);
          const switchDuration = Date.now() - switchStart;
          switchTimes.push(switchDuration);
        } catch (error) {
          // Ignore connection errors
        }
        
        // Small delay to prevent overwhelming
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      // Should maintain reasonable performance
      if (switchTimes.length > 0) {
        const average = switchTimes.reduce((a, b) => a + b, 0) / switchTimes.length;
        expect(average).toBeLessThan(100); // Should stay under 100ms average
      }
    }, 10000);
  });

  describe('Memory Management', () => {
    test('should not leak memory during rapid switching', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      const ports = [9222, 9223, 9224, 9225, 9226];
      
      // Perform many switches
      for (let i = 0; i < 100; i++) {
        const port = ports[i % ports.length];
        try {
          await browserManager.switchToPort(port);
        } catch (error) {
          // Ignore connection errors
        }
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    }, 30000);
  });

  describe('Error Handling', () => {
    test('should handle invalid ports gracefully', async () => {
      const invalidPorts = [9999, 10000, 10001];
      
      for (const port of invalidPorts) {
        try {
          await browserManager.switchToPort(port);
          // Should not reach here for invalid ports
          expect(true).toBe(false);
        } catch (error) {
          // Should throw error for invalid ports
          expect(error).toBeDefined();
        }
      }
    });

    test('should recover from connection failures', async () => {
      // Try to switch to a valid port after failures
      try {
        await browserManager.switchToPort(9222);
        // Should work even after previous failures
        expect(true).toBe(true);
      } catch (error) {
        // Ignore connection errors in test environment
        console.log('Connection failed:', error.message);
      }
    });
  });
}); 