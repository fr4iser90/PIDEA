# Caching Optimization

## Overview
Caching is a technique to store frequently accessed data in fast-access storage to improve application performance. This guide covers various caching strategies, implementations, and best practices.

## Caching Layers

### Application-Level Caching
```javascript
// In-memory caching with Node.js
class MemoryCache {
  constructor() {
    this.cache = new Map();
    this.maxSize = 1000;
    this.ttl = 300000; // 5 minutes
  }

  set(key, value, ttl = this.ttl) {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      value,
      expires: Date.now() + ttl
    });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  delete(key) {
    return this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  size() {
    return this.cache.size;
  }
}

// Usage
const cache = new MemoryCache();
cache.set('user:123', userData, 60000); // 1 minute TTL
const user = cache.get('user:123');
```

### Redis Caching
```javascript
// Redis caching implementation
import Redis from 'ioredis';

class RedisCache {
  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
  }

  async set(key, value, ttl = 3600) {
    try {
      const serialized = JSON.stringify(value);
      await this.redis.setex(key, ttl, serialized);
      return true;
    } catch (error) {
      console.error('Redis set error:', error);
      return false;
    }
  }

  async get(key) {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }

  async delete(key) {
    try {
      return await this.redis.del(key);
    } catch (error) {
      console.error('Redis delete error:', error);
      return false;
    }
  }

  async mget(keys) {
    try {
      const values = await this.redis.mget(keys);
      return values.map(value => value ? JSON.parse(value) : null);
    } catch (error) {
      console.error('Redis mget error:', error);
      return keys.map(() => null);
    }
  }

  async mset(keyValuePairs, ttl = 3600) {
    try {
      const pipeline = this.redis.pipeline();
      
      for (const [key, value] of keyValuePairs) {
        const serialized = JSON.stringify(value);
        pipeline.setex(key, ttl, serialized);
      }
      
      await pipeline.exec();
      return true;
    } catch (error) {
      console.error('Redis mset error:', error);
      return false;
    }
  }
}
```

### Database Query Caching
```javascript
// Database query caching with Redis
class QueryCache {
  constructor(redisCache) {
    this.cache = redisCache;
    this.defaultTTL = 300; // 5 minutes
  }

  generateKey(query, params) {
    const queryHash = require('crypto')
      .createHash('md5')
      .update(query + JSON.stringify(params))
      .digest('hex');
    
    return `query:${queryHash}`;
  }

  async getCachedQuery(query, params = []) {
    const key = this.generateKey(query, params);
    return await this.cache.get(key);
  }

  async setCachedQuery(query, params = [], result, ttl = this.defaultTTL) {
    const key = this.generateKey(query, params);
    return await this.cache.set(key, result, ttl);
  }

  async invalidatePattern(pattern) {
    // Invalidate all keys matching pattern
    const keys = await this.cache.redis.keys(pattern);
    if (keys.length > 0) {
      await this.cache.redis.del(...keys);
    }
  }
}

// Usage with database queries
class UserRepository {
  constructor(db, queryCache) {
    this.db = db;
    this.cache = queryCache;
  }

  async findById(id) {
    // Try cache first
    const cached = await this.cache.getCachedQuery(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );
    
    if (cached) return cached;

    // Query database
    const user = await this.db.query(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );

    // Cache result
    await this.cache.setCachedQuery(
      'SELECT * FROM users WHERE id = ?',
      [id],
      user,
      600 // 10 minutes
    );

    return user;
  }

  async updateUser(id, data) {
    // Update database
    const result = await this.db.query(
      'UPDATE users SET ? WHERE id = ?',
      [data, id]
    );

    // Invalidate related cache
    await this.cache.invalidatePattern(`query:*users*${id}*`);
    
    return result;
  }
}
```

## HTTP Caching

### Browser Caching
```javascript
// Express.js caching middleware
import express from 'express';

const app = express();

// Static file caching
app.use('/static', express.static('public', {
  maxAge: '1d', // Cache for 1 day
  etag: true,
  lastModified: true
}));

// API response caching
app.get('/api/users/:id', async (req, res) => {
  const userId = req.params.id;
  
  // Check ETag
  const etag = `user-${userId}-${user.updatedAt}`;
  if (req.headers['if-none-match'] === etag) {
    return res.status(304).send();
  }

  const user = await getUserById(userId);
  
  // Set cache headers
  res.set({
    'ETag': etag,
    'Cache-Control': 'public, max-age=300', // 5 minutes
    'Last-Modified': user.updatedAt
  });
  
  res.json(user);
});

// Cache control middleware
const cacheControl = (maxAge = 300) => {
  return (req, res, next) => {
    res.set('Cache-Control', `public, max-age=${maxAge}`);
    next();
  };
};

// Usage
app.get('/api/public-data', cacheControl(3600), (req, res) => {
  res.json(publicData);
});
```

### CDN Caching
```javascript
// CDN configuration with CloudFlare
const cdnConfig = {
  // Cache static assets
  static: {
    'Cache-Control': 'public, max-age=31536000', // 1 year
    'CDN-Cache-Control': 'public, max-age=31536000'
  },
  
  // Cache API responses
  api: {
    'Cache-Control': 'public, max-age=300', // 5 minutes
    'CDN-Cache-Control': 'public, max-age=300'
  },
  
  // No cache for sensitive data
  private: {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  }
};

// Apply CDN headers
app.get('/api/public/users', (req, res) => {
  Object.entries(cdnConfig.api).forEach(([key, value]) => {
    res.set(key, value);
  });
  
  res.json(users);
});
```

## Cache Invalidation Strategies

### Time-Based Invalidation
```javascript
class CacheManager {
  constructor() {
    this.cache = new RedisCache();
    this.invalidationPatterns = new Map();
  }

  // Set cache with automatic invalidation
  async setWithInvalidation(key, value, ttl, invalidationPatterns = []) {
    await this.cache.set(key, value, ttl);
    
    // Store invalidation patterns
    this.invalidationPatterns.set(key, invalidationPatterns);
    
    // Schedule invalidation
    setTimeout(() => {
      this.invalidatePatterns(invalidationPatterns);
    }, ttl * 1000);
  }

  // Invalidate related caches
  async invalidatePatterns(patterns) {
    for (const pattern of patterns) {
      await this.cache.invalidatePattern(pattern);
    }
  }

  // Manual invalidation
  async invalidateByKey(key) {
    await this.cache.delete(key);
    
    // Invalidate related patterns
    const patterns = this.invalidationPatterns.get(key) || [];
    await this.invalidatePatterns(patterns);
  }
}
```

### Event-Based Invalidation
```javascript
// Event-driven cache invalidation
class EventDrivenCache {
  constructor(cache, eventBus) {
    this.cache = cache;
    this.eventBus = eventBus;
    this.setupEventListeners();
  }

  setupEventListeners() {
    // User events
    this.eventBus.on('user:updated', async (userId) => {
      await this.invalidateUserCache(userId);
    });

    this.eventBus.on('user:deleted', async (userId) => {
      await this.invalidateUserCache(userId);
    });

    // Post events
    this.eventBus.on('post:created', async (post) => {
      await this.invalidatePostCache(post.id);
      await this.invalidateUserCache(post.userId);
    });

    this.eventBus.on('post:updated', async (post) => {
      await this.invalidatePostCache(post.id);
    });
  }

  async invalidateUserCache(userId) {
    const patterns = [
      `user:${userId}`,
      `query:*users*${userId}*`,
      `user_posts:${userId}`
    ];
    
    for (const pattern of patterns) {
      await this.cache.invalidatePattern(pattern);
    }
  }

  async invalidatePostCache(postId) {
    const patterns = [
      `post:${postId}`,
      `query:*posts*${postId}*`,
      `post_comments:${postId}`
    ];
    
    for (const pattern of patterns) {
      await this.cache.invalidatePattern(pattern);
    }
  }
}
```

## Advanced Caching Patterns

### Cache-Aside Pattern
```javascript
class CacheAsideService {
  constructor(cache, dataSource) {
    this.cache = cache;
    this.dataSource = dataSource;
  }

  async get(key) {
    // Try cache first
    let data = await this.cache.get(key);
    
    if (data) {
      return data;
    }

    // Cache miss - get from data source
    data = await this.dataSource.get(key);
    
    if (data) {
      // Store in cache for next time
      await this.cache.set(key, data);
    }

    return data;
  }

  async set(key, value) {
    // Update data source first
    await this.dataSource.set(key, value);
    
    // Update cache
    await this.cache.set(key, value);
  }

  async delete(key) {
    // Delete from data source first
    await this.dataSource.delete(key);
    
    // Remove from cache
    await this.cache.delete(key);
  }
}
```

### Write-Through Pattern
```javascript
class WriteThroughCache {
  constructor(cache, dataSource) {
    this.cache = cache;
    this.dataSource = dataSource;
  }

  async set(key, value) {
    // Write to cache and data source simultaneously
    const [cacheResult, dataResult] = await Promise.all([
      this.cache.set(key, value),
      this.dataSource.set(key, value)
    ]);

    return cacheResult && dataResult;
  }

  async get(key) {
    return await this.cache.get(key);
  }
}
```

### Write-Behind Pattern
```javascript
class WriteBehindCache {
  constructor(cache, dataSource) {
    this.cache = cache;
    this.dataSource = dataSource;
    this.writeQueue = [];
    this.processing = false;
  }

  async set(key, value) {
    // Write to cache immediately
    await this.cache.set(key, value);
    
    // Queue write to data source
    this.writeQueue.push({ key, value });
    
    // Process queue if not already processing
    if (!this.processing) {
      this.processWriteQueue();
    }
  }

  async processWriteQueue() {
    this.processing = true;
    
    while (this.writeQueue.length > 0) {
      const batch = this.writeQueue.splice(0, 10); // Process in batches
      
      try {
        await Promise.all(
          batch.map(({ key, value }) => this.dataSource.set(key, value))
        );
      } catch (error) {
        console.error('Write-behind error:', error);
        // Re-queue failed writes
        this.writeQueue.unshift(...batch);
      }
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    this.processing = false;
  }
}
```

## Performance Monitoring

### Cache Hit Rate Monitoring
```javascript
class CacheMetrics {
  constructor() {
    this.hits = 0;
    this.misses = 0;
    this.errors = 0;
  }

  recordHit() {
    this.hits++;
  }

  recordMiss() {
    this.misses++;
  }

  recordError() {
    this.errors++;
  }

  getHitRate() {
    const total = this.hits + this.misses;
    return total > 0 ? (this.hits / total) * 100 : 0;
  }

  getStats() {
    return {
      hits: this.hits,
      misses: this.misses,
      errors: this.errors,
      hitRate: this.getHitRate(),
      total: this.hits + this.misses
    };
  }

  reset() {
    this.hits = 0;
    this.misses = 0;
    this.errors = 0;
  }
}

// Enhanced cache with metrics
class MonitoredCache extends RedisCache {
  constructor() {
    super();
    this.metrics = new CacheMetrics();
  }

  async get(key) {
    try {
      const value = await super.get(key);
      if (value !== null) {
        this.metrics.recordHit();
      } else {
        this.metrics.recordMiss();
      }
      return value;
    } catch (error) {
      this.metrics.recordError();
      throw error;
    }
  }
}
```

## Best Practices

### Cache Key Design
- Use consistent naming conventions
- Include version numbers for schema changes
- Use hashes for long keys
- Avoid special characters

### TTL Strategy
- Set appropriate TTL based on data volatility
- Use shorter TTL for frequently changing data
- Implement cache warming for critical data
- Monitor cache hit rates

### Memory Management
- Set maximum cache size limits
- Implement LRU eviction policies
- Monitor memory usage
- Use compression for large objects

### Error Handling
- Implement cache fallbacks
- Handle cache failures gracefully
- Log cache errors for debugging
- Use circuit breakers for external caches 