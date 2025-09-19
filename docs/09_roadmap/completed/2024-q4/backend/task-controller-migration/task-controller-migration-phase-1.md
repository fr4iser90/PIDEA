# Task Controller Migration - Phase 1: TaskController Extension

## Overview
Add dedicated docs-tasks methods to TaskController, leveraging existing type filtering capabilities.

## Objectives
- [ ] Add getDocsTasks method to TaskController (reuse existing type filtering)
- [ ] Add getDocsTaskDetails method to TaskController (reuse existing getTask method)
- [ ] Test TaskController docs-tasks functionality
- [ ] Verify existing type filtering works correctly

## Deliverables
- Code: getDocsTasks method in TaskController
- Code: getDocsTaskDetails method in TaskController
- Tests: Unit tests for new methods
- Documentation: API documentation updates

## Dependencies
- Requires: Existing TaskController implementation (already supports type filtering)
- Requires: TaskApplicationService (already supports type filtering)
- Blocks: Phase 2 (IDEController cleanup)

## Estimated Time
0.5 hours

## Success Criteria
- [ ] getDocsTasks method returns docs-tasks correctly using type=documentation filter
- [ ] getDocsTaskDetails method returns task details for docs-tasks
- [ ] All methods follow existing patterns
- [ ] Unit tests pass
- [ ] No changes needed to TaskApplicationService (already supports type filtering)

## Implementation Details

### 1. Add TaskController.getDocsTasks
```javascript
/**
 * GET /api/projects/:projectId/tasks?type=documentation - Get docs tasks
 * Reuses existing getProjectTasks with type=documentation filter
 */
async getDocsTasks(req, res) {
    try {
        const { projectId } = req.params;
        const userId = req.user?.id;

        this.logger.info('📋 [TaskController] getDocsTasks called for project:', projectId);

        // Reuse existing getProjectTasks with type filter
        const tasks = await this.taskApplicationService.getProjectTasks(projectId, {
            type: 'documentation'
        });

        this.logger.info(`✅ [TaskController] Found ${tasks.length} docs tasks`);

        res.json({
            success: true,
            data: tasks,
            projectId,
            count: tasks.length,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        this.logger.error('❌ [TaskController] Failed to get docs tasks:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get docs tasks',
            message: error.message
        });
    }
}
```

### 2. Add TaskController.getDocsTaskDetails
```javascript
/**
 * GET /api/projects/:projectId/tasks/:id - Get specific docs task details
 * Reuses existing getTask method with type validation
 */
async getDocsTaskDetails(req, res) {
    try {
        const { projectId, id } = req.params;
        const userId = req.user?.id;

        this.logger.info('📋 [TaskController] getDocsTaskDetails called for project:', projectId, 'task:', id);

        // Reuse existing getTask method
        const task = await this.taskApplicationService.getTask(id, projectId);

        if (!task) {
            return res.status(404).json({
                success: false,
                error: 'Task not found'
            });
        }

        // Verify it's a docs task
        if (task.type !== 'documentation') {
            return res.status(400).json({
                success: false,
                error: 'Task is not a documentation task'
            });
        }

        this.logger.info(`✅ [TaskController] Found docs task: ${task.title}`);

        res.json({
            success: true,
            data: task,
            projectId,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        this.logger.error('❌ [TaskController] Failed to get docs task details:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get docs task details',
            message: error.message
        });
    }
}
```

### 3. No Changes Needed to TaskApplicationService
```javascript
// TaskApplicationService.getProjectTasks already supports type filtering:
async getProjectTasks(projectId, options = {}) {
    try {
        this.logger.info(`Getting tasks for project: ${projectId}`, options);
        
        const { limit = 50, offset = 0, status, priority, type } = options;
        
        const tasks = await this.taskRepository.findByProjectId(projectId, {
            limit,
            offset,
            status,
            priority,
            type // ✅ Already supports type filtering
        });
        
        return tasks.map(task => ({
            id: task.id,
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
            type: task.type,
            projectId: task.projectId,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt,
            metadata: task.metadata
        }));
        
    } catch (error) {
        this.logger.error('❌ Failed to get project tasks:', error);
        throw new Error(`Failed to get project tasks: ${error.message}`);
    }
}
```

## Testing Strategy

### Unit Tests
```javascript
// tests/unit/presentation/api/TaskController.test.js
describe('TaskController - Docs Tasks', () => {
    test('getDocsTasks should return docs tasks only', async () => {
        // Mock taskApplicationService.getProjectTasks
        const mockTasks = [
            { id: '1', title: 'Docs Task 1', type: 'documentation' },
            { id: '2', title: 'Docs Task 2', type: 'documentation' }
        ];
        
        taskController.taskApplicationService.getProjectTasks = jest.fn()
            .mockResolvedValue(mockTasks);
        
        const req = { params: { projectId: 'test' }, user: { id: 'user1' } };
        const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
        
        await taskController.getDocsTasks(req, res);
        
        expect(taskController.taskApplicationService.getProjectTasks)
            .toHaveBeenCalledWith('test', { type: 'documentation' });
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: true,
                data: mockTasks,
                count: 2
            })
        );
    });

    test('getDocsTaskDetails should return specific docs task', async () => {
        const mockTask = { 
            id: '1', 
            title: 'Docs Task 1', 
            type: 'documentation',
            projectId: 'test'
        };
        
        taskController.taskApplicationService.getTask = jest.fn()
            .mockResolvedValue(mockTask);
        
        const req = { params: { projectId: 'test', id: '1' }, user: { id: 'user1' } };
        const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
        
        await taskController.getDocsTaskDetails(req, res);
        
        expect(taskController.taskApplicationService.getTask)
            .toHaveBeenCalledWith('1', 'test');
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: true,
                data: mockTask
            })
        );
    });

    test('getDocsTaskDetails should reject non-docs tasks', async () => {
        const mockTask = { 
            id: '1', 
            title: 'Regular Task', 
            type: 'feature',
            projectId: 'test'
        };
        
        taskController.taskApplicationService.getTask = jest.fn()
            .mockResolvedValue(mockTask);
        
        const req = { params: { projectId: 'test', id: '1' }, user: { id: 'user1' } };
        const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
        
        await taskController.getDocsTaskDetails(req, res);
        
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                error: 'Task is not a documentation task'
            })
        );
    });
});
```

## Code Standards
- Follow existing TaskController patterns
- Use consistent error handling
- Add proper logging
- Maintain JSDoc documentation
- Follow naming conventions
- Reuse existing functionality where possible

## Risk Mitigation
- **Breaking existing functionality**: Test thoroughly with existing endpoints
- **Performance impact**: Reuse existing optimized type filtering
- **Data consistency**: Ensure docs-tasks have correct type field
- **Method duplication**: Leverage existing getProjectTasks and getTask methods

## Validation Results
- ✅ TaskController.getProjectTasks already supports type filtering
- ✅ TaskApplicationService.getProjectTasks already supports type filtering
- ✅ TaskController.getTask already exists and works correctly
- ✅ No changes needed to underlying services
- ✅ Existing patterns can be reused

## Next Steps
- Complete Phase 1 implementation
- Run unit tests
- Verify functionality
- Proceed to Phase 2 (IDEController cleanup) 