# Phase 1: Backend API Extension

## Overview
Extend the backend to support task phase grouping and phase execution functionality.

## Tasks

### 1. Extend TaskService with getTasksByPhases method
**File**: `backend/domain/services/TaskService.js`
**Time**: 30 minutes

```javascript
/**
 * Get tasks grouped by phases for a project
 * @param {string} projectId - The project ID
 * @returns {Object} Tasks grouped by phases
 */
async getTasksByPhases(projectId) {
  const tasks = await this.taskRepository.findByProject(projectId);
  
  // Group tasks by phase field
  const grouped = {};
  tasks.forEach(task => {
    const phase = task.phase || 'implementation'; // Default phase
    if (!grouped[phase]) {
      grouped[phase] = { 
        name: phase, 
        tasks: [],
        totalTasks: 0,
        completedTasks: 0
      };
    }
    grouped[phase].tasks.push(task);
    grouped[phase].totalTasks++;
    if (task.status === 'completed') {
      grouped[phase].completedTasks++;
    }
  });
  
  return grouped;
}
```

### 2. Add executePhase method to TaskService
**File**: `backend/domain/services/TaskService.js`
**Time**: 45 minutes

```javascript
/**
 * Execute all tasks in a specific phase
 * @param {string} projectId - The project ID
 * @param {string} phaseName - The phase name to execute
 * @returns {Object} Execution results
 */
async executePhase(projectId, phaseName) {
  const tasks = await this.getTasksByPhase(projectId, phaseName);
  
  if (!tasks || tasks.length === 0) {
    throw new Error(`No tasks found for phase: ${phaseName}`);
  }
  
  const results = {
    phaseName,
    totalTasks: tasks.length,
    executedTasks: 0,
    failedTasks: 0,
    errors: []
  };
  
  // Execute tasks sequentially to avoid conflicts
  for (const task of tasks) {
    try {
      if (task.status !== 'completed') {
        await this.executeTask(task.id);
        results.executedTasks++;
      }
    } catch (error) {
      results.failedTasks++;
      results.errors.push({
        taskId: task.id,
        taskTitle: task.title,
        error: error.message
      });
    }
  }
  
  return results;
}

/**
 * Get tasks for a specific phase
 * @param {string} projectId - The project ID
 * @param {string} phaseName - The phase name
 * @returns {Array} Tasks in the specified phase
 */
async getTasksByPhase(projectId, phaseName) {
  const tasks = await this.taskRepository.findByProject(projectId);
  return tasks.filter(task => (task.phase || 'implementation') === phaseName);
}
```

### 3. Create new API endpoints in TaskController
**File**: `backend/presentation/api/TaskController.js`
**Time**: 30 minutes

```javascript
/**
 * Get tasks grouped by phases
 * GET /api/projects/:projectId/tasks/phases
 */
async getTasksByPhases(req, res) {
  try {
    const { projectId } = req.params;
    const groupedTasks = await this.taskService.getTasksByPhases(projectId);
    
    res.json({
      success: true,
      data: {
        phases: groupedTasks
      }
    });
  } catch (error) {
    this.logger.error('Error getting tasks by phases:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get tasks by phases',
      details: error.message
    });
  }
}

/**
 * Execute all tasks in a phase
 * POST /api/projects/:projectId/phases/:phaseName/execute
 */
async executePhase(req, res) {
  try {
    const { projectId, phaseName } = req.params;
    const results = await this.taskService.executePhase(projectId, phaseName);
    
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    this.logger.error('Error executing phase:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute phase',
      details: error.message
    });
  }
}
```

### 4. Add PhaseExecutionService for bulk phase execution
**File**: `backend/domain/services/PhaseExecutionService.js`
**Time**: 30 minutes

```javascript
const logger = require('@/infrastructure/logging/logger');

class PhaseExecutionService {
  constructor(taskService) {
    this.taskService = taskService;
  }
  
  /**
   * Execute multiple phases in sequence
   * @param {string} projectId - The project ID
   * @param {Array} phaseNames - Array of phase names to execute
   * @returns {Object} Execution results for all phases
   */
  async executePhases(projectId, phaseNames) {
    const results = {
      projectId,
      totalPhases: phaseNames.length,
      executedPhases: 0,
      failedPhases: 0,
      phaseResults: []
    };
    
    for (const phaseName of phaseNames) {
      try {
        logger.info(`Executing phase: ${phaseName} for project: ${projectId}`);
        const phaseResult = await this.taskService.executePhase(projectId, phaseName);
        results.phaseResults.push(phaseResult);
        results.executedPhases++;
      } catch (error) {
        logger.error(`Failed to execute phase ${phaseName}:`, error);
        results.failedPhases++;
        results.phaseResults.push({
          phaseName,
          error: error.message,
          success: false
        });
      }
    }
    
    return results;
  }
  
  /**
   * Get phase execution status
   * @param {string} projectId - The project ID
   * @returns {Object} Phase status information
   */
  async getPhaseStatus(projectId) {
    const groupedTasks = await this.taskService.getTasksByPhases(projectId);
    
    const phaseStatus = {};
    Object.entries(groupedTasks).forEach(([phaseName, phaseData]) => {
      phaseStatus[phaseName] = {
        name: phaseName,
        totalTasks: phaseData.totalTasks,
        completedTasks: phaseData.completedTasks,
        progress: phaseData.totalTasks > 0 ? 
          (phaseData.completedTasks / phaseData.totalTasks) * 100 : 0,
        isComplete: phaseData.completedTasks === phaseData.totalTasks
      };
    });
    
    return phaseStatus;
  }
}

module.exports = PhaseExecutionService;
```

### 5. Write unit tests for new service methods
**File**: `tests/unit/TaskService.test.js`
**Time**: 45 minutes

```javascript
describe('TaskService - Phase Grouping', () => {
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
      expect(result.implementation).toBeDefined();
      expect(result.implementation.tasks).toHaveLength(1);
    });
    
    it('should use default phase for tasks without phase', async () => {
      const mockTasks = [
        { id: '1', title: 'Task 1', status: 'pending' }
      ];
      
      taskRepository.findByProject.mockResolvedValue(mockTasks);
      
      const result = await taskService.getTasksByPhases('project1');
      
      expect(result.implementation).toBeDefined();
      expect(result.implementation.tasks).toHaveLength(1);
    });
  });
  
  describe('executePhase', () => {
    it('should execute all tasks in a phase', async () => {
      const mockTasks = [
        { id: '1', title: 'Task 1', phase: 'setup', status: 'pending' },
        { id: '2', title: 'Task 2', phase: 'setup', status: 'pending' }
      ];
      
      taskRepository.findByProject.mockResolvedValue(mockTasks);
      taskService.executeTask = jest.fn().mockResolvedValue(true);
      
      const result = await taskService.executePhase('project1', 'setup');
      
      expect(result.executedTasks).toBe(2);
      expect(result.failedTasks).toBe(0);
      expect(taskService.executeTask).toHaveBeenCalledTimes(2);
    });
    
    it('should handle execution errors gracefully', async () => {
      const mockTasks = [
        { id: '1', title: 'Task 1', phase: 'setup', status: 'pending' }
      ];
      
      taskRepository.findByProject.mockResolvedValue(mockTasks);
      taskService.executeTask = jest.fn().mockRejectedValue(new Error('Execution failed'));
      
      const result = await taskService.executePhase('project1', 'setup');
      
      expect(result.executedTasks).toBe(0);
      expect(result.failedTasks).toBe(1);
      expect(result.errors).toHaveLength(1);
    });
  });
});
```

## Success Criteria
- [ ] TaskService has getTasksByPhases method that groups tasks correctly
- [ ] TaskService has executePhase method that executes all tasks in a phase
- [ ] TaskController has new endpoints for phase operations
- [ ] PhaseExecutionService handles bulk phase execution
- [ ] All unit tests pass with 90%+ coverage
- [ ] Error handling works correctly for all methods

## Dependencies
- Existing TaskService and TaskRepository
- Winston logger infrastructure
- Jest testing framework

## Notes
- Uses existing task.phase field from database
- Implements sequential execution to avoid conflicts
- Provides detailed error reporting for failed executions
- Includes progress tracking for phase completion 