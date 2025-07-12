# Unified Workflow Foundation 1B: Builder Pattern & Common Steps

## 1. Project Overview
- **Feature/Component Name**: Builder Pattern & Common Workflow Steps
- **Priority**: High
- **Estimated Time**: 80 hours (2 weeks)
- **Dependencies**: Foundation 1A (Core Interfaces & Context)
- **Related Issues**: Workflow composition, step reusability, complex workflow creation

## 2. Technical Requirements
- **Tech Stack**: Node.js, JavaScript ES6+, Domain-Driven Design, Builder Pattern
- **Architecture Pattern**: DDD with Builder pattern for workflow composition
- **Database Changes**: None (foundation layer)
- **API Changes**: None (foundation layer)
- **Frontend Changes**: None (backend system)
- **Backend Changes**: Builder pattern and common workflow steps

## 3. Implementation Files

#### Files to Create:
- [ ] `backend/domain/workflows/builder/WorkflowBuilder.js` - Main workflow builder
- [ ] `backend/domain/workflows/builder/ComposedWorkflow.js` - Composed workflow implementation
- [ ] `backend/domain/workflows/builder/WorkflowStepBuilder.js` - Step builder
- [ ] `backend/domain/workflows/builder/WorkflowComposer.js` - Workflow composition logic
- [ ] `backend/domain/workflows/steps/AnalysisStep.js` - Analysis workflow step
- [ ] `backend/domain/workflows/steps/RefactoringStep.js` - Refactoring workflow step
- [ ] `backend/domain/workflows/steps/TestingStep.js` - Testing workflow step
- [ ] `backend/domain/workflows/steps/DocumentationStep.js` - Documentation workflow step
- [ ] `backend/domain/workflows/steps/ValidationStep.js` - Validation workflow step
- [ ] `backend/domain/workflows/steps/DeploymentStep.js` - Deployment workflow step
- [ ] `backend/domain/workflows/steps/SecurityStep.js` - Security workflow step
- [ ] `backend/domain/workflows/steps/OptimizationStep.js` - Optimization workflow step
- [ ] `backend/domain/workflows/steps/BaseWorkflowStep.js` - Base step implementation
- [ ] `backend/domain/workflows/steps/StepRegistry.js` - Step registry and management
- [ ] `backend/domain/workflows/steps/index.js` - Step module exports

#### Files to Modify:
- [ ] `backend/domain/workflows/index.js` - Add builder and steps exports
- [ ] `backend/domain/services/WorkflowOrchestrationService.js` - Integrate with builder pattern
- [ ] `backend/domain/services/TaskService.js` - Use composed workflows

## 4. Implementation Phases

#### Phase 1: Builder Pattern (30 hours)
- [ ] Implement WorkflowBuilder with fluent interface
- [ ] Create ComposedWorkflow for workflow composition
- [ ] Implement WorkflowStepBuilder for step creation
- [ ] Create WorkflowComposer for complex workflow logic
- [ ] Add comprehensive JSDoc documentation

#### Phase 2: Common Workflow Steps (35 hours)
- [ ] Create BaseWorkflowStep with common functionality
- [ ] Implement AnalysisStep with analysis capabilities
- [ ] Create RefactoringStep with refactoring logic
- [ ] Implement TestingStep with testing functionality
- [ ] Create DocumentationStep with documentation generation
- [ ] Implement ValidationStep with validation logic
- [ ] Create DeploymentStep with deployment capabilities
- [ ] Implement SecurityStep with security checks
- [ ] Create OptimizationStep with optimization logic

#### Phase 3: Integration (15 hours)
- [ ] Create StepRegistry for step management
- [ ] Integrate builder pattern with existing services
- [ ] Update WorkflowOrchestrationService to use builder
- [ ] Update TaskService to use composed workflows
- [ ] Add module exports and documentation

## 5. Builder Pattern Design

#### WorkflowBuilder Implementation
```javascript
/**
 * Workflow builder with fluent interface
 */
class WorkflowBuilder {
  constructor() {
    this._steps = [];
    this._metadata = {};
    this._validationRules = [];
    this._rollbackStrategy = null;
  }

  /**
   * Add step to workflow
   * @param {IWorkflowStep} step - Workflow step
   * @returns {WorkflowBuilder} Builder instance
   */
  addStep(step) {
    this._steps.push(step);
    return this;
  }

  /**
   * Add multiple steps to workflow
   * @param {Array<IWorkflowStep>} steps - Workflow steps
   * @returns {WorkflowBuilder} Builder instance
   */
  addSteps(steps) {
    this._steps.push(...steps);
    return this;
  }

  /**
   * Set workflow metadata
   * @param {Object} metadata - Workflow metadata
   * @returns {WorkflowBuilder} Builder instance
   */
  setMetadata(metadata) {
    this._metadata = { ...this._metadata, ...metadata };
    return this;
  }

  /**
   * Add validation rule
   * @param {ValidationRule} rule - Validation rule
   * @returns {WorkflowBuilder} Builder instance
   */
  addValidationRule(rule) {
    this._validationRules.push(rule);
    return this;
  }

  /**
   * Set rollback strategy
   * @param {RollbackStrategy} strategy - Rollback strategy
   * @returns {WorkflowBuilder} Builder instance
   */
  setRollbackStrategy(strategy) {
    this._rollbackStrategy = strategy;
    return this;
  }

  /**
   * Build composed workflow
   * @returns {ComposedWorkflow} Composed workflow instance
   */
  build() {
    return new ComposedWorkflow(
      this._steps,
      this._metadata,
      this._validationRules,
      this._rollbackStrategy
    );
  }

  /**
   * Create workflow from template
   * @param {string} templateName - Template name
   * @param {Object} options - Template options
   * @returns {WorkflowBuilder} Builder instance
   */
  static fromTemplate(templateName, options = {}) {
    const builder = new WorkflowBuilder();
    const template = WorkflowTemplateRegistry.getTemplate(templateName);
    
    if (!template) {
      throw new Error(`Workflow template not found: ${templateName}`);
    }
    
    return template.apply(builder, options);
  }
}
```

#### ComposedWorkflow Implementation
```javascript
/**
 * Composed workflow implementation
 */
class ComposedWorkflow {
  constructor(steps = [], metadata = {}, validationRules = [], rollbackStrategy = null) {
    this._steps = [...steps];
    this._metadata = { ...metadata };
    this._validationRules = [...validationRules];
    this._rollbackStrategy = rollbackStrategy;
    this._executionHistory = [];
  }

  /**
   * Execute the composed workflow
   * @param {WorkflowContext} context - Workflow context
   * @returns {Promise<WorkflowResult>} Execution result
   */
  async execute(context) {
    const startTime = Date.now();
    
    try {
      // Validate workflow before execution
      const validationResult = await this.validate(context);
      if (!validationResult.isValid) {
        throw new ValidationException('Workflow validation failed', validationResult);
      }

      // Execute steps sequentially
      const results = [];
      for (let i = 0; i < this._steps.length; i++) {
        const step = this._steps[i];
        
        try {
          // Update context with current step
          context.setState(new WorkflowState('executing', { currentStep: i, totalSteps: this._steps.length }));
          
          // Execute step
          const stepResult = await step.execute(context);
          results.push(stepResult);
          
          // Record execution
          this._executionHistory.push({
            stepIndex: i,
            stepName: step.getMetadata().name,
            result: stepResult,
            timestamp: new Date()
          });
          
          // Check if step failed
          if (!stepResult.success) {
            throw new WorkflowException(`Step ${step.getMetadata().name} failed`, stepResult);
          }
          
        } catch (error) {
          // Attempt rollback if strategy is available
          if (this._rollbackStrategy) {
            await this._rollbackStrategy.rollback(context, i, results);
          }
          throw error;
        }
      }

      const duration = Date.now() - startTime;
      
      return {
        success: true,
        results,
        duration,
        executionHistory: this._executionHistory,
        metadata: this._metadata
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        success: false,
        error: error.message,
        duration,
        executionHistory: this._executionHistory,
        metadata: this._metadata
      };
    }
  }

  /**
   * Validate workflow
   * @param {WorkflowContext} context - Workflow context
   * @returns {Promise<ValidationResult>} Validation result
   */
  async validate(context) {
    const results = [];
    let isValid = true;

    // Validate each step
    for (const step of this._steps) {
      try {
        const stepValidation = await step.validate(context);
        results.push(stepValidation);
        
        if (!stepValidation.isValid) {
          isValid = false;
        }
      } catch (error) {
        results.push(new ValidationResult(false, [error.message]));
        isValid = false;
      }
    }

    // Apply custom validation rules
    for (const rule of this._validationRules) {
      try {
        const ruleValidation = await rule.validate(context);
        results.push(ruleValidation);
        
        if (!ruleValidation.isValid) {
          isValid = false;
        }
      } catch (error) {
        results.push(new ValidationResult(false, [error.message]));
        isValid = false;
      }
    }

    return new ValidationResult(isValid, results);
  }

  /**
   * Rollback workflow execution
   * @param {WorkflowContext} context - Workflow context
   * @returns {Promise<RollbackResult>} Rollback result
   */
  async rollback(context) {
    if (!this._rollbackStrategy) {
      throw new WorkflowException('No rollback strategy configured');
    }

    return await this._rollbackStrategy.rollback(context, this._steps.length - 1, []);
  }

  /**
   * Get workflow metadata
   * @returns {WorkflowMetadata} Workflow metadata
   */
  getMetadata() {
    return {
      name: this._metadata.name || 'ComposedWorkflow',
      description: this._metadata.description || 'Composed workflow',
      type: 'composed',
      version: this._metadata.version || '1.0.0',
      steps: this._steps.map(step => step.getMetadata()),
      validationRules: this._validationRules.length,
      hasRollbackStrategy: !!this._rollbackStrategy
    };
  }
}
```

## 6. Common Workflow Steps Design

#### BaseWorkflowStep Implementation
```javascript
/**
 * Base workflow step implementation
 */
class BaseWorkflowStep {
  constructor(name, description, type = 'generic') {
    this._name = name;
    this._description = description;
    this._type = type;
    this._metadata = {};
    this._validationRules = [];
  }

  /**
   * Execute the workflow step
   * @param {WorkflowContext} context - Workflow context
   * @returns {Promise<StepResult>} Step execution result
   */
  async execute(context) {
    const startTime = Date.now();
    
    try {
      // Validate step before execution
      const validationResult = await this.validate(context);
      if (!validationResult.isValid) {
        throw new ValidationException('Step validation failed', validationResult);
      }

      // Execute step implementation
      const result = await this.executeStep(context);
      
      const duration = Date.now() - startTime;
      
      return {
        success: true,
        stepName: this._name,
        result,
        duration,
        metadata: this._metadata
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        success: false,
        stepName: this._name,
        error: error.message,
        duration,
        metadata: this._metadata
      };
    }
  }

  /**
   * Execute step implementation (to be overridden)
   * @param {WorkflowContext} context - Workflow context
   * @returns {Promise<*>} Step result
   */
  async executeStep(context) {
    throw new Error('executeStep must be implemented by subclass');
  }

  /**
   * Validate step
   * @param {WorkflowContext} context - Workflow context
   * @returns {Promise<ValidationResult>} Validation result
   */
  async validate(context) {
    const results = [];
    let isValid = true;

    // Apply validation rules
    for (const rule of this._validationRules) {
      try {
        const ruleValidation = await rule.validate(context);
        results.push(ruleValidation);
        
        if (!ruleValidation.isValid) {
          isValid = false;
        }
      } catch (error) {
        results.push(new ValidationResult(false, [error.message]));
        isValid = false;
      }
    }

    return new ValidationResult(isValid, results);
  }

  /**
   * Rollback step execution
   * @param {WorkflowContext} context - Workflow context
   * @returns {Promise<RollbackResult>} Rollback result
   */
  async rollback(context) {
    // Default rollback implementation
    return {
      success: true,
      stepName: this._name,
      message: 'Step rollback completed'
    };
  }

  /**
   * Get step metadata
   * @returns {StepMetadata} Step metadata
   */
  getMetadata() {
    return {
      name: this._name,
      description: this._description,
      type: this._type,
      version: this._metadata.version || '1.0.0',
      validationRules: this._validationRules.length
    };
  }

  /**
   * Add validation rule
   * @param {ValidationRule} rule - Validation rule
   */
  addValidationRule(rule) {
    this._validationRules.push(rule);
  }

  /**
   * Set metadata
   * @param {Object} metadata - Step metadata
   */
  setMetadata(metadata) {
    this._metadata = { ...this._metadata, ...metadata };
  }
}
```

#### AnalysisStep Implementation
```javascript
/**
 * Analysis workflow step
 */
class AnalysisStep extends BaseWorkflowStep {
  constructor(analysisType = 'comprehensive', options = {}) {
    super('AnalysisStep', `Performs ${analysisType} analysis`, 'analysis');
    this._analysisType = analysisType;
    this._options = options;
  }

  async executeStep(context) {
    const projectPath = context.get('projectPath');
    const analysisService = context.get('analysisService');
    
    if (!projectPath) {
      throw new Error('Project path not found in context');
    }
    
    if (!analysisService) {
      throw new Error('Analysis service not found in context');
    }

    // Perform analysis based on type
    switch (this._analysisType) {
      case 'comprehensive':
        return await analysisService.performComprehensiveAnalysis(projectPath, this._options);
      case 'architecture':
        return await analysisService.performArchitectureAnalysis(projectPath, this._options);
      case 'security':
        return await analysisService.performSecurityAnalysis(projectPath, this._options);
      case 'performance':
        return await analysisService.performPerformanceAnalysis(projectPath, this._options);
      default:
        throw new Error(`Unknown analysis type: ${this._analysisType}`);
    }
  }

  getMetadata() {
    return {
      ...super.getMetadata(),
      analysisType: this._analysisType,
      options: this._options
    };
  }
}
```

## 7. Step Registry Design

#### StepRegistry Implementation
```javascript
/**
 * Step registry for workflow step management
 */
class StepRegistry {
  constructor() {
    this._steps = new Map();
    this._templates = new Map();
  }

  /**
   * Register workflow step
   * @param {string} name - Step name
   * @param {Function} stepClass - Step class constructor
   */
  registerStep(name, stepClass) {
    this._steps.set(name, stepClass);
  }

  /**
   * Get workflow step
   * @param {string} name - Step name
   * @returns {Function} Step class constructor
   */
  getStep(name) {
    const stepClass = this._steps.get(name);
    if (!stepClass) {
      throw new Error(`Workflow step not found: ${name}`);
    }
    return stepClass;
  }

  /**
   * Create step instance
   * @param {string} name - Step name
   * @param {Object} options - Step options
   * @returns {IWorkflowStep} Step instance
   */
  createStep(name, options = {}) {
    const stepClass = this.getStep(name);
    return new stepClass(options);
  }

  /**
   * Register workflow template
   * @param {string} name - Template name
   * @param {WorkflowTemplate} template - Workflow template
   */
  registerTemplate(name, template) {
    this._templates.set(name, template);
  }

  /**
   * Get workflow template
   * @param {string} name - Template name
   * @returns {WorkflowTemplate} Workflow template
   */
  getTemplate(name) {
    const template = this._templates.get(name);
    if (!template) {
      throw new Error(`Workflow template not found: ${name}`);
    }
    return template;
  }

  /**
   * List all registered steps
   * @returns {Array<string>} Step names
   */
  listSteps() {
    return Array.from(this._steps.keys());
  }

  /**
   * List all registered templates
   * @returns {Array<string>} Template names
   */
  listTemplates() {
    return Array.from(this._templates.keys());
  }
}

// Global step registry instance
const stepRegistry = new StepRegistry();

// Register common steps
stepRegistry.registerStep('analysis', AnalysisStep);
stepRegistry.registerStep('refactoring', RefactoringStep);
stepRegistry.registerStep('testing', TestingStep);
stepRegistry.registerStep('documentation', DocumentationStep);
stepRegistry.registerStep('validation', ValidationStep);
stepRegistry.registerStep('deployment', DeploymentStep);
stepRegistry.registerStep('security', SecurityStep);
stepRegistry.registerStep('optimization', OptimizationStep);
```

## 8. Code Standards & Patterns
- **Coding Style**: ESLint with existing project rules, Prettier formatting
- **Naming Conventions**: camelCase for variables/functions, PascalCase for classes, kebab-case for files
- **Error Handling**: Try-catch with specific error types, proper error logging
- **Logging**: Winston logger with structured logging, different levels for operations
- **Testing**: Jest framework, 95% coverage requirement
- **Documentation**: JSDoc for all public methods, README updates

## 9. Testing Strategy

#### Unit Tests: 15 test files (1 per implementation file)
- **Builder**: 4 test files for builder pattern
- **Steps**: 9 test files for common workflow steps
- **Registry**: 2 test files for step registry

#### Test Coverage Requirements:
- **Line Coverage**: 95% minimum
- **Branch Coverage**: 90% minimum
- **Function Coverage**: 100% minimum

## 10. Success Criteria

#### Technical Metrics:
- [ ] Builder pattern fully functional with fluent interface
- [ ] All common workflow steps implemented and working
- [ ] Step registry properly managing steps and templates
- [ ] 95% test coverage achieved
- [ ] Zero breaking changes to existing APIs

#### Integration Metrics:
- [ ] WorkflowOrchestrationService successfully integrated with builder
- [ ] TaskService successfully using composed workflows
- [ ] All existing functionality preserved
- [ ] Builder pattern providing value for workflow creation

## 11. Risk Assessment

#### High Risk:
- [ ] Builder pattern complexity affecting usability - Mitigation: Comprehensive testing and documentation
- [ ] Step composition breaking existing workflows - Mitigation: Thorough integration testing

#### Medium Risk:
- [ ] Performance impact of step composition - Mitigation: Performance testing and optimization
- [ ] Step registry conflicts - Mitigation: Clear naming conventions and validation

#### Low Risk:
- [ ] Documentation completeness - Mitigation: Automated documentation generation
- [ ] Code style consistency - Mitigation: Automated linting and formatting

## 12. AI Auto-Implementation Instructions

#### Task Database Fields:
- **source_type**: 'markdown_doc'
- **source_path**: 'docs/09_roadmap/features/unified-workflow-foundation-1b-builder-pattern.md'
- **automation_level**: 'semi_auto'
- **confirmation_required**: true
- **max_attempts**: 3
- **git_branch_required**: true
- **new_chat_required**: true

#### AI Execution Context:
```json
{
  "requires_new_chat": true,
  "git_branch_name": "feature/unified-workflow-foundation-1b",
  "confirmation_keywords": ["fertig", "done", "complete", "builder pattern ready"],
  "fallback_detection": true,
  "max_confirmation_attempts": 3,
  "timeout_seconds": 1800
}
```

#### Success Indicators:
- [ ] All 15 new files created with proper JSDoc
- [ ] All 3 existing files modified correctly
- [ ] Builder pattern fully functional
- [ ] All common workflow steps implemented
- [ ] Step registry working properly
- [ ] All tests passing
- [ ] No build errors
- [ ] Code follows standards
- [ ] Documentation updated

## 13. References & Resources
- **Technical Documentation**: Builder pattern, Domain-Driven Design, Workflow composition
- **API References**: Existing PIDEA patterns and conventions
- **Design Patterns**: Builder pattern, Template pattern, Registry pattern
- **Best Practices**: SOLID principles, Clean Architecture, Fluent interfaces
- **Similar Implementations**: Existing service patterns in PIDEA

---

## Database Task Creation Instructions

This subtask will be parsed into a database task with the following mapping:

```sql
INSERT INTO tasks (
  id, project_id, title, description, type, category, priority, status,
  source_type, source_path, source_content, metadata, estimated_hours
) VALUES (
  uuid(), -- Generated
  'pidea-backend', -- From context
  'Unified Workflow Foundation 1B: Builder Pattern & Common Steps', -- From section 1
  '[Full markdown content]', -- Complete description
  'feature', -- Derived from Technical Requirements
  'backend', -- Derived from context
  'high', -- From section 1
  'pending', -- Initial status
  'markdown_doc', -- Source type
  'docs/09_roadmap/features/unified-workflow-foundation-1b-builder-pattern.md', -- Source path
  '[Full markdown content]', -- For reference
  '[JSON with all metadata]', -- All technical details
  80 -- From section 1 (total hours)
);
``` 