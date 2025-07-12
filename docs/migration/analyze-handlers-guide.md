# Analyze Handlers Migration Guide
## Overview
## Migration Summary
### What Changed
- **Legacy Handlers**: `backend/application/handlers/analyze/*` (6 handlers)
- **New System**: `backend/domain/workflows/steps/analysis/*` (6 steps + factory + registry)
- **Adapter**: `backend/domain/workflows/handlers/adapters/AnalysisStepAdapter`
- **Integration**: Updated HandlerFactory to prioritize AnalysisStepAdapter
### Benefits
1. **Unified Architecture**: All analysis types now use the same workflow step pattern
2. **Better Testability**: Each step can be tested independently
3. **Improved Maintainability**: Clear separation of concerns and modular design
4. **Enhanced Performance**: Caching and optimization built into the factory
5. **Future-Proof**: Easy to add new analysis types without changing core architecture
## Architecture Overview
### New Components
```
backend/domain/workflows/steps/analysis/
├── AnalysisStepFactory.js          # Factory for creating analysis steps
├── AnalysisStepRegistry.js         # Registry for managing analysis steps
├── index.js                        # Module exports
├── ArchitectureAnalysisStep.js     # Architecture analysis step
├── CodeQualityAnalysisStep.js      # Code quality analysis step
├── TechStackAnalysisStep.js        # Tech stack analysis step
├── RepoStructureAnalysisStep.js    # Repository structure analysis step
├── DependenciesAnalysisStep.js     # Dependencies analysis step
└── AdvancedAnalysisStep.js         # Advanced analysis step
```
### Adapter System
```
backend/domain/workflows/handlers/adapters/
├── AnalysisStepAdapter.js          # Routes analyze requests to steps
├── HandlerAdapter.js         # Handles non-analyze  handlers
├── CommandHandlerAdapter.js        # Handles command-based handlers
└── ServiceHandlerAdapter.js        # Handles service-based handlers
```
## Migration Mapping
### Handler to Step Mapping
|  Handler | New Step | Type |
|----------------|----------|------|
| `AnalyzeArchitectureHandler` | `ArchitectureAnalysisStep` | `architecture` |
| `AnalyzeCodeQualityHandler` | `CodeQualityAnalysisStep` | `code-quality` |
| `AnalyzeTechStackHandler` | `TechStackAnalysisStep` | `tech-stack` |
| `AnalyzeRepoStructureHandler` | `RepoStructureAnalysisStep` | `repo-structure` |
| `AnalyzeDependenciesHandler` | `DependenciesAnalysisStep` | `dependencies` |
| `AdvancedAnalysisHandler` | `AdvancedAnalysisStep` | `advanced` |
### Request Type Mapping
|  Request Type | New Request Type | Step Type |
|---------------------|------------------|-----------|
| `analyze_architecture` | `analyze_architecture` | `architecture` |
| `analyze_code_quality` | `analyze_code_quality` | `code-quality` |
| `analyze_tech_stack` | `analyze_tech_stack` | `tech-stack` |
| `analyze_repo_structure` | `analyze_repo_structure` | `repo-structure` |
| `analyze_dependencies` | `analyze_dependencies` | `dependencies` |
| `analyze_advanced` | `analyze_advanced` | `advanced` |
## Implementation Details
### AnalysisStepFactory
The factory provides methods to create different types of analysis steps:
```javascript
const factory = new AnalysisStepFactory();
// Create specific steps
const architectureStep = factory.createArchitectureAnalysisStep(options);
const codeQualityStep = factory.createCodeQualityAnalysisStep(options);
// Create by type
const step = factory.createAnalysisStep('architecture', options);
// Create comprehensive workflow
const steps = factory.createComprehensiveAnalysisWorkflow(options);
```
### AnalysisStepAdapter
The adapter routes analyze requests to the appropriate analysis steps:
```javascript
const adapter = new AnalysisStepAdapter();
// Check if adapter can handle request
if (adapter.canHandle(request)) {
  const handler = await adapter.createHandler(request, context);
  const result = await handler.execute(context);
}
```
### Step Execution
Each analysis step follows the same execution pattern:
```javascript
class ArchitectureAnalysisStep extends BaseWorkflowStep {
  async executeStep(context) {
    // 1. Validate context
    // 2. Get project information
    // 3. Perform analysis
    // 4. Generate metrics
    // 5. Generate recommendations
    // 6. Return result
  }
}
```
## Migration Steps
### Step 1: Update Dependencies
Ensure your application has access to the new analysis step components:
```javascript
const { AnalysisStepFactory } = require('@/domain/workflows/steps/analysis');
const AnalysisStepAdapter = require('@/domain/workflows/handlers/adapters/AnalysisStepAdapter');
```
### Step 2: Update HandlerFactory Configuration
The HandlerFactory now prioritizes AnalysisStepAdapter for analyze requests:
```javascript
// This is already configured in HandlerFactory.js
const adapters = [
  new AnalysisStepAdapter(), // Prioritize analysis step adapter
  new CommandHandlerAdapter(),
  new ServiceHandlerAdapter(),
  new LegacyHandlerAdapter() 
];
```
### Step 3: Update Request Handling
Requests are now automatically routed to the appropriate analysis steps:
```javascript
const handler = new AnalyzeArchitectureHandler(dependencies);
const result = await handler.handle(command);
// New way (analysis step)
const request = {
  type: 'analyze_architecture',
  projectPath: '/path/to/project',
  options: { detectPatterns: true }
};
const handler = await handlerFactory.createHandler(request, context);
const result = await handler.execute(context);
```
### Step 4: Update Context Providers
Ensure your context provides the necessary services for analysis steps:
```javascript
const context = {
  projectPath: '/path/to/project',
  architectureAnalyzer: architectureAnalyzer,
  codeQualityAnalyzer: codeQualityAnalyzer,
  techStackAnalyzer: techStackAnalyzer,
  projectAnalyzer: projectAnalyzer,
  dependencyAnalyzer: dependencyAnalyzer,
  advancedAnalysisService: advancedAnalysisService,
  fileSystemService: fileSystemService,
  logger: logger
};
```
## Testing
### Unit Tests
Each analysis step has comprehensive unit tests:
```bash
# Run unit tests for analysis steps
npm test tests/unit/steps/analysis/
# Run specific step tests
npm test tests/unit/steps/analysis/ArchitectureAnalysisStep.test.js
```
### Integration Tests
Integration tests verify the complete flow:
```bash
# Run integration tests
npm test tests/integration/steps/analysis/AnalysisStepsIntegration.test.js
```
### Test Coverage
The new system provides better test coverage:
- **Unit Tests**: Each step can be tested independently
- **Integration Tests**: Verify adapter and factory integration
- **Mock Support**: Easy to mock dependencies for testing
## Configuration
### Step Options
Each analysis step supports configurable options:
```javascript
// Architecture analysis options
const architectureOptions = {
  detectPatterns: true,
  analyzeDependencies: true,
  complexityAnalysis: true,
  detectLayers: true,
  detectModules: true,
  analyzeCoupling: true,
  analyzeCohesion: true,
  detectAntiPatterns: true,
  analyzeDesignPrinciples: true
};
// Code quality analysis options
const codeQualityOptions = {
  linting: true,
  complexity: true,
  maintainability: true,
  testCoverage: true,
  codeDuplication: true,
  codeStyle: true,
  documentation: true,
  performance: true
};
```
### Factory Configuration
The factory supports configuration options:
```javascript
const factory = new AnalysisStepFactory({
  enableValidation: true,
  enableCaching: true,
  cacheSize: 50
});
```
### Adapter Configuration
The adapter supports configuration options:
```javascript
const adapter = new AnalysisStepAdapter({
  enableCaching: true,
  cacheSize: 50,
  enableValidation: true
});
```
## Performance Considerations
### Caching
Both the factory and adapter support caching:
- **Factory Caching**: Caches step instances based on options
- **Adapter Caching**: Caches handler instances based on request
- **LRU Eviction**: Automatic cache eviction when size limit is reached
### Optimization
- **Lazy Loading**: Steps are created only when needed
- **Resource Management**: Proper cleanup and resource management
- **Memory Efficiency**: Efficient memory usage with caching
## Error Handling
### Validation
Each step validates its context before execution:
```javascript
async validate(context) {
  const baseValidation = await super.validate(context);
  if (!baseValidation.isValid) {
    return baseValidation;
  }
  // Check required services
  const projectPath = context.get('projectPath');
  const analyzer = context.get('architectureAnalyzer');
  if (!projectPath) {
    return new ValidationResult(false, ['Project path is required']);
  }
  if (!analyzer) {
    return new ValidationResult(false, ['Architecture analyzer is required']);
  }
  return new ValidationResult(true, []);
}
```
### Error Recovery
- **Graceful Degradation**: Steps handle missing dependencies gracefully
- **Detailed Error Messages**: Clear error messages for debugging
- **Rollback Support**: Steps can be rolled back if needed
## Monitoring and Logging
### Logging
Each step provides comprehensive logging:
```javascript
logger.info('ArchitectureAnalysisStep: Starting architecture analysis', {
  projectPath,
  options: this.options
});
logger.info('ArchitectureAnalysisStep: Architecture analysis completed', {
  projectPath,
  duration,
  patternsDetected: analysis.patterns?.length || 0
});
```
### Metrics
Steps generate metrics for monitoring:
```javascript
const metrics = {
  patternsCount: analysis.patterns?.length || 0,
  layersCount: analysis.layers?.length || 0,
  modulesCount: analysis.modules?.length || 0,
  antiPatternsCount: analysis.antiPatterns?.length || 0,
  designPrinciplesCount: analysis.designPrinciples?.length || 0
};
```
## Backward Compatibility
###  Handler Support
 handlers are still supported for non-analyze requests:
```javascript
  type: 'vibecoder_analyze',
  handlerClass: VibeCoderAnalyzeHandler
};
```
### Migration Period
During the migration period:
1. **AnalysisStepAdapter** handles all analyze requests (prioritized)
2. **HandlerAdapter** handles non-analyze  requests
3. **Gradual Migration**: Can migrate handlers one by one
4. **Rollback Support**: Can rollback to  handlers if needed
## Future Enhancements
### Planned Features
1. **Custom Analysis Steps**: Support for custom analysis step types
2. **Step Composition**: Combine multiple steps into workflows
3. **Parallel Execution**: Execute multiple analysis steps in parallel
4. **Result Aggregation**: Aggregate results from multiple steps
5. **Advanced Caching**: More sophisticated caching strategies
### Extension Points
The system is designed for easy extension:
```javascript
// Custom analysis step
class CustomAnalysisStep extends BaseWorkflowStep {
  async executeStep(context) {
    // Custom analysis logic
  }
}
// Register custom step
const factory = new AnalysisStepFactory();
factory.registerStep('custom', CustomAnalysisStep);
```
## Troubleshooting
### Common Issues
1. **Missing Dependencies**: Ensure all required services are provided in context
2. **Invalid Options**: Check step options for valid values
3. **Cache Issues**: Clear cache if experiencing stale data
4. **Performance Issues**: Monitor cache size and adjust configuration
### Debug Mode
Enable debug mode for detailed logging:
```javascript
const factory = new AnalysisStepFactory({
  enableValidation: true,
  enableCaching: true,
  debug: true
});
```
### Support
For issues and questions:
1. Check the test files for usage examples
2. Review the integration tests for complete workflows
3. Check the logs for detailed error information
4. Verify context and dependencies are properly configured
## Conclusion
The migration to the new analysis step system provides:
- **Better Architecture**: Unified workflow step pattern
- **Improved Maintainability**: Modular and testable design
- **Enhanced Performance**: Built-in caching and optimization
- **Future-Proof Design**: Easy to extend and modify
- **Backward Compatibility**: Gradual migration support