# Logging System Overhaul – Phase 1: Core Logger Architecture

## Overview
Implement the foundational components of the modern logging system with structured formatting, automatic correlation, performance monitoring, and comprehensive sanitization.

## Duration: 3 hours

## Objectives
- [ ] Create StructuredLogger class with proper levels and correlation tracking
- [ ] Implement LogFormatter with colors, structure, and performance monitoring
- [ ] Create LogLevels constants and validation system
- [ ] Set up Winston configuration with custom transports
- [ ] Implement LogSanitizer for sensitive data with comprehensive patterns
- [ ] Create LogCorrelation for request tracing across services
- [ ] Implement LogPerformance for real-time monitoring

## Deliverables

### Core Logger Components
- File: `backend/infrastructure/logging/StructuredLogger.js` - Main structured logger with correlation and performance
- File: `backend/infrastructure/logging/LogFormatter.js` - Advanced formatting with colors and structure
- File: `backend/infrastructure/logging/LogLevels.js` - Log level constants and validation
- File: `backend/infrastructure/logging/LogSanitizer.js` - Comprehensive sensitive data detection and redaction
- File: `backend/infrastructure/logging/LogCorrelation.js` - Request correlation ID management
- File: `backend/infrastructure/logging/LogPerformance.js` - Performance monitoring and metrics
- File: `backend/infrastructure/logging/index.js` - Main export file with factory pattern

### Configuration & Setup
- File: `backend/infrastructure/logging/config.js` - Centralized logging configuration
- File: `backend/infrastructure/logging/constants.js` - Logging constants and patterns

### Tests
- Test: `tests/unit/infrastructure/logging/StructuredLogger.test.js` - Core logger functionality
- Test: `tests/unit/infrastructure/logging/LogSanitizer.test.js` - Sanitization patterns
- Test: `tests/unit/infrastructure/logging/LogFormatter.test.js` - Formatting and colors
- Test: `tests/unit/infrastructure/logging/LogCorrelation.test.js` - Correlation tracking

## Dependencies
- Requires: Winston, Chalk, Crypto, fs-extra (already in package.json)
- Blocks: Phase 2 start

## Technical Specifications

### StructuredLogger Features
```javascript
class StructuredLogger {
  constructor(options = {}) {
    this.level = options.level || 'info';
    this.service = options.service || 'unknown';
    this.colors = options.colors !== false;
    this.sanitize = options.sanitize !== false;
    this.correlation = options.correlation !== false;
    this.performance = options.performance !== false;
    this.encryption = options.encryption || false;
  }

  // Standard log methods
  info(message, data = {}) { /* implementation */ }
  debug(message, data = {}) { /* implementation */ }
  warn(message, data = {}) { /* implementation */ }
  error(message, error = null, data = {}) { /* implementation */ }
  trace(message, data = {}) { /* implementation */ }
  success(message, data = {}) { /* implementation */ }
  failure(message, data = {}) { /* implementation */ }
  
  // Performance monitoring
  time(label) { /* implementation */ }
  timeEnd(label) { /* implementation */ }
  
  // Correlation tracking
  withCorrelation(correlationId) { /* implementation */ }
  
  // Structured logging
  structured(level, message, data = {}) { /* implementation */ }
}
```

### LogSanitizer Patterns
- **Authentication**: `password`, `token`, `secret`, `key`, `auth`, `jwt`
- **File paths**: `/home/`, `/Users/`, `/tmp/`, `projectPath`, `workspacePath`
- **Analysis data**: `analysisResult`, `dependencies`, `metadata`, `config`
- **User data**: `user`, `email`, `phone`, `address`, `name`
- **Network**: `ip`, `hostname`, `port`, `url`, `endpoint`
- **Database**: `connectionString`, `query`, `result`, `credentials`

### LogCorrelation Features
- Automatic correlation ID generation
- Request context preservation
- Cross-service tracing
- Performance tracking per request
- Error correlation

### LogPerformance Features
- Memory usage monitoring
- CPU usage tracking
- Response time measurement
- Resource utilization alerts
- Performance trend analysis

## Success Criteria
- [ ] All core logger components created and functional
- [ ] Structured JSON output working correctly
- [ ] Color formatting with terminal detection
- [ ] Sensitive data redaction with 100% accuracy
- [ ] Request correlation working across services
- [ ] Performance monitoring active and accurate
- [ ] All unit tests passing (95% coverage)
- [ ] Winston configuration optimized
- [ ] Factory pattern implemented correctly

## Risk Mitigation
- **Performance Impact**: Use async logging with buffering
- **Memory Leaks**: Implement proper cleanup and garbage collection
- **Color Compatibility**: Add terminal detection and fallbacks
- **Circular References**: Handle in sanitization and formatting

## Next Phase Dependencies
- Core logger architecture must be complete
- All unit tests must pass
- Performance benchmarks must be met
- Security patterns must be validated 