const { Task, TaskExecution } = require('../entities');
const { TaskStatus, TaskPriority, TaskType } = require('../value-objects');
const { TaskRepository, TaskExecutionRepository } = require('../repositories');

/**
 * TaskSchedulingService - Handles task scheduling and prioritization
 * Provides intelligent scheduling algorithms and priority management
 */
class TaskSchedulingService {
    constructor(
        taskRepository,
        taskExecutionRepository,
        cursorIDEService,
        eventBus
    ) {
        this.taskRepository = taskRepository;
        this.taskExecutionRepository = taskExecutionRepository;
        this.cursorIDEService = cursorIDEService;
        this.eventBus = eventBus;
    }

    /**
     * Schedule task with intelligent algorithms
     * @param {Object} params - Scheduling parameters
     * @param {string} params.taskId - Task ID to schedule
     * @param {Object} params.options - Scheduling options
     * @returns {Promise<Object>} Scheduling result
     */
    async scheduleTask(params) {
        const { taskId, options = {} } = params;

        try {
            // Validate inputs
            if (!taskId) {
                throw new Error('Task ID is required');
            }

            // Get task
            const task = await this.taskRepository.findById(taskId);
            if (!task) {
                throw new Error(`Task not found: ${taskId}`);
            }

            // Analyze scheduling context
            const schedulingContext = await this.analyzeSchedulingContext(task, options);

            // Generate optimal schedule
            const schedule = await this.generateOptimalSchedule(task, schedulingContext, options);

            // Apply schedule
            await this.applySchedule(task, schedule);

            // Emit scheduling event
            this.eventBus.emit('task:scheduled', {
                taskId,
                schedule,
                options
            });

            return {
                taskId,
                schedule,
                context: schedulingContext,
                recommendations: this.generateSchedulingRecommendations(schedule, schedulingContext)
            };

        } catch (error) {
            this.eventBus.emit('task:scheduling:error', {
                error: error.message,
                taskId,
                options
            });
            throw error;
        }
    }

    /**
     * Optimize task priorities
     * @param {Object} params - Optimization parameters
     * @param {string} params.projectPath - Project path
     * @param {Object} params.options - Optimization options
     * @returns {Promise<Object>} Optimization result
     */
    async optimizeTaskPriorities(params) {
        const { projectPath, options = {} } = params;

        try {
            // Get all tasks for project
            const tasks = await this.taskRepository.findByProjectPath(projectPath);
            const pendingTasks = tasks.filter(task => task.status.value === TaskStatus.PENDING);

            // Analyze priority patterns
            const priorityAnalysis = this.analyzePriorityPatterns(pendingTasks);

            // Generate optimal priorities
            const optimalPriorities = await this.generateOptimalPriorities(pendingTasks, priorityAnalysis, options);

            // Apply priority changes
            const appliedChanges = await this.applyPriorityChanges(optimalPriorities);

            // Emit optimization event
            this.eventBus.emit('task:priorities:optimized', {
                projectPath,
                changes: appliedChanges,
                options
            });

            return {
                projectPath,
                changes: appliedChanges,
                analysis: priorityAnalysis,
                recommendations: this.generatePriorityRecommendations(optimalPriorities)
            };

        } catch (error) {
            this.eventBus.emit('task:priority:optimization:error', {
                error: error.message,
                projectPath,
                options
            });
            throw error;
        }
    }

    /**
     * Generate project schedule
     * @param {Object} params - Schedule generation parameters
     * @param {string} params.projectPath - Project path
     * @param {Object} params.options - Schedule options
     * @returns {Promise<Object>} Project schedule
     */
    async generateProjectSchedule(params) {
        const { projectPath, options = {} } = params;

        try {
            // Get all tasks for project
            const tasks = await this.taskRepository.findByProjectPath(projectPath);
            const schedulableTasks = tasks.filter(task => 
                task.status.value === TaskStatus.PENDING || task.status.value === TaskStatus.SCHEDULED
            );

            // Analyze project timeline
            const timelineAnalysis = await this.analyzeProjectTimeline(schedulableTasks, options);

            // Generate project schedule
            const projectSchedule = await this.generateSchedule(schedulableTasks, timelineAnalysis, options);

            // Calculate schedule metrics
            const scheduleMetrics = this.calculateScheduleMetrics(projectSchedule);

            // Emit schedule generation event
            this.eventBus.emit('project:schedule:generated', {
                projectPath,
                schedule: projectSchedule,
                metrics: scheduleMetrics,
                options
            });

            return {
                projectPath,
                schedule: projectSchedule,
                metrics: scheduleMetrics,
                analysis: timelineAnalysis,
                recommendations: this.generateProjectScheduleRecommendations(projectSchedule, scheduleMetrics)
            };

        } catch (error) {
            this.eventBus.emit('project:schedule:error', {
                error: error.message,
                projectPath,
                options
            });
            throw error;
        }
    }

    /**
     * Reschedule tasks based on changes
     * @param {Object} params - Rescheduling parameters
     * @param {string} params.projectPath - Project path
     * @param {Object} params.changes - Changes that require rescheduling
     * @param {Object} params.options - Rescheduling options
     * @returns {Promise<Object>} Rescheduling result
     */
    async rescheduleTasks(params) {
        const { projectPath, changes, options = {} } = params;

        try {
            // Analyze impact of changes
            const impactAnalysis = await this.analyzeChangeImpact(projectPath, changes);

            // Identify affected tasks
            const affectedTasks = await this.identifyAffectedTasks(projectPath, changes);

            // Generate new schedule for affected tasks
            const newSchedule = await this.generateReschedule(affectedTasks, impactAnalysis, options);

            // Apply reschedule
            const appliedChanges = await this.applyReschedule(newSchedule);

            // Emit rescheduling event
            this.eventBus.emit('tasks:rescheduled', {
                projectPath,
                changes,
                newSchedule,
                appliedChanges,
                options
            });

            return {
                projectPath,
                changes,
                newSchedule,
                appliedChanges,
                impact: impactAnalysis,
                recommendations: this.generateReschedulingRecommendations(newSchedule, impactAnalysis)
            };

        } catch (error) {
            this.eventBus.emit('task:rescheduling:error', {
                error: error.message,
                projectPath,
                changes,
                options
            });
            throw error;
        }
    }

    /**
     * Analyze scheduling context
     * @param {Task} task - Task object
     * @param {Object} options - Scheduling options
     * @returns {Promise<Object>} Scheduling context
     */
    async analyzeSchedulingContext(task, options) {
        // Get project tasks
        const projectTasks = await this.taskRepository.findByProjectPath(task.projectPath);
        
        // Get task dependencies
        const dependencies = await this.getTaskDependencies(task);
        
        // Get resource availability
        const resourceAvailability = await this.getResourceAvailability(options);
        
        // Get historical execution data
        const executionHistory = await this.getExecutionHistory(task);

        return {
            projectTasks,
            dependencies,
            resourceAvailability,
            executionHistory,
            currentTime: new Date(),
            options
        };
    }

    /**
     * Generate optimal schedule
     * @param {Task} task - Task object
     * @param {Object} context - Scheduling context
     * @param {Object} options - Scheduling options
     * @returns {Promise<Object>} Optimal schedule
     */
    async generateOptimalSchedule(task, context, options) {
        // Calculate earliest start time
        const earliestStart = this.calculateEarliestStartTime(task, context);
        
        // Calculate latest start time
        const latestStart = this.calculateLatestStartTime(task, context);
        
        // Find optimal time slot
        const optimalSlot = await this.findOptimalTimeSlot(task, context, earliestStart, latestStart);
        
        // Calculate resource allocation
        const resourceAllocation = this.calculateResourceAllocation(task, context, optimalSlot);
        
        // Generate schedule
        const schedule = {
            scheduledAt: optimalSlot.startTime,
            estimatedDuration: task.estimatedTime || 60,
            resourceAllocation,
            dependencies: context.dependencies,
            constraints: this.identifyConstraints(task, context),
            confidence: this.calculateScheduleConfidence(task, context, optimalSlot)
        };

        return schedule;
    }

    /**
     * Apply schedule to task
     * @param {Task} task - Task object
     * @param {Object} schedule - Schedule
     * @returns {Promise<void>}
     */
    async applySchedule(task, schedule) {
        // Update task with schedule
        task.schedule(schedule.scheduledAt);
        task.setResourceAllocation(schedule.resourceAllocation);
        
        // Save task
        await this.taskRepository.save(task);
    }

    /**
     * Analyze priority patterns
     * @param {Array<Task>} tasks - Tasks to analyze
     * @returns {Object} Priority analysis
     */
    analyzePriorityPatterns(tasks) {
        const priorityCounts = {};
        const typePriorityMap = {};
        const deadlinePriorityMap = {};

        for (const task of tasks) {
            // Count priorities
            const priority = task.priority.value;
            priorityCounts[priority] = (priorityCounts[priority] || 0) + 1;

            // Map task types to priorities
            const type = task.type.value;
            if (!typePriorityMap[type]) {
                typePriorityMap[type] = [];
            }
            typePriorityMap[type].push(priority);

            // Map deadlines to priorities
            if (task.deadline) {
                const daysUntilDeadline = Math.ceil((task.deadline - new Date()) / (1000 * 60 * 60 * 24));
                if (!deadlinePriorityMap[daysUntilDeadline]) {
                    deadlinePriorityMap[daysUntilDeadline] = [];
                }
                deadlinePriorityMap[daysUntilDeadline].push(priority);
            }
        }

        return {
            priorityCounts,
            typePriorityMap,
            deadlinePriorityMap,
            totalTasks: tasks.length
        };
    }

    /**
     * Generate optimal priorities
     * @param {Array<Task>} tasks - Tasks
     * @param {Object} analysis - Priority analysis
     * @param {Object} options - Options
     * @returns {Promise<Array<Object>>} Optimal priorities
     */
    async generateOptimalPriorities(tasks, analysis, options) {
        const optimalPriorities = [];

        for (const task of tasks) {
            // Calculate priority score
            const priorityScore = this.calculatePriorityScore(task, analysis, options);
            
            // Determine optimal priority
            const optimalPriority = this.determineOptimalPriority(priorityScore, task, analysis);
            
            // Check if priority should be changed
            if (optimalPriority !== task.priority.value) {
                optimalPriorities.push({
                    taskId: task.id,
                    currentPriority: task.priority.value,
                    optimalPriority,
                    score: priorityScore,
                    reason: this.getPriorityChangeReason(task, optimalPriority, analysis)
                });
            }
        }

        // Sort by priority score (highest first)
        optimalPriorities.sort((a, b) => b.score - a.score);

        return optimalPriorities;
    }

    /**
     * Apply priority changes
     * @param {Array<Object>} priorityChanges - Priority changes
     * @returns {Promise<Array<Object>>} Applied changes
     */
    async applyPriorityChanges(priorityChanges) {
        const appliedChanges = [];

        for (const change of priorityChanges) {
            try {
                const task = await this.taskRepository.findById(change.taskId);
                if (task) {
                    task.setPriority(change.optimalPriority);
                    await this.taskRepository.save(task);
                    
                    appliedChanges.push({
                        ...change,
                        applied: true,
                        appliedAt: new Date()
                    });
                }
            } catch (error) {
                appliedChanges.push({
                    ...change,
                    applied: false,
                    error: error.message
                });
            }
        }

        return appliedChanges;
    }

    /**
     * Analyze project timeline
     * @param {Array<Task>} tasks - Tasks
     * @param {Object} options - Options
     * @returns {Promise<Object>} Timeline analysis
     */
    async analyzeProjectTimeline(tasks, options) {
        // Calculate total estimated time
        const totalEstimatedTime = tasks.reduce((sum, task) => sum + (task.estimatedTime || 60), 0);
        
        // Calculate critical path
        const criticalPath = this.calculateCriticalPath(tasks);
        
        // Calculate resource requirements
        const resourceRequirements = this.calculateResourceRequirements(tasks);
        
        // Calculate timeline constraints
        const timelineConstraints = this.identifyTimelineConstraints(tasks, options);

        return {
            totalEstimatedTime,
            criticalPath,
            resourceRequirements,
            timelineConstraints,
            estimatedCompletion: this.calculateEstimatedCompletion(tasks, criticalPath)
        };
    }

    /**
     * Generate schedule
     * @param {Array<Task>} tasks - Tasks
     * @param {Object} analysis - Timeline analysis
     * @param {Object} options - Options
     * @returns {Promise<Object>} Project schedule
     */
    async generateSchedule(tasks, analysis, options) {
        // Sort tasks by priority and dependencies
        const sortedTasks = this.sortTasksForScheduling(tasks);
        
        // Generate time slots
        const timeSlots = this.generateTimeSlots(sortedTasks, analysis, options);
        
        // Allocate tasks to time slots
        const allocatedTasks = this.allocateTasksToSlots(sortedTasks, timeSlots, analysis);
        
        // Optimize schedule
        const optimizedSchedule = this.optimizeSchedule(allocatedTasks, analysis, options);

        return {
            tasks: optimizedSchedule,
            timeline: this.generateTimeline(optimizedSchedule),
            resourceAllocation: this.calculateScheduleResourceAllocation(optimizedSchedule),
            metrics: this.calculateScheduleMetrics(optimizedSchedule)
        };
    }

    /**
     * Calculate schedule metrics
     * @param {Object} schedule - Schedule
     * @returns {Object} Schedule metrics
     */
    calculateScheduleMetrics(schedule) {
        const tasks = schedule.tasks || schedule;
        
        const totalTasks = tasks.length;
        const totalDuration = tasks.reduce((sum, task) => sum + (task.estimatedTime || 0), 0);
        const averagePriority = tasks.reduce((sum, task) => sum + task.priority.value, 0) / totalTasks;
        
        const priorityDistribution = {};
        const typeDistribution = {};
        
        for (const task of tasks) {
            priorityDistribution[task.priority.value] = (priorityDistribution[task.priority.value] || 0) + 1;
            typeDistribution[task.type.value] = (typeDistribution[task.type.value] || 0) + 1;
        }

        return {
            totalTasks,
            totalDuration,
            averagePriority,
            priorityDistribution,
            typeDistribution,
            efficiency: this.calculateScheduleEfficiency(tasks),
            utilization: this.calculateResourceUtilization(tasks)
        };
    }

    /**
     * Analyze change impact
     * @param {string} projectPath - Project path
     * @param {Object} changes - Changes
     * @returns {Promise<Object>} Impact analysis
     */
    async analyzeChangeImpact(projectPath, changes) {
        const impact = {
            affectedTasks: [],
            scheduleImpact: 'low',
            resourceImpact: 'low',
            timelineImpact: 'low',
            recommendations: []
        };

        // Analyze each change
        for (const change of Object.keys(changes)) {
            const changeImpact = await this.analyzeSingleChange(projectPath, change, changes[change]);
            impact.affectedTasks.push(...changeImpact.affectedTasks);
            
            // Aggregate impact levels
            impact.scheduleImpact = this.aggregateImpactLevel(impact.scheduleImpact, changeImpact.scheduleImpact);
            impact.resourceImpact = this.aggregateImpactLevel(impact.resourceImpact, changeImpact.resourceImpact);
            impact.timelineImpact = this.aggregateImpactLevel(impact.timelineImpact, changeImpact.timelineImpact);
            
            impact.recommendations.push(...changeImpact.recommendations);
        }

        return impact;
    }

    /**
     * Identify affected tasks
     * @param {string} projectPath - Project path
     * @param {Object} changes - Changes
     * @returns {Promise<Array<Task>>} Affected tasks
     */
    async identifyAffectedTasks(projectPath, changes) {
        const allTasks = await this.taskRepository.findByProjectPath(projectPath);
        const affectedTasks = [];

        for (const task of allTasks) {
            if (this.isTaskAffected(task, changes)) {
                affectedTasks.push(task);
            }
        }

        return affectedTasks;
    }

    /**
     * Generate reschedule
     * @param {Array<Task>} affectedTasks - Affected tasks
     * @param {Object} impactAnalysis - Impact analysis
     * @param {Object} options - Options
     * @returns {Promise<Object>} New schedule
     */
    async generateReschedule(affectedTasks, impactAnalysis, options) {
        // Recalculate dependencies
        const updatedDependencies = await this.recalculateDependencies(affectedTasks);
        
        // Generate new schedule for affected tasks
        const newSchedule = await this.generateSchedule(affectedTasks, impactAnalysis, options);
        
        // Integrate with existing schedule
        const integratedSchedule = this.integrateWithExistingSchedule(newSchedule, options);

        return integratedSchedule;
    }

    /**
     * Apply reschedule
     * @param {Object} newSchedule - New schedule
     * @returns {Promise<Array<Object>>} Applied changes
     */
    async applyReschedule(newSchedule) {
        const appliedChanges = [];

        for (const taskSchedule of newSchedule.tasks) {
            try {
                const task = await this.taskRepository.findById(taskSchedule.taskId);
                if (task) {
                    // Update task schedule
                    task.schedule(taskSchedule.scheduledAt);
                    task.setResourceAllocation(taskSchedule.resourceAllocation);
                    
                    await this.taskRepository.save(task);
                    
                    appliedChanges.push({
                        taskId: task.id,
                        type: 'rescheduled',
                        oldSchedule: taskSchedule.oldSchedule,
                        newSchedule: {
                            scheduledAt: taskSchedule.scheduledAt,
                            resourceAllocation: taskSchedule.resourceAllocation
                        },
                        applied: true
                    });
                }
            } catch (error) {
                appliedChanges.push({
                    taskId: taskSchedule.taskId,
                    type: 'rescheduled',
                    applied: false,
                    error: error.message
                });
            }
        }

        return appliedChanges;
    }

    // Helper methods (placeholder implementations)

    async getTaskDependencies(task) { return []; }
    async getResourceAvailability(options) { return { cpu: 100, memory: 8192, disk: 10000 }; }
    async getExecutionHistory(task) { return []; }
    calculateEarliestStartTime(task, context) { return new Date(); }
    calculateLatestStartTime(task, context) { return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); }
    async findOptimalTimeSlot(task, context, earliestStart, latestStart) { return { startTime: new Date() }; }
    calculateResourceAllocation(task, context, timeSlot) { return { cpu: 50, memory: 512 }; }
    identifyConstraints(task, context) { return []; }
    calculateScheduleConfidence(task, context, timeSlot) { return 0.8; }
    calculatePriorityScore(task, analysis, options) { return 0.5; }
    determineOptimalPriority(score, task, analysis) { return TaskPriority.MEDIUM; }
    getPriorityChangeReason(task, newPriority, analysis) { return 'Optimization'; }
    calculateCriticalPath(tasks) { return []; }
    calculateResourceRequirements(tasks) { return {}; }
    identifyTimelineConstraints(tasks, options) { return []; }
    calculateEstimatedCompletion(tasks, criticalPath) { return new Date(); }
    sortTasksForScheduling(tasks) { return tasks; }
    generateTimeSlots(tasks, analysis, options) { return []; }
    allocateTasksToSlots(tasks, slots, analysis) { return []; }
    optimizeSchedule(allocatedTasks, analysis, options) { return allocatedTasks; }
    generateTimeline(schedule) { return {}; }
    calculateScheduleResourceAllocation(schedule) { return {}; }
    calculateScheduleEfficiency(tasks) { return 0.8; }
    calculateResourceUtilization(tasks) { return 0.7; }
    async analyzeSingleChange(projectPath, change, value) { return { affectedTasks: [], scheduleImpact: 'low', resourceImpact: 'low', timelineImpact: 'low', recommendations: [] }; }
    aggregateImpactLevel(current, newLevel) { return newLevel; }
    isTaskAffected(task, changes) { return false; }
    async recalculateDependencies(affectedTasks) { return []; }
    integrateWithExistingSchedule(newSchedule, options) { return newSchedule; }

    // Recommendation generation methods
    generateSchedulingRecommendations(schedule, context) { return ['Consider adjusting resource allocation', 'Review dependency constraints']; }
    generatePriorityRecommendations(optimalPriorities) { return ['Monitor priority changes', 'Review impact on dependent tasks']; }
    generateProjectScheduleRecommendations(schedule, metrics) { return ['Optimize resource utilization', 'Review timeline constraints']; }
    generateReschedulingRecommendations(newSchedule, impactAnalysis) { return ['Monitor schedule changes', 'Review impact on project timeline']; }
}

module.exports = TaskSchedulingService; 