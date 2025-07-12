const { Task, TaskExecution } = require('@/domain/entities');
const { TaskStatus, TaskPriority, TaskType } = require('@/domain/value-objects');
const { TaskRepository, TaskExecutionRepository } = require('@/domain/repositories');

/**
 * TaskOptimizationService - Provides AI-powered optimization algorithms
 * Optimizes task performance, scheduling, and resource allocation using AI
 */
class TaskOptimizationService {
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
     * Optimize task performance
     * @param {Object} params - Optimization parameters
     * @param {string} params.taskId - Task ID to optimize
     * @param {string} params.optimizationType - Type of optimization
     * @param {Object} params.options - Optimization options
     * @returns {Promise<Object>} Optimization result
     */
    async optimizeTask(params) {
        const { taskId, optimizationType = 'performance', options = {} } = params;

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

            // Get task execution history
            const executions = await this.taskExecutionRepository.findByTaskId(taskId);

            // Perform optimization based on type
            let optimizationResult;
            
            switch (optimizationType) {
                case 'performance':
                    optimizationResult = await this.optimizeTaskPerformance(task, executions, options);
                    break;
                case 'scheduling':
                    optimizationResult = await this.optimizeTaskScheduling(task, executions, options);
                    break;
                case 'resource':
                    optimizationResult = await this.optimizeResourceAllocation(task, executions, options);
                    break;
                case 'priority':
                    optimizationResult = await this.optimizeTaskPriority(task, executions, options);
                    break;
                case 'dependencies':
                    optimizationResult = await this.optimizeTaskDependencies(task, executions, options);
                    break;
                default:
                    optimizationResult = await this.optimizeTask(task, executions, optimizationType, options);
                    break;
            }

            // Apply optimizations if auto-apply is enabled
            if (options.autoApply) {
                await this.applyOptimizations(task, optimizationResult);
            }

            // Emit optimization event
            this.eventBus.emit('task:optimized', {
                taskId,
                optimizationType,
                result: optimizationResult,
                autoApplied: options.autoApply || false
            });

            return optimizationResult;

        } catch (error) {
            this.eventBus.emit('task:optimization:error', {
                error: error.message,
                taskId,
                optimizationType,
                options
            });
            throw error;
        }
    }

    /**
     * Optimize task performance
     * @param {Task} task - Task object
     * @param {Array<TaskExecution>} executions - Task executions
     * @param {Object} options - Performance options
     * @returns {Promise<Object>} Performance optimization result
     */
    async optimizeTaskPerformance(task, executions, options) {
        // Analyze execution patterns
        const performanceAnalysis = this.analyzeExecutionPerformance(executions);
        
        // Generate AI optimization suggestions
        const aiPrompt = this.buildPerformanceOptimizationPrompt(task, performanceAnalysis, options);
        const aiResponse = await this.cursorIDEService.postToCursor(aiPrompt);
        
        const optimizations = this.parseAIOptimizationResponse(aiResponse);
        
        return {
            type: 'performance',
            analysis: performanceAnalysis,
            optimizations,
            estimatedImprovement: this.calculatePerformanceImprovement(performanceAnalysis, optimizations),
            confidence: this.calculateOptimizationConfidence(performanceAnalysis),
            recommendations: this.generatePerformanceRecommendations(performanceAnalysis, optimizations)
        };
    }

    /**
     * Optimize task scheduling
     * @param {Task} task - Task object
     * @param {Array<TaskExecution>} executions - Task executions
     * @param {Object} options - Scheduling options
     * @returns {Promise<Object>} Scheduling optimization result
     */
    async optimizeTaskScheduling(task, executions, options) {
        // Analyze scheduling patterns
        const schedulingAnalysis = this.analyzeSchedulingPatterns(executions);
        
        // Generate optimal schedule
        const optimalSchedule = this.generateOptimalSchedule(task, schedulingAnalysis, options);
        
        // Calculate schedule efficiency
        const efficiencyGains = this.calculateScheduleEfficiency(schedulingAnalysis, optimalSchedule);
        
        return {
            type: 'scheduling',
            analysis: schedulingAnalysis,
            optimalSchedule,
            efficiencyGains,
            recommendations: this.generateSchedulingRecommendations(schedulingAnalysis, optimalSchedule)
        };
    }

    /**
     * Optimize resource allocation
     * @param {Task} task - Task object
     * @param {Array<TaskExecution>} executions - Task executions
     * @param {Object} options - Resource options
     * @returns {Promise<Object>} Resource optimization result
     */
    async optimizeResourceAllocation(task, executions, options) {
        // Analyze resource usage patterns
        const resourceAnalysis = this.analyzeResourceUsage(executions);
        
        // Generate optimal resource allocation
        const optimalAllocation = this.generateOptimalResourceAllocation(task, resourceAnalysis, options);
        
        // Calculate resource efficiency
        const resourceEfficiency = this.calculateResourceEfficiency(resourceAnalysis, optimalAllocation);
        
        return {
            type: 'resource',
            analysis: resourceAnalysis,
            optimalAllocation,
            resourceEfficiency,
            recommendations: this.generateResourceRecommendations(resourceAnalysis, optimalAllocation)
        };
    }

    /**
     * Optimize task priority
     * @param {Task} task - Task object
     * @param {Array<TaskExecution>} executions - Task executions
     * @param {Object} options - Priority options
     * @returns {Promise<Object>} Priority optimization result
     */
    async optimizeTaskPriority(task, executions, options) {
        // Analyze priority patterns
        const priorityAnalysis = this.analyzePriorityPatterns(executions);
        
        // Generate optimal priority
        const optimalPriority = this.calculateOptimalPriority(task, priorityAnalysis, options);
        
        // Calculate priority impact
        const priorityImpact = this.calculatePriorityImpact(priorityAnalysis, optimalPriority);
        
        return {
            type: 'priority',
            analysis: priorityAnalysis,
            optimalPriority,
            priorityImpact,
            recommendations: this.generatePriorityRecommendations(priorityAnalysis, optimalPriority)
        };
    }

    /**
     * Optimize task dependencies
     * @param {Task} task - Task object
     * @param {Array<TaskExecution>} executions - Task executions
     * @param {Object} options - Dependency options
     * @returns {Promise<Object>} Dependency optimization result
     */
    async optimizeTaskDependencies(task, executions, options) {
        // Analyze dependency patterns
        const dependencyAnalysis = this.analyzeDependencyPatterns(executions);
        
        // Generate optimal dependency structure
        const optimalDependencies = this.generateOptimalDependencies(task, dependencyAnalysis, options);
        
        // Calculate dependency efficiency
        const dependencyEfficiency = this.calculateDependencyEfficiency(dependencyAnalysis, optimalDependencies);
        
        return {
            type: 'dependencies',
            analysis: dependencyAnalysis,
            optimalDependencies,
            dependencyEfficiency,
            recommendations: this.generateDependencyRecommendations(dependencyAnalysis, optimalDependencies)
        };
    }

    /**
     *  task optimization
     * @param {Task} task - Task object
     * @param {Array<TaskExecution>} executions - Task executions
     * @param {string} optimizationType - Optimization type
     * @param {Object} options - Optimization options
     * @returns {Promise<Object>}  optimization result
     */
    async optimizeTask(task, executions, optimizationType, options) {
        // Generate AI optimization suggestions
        const aiPrompt = this.buildOptimizationPrompt(task, executions, optimizationType, options);
        const aiResponse = await this.cursorIDEService.postToCursor(aiPrompt);
        
        const optimizations = this.parseAIOptimizationResponse(aiResponse);
        
        return {
            type: optimizationType,
            optimizations,
            recommendations: this.generateRecommendations(optimizations),
            confidence: this.calculateConfidence(optimizations)
        };
    }

    /**
     * Apply optimizations to task
     * @param {Task} task - Task object
     * @param {Object} optimizationResult - Optimization result
     * @returns {Promise<void>}
     */
    async applyOptimizations(task, optimizationResult) {
        const updates = {};

        // Apply performance optimizations
        if (optimizationResult.type === 'performance' && optimizationResult.optimizations) {
            if (optimizationResult.optimizations.estimatedTime) {
                updates.estimatedTime = optimizationResult.optimizations.estimatedTime;
            }
            if (optimizationResult.optimizations.priority) {
                updates.priority = optimizationResult.optimizations.priority;
            }
        }

        // Apply scheduling optimizations
        if (optimizationResult.type === 'scheduling' && optimizationResult.optimalSchedule) {
            updates.scheduledAt = optimizationResult.optimalSchedule.scheduledAt;
            updates.deadline = optimizationResult.optimalSchedule.deadline;
        }

        // Apply priority optimizations
        if (optimizationResult.type === 'priority' && optimizationResult.optimalPriority) {
            updates.priority = optimizationResult.optimalPriority;
        }

        // Apply dependency optimizations
        if (optimizationResult.type === 'dependencies' && optimizationResult.optimalDependencies) {
            updates.dependencies = optimizationResult.optimalDependencies;
        }

        // Update task with optimizations
        if (Object.keys(updates).length > 0) {
            Object.assign(task, updates);
            await this.taskRepository.save(task);
        }
    }

    /**
     * Analyze execution performance
     * @param {Array<TaskExecution>} executions - Task executions
     * @returns {Object} Performance analysis
     */
    analyzeExecutionPerformance(executions) {
        if (!executions || executions.length === 0) {
            return {
                averageExecutionTime: 0,
                executionTimeVariance: 0,
                successRate: 0,
                failurePatterns: [],
                performanceTrend: 'stable'
            };
        }

        const executionTimes = executions
            .filter(exec => exec.status === 'completed')
            .map(exec => exec.executionTime);

        const averageTime = executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length;
        const variance = this.calculateVariance(executionTimes, averageTime);
        const successRate = executions.filter(exec => exec.status === 'completed').length / executions.length;

        return {
            averageExecutionTime: averageTime,
            executionTimeVariance: variance,
            successRate,
            failurePatterns: this.analyzeFailurePatterns(executions),
            performanceTrend: this.analyzePerformanceTrend(executions)
        };
    }

    /**
     * Analyze scheduling patterns
     * @param {Array<TaskExecution>} executions - Task executions
     * @returns {Object} Scheduling analysis
     */
    analyzeSchedulingPatterns(executions) {
        const scheduledExecutions = executions.filter(exec => exec.scheduledAt);
        
        if (scheduledExecutions.length === 0) {
            return {
                averageDelay: 0,
                schedulingEfficiency: 0,
                optimalTimeSlots: [],
                schedulingPattern: 'none'
            };
        }

        const delays = scheduledExecutions.map(exec => {
            const scheduled = new Date(exec.scheduledAt);
            const actual = new Date(exec.startedAt);
            return actual.getTime() - scheduled.getTime();
        });

        const averageDelay = delays.reduce((sum, delay) => sum + delay, 0) / delays.length;

        return {
            averageDelay,
            schedulingEfficiency: this.calculateSchedulingEfficiency(delays),
            optimalTimeSlots: this.findOptimalTimeSlots(scheduledExecutions),
            schedulingPattern: this.analyzeSchedulingPattern(scheduledExecutions)
        };
    }

    /**
     * Analyze resource usage
     * @param {Array<TaskExecution>} executions - Task executions
     * @returns {Object} Resource analysis
     */
    analyzeResourceUsage(executions) {
        const resourceUsage = executions
            .filter(exec => exec.resourceUsage)
            .map(exec => exec.resourceUsage);

        if (resourceUsage.length === 0) {
            return {
                averageMemoryUsage: 0,
                averageCpuUsage: 0,
                peakUsage: {},
                resourceEfficiency: 0
            };
        }

        const memoryUsage = resourceUsage.map(usage => usage.memory || 0);
        const cpuUsage = resourceUsage.map(usage => usage.cpu || 0);

        return {
            averageMemoryUsage: memoryUsage.reduce((sum, mem) => sum + mem, 0) / memoryUsage.length,
            averageCpuUsage: cpuUsage.reduce((sum, cpu) => sum + cpu, 0) / cpuUsage.length,
            peakUsage: this.findPeakUsage(resourceUsage),
            resourceEfficiency: this.calculateResourceEfficiencyScore(resourceUsage)
        };
    }

    /**
     * Build performance optimization prompt
     * @param {Task} task - Task object
     * @param {Object} performanceAnalysis - Performance analysis
     * @param {Object} options - Optimization options
     * @returns {string} AI prompt
     */
    buildPerformanceOptimizationPrompt(task, performanceAnalysis, options) {
        return `
Analyze and optimize the performance of this task:

Task: ${task.title}
Description: ${task.description}
Type: ${task.type.value}
Current Priority: ${task.priority.value}

Performance Analysis:
- Average Execution Time: ${performanceAnalysis.averageExecutionTime}ms
- Success Rate: ${(performanceAnalysis.successRate * 100).toFixed(1)}%
- Performance Trend: ${performanceAnalysis.performanceTrend}

Optimization Goals:
- Reduce execution time
- Improve success rate
- Optimize resource usage
- Enhance scheduling efficiency

Provide specific optimization recommendations in JSON format:
{
  "estimatedTime": "new estimated time in minutes",
  "priority": "optimized priority level",
  "resourceAllocation": "optimal resource allocation",
  "scheduling": "optimal scheduling strategy",
  "recommendations": ["list of specific recommendations"]
}
        `.trim();
    }

    /**
     * Parse AI optimization response
     * @param {string} aiResponse - AI response
     * @returns {Object} Parsed optimizations
     */
    parseAIOptimizationResponse(aiResponse) {
        try {
            // Extract JSON from AI response
            const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            return {};
        } catch (error) {
            return {};
        }
    }

    /**
     * Calculate performance improvement
     * @param {Object} analysis - Performance analysis
     * @param {Object} optimizations - Optimizations
     * @returns {number} Improvement percentage
     */
    calculatePerformanceImprovement(analysis, optimizations) {
        // Calculate improvement based on optimizations
        let improvement = 0;
        
        if (optimizations.estimatedTime && analysis.averageExecutionTime) {
            const timeImprovement = (analysis.averageExecutionTime - optimizations.estimatedTime) / analysis.averageExecutionTime;
            improvement += timeImprovement * 0.6; // 60% weight for time
        }
        
        if (optimizations.priority) {
            improvement += 0.2; // 20% weight for priority optimization
        }
        
        if (optimizations.resourceAllocation) {
            improvement += 0.2; // 20% weight for resource optimization
        }
        
        return Math.max(0, Math.min(1, improvement));
    }

    /**
     * Calculate optimization confidence
     * @param {Object} analysis - Performance analysis
     * @returns {number} Confidence score
     */
    calculateOptimizationConfidence(analysis) {
        // Calculate confidence based on data quality
        let confidence = 0.5; // Base confidence
        
        if (analysis.averageExecutionTime > 0) {
            confidence += 0.2;
        }
        
        if (analysis.successRate > 0.8) {
            confidence += 0.2;
        }
        
        if (analysis.executionTimeVariance < analysis.averageExecutionTime * 0.3) {
            confidence += 0.1;
        }
        
        return Math.min(1, confidence);
    }

    /**
     * Generate performance recommendations
     * @param {Object} analysis - Performance analysis
     * @param {Object} optimizations - Optimizations
     * @returns {Array<string>} Recommendations
     */
    generatePerformanceRecommendations(analysis, optimizations) {
        const recommendations = [];
        
        if (analysis.averageExecutionTime > 300000) { // 5 minutes
            recommendations.push('Consider breaking down the task into smaller subtasks');
        }
        
        if (analysis.successRate < 0.8) {
            recommendations.push('Review error patterns and implement better error handling');
        }
        
        if (analysis.executionTimeVariance > analysis.averageExecutionTime * 0.5) {
            recommendations.push('Standardize task execution environment for consistent performance');
        }
        
        if (optimizations.estimatedTime) {
            recommendations.push(`Update estimated time to ${optimizations.estimatedTime} minutes`);
        }
        
        return recommendations;
    }

    /**
     * Calculate variance
     * @param {Array<number>} values - Values
     * @param {number} mean - Mean value
     * @returns {number} Variance
     */
    calculateVariance(values, mean) {
        if (values.length === 0) return 0;
        
        const squaredDifferences = values.map(value => Math.pow(value - mean, 2));
        return squaredDifferences.reduce((sum, diff) => sum + diff, 0) / values.length;
    }

    /**
     * Analyze failure patterns
     * @param {Array<TaskExecution>} executions - Task executions
     * @returns {Array<Object>} Failure patterns
     */
    analyzeFailurePatterns(executions) {
        const failures = executions.filter(exec => exec.status === 'failed');
        
        return failures.map(failure => ({
            timestamp: failure.startedAt,
            error: failure.error,
            duration: failure.executionTime
        }));
    }

    /**
     * Analyze performance trend
     * @param {Array<TaskExecution>} executions - Task executions
     * @returns {string} Performance trend
     */
    analyzePerformanceTrend(executions) {
        if (executions.length < 3) return 'insufficient_data';
        
        const recentExecutions = executions
            .slice(-3)
            .filter(exec => exec.status === 'completed')
            .map(exec => exec.executionTime);
        
        if (recentExecutions.length < 2) return 'insufficient_data';
        
        const trend = recentExecutions[recentExecutions.length - 1] - recentExecutions[0];
        
        if (trend < -10000) return 'improving';
        if (trend > 10000) return 'degrading';
        return 'stable';
    }

    /**
     * Calculate scheduling efficiency
     * @param {Array<number>} delays - Scheduling delays
     * @returns {number} Efficiency score
     */
    calculateSchedulingEfficiency(delays) {
        if (delays.length === 0) return 0;
        
        const averageDelay = delays.reduce((sum, delay) => sum + delay, 0) / delays.length;
        const maxAcceptableDelay = 300000; // 5 minutes
        
        return Math.max(0, 1 - (averageDelay / maxAcceptableDelay));
    }

    /**
     * Find optimal time slots
     * @param {Array<TaskExecution>} scheduledExecutions - Scheduled executions
     * @returns {Array<Object>} Optimal time slots
     */
    findOptimalTimeSlots(scheduledExecutions) {
        // Analyze execution times to find optimal slots
        const executionHours = scheduledExecutions.map(exec => {
            const date = new Date(exec.startedAt);
            return date.getHours();
        });
        
        const hourCounts = {};
        executionHours.forEach(hour => {
            hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        });
        
        // Find hours with most successful executions
        const optimalHours = Object.entries(hourCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([hour]) => parseInt(hour));
        
        return optimalHours.map(hour => ({
            hour,
            recommended: true
        }));
    }

    /**
     * Analyze scheduling pattern
     * @param {Array<TaskExecution>} scheduledExecutions - Scheduled executions
     * @returns {string} Scheduling pattern
     */
    analyzeSchedulingPattern(scheduledExecutions) {
        if (scheduledExecutions.length === 0) return 'none';
        
        const weekdays = scheduledExecutions.map(exec => {
            const date = new Date(exec.startedAt);
            return date.getDay();
        });
        
        const weekdayCounts = {};
        weekdays.forEach(day => {
            weekdayCounts[day] = (weekdayCounts[day] || 0) + 1;
        });
        
        const mostCommonDay = Object.entries(weekdayCounts)
            .sort(([,a], [,b]) => b - a)[0][0];
        
        return mostCommonDay === '1' ? 'monday_focused' : 'distributed';
    }

    /**
     * Find peak usage
     * @param {Array<Object>} resourceUsage - Resource usage data
     * @returns {Object} Peak usage
     */
    findPeakUsage(resourceUsage) {
        const peakMemory = Math.max(...resourceUsage.map(usage => usage.memory || 0));
        const peakCpu = Math.max(...resourceUsage.map(usage => usage.cpu || 0));
        
        return {
            memory: peakMemory,
            cpu: peakCpu
        };
    }

    /**
     * Calculate resource efficiency score
     * @param {Array<Object>} resourceUsage - Resource usage data
     * @returns {number} Efficiency score
     */
    calculateResourceEfficiencyScore(resourceUsage) {
        if (resourceUsage.length === 0) return 0;
        
        const averageMemory = resourceUsage.reduce((sum, usage) => sum + (usage.memory || 0), 0) / resourceUsage.length;
        const averageCpu = resourceUsage.reduce((sum, usage) => sum + (usage.cpu || 0), 0) / resourceUsage.length;
        
        // Lower usage = higher efficiency
        const memoryEfficiency = Math.max(0, 1 - (averageMemory / 1000)); // Assuming 1GB as baseline
        const cpuEfficiency = Math.max(0, 1 - (averageCpu / 100)); // Assuming 100% as baseline
        
        return (memoryEfficiency + cpuEfficiency) / 2;
    }

    /**
     * Generate scheduling recommendations
     * @param {Object} analysis - Scheduling analysis
     * @param {Object} optimalSchedule - Optimal schedule
     * @returns {Array<string>} Recommendations
     */
    generateSchedulingRecommendations(analysis, optimalSchedule) {
        const recommendations = [];
        
        if (analysis.averageDelay > 300000) { // 5 minutes
            recommendations.push('Consider scheduling tasks earlier to account for delays');
        }
        
        if (analysis.schedulingEfficiency < 0.7) {
            recommendations.push('Implement better scheduling algorithms to reduce delays');
        }
        
        if (optimalSchedule && optimalSchedule.scheduledAt) {
            recommendations.push(`Schedule next execution at ${optimalSchedule.scheduledAt}`);
        }
        
        return recommendations;
    }

    /**
     * Generate resource recommendations
     * @param {Object} analysis - Resource analysis
     * @param {Object} optimalAllocation - Optimal allocation
     * @returns {Array<string>} Recommendations
     */
    generateResourceRecommendations(analysis, optimalAllocation) {
        const recommendations = [];
        
        if (analysis.averageMemoryUsage > 500) { // 500MB
            recommendations.push('Consider optimizing memory usage or increasing memory allocation');
        }
        
        if (analysis.averageCpuUsage > 80) { // 80%
            recommendations.push('Consider distributing CPU load or optimizing algorithms');
        }
        
        if (analysis.resourceEfficiency < 0.6) {
            recommendations.push('Review resource allocation for better efficiency');
        }
        
        return recommendations;
    }

    /**
     * Generate priority recommendations
     * @param {Object} analysis - Priority analysis
     * @param {string} optimalPriority - Optimal priority
     * @returns {Array<string>} Recommendations
     */
    generatePriorityRecommendations(analysis, optimalPriority) {
        const recommendations = [];
        
        if (optimalPriority) {
            recommendations.push(`Consider changing priority to ${optimalPriority}`);
        }
        
        return recommendations;
    }

    /**
     * Generate dependency recommendations
     * @param {Object} analysis - Dependency analysis
     * @param {Array<string>} optimalDependencies - Optimal dependencies
     * @returns {Array<string>} Recommendations
     */
    generateDependencyRecommendations(analysis, optimalDependencies) {
        const recommendations = [];
        
        if (optimalDependencies && optimalDependencies.length > 0) {
            recommendations.push(`Consider adding dependencies: ${optimalDependencies.join(', ')}`);
        }
        
        return recommendations;
    }

    /**
     * Generate  recommendations
     * @param {Object} optimizations - Optimizations
     * @returns {Array<string>} Recommendations
     */
    generateRecommendations(optimizations) {
        const recommendations = [];
        
        if (optimizations.recommendations) {
            recommendations.push(...optimizations.recommendations);
        }
        
        return recommendations;
    }

    /**
     * Calculate  confidence
     * @param {Object} optimizations - Optimizations
     * @returns {number} Confidence score
     */
    calculateConfidence(optimizations) {
        // Base confidence on optimization quality
        let confidence = 0.5;
        
        if (optimizations.recommendations && optimizations.recommendations.length > 0) {
            confidence += 0.3;
        }
        
        if (optimizations.estimatedTime) {
            confidence += 0.2;
        }
        
        return Math.min(1, confidence);
    }

    /**
     * Build  optimization prompt
     * @param {Task} task - Task object
     * @param {Array<TaskExecution>} executions - Task executions
     * @param {string} optimizationType - Optimization type
     * @param {Object} options - Optimization options
     * @returns {string} AI prompt
     */
    buildOptimizationPrompt(task, executions, optimizationType, options) {
        return `
Optimize this task for: ${optimizationType}

Task: ${task.title}
Description: ${task.description}
Type: ${task.type.value}
Priority: ${task.priority.value}

Execution History: ${executions.length} executions
Recent Performance: ${this.getRecentPerformance(executions)}

Optimization Goals:
- Improve ${optimizationType}
- Maintain quality
- Reduce resource usage
- Enhance efficiency

Provide optimization recommendations in JSON format:
{
  "recommendations": ["list of specific recommendations"],
  "estimatedTime": "new estimated time if applicable",
  "priority": "new priority if applicable",
  "confidence": "confidence score 0-1"
}
        `.trim();
    }

    /**
     * Get recent performance summary
     * @param {Array<TaskExecution>} executions - Task executions
     * @returns {string} Performance summary
     */
    getRecentPerformance(executions) {
        if (executions.length === 0) return 'No execution history';
        
        const recent = executions.slice(-3);
        const successCount = recent.filter(exec => exec.status === 'completed').length;
        const averageTime = recent
            .filter(exec => exec.status === 'completed')
            .reduce((sum, exec) => sum + exec.executionTime, 0) / successCount;
        
        return `${successCount}/${recent.length} successful, avg ${Math.round(averageTime / 1000)}s`;
    }
}

module.exports = TaskOptimizationService; 