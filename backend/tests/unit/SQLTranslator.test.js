/**
 * SQLTranslator Unit Tests
 *
 * Tests for SQL translation system including PostgreSQL to SQLite conversion,
 * query transformation, function mapping, and syntax adaptation.
 */

const SQLTranslator = require("../../infrastructure/database/SQLTranslator");
const Logger = require("../../infrastructure/logging/Logger");

describe("SQLTranslator Unit Tests", () => {
  let sqlTranslator;
  let mockLogger;

  beforeEach(() => {
    // Mock logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    jest.spyOn(Logger, "Logger").mockImplementation(() => mockLogger);

    sqlTranslator = new SQLTranslator();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Constructor", () => {
    test("should create instance with default configuration", () => {
      expect(sqlTranslator).toBeDefined();
      expect(sqlTranslator.functionMap).toBeDefined();
      expect(sqlTranslator.typeMap).toBeDefined();
    });

    test("should initialize function mappings", () => {
      expect(sqlTranslator.functionMap).toHaveProperty("NOW");
      expect(sqlTranslator.functionMap).toHaveProperty("CURRENT_TIMESTAMP");
      expect(sqlTranslator.functionMap).toHaveProperty("EXTRACT");
    });

    test("should initialize type mappings", () => {
      expect(sqlTranslator.typeMap).toHaveProperty("SERIAL");
      expect(sqlTranslator.typeMap).toHaveProperty("BIGSERIAL");
      expect(sqlTranslator.typeMap).toHaveProperty("BOOLEAN");
    });
  });

  describe("Basic Query Translation", () => {
    test("should translate simple SELECT query", () => {
      const postgresqlQuery = "SELECT * FROM users WHERE id = $1";
      const params = [1];

      const result = sqlTranslator.translate(postgresqlQuery, params);

      expect(result.query).toBe("SELECT * FROM users WHERE id = ?");
      expect(result.params).toEqual([1]);
    });

    test("should translate SELECT query with multiple parameters", () => {
      const postgresqlQuery =
        "SELECT * FROM users WHERE id = $1 AND status = $2";
      const params = [1, "active"];

      const result = sqlTranslator.translate(postgresqlQuery, params);

      expect(result.query).toBe(
        "SELECT * FROM users WHERE id = ? AND status = ?",
      );
      expect(result.params).toEqual([1, "active"]);
    });

    test("should translate INSERT query", () => {
      const postgresqlQuery = "INSERT INTO users (name, email) VALUES ($1, $2)";
      const params = ["John", "john@example.com"];

      const result = sqlTranslator.translate(postgresqlQuery, params);

      expect(result.query).toBe(
        "INSERT INTO users (name, email) VALUES (?, ?)",
      );
      expect(result.params).toEqual(["John", "john@example.com"]);
    });

    test("should translate UPDATE query", () => {
      const postgresqlQuery = "UPDATE users SET name = $1 WHERE id = $2";
      const params = ["Jane", 1];

      const result = sqlTranslator.translate(postgresqlQuery, params);

      expect(result.query).toBe("UPDATE users SET name = ? WHERE id = ?");
      expect(result.params).toEqual(["Jane", 1]);
    });

    test("should translate DELETE query", () => {
      const postgresqlQuery = "DELETE FROM users WHERE id = $1";
      const params = [1];

      const result = sqlTranslator.translate(postgresqlQuery, params);

      expect(result.query).toBe("DELETE FROM users WHERE id = ?");
      expect(result.params).toEqual([1]);
    });
  });

  describe("Function Translation", () => {
    test("should translate NOW() function", () => {
      const postgresqlQuery = "SELECT NOW()";
      const params = [];

      const result = sqlTranslator.translate(postgresqlQuery, params);

      expect(result.query).toBe("SELECT datetime('now')");
      expect(result.params).toEqual([]);
    });

    test("should translate CURRENT_TIMESTAMP function", () => {
      const postgresqlQuery = "SELECT CURRENT_TIMESTAMP";
      const params = [];

      const result = sqlTranslator.translate(postgresqlQuery, params);

      expect(result.query).toBe("SELECT datetime('now')");
      expect(result.params).toEqual([]);
    });

    test("should translate EXTRACT function", () => {
      const postgresqlQuery = "SELECT EXTRACT(YEAR FROM created_at) FROM users";
      const params = [];

      const result = sqlTranslator.translate(postgresqlQuery, params);

      expect(result.query).toBe("SELECT strftime('%Y', created_at) FROM users");
      expect(result.params).toEqual([]);
    });

    test("should translate EXTRACT with different fields", () => {
      const postgresqlQuery =
        "SELECT EXTRACT(MONTH FROM created_at) FROM users";
      const params = [];

      const result = sqlTranslator.translate(postgresqlQuery, params);

      expect(result.query).toBe("SELECT strftime('%m', created_at) FROM users");
      expect(result.params).toEqual([]);
    });

    test("should translate EXTRACT DAY", () => {
      const postgresqlQuery = "SELECT EXTRACT(DAY FROM created_at) FROM users";
      const params = [];

      const result = sqlTranslator.translate(postgresqlQuery, params);

      expect(result.query).toBe("SELECT strftime('%d', created_at) FROM users");
      expect(result.params).toEqual([]);
    });

    test("should translate LENGTH function", () => {
      const postgresqlQuery = "SELECT LENGTH(name) FROM users";
      const params = [];

      const result = sqlTranslator.translate(postgresqlQuery, params);

      expect(result.query).toBe("SELECT length(name) FROM users");
      expect(result.params).toEqual([]);
    });

    test("should translate UPPER function", () => {
      const postgresqlQuery = "SELECT UPPER(name) FROM users";
      const params = [];

      const result = sqlTranslator.translate(postgresqlQuery, params);

      expect(result.query).toBe("SELECT upper(name) FROM users");
      expect(result.params).toEqual([]);
    });

    test("should translate LOWER function", () => {
      const postgresqlQuery = "SELECT LOWER(name) FROM users";
      const params = [];

      const result = sqlTranslator.translate(postgresqlQuery, params);

      expect(result.query).toBe("SELECT lower(name) FROM users");
      expect(result.params).toEqual([]);
    });
  });

  describe("Type Translation", () => {
    test("should translate SERIAL type", () => {
      const postgresqlQuery = "CREATE TABLE users (id SERIAL PRIMARY KEY)";
      const params = [];

      const result = sqlTranslator.translate(postgresqlQuery, params);

      expect(result.query).toBe(
        "CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT)",
      );
      expect(result.params).toEqual([]);
    });

    test("should translate BIGSERIAL type", () => {
      const postgresqlQuery = "CREATE TABLE users (id BIGSERIAL PRIMARY KEY)";
      const params = [];

      const result = sqlTranslator.translate(postgresqlQuery, params);

      expect(result.query).toBe(
        "CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT)",
      );
      expect(result.params).toEqual([]);
    });

    test("should translate BOOLEAN type", () => {
      const postgresqlQuery = "CREATE TABLE users (active BOOLEAN)";
      const params = [];

      const result = sqlTranslator.translate(postgresqlQuery, params);

      expect(result.query).toBe("CREATE TABLE users (active INTEGER)");
      expect(result.params).toEqual([]);
    });

    test("should translate TEXT type", () => {
      const postgresqlQuery = "CREATE TABLE users (description TEXT)";
      const params = [];

      const result = sqlTranslator.translate(postgresqlQuery, params);

      expect(result.query).toBe("CREATE TABLE users (description TEXT)");
      expect(result.params).toEqual([]);
    });

    test("should translate VARCHAR type", () => {
      const postgresqlQuery = "CREATE TABLE users (name VARCHAR(255))";
      const params = [];

      const result = sqlTranslator.translate(postgresqlQuery, params);

      expect(result.query).toBe("CREATE TABLE users (name TEXT)");
      expect(result.params).toEqual([]);
    });
  });

  describe("Complex Query Translation", () => {
    test("should translate JOIN query", () => {
      const postgresqlQuery =
        "SELECT u.name, p.title FROM users u JOIN posts p ON u.id = p.user_id WHERE u.id = $1";
      const params = [1];

      const result = sqlTranslator.translate(postgresqlQuery, params);

      expect(result.query).toBe(
        "SELECT u.name, p.title FROM users u JOIN posts p ON u.id = p.user_id WHERE u.id = ?",
      );
      expect(result.params).toEqual([1]);
    });

    test("should translate subquery", () => {
      const postgresqlQuery =
        "SELECT * FROM users WHERE id IN (SELECT user_id FROM posts WHERE status = $1)";
      const params = ["published"];

      const result = sqlTranslator.translate(postgresqlQuery, params);

      expect(result.query).toBe(
        "SELECT * FROM users WHERE id IN (SELECT user_id FROM posts WHERE status = ?)",
      );
      expect(result.params).toEqual(["published"]);
    });

    test("should translate GROUP BY query", () => {
      const postgresqlQuery =
        "SELECT status, COUNT(*) FROM users GROUP BY status";
      const params = [];

      const result = sqlTranslator.translate(postgresqlQuery, params);

      expect(result.query).toBe(
        "SELECT status, COUNT(*) FROM users GROUP BY status",
      );
      expect(result.params).toEqual([]);
    });

    test("should translate ORDER BY query", () => {
      const postgresqlQuery =
        "SELECT * FROM users ORDER BY name ASC, created_at DESC";
      const params = [];

      const result = sqlTranslator.translate(postgresqlQuery, params);

      expect(result.query).toBe(
        "SELECT * FROM users ORDER BY name ASC, created_at DESC",
      );
      expect(result.params).toEqual([]);
    });

    test("should translate LIMIT and OFFSET", () => {
      const postgresqlQuery = "SELECT * FROM users LIMIT $1 OFFSET $2";
      const params = [10, 20];

      const result = sqlTranslator.translate(postgresqlQuery, params);

      expect(result.query).toBe("SELECT * FROM users LIMIT ? OFFSET ?");
      expect(result.params).toEqual([10, 20]);
    });
  });

  describe("Error Handling", () => {
    test("should handle empty query gracefully", () => {
      const result = sqlTranslator.translate("", []);

      expect(result.query).toBe("");
      expect(result.params).toEqual([]);
    });

    test("should handle null query gracefully", () => {
      const result = sqlTranslator.translate(null, []);

      expect(result.query).toBe("");
      expect(result.params).toEqual([]);
    });

    test("should handle undefined query gracefully", () => {
      const result = sqlTranslator.translate(undefined, []);

      expect(result.query).toBe("");
      expect(result.params).toEqual([]);
    });

    test("should handle missing parameters gracefully", () => {
      const postgresqlQuery = "SELECT * FROM users WHERE id = $1";
      const params = []; // Missing parameter

      const result = sqlTranslator.translate(postgresqlQuery, params);

      expect(result.query).toBe("SELECT * FROM users WHERE id = ?");
      expect(result.params).toEqual([]);
    });

    test("should handle extra parameters gracefully", () => {
      const postgresqlQuery = "SELECT * FROM users";
      const params = [1, 2, 3]; // Extra parameters

      const result = sqlTranslator.translate(postgresqlQuery, params);

      expect(result.query).toBe("SELECT * FROM users");
      expect(result.params).toEqual([]);
    });
  });

  describe("Edge Cases", () => {
    test("should handle queries with comments", () => {
      const postgresqlQuery =
        "SELECT * FROM users -- This is a comment\nWHERE id = $1";
      const params = [1];

      const result = sqlTranslator.translate(postgresqlQuery, params);

      expect(result.query).toBe(
        "SELECT * FROM users -- This is a comment\nWHERE id = ?",
      );
      expect(result.params).toEqual([1]);
    });

    test("should handle queries with string literals containing $", () => {
      const postgresqlQuery =
        "SELECT * FROM users WHERE name = $1 AND description = 'Price: $100'";
      const params = ["John"];

      const result = sqlTranslator.translate(postgresqlQuery, params);

      expect(result.query).toBe(
        "SELECT * FROM users WHERE name = ? AND description = 'Price: $100'",
      );
      expect(result.params).toEqual(["John"]);
    });

    test("should handle queries with escaped parameters", () => {
      const postgresqlQuery =
        "SELECT * FROM users WHERE name = $1 AND description = '\\$100'";
      const params = ["John"];

      const result = sqlTranslator.translate(postgresqlQuery, params);

      expect(result.query).toBe(
        "SELECT * FROM users WHERE name = ? AND description = '\\$100'",
      );
      expect(result.params).toEqual(["John"]);
    });

    test("should handle case-insensitive function names", () => {
      const postgresqlQuery = "SELECT now() FROM users";
      const params = [];

      const result = sqlTranslator.translate(postgresqlQuery, params);

      expect(result.query).toBe("SELECT datetime('now') FROM users");
      expect(result.params).toEqual([]);
    });

    test("should handle nested function calls", () => {
      const postgresqlQuery = "SELECT UPPER(LOWER(name)) FROM users";
      const params = [];

      const result = sqlTranslator.translate(postgresqlQuery, params);

      expect(result.query).toBe("SELECT upper(lower(name)) FROM users");
      expect(result.params).toEqual([]);
    });
  });

  describe("Performance", () => {
    test("should handle large queries efficiently", () => {
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

  describe("Custom Function Mapping", () => {
    test("should allow custom function mappings", () => {
      sqlTranslator.addFunctionMapping("CUSTOM_FUNC", "custom_func");

      const postgresqlQuery = "SELECT CUSTOM_FUNC(name) FROM users";
      const params = [];

      const result = sqlTranslator.translate(postgresqlQuery, params);

      expect(result.query).toBe("SELECT custom_func(name) FROM users");
      expect(result.params).toEqual([]);
    });

    test("should override existing function mappings", () => {
      sqlTranslator.addFunctionMapping("NOW", "custom_now");

      const postgresqlQuery = "SELECT NOW() FROM users";
      const params = [];

      const result = sqlTranslator.translate(postgresqlQuery, params);

      expect(result.query).toBe("SELECT custom_now() FROM users");
      expect(result.params).toEqual([]);
    });
  });

  describe("Validation", () => {
    test("should validate parameter count matches placeholders", () => {
      const postgresqlQuery =
        "SELECT * FROM users WHERE id = $1 AND status = $2";
      const params = [1]; // Missing one parameter

      // Should not throw error but log warning
      const result = sqlTranslator.translate(postgresqlQuery, params);

      expect(result.query).toBe(
        "SELECT * FROM users WHERE id = ? AND status = ?",
      );
      expect(result.params).toEqual([1]);
    });

    test("should handle malformed parameter references", () => {
      const postgresqlQuery =
        "SELECT * FROM users WHERE id = $1 AND status = $3"; // Missing $2
      const params = [1, "active"];

      const result = sqlTranslator.translate(postgresqlQuery, params);

      expect(result.query).toBe(
        "SELECT * FROM users WHERE id = ? AND status = ?",
      );
      expect(result.params).toEqual([1, "active"]);
    });
  });
});
