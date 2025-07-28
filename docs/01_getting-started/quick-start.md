# Quick Start Guide

Get the Cursor Chat Agent up and running in minutes.

## Prerequisites

- **Node.js** 16.0.0 or higher
- **Cursor IDE** installed (the app will auto-detect running instances)
- **Git** for cloning the repository

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd cursor-chat-agent
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Install Playwright browsers** (required for IDE integration)
   ```bash
   npx playwright install
   ```

## Running the Application

### Quick Start (Recommended)
```bash
./start-dev.sh
```
This script installs dependencies and starts the full development environment.

### Manual Start
```bash
npm run dev:full
```
This starts both the backend server and frontend with hot reloading on port 3000.

### Individual Services
```bash
# Backend only (serves frontend on port 3000)
npm run dev

# Frontend hot reload server only (port 3000 for live reload)
npm run dev:frontend
```

## Access the Application

1. Open your browser and navigate to `http://localhost:3000`
2. The application will automatically scan for Cursor IDE instances on ports 9222-9231
3. If no IDE is found, the app can start one for you

## IDE Integration

The application automatically:
- **Scans ports 9222-9231** for running Cursor IDE instances
- **Connects via Chrome DevTools Protocol** to the detected IDE
- **Manages multiple IDE instances** if available
- **Can start new IDE instances** if needed

## First Steps

1. **Check Connection Status**: Look for the status indicator in the header
2. **Switch Views**: Use "Chat" and "IDE" buttons to switch between modes
3. **Test Chat**: Send a message to verify IDE integration
4. **Explore Code**: Use the code explorer to browse your project files

## Troubleshooting

### No IDE Detected
- The app scans ports 9222-9231 for Cursor IDE
- Make sure Cursor IDE is running
- The app can start a new IDE instance for you

### Port Conflicts
- The main application runs on port 3000
- Hot reload server runs on port 3000
- Change with environment variables: `PORT=3000 npm run dev:full`

### Browser Automation Issues
```bash
# Install Playwright browsers
npx playwright install
```

## Next Steps

- Read the [Installation Guide](installation.md) for detailed setup
- Explore the [Configuration Guide](configuration.md) for customization
- Check the [Architecture Overview](../architecture/overview.md) to understand the system design 