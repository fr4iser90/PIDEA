/**
 * SoftDeleteManager Unit Tests
 *
 * Tests for soft delete functionality
 */

const SoftDeleteManager = require("@infrastructure/database/SoftDeleteManager");
const { v4: uuidv4 } = require("uuid");

describe("SoftDeleteManager", () => {
  let softDeleteManager;
  let mockDatabaseConnection;

  beforeEach(() => {
    mockDatabaseConnection = {
      execute: jest.fn(),
      query: jest.fn(),
    };
    softDeleteManager = new SoftDeleteManager(mockDatabaseConnection);
  });

  describe("softDelete", () => {
    it("should soft delete a record successfully", async () => {
      const tableName = "tasks";
      const recordId = uuidv4();
      const userId = "user123";
      const reason = "Test deletion";

      // Mock existing record check
      mockDatabaseConnection.query.mockResolvedValueOnce([
        {
          id: recordId,
          title: "Test Task",
          is_deleted: false,
        },
      ]);

      // Mock update and metadata insert
      mockDatabaseConnection.execute
        .mockResolvedValueOnce({}) // Update record
        .mockResolvedValueOnce({}); // Insert metadata

      const recoveryToken = await softDeleteManager.softDelete(
        tableName,
        recordId,
        userId,
        reason,
      );

      expect(recoveryToken).toBeDefined();
      expect(mockDatabaseConnection.execute).toHaveBeenCalledTimes(2);

      // Verify update call
      expect(mockDatabaseConnection.execute).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining("UPDATE tasks"),
        expect.arrayContaining([
          expect.any(String), // deleted_at
          userId,
          recordId,
        ]),
      );

      // Verify metadata insert call
      expect(mockDatabaseConnection.execute).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining("INSERT INTO soft_delete_metadata"),
        expect.arrayContaining([
          expect.any(String), // metadata id
          tableName,
          recordId,
          expect.any(String), // deleted_at
          userId,
          reason,
          JSON.stringify({}),
          recoveryToken,
          null, // expires_at
        ]),
      );
    });

    it("should throw error for invalid table name", async () => {
      const tableName = "invalid_table";
      const recordId = uuidv4();

      await expect(
        softDeleteManager.softDelete(tableName, recordId),
      ).rejects.toThrow("Invalid table name: invalid_table");
    });

    it("should throw error for non-existent record", async () => {
      const tableName = "tasks";
      const recordId = uuidv4();

      mockDatabaseConnection.query.mockResolvedValueOnce([]);

      await expect(
        softDeleteManager.softDelete(tableName, recordId),
      ).rejects.toThrow("Record not found: tasks:" + recordId);
    });

    it("should throw error for already soft deleted record", async () => {
      const tableName = "tasks";
      const recordId = uuidv4();

      mockDatabaseConnection.query.mockResolvedValueOnce([
        {
          id: recordId,
          title: "Test Task",
          is_deleted: true,
        },
      ]);

      await expect(
        softDeleteManager.softDelete(tableName, recordId),
      ).rejects.toThrow("Record already soft deleted: tasks:" + recordId);
    });
  });

  describe("recover", () => {
    it("should recover a soft deleted record successfully", async () => {
      const tableName = "tasks";
      const recordId = uuidv4();
      const recoveryToken = uuidv4();
      const userId = "user123";

      // Mock metadata lookup
      mockDatabaseConnection.query.mockResolvedValueOnce([
        {
          id: uuidv4(),
          table_name: tableName,
          record_id: recordId,
          recovery_token: recoveryToken,
          expires_at: null,
        },
      ]);

      // Mock update and metadata delete
      mockDatabaseConnection.execute
        .mockResolvedValueOnce({}) // Update record
        .mockResolvedValueOnce({}); // Delete metadata

      const result = await softDeleteManager.recover(
        tableName,
        recordId,
        recoveryToken,
        userId,
      );

      expect(result).toBe(true);
      expect(mockDatabaseConnection.execute).toHaveBeenCalledTimes(2);
    });

    it("should throw error for invalid recovery token", async () => {
      const tableName = "tasks";
      const recordId = uuidv4();
      const recoveryToken = uuidv4();

      mockDatabaseConnection.query.mockResolvedValueOnce([]);

      await expect(
        softDeleteManager.recover(tableName, recordId, recoveryToken),
      ).rejects.toThrow("Invalid recovery token for tasks:" + recordId);
    });

    it("should throw error for expired recovery token", async () => {
      const tableName = "tasks";
      const recordId = uuidv4();
      const recoveryToken = uuidv4();

      mockDatabaseConnection.query.mockResolvedValueOnce([
        {
          id: uuidv4(),
          table_name: tableName,
          record_id: recordId,
          recovery_token: recoveryToken,
          expires_at: new Date(Date.now() - 1000).toISOString(), // Expired
        },
      ]);

      await expect(
        softDeleteManager.recover(tableName, recordId, recoveryToken),
      ).rejects.toThrow("Recovery token expired for tasks:" + recordId);
    });
  });

  describe("permanentDelete", () => {
    it("should permanently delete a soft deleted record", async () => {
      const tableName = "tasks";
      const recordId = uuidv4();

      // Mock existing record check
      mockDatabaseConnection.query.mockResolvedValueOnce([
        {
          id: recordId,
          title: "Test Task",
          is_deleted: true,
        },
      ]);

      // Mock delete operations
      mockDatabaseConnection.execute
        .mockResolvedValueOnce({}) // Delete record
        .mockResolvedValueOnce({}); // Delete metadata

      const result = await softDeleteManager.permanentDelete(
        tableName,
        recordId,
      );

      expect(result).toBe(true);
      expect(mockDatabaseConnection.execute).toHaveBeenCalledTimes(2);
    });

    it("should throw error for non-soft-deleted record", async () => {
      const tableName = "tasks";
      const recordId = uuidv4();

      mockDatabaseConnection.query.mockResolvedValueOnce([
        {
          id: recordId,
          title: "Test Task",
          is_deleted: false,
        },
      ]);

      await expect(
        softDeleteManager.permanentDelete(tableName, recordId),
      ).rejects.toThrow("Record not soft deleted: tasks:" + recordId);
    });
  });

  describe("getSoftDeletedRecords", () => {
    it("should retrieve soft deleted records", async () => {
      const tableName = "tasks";
      const mockRecords = [
        {
          id: uuidv4(),
          title: "Deleted Task 1",
          is_deleted: true,
          deleted_at: "2023-01-01T00:00:00.000Z",
          deleted_by: "user123",
          reason: "Test deletion",
          recovery_token: uuidv4(),
          expires_at: null,
        },
      ];

      mockDatabaseConnection.query.mockResolvedValueOnce(mockRecords);

      const records = await softDeleteManager.getSoftDeletedRecords(
        tableName,
        10,
        0,
      );

      expect(records).toHaveLength(1);
      expect(records[0].title).toBe("Deleted Task 1");
      expect(records[0].is_deleted).toBe(true);
    });
  });

  describe("getSoftDeleteMetadata", () => {
    it("should retrieve soft delete metadata", async () => {
      const tableName = "tasks";
      const recordId = uuidv4();
      const mockMetadata = {
        id: uuidv4(),
        table_name: tableName,
        record_id: recordId,
        deleted_at: "2023-01-01T00:00:00.000Z",
        deleted_by: "user123",
        reason: "Test deletion",
        metadata: JSON.stringify({ source: "test" }),
        recovery_token: uuidv4(),
        expires_at: null,
      };

      mockDatabaseConnection.query.mockResolvedValueOnce([mockMetadata]);

      const metadata = await softDeleteManager.getSoftDeleteMetadata(
        tableName,
        recordId,
      );

      expect(metadata).toBeDefined();
      expect(metadata.tableName).toBe(tableName);
      expect(metadata.recordId).toBe(recordId);
      expect(metadata.deletedBy).toBe("user123");
      expect(metadata.metadata).toEqual({ source: "test" });
    });

    it("should return null when no metadata exists", async () => {
      const tableName = "tasks";
      const recordId = uuidv4();

      mockDatabaseConnection.query.mockResolvedValueOnce([]);

      const metadata = await softDeleteManager.getSoftDeleteMetadata(
        tableName,
        recordId,
      );

      expect(metadata).toBeNull();
    });
  });

  describe("cleanupExpiredRecords", () => {
    it("should clean up expired records", async () => {
      const tableName = "tasks";
      const beforeDate = new Date();
      const mockExpiredRecords = [
        { table_name: tableName, record_id: uuidv4() },
        { table_name: tableName, record_id: uuidv4() },
      ];

      mockDatabaseConnection.query.mockResolvedValueOnce(mockExpiredRecords);
      mockDatabaseConnection.execute.mockResolvedValue({});

      const cleanedCount = await softDeleteManager.cleanupExpiredRecords(
        tableName,
        beforeDate,
      );

      expect(cleanedCount).toBe(2);
      expect(mockDatabaseConnection.execute).toHaveBeenCalledTimes(2);
    });
  });

  describe("getSoftDeleteStatistics", () => {
    it("should retrieve soft delete statistics", async () => {
      const mockStats = [
        {
          table_name: "tasks",
          total_soft_deleted: 5,
          expired_count: 2,
          first_deletion: "2023-01-01T00:00:00.000Z",
          last_deletion: "2023-12-31T23:59:59.000Z",
        },
      ];

      mockDatabaseConnection.query.mockResolvedValueOnce(mockStats);

      const stats = await softDeleteManager.getSoftDeleteStatistics();

      expect(stats).toHaveLength(1);
      expect(stats[0].table_name).toBe("tasks");
      expect(stats[0].total_soft_deleted).toBe(5);
    });
  });

  describe("isSoftDeleted", () => {
    it("should return true for soft deleted record", async () => {
      const tableName = "tasks";
      const recordId = uuidv4();

      mockDatabaseConnection.query.mockResolvedValueOnce([
        {
          id: recordId,
          title: "Test Task",
          is_deleted: true,
        },
      ]);

      const isDeleted = await softDeleteManager.isSoftDeleted(
        tableName,
        recordId,
      );

      expect(isDeleted).toBe(true);
    });

    it("should return false for non-soft-deleted record", async () => {
      const tableName = "tasks";
      const recordId = uuidv4();

      mockDatabaseConnection.query.mockResolvedValueOnce([
        {
          id: recordId,
          title: "Test Task",
          is_deleted: false,
        },
      ]);

      const isDeleted = await softDeleteManager.isSoftDeleted(
        tableName,
        recordId,
      );

      expect(isDeleted).toBe(false);
    });

    it("should return false for non-existent record", async () => {
      const tableName = "tasks";
      const recordId = uuidv4();

      mockDatabaseConnection.query.mockResolvedValueOnce([]);

      const isDeleted = await softDeleteManager.isSoftDeleted(
        tableName,
        recordId,
      );

      expect(isDeleted).toBe(false);
    });
  });

  describe("isValidTableName", () => {
    it("should validate allowed table names", () => {
      expect(softDeleteManager.isValidTableName("tasks")).toBe(true);
      expect(softDeleteManager.isValidTableName("projects")).toBe(true);
      expect(softDeleteManager.isValidTableName("users")).toBe(true);
    });

    it("should reject invalid table names", () => {
      expect(softDeleteManager.isValidTableName("invalid_table")).toBe(false);
      expect(softDeleteManager.isValidTableName("")).toBe(false);
      expect(softDeleteManager.isValidTableName(null)).toBe(false);
    });
  });
});
