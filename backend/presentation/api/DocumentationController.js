const path = require('path');
const fs = require('fs');

class DocumentationController {
    constructor(taskService, cursorIDEService, logger, ideManager = null) {
        this.taskService = taskService;
        this.cursorIDEService = cursorIDEService;
        this.logger = logger;
        this.ideManager = ideManager;
        this.contentLibraryPath = path.join(__dirname, '../../../content-library');
    }

    /**
     * Analyze ALL projects documentation simultaneously
     * POST /api/projects/analyze-all/documentation
     */
    async analyzeAllProjects(req, res) {
        try {
            this.logger.info('[DocumentationController] Starting bulk documentation analysis for all projects');

            if (!this.ideManager) {
                return res.status(500).json({
                    success: false,
                    error: 'IDE Manager not available'
                });
            }

            // Get all available IDEs
            const availableIDEs = await this.ideManager.getAvailableIDEs();
            
            if (availableIDEs.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'No IDE instances found. Please open projects in Cursor IDE first.'
                });
            }

            this.logger.info('[DocumentationController] Found IDEs for bulk analysis', {
                ideCount: availableIDEs.length,
                ports: availableIDEs.map(ide => ide.port)
            });

            // 🚀 SEQUENTIAL SEND: Send prompts one by one with short delays (stable)
            this.logger.info('[DocumentationController] Phase 1: Sending prompts sequentially (stable)');
            
            const promptResults = [];
            
            for (const ide of availableIDEs) {
                const workspacePath = this.ideManager.getWorkspacePath(ide.port);
                if (!workspacePath || workspacePath.includes(':')) {
                    this.logger.warn('[DocumentationController] Skipping IDE with invalid workspace', {
                        port: ide.port,
                        workspacePath
                    });
                    promptResults.push({ 
                        status: 'fulfilled', 
                        value: { ide, success: false, error: 'Invalid workspace path' }
                    });
                    continue;
                }

                const projectId = this.getProjectIdFromPath(workspacePath);
                
                try {
                    this.logger.info('[DocumentationController] Sending prompt to IDE', {
                        port: ide.port,
                        projectId,
                        remaining: availableIDEs.length - promptResults.length
                    });
                    
                    // 🔥 SEQUENTIAL SEND: One by one with stability
                    await this.sendQuickPrompt(projectId, workspacePath, ide.port);
                    
                    promptResults.push({ 
                        status: 'fulfilled', 
                        value: { ide, projectId, workspacePath, success: true }
                    });
                    
                    // ⏰ SHORT DELAY: 250ms between IDEs for stability
                    if (promptResults.length < availableIDEs.length) {
                        this.logger.info('[DocumentationController] Waiting 250ms before next IDE...');
                        await new Promise(resolve => setTimeout(resolve, 250));
                    }
                    
                } catch (error) {
                    this.logger.error('[DocumentationController] Failed to send prompt to IDE', {
                        port: ide.port,
                        projectId,
                        error: error.message
                    });
                    
                    promptResults.push({ 
                        status: 'fulfilled', 
                        value: { ide, projectId, workspacePath, success: false, error: error.message }
                    });
                }
            }
            
            this.logger.info('[DocumentationController] Phase 2: Waiting for AI responses (2,5 minutes)');
            
            // 🕐 SMART WAIT: Give AI time to work on all projects
            await new Promise(resolve => setTimeout(resolve, 150000)); // 2,5 minutes for AI to work
            
            this.logger.info('[DocumentationController] Phase 3: Collecting responses and creating tasks sequentially');
            
            // 📝 SEQUENTIAL COLLECT: Collect responses one by one for stability
            const results = [];
            
            for (const promptResult of promptResults) {
                if (promptResult.status !== 'fulfilled' || !promptResult.value.success) {
                    results.push({
                        status: 'fulfilled',
                        value: {
                            port: promptResult.value?.ide?.port,
                            success: false,
                            error: promptResult.value?.error || 'Prompt sending failed'
                        }
                    });
                    continue;
                }
                
                const { ide, projectId, workspacePath } = promptResult.value;
                
                try {
                    this.logger.info('[DocumentationController] Collecting response from IDE', {
                        port: ide.port,
                        projectId,
                        remaining: promptResults.length - results.length
                    });
                    
                    // 📊 SEQUENTIAL COLLECT: One by one with stability
                    const result = await this.collectResponseAndCreateTasks(projectId, workspacePath, ide.port);
                    
                    results.push({
                        status: 'fulfilled',
                        value: {
                            port: ide.port,
                            projectId,
                            workspacePath,
                            success: true,
                            result
                        }
                    });
                    
                    // ⏰ SHORT DELAY: 300ms between response collections
                    if (results.length < promptResults.length) {
                        this.logger.info('[DocumentationController] Waiting 300ms before next response collection...');
                        await new Promise(resolve => setTimeout(resolve, 300));
                    }
                    
                } catch (error) {
                    this.logger.error('[DocumentationController] Failed to collect response for IDE', {
                        port: ide.port,
                        projectId,
                        error: error.message
                    });
                    
                    results.push({
                        status: 'fulfilled',
                        value: {
                            port: ide.port,
                            projectId,
                            workspacePath,
                            success: false,
                            error: error.message
                        }
                    });
                }
            }
            
            // Process results
            const successfulAnalyses = [];
            const failedAnalyses = [];
            let totalTasks = 0;

            results.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    const analysisResult = result.value;
                    if (analysisResult.success) {
                        successfulAnalyses.push(analysisResult);
                        totalTasks += analysisResult.result?.createdTasks?.length || 0;
                    } else {
                        failedAnalyses.push(analysisResult);
                    }
                } else {
                    failedAnalyses.push({
                        success: false,
                        error: result.reason || 'Unknown error'
                    });
                }
            });

            this.logger.info('[DocumentationController] Bulk analysis completed', {
                total: availableIDEs.length,
                successful: successfulAnalyses.length,
                failed: failedAnalyses.length,
                totalTasks
            });

            res.json({
                success: true,
                data: {
                    totalIDEs: availableIDEs.length,
                    successfulAnalyses: successfulAnalyses.length,
                    failedAnalyses: failedAnalyses.length,
                    totalTasksCreated: totalTasks,
                    results: {
                        successful: successfulAnalyses,
                        failed: failedAnalyses
                    },
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error) {
            this.logger.error('[DocumentationController] Bulk documentation analysis failed', {
                error: error.message
            });

            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Find IDE that matches the project path
     */
    async findProjectIDE(projectPath) {
        try {
            if (!this.ideManager) {
                this.logger.warn('[DocumentationController] No IDE manager available, using active IDE');
                return { port: this.cursorIDEService.getActivePort() };
            }

            // Get all available IDEs
            const availableIDEs = await this.ideManager.getAvailableIDEs();
            
            // Find IDE with matching workspace path
            for (const ide of availableIDEs) {
                const workspacePath = this.ideManager.getWorkspacePath(ide.port);
                if (workspacePath && projectPath.includes(workspacePath)) {
                    this.logger.info('[DocumentationController] Found matching IDE', {
                        port: ide.port,
                        workspacePath,
                        projectPath
                    });
                    return ide;
                }
            }

            // If no exact match, look for partial matches
            for (const ide of availableIDEs) {
                const workspacePath = this.ideManager.getWorkspacePath(ide.port);
                if (workspacePath && workspacePath.includes(projectPath.split('/').pop())) {
                    this.logger.info('[DocumentationController] Found partial match IDE', {
                        port: ide.port,
                        workspacePath,
                        projectPath
                    });
                    return ide;
                }
            }

            // Fallback to active IDE
            const activePort = this.cursorIDEService.getActivePort();
            this.logger.warn('[DocumentationController] No matching IDE found, using active IDE', {
                activePort,
                projectPath
            });
            return { port: activePort };

        } catch (error) {
            this.logger.error('[DocumentationController] Error finding project IDE', {
                error: error.message,
                projectPath
            });
            return { port: this.cursorIDEService.getActivePort() };
        }
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

            // Find the IDE that matches this project path
            const projectIDE = await this.findProjectIDE(projectPath);
            if (!projectIDE || !projectIDE.port) {
                return res.status(400).json({
                    success: false,
                    error: 'No IDE found for this project. Please open the project in Cursor IDE first.'
                });
            }

            this.logger.info('[DocumentationController] Found project IDE', {
                projectId,
                projectPath,
                idePort: projectIDE.port
            });

            // Switch to the correct IDE for this project
            const currentActivePort = this.cursorIDEService.getActivePort();
            if (currentActivePort !== projectIDE.port) {
                this.logger.info('[DocumentationController] Switching to project IDE', {
                    from: currentActivePort,
                    to: projectIDE.port
                });
                
                await this.cursorIDEService.switchToPort(projectIDE.port);
            }

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
**IDE Port**: ${projectIDE.port}

**Instructions**: 
1. Analyze the documentation in the above project path
2. Follow the framework phases exactly
3. Create a comprehensive improvement plan
4. Generate specific, actionable tasks
5. Focus on this specific project's needs

**Please begin your analysis now:**`;

            // Send to Cursor IDE and wait for complete response
            this.logger.info('[DocumentationController] Sending documentation analysis prompt to IDE', {
                idePort: projectIDE.port,
                promptLength: contextualizedPrompt.length
            });
            
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

            // Create tasks in database and execute them automatically with Git integration
            const taskResults = await this.createTasksFromAnalysis(analysisResult, projectId);
            
            this.logger.info('[DocumentationController] Created and executed tasks from analysis', {
                taskCount: taskResults.createdTasks.length,
                successful: taskResults.summary.successful,
                failed: taskResults.summary.failed
            });

            res.json({
                success: true,
                data: {
                    projectId,
                    projectPath,
                    analysis: analysisResult,
                    createdTasks: taskResults.createdTasks,
                    executionResults: taskResults.executionResults,
                    executionSummary: taskResults.summary,
                    promptSent: true,
                    ideResponse: ideResponse,
                    autoExecutionEnabled: true,
                    gitIntegrationEnabled: true,
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
        
        // 🚨 DEBUG: Log the actual AI response to see what we're working with
        this.logger.info('[DocumentationController] DEBUG: Full AI response text', {
            responseLength: analysisText?.length || 0,
            first500Chars: analysisText?.substring(0, 500) || 'NO TEXT',
            last500Chars: analysisText?.length > 500 ? analysisText.substring(analysisText.length - 500) : ''
        });
        
        // Pattern 1: "1. **Task**: ..." format (with numbers)
        const taskRegex = /\d+\.\s*\*\*Task\*\*:\s*([^\n]+)/g;
        let match;
        
        while ((match = taskRegex.exec(analysisText)) !== null) {
            const taskTitle = match[1].trim();
            
            // Try to extract additional info from the following lines
            const taskContext = analysisText.substring(match.index, match.index + 500);
            const timeMatch = taskContext.match(/Estimated Time.*?([0-9]+)\s*hours?/i);
            const priorityMatch = taskContext.match(/Priority.*?(High|Medium|Low)/i);
            
            tasks.push({
                title: taskTitle,
                description: `Documentation task: ${taskTitle}`,
                priority: priorityMatch ? priorityMatch[1].toLowerCase() : 'medium',
                type: 'documentation',
                estimatedTime: timeMatch ? parseInt(timeMatch[1]) : null
            });
        }
        
        // Pattern 2: "**Task**: ..." format (without numbers)
        const taskRegexSimple = /\*\*Task\*\*:\s*([^\n]+)/g;
        while ((match = taskRegexSimple.exec(analysisText)) !== null) {
            const taskTitle = match[1].trim();
            
            // Try to extract additional info
            const taskContext = analysisText.substring(match.index, match.index + 500);
            const timeMatch = taskContext.match(/Estimated Time.*?([0-9]+)\s*hours?/i);
            const priorityMatch = taskContext.match(/Priority.*?(High|Medium|Low)/i);
            
            tasks.push({
                title: taskTitle,
                description: `Documentation task: ${taskTitle}`,
                priority: priorityMatch ? priorityMatch[1].toLowerCase() : 'medium',
                type: 'documentation',
                estimatedTime: timeMatch ? parseInt(timeMatch[1]) : null
            });
        }
        
        // Pattern 3: "- [ ] **Task**: ..." format (checkbox format)
        const checkboxTaskRegex = /-\s*\[\s*\]\s*\*\*([^*]+)\*\*:\s*([^\n]+)/g;
        while ((match = checkboxTaskRegex.exec(analysisText)) !== null) {
            const taskType = match[1].trim();
            const taskTitle = match[2].trim();
            
            if (taskType.toLowerCase().includes('task')) {
                tasks.push({
                    title: taskTitle,
                    description: `Documentation task: ${taskTitle}`,
                    priority: 'medium',
                    type: 'documentation',
                    estimatedTime: null
                });
            }
        }
        
        // Pattern 4: "- [ ] Create/Develop/Write..." format (action items)
        const actionRegex = /-\s*\[\s*\]\s*\*\*([^*]+)\*\*:\s*([^\n]+)/g;
        while ((match = actionRegex.exec(analysisText)) !== null) {
            const actionType = match[1].trim();
            const actionDescription = match[2].trim();
            
            if (actionType && actionDescription.length > 10) {
                tasks.push({
                    title: `${actionType}: ${actionDescription}`,
                    description: actionDescription,
                    priority: 'medium',
                    type: 'documentation',
                    estimatedTime: null
                });
            }
        }
        
        // Pattern 5: Timeline format "Day X-X: ...", "Week X: ...", "Month X: ..."
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
        
        // Pattern 6: Next Steps numbered list
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
        
        // Pattern 7: Goal format "Month X Goal: ..."
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
                numberedTasks: tasks.filter(t => t.title.includes('Documentation task:')).length,
                taskFormat: tasks.filter(t => /^\d+\.\s*\*\*Task\*\*:/.test(t.title)).length,
                timeline: tasks.filter(t => /^(Day|Week|Month)/.test(t.title)).length,
                actions: tasks.filter(t => t.title.includes('Action')).length,
                goals: tasks.filter(t => t.title.includes('Goal')).length,
                checkboxes: tasks.filter(t => t.title.includes(':')).length
            }
        });
        
        return uniqueTasks;
    }

    /**
     * Create or get existing chat session for project and IDE port
     */
    async createOrGetChatSession(projectId, idePort) {
        const sessionId = `${projectId}_port_${idePort}`;
        
        // For now, return a simple session object
        // TODO: Implement proper ChatRepository integration if needed
        return {
            id: sessionId,
            projectId: projectId,
            idePort: idePort,
            createdAt: new Date()
        };
    }

    /**
     * Save chat message to repository
     */
    async saveChatMessage(sessionId, content, sender = 'assistant', type = 'documentation') {
        // For now, just log the message
        // TODO: Implement proper ChatRepository integration if needed
        this.logger.info('[DocumentationController] Chat message saved', {
            sessionId,
            sender,
            type,
            contentLength: content?.length || 0,
            timestamp: new Date().toISOString()
        });
        
        return {
            id: Date.now() + Math.random(),
            sessionId,
            content,
            sender,
            type,
            timestamp: new Date()
        };
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
     * Create tasks in database from analysis results and execute them automatically
     */
    async createTasksFromAnalysis(analysisResult, projectId, workspacePath = null) {
        const createdTasks = [];
        const executionResults = [];
        
        try {
            const tasks = analysisResult.tasks || [];
            
            this.logger.info('[DocumentationController] Creating and executing tasks from analysis', {
                taskCount: tasks.length,
                projectId,
                workspacePath
            });

            for (const taskData of tasks) {
                try {
                    // Convert priority string to proper format
                    const priority = this.normalizePriority(taskData.priority);
                    
                    // Get project path - use provided or get from IDE manager
                    const projectPath = workspacePath || this.ideManager.getWorkspacePath(this.cursorIDEService.getActivePort());
                    
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
                            analysisTimestamp: new Date().toISOString(),
                            projectPath: projectPath // FIX: Add projectPath for Git branch creation
                        }
                    );

                    createdTasks.push(task);
                    
                    this.logger.info('[DocumentationController] Created task, starting auto-execution', {
                        taskId: task.id,
                        title: task.title,
                        priority: task.priority
                    });

                    // ✅ AUTO-EXECUTE TASK WITH GIT INTEGRATION
                    try {
                        this.logger.info('[DocumentationController] Executing documentation task with Git workflow', {
                            taskId: task.id,
                            title: task.title
                        });

                        const executionResult = await this.taskService.executeTask(task.id, 'documentation-framework');
                        
                        executionResults.push({
                            taskId: task.id,
                            title: task.title,
                            success: true,
                            execution: executionResult,
                            message: 'Task executed successfully with Git integration'
                        });

                        this.logger.info('[DocumentationController] Task execution completed', {
                            taskId: task.id,
                            status: executionResult.status,
                            progress: executionResult.progress
                        });

                    } catch (executionError) {
                        this.logger.error('[DocumentationController] Task execution failed', {
                            taskId: task.id,
                            error: executionError.message
                        });

                        executionResults.push({
                            taskId: task.id,
                            title: task.title,
                            success: false,
                            error: executionError.message,
                            message: 'Task execution failed'
                        });
                    }

                } catch (taskError) {
                    this.logger.error('[DocumentationController] Failed to create individual task', {
                        error: taskError.message,
                        taskData: taskData
                    });
                }
            }

            this.logger.info('[DocumentationController] Task creation and execution completed', {
                created: createdTasks.length,
                total: tasks.length,
                successful: executionResults.filter(r => r.success).length,
                failed: executionResults.filter(r => !r.success).length
            });

        } catch (error) {
            this.logger.error('[DocumentationController] Failed to create tasks from analysis', {
                error: error.message,
                projectId
            });
        }

        return {
            createdTasks,
            executionResults,
            summary: {
                total: createdTasks.length,
                successful: executionResults.filter(r => r.success).length,
                failed: executionResults.filter(r => !r.success).length
            }
        };
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
     * Extract project ID from workspace path
     */
    getProjectIdFromPath(workspacePath) {
        if (!workspacePath) return 'unknown';
        
        const pathParts = workspacePath.split('/');
        const projectName = pathParts[pathParts.length - 1];
        
        // Convert to lowercase and remove special characters
        return projectName.toLowerCase().replace(/[^a-z0-9]/g, '');
    }

    /**
     * Run documentation analysis for a single project
     */
    async runSingleProjectAnalysis(projectId, workspacePath, idePort) {
        this.logger.info('[DocumentationController] Running single project analysis', {
            projectId,
            workspacePath,
            idePort
        });

        // Switch to the correct IDE
        const currentActivePort = this.cursorIDEService.getActivePort();
        if (currentActivePort !== idePort) {
            this.logger.info('[DocumentationController] Switching to project IDE for analysis', {
                from: currentActivePort,
                to: idePort
            });
            
            await this.cursorIDEService.switchToPort(idePort);
        }

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

**Project Path**: ${workspacePath}
**Project ID**: ${projectId}
**Analysis Date**: ${new Date().toISOString()}
**IDE Port**: ${idePort}

**Instructions**: 
1. Analyze the documentation in the above project path
2. Follow the framework phases exactly
3. Create a comprehensive improvement plan
4. Generate specific, actionable tasks
5. Focus on this specific project's needs

**Please begin your analysis now:**`;

        // Send to Cursor IDE and wait for complete response
        this.logger.info('[DocumentationController] Sending analysis prompt to IDE', {
            projectId,
            idePort,
            promptLength: contextualizedPrompt.length
        });
        
        const ideResponse = await this.cursorIDEService.sendMessage(contextualizedPrompt, {
            waitForResponse: false // 🚀 Fire and Forget - don't wait for response
        });

        this.logger.info('[DocumentationController] Received AI response for project', {
            projectId,
            idePort,
            success: ideResponse.success,
            responseLength: ideResponse.response?.length || 0,
            duration: ideResponse.duration
        });

        if (!ideResponse.success) {
            throw new Error(`AI analysis timed out or failed for project ${projectId}`);
        }

        // Process the response
        const analysisResult = this.processDocumentationAnalysis(ideResponse.response, projectId);

        // Create tasks in database and execute them automatically
        const taskResults = await this.createTasksFromAnalysis(analysisResult, projectId, workspacePath);
        
        this.logger.info('[DocumentationController] Created and executed tasks for project', {
            projectId,
            idePort,
            taskCount: taskResults.createdTasks.length,
            successful: taskResults.summary.successful,
            failed: taskResults.summary.failed
        });

        return {
            projectId,
            projectPath: workspacePath,
            idePort,
            analysis: analysisResult,
            createdTasks: taskResults.createdTasks,
            executionResults: taskResults.executionResults,
            executionSummary: taskResults.summary,
            promptSent: true,
            ideResponse: ideResponse,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Send prompt quickly without waiting for response (Phase 1 of Smart Parallel)
     */
    async sendQuickPrompt(projectId, workspacePath, idePort) {
        this.logger.info('[DocumentationController] Quick-sending prompt to IDE', {
            projectId,
            workspacePath,
            idePort
        });

        // Switch to the correct IDE
        const currentActivePort = this.cursorIDEService.getActivePort();
        if (currentActivePort !== idePort) {
            this.logger.info('[DocumentationController] Switching to project IDE for quick prompt', {
                from: currentActivePort,
                to: idePort
            });
            
            await this.cursorIDEService.switchToPort(idePort);
        }

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

**Project Path**: ${workspacePath}
**Project ID**: ${projectId}
**Analysis Date**: ${new Date().toISOString()}
**IDE Port**: ${idePort}

**Instructions**: 
1. Analyze the documentation in the above project path
2. Follow the framework phases exactly
3. Create a comprehensive improvement plan
4. Generate specific, actionable tasks
5. Focus on this specific project's needs

**Please begin your analysis now:**`;

        // 🚀 FIRE AND FORGET: Send prompt without waiting
        this.logger.info('[DocumentationController] Sending quick prompt to IDE', {
            projectId,
            idePort,
            promptLength: contextualizedPrompt.length
        });
        
        const ideResponse = await this.cursorIDEService.sendMessage(contextualizedPrompt, {
            waitForResponse: false // 🔥 Quick send - don't wait
        });

        if (!ideResponse.success) {
            throw new Error(`Failed to send prompt to IDE ${idePort}`);
        }

        this.logger.info('[DocumentationController] Quick prompt sent successfully', {
            projectId,
            idePort
        });

        return { success: true, promptSent: true };
    }

    /**
     * Collect AI response and create tasks (Phase 3 of Smart Parallel)
     */
    async collectResponseAndCreateTasks(projectId, workspacePath, idePort) {
        this.logger.info('[DocumentationController] Collecting response from IDE', {
            projectId,
            workspacePath,
            idePort
        });

        // Switch to the correct IDE to get response
        const currentActivePort = this.cursorIDEService.getActivePort();
        if (currentActivePort !== idePort) {
            this.logger.info('[DocumentationController] Switching to project IDE for response collection', {
                from: currentActivePort,
                to: idePort
            });
            
            await this.cursorIDEService.switchToPort(idePort);
        }

        // 📊 GET LATEST AI RESPONSE: Read from browser DOM and save to chat DB
        const ideResponse = await this.getLatestChatResponse(projectId, idePort);

        this.logger.info('[DocumentationController] Collected AI response for project', {
            projectId,
            idePort,
            success: ideResponse.success,
            responseLength: ideResponse.response?.length || 0
        });

        if (!ideResponse.success || !ideResponse.response) {
            // Fallback: Try to get any response from the chat
            this.logger.warn('[DocumentationController] No response found, using fallback method', {
                projectId,
                idePort
            });
            
            return {
                projectId,
                projectPath: workspacePath,
                idePort,
                analysis: { rawResponse: 'No response received', tasks: [], coverage: {}, priorities: [] },
                createdTasks: [],
                executionResults: [],
                executionSummary: { total: 0, successful: 0, failed: 0 },
                promptSent: true,
                ideResponse: { success: false, response: 'No response' },
                timestamp: new Date().toISOString()
            };
        }

        // Process the response
        const analysisResult = this.processDocumentationAnalysis(ideResponse.response, projectId);

        // Create tasks in database and execute them automatically
        const taskResults = await this.createTasksFromAnalysis(analysisResult, projectId, workspacePath);
        
        this.logger.info('[DocumentationController] Created and executed tasks for project', {
            projectId,
            idePort,
            taskCount: taskResults.createdTasks.length,
            successful: taskResults.summary.successful,
            failed: taskResults.summary.failed
        });

        return {
            projectId,
            projectPath: workspacePath,
            idePort,
            analysis: analysisResult,
            createdTasks: taskResults.createdTasks,
            executionResults: taskResults.executionResults,
            executionSummary: taskResults.summary,
            promptSent: true,
            ideResponse: ideResponse,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Get latest chat response from browser DOM and save to chat database
     */
    async getLatestChatResponse(projectId, idePort) {
        try {
            this.logger.info('[DocumentationController] Reading latest chat response from browser', {
                projectId,
                idePort
            });

            // Get browser page for this IDE
            const page = await this.cursorIDEService.browserManager.getPage();
            if (!page) {
                throw new Error('No browser connection to Cursor IDE');
            }

            // Read latest AI response from chat DOM
            const chatResponse = await page.evaluate(() => {
                // Try multiple selectors for chat messages
                const selectors = [
                    '.chat-message',
                    '.monaco-editor',
                    '[data-testid*="chat"]',
                    '.chat-response',
                    '.ai-response',
                    '.assistant-message'
                ];

                let messages = [];
                
                // Try each selector to find chat messages
                for (const selector of selectors) {
                    const elements = document.querySelectorAll(selector);
                    if (elements.length > 0) {
                        messages = Array.from(elements).map(el => ({
                            content: el.textContent?.trim() || '',
                            html: el.innerHTML || '',
                            timestamp: new Date().toISOString()
                        }));
                        break;
                    }
                }

                // If no specific chat messages found, try to get any visible text
                if (messages.length === 0) {
                    const textElements = document.querySelectorAll('div, p, span');
                    const textContent = Array.from(textElements)
                        .map(el => el.textContent?.trim())
                        .filter(text => text && text.length > 50) // Only substantial text
                        .join('\n');

                    if (textContent) {
                        messages = [{
                            content: textContent,
                            html: '',
                            timestamp: new Date().toISOString()
                        }];
                    }
                }

                // Return the latest (last) message
                return messages.length > 0 ? messages[messages.length - 1] : null;
            });

            if (!chatResponse || !chatResponse.content) {
                this.logger.warn('[DocumentationController] No chat response found in browser DOM', {
                    projectId,
                    idePort
                });
                
                return {
                    success: false,
                    response: null,
                    error: 'No chat response found'
                };
            }

            this.logger.info('[DocumentationController] Successfully read chat response from browser', {
                projectId,
                idePort,
                responseLength: chatResponse.content.length
            });

            // Save AI response to ChatRepository so we can retrieve it later
            try {
                const chatSession = await this.createOrGetChatSession(projectId, idePort);
                await this.saveChatMessage(chatSession.id, chatResponse.content, 'assistant', 'documentation_analysis');
                this.logger.info('[DocumentationController] AI response saved to database', {
                    projectId,
                    idePort,
                    sessionId: chatSession.id,
                    responseLength: chatResponse.content.length
                });
            } catch (saveError) {
                this.logger.warn('[DocumentationController] Failed to save AI response to database', {
                    projectId,
                    idePort,
                    error: saveError.message
                });
            }

            return {
                success: true,
                response: chatResponse.content,
                html: chatResponse.html,
                timestamp: chatResponse.timestamp
            };

        } catch (error) {
            this.logger.error('[DocumentationController] Error reading chat response', {
                projectId,
                idePort,
                error: error.message
            });

            return {
                success: false,
                response: null,
                error: error.message
            };
        }
    }

    /**
     * Send created tasks to Cursor IDE for automatic execution
     * @deprecated This method is deprecated. Tasks are now executed automatically via TaskService.executeTask()
     * which includes full Git integration (branch creation, auto-commit, auto-push, auto-merge).
     */
    async sendTasksToIDE(tasks, projectPath, idePort = null) {
        try {
            // Switch to the correct IDE if specified
            if (idePort) {
                const currentActivePort = this.cursorIDEService.getActivePort();
                if (currentActivePort !== idePort) {
                    this.logger.info('[DocumentationController] Switching to project IDE for task execution', {
                        from: currentActivePort,
                        to: idePort
                    });
                    
                    await this.cursorIDEService.switchToPort(idePort);
                }
            }

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
                lowPriority: lowPriorityTasks.length,
                idePort: idePort || this.cursorIDEService.getActivePort()
            });

            const ideResponse = await this.cursorIDEService.sendMessage(taskExecutionPrompt, {
                waitForResponse: false // Don't wait for response as tasks may take a long time
            });

            this.logger.info('[DocumentationController] Task execution prompt sent to IDE', {
                success: ideResponse.success,
                promptLength: taskExecutionPrompt.length,
                idePort: idePort || this.cursorIDEService.getActivePort()
            });

                            return {
                    success: ideResponse.success,
                    promptSent: true,
                    promptLength: taskExecutionPrompt.length,
                    tasksSent: tasks.length,
                    idePort: idePort || this.cursorIDEService.getActivePort(),
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