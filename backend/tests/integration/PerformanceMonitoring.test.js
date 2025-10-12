/**
 * PerformanceMonitoring Integration Tests
 * 
 * Tests for performance monitoring system including query monitoring,
 * performance metrics collection, alerting, and optimization recommendations.
 */

const PerformanceMonitor = require('../../infrastructure/database/PerformanceMonitor');
const QueryMonitor = require('../../infrastructure/database/QueryMonitor');
const DatabaseConnection = require('../../infrastructure/database/DatabaseConnection');
const Logger = require('../../infrastructure/logging/Logger');

describe('PerformanceMonitoring Integration Tests', () => {
  let performanceMonitor;
  let queryMonitor;
  let databaseConnection;
  let mockLogger;

  beforeEach(async () => {
    // Mock logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };
    
    jest.spyOn(Logger, 'Logger').mockImplementation(() => mockLogger);

    // Create in-memory database connection for testing
    const config = {
      type: 'sqlite',
      database: ':memory:',
      monitoring: true
    };

    databaseConnection = new DatabaseConnection(config);
    await databaseConnection.connect();

    // Initialize performance monitoring
    performanceMonitor = new PerformanceMonitor(databaseConnection);
    await performanceMonitor.initialize();

    queryMonitor = new QueryMonitor(databaseConnection);
    await queryMonitor.initialize();
  });

  afterEach(async () => {
    if (databaseConnection) {
      await databaseConnection.disconnect();
    }
    jest.clearAllMocks();
  });

  describe('Performance Monitor Initialization', () => {
    test('should initialize performance monitor successfully', async () => {
      expect(performanceMonitor.databaseConnection).toBe(databaseConnection);
      expect(performanceMonitor.metrics).toBeDefined();
      expect(performanceMonitor.alerts).toBeDefined();
    });

    test('should create performance monitoring tables', async () => {
      const tables = await databaseConnection.query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%performance%'"
      );

      expect(tables.length).toBeGreaterThan(0);
    });

    test('should handle initialization errors gracefully', async () => {
      const invalidConnection = {
        query: jest.fn().mockRejectedValue(new Error('Connection failed')),
        execute: jest.fn().mockRejectedValue(new Error('Connection failed'))
      };

      const invalidMonitor = new PerformanceMonitor(invalidConnection);

      await expect(invalidMonitor.initialize()).rejects.toThrow('Connection failed');
    });
  });

  describe('Query Performance Monitoring', () => {
    test('should monitor query execution time', async () => {
      const query = 'SELECT * FROM sqlite_master';
      const startTime = Date.now();

      await queryMonitor.monitorQuery(query, [], async () => {
        return await databaseConnection.query(query);
      });

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // Verify query was monitored
      const metrics = await queryMonitor.getQueryMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0].query).toBe(query);
      expect(metrics[0].execution_time).toBeGreaterThan(0);
      expect(metrics[0].execution_time).toBeLessThanOrEqual(executionTime);
    });

    test('should track slow queries', async () => {
      const slowQuery = 'SELECT * FROM sqlite_master';
      const slowThreshold = 100; // 100ms

      // Mock slow query execution
      const originalQuery = databaseConnection.query;
      databaseConnection.query = jest.fn().mockImplementation(async (sql) => {
        await new Promise(resolve => setTimeout(resolve, 150)); // 150ms delay
        return originalQuery.call(databaseConnection, sql);
      });

      await queryMonitor.monitorQuery(slowQuery, [], async () => {
        return await databaseConnection.query(slowQuery);
      });

      const slowQueries = await queryMonitor.getSlowQueries(slowThreshold);
      expect(slowQueries).toHaveLength(1);
      expect(slowQueries[0].execution_time).toBeGreaterThan(slowThreshold);

      // Restore original query method
      databaseConnection.query = originalQuery;
    });

    test('should track query frequency', async () => {
      const query = 'SELECT * FROM sqlite_master';

      // Execute query multiple times
      for (let i = 0; i < 5; i++) {
        await queryMonitor.monitorQuery(query, [], async () => {
          return await databaseConnection.query(query);
        });
      }

      const frequency = await queryMonitor.getQueryFrequency(query);
      expect(frequency).toBe(5);
    });

    test('should track query errors', async () => {
      const errorQuery = 'SELECT * FROM non_existent_table';

      await expect(
        queryMonitor.monitorQuery(errorQuery, [], async () => {
          return await databaseConnection.query(errorQuery);
        })
      ).rejects.toThrow();

      const errorMetrics = await queryMonitor.getErrorMetrics();
      expect(errorMetrics).toHaveLength(1);
      expect(errorMetrics[0].query).toBe(errorQuery);
      expect(errorMetrics[0].error).toBeDefined();
    });
  });

  describe('Performance Metrics Collection', () => {
    test('should collect database connection metrics', async () => {
      const metrics = await performanceMonitor.collectConnectionMetrics();

      expect(metrics).toHaveProperty('active_connections');
      expect(metrics).toHaveProperty('total_connections');
      expect(metrics).toHaveProperty('connection_pool_size');
    });

    test('should collect query performance metrics', async () => {
      // Execute some queries to generate metrics
      await databaseConnection.query('SELECT * FROM sqlite_master');
      await databaseConnection.query('SELECT name FROM sqlite_master WHERE type="table"');

      const metrics = await performanceMonitor.collectQueryMetrics();

      expect(metrics).toHaveProperty('total_queries');
      expect(metrics).toHaveProperty('average_execution_time');
      expect(metrics).toHaveProperty('slow_queries_count');
    });

    test('should collect memory usage metrics', async () => {
      const metrics = await performanceMonitor.collectMemoryMetrics();

      expect(metrics).toHaveProperty('heap_used');
      expect(metrics).toHaveProperty('heap_total');
      expect(metrics).toHaveProperty('external');
      expect(metrics.heap_used).toBeGreaterThan(0);
    });

    test('should collect disk usage metrics', async () => {
      const metrics = await performanceMonitor.collectDiskMetrics();

      expect(metrics).toHaveProperty('database_size');
      expect(metrics).toHaveProperty('free_space');
      expect(metrics.database_size).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Performance Alerting', () => {
    test('should trigger slow query alert', async () => {
      const slowQuery = 'SELECT * FROM sqlite_master';
      const alertThreshold = 100; // 100ms

      // Mock slow query
      const originalQuery = databaseConnection.query;
      databaseConnection.query = jest.fn().mockImplementation(async (sql) => {
        await new Promise(resolve => setTimeout(resolve, 150));
        return originalQuery.call(databaseConnection, sql);
      });

      await queryMonitor.monitorQuery(slowQuery, [], async () => {
        return await databaseConnection.query(slowQuery);
      });

      const alerts = await performanceMonitor.checkSlowQueryAlerts(alertThreshold);
      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe('slow_query');
      expect(alerts[0].threshold).toBe(alertThreshold);

      // Restore original query method
      databaseConnection.query = originalQuery;
    });

    test('should trigger high memory usage alert', async () => {
      const memoryThreshold = 50 * 1024 * 1024; // 50MB

      // Mock high memory usage
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = jest.fn().mockReturnValue({
        heapUsed: 100 * 1024 * 1024, // 100MB
        heapTotal: 200 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        rss: 150 * 1024 * 1024
      });

      const alerts = await performanceMonitor.checkMemoryAlerts(memoryThreshold);
      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe('high_memory_usage');

      // Restore original memory usage
      process.memoryUsage = originalMemoryUsage;
    });

    test('should trigger connection pool exhaustion alert', async () => {
      const maxConnections = 10;
      const alertThreshold = 0.8; // 80%

      // Mock high connection usage
      const alerts = await performanceMonitor.checkConnectionAlerts(maxConnections, alertThreshold);
      
      // Should not trigger alert with normal usage
      expect(alerts).toHaveLength(0);
    });

    test('should trigger disk space alert', async () => {
      const diskThreshold = 1024 * 1024 * 1024; // 1GB

      const alerts = await performanceMonitor.checkDiskAlerts(diskThreshold);
      
      // Should not trigger alert with normal usage
      expect(alerts).toHaveLength(0);
    });
  });

  describe('Performance Optimization', () => {
    test('should identify slow queries for optimization', async () => {
      const slowQuery = 'SELECT * FROM sqlite_master';
      const optimizationThreshold = 50; // 50ms

      // Mock slow query
      const originalQuery = databaseConnection.query;
      databaseConnection.query = jest.fn().mockImplementation(async (sql) => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return originalQuery.call(databaseConnection, sql);
      });

      await queryMonitor.monitorQuery(slowQuery, [], async () => {
        return await databaseConnection.query(slowQuery);
      });

      const optimizations = await performanceMonitor.getOptimizationRecommendations(optimizationThreshold);
      expect(optimizations).toHaveLength(1);
      expect(optimizations[0].type).toBe('slow_query');
      expect(optimizations[0].query).toBe(slowQuery);

      // Restore original query method
      databaseConnection.query = originalQuery;
    });

    test('should recommend index optimization', async () => {
      // Create table without index
      await databaseConnection.execute(`
        CREATE TABLE test_table (
          id INTEGER PRIMARY KEY,
          name TEXT,
          email TEXT
        )
      `);

      // Insert test data
      for (let i = 0; i < 100; i++) {
        await databaseConnection.execute(
          'INSERT INTO test_table (name, email) VALUES (?, ?)',
          [`User${i}`, `user${i}@example.com`]
        );
      }

      // Query without index
      const query = 'SELECT * FROM test_table WHERE email = ?';
      await queryMonitor.monitorQuery(query, ['user50@example.com'], async () => {
        return await databaseConnection.query(query, ['user50@example.com']);
      });

      const optimizations = await performanceMonitor.getIndexRecommendations();
      expect(optimizations).toHaveLength(1);
      expect(optimizations[0].type).toBe('missing_index');
      expect(optimizations[0].table).toBe('test_table');
      expect(optimizations[0].column).toBe('email');
    });

    test('should recommend query optimization', async () => {
      const inefficientQuery = 'SELECT * FROM sqlite_master WHERE type = "table"';
      
      await queryMonitor.monitorQuery(inefficientQuery, [], async () => {
        return await databaseConnection.query(inefficientQuery);
      });

      const optimizations = await performanceMonitor.getQueryOptimizations();
      expect(optimizations).toHaveLength(1);
      expect(optimizations[0].type).toBe('inefficient_query');
      expect(optimizations[0].suggestion).toContain('SELECT');
    });
  });

  describe('Performance Reporting', () => {
    test('should generate performance report', async () => {
      // Generate some metrics
      await databaseConnection.query('SELECT * FROM sqlite_master');
      await databaseConnection.query('SELECT name FROM sqlite_master WHERE type="table"');

      const report = await performanceMonitor.generatePerformanceReport();

      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('query_metrics');
      expect(report).toHaveProperty('connection_metrics');
      expect(report).toHaveProperty('memory_metrics');
      expect(report).toHaveProperty('recommendations');
    });

    test('should generate historical performance report', async () => {
      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
      const endDate = new Date();

      const report = await performanceMonitor.generateHistoricalReport(startDate, endDate);

      expect(report).toHaveProperty('period');
      expect(report).toHaveProperty('metrics');
      expect(report.period.start_date).toBe(startDate.toISOString());
      expect(report.period.end_date).toBe(endDate.toISOString());
    });

    test('should export performance data', async () => {
      const exportData = await performanceMonitor.exportPerformanceData();

      expect(exportData).toHaveProperty('queries');
      expect(exportData).toHaveProperty('metrics');
      expect(exportData).toHaveProperty('alerts');
      expect(exportData).toHaveProperty('export_timestamp');
    });
  });

  describe('Performance Monitoring Configuration', () => {
    test('should configure monitoring thresholds', async () => {
      const config = {
        slowQueryThreshold: 200,
        memoryThreshold: 100 * 1024 * 1024,
        connectionThreshold: 0.9
      };

      await performanceMonitor.configureThresholds(config);

      expect(performanceMonitor.config.slowQueryThreshold).toBe(200);
      expect(performanceMonitor.config.memoryThreshold).toBe(100 * 1024 * 1024);
      expect(performanceMonitor.config.connectionThreshold).toBe(0.9);
    });

    test('should enable/disable monitoring', async () => {
      expect(performanceMonitor.enabled).toBe(true);

      await performanceMonitor.disable();
      expect(performanceMonitor.enabled).toBe(false);

      await performanceMonitor.enable();
      expect(performanceMonitor.enabled).toBe(true);
    });

    test('should configure alerting', async () => {
      const alertConfig = {
        enabled: true,
        email: 'admin@example.com',
        webhook: 'https://example.com/webhook'
      };

      await performanceMonitor.configureAlerting(alertConfig);

      expect(performanceMonitor.alertConfig.enabled).toBe(true);
      expect(performanceMonitor.alertConfig.email).toBe('admin@example.com');
      expect(performanceMonitor.alertConfig.webhook).toBe('https://example.com/webhook');
    });
  });

  describe('Performance Monitoring Cleanup', () => {
    test('should cleanup old performance data', async () => {
      const retentionDays = 7;

      const cleanupResult = await performanceMonitor.cleanupOldData(retentionDays);

      expect(cleanupResult).toHaveProperty('deleted_queries');
      expect(cleanupResult).toHaveProperty('deleted_metrics');
      expect(cleanupResult).toHaveProperty('deleted_alerts');
    });

    test('should handle cleanup errors gracefully', async () => {
      const invalidRetentionDays = -1;

      await expect(performanceMonitor.cleanupOldData(invalidRetentionDays))
        .rejects.toThrow();
    });
  });

  describe('Performance Monitoring Integration', () => {
    test('should integrate with database connection', async () => {
      expect(performanceMonitor.databaseConnection).toBe(databaseConnection);
      expect(queryMonitor.databaseConnection).toBe(databaseConnection);
    });

    test('should share performance data between monitors', async () => {
      const query = 'SELECT * FROM sqlite_master';

      await queryMonitor.monitorQuery(query, [], async () => {
        return await databaseConnection.query(query);
      });

      const queryMetrics = await queryMonitor.getQueryMetrics();
      const performanceMetrics = await performanceMonitor.collectQueryMetrics();

      expect(queryMetrics).toHaveLength(1);
      expect(performanceMetrics.total_queries).toBeGreaterThan(0);
    });

    test('should handle monitoring failures gracefully', async () => {
      const invalidQuery = 'INVALID SQL';

      await expect(
        queryMonitor.monitorQuery(invalidQuery, [], async () => {
          return await databaseConnection.query(invalidQuery);
        })
      ).rejects.toThrow();

      // Monitoring should continue working after error
      const validQuery = 'SELECT * FROM sqlite_master';
      await queryMonitor.monitorQuery(validQuery, [], async () => {
        return await databaseConnection.query(validQuery);
      });

      const metrics = await queryMonitor.getQueryMetrics();
      expect(metrics).toHaveLength(2); // One error, one success
    });
  });
});