/**
 * Unified System Analysis Tests
 * Tests for the unified system analysis and validation scripts
 */

const fs = require('fs-extra');
const path = require('path');

// Import the classes we're testing
const UnifiedSystemBackup = require('../../scripts/cleanup/backup-unified-system');
const UnifiedDependencyAnalyzer = require('../../scripts/cleanup/analyze-unified-dependencies');
const CategoriesSystemValidator = require('../../scripts/cleanup/validate-categories-system');
const UnifiedSystemRollback = require('../../scripts/cleanup/rollback-unified-system');

describe('Unified System Analysis Tests', () => {
  let testBackupDir;
  let testDocsDir;

  beforeAll(async () => {
    // Create test directories
    testBackupDir = path.join(__dirname, '../../backups/test-unified-system');
    testDocsDir = path.join(__dirname, '../../docs/cleanup');
    
    await fs.ensureDir(testBackupDir);
    await fs.ensureDir(testDocsDir);
  });

  afterAll(async () => {
    // Clean up test directories
    await fs.remove(testBackupDir);
    await fs.remove(testDocsDir);
  });

  describe('UnifiedSystemBackup', () => {
    let backup;

    beforeEach(() => {
      backup = new UnifiedSystemBackup();
      // Override backup directory for testing
      backup.backupDir = testBackupDir;
    });

    test('should create backup instance with correct file list', () => {
      expect(backup).toBeInstanceOf(UnifiedSystemBackup);
      expect(backup.filesToBackup).toBeInstanceOf(Array);
      expect(backup.filesToBackup.length).toBeGreaterThan(0);
      
      // Check that expected files are in the list
      const expectedFiles = [
        'backend/domain/services/UnifiedWorkflowService.js',
        'backend/application/handlers/workflow/UnifiedWorkflowHandler.js',
        'backend/application/handlers/UnifiedHandlerRegistry.js'
      ];
      
      expectedFiles.forEach(file => {
        expect(backup.filesToBackup).toContain(file);
      });
    });

    test('should list backups correctly', async () => {
      // Create a mock backup
      const mockBackupDir = path.join(testBackupDir, 'backup-test-2024-12-19T10-00-00-000Z');
      const mockMetadata = {
        backupInfo: {
          timestamp: '2024-12-19T10:00:00.000Z',
          totalFiles: 5,
          backedUpFiles: 4,
          errors: 1
        }
      };
      
      await fs.ensureDir(mockBackupDir);
      await fs.writeJson(path.join(mockBackupDir, 'backup-metadata.json'), mockMetadata);
      
      const backups = await backup.listBackups();
      expect(backups).toHaveLength(1);
      expect(backups[0].name).toBe('backup-test-2024-12-19T10-00-00-000Z');
      expect(backups[0].totalFiles).toBe(5);
      expect(backups[0].backedUpFiles).toBe(4);
      expect(backups[0].errors).toBe(1);
    });

    test('should validate backup correctly', async () => {
      // Create a mock backup with files
      const mockBackupDir = path.join(testBackupDir, 'backup-test-validation');
      const mockMetadata = {
        backupReport: {
          files: [
            {
              path: 'test-file-1.js',
              status: 'success'
            },
            {
              path: 'test-file-2.js',
              status: 'success'
            }
          ]
        }
      };
      
      await fs.ensureDir(mockBackupDir);
      await fs.writeJson(path.join(mockBackupDir, 'backup-metadata.json'), mockMetadata);
      
      // Create the actual files
      await fs.writeFile(path.join(mockBackupDir, 'test-file-1.js'), 'test content 1');
      await fs.writeFile(path.join(mockBackupDir, 'test-file-2.js'), 'test content 2');
      
      const validation = await backup.validateBackup('backup-test-validation');
      expect(validation.valid).toBe(true);
      expect(validation.totalFiles).toBe(2);
      expect(validation.validFiles).toBe(2);
    });
  });

  describe('UnifiedDependencyAnalyzer', () => {
    let analyzer;

    beforeEach(() => {
      analyzer = new UnifiedDependencyAnalyzer();
    });

    test('should create analyzer instance with correct properties', () => {
      expect(analyzer).toBeInstanceOf(UnifiedDependencyAnalyzer);
      expect(analyzer.dependencies).toBeInstanceOf(Map);
      expect(analyzer.imports).toBeInstanceOf(Map);
      expect(analyzer.services).toBeInstanceOf(Map);
      expect(analyzer.controllers).toBeInstanceOf(Map);
      expect(analyzer.registries).toBeInstanceOf(Map);
      expect(analyzer.usagePatterns).toBeInstanceOf(Map);
    });

    test('should find matching lines correctly', () => {
      const content = `
        import { UnifiedWorkflowService } from './services';
        const handler = new UnifiedWorkflowHandler();
        const registry = new UnifiedHandlerRegistry();
      `;
      
      const matches = ['UnifiedWorkflowService', 'UnifiedWorkflowHandler', 'UnifiedHandlerRegistry'];
      const matchingLines = analyzer.findMatchingLines(content, matches);
      
      expect(matchingLines).toHaveLength(3);
      expect(matchingLines[0].match).toBe('UnifiedWorkflowService');
      expect(matchingLines[1].match).toBe('UnifiedWorkflowHandler');
      expect(matchingLines[2].match).toBe('UnifiedHandlerRegistry');
    });

    test('should extract import statements correctly', () => {
      const content = `
        import { UnifiedWorkflowService } from './services';
        const UnifiedHandler = require('./handlers');
        export { UnifiedWorkflowHandler };
      `;
      
      const importStatements = analyzer.extractImportStatements(content);
      expect(importStatements).toHaveLength(2);
      expect(importStatements[0]).toContain('UnifiedWorkflowService');
      expect(importStatements[1]).toContain('UnifiedHandler');
    });

    test('should extract exports correctly', () => {
      const content = `
        module.exports = { UnifiedWorkflowService };
        export { UnifiedHandlerRegistry };
      `;
      
      const exports = analyzer.extractExports(content);
      expect(exports).toHaveLength(2);
      expect(exports[0]).toContain('UnifiedWorkflowService');
      expect(exports[1]).toContain('UnifiedHandlerRegistry');
    });

    test('should generate report with correct structure', () => {
      // Mock some data
      analyzer.services.set('ServiceRegistry', {
        file: 'test-file.js',
        matches: ['UnifiedWorkflowService'],
        lines: []
      });
      
      analyzer.imports.set('test-import.js', {
        file: 'test-import.js',
        matches: ['UnifiedWorkflowHandler'],
        lines: [],
        importStatements: ['import { UnifiedWorkflowHandler }']
      });
      
      const report = analyzer.generateReport();
      
      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('dependencies');
      expect(report).toHaveProperty('recommendations');
      expect(report).toHaveProperty('riskAssessment');
      
      expect(report.summary.totalDependencies).toBe(2);
      expect(report.summary.filesWithDependencies).toBe(2);
      expect(report.dependencies.services).toHaveProperty('ServiceRegistry');
      expect(report.dependencies.imports).toHaveProperty('test-import.js');
    });
  });

  describe('CategoriesSystemValidator', () => {
    let validator;

    beforeEach(() => {
      validator = new CategoriesSystemValidator();
    });

    test('should create validator instance with correct properties', () => {
      expect(validator).toBeInstanceOf(CategoriesSystemValidator);
      expect(validator.stepRegistry).toBeDefined();
      expect(validator.frameworkRegistry).toBeDefined();
      expect(validator.commandRegistry).toBeDefined();
      expect(validator.handlerRegistry).toBeDefined();
      expect(validator.validationResults).toBeInstanceOf(Map);
    });

    test('should validate categories correctly', () => {
      const result = validator.validateCategories();
      
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('totalCategories');
      expect(result).toHaveProperty('validCategories');
      expect(result).toHaveProperty('categories');
      
      expect(result.totalCategories).toBeGreaterThan(0);
      expect(result.validCategories).toBeGreaterThanOrEqual(0);
      expect(result.categories).toBeInstanceOf(Array);
    });

    test('should generate summary correctly', () => {
      // Mock validation results
      const mockResults = {
        categories: { isValid: true },
        stepRegistry: { isValid: false },
        frameworkRegistry: { isValid: true },
        commandRegistry: { isValid: true },
        handlerRegistry: { isValid: true },
        integration: { isValid: true }
      };
      
      const summary = validator.generateSummary(mockResults);
      
      expect(summary).toHaveProperty('overallValid');
      expect(summary).toHaveProperty('componentResults');
      expect(summary).toHaveProperty('recommendations');
      
      expect(summary.overallValid).toBe(false);
      expect(summary.recommendations).toContain('Fix Step Registry functionality');
    });

    test('should format component details correctly', () => {
      const mockResult = {
        totalCategories: 5,
        validCategories: 4,
        invalidCategories: ['invalid-category']
      };
      
      const details = validator.getComponentDetails('categories', mockResult);
      
      expect(details).toHaveProperty('totalCategories');
      expect(details).toHaveProperty('validCategories');
      expect(details).toHaveProperty('invalidCategories');
      
      expect(details.totalCategories).toBe(5);
      expect(details.validCategories).toBe(4);
      expect(details.invalidCategories).toBe(1);
    });
  });

  describe('UnifiedSystemRollback', () => {
    let rollback;

    beforeEach(() => {
      rollback = new UnifiedSystemRollback();
      // Override backup directory for testing
      rollback.backupDir = testBackupDir;
    });

    test('should create rollback instance with correct properties', () => {
      expect(rollback).toBeInstanceOf(UnifiedSystemRollback);
      expect(rollback.backupDir).toBe(testBackupDir);
      expect(rollback.restoredFiles).toBeInstanceOf(Array);
      expect(rollback.errors).toBeInstanceOf(Array);
    });

    test('should list backups correctly', async () => {
      // Create a mock backup
      const mockBackupDir = path.join(testBackupDir, 'backup-test-rollback');
      const mockMetadata = {
        backupInfo: {
          timestamp: '2024-12-19T10:00:00.000Z',
          totalFiles: 3,
          backedUpFiles: 3,
          errors: 0
        }
      };
      
      await fs.ensureDir(mockBackupDir);
      await fs.writeJson(path.join(mockBackupDir, 'backup-metadata.json'), mockMetadata);
      
      const backups = await rollback.listBackups();
      expect(backups).toHaveLength(1);
      expect(backups[0].name).toBe('backup-test-rollback');
      expect(backups[0].totalFiles).toBe(3);
      expect(backups[0].backedUpFiles).toBe(3);
      expect(backups[0].errors).toBe(0);
    });

    test('should validate backup correctly', async () => {
      // Create a mock backup with files
      const mockBackupDir = path.join(testBackupDir, 'backup-test-rollback-validation');
      const mockMetadata = {
        backupReport: {
          files: [
            {
              path: 'rollback-test-file.js',
              status: 'success'
            }
          ]
        }
      };
      
      await fs.ensureDir(mockBackupDir);
      await fs.writeJson(path.join(mockBackupDir, 'backup-metadata.json'), mockMetadata);
      await fs.writeFile(path.join(mockBackupDir, 'rollback-test-file.js'), 'test content');
      
      const validation = await rollback.validateBackup('backup-test-rollback-validation');
      expect(validation.valid).toBe(true);
      expect(validation.totalFiles).toBe(1);
      expect(validation.validFiles).toBe(1);
    });

    test('should perform dry run correctly', async () => {
      // Create a mock backup
      const mockBackupDir = path.join(testBackupDir, 'backup-test-dry-run');
      const mockMetadata = {
        backupReport: {
          files: [
            {
              path: 'dry-run-test-file.js',
              status: 'success',
              size: 100,
              type: 'file'
            }
          ]
        }
      };
      
      await fs.ensureDir(mockBackupDir);
      await fs.writeJson(path.join(mockBackupDir, 'backup-metadata.json'), mockMetadata);
      await fs.writeFile(path.join(mockBackupDir, 'dry-run-test-file.js'), 'test content');
      
      const dryRunResults = await rollback.dryRun('backup-test-dry-run');
      
      expect(dryRunResults).toHaveProperty('backupName');
      expect(dryRunResults).toHaveProperty('files');
      expect(dryRunResults).toHaveProperty('conflicts');
      expect(dryRunResults).toHaveProperty('summary');
      
      expect(dryRunResults.summary.totalFiles).toBe(1);
      expect(dryRunResults.files).toHaveLength(1);
      expect(dryRunResults.files[0].file).toBe('dry-run-test-file.js');
    });
  });

  describe('Integration Tests', () => {
    test('should work together for complete analysis workflow', async () => {
      // This test simulates the complete analysis workflow
      const backup = new UnifiedSystemBackup();
      const analyzer = new UnifiedDependencyAnalyzer();
      const validator = new CategoriesSystemValidator();
      const rollback = new UnifiedSystemRollback();
      
      // Override directories for testing
      backup.backupDir = testBackupDir;
      rollback.backupDir = testBackupDir;
      
      // Test that all components can be instantiated and have basic functionality
      expect(backup).toBeInstanceOf(UnifiedSystemBackup);
      expect(analyzer).toBeInstanceOf(UnifiedDependencyAnalyzer);
      expect(validator).toBeInstanceOf(CategoriesSystemValidator);
      expect(rollback).toBeInstanceOf(UnifiedSystemRollback);
      
      // Test that backup can list backups (even if empty)
      const backups = await backup.listBackups();
      expect(Array.isArray(backups)).toBe(true);
      
      // Test that validator can validate categories
      const categoryValidation = validator.validateCategories();
      expect(categoryValidation).toHaveProperty('isValid');
      expect(categoryValidation).toHaveProperty('totalCategories');
      
      // Test that analyzer can generate reports
      const report = analyzer.generateReport();
      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('dependencies');
    });
  });
}); 