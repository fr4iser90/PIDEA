/**
 * Performance Tests for Project-Centric API
 *
 * Tests the performance characteristics of the new project-centric API endpoints,
 * including response times, throughput, and resource usage.
 */

const request = require("supertest");
const {
  getServiceContainer,
} = require("@infrastructure/dependency-injection/ServiceContainer");
const Application = require("@Application");

describe("API Performance Tests", () => {
  let app;
  let application;
  let container;
  let projectApplicationService;
  let interfaceManager;

  beforeAll(async () => {
    // Initialize the application
    application = new Application();
    await application.initialize();
    app = application.app;
    container = getServiceContainer();

    // Get services
    projectApplicationService = container.resolve("projectApplicationService");
    interfaceManager = container.resolve("interfaceManager");
  });

  afterAll(async () => {
    if (application && application.server) {
      await new Promise((resolve) => {
        application.server.close(resolve);
      });
    }
  });

  describe("Project API Performance", () => {
    describe("Project Creation Performance", () => {
      it("should create projects within acceptable time limits", async () => {
        const projectData = {
          name: "Performance Test Project",
          workspacePath: "/path/to/performance/test",
          description: "Test project for performance testing",
        };

        const startTime = Date.now();
        const response = await request(app)
          .post("/api/projects")
          .send(projectData)
          .expect(201);
        const endTime = Date.now();

        const responseTime = endTime - startTime;
        expect(responseTime).toBeLessThan(1000); // Should complete within 1 second
        expect(response.body).toHaveProperty("project");
      });

      it("should handle concurrent project creation efficiently", async () => {
        const projectPromises = Array.from({ length: 10 }, (_, i) => {
          const projectData = {
            name: `Concurrent Performance Test Project ${i}`,
            workspacePath: `/path/to/concurrent/performance/test/${i}`,
            description: `Concurrent performance test project ${i}`,
          };

          return request(app).post("/api/projects").send(projectData);
        });

        const startTime = Date.now();
        const responses = await Promise.all(projectPromises);
        const endTime = Date.now();

        const totalTime = endTime - startTime;
        const averageTime = totalTime / 10;

        expect(totalTime).toBeLessThan(5000); // All requests should complete within 5 seconds
        expect(averageTime).toBeLessThan(500); // Average response time should be under 500ms
        expect(responses).toHaveLength(10);
        responses.forEach((response) => {
          expect(response.status).toBe(201);
          expect(response.body).toHaveProperty("project");
        });
      });

      it("should maintain performance with large project data", async () => {
        const largeProjectData = {
          name: "Large Performance Test Project",
          workspacePath: "/path/to/large/performance/test",
          description: "A".repeat(1000), // Large description
          type: "web",
          framework: "react",
          metadata: {
            tags: Array.from({ length: 100 }, (_, i) => `tag${i}`),
            config: Array.from({ length: 50 }, (_, i) => ({
              key: `key${i}`,
              value: `value${i}`,
            })),
          },
        };

        const startTime = Date.now();
        const response = await request(app)
          .post("/api/projects")
          .send(largeProjectData)
          .expect(201);
        const endTime = Date.now();

        const responseTime = endTime - startTime;
        expect(responseTime).toBeLessThan(2000); // Should handle large data within 2 seconds
        expect(response.body).toHaveProperty("project");
      });
    });

    describe("Project Retrieval Performance", () => {
      let testProjectId;

      beforeEach(async () => {
        const projectData = {
          name: "Retrieval Performance Test Project",
          workspacePath: "/path/to/retrieval/performance/test",
          description: "Test project for retrieval performance testing",
        };

        const response = await request(app)
          .post("/api/projects")
          .send(projectData);

        testProjectId = response.body.project.id;
      });

      it("should retrieve projects within acceptable time limits", async () => {
        const startTime = Date.now();
        const response = await request(app)
          .get(`/api/projects/${testProjectId}`)
          .expect(200);
        const endTime = Date.now();

        const responseTime = endTime - startTime;
        expect(responseTime).toBeLessThan(500); // Should retrieve within 500ms
        expect(response.body).toHaveProperty("project");
      });

      it("should handle concurrent project retrieval efficiently", async () => {
        const retrievalPromises = Array.from({ length: 20 }, () => {
          return request(app).get(`/api/projects/${testProjectId}`);
        });

        const startTime = Date.now();
        const responses = await Promise.all(retrievalPromises);
        const endTime = Date.now();

        const totalTime = endTime - startTime;
        const averageTime = totalTime / 20;

        expect(totalTime).toBeLessThan(2000); // All requests should complete within 2 seconds
        expect(averageTime).toBeLessThan(100); // Average response time should be under 100ms
        expect(responses).toHaveLength(20);
        responses.forEach((response) => {
          expect(response.status).toBe(200);
          expect(response.body).toHaveProperty("project");
        });
      });
    });

    describe("Project Listing Performance", () => {
      beforeEach(async () => {
        // Create multiple projects for listing tests
        const projectPromises = Array.from({ length: 50 }, (_, i) => {
          const projectData = {
            name: `Listing Performance Test Project ${i}`,
            workspacePath: `/path/to/listing/performance/test/${i}`,
            description: `Listing performance test project ${i}`,
          };

          return request(app).post("/api/projects").send(projectData);
        });

        await Promise.all(projectPromises);
      });

      it("should list projects within acceptable time limits", async () => {
        const startTime = Date.now();
        const response = await request(app)
          .get("/api/projects")
          .query({ page: 1, limit: 10 })
          .expect(200);
        const endTime = Date.now();

        const responseTime = endTime - startTime;
        expect(responseTime).toBeLessThan(1000); // Should list within 1 second
        expect(response.body).toHaveProperty("projects");
        expect(response.body).toHaveProperty("total");
      });

      it("should handle pagination efficiently", async () => {
        const pagePromises = Array.from({ length: 5 }, (_, i) => {
          return request(app)
            .get("/api/projects")
            .query({ page: i + 1, limit: 10 });
        });

        const startTime = Date.now();
        const responses = await Promise.all(pagePromises);
        const endTime = Date.now();

        const totalTime = endTime - startTime;
        const averageTime = totalTime / 5;

        expect(totalTime).toBeLessThan(2000); // All pages should load within 2 seconds
        expect(averageTime).toBeLessThan(400); // Average page load time should be under 400ms
        expect(responses).toHaveLength(5);
        responses.forEach((response) => {
          expect(response.status).toBe(200);
          expect(response.body).toHaveProperty("projects");
        });
      });

      it("should handle search efficiently", async () => {
        const startTime = Date.now();
        const response = await request(app)
          .get("/api/projects")
          .query({ search: "Listing Performance" })
          .expect(200);
        const endTime = Date.now();

        const responseTime = endTime - startTime;
        expect(responseTime).toBeLessThan(1000); // Should search within 1 second
        expect(response.body).toHaveProperty("projects");
        expect(response.body.projects.length).toBeGreaterThan(0);
      });
    });

    describe("Project Update Performance", () => {
      let testProjectId;

      beforeEach(async () => {
        const projectData = {
          name: "Update Performance Test Project",
          workspacePath: "/path/to/update/performance/test",
          description: "Test project for update performance testing",
        };

        const response = await request(app)
          .post("/api/projects")
          .send(projectData);

        testProjectId = response.body.project.id;
      });

      it("should update projects within acceptable time limits", async () => {
        const updateData = {
          name: "Updated Performance Test Project",
          description: "Updated description for performance testing",
        };

        const startTime = Date.now();
        const response = await request(app)
          .put(`/api/projects/${testProjectId}`)
          .send(updateData)
          .expect(200);
        const endTime = Date.now();

        const responseTime = endTime - startTime;
        expect(responseTime).toBeLessThan(1000); // Should update within 1 second
        expect(response.body).toHaveProperty("project");
      });

      it("should handle concurrent project updates efficiently", async () => {
        const updatePromises = Array.from({ length: 5 }, (_, i) => {
          const updateData = {
            name: `Concurrent Update ${i}`,
            description: `Concurrent update description ${i}`,
          };

          return request(app)
            .put(`/api/projects/${testProjectId}`)
            .send(updateData);
        });

        const startTime = Date.now();
        const responses = await Promise.all(updatePromises);
        const endTime = Date.now();

        const totalTime = endTime - startTime;
        const averageTime = totalTime / 5;

        expect(totalTime).toBeLessThan(3000); // All updates should complete within 3 seconds
        expect(averageTime).toBeLessThan(600); // Average update time should be under 600ms
        expect(responses).toHaveLength(5);
        responses.forEach((response) => {
          expect(response.status).toBe(200);
          expect(response.body).toHaveProperty("project");
        });
      });
    });
  });

  describe("Interface API Performance", () => {
    let testProjectId;

    beforeEach(async () => {
      const projectData = {
        name: "Interface Performance Test Project",
        workspacePath: "/path/to/interface/performance/test",
        description: "Test project for interface performance testing",
      };

      const response = await request(app)
        .post("/api/projects")
        .send(projectData);

      testProjectId = response.body.project.id;
    });

    describe("Interface Creation Performance", () => {
      it("should create interfaces within acceptable time limits", async () => {
        const interfaceData = {
          name: "Performance Test Interface",
          type: "ide",
          configuration: { port: 3000 },
        };

        const startTime = Date.now();
        const response = await request(app)
          .post(`/api/projects/${testProjectId}/interfaces`)
          .send(interfaceData)
          .expect(201);
        const endTime = Date.now();

        const responseTime = endTime - startTime;
        expect(responseTime).toBeLessThan(1000); // Should create within 1 second
        expect(response.body).toHaveProperty("interface");
      });

      it("should handle concurrent interface creation efficiently", async () => {
        const interfacePromises = Array.from({ length: 10 }, (_, i) => {
          const interfaceData = {
            name: `Concurrent Performance Test Interface ${i}`,
            type: "ide",
            configuration: { port: 3000 + i },
          };

          return request(app)
            .post(`/api/projects/${testProjectId}/interfaces`)
            .send(interfaceData);
        });

        const startTime = Date.now();
        const responses = await Promise.all(interfacePromises);
        const endTime = Date.now();

        const totalTime = endTime - startTime;
        const averageTime = totalTime / 10;

        expect(totalTime).toBeLessThan(5000); // All requests should complete within 5 seconds
        expect(averageTime).toBeLessThan(500); // Average response time should be under 500ms
        expect(responses).toHaveLength(10);
        responses.forEach((response) => {
          expect(response.status).toBe(201);
          expect(response.body).toHaveProperty("interface");
        });
      });
    });

    describe("Interface Control Performance", () => {
      let testInterfaceId;

      beforeEach(async () => {
        const interfaceData = {
          name: "Control Performance Test Interface",
          type: "ide",
          configuration: { port: 3000 },
        };

        const response = await request(app)
          .post(`/api/projects/${testProjectId}/interfaces`)
          .send(interfaceData);

        testInterfaceId = response.body.interface.id;
      });

      it("should start interfaces within acceptable time limits", async () => {
        const startTime = Date.now();
        const response = await request(app)
          .post(
            `/api/projects/${testProjectId}/interfaces/${testInterfaceId}/start`,
          )
          .expect(200);
        const endTime = Date.now();

        const responseTime = endTime - startTime;
        expect(responseTime).toBeLessThan(2000); // Should start within 2 seconds
        expect(response.body).toHaveProperty("message");
      });

      it("should stop interfaces within acceptable time limits", async () => {
        const startTime = Date.now();
        const response = await request(app)
          .post(
            `/api/projects/${testProjectId}/interfaces/${testInterfaceId}/stop`,
          )
          .expect(200);
        const endTime = Date.now();

        const responseTime = endTime - startTime;
        expect(responseTime).toBeLessThan(2000); // Should stop within 2 seconds
        expect(response.body).toHaveProperty("message");
      });

      it("should restart interfaces within acceptable time limits", async () => {
        const startTime = Date.now();
        const response = await request(app)
          .post(
            `/api/projects/${testProjectId}/interfaces/${testInterfaceId}/restart`,
          )
          .expect(200);
        const endTime = Date.now();

        const responseTime = endTime - startTime;
        expect(responseTime).toBeLessThan(3000); // Should restart within 3 seconds
        expect(response.body).toHaveProperty("message");
      });

      it("should get interface status within acceptable time limits", async () => {
        const startTime = Date.now();
        const response = await request(app)
          .get(
            `/api/projects/${testProjectId}/interfaces/${testInterfaceId}/status`,
          )
          .expect(200);
        const endTime = Date.now();

        const responseTime = endTime - startTime;
        expect(responseTime).toBeLessThan(500); // Should get status within 500ms
        expect(response.body).toHaveProperty("status");
      });

      it("should get interface logs within acceptable time limits", async () => {
        const startTime = Date.now();
        const response = await request(app)
          .get(
            `/api/projects/${testProjectId}/interfaces/${testInterfaceId}/logs`,
          )
          .expect(200);
        const endTime = Date.now();

        const responseTime = endTime - startTime;
        expect(responseTime).toBeLessThan(1000); // Should get logs within 1 second
        expect(response.body).toHaveProperty("logs");
      });
    });
  });

  describe("Memory Usage Performance", () => {
    it("should handle memory usage efficiently during bulk operations", async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Create multiple projects
      const projectPromises = Array.from({ length: 100 }, (_, i) => {
        const projectData = {
          name: `Memory Test Project ${i}`,
          workspacePath: `/path/to/memory/test/${i}`,
          description: `Memory test project ${i}`,
        };

        return request(app).post("/api/projects").send(projectData);
      });

      await Promise.all(projectPromises);

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    it("should handle memory usage efficiently during concurrent operations", async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Perform concurrent operations
      const operationPromises = Array.from({ length: 50 }, (_, i) => {
        const projectData = {
          name: `Concurrent Memory Test Project ${i}`,
          workspacePath: `/path/to/concurrent/memory/test/${i}`,
          description: `Concurrent memory test project ${i}`,
        };

        return request(app).post("/api/projects").send(projectData);
      });

      await Promise.all(operationPromises);

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 25MB)
      expect(memoryIncrease).toBeLessThan(25 * 1024 * 1024);
    });
  });

  describe("Error Handling Performance", () => {
    it("should handle errors efficiently", async () => {
      const startTime = Date.now();
      const response = await request(app)
        .get("/api/projects/nonexistent-id")
        .expect(400);
      const endTime = Date.now();

      const responseTime = endTime - startTime;
      expect(responseTime).toBeLessThan(500); // Should handle errors within 500ms
      expect(response.body).toHaveProperty("error");
    });

    it("should handle validation errors efficiently", async () => {
      const invalidData = {
        name: "", // Invalid: empty name
        workspacePath: "/invalid/path",
      };

      const startTime = Date.now();
      const response = await request(app)
        .post("/api/projects")
        .send(invalidData)
        .expect(400);
      const endTime = Date.now();

      const responseTime = endTime - startTime;
      expect(responseTime).toBeLessThan(500); // Should handle validation errors within 500ms
      expect(response.body).toHaveProperty("error");
    });
  });
});
