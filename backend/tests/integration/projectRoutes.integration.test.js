/**
 * Integration Tests for Project Routes
 * 
 * Tests the complete project API endpoints with real database and service interactions.
 * Validates the project-centric API structure and ensures proper RESTful behavior.
 */

const request = require('supertest');
const express = require('express');
const { getServiceContainer } = require('@infrastructure/dependency-injection/ServiceContainer');

// Import the application setup
const Application = require('@Application');

describe('Project Routes Integration', () => {
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
    
    // Mock logger to avoid console output during tests
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

  describe('POST /api/projects', () => {
    it('should create a new project successfully', async () => {
      const projectData = {
        name: 'Test Project',
        workspacePath: '/path/to/test/project',
        description: 'A test project for integration testing',
        type: 'web',
        framework: 'react'
      };

      const response = await request(app)
        .post('/api/projects')
        .send(projectData)
        .expect(201);

      expect(response.body).toHaveProperty('project');
      expect(response.body.project).toMatchObject({
        name: projectData.name,
        workspacePath: projectData.workspacePath,
        description: projectData.description,
        type: projectData.type,
        framework: projectData.framework
      });
      expect(response.body.project).toHaveProperty('id');
      expect(response.body.project).toHaveProperty('createdAt');
      expect(response.body.project).toHaveProperty('updatedAt');
    });

    it('should return 400 for invalid project data', async () => {
      const invalidData = {
        name: '', // Invalid: empty name
        workspacePath: '/invalid/path'
      };

      const response = await request(app)
        .post('/api/projects')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for missing required fields', async () => {
      const incompleteData = {
        description: 'Missing name and workspacePath'
      };

      const response = await request(app)
        .post('/api/projects')
        .send(incompleteData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/projects', () => {
    it('should list projects with pagination', async () => {
      const response = await request(app)
        .get('/api/projects')
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body).toHaveProperty('projects');
      expect(response.body).toHaveProperty('total');
      expect(Array.isArray(response.body.projects)).toBe(true);
      expect(typeof response.body.total).toBe('number');
    });

    it('should support search functionality', async () => {
      const response = await request(app)
        .get('/api/projects')
        .query({ search: 'test' })
        .expect(200);

      expect(response.body).toHaveProperty('projects');
      expect(response.body).toHaveProperty('total');
    });

    it('should handle empty results', async () => {
      const response = await request(app)
        .get('/api/projects')
        .query({ search: 'nonexistent' })
        .expect(200);

      expect(response.body.projects).toEqual([]);
      expect(response.body.total).toBe(0);
    });
  });

  describe('GET /api/projects/:projectId', () => {
    let testProjectId;

    beforeEach(async () => {
      // Create a test project
      const projectData = {
        name: 'Test Project for Get',
        workspacePath: '/path/to/test/project/get',
        description: 'Test project for GET endpoint'
      };

      const createResponse = await request(app)
        .post('/api/projects')
        .send(projectData);
      
      testProjectId = createResponse.body.project.id;
    });

    it('should get a project by ID', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProjectId}`)
        .expect(200);

      expect(response.body).toHaveProperty('project');
      expect(response.body.project.id).toBe(testProjectId);
      expect(response.body.project.name).toBe('Test Project for Get');
    });

    it('should return 404 for non-existent project', async () => {
      const response = await request(app)
        .get('/api/projects/nonexistent-id')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for invalid project ID format', async () => {
      const response = await request(app)
        .get('/api/projects/invalid-id-format')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/projects/:projectId', () => {
    let testProjectId;

    beforeEach(async () => {
      // Create a test project
      const projectData = {
        name: 'Test Project for Update',
        workspacePath: '/path/to/test/project/update',
        description: 'Test project for PUT endpoint'
      };

      const createResponse = await request(app)
        .post('/api/projects')
        .send(projectData);
      
      testProjectId = createResponse.body.project.id;
    });

    it('should update a project successfully', async () => {
      const updateData = {
        name: 'Updated Project Name',
        description: 'Updated description'
      };

      const response = await request(app)
        .put(`/api/projects/${testProjectId}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('project');
      expect(response.body.project.id).toBe(testProjectId);
      expect(response.body.project.name).toBe(updateData.name);
      expect(response.body.project.description).toBe(updateData.description);
      expect(response.body.project).toHaveProperty('updatedAt');
    });

    it('should return 404 for non-existent project', async () => {
      const updateData = {
        name: 'Updated Name'
      };

      const response = await request(app)
        .put('/api/projects/nonexistent-id')
        .send(updateData)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for invalid update data', async () => {
      const invalidData = {
        name: '' // Invalid: empty name
      };

      const response = await request(app)
        .put(`/api/projects/${testProjectId}`)
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/projects/:projectId', () => {
    let testProjectId;

    beforeEach(async () => {
      // Create a test project
      const projectData = {
        name: 'Test Project for Delete',
        workspacePath: '/path/to/test/project/delete',
        description: 'Test project for DELETE endpoint'
      };

      const createResponse = await request(app)
        .post('/api/projects')
        .send(projectData);
      
      testProjectId = createResponse.body.project.id;
    });

    it('should delete a project successfully', async () => {
      const response = await request(app)
        .delete(`/api/projects/${testProjectId}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('deleted successfully');

      // Verify project is deleted
      await request(app)
        .get(`/api/projects/${testProjectId}`)
        .expect(404);
    });

    it('should return 404 for non-existent project', async () => {
      const response = await request(app)
        .delete('/api/projects/nonexistent-id')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Project Interface Endpoints', () => {
    let testProjectId;

    beforeEach(async () => {
      // Create a test project
      const projectData = {
        name: 'Test Project for Interfaces',
        workspacePath: '/path/to/test/project/interfaces',
        description: 'Test project for interface endpoints'
      };

      const createResponse = await request(app)
        .post('/api/projects')
        .send(projectData);
      
      testProjectId = createResponse.body.project.id;
    });

    describe('POST /api/projects/:projectId/interfaces', () => {
      it('should create an interface for a project', async () => {
        const interfaceData = {
          name: 'Test IDE Interface',
          type: 'ide',
          configuration: {
            port: 3000,
            workspacePath: '/workspace'
          }
        };

        const response = await request(app)
          .post(`/api/projects/${testProjectId}/interfaces`)
          .send(interfaceData)
          .expect(201);

        expect(response.body).toHaveProperty('interface');
        expect(response.body.interface).toMatchObject({
          name: interfaceData.name,
          type: interfaceData.type,
          projectId: testProjectId
        });
        expect(response.body.interface).toHaveProperty('id');
        expect(response.body.interface).toHaveProperty('status');
      });

      it('should return 400 for invalid interface data', async () => {
        const invalidData = {
          name: '', // Invalid: empty name
          type: 'invalid-type'
        };

        const response = await request(app)
          .post(`/api/projects/${testProjectId}/interfaces`)
          .send(invalidData)
          .expect(400);

        expect(response.body).toHaveProperty('error');
      });
    });

    describe('GET /api/projects/:projectId/interfaces', () => {
      it('should list interfaces for a project', async () => {
        const response = await request(app)
          .get(`/api/projects/${testProjectId}/interfaces`)
          .expect(200);

        expect(response.body).toHaveProperty('interfaces');
        expect(Array.isArray(response.body.interfaces)).toBe(true);
      });
    });

    describe('Interface Control Endpoints', () => {
      let testInterfaceId;

      beforeEach(async () => {
        // Create a test interface
        const interfaceData = {
          name: 'Test Control Interface',
          type: 'ide',
          configuration: { port: 3001 }
        };

        const createResponse = await request(app)
          .post(`/api/projects/${testProjectId}/interfaces`)
          .send(interfaceData);
        
        testInterfaceId = createResponse.body.interface.id;
      });

      describe('POST /api/projects/:projectId/interfaces/:interfaceId/start', () => {
        it('should start an interface', async () => {
          const response = await request(app)
            .post(`/api/projects/${testProjectId}/interfaces/${testInterfaceId}/start`)
            .expect(200);

          expect(response.body).toHaveProperty('message');
          expect(response.body.message).toContain('started');
        });
      });

      describe('POST /api/projects/:projectId/interfaces/:interfaceId/stop', () => {
        it('should stop an interface', async () => {
          const response = await request(app)
            .post(`/api/projects/${testProjectId}/interfaces/${testInterfaceId}/stop`)
            .expect(200);

          expect(response.body).toHaveProperty('message');
          expect(response.body.message).toContain('stopped');
        });
      });

      describe('POST /api/projects/:projectId/interfaces/:interfaceId/restart', () => {
        it('should restart an interface', async () => {
          const response = await request(app)
            .post(`/api/projects/${testProjectId}/interfaces/${testInterfaceId}/restart`)
            .expect(200);

          expect(response.body).toHaveProperty('message');
          expect(response.body.message).toContain('restarted');
        });
      });

      describe('GET /api/projects/:projectId/interfaces/:interfaceId/status', () => {
        it('should get interface status', async () => {
          const response = await request(app)
            .get(`/api/projects/${testProjectId}/interfaces/${testInterfaceId}/status`)
            .expect(200);

          expect(response.body).toHaveProperty('status');
          expect(response.body).toHaveProperty('interfaceId', testInterfaceId);
        });
      });

      describe('GET /api/projects/:projectId/interfaces/:interfaceId/logs', () => {
        it('should get interface logs', async () => {
          const response = await request(app)
            .get(`/api/projects/${testProjectId}/interfaces/${testInterfaceId}/logs`)
            .expect(200);

          expect(response.body).toHaveProperty('logs');
          expect(response.body).toHaveProperty('interfaceId', testInterfaceId);
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON requests', async () => {
      const response = await request(app)
        .post('/api/projects')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle unsupported HTTP methods', async () => {
      const response = await request(app)
        .patch('/api/projects')
        .expect(405);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle missing route parameters', async () => {
      const response = await request(app)
        .get('/api/projects/')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent project creation', async () => {
      const projectPromises = Array.from({ length: 5 }, (_, i) => {
        const projectData = {
          name: `Concurrent Project ${i}`,
          workspacePath: `/path/to/concurrent/project/${i}`,
          description: `Concurrent test project ${i}`
        };

        return request(app)
          .post('/api/projects')
          .send(projectData);
      });

      const responses = await Promise.all(projectPromises);
      
      responses.forEach((response, index) => {
        expect(response.status).toBe(201);
        expect(response.body.project.name).toBe(`Concurrent Project ${index}`);
      });
    });

    it('should handle large project lists efficiently', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/projects')
        .query({ limit: 100 })
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
      expect(response.body).toHaveProperty('projects');
      expect(response.body).toHaveProperty('total');
    });
  });
});
