# DOM Analysis

The Cursor Chat Agent includes sophisticated DOM analysis capabilities that automatically collect, analyze, and generate selectors for IDE elements.

## Overview

The DOM analysis system provides:
- Automated DOM collection from different IDE states
- Bulk analysis of collected DOM data
- Selector generation and validation
- Coverage validation for generated selectors
- Real-time DOM monitoring and debugging

## Core Components

### Auto DOM Collector

Automatically collects DOM data from various IDE states.

```javascript
const AutoDOMCollector = require('./scripts/auto-dom-collector');

const collector = new AutoDOMCollector();
await collector.collectAllStates();
```

**Features:**
- **State Collection**: Collects DOM from 11 different IDE states
- **Automated Actions**: Performs actions to trigger different IDE states
- **Data Storage**: Saves DOM data to `output/auto-collected/`
- **Report Generation**: Creates collection reports

### DOM Analyzer

Analyzes collected DOM data and generates selectors.

```javascript
const DOMAnalyzer = require('./scripts/dom-analyzer');

const analyzer = new DOMAnalyzer();
await analyzer.analyze();
```

**Features:**
- **Element Analysis**: Analyzes DOM elements and their properties
- **Selector Generation**: Generates reliable CSS selectors
- **Pattern Recognition**: Identifies common DOM patterns
- **Validation**: Validates generated selectors

### Bulk DOM Analyzer

Performs bulk analysis across multiple DOM states.

```javascript
const BulkDOMAnalyzer = require('./scripts/bulk-dom-analyzer');

const bulkAnalyzer = new BulkDOMAnalyzer();
await bulkAnalyzer.analyze();
```

**Features:**
- **Cross-state Analysis**: Analyzes elements across multiple states
- **Consistency Checking**: Ensures selectors work across states
- **Optimization**: Optimizes selectors for reliability
- **Comprehensive Coverage**: Ensures all elements are covered

### Coverage Validator

Validates selector coverage and effectiveness.

```javascript
const CoverageValidator = require('./scripts/coverage-validator');

const validator = new CoverageValidator();
await validator.validate();
```

**Features:**
- **Coverage Analysis**: Analyzes selector coverage
- **Effectiveness Testing**: Tests selector effectiveness
- **Quick Validation**: Provides quick validation checks
- **Report Generation**: Generates coverage reports

### Selector Generator

Generates final selector files for use in the application.

```javascript
const SelectorGenerator = require('./scripts/selector-generator');

const generator = new SelectorGenerator();
await generator.generate();
```

**Features:**
- **File Generation**: Generates `generated/selectors.js`
- **IDE Integration**: Creates `generated/CursorIDE.js`
- **Optimization**: Optimizes selectors for performance
- **Documentation**: Includes selector documentation

## IDE States Analyzed

The system collects DOM data from the following IDE states:

### 1. Default State
- **Description**: Basic IDE view
- **Action**: No specific action
- **Elements**: Main IDE interface elements

### 2. Chat Active
- **Description**: Chat panel active
- **Action**: Activates chat panel
- **Elements**: Chat interface, message areas

### 3. Command Palette
- **Description**: Command palette open (Ctrl+Shift+P)
- **Action**: Opens command palette
- **Elements**: Command palette, search input

### 4. Quick Open
- **Description**: Quick open dialog (Ctrl+P)
- **Action**: Opens quick open dialog
- **Elements**: File search, results list

### 5. Global Search
- **Description**: Global search (Ctrl+Shift+F)
- **Action**: Opens global search
- **Elements**: Search interface, results

### 6. Extensions Panel
- **Description**: Extensions panel (Ctrl+Shift+X)
- **Action**: Opens extensions panel
- **Elements**: Extensions list, management interface

### 7. Debug Panel
- **Description**: Debug panel (Ctrl+Shift+D)
- **Action**: Opens debug panel
- **Elements**: Debug interface, variables, call stack

### 8. Terminal Active
- **Description**: Terminal active (Ctrl+Shift+`)
- **Action**: Opens terminal
- **Elements**: Terminal interface, command line

### 9. Problems Panel
- **Description**: Problems panel (Ctrl+Shift+M)
- **Action**: Opens problems panel
- **Elements**: Error list, warnings, info

### 10. Output Panel
- **Description**: Output panel (Ctrl+Shift+U)
- **Action**: Opens output panel
- **Elements**: Output console, logs

### 11. Settings Open
- **Description**: Settings dialog open
- **Action**: Opens settings
- **Elements**: Settings interface, options

## Usage

### Full Analysis Workflow

```bash
# Run complete DOM analysis
npm run full-analysis
```

This command runs the entire analysis pipeline:
1. Auto-collect DOM data
2. Bulk DOM analysis
3. Original DOM analysis
4. Merge analysis results
5. Coverage validation
6. Selector generation

### Individual Steps

```bash
# Collect DOM data only
npm run auto-collect-dom

# Analyze collected data
npm run analyze-dom

# Quick coverage check
npm run quick-check
```

### Manual Execution

```bash
# Run individual scripts
node scripts/auto-dom-collector.js
node scripts/bulk-dom-analyzer.js
node scripts/dom-analyzer.js
node scripts/coverage-validator.js
node scripts/selector-generator.js
```

## Output Files

### Generated Files

```
generated/
├── CursorIDE.js          # IDE-specific selectors
└── selectors.js          # General selectors
```

### Analysis Output

```
output/
├── auto-collected/       # Collected DOM data
│   ├── default-state.md
│   ├── chat-active.md
│   ├── command-palette.md
│   └── ...
├── bulk-analysis-results.json
├── dom-analysis-results.json
├── coverage-validation-report.json
└── collection-report.json
```

## Selector Generation

### Selector Types

The system generates several types of selectors:

#### CSS Selectors
```javascript
// Element selectors
'.chat-container'
'#editor-panel'
'[data-testid="chat-input"]'

// Compound selectors
'.sidebar .file-explorer'
'.panel.active .content'
```

#### XPath Selectors
```javascript
// XPath expressions
'//div[@class="chat-container"]'
'//button[contains(text(), "Send")]'
'//div[@data-testid="message"]'
```

#### Data Attributes
```javascript
// Data attribute selectors
'[data-testid="chat-input"]'
'[data-component="message"]'
'[data-state="active"]'
```

### Selector Optimization

The system optimizes selectors for:

- **Reliability**: Selectors that work consistently
- **Performance**: Fast element selection
- **Maintainability**: Easy to understand and modify
- **Specificity**: Unique element identification

## Coverage Validation

### Coverage Metrics

The system tracks several coverage metrics:

- **Element Coverage**: Percentage of elements with selectors
- **State Coverage**: Coverage across different IDE states
- **Selector Effectiveness**: Success rate of selectors
- **Uniqueness**: Selector uniqueness across states

### Validation Process

```javascript
// Coverage validation
const coverage = {
  totalElements: 150,
  coveredElements: 145,
  coveragePercentage: 96.7,
  uniqueSelectors: 142,
  duplicateSelectors: 3
};
```

## Real-time DOM Monitoring

### Live DOM Access

```javascript
// Access current DOM
const page = await browserManager.getPage();
const html = await page.content();

// Find specific elements
const chatContainer = await page.$('.chat-container');
const editorContent = await page.$('.editor-content');
```

### DOM Debugging

```javascript
// Debug DOM state
const debugDOM = async () => {
  const page = await browserManager.getPage();
  const domState = await page.evaluate(() => {
    return {
      chatVisible: !!document.querySelector('.chat-container'),
      editorVisible: !!document.querySelector('.editor-container'),
      sidebarVisible: !!document.querySelector('.sidebar')
    };
  });
  
  console.log('DOM State:', domState);
};
```

## Configuration

### Analysis Configuration

```javascript
// Configure DOM analysis
const config = {
  collectionTimeout: 5000,
  retryAttempts: 3,
  selectorTypes: ['css', 'xpath', 'data-attr'],
  coverageThreshold: 90,
  outputDir: './output/auto-collected'
};
```

### State Configuration

```javascript
// Configure IDE states
const stateConfigs = [
  {
    name: 'default-state',
    description: 'Basic IDE view',
    action: () => collectDefaultState(),
    timeout: 1000
  },
  {
    name: 'chat-active',
    description: 'Chat panel active',
    action: () => activateChat(),
    timeout: 1500
  }
];
```

## Performance Optimization

### Batch Processing

```javascript
// Process multiple states in batch
const batchProcess = async (states) => {
  const results = [];
  
  for (const state of states) {
    const result = await processState(state);
    results.push(result);
  }
  
  return results;
};
```

### Caching

```javascript
// Cache DOM data
const domCache = new Map();

const getCachedDOM = async (stateName) => {
  if (domCache.has(stateName)) {
    return domCache.get(stateName);
  }
  
  const dom = await collectDOM(stateName);
  domCache.set(stateName, dom);
  return dom;
};
```

## Error Handling

### Collection Errors

```javascript
// Handle collection failures
try {
  await collector.collectState(stateName);
} catch (error) {
  console.error(`Failed to collect ${stateName}:`, error);
  
  // Retry with different approach
  await collector.collectStateWithRetry(stateName);
}
```

### Analysis Errors

```javascript
// Handle analysis failures
try {
  await analyzer.analyze();
} catch (error) {
  console.error('Analysis failed:', error);
  
  // Fallback to basic analysis
  await analyzer.basicAnalysis();
}
```

## Troubleshooting

### Common Issues

#### Collection Fails

```bash
# Check IDE connection
curl http://127.0.0.1:9222/json/version

# Verify browser installation
npx playwright install --force

# Test manual collection
node -e "
const collector = require('./scripts/auto-dom-collector');
collector.collectDefaultState().then(console.log);
"
```

#### Analysis Errors

```bash
# Check collected data
ls -la output/auto-collected/

# Verify data format
cat output/auto-collected/default-state.md

# Run analysis with debug
DEBUG=* node scripts/dom-analyzer.js
```

#### Selector Issues

```bash
# Check generated selectors
cat generated/selectors.js

# Validate selectors
node scripts/coverage-validator.js quick

# Regenerate selectors
node scripts/selector-generator.js
```

## Future Enhancements

### Planned Features

- **AI-Powered Analysis**: Machine learning for better selector generation
- **Visual Selector Builder**: GUI for manual selector creation
- **Cross-Browser Support**: Support for different browsers
- **Performance Profiling**: Selector performance analysis
- **Automated Testing**: Automated selector testing

### Analysis Improvements

- **Pattern Recognition**: Better pattern identification
- **Dynamic Element Handling**: Support for dynamic content
- **Accessibility Analysis**: Accessibility-focused selectors
- **Internationalization**: Multi-language support
- **Custom Selector Types**: User-defined selector types 