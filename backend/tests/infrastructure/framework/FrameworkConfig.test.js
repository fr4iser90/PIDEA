const { expect } = require('chai');
const sinon = require('sinon');
const path = require('path');
const fs = require('fs').promises;
const FrameworkConfig = require('../../../infrastructure/framework/FrameworkConfig');

describe('FrameworkConfig', () => {
  let frameworkConfig;
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    frameworkConfig = new FrameworkConfig();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('Initialization', () => {
    it('should initialize with default settings', () => {
      expect(frameworkConfig.isInitialized).to.be.false;
      expect(frameworkConfig.config).to.be.an('object');
      expect(frameworkConfig.configPath).to.be.undefined;
      expect(frameworkConfig.lastModified).to.be.undefined;
    });

    it('should initialize successfully with default configuration', async () => {
      await frameworkConfig.initialize();

      expect(frameworkConfig.isInitialized).to.be.true;
      expect(frameworkConfig.config).to.be.an('object');
      expect(frameworkConfig.config.frameworkBasePath).to.be.a('string');
      expect(frameworkConfig.config.autoLoadFrameworks).to.be.a('boolean');
      expect(frameworkConfig.config.requireConfirmation).to.be.a('boolean');
      expect(frameworkConfig.config.fallbackToCore).to.be.a('boolean');
    });

    it('should load configuration from file if exists', async () => {
      const mockConfig = {
        frameworkBasePath: '/custom/framework/path',
        autoLoadFrameworks: true,
        requireConfirmation: false,
        fallbackToCore: true,
        maxFileSize: 2000000,
        backupEnabled: false,
        validationEnabled: true,
        undoEnabled: false
      };

      sandbox.stub(fs, 'access').resolves();
      sandbox.stub(fs, 'readFile').resolves(JSON.stringify(mockConfig));
      sandbox.stub(fs, 'stat').resolves({ mtime: new Date('2024-01-01') });

      await frameworkConfig.initialize();

      expect(frameworkConfig.isInitialized).to.be.true;
      expect(frameworkConfig.config.frameworkBasePath).to.equal('/custom/framework/path');
      expect(frameworkConfig.config.autoLoadFrameworks).to.be.true;
      expect(frameworkConfig.config.requireConfirmation).to.be.false;
      expect(frameworkConfig.lastModified).to.be.a('string');
    });

    it('should handle missing configuration file gracefully', async () => {
      sandbox.stub(fs, 'access').rejects(new Error('File not found'));

      await frameworkConfig.initialize();

      expect(frameworkConfig.isInitialized).to.be.true;
      expect(frameworkConfig.config).to.be.an('object');
      // Should use default configuration
      expect(frameworkConfig.config.frameworkBasePath).to.be.a('string');
    });

    it('should handle invalid configuration file gracefully', async () => {
      sandbox.stub(fs, 'access').resolves();
      sandbox.stub(fs, 'readFile').resolves('invalid json content');
      sandbox.stub(fs, 'stat').resolves({ mtime: new Date('2024-01-01') });

      await frameworkConfig.initialize();

      expect(frameworkConfig.isInitialized).to.be.true;
      expect(frameworkConfig.config).to.be.an('object');
      // Should use default configuration
      expect(frameworkConfig.config.frameworkBasePath).to.be.a('string');
    });
  });

  describe('Configuration Management', () => {
    beforeEach(async () => {
      await frameworkConfig.initialize();
    });

    it('should get current configuration', () => {
      const config = frameworkConfig.getConfig();

      expect(config).to.be.an('object');
      expect(config.frameworkBasePath).to.be.a('string');
      expect(config.autoLoadFrameworks).to.be.a('boolean');
      expect(config.requireConfirmation).to.be.a('boolean');
      expect(config.fallbackToCore).to.be.a('boolean');
    });

    it('should update configuration settings', async () => {
      const newConfig = {
        frameworkBasePath: '/new/framework/path',
        autoLoadFrameworks: true,
        requireConfirmation: false,
        fallbackToCore: true
      };

      sandbox.stub(fs, 'writeFile').resolves();

      const result = await frameworkConfig.updateConfig(newConfig);

      expect(result.success).to.be.true;
      expect(frameworkConfig.config.frameworkBasePath).to.equal('/new/framework/path');
      expect(frameworkConfig.config.autoLoadFrameworks).to.be.true;
      expect(frameworkConfig.config.requireConfirmation).to.be.false;
      expect(frameworkConfig.config.fallbackToCore).to.be.true;
    });

    it('should update individual configuration settings', async () => {
      sandbox.stub(fs, 'writeFile').resolves();

      const result = await frameworkConfig.updateSetting('autoLoadFrameworks', true);

      expect(result.success).to.be.true;
      expect(frameworkConfig.config.autoLoadFrameworks).to.be.true;
    });

    it('should validate configuration before updating', async () => {
      const invalidConfig = {
        frameworkBasePath: '', // Invalid empty path
        autoLoadFrameworks: 'invalid', // Invalid type
        requireConfirmation: true,
        fallbackToCore: true
      };

      const result = await frameworkConfig.updateConfig(invalidConfig);

      expect(result.success).to.be.false;
      expect(result.errors).to.be.an('array').that.is.not.empty;
      expect(result.errors.some(error => error.includes('frameworkBasePath'))).to.be.true;
      expect(result.errors.some(error => error.includes('autoLoadFrameworks'))).to.be.true;
    });

    it('should reset configuration to defaults', async () => {
      // First update with custom config
      const customConfig = {
        frameworkBasePath: '/custom/path',
        autoLoadFrameworks: true,
        requireConfirmation: false,
        fallbackToCore: true
      };

      sandbox.stub(fs, 'writeFile').resolves();
      await frameworkConfig.updateConfig(customConfig);

      // Verify custom config is applied
      expect(frameworkConfig.config.frameworkBasePath).to.equal('/custom/path');

      // Reset to defaults
      const result = await frameworkConfig.resetToDefaults();

      expect(result.success).to.be.true;
      expect(frameworkConfig.config.frameworkBasePath).to.not.equal('/custom/path');
      expect(frameworkConfig.config.autoLoadFrameworks).to.be.false; // Default value
    });
  });

  describe('Configuration Validation', () => {
    beforeEach(async () => {
      await frameworkConfig.initialize();
    });

    it('should validate correct configuration', () => {
      const validConfig = {
        frameworkBasePath: '/valid/path',
        autoLoadFrameworks: false,
        requireConfirmation: true,
        fallbackToCore: true,
        maxFileSize: 1000000,
        backupEnabled: true,
        validationEnabled: true,
        undoEnabled: true
      };

      const result = frameworkConfig.validateConfig(validConfig);

      expect(result.valid).to.be.true;
      expect(result.errors).to.be.an('array').that.is.empty;
    });

    it('should detect invalid framework base path', () => {
      const invalidConfig = {
        frameworkBasePath: '', // Empty path
        autoLoadFrameworks: false,
        requireConfirmation: true,
        fallbackToCore: true
      };

      const result = frameworkConfig.validateConfig(invalidConfig);

      expect(result.valid).to.be.false;
      expect(result.errors).to.be.an('array').that.is.not.empty;
      expect(result.errors.some(error => error.includes('frameworkBasePath'))).to.be.true;
    });

    it('should detect invalid boolean fields', () => {
      const invalidConfig = {
        frameworkBasePath: '/valid/path',
        autoLoadFrameworks: 'invalid', // Should be boolean
        requireConfirmation: 123, // Should be boolean
        fallbackToCore: 'invalid' // Should be boolean
      };

      const result = frameworkConfig.validateConfig(invalidConfig);

      expect(result.valid).to.be.false;
      expect(result.errors).to.be.an('array').that.is.not.empty;
      expect(result.errors.some(error => error.includes('autoLoadFrameworks'))).to.be.true;
      expect(result.errors.some(error => error.includes('requireConfirmation'))).to.be.true;
      expect(result.errors.some(error => error.includes('fallbackToCore'))).to.be.true;
    });

    it('should detect invalid numeric fields', () => {
      const invalidConfig = {
        frameworkBasePath: '/valid/path',
        autoLoadFrameworks: false,
        requireConfirmation: true,
        fallbackToCore: true,
        maxFileSize: 'invalid', // Should be number
        backupEnabled: true,
        validationEnabled: true,
        undoEnabled: true
      };

      const result = frameworkConfig.validateConfig(invalidConfig);

      expect(result.valid).to.be.false;
      expect(result.errors).to.be.an('array').that.is.not.empty;
      expect(result.errors.some(error => error.includes('maxFileSize'))).to.be.true;
    });

    it('should validate file size limits', () => {
      const invalidConfig = {
        frameworkBasePath: '/valid/path',
        autoLoadFrameworks: false,
        requireConfirmation: true,
        fallbackToCore: true,
        maxFileSize: -1, // Invalid negative value
        backupEnabled: true,
        validationEnabled: true,
        undoEnabled: true
      };

      const result = frameworkConfig.validateConfig(invalidConfig);

      expect(result.valid).to.be.false;
      expect(result.errors).to.be.an('array').that.is.not.empty;
      expect(result.errors.some(error => error.includes('maxFileSize'))).to.be.true;
    });

    it('should validate path accessibility', async () => {
      const configWithInvalidPath = {
        frameworkBasePath: '/invalid/path/that/does/not/exist',
        autoLoadFrameworks: false,
        requireConfirmation: true,
        fallbackToCore: true
      };

      sandbox.stub(fs, 'access').rejects(new Error('Path not accessible'));

      const result = await frameworkConfig.validateConfigAsync(configWithInvalidPath);

      expect(result.valid).to.be.false;
      expect(result.errors).to.be.an('array').that.is.not.empty;
      expect(result.errors.some(error => error.includes('not accessible'))).to.be.true;
    });
  });

  describe('Configuration Persistence', () => {
    beforeEach(async () => {
      await frameworkConfig.initialize();
    });

    it('should save configuration to file', async () => {
      const newConfig = {
        frameworkBasePath: '/save/test/path',
        autoLoadFrameworks: true,
        requireConfirmation: false,
        fallbackToCore: true
      };

      const writeFileStub = sandbox.stub(fs, 'writeFile').resolves();

      const result = await frameworkConfig.saveConfig(newConfig);

      expect(result.success).to.be.true;
      expect(writeFileStub.calledOnce).to.be.true;
      
      const savedConfig = JSON.parse(writeFileStub.firstCall.args[1]);
      expect(savedConfig.frameworkBasePath).to.equal('/save/test/path');
      expect(savedConfig.autoLoadFrameworks).to.be.true;
    });

    it('should handle save errors gracefully', async () => {
      const newConfig = {
        frameworkBasePath: '/save/test/path',
        autoLoadFrameworks: true,
        requireConfirmation: false,
        fallbackToCore: true
      };

      sandbox.stub(fs, 'writeFile').rejects(new Error('Write permission denied'));

      const result = await frameworkConfig.saveConfig(newConfig);

      expect(result.success).to.be.false;
      expect(result.error).to.include('Write permission denied');
    });

    it('should load configuration from file', async () => {
      const fileConfig = {
        frameworkBasePath: '/load/test/path',
        autoLoadFrameworks: true,
        requireConfirmation: false,
        fallbackToCore: true,
        maxFileSize: 2000000,
        backupEnabled: false,
        validationEnabled: true,
        undoEnabled: false
      };

      sandbox.stub(fs, 'access').resolves();
      sandbox.stub(fs, 'readFile').resolves(JSON.stringify(fileConfig));
      sandbox.stub(fs, 'stat').resolves({ mtime: new Date('2024-01-01') });

      const result = await frameworkConfig.loadConfig();

      expect(result.success).to.be.true;
      expect(frameworkConfig.config.frameworkBasePath).to.equal('/load/test/path');
      expect(frameworkConfig.config.autoLoadFrameworks).to.be.true;
      expect(frameworkConfig.config.requireConfirmation).to.be.false;
    });

    it('should handle load errors gracefully', async () => {
      sandbox.stub(fs, 'access').rejects(new Error('File not found'));

      const result = await frameworkConfig.loadConfig();

      expect(result.success).to.be.false;
      expect(result.error).to.include('File not found');
    });

    it('should handle invalid JSON in config file', async () => {
      sandbox.stub(fs, 'access').resolves();
      sandbox.stub(fs, 'readFile').resolves('invalid json content');
      sandbox.stub(fs, 'stat').resolves({ mtime: new Date('2024-01-01') });

      const result = await frameworkConfig.loadConfig();

      expect(result.success).to.be.false;
      expect(result.error).to.include('Invalid JSON');
    });
  });

  describe('Configuration Utilities', () => {
    beforeEach(async () => {
      await frameworkConfig.initialize();
    });

    it('should get configuration statistics', () => {
      const stats = frameworkConfig.getConfigStats();

      expect(stats).to.be.an('object');
      expect(stats.isInitialized).to.be.true;
      expect(stats.configPath).to.be.a('string');
      expect(stats.lastModified).to.be.a('string');
      expect(stats.totalSettings).to.be.a('number');
      expect(stats.modifiedSettings).to.be.a('number');
    });

    it('should check if configuration has been modified', async () => {
      // Initially should not be modified
      expect(frameworkConfig.isModified()).to.be.false;

      // Update a setting
      sandbox.stub(fs, 'writeFile').resolves();
      await frameworkConfig.updateSetting('autoLoadFrameworks', true);

      // Should be modified now
      expect(frameworkConfig.isModified()).to.be.true;
    });

    it('should get configuration differences', () => {
      const originalConfig = frameworkConfig.getConfig();
      const modifiedConfig = {
        ...originalConfig,
        autoLoadFrameworks: true,
        requireConfirmation: false
      };

      const differences = frameworkConfig.getConfigDifferences(modifiedConfig);

      expect(differences).to.be.an('object');
      expect(differences.autoLoadFrameworks).to.have.property('original');
      expect(differences.autoLoadFrameworks).to.have.property('modified');
      expect(differences.requireConfirmation).to.have.property('original');
      expect(differences.requireConfirmation).to.have.property('modified');
    });

    it('should export configuration to different formats', () => {
      const jsonExport = frameworkConfig.exportConfig('json');
      const yamlExport = frameworkConfig.exportConfig('yaml');

      expect(jsonExport).to.be.a('string');
      expect(JSON.parse(jsonExport)).to.be.an('object');
      expect(yamlExport).to.be.a('string');
      expect(yamlExport).to.include('frameworkBasePath');
    });

    it('should import configuration from different formats', async () => {
      const jsonConfig = JSON.stringify({
        frameworkBasePath: '/import/test/path',
        autoLoadFrameworks: true,
        requireConfirmation: false,
        fallbackToCore: true
      });

      sandbox.stub(fs, 'writeFile').resolves();

      const result = await frameworkConfig.importConfig(jsonConfig, 'json');

      expect(result.success).to.be.true;
      expect(frameworkConfig.config.frameworkBasePath).to.equal('/import/test/path');
      expect(frameworkConfig.config.autoLoadFrameworks).to.be.true;
    });

    it('should handle import errors gracefully', async () => {
      const invalidJson = 'invalid json content';

      const result = await frameworkConfig.importConfig(invalidJson, 'json');

      expect(result.success).to.be.false;
      expect(result.error).to.include('Invalid JSON');
    });
  });

  describe('Environment Variable Integration', () => {
    beforeEach(async () => {
      await frameworkConfig.initialize();
    });

    it('should load configuration from environment variables', () => {
      // Mock environment variables
      const originalEnv = process.env;
      process.env.FRAMEWORK_BASE_PATH = '/env/test/path';
      process.env.FRAMEWORK_AUTO_LOAD = 'true';
      process.env.FRAMEWORK_REQUIRE_CONFIRMATION = 'false';

      const config = frameworkConfig.loadFromEnvironment();

      expect(config.frameworkBasePath).to.equal('/env/test/path');
      expect(config.autoLoadFrameworks).to.be.true;
      expect(config.requireConfirmation).to.be.false;

      // Restore environment
      process.env = originalEnv;
    });

    it('should handle invalid environment variable values', () => {
      // Mock environment variables with invalid values
      const originalEnv = process.env;
      process.env.FRAMEWORK_AUTO_LOAD = 'invalid';
      process.env.FRAMEWORK_MAX_FILE_SIZE = 'not_a_number';

      const config = frameworkConfig.loadFromEnvironment();

      // Should use default values for invalid environment variables
      expect(config.autoLoadFrameworks).to.be.false; // Default value
      expect(config.maxFileSize).to.be.a('number'); // Default value

      // Restore environment
      process.env = originalEnv;
    });

    it('should merge environment configuration with file configuration', async () => {
      const fileConfig = {
        frameworkBasePath: '/file/path',
        autoLoadFrameworks: false,
        requireConfirmation: true,
        fallbackToCore: true
      };

      // Mock environment variables
      const originalEnv = process.env;
      process.env.FRAMEWORK_BASE_PATH = '/env/path';
      process.env.FRAMEWORK_AUTO_LOAD = 'true';

      const mergedConfig = frameworkConfig.mergeWithEnvironment(fileConfig);

      // Environment variables should override file config
      expect(mergedConfig.frameworkBasePath).to.equal('/env/path');
      expect(mergedConfig.autoLoadFrameworks).to.be.true;
      expect(mergedConfig.requireConfirmation).to.be.true; // From file
      expect(mergedConfig.fallbackToCore).to.be.true; // From file

      // Restore environment
      process.env = originalEnv;
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await frameworkConfig.initialize();
    });

    it('should handle initialization errors gracefully', async () => {
      const newConfig = new FrameworkConfig();
      sandbox.stub(fs, 'access').rejects(new Error('Permission denied'));

      try {
        await newConfig.initialize();
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Permission denied');
        expect(newConfig.isInitialized).to.be.false;
      }
    });

    it('should handle configuration update errors gracefully', async () => {
      const invalidConfig = null;

      const result = await frameworkConfig.updateConfig(invalidConfig);

      expect(result.success).to.be.false;
      expect(result.errors).to.be.an('array').that.is.not.empty;
      expect(result.errors[0]).to.include('Configuration is required');
    });

    it('should handle file system errors gracefully', async () => {
      sandbox.stub(fs, 'writeFile').rejects(new Error('Disk full'));

      const result = await frameworkConfig.saveConfig({
        frameworkBasePath: '/test/path',
        autoLoadFrameworks: true,
        requireConfirmation: false,
        fallbackToCore: true
      });

      expect(result.success).to.be.false;
      expect(result.error).to.include('Disk full');
    });

    it('should handle validation errors gracefully', () => {
      const invalidConfig = {
        frameworkBasePath: '', // Invalid
        autoLoadFrameworks: 'invalid', // Invalid
        requireConfirmation: true,
        fallbackToCore: true
      };

      const result = frameworkConfig.validateConfig(invalidConfig);

      expect(result.valid).to.be.false;
      expect(result.errors).to.be.an('array').that.is.not.empty;
      expect(result.errors.length).to.be.greaterThan(0);
    });
  });
}); 