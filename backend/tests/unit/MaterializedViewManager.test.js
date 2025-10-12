/**
 * MaterializedViewManager Unit Tests
 * Tests for database materialized view management
 */
const MaterializedViewManager = require('../../infrastructure/database/MaterializedViewManager');

describe('MaterializedViewManager', () => {
  let materializedViewManager;
  let mockDatabaseConnection;

  beforeEach(() => {
    mockDatabaseConnection = {
      execute: jest.fn(),
      getType: jest.fn(() => 'postgresql')
    };
    
    materializedViewManager = new MaterializedViewManager(mockDatabaseConnection);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with database connection', () => {
      expect(materializedViewManager.db).toBe(mockDatabaseConnection);
      expect(materializedViewManager.logger).toBeDefined();
      expect(materializedViewManager.viewCache).toBeDefined();
      expect(materializedViewManager.refreshSchedule).toBeDefined();
      expect(materializedViewManager.viewTemplates).toBeDefined();
    });

    it('should initialize view templates', () => {
      expect(materializedViewManager.viewTemplates.has('task_performance_summary')).toBe(true);
      expect(materializedViewManager.viewTemplates.has('user_activity_summary')).toBe(true);
      expect(materializedViewManager.viewTemplates.has('project_performance_summary')).toBe(true);
      expect(materializedViewManager.viewTemplates.has('workflow_performance_summary')).toBe(true);
    });
  });

  describe('createMaterializedView', () => {
    it('should create materialized view successfully', async () => {
      const name = 'test_view';
      const query = 'SELECT * FROM tasks';
      const options = {};

      mockDatabaseConnection.execute.mockResolvedValue({});

      const result = await materializedViewManager.createMaterializedView(name, query, options);

      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('query');
      expect(result).toHaveProperty('options');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('lastRefreshed');
      expect(result).toHaveProperty('refreshCount');
      expect(result.name).toBe(name);
      expect(result.query).toBe(query);
      expect(result.status).toBe('active');
    });

    it('should handle existing view', async () => {
      const name = 'test_view';
      const query = 'SELECT * FROM tasks';
      const options = {};

      // Mock existing view
      materializedViewManager.viewCache.set(name, {
        name,
        query,
        status: 'active'
      });

      const result = await materializedViewManager.createMaterializedView(name, query, options);

      expect(result.name).toBe(name);
      expect(mockDatabaseConnection.execute).not.toHaveBeenCalled();
    });

    it('should handle view creation errors', async () => {
      const name = 'test_view';
      const query = 'INVALID SQL';
      const options = {};

      mockDatabaseConnection.execute.mockRejectedValue(new Error('View creation failed'));

      await expect(materializedViewManager.createMaterializedView(name, query, options))
        .rejects.toThrow('View creation failed');
    });

    it('should schedule automatic refresh', async () => {
      const name = 'test_view';
      const query = 'SELECT * FROM tasks';
      const options = {
        autoRefresh: true,
        refreshInterval: 3600000
      };

      mockDatabaseConnection.execute.mockResolvedValue({});

      await materializedViewManager.createMaterializedView(name, query, options);

      expect(materializedViewManager.refreshSchedule.has(name)).toBe(true);
    });
  });

  describe('createFromTemplate', () => {
    it('should create view from template successfully', async () => {
      const templateName = 'task_performance_summary';
      const options = {};

      mockDatabaseConnection.execute.mockResolvedValue({});

      const result = await materializedViewManager.createFromTemplate(templateName, options);

      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('query');
      expect(result).toHaveProperty('options');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('status');
    });

    it('should handle unknown template', async () => {
      const templateName = 'unknown_template';
      const options = {};

      await expect(materializedViewManager.createFromTemplate(templateName, options))
        .rejects.toThrow('Unknown materialized view template: unknown_template');
    });
  });

  describe('refreshMaterializedView', () => {
    it('should refresh materialized view successfully', async () => {
      const name = 'test_view';

      // Mock existing view
      materializedViewManager.viewCache.set(name, {
        name,
        query: 'SELECT * FROM tasks',
        status: 'active',
        refreshCount: 0
      });

      mockDatabaseConnection.execute.mockResolvedValue({});

      const result = await materializedViewManager.refreshMaterializedView(name);

      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('refreshedAt');
      expect(result).toHaveProperty('refreshTime');
      expect(result).toHaveProperty('refreshCount');
      expect(result).toHaveProperty('status');
      expect(result.name).toBe(name);
      expect(result.status).toBe('refreshed');
    });

    it('should refresh with concurrent option', async () => {
      const name = 'test_view';
      const options = { concurrent: true };

      // Mock existing view
      materializedViewManager.viewCache.set(name, {
        name,
        query: 'SELECT * FROM tasks',
        status: 'active',
        refreshCount: 0
      });

      mockDatabaseConnection.execute.mockResolvedValue({});

      const result = await materializedViewManager.refreshMaterializedView(name, options);

      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('refreshedAt');
      expect(result).toHaveProperty('status');
      expect(result.status).toBe('refreshed');
    });

    it('should handle non-existent view', async () => {
      const name = 'non_existent_view';

      await expect(materializedViewManager.refreshMaterializedView(name))
        .rejects.toThrow(`Materialized view ${name} not found`);
    });

    it('should handle refresh errors', async () => {
      const name = 'test_view';

      // Mock existing view
      materializedViewManager.viewCache.set(name, {
        name,
        query: 'SELECT * FROM tasks',
        status: 'active',
        refreshCount: 0
      });

      mockDatabaseConnection.execute.mockRejectedValue(new Error('Refresh failed'));

      await expect(materializedViewManager.refreshMaterializedView(name))
        .rejects.toThrow('Refresh failed');
    });
  });

  describe('refreshAllMaterializedViews', () => {
    it('should refresh all materialized views successfully', async () => {
      mockDatabaseConnection.execute.mockResolvedValue({
        rows: [
          {
            schemaname: 'public',
            matviewname: 'view1',
            definition: 'CREATE MATERIALIZED VIEW view1 AS SELECT * FROM table1',
            hasindexes: false
          },
          {
            schemaname: 'public',
            matviewname: 'view2',
            definition: 'CREATE MATERIALIZED VIEW view2 AS SELECT * FROM table2',
            hasindexes: false
          }
        ]
      });

      // Mock refresh method
      materializedViewManager.refreshMaterializedView = jest.fn().mockResolvedValue({
        name: 'view1',
        status: 'refreshed'
      });

      const result = await materializedViewManager.refreshAllMaterializedViews();

      expect(result).toHaveProperty('totalViews');
      expect(result).toHaveProperty('refreshedViews');
      expect(result).toHaveProperty('failedViews');
      expect(result).toHaveProperty('results');
      expect(result).toHaveProperty('timestamp');
      expect(result.totalViews).toBe(2);
    });

    it('should handle partial failures', async () => {
      mockDatabaseConnection.execute.mockResolvedValue({
        rows: [
          {
            schemaname: 'public',
            matviewname: 'view1',
            definition: 'CREATE MATERIALIZED VIEW view1 AS SELECT * FROM table1',
            hasindexes: false
          },
          {
            schemaname: 'public',
            matviewname: 'view2',
            definition: 'CREATE MATERIALIZED VIEW view2 AS SELECT * FROM table2',
            hasindexes: false
          }
        ]
      });

      // Mock refresh method with one failure
      materializedViewManager.refreshMaterializedView = jest.fn()
        .mockResolvedValueOnce({ name: 'view1', status: 'refreshed' })
        .mockRejectedValueOnce(new Error('Refresh failed'));

      const result = await materializedViewManager.refreshAllMaterializedViews();

      expect(result.totalViews).toBe(2);
      expect(result.refreshedViews).toBe(1);
      expect(result.failedViews).toBe(1);
    });
  });

  describe('getMaterializedView', () => {
    it('should get view from cache', async () => {
      const name = 'test_view';
      const viewData = {
        schema: 'public',
        name,
        definition: 'CREATE MATERIALIZED VIEW test_view AS SELECT * FROM tasks',
        hasIndexes: false,
        status: 'active'
      };

      materializedViewManager.viewCache.set(name, viewData);

      const result = await materializedViewManager.getMaterializedView(name);

      expect(result).toEqual(viewData);
      expect(mockDatabaseConnection.execute).not.toHaveBeenCalled();
    });

    it('should query database for missing view', async () => {
      const name = 'test_view';

      mockDatabaseConnection.execute.mockResolvedValue({
        rows: [{
          schemaname: 'public',
          matviewname: name,
          definition: 'CREATE MATERIALIZED VIEW test_view AS SELECT * FROM tasks',
          hasindexes: false
        }]
      });

      const result = await materializedViewManager.getMaterializedView(name);

      expect(result).toHaveProperty('schema');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('definition');
      expect(result).toHaveProperty('hasIndexes');
      expect(result).toHaveProperty('status');
    });

    it('should return null for non-existent view', async () => {
      const name = 'non_existent_view';

      mockDatabaseConnection.execute.mockResolvedValue({
        rows: []
      });

      const result = await materializedViewManager.getMaterializedView(name);

      expect(result).toBeNull();
    });
  });

  describe('getAllMaterializedViews', () => {
    it('should get all materialized views', async () => {
      mockDatabaseConnection.execute.mockResolvedValue({
        rows: [
          {
            schemaname: 'public',
            matviewname: 'view1',
            definition: 'CREATE MATERIALIZED VIEW view1 AS SELECT * FROM table1',
            hasindexes: false
          },
          {
            schemaname: 'public',
            matviewname: 'view2',
            definition: 'CREATE MATERIALIZED VIEW view2 AS SELECT * FROM table2',
            hasindexes: true
          }
        ]
      });

      const result = await materializedViewManager.getAllMaterializedViews();

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(2);
      expect(result[0]).toHaveProperty('schema');
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('definition');
      expect(result[0]).toHaveProperty('hasIndexes');
      expect(result[0]).toHaveProperty('status');
    });
  });

  describe('dropMaterializedView', () => {
    it('should drop materialized view successfully', async () => {
      const name = 'test_view';

      // Mock existing view
      materializedViewManager.viewCache.set(name, {
        name,
        query: 'SELECT * FROM tasks',
        status: 'active'
      });

      mockDatabaseConnection.execute.mockResolvedValue({});

      const result = await materializedViewManager.dropMaterializedView(name);

      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('droppedAt');
      expect(result).toHaveProperty('status');
      expect(result.name).toBe(name);
      expect(result.status).toBe('dropped');
    });

    it('should handle non-existent view', async () => {
      const name = 'non_existent_view';

      await expect(materializedViewManager.dropMaterializedView(name))
        .rejects.toThrow(`Materialized view ${name} not found`);
    });
  });

  describe('scheduleRefresh', () => {
    it('should schedule automatic refresh', () => {
      const name = 'test_view';
      const interval = 3600000; // 1 hour

      materializedViewManager.scheduleRefresh(name, interval);

      expect(materializedViewManager.refreshSchedule.has(name)).toBe(true);
      const schedule = materializedViewManager.refreshSchedule.get(name);
      expect(schedule.name).toBe(name);
      expect(schedule.interval).toBe(interval);
      expect(schedule.timer).toBeDefined();
    });
  });

  describe('cancelRefresh', () => {
    it('should cancel scheduled refresh', () => {
      const name = 'test_view';
      const interval = 3600000;

      materializedViewManager.scheduleRefresh(name, interval);
      expect(materializedViewManager.refreshSchedule.has(name)).toBe(true);

      materializedViewManager.cancelRefresh(name);
      expect(materializedViewManager.refreshSchedule.has(name)).toBe(false);
    });
  });

  describe('generateViewSQL', () => {
    it('should generate view SQL correctly', () => {
      const name = 'test_view';
      const query = 'SELECT * FROM tasks';
      const options = {};

      const sql = materializedViewManager.generateViewSQL(name, query, options);

      expect(sql).toContain('CREATE MATERIALIZED VIEW');
      expect(sql).toContain(name);
      expect(sql).toContain(query);
      expect(sql).toContain('WITH DATA');
    });

    it('should generate concurrent view SQL', () => {
      const name = 'test_view';
      const query = 'SELECT * FROM tasks';
      const options = { concurrent: true };

      const sql = materializedViewManager.generateViewSQL(name, query, options);

      expect(sql).toContain('CONCURRENTLY');
    });

    it('should generate view SQL without data', () => {
      const name = 'test_view';
      const query = 'SELECT * FROM tasks';
      const options = { withData: false };

      const sql = materializedViewManager.generateViewSQL(name, query, options);

      expect(sql).toContain('WITH NO DATA');
    });
  });

  describe('sanitizeQuery', () => {
    it('should sanitize query for logging', () => {
      const query = 'SELECT   *   FROM    tasks   WHERE   id   =   ?';
      const sanitized = materializedViewManager.sanitizeQuery(query);

      expect(sanitized).toBe('SELECT * FROM tasks WHERE id = ?');
    });
  });

  describe('getViewStats', () => {
    it('should return view statistics', () => {
      const stats = materializedViewManager.getViewStats();

      expect(stats).toHaveProperty('totalViews');
      expect(stats).toHaveProperty('scheduledRefreshes');
      expect(stats).toHaveProperty('viewTemplates');
      expect(stats).toHaveProperty('timestamp');
    });
  });

  describe('getRefreshSchedule', () => {
    it('should return refresh schedule', () => {
      const name = 'test_view';
      const interval = 3600000;

      materializedViewManager.scheduleRefresh(name, interval);

      const schedule = materializedViewManager.getRefreshSchedule();

      expect(schedule).toBeInstanceOf(Array);
      expect(schedule.length).toBe(1);
      expect(schedule[0]).toHaveProperty('name');
      expect(schedule[0]).toHaveProperty('interval');
      expect(schedule[0]).toHaveProperty('lastRefresh');
      expect(schedule[0]).toHaveProperty('nextRefresh');
    });
  });

  describe('clearCache', () => {
    it('should clear view cache', () => {
      materializedViewManager.viewCache.set('test', { data: 'test' });

      expect(materializedViewManager.viewCache.size).toBe(1);

      materializedViewManager.clearCache();

      expect(materializedViewManager.viewCache.size).toBe(0);
    });
  });

  describe('stopAllScheduledRefreshes', () => {
    it('should stop all scheduled refreshes', () => {
      materializedViewManager.scheduleRefresh('view1', 3600000);
      materializedViewManager.scheduleRefresh('view2', 7200000);

      expect(materializedViewManager.refreshSchedule.size).toBe(2);

      materializedViewManager.stopAllScheduledRefreshes();

      expect(materializedViewManager.refreshSchedule.size).toBe(0);
    });
  });
});
