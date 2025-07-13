const PhaseExecutionService = require('@/domain/services/PhaseExecutionService');

describe('PhaseExecutionService', () => {
  let phaseExecutionService;
  let taskService;
  let autoFinishSystem;
  let gitWorkflowManager;

  beforeEach(() => {
    // Mock dependencies
    taskService = {
      getTasksByPhases: jest.fn(),
      executePhase: jest.fn()
    };

    autoFinishSystem = {
      processTask: jest.fn()
    };

    gitWorkflowManager = {
      executeWorkflow: jest.fn()
    };

    phaseExecutionService = new PhaseExecutionService(
      taskService,
      autoFinishSystem,
      gitWorkflowManager
    );
  });

  describe('executePhases', () => {
    it('should execute multiple phases in sequence with Git workflow', async () => {
      const phaseNames = ['setup', 'implementation'];
      
      // Mock Git workflow success
      gitWorkflowManager.executeWorkflow.mockResolvedValue({ success: true });
      
      // Mock phase execution results
      taskService.executePhase
        .mockResolvedValueOnce({ phaseName: 'setup', executedTasks: 2, totalTasks: 2 })
        .mockResolvedValueOnce({ phaseName: 'implementation', executedTasks: 3, totalTasks: 3 });
      
      const result = await phaseExecutionService.executePhases('project1', phaseNames);
      
      expect(result.projectId).toBe('project1');
      expect(result.totalPhases).toBe(2);
      expect(result.executedPhases).toBe(2);
      expect(result.failedPhases).toBe(0);
      expect(result.phaseResults).toHaveLength(2);
      expect(gitWorkflowManager.executeWorkflow).toHaveBeenCalledTimes(2);
    });

    it('should handle Git workflow failures', async () => {
      const phaseNames = ['setup'];
      
      // Mock Git workflow failure
      gitWorkflowManager.executeWorkflow.mockResolvedValue({ 
        success: false, 
        error: 'Git workflow failed' 
      });
      
      const result = await phaseExecutionService.executePhases('project1', phaseNames);
      
      expect(result.executedPhases).toBe(0);
      expect(result.failedPhases).toBe(1);
      expect(result.phaseResults[0].error).toBe('Git workflow failed');
    });

    it('should fallback to direct execution when Git workflow manager is not available', async () => {
      // Remove Git workflow manager
      phaseExecutionService.gitWorkflowManager = null;
      
      const phaseNames = ['setup'];
      
      // Mock phase execution
      taskService.executePhase.mockResolvedValue({ 
        phaseName: 'setup', 
        executedTasks: 1, 
        totalTasks: 1 
      });
      
      const result = await phaseExecutionService.executePhases('project1', phaseNames);
      
      expect(result.executedPhases).toBe(1);
      expect(result.failedPhases).toBe(0);
      expect(taskService.executePhase).toHaveBeenCalledWith('project1', 'setup');
    });

    it('should handle phase execution errors', async () => {
      const phaseNames = ['setup'];
      
      // Mock Git workflow success but phase execution failure
      gitWorkflowManager.executeWorkflow.mockResolvedValue({ success: true });
      taskService.executePhase.mockRejectedValue(new Error('Phase execution failed'));
      
      const result = await phaseExecutionService.executePhases('project1', phaseNames);
      
      expect(result.executedPhases).toBe(0);
      expect(result.failedPhases).toBe(1);
      expect(result.phaseResults[0].error).toBe('Phase execution failed');
    });

    it('should continue execution even if some phases fail', async () => {
      const phaseNames = ['setup', 'implementation', 'testing'];
      
      // Mock Git workflow success for all phases
      gitWorkflowManager.executeWorkflow.mockResolvedValue({ success: true });
      
      // Mock phase execution with one failure
      taskService.executePhase
        .mockResolvedValueOnce({ phaseName: 'setup', executedTasks: 2, totalTasks: 2 })
        .mockRejectedValueOnce(new Error('Implementation failed'))
        .mockResolvedValueOnce({ phaseName: 'testing', executedTasks: 1, totalTasks: 1 });
      
      const result = await phaseExecutionService.executePhases('project1', phaseNames);
      
      expect(result.executedPhases).toBe(2);
      expect(result.failedPhases).toBe(1);
      expect(result.phaseResults).toHaveLength(3);
    });
  });

  describe('getPhaseStatus', () => {
    it('should return phase status with progress information', async () => {
      const mockGroupedTasks = {
        setup: {
          name: 'setup',
          tasks: [],
          totalTasks: 3,
          completedTasks: 2
        },
        implementation: {
          name: 'implementation',
          tasks: [],
          totalTasks: 5,
          completedTasks: 5
        }
      };
      
      taskService.getTasksByPhases.mockResolvedValue(mockGroupedTasks);
      
      const result = await phaseExecutionService.getPhaseStatus('project1');
      
      expect(result.setup).toBeDefined();
      expect(result.setup.totalTasks).toBe(3);
      expect(result.setup.completedTasks).toBe(2);
      expect(result.setup.progress).toBe(66.66666666666666);
      expect(result.setup.isComplete).toBe(false);
      
      expect(result.implementation).toBeDefined();
      expect(result.implementation.totalTasks).toBe(5);
      expect(result.implementation.completedTasks).toBe(5);
      expect(result.implementation.progress).toBe(100);
      expect(result.implementation.isComplete).toBe(true);
    });

    it('should handle empty phases', async () => {
      taskService.getTasksByPhases.mockResolvedValue({});
      
      const result = await phaseExecutionService.getPhaseStatus('project1');
      
      expect(result).toEqual({});
    });

    it('should handle phases with no tasks', async () => {
      const mockGroupedTasks = {
        setup: {
          name: 'setup',
          tasks: [],
          totalTasks: 0,
          completedTasks: 0
        }
      };
      
      taskService.getTasksByPhases.mockResolvedValue(mockGroupedTasks);
      
      const result = await phaseExecutionService.getPhaseStatus('project1');
      
      expect(result.setup.progress).toBe(0);
      expect(result.setup.isComplete).toBe(true);
    });
  });
}); 