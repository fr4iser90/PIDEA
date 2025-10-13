const Logger = require('../logging/Logger');
const SQLiteConnection = require('./SQLiteConnection');
const PostgreSQLConnection = require('./PostgreSQLConnection');
const MemoryConnection = require('./MemoryConnection');
const SQLTranslator = require('./SQLTranslator');
const PerformanceMonitor = require('./PerformanceMonitor');
const QueryMonitor = require('./QueryMonitor');
const QueryCache = require('./QueryCache');
const QueryOptimizer = require('./QueryOptimizer');
const IndexManager = require('./IndexManager');
const PartitionManager = require('./PartitionManager');
const MaterializedViewManager = require('./MaterializedViewManager');
const PerformanceSchema = require('./PerformanceSchema');
const logger = new Logger('DatabaseConnection');

class DatabaseConnection {
  constructor(config) {
    // Singleton pattern - prevent multiple connections to same database
    const connectionKey = `${config.type}-${config.database}`;
    if (DatabaseConnection.instances && DatabaseConnection.instances[connectionKey]) {
      return DatabaseConnection.instances[connectionKey];
    }
    
    this.config = config;
    this.dbConnection = null; // The actual database connection instance
    this.type = null;
    this.isConnected = false;
    this.sqlTranslator = null; // Will be initialized only for SQLite
    
    // Performance monitoring components
    this.performanceMonitor = null;
    this.queryMonitor = null;
    this.queryCache = null;
    this.monitoringEnabled = config.monitoring !== false;
    
    // Performance optimization components
    this.queryOptimizer = null;
    this.indexManager = null;
    this.partitionManager = null;
    this.materializedViewManager = null;
    this.performanceSchema = null;
    this.optimizationEnabled = config.optimization !== false;
    
    // Store instance
    if (!DatabaseConnection.instances) {
      DatabaseConnection.instances = {};
    }
    DatabaseConnection.instances[connectionKey] = this;
  }

  async connect() {
    logger.debug('🗄️ Attempting to connect to database...');
    
    try {
      if (this.config.type === 'postgresql') {
        await this.connectPostgreSQL();
      } else {
        await this.connectSQLite();
      }
    } catch (error) {
      logger.warn(`⚠️ Primary connection failed: ${error.message}`);
      
      if (this.config.fallback) {
        logger.info('🔄 Trying fallback database...');
        await this.connectFallback();
      } else {
        throw error;
      }
    }
  }

  async connectPostgreSQL() {
    logger.info('🐘 Connecting to PostgreSQL...');
    
    this.dbConnection = new PostgreSQLConnection(this.config);
    await this.dbConnection.connect();
    
    this.connection = this.dbConnection.getConnection();
    this.type = 'postgresql';
    this.isConnected = true;
    
    // Initialize performance monitoring
    await this.initializePerformanceMonitoring();
    
    // Initialize performance optimization
    await this.initializePerformanceOptimization();
    
    logger.info('✅ PostgreSQL connected successfully');
  }

  async connectSQLite() {
    logger.info('💾 Connecting to SQLite...');
    
    this.dbConnection = new SQLiteConnection(this.config);
    await this.dbConnection.connect();
    
    this.connection = this.dbConnection.getConnection();
    this.type = 'sqlite';
    this.isConnected = true;
    this.sqlTranslator = new SQLTranslator(); // Initialize translator only for SQLite
    
    // Initialize performance monitoring
    await this.initializePerformanceMonitoring();
    
    // Initialize performance optimization
    await this.initializePerformanceOptimization();
    
    logger.info('✅ SQLite connected successfully');
  }

  async connectFallback() {
    if (this.config.fallback.type === 'sqlite') {
      this.config.database = this.config.fallback.database;
      await this.connectSQLite();
    } else if (this.config.fallback.type === 'memory') {
      this.dbConnection = new MemoryConnection(this.config);
      await this.dbConnection.connect();
      
      this.connection = this.dbConnection.getConnection();
      this.type = 'memory';
      this.isConnected = true;
      
      logger.info('✅ Memory database connected successfully');
    }
  }

  // Database initialization is now handled by the specific connection classes
  // This method is kept for backward compatibility but delegates to the actual connection
  async runMigrations() {
    logger.info('🔄 Running migrations...');
    if (this.dbConnection) {
      // The specific connection class already handles initialization
      logger.info('✅ Database already initialized by connection class');
    } else {
      throw new Error('Database connection not established');
    }
  }

  // Table verification is now handled by the specific connection classes
  async verifyTablesCreated() {
    logger.info('🔍 Verifying tables were created successfully...');
    if (this.dbConnection) {
      // Delegate to the specific connection class
      await this.dbConnection.verifyTablesCreated();
    } else {
      throw new Error('Database connection not established');
    }
  }

  async createTables() {
    logger.info('🏗️ Creating PIDEA tables...');
    logger.warn('⚠️ createTables() is deprecated - using init.sql instead');
    
    // This method is kept for backward compatibility but should not be used
    // All table creation is now handled by init.sql
    throw new Error('Table creation is now handled by init.sql - this method is deprecated');
  }

  async execute(sql, params = []) {
    if (!this.isConnected || !this.dbConnection) {
      throw new Error('Database not connected');
    }

    const queryId = this.generateQueryId();
    let queryInfo = null;
    let result = null;
    let error = null;

    // Start query monitoring (disabled for now due to SQL syntax errors)
    // if (this.monitoringEnabled && this.queryMonitor) {
    //   queryInfo = this.queryMonitor.beginQuery(queryId, sql, params, this.type);
    // }d

    try {
      // If using SQLite, translate PostgreSQL syntax to SQLite
      if (this.type === 'sqlite') {
        logger.info(`🔍 [DatabaseConnection] SQLite detected, checking translation...`);
        logger.info(`🔍 [DatabaseConnection] SQL preview: ${sql.substring(0, 100)}...`);
        logger.info(`🔍 [DatabaseConnection] Can translate: ${this.sqlTranslator.canTranslate(sql)}`);
        
        if (this.sqlTranslator.canTranslate(sql)) {
          logger.info(`🔄 [DatabaseConnection] Translating SQL...`);
          const translation = this.sqlTranslator.translate(sql, params);
          logger.info(`🔄 [DatabaseConnection] Translation result: ${translation.sql.substring(0, 100)}...`);
          result = await this.dbConnection.execute(translation.sql, translation.params);
        } else {
          logger.info(`⚠️ [DatabaseConnection] Cannot translate, executing directly...`);
          result = await this.dbConnection.execute(sql, params);
        }
      } else {
        // Delegate to the specific connection class
        result = await this.dbConnection.execute(sql, params);
      }

      // Track query performance (disabled for now due to SQL syntax errors)
      // if (this.monitoringEnabled && this.queryMonitor && queryInfo) {
      //   this.queryMonitor.endQuery(queryId, result, null);
      // }

      // Track performance metrics (disabled for now due to SQL syntax errors)
      // if (this.monitoringEnabled && this.performanceMonitor && queryInfo) {
      //   const executionTime = queryInfo.executionTime || 0;
      //   await this.performanceMonitor.trackQuery(sql, params, executionTime, result, this.type);
      // }

      return result;

    } catch (err) {
      error = err;
      
      // Track query error (disabled for now due to SQL syntax errors)
      // if (this.monitoringEnabled && this.queryMonitor && queryInfo) {
      //   this.queryMonitor.endQuery(queryId, null, error);
      // }

      throw error;
    }
  }

  async query(sql, params = []) {
    if (!this.isConnected || !this.dbConnection) {
      throw new Error('Database not connected');
    }

    // Check cache first
    if (this.monitoringEnabled && this.queryCache) {
      const cachedResult = await this.queryCache.get(sql, params);
      if (cachedResult) {
        this.queryCache.trackCache(this.generateCacheKey(sql, params), true);
        return cachedResult;
      }
    }

    const queryId = this.generateQueryId();
    let queryInfo = null;
    let result = null;
    let error = null;

    // Start query monitoring (disabled for now due to SQL syntax errors)
    // if (this.monitoringEnabled && this.queryMonitor) {
    //   queryInfo = this.queryMonitor.beginQuery(queryId, sql, params, this.type);
    // }

    try {
      // If using SQLite, translate PostgreSQL syntax to SQLite
      if (this.type === 'sqlite' && this.sqlTranslator.canTranslate(sql)) {
        const translation = this.sqlTranslator.translate(sql, params);
        logger.debug(`Querying translated SQL: ${translation.sql.substring(0, 100)}...`);
        result = await this.dbConnection.query(translation.sql, translation.params);
      } else {
        // Delegate to the specific connection class
        result = await this.dbConnection.query(sql, params);
      }

      // Track query performance (disabled for now due to SQL syntax errors)
      // if (this.monitoringEnabled && this.queryMonitor && queryInfo) {
      //   this.queryMonitor.endQuery(queryId, result, null);
      // }

      // Track performance metrics (disabled for now due to SQL syntax errors)
      // if (this.monitoringEnabled && this.performanceMonitor && queryInfo) {
      //   const executionTime = queryInfo.executionTime || 0;
      //   await this.performanceMonitor.trackQuery(sql, params, executionTime, result, this.type);
      // }

      // Cache result
      if (this.monitoringEnabled && this.queryCache && result) {
        await this.queryCache.set(sql, params, result);
        this.queryCache.trackCache(this.generateCacheKey(sql, params), false);
      }

      return result;

    } catch (err) {
      error = err;
      
      // Track query error (disabled for now due to SQL syntax errors)
      // if (this.monitoringEnabled && this.queryMonitor && queryInfo) {
      //   this.queryMonitor.endQuery(queryId, null, error);
      // }

      throw error;
    }
  }

  async getOne(sql, params = []) {
    if (!this.isConnected || !this.dbConnection) {
      throw new Error('Database not connected');
    }

    // If using SQLite, translate PostgreSQL syntax to SQLite
    if (this.type === 'sqlite' && this.sqlTranslator.canTranslate(sql)) {
      const translation = this.sqlTranslator.translate(sql, params);
      logger.debug(`Getting one with translated SQL: ${translation.sql.substring(0, 100)}...`);
      return await this.dbConnection.getOne(translation.sql, translation.params);
    }

    // Delegate to the specific connection class
    return await this.dbConnection.getOne(sql, params);
  }

  async disconnect() {
    if (this.dbConnection) {
      await this.dbConnection.disconnect();
      this.dbConnection = null;
      this.connection = null;
      this.isConnected = false;
    }
  }

  getConnection() {
    return this.connection;
  }

  getType() {
    return this.type;
  }

  getConnectionStatus() {
    if (this.dbConnection) {
      const status = this.dbConnection.getConnectionStatus();
      if (this.type === 'sqlite') {
        status.sqlTranslator = this.sqlTranslator.getStats();
      }
      
      // Add performance monitoring status
      if (this.monitoringEnabled) {
        status.performanceMonitoring = {
          enabled: this.monitoringEnabled,
          performanceMonitor: this.performanceMonitor ? this.performanceMonitor.getStats() : null,
          queryMonitor: this.queryMonitor ? this.queryMonitor.getStats() : null,
          queryCache: this.queryCache ? this.queryCache.getStats() : null
        };
      }
      
      return status;
    }
    
    return {
      type: this.type,
      isConnected: this.isConnected,
      database: this.config.database,
      performanceMonitoring: {
        enabled: this.monitoringEnabled,
        performanceMonitor: null,
        queryMonitor: null,
        queryCache: null
      }
    };
  }

  getRepository(repositoryName, eventBus = null, statusTransitionService = null) {
    // Always use PostgreSQL repositories with SQL translator for SQLite fallback
    const dbType = this.getType();
    
    if (dbType === 'sqlite') {
      // Use PostgreSQL repository with SQL translator for SQLite
      try {
        const RepositoryClass = require(`./PostgreSQL${repositoryName}Repository`);
        logger.debug(`Using PostgreSQL${repositoryName}Repository with SQL translator for SQLite`);
        return new RepositoryClass(this, eventBus, statusTransitionService);
      } catch (error) {
        if (error.code === 'MODULE_NOT_FOUND') {
          throw new Error(`Repository ${repositoryName} not implemented for PostgreSQL`);
        }
        throw error;
      }
    } else {
      // Use PostgreSQL repository directly for PostgreSQL
      try {
        const RepositoryClass = require(`./PostgreSQL${repositoryName}Repository`);
        return new RepositoryClass(this, eventBus, statusTransitionService);
      } catch (error) {
        if (error.code === 'MODULE_NOT_FOUND') {
          throw new Error(`Repository ${repositoryName} not implemented for PostgreSQL`);
        }
        throw error;
      }
    }
  }

  /**
   * Initialize performance monitoring components
   */
  async initializePerformanceMonitoring() {
    if (!this.monitoringEnabled) {
      logger.info('Performance monitoring disabled');
      return;
    }

    try {
      // Initialize performance monitor
      this.performanceMonitor = new PerformanceMonitor(this, {
        enabled: true,
        slowQueryThreshold: 1000,
        metricsRetentionDays: 30
      });

      // Initialize query monitor
      this.queryMonitor = new QueryMonitor(this, {
        enabled: true,
        slowQueryThreshold: 1000,
        trackExecutionPlans: false
      });

      // Initialize query cache
      this.queryCache = new QueryCache(this, {
        enabled: true,
        defaultTTL: 300000, // 5 minutes
        maxCacheSize: 1000
      });

      // Start monitoring
      this.performanceMonitor.start();
      this.queryMonitor.start();

      logger.info('Performance monitoring initialized');
      
    } catch (error) {
      logger.error('Error initializing performance monitoring:', error.message);
      this.monitoringEnabled = false;
    }
  }

  /**
   * Initialize performance optimization components
   */
  async initializePerformanceOptimization() {
    if (!this.optimizationEnabled) {
      logger.info('Performance optimization disabled');
      return;
    }

    try {
      // Initialize query optimizer
      this.queryOptimizer = new QueryOptimizer(this);

      // Initialize index manager
      this.indexManager = new IndexManager(this);

      // Initialize partition manager
      this.partitionManager = new PartitionManager(this);

      // Initialize materialized view manager
      this.materializedViewManager = new MaterializedViewManager(this);

      // Initialize performance schema
      this.performanceSchema = new PerformanceSchema(this);

      // Start optimization services
      await this.startOptimizationServices();

      logger.info('Performance optimization initialized');
      
    } catch (error) {
      logger.error('Error initializing performance optimization:', error.message);
      this.optimizationEnabled = false;
    }
  }

  /**
   * Start optimization services
   */
  async startOptimizationServices() {
    // Start background optimization tasks
    setInterval(async () => {
      try {
        await this.performBackgroundOptimization();
      } catch (error) {
        logger.error('Background optimization failed:', error.message);
      }
    }, 300000); // Every 5 minutes
  }

  /**
   * Perform background optimization
   */
  async performBackgroundOptimization() {
    if (!this.optimizationEnabled) return;

    try {
      // Analyze index usage
      const indexAnalysis = await this.indexManager.analyzeIndexUsage();
      
      // Generate optimization recommendations
      const recommendations = await this.generateOptimizationRecommendations(indexAnalysis);
      
      // Apply automatic optimizations
      await this.applyAutomaticOptimizations(recommendations);
      
    } catch (error) {
      logger.error('Background optimization failed:', error.message);
    }
  }

  /**
   * Generate optimization recommendations
   */
  async generateOptimizationRecommendations(analysis) {
    const recommendations = [];
    
    // Add index recommendations
    if (analysis.recommendations) {
      recommendations.push(...analysis.recommendations);
    }
    
    return recommendations;
  }

  /**
   * Apply automatic optimizations
   */
  async applyAutomaticOptimizations(recommendations) {
    for (const recommendation of recommendations) {
      if (recommendation.autoApply) {
        try {
          await this.applyOptimization(recommendation);
        } catch (error) {
          logger.error('Failed to apply optimization:', error.message);
        }
      }
    }
  }

  /**
   * Apply optimization recommendation
   */
  async applyOptimization(recommendation) {
    switch (recommendation.type) {
      case 'index':
        await this.indexManager.createIndex(
          recommendation.table,
          recommendation.columns,
          recommendation.options
        );
        break;
      case 'query':
        await this.queryOptimizer.optimizeQuery(
          recommendation.query,
          recommendation.params
        );
        break;
      case 'partition':
        await this.partitionManager.createPartition(
          recommendation.table,
          recommendation.partitionKey,
          recommendation.strategy,
          recommendation.options
        );
        break;
      case 'materialized_view':
        await this.materializedViewManager.createMaterializedView(
          recommendation.name,
          recommendation.query,
          recommendation.options
        );
        break;
    }
  }

  /**
   * Generate unique query ID
   * @returns {string} Query ID
   */
  generateQueryId() {
    return `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate cache key
   * @param {string} query - SQL query
   * @param {Array} params - Query parameters
   * @returns {string} Cache key
   */
  generateCacheKey(query, params) {
    const crypto = require('crypto');
    const normalizedQuery = query.replace(/\s+/g, ' ').trim().toLowerCase();
    const queryString = normalizedQuery + JSON.stringify(params || []);
    return crypto.createHash('sha256').update(queryString).digest('hex').substring(0, 16);
  }

  /**
   * Get performance monitoring instance
   * @returns {PerformanceMonitor} Performance monitor instance
   */
  getPerformanceMonitor() {
    return this.performanceMonitor;
  }

  /**
   * Get query monitor instance
   * @returns {QueryMonitor} Query monitor instance
   */
  getQueryMonitor() {
    return this.queryMonitor;
  }

  /**
   * Get query cache instance
   * @returns {QueryCache} Query cache instance
   */
  getQueryCache() {
    return this.queryCache;
  }

  /**
   * Get query optimizer instance
   * @returns {QueryOptimizer} Query optimizer instance
   */
  getQueryOptimizer() {
    return this.queryOptimizer;
  }

  /**
   * Get index manager instance
   * @returns {IndexManager} Index manager instance
   */
  getIndexManager() {
    return this.indexManager;
  }

  /**
   * Get partition manager instance
   * @returns {PartitionManager} Partition manager instance
   */
  getPartitionManager() {
    return this.partitionManager;
  }

  /**
   * Get materialized view manager instance
   * @returns {MaterializedViewManager} Materialized view manager instance
   */
  getMaterializedViewManager() {
    return this.materializedViewManager;
  }

  /**
   * Get performance schema instance
   * @returns {PerformanceSchema} Performance schema instance
   */
  getPerformanceSchema() {
    return this.performanceSchema;
  }

  /**
   * Enable performance monitoring
   */
  enablePerformanceMonitoring() {
    this.monitoringEnabled = true;
    if (!this.performanceMonitor) {
      this.initializePerformanceMonitoring();
    }
  }

  /**
   * Disable performance monitoring
   */
  disablePerformanceMonitoring() {
    this.monitoringEnabled = false;
    if (this.performanceMonitor) {
      this.performanceMonitor.stop();
    }
    if (this.queryMonitor) {
      this.queryMonitor.stop();
    }
    if (this.queryCache) {
      this.queryCache.destroy();
    }
  }
}

module.exports = DatabaseConnection; 