# Status Badge & UI Improvements - User Guide

## Overview
The Status Badge & UI Improvements feature provides real-time IDE status monitoring, enhanced IDE management, and improved user experience for starting and managing IDE instances.

## Features

### 1. Status Badge
- **Real-time Status Display**: Shows current IDE status with color-coded indicators
- **Status Indicators**:
  - 🟢 Green: IDE is running
  - 🟡 Yellow: IDE is starting
  - 🔴 Red: IDE is stopped or has an error
  - ⚪ Gray: IDE is disconnected or status unknown
- **Click to Refresh**: Click the status badge to manually refresh IDE status
- **Detailed Tooltips**: Hover over the status badge to see detailed information
- **Status History**: View recent status changes and uptime information

### 2. IDE Start Modal
- **IDE Type Selection**: Choose between Cursor, VS Code, and Windsurf
- **Port Configuration**: Auto-assign ports or select specific ports
- **Workspace Selection**: Browse and select project directories
- **Advanced Options**: Custom executable paths and command line flags
- **Cross-platform Support**: Works on Windows, Linux, and macOS

### 3. Enhanced Status Display
- **Real-time Updates**: Status updates automatically every 5 seconds
- **Status Animations**: Visual feedback for status changes
- **Error Handling**: Clear error messages and troubleshooting hints
- **Performance Metrics**: Connection time, response times, and error counts

## Usage

### Starting a New IDE

1. **Via Header**: Click the status badge in the header to refresh status
2. **Via Sidebar**: Click the "🚀" button in the left sidebar IDE management section
3. **Via Modal**: The IDE Start Modal will open with configuration options

#### IDE Start Modal Configuration

1. **Select IDE Type**:
   - **Cursor**: AI-powered code editor (Ports: 9222-9231)
   - **VS Code**: Microsoft Visual Studio Code (Ports: 9232-9241)
   - **Windsurf**: AI-powered development environment (Ports: 9242-9251)

2. **Configure Port**:
   - **Auto-assign**: Let the system choose an available port
   - **Specific Port**: Select from available ports in the IDE's range
   - **Custom Port**: Enter a custom port number (must be in valid range)

3. **Advanced Options** (Optional):
   - **Executable Path**: Specify custom path to IDE executable
   - **Additional Flags**: Add command line flags for IDE startup

4. **Start IDE**: Click "Start IDE" to begin the startup process

### Monitoring IDE Status

#### Status Badge Information
- **Current Status**: Running, Starting, Stopped, Error, or Disconnected
- **IDE Type**: Cursor, VS Code, Windsurf, etc.
- **Port Number**: The port the IDE is running on
- **Workspace Path**: Current project directory
- **Last Update**: When the status was last refreshed

#### Status History
- **Recent Changes**: View the last 5 status changes
- **Timestamps**: See when each status change occurred
- **Uptime**: How long the IDE has been running (for running IDEs)

#### Error Handling
- **Error Indicators**: ⚠️ icon appears when there are errors
- **Error Messages**: Clear descriptions of what went wrong
- **Troubleshooting**: Hover over error indicators for more information

## Keyboard Shortcuts

- **Escape**: Close the IDE Start Modal
- **Enter**: Submit the IDE Start Modal form (when focused)
- **Tab**: Navigate between form fields

## Troubleshooting

### Common Issues

#### IDE Won't Start
1. **Check Port Availability**: Ensure the selected port is not in use
2. **Verify IDE Installation**: Make sure the IDE is properly installed
3. **Check Permissions**: Ensure you have permission to start the IDE
4. **Review Error Messages**: Check the error message for specific details

#### Status Not Updating
1. **Manual Refresh**: Click the status badge to refresh manually
2. **Check Connection**: Ensure the backend service is running
3. **Browser Refresh**: Try refreshing the browser page
4. **Clear Cache**: Clear browser cache and cookies

#### Modal Won't Open
1. **Check Authentication**: Ensure you're logged in
2. **Browser Compatibility**: Use a modern browser (Chrome, Firefox, Safari, Edge)
3. **JavaScript Enabled**: Ensure JavaScript is enabled in your browser

### Error Messages

#### "Invalid IDE type"
- **Cause**: Selected IDE type is not supported
- **Solution**: Choose from Cursor, VS Code, or Windsurf

#### "Port must be between X and Y"
- **Cause**: Selected port is outside the valid range for the IDE type
- **Solution**: Choose a port within the specified range or use auto-assign

#### "Failed to start IDE"
- **Cause**: Backend error or IDE startup failure
- **Solution**: Check backend logs, verify IDE installation, try a different port

#### "Network Error"
- **Cause**: Connection to backend service failed
- **Solution**: Check if backend service is running, verify network connection

## Technical Details

### Port Ranges
- **Cursor**: 9222-9231
- **VS Code**: 9232-9241
- **Windsurf**: 9242-9251

### Status Update Frequency
- **Automatic**: Every 5 seconds
- **Manual**: On status badge click
- **Event-driven**: On IDE state changes

### Browser Support
- **Chrome**: 90+
- **Firefox**: 88+
- **Safari**: 14+
- **Edge**: 90+

### Responsive Design
- **Desktop**: Full feature set with detailed information
- **Tablet**: Compact layout with essential features
- **Mobile**: Minimal interface with core functionality

## API Integration

The Status Badge system integrates with the following API endpoints:

- `GET /api/ide/available` - Get available IDE instances
- `POST /api/ide/start` - Start a new IDE instance
- `POST /api/ide/detect-workspace-paths` - Detect available workspace paths
- `GET /api/ide/status` - Get IDE status information

## Performance Considerations

- **Status Updates**: Limited to 5-second intervals to prevent excessive API calls
- **Caching**: Status information is cached to reduce server load
- **Error Recovery**: Automatic retry mechanisms for failed requests
- **Memory Usage**: Minimal memory footprint with efficient state management

## Security

- **Authentication**: All IDE operations require user authentication
- **Port Validation**: Port ranges are validated to prevent conflicts
- **Input Sanitization**: All user inputs are sanitized before processing
- **Error Handling**: Sensitive information is not exposed in error messages

## Support

For additional support or to report issues:

1. **Check Logs**: Review browser console and backend logs
2. **Documentation**: Refer to the technical documentation
3. **Community**: Check the project's issue tracker
4. **Contact**: Reach out to the development team

---

*Last Updated: 2025-09-27T21:31:50.000Z*
