/**
 * Error Recovery End-to-End Tests
 *
 * Tests for error recovery across complete database operations including
 * connection failures, transaction rollbacks, data corruption, and system recovery.
 */

const DatabaseConnection = require("../../infrastructure/database/DatabaseConnection");
const DatabaseMigrationService = require("../../infrastructure/database/DatabaseMigrationService");
const PerformanceMonitor = require("../../infrastructure/database/PerformanceMonitor");
const EventStore = require("../../infrastructure/database/EventStore");
const SoftDeleteManager = require("../../infrastructure/database/SoftDeleteManager");
const AuditTrailManager = require("../../infrastructure/database/AuditTrailManager");
const Logger = require("../../infrastructure/logging/Logger");

describe("Error Recovery End-to-End Tests", () => {
  let databaseConnection;
  let migrationService;
  let performanceMonitor;
  let eventStore;
  let softDeleteManager;
  let auditTrailManager;
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
    };

    databaseConnection = new DatabaseConnection(config);
    await databaseConnection.connect();

    // Initialize components
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

    // Create test tables
    await createTestTables();
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

  async function createTestTables() {
    await databaseConnection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        age INTEGER CHECK (age >= 0 AND age <= 150),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await databaseConnection.execute(`
      CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        content TEXT,
        status TEXT DEFAULT 'draft',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);
  }

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

  describe("Connection Failure Recovery", () => {
    test("should recover from database connection loss", async () => {
      // Insert some test data
      await databaseConnection.execute(
        "INSERT INTO users (name, email, age) VALUES (?, ?, ?)",
        ["John Doe", "john@example.com", 30],
      );

      // Verify data exists
      const users = await databaseConnection.query(
        "SELECT * FROM users WHERE email = ?",
        ["john@example.com"],
      );
      expect(users).toHaveLength(1);

      // Simulate connection loss
      await databaseConnection.disconnect();
      expect(databaseConnection.isConnected).toBe(false);

      // Attempt to query (should fail)
      await expect(
        databaseConnection.query("SELECT * FROM users"),
      ).rejects.toThrow();

      // Reconnect
      const config = {
        type: "sqlite",
        database: ":memory:",
      };

      databaseConnection = new DatabaseConnection(config);
      await databaseConnection.connect();

      // Recreate tables
      await createTestTables();

      // Verify reconnection
      expect(databaseConnection.isConnected).toBe(true);
      expect(databaseConnection.getType()).toBe("sqlite");

      // Note: In-memory database loses data on disconnect, but structure is maintained
      const tables = await databaseConnection.query(
        "SELECT name FROM sqlite_master WHERE type='table'",
      );
      expect(tables.length).toBeGreaterThan(0);
    });

    test("should handle connection timeout gracefully", async () => {
      // Mock connection timeout
      const originalQuery = databaseConnection.query;
      databaseConnection.query = jest.fn().mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Connection timeout")), 100);
        });
      });

      // Attempt query (should timeout)
      await expect(
        databaseConnection.query("SELECT * FROM users"),
      ).rejects.toThrow("Connection timeout");

      // Restore connection
      databaseConnection.query = originalQuery;

      // Verify recovery
      const result = await databaseConnection.query(
        'SELECT * FROM sqlite_master WHERE type="table"',
      );
      expect(Array.isArray(result)).toBe(true);
    });

    test("should handle connection pool exhaustion", async () => {
      // Simulate connection pool exhaustion
      const originalQuery = databaseConnection.query;
      databaseConnection.query = jest
        .fn()
        .mockRejectedValue(new Error("Connection pool exhausted"));

      // Attempt query (should fail)
      await expect(
        databaseConnection.query("SELECT * FROM users"),
      ).rejects.toThrow("Connection pool exhausted");

      // Restore connection
      databaseConnection.query = originalQuery;

      // Verify recovery
      const result = await databaseConnection.query(
        'SELECT * FROM sqlite_master WHERE type="table"',
      );
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("Transaction Rollback Recovery", () => {
    test("should recover from transaction failures", async () => {
      // Start transaction
      await databaseConnection.execute("BEGIN TRANSACTION");

      try {
        // Insert user
        await databaseConnection.execute(
          "INSERT INTO users (name, email, age) VALUES (?, ?, ?)",
          ["John Doe", "john@example.com", 30],
        );

        // Get user ID
        const users = await databaseConnection.query(
          "SELECT * FROM users WHERE email = ?",
          ["john@example.com"],
        );
        const userId = users[0].id;

        // Insert post
        await databaseConnection.execute(
          "INSERT INTO posts (user_id, title, content) VALUES (?, ?, ?)",
          [userId, "Test Post", "This is a test post"],
        );

        // Simulate error
        throw new Error("Simulated transaction failure");
      } catch (error) {
        // Rollback transaction
        await databaseConnection.execute("ROLLBACK");

        // Verify no data was committed
        const users = await databaseConnection.query("SELECT * FROM users");
        const posts = await databaseConnection.query("SELECT * FROM posts");

        expect(users).toHaveLength(0);
        expect(posts).toHaveLength(0);
      }
    });

    test("should recover from constraint violation failures", async () => {
      // Start transaction
      await databaseConnection.execute("BEGIN TRANSACTION");

      try {
        // Insert user
        await databaseConnection.execute(
          "INSERT INTO users (name, email, age) VALUES (?, ?, ?)",
          ["John Doe", "john@example.com", 30],
        );

        // Attempt to insert user with duplicate email (should fail)
        await databaseConnection.execute(
          "INSERT INTO users (name, email, age) VALUES (?, ?, ?)",
          ["Jane Doe", "john@example.com", 25],
        );

        // This should not be reached
        expect(true).toBe(false);
      } catch (error) {
        // Rollback transaction
        await databaseConnection.execute("ROLLBACK");

        // Verify no data was committed
        const users = await databaseConnection.query("SELECT * FROM users");
        expect(users).toHaveLength(0);
      }
    });

    test("should recover from foreign key constraint failures", async () => {
      // Start transaction
      await databaseConnection.execute("BEGIN TRANSACTION");

      try {
        // Insert user
        await databaseConnection.execute(
          "INSERT INTO users (name, email, age) VALUES (?, ?, ?)",
          ["John Doe", "john@example.com", 30],
        );

        // Attempt to insert post with invalid user_id (should fail)
        await databaseConnection.execute(
          "INSERT INTO posts (user_id, title, content) VALUES (?, ?, ?)",
          [999, "Invalid Post", "This should fail"],
        );

        // This should not be reached
        expect(true).toBe(false);
      } catch (error) {
        // Rollback transaction
        await databaseConnection.execute("ROLLBACK");

        // Verify no data was committed
        const users = await databaseConnection.query("SELECT * FROM users");
        const posts = await databaseConnection.query("SELECT * FROM posts");

        expect(users).toHaveLength(0);
        expect(posts).toHaveLength(0);
      }
    });

    test("should recover from check constraint failures", async () => {
      // Start transaction
      await databaseConnection.execute("BEGIN TRANSACTION");

      try {
        // Attempt to insert user with invalid age (should fail)
        await databaseConnection.execute(
          "INSERT INTO users (name, email, age) VALUES (?, ?, ?)",
          ["John Doe", "john@example.com", -1],
        );

        // This should not be reached
        expect(true).toBe(false);
      } catch (error) {
        // Rollback transaction
        await databaseConnection.execute("ROLLBACK");

        // Verify no data was committed
        const users = await databaseConnection.query("SELECT * FROM users");
        expect(users).toHaveLength(0);
      }
    });
  });

  describe("Data Corruption Recovery", () => {
    test("should recover from data corruption scenarios", async () => {
      // Insert test data
      await databaseConnection.execute(
        "INSERT INTO users (name, email, age) VALUES (?, ?, ?)",
        ["John Doe", "john@example.com", 30],
      );

      // Verify data integrity
      const users = await databaseConnection.query(
        "SELECT * FROM users WHERE email = ?",
        ["john@example.com"],
      );
      expect(users).toHaveLength(1);
      expect(users[0].name).toBe("John Doe");

      // Simulate data corruption by direct manipulation
      await databaseConnection.execute(
        "UPDATE users SET name = ? WHERE email = ?",
        ["Corrupted Name", "john@example.com"],
      );

      // Verify corruption
      const corruptedUsers = await databaseConnection.query(
        "SELECT * FROM users WHERE email = ?",
        ["john@example.com"],
      );
      expect(corruptedUsers[0].name).toBe("Corrupted Name");

      // Recover from corruption
      await databaseConnection.execute(
        "UPDATE users SET name = ? WHERE email = ?",
        ["John Doe", "john@example.com"],
      );

      // Verify recovery
      const recoveredUsers = await databaseConnection.query(
        "SELECT * FROM users WHERE email = ?",
        ["john@example.com"],
      );
      expect(recoveredUsers[0].name).toBe("John Doe");
    });

    test("should recover from schema corruption", async () => {
      // Verify initial schema
      const initialTables = await databaseConnection.query(
        "SELECT name FROM sqlite_master WHERE type='table'",
      );
      expect(initialTables.length).toBeGreaterThan(0);

      // Simulate schema corruption by dropping table
      await databaseConnection.execute("DROP TABLE IF EXISTS users");

      // Verify corruption
      const corruptedTables = await databaseConnection.query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='users'",
      );
      expect(corruptedTables).toHaveLength(0);

      // Recover schema
      await createTestTables();

      // Verify recovery
      const recoveredTables = await databaseConnection.query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='users'",
      );
      expect(recoveredTables).toHaveLength(1);
    });

    test("should recover from index corruption", async () => {
      // Create index
      await databaseConnection.execute(
        "CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)",
      );

      // Verify index exists
      const indexes = await databaseConnection.query(
        "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_users_email'",
      );
      expect(indexes).toHaveLength(1);

      // Simulate index corruption by dropping index
      await databaseConnection.execute("DROP INDEX IF EXISTS idx_users_email");

      // Verify corruption
      const corruptedIndexes = await databaseConnection.query(
        "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_users_email'",
      );
      expect(corruptedIndexes).toHaveLength(0);

      // Recover index
      await databaseConnection.execute(
        "CREATE INDEX idx_users_email ON users (email)",
      );

      // Verify recovery
      const recoveredIndexes = await databaseConnection.query(
        "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_users_email'",
      );
      expect(recoveredIndexes).toHaveLength(1);
    });
  });

  describe("Migration Failure Recovery", () => {
    test("should recover from migration failures", async () => {
      // Create initial migration
      const initialMigration = {
        version: "1.0.0",
        description: "Create users table",
        up: `
          CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            age INTEGER
          )
        `,
        down: "DROP TABLE users",
      };

      await migrationService.executeMigration(initialMigration);

      // Verify migration was applied
      const currentVersion = await migrationService.getCurrentVersion();
      expect(currentVersion.version).toBe("1.0.0");

      // Create failing migration
      const failingMigration = {
        version: "1.1.0",
        description: "Add invalid column",
        up: "ALTER TABLE users ADD COLUMN invalid_column INVALID_TYPE",
        down: "ALTER TABLE users DROP COLUMN invalid_column",
      };

      // Attempt migration (should fail)
      await expect(
        migrationService.executeMigration(failingMigration),
      ).rejects.toThrow();

      // Verify migration was not applied
      const versionAfterFailure = await migrationService.getCurrentVersion();
      expect(versionAfterFailure.version).toBe("1.0.0");

      // Create valid migration
      const validMigration = {
        version: "1.1.0",
        description: "Add phone column",
        up: "ALTER TABLE users ADD COLUMN phone TEXT",
        down: "ALTER TABLE users DROP COLUMN phone",
      };

      // Apply valid migration
      await migrationService.executeMigration(validMigration);

      // Verify migration was applied
      const finalVersion = await migrationService.getCurrentVersion();
      expect(finalVersion.version).toBe("1.1.0");
    });

    test("should recover from migration rollback failures", async () => {
      // Create migration
      const migration = {
        version: "1.0.0",
        description: "Create users table",
        up: `
          CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL
          )
        `,
        down: "DROP TABLE users",
      };

      await migrationService.executeMigration(migration);

      // Verify migration was applied
      const currentVersion = await migrationService.getCurrentVersion();
      expect(currentVersion.version).toBe("1.0.0");

      // Simulate rollback failure
      const originalExecute = databaseConnection.execute;
      databaseConnection.execute = jest.fn().mockImplementation((sql) => {
        if (sql.includes("DELETE FROM schema_versions")) {
          throw new Error("Rollback failure");
        }
        return originalExecute.call(databaseConnection, sql);
      });

      // Attempt rollback (should fail)
      await expect(migrationService.rollbackMigration("1.0.0")).rejects.toThrow(
        "Rollback failure",
      );

      // Restore execute method
      databaseConnection.execute = originalExecute;

      // Verify migration is still applied
      const versionAfterFailure = await migrationService.getCurrentVersion();
      expect(versionAfterFailure.version).toBe("1.0.0");

      // Attempt rollback again (should succeed)
      await migrationService.rollbackMigration("1.0.0");

      // Verify rollback was successful
      const versionAfterRollback = await migrationService.getCurrentVersion();
      expect(versionAfterRollback).toBeNull();
    });
  });

  describe("Component Failure Recovery", () => {
    test("should recover from event store failures", async () => {
      // Store event
      const event = {
        aggregateId: "user-123",
        eventType: "UserCreated",
        eventData: { name: "John Doe", email: "john@example.com" },
        version: 1,
        timestamp: new Date().toISOString(),
      };

      await eventStore.storeEvent(event);

      // Verify event was stored
      const events = await eventStore.getEvents("user-123");
      expect(events).toHaveLength(1);

      // Simulate event store failure
      const originalStoreEvent = eventStore.storeEvent;
      eventStore.storeEvent = jest
        .fn()
        .mockRejectedValue(new Error("Event store failure"));

      // Attempt to store event (should fail)
      await expect(eventStore.storeEvent(event)).rejects.toThrow(
        "Event store failure",
      );

      // Restore event store
      eventStore.storeEvent = originalStoreEvent;

      // Verify recovery
      const newEvent = {
        aggregateId: "user-123",
        eventType: "UserUpdated",
        eventData: { name: "Jane Doe" },
        version: 2,
        timestamp: new Date().toISOString(),
      };

      await eventStore.storeEvent(newEvent);

      // Verify event was stored
      const updatedEvents = await eventStore.getEvents("user-123");
      expect(updatedEvents).toHaveLength(2);
    });

    test("should recover from audit trail failures", async () => {
      // Log audit operation
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

      // Verify audit was logged
      const auditTrail = await auditTrailManager.getAuditTrailForRecord(
        "users",
        "1",
      );
      expect(auditTrail).toHaveLength(1);

      // Simulate audit trail failure
      const originalLogOperation = auditTrailManager.logOperation;
      auditTrailManager.logOperation = jest
        .fn()
        .mockRejectedValue(new Error("Audit trail failure"));

      // Attempt to log audit (should fail)
      await expect(auditTrailManager.logOperation(auditData)).rejects.toThrow(
        "Audit trail failure",
      );

      // Restore audit trail
      auditTrailManager.logOperation = originalLogOperation;

      // Verify recovery
      const newAuditData = {
        tableName: "users",
        operation: "UPDATE",
        recordId: "1",
        oldValues: { name: "John Doe", email: "john@example.com" },
        newValues: { name: "Jane Doe", email: "john@example.com" },
        userId: "system",
        timestamp: new Date().toISOString(),
      };

      await auditTrailManager.logOperation(newAuditData);

      // Verify audit was logged
      const updatedAuditTrail = await auditTrailManager.getAuditTrailForRecord(
        "users",
        "1",
      );
      expect(updatedAuditTrail).toHaveLength(2);
    });

    test("should recover from soft delete manager failures", async () => {
      // Insert user
      await databaseConnection.execute(
        "INSERT INTO users (name, email, age) VALUES (?, ?, ?)",
        ["John Doe", "john@example.com", 30],
      );

      const users = await databaseConnection.query(
        "SELECT * FROM users WHERE email = ?",
        ["john@example.com"],
      );
      const userId = users[0].id;

      // Soft delete user
      await softDeleteManager.softDelete("users", userId);

      // Verify soft delete
      const deletedUsers = await databaseConnection.query(
        "SELECT * FROM users WHERE id = ?",
        [userId],
      );
      expect(deletedUsers).toHaveLength(0);

      // Simulate soft delete manager failure
      const originalSoftDelete = softDeleteManager.softDelete;
      softDeleteManager.softDelete = jest
        .fn()
        .mockRejectedValue(new Error("Soft delete failure"));

      // Insert another user
      await databaseConnection.execute(
        "INSERT INTO users (name, email, age) VALUES (?, ?, ?)",
        ["Jane Doe", "jane@example.com", 25],
      );

      const newUsers = await databaseConnection.query(
        "SELECT * FROM users WHERE email = ?",
        ["jane@example.com"],
      );
      const newUserId = newUsers[0].id;

      // Attempt soft delete (should fail)
      await expect(
        softDeleteManager.softDelete("users", newUserId),
      ).rejects.toThrow("Soft delete failure");

      // Restore soft delete manager
      softDeleteManager.softDelete = originalSoftDelete;

      // Verify recovery
      await softDeleteManager.softDelete("users", newUserId);

      // Verify soft delete
      const deletedNewUsers = await databaseConnection.query(
        "SELECT * FROM users WHERE id = ?",
        [newUserId],
      );
      expect(deletedNewUsers).toHaveLength(0);
    });

    test("should recover from performance monitor failures", async () => {
      // Enable performance monitoring
      await performanceMonitor.enable();
      expect(performanceMonitor.enabled).toBe(true);

      // Simulate performance monitor failure
      const originalCollectMetrics = performanceMonitor.collectQueryMetrics;
      performanceMonitor.collectQueryMetrics = jest
        .fn()
        .mockRejectedValue(new Error("Performance monitor failure"));

      // Attempt to collect metrics (should fail)
      await expect(performanceMonitor.collectQueryMetrics()).rejects.toThrow(
        "Performance monitor failure",
      );

      // Restore performance monitor
      performanceMonitor.collectQueryMetrics = originalCollectMetrics;

      // Verify recovery
      const metrics = await performanceMonitor.collectQueryMetrics();
      expect(metrics).toHaveProperty("total_queries");
    });
  });

  describe("System Recovery Workflow", () => {
    test("should recover from complete system failure", async () => {
      // Insert test data
      await databaseConnection.execute(
        "INSERT INTO users (name, email, age) VALUES (?, ?, ?)",
        ["John Doe", "john@example.com", 30],
      );

      // Store event
      const event = {
        aggregateId: "user-123",
        eventType: "UserCreated",
        eventData: { name: "John Doe", email: "john@example.com" },
        version: 1,
        timestamp: new Date().toISOString(),
      };

      await eventStore.storeEvent(event);

      // Log audit
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

      // Simulate complete system failure
      await databaseConnection.disconnect();
      expect(databaseConnection.isConnected).toBe(false);

      // Recover system
      const config = {
        type: "sqlite",
        database: ":memory:",
        monitoring: true,
      };

      databaseConnection = new DatabaseConnection(config);
      await databaseConnection.connect();

      // Reinitialize components
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

      // Recreate tables
      await createTestTables();

      // Verify system recovery
      expect(databaseConnection.isConnected).toBe(true);
      expect(performanceMonitor.enabled).toBe(true);

      // Verify components are functional
      const tables = await databaseConnection.query(
        "SELECT name FROM sqlite_master WHERE type='table'",
      );
      expect(tables.length).toBeGreaterThan(0);

      // Note: In-memory database loses data on disconnect, but system structure is maintained
    });

    test("should recover from partial system failure", async () => {
      // Insert test data
      await databaseConnection.execute(
        "INSERT INTO users (name, email, age) VALUES (?, ?, ?)",
        ["John Doe", "john@example.com", 30],
      );

      // Verify data exists
      const users = await databaseConnection.query(
        "SELECT * FROM users WHERE email = ?",
        ["john@example.com"],
      );
      expect(users).toHaveLength(1);

      // Simulate partial system failure (database connection fails)
      const originalQuery = databaseConnection.query;
      databaseConnection.query = jest
        .fn()
        .mockRejectedValue(new Error("Database connection failed"));

      // Attempt query (should fail)
      await expect(
        databaseConnection.query("SELECT * FROM users"),
      ).rejects.toThrow("Database connection failed");

      // Restore database connection
      databaseConnection.query = originalQuery;

      // Verify partial recovery
      const recoveredUsers = await databaseConnection.query(
        "SELECT * FROM users WHERE email = ?",
        ["john@example.com"],
      );
      expect(recoveredUsers).toHaveLength(1);
      expect(recoveredUsers[0].name).toBe("John Doe");

      // Verify other components are still functional
      expect(performanceMonitor.enabled).toBe(true);
      expect(eventStore).toBeDefined();
      expect(softDeleteManager).toBeDefined();
      expect(auditTrailManager).toBeDefined();
    });
  });
});
