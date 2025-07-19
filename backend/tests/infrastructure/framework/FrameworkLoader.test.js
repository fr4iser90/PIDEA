const { expect } = require('chai');
const sinon = require('sinon');
const path = require('path');
const fs = require('fs').promises;
const FrameworkLoader = require('../../../infrastructure/framework/FrameworkLoader');

describe('FrameworkLoader', () => {
  let frameworkLoader;
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    frameworkLoader = new FrameworkLoader();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('Initialization', () => {
    it('should initialize with default settings', () => {
      expect(frameworkLoader.isInitialized).to.be.false;
      expect(frameworkLoader.frameworks).to.be.an('array').that.is.empty;
      expect(frameworkLoader.frameworkBasePath).to.be.undefined;
    });

    it('should initialize successfully with valid base path', async () => {
      const basePath = '/test/framework/path';
      sandbox.stub(fs, 'readdir').resolves(['refactoring_management', 'testing_management']);
      sandbox.stub(fs, 'stat').resolves({ isDirectory: () => true });
      sandbox.stub(fs, 'readFile').resolves(JSON.stringify({
        name: 'test_framework',
        version: '1.0.0',
        description: 'Test framework',
        category: 'test',
        steps: {},
        workflows: {}
      }));

      await frameworkLoader.initialize(basePath);

      expect(frameworkLoader.isInitialized).to.be.true;
      expect(frameworkLoader.frameworkBasePath).to.equal(basePath);
    });

    it('should handle initialization errors gracefully', async () => {
      const basePath = '/invalid/path';
      sandbox.stub(fs, 'readdir').rejects(new Error('Directory not found'));

      try {
        await frameworkLoader.initialize(basePath);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Directory not found');
        expect(frameworkLoader.isInitialized).to.be.false;
      }
    });
  });

  describe('Framework Discovery', () => {
    it('should discover valid framework directories', async () => {
      const basePath = '/test/framework/path';
      const frameworkDirs = ['refactoring_management', 'testing_management'];
      
      sandbox.stub(fs, 'readdir').resolves(frameworkDirs);
      sandbox.stub(fs, 'stat').resolves({ isDirectory: () => true });
      sandbox.stub(fs, 'readFile').resolves(JSON.stringify({
        name: 'test_framework',
        version: '1.0.0',
        description: 'Test framework',
        category: 'test',
        steps: {},
        workflows: {}
      }));

      await frameworkLoader.initialize(basePath);

      expect(frameworkLoader.frameworks).to.have.length(2);
      expect(frameworkLoader.frameworks[0].name).to.equal('refactoring_management');
      expect(frameworkLoader.frameworks[1].name).to.equal('testing_management');
    });

    it('should skip non-directory items', async () => {
      const basePath = '/test/framework/path';
      const items = ['refactoring_management', 'README.md', 'testing_management'];
      
      sandbox.stub(fs, 'readdir').resolves(items);
      sandbox.stub(fs, 'stat').callsFake((filePath) => {
        const isDir = !filePath.endsWith('.md');
        return Promise.resolve({ isDirectory: () => isDir });
      });
      sandbox.stub(fs, 'readFile').resolves(JSON.stringify({
        name: 'test_framework',
        version: '1.0.0',
        description: 'Test framework',
        category: 'test',
        steps: {},
        workflows: {}
      }));

      await frameworkLoader.initialize(basePath);

      expect(frameworkLoader.frameworks).to.have.length(2);
      expect(frameworkLoader.frameworks.map(f => f.name)).to.not.include('README.md');
    });

    it('should handle invalid framework configurations', async () => {
      const basePath = '/test/framework/path';
      const frameworkDirs = ['invalid_framework'];
      
      sandbox.stub(fs, 'readdir').resolves(frameworkDirs);
      sandbox.stub(fs, 'stat').resolves({ isDirectory: () => true });
      sandbox.stub(fs, 'readFile').rejects(new Error('Invalid JSON'));

      await frameworkLoader.initialize(basePath);

      expect(frameworkLoader.frameworks).to.have.length(0);
    });
  });

  describe('Framework Loading', () => {
    it('should load framework with valid configuration', async () => {
      const basePath = '/test/framework/path';
      const frameworkConfig = {
        name: 'refactoring_management',
        version: '1.0.0',
        description: 'Advanced refactoring operations',
        category: 'refactoring',
        author: 'PIDEA Team',
        dependencies: ['core'],
        steps: {
          extract_method: {
            name: 'extract_method',
            type: 'refactoring',
            category: 'func',
            description: 'Extract method from code block',
            dependencies: ['ide', 'cursor']
          }
        },
        workflows: {
          functional_refactoring: {
            name: 'functional_refactoring',
            steps: ['extract_method', 'inline_method'],
            description: 'Functional refactoring workflow'
          }
        },
        activation: {
          auto_load: false,
          requires_confirmation: true,
          fallback_to_core: true
        },
        settings: {
          max_file_size: 1000000,
          backup_enabled: true,
          validation_enabled: true,
          undo_enabled: true
        }
      };

      sandbox.stub(fs, 'readdir').resolves(['refactoring_management']);
      sandbox.stub(fs, 'stat').resolves({ isDirectory: () => true });
      sandbox.stub(fs, 'readFile').resolves(JSON.stringify(frameworkConfig));

      await frameworkLoader.initialize(basePath);

      expect(frameworkLoader.frameworks).to.have.length(1);
      const framework = frameworkLoader.frameworks[0];
      expect(framework.name).to.equal('refactoring_management');
      expect(framework.config.name).to.equal('refactoring_management');
      expect(framework.config.steps).to.have.property('extract_method');
      expect(framework.config.workflows).to.have.property('functional_refactoring');
    });

    it('should validate framework configuration structure', async () => {
      const basePath = '/test/framework/path';
      const invalidConfig = {
        name: 'invalid_framework'
        // Missing required fields
      };

      sandbox.stub(fs, 'readdir').resolves(['invalid_framework']);
      sandbox.stub(fs, 'stat').resolves({ isDirectory: () => true });
      sandbox.stub(fs, 'readFile').resolves(JSON.stringify(invalidConfig));

      await frameworkLoader.initialize(basePath);

      expect(frameworkLoader.frameworks).to.have.length(0);
    });
  });

  describe('Framework Management', () => {
    beforeEach(async () => {
      const basePath = '/test/framework/path';
      const frameworkConfig = {
        name: 'test_framework',
        version: '1.0.0',
        description: 'Test framework',
        category: 'test',
        steps: {},
        workflows: {}
      };

      sandbox.stub(fs, 'readdir').resolves(['test_framework']);
      sandbox.stub(fs, 'stat').resolves({ isDirectory: () => true });
      sandbox.stub(fs, 'readFile').resolves(JSON.stringify(frameworkConfig));

      await frameworkLoader.initialize(basePath);
    });

    it('should get all frameworks', () => {
      const frameworks = frameworkLoader.getFrameworks();
      expect(frameworks).to.be.an('array').with.length(1);
      expect(frameworks[0].name).to.equal('test_framework');
    });

    it('should get framework by name', () => {
      const framework = frameworkLoader.getFramework('test_framework');
      expect(framework).to.not.be.undefined;
      expect(framework.name).to.equal('test_framework');
    });

    it('should return undefined for non-existent framework', () => {
      const framework = frameworkLoader.getFramework('non_existent');
      expect(framework).to.be.undefined;
    });

    it('should get frameworks by category', () => {
      const frameworks = frameworkLoader.getFrameworksByCategory('test');
      expect(frameworks).to.be.an('array').with.length(1);
      expect(frameworks[0].name).to.equal('test_framework');
    });

    it('should return empty array for non-existent category', () => {
      const frameworks = frameworkLoader.getFrameworksByCategory('non_existent');
      expect(frameworks).to.be.an('array').that.is.empty;
    });
  });

  describe('Statistics', () => {
    it('should provide accurate statistics', async () => {
      const basePath = '/test/framework/path';
      const frameworkConfig = {
        name: 'test_framework',
        version: '1.0.0',
        description: 'Test framework',
        category: 'test',
        steps: { step1: {}, step2: {} },
        workflows: { workflow1: {} }
      };

      sandbox.stub(fs, 'readdir').resolves(['test_framework']);
      sandbox.stub(fs, 'stat').resolves({ isDirectory: () => true });
      sandbox.stub(fs, 'readFile').resolves(JSON.stringify(frameworkConfig));

      await frameworkLoader.initialize(basePath);

      const stats = frameworkLoader.getStats();
      expect(stats.totalFrameworks).to.equal(1);
      expect(stats.categories).to.have.property('test', 1);
      expect(stats.totalSteps).to.equal(2);
      expect(stats.totalWorkflows).to.equal(1);
      expect(stats.isInitialized).to.be.true;
    });
  });

  describe('Error Handling', () => {
    it('should handle file system errors gracefully', async () => {
      const basePath = '/test/framework/path';
      sandbox.stub(fs, 'readdir').rejects(new Error('Permission denied'));

      try {
        await frameworkLoader.initialize(basePath);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Permission denied');
      }
    });

    it('should handle JSON parsing errors', async () => {
      const basePath = '/test/framework/path';
      sandbox.stub(fs, 'readdir').resolves(['invalid_framework']);
      sandbox.stub(fs, 'stat').resolves({ isDirectory: () => true });
      sandbox.stub(fs, 'readFile').resolves('invalid json content');

      await frameworkLoader.initialize(basePath);

      expect(frameworkLoader.frameworks).to.have.length(0);
    });
  });
}); 