/**
 * MemoryConnection Unit Tests
 *
 * Tests for in-memory database connection including connection management,
 * query execution, table verification, and memory-specific features.
 */

const MemoryConnection = require("../../infrastructure/database/MemoryConnection");
const Logger = require("../../infrastructure/logging/Logger");

describe("MemoryConnection Unit Tests", () => {
  let mockConfig;
  let memoryConnection;
  let mockLogger;
  let mockDatabase;

  beforeEach(() => {
    // Mock logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    jest.spyOn(Logger, "Logger").mockImplementation(() => mockLogger);

    // Mock SQLite database for memory connection
    mockDatabase = {
      run: jest.fn(),
      get: jest.fn(),
      all: jest.fn(),
      close: jest.fn(),
      serialize: jest.fn(),
      parallelize: jest.fn(),
    };

    // Mock sqlite3 module
    jest.doMock("sqlite3", () => ({
      Database: jest.fn(() => mockDatabase),
      OPEN_READWRITE: 2,
      OPEN_CREATE: 4,
    }));

    // Mock configuration
    mockConfig = {
      database: ":memory:",
      enableWAL: true,
      synchronous: "NORMAL",
      journalMode: "WAL",
    };

    memoryConnection = new MemoryConnection(mockConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Constructor", () => {
    test("should create instance with correct configuration", () => {
      expect(memoryConnection.config).toEqual(mockConfig);
      expect(memoryConnection.isConnected).toBe(false);
      expect(memoryConnection.db).toBeNull();
    });

    test("should handle missing configuration gracefully", () => {
      const emptyConfig = {};
      const connection = new MemoryConnection(emptyConfig);

      expect(connection.config).toEqual(emptyConfig);
    });

    test("should force memory database configuration", () => {
      const fileConfig = { database: "test.db" };
      const connection = new MemoryConnection(fileConfig);

      expect(connection.config.database).toBe(":memory:");
    });
  });

  describe("Connection Management", () => {
    test("should connect successfully to memory database", async () => {
      mockDatabase.run.mockImplementation((sql, callback) => {
        if (callback) callback();
      });

      await memoryConnection.connect();

      expect(memoryConnection.isConnected).toBe(true);
      expect(memoryConnection.db).toBeDefined();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        "🗄️ Connecting to memory database",
      );
    });

    test("should handle connection errors gracefully", async () => {
      const error = new Error("Memory connection failed");
      mockDatabase.run.mockImplementation((sql, callback) => {
        if (callback) callback(error);
      });

      await expect(memoryConnection.connect()).rejects.toThrow(
        "Memory connection failed",
      );
      expect(memoryConnection.isConnected).toBe(false);
    });

    test("should disconnect successfully", async () => {
      memoryConnection.isConnected = true;
      memoryConnection.db = mockDatabase;

      await memoryConnection.disconnect();

      expect(memoryConnection.isConnected).toBe(false);
      expect(memoryConnection.db).toBeNull();
      expect(mockDatabase.close).toHaveBeenCalled();
    });

    test("should handle disconnect errors gracefully", async () => {
      memoryConnection.isConnected = true;
      memoryConnection.db = mockDatabase;
      mockDatabase.close.mockImplementation((callback) => {
        if (callback) callback(new Error("Close failed"));
      });

      await expect(memoryConnection.disconnect()).rejects.toThrow(
        "Close failed",
      );
    });
  });

  describe("Query Execution", () => {
    beforeEach(() => {
      memoryConnection.isConnected = true;
      memoryConnection.db = mockDatabase;
    });

    test("should execute SELECT query successfully", async () => {
      const mockResult = [{ id: 1, name: "test" }];
      mockDatabase.all.mockImplementation((sql, params, callback) => {
        callback(null, mockResult);
      });

      const result = await memoryConnection.query("SELECT * FROM test");

      expect(result).toEqual(mockResult);
      expect(mockDatabase.all).toHaveBeenCalledWith(
        "SELECT * FROM test",
        [],
        expect.any(Function),
      );
    });

    test("should execute SELECT query with parameters", async () => {
      const mockResult = [{ id: 1, name: "test" }];
      mockDatabase.all.mockImplementation((sql, params, callback) => {
        callback(null, mockResult);
      });

      const result = await memoryConnection.query(
        "SELECT * FROM test WHERE id = ?",
        [1],
      );

      expect(result).toEqual(mockResult);
      expect(mockDatabase.all).toHaveBeenCalledWith(
        "SELECT * FROM test WHERE id = ?",
        [1],
        expect.any(Function),
      );
    });

    test("should execute INSERT statement successfully", async () => {
      const mockResult = { lastID: 1, changes: 1 };
      mockDatabase.run.mockImplementation((sql, params, callback) => {
        callback(null, mockResult);
      });

      const result = await memoryConnection.execute(
        "INSERT INTO test (name) VALUES (?)",
        ["test"],
      );

      expect(result).toEqual(mockResult);
      expect(mockDatabase.run).toHaveBeenCalledWith(
        "INSERT INTO test (name) VALUES (?)",
        ["test"],
        expect.any(Function),
      );
    });

    test("should execute UPDATE statement successfully", async () => {
      const mockResult = { changes: 1 };
      mockDatabase.run.mockImplementation((sql, params, callback) => {
        callback(null, mockResult);
      });

      const result = await memoryConnection.execute(
        "UPDATE test SET name = ? WHERE id = ?",
        ["updated", 1],
      );

      expect(result).toEqual(mockResult);
      expect(mockDatabase.run).toHaveBeenCalledWith(
        "UPDATE test SET name = ? WHERE id = ?",
        ["updated", 1],
        expect.any(Function),
      );
    });

    test("should execute DELETE statement successfully", async () => {
      const mockResult = { changes: 1 };
      mockDatabase.run.mockImplementation((sql, params, callback) => {
        callback(null, mockResult);
      });

      const result = await memoryConnection.execute(
        "DELETE FROM test WHERE id = ?",
        [1],
      );

      expect(result).toEqual(mockResult);
      expect(mockDatabase.run).toHaveBeenCalledWith(
        "DELETE FROM test WHERE id = ?",
        [1],
        expect.any(Function),
      );
    });

    test("should throw error when not connected", async () => {
      memoryConnection.isConnected = false;

      await expect(
        memoryConnection.query("SELECT * FROM test"),
      ).rejects.toThrow("Database not connected");
    });

    test("should handle query errors gracefully", async () => {
      const error = new Error("Query failed");
      mockDatabase.all.mockImplementation((sql, params, callback) => {
        callback(error);
      });

      await expect(
        memoryConnection.query("SELECT * FROM test"),
      ).rejects.toThrow("Query failed");
    });

    test("should handle execute errors gracefully", async () => {
      const error = new Error("Execute failed");
      mockDatabase.run.mockImplementation((sql, params, callback) => {
        callback(error);
      });

      await expect(
        memoryConnection.execute("INSERT INTO test VALUES (?)", ["test"]),
      ).rejects.toThrow("Execute failed");
    });
  });

  describe("Table Verification", () => {
    beforeEach(() => {
      memoryConnection.isConnected = true;
      memoryConnection.db = mockDatabase;
    });

    test("should verify all required tables exist", async () => {
      const mockTables = [
        { name: "users" },
        { name: "user_sessions" },
        { name: "projects" },
        { name: "tasks" },
        { name: "analysis_results" },
        { name: "analysis_steps" },
        { name: "chat_sessions" },
        { name: "chat_messages" },
        { name: "workflows" },
        { name: "workflow_executions" },
        { name: "task_templates" },
        { name: "task_suggestions" },
        { name: "task_sessions" },
        { name: "project_analysis" },
      ];

      mockDatabase.all.mockImplementation((sql, params, callback) => {
        callback(null, mockTables);
      });

      await memoryConnection.verifyTablesCreated();

      expect(mockDatabase.all).toHaveBeenCalledWith(
        "SELECT name FROM sqlite_master WHERE type='table'",
        [],
        expect.any(Function),
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        "✅ All required tables verified successfully",
      );
    });

    test("should throw error when tables are missing", async () => {
      const mockTables = [{ name: "users" }, { name: "projects" }];

      mockDatabase.all.mockImplementation((sql, params, callback) => {
        callback(null, mockTables);
      });

      await expect(memoryConnection.verifyTablesCreated()).rejects.toThrow(
        "Database initialization incomplete. Missing tables: user_sessions, tasks, analysis_results, analysis_steps, chat_sessions, chat_messages, workflows, workflow_executions, task_templates, task_suggestions, task_sessions, project_analysis",
      );
    });

    test("should handle table verification errors gracefully", async () => {
      const error = new Error("Table verification failed");
      mockDatabase.all.mockImplementation((sql, params, callback) => {
        callback(error);
      });

      await expect(memoryConnection.verifyTablesCreated()).rejects.toThrow(
        "Table verification failed",
      );
    });
  });

  describe("Database Initialization", () => {
    beforeEach(() => {
      memoryConnection.isConnected = true;
      memoryConnection.db = mockDatabase;
    });

    test("should initialize memory database with WAL mode", async () => {
      mockDatabase.run.mockImplementation((sql, callback) => {
        if (callback) callback();
      });

      await memoryConnection.initializeDatabase();

      expect(mockDatabase.run).toHaveBeenCalledWith(
        "PRAGMA journal_mode=WAL",
        expect.any(Function),
      );
      expect(mockDatabase.run).toHaveBeenCalledWith(
        "PRAGMA synchronous=NORMAL",
        expect.any(Function),
      );
    });

    test("should handle initialization errors gracefully", async () => {
      const error = new Error("Initialization failed");
      mockDatabase.run.mockImplementation((sql, callback) => {
        if (callback) callback(error);
      });

      await expect(memoryConnection.initializeDatabase()).rejects.toThrow(
        "Initialization failed",
      );
    });
  });

  describe("Memory-Specific Features", () => {
    test("should force memory database configuration", () => {
      const fileConfig = { database: "test.db" };
      const connection = new MemoryConnection(fileConfig);

      expect(connection.config.database).toBe(":memory:");
    });

    test("should handle memory database limitations", async () => {
      memoryConnection.isConnected = true;
      memoryConnection.db = mockDatabase;

      // Memory databases don't persist data
      const mockResult = { changes: 1 };
      mockDatabase.run.mockImplementation((sql, params, callback) => {
        callback(null, mockResult);
      });

      const result = await memoryConnection.execute(
        "INSERT INTO test VALUES (?)",
        ["test"],
      );

      expect(result).toEqual(mockResult);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        "🗄️ Connecting to memory database",
      );
    });

    test("should handle memory database performance", async () => {
      memoryConnection.isConnected = true;
      memoryConnection.db = mockDatabase;

      const mockResult = [{ id: 1, name: "test" }];
      mockDatabase.all.mockImplementation((sql, params, callback) => {
        callback(null, mockResult);
      });

      const result = await memoryConnection.query("SELECT * FROM test");

      expect(result).toEqual(mockResult);
    });
  });

  describe("Transaction Management", () => {
    beforeEach(() => {
      memoryConnection.isConnected = true;
      memoryConnection.db = mockDatabase;
    });

    test("should execute statements in transaction", async () => {
      mockDatabase.serialize.mockImplementation((callback) => {
        callback();
      });
      mockDatabase.run.mockImplementation((sql, callback) => {
        if (callback) callback();
      });

      await memoryConnection.executeStatement(
        "BEGIN TRANSACTION",
        "Starting transaction",
      );

      expect(mockDatabase.serialize).toHaveBeenCalled();
      expect(mockDatabase.run).toHaveBeenCalledWith(
        "BEGIN TRANSACTION",
        expect.any(Function),
      );
    });

    test("should handle transaction errors gracefully", async () => {
      const error = new Error("Transaction failed");
      mockDatabase.serialize.mockImplementation((callback) => {
        callback();
      });
      mockDatabase.run.mockImplementation((sql, callback) => {
        if (callback) callback(error);
      });

      await expect(
        memoryConnection.executeStatement(
          "BEGIN TRANSACTION",
          "Starting transaction",
        ),
      ).rejects.toThrow("Transaction failed");
    });
  });

  describe("Error Handling", () => {
    test("should handle memory allocation errors gracefully", async () => {
      const error = new Error("out of memory");
      mockDatabase.run.mockImplementation((sql, callback) => {
        if (callback) callback(error);
      });

      await expect(memoryConnection.connect()).rejects.toThrow("out of memory");
    });

    test("should handle memory database corruption gracefully", async () => {
      memoryConnection.isConnected = true;
      memoryConnection.db = mockDatabase;

      const error = new Error("database disk image is malformed");
      mockDatabase.all.mockImplementation((sql, params, callback) => {
        callback(error);
      });

      await expect(
        memoryConnection.query("SELECT * FROM test"),
      ).rejects.toThrow("database disk image is malformed");
    });
  });

  describe("Configuration Validation", () => {
    test("should validate WAL mode configuration for memory", () => {
      const walConfig = { ...mockConfig, journalMode: "WAL" };
      const connection = new MemoryConnection(walConfig);

      expect(connection.config.journalMode).toBe("WAL");
      expect(connection.config.database).toBe(":memory:");
    });

    test("should validate synchronous mode configuration for memory", () => {
      const syncConfig = { ...mockConfig, synchronous: "FULL" };
      const connection = new MemoryConnection(syncConfig);

      expect(connection.config.synchronous).toBe("FULL");
      expect(connection.config.database).toBe(":memory:");
    });

    test("should handle missing configuration options", () => {
      const minimalConfig = {};
      const connection = new MemoryConnection(minimalConfig);

      expect(connection.config.database).toBe(":memory:");
      expect(connection.config.enableWAL).toBeUndefined();
    });
  });

  describe("Performance Characteristics", () => {
    test("should handle fast memory operations", async () => {
      memoryConnection.isConnected = true;
      memoryConnection.db = mockDatabase;

      const mockResult = [{ id: 1, name: "test" }];
      mockDatabase.all.mockImplementation((sql, params, callback) => {
        // Simulate fast memory operation
        setTimeout(() => callback(null, mockResult), 1);
      });

      const result = await memoryConnection.query("SELECT * FROM test");

      expect(result).toEqual(mockResult);
    });

    test("should handle concurrent memory operations", async () => {
      memoryConnection.isConnected = true;
      memoryConnection.db = mockDatabase;

      const mockResult = [{ id: 1, name: "test" }];
      mockDatabase.all.mockImplementation((sql, params, callback) => {
        callback(null, mockResult);
      });

      const promises = Array(10)
        .fill()
        .map(() => memoryConnection.query("SELECT * FROM test"));

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      results.forEach((result) => {
        expect(result).toEqual(mockResult);
      });
    });
  });
});
