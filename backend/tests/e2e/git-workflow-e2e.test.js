/**
 * End-to-End tests for Git Workflow System
 * Tests complete user scenarios from task creation to deployment
 */

const GitWorkflowManager = require('@workflows/git/GitWorkflowManager');
const GitWorkflowContext = require('@workflows/git/GitWorkflowContext');
const WorkflowGitService = require('@services/WorkflowGitService');
const WorkflowOrchestrationService = require('@services/WorkflowOrchestrationService');
const TaskService = require('@services/TaskService');
const AutoFinishSystem = require('@services/auto-finish/AutoFinishSystem');

describe('Git Workflow E2E Scenarios', () => {
  let gitWorkflowManager;
  let workflowGitService;
  let workflowOrchestrationService;
  let taskService;
  let autoFinishSystem;
  let mockGitService;
  let mockLogger;
  let mockEventBus;

  beforeEach(() => {
    // Create comprehensive mock dependencies
    mockGitService = {
      getCurrentBranch: jest.fn().mockResolvedValue('main'),
      createBranch: jest.fn().mockResolvedValue({ success: true }),
      checkoutBranch: jest.fn().mockResolvedValue({ success: true }),
      addFiles: jest.fn().mockResolvedValue({ success: true }),
      commitChanges: jest.fn().mockResolvedValue({ success: true }),
      pushChanges: jest.fn().mockResolvedValue({ success: true }),
      mergeBranch: jest.fn().mockResolvedValue({ success: true }),
      getBranches: jest.fn().mockResolvedValue(['main', 'develop', 'pidea-features']),
      deleteBranch: jest.fn().mockResolvedValue({ success: true })
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

    // Initialize all services
    workflowGitService = new WorkflowGitService({
      gitService: mockGitService,
      logger: mockLogger,
      eventBus: mockEventBus
    });

    gitWorkflowManager = new GitWorkflowManager({
      gitService: mockGitService,
      logger: mockLogger,
      eventBus: mockEventBus
    });

    workflowOrchestrationService = new WorkflowOrchestrationService({
      workflowGitService,
      logger: mockLogger,
      eventBus: mockEventBus
    });

    const mockTaskRepository = {
      findById: jest.fn(),
      create: jest.fn().mockResolvedValue(true),
      update: jest.fn().mockResolvedValue(true),
      findByProjectId: jest.fn().mockResolvedValue([])
    };

    taskService = new TaskService(
      mockTaskRepository,
      { generateResponse: jest.fn() },
      { analyzeProject: jest.fn() },
      null,
      null,
      workflowGitService
    );

    autoFinishSystem = new AutoFinishSystem(
      { sendMessage: jest.fn() },
      { clickNewChat: jest.fn() },
      { gitService: mockGitService },
      mockEventBus
    );
  });

  describe('Scenario 1: Feature Development Workflow', () => {
    it('should complete a full feature development cycle', async () => {
      // Step 1: Create a feature task
      const featureTask = {
        id: 'feature-e2e-1',
        title: 'Add user profile management',
        description: 'Implement user profile management system with CRUD operations',
        type: { value: 'feature' },
        metadata: {
          projectPath: '/test/project',
          filePath: '/test/project/src/user/ProfileService.js',
          priority: 'high',
          estimatedHours: 8
        }
      };

      // Step 2: Execute workflow orchestration
      const orchestrationResult = await workflowOrchestrationService.executeWorkflow(featureTask, {
        autoMerge: false,
        createPullRequest: true,
        requireReview: true
      });

      expect(orchestrationResult.success).toBe(true);
      expect(orchestrationResult.branch).toBeDefined();
      expect(orchestrationResult.workflow).toBeDefined();
      expect(orchestrationResult.completion).toBeDefined();

      // Step 3: Verify branch creation
      expect(mockGitService.createBranch).toHaveBeenCalledWith(
        '/test/project',
        expect.stringMatching(/feature\/add-user-profile-management/),
        expect.any(Object)
      );

      // Step 4: Verify pull request creation
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'git.workflow.pull_request.created',
        expect.any(Object)
      );

      // Step 5: Verify workflow completion
      expect(mockGitService.addFiles).toHaveBeenCalled();
      expect(mockGitService.commitChanges).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'git.workflow.completed',
        expect.any(Object)
      );
    });
  });

  describe('Scenario 2: Bug Fix Workflow', () => {
    it('should complete a bug fix workflow with hotfix branch', async () => {
      // Step 1: Create a bug fix task
      const bugTask = {
        id: 'bug-e2e-1',
        title: 'Fix authentication token expiration',
        description: 'Fix the issue where authentication tokens expire prematurely',
        type: { value: 'bug' },
        metadata: {
          projectPath: '/test/project',
          filePath: '/test/project/src/auth/TokenService.js',
          priority: 'critical',
          severity: 'high'
        }
      };

      // Step 2: Execute workflow with hotfix strategy
      const context = new GitWorkflowContext({
        projectPath: bugTask.metadata.projectPath,
        task: bugTask,
        options: {
          autoMerge: true,
          mergeTarget: 'main',
          createPullRequest: false,
          requireReview: false
        },
        taskMode: 'workflow-execution'
      });

      const result = await gitWorkflowManager.executeWorkflow(context);

      expect(result.success).toBe(true);
      expect(result.branchName).toMatch(/hotfix\/fix-authentication-token-expiration/);

      // Step 3: Verify hotfix workflow
      expect(mockGitService.createBranch).toHaveBeenCalledWith(
        '/test/project',
        expect.stringMatching(/hotfix\/fix-authentication-token-expiration/),
        expect.any(Object)
      );

      // Step 4: Verify auto-merge to main
      expect(mockGitService.checkoutBranch).toHaveBeenCalledWith('/test/project', 'main');
      expect(mockGitService.mergeBranch).toHaveBeenCalled();

      // Step 5: Verify cleanup
      expect(mockGitService.deleteBranch).toHaveBeenCalled();
    });
  });

  describe('Scenario 3: Refactoring Workflow', () => {
    it('should complete a refactoring workflow with code review', async () => {
      // Step 1: Create a refactoring task
      const refactorTask = {
        id: 'refactor-e2e-1',
        title: 'Refactor database access layer',
        description: 'Refactor the database access layer to use repository pattern',
        type: { value: 'refactor' },
        metadata: {
          projectPath: '/test/project',
          filePath: '/test/project/src/database/DatabaseService.js',
          refactoringSteps: [
            'Extract repository interfaces',
            'Implement concrete repositories',
            'Update service layer to use repositories',
            'Add unit tests for repositories'
          ]
        }
      };

      // Step 2: Execute refactoring workflow
      const context = new GitWorkflowContext({
        projectPath: refactorTask.metadata.projectPath,
        task: refactorTask,
        options: {
          autoMerge: false,
          createPullRequest: true,
          requireReview: true,
          mergeTarget: 'develop'
        },
        taskMode: 'workflow-execution'
      });

      const result = await gitWorkflowManager.executeWorkflow(context);

      expect(result.success).toBe(true);
      expect(result.branchName).toMatch(/refactor\/refactor-database-access-layer/);

      // Step 3: Verify refactoring workflow
      expect(mockGitService.createBranch).toHaveBeenCalledWith(
        '/test/project',
        expect.stringMatching(/refactor\/refactor-database-access-layer/),
        expect.any(Object)
      );

      // Step 4: Verify pull request creation for review
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'git.workflow.pull_request.created',
        expect.any(Object)
      );

      // Step 5: Verify no auto-merge (requires review)
      expect(mockGitService.mergeBranch).not.toHaveBeenCalled();
    });
  });

  describe('Scenario 4: Auto-Finish Integration', () => {
    it('should complete a task using auto-finish system with git workflow', async () => {
      // Step 1: Create a TODO task
      const todoTask = {
        id: 'todo-e2e-1',
        description: 'Implement user registration form validation',
        metadata: {
          projectPath: '/test/project',
          filePath: '/test/project/src/components/RegistrationForm.js'
        }
      };

      // Step 2: Mock auto-finish system responses
      autoFinishSystem.cursorIDE.sendMessage = jest.fn().mockResolvedValue(
        'User registration form validation implemented successfully. Added client-side validation for email, password strength, and required fields.'
      );

      // Step 3: Process task with auto-finish
      const result = await autoFinishSystem.processTask(todoTask, 'session-e2e-1', {
        autoMerge: true,
        createPullRequest: false
      });

      expect(result.success).toBe(true);
      expect(result.method).toBe('enhanced');

      // Step 4: Verify git workflow integration
      expect(mockGitService.createBranch).toHaveBeenCalled();
      expect(mockGitService.addFiles).toHaveBeenCalled();
      expect(mockGitService.commitChanges).toHaveBeenCalled();

      // Step 5: Verify auto-merge
      expect(mockGitService.mergeBranch).toHaveBeenCalled();
    });
  });

  describe('Scenario 5: Multi-Task Workflow', () => {
    it('should handle multiple related tasks in sequence', async () => {
      // Step 1: Create multiple related tasks
      const tasks = [
        {
          id: 'multi-task-1',
          title: 'Add user authentication',
          type: { value: 'feature' },
          metadata: { projectPath: '/test/project' }
        },
        {
          id: 'multi-task-2',
          title: 'Add user authorization',
          type: { value: 'feature' },
          metadata: { projectPath: '/test/project' }
        },
        {
          id: 'multi-task-3',
          title: 'Add user profile management',
          type: { value: 'feature' },
          metadata: { projectPath: '/test/project' }
        }
      ];

      // Step 2: Execute tasks sequentially
      const results = [];
      for (const task of tasks) {
        const context = new GitWorkflowContext({
          projectPath: task.metadata.projectPath,
          task,
          options: { autoMerge: false, createPullRequest: true },
          taskMode: 'workflow-execution'
        });

        const result = await gitWorkflowManager.executeWorkflow(context);
        results.push(result);
      }

      // Step 3: Verify all tasks completed successfully
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.branchName).toMatch(new RegExp(`feature/${tasks[index].title.toLowerCase().replace(/\s+/g, '-')}`));
      });

      // Step 4: Verify pull requests created for each task
      expect(mockEventBus.publish).toHaveBeenCalledTimes(results.length * 3); // branch.created, executed, pull_request.created
    });
  });

  describe('Scenario 6: Error Recovery Workflow', () => {
    it('should handle and recover from git service failures', async () => {
      // Step 1: Create a task
      const task = {
        id: 'error-recovery-1',
        title: 'Add error handling',
        type: { value: 'feature' },
        metadata: { projectPath: '/test/project' }
      };

      // Step 2: Simulate git service failure
      mockGitService.createBranch.mockRejectedValueOnce(new Error('Git service temporarily unavailable'));

      // Step 3: Execute workflow (should fallback to legacy method)
      const context = new GitWorkflowContext({
        projectPath: task.metadata.projectPath,
        task,
        options: {},
        taskMode: 'workflow-execution'
      });

      const result = await gitWorkflowManager.executeWorkflow(context);

      // Step 4: Verify graceful error handling
      expect(result.success).toBe(false);
      expect(result.error).toContain('Git service temporarily unavailable');
      expect(mockLogger.error).toHaveBeenCalled();

      // Step 5: Verify fallback mechanism works
      const fallbackResult = await workflowGitService.createWorkflowBranch(
        task.metadata.projectPath,
        task,
        {}
      );

      expect(fallbackResult.success).toBe(true); // Should use legacy method
    });
  });

  describe('Scenario 7: Performance and Scalability', () => {
    it('should handle high-volume workflow execution', async () => {
      // Step 1: Create many tasks
      const tasks = Array.from({ length: 10 }, (_, i) => ({
        id: `perf-task-${i + 1}`,
        title: `Performance task ${i + 1}`,
        type: { value: 'feature' },
        metadata: { projectPath: '/test/project' }
      }));

      // Step 2: Execute workflows concurrently
      const startTime = Date.now();
      const contexts = tasks.map(task => new GitWorkflowContext({
        projectPath: task.metadata.projectPath,
        task,
        options: { autoMerge: false },
        taskMode: 'workflow-execution'
      }));

      const results = await Promise.all(
        contexts.map(context => gitWorkflowManager.executeWorkflow(context))
      );
      const endTime = Date.now();

      // Step 3: Verify all completed successfully
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Step 4: Verify performance (should complete within reasonable time)
      expect(endTime - startTime).toBeLessThan(10000); // 10 seconds for 10 tasks

      // Step 5: Verify no resource leaks
      expect(mockGitService.createBranch).toHaveBeenCalledTimes(10);
      expect(mockEventBus.publish).toHaveBeenCalledTimes(30); // 3 events per task
    });
  });

  describe('Scenario 8: Event System and Monitoring', () => {
    it('should provide comprehensive event tracking and monitoring', async () => {
      // Step 1: Create a task
      const task = {
        id: 'monitoring-task-1',
        title: 'Add monitoring capabilities',
        type: { value: 'feature' },
        metadata: { projectPath: '/test/project' }
      };

      // Step 2: Execute workflow
      const context = new GitWorkflowContext({
        projectPath: task.metadata.projectPath,
        task,
        options: { createPullRequest: true },
        taskMode: 'workflow-execution'
      });

      await gitWorkflowManager.executeWorkflow(context);

      // Step 3: Verify all expected events were published
      const publishedEvents = mockEventBus.publish.mock.calls.map(call => call[0]);
      
      expect(publishedEvents).toContain('git.workflow.branch.created');
      expect(publishedEvents).toContain('git.workflow.executed');
      expect(publishedEvents).toContain('git.workflow.pull_request.created');

      // Step 4: Verify event data structure
      const branchCreatedEvent = mockEventBus.publish.mock.calls.find(call => call[0] === 'git.workflow.branch.created');
      expect(branchCreatedEvent[1]).toHaveProperty('projectPath', '/test/project');
      expect(branchCreatedEvent[1]).toHaveProperty('taskId', 'monitoring-task-1');
      expect(branchCreatedEvent[1]).toHaveProperty('branchName');
      expect(branchCreatedEvent[1]).toHaveProperty('timestamp');
    });
  });
}); 