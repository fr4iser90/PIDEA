const BrowserManager = require('@infrastructure/external/BrowserManager');
const ConnectionPool = require('@infrastructure/external/ConnectionPool');

// Mock Playwright
jest.mock('playwright', () => ({
  chromium: {
    connectOverCDP: jest.fn()
  }
}));

// Mock Logger
jest.mock('@logging/Logger', () => {
  return jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }));
});

describe('BrowserManager Performance Tests', () => {
  let browserManager;
  let mockBrowser;
  let mockPage;
  let mockContext;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup mock browser and page
    mockPage = {
      title: jest.fn().mockResolvedValue('Test Page'),
      isClosed: jest.fn().mockReturnValue(false),
      waitForSelector: jest.fn().mockResolvedValue(true),
      $: jest.fn().mockResolvedValue(null),
      $$: jest.fn().mockResolvedValue([]),
      evaluate: jest.fn().mockResolvedValue({}),
      click: jest.fn().mockResolvedValue(),
      fill: jest.fn().mockResolvedValue(),
      press: jest.fn().mockResolvedValue(),
      waitForTimeout: jest.fn().mockResolvedValue(),
      keyboard: {
        press: jest.fn().mockResolvedValue()
      }
    };
    
    mockContext = {
      pages: jest.fn().mockReturnValue([mockPage])
    };
    
    mockBrowser = {
      contexts: jest.fn().mockReturnValue([mockContext]),
      close: jest.fn().mockResolvedValue(undefined)
    };
    
    const { chromium } = require('playwright');
    chromium.connectOverCDP.mockResolvedValue(mockBrowser);
    
    // Create browser manager
    browserManager = new BrowserManager();
  });

  afterEach(async () => {
    if (browserManager) {
      await browserManager.destroy();
    }
  });

  describe('IDE Switching Performance', () => {
    test('should achieve <100ms IDE switching time', async () => {
      const ports = [9222, 9223, 9224, 9225, 9226];
      const switchTimes = [];
      
      // First switch - should create connection
      const firstStart = Date.now();
      await browserManager.switchToPort(ports[0]);
      const firstSwitchTime = Date.now() - firstStart;
      switchTimes.push(firstSwitchTime);
      
      // Subsequent switches - should be instant
      for (let i = 1; i < ports.length; i++) {
        const start = Date.now();
        await browserManager.switchToPort(ports[i]);
        const switchTime = Date.now() - start;
        switchTimes.push(switchTime);
      }
      
      // Switch back to first port - should be instant
      const backStart = Date.now();
      await browserManager.switchToPort(ports[0]);
      const backSwitchTime = Date.now() - backStart;
      switchTimes.push(backSwitchTime);
      
      // Performance assertions
      expect(firstSwitchTime).toBeLessThan(1000); // First connection < 1s
      
      // All subsequent switches should be <100ms
      for (let i = 1; i < switchTimes.length; i++) {
        expect(switchTimes[i]).toBeLessThan(100);
      }
      
      // Average switch time should be <100ms
      const averageSwitchTime = switchTimes.reduce((a, b) => a + b, 0) / switchTimes.length;
      expect(averageSwitchTime).toBeLessThan(100);
      
      console.log('Switch times:', switchTimes);
      console.log('Average switch time:', averageSwitchTime, 'ms');
    });

    test('should handle 10+ rapid IDE switches per second', async () => {
      const ports = [9222, 9223, 9224, 9225, 9226];
      const iterations = 12; // 12 switches
      const startTime = Date.now();
      
      // Rapidly switch between ports
      for (let i = 0; i < iterations; i++) {
        const port = ports[i % ports.length];
        await browserManager.switchToPort(port);
      }
      
      const totalTime = Date.now() - startTime;
      const switchesPerSecond = (iterations / totalTime) * 1000;
      
      expect(switchesPerSecond).toBeGreaterThan(10);
      expect(totalTime).toBeLessThan(1200); // Should complete in <1.2s
      
      console.log(`Switches per second: ${switchesPerSecond.toFixed(2)}`);
      console.log(`Total time: ${totalTime}ms for ${iterations} switches`);
    });

    test('should maintain performance under stress', async () => {
      const ports = [9222, 9223, 9224, 9225, 9226, 9227, 9228, 9229, 9230, 9231];
      const iterations = 50;
      const switchTimes = [];
      
      const startTime = Date.now();
      
      // Stress test with many rapid switches
      for (let i = 0; i < iterations; i++) {
        const port = ports[i % ports.length];
        const switchStart = Date.now();
        await browserManager.switchToPort(port);
        const switchTime = Date.now() - switchStart;
        switchTimes.push(switchTime);
      }
      
      const totalTime = Date.now() - startTime;
      const averageSwitchTime = switchTimes.reduce((a, b) => a + b, 0) / switchTimes.length;
      const maxSwitchTime = Math.max(...switchTimes);
      
      // Performance assertions
      expect(averageSwitchTime).toBeLessThan(100); // Average < 100ms
      expect(maxSwitchTime).toBeLessThan(500); // Max < 500ms
      expect(totalTime).toBeLessThan(5000); // Total < 5s
      
      console.log(`Stress test results:`);
      console.log(`- Total time: ${totalTime}ms`);
      console.log(`- Average switch time: ${averageSwitchTime.toFixed(2)}ms`);
      console.log(`- Max switch time: ${maxSwitchTime}ms`);
      console.log(`- Switches per second: ${(iterations / totalTime * 1000).toFixed(2)}`);
    });
  });

  describe('Memory Usage', () => {
    test('should maintain memory usage < 10MB for 5 connections', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Create 5 connections
      const ports = [9222, 9223, 9224, 9225, 9226];
      for (const port of ports) {
        await browserManager.switchToPort(port);
      }
      
      // Wait a bit for memory to stabilize
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreaseMB = memoryIncrease / 1024 / 1024;
      
      expect(memoryIncreaseMB).toBeLessThan(10);
      expect(browserManager.connectionPool.connections.size).toBe(5);
      
      console.log(`Memory increase: ${memoryIncreaseMB.toFixed(2)}MB`);
    });

    test('should handle connection limit without memory leaks', async () => {
      const ports = [9222, 9223, 9224, 9225, 9226, 9227, 9228, 9229, 9230, 9231];
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Switch to all ports (should evict oldest when limit reached)
      for (const port of ports) {
        await browserManager.switchToPort(port);
      }
      
      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreaseMB = memoryIncrease / 1024 / 1024;
      
      expect(memoryIncreaseMB).toBeLessThan(10);
      expect(browserManager.connectionPool.connections.size).toBe(5); // Max connections
      
      console.log(`Memory increase with connection limit: ${memoryIncreaseMB.toFixed(2)}MB`);
    });
  });

  describe('Connection Pool Performance', () => {
    test('should reuse connections efficiently', async () => {
      const ports = [9222, 9223, 9224];
      const reuseTimes = [];
      
      // First round - create connections
      for (const port of ports) {
        const start = Date.now();
        await browserManager.switchToPort(port);
        const time = Date.now() - start;
        reuseTimes.push({ port, time, type: 'create' });
      }
      
      // Second round - reuse connections
      for (const port of ports) {
        const start = Date.now();
        await browserManager.switchToPort(port);
        const time = Date.now() - start;
        reuseTimes.push({ port, time, type: 'reuse' });
      }
      
      // Calculate average times
      const createTimes = reuseTimes.filter(r => r.type === 'create').map(r => r.time);
      const reuseTimes2 = reuseTimes.filter(r => r.type === 'reuse').map(r => r.time);
      
      const avgCreateTime = createTimes.reduce((a, b) => a + b, 0) / createTimes.length;
      const avgReuseTime = reuseTimes2.reduce((a, b) => a + b, 0) / reuseTimes2.length;
      
      // Reuse should be significantly faster
      expect(avgReuseTime).toBeLessThan(avgCreateTime * 0.1); // 10x faster
      expect(avgReuseTime).toBeLessThan(50); // < 50ms for reuse
      
      console.log(`Average create time: ${avgCreateTime.toFixed(2)}ms`);
      console.log(`Average reuse time: ${avgReuseTime.toFixed(2)}ms`);
      console.log(`Speedup: ${(avgCreateTime / avgReuseTime).toFixed(2)}x`);
    });

    test('should handle concurrent connection requests', async () => {
      const ports = [9222, 9223, 9224, 9225, 9226];
      const startTime = Date.now();
      
      // Make concurrent requests for different ports
      const promises = ports.map(port => browserManager.switchToPort(port));
      await Promise.all(promises);
      
      const totalTime = Date.now() - startTime;
      
      // Should be much faster than sequential (5 * 6s = 30s)
      expect(totalTime).toBeLessThan(5000); // < 5s total
      expect(browserManager.connectionPool.connections.size).toBe(5);
      
      console.log(`Concurrent connection time: ${totalTime}ms`);
    });
  });

  describe('Error Recovery Performance', () => {
    test('should recover quickly from connection failures', async () => {
      const { chromium } = require('playwright');
      
      // First, create a working connection
      await browserManager.switchToPort(9222);
      const workingConnection = browserManager.connectionPool.connections.get(9222);
      
      // Simulate connection failure
      chromium.connectOverCDP.mockRejectedValueOnce(new Error('Connection failed'));
      
      // Try to switch to a new port (should fail)
      const startTime = Date.now();
      try {
        await browserManager.switchToPort(9223);
      } catch (error) {
        // Expected to fail
      }
      const failureTime = Date.now() - startTime;
      
      // Reset mock to work again
      chromium.connectOverCDP.mockResolvedValue(mockBrowser);
      
      // Try to switch again (should succeed)
      const recoveryStart = Date.now();
      await browserManager.switchToPort(9223);
      const recoveryTime = Date.now() - recoveryStart;
      
      expect(failureTime).toBeLessThan(1000); // Failure should be fast
      expect(recoveryTime).toBeLessThan(1000); // Recovery should be fast
      
      console.log(`Failure time: ${failureTime}ms`);
      console.log(`Recovery time: ${recoveryTime}ms`);
    });
  });

  describe('Before/After Performance Comparison', () => {
    test('should demonstrate 95%+ performance improvement', async () => {
      // Simulate old behavior (6 seconds per switch)
      const oldSwitchTime = 6000; // 6 seconds
      const oldTotalTime = oldSwitchTime * 5; // 5 switches = 30 seconds
      
      // Measure new behavior
      const ports = [9222, 9223, 9224, 9225, 9226];
      const startTime = Date.now();
      
      for (const port of ports) {
        await browserManager.switchToPort(port);
      }
      
      const newTotalTime = Date.now() - startTime;
      const improvement = ((oldTotalTime - newTotalTime) / oldTotalTime) * 100;
      
      expect(improvement).toBeGreaterThan(95);
      expect(newTotalTime).toBeLessThan(oldTotalTime * 0.05); // < 5% of old time
      
      console.log(`Performance improvement: ${improvement.toFixed(2)}%`);
      console.log(`Old total time: ${oldTotalTime}ms`);
      console.log(`New total time: ${newTotalTime}ms`);
    });
  });
}); 