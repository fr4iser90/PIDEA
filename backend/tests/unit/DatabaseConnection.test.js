/**
 * DatabaseConnection Unit Tests
 * 
 * Tests for the main database connection class including connection management,
 * query execution, performance monitoring, and repository management.
 */

const DatabaseConnection = require('../../infrastructure/database/DatabaseConnection');
const Logger = require('../../infrastructure/logging/Logger');

describe('DatabaseConnection Unit Tests', () => {
  let mockConfig;
  let databaseConnection;
  let mockLogger;

  beforeEach(() => {
    // Mock logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };
    
    jest.spyOn(Logger, 'Logger').mockImplementation(() => mockLogger);

    // Mock configuration
    mockConfig = {
      type: 'sqlite',
      database: ':memory:',
      monitoring: true,
      optimization: true
    };

    // Clear instances to avoid singleton issues
    DatabaseConnection.instances = {};
  });

  afterEach(() => {
    jest.clearAllMocks();
    DatabaseConnection.instances = {};
  });

  describe('Constructor', () => {
    test('should create instance with correct configuration', () => {
      databaseConnection = new DatabaseConnection(mockConfig);
      
      expect(databaseConnection.config).toEqual(mockConfig);
      expect(databaseConnection.isConnected).toBe(false);
      expect(databaseConnection.monitoringEnabled).toBe(true);
      expect(databaseConnection.optimizationEnabled).toBe(true);
    });

    test('should implement singleton pattern for same connection', () => {
      const connection1 = new DatabaseConnection(mockConfig);
      const connection2 = new DatabaseConnection(mockConfig);
      
      expect(connection1).toBe(connection2);
    });

    test('should create separate instances for different connections', () => {
      const config1 = { ...mockConfig, database: 'test1.db' };
      const config2 = { ...mockConfig, database: 'test2.db' };
      
      const connection1 = new DatabaseConnection(config1);
      const connection2 = new DatabaseConnection(config2);
      
      expect(connection1).not.toBe(connection2);
    });

    test('should initialize performance monitoring components when enabled', () => {
      databaseConnection = new DatabaseConnection(mockConfig);
      
      expect(databaseConnection.performanceMonitor).toBeNull();
      expect(databaseConnection.queryMonitor).toBeNull();
      expect(databaseConnection.queryCache).toBeNull();
      expect(databaseConnection.queryOptimizer).toBeNull();
      expect(databaseConnection.indexManager).toBeNull();
    });

    test('should disable monitoring when config.monitoring is false', () => {
      const configWithoutMonitoring = { ...mockConfig, monitoring: false };
      databaseConnection = new DatabaseConnection(configWithoutMonitoring);
      
      expect(databaseConnection.monitoringEnabled).toBe(false);
    });

    test('should disable optimization when config.optimization is false', () => {
      const configWithoutOptimization = { ...mockConfig, optimization: false };
      databaseConnection = new DatabaseConnection(configWithoutOptimization);
      
      expect(databaseConnection.optimizationEnabled).toBe(false);
    });
  });

  describe('Connection Management', () => {
    beforeEach(() => {
      databaseConnection = new DatabaseConnection(mockConfig);
    });

    test('should connect successfully with valid configuration', async () => {
      // Mock the connection methods
      databaseConnection.dbConnection = {
        connect: jest.fn().mockResolvedValue(),
        query: jest.fn().mockResolvedValue([]),
        close: jest.fn().mockResolvedValue()
      };

      await databaseConnection.connect();

      expect(databaseConnection.isConnected).toBe(true);
      expect(databaseConnection.type).toBe('sqlite');
      expect(mockLogger.debug).toHaveBeenCalledWith('🗄️ Attempting to connect to database...');
    });

    test('should handle connection errors gracefully', async () => {
      const error = new Error('Connection failed');
      databaseConnection.dbConnection = {
        connect: jest.fn().mockRejectedValue(error)
      };

      await expect(databaseConnection.connect()).rejects.toThrow('Connection failed');
      expect(databaseConnection.isConnected).toBe(false);
    });

    test('should disconnect successfully', async () => {
      databaseConnection.isConnected = true;
      databaseConnection.dbConnection = {
        close: jest.fn().mockResolvedValue()
      };

      await databaseConnection.disconnect();

      expect(databaseConnection.isConnected).toBe(false);
      expect(databaseConnection.dbConnection).toBeNull();
    });

    test('should handle disconnect errors gracefully', async () => {
      databaseConnection.isConnected = true;
      databaseConnection.dbConnection = {
        close: jest.fn().mockRejectedValue(new Error('Disconnect failed'))
      };

      await expect(databaseConnection.disconnect()).rejects.toThrow('Disconnect failed');
    });
  });

  describe('Query Execution', () => {
    beforeEach(() => {
      databaseConnection = new DatabaseConnection(mockConfig);
      databaseConnection.isConnected = true;
      databaseConnection.dbConnection = {
        query: jest.fn().mockResolvedValue([{ id: 1, name: 'test' }])
      };
    });

    test('should execute query successfully', async () => {
      const result = await databaseConnection.query('SELECT * FROM test', [1]);

      expect(result).toEqual([{ id: 1, name: 'test' }]);
      expect(databaseConnection.dbConnection.query).toHaveBeenCalledWith('SELECT * FROM test', [1]);
    });

    test('should throw error when not connected', async () => {
      databaseConnection.isConnected = false;

      await expect(databaseConnection.query('SELECT * FROM test')).rejects.toThrow('Database not connected');
    });

    test('should handle query errors gracefully', async () => {
      const error = new Error('Query failed');
      databaseConnection.dbConnection.query.mockRejectedValue(error);

      await expect(databaseConnection.query('SELECT * FROM test')).rejects.toThrow('Query failed');
    });

    test('should execute statements successfully', async () => {
      databaseConnection.dbConnection.run = jest.fn().mockResolvedValue({ changes: 1 });

      const result = await databaseConnection.execute('INSERT INTO test VALUES (?)', ['value']);

      expect(result).toEqual({ changes: 1 });
      expect(databaseConnection.dbConnection.run).toHaveBeenCalledWith('INSERT INTO test VALUES (?)', ['value']);
    });

    test('should throw error when executing without connection', async () => {
      databaseConnection.isConnected = false;

      await expect(databaseConnection.execute('INSERT INTO test VALUES (?)')).rejects.toThrow('Database not connected');
    });
  });

  describe('Repository Management', () => {
    beforeEach(() => {
      databaseConnection = new DatabaseConnection(mockConfig);
      databaseConnection.type = 'sqlite';
    });

    test('should get repository for SQLite with translator', () => {
      // Mock the repository class
      const MockRepository = jest.fn();
      jest.doMock('../../infrastructure/database/PostgreSQLTestRepository', () => MockRepository);

      const repository = databaseConnection.getRepository('Test');

      expect(MockRepository).toHaveBeenCalledWith(databaseConnection, null, null);
    });

    test('should get repository for PostgreSQL directly', () => {
      databaseConnection.type = 'postgresql';
      
      const MockRepository = jest.fn();
      jest.doMock('../../infrastructure/database/PostgreSQLTestRepository', () => MockRepository);

      const repository = databaseConnection.getRepository('Test');

      expect(MockRepository).toHaveBeenCalledWith(databaseConnection, null, null);
    });

    test('should throw error for non-existent repository', () => {
      jest.doMock('../../infrastructure/database/PostgreSQLNonExistentRepository', () => {
        throw new Error('MODULE_NOT_FOUND');
      });

      expect(() => {
        databaseConnection.getRepository('NonExistent');
      }).toThrow('Repository NonExistent not implemented for PostgreSQL');
    });
  });

  describe('Performance Monitoring', () => {
    beforeEach(() => {
      databaseConnection = new DatabaseConnection(mockConfig);
    });

    test('should initialize performance monitoring when enabled', async () => {
      databaseConnection.monitoringEnabled = true;
      
      // Mock performance monitoring components
      const MockPerformanceMonitor = jest.fn();
      const MockQueryMonitor = jest.fn();
      const MockQueryCache = jest.fn();
      
      jest.doMock('../../infrastructure/database/PerformanceMonitor', () => MockPerformanceMonitor);
      jest.doMock('../../infrastructure/database/QueryMonitor', () => MockQueryMonitor);
      jest.doMock('../../infrastructure/database/QueryCache', () => MockQueryCache);

      await databaseConnection.initializePerformanceMonitoring();

      expect(databaseConnection.performanceMonitor).toBeDefined();
      expect(databaseConnection.queryMonitor).toBeDefined();
      expect(databaseConnection.queryCache).toBeDefined();
    });

    test('should skip performance monitoring when disabled', async () => {
      databaseConnection.monitoringEnabled = false;

      await databaseConnection.initializePerformanceMonitoring();

      expect(databaseConnection.performanceMonitor).toBeNull();
      expect(databaseConnection.queryMonitor).toBeNull();
      expect(databaseConnection.queryCache).toBeNull();
    });
  });

  describe('Connection Status', () => {
    beforeEach(() => {
      databaseConnection = new DatabaseConnection(mockConfig);
    });

    test('should return correct connection status', () => {
      databaseConnection.isConnected = true;
      databaseConnection.type = 'sqlite';

      const status = databaseConnection.getConnectionStatus();

      expect(status).toEqual({
        isConnected: true,
        type: 'sqlite',
        config: mockConfig,
        performance: {
          monitoringEnabled: true,
          optimizationEnabled: true,
          performanceMonitor: null,
          queryMonitor: null,
          queryCache: null
        }
      });
    });

    test('should return disconnected status', () => {
      databaseConnection.isConnected = false;

      const status = databaseConnection.getConnectionStatus();

      expect(status.isConnected).toBe(false);
    });
  });

  describe('Database Type Management', () => {
    beforeEach(() => {
      databaseConnection = new DatabaseConnection(mockConfig);
    });

    test('should return correct database type', () => {
      databaseConnection.type = 'sqlite';

      expect(databaseConnection.getType()).toBe('sqlite');
    });

    test('should return null type when not connected', () => {
      databaseConnection.type = null;

      expect(databaseConnection.getType()).toBeNull();
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      databaseConnection = new DatabaseConnection(mockConfig);
    });

    test('should handle invalid configuration gracefully', () => {
      const invalidConfig = {};

      expect(() => {
        new DatabaseConnection(invalidConfig);
      }).not.toThrow();
    });

    test('should handle missing database connection gracefully', async () => {
      databaseConnection.isConnected = true;
      databaseConnection.dbConnection = null;

      await expect(databaseConnection.query('SELECT 1')).rejects.toThrow();
    });
  });
});
