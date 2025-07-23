# Phase 1: Core Deduplication System Implementation

## 📋 Phase Overview
- **Phase**: 1 of 5
- **Duration**: 4 hours
- **Priority**: Critical
- **Status**: Planning
- **Dependencies**: StepRegistry, EventBus, existing logging system

## 🎯 Objectives
1. Create ExecutionDeduplicationService with request fingerprinting
2. Implement ExecutionCacheService with TTL support
3. Create ExecutionRecord entity and repository
4. Add execution tracking to StepRegistry
5. Implement request deduplication middleware

## 📁 Files to Create

### 1. ExecutionDeduplicationService.js
**Path**: `backend/domain/services/ExecutionDeduplicationService.js`

**Purpose**: Core service for detecting and preventing duplicate executions

**Key Features**:
- Request fingerprinting using crypto hash
- In-memory execution tracking
- Timeout-based deduplication
- Integration with EventBus for monitoring

**Implementation**:
```javascript
const crypto = require('crypto');
const { EventBus } = require('@infrastructure/messaging/EventBus');
const { Logger } = require('@infrastructure/logging/Logger');

class ExecutionDeduplicationService {
  constructor(eventBus = null, logger = null) {
    this.eventBus = eventBus || new EventBus();
    this.logger = logger || new Logger('ExecutionDeduplicationService');
    this.executingRequests = new Map();
    this.executionHistory = new Map();
    this.defaultTimeout = 30000; // 30 seconds
  }

  generateFingerprint(stepName, context, options = {}) {
    const data = {
      stepName,
      context: this.sanitizeContext(context),
      options: this.sanitizeOptions(options)
    };
    
    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify(data));
    return hash.digest('hex');
  }

  shouldExecute(fingerprint, timeout = this.defaultTimeout) {
    const existing = this.executingRequests.get(fingerprint);
    
    if (existing) {
      const timeSinceStart = Date.now() - existing.startTime;
      if (timeSinceStart < timeout) {
        this.logger.debug('Duplicate execution detected', {
          fingerprint: fingerprint.substring(0, 8),
          timeSinceStart,
          timeout
        });
        return false;
      } else {
        // Timeout reached, allow re-execution
        this.executingRequests.delete(fingerprint);
      }
    }
    
    return true;
  }

  markExecuting(fingerprint, stepName) {
    this.executingRequests.set(fingerprint, {
      stepName,
      startTime: Date.now(),
      threadId: process.pid
    });

    this.eventBus.publish('execution.started', {
      fingerprint,
      stepName,
      timestamp: new Date()
    });
  }

  markCompleted(fingerprint, result, duration) {
    this.executingRequests.delete(fingerprint);
    
    // Track execution history
    const history = this.executionHistory.get(fingerprint) || {
      count: 0,
      totalDuration: 0,
      lastExecution: null
    };
    
    history.count++;
    history.totalDuration += duration;
    history.lastExecution = new Date();
    
    this.executionHistory.set(fingerprint, history);

    this.eventBus.publish('execution.completed', {
      fingerprint,
      result,
      duration,
      timestamp: new Date()
    });
  }

  getExecutionStats() {
    return {
      currentlyExecuting: this.executingRequests.size,
      totalTracked: this.executionHistory.size,
      duplicates: Array.from(this.executionHistory.values())
        .filter(h => h.count > 1).length
    };
  }

  sanitizeContext(context) {
    // Remove sensitive data and normalize context
    const sanitized = { ...context };
    delete sanitized.password;
    delete sanitized.token;
    delete sanitized.secret;
    return sanitized;
  }

  sanitizeOptions(options) {
    // Normalize options for consistent fingerprinting
    return {
      timeout: options.timeout || this.defaultTimeout,
      priority: options.priority || 'normal',
      ...options
    };
  }
}

module.exports = ExecutionDeduplicationService;
```

### 2. ExecutionCacheService.js
**Path**: `backend/domain/services/ExecutionCacheService.js`

**Purpose**: TTL-based caching layer for step results

**Key Features**:
- In-memory cache with TTL
- Automatic cleanup of expired entries
- Cache statistics and monitoring
- Integration with deduplication service

**Implementation**:
```javascript
const { Logger } = require('@infrastructure/logging/Logger');

class ExecutionCacheService {
  constructor(logger = null) {
    this.logger = logger || new Logger('ExecutionCacheService');
    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
    
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, 60000);
  }

  get(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }
    
    this.stats.hits++;
    return entry.value;
  }

  set(key, value, ttl = 300000) { // Default 5 minutes
    const expiresAt = Date.now() + ttl;
    
    this.cache.set(key, {
      value,
      expiresAt,
      createdAt: Date.now()
    });
    
    this.stats.sets++;
    
    this.logger.debug('Cache entry set', {
      key: key.substring(0, 8),
      ttl,
      cacheSize: this.cache.size
    });
  }

  delete(key) {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.deletes++;
    }
    return deleted;
  }

  cleanupExpired() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      this.logger.debug('Cleaned expired cache entries', {
        cleaned,
        remaining: this.cache.size
      });
    }
  }

  getStats() {
    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0
    };
  }

  clear() {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
  }
}

module.exports = ExecutionCacheService;
```

### 3. ExecutionRecord.js
**Path**: `backend/domain/entities/ExecutionRecord.js`

**Purpose**: Entity for tracking execution history

**Implementation**:
```javascript
class ExecutionRecord {
  constructor(data = {}) {
    this.id = data.id || null;
    this.stepName = data.stepName;
    this.fingerprint = data.fingerprint;
    this.executionCount = data.executionCount || 1;
    this.firstExecution = data.firstExecution || new Date();
    this.lastExecution = data.lastExecution || new Date();
    this.totalDuration = data.totalDuration || 0;
    this.cacheHits = data.cacheHits || 0;
    this.createdAt = data.createdAt || new Date();
  }

  static create(stepName, fingerprint) {
    return new ExecutionRecord({
      stepName,
      fingerprint
    });
  }

  incrementExecution(duration = 0) {
    this.executionCount++;
    this.lastExecution = new Date();
    this.totalDuration += duration;
  }

  incrementCacheHits() {
    this.cacheHits++;
  }

  getAverageDuration() {
    return this.executionCount > 0 ? this.totalDuration / this.executionCount : 0;
  }

  getCacheHitRate() {
    return this.executionCount > 0 ? this.cacheHits / this.executionCount : 0;
  }

  toJSON() {
    return {
      id: this.id,
      stepName: this.stepName,
      fingerprint: this.fingerprint,
      executionCount: this.executionCount,
      firstExecution: this.firstExecution,
      lastExecution: this.lastExecution,
      totalDuration: this.totalDuration,
      cacheHits: this.cacheHits,
      createdAt: this.createdAt,
      averageDuration: this.getAverageDuration(),
      cacheHitRate: this.getCacheHitRate()
    };
  }
}

module.exports = ExecutionRecord;
```

### 4. ExecutionTrackingRepository.js
**Path**: `backend/infrastructure/database/ExecutionTrackingRepository.js`

**Purpose**: Database layer for execution tracking

**Implementation**:
```javascript
const ExecutionRecord = require('@domain/entities/ExecutionRecord');
const { Logger } = require('@infrastructure/logging/Logger');

class ExecutionTrackingRepository {
  constructor(databaseConnection, logger = null) {
    this.db = databaseConnection;
    this.logger = logger || new Logger('ExecutionTrackingRepository');
  }

  async saveExecutionRecord(record) {
    const sql = `
      INSERT INTO execution_records (
        id, step_name, fingerprint, execution_count, first_execution,
        last_execution, total_duration, cache_hits, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (fingerprint) DO UPDATE SET
        execution_count = execution_records.execution_count + 1,
        last_execution = EXCLUDED.last_execution,
        total_duration = execution_records.total_duration + EXCLUDED.total_duration,
        cache_hits = execution_records.cache_hits + EXCLUDED.cache_hits
    `;

    const data = record.toJSON();
    
    await this.db.execute(sql, [
      data.id,
      data.stepName,
      data.fingerprint,
      data.executionCount,
      data.firstExecution,
      data.lastExecution,
      data.totalDuration,
      data.cacheHits,
      data.createdAt
    ]);

    this.logger.debug('Execution record saved', {
      stepName: data.stepName,
      fingerprint: data.fingerprint.substring(0, 8)
    });
  }

  async findExecutionRecord(fingerprint) {
    const sql = `
      SELECT * FROM execution_records 
      WHERE fingerprint = $1
    `;

    const result = await this.db.query(sql, [fingerprint]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return ExecutionRecord.createFromData(result.rows[0]);
  }

  async getExecutionStats(limit = 100) {
    const sql = `
      SELECT step_name, 
             COUNT(*) as total_executions,
             AVG(total_duration) as avg_duration,
             SUM(cache_hits) as total_cache_hits
      FROM execution_records 
      GROUP BY step_name 
      ORDER BY total_executions DESC 
      LIMIT $1
    `;

    const result = await this.db.query(sql, [limit]);
    return result.rows;
  }

  async getDuplicateExecutions(threshold = 2) {
    const sql = `
      SELECT step_name, 
             COUNT(*) as execution_count,
             AVG(total_duration) as avg_duration
      FROM execution_records 
      GROUP BY step_name 
      HAVING COUNT(*) >= $1
      ORDER BY execution_count DESC
    `;

    const result = await this.db.query(sql, [threshold]);
    return result.rows;
  }
}

module.exports = ExecutionTrackingRepository;
```

## 📁 Files to Modify

### 1. StepRegistry.js Modifications
**Path**: `backend/domain/steps/StepRegistry.js`

**Changes**:
- Add deduplication service integration
- Add caching layer integration
- Add execution tracking
- Modify executeStep method to use deduplication

**Key Modifications**:
```javascript
// Add to constructor
this.deduplicationService = new ExecutionDeduplicationService(eventBus, logger);
this.cacheService = new ExecutionCacheService(logger);
this.executionRepository = new ExecutionTrackingRepository(databaseConnection, logger);

// Modify executeStep method
async executeStep(name, context = {}, options = {}) {
  try {
    const step = this.getStep(name);
    
    if (step.status !== 'active') {
      throw new Error(`Step "${step.name}" is not active (status: ${step.status})`);
    }

    // Generate fingerprint for deduplication
    const fingerprint = this.deduplicationService.generateFingerprint(name, context, options);
    
    // Check cache first
    const cachedResult = this.cacheService.get(fingerprint);
    if (cachedResult) {
      this.logger.info(`✅ Step "${step.name}" served from cache`);
      return cachedResult;
    }

    // Check for duplicate execution
    if (!this.deduplicationService.shouldExecute(fingerprint, options.timeout)) {
      this.logger.warn(`⚠️ Duplicate execution prevented for step "${step.name}"`);
      throw new Error(`Duplicate execution detected for step "${step.name}"`);
    }

    // Mark as executing
    this.deduplicationService.markExecuting(fingerprint, name);

    // Execute step
    this.logger.info(`🚀 Executing step "${step.name}"...`);
    const startTime = Date.now();
    
    const executor = this.executors.get(step.name);
    if (!executor) {
      throw new Error(`No executor found for step "${step.name}"`);
    }

    const enhancedContext = this.enhanceContextWithServices(context);
    const result = await executor(enhancedContext, options);
    
    const endTime = Date.now();
    const duration = endTime - startTime;

    // Mark as completed
    this.deduplicationService.markCompleted(fingerprint, result, duration);

    // Cache result if successful
    if (result.success) {
      const ttl = options.cacheTTL || 300000; // 5 minutes default
      this.cacheService.set(fingerprint, {
        success: true,
        result,
        duration,
        step: step.name,
        timestamp: new Date(),
        cached: true
      }, ttl);
    }

    // Track execution
    const executionRecord = ExecutionRecord.create(name, fingerprint);
    executionRecord.incrementExecution(duration);
    await this.executionRepository.saveExecutionRecord(executionRecord);

    // Update step statistics
    step.executionCount++;
    step.lastExecuted = new Date();
    step.lastDuration = duration;

    this.logger.info(`✅ Step "${step.name}" executed successfully in ${duration}ms`);
    return {
      success: true,
      result,
      duration,
      step: step.name,
      timestamp: new Date()
    };
  } catch (error) {
    this.logger.error(`❌ Failed to execute step "${name}":`, error.message);
    
    // Update step statistics
    const step = this.steps.get(name);
    if (step) {
      step.executionCount++;
      step.lastExecuted = new Date();
      step.lastError = error.message;
    }

    return {
      success: false,
      error: error.message,
      step: name,
      timestamp: new Date()
    };
  }
}
```

## 🧪 Testing Strategy

### Unit Tests
**File**: `tests/unit/ExecutionDeduplicationService.test.js`

**Test Cases**:
- Request fingerprinting consistency
- Duplicate detection logic
- Timeout handling
- Event publishing
- Statistics tracking

### Integration Tests
**File**: `tests/integration/StepRegistryDeduplication.test.js`

**Test Cases**:
- Step execution with deduplication
- Cache integration
- Database tracking
- Error handling

## 📊 Success Metrics
- [ ] 100% of duplicate executions detected and prevented
- [ ] Cache hit rate > 80% for repeated operations
- [ ] Response time < 50ms for cache hits
- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] No memory leaks in deduplication service

## 🔄 Next Phase
After completing Phase 1, proceed to [Phase 2: Git Service Optimization](./backend-duplicate-execution-fix-phase-2.md) to apply the deduplication system to Git operations.

## 📝 Notes
- This phase establishes the foundation for all subsequent optimizations
- The deduplication service is designed to be lightweight and non-blocking
- Cache TTL values can be adjusted based on step type and requirements
- Execution tracking provides valuable analytics for future optimizations 