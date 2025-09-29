/**
 * IDE Configuration Controller Tests
 * Created: 2025-09-29T19:51:09.000Z
 */

const IDEConfigurationController = require('@/presentation/api/ide/IDEConfigurationController');
const IDEConfigurationService = require('@/application/services/IDEConfigurationService');

// Mock IDEConfigurationService
jest.mock('@/application/services/IDEConfigurationService');

describe('IDEConfigurationController', () => {
  let controller;
  let mockService;
  let mockDatabase;

  beforeEach(() => {
    mockDatabase = {};
    mockService = {
      createConfiguration: jest.fn(),
      getConfigurations: jest.fn(),
      getActiveConfigurations: jest.fn(),
      updateConfiguration: jest.fn(),
      deleteConfiguration: jest.fn(),
      validateExecutablePath: jest.fn(),
      detectIDEVersion: jest.fn(),
      getDownloadLinks: jest.fn(),
      getDefaultExecutablePaths: jest.fn(),
      setDefaultConfiguration: jest.fn(),
      updateUsage: jest.fn()
    };

    IDEConfigurationService.mockImplementation(() => mockService);
    controller = new IDEConfigurationController(mockDatabase);
  });

  describe('getConfigurations', () => {
    it('should return user configurations', async () => {
      const mockConfigs = [
        {
          id: 'config-1',
          ideType: 'cursor',
          executablePath: '/usr/bin/cursor',
          version: '1.0.0'
        }
      ];

      mockService.getConfigurations.mockResolvedValueOnce(mockConfigs);

      const req = { user: { id: 'test-user' } };
      const res = {
        json: jest.fn()
      };

      await controller.getConfigurations(req, res);

      expect(mockService.getConfigurations).toHaveBeenCalledWith('test-user');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockConfigs
      });
    });

    it('should handle errors', async () => {
      mockService.getConfigurations.mockRejectedValueOnce(new Error('Database error'));

      const req = { user: { id: 'test-user' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await controller.getConfigurations(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database error'
      });
    });
  });

  describe('createConfiguration', () => {
    it('should create new configuration', async () => {
      const configData = {
        ideType: 'cursor',
        executablePath: '/usr/bin/cursor',
        version: '1.0.0'
      };

      const createdConfig = {
        id: 'new-config-id',
        ...configData
      };

      mockService.createConfiguration.mockResolvedValueOnce(createdConfig);

      const req = {
        body: configData,
        user: { id: 'test-user' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await controller.createConfiguration(req, res);

      expect(mockService.createConfiguration).toHaveBeenCalledWith({
        ...configData,
        userId: 'test-user'
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: createdConfig
      });
    });

    it('should handle validation errors', async () => {
      mockService.createConfiguration.mockRejectedValueOnce(new Error('Invalid configuration'));

      const req = {
        body: { ideType: 'invalid' },
        user: { id: 'test-user' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await controller.createConfiguration(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid configuration'
      });
    });
  });

  describe('validateExecutablePath', () => {
    it('should validate executable path', async () => {
      const validationResult = {
        valid: true,
        version: '1.0.0'
      };

      mockService.validateExecutablePath.mockResolvedValueOnce(validationResult);

      const req = {
        body: { executablePath: '/usr/bin/cursor' }
      };
      const res = {
        json: jest.fn()
      };

      await controller.validateExecutablePath(req, res);

      expect(mockService.validateExecutablePath).toHaveBeenCalledWith('/usr/bin/cursor');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: validationResult
      });
    });

    it('should require executable path', async () => {
      const req = {
        body: {}
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await controller.validateExecutablePath(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Executable path is required'
      });
    });
  });

  describe('getDownloadLinks', () => {
    it('should return download links', async () => {
      const downloadLinks = {
        cursor: {
          windows: 'https://cursor.sh/download/windows',
          macos: 'https://cursor.sh/download/macos',
          linux: 'https://cursor.sh/download/linux'
        }
      };

      mockService.getDownloadLinks.mockReturnValueOnce(downloadLinks);

      const req = {};
      const res = {
        json: jest.fn()
      };

      await controller.getDownloadLinks(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: downloadLinks
      });
    });
  });

  describe('setDefaultConfiguration', () => {
    it('should set default configuration', async () => {
      mockService.setDefaultConfiguration.mockResolvedValueOnce(true);

      const req = {
        body: {
          ideType: 'cursor',
          configId: 'config-1'
        },
        user: { id: 'test-user' }
      };
      const res = {
        json: jest.fn()
      };

      await controller.setDefaultConfiguration(req, res);

      expect(mockService.setDefaultConfiguration).toHaveBeenCalledWith('cursor', 'config-1', 'test-user');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Default configuration set successfully'
      });
    });

    it('should require ideType and configId', async () => {
      const req = {
        body: { ideType: 'cursor' },
        user: { id: 'test-user' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await controller.setDefaultConfiguration(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'IDE type and configuration ID are required'
      });
    });
  });
});
