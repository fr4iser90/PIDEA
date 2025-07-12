# JSON-Based Framework System – Phase 2: Integration & APIs

## Overview
Create API endpoints and integration layer for the JSON-based framework system, enabling framework execution and content-library access.

## Objectives
- [ ] Implement Content-Library API endpoints
- [ ] Implement Framework API endpoints
- [ ] Create framework execution integration
- [ ] Add comprehensive testing and validation
- [ ] Integrate with existing application layer

## Deliverables

### API Endpoints
- File: `backend/presentation/api/ContentLibraryController.js` - Content-Library API for prompt access
- File: `backend/presentation/api/FrameworkController.js` - Framework API for execution
- File: `backend/presentation/api/routes/content-library.js` - Content-Library routes
- File: `backend/presentation/api/routes/frameworks.js` - Framework routes

### Integration Layer
- File: `backend/application/commands/ExecuteFrameworkCommand.js` - Framework execution command
- File: `backend/application/handlers/ExecuteFrameworkHandler.js` - Framework execution handler
- File: `backend/application/queries/GetFrameworkInfoQuery.js` - Framework information query

### Testing & Validation
- File: `tests/unit/presentation/api/ContentLibraryController.test.js` - Content-Library API tests
- File: `tests/unit/presentation/api/FrameworkController.test.js` - Framework API tests
- File: `tests/integration/domain/framework-integration.test.js` - Framework integration tests
- File: `tests/e2e/framework-execution.test.js` - End-to-end framework execution tests

## Dependencies
- Requires: Phase 1 completion (Core Framework System) - SEQUENTIAL
- Blocks: None (final phase)
- Execution: SEQUENTIAL - final phase, depends on Phase 1

## Estimated Time
3 hours

## Technical Approach

### Content-Library API Controller
```javascript
/**
 * ContentLibraryController - API for content-library access
 * Provides endpoints for accessing prompts and framework information
 */
class ContentLibraryController {
  constructor(dependencies = {}) {
    this.promptService = dependencies.promptService || new PromptService();
    this.logger = dependencies.logger || console;
  }

  /**
   * GET /api/content-library/prompts/:path
   * Get prompt content by path
   */
  async getPrompt(req, res) {
    try {
      const { path } = req.params;
      const prompt = await this.promptService.get(path);
      
      res.json({
        success: true,
        data: {
          path,
          content: prompt,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      this.logger.error('ContentLibraryController: Failed to get prompt', {
        path: req.params.path,
        error: error.message
      });
      
      res.status(404).json({
        success: false,
        error: 'Prompt not found',
        message: error.message
      });
    }
  }

  /**
   * GET /api/content-library/frameworks
   * List all available frameworks
   */
  async listFrameworks(req, res) {
    try {
      const frameworks = await this.promptService.listFrameworks();
      
      res.json({
        success: true,
        data: {
          frameworks,
          count: frameworks.length,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      this.logger.error('ContentLibraryController: Failed to list frameworks', {
        error: error.message
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to list frameworks',
        message: error.message
      });
    }
  }

  /**
   * GET /api/content-library/frameworks/:name
   * Get framework information
   */
  async getFramework(req, res) {
    try {
      const { name } = req.params;
      const framework = await this.promptService.getFrameworkInfo(name);
      
      res.json({
        success: true,
        data: {
          framework,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      this.logger.error('ContentLibraryController: Failed to get framework', {
        name: req.params.name,
        error: error.message
      });
      
      res.status(404).json({
        success: false,
        error: 'Framework not found',
        message: error.message
      });
    }
  }
}
```

### Framework API Controller
```javascript
/**
 * FrameworkController - API for framework execution
 * Provides endpoints for executing frameworks and workflows
 */
class FrameworkController {
  constructor(dependencies = {}) {
    this.frameworkRegistry = dependencies.frameworkRegistry || new FrameworkRegistry();
    this.logger = dependencies.logger || console;
  }

  /**
   * POST /api/frameworks/:name/execute
   * Execute a framework workflow
   */
  async executeFramework(req, res) {
    try {
      const { name } = req.params;
      const { workflow, context } = req.body;

      this.logger.info('FrameworkController: Executing framework', {
        framework: name,
        workflow,
        context: context ? Object.keys(context) : []
      });

      const result = await this.frameworkRegistry.executeFramework(name, workflow, context);
      
      res.json({
        success: true,
        data: {
          framework: name,
          workflow,
          result,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      this.logger.error('FrameworkController: Framework execution failed', {
        framework: req.params.name,
        workflow: req.body.workflow,
        error: error.message
      });
      
      res.status(500).json({
        success: false,
        error: 'Framework execution failed',
        message: error.message
      });
    }
  }

  /**
   * GET /api/frameworks
   * List all registered frameworks
   */
  async listFrameworks(req, res) {
    try {
      const frameworks = Array.from(this.frameworkRegistry.frameworks.keys());
      
      res.json({
        success: true,
        data: {
          frameworks,
          count: frameworks.length,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      this.logger.error('FrameworkController: Failed to list frameworks', {
        error: error.message
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to list frameworks',
        message: error.message
      });
    }
  }

  /**
   * GET /api/frameworks/:name
   * Get framework information and available workflows
   */
  async getFramework(req, res) {
    try {
      const { name } = req.params;
      const framework = this.frameworkRegistry.frameworks.get(name);
      
      if (!framework) {
        return res.status(404).json({
          success: false,
          error: 'Framework not found'
        });
      }

      const workflows = framework.getWorkflows();
      const prompts = framework.getPrompts();
      
      res.json({
        success: true,
        data: {
          name,
          workflows,
          prompts,
          config: framework.config,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      this.logger.error('FrameworkController: Failed to get framework', {
        name: req.params.name,
        error: error.message
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to get framework',
        message: error.message
      });
    }
  }
}
```

### Framework Execution Command
```javascript
/**
 * ExecuteFrameworkCommand - Command for framework execution
 * Integrates with existing command pattern
 */
class ExecuteFrameworkCommand {
  constructor(frameworkName, workflowName, context, options = {}) {
    this.frameworkName = frameworkName;
    this.workflowName = workflowName;
    this.context = context;
    this.options = {
      timeout: 300000, // 5 minutes
      retries: 3,
      ...options
    };
  }

  getType() {
    return 'framework_execution';
  }

  getMetadata() {
    return {
      framework: this.frameworkName,
      workflow: this.workflowName,
      context: Object.keys(this.context),
      options: this.options
    };
  }
}
```

### Framework Execution Handler
```javascript
/**
 * ExecuteFrameworkHandler - Handler for framework execution
 * Integrates with existing handler pattern
 */
class ExecuteFrameworkHandler {
  constructor(dependencies = {}) {
    this.frameworkRegistry = dependencies.frameworkRegistry || new FrameworkRegistry();
    this.logger = dependencies.logger || console;
  }

  async handle(command) {
    try {
      this.logger.info('ExecuteFrameworkHandler: Starting framework execution', {
        framework: command.frameworkName,
        workflow: command.workflowName
      });

      const result = await this.frameworkRegistry.executeFramework(
        command.frameworkName,
        command.workflowName,
        command.context
      );

      this.logger.info('ExecuteFrameworkHandler: Framework execution completed', {
        framework: command.frameworkName,
        workflow: command.workflowName,
        success: result.success
      });

      return {
        success: true,
        result,
        metadata: {
          framework: command.frameworkName,
          workflow: command.workflowName,
          executionTime: Date.now()
        }
      };
    } catch (error) {
      this.logger.error('ExecuteFrameworkHandler: Framework execution failed', {
        framework: command.frameworkName,
        workflow: command.workflowName,
        error: error.message
      });

      throw error;
    }
  }
}
```

### API Routes
```javascript
// backend/presentation/api/routes/content-library.js
const express = require('express');
const ContentLibraryController = require('../ContentLibraryController');

const router = express.Router();
const controller = new ContentLibraryController();

router.get('/prompts/:path(*)', (req, res) => controller.getPrompt(req, res));
router.get('/frameworks', (req, res) => controller.listFrameworks(req, res));
router.get('/frameworks/:name', (req, res) => controller.getFramework(req, res));

module.exports = router;

// backend/presentation/api/routes/frameworks.js
const express = require('express');
const FrameworkController = require('../FrameworkController');

const router = express.Router();
const controller = new FrameworkController();

router.post('/:name/execute', (req, res) => controller.executeFramework(req, res));
router.get('/', (req, res) => controller.listFrameworks(req, res));
router.get('/:name', (req, res) => controller.getFramework(req, res));

module.exports = router;
```

## Success Criteria
- [ ] ContentLibraryController.js implemented with API endpoints
- [ ] FrameworkController.js implemented with execution endpoints
- [ ] Integration with existing WorkflowOrchestrationService working
- [ ] All API endpoints tested and functional
- [ ] Framework execution commands and handlers working
- [ ] Content-Library API accessible and functional
- [ ] Framework API accessible and functional
- [ ] All tests passing
- [ ] Error handling and logging implemented
- [ ] API documentation complete

## Risk Mitigation
- **API Integration**: Comprehensive error handling and validation
- **Framework Execution**: Timeout and retry mechanisms
- **Content-Library Access**: Caching and fallback strategies
- **Testing**: Full test coverage for all endpoints

## Completion
This completes the JSON-based framework system with full API integration and content-library access! 🚀 