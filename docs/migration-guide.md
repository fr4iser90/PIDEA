# Logging Migration Guide

## Overview
This guide provides step-by-step instructions for migrating from legacy logging patterns to the new standardized logging system.

## Pre-Migration Checklist

### 1. Backup Your Work
```bash
# Create a backup branch
git checkout -b logging-migration-backup
git push origin logging-migration-backup
```

### 2. Run Validation
```bash
# Check current logging compliance
node scripts/validate-logging-migration.js
```

### 3. Review Migration Plan
```bash
# Generate migration report
node scripts/enhanced-logging-migration.js --dry-run
```

## Automated Migration

### Step 1: Run Enhanced Migration
```bash
# Execute automated migration
node scripts/enhanced-logging-migration.js
```

### Step 2: Review Results
```bash
# Check migration report
cat logs/migration-report.json

# Review manual review TODOs
cat logs/manual-review-todos.md
```

### Step 3: Manual Review
For files requiring manual review:
1. Open the file listed in `logs/manual-review-todos.md`
2. Review the identified issues
3. Apply manual fixes following the patterns below
4. Test the changes

## Manual Migration Patterns

### Pattern 1: console.log → logger.info
```javascript
// Before
console.log('User logged in:', user.name);

// After
const Logger = require('@logging/Logger');
const logger = new Logger('ServiceName');
logger.info('User logged in', { user: user.username, userId: user.id });
```

### Pattern 2: logger.info → logger.info
```javascript
// Before
logger.info('Processing request');

// After
logger.info('Processing request');
```

### Pattern 3: Direct Console Assignment
```javascript
// Before
this.logger = console;

// After
const ServiceLogger = require('@logging/ServiceLogger');
this.logger = new ServiceLogger('ServiceName');
```

### Pattern 4: Template Literals
```javascript
// Before
console.log(`User ${user.name} logged in with role ${user.role}`);

// After
logger.info('User logged in', { 
  userName: user.name, 
  userRole: user.role 
});
```

### Pattern 5: Error Logging
```javascript
// Before
console.log('Error:', error);

// After
logger.serviceError('methodName', error, { context: 'additional data' });
```

### Pattern 6: Debug Logging
```javascript
// Before
console.log('Debug info:', data);

// After
logger.debug('Debug info', { data });
```

## Service-Specific Migration

### AutoFinishSystem
```javascript
// Before
this.logger = console;
this.logger.info('Auto-finish system initialized');

// After
const ServiceLogger = require('@logging/ServiceLogger');
this.logger = new ServiceLogger('AutoFinishSystem');
this.logger.info('Auto-finish system initialized');
```

### AutoTestFixSystem
```javascript
// Before
this.logger = dependencies.logger || console;

// After
const ServiceLogger = require('@logging/ServiceLogger');
this.logger = new ServiceLogger('AutoTestFixSystem');
```

### API Controllers
```javascript
// Before
console.log('API request:', req.method, req.path);

// After
const Logger = require('@logging/Logger');
const logger = new Logger('APIController');
logger.apiRequest(req.method, req.path, res.statusCode, duration);
```

## Validation and Testing

### Step 1: Run Validation
```bash
# Validate migration results
node scripts/validate-logging-migration.js
```

### Step 2: Run Tests
```bash
# Run all tests
npm test

# Run logging-specific tests
npm test tests/unit/infrastructure/logging/
npm test tests/integration/logging/
```

### Step 3: Manual Verification
1. Start the application
2. Check console output for proper formatting
3. Verify log files are created correctly
4. Test error scenarios

## Post-Migration Cleanup

### Step 1: Remove Legacy Code
```bash
# Remove backup files
find . -name "*.backup" -delete

# Remove old logging scripts
rm scripts/fix-logging.js
```

### Step 2: Update Documentation
1. Update README.md with new logging standards
2. Update API documentation
3. Update development guides

### Step 3: Team Communication
1. Announce new logging standards
2. Provide training if needed
3. Update code review guidelines

## Troubleshooting

### Common Issues

1. **Import Errors**
   ```bash
   # Check module resolution
   node -e "console.log(require.resolve('@logging/Logger'))"
   ```

2. **Missing Dependencies**
   ```bash
   # Install missing dependencies
   npm install winston
   ```

3. **Permission Errors**
   ```bash
   # Fix log directory permissions
   mkdir -p logs
   chmod 755 logs
   ```

4. **Test Failures**
   ```bash
   # Check test configuration
   npm test -- --verbose
   ```

### Rollback Plan
If issues arise:
```bash
# Switch to backup branch
git checkout logging-migration-backup

# Or restore from backup files
find . -name "*.backup" -exec sh -c 'cp "$1" "${1%.backup}"' _ {} \;
```

## Success Criteria

- [ ] All console.log usage replaced
- [ ] All logger.info usage replaced
- [ ] All direct console assignments replaced
- [ ] All tests passing
- [ ] Validation script reports 100% compliance
- [ ] Documentation updated
- [ ] Team notified of new standards

## Support

For migration issues:
1. Check this guide
2. Review migration report
3. Check manual review TODOs
4. Create an issue with details 