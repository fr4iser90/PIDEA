# Organize-Tasks System Implementation Plan

## 1. Project Overview
- **Feature/Component Name**: IDE-based Task Organization System
- **Priority**: High
- **Estimated Time**: 4-6 days
- **Dependencies**: Existing CDP integration, BrowserManager, IDEManager, Chat system, Framework processing
- **Related Issues**: Task categorization, prioritization, dependency mapping, IDE automation

## 2. Technical Requirements
- **Tech Stack**: Node.js, Chrome DevTools Protocol (CDP), Playwright, Express, WebSocket
- **Architecture Pattern**: DDD with CQRS for task processing and organization
- **Database Changes**: Task organization storage, categorization rules, dependency graphs
- **API Changes**: New task organization endpoints, CDP task processing APIs
- **Frontend Changes**: Task organization UI, real-time task status display
- **Backend Changes**: Task organization service, CDP integration, framework processing

## 3. File Impact Analysis

#### Files to Modify:
- [ ] `backend/domain/services/CursorIDEService.js` - Add task organization capabilities
- [ ] `backend/infrastructure/external/BrowserManager.js` - Add CDP task processing
- [ ] `backend/infrastructure/external/IDEManager.js` - Add task organization integration
- [ ] `backend/presentation/api/ChatController.js` - Add task organization endpoints
- [ ] `backend/domain/services/chat/ChatMessageHandler.js` - Add task processing logic
- [ ] `frontend/src/presentation/components/ChatComponent.jsx` - Add task organization UI
- [ ] `frontend/src/application/services/ChatService.jsx` - Add task organization service

#### Files to Create:
- [ ] `backend/domain/services/task-organization/TaskOrganizationService.js` - Core task organization logic
- [ ] `backend/domain/services/task-organization/TaskCategorizer.js` - Task categorization engine
- [ ] `backend/domain/services/task-organization/TaskPrioritizer.js` - Task prioritization engine
- [ ] `backend/domain/services/task-organization/DependencyMapper.js` - Dependency analysis
- [ ] `backend/domain/services/task-organization/ExecutionPlanner.js` - Optimal execution planning
- [ ] `backend/application/commands/OrganizeTasksCommand.js` - Task organization command
- [ ] `backend/application/handlers/OrganizeTasksHandler.js` - Task organization handler
- [ ] `backend/presentation/api/TaskOrganizationController.js` - Task organization API
- [ ] `backend/domain/entities/TaskOrganization.js` - Task organization entity
- [ ] `backend/domain/entities/TaskCategory.js` - Task category entity
- [ ] `backend/domain/entities/TaskDependency.js` - Task dependency entity
- [ ] `backend/infrastructure/database/TaskOrganizationRepository.js` - Task organization persistence
- [ ] `frontend/src/presentation/components/TaskOrganizationPanel.jsx` - Task organization UI
- [ ] `frontend/src/presentation/components/TaskCategoryView.jsx` - Task category display
- [ ] `frontend/src/application/services/TaskOrganizationService.jsx` - Frontend task service
- [ ] `tests/unit/TaskOrganizationService.test.js` - Task organization unit tests
- [ ] `tests/integration/TaskOrganizationWorkflow.test.js` - Task organization integration tests

#### Files to Delete:
- [ ] Old task processing logic that doesn't use organization system

## 4. Implementation Phases

#### Phase 1: Foundation Setup (Day 1-2)
- [ ] Create TaskOrganizationService with core organization logic
- [ ] Implement TaskCategorizer for automatic task categorization
- [ ] Set up TaskOrganization, TaskCategory, and TaskDependency entities
- [ ] Create basic task organization API endpoints
- [ ] Add CDP integration for task processing
- [ ] Integrate with existing Chat system and Framework processing

#### Phase 2: Core Implementation (Day 3-4)
- [ ] Implement TaskPrioritizer for intelligent task prioritization
- [ ] Add DependencyMapper for dependency analysis and graph creation
- [ ] Create ExecutionPlanner for optimal execution order
- [ ] Add real-time task status tracking
- [ ] Implement task organization UI components
- [ ] Add error handling and validation

#### Phase 3: Integration (Day 5)
- [ ] Integrate with existing CDP infrastructure
- [ ] Connect task organization with IDE automation
- [ ] Add frontend task organization controls
- [ ] Implement real-time task updates
- [ ] Test complete task organization workflow
- [ ] Add performance monitoring

#### Phase 4: Testing & Documentation (Day 6)
- [ ] Write comprehensive unit tests for all task organization services
- [ ] Create integration tests for task organization workflow
- [ ] Test categorization accuracy and prioritization quality
- [ ] Update API documentation
- [ ] Create user guide for task organization system
- [ ] Test with various project types and task complexities

#### Phase 5: Deployment & Validation (Day 7)
- [ ] Deploy to staging environment
- [ ] Test task organization in real IDE environment
- [ ] Validate categorization and prioritization accuracy
- [ ] Monitor task organization performance
- [ ] Deploy to production
- [ ] Monitor user feedback and system performance

## 5. Code Standards & Patterns
- **Coding Style**: ESLint with existing project rules, Prettier formatting
- **Naming Conventions**: camelCase for variables/functions, PascalCase for classes, kebab-case for files
- **Error Handling**: Try-catch with specific error types, proper error logging
- **Logging**: Winston logger with structured logging, different levels for task operations
- **Testing**: Jest framework, 90% coverage requirement
- **Documentation**: JSDoc for all public methods, README updates

## 6. Security Considerations
- [ ] Task input validation and sanitization
- [ ] User authentication and authorization for task organization
- [ ] CDP connection security and validation
- [ ] Task data privacy and protection
- [ ] Rate limiting for task organization requests
- [ ] Audit logging for task organization operations
- [ ] Protection against malicious task inputs

## 7. Performance Requirements
- **Task Processing Time**: <2 seconds for task organization
- **Categorization Accuracy**: >95% correct categorization
- **Prioritization Quality**: >90% optimal priority order
- **Dependency Detection**: >98% correct dependency recognition
- **Execution Efficiency**: >85% efficient execution order
- **CDP Response Time**: <500ms for task processing
- **Memory Usage**: <50MB for task organization processing

## 8. Testing Strategy

#### Unit Tests:
- [ ] Test file: `tests/unit/TaskOrganizationService.test.js`
- [ ] Test cases: Task categorization, prioritization, dependency mapping, execution planning
- [ ] Mock requirements: CDP, Framework processing, IDE integration

#### Integration Tests:
- [ ] Test file: `tests/integration/TaskOrganizationWorkflow.test.js`
- [ ] Test scenarios: Complete task organization workflows, CDP integration, framework processing
- [ ] Test data: Sample TODO lists, various project types, different task complexities

#### E2E Tests:
- [ ] Test file: `tests/e2e/TaskOrganizationWorkflow.test.js`
- [ ] User flows: Complete task organization from chat input to IDE execution
- [ ] Browser compatibility: Chrome (CDP compatibility)

## 9. Documentation Requirements

#### Code Documentation:
- [ ] JSDoc comments for TaskOrganizationService, TaskCategorizer, TaskPrioritizer
- [ ] API documentation for task organization endpoints
- [ ] CDP integration documentation
- [ ] Architecture diagrams for task organization flow

#### User Documentation:
- [ ] Task organization system usage guide
- [ ] Task categorization rules and examples
- [ ] Prioritization algorithm explanation
- [ ] Troubleshooting task organization issues

## 10. Deployment Checklist

#### Pre-deployment:
- [ ] All task organization tests passing
- [ ] Categorization accuracy testing
- [ ] CDP integration testing
- [ ] Documentation updated
- [ ] Environment variables configured

#### Deployment:
- [ ] Database migrations for task organization tables
- [ ] CDP server configuration
- [ ] Task organization service startup
- [ ] Health checks for task organization endpoints
- [ ] Monitoring setup for task organization operations

#### Post-deployment:
- [ ] Monitor task organization accuracy
- [ ] Verify categorization and prioritization quality
- [ ] Check CDP performance and reliability
- [ ] User feedback collection

## 11. Rollback Plan
- [ ] Database rollback for task organization tables
- [ ] Service rollback to previous task processing implementation
- [ ] CDP configuration rollback
- [ ] Communication plan for users

## 12. Success Criteria
- [ ] Task categorization works with >95% accuracy
- [ ] Task prioritization creates optimal execution order
- [ ] Dependency mapping correctly identifies task relationships
- [ ] CDP integration works seamlessly with IDE
- [ ] Performance requirements are met
- [ ] Security requirements satisfied
- [ ] Documentation complete and accurate

## 13. Risk Assessment

#### High Risk:
- [ ] CDP connection failures - Mitigation: Robust error handling and fallback mechanisms
- [ ] Task categorization accuracy issues - Mitigation: Extensive testing and ML-based improvements
- [ ] IDE integration problems - Mitigation: Comprehensive CDP testing and validation

#### Medium Risk:
- [ ] Performance issues with large task lists - Mitigation: Optimization and pagination
- [ ] Framework processing delays - Mitigation: Caching and async processing
- [ ] User adoption challenges - Mitigation: Intuitive UI and comprehensive documentation

#### Low Risk:
- [ ] UI responsiveness issues - Mitigation: Async processing and loading states
- [ ] Documentation gaps - Mitigation: Comprehensive review process

## 14. References & Resources
- **Technical Documentation**: Chrome DevTools Protocol documentation, Playwright CDP docs
- **API References**: CDP API, Task organization patterns
- **Design Patterns**: Command pattern, Strategy pattern for categorization
- **Best Practices**: Task management best practices, IDE automation guidelines
- **Similar Implementations**: Existing IDE integration in project

## 15. Implementation Details

#### Task Organization Service Architecture:
```javascript
class TaskOrganizationService {
  constructor(taskCategorizer, taskPrioritizer, dependencyMapper, executionPlanner) {
    this.taskCategorizer = taskCategorizer;
    this.taskPrioritizer = taskPrioritizer;
    this.dependencyMapper = dependencyMapper;
    this.executionPlanner = executionPlanner;
  }
  
  async organizeTasks(rawTasks, projectContext, frameworkRules) {
    try {
      // Step 1: Categorize tasks
      const categorizedTasks = await this.taskCategorizer.categorize(rawTasks, projectContext);
      
      // Step 2: Map dependencies
      const dependencyGraph = await this.dependencyMapper.mapDependencies(categorizedTasks, projectContext);
      
      // Step 3: Prioritize tasks
      const prioritizedTasks = await this.taskPrioritizer.prioritize(categorizedTasks, dependencyGraph, frameworkRules);
      
      // Step 4: Plan execution order
      const executionPlan = await this.executionPlanner.createExecutionPlan(prioritizedTasks, dependencyGraph);
      
      return {
        success: true,
        categorizedTasks,
        dependencyGraph,
        prioritizedTasks,
        executionPlan,
        metrics: {
          totalTasks: rawTasks.length,
          categories: Object.keys(categorizedTasks).length,
          dependencies: dependencyGraph.edges.length,
          estimatedTime: executionPlan.estimatedTime
        }
      };
      
    } catch (error) {
      console.error('Task organization error:', error);
      throw new TaskOrganizationError('Failed to organize tasks', error);
    }
  }
  
  async processChatInput(chatInput, todoFile, frameworkMd) {
    // Extract tasks from chat input
    const rawTasks = this.extractTasksFromChat(chatInput);
    
    // Get project context via CDP
    const projectContext = await this.getProjectContext();
    
    // Process with framework rules
    const frameworkRules = this.parseFrameworkRules(frameworkMd);
    
    // Organize tasks
    return await this.organizeTasks(rawTasks, projectContext, frameworkRules);
  }
}
```

#### Task Categorizer:
```javascript
class TaskCategorizer {
  constructor() {
    this.categories = {
      UI: ['button', 'text', 'form', 'layout', 'style', 'css', 'component'],
      Backend: ['api', 'server', 'endpoint', 'controller', 'service', 'business logic'],
      Database: ['schema', 'model', 'query', 'migration', 'database', 'table'],
      Testing: ['test', 'unit', 'integration', 'e2e', 'spec', 'jest'],
      Deployment: ['build', 'deploy', 'config', 'docker', 'ci/cd'],
      Documentation: ['doc', 'readme', 'comment', 'guide', 'manual']
    };
    
    this.patterns = {
      UI: /(button|text|form|layout|style|css|component|color|size|position)/i,
      Backend: /(api|server|endpoint|controller|service|business logic|route|handler)/i,
      Database: /(schema|model|query|migration|database|table|column|index)/i,
      Testing: /(test|unit|integration|e2e|spec|jest|mocha|cypress)/i,
      Deployment: /(build|deploy|config|docker|ci\/cd|pipeline|environment)/i,
      Documentation: /(doc|readme|comment|guide|manual|tutorial)/i
    };
  }
  
  async categorize(tasks, projectContext) {
    const categorized = {};
    
    for (const task of tasks) {
      const category = this.determineCategory(task, projectContext);
      
      if (!categorized[category]) {
        categorized[category] = [];
      }
      
      categorized[category].push({
        id: task.id,
        description: task.description,
        priority: task.priority,
        estimatedTime: task.estimatedTime,
        dependencies: task.dependencies
      });
    }
    
    return categorized;
  }
  
  determineCategory(task, projectContext) {
    const description = task.description.toLowerCase();
    
    // Check against patterns
    for (const [category, pattern] of Object.entries(this.patterns)) {
      if (pattern.test(description)) {
        return category;
      }
    }
    
    // Check against keywords
    for (const [category, keywords] of Object.entries(this.categories)) {
      for (const keyword of keywords) {
        if (description.includes(keyword)) {
          return category;
        }
      }
    }
    
    // Default category based on project context
    return this.getDefaultCategory(projectContext);
  }
  
  getDefaultCategory(projectContext) {
    // Analyze project structure to determine default category
    if (projectContext.hasFrontend && projectContext.hasBackend) {
      return 'UI'; // Default to UI for mixed projects
    } else if (projectContext.hasBackend) {
      return 'Backend';
    } else {
      return 'UI';
    }
  }
}
```

#### Task Prioritizer:
```javascript
class TaskPrioritizer {
  constructor() {
    this.priorityFactors = {
      dependency: 0.4,
      businessValue: 0.3,
      complexity: 0.2,
      risk: 0.1
    };
  }
  
  async prioritize(categorizedTasks, dependencyGraph, frameworkRules) {
    const prioritized = [];
    
    for (const [category, tasks] of Object.entries(categorizedTasks)) {
      for (const task of tasks) {
        const priority = await this.calculatePriority(task, dependencyGraph, frameworkRules);
        prioritized.push({
          ...task,
          category,
          calculatedPriority: priority
        });
      }
    }
    
    // Sort by calculated priority (highest first)
    return prioritized.sort((a, b) => b.calculatedPriority - a.calculatedPriority);
  }
  
  async calculatePriority(task, dependencyGraph, frameworkRules) {
    let priority = 0;
    
    // Dependency factor
    const dependencyScore = this.calculateDependencyScore(task, dependencyGraph);
    priority += dependencyScore * this.priorityFactors.dependency;
    
    // Business value factor
    const businessValueScore = this.calculateBusinessValueScore(task, frameworkRules);
    priority += businessValueScore * this.priorityFactors.businessValue;
    
    // Complexity factor (inverse - simpler tasks get higher priority)
    const complexityScore = this.calculateComplexityScore(task);
    priority += complexityScore * this.priorityFactors.complexity;
    
    // Risk factor (inverse - lower risk gets higher priority)
    const riskScore = this.calculateRiskScore(task);
    priority += riskScore * this.priorityFactors.risk;
    
    return priority;
  }
  
  calculateDependencyScore(task, dependencyGraph) {
    const dependencies = dependencyGraph.getDependencies(task.id);
    const dependents = dependencyGraph.getDependents(task.id);
    
    // Higher score for tasks with many dependents and few dependencies
    return (dependents.length * 0.7) + ((10 - dependencies.length) * 0.3);
  }
  
  calculateBusinessValueScore(task, frameworkRules) {
    // Analyze task description against business value keywords
    const businessKeywords = ['user', 'customer', 'revenue', 'feature', 'core', 'critical'];
    const description = task.description.toLowerCase();
    
    let score = 0;
    for (const keyword of businessKeywords) {
      if (description.includes(keyword)) {
        score += 1;
      }
    }
    
    return Math.min(score / businessKeywords.length, 1);
  }
  
  calculateComplexityScore(task) {
    // Simpler tasks get higher scores
    const complexityKeywords = ['simple', 'easy', 'basic', 'quick'];
    const complexKeywords = ['complex', 'difficult', 'advanced', 'sophisticated'];
    
    const description = task.description.toLowerCase();
    
    let score = 0.5; // Default medium complexity
    
    for (const keyword of complexityKeywords) {
      if (description.includes(keyword)) {
        score += 0.1;
      }
    }
    
    for (const keyword of complexKeywords) {
      if (description.includes(keyword)) {
        score -= 0.1;
      }
    }
    
    return Math.max(0, Math.min(1, score));
  }
  
  calculateRiskScore(task) {
    // Lower risk tasks get higher scores
    const riskKeywords = ['safe', 'simple', 'tested', 'proven'];
    const highRiskKeywords = ['experimental', 'untested', 'complex', 'critical'];
    
    const description = task.description.toLowerCase();
    
    let score = 0.5; // Default medium risk
    
    for (const keyword of riskKeywords) {
      if (description.includes(keyword)) {
        score += 0.1;
      }
    }
    
    for (const keyword of highRiskKeywords) {
      if (description.includes(keyword)) {
        score -= 0.1;
      }
    }
    
    return Math.max(0, Math.min(1, score));
  }
}
```

#### Dependency Mapper:
```javascript
class DependencyMapper {
  constructor() {
    this.dependencyPatterns = {
      databaseFirst: /(database|schema|model)/i,
      apiBeforeUI: /(api|endpoint|controller)/i,
      testAfterImplementation: /(test|spec|jest)/i
    };
  }
  
  async mapDependencies(categorizedTasks, projectContext) {
    const graph = new DependencyGraph();
    
    // Add all tasks to graph
    for (const [category, tasks] of Object.entries(categorizedTasks)) {
      for (const task of tasks) {
        graph.addNode(task.id, task);
      }
    }
    
    // Analyze dependencies between tasks
    for (const [category, tasks] of Object.entries(categorizedTasks)) {
      for (const task of tasks) {
        const dependencies = await this.findDependencies(task, categorizedTasks, projectContext);
        
        for (const dependency of dependencies) {
          graph.addEdge(dependency, task.id);
        }
      }
    }
    
    return graph;
  }
  
  async findDependencies(task, categorizedTasks, projectContext) {
    const dependencies = [];
    const description = task.description.toLowerCase();
    
    // Database dependencies
    if (this.dependencyPatterns.databaseFirst.test(description)) {
      const databaseTasks = categorizedTasks.Database || [];
      for (const dbTask of databaseTasks) {
        if (this.isRelated(task, dbTask)) {
          dependencies.push(dbTask.id);
        }
      }
    }
    
    // API dependencies
    if (this.dependencyPatterns.apiBeforeUI.test(description)) {
      const apiTasks = categorizedTasks.Backend || [];
      for (const apiTask of apiTasks) {
        if (this.isRelated(task, apiTask)) {
          dependencies.push(apiTask.id);
        }
      }
    }
    
    // Cross-category dependencies
    dependencies.push(...this.findCrossCategoryDependencies(task, categorizedTasks));
    
    return dependencies;
  }
  
  isRelated(task1, task2) {
    // Check if tasks are related based on common keywords
    const keywords1 = this.extractKeywords(task1.description);
    const keywords2 = this.extractKeywords(task2.description);
    
    const commonKeywords = keywords1.filter(keyword => keywords2.includes(keyword));
    return commonKeywords.length > 0;
  }
  
  extractKeywords(description) {
    // Extract meaningful keywords from task description
    const words = description.toLowerCase().split(/\s+/);
    return words.filter(word => word.length > 3 && !this.isStopWord(word));
  }
  
  isStopWord(word) {
    const stopWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    return stopWords.includes(word);
  }
  
  findCrossCategoryDependencies(task, categorizedTasks) {
    const dependencies = [];
    
    // UI tasks often depend on Backend tasks
    if (task.category === 'UI') {
      const backendTasks = categorizedTasks.Backend || [];
      for (const backendTask of backendTasks) {
        if (this.isRelated(task, backendTask)) {
          dependencies.push(backendTask.id);
        }
      }
    }
    
    // Testing tasks depend on implementation tasks
    if (task.category === 'Testing') {
      const implementationTasks = [
        ...(categorizedTasks.UI || []),
        ...(categorizedTasks.Backend || []),
        ...(categorizedTasks.Database || [])
      ];
      
      for (const implTask of implementationTasks) {
        if (this.isRelated(task, implTask)) {
          dependencies.push(implTask.id);
        }
      }
    }
    
    return dependencies;
  }
}

class DependencyGraph {
  constructor() {
    this.nodes = new Map();
    this.edges = new Map();
  }
  
  addNode(id, data) {
    this.nodes.set(id, data);
    this.edges.set(id, []);
  }
  
  addEdge(from, to) {
    if (!this.edges.has(from)) {
      this.edges.set(from, []);
    }
    this.edges.get(from).push(to);
  }
  
  getDependencies(nodeId) {
    return this.edges.get(nodeId) || [];
  }
  
  getDependents(nodeId) {
    const dependents = [];
    for (const [from, toList] of this.edges.entries()) {
      if (toList.includes(nodeId)) {
        dependents.push(from);
      }
    }
    return dependents;
  }
  
  hasCycles() {
    const visited = new Set();
    const recursionStack = new Set();
    
    for (const nodeId of this.nodes.keys()) {
      if (this.hasCycleUtil(nodeId, visited, recursionStack)) {
        return true;
      }
    }
    
    return false;
  }
  
  hasCycleUtil(nodeId, visited, recursionStack) {
    if (recursionStack.has(nodeId)) {
      return true;
    }
    
    if (visited.has(nodeId)) {
      return false;
    }
    
    visited.add(nodeId);
    recursionStack.add(nodeId);
    
    const dependencies = this.getDependencies(nodeId);
    for (const dependency of dependencies) {
      if (this.hasCycleUtil(dependency, visited, recursionStack)) {
        return true;
      }
    }
    
    recursionStack.delete(nodeId);
    return false;
  }
}
```

#### Execution Planner:
```javascript
class ExecutionPlanner {
  constructor() {
    this.parallelThreshold = 3; // Maximum parallel tasks
    this.timeEstimateMultiplier = 1.2; // Buffer for time estimates
  }
  
  async createExecutionPlan(prioritizedTasks, dependencyGraph) {
    const plan = {
      phases: [],
      estimatedTime: 0,
      parallelGroups: [],
      criticalPath: []
    };
    
    // Create execution phases based on dependencies
    const phases = this.createPhases(prioritizedTasks, dependencyGraph);
    
    // Optimize parallel execution
    const optimizedPhases = this.optimizeParallelExecution(phases);
    
    // Calculate time estimates
    const timeEstimates = this.calculateTimeEstimates(optimizedPhases);
    
    // Identify critical path
    const criticalPath = this.findCriticalPath(optimizedPhases, dependencyGraph);
    
    return {
      phases: optimizedPhases,
      estimatedTime: timeEstimates.total,
      parallelGroups: timeEstimates.parallelGroups,
      criticalPath: criticalPath,
      metrics: {
        totalTasks: prioritizedTasks.length,
        totalPhases: optimizedPhases.length,
        maxParallelTasks: Math.max(...timeEstimates.parallelGroups.map(g => g.length)),
        efficiency: this.calculateEfficiency(optimizedPhases, timeEstimates)
      }
    };
  }
  
  createPhases(prioritizedTasks, dependencyGraph) {
    const phases = [];
    const completed = new Set();
    
    while (completed.size < prioritizedTasks.length) {
      const currentPhase = [];
      
      for (const task of prioritizedTasks) {
        if (completed.has(task.id)) continue;
        
        const dependencies = dependencyGraph.getDependencies(task.id);
        const allDependenciesCompleted = dependencies.every(dep => completed.has(dep));
        
        if (allDependenciesCompleted) {
          currentPhase.push(task);
        }
      }
      
      if (currentPhase.length === 0) {
        // Handle circular dependencies
        const remainingTasks = prioritizedTasks.filter(task => !completed.has(task.id));
        currentPhase.push(...remainingTasks.slice(0, this.parallelThreshold));
      }
      
      phases.push(currentPhase);
      
      for (const task of currentPhase) {
        completed.add(task.id);
      }
    }
    
    return phases;
  }
  
  optimizeParallelExecution(phases) {
    const optimized = [];
    
    for (const phase of phases) {
      if (phase.length <= this.parallelThreshold) {
        optimized.push(phase);
      } else {
        // Split large phases into parallel groups
        const groups = this.splitIntoParallelGroups(phase);
        optimized.push(...groups);
      }
    }
    
    return optimized;
  }
  
  splitIntoParallelGroups(tasks) {
    const groups = [];
    const sortedTasks = tasks.sort((a, b) => b.calculatedPriority - a.calculatedPriority);
    
    for (let i = 0; i < sortedTasks.length; i += this.parallelThreshold) {
      groups.push(sortedTasks.slice(i, i + this.parallelThreshold));
    }
    
    return groups;
  }
  
  calculateTimeEstimates(phases) {
    let totalTime = 0;
    const parallelGroups = [];
    
    for (const phase of phases) {
      const phaseTime = Math.max(...phase.map(task => task.estimatedTime || 1));
      totalTime += phaseTime * this.timeEstimateMultiplier;
      
      parallelGroups.push({
        tasks: phase.map(task => task.id),
        estimatedTime: phaseTime,
        parallelCount: phase.length
      });
    }
    
    return {
      total: totalTime,
      parallelGroups: parallelGroups
    };
  }
  
  findCriticalPath(phases, dependencyGraph) {
    const criticalPath = [];
    
    for (const phase of phases) {
      if (phase.length === 1) {
        criticalPath.push(phase[0].id);
      } else {
        // Find the task with highest priority in parallel group
        const highestPriorityTask = phase.reduce((max, task) => 
          task.calculatedPriority > max.calculatedPriority ? task : max
        );
        criticalPath.push(highestPriorityTask.id);
      }
    }
    
    return criticalPath;
  }
  
  calculateEfficiency(phases, timeEstimates) {
    const totalTasks = phases.reduce((sum, phase) => sum + phase.length, 0);
    const totalTime = timeEstimates.total;
    const averageTimePerTask = totalTime / totalTasks;
    
    // Efficiency based on parallel execution and time optimization
    const parallelEfficiency = timeEstimates.parallelGroups.reduce((sum, group) => 
      sum + (group.parallelCount / this.parallelThreshold), 0
    ) / timeEstimates.parallelGroups.length;
    
    return {
      parallelEfficiency: parallelEfficiency,
      averageTimePerTask: averageTimePerTask,
      overallEfficiency: parallelEfficiency * (1 / averageTimePerTask)
    };
  }
}
```

## 16. Usage Examples

#### Basic Task Organization:
```javascript
// Initialize task organization service
const taskOrgService = new TaskOrganizationService(
  new TaskCategorizer(),
  new TaskPrioritizer(),
  new DependencyMapper(),
  new ExecutionPlanner()
);

// Organize tasks from chat input
const result = await taskOrgService.processChatInput(
  "TODO: Button rot machen, API-Endpoint erstellen, Database-Schema erstellen",
  true, // TODO file checkbox
  "doc-general.md" // Framework MD
);

console.log('Organized tasks:', result);
```

#### CDP Integration:
```javascript
// Get project context via CDP
async function getProjectContext() {
  const browserManager = new BrowserManager();
  const context = await browserManager.getProjectContext();
  
  return {
    hasFrontend: context.hasFrontendFiles,
    hasBackend: context.hasBackendFiles,
    hasDatabase: context.hasDatabaseFiles,
    projectType: context.projectType,
    framework: context.framework
  };
}

// Process tasks with CDP
const projectContext = await getProjectContext();
const organizedTasks = await taskOrgService.organizeTasks(
  rawTasks,
  projectContext,
  frameworkRules
);
```

#### Task Execution Planning:
```javascript
// Get execution plan
const executionPlan = organizedTasks.executionPlan;

console.log('Execution phases:');
executionPlan.phases.forEach((phase, index) => {
  console.log(`Phase ${index + 1}:`, phase.map(task => task.description));
});

console.log('Estimated time:', executionPlan.estimatedTime, 'hours');
console.log('Critical path:', executionPlan.criticalPath);
```

This comprehensive plan provides all necessary details for implementing a sophisticated IDE-based task organization system with automatic categorization, prioritization, dependency mapping, and optimal execution planning.
