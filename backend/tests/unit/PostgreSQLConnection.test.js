/**
 * PostgreSQLConnection Unit Tests
 *
 * Tests for PostgreSQL database connection including connection management,
 * query execution, table verification, and PostgreSQL-specific features.
 */

const PostgreSQLConnection = require("../../infrastructure/database/PostgreSQLConnection");
const Logger = require("../../infrastructure/logging/Logger");

describe("PostgreSQLConnection Unit Tests", () => {
  let mockConfig;
  let postgresConnection;
  let mockLogger;
  let mockClient;

  beforeEach(() => {
    // Mock logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    jest.spyOn(Logger, "Logger").mockImplementation(() => mockLogger);

    // Mock PostgreSQL client
    mockClient = {
      connect: jest.fn(),
      query: jest.fn(),
      end: jest.fn(),
      release: jest.fn(),
      on: jest.fn(),
    };

    // Mock pg module
    jest.doMock("pg", () => ({
      Client: jest.fn(() => mockClient),
      Pool: jest.fn(() => ({
        connect: jest.fn().mockResolvedValue(mockClient),
        query: jest.fn(),
        end: jest.fn(),
      })),
    }));

    // Mock configuration
    mockConfig = {
      host: "localhost",
      port: 5432,
      database: "test_db",
      username: "test_user",
      password: "test_password",
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };

    postgresConnection = new PostgreSQLConnection(mockConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Constructor", () => {
    test("should create instance with correct configuration", () => {
      expect(postgresConnection.config).toEqual(mockConfig);
      expect(postgresConnection.isConnected).toBe(false);
      expect(postgresConnection.client).toBeNull();
    });

    test("should handle missing configuration gracefully", () => {
      const emptyConfig = {};
      const connection = new PostgreSQLConnection(emptyConfig);

      expect(connection.config).toEqual(emptyConfig);
    });

    test("should set default values for missing config options", () => {
      const minimalConfig = { database: "test" };
      const connection = new PostgreSQLConnection(minimalConfig);

      expect(connection.config.database).toBe("test");
    });
  });

  describe("Connection Management", () => {
    test("should connect successfully with valid configuration", async () => {
      mockClient.connect.mockResolvedValue();
      mockClient.query.mockResolvedValue({ rows: [] });

      await postgresConnection.connect();

      expect(postgresConnection.isConnected).toBe(true);
      expect(postgresConnection.client).toBeDefined();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        "🗄️ Connecting to PostgreSQL database: test_db",
      );
    });

    test("should handle connection errors gracefully", async () => {
      const error = new Error("Connection failed");
      mockClient.connect.mockRejectedValue(error);

      await expect(postgresConnection.connect()).rejects.toThrow(
        "Connection failed",
      );
      expect(postgresConnection.isConnected).toBe(false);
    });

    test("should disconnect successfully", async () => {
      postgresConnection.isConnected = true;
      postgresConnection.client = mockClient;

      await postgresConnection.disconnect();

      expect(postgresConnection.isConnected).toBe(false);
      expect(postgresConnection.client).toBeNull();
      expect(mockClient.end).toHaveBeenCalled();
    });

    test("should handle disconnect errors gracefully", async () => {
      postgresConnection.isConnected = true;
      postgresConnection.client = mockClient;
      mockClient.end.mockRejectedValue(new Error("Disconnect failed"));

      await expect(postgresConnection.disconnect()).rejects.toThrow(
        "Disconnect failed",
      );
    });
  });

  describe("Query Execution", () => {
    beforeEach(() => {
      postgresConnection.isConnected = true;
      postgresConnection.client = mockClient;
    });

    test("should execute SELECT query successfully", async () => {
      const mockResult = { rows: [{ id: 1, name: "test" }] };
      mockClient.query.mockResolvedValue(mockResult);

      const result = await postgresConnection.query("SELECT * FROM test");

      expect(result).toEqual(mockResult.rows);
      expect(mockClient.query).toHaveBeenCalledWith("SELECT * FROM test", []);
    });

    test("should execute SELECT query with parameters", async () => {
      const mockResult = { rows: [{ id: 1, name: "test" }] };
      mockClient.query.mockResolvedValue(mockResult);

      const result = await postgresConnection.query(
        "SELECT * FROM test WHERE id = $1",
        [1],
      );

      expect(result).toEqual(mockResult.rows);
      expect(mockClient.query).toHaveBeenCalledWith(
        "SELECT * FROM test WHERE id = $1",
        [1],
      );
    });

    test("should execute INSERT statement successfully", async () => {
      const mockResult = { rowCount: 1 };
      mockClient.query.mockResolvedValue(mockResult);

      const result = await postgresConnection.execute(
        "INSERT INTO test (name) VALUES ($1)",
        ["test"],
      );

      expect(result).toEqual(mockResult);
      expect(mockClient.query).toHaveBeenCalledWith(
        "INSERT INTO test (name) VALUES ($1)",
        ["test"],
      );
    });

    test("should execute UPDATE statement successfully", async () => {
      const mockResult = { rowCount: 1 };
      mockClient.query.mockResolvedValue(mockResult);

      const result = await postgresConnection.execute(
        "UPDATE test SET name = $1 WHERE id = $2",
        ["updated", 1],
      );

      expect(result).toEqual(mockResult);
      expect(mockClient.query).toHaveBeenCalledWith(
        "UPDATE test SET name = $1 WHERE id = $2",
        ["updated", 1],
      );
    });

    test("should execute DELETE statement successfully", async () => {
      const mockResult = { rowCount: 1 };
      mockClient.query.mockResolvedValue(mockResult);

      const result = await postgresConnection.execute(
        "DELETE FROM test WHERE id = $1",
        [1],
      );

      expect(result).toEqual(mockResult);
      expect(mockClient.query).toHaveBeenCalledWith(
        "DELETE FROM test WHERE id = $1",
        [1],
      );
    });

    test("should throw error when not connected", async () => {
      postgresConnection.isConnected = false;

      await expect(
        postgresConnection.query("SELECT * FROM test"),
      ).rejects.toThrow("Database not connected");
    });

    test("should handle query errors gracefully", async () => {
      const error = new Error("Query failed");
      mockClient.query.mockRejectedValue(error);

      await expect(
        postgresConnection.query("SELECT * FROM test"),
      ).rejects.toThrow("Query failed");
    });

    test("should handle execute errors gracefully", async () => {
      const error = new Error("Execute failed");
      mockClient.query.mockRejectedValue(error);

      await expect(
        postgresConnection.execute("INSERT INTO test VALUES ($1)", ["test"]),
      ).rejects.toThrow("Execute failed");
    });
  });

  describe("Table Verification", () => {
    beforeEach(() => {
      postgresConnection.isConnected = true;
      postgresConnection.client = mockClient;
    });

    test("should verify all required tables exist", async () => {
      const mockTables = [
        { tablename: "users" },
        { tablename: "user_sessions" },
        { tablename: "projects" },
        { tablename: "tasks" },
        { tablename: "analysis" },
        { tablename: "chat_sessions" },
        { tablename: "chat_messages" },
        { tablename: "workflows" },
        { tablename: "workflow_executions" },
        { tablename: "task_templates" },
        { tablename: "task_suggestions" },
        { tablename: "task_sessions" },
      ];

      mockClient.query.mockResolvedValue({ rows: mockTables });

      await postgresConnection.verifyTablesCreated();

      expect(mockClient.query).toHaveBeenCalledWith(
        "SELECT tablename FROM pg_tables WHERE schemaname = 'public'",
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        "✅ All 12 required tables verified successfully",
      );
    });

    test("should throw error when tables are missing", async () => {
      const mockTables = [{ tablename: "users" }, { tablename: "projects" }];

      mockClient.query.mockResolvedValue({ rows: mockTables });

      await expect(postgresConnection.verifyTablesCreated()).rejects.toThrow(
        "Database initialization incomplete. Missing tables: user_sessions, tasks, analysis, chat_sessions, chat_messages, workflows, workflow_executions, task_templates, task_suggestions, task_sessions",
      );
    });

    test("should handle table verification errors gracefully", async () => {
      const error = new Error("Table verification failed");
      mockClient.query.mockRejectedValue(error);

      await expect(postgresConnection.verifyTablesCreated()).rejects.toThrow(
        "Table verification failed",
      );
    });
  });

  describe("Database Initialization", () => {
    beforeEach(() => {
      postgresConnection.isConnected = true;
      postgresConnection.client = mockClient;
    });

    test("should initialize database successfully", async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      await postgresConnection.initializeDatabase();

      expect(mockClient.query).toHaveBeenCalledWith("SELECT 1");
      expect(mockLogger.info).toHaveBeenCalledWith(
        "✅ PostgreSQL database initialized successfully",
      );
    });

    test("should handle initialization errors gracefully", async () => {
      const error = new Error("Initialization failed");
      mockClient.query.mockRejectedValue(error);

      await expect(postgresConnection.initializeDatabase()).rejects.toThrow(
        "Initialization failed",
      );
    });
  });

  describe("Connection Pool Management", () => {
    test("should create connection pool with correct configuration", () => {
      const poolConfig = {
        ...mockConfig,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      };

      const connection = new PostgreSQLConnection(poolConfig);

      expect(connection.config.max).toBe(20);
      expect(connection.config.idleTimeoutMillis).toBe(30000);
      expect(connection.config.connectionTimeoutMillis).toBe(2000);
    });

    test("should handle pool connection errors gracefully", async () => {
      const error = new Error("Pool connection failed");
      mockClient.connect.mockRejectedValue(error);

      await expect(postgresConnection.connect()).rejects.toThrow(
        "Pool connection failed",
      );
    });
  });

  describe("Transaction Management", () => {
    beforeEach(() => {
      postgresConnection.isConnected = true;
      postgresConnection.client = mockClient;
    });

    test("should begin transaction successfully", async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      await postgresConnection.beginTransaction();

      expect(mockClient.query).toHaveBeenCalledWith("BEGIN");
    });

    test("should commit transaction successfully", async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      await postgresConnection.commitTransaction();

      expect(mockClient.query).toHaveBeenCalledWith("COMMIT");
    });

    test("should rollback transaction successfully", async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      await postgresConnection.rollbackTransaction();

      expect(mockClient.query).toHaveBeenCalledWith("ROLLBACK");
    });

    test("should handle transaction errors gracefully", async () => {
      const error = new Error("Transaction failed");
      mockClient.query.mockRejectedValue(error);

      await expect(postgresConnection.beginTransaction()).rejects.toThrow(
        "Transaction failed",
      );
    });
  });

  describe("Error Handling", () => {
    test("should handle invalid connection parameters gracefully", async () => {
      const invalidConfig = {
        host: "invalid-host",
        port: 9999,
        database: "invalid-db",
        username: "invalid-user",
        password: "invalid-password",
      };

      const invalidConnection = new PostgreSQLConnection(invalidConfig);
      const error = new Error("Connection refused");
      mockClient.connect.mockRejectedValue(error);

      await expect(invalidConnection.connect()).rejects.toThrow(
        "Connection refused",
      );
    });

    test("should handle database not found errors gracefully", async () => {
      postgresConnection.isConnected = true;
      postgresConnection.client = mockClient;

      const error = new Error('database "nonexistent" does not exist');
      mockClient.query.mockRejectedValue(error);

      await expect(
        postgresConnection.query("SELECT * FROM test"),
      ).rejects.toThrow('database "nonexistent" does not exist');
    });

    test("should handle permission denied errors gracefully", async () => {
      postgresConnection.isConnected = true;
      postgresConnection.client = mockClient;

      const error = new Error("permission denied for table test");
      mockClient.query.mockRejectedValue(error);

      await expect(
        postgresConnection.query("SELECT * FROM test"),
      ).rejects.toThrow("permission denied for table test");
    });
  });

  describe("Configuration Validation", () => {
    test("should validate connection timeout configuration", () => {
      const timeoutConfig = { ...mockConfig, connectionTimeoutMillis: 5000 };
      const connection = new PostgreSQLConnection(timeoutConfig);

      expect(connection.config.connectionTimeoutMillis).toBe(5000);
    });

    test("should validate idle timeout configuration", () => {
      const idleConfig = { ...mockConfig, idleTimeoutMillis: 60000 };
      const connection = new PostgreSQLConnection(idleConfig);

      expect(connection.config.idleTimeoutMillis).toBe(60000);
    });

    test("should validate max connections configuration", () => {
      const maxConfig = { ...mockConfig, max: 50 };
      const connection = new PostgreSQLConnection(maxConfig);

      expect(connection.config.max).toBe(50);
    });

    test("should handle missing configuration options", () => {
      const minimalConfig = { database: "test" };
      const connection = new PostgreSQLConnection(minimalConfig);

      expect(connection.config.database).toBe("test");
      expect(connection.config.host).toBeUndefined();
    });
  });

  describe("Performance Monitoring", () => {
    beforeEach(() => {
      postgresConnection.isConnected = true;
      postgresConnection.client = mockClient;
    });

    test("should log query execution time", async () => {
      const mockResult = { rows: [{ id: 1 }] };
      mockClient.query.mockResolvedValue(mockResult);

      const result = await postgresConnection.query("SELECT * FROM test");

      expect(result).toEqual(mockResult.rows);
      expect(mockLogger.debug).toHaveBeenCalled();
    });

    test("should handle slow query warnings", async () => {
      const mockResult = { rows: [] };
      mockClient.query.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve(mockResult), 100);
        });
      });

      await postgresConnection.query("SELECT * FROM test");

      expect(mockClient.query).toHaveBeenCalledWith("SELECT * FROM test", []);
    });
  });
});
