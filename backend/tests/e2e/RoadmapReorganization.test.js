/**
 * Roadmap Reorganization End-to-End Tests
 * Tests for the complete roadmap reorganization workflow
 * Created: 2025-09-19T19:22:57.000Z
 */

const RoadmapStatusMigration = require('../../../scripts/roadmap-status-migration');
const RoadmapStatusManager = require('../../../scripts/roadmap-status-manager');
const TaskStatusUpdateStep = require('../../domain/steps/status/TaskStatusUpdateStep');
const TaskFileOrganizationStep = require('../../domain/steps/organization/TaskFileOrganizationStep');
const fs = require('fs').promises;
const path = require('path');

// Mock dependencies
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
    access: jest.fn(),
    rmdir: jest.fn()
  }
}));

jest.mock('@logging/Logger', () => {
  return jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }));
});

describe('Roadmap Reorganization E2E', () => {
  let migration;
  let statusManager;
  let statusUpdateStep;
  let fileOrganizationStep;

  beforeEach(() => {
    migration = new RoadmapStatusMigration();
    statusManager = new RoadmapStatusManager();
    statusUpdateStep = new TaskStatusUpdateStep();
    fileOrganizationStep = new TaskFileOrganizationStep();
    
    // Reset mocks
    jest.clearAllMocks();
  });

  describe('Complete Migration Workflow', () => {
    it('should complete full roadmap reorganization workflow', async () => {
      // Mock file discovery
      fs.readdir.mockResolvedValueOnce([
        { name: 'ai', isDirectory: () => true },
        { name: 'backend', isDirectory: () => true }
      ]);
      
      fs.readdir.mockResolvedValueOnce([
        { name: 'task1.md', isDirectory: () => false },
        { name: 'task2.md', isDirectory: () => false }
      ]);
      
      fs.readdir.mockResolvedValueOnce([
        { name: 'task3.md', isDirectory: () => false }
      ]);

      // Mock file content
      fs.readFile.mockResolvedValue(`
# Task Title

- **Status**: completed
- **Priority**: high
- **Created**: 2024-01-01
- **Completed**: 2024-03-15

Task description here.
      `);

      // Mock file operations
      fs.mkdir.mockResolvedValue();
      fs.copyFile.mockResolvedValue();
      fs.rename.mockResolvedValue();
      fs.unlink.mockResolvedValue();
      fs.writeFile.mockResolvedValue();

      // Execute migration
      await migration.migrateAllTasks();

      // Verify migration completed
      expect(migration.totalFiles).toBe(3);
      expect(migration.processedFiles).toBe(3);
      expect(migration.failedFiles).toBe(0);
    });

    it('should handle mixed success and failure scenarios', async () => {
      // Mock file discovery
      fs.readdir.mockResolvedValueOnce([
        { name: 'task1.md', isDirectory: () => false },
        { name: 'task2.md', isDirectory: () => false }
      ]);

      // Mock file content - one successful, one with error
      fs.readFile
        .mockResolvedValueOnce(`
# Task 1

- **Status**: completed
- **Priority**: high
- **Created**: 2024-01-01
- **Completed**: 2024-03-15
        `)
        .mockRejectedValueOnce(new Error('File read error'));

      // Mock file operations
      fs.mkdir.mockResolvedValue();
      fs.copyFile.mockResolvedValue();
      fs.rename.mockResolvedValue();
      fs.unlink.mockResolvedValue();
      fs.writeFile.mockResolvedValue();

      // Execute migration
      await migration.migrateAllTasks();

      // Verify mixed results
      expect(migration.totalFiles).toBe(2);
      expect(migration.processedFiles).toBe(1);
      expect(migration.failedFiles).toBe(1);
    });
  });

  describe('Status Management Workflow', () => {
    it('should handle complete status transition workflow', async () => {
      const taskId = 'test-task-123';
      const context = {};
      const options = {
        taskId,
        newStatus: 'completed',
        taskMetadata: {
          priority: 'high',
          category: 'backend',
          completedAt: '2024-03-15'
        },
        autoMoveFiles: true,
        updateDatabase: true
      };

      // Mock status update step dependencies
      statusUpdateStep.getCurrentTaskInfo = jest.fn().mockResolvedValue({
        id: taskId,
        status: 'in_progress',
        priority: 'high',
        category: 'backend',
        filePath: 'docs/09_roadmap/in-progress/backend/test-task-123',
        completedAt: null
      });

      statusUpdateStep.updateTaskStatus = jest.fn().mockResolvedValue();
      statusUpdateStep.moveTaskFiles = jest.fn().mockResolvedValue();
      statusUpdateStep.updateFileReferences = jest.fn().mockResolvedValue();

      // Mock file organization step dependencies
      fileOrganizationStep.createDirectoryStructure = jest.fn().mockResolvedValue();
      fileOrganizationStep.moveTaskFiles = jest.fn().mockResolvedValue(['file1.md', 'file2.md']);
      fileOrganizationStep.updateFileReferences = jest.fn().mockResolvedValue(['ref1', 'ref2']);

      // Execute status update
      const statusResult = await statusUpdateStep.execute(context, options);

      // Execute file organization
      const orgResult = await fileOrganizationStep.execute(context, {
        taskId,
        taskMetadata: options.taskMetadata,
        createDirectories: true,
        moveFiles: true,
        updateReferences: true
      });

      // Verify results
      expect(statusResult.success).toBe(true);
      expect(statusResult.newStatus).toBe('completed');
      expect(statusResult.filesMoved).toBe(true);

      expect(orgResult.success).toBe(true);
      expect(orgResult.filesMoved).toBe(2);
      expect(orgResult.referencesUpdated).toBe(2);
    });

    it('should handle status transition validation', async () => {
      const context = {};
      const options = {
        taskId: 'test-task-123',
        newStatus: 'pending',
        taskMetadata: {}
      };

      // Mock invalid transition (completed -> pending)
      statusUpdateStep.getCurrentTaskInfo = jest.fn().mockResolvedValue({
        id: 'test-task-123',
        status: 'completed',
        priority: 'medium',
        category: 'frontend',
        filePath: 'docs/09_roadmap/completed/2024-q1/frontend/test-task-123',
        completedAt: '2024-01-15'
      });

      await expect(statusUpdateStep.execute(context, options)).rejects.toThrow(
        'Invalid status transition from completed to pending'
      );
    });
  });

  describe('File Organization Workflow', () => {
    it('should organize files based on task status', async () => {
      const context = {};
      const options = {
        taskId: 'test-task-456',
        taskMetadata: {
          status: 'completed',
          priority: 'medium',
          category: 'frontend',
          completedAt: '2024-06-15'
        },
        createDirectories: true,
        moveFiles: true,
        updateReferences: true
      };

      // Mock file system operations
      fs.mkdir.mockResolvedValue();
      fs.readdir.mockResolvedValue(['task.md', 'index.md']);
      fs.copyFile.mockResolvedValue();
      fs.rename.mockResolvedValue();
      fs.unlink.mockResolvedValue();

      const result = await fileOrganizationStep.execute(context, options);

      expect(result.success).toBe(true);
      expect(result.targetPath).toContain('docs/09_roadmap/completed/2024-q2/frontend/test-task-456');
      expect(result.directoriesCreated).toBe(true);
      expect(result.filesMoved).toBe(2);
      expect(result.referencesUpdated).toBe(0); // Mock returns empty array
    });

    it('should handle archive workflow', async () => {
      const options = {
        olderThanMonths: 6,
        archivePath: 'docs/09_roadmap/archive'
      };

      const result = await fileOrganizationStep.archiveOldTasks(options);

      expect(result.success).toBe(true);
      expect(result.archivePath).toBe('docs/09_roadmap/archive');
      expect(result.cutoffDate).toBeDefined();
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle file system errors gracefully', async () => {
      // Mock file discovery with error
      fs.readdir.mockRejectedValue(new Error('Permission denied'));

      await expect(migration.migrateAllTasks()).rejects.toThrow('Permission denied');
    });

    it('should handle database errors gracefully', async () => {
      const context = {};
      const options = {
        taskId: 'test-task-123',
        newStatus: 'completed',
        taskMetadata: {}
      };

      statusUpdateStep.getCurrentTaskInfo = jest.fn().mockResolvedValue({
        id: 'test-task-123',
        status: 'in_progress',
        priority: 'medium',
        category: 'backend',
        filePath: 'docs/09_roadmap/in-progress/backend/test-task-123',
        completedAt: null
      });

      statusUpdateStep.updateTaskStatus = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      await expect(statusUpdateStep.execute(context, options)).rejects.toThrow('Database connection failed');
    });

    it('should handle partial failures in batch operations', async () => {
      // Mock file discovery
      fs.readdir.mockResolvedValueOnce([
        { name: 'task1.md', isDirectory: () => false },
        { name: 'task2.md', isDirectory: () => false },
        { name: 'task3.md', isDirectory: () => false }
      ]);

      // Mock file content - mixed success/failure
      fs.readFile
        .mockResolvedValueOnce('Valid content 1')
        .mockRejectedValueOnce(new Error('Read error'))
        .mockResolvedValueOnce('Valid content 3');

      // Mock file operations
      fs.mkdir.mockResolvedValue();
      fs.copyFile.mockResolvedValue();
      fs.rename.mockResolvedValue();
      fs.unlink.mockResolvedValue();
      fs.writeFile.mockResolvedValue();

      await migration.migrateAllTasks();

      expect(migration.totalFiles).toBe(3);
      expect(migration.processedFiles).toBe(2);
      expect(migration.failedFiles).toBe(1);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large number of files efficiently', async () => {
      const largeFileList = Array.from({ length: 100 }, (_, i) => ({
        name: `task${i}.md`,
        isDirectory: () => false
      }));

      fs.readdir.mockResolvedValueOnce(largeFileList);
      fs.readFile.mockResolvedValue('Valid content');
      fs.mkdir.mockResolvedValue();
      fs.copyFile.mockResolvedValue();
      fs.rename.mockResolvedValue();
      fs.unlink.mockResolvedValue();
      fs.writeFile.mockResolvedValue();

      const startTime = Date.now();
      await migration.migrateAllTasks();
      const endTime = Date.now();

      expect(migration.totalFiles).toBe(100);
      expect(migration.processedFiles).toBe(100);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle concurrent status updates', async () => {
      const tasks = [
        { id: 'task1', status: 'completed' },
        { id: 'task2', status: 'in_progress' },
        { id: 'task3', status: 'blocked' }
      ];

      const promises = tasks.map(task => {
        const context = {};
        const options = {
          taskId: task.id,
          newStatus: task.status,
          taskMetadata: { priority: 'medium', category: 'test' }
        };

        statusUpdateStep.getCurrentTaskInfo = jest.fn().mockResolvedValue({
          id: task.id,
          status: 'pending',
          priority: 'medium',
          category: 'test',
          filePath: `docs/09_roadmap/pending/medium/test/${task.id}`,
          completedAt: null
        });

        statusUpdateStep.updateTaskStatus = jest.fn().mockResolvedValue();
        statusUpdateStep.moveTaskFiles = jest.fn().mockResolvedValue();
        statusUpdateStep.updateFileReferences = jest.fn().mockResolvedValue();

        return statusUpdateStep.execute(context, options);
      });

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });
});
