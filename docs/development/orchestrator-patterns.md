# Analysis Orchestrator Patterns

**Created**: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]  
**Version**: 1.0.0  
**Purpose**: Documentation of orchestrator patterns and implementation guidelines

## Overview

Analysis Orchestrators follow a standardized pattern that ensures consistency, maintainability, and extensibility. This document outlines the patterns used by all orchestrators and provides guidelines for implementing new ones.

## Core Pattern Structure

### 1. Orchestrator Class Structure
```javascript
class AnalysisOrchestrator extends StepBuilder {
  constructor() {
    super(config);
    this.steps = null;
  }

  async loadSteps() { /* Load specialized steps */ }
  async execute(context) { /* Execute all steps */ }
  calculateScore(results) { /* Calculate category score */ }
}
```

### 2. Configuration Pattern
```javascript
const config = {
  name: 'CategoryAnalysisOrchestrator',
  type: 'analysis',
  description: 'Orchestrates comprehensive category analysis',
  category: 'analysis',
  subcategory: 'category-name',
  version: '1.0.0',
  dependencies: [],
  settings: {
    timeout: 90000,
    includeFeature1: true,
    includeFeature2: true,
    // ... category-specific settings
  },
  validation: {
    requiredFiles: ['package.json'],
    supportedProjects: ['nodejs', 'react', 'vue']
  }
};
```

### 3. Step Loading Pattern
```javascript
async loadSteps() {
  try {
    this.steps = {
      Step1: require('./category/Step1'),
      Step2: require('./category/Step2'),
      Step3: require('./category/Step3'),
      Step4: require('./category/Step4')
    };
    
    logger.info('✅ Steps loaded successfully', {
      stepCount: Object.keys(this.steps).length,
      steps: Object.keys(this.steps)
    });
    return true;
  } catch (error) {
    logger.error('❌ Failed to load steps:', error.message);
    throw error;
  }
}
```

### 4. Execution Pattern
```javascript
async execute(context) {
  try {
    logger.info('🔍 Starting comprehensive analysis...');
    
    // Validate context
    if (!context.projectPath) {
      throw new Error('Project path is required');
    }
    
    // Load steps
    await this.loadSteps();
    
    // Initialize results structure
    const results = {
      summary: {
        totalSteps: 0,
        completedSteps: 0,
        failedSteps: 0,
        // ... category-specific summary fields
      },
      details: {},
      recommendations: [],
      issues: [],
      tasks: [],
      documentation: []
    };

    // Execute steps sequentially
    const stepNames = Object.keys(this.steps);
    for (let i = 0; i < stepNames.length; i++) {
      const stepName = stepNames[i];
      const StepClass = this.steps[stepName];
      
      try {
        const stepInstance = new StepClass();
        const stepResult = await stepInstance.execute(context);
        
        // Aggregate results
        this.aggregateResults(results, stepResult, stepName);
        results.summary.completedSteps++;
        
      } catch (error) {
        logger.error(`❌ Step ${stepName} failed:`, error.message);
        results.summary.failedSteps++;
        results.issues.push({
          step: stepName,
          error: error.message,
          severity: 'high'
        });
      }
      
      results.summary.totalSteps++;
    }

    // Calculate score
    const score = this.calculateScore(results);
    
    // Return standardized result
    return {
      success: results.summary.failedSteps === 0,
      summary: results.summary,
      details: results.details,
      recommendations: results.recommendations,
      issues: results.issues,
      tasks: results.tasks,
      documentation: results.documentation,
      score,
      executionTime: Date.now() - startTime,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    logger.error('❌ Analysis failed:', error.message);
    return {
      success: false,
      error: error.message,
      summary: { failedSteps: 1, totalSteps: 1 },
      details: {},
      recommendations: [],
      issues: [{ error: error.message, severity: 'critical' }],
      tasks: [],
      documentation: [],
      score: 0,
      executionTime: Date.now() - startTime,
      timestamp: new Date().toISOString()
    };
  }
}
```

### 5. Score Calculation Pattern
```javascript
calculateScore(results) {
  let score = 100;
  
  // Deduct points for issues
  if (results.summary.criticalIssues) {
    score -= results.summary.criticalIssues * 10;
  }
  if (results.summary.highIssues) {
    score -= results.summary.highIssues * 5;
  }
  if (results.summary.mediumIssues) {
    score -= results.summary.mediumIssues * 2;
  }
  if (results.summary.lowIssues) {
    score -= results.summary.lowIssues * 1;
  }
  
  // Add points for best practices
  if (results.summary.bestPractices) {
    score += results.summary.bestPractices * 2;
  }
  
  // Ensure score is within bounds
  return Math.max(0, Math.min(100, score));
}
```

## Standardized Result Format

All orchestrators must return results in this standardized format:

```javascript
{
  success: boolean,           // Overall success status
  summary: {                  // High-level summary
    totalSteps: number,
    completedSteps: number,
    failedSteps: number,
    // ... category-specific fields
  },
  details: object,            // Detailed analysis data
  recommendations: array,     // Improvement suggestions
  issues: array,             // Problems and vulnerabilities
  tasks: array,              // Actionable tasks
  documentation: array,      // Documentation notes
  score: number,             // 0-100 score
  executionTime: number,     // Execution time in ms
  timestamp: string          // ISO timestamp
}
```

## Step Implementation Pattern

Individual steps should follow this pattern:

```javascript
class CategoryStep extends StepBuilder {
  constructor() {
    super({
      name: 'CategoryStep',
      type: 'analysis',
      category: 'category-name',
      version: '1.0.0'
    });
  }

  async execute(context) {
    try {
      // Perform analysis
      const analysisResult = await this.performAnalysis(context);
      
      // Return standardized format
      return {
        success: true,
        summary: analysisResult.summary,
        details: analysisResult.details,
        recommendations: analysisResult.recommendations || [],
        issues: analysisResult.issues || [],
        tasks: analysisResult.tasks || [],
        documentation: analysisResult.documentation || []
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        summary: {},
        details: {},
        recommendations: [],
        issues: [{ error: error.message, severity: 'high' }],
        tasks: [],
        documentation: []
      };
    }
  }
}
```

## Directory Structure

Orchestrators should be organized in this structure:

```
backend/domain/steps/categories/analysis/
├── CategoryAnalysisOrchestrator.js
├── category/
│   ├── Step1.js
│   ├── Step2.js
│   ├── Step3.js
│   └── Step4.js
└── tests/
    ├── CategoryAnalysisOrchestrator.test.js
    └── category/
        ├── Step1.test.js
        ├── Step2.test.js
        ├── Step3.test.js
        └── Step4.test.js
```

## Integration Requirements

### 1. StepRegistry Integration
Orchestrators are automatically loaded by the StepRegistry from the categories directory. No manual registration required.

### 2. WorkflowController Integration
Add the orchestrator to the WorkflowController mode mapping:

```javascript
} else if (mode === 'category-analysis') {
  if (this.analysisApplicationService) {
    const result = await this.analysisApplicationService.executeCategoryAnalysis(projectId, stepOptions);
    return res.json({
      success: true,
      data: result,
      message: 'Category analysis completed successfully'
    });
  } else {
    stepName = 'CategoryAnalysisOrchestrator';
    stepOptions.analysisType = 'category';
    // ... category-specific options
  }
}
```

### 3. AnalysisApplicationService Integration
Add the execution method:

```javascript
async executeCategoryAnalysis(projectId, options = {}) {
  try {
    this.logger.info(`🔍 Executing category analysis for project: ${projectId}`);
    
    const projectPath = await this.getProjectPath(projectId);
    if (!projectPath) {
      throw new Error(`Project path not found for project: ${projectId}`);
    }

    const context = {
      projectId,
      projectPath,
      analysisType: 'category',
      options: {
        // ... category-specific options
        ...options
      }
    };

    const result = await this.executeAnalysisStep('CategoryAnalysisOrchestrator', context);
    
    await this.saveAnalysisResult(projectId, 'category', result, {
      executionTime: Date.now(),
      options: context.options
    });

    return result;
  } catch (error) {
    this.logger.error(`❌ Failed to execute category analysis for project ${projectId}:`, error);
    throw error;
  }
}
```

### 4. Route Integration
Add category routes to `backend/presentation/api/routes/analysis.js`:

```javascript
// Category routes
app.get('/api/projects/:projectId/analysis/category/recommendations', (req, res) => 
  this.analysisController.getCategoryRecommendations(req, res, 'category'));
app.get('/api/projects/:projectId/analysis/category/issues', (req, res) => 
  this.analysisController.getCategoryIssues(req, res, 'category'));
app.get('/api/projects/:projectId/analysis/category/metrics', (req, res) => 
  this.analysisController.getCategoryMetrics(req, res, 'category'));
app.get('/api/projects/:projectId/analysis/category/summary', (req, res) => 
  this.analysisController.getCategorySummary(req, res, 'category'));
app.get('/api/projects/:projectId/analysis/category/results', (req, res) => 
  this.analysisController.getCategoryResults(req, res, 'category'));
```

## Testing Requirements

### 1. Unit Tests
Create comprehensive unit tests for the orchestrator:

```javascript
describe('CategoryAnalysisOrchestrator', () => {
  describe('Configuration', () => {
    it('should have correct configuration', () => {
      expect(orchestrator.config.name).toBe('CategoryAnalysisOrchestrator');
      expect(orchestrator.config.type).toBe('analysis');
      expect(orchestrator.config.category).toBe('analysis');
      expect(orchestrator.config.subcategory).toBe('category');
    });
  });

  describe('Step Loading', () => {
    it('should load category steps', async () => {
      await orchestrator.loadSteps();
      expect(orchestrator.steps).toBeDefined();
      expect(Object.keys(orchestrator.steps)).toHaveLength(4);
    });
  });

  describe('Execution', () => {
    it('should execute all category steps', async () => {
      const result = await orchestrator.execute(context);
      expect(result.success).toBe(true);
      expect(result.summary).toBeDefined();
      expect(result.score).toBeDefined();
    });
  });

  describe('Score Calculation', () => {
    it('should calculate score correctly', () => {
      const score = orchestrator.calculateScore(results);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });
});
```

### 2. Integration Tests
Add integration tests to verify API endpoints work correctly.

## Performance Guidelines

1. **Timeout**: Each orchestrator should complete within 90 seconds
2. **Memory**: Keep memory usage under 512MB
3. **Steps**: Limit to 4-6 steps per orchestrator
4. **Caching**: Implement result caching for 1 hour
5. **Error Handling**: Graceful degradation on step failures

## Security Considerations

1. **Input Validation**: Validate all inputs and context data
2. **Path Traversal**: Prevent path traversal attacks
3. **Resource Limits**: Implement resource usage limits
4. **Error Disclosure**: Don't expose sensitive information in errors
5. **Authentication**: Ensure proper authentication checks

## Best Practices

1. **Follow the Pattern**: Stick to the established orchestrator pattern
2. **Consistent Naming**: Use consistent naming conventions
3. **Error Handling**: Implement comprehensive error handling
4. **Logging**: Use structured logging with appropriate levels
5. **Documentation**: Document all public methods and configurations
6. **Testing**: Maintain high test coverage (>90%)
7. **Performance**: Monitor and optimize performance
8. **Security**: Follow security best practices

## Example Implementation

See the existing orchestrators for complete examples:
- `CodeQualityAnalysisOrchestrator.js`
- `DependencyAnalysisOrchestrator.js`
- `ManifestAnalysisOrchestrator.js`
- `TechStackAnalysisOrchestrator.js`

## Migration Guide

When migrating from old single steps to new orchestrators:

1. **Identify Steps**: Group related steps into logical categories
2. **Create Orchestrator**: Implement new orchestrator following the pattern
3. **Update Routes**: Add category-based routes
4. **Update Controllers**: Add execution methods
5. **Add Tests**: Create comprehensive test suite
6. **Update Documentation**: Document new endpoints and patterns
7. **Deprecate Old**: Mark old endpoints as deprecated
8. **Monitor**: Monitor performance and usage

---

**Last Updated**: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"] 