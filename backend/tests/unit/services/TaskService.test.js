const TaskService = require('@/domain/services/TaskService');
const Task = require('@/domain/entities/Task');
const TaskStatus = require('@/domain/value-objects/TaskStatus');
const TaskPriority = require('@/domain/value-objects/TaskPriority');
const TaskType = require('@/domain/value-objects/TaskType');

describe('TaskService - Phase Grouping', () => {
  let taskService;
  let taskRepository;
  let aiService;
  let projectAnalyzer;
  let autoFinishSystem;
  let gitWorkflowManager;

  beforeEach(() => {
    // Mock dependencies
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

    autoFinishSystem = {
      processTask: jest.fn()
    };

    gitWorkflowManager = {
      executeWorkflow: jest.fn()
    };

    taskService = new TaskService(
      taskRepository,
      aiService,
      projectAnalyzer,
      null,
      autoFinishSystem,
      { gitService: {} }
    );
  });

  describe('getTasksByPhases', () => {
    it('should group tasks by phase correctly', async () => {
      const mockTasks = [
        { id: '1', title: 'Setup DB', phase: 'setup', status: 'completed' },
        { id: '2', title: 'Configure API', phase: 'setup', status: 'pending' },
        { id: '3', title: 'Create UI', phase: 'implementation', status: 'pending' }
      ];
      
      taskRepository.findByProject.mockResolvedValue(mockTasks);
      
      const result = await taskService.getTasksByPhases('project1');
      
      expect(result.setup).toBeDefined();
      expect(result.setup.tasks).toHaveLength(2);
      expect(result.setup.totalTasks).toBe(2);
      expect(result.setup.completedTasks).toBe(1);
      expect(result.implementation).toBeDefined();
      expect(result.implementation.tasks).toHaveLength(1);
      expect(result.implementation.totalTasks).toBe(1);
      expect(result.implementation.completedTasks).toBe(0);
    });
    
    it('should use default phase for tasks without phase', async () => {
      const mockTasks = [
        { id: '1', title: 'Task 1', status: 'pending' }
      ];
      
      taskRepository.findByProject.mockResolvedValue(mockTasks);
      
      const result = await taskService.getTasksByPhases('project1');
      
      expect(result.implementation).toBeDefined();
      expect(result.implementation.tasks).toHaveLength(1);
      expect(result.implementation.totalTasks).toBe(1);
    });

    it('should handle empty task list', async () => {
      taskRepository.findByProject.mockResolvedValue([]);
      
      const result = await taskService.getTasksByPhases('project1');
      
      expect(result).toEqual({});
    });

    it('should handle repository errors', async () => {
      taskRepository.findByProject.mockRejectedValue(new Error('Database error'));
      
      await expect(taskService.getTasksByPhases('project1')).rejects.toThrow('Failed to get tasks by phases: Database error');
    });
  });

  describe('getTasksByPhase', () => {
    it('should return tasks for specific phase', async () => {
      const mockTasks = [
        { id: '1', title: 'Setup DB', phase: 'setup', status: 'completed' },
        { id: '2', title: 'Configure API', phase: 'setup', status: 'pending' },
        { id: '3', title: 'Create UI', phase: 'implementation', status: 'pending' }
      ];
      
      taskRepository.findByProject.mockResolvedValue(mockTasks);
      
      const result = await taskService.getTasksByPhase('project1', 'setup');
      
      expect(result).toHaveLength(2);
      expect(result[0].phase).toBe('setup');
      expect(result[1].phase).toBe('setup');
    });

    it('should return empty array for non-existent phase', async () => {
      const mockTasks = [
        { id: '1', title: 'Task 1', phase: 'setup', status: 'pending' }
      ];
      
      taskRepository.findByProject.mockResolvedValue(mockTasks);
      
      const result = await taskService.getTasksByPhase('project1', 'nonexistent');
      
      expect(result).toHaveLength(0);
    });
  });

  describe('executePhase', () => {
    it('should execute all tasks in a phase using Auto-Finish System', async () => {
      const mockTasks = [
        { id: '1', title: 'Task 1', phase: 'setup', status: 'pending' },
        { id: '2', title: 'Task 2', phase: 'setup', status: 'pending' }
      ];
      
      taskRepository.findByProject.mockResolvedValue(mockTasks);
      
      // Mock Auto-Finish System
      const mockAutoFinishResult = { success: true, status: 'completed' };
      autoFinishSystem.processTask.mockResolvedValue(mockAutoFinishResult);
      
      const result = await taskService.executePhase('project1', 'setup');
      
      expect(result.executedTasks).toBe(2);
      expect(result.failedTasks).toBe(0);
      expect(result.totalTasks).toBe(2);
      expect(result.phaseName).toBe('setup');
      expect(autoFinishSystem.processTask).toHaveBeenCalledTimes(2);
    });
    
    it('should handle execution errors gracefully', async () => {
      const mockTasks = [
        { id: '1', title: 'Task 1', phase: 'setup', status: 'pending' }
      ];
      
      taskRepository.findByProject.mockResolvedValue(mockTasks);
      
      // Mock Auto-Finish System failure
      autoFinishSystem.processTask.mockResolvedValue({ 
        success: false, 
        error: 'Auto-finish failed' 
      });
      
      const result = await taskService.executePhase('project1', 'setup');
      
      expect(result.executedTasks).toBe(0);
      expect(result.failedTasks).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe('Auto-finish failed');
    });

    it('should skip completed tasks', async () => {
      const mockTasks = [
        { id: '1', title: 'Task 1', phase: 'setup', status: 'completed' },
        { id: '2', title: 'Task 2', phase: 'setup', status: 'pending' }
      ];
      
      taskRepository.findByProject.mockResolvedValue(mockTasks);
      
      const mockAutoFinishResult = { success: true, status: 'completed' };
      autoFinishSystem.processTask.mockResolvedValue(mockAutoFinishResult);
      
      const result = await taskService.executePhase('project1', 'setup');
      
      expect(result.executedTasks).toBe(1);
      expect(result.totalTasks).toBe(2);
      expect(autoFinishSystem.processTask).toHaveBeenCalledTimes(1);
    });

    it('should throw error for non-existent phase', async () => {
      taskRepository.findByProject.mockResolvedValue([]);
      
      await expect(taskService.executePhase('project1', 'nonexistent')).rejects.toThrow('No tasks found for phase: nonexistent');
    });

    it('should fallback to direct execution when Auto-Finish System is not available', async () => {
      const mockTasks = [
        { id: '1', title: 'Task 1', phase: 'setup', status: 'pending' }
      ];
      
      taskRepository.findByProject.mockResolvedValue(mockTasks);
      
      // Remove Auto-Finish System
      taskService.autoFinishSystem = null;
      
      // Mock direct execution
      taskService.executeTask = jest.fn().mockResolvedValue({ success: true });
      
      const result = await taskService.executePhase('project1', 'setup');
      
      expect(result.executedTasks).toBe(1);
      expect(taskService.executeTask).toHaveBeenCalledWith('1', 'system');
    });

    it('should handle individual task execution errors', async () => {
      const mockTasks = [
        { id: '1', title: 'Task 1', phase: 'setup', status: 'pending' }
      ];
      
      taskRepository.findByProject.mockResolvedValue(mockTasks);
      
      // Mock Auto-Finish System to throw error
      autoFinishSystem.processTask.mockRejectedValue(new Error('Task execution failed'));
      
      const result = await taskService.executePhase('project1', 'setup');
      
      expect(result.executedTasks).toBe(0);
      expect(result.failedTasks).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe('Task execution failed');
    });
  });
}); 