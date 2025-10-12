# Database Performance Monitoring Infrastructure - Deployment Guide

## Overview
This guide provides step-by-step instructions for deploying the Database Performance Monitoring Infrastructure to production environments.

## Prerequisites
- Node.js 18+ installed
- PostgreSQL 13+ or SQLite 3.30+
- Existing PIDEA application deployed
- Database migration system operational

## Deployment Steps

### 1. Database Migration
Execute the performance monitoring migration:

```bash
# For PostgreSQL
psql -d your_database -f database/migrations/010_add_performance_monitoring.sql

# For SQLite
sqlite3 your_database.db < database/migrations/010_add_performance_monitoring.sql
```

### 2. Application Deployment
Deploy the updated application with performance monitoring enabled:

```bash
# Install dependencies
npm install

# Build application
npm run build

# Start application with monitoring enabled
NODE_ENV=production npm start
```

### 3. Configuration
Update your environment configuration:

```env
# Enable performance monitoring
DB_MONITORING_ENABLED=true

# Configure monitoring thresholds
DB_SLOW_QUERY_THRESHOLD=1000
DB_CACHE_TTL=300000
DB_METRICS_RETENTION_DAYS=30
```

### 4. API Endpoints
The following API endpoints are now available:

- `GET /api/performance-monitoring/status` - Get monitoring status
- `GET /api/performance-monitoring/stats` - Get performance statistics
- `GET /api/performance-monitoring/queries/history` - Get query history
- `GET /api/performance-monitoring/queries/slow` - Get slow queries
- `GET /api/performance-monitoring/queries/top-by-time` - Get top queries by time
- `GET /api/performance-monitoring/queries/most-frequent` - Get most frequent queries
- `DELETE /api/performance-monitoring/queries/history` - Clear query history
- `DELETE /api/performance-monitoring/cache` - Clear query cache
- `GET /api/performance-monitoring/export` - Export performance data
- `POST /api/performance-monitoring/enable` - Enable monitoring
- `POST /api/performance-monitoring/disable` - Disable monitoring

## Verification

### 1. Check Database Tables
Verify that performance monitoring tables were created:

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('query_performance', 'query_cache', 'performance_metrics', 'slow_query_alerts');

-- Check indexes
SELECT indexname FROM pg_indexes 
WHERE tablename IN ('query_performance', 'query_cache', 'performance_metrics', 'slow_query_alerts');
```

### 2. Test API Endpoints
Test the performance monitoring API:

```bash
# Check status
curl http://localhost:3000/api/performance-monitoring/status

# Get statistics
curl http://localhost:3000/api/performance-monitoring/stats

# Get query history
curl http://localhost:3000/api/performance-monitoring/queries/history
```

### 3. Monitor Performance
Check that performance monitoring is active:

```bash
# Check application logs for monitoring initialization
tail -f logs/combined.log | grep -i "performance monitoring"

# Check database connection status
curl http://localhost:3000/api/health | jq '.database.performanceMonitoring'
```

## Performance Impact

### Expected Overhead
- **Query Execution**: < 1ms additional overhead per query
- **Memory Usage**: ~50MB for monitoring components
- **Database Storage**: ~100MB per month for metrics (configurable)

### Optimization Recommendations
1. **Cache Configuration**: Adjust TTL based on query patterns
2. **Retention Policy**: Set appropriate retention periods for metrics
3. **Threshold Tuning**: Adjust slow query thresholds based on requirements
4. **Monitoring Frequency**: Configure cleanup intervals appropriately

## Troubleshooting

### Common Issues

#### 1. Migration Fails
```bash
# Check database permissions
psql -d your_database -c "SELECT current_user, session_user;"

# Verify database version
psql -d your_database -c "SELECT version();"
```

#### 2. Performance Monitoring Not Starting
```bash
# Check application logs
tail -f logs/error.log | grep -i "performance"

# Verify configuration
curl http://localhost:3000/api/performance-monitoring/status
```

#### 3. High Memory Usage
```bash
# Check cache size
curl http://localhost:3000/api/performance-monitoring/stats | jq '.cache.memorySize'

# Clear cache if needed
curl -X DELETE http://localhost:3000/api/performance-monitoring/cache
```

### Log Analysis
Monitor these log patterns:

```bash
# Performance monitoring startup
grep "Performance monitoring initialized" logs/combined.log

# Slow query detection
grep "Slow query detected" logs/combined.log

# Cache performance
grep "cacheHit\|cacheMiss" logs/combined.log
```

## Rollback Procedure

If issues occur, rollback using these steps:

### 1. Disable Performance Monitoring
```bash
curl -X POST http://localhost:3000/api/performance-monitoring/disable
```

### 2. Remove Database Tables (if needed)
```sql
-- Drop performance monitoring tables
DROP TABLE IF EXISTS slow_query_alerts;
DROP TABLE IF EXISTS performance_metrics;
DROP TABLE IF EXISTS query_cache;
DROP TABLE IF EXISTS query_performance;
```

### 3. Revert Application Code
```bash
# Revert to previous version
git checkout previous-version
npm install
npm run build
npm start
```

## Monitoring Dashboard

### Key Metrics to Monitor
1. **Query Performance**
   - Average execution time
   - Slow query count
   - Query error rate

2. **Cache Performance**
   - Cache hit rate
   - Cache size
   - Cache evictions

3. **System Performance**
   - Memory usage
   - Database connections
   - API response times

### Alerting Thresholds
Configure alerts for:
- Slow query count > 10 per hour
- Cache hit rate < 80%
- Memory usage > 100MB
- Error rate > 5%

## Security Considerations

### API Security
- Implement authentication for monitoring endpoints
- Use HTTPS in production
- Limit access to monitoring data

### Data Privacy
- Ensure query text sanitization
- Implement data retention policies
- Consider GDPR compliance for EU users

## Maintenance

### Regular Tasks
1. **Weekly**: Review slow queries and optimize
2. **Monthly**: Analyze performance trends
3. **Quarterly**: Update monitoring thresholds

### Cleanup Tasks
```bash
# Clear old metrics (automated)
curl -X DELETE http://localhost:3000/api/performance-monitoring/queries/history

# Export performance data
curl http://localhost:3000/api/performance-monitoring/export?format=json > performance_data.json
```

## Support

For issues or questions:
1. Check application logs
2. Review API documentation
3. Test with unit/integration tests
4. Contact development team

## Version History
- **v1.0.0** (2025-10-11): Initial deployment
- Performance monitoring infrastructure
- Query caching system
- API endpoints
- Comprehensive testing
