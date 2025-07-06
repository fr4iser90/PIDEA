# CLI Commands Reference

Complete reference for all available npm scripts and command-line tools in the Cursor Chat Agent.

## Development Commands

### Application Management

| Command | Description | Usage |
|---------|-------------|-------|
| `npm start` | Start the production server | `npm start` |
| `npm run dev` | Start development server with nodemon | `npm run dev` |
| `npm run dev:frontend` | Start frontend hot reload server | `npm run dev:frontend` |
| `npm run dev:full` | Start both backend and frontend | `npm run dev:full` |

### Testing Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `npm test` | Run test suite | `npm test` |
| `npm run test:watch` | Run tests in watch mode | `npm run test:watch` |
| `npm run test:coverage` | Run tests with coverage report | `npm run test:coverage` |

### Code Quality

| Command | Description | Usage |
|---------|-------------|-------|
| `npm run lint` | Run ESLint | `npm run lint` |
| `npm run lint:fix` | Fix ESLint issues automatically | `npm run lint:fix` |

### Build and Cleanup

| Command | Description | Usage |
|---------|-------------|-------|
| `npm run build` | Build the application | `npm run build` |
| `npm run clean` | Clean node_modules and lock file | `npm run clean` |

## DOM Analysis Commands

### Automated Analysis

| Command | Description | Usage |
|---------|-------------|-------|
| `npm run analyze-dom` | Run DOM analysis pipeline | `npm run analyze-dom` |
| `npm run auto-collect-dom` | Collect DOM data from IDE states | `npm run auto-collect-dom` |
| `npm run full-analysis` | Run complete analysis workflow | `npm run full-analysis` |

### Individual Analysis Steps

| Command | Description | Usage |
|---------|-------------|-------|
| `npm run quick-check` | Quick coverage validation | `npm run quick-check` |

### Manual Script Execution

| Script | Description | Usage |
|--------|-------------|-------|
| `node scripts/auto-dom-collector.js` | Collect DOM data manually | `node scripts/auto-dom-collector.js` |
| `node scripts/dom-analyzer.js` | Analyze DOM data manually | `node scripts/dom-analyzer.js` |
| `node scripts/bulk-dom-analyzer.js` | Bulk DOM analysis | `node scripts/bulk-dom-analyzer.js` |
| `node scripts/coverage-validator.js` | Validate selector coverage | `node scripts/coverage-validator.js` |
| `node scripts/selector-generator.js` | Generate selectors | `node scripts/selector-generator.js` |

## Quick Start Scripts

### Development Environment

```bash
# Quick start with provided script
./start-dev.sh

# Manual quick start
npm install && npm run dev:full
```

### IDE Integration

```bash
# Install Playwright browsers
npx playwright install

# Test IDE detection
node -e "
const IDEDetector = require('./src/infrastructure/external/IDEDetector');
const detector = new IDEDetector();
detector.scanForIDEs().then(console.log);
"
```

## Environment Variables

### Server Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `NODE_ENV` | `development` | Environment mode |
| `LOG_LEVEL` | `info` | Logging level |

### IDE Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `IDE_PORT_RANGE_START` | `9222` | Start of IDE detection range |
| `IDE_PORT_RANGE_END` | `9231` | End of IDE detection range |
| `IDE_CONNECTION_TIMEOUT` | `30000` | IDE connection timeout |

### Browser Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `BROWSER_HEADLESS` | `false` | Run browser in headless mode |
| `BROWSER_TIMEOUT` | `30000` | Browser operation timeout |

## Command Examples

### Development Workflow

```bash
# 1. Install dependencies
npm install

# 2. Install Playwright browsers
npx playwright install

# 3. Start development environment
npm run dev:full

# 4. In another terminal, run tests
npm test

# 5. Check code quality
npm run lint
```

### DOM Analysis Workflow

```bash
# 1. Ensure IDE is running
# 2. Run full DOM analysis
npm run full-analysis

# 3. Check results
ls output/auto-collected/
ls generated/

# 4. Quick validation
npm run quick-check
```

### Testing Workflow

```bash
# 1. Run all tests
npm test

# 2. Run tests with coverage
npm run test:coverage

# 3. Run tests in watch mode
npm run test:watch

# 4. Run specific test file
npm test -- SendMessageHandler.test.js
```

### Code Quality Workflow

```bash
# 1. Check for linting issues
npm run lint

# 2. Fix automatic issues
npm run lint:fix

# 3. Run tests
npm test

# 4. Check coverage
npm run test:coverage
```

## Troubleshooting Commands

### Port Issues

```bash
# Check what's using port 3000
lsof -i :3000

# Kill process using port
kill -9 <PID>

# Use different port
PORT=3001 npm run dev:full
```

### IDE Connection Issues

```bash
# Test IDE detection
node -e "
const IDEDetector = require('./src/infrastructure/external/IDEDetector');
const detector = new IDEDetector();
detector.scanForIDEs().then(console.log);
"

# Check browser installation
npx playwright install --force

# Test browser connection
npx playwright test --headed
```

### DOM Analysis Issues

```bash
# Check collected data
ls -la output/auto-collected/

# Verify data format
cat output/auto-collected/default-state.md

# Run analysis with debug
DEBUG=* node scripts/dom-analyzer.js
```

### Memory Issues

```bash
# Monitor memory usage
node --max-old-space-size=4096 src/server.js

# Use Node.js inspector
node --inspect --max-old-space-size=4096 src/server.js
```

## Debug Commands

### Backend Debugging

```bash
# Start with debugging
node --inspect src/server.js

# With nodemon
nodemon --inspect src/server.js

# With specific port
node --inspect=9229 src/server.js
```

### Frontend Debugging

```bash
# Start frontend with debug
DEBUG=* npm run dev:frontend

# Check frontend files
ls -la web/assets/js/
```

### IDE Integration Debugging

```bash
# Test IDE connection
node -e "
const BrowserManager = require('./src/infrastructure/external/BrowserManager');
const manager = new BrowserManager();
manager.connect(9222).then(() => console.log('Connected'));
"
```

## Performance Commands

### Memory Profiling

```bash
# Profile memory usage
node --prof src/server.js

# Analyze profile
node --prof-process isolate-*.log > profile.txt
```

### CPU Profiling

```bash
# CPU profiling
node --prof --prof-process src/server.js

# Generate flame graph
node --prof --prof-process --prof-process-out=profile.txt src/server.js
```

## Utility Commands

### File Operations

```bash
# Clean generated files
rm -rf generated/
rm -rf output/

# Reset to clean state
npm run clean && npm install
```

### Database Operations

```bash
# Clear in-memory data
# Restart the application
npm run dev:full
```

### Log Management

```bash
# View logs
tail -f logs/app.log

# Clear logs
> logs/app.log
```

## Script Development

### Creating Custom Scripts

```bash
# Create new script
touch scripts/custom-script.js

# Make executable
chmod +x scripts/custom-script.js

# Add to package.json
# "custom-script": "node scripts/custom-script.js"
```

### Script Examples

```javascript
// scripts/custom-script.js
const IDEDetector = require('../src/infrastructure/external/IDEDetector');

async function main() {
  const detector = new IDEDetector();
  const ides = await detector.scanForIDEs();
  console.log('Available IDEs:', ides);
}

main().catch(console.error);
```

## Environment-Specific Commands

### Development Environment

```bash
# Development setup
NODE_ENV=development npm run dev:full

# Development with debug
DEBUG=* NODE_ENV=development npm run dev:full
```

### Production Environment

```bash
# Production setup
NODE_ENV=production npm start

# Production with specific port
NODE_ENV=production PORT=3000 npm start
```

### Testing Environment

```bash
# Test environment
NODE_ENV=test npm test

# Test with coverage
NODE_ENV=test npm run test:coverage
```

## Command Aliases

### Common Aliases

```bash
# Quick development start
alias dev='npm run dev:full'

# Quick test run
alias test='npm test'

# Quick lint check
alias lint='npm run lint'

# Quick analysis
alias analyze='npm run full-analysis'
```

### Custom Aliases

```bash
# Add to .bashrc or .zshrc
alias cursor-dev='cd /path/to/cursor-chat-agent && npm run dev:full'
alias cursor-test='cd /path/to/cursor-chat-agent && npm test'
alias cursor-analyze='cd /path/to/cursor-chat-agent && npm run full-analysis'
```

## Help and Documentation

### Getting Help

```bash
# Show available scripts
npm run

# Show script details
npm run --help

# Show package info
npm info
```

### Documentation

```bash
# View README
cat README.md

# View package.json scripts
cat package.json | grep -A 20 '"scripts"'
```

## Best Practices

### Command Order

1. **Install dependencies**: `npm install`
2. **Setup environment**: Install Playwright browsers
3. **Start development**: `npm run dev:full`
4. **Run tests**: `npm test`
5. **Check quality**: `npm run lint`

### Error Handling

- Always check return codes
- Use `set -e` in scripts for error handling
- Log errors appropriately
- Provide meaningful error messages

### Performance

- Use appropriate Node.js flags for memory
- Monitor resource usage
- Use profiling tools when needed
- Optimize based on profiling results 