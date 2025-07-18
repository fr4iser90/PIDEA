# IDE Port Management Troubleshooting Guide

## Overview
This guide helps diagnose and resolve common issues with the IDE port management system. The system is designed to be robust and self-healing, but occasionally issues may arise that require manual intervention.

## Quick Diagnostic Checklist

### Before Troubleshooting
- [ ] Verify at least one IDE is running
- [ ] Check network connectivity to backend
- [ ] Confirm browser console has no JavaScript errors
- [ ] Verify backend logs show no critical errors
- [ ] Check if the issue is intermittent or persistent

### Common Symptoms
- [ ] "No Active IDE" message appears
- [ ] IDE switching fails or is slow
- [ ] Port preferences not persisting
- [ ] Health checks failing
- [ ] Automatic recovery not working

## Issue Categories

### 1. No Active IDE Available

#### Symptoms
- Application shows "No Active IDE" message
- IDE selector shows no available options
- Port management system reports no valid ports

#### Root Causes
1. **No IDEs Running**: All IDE processes have stopped
2. **Port Range Issues**: IDEs running on unexpected ports
3. **Network Connectivity**: Backend cannot reach IDE processes
4. **Configuration Errors**: Incorrect port range configuration

#### Diagnostic Steps
1. **Check Running IDEs**:
   ```bash
   # Check for running IDE processes
   ps aux | grep -E "(cursor|vscode|windsurf)"
   
   # Check listening ports
   netstat -tlnp | grep -E "(9222|9223|9224|9232|9233|9242|9243)"
   ```

2. **Verify Port Ranges**:
   ```javascript
   // Check configuration
   console.log('Port ranges:', {
     cursor: '9222-9231',
     vscode: '9232-9241',
     windsurf: '9242-9251'
   });
   ```

3. **Test Backend Connectivity**:
   ```bash
   # Test API endpoint
   curl -X GET http://localhost:3000/api/ide/available
   ```

#### Solutions
1. **Start IDE Processes**:
   ```bash
   # Start Cursor IDE
   cursor --remote-debugging-port=9222
   
   # Start VSCode
   code --remote-debugging-port=9232
   ```

2. **Update Configuration**:
   ```javascript
   // Update port ranges if needed
   const config = {
     ideTypes: {
       cursor: { portRange: { start: 9222, end: 9231 } },
       vscode: { portRange: { start: 9232, end: 9241 } }
     }
   };
   ```

3. **Restart Backend Service**:
   ```bash
   # Restart the backend
   npm restart
   # or
   docker-compose restart backend
   ```

### 2. Port Validation Failures

#### Symptoms
- IDE switching fails with "Port validation failed"
- Health checks consistently fail
- IDE appears in list but cannot be selected

#### Root Causes
1. **IDE Not Responding**: IDE process is running but not responding
2. **Workspace Path Issues**: IDE workspace path is invalid or inaccessible
3. **Health Check Failures**: IDE health monitoring reports issues
4. **Port Conflicts**: Multiple processes using same port

#### Diagnostic Steps
1. **Check IDE Health**:
   ```bash
   # Test IDE connectivity
   curl -X GET http://localhost:9222/json/version
   curl -X GET http://localhost:9232/json/version
   ```

2. **Verify Workspace Paths**:
   ```bash
   # Check if workspace paths exist
   ls -la /path/to/workspace
   
   # Check permissions
   stat /path/to/workspace
   ```

3. **Check Port Conflicts**:
   ```bash
   # Check what's using the port
   lsof -i :9222
   lsof -i :9232
   ```

#### Solutions
1. **Restart IDE Process**:
   ```bash
   # Kill and restart IDE
   pkill -f cursor
   cursor --remote-debugging-port=9222 /path/to/workspace
   ```

2. **Fix Workspace Path**:
   ```bash
   # Create missing workspace
   mkdir -p /path/to/workspace
   
   # Fix permissions
   chmod 755 /path/to/workspace
   ```

3. **Resolve Port Conflicts**:
   ```bash
   # Kill conflicting process
   kill -9 $(lsof -t -i:9222)
   
   # Or use different port
   cursor --remote-debugging-port=9223
   ```

### 3. Persistent Port Issues

#### Symptoms
- Previously active port not loading on startup
- Port preferences not being saved
- Automatic fallback not working

#### Root Causes
1. **Storage Issues**: localStorage corrupted or full
2. **State Synchronization**: Frontend/backend state mismatch
3. **Fallback Logic**: All fallback strategies failing
4. **Event System**: Port change events not firing

#### Diagnostic Steps
1. **Check Storage**:
   ```javascript
   // Check localStorage
   console.log('IDE Storage:', localStorage.getItem('ide-storage'));
   
   // Check storage quota
   navigator.storage.estimate().then(console.log);
   ```

2. **Verify State**:
   ```javascript
   // Check frontend state
   const { activePort, portPreferences } = useIDEStore.getState();
   console.log('Frontend State:', { activePort, portPreferences });
   
   // Check backend state
   fetch('/api/ide/available').then(r => r.json()).then(console.log);
   ```

3. **Test Fallback Logic**:
   ```javascript
   // Test each fallback strategy
   const portManager = new IDEPortManager(ideManager, eventBus);
   await portManager.selectActivePort();
   ```

#### Solutions
1. **Clear Corrupted Storage**:
   ```javascript
   // Clear IDE storage
   localStorage.removeItem('ide-storage');
   
   // Reset store
   useIDEStore.getState().reset();
   ```

2. **Force State Synchronization**:
   ```javascript
   // Refresh both frontend and backend
   await useIDEStore.getState().refresh();
   
   // Restart application
   window.location.reload();
   ```

3. **Manual Port Selection**:
   ```javascript
   // Manually set active port
   await useIDEStore.getState().setActivePort(9222);
   ```

### 4. Performance Issues

#### Symptoms
- Slow IDE switching
- High memory usage
- Frequent API calls
- UI lag during port operations

#### Root Causes
1. **Excessive API Calls**: Too many health checks or refreshes
2. **Memory Leaks**: Event listeners not cleaned up
3. **Large State**: Too many stored preferences
4. **Network Latency**: Slow backend responses

#### Diagnostic Steps
1. **Monitor API Calls**:
   ```javascript
   // Check network tab for excessive calls
   // Look for repeated calls to /api/ide/available
   ```

2. **Check Memory Usage**:
   ```javascript
   // Monitor memory usage
   console.log('Memory:', performance.memory);
   
   // Check for memory leaks
   const used = process.memoryUsage();
   console.log('Backend Memory:', used);
   ```

3. **Profile Performance**:
   ```javascript
   // Profile port switching
   console.time('portSwitch');
   await switchIDE(9222);
   console.timeEnd('portSwitch');
   ```

#### Solutions
1. **Optimize API Calls**:
   ```javascript
   // Increase refresh intervals
   const config = {
     healthCheckInterval: 60000, // 1 minute
     maxRetries: 2
   };
   ```

2. **Clean Up Event Listeners**:
   ```javascript
   // Ensure proper cleanup
   useEffect(() => {
     const handler = () => {};
     eventBus.on('activeIDEChanged', handler);
     return () => eventBus.off('activeIDEChanged', handler);
   }, []);
   ```

3. **Limit Stored Data**:
   ```javascript
   // Limit preferences
   const maxPreferences = 20;
   if (portPreferences.length > maxPreferences) {
     portPreferences.splice(0, portPreferences.length - maxPreferences);
   }
   ```

### 5. Network and Connectivity Issues

#### Symptoms
- API calls timing out
- WebSocket connections failing
- Intermittent port switching failures
- Backend unreachable

#### Root Causes
1. **Network Latency**: Slow network connections
2. **Firewall Issues**: Ports blocked by firewall
3. **Proxy Configuration**: Incorrect proxy settings
4. **DNS Issues**: Hostname resolution problems

#### Diagnostic Steps
1. **Test Network Connectivity**:
   ```bash
   # Test backend connectivity
   ping localhost
   curl -I http://localhost:3000/health
   
   # Test specific ports
   telnet localhost 9222
   telnet localhost 9232
   ```

2. **Check Firewall**:
   ```bash
   # Check firewall rules
   sudo ufw status
   sudo iptables -L
   
   # Test port accessibility
   nmap -p 9222,9232,9242 localhost
   ```

3. **Verify Proxy Settings**:
   ```javascript
   // Check proxy configuration
   console.log('Proxy:', process.env.HTTP_PROXY);
   console.log('No Proxy:', process.env.NO_PROXY);
   ```

#### Solutions
1. **Configure Firewall**:
   ```bash
   # Allow IDE ports
   sudo ufw allow 9222:9251/tcp
   
   # Allow backend port
   sudo ufw allow 3000/tcp
   ```

2. **Update Network Configuration**:
   ```javascript
   // Configure timeouts
   const config = {
     requestTimeout: 10000,
     retryDelay: 2000,
     maxRetries: 5
   };
   ```

3. **Use Local Development**:
   ```bash
   # Use localhost for development
   export VITE_BACKEND_URL=http://localhost:3000
   export IDE_HOST=localhost
   ```

## Advanced Troubleshooting

### Debug Mode

Enable debug logging for detailed diagnostics:

```javascript
// Frontend debug
localStorage.setItem('debug', 'ide-store,ide-port-manager');

// Backend debug
export DEBUG=ide-port-manager,ide-manager
```

### Health Check Diagnostics

Run comprehensive health checks:

```javascript
// Frontend health check
const healthCheck = async () => {
  const store = useIDEStore.getState();
  const health = {
    activePort: store.activePort,
    availableIDEs: store.availableIDEs.length,
    preferences: store.portPreferences.length,
    lastUpdate: store.lastUpdate,
    error: store.error
  };
  console.log('Health Check:', health);
  return health;
};

// Backend health check
const backendHealth = async () => {
  const response = await fetch('/api/ide/health');
  const health = await response.json();
  console.log('Backend Health:', health);
  return health;
};
```

### State Recovery

Recover from corrupted state:

```javascript
// Reset to known good state
const recoverState = async () => {
  // Clear all state
  useIDEStore.getState().reset();
  localStorage.clear();
  
  // Restart application
  window.location.reload();
  
  // Or manually restore
  await useIDEStore.getState().loadActivePort();
};
```

## Prevention Strategies

### Regular Maintenance
1. **Monitor Logs**: Set up log monitoring for port management events
2. **Health Checks**: Implement automated health check alerts
3. **Backup Preferences**: Regularly backup port preferences
4. **Update Dependencies**: Keep IDE and backend dependencies updated

### Best Practices
1. **Graceful Degradation**: Always handle failures gracefully
2. **User Feedback**: Provide clear feedback for all operations
3. **Automatic Recovery**: Implement automatic recovery mechanisms
4. **Testing**: Regularly test fallback scenarios

### Monitoring Setup
```javascript
// Set up monitoring
const monitor = {
  // Track port switches
  onPortSwitch: (from, to) => {
    console.log(`Port switch: ${from} -> ${to}`);
    // Send to monitoring service
  },
  
  // Track failures
  onFailure: (error) => {
    console.error('Port management failure:', error);
    // Alert on repeated failures
  },
  
  // Track performance
  onPerformance: (operation, duration) => {
    console.log(`${operation} took ${duration}ms`);
    // Track slow operations
  }
};
```

## Getting Help

### When to Escalate
- Multiple fallback strategies failing
- Persistent state corruption
- Performance degradation affecting users
- Security-related issues

### Information to Collect
1. **Error Messages**: Complete error messages and stack traces
2. **Logs**: Backend and frontend logs around the issue
3. **Environment**: OS, browser, IDE versions
4. **Steps to Reproduce**: Detailed steps to reproduce the issue
5. **State Information**: Current port preferences and active port

### Support Channels
- **Documentation**: Check this troubleshooting guide first
- **Logs**: Review application logs for error patterns
- **Community**: Check community forums for similar issues
- **Development Team**: Escalate to development team with collected information 