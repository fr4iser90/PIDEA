/**
 * Version Management Git Workflow Integration Tests
 * Integration tests for version management with git workflow
 */

const UnifiedBranchStrategy = require('@domain/services/version/UnifiedBranchStrategy');
const BranchStrategyRegistry = require('@domain/services/version/BranchStrategyRegistry');
const VersionManagementService = require('@domain/services/version/VersionManagementService');
const SemanticVersioningService = require('@domain/services/version/SemanticVersioningService');

describe('Version Management Git Workflow Integration', () => {
  let registry;
  let versionService;
  let mockGitService;
  let mockFileSystemService;

  beforeEach(() => {
    // Mock git service
    mockGitService = {
      getDiff: jest.fn().mockResolvedValue({
        files: [
          { filename: 'src/feature.js', additions: 50, deletions: 0 },
          { filename: 'tests/feature.test.js', additions: 30, deletions: 0 }
        ]
      }),
      commit: jest.fn().mockResolvedValue({ hash: 'abc123' }),
      createTag: jest.fn().mockResolvedValue({ name: 'v1.1.0' }),
      getCommitHistory: jest.fn().mockResolvedValue([
        { message: 'feat: add new feature', hash: 'abc123' },
        { message: 'fix: resolve bug', hash: 'def456' }
      ])
    };

    // Mock file system service
    mockFileSystemService = {
      readJsonFile: jest.fn().mockResolvedValue({ version: '1.0.0' }),
      writeJsonFile: jest.fn().mockResolvedValue(),
      writeFile: jest.fn().mockResolvedValue()
    };

    // Initialize services
    registry = new BranchStrategyRegistry();
    const unifiedStrategy = new UnifiedBranchStrategy();
    registry.registerStrategy('unified', unifiedStrategy);

    versionService = new VersionManagementService({
      gitService: mockGitService,
      fileSystemService: mockFileSystemService,
      semanticVersioning: new SemanticVersioningService()
    });
  });

  describe('Complete Version Management Workflow', () => {
    it('should handle complete feature development workflow', async () => {
      const task = {
        id: 'feature-123',
        title: 'Add User Authentication',
        description: 'Implement user authentication system with JWT tokens',
        type: { value: 'feature' },
        priority: { value: 'medium' },
        category: 'security'
      };

      const context = {
        projectPath: '/test/project',
        get: (key) => {
          const data = { projectPath: '/test/project' };
          return data[key];
        }
      };

      // Step 1: Generate branch name
      const branchName = registry.generateBranchName(task, context);
      expect(branchName).toMatch(/^task\/feature-123/);
      expect(branchName).toContain('add-user-authentication');

      // Step 2: Determine bump type
      const bumpType = await versionService.determineBumpType(task, context.projectPath, context);
      expect(bumpType).toBe('minor'); // Feature should be minor bump

      // Step 3: Bump version
      const bumpResult = await versionService.bumpVersion(task, context.projectPath, bumpType, context);
      expect(bumpResult.success).toBe(true);
      expect(bumpResult.newVersion).toBe('1.1.0');

      // Step 4: Verify git operations
      expect(mockGitService.commit).toHaveBeenCalled();
      expect(mockGitService.createTag).toHaveBeenCalled();
    });

    it('should handle hotfix workflow with patch bump', async () => {
      const hotfixTask = {
        id: 'hotfix-456',
        title: 'Fix Critical Security Vulnerability',
        description: 'Fix critical security vulnerability in authentication system',
        type: { value: 'hotfix' },
        priority: { value: 'critical' },
        category: 'security'
      };

      const context = {
        projectPath: '/test/project',
        get: (key) => {
          const data = { projectPath: '/test/project' };
          return data[key];
        }
      };

      // Generate branch name
      const branchName = registry.generateBranchName(hotfixTask, context);
      expect(branchName).toMatch(/^task\/hotfix-456/);
      expect(branchName).toContain('fix-critical-security');

      // Determine bump type
      const bumpType = await versionService.determineBumpType(hotfixTask, context.projectPath, context);
      expect(bumpType).toBe('patch'); // Hotfix should be patch bump

      // Bump version
      const bumpResult = await versionService.bumpVersion(hotfixTask, context.projectPath, bumpType, context);
      expect(bumpResult.success).toBe(true);
      expect(bumpResult.newVersion).toBe('1.0.1');
    });

    it('should handle breaking change workflow with major bump', async () => {
      const breakingTask = {
        id: 'breaking-789',
        title: 'Refactor API Interface',
        description: 'BREAKING CHANGE: Refactor API interface to use new authentication system',
        type: { value: 'refactor' },
        priority: { value: 'high' },
        category: 'backend'
      };

      const context = {
        projectPath: '/test/project',
        get: (key) => {
          const data = { projectPath: '/test/project' };
          return data[key];
        }
      };

      // Generate branch name
      const branchName = registry.generateBranchName(breakingTask, context);
      expect(branchName).toMatch(/^task\/breaking-789/);

      // Determine bump type
      const bumpType = await versionService.determineBumpType(breakingTask, context.projectPath, context);
      expect(bumpType).toBe('major'); // Breaking change should be major bump

      // Bump version
      const bumpResult = await versionService.bumpVersion(breakingTask, context.projectPath, bumpType, context);
      expect(bumpResult.success).toBe(true);
      expect(bumpResult.newVersion).toBe('2.0.0');
    });
  });

  describe('Git Integration', () => {
    it('should analyze git changes correctly', async () => {
      const changes = await versionService.analyzeGitChanges('/test/project', {
        sinceCommit: 'HEAD~1'
      });

      expect(changes).toBeDefined();
      expect(changes.newFeatures).toBeGreaterThan(0);
      expect(mockGitService.getDiff).toHaveBeenCalledWith('/test/project', 'HEAD~1');
    });

    it('should create git tags with proper metadata', async () => {
      const task = {
        id: 'test-task',
        title: 'Test Feature',
        description: 'Test feature description'
      };

      const tagResult = await versionService.createGitTag('/test/project', '1.1.0', task);

      expect(tagResult).toBeDefined();
      expect(mockGitService.createTag).toHaveBeenCalledWith('/test/project', {
        name: 'v1.1.0',
        message: expect.stringContaining('Release 1.1.0'),
        annotated: true
      });
    });
  });

  describe('File System Integration', () => {
    it('should update package files correctly', async () => {
      const updatedFiles = await versionService.updatePackageFiles('/test/project', '1.1.0');

      expect(updatedFiles).toContain('/test/project/package.json');
      expect(mockFileSystemService.writeJsonFile).toHaveBeenCalledWith(
        '/test/project/package.json',
        { version: '1.1.0' }
      );
    });

    it('should handle multiple package files', async () => {
      mockFileSystemService.readJsonFile
        .mockResolvedValueOnce({ version: '1.0.0' }) // root package.json
        .mockResolvedValueOnce({ version: '1.0.0' }) // backend/package.json
        .mockResolvedValueOnce({ version: '1.0.0' }); // frontend/package.json

      const updatedFiles = await versionService.updatePackageFiles('/test/project', '1.1.0');

      expect(updatedFiles).toHaveLength(3);
      expect(updatedFiles).toContain('/test/project/package.json');
      expect(updatedFiles).toContain('/test/project/backend/package.json');
      expect(updatedFiles).toContain('/test/project/frontend/package.json');
    });
  });

  describe('Error Handling', () => {
    it('should handle git service errors gracefully', async () => {
      mockGitService.getDiff.mockRejectedValue(new Error('Git error'));

      const changes = await versionService.analyzeGitChanges('/test/project');

      expect(changes).toEqual({ bugFixes: 1 }); // fallback
    });

    it('should handle file system errors gracefully', async () => {
      mockFileSystemService.readJsonFile.mockRejectedValue(new Error('File not found'));

      const version = await versionService.getCurrentVersion('/test/project');

      expect(version).toBe('0.0.0'); // fallback
    });

    it('should handle version bump errors gracefully', async () => {
      mockFileSystemService.readJsonFile.mockRejectedValue(new Error('File error'));

      const task = { id: 'test-task' };
      const result = await versionService.bumpVersion(task, '/test/project', 'minor');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Configuration Integration', () => {
    it('should use configuration settings correctly', () => {
      const config = versionService.getConfiguration();

      expect(config.packageFiles).toContain('package.json');
      expect(config.createGitTags).toBe(true);
      expect(config.autoCommit).toBe(true);
    });

    it('should update configuration correctly', () => {
      const newConfig = {
        createGitTags: false,
        autoCommit: false
      };

      versionService.updateConfiguration(newConfig);
      const updatedConfig = versionService.getConfiguration();

      expect(updatedConfig.createGitTags).toBe(false);
      expect(updatedConfig.autoCommit).toBe(false);
    });
  });
});
