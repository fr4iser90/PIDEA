/**
 * Unit Tests for VersionDetectionService
 */

const VersionDetectionService = require('@domain/services/ide/VersionDetectionService');

describe('VersionDetectionService', () => {
  let service;
  let mockVersionDetector;
  let mockLogger;

  beforeEach(() => {
    // Mock version detector
    mockVersionDetector = {
      detectVersion: jest.fn()
    };

    // Mock logger
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    };

    // Create service instance
    service = new VersionDetectionService({
      versionDetector: mockVersionDetector,
      logger: mockLogger
    });
  });

  describe('detectVersion', () => {
    it('should detect version for Cursor', async () => {
      mockVersionDetector.detectVersion.mockResolvedValue('1.6.0');

      const result = await service.detectVersion(9222, 'cursor');

      expect(result).toMatchObject({
        currentVersion: '1.6.0',
        isNewVersion: true,
        isKnownVersion: false,
        ideType: 'cursor',
        port: 9222
      });
      expect(mockVersionDetector.detectVersion).toHaveBeenCalledWith(9222);
    });

    it('should detect version for VSCode', async () => {
      mockVersionDetector.detectVersion.mockResolvedValue('1.86.0');

      const result = await service.detectVersion(9232, 'vscode');

      expect(result).toMatchObject({
        currentVersion: '1.86.0',
        isNewVersion: true,
        isKnownVersion: false,
        ideType: 'vscode',
        port: 9232
      });
    });

    it('should detect version for Windsurf', async () => {
      mockVersionDetector.detectVersion.mockResolvedValue('1.2.0');

      const result = await service.detectVersion(9242, 'windsurf');

      expect(result).toMatchObject({
        currentVersion: '1.2.0',
        isNewVersion: true,
        isKnownVersion: false,
        ideType: 'windsurf',
        port: 9242
      });
    });

    it('should identify known version', async () => {
      mockVersionDetector.detectVersion.mockResolvedValue('1.5.7');

      const result = await service.detectVersion(9222, 'cursor');

      expect(result.isKnownVersion).toBe(true);
      expect(result.isNewVersion).toBe(false);
    });

    it('should use cache for repeated requests', async () => {
      mockVersionDetector.detectVersion.mockResolvedValue('1.6.0');

      await service.detectVersion(9222, 'cursor');
      await service.detectVersion(9222, 'cursor');

      expect(mockVersionDetector.detectVersion).toHaveBeenCalledTimes(1);
    });

    it('should throw error when version detection fails', async () => {
      mockVersionDetector.detectVersion.mockResolvedValue(null);

      await expect(service.detectVersion(9222, 'cursor')).rejects.toThrow(
        'Failed to detect version for cursor on port 9222'
      );
    });

    it('should handle CDP connection failures', async () => {
      mockVersionDetector.detectVersion.mockRejectedValue(
        new Error('CDP connection failed')
      );

      await expect(service.detectVersion(9222, 'cursor')).rejects.toThrow();
    });
  });

  describe('validateVersion', () => {
    it('should validate correct version format', async () => {
      const result = await service.validateVersion('1.6.0', 'cursor');

      expect(result).toMatchObject({
        isValid: true,
        version: '1.6.0',
        ideType: 'cursor'
      });
    });

    it('should reject invalid version format', async () => {
      const result = await service.validateVersion('invalid', 'cursor');

      expect(result).toMatchObject({
        isValid: false,
        error: 'Version does not match semantic versioning format',
        version: 'invalid'
      });
    });

    it('should reject null version', async () => {
      const result = await service.validateVersion(null, 'cursor');

      expect(result).toMatchObject({
        isValid: false,
        error: 'Invalid version format'
      });
    });

    it('should identify known version', async () => {
      const result = await service.validateVersion('1.5.7', 'cursor');

      expect(result.isValid).toBe(true);
      expect(result.isKnown).toBe(true);
    });

    it('should identify unknown version', async () => {
      const result = await service.validateVersion('9.9.9', 'cursor');

      expect(result.isValid).toBe(true);
      expect(result.isKnown).toBe(false);
    });
  });

  describe('compareVersions', () => {
    it('should compare equal versions', async () => {
      const result = await service.compareVersions('1.6.0', '1.6.0');

      expect(result).toMatchObject({
        result: 'equal',
        version1: '1.6.0',
        version2: '1.6.0',
        difference: 0
      });
    });

    it('should identify greater version', async () => {
      const result = await service.compareVersions('1.7.0', '1.6.0');

      expect(result).toMatchObject({
        result: 'greater',
        version1: '1.7.0',
        version2: '1.6.0',
        position: 'minor'
      });
    });

    it('should identify lesser version', async () => {
      const result = await service.compareVersions('1.5.0', '1.6.0');

      expect(result).toMatchObject({
        result: 'less',
        version1: '1.5.0',
        version2: '1.6.0',
        position: 'minor'
      });
    });

    it('should compare major versions', async () => {
      const result = await service.compareVersions('2.0.0', '1.9.9');

      expect(result).toMatchObject({
        result: 'greater',
        position: 'major'
      });
    });

    it('should compare patch versions', async () => {
      const result = await service.compareVersions('1.6.1', '1.6.0');

      expect(result).toMatchObject({
        result: 'greater',
        position: 'patch'
      });
    });

    it('should throw error for invalid versions', async () => {
      await expect(service.compareVersions('invalid', '1.6.0')).rejects.toThrow(
        'Versions must be in format x.y.z'
      );
    });

    it('should throw error for missing versions', async () => {
      await expect(service.compareVersions(null, '1.6.0')).rejects.toThrow(
        'Both versions must be provided'
      );
    });
  });

  describe('findCompatibleVersion', () => {
    it('should find compatible version for new version', () => {
      const compatible = service.findCompatibleVersion('cursor', '1.8.0');

      expect(compatible).toBe('1.5.7'); // Latest known version for cursor
    });

    it('should return null for IDE with no known versions', () => {
      const compatible = service.findCompatibleVersion('unknown', '1.0.0');

      expect(compatible).toBeNull();
    });

    it('should return latest version as compatible', () => {
      // Add multiple versions
      service.addKnownVersion('cursor', '1.6.0');
      service.addKnownVersion('cursor', '1.4.0');

      const compatible = service.findCompatibleVersion('cursor', '1.9.0');

      expect(compatible).toBe('1.6.0'); // Latest should be returned first
    });
  });

  describe('addKnownVersion', () => {
    it('should add new known version', () => {
      service.addKnownVersion('cursor', '1.8.0');

      const versions = service.getKnownVersions('cursor');
      expect(versions).toContain('1.8.0');
    });

    it('should clear cache when adding version', () => {
      service.cache.set('cursor:9222', { version: '1.6.0', timestamp: Date.now() });
      
      service.addKnownVersion('cursor', '1.8.0');

      expect(service.cache.has('cursor:9222')).toBe(false);
    });
  });

  describe('getKnownVersions', () => {
    it('should return known versions for IDE', () => {
      const versions = service.getKnownVersions('cursor');

      expect(versions).toContain('1.5.7');
      expect(Array.isArray(versions)).toBe(true);
    });

    it('should return sorted versions (newest first)', () => {
      service.addKnownVersion('cursor', '1.6.0');
      service.addKnownVersion('cursor', '1.4.0');

      const versions = service.getKnownVersions('cursor');

      expect(versions[0]).toBe('1.6.0');
      expect(versions[versions.length - 1]).toBe('1.4.0');
    });

    it('should return empty array for unknown IDE', () => {
      const versions = service.getKnownVersions('unknown');

      expect(versions).toEqual([]);
    });
  });

  describe('cache management', () => {
    it('should clear cache for specific IDE', () => {
      service.cache.set('cursor:9222', { version: '1.6.0', timestamp: Date.now() });
      service.cache.set('vscode:9232', { version: '1.85.0', timestamp: Date.now() });

      service.clearCacheForIDE('cursor');

      expect(service.cache.has('cursor:9222')).toBe(false);
      expect(service.cache.has('vscode:9232')).toBe(true);
    });

    it('should clear all cache', () => {
      service.cache.set('cursor:9222', { version: '1.6.0', timestamp: Date.now() });
      service.cache.set('vscode:9232', { version: '1.85.0', timestamp: Date.now() });

      service.clearCache();

      expect(service.cache.size).toBe(0);
    });

    it('should get cache statistics', () => {
      service.cache.set('cursor:9222', { 
        version: '1.6.0', 
        result: {}, 
        timestamp: Date.now() 
      });

      const stats = service.getCacheStats();

      expect(stats.size).toBe(1);
      expect(stats.timeout).toBe(60 * 60 * 1000);
      expect(Array.isArray(stats.entries)).toBe(true);
    });

    it('should get service statistics', () => {
      const stats = service.getStats();

      expect(stats).toHaveProperty('cache');
      expect(stats).toHaveProperty('knownVersions');
      expect(stats.knownVersions).toHaveProperty('cursor');
    });
  });

  describe('error handling', () => {
    it('should handle version detector errors gracefully', async () => {
      mockVersionDetector.detectVersion.mockRejectedValue(
        new Error('Network error')
      );

      await expect(service.detectVersion(9222, 'cursor')).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle validation errors gracefully', async () => {
      const result = await service.validateVersion('invalid', 'cursor');

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle comparison errors gracefully', async () => {
      await expect(service.compareVersions('invalid', '1.0.0')).rejects.toThrow(
        'Versions must be in format x.y.z'
      );
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
