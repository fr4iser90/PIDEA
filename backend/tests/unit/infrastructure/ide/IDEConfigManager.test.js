const IDEConfigManager = require('@external/ide/IDEConfigManager');
const path = require('path');

// Mock fs.promises module
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn(),
    access: jest.fn()
  }
}));

const fs = require('fs');

describe('IDEConfigManager', () => {
  let configManager;
  let mockConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockConfig = {
      ideTypes: {
        cursor: {
          enabled: true,
          portRange: { start: 9222, end: 9231 },
          defaultOptions: {
            userDataDir: null,
            extensionsDir: null,
            disableExtensions: false,
            verbose: false
          },
          startupTimeout: 3000,
          autoStart: false
        },
        vscode: {
          enabled: true,
          portRange: { start: 9232, end: 9241 },
          defaultOptions: {
            userDataDir: null,
            extensionsDir: null,
            disableExtensions: false,
            verbose: false,
            newWindow: false
          },
          startupTimeout: 5000,
          autoStart: false
        },
        windsurf: {
          enabled: true,
          portRange: { start: 9242, end: 9251 },
          defaultOptions: {
            userDataDir: null,
            extensionsDir: null,
            disableExtensions: false,
            verbose: false,
            newWindow: false
          },
          startupTimeout: 4000,
          autoStart: false
        }
      },
      global: {
        defaultIDE: 'cursor',
        autoDetect: true,
        healthCheckInterval: 30000,
        maxConcurrentIDEs: 5,
        logLevel: 'info'
      },
      workspace: {
        rememberLastUsed: true,
        autoSwitch: false,
        defaultWorkspace: null
      }
    };

    // Mock fs.promises methods
    fs.promises.readFile.mockResolvedValue(JSON.stringify(mockConfig));
    fs.promises.writeFile.mockResolvedValue();
    fs.promises.mkdir.mockResolvedValue();
    fs.promises.access.mockResolvedValue();

    configManager = new IDEConfigManager();
  });

  describe('constructor', () => {
    it('should initialize with default config path', () => {
      expect(configManager.configPath).toBeDefined();
      expect(configManager.defaultConfig).toBeDefined();
    });

    it('should not load config automatically', () => {
      expect(configManager.config).toBeNull();
    });
  });

  describe('loadConfig', () => {
    it('should load config from file successfully', async () => {
      const result = await configManager.loadConfig();
      
      expect(result).toEqual(mockConfig);
      expect(fs.promises.readFile).toHaveBeenCalled();
    });

    it('should handle file read errors gracefully', async () => {
      fs.promises.readFile.mockRejectedValue(new Error('Permission denied'));

      const result = await configManager.loadConfig();
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('ideTypes');
      expect(result.ideTypes).toHaveProperty('cursor');
      expect(result.ideTypes).toHaveProperty('vscode');
      expect(result.ideTypes).toHaveProperty('windsurf');
      expect(result).toHaveProperty('global');
    });

    it('should handle invalid JSON gracefully', async () => {
      fs.promises.readFile.mockResolvedValue('invalid json');

      const result = await configManager.loadConfig();
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('ideTypes');
      expect(result.ideTypes).toHaveProperty('cursor');
      expect(result.ideTypes).toHaveProperty('vscode');
      expect(result.ideTypes).toHaveProperty('windsurf');
      expect(result).toHaveProperty('global');
    });
  });

  describe('saveConfig', () => {
    it('should save config to file successfully', async () => {
      const newConfig = { ...mockConfig, test: 'value' };
      
      await configManager.saveConfig(newConfig);
      
      expect(fs.promises.writeFile).toHaveBeenCalledWith(
        configManager.configPath,
        JSON.stringify(newConfig, null, 2),
        'utf8'
      );
      expect(configManager.config).toEqual(newConfig);
    });

    it('should handle write errors gracefully', async () => {
      fs.promises.writeFile.mockRejectedValue(new Error('Permission denied'));

      await expect(configManager.saveConfig(mockConfig)).rejects.toThrow('Permission denied');
    });

    it('should create directory if it does not exist', async () => {
      await configManager.saveConfig(mockConfig);
      
      expect(fs.promises.mkdir).toHaveBeenCalledWith(
        path.dirname(configManager.configPath),
        { recursive: true }
      );
    });
  });

  describe('getIDEConfig', () => {
    beforeEach(async () => {
      await configManager.loadConfig();
    });

    it('should return specific IDE config', () => {
      const result = configManager.getIDEConfig('cursor');
      expect(result).toEqual(mockConfig.ideTypes.cursor);
    });

    it('should throw error for unknown IDE', () => {
      expect(() => configManager.getIDEConfig('unknown')).toThrow('Unknown IDE type: unknown');
    });
  });

  describe('updateIDEConfig', () => {
    beforeEach(async () => {
      await configManager.loadConfig();
    });

    it('should update specific IDE config', async () => {
      const newCursorConfig = {
        portRange: { start: 9000, end: 9010 },
        startupTimeout: 1000
      };
      
      await configManager.updateIDEConfig('cursor', newCursorConfig);
      
      expect(configManager.config.ideTypes.cursor.portRange).toEqual(newCursorConfig.portRange);
      expect(configManager.config.ideTypes.cursor.startupTimeout).toBe(1000);
    });

    it('should throw error for unknown IDE', async () => {
      await expect(configManager.updateIDEConfig('unknown', {})).rejects.toThrow('Unknown IDE type: unknown');
    });
  });

  describe('validateConfig', () => {
    it('should validate valid config', () => {
      const result = configManager.validateConfig(mockConfig);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const invalidConfig = {
        ideTypes: {
          cursor: {
            portRange: { start: 9222 } // missing end
          }
        }
      };
      
      const result = configManager.validateConfig(invalidConfig);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect invalid port ranges', () => {
      const invalidConfig = {
        ideTypes: {
          cursor: {
            portRange: { start: 9231, end: 9222 } // end < start
          }
        }
      };
      
      const result = configManager.validateConfig(invalidConfig);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('port range'))).toBe(true);
    });
  });

  describe('getGlobalConfig', () => {
    beforeEach(async () => {
      await configManager.loadConfig();
    });

    it('should return global configuration', () => {
      const result = configManager.getGlobalConfig();
      expect(result).toEqual(mockConfig.global);
    });
  });

  describe('getWorkspaceConfig', () => {
    beforeEach(async () => {
      await configManager.loadConfig();
    });

    it('should return workspace configuration', () => {
      const result = configManager.getWorkspaceConfig();
      expect(result).toEqual(mockConfig.workspace);
    });
  });

  describe('isIDEEnabled', () => {
    beforeEach(async () => {
      await configManager.loadConfig();
    });

    it('should return true for enabled IDE', () => {
      const result = configManager.isIDEEnabled('cursor');
      expect(result).toBe(true);
    });

    it('should return false for unknown IDE', () => {
      const result = configManager.isIDEEnabled('unknown');
      expect(result).toBe(false);
    });
  });

  describe('getDefaultIDE', () => {
    beforeEach(async () => {
      await configManager.loadConfig();
    });

    it('should return default IDE type', () => {
      const result = configManager.getDefaultIDE();
      expect(result).toBe('cursor');
    });
  });

  describe('getEnabledIDETypes', () => {
    beforeEach(async () => {
      await configManager.loadConfig();
    });

    it('should return enabled IDE types', () => {
      const result = configManager.getEnabledIDETypes();
      expect(result).toContain('cursor');
      expect(result).toContain('vscode');
      expect(result).toContain('windsurf');
    });
  });

  describe('getConfigStats', () => {
    beforeEach(async () => {
      await configManager.loadConfig();
    });

    it('should return configuration statistics', () => {
      const result = configManager.getConfigStats();
      expect(result).toHaveProperty('totalIDETypes');
      expect(result).toHaveProperty('enabledIDETypes');
      expect(result).toHaveProperty('defaultIDE');
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('configPath');
    });
  });

  describe('resetToDefaults', () => {
    it('should reset config to default values', async () => {
      await configManager.loadConfig();
      
      // Modify current config
      configManager.config.test = 'value';
      configManager.config.ideTypes.cursor.portRange.start = 9999;
      
      await configManager.resetToDefaults();
      
      expect(configManager.config.test).toBeUndefined();
      expect(configManager.config.ideTypes.cursor.portRange.start).toBe(9222);
    });

    it('should save config after reset', async () => {
      await configManager.loadConfig();
      await configManager.resetToDefaults();
      
      expect(fs.promises.writeFile).toHaveBeenCalled();
    });
  });
});