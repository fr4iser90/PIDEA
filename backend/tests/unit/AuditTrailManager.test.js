/**
 * AuditTrailManager Unit Tests
 *
 * Tests for audit trail management including audit logging,
 * trail tracking, data integrity, and compliance features.
 */

const AuditTrailManager = require("../../infrastructure/database/AuditTrailManager");
const Logger = require("../../infrastructure/logging/Logger");

describe("AuditTrailManager Unit Tests", () => {
  let auditTrailManager;
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

    auditTrailManager = new AuditTrailManager(mockDatabaseConnection);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Constructor", () => {
    test("should create instance with database connection", () => {
      expect(auditTrailManager.databaseConnection).toBe(mockDatabaseConnection);
      expect(auditTrailManager.auditTableName).toBe("audit_trail");
      expect(auditTrailManager.enabled).toBe(true);
    });

    test("should handle null database connection gracefully", () => {
      expect(() => {
        new AuditTrailManager(null);
      }).not.toThrow();
    });

    test("should accept custom configuration", () => {
      const config = {
        auditTableName: "custom_audit",
        enabled: false,
        logLevel: "debug",
      };

      const manager = new AuditTrailManager(mockDatabaseConnection, config);

      expect(manager.auditTableName).toBe("custom_audit");
      expect(manager.enabled).toBe(false);
    });
  });

  describe("Initialization", () => {
    test("should initialize audit trail table", async () => {
      mockDatabaseConnection.execute.mockResolvedValue({ changes: 1 });

      await auditTrailManager.initialize();

      expect(mockDatabaseConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining("CREATE TABLE IF NOT EXISTS audit_trail"),
      );
    });

    test("should handle initialization errors gracefully", async () => {
      const error = new Error("Initialization failed");
      mockDatabaseConnection.execute.mockRejectedValue(error);

      await expect(auditTrailManager.initialize()).rejects.toThrow(
        "Initialization failed",
      );
    });

    test("should create indexes for performance", async () => {
      mockDatabaseConnection.execute.mockResolvedValue({ changes: 1 });

      await auditTrailManager.initialize();

      expect(mockDatabaseConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining("CREATE INDEX IF NOT EXISTS"),
      );
    });
  });

  describe("Audit Logging", () => {
    beforeEach(async () => {
      mockDatabaseConnection.execute.mockResolvedValue({ changes: 1 });
      await auditTrailManager.initialize();
    });

    test("should log INSERT operation", async () => {
      const auditData = {
        tableName: "users",
        operation: "INSERT",
        recordId: "123",
        oldValues: null,
        newValues: { name: "John", email: "john@example.com" },
        userId: "me",
        timestamp: new Date().toISOString(),
      };

      mockDatabaseConnection.execute.mockResolvedValue({ changes: 1 });

      await auditTrailManager.logOperation(auditData);

      expect(mockDatabaseConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO audit_trail"),
        expect.arrayContaining([
          auditData.tableName,
          auditData.operation,
          auditData.recordId,
          JSON.stringify(auditData.oldValues),
          JSON.stringify(auditData.newValues),
          auditData.userId,
          auditData.timestamp,
        ]),
      );
    });

    test("should log UPDATE operation", async () => {
      const auditData = {
        tableName: "users",
        operation: "UPDATE",
        recordId: "123",
        oldValues: { name: "John", email: "john@example.com" },
        newValues: { name: "Jane", email: "jane@example.com" },
        userId: "me",
        timestamp: new Date().toISOString(),
      };

      mockDatabaseConnection.execute.mockResolvedValue({ changes: 1 });

      await auditTrailManager.logOperation(auditData);

      expect(mockDatabaseConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO audit_trail"),
        expect.arrayContaining([
          auditData.tableName,
          auditData.operation,
          auditData.recordId,
          JSON.stringify(auditData.oldValues),
          JSON.stringify(auditData.newValues),
          auditData.userId,
          auditData.timestamp,
        ]),
      );
    });

    test("should log DELETE operation", async () => {
      const auditData = {
        tableName: "users",
        operation: "DELETE",
        recordId: "123",
        oldValues: { name: "John", email: "john@example.com" },
        newValues: null,
        userId: "me",
        timestamp: new Date().toISOString(),
      };

      mockDatabaseConnection.execute.mockResolvedValue({ changes: 1 });

      await auditTrailManager.logOperation(auditData);

      expect(mockDatabaseConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO audit_trail"),
        expect.arrayContaining([
          auditData.tableName,
          auditData.operation,
          auditData.recordId,
          JSON.stringify(auditData.oldValues),
          JSON.stringify(auditData.newValues),
          auditData.userId,
          auditData.timestamp,
        ]),
      );
    });

    test("should handle missing required fields gracefully", async () => {
      const auditData = {
        tableName: "users",
        operation: "INSERT",
        // Missing required fields
      };

      await expect(auditTrailManager.logOperation(auditData)).rejects.toThrow();
    });

    test("should skip logging when disabled", async () => {
      auditTrailManager.enabled = false;

      const auditData = {
        tableName: "users",
        operation: "INSERT",
        recordId: "123",
        oldValues: null,
        newValues: { name: "John" },
        userId: "me",
        timestamp: new Date().toISOString(),
      };

      await auditTrailManager.logOperation(auditData);

      expect(mockDatabaseConnection.execute).not.toHaveBeenCalled();
    });
  });

  describe("Audit Trail Queries", () => {
    beforeEach(async () => {
      mockDatabaseConnection.execute.mockResolvedValue({ changes: 1 });
      await auditTrailManager.initialize();
    });

    test("should get audit trail for specific record", async () => {
      const recordId = "123";
      const mockAuditTrail = [
        {
          id: 1,
          table_name: "users",
          operation: "INSERT",
          record_id: recordId,
          old_values: null,
          new_values: '{"name":"John"}',
          user_id: "user123",
          timestamp: "2023-01-01T00:00:00Z",
        },
      ];

      mockDatabaseConnection.query.mockResolvedValue(mockAuditTrail);

      const result = await auditTrailManager.getAuditTrailForRecord(
        "users",
        recordId,
      );

      expect(result).toEqual(mockAuditTrail);
      expect(mockDatabaseConnection.query).toHaveBeenCalledWith(
        expect.stringContaining(
          "SELECT * FROM audit_trail WHERE table_name = ? AND record_id = ?",
        ),
        ["users", recordId],
      );
    });

    test("should get audit trail for specific table", async () => {
      const tableName = "users";
      const mockAuditTrail = [
        {
          id: 1,
          table_name: tableName,
          operation: "INSERT",
          record_id: "123",
          old_values: null,
          new_values: '{"name":"John"}',
          user_id: "user123",
          timestamp: "2023-01-01T00:00:00Z",
        },
      ];

      mockDatabaseConnection.query.mockResolvedValue(mockAuditTrail);

      const result = await auditTrailManager.getAuditTrailForTable(tableName);

      expect(result).toEqual(mockAuditTrail);
      expect(mockDatabaseConnection.query).toHaveBeenCalledWith(
        expect.stringContaining(
          "SELECT * FROM audit_trail WHERE table_name = ?",
        ),
        [tableName],
      );
    });

    test("should get audit trail for specific user", async () => {
      const userId = "user123";
      const mockAuditTrail = [
        {
          id: 1,
          table_name: "users",
          operation: "INSERT",
          record_id: "123",
          old_values: null,
          new_values: '{"name":"John"}',
          user_id: userId,
          timestamp: "2023-01-01T00:00:00Z",
        },
      ];

      mockDatabaseConnection.query.mockResolvedValue(mockAuditTrail);

      const result = await auditTrailManager.getAuditTrailForUser(userId);

      expect(result).toEqual(mockAuditTrail);
      expect(mockDatabaseConnection.query).toHaveBeenCalledWith(
        expect.stringContaining("SELECT * FROM audit_trail WHERE user_id = ?"),
        [userId],
      );
    });

    test("should get audit trail with date range", async () => {
      const startDate = "2023-01-01T00:00:00Z";
      const endDate = "2023-12-31T23:59:59Z";
      const mockAuditTrail = [
        {
          id: 1,
          table_name: "users",
          operation: "INSERT",
          record_id: "123",
          old_values: null,
          new_values: '{"name":"John"}',
          user_id: "user123",
          timestamp: "2023-06-01T00:00:00Z",
        },
      ];

      mockDatabaseConnection.query.mockResolvedValue(mockAuditTrail);

      const result = await auditTrailManager.getAuditTrailByDateRange(
        startDate,
        endDate,
      );

      expect(result).toEqual(mockAuditTrail);
      expect(mockDatabaseConnection.query).toHaveBeenCalledWith(
        expect.stringContaining(
          "SELECT * FROM audit_trail WHERE timestamp BETWEEN ? AND ?",
        ),
        [startDate, endDate],
      );
    });

    test("should get audit trail with pagination", async () => {
      const mockAuditTrail = [
        {
          id: 1,
          table_name: "users",
          operation: "INSERT",
          record_id: "123",
          old_values: null,
          new_values: '{"name":"John"}',
          user_id: "user123",
          timestamp: "2023-01-01T00:00:00Z",
        },
      ];

      mockDatabaseConnection.query.mockResolvedValue(mockAuditTrail);

      const result = await auditTrailManager.getAuditTrailWithPagination(10, 0);

      expect(result).toEqual(mockAuditTrail);
      expect(mockDatabaseConnection.query).toHaveBeenCalledWith(
        expect.stringContaining(
          "SELECT * FROM audit_trail ORDER BY timestamp DESC LIMIT ? OFFSET ?",
        ),
        [10, 0],
      );
    });
  });

  describe("Data Integrity", () => {
    beforeEach(async () => {
      mockDatabaseConnection.execute.mockResolvedValue({ changes: 1 });
      await auditTrailManager.initialize();
    });

    test("should validate audit data integrity", async () => {
      const auditData = {
        tableName: "users",
        operation: "INSERT",
        recordId: "123",
        oldValues: null,
        newValues: { name: "John", email: "john@example.com" },
        userId: "me",
        timestamp: new Date().toISOString(),
      };

      const isValid = auditTrailManager.validateAuditData(auditData);

      expect(isValid).toBe(true);
    });

    test("should detect invalid audit data", async () => {
      const invalidAuditData = {
        tableName: "", // Invalid: empty table name
        operation: "INVALID", // Invalid: unsupported operation
        recordId: null, // Invalid: null record ID
        oldValues: null,
        newValues: null,
        userId: null,
        timestamp: "invalid-date", // Invalid: malformed timestamp
      };

      const isValid = auditTrailManager.validateAuditData(invalidAuditData);

      expect(isValid).toBe(false);
    });

    test("should detect tampering attempts", async () => {
      const tamperedAuditData = {
        tableName: "users",
        operation: "INSERT",
        recordId: "123",
        oldValues: null,
        newValues: { name: "John", email: "john@example.com" },
        userId: "me",
        timestamp: new Date().toISOString(),
        tamperFlag: true, // Suspicious field
      };

      const isValid = auditTrailManager.validateAuditData(tamperedAuditData);

      expect(isValid).toBe(false);
    });
  });

  describe("Compliance Features", () => {
    beforeEach(async () => {
      mockDatabaseConnection.execute.mockResolvedValue({ changes: 1 });
      await auditTrailManager.initialize();
    });

    test("should generate compliance report", async () => {
      const mockData = [
        { operation: "INSERT", count: 100 },
        { operation: "UPDATE", count: 50 },
        { operation: "DELETE", count: 10 },
      ];

      mockDatabaseConnection.query.mockResolvedValue(mockData);

      const report = await auditTrailManager.generateComplianceReport();

      expect(report).toBeDefined();
      expect(mockDatabaseConnection.query).toHaveBeenCalledWith(
        expect.stringContaining(
          "SELECT operation, COUNT(*) as count FROM audit_trail",
        ),
      );
    });

    test("should check data retention compliance", async () => {
      const retentionDays = 365;
      const mockExpiredRecords = [
        { id: 1, timestamp: "2022-01-01T00:00:00Z" },
        { id: 2, timestamp: "2022-06-01T00:00:00Z" },
      ];

      mockDatabaseConnection.query.mockResolvedValue(mockExpiredRecords);

      const expiredCount =
        await auditTrailManager.checkDataRetentionCompliance(retentionDays);

      expect(expiredCount).toBe(2);
      expect(mockDatabaseConnection.query).toHaveBeenCalledWith(
        expect.stringContaining(
          "SELECT id, timestamp FROM audit_trail WHERE timestamp < ?",
        ),
        expect.any(Array),
      );
    });

    test("should purge expired audit records", async () => {
      const retentionDays = 365;
      mockDatabaseConnection.execute.mockResolvedValue({ changes: 10 });

      const purgedCount =
        await auditTrailManager.purgeExpiredRecords(retentionDays);

      expect(purgedCount).toBe(10);
      expect(mockDatabaseConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM audit_trail WHERE timestamp < ?"),
        expect.any(Array),
      );
    });
  });

  describe("Performance", () => {
    beforeEach(async () => {
      mockDatabaseConnection.execute.mockResolvedValue({ changes: 1 });
      await auditTrailManager.initialize();
    });

    test("should handle high-volume audit logging efficiently", async () => {
      const auditData = {
        tableName: "users",
        operation: "INSERT",
        recordId: "123",
        oldValues: null,
        newValues: { name: "John" },
        userId: "me",
        timestamp: new Date().toISOString(),
      };

      mockDatabaseConnection.execute.mockResolvedValue({ changes: 1 });

      const startTime = Date.now();
      const promises = Array(1000)
        .fill()
        .map(() => auditTrailManager.logOperation(auditData));
      await Promise.all(promises);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete in less than 1 second
    });

    test("should handle large audit trail queries efficiently", async () => {
      const mockAuditTrail = Array(10000)
        .fill()
        .map((_, i) => ({
          id: i,
          table_name: "users",
          operation: "INSERT",
          record_id: i.toString(),
          old_values: null,
          new_values: `{"name":"User${i}"}`,
          user_id: "user123",
          timestamp: new Date().toISOString(),
        }));

      mockDatabaseConnection.query.mockResolvedValue(mockAuditTrail);

      const startTime = Date.now();
      const result = await auditTrailManager.getAuditTrailForTable("users");
      const endTime = Date.now();

      expect(result).toHaveLength(10000);
      expect(endTime - startTime).toBeLessThan(500); // Should complete in less than 500ms
    });
  });

  describe("Error Handling", () => {
    test("should handle database connection errors gracefully", async () => {
      const error = new Error("Database connection failed");
      mockDatabaseConnection.execute.mockRejectedValue(error);

      await expect(auditTrailManager.initialize()).rejects.toThrow(
        "Database connection failed",
      );
    });

    test("should handle audit logging errors gracefully", async () => {
      mockDatabaseConnection.execute.mockResolvedValue({ changes: 1 });
      await auditTrailManager.initialize();

      const error = new Error("Audit logging failed");
      mockDatabaseConnection.execute.mockRejectedValue(error);

      const auditData = {
        tableName: "users",
        operation: "INSERT",
        recordId: "123",
        oldValues: null,
        newValues: { name: "John" },
        userId: "me",
        timestamp: new Date().toISOString(),
      };

      await expect(auditTrailManager.logOperation(auditData)).rejects.toThrow(
        "Audit logging failed",
      );
    });

    test("should handle query errors gracefully", async () => {
      mockDatabaseConnection.execute.mockResolvedValue({ changes: 1 });
      await auditTrailManager.initialize();

      const error = new Error("Query failed");
      mockDatabaseConnection.query.mockRejectedValue(error);

      await expect(
        auditTrailManager.getAuditTrailForTable("users"),
      ).rejects.toThrow("Query failed");
    });
  });

  describe("Configuration", () => {
    test("should handle custom audit table name", () => {
      const config = {
        auditTableName: "custom_audit_trail",
        enabled: true,
      };

      const manager = new AuditTrailManager(mockDatabaseConnection, config);

      expect(manager.auditTableName).toBe("custom_audit_trail");
    });

    test("should handle disabled audit trail", () => {
      const config = {
        enabled: false,
      };

      const manager = new AuditTrailManager(mockDatabaseConnection, config);

      expect(manager.enabled).toBe(false);
    });
  });
});
