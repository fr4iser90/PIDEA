/**
 * ProjectController Unit Tests
 *
 * Tests for ProjectController functionality including CRUD operations,
 * validation, error handling, and integration with ProjectApplicationService.
 */
const ProjectController = require("../../presentation/api/projects/ProjectController");

describe("ProjectController", () => {
  let controller;
  let mockProjectApplicationService;
  let mockLogger;

  beforeEach(() => {
    mockProjectApplicationService = {
      createProject: jest.fn(),
      getProject: jest.fn(),
      updateProject: jest.fn(),
      deleteProject: jest.fn(),
      listProjects: jest.fn(),
    };

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
    };

    controller = new ProjectController(mockProjectApplicationService);
  });

  describe("createProject", () => {
    it("should create a project successfully", async () => {
      const projectData = {
        name: "Test Project",
        workspacePath: "/path/to/project",
        description: "Test description",
      };

      const createdProject = {
        id: "1",
        ...projectData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockProjectApplicationService.createProject.mockResolvedValue(
        createdProject,
      );

      const req = { body: projectData };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await controller.createProject(req, res);

      expect(mockProjectApplicationService.createProject).toHaveBeenCalledWith(
        projectData,
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ project: createdProject });
    });

    it("should return validation errors for invalid data", async () => {
      const req = { body: { name: "", workspacePath: "" } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await controller.createProject(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: expect.any(Array) });
      expect(
        mockProjectApplicationService.createProject,
      ).not.toHaveBeenCalled();
    });

    it("should handle application service errors", async () => {
      const projectData = {
        name: "Test Project",
        workspacePath: "/path/to/project",
      };

      mockProjectApplicationService.createProject.mockRejectedValue(
        new Error("Database error"),
      );

      const req = { body: projectData };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await controller.createProject(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" });
    });
  });

  describe("getProject", () => {
    it("should return project if found", async () => {
      const project = { id: "1", name: "Test Project" };
      mockProjectApplicationService.getProject.mockResolvedValue(project);

      const req = { params: { projectId: "1" } };
      const res = { json: jest.fn() };

      await controller.getProject(req, res);

      expect(mockProjectApplicationService.getProject).toHaveBeenCalledWith(
        "1",
      );
      expect(res.json).toHaveBeenCalledWith({ project });
    });

    it("should return 404 if project not found", async () => {
      mockProjectApplicationService.getProject.mockResolvedValue(null);

      const req = { params: { projectId: "1" } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await controller.getProject(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Project not found" });
    });

    it("should handle application service errors", async () => {
      mockProjectApplicationService.getProject.mockRejectedValue(
        new Error("Database error"),
      );

      const req = { params: { projectId: "1" } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await controller.getProject(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" });
    });
  });

  describe("updateProject", () => {
    it("should update project successfully", async () => {
      const updates = {
        name: "Updated Project",
        description: "Updated description",
      };
      const updatedProject = { id: "1", ...updates, updatedAt: new Date() };
      mockProjectApplicationService.updateProject.mockResolvedValue(
        updatedProject,
      );

      const req = { params: { projectId: "1" }, body: updates };
      const res = { json: jest.fn() };

      await controller.updateProject(req, res);

      expect(mockProjectApplicationService.updateProject).toHaveBeenCalledWith(
        "1",
        updates,
      );
      expect(res.json).toHaveBeenCalledWith({ project: updatedProject });
    });

    it("should return validation errors for invalid updates", async () => {
      const req = {
        params: { projectId: "1" },
        body: { name: "", description: 123 },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await controller.updateProject(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: expect.any(Array) });
      expect(
        mockProjectApplicationService.updateProject,
      ).not.toHaveBeenCalled();
    });

    it("should return 404 if project not found", async () => {
      mockProjectApplicationService.updateProject.mockResolvedValue(null);

      const req = { params: { projectId: "1" }, body: { name: "Updated" } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await controller.updateProject(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Project not found" });
    });
  });

  describe("deleteProject", () => {
    it("should delete project successfully", async () => {
      mockProjectApplicationService.deleteProject.mockResolvedValue(true);

      const req = { params: { projectId: "1" } };
      const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };

      await controller.deleteProject(req, res);

      expect(mockProjectApplicationService.deleteProject).toHaveBeenCalledWith(
        "1",
      );
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });

    it("should return 404 if project not found", async () => {
      mockProjectApplicationService.deleteProject.mockResolvedValue(false);

      const req = { params: { projectId: "1" } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await controller.deleteProject(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Project not found" });
    });
  });

  describe("listProjects", () => {
    it("should list projects with pagination", async () => {
      const projects = [
        { id: "1", name: "Project 1" },
        { id: "2", name: "Project 2" },
      ];
      const result = { projects, total: 2 };
      mockProjectApplicationService.listProjects.mockResolvedValue(result);

      const req = { query: { page: "1", limit: "10", search: "test" } };
      const res = { json: jest.fn() };

      await controller.listProjects(req, res);

      expect(mockProjectApplicationService.listProjects).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        search: "test",
      });
      expect(res.json).toHaveBeenCalledWith({
        projects,
        pagination: { page: 1, limit: 10, total: 2 },
      });
    });

    it("should use default pagination values", async () => {
      const projects = [{ id: "1", name: "Project 1" }];
      const result = { projects, total: 1 };
      mockProjectApplicationService.listProjects.mockResolvedValue(result);

      const req = { query: {} };
      const res = { json: jest.fn() };

      await controller.listProjects(req, res);

      expect(mockProjectApplicationService.listProjects).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        search: undefined,
      });
    });

    it("should handle application service errors", async () => {
      mockProjectApplicationService.listProjects.mockRejectedValue(
        new Error("Database error"),
      );

      const req = { query: {} };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await controller.listProjects(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" });
    });
  });

  describe("validateProjectData", () => {
    it("should validate required fields for creation", () => {
      const data = { name: "Test", workspacePath: "/path" };
      const result = controller.validateProjectData(data, false);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should validate optional fields for updates", () => {
      const data = { description: "Updated description" };
      const result = controller.validateProjectData(data, true);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject invalid data types", () => {
      const data = { name: 123, workspacePath: null, description: 456 };
      const result = controller.validateProjectData(data, false);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Project name is required and must be a non-empty string",
      );
      expect(result.errors).toContain(
        "Workspace path is required and must be a string",
      );
      expect(result.errors).toContain("Description must be a string");
    });

    it("should reject empty strings for required fields", () => {
      const data = { name: "", workspacePath: "   " };
      const result = controller.validateProjectData(data, false);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Project name is required and must be a non-empty string",
      );
    });
  });
});
