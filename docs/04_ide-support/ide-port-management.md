# IDE Port Management Guide

## Overview
The IDE port management system provides intelligent, persistent, and robust IDE selection and switching capabilities. It eliminates "No Active IDE" scenarios by implementing multiple fallback strategies and automatic recovery mechanisms.

## Features

### Intelligent Active Port Selection
- **Previously Active Port**: Prioritizes the last used IDE port
- **First Available Port**: Falls back to the first running IDE
- **Healthiest IDE**: Selects IDE with best health status
- **Default Port Range**: Uses common default ports as last resort

### Persistent Port Preferences
- **Usage Tracking**: Remembers which ports are used most frequently
- **Weight System**: Assigns preference weights based on usage patterns
- **Cross-Session Persistence**: Maintains preferences across browser sessions
- **Automatic Updates**: Updates preferences on each port switch

### Robust Fallback Mechanisms
- **Multiple Strategies**: Four-tier fallback system ensures always having an active IDE
- **Health Monitoring**: Real-time health checks with automatic switching
- **Error Recovery**: Graceful handling of port failures and network issues
- **Automatic Retry**: Retry logic with exponential backoff

### Enhanced Error Handling
- **Validation**: Comprehensive port validation before switching
- **Graceful Degradation**: Continues operation even when some components fail
- **User Feedback**: Clear error messages and status indicators
- **Recovery**: Automatic recovery from temporary failures

## Usage

### Automatic Port Selection
The system automatically selects an active IDE port on startup:

1. **Application Start**: IDEStore loads and attempts to restore previous state
2. **Port Validation**: Validates previously active port is still available
3. **Fallback Selection**: Uses fallback strategies if previous port unavailable
4. **State Synchronization**: Updates both frontend and backend state

### Manual IDE Switching
Users can manually switch between available IDEs:

```javascript
// Using IDEStore
const { switchIDE } = useIDEStore();
await switchIDE(9222, 'manual');

// Using API directly
await apiCall('/api/ide/switch/9222', { method: 'POST' });
```

### Persistent Preferences
The system automatically tracks and remembers user preferences:

- **Usage Count**: Tracks how often each port is used
- **Last Used**: Records timestamp of last usage
- **Weight Calculation**: Assigns preference weights (0-100)
- **Automatic Persistence**: Saves to localStorage automatically

## Configuration

### Port Ranges
The system supports three IDE types with specific port ranges:

```javascript
// Cursor IDE: 9222-9231
// VSCode: 9232-9241  
// Windsurf: 9242-9251
```

### Health Check Settings
```javascript
{
  healthCheckInterval: 30000, // 30 seconds
  maxRetries: 3,
  retryDelay: 1000 // 1 second
}
```

### Fallback Strategies
The system uses these strategies in order:

1. **Previously Active**: Use last active port if still valid
2. **First Available**: Use first running IDE found
3. **Healthiest IDE**: Use IDE with best health score
4. **Default Range**: Try common default ports

## Health Monitoring

### Health Score Calculation
Each IDE receives a health score (0-100) based on:

- **Base Score**: 50 points
- **Status Bonus**: +20 for running, +10 for active
- **Health Status**: +20 for healthy, +10 for warning
- **Workspace Path**: +10 if workspace path exists
- **Preference Weight**: +0-50 based on usage history

### Health Events
The system listens for health change events:

```javascript
// Health improvement
eventBus.publish('ideHealthChanged', {
  port: 9222,
  health: 'healthy'
});

// Health degradation
eventBus.publish('ideHealthChanged', {
  port: 9222,
  health: 'unhealthy'
});
```

## Error Recovery

### Port Failure Handling
When a port fails, the system automatically:

1. **Removes from Preferences**: Clears failed port from preferences
2. **Selects New Port**: Uses fallback strategies to find new active port
3. **Updates State**: Synchronizes frontend and backend state
4. **Notifies User**: Provides feedback about the switch

### Network Failure Recovery
The system handles network failures gracefully:

- **Retry Logic**: Automatic retries with exponential backoff
- **Graceful Degradation**: Continues with cached data when possible
- **Error Boundaries**: Prevents cascading failures
- **User Feedback**: Clear error messages and recovery status

## API Reference

### Backend Endpoints

#### Switch IDE Port
```http
POST /api/ide/switch/{port}
```

**Parameters:**
- `port` (number): Target IDE port

**Response:**
```json
{
  "success": true,
  "data": {
    "port": 9222,
    "status": "active",
    "workspacePath": "/path/to/workspace",
    "previousPort": 9223
  }
}
```

#### Get Available IDEs
```http
GET /api/ide/available
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "port": 9222,
      "status": "running",
      "workspacePath": "/path/to/workspace",
      "ideType": "cursor",
      "active": true,
      "healthStatus": "healthy"
    }
  ]
}
```

### Frontend Store

#### IDEStore Methods
```javascript
const {
  activePort,
  availableIDEs,
  isLoading,
  error,
  setActivePort,
  loadActivePort,
  loadAvailableIDEs,
  switchIDE,
  refresh,
  clearError,
  reset
} = useIDEStore();
```

#### Key Methods
- `setActivePort(port)`: Set active port with validation
- `loadActivePort()`: Load active port using fallback strategies
- `switchIDE(port, reason)`: Switch to different IDE
- `refresh()`: Refresh IDE list and validate current port
- `handlePortFailure(port, reason)`: Handle port failure with recovery

## Troubleshooting

### Common Issues

#### "No Active IDE" Error
**Cause**: No valid IDE ports available
**Solution**: 
1. Check if any IDEs are running
2. Verify port ranges are correct
3. Check network connectivity
4. Restart IDE processes

#### Port Validation Failed
**Cause**: IDE not running or unhealthy
**Solution**:
1. Verify IDE is running on specified port
2. Check IDE health status
3. Ensure workspace path exists
4. Restart IDE if necessary

#### Persistent Port Not Loading
**Cause**: Previously active port no longer available
**Solution**:
1. System automatically falls back to available ports
2. Check if IDE was moved to different port
3. Verify IDE configuration
4. Clear preferences if needed

### Debug Information

#### Backend Logs
Look for these log messages:
```
[IDEPortManager] Selecting active port...
[IDEPortManager] Using previously active port: 9222
[IDEPortManager] Port validation successful: 9222
[IDEManager] Port manager selected active IDE on port 9222
```

#### Frontend Logs
Check browser console for:
```
[IDEStore] Loading active port...
[IDEStore] Using previously active port: 9222
[IDEStore] Port validation successful: 9222
[IDEStore] Active port set successfully: 9222
```

### Performance Optimization

#### Caching Strategy
- **Port Preferences**: Cached in localStorage
- **IDE List**: Cached with 30-second refresh interval
- **Health Status**: Real-time updates via events
- **Validation Results**: Cached for 5 seconds

#### Memory Management
- **Preference Limit**: Maximum 50 stored preferences
- **Health History**: Limited to last 100 health events
- **Error History**: Limited to last 10 errors
- **Automatic Cleanup**: Removes stale data periodically

## Best Practices

### Development
1. **Always Validate**: Validate ports before switching
2. **Handle Errors**: Implement proper error handling
3. **Use Events**: Listen for port change events
4. **Test Fallbacks**: Test all fallback scenarios

### Production
1. **Monitor Health**: Set up health monitoring
2. **Log Events**: Log important port management events
3. **Alert on Failures**: Set up alerts for repeated failures
4. **Regular Testing**: Test recovery mechanisms regularly

### User Experience
1. **Clear Feedback**: Provide clear status indicators
2. **Automatic Recovery**: Handle failures transparently
3. **Persistent State**: Remember user preferences
4. **Fast Switching**: Optimize for quick IDE switching

## Migration Guide

### From Old System
If migrating from the old IDE management system:

1. **Backup Preferences**: Export current IDE preferences
2. **Update Components**: Replace old IDE management with new system
3. **Test Fallbacks**: Verify all fallback strategies work
4. **Monitor Logs**: Watch for any migration issues

### Configuration Changes
Update configuration files:

```javascript
// Old configuration
const ideConfig = {
  defaultPort: 9222,
  autoSwitch: true
};

// New configuration
const ideConfig = {
  fallbackStrategies: ['previously_active', 'first_available', 'healthiest_ide'],
  healthCheckInterval: 30000,
  maxRetries: 3
};
```

## Future Enhancements

### Planned Features
- **Machine Learning**: Predict optimal IDE selection
- **Advanced Health Metrics**: More sophisticated health scoring
- **Load Balancing**: Distribute load across multiple IDEs
- **Custom Port Ranges**: User-configurable port ranges

### Extension Points
- **Custom Validators**: Add custom port validation logic
- **Health Providers**: Integrate with external health monitoring
- **Event Handlers**: Custom event handling for port changes
- **Storage Adapters**: Support for different storage backends 