# Validate-Tasks System Implementation Plan

## 1. Project Overview
- **Feature/Component Name**: IDE-based Task Validation System
- **Priority**: High
- **Estimated Time**: 4-6 days
- **Dependencies**: Existing CDP integration, BrowserManager, IDEManager, Chat system, Framework processing, Task organization system
- **Related Issues**: Task validation, refinement, organization, execution, IDE automation

## 2. Technical Requirements
- **Tech Stack**: Node.js, Chrome DevTools Protocol (CDP), Playwright, Express, WebSocket
- **Architecture Pattern**: DDD with CQRS for task processing and validation
- **Database Changes**: Task validation storage, refinement history, execution logs
- **API Changes**: New task validation endpoints, CDP task processing APIs
- **Frontend Changes**: Task validation UI, real-time validation status display
- **Backend Changes**: Task validation service, CDP integration, framework refinement

## 3. File Impact Analysis

#### Files to Modify:
- [ ] `backend/domain/services/CursorIDEService.js` - Add task validation capabilities
- [ ] `backend/infrastructure/external/BrowserManager.js` - Add CDP task validation
- [ ] `backend/infrastructure/external/IDEManager.js` - Add task validation integration
- [ ] `backend/presentation/api/ChatController.js` - Add task validation endpoints
- [ ] `backend/domain/services/chat/ChatMessageHandler.js` - Add task validation processing
- [ ] `frontend/src/presentation/components/ChatComponent.jsx` - Add task validation UI
- [ ] `frontend/src/application/services/ChatService.jsx` - Add task validation service
- [ ] `backend/domain/services/task-organization/TaskOrganizationService.js` - Add validation integration

#### Files to Create:
- [ ] `backend/domain/services/task-validation/TaskValidationService.js` - Core task validation logic
- [ ] `backend/domain/services/task-validation/TaskRefiner.js` - Task refinement engine
- [ ] `backend/domain/services/task-validation/TaskValidator.js` - Task validation engine
- [ ] `backend/domain/services/task-validation/TaskExecutor.js` - Task execution engine
- [ ] `backend/domain/services/task-validation/CodeAnalyzer.js` - Code analysis for validation
- [ ] `backend/application/commands/ValidateTasksCommand.js` - Task validation command
- [ ] `backend/application/handlers/ValidateTasksHandler.js` - Task validation handler
- [ ] `backend/presentation/api/TaskValidationController.js` - Task validation API
- [ ] `backend/domain/entities/TaskValidation.js` - Task validation entity
- [ ] `backend/domain/entities/TaskRefinement.js` - Task refinement entity
- [ ] `backend/domain/entities/TaskExecution.js` - Task execution entity
- [ ] `backend/infrastructure/database/TaskValidationRepository.js` - Task validation persistence
- [ ] `frontend/src/presentation/components/TaskValidationPanel.jsx` - Task validation UI
- [ ] `frontend/src/presentation/components/ValidationStatusIndicator.jsx` - Validation status display
- [ ] `frontend/src/application/services/TaskValidationService.jsx` - Frontend validation service
- [ ] `tests/unit/TaskValidationService.test.js` - Task validation unit tests
- [ ] `tests/integration/TaskValidationWorkflow.test.js` - Task validation integration tests

#### Files to Delete:
- [ ] Old task processing logic that doesn't use validation system

## 4. Implementation Phases

#### Phase 1: Foundation Setup (Day 1-2)
- [ ] Create TaskValidationService with core validation logic
- [ ] Implement TaskRefiner for framework-based task refinement
- [ ] Set up TaskValidation, TaskRefinement, and TaskExecution entities
- [ ] Create basic task validation API endpoints
- [ ] Add CDP integration for task validation
- [ ] Integrate with existing Chat system and Framework processing

#### Phase 2: Core Implementation (Day 3-4)
- [ ] Implement TaskValidator for comprehensive task validation
- [ ] Add CodeAnalyzer for code state analysis
- [ ] Create TaskExecutor for task execution
- [ ] Add real-time validation status tracking
- [ ] Implement task validation UI components
- [ ] Add error handling and validation

#### Phase 3: Integration (Day 5)
- [ ] Integrate with existing CDP infrastructure
- [ ] Connect task validation with task organization system
- [ ] Add frontend task validation controls
- [ ] Implement real-time validation updates
- [ ] Test complete task validation workflow
- [ ] Add performance monitoring

#### Phase 4: Testing & Documentation (Day 6)
- [ ] Write comprehensive unit tests for all task validation services
- [ ] Create integration tests for task validation workflow
- [ ] Test validation accuracy and refinement quality
- [ ] Update API documentation
- [ ] Create user guide for task validation system
- [ ] Test with various project types and task complexities

#### Phase 5: Deployment & Validation (Day 7)
- [ ] Deploy to staging environment
- [ ] Test task validation in real IDE environment
- [ ] Validate task refinement and validation accuracy
- [ ] Monitor task validation performance
- [ ] Deploy to production
- [ ] Monitor user feedback and system performance

## 5. Code Standards & Patterns
- **Coding Style**: ESLint with existing project rules, Prettier formatting
- **Naming Conventions**: camelCase for variables/functions, PascalCase for classes, kebab-case for files
- **Error Handling**: Try-catch with specific error types, proper error logging
- **Logging**: Winston logger with structured logging, different levels for validation operations
- **Testing**: Jest framework, 90% coverage requirement
- **Documentation**: JSDoc for all public methods, README updates

## 6. Security Considerations
- [ ] Task input validation and sanitization
- [ ] User authentication and authorization for task validation
- [ ] CDP connection security and validation
- [ ] Task data privacy and protection
- [ ] Rate limiting for task validation requests
- [ ] Audit logging for task validation operations
- [ ] Protection against malicious task inputs

## 7. Performance Requirements
- **Task Validation Time**: <5 seconds for complete validation workflow
- **Refinement Accuracy**: >95% correct task refinements
- **Validation Accuracy**: >95% correct task validations
- **Execution Success Rate**: >98% successful task executions
- **CDP Response Time**: <1 second for task processing
- **Memory Usage**: <100MB for task validation processing
- **Concurrent Users**: Support 5+ simultaneous validation workflows

## 8. Testing Strategy

#### Unit Tests:
- [ ] Test file: `tests/unit/TaskValidationService.test.js`
- [ ] Test cases: Task refinement, validation, execution, code analysis
- [ ] Mock requirements: CDP, Framework processing, IDE integration

#### Integration Tests:
- [ ] Test file: `tests/integration/TaskValidationWorkflow.test.js`
- [ ] Test scenarios: Complete task validation workflows, CDP integration, framework processing
- [ ] Test data: Sample TODO lists, various project types, different task complexities

#### E2E Tests:
- [ ] Test file: `tests/e2e/TaskValidationWorkflow.test.js`
- [ ] User flows: Complete task validation from chat input to execution
- [ ] Browser compatibility: Chrome (CDP compatibility)

## 9. Documentation Requirements

#### Code Documentation:
- [ ] JSDoc comments for TaskValidationService, TaskRefiner, TaskValidator
- [ ] API documentation for task validation endpoints
- [ ] CDP integration documentation
- [ ] Architecture diagrams for task validation flow

#### User Documentation:
- [ ] Task validation system usage guide
- [ ] Task refinement process explanation
- [ ] Validation rules and criteria
- [ ] Troubleshooting task validation issues

## 10. Deployment Checklist

#### Pre-deployment:
- [ ] All task validation tests passing
- [ ] Validation accuracy testing
- [ ] CDP integration testing
- [ ] Documentation updated
- [ ] Environment variables configured

#### Deployment:
- [ ] Database migrations for task validation tables
- [ ] CDP server configuration
- [ ] Task validation service startup
- [ ] Health checks for task validation endpoints
- [ ] Monitoring setup for task validation operations

#### Post-deployment:
- [ ] Monitor task validation accuracy
- [ ] Verify refinement and validation quality
- [ ] Check CDP performance and reliability
- [ ] User feedback collection

## 11. Rollback Plan
- [ ] Database rollback for task validation tables
- [ ] Service rollback to previous task processing implementation
- [ ] CDP configuration rollback
- [ ] Communication plan for users

## 12. Success Criteria
- [ ] Task refinement works with >95% accuracy
- [ ] Task validation correctly identifies feasible tasks
- [ ] Task execution completes successfully
- [ ] CDP integration works seamlessly with IDE
- [ ] Performance requirements are met
- [ ] Security requirements satisfied
- [ ] Documentation complete and accurate

## 13. Risk Assessment

#### High Risk:
- [ ] CDP connection failures - Mitigation: Robust error handling and fallback mechanisms
- [ ] Task validation accuracy issues - Mitigation: Extensive testing and ML-based improvements
- [ ] IDE integration problems - Mitigation: Comprehensive CDP testing and validation

#### Medium Risk:
- [ ] Performance issues with complex task validation - Mitigation: Optimization and caching
- [ ] Framework processing delays - Mitigation: Async processing and timeouts
- [ ] User adoption challenges - Mitigation: Intuitive UI and comprehensive documentation

#### Low Risk:
- [ ] UI responsiveness issues - Mitigation: Async processing and loading states
- [ ] Documentation gaps - Mitigation: Comprehensive review process

## 14. References & Resources
- **Technical Documentation**: Chrome DevTools Protocol documentation, Playwright CDP docs
- **API References**: CDP API, Task validation patterns
- **Design Patterns**: Command pattern, Strategy pattern for validation
- **Best Practices**: Task management best practices, IDE automation guidelines
- **Similar Implementations**: Existing IDE integration in project

## 15. Implementation Details

#### Task Validation Service Architecture:
```javascript
class TaskValidationService {
  constructor(taskRefiner, taskValidator, taskExecutor, codeAnalyzer) {
    this.taskRefiner = taskRefiner;
    this.taskValidator = taskValidator;
    this.taskExecutor = taskExecutor;
    this.codeAnalyzer = codeAnalyzer;
  }
  
  async validateAndExecuteTasks(rawTasks, frameworkRules, projectContext) {
    try {
      // Step 1: Refine tasks with framework
      const refinedTasks = await this.taskRefiner.refineTasks(rawTasks, frameworkRules);
      
      // Step 2: Analyze current code state
      const codeState = await this.codeAnalyzer.analyzeCodeState(projectContext);
      
      // Step 3: Validate refined tasks
      const validationResults = await this.taskValidator.validateTasks(refinedTasks, codeState);
      
      // Step 4: Execute valid tasks
      const executionResults = await this.taskExecutor.executeTasks(validationResults.validTasks);
      
      return {
        success: true,
        refinedTasks,
        validationResults,
        executionResults,
        metrics: {
          totalTasks: rawTasks.length,
          refinedTasks: refinedTasks.length,
          validTasks: validationResults.validTasks.length,
          executedTasks: executionResults.executedTasks.length,
          executionTime: executionResults.executionTime
        }
      };
      
    } catch (error) {
      console.error('Task validation error:', error);
      throw new TaskValidationError('Failed to validate and execute tasks', error);
    }
  }
  
  async processChatInput(chatInput, todoFile, frameworkMd) {
    // Extract tasks from chat input
    const rawTasks = this.extractTasksFromChat(chatInput);
    
    // Get project context via CDP
    const projectContext = await this.getProjectContext();
    
    // Process with framework rules
    const frameworkRules = this.parseFrameworkRules(frameworkMd);
    
    // Validate and execute tasks
    return await this.validateAndExecuteTasks(rawTasks, frameworkRules, projectContext);
  }
}
```

#### Task Refiner:
```javascript
class TaskRefiner {
  constructor() {
    this.refinementPatterns = {
      ui: {
        button: /(button|btn)/i,
        text: /(text|label|title|heading)/i,
        form: /(form|input|field|validation)/i,
        style: /(style|css|color|size|position)/i
      },
      backend: {
        api: /(api|endpoint|route|controller)/i,
        service: /(service|business logic|function)/i,
        database: /(database|schema|model|query)/i
      },
      testing: {
        test: /(test|spec|jest|mocha|cypress)/i,
        unit: /(unit|integration|e2e)/i
      }
    };
  }
  
  async refineTasks(rawTasks, frameworkRules) {
    const refinedTasks = [];
    
    for (const task of rawTasks) {
      const refinedTask = await this.refineTask(task, frameworkRules);
      refinedTasks.push(refinedTask);
    }
    
    return refinedTasks;
  }
  
  async refineTask(task, frameworkRules) {
    const description = task.description.toLowerCase();
    let refinedDescription = task.description;
    let category = this.determineCategory(description);
    let priority = this.determinePriority(description, frameworkRules);
    let estimatedTime = this.estimateTime(description, category);
    
    // Apply framework-specific refinements
    if (frameworkRules.ui && category === 'UI') {
      refinedDescription = this.applyUIFrameworkRefinements(task.description, frameworkRules.ui);
    }
    
    if (frameworkRules.backend && category === 'Backend') {
      refinedDescription = this.applyBackendFrameworkRefinements(task.description, frameworkRules.backend);
    }
    
    if (frameworkRules.testing && category === 'Testing') {
      refinedDescription = this.applyTestingFrameworkRefinements(task.description, frameworkRules.testing);
    }
    
    return {
      id: task.id,
      originalDescription: task.description,
      refinedDescription: refinedDescription,
      category: category,
      priority: priority,
      estimatedTime: estimatedTime,
      frameworkRules: frameworkRules,
      refinementTimestamp: new Date()
    };
  }
  
  determineCategory(description) {
    for (const [category, patterns] of Object.entries(this.refinementPatterns)) {
      for (const [subcategory, pattern] of Object.entries(patterns)) {
        if (pattern.test(description)) {
          return `${category}-${subcategory}`;
        }
      }
    }
    
    return 'general';
  }
  
  determinePriority(description, frameworkRules) {
    let priority = 1; // Default medium priority
    
    // Check for priority keywords
    const highPriorityKeywords = ['urgent', 'critical', 'important', 'fix', 'bug'];
    const lowPriorityKeywords = ['nice to have', 'optional', 'future', 'enhancement'];
    
    for (const keyword of highPriorityKeywords) {
      if (description.includes(keyword)) {
        priority = 3;
        break;
      }
    }
    
    for (const keyword of lowPriorityKeywords) {
      if (description.includes(keyword)) {
        priority = 1;
        break;
      }
    }
    
    // Apply framework-specific priority rules
    if (frameworkRules.priorityRules) {
      priority = this.applyFrameworkPriorityRules(description, priority, frameworkRules.priorityRules);
    }
    
    return priority;
  }
  
  estimateTime(description, category) {
    // Base time estimates by category
    const baseTimes = {
      'ui-button': 0.5,
      'ui-text': 0.3,
      'ui-form': 1.0,
      'ui-style': 0.5,
      'backend-api': 2.0,
      'backend-service': 1.5,
      'backend-database': 3.0,
      'testing-test': 1.0,
      'testing-unit': 0.5
    };
    
    const baseTime = baseTimes[category] || 1.0;
    
    // Adjust based on complexity keywords
    const complexityKeywords = {
      'simple': 0.5,
      'easy': 0.7,
      'complex': 2.0,
      'difficult': 2.5
    };
    
    for (const [keyword, multiplier] of Object.entries(complexityKeywords)) {
      if (description.includes(keyword)) {
        return baseTime * multiplier;
      }
    }
    
    return baseTime;
  }
  
  applyUIFrameworkRefinements(description, uiRules) {
    let refined = description;
    
    // Apply UI framework-specific refinements
    if (uiRules.componentLibrary) {
      refined = refined.replace(/button/gi, `${uiRules.componentLibrary} Button`);
    }
    
    if (uiRules.stylingFramework) {
      refined = refined.replace(/style/gi, `${uiRules.stylingFramework} styling`);
    }
    
    return refined;
  }
  
  applyBackendFrameworkRefinements(description, backendRules) {
    let refined = description;
    
    // Apply backend framework-specific refinements
    if (backendRules.apiFramework) {
      refined = refined.replace(/api/gi, `${backendRules.apiFramework} API`);
    }
    
    if (backendRules.databaseFramework) {
      refined = refined.replace(/database/gi, `${backendRules.databaseFramework} database`);
    }
    
    return refined;
  }
  
  applyTestingFrameworkRefinements(description, testingRules) {
    let refined = description;
    
    // Apply testing framework-specific refinements
    if (testingRules.testingFramework) {
      refined = refined.replace(/test/gi, `${testingRules.testingFramework} test`);
    }
    
    return refined;
  }
}
```

#### Task Validator:
```javascript
class TaskValidator {
  constructor() {
    this.validationRules = {
      syntax: this.validateSyntax.bind(this),
      feasibility: this.validateFeasibility.bind(this),
      dependencies: this.validateDependencies.bind(this),
      context: this.validateContext.bind(this)
    };
  }
  
  async validateTasks(refinedTasks, codeState) {
    const validationResults = {
      validTasks: [],
      invalidTasks: [],
      warnings: [],
      errors: []
    };
    
    for (const task of refinedTasks) {
      const validation = await this.validateTask(task, codeState);
      
      if (validation.isValid) {
        validationResults.validTasks.push({
          ...task,
          validation: validation
        });
      } else {
        validationResults.invalidTasks.push({
          ...task,
          validation: validation
        });
      }
      
      if (validation.warnings.length > 0) {
        validationResults.warnings.push(...validation.warnings);
      }
      
      if (validation.errors.length > 0) {
        validationResults.errors.push(...validation.errors);
      }
    }
    
    return validationResults;
  }
  
  async validateTask(task, codeState) {
    const validation = {
      isValid: true,
      warnings: [],
      errors: [],
      details: {}
    };
    
    // Run all validation rules
    for (const [ruleName, ruleFunction] of Object.entries(this.validationRules)) {
      try {
        const ruleResult = await ruleFunction(task, codeState);
        
        validation.details[ruleName] = ruleResult;
        
        if (!ruleResult.isValid) {
          validation.isValid = false;
          validation.errors.push(...ruleResult.errors);
        }
        
        if (ruleResult.warnings.length > 0) {
          validation.warnings.push(...ruleResult.warnings);
        }
        
      } catch (error) {
        console.error(`Validation rule ${ruleName} failed:`, error);
        validation.isValid = false;
        validation.errors.push(`Validation rule ${ruleName} failed: ${error.message}`);
      }
    }
    
    return validation;
  }
  
  async validateSyntax(task, codeState) {
    const result = { isValid: true, errors: [], warnings: [] };
    const description = task.refinedDescription;
    
    // Check for required elements
    if (!description || description.trim().length === 0) {
      result.isValid = false;
      result.errors.push('Task description is empty');
    }
    
    // Check for action verbs
    const actionVerbs = ['create', 'add', 'modify', 'change', 'update', 'fix', 'implement', 'test'];
    const hasActionVerb = actionVerbs.some(verb => description.toLowerCase().includes(verb));
    
    if (!hasActionVerb) {
      result.warnings.push('Task description lacks clear action verb');
    }
    
    // Check for specific targets
    const hasTarget = /(button|text|form|api|database|test)/i.test(description);
    if (!hasTarget) {
      result.warnings.push('Task description lacks specific target');
    }
    
    return result;
  }
  
  async validateFeasibility(task, codeState) {
    const result = { isValid: true, errors: [], warnings: [] };
    const description = task.refinedDescription.toLowerCase();
    
    // Check if required elements exist in code
    if (task.category.startsWith('ui-')) {
      const uiValidation = await this.validateUIElements(task, codeState);
      if (!uiValidation.isValid) {
        result.isValid = false;
        result.errors.push(...uiValidation.errors);
      }
      result.warnings.push(...uiValidation.warnings);
    }
    
    if (task.category.startsWith('backend-')) {
      const backendValidation = await this.validateBackendElements(task, codeState);
      if (!backendValidation.isValid) {
        result.isValid = false;
        result.errors.push(...backendValidation.errors);
      }
      result.warnings.push(...backendValidation.warnings);
    }
    
    return result;
  }
  
  async validateUIElements(task, codeState) {
    const result = { isValid: true, errors: [], warnings: [] };
    const description = task.refinedDescription.toLowerCase();
    
    // Check for button elements
    if (description.includes('button')) {
      const buttons = codeState.uiElements.buttons || [];
      if (buttons.length === 0) {
        result.warnings.push('No buttons found in current code state');
      }
    }
    
    // Check for text elements
    if (description.includes('text') || description.includes('label')) {
      const textElements = codeState.uiElements.textElements || [];
      if (textElements.length === 0) {
        result.warnings.push('No text elements found in current code state');
      }
    }
    
    // Check for form elements
    if (description.includes('form') || description.includes('input')) {
      const forms = codeState.uiElements.forms || [];
      if (forms.length === 0) {
        result.warnings.push('No forms found in current code state');
      }
    }
    
    return result;
  }
  
  async validateBackendElements(task, codeState) {
    const result = { isValid: true, errors: [], warnings: [] };
    const description = task.refinedDescription.toLowerCase();
    
    // Check for API endpoints
    if (description.includes('api') || description.includes('endpoint')) {
      const endpoints = codeState.backendElements.endpoints || [];
      if (endpoints.length === 0) {
        result.warnings.push('No API endpoints found in current code state');
      }
    }
    
    // Check for database elements
    if (description.includes('database') || description.includes('schema')) {
      const databaseElements = codeState.backendElements.database || [];
      if (databaseElements.length === 0) {
        result.warnings.push('No database elements found in current code state');
      }
    }
    
    return result;
  }
  
  async validateDependencies(task, codeState) {
    const result = { isValid: true, errors: [], warnings: [] };
    
    // Check for circular dependencies
    const dependencies = this.extractDependencies(task);
    const hasCircularDependency = this.checkCircularDependencies(dependencies);
    
    if (hasCircularDependency) {
      result.isValid = false;
      result.errors.push('Circular dependency detected in task');
    }
    
    // Check for missing dependencies
    const missingDependencies = this.checkMissingDependencies(dependencies, codeState);
    if (missingDependencies.length > 0) {
      result.warnings.push(`Missing dependencies: ${missingDependencies.join(', ')}`);
    }
    
    return result;
  }
  
  async validateContext(task, codeState) {
    const result = { isValid: true, errors: [], warnings: [] };
    
    // Check if task is appropriate for current project context
    const projectType = codeState.projectType;
    const taskCategory = task.category;
    
    if (projectType === 'frontend-only' && taskCategory.startsWith('backend-')) {
      result.warnings.push('Backend task in frontend-only project');
    }
    
    if (projectType === 'backend-only' && taskCategory.startsWith('ui-')) {
      result.warnings.push('UI task in backend-only project');
    }
    
    // Check for framework compatibility
    const framework = codeState.framework;
    if (framework && !this.isFrameworkCompatible(task, framework)) {
      result.warnings.push(`Task may not be compatible with ${framework} framework`);
    }
    
    return result;
  }
  
  extractDependencies(task) {
    // Extract dependencies from task description
    const dependencies = [];
    const description = task.refinedDescription.toLowerCase();
    
    // Look for dependency keywords
    const dependencyKeywords = ['after', 'before', 'depends on', 'requires', 'needs'];
    
    for (const keyword of dependencyKeywords) {
      if (description.includes(keyword)) {
        // Extract dependency information
        const dependencyMatch = description.match(new RegExp(`${keyword}\\s+([^,]+)`, 'i'));
        if (dependencyMatch) {
          dependencies.push(dependencyMatch[1].trim());
        }
      }
    }
    
    return dependencies;
  }
  
  checkCircularDependencies(dependencies) {
    // Simple circular dependency check
    // In a real implementation, this would be more sophisticated
    return false;
  }
  
  checkMissingDependencies(dependencies, codeState) {
    const missing = [];
    
    for (const dependency of dependencies) {
      const exists = this.dependencyExists(dependency, codeState);
      if (!exists) {
        missing.push(dependency);
      }
    }
    
    return missing;
  }
  
  dependencyExists(dependency, codeState) {
    // Check if dependency exists in code state
    // This is a simplified implementation
    return true;
  }
  
  isFrameworkCompatible(task, framework) {
    // Check if task is compatible with framework
    // This is a simplified implementation
    return true;
  }
}
```

#### Code Analyzer:
```javascript
class CodeAnalyzer {
  constructor(cursorIDE) {
    this.cursorIDE = cursorIDE;
  }
  
  async analyzeCodeState(projectContext) {
    try {
      const codeState = {
        projectType: await this.determineProjectType(),
        framework: await this.detectFramework(),
        uiElements: await this.analyzeUIElements(),
        backendElements: await this.analyzeBackendElements(),
        dependencies: await this.analyzeDependencies(),
        structure: await this.analyzeProjectStructure(),
        timestamp: new Date()
      };
      
      return codeState;
      
    } catch (error) {
      console.error('Code analysis error:', error);
      throw new CodeAnalysisError('Failed to analyze code state', error);
    }
  }
  
  async determineProjectType() {
    try {
      const files = await this.cursorIDE.getProjectFiles();
      
      const hasFrontend = files.some(file => 
        file.includes('.html') || file.includes('.jsx') || file.includes('.vue')
      );
      
      const hasBackend = files.some(file => 
        file.includes('.js') || file.includes('.py') || file.includes('.java')
      );
      
      if (hasFrontend && hasBackend) {
        return 'fullstack';
      } else if (hasFrontend) {
        return 'frontend-only';
      } else if (hasBackend) {
        return 'backend-only';
      } else {
        return 'unknown';
      }
      
    } catch (error) {
      console.error('Project type determination failed:', error);
      return 'unknown';
    }
  }
  
  async detectFramework() {
    try {
      const packageJson = await this.cursorIDE.getFileContent('package.json');
      if (packageJson) {
        const dependencies = JSON.parse(packageJson).dependencies || {};
        
        if (dependencies.react) return 'React';
        if (dependencies.vue) return 'Vue';
        if (dependencies.angular) return 'Angular';
        if (dependencies.express) return 'Express';
        if (dependencies.fastify) return 'Fastify';
      }
      
      return 'unknown';
      
    } catch (error) {
      console.error('Framework detection failed:', error);
      return 'unknown';
    }
  }
  
  async analyzeUIElements() {
    try {
      const uiElements = {
        buttons: [],
        textElements: [],
        forms: [],
        inputs: []
      };
      
      // Analyze DOM for UI elements
      const domElements = await this.cursorIDE.getDOMElements();
      
      for (const element of domElements) {
        if (element.tagName === 'BUTTON') {
          uiElements.buttons.push({
            id: element.id,
            text: element.textContent,
            className: element.className
          });
        }
        
        if (element.tagName === 'INPUT') {
          uiElements.inputs.push({
            id: element.id,
            type: element.type,
            name: element.name
          });
        }
        
        if (element.tagName === 'FORM') {
          uiElements.forms.push({
            id: element.id,
            action: element.action,
            method: element.method
          });
        }
      }
      
      return uiElements;
      
    } catch (error) {
      console.error('UI elements analysis failed:', error);
      return { buttons: [], textElements: [], forms: [], inputs: [] };
    }
  }
  
  async analyzeBackendElements() {
    try {
      const backendElements = {
        endpoints: [],
        database: [],
        services: []
      };
      
      // Analyze backend files for elements
      const backendFiles = await this.cursorIDE.getBackendFiles();
      
      for (const file of backendFiles) {
        const content = await this.cursorIDE.getFileContent(file);
        
        // Look for API endpoints
        const endpointMatches = content.match(/app\.(get|post|put|delete)\(['"`]([^'"`]+)['"`]/g);
        if (endpointMatches) {
          for (const match of endpointMatches) {
            const method = match.match(/app\.(get|post|put|delete)/)[1];
            const path = match.match(/['"`]([^'"`]+)['"`]/)[1];
            backendElements.endpoints.push({ method, path });
          }
        }
        
        // Look for database elements
        const databaseMatches = content.match(/database|schema|model|table/gi);
        if (databaseMatches) {
          backendElements.database.push(...databaseMatches);
        }
      }
      
      return backendElements;
      
    } catch (error) {
      console.error('Backend elements analysis failed:', error);
      return { endpoints: [], database: [], services: [] };
    }
  }
  
  async analyzeDependencies() {
    try {
      const dependencies = {
        packages: [],
        modules: [],
        external: []
      };
      
      // Analyze package.json for dependencies
      const packageJson = await this.cursorIDE.getFileContent('package.json');
      if (packageJson) {
        const parsed = JSON.parse(packageJson);
        dependencies.packages = Object.keys(parsed.dependencies || {});
        dependencies.external = Object.keys(parsed.devDependencies || {});
      }
      
      return dependencies;
      
    } catch (error) {
      console.error('Dependencies analysis failed:', error);
      return { packages: [], modules: [], external: [] };
    }
  }
  
  async analyzeProjectStructure() {
    try {
      const structure = {
        directories: [],
        files: [],
        patterns: []
      };
      
      const files = await this.cursorIDE.getProjectFiles();
      
      for (const file of files) {
        structure.files.push(file);
        
        const directory = file.split('/').slice(0, -1).join('/');
        if (directory && !structure.directories.includes(directory)) {
          structure.directories.push(directory);
        }
      }
      
      return structure;
      
    } catch (error) {
      console.error('Project structure analysis failed:', error);
      return { directories: [], files: [], patterns: [] };
    }
  }
}
```

#### Task Executor:
```javascript
class TaskExecutor {
  constructor(cursorIDE) {
    this.cursorIDE = cursorIDE;
    this.executionHistory = [];
  }
  
  async executeTasks(validTasks) {
    const executionResults = {
      executedTasks: [],
      failedTasks: [],
      totalTime: 0,
      startTime: new Date()
    };
    
    for (const task of validTasks) {
      try {
        const result = await this.executeTask(task);
        executionResults.executedTasks.push(result);
      } catch (error) {
        console.error(`Task execution failed for ${task.id}:`, error);
        executionResults.failedTasks.push({
          task: task,
          error: error.message,
          timestamp: new Date()
        });
      }
    }
    
    executionResults.totalTime = new Date() - executionResults.startTime;
    executionResults.endTime = new Date();
    
    return executionResults;
  }
  
  async executeTask(task) {
    const startTime = new Date();
    
    try {
      let result;
      
      // Execute based on task category
      if (task.category.startsWith('ui-')) {
        result = await this.executeUITask(task);
      } else if (task.category.startsWith('backend-')) {
        result = await this.executeBackendTask(task);
      } else if (task.category.startsWith('testing-')) {
        result = await this.executeTestingTask(task);
      } else {
        result = await this.executeGeneralTask(task);
      }
      
      const executionTime = new Date() - startTime;
      
      const executionResult = {
        taskId: task.id,
        category: task.category,
        description: task.refinedDescription,
        result: result,
        executionTime: executionTime,
        success: true,
        timestamp: new Date()
      };
      
      this.executionHistory.push(executionResult);
      
      return executionResult;
      
    } catch (error) {
      const executionTime = new Date() - startTime;
      
      const executionResult = {
        taskId: task.id,
        category: task.category,
        description: task.refinedDescription,
        error: error.message,
        executionTime: executionTime,
        success: false,
        timestamp: new Date()
      };
      
      this.executionHistory.push(executionResult);
      
      throw error;
    }
  }
  
  async executeUITask(task) {
    const description = task.refinedDescription.toLowerCase();
    
    if (description.includes('button')) {
      return await this.executeButtonTask(task);
    } else if (description.includes('text') || description.includes('label')) {
      return await this.executeTextTask(task);
    } else if (description.includes('form') || description.includes('input')) {
      return await this.executeFormTask(task);
    } else if (description.includes('style') || description.includes('css')) {
      return await this.executeStyleTask(task);
    }
    
    throw new Error(`Unknown UI task type: ${task.refinedDescription}`);
  }
  
  async executeButtonTask(task) {
    // Execute button-related tasks
    const description = task.refinedDescription.toLowerCase();
    
    if (description.includes('red') || description.includes('rot')) {
      // Change button color to red
      await this.cursorIDE.setElementStyle('button', 'color', 'red');
      return { action: 'button-color-changed', color: 'red' };
    }
    
    if (description.includes('create') || description.includes('add')) {
      // Create new button
      const buttonHtml = '<button class="new-button">New Button</button>';
      await this.cursorIDE.insertElement('body', buttonHtml);
      return { action: 'button-created', html: buttonHtml };
    }
    
    throw new Error(`Unknown button task: ${task.refinedDescription}`);
  }
  
  async executeTextTask(task) {
    // Execute text-related tasks
    const description = task.refinedDescription.toLowerCase();
    
    if (description.includes('change') || description.includes('ändern')) {
      // Change text content
      const newText = this.extractNewText(description);
      await this.cursorIDE.setTextContent('text-element', newText);
      return { action: 'text-changed', newText: newText };
    }
    
    throw new Error(`Unknown text task: ${task.refinedDescription}`);
  }
  
  async executeFormTask(task) {
    // Execute form-related tasks
    const description = task.refinedDescription.toLowerCase();
    
    if (description.includes('validate') || description.includes('validieren')) {
      // Add form validation
      const validationScript = this.generateValidationScript();
      await this.cursorIDE.addScript(validationScript);
      return { action: 'form-validation-added', script: validationScript };
    }
    
    throw new Error(`Unknown form task: ${task.refinedDescription}`);
  }
  
  async executeStyleTask(task) {
    // Execute style-related tasks
    const description = task.refinedDescription.toLowerCase();
    
    if (description.includes('css') || description.includes('style')) {
      // Apply CSS styling
      const styles = this.extractStyles(description);
      await this.cursorIDE.applyStyles(styles);
      return { action: 'styles-applied', styles: styles };
    }
    
    throw new Error(`Unknown style task: ${task.refinedDescription}`);
  }
  
  async executeBackendTask(task) {
    // Execute backend-related tasks
    const description = task.refinedDescription.toLowerCase();
    
    if (description.includes('api') || description.includes('endpoint')) {
      return await this.executeAPITask(task);
    } else if (description.includes('database') || description.includes('schema')) {
      return await this.executeDatabaseTask(task);
    }
    
    throw new Error(`Unknown backend task: ${task.refinedDescription}`);
  }
  
  async executeAPITask(task) {
    // Execute API-related tasks
    const description = task.refinedDescription.toLowerCase();
    
    if (description.includes('create') || description.includes('add')) {
      // Create new API endpoint
      const endpointCode = this.generateEndpointCode(task);
      await this.cursorIDE.addFile('api/endpoints.js', endpointCode);
      return { action: 'api-endpoint-created', code: endpointCode };
    }
    
    throw new Error(`Unknown API task: ${task.refinedDescription}`);
  }
  
  async executeDatabaseTask(task) {
    // Execute database-related tasks
    const description = task.refinedDescription.toLowerCase();
    
    if (description.includes('schema') || description.includes('model')) {
      // Create database schema
      const schemaCode = this.generateSchemaCode(task);
      await this.cursorIDE.addFile('database/schema.js', schemaCode);
      return { action: 'database-schema-created', code: schemaCode };
    }
    
    throw new Error(`Unknown database task: ${task.refinedDescription}`);
  }
  
  async executeTestingTask(task) {
    // Execute testing-related tasks
    const description = task.refinedDescription.toLowerCase();
    
    if (description.includes('test') || description.includes('spec')) {
      // Create test file
      const testCode = this.generateTestCode(task);
      await this.cursorIDE.addFile('tests/test.js', testCode);
      return { action: 'test-created', code: testCode };
    }
    
    throw new Error(`Unknown testing task: ${task.refinedDescription}`);
  }
  
  async executeGeneralTask(task) {
    // Execute general tasks
    return { action: 'general-task-executed', description: task.refinedDescription };
  }
  
  extractNewText(description) {
    // Extract new text from task description
    const textMatch = description.match(/to\s+['"`]([^'"`]+)['"`]/i);
    return textMatch ? textMatch[1] : 'Updated Text';
  }
  
  generateValidationScript() {
    return `
      function validateForm() {
        // Form validation logic
        console.log('Form validation added');
      }
    `;
  }
  
  extractStyles(description) {
    // Extract styles from task description
    const styles = {};
    
    if (description.includes('red')) styles.color = 'red';
    if (description.includes('blue')) styles.color = 'blue';
    if (description.includes('large')) styles.fontSize = 'large';
    if (description.includes('small')) styles.fontSize = 'small';
    
    return styles;
  }
  
  generateEndpointCode(task) {
    return `
      app.post('/api/${task.category}', (req, res) => {
        // ${task.refinedDescription}
        res.json({ success: true });
      });
    `;
  }
  
  generateSchemaCode(task) {
    return `
      const schema = {
        // ${task.refinedDescription}
        id: { type: 'string', required: true },
        createdAt: { type: 'date', default: Date.now }
      };
    `;
  }
  
  generateTestCode(task) {
    return `
      describe('${task.refinedDescription}', () => {
        it('should work correctly', () => {
          // Test implementation
          expect(true).toBe(true);
        });
      });
    `;
  }
}
```

## 16. Usage Examples

#### Basic Task Validation:
```javascript
// Initialize Task Validation Service
const taskValidationService = new TaskValidationService(
  new TaskRefiner(),
  new TaskValidator(),
  new TaskExecutor(cursorIDE),
  new CodeAnalyzer(cursorIDE)
);

// Validate and execute tasks from chat input
const result = await taskValidationService.processChatInput(
  "TODO: Button rot machen, Text ändern, Form validieren",
  true, // TODO file checkbox
  "doc-general.md" // Framework MD
);

console.log('Validation result:', result);
```

#### CDP Integration:
```javascript
// Get project context via CDP
async function getProjectContext() {
  const browserManager = new BrowserManager();
  const context = await browserManager.getProjectContext();
  
  return {
    projectType: context.projectType,
    framework: context.framework,
    files: context.files,
    structure: context.structure
  };
}

// Process tasks with CDP
const projectContext = await getProjectContext();
const validationResult = await taskValidationService.validateAndExecuteTasks(
  rawTasks,
  frameworkRules,
  projectContext
);
```

#### Task Execution Monitoring:
```javascript
// Monitor task execution
const executionResults = validationResult.executionResults;

console.log('Executed tasks:', executionResults.executedTasks.length);
console.log('Failed tasks:', executionResults.failedTasks.length);
console.log('Total execution time:', executionResults.totalTime, 'ms');

// Check individual task results
executionResults.executedTasks.forEach(task => {
  console.log(`Task ${task.taskId}: ${task.success ? '✅' : '❌'} (${task.executionTime}ms)`);
});
```

This comprehensive plan provides all necessary details for implementing a sophisticated task validation system with refinement, validation, and execution capabilities.
