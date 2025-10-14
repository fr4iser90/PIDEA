/**
 * PerformanceSchema Unit Tests
 * Tests for database performance optimization schema
 */
const PerformanceSchema = require("../../infrastructure/database/PerformanceSchema");

describe("PerformanceSchema", () => {
  let performanceSchema;
  let mockDatabaseConnection;

  beforeEach(() => {
    mockDatabaseConnection = {
      execute: jest.fn(),
      getType: jest.fn(() => "postgresql"),
    };

    performanceSchema = new PerformanceSchema(mockDatabaseConnection);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with database connection", () => {
      expect(performanceSchema.db).toBe(mockDatabaseConnection);
      expect(performanceSchema.logger).toBeDefined();
      expect(performanceSchema.schemaCache).toBeDefined();
      expect(performanceSchema.optimizationRules).toBeDefined();
      expect(performanceSchema.schemaVersion).toBeDefined();
    });

    it("should initialize optimization rules", () => {
      expect(
        performanceSchema.optimizationRules.has("index_optimization"),
      ).toBe(true);
      expect(
        performanceSchema.optimizationRules.has("query_optimization"),
      ).toBe(true);
      expect(
        performanceSchema.optimizationRules.has("partition_optimization"),
      ).toBe(true);
      expect(
        performanceSchema.optimizationRules.has(
          "materialized_view_optimization",
        ),
      ).toBe(true);
    });
  });

  describe("initializeSchema", () => {
    it("should initialize performance schema successfully", async () => {
      mockDatabaseConnection.execute.mockResolvedValue({});

      const result = await performanceSchema.initializeSchema();

      expect(result).toHaveProperty("status");
      expect(result).toHaveProperty("version");
      expect(result).toHaveProperty("initializedAt");
      expect(result).toHaveProperty("tables");
      expect(result).toHaveProperty("indexes");
      expect(result).toHaveProperty("views");
      expect(result).toHaveProperty("functions");
      expect(result).toHaveProperty("triggers");
      expect(result.status).toBe("initialized");
    });

    it("should handle schema initialization errors", async () => {
      mockDatabaseConnection.execute.mockRejectedValue(
        new Error("Schema initialization failed"),
      );

      await expect(performanceSchema.initializeSchema()).rejects.toThrow(
        "Schema initialization failed",
      );
    });
  });

  describe("createPerformanceTables", () => {
    it("should create performance tables successfully", async () => {
      mockDatabaseConnection.execute.mockResolvedValue({});

      const result = await performanceSchema.createPerformanceTables();

      expect(result).toHaveProperty("tables");
      expect(result).toHaveProperty("createdAt");
      expect(result).toHaveProperty("status");
      expect(result.status).toBe("created");
    });

    it("should handle table creation errors", async () => {
      mockDatabaseConnection.execute.mockRejectedValue(
        new Error("Table creation failed"),
      );

      await expect(performanceSchema.createPerformanceTables()).rejects.toThrow(
        "Table creation failed",
      );
    });
  });

  describe("createPerformanceIndexes", () => {
    it("should create performance indexes successfully", async () => {
      mockDatabaseConnection.execute.mockResolvedValue({});

      const result = await performanceSchema.createPerformanceIndexes();

      expect(result).toHaveProperty("indexes");
      expect(result).toHaveProperty("createdAt");
      expect(result).toHaveProperty("status");
      expect(result.status).toBe("created");
    });

    it("should handle index creation errors", async () => {
      mockDatabaseConnection.execute.mockRejectedValue(
        new Error("Index creation failed"),
      );

      await expect(
        performanceSchema.createPerformanceIndexes(),
      ).rejects.toThrow("Index creation failed");
    });
  });

  describe("createPerformanceViews", () => {
    it("should create performance views successfully", async () => {
      mockDatabaseConnection.execute.mockResolvedValue({});

      const result = await performanceSchema.createPerformanceViews();

      expect(result).toHaveProperty("views");
      expect(result).toHaveProperty("createdAt");
      expect(result).toHaveProperty("status");
      expect(result.status).toBe("created");
    });

    it("should handle view creation errors", async () => {
      mockDatabaseConnection.execute.mockRejectedValue(
        new Error("View creation failed"),
      );

      await expect(performanceSchema.createPerformanceViews()).rejects.toThrow(
        "View creation failed",
      );
    });
  });

  describe("createPerformanceFunctions", () => {
    it("should create performance functions successfully", async () => {
      mockDatabaseConnection.execute.mockResolvedValue({});

      const result = await performanceSchema.createPerformanceFunctions();

      expect(result).toHaveProperty("functions");
      expect(result).toHaveProperty("createdAt");
      expect(result).toHaveProperty("status");
      expect(result.status).toBe("created");
    });

    it("should handle function creation errors", async () => {
      mockDatabaseConnection.execute.mockRejectedValue(
        new Error("Function creation failed"),
      );

      await expect(
        performanceSchema.createPerformanceFunctions(),
      ).rejects.toThrow("Function creation failed");
    });
  });

  describe("createPerformanceTriggers", () => {
    it("should create performance triggers successfully", async () => {
      mockDatabaseConnection.execute.mockResolvedValue({});

      const result = await performanceSchema.createPerformanceTriggers();

      expect(result).toHaveProperty("triggers");
      expect(result).toHaveProperty("createdAt");
      expect(result).toHaveProperty("status");
      expect(result.status).toBe("created");
    });

    it("should handle trigger creation errors", async () => {
      mockDatabaseConnection.execute.mockRejectedValue(
        new Error("Trigger creation failed"),
      );

      await expect(
        performanceSchema.createPerformanceTriggers(),
      ).rejects.toThrow("Trigger creation failed");
    });
  });

  describe("getSchemaVersion", () => {
    it("should return current schema version", () => {
      const version = performanceSchema.getSchemaVersion();

      expect(version).toBeDefined();
      expect(typeof version).toBe("string");
    });
  });

  describe("checkSchemaCompatibility", () => {
    it("should check schema compatibility successfully", async () => {
      mockDatabaseConnection.execute.mockResolvedValue({
        rows: [{ version: "1.0.0" }],
      });

      const result = await performanceSchema.checkSchemaCompatibility();

      expect(result).toHaveProperty("currentVersion");
      expect(result).toHaveProperty("requiredVersion");
      expect(result).toHaveProperty("compatible");
      expect(result).toHaveProperty("status");
    });

    it("should handle compatibility check errors", async () => {
      mockDatabaseConnection.execute.mockRejectedValue(
        new Error("Compatibility check failed"),
      );

      await expect(
        performanceSchema.checkSchemaCompatibility(),
      ).rejects.toThrow("Compatibility check failed");
    });
  });

  describe("upgradeSchema", () => {
    it("should upgrade schema successfully", async () => {
      mockDatabaseConnection.execute.mockResolvedValue({});

      const result = await performanceSchema.upgradeSchema();

      expect(result).toHaveProperty("status");
      expect(result).toHaveProperty("fromVersion");
      expect(result).toHaveProperty("toVersion");
      expect(result).toHaveProperty("upgradedAt");
      expect(result).toHaveProperty("changes");
      expect(result.status).toBe("upgraded");
    });

    it("should handle schema upgrade errors", async () => {
      mockDatabaseConnection.execute.mockRejectedValue(
        new Error("Schema upgrade failed"),
      );

      await expect(performanceSchema.upgradeSchema()).rejects.toThrow(
        "Schema upgrade failed",
      );
    });
  });

  describe("validateSchema", () => {
    it("should validate schema successfully", async () => {
      mockDatabaseConnection.execute.mockResolvedValue({
        rows: [
          { table_name: "performance_metrics", status: "exists" },
          { table_name: "query_performance", status: "exists" },
          { table_name: "index_usage", status: "exists" },
        ],
      });

      const result = await performanceSchema.validateSchema();

      expect(result).toHaveProperty("valid");
      expect(result).toHaveProperty("tables");
      expect(result).toHaveProperty("indexes");
      expect(result).toHaveProperty("views");
      expect(result).toHaveProperty("functions");
      expect(result).toHaveProperty("triggers");
      expect(result).toHaveProperty("errors");
      expect(result).toHaveProperty("warnings");
      expect(result.valid).toBe(true);
    });

    it("should detect schema validation errors", async () => {
      mockDatabaseConnection.execute.mockResolvedValue({
        rows: [{ table_name: "performance_metrics", status: "missing" }],
      });

      const result = await performanceSchema.validateSchema();

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe("getSchemaInfo", () => {
    it("should return schema information", async () => {
      mockDatabaseConnection.execute.mockResolvedValue({
        rows: [
          { table_name: "performance_metrics", table_type: "table" },
          { table_name: "query_performance", table_type: "table" },
          { table_name: "index_usage", table_type: "table" },
        ],
      });

      const result = await performanceSchema.getSchemaInfo();

      expect(result).toHaveProperty("tables");
      expect(result).toHaveProperty("indexes");
      expect(result).toHaveProperty("views");
      expect(result).toHaveProperty("functions");
      expect(result).toHaveProperty("triggers");
      expect(result).toHaveProperty("version");
      expect(result).toHaveProperty("lastUpdated");
    });
  });

  describe("getOptimizationRules", () => {
    it("should return optimization rules", () => {
      const rules = performanceSchema.getOptimizationRules();

      expect(rules).toBeInstanceOf(Map);
      expect(rules.has("index_optimization")).toBe(true);
      expect(rules.has("query_optimization")).toBe(true);
      expect(rules.has("partition_optimization")).toBe(true);
      expect(rules.has("materialized_view_optimization")).toBe(true);
    });
  });

  describe("addOptimizationRule", () => {
    it("should add optimization rule", () => {
      const ruleName = "custom_optimization";
      const rule = {
        name: ruleName,
        description: "Custom optimization rule",
        enabled: true,
        priority: 1,
      };

      performanceSchema.addOptimizationRule(ruleName, rule);

      expect(performanceSchema.optimizationRules.has(ruleName)).toBe(true);
      expect(performanceSchema.optimizationRules.get(ruleName)).toEqual(rule);
    });
  });

  describe("removeOptimizationRule", () => {
    it("should remove optimization rule", () => {
      const ruleName = "index_optimization";

      expect(performanceSchema.optimizationRules.has(ruleName)).toBe(true);

      performanceSchema.removeOptimizationRule(ruleName);

      expect(performanceSchema.optimizationRules.has(ruleName)).toBe(false);
    });
  });

  describe("enableOptimizationRule", () => {
    it("should enable optimization rule", () => {
      const ruleName = "index_optimization";

      performanceSchema.enableOptimizationRule(ruleName);

      const rule = performanceSchema.optimizationRules.get(ruleName);
      expect(rule.enabled).toBe(true);
    });
  });

  describe("disableOptimizationRule", () => {
    it("should disable optimization rule", () => {
      const ruleName = "index_optimization";

      performanceSchema.disableOptimizationRule(ruleName);

      const rule = performanceSchema.optimizationRules.get(ruleName);
      expect(rule.enabled).toBe(false);
    });
  });

  describe("getSchemaStats", () => {
    it("should return schema statistics", () => {
      const stats = performanceSchema.getSchemaStats();

      expect(stats).toHaveProperty("totalTables");
      expect(stats).toHaveProperty("totalIndexes");
      expect(stats).toHaveProperty("totalViews");
      expect(stats).toHaveProperty("totalFunctions");
      expect(stats).toHaveProperty("totalTriggers");
      expect(stats).toHaveProperty("optimizationRules");
      expect(stats).toHaveProperty("schemaVersion");
      expect(stats).toHaveProperty("timestamp");
    });
  });

  describe("clearCache", () => {
    it("should clear schema cache", () => {
      performanceSchema.schemaCache.set("test", { data: "test" });

      expect(performanceSchema.schemaCache.size).toBe(1);

      performanceSchema.clearCache();

      expect(performanceSchema.schemaCache.size).toBe(0);
    });
  });

  describe("backupSchema", () => {
    it("should backup schema successfully", async () => {
      mockDatabaseConnection.execute.mockResolvedValue({
        rows: [
          { table_name: "performance_metrics", definition: "CREATE TABLE..." },
        ],
      });

      const result = await performanceSchema.backupSchema();

      expect(result).toHaveProperty("backupId");
      expect(result).toHaveProperty("timestamp");
      expect(result).toHaveProperty("tables");
      expect(result).toHaveProperty("indexes");
      expect(result).toHaveProperty("views");
      expect(result).toHaveProperty("functions");
      expect(result).toHaveProperty("triggers");
      expect(result).toHaveProperty("status");
      expect(result.status).toBe("backed_up");
    });
  });

  describe("restoreSchema", () => {
    it("should restore schema successfully", async () => {
      const backupData = {
        tables: [{ name: "test_table", definition: "CREATE TABLE..." }],
        indexes: [],
        views: [],
        functions: [],
        triggers: [],
      };

      mockDatabaseConnection.execute.mockResolvedValue({});

      const result = await performanceSchema.restoreSchema(backupData);

      expect(result).toHaveProperty("status");
      expect(result).toHaveProperty("restoredAt");
      expect(result).toHaveProperty("tables");
      expect(result).toHaveProperty("indexes");
      expect(result).toHaveProperty("views");
      expect(result).toHaveProperty("functions");
      expect(result).toHaveProperty("triggers");
      expect(result.status).toBe("restored");
    });
  });
});
