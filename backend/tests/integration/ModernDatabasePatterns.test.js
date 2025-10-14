/**
 * Modern Database Patterns Integration Tests
 *
 * Tests for modern database patterns including event sourcing, soft deletes,
 * schema versioning, audit trails, and cross-database compatibility.
 */

const EventStore = require("../../infrastructure/database/EventStore");
const SoftDeleteManager = require("../../infrastructure/database/SoftDeleteManager");
const SchemaVersionManager = require("../../infrastructure/database/SchemaVersionManager");
const AuditTrailManager = require("../../infrastructure/database/AuditTrailManager");
const DatabaseConnection = require("../../infrastructure/database/DatabaseConnection");
const Logger = require("../../infrastructure/logging/Logger");

describe("Modern Database Patterns Integration Tests", () => {
  let databaseConnection;
  let eventStore;
  let softDeleteManager;
  let schemaVersionManager;
  let auditTrailManager;
  let mockLogger;

  beforeEach(async () => {
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
    };

    databaseConnection = new DatabaseConnection(config);
    await databaseConnection.connect();

    // Initialize managers
    eventStore = new EventStore(databaseConnection);
    softDeleteManager = new SoftDeleteManager(databaseConnection);
    schemaVersionManager = new SchemaVersionManager(databaseConnection);
    auditTrailManager = new AuditTrailManager(databaseConnection);

    // Initialize all components
    await eventStore.initialize();
    await softDeleteManager.initialize();
    await schemaVersionManager.initialize();
    await auditTrailManager.initialize();

    // Create test tables
    await createTestTables();
  });

  afterAll(async () => {
    if (databaseConnection) {
      await databaseConnection.disconnect();
    }
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await databaseConnection.execute(`
      CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        content TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);
  }

  async function cleanupTestData() {
    await databaseConnection.execute("DELETE FROM posts");
    await databaseConnection.execute("DELETE FROM users");
  }

  describe("Event Sourcing Integration", () => {
    test("should store and retrieve events", async () => {
      const event = {
        aggregateId: "user-123",
        eventType: "UserCreated",
        eventData: { name: "John Doe", email: "john@example.com" },
        version: 1,
        timestamp: new Date().toISOString(),
      };

      await eventStore.storeEvent(event);

      const retrievedEvents = await eventStore.getEvents("user-123");
      expect(retrievedEvents).toHaveLength(1);
      expect(retrievedEvents[0].eventType).toBe("UserCreated");
      expect(retrievedEvents[0].eventData).toEqual(event.eventData);
    });

    test("should handle event versioning", async () => {
      const events = [
        {
          aggregateId: "user-123",
          eventType: "UserCreated",
          eventData: { name: "John Doe", email: "john@example.com" },
          version: 1,
          timestamp: new Date().toISOString(),
        },
        {
          aggregateId: "user-123",
          eventType: "UserUpdated",
          eventData: { name: "Jane Doe" },
          version: 2,
          timestamp: new Date().toISOString(),
        },
      ];

      for (const event of events) {
        await eventStore.storeEvent(event);
      }

      const retrievedEvents = await eventStore.getEvents("user-123");
      expect(retrievedEvents).toHaveLength(2);
      expect(retrievedEvents[0].version).toBe(1);
      expect(retrievedEvents[1].version).toBe(2);
    });

    test("should reconstruct aggregate from events", async () => {
      const events = [
        {
          aggregateId: "user-123",
          eventType: "UserCreated",
          eventData: { name: "John Doe", email: "john@example.com" },
          version: 1,
          timestamp: new Date().toISOString(),
        },
        {
          aggregateId: "user-123",
          eventType: "UserUpdated",
          eventData: { name: "Jane Doe" },
          version: 2,
          timestamp: new Date().toISOString(),
        },
      ];

      for (const event of events) {
        await eventStore.storeEvent(event);
      }

      const aggregate = await eventStore.reconstructAggregate("user-123");
      expect(aggregate.id).toBe("user-123");
      expect(aggregate.name).toBe("Jane Doe"); // Latest version
      expect(aggregate.email).toBe("john@example.com"); // From first event
    });

    test("should handle event snapshots", async () => {
      const events = Array(100)
        .fill()
        .map((_, i) => ({
          aggregateId: "user-123",
          eventType: "UserUpdated",
          eventData: { name: `User${i}` },
          version: i + 1,
          timestamp: new Date().toISOString(),
        }));

      for (const event of events) {
        await eventStore.storeEvent(event);
      }

      // Create snapshot at version 50
      await eventStore.createSnapshot("user-123", 50, {
        name: "User49",
        email: "user@example.com",
      });

      const aggregate = await eventStore.reconstructAggregate("user-123");
      expect(aggregate.name).toBe("User99"); // Latest version
      expect(aggregate.email).toBe("user@example.com"); // From snapshot
    });
  });

  describe("Soft Delete Integration", () => {
    test("should soft delete records", async () => {
      // Insert test user
      await databaseConnection.execute(
        "INSERT INTO users (name, email) VALUES (?, ?)",
        ["John Doe", "john@example.com"],
      );

      const users = await databaseConnection.query(
        "SELECT * FROM users WHERE email = ?",
        ["john@example.com"],
      );
      expect(users).toHaveLength(1);

      // Soft delete the user
      await softDeleteManager.softDelete("users", users[0].id);

      // Verify record is soft deleted
      const deletedUsers = await databaseConnection.query(
        "SELECT * FROM users WHERE email = ?",
        ["john@example.com"],
      );
      expect(deletedUsers).toHaveLength(0);

      // Verify record exists in soft delete table
      const softDeletedRecords = await databaseConnection.query(
        "SELECT * FROM soft_deletes WHERE table_name = ? AND record_id = ?",
        ["users", users[0].id],
      );
      expect(softDeletedRecords).toHaveLength(1);
    });

    test("should restore soft deleted records", async () => {
      // Insert and soft delete test user
      await databaseConnection.execute(
        "INSERT INTO users (name, email) VALUES (?, ?)",
        ["John Doe", "john@example.com"],
      );

      const users = await databaseConnection.query(
        "SELECT * FROM users WHERE email = ?",
        ["john@example.com"],
      );
      await softDeleteManager.softDelete("users", users[0].id);

      // Restore the user
      await softDeleteManager.restore("users", users[0].id);

      // Verify record is restored
      const restoredUsers = await databaseConnection.query(
        "SELECT * FROM users WHERE email = ?",
        ["john@example.com"],
      );
      expect(restoredUsers).toHaveLength(1);

      // Verify soft delete record is removed
      const softDeletedRecords = await databaseConnection.query(
        "SELECT * FROM soft_deletes WHERE table_name = ? AND record_id = ?",
        ["users", users[0].id],
      );
      expect(softDeletedRecords).toHaveLength(0);
    });

    test("should permanently delete records", async () => {
      // Insert and soft delete test user
      await databaseConnection.execute(
        "INSERT INTO users (name, email) VALUES (?, ?)",
        ["John Doe", "john@example.com"],
      );

      const users = await databaseConnection.query(
        "SELECT * FROM users WHERE email = ?",
        ["john@example.com"],
      );
      await softDeleteManager.softDelete("users", users[0].id);

      // Permanently delete the user
      await softDeleteManager.permanentDelete("users", users[0].id);

      // Verify record is permanently deleted
      const deletedUsers = await databaseConnection.query(
        "SELECT * FROM users WHERE email = ?",
        ["john@example.com"],
      );
      expect(deletedUsers).toHaveLength(0);

      const softDeletedRecords = await databaseConnection.query(
        "SELECT * FROM soft_deletes WHERE table_name = ? AND record_id = ?",
        ["users", users[0].id],
      );
      expect(softDeletedRecords).toHaveLength(0);
    });

    test("should handle cascading soft deletes", async () => {
      // Insert test user and post
      await databaseConnection.execute(
        "INSERT INTO users (name, email) VALUES (?, ?)",
        ["John Doe", "john@example.com"],
      );

      const users = await databaseConnection.query(
        "SELECT * FROM users WHERE email = ?",
        ["john@example.com"],
      );
      const userId = users[0].id;

      await databaseConnection.execute(
        "INSERT INTO posts (user_id, title, content) VALUES (?, ?, ?)",
        [userId, "Test Post", "This is a test post"],
      );

      // Soft delete user (should cascade to posts)
      await softDeleteManager.softDelete("users", userId);

      // Verify user is soft deleted
      const deletedUsers = await databaseConnection.query(
        "SELECT * FROM users WHERE id = ?",
        [userId],
      );
      expect(deletedUsers).toHaveLength(0);

      // Verify posts are also soft deleted
      const deletedPosts = await databaseConnection.query(
        "SELECT * FROM posts WHERE user_id = ?",
        [userId],
      );
      expect(deletedPosts).toHaveLength(0);
    });
  });

  describe("Schema Versioning Integration", () => {
    test("should track schema changes", async () => {
      const version = "1.0.0";
      const description = "Initial schema";

      await schemaVersionManager.setVersion(version, description);

      const currentVersion = await schemaVersionManager.getCurrentVersion();
      expect(currentVersion.version).toBe(version);
      expect(currentVersion.description).toBe(description);
    });

    test("should validate schema integrity", async () => {
      const requiredTables = ["users", "posts"];
      const isValid =
        await schemaVersionManager.validateRequiredTables(requiredTables);

      expect(isValid).toBe(true);
    });

    test("should detect schema changes", async () => {
      // Add a new column
      await databaseConnection.execute(
        "ALTER TABLE users ADD COLUMN phone TEXT",
      );

      const version = "1.1.0";
      const description = "Added phone column to users table";

      await schemaVersionManager.setVersion(version, description);

      const currentVersion = await schemaVersionManager.getCurrentVersion();
      expect(currentVersion.version).toBe(version);
    });
  });

  describe("Audit Trail Integration", () => {
    test("should audit INSERT operations", async () => {
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

      const auditTrail = await auditTrailManager.getAuditTrailForRecord(
        "users",
        "1",
      );
      expect(auditTrail).toHaveLength(1);
      expect(auditTrail[0].operation).toBe("INSERT");
    });

    test("should audit UPDATE operations", async () => {
      // First insert
      await databaseConnection.execute(
        "INSERT INTO users (name, email) VALUES (?, ?)",
        ["John Doe", "john@example.com"],
      );

      const users = await databaseConnection.query(
        "SELECT * FROM users WHERE email = ?",
        ["john@example.com"],
      );
      const userId = users[0].id;

      // Then update
      await databaseConnection.execute(
        "UPDATE users SET name = ? WHERE id = ?",
        ["Jane Doe", userId],
      );

      const auditData = {
        tableName: "users",
        operation: "UPDATE",
        recordId: userId.toString(),
        oldValues: { name: "John Doe", email: "john@example.com" },
        newValues: { name: "Jane Doe", email: "john@example.com" },
        userId: "system",
        timestamp: new Date().toISOString(),
      };

      await auditTrailManager.logOperation(auditData);

      const auditTrail = await auditTrailManager.getAuditTrailForRecord(
        "users",
        userId.toString(),
      );
      expect(auditTrail).toHaveLength(1);
      expect(auditTrail[0].operation).toBe("UPDATE");
    });

    test("should audit DELETE operations", async () => {
      // Insert and then delete
      await databaseConnection.execute(
        "INSERT INTO users (name, email) VALUES (?, ?)",
        ["John Doe", "john@example.com"],
      );

      const users = await databaseConnection.query(
        "SELECT * FROM users WHERE email = ?",
        ["john@example.com"],
      );
      const userId = users[0].id;

      await databaseConnection.execute("DELETE FROM users WHERE id = ?", [
        userId,
      ]);

      const auditData = {
        tableName: "users",
        operation: "DELETE",
        recordId: userId.toString(),
        oldValues: { name: "John Doe", email: "john@example.com" },
        newValues: null,
        userId: "system",
        timestamp: new Date().toISOString(),
      };

      await auditTrailManager.logOperation(auditData);

      const auditTrail = await auditTrailManager.getAuditTrailForRecord(
        "users",
        userId.toString(),
      );
      expect(auditTrail).toHaveLength(1);
      expect(auditTrail[0].operation).toBe("DELETE");
    });
  });

  describe("Cross-Database Compatibility", () => {
    test("should work with SQLite database", async () => {
      expect(databaseConnection.getType()).toBe("sqlite");

      // Test event sourcing
      const event = {
        aggregateId: "test-123",
        eventType: "TestEvent",
        eventData: { test: "data" },
        version: 1,
        timestamp: new Date().toISOString(),
      };

      await eventStore.storeEvent(event);
      const retrievedEvents = await eventStore.getEvents("test-123");
      expect(retrievedEvents).toHaveLength(1);
    });

    test("should handle PostgreSQL-specific features", async () => {
      // Mock PostgreSQL connection
      const postgresConfig = {
        type: "postgresql",
        host: "localhost",
        port: 5432,
        database: "test_db",
        username: "test_user",
        password: "test_password",
      };

      const postgresConnection = new DatabaseConnection(postgresConfig);
      const postgresEventStore = new EventStore(postgresConnection);

      // Should handle PostgreSQL-specific SQL
      expect(() => {
        postgresEventStore.validateEvent({
          aggregateId: "test-123",
          eventType: "TestEvent",
          eventData: { test: "data" },
          version: 1,
          timestamp: new Date().toISOString(),
        });
      }).not.toThrow();
    });
  });

  describe("Pattern Integration", () => {
    test("should integrate event sourcing with audit trail", async () => {
      const event = {
        aggregateId: "user-123",
        eventType: "UserCreated",
        eventData: { name: "John Doe", email: "john@example.com" },
        version: 1,
        timestamp: new Date().toISOString(),
      };

      await eventStore.storeEvent(event);

      const auditData = {
        tableName: "events",
        operation: "INSERT",
        recordId: "user-123",
        oldValues: null,
        newValues: event,
        userId: "system",
        timestamp: new Date().toISOString(),
      };

      await auditTrailManager.logOperation(auditData);

      const events = await eventStore.getEvents("user-123");
      const auditTrail = await auditTrailManager.getAuditTrailForRecord(
        "events",
        "user-123",
      );

      expect(events).toHaveLength(1);
      expect(auditTrail).toHaveLength(1);
    });

    test("should integrate soft deletes with audit trail", async () => {
      // Insert user
      await databaseConnection.execute(
        "INSERT INTO users (name, email) VALUES (?, ?)",
        ["John Doe", "john@example.com"],
      );

      const users = await databaseConnection.query(
        "SELECT * FROM users WHERE email = ?",
        ["john@example.com"],
      );
      const userId = users[0].id;

      // Soft delete user
      await softDeleteManager.softDelete("users", userId);

      // Audit the soft delete
      const auditData = {
        tableName: "users",
        operation: "SOFT_DELETE",
        recordId: userId.toString(),
        oldValues: { name: "John Doe", email: "john@example.com" },
        newValues: null,
        userId: "system",
        timestamp: new Date().toISOString(),
      };

      await auditTrailManager.logOperation(auditData);

      const auditTrail = await auditTrailManager.getAuditTrailForRecord(
        "users",
        userId.toString(),
      );
      expect(auditTrail).toHaveLength(1);
      expect(auditTrail[0].operation).toBe("SOFT_DELETE");
    });

    test("should integrate schema versioning with audit trail", async () => {
      const version = "1.0.0";
      const description = "Initial schema";

      await schemaVersionManager.setVersion(version, description);

      const auditData = {
        tableName: "schema_versions",
        operation: "INSERT",
        recordId: version,
        oldValues: null,
        newValues: { version, description },
        userId: "system",
        timestamp: new Date().toISOString(),
      };

      await auditTrailManager.logOperation(auditData);

      const currentVersion = await schemaVersionManager.getCurrentVersion();
      const auditTrail = await auditTrailManager.getAuditTrailForRecord(
        "schema_versions",
        version,
      );

      expect(currentVersion.version).toBe(version);
      expect(auditTrail).toHaveLength(1);
    });
  });

  describe("Performance and Scalability", () => {
    test("should handle large event streams", async () => {
      const events = Array(1000)
        .fill()
        .map((_, i) => ({
          aggregateId: "user-123",
          eventType: "UserUpdated",
          eventData: { name: `User${i}` },
          version: i + 1,
          timestamp: new Date().toISOString(),
        }));

      const startTime = Date.now();
      for (const event of events) {
        await eventStore.storeEvent(event);
      }
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000); // Should complete in less than 5 seconds

      const retrievedEvents = await eventStore.getEvents("user-123");
      expect(retrievedEvents).toHaveLength(1000);
    });

    test("should handle concurrent operations", async () => {
      const operations = Array(100)
        .fill()
        .map((_, i) =>
          eventStore.storeEvent({
            aggregateId: `user-${i}`,
            eventType: "UserCreated",
            eventData: { name: `User${i}` },
            version: 1,
            timestamp: new Date().toISOString(),
          }),
        );

      const startTime = Date.now();
      await Promise.all(operations);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(2000); // Should complete in less than 2 seconds
    });
  });

  describe("Error Handling and Recovery", () => {
    test("should handle event store failures gracefully", async () => {
      const invalidEvent = {
        aggregateId: null, // Invalid
        eventType: "UserCreated",
        eventData: { name: "John Doe" },
        version: 1,
        timestamp: new Date().toISOString(),
      };

      await expect(eventStore.storeEvent(invalidEvent)).rejects.toThrow();
    });

    test("should handle soft delete failures gracefully", async () => {
      const invalidTableName = "non_existent_table";
      const invalidRecordId = "999";

      await expect(
        softDeleteManager.softDelete(invalidTableName, invalidRecordId),
      ).rejects.toThrow();
    });

    test("should handle audit trail failures gracefully", async () => {
      const invalidAuditData = {
        tableName: "", // Invalid
        operation: "INSERT",
        recordId: "1",
        oldValues: null,
        newValues: { name: "John Doe" },
        userId: "system",
        timestamp: new Date().toISOString(),
      };

      await expect(
        auditTrailManager.logOperation(invalidAuditData),
      ).rejects.toThrow();
    });
  });
});
