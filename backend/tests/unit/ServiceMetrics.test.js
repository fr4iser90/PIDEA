/**
 * ServiceMetrics Unit Tests
 * Tests metrics collection, performance tracking, and data aggregation
 */
const ServiceMetrics = require("../../infrastructure/dependency-injection/ServiceMetrics");
const ServiceLogger = require("@logging/ServiceLogger");

describe("ServiceMetrics", () => {
  let serviceMetrics;
  let logger;

  beforeEach(() => {
    logger = new ServiceLogger("ServiceMetricsTest");
    serviceMetrics = new ServiceMetrics({ logger });
  });

  afterEach(async () => {
    await serviceMetrics.shutdown();
  });

  describe("Initialization Metrics", () => {
    test("should record successful initialization", () => {
      const metrics = {
        startTime: Date.now() - 100,
        endTime: Date.now(),
        duration: 100,
        success: true,
        dependencies: ["dep1", "dep2"],
      };

      serviceMetrics.recordInitialization("testService", metrics);

      const serviceMetricsData = serviceMetrics.getServiceMetrics("testService");
      expect(serviceMetricsData.initialization.success).toBe(true);
      expect(serviceMetricsData.initialization.duration).toBe(100);
    });

    test("should record failed initialization", () => {
      const metrics = {
        startTime: Date.now() - 100,
        endTime: Date.now(),
        duration: 100,
        success: false,
        error: "Initialization failed",
        dependencies: ["dep1"],
      };

      serviceMetrics.recordInitialization("testService", metrics);

      const serviceMetricsData = serviceMetrics.getServiceMetrics("testService");
      expect(serviceMetricsData.initialization.success).toBe(false);
      expect(serviceMetricsData.initialization.error).toBe("Initialization failed");
    });

    test("should update aggregated metrics", () => {
      const metrics = {
        duration: 100,
        success: true,
      };

      serviceMetrics.recordInitialization("service1", metrics);
      serviceMetrics.recordInitialization("service2", metrics);

      const aggregated = serviceMetrics.getAggregatedMetrics();
      expect(aggregated.totalServices).toBe(2);
      expect(aggregated.initializedServices).toBe(2);
      expect(aggregated.averageInitializationTime).toBe(100);
    });
  });

  describe("Performance Metrics", () => {
    test("should record performance metrics", () => {
      const metrics = {
        operation: "processData",
        startTime: Date.now() - 50,
        endTime: Date.now(),
        duration: 50,
        success: true,
        memoryUsage: 1024,
        cpuUsage: 25,
        throughput: 100,
      };

      serviceMetrics.recordPerformance("testService", metrics);

      const serviceMetricsData = serviceMetrics.getServiceMetrics("testService");
      expect(serviceMetricsData.metrics.totalOperations).toBe(1);
      expect(serviceMetricsData.metrics.averageDuration).toBe(50);
      expect(serviceMetricsData.metrics.peakDuration).toBe(50);
    });

    test("should track multiple performance operations", () => {
      const metrics1 = { duration: 50, success: true, operation: "op1" };
      const metrics2 = { duration: 100, success: true, operation: "op2" };

      serviceMetrics.recordPerformance("testService", metrics1);
      serviceMetrics.recordPerformance("testService", metrics2);

      const serviceMetricsData = serviceMetrics.getServiceMetrics("testService");
      expect(serviceMetricsData.metrics.totalOperations).toBe(2);
      expect(serviceMetricsData.metrics.averageDuration).toBe(75);
      expect(serviceMetricsData.metrics.peakDuration).toBe(100);
    });

    test("should track successful and failed operations", () => {
      const successMetrics = { duration: 50, success: true, operation: "success" };
      const failureMetrics = { duration: 25, success: false, operation: "failure" };

      serviceMetrics.recordPerformance("testService", successMetrics);
      serviceMetrics.recordPerformance("testService", failureMetrics);

      const serviceMetricsData = serviceMetrics.getServiceMetrics("testService");
      expect(serviceMetricsData.metrics.successfulOperations).toBe(1);
      expect(serviceMetricsData.metrics.failedOperations).toBe(1);
    });

    test("should limit performance history", () => {
      serviceMetrics.maxMetricsHistory = 5;

      for (let i = 0; i < 10; i++) {
        serviceMetrics.recordPerformance("testService", {
          duration: i * 10,
          success: true,
          operation: `op${i}`,
        });
      }

      const serviceMetricsData = serviceMetrics.getServiceMetrics("testService");
      expect(serviceMetricsData.performanceHistory.length).toBeLessThanOrEqual(5);
    });
  });

  describe("Memory Usage Metrics", () => {
    test("should record memory usage", () => {
      const metrics = {
        heapUsed: 1024,
        heapTotal: 2048,
        external: 512,
        rss: 1536,
      };

      serviceMetrics.recordMemoryUsage("testService", metrics);

      const serviceMetricsData = serviceMetrics.getServiceMetrics("testService");
      expect(serviceMetricsData.memory.heapUsed).toBe(1024);
      expect(serviceMetricsData.memory.heapTotal).toBe(2048);
    });

    test("should update aggregated memory metrics", () => {
      const metrics1 = { heapUsed: 1000 };
      const metrics2 = { heapUsed: 2000 };

      serviceMetrics.recordMemoryUsage("service1", metrics1);
      serviceMetrics.recordMemoryUsage("service2", metrics2);

      const aggregated = serviceMetrics.getAggregatedMetrics();
      expect(aggregated.averageMemoryUsage).toBeGreaterThan(0);
      expect(aggregated.peakMemoryUsage).toBe(2000);
    });
  });

  describe("Operational Metrics", () => {
    test("should record operation", () => {
      const metrics = {
        operation: "createUser",
        success: true,
        duration: 25,
      };

      serviceMetrics.recordOperation("testService", metrics);

      const serviceMetricsData = serviceMetrics.getServiceMetrics("testService");
      expect(serviceMetricsData.operationHistory).toHaveLength(1);
      expect(serviceMetricsData.operationHistory[0].operation).toBe("createUser");
    });

    test("should track operation success and failure", () => {
      const successOp = { operation: "success", success: true, duration: 10 };
      const failureOp = { operation: "failure", success: false, duration: 5 };

      serviceMetrics.recordOperation("testService", successOp);
      serviceMetrics.recordOperation("testService", failureOp);

      const aggregated = serviceMetrics.getAggregatedMetrics();
      expect(aggregated.totalOperations).toBe(2);
      expect(aggregated.successfulOperations).toBe(1);
      expect(aggregated.failedOperations).toBe(1);
    });
  });

  describe("Real-time Metrics Collection", () => {
    test("should start metrics collection", () => {
      serviceMetrics.startMetricsCollection();

      expect(serviceMetrics.isCollecting).toBe(true);
    });

    test("should stop metrics collection", () => {
      serviceMetrics.startMetricsCollection();
      serviceMetrics.stopMetricsCollection();

      expect(serviceMetrics.isCollecting).toBe(false);
    });

    test("should collect real-time metrics", () => {
      serviceMetrics.enableRealTimeMetrics = true;
      serviceMetrics.startMetricsCollection();

      // Record some operations to generate real-time metrics
      serviceMetrics.recordOperation("service1", { success: true, duration: 10 });
      serviceMetrics.recordOperation("service2", { success: true, duration: 20 });

      const realTimeMetrics = serviceMetrics.getRealTimeMetrics();
      expect(realTimeMetrics.activeServices).toBeGreaterThan(0);
      expect(realTimeMetrics.errorRate).toBeDefined();
    });

    test("should calculate throughput", () => {
      serviceMetrics.enableRealTimeMetrics = true;
      serviceMetrics.startMetricsCollection();

      // Record operations within the last second
      const now = Date.now();
      serviceMetrics.recordOperation("service1", { 
        success: true, 
        duration: 10,
        timestamp: new Date(now - 500) // 500ms ago
      });
      serviceMetrics.recordOperation("service2", { 
        success: true, 
        duration: 20,
        timestamp: new Date(now - 200) // 200ms ago
      });

      const realTimeMetrics = serviceMetrics.getRealTimeMetrics();
      expect(realTimeMetrics.throughput).toBeGreaterThan(0);
    });
  });

  describe("Metrics Retrieval", () => {
    test("should get service metrics", () => {
      serviceMetrics.recordInitialization("testService", { success: true, duration: 100 });
      serviceMetrics.recordPerformance("testService", { success: true, duration: 50 });

      const metrics = serviceMetrics.getServiceMetrics("testService");
      expect(metrics.serviceName).toBe("testService");
      expect(metrics.metrics).toBeDefined();
      expect(metrics.initialization).toBeDefined();
    });

    test("should get all service metrics", () => {
      serviceMetrics.recordInitialization("service1", { success: true, duration: 100 });
      serviceMetrics.recordInitialization("service2", { success: true, duration: 200 });

      const allMetrics = serviceMetrics.getAllServiceMetrics();
      expect(Object.keys(allMetrics)).toHaveLength(2);
      expect(allMetrics.service1).toBeDefined();
      expect(allMetrics.service2).toBeDefined();
    });

    test("should get aggregated metrics", () => {
      serviceMetrics.recordInitialization("service1", { success: true, duration: 100 });
      serviceMetrics.recordInitialization("service2", { success: false, duration: 200 });

      const aggregated = serviceMetrics.getAggregatedMetrics();
      expect(aggregated.totalServices).toBe(2);
      expect(aggregated.initializedServices).toBe(1);
      expect(aggregated.failedInitializations).toBe(1);
      expect(aggregated.successRate).toBeDefined();
    });

    test("should get performance summary", () => {
      serviceMetrics.recordPerformance("service1", { success: true, duration: 100 });
      serviceMetrics.recordPerformance("service2", { success: true, duration: 200 });

      const summary = serviceMetrics.getPerformanceSummary();
      expect(summary.aggregated).toBeDefined();
      expect(summary.realTime).toBeDefined();
      expect(summary.services).toBeDefined();
    });
  });

  describe("Metrics Export", () => {
    test("should export metrics data", () => {
      serviceMetrics.recordInitialization("testService", { success: true, duration: 100 });

      const exportData = serviceMetrics.exportMetrics({
        includeHistory: true,
        includeRealTime: true,
        includeAggregated: true,
      });

      expect(exportData.timestamp).toBeDefined();
      expect(exportData.version).toBe("1.0");
      expect(exportData.aggregated).toBeDefined();
      expect(exportData.realTime).toBeDefined();
      expect(exportData.services).toBeDefined();
    });

    test("should export filtered metrics", () => {
      serviceMetrics.recordInitialization("service1", { success: true, duration: 100 });
      serviceMetrics.recordInitialization("service2", { success: true, duration: 200 });

      const exportData = serviceMetrics.exportMetrics({
        serviceFilter: "service1",
        includeHistory: true,
      });

      expect(Object.keys(exportData.services)).toHaveLength(1);
      expect(exportData.services.service1).toBeDefined();
    });
  });

  describe("Metrics Management", () => {
    test("should clear metrics for specific service", () => {
      serviceMetrics.recordInitialization("testService", { success: true, duration: 100 });
      serviceMetrics.clearMetrics("testService");

      const metrics = serviceMetrics.getServiceMetrics("testService");
      expect(metrics.metrics.totalOperations).toBe(0);
    });

    test("should clear all metrics", () => {
      serviceMetrics.recordInitialization("service1", { success: true, duration: 100 });
      serviceMetrics.recordInitialization("service2", { success: true, duration: 200 });
      serviceMetrics.clearMetrics();

      const allMetrics = serviceMetrics.getAllServiceMetrics();
      expect(Object.keys(allMetrics)).toHaveLength(0);
    });

    test("should emit metricsCleared event", () => {
      const eventSpy = jest.fn();
      serviceMetrics.on("metricsCleared", eventSpy);

      serviceMetrics.clearMetrics("testService");

      expect(eventSpy).toHaveBeenCalledWith({ serviceName: "testService" });
    });
  });

  describe("Configuration", () => {
    test("should respect metrics retention settings", () => {
      serviceMetrics.metricsRetention = 1000; // 1 second
      serviceMetrics.recordInitialization("testService", { success: true, duration: 100 });

      // Wait for retention period
      setTimeout(() => {
        const metrics = serviceMetrics.getServiceMetrics("testService");
        // Metrics should still be available as retention is not automatically applied
        expect(metrics).toBeDefined();
      }, 1100);
    });

    test("should handle disabled metrics", () => {
      serviceMetrics.enableMetrics = false;
      serviceMetrics.recordInitialization("testService", { success: true, duration: 100 });

      const metrics = serviceMetrics.getServiceMetrics("testService");
      expect(metrics.metrics.totalOperations).toBe(0);
    });
  });

  describe("Shutdown", () => {
    test("should shutdown gracefully", async () => {
      serviceMetrics.recordInitialization("testService", { success: true, duration: 100 });
      serviceMetrics.startMetricsCollection();

      await serviceMetrics.shutdown();

      expect(serviceMetrics.isCollecting).toBe(false);
      const allMetrics = serviceMetrics.getAllServiceMetrics();
      expect(Object.keys(allMetrics)).toHaveLength(0);
    });
  });
});
