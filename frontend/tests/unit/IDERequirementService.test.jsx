/**
 * IDE Requirement Service Tests
 * Created: 2025-09-29T19:51:09.000Z
 */

import IDERequirementService from '@/infrastructure/services/IDERequirementService.jsx';
import { apiCall } from '@/infrastructure/repositories/APIChatRepository.jsx';

// Mock API calls
jest.mock('@/infrastructure/repositories/APIChatRepository.jsx', () => ({
  apiCall: jest.fn()
}));

describe('IDERequirementService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('hasRunningIDE', () => {
    it('should return true when IDE is running', async () => {
      apiCall.mockResolvedValueOnce({
        success: true,
        data: [{ port: 9222, ideType: 'cursor' }]
      });

      const result = await IDERequirementService.hasRunningIDE();

      expect(result).toBe(true);
      expect(apiCall).toHaveBeenCalledWith('/api/ide/status');
    });

    it('should return false when no IDE is running', async () => {
      apiCall.mockResolvedValueOnce({
        success: true,
        data: []
      });

      const result = await IDERequirementService.hasRunningIDE();

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      apiCall.mockRejectedValueOnce(new Error('API error'));

      const result = await IDERequirementService.hasRunningIDE();

      expect(result).toBe(false);
    });
  });

  describe('getIDEConfigurations', () => {
    it('should return cached configurations', async () => {
      const mockConfigs = [
        { id: 'config-1', ideType: 'cursor', executablePath: '/usr/bin/cursor' }
      ];

      apiCall.mockResolvedValueOnce({
        success: true,
        data: mockConfigs
      });

      // First call
      const result1 = await IDERequirementService.getIDEConfigurations();
      expect(result1).toEqual(mockConfigs);

      // Second call should use cache
      const result2 = await IDERequirementService.getIDEConfigurations();
      expect(result2).toEqual(mockConfigs);
      expect(apiCall).toHaveBeenCalledTimes(1);
    });

    it('should handle API errors', async () => {
      apiCall.mockRejectedValueOnce(new Error('API error'));

      const result = await IDERequirementService.getIDEConfigurations();

      expect(result).toEqual([]);
    });
  });

  describe('createIDEConfiguration', () => {
    it('should create configuration and clear cache', async () => {
      const configData = {
        ideType: 'cursor',
        executablePath: '/usr/bin/cursor',
        version: '1.0.0'
      };

      const createdConfig = {
        id: 'new-config',
        ...configData
      };

      apiCall.mockResolvedValueOnce({
        success: true,
        data: createdConfig
      });

      const result = await IDERequirementService.createIDEConfiguration(configData);

      expect(result).toEqual(createdConfig);
      expect(apiCall).toHaveBeenCalledWith('/api/ide/configurations', {
        method: 'POST',
        body: JSON.stringify(configData)
      });
    });

    it('should throw error on failure', async () => {
      apiCall.mockResolvedValueOnce({
        success: false,
        error: 'Validation failed'
      });

      const configData = { ideType: 'invalid' };

      await expect(IDERequirementService.createIDEConfiguration(configData))
        .rejects.toThrow('Failed to create IDE configuration');
    });
  });

  describe('validateExecutablePath', () => {
    it('should validate executable path', async () => {
      const validationResult = {
        valid: true,
        version: '1.0.0'
      };

      apiCall.mockResolvedValueOnce({
        success: true,
        data: validationResult
      });

      const result = await IDERequirementService.validateExecutablePath('/usr/bin/cursor');

      expect(result).toEqual(validationResult);
      expect(apiCall).toHaveBeenCalledWith('/api/ide/configurations/validate', {
        method: 'POST',
        body: JSON.stringify({ executablePath: '/usr/bin/cursor' })
      });
    });

    it('should handle validation errors', async () => {
      apiCall.mockRejectedValueOnce(new Error('Validation failed'));

      await expect(IDERequirementService.validateExecutablePath('/invalid/path'))
        .rejects.toThrow('Validation failed');
    });
  });

  describe('getDownloadLinks', () => {
    it('should return cached download links', async () => {
      const downloadLinks = {
        cursor: {
          windows: 'https://cursor.sh/download/windows',
          macos: 'https://cursor.sh/download/macos',
          linux: 'https://cursor.sh/download/linux'
        }
      };

      apiCall.mockResolvedValueOnce({
        success: true,
        data: downloadLinks
      });

      const result = await IDERequirementService.getDownloadLinks();

      expect(result).toEqual(downloadLinks);
      expect(apiCall).toHaveBeenCalledWith('/api/ide/configurations/download-links');
    });

    it('should return empty object on error', async () => {
      apiCall.mockRejectedValueOnce(new Error('API error'));

      const result = await IDERequirementService.getDownloadLinks();

      expect(result).toEqual({});
    });
  });

  describe('shouldShowRequirementModal', () => {
    it('should show modal when no IDE running and no configurations', async () => {
      // Mock hasRunningIDE to return false
      apiCall.mockResolvedValueOnce({
        success: true,
        data: []
      });

      // Mock getActiveIDEConfigurations to return empty array
      apiCall.mockResolvedValueOnce({
        success: true,
        data: []
      });

      const result = await IDERequirementService.shouldShowRequirementModal();

      expect(result).toBe(true);
    });

    it('should not show modal when IDE is running', async () => {
      // Mock hasRunningIDE to return true
      apiCall.mockResolvedValueOnce({
        success: true,
        data: [{ port: 9222, ideType: 'cursor' }]
      });

      const result = await IDERequirementService.shouldShowRequirementModal();

      expect(result).toBe(false);
    });

    it('should not show modal when configurations exist', async () => {
      // Mock hasRunningIDE to return false
      apiCall.mockResolvedValueOnce({
        success: true,
        data: []
      });

      // Mock getActiveIDEConfigurations to return configurations
      apiCall.mockResolvedValueOnce({
        success: true,
        data: [{ id: 'config-1', ideType: 'cursor' }]
      });

      const result = await IDERequirementService.shouldShowRequirementModal();

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      apiCall.mockRejectedValueOnce(new Error('API error'));

      const result = await IDERequirementService.shouldShowRequirementModal();

      expect(result).toBe(false);
    });
  });

  describe('cache management', () => {
    it('should clear cache when creating configuration', async () => {
      const configData = { ideType: 'cursor', executablePath: '/usr/bin/cursor' };

      apiCall.mockResolvedValueOnce({
        success: true,
        data: { id: 'new-config', ...configData }
      });

      await IDERequirementService.createIDEConfiguration(configData);

      // Cache should be cleared, so next call should make API request
      apiCall.mockResolvedValueOnce({
        success: true,
        data: []
      });

      await IDERequirementService.getIDEConfigurations();

      expect(apiCall).toHaveBeenCalledTimes(2);
    });
  });
});
