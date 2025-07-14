# PIDEA Logging Standards

## Overview
This document defines the standardized logging approach for the PIDEA project. All logging should follow these patterns to ensure consistency, security, and maintainability.

## Core Principles

### 1. Centralized Logging
- Use the centralized Logger system for all logging
- No direct console.log usage
- Consistent formatting across all services

### 2. Security First
- Never log sensitive data (passwords, tokens, API keys)
- Mask file paths in production logs
- Sanitize all user input before logging

### 3. Service-Specific Logging
- Use ServiceLogger for service-specific logging
- Include service name in all log entries
- Use appropriate log levels

## Logging Components

### Logger.js
The core logging class that provides Winston integration with console and file transports.

```javascript
const Logger = require('@logging/Logger');
const logger = new Logger('ServiceName');

logger.info('Message');
logger.warn('Warning');
logger.error('Error');
logger.debug('Debug info');
logger.success('Success');
logger.failure('Failure');
```

### ServiceLogger.js
A wrapper for service-specific logging that provides consistent interface and metadata.

```javascript
const ServiceLogger = require('@logging/ServiceLogger');
const logger = new ServiceLogger('ServiceName');

logger.info('Service message');
logger.serviceMethod('methodName', 'Method executed');
logger.serviceError('methodName', error, { context: 'data' });
```

### LogStandardizer.js
Automatically sanitizes log content by masking secrets and sensitive data.

```javascript
const LogStandardizer = require('@logging/LogStandardizer');
const standardizer = new LogStandardizer();

const sanitized = standardizer.sanitize(message, metadata);
```

## Log Levels

### Error (❌)
Use for errors that prevent normal operation:
```javascript
logger.error('Database connection failed', { error: error.stack });
```

### Warn (⚠️)
Use for warnings that don't prevent operation but need attention:
```javascript
logger.warn('High memory usage detected', { usage: '85%' });
```

### Info (ℹ️)
Use for general information about application flow:
```javascript
logger.info('User login successful', { userId: '123' });
```

### Debug (🔍)
Use for detailed debugging information (only in development):
```javascript
logger.debug('Processing request', { requestId: 'abc123' });
```

### Success (✅)
Use for successful operations:
```javascript
logger.success('Task completed successfully', { taskId: '456' });
```

### Failure (💥)
Use for failed operations:
```javascript
logger.failure('Task failed', { taskId: '456', error: 'Timeout' });
```

## Best Practices

### 1. Service Naming
Always use descriptive service names:
```javascript
// Good
const logger = new ServiceLogger('UserAuthenticationService');

// Bad
const logger = new ServiceLogger('Auth');
```

### 2. Message Formatting
Use clear, descriptive messages:
```javascript
// Good
logger.info('User profile updated', { userId: '123', fields: ['name', 'email'] });

// Bad
logger.info('Updated', { id: '123' });
```

### 3. Metadata Usage
Include relevant context in metadata:
```javascript
logger.info('API request processed', {
  method: 'POST',
  endpoint: '/api/users',
  duration: 150,
  statusCode: 201
});
```

### 4. Error Logging
Always include error details:
```javascript
try {
  // Some operation
} catch (error) {
  logger.serviceError('operationName', error, {
    context: 'additional context'
  });
}
```

## Security Guidelines

### 1. Never Log Sensitive Data
```javascript
// ❌ Bad
logger.info('User login', { password: 'secret123', token: 'abc123' });

// ✅ Good
logger.info('User login', { username: 'john', userId: '123' });
```

### 2. Mask File Paths
```javascript
// ❌ Bad
logger.info('File processed', { path: '/home/user/documents/file.txt' });

// ✅ Good
logger.info('File processed', { path: '[PATH]' });
```

### 3. Sanitize User Input
```javascript
const standardizer = new LogStandardizer();
const sanitized = standardizer.sanitize(userInput);
logger.info('User input received', sanitized);
```

## Migration Guide

### From console.log
```javascript
// Old
console.log('User logged in:', user);

// New
logger.info('User logged in', { user: user.username, userId: user.id });
```

### From logger.info (legacy)
```javascript
// Old
logger.info('Processing request');

// New
logger.info('Processing request');
```

### From direct console assignment
```javascript
// Old
this.logger = console;

// New
const ServiceLogger = require('@logging/ServiceLogger');
this.logger = new ServiceLogger('ServiceName');
```

## Configuration

### Environment Variables
- `LOG_LEVEL`: Set logging level (error, warn, info, debug)
- `NODE_ENV`: Determines default log level (production: warn, development: info)

### File Output
Logs are written to:
- `logs/error.log`: Error-level logs only
- `logs/combined.log`: All logs

### Console Output
- Colorized output in development
- Structured JSON in production

## Testing

### Unit Tests
Run logging unit tests:
```bash
npm test tests/unit/infrastructure/logging/
```

### Integration Tests
Run logging integration tests:
```bash
npm test tests/integration/logging/
```

### Validation
Validate logging compliance:
```bash
node scripts/validate-logging-migration.js
```

## Troubleshooting

### Common Issues

1. **Missing Logger Import**
   ```javascript
   // Add this import
   const Logger = require('@logging/Logger');
   const logger = new Logger('ServiceName');
   ```

2. **Legacy Patterns**
   - Replace `console.log` with `logger.info`
   - Replace `logger.info` with `logger.info`
   - Replace `this.logger = console` with ServiceLogger

3. **Sensitive Data in Logs**
   - Use LogStandardizer to sanitize data
   - Review logs for unmasked secrets
   - Update logging patterns to exclude sensitive data

### Performance Considerations
- Log calls should complete in <0.1ms
- Use appropriate log levels to reduce overhead
- Consider async logging for high-volume scenarios

## Support

For questions about logging standards:
1. Check this documentation
2. Review existing logging patterns in the codebase
3. Consult the logging infrastructure code
4. Create an issue for complex scenarios

## Professional Development Patterns

### Pattern 1: Simple Logger (Recommended for most cases)
```javascript
const Logger = require('@logging/Logger');
const logger = new Logger('ServiceName');

logger.info('Service started');
logger.warn('High memory usage');
logger.error('Connection failed', { error: error.stack });
```

### Pattern 2: ServiceLogger (For complex services with many methods)
```javascript
const ServiceLogger = require('@logging/ServiceLogger');
const logger = new ServiceLogger('ServiceName');

logger.serviceMethod('initialize', 'Service initialized');
logger.serviceError('processData', error, { dataSize: 1000 });
```

### Pattern 3: Clean Output (No service names in console)
```javascript
const Logger = require('@logging/Logger');
const logger = new Logger(); // No service name

logger.info('Application started');
logger.warn('Configuration warning');
```

## Current Issues Fixed

### 1. Double Service Names
**Problem**: `[ServiceName] [ServiceName]` appeared in logs
**Solution**: ServiceLogger no longer adds service metadata when Logger constructor already handles it

### 2. Inconsistent Formatting
**Problem**: Mixed emoji usage and formatting
**Solution**: Standardized emoji usage across all log levels

### 3. Mixed Patterns
**Problem**: Some services used Logger directly, others used ServiceLogger
**Solution**: Clear guidelines for when to use each pattern

### 4. Redundant Service Tags
**Problem**: Service name appeared twice in many logs
**Solution**: Fixed ServiceLogger to not duplicate service metadata 