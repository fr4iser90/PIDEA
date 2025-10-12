/**
 * QueryOptimizer Unit Tests
 * Tests for database query optimization utilities
 */
const QueryOptimizer = require('../../infrastructure/database/QueryOptimizer');

describe('QueryOptimizer', () => {
  let queryOptimizer;
  let mockDatabaseConnection;

  beforeEach(() => {
    mockDatabaseConnection = {
      execute: jest.fn(),
      getType: jest.fn(() => 'postgresql')
    };
    
    queryOptimizer = new QueryOptimizer(mockDatabaseConnection);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with database connection', () => {
      expect(queryOptimizer.db).toBe(mockDatabaseConnection);
      expect(queryOptimizer.logger).toBeDefined();
      expect(queryOptimizer.optimizationRules).toBeDefined();
      expect(queryOptimizer.queryCache).toBeDefined();
    });

    it('should set performance thresholds', () => {
      expect(queryOptimizer.performanceThresholds.slowQuery).toBe(1000);
      expect(queryOptimizer.performanceThresholds.verySlowQuery).toBe(5000);
      expect(queryOptimizer.performanceThresholds.highMemoryUsage).toBe(100 * 1024 * 1024);
    });
  });

  describe('optimizeQuery', () => {
    it('should optimize a simple query', async () => {
      const query = 'SELECT * FROM tasks WHERE status = ?';
      const params = ['pending'];
      
      mockDatabaseConnection.execute.mockResolvedValue({
        rows: [{ id: 1, status: 'pending' }],
        rowCount: 1
      });

      const result = await queryOptimizer.optimizeQuery(query, params);

      expect(result).toHaveProperty('originalQuery');
      expect(result).toHaveProperty('optimizedQuery');
      expect(result).toHaveProperty('optimizations');
      expect(result).toHaveProperty('performanceGain');
      expect(result).toHaveProperty('timestamp');
      expect(result.originalQuery).toBe(query);
    });

    it('should handle optimization errors gracefully', async () => {
      const query = 'INVALID SQL';
      const params = [];
      
      mockDatabaseConnection.execute.mockRejectedValue(new Error('Invalid SQL'));

      await expect(queryOptimizer.optimizeQuery(query, params))
        .rejects.toThrow('Invalid SQL');
    });

    it('should cache optimization results', async () => {
      const query = 'SELECT * FROM tasks';
      const params = [];
      
      mockDatabaseConnection.execute.mockResolvedValue({
        rows: [],
        rowCount: 0
      });

      await queryOptimizer.optimizeQuery(query, params);
      await queryOptimizer.optimizeQuery(query, params);

      expect(mockDatabaseConnection.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('analyzeQuery', () => {
    it('should analyze query performance', async () => {
      const query = 'SELECT * FROM tasks WHERE id = ?';
      const params = [1];
      
      mockDatabaseConnection.execute.mockResolvedValue({
        rows: [{ id: 1 }],
        rowCount: 1
      });

      const result = await queryOptimizer.analyzeQuery(query, params);

      expect(result).toHaveProperty('executionTime');
      expect(result).toHaveProperty('rowsAffected');
      expect(result).toHaveProperty('rowsReturned');
      expect(result).toHaveProperty('structure');
      expect(result).toHaveProperty('estimatedImprovement');
      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('timestamp');
    });

    it('should detect SELECT * queries', async () => {
      const query = 'SELECT * FROM tasks';
      const params = [];
      
      mockDatabaseConnection.execute.mockResolvedValue({
        rows: [],
        rowCount: 0
      });

      const result = await queryOptimizer.analyzeQuery(query, params);

      expect(result.structure.hasSelectStar).toBe(true);
    });

    it('should detect WHERE clauses', async () => {
      const query = 'SELECT id FROM tasks WHERE status = ?';
      const params = ['pending'];
      
      mockDatabaseConnection.execute.mockResolvedValue({
        rows: [],
        rowCount: 0
      });

      const result = await queryOptimizer.analyzeQuery(query, params);

      expect(result.structure.hasWhereClause).toBe(true);
    });
  });

  describe('generateOptimizations', () => {
    it('should generate optimizations for slow queries', async () => {
      const analysis = {
        executionTime: 2000,
        structure: {
          hasSelectStar: false,
          hasWhereClause: true,
          hasIndex: false
        }
      };

      const optimizations = await queryOptimizer.generateOptimizations(analysis);

      expect(optimizations).toBeInstanceOf(Array);
      expect(optimizations.length).toBeGreaterThan(0);
      expect(optimizations[0]).toHaveProperty('type');
      expect(optimizations[0]).toHaveProperty('description');
      expect(optimizations[0]).toHaveProperty('impact');
    });

    it('should generate optimizations for SELECT * queries', async () => {
      const analysis = {
        executionTime: 500,
        structure: {
          hasSelectStar: true,
          hasWhereClause: false,
          hasIndex: false
        }
      };

      const optimizations = await queryOptimizer.generateOptimizations(analysis);

      expect(optimizations).toBeInstanceOf(Array);
      expect(optimizations.some(opt => opt.type === 'select_star')).toBe(true);
    });
  });

  describe('applyOptimizations', () => {
    it('should apply SELECT * optimizations', async () => {
      const query = 'SELECT * FROM tasks';
      const optimizations = [
        { type: 'select_star', description: 'Replace SELECT * with specific columns' }
      ];

      const result = await queryOptimizer.applyOptimizations(query, optimizations);

      expect(result).not.toContain('SELECT *');
      expect(result).toContain('SELECT id, name, created_at');
    });

    it('should apply JOIN optimizations', async () => {
      const query = 'SELECT * FROM tasks JOIN users ON tasks.user_id = users.id';
      const optimizations = [
        { type: 'complex_join', description: 'Optimize JOIN operations' }
      ];

      const result = await queryOptimizer.applyOptimizations(query, optimizations);

      expect(result).toContain('JOIN');
    });
  });

  describe('analyzeQueryStructure', () => {
    it('should analyze query structure correctly', () => {
      const query = 'SELECT * FROM tasks WHERE status = ? JOIN users ON tasks.user_id = users.id';
      
      const structure = queryOptimizer.analyzeQueryStructure(query);

      expect(structure.hasSelectStar).toBe(true);
      expect(structure.hasWhereClause).toBe(true);
      expect(structure.hasJoin).toBe(true);
      expect(structure.joinCount).toBe(1);
      expect(structure.complexity).toBe('high');
    });

    it('should determine complexity correctly', () => {
      const simpleQuery = 'SELECT id FROM tasks';
      const mediumQuery = 'SELECT id FROM tasks WHERE status = ?';
      const complexQuery = 'SELECT * FROM tasks JOIN users ON tasks.user_id = users.id JOIN projects ON users.project_id = projects.id';

      expect(queryOptimizer.analyzeQueryStructure(simpleQuery).complexity).toBe('low');
      expect(queryOptimizer.analyzeQueryStructure(mediumQuery).complexity).toBe('medium');
      expect(queryOptimizer.analyzeQueryStructure(complexQuery).complexity).toBe('high');
    });
  });

  describe('calculateEstimatedImprovement', () => {
    it('should calculate improvement for slow queries', () => {
      const query = 'SELECT * FROM tasks';
      const executionTime = 2000;
      const structure = {
        hasSelectStar: true,
        hasWhereClause: true,
        hasIndex: false,
        complexity: 'high'
      };

      const improvement = queryOptimizer.calculateEstimatedImprovement(query, executionTime, structure);

      expect(improvement).toBeGreaterThan(0);
      expect(improvement).toBeLessThanOrEqual(80);
    });

    it('should cap improvement at 80%', () => {
      const query = 'SELECT * FROM tasks';
      const executionTime = 10000;
      const structure = {
        hasSelectStar: true,
        hasWhereClause: true,
        hasIndex: false,
        complexity: 'high'
      };

      const improvement = queryOptimizer.calculateEstimatedImprovement(query, executionTime, structure);

      expect(improvement).toBeLessThanOrEqual(80);
    });
  });

  describe('generateQueryHash', () => {
    it('should generate consistent hash for same query and params', () => {
      const query = 'SELECT * FROM tasks WHERE id = ?';
      const params = [1];

      const hash1 = queryOptimizer.generateQueryHash(query, params);
      const hash2 = queryOptimizer.generateQueryHash(query, params);

      expect(hash1).toBe(hash2);
    });

    it('should generate different hash for different params', () => {
      const query = 'SELECT * FROM tasks WHERE id = ?';
      const params1 = [1];
      const params2 = [2];

      const hash1 = queryOptimizer.generateQueryHash(query, params1);
      const hash2 = queryOptimizer.generateQueryHash(query, params2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('sanitizeQuery', () => {
    it('should sanitize query for logging', () => {
      const query = 'SELECT   *   FROM    tasks   WHERE   id   =   ?';
      const sanitized = queryOptimizer.sanitizeQuery(query);

      expect(sanitized).toBe('SELECT * FROM tasks WHERE id = ?');
    });
  });

  describe('getOptimizationStats', () => {
    it('should return optimization statistics', () => {
      const stats = queryOptimizer.getOptimizationStats();

      expect(stats).toHaveProperty('totalOptimizations');
      expect(stats).toHaveProperty('averageImprovement');
      expect(stats).toHaveProperty('cacheSize');
      expect(stats).toHaveProperty('timestamp');
    });
  });

  describe('clearCache', () => {
    it('should clear optimization cache', () => {
      queryOptimizer.queryCache.set('test', { data: 'test' });
      expect(queryOptimizer.queryCache.size).toBe(1);

      queryOptimizer.clearCache();
      expect(queryOptimizer.queryCache.size).toBe(0);
    });
  });
});
