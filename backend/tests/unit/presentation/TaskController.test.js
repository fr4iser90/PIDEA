const TaskController = require('@/presentation/api/TaskController');

describe('TaskController - Phase Endpoints', () => {
  let taskController;
  let taskService;
  let taskRepository;
  let aiService;
  let projectAnalyzer;

  beforeEach(() => {
    // Mock dependencies
    taskService = {
      getTasksByPhases: jest.fn(),
      executePhase: jest.fn()
    };

    taskRepository = {
      findByProject: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    };

    aiService = {
      analyzeProject: jest.fn(),
      generateTasks: jest.fn()
    };

    projectAnalyzer = {
      analyze: jest.fn()
    };

    taskController = new TaskController(
      taskService,
      taskRepository,
      aiService,
      projectAnalyzer
    );
  });

  describe('getTasksByPhases', () => {
    it('should return tasks grouped by phases', async () => {
      const mockGroupedTasks = {
        setup: {
          name: 'setup',
          tasks: [],
          totalTasks: 2,
          completedTasks: 1
        },
        implementation: {
          name: 'implementation',
          tasks: [],
          totalTasks: 3,
          completedTasks: 2
        }
      };

      taskService.getTasksByPhases.mockResolvedValue(mockGroupedTasks);

      const req = {
        params: { projectId: 'project1' },
        user: { id: 'user1' }
      };

      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await taskController.getTasksByPhases(req, res);

      expect(taskService.getTasksByPhases).toHaveBeenCalledWith('project1');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          phases: mockGroupedTasks
        }
      });
    });

    it('should handle errors gracefully', async () => {
      taskService.getTasksByPhases.mockRejectedValue(new Error('Database error'));

      const req = {
        params: { projectId: 'project1' },
        user: { id: 'user1' }
      };

      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await taskController.getTasksByPhases(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to get tasks by phases',
        details: 'Database error'
      });
    });
  });

  describe('executePhase', () => {
    it('should execute a single phase', async () => {
      const mockResult = {
        phaseName: 'setup',
        totalTasks: 2,
        executedTasks: 2,
        failedTasks: 0,
        errors: []
      };

      taskService.executePhase.mockResolvedValue(mockResult);

      const req = {
        params: { projectId: 'project1', phaseName: 'setup' },
        user: { id: 'user1' }
      };

      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await taskController.executePhase(req, res);

      expect(taskService.executePhase).toHaveBeenCalledWith('project1', 'setup');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult
      });
    });

    it('should handle phase execution errors', async () => {
      taskService.executePhase.mockRejectedValue(new Error('Phase execution failed'));

      const req = {
        params: { projectId: 'project1', phaseName: 'setup' },
        user: { id: 'user1' }
      };

      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await taskController.executePhase(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to execute phase',
        details: 'Phase execution failed'
      });
    });
  });

  describe('executePhases', () => {
    it('should execute multiple phases in sequence', async () => {
      const mockResult = {
        projectId: 'project1',
        totalPhases: 2,
        executedPhases: 2,
        failedPhases: 0,
        phaseResults: []
      };

      // Mock PhaseExecutionService
      const mockPhaseExecutionService = {
        executePhases: jest.fn().mockResolvedValue(mockResult)
      };

      // Mock require to return our mock service
      jest.doMock('@/domain/services/PhaseExecutionService', () => {
        return jest.fn().mockImplementation(() => mockPhaseExecutionService);
      });

      const req = {
        params: { projectId: 'project1' },
        body: { phaseNames: ['setup', 'implementation'] },
        user: { id: 'user1' }
      };

      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await taskController.executePhases(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult
      });
    });

    it('should validate phaseNames array', async () => {
      const req = {
        params: { projectId: 'project1' },
        body: { phaseNames: 'not-an-array' },
        user: { id: 'user1' }
      };

      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await taskController.executePhases(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'phaseNames must be an array'
      });
    });

    it('should handle phase execution errors', async () => {
      // Mock PhaseExecutionService to throw error
      const mockPhaseExecutionService = {
        executePhases: jest.fn().mockRejectedValue(new Error('Execution failed'))
      };

      jest.doMock('@/domain/services/PhaseExecutionService', () => {
        return jest.fn().mockImplementation(() => mockPhaseExecutionService);
      });

      const req = {
        params: { projectId: 'project1' },
        body: { phaseNames: ['setup'] },
        user: { id: 'user1' }
      };

      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await taskController.executePhases(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to execute phases',
        details: 'Execution failed'
      });
    });
  });

  describe('getPhaseStatus', () => {
    it('should return phase status information', async () => {
      const mockStatus = {
        setup: {
          name: 'setup',
          totalTasks: 2,
          completedTasks: 1,
          progress: 50,
          isComplete: false
        }
      };

      // Mock PhaseExecutionService
      const mockPhaseExecutionService = {
        getPhaseStatus: jest.fn().mockResolvedValue(mockStatus)
      };

      jest.doMock('@/domain/services/PhaseExecutionService', () => {
        return jest.fn().mockImplementation(() => mockPhaseExecutionService);
      });

      const req = {
        params: { projectId: 'project1' },
        user: { id: 'user1' }
      };

      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await taskController.getPhaseStatus(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockStatus
      });
    });

    it('should handle status retrieval errors', async () => {
      // Mock PhaseExecutionService to throw error
      const mockPhaseExecutionService = {
        getPhaseStatus: jest.fn().mockRejectedValue(new Error('Status retrieval failed'))
      };

      jest.doMock('@/domain/services/PhaseExecutionService', () => {
        return jest.fn().mockImplementation(() => mockPhaseExecutionService);
      });

      const req = {
        params: { projectId: 'project1' },
        user: { id: 'user1' }
      };

      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await taskController.getPhaseStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to get phase status',
        details: 'Status retrieval failed'
      });
    });
  });
}); 