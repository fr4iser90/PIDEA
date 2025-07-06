# Analysis Output Service Module

This module contains the refactored components of the original `AnalysisOutputService.js` file, split into smaller, more maintainable modules.

## Overview

The original `AnalysisOutputService.js` was a large file (1835 lines) that handled multiple responsibilities. It has been refactored into focused modules to improve maintainability, testability, and code organization.

## Module Structure

```
analysis-output/
├── constants.js              # Configuration constants and templates
├── utils.js                  # Utility functions
├── package-extractor.js      # Package extraction and filtering logic
├── markdown-formatter.js     # Markdown formatting services
├── report-generator.js       # Report generation logic
├── security-aggregator.js    # Security data aggregation for monorepos
├── file-system-service.js    # File system operations
├── index.js                  # Module exports
└── README.md                 # This documentation
```

## Components

### Constants (`constants.js`)
- **Purpose**: Centralized configuration and constants
- **Contains**: File paths, analysis types, vulnerability severities, markdown templates, thresholds
- **Usage**: Imported by other modules for consistent configuration

### Utils (`utils.js`)
- **Purpose**: Reusable utility functions
- **Contains**: File formatting, vulnerability counting, calculation functions
- **Usage**: Pure functions with no side effects

### Package Extractor (`package-extractor.js`)
- **Purpose**: Monorepo package detection and filtering
- **Contains**: Package extraction logic, analysis result filtering
- **Usage**: Handles complex package detection across different analysis types

### Markdown Formatter (`markdown-formatter.js`)
- **Purpose**: Data formatting into markdown
- **Contains**: All formatting methods for different analysis types
- **Usage**: Converts analysis data into readable markdown reports

### Report Generator (`report-generator.js`)
- **Purpose**: Report generation orchestration
- **Contains**: Monorepo and single package report generation logic
- **Usage**: Coordinates the generation of different report types

### Security Aggregator (`security-aggregator.js`)
- **Purpose**: Security data aggregation for monorepos
- **Contains**: Logic to combine security data from multiple packages
- **Usage**: Handles complex security data aggregation scenarios

### File System Service (`file-system-service.js`)
- **Purpose**: File system operations
- **Contains**: File I/O, directory management, history tracking
- **Usage**: Handles all file system interactions

## Usage

### Basic Usage
```javascript
const AnalysisOutputService = require('./AnalysisOutputService');

const service = new AnalysisOutputService();

// Save analysis result
await service.saveAnalysisResult(projectId, 'security', securityData);

// Generate markdown report
const report = await service.generateMarkdownReport(projectId, analysisResults);
```

### Direct Module Usage
```javascript
const { FileSystemService, MarkdownFormatter } = require('./analysis-output');

const fileService = new FileSystemService();
const formatter = new MarkdownFormatter();

// Use specific functionality
const formattedData = formatter.formatSecurityData(securityData);
```

## Benefits of Refactoring

1. **Maintainability**: Each module has a single responsibility
2. **Testability**: Individual modules can be tested in isolation
3. **Reusability**: Components can be used independently
4. **Readability**: Smaller files are easier to understand
5. **Modularity**: Changes to one component don't affect others
6. **Documentation**: Each module is self-documenting

## Migration Notes

- The main `AnalysisOutputService` class maintains the same public API
- All existing functionality is preserved
- No breaking changes to external consumers
- Internal implementation is now modular and maintainable

## Testing

Each module can be tested independently:

```javascript
// Test utils
const { formatFileSize } = require('./utils');
assert(formatFileSize(1024) === '1.0 KB');

// Test formatter
const { MarkdownFormatter } = require('./markdown-formatter');
const formatter = new MarkdownFormatter();
const result = formatter.formatSecurityData(testData);
```

## Future Improvements

- Add unit tests for each module
- Implement dependency injection for better testability
- Add validation layer for input data
- Consider using TypeScript for better type safety
- Add performance monitoring for large reports 