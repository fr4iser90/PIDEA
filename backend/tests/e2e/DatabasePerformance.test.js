/**
 * Database Performance End-to-End Tests
 *
 * Tests for database performance across complete workflows including
 * query optimization, indexing, caching, and performance monitoring.
 */

const DatabaseConnection = require("../../infrastructure/database/DatabaseConnection");
const PerformanceMonitor = require("../../infrastructure/database/PerformanceMonitor");
const QueryCache = require("../../infrastructure/database/QueryCache");
const QueryOptimizer = require("../../infrastructure/database/QueryOptimizer");
const IndexManager = require("../../infrastructure/database/IndexManager");
const Logger = require("../../infrastructure/logging/Logger");

describe("Database Performance End-to-End Tests", () => {
  let databaseConnection;
  let performanceMonitor;
  let queryCache;
  let queryOptimizer;
  let indexManager;
  let mockLogger;

  beforeAll(async () => {
    // Mock logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    jest.spyOn(Logger, "Logger").mockImplementation(() => mockLogger);

    // Initialize database connection
    const config = {
      type: "sqlite",
      database: ":memory:",
      monitoring: true,
      optimization: true,
    };

    databaseConnection = new DatabaseConnection(config);
    await databaseConnection.connect();

    // Initialize performance components
    performanceMonitor = new PerformanceMonitor(databaseConnection);
    await performanceMonitor.initialize();

    queryCache = new QueryCache({ maxSize: 1000, ttl: 300000 });
    queryOptimizer = new QueryOptimizer(databaseConnection);
    indexManager = new IndexManager(databaseConnection);

    // Create test tables with large datasets
    await createPerformanceTestTables();
  });

  afterAll(async () => {
    if (databaseConnection) {
      await databaseConnection.disconnect();
    }
    jest.clearAllMocks();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await cleanupTestData();
  });

  async function createPerformanceTestTables() {
    // Create users table
    await databaseConnection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        age INTEGER,
        city TEXT,
        country TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create posts table
    await databaseConnection.execute(`
      CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        content TEXT,
        status TEXT DEFAULT 'draft',
        views INTEGER DEFAULT 0,
        likes INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Create comments table
    await databaseConnection.execute(`
      CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES posts (id),
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Create tags table
    await databaseConnection.execute(`
      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create post_tags junction table
    await databaseConnection.execute(`
      CREATE TABLE IF NOT EXISTS post_tags (
        post_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        PRIMARY KEY (post_id, tag_id),
        FOREIGN KEY (post_id) REFERENCES posts (id),
        FOREIGN KEY (tag_id) REFERENCES tags (id)
      )
    `);
  }

  async function cleanupTestData() {
    try {
      await databaseConnection.execute("DELETE FROM post_tags");
      await databaseConnection.execute("DELETE FROM comments");
      await databaseConnection.execute("DELETE FROM posts");
      await databaseConnection.execute("DELETE FROM tags");
      await databaseConnection.execute("DELETE FROM users");
    } catch (error) {
      // Ignore cleanup errors for non-existent tables
    }
  }

  describe("Query Performance Optimization", () => {
    test("should optimize simple SELECT queries", async () => {
      // Insert test data
      await insertTestData(1000);

      const query = "SELECT * FROM users WHERE age > ?";
      const params = [25];

      // Measure query performance
      const startTime = Date.now();
      const result = await databaseConnection.query(query, params);
      const endTime = Date.now();

      const executionTime = endTime - startTime;

      expect(result).toHaveLength(750); // 75% of users are over 25
      expect(executionTime).toBeLessThan(100); // Should complete in less than 100ms

      // Test query optimization
      const optimizedQuery = await queryOptimizer.optimizeQuery(query, params);
      expect(optimizedQuery).toBeDefined();
      expect(optimizedQuery.originalQuery).toBe(query);
    });

    test("should optimize JOIN queries", async () => {
      // Insert test data with relationships
      await insertTestDataWithRelationships(500);

      const query = `
        SELECT u.name, p.title, p.views
        FROM users u
        JOIN posts p ON u.id = p.user_id
        WHERE u.age > ? AND p.status = ?
        ORDER BY p.views DESC
        LIMIT ?
      `;
      const params = [30, "published", 10];

      // Measure query performance
      const startTime = Date.now();
      const result = await databaseConnection.query(query, params);
      const endTime = Date.now();

      const executionTime = endTime - startTime;

      expect(result).toHaveLength(10);
      expect(executionTime).toBeLessThan(200); // Should complete in less than 200ms

      // Test query optimization
      const optimizedQuery = await queryOptimizer.optimizeQuery(query, params);
      expect(optimizedQuery).toBeDefined();
    });

    test("should optimize complex aggregation queries", async () => {
      // Insert test data
      await insertTestDataWithRelationships(1000);

      const query = `
        SELECT 
          u.city,
          COUNT(p.id) as post_count,
          AVG(p.views) as avg_views,
          SUM(p.likes) as total_likes,
          MAX(p.created_at) as latest_post
        FROM users u
        LEFT JOIN posts p ON u.id = p.user_id
        WHERE u.age BETWEEN ? AND ?
        GROUP BY u.city
        HAVING COUNT(p.id) > ?
        ORDER BY post_count DESC
      `;
      const params = [20, 50, 5];

      // Measure query performance
      const startTime = Date.now();
      const result = await databaseConnection.query(query, params);
      const endTime = Date.now();

      const executionTime = endTime - startTime;

      expect(result.length).toBeGreaterThan(0);
      expect(executionTime).toBeLessThan(500); // Should complete in less than 500ms

      // Test query optimization
      const optimizedQuery = await queryOptimizer.optimizeQuery(query, params);
      expect(optimizedQuery).toBeDefined();
    });

    test("should optimize subquery performance", async () => {
      // Insert test data
      await insertTestDataWithRelationships(800);

      const query = `
        SELECT u.name, u.email
        FROM users u
        WHERE u.id IN (
          SELECT DISTINCT p.user_id
          FROM posts p
          WHERE p.views > ? AND p.status = ?
        )
        ORDER BY u.name
      `;
      const params = [100, "published"];

      // Measure query performance
      const startTime = Date.now();
      const result = await databaseConnection.query(query, params);
      const endTime = Date.now();

      const executionTime = endTime - startTime;

      expect(result.length).toBeGreaterThan(0);
      expect(executionTime).toBeLessThan(300); // Should complete in less than 300ms

      // Test query optimization
      const optimizedQuery = await queryOptimizer.optimizeQuery(query, params);
      expect(optimizedQuery).toBeDefined();
    });
  });

  describe("Index Performance", () => {
    test("should improve query performance with indexes", async () => {
      // Insert test data
      await insertTestData(5000);

      const query = "SELECT * FROM users WHERE age = ? AND city = ?";
      const params = [30, "New York"];

      // Measure performance without index
      const startTimeWithoutIndex = Date.now();
      const resultWithoutIndex = await databaseConnection.query(query, params);
      const endTimeWithoutIndex = Date.now();

      const timeWithoutIndex = endTimeWithoutIndex - startTimeWithoutIndex;

      // Create index
      await indexManager.createIndex("users", ["age", "city"]);

      // Measure performance with index
      const startTimeWithIndex = Date.now();
      const resultWithIndex = await databaseConnection.query(query, params);
      const endTimeWithIndex = Date.now();

      const timeWithIndex = endTimeWithIndex - startTimeWithIndex;

      expect(resultWithoutIndex).toEqual(resultWithIndex);
      expect(timeWithIndex).toBeLessThan(timeWithoutIndex);
    });

    test("should optimize JOIN performance with indexes", async () => {
      // Insert test data
      await insertTestDataWithRelationships(2000);

      const query = `
        SELECT u.name, p.title
        FROM users u
        JOIN posts p ON u.id = p.user_id
        WHERE u.age > ? AND p.status = ?
      `;
      const params = [25, "published"];

      // Measure performance without indexes
      const startTimeWithoutIndex = Date.now();
      const resultWithoutIndex = await databaseConnection.query(query, params);
      const endTimeWithoutIndex = Date.now();

      const timeWithoutIndex = endTimeWithoutIndex - startTimeWithoutIndex;

      // Create indexes
      await indexManager.createIndex("users", ["age"]);
      await indexManager.createIndex("posts", ["user_id", "status"]);

      // Measure performance with indexes
      const startTimeWithIndex = Date.now();
      const resultWithIndex = await databaseConnection.query(query, params);
      const endTimeWithIndex = Date.now();

      const timeWithIndex = endTimeWithIndex - startTimeWithIndex;

      expect(resultWithoutIndex).toEqual(resultWithIndex);
      expect(timeWithIndex).toBeLessThan(timeWithoutIndex);
    });

    test("should handle composite indexes efficiently", async () => {
      // Insert test data
      await insertTestData(3000);

      // Create composite index
      await indexManager.createIndex("users", ["age", "city", "country"]);

      const queries = [
        { query: "SELECT * FROM users WHERE age = ?", params: [30] },
        {
          query: "SELECT * FROM users WHERE age = ? AND city = ?",
          params: [30, "New York"],
        },
        {
          query:
            "SELECT * FROM users WHERE age = ? AND city = ? AND country = ?",
          params: [30, "New York", "USA"],
        },
      ];

      for (const { query, params } of queries) {
        const startTime = Date.now();
        const result = await databaseConnection.query(query, params);
        const endTime = Date.now();

        const executionTime = endTime - startTime;
        expect(executionTime).toBeLessThan(100); // Should complete in less than 100ms
        expect(result.length).toBeGreaterThan(0);
      }
    });

    test("should optimize ORDER BY performance with indexes", async () => {
      // Insert test data
      await insertTestData(4000);

      const query =
        "SELECT * FROM users ORDER BY age DESC, created_at ASC LIMIT ?";
      const params = [100];

      // Measure performance without index
      const startTimeWithoutIndex = Date.now();
      const resultWithoutIndex = await databaseConnection.query(query, params);
      const endTimeWithoutIndex = Date.now();

      const timeWithoutIndex = endTimeWithoutIndex - startTimeWithoutIndex;

      // Create index for ORDER BY
      await indexManager.createIndex("users", ["age", "created_at"]);

      // Measure performance with index
      const startTimeWithIndex = Date.now();
      const resultWithIndex = await databaseConnection.query(query, params);
      const endTimeWithIndex = Date.now();

      const timeWithIndex = endTimeWithIndex - startTimeWithIndex;

      expect(resultWithoutIndex).toEqual(resultWithIndex);
      expect(timeWithIndex).toBeLessThan(timeWithoutIndex);
    });
  });

  describe("Query Caching Performance", () => {
    test("should improve performance with query caching", async () => {
      // Insert test data
      await insertTestData(1000);

      const query = "SELECT * FROM users WHERE age > ? AND city = ?";
      const params = [25, "New York"];

      // First execution (cache miss)
      const startTime1 = Date.now();
      const result1 =
        (await queryCache.get(query, params)) ||
        (await databaseConnection.query(query, params));
      await queryCache.set(query, params, result1);
      const endTime1 = Date.now();

      const time1 = endTime1 - startTime1;

      // Second execution (cache hit)
      const startTime2 = Date.now();
      const result2 =
        (await queryCache.get(query, params)) ||
        (await databaseConnection.query(query, params));
      const endTime2 = Date.now();

      const time2 = endTime2 - startTime2;

      expect(result1).toEqual(result2);
      expect(time2).toBeLessThan(time1);
      expect(queryCache.getHitRatio()).toBeGreaterThan(0);
    });

    test("should handle cache invalidation efficiently", async () => {
      // Insert test data
      await insertTestData(500);

      const query = "SELECT * FROM users WHERE age > ?";
      const params = [25];

      // Cache the query
      const result1 = await databaseConnection.query(query, params);
      await queryCache.set(query, params, result1);

      // Verify cache hit
      const cachedResult = await queryCache.get(query, params);
      expect(cachedResult).toEqual(result1);

      // Insert new user (should invalidate cache)
      await databaseConnection.execute(
        "INSERT INTO users (name, email, age, city) VALUES (?, ?, ?, ?)",
        ["New User", "new@example.com", 30, "New York"],
      );

      // Invalidate cache
      await queryCache.invalidateTable("users");

      // Verify cache miss
      const result2 = await queryCache.get(query, params);
      expect(result2).toBeNull();
    });

    test("should handle cache size limits efficiently", async () => {
      // Configure small cache
      const smallCache = new QueryCache({ maxSize: 5, ttl: 300000 });

      // Insert test data
      await insertTestData(100);

      // Fill cache beyond limit
      const queries = [
        "SELECT * FROM users WHERE age > ?",
        "SELECT * FROM users WHERE city = ?",
        "SELECT * FROM users WHERE country = ?",
        "SELECT * FROM users WHERE name LIKE ?",
        "SELECT * FROM users WHERE email LIKE ?",
        "SELECT * FROM users WHERE created_at > ?",
        "SELECT * FROM users WHERE updated_at > ?",
      ];

      const params = [
        25,
        "New York",
        "USA",
        "%John%",
        "%@example.com",
        "2023-01-01",
        "2023-01-01",
      ];

      for (let i = 0; i < queries.length; i++) {
        const result = await databaseConnection.query(queries[i], [params[i]]);
        await smallCache.set(queries[i], [params[i]], result);
      }

      // Verify cache size limit
      expect(smallCache.getSize()).toBeLessThanOrEqual(5);

      // Verify oldest entries were evicted
      const firstResult = await smallCache.get(queries[0], [params[0]]);
      expect(firstResult).toBeNull();
    });
  });

  describe("Bulk Operations Performance", () => {
    test("should handle bulk INSERT operations efficiently", async () => {
      const batchSize = 1000;
      const totalRecords = 10000;

      const startTime = Date.now();

      // Insert records in batches
      for (let batch = 0; batch < totalRecords / batchSize; batch++) {
        const values = [];
        for (let i = 0; i < batchSize; i++) {
          const id = batch * batchSize + i;
          values.push(
            `('User${id}', 'user${id}@example.com', ${20 + (id % 50)}, 'City${id % 100}', 'Country${id % 10}')`,
          );
        }

        await databaseConnection.execute(
          `INSERT INTO users (name, email, age, city, country) VALUES ${values.join(", ")}`,
        );
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Verify all records were inserted
      const count = await databaseConnection.query(
        "SELECT COUNT(*) as count FROM users",
      );
      expect(count[0].count).toBe(totalRecords);
      expect(totalTime).toBeLessThan(5000); // Should complete in less than 5 seconds
    });

    test("should handle bulk UPDATE operations efficiently", async () => {
      // Insert test data
      await insertTestData(5000);

      const startTime = Date.now();

      // Update records in batches
      const batchSize = 500;
      const totalRecords = 5000;

      for (let batch = 0; batch < totalRecords / batchSize; batch++) {
        const startId = batch * batchSize + 1;
        const endId = startId + batchSize - 1;

        await databaseConnection.execute(
          "UPDATE users SET city = ? WHERE id BETWEEN ? AND ?",
          ["Updated City", startId, endId],
        );
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Verify updates
      const updatedCount = await databaseConnection.query(
        "SELECT COUNT(*) as count FROM users WHERE city = ?",
        ["Updated City"],
      );
      expect(updatedCount[0].count).toBe(totalRecords);
      expect(totalTime).toBeLessThan(3000); // Should complete in less than 3 seconds
    });

    test("should handle bulk DELETE operations efficiently", async () => {
      // Insert test data
      await insertTestData(3000);

      const startTime = Date.now();

      // Delete records in batches
      const batchSize = 300;
      const totalRecords = 3000;

      for (let batch = 0; batch < totalRecords / batchSize; batch++) {
        const startId = batch * batchSize + 1;
        const endId = startId + batchSize - 1;

        await databaseConnection.execute(
          "DELETE FROM users WHERE id BETWEEN ? AND ?",
          [startId, endId],
        );
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Verify deletions
      const remainingCount = await databaseConnection.query(
        "SELECT COUNT(*) as count FROM users",
      );
      expect(remainingCount[0].count).toBe(0);
      expect(totalTime).toBeLessThan(2000); // Should complete in less than 2 seconds
    });
  });

  describe("Concurrent Operations Performance", () => {
    test("should handle concurrent SELECT operations efficiently", async () => {
      // Insert test data
      await insertTestData(2000);

      const query = "SELECT * FROM users WHERE age > ?";
      const params = [25];

      const concurrentQueries = Array(100)
        .fill()
        .map(async () => {
          const startTime = Date.now();
          const result = await databaseConnection.query(query, params);
          const endTime = Date.now();
          return { result, executionTime: endTime - startTime };
        });

      const startTime = Date.now();
      const results = await Promise.all(concurrentQueries);
      const endTime = Date.now();

      const totalTime = endTime - startTime;

      // Verify all queries completed successfully
      expect(results).toHaveLength(100);
      results.forEach(({ result, executionTime }) => {
        expect(result.length).toBeGreaterThan(0);
        expect(executionTime).toBeLessThan(100); // Each query should complete in less than 100ms
      });

      expect(totalTime).toBeLessThan(2000); // All queries should complete in less than 2 seconds
    });

    test("should handle concurrent INSERT operations efficiently", async () => {
      const concurrentInserts = Array(50)
        .fill()
        .map(async (_, i) => {
          const startTime = Date.now();
          await databaseConnection.execute(
            "INSERT INTO users (name, email, age, city) VALUES (?, ?, ?, ?)",
            [
              `User${i}`,
              `user${i}@example.com`,
              20 + (i % 50),
              `City${i % 100}`,
            ],
          );
          const endTime = Date.now();
          return endTime - startTime;
        });

      const startTime = Date.now();
      const executionTimes = await Promise.all(concurrentInserts);
      const endTime = Date.now();

      const totalTime = endTime - startTime;

      // Verify all inserts completed successfully
      const count = await databaseConnection.query(
        "SELECT COUNT(*) as count FROM users",
      );
      expect(count[0].count).toBe(50);

      // Verify performance
      executionTimes.forEach((time) => {
        expect(time).toBeLessThan(50); // Each insert should complete in less than 50ms
      });

      expect(totalTime).toBeLessThan(1000); // All inserts should complete in less than 1 second
    });

    test("should handle mixed concurrent operations efficiently", async () => {
      // Insert initial test data
      await insertTestData(1000);

      const operations = [
        // SELECT operations
        ...Array(30)
          .fill()
          .map(async () => {
            const result = await databaseConnection.query(
              "SELECT * FROM users WHERE age > ?",
              [25],
            );
            return { type: "SELECT", count: result.length };
          }),

        // INSERT operations
        ...Array(20)
          .fill()
          .map(async (_, i) => {
            await databaseConnection.execute(
              "INSERT INTO users (name, email, age, city) VALUES (?, ?, ?, ?)",
              [
                `ConcurrentUser${i}`,
                `concurrent${i}@example.com`,
                25 + i,
                `City${i}`,
              ],
            );
            return { type: "INSERT", id: i };
          }),

        // UPDATE operations
        ...Array(20)
          .fill()
          .map(async (_, i) => {
            await databaseConnection.execute(
              "UPDATE users SET city = ? WHERE id = ?",
              [`UpdatedCity${i}`, i + 1],
            );
            return { type: "UPDATE", id: i + 1 };
          }),
      ];

      const startTime = Date.now();
      const results = await Promise.all(operations);
      const endTime = Date.now();

      const totalTime = endTime - startTime;

      // Verify operations completed successfully
      expect(results).toHaveLength(70);

      const selectResults = results.filter((r) => r.type === "SELECT");
      const insertResults = results.filter((r) => r.type === "INSERT");
      const updateResults = results.filter((r) => r.type === "UPDATE");

      expect(selectResults).toHaveLength(30);
      expect(insertResults).toHaveLength(20);
      expect(updateResults).toHaveLength(20);

      expect(totalTime).toBeLessThan(3000); // All operations should complete in less than 3 seconds
    });
  });

  describe("Performance Monitoring Integration", () => {
    test("should monitor query performance across workflow", async () => {
      // Enable performance monitoring
      await performanceMonitor.enable();

      // Insert test data
      await insertTestData(1000);

      // Execute various queries
      const queries = [
        "SELECT * FROM users WHERE age > ?",
        "SELECT * FROM users WHERE city = ?",
        "SELECT COUNT(*) FROM users",
        "SELECT AVG(age) FROM users",
        "SELECT * FROM users ORDER BY created_at DESC LIMIT ?",
      ];

      const params = [25, "New York", null, null, 100];

      for (let i = 0; i < queries.length; i++) {
        if (params[i] !== null) {
          await databaseConnection.query(queries[i], [params[i]]);
        } else {
          await databaseConnection.query(queries[i]);
        }
      }

      // Collect performance metrics
      const queryMetrics = await performanceMonitor.collectQueryMetrics();
      const connectionMetrics =
        await performanceMonitor.collectConnectionMetrics();
      const memoryMetrics = await performanceMonitor.collectMemoryMetrics();

      expect(queryMetrics).toHaveProperty("total_queries");
      expect(queryMetrics.total_queries).toBeGreaterThan(0);
      expect(connectionMetrics).toHaveProperty("active_connections");
      expect(memoryMetrics).toHaveProperty("heap_used");

      // Generate performance report
      const report = await performanceMonitor.generatePerformanceReport();
      expect(report).toHaveProperty("summary");
      expect(report).toHaveProperty("query_metrics");
      expect(report).toHaveProperty("connection_metrics");
      expect(report).toHaveProperty("memory_metrics");
    });

    test("should detect performance issues and provide recommendations", async () => {
      // Enable performance monitoring
      await performanceMonitor.enable();

      // Insert test data
      await insertTestData(2000);

      // Execute slow queries
      const slowQueries = [
        "SELECT * FROM users WHERE age > ? ORDER BY created_at",
        "SELECT * FROM users WHERE city = ? AND country = ?",
        "SELECT * FROM users WHERE name LIKE ?",
      ];

      const slowParams = [25, "New York", "USA", "%John%"];

      for (let i = 0; i < slowQueries.length; i++) {
        await databaseConnection.query(slowQueries[i], [slowParams[i]]);
      }

      // Check for slow query alerts
      const alerts = await performanceMonitor.checkSlowQueryAlerts(50);
      expect(Array.isArray(alerts)).toBe(true);

      // Get optimization recommendations
      const recommendations =
        await performanceMonitor.getOptimizationRecommendations(50);
      expect(Array.isArray(recommendations)).toBe(true);

      // Get index recommendations
      const indexRecommendations =
        await performanceMonitor.getIndexRecommendations();
      expect(Array.isArray(indexRecommendations)).toBe(true);
    });
  });

  // Helper functions for test data generation
  async function insertTestData(count) {
    const batchSize = 100;

    for (let batch = 0; batch < count / batchSize; batch++) {
      const values = [];
      for (let i = 0; i < batchSize; i++) {
        const id = batch * batchSize + i;
        const age = 20 + (id % 50);
        const city = `City${id % 100}`;
        const country = `Country${id % 10}`;
        values.push(
          `('User${id}', 'user${id}@example.com', ${age}, '${city}', '${country}')`,
        );
      }

      await databaseConnection.execute(
        `INSERT INTO users (name, email, age, city, country) VALUES ${values.join(", ")}`,
      );
    }
  }

  async function insertTestDataWithRelationships(count) {
    // Insert users
    await insertTestData(count);

    // Insert posts for users
    const users = await databaseConnection.query("SELECT id FROM users");
    const batchSize = 100;

    for (let batch = 0; batch < users.length / batchSize; batch++) {
      const values = [];
      for (
        let i = 0;
        i < batchSize && batch * batchSize + i < users.length;
        i++
      ) {
        const userIndex = batch * batchSize + i;
        const userId = users[userIndex].id;
        const postId = userIndex;
        const views = Math.floor(Math.random() * 1000);
        const likes = Math.floor(Math.random() * 100);
        const status = Math.random() > 0.5 ? "published" : "draft";

        values.push(
          `(${userId}, 'Post${postId}', 'Content${postId}', '${status}', ${views}, ${likes})`,
        );
      }

      if (values.length > 0) {
        await databaseConnection.execute(
          `INSERT INTO posts (user_id, title, content, status, views, likes) VALUES ${values.join(", ")}`,
        );
      }
    }
  }
});
