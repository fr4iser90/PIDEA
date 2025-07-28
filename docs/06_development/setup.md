# Development Setup

Complete guide for setting up the Cursor Chat Agent development environment.

## Prerequisites

### Required Software

- **Node.js** 16.0.0 or higher
- **Git** for version control
- **Cursor IDE** for testing IDE integration
- **Chrome/Chromium** browser for Playwright

### Recommended Tools

- **VS Code** or **Cursor IDE** for development
- **Postman** or **Insomnia** for API testing
- **Chrome DevTools** for debugging

## Environment Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd cursor-chat-agent
```

### 2. Install Dependencies

```bash
# Install production dependencies
npm install

# Install development dependencies
npm install --save-dev
```

### 3. Install Playwright Browsers

```bash
# Install all browsers
npx playwright install

# Or install specific browser
npx playwright install chromium
```

### 4. Environment Configuration

Create a `.env` file in the project root:

```env
# Development Configuration
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug

# IDE Configuration
IDE_PORT_RANGE_START=9222
IDE_PORT_RANGE_END=9231
IDE_CONNECTION_TIMEOUT=30000

# Browser Configuration
BROWSER_HEADLESS=false
BROWSER_TIMEOUT=30000

# Development Server
DEV_SERVER_PORT=3000
HOT_RELOAD=true
```

## Development Workflow

### Starting Development

#### Quick Start
```bash
# Use the provided script
./start-dev.sh
```

#### Manual Start
```bash
# Start full development environment
npm run dev:full

# Or start individual services
npm run dev          # Backend only
npm run dev:frontend # Frontend hot reload only
```

### Development Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start backend with nodemon |
| `npm run dev:frontend` | Start frontend hot reload server |
| `npm run dev:full` | Start both backend and frontend |
| `npm test` | Run test suite |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint issues automatically |

### Hot Reloading

The development environment includes hot reloading:

- **Backend**: Nodemon watches `src/` directory
- **Frontend**: Custom dev server watches `web/` directory
- **WebSocket**: Real-time reload notifications

## Project Structure

### Source Code Organization

```
src/
├── domain/           # Business logic and entities
├── application/      # Use cases and handlers
├── infrastructure/   # External services and data access
├── presentation/     # API controllers and WebSocket
├── Application.js    # Main application class
└── server.js         # Entry point
```

### Frontend Structure

```
web/
├── assets/
│   ├── css/          # Stylesheets
│   └── js/           # Frontend JavaScript
├── pages/            # HTML pages
└── index.html        # Main application
```

### Scripts and Tools

```
scripts/
├── auto-dom-collector.js    # Automated DOM collection
├── dom-analyzer.js          # DOM analysis
├── bulk-dom-analyzer.js     # Bulk analysis
├── coverage-validator.js    # Coverage validation
└── selector-generator.js    # Selector generation
```

## Development Tools

### Code Quality

#### ESLint Configuration

```javascript
// .eslintrc.js
module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module'
  },
  rules: {
    'no-console': 'warn',
    'no-unused-vars': 'error'
  }
};
```

#### Pre-commit Hooks

```bash
# Install husky
npm install --save-dev husky

# Setup pre-commit hook
npx husky install
npx husky add .husky/pre-commit "npm run lint"
```

### Testing

#### Test Structure

```
tests/
├── unit/             # Unit tests
├── integration/      # Integration tests
└── e2e/             # End-to-end tests
```

#### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- SendMessageHandler.test.js

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Debugging

#### Backend Debugging

```bash
# Start with debugging
node --inspect src/server.js

# Or with nodemon
nodemon --inspect src/server.js
```

#### Frontend Debugging

```javascript
// Add debug statements
console.log('[DEBUG]', data);

// Use browser dev tools
debugger;
```

#### IDE Integration Debugging

```bash
# Test IDE detection
node -e "
const IDEDetector = require('./src/infrastructure/external/IDEDetector');
const detector = new IDEDetector();
detector.scanForIDEs().then(console.log);
"
```

## API Development

### Testing API Endpoints

#### Using cURL

```bash
# Test health endpoint
curl http://localhost:3000/api/health

# Send a message
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, Cursor!"}'

# Get available IDEs
curl http://localhost:3000/api/ide/available
```

#### Using Postman

1. Import the API collection
2. Set base URL to `http://localhost:3000`
3. Test endpoints with sample data

### WebSocket Testing

```javascript
// Test WebSocket connection
const ws = new WebSocket('ws://localhost:3000');

ws.onopen = () => {
  console.log('Connected to WebSocket');
};

ws.onmessage = (event) => {
  console.log('Received:', JSON.parse(event.data));
};
```

## DOM Analysis Development

### Running DOM Analysis

```bash
# Run full DOM analysis
npm run full-analysis

# Run individual steps
npm run auto-collect-dom
npm run analyze-dom
npm run quick-check
```

### DOM Collection

```bash
# Collect DOM data from IDE states
node scripts/auto-dom-collector.js

# Analyze collected data
node scripts/dom-analyzer.js

# Validate coverage
node scripts/coverage-validator.js
```

### Selector Generation

```bash
# Generate selectors
node scripts/selector-generator.js

# Check generated files
ls generated/
```

## Performance Monitoring

### Memory Usage

```bash
# Monitor memory usage
node --max-old-space-size=4096 src/server.js

# Use Node.js inspector
node --inspect --max-old-space-size=4096 src/server.js
```

### Performance Profiling

```javascript
// Add performance markers
console.time('operation');
// ... operation code ...
console.timeEnd('operation');
```

## Troubleshooting

### Common Issues

#### Port Conflicts

```bash
# Check what's using the port
lsof -i :3000

# Kill process
kill -9 <PID>

# Use different port
PORT=3000 npm run dev:full
```

#### IDE Connection Issues

```bash
# Test IDE detection manually
node -e "
const IDEDetector = require('./src/infrastructure/external/IDEDetector');
const detector = new IDEDetector();
detector.scanForIDEs().then(console.log);
"

# Check browser installation
npx playwright install --force
```

#### Hot Reload Issues

```bash
# Restart dev server
npm run dev:frontend

# Clear cache
rm -rf node_modules/.cache
```

### Debug Mode

```bash
# Enable debug logging
DEBUG=* npm run dev:full

# Or set log level
LOG_LEVEL=debug npm run dev:full
```

## Best Practices

### Code Organization

- Follow DDD principles
- Keep layers separated
- Use dependency injection
- Write meaningful tests

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes and commit
git add .
git commit -m "feat: add new feature"

# Push and create PR
git push origin feature/new-feature
```

### Testing Strategy

- Write unit tests for business logic
- Write integration tests for API endpoints
- Write e2e tests for critical user flows
- Maintain good test coverage

### Documentation

- Keep documentation up to date
- Document API changes
- Add inline comments for complex logic
- Update README for new features

## Deployment

### Development Deployment

```bash
# Build for development
npm run build

# Start production server
npm start
```

### Environment Variables

```bash
# Production environment
NODE_ENV=production
PORT=3000
LOG_LEVEL=warn
BROWSER_HEADLESS=true
```

## Next Steps

- Read the [Architecture Overview](../architecture/overview.md)
- Explore the [API Reference](../api/rest-api.md)
- Check the [Testing Guide](testing.md)
- Review the [Code Style Guide](code-style.md) 