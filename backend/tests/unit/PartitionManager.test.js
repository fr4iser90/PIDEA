/**
 * PartitionManager Unit Tests
 * Tests for database table partitioning utilities
 */
const PartitionManager = require("../../infrastructure/database/PartitionManager");

describe("PartitionManager", () => {
  let partitionManager;
  let mockDatabaseConnection;

  beforeEach(() => {
    mockDatabaseConnection = {
      execute: jest.fn(),
      getType: jest.fn(() => "postgresql"),
    };

    partitionManager = new PartitionManager(mockDatabaseConnection);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with database connection", () => {
      expect(partitionManager.db).toBe(mockDatabaseConnection);
      expect(partitionManager.logger).toBeDefined();
      expect(partitionManager.partitionCache).toBeDefined();
      expect(partitionManager.partitionStrategies).toBeDefined();
    });

    it("should initialize partition strategies", () => {
      expect(partitionManager.partitionStrategies.has("range")).toBe(true);
      expect(partitionManager.partitionStrategies.has("list")).toBe(true);
      expect(partitionManager.partitionStrategies.has("hash")).toBe(true);
    });
  });

  describe("createPartition", () => {
    it("should create partition successfully", async () => {
      const table = "tasks";
      const partitionKey = "created_at";
      const strategy = "range";
      const options = {};

      mockDatabaseConnection.execute.mockResolvedValue({});

      const result = await partitionManager.createPartition(
        table,
        partitionKey,
        strategy,
        options,
      );

      expect(result).toHaveProperty("partitionName");
      expect(result).toHaveProperty("table");
      expect(result).toHaveProperty("partitionKey");
      expect(result).toHaveProperty("strategy");
      expect(result).toHaveProperty("options");
      expect(result).toHaveProperty("createdAt");
      expect(result).toHaveProperty("status");
      expect(result.table).toBe(table);
      expect(result.partitionKey).toBe(partitionKey);
      expect(result.strategy).toBe(strategy);
      expect(result.status).toBe("active");
    });

    it("should handle existing partition", async () => {
      const table = "tasks";
      const partitionKey = "created_at";
      const strategy = "range";
      const options = {};

      // Mock existing partition
      partitionManager.partitionCache.set("partition_tasks_created_at", {
        partitionName: "partition_tasks_created_at",
        table,
        partitionKey,
        strategy,
        status: "active",
      });

      const result = await partitionManager.createPartition(
        table,
        partitionKey,
        strategy,
        options,
      );

      expect(result.partitionName).toBe("partition_tasks_created_at");
      expect(mockDatabaseConnection.execute).not.toHaveBeenCalled();
    });

    it("should handle partition creation errors", async () => {
      const table = "tasks";
      const partitionKey = "created_at";
      const strategy = "range";
      const options = {};

      mockDatabaseConnection.execute.mockRejectedValue(
        new Error("Partition creation failed"),
      );

      await expect(
        partitionManager.createPartition(
          table,
          partitionKey,
          strategy,
          options,
        ),
      ).rejects.toThrow("Partition creation failed");
    });
  });

  describe("createRangePartition", () => {
    it("should create range partition successfully", async () => {
      const table = "tasks";
      const partitionKey = "created_at";
      const rangeOptions = {
        startValue: "2025-01-01",
        endValue: "2025-02-01",
        partitionName: "tasks_2025_01",
      };

      mockDatabaseConnection.execute.mockResolvedValue({});

      const result = await partitionManager.createRangePartition(
        table,
        partitionKey,
        rangeOptions,
      );

      expect(result).toHaveProperty("partitionName");
      expect(result).toHaveProperty("table");
      expect(result).toHaveProperty("partitionKey");
      expect(result).toHaveProperty("strategy");
      expect(result).toHaveProperty("startValue");
      expect(result).toHaveProperty("endValue");
      expect(result).toHaveProperty("createdAt");
      expect(result).toHaveProperty("status");
      expect(result.partitionName).toBe(rangeOptions.partitionName);
      expect(result.strategy).toBe("range");
    });
  });

  describe("createListPartition", () => {
    it("should create list partition successfully", async () => {
      const table = "tasks";
      const partitionKey = "status";
      const listOptions = {
        values: ["pending", "running"],
        partitionName: "tasks_active",
      };

      mockDatabaseConnection.execute.mockResolvedValue({});

      const result = await partitionManager.createListPartition(
        table,
        partitionKey,
        listOptions,
      );

      expect(result).toHaveProperty("partitionName");
      expect(result).toHaveProperty("table");
      expect(result).toHaveProperty("partitionKey");
      expect(result).toHaveProperty("strategy");
      expect(result).toHaveProperty("values");
      expect(result).toHaveProperty("createdAt");
      expect(result).toHaveProperty("status");
      expect(result.partitionName).toBe(listOptions.partitionName);
      expect(result.strategy).toBe("list");
      expect(result.values).toEqual(listOptions.values);
    });
  });

  describe("managePartitions", () => {
    it("should manage partitions successfully", async () => {
      const table = "tasks";

      mockDatabaseConnection.execute.mockResolvedValue({
        rows: [
          {
            schemaname: "public",
            tablename: "tasks",
            partitionname: "tasks_2025_01",
            partitionbounddef: "FOR VALUES FROM (2025-01-01) TO (2025-02-01)",
            partitionisdefault: false,
            partitionisnull: false,
          },
        ],
      });

      const result = await partitionManager.managePartitions(table);

      expect(result).toHaveProperty("table");
      expect(result).toHaveProperty("partitions");
      expect(result).toHaveProperty("managementActions");
      expect(result).toHaveProperty("recommendations");
      expect(result).toHaveProperty("summary");
      expect(result).toHaveProperty("timestamp");
      expect(result.table).toBe(table);
    });
  });

  describe("getPartitions", () => {
    it("should get table partitions", async () => {
      const tableName = "tasks";

      mockDatabaseConnection.execute.mockResolvedValue({
        rows: [
          {
            schemaname: "public",
            tablename: "tasks",
            partitionname: "tasks_2025_01",
            partitionbounddef: "FOR VALUES FROM (2025-01-01) TO (2025-02-01)",
            partitionisdefault: false,
            partitionisnull: false,
          },
        ],
      });

      const result = await partitionManager.getPartitions(tableName);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(1);
      expect(result[0]).toHaveProperty("schema");
      expect(result[0]).toHaveProperty("table");
      expect(result[0]).toHaveProperty("partitionName");
      expect(result[0]).toHaveProperty("boundDefinition");
      expect(result[0]).toHaveProperty("status");
    });
  });

  describe("getPartition", () => {
    it("should get partition from cache", async () => {
      const partitionName = "tasks_2025_01";
      const partitionData = {
        schema: "public",
        table: "tasks",
        partitionName,
        boundDefinition: "FOR VALUES FROM (2025-01-01) TO (2025-02-01)",
        status: "active",
      };

      partitionManager.partitionCache.set(partitionName, partitionData);

      const result = await partitionManager.getPartition(partitionName);

      expect(result).toEqual(partitionData);
      expect(mockDatabaseConnection.execute).not.toHaveBeenCalled();
    });

    it("should query database for missing partition", async () => {
      const partitionName = "tasks_2025_01";

      mockDatabaseConnection.execute.mockResolvedValue({
        rows: [
          {
            schemaname: "public",
            tablename: "tasks",
            partitionname: partitionName,
            partitionbounddef: "FOR VALUES FROM (2025-01-01) TO (2025-02-01)",
            partitionisdefault: false,
            partitionisnull: false,
          },
        ],
      });

      const result = await partitionManager.getPartition(partitionName);

      expect(result).toHaveProperty("schema");
      expect(result).toHaveProperty("table");
      expect(result).toHaveProperty("partitionName");
      expect(result).toHaveProperty("boundDefinition");
      expect(result).toHaveProperty("status");
    });

    it("should return null for non-existent partition", async () => {
      const partitionName = "non_existent_partition";

      mockDatabaseConnection.execute.mockResolvedValue({
        rows: [],
      });

      const result = await partitionManager.getPartition(partitionName);

      expect(result).toBeNull();
    });
  });

  describe("dropPartition", () => {
    it("should drop partition successfully", async () => {
      const partitionName = "tasks_2025_01";

      // Mock existing partition
      partitionManager.partitionCache.set(partitionName, {
        partitionName,
        table: "tasks",
        partitionKey: "created_at",
        strategy: "range",
        status: "active",
      });

      mockDatabaseConnection.execute.mockResolvedValue({});

      const result = await partitionManager.dropPartition(partitionName);

      expect(result).toHaveProperty("partitionName");
      expect(result).toHaveProperty("droppedAt");
      expect(result).toHaveProperty("status");
      expect(result.partitionName).toBe(partitionName);
      expect(result.status).toBe("dropped");
    });

    it("should handle non-existent partition", async () => {
      const partitionName = "non_existent_partition";

      await expect(
        partitionManager.dropPartition(partitionName),
      ).rejects.toThrow(`Partition ${partitionName} not found`);
    });
  });

  describe("generatePartitionName", () => {
    it("should generate partition name correctly", () => {
      const table = "tasks";
      const partitionKey = "created_at";

      const partitionName = partitionManager.generatePartitionName(
        table,
        partitionKey,
      );

      expect(partitionName).toBe("partition_tasks_created_at");
    });
  });

  describe("generatePartitionSQL", () => {
    it("should generate range partition SQL", () => {
      const table = "tasks";
      const partitionKey = "created_at";
      const strategy = "range";
      const options = {};

      const sql = partitionManager.generatePartitionSQL(
        table,
        partitionKey,
        strategy,
        options,
      );

      expect(sql).toContain("CREATE TABLE");
      expect(sql).toContain("tasks_partitioned");
      expect(sql).toContain("PARTITION BY RANGE");
      expect(sql).toContain("created_at");
    });

    it("should generate list partition SQL", () => {
      const table = "tasks";
      const partitionKey = "status";
      const strategy = "list";
      const options = {};

      const sql = partitionManager.generatePartitionSQL(
        table,
        partitionKey,
        strategy,
        options,
      );

      expect(sql).toContain("CREATE TABLE");
      expect(sql).toContain("tasks_partitioned");
      expect(sql).toContain("PARTITION BY LIST");
      expect(sql).toContain("status");
    });

    it("should generate hash partition SQL", () => {
      const table = "tasks";
      const partitionKey = "id";
      const strategy = "hash";
      const options = {};

      const sql = partitionManager.generatePartitionSQL(
        table,
        partitionKey,
        strategy,
        options,
      );

      expect(sql).toContain("CREATE TABLE");
      expect(sql).toContain("tasks_partitioned");
      expect(sql).toContain("PARTITION BY HASH");
      expect(sql).toContain("id");
    });

    it("should handle unknown strategy", () => {
      const table = "tasks";
      const partitionKey = "created_at";
      const strategy = "unknown";
      const options = {};

      expect(() =>
        partitionManager.generatePartitionSQL(
          table,
          partitionKey,
          strategy,
          options,
        ),
      ).toThrow("Unknown partition strategy: unknown");
    });
  });

  describe("generateManagementActions", () => {
    it("should generate management actions", async () => {
      const partitions = [
        {
          partitionName: "tasks_2025_01",
          status: "active",
        },
        {
          partitionName: "tasks_2024_01",
          status: "inactive",
        },
      ];

      const result =
        await partitionManager.generateManagementActions(partitions);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe("generatePartitionRecommendations", () => {
    it("should generate partition recommendations", async () => {
      const table = "tasks";
      const partitions = [];

      const result = await partitionManager.generatePartitionRecommendations(
        table,
        partitions,
      );

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty("type");
      expect(result[0]).toHaveProperty("table");
      expect(result[0]).toHaveProperty("description");
      expect(result[0]).toHaveProperty("priority");
      expect(result[0]).toHaveProperty("estimatedImprovement");
    });
  });

  describe("getTableSize", () => {
    it("should get table size", async () => {
      const table = "tasks";

      mockDatabaseConnection.execute.mockResolvedValue({
        rows: [{ count: "1000" }],
      });

      const result = await partitionManager.getTableSize(table);

      expect(result).toBe(1000);
    });

    it("should handle errors gracefully", async () => {
      const table = "non_existent_table";

      mockDatabaseConnection.execute.mockRejectedValue(
        new Error("Table not found"),
      );

      const result = await partitionManager.getTableSize(table);

      expect(result).toBe(0);
    });
  });

  describe("isTimeSeriesTable", () => {
    it("should identify time-series tables", () => {
      expect(partitionManager.isTimeSeriesTable("tasks")).toBe(true);
      expect(partitionManager.isTimeSeriesTable("queue_history")).toBe(true);
      expect(partitionManager.isTimeSeriesTable("performance_metrics")).toBe(
        true,
      );
      expect(partitionManager.isTimeSeriesTable("users")).toBe(false);
    });
  });

  describe("getPartitionStats", () => {
    it("should return partition statistics", () => {
      const stats = partitionManager.getPartitionStats();

      expect(stats).toHaveProperty("totalPartitions");
      expect(stats).toHaveProperty("partitionStrategies");
      expect(stats).toHaveProperty("timestamp");
    });
  });

  describe("clearCache", () => {
    it("should clear partition cache", () => {
      partitionManager.partitionCache.set("test", { data: "test" });

      expect(partitionManager.partitionCache.size).toBe(1);

      partitionManager.clearCache();

      expect(partitionManager.partitionCache.size).toBe(0);
    });
  });
});
