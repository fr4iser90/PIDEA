/**
 * SQLTranslator Unit Tests
 * Comprehensive test suite for PostgreSQL to SQLite translation
 */
const SQLTranslator = require('@infrastructure/database/SQLTranslator');

describe('SQLTranslator', () => {
  let translator;

  beforeEach(() => {
    translator = new SQLTranslator();
  });

  afterEach(() => {
    translator.clearCache();
  });

  describe('Constructor', () => {
    test('should initialize with empty cache', () => {
      expect(translator.translationCache).toBeInstanceOf(Map);
      expect(translator.translationCache.size).toBe(0);
      expect(translator.cacheHits).toBe(0);
      expect(translator.cacheMisses).toBe(0);
    });
  });

  describe('translate()', () => {
    test('should translate basic PostgreSQL query with parameters', () => {
      const postgresSQL = 'SELECT * FROM users WHERE id = $1 AND name = $2';
      const params = ['user123', 'John'];

      const result = translator.translate(postgresSQL, params);

      expect(result.sql).toBe('SELECT * FROM users WHERE id = ? AND name = ?');
      expect(result.params).toEqual(['user123', 'John']);
      expect(result.originalSQL).toBe(postgresSQL);
      expect(result.originalParams).toEqual(params);
    });

    test('should handle empty parameters array', () => {
      const postgresSQL = 'SELECT * FROM users';
      const params = [];

      const result = translator.translate(postgresSQL, params);

      expect(result.sql).toBe('SELECT * FROM users');
      expect(result.params).toEqual([]);
    });

    test('should handle no parameters', () => {
      const postgresSQL = 'SELECT * FROM users';

      const result = translator.translate(postgresSQL);

      expect(result.sql).toBe('SELECT * FROM users');
      expect(result.params).toEqual([]);
    });

    test('should throw error for invalid SQL', () => {
      expect(() => translator.translate(null)).toThrow('Invalid SQL query provided to translator');
      expect(() => translator.translate(undefined)).toThrow('Invalid SQL query provided to translator');
      expect(() => translator.translate(123)).toThrow('Invalid SQL query provided to translator');
      expect(() => translator.translate('')).toThrow('Invalid SQL query provided to translator');
    });

    test('should handle complex PostgreSQL query', () => {
      const postgresSQL = `
        INSERT INTO tasks (id, title, description, created_at, is_completed)
        VALUES ($1, $2, $3, NOW(), $4)
        RETURNING id, title, created_at
      `;
      const params = ['task123', 'Test Task', 'Description', true];

      const result = translator.translate(postgresSQL, params);

      expect(result.sql).toContain('INSERT INTO tasks (id, title, description, created_at, is_completed)');
      expect(result.sql).toContain('VALUES (?, ?, ?, datetime(\'now\'), ?)');
      expect(result.sql).toContain('RETURNING id, title, created_at');
      expect(result.params).toEqual(['task123', 'Test Task', 'Description', 1]);
    });
  });

  describe('Parameter Placeholder Conversion', () => {
    test('should convert $1, $2, $3 to ?, ?, ?', () => {
      const postgresSQL = 'SELECT * FROM table WHERE a = $1 AND b = $2 AND c = $3';
      const result = translator.translate(postgresSQL, ['a', 'b', 'c']);
      
      expect(result.sql).toBe('SELECT * FROM table WHERE a = ? AND b = ? AND c = ?');
    });

    test('should handle single parameter', () => {
      const postgresSQL = 'SELECT * FROM table WHERE id = $1';
      const result = translator.translate(postgresSQL, ['test']);
      
      expect(result.sql).toBe('SELECT * FROM table WHERE id = ?');
    });

    test('should handle double-digit parameters', () => {
      const postgresSQL = 'SELECT * FROM table WHERE a = $1 AND b = $10 AND c = $99';
      const result = translator.translate(postgresSQL, ['a', 'b', 'c']);
      
      expect(result.sql).toBe('SELECT * FROM table WHERE a = ? AND b = ? AND c = ?');
    });

    test('should not affect non-parameter dollar signs', () => {
      const postgresSQL = 'SELECT price * 1.1 FROM products WHERE id = $1';
      const result = translator.translate(postgresSQL, ['prod123']);
      
      expect(result.sql).toBe('SELECT price * 1.1 FROM products WHERE id = ?');
    });
  });

  describe('Function Conversion', () => {
    test('should convert uuid_generate_v4()::text', () => {
      const postgresSQL = 'INSERT INTO users (id) VALUES (uuid_generate_v4()::text)';
      const result = translator.translate(postgresSQL);
      
      expect(result.sql).toContain('lower(hex(randomblob(4)))');
      expect(result.sql).not.toContain('uuid_generate_v4()::text');
    });

    test('should convert NOW() to datetime(\'now\')', () => {
      const postgresSQL = 'INSERT INTO logs (timestamp) VALUES (NOW())';
      const result = translator.translate(postgresSQL);
      
      expect(result.sql).toBe('INSERT INTO logs (timestamp) VALUES (datetime(\'now\'))');
    });

    test('should convert CURRENT_TIMESTAMP to datetime(\'now\')', () => {
      const postgresSQL = 'INSERT INTO logs (timestamp) VALUES (CURRENT_TIMESTAMP)';
      const result = translator.translate(postgresSQL);
      
      expect(result.sql).toBe('INSERT INTO logs (timestamp) VALUES (datetime(\'now\'))');
    });

    test('should handle multiple function conversions', () => {
      const postgresSQL = 'INSERT INTO events (id, created_at) VALUES (uuid_generate_v4()::text, NOW())';
      const result = translator.translate(postgresSQL);
      
      expect(result.sql).toContain('lower(hex(randomblob(4)))');
      expect(result.sql).toContain('datetime(\'now\')');
    });
  });

  describe('Syntax Conversion', () => {
    test('should convert ILIKE to LIKE', () => {
      const postgresSQL = 'SELECT * FROM users WHERE name ILIKE $1';
      const result = translator.translate(postgresSQL, ['%john%']);
      
      expect(result.sql).toBe('SELECT * FROM users WHERE name LIKE ?');
    });

    test('should convert double quotes to backticks', () => {
      const postgresSQL = 'SELECT * FROM "users" WHERE "name" = $1';
      const result = translator.translate(postgresSQL, ['John']);
      
      expect(result.sql).toBe('SELECT * FROM `users` WHERE `name` = ?');
    });

    test('should convert TRUE to 1', () => {
      const postgresSQL = 'SELECT * FROM flags WHERE active = TRUE';
      const result = translator.translate(postgresSQL);
      
      expect(result.sql).toBe('SELECT * FROM flags WHERE active = 1');
    });

    test('should convert FALSE to 0', () => {
      const postgresSQL = 'SELECT * FROM flags WHERE active = FALSE';
      const result = translator.translate(postgresSQL);
      
      expect(result.sql).toBe('SELECT * FROM flags WHERE active = 0');
    });

    test('should handle mixed syntax conversions', () => {
      const postgresSQL = 'SELECT * FROM "users" WHERE "name" ILIKE $1 AND active = TRUE';
      const result = translator.translate(postgresSQL, ['%john%']);
      
      expect(result.sql).toBe('SELECT * FROM `users` WHERE `name` LIKE ? AND active = 1');
    });
  });

  describe('Data Type Conversion', () => {
    test('should convert VARCHAR to TEXT', () => {
      const postgresSQL = 'CREATE TABLE users (name VARCHAR(255))';
      const result = translator.translate(postgresSQL);
      
      expect(result.sql).toBe('CREATE TABLE users (name TEXT)');
    });

    test('should convert TIMESTAMP to TEXT', () => {
      const postgresSQL = 'CREATE TABLE events (created_at TIMESTAMP)';
      const result = translator.translate(postgresSQL);
      
      expect(result.sql).toBe('CREATE TABLE events (created_at TEXT)');
    });

    test('should convert JSON to TEXT', () => {
      const postgresSQL = 'CREATE TABLE config (settings JSON)';
      const result = translator.translate(postgresSQL);
      
      expect(result.sql).toBe('CREATE TABLE config (settings TEXT)');
    });

    test('should convert UUID to TEXT', () => {
      const postgresSQL = 'CREATE TABLE users (id UUID PRIMARY KEY)';
      const result = translator.translate(postgresSQL);
      
      expect(result.sql).toBe('CREATE TABLE users (id TEXT PRIMARY KEY)');
    });

    test('should convert BOOLEAN to INTEGER', () => {
      const postgresSQL = 'CREATE TABLE flags (active BOOLEAN)';
      const result = translator.translate(postgresSQL);
      
      expect(result.sql).toBe('CREATE TABLE flags (active INTEGER)');
    });

    test('should convert multiple data types', () => {
      const postgresSQL = 'CREATE TABLE users (id UUID, name VARCHAR(255), active BOOLEAN, created_at TIMESTAMP)';
      const result = translator.translate(postgresSQL);
      
      expect(result.sql).toBe('CREATE TABLE users (id TEXT, name TEXT, active INTEGER, created_at TEXT)');
    });
  });

  describe('Parameter Translation', () => {
    test('should convert boolean true to 1', () => {
      const postgresSQL = 'INSERT INTO flags (active) VALUES ($1)';
      const result = translator.translate(postgresSQL, [true]);
      
      expect(result.params).toEqual([1]);
    });

    test('should convert boolean false to 0', () => {
      const postgresSQL = 'INSERT INTO flags (active) VALUES ($1)';
      const result = translator.translate(postgresSQL, [false]);
      
      expect(result.params).toEqual([0]);
    });

    test('should convert Date to ISO string', () => {
      const date = new Date('2023-01-01T00:00:00.000Z');
      const postgresSQL = 'INSERT INTO events (date) VALUES ($1)';
      const result = translator.translate(postgresSQL, [date]);
      
      expect(result.params).toEqual(['2023-01-01T00:00:00.000Z']);
    });

    test('should convert undefined to null', () => {
      const postgresSQL = 'INSERT INTO users (name) VALUES ($1)';
      const result = translator.translate(postgresSQL, [undefined]);
      
      expect(result.params).toEqual([null]);
    });

    test('should handle mixed parameter types', () => {
      const date = new Date('2023-01-01T00:00:00.000Z');
      const postgresSQL = 'INSERT INTO users (name, active, created_at, description) VALUES ($1, $2, $3, $4)';
      const result = translator.translate(postgresSQL, ['John', true, date, undefined]);
      
      expect(result.params).toEqual(['John', 1, '2023-01-01T00:00:00.000Z', null]);
    });

    test('should handle non-array parameters', () => {
      const postgresSQL = 'SELECT * FROM users';
      const result = translator.translate(postgresSQL, 'not-an-array');
      
      expect(result.params).toEqual([]);
    });
  });

  describe('Caching', () => {
    test('should cache translation results', () => {
      const postgresSQL = 'SELECT * FROM users WHERE id = $1';
      const params = ['user123'];

      // First call - cache miss
      translator.translate(postgresSQL, params);
      expect(translator.cacheMisses).toBe(1);
      expect(translator.cacheHits).toBe(0);

      // Second call - cache hit
      translator.translate(postgresSQL, params);
      expect(translator.cacheMisses).toBe(1);
      expect(translator.cacheHits).toBe(1);
    });

    test('should generate different cache keys for different parameters', () => {
      const postgresSQL = 'SELECT * FROM users WHERE id = $1';
      
      translator.translate(postgresSQL, ['user1']);
      translator.translate(postgresSQL, ['user2']);
      
      expect(translator.cacheMisses).toBe(2);
      expect(translator.cacheHits).toBe(0);
    });

    test('should limit cache size', () => {
      // Add more than 1000 translations to trigger cache size limit
      for (let i = 0; i < 1001; i++) {
        translator.translate(`SELECT * FROM table${i} WHERE id = $1`, [i]);
      }
      
      expect(translator.translationCache.size).toBeLessThanOrEqual(1000);
    });
  });

  describe('getStats()', () => {
    test('should return translation statistics', () => {
      const postgresSQL = 'SELECT * FROM users WHERE id = $1';
      
      translator.translate(postgresSQL, ['user1']); // cache miss
      translator.translate(postgresSQL, ['user1']); // cache hit
      translator.translate(postgresSQL, ['user2']); // cache miss
      
      const stats = translator.getStats();
      
      expect(stats.cacheHits).toBe(1);
      expect(stats.cacheMisses).toBe(2);
      expect(stats.cacheSize).toBe(2);
      expect(stats.hitRate).toBe(1/3);
    });

    test('should handle zero translations', () => {
      const stats = translator.getStats();
      
      expect(stats.cacheHits).toBe(0);
      expect(stats.cacheMisses).toBe(0);
      expect(stats.cacheSize).toBe(0);
      expect(stats.hitRate).toBe(0);
    });
  });

  describe('clearCache()', () => {
    test('should clear translation cache', () => {
      const postgresSQL = 'SELECT * FROM users WHERE id = $1';
      
      translator.translate(postgresSQL, ['user1']);
      expect(translator.translationCache.size).toBe(1);
      
      translator.clearCache();
      expect(translator.translationCache.size).toBe(0);
      expect(translator.cacheHits).toBe(0);
      expect(translator.cacheMisses).toBe(0);
    });
  });

  describe('canTranslate()', () => {
    test('should return true for translatable SQL', () => {
      const translatableSQL = 'SELECT * FROM users WHERE id = $1';
      expect(translator.canTranslate(translatableSQL)).toBe(true);
    });

    test('should return false for unsupported features', () => {
      const unsupportedSQL = 'WITH RECURSIVE cte AS (SELECT 1) SELECT * FROM cte';
      expect(translator.canTranslate(unsupportedSQL)).toBe(false);
    });

    test('should return false for invalid input', () => {
      expect(translator.canTranslate(null)).toBe(false);
      expect(translator.canTranslate(undefined)).toBe(false);
      expect(translator.canTranslate('')).toBe(false);
      expect(translator.canTranslate(123)).toBe(false);
    });

    test('should detect window functions', () => {
      const windowSQL = 'SELECT *, ROW_NUMBER() OVER (PARTITION BY category ORDER BY created_at) FROM products';
      expect(translator.canTranslate(windowSQL)).toBe(false);
    });

    test('should detect lateral joins', () => {
      const lateralSQL = 'SELECT * FROM users u LATERAL (SELECT * FROM posts WHERE user_id = u.id) p';
      expect(translator.canTranslate(lateralSQL)).toBe(false);
    });
  });

  describe('getUnsupportedFeatures()', () => {
    test('should return list of unsupported features', () => {
      const features = translator.getUnsupportedFeatures();
      
      expect(Array.isArray(features)).toBe(true);
      expect(features.length).toBeGreaterThan(0);
      expect(features).toContain('Recursive CTEs (WITH RECURSIVE)');
      expect(features).toContain('Window functions (PARTITION BY, OVER)');
      expect(features).toContain('Lateral joins (LATERAL)');
    });
  });

  describe('Integration Tests', () => {
    test('should handle complex real-world query', () => {
      const postgresSQL = `
        INSERT INTO tasks (
          id, title, description, type, priority, status, 
          project_id, created_by, estimated_time, metadata, 
          created_at, updated_at, completed_at, due_date, tags
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 
          NOW(), NOW(), $11, $12, $13
        )
        RETURNING id, title, created_at
      `;
      
      const params = [
        'task-123',
        'Implement SQL Translator',
        'Create PostgreSQL to SQLite translator',
        'development',
        'high',
        'in_progress',
        'project-456',
        'user-789',
        480,
        '{"complexity": "medium", "dependencies": ["database", "testing"]}',
        null,
        '2023-12-31',
        '["backend", "database", "translator"]'
      ];

      const result = translator.translate(postgresSQL, params);

      expect(result.sql).toContain('INSERT INTO tasks (');
      expect(result.sql).toContain('datetime(\'now\')');
      expect(result.sql).toContain('RETURNING id, title, created_at');
      expect(result.params).toHaveLength(13);
      expect(result.params[9]).toBe('{"complexity": "medium", "dependencies": ["database", "testing"]}');
    });

    test('should handle UPDATE query with complex conditions', () => {
      const postgresSQL = `
        UPDATE tasks 
        SET title = $1, description = $2, status = $3, updated_at = NOW()
        WHERE id = $4 AND project_id = $5 AND status != 'completed'
        RETURNING id, title, updated_at
      `;
      
      const params = ['Updated Title', 'Updated Description', 'in_progress', 'task-123', 'project-456'];

      const result = translator.translate(postgresSQL, params);

      expect(result.sql).toContain('UPDATE tasks');
      expect(result.sql).toContain('SET title = ?, description = ?, status = ?, updated_at = datetime(\'now\')');
      expect(result.sql).toContain('WHERE id = ? AND project_id = ? AND status != \'completed\'');
      expect(result.sql).toContain('RETURNING id, title, updated_at');
      expect(result.params).toEqual(['Updated Title', 'Updated Description', 'in_progress', 'task-123', 'project-456']);
    });

    test('should handle SELECT query with complex joins and conditions', () => {
      const postgresSQL = `
        SELECT t.id, t.title, t.status, p.name as project_name, u.name as assignee_name
        FROM tasks t
        LEFT JOIN projects p ON t.project_id = p.id
        LEFT JOIN users u ON t.created_by = u.id
        WHERE t.status IN ($1, $2, $3) 
        AND t.created_at >= $4
        AND (t.priority = $5 OR t.priority = $6)
        ORDER BY t.created_at DESC
        LIMIT $7 OFFSET $8
      `;
      
      const params = ['pending', 'in_progress', 'review', '2023-01-01', 'high', 'medium', 10, 0];

      const result = translator.translate(postgresSQL, params);

      expect(result.sql).toContain('SELECT t.id, t.title, t.status, p.name as project_name, u.name as assignee_name');
      expect(result.sql).toContain('FROM tasks t');
      expect(result.sql).toContain('LEFT JOIN projects p ON t.project_id = p.id');
      expect(result.sql).toContain('LEFT JOIN users u ON t.created_by = u.id');
      expect(result.sql).toContain('WHERE t.status IN (?, ?, ?)');
      expect(result.sql).toContain('AND t.created_at >= ?');
      expect(result.sql).toContain('AND (t.priority = ? OR t.priority = ?)');
      expect(result.sql).toContain('ORDER BY t.created_at DESC');
      expect(result.sql).toContain('LIMIT ? OFFSET ?');
      expect(result.params).toEqual(['pending', 'in_progress', 'review', '2023-01-01', 'high', 'medium', 10, 0]);
    });
  });
}); 