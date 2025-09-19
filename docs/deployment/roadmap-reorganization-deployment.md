# Roadmap Reorganization Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the PIDEA Roadmap Status-Based Organization System to production environments.

## Prerequisites

### System Requirements

- **Node.js**: Version 16.x or higher
- **Database**: PostgreSQL 12+ or SQLite 3.8+
- **File System**: At least 1GB free space for backups
- **Memory**: Minimum 512MB RAM available
- **Permissions**: Write access to project directory and database

### Pre-Deployment Checklist

- [ ] Database backup completed
- [ ] File system backup completed
- [ ] Test environment validation passed
- [ ] All dependencies installed
- [ ] Environment variables configured
- [ ] Rollback plan prepared

## Deployment Steps

### Step 1: Database Migration

Apply the database schema changes:

```bash
# For PostgreSQL
psql -d pidea_db -f database/migrations/roadmap-status-reorganization.sql

# For SQLite
sqlite3 pidea.db < database/migrations/roadmap-status-reorganization.sql
```

**Verification:**
```sql
-- Check new columns exist
SELECT sql FROM sqlite_master WHERE type='table' AND name='tasks';

-- Check indexes were created
SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_tasks_%';

-- Check data in new columns
SELECT COUNT(*) as total_tasks,
       COUNT(file_path) as tasks_with_file_path,
       COUNT(organization_status) as tasks_with_organization_status
FROM tasks;
```

### Step 2: File Migration

Run the roadmap status migration:

```bash
# Execute migration script
node scripts/roadmap-status-migration.js

# Verify migration report
cat logs/roadmap-migration-report.json
```

**Expected Output:**
```json
{
  "timestamp": "2025-09-19T19:22:57.000Z",
  "totalFiles": 154,
  "processedFiles": 154,
  "failedFiles": 0,
  "successRate": "100.00"
}
```

### Step 3: Reference Updates

Update all hardcoded path references:

```bash
# Update all references
node scripts/update-roadmap-references.js all

# Verify reference update report
cat logs/reference-update-report.json
```

### Step 4: Service Integration

Update service configurations:

```bash
# Restart backend services to load new code
pm2 restart pidea-backend

# Or if using systemd
sudo systemctl restart pidea-backend
```

### Step 5: Status Manager Setup

Start the automatic status management:

```bash
# Start status manager
node scripts/roadmap-status-manager.js start

# Verify status manager is running
ps aux | grep roadmap-status-manager
```

### Step 6: Validation

Perform comprehensive validation:

```bash
# Run test suite
npm test

# Run specific roadmap tests
npm test -- --testPathPattern="roadmap"

# Check system health
curl http://localhost:3000/api/health
```

## Environment Configuration

### Production Environment Variables

```bash
# Database configuration
DATABASE_URL=postgresql://user:password@localhost:5432/pidea_prod
DATABASE_SSL=true

# Roadmap configuration
ROADMAP_AUTO_STATUS_TRANSITIONS=true
ROADMAP_AUTO_FILE_ORGANIZATION=true
ROADMAP_ARCHIVE_THRESHOLD=12
ROADMAP_ENABLE_BACKUPS=true

# Logging configuration
LOG_LEVEL=info
LOG_FILE_PATH=/var/log/pidea/roadmap.log

# Performance configuration
ROADMAP_BATCH_SIZE=50
ROADMAP_MAX_CONCURRENT_OPERATIONS=10
```

### Development Environment Variables

```bash
# Database configuration
DATABASE_URL=sqlite:./pidea_dev.db

# Roadmap configuration
ROADMAP_AUTO_STATUS_TRANSITIONS=false
ROADMAP_AUTO_FILE_ORGANIZATION=true
ROADMAP_ARCHIVE_THRESHOLD=6
ROADMAP_ENABLE_BACKUPS=true

# Logging configuration
LOG_LEVEL=debug
LOG_FILE_PATH=./logs/roadmap.log

# Performance configuration
ROADMAP_BATCH_SIZE=10
ROADMAP_MAX_CONCURRENT_OPERATIONS=5
```

## Monitoring and Maintenance

### Health Checks

Set up monitoring for the new system:

```bash
# Check status manager health
curl http://localhost:3000/api/roadmap/status

# Check file organization health
curl http://localhost:3000/api/roadmap/organization/health

# Check database health
curl http://localhost:3000/api/database/health
```

### Log Monitoring

Monitor key log files:

```bash
# Monitor migration logs
tail -f logs/roadmap-migration-report.json

# Monitor status manager logs
tail -f logs/status-manager.log

# Monitor application logs
tail -f logs/application.log | grep roadmap
```

### Performance Monitoring

Track system performance:

```bash
# Monitor file system usage
df -h /path/to/roadmap/files

# Monitor database performance
psql -c "SELECT * FROM pg_stat_activity WHERE query LIKE '%roadmap%';"

# Monitor memory usage
ps aux | grep roadmap
```

## Rollback Procedures

### Emergency Rollback

If issues occur during deployment:

```bash
# 1. Stop status manager
node scripts/roadmap-status-manager.js stop

# 2. Rollback database changes
psql -d pidea_db -f database/migrations/roadmap-status-reorganization-rollback.sql

# 3. Restore file system from backup
rsync -av /backup/roadmap/ /path/to/roadmap/

# 4. Restart services
pm2 restart pidea-backend
```

### Partial Rollback

For partial issues:

```bash
# Rollback specific files
node scripts/roadmap-status-migration.js --rollback --files="task1.md,task2.md"

# Rollback specific status changes
node scripts/roadmap-status-manager.js --rollback --status="completed"
```

## Troubleshooting

### Common Deployment Issues

1. **Database Migration Fails**
   ```bash
   # Check database connection
   psql -d pidea_db -c "SELECT version();"
   
   # Check table structure
   psql -d pidea_db -c "\d tasks"
   
   # Check for existing columns
   psql -d pidea_db -c "SELECT column_name FROM information_schema.columns WHERE table_name='tasks';"
   ```

2. **File Migration Fails**
   ```bash
   # Check file permissions
   ls -la docs/09_roadmap/tasks/
   
   # Check disk space
   df -h
   
   # Check file system errors
   dmesg | grep -i error
   ```

3. **Service Integration Fails**
   ```bash
   # Check service status
   pm2 status
   
   # Check service logs
   pm2 logs pidea-backend
   
   # Check port availability
   netstat -tlnp | grep :3000
   ```

### Performance Issues

1. **Slow Migration**
   - Reduce batch size: `ROADMAP_BATCH_SIZE=10`
   - Increase timeout: `ROADMAP_TIMEOUT=300000`
   - Check disk I/O: `iostat -x 1`

2. **High Memory Usage**
   - Reduce concurrent operations: `ROADMAP_MAX_CONCURRENT_OPERATIONS=5`
   - Enable garbage collection: `NODE_OPTIONS="--max-old-space-size=512"`
   - Monitor memory: `htop` or `top`

3. **Database Performance**
   - Check query performance: `EXPLAIN ANALYZE SELECT ...`
   - Monitor connection pool: `SELECT * FROM pg_stat_activity;`
   - Check index usage: `SELECT * FROM pg_stat_user_indexes;`

## Security Considerations

### File System Security

- **Permissions**: Ensure proper file permissions (644 for files, 755 for directories)
- **Ownership**: Verify correct user/group ownership
- **Backup Security**: Encrypt backup files if containing sensitive data

### Database Security

- **Connection Security**: Use SSL connections in production
- **Access Control**: Limit database access to necessary users
- **Audit Logging**: Enable database audit logging

### Application Security

- **Input Validation**: Validate all input parameters
- **Error Handling**: Don't expose sensitive information in errors
- **Logging Security**: Sanitize logs to remove sensitive data

## Post-Deployment Tasks

### Immediate Tasks (0-24 hours)

- [ ] Monitor system performance
- [ ] Check error logs
- [ ] Verify all functionality
- [ ] Test status transitions
- [ ] Validate file organization

### Short-term Tasks (1-7 days)

- [ ] Performance optimization
- [ ] User training
- [ ] Documentation updates
- [ ] Backup verification
- [ ] Monitoring setup

### Long-term Tasks (1-4 weeks)

- [ ] Archive old completed tasks
- [ ] Performance tuning
- [ ] User feedback collection
- [ ] System optimization
- [ ] Documentation refinement

## Support and Maintenance

### Regular Maintenance

- **Weekly**: Check log files and performance metrics
- **Monthly**: Archive old completed tasks
- **Quarterly**: Review and optimize system performance
- **Annually**: Full system review and upgrade planning

### Support Contacts

- **Technical Issues**: Development team
- **User Issues**: Support team
- **Emergency Issues**: On-call engineer
- **Documentation**: Technical writing team

---

**Last Updated**: 2025-09-19T19:22:57.000Z
**Version**: 1.0.0
**Status**: Deployment Guide Complete ✅
