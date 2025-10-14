/**
 * PerformanceMonitor Unit Tests
 * Tests PerformanceMonitor functionality in isolation
 */

const PerformanceMonitor = require("../../infrastructure/database/PerformanceMonitor");

describe("PerformanceMonitor Unit Tests", () => {
  let performanceMonitor;
  let mockDatabaseConnection;

  beforeEach(() => {
    // Mock database connection
    mockDatabaseConnection = {
      query: jest.fn(),
      execute: jest.fn(),
    };

    performanceMonitor = new PerformanceMonitor(mockDatabaseConnection, {
      enabled: true,
      slowQueryThreshold: 100,
      maxMetricsHistory: 1000,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Initialization", () => {
    test("should initialize with default configuration", () => {
      const monitor = new PerformanceMonitor(mockDatabaseConnection);

      expect(monitor.enabled).toBe(true);
      expect(monitor.slowQueryThreshold).toBe(100);
      expect(monitor.maxMetricsHistory).toBe(1000);
    });

    test("should initialize with custom configuration", () => {
      const monitor = new PerformanceMonitor(mockDatabaseConnection, {
        enabled: false,
        slowQueryThreshold: 200,
        maxMetricsHistory: 500,
      });

      expect(monitor.enabled).toBe(false);
      expect(monitor.slowQueryThreshold).toBe(200);
      expect(monitor.maxMetricsHistory).toBe(500);
    });
  });

  describe("Query Tracking", () => {
    test("should track query execution", async () => {
      const sql = "SELECT * FROM users WHERE id = $1";
      const params = [123];
      const executionTime = 50;
      const result = { rows: [{ id: 123, name: "Test" }] };
      const databaseType = "postgresql";

      mockDatabaseConnection.execute.mockResolvedValue({ rows: [] });

      await performanceMonitor.trackQuery(
        sql,
        params,
        executionTime,
        result,
        databaseType,
      );

      expect(mockDatabaseConnection.execute).toHaveBeenCalled();
    });

    test("should not track queries when disabled", async () => {
      const disabledMonitor = new PerformanceMonitor(mockDatabaseConnection, {
        enabled: false,
      });

      const sql = "SELECT * FROM users";
      const params = [];
      const executionTime = 50;
      const result = { rows: [] };
      const databaseType = "postgresql";

      await disabledMonitor.trackQuery(
        sql,
        params,
        executionTime,
        result,
        databaseType,
      );

      expect(mockDatabaseConnection.execute).not.toHaveBeenCalled();
    });

    test("should detect slow queries", async () => {
      const sql = "SELECT * FROM large_table";
      const params = [];
      const executionTime = 150; // Above threshold
      const result = { rows: [] };
      const databaseType = "postgresql";

      mockDatabaseConnection.execute.mockResolvedValue({ rows: [] });

      await performanceMonitor.trackQuery(
        sql,
        params,
        executionTime,
        result,
        databaseType,
      );

      expect(mockDatabaseConnection.execute).toHaveBeenCalledTimes(2); // Once for tracking, once for slow query alert
    });
  });

  describe("Performance Metrics", () => {
    test("should record performance metrics", async () => {
      const metricType = "query";
      const metricName = "execution_time";
      const metricValue = 75.5;
      const metricUnit = "ms";
      const thresholdValue = 100;
      const thresholdType = "warning";
      const context = { query: "SELECT * FROM users" };

      mockDatabaseConnection.execute.mockResolvedValue({ rows: [] });

      await performanceMonitor.recordMetric(
        metricType,
        metricName,
        metricValue,
        metricUnit,
        thresholdValue,
        thresholdType,
        context,
      );

      expect(mockDatabaseConnection.execute).toHaveBeenCalled();
    });

    test("should handle metric threshold violations", async () => {
      const metricType = "query";
      const metricName = "execution_time";
      const metricValue = 150; // Above threshold
      const metricUnit = "ms";
      const thresholdValue = 100;
      const thresholdType = "warning";

      mockDatabaseConnection.execute.mockResolvedValue({ rows: [] });

      await performanceMonitor.recordMetric(
        metricType,
        metricName,
        metricValue,
        metricUnit,
        thresholdValue,
        thresholdType,
      );

      expect(mockDatabaseConnection.execute).toHaveBeenCalled();
    });
  });

  describe("Metrics Retrieval", () => {
    test("should get recent metrics", async () => {
      const mockMetrics = [
        {
          id: "1",
          metric_type: "query",
          metric_name: "execution_time",
          metric_value: 50,
        },
        {
          id: "2",
          metric_type: "query",
          metric_name: "execution_time",
          metric_value: 75,
        },
      ];

      mockDatabaseConnection.query.mockResolvedValue({ rows: mockMetrics });

      const result = await performanceMonitor.getRecentMetrics(10);

      expect(result).toEqual(mockMetrics);
      expect(mockDatabaseConnection.query).toHaveBeenCalled();
    });

    test("should get metrics by type", async () => {
      const mockMetrics = [
        {
          id: "1",
          metric_type: "query",
          metric_name: "execution_time",
          metric_value: 50,
        },
      ];

      mockDatabaseConnection.query.mockResolvedValue({ rows: mockMetrics });

      const result = await performanceMonitor.getMetricsByType("query", 10);

      expect(result).toEqual(mockMetrics);
      expect(mockDatabaseConnection.query).toHaveBeenCalled();
    });

    test("should get slow query alerts", async () => {
      const mockAlerts = [
        {
          id: "1",
          query_hash: "abc123",
          execution_time_ms: 150,
          alert_level: "warning",
        },
      ];

      mockDatabaseConnection.query.mockResolvedValue({ rows: mockAlerts });

      const result = await performanceMonitor.getSlowQueryAlerts(10);

      expect(result).toEqual(mockAlerts);
      expect(mockDatabaseConnection.query).toHaveBeenCalled();
    });
  });

  describe("Performance Statistics", () => {
    test("should calculate average execution time", async () => {
      const mockStats = { avg_execution_time: 75.5 };

      mockDatabaseConnection.query.mockResolvedValue({ rows: [mockStats] });

      const result = await performanceMonitor.getAverageExecutionTime();

      expect(result).toBe(75.5);
      expect(mockDatabaseConnection.query).toHaveBeenCalled();
    });

    test("should get query count", async () => {
      const mockStats = { query_count: 150 };

      mockDatabaseConnection.query.mockResolvedValue({ rows: [mockStats] });

      const result = await performanceMonitor.getQueryCount();

      expect(result).toBe(150);
      expect(mockDatabaseConnection.query).toHaveBeenCalled();
    });

    test("should get slow query count", async () => {
      const mockStats = { slow_query_count: 5 };

      mockDatabaseConnection.query.mockResolvedValue({ rows: [mockStats] });

      const result = await performanceMonitor.getSlowQueryCount();

      expect(result).toBe(5);
      expect(mockDatabaseConnection.query).toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    test("should handle database errors gracefully", async () => {
      mockDatabaseConnection.execute.mockRejectedValue(
        new Error("Database error"),
      );

      const sql = "SELECT * FROM users";
      const params = [];
      const executionTime = 50;
      const result = { rows: [] };
      const databaseType = "postgresql";

      // Should not throw error
      await expect(
        performanceMonitor.trackQuery(
          sql,
          params,
          executionTime,
          result,
          databaseType,
        ),
      ).resolves.not.toThrow();
    });

    test("should handle query errors gracefully", async () => {
      mockDatabaseConnection.query.mockRejectedValue(new Error("Query error"));

      // Should not throw error
      await expect(
        performanceMonitor.getRecentMetrics(10),
      ).resolves.not.toThrow();
    });
  });

  describe("Configuration Management", () => {
    test("should update slow query threshold", () => {
      performanceMonitor.setSlowQueryThreshold(200);
      expect(performanceMonitor.slowQueryThreshold).toBe(200);
    });

    test("should update max metrics history", () => {
      performanceMonitor.setMaxMetricsHistory(500);
      expect(performanceMonitor.maxMetricsHistory).toBe(500);
    });

    test("should enable/disable monitoring", () => {
      performanceMonitor.setEnabled(false);
      expect(performanceMonitor.enabled).toBe(false);

      performanceMonitor.setEnabled(true);
      expect(performanceMonitor.enabled).toBe(true);
    });
  });

  describe("Cleanup Operations", () => {
    test("should clean up old metrics", async () => {
      mockDatabaseConnection.execute.mockResolvedValue({ rows: [] });

      await performanceMonitor.cleanupOldMetrics(7); // 7 days

      expect(mockDatabaseConnection.execute).toHaveBeenCalled();
    });

    test("should clean up old slow query alerts", async () => {
      mockDatabaseConnection.execute.mockResolvedValue({ rows: [] });

      await performanceMonitor.cleanupOldSlowQueryAlerts(7); // 7 days

      expect(mockDatabaseConnection.execute).toHaveBeenCalled();
    });
  });

  describe("Health Checks", () => {
    test("should check if monitoring is healthy", async () => {
      mockDatabaseConnection.query.mockResolvedValue({
        rows: [{ count: "1" }],
      });

      const isHealthy = await performanceMonitor.isHealthy();

      expect(isHealthy).toBe(true);
      expect(mockDatabaseConnection.query).toHaveBeenCalled();
    });

    test("should detect unhealthy state", async () => {
      mockDatabaseConnection.query.mockRejectedValue(
        new Error("Database error"),
      );

      const isHealthy = await performanceMonitor.isHealthy();

      expect(isHealthy).toBe(false);
    });
  });
});
