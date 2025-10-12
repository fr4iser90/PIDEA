/**
 * SQLiteConnection Unit Tests
 * 
 * Tests for SQLite database connection including connection management,
 * query execution, table verification, and SQLite-specific features.
 */

const SQLiteConnection = require('../../infrastructure/database/SQLiteConnection');
const Logger = require('../../infrastructure/logging/Logger');

describe('SQLiteConnection Unit Tests', () => {
  let mockConfig;
  let sqliteConnection;
  let mockLogger;
  let mockDatabase;

  beforeEach(() => {
    // Mock logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };
    
    jest.spyOn(Logger, 'Logger').mockImplementation(() => mockLogger);

    // Mock SQLite database
    mockDatabase = {
      run: jest.fn(),
      get: jest.fn(),
      all: jest.fn(),
      close: jest.fn(),
      serialize: jest.fn(),
      parallelize: jest.fn()
    };

    // Mock sqlite3 module
    jest.doMock('sqlite3', () => ({
      Database: jest.fn(() => mockDatabase),
      OPEN_READWRITE: 2,
      OPEN_CREATE: 4
    }));

    // Mock configuration
    mockConfig = {
      database: ':memory:',
      enableWAL: true,
      synchronous: 'NORMAL',
      journalMode: 'WAL'
    };

    sqliteConnection = new SQLiteConnection(mockConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    test('should create instance with correct configuration', () => {
      expect(sqliteConnection.config).toEqual(mockConfig);
      expect(sqliteConnection.isConnected).toBe(false);
      expect(sqliteConnection.db).toBeNull();
    });

    test('should handle missing configuration gracefully', () => {
      const emptyConfig = {};
      const connection = new SQLiteConnection(emptyConfig);
      
      expect(connection.config).toEqual(emptyConfig);
    });
  });

  describe('Connection Management', () => {
    test('should connect successfully with memory database', async () => {
      mockDatabase.run.mockImplementation((sql, callback) => {
        if (callback) callback();
      });

      await sqliteConnection.connect();

      expect(sqliteConnection.isConnected).toBe(true);
      expect(sqliteConnection.db).toBeDefined();
      expect(mockLogger.debug).toHaveBeenCalledWith('🗄️ Connecting to SQLite database: :memory:');
    });

    test('should connect successfully with file database', async () => {
      const fileConfig = { ...mockConfig, database: 'test.db' };
      const fileConnection = new SQLiteConnection(fileConfig);
      
      mockDatabase.run.mockImplementation((sql, callback) => {
        if (callback) callback();
      });

      await fileConnection.connect();

      expect(fileConnection.isConnected).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith('🗄️ Connecting to SQLite database: test.db');
    });

    test('should handle connection errors gracefully', async () => {
      const error = new Error('Connection failed');
      mockDatabase.run.mockImplementation((sql, callback) => {
        if (callback) callback(error);
      });

      await expect(sqliteConnection.connect()).rejects.toThrow('Connection failed');
      expect(sqliteConnection.isConnected).toBe(false);
    });

    test('should disconnect successfully', async () => {
      sqliteConnection.isConnected = true;
      sqliteConnection.db = mockDatabase;

      await sqliteConnection.disconnect();

      expect(sqliteConnection.isConnected).toBe(false);
      expect(sqliteConnection.db).toBeNull();
      expect(mockDatabase.close).toHaveBeenCalled();
    });

    test('should handle disconnect errors gracefully', async () => {
      sqliteConnection.isConnected = true;
      sqliteConnection.db = mockDatabase;
      mockDatabase.close.mockImplementation((callback) => {
        if (callback) callback(new Error('Close failed'));
      });

      await expect(sqliteConnection.disconnect()).rejects.toThrow('Close failed');
    });
  });

  describe('Query Execution', () => {
    beforeEach(() => {
      sqliteConnection.isConnected = true;
      sqliteConnection.db = mockDatabase;
    });

    test('should execute SELECT query successfully', async () => {
      const mockResult = [{ id: 1, name: 'test' }];
      mockDatabase.all.mockImplementation((sql, params, callback) => {
        callback(null, mockResult);
      });

      const result = await sqliteConnection.query('SELECT * FROM test');

      expect(result).toEqual(mockResult);
      expect(mockDatabase.all).toHaveBeenCalledWith('SELECT * FROM test', [], expect.any(Function));
    });

    test('should execute SELECT query with parameters', async () => {
      const mockResult = [{ id: 1, name: 'test' }];
      mockDatabase.all.mockImplementation((sql, params, callback) => {
        callback(null, mockResult);
      });

      const result = await sqliteConnection.query('SELECT * FROM test WHERE id = ?', [1]);

      expect(result).toEqual(mockResult);
      expect(mockDatabase.all).toHaveBeenCalledWith('SELECT * FROM test WHERE id = ?', [1], expect.any(Function));
    });

    test('should execute INSERT statement successfully', async () => {
      const mockResult = { lastID: 1, changes: 1 };
      mockDatabase.run.mockImplementation((sql, params, callback) => {
        callback(null, mockResult);
      });

      const result = await sqliteConnection.execute('INSERT INTO test (name) VALUES (?)', ['test']);

      expect(result).toEqual(mockResult);
      expect(mockDatabase.run).toHaveBeenCalledWith('INSERT INTO test (name) VALUES (?)', ['test'], expect.any(Function));
    });

    test('should execute UPDATE statement successfully', async () => {
      const mockResult = { changes: 1 };
      mockDatabase.run.mockImplementation((sql, params, callback) => {
        callback(null, mockResult);
      });

      const result = await sqliteConnection.execute('UPDATE test SET name = ? WHERE id = ?', ['updated', 1]);

      expect(result).toEqual(mockResult);
      expect(mockDatabase.run).toHaveBeenCalledWith('UPDATE test SET name = ? WHERE id = ?', ['updated', 1], expect.any(Function));
    });

    test('should execute DELETE statement successfully', async () => {
      const mockResult = { changes: 1 };
      mockDatabase.run.mockImplementation((sql, params, callback) => {
        callback(null, mockResult);
      });

      const result = await sqliteConnection.execute('DELETE FROM test WHERE id = ?', [1]);

      expect(result).toEqual(mockResult);
      expect(mockDatabase.run).toHaveBeenCalledWith('DELETE FROM test WHERE id = ?', [1], expect.any(Function));
    });

    test('should throw error when not connected', async () => {
      sqliteConnection.isConnected = false;

      await expect(sqliteConnection.query('SELECT * FROM test')).rejects.toThrow('Database not connected');
    });

    test('should handle query errors gracefully', async () => {
      const error = new Error('Query failed');
      mockDatabase.all.mockImplementation((sql, params, callback) => {
        callback(error);
      });

      await expect(sqliteConnection.query('SELECT * FROM test')).rejects.toThrow('Query failed');
    });

    test('should handle execute errors gracefully', async () => {
      const error = new Error('Execute failed');
      mockDatabase.run.mockImplementation((sql, params, callback) => {
        callback(error);
      });

      await expect(sqliteConnection.execute('INSERT INTO test VALUES (?)', ['test'])).rejects.toThrow('Execute failed');
    });
  });

  describe('Table Verification', () => {
    beforeEach(() => {
      sqliteConnection.isConnected = true;
      sqliteConnection.db = mockDatabase;
    });

    test('should verify all required tables exist', async () => {
      const mockTables = [
        { name: 'users' },
        { name: 'user_sessions' },
        { name: 'projects' },
        { name: 'tasks' },
        { name: 'analysis_results' },
        { name: 'analysis_steps' },
        { name: 'chat_sessions' },
        { name: 'chat_messages' },
        { name: 'workflows' },
        { name: 'workflow_executions' },
        { name: 'task_templates' },
        { name: 'task_suggestions' },
        { name: 'task_sessions' },
        { name: 'project_analysis' }
      ];

      mockDatabase.all.mockImplementation((sql, params, callback) => {
        callback(null, mockTables);
      });

      await sqliteConnection.verifyTablesCreated();

      expect(mockDatabase.all).toHaveBeenCalledWith("SELECT name FROM sqlite_master WHERE type='table'", [], expect.any(Function));
      expect(mockLogger.info).toHaveBeenCalledWith('✅ All required tables verified successfully');
    });

    test('should throw error when tables are missing', async () => {
      const mockTables = [
        { name: 'users' },
        { name: 'projects' }
      ];

      mockDatabase.all.mockImplementation((sql, params, callback) => {
        callback(null, mockTables);
      });

      await expect(sqliteConnection.verifyTablesCreated()).rejects.toThrow('Database initialization incomplete. Missing tables: user_sessions, tasks, analysis_results, analysis_steps, chat_sessions, chat_messages, workflows, workflow_executions, task_templates, task_suggestions, task_sessions, project_analysis');
    });

    test('should handle table verification errors gracefully', async () => {
      const error = new Error('Table verification failed');
      mockDatabase.all.mockImplementation((sql, params, callback) => {
        callback(error);
      });

      await expect(sqliteConnection.verifyTablesCreated()).rejects.toThrow('Table verification failed');
    });
  });

  describe('Database Initialization', () => {
    beforeEach(() => {
      sqliteConnection.isConnected = true;
      sqliteConnection.db = mockDatabase;
    });

    test('should initialize database with WAL mode', async () => {
      mockDatabase.run.mockImplementation((sql, callback) => {
        if (callback) callback();
      });

      await sqliteConnection.initializeDatabase();

      expect(mockDatabase.run).toHaveBeenCalledWith('PRAGMA journal_mode=WAL', expect.any(Function));
      expect(mockDatabase.run).toHaveBeenCalledWith('PRAGMA synchronous=NORMAL', expect.any(Function));
    });

    test('should handle initialization errors gracefully', async () => {
      const error = new Error('Initialization failed');
      mockDatabase.run.mockImplementation((sql, callback) => {
        if (callback) callback(error);
      });

      await expect(sqliteConnection.initializeDatabase()).rejects.toThrow('Initialization failed');
    });
  });

  describe('Transaction Management', () => {
    beforeEach(() => {
      sqliteConnection.isConnected = true;
      sqliteConnection.db = mockDatabase;
    });

    test('should execute statements in transaction', async () => {
      mockDatabase.serialize.mockImplementation((callback) => {
        callback();
      });
      mockDatabase.run.mockImplementation((sql, callback) => {
        if (callback) callback();
      });

      await sqliteConnection.executeStatement('BEGIN TRANSACTION', 'Starting transaction');

      expect(mockDatabase.serialize).toHaveBeenCalled();
      expect(mockDatabase.run).toHaveBeenCalledWith('BEGIN TRANSACTION', expect.any(Function));
    });

    test('should handle transaction errors gracefully', async () => {
      const error = new Error('Transaction failed');
      mockDatabase.serialize.mockImplementation((callback) => {
        callback();
      });
      mockDatabase.run.mockImplementation((sql, callback) => {
        if (callback) callback(error);
      });

      await expect(sqliteConnection.executeStatement('BEGIN TRANSACTION', 'Starting transaction')).rejects.toThrow('Transaction failed');
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid database path gracefully', async () => {
      const invalidConfig = { database: '/invalid/path/test.db' };
      const invalidConnection = new SQLiteConnection(invalidConfig);

      // Mock database creation failure
      jest.doMock('sqlite3', () => ({
        Database: jest.fn(() => {
          throw new Error('Cannot open database');
        })
      }));

      await expect(invalidConnection.connect()).rejects.toThrow();
    });

    test('should handle database corruption gracefully', async () => {
      sqliteConnection.isConnected = true;
      sqliteConnection.db = mockDatabase;

      const error = new Error('database disk image is malformed');
      mockDatabase.all.mockImplementation((sql, params, callback) => {
        callback(error);
      });

      await expect(sqliteConnection.query('SELECT * FROM test')).rejects.toThrow('database disk image is malformed');
    });
  });

  describe('Configuration Validation', () => {
    test('should validate WAL mode configuration', () => {
      const walConfig = { ...mockConfig, journalMode: 'WAL' };
      const connection = new SQLiteConnection(walConfig);

      expect(connection.config.journalMode).toBe('WAL');
    });

    test('should validate synchronous mode configuration', () => {
      const syncConfig = { ...mockConfig, synchronous: 'FULL' };
      const connection = new SQLiteConnection(syncConfig);

      expect(connection.config.synchronous).toBe('FULL');
    });

    test('should handle missing configuration options', () => {
      const minimalConfig = { database: ':memory:' };
      const connection = new SQLiteConnection(minimalConfig);

      expect(connection.config.database).toBe(':memory:');
      expect(connection.config.enableWAL).toBeUndefined();
    });
  });
});
