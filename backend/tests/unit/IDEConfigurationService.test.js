/**
 * IDE Configuration Service Tests
 * Created: 2025-09-29T19:51:09.000Z
 */

const IDEConfigurationService = require('@/application/services/IDEConfigurationService');
const IDEConfiguration = require('@/domain/entities/IDEConfiguration');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Mock database
const mockDatabase = {
  query: jest.fn()
};

// Mock logger
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
};

// Mock execAsync
jest.mock('child_process', () => ({
  exec: jest.fn()
}));

jest.mock('util', () => ({
  promisify: jest.fn(() => jest.fn())
}));

describe('IDEConfigurationService', () => {
  let service;

  beforeEach(() => {
    service = new IDEConfigurationService(mockDatabase);
    jest.clearAllMocks();
  });

  describe('createConfiguration', () => {
    it('should create a valid IDE configuration', async () => {
      const configData = {
        ideType: 'cursor',
        executablePath: '/usr/bin/cursor',
        version: '1.0.0',
        userId: 'test-user'
      };

      mockDatabase.query.mockResolvedValueOnce([{
        id: 'test-id',
        user_id: 'test-user',
        ide_type: 'cursor',
        executable_path: '/usr/bin/cursor',
        version: '1.0.0',
        is_default: false,
        is_active: true,
        created_at: '2025-09-29T19:51:09.000Z',
        updated_at: '2025-09-29T19:51:09.000Z'
      }]);

      const result = await service.createConfiguration(configData);

      expect(result).toBeInstanceOf(IDEConfiguration);
      expect(result.ideType).toBe('cursor');
      expect(result.executablePath).toBe('/usr/bin/cursor');
      expect(mockDatabase.query).toHaveBeenCalled();
    });

    it('should throw error for invalid configuration', async () => {
      const configData = {
        ideType: 'invalid-ide',
        executablePath: '/usr/bin/invalid'
      };

      await expect(service.createConfiguration(configData)).rejects.toThrow();
    });
  });

  describe('getConfigurations', () => {
    it('should return user configurations', async () => {
      const mockConfigs = [
        {
          id: 'config-1',
          user_id: 'test-user',
          ide_type: 'cursor',
          executable_path: '/usr/bin/cursor',
          version: '1.0.0',
          is_default: true,
          is_active: true,
          created_at: '2025-09-29T19:51:09.000Z',
          updated_at: '2025-09-29T19:51:09.000Z'
        }
      ];

      mockDatabase.query.mockResolvedValueOnce(mockConfigs);

      const result = await service.getConfigurations('test-user');

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(IDEConfiguration);
      expect(result[0].ideType).toBe('cursor');
    });
  });

  describe('validateExecutablePath', () => {
    it('should validate existing executable', async () => {
      const fs = require('fs');
      jest.spyOn(fs, 'access').mockResolvedValueOnce();

      const execAsync = require('util').promisify;
      execAsync.mockReturnValueOnce(jest.fn().mockResolvedValueOnce({
        stdout: 'Cursor 1.0.0'
      }));

      const result = await service.validateExecutablePath('/usr/bin/cursor');

      expect(result.valid).toBe(true);
      expect(result.version).toBe('1.0.0');
    });

    it('should return invalid for non-existent executable', async () => {
      const fs = require('fs');
      jest.spyOn(fs, 'access').mockRejectedValueOnce(new Error('File not found'));

      const result = await service.validateExecutablePath('/usr/bin/nonexistent');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Executable file does not exist');
    });
  });

  describe('getDownloadLinks', () => {
    it('should return download links for all IDE types', () => {
      const links = service.getDownloadLinks();

      expect(links).toHaveProperty('cursor');
      expect(links).toHaveProperty('vscode');
      expect(links).toHaveProperty('windsurf');
      expect(links.cursor).toHaveProperty('windows');
      expect(links.cursor).toHaveProperty('macos');
      expect(links.cursor).toHaveProperty('linux');
    });
  });

  describe('getDefaultExecutablePaths', () => {
    it('should return default paths for current platform', () => {
      const paths = service.getDefaultExecutablePaths();

      expect(paths).toHaveProperty('cursor');
      expect(paths).toHaveProperty('vscode');
      expect(paths).toHaveProperty('windsurf');
    });
  });

  describe('getPortRangeForIDEType', () => {
    it('should return correct port ranges', () => {
      const cursorRange = service.getPortRangeForIDEType('cursor');
      const vscodeRange = service.getPortRangeForIDEType('vscode');
      const windsurfRange = service.getPortRangeForIDEType('windsurf');

      expect(cursorRange).toEqual({ start: 9222, end: 9231 });
      expect(vscodeRange).toEqual({ start: 9232, end: 9241 });
      expect(windsurfRange).toEqual({ start: 9242, end: 9251 });
    });

    it('should return null for unknown IDE type', () => {
      const range = service.getPortRangeForIDEType('unknown');

      expect(range).toEqual({ start: null, end: null });
    });
  });
});
