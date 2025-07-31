/**
 * Integration tests for Analysis Orchestrators
 * 
 * Created: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
 * Purpose: Test integration of all analysis orchestrators with the workflow system
 */

const request = require('supertest');
const express = require('express');
const path = require('path');

// Import test utilities
const { setupTestDatabase, cleanupTestDatabase } = require('../setup');
const { createTestProject, createTestUser } = require('../utils/testHelpers');

// Import application components
const AnalysisApplicationService = require('@application/services/AnalysisApplicationService');
const AnalysisController = require('@presentation/api/AnalysisController');
const WorkflowController = require('@presentation/api/WorkflowController');
const AnalysisRoutes = require('@presentation/api/routes/analysis');

describe('Analysis Orchestrators Integration', () => {
  let app;
  let testProjectId;
  let testUserId;
  let analysisApplicationService;
  let analysisController;
  let workflowController;

  beforeAll(async () => {
    // Setup test database
    await setupTestDatabase();
    
    // Create test data
    testUserId = await createTestUser();
    testProjectId = await createTestProject(testUserId);
    
    // Initialize services
    analysisApplicationService = new AnalysisApplicationService({
      analysisOutputService: null,
      analysisRepository: null,
      projectRepository: null,
      logger: console
    });
    
    analysisController = new AnalysisController(analysisApplicationService);
    workflowController = new WorkflowController({
      analysisApplicationService,
      logger: console
    });
    
    // Setup Express app
    app = express();
    app.use(express.json());
    
    // Setup routes
    const analysisRoutes = new AnalysisRoutes(
      workflowController,
      analysisController,
      { authenticate: () => (req, res, next) => next() },
      null
    );
    analysisRoutes.setupRoutes(app);
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('Code Quality Analysis Orchestrator', () => {
    it('should execute code quality analysis workflow', async () => {
      const response = await request(app)
        .post(`/api/projects/${testProjectId}/analysis/code-quality`)
        .send({
          mode: 'code-quality-analysis',
          options: {
            includeLinting: true,
            includeComplexity: true,
            includeCoverage: true,
            includeDocumentation: true
          }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.message).toContain('Code quality analysis completed');
    });

    it('should return code quality recommendations', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProjectId}/analysis/code-quality/recommendations`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.category).toBe('code-quality');
      expect(Array.isArray(response.body.data.recommendations)).toBe(true);
    });

    it('should return code quality issues', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProjectId}/analysis/code-quality/issues`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.category).toBe('code-quality');
      expect(Array.isArray(response.body.data.issues)).toBe(true);
    });

    it('should return code quality metrics', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProjectId}/analysis/code-quality/metrics`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.category).toBe('code-quality');
      expect(response.body.data.metrics).toBeDefined();
    });

    it('should return code quality summary', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProjectId}/analysis/code-quality/summary`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.category).toBe('code-quality');
      expect(response.body.data.summary).toBeDefined();
    });

    it('should return code quality results', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProjectId}/analysis/code-quality/results`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.category).toBe('code-quality');
      expect(response.body.data.results).toBeDefined();
    });
  });

  describe('Dependency Analysis Orchestrator', () => {
    it('should execute dependency analysis workflow', async () => {
      const response = await request(app)
        .post(`/api/projects/${testProjectId}/analysis/dependencies`)
        .send({
          mode: 'dependency-analysis',
          options: {
            includeOutdated: true,
            includeVulnerabilities: true,
            includeUnused: true,
            includeLicense: true
          }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.message).toContain('Dependency analysis completed');
    });

    it('should return dependency recommendations', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProjectId}/analysis/dependencies/recommendations`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.category).toBe('dependencies');
      expect(Array.isArray(response.body.data.recommendations)).toBe(true);
    });

    it('should return dependency issues', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProjectId}/analysis/dependencies/issues`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.category).toBe('dependencies');
      expect(Array.isArray(response.body.data.issues)).toBe(true);
    });

    it('should return dependency metrics', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProjectId}/analysis/dependencies/metrics`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.category).toBe('dependencies');
      expect(response.body.data.metrics).toBeDefined();
    });

    it('should return dependency summary', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProjectId}/analysis/dependencies/summary`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.category).toBe('dependencies');
      expect(response.body.data.summary).toBeDefined();
    });

    it('should return dependency results', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProjectId}/analysis/dependencies/results`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.category).toBe('dependencies');
      expect(response.body.data.results).toBeDefined();
    });
  });

  describe('Manifest Analysis Orchestrator', () => {
    it('should execute manifest analysis workflow', async () => {
      const response = await request(app)
        .post(`/api/projects/${testProjectId}/analysis/manifest`)
        .send({
          mode: 'manifest-analysis',
          options: {
            includePackageJson: true,
            includeConfigFiles: true,
            includeDockerFiles: true,
            includeCIFiles: true
          }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.message).toContain('Manifest analysis completed');
    });

    it('should return manifest recommendations', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProjectId}/analysis/manifest/recommendations`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.category).toBe('manifest');
      expect(Array.isArray(response.body.data.recommendations)).toBe(true);
    });

    it('should return manifest issues', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProjectId}/analysis/manifest/issues`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.category).toBe('manifest');
      expect(Array.isArray(response.body.data.issues)).toBe(true);
    });

    it('should return manifest metrics', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProjectId}/analysis/manifest/metrics`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.category).toBe('manifest');
      expect(response.body.data.metrics).toBeDefined();
    });

    it('should return manifest summary', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProjectId}/analysis/manifest/summary`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.category).toBe('manifest');
      expect(response.body.data.summary).toBeDefined();
    });

    it('should return manifest results', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProjectId}/analysis/manifest/results`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.category).toBe('manifest');
      expect(response.body.data.results).toBeDefined();
    });
  });

  describe('Tech Stack Analysis Orchestrator', () => {
    it('should execute tech stack analysis workflow', async () => {
      const response = await request(app)
        .post(`/api/projects/${testProjectId}/analysis/tech-stack`)
        .send({
          mode: 'tech-stack-analysis',
          options: {
            includeFrameworks: true,
            includeLibraries: true,
            includeTools: true,
            includeVersions: true
          }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.message).toContain('Tech stack analysis completed');
    });

    it('should return tech stack recommendations', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProjectId}/analysis/tech-stack/recommendations`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.category).toBe('tech-stack');
      expect(Array.isArray(response.body.data.recommendations)).toBe(true);
    });

    it('should return tech stack issues', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProjectId}/analysis/tech-stack/issues`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.category).toBe('tech-stack');
      expect(Array.isArray(response.body.data.issues)).toBe(true);
    });

    it('should return tech stack metrics', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProjectId}/analysis/tech-stack/metrics`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.category).toBe('tech-stack');
      expect(response.body.data.metrics).toBeDefined();
    });

    it('should return tech stack summary', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProjectId}/analysis/tech-stack/summary`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.category).toBe('tech-stack');
      expect(response.body.data.summary).toBeDefined();
    });

    it('should return tech stack results', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProjectId}/analysis/tech-stack/results`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.category).toBe('tech-stack');
      expect(response.body.data.results).toBeDefined();
    });
  });

  describe('Workflow Integration', () => {
    it('should execute comprehensive analysis workflow', async () => {
      const response = await request(app)
        .post(`/api/projects/${testProjectId}/analysis/execute`)
        .send({
          mode: 'analysis',
          options: {
            includeCodeQuality: true,
            includeDependencies: true,
            includeManifest: true,
            includeTechStack: true,
            includeSecurity: true,
            includePerformance: true,
            includeArchitecture: true
          }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should handle analysis workflow status', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProjectId}/analysis/status`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should handle analysis workflow metrics', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProjectId}/analysis/metrics`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });
}); 