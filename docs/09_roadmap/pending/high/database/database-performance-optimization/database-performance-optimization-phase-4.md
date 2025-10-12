# Database Performance Optimization - Phase 4: Integration & Connectivity

## Phase Overview
- **Phase**: 4 - Integration & Connectivity
- **Status**: Pending
- **Duration**: 2 hours
- **Progress**: 0%

## Objectives
- Connect components with existing systems
- Update API endpoints and controllers
- Integrate frontend and backend components
- Implement event handling and messaging
- Connect database repositories and services
- Set up WebSocket connections if needed

## Implementation Tasks

### Database Connection Integration
- [ ] Update DatabaseConnection.js with optimization utilities
- [ ] Add optimization hooks to PostgreSQLConnection.js
- [ ] Add optimization hooks to SQLiteConnection.js
- [ ] Integrate with existing PerformanceMonitor.js
- [ ] Connect with QueryMonitor.js and QueryCache.js

### Service Container Integration
- [ ] Register optimization services in ServiceContainer
- [ ] Add dependency injection for optimization utilities
- [ ] Configure service lifecycle management
- [ ] Set up service dependencies and relationships

### Application Services Integration
- [ ] Create DatabaseOptimizationService.js
- [ ] Create PerformanceAnalysisService.js
- [ ] Create QueryOptimizationService.js
- [ ] Create IndexManagementService.js
- [ ] Integrate with existing application services

### API Integration
- [ ] Create DatabaseOptimizationController.js
- [ ] Create PerformanceMonitoringController.js
- [ ] Add optimization routes to API
- [ ] Add performance monitoring routes to API
- [ ] Integrate with existing API structure

### Event System Integration
- [ ] Add optimization events to EventBus
- [ ] Implement event handlers for optimization operations
- [ ] Add performance monitoring events
- [ ] Connect with existing event system

### Repository Integration
- [ ] Update existing repositories with optimization features
- [ ] Add performance monitoring to repository operations
- [ ] Integrate optimization utilities with repositories
- [ ] Connect with existing repository pattern

## Implementation Details

### DatabaseConnection.js Integration
```javascript
// Add to DatabaseConnection.js
const QueryOptimizer = require('./QueryOptimizer');
const IndexManager = require('./IndexManager');
const PartitionManager = require('./PartitionManager');
const MaterializedViewManager = require('./MaterializedViewManager');

class DatabaseConnection {
  constructor(config) {
    // ... existing code ...
    
    // Performance optimization components
    this.queryOptimizer = null;
    this.indexManager = null;
    this.partitionManager = null;
    this.materializedViewManager = null;
    this.optimizationEnabled = config.optimization !== false;
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
      // Initialize optimization utilities
      this.queryOptimizer = new QueryOptimizer(this);
      this.indexManager = new IndexManager(this);
      this.partitionManager = new PartitionManager(this);
      this.materializedViewManager = new MaterializedViewManager(this);

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
}
```

### ServiceContainer Integration
```javascript
// Add to ServiceContainer.js
const QueryOptimizer = require('../infrastructure/database/QueryOptimizer');
const IndexManager = require('../infrastructure/database/IndexManager');
const PartitionManager = require('../infrastructure/database/PartitionManager');
const MaterializedViewManager = require('../infrastructure/database/MaterializedViewManager');

class ServiceContainer {
  constructor() {
    // ... existing code ...
    
    // Register optimization services
    this.registerOptimizationServices();
  }

  /**
   * Register optimization services
   */
  registerOptimizationServices() {
    // Register as singletons
    this.registerSingleton('queryOptimizer', (container) => {
      const databaseConnection = container.resolve('databaseConnection');
      return new QueryOptimizer(databaseConnection);
    });

    this.registerSingleton('indexManager', (container) => {
      const databaseConnection = container.resolve('databaseConnection');
      return new IndexManager(databaseConnection);
    });

    this.registerSingleton('partitionManager', (container) => {
      const databaseConnection = container.resolve('databaseConnection');
      return new PartitionManager(databaseConnection);
    });

    this.registerSingleton('materializedViewManager', (container) => {
      const databaseConnection = container.resolve('databaseConnection');
      return new MaterializedViewManager(databaseConnection);
    });
  }
}
```

### DatabaseOptimizationService.js
```javascript
/**
 * DatabaseOptimizationService - Application Layer
 * Orchestrates database optimization operations
 */
const Logger = require('@logging/Logger');

class DatabaseOptimizationService {
  constructor(queryOptimizer, indexManager, partitionManager, materializedViewManager) {
    this.queryOptimizer = queryOptimizer;
    this.indexManager = indexManager;
    this.partitionManager = partitionManager;
    this.materializedViewManager = materializedViewManager;
    this.logger = new Logger('DatabaseOptimizationService');
  }

  /**
   * Perform database optimization
   * @param {Object} options - Optimization options
   * @returns {Promise<Object>} Optimization result
   */
  async performOptimization(options = {}) {
    try {
      this.logger.info('Starting database optimization', { options });

      const results = {
        queryOptimization: null,
        indexOptimization: null,
        partitionOptimization: null,
        materializedViewOptimization: null,
        timestamp: new Date().toISOString()
      };

      // Query optimization
      if (options.queryOptimization !== false) {
        results.queryOptimization = await this.optimizeQueries(options);
      }

      // Index optimization
      if (options.indexOptimization !== false) {
        results.indexOptimization = await this.optimizeIndexes(options);
      }

      // Partition optimization
      if (options.partitionOptimization !== false) {
        results.partitionOptimization = await this.optimizePartitions(options);
      }

      // Materialized view optimization
      if (options.materializedViewOptimization !== false) {
        results.materializedViewOptimization = await this.optimizeMaterializedViews(options);
      }

      this.logger.info('Database optimization completed', { results });

      return results;

    } catch (error) {
      this.logger.error('Database optimization failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Optimize queries
   * @param {Object} options - Optimization options
   * @returns {Promise<Object>} Query optimization result
   */
  async optimizeQueries(options) {
    try {
      this.logger.debug('Optimizing queries');

      // Get slow queries
      const slowQueries = await this.getSlowQueries(options);
      
      // Optimize each slow query
      const optimizations = [];
      for (const query of slowQueries) {
        const optimization = await this.queryOptimizer.optimizeQuery(
          query.query,
          query.params
        );
        optimizations.push(optimization);
      }

      return {
        slowQueries: slowQueries.length,
        optimizations: optimizations.length,
        estimatedImprovement: optimizations.reduce((sum, opt) => sum + opt.performanceGain, 0),
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('Query optimization failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Optimize indexes
   * @param {Object} options - Optimization options
   * @returns {Promise<Object>} Index optimization result
   */
  async optimizeIndexes(options) {
    try {
      this.logger.debug('Optimizing indexes');

      // Analyze index usage
      const analysis = await this.indexManager.analyzeIndexUsage();
      
      // Apply index optimizations
      const optimizations = [];
      for (const recommendation of analysis.recommendations) {
        if (recommendation.action === 'create') {
          const result = await this.indexManager.createIndex(
            recommendation.table,
            recommendation.columns,
            recommendation.options
          );
          optimizations.push(result);
        }
      }

      return {
        analysis,
        optimizations: optimizations.length,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('Index optimization failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Optimize partitions
   * @param {Object} options - Optimization options
   * @returns {Promise<Object>} Partition optimization result
   */
  async optimizePartitions(options) {
    try {
      this.logger.debug('Optimizing partitions');

      // Get partition management recommendations
      const recommendations = await this.partitionManager.managePartitions(options.table);
      
      // Apply partition optimizations
      const optimizations = [];
      for (const action of recommendations.managementActions) {
        if (action.type === 'create') {
          const result = await this.partitionManager.createPartition(
            action.table,
            action.partitionKey,
            action.strategy,
            action.options
          );
          optimizations.push(result);
        }
      }

      return {
        recommendations,
        optimizations: optimizations.length,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('Partition optimization failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Optimize materialized views
   * @param {Object} options - Optimization options
   * @returns {Promise<Object>} Materialized view optimization result
   */
  async optimizeMaterializedViews(options) {
    try {
      this.logger.debug('Optimizing materialized views');

      // Refresh materialized views
      const views = options.views || ['task_performance_summary', 'user_activity_summary'];
      const refreshes = [];
      
      for (const viewName of views) {
        const result = await this.materializedViewManager.refreshMaterializedView(viewName);
        refreshes.push(result);
      }

      return {
        views: views.length,
        refreshes: refreshes.length,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('Materialized view optimization failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Get slow queries
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Slow queries
   */
  async getSlowQueries(options) {
    // Implementation to get slow queries from performance monitoring
    return [];
  }
}

module.exports = DatabaseOptimizationService;
```

### DatabaseOptimizationController.js
```javascript
/**
 * DatabaseOptimizationController - Presentation Layer
 * Handles database optimization API requests
 */
const Logger = require('@logging/Logger');

class DatabaseOptimizationController {
  constructor(databaseOptimizationService) {
    this.databaseOptimizationService = databaseOptimizationService;
    this.logger = new Logger('DatabaseOptimizationController');
  }

  /**
   * Perform database optimization
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  async optimizeDatabase(req, res) {
    try {
      this.logger.info('Database optimization request received', { 
        body: req.body,
        user: req.user?.id 
      });

      const options = req.body || {};
      const result = await this.databaseOptimizationService.performOptimization(options);

      res.json({
        success: true,
        data: result,
        message: 'Database optimization completed successfully'
      });

    } catch (error) {
      this.logger.error('Database optimization failed', { 
        error: error.message,
        user: req.user?.id 
      });

      res.status(500).json({
        success: false,
        error: error.message,
        message: 'Database optimization failed'
      });
    }
  }

  /**
   * Get optimization recommendations
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  async getOptimizationRecommendations(req, res) {
    try {
      this.logger.info('Optimization recommendations request received', { 
        user: req.user?.id 
      });

      const recommendations = await this.databaseOptimizationService.getOptimizationRecommendations();

      res.json({
        success: true,
        data: recommendations,
        message: 'Optimization recommendations retrieved successfully'
      });

    } catch (error) {
      this.logger.error('Failed to get optimization recommendations', { 
        error: error.message,
        user: req.user?.id 
      });

      res.status(500).json({
        success: false,
        error: error.message,
        message: 'Failed to get optimization recommendations'
      });
    }
  }

  /**
   * Get optimization status
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  async getOptimizationStatus(req, res) {
    try {
      this.logger.info('Optimization status request received', { 
        user: req.user?.id 
      });

      const status = await this.databaseOptimizationService.getOptimizationStatus();

      res.json({
        success: true,
        data: status,
        message: 'Optimization status retrieved successfully'
      });

    } catch (error) {
      this.logger.error('Failed to get optimization status', { 
        error: error.message,
        user: req.user?.id 
      });

      res.status(500).json({
        success: false,
        error: error.message,
        message: 'Failed to get optimization status'
      });
    }
  }
}

module.exports = DatabaseOptimizationController;
```

### API Routes Integration
```javascript
// Add to routes/database-optimization.js
const express = require('express');
const DatabaseOptimizationController = require('../controllers/DatabaseOptimizationController');

function createDatabaseOptimizationRoutes(databaseOptimizationService) {
  const router = express.Router();
  const controller = new DatabaseOptimizationController(databaseOptimizationService);

  // Database optimization endpoints
  router.post('/optimize', controller.optimizeDatabase.bind(controller));
  router.get('/recommendations', controller.getOptimizationRecommendations.bind(controller));
  router.get('/status', controller.getOptimizationStatus.bind(controller));

  return router;
}

module.exports = createDatabaseOptimizationRoutes;
```

## Success Criteria
- [ ] Database connection integration completed
- [ ] Service container integration completed
- [ ] Application services created and integrated
- [ ] API controllers and routes implemented
- [ ] Event system integration completed
- [ ] Repository integration completed
- [ ] All components connected and working
- [ ] Integration tests passing

## Next Phase
**Phase 5**: Testing Implementation - Create comprehensive test coverage

## Notes
- Integration is critical for system functionality
- Proper error handling during integration
- Performance impact of integration must be monitored
- All components must work together seamlessly

---
**Phase 4 Status**: Pending