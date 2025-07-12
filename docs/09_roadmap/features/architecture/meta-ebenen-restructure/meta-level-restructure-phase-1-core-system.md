# JSON-Based Framework System – Phase 1: Core Framework System

## Overview
Create the core JSON-based framework system that integrates with existing content-library prompts and workflow infrastructure.

## Objectives
- [ ] Create framework registry and builder infrastructure
- [ ] Implement base framework class with JSON configuration support
- [ ] Create prompt service for content-library integration
- [ ] Create JSON configuration files for existing frameworks
- [ ] Establish integration patterns with existing workflow infrastructure

## Deliverables

### Core Infrastructure Files
- File: `backend/domain/frameworks/FrameworkRegistry.js` - Framework management and registration
- File: `backend/domain/frameworks/Framework.js` - Base framework class with JSON config support
- File: `backend/domain/frameworks/FrameworkBuilder.js` - Framework builder with fluent interface
- File: `backend/domain/frameworks/index.js` - Main exports and integration
- File: `backend/domain/frameworks/README.md` - Architecture documentation

### Content-Library Integration
- File: `backend/infrastructure/external/PromptService.js` - API integration for content-library prompts
- File: `backend/domain/frameworks/configs/documentation-framework.json` - Documentation framework config
- File: `backend/domain/frameworks/configs/ai-framework.json` - AI framework config
- File: `backend/domain/frameworks/configs/react-framework.json` - React framework config
- File: `backend/domain/frameworks/configs/vue-framework.json` - Vue framework config
- File: `backend/domain/frameworks/configs/ios-framework.json` - iOS framework config
- File: `backend/domain/frameworks/configs/android-framework.json` - Android framework config

### Integration Layer
- Integration: Framework registry with existing `WorkflowOrchestrationService.js`
- Integration: Framework builder with existing `WorkflowBuilder.js`
- Integration: Prompt service with content-library API

## Dependencies
- Requires: Existing content-library frameworks (completed)
- Requires: Existing workflow infrastructure (completed)
- Blocks: Phase 2 start (Integration & APIs)
- Execution: SEQUENTIAL - must complete before Phase 2

## Estimated Time
3 hours

## Technical Approach

### Framework Registry Design
```javascript
/**
 * FrameworkRegistry - Framework management and registration
 * Integrates with existing workflow infrastructure
 */
class FrameworkRegistry {
  constructor(dependencies = {}) {
    this.frameworks = new Map();
    this.promptService = dependencies.promptService || new PromptService();
    this.workflowService = dependencies.workflowService || new WorkflowOrchestrationService();
    this.logger = dependencies.logger || console;
  }

  async registerFramework(configPath) {
    // Load JSON configuration
    const config = await this.loadFrameworkConfig(configPath);
    
    // Build framework with existing workflow integration
    const framework = new FrameworkBuilder()
      .setConfig(config)
      .setPromptService(this.promptService)
      .setWorkflowService(this.workflowService)
      .build();
    
    this.frameworks.set(config.name, framework);
  }

  async executeFramework(frameworkName, workflowName, context) {
    const framework = this.frameworks.get(frameworkName);
    if (!framework) {
      throw new Error(`Framework not found: ${frameworkName}`);
    }
    
    return await framework.executeWorkflow(workflowName, context);
  }
}
```

### Base Framework Class
```javascript
/**
 * Framework - Base framework class with JSON configuration
 * Uses existing workflow infrastructure and content-library prompts
 */
class Framework {
  constructor(config, promptService, workflowService) {
    this.config = config;
    this.promptService = promptService;
    this.workflowService = workflowService;
    this.logger = console;
  }

  async executeWorkflow(workflowName, context) {
    const workflowConfig = this.config.workflows[workflowName];
    if (!workflowConfig) {
      throw new Error(`Workflow not found: ${workflowName}`);
    }

    this.logger.info('Framework: Executing workflow', {
      framework: this.config.name,
      workflow: workflowName
    });

    // Use existing WorkflowBuilder
    const workflow = new WorkflowBuilder()
      .setMetadata({
        name: `${this.config.name}-${workflowName}`,
        framework: this.config.name,
        version: this.config.version
      });

    // Load prompts from content-library and add steps
    for (const stepConfig of workflowConfig.steps) {
      const prompt = await this.promptService.get(stepConfig.prompt);
      workflow.addStep(
        WorkflowStepBuilder[stepConfig.type]({
          prompt,
          context: stepConfig.context,
          metadata: stepConfig.metadata || {}
        }).build()
      );
    }

    // Use existing WorkflowOrchestrationService
    return await this.workflowService.executeWorkflow(workflow.build());
  }

  getWorkflows() {
    return Object.keys(this.config.workflows);
  }

  getPrompts() {
    return this.config.prompts || {};
  }
}
```

### Prompt Service Integration
```javascript
/**
 * PromptService - Content-Library API integration
 * Loads prompts from existing content-library frameworks
 */
class PromptService {
  constructor(basePath = '/content-library') {
    this.basePath = basePath;
    this.cache = new Map();
    this.cacheTTL = 3600000; // 1 hour
  }

  async get(promptPath) {
    // Check cache first
    const cached = this.cache.get(promptPath);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.content;
    }

    // Load from content-library API
    const response = await fetch(`${this.basePath}/${promptPath}`);
    if (!response.ok) {
      throw new Error(`Failed to load prompt: ${promptPath}`);
    }

    const content = await response.text();
    
    // Cache the result
    this.cache.set(promptPath, {
      content,
      timestamp: Date.now()
    });

    return content;
  }

  async listFrameworks() {
    const response = await fetch(`${this.basePath}/frameworks`);
    return await response.json();
  }

  clearCache() {
    this.cache.clear();
  }
}
```

### JSON Configuration Example
```json
{
  "name": "DocumentationFramework",
  "version": "1.0.0",
  "description": "Documentation analysis and creation framework",
  "workflows": {
    "analyze": {
      "steps": [
        {
          "type": "analysis",
          "prompt": "documentation-framework/doc-analyze.md",
          "context": ["projectPath", "options"],
          "metadata": {
            "timeout": 300000,
            "retries": 3
          }
        }
      ]
    },
    "execute": {
      "steps": [
        {
          "type": "execution", 
          "prompt": "documentation-framework/doc-execute.md",
          "context": ["analysis", "task"],
          "metadata": {
            "timeout": 600000,
            "retries": 2
          }
        }
      ]
    }
  },
  "prompts": {
    "analyze": "documentation-framework/doc-analyze.md",
    "execute": "documentation-framework/doc-execute.md"
  }
}
```

## Success Criteria
- [ ] FrameworkRegistry.js implemented with JSON config support
- [ ] Framework.js implemented with workflow integration
- [ ] PromptService.js implemented with content-library integration
- [ ] All JSON configuration files created and validated
- [ ] Integration with existing WorkflowOrchestrationService working
- [ ] Framework exports properly configured
- [ ] Documentation complete and accurate
- [ ] All existing content-library prompts accessible
- [ ] All tests passing

## Risk Mitigation
- **Content-Library Integration**: API-based approach with caching
- **JSON Configuration**: Schema validation and error handling
- **Workflow Integration**: Use existing WorkflowBuilder patterns
- **Performance**: Prompt caching and lazy loading

## Next Phase
Phase 2: Integration & APIs 