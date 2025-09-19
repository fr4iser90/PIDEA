# Startup Performance Optimization – Phase 1: Startup Cache Infrastructure

## Overview
Implement the foundational caching infrastructure to store and retrieve startup data, reducing initialization time from 30+ seconds to under 5 seconds.

## Objectives
- [ ] Create StartupCache service with TTL-based caching
- [ ] Add startup_cache database table with proper schema
- [ ] Implement cache invalidation logic and cleanup
- [ ] Add cache statistics and monitoring capabilities
- [ ] Create cache management utilities

## Deliverables
- File: `backend/infrastructure/cache/StartupCache.js` - Core caching service with TTL support
- File: `backend/infrastructure/database/migrations/startup_cache.sql` - Database schema for persistent cache
- File: `backend/domain/services/StartupOptimizationService.js` - Centralized startup optimization service
- API: `/api/startup/cache/status` - Cache statistics endpoint
- API: `/api/startup/cache/clear` - Cache management endpoint
- Test: `tests/unit/StartupCache.test.js` - Unit tests for cache operations

## Dependencies
- Requires: Existing database infrastructure
- Blocks: Phase 2 (Lazy Service Loading) start

## Estimated Time
2 hours

## Technical Implementation

### 1. Database Schema (startup_cache.sql)
```sql
CREATE TABLE IF NOT EXISTS startup_cache (
    id TEXT PRIMARY KEY,
    cache_key TEXT NOT NULL UNIQUE,
    cache_value TEXT NOT NULL, -- JSON data
    cache_type TEXT NOT NULL, -- 'ide_detection', 'workspace_path', 'service_deps', 'config'
    ttl_seconds INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT NOT NULL,
    access_count INTEGER DEFAULT 0,
    last_accessed TEXT,
    metadata TEXT -- JSON for additional info
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_startup_cache_key ON startup_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_startup_cache_type ON startup_cache(cache_type);
CREATE INDEX IF NOT EXISTS idx_startup_cache_expires ON startup_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_startup_cache_created ON startup_cache(created_at);
```

### 2. StartupCache Service
```javascript
class StartupCache {
    constructor(databaseConnection) {
        this.db = databaseConnection;
        this.memoryCache = new Map();
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0
        };
    }

    async get(key, type) {
        // Check memory cache first
        const memoryKey = `${type}:${key}`;
        if (this.memoryCache.has(memoryKey)) {
            const cached = this.memoryCache.get(memoryKey);
            if (Date.now() < cached.expiresAt) {
                this.stats.hits++;
                return cached.value;
            }
            this.memoryCache.delete(memoryKey);
        }

        // Check database cache
        const dbResult = await this.getFromDatabase(key, type);
        if (dbResult) {
            // Store in memory cache
            this.memoryCache.set(memoryKey, {
                value: dbResult.value,
                expiresAt: new Date(dbResult.expires_at).getTime()
            });
            this.stats.hits++;
            return dbResult.value;
        }

        this.stats.misses++;
        return null;
    }

    async set(key, value, type, ttlSeconds = 3600) {
        const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
        
        // Store in memory cache
        const memoryKey = `${type}:${key}`;
        this.memoryCache.set(memoryKey, {
            value,
            expiresAt: expiresAt.getTime()
        });

        // Store in database
        await this.setInDatabase(key, value, type, ttlSeconds, expiresAt);
        this.stats.sets++;
    }

    async invalidate(type, pattern = null) {
        if (pattern) {
            // Pattern-based invalidation
            await this.invalidateByPattern(type, pattern);
        } else {
            // Type-based invalidation
            await this.invalidateByType(type);
        }
        
        // Clear memory cache for type
        for (const [key] of this.memoryCache) {
            if (key.startsWith(`${type}:`)) {
                this.memoryCache.delete(key);
            }
        }
        this.stats.deletes++;
    }

    getStats() {
        const hitRate = this.stats.hits + this.stats.misses > 0 
            ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
            : 0;
        
        return {
            ...this.stats,
            hitRate: `${hitRate}%`,
            memoryCacheSize: this.memoryCache.size
        };
    }
}
```

### 3. StartupOptimizationService
```javascript
class StartupOptimizationService {
    constructor(startupCache, logger) {
        this.cache = startupCache;
        this.logger = logger;
        this.cacheConfig = {
            ideDetection: { ttl: 3600 }, // 1 hour
            workspacePaths: { ttl: 86400 }, // 24 hours
            serviceDeps: { ttl: 3600 }, // 1 hour
            config: { ttl: 3600 }, // 1 hour
            analysisResults: { ttl: 21600 } // 6 hours
        };
    }

    async getCachedIDEDetection() {
        return await this.cache.get('ide_detection', 'ide_detection');
    }

    async setCachedIDEDetection(data) {
        await this.cache.set('ide_detection', data, 'ide_detection', this.cacheConfig.ideDetection.ttl);
    }

    async getCachedWorkspacePath(port) {
        return await this.cache.get(`workspace_${port}`, 'workspace_path');
    }

    async setCachedWorkspacePath(port, data) {
        await this.cache.set(`workspace_${port}`, data, 'workspace_path', this.cacheConfig.workspacePaths.ttl);
    }

    async getCachedServiceDependencies() {
        return await this.cache.get('service_dependencies', 'service_deps');
    }

    async setCachedServiceDependencies(data) {
        await this.cache.set('service_dependencies', data, 'service_deps', this.cacheConfig.serviceDeps.ttl);
    }
}
```

## Success Criteria
- [ ] StartupCache service functional with TTL support
- [ ] Database table created with proper indexes
- [ ] Cache hit rate >80% for cached operations
- [ ] Memory usage <50MB for cache operations
- [ ] Cache invalidation working correctly
- [ ] Unit tests passing with >90% coverage
- [ ] Cache statistics endpoint responding correctly

## Testing Strategy
- **Unit Tests**: Cache operations, TTL expiration, invalidation
- **Integration Tests**: Database persistence, memory-db sync
- **Performance Tests**: Cache hit rates, memory usage
- **Error Handling**: Database failures, memory limits

## Risk Mitigation
- **Cache Corruption**: Regular validation and backup procedures
- **Memory Leaks**: Automatic cleanup and size limits
- **Database Performance**: Proper indexing and query optimization
- **Data Consistency**: Cache synchronization strategies

## Next Phase Dependencies
This phase provides the foundation for Phase 2 (Lazy Service Loading) by enabling service dependency caching and Phase 3 (IDE Detection Optimization) by enabling IDE detection result caching. 