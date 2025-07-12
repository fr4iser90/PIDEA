/**
 * Integration tests for Git Workflow System
 * Tests the complete workflow from branch creation to completion
 */

const GitWorkflowManager = require('@workflows/git/GitWorkflowManager');
const GitWorkflowContext = require('@workflows/git/GitWorkflowContext');
const WorkflowGitService = require('@services/WorkflowGitService');
const WorkflowOrchestrationService = require('@services/WorkflowOrchestrationService');
const TaskService = require('@services/TaskService');
const AutoFinishSystem = require('@services/auto-finish/AutoFinishSystem');

describe('Git Workflow Integration', () => {
  let gitWorkflowManager;
  let workflowGitService;
  let workflowOrchestrationService;
  let taskService;
  let autoFinishSystem;
  let mockGitService;
  let mockLogger;
  let mockEventBus;

  beforeEach(() => {
    // Create mock dependencies
    mockGitService = {
      getCurrentBranch: jest.fn().mockResolvedValue('main'),
      createBranch: jest.fn().mockResolvedValue({ success: true }),
      checkoutBranch: jest.fn().mockResolvedValue({ success: true }),
      addFiles: jest.fn().mockResolvedValue({ success: true }),
      commitChanges: jest.fn().mockResolvedValue({ success: true }),
      pushChanges: jest.fn().mockResolvedValue({ success: true }),
      mergeBranch: jest.fn().mockResolvedValue({ success: true }),
      getBranches: jest.fn().mockResolvedValue(['main', 'develop'])
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

    // Initialize services
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

    taskService = new TaskService(
      { findById: jest.fn(), create: jest.fn(), update: jest.fn() },
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

  describe('Complete Workflow Integration', () => {
    it('should execute a complete feature workflow', async () => {
      const task = {
        id: 'feature-task-1',
        title: 'Add user authentication',
        description: 'Implement user authentication system',
        type: { value: 'feature' },
        metadata: {
          projectPath: '/test/project',
          filePath: '/test/project/src/auth/AuthService.js'
        }
      };

      const context = new GitWorkflowContext({
        projectPath: task.metadata.projectPath,
        task,
        options: { autoMerge: true },
        workflowType: 'workflow-execution'
      });

      // Execute complete workflow
      const result = await gitWorkflowManager.executeWorkflow(context);

      expect(result.success).toBe(true);
      expect(result.workflowType).toBe('workflow-execution');
      expect(result.branchName).toMatch(/feature\/add-user-authentication/);
      expect(mockGitService.createBranch).toHaveBeenCalled();
      expect(mockGitService.addFiles).toHaveBeenCalled();
      expect(mockGitService.commitChanges).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalledWith('git.workflow.executed', expect.any(Object));
    });

    it('should handle workflow with pull request creation', async () => {
      const task = {
        id: 'feature-task-2',
        title: 'Add payment processing',
        description: 'Implement payment processing system',
        type: { value: 'feature' },
        metadata: {
          projectPath: '/test/project',
          filePath: '/test/project/src/payment/PaymentService.js'
        }
      };

      const context = new GitWorkflowContext({
        projectPath: task.metadata.projectPath,
        task,
        options: { createPullRequest: true, autoMerge: false },
        workflowType: 'workflow-execution'
      });

      // Execute workflow
      const workflowResult = await gitWorkflowManager.executeWorkflow(context);

      // Create pull request
      const prContext = new GitWorkflowContext({
        projectPath: task.metadata.projectPath,
        task,
        options: {},
        workflowType: 'pull-request-creation',
        branchName: workflowResult.branchName
      });

      const prResult = await gitWorkflowManager.createPullRequest(prContext);

      expect(workflowResult.success).toBe(true);
      expect(prResult.success).toBe(true);
      expect(prResult.prUrl).toBeDefined();
      expect(mockEventBus.publish).toHaveBeenCalledWith('git.workflow.pull_request.created', expect.any(Object));
    });
  });

  describe('Service Integration', () => {
    it('should integrate WorkflowGitService with GitWorkflowManager', async () => {
      const task = {
        id: 'refactor-task-1',
        title: 'Refactor database layer',
        description: 'Refactor the database access layer',
        type: { value: 'refactor' },
        metadata: {
          projectPath: '/test/project'
        }
      };

      // Use WorkflowGitService (which internally uses GitWorkflowManager)
      const branchResult = await workflowGitService.createWorkflowBranch(
        task.metadata.projectPath,
        task,
        { autoMerge: false }
      );

      expect(branchResult.success).toBe(true);
      expect(branchResult.branchName).toMatch(/refactor\/refactor-database-layer/);
      expect(mockGitService.createBranch).toHaveBeenCalled();
    });

    it('should integrate WorkflowOrchestrationService with enhanced git workflow', async () => {
      const task = {
        id: 'bugfix-task-1',
        title: 'Fix login bug',
        description: 'Fix the login authentication bug',
        type: { value: 'bug' },
        metadata: {
          projectPath: '/test/project'
        }
      };

      // Use WorkflowOrchestrationService (which internally uses GitWorkflowManager)
      const result = await workflowOrchestrationService.executeWorkflow(task, {
        autoMerge: true
      });

      expect(result.success).toBe(true);
      expect(result.branch).toBeDefined();
      expect(result.workflow).toBeDefined();
      expect(result.completion).toBeDefined();
    });

    it('should integrate TaskService with enhanced git workflow', async () => {
      const mockTaskRepository = {
        findById: jest.fn().mockResolvedValue({
          id: 'task-1',
          title: 'Test Task',
          type: { value: 'feature' },
          metadata: { projectPath: '/test/project' },
          isCompleted: () => false
        }),
        update: jest.fn().mockResolvedValue(true)
      };

      const enhancedTaskService = new TaskService(
        mockTaskRepository,
        { generateResponse: jest.fn() },
        { analyzeProject: jest.fn() },
        null,
        null,
        workflowGitService
      );

      const result = await enhancedTaskService.executeTask('task-1', { projectPath: '/test/project' });

      expect(result.success).toBe(true);
      expect(mockGitService.createBranch).toHaveBeenCalled();
    });

    it('should integrate AutoFinishSystem with enhanced git workflow', async () => {
      const task = {
        id: 'auto-task-1',
        description: 'Automatically implement user registration',
        metadata: {
          projectPath: '/test/project'
        }
      };

      // Mock cursor IDE response
      autoFinishSystem.cursorIDE.sendMessage = jest.fn().mockResolvedValue('Task completed successfully');

      const result = await autoFinishSystem.processTask(task, 'session-1', {
        autoMerge: true
      });

      expect(result.success).toBe(true);
      expect(result.method).toBe('enhanced');
      expect(mockGitService.createBranch).toHaveBeenCalled();
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle git service failures gracefully across all services', async () => {
      // Mock git service to fail
      mockGitService.createBranch.mockRejectedValue(new Error('Git service unavailable'));

      const task = {
        id: 'error-task-1',
        title: 'Test error handling',
        type: { value: 'feature' },
        metadata: {
          projectPath: '/test/project'
        }
      };

      // Test WorkflowGitService fallback
      const branchResult = await workflowGitService.createWorkflowBranch(
        task.metadata.projectPath,
        task,
        {}
      );

      expect(branchResult.success).toBe(true); // Should fallback to legacy method
      expect(mockLogger.error).toHaveBeenCalled();

      // Test WorkflowOrchestrationService fallback
      const orchestrationResult = await workflowOrchestrationService.executeWorkflow(task, {});
      expect(orchestrationResult.success).toBe(true); // Should fallback to legacy method
    });

    it('should handle invalid task data across all services', async () => {
      const invalidTask = {
        id: 'invalid-task',
        title: '',
        type: null,
        metadata: {}
      };

      const context = new GitWorkflowContext({
        projectPath: '',
        task: invalidTask,
        options: {},
        workflowType: 'workflow-execution'
      });

      // Should throw GitWorkflowException
      await expect(gitWorkflowManager.executeWorkflow(context))
        .rejects.toThrow();
    });
  });

  describe('Event System Integration', () => {
    it('should publish events for all workflow operations', async () => {
      const task = {
        id: 'event-task-1',
        title: 'Test event system',
        type: { value: 'feature' },
        metadata: {
          projectPath: '/test/project'
        }
      };

      const context = new GitWorkflowContext({
        projectPath: task.metadata.projectPath,
        task,
        options: { createPullRequest: true },
        workflowType: 'workflow-execution'
      });

      // Execute workflow
      await gitWorkflowManager.executeWorkflow(context);

      // Verify events were published
      expect(mockEventBus.publish).toHaveBeenCalledWith('git.workflow.branch.created', expect.any(Object));
      expect(mockEventBus.publish).toHaveBeenCalledWith('git.workflow.executed', expect.any(Object));
      expect(mockEventBus.publish).toHaveBeenCalledWith('git.workflow.pull_request.created', expect.any(Object));
    });

    it('should handle event bus failures gracefully', async () => {
      // Mock event bus to fail
      mockEventBus.publish.mockImplementation(() => {
        throw new Error('Event bus error');
      });

      const task = {
        id: 'event-error-task-1',
        title: 'Test event error handling',
        type: { value: 'feature' },
        metadata: {
          projectPath: '/test/project'
        }
      };

      const context = new GitWorkflowContext({
        projectPath: task.metadata.projectPath,
        task,
        options: {},
        workflowType: 'workflow-execution'
      });

      // Should not throw error, just log it
      const result = await gitWorkflowManager.executeWorkflow(context);
      expect(result.success).toBe(true);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('Performance Integration', () => {
    it('should handle concurrent workflow executions', async () => {
      const tasks = [
        {
          id: 'concurrent-task-1',
          title: 'Concurrent task 1',
          type: { value: 'feature' },
          metadata: { projectPath: '/test/project' }
        },
        {
          id: 'concurrent-task-2',
          title: 'Concurrent task 2',
          type: { value: 'bug' },
          metadata: { projectPath: '/test/project' }
        },
        {
          id: 'concurrent-task-3',
          title: 'Concurrent task 3',
          type: { value: 'refactor' },
          metadata: { projectPath: '/test/project' }
        }
      ];

      const contexts = tasks.map(task => new GitWorkflowContext({
        projectPath: task.metadata.projectPath,
        task,
        options: {},
        workflowType: 'workflow-execution'
      }));

      // Execute workflows concurrently
      const startTime = Date.now();
      const results = await Promise.all(
        contexts.map(context => gitWorkflowManager.executeWorkflow(context))
      );
      const endTime = Date.now();

      // Verify all workflows completed successfully
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Verify performance (should complete within reasonable time)
      expect(endTime - startTime).toBeLessThan(5000); // 5 seconds
    });
  });
}); 