/**
 * IndexManager Unit Tests
 * Tests for database index management utilities
 */
const IndexManager = require('../../infrastructure/database/IndexManager');

describe('IndexManager', () => {
  let indexManager;
  let mockDatabaseConnection;

  beforeEach(() => {
    mockDatabaseConnection = {
      execute: jest.fn(),
      getType: jest.fn(() => 'postgresql')
    };
    
    indexManager = new IndexManager(mockDatabaseConnection);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with database connection', () => {
      expect(indexManager.db).toBe(mockDatabaseConnection);
      expect(indexManager.logger).toBeDefined();
      expect(indexManager.indexCache).toBeDefined();
      expect(indexManager.usageStats).toBeDefined();
      expect(indexManager.maintenanceSchedule).toBeDefined();
    });

    it('should initialize index rules', () => {
      expect(indexManager.indexRules).toBeDefined();
      expect(indexManager.indexRules.patterns).toBeDefined();
      expect(indexManager.indexRules.types).toBeDefined();
      expect(indexManager.indexRules.recommendations).toBeDefined();
    });
  });

  describe('createIndex', () => {
    it('should create index successfully', async () => {
      const table = 'tasks';
      const columns = ['status', 'priority'];
      const options = { unique: false };

      mockDatabaseConnection.execute.mockResolvedValue({});

      const result = await indexManager.createIndex(table, columns, options);

      expect(result).toHaveProperty('indexName');
      expect(result).toHaveProperty('table');
      expect(result).toHaveProperty('columns');
      expect(result).toHaveProperty('options');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('status');
      expect(result.table).toBe(table);
      expect(result.columns).toEqual(columns);
      expect(result.status).toBe('active');
    });

    it('should handle existing index', async () => {
      const table = 'tasks';
      const columns = ['status'];
      const options = {};

      // Mock existing index
      indexManager.indexCache.set('idx_tasks_status', {
        indexName: 'idx_tasks_status',
        table,
        columns,
        status: 'active'
      });

      const result = await indexManager.createIndex(table, columns, options);

      expect(result.indexName).toBe('idx_tasks_status');
      expect(mockDatabaseConnection.execute).not.toHaveBeenCalled();
    });

    it('should handle index creation errors', async () => {
      const table = 'tasks';
      const columns = ['status'];
      const options = {};

      mockDatabaseConnection.execute.mockRejectedValue(new Error('Index creation failed'));

      await expect(indexManager.createIndex(table, columns, options))
        .rejects.toThrow('Index creation failed');
    });
  });

  describe('dropIndex', () => {
    it('should drop index successfully', async () => {
      const indexName = 'idx_tasks_status';

      // Mock existing index
      indexManager.indexCache.set(indexName, {
        indexName,
        table: 'tasks',
        columns: ['status'],
        status: 'active'
      });

      mockDatabaseConnection.execute.mockResolvedValue({});

      const result = await indexManager.dropIndex(indexName);

      expect(result).toHaveProperty('indexName');
      expect(result).toHaveProperty('droppedAt');
      expect(result).toHaveProperty('status');
      expect(result.indexName).toBe(indexName);
      expect(result.status).toBe('dropped');
    });

    it('should handle non-existent index', async () => {
      const indexName = 'non_existent_index';

      await expect(indexManager.dropIndex(indexName))
        .rejects.toThrow(`Index ${indexName} not found`);
    });
  });

  describe('analyzeIndexUsage', () => {
    it('should analyze index usage', async () => {
      mockDatabaseConnection.execute.mockResolvedValue({
        rows: [
          {
            schemaname: 'public',
            tablename: 'tasks',
            indexname: 'idx_tasks_status',
            idx_tup_read: 1000,
            idx_tup_fetch: 950,
            idx_scan: 100
          }
        ]
      });

      const result = await indexManager.analyzeIndexUsage();

      expect(result).toHaveProperty('usageStats');
      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('unusedIndexes');
      expect(result).toHaveProperty('duplicateIndexes');
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('timestamp');
    });

    it('should handle analysis errors', async () => {
      mockDatabaseConnection.execute.mockRejectedValue(new Error('Analysis failed'));

      await expect(indexManager.analyzeIndexUsage())
        .rejects.toThrow('Analysis failed');
    });
  });

  describe('getIndex', () => {
    it('should get index from cache', async () => {
      const indexName = 'idx_tasks_status';
      const indexData = {
        indexName,
        table: 'tasks',
        columns: ['status'],
        status: 'active'
      };

      indexManager.indexCache.set(indexName, indexData);

      const result = await indexManager.getIndex(indexName);

      expect(result).toEqual(indexData);
      expect(mockDatabaseConnection.execute).not.toHaveBeenCalled();
    });

    it('should query database for missing index', async () => {
      const indexName = 'idx_tasks_status';

      mockDatabaseConnection.execute.mockResolvedValue({
        rows: [{
          indexname: indexName,
          tablename: 'tasks',
          indexdef: 'CREATE INDEX idx_tasks_status ON tasks (status)',
          schemaname: 'public'
        }]
      });

      const result = await indexManager.getIndex(indexName);

      expect(result).toHaveProperty('indexName');
      expect(result).toHaveProperty('table');
      expect(result).toHaveProperty('definition');
      expect(result).toHaveProperty('schema');
      expect(result).toHaveProperty('status');
    });

    it('should return null for non-existent index', async () => {
      const indexName = 'non_existent_index';

      mockDatabaseConnection.execute.mockResolvedValue({
        rows: []
      });

      const result = await indexManager.getIndex(indexName);

      expect(result).toBeNull();
    });
  });

  describe('getTableIndexes', () => {
    it('should get all indexes for a table', async () => {
      const tableName = 'tasks';

      mockDatabaseConnection.execute.mockResolvedValue({
        rows: [
          {
            indexname: 'idx_tasks_status',
            tablename: 'tasks',
            indexdef: 'CREATE INDEX idx_tasks_status ON tasks (status)',
            schemaname: 'public'
          },
          {
            indexname: 'idx_tasks_priority',
            tablename: 'tasks',
            indexdef: 'CREATE INDEX idx_tasks_priority ON tasks (priority)',
            schemaname: 'public'
          }
        ]
      });

      const result = await indexManager.getTableIndexes(tableName);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(2);
      expect(result[0]).toHaveProperty('indexName');
      expect(result[0]).toHaveProperty('table');
      expect(result[0]).toHaveProperty('definition');
    });
  });

  describe('generateIndexName', () => {
    it('should generate index name correctly', () => {
      const table = 'tasks';
      const columns = ['status', 'priority'];

      const indexName = indexManager.generateIndexName(table, columns);

      expect(indexName).toBe('idx_tasks_status_priority');
    });

    it('should handle single column', () => {
      const table = 'tasks';
      const columns = ['status'];

      const indexName = indexManager.generateIndexName(table, columns);

      expect(indexName).toBe('idx_tasks_status');
    });
  });

  describe('generateIndexSQL', () => {
    it('should generate index SQL correctly', () => {
      const table = 'tasks';
      const columns = ['status'];
      const options = { unique: false };

      const sql = indexManager.generateIndexSQL(table, columns, options);

      expect(sql).toContain('CREATE INDEX');
      expect(sql).toContain('idx_tasks_status');
      expect(sql).toContain('ON tasks');
      expect(sql).toContain('(status)');
    });

    it('should generate unique index SQL', () => {
      const table = 'tasks';
      const columns = ['id'];
      const options = { unique: true };

      const sql = indexManager.generateIndexSQL(table, columns, options);

      expect(sql).toContain('CREATE UNIQUE INDEX');
    });

    it('should generate concurrent index SQL', () => {
      const table = 'tasks';
      const columns = ['status'];
      const options = { concurrent: true };

      const sql = indexManager.generateIndexSQL(table, columns, options);

      expect(sql).toContain('CONCURRENTLY');
    });
  });

  describe('getIndexUsageStats', () => {
    it('should get index usage statistics', async () => {
      mockDatabaseConnection.execute.mockResolvedValue({
        rows: [
          {
            schemaname: 'public',
            tablename: 'tasks',
            indexname: 'idx_tasks_status',
            idx_tup_read: 1000,
            idx_tup_fetch: 950,
            idx_scan: 100
          }
        ]
      });

      const result = await indexManager.getIndexUsageStats();

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(1);
      expect(result[0]).toHaveProperty('schema');
      expect(result[0]).toHaveProperty('table');
      expect(result[0]).toHaveProperty('indexName');
      expect(result[0]).toHaveProperty('tuplesRead');
      expect(result[0]).toHaveProperty('tuplesFetched');
      expect(result[0]).toHaveProperty('scanCount');
    });
  });

  describe('generateIndexRecommendations', () => {
    it('should generate index recommendations', async () => {
      const usageStats = [
        {
          indexName: 'idx_tasks_status',
          table: 'tasks',
          scanCount: 1000
        },
        {
          indexName: 'idx_tasks_unused',
          table: 'tasks',
          scanCount: 5
        }
      ];

      const result = await indexManager.generateIndexRecommendations(usageStats);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('findUnusedIndexes', () => {
    it('should find unused indexes', async () => {
      const usageStats = [
        {
          indexName: 'idx_tasks_status',
          table: 'tasks',
          scanCount: 100
        },
        {
          indexName: 'idx_tasks_unused',
          table: 'tasks',
          scanCount: 0
        }
      ];

      const result = await indexManager.findUnusedIndexes(usageStats);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(1);
      expect(result[0].indexName).toBe('idx_tasks_unused');
    });
  });

  describe('findDuplicateIndexes', () => {
    it('should find duplicate indexes', async () => {
      mockDatabaseConnection.execute.mockResolvedValue({
        rows: [
          {
            tablename: 'tasks',
            indexdef: 'CREATE INDEX idx_tasks_status ON tasks (status)',
            count: 2
          }
        ]
      });

      const result = await indexManager.findDuplicateIndexes();

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(1);
      expect(result[0]).toHaveProperty('table');
      expect(result[0]).toHaveProperty('definition');
      expect(result[0]).toHaveProperty('count');
    });
  });

  describe('findMissingIndexes', () => {
    it('should find missing indexes', async () => {
      const result = await indexManager.findMissingIndexes();

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('table');
      expect(result[0]).toHaveProperty('columns');
      expect(result[0]).toHaveProperty('description');
    });
  });

  describe('scheduleIndexMaintenance', () => {
    it('should schedule index maintenance', () => {
      const indexName = 'idx_tasks_status';
      const schedule = {
        interval: 3600000, // 1 hour
        enabled: true
      };

      indexManager.scheduleIndexMaintenance(indexName, schedule);

      expect(indexManager.maintenanceSchedule.has(indexName)).toBe(true);
      const maintenance = indexManager.maintenanceSchedule.get(indexName);
      expect(maintenance.interval).toBe(schedule.interval);
      expect(maintenance.enabled).toBe(schedule.enabled);
    });
  });

  describe('performIndexMaintenance', () => {
    it('should perform index maintenance', async () => {
      const indexName = 'idx_tasks_status';

      mockDatabaseConnection.execute.mockResolvedValue({});

      const result = await indexManager.performIndexMaintenance(indexName);

      expect(result).toHaveProperty('indexName');
      expect(result).toHaveProperty('maintainedAt');
      expect(result).toHaveProperty('status');
      expect(result.indexName).toBe(indexName);
      expect(result.status).toBe('completed');
    });

    it('should handle maintenance errors', async () => {
      const indexName = 'idx_tasks_status';

      mockDatabaseConnection.execute.mockRejectedValue(new Error('Maintenance failed'));

      await expect(indexManager.performIndexMaintenance(indexName))
        .rejects.toThrow('Maintenance failed');
    });
  });

  describe('getIndexStats', () => {
    it('should return index statistics', () => {
      const stats = indexManager.getIndexStats();

      expect(stats).toHaveProperty('totalIndexes');
      expect(stats).toHaveProperty('usageStats');
      expect(stats).toHaveProperty('maintenanceSchedule');
      expect(stats).toHaveProperty('timestamp');
    });
  });

  describe('clearCache', () => {
    it('should clear index cache', () => {
      indexManager.indexCache.set('test', { data: 'test' });
      indexManager.usageStats.set('test', { data: 'test' });
      indexManager.maintenanceSchedule.set('test', { data: 'test' });

      expect(indexManager.indexCache.size).toBe(1);
      expect(indexManager.usageStats.size).toBe(1);
      expect(indexManager.maintenanceSchedule.size).toBe(1);

      indexManager.clearCache();

      expect(indexManager.indexCache.size).toBe(0);
      expect(indexManager.usageStats.size).toBe(0);
      expect(indexManager.maintenanceSchedule.size).toBe(0);
    });
  });
});
