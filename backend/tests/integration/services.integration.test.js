/**
 * Integration Tests for Project and Interface Services
 * 
 * Tests the integration between ProjectApplicationService and InterfaceManager
 * with real database interactions and service dependencies.
 */

const { getServiceContainer } = require('@infrastructure/dependency-injection/ServiceContainer');
const Application = require('@Application');

describe('Services Integration Tests', () => {
  let application;
  let container;
  let projectApplicationService;
  let interfaceManager;
  let projectRepository;
  let mockLogger;

  beforeAll(async () => {
    // Initialize the application
    application = new Application();
    await application.initialize();
    container = getServiceContainer();
    
    // Get services
    projectApplicationService = container.resolve('projectApplicationService');
    interfaceManager = container.resolve('interfaceManager');
    projectRepository = container.resolve('projectRepository');
    
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

  describe('ProjectApplicationService Integration', () => {
    describe('Project CRUD Operations', () => {
      it('should create and retrieve a project', async () => {
        const projectData = {
          name: 'Service Integration Test Project',
          workspacePath: '/path/to/service/integration/test',
          description: 'Test project for service integration',
          type: 'web',
          framework: 'react'
        };

        // Create project
        const createdProject = await projectApplicationService.createProject(projectData);
        expect(createdProject).toHaveProperty('id');
        expect(createdProject.name).toBe(projectData.name);
        expect(createdProject.workspacePath).toBe(projectData.workspacePath);

        // Retrieve project
        const retrievedProject = await projectApplicationService.getProject(createdProject.id);
        expect(retrievedProject).toMatchObject(createdProject);
      });

      it('should list projects with pagination', async () => {
        // Create multiple projects
        const projectData1 = {
          name: 'List Test Project 1',
          workspacePath: '/path/to/list/test/1',
          description: 'First list test project'
        };

        const projectData2 = {
          name: 'List Test Project 2',
          workspacePath: '/path/to/list/test/2',
          description: 'Second list test project'
        };

        await projectApplicationService.createProject(projectData1);
        await projectApplicationService.createProject(projectData2);

        // List projects
        const result = await projectApplicationService.listProjects({ page: 1, limit: 10 });
        expect(result).toHaveProperty('projects');
        expect(result).toHaveProperty('total');
        expect(Array.isArray(result.projects)).toBe(true);
        expect(typeof result.total).toBe('number');
        expect(result.projects.length).toBeGreaterThanOrEqual(2);
      });

      it('should update a project', async () => {
        const projectData = {
          name: 'Update Test Project',
          workspacePath: '/path/to/update/test',
          description: 'Test project for update functionality'
        };

        // Create project
        const createdProject = await projectApplicationService.createProject(projectData);

        // Update project
        const updateData = {
          name: 'Updated Project Name',
          description: 'Updated description'
        };

        const updatedProject = await projectApplicationService.updateProject(createdProject.id, updateData);
        expect(updatedProject.name).toBe(updateData.name);
        expect(updatedProject.description).toBe(updateData.description);
        expect(updatedProject.id).toBe(createdProject.id);
      });

      it('should delete a project', async () => {
        const projectData = {
          name: 'Delete Test Project',
          workspacePath: '/path/to/delete/test',
          description: 'Test project for delete functionality'
        };

        // Create project
        const createdProject = await projectApplicationService.createProject(projectData);

        // Delete project
        await projectApplicationService.deleteProject(createdProject.id);

        // Verify project is deleted
        await expect(projectApplicationService.getProject(createdProject.id))
          .rejects.toThrow('Project not found');
      });

      it('should handle project search functionality', async () => {
        const projectData1 = {
          name: 'Search Test Project Alpha',
          workspacePath: '/path/to/search/alpha',
          description: 'Alpha project for search testing'
        };

        const projectData2 = {
          name: 'Search Test Project Beta',
          workspacePath: '/path/to/search/beta',
          description: 'Beta project for search testing'
        };

        await projectApplicationService.createProject(projectData1);
        await projectApplicationService.createProject(projectData2);

        // Search for projects
        const searchResult = await projectApplicationService.listProjects({ search: 'Alpha' });
        expect(searchResult.projects.length).toBeGreaterThan(0);
        expect(searchResult.projects.some(p => p.name.includes('Alpha'))).toBe(true);
      });
    });

    describe('Project-Interface Integration', () => {
      let testProjectId;

      beforeEach(async () => {
        const projectData = {
          name: 'Interface Integration Test Project',
          workspacePath: '/path/to/interface/integration/test',
          description: 'Test project for interface integration'
        };

        const createdProject = await projectApplicationService.createProject(projectData);
        testProjectId = createdProject.id;
      });

      it('should create interfaces for a project', async () => {
        const interfaceData = {
          name: 'Test IDE Interface',
          type: 'ide',
          configuration: { port: 3000 }
        };

        const createdInterface = await projectApplicationService.createInterface(testProjectId, interfaceData);
        expect(createdInterface).toHaveProperty('id');
        expect(createdInterface.name).toBe(interfaceData.name);
        expect(createdInterface.type).toBe(interfaceData.type);
        expect(createdInterface.projectId).toBe(testProjectId);
      });

      it('should list interfaces for a project', async () => {
        // Create multiple interfaces
        const interfaceData1 = {
          name: 'Interface 1',
          type: 'ide',
          configuration: { port: 3000 }
        };

        const interfaceData2 = {
          name: 'Interface 2',
          type: 'ide',
          configuration: { port: 3001 }
        };

        await projectApplicationService.createInterface(testProjectId, interfaceData1);
        await projectApplicationService.createInterface(testProjectId, interfaceData2);

        // List interfaces
        const interfaces = await projectApplicationService.listInterfaces(testProjectId);
        expect(Array.isArray(interfaces)).toBe(true);
        expect(interfaces.length).toBeGreaterThanOrEqual(2);
      });

      it('should get a specific interface', async () => {
        const interfaceData = {
          name: 'Get Test Interface',
          type: 'ide',
          configuration: { port: 3000 }
        };

        const createdInterface = await projectApplicationService.createInterface(testProjectId, interfaceData);
        const retrievedInterface = await projectApplicationService.getInterface(testProjectId, createdInterface.id);

        expect(retrievedInterface).toMatchObject(createdInterface);
      });

      it('should update an interface', async () => {
        const interfaceData = {
          name: 'Update Test Interface',
          type: 'ide',
          configuration: { port: 3000 }
        };

        const createdInterface = await projectApplicationService.createInterface(testProjectId, interfaceData);

        const updateData = {
          name: 'Updated Interface Name',
          configuration: { port: 3001 }
        };

        const updatedInterface = await projectApplicationService.updateInterface(testProjectId, createdInterface.id, updateData);
        expect(updatedInterface.name).toBe(updateData.name);
        expect(updatedInterface.configuration.port).toBe(3001);
      });

      it('should delete an interface', async () => {
        const interfaceData = {
          name: 'Delete Test Interface',
          type: 'ide',
          configuration: { port: 3000 }
        };

        const createdInterface = await projectApplicationService.createInterface(testProjectId, interfaceData);

        await projectApplicationService.deleteInterface(testProjectId, createdInterface.id);

        await expect(projectApplicationService.getInterface(testProjectId, createdInterface.id))
          .rejects.toThrow('Interface not found');
      });
    });
  });

  describe('InterfaceManager Integration', () => {
    describe('Interface Lifecycle Management', () => {
      it('should manage interface lifecycle', async () => {
        const interfaceData = {
          name: 'Lifecycle Test Interface',
          type: 'ide',
          configuration: { port: 3000 }
        };

        // Create interface
        const createdInterface = await interfaceManager.createInterface('test-project', interfaceData);
        expect(createdInterface).toHaveProperty('id');
        expect(createdInterface.status).toBe('created');

        // Start interface
        const startResult = await interfaceManager.startInterface(createdInterface.id);
        expect(startResult).toHaveProperty('status');
        expect(startResult.status).toContain('started');

        // Get interface status
        const status = await interfaceManager.getInterfaceStatus(createdInterface.id);
        expect(status).toHaveProperty('status');
        expect(status).toHaveProperty('interfaceId', createdInterface.id);

        // Stop interface
        const stopResult = await interfaceManager.stopInterface(createdInterface.id);
        expect(stopResult).toHaveProperty('status');
        expect(stopResult.status).toContain('stopped');

        // Restart interface
        const restartResult = await interfaceManager.restartInterface(createdInterface.id);
        expect(restartResult).toHaveProperty('status');
        expect(restartResult.status).toContain('restarted');
      });

      it('should handle interface errors gracefully', async () => {
        const interfaceData = {
          name: 'Error Test Interface',
          type: 'ide',
          configuration: { port: 3000 }
        };

        const createdInterface = await interfaceManager.createInterface('test-project', interfaceData);

        // Test error handling
        await expect(interfaceManager.startInterface('nonexistent-id'))
          .rejects.toThrow('Interface not found');

        await expect(interfaceManager.getInterfaceStatus('nonexistent-id'))
          .rejects.toThrow('Interface not found');
      });

      it('should track interface statistics', async () => {
        const initialStats = interfaceManager.getStats();
        expect(initialStats).toHaveProperty('totalCreated');
        expect(initialStats).toHaveProperty('activeCount');

        const interfaceData = {
          name: 'Stats Test Interface',
          type: 'ide',
          configuration: { port: 3000 }
        };

        await interfaceManager.createInterface('test-project', interfaceData);

        const updatedStats = interfaceManager.getStats();
        expect(updatedStats.totalCreated).toBeGreaterThan(initialStats.totalCreated);
        expect(updatedStats.activeCount).toBeGreaterThan(initialStats.activeCount);
      });
    });

    describe('Interface Registry Integration', () => {
      it('should register and manage interface types', () => {
        const { IDEInterface } = require('@domain/services/interface');
        
        // Register interface type
        interfaceManager.registerInterface('test-ide', IDEInterface, {
          defaultConfig: { port: 3000 }
        });

        // Verify registration
        const registeredTypes = interfaceManager.getRegisteredTypes();
        expect(registeredTypes).toContain('test-ide');
      });

      it('should validate interface type registration', () => {
        // Test invalid interface type
        expect(() => {
          interfaceManager.registerInterface('', null, {});
        }).toThrow('interfaceType must be a non-empty string');

        // Test invalid interface class
        expect(() => {
          interfaceManager.registerInterface('test', null, {});
        }).toThrow('interfaceClass must be a constructor function');
      });
    });
  });

  describe('Service Dependencies Integration', () => {
    it('should handle service dependency injection correctly', () => {
      expect(projectApplicationService).toBeDefined();
      expect(interfaceManager).toBeDefined();
      expect(projectRepository).toBeDefined();

      // Verify services have required methods
      expect(typeof projectApplicationService.createProject).toBe('function');
      expect(typeof projectApplicationService.getProject).toBe('function');
      expect(typeof projectApplicationService.updateProject).toBe('function');
      expect(typeof projectApplicationService.deleteProject).toBe('function');
      expect(typeof projectApplicationService.listProjects).toBe('function');

      expect(typeof interfaceManager.createInterface).toBe('function');
      expect(typeof interfaceManager.getInterface).toBe('function');
      expect(typeof interfaceManager.startInterface).toBe('function');
      expect(typeof interfaceManager.stopInterface).toBe('function');
      expect(typeof interfaceManager.restartInterface).toBe('function');
    });

    it('should handle service initialization errors', async () => {
      // Test with invalid service configuration
      const invalidService = new (class {
        constructor() {
          throw new Error('Service initialization failed');
        }
      })();

      expect(() => {
        new (class {
          constructor(service) {
            if (!service) {
              throw new Error('Service dependency required');
            }
          }
        })(invalidService);
      }).toThrow('Service initialization failed');
    });
  });

  describe('Database Integration', () => {
    it('should persist project data correctly', async () => {
      const projectData = {
        name: 'Database Test Project',
        workspacePath: '/path/to/database/test',
        description: 'Test project for database integration',
        type: 'web',
        framework: 'react'
      };

      // Create project
      const createdProject = await projectApplicationService.createProject(projectData);
      expect(createdProject).toHaveProperty('id');

      // Verify persistence by retrieving from repository directly
      const persistedProject = await projectRepository.findById(createdProject.id);
      expect(persistedProject).toMatchObject({
        name: projectData.name,
        workspacePath: projectData.workspacePath,
        description: projectData.description,
        type: projectData.type,
        framework: projectData.framework
      });
    });

    it('should handle database transactions', async () => {
      const projectData1 = {
        name: 'Transaction Test Project 1',
        workspacePath: '/path/to/transaction/test/1',
        description: 'First transaction test project'
      };

      const projectData2 = {
        name: 'Transaction Test Project 2',
        workspacePath: '/path/to/transaction/test/2',
        description: 'Second transaction test project'
      };

      // Create multiple projects
      const [project1, project2] = await Promise.all([
        projectApplicationService.createProject(projectData1),
        projectApplicationService.createProject(projectData2)
      ]);

      expect(project1).toHaveProperty('id');
      expect(project2).toHaveProperty('id');
      expect(project1.id).not.toBe(project2.id);
    });

    it('should handle database errors gracefully', async () => {
      // Test with invalid project data that might cause database errors
      const invalidData = {
        name: 'Database Error Test',
        workspacePath: null, // Invalid workspace path
        description: 'Test project for database error handling'
      };

      await expect(projectApplicationService.createProject(invalidData))
        .rejects.toThrow();
    });
  });

  describe('Performance Integration', () => {
    it('should handle concurrent service operations', async () => {
      const projectPromises = Array.from({ length: 5 }, (_, i) => {
        const projectData = {
          name: `Concurrent Service Test Project ${i}`,
          workspacePath: `/path/to/concurrent/service/test/${i}`,
          description: `Concurrent service test project ${i}`
        };

        return projectApplicationService.createProject(projectData);
      });

      const projects = await Promise.all(projectPromises);
      expect(projects).toHaveLength(5);
      projects.forEach((project, index) => {
        expect(project.name).toBe(`Concurrent Service Test Project ${index}`);
      });
    });

    it('should handle large data operations efficiently', async () => {
      const startTime = Date.now();

      // Create multiple projects
      const projectPromises = Array.from({ length: 10 }, (_, i) => {
        const projectData = {
          name: `Performance Test Project ${i}`,
          workspacePath: `/path/to/performance/test/${i}`,
          description: `Performance test project ${i}`
        };

        return projectApplicationService.createProject(projectData);
      });

      await Promise.all(projectPromises);

      // List all projects
      const result = await projectApplicationService.listProjects({ limit: 100 });

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(result.projects.length).toBeGreaterThanOrEqual(10);
    });
  });
});
