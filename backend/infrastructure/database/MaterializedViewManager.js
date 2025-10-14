/**
 * MaterializedViewManager - Database materialized view management
 * Provides materialized view creation, refresh, and optimization
 */
const Logger = require("@logging/Logger");

class MaterializedViewManager {
  constructor(databaseConnection) {
    this.db = databaseConnection;
    this.logger = new Logger("MaterializedViewManager");
    this.viewCache = new Map();
    this.refreshSchedule = new Map();
    this.viewTemplates = new Map();

    this.initializeViewTemplates();
  }

  /**
   * Initialize materialized view templates
   */
  initializeViewTemplates() {
    this.viewTemplates.set("task_performance_summary", {
      description: "Task performance summary by date and status",
      query: `
        SELECT 
          DATE(created_at) as date,
          status,
          priority,
          COUNT(*) as total_tasks,
          AVG(execution_time) as avg_execution_time,
          MIN(execution_time) as min_execution_time,
          MAX(execution_time) as max_execution_time,
          SUM(execution_time) as total_execution_time
        FROM tasks
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY DATE(created_at), status, priority
        ORDER BY date DESC, status, priority
      `,
      refreshInterval: 3600000, // 1 hour
      dependencies: ["tasks"],
    });

    this.viewTemplates.set("user_activity_summary", {
      description: "User activity summary by date",
      query: `
        SELECT 
          user_id,
          DATE(created_at) as date,
          COUNT(*) as total_tasks,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tasks,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_tasks,
          AVG(execution_time) as avg_execution_time,
          SUM(execution_time) as total_execution_time
        FROM tasks
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY user_id, DATE(created_at)
        ORDER BY user_id, date DESC
      `,
      refreshInterval: 1800000, // 30 minutes
      dependencies: ["tasks"],
    });

    this.viewTemplates.set("project_performance_summary", {
      description: "Project performance summary by date",
      query: `
        SELECT 
          project_id,
          DATE(created_at) as date,
          COUNT(*) as total_tasks,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tasks,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_tasks,
          AVG(execution_time) as avg_execution_time,
          SUM(execution_time) as total_execution_time
        FROM tasks
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY project_id, DATE(created_at)
        ORDER BY project_id, date DESC
      `,
      refreshInterval: 1800000, // 30 minutes
      dependencies: ["tasks"],
    });

    this.viewTemplates.set("workflow_performance_summary", {
      description: "Workflow performance summary by type and date",
      query: `
        SELECT 
          workflow_type,
          DATE(created_at) as date,
          COUNT(*) as total_workflows,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_workflows,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_workflows,
          AVG(execution_time_ms) as avg_execution_time_ms,
          SUM(execution_time_ms) as total_execution_time_ms
        FROM queue_history
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY workflow_type, DATE(created_at)
        ORDER BY workflow_type, date DESC
      `,
      refreshInterval: 1800000, // 30 minutes
      dependencies: ["queue_history"],
    });
  }

  /**
   * Create materialized view
   * @param {string} name - View name
   * @param {string} query - View query
   * @param {Object} options - View options
   * @returns {Promise<Object>} View creation result
   */
  async createMaterializedView(name, query, options = {}) {
    try {
      this.logger.info("Creating materialized view", {
        name,
        query: this.sanitizeQuery(query),
        options,
      });

      // Check if view already exists
      const existingView = await this.getMaterializedView(name);
      if (existingView) {
        this.logger.warn("Materialized view already exists", { name });
        return existingView;
      }

      const viewSQL = this.generateViewSQL(name, query, options);

      // Create the materialized view
      await this.db.execute(viewSQL);

      const result = {
        name,
        query,
        options,
        createdAt: new Date().toISOString(),
        status: "active",
        lastRefreshed: null,
        refreshCount: 0,
      };

      // Cache the view
      this.viewCache.set(name, result);

      // Schedule automatic refresh if specified
      if (options.autoRefresh && options.refreshInterval) {
        this.scheduleRefresh(name, options.refreshInterval);
      }

      this.logger.info("Materialized view created successfully", { name });

      return result;
    } catch (error) {
      this.logger.error("Materialized view creation failed", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Create materialized view from template
   * @param {string} templateName - Template name
   * @param {Object} options - View options
   * @returns {Promise<Object>} View creation result
   */
  async createFromTemplate(templateName, options = {}) {
    try {
      this.logger.info("Creating materialized view from template", {
        templateName,
        options,
      });

      const template = this.viewTemplates.get(templateName);
      if (!template) {
        throw new Error(`Unknown materialized view template: ${templateName}`);
      }

      const viewOptions = {
        ...template,
        ...options,
      };

      return await this.createMaterializedView(
        templateName,
        template.query,
        viewOptions,
      );
    } catch (error) {
      this.logger.error("Failed to create materialized view from template", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Refresh materialized view
   * @param {string} name - View name
   * @param {Object} options - Refresh options
   * @returns {Promise<Object>} Refresh result
   */
  async refreshMaterializedView(name, options = {}) {
    try {
      this.logger.info("Refreshing materialized view", { name, options });

      const view = await this.getMaterializedView(name);
      if (!view) {
        throw new Error(`Materialized view ${name} not found`);
      }

      const concurrent = options.concurrent ? "CONCURRENTLY " : "";
      const refreshSQL = `REFRESH MATERIALIZED VIEW ${concurrent}${name}`;

      const startTime = Date.now();
      await this.db.execute(refreshSQL);
      const refreshTime = Date.now() - startTime;

      // Update view information
      view.lastRefreshed = new Date().toISOString();
      view.refreshCount = (view.refreshCount || 0) + 1;
      view.lastRefreshTime = refreshTime;

      // Update cache
      this.viewCache.set(name, view);

      const result = {
        name,
        refreshedAt: view.lastRefreshed,
        refreshTime,
        refreshCount: view.refreshCount,
        status: "refreshed",
      };

      this.logger.info("Materialized view refreshed successfully", {
        name,
        refreshTime,
        refreshCount: view.refreshCount,
      });

      return result;
    } catch (error) {
      this.logger.error("Materialized view refresh failed", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Refresh all materialized views
   * @param {Object} options - Refresh options
   * @returns {Promise<Object>} Refresh result
   */
  async refreshAllMaterializedViews(options = {}) {
    try {
      this.logger.info("Refreshing all materialized views", { options });

      const views = await this.getAllMaterializedViews();
      const results = [];

      for (const view of views) {
        try {
          const result = await this.refreshMaterializedView(view.name, options);
          results.push(result);
        } catch (error) {
          this.logger.error("Failed to refresh materialized view", {
            name: view.name,
            error: error.message,
          });
          results.push({
            name: view.name,
            status: "failed",
            error: error.message,
          });
        }
      }

      const summary = {
        totalViews: views.length,
        refreshedViews: results.filter((r) => r.status === "refreshed").length,
        failedViews: results.filter((r) => r.status === "failed").length,
        results,
        timestamp: new Date().toISOString(),
      };

      this.logger.info("All materialized views refresh completed", {
        totalViews: summary.totalViews,
        refreshedViews: summary.refreshedViews,
        failedViews: summary.failedViews,
      });

      return summary;
    } catch (error) {
      this.logger.error("Failed to refresh all materialized views", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get materialized view information
   * @param {string} name - View name
   * @returns {Promise<Object>} View information
   */
  async getMaterializedView(name) {
    try {
      // Check cache first
      if (this.viewCache.has(name)) {
        return this.viewCache.get(name);
      }

      // Query database for view information
      const query = `
        SELECT 
          schemaname,
          matviewname,
          definition,
          hasindexes
        FROM pg_matviews
        WHERE matviewname = $1
      `;

      const result = await this.db.execute(query, [name]);

      if (result.rows.length === 0) {
        return null;
      }

      const viewInfo = result.rows[0];
      const view = {
        schema: viewInfo.schemaname,
        name: viewInfo.matviewname,
        definition: viewInfo.definition,
        hasIndexes: viewInfo.hasindexes,
        status: "active",
        lastRefreshed: null,
        refreshCount: 0,
      };

      // Cache the view
      this.viewCache.set(name, view);

      return view;
    } catch (error) {
      this.logger.error("Failed to get materialized view", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get all materialized views
   * @returns {Promise<Array>} All materialized views
   */
  async getAllMaterializedViews() {
    try {
      this.logger.debug("Getting all materialized views");

      const query = `
        SELECT 
          schemaname,
          matviewname,
          definition,
          hasindexes
        FROM pg_matviews
        ORDER BY matviewname
      `;

      const result = await this.db.execute(query);

      const views = result.rows.map((row) => ({
        schema: row.schemaname,
        name: row.matviewname,
        definition: row.definition,
        hasIndexes: row.hasindexes,
        status: "active",
        lastRefreshed: null,
        refreshCount: 0,
      }));

      this.logger.debug("Retrieved materialized views", {
        count: views.length,
      });

      return views;
    } catch (error) {
      this.logger.error("Failed to get all materialized views", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Drop materialized view
   * @param {string} name - View name
   * @returns {Promise<Object>} View drop result
   */
  async dropMaterializedView(name) {
    try {
      this.logger.info("Dropping materialized view", { name });

      const view = await this.getMaterializedView(name);
      if (!view) {
        throw new Error(`Materialized view ${name} not found`);
      }

      const dropSQL = `DROP MATERIALIZED VIEW IF EXISTS ${name}`;
      await this.db.execute(dropSQL);

      // Remove from cache
      this.viewCache.delete(name);

      // Cancel scheduled refresh
      this.cancelRefresh(name);

      const result = {
        name,
        droppedAt: new Date().toISOString(),
        status: "dropped",
      };

      this.logger.info("Materialized view dropped successfully", { name });

      return result;
    } catch (error) {
      this.logger.error("Materialized view drop failed", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Schedule automatic refresh
   * @param {string} name - View name
   * @param {number} interval - Refresh interval in milliseconds
   */
  scheduleRefresh(name, interval) {
    const schedule = {
      name,
      interval,
      lastRefresh: null,
      nextRefresh: new Date(Date.now() + interval),
      timer: null,
    };

    // Set up interval timer
    schedule.timer = setInterval(async () => {
      try {
        await this.refreshMaterializedView(name);
        schedule.lastRefresh = new Date();
        schedule.nextRefresh = new Date(Date.now() + interval);
      } catch (error) {
        this.logger.error("Scheduled refresh failed", {
          name,
          error: error.message,
        });
      }
    }, interval);

    this.refreshSchedule.set(name, schedule);

    this.logger.info("Materialized view refresh scheduled", { name, interval });
  }

  /**
   * Cancel scheduled refresh
   * @param {string} name - View name
   */
  cancelRefresh(name) {
    const schedule = this.refreshSchedule.get(name);
    if (schedule && schedule.timer) {
      clearInterval(schedule.timer);
      this.refreshSchedule.delete(name);
      this.logger.info("Materialized view refresh cancelled", { name });
    }
  }

  /**
   * Generate view SQL
   * @param {string} name - View name
   * @param {string} query - View query
   * @param {Object} options - View options
   * @returns {string} View SQL
   */
  generateViewSQL(name, query, options) {
    const concurrent = options.concurrent ? "CONCURRENTLY " : "";
    const withData = options.withData !== false ? "WITH DATA" : "WITH NO DATA";

    return `CREATE MATERIALIZED VIEW ${concurrent}${name} AS ${query} ${withData}`;
  }

  /**
   * Sanitize query for logging
   * @param {string} query - SQL query
   * @returns {string} Sanitized query
   */
  sanitizeQuery(query) {
    return query.replace(/\s+/g, " ").trim();
  }

  /**
   * Get materialized view statistics
   * @returns {Object} View statistics
   */
  getViewStats() {
    return {
      totalViews: this.viewCache.size,
      scheduledRefreshes: this.refreshSchedule.size,
      viewTemplates: Array.from(this.viewTemplates.keys()),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get refresh schedule
   * @returns {Array} Refresh schedule
   */
  getRefreshSchedule() {
    return Array.from(this.refreshSchedule.values()).map((schedule) => ({
      name: schedule.name,
      interval: schedule.interval,
      lastRefresh: schedule.lastRefresh,
      nextRefresh: schedule.nextRefresh,
    }));
  }

  /**
   * Clear view cache
   */
  clearCache() {
    this.viewCache.clear();
    this.logger.info("Materialized view cache cleared");
  }

  /**
   * Stop all scheduled refreshes
   */
  stopAllScheduledRefreshes() {
    for (const [name, schedule] of this.refreshSchedule) {
      if (schedule.timer) {
        clearInterval(schedule.timer);
      }
    }
    this.refreshSchedule.clear();
    this.logger.info("All scheduled refreshes stopped");
  }
}

module.exports = MaterializedViewManager;
