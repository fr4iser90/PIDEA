/**
 * IDEStartService Tests
 */

import IDEStartService from '@/infrastructure/services/IDEStartService.jsx';
import { apiCall } from '@/infrastructure/repositories/APIChatRepository.jsx';

// Mock the API call
jest.mock('@/infrastructure/repositories/APIChatRepository.jsx', () => ({
  apiCall: jest.fn()
}));

// Mock the logger
jest.mock('@/infrastructure/logging/Logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

describe('IDEStartService', () => {
  const mockApiCall = apiCall as jest.MockedFunction<typeof apiCall>;
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('startIDE', () => {
    it('starts IDE with valid configuration', async () => {
      const mockResult = {
        success: true,
        data: { port: 9222, ideType: 'cursor' }
      };
      
      mockApiCall.mockResolvedValue(mockResult);
      
      const config = {
        ideType: 'cursor',
        workspacePath: '/test/workspace',
        options: { port: 'auto' }
      };
      
      const result = await IDEStartService.startIDE(config);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResult.data);
      expect(mockApiCall).toHaveBeenCalledWith('/api/ide/start', {
        method: 'POST',
        body: JSON.stringify({
          ideType: 'cursor',
          workspacePath: '/test/workspace',
          options: { port: 'auto', executablePath: null, additionalFlags: null }
        })
      });
    });

    it('validates IDE type', async () => {
      const config = {
        ideType: 'invalid',
        options: {}
      };
      
      await expect(IDEStartService.startIDE(config)).rejects.toThrow(
        'Invalid IDE type. Must be one of: cursor, vscode, windsurf'
      );
    });

    it('validates port range for cursor', async () => {
      const config = {
        ideType: 'cursor',
        options: { port: 9999 }
      };
      
      await expect(IDEStartService.startIDE(config)).rejects.toThrow(
        'Port must be between 9222 and 9231 for cursor'
      );
    });

    it('validates port range for vscode', async () => {
      const config = {
        ideType: 'vscode',
        options: { port: 9999 }
      };
      
      await expect(IDEStartService.startIDE(config)).rejects.toThrow(
        'Port must be between 9232 and 9241 for vscode'
      );
    });

    it('validates port range for windsurf', async () => {
      const config = {
        ideType: 'windsurf',
        options: { port: 9999 }
      };
      
      await expect(IDEStartService.startIDE(config)).rejects.toThrow(
        'Port must be between 9242 and 9251 for windsurf'
      );
    });

    it('handles API errors', async () => {
      mockApiCall.mockResolvedValue({
        success: false,
        error: 'API Error'
      });
      
      const config = {
        ideType: 'cursor',
        options: {}
      };
      
      await expect(IDEStartService.startIDE(config)).rejects.toThrow('API Error');
    });

    it('handles network errors', async () => {
      mockApiCall.mockRejectedValue(new Error('Network Error'));
      
      const config = {
        ideType: 'cursor',
        options: {}
      };
      
      await expect(IDEStartService.startIDE(config)).rejects.toThrow('Network Error');
    });

    it('queues requests when already starting', async () => {
      mockApiCall.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ success: true, data: {} }), 100))
      );
      
      const config1 = { ideType: 'cursor', options: {} };
      const config2 = { ideType: 'vscode', options: {} };
      
      const promise1 = IDEStartService.startIDE(config1);
      const promise2 = IDEStartService.startIDE(config2);
      
      const results = await Promise.all([promise1, promise2]);
      
      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });
  });

  describe('getAvailablePorts', () => {
    it('returns available ports for cursor', async () => {
      mockApiCall.mockResolvedValue({
        success: true,
        data: { ides: [{ port: 9222 }, { port: 9223 }] }
      });
      
      const ports = await IDEStartService.getAvailablePorts('cursor');
      
      expect(ports).toEqual([9224, 9225, 9226, 9227, 9228, 9229, 9230, 9231]);
    });

    it('returns available ports for vscode', async () => {
      mockApiCall.mockResolvedValue({
        success: true,
        data: { ides: [{ port: 9232 }, { port: 9233 }] }
      });
      
      const ports = await IDEStartService.getAvailablePorts('vscode');
      
      expect(ports).toEqual([9234, 9235, 9236, 9237, 9238, 9239, 9240, 9241]);
    });

    it('handles API errors gracefully', async () => {
      mockApiCall.mockRejectedValue(new Error('API Error'));
      
      const ports = await IDEStartService.getAvailablePorts('cursor');
      
      expect(ports).toEqual([]);
    });
  });

  describe('detectWorkspacePaths', () => {
    it('returns detected workspace paths', async () => {
      const mockPaths = ['/workspace1', '/workspace2'];
      
      mockApiCall.mockResolvedValue({
        success: true,
        data: { paths: mockPaths }
      });
      
      const paths = await IDEStartService.detectWorkspacePaths();
      
      expect(paths).toEqual(mockPaths);
      expect(mockApiCall).toHaveBeenCalledWith('/api/ide/detect-workspace-paths', {
        method: 'POST',
        body: JSON.stringify({})
      });
    });

    it('handles API errors gracefully', async () => {
      mockApiCall.mockRejectedValue(new Error('API Error'));
      
      const paths = await IDEStartService.detectWorkspacePaths();
      
      expect(paths).toEqual([]);
    });
  });

  describe('getIDEFeatures', () => {
    it('returns features for cursor', () => {
      const features = IDEStartService.getIDEFeatures('cursor');
      
      expect(features).toEqual({
        hasChat: true,
        hasTerminal: true,
        hasGit: true,
        hasExtensions: true,
        hasRefactoring: true,
        hasAI: true
      });
    });

    it('returns features for vscode', () => {
      const features = IDEStartService.getIDEFeatures('vscode');
      
      expect(features).toEqual({
        hasChat: false,
        hasTerminal: true,
        hasGit: true,
        hasExtensions: true,
        hasRefactoring: true,
        hasAI: false
      });
    });

    it('returns features for windsurf', () => {
      const features = IDEStartService.getIDEFeatures('windsurf');
      
      expect(features).toEqual({
        hasChat: true,
        hasTerminal: true,
        hasGit: true,
        hasExtensions: true,
        hasRefactoring: true,
        hasAI: true
      });
    });

    it('returns empty object for unknown IDE type', () => {
      const features = IDEStartService.getIDEFeatures('unknown');
      
      expect(features).toEqual({});
    });
  });

  describe('getIDEMetadata', () => {
    it('returns metadata for cursor', () => {
      const metadata = IDEStartService.getIDEMetadata('cursor');
      
      expect(metadata).toEqual({
        displayName: 'Cursor',
        description: 'AI-powered code editor',
        icon: '🎯',
        version: '1.0.0'
      });
    });

    it('returns metadata for vscode', () => {
      const metadata = IDEStartService.getIDEMetadata('vscode');
      
      expect(metadata).toEqual({
        displayName: 'VS Code',
        description: 'Microsoft Visual Studio Code',
        icon: '📝',
        version: '1.0.0'
      });
    });

    it('returns metadata for windsurf', () => {
      const metadata = IDEStartService.getIDEMetadata('windsurf');
      
      expect(metadata).toEqual({
        displayName: 'Windsurf',
        description: 'AI-powered development environment',
        icon: '🌊',
        version: '1.0.0'
      });
    });

    it('returns empty object for unknown IDE type', () => {
      const metadata = IDEStartService.getIDEMetadata('unknown');
      
      expect(metadata).toEqual({});
    });
  });

  describe('event handling', () => {
    it('adds event listeners', () => {
      const callback = jest.fn();
      
      IDEStartService.on('testEvent', callback);
      
      IDEStartService.emit('testEvent', { data: 'test' });
      
      expect(callback).toHaveBeenCalledWith({ data: 'test' });
    });

    it('removes event listeners', () => {
      const callback = jest.fn();
      
      IDEStartService.on('testEvent', callback);
      IDEStartService.off('testEvent', callback);
      
      IDEStartService.emit('testEvent', { data: 'test' });
      
      expect(callback).not.toHaveBeenCalled();
    });

    it('handles multiple listeners', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      IDEStartService.on('testEvent', callback1);
      IDEStartService.on('testEvent', callback2);
      
      IDEStartService.emit('testEvent', { data: 'test' });
      
      expect(callback1).toHaveBeenCalledWith({ data: 'test' });
      expect(callback2).toHaveBeenCalledWith({ data: 'test' });
    });

    it('handles listener errors gracefully', () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Listener error');
      });
      const normalCallback = jest.fn();
      
      IDEStartService.on('testEvent', errorCallback);
      IDEStartService.on('testEvent', normalCallback);
      
      IDEStartService.emit('testEvent', { data: 'test' });
      
      expect(normalCallback).toHaveBeenCalledWith({ data: 'test' });
    });
  });

  describe('getStatus', () => {
    it('returns service status', () => {
      const status = IDEStartService.getStatus();
      
      expect(status).toHaveProperty('isStarting');
      expect(status).toHaveProperty('queueLength');
      expect(status).toHaveProperty('hasListeners');
    });
  });

  describe('reset', () => {
    it('resets service state', () => {
      const callback = jest.fn();
      
      IDEStartService.on('testEvent', callback);
      IDEStartService.reset();
      
      const status = IDEStartService.getStatus();
      
      expect(status.isStarting).toBe(false);
      expect(status.queueLength).toBe(0);
      expect(status.hasListeners).toBe(false);
    });
  });
});
