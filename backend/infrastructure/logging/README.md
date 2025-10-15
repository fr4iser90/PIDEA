# PIDEA Logging System

## Overview

The PIDEA logging system is a comprehensive, environment-aware logging infrastructure built on Winston that provides structured logging with intelligent formatting, terminal detection, and environment-specific configurations.

## Architecture

### Core Components

- **Logger.js** - Main logging class with Winston integration
- **LoggingUtility.js** - High-level logging utilities for common patterns
- **LogConfig.js** - Centralized configuration management
- **ColorManager.js** - Terminal-aware color management
- **TerminalDetector.js** - Terminal capability detection
- **TimeFormatter.js** - Time formatting utilities
- **constants.js** - Logging constants and configurations

### Log Levels

| Level | Abbreviation | Emoji | Description | Environment Visibility |
|-------|-------------|-------|-------------|----------------------|
| `error` | `[E]` | ❌ | Critical errors | All environments |
| `warn` | `[W]` | ⚠️ | Warnings | All environments |
| `info` | `[I]` | ℹ️ | General information | Development + Production |
| `debug` | `[D]` | 🔍 | Debug information | Development only |
| `success` | `[S]` | ✅ | Success messages | All environments |
| `failure` | `[F]` | 💥 | Failure messages | All environments |

## Environment Configuration

### Development Environment (`NODE_ENV=development`)
- **Log Level**: `info` (default)
- **Console Output**: ✅ Enabled with colors and emojis
- **File Output**: ✅ Enabled (error.log + combined.log)
- **Debug Logs**: ✅ Visible
- **Stack Traces**: ✅ Full stack traces in errors
- **Performance Timing**: ✅ Enabled

### Production Environment (`NODE_ENV=production`)
- **Log Level**: `warn` (default)
- **Console Output**: ✅ Enabled (no colors in non-TTY)
- **File Output**: ✅ Enabled (error.log + combined.log)
- **Debug Logs**: ❌ Hidden
- **Stack Traces**: ❌ Hidden (only error messages)
- **Performance Timing**: ❌ Disabled

### Test Environment (`NODE_ENV=test`)
- **Log Level**: `error` (default)
- **Console Output**: ✅ Minimal
- **File Output**: ✅ Error logs only
- **Debug Logs**: ❌ Hidden
- **Stack Traces**: ❌ Hidden

## Environment Variables

### Core Logging Variables

| Variable | Description | Default | Environment | Usage |
|----------|-------------|---------|-------------|-------|
| `NODE_ENV` | Environment mode | `development` | All | Controls overall behavior |
| `LOG_LEVEL` | Main application log level | Environment-specific | All | **Primary logging control** |

### Framework-Specific Variables (Auto-Generated)

| Variable | Description | Default | Source | Purpose |
|----------|-------------|---------|--------|---------|
| `FRAMEWORK_LOG_LEVEL` | Framework system log level | `info` | framework-config.json | Framework loading logs |
| `FRAMEWORK_LOG_FORMAT` | Framework log format | `json` | framework-config.json | Framework log structure |
| `FRAMEWORK_LOG_MAX_FILES` | Max framework log files | `10` | framework-config.json | Framework log rotation |
| `FRAMEWORK_LOG_MAX_SIZE` | Max framework log file size | `10MB` | framework-config.json | Framework log size limit |
| `FRAMEWORK_LOGGING_ENABLED` | Enable framework logging | `true` | framework-config.json | Framework log toggle |

### Important Notes

- **`LOG_LEVEL`** is the **main variable** for your application
- **`FRAMEWORK_LOG_*`** variables are **automatically** generated from `framework-config.json`
- You only need to set **`LOG_LEVEL`** manually if needed
- Framework variables only control the framework system, not your app logs

## Log Output Destinations

### Console Output
- **Format**: `HH:mm:ss [LEVEL] [SERVICE] message {metadata}`
- **Colors**: Enabled in TTY terminals
- **Emojis**: Enabled for visual distinction
- **Example**: `07:01:18 [I] [Server] 👤 Ensuring default user exists...`

### File Output

#### error.log
- **Level**: `error` and above
- **Format**: JSON with full timestamps
- **Location**: `logs/error.log`
- **Purpose**: Critical errors and failures

#### combined.log
- **Level**: All levels
- **Format**: JSON with full timestamps
- **Location**: `logs/combined.log`
- **Purpose**: Complete application log

## Usage Patterns

### Basic Usage

```javascript
const Logger = require('@logging/Logger');
const logger = Logger.getLogger('MyService');

// Basic logging
logger.info('Service started');
logger.warn('Configuration warning');
logger.error('Critical error occurred');

// With metadata
logger.info('User action completed', { userId: '123', action: 'login' });
```

### Advanced Usage with LoggingUtility

```javascript
const LoggingUtility = require('@logging/LoggingUtility');
const logUtil = new LoggingUtility('MyService');

// Operation lifecycle logging
logUtil.logOperationStart('Database migration');
logUtil.logOperationComplete('Database migration', { tablesCreated: 5 });
logUtil.logOperationError('Database migration', error, { step: 'create_tables' });

// Specialized logging
logUtil.logAuthEvent('login', { userId: '123', ip: '192.168.1.1' });
logUtil.logPerformance('Database query', 150, { queryType: 'SELECT' });
logUtil.logDataAccess('create', 'User', { userId: '123' });
```

### Service-Specific Logging

```javascript
// Each service gets its own logger instance
const logger = Logger.getLogger('DatabaseService');
const logger2 = Logger.getLogger('AuthService');

// Logs will show [DatabaseService] and [AuthService] respectively
logger.info('Connection established');
logger2.info('User authenticated');
```

## Log Analysis from Your Output

Based on your `npm run dev` output, here's what's being logged:

### Development Environment Behavior ✅
- **Console Output**: Rich formatting with emojis and colors
- **Service Tags**: `[Server]`, `[AutoSecurityManager]`, `[DatabaseConnection]`, etc.
- **Timestamps**: `07:01:18` format
- **Metadata**: Structured data in JSON format
- **Debug Info**: Detailed initialization steps visible

### Production Environment Behavior (What Would Change)
- **Log Level**: Would be `warn` instead of `info`
- **Debug Logs**: Would be hidden (no `🔍` debug messages)
- **Stack Traces**: Would be minimal
- **Colors**: Would be disabled in non-TTY environments

## Log Rotation and Management

### File Management
- **Max File Size**: 10MB per file
- **Max Files**: 10 files per log type
- **Compression**: Enabled for archived logs
- **Location**: `logs/` directory

### Performance Considerations
- **Caching**: Enabled for high-frequency logging
- **Async Writing**: Non-blocking log writes
- **Memory Limits**: Configurable memory usage
- **Flush Intervals**: 5-second flush intervals

## Security and Sensitive Data

### Data Sanitization
- **Secrets**: Automatically redacted
- **Passwords**: Never logged
- **API Keys**: Masked in logs
- **Personal Data**: Filtered out

### Sensitive Patterns Detected
- JWT tokens
- Database credentials
- API keys
- User passwords
- Session tokens

## Monitoring and Alerting

### Health Monitoring
- **Log Level Monitoring**: Track log level changes
- **Error Rate Monitoring**: Count error occurrences
- **Performance Monitoring**: Track log write performance
- **Disk Space Monitoring**: Monitor log file sizes

### Integration Points
- **External Logging**: Ready for ELK stack integration
- **Metrics Collection**: Compatible with Prometheus
- **Alerting**: Structured for alert system integration

## Best Practices

### Do's ✅
- Use appropriate log levels
- Include relevant metadata
- Use service-specific loggers
- Log operation start/completion
- Include context in error messages

### Don'ts ❌
- Don't log sensitive data
- Don't use console.log in production
- Don't log large objects directly
- Don't ignore log level configuration
- Don't log in tight loops without throttling

## Troubleshooting

### Common Issues

1. **Logs not appearing**: Check `LOG_LEVEL` environment variable
2. **Colors not working**: Verify terminal TTY support
3. **File permissions**: Ensure `logs/` directory is writable
4. **Performance issues**: Check log rotation settings
5. **Missing metadata**: Verify service name configuration

### Debug Commands

```bash
# Check current log level
echo $LOG_LEVEL

# Test logging configuration
node -e "const Logger = require('./backend/infrastructure/logging/Logger'); const logger = Logger.getLogger('Test'); logger.testConfiguration();"

# View log files
tail -f logs/combined.log
tail -f logs/error.log
```

## Migration and Upgrades

### From console.log
```javascript
// Old way
console.log('User logged in');

// New way
const logger = Logger.getLogger('AuthService');
logger.info('User logged in', { userId: '123' });
```

### From Basic Winston
```javascript
// Old way
const winston = require('winston');
const logger = winston.createLogger({...});

// New way
const Logger = require('@logging/Logger');
const logger = Logger.getLogger('MyService');
```

## Future Enhancements

### Planned Features
- **Structured Logging**: Enhanced JSON schema validation
- **Log Aggregation**: Centralized log collection
- **Real-time Monitoring**: Live log streaming
- **Advanced Filtering**: Dynamic log filtering
- **Performance Metrics**: Detailed performance logging

### Integration Roadmap
- **ELK Stack**: Elasticsearch, Logstash, Kibana
- **Grafana**: Dashboard integration
- **Prometheus**: Metrics collection
- **Jaeger**: Distributed tracing

---

## Quick Reference

### Environment Setup
```bash
# Development
NODE_ENV=development LOG_LEVEL=info npm run dev

# Production
NODE_ENV=production LOG_LEVEL=warn npm start

# Test
NODE_ENV=test LOG_LEVEL=error npm test
```

### Common Log Patterns
```javascript
// Service initialization
logger.info('🚀 Service initialized', { version: '1.0.0' });

// Operation tracking
logger.info('📊 Operation completed', { duration: 150, records: 100 });

// Error handling
logger.error('❌ Operation failed', { error: error.message, context: 'user_creation' });

// Performance monitoring
logger.info('⚡ Performance metric', { operation: 'db_query', duration: 50 });
```

This logging system provides comprehensive, production-ready logging with intelligent environment detection and structured output suitable for both development debugging and production monitoring.

## Standards and References

### Industry Standards

#### RFC 5424 - Syslog Protocol
- **Source**: [RFC 5424](https://tools.ietf.org/html/rfc5424)
- **Log Levels**: Emergency, Alert, Critical, Error, Warning, Notice, Informational, Debug
- **Our Implementation**: Maps to Winston levels (error, warn, info, debug)

#### Winston Logging Framework
- **Source**: [Winston GitHub](https://github.com/winstonjs/winston)
- **Documentation**: [Winston Documentation](https://github.com/winstonjs/winston#logging-levels)
- **Log Levels**: error, warn, info, verbose, debug, silly
- **Our Extension**: Added success, failure levels for better semantic logging

#### 12-Factor App Methodology
- **Source**: [12factor.net](https://12factor.net/logs)
- **Principle**: "Treat logs as event streams"
- **Implementation**: Structured JSON logging, environment-based configuration

#### Node.js Best Practices
- **Source**: [Node.js Logging Best Practices](https://nodejs.org/en/docs/guides/logging/)
- **Recommendations**: Use structured logging, avoid console.log in production
- **Our Implementation**: Service-specific loggers, metadata inclusion

### Environment Configuration Standards

#### Development Environment
- **Log Level**: `info` (RFC 5424 Informational)
- **Output**: Console + Files
- **Format**: Human-readable with colors/emojis
- **Reference**: [Winston Console Transport](https://github.com/winstonjs/winston/blob/master/docs/transports.md#console-transport)

#### Production Environment  
- **Log Level**: `warn` (RFC 5424 Warning)
- **Output**: Files only (JSON format)
- **Format**: Structured JSON for log aggregation
- **Reference**: [Production Logging Best Practices](https://www.sumologic.com/glossary/production-logging/)

#### Test Environment
- **Log Level**: `error` (RFC 5424 Error)
- **Output**: Minimal console output
- **Format**: Clean output for test readability
- **Reference**: [Testing Best Practices](https://jestjs.io/docs/getting-started)

### Security Standards

#### OWASP Logging Guidelines
- **Source**: [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- **Sensitive Data**: Never log passwords, tokens, PII
- **Our Implementation**: Automatic data sanitization patterns

#### GDPR Compliance
- **Source**: [GDPR Article 32](https://gdpr-info.eu/art-32-gdpr/)
- **Data Protection**: Log access controls, data processing events
- **Our Implementation**: User action logging, data access tracking

### Performance Standards

#### Log Rotation
- **Source**: [Logrotate Documentation](https://linux.die.net/man/8/logrotate)
- **Max Size**: 10MB (industry standard)
- **Max Files**: 10 (common practice)
- **Compression**: Enabled for archived logs

#### Async Logging
- **Source**: [Node.js Event Loop](https://nodejs.org/en/docs/guides/event-loop-timers-and-nexttick/)
- **Implementation**: Non-blocking Winston transports
- **Performance**: Prevents I/O blocking

### Monitoring and Observability

#### OpenTelemetry Standards
- **Source**: [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- **Structured Logging**: JSON format compatible with OTel collectors
- **Trace Correlation**: Ready for distributed tracing

#### ELK Stack Integration
- **Source**: [Elasticsearch Logging Guide](https://www.elastic.co/guide/en/elasticsearch/reference/current/logging.html)
- **Format**: JSON structured logs
- **Indexing**: Optimized for Elasticsearch ingestion

### Configuration Management

#### Environment Variables
- **Source**: [12factor.net Config](https://12factor.net/config)
- **Implementation**: `NODE_ENV`, `LOG_LEVEL` environment-based config
- **Security**: No secrets in code, environment-driven

#### Winston Configuration
- **Source**: [Winston Configuration](https://github.com/winstonjs/winston#configuring-logging)
- **Transports**: Console, File transports
- **Formats**: Custom console format, JSON file format

### Validation and Testing

#### Log Level Validation
- **Source**: [Winston Log Levels](https://github.com/winstonjs/winston#logging-levels)
- **Implementation**: Environment-specific default levels
- **Override**: `LOG_LEVEL` environment variable

#### Terminal Detection
- **Source**: [Node.js TTY Detection](https://nodejs.org/api/tty.html)
- **Implementation**: Automatic color/format detection
- **Fallback**: Plain text for non-TTY environments

### Future Compliance

#### Cloud Native Standards
- **Kubernetes Logging**: [Kubernetes Logging Architecture](https://kubernetes.io/docs/concepts/cluster-administration/logging/)
- **Container Logs**: JSON format for container orchestration
- **Log Aggregation**: Ready for Fluentd, Logstash integration

#### Microservices Logging
- **Distributed Tracing**: [Jaeger Documentation](https://www.jaegertracing.io/docs/)
- **Service Mesh**: Compatible with Istio logging
- **Correlation IDs**: Ready for request tracing

---

## Implementation Compliance

Our logging system follows these standards:

✅ **RFC 5424**: Structured log levels and formats  
✅ **Winston**: Industry-standard Node.js logging  
✅ **12-Factor App**: Environment-based configuration  
✅ **OWASP**: Security-aware logging practices  
✅ **GDPR**: Privacy-compliant data handling  
✅ **OpenTelemetry**: Observability-ready format  
✅ **Cloud Native**: Container-friendly logging  

This ensures compatibility with enterprise logging infrastructure and monitoring tools.
