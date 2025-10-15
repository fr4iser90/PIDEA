/**
 * ServiceHealthMonitor Unit Tests
 * Tests health monitoring functionality, health checks, and status tracking
 */
const ServiceHealthMonitor = require("../../infrastructure/dependency-injection/ServiceHealthMonitor");
const ServiceLogger = require("@logging/ServiceLogger");

describe("ServiceHealthMonitor", () => {
  let healthMonitor;
  let mockContainer;
  let logger;

  beforeEach(() => {
    logger = new ServiceLogger("ServiceHealthMonitorTest");
    mockContainer = {
      resolve: jest.fn(),
    };
    healthMonitor = new ServiceHealthMonitor(mockContainer, { logger });
  });

  afterEach(async () => {
    await healthMonitor.shutdown();
  });

  describe("Health Check Registration", () => {
    test("should register health check for service", () => {
      const healthCheck = jest.fn().mockResolvedValue({ status: "healthy" });
      const options = { timeout: 5000, critical: true };

      healthMonitor.registerHealthCheck("testService", healthCheck, options);

      expect(healthMonitor.getServiceHealth("testService")).toBeDefined();
    });

    test("should not register health check when monitoring is disabled", () => {
      healthMonitor.enableHealthMonitoring = false;
      const healthCheck = jest.fn().mockResolvedValue({ status: "healthy" });

      healthMonitor.registerHealthCheck("testService", healthCheck);

      expect(healthMonitor.getServiceHealth("testService").status).toBe("unknown");
    });

    test("should emit healthCheckRegistered event", () => {
      const healthCheck = jest.fn().mockResolvedValue({ status: "healthy" });
      const eventSpy = jest.fn();
      
      healthMonitor.on("healthCheckRegistered", eventSpy);
      healthMonitor.registerHealthCheck("testService", healthCheck);

      expect(eventSpy).toHaveBeenCalledWith({
        serviceName: "testService",
        options: {},
      });
    });
  });

  describe("Health Check Execution", () => {
    test("should execute successful health check", async () => {
      const healthCheck = jest.fn().mockResolvedValue({ status: "healthy", data: "ok" });
      healthMonitor.registerHealthCheck("testService", healthCheck);

      const result = await healthMonitor.checkServiceHealth("testService");

      expect(result.status).toBe("healthy");
      expect(result.result).toEqual({ status: "healthy", data: "ok" });
      expect(result.responseTime).toBeGreaterThan(0);
    });

    test("should handle health check failure", async () => {
      const healthCheck = jest.fn().mockRejectedValue(new Error("Service unavailable"));
      healthMonitor.registerHealthCheck("testService", healthCheck);

      const result = await healthMonitor.checkServiceHealth("testService");

      expect(result.status).toBe("unhealthy");
      expect(result.error).toBe("Service unavailable");
    });

    test("should retry failed health checks", async () => {
      let attemptCount = 0;
      const healthCheck = jest.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error("Temporary failure");
        }
        return { status: "healthy" };
      });

      healthMonitor.registerHealthCheck("testService", healthCheck, {
        retryAttempts: 3,
        retryDelay: 10,
      });

      const result = await healthMonitor.checkServiceHealth("testService");

      expect(result.status).toBe("healthy");
      expect(attemptCount).toBe(3);
    });

    test("should timeout health checks", async () => {
      const healthCheck = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 10000))
      );

      healthMonitor.registerHealthCheck("testService", healthCheck, {
        timeout: 100,
      });

      const result = await healthMonitor.checkServiceHealth("testService");

      expect(result.status).toBe("unhealthy");
      expect(result.error).toBe("Health check timeout");
    });

    test("should emit healthCheckPassed event", async () => {
      const healthCheck = jest.fn().mockResolvedValue({ status: "healthy" });
      const eventSpy = jest.fn();
      
      healthMonitor.registerHealthCheck("testService", healthCheck);
      healthMonitor.on("healthCheckPassed", eventSpy);

      await healthMonitor.checkServiceHealth("testService");

      expect(eventSpy).toHaveBeenCalledWith({
        serviceName: "testService",
        responseTime: expect.any(Number),
        result: { status: "healthy" },
      });
    });

    test("should emit healthCheckFailed event", async () => {
      const healthCheck = jest.fn().mockRejectedValue(new Error("Service down"));
      const eventSpy = jest.fn();
      
      healthMonitor.registerHealthCheck("testService", healthCheck);
      healthMonitor.on("healthCheckFailed", eventSpy);

      await healthMonitor.checkServiceHealth("testService");

      expect(eventSpy).toHaveBeenCalledWith({
        serviceName: "testService",
        error: expect.any(Error),
        responseTime: expect.any(Number),
      });
    });
  });

  describe("Health Monitoring", () => {
    test("should start monitoring", () => {
      const healthCheck = jest.fn().mockResolvedValue({ status: "healthy" });
      healthMonitor.registerHealthCheck("testService", healthCheck);

      healthMonitor.startMonitoring();

      expect(healthMonitor.isMonitoring).toBe(true);
    });

    test("should stop monitoring", () => {
      healthMonitor.startMonitoring();
      healthMonitor.stopMonitoring();

      expect(healthMonitor.isMonitoring).toBe(false);
    });

    test("should perform health checks for all services", async () => {
      const healthCheck1 = jest.fn().mockResolvedValue({ status: "healthy" });
      const healthCheck2 = jest.fn().mockResolvedValue({ status: "healthy" });
      
      healthMonitor.registerHealthCheck("service1", healthCheck1);
      healthMonitor.registerHealthCheck("service2", healthCheck2);

      const results = await healthMonitor.performHealthChecks();

      expect(results.total).toBe(2);
      expect(results.healthy).toBe(2);
      expect(results.unhealthy).toBe(0);
    });

    test("should emit monitoringStarted event", () => {
      const eventSpy = jest.fn();
      healthMonitor.on("monitoringStarted", eventSpy);

      healthMonitor.startMonitoring();

      expect(eventSpy).toHaveBeenCalledWith({
        servicesCount: 0,
      });
    });

    test("should emit monitoringStopped event", () => {
      const eventSpy = jest.fn();
      healthMonitor.on("monitoringStopped", eventSpy);

      healthMonitor.startMonitoring();
      healthMonitor.stopMonitoring();

      expect(eventSpy).toHaveBeenCalled();
    });
  });

  describe("Health Status Tracking", () => {
    test("should track consecutive failures", async () => {
      const healthCheck = jest.fn().mockRejectedValue(new Error("Service down"));
      healthMonitor.registerHealthCheck("testService", healthCheck);

      await healthMonitor.checkServiceHealth("testService");
      await healthMonitor.checkServiceHealth("testService");

      const health = healthMonitor.getServiceHealth("testService");
      expect(health.consecutiveFailures).toBe(2);
    });

    test("should reset consecutive failures on success", async () => {
      const healthCheck = jest.fn()
        .mockRejectedValueOnce(new Error("Service down"))
        .mockResolvedValueOnce({ status: "healthy" });
      
      healthMonitor.registerHealthCheck("testService", healthCheck);

      await healthMonitor.checkServiceHealth("testService");
      await healthMonitor.checkServiceHealth("testService");

      const health = healthMonitor.getServiceHealth("testService");
      expect(health.consecutiveFailures).toBe(0);
    });

    test("should calculate average response time", async () => {
      const healthCheck = jest.fn()
        .mockResolvedValueOnce({ status: "healthy" })
        .mockResolvedValueOnce({ status: "healthy" });
      
      healthMonitor.registerHealthCheck("testService", healthCheck);

      await healthMonitor.checkServiceHealth("testService");
      await healthMonitor.checkServiceHealth("testService");

      const health = healthMonitor.getServiceHealth("testService");
      expect(health.averageResponseTime).toBeGreaterThan(0);
    });
  });

  describe("Overall Health Status", () => {
    test("should calculate overall health status", () => {
      const healthCheck1 = jest.fn().mockResolvedValue({ status: "healthy" });
      const healthCheck2 = jest.fn().mockResolvedValue({ status: "healthy" });
      
      healthMonitor.registerHealthCheck("service1", healthCheck1);
      healthMonitor.registerHealthCheck("service2", healthCheck2);

      const overallHealth = healthMonitor.getOverallHealth();

      expect(overallHealth.totalServices).toBe(2);
      expect(overallHealth.healthyServices).toBe(2);
      expect(overallHealth.healthPercentage).toBe(100);
    });

    test("should detect unhealthy services", async () => {
      const healthCheck1 = jest.fn().mockResolvedValue({ status: "healthy" });
      const healthCheck2 = jest.fn().mockRejectedValue(new Error("Service down"));
      
      healthMonitor.registerHealthCheck("service1", healthCheck1);
      healthMonitor.registerHealthCheck("service2", healthCheck2);

      await healthMonitor.checkServiceHealth("service2");

      const overallHealth = healthMonitor.getOverallHealth();

      expect(overallHealth.unhealthyServices).toBe(1);
      expect(overallHealth.healthPercentage).toBe(50);
    });
  });

  describe("Health History", () => {
    test("should store health check history", async () => {
      const healthCheck = jest.fn().mockResolvedValue({ status: "healthy" });
      healthMonitor.registerHealthCheck("testService", healthCheck);

      await healthMonitor.checkServiceHealth("testService");

      const history = healthMonitor.getServiceHealthHistory("testService");
      expect(history).toHaveLength(1);
      expect(history[0].status).toBe("healthy");
    });

    test("should limit history entries", async () => {
      const healthCheck = jest.fn().mockResolvedValue({ status: "healthy" });
      healthMonitor.registerHealthCheck("testService", healthCheck);

      // Perform more than 100 health checks
      for (let i = 0; i < 150; i++) {
        await healthMonitor.checkServiceHealth("testService");
      }

      const history = healthMonitor.getServiceHealthHistory("testService");
      expect(history.length).toBeLessThanOrEqual(100);
    });
  });

  describe("Critical Service Monitoring", () => {
    test("should emit critical health failure event", async () => {
      const healthCheck = jest.fn().mockRejectedValue(new Error("Critical service down"));
      const eventSpy = jest.fn();
      
      healthMonitor.registerHealthCheck("criticalService", healthCheck, { critical: true });
      healthMonitor.on("criticalHealthFailure", eventSpy);

      await healthMonitor.checkServiceHealth("criticalService");

      expect(eventSpy).toHaveBeenCalledWith({
        serviceName: "criticalService",
        error: expect.any(Error),
      });
    });
  });

  describe("Metrics", () => {
    test("should track health check metrics", async () => {
      const healthCheck = jest.fn().mockResolvedValue({ status: "healthy" });
      healthMonitor.registerHealthCheck("testService", healthCheck);

      await healthMonitor.checkServiceHealth("testService");

      const metrics = healthMonitor.getMetrics();
      expect(metrics.totalHealthChecks).toBe(1);
      expect(metrics.successfulChecks).toBe(1);
      expect(metrics.failedChecks).toBe(0);
    });

    test("should calculate success rate", async () => {
      const healthCheck = jest.fn()
        .mockResolvedValueOnce({ status: "healthy" })
        .mockRejectedValueOnce(new Error("Service down"));
      
      healthMonitor.registerHealthCheck("testService", healthCheck);

      await healthMonitor.checkServiceHealth("testService");
      await healthMonitor.checkServiceHealth("testService");

      const metrics = healthMonitor.getMetrics();
      expect(metrics.successRate).toBe(50);
    });
  });

  describe("Shutdown", () => {
    test("should shutdown gracefully", async () => {
      const healthCheck = jest.fn().mockResolvedValue({ status: "healthy" });
      healthMonitor.registerHealthCheck("testService", healthCheck);

      healthMonitor.startMonitoring();
      await healthMonitor.shutdown();

      expect(healthMonitor.isMonitoring).toBe(false);
    });
  });
});
