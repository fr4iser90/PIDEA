/**
 * Database Workflow End-to-End Tests
 *
 * Tests for complete database workflows including application lifecycle,
 * data operations, migrations, and system integration across all database components.
 */

const DatabaseConnection = require("../../infrastructure/database/DatabaseConnection");
const DatabaseMigrationService = require("../../infrastructure/database/DatabaseMigrationService");
const PerformanceMonitor = require("../../infrastructure/database/PerformanceMonitor");
const EventStore = require("../../infrastructure/database/EventStore");
const SoftDeleteManager = require("../../infrastructure/database/SoftDeleteManager");
const AuditTrailManager = require("../../infrastructure/database/AuditTrailManager");
const SchemaVersionManager = require("../../infrastructure/database/SchemaVersionManager");
const Logger = require("../../infrastructure/logging/Logger");

describe("Database Workflow End-to-End Tests", () => {
  let databaseConnection;
  let migrationService;
  let performanceMonitor;
  let eventStore;
  let softDeleteManager;
  let auditTrailManager;
  let schemaVersionManager;
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

    // Initialize all database components
    migrationService = new DatabaseMigrationService(databaseConnection);
    await migrationService.initialize();

    performanceMonitor = new PerformanceMonitor(databaseConnection);
    await performanceMonitor.initialize();

    eventStore = new EventStore(databaseConnection);
    await eventStore.initialize();

    softDeleteManager = new SoftDeleteManager(databaseConnection);
    await softDeleteManager.initialize();

    auditTrailManager = new AuditTrailManager(databaseConnection);
    await auditTrailManager.initialize();

    schemaVersionManager = new SchemaVersionManager(databaseConnection);
    await schemaVersionManager.initialize();
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

  async function cleanupTestData() {
    try {
      await databaseConnection.execute("DELETE FROM posts");
      await databaseConnection.execute("DELETE FROM users");
      await databaseConnection.execute("DELETE FROM events");
      await databaseConnection.execute("DELETE FROM audit_trail");
      await databaseConnection.execute("DELETE FROM soft_deletes");
    } catch (error) {
      // Ignore cleanup errors for non-existent tables
    }
  }

  describe("Complete Application Lifecycle", () => {
    test("should handle complete application startup workflow", async () => {
      // 1. Database connection
      expect(databaseConnection.isConnected).toBe(true);
      expect(databaseConnection.getType()).toBe("sqlite");

      // 2. Schema versioning
      await schemaVersionManager.setVersion(
        "1.0.0",
        "Initial application version",
      );
      const currentVersion = await schemaVersionManager.getCurrentVersion();
      expect(currentVersion.version).toBe("1.0.0");

      // 3. Performance monitoring
      const performanceMetrics =
        await performanceMonitor.collectConnectionMetrics();
      expect(performanceMetrics).toHaveProperty("active_connections");

      // 4. Audit trail
      const auditConfig = await auditTrailManager.getConfiguration();
      expect(auditConfig).toBeDefined();

      // 5. Event store
      const eventStoreStatus = await eventStore.getStatus();
      expect(eventStoreStatus).toBeDefined();

      // 6. Soft delete manager
      const softDeleteStatus = await softDeleteManager.getStatus();
      expect(softDeleteStatus).toBeDefined();
    });

    test("should handle complete application shutdown workflow", async () => {
      // 1. Stop performance monitoring
      await performanceMonitor.disable();
      expect(performanceMonitor.enabled).toBe(false);

      // 2. Flush audit trail
      await auditTrailManager.flushPendingAudits();

      // 3. Close event store
      await eventStore.close();

      // 4. Disconnect database
      await databaseConnection.disconnect();
      expect(databaseConnection.isConnected).toBe(false);
    });
  });

  describe("Complete Data Operations Workflow", () => {
    test("should handle complete CRUD operations with all patterns", async () => {
      // 1. Create user with event sourcing
      const userCreatedEvent = {
        aggregateId: "user-123",
        eventType: "UserCreated",
        eventData: { name: "John Doe", email: "john@example.com" },
        version: 1,
        timestamp: new Date().toISOString(),
      };

      await eventStore.storeEvent(userCreatedEvent);

      // 2. Create user record in database
      await databaseConnection.execute(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await databaseConnection.execute(
        "INSERT INTO users (name, email) VALUES (?, ?)",
        ["John Doe", "john@example.com"],
      );

      // 3. Audit the creation
      const auditData = {
        tableName: "users",
        operation: "INSERT",
        recordId: "1",
        oldValues: null,
        newValues: { name: "John Doe", email: "john@example.com" },
        userId: "system",
        timestamp: new Date().toISOString(),
      };

      await auditTrailManager.logOperation(auditData);

      // 4. Read user data
      const users = await databaseConnection.query(
        "SELECT * FROM users WHERE email = ?",
        ["john@example.com"],
      );
      expect(users).toHaveLength(1);
      expect(users[0].name).toBe("John Doe");

      // 5. Update user with event sourcing
      const userUpdatedEvent = {
        aggregateId: "user-123",
        eventType: "UserUpdated",
        eventData: { name: "Jane Doe" },
        version: 2,
        timestamp: new Date().toISOString(),
      };

      await eventStore.storeEvent(userUpdatedEvent);

      // 6. Update user record
      await databaseConnection.execute(
        "UPDATE users SET name = ? WHERE email = ?",
        ["Jane Doe", "john@example.com"],
      );

      // 7. Audit the update
      const updateAuditData = {
        tableName: "users",
        operation: "UPDATE",
        recordId: "1",
        oldValues: { name: "John Doe", email: "john@example.com" },
        newValues: { name: "Jane Doe", email: "john@example.com" },
        userId: "system",
        timestamp: new Date().toISOString(),
      };

      await auditTrailManager.logOperation(updateAuditData);

      // 8. Soft delete user
      await softDeleteManager.softDelete("users", 1);

      // 9. Audit the soft delete
      const deleteAuditData = {
        tableName: "users",
        operation: "SOFT_DELETE",
        recordId: "1",
        oldValues: { name: "Jane Doe", email: "john@example.com" },
        newValues: null,
        userId: "system",
        timestamp: new Date().toISOString(),
      };

      await auditTrailManager.logOperation(deleteAuditData);

      // 10. Verify soft delete
      const deletedUsers = await databaseConnection.query(
        "SELECT * FROM users WHERE email = ?",
        ["john@example.com"],
      );
      expect(deletedUsers).toHaveLength(0);

      // 11. Verify audit trail
      const auditTrail = await auditTrailManager.getAuditTrailForRecord(
        "users",
        "1",
      );
      expect(auditTrail).toHaveLength(3); // INSERT, UPDATE, SOFT_DELETE

      // 12. Verify event store
      const events = await eventStore.getEvents("user-123");
      expect(events).toHaveLength(2); // UserCreated, UserUpdated
    });

    test("should handle complex data relationships workflow", async () => {
      // 1. Create users table
      await databaseConnection.execute(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 2. Create posts table
      await databaseConnection.execute(`
        CREATE TABLE IF NOT EXISTS posts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          title TEXT NOT NULL,
          content TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `);

      // 3. Create user
      await databaseConnection.execute(
        "INSERT INTO users (name, email) VALUES (?, ?)",
        ["John Doe", "john@example.com"],
      );

      const users = await databaseConnection.query(
        "SELECT * FROM users WHERE email = ?",
        ["john@example.com"],
      );
      const userId = users[0].id;

      // 4. Create posts for user
      const posts = [
        { title: "First Post", content: "This is the first post" },
        { title: "Second Post", content: "This is the second post" },
      ];

      for (const post of posts) {
        await databaseConnection.execute(
          "INSERT INTO posts (user_id, title, content) VALUES (?, ?, ?)",
          [userId, post.title, post.content],
        );
      }

      // 5. Query user with posts
      const userWithPosts = await databaseConnection.query(
        `
        SELECT u.*, p.title as post_title, p.content as post_content
        FROM users u
        LEFT JOIN posts p ON u.id = p.user_id
        WHERE u.id = ?
      `,
        [userId],
      );

      expect(userWithPosts).toHaveLength(2);
      expect(userWithPosts[0].name).toBe("John Doe");
      expect(userWithPosts[0].post_title).toBe("First Post");

      // 6. Soft delete user (should cascade to posts)
      await softDeleteManager.softDelete("users", userId);

      // 7. Verify cascade soft delete
      const deletedUsers = await databaseConnection.query(
        "SELECT * FROM users WHERE id = ?",
        [userId],
      );
      const deletedPosts = await databaseConnection.query(
        "SELECT * FROM posts WHERE user_id = ?",
        [userId],
      );

      expect(deletedUsers).toHaveLength(0);
      expect(deletedPosts).toHaveLength(0);
    });
  });

  describe("Complete Migration Workflow", () => {
    test("should handle complete database migration workflow", async () => {
      // 1. Initial migration
      const initialMigration = {
        version: "1.0.0",
        description: "Create initial tables",
        up: `
          CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `,
        down: "DROP TABLE users",
      };

      await migrationService.executeMigration(initialMigration);

      // 2. Verify initial migration
      const tables = await databaseConnection.query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='users'",
      );
      expect(tables).toHaveLength(1);

      const currentVersion = await schemaVersionManager.getCurrentVersion();
      expect(currentVersion.version).toBe("1.0.0");

      // 3. Second migration
      const secondMigration = {
        version: "1.1.0",
        description: "Add phone column to users",
        up: "ALTER TABLE users ADD COLUMN phone TEXT",
        down: "ALTER TABLE users DROP COLUMN phone",
      };

      await migrationService.executeMigration(secondMigration);

      // 4. Verify second migration
      const columns = await databaseConnection.query(
        "PRAGMA table_info(users)",
      );
      expect(columns).toHaveLength(4); // id, name, email, phone

      const updatedVersion = await schemaVersionManager.getCurrentVersion();
      expect(updatedVersion.version).toBe("1.1.0");

      // 5. Third migration
      const thirdMigration = {
        version: "1.2.0",
        description: "Create posts table",
        up: `
          CREATE TABLE posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            content TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
          )
        `,
        down: "DROP TABLE posts",
      };

      await migrationService.executeMigration(thirdMigration);

      // 6. Verify third migration
      const allTables = await databaseConnection.query(
        "SELECT name FROM sqlite_master WHERE type='table'",
      );
      expect(allTables).toHaveLength(2); // users, posts

      const finalVersion = await schemaVersionManager.getCurrentVersion();
      expect(finalVersion.version).toBe("1.2.0");

      // 7. Rollback migration
      await migrationService.rollbackMigration("1.2.0");

      // 8. Verify rollback
      const tablesAfterRollback = await databaseConnection.query(
        "SELECT name FROM sqlite_master WHERE type='table'",
      );
      expect(tablesAfterRollback).toHaveLength(1); // Only users table

      const versionAfterRollback =
        await schemaVersionManager.getCurrentVersion();
      expect(versionAfterRollback.version).toBe("1.1.0");
    });

    test("should handle migration with data preservation", async () => {
      // 1. Create initial table with data
      const initialMigration = {
        version: "1.0.0",
        description: "Create users table",
        up: `
          CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL
          )
        `,
        down: "DROP TABLE users",
      };

      await migrationService.executeMigration(initialMigration);

      // 2. Insert test data
      await databaseConnection.execute(
        "INSERT INTO users (name, email) VALUES (?, ?)",
        ["John Doe", "john@example.com"],
      );

      const users = await databaseConnection.query("SELECT * FROM users");
      expect(users).toHaveLength(1);

      // 3. Migration that adds column
      const addColumnMigration = {
        version: "1.1.0",
        description: "Add phone column",
        up: "ALTER TABLE users ADD COLUMN phone TEXT",
        down: "ALTER TABLE users DROP COLUMN phone",
      };

      await migrationService.executeMigration(addColumnMigration);

      // 4. Verify data preservation
      const usersAfterMigration = await databaseConnection.query(
        "SELECT * FROM users",
      );
      expect(usersAfterMigration).toHaveLength(1);
      expect(usersAfterMigration[0].name).toBe("John Doe");
      expect(usersAfterMigration[0].email).toBe("john@example.com");
      expect(usersAfterMigration[0].phone).toBeNull();
    });
  });

  describe("Complete Performance Monitoring Workflow", () => {
    test("should handle complete performance monitoring workflow", async () => {
      // 1. Enable performance monitoring
      await performanceMonitor.enable();
      expect(performanceMonitor.enabled).toBe(true);

      // 2. Create test table
      await databaseConnection.execute(`
        CREATE TABLE IF NOT EXISTS test_table (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          value INTEGER
        )
      `);

      // 3. Execute queries to generate metrics
      const queries = [
        "INSERT INTO test_table (name, value) VALUES (?, ?)",
        "SELECT * FROM test_table WHERE name = ?",
        "UPDATE test_table SET value = ? WHERE name = ?",
        "DELETE FROM test_table WHERE name = ?",
      ];

      for (let i = 0; i < 10; i++) {
        await databaseConnection.execute(queries[0], [`Test${i}`, i]);
        await databaseConnection.query(queries[1], [`Test${i}`]);
        await databaseConnection.execute(queries[2], [i * 2, `Test${i}`]);
        await databaseConnection.execute(queries[3], [`Test${i}`]);
      }

      // 4. Collect performance metrics
      const connectionMetrics =
        await performanceMonitor.collectConnectionMetrics();
      const queryMetrics = await performanceMonitor.collectQueryMetrics();
      const memoryMetrics = await performanceMonitor.collectMemoryMetrics();

      expect(connectionMetrics).toHaveProperty("active_connections");
      expect(queryMetrics).toHaveProperty("total_queries");
      expect(memoryMetrics).toHaveProperty("heap_used");

      // 5. Generate performance report
      const report = await performanceMonitor.generatePerformanceReport();
      expect(report).toHaveProperty("summary");
      expect(report).toHaveProperty("query_metrics");
      expect(report).toHaveProperty("connection_metrics");
      expect(report).toHaveProperty("memory_metrics");

      // 6. Check for performance alerts
      const alerts = await performanceMonitor.checkSlowQueryAlerts(100);
      expect(Array.isArray(alerts)).toBe(true);

      // 7. Get optimization recommendations
      const recommendations =
        await performanceMonitor.getOptimizationRecommendations(50);
      expect(Array.isArray(recommendations)).toBe(true);
    });

    test("should handle performance monitoring with large datasets", async () => {
      // 1. Create large test table
      await databaseConnection.execute(`
        CREATE TABLE IF NOT EXISTS large_table (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          value INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 2. Insert large dataset
      const batchSize = 100;
      const totalRecords = 1000;

      for (let batch = 0; batch < totalRecords / batchSize; batch++) {
        const values = [];
        for (let i = 0; i < batchSize; i++) {
          const id = batch * batchSize + i;
          values.push(`('Record${id}', ${id})`);
        }

        await databaseConnection.execute(
          `INSERT INTO large_table (name, value) VALUES ${values.join(", ")}`,
        );
      }

      // 3. Execute complex queries
      const complexQueries = [
        "SELECT COUNT(*) FROM large_table",
        "SELECT AVG(value) FROM large_table",
        "SELECT MAX(value) FROM large_table",
        "SELECT MIN(value) FROM large_table",
        "SELECT * FROM large_table WHERE value > ? ORDER BY value DESC LIMIT 10",
      ];

      for (const query of complexQueries) {
        if (query.includes("?")) {
          await databaseConnection.query(query, [500]);
        } else {
          await databaseConnection.query(query);
        }
      }

      // 4. Collect performance metrics
      const queryMetrics = await performanceMonitor.collectQueryMetrics();
      expect(queryMetrics.total_queries).toBeGreaterThan(0);

      // 5. Generate performance report
      const report = await performanceMonitor.generatePerformanceReport();
      expect(report.query_metrics.total_queries).toBeGreaterThan(0);
    });
  });

  describe("Complete Event Sourcing Workflow", () => {
    test("should handle complete event sourcing workflow", async () => {
      // 1. Create user aggregate
      const userCreatedEvent = {
        aggregateId: "user-123",
        eventType: "UserCreated",
        eventData: { name: "John Doe", email: "john@example.com" },
        version: 1,
        timestamp: new Date().toISOString(),
      };

      await eventStore.storeEvent(userCreatedEvent);

      // 2. Update user aggregate
      const userUpdatedEvent = {
        aggregateId: "user-123",
        eventType: "UserUpdated",
        eventData: { name: "Jane Doe" },
        version: 2,
        timestamp: new Date().toISOString(),
      };

      await eventStore.storeEvent(userUpdatedEvent);

      // 3. Add user role
      const roleAddedEvent = {
        aggregateId: "user-123",
        eventType: "RoleAdded",
        eventData: { role: "admin" },
        version: 3,
        timestamp: new Date().toISOString(),
      };

      await eventStore.storeEvent(roleAddedEvent);

      // 4. Retrieve all events
      const events = await eventStore.getEvents("user-123");
      expect(events).toHaveLength(3);
      expect(events[0].eventType).toBe("UserCreated");
      expect(events[1].eventType).toBe("UserUpdated");
      expect(events[2].eventType).toBe("RoleAdded");

      // 5. Reconstruct aggregate
      const aggregate = await eventStore.reconstructAggregate("user-123");
      expect(aggregate.id).toBe("user-123");
      expect(aggregate.name).toBe("Jane Doe"); // Latest name
      expect(aggregate.email).toBe("john@example.com"); // From first event
      expect(aggregate.role).toBe("admin"); // From third event

      // 6. Create snapshot
      await eventStore.createSnapshot("user-123", 2, {
        id: "user-123",
        name: "Jane Doe",
        email: "john@example.com",
      });

      // 7. Verify snapshot
      const snapshot = await eventStore.getSnapshot("user-123");
      expect(snapshot).toBeDefined();
      expect(snapshot.version).toBe(2);
      expect(snapshot.data.name).toBe("Jane Doe");
    });

    test("should handle event sourcing with large event streams", async () => {
      const aggregateId = "large-aggregate-123";
      const eventCount = 1000;

      // 1. Store large number of events
      const events = Array(eventCount)
        .fill()
        .map((_, i) => ({
          aggregateId,
          eventType: "DataUpdated",
          eventData: { value: i, timestamp: new Date().toISOString() },
          version: i + 1,
          timestamp: new Date().toISOString(),
        }));

      const startTime = Date.now();
      for (const event of events) {
        await eventStore.storeEvent(event);
      }
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(10000); // Should complete in less than 10 seconds

      // 2. Retrieve all events
      const retrievedEvents = await eventStore.getEvents(aggregateId);
      expect(retrievedEvents).toHaveLength(eventCount);

      // 3. Create snapshot at midpoint
      const snapshotVersion = Math.floor(eventCount / 2);
      await eventStore.createSnapshot(aggregateId, snapshotVersion, {
        id: aggregateId,
        value: snapshotVersion - 1,
        version: snapshotVersion,
      });

      // 4. Reconstruct aggregate (should use snapshot)
      const aggregate = await eventStore.reconstructAggregate(aggregateId);
      expect(aggregate.id).toBe(aggregateId);
      expect(aggregate.value).toBe(eventCount - 1); // Latest value
    });
  });

  describe("Complete System Integration Workflow", () => {
    test("should handle complete system integration workflow", async () => {
      // 1. Application startup
      expect(databaseConnection.isConnected).toBe(true);
      await performanceMonitor.enable();
      expect(performanceMonitor.enabled).toBe(true);

      // 2. Schema migration
      const migration = {
        version: "1.0.0",
        description: "Create application tables",
        up: `
          CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `,
        down: "DROP TABLE users",
      };

      await migrationService.executeMigration(migration);

      // 3. Data operations with all patterns
      // Create user with event sourcing
      const userCreatedEvent = {
        aggregateId: "user-123",
        eventType: "UserCreated",
        eventData: { name: "John Doe", email: "john@example.com" },
        version: 1,
        timestamp: new Date().toISOString(),
      };

      await eventStore.storeEvent(userCreatedEvent);

      // Insert user record
      await databaseConnection.execute(
        "INSERT INTO users (name, email) VALUES (?, ?)",
        ["John Doe", "john@example.com"],
      );

      // Audit the operation
      const auditData = {
        tableName: "users",
        operation: "INSERT",
        recordId: "1",
        oldValues: null,
        newValues: { name: "John Doe", email: "john@example.com" },
        userId: "system",
        timestamp: new Date().toISOString(),
      };

      await auditTrailManager.logOperation(auditData);

      // 4. Performance monitoring
      const performanceMetrics = await performanceMonitor.collectQueryMetrics();
      expect(performanceMetrics).toHaveProperty("total_queries");

      // 5. Data retrieval and validation
      const users = await databaseConnection.query(
        "SELECT * FROM users WHERE email = ?",
        ["john@example.com"],
      );
      expect(users).toHaveLength(1);
      expect(users[0].name).toBe("John Doe");

      // 6. Event reconstruction
      const events = await eventStore.getEvents("user-123");
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe("UserCreated");

      // 7. Audit trail verification
      const auditTrail = await auditTrailManager.getAuditTrailForRecord(
        "users",
        "1",
      );
      expect(auditTrail).toHaveLength(1);
      expect(auditTrail[0].operation).toBe("INSERT");

      // 8. Soft delete
      await softDeleteManager.softDelete("users", 1);

      // 9. Verify soft delete
      const deletedUsers = await databaseConnection.query(
        "SELECT * FROM users WHERE email = ?",
        ["john@example.com"],
      );
      expect(deletedUsers).toHaveLength(0);

      // 10. Generate comprehensive report
      const performanceReport =
        await performanceMonitor.generatePerformanceReport();
      const auditReport = await auditTrailManager.generateComplianceReport();

      expect(performanceReport).toHaveProperty("summary");
      expect(auditReport).toHaveProperty("total_operations");

      // 11. Application shutdown
      await performanceMonitor.disable();
      expect(performanceMonitor.enabled).toBe(false);
    });

    test("should handle system integration with error recovery", async () => {
      // 1. Start with normal operations
      expect(databaseConnection.isConnected).toBe(true);

      // 2. Simulate database error
      const originalQuery = databaseConnection.query;
      databaseConnection.query = jest
        .fn()
        .mockRejectedValue(new Error("Database error"));

      // 3. Attempt operations that should fail gracefully
      await expect(
        databaseConnection.query("SELECT * FROM users"),
      ).rejects.toThrow("Database error");

      // 4. Restore database connection
      databaseConnection.query = originalQuery;

      // 5. Verify system recovery
      const users = await databaseConnection.query(
        'SELECT * FROM sqlite_master WHERE type="table"',
      );
      expect(Array.isArray(users)).toBe(true);

      // 6. Continue with normal operations
      await performanceMonitor.enable();
      expect(performanceMonitor.enabled).toBe(true);

      const metrics = await performanceMonitor.collectConnectionMetrics();
      expect(metrics).toHaveProperty("active_connections");
    });
  });
});
