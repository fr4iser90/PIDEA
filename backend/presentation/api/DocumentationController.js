const path = require('path');
const fs = require('fs');

class DocumentationController {
    constructor(taskService, cursorIDEService, logger) {
        this.taskService = taskService;
        this.cursorIDEService = cursorIDEService;
        this.logger = logger;
        this.contentLibraryPath = path.join(__dirname, '../../../content-library');
    }

    /**
     * Analyze project documentation using doc-analyze.md prompt
     * POST /api/documentation/analyze
     */
    async analyzeDocumentation(req, res) {
        try {
            const { projectId } = req.params;
            const { projectPath } = req.body;
            
            this.logger.info('[DocumentationController] Starting documentation analysis', {
                projectId,
                projectPath
            });

            // Load doc-analyze.md prompt
            const promptPath = path.join(
                this.contentLibraryPath,
                'frameworks/documentation-framework/prompts/doc-analyze.md'
            );

            if (!fs.existsSync(promptPath)) {
                throw new Error('doc-analyze.md prompt not found');
            }

            const promptTemplate = fs.readFileSync(promptPath, 'utf8');

            // Create contextualized prompt with project info
            const contextualizedPrompt = `${promptTemplate}

---

## 🎯 PROJECT CONTEXT

**Project Path**: ${projectPath}
**Project ID**: ${projectId}
**Analysis Date**: ${new Date().toISOString()}

**Instructions**: 
1. Analyze the documentation in the above project path
2. Follow the framework phases exactly
3. Create a comprehensive improvement plan
4. Generate specific, actionable tasks
5. Focus on this specific project's needs

**Please begin your analysis now:**`;

            // Send to Cursor IDE and wait for complete response
            this.logger.info('[DocumentationController] Sending documentation analysis prompt to IDE');
            const ideResponse = await this.cursorIDEService.sendMessage(contextualizedPrompt, {
                waitForResponse: true,
                timeout: 300000, // 5 minutes for comprehensive analysis
                checkInterval: 5000
            });

            this.logger.info('[DocumentationController] Received AI response', {
                success: ideResponse.success,
                responseLength: ideResponse.response?.length || 0,
                duration: ideResponse.duration
            });

            if (!ideResponse.success) {
                throw new Error('AI analysis timed out or failed');
            }

            // Process the response (parse tasks, etc.)
            const analysisResult = this.processDocumentationAnalysis(ideResponse.response, projectId);

            // Create tasks in database automatically
            const createdTasks = await this.createTasksFromAnalysis(analysisResult, projectId);
            
            this.logger.info('[DocumentationController] Created tasks from analysis', {
                taskCount: createdTasks.length
            });

            // Auto-execute tasks by sending them to Cursor IDE
            if (createdTasks.length > 0) {
                this.logger.info('[DocumentationController] Sending tasks to IDE for execution');
                const executionResult = await this.sendTasksToIDE(createdTasks, projectPath);
                analysisResult.executionTriggered = true;
                analysisResult.executionResult = executionResult;
            }

            res.json({
                success: true,
                data: {
                    projectId,
                    projectPath,
                    analysis: analysisResult,
                    createdTasks: createdTasks,
                    promptSent: true,
                    ideResponse: ideResponse,
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error) {
            this.logger.error('[DocumentationController] Documentation analysis failed', {
                error: error.message,
                projectId: req.params.projectId
            });

            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Process documentation analysis response from IDE
     */
    processDocumentationAnalysis(analysisText, projectId) {
        try {
            this.logger.info('[DocumentationController] Processing analysis response', {
                responseLength: analysisText?.length || 0,
                projectId
            });
            
            // Parse tasks from the response
            const tasks = this.extractTasksFromAnalysis(analysisText);
            
            // Extract coverage metrics
            const coverage = this.extractCoverageMetrics(analysisText);
            
            // Extract priority areas
            const priorities = this.extractPriorityAreas(analysisText);

            return {
                rawResponse: analysisText,
                tasks: tasks,
                coverage: coverage,
                priorities: priorities,
                summary: this.generateAnalysisSummary(tasks, coverage, priorities)
            };

        } catch (error) {
            this.logger.error('[DocumentationController] Failed to process analysis', {
                error: error.message
            });
            
            return {
                rawResponse: ideResponse,
                tasks: [],
                coverage: {},
                priorities: [],
                summary: 'Analysis completed but processing failed'
            };
        }
    }

    /**
     * Extract tasks from analysis text
     */
    extractTasksFromAnalysis(analysisText) {
        const tasks = [];
        
        // Pattern 1: "**Task**: ..." format
        const taskRegex = /\*\*Task\*\*:\s*([^\n]+)/g;
        let match;
        
        while ((match = taskRegex.exec(analysisText)) !== null) {
            const taskTitle = match[1].trim();
            
            // Try to extract additional info
            const timeMatch = analysisText.match(new RegExp(`${taskTitle}[\\s\\S]*?Estimated Time.*?([0-9]+)\\s*hours?`));
            const priorityMatch = analysisText.match(new RegExp(`${taskTitle}[\\s\\S]*?Priority.*?(High|Medium|Low)`));
            
            tasks.push({
                title: taskTitle,
                description: `Documentation task: ${taskTitle}`,
                priority: priorityMatch ? priorityMatch[1].toLowerCase() : 'medium',
                type: 'documentation',
                estimatedTime: timeMatch ? parseInt(timeMatch[1]) : null
            });
        }
        
        // Pattern 2: Timeline format "Day X-X: ...", "Week X: ...", "Month X: ..."
        const timelineRegex = /(Day|Week|Month)\s+(\d+(?:-\d+)?):?\s*([^\n]+)/g;
        while ((match = timelineRegex.exec(analysisText)) !== null) {
            const period = match[1];
            const timeFrame = match[2];
            const description = match[3].trim();
            
            if (description && description.length > 10) {
                const priority = period === 'Day' ? 'high' : period === 'Week' ? 'medium' : 'low';
                const estimatedHours = period === 'Day' ? 8 : period === 'Week' ? 20 : 40;
                
                tasks.push({
                    title: `${period} ${timeFrame}: ${description}`,
                    description: description,
                    priority: priority,
                    type: 'documentation',
                    estimatedTime: estimatedHours
                });
            }
        }
        
        // Pattern 3: Next Steps numbered list
        const nextStepsSection = analysisText.match(/Next Steps[\s\S]*?(?=\n\n|$)/i);
        if (nextStepsSection) {
            const numberedItems = nextStepsSection[0].match(/\d+\.\s*([^\n]+)/g);
            if (numberedItems) {
                numberedItems.forEach((item, index) => {
                    const description = item.replace(/^\d+\.\s*/, '').trim();
                    if (description.length > 5) {
                        const priority = index < 2 ? 'high' : 'medium';
                        tasks.push({
                            title: `Action ${index + 1}: ${description}`,
                            description: description,
                            priority: priority,
                            type: 'documentation',
                            estimatedTime: 4
                        });
                    }
                });
            }
        }
        
        // Pattern 4: Goal format "Month X Goal: ..."
        const goalRegex = /(Month|Week)\s+(\d+)\s+Goal:\s*([^\n]+)/g;
        while ((match = goalRegex.exec(analysisText)) !== null) {
            const period = match[1];
            const timeFrame = match[2];
            const description = match[3].trim();
            
            if (description && description.length > 10) {
                tasks.push({
                    title: `${period} ${timeFrame} Goal: ${description}`,
                    description: description,
                    priority: 'medium',
                    type: 'milestone',
                    estimatedTime: period === 'Week' ? 20 : 40
                });
            }
        }
        
        // Remove duplicates based on title similarity
        const uniqueTasks = tasks.filter((task, index, self) => 
            index === self.findIndex(t => t.title.toLowerCase() === task.title.toLowerCase())
        );
        
        this.logger.info('[DocumentationController] Extracted tasks from analysis', {
            totalFound: tasks.length,
            uniqueTasks: uniqueTasks.length,
            patterns: {
                taskFormat: tasks.filter(t => t.title.includes('Documentation task:')).length,
                timeline: tasks.filter(t => /^(Day|Week|Month)/.test(t.title)).length,
                actions: tasks.filter(t => t.title.includes('Action')).length,
                goals: tasks.filter(t => t.title.includes('Goal')).length
            }
        });
        
        return uniqueTasks;
    }

    /**
     * Extract coverage metrics from analysis
     */
    extractCoverageMetrics(analysisText) {
        const coverage = {};
        
        // Look for coverage patterns like "Getting Started | 80%"
        const coverageRegex = /\|\s*\*\*([^*]+)\*\*\s*\|\s*([0-9]+)%/g;
        let match;
        
        while ((match = coverageRegex.exec(analysisText)) !== null) {
            const area = match[1].trim();
            const percentage = parseInt(match[2]);
            coverage[area] = percentage;
        }
        
        return coverage;
    }

    /**
     * Extract priority areas from analysis
     */
    extractPriorityAreas(analysisText) {
        const priorities = [];
        
        // Look for priority sections
        const highPrioritySection = analysisText.match(/Critical Missing \(High Priority\)([\s\S]*?)(?=####|$)/);
        const mediumPrioritySection = analysisText.match(/Important Missing \(Medium Priority\)([\s\S]*?)(?=####|$)/);
        
        if (highPrioritySection) {
            priorities.push({
                level: 'high',
                items: this.extractListItems(highPrioritySection[1])
            });
        }
        
        if (mediumPrioritySection) {
            priorities.push({
                level: 'medium',
                items: this.extractListItems(mediumPrioritySection[1])
            });
        }
        
        return priorities;
    }

    /**
     * Extract list items from text
     */
    extractListItems(text) {
        const items = [];
        const listRegex = /- \[ \] (.+)/g;
        let match;
        
        while ((match = listRegex.exec(text)) !== null) {
            items.push(match[1].trim());
        }
        
        return items;
    }

    /**
     * Generate analysis summary
     */
    generateAnalysisSummary(tasks, coverage, priorities) {
        const taskCount = tasks.length;
        const avgCoverage = Object.values(coverage).length > 0 
            ? Math.round(Object.values(coverage).reduce((a, b) => a + b, 0) / Object.values(coverage).length)
            : 0;
        const highPriorityCount = priorities.find(p => p.level === 'high')?.items.length || 0;
        
        return {
            taskCount,
            avgCoverage,
            highPriorityCount,
            message: `Found ${taskCount} documentation tasks. Average coverage: ${avgCoverage}%. ${highPriorityCount} high-priority areas identified.`
        };
    }

    /**
     * Create tasks in database from analysis results
     */
    async createTasksFromAnalysis(analysisResult, projectId) {
        const createdTasks = [];
        
        try {
            const tasks = analysisResult.tasks || [];
            
            this.logger.info('[DocumentationController] Creating tasks from analysis', {
                taskCount: tasks.length,
                projectId
            });

            for (const taskData of tasks) {
                try {
                    // Convert priority string to proper format
                    const priority = this.normalizePriority(taskData.priority);
                    
                    // Create task via TaskService
                    const task = await this.taskService.createTask(
                        projectId,
                        taskData.title,
                        taskData.description,
                        priority,
                        'documentation', // type
                        {
                            source: 'documentation_framework',
                            category: taskData.type || 'documentation',
                            estimatedTime: taskData.estimatedTime,
                            framework: 'documentation-framework',
                            analysisTimestamp: new Date().toISOString()
                        }
                    );

                    createdTasks.push(task);
                    
                    this.logger.debug('[DocumentationController] Created task', {
                        taskId: task.id,
                        title: task.title,
                        priority: task.priority
                    });

                } catch (taskError) {
                    this.logger.error('[DocumentationController] Failed to create individual task', {
                        error: taskError.message,
                        taskData: taskData
                    });
                }
            }

            this.logger.info('[DocumentationController] Task creation completed', {
                created: createdTasks.length,
                total: tasks.length
            });

        } catch (error) {
            this.logger.error('[DocumentationController] Failed to create tasks from analysis', {
                error: error.message,
                projectId
            });
        }

        return createdTasks;
    }

    /**
     * Normalize priority string to valid values
     */
    normalizePriority(priority) {
        if (!priority) return 'medium';
        
        const normalized = priority.toLowerCase();
        if (['high', 'critical', 'urgent'].includes(normalized)) return 'high';
        if (['low', 'minor'].includes(normalized)) return 'low';
        return 'medium'; // default
    }

    /**
     * Send created tasks to Cursor IDE for automatic execution
     */
    async sendTasksToIDE(tasks, projectPath) {
        try {
            // Load doc-execute.md prompt for task execution
            const executePromptPath = path.join(
                this.contentLibraryPath,
                'frameworks/documentation-framework/prompts/doc-execute.md'
            );

            let executePrompt = '';
            if (fs.existsSync(executePromptPath)) {
                executePrompt = fs.readFileSync(executePromptPath, 'utf8');
            } else {
                executePrompt = 'Execute the following documentation tasks:\n\n';
            }

            // Group tasks by priority and type
            const highPriorityTasks = tasks.filter(t => t.priority === 'high');
            const mediumPriorityTasks = tasks.filter(t => t.priority === 'medium');
            const lowPriorityTasks = tasks.filter(t => t.priority === 'low');

            // Create comprehensive task execution prompt
            const taskExecutionPrompt = `${executePrompt}

---

# 🎯 DOCUMENTATION TASKS AUTO-EXECUTION

**Project Path**: ${projectPath}
**Total Tasks**: ${tasks.length}
**Execution Mode**: Automatic Documentation Framework

## 📋 TASK PRIORITIZATION

### 🔴 HIGH PRIORITY TASKS (Execute First)
${highPriorityTasks.map((task, index) => `
**${index + 1}. ${task.title}**
- **Description**: ${task.description}
- **Estimated Time**: ${task.metadata?.estimatedTime || 'TBD'} hours
- **Type**: ${task.type}
- **Created**: ${task.createdAt}
`).join('\n')}

### 🟡 MEDIUM PRIORITY TASKS (Execute After High Priority)
${mediumPriorityTasks.map((task, index) => `
**${index + 1}. ${task.title}**
- **Description**: ${task.description}
- **Estimated Time**: ${task.metadata?.estimatedTime || 'TBD'} hours
- **Type**: ${task.type}
- **Created**: ${task.createdAt}
`).join('\n')}

### 🟢 LOW PRIORITY TASKS (Execute Last)
${lowPriorityTasks.map((task, index) => `
**${index + 1}. ${task.title}**
- **Description**: ${task.description}
- **Estimated Time**: ${task.metadata?.estimatedTime || 'TBD'} hours
- **Type**: ${task.type}
- **Created**: ${task.createdAt}
`).join('\n')}

## 🚀 EXECUTION INSTRUCTIONS

1. **Start with HIGH PRIORITY tasks** - These are critical for foundation documentation
2. **Create Git branches** for each major task (e.g., \`docs/api-documentation\`, \`docs/readme-update\`)
3. **Follow documentation best practices**:
   - Clear, concise writing
   - Proper markdown formatting
   - Include examples and code snippets
   - Add diagrams where helpful
4. **Test all documentation** - Ensure links work and examples are accurate
5. **Commit frequently** with descriptive messages

## 🎯 SUCCESS CRITERIA

- ✅ All HIGH priority tasks completed
- ✅ Documentation structure is coherent
- ✅ All examples are tested and working
- ✅ Documentation follows consistent style
- ✅ README and API docs are comprehensive

**Begin executing these tasks now. Focus on HIGH PRIORITY tasks first, then proceed systematically through MEDIUM and LOW priority tasks.**

---

*Generated by PIDEA Documentation Framework - ${new Date().toISOString()}*`;

            // Send the comprehensive prompt to Cursor IDE
            this.logger.info('[DocumentationController] Sending task execution prompt to IDE', {
                taskCount: tasks.length,
                highPriority: highPriorityTasks.length,
                mediumPriority: mediumPriorityTasks.length,
                lowPriority: lowPriorityTasks.length
            });

            const ideResponse = await this.cursorIDEService.sendMessage(taskExecutionPrompt, {
                waitForResponse: false // Don't wait for response as tasks may take a long time
            });

            this.logger.info('[DocumentationController] Task execution prompt sent to IDE', {
                success: ideResponse.success,
                promptLength: taskExecutionPrompt.length
            });

            return {
                success: ideResponse.success,
                promptSent: true,
                promptLength: taskExecutionPrompt.length,
                tasksSent: tasks.length,
                priorityBreakdown: {
                    high: highPriorityTasks.length,
                    medium: mediumPriorityTasks.length,
                    low: lowPriorityTasks.length
                },
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            this.logger.error('[DocumentationController] Failed to send tasks to IDE', {
                error: error.message,
                taskCount: tasks.length
            });

            return {
                success: false,
                error: error.message,
                tasksSent: 0,
                timestamp: new Date().toISOString()
            };
        }
    }
}

module.exports = DocumentationController; 