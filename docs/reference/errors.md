# Error Codes Reference

Complete reference for error codes, troubleshooting, and debugging in the Cursor Chat Agent.

## Error Categories

### Connection Errors

| Error Code | Description | Cause | Solution |
|------------|-------------|-------|----------|
| `CONNECTION_FAILED` | Failed to connect to IDE | IDE not running or port blocked | Start IDE or check firewall |
| `CONNECTION_TIMEOUT` | Connection timeout | IDE slow to respond | Increase timeout or restart IDE |
| `PORT_NOT_AVAILABLE` | Port already in use | Another process using port | Kill process or use different port |
| `WEBSOCKET_ERROR` | WebSocket connection failed | Network issues or server down | Check network and restart server |

### IDE Errors

| Error Code | Description | Cause | Solution |
|------------|-------------|-------|----------|
| `IDE_NOT_FOUND` | No IDE detected | IDE not running on expected ports | Start Cursor IDE |
| `IDE_DETECTION_FAILED` | IDE detection failed | Network or configuration issues | Check IDE configuration |
| `IDE_START_FAILED` | Failed to start IDE | System resources or permissions | Check system resources |
| `WORKSPACE_NOT_FOUND` | Workspace path not found | Invalid or missing workspace | Set correct workspace path |

### Browser Automation Errors

| Error Code | Description | Cause | Solution |
|------------|-------------|-------|----------|
| `BROWSER_LAUNCH_FAILED` | Failed to launch browser | Missing browser or system issues | Install Playwright browsers |
| `BROWSER_CONNECTION_FAILED` | Failed to connect to browser | Browser process issues | Restart browser or system |
| `DOM_ACCESS_FAILED` | Failed to access DOM | Page not loaded or element missing | Wait for page load |
| `SELECTOR_NOT_FOUND` | Element not found | Selector invalid or element not present | Update selectors |

### API Errors

| Error Code | Description | Cause | Solution |
|------------|-------------|-------|----------|
| `INVALID_REQUEST` | Invalid API request | Malformed request data | Check request format |
| `RESOURCE_NOT_FOUND` | Resource not found | Invalid endpoint or ID | Check endpoint and parameters |
| `UNAUTHORIZED` | Unauthorized access | Missing or invalid credentials | Check authentication |
| `RATE_LIMIT_EXCEEDED` | Rate limit exceeded | Too many requests | Reduce request frequency |

### System Errors

| Error Code | Description | Cause | Solution |
|------------|-------------|-------|----------|
| `MEMORY_EXHAUSTED` | Out of memory | Insufficient system memory | Increase memory or optimize |
| `DISK_SPACE_FULL` | Disk space full | Insufficient disk space | Free up disk space |
| `PERMISSION_DENIED` | Permission denied | Insufficient file permissions | Check file permissions |
| `PROCESS_KILLED` | Process killed | System resource limits | Check system resources |

## Common Error Messages

### Connection Issues

```
Error: CONNECTION_FAILED - Failed to connect to IDE on port 9222
```

**Solutions:**
1. Ensure Cursor IDE is running
2. Check if port 9222 is available
3. Verify firewall settings
4. Restart IDE and application

```
Error: CONNECTION_TIMEOUT - Connection timeout after 30000ms
```

**Solutions:**
1. Increase connection timeout
2. Check network connectivity
3. Restart IDE
4. Check system resources

### IDE Detection Issues

```
Error: IDE_NOT_FOUND - No IDE instances detected on ports 9222-9231
```

**Solutions:**
1. Start Cursor IDE
2. Check IDE is running on expected ports
3. Verify IDE configuration
4. Use manual IDE detection

```
Error: IDE_DETECTION_FAILED - Failed to detect IDE instances
```

**Solutions:**
1. Check network connectivity
2. Verify IDE is accessible
3. Check IDE configuration
4. Restart IDE and application

### Browser Issues

```
Error: BROWSER_LAUNCH_FAILED - Failed to launch browser
```

**Solutions:**
1. Install Playwright browsers: `npx playwright install`
2. Check system resources
3. Verify browser installation
4. Restart system if needed

```
Error: DOM_ACCESS_FAILED - Failed to access DOM elements
```

**Solutions:**
1. Wait for page to load completely
2. Check if elements exist
3. Update selectors
4. Verify IDE state

## Troubleshooting Steps

### Step 1: Check Prerequisites

```bash
# Check Node.js version
node --version  # Should be 16.0.0 or higher

# Check npm version
npm --version

# Check if dependencies are installed
npm list --depth=0
```

### Step 2: Verify IDE Setup

```bash
# Check if IDE is running
curl http://127.0.0.1:9222/json/version

# Test IDE detection manually
node -e "
const IDEDetector = require('./src/infrastructure/external/IDEDetector');
const detector = new IDEDetector();
detector.scanForIDEs().then(console.log);
"
```

### Step 3: Check Browser Installation

```bash
# Install Playwright browsers
npx playwright install

# Test browser installation
npx playwright test --headed

# Check browser availability
npx playwright --version
```

### Step 4: Verify Port Availability

```bash
# Check what's using port 3000
lsof -i :3000

# Check what's using port 9222
lsof -i :9222

# Kill process if needed
kill -9 <PID>
```

### Step 5: Check Logs

```bash
# Check application logs
tail -f logs/app.log

# Check system logs
journalctl -u cursor-chat-agent -f

# Check browser logs
npx playwright show-logs
```

## Debug Commands

### Enable Debug Logging

```bash
# Enable all debug logs
DEBUG=* npm run dev:full

# Enable specific debug logs
DEBUG=ide-detector,browser-manager npm run dev:full

# Set log level
LOG_LEVEL=debug npm run dev:full
```

### Test Individual Components

```bash
# Test IDE detection
node -e "
const IDEDetector = require('./src/infrastructure/external/IDEDetector');
const detector = new IDEDetector();
detector.scanForIDEs().then(console.log);
"

# Test browser connection
node -e "
const BrowserManager = require('./src/infrastructure/external/BrowserManager');
const manager = new BrowserManager();
manager.connect(9222).then(() => console.log('Connected'));
"

# Test WebSocket connection
node -e "
const ws = new WebSocket('ws://localhost:3000');
ws.onopen = () => console.log('Connected');
ws.onerror = (e) => console.error('Error:', e);
"
```

### Performance Debugging

```bash
# Monitor memory usage
node --max-old-space-size=4096 src/server.js

# Profile CPU usage
node --prof src/server.js

# Use Node.js inspector
node --inspect src/server.js
```

## Error Recovery

### Automatic Recovery

The application includes automatic recovery mechanisms:

```javascript
// Automatic reconnection
const reconnect = async () => {
  try {
    await connect();
  } catch (error) {
    setTimeout(reconnect, 5000);
  }
};
```

### Manual Recovery

```bash
# Restart application
npm run dev:full

# Restart IDE
# Close and reopen Cursor IDE

# Clear cache
rm -rf node_modules/.cache

# Reset state
npm run clean && npm install
```

## Error Reporting

### Collecting Error Information

```bash
# Collect system information
node -e "
console.log('Node.js version:', process.version);
console.log('Platform:', process.platform);
console.log('Architecture:', process.arch);
console.log('Memory usage:', process.memoryUsage());
"
```

### Error Logs

```bash
# View error logs
tail -f logs/error.log

# Export error logs
cp logs/error.log error-report.txt

# Check for specific errors
grep "CONNECTION_FAILED" logs/error.log
```

## Prevention

### Best Practices

1. **Regular Updates**: Keep Node.js and dependencies updated
2. **Resource Monitoring**: Monitor system resources
3. **Error Handling**: Implement proper error handling
4. **Logging**: Maintain comprehensive logging
5. **Testing**: Regular testing of all components

### Configuration

```javascript
// Robust configuration
const config = {
  connectionTimeout: 30000,
  retryAttempts: 3,
  retryDelay: 5000,
  maxReconnectAttempts: 5,
  healthCheckInterval: 30000
};
```

### Monitoring

```javascript
// Health monitoring
const healthCheck = () => {
  // Check IDE connection
  // Check browser status
  // Check WebSocket connections
  // Check system resources
};
```

## Getting Help

### Documentation

- [Quick Start Guide](../getting-started/quick-start.md)
- [Installation Guide](../getting-started/installation.md)
- [Troubleshooting Guide](troubleshooting.md)

### Support Channels

- **GitHub Issues**: Report bugs and request features
- **Documentation**: Check this error reference
- **Community**: Join developer community
- **Logs**: Check application logs for details

### Escalation

If issues persist:

1. Collect error logs and system information
2. Check if issue is known
3. Create detailed bug report
4. Include steps to reproduce
5. Provide system environment details 