const TaskPriority = require('../../domain/value-objects/TaskPriority');
const TaskType = require('@/domain/value-objects/TaskType');

/**
 * CreateTaskCommand - Command for creating new project-based tasks
 */
class CreateTaskCommand {
    constructor(projectIdOrData, title, description, priority = TaskPriority.MEDIUM, type = TaskType.FEATURE, metadata = {}) {
        // Support both old format (projectId, title, ...) and new format ({title, type, ...})
        if (typeof projectIdOrData === 'object') {
            const data = projectIdOrData;
            this.commandId = `create_task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            this.projectId = data.projectId || 'test-project'; // Default for tests
            this.title = data.title;
            this.description = data.description || '';
            this.priority = data.priority || TaskPriority.MEDIUM;
            this.type = data.type;
            this.metadata = data.metadata || {};
            this.requestedBy = data.createdBy || data.requestedBy || 'system';
            this.timestamp = new Date();
        } else {
            // Old format
            const projectId = projectIdOrData;
            if (!projectId) {
                throw new Error('Project ID is required for task creation');
            }
            
            this.commandId = `create_task_${projectId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            this.projectId = projectId;
            this.title = title;
            this.description = description;
            this.priority = priority;
            this.type = type;
            this.metadata = metadata;
            this.requestedBy = metadata.requestedBy || 'system';
            this.timestamp = new Date();
        }
    }

    static create(projectId, title, description, priority = TaskPriority.MEDIUM, type = TaskType.FEATURE, metadata = {}) {
        return new CreateTaskCommand(projectId, title, description, priority, type, metadata);
    }

    toJSON() {
        return {
            commandId: this.commandId,
            projectId: this.projectId,
            title: this.title,
            description: this.description,
            priority: this.priority,
            type: this.type,
            metadata: this.metadata,
            requestedBy: this.requestedBy,
            timestamp: this.timestamp
        };
    }

    getMetadata() {
        return this.metadata;
    }
}

module.exports = CreateTaskCommand; 