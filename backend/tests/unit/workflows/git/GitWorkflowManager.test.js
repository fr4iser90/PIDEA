/**
 * Unit tests for GitWorkflowManager
 * Tests all major functionality including branch creation, workflow execution, and error handling
 */

const GitWorkflowManager = require('@workflows/git/GitWorkflowManager');
const GitWorkflowContext = require('@workflows/git/GitWorkflowContext');
const GitWorkflowResult = require('@workflows/git/GitWorkflowResult');
const GitWorkflowException = require('@workflows/git/exceptions/GitWorkflowException');

describe('GitWorkflowManager', () => {
  let gitWorkflowManager;
  let mockGitService;
  let mockLogger;
  let mockEventBus;

  beforeEach(() => {
    // Create mock dependencies
    mockGitService = {
      getCurrentBranch: jest.fn(),
      createBranch: jest.fn(),
      checkoutBranch: jest.fn(),
      addFiles: jest.fn(),
      commitChanges: jest.fn(),
      pushChanges: jest.fn(),
      mergeBranch: jest.fn(),
      getBranches: jest.fn()
    };

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    };

    mockEventBus = {
      publish: jest.fn()
    };

    // Create GitWorkflowManager instance
    gitWorkflowManager = new GitWorkflowManager({
      gitService: mockGitService,
      logger: mockLogger,
      eventBus: mockEventBus
    });
  });

  describe('constructor', () => {
    it('should initialize with default dependencies', () => {
      const manager = new GitWorkflowManager();
      expect(manager.gitService).toBeDefined();
      expect(manager.logger).toBeDefined();
      expect(manager.branchStrategy).toBeDefined();
      expect(manager.mergeStrategy).toBeDefined();
      expect(manager.pullRequestManager).toBeDefined();
      expect(manager.autoReviewService).toBeDefined();
      expect(manager.validator).toBeDefined();
      expect(manager.metrics).toBeDefined();
      expect(manager.audit).toBeDefined();
    });

    it('should initialize with provided dependencies', () => {
      expect(gitWorkflowManager.gitService).toBe(mockGitService);
      expect(gitWorkflowManager.logger).toBe(mockLogger);
      expect(gitWorkflowManager.eventBus).toBe(mockEventBus);
    });
  });

  describe('createBranch', () => {
    it('should create a branch successfully', async () => {
      const context = new GitWorkflowContext({
        projectPath: '/test/project',
        task: {
          id: 'task-1',
          title: 'Test Task',
          type: { value: 'feature' }
        },
        options: {},
        taskMode: 'branch-creation'
      });

      mockGitService.getCurrentBranch.mockResolvedValue('main');
      mockGitService.createBranch.mockResolvedValue({ success: true });

      const result = await gitWorkflowManager.createBranch(context);

      expect(result).toBeInstanceOf(GitWorkflowResult);
      expect(result.success).toBe(true);
      expect(result.branchName).toMatch(/feature\/test-task/);
      expect(mockGitService.createBranch).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalledWith('git.workflow.branch.created', expect.any(Object));
    });

    it('should handle git service errors gracefully', async () => {
      const context = new GitWorkflowContext({
        projectPath: '/test/project',
        task: {
          id: 'task-1',
          title: 'Test Task',
          type: { value: 'feature' }
        },
        options: {},
        taskMode: 'branch-creation'
      });

      mockGitService.getCurrentBranch.mockRejectedValue(new Error('Git service error'));

      const result = await gitWorkflowManager.createBranch(context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Git service error');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should validate context before creating branch', async () => {
      const invalidContext = new GitWorkflowContext({
        projectPath: '',
        task: null,
        options: {},
        taskMode: 'branch-creation'
      });

      await expect(gitWorkflowManager.createBranch(invalidContext))
        .rejects.toThrow(GitWorkflowException);
    });
  });

  describe('executeWorkflow', () => {
    it('should execute a complete workflow successfully', async () => {
      const context = new GitWorkflowContext({
        projectPath: '/test/project',
        task: {
          id: 'task-1',
          title: 'Test Task',
          type: { value: 'feature' }
        },
        options: {},
        taskMode: 'workflow-execution'
      });

      mockGitService.getCurrentBranch.mockResolvedValue('main');
      mockGitService.createBranch.mockResolvedValue({ success: true });
      mockGitService.addFiles.mockResolvedValue({ success: true });
      mockGitService.commitChanges.mockResolvedValue({ success: true });

      const result = await gitWorkflowManager.executeWorkflow(context);

      expect(result).toBeInstanceOf(GitWorkflowResult);
      expect(result.success).toBe(true);
      expect(result.taskMode).toBe('workflow-execution');
      expect(mockEventBus.publish).toHaveBeenCalledWith('git.workflow.executed', expect.any(Object));
    });

    it('should handle workflow execution errors', async () => {
      const context = new GitWorkflowContext({
        projectPath: '/test/project',
        task: {
          id: 'task-1',
          title: 'Test Task',
          type: { value: 'feature' }
        },
        options: {},
        taskMode: 'workflow-execution'
      });

      mockGitService.getCurrentBranch.mockRejectedValue(new Error('Workflow execution error'));

      const result = await gitWorkflowManager.executeWorkflow(context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Workflow execution error');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('completeWorkflow', () => {
    it('should complete a workflow successfully', async () => {
      const context = new GitWorkflowContext({
        projectPath: '/test/project',
        task: {
          id: 'task-1',
          title: 'Test Task',
          type: { value: 'feature' }
        },
        options: { autoMerge: true },
        taskMode: 'workflow-completion',
        branchName: 'feature/test-task'
      });

      mockGitService.getCurrentBranch.mockResolvedValue('feature/test-task');
      mockGitService.addFiles.mockResolvedValue({ success: true });
      mockGitService.commitChanges.mockResolvedValue({ success: true });
      mockGitService.checkoutBranch.mockResolvedValue({ success: true });
      mockGitService.mergeBranch.mockResolvedValue({ success: true });

      const result = await gitWorkflowManager.completeWorkflow(context);

      expect(result).toBeInstanceOf(GitWorkflowResult);
      expect(result.success).toBe(true);
      expect(result.status).toBe('completed');
      expect(mockEventBus.publish).toHaveBeenCalledWith('git.workflow.completed', expect.any(Object));
    });

    it('should handle completion without auto-merge', async () => {
      const context = new GitWorkflowContext({
        projectPath: '/test/project',
        task: {
          id: 'task-1',
          title: 'Test Task',
          type: { value: 'feature' }
        },
        options: { autoMerge: false },
        taskMode: 'workflow-completion',
        branchName: 'feature/test-task'
      });

      mockGitService.getCurrentBranch.mockResolvedValue('feature/test-task');
      mockGitService.addFiles.mockResolvedValue({ success: true });
      mockGitService.commitChanges.mockResolvedValue({ success: true });

      const result = await gitWorkflowManager.completeWorkflow(context);

      expect(result.success).toBe(true);
      expect(result.status).toBe('completed');
      expect(mockGitService.mergeBranch).not.toHaveBeenCalled();
    });
  });

  describe('createPullRequest', () => {
    it('should create a pull request successfully', async () => {
      const context = new GitWorkflowContext({
        projectPath: '/test/project',
        task: {
          id: 'task-1',
          title: 'Test Task',
          type: { value: 'feature' }
        },
        options: {},
        taskMode: 'pull-request-creation',
        branchName: 'feature/test-task'
      });

      const result = await gitWorkflowManager.createPullRequest(context);

      expect(result).toBeInstanceOf(GitWorkflowResult);
      expect(result.success).toBe(true);
      expect(result.prUrl).toBeDefined();
      expect(mockEventBus.publish).toHaveBeenCalledWith('git.workflow.pull_request.created', expect.any(Object));
    });

    it('should handle pull request creation errors', async () => {
      const context = new GitWorkflowContext({
        projectPath: '/test/project',
        task: {
          id: 'task-1',
          title: 'Test Task',
          type: { value: 'feature' }
        },
        options: {},
        taskMode: 'pull-request-creation',
        branchName: 'feature/test-task'
      });

      // Mock pull request manager to throw error
      gitWorkflowManager.pullRequestManager.createPullRequest = jest.fn().mockRejectedValue(new Error('PR creation failed'));

      const result = await gitWorkflowManager.createPullRequest(context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('PR creation failed');
    });
  });

  describe('error handling', () => {
    it('should handle invalid context gracefully', async () => {
      await expect(gitWorkflowManager.createBranch(null))
        .rejects.toThrow(GitWorkflowException);
    });

    it('should handle missing project path', async () => {
      const context = new GitWorkflowContext({
        projectPath: '',
        task: { id: 'task-1', title: 'Test' },
        options: {},
        taskMode: 'branch-creation'
      });

      await expect(gitWorkflowManager.createBranch(context))
        .rejects.toThrow(GitWorkflowException);
    });

    it('should handle missing task', async () => {
      const context = new GitWorkflowContext({
        projectPath: '/test/project',
        task: null,
        options: {},
        taskMode: 'branch-creation'
      });

      await expect(gitWorkflowManager.createBranch(context))
        .rejects.toThrow(GitWorkflowException);
    });
  });

  describe('metrics and auditing', () => {
    it('should record metrics for successful operations', async () => {
      const context = new GitWorkflowContext({
        projectPath: '/test/project',
        task: {
          id: 'task-1',
          title: 'Test Task',
          type: { value: 'feature' }
        },
        options: {},
        taskMode: 'branch-creation'
      });

      mockGitService.getCurrentBranch.mockResolvedValue('main');
      mockGitService.createBranch.mockResolvedValue({ success: true });

      await gitWorkflowManager.createBranch(context);

      expect(gitWorkflowManager.metrics.recordOperation).toHaveBeenCalledWith('branch_creation', expect.any(Object));
      expect(gitWorkflowManager.audit.logOperation).toHaveBeenCalledWith('branch_creation', expect.any(Object));
    });

    it('should record metrics for failed operations', async () => {
      const context = new GitWorkflowContext({
        projectPath: '/test/project',
        task: {
          id: 'task-1',
          title: 'Test Task',
          type: { value: 'feature' }
        },
        options: {},
        taskMode: 'branch-creation'
      });

      mockGitService.getCurrentBranch.mockRejectedValue(new Error('Git error'));

      await gitWorkflowManager.createBranch(context);

      expect(gitWorkflowManager.metrics.recordError).toHaveBeenCalledWith('branch_creation', expect.any(Error));
      expect(gitWorkflowManager.audit.logError).toHaveBeenCalledWith('branch_creation', expect.any(Error));
    });
  });
}); 