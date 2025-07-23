# Expand Analyse Steps - Phase 2: Core Implementation

## 📋 Phase Overview
- **Phase**: 2
- **Name**: Core Implementation
- **Estimated Time**: 6 hours
- **Status**: Planning
- **Dependencies**: Phase 1 completion

## 🎯 Phase Goals
Implement the core alias detection logic, create the analysis step, and integrate with existing analysis orchestration.

## 📋 Tasks

### Task 2.1: Alias Detection Logic (3 hours)
- [ ] **Implement core detection service**
  - [ ] Complete `backend/domain/services/AliasDetectionService.js`
  - [ ] Add alias pattern detection methods
  - [ ] Add import statement analysis
  - [ ] Add configuration file parsing
  - [ ] Add project structure mapping

- [ ] **Add detection algorithms**
  - [ ] Implement `@domain`, `@application`, `@infrastructure` pattern detection
  - [ ] Add support for custom alias patterns
  - [ ] Implement import path analysis for require/import statements
  - [ ] Add package.json and jsconfig.json parsing
  - [ ] Add accuracy scoring algorithm

### Task 2.2: Analysis Step Creation (2 hours)
- [ ] **Create alias detection step**
  - [ ] Create `backend/domain/steps/categories/analysis/AliasDetectionStep.js`
  - [ ] Implement step execution logic
  - [ ] Add progress tracking
  - [ ] Add error handling
  - [ ] Add result formatting

- [ ] **Configure step integration**
  - [ ] Add step to step registry
  - [ ] Configure timeout and memory limits
  - [ ] Add step validation
  - [ ] Add step documentation

### Task 2.3: Orchestration Integration (1 hour)
- [ ] **Update analysis orchestrator**
  - [ ] Modify `backend/infrastructure/external/AnalysisOrchestrator.js`
  - [ ] Add alias detection to step mapping
  - [ ] Add alias detection configuration
  - [ ] Update execution context

- [ ] **Update individual analysis service**
  - [ ] Modify `backend/domain/services/IndividualAnalysisService.js`
  - [ ] Add alias detection configuration
  - [ ] Add alias detection progress steps
  - [ ] Add alias detection timeout settings

## 🔧 Technical Specifications

### Alias Detection Service
```javascript
class AliasDetectionService {
  constructor(dependencies = {}) {
    this.logger = dependencies.logger;
    this.aliasDetectionRepository = dependencies.aliasDetectionRepository;
  }

  async detectAliases(projectPath, options = {}) {
    // Core detection logic
  }

  async analyzeImportStatements(projectPath) {
    // Import analysis logic
  }

  async parseConfigurationFiles(projectPath) {
    // Config parsing logic
  }

  async mapProjectStructure(projectPath, aliasPatterns) {
    // Structure mapping logic
  }

  async calculateAccuracy(aliasPatterns, projectStructure) {
    // Accuracy calculation
  }

  async generateRecommendations(aliasPatterns, projectStructure) {
    // Recommendation generation
  }
}
```

### Analysis Step Structure
```javascript
class AliasDetectionStep {
  static getConfig() {
    return {
      name: 'AliasDetectionStep',
      type: 'analysis',
      description: 'Detects and analyzes module alias patterns in project',
      category: 'analysis',
      version: '1.0.0',
      dependencies: ['AliasDetectionService'],
      settings: {
        timeout: 60000,
        memoryLimit: 200 * 1024 * 1024, // 200MB
        includeConfigFiles: true,
        includeImportAnalysis: true
      },
      validation: {
        requiredFiles: ['package.json'],
        supportedProjects: ['nodejs', 'react', 'vue', 'angular', 'express', 'nest']
      }
    };
  }

  async execute(context = {}) {
    // Step execution logic
  }
}
```

### Progress Steps Configuration
```javascript
const progressSteps = [
  { progress: 10, description: 'Initializing alias detection analysis' },
  { progress: 25, description: 'Scanning configuration files' },
  { progress: 50, description: 'Analyzing import statements' },
  { progress: 75, description: 'Mapping project structure' },
  { progress: 100, description: 'Alias detection analysis completed' }
];
```

## 🧪 Testing Requirements
- [ ] **Unit tests for detection service**
  - [ ] Test alias pattern detection
  - [ ] Test import statement analysis
  - [ ] Test configuration file parsing
  - [ ] Test accuracy calculation
  - [ ] Test recommendation generation

- [ ] **Unit tests for analysis step**
  - [ ] Test step execution
  - [ ] Test progress tracking
  - [ ] Test error handling
  - [ ] Test result formatting

- [ ] **Integration tests**
  - [ ] Test service integration
  - [ ] Test step orchestration
  - [ ] Test database integration

## 📝 Documentation Requirements
- [ ] **JSDoc comments**
  - [ ] Document all service methods
  - [ ] Document step execution flow
  - [ ] Document configuration options

- [ ] **API documentation**
  - [ ] Document new analysis type
  - [ ] Document step configuration
  - [ ] Document result format

## 🔍 Alias Detection Algorithms

### Pattern Detection
```javascript
const ALIAS_PATTERNS = {
  domain: /@domain\//,
  application: /@application\//,
  infrastructure: /@infrastructure\//,
  presentation: /@presentation\//,
  entities: /@entities\//,
  services: /@services\//,
  repositories: /@repositories\//
};
```

### Import Analysis
```javascript
const IMPORT_PATTERNS = {
  require: /require\(['"]([^'"]+)['"]\)/g,
  import: /import\s+.*\s+from\s+['"]([^'"]+)['"]/g,
  dynamicImport: /import\(['"]([^'"]+)['"]\)/g
};
```

### Configuration Parsing
```javascript
const CONFIG_FILES = {
  packageJson: 'package.json',
  jsConfig: 'jsconfig.json',
  tsConfig: 'tsconfig.json',
  webpackConfig: 'webpack.config.js',
  babelConfig: '.babelrc'
};
```

## ✅ Success Criteria
- [ ] Alias detection service fully implemented
- [ ] Analysis step created and integrated
- [ ] Orchestration updated for alias detection
- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] Documentation complete

## 🔄 Next Phase
**Phase 3**: Integration - Connect with existing services and update API endpoints

## 📊 Progress Tracking
- **Current Progress**: 0%
- **Estimated Completion**: 6 hours
- **Blockers**: Phase 1 completion required
- **Notes**: Core implementation focuses on detection algorithms and step integration 