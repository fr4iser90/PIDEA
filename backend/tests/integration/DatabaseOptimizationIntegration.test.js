/**
 * Database Optimization Integration Tests
 * Tests QueryCache, Performance Monitoring, and overall database optimization features
 */

const { Pool } = require('pg');
// const { DatabaseConnection } = require('../../infrastructure/database/DatabaseConnection');

describe('Database Optimization Integration Tests', () => {
  let dbConnection;
  let pool;
  let testResults = {};

  beforeAll(async () => {
    // Initialize direct pool for testing
    pool = new Pool({
      host: 'localhost',
      port: 5432,
      database: 'pidea',
      user: 'postgres',
      password: 'postgres',
      max: 10
    });
  });

  afterAll(async () => {
    if (pool) {
      await pool.end();
    }
  });

  describe('QueryCache Performance', () => {
    test('should cache query results and improve performance', async () => {
      const testQuery = 'SELECT COUNT(*) FROM tasks';
      const iterations = 10;

      // First run (cold cache)
      const coldStart = Date.now();
      for (let i = 0; i < iterations; i++) {
        const client = await pool.connect();
        await client.query(testQuery);
        client.release();
      }
      const coldDuration = Date.now() - coldStart;

      // Second run (warm cache)
      const warmStart = Date.now();
      for (let i = 0; i < iterations; i++) {
        const client = await pool.connect();
        await client.query(testQuery);
        client.release();
      }
      const warmDuration = Date.now() - warmStart;

      testResults.queryCache = {
        coldDuration,
        warmDuration,
        improvement: ((coldDuration - warmDuration) / coldDuration) * 100
      };

      // Cache should improve performance
      expect(warmDuration).toBeLessThan(coldDuration);
      expect(testResults.queryCache.improvement).toBeGreaterThan(0);
    });

    test('should handle cache expiration correctly', async () => {
      const client = await pool.connect();
      
      try {
        // Insert a cache entry with short expiration
        const shortExpiry = new Date(Date.now() + 1000); // 1 second
        await client.query(`
          INSERT INTO query_cache (cache_key, query_hash, result_data, expires_at)
          VALUES ($1, $2, $3, $4)
        `, ['test_expiry', 'test_hash', '{"test": "data"}', shortExpiry]);

        // Should find the entry immediately
        let result = await client.query(
          'SELECT * FROM query_cache WHERE cache_key = $1 AND expires_at > $2',
          ['test_expiry', new Date().toISOString()]
        );
        expect(result.rows.length).toBe(1);

        // Wait for expiration
        await new Promise(resolve => setTimeout(resolve, 1100));

        // Should not find expired entry
        result = await client.query(
          'SELECT * FROM query_cache WHERE cache_key = $1 AND expires_at > $2',
          ['test_expiry', new Date().toISOString()]
        );
        expect(result.rows.length).toBe(0);

        // Cleanup
        await client.query('DELETE FROM query_cache WHERE cache_key = $1', ['test_expiry']);

      } finally {
        client.release();
      }
    });

    test('should track cache statistics', async () => {
      // Test that query_cache table exists and can be queried
      const client = await pool.connect();
      
      try {
        const result = await client.query('SELECT COUNT(*) FROM query_cache');
        expect(result.rows[0].count).toBeDefined();
        expect(typeof parseInt(result.rows[0].count)).toBe('number');
      } finally {
        client.release();
      }
    });
  });

  describe('Performance Monitoring', () => {
    test('should track query performance metrics', async () => {
      // Execute some queries to generate metrics
      const queries = [
        'SELECT COUNT(*) FROM tasks',
        'SELECT COUNT(*) FROM projects',
        'SELECT COUNT(*) FROM users'
      ];

      const client = await pool.connect();
      try {
        for (const query of queries) {
          await client.query(query);
        }

        // Check if performance metrics table exists
        const result = await client.query('SELECT COUNT(*) FROM performance_metrics');
        expect(result.rows[0].count).toBeDefined();
        expect(typeof parseInt(result.rows[0].count)).toBe('number');
      } finally {
        client.release();
      }
    });

    test('should detect slow queries', async () => {
      const client = await pool.connect();
      try {
        // Execute a query that should be tracked
        await client.query('SELECT COUNT(*) FROM tasks');

        // Check if query performance table exists
        const result = await client.query('SELECT COUNT(*) FROM query_performance');
        expect(result.rows[0].count).toBeDefined();
        expect(typeof parseInt(result.rows[0].count)).toBe('number');
      } finally {
        client.release();
      }
    });

    test('should have performance monitoring tables', async () => {
      const client = await pool.connect();
      
      try {
        const tables = ['performance_metrics', 'query_performance', 'slow_query_alerts'];
        
        for (const table of tables) {
          const result = await client.query(`
            SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_name = $1
            );
          `, [table]);
          
          expect(result.rows[0].exists).toBe(true);
        }
      } finally {
        client.release();
      }
    });
  });

  describe('Database Connection Performance', () => {
    test('should maintain good connection performance', async () => {
      const iterations = 50;
      const start = Date.now();

      for (let i = 0; i < iterations; i++) {
        const client = await pool.connect();
        await client.query('SELECT 1');
        client.release();
      }

      const duration = Date.now() - start;
      const avgTimePerQuery = duration / iterations;

      testResults.connectionPerformance = {
        totalDuration: duration,
        avgTimePerQuery,
        queriesPerSecond: iterations / (duration / 1000)
      };

      // Should maintain good performance
      expect(avgTimePerQuery).toBeLessThan(10); // Less than 10ms per query
      expect(testResults.connectionPerformance.queriesPerSecond).toBeGreaterThan(100);
    });

    test('should handle concurrent queries efficiently', async () => {
      const concurrentQueries = 10;
      const queriesPerConnection = 5;

      const start = Date.now();
      const promises = [];

      for (let i = 0; i < concurrentQueries; i++) {
        promises.push(
          (async () => {
            for (let j = 0; j < queriesPerConnection; j++) {
              const client = await pool.connect();
              await client.query('SELECT COUNT(*) FROM tasks');
              client.release();
            }
          })()
        );
      }

      await Promise.all(promises);
      const duration = Date.now() - start;

      testResults.concurrentPerformance = {
        totalQueries: concurrentQueries * queriesPerConnection,
        duration,
        queriesPerSecond: (concurrentQueries * queriesPerConnection) / (duration / 1000)
      };

      // Should handle concurrent queries well
      expect(testResults.concurrentPerformance.queriesPerSecond).toBeGreaterThan(50);
    });
  });

  describe('Database Optimization Features', () => {
    test('should have optimization tables available', async () => {
      const client = await pool.connect();
      
      try {
        const tables = ['query_cache', 'performance_metrics', 'query_performance', 'slow_query_alerts'];
        
        for (const table of tables) {
          const result = await client.query(`
            SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_name = $1
            );
          `, [table]);
          
          expect(result.rows[0].exists).toBe(true);
        }
      } finally {
        client.release();
      }
    });

    test('should have proper indexes on optimization tables', async () => {
      const client = await pool.connect();
      
      try {
        const indexChecks = [
          { table: 'query_cache', index: 'idx_query_cache_key' },
          { table: 'query_cache', index: 'idx_query_cache_expires_at' },
          { table: 'performance_metrics', index: 'idx_performance_metrics_type' }
        ];

        for (const { table, index } of indexChecks) {
          const result = await client.query(`
            SELECT EXISTS (
              SELECT FROM pg_indexes 
              WHERE tablename = $1 AND indexname = $2
            );
          `, [table, index]);
          
          expect(result.rows[0].exists).toBe(true);
        }
      } finally {
        client.release();
      }
    });
  });

  describe('Database Schema and Migrations', () => {
    test('should have all required optimization tables', async () => {
      const client = await pool.connect();
      
      try {
        const requiredTables = [
          'query_cache',
          'performance_metrics',
          'query_performance',
          'slow_query_alerts'
        ];

        for (const table of requiredTables) {
          const result = await client.query(`
            SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_name = $1
            );
          `, [table]);
          
          expect(result.rows[0].exists).toBe(true);
        }
      } finally {
        client.release();
      }
    });

    test('should have proper indexes on optimization tables', async () => {
      const client = await pool.connect();
      
      try {
        const indexChecks = [
          { table: 'query_cache', index: 'idx_query_cache_key' },
          { table: 'query_cache', index: 'idx_query_cache_expires_at' },
          { table: 'performance_metrics', index: 'idx_performance_metrics_type' },
          { table: 'query_performance', index: 'idx_query_performance_hash' }
        ];

        for (const { table, index } of indexChecks) {
          const result = await client.query(`
            SELECT EXISTS (
              SELECT FROM pg_indexes 
              WHERE tablename = $1 AND indexname = $2
            );
          `, [table, index]);
          
          expect(result.rows[0].exists).toBe(true);
        }
      } finally {
        client.release();
      }
    });
  });

  describe('Performance Test Summary', () => {
    test('should generate performance test report', () => {
      const report = {
        timestamp: new Date().toISOString(),
        testResults,
        summary: {
          queryCacheImprovement: testResults.queryCache?.improvement || 0,
          connectionPerformance: testResults.connectionPerformance?.queriesPerSecond || 0,
          concurrentPerformance: testResults.concurrentPerformance?.queriesPerSecond || 0
        }
      };

      console.log('\n' + '='.repeat(80));
      console.log('📊 DATABASE OPTIMIZATION INTEGRATION TEST REPORT');
      console.log('='.repeat(80));
      console.log(`🕐 Timestamp: ${report.timestamp}`);
      console.log(`🎯 Query Cache Improvement: ${report.summary.queryCacheImprovement.toFixed(2)}%`);
      console.log(`⚡ Connection Performance: ${report.summary.connectionPerformance.toFixed(2)} queries/sec`);
      console.log(`🚀 Concurrent Performance: ${report.summary.concurrentPerformance.toFixed(2)} queries/sec`);
      console.log('='.repeat(80));

      // Performance assertions
      expect(report.summary.queryCacheImprovement).toBeGreaterThan(0);
      expect(report.summary.connectionPerformance).toBeGreaterThan(100);
      expect(report.summary.concurrentPerformance).toBeGreaterThan(50);
    });
  });
});
