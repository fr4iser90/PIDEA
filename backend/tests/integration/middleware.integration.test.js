/**
 * Integration Tests for Project and Interface Middleware
 * 
 * Tests the middleware components that validate project and interface contexts,
 * ensuring proper request validation and context injection.
 */

const request = require('supertest');
const express = require('express');
const { getServiceContainer } = require('@infrastructure/dependency-injection/ServiceContainer');

// Import middleware
const ProjectMiddleware = require('@presentation/middleware/projectMiddleware');
const InterfaceMiddleware = require('@presentation/middleware/interfaceMiddleware');

// Import controllers
const ProjectController = require('@presentation/api/projects/ProjectController');
const ProjectInterfaceController = require('@presentation/api/projects/ProjectInterfaceController');

describe('Middleware Integration Tests', () => {
  let app;
  let application;
  let container;
  let projectApplicationService;
  let interfaceManager;
  let mockLogger;

  beforeAll(async () => {
    // Initialize the application
    application = new Application();
    await application.initialize();
    app = application.app;
    container = getServiceContainer();
    
    // Get services
    projectApplicationService = container.resolve('projectApplicationService');
    interfaceManager = container.resolve('interfaceManager');
    
    // Mock logger
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    };
  });

  afterAll(async () => {
    if (application && application.server) {
      await new Promise((resolve) => {
        application.server.close(resolve);
      });
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Project Middleware Integration', () => {
    let projectMiddleware;
    let testProjectId;

    beforeEach(async () => {
      projectMiddleware = new ProjectMiddleware(projectApplicationService);
      
      // Create a test project
      const projectData = {
        name: 'Middleware Test Project',
        workspacePath: '/path/to/middleware/test',
        description: 'Test project for middleware testing'
      };

      const response = await request(app)
        .post('/api/projects')
        .send(projectData);
      
      testProjectId = response.body.project.id;
    });

    describe('validateProjectId', () => {
      it('should validate existing project ID', async () => {
        const response = await request(app)
          .get(`/api/projects/${testProjectId}`)
          .expect(200);

        expect(response.body).toHaveProperty('project');
        expect(response.body.project.id).toBe(testProjectId);
      });

      it('should reject non-existent project ID', async () => {
        const response = await request(app)
          .get('/api/projects/nonexistent-id')
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('Project not found');
      });

      it('should reject invalid project ID format', async () => {
        const response = await request(app)
          .get('/api/projects/invalid-format')
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('Invalid project ID format');
      });
    });

    describe('validateCreate', () => {
      it('should validate valid project creation data', async () => {
        const validData = {
          name: 'Valid Project',
          workspacePath: '/path/to/valid/project',
          description: 'Valid project data'
        };

        const response = await request(app)
          .post('/api/projects')
          .send(validData)
          .expect(201);

        expect(response.body).toHaveProperty('project');
        expect(response.body.project.name).toBe(validData.name);
      });

      it('should reject project creation with missing required fields', async () => {
        const invalidData = {
          description: 'Missing name and workspacePath'
        };

        const response = await request(app)
          .post('/api/projects')
          .send(invalidData)
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('required');
      });

      it('should reject project creation with empty name', async () => {
        const invalidData = {
          name: '',
          workspacePath: '/path/to/project',
          description: 'Empty name test'
        };

        const response = await request(app)
          .post('/api/projects')
          .send(invalidData)
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('name');
      });

      it('should reject project creation with invalid workspace path', async () => {
        const invalidData = {
          name: 'Valid Name',
          workspacePath: '', // Empty workspace path
          description: 'Invalid workspace path test'
        };

        const response = await request(app)
          .post('/api/projects')
          .send(invalidData)
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('workspacePath');
      });
    });

    describe('validateUpdate', () => {
      it('should validate valid project update data', async () => {
        const updateData = {
          name: 'Updated Project Name',
          description: 'Updated description'
        };

        const response = await request(app)
          .put(`/api/projects/${testProjectId}`)
          .send(updateData)
          .expect(200);

        expect(response.body).toHaveProperty('project');
        expect(response.body.project.name).toBe(updateData.name);
      });

      it('should reject update with invalid data', async () => {
        const invalidData = {
          name: '', // Empty name
          description: 'Invalid update data'
        };

        const response = await request(app)
          .put(`/api/projects/${testProjectId}`)
          .send(invalidData)
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('name');
      });

      it('should allow partial updates', async () => {
        const partialData = {
          description: 'Only updating description'
        };

        const response = await request(app)
          .put(`/api/projects/${testProjectId}`)
          .send(partialData)
          .expect(200);

        expect(response.body).toHaveProperty('project');
        expect(response.body.project.description).toBe(partialData.description);
      });
    });

    describe('Context Injection', () => {
      it('should inject project context into request', async () => {
        const response = await request(app)
          .get(`/api/projects/${testProjectId}`)
          .expect(200);

        expect(response.body).toHaveProperty('project');
        expect(response.body.project.id).toBe(testProjectId);
        expect(response.body.project.name).toBe('Middleware Test Project');
      });
    });
  });

  describe('Interface Middleware Integration', () => {
    let interfaceMiddleware;
    let testProjectId;
    let testInterfaceId;

    beforeEach(async () => {
      interfaceMiddleware = new InterfaceMiddleware(interfaceManager, projectApplicationService);
      
      // Create a test project
      const projectData = {
        name: 'Interface Middleware Test Project',
        workspacePath: '/path/to/interface/middleware/test',
        description: 'Test project for interface middleware testing'
      };

      const projectResponse = await request(app)
        .post('/api/projects')
        .send(projectData);
      
      testProjectId = projectResponse.body.project.id;

      // Create a test interface
      const interfaceData = {
        name: 'Test Interface',
        type: 'ide',
        configuration: { port: 3000 }
      };

      const interfaceResponse = await request(app)
        .post(`/api/projects/${testProjectId}/interfaces`)
        .send(interfaceData);
      
      testInterfaceId = interfaceResponse.body.interface.id;
    });

    describe('validateInterfaceId', () => {
      it('should validate existing interface ID', async () => {
        const response = await request(app)
          .get(`/api/projects/${testProjectId}/interfaces/${testInterfaceId}`)
          .expect(200);

        expect(response.body).toHaveProperty('interface');
        expect(response.body.interface.id).toBe(testInterfaceId);
      });

      it('should reject non-existent interface ID', async () => {
        const response = await request(app)
          .get(`/api/projects/${testProjectId}/interfaces/nonexistent-id`)
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('Interface not found');
      });

      it('should reject invalid interface ID format', async () => {
        const response = await request(app)
          .get(`/api/projects/${testProjectId}/interfaces/invalid-format`)
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('Invalid interface ID format');
      });
    });

    describe('validateCreate', () => {
      it('should validate valid interface creation data', async () => {
        const validData = {
          name: 'Valid Interface',
          type: 'ide',
          configuration: { port: 3001 }
        };

        const response = await request(app)
          .post(`/api/projects/${testProjectId}/interfaces`)
          .send(validData)
          .expect(201);

        expect(response.body).toHaveProperty('interface');
        expect(response.body.interface.name).toBe(validData.name);
        expect(response.body.interface.type).toBe(validData.type);
      });

      it('should reject interface creation with missing required fields', async () => {
        const invalidData = {
          configuration: { port: 3000 }
          // Missing name and type
        };

        const response = await request(app)
          .post(`/api/projects/${testProjectId}/interfaces`)
          .send(invalidData)
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('required');
      });

      it('should reject interface creation with empty name', async () => {
        const invalidData = {
          name: '',
          type: 'ide',
          configuration: { port: 3000 }
        };

        const response = await request(app)
          .post(`/api/projects/${testProjectId}/interfaces`)
          .send(invalidData)
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('name');
      });

      it('should reject interface creation with invalid type', async () => {
        const invalidData = {
          name: 'Valid Name',
          type: 'invalid-type',
          configuration: { port: 3000 }
        };

        const response = await request(app)
          .post(`/api/projects/${testProjectId}/interfaces`)
          .send(invalidData)
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('type');
      });
    });

    describe('validateUpdate', () => {
      it('should validate valid interface update data', async () => {
        const updateData = {
          name: 'Updated Interface Name',
          configuration: { port: 3001 }
        };

        const response = await request(app)
          .put(`/api/projects/${testProjectId}/interfaces/${testInterfaceId}`)
          .send(updateData)
          .expect(200);

        expect(response.body).toHaveProperty('interface');
        expect(response.body.interface.name).toBe(updateData.name);
      });

      it('should reject update with invalid data', async () => {
        const invalidData = {
          name: '', // Empty name
          configuration: { port: 3000 }
        };

        const response = await request(app)
          .put(`/api/projects/${testProjectId}/interfaces/${testInterfaceId}`)
          .send(invalidData)
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('name');
      });

      it('should allow partial updates', async () => {
        const partialData = {
          configuration: { port: 3002 }
        };

        const response = await request(app)
          .put(`/api/projects/${testProjectId}/interfaces/${testInterfaceId}`)
          .send(partialData)
          .expect(200);

        expect(response.body).toHaveProperty('interface');
        expect(response.body.interface.configuration.port).toBe(3002);
      });
    });

    describe('Context Injection', () => {
      it('should inject interface context into request', async () => {
        const response = await request(app)
          .get(`/api/projects/${testProjectId}/interfaces/${testInterfaceId}`)
          .expect(200);

        expect(response.body).toHaveProperty('interface');
        expect(response.body.interface.id).toBe(testInterfaceId);
        expect(response.body.interface.name).toBe('Test Interface');
      });
    });
  });

  describe('Middleware Error Handling', () => {
    it('should handle middleware errors gracefully', async () => {
      // Test with malformed request
      const response = await request(app)
        .post('/api/projects')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle missing middleware dependencies', async () => {
      // This test ensures middleware handles missing dependencies gracefully
      const response = await request(app)
        .get('/api/projects/invalid-id')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle concurrent middleware requests', async () => {
      const promises = Array.from({ length: 3 }, (_, i) => {
        return request(app)
          .get(`/api/projects/${testProjectId}`)
          .expect(200);
      });

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.body).toHaveProperty('project');
        expect(response.body.project.id).toBe(testProjectId);
      });
    });
  });

  describe('Middleware Performance', () => {
    it('should handle middleware validation efficiently', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get(`/api/projects/${testProjectId}`)
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(100); // Should validate within 100ms
      expect(response.body).toHaveProperty('project');
    });

    it('should handle multiple middleware validations', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .put(`/api/projects/${testProjectId}`)
        .send({ name: 'Performance Test Update' })
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(200); // Should validate within 200ms
      expect(response.body).toHaveProperty('project');
    });
  });
});
