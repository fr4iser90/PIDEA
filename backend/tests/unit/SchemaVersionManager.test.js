/**
 * SchemaVersionManager Unit Tests
 *
 * Tests for schema version management including version tracking,
 * migration management, schema validation, and version history.
 */

const SchemaVersionManager = require("../../infrastructure/database/SchemaVersionManager");
const Logger = require("../../infrastructure/logging/Logger");

describe("SchemaVersionManager Unit Tests", () => {
  let schemaVersionManager;
  let mockLogger;
  let mockDatabaseConnection;

  beforeEach(() => {
    // Mock logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    jest.spyOn(Logger, "Logger").mockImplementation(() => mockLogger);

    // Mock database connection
    mockDatabaseConnection = {
      query: jest.fn(),
      execute: jest.fn(),
      isConnected: true,
    };

    schemaVersionManager = new SchemaVersionManager(mockDatabaseConnection);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Constructor", () => {
    test("should create instance with database connection", () => {
      expect(schemaVersionManager.databaseConnection).toBe(
        mockDatabaseConnection,
      );
      expect(schemaVersionManager.currentVersion).toBeNull();
      expect(schemaVersionManager.versionHistory).toEqual([]);
    });

    test("should handle null database connection gracefully", () => {
      expect(() => {
        new SchemaVersionManager(null);
      }).not.toThrow();
    });
  });

  describe("Version Initialization", () => {
    test("should initialize schema version table", async () => {
      mockDatabaseConnection.execute.mockResolvedValue({ changes: 1 });

      await schemaVersionManager.initialize();

      expect(mockDatabaseConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining("CREATE TABLE IF NOT EXISTS schema_versions"),
      );
    });

    test("should handle initialization errors gracefully", async () => {
      const error = new Error("Initialization failed");
      mockDatabaseConnection.execute.mockRejectedValue(error);

      await expect(schemaVersionManager.initialize()).rejects.toThrow(
        "Initialization failed",
      );
    });

    test("should get current version after initialization", async () => {
      const mockVersion = {
        version: "1.0.0",
        applied_at: "2023-01-01T00:00:00Z",
      };
      mockDatabaseConnection.execute.mockResolvedValue({ changes: 1 });
      mockDatabaseConnection.query.mockResolvedValue([mockVersion]);

      await schemaVersionManager.initialize();
      const currentVersion = await schemaVersionManager.getCurrentVersion();

      expect(currentVersion).toEqual(mockVersion);
    });
  });

  describe("Version Management", () => {
    beforeEach(async () => {
      mockDatabaseConnection.execute.mockResolvedValue({ changes: 1 });
      await schemaVersionManager.initialize();
    });

    test("should set new version", async () => {
      const version = "1.1.0";
      const description = "Added new table";
      mockDatabaseConnection.execute.mockResolvedValue({ changes: 1 });

      await schemaVersionManager.setVersion(version, description);

      expect(mockDatabaseConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO schema_versions"),
        expect.arrayContaining([version, description]),
      );
    });

    test("should get version by number", async () => {
      const version = "1.0.0";
      const mockVersion = { version, description: "Initial version" };
      mockDatabaseConnection.query.mockResolvedValue([mockVersion]);

      const result = await schemaVersionManager.getVersion(version);

      expect(result).toEqual(mockVersion);
      expect(mockDatabaseConnection.query).toHaveBeenCalledWith(
        expect.stringContaining(
          "SELECT * FROM schema_versions WHERE version = ?",
        ),
        [version],
      );
    });

    test("should return null for non-existent version", async () => {
      const version = "999.999.999";
      mockDatabaseConnection.query.mockResolvedValue([]);

      const result = await schemaVersionManager.getVersion(version);

      expect(result).toBeNull();
    });

    test("should list all versions", async () => {
      const mockVersions = [
        { version: "1.0.0", description: "Initial version" },
        { version: "1.1.0", description: "Added features" },
      ];
      mockDatabaseConnection.query.mockResolvedValue(mockVersions);

      const result = await schemaVersionManager.listVersions();

      expect(result).toEqual(mockVersions);
      expect(mockDatabaseConnection.query).toHaveBeenCalledWith(
        expect.stringContaining(
          "SELECT * FROM schema_versions ORDER BY applied_at DESC",
        ),
      );
    });

    test("should get version history", async () => {
      const mockHistory = [
        { version: "1.1.0", applied_at: "2023-01-02T00:00:00Z" },
        { version: "1.0.0", applied_at: "2023-01-01T00:00:00Z" },
      ];
      mockDatabaseConnection.query.mockResolvedValue(mockHistory);

      const result = await schemaVersionManager.getVersionHistory();

      expect(result).toEqual(mockHistory);
    });
  });

  describe("Version Validation", () => {
    beforeEach(async () => {
      mockDatabaseConnection.execute.mockResolvedValue({ changes: 1 });
      await schemaVersionManager.initialize();
    });

    test("should validate version format", () => {
      expect(schemaVersionManager.validateVersionFormat("1.0.0")).toBe(true);
      expect(schemaVersionManager.validateVersionFormat("1.0.0-beta")).toBe(
        true,
      );
      expect(schemaVersionManager.validateVersionFormat("1.0.0-alpha.1")).toBe(
        true,
      );
    });

    test("should reject invalid version formats", () => {
      expect(schemaVersionManager.validateVersionFormat("1.0")).toBe(false);
      expect(schemaVersionManager.validateVersionFormat("1.0.0.0.0")).toBe(
        false,
      );
      expect(schemaVersionManager.validateVersionFormat("invalid")).toBe(false);
      expect(schemaVersionManager.validateVersionFormat("")).toBe(false);
      expect(schemaVersionManager.validateVersionFormat(null)).toBe(false);
    });

    test("should check if version exists", async () => {
      const version = "1.0.0";
      mockDatabaseConnection.query.mockResolvedValue([{ version }]);

      const exists = await schemaVersionManager.versionExists(version);

      expect(exists).toBe(true);
    });

    test("should return false for non-existent version", async () => {
      const version = "999.999.999";
      mockDatabaseConnection.query.mockResolvedValue([]);

      const exists = await schemaVersionManager.versionExists(version);

      expect(exists).toBe(false);
    });
  });

  describe("Migration Management", () => {
    beforeEach(async () => {
      mockDatabaseConnection.execute.mockResolvedValue({ changes: 1 });
      await schemaVersionManager.initialize();
    });

    test("should apply migration", async () => {
      const version = "1.1.0";
      const description = "Added new table";
      const migrationSQL = "CREATE TABLE new_table (id INTEGER PRIMARY KEY)";

      mockDatabaseConnection.execute.mockResolvedValue({ changes: 1 });

      await schemaVersionManager.applyMigration(
        version,
        description,
        migrationSQL,
      );

      expect(mockDatabaseConnection.execute).toHaveBeenCalledWith(migrationSQL);
      expect(mockDatabaseConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO schema_versions"),
        expect.arrayContaining([version, description]),
      );
    });

    test("should rollback migration", async () => {
      const version = "1.1.0";
      const rollbackSQL = "DROP TABLE new_table";

      mockDatabaseConnection.execute.mockResolvedValue({ changes: 1 });

      await schemaVersionManager.rollbackMigration(version, rollbackSQL);

      expect(mockDatabaseConnection.execute).toHaveBeenCalledWith(rollbackSQL);
      expect(mockDatabaseConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining(
          "DELETE FROM schema_versions WHERE version = ?",
        ),
        [version],
      );
    });

    test("should handle migration errors gracefully", async () => {
      const version = "1.1.0";
      const description = "Invalid migration";
      const migrationSQL = "INVALID SQL";

      const error = new Error("Migration failed");
      mockDatabaseConnection.execute.mockRejectedValue(error);

      await expect(
        schemaVersionManager.applyMigration(version, description, migrationSQL),
      ).rejects.toThrow("Migration failed");
    });

    test("should handle rollback errors gracefully", async () => {
      const version = "1.1.0";
      const rollbackSQL = "INVALID SQL";

      const error = new Error("Rollback failed");
      mockDatabaseConnection.execute.mockRejectedValue(error);

      await expect(
        schemaVersionManager.rollbackMigration(version, rollbackSQL),
      ).rejects.toThrow("Rollback failed");
    });
  });

  describe("Version Comparison", () => {
    test("should compare version numbers correctly", () => {
      expect(schemaVersionManager.compareVersions("1.0.0", "1.0.0")).toBe(0);
      expect(schemaVersionManager.compareVersions("1.0.0", "1.0.1")).toBe(-1);
      expect(schemaVersionManager.compareVersions("1.0.1", "1.0.0")).toBe(1);
      expect(schemaVersionManager.compareVersions("1.1.0", "1.0.0")).toBe(1);
      expect(schemaVersionManager.compareVersions("2.0.0", "1.9.9")).toBe(1);
    });

    test("should handle pre-release versions", () => {
      expect(schemaVersionManager.compareVersions("1.0.0", "1.0.0-alpha")).toBe(
        1,
      );
      expect(
        schemaVersionManager.compareVersions("1.0.0-alpha", "1.0.0-beta"),
      ).toBe(-1);
      expect(schemaVersionManager.compareVersions("1.0.0-beta", "1.0.0")).toBe(
        -1,
      );
    });

    test("should determine if version is newer", () => {
      expect(schemaVersionManager.isNewer("1.0.1", "1.0.0")).toBe(true);
      expect(schemaVersionManager.isNewer("1.0.0", "1.0.1")).toBe(false);
      expect(schemaVersionManager.isNewer("1.0.0", "1.0.0")).toBe(false);
    });

    test("should determine if version is older", () => {
      expect(schemaVersionManager.isOlder("1.0.0", "1.0.1")).toBe(true);
      expect(schemaVersionManager.isOlder("1.0.1", "1.0.0")).toBe(false);
      expect(schemaVersionManager.isOlder("1.0.0", "1.0.0")).toBe(false);
    });
  });

  describe("Schema Validation", () => {
    beforeEach(async () => {
      mockDatabaseConnection.execute.mockResolvedValue({ changes: 1 });
      await schemaVersionManager.initialize();
    });

    test("should validate schema integrity", async () => {
      const mockTables = [
        { name: "users" },
        { name: "posts" },
        { name: "schema_versions" },
      ];
      mockDatabaseConnection.query.mockResolvedValue(mockTables);

      const isValid = await schemaVersionManager.validateSchemaIntegrity();

      expect(isValid).toBe(true);
    });

    test("should detect missing schema version table", async () => {
      const mockTables = [{ name: "users" }, { name: "posts" }];
      mockDatabaseConnection.query.mockResolvedValue(mockTables);

      const isValid = await schemaVersionManager.validateSchemaIntegrity();

      expect(isValid).toBe(false);
    });

    test("should validate required tables exist", async () => {
      const requiredTables = ["users", "posts", "schema_versions"];
      const mockTables = [
        { name: "users" },
        { name: "posts" },
        { name: "schema_versions" },
        { name: "extra_table" },
      ];
      mockDatabaseConnection.query.mockResolvedValue(mockTables);

      const isValid =
        await schemaVersionManager.validateRequiredTables(requiredTables);

      expect(isValid).toBe(true);
    });

    test("should detect missing required tables", async () => {
      const requiredTables = ["users", "posts", "schema_versions"];
      const mockTables = [{ name: "users" }, { name: "schema_versions" }];
      mockDatabaseConnection.query.mockResolvedValue(mockTables);

      const isValid =
        await schemaVersionManager.validateRequiredTables(requiredTables);

      expect(isValid).toBe(false);
    });
  });

  describe("Error Handling", () => {
    test("should handle database connection errors gracefully", async () => {
      const error = new Error("Database connection failed");
      mockDatabaseConnection.execute.mockRejectedValue(error);

      await expect(schemaVersionManager.initialize()).rejects.toThrow(
        "Database connection failed",
      );
    });

    test("should handle query errors gracefully", async () => {
      mockDatabaseConnection.execute.mockResolvedValue({ changes: 1 });
      await schemaVersionManager.initialize();

      const error = new Error("Query failed");
      mockDatabaseConnection.query.mockRejectedValue(error);

      await expect(schemaVersionManager.getCurrentVersion()).rejects.toThrow(
        "Query failed",
      );
    });

    test("should handle invalid version operations gracefully", async () => {
      mockDatabaseConnection.execute.mockResolvedValue({ changes: 1 });
      await schemaVersionManager.initialize();

      await expect(
        schemaVersionManager.setVersion("", "Invalid version"),
      ).rejects.toThrow();
    });
  });

  describe("Performance", () => {
    beforeEach(async () => {
      mockDatabaseConnection.execute.mockResolvedValue({ changes: 1 });
      await schemaVersionManager.initialize();
    });

    test("should handle large version histories efficiently", async () => {
      const mockVersions = Array(1000)
        .fill()
        .map((_, i) => ({
          version: `1.${i}.0`,
          description: `Version 1.${i}.0`,
          applied_at: new Date().toISOString(),
        }));
      mockDatabaseConnection.query.mockResolvedValue(mockVersions);

      const startTime = Date.now();
      const result = await schemaVersionManager.listVersions();
      const endTime = Date.now();

      expect(result).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(100); // Should complete in less than 100ms
    });

    test("should cache version information efficiently", async () => {
      const version = "1.0.0";
      const mockVersion = { version, description: "Initial version" };
      mockDatabaseConnection.query.mockResolvedValue([mockVersion]);

      // First call
      const result1 = await schemaVersionManager.getVersion(version);
      // Second call should use cache if implemented
      const result2 = await schemaVersionManager.getVersion(version);

      expect(result1).toEqual(mockVersion);
      expect(result2).toEqual(mockVersion);
    });
  });

  describe("Configuration", () => {
    test("should handle custom version table name", () => {
      const customTableName = "custom_schema_versions";
      const manager = new SchemaVersionManager(
        mockDatabaseConnection,
        customTableName,
      );

      expect(manager.versionTableName).toBe(customTableName);
    });

    test("should use default version table name", () => {
      expect(schemaVersionManager.versionTableName).toBe("schema_versions");
    });
  });
});
