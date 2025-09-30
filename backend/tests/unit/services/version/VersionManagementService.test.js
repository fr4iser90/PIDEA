/**
 * VersionManagementService Tests
 * Unit tests for the version management service
 */

const VersionManagementService = require('@domain/services/version/VersionManagementService');
const SemanticVersioningService = require('@domain/services/version/SemanticVersioningService');

describe('VersionManagementService', () => {
  let service;
  let mockDependencies;

  beforeEach(() => {
    mockDependencies = {
      semanticVersioning: new SemanticVersioningService(),
      gitService: {
        getDiff: jest.fn(),
        commit: jest.fn(),
        createTag: jest.fn()
      },
      fileSystemService: {
        readJsonFile: jest.fn(),
        writeJsonFile: jest.fn()
      },
      versionRepository: {
        create: jest.fn(),
        find: jest.fn()
      }
    };

    service = new VersionManagementService(mockDependencies);
  });

  describe('getCurrentVersion', () => {
    it('should get current version from package.json', async () => {
      mockDependencies.fileSystemService.readJsonFile.mockResolvedValue({
        version: '1.2.3'
      });

      const version = await service.getCurrentVersion('/test/project');

      expect(version).toBe('1.2.3');
      expect(mockDependencies.fileSystemService.readJsonFile).toHaveBeenCalledWith('/test/project/package.json');
    });

    it('should return 0.0.0 when no version found', async () => {
      mockDependencies.fileSystemService.readJsonFile.mockRejectedValue(new Error('File not found'));

      const version = await service.getCurrentVersion('/test/project');

      expect(version).toBe('0.0.0');
    });
  });

  describe('bumpVersion', () => {
    const mockTask = {
      id: 'test-task-123',
      type: { value: 'feature' },
      priority: { value: 'medium' }
    };

    beforeEach(() => {
      mockDependencies.fileSystemService.readJsonFile.mockResolvedValue({
        version: '1.2.3'
      });
      mockDependencies.fileSystemService.writeJsonFile.mockResolvedValue();
      mockDependencies.versionRepository.create.mockResolvedValue({
        id: 'version-record-123'
      });
    });

    it('should bump version successfully', async () => {
      const result = await service.bumpVersion(mockTask, '/test/project', 'minor');

      expect(result.success).toBe(true);
      expect(result.newVersion).toBe('1.3.0');
      expect(result.bumpType).toBe('minor');
      expect(mockDependencies.fileSystemService.writeJsonFile).toHaveBeenCalled();
      expect(mockDependencies.versionRepository.create).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockDependencies.fileSystemService.readJsonFile.mockRejectedValue(new Error('File error'));

      const result = await service.bumpVersion(mockTask, '/test/project', 'minor');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('determineBumpType', () => {
    const mockTask = {
      id: 'test-task-123',
      type: { value: 'feature' },
      priority: { value: 'medium' }
    };

    it('should determine major bump for breaking changes', async () => {
      const taskWithBreaking = {
        ...mockTask,
        description: 'This is a breaking change that will affect existing functionality'
      };

      const bumpType = await service.determineBumpType(taskWithBreaking, '/test/project');

      expect(bumpType).toBe('major');
    });

    it('should determine minor bump for features', async () => {
      const bumpType = await service.determineBumpType(mockTask, '/test/project');

      expect(bumpType).toBe('minor');
    });

    it('should determine patch bump for bug fixes', async () => {
      const bugTask = {
        ...mockTask,
        type: { value: 'bug' }
      };

      const bumpType = await service.determineBumpType(bugTask, '/test/project');

      expect(bumpType).toBe('patch');
    });
  });

  describe('detectBreakingChanges', () => {
    it('should detect breaking changes in task description', () => {
      const task = {
        title: 'Update API',
        description: 'This is a breaking change that will affect existing functionality'
      };

      const hasBreaking = service.detectBreakingChanges(task);

      expect(hasBreaking).toBe(true);
    });

    it('should not detect breaking changes in normal tasks', () => {
      const task = {
        title: 'Add new feature',
        description: 'This adds a new feature without breaking existing functionality'
      };

      const hasBreaking = service.detectBreakingChanges(task);

      expect(hasBreaking).toBe(false);
    });
  });

  describe('validateVersion', () => {
    it('should validate correct versions', () => {
      expect(service.validateVersion('1.2.3')).toBe(true);
      expect(service.validateVersion('2.0.0-beta.1')).toBe(true);
    });

    it('should reject invalid versions', () => {
      expect(service.validateVersion('invalid')).toBe(false);
      expect(service.validateVersion('1.2')).toBe(false);
    });
  });

  describe('getConfiguration', () => {
    it('should return current configuration', () => {
      const config = service.getConfiguration();

      expect(config).toBeDefined();
      expect(config.packageFiles).toBeDefined();
      expect(config.createGitTags).toBeDefined();
    });
  });
});
