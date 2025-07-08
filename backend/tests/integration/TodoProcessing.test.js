const request = require('supertest');
const Application = require('@/Application');

describe('TODO Processing Integration', () => {
  let app;
  let server;

  beforeAll(async () => {
    app = new Application({ port: 0 });
    await app.initialize();
    server = app.server;
  });

  afterAll(async () => {
    await app.cleanup();
  });

  describe('POST /api/auto-finish/process', () => {
    it('should process TODO list successfully', async () => {
      const todoInput = `
TODO: Create a new button component
- Add form validation
1. Update API endpoint
[ ] Write unit tests
      `;

      const response = await request(server)
        .post('/api/auto-finish/process')
        .send({
          todoInput,
          options: {
            stopOnError: false
          }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.sessionId).toBeDefined();
      expect(response.body.result).toBeDefined();
    });

    it('should handle invalid TODO input', async () => {
      const response = await request(server)
        .post('/api/auto-finish/process')
        .send({
          todoInput: '',
          options: {}
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('todoInput is required');
    });

    it('should handle TODO input with no tasks', async () => {
      const response = await request(server)
        .post('/api/auto-finish/process')
        .send({
          todoInput: 'This is just some text with no tasks',
          options: {}
        })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('No tasks found');
    });
  });

  describe('GET /api/auto-finish/sessions/:sessionId', () => {
    it('should get session status', async () => {
      // First create a session
      const todoInput = 'TODO: Test session status';
      const createResponse = await request(server)
        .post('/api/auto-finish/process')
        .send({ todoInput })
        .expect(200);

      const sessionId = createResponse.body.sessionId;

      // Then get session status
      const response = await request(server)
        .get(`/api/auto-finish/sessions/${sessionId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.session).toBeDefined();
      expect(response.body.session.id).toBe(sessionId);
    });

    it('should handle non-existent session', async () => {
      const response = await request(server)
        .get('/api/auto-finish/sessions/non-existent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Session not found');
    });
  });

  describe('GET /api/auto-finish/stats', () => {
    it('should get system statistics', async () => {
      const response = await request(server)
        .get('/api/auto-finish/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.stats).toBeDefined();
      expect(response.body.stats.autoFinishSystem).toBeDefined();
    });
  });

  describe('GET /api/auto-finish/patterns', () => {
    it('should get supported patterns', async () => {
      const response = await request(server)
        .get('/api/auto-finish/patterns')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.patterns).toBeDefined();
      expect(Array.isArray(response.body.patterns)).toBe(true);
    });
  });

  describe('GET /api/auto-finish/task-types', () => {
    it('should get task type keywords', async () => {
      const response = await request(server)
        .get('/api/auto-finish/task-types')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.taskTypes).toBeDefined();
      expect(typeof response.body.taskTypes).toBe('object');
    });
  });

  describe('GET /api/auto-finish/health', () => {
    it('should get health status', async () => {
      const response = await request(server)
        .get('/api/auto-finish/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.health).toBeDefined();
      expect(response.body.health.autoFinishSystem).toBeDefined();
    });
  });
}); 