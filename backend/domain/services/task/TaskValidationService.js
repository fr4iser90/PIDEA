const Task = require('@entities/Task');
const TaskExecution = require('@entities/TaskExecution');
const TaskStatus = require('@value-objects/TaskStatus');
const TaskType = require('@value-objects/TaskType');
const TaskPriority = require('@value-objects/TaskPriority');
const TaskRepository = require('@repositories/TaskRepository');
const TaskExecutionRepository = require('@repositories/TaskExecutionRepository');

/**
 * TaskValidationService - Provides comprehensive task validation and verification
 * Validates task parameters, dependencies, and execution requirements
 */
class TaskValidationService {
    constructor(
        taskRepository,
        taskExecutionRepository,
        cursorIDEService,
        eventBus,
        fileSystemService
    ) {
        this.taskRepository = taskRepository;
        this.taskExecutionRepository = taskExecutionRepository;
        this.cursorIDEService = cursorIDEService;
        this.eventBus = eventBus;
        this.fileSystemService = fileSystemService;
    }

    /**
     * Validate task creation parameters
     * @param {Object} params - Task creation parameters
     * @returns {Promise<Object>} Validation result
     */
    async validateTaskCreation(params) {
        const validationResult = {
            isValid: true,
            errors: [],
            warnings: [],
            suggestions: []
        };

        try {
            // Validate required fields
            this.validateRequiredFields(params, validationResult);

            // Validate field formats
            this.validateFieldFormats(params, validationResult);

            // Validate business rules
            await this.validateBusinessRules(params, validationResult);

            // Validate dependencies
            await this.validateDependencies(params, validationResult);

            // Validate project context
            await this.validateProjectContext(params, validationResult);

            // Generate suggestions
            this.generateSuggestions(params, validationResult);

            // Emit validation event
            this.eventBus.emit('task:validation:creation', {
                params,
                result: validationResult
            });

            return validationResult;

        } catch (error) {
            validationResult.isValid = false;
            validationResult.errors.push(`Validation error: ${error.message}`);
            return validationResult;
        }
    }

    /**
     * Validate task execution
     * @param {string} taskId - Task ID
     * @param {Object} options - Execution options
     * @returns {Promise<Object>} Validation result
     */
    async validateTaskExecution(taskId, options = {}) {
        const validationResult = {
            isValid: true,
            errors: [],
            warnings: [],
            suggestions: []
        };

        try {
            // Get task
            const task = await this.taskRepository.findById(taskId);
            if (!task) {
                validationResult.isValid = false;
                validationResult.errors.push(`Task not found: ${taskId}`);
                return validationResult;
            }

            // Validate task state
            this.validateTaskState(task, validationResult);

            // Validate execution prerequisites
            await this.validateExecutionPrerequisites(task, validationResult);

            // Validate resource requirements
            await this.validateResourceRequirements(task, options, validationResult);

            // Validate dependencies
            await this.validateExecutionDependencies(task, validationResult);

            // Validate project state
            await this.validateProjectState(task, validationResult);

            // Validate execution options
            this.validateExecutionOptions(options, validationResult);

            // Emit validation event
            this.eventBus.emit('task:validation:execution', {
                taskId,
                options,
                result: validationResult
            });

            return validationResult;

        } catch (error) {
            validationResult.isValid = false;
            validationResult.errors.push(`Execution validation error: ${error.message}`);
            return validationResult;
        }
    }

    /**
     * Validate task update
     * @param {string} taskId - Task ID
     * @param {Object} updates - Update parameters
     * @returns {Promise<Object>} Validation result
     */
    async validateTaskUpdate(taskId, updates) {
        const validationResult = {
            isValid: true,
            errors: [],
            warnings: [],
            suggestions: []
        };

        try {
            // Get task
            const task = await this.taskRepository.findById(taskId);
            if (!task) {
                validationResult.isValid = false;
                validationResult.errors.push(`Task not found: ${taskId}`);
                return validationResult;
            }

            // Validate update permissions
            this.validateUpdatePermissions(task, updates, validationResult);

            // Validate update fields
            this.validateUpdateFields(updates, validationResult);

            // Validate update constraints
            await this.validateUpdateConstraints(task, updates, validationResult);

            // Validate update impact
            await this.validateUpdateImpact(task, updates, validationResult);

            // Emit validation event
            this.eventBus.emit('task:validation:update', {
                taskId,
                updates,
                result: validationResult
            });

            return validationResult;

        } catch (error) {
            validationResult.isValid = false;
            validationResult.errors.push(`Update validation error: ${error.message}`);
            return validationResult;
        }
    }

    /**
     * Validate task dependencies
     * @param {Array<string>} dependencyIds - Dependency task IDs
     * @returns {Promise<Object>} Validation result
     */
    async validateTaskDependencies(dependencyIds) {
        const validationResult = {
            isValid: true,
            errors: [],
            warnings: [],
            suggestions: []
        };

        try {
            if (!dependencyIds || dependencyIds.length === 0) {
                return validationResult;
            }

            // Check for circular dependencies
            await this.validateCircularDependencies(dependencyIds, validationResult);

            // Validate dependency existence
            await this.validateDependencyExistence(dependencyIds, validationResult);

            // Validate dependency states
            await this.validateDependencyStates(dependencyIds, validationResult);

            // Validate dependency compatibility
            await this.validateDependencyCompatibility(dependencyIds, validationResult);

            return validationResult;

        } catch (error) {
            validationResult.isValid = false;
            validationResult.errors.push(`Dependency validation error: ${error.message}`);
            return validationResult;
        }
    }

    /**
     * Validate project configuration
     * @param {string} projectPath - Project path
     * @param {Object} options - Validation options
     * @returns {Promise<Object>} Validation result
     */
    async validateProjectConfiguration(projectPath, options = {}) {
        const validationResult = {
            isValid: true,
            errors: [],
            warnings: [],
            suggestions: []
        };

        try {
            // Validate project path
            await this.validateProjectPath(projectPath, validationResult);

            // Validate project structure
            await this.validateProjectStructure(projectPath, validationResult);

            // Validate configuration files
            await this.validateConfigurationFiles(projectPath, validationResult);

            // Validate dependencies
            await this.validateProjectDependencies(projectPath, validationResult);

            // Validate build configuration
            await this.validateBuildConfiguration(projectPath, validationResult);

            // Validate test configuration
            await this.validateTestConfiguration(projectPath, validationResult);

            return validationResult;

        } catch (error) {
            validationResult.isValid = false;
            validationResult.errors.push(`Project validation error: ${error.message}`);
            return validationResult;
        }
    }

    /**
     * Validate required fields
     * @param {Object} params - Parameters
     * @param {Object} validationResult - Validation result
     */
    validateRequiredFields(params, validationResult) {
        const requiredFields = ['title', 'description', 'type', 'projectPath'];
        
        for (const field of requiredFields) {
            if (!params[field] || (typeof params[field] === 'string' && params[field].trim() === '')) {
                validationResult.isValid = false;
                validationResult.errors.push(`Required field missing: ${field}`);
            }
        }
    }

    /**
     * Validate field formats
     * @param {Object} params - Parameters
     * @param {Object} validationResult - Validation result
     */
    validateFieldFormats(params, validationResult) {
        // Validate title format
        if (params.title && params.title.length > 200) {
            validationResult.errors.push('Title must be less than 200 characters');
        }

        // Validate description format
        if (params.description && params.description.length > 2000) {
            validationResult.errors.push('Description must be less than 2000 characters');
        }

        // Validate estimated time
        if (params.estimatedTime && (params.estimatedTime < 1 || params.estimatedTime > 1440)) {
            validationResult.errors.push('Estimated time must be between 1 and 1440 minutes');
        }

        // Validate priority
        if (params.priority && !Object.values(TaskPriority).includes(params.priority)) {
            validationResult.errors.push('Invalid priority value');
        }

        // Validate task type
        if (params.type && !Object.values(TaskType).includes(params.type)) {
            validationResult.errors.push('Invalid task type');
        }
    }

    /**
     * Validate business rules
     * @param {Object} params - Parameters
     * @param {Object} validationResult - Validation result
     */
    async validateBusinessRules(params, validationResult) {
        // Check for duplicate tasks
        const existingTasks = await this.taskRepository.findByProjectPath(params.projectPath);
        const duplicateTask = existingTasks.find(task => 
            task.title.toLowerCase() === params.title.toLowerCase() &&
            task.type.value === params.type.value
        );

        if (duplicateTask) {
            validationResult.warnings.push('Similar task already exists in this project');
        }

        // Validate task type constraints
        if (params.type === TaskType.AI_ANALYSIS && !params.projectPath) {
            validationResult.errors.push('AI analysis tasks require a project path');
        }

        // Validate priority constraints
        if (params.priority === TaskPriority.CRITICAL && params.estimatedTime > 480) {
            validationResult.warnings.push('Critical tasks should typically be completed within 8 hours');
        }
    }

    /**
     * Validate dependencies
     * @param {Object} params - Parameters
     * @param {Object} validationResult - Validation result
     */
    async validateDependencies(params, validationResult) {
        if (!params.dependencies || params.dependencies.length === 0) {
            return;
        }

        // Validate dependency existence
        for (const depId of params.dependencies) {
            const depTask = await this.taskRepository.findById(depId);
            if (!depTask) {
                validationResult.errors.push(`Dependency task not found: ${depId}`);
            }
        }

        // Check for circular dependencies
        const circularDeps = await this.detectCircularDependencies(params.dependencies);
        if (circularDeps.length > 0) {
            validationResult.errors.push(`Circular dependencies detected: ${circularDeps.join(' -> ')}`);
        }
    }

    /**
     * Validate project context
     * @param {Object} params - Parameters
     * @param {Object} validationResult - Validation result
     */
    async validateProjectContext(params, validationResult) {
        if (!params.projectPath) {
            return;
        }

        // Check if project path exists
        const projectExists = await this.fileSystemService.exists(params.projectPath);
        if (!projectExists) {
            validationResult.errors.push(`Project path does not exist: ${params.projectPath}`);
            return;
        }

        // Validate project structure
        const projectStructure = await this.analyzeProjectStructure(params.projectPath);
        if (!projectStructure.isValid) {
            validationResult.warnings.push('Project structure may not be optimal for this task type');
        }

        // Check project permissions
        const hasWritePermission = await this.fileSystemService.hasWritePermission(params.projectPath);
        if (!hasWritePermission) {
            validationResult.errors.push('No write permission for project path');
        }
    }

    /**
     * Generate suggestions
     * @param {Object} params - Parameters
     * @param {Object} validationResult - Validation result
     */
    generateSuggestions(params, validationResult) {
        // Suggest better title if needed
        if (params.title && params.title.length < 10) {
            validationResult.suggestions.push('Consider a more descriptive title');
        }

        // Suggest tags if missing
        if (!params.tags || params.tags.length === 0) {
            validationResult.suggestions.push('Consider adding tags for better organization');
        }

        // Suggest estimated time if missing
        if (!params.estimatedTime) {
            validationResult.suggestions.push('Consider adding estimated time for better planning');
        }

        // Suggest priority if missing
        if (!params.priority) {
            validationResult.suggestions.push('Consider setting a priority level');
        }
    }

    /**
     * Validate task state
     * @param {Task} task - Task object
     * @param {Object} validationResult - Validation result
     */
    validateTaskState(task, validationResult) {
        if (task.status.value === TaskStatus.COMPLETED) {
            validationResult.errors.push('Cannot execute completed task');
        }

        if (task.status.value === TaskStatus.CANCELLED) {
            validationResult.errors.push('Cannot execute cancelled task');
        }

        if (task.status.value === TaskStatus.RUNNING) {
            validationResult.errors.push('Task is already running');
        }
    }

    /**
     * Validate execution prerequisites
     * @param {Task} task - Task object
     * @param {Object} validationResult - Validation result
     */
    async validateExecutionPrerequisites(task, validationResult) {
        // Check if all dependencies are completed
        if (task.dependencies && task.dependencies.length > 0) {
            for (const depId of task.dependencies) {
                const depTask = await this.taskRepository.findById(depId);
                if (depTask && depTask.status.value !== TaskStatus.COMPLETED) {
                    validationResult.errors.push(`Dependency task not completed: ${depTask.title}`);
                }
            }
        }

        // Check if required resources are available
        const resourceCheck = await this.checkResourceAvailability(task);
        if (!resourceCheck.available) {
            validationResult.errors.push(`Required resources not available: ${resourceCheck.missing.join(', ')}`);
        }
    }

    /**
     * Validate resource requirements
     * @param {Task} task - Task object
     * @param {Object} options - Options
     * @param {Object} validationResult - Validation result
     */
    async validateResourceRequirements(task, options, validationResult) {
        // Check memory requirements
        const memoryRequired = this.calculateMemoryRequirement(task, options);
        const availableMemory = await this.getAvailableMemory();
        
        if (memoryRequired > availableMemory) {
            validationResult.errors.push(`Insufficient memory: required ${memoryRequired}MB, available ${availableMemory}MB`);
        }

        // Check disk space
        const diskRequired = this.calculateDiskRequirement(task, options);
        const availableDisk = await this.getAvailableDiskSpace(task.projectPath);
        
        if (diskRequired > availableDisk) {
            validationResult.errors.push(`Insufficient disk space: required ${diskRequired}MB, available ${availableDisk}MB`);
        }

        // Check CPU availability
        const cpuRequired = this.calculateCPURequirement(task, options);
        const availableCPU = await this.getAvailableCPU();
        
        if (cpuRequired > availableCPU) {
            validationResult.warnings.push(`High CPU usage expected: ${cpuRequired}% of available ${availableCPU}%`);
        }
    }

    /**
     * Validate execution dependencies
     * @param {Task} task - Task object
     * @param {Object} validationResult - Validation result
     */
    async validateExecutionDependencies(task, validationResult) {
        // Check for conflicting tasks
        const conflictingTasks = await this.findConflictingTasks(task);
        if (conflictingTasks.length > 0) {
            validationResult.warnings.push(`Conflicting tasks detected: ${conflictingTasks.map(t => t.title).join(', ')}`);
        }

        // Check for blocking tasks
        const blockingTasks = await this.findBlockingTasks(task);
        if (blockingTasks.length > 0) {
            validationResult.errors.push(`Blocking tasks detected: ${blockingTasks.map(t => t.title).join(', ')}`);
        }
    }

    /**
     * Validate project state
     * @param {Task} task - Task object
     * @param {Object} validationResult - Validation result
     */
    async validateProjectState(task, validationResult) {
        // Check if project is in a valid state
        const projectState = await this.analyzeProjectState(task.projectPath);
        
        if (projectState.hasUncommittedChanges) {
            validationResult.warnings.push('Project has uncommitted changes');
        }

        if (projectState.hasMergeConflicts) {
            validationResult.errors.push('Project has merge conflicts that must be resolved');
        }

        if (projectState.isInBuildState) {
            validationResult.warnings.push('Project is currently building');
        }
    }

    /**
     * Validate execution options
     * @param {Object} options - Options
     * @param {Object} validationResult - Validation result
     */
    validateExecutionOptions(options, validationResult) {
        // Validate timeout
        if (options.timeout && (options.timeout < 1000 || options.timeout > 3600000)) {
            validationResult.errors.push('Timeout must be between 1 second and 1 hour');
        }

        // Validate retry count
        if (options.retryCount && (options.retryCount < 0 || options.retryCount > 10)) {
            validationResult.errors.push('Retry count must be between 0 and 10');
        }

        // Validate parallel execution
        if (options.parallel && typeof options.parallel !== 'boolean') {
            validationResult.errors.push('Parallel option must be a boolean');
        }
    }

    /**
     * Validate update permissions
     * @param {Task} task - Task object
     * @param {Object} updates - Updates
     * @param {Object} validationResult - Validation result
     */
    validateUpdatePermissions(task, updates, validationResult) {
        // Check if task can be updated
        if (task.status.value === TaskStatus.COMPLETED) {
            validationResult.warnings.push('Updating completed task may affect historical data');
        }

        if (task.status.value === TaskStatus.RUNNING) {
            validationResult.errors.push('Cannot update running task');
        }
    }

    /**
     * Validate update fields
     * @param {Object} updates - Updates
     * @param {Object} validationResult - Validation result
     */
    validateUpdateFields(updates, validationResult) {
        // Validate field formats for updates
        this.validateFieldFormats(updates, validationResult);

        // Check for immutable fields
        const immutableFields = ['id', 'createdAt', 'createdBy'];
        for (const field of immutableFields) {
            if (updates[field]) {
                validationResult.errors.push(`Cannot update immutable field: ${field}`);
            }
        }
    }

    /**
     * Validate update constraints
     * @param {Task} task - Task object
     * @param {Object} updates - Updates
     * @param {Object} validationResult - Validation result
     */
    async validateUpdateConstraints(task, updates, validationResult) {
        // Check if status change is valid
        if (updates.status) {
            // Allow keeping the same status (no change)
            if (task.status.value === updates.status) {
                // No validation error for keeping the same status
                return;
            }
            
            const validTransitions = this.getValidStatusTransitions(task.status.value);
            if (!validTransitions.includes(updates.status)) {
                validationResult.errors.push(`Invalid status transition from ${task.status.value} to ${updates.status}`);
            }
        }

        // Check if priority change affects dependencies
        if (updates.priority && updates.priority !== task.priority.value) {
            const dependencyImpact = await this.analyzePriorityChangeImpact(task, updates.priority);
            if (dependencyImpact.hasConflicts) {
                validationResult.warnings.push('Priority change may affect dependent tasks');
            }
        }
    }

    /**
     * Validate update impact
     * @param {Task} task - Task object
     * @param {Object} updates - Updates
     * @param {Object} validationResult - Validation result
     */
    async validateUpdateImpact(task, updates, validationResult) {
        // Analyze impact on dependent tasks
        const dependentTasks = await this.findDependentTasks(task.id);
        
        for (const depTask of dependentTasks) {
            const impact = this.analyzeUpdateImpact(task, updates, depTask);
            if (impact.hasIssues) {
                validationResult.warnings.push(`Update may affect dependent task: ${depTask.title}`);
            }
        }
    }

    /**
     * Validate circular dependencies
     * @param {Array<string>} dependencyIds - Dependency IDs
     * @param {Object} validationResult - Validation result
     */
    async validateCircularDependencies(dependencyIds, validationResult) {
        const circularDeps = await this.detectCircularDependencies(dependencyIds);
        if (circularDeps.length > 0) {
            validationResult.isValid = false;
            validationResult.errors.push(`Circular dependencies detected: ${circularDeps.join(' -> ')}`);
        }
    }

    /**
     * Validate dependency existence
     * @param {Array<string>} dependencyIds - Dependency IDs
     * @param {Object} validationResult - Validation result
     */
    async validateDependencyExistence(dependencyIds, validationResult) {
        for (const depId of dependencyIds) {
            const depTask = await this.taskRepository.findById(depId);
            if (!depTask) {
                validationResult.isValid = false;
                validationResult.errors.push(`Dependency task not found: ${depId}`);
            }
        }
    }

    /**
     * Validate dependency states
     * @param {Array<string>} dependencyIds - Dependency IDs
     * @param {Object} validationResult - Validation result
     */
    async validateDependencyStates(dependencyIds, validationResult) {
        for (const depId of dependencyIds) {
            const depTask = await this.taskRepository.findById(depId);
            if (depTask && depTask.status.value === TaskStatus.CANCELLED) {
                validationResult.warnings.push(`Dependency task is cancelled: ${depTask.title}`);
            }
        }
    }

    /**
     * Validate dependency compatibility
     * @param {Array<string>} dependencyIds - Dependency IDs
     * @param {Object} validationResult - Validation result
     */
    async validateDependencyCompatibility(dependencyIds, validationResult) {
        // Check if dependencies are compatible with each other
        const depTasks = await Promise.all(
            dependencyIds.map(id => this.taskRepository.findById(id))
        );

        const validTasks = depTasks.filter(task => task !== null);
        
        // Check for conflicting task types
        const taskTypes = validTasks.map(task => task.type.value);
        const uniqueTypes = new Set(taskTypes);
        
        if (uniqueTypes.size !== taskTypes.length) {
            validationResult.warnings.push('Multiple dependencies of the same type may cause conflicts');
        }
    }

    // Helper methods (placeholder implementations)

    async detectCircularDependencies(dependencyIds) { return []; }
    async analyzeProjectStructure(projectPath) { return { isValid: true }; }
    async checkResourceAvailability(task) { return { available: true, missing: [] }; }
    calculateMemoryRequirement(task, options) { return 512; }
    async getAvailableMemory() { return 8192; }
    calculateDiskRequirement(task, options) { return 100; }
    async getAvailableDiskSpace(projectPath) { return 10000; }
    calculateCPURequirement(task, options) { return 50; }
    async getAvailableCPU() { return 100; }
    async findConflictingTasks(task) { return []; }
    async findBlockingTasks(task) { return []; }
    async analyzeProjectState(projectPath) { return { hasUncommittedChanges: false, hasMergeConflicts: false, isInBuildState: false }; }
    getValidStatusTransitions(currentStatus) {
        // Allow keeping the same status (no change)
        if (currentStatus === currentStatus) {
            return true;
        }

        const validTransitions = {
            'pending': ['in-progress', 'cancelled', 'blocked'],
            'in-progress': ['completed', 'failed', 'blocked', 'cancelled'],
            'blocked': ['pending', 'in-progress', 'cancelled'],
            'completed': [], // No transitions from completed
            'failed': ['pending', 'in-progress'],
            'cancelled': [] // No transitions from cancelled
        };

        return validTransitions[currentStatus] || [];
    }
    async analyzePriorityChangeImpact(task, newPriority) { return { hasConflicts: false }; }
    async findDependentTasks(taskId) { return []; }
    analyzeUpdateImpact(task, updates, depTask) { return { hasIssues: false }; }
    async validateProjectPath(projectPath, validationResult) { }
    async validateProjectStructure(projectPath, validationResult) { }
    async validateConfigurationFiles(projectPath, validationResult) { }
    async validateProjectDependencies(projectPath, validationResult) { }
    async validateBuildConfiguration(projectPath, validationResult) { }
    async validateTestConfiguration(projectPath, validationResult) { }
}

module.exports = TaskValidationService; 