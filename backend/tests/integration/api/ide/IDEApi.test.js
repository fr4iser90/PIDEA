const request = require('supertest');
const express = require('express');
const { EventEmitter } = require('events');

// Mock dependencies
jest.mock('../../../infrastructure/database/DatabaseConnection');
jest.mock('../../../infrastructure/external/AIService');
jest.mock('../../../infrastructure/messaging/CommandBus');
jest.mock('../../../infrastructure/messaging/QueryBus');

const app = express();
app.use(express.json());

// Import controllers
const IDEController = require('@api/ide/IDEController');
const IDESelectionController = require('@api/ide/IDESelectionController');
const IDEMirrorController = require('@api/ide/IDEMirrorController');
const IDEFeatureController = require('@api/ide/IDEFeatureController');

// Mock services
const mockIDEService = {
  listIDEs: jest.fn(),
  getIDEStatus: jest.fn(),
  startIDE: jest.fn(),
  stopIDE: jest.fn(),
  getIDEFeatures: jest.fn()
};

const mockIDESelectionService = {
  getCurrentSelection: jest.fn(),
  setSelection: jest.fn(),
  getAvailableIDEs: jest.fn()
};

const mockIDEMirrorService = {
  getDOM: jest.fn(),
  interactWithIDE: jest.fn(),
  getMirrorStatus: jest.fn()
};

const mockEventBus = new EventEmitter();

// Setup routes
app.use('/api/ide', IDEController(mockIDEService, mockEventBus));
app.use('/api/ide/selection', IDESelectionController(mockIDESelectionService, mockEventBus));
app.use('/api/ide/mirror', IDEMirrorController(mockIDEMirrorService, mockEventBus));
app.use('/api/ide/features', IDEFeatureController(mockIDEService, mockEventBus));

describe('IDE API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/ide/list', () => {
    it('should return list of available IDEs', async () => {
      const mockIDEs = [
        { port: 9222, name: 'VS Code', status: 'running' },
        { port: 9223, name: 'Cursor', status: 'stopped' }
      ];

      mockIDEService.listIDEs.mockResolvedValue(mockIDEs);

      const response = await request(app)
        .get('/api/ide/list')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockIDEs
      });

      expect(mockIDEService.listIDEs).toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      mockIDEService.listIDEs.mockRejectedValue(new Error('Service unavailable'));

      const response = await request(app)
        .get('/api/ide/list')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Service unavailable'
      });
    });
  });

  describe('GET /api/ide/status', () => {
    it('should return IDE status for specific port', async () => {
      const mockStatus = {
        port: 9222,
        name: 'VS Code',
        status: 'running',
        uptime: 3600,
        memory: '512MB'
      };

      mockIDEService.getIDEStatus.mockResolvedValue(mockStatus);

      const response = await request(app)
        .get('/api/ide/status?port=9222')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockStatus
      });

      expect(mockIDEService.getIDEStatus).toHaveBeenCalledWith(9222);
    });

    it('should return 400 for missing port parameter', async () => {
      const response = await request(app)
        .get('/api/ide/status')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Port parameter is required'
      });
    });
  });

  describe('POST /api/ide/start', () => {
    it('should start IDE successfully', async () => {
      const startData = { port: 9222, name: 'VS Code' };
      const mockResult = { success: true, port: 9222, status: 'running' };

      mockIDEService.startIDE.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/ide/start')
        .send(startData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockResult
      });

      expect(mockIDEService.startIDE).toHaveBeenCalledWith(startData);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/ide/start')
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Port and name are required'
      });
    });
  });

  describe('POST /api/ide/stop', () => {
    it('should stop IDE successfully', async () => {
      const stopData = { port: 9222 };
      const mockResult = { success: true, port: 9222, status: 'stopped' };

      mockIDEService.stopIDE.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/ide/stop')
        .send(stopData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockResult
      });

      expect(mockIDEService.stopIDE).toHaveBeenCalledWith(stopData);
    });
  });

  describe('GET /api/ide/selection', () => {
    it('should return current IDE selection', async () => {
      const mockSelection = {
        port: 9222,
        name: 'VS Code',
        selectedAt: new Date().toISOString()
      };

      mockIDESelectionService.getCurrentSelection.mockResolvedValue(mockSelection);

      const response = await request(app)
        .get('/api/ide/selection')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockSelection
      });

      expect(mockIDESelectionService.getCurrentSelection).toHaveBeenCalled();
    });

    it('should return null when no selection', async () => {
      mockIDESelectionService.getCurrentSelection.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/ide/selection')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: null
      });
    });
  });

  describe('POST /api/ide/selection', () => {
    it('should set IDE selection successfully', async () => {
      const selectionData = {
        port: 9222,
        reason: 'manual',
        fromPort: 9223
      };

      const mockResult = {
        success: true,
        previousPort: 9223,
        currentPort: 9222,
        reason: 'manual'
      };

      mockIDESelectionService.setSelection.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/ide/selection')
        .send(selectionData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockResult
      });

      expect(mockIDESelectionService.setSelection).toHaveBeenCalledWith(selectionData);
    });

    it('should validate selection data', async () => {
      const response = await request(app)
        .post('/api/ide/selection')
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Port is required'
      });
    });
  });

  describe('GET /api/ide/available', () => {
    it('should return available IDEs', async () => {
      const mockAvailable = [
        { port: 9222, name: 'VS Code', status: 'running' },
        { port: 9223, name: 'Cursor', status: 'stopped' }
      ];

      mockIDESelectionService.getAvailableIDEs.mockResolvedValue(mockAvailable);

      const response = await request(app)
        .get('/api/ide/available')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockAvailable
      });

      expect(mockIDESelectionService.getAvailableIDEs).toHaveBeenCalled();
    });
  });

  describe('GET /api/ide/mirror/dom', () => {
    it('should return DOM data for IDE', async () => {
      const mockDOM = {
        root: {
          id: 'root',
          tagName: 'DIV',
          className: 'container',
          children: []
        },
        elementCount: 1
      };

      mockIDEMirrorService.getDOM.mockResolvedValue(mockDOM);

      const response = await request(app)
        .get('/api/ide/mirror/dom?port=9222')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockDOM
      });

      expect(mockIDEMirrorService.getDOM).toHaveBeenCalledWith(9222);
    });

    it('should return 400 for missing port parameter', async () => {
      const response = await request(app)
        .get('/api/ide/mirror/dom')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Port parameter is required'
      });
    });
  });

  describe('POST /api/ide/mirror/interact', () => {
    it('should handle IDE interaction', async () => {
      const interactionData = {
        port: 9222,
        action: 'click',
        elementId: 'button1',
        coordinates: { x: 100, y: 200 }
      };

      const mockResult = {
        success: true,
        action: 'click',
        elementId: 'button1',
        timestamp: new Date().toISOString()
      };

      mockIDEMirrorService.interactWithIDE.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/ide/mirror/interact')
        .send(interactionData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockResult
      });

      expect(mockIDEMirrorService.interactWithIDE).toHaveBeenCalledWith(interactionData);
    });
  });

  describe('GET /api/ide/mirror/status', () => {
    it('should return mirror status', async () => {
      const mockStatus = {
        port: 9222,
        connected: true,
        lastUpdate: new Date().toISOString(),
        elementCount: 150
      };

      mockIDEMirrorService.getMirrorStatus.mockResolvedValue(mockStatus);

      const response = await request(app)
        .get('/api/ide/mirror/status?port=9222')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockStatus
      });

      expect(mockIDEMirrorService.getMirrorStatus).toHaveBeenCalledWith(9222);
    });
  });

  describe('GET /api/ide/features', () => {
    it('should return IDE features', async () => {
      const mockFeatures = {
        ide: 'vscode',
        version: '1.85.0',
        features: {
          debugging: { available: true, version: '1.0.0' },
          intellisense: { available: true, version: '2.1.0' }
        },
        capabilities: {
          languageSupport: ['javascript', 'typescript'],
          debugging: ['node', 'chrome']
        }
      };

      mockIDEService.getIDEFeatures.mockResolvedValue(mockFeatures);

      const response = await request(app)
        .get('/api/ide/features?port=9222')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockFeatures
      });

      expect(mockIDEService.getIDEFeatures).toHaveBeenCalledWith(9222);
    });

    it('should return 400 for missing port parameter', async () => {
      const response = await request(app)
        .get('/api/ide/features')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Port parameter is required'
      });
    });
  });

  describe('Event Bus Integration', () => {
    it('should emit events on successful operations', async () => {
      const mockResult = { success: true, port: 9222, status: 'running' };
      mockIDEService.startIDE.mockResolvedValue(mockResult);

      const eventSpy = jest.spyOn(mockEventBus, 'emit');

      await request(app)
        .post('/api/ide/start')
        .send({ port: 9222, name: 'VS Code' })
        .expect(200);

      expect(eventSpy).toHaveBeenCalledWith('ideStarted', {
        port: 9222,
        name: 'VS Code',
        result: mockResult
      });
    });

    it('should emit selection change events', async () => {
      const selectionData = { port: 9222, reason: 'manual' };
      const mockResult = { success: true, currentPort: 9222 };
      mockIDESelectionService.setSelection.mockResolvedValue(mockResult);

      const eventSpy = jest.spyOn(mockEventBus, 'emit');

      await request(app)
        .post('/api/ide/selection')
        .send(selectionData)
        .expect(200);

      expect(eventSpy).toHaveBeenCalledWith('ideSelectionChanged', {
        ...selectionData,
        result: mockResult
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle service exceptions gracefully', async () => {
      mockIDEService.listIDEs.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const response = await request(app)
        .get('/api/ide/list')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Database connection failed'
      });
    });

    it('should handle validation errors', async () => {
      const response = await request(app)
        .post('/api/ide/start')
        .send({ invalid: 'data' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required');
    });
  });

  describe('Request Validation', () => {
    it('should validate port numbers', async () => {
      const response = await request(app)
        .get('/api/ide/status?port=invalid')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Port must be a valid number'
      });
    });

    it('should validate port range', async () => {
      const response = await request(app)
        .get('/api/ide/status?port=99999')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Port must be between 1 and 65535'
      });
    });
  });
}); 