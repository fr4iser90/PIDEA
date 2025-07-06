const { Task, TaskTemplate, TaskSuggestion } = require('@/domain/entities');
const { TaskStatus, TaskPriority, TaskType, ProjectType } = require('@/domain/value-objects');
const { TaskRepository, TaskTemplateRepository, TaskSuggestionRepository } = require('@/domain/repositories');

/**
 * TaskGenerationService - Handles human/AI task creation and generation
 * Provides intelligent task creation with AI assistance and template-based generation
 */
class TaskGenerationService {
    constructor(
        taskRepository,
        taskTemplateRepository,
        taskSuggestionRepository,
        cursorIDEService,
        eventBus
    ) {
        this.taskRepository = taskRepository;
        this.taskTemplateRepository = taskTemplateRepository;
        this.taskSuggestionRepository = taskSuggestionRepository;
        this.cursorIDEService = cursorIDEService;
        this.eventBus = eventBus;
    }

    /**
     * Generate tasks for human/AI collaboration
     * @param {Object} params - Generation parameters
     * @param {string} params.projectPath - Project path
     * @param {string} params.context - Context for task generation
     * @param {string} params.mode - 'human', 'ai', or 'collaborative'
     * @param {Object} params.options - Additional options
     * @returns {Promise<Array<Task>>} Generated tasks
     */
    async generateTasks(params) {
        const { projectPath, context, mode = 'collaborative', options = {} } = params;

        try {
            // Validate inputs
            if (!projectPath || !context) {
                throw new Error('Project path and context are required');
            }

            // Analyze project structure
            const projectAnalysis = await this.analyzeProjectStructure(projectPath);
            
            // Generate tasks based on mode
            let tasks = [];
            
            switch (mode) {
                case 'human':
                    tasks = await this.generateHumanTasks(projectAnalysis, context, options);
                    break;
                case 'ai':
                    tasks = await this.generateAITasks(projectAnalysis, context, options);
                    break;
                case 'collaborative':
                default:
                    tasks = await this.generateCollaborativeTasks(projectAnalysis, context, options);
                    break;
            }

            // Save generated tasks
            const savedTasks = [];
            for (const task of tasks) {
                const savedTask = await this.taskRepository.save(task);
                savedTasks.push(savedTask);
                
                // Emit task created event
                this.eventBus.emit('task:created', {
                    taskId: savedTask.id,
                    projectPath,
                    mode,
                    context
                });
            }

            return savedTasks;

        } catch (error) {
            this.eventBus.emit('task:generation:error', {
                error: error.message,
                projectPath,
                context,
                mode
            });
            throw error;
        }
    }

    /**
     * Generate human-focused tasks
     * @param {Object} projectAnalysis - Project analysis results
     * @param {string} context - Task context
     * @param {Object} options - Generation options
     * @returns {Promise<Array<Task>>} Human tasks
     */
    async generateHumanTasks(projectAnalysis, context, options) {
        const tasks = [];
        
        // Generate code review tasks
        if (options.includeCodeReview) {
            const reviewTask = new Task({
                title: `Code Review: ${context}`,
                description: `Review code changes related to: ${context}`,
                type: TaskType.CODE_REVIEW,
                priority: TaskPriority.MEDIUM,
                status: TaskStatus.PENDING,
                projectPath: projectAnalysis.projectPath,
                estimatedTime: 30, // minutes
                tags: ['code-review', 'human'],
                metadata: {
                    context,
                    projectType: projectAnalysis.projectType,
                    filesToReview: projectAnalysis.modifiedFiles || []
                }
            });
            tasks.push(reviewTask);
        }

        // Generate testing tasks
        if (options.includeTesting) {
            const testTask = new Task({
                title: `Test Implementation: ${context}`,
                description: `Implement tests for: ${context}`,
                type: TaskType.TESTING,
                priority: TaskPriority.HIGH,
                status: TaskStatus.PENDING,
                projectPath: projectAnalysis.projectPath,
                estimatedTime: 45,
                tags: ['testing', 'human'],
                metadata: {
                    context,
                    projectType: projectAnalysis.projectType,
                    testFramework: projectAnalysis.testFramework
                }
            });
            tasks.push(testTask);
        }

        // Generate documentation tasks
        if (options.includeDocumentation) {
            const docTask = new Task({
                title: `Documentation: ${context}`,
                description: `Update documentation for: ${context}`,
                type: TaskType.DOCUMENTATION,
                priority: TaskPriority.MEDIUM,
                status: TaskStatus.PENDING,
                projectPath: projectAnalysis.projectPath,
                estimatedTime: 20,
                tags: ['documentation', 'human'],
                metadata: {
                    context,
                    projectType: projectAnalysis.projectType
                }
            });
            tasks.push(docTask);
        }

        return tasks;
    }

    /**
     * Generate AI-focused tasks
     * @param {Object} projectAnalysis - Project analysis results
     * @param {string} context - Task context
     * @param {Object} options - Generation options
     * @returns {Promise<Array<Task>>} AI tasks
     */
    async generateAITasks(projectAnalysis, context, options) {
        const tasks = [];

        // Generate AI analysis task
        const analysisTask = new Task({
            title: `AI Analysis: ${context}`,
            description: `Perform AI-powered analysis of: ${context}`,
            type: TaskType.AI_ANALYSIS,
            priority: TaskPriority.HIGH,
            status: TaskStatus.PENDING,
            projectPath: projectAnalysis.projectPath,
            estimatedTime: 15,
            tags: ['ai', 'analysis'],
            metadata: {
                context,
                projectType: projectAnalysis.projectType,
                aiModel: options.aiModel || 'gpt-4',
                analysisType: options.analysisType || 'comprehensive'
            }
        });
        tasks.push(analysisTask);

        // Generate AI optimization task
        if (options.includeOptimization) {
            const optimizationTask = new Task({
                title: `AI Optimization: ${context}`,
                description: `Optimize code using AI for: ${context}`,
                type: TaskType.AI_OPTIMIZATION,
                priority: TaskPriority.MEDIUM,
                status: TaskStatus.PENDING,
                projectPath: projectAnalysis.projectPath,
                estimatedTime: 25,
                tags: ['ai', 'optimization'],
                metadata: {
                    context,
                    projectType: projectAnalysis.projectType,
                    optimizationTarget: options.optimizationTarget || 'performance'
                }
            });
            tasks.push(optimizationTask);
        }

        // Generate AI refactoring task
        if (options.includeRefactoring) {
            const refactorTask = new Task({
                title: `AI Refactoring: ${context}`,
                description: `Refactor code using AI for: ${context}`,
                type: TaskType.AI_REFACTORING,
                priority: TaskPriority.MEDIUM,
                status: TaskStatus.PENDING,
                projectPath: projectAnalysis.projectPath,
                estimatedTime: 30,
                tags: ['ai', 'refactoring'],
                metadata: {
                    context,
                    projectType: projectAnalysis.projectType,
                    refactoringType: options.refactoringType || 'code-quality'
                }
            });
            tasks.push(refactorTask);
        }

        return tasks;
    }

    /**
     * Generate collaborative tasks (human + AI)
     * @param {Object} projectAnalysis - Project analysis results
     * @param {string} context - Task context
     * @param {Object} options - Generation options
     * @returns {Promise<Array<Task>>} Collaborative tasks
     */
    async generateCollaborativeTasks(projectAnalysis, context, options) {
        const tasks = [];

        // Generate AI-assisted development task
        const aiDevTask = new Task({
            title: `AI-Assisted Development: ${context}`,
            description: `Develop features with AI assistance for: ${context}`,
            type: TaskType.AI_ASSISTED_DEVELOPMENT,
            priority: TaskPriority.HIGH,
            status: TaskStatus.PENDING,
            projectPath: projectAnalysis.projectPath,
            estimatedTime: 60,
            tags: ['ai', 'development', 'collaborative'],
            metadata: {
                context,
                projectType: projectAnalysis.projectType,
                collaborationMode: 'ai-assisted',
                humanRole: 'reviewer',
                aiRole: 'developer'
            }
        });
        tasks.push(aiDevTask);

        // Generate pair programming task
        const pairTask = new Task({
            title: `AI Pair Programming: ${context}`,
            description: `Pair program with AI for: ${context}`,
            type: TaskType.AI_PAIR_PROGRAMMING,
            priority: TaskPriority.HIGH,
            status: TaskStatus.PENDING,
            projectPath: projectAnalysis.projectPath,
            estimatedTime: 90,
            tags: ['ai', 'pair-programming', 'collaborative'],
            metadata: {
                context,
                projectType: projectAnalysis.projectType,
                collaborationMode: 'pair-programming',
                humanRole: 'driver',
                aiRole: 'navigator'
            }
        });
        tasks.push(pairTask);

        // Generate code review with AI task
        const aiReviewTask = new Task({
            title: `AI-Enhanced Code Review: ${context}`,
            description: `Review code with AI assistance for: ${context}`,
            type: TaskType.AI_ENHANCED_REVIEW,
            priority: TaskPriority.MEDIUM,
            status: TaskStatus.PENDING,
            projectPath: projectAnalysis.projectPath,
            estimatedTime: 40,
            tags: ['ai', 'code-review', 'collaborative'],
            metadata: {
                context,
                projectType: projectAnalysis.projectType,
                collaborationMode: 'ai-enhanced-review',
                humanRole: 'final-approver',
                aiRole: 'initial-reviewer'
            }
        });
        tasks.push(aiReviewTask);

        return tasks;
    }

    /**
     * Create task from template
     * @param {string} templateId - Template ID
     * @param {Object} params - Task parameters
     * @returns {Promise<Task>} Created task
     */
    async createTaskFromTemplate(templateId, params) {
        try {
            // Get template
            const template = await this.taskTemplateRepository.findById(templateId);
            if (!template) {
                throw new Error(`Template not found: ${templateId}`);
            }

            // Validate template
            if (!template.isActive()) {
                throw new Error(`Template is not active: ${templateId}`);
            }

            // Create task from template
            const taskData = {
                title: this.interpolateTemplate(template.title, params),
                description: this.interpolateTemplate(template.description, params),
                type: template.type,
                priority: params.priority || template.defaultPriority,
                status: TaskStatus.PENDING,
                projectPath: params.projectPath,
                estimatedTime: template.estimatedTime,
                tags: [...template.tags, ...(params.tags || [])],
                metadata: {
                    ...template.metadata,
                    ...params.metadata,
                    templateId,
                    templateVersion: template.version
                }
            };

            const task = new Task(taskData);

            // Save task
            const savedTask = await this.taskRepository.save(task);

            // Emit event
            this.eventBus.emit('task:created:from-template', {
                taskId: savedTask.id,
                templateId,
                params
            });

            return savedTask;

        } catch (error) {
            this.eventBus.emit('task:template:error', {
                error: error.message,
                templateId,
                params
            });
            throw error;
        }
    }

    /**
     * Generate tasks from AI suggestions
     * @param {Array<TaskSuggestion>} suggestions - AI suggestions
     * @param {Object} options - Generation options
     * @returns {Promise<Array<Task>>} Generated tasks
     */
    async generateTasksFromSuggestions(suggestions, options = {}) {
        const tasks = [];

        for (const suggestion of suggestions) {
            if (!suggestion.isValid() || !suggestion.isApproved()) {
                continue;
            }

            const task = new Task({
                title: suggestion.title,
                description: suggestion.description,
                type: suggestion.taskType,
                priority: suggestion.priority,
                status: TaskStatus.PENDING,
                projectPath: suggestion.projectPath,
                estimatedTime: suggestion.estimatedTime,
                tags: [...suggestion.tags, 'ai-suggested'],
                metadata: {
                    ...suggestion.metadata,
                    suggestionId: suggestion.id,
                    aiConfidence: suggestion.confidence,
                    aiReasoning: suggestion.reasoning
                }
            });

            tasks.push(task);
        }

        // Save tasks
        const savedTasks = [];
        for (const task of tasks) {
            const savedTask = await this.taskRepository.save(task);
            savedTasks.push(savedTask);
        }

        return savedTasks;
    }

    /**
     * Analyze project structure for task generation
     * @param {string} projectPath - Project path
     * @returns {Promise<Object>} Project analysis
     */
    async analyzeProjectStructure(projectPath) {
        // This would integrate with existing project analysis capabilities
        // For now, return basic structure
        return {
            projectPath,
            projectType: ProjectType.FULL_STACK,
            testFramework: 'jest',
            modifiedFiles: [],
            dependencies: [],
            structure: {
                frontend: true,
                backend: true,
                database: true
            }
        };
    }

    /**
     * Interpolate template with parameters
     * @param {string} template - Template string
     * @param {Object} params - Parameters
     * @returns {string} Interpolated string
     */
    interpolateTemplate(template, params) {
        return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return params[key] || match;
        });
    }

    /**
     * Get task generation statistics
     * @param {string} projectPath - Project path
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @returns {Promise<Object>} Statistics
     */
    async getGenerationStatistics(projectPath, startDate, endDate) {
        const tasks = await this.taskRepository.findByProjectPath(projectPath);
        
        const filteredTasks = tasks.filter(task => {
            const taskDate = new Date(task.createdAt);
            return taskDate >= startDate && taskDate <= endDate;
        });

        const stats = {
            total: filteredTasks.length,
            byType: {},
            byPriority: {},
            byStatus: {},
            averageEstimatedTime: 0,
            totalEstimatedTime: 0
        };

        let totalTime = 0;

        for (const task of filteredTasks) {
            // Count by type
            stats.byType[task.type.value] = (stats.byType[task.type.value] || 0) + 1;
            
            // Count by priority
            stats.byPriority[task.priority.value] = (stats.byPriority[task.priority.value] || 0) + 1;
            
            // Count by status
            stats.byStatus[task.status.value] = (stats.byStatus[task.status.value] || 0) + 1;
            
            // Calculate time
            totalTime += task.estimatedTime || 0;
        }

        stats.totalEstimatedTime = totalTime;
        stats.averageEstimatedTime = filteredTasks.length > 0 ? totalTime / filteredTasks.length : 0;

        return stats;
    }
}

module.exports = TaskGenerationService; 