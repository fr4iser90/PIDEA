const request = require('supertest');
const { Application } = require('../../Application');
const { DatabaseConnection } = require('../../infrastructure/database/DatabaseConnection');
const { AnalysisRepository } = require('../../domain/repositories/AnalysisRepository');
const { AnalysisStepRepository } = require('../../domain/repositories/AnalysisStepRepository');

describe('Analysis Integration Tests - Techstack & Recommendations', () => {
  let app;
  let server;
  let dbConnection;
  let analysisRepository;
  let analysisStepRepository;

  beforeAll(async () => {
    // Initialize database connection
    dbConnection = new DatabaseConnection();
    await dbConnection.connect();

    // Initialize repositories
    analysisRepository = new AnalysisRepository(dbConnection);
    analysisStepRepository = new AnalysisStepRepository(dbConnection);

    // Initialize application
    app = new Application();
    await app.initialize();
    server = app.getServer();
  });

  afterAll(async () => {
    if (server) {
      await new Promise(resolve => server.close(resolve));
    }
    if (dbConnection) {
      await dbConnection.disconnect();
    }
  });

  beforeEach(async () => {
    // Clean up test data
    await analysisRepository.deleteAll();
    await analysisStepRepository.deleteAll();
  });

  describe('POST /api/analysis/techstack', () => {
    it('should create and queue techstack analysis', async () => {
      const analysisData = {
        projectId: 'test-project-123',
        projectPath: '/test/project/path',
        analysisType: 'techstack',
        priority: 'high',
        metadata: {
          framework: 'react',
          language: 'javascript'
        }
      };

      const response = await request(server)
        .post('/api/analysis/techstack')
        .send(analysisData)
        .expect(201);

      expect(response.body).toHaveProperty('analysisId');
      expect(response.body).toHaveProperty('status', 'queued');
      expect(response.body).toHaveProperty('analysisType', 'techstack');
      expect(response.body).toHaveProperty('projectId', analysisData.projectId);

      // Verify analysis was created in database
      const analysis = await analysisRepository.findById(response.body.analysisId);
      expect(analysis).toBeTruthy();
      expect(analysis.analysisType).toBe('techstack');
      expect(analysis.status).toBe('queued');
    });

    it('should handle invalid project data', async () => {
      const invalidData = {
        projectId: '',
        projectPath: '/invalid/path'
      };

      const response = await request(server)
        .post('/api/analysis/techstack')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Project ID is required');
    });

    it('should handle duplicate analysis requests', async () => {
      const analysisData = {
        projectId: 'duplicate-test-123',
        projectPath: '/test/project/path',
        analysisType: 'techstack'
      };

      // First request
      const response1 = await request(server)
        .post('/api/analysis/techstack')
        .send(analysisData)
        .expect(201);

      // Second request for same project
      const response2 = await request(server)
        .post('/api/analysis/techstack')
        .send(analysisData)
        .expect(409);

      expect(response2.body).toHaveProperty('error');
      expect(response2.body.error).toContain('Analysis already exists');
    });
  });

  describe('POST /api/analysis/recommendations', () => {
    it('should create and queue recommendations analysis', async () => {
      const analysisData = {
        projectId: 'test-project-456',
        projectPath: '/test/project/path',
        analysisType: 'recommendations',
        priority: 'medium',
        metadata: {
          currentTechstack: ['react', 'nodejs'],
          targetFeatures: ['authentication', 'database']
        }
      };

      const response = await request(server)
        .post('/api/analysis/recommendations')
        .send(analysisData)
        .expect(201);

      expect(response.body).toHaveProperty('analysisId');
      expect(response.body).toHaveProperty('status', 'queued');
      expect(response.body).toHaveProperty('analysisType', 'recommendations');
      expect(response.body).toHaveProperty('projectId', analysisData.projectId);

      // Verify analysis was created in database
      const analysis = await analysisRepository.findById(response.body.analysisId);
      expect(analysis).toBeTruthy();
      expect(analysis.analysisType).toBe('recommendations');
      expect(analysis.status).toBe('queued');
    });

    it('should handle recommendations analysis with techstack context', async () => {
      const analysisData = {
        projectId: 'recommendations-context-789',
        projectPath: '/test/project/path',
        analysisType: 'recommendations',
        metadata: {
          existingTechstack: ['react', 'express', 'mongodb'],
          projectGoals: ['scalability', 'performance'],
          constraints: ['budget', 'timeline']
        }
      };

      const response = await request(server)
        .post('/api/analysis/recommendations')
        .send(analysisData)
        .expect(201);

      expect(response.body).toHaveProperty('analysisId');
      expect(response.body.metadata).toHaveProperty('existingTechstack');
      expect(response.body.metadata).toHaveProperty('projectGoals');
    });
  });

  describe('GET /api/analysis/techstack/:projectId', () => {
    it('should retrieve techstack analysis results', async () => {
      // First create an analysis
      const analysisData = {
        projectId: 'get-techstack-test',
        projectPath: '/test/project/path',
        analysisType: 'techstack'
      };

      const createResponse = await request(server)
        .post('/api/analysis/techstack')
        .send(analysisData)
        .expect(201);

      // Then retrieve it
      const response = await request(server)
        .get(`/api/analysis/techstack/${analysisData.projectId}`)
        .expect(200);

      expect(response.body).toHaveProperty('analysisId');
      expect(response.body).toHaveProperty('projectId', analysisData.projectId);
      expect(response.body).toHaveProperty('analysisType', 'techstack');
    });

    it('should return 404 for non-existent analysis', async () => {
      const response = await request(server)
        .get('/api/analysis/techstack/non-existent-project')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Analysis not found');
    });
  });

  describe('GET /api/analysis/recommendations/:projectId', () => {
    it('should retrieve recommendations analysis results', async () => {
      // First create an analysis
      const analysisData = {
        projectId: 'get-recommendations-test',
        projectPath: '/test/project/path',
        analysisType: 'recommendations'
      };

      const createResponse = await request(server)
        .post('/api/analysis/recommendations')
        .send(analysisData)
        .expect(201);

      // Then retrieve it
      const response = await request(server)
        .get(`/api/analysis/recommendations/${analysisData.projectId}`)
        .expect(200);

      expect(response.body).toHaveProperty('analysisId');
      expect(response.body).toHaveProperty('projectId', analysisData.projectId);
      expect(response.body).toHaveProperty('analysisType', 'recommendations');
    });
  });

  describe('Analysis Queue Integration', () => {
    it('should process techstack analysis through queue', async () => {
      const analysisData = {
        projectId: 'queue-techstack-test',
        projectPath: '/test/project/path',
        analysisType: 'techstack'
      };

      // Create analysis
      const createResponse = await request(server)
        .post('/api/analysis/techstack')
        .send(analysisData)
        .expect(201);

      // Wait for processing (simulate queue processing)
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check if analysis was processed
      const analysis = await analysisRepository.findById(createResponse.body.analysisId);
      expect(analysis).toBeTruthy();
      expect(['queued', 'processing', 'completed']).toContain(analysis.status);
    });

    it('should process recommendations analysis through queue', async () => {
      const analysisData = {
        projectId: 'queue-recommendations-test',
        projectPath: '/test/project/path',
        analysisType: 'recommendations'
      };

      // Create analysis
      const createResponse = await request(server)
        .post('/api/analysis/recommendations')
        .send(analysisData)
        .expect(201);

      // Wait for processing (simulate queue processing)
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check if analysis was processed
      const analysis = await analysisRepository.findById(createResponse.body.analysisId);
      expect(analysis).toBeTruthy();
      expect(['queued', 'processing', 'completed']).toContain(analysis.status);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // Temporarily disconnect database
      await dbConnection.disconnect();

      const analysisData = {
        projectId: 'db-error-test',
        projectPath: '/test/project/path',
        analysisType: 'techstack'
      };

      const response = await request(server)
        .post('/api/analysis/techstack')
        .send(analysisData)
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Database error');

      // Reconnect database
      await dbConnection.connect();
    });

    it('should handle invalid analysis types', async () => {
      const invalidData = {
        projectId: 'invalid-type-test',
        projectPath: '/test/project/path',
        analysisType: 'invalid-type'
      };

      const response = await request(server)
        .post('/api/analysis/techstack')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid analysis type');
    });
  });
}); 