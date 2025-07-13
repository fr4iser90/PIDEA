# Phase 1: Backend API Extension - CORRECTED

## Overview
Extend the backend to support task phase grouping and phase execution functionality by leveraging existing working systems.

## Current State Analysis
- **TaskService.js**: Exists at `backend/domain/services/TaskService.js` but has no phase grouping methods
- **TaskController.js**: Exists at `backend/presentation/api/TaskController.js` but has no phase endpoints
- **PhaseExecutionService.js**: Does not exist
- **Auto-Finish System**: ✅ Working and available for integration
- **Git Workflow Manager**: ✅ Working and available for integration

## Tasks

### 1. Extend TaskService with getTasksByPhases method
**File**: `backend/domain/services/TaskService.js`
**Time**: 30 minutes
**Status**: ❌ Not implemented

```javascript
/**
 * Get tasks grouped by phases for a project
 * @param {string} projectId - The project ID
 * @returns {Object} Tasks grouped by phases
 */
async getTasksByPhases(projectId) {
  try {
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
  } catch (error) {
    console.error('Error getting tasks by phases:', error);
    throw new Error(`Failed to get tasks by phases: ${error.message}`);
  }
}
```

### 2. Add executePhase method to TaskService
**File**: `backend/domain/services/TaskService.js`
**Time**: 45 minutes
**Status**: ❌ Not implemented

```javascript
/**
 * Execute all tasks in a specific phase using existing Auto-Finish System
 * @param {string} projectId - The project ID
 * @param {string} phaseName - The phase name to execute
 * @returns {Object} Execution results
 */
async executePhase(projectId, phaseName) {
  try {
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
    
    // Execute tasks using existing Auto-Finish System
    for (const task of tasks) {
      try {
        if (task.status !== 'completed') {
          // Use existing Auto-Finish System for task execution
          if (this.autoFinishSystem) {
            const autoFinishResult = await this.autoFinishSystem.processTask(task, `phase-${phaseName}-${task.id}`, {
              stopOnError: false,
              maxConfirmationAttempts: 3,
              confirmationTimeout: 10000,
              fallbackDetectionEnabled: true
            });
            
            if (autoFinishResult.success) {
              results.executedTasks++;
            } else {
              results.failedTasks++;
              results.errors.push({
                taskId: task.id,
                taskTitle: task.title,
                error: autoFinishResult.error || 'Auto-finish processing failed'
              });
            }
          } else {
            // Fallback to direct execution
            await this.executeTask(task.id, 'system');
            results.executedTasks++;
          }
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
  } catch (error) {
    console.error('Error executing phase:', error);
    throw new Error(`Failed to execute phase ${phaseName}: ${error.message}`);
  }
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
**Status**: ❌ Not implemented

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
    console.error('Error getting tasks by phases:', error);
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
    console.error('Error executing phase:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute phase',
      details: error.message
    });
  }
}

/**
 * Execute multiple phases in sequence
 * POST /api/projects/:projectId/phases/execute
 */
async executePhases(req, res) {
  try {
    const { projectId } = req.params;
    const { phaseNames } = req.body;
    
    if (!Array.isArray(phaseNames)) {
      return res.status(400).json({
        success: false,
        error: 'phaseNames must be an array'
      });
    }
    
    const results = await this.phaseExecutionService.executePhases(projectId, phaseNames);
    
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error executing phases:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute phases',
      details: error.message
    });
  }
}
```

### 4. Add PhaseExecutionService for bulk phase execution
**File**: `backend/domain/services/PhaseExecutionService.js`
**Time**: 30 minutes
**Status**: ❌ Not implemented

```javascript
const logger = require('@/infrastructure/logging/logger');

class PhaseExecutionService {
  constructor(taskService, autoFinishSystem, gitWorkflowManager) {
    this.taskService = taskService;
    this.autoFinishSystem = autoFinishSystem;
    this.gitWorkflowManager = gitWorkflowManager;
  }
  
  /**
   * Execute multiple phases in sequence using existing systems
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
        console.log(`Executing phase: ${phaseName} for project: ${projectId}`);
        
        // Use existing Git workflow if available
        if (this.gitWorkflowManager) {
          const gitResult = await this.gitWorkflowManager.executeWorkflow({
            id: `phase-${phaseName}`,
            type: { value: 'phase_execution' },
            metadata: { phaseName, projectId }
          }, {
            projectPath: process.cwd(),
            phaseName: phaseName
          });
          
          if (gitResult.success) {
            const phaseResult = await this.taskService.executePhase(projectId, phaseName);
            results.phaseResults.push(phaseResult);
            results.executedPhases++;
          } else {
            throw new Error(`Git workflow failed: ${gitResult.error}`);
          }
        } else {
          // Fallback to direct phase execution
          const phaseResult = await this.taskService.executePhase(projectId, phaseName);
          results.phaseResults.push(phaseResult);
          results.executedPhases++;
        }
      } catch (error) {
        console.error(`Failed to execute phase ${phaseName}:`, error);
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
**Status**: ❌ Not implemented

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
    it('should execute all tasks in a phase using Auto-Finish System', async () => {
      const mockTasks = [
        { id: '1', title: 'Task 1', phase: 'setup', status: 'pending' },
        { id: '2', title: 'Task 2', phase: 'setup', status: 'pending' }
      ];
      
      taskRepository.findByProject.mockResolvedValue(mockTasks);
      
      // Mock Auto-Finish System
      const mockAutoFinishResult = { success: true, status: 'completed' };
      taskService.autoFinishSystem = {
        processTask: jest.fn().mockResolvedValue(mockAutoFinishResult)
      };
      
      const result = await taskService.executePhase('project1', 'setup');
      
      expect(result.executedTasks).toBe(2);
      expect(result.failedTasks).toBe(0);
      expect(taskService.autoFinishSystem.processTask).toHaveBeenCalledTimes(2);
    });
    
    it('should handle execution errors gracefully', async () => {
      const mockTasks = [
        { id: '1', title: 'Task 1', phase: 'setup', status: 'pending' }
      ];
      
      taskRepository.findByProject.mockResolvedValue(mockTasks);
      
      // Mock Auto-Finish System failure
      taskService.autoFinishSystem = {
        processTask: jest.fn().mockResolvedValue({ 
          success: false, 
          error: 'Auto-finish failed' 
        })
      };
      
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
- [ ] TaskService has executePhase method that uses Auto-Finish System
- [ ] TaskController has new endpoints for phase operations
- [ ] PhaseExecutionService handles bulk phase execution with Git workflow integration
- [ ] All unit tests pass with 90%+ coverage
- [ ] Error handling works correctly for all methods
- [ ] Integration with existing Auto-Finish System works properly

## Dependencies
- Existing TaskService and TaskRepository
- Auto-Finish System (already working)
- Git Workflow Manager (already working)
- Winston logger infrastructure
- Jest testing framework

## Integration with Existing Systems
- **Auto-Finish System**: Used for task execution with confirmation loops
- **Git Workflow Manager**: Used for phase execution with proper branch management
- **Task Repository**: Extended to support phase grouping
- **Logging**: Integrated with existing Winston logger

## Notes
- Uses existing task.phase field from database
- Leverages working Auto-Finish System for task execution
- Integrates with existing Git workflow management
- Implements proper error handling and logging
- Includes progress tracking for phase completion
- Provides detailed error reporting for failed executions 