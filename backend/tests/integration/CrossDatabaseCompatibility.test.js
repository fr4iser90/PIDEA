/**
 * Cross-Database Compatibility Integration Tests
 *
 * Tests for cross-database compatibility including SQLite and PostgreSQL
 * support, query translation, type mapping, and feature compatibility.
 */

const DatabaseConnection = require("../../infrastructure/database/DatabaseConnection");
const SQLTranslator = require("../../infrastructure/database/SQLTranslator");
const Logger = require("../../infrastructure/logging/Logger");

describe("Cross-Database Compatibility Integration Tests", () => {
  let sqliteConnection;
  let postgresConnection;
  let sqlTranslator;
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

    // Create SQLite connection
    const sqliteConfig = {
      type: "sqlite",
      database: ":memory:",
    };

    sqliteConnection = new DatabaseConnection(sqliteConfig);
    await sqliteConnection.connect();

    // Create PostgreSQL connection (mocked)
    const postgresConfig = {
      type: "postgresql",
      host: "localhost",
      port: 5432,
      database: "test_db",
      username: "test_user",
      password: "test_password",
    };

    postgresConnection = new DatabaseConnection(postgresConfig);

    // Initialize SQL translator
    sqlTranslator = new SQLTranslator();
  });

  afterEach(async () => {
    if (sqliteConnection) {
      await sqliteConnection.disconnect();
    }
    jest.clearAllMocks();
  });

  describe("Database Type Detection", () => {
    test("should detect SQLite database type", () => {
      expect(sqliteConnection.getType()).toBe("sqlite");
    });

    test("should detect PostgreSQL database type", () => {
      expect(postgresConnection.getType()).toBe("postgresql");
    });

    test("should handle unknown database types", () => {
      const unknownConfig = {
        type: "unknown",
        database: "test",
      };

      const unknownConnection = new DatabaseConnection(unknownConfig);
      expect(unknownConnection.getType()).toBeNull();
    });
  });

  describe("Query Translation", () => {
    test("should translate PostgreSQL queries to SQLite", () => {
      const postgresqlQuery =
        "SELECT * FROM users WHERE id = $1 AND status = $2";
      const params = [1, "active"];

      const result = sqlTranslator.translate(postgresqlQuery, params);

      expect(result.query).toBe(
        "SELECT * FROM users WHERE id = ? AND status = ?",
      );
      expect(result.params).toEqual([1, "active"]);
    });

    test("should translate PostgreSQL functions to SQLite equivalents", () => {
      const postgresqlQuery =
        "SELECT NOW(), EXTRACT(YEAR FROM created_at) FROM users";
      const params = [];

      const result = sqlTranslator.translate(postgresqlQuery, params);

      expect(result.query).toBe(
        "SELECT datetime('now'), strftime('%Y', created_at) FROM users",
      );
      expect(result.params).toEqual([]);
    });

    test("should translate PostgreSQL data types to SQLite", () => {
      const postgresqlQuery =
        "CREATE TABLE users (id SERIAL PRIMARY KEY, name VARCHAR(255), active BOOLEAN)";
      const params = [];

      const result = sqlTranslator.translate(postgresqlQuery, params);

      expect(result.query).toBe(
        "CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, active INTEGER)",
      );
      expect(result.params).toEqual([]);
    });

    test("should handle complex PostgreSQL queries", () => {
      const postgresqlQuery = `
        SELECT u.name, p.title, COUNT(*) as post_count
        FROM users u
        LEFT JOIN posts p ON u.id = p.user_id
        WHERE u.created_at > $1
        GROUP BY u.id, u.name, p.title
        HAVING COUNT(*) > $2
        ORDER BY post_count DESC
        LIMIT $3 OFFSET $4
      `;
      const params = ["2023-01-01", 5, 10, 0];

      const result = sqlTranslator.translate(postgresqlQuery, params);

      expect(result.query).toContain(
        "SELECT u.name, p.title, COUNT(*) as post_count",
      );
      expect(result.query).toContain("FROM users u");
      expect(result.query).toContain("LEFT JOIN posts p ON u.id = p.user_id");
      expect(result.query).toContain("WHERE u.created_at > ?");
      expect(result.query).toContain("GROUP BY u.id, u.name, p.title");
      expect(result.query).toContain("HAVING COUNT(*) > ?");
      expect(result.query).toContain("ORDER BY post_count DESC");
      expect(result.query).toContain("LIMIT ? OFFSET ?");
      expect(result.params).toEqual(["2023-01-01", 5, 10, 0]);
    });
  });

  describe("Data Type Compatibility", () => {
    test("should handle SERIAL type conversion", () => {
      const postgresqlQuery = "CREATE TABLE users (id SERIAL PRIMARY KEY)";
      const result = sqlTranslator.translate(postgresqlQuery, []);

      expect(result.query).toBe(
        "CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT)",
      );
    });

    test("should handle BIGSERIAL type conversion", () => {
      const postgresqlQuery = "CREATE TABLE users (id BIGSERIAL PRIMARY KEY)";
      const result = sqlTranslator.translate(postgresqlQuery, []);

      expect(result.query).toBe(
        "CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT)",
      );
    });

    test("should handle BOOLEAN type conversion", () => {
      const postgresqlQuery = "CREATE TABLE users (active BOOLEAN)";
      const result = sqlTranslator.translate(postgresqlQuery, []);

      expect(result.query).toBe("CREATE TABLE users (active INTEGER)");
    });

    test("should handle VARCHAR type conversion", () => {
      const postgresqlQuery = "CREATE TABLE users (name VARCHAR(255))";
      const result = sqlTranslator.translate(postgresqlQuery, []);

      expect(result.query).toBe("CREATE TABLE users (name TEXT)");
    });

    test("should handle TEXT type (no conversion needed)", () => {
      const postgresqlQuery = "CREATE TABLE users (description TEXT)";
      const result = sqlTranslator.translate(postgresqlQuery, []);

      expect(result.query).toBe("CREATE TABLE users (description TEXT)");
    });
  });

  describe("Function Compatibility", () => {
    test("should translate NOW() function", () => {
      const postgresqlQuery = "SELECT NOW()";
      const result = sqlTranslator.translate(postgresqlQuery, []);

      expect(result.query).toBe("SELECT datetime('now')");
    });

    test("should translate CURRENT_TIMESTAMP function", () => {
      const postgresqlQuery = "SELECT CURRENT_TIMESTAMP";
      const result = sqlTranslator.translate(postgresqlQuery, []);

      expect(result.query).toBe("SELECT datetime('now')");
    });

    test("should translate EXTRACT function", () => {
      const postgresqlQuery = "SELECT EXTRACT(YEAR FROM created_at) FROM users";
      const result = sqlTranslator.translate(postgresqlQuery, []);

      expect(result.query).toBe("SELECT strftime('%Y', created_at) FROM users");
    });

    test("should translate EXTRACT with different fields", () => {
      const testCases = [
        {
          input: "EXTRACT(MONTH FROM created_at)",
          expected: "strftime('%m', created_at)",
        },
        {
          input: "EXTRACT(DAY FROM created_at)",
          expected: "strftime('%d', created_at)",
        },
        {
          input: "EXTRACT(HOUR FROM created_at)",
          expected: "strftime('%H', created_at)",
        },
        {
          input: "EXTRACT(MINUTE FROM created_at)",
          expected: "strftime('%M', created_at)",
        },
        {
          input: "EXTRACT(SECOND FROM created_at)",
          expected: "strftime('%S', created_at)",
        },
      ];

      testCases.forEach(({ input, expected }) => {
        const postgresqlQuery = `SELECT ${input} FROM users`;
        const result = sqlTranslator.translate(postgresqlQuery, []);
        expect(result.query).toBe(`SELECT ${expected} FROM users`);
      });
    });

    test("should translate string functions", () => {
      const testCases = [
        { input: "UPPER(name)", expected: "upper(name)" },
        { input: "LOWER(name)", expected: "lower(name)" },
        { input: "LENGTH(name)", expected: "length(name)" },
      ];

      testCases.forEach(({ input, expected }) => {
        const postgresqlQuery = `SELECT ${input} FROM users`;
        const result = sqlTranslator.translate(postgresqlQuery, []);
        expect(result.query).toBe(`SELECT ${expected} FROM users`);
      });
    });
  });

  describe("SQLite-Specific Features", () => {
    test("should handle SQLite-specific syntax", async () => {
      const sqliteQuery = 'SELECT * FROM sqlite_master WHERE type = "table"';
      const result = await sqliteConnection.query(sqliteQuery);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    test("should handle SQLite PRAGMA statements", async () => {
      const pragmaQuery = "PRAGMA table_info(users)";

      // This should not throw an error
      expect(() => {
        sqliteConnection.query(pragmaQuery);
      }).not.toThrow();
    });

    test("should handle SQLite-specific data types", async () => {
      const createTableQuery = `
        CREATE TABLE test_table (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT,
          data BLOB,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;

      await sqliteConnection.execute(createTableQuery);

      const tables = await sqliteConnection.query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='test_table'",
      );
      expect(tables).toHaveLength(1);
    });
  });

  describe("PostgreSQL-Specific Features", () => {
    test("should handle PostgreSQL-specific syntax", () => {
      const postgresqlQuery = "SELECT * FROM pg_tables WHERE schemaname = $1";
      const params = ["public"];

      const result = sqlTranslator.translate(postgresqlQuery, params);

      expect(result.query).toBe("SELECT * FROM pg_tables WHERE schemaname = ?");
      expect(result.params).toEqual(["public"]);
    });

    test("should handle PostgreSQL-specific data types", () => {
      const postgresqlQuery =
        "CREATE TABLE test_table (id SERIAL PRIMARY KEY, data JSONB)";
      const result = sqlTranslator.translate(postgresqlQuery, []);

      expect(result.query).toBe(
        "CREATE TABLE test_table (id INTEGER PRIMARY KEY AUTOINCREMENT, data TEXT)",
      );
    });

    test("should handle PostgreSQL-specific functions", () => {
      const postgresqlQuery = "SELECT pg_size_pretty(pg_database_size($1))";
      const params = ["test_db"];

      const result = sqlTranslator.translate(postgresqlQuery, params);

      expect(result.query).toBe("SELECT pg_size_pretty(pg_database_size(?))");
      expect(result.params).toEqual(["test_db"]);
    });
  });

  describe("Cross-Database Query Execution", () => {
    test("should execute translated queries on SQLite", async () => {
      const postgresqlQuery = "SELECT * FROM users WHERE id = $1";
      const params = [1];

      const translated = sqlTranslator.translate(postgresqlQuery, params);
      const result = await sqliteConnection.query(
        translated.query,
        translated.params,
      );

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    test("should handle parameter binding differences", async () => {
      const postgresqlQuery = "SELECT * FROM users WHERE id = $1 AND name = $2";
      const params = [1, "John"];

      const translated = sqlTranslator.translate(postgresqlQuery, params);

      expect(translated.query).toBe(
        "SELECT * FROM users WHERE id = ? AND name = ?",
      );
      expect(translated.params).toEqual([1, "John"]);
    });

    test("should handle complex translated queries", async () => {
      const postgresqlQuery = `
        SELECT u.name, COUNT(p.id) as post_count
        FROM users u
        LEFT JOIN posts p ON u.id = p.user_id
        GROUP BY u.id, u.name
        HAVING COUNT(p.id) > $1
        ORDER BY post_count DESC
      `;
      const params = [0];

      const translated = sqlTranslator.translate(postgresqlQuery, params);

      expect(translated.query).toContain(
        "SELECT u.name, COUNT(p.id) as post_count",
      );
      expect(translated.query).toContain("FROM users u");
      expect(translated.query).toContain(
        "LEFT JOIN posts p ON u.id = p.user_id",
      );
      expect(translated.query).toContain("GROUP BY u.id, u.name");
      expect(translated.query).toContain("HAVING COUNT(p.id) > ?");
      expect(translated.query).toContain("ORDER BY post_count DESC");
      expect(translated.params).toEqual([0]);
    });
  });

  describe("Error Handling", () => {
    test("should handle translation errors gracefully", () => {
      const invalidQuery = "INVALID SQL SYNTAX";
      const params = [];

      expect(() => {
        sqlTranslator.translate(invalidQuery, params);
      }).not.toThrow();
    });

    test("should handle unsupported PostgreSQL features", () => {
      const unsupportedQuery = "SELECT * FROM users WHERE name ILIKE $1";
      const params = ["%john%"];

      const result = sqlTranslator.translate(unsupportedQuery, params);

      // Should translate ILIKE to LIKE (case-insensitive)
      expect(result.query).toBe("SELECT * FROM users WHERE name LIKE ?");
      expect(result.params).toEqual(["%john%"]);
    });

    test("should handle missing parameter errors", () => {
      const postgresqlQuery =
        "SELECT * FROM users WHERE id = $1 AND status = $2";
      const params = [1]; // Missing second parameter

      const result = sqlTranslator.translate(postgresqlQuery, params);

      expect(result.query).toBe(
        "SELECT * FROM users WHERE id = ? AND status = ?",
      );
      expect(result.params).toEqual([1]);
    });
  });

  describe("Performance Considerations", () => {
    test("should handle large query translation efficiently", () => {
      const largeQuery =
        "SELECT * FROM users WHERE id IN (" +
        Array(1000)
          .fill()
          .map((_, i) => `$${i + 1}`)
          .join(", ") +
        ")";
      const params = Array(1000)
        .fill()
        .map((_, i) => i);

      const startTime = Date.now();
      const result = sqlTranslator.translate(largeQuery, params);
      const endTime = Date.now();

      expect(result.query).toContain("SELECT * FROM users WHERE id IN (");
      expect(result.params).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(100); // Should complete in less than 100ms
    });

    test("should handle repeated translations efficiently", () => {
      const query = "SELECT * FROM users WHERE id = $1";
      const params = [1];

      const startTime = Date.now();
      for (let i = 0; i < 1000; i++) {
        sqlTranslator.translate(query, params);
      }
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100); // Should complete in less than 100ms
    });
  });

  describe("Compatibility Validation", () => {
    test("should validate PostgreSQL query compatibility", () => {
      const compatibleQuery = "SELECT * FROM users WHERE id = $1";
      const incompatibleQuery = "SELECT * FROM users WHERE name ILIKE $1";

      expect(sqlTranslator.isCompatible(compatibleQuery)).toBe(true);
      expect(sqlTranslator.isCompatible(incompatibleQuery)).toBe(false);
    });

    test("should validate data type compatibility", () => {
      const compatibleTypes = ["INTEGER", "TEXT", "REAL"];
      const incompatibleTypes = ["SERIAL", "BIGSERIAL", "JSONB"];

      compatibleTypes.forEach((type) => {
        expect(sqlTranslator.isTypeCompatible(type)).toBe(true);
      });

      incompatibleTypes.forEach((type) => {
        expect(sqlTranslator.isTypeCompatible(type)).toBe(false);
      });
    });

    test("should validate function compatibility", () => {
      const compatibleFunctions = ["COUNT", "SUM", "AVG", "MAX", "MIN"];
      const incompatibleFunctions = ["NOW", "EXTRACT", "ILIKE"];

      compatibleFunctions.forEach((func) => {
        expect(sqlTranslator.isFunctionCompatible(func)).toBe(true);
      });

      incompatibleFunctions.forEach((func) => {
        expect(sqlTranslator.isFunctionCompatible(func)).toBe(false);
      });
    });
  });

  describe("Migration Support", () => {
    test("should support database migration between types", async () => {
      // Create table in SQLite
      const createTableQuery = `
        CREATE TABLE users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;

      await sqliteConnection.execute(createTableQuery);

      // Insert test data
      await sqliteConnection.execute(
        "INSERT INTO users (name, email) VALUES (?, ?)",
        ["John Doe", "john@example.com"],
      );

      // Verify data exists
      const users = await sqliteConnection.query("SELECT * FROM users");
      expect(users).toHaveLength(1);
      expect(users[0].name).toBe("John Doe");
      expect(users[0].email).toBe("john@example.com");
    });

    test("should handle schema differences during migration", () => {
      const sqliteSchema = `
        CREATE TABLE users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT,
          email TEXT
        )
      `;

      const postgresqlSchema = `
        CREATE TABLE users (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255),
          email VARCHAR(255) UNIQUE
        )
      `;

      const translatedSchema = sqlTranslator.translate(postgresqlSchema, []);

      expect(translatedSchema.query).toContain(
        "INTEGER PRIMARY KEY AUTOINCREMENT",
      );
      expect(translatedSchema.query).toContain("TEXT");
    });
  });
});
