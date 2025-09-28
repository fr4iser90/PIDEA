import TaskReviewService from '@/application/services/TaskReviewService';

// Mock dependencies
jest.mock('@/infrastructure/repositories/APIChatRepository', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    sendMessage: jest.fn(),
    apiCall: jest.fn()
  })),
  apiCall: jest.fn()
}));

jest.mock('@/infrastructure/repositories/TaskWorkflowRepository', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    executeWorkflow: jest.fn(),
    getWorkflowStatus: jest.fn(),
    cancelWorkflow: jest.fn()
  }))
}));

describe('TaskReviewService', () => {
  let taskReviewService;
  let mockApiCall;
  let mockEventBus;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock eventBus
    mockEventBus = {
      emit: jest.fn()
    };
    global.window = { eventBus: mockEventBus };
    
    // Mock apiCall
    mockApiCall = jest.fn();
    
    taskReviewService = new TaskReviewService();
    taskReviewService.apiChatRepository.apiCall = mockApiCall;
  });

  afterEach(() => {
    delete global.window;
  });

  describe('executeTaskReviewWorkflow', () => {
    const mockSelectedTasks = [
      {
        id: '1',
        title: 'Task 1',
        priority: { value: 'high' },
        status: { value: 'pending' }
      },
      {
        id: '2',
        title: 'Task 2',
        priority: { value: 'medium' },
        status: { value: 'in-progress' }
      }
    ];

    const mockProjectId = 'project-123';
    const mockProjectPath = '/path/to/project';

    const mockSuccessResponse = {
      success: true,
      data: {
        results: [
          { taskId: '1', success: true, result: 'completed' },
          { taskId: '2', success: true, result: 'completed' }
        ],
        summary: {
          totalTasks: 2,
          completedTasks: 2,
          failedTasks: 0,
          workflowPrompt: 'task-check-state.md'
        }
      }
    };

    it('successfully executes task review workflow', async () => {
      mockApiCall.mockResolvedValue(mockSuccessResponse);

      const result = await taskReviewService.executeTaskReviewWorkflow(
        mockSelectedTasks,
        mockProjectId,
        mockProjectPath
      );

      expect(mockApiCall).toHaveBeenCalledWith(
        `/api/projects/${mockProjectId}/workflow/execute`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            projectPath: mockProjectPath,
            mode: 'task-review',
            tasks: mockSelectedTasks,
            options: {
              workflowPrompt: 'task-check-state.md',
              autoExecute: true
            }
          })
        }
      );

      expect(result).toEqual({
        success: true,
        data: mockSuccessResponse.data,
        message: 'Review completed for 2/2 tasks'
      });

      expect(mockEventBus.emit).toHaveBeenCalledWith('task-review-completed', {
        taskCount: mockSelectedTasks.length,
        projectId: mockProjectId,
        result: mockSuccessResponse.data
      });
    });

    it('handles API failure response', async () => {
      const mockFailureResponse = {
        success: false,
        error: 'Workflow execution failed'
      };
      mockApiCall.mockResolvedValue(mockFailureResponse);

      await expect(
        taskReviewService.executeTaskReviewWorkflow(
          mockSelectedTasks,
          mockProjectId,
          mockProjectPath
        )
      ).rejects.toThrow('Review workflow failed: Workflow execution failed');

      expect(mockEventBus.emit).toHaveBeenCalledWith('task-review-failed', {
        taskCount: mockSelectedTasks.length,
        projectId: mockProjectId,
        error: 'Review workflow failed: Workflow execution failed'
      });
    });

    it('handles API call exception', async () => {
      const mockError = new Error('Network error');
      mockApiCall.mockRejectedValue(mockError);

      await expect(
        taskReviewService.executeTaskReviewWorkflow(
          mockSelectedTasks,
          mockProjectId,
          mockProjectPath
        )
      ).rejects.toThrow('Review workflow failed: Network error');

      expect(mockEventBus.emit).toHaveBeenCalledWith('task-review-failed', {
        taskCount: mockSelectedTasks.length,
        projectId: mockProjectId,
        error: 'Review workflow failed: Network error'
      });
    });

    it('handles empty tasks array', async () => {
      mockApiCall.mockResolvedValue(mockSuccessResponse);

      const result = await taskReviewService.executeTaskReviewWorkflow(
        [],
        mockProjectId,
        mockProjectPath
      );

      expect(mockApiCall).toHaveBeenCalledWith(
        `/api/projects/${mockProjectId}/workflow/execute`,
        expect.objectContaining({
          body: JSON.stringify({
            projectPath: mockProjectPath,
            mode: 'task-review',
            tasks: [],
            options: {
              workflowPrompt: 'task-check-state.md',
              autoExecute: true
            }
          })
        })
      );

      expect(result.success).toBe(true);
    });

    it('handles missing summary data gracefully', async () => {
      const responseWithoutSummary = {
        success: true,
        data: {
          results: [
            { taskId: '1', success: true, result: 'completed' }
          ]
        }
      };
      mockApiCall.mockResolvedValue(responseWithoutSummary);

      const result = await taskReviewService.executeTaskReviewWorkflow(
        mockSelectedTasks,
        mockProjectId,
        mockProjectPath
      );

      expect(result.message).toBe('Review completed for 2/2 tasks');
    });

    it('logs execution details', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      mockApiCall.mockResolvedValue(mockSuccessResponse);

      await taskReviewService.executeTaskReviewWorkflow(
        mockSelectedTasks,
        mockProjectId,
        mockProjectPath
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        'TaskReviewService: Starting task review workflow:',
        {
          taskCount: mockSelectedTasks.length,
          projectId: mockProjectId,
          projectPath: mockProjectPath
        }
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        'TaskReviewService: Task review workflow completed:',
        mockSuccessResponse.data
      );

      consoleSpy.mockRestore();
    });

    it('logs error details on failure', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const mockError = new Error('API Error');
      mockApiCall.mockRejectedValue(mockError);

      await expect(
        taskReviewService.executeTaskReviewWorkflow(
          mockSelectedTasks,
          mockProjectId,
          mockProjectPath
        )
      ).rejects.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        'TaskReviewService: Task review workflow failed:',
        mockError
      );

      consoleSpy.mockRestore();
    });

    it('works without eventBus', async () => {
      delete global.window;
      mockApiCall.mockResolvedValue(mockSuccessResponse);

      const result = await taskReviewService.executeTaskReviewWorkflow(
        mockSelectedTasks,
        mockProjectId,
        mockProjectPath
      );

      expect(result.success).toBe(true);
      // Should not throw error when eventBus is not available
    });
  });

  describe('Integration with existing methods', () => {
    it('maintains compatibility with existing generateReviewPlan method', async () => {
      const mockTaskData = {
        title: 'Test Task',
        description: 'Test Description',
        category: 'frontend',
        priority: 'high'
      };

      const mockApiResponse = {
        success: true,
        content: 'Mock review plan content'
      };

      taskReviewService.apiChatRepository.sendMessage = jest.fn().mockResolvedValue(mockApiResponse);
      taskReviewService.apiChatRepository.apiCall = jest.fn().mockResolvedValue({
        success: true,
        content: 'Mock prompt content'
      });

      const result = await taskReviewService.generateReviewPlan(mockTaskData);

      expect(result).toHaveProperty('plan');
      expect(result).toHaveProperty('analysis');
      expect(result).toHaveProperty('taskData');
    });

    it('maintains compatibility with existing executeTask method', async () => {
      const mockReviewData = {
        taskData: {
          title: 'Test Task',
          description: 'Test Description'
        },
        plan: 'Mock plan',
        estimatedHours: 2
      };

      const mockWorkflowResult = {
        workflowId: 'test-workflow',
        success: true
      };

      taskReviewService.taskWorkflowRepository.executeWorkflow = jest.fn().mockResolvedValue(mockWorkflowResult);
      taskReviewService.apiChatRepository.apiCall = jest.fn().mockResolvedValue({
        success: true,
        content: 'Mock execute prompt content'
      });

      const result = await taskReviewService.executeTask(mockReviewData);

      expect(result).toEqual(mockWorkflowResult);
    });
  });
});
