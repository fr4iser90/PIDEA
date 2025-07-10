# IDE Migration Guide

## Overview

This guide provides step-by-step instructions for migrating from the legacy IDE structure to the new unified multi-IDE system in PIDEA.

## Migration Benefits

### Before Migration
- Separate IDE services with different interfaces
- IDE-specific code scattered across the codebase
- No unified API for IDE management
- Limited IDE switching capabilities
- Inconsistent error handling

### After Migration
- Unified IDE interface with factory pattern
- Consistent API across all IDEs
- Seamless IDE switching
- Centralized configuration management
- Comprehensive error handling and recovery

## Pre-Migration Checklist

### 1. Backup Current System
```bash
# Create backup of current configuration
cp backend/config/ide-config.json backend/config/ide-config.json.backup

# Backup current IDE services
cp -r backend/domain/services/CursorIDEService.js backend/domain/services/CursorIDEService.js.backup
cp -r backend/domain/services/VSCodeService.js backend/domain/services/VSCodeService.js.backup
```

### 2. Verify Current Setup
- [ ] All existing IDE functionality is working
- [ ] Current tests are passing
- [ ] No active development work in progress
- [ ] Team is notified of migration

### 3. Environment Preparation
- [ ] Node.js version 16+ installed
- [ ] All dependencies up to date
- [ ] Sufficient disk space for backup
- [ ] Development environment isolated

## Migration Steps

### Phase 1: Core Migration (Backward Compatible)

#### Step 1: Update Service Registry
The new IDE factory is automatically registered, but legacy services remain available:

```javascript
// Old way (still works)
const cursorService = container.getService('cursorIDEService');
const vscodeService = container.getService('vscodeService');

// New way (recommended)
const ideFactory = container.getService('ideFactory');
const cursorIDE = ideFactory.createIDE('cursor', dependencies);
const vscodeIDE = ideFactory.createIDE('vscode', dependencies);
const windsurfIDE = ideFactory.createIDE('windsurf', dependencies);
```

#### Step 2: Update Configuration
The new configuration system is backward compatible:

```json
// Old configuration (still supported)
{
  "cursor": {
    "enabled": true,
    "port": 9222
  }
}

// New configuration (recommended)
{
  "ideTypes": {
    "cursor": {
      "enabled": true,
      "portRange": { "start": 9222, "end": 9231 },
      "startupTimeout": 3000
    },
    "vscode": {
      "enabled": true,
      "portRange": { "start": 9232, "end": 9241 },
      "startupTimeout": 5000
    },
    "windsurf": {
      "enabled": true,
      "portRange": { "start": 9242, "end": 9251 },
      "startupTimeout": 4000
    }
  }
}
```

#### Step 3: Test Backward Compatibility
```bash
# Run existing tests to ensure compatibility
npm test

# Test each IDE individually
npm run test:cursor
npm run test:vscode
npm run test:windsurf
```

### Phase 2: API Migration

#### Step 1: Update API Endpoints
Replace IDE-specific endpoints with unified ones:

```javascript
// Old endpoints (deprecated but still work)
GET /api/cursor/status
GET /api/vscode/status
POST /api/cursor/start
POST /api/vscode/start

// New unified endpoints (recommended)
GET /api/ide/status
GET /api/ide/status?type=cursor
GET /api/ide/status?type=vscode
POST /api/ide/start
POST /api/ide/start?type=cursor
POST /api/ide/start?type=vscode
```

#### Step 2: Update Frontend Components
```javascript
// Old way
import CursorIDEComponent from './CursorIDEComponent';
import VSCodeComponent from './VSCodeComponent';

// New way
import IDESelector from './ide/IDESelector';
import IDEMirror from './ide/IDEMirror';
import IDEContext from './ide/IDEContext';
```

#### Step 3: Update Event Handlers
```javascript
// Old way
eventBus.on('cursor:status-changed', handleCursorStatus);
eventBus.on('vscode:status-changed', handleVSCodeStatus);

// New way
eventBus.on('ide:status-changed', handleIDEStatus);
// Event includes ideType in payload
```

### Phase 3: Advanced Features

#### Step 1: Enable IDE Switching
```javascript
// Enable IDE switching in configuration
{
  "global": {
    "defaultIDE": "cursor",
    "autoSwitch": true,
    "rememberLastUsed": true
  }
}
```

#### Step 2: Configure Health Monitoring
```javascript
// Enable health monitoring
{
  "global": {
    "healthCheckInterval": 30000,
    "maxConcurrentIDEs": 5
  }
}
```

#### Step 3: Set Up Unified Scripts
```bash
# Use unified DOM collector
node scripts/ide/auto-dom-collector.js

# Use unified selector generator
node scripts/ide/selector-generator.js

# Use unified coverage validator
node scripts/ide/coverage-validator.js
```

## Migration Validation

### 1. Functional Testing
```bash
# Test all IDE types
npm run test:ide:cursor
npm run test:ide:vscode
npm run test:ide:windsurf

# Test unified API
npm run test:ide:unified

# Test IDE switching
npm run test:ide:switching
```

### 2. Performance Testing
```bash
# Test startup times
npm run test:performance:startup

# Test memory usage
npm run test:performance:memory

# Test concurrent IDE support
npm run test:performance:concurrent
```

### 3. Integration Testing
```bash
# Test full workflow
npm run test:integration:workflow

# Test error scenarios
npm run test:integration:errors

# Test recovery scenarios
npm run test:integration:recovery
```

## Rollback Procedures

### Emergency Rollback
If issues occur during migration:

```bash
# Restore backup configuration
cp backend/config/ide-config.json.backup backend/config/ide-config.json

# Restore backup services
cp backend/domain/services/CursorIDEService.js.backup backend/domain/services/CursorIDEService.js
cp backend/domain/services/VSCodeService.js.backup backend/domain/services/VSCodeService.js

# Restart services
npm run restart:services
```

### Gradual Rollback
For partial rollback:

```javascript
// Disable new features temporarily
{
  "global": {
    "useUnifiedAPI": false,
    "useFactoryPattern": false
  }
}
```

## Post-Migration Tasks

### 1. Update Documentation
- [ ] Update API documentation
- [ ] Update component documentation
- [ ] Update configuration guides
- [ ] Update troubleshooting guides

### 2. Team Training
- [ ] Conduct migration training session
- [ ] Update development guidelines
- [ ] Share best practices
- [ ] Document lessons learned

### 3. Monitoring Setup
- [ ] Set up IDE health monitoring
- [ ] Configure performance alerts
- [ ] Set up error tracking
- [ ] Monitor migration success metrics

### 4. Cleanup
- [ ] Remove deprecated code (after validation period)
- [ ] Clean up backup files
- [ ] Update CI/CD pipelines
- [ ] Optimize performance

## Troubleshooting

### Common Issues

#### Issue: IDE Not Detected
```bash
# Check IDE installation
which cursor
which code
which windsurf

# Check port availability
netstat -an | grep 9222
netstat -an | grep 9232
netstat -an | grep 9242
```

#### Issue: Factory Pattern Errors
```javascript
// Check factory registration
const factory = getIDEFactory();
console.log('Registered IDEs:', factory.getAvailableIDEs());

// Check implementation availability
const CursorIDE = require('./implementations/CursorIDE');
const VSCodeIDE = require('./implementations/VSCodeIDE');
const WindsurfIDE = require('./implementations/WindsurfIDE');
```

#### Issue: Configuration Conflicts
```bash
# Validate configuration
node scripts/ide/validate-config.js

# Reset to defaults
cp backend/config/ide-config.json.default backend/config/ide-config.json
```

### Performance Issues

#### Slow IDE Startup
```javascript
// Increase startup timeout
{
  "ideTypes": {
    "cursor": {
      "startupTimeout": 5000
    }
  }
}
```

#### High Memory Usage
```javascript
// Limit concurrent IDEs
{
  "global": {
    "maxConcurrentIDEs": 3
  }
}
```

### Error Recovery

#### IDE Crashes
```javascript
// Enable auto-restart
{
  "global": {
    "autoRestart": true,
    "restartDelay": 5000
  }
}
```

#### Port Conflicts
```javascript
// Use different port ranges
{
  "ideTypes": {
    "cursor": {
      "portRange": { "start": 9225, "end": 9234 }
    }
  }
}
```

## Success Metrics

### Migration Success Criteria
- [ ] All existing functionality preserved
- [ ] No performance degradation
- [ ] All tests passing
- [ ] Team productivity maintained
- [ ] Error rates within acceptable limits

### Performance Benchmarks
- **Startup Time**: < 5 seconds for all IDEs
- **Memory Usage**: < 200MB per IDE instance
- **API Response Time**: < 200ms for all endpoints
- **Error Rate**: < 1% for all operations

### User Experience Metrics
- **IDE Switching Time**: < 2 seconds
- **Feature Availability**: 100% for core features
- **Configuration Time**: < 5 minutes for new setup
- **Learning Curve**: < 1 day for team adoption

## Future Enhancements

### Planned Features
1. **JetBrains Support**: Add IntelliJ IDEA, WebStorm, PyCharm
2. **Sublime Text Support**: Add Sublime Text editor
3. **Cloud Integration**: Cloud-based IDE management
4. **Mobile Support**: Mobile development environment

### Extension Points
- **Custom IDE Support**: Framework for custom IDE integration
- **Plugin System**: IDE-specific plugin support
- **Advanced Automation**: Enhanced automation capabilities
- **AI Integration**: Advanced AI-powered features

## Support and Resources

### Documentation
- [Multi-IDE Overview](./overview.md)
- [IDE Comparison Matrix](./comparison.md)
- [API Documentation](../08_reference/api/)
- [Configuration Guide](./setup.md)

### Tools and Scripts
- [Unified DOM Collector](../../scripts/ide/auto-dom-collector.js)
- [Selector Generator](../../scripts/ide/selector-generator.js)
- [Coverage Validator](../../scripts/ide/coverage-validator.js)
- [Configuration Validator](../../scripts/ide/validate-config.js)

### Community Support
- GitHub Issues: Report bugs and request features
- Discord: Real-time support and discussions
- Documentation: Comprehensive guides and examples
- Examples: Sample implementations and use cases

## Conclusion

The migration to the unified multi-IDE system provides significant benefits in terms of maintainability, scalability, and user experience. The backward-compatible approach ensures a smooth transition with minimal disruption to existing workflows.

Follow this guide step-by-step, validate each phase thoroughly, and don't hesitate to rollback if issues arise. The new system is designed to be robust and flexible, providing a solid foundation for future IDE support and enhancements. 