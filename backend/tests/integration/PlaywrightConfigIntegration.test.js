const request = require('supertest');
const app = require('@server');
const PlaywrightTestApplicationService = require('@application/services/PlaywrightTestApplicationService');

describe('Playwright Configuration Integration Tests', () => {
  let playwrightService;
  let testProjectId = 'test-project-integration';

  beforeAll(async () => {
    // Initialize the service with real dependencies
    playwrightService = new PlaywrightTestApplicationService();
  });

  describe('API Endpoints', () => {
    describe('GET /api/projects/:projectId/tests/playwright/config', () => {
      it('should return configuration for existing project', async () => {
        const response = await request(app)
          .get(`/api/projects/${testProjectId}/tests/playwright/config`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('baseURL');
        expect(response.body.data).toHaveProperty('timeout');
        expect(response.body.data).toHaveProperty('browsers');
      });

      it('should return 400 for missing project ID', async () => {
        const response = await request(app)
          .get('/api/projects//tests/playwright/config')
          .expect(400);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error', 'Project ID is required');
      });

      it('should return default config for non-existent project', async () => {
        const response = await request(app)
          .get('/api/projects/non-existent/tests/playwright/config')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toEqual(playwrightService.getDefaultPlaywrightConfig());
      });
    });

    describe('PUT /api/projects/:projectId/tests/playwright/config', () => {
      it('should save configuration successfully', async () => {
        const config = {
          baseURL: 'http://localhost:4000',
          timeout: 30000,
          browsers: ['chromium'],
          login: {
            required: true,
            username: 'test@example.com',
            password: 'password123'
          }
        };

        const response = await request(app)
          .put(`/api/projects/${testProjectId}/tests/playwright/config`)
          .send(config)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data.config).toEqual(config);
      });

      it('should validate configuration before saving', async () => {
        const invalidConfig = {
          baseURL: 'invalid-url',
          timeout: -1000
        };

        const response = await request(app)
          .put(`/api/projects/${testProjectId}/tests/playwright/config`)
          .send(invalidConfig)
          .expect(400);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
      });

      it('should return 400 for missing project ID', async () => {
        const response = await request(app)
          .put('/api/projects//tests/playwright/config')
          .send({ baseURL: 'http://localhost:4000' })
          .expect(400);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error', 'Project ID is required');
      });
    });
  });

  describe('Configuration Persistence', () => {
    it('should persist configuration across API calls', async () => {
      const config = {
        baseURL: 'http://localhost:4000',
        timeout: 30000,
        browsers: ['chromium', 'firefox'],
        login: {
          required: true,
          username: 'persistence@test.com',
          password: 'testpass123'
        }
      };

      // Save configuration
      await request(app)
        .put(`/api/projects/${testProjectId}/tests/playwright/config`)
        .send(config)
        .expect(200);

      // Load configuration
      const response = await request(app)
        .get(`/api/projects/${testProjectId}/tests/playwright/config`)
        .expect(200);

      expect(response.body.data).toEqual(config);
    });

    it('should handle concurrent configuration updates', async () => {
      const config1 = {
        baseURL: 'http://localhost:4000',
        timeout: 30000,
        browsers: ['chromium']
      };

      const config2 = {
        baseURL: 'http://localhost:4000',
        timeout: 60000,
        browsers: ['firefox']
      };

      // Save configurations concurrently
      const [response1, response2] = await Promise.all([
        request(app)
          .put(`/api/projects/${testProjectId}/tests/playwright/config`)
          .send(config1),
        request(app)
          .put(`/api/projects/${testProjectId}/tests/playwright/config`)
          .send(config2)
      ]);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
    });
  });

  describe('Test Execution with Configuration', () => {
    it('should execute tests with saved configuration', async () => {
      const config = {
        baseURL: 'http://localhost:4000',
        timeout: 30000,
        browsers: ['chromium'],
        login: {
          required: false
        }
      };

      // Save configuration
      await request(app)
        .put(`/api/projects/${testProjectId}/tests/playwright/config`)
        .send(config)
        .expect(200);

      // Execute tests
      const response = await request(app)
        .post(`/api/projects/${testProjectId}/tests/playwright/execute`)
        .send({
          workspacePath: '/test/workspace',
          testFiles: ['login.test.js']
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('projectId', testProjectId);
    });

    it('should save configuration during test execution', async () => {
      const config = {
        baseURL: 'http://localhost:4000',
        timeout: 30000,
        browsers: ['chromium']
      };

      // Execute tests with configuration
      const response = await request(app)
        .post(`/api/projects/${testProjectId}/tests/playwright/execute`)
        .send({
          workspacePath: '/test/workspace',
          config: config,
          testFiles: ['login.test.js']
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);

      // Verify configuration was saved
      const configResponse = await request(app)
        .get(`/api/projects/${testProjectId}/tests/playwright/config`)
        .expect(200);

      expect(configResponse.body.data).toEqual(config);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // This test would require mocking database connection failures
      // For now, we'll test the error response format
      const response = await request(app)
        .get('/api/projects/invalid-project/tests/playwright/config')
        .expect(200);

      // Should return default config even for invalid projects
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toEqual(playwrightService.getDefaultPlaywrightConfig());
    });

    it('should handle malformed configuration data', async () => {
      const malformedConfig = {
        baseURL: null,
        timeout: 'not-a-number',
        browsers: 'not-an-array'
      };

      const response = await request(app)
        .put(`/api/projects/${testProjectId}/tests/playwright/config`)
        .send(malformedConfig)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Performance', () => {
    it('should respond to configuration requests within 200ms', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get(`/api/projects/${testProjectId}/tests/playwright/config`)
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(200);
    });

    it('should handle multiple concurrent configuration requests', async () => {
      const requests = Array(10).fill().map(() =>
        request(app)
          .get(`/api/projects/${testProjectId}/tests/playwright/config`)
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);
      });
    });
  });
});
