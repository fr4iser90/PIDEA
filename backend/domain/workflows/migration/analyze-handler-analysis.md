# Analyze Handler Migration Analysis

## Overview
This document provides detailed analysis of the 6 analyze handlers that need to be migrated to the unified workflow system. The analysis includes public interfaces, dependencies, and migration mapping.

## Handler Analysis Summary

### 1. AnalyzeArchitectureHandler.js (676 lines)
**Location**: `backend/application/handlers/analyze/AnalyzeArchitectureHandler.js`

**Public Interface**:
- `handle(command)` - Main entry point for architecture analysis
- `getMetadata()` - Returns handler metadata

**Dependencies**:
- `architectureAnalyzer` - Core analysis service
- `cursorIDEService` - IDE integration service
- `taskRepository` - Task management
- `eventBus` - Event publishing
- `logger` - Logging service
- `fileSystemService` - File system operations

**Key Methods**:
- `performArchitectureAnalysis()` - Core analysis logic
- `generateMetrics()` - Metrics generation
- `generateRecommendations()` - Recommendations generation
- `validateCommand()` - Command validation

**Migration Mapping**:
- Target: `ArchitectureAnalysisStep` (already exists)
- Preserve: All analysis logic and options
- Improve: Error handling and validation

### 2. AnalyzeCodeQualityHandler.js (755 lines)
**Location**: `backend/application/handlers/analyze/AnalyzeCodeQualityHandler.js`

**Public Interface**:
- `handle(command)` - Main entry point for code quality analysis
- `getMetadata()` - Returns handler metadata

**Dependencies**:
- `codeQualityAnalyzer` - Core analysis service
- `cursorIDEService` - IDE integration service
- `taskRepository` - Task management
- `eventBus` - Event publishing
- `logger` - Logging service
- `fileSystemService` - File system operations

**Key Methods**:
- `performCodeQualityAnalysis()` - Core analysis logic
- `generateMetrics()` - Metrics generation
- `generateRecommendations()` - Recommendations generation
- `validateCommand()` - Command validation

**Migration Mapping**:
- Target: `CodeQualityAnalysisStep` (already exists)
- Preserve: All analysis logic and options
- Improve: Error handling and validation

### 3. AnalyzeTechStackHandler.js (460 lines)
**Location**: `backend/application/handlers/analyze/AnalyzeTechStackHandler.js`

**Public Interface**:
- `handle(command)` - Main entry point for tech stack analysis
- `getMetadata()` - Returns handler metadata

**Dependencies**:
- `projectAnalyzer` - Core analysis service
- `cursorIDEService` - IDE integration service
- `taskRepository` - Task management
- `eventBus` - Event publishing
- `logger` - Logging service
- `fileSystemService` - File system operations

**Key Methods**:
- `performTechStackAnalysis()` - Core analysis logic
- `generateMetrics()` - Metrics generation
- `generateRecommendations()` - Recommendations generation
- `validateCommand()` - Command validation

**Migration Mapping**:
- Target: `TechStackAnalysisStep` (already exists)
- Preserve: All analysis logic and options
- Improve: Error handling and validation

### 4. AnalyzeRepoStructureHandler.js (631 lines)
**Location**: `backend/application/handlers/analyze/AnalyzeRepoStructureHandler.js`

**Public Interface**:
- `handle(command)` - Main entry point for repository structure analysis
- `getMetadata()` - Returns handler metadata

**Dependencies**:
- `projectAnalyzer` - Core analysis service
- `cursorIDEService` - IDE integration service
- `taskRepository` - Task management
- `eventBus` - Event publishing
- `logger` - Logging service
- `fileSystemService` - File system operations

**Key Methods**:
- `performRepoStructureAnalysis()` - Core analysis logic
- `generateMetrics()` - Metrics generation
- `generateRecommendations()` - Recommendations generation
- `validateCommand()` - Command validation

**Migration Mapping**:
- Target: `RepoStructureAnalysisStep` (already exists)
- Preserve: All analysis logic and options
- Improve: Error handling and validation

### 5. AnalyzeDependenciesHandler.js (506 lines)
**Location**: `backend/application/handlers/analyze/AnalyzeDependenciesHandler.js`

**Public Interface**:
- `handle(command)` - Main entry point for dependencies analysis
- `getMetadata()` - Returns handler metadata

**Dependencies**:
- `dependencyAnalyzer` - Core analysis service
- `cursorIDEService` - IDE integration service
- `taskRepository` - Task management
- `eventBus` - Event publishing
- `logger` - Logging service
- `fileSystemService` - File system operations

**Key Methods**:
- `performDependenciesAnalysis()` - Core analysis logic
- `generateMetrics()` - Metrics generation
- `generateRecommendations()` - Recommendations generation
- `validateCommand()` - Command validation

**Migration Mapping**:
- Target: `DependenciesAnalysisStep` (already exists)
- Preserve: All analysis logic and options
- Improve: Error handling and validation

### 6. AdvancedAnalysisHandler.js (393 lines)
**Location**: `backend/application/handlers/analyze/AdvancedAnalysisHandler.js`

**Public Interface**:
- `handle(command)` - Main entry point for advanced analysis
- `getMetadata()` - Returns handler metadata

**Dependencies**:
- `advancedAnalysisService` - Core analysis service
- `taskRepository` - Task management
- `executionRepository` - Execution tracking
- `eventBus` - Event publishing
- `logger` - Logging service

**Key Methods**:
- `performAdvancedAnalysis()` - Core analysis logic
- `generateReport()` - Report generation
- `validateCommand()` - Command validation

**Migration Mapping**:
- Target: `AdvancedAnalysisStep` (already exists)
- Preserve: All analysis logic and options
- Improve: Error handling and validation

## Migration Strategy

### 1. Leverage Existing Infrastructure
- Use `HandlerMigrationUtility` for migration orchestration
- Use existing `AnalysisStep` base class and specialized steps
- Use existing analysis services and dependencies
- Preserve all functionality while improving architecture

### 2. Preserve Functionality
- Maintain all public interfaces
- Preserve analysis logic and algorithms
- Keep configuration options
- Maintain error handling behavior

### 3. Improve Architecture
- Follow unified workflow patterns
- Implement proper step validation
- Add comprehensive logging
- Improve error reporting

### 4. Testing Strategy
- Test each migrated step individually
- Verify analysis results match original handlers
- Test error handling and edge cases
- Validate performance characteristics

## Dependencies Analysis

### Common Dependencies
All analyze handlers share these common dependencies:
- `cursorIDEService` - IDE integration
- `taskRepository` - Task management
- `eventBus` - Event publishing
- `logger` - Logging service
- `fileSystemService` - File system operations

### Specific Dependencies
Each handler has specific analysis services:
- `architectureAnalyzer` - Architecture analysis
- `codeQualityAnalyzer` - Code quality analysis
- `projectAnalyzer` - Project and tech stack analysis
- `dependencyAnalyzer` - Dependencies analysis
- `advancedAnalysisService` - Advanced analysis

## Configuration Requirements

### Analysis Options
Each handler supports specific analysis options:
- Architecture: patterns, dependencies, complexity, layers, modules, coupling, cohesion
- Code Quality: linting, complexity, maintainability, test coverage, duplication, style
- Tech Stack: frameworks, libraries, tools, languages, databases, cloud services
- Repo Structure: hidden files, max depth, file types, exclude patterns, stats
- Dependencies: versions, vulnerabilities, updates, licenses, transitive deps
- Advanced: layer validation, logic analysis, architectural assessment

### Output Configuration
All handlers support:
- Metrics generation
- Recommendations generation
- Report generation
- Event publishing
- Task status updates

## Migration Validation

### Success Criteria
- [ ] All 6 analyze handlers migrated to unified steps
- [ ] Analysis results match original handlers
- [ ] Performance characteristics maintained or improved
- [ ] Error handling works correctly
- [ ] All tests passing
- [ ] Documentation updated

### Validation Methods
- Unit tests for each migrated step
- Integration tests with existing services
- End-to-end tests with real projects
- Performance benchmarks
- Error scenario testing

## Risk Assessment

### Medium Risk Factors
- Complex handlers with many dependencies
- Monorepo analysis logic
- Event publishing and task management
- Performance requirements
- Backward compatibility

### Mitigation Strategies
- Comprehensive testing of each migrated step
- Use existing rollback mechanisms
- Validate results match original handlers
- Performance monitoring and optimization
- Gradual rollout with feature flags 