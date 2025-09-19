/**
 * Roadmap Status Migration Unit Tests
 * Tests for the roadmap status migration functionality
 * Created: 2025-09-19T19:22:57.000Z
 */

const RoadmapStatusMigration = require('../../../scripts/roadmap-status-migration');
const fs = require('fs').promises;
const path = require('path');

// Mock dependencies
jest.mock('../../../backend/infrastructure/logging/Logger');
jest.mock('fs', () => ({
  promises: {
    readdir: jest.fn(),
    stat: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn(),
    rename: jest.fn(),
    copyFile: jest.fn(),
    unlink: jest.fn(),
    access: jest.fn()
  }
}));

describe('RoadmapStatusMigration', () => {
  let migration;
  let mockLogger;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn()
    };
    
    migration = new RoadmapStatusMigration();
    migration.logger = mockLogger;
    
    // Reset mocks
    jest.clearAllMocks();
  });

  describe('discoverTaskFiles', () => {
    it('should discover all markdown files in tasks directory', async () => {
      // Mock file system responses
      fs.readdir.mockResolvedValueOnce([
        { name: 'ai', isDirectory: () => true },
        { name: 'backend', isDirectory: () => true },
        { name: 'test.md', isDirectory: () => false }
      ]);
      
      fs.readdir.mockResolvedValueOnce([
        { name: 'task1.md', isDirectory: () => false },
        { name: 'task2.md', isDirectory: () => false }
      ]);
      
      fs.readdir.mockResolvedValueOnce([
        { name: 'task3.md', isDirectory: () => false }
      ]);

      const result = await migration.discoverTaskFiles();
      
      expect(result).toHaveLength(3);
      expect(result[0]).toContain('task1.md');
      expect(result[1]).toContain('task2.md');
      expect(result[2]).toContain('task3.md');
    });

    it('should handle empty directory', async () => {
      fs.readdir.mockResolvedValueOnce([]);
      
      const result = await migration.discoverTaskFiles();
      
      expect(result).toHaveLength(0);
    });

    it('should handle file system errors', async () => {
      fs.readdir.mockRejectedValueOnce(new Error('Permission denied'));
      
      await expect(migration.discoverTaskFiles()).rejects.toThrow('Permission denied');
    });
  });

  describe('parseTaskMetadata', () => {
    it('should parse task metadata from markdown content', async () => {
      const mockContent = `
# Task Title

- **Status**: completed
- **Priority**: high
- **Created**: 2024-01-01
- **Completed**: 2024-01-15

Task description here.
      `;
      
      fs.readFile.mockResolvedValueOnce(mockContent);
      
      const result = await migration.parseTaskMetadata('/path/to/task.md');
      
      expect(result.status).toBe('completed');
      expect(result.priority).toBe('high');
      expect(result.category).toBe('uncategorized');
      expect(result.fileName).toBe('task.md');
    });

    it('should extract category from file path', async () => {
      fs.readFile.mockResolvedValueOnce('Content');
      
      const result = await migration.parseTaskMetadata('/path/to/ai/task.md');
      
      expect(result.category).toBe('ai');
    });

    it('should handle missing metadata gracefully', async () => {
      fs.readFile.mockResolvedValueOnce('Simple content without metadata');
      
      const result = await migration.parseTaskMetadata('/path/to/task.md');
      
      expect(result.status).toBe('pending');
      expect(result.priority).toBe('medium');
    });
  });

  describe('determineTargetPath', () => {
    it('should determine correct path for completed tasks', () => {
      const taskMetadata = {
        status: 'completed',
        category: 'backend',
        completedAt: '2024-03-15'
      };
      
      const result = migration.determineTargetPath(taskMetadata);
      
      expect(result).toContain('docs/09_roadmap/completed/2024-q1/backend');
    });

    it('should determine correct path for in-progress tasks', () => {
      const taskMetadata = {
        status: 'in_progress',
        category: 'frontend'
      };
      
      const result = migration.determineTargetPath(taskMetadata);
      
      expect(result).toBe('docs/09_roadmap/in-progress/frontend/');
    });

    it('should determine correct path for pending tasks', () => {
      const taskMetadata = {
        status: 'pending',
        priority: 'high',
        category: 'security'
      };
      
      const result = migration.determineTargetPath(taskMetadata);
      
      expect(result).toBe('docs/09_roadmap/pending/high/security/');
    });

    it('should handle blocked tasks', () => {
      const taskMetadata = {
        status: 'blocked',
        category: 'database'
      };
      
      const result = migration.determineTargetPath(taskMetadata);
      
      expect(result).toBe('docs/09_roadmap/blocked/database/');
    });

    it('should handle cancelled tasks', () => {
      const taskMetadata = {
        status: 'cancelled',
        category: 'testing'
      };
      
      const result = migration.determineTargetPath(taskMetadata);
      
      expect(result).toBe('docs/09_roadmap/cancelled/testing/');
    });
  });

  describe('getCompletionQuarter', () => {
    it('should return correct quarter for Q1', () => {
      const result = migration.getCompletionQuarter('2024-02-15');
      expect(result).toBe('2024-q1');
    });

    it('should return correct quarter for Q2', () => {
      const result = migration.getCompletionQuarter('2024-05-15');
      expect(result).toBe('2024-q2');
    });

    it('should return correct quarter for Q3', () => {
      const result = migration.getCompletionQuarter('2024-08-15');
      expect(result).toBe('2024-q3');
    });

    it('should return correct quarter for Q4', () => {
      const result = migration.getCompletionQuarter('2024-11-15');
      expect(result).toBe('2024-q4');
    });

    it('should use current date when no completion date provided', () => {
      const result = migration.getCompletionQuarter(null);
      expect(result).toMatch(/^\d{4}-q[1-4]$/);
    });
  });

  describe('migrateTaskFile', () => {
    it('should successfully migrate a task file', async () => {
      const mockMetadata = {
        filePath: '/source/path/task.md',
        fileName: 'task.md',
        status: 'completed',
        priority: 'high',
        category: 'backend',
        completedAt: '2024-01-15'
      };
      
      migration.parseTaskMetadata = jest.fn().mockResolvedValue(mockMetadata);
      migration.createTargetDirectory = jest.fn().mockResolvedValue();
      migration.moveTaskFile = jest.fn().mockResolvedValue();
      migration.updateDatabaseRecord = jest.fn().mockResolvedValue();
      
      await migration.migrateTaskFile('/source/path/task.md');
      
      expect(migration.parseTaskMetadata).toHaveBeenCalledWith('/source/path/task.md');
      expect(migration.createTargetDirectory).toHaveBeenCalled();
      expect(migration.moveTaskFile).toHaveBeenCalled();
      expect(migration.updateDatabaseRecord).toHaveBeenCalled();
    });

    it('should handle migration errors gracefully', async () => {
      migration.parseTaskMetadata = jest.fn().mockRejectedValue(new Error('Parse error'));
      
      await migration.migrateTaskFile('/source/path/task.md');
      
      expect(migration.failedFiles).toBe(1);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('generateMigrationReport', () => {
    it('should generate migration report with correct statistics', async () => {
      migration.totalFiles = 10;
      migration.processedFiles = 8;
      migration.failedFiles = 2;
      
      fs.writeFile.mockResolvedValueOnce();
      
      await migration.generateMigrationReport();
      
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('roadmap-migration-report.json'),
        expect.stringContaining('"totalFiles":10')
      );
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('roadmap-migration-report.json'),
        expect.stringContaining('"successRate":"80.00"')
      );
    });
  });

  describe('migrateAllTasks', () => {
    it('should complete full migration process', async () => {
      migration.discoverTaskFiles = jest.fn().mockResolvedValue(['file1.md', 'file2.md']);
      migration.migrateTaskFile = jest.fn().mockResolvedValue();
      migration.generateMigrationReport = jest.fn().mockResolvedValue();
      
      await migration.migrateAllTasks();
      
      expect(migration.discoverTaskFiles).toHaveBeenCalled();
      expect(migration.migrateTaskFile).toHaveBeenCalledTimes(2);
      expect(migration.generateMigrationReport).toHaveBeenCalled();
      expect(migration.totalFiles).toBe(2);
    });

    it('should handle migration errors and continue', async () => {
      migration.discoverTaskFiles = jest.fn().mockResolvedValue(['file1.md', 'file2.md']);
      migration.migrateTaskFile = jest.fn()
        .mockResolvedValueOnce()
        .mockRejectedValueOnce(new Error('Migration error'));
      migration.generateMigrationReport = jest.fn().mockResolvedValue();
      
      await migration.migrateAllTasks();
      
      expect(migration.processedFiles).toBe(1);
      expect(migration.failedFiles).toBe(1);
    });
  });
});
