/**
 * Database Optimization Integration Tests
 * Tests for database optimization system integration
 */
const DatabaseConnection = require("../../infrastructure/database/DatabaseConnection");
const DatabaseOptimizationService = require("../../application/services/DatabaseOptimizationService");

describe("Database Optimization Integration", () => {
  let databaseConnection;
  let databaseOptimizationService;
  let mockConfig;

  beforeEach(() => {
    mockConfig = {
      type: "postgresql",
      host: "localhost",
      port: 5432,
      database: "test_db",
      username: "test_user",
      password: "test_password",
      monitoring: true,
      optimization: true,
    };

    // Mock database connection
    databaseConnection = {
      execute: jest.fn(),
      getType: jest.fn(() => "postgresql"),
      getQueryOptimizer: jest.fn(),
      getIndexManager: jest.fn(),
      getPartitionManager: jest.fn(),
      getMaterializedViewManager: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("DatabaseOptimizationService", () => {
    let mockQueryOptimizer;
    let mockIndexManager;
    let mockPartitionManager;
    let mockMaterializedViewManager;

    beforeEach(() => {
      mockQueryOptimizer = {
        optimizeQuery: jest.fn(),
        getOptimizationStats: jest.fn(),
      };

      mockIndexManager = {
        analyzeIndexUsage: jest.fn(),
        createIndex: jest.fn(),
        getIndexStats: jest.fn(),
      };

      mockPartitionManager = {
        managePartitions: jest.fn(),
        generatePartitionRecommendations: jest.fn(),
        getPartitionStats: jest.fn(),
      };

      mockMaterializedViewManager = {
        refreshMaterializedView: jest.fn(),
        getViewStats: jest.fn(),
      };

      databaseOptimizationService = new DatabaseOptimizationService(
        mockQueryOptimizer,
        mockIndexManager,
        mockPartitionManager,
        mockMaterializedViewManager,
      );
    });

    describe("performOptimization", () => {
      it("should perform complete database optimization", async () => {
        const options = {
          queryOptimization: true,
          indexOptimization: true,
          partitionOptimization: true,
          materializedViewOptimization: true,
        };

        mockQueryOptimizer.optimizeQuery.mockResolvedValue({
          performanceGain: 25.5,
        });

        mockIndexManager.analyzeIndexUsage.mockResolvedValue({
          recommendations: [
            {
              action: "create",
              table: "tasks",
              columns: ["status"],
              options: {},
            },
          ],
        });

        mockIndexManager.createIndex.mockResolvedValue({
          indexName: "idx_tasks_status",
          table: "tasks",
          columns: ["status"],
          createdAt: new Date().toISOString(),
        });

        mockPartitionManager.managePartitions.mockResolvedValue({
          managementActions: [],
        });

        mockMaterializedViewManager.refreshMaterializedView.mockResolvedValue({
          name: "task_performance_summary",
          refreshedAt: new Date().toISOString(),
        });

        const result =
          await databaseOptimizationService.performOptimization(options);

        expect(result).toHaveProperty("queryOptimization");
        expect(result).toHaveProperty("indexOptimization");
        expect(result).toHaveProperty("partitionOptimization");
        expect(result).toHaveProperty("materializedViewOptimization");
        expect(result).toHaveProperty("timestamp");

        expect(mockQueryOptimizer.optimizeQuery).toHaveBeenCalled();
        expect(mockIndexManager.analyzeIndexUsage).toHaveBeenCalled();
        expect(mockIndexManager.createIndex).toHaveBeenCalled();
        expect(mockPartitionManager.managePartitions).toHaveBeenCalled();
        expect(
          mockMaterializedViewManager.refreshMaterializedView,
        ).toHaveBeenCalled();
      });

      it("should skip disabled optimizations", async () => {
        const options = {
          queryOptimization: false,
          indexOptimization: true,
          partitionOptimization: false,
          materializedViewOptimization: true,
        };

        mockIndexManager.analyzeIndexUsage.mockResolvedValue({
          recommendations: [],
        });

        mockMaterializedViewManager.refreshMaterializedView.mockResolvedValue({
          name: "task_performance_summary",
          refreshedAt: new Date().toISOString(),
        });

        const result =
          await databaseOptimizationService.performOptimization(options);

        expect(result.queryOptimization).toBeNull();
        expect(result.indexOptimization).not.toBeNull();
        expect(result.partitionOptimization).toBeNull();
        expect(result.materializedViewOptimization).not.toBeNull();

        expect(mockQueryOptimizer.optimizeQuery).not.toHaveBeenCalled();
        expect(mockIndexManager.analyzeIndexUsage).toHaveBeenCalled();
        expect(mockPartitionManager.managePartitions).not.toHaveBeenCalled();
        expect(
          mockMaterializedViewManager.refreshMaterializedView,
        ).toHaveBeenCalled();
      });

      it("should handle optimization errors gracefully", async () => {
        const options = {
          queryOptimization: true,
          indexOptimization: true,
        };

        mockQueryOptimizer.optimizeQuery.mockRejectedValue(
          new Error("Query optimization failed"),
        );
        mockIndexManager.analyzeIndexUsage.mockRejectedValue(
          new Error("Index analysis failed"),
        );

        await expect(
          databaseOptimizationService.performOptimization(options),
        ).rejects.toThrow();
      });
    });

    describe("optimizeQueries", () => {
      it("should optimize queries successfully", async () => {
        mockQueryOptimizer.optimizeQuery.mockResolvedValue({
          performanceGain: 30.0,
        });

        const result = await databaseOptimizationService.optimizeQueries({});

        expect(result).toHaveProperty("slowQueries");
        expect(result).toHaveProperty("optimizations");
        expect(result).toHaveProperty("estimatedImprovement");
        expect(result).toHaveProperty("timestamp");
        expect(result.estimatedImprovement).toBeGreaterThan(0);
      });
    });

    describe("optimizeIndexes", () => {
      it("should optimize indexes successfully", async () => {
        mockIndexManager.analyzeIndexUsage.mockResolvedValue({
          recommendations: [
            {
              action: "create",
              table: "tasks",
              columns: ["status"],
              options: {},
            },
          ],
        });

        mockIndexManager.createIndex.mockResolvedValue({
          indexName: "idx_tasks_status",
          table: "tasks",
          columns: ["status"],
        });

        const result = await databaseOptimizationService.optimizeIndexes({});

        expect(result).toHaveProperty("analysis");
        expect(result).toHaveProperty("optimizations");
        expect(result).toHaveProperty("timestamp");
        expect(result.optimizations).toBe(1);
      });
    });

    describe("optimizePartitions", () => {
      it("should optimize partitions successfully", async () => {
        mockPartitionManager.managePartitions.mockResolvedValue({
          managementActions: [
            {
              type: "create",
              table: "tasks",
              partitionKey: "created_at",
              strategy: "range",
              options: {},
            },
          ],
        });

        mockPartitionManager.createPartition.mockResolvedValue({
          partitionName: "tasks_2025_01",
          table: "tasks",
          partitionKey: "created_at",
          strategy: "range",
        });

        const result = await databaseOptimizationService.optimizePartitions({
          table: "tasks",
        });

        expect(result).toHaveProperty("recommendations");
        expect(result).toHaveProperty("optimizations");
        expect(result).toHaveProperty("timestamp");
        expect(result.optimizations).toBe(1);
      });
    });

    describe("optimizeMaterializedViews", () => {
      it("should optimize materialized views successfully", async () => {
        const options = {
          views: ["task_performance_summary", "user_activity_summary"],
        };

        mockMaterializedViewManager.refreshMaterializedView.mockResolvedValue({
          name: "task_performance_summary",
          refreshedAt: new Date().toISOString(),
        });

        const result =
          await databaseOptimizationService.optimizeMaterializedViews(options);

        expect(result).toHaveProperty("views");
        expect(result).toHaveProperty("refreshes");
        expect(result).toHaveProperty("timestamp");
        expect(result.views).toBe(2);
        expect(result.refreshes).toBe(2);
      });
    });

    describe("getOptimizationRecommendations", () => {
      it("should get optimization recommendations", async () => {
        mockQueryOptimizer.getOptimizationStats.mockReturnValue({
          averageImprovement: 25.5,
        });

        mockIndexManager.analyzeIndexUsage.mockResolvedValue({
          recommendations: [
            {
              description: "Create index on status column",
              priority: "high",
              estimatedImprovement: 40.0,
            },
          ],
        });

        mockPartitionManager.generatePartitionRecommendations.mockResolvedValue(
          [
            {
              description: "Partition large table",
              priority: "medium",
              estimatedImprovement: 30.0,
            },
          ],
        );

        const result =
          await databaseOptimizationService.getOptimizationRecommendations();

        expect(result).toBeInstanceOf(Array);
        expect(result.length).toBeGreaterThan(0);
        expect(result[0]).toHaveProperty("type");
        expect(result[0]).toHaveProperty("description");
        expect(result[0]).toHaveProperty("priority");
        expect(result[0]).toHaveProperty("estimatedImprovement");
      });
    });

    describe("getOptimizationStatus", () => {
      it("should get optimization status", async () => {
        mockQueryOptimizer.getOptimizationStats.mockReturnValue({
          totalOptimizations: 10,
          averageImprovement: 25.5,
        });

        mockIndexManager.getIndexStats.mockReturnValue({
          totalIndexes: 15,
        });

        mockPartitionManager.getPartitionStats.mockReturnValue({
          totalPartitions: 5,
        });

        mockMaterializedViewManager.getViewStats.mockReturnValue({
          totalViews: 8,
        });

        const result =
          await databaseOptimizationService.getOptimizationStatus();

        expect(result).toHaveProperty("queryOptimizer");
        expect(result).toHaveProperty("indexManager");
        expect(result).toHaveProperty("partitionManager");
        expect(result).toHaveProperty("materializedViewManager");
        expect(result).toHaveProperty("timestamp");
      });
    });

    describe("scheduleOptimization", () => {
      it("should schedule optimization", async () => {
        const schedule = {
          type: "daily",
          time: "02:00",
          enabled: true,
        };

        const result =
          await databaseOptimizationService.scheduleOptimization(schedule);

        expect(result).toHaveProperty("scheduleId");
        expect(result).toHaveProperty("schedule");
        expect(result).toHaveProperty("createdAt");
        expect(result).toHaveProperty("status");
        expect(result.status).toBe("scheduled");
      });
    });

    describe("cancelOptimization", () => {
      it("should cancel optimization", async () => {
        const scheduleId = "opt_123";

        const result =
          await databaseOptimizationService.cancelOptimization(scheduleId);

        expect(result).toHaveProperty("scheduleId");
        expect(result).toHaveProperty("cancelledAt");
        expect(result).toHaveProperty("status");
        expect(result.scheduleId).toBe(scheduleId);
        expect(result.status).toBe("cancelled");
      });
    });
  });

  describe("DatabaseConnection Integration", () => {
    it("should initialize optimization components", async () => {
      // Mock the database connection to avoid actual database calls
      const mockExecute = jest.fn().mockResolvedValue({ rows: [] });

      const mockDatabaseConnection = {
        execute: mockExecute,
        getType: jest.fn(() => "postgresql"),
        getConnection: jest.fn(() => ({})),
        getQueryOptimizer: jest.fn(),
        getIndexManager: jest.fn(),
        getPartitionManager: jest.fn(),
        getMaterializedViewManager: jest.fn(),
        getPerformanceSchema: jest.fn(),
      };

      // Mock the constructor to return our mock
      jest
        .spyOn(DatabaseConnection.prototype, "constructor")
        .mockImplementation(function (config) {
          Object.assign(this, mockDatabaseConnection);
          this.config = config;
          this.isConnected = true;
          this.type = "postgresql";
        });

      const config = {
        type: "postgresql",
        host: "localhost",
        port: 5432,
        database: "test_db",
        username: "test_user",
        password: "test_password",
        optimization: true,
      };

      const dbConnection = new DatabaseConnection(config);

      expect(dbConnection.optimizationEnabled).toBe(true);
      expect(dbConnection.queryOptimizer).toBeNull(); // Will be initialized in connect()
      expect(dbConnection.indexManager).toBeNull();
      expect(dbConnection.partitionManager).toBeNull();
      expect(dbConnection.materializedViewManager).toBeNull();
      expect(dbConnection.performanceSchema).toBeNull();
    });
  });

  describe("Error Handling", () => {
    it("should handle database connection errors", async () => {
      const options = {
        queryOptimization: true,
      };

      mockQueryOptimizer.optimizeQuery.mockRejectedValue(
        new Error("Database connection failed"),
      );

      await expect(
        databaseOptimizationService.performOptimization(options),
      ).rejects.toThrow("Database connection failed");
    });

    it("should handle partial optimization failures", async () => {
      const options = {
        queryOptimization: true,
        indexOptimization: true,
      };

      mockQueryOptimizer.optimizeQuery.mockResolvedValue({
        performanceGain: 25.0,
      });

      mockIndexManager.analyzeIndexUsage.mockRejectedValue(
        new Error("Index analysis failed"),
      );

      await expect(
        databaseOptimizationService.performOptimization(options),
      ).rejects.toThrow("Index analysis failed");
    });
  });

  describe("Performance", () => {
    it("should complete optimization within reasonable time", async () => {
      const options = {
        queryOptimization: true,
        indexOptimization: true,
      };

      mockQueryOptimizer.optimizeQuery.mockResolvedValue({
        performanceGain: 25.0,
      });

      mockIndexManager.analyzeIndexUsage.mockResolvedValue({
        recommendations: [],
      });

      const startTime = Date.now();
      await databaseOptimizationService.performOptimization(options);
      const endTime = Date.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});
