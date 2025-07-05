# SingleRepoStrategy - Refactored Architecture

This directory contains the refactored SingleRepoStrategy modules, organized for better maintainability and separation of concerns.

## Architecture Overview

The original 1171-line SingleRepoStrategy.js file has been split into smaller, focused modules:

```
single-repo/
├── constants/
│   └── index.js                 # All constants and configuration
├── utils/
│   ├── fileUtils.js            # File system utility functions
│   └── directoryScanner.js     # Directory scanning utilities
├── services/
│   ├── dependencyAnalyzer.js   # Dependency analysis logic
│   ├── projectTypeAnalyzer.js  # Project type detection
│   ├── structureAnalyzer.js    # Project structure analysis
│   ├── buildToolsAnalyzer.js   # Build tools detection
│   ├── testingAnalyzer.js      # Testing setup analysis
│   ├── lintingAnalyzer.js      # Linting setup analysis
│   ├── deploymentAnalyzer.js   # Deployment configuration analysis
│   ├── performanceAnalyzer.js  # Performance analysis
│   ├── securityAnalyzer.js     # Security analysis
│   ├── recommendationsService.js # Recommendations generation
│   └── optimizationService.js  # Optimization logic
├── validators/
│   └── repositoryTypeValidator.js # Repository type validation
└── README.md                   # This documentation
```

## Module Responsibilities

### Constants (`constants/index.js`)
- Centralized configuration and constants
- Framework definitions
- File patterns and configurations
- Dependency categories

### Utilities (`utils/`)
- **fileUtils.js**: File system operations, file existence checks, JSON parsing
- **directoryScanner.js**: Directory traversal, file scanning, exclusion logic

### Services (`services/`)
- **dependencyAnalyzer.js**: Package.json analysis, dependency categorization
- **projectTypeAnalyzer.js**: Framework and project type detection
- **structureAnalyzer.js**: Project structure and file organization analysis
- **buildToolsAnalyzer.js**: Build tool detection (webpack, vite, etc.)
- **testingAnalyzer.js**: Test file detection and testing setup analysis
- **lintingAnalyzer.js**: Linting configuration and tool detection
- **deploymentAnalyzer.js**: Deployment configuration analysis
- **performanceAnalyzer.js**: Performance-related dependency analysis
- **securityAnalyzer.js**: Security configuration and dependency analysis
- **recommendationsService.js**: Recommendation generation based on analysis
- **optimizationService.js**: Optimization strategies and implementations

### Validators (`validators/`)
- **repositoryTypeValidator.js**: Single repository vs monorepo detection

## Benefits of Refactoring

1. **Maintainability**: Each module has a single responsibility
2. **Testability**: Individual modules can be unit tested in isolation
3. **Reusability**: Services can be reused in other parts of the application
4. **Readability**: Smaller files are easier to understand and navigate
5. **Extensibility**: New analysis types can be added as separate services
6. **Separation of Concerns**: Business logic is separated from utility functions

## Backward Compatibility

The main `SingleRepoStrategy.js` file maintains the same public interface, ensuring that existing code continues to work without changes. All original methods are preserved as legacy aliases that delegate to the appropriate service modules.

## Usage

The refactored strategy is used exactly like the original:

```javascript
const SingleRepoStrategy = require('./infrastructure/strategies/SingleRepoStrategy');

const strategy = new SingleRepoStrategy({
    logger: console,
    eventBus: eventBus,
    fileSystemService: fileSystemService
});

const analysis = await strategy.analyzeSingleRepo(projectPath);
const isSingleRepo = await strategy.isSingleRepo(projectPath);
```

## Adding New Analysis Types

To add a new analysis type:

1. Create a new service in `services/`
2. Add any new constants to `constants/index.js`
3. Initialize the service in the main `SingleRepoStrategy` constructor
4. Add the analysis to the `analyzeSingleRepo` method
5. Add a legacy alias method if needed for backward compatibility

## Testing

Each module can be tested independently:

```javascript
const DependencyAnalyzer = require('./services/dependencyAnalyzer');
const analyzer = new DependencyAnalyzer(logger, fileUtils);
const analysis = await analyzer.analyzeDependencies(projectPath);
```

## Migration Notes

- The original file is backed up as `SingleRepoStrategy.js.backup`
- All existing functionality is preserved
- No breaking changes to the public API
- Performance should be equivalent or better due to better organization 