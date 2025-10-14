/**
 * QueryMonitor Unit Tests
 * Tests for query performance tracking and analysis
 */
const QueryMonitor = require("../../infrastructure/database/QueryMonitor");

// Mock database connection
const mockDatabaseConnection = {
  execute: jest.fn(),
  query: jest.fn(),
};

describe("QueryMonitor", () => {
  let queryMonitor;

  beforeEach(() => {
    jest.clearAllMocks();
    queryMonitor = new QueryMonitor(mockDatabaseConnection, {
      enabled: true,
      slowQueryThreshold: 1000,
      trackExecutionPlans: false,
    });
  });

  afterEach(() => {
    if (queryMonitor) {
      queryMonitor.stop();
    }
  });

  describe("constructor", () => {
    test("should initialize with default options", () => {
      const monitor = new QueryMonitor(mockDatabaseConnection);
      expect(monitor.enabled).toBe(true);
      expect(monitor.thresholds.slowQuery).toBe(1000);
      expect(monitor.trackExecutionPlans).toBe(false);
    });

    test("should initialize with custom options", () => {
      const monitor = new QueryMonitor(mockDatabaseConnection, {
        enabled: false,
        slowQueryThreshold: 500,
        trackExecutionPlans: true,
      });
      expect(monitor.enabled).toBe(false);
      expect(monitor.thresholds.slowQuery).toBe(500);
      expect(monitor.trackExecutionPlans).toBe(true);
    });
  });

  describe("start", () => {
    test("should start monitoring when enabled", () => {
      const startSpy = jest.spyOn(queryMonitor, "emit");
      queryMonitor.start();
      expect(startSpy).toHaveBeenCalledWith("started");
    });

    test("should not start monitoring when disabled", () => {
      queryMonitor.enabled = false;
      const startSpy = jest.spyOn(queryMonitor, "emit");
      queryMonitor.start();
      expect(startSpy).not.toHaveBeenCalledWith("started");
    });
  });

  describe("stop", () => {
    test("should stop monitoring", () => {
      queryMonitor.start();
      const stopSpy = jest.spyOn(queryMonitor, "emit");
      queryMonitor.stop();
      expect(stopSpy).toHaveBeenCalledWith("stopped");
    });
  });

  describe("beginQuery", () => {
    test("should begin query tracking", () => {
      const queryId = "test-query-1";
      const query = "SELECT * FROM users";
      const params = [1];
      const databaseType = "postgresql";

      const beginSpy = jest.spyOn(queryMonitor, "emit");
      const queryInfo = queryMonitor.beginQuery(
        queryId,
        query,
        params,
        databaseType,
      );

      expect(queryInfo).toEqual(
        expect.objectContaining({
          queryId,
          query: expect.any(String),
          params,
          databaseType,
          startTime: expect.any(BigInt),
          startMemory: expect.any(Object),
        }),
      );

      expect(beginSpy).toHaveBeenCalledWith("queryStarted", queryInfo);
      expect(queryMonitor.activeQueries.has(queryId)).toBe(true);
    });

    test("should not begin tracking when disabled", () => {
      queryMonitor.enabled = false;
      const queryInfo = queryMonitor.beginQuery(
        "test-query",
        "SELECT * FROM users",
        [],
        "postgresql",
      );
      expect(queryInfo).toBeNull();
    });
  });

  describe("endQuery", () => {
    test("should end query tracking successfully", () => {
      const queryId = "test-query-1";
      const query = "SELECT * FROM users";
      const params = [1];
      const databaseType = "postgresql";
      const result = { rows: [{ id: 1, name: "John" }], rowCount: 1 };

      // Begin query
      queryMonitor.beginQuery(queryId, query, params, databaseType);

      // End query
      const endSpy = jest.spyOn(queryMonitor, "emit");
      const performanceData = queryMonitor.endQuery(queryId, result, null);

      expect(performanceData).toEqual(
        expect.objectContaining({
          queryId,
          query: expect.any(String),
          params,
          databaseType,
          executionTime: expect.any(Number),
          memoryDelta: expect.any(Number),
          rowsAffected: 1,
          rowsReturned: 1,
          error: null,
         
        }),
      );

      expect(endSpy).toHaveBeenCalledWith("queryEnded", performanceData);
      expect(queryMonitor.activeQueries.has(queryId)).toBe(false);
    });

    test("should end query tracking with error", () => {
      const queryId = "test-query-1";
      const query = "SELECT * FROM users";
      const params = [1];
      const databaseType = "postgresql";
      const error = new Error("Database error");

      // Begin query
      queryMonitor.beginQuery(queryId, query, params, databaseType);

      // End query with error
      const endSpy = jest.spyOn(queryMonitor, "emit");
      const performanceData = queryMonitor.endQuery(queryId, null, error);

      expect(performanceData).toEqual(
        expect.objectContaining({
          queryId,
          query: expect.any(String),
          params,
          databaseType,
          executionTime: expect.any(Number),
          error: "Database error",
         
        }),
      );

      expect(endSpy).toHaveBeenCalledWith("queryEnded", performanceData);
    });

    test("should handle missing query ID", () => {
      const performanceData = queryMonitor.endQuery(
        "non-existent-id",
        {},
        null,
      );
      expect(performanceData).toBeNull();
    });
  });

  describe("trackExecutionPlan", () => {
    test("should track execution plan", () => {
      const queryId = "test-query-1";
      const plan = { cost: 100, rows: 1000 };

      const trackSpy = jest.spyOn(queryMonitor, "emit");
      queryMonitor.trackExecutionPlan(queryId, plan);

      expect(trackSpy).toHaveBeenCalledWith("executionPlanTracked", {
        queryId,
        plan,
      });
      expect(queryMonitor.executionPlans.has(queryId)).toBe(true);
    });

    test("should not track execution plan when disabled", () => {
      queryMonitor.trackExecutionPlans = false;
      const trackSpy = jest.spyOn(queryMonitor, "emit");

      queryMonitor.trackExecutionPlan("test-query", {});

      expect(trackSpy).not.toHaveBeenCalled();
    });
  });

  describe("checkPerformanceIssues", () => {
    test("should detect slow query", () => {
      const performanceData = {
        executionTime: 1500, // Above threshold
        query: "SELECT * FROM users",
       
      };

      const issueSpy = jest.spyOn(queryMonitor, "emit");
      queryMonitor.checkPerformanceIssues(performanceData);

      expect(issueSpy).toHaveBeenCalledWith(
        "performanceIssue",
        expect.objectContaining({
          type: "slow_query",
          severity: "warning",
          message: expect.stringContaining("1500ms"),
        }),
      );
    });

    test("should detect very slow query", () => {
      const performanceData = {
        executionTime: 6000, // Above very slow threshold
        query: "SELECT * FROM users",
       
      };

      const issueSpy = jest.spyOn(queryMonitor, "emit");
      queryMonitor.checkPerformanceIssues(performanceData);

      expect(issueSpy).toHaveBeenCalledWith(
        "performanceIssue",
        expect.objectContaining({
          type: "very_slow_query",
          severity: "critical",
          message: expect.stringContaining("6000ms"),
        }),
      );
    });

    test("should detect query error", () => {
      const performanceData = {
        executionTime: 100,
        query: "SELECT * FROM users",
       
        error: "Connection timeout",
      };

      const issueSpy = jest.spyOn(queryMonitor, "emit");
      queryMonitor.checkPerformanceIssues(performanceData);

      expect(issueSpy).toHaveBeenCalledWith(
        "performanceIssue",
        expect.objectContaining({
          type: "query_error",
          severity: "error",
          message: expect.stringContaining("Connection timeout"),
        }),
      );
    });
  });

  describe("getStats", () => {
    test("should return overall statistics", () => {
      const stats = queryMonitor.getStats();
      expect(stats).toEqual(
        expect.objectContaining({
          totalQueries: 0,
          totalTime: 0,
          avgTime: 0,
          errorRate: 0,
          activeQueries: 0,
          uniqueQueries: 0,
          historySize: 0,
        }),
      );
    });

    test("should return query-specific statistics", () => {
      const query = "SELECT * FROM users";
      const stats = queryMonitor.getStats(query);
      expect(stats).toBeNull(); // No stats for this query yet
    });
  });

  describe("getRecentHistory", () => {
    test("should return recent query history", () => {
      const history = queryMonitor.getRecentHistory(10);
      expect(Array.isArray(history)).toBe(true);
    });

    test("should filter history by query type", () => {
      const history = queryMonitor.getRecentHistory(10, "SELECT");
      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe("getSlowQueries", () => {
    test("should return slow queries", () => {
      const slowQueries = queryMonitor.getSlowQueries(10);
      expect(Array.isArray(slowQueries)).toBe(true);
    });
  });

  describe("getTopQueriesByTime", () => {
    test("should return top queries by execution time", () => {
      const topQueries = queryMonitor.getTopQueriesByTime(10);
      expect(Array.isArray(topQueries)).toBe(true);
    });
  });

  describe("getMostFrequentQueries", () => {
    test("should return most frequent queries", () => {
      const frequentQueries = queryMonitor.getMostFrequentQueries(10);
      expect(Array.isArray(frequentQueries)).toBe(true);
    });
  });

  describe("getQueryKey", () => {
    test("should generate consistent query key", () => {
      const query = "SELECT * FROM users WHERE id = $1";
      const key1 = queryMonitor.getQueryKey(query);
      const key2 = queryMonitor.getQueryKey(query);

      expect(key1).toBe(key2);
    });
  });

  describe("sanitizeQuery", () => {
    test("should sanitize query for logging", () => {
      const query = "  SELECT   *   FROM   users   WHERE   id   =   $1  ";
      const sanitized = queryMonitor.sanitizeQuery(query);

      expect(sanitized).toBe("SELECT * FROM users WHERE id = $1");
      expect(sanitized.length).toBeLessThanOrEqual(500);
    });
  });

  describe("clearHistory", () => {
    test("should clear query history", () => {
      queryMonitor.clearHistory();
      expect(queryMonitor.queryHistory.length).toBe(0);
      expect(queryMonitor.queryStats.size).toBe(0);
      expect(queryMonitor.executionPlans.size).toBe(0);
    });
  });

  describe("exportData", () => {
    test("should export data as JSON", () => {
      const data = queryMonitor.exportData("json");
      expect(() => JSON.parse(data)).not.toThrow();
    });

    test("should export data as CSV", () => {
      const data = queryMonitor.exportData("csv");
      expect(typeof data).toBe("string");
      expect(data).toContain("timestamp,query,executionTime,success,error");
    });
  });
});
