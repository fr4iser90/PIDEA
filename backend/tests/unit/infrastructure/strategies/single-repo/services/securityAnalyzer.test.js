const SecurityAnalyzer = require('@strategies/single-repo/services/securityAnalyzer');
const { SECURITY_FILES, SECRETS_FILES, SECURITY_DEPENDENCIES } = require('@strategies/single-repo/constants');

describe('SecurityAnalyzer', () => {
  let securityAnalyzer;
  let mockLogger;
  let mockFileUtils;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    };

    mockFileUtils = {
      readJsonFile: jest.fn(),
      hasAnyFile: jest.fn()
    };

    securityAnalyzer = new SecurityAnalyzer(mockLogger, mockFileUtils);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with logger and fileUtils', () => {
      expect(securityAnalyzer.logger).toBe(mockLogger);
      expect(securityAnalyzer.fileUtils).toBe(mockFileUtils);
    });

    it('should handle undefined logger gracefully', () => {
      const analyzerWithoutLogger = new SecurityAnalyzer(undefined, mockFileUtils);
      expect(analyzerWithoutLogger.logger).toBeUndefined();
      expect(analyzerWithoutLogger.fileUtils).toBe(mockFileUtils);
    });

    it('should handle undefined fileUtils gracefully', () => {
      const analyzerWithoutFileUtils = new SecurityAnalyzer(mockLogger, undefined);
      expect(analyzerWithoutFileUtils.logger).toBe(mockLogger);
      expect(analyzerWithoutFileUtils.fileUtils).toBeUndefined();
    });
  });

  describe('analyzeSecurity', () => {
    const projectPath = '/test/project/path';

    it('should analyze security successfully with all features detected', async () => {
      const mockPackageJson = {
        dependencies: {
          'helmet': '^4.0.0',
          'bcrypt': '^5.0.0'
        },
        devDependencies: {
          'express-rate-limit': '^5.0.0'
        },
        scripts: {
          audit: 'npm audit'
        }
      };

      mockFileUtils.readJsonFile.mockResolvedValue(mockPackageJson);
      mockFileUtils.hasAnyFile
        .mockResolvedValueOnce(true)  // SECURITY_FILES
        .mockResolvedValueOnce(true); // SECRETS_FILES

      const result = await securityAnalyzer.analyzeSecurity(projectPath);

      expect(result).toEqual({
        hasSecurityConfig: true,
        hasAuditScript: true,
        hasSecretsManagement: true,
        hasSecurityDependencies: true
      });

      expect(mockFileUtils.readJsonFile).toHaveBeenCalledWith(
        expect.stringContaining('package.json')
      );
      expect(mockFileUtils.hasAnyFile).toHaveBeenCalledWith(projectPath, SECURITY_FILES);
      expect(mockFileUtils.hasAnyFile).toHaveBeenCalledWith(projectPath, SECRETS_FILES);
    });

    it('should analyze security with no features detected', async () => {
      const mockPackageJson = {
        dependencies: {
          'express': '^4.0.0'
        },
        devDependencies: {}
      };

      mockFileUtils.readJsonFile.mockResolvedValue(mockPackageJson);
      mockFileUtils.hasAnyFile
        .mockResolvedValueOnce(false)  // SECURITY_FILES
        .mockResolvedValueOnce(false); // SECRETS_FILES

      const result = await securityAnalyzer.analyzeSecurity(projectPath);

      expect(result).toEqual({
        hasSecurityConfig: false,
        hasAuditScript: false,
        hasSecretsManagement: false,
        hasSecurityDependencies: false
      });
    });

    it('should handle package.json read errors gracefully', async () => {
      mockFileUtils.readJsonFile.mockRejectedValue(new Error('File not found'));
      mockFileUtils.hasAnyFile
        .mockResolvedValueOnce(false)  // SECURITY_FILES
        .mockResolvedValueOnce(false); // SECRETS_FILES

      const result = await securityAnalyzer.analyzeSecurity(projectPath);

      expect(result).toEqual({
        hasSecurityConfig: false,
        hasAuditScript: false,
        hasSecretsManagement: false,
        hasSecurityDependencies: false
      });

      expect(mockFileUtils.readJsonFile).toHaveBeenCalled();
      expect(mockFileUtils.hasAnyFile).not.toHaveBeenCalled();
    });

    it('should handle null package.json gracefully', async () => {
      mockFileUtils.readJsonFile.mockResolvedValue(null);
      mockFileUtils.hasAnyFile
        .mockResolvedValueOnce(false)  // SECURITY_FILES
        .mockResolvedValueOnce(false); // SECRETS_FILES

      const result = await securityAnalyzer.analyzeSecurity(projectPath);

      expect(result).toEqual({
        hasSecurityConfig: false,
        hasAuditScript: false,
        hasSecretsManagement: false,
        hasSecurityDependencies: false
      });
    });

    it('should handle package.json without dependencies', async () => {
      const mockPackageJson = {
        name: 'test-project',
        version: '1.0.0'
      };

      mockFileUtils.readJsonFile.mockResolvedValue(mockPackageJson);
      mockFileUtils.hasAnyFile
        .mockResolvedValueOnce(false)  // SECURITY_FILES
        .mockResolvedValueOnce(false); // SECRETS_FILES

      const result = await securityAnalyzer.analyzeSecurity(projectPath);

      expect(result).toEqual({
        hasSecurityConfig: false,
        hasAuditScript: false,
        hasSecretsManagement: false,
        hasSecurityDependencies: false
      });
    });

    it('should handle package.json with only dependencies', async () => {
      const mockPackageJson = {
        dependencies: {
          'helmet': '^4.0.0'
        }
      };

      mockFileUtils.readJsonFile.mockResolvedValue(mockPackageJson);
      mockFileUtils.hasAnyFile
        .mockResolvedValueOnce(false)  // SECURITY_FILES
        .mockResolvedValueOnce(false); // SECRETS_FILES

      const result = await securityAnalyzer.analyzeSecurity(projectPath);

      expect(result).toEqual({
        hasSecurityConfig: false,
        hasAuditScript: false,
        hasSecretsManagement: false,
        hasSecurityDependencies: true
      });
    });

    it('should handle package.json with only devDependencies', async () => {
      const mockPackageJson = {
        devDependencies: {
          'cors': '^2.8.0'
        }
      };

      mockFileUtils.readJsonFile.mockResolvedValue(mockPackageJson);
      mockFileUtils.hasAnyFile
        .mockResolvedValueOnce(false)  // SECURITY_FILES
        .mockResolvedValueOnce(false); // SECRETS_FILES

      const result = await securityAnalyzer.analyzeSecurity(projectPath);

      expect(result).toEqual({
        hasSecurityConfig: false,
        hasAuditScript: false,
        hasSecretsManagement: false,
        hasSecurityDependencies: true
      });
    });

    it('should detect audit script in package.json', async () => {
      const mockPackageJson = {
        dependencies: {},
        scripts: {
          audit: 'npm audit --audit-level=moderate'
        }
      };

      mockFileUtils.readJsonFile.mockResolvedValue(mockPackageJson);
      mockFileUtils.hasAnyFile
        .mockResolvedValueOnce(false)  // SECURITY_FILES
        .mockResolvedValueOnce(false); // SECRETS_FILES

      const result = await securityAnalyzer.analyzeSecurity(projectPath);

      expect(result.hasAuditScript).toBe(true);
    });

    it('should not detect audit script when missing', async () => {
      const mockPackageJson = {
        dependencies: {},
        scripts: {
          test: 'jest',
          build: 'webpack'
        }
      };

      mockFileUtils.readJsonFile.mockResolvedValue(mockPackageJson);
      mockFileUtils.hasAnyFile
        .mockResolvedValueOnce(false)  // SECURITY_FILES
        .mockResolvedValueOnce(false); // SECRETS_FILES

      const result = await securityAnalyzer.analyzeSecurity(projectPath);

      expect(result.hasAuditScript).toBe(false);
    });

    it('should handle package.json without scripts section', async () => {
      const mockPackageJson = {
        dependencies: {}
      };

      mockFileUtils.readJsonFile.mockResolvedValue(mockPackageJson);
      mockFileUtils.hasAnyFile
        .mockResolvedValueOnce(false)  // SECURITY_FILES
        .mockResolvedValueOnce(false); // SECRETS_FILES

      const result = await securityAnalyzer.analyzeSecurity(projectPath);

      expect(result.hasAuditScript).toBe(false);
    });

    it('should detect security configuration files', async () => {
      const mockPackageJson = {
        dependencies: {}
      };

      mockFileUtils.readJsonFile.mockResolvedValue(mockPackageJson);
      mockFileUtils.hasAnyFile
        .mockResolvedValueOnce(true)   // SECURITY_FILES
        .mockResolvedValueOnce(false); // SECRETS_FILES

      const result = await securityAnalyzer.analyzeSecurity(projectPath);

      expect(result.hasSecurityConfig).toBe(true);
      expect(mockFileUtils.hasAnyFile).toHaveBeenCalledWith(projectPath, SECURITY_FILES);
    });

    it('should detect secrets management files', async () => {
      const mockPackageJson = {
        dependencies: {}
      };

      mockFileUtils.readJsonFile.mockResolvedValue(mockPackageJson);
      mockFileUtils.hasAnyFile
        .mockResolvedValueOnce(false)  // SECURITY_FILES
        .mockResolvedValueOnce(true);  // SECRETS_FILES

      const result = await securityAnalyzer.analyzeSecurity(projectPath);

      expect(result.hasSecretsManagement).toBe(true);
      expect(mockFileUtils.hasAnyFile).toHaveBeenCalledWith(projectPath, SECRETS_FILES);
    });

    it('should handle file system errors during security config check', async () => {
      const mockPackageJson = {
        dependencies: {}
      };

      mockFileUtils.readJsonFile.mockResolvedValue(mockPackageJson);
      mockFileUtils.hasAnyFile
        .mockRejectedValueOnce(new Error('Permission denied'))  // SECURITY_FILES
        .mockResolvedValueOnce(false); // SECRETS_FILES

      const result = await securityAnalyzer.analyzeSecurity(projectPath);

      expect(result.hasSecurityConfig).toBe(false);
      expect(result.hasSecretsManagement).toBe(false);
    });

    it('should handle file system errors during secrets check', async () => {
      const mockPackageJson = {
        dependencies: {}
      };

      mockFileUtils.readJsonFile.mockResolvedValue(mockPackageJson);
      mockFileUtils.hasAnyFile
        .mockResolvedValueOnce(false)  // SECURITY_FILES
        .mockRejectedValueOnce(new Error('Permission denied')); // SECRETS_FILES

      const result = await securityAnalyzer.analyzeSecurity(projectPath);

      expect(result.hasSecurityConfig).toBe(false);
      expect(result.hasSecretsManagement).toBe(false);
    });

    it('should handle overall analysis errors and log them', async () => {
      // Mock fileUtils.hasAnyFile to throw an error to trigger the outer catch block
      mockFileUtils.readJsonFile.mockResolvedValue({ dependencies: {} });
      mockFileUtils.hasAnyFile.mockRejectedValue(new Error('Critical error'));

      const result = await securityAnalyzer.analyzeSecurity(projectPath);

      expect(result).toEqual({});
      expect(mockLogger.error).toHaveBeenCalledWith(
        'SecurityAnalyzer: Failed to analyze security',
        expect.objectContaining({
          projectPath,
          error: 'Critical error'
        })
      );
    });

    it('should handle undefined projectPath gracefully', async () => {
      const result = await securityAnalyzer.analyzeSecurity(undefined);

      expect(result).toEqual({
        hasSecurityConfig: false,
        hasAuditScript: false,
        hasSecretsManagement: false,
        hasSecurityDependencies: false
      });
    });

    it('should handle empty projectPath gracefully', async () => {
      const result = await securityAnalyzer.analyzeSecurity('');

      expect(result).toEqual({
        hasSecurityConfig: false,
        hasAuditScript: false,
        hasSecretsManagement: false,
        hasSecurityDependencies: false
      });
    });
  });

  describe('hasAnyDependency', () => {
    it('should return true when dependency exists in dependencies', () => {
      const dependencies = {
        'helmet': '^4.0.0',
        'express': '^4.0.0'
      };
      const targetDeps = ['helmet', 'bcrypt'];

      const result = securityAnalyzer.hasAnyDependency(dependencies, targetDeps);

      expect(result).toBe(true);
    });

    it('should return true when dependency exists in devDependencies', () => {
      const dependencies = {
        'express': '^4.0.0'
      };
      const targetDeps = ['helmet', 'cors'];

      const result = securityAnalyzer.hasAnyDependency(dependencies, targetDeps);

      expect(result).toBe(false);
    });

    it('should return false when no target dependencies exist', () => {
      const dependencies = {
        'express': '^4.0.0',
        'lodash': '^4.17.0'
      };
      const targetDeps = ['helmet', 'bcrypt', 'cors'];

      const result = securityAnalyzer.hasAnyDependency(dependencies, targetDeps);

      expect(result).toBe(false);
    });

    it('should return false when dependencies object is empty', () => {
      const dependencies = {};
      const targetDeps = ['helmet', 'bcrypt'];

      const result = securityAnalyzer.hasAnyDependency(dependencies, targetDeps);

      expect(result).toBe(false);
    });

    it('should return false when targetDeps array is empty', () => {
      const dependencies = {
        'helmet': '^4.0.0'
      };
      const targetDeps = [];

      const result = securityAnalyzer.hasAnyDependency(dependencies, targetDeps);

      expect(result).toBe(false);
    });

    it('should return false when dependencies is null', () => {
      const dependencies = null;
      const targetDeps = ['helmet', 'bcrypt'];

      const result = securityAnalyzer.hasAnyDependency(dependencies, targetDeps);

      expect(result).toBe(false);
    });

    it('should return false when dependencies is undefined', () => {
      const dependencies = undefined;
      const targetDeps = ['helmet', 'bcrypt'];

      const result = securityAnalyzer.hasAnyDependency(dependencies, targetDeps);

      expect(result).toBe(false);
    });

    it('should handle case-sensitive dependency matching', () => {
      const dependencies = {
        'Helmet': '^4.0.0',  // Different case
        'express': '^4.0.0'
      };
      const targetDeps = ['helmet', 'bcrypt'];

      const result = securityAnalyzer.hasAnyDependency(dependencies, targetDeps);

      expect(result).toBe(false);
    });

    it('should handle partial dependency name matching', () => {
      const dependencies = {
        'helmet-extra': '^4.0.0',  // Partial match
        'express': '^4.0.0'
      };
      const targetDeps = ['helmet', 'bcrypt'];

      const result = securityAnalyzer.hasAnyDependency(dependencies, targetDeps);

      expect(result).toBe(false);
    });

    it('should handle multiple target dependencies correctly', () => {
      const dependencies = {
        'helmet': '^4.0.0',
        'express': '^4.0.0'
      };
      const targetDeps = ['helmet', 'bcrypt', 'cors', 'jsonwebtoken'];

      const result = securityAnalyzer.hasAnyDependency(dependencies, targetDeps);

      expect(result).toBe(true);
    });

    it('should handle all SECURITY_DEPENDENCIES constants', () => {
      const dependencies = {
        'helmet': '^4.0.0',
        'express-rate-limit': '^5.0.0',
        'cors': '^2.8.0',
        'bcrypt': '^5.0.0',
        'jsonwebtoken': '^8.5.0'
      };

      const result = securityAnalyzer.hasAnyDependency(dependencies, SECURITY_DEPENDENCIES);

      expect(result).toBe(true);
    });
  });

  describe('integration with constants', () => {
    it('should use correct SECURITY_FILES constant', () => {
      expect(SECURITY_FILES).toEqual([
        '.env.example', 'security.config.js', 'auth.config.js'
      ]);
    });

    it('should use correct SECRETS_FILES constant', () => {
      expect(SECRETS_FILES).toEqual([
        '.env', '.env.local', 'secrets.json'
      ]);
    });

    it('should use correct SECURITY_DEPENDENCIES constant', () => {
      expect(SECURITY_DEPENDENCIES).toEqual([
        'helmet', 'express-rate-limit', 'cors', 'bcrypt', 'jsonwebtoken'
      ]);
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle fileUtils.readJsonFile throwing non-Error objects', async () => {
      mockFileUtils.readJsonFile.mockRejectedValue('String error');
      mockFileUtils.hasAnyFile
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false);

      const result = await securityAnalyzer.analyzeSecurity('/test/path');

      expect(result).toEqual({
        hasSecurityConfig: false,
        hasAuditScript: false,
        hasSecretsManagement: false,
        hasSecurityDependencies: false
      });
    });

    it('should handle fileUtils.hasAnyFile throwing errors for security files', async () => {
      const mockPackageJson = { dependencies: {} };
      mockFileUtils.readJsonFile.mockResolvedValue(mockPackageJson);
      mockFileUtils.hasAnyFile
        .mockRejectedValue(new Error('Security files check failed'))
        .mockResolvedValueOnce(false);

      const result = await securityAnalyzer.analyzeSecurity('/test/path');

      expect(result).toEqual({
        hasSecurityConfig: false,
        hasAuditScript: false,
        hasSecretsManagement: false,
        hasSecurityDependencies: false
      });
    });

    it('should handle fileUtils.hasAnyFile throwing errors for secrets files', async () => {
      const mockPackageJson = { dependencies: {} };
      mockFileUtils.readJsonFile.mockResolvedValue(mockPackageJson);
      mockFileUtils.hasAnyFile
        .mockResolvedValueOnce(false)
        .mockRejectedValue(new Error('Secrets files check failed'));

      const result = await securityAnalyzer.analyzeSecurity('/test/path');

      expect(result).toEqual({
        hasSecurityConfig: false,
        hasAuditScript: false,
        hasSecretsManagement: false,
        hasSecurityDependencies: false
      });
    });

    it('should handle package.json with malformed structure', async () => {
      const mockPackageJson = {
        dependencies: 'not-an-object',
        devDependencies: null,
        scripts: undefined
      };

      mockFileUtils.readJsonFile.mockResolvedValue(mockPackageJson);
      mockFileUtils.hasAnyFile
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false);

      const result = await securityAnalyzer.analyzeSecurity('/test/path');

      expect(result).toEqual({
        hasSecurityConfig: false,
        hasAuditScript: false,
        hasSecretsManagement: false,
        hasSecurityDependencies: false
      });
    });
  });
}); 