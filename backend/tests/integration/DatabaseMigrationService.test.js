/**
 * DatabaseMigrationService Integration Tests
 * 
 * Tests for database migration service including migration execution,
 * rollback, version management, and data integrity across different database types.
 */

const DatabaseMigrationService = require('../../infrastructure/database/DatabaseMigrationService');
const DatabaseConnection = require('../../infrastructure/database/DatabaseConnection');
const SchemaVersionManager = require('../../infrastructure/database/SchemaVersionManager');
const Logger = require('../../infrastructure/logging/Logger');

describe('DatabaseMigrationService Integration Tests', () => {
  let migrationService;
  let databaseConnection;
  let schemaVersionManager;
  let mockLogger;

  beforeEach(async () => {
    // Mock logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };
    
    jest.spyOn(Logger, 'Logger').mockImplementation(() => mockLogger);

    // Create in-memory database connection for testing
    const config = {
      type: 'sqlite',
      database: ':memory:'
    };

    databaseConnection = new DatabaseConnection(config);
    await databaseConnection.connect();

    // Initialize schema version manager
    schemaVersionManager = new SchemaVersionManager(databaseConnection);
    await schemaVersionManager.initialize();

    // Create migration service
    migrationService = new DatabaseMigrationService(databaseConnection);
    await migrationService.initialize();
  });

  afterEach(async () => {
    if (databaseConnection) {
      await databaseConnection.disconnect();
    }
    jest.clearAllMocks();
  });

  describe('Migration Initialization', () => {
    test('should initialize migration service successfully', async () => {
      expect(migrationService.databaseConnection).toBe(databaseConnection);
      expect(migrationService.schemaVersionManager).toBeDefined();
      expect(migrationService.migrationsPath).toBeDefined();
    });

    test('should create migrations table if not exists', async () => {
      const result = await databaseConnection.query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='migrations'"
      );

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('migrations');
    });

    test('should handle initialization errors gracefully', async () => {
      const invalidConnection = {
        query: jest.fn().mockRejectedValue(new Error('Connection failed')),
        execute: jest.fn().mockRejectedValue(new Error('Connection failed'))
      };

      const invalidMigrationService = new DatabaseMigrationService(invalidConnection);

      await expect(invalidMigrationService.initialize()).rejects.toThrow('Connection failed');
    });
  });

  describe('Migration Execution', () => {
    test('should execute migration successfully', async () => {
      const migration = {
        version: '1.0.0',
        description: 'Create users table',
        up: 'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT)',
        down: 'DROP TABLE users'
      };

      await migrationService.executeMigration(migration);

      // Verify table was created
      const tables = await databaseConnection.query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
      );
      expect(tables).toHaveLength(1);

      // Verify migration was recorded
      const currentVersion = await schemaVersionManager.getCurrentVersion();
      expect(currentVersion.version).toBe('1.0.0');
    });

    test('should execute multiple migrations in order', async () => {
      const migrations = [
        {
          version: '1.0.0',
          description: 'Create users table',
          up: 'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)',
          down: 'DROP TABLE users'
        },
        {
          version: '1.1.0',
          description: 'Add email column to users',
          up: 'ALTER TABLE users ADD COLUMN email TEXT',
          down: 'ALTER TABLE users DROP COLUMN email'
        }
      ];

      for (const migration of migrations) {
        await migrationService.executeMigration(migration);
      }

      // Verify both migrations were applied
      const versionHistory = await schemaVersionManager.getVersionHistory();
      expect(versionHistory).toHaveLength(2);
      expect(versionHistory[0].version).toBe('1.1.0');
      expect(versionHistory[1].version).toBe('1.0.0');

      // Verify table structure
      const columns = await databaseConnection.query("PRAGMA table_info(users)");
      expect(columns).toHaveLength(3); // id, name, email
    });

    test('should handle migration errors gracefully', async () => {
      const invalidMigration = {
        version: '1.0.0',
        description: 'Invalid migration',
        up: 'INVALID SQL STATEMENT',
        down: 'DROP TABLE non_existent'
      };

      await expect(migrationService.executeMigration(invalidMigration))
        .rejects.toThrow();

      // Verify no migration was recorded
      const currentVersion = await schemaVersionManager.getCurrentVersion();
      expect(currentVersion).toBeNull();
    });

    test('should prevent duplicate migration execution', async () => {
      const migration = {
        version: '1.0.0',
        description: 'Create users table',
        up: 'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)',
        down: 'DROP TABLE users'
      };

      // Execute migration first time
      await migrationService.executeMigration(migration);

      // Try to execute same migration again
      await expect(migrationService.executeMigration(migration))
        .rejects.toThrow('Migration 1.0.0 already applied');
    });
  });

  describe('Migration Rollback', () => {
    beforeEach(async () => {
      const migration = {
        version: '1.0.0',
        description: 'Create users table',
        up: 'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)',
        down: 'DROP TABLE users'
      };

      await migrationService.executeMigration(migration);
    });

    test('should rollback migration successfully', async () => {
      await migrationService.rollbackMigration('1.0.0');

      // Verify table was dropped
      const tables = await databaseConnection.query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
      );
      expect(tables).toHaveLength(0);

      // Verify migration was removed from version history
      const currentVersion = await schemaVersionManager.getCurrentVersion();
      expect(currentVersion).toBeNull();
    });

    test('should handle rollback errors gracefully', async () => {
      // Mock rollback to fail
      const invalidMigration = {
        version: '1.0.0',
        description: 'Create users table',
        up: 'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)',
        down: 'INVALID ROLLBACK SQL'
      };

      await expect(migrationService.rollbackMigration('1.0.0', invalidMigration))
        .rejects.toThrow();
    });

    test('should prevent rollback of non-existent migration', async () => {
      await expect(migrationService.rollbackMigration('999.999.999'))
        .rejects.toThrow('Migration 999.999.999 not found');
    });
  });

  describe('Migration Status', () => {
    test('should get migration status correctly', async () => {
      const migration = {
        version: '1.0.0',
        description: 'Create users table',
        up: 'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)',
        down: 'DROP TABLE users'
      };

      // Before migration
      let status = await migrationService.getMigrationStatus('1.0.0');
      expect(status).toBe('pending');

      // After migration
      await migrationService.executeMigration(migration);
      status = await migrationService.getMigrationStatus('1.0.0');
      expect(status).toBe('applied');

      // After rollback
      await migrationService.rollbackMigration('1.0.0');
      status = await migrationService.getMigrationStatus('1.0.0');
      expect(status).toBe('pending');
    });

    test('should list all migrations with status', async () => {
      const migrations = [
        {
          version: '1.0.0',
          description: 'Create users table',
          up: 'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)',
          down: 'DROP TABLE users'
        },
        {
          version: '1.1.0',
          description: 'Add email column',
          up: 'ALTER TABLE users ADD COLUMN email TEXT',
          down: 'ALTER TABLE users DROP COLUMN email'
        }
      ];

      // Execute first migration
      await migrationService.executeMigration(migrations[0]);

      const migrationList = await migrationService.listMigrations();

      expect(migrationList).toHaveLength(2);
      expect(migrationList[0].version).toBe('1.0.0');
      expect(migrationList[0].status).toBe('applied');
      expect(migrationList[1].version).toBe('1.1.0');
      expect(migrationList[1].status).toBe('pending');
    });
  });

  describe('Data Integrity', () => {
    test('should maintain data integrity during migrations', async () => {
      // Create initial table with data
      const initialMigration = {
        version: '1.0.0',
        description: 'Create users table',
        up: 'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)',
        down: 'DROP TABLE users'
      };

      await migrationService.executeMigration(initialMigration);

      // Insert test data
      await databaseConnection.execute(
        'INSERT INTO users (name) VALUES (?)',
        ['John Doe']
      );

      // Add column migration
      const addColumnMigration = {
        version: '1.1.0',
        description: 'Add email column',
        up: 'ALTER TABLE users ADD COLUMN email TEXT',
        down: 'ALTER TABLE users DROP COLUMN email'
      };

      await migrationService.executeMigration(addColumnMigration);

      // Verify data integrity
      const users = await databaseConnection.query('SELECT * FROM users');
      expect(users).toHaveLength(1);
      expect(users[0].name).toBe('John Doe');
      expect(users[0].email).toBeNull();
    });

    test('should handle transaction rollback on migration failure', async () => {
      const migration = {
        version: '1.0.0',
        description: 'Create users table',
        up: 'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT); INSERT INTO users (name) VALUES (\'Test\'); INVALID SQL;',
        down: 'DROP TABLE users'
      };

      await expect(migrationService.executeMigration(migration))
        .rejects.toThrow();

      // Verify no partial changes were made
      const tables = await databaseConnection.query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
      );
      expect(tables).toHaveLength(0);

      const currentVersion = await schemaVersionManager.getCurrentVersion();
      expect(currentVersion).toBeNull();
    });
  });

  describe('Cross-Database Compatibility', () => {
    test('should work with SQLite database', async () => {
      const migration = {
        version: '1.0.0',
        description: 'Create users table',
        up: 'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)',
        down: 'DROP TABLE users'
      };

      await migrationService.executeMigration(migration);

      const tables = await databaseConnection.query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
      );
      expect(tables).toHaveLength(1);
    });

    test('should handle PostgreSQL-specific syntax', async () => {
      // Mock PostgreSQL connection
      const postgresConfig = {
        type: 'postgresql',
        host: 'localhost',
        port: 5432,
        database: 'test_db',
        username: 'test_user',
        password: 'test_password'
      };

      const postgresConnection = new DatabaseConnection(postgresConfig);
      const postgresMigrationService = new DatabaseMigrationService(postgresConnection);

      const migration = {
        version: '1.0.0',
        description: 'Create users table with SERIAL',
        up: 'CREATE TABLE users (id SERIAL PRIMARY KEY, name VARCHAR(255))',
        down: 'DROP TABLE users'
      };

      // Should handle PostgreSQL-specific syntax
      expect(() => {
        postgresMigrationService.validateMigration(migration);
      }).not.toThrow();
    });
  });

  describe('Performance', () => {
    test('should handle large migrations efficiently', async () => {
      const largeMigration = {
        version: '1.0.0',
        description: 'Create large table with many columns',
        up: `
          CREATE TABLE large_table (
            id INTEGER PRIMARY KEY,
            col1 TEXT, col2 TEXT, col3 TEXT, col4 TEXT, col5 TEXT,
            col6 TEXT, col7 TEXT, col8 TEXT, col9 TEXT, col10 TEXT,
            col11 TEXT, col12 TEXT, col13 TEXT, col14 TEXT, col15 TEXT,
            col16 TEXT, col17 TEXT, col18 TEXT, col19 TEXT, col20 TEXT
          )
        `,
        down: 'DROP TABLE large_table'
      };

      const startTime = Date.now();
      await migrationService.executeMigration(largeMigration);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete in less than 1 second

      // Verify table was created
      const tables = await databaseConnection.query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='large_table'"
      );
      expect(tables).toHaveLength(1);
    });

    test('should handle multiple concurrent migrations', async () => {
      const migrations = Array(10).fill().map((_, i) => ({
        version: `1.${i}.0`,
        description: `Migration ${i}`,
        up: `CREATE TABLE table_${i} (id INTEGER PRIMARY KEY, data TEXT)`,
        down: `DROP TABLE table_${i}`
      }));

      const startTime = Date.now();
      const promises = migrations.map(migration => 
        migrationService.executeMigration(migration)
      );
      await Promise.all(promises);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(2000); // Should complete in less than 2 seconds

      // Verify all tables were created
      const tables = await databaseConnection.query(
        "SELECT name FROM sqlite_master WHERE type='table'"
      );
      expect(tables.length).toBeGreaterThanOrEqual(10);
    });
  });

  describe('Error Recovery', () => {
    test('should recover from partial migration failure', async () => {
      const migration = {
        version: '1.0.0',
        description: 'Create users table',
        up: 'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)',
        down: 'DROP TABLE users'
      };

      // Mock database to fail after table creation but before version recording
      const originalExecute = databaseConnection.execute;
      let callCount = 0;
      databaseConnection.execute = jest.fn().mockImplementation((sql, params) => {
        callCount++;
        if (callCount === 1) {
          // First call (table creation) succeeds
          return originalExecute.call(databaseConnection, sql, params);
        } else {
          // Second call (version recording) fails
          throw new Error('Version recording failed');
        }
      });

      await expect(migrationService.executeMigration(migration))
        .rejects.toThrow('Version recording failed');

      // Verify table was created but migration not recorded
      const tables = await databaseConnection.query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
      );
      expect(tables).toHaveLength(1);

      const currentVersion = await schemaVersionManager.getCurrentVersion();
      expect(currentVersion).toBeNull();
    });

    test('should handle database connection loss during migration', async () => {
      const migration = {
        version: '1.0.0',
        description: 'Create users table',
        up: 'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)',
        down: 'DROP TABLE users'
      };

      // Mock database connection to fail
      databaseConnection.execute = jest.fn().mockRejectedValue(
        new Error('Database connection lost')
      );

      await expect(migrationService.executeMigration(migration))
        .rejects.toThrow('Database connection lost');
    });
  });

  describe('Migration Validation', () => {
    test('should validate migration structure', () => {
      const validMigration = {
        version: '1.0.0',
        description: 'Valid migration',
        up: 'CREATE TABLE test (id INTEGER PRIMARY KEY)',
        down: 'DROP TABLE test'
      };

      expect(() => {
        migrationService.validateMigration(validMigration);
      }).not.toThrow();
    });

    test('should reject invalid migration structure', () => {
      const invalidMigration = {
        version: '1.0.0',
        description: 'Invalid migration'
        // Missing up and down
      };

      expect(() => {
        migrationService.validateMigration(invalidMigration);
      }).toThrow();
    });

    test('should validate migration version format', () => {
      const invalidVersionMigration = {
        version: 'invalid-version',
        description: 'Invalid version migration',
        up: 'CREATE TABLE test (id INTEGER PRIMARY KEY)',
        down: 'DROP TABLE test'
      };

      expect(() => {
        migrationService.validateMigration(invalidVersionMigration);
      }).toThrow();
    });
  });
});
