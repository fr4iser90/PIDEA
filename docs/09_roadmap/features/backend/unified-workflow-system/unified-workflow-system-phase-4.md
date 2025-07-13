# Unified Workflow System – Phase 4: Testing & Documentation

## Overview
Create comprehensive tests and documentation for the unified workflow system, including unit tests, integration tests, and user documentation.

## Objectives
- [ ] Write comprehensive database integration tests
- [ ] Write integration tests with real database
- [ ] Create database usage documentation
- [ ] Create database examples and tutorials

## Deliverables
- File: `tests/unit/UnifiedWorkflowOrchestrator.test.js` - Unit tests for orchestrator
- File: `tests/unit/UnifiedWorkflowService.test.js` - Unit tests for service
- File: `tests/integration/UnifiedWorkflowSystem.test.js` - Integration tests
- File: `tests/e2e/UnifiedWorkflowAPI.test.js` - E2E API tests
- File: `docs/unified-workflow-system/README.md` - System documentation
- File: `docs/unified-workflow-system/usage-guide.md` - Usage guide
- File: `docs/unified-workflow-system/examples.md` - Examples and tutorials

## Dependencies
- Requires: Phase 3 completion (API layer)
- Blocks: None (final phase)

## Estimated Time
4 hours

## Success Criteria
- [ ] All tests passing (unit, integration, e2e)
- [ ] 90% code coverage achieved
- [ ] Documentation complete and accurate
- [ ] Examples working correctly
- [ ] Performance benchmarks met

## Implementation Details

### UnifiedWorkflowOrchestrator.test.js
```javascript
/**
 * Unit tests for UnifiedWorkflowOrchestrator
 */
const { UnifiedWorkflowOrchestrator } = require('../../domain/workflows/unified');

describe('UnifiedWorkflowOrchestrator', () => {
  let orchestrator;
  let mockDependencies;

  beforeEach(() => {
    mockDependencies = {
      frameworkRegistry: {
        getFramework: jest.fn()
      },
      stepRegistry: {
        getStep: jest.fn()
      },
      commandRegistry: {
        buildFromCategory: jest.fn()
      },
      handlerRegistry: {
        buildFromCategory: jest.fn()
      },
      projectRepository: {
        findById: jest.fn()
      },
      taskRepository: {
        create: jest.fn()
      }
    };

    orchestrator = new UnifiedWorkflowOrchestrator(mockDependencies);
  });

  describe('executeWorkflow', () => {
    it('should execute workflow with database project context', async () => {
      // Arrange
      const projectId = 'project-123';
      const workflowConfig = {
        framework: 'DocumentationFramework',
        options: { generateDocs: true }
      };
      const context = { projectId };

      const mockProject = {
        id: projectId,
        name: 'Test Project',
        workspace_path: '/path/to/project'
      };

      mockDependencies.projectRepository.findById.mockResolvedValue(mockProject);
      mockDependencies.frameworkRegistry.getFramework.mockReturnValue({
        name: 'DocumentationFramework'
      });

      // Act
      const result = await orchestrator.executeWorkflow(workflowConfig, context);

      // Assert
      expect(mockDependencies.projectRepository.findById).toHaveBeenCalledWith(projectId);
      expect(mockDependencies.frameworkRegistry.getFramework).toHaveBeenCalledWith('DocumentationFramework');
      expect(result).toBeDefined();
    });

    it('should throw error when project not found', async () => {
      // Arrange
      const projectId = 'non-existent';
      const workflowConfig = { framework: 'TestFramework' };
      const context = { projectId };

      mockDependencies.projectRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(orchestrator.executeWorkflow(workflowConfig, context))
        .rejects.toThrow('Project not found');
    });

    it('should validate workflow configuration', async () => {
      // Arrange
      const projectId = 'project-123';
      const invalidConfig = {}; // Missing required fields
      const context = { projectId };

      const mockProject = {
        id: projectId,
        name: 'Test Project',
        workspace_path: '/path/to/project'
      };

      mockDependencies.projectRepository.findById.mockResolvedValue(mockProject);

      // Act & Assert
      await expect(orchestrator.executeWorkflow(invalidConfig, context))
        .rejects.toThrow('Workflow validation failed');
    });
  });

  describe('executeCommand', () => {
    it('should execute command with database context', async () => {
      // Arrange
      const projectId = 'project-123';
      const commandConfig = {
        category: 'analysis',
        command: 'AnalyzeArchitectureCommand',
        params: { includeMetrics: true }
      };

      const mockProject = {
        id: projectId,
        name: 'Test Project',
        workspace_path: '/path/to/project'
      };

      const mockCommand = {
        execute: jest.fn().mockResolvedValue({ success: true })
      };

      mockDependencies.projectRepository.findById.mockResolvedValue(mockProject);
      mockDependencies.commandRegistry.buildFromCategory.mockReturnValue(mockCommand);

      // Act
      const result = await orchestrator.executeCommand(commandConfig, { projectId });

      // Assert
      expect(mockDependencies.commandRegistry.buildFromCategory).toHaveBeenCalledWith(
        'analysis',
        'AnalyzeArchitectureCommand',
        expect.objectContaining({
          projectPath: '/path/to/project',
          includeMetrics: true
        })
      );
      expect(result.success).toBe(true);
    });
  });
});
```

### UnifiedWorkflowService.test.js
```javascript
/**
 * Unit tests for UnifiedWorkflowService
 */
const { UnifiedWorkflowService } = require('../../application/services/UnifiedWorkflowService');

describe('UnifiedWorkflowService', () => {
  let service;
  let mockDependencies;

  beforeEach(() => {
    mockDependencies = {
      orchestrator: {
        executeWorkflow: jest.fn(),
        executeCommand: jest.fn(),
        executeHandler: jest.fn()
      },
      projectRepository: {
        findById: jest.fn()
      },
      taskRepository: {
        create: jest.fn()
      }
    };

    service = new UnifiedWorkflowService(mockDependencies);
  });

  describe('executeWorkflow', () => {
    it('should execute workflow successfully', async () => {
      // Arrange
      const config = {
        projectId: 'project-123',
        framework: 'DocumentationFramework',
        options: { generateDocs: true }
      };

      const mockProject = {
        id: 'project-123',
        name: 'Test Project',
        workspace_path: '/path/to/project'
      };

      const mockResult = { success: true, results: [] };

      mockDependencies.projectRepository.findById.mockResolvedValue(mockProject);
      mockDependencies.orchestrator.executeWorkflow.mockResolvedValue(mockResult);

      // Act
      const result = await service.executeWorkflow(config);

      // Assert
      expect(mockDependencies.projectRepository.findById).toHaveBeenCalledWith('project-123');
      expect(mockDependencies.orchestrator.executeWorkflow).toHaveBeenCalledWith(config, {
        projectId: 'project-123',
        userId: undefined
      });
      expect(result).toEqual(mockResult);
    });

    it('should throw error when project not found', async () => {
      // Arrange
      const config = { projectId: 'non-existent' };
      mockDependencies.projectRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.executeWorkflow(config))
        .rejects.toThrow('Project not found');
    });
  });

  describe('executeCommand', () => {
    it('should execute command successfully', async () => {
      // Arrange
      const config = {
        projectId: 'project-123',
        category: 'analysis',
        command: 'AnalyzeArchitectureCommand',
        params: { includeMetrics: true }
      };

      const mockProject = {
        id: 'project-123',
        name: 'Test Project',
        workspace_path: '/path/to/project'
      };

      const mockResult = { success: true };

      mockDependencies.projectRepository.findById.mockResolvedValue(mockProject);
      mockDependencies.orchestrator.executeCommand.mockResolvedValue(mockResult);

      // Act
      const result = await service.executeCommand(config);

      // Assert
      expect(mockDependencies.orchestrator.executeCommand).toHaveBeenCalledWith(config, {
        projectId: 'project-123',
        userId: undefined
      });
      expect(result).toEqual(mockResult);
    });
  });
});
```

### UnifiedWorkflowSystem.test.js (Integration)
```javascript
/**
 * Integration tests for Unified Workflow System
 */
const { UnifiedWorkflowService } = require('../../application/services/UnifiedWorkflowService');
const { UnifiedWorkflowOrchestrator } = require('../../domain/workflows/unified');
const ProjectRepository = require('../../infrastructure/database/ProjectRepository');
const TaskRepository = require('../../infrastructure/database/TaskRepository');

describe('Unified Workflow System Integration', () => {
  let service;
  let orchestrator;
  let projectRepository;
  let taskRepository;

  beforeAll(async () => {
    // Setup test database
    await setupTestDatabase();
  });

  beforeEach(async () => {
    // Initialize repositories
    projectRepository = new ProjectRepository();
    taskRepository = new TaskRepository();

    // Initialize orchestrator
    orchestrator = new UnifiedWorkflowOrchestrator({
      frameworkRegistry: require('../../domain/frameworks').frameworkRegistry,
      stepRegistry: require('../../domain/steps').stepRegistry,
      commandRegistry: require('../../application/commands'),
      handlerRegistry: require('../../application/handlers'),
      projectRepository,
      taskRepository
    });

    // Initialize service
    service = new UnifiedWorkflowService({
      orchestrator,
      projectRepository,
      taskRepository
    });
  });

  afterEach(async () => {
    // Cleanup test data
    await cleanupTestData();
  });

  describe('End-to-End Workflow Execution', () => {
    it('should execute documentation framework workflow', async () => {
      // Arrange
      const projectId = await createTestProject({
        name: 'Test Project',
        workspace_path: '/tmp/test-project'
      });

      const config = {
        projectId,
        framework: 'DocumentationFramework',
        options: {
          generateDocs: true,
          includeAPI: true
        }
      };

      // Act
      const result = await service.executeWorkflow(config);

      // Assert
      expect(result.success).toBe(true);
      expect(result.results).toBeDefined();
      
      // Verify database was updated
      const project = await projectRepository.findById(projectId);
      expect(project.last_workflow_execution).toBeDefined();
    });

    it('should execute custom workflow with steps', async () => {
      // Arrange
      const projectId = await createTestProject({
        name: 'Custom Workflow Project',
        workspace_path: '/tmp/custom-project'
      });

      const config = {
        projectId,
        workflow: {
          name: 'Custom Analysis',
          steps: [
            { type: 'analysis', options: { comprehensive: true } },
            { type: 'documentation', options: { generateReport: true } }
          ]
        }
      };

      // Act
      const result = await service.executeWorkflow(config);

      // Assert
      expect(result.success).toBe(true);
      expect(result.results.steps).toHaveLength(2);
    });
  });

  describe('Database Integration', () => {
    it('should save execution results to database', async () => {
      // Arrange
      const projectId = await createTestProject({
        name: 'Database Test Project',
        workspace_path: '/tmp/db-test-project'
      });

      const config = {
        projectId,
        framework: 'DocumentationFramework',
        options: { generateDocs: true }
      };

      // Act
      await service.executeWorkflow(config);

      // Assert
      const executions = await getWorkflowExecutions(projectId);
      expect(executions).toHaveLength(1);
      expect(executions[0].framework).toBe('DocumentationFramework');
    });

    it('should use database project paths correctly', async () => {
      // Arrange
      const customPath = '/custom/project/path';
      const projectId = await createTestProject({
        name: 'Custom Path Project',
        workspace_path: customPath
      });

      const config = {
        projectId,
        command: {
          category: 'analysis',
          command: 'AnalyzeArchitectureCommand',
          params: { includeMetrics: true }
        }
      };

      // Act
      const result = await service.executeCommand(config);

      // Assert
      expect(result.success).toBe(true);
      // Verify the command received the correct project path
      expect(result.results.projectPath).toBe(customPath);
    });
  });
});
```

### UnifiedWorkflowAPI.test.js (E2E)
```javascript
/**
 * E2E tests for Unified Workflow API
 */
const request = require('supertest');
const app = require('../../app'); // Your Express app
const { createTestUser, createTestProject } = require('../utils/test-helpers');

describe('Unified Workflow API E2E', () => {
  let authToken;
  let testProjectId;

  beforeAll(async () => {
    // Setup test user and get auth token
    const user = await createTestUser();
    authToken = await getAuthToken(user);
  });

  beforeEach(async () => {
    // Create test project for each test
    testProjectId = await createTestProject({
      name: 'API Test Project',
      workspace_path: '/tmp/api-test-project'
    });
  });

  describe('POST /api/unified-workflow/execute', () => {
    it('should execute workflow via API', async () => {
      // Arrange
      const workflowConfig = {
        projectId: testProjectId,
        framework: 'DocumentationFramework',
        options: { generateDocs: true }
      };

      // Act
      const response = await request(app)
        .post('/api/unified-workflow/execute')
        .set('Authorization', `Bearer ${authToken}`)
        .send(workflowConfig);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.results).toBeDefined();
    });

    it('should return 400 for invalid request', async () => {
      // Arrange
      const invalidConfig = {
        projectId: testProjectId
        // Missing workflow configuration
      };

      // Act
      const response = await request(app)
        .post('/api/unified-workflow/execute')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidConfig);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Workflow configuration is required');
    });

    it('should return 404 for non-existent project', async () => {
      // Arrange
      const config = {
        projectId: 'non-existent-project',
        framework: 'DocumentationFramework'
      };

      // Act
      const response = await request(app)
        .post('/api/unified-workflow/execute')
        .set('Authorization', `Bearer ${authToken}`)
        .send(config);

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Project not found');
    });
  });

  describe('POST /api/unified-workflow/command', () => {
    it('should execute command via API', async () => {
      // Arrange
      const commandConfig = {
        projectId: testProjectId,
        category: 'analysis',
        command: 'AnalyzeArchitectureCommand',
        params: { includeMetrics: true }
      };

      // Act
      const response = await request(app)
        .post('/api/unified-workflow/command')
        .set('Authorization', `Bearer ${authToken}`)
        .send(commandConfig);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.results).toBeDefined();
    });
  });

  describe('GET /api/unified-workflow/history/:projectId', () => {
    it('should return execution history', async () => {
      // Arrange
      // Execute a workflow first
      await request(app)
        .post('/api/unified-workflow/execute')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          projectId: testProjectId,
          framework: 'DocumentationFramework'
        });

      // Act
      const response = await request(app)
        .get(`/api/unified-workflow/history/${testProjectId}`)
        .set('Authorization', `Bearer ${authToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.history).toBeDefined();
      expect(response.body.history.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/unified-workflow/available/:projectId', () => {
    it('should return available frameworks and workflows', async () => {
      // Act
      const response = await request(app)
        .get(`/api/unified-workflow/available/${testProjectId}`)
        .set('Authorization', `Bearer ${authToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.frameworks).toBeDefined();
      expect(response.body.workflowTemplates).toBeDefined();
    });
  });
});
```

### README.md (Documentation)
```markdown
# Unified Workflow System

## Overview

The Unified Workflow System provides a comprehensive, database-driven workflow orchestration platform that integrates all existing PIDEA components including frameworks, workflows, steps, commands, and handlers.

## Features

- **Database-Driven**: All project paths come from the database, no hardcoded paths
- **Unified Orchestration**: Single orchestrator for all workflow types
- **Framework Integration**: Execute JSON frameworks with database context
- **Command Integration**: Execute commands with database project paths
- **Handler Integration**: Execute handlers with database context
- **API Layer**: RESTful API for workflow management
- **Monitoring**: Execution history and health monitoring

## Architecture

### Core Components

```
Unified Workflow System
├── UnifiedWorkflowOrchestrator - Main orchestrator
├── UnifiedWorkflowEngine - Execution engine
├── UnifiedWorkflowContext - Context management
├── UnifiedWorkflowValidator - Validation system
├── UnifiedWorkflowService - Application service
├── UnifiedWorkflowController - API controller
└── API Routes - REST endpoints
```

### Database Integration

The system uses existing project and task tables:

- **projects**: Source of project paths and metadata
- **tasks**: Workflow execution tracking
- **workflow_executions**: Execution history and results

## Quick Start

### 1. Execute Framework

```javascript
const result = await unifiedWorkflowService.executeWorkflow({
  projectId: 'project-123',
  framework: 'DocumentationFramework',
  options: {
    generateDocs: true,
    includeAPI: true
  }
});
```

### 2. Execute Custom Workflow

```javascript
const result = await unifiedWorkflowService.executeWorkflow({
  projectId: 'project-456',
  workflow: {
    name: 'Custom Analysis',
    steps: [
      { type: 'analysis', options: { comprehensive: true } },
      { type: 'documentation', options: { generateReport: true } }
    ]
  }
});
```

### 3. Execute Command

```javascript
const result = await unifiedWorkflowService.executeCommand({
  projectId: 'project-789',
  category: 'analysis',
  command: 'AnalyzeArchitectureCommand',
  params: { includeMetrics: true }
});
```

## API Endpoints

### Execute Workflow
```
POST /api/unified-workflow/execute
{
  "projectId": "project-123",
  "framework": "DocumentationFramework",
  "options": { "generateDocs": true }
}
```

### Execute Command
```
POST /api/unified-workflow/command
{
  "projectId": "project-123",
  "category": "analysis",
  "command": "AnalyzeArchitectureCommand",
  "params": { "includeMetrics": true }
}
```

### Get Execution History
```
GET /api/unified-workflow/history/:projectId?limit=50&offset=0
```

### Get Available Workflows
```
GET /api/unified-workflow/available/:projectId
```

## Configuration

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost/pidea

# API
UNIFIED_WORKFLOW_API_PORT=3000
UNIFIED_WORKFLOW_API_HOST=localhost

# Security
JWT_SECRET=your-jwt-secret
```

### Registry Integration

The system integrates with existing registries:

- **FrameworkRegistry**: `getFramework(frameworkName)`
- **StepRegistry**: `getStep(stepName)`
- **CommandRegistry**: `buildFromCategory(category, commandName, params)`
- **HandlerRegistry**: `buildFromCategory(category, handlerName, dependencies)`

## Testing

### Run All Tests
```bash
npm test
```

### Run Specific Test Suites
```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e
```

### Test Coverage
```bash
npm run test:coverage
```

## Monitoring

### Health Check
```
GET /api/unified-workflow/health
```

### Metrics
- Workflow execution count
- Success/failure rates
- Execution duration
- Database query performance

## Troubleshooting

### Common Issues

1. **Project Not Found**: Ensure project exists in database
2. **Framework Not Found**: Check framework registry
3. **Permission Denied**: Verify user permissions
4. **Database Connection**: Check database configuration

### Logs

The system provides comprehensive logging:

```javascript
// Enable debug logging
process.env.LOG_LEVEL = 'debug';
```

## Contributing

1. Follow the existing code patterns
2. Add tests for new features
3. Update documentation
4. Ensure database integration works
5. Follow security best practices
```

This comprehensive implementation provides a complete, database-driven unified workflow system that integrates all existing components while maintaining the correct registry method usage patterns identified in the codebase analysis. 