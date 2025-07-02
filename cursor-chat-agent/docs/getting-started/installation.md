# Installation Guide

Complete setup instructions for the Cursor Chat Agent.

## System Requirements

### Minimum Requirements
- **Operating System**: Windows 10+, macOS 10.15+, or Linux (Ubuntu 18.04+)
- **Node.js**: Version 16.0.0 or higher
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 2GB free space

### Recommended Requirements
- **Node.js**: Version 18.0.0 or higher
- **RAM**: 8GB or more
- **Storage**: 5GB free space
- **CPU**: Multi-core processor

## Prerequisites Installation

### 1. Install Node.js

#### Windows
1. Download Node.js from [nodejs.org](https://nodejs.org/)
2. Run the installer and follow the setup wizard
3. Verify installation: `node --version`

#### macOS
```bash
# Using Homebrew
brew install node

# Or download from nodejs.org
```

#### Linux (Ubuntu/Debian)
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2. Install Cursor IDE

1. Download Cursor IDE from [cursor.sh](https://cursor.sh/)
2. Install Cursor IDE
3. The application will automatically detect running instances

### 3. Install Git

#### Windows
Download from [git-scm.com](https://git-scm.com/)

#### macOS
```bash
brew install git
```

#### Linux
```bash
sudo apt-get install git
```

## Project Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd cursor-chat-agent
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Install Playwright Browsers (Required for IDE Integration)

```bash
npx playwright install
```

### 4. Verify Installation

```bash
# Check Node.js version
node --version

# Check npm version
npm --version

# Verify project dependencies
npm list --depth=0
```

## Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# IDE Configuration
IDE_PORT_RANGE_START=9222
IDE_PORT_RANGE_END=9231
IDE_CONNECTION_TIMEOUT=30000

# Browser Configuration
BROWSER_HEADLESS=false
BROWSER_TIMEOUT=30000

# Logging
LOG_LEVEL=info
```

### IDE Detection Settings

The application automatically detects Cursor IDE instances:

- **Port Range**: 9222-9231 (configurable)
- **Detection Method**: Chrome DevTools Protocol
- **Auto-start**: Can start new IDE instances if needed
- **Multiple IDEs**: Supports managing multiple IDE instances

## Development Setup

### 1. Install Development Dependencies

```bash
npm install --save-dev
```

### 2. Setup Pre-commit Hooks (Optional)

```bash
# Install husky for git hooks
npm install --save-dev husky
npx husky install
npx husky add .husky/pre-commit "npm run lint"
```

### 3. Configure IDE Integration

The application uses Playwright for browser automation:

- **Chrome/Chromium**: Required for IDE connection
- **Firefox**: Optional, for testing
- **WebKit**: Optional, for testing

## Verification

### 1. Start the Application

```bash
# Quick start with script
./start-dev.sh

# Or manual start
npm run dev:full
```

### 2. Check Services

- **Main Application**: `http://localhost:3000` (serves both backend API and frontend)
- **API Health Check**: `http://localhost:3000/api/health`
- **WebSocket**: `ws://localhost:3000`
- **Hot Reload Server**: `ws://localhost:3001` (for live reload)

### 3. Test IDE Connection

1. Open the application in your browser at `http://localhost:3000`
2. Check the status indicator (should be green)
3. The app will automatically scan for Cursor IDE instances
4. Try sending a test message

## Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use a different port
PORT=3001 npm run dev:full
```

#### Node.js Version Issues
```bash
# Check current version
node --version

# Use nvm to switch versions
nvm install 18
nvm use 18
```

#### IDE Connection Failed
1. Ensure Cursor IDE is installed
2. The app scans ports 9222-9231 for running instances
3. Check firewall settings
4. Restart both IDE and application

#### Browser Automation Issues
```bash
# Install browser dependencies
npx playwright install

# Or install specific browsers
npx playwright install chromium
```

#### Permission Issues (Linux/macOS)
```bash
# Make start script executable
chmod +x start-dev.sh
```

### Getting Help

- Check the [Troubleshooting Guide](../reference/troubleshooting.md)
- Review [Error Codes](../reference/errors.md)
- Open an issue on GitHub

## Next Steps

- Read the [Configuration Guide](configuration.md)
- Explore the [Development Setup](../development/setup.md)
- Check the [Architecture Overview](../architecture/overview.md) 