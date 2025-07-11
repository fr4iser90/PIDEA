# Unified Workflow Performance Main.1: Database & Infrastructure

## 1. Project Overview
- **Feature/Component Name**: Database & Infrastructure
- **Priority**: High
- **Estimated Time**: 40 hours (1 week)
- **Dependencies**: Foundation 1A (Core Interfaces & Context), Foundation 1B (Builder Pattern & Common Steps), Performance 3A.1-3A.4 (Sequential Execution), Performance 3B.1-3B.4 (Unified Handlers)
- **Related Issues**: No workflow execution tracking, missing database schema, no infrastructure layer

## 2. Technical Requirements
- **Tech Stack**: Node.js, JavaScript ES6+, PostgreSQL, Domain-Driven Design
- **Architecture Pattern**: DDD with database infrastructure
- **Database Changes**: Add workflow executions table and related schema
- **API Changes**: New workflow execution endpoints
- **Frontend Changes**: None (backend infrastructure)
- **Backend Changes**: Database infrastructure and workflow persistence

## 3. Implementation Files

#### Files to Create:
- [ ] `backend/infrastructure/database/migrations/002_create_workflow_executions.sql` - Database migration
- [ ] `backend/infrastructure/database/migrations/003_create_workflow_metrics.sql` - Metrics migration
- [ ] `backend/infrastructure/database/migrations/004_create_handler_registry.sql` - Handler registry migration
- [ ] `backend/domain/repositories/WorkflowExecutionRepository.js` - Repository for workflow executions
- [ ] `backend/domain/repositories/WorkflowMetricsRepository.js` - Repository for workflow metrics
- [ ] `backend/domain/repositories/HandlerRegistryRepository.js` - Repository for handler registry
- [ ] `backend/infrastructure/workflow/WorkflowRepository.js` - Workflow persistence
- [ ] `backend/infrastructure/workflow/WorkflowEventHandlers.js` - Workflow event management
- [ ] `backend/infrastructure/workflow/WorkflowCache.js` - Workflow caching layer
- [ ] `backend/infrastructure/workflow/WorkflowPersistenceService.js` - Workflow persistence service
- [ ] `backend/infrastructure/workflow/WorkflowEventService.js` - Workflow event service
- [ ] `backend/infrastructure/workflow/WorkflowCacheService.js` - Workflow cache service

#### Files to Modify:
- [ ] `backend/infrastructure/database/DatabaseConnection.js` - Add workflow execution support
- [ ] `backend/infrastructure/di/ServiceRegistry.js` - Register new services
- [ ] `backend/domain/entities/Task.js` - Add workflow execution metadata
- [ ] `backend/domain/entities/TaskExecution.js` - Add sequential execution tracking

## 4. Implementation Phases

#### Phase 1: Database Schema (12 hours)
- [ ] Create workflow executions table migration
- [ ] Create workflow metrics table migration
- [ ] Create handler registry table migration
- [ ] Add indexes and constraints
- [ ] Create seed data for testing

#### Phase 2: Repository Layer (12 hours)
- [ ] Implement `WorkflowExecutionRepository.js`
- [ ] Create `WorkflowMetricsRepository.js`
- [ ] Implement `HandlerRegistryRepository.js`
- [ ] Add repository interfaces and implementations
- [ ] Add repository tests

#### Phase 3: Infrastructure Services (12 hours)
- [ ] Implement `WorkflowRepository.js` for persistence
- [ ] Create `WorkflowEventHandlers.js` for event management
- [ ] Build `WorkflowCache.js` for caching
- [ ] Add persistence, event, and cache services
- [ ] Integrate with existing services

#### Phase 4: Integration & Testing (4 hours)
- [ ] Update entity classes with workflow metadata
- [ ] Register new services in dependency injection
- [ ] Add integration tests
- [ ] Update documentation

## 5. Database Schema Design

#### Workflow Executions Table
```sql
-- Migration: 002_create_workflow_executions.sql
CREATE TABLE workflow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id VARCHAR(255) UNIQUE NOT NULL,
    workflow_id VARCHAR(255) NOT NULL,
    workflow_name VARCHAR(255) NOT NULL,
    workflow_version VARCHAR(50),
    task_id UUID REFERENCES tasks(id),
    user_id VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    strategy VARCHAR(100),
    priority INTEGER DEFAULT 1,
    estimated_duration INTEGER, -- milliseconds
    actual_duration INTEGER, -- milliseconds
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    result_data JSONB,
    error_data JSONB,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_workflow_executions_execution_id ON workflow_executions(execution_id);
CREATE INDEX idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX idx_workflow_executions_task_id ON workflow_executions(task_id);
CREATE INDEX idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX idx_workflow_executions_start_time ON workflow_executions(start_time);
CREATE INDEX idx_workflow_executions_user_id ON workflow_executions(user_id);

-- Update trigger
CREATE OR REPLACE FUNCTION update_workflow_executions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_workflow_executions_updated_at
    BEFORE UPDATE ON workflow_executions
    FOR EACH ROW
    EXECUTE FUNCTION update_workflow_executions_updated_at();
```

#### Workflow Metrics Table
```sql
-- Migration: 003_create_workflow_metrics.sql
CREATE TABLE workflow_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id VARCHAR(255) REFERENCES workflow_executions(execution_id),
    metric_name VARCHAR(255) NOT NULL,
    metric_value DECIMAL(15,4),
    metric_unit VARCHAR(50),
    metric_type VARCHAR(50), -- 'performance', 'resource', 'quality'
    metadata JSONB,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_workflow_metrics_execution_id ON workflow_metrics(execution_id);
CREATE INDEX idx_workflow_metrics_metric_name ON workflow_metrics(metric_name);
CREATE INDEX idx_workflow_metrics_metric_type ON workflow_metrics(metric_type);
CREATE INDEX idx_workflow_metrics_recorded_at ON workflow_metrics(recorded_at);
```

#### Handler Registry Table
```sql
-- Migration: 004_create_handler_registry.sql
CREATE TABLE handler_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    handler_type VARCHAR(255) UNIQUE NOT NULL,
    handler_name VARCHAR(255) NOT NULL,
    handler_class VARCHAR(255),
    handler_path VARCHAR(500),
    version VARCHAR(50),
    description TEXT,
    capabilities JSONB,
    configuration JSONB,
    is_active BOOLEAN DEFAULT true,
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_handler_registry_handler_type ON handler_registry(handler_type);
CREATE INDEX idx_handler_registry_handler_name ON handler_registry(handler_name);
CREATE INDEX idx_handler_registry_is_active ON handler_registry(is_active);

-- Update trigger
CREATE TRIGGER trigger_handler_registry_updated_at
    BEFORE UPDATE ON handler_registry
    FOR EACH ROW
    EXECUTE FUNCTION update_workflow_executions_updated_at();
```

## 6. Repository Layer Design

#### WorkflowExecutionRepository Implementation
```javascript
/**
 * Repository for workflow executions
 */
class WorkflowExecutionRepository {
  constructor(databaseConnection) {
    this.db = databaseConnection;
  }

  /**
   * Create workflow execution
   * @param {Object} execution - Execution data
   * @returns {Promise<Object>} Created execution
   */
  async create(execution) {
    const query = `
      INSERT INTO workflow_executions (
        execution_id, workflow_id, workflow_name, workflow_version,
        task_id, user_id, status, strategy, priority, estimated_duration,
        start_time, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const values = [
      execution.executionId,
      execution.workflowId,
      execution.workflowName,
      execution.workflowVersion,
      execution.taskId,
      execution.userId,
      execution.status,
      execution.strategy,
      execution.priority,
      execution.estimatedDuration,
      execution.startTime,
      JSON.stringify(execution.metadata || {})
    ];

    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  /**
   * Find execution by ID
   * @param {string} executionId - Execution ID
   * @returns {Promise<Object|null>} Execution or null
   */
  async findByExecutionId(executionId) {
    const query = `
      SELECT * FROM workflow_executions 
      WHERE execution_id = $1
    `;

    const result = await this.db.query(query, [executionId]);
    return result.rows[0] || null;
  }

  /**
   * Update execution
   * @param {string} executionId - Execution ID
   * @param {Object} updates - Update data
   * @returns {Promise<Object>} Updated execution
   */
  async update(executionId, updates) {
    const setClause = [];
    const values = [];
    let paramIndex = 1;

    // Build dynamic update query
    for (const [key, value] of Object.entries(updates)) {
      if (key === 'resultData' || key === 'errorData' || key === 'metadata') {
        setClause.push(`${this.toSnakeCase(key)} = $${paramIndex}`);
        values.push(JSON.stringify(value));
      } else {
        setClause.push(`${this.toSnakeCase(key)} = $${paramIndex}`);
        values.push(value);
      }
      paramIndex++;
    }

    values.push(executionId);

    const query = `
      UPDATE workflow_executions 
      SET ${setClause.join(', ')}
      WHERE execution_id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  /**
   * Find executions by workflow ID
   * @param {string} workflowId - Workflow ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Executions
   */
  async findByWorkflowId(workflowId, options = {}) {
    const { limit = 50, offset = 0, status } = options;

    let query = `
      SELECT * FROM workflow_executions 
      WHERE workflow_id = $1
    `;
    const values = [workflowId];
    let paramIndex = 2;

    if (status) {
      query += ` AND status = $${paramIndex}`;
      values.push(status);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(limit, offset);

    const result = await this.db.query(query, values);
    return result.rows;
  }

  /**
   * Find executions by task ID
   * @param {string} taskId - Task ID
   * @returns {Promise<Array>} Executions
   */
  async findByTaskId(taskId) {
    const query = `
      SELECT * FROM workflow_executions 
      WHERE task_id = $1
      ORDER BY created_at DESC
    `;

    const result = await this.db.query(query, [taskId]);
    return result.rows;
  }

  /**
   * Get execution statistics
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Statistics
   */
  async getStatistics(filters = {}) {
    let whereClause = '';
    const values = [];
    let paramIndex = 1;

    if (filters.workflowId) {
      whereClause += ` WHERE workflow_id = $${paramIndex}`;
      values.push(filters.workflowId);
      paramIndex++;
    }

    if (filters.status) {
      whereClause += whereClause ? ` AND status = $${paramIndex}` : ` WHERE status = $${paramIndex}`;
      values.push(filters.status);
      paramIndex++;
    }

    const query = `
      SELECT 
        COUNT(*) as total_executions,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_executions,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_executions,
        AVG(actual_duration) as average_duration,
        MIN(actual_duration) as min_duration,
        MAX(actual_duration) as max_duration
      FROM workflow_executions
      ${whereClause}
    `;

    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  /**
   * Convert camelCase to snake_case
   * @param {string} str - String to convert
   * @returns {string} Converted string
   */
  toSnakeCase(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}
```

#### WorkflowMetricsRepository Implementation
```javascript
/**
 * Repository for workflow metrics
 */
class WorkflowMetricsRepository {
  constructor(databaseConnection) {
    this.db = databaseConnection;
  }

  /**
   * Record metric
   * @param {Object} metric - Metric data
   * @returns {Promise<Object>} Recorded metric
   */
  async recordMetric(metric) {
    const query = `
      INSERT INTO workflow_metrics (
        execution_id, metric_name, metric_value, metric_unit,
        metric_type, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [
      metric.executionId,
      metric.metricName,
      metric.metricValue,
      metric.metricUnit,
      metric.metricType,
      JSON.stringify(metric.metadata || {})
    ];

    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  /**
   * Get metrics for execution
   * @param {string} executionId - Execution ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Metrics
   */
  async getMetricsForExecution(executionId, options = {}) {
    const { metricType, limit = 100 } = options;

    let query = `
      SELECT * FROM workflow_metrics 
      WHERE execution_id = $1
    `;
    const values = [executionId];
    let paramIndex = 2;

    if (metricType) {
      query += ` AND metric_type = $${paramIndex}`;
      values.push(metricType);
      paramIndex++;
    }

    query += ` ORDER BY recorded_at DESC LIMIT $${paramIndex}`;
    values.push(limit);

    const result = await this.db.query(query, values);
    return result.rows;
  }

  /**
   * Get aggregated metrics
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Aggregated metrics
   */
  async getAggregatedMetrics(filters = {}) {
    const { metricName, metricType, timeRange } = filters;

    let whereClause = '';
    const values = [];
    let paramIndex = 1;

    if (metricName) {
      whereClause += ` WHERE metric_name = $${paramIndex}`;
      values.push(metricName);
      paramIndex++;
    }

    if (metricType) {
      whereClause += whereClause ? ` AND metric_type = $${paramIndex}` : ` WHERE metric_type = $${paramIndex}`;
      values.push(metricType);
      paramIndex++;
    }

    if (timeRange) {
      const timeCondition = whereClause ? ` AND recorded_at >= $${paramIndex}` : ` WHERE recorded_at >= $${paramIndex}`;
      whereClause += timeCondition;
      values.push(timeRange);
      paramIndex++;
    }

    const query = `
      SELECT 
        metric_name,
        metric_type,
        AVG(metric_value) as average_value,
        MIN(metric_value) as min_value,
        MAX(metric_value) as max_value,
        COUNT(*) as count
      FROM workflow_metrics
      ${whereClause}
      GROUP BY metric_name, metric_type
      ORDER BY metric_name, metric_type
    `;

    const result = await this.db.query(query, values);
    return result.rows;
  }
}
```

## 7. Infrastructure Services

#### WorkflowRepository Implementation
```javascript
/**
 * Workflow repository for persistence
 */
class WorkflowRepository {
  constructor(workflowExecutionRepository, workflowMetricsRepository) {
    this.executionRepository = workflowExecutionRepository;
    this.metricsRepository = workflowMetricsRepository;
  }

  /**
   * Save workflow execution
   * @param {Object} execution - Execution data
   * @returns {Promise<Object>} Saved execution
   */
  async saveExecution(execution) {
    try {
      // Save execution
      const savedExecution = await this.executionRepository.create(execution);
      
      // Record initial metrics
      await this.recordExecutionMetrics(savedExecution.execution_id, {
        metricName: 'execution_started',
        metricValue: 1,
        metricUnit: 'count',
        metricType: 'performance',
        metadata: { status: 'started' }
      });

      return savedExecution;
    } catch (error) {
      throw new Error(`Failed to save workflow execution: ${error.message}`);
    }
  }

  /**
   * Update workflow execution
   * @param {string} executionId - Execution ID
   * @param {Object} updates - Update data
   * @returns {Promise<Object>} Updated execution
   */
  async updateExecution(executionId, updates) {
    try {
      const updatedExecution = await this.executionRepository.update(executionId, updates);
      
      // Record completion metrics if execution completed
      if (updates.status === 'completed' && updates.actualDuration) {
        await this.recordExecutionMetrics(executionId, {
          metricName: 'execution_duration',
          metricValue: updates.actualDuration,
          metricUnit: 'milliseconds',
          metricType: 'performance',
          metadata: { status: 'completed' }
        });
      }

      return updatedExecution;
    } catch (error) {
      throw new Error(`Failed to update workflow execution: ${error.message}`);
    }
  }

  /**
   * Record execution metrics
   * @param {string} executionId - Execution ID
   * @param {Object} metric - Metric data
   * @returns {Promise<Object>} Recorded metric
   */
  async recordExecutionMetrics(executionId, metric) {
    try {
      return await this.metricsRepository.recordMetric({
        executionId,
        ...metric
      });
    } catch (error) {
      throw new Error(`Failed to record execution metrics: ${error.message}`);
    }
  }

  /**
   * Get execution with metrics
   * @param {string} executionId - Execution ID
   * @returns {Promise<Object>} Execution with metrics
   */
  async getExecutionWithMetrics(executionId) {
    try {
      const execution = await this.executionRepository.findByExecutionId(executionId);
      if (!execution) {
        return null;
      }

      const metrics = await this.metricsRepository.getMetricsForExecution(executionId);
      
      return {
        ...execution,
        metrics
      };
    } catch (error) {
      throw new Error(`Failed to get execution with metrics: ${error.message}`);
    }
  }

  /**
   * Get execution statistics
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Statistics
   */
  async getExecutionStatistics(filters = {}) {
    try {
      const executionStats = await this.executionRepository.getStatistics(filters);
      const aggregatedMetrics = await this.metricsRepository.getAggregatedMetrics(filters);
      
      return {
        executions: executionStats,
        metrics: aggregatedMetrics
      };
    } catch (error) {
      throw new Error(`Failed to get execution statistics: ${error.message}`);
    }
  }
}
```

## 8. Code Standards & Patterns
- **Coding Style**: ESLint with existing project rules, Prettier formatting
- **Naming Conventions**: camelCase for variables/functions, PascalCase for classes, kebab-case for files
- **Error Handling**: Try-catch with specific error types, proper error logging
- **Logging**: Winston logger with structured logging, different levels for operations
- **Testing**: Jest framework, 90% coverage requirement
- **Documentation**: JSDoc for all public methods, README updates

## 9. Testing Strategy

#### Unit Tests: 12 test files (1 per implementation file)
- **Database Migrations**: 3 test files for migrations
- **Repositories**: 3 test files for repository classes
- **Infrastructure Services**: 6 test files for infrastructure services

#### Integration Tests: 3 test files
- **Database Integration**: Test database operations
- **Repository Integration**: Test repository interactions
- **Service Integration**: Test service interactions

#### Test Coverage Requirements:
- **Line Coverage**: 90% minimum
- **Branch Coverage**: 85% minimum
- **Function Coverage**: 100% minimum

## 10. Success Criteria

#### Technical Metrics:
- [ ] Database schema created and migrated
- [ ] Repository layer fully functional
- [ ] Infrastructure services operational
- [ ] 90% test coverage achieved
- [ ] Zero breaking changes to existing APIs

#### Database Metrics:
- [ ] All tables created successfully
- [ ] Indexes and constraints working
- [ ] Migration scripts tested
- [ ] Performance optimized

## 11. Risk Assessment

#### High Risk:
- [ ] Database migration failures - Mitigation: Thorough testing and rollback procedures
- [ ] Data integrity issues - Mitigation: Proper constraints and validation

#### Medium Risk:
- [ ] Performance impact - Mitigation: Proper indexing and query optimization
- [ ] Integration complexity - Mitigation: Gradual integration with existing services

#### Low Risk:
- [ ] Schema design - Mitigation: Follow existing patterns
- [ ] Documentation completeness - Mitigation: Comprehensive documentation

## 12. AI Auto-Implementation Instructions

#### Task Database Fields:
- **source_type**: 'markdown_doc'
- **source_path**: 'docs/09_roadmap/features/unified-workflow-performance-main1-database-infrastructure.md'
- **automation_level**: 'semi_auto'
- **confirmation_required**: true
- **max_attempts**: 3
- **git_branch_required**: true
- **new_chat_required**: true

#### AI Execution Context:
```json
{
  "requires_new_chat": true,
  "git_branch_name": "feature/unified-workflow-performance-main1",
  "confirmation_keywords": ["fertig", "done", "complete", "database infrastructure ready"],
  "fallback_detection": true,
  "max_confirmation_attempts": 3,
  "timeout_seconds": 1800
}
```

#### Success Indicators:
- [ ] All 12 new files created with proper JSDoc
- [ ] All 4 existing files modified correctly
- [ ] Database migrations executed successfully
- [ ] Repository layer functional
- [ ] Infrastructure services operational
- [ ] All tests passing
- [ ] No build errors
- [ ] Code follows standards
- [ ] Documentation updated

## 13. References & Resources
- **Technical Documentation**: Database design, Repository patterns, Infrastructure patterns
- **API References**: Existing PIDEA database patterns and conventions
- **Design Patterns**: Repository pattern, Data Access Object pattern
- **Best Practices**: Database design best practices, Migration strategies
- **Similar Implementations**: Existing repository patterns in PIDEA

---

## Database Task Creation Instructions

This subtask will be parsed into a database task with the following mapping:

```sql
INSERT INTO tasks (
  id, project_id, title, description, type, category, priority, status,
  source_type, source_path, source_content, metadata, estimated_hours
) VALUES (
  uuid(), -- Generated
  'pidea-backend', -- From context
  'Unified Workflow Performance Main.1: Database & Infrastructure', -- From section 1
  '[Full markdown content]', -- Complete description
  'feature', -- Derived from Technical Requirements
  'backend', -- Derived from context
  'high', -- From section 1
  'pending', -- Initial status
  'markdown_doc', -- Source type
  'docs/09_roadmap/features/unified-workflow-performance-main1-database-infrastructure.md', -- Source path
  '[Full markdown content]', -- For reference
  '[JSON with all metadata]', -- All technical details
  40 -- From section 1 (total hours)
);
``` 