# API Restructuring - Phase 2: Interface Management Endpoints

## 📋 Phase Overview
- **Phase**: 2 of 4
- **Title**: Interface Management Endpoints
- **Estimated Time**: 3 hours
- **Status**: Planning
- **Dependencies**: Phase 1 completion, Interface Manager Implementation
- **Created**: 2025-10-10T20:57:44.000Z

## 🎯 Objectives
Create interface management API endpoints for project-centric interface operations, implement interface CRUD operations, and add interface validation middleware.

## 📋 Implementation Tasks

### Task 2.1: Create ProjectInterfaceController (60 minutes)
- [ ] Create `backend/presentation/api/projects/ProjectInterfaceController.js`
- [ ] Implement interface CRUD operations within project context
- [ ] Add interface validation and error handling
- [ ] Integrate with Interface Manager backend
- [ ] Add proper HTTP status codes and responses

**Controller Structure**:
```javascript
class ProjectInterfaceController {
  constructor(interfaceManager, projectRepository, logger) {
    this.interfaceManager = interfaceManager;
    this.projectRepository = projectRepository;
    this.logger = logger;
  }

  async createInterface(req, res) {
    try {
      const { projectId } = req.params;
      const { name, type, configuration } = req.body;
      
      // Validate input
      const validation = this.validateInterfaceData({ name, type, configuration });
      if (!validation.isValid) {
        return res.status(400).json({ error: validation.errors });
      }
      
      // Create interface within project context
      const interface = await this.interfaceManager.createInterface(projectId, {
        name,
        type,
        configuration,
        projectId,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      this.logger.info('Interface created:', { projectId, interfaceId: interface.id, name });
      res.status(201).json({ interface });
      
    } catch (error) {
      this.logger.error('Failed to create interface:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getInterface(req, res) {
    try {
      const { projectId, interfaceId } = req.params;
      const interface = await this.interfaceManager.getInterface(projectId, interfaceId);
      
      if (!interface) {
        return res.status(404).json({ error: 'Interface not found' });
      }
      
      res.json({ interface });
      
    } catch (error) {
      this.logger.error('Failed to get interface:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateInterface(req, res) {
    try {
      const { projectId, interfaceId } = req.params;
      const updates = req.body;
      
      // Validate updates
      const validation = this.validateInterfaceData(updates, true);
      if (!validation.isValid) {
        return res.status(400).json({ error: validation.errors });
      }
      
      const interface = await this.interfaceManager.updateInterface(projectId, interfaceId, {
        ...updates,
        updatedAt: new Date()
      });
      
      if (!interface) {
        return res.status(404).json({ error: 'Interface not found' });
      }
      
      this.logger.info('Interface updated:', { projectId, interfaceId, updates });
      res.json({ interface });
      
    } catch (error) {
      this.logger.error('Failed to update interface:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async deleteInterface(req, res) {
    try {
      const { projectId, interfaceId } = req.params;
      const deleted = await this.interfaceManager.deleteInterface(projectId, interfaceId);
      
      if (!deleted) {
        return res.status(404).json({ error: 'Interface not found' });
      }
      
      this.logger.info('Interface deleted:', { projectId, interfaceId });
      res.status(204).send();
      
    } catch (error) {
      this.logger.error('Failed to delete interface:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async listInterfaces(req, res) {
    try {
      const { projectId } = req.params;
      const { page = 1, limit = 10, type, status } = req.query;
      
      const interfaces = await this.interfaceManager.listInterfaces(projectId, {
        page: parseInt(page),
        limit: parseInt(limit),
        type,
        status
      });
      
      res.json({ 
        interfaces, 
        pagination: { 
          page, 
          limit, 
          total: interfaces.length,
          projectId 
        } 
      });
      
    } catch (error) {
      this.logger.error('Failed to list interfaces:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async startInterface(req, res) {
    try {
      const { projectId, interfaceId } = req.params;
      const result = await this.interfaceManager.startInterface(projectId, interfaceId);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      
      this.logger.info('Interface started:', { projectId, interfaceId });
      res.json({ message: 'Interface started successfully', interface: result.interface });
      
    } catch (error) {
      this.logger.error('Failed to start interface:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async stopInterface(req, res) {
    try {
      const { projectId, interfaceId } = req.params;
      const result = await this.interfaceManager.stopInterface(projectId, interfaceId);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      
      this.logger.info('Interface stopped:', { projectId, interfaceId });
      res.json({ message: 'Interface stopped successfully', interface: result.interface });
      
    } catch (error) {
      this.logger.error('Failed to stop interface:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async restartInterface(req, res) {
    try {
      const { projectId, interfaceId } = req.params;
      const result = await this.interfaceManager.restartInterface(projectId, interfaceId);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      
      this.logger.info('Interface restarted:', { projectId, interfaceId });
      res.json({ message: 'Interface restarted successfully', interface: result.interface });
      
    } catch (error) {
      this.logger.error('Failed to restart interface:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  validateInterfaceData(data, isUpdate = false) {
    const errors = [];
    
    if (!isUpdate || data.name !== undefined) {
      if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
        errors.push('Interface name is required and must be a non-empty string');
      }
    }
    
    if (!isUpdate || data.type !== undefined) {
      if (!data.type || typeof data.type !== 'string') {
        errors.push('Interface type is required and must be a string');
      }
      
      const validTypes = ['cursor', 'vscode', 'windsurf', 'jetbrains', 'sublime'];
      if (data.type && !validTypes.includes(data.type.toLowerCase())) {
        errors.push(`Interface type must be one of: ${validTypes.join(', ')}`);
      }
    }
    
    if (data.configuration !== undefined && typeof data.configuration !== 'object') {
      errors.push('Configuration must be an object');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = ProjectInterfaceController;
```

### Task 2.2: Implement Interface-Centric Routing (45 minutes)
- [ ] Create `backend/presentation/routes/interfaceRoutes.js`
- [ ] Define RESTful routes for interface operations within project context
- [ ] Add route parameter validation
- [ ] Integrate with ProjectInterfaceController
- [ ] Add route documentation

**Route Structure**:
```javascript
const express = require('express');
const ProjectInterfaceController = require('../api/projects/ProjectInterfaceController');
const interfaceMiddleware = require('../middleware/interfaceMiddleware');

const router = express.Router();
const interfaceController = new ProjectInterfaceController(interfaceManager, projectRepository, logger);

// Interface CRUD routes within project context
router.post('/', interfaceMiddleware.validateCreate, interfaceController.createInterface);
router.get('/', interfaceController.listInterfaces);
router.get('/:interfaceId', interfaceMiddleware.validateInterfaceId, interfaceController.getInterface);
router.put('/:interfaceId', interfaceMiddleware.validateInterfaceId, interfaceMiddleware.validateUpdate, interfaceController.updateInterface);
router.delete('/:interfaceId', interfaceMiddleware.validateInterfaceId, interfaceController.deleteInterface);

// Interface control routes
router.post('/:interfaceId/start', interfaceMiddleware.validateInterfaceId, interfaceController.startInterface);
router.post('/:interfaceId/stop', interfaceMiddleware.validateInterfaceId, interfaceController.stopInterface);
router.post('/:interfaceId/restart', interfaceMiddleware.validateInterfaceId, interfaceController.restartInterface);

// Interface status and logs
router.get('/:interfaceId/status', interfaceMiddleware.validateInterfaceId, interfaceController.getInterfaceStatus);
router.get('/:interfaceId/logs', interfaceMiddleware.validateInterfaceId, interfaceController.getInterfaceLogs);

module.exports = router;
```

### Task 2.3: Add Interface Validation Middleware (45 minutes)
- [ ] Create `backend/presentation/middleware/interfaceMiddleware.js`
- [ ] Implement interface ID validation
- [ ] Add interface data validation
- [ ] Add interface existence checks
- [ ] Add error handling middleware

**Middleware Structure**:
```javascript
const { logger } = require('@/infrastructure/logging/Logger');

class InterfaceMiddleware {
  constructor(interfaceManager) {
    this.interfaceManager = interfaceManager;
  }

  validateInterfaceId = async (req, res, next) => {
    try {
      const { projectId, interfaceId } = req.params;
      
      if (!interfaceId || typeof interfaceId !== 'string') {
        return res.status(400).json({ error: 'Invalid interface ID' });
      }
      
      // Check if interface exists within project context
      const interface = await this.interfaceManager.getInterface(projectId, interfaceId);
      if (!interface) {
        return res.status(404).json({ error: 'Interface not found' });
      }
      
      // Add interface to request for downstream middleware
      req.interface = interface;
      next();
      
    } catch (error) {
      logger.error('Interface validation error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  validateCreate = (req, res, next) => {
    const { name, type, configuration } = req.body;
    const errors = [];
    
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      errors.push('Interface name is required');
    }
    
    if (!type || typeof type !== 'string') {
      errors.push('Interface type is required');
    }
    
    const validTypes = ['cursor', 'vscode', 'windsurf', 'jetbrains', 'sublime'];
    if (type && !validTypes.includes(type.toLowerCase())) {
      errors.push(`Interface type must be one of: ${validTypes.join(', ')}`);
    }
    
    if (configuration && typeof configuration !== 'object') {
      errors.push('Configuration must be an object');
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
      errors.push('Interface name must be a non-empty string');
    }
    
    if (updates.type !== undefined) {
      if (typeof updates.type !== 'string') {
        errors.push('Interface type must be a string');
      }
      
      const validTypes = ['cursor', 'vscode', 'windsurf', 'jetbrains', 'sublime'];
      if (updates.type && !validTypes.includes(updates.type.toLowerCase())) {
        errors.push(`Interface type must be one of: ${validTypes.join(', ')}`);
      }
    }
    
    if (updates.configuration !== undefined && typeof updates.configuration !== 'object') {
      errors.push('Configuration must be an object');
    }
    
    if (errors.length > 0) {
      return res.status(400).json({ error: errors });
    }
    
    next();
  };
}

module.exports = new InterfaceMiddleware(interfaceManager);
```

### Task 2.4: Test Interface Endpoints (30 minutes)
- [ ] Create `backend/tests/unit/ProjectInterfaceController.test.js`
- [ ] Test all controller methods
- [ ] Test validation logic
- [ ] Test error handling
- [ ] Mock Interface Manager

**Test Structure**:
```javascript
const ProjectInterfaceController = require('@/presentation/api/projects/ProjectInterfaceController');

describe('ProjectInterfaceController', () => {
  let controller;
  let mockInterfaceManager;
  let mockProjectRepository;
  let mockLogger;

  beforeEach(() => {
    mockInterfaceManager = {
      createInterface: jest.fn(),
      getInterface: jest.fn(),
      updateInterface: jest.fn(),
      deleteInterface: jest.fn(),
      listInterfaces: jest.fn(),
      startInterface: jest.fn(),
      stopInterface: jest.fn(),
      restartInterface: jest.fn()
    };
    
    mockProjectRepository = {
      findById: jest.fn()
    };
    
    mockLogger = {
      info: jest.fn(),
      error: jest.fn()
    };
    
    controller = new ProjectInterfaceController(mockInterfaceManager, mockProjectRepository, mockLogger);
  });

  describe('createInterface', () => {
    it('should create an interface successfully', async () => {
      const interfaceData = {
        name: 'Test Interface',
        type: 'vscode',
        configuration: { port: 3000 }
      };
      
      mockInterfaceManager.createInterface.mockResolvedValue({ id: '1', ...interfaceData });
      
      const req = { 
        params: { projectId: 'project1' },
        body: interfaceData 
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      await controller.createInterface(req, res);
      
      expect(mockInterfaceManager.createInterface).toHaveBeenCalledWith('project1', expect.objectContaining(interfaceData));
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ interface: { id: '1', ...interfaceData } });
    });

    it('should return validation errors for invalid data', async () => {
      const req = { 
        params: { projectId: 'project1' },
        body: { name: '', type: 'invalid' } 
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      await controller.createInterface(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: expect.any(Array) });
    });
  });

  describe('startInterface', () => {
    it('should start interface successfully', async () => {
      const result = { success: true, interface: { id: '1', status: 'running' } };
      mockInterfaceManager.startInterface.mockResolvedValue(result);
      
      const req = { params: { projectId: 'project1', interfaceId: '1' } };
      const res = { json: jest.fn() };
      
      await controller.startInterface(req, res);
      
      expect(mockInterfaceManager.startInterface).toHaveBeenCalledWith('project1', '1');
      expect(res.json).toHaveBeenCalledWith({ 
        message: 'Interface started successfully', 
        interface: result.interface 
      });
    });

    it('should return error if start fails', async () => {
      const result = { success: false, error: 'Interface already running' };
      mockInterfaceManager.startInterface.mockResolvedValue(result);
      
      const req = { params: { projectId: 'project1', interfaceId: '1' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      await controller.startInterface(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Interface already running' });
    });
  });
});
```

## 🔧 Technical Implementation Details

### API Endpoints
- `POST /api/projects/:projectId/interfaces` - Create new interface
- `GET /api/projects/:projectId/interfaces` - List project interfaces
- `GET /api/projects/:projectId/interfaces/:interfaceId` - Get specific interface
- `PUT /api/projects/:projectId/interfaces/:interfaceId` - Update interface
- `DELETE /api/projects/:projectId/interfaces/:interfaceId` - Delete interface
- `POST /api/projects/:projectId/interfaces/:interfaceId/start` - Start interface
- `POST /api/projects/:projectId/interfaces/:interfaceId/stop` - Stop interface
- `POST /api/projects/:projectId/interfaces/:interfaceId/restart` - Restart interface

### Integration Points
- **Interface Manager**: Interface operations
- **Project Repository**: Project context validation
- **Logger**: Structured logging
- **Validation**: Input validation and sanitization

## 🧪 Testing Strategy

### Unit Tests
- **File**: `backend/tests/unit/ProjectInterfaceController.test.js`
- **Coverage**: 90%+ for all controller methods
- **Mock Requirements**: Interface Manager, Project Repository, Logger

### Test Scenarios
1. **CRUD Operations**:
   - Create interface with valid data
   - Create interface with invalid data
   - Get existing interface
   - Get non-existent interface
   - Update interface
   - Delete interface

2. **Interface Control**:
   - Start interface successfully
   - Start interface that's already running
   - Stop interface successfully
   - Restart interface successfully

3. **Validation**:
   - Required field validation
   - Interface type validation
   - Configuration validation

## 📊 Success Criteria
- [ ] ProjectInterfaceController created with all operations
- [ ] Interface routes implemented with proper RESTful design
- [ ] Interface validation middleware implemented
- [ ] All unit tests pass (90%+ coverage)
- [ ] No build errors or linting issues
- [ ] Proper error handling and logging
- [ ] API endpoints return correct HTTP status codes

## 🔄 Integration Points
- **Interface Manager**: Interface operations
- **Project Repository**: Project context
- **Logger**: Structured logging
- **Express Router**: Route handling

## 📝 Notes
- Ensure project context is maintained throughout interface operations
- Implement proper interface type validation
- Add comprehensive error handling for interface operations
- Focus on interface control operations (start, stop, restart)

## 🚀 Next Phase
After completing Phase 2, proceed to **Phase 3: Legacy API Migration** for API compatibility and migration.
