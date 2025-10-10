# API Restructuring - Phase 1: Project-Centric Endpoints

## 📋 Phase Overview
- **Phase**: 1 of 4
- **Title**: Project-Centric Endpoints
- **Estimated Time**: 3 hours
- **Status**: Planning
- **Dependencies**: Database Schema Enhancement
- **Created**: 2025-10-10T20:57:44.000Z

## 🎯 Objectives
Create project-centric API endpoints with proper RESTful design, implement project CRUD operations, and add project validation middleware.

## 📋 Implementation Tasks

### Task 1.1: Create ProjectController (60 minutes)
- [ ] Create `backend/presentation/api/projects/ProjectController.js`
- [ ] Implement project CRUD operations (Create, Read, Update, Delete)
- [ ] Add project validation and error handling
- [ ] Integrate with ProjectRepository
- [ ] Add proper HTTP status codes and responses

**Controller Structure**:
```javascript
class ProjectController {
  constructor(projectRepository, logger) {
    this.projectRepository = projectRepository;
    this.logger = logger;
  }

  async createProject(req, res) {
    try {
      const { name, workspacePath, description } = req.body;
      
      // Validate input
      const validation = this.validateProjectData({ name, workspacePath, description });
      if (!validation.isValid) {
        return res.status(400).json({ error: validation.errors });
      }
      
      // Create project
      const project = await this.projectRepository.create({
        name,
        workspacePath,
        description,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      this.logger.info('Project created:', { projectId: project.id, name });
      res.status(201).json({ project });
      
    } catch (error) {
      this.logger.error('Failed to create project:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getProject(req, res) {
    try {
      const { projectId } = req.params;
      const project = await this.projectRepository.findById(projectId);
      
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      res.json({ project });
      
    } catch (error) {
      this.logger.error('Failed to get project:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateProject(req, res) {
    try {
      const { projectId } = req.params;
      const updates = req.body;
      
      // Validate updates
      const validation = this.validateProjectData(updates, true);
      if (!validation.isValid) {
        return res.status(400).json({ error: validation.errors });
      }
      
      const project = await this.projectRepository.update(projectId, {
        ...updates,
        updatedAt: new Date()
      });
      
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      this.logger.info('Project updated:', { projectId, updates });
      res.json({ project });
      
    } catch (error) {
      this.logger.error('Failed to update project:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async deleteProject(req, res) {
    try {
      const { projectId } = req.params;
      const deleted = await this.projectRepository.delete(projectId);
      
      if (!deleted) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      this.logger.info('Project deleted:', { projectId });
      res.status(204).send();
      
    } catch (error) {
      this.logger.error('Failed to delete project:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async listProjects(req, res) {
    try {
      const { page = 1, limit = 10, search } = req.query;
      const projects = await this.projectRepository.findAll({
        page: parseInt(page),
        limit: parseInt(limit),
        search
      });
      
      res.json({ projects, pagination: { page, limit, total: projects.length } });
      
    } catch (error) {
      this.logger.error('Failed to list projects:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  validateProjectData(data, isUpdate = false) {
    const errors = [];
    
    if (!isUpdate || data.name !== undefined) {
      if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
        errors.push('Project name is required and must be a non-empty string');
      }
    }
    
    if (!isUpdate || data.workspacePath !== undefined) {
      if (!data.workspacePath || typeof data.workspacePath !== 'string') {
        errors.push('Workspace path is required and must be a string');
      }
    }
    
    if (data.description !== undefined && typeof data.description !== 'string') {
      errors.push('Description must be a string');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = ProjectController;
```

### Task 1.2: Implement Project-Centric Routing (45 minutes)
- [ ] Create `backend/presentation/routes/projectRoutes.js`
- [ ] Define RESTful routes for project operations
- [ ] Add route parameter validation
- [ ] Integrate with ProjectController
- [ ] Add route documentation

**Route Structure**:
```javascript
const express = require('express');
const ProjectController = require('../api/projects/ProjectController');
const projectMiddleware = require('../middleware/projectMiddleware');

const router = express.Router();
const projectController = new ProjectController(projectRepository, logger);

// Project CRUD routes
router.post('/', projectMiddleware.validateCreate, projectController.createProject);
router.get('/', projectController.listProjects);
router.get('/:projectId', projectMiddleware.validateProjectId, projectController.getProject);
router.put('/:projectId', projectMiddleware.validateProjectId, projectMiddleware.validateUpdate, projectController.updateProject);
router.delete('/:projectId', projectMiddleware.validateProjectId, projectController.deleteProject);

// Project-specific sub-resources
router.use('/:projectId/interfaces', require('./interfaceRoutes'));
router.use('/:projectId/tasks', require('./taskRoutes'));
router.use('/:projectId/analysis', require('./analysisRoutes'));

module.exports = router;
```

### Task 1.3: Add Project Validation Middleware (45 minutes)
- [ ] Create `backend/presentation/middleware/projectMiddleware.js`
- [ ] Implement project ID validation
- [ ] Add project data validation
- [ ] Add project existence checks
- [ ] Add error handling middleware

**Middleware Structure**:
```javascript
const { logger } = require('@/infrastructure/logging/Logger');

class ProjectMiddleware {
  constructor(projectRepository) {
    this.projectRepository = projectRepository;
  }

  validateProjectId = async (req, res, next) => {
    try {
      const { projectId } = req.params;
      
      if (!projectId || typeof projectId !== 'string') {
        return res.status(400).json({ error: 'Invalid project ID' });
      }
      
      // Check if project exists
      const project = await this.projectRepository.findById(projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      // Add project to request for downstream middleware
      req.project = project;
      next();
      
    } catch (error) {
      logger.error('Project validation error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  validateCreate = (req, res, next) => {
    const { name, workspacePath, description } = req.body;
    const errors = [];
    
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      errors.push('Project name is required');
    }
    
    if (!workspacePath || typeof workspacePath !== 'string') {
      errors.push('Workspace path is required');
    }
    
    if (description && typeof description !== 'string') {
      errors.push('Description must be a string');
    }
    
    if (errors.length > 0) {
      return res.status(400).json({ error: errors });
    }
    
    next();
  };

  validateUpdate = (req, res, next) => {
    const updates = req.body;
    const errors = [];
    
    if (updates.name !== undefined && (!updates.name || typeof updates.name !== 'string')) {
      errors.push('Project name must be a non-empty string');
    }
    
    if (updates.workspacePath !== undefined && typeof updates.workspacePath !== 'string') {
      errors.push('Workspace path must be a string');
    }
    
    if (updates.description !== undefined && typeof updates.description !== 'string') {
      errors.push('Description must be a string');
    }
    
    if (errors.length > 0) {
      return res.status(400).json({ error: errors });
    }
    
    next();
  };
}

module.exports = new ProjectMiddleware(projectRepository);
```

### Task 1.4: Create Initial Tests (30 minutes)
- [ ] Create `backend/tests/unit/ProjectController.test.js`
- [ ] Test all controller methods
- [ ] Test validation logic
- [ ] Test error handling
- [ ] Mock ProjectRepository

**Test Structure**:
```javascript
const ProjectController = require('@/presentation/api/projects/ProjectController');
const ProjectRepository = require('@/domain/repositories/ProjectRepository');

describe('ProjectController', () => {
  let controller;
  let mockRepository;
  let mockLogger;

  beforeEach(() => {
    mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findAll: jest.fn()
    };
    
    mockLogger = {
      info: jest.fn(),
      error: jest.fn()
    };
    
    controller = new ProjectController(mockRepository, mockLogger);
  });

  describe('createProject', () => {
    it('should create a project successfully', async () => {
      const projectData = {
        name: 'Test Project',
        workspacePath: '/path/to/project',
        description: 'Test description'
      };
      
      mockRepository.create.mockResolvedValue({ id: '1', ...projectData });
      
      const req = { body: projectData };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      await controller.createProject(req, res);
      
      expect(mockRepository.create).toHaveBeenCalledWith(expect.objectContaining(projectData));
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ project: { id: '1', ...projectData } });
    });

    it('should return validation errors for invalid data', async () => {
      const req = { body: { name: '', workspacePath: '' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      await controller.createProject(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: expect.any(Array) });
    });
  });

  describe('getProject', () => {
    it('should return project if found', async () => {
      const project = { id: '1', name: 'Test Project' };
      mockRepository.findById.mockResolvedValue(project);
      
      const req = { params: { projectId: '1' } };
      const res = { json: jest.fn() };
      
      await controller.getProject(req, res);
      
      expect(res.json).toHaveBeenCalledWith({ project });
    });

    it('should return 404 if project not found', async () => {
      mockRepository.findById.mockResolvedValue(null);
      
      const req = { params: { projectId: '1' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      await controller.getProject(req, res);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Project not found' });
    });
  });
});
```

## 🔧 Technical Implementation Details

### API Endpoints
- `POST /api/projects` - Create new project
- `GET /api/projects` - List all projects
- `GET /api/projects/:projectId` - Get specific project
- `PUT /api/projects/:projectId` - Update project
- `DELETE /api/projects/:projectId` - Delete project

### Integration Points
- **ProjectRepository**: Database operations
- **Logger**: Structured logging
- **Validation**: Input validation and sanitization
- **Error Handling**: Consistent error responses

## 🧪 Testing Strategy

### Unit Tests
- **File**: `backend/tests/unit/ProjectController.test.js`
- **Coverage**: 90%+ for all controller methods
- **Mock Requirements**: ProjectRepository, Logger

### Test Scenarios
1. **CRUD Operations**:
   - Create project with valid data
   - Create project with invalid data
   - Get existing project
   - Get non-existent project
   - Update project
   - Delete project

2. **Validation**:
   - Required field validation
   - Data type validation
   - Business rule validation

3. **Error Handling**:
   - Database errors
   - Validation errors
   - Not found errors

## 📊 Success Criteria
- [ ] ProjectController created with all CRUD operations
- [ ] Project routes implemented with proper RESTful design
- [ ] Project validation middleware implemented
- [ ] All unit tests pass (90%+ coverage)
- [ ] No build errors or linting issues
- [ ] Proper error handling and logging
- [ ] API endpoints return correct HTTP status codes

## 🔄 Integration Points
- **ProjectRepository**: Database operations
- **Logger**: Structured logging
- **Express Router**: Route handling
- **Middleware**: Validation and error handling

## 📝 Notes
- Follow RESTful API design principles
- Ensure proper HTTP status codes
- Implement comprehensive error handling
- Add structured logging for all operations
- Focus on validation and security

## 🚀 Next Phase
After completing Phase 1, proceed to **Phase 2: Interface Management Endpoints** for interface management API implementation.
