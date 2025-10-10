# API Restructuring - Phase 4: Testing & Documentation

## 📋 Phase Overview
- **Phase**: 4 of 4
- **Title**: Testing & Documentation
- **Estimated Time**: 2 hours
- **Status**: Planning
- **Dependencies**: Phase 1, 2, and 3 completion
- **Created**: 2025-10-10T20:57:44.000Z

## 🎯 Objectives
Write comprehensive API tests, create OpenAPI/Swagger documentation, update API documentation, and perform performance testing for the restructured API.

## 📋 Implementation Tasks

### Task 4.1: Write Comprehensive API Tests (60 minutes)
- [ ] Create `backend/tests/integration/ProjectAPI.integration.test.js`
- [ ] Create `backend/tests/integration/InterfaceAPI.integration.test.js`
- [ ] Create `backend/tests/e2e/ProjectManagementAPI.test.js`
- [ ] Test all API endpoints and workflows
- [ ] Test error handling and edge cases

**Integration Test Structure**:
```javascript
const request = require('supertest');
const app = require('@/server');
const { setupTestDatabase, cleanupTestDatabase } = require('@/tests/helpers/database');

describe('Project API Integration Tests', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('POST /api/projects', () => {
    it('should create a new project', async () => {
      const projectData = {
        name: 'Test Project',
        workspacePath: '/path/to/project',
        description: 'Test project description'
      };

      const response = await request(app)
        .post('/api/projects')
        .send(projectData)
        .expect(201);

      expect(response.body).toHaveProperty('project');
      expect(response.body.project).toMatchObject({
        name: projectData.name,
        workspacePath: projectData.workspacePath,
        description: projectData.description
      });
      expect(response.body.project).toHaveProperty('id');
      expect(response.body.project).toHaveProperty('createdAt');
      expect(response.body.project).toHaveProperty('updatedAt');
    });

    it('should return validation errors for invalid data', async () => {
      const invalidData = {
        name: '',
        workspacePath: '',
        description: 123
      };

      const response = await request(app)
        .post('/api/projects')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(Array.isArray(response.body.error)).toBe(true);
      expect(response.body.error.length).toBeGreaterThan(0);
    });

    it('should handle duplicate project names', async () => {
      const projectData = {
        name: 'Duplicate Project',
        workspacePath: '/path/to/project1'
      };

      // Create first project
      await request(app)
        .post('/api/projects')
        .send(projectData)
        .expect(201);

      // Try to create duplicate
      const response = await request(app)
        .post('/api/projects')
        .send(projectData)
        .expect(409);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('already exists');
    });
  });

  describe('GET /api/projects', () => {
    it('should list all projects', async () => {
      const response = await request(app)
        .get('/api/projects')
        .expect(200);

      expect(response.body).toHaveProperty('projects');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.projects)).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/projects?page=1&limit=5')
        .expect(200);

      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 5
      });
    });

    it('should support search', async () => {
      const response = await request(app)
        .get('/api/projects?search=test')
        .expect(200);

      expect(response.body).toHaveProperty('projects');
      // Verify search results contain 'test'
    });
  });

  describe('GET /api/projects/:projectId', () => {
    it('should get a specific project', async () => {
      // First create a project
      const projectData = {
        name: 'Get Test Project',
        workspacePath: '/path/to/get-test'
      };

      const createResponse = await request(app)
        .post('/api/projects')
        .send(projectData)
        .expect(201);

      const projectId = createResponse.body.project.id;

      // Then get it
      const response = await request(app)
        .get(`/api/projects/${projectId}`)
        .expect(200);

      expect(response.body).toHaveProperty('project');
      expect(response.body.project.id).toBe(projectId);
      expect(response.body.project.name).toBe(projectData.name);
    });

    it('should return 404 for non-existent project', async () => {
      const response = await request(app)
        .get('/api/projects/non-existent-id')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Project not found');
    });
  });

  describe('PUT /api/projects/:projectId', () => {
    it('should update a project', async () => {
      // Create project first
      const projectData = {
        name: 'Update Test Project',
        workspacePath: '/path/to/update-test'
      };

      const createResponse = await request(app)
        .post('/api/projects')
        .send(projectData)
        .expect(201);

      const projectId = createResponse.body.project.id;

      // Update project
      const updateData = {
        name: 'Updated Project Name',
        description: 'Updated description'
      };

      const response = await request(app)
        .put(`/api/projects/${projectId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.project.name).toBe(updateData.name);
      expect(response.body.project.description).toBe(updateData.description);
    });
  });

  describe('DELETE /api/projects/:projectId', () => {
    it('should delete a project', async () => {
      // Create project first
      const projectData = {
        name: 'Delete Test Project',
        workspacePath: '/path/to/delete-test'
      };

      const createResponse = await request(app)
        .post('/api/projects')
        .send(projectData)
        .expect(201);

      const projectId = createResponse.body.project.id;

      // Delete project
      await request(app)
        .delete(`/api/projects/${projectId}`)
        .expect(204);

      // Verify it's deleted
      await request(app)
        .get(`/api/projects/${projectId}`)
        .expect(404);
    });
  });
});

describe('Interface API Integration Tests', () => {
  let testProjectId;

  beforeAll(async () => {
    await setupTestDatabase();
    
    // Create test project
    const projectData = {
      name: 'Interface Test Project',
      workspacePath: '/path/to/interface-test'
    };

    const response = await request(app)
      .post('/api/projects')
      .send(projectData)
      .expect(201);

    testProjectId = response.body.project.id;
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('POST /api/projects/:projectId/interfaces', () => {
    it('should create a new interface', async () => {
      const interfaceData = {
        name: 'Test Interface',
        type: 'vscode',
        configuration: { port: 3000 }
      };

      const response = await request(app)
        .post(`/api/projects/${testProjectId}/interfaces`)
        .send(interfaceData)
        .expect(201);

      expect(response.body).toHaveProperty('interface');
      expect(response.body.interface).toMatchObject({
        name: interfaceData.name,
        type: interfaceData.type,
        configuration: interfaceData.configuration
      });
    });

    it('should validate interface type', async () => {
      const interfaceData = {
        name: 'Invalid Interface',
        type: 'invalid-type',
        configuration: {}
      };

      const response = await request(app)
        .post(`/api/projects/${testProjectId}/interfaces`)
        .send(interfaceData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Interface type must be one of');
    });
  });

  describe('Interface Control Operations', () => {
    let testInterfaceId;

    beforeEach(async () => {
      // Create test interface
      const interfaceData = {
        name: 'Control Test Interface',
        type: 'vscode',
        configuration: { port: 3001 }
      };

      const response = await request(app)
        .post(`/api/projects/${testProjectId}/interfaces`)
        .send(interfaceData)
        .expect(201);

      testInterfaceId = response.body.interface.id;
    });

    it('should start an interface', async () => {
      const response = await request(app)
        .post(`/api/projects/${testProjectId}/interfaces/${testInterfaceId}/start`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('started successfully');
    });

    it('should stop an interface', async () => {
      const response = await request(app)
        .post(`/api/projects/${testProjectId}/interfaces/${testInterfaceId}/stop`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('stopped successfully');
    });

    it('should restart an interface', async () => {
      const response = await request(app)
        .post(`/api/projects/${testProjectId}/interfaces/${testInterfaceId}/restart`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('restarted successfully');
    });
  });
});
```

### Task 4.2: Create OpenAPI/Swagger Documentation (30 minutes)
- [ ] Create `backend/docs/api/openapi.yaml`
- [ ] Define all API endpoints and schemas
- [ ] Add request/response examples
- [ ] Add error response documentation
- [ ] Generate interactive API documentation

**OpenAPI Specification**:
```yaml
openapi: 3.0.0
info:
  title: PIDEA API
  description: Project-centric API for PIDEA development environment
  version: 2.0.0
  contact:
    name: PIDEA Team
    email: support@pidea.dev
  license:
    name: MIT
    url: https://opensource.org/licenses/MIT

servers:
  - url: http://localhost:3000/api
    description: Development server
  - url: https://api.pidea.dev
    description: Production server

paths:
  /projects:
    get:
      summary: List all projects
      description: Retrieve a paginated list of all projects
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            minimum: 1
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 10
        - name: search
          in: query
          schema:
            type: string
            description: Search term for project name or description
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ProjectListResponse'
              example:
                projects:
                  - id: "project-1"
                    name: "My Project"
                    workspacePath: "/path/to/project"
                    description: "A sample project"
                    createdAt: "2025-01-01T00:00:00Z"
                    updatedAt: "2025-01-01T00:00:00Z"
                pagination:
                  page: 1
                  limit: 10
                  total: 1
        '400':
          $ref: '#/components/responses/BadRequest'
        '500':
          $ref: '#/components/responses/InternalServerError'

    post:
      summary: Create a new project
      description: Create a new project with the specified details
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateProjectRequest'
            example:
              name: "New Project"
              workspacePath: "/path/to/new/project"
              description: "A new project description"
      responses:
        '201':
          description: Project created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ProjectResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '409':
          $ref: '#/components/responses/Conflict'
        '500':
          $ref: '#/components/responses/InternalServerError'

  /projects/{projectId}:
    get:
      summary: Get a specific project
      description: Retrieve details of a specific project by ID
      parameters:
        - name: projectId
          in: path
          required: true
          schema:
            type: string
          description: Unique identifier for the project
      responses:
        '200':
          description: Project found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ProjectResponse'
        '404':
          $ref: '#/components/responses/NotFound'
        '500':
          $ref: '#/components/responses/InternalServerError'

    put:
      summary: Update a project
      description: Update an existing project with new details
      parameters:
        - name: projectId
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdateProjectRequest'
      responses:
        '200':
          description: Project updated successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ProjectResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '404':
          $ref: '#/components/responses/NotFound'
        '500':
          $ref: '#/components/responses/InternalServerError'

    delete:
      summary: Delete a project
      description: Delete a project and all its associated data
      parameters:
        - name: projectId
          in: path
          required: true
          schema:
            type: string
      responses:
        '204':
          description: Project deleted successfully
        '404':
          $ref: '#/components/responses/NotFound'
        '500':
          $ref: '#/components/responses/InternalServerError'

  /projects/{projectId}/interfaces:
    get:
      summary: List project interfaces
      description: Retrieve all interfaces for a specific project
      parameters:
        - name: projectId
          in: path
          required: true
          schema:
            type: string
        - name: page
          in: query
          schema:
            type: integer
            minimum: 1
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 10
        - name: type
          in: query
          schema:
            type: string
            enum: [cursor, vscode, windsurf, jetbrains, sublime]
        - name: status
          in: query
          schema:
            type: string
            enum: [running, stopped, error, starting, stopping]
      responses:
        '200':
          description: Interfaces retrieved successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/InterfaceListResponse'
        '404':
          $ref: '#/components/responses/NotFound'
        '500':
          $ref: '#/components/responses/InternalServerError'

    post:
      summary: Create a new interface
      description: Create a new interface for a specific project
      parameters:
        - name: projectId
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateInterfaceRequest'
      responses:
        '201':
          description: Interface created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/InterfaceResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '404':
          $ref: '#/components/responses/NotFound'
        '500':
          $ref: '#/components/responses/InternalServerError'

components:
  schemas:
    Project:
      type: object
      required:
        - id
        - name
        - workspacePath
        - createdAt
        - updatedAt
      properties:
        id:
          type: string
          description: Unique identifier for the project
        name:
          type: string
          description: Project name
        workspacePath:
          type: string
          description: File system path to the project workspace
        description:
          type: string
          description: Project description
        createdAt:
          type: string
          format: date-time
          description: Project creation timestamp
        updatedAt:
          type: string
          format: date-time
          description: Project last update timestamp

    Interface:
      type: object
      required:
        - id
        - name
        - type
        - status
        - projectId
        - createdAt
        - updatedAt
      properties:
        id:
          type: string
          description: Unique identifier for the interface
        name:
          type: string
          description: Interface name
        type:
          type: string
          enum: [cursor, vscode, windsurf, jetbrains, sublime]
          description: Interface type
        status:
          type: string
          enum: [running, stopped, error, starting, stopping]
          description: Current interface status
        projectId:
          type: string
          description: ID of the parent project
        configuration:
          type: object
          description: Interface configuration
        port:
          type: integer
          description: Network port for the interface
        pid:
          type: integer
          description: Process ID of the interface
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time

    CreateProjectRequest:
      type: object
      required:
        - name
        - workspacePath
      properties:
        name:
          type: string
          minLength: 1
          maxLength: 100
        workspacePath:
          type: string
          minLength: 1
        description:
          type: string
          maxLength: 500

    UpdateProjectRequest:
      type: object
      properties:
        name:
          type: string
          minLength: 1
          maxLength: 100
        workspacePath:
          type: string
          minLength: 1
        description:
          type: string
          maxLength: 500

    CreateInterfaceRequest:
      type: object
      required:
        - name
        - type
      properties:
        name:
          type: string
          minLength: 1
          maxLength: 100
        type:
          type: string
          enum: [cursor, vscode, windsurf, jetbrains, sublime]
        configuration:
          type: object

    ProjectResponse:
      type: object
      properties:
        project:
          $ref: '#/components/schemas/Project'

    ProjectListResponse:
      type: object
      properties:
        projects:
          type: array
          items:
            $ref: '#/components/schemas/Project'
        pagination:
          type: object
          properties:
            page:
              type: integer
            limit:
              type: integer
            total:
              type: integer

    InterfaceResponse:
      type: object
      properties:
        interface:
          $ref: '#/components/schemas/Interface'

    InterfaceListResponse:
      type: object
      properties:
        interfaces:
          type: array
          items:
            $ref: '#/components/schemas/Interface'
        pagination:
          type: object
          properties:
            page:
              type: integer
            limit:
              type: integer
            total:
              type: integer
            projectId:
              type: string

    Error:
      type: object
      properties:
        error:
          oneOf:
            - type: string
            - type: array
              items:
                type: string

  responses:
    BadRequest:
      description: Bad request
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            error: "Validation failed"

    NotFound:
      description: Resource not found
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            error: "Resource not found"

    Conflict:
      description: Resource conflict
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            error: "Resource already exists"

    InternalServerError:
      description: Internal server error
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            error: "Internal server error"

  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

security:
  - BearerAuth: []
```

### Task 4.3: Update API Documentation (30 minutes)
- [ ] Update `backend/README.md` with new API structure
- [ ] Create `backend/docs/API.md` with comprehensive API documentation
- [ ] Add migration guide from legacy APIs
- [ ] Add troubleshooting guide
- [ ] Add performance benchmarks

**API Documentation**:
```markdown
# PIDEA API Documentation

## Overview

The PIDEA API provides a project-centric interface for managing development environments. The API follows RESTful principles and uses JSON for request and response bodies.

## Base URL

- Development: `http://localhost:3000/api`
- Production: `https://api.pidea.dev`

## Authentication

All API requests require authentication using Bearer tokens:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" https://api.pidea.dev/projects
```

## Project Management

### Create Project

Create a new project with the specified details.

**Endpoint:** `POST /projects`

**Request Body:**
```json
{
  "name": "My Project",
  "workspacePath": "/path/to/project",
  "description": "Project description"
}
```

**Response:**
```json
{
  "project": {
    "id": "project-123",
    "name": "My Project",
    "workspacePath": "/path/to/project",
    "description": "Project description",
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z"
  }
}
```

### List Projects

Retrieve a paginated list of all projects.

**Endpoint:** `GET /projects`

**Query Parameters:**
- `page` (integer): Page number (default: 1)
- `limit` (integer): Items per page (default: 10, max: 100)
- `search` (string): Search term for project name or description

**Response:**
```json
{
  "projects": [
    {
      "id": "project-123",
      "name": "My Project",
      "workspacePath": "/path/to/project",
      "description": "Project description",
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1
  }
}
```

## Interface Management

### Create Interface

Create a new interface for a specific project.

**Endpoint:** `POST /projects/{projectId}/interfaces`

**Request Body:**
```json
{
  "name": "My Interface",
  "type": "vscode",
  "configuration": {
    "port": 3000,
    "extensions": ["ms-python.python"]
  }
}
```

**Response:**
```json
{
  "interface": {
    "id": "interface-456",
    "name": "My Interface",
    "type": "vscode",
    "status": "stopped",
    "projectId": "project-123",
    "configuration": {
      "port": 3000,
      "extensions": ["ms-python.python"]
    },
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z"
  }
}
```

### Start Interface

Start a specific interface.

**Endpoint:** `POST /projects/{projectId}/interfaces/{interfaceId}/start`

**Response:**
```json
{
  "message": "Interface started successfully",
  "interface": {
    "id": "interface-456",
    "status": "running",
    "port": 3000,
    "pid": 12345
  }
}
```

## Error Handling

The API uses standard HTTP status codes and returns error details in JSON format:

```json
{
  "error": "Validation failed"
}
```

Common status codes:
- `200` - Success
- `201` - Created
- `204` - No Content
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `409` - Conflict
- `500` - Internal Server Error

## API Replacement

### Complete API Replacement

The IDE-centric API has been completely replaced with a project-centric approach:

**Removed:** `GET /api/ide/list`
**New:** `GET /api/projects`

**Removed:** `POST /api/ide/:port/start`
**New:** `POST /api/projects/:projectId/interfaces/:interfaceId/start`

All legacy endpoints have been permanently removed. Use only the new project-centric API.

## Performance

API performance benchmarks:

- Project creation: < 200ms
- Project listing: < 100ms
- Interface operations: < 500ms
- Concurrent requests: 100+ per second

## Rate Limiting

API requests are rate limited:
- 1000 requests per hour per user
- 100 requests per minute per endpoint

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Request limit
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Reset time
```

### Task 4.4: Performance Testing (30 minutes)
- [ ] Create `backend/tests/performance/APIPerformance.test.js`
- [ ] Test API response times
- [ ] Test concurrent request handling
- [ ] Test memory usage
- [ ] Generate performance reports

**Performance Test Structure**:
```javascript
const request = require('supertest');
const app = require('@/server');
const { performance } = require('perf_hooks');

describe('API Performance Tests', () => {
  describe('Response Time Tests', () => {
    it('should respond to project creation within 200ms', async () => {
      const projectData = {
        name: 'Performance Test Project',
        workspacePath: '/path/to/performance-test'
      };

      const startTime = performance.now();
      
      const response = await request(app)
        .post('/api/projects')
        .send(projectData)
        .expect(201);

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(200);
      expect(response.body).toHaveProperty('project');
    });

    it('should respond to project listing within 100ms', async () => {
      const startTime = performance.now();
      
      const response = await request(app)
        .get('/api/projects')
        .expect(200);

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(100);
      expect(response.body).toHaveProperty('projects');
    });

    it('should handle interface operations within 500ms', async () => {
      // Create project and interface first
      const projectData = {
        name: 'Interface Performance Test',
        workspacePath: '/path/to/interface-performance'
      };

      const projectResponse = await request(app)
        .post('/api/projects')
        .send(projectData)
        .expect(201);

      const projectId = projectResponse.body.project.id;

      const interfaceData = {
        name: 'Performance Interface',
        type: 'vscode',
        configuration: { port: 3000 }
      };

      const interfaceResponse = await request(app)
        .post(`/api/projects/${projectId}/interfaces`)
        .send(interfaceData)
        .expect(201);

      const interfaceId = interfaceResponse.body.interface.id;

      // Test interface start performance
      const startTime = performance.now();
      
      const response = await request(app)
        .post(`/api/projects/${projectId}/interfaces/${interfaceId}/start`)
        .expect(200);

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(500);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Concurrent Request Tests', () => {
    it('should handle 100 concurrent project creation requests', async () => {
      const concurrentRequests = 100;
      const projectData = {
        name: 'Concurrent Test Project',
        workspacePath: '/path/to/concurrent-test'
      };

      const startTime = performance.now();
      
      const promises = Array.from({ length: concurrentRequests }, (_, i) => 
        request(app)
          .post('/api/projects')
          .send({
            ...projectData,
            name: `${projectData.name} ${i}`
          })
      );

      const responses = await Promise.all(promises);
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Check all requests succeeded
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('project');
      });

      // Check performance
      expect(totalTime).toBeLessThan(10000); // 10 seconds for 100 requests
      
      console.log(`Processed ${concurrentRequests} concurrent requests in ${totalTime}ms`);
      console.log(`Average response time: ${totalTime / concurrentRequests}ms`);
    });

    it('should handle 50 concurrent interface operations', async () => {
      // Create test project and interfaces
      const projectData = {
        name: 'Concurrent Interface Test',
        workspacePath: '/path/to/concurrent-interface-test'
      };

      const projectResponse = await request(app)
        .post('/api/projects')
        .send(projectData)
        .expect(201);

      const projectId = projectResponse.body.project.id;

      // Create multiple interfaces
      const interfacePromises = Array.from({ length: 10 }, (_, i) =>
        request(app)
          .post(`/api/projects/${projectId}/interfaces`)
          .send({
            name: `Concurrent Interface ${i}`,
            type: 'vscode',
            configuration: { port: 3000 + i }
          })
      );

      const interfaceResponses = await Promise.all(interfacePromises);
      const interfaceIds = interfaceResponses.map(response => response.body.interface.id);

      // Test concurrent start operations
      const startTime = performance.now();
      
      const startPromises = interfaceIds.map(interfaceId =>
        request(app)
          .post(`/api/projects/${projectId}/interfaces/${interfaceId}/start`)
      );

      const startResponses = await Promise.all(startPromises);
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Check all operations succeeded
      startResponses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message');
      });

      // Check performance
      expect(totalTime).toBeLessThan(5000); // 5 seconds for 10 interface operations
      
      console.log(`Processed ${interfaceIds.length} concurrent interface operations in ${totalTime}ms`);
    });
  });

  describe('Memory Usage Tests', () => {
    it('should not exceed memory limits during bulk operations', async () => {
      const initialMemory = process.memoryUsage();
      
      // Perform bulk operations
      const bulkPromises = Array.from({ length: 50 }, (_, i) =>
        request(app)
          .post('/api/projects')
          .send({
            name: `Bulk Test Project ${i}`,
            workspacePath: `/path/to/bulk-test-${i}`
          })
      );

      await Promise.all(bulkPromises);
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Check memory increase is reasonable (less than 100MB)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
      
      console.log(`Memory increase: ${memoryIncrease / 1024 / 1024}MB`);
    });
  });
});
```

## 🔧 Technical Implementation Details

### Testing Strategy
- **Integration Tests**: Full API workflow testing
- **Performance Tests**: Response time and throughput testing
- **Load Tests**: Concurrent request handling
- **Memory Tests**: Memory usage monitoring

### Documentation Strategy
- **OpenAPI/Swagger**: Interactive API documentation
- **README Updates**: Comprehensive API guide
- **Migration Guide**: Legacy API migration instructions
- **Performance Benchmarks**: API performance metrics

## 🧪 Testing Strategy

### Integration Tests
- **File**: `backend/tests/integration/ProjectAPI.integration.test.js`
- **File**: `backend/tests/integration/InterfaceAPI.integration.test.js`
- **Coverage**: 90%+ for all API endpoints
- **Test Scenarios**: CRUD operations, error handling, edge cases

### Performance Tests
- **File**: `backend/tests/performance/APIPerformance.test.js`
- **Metrics**: Response time, throughput, memory usage
- **Benchmarks**: < 200ms for project operations, < 500ms for interface operations

### E2E Tests
- **File**: `backend/tests/e2e/ProjectManagementAPI.test.js`
- **Coverage**: 80%+ for complete workflows
- **Test Scenarios**: Full project and interface management workflows

## 📊 Success Criteria
- [ ] All integration tests pass (90%+ coverage)
- [ ] All performance tests meet benchmarks
- [ ] OpenAPI/Swagger documentation complete
- [ ] API documentation updated
- [ ] Migration guide created
- [ ] Performance benchmarks documented
- [ ] No build errors or linting issues

## 🔄 Integration Points
- **API Endpoints**: All project and interface endpoints
- **Documentation**: OpenAPI, README, migration guide
- **Testing**: Integration, performance, E2E tests
- **Monitoring**: Performance metrics and logging

## 📝 Notes
- Focus on comprehensive test coverage
- Ensure performance meets requirements
- Document all API changes thoroughly
- Provide clear migration path from legacy APIs

## 🚀 Completion
After completing Phase 4, the API Restructuring will be complete and ready for production deployment with comprehensive testing and documentation.
