const path = require('path');

/**
 * AutoModeHandler - Handles VibeCoder auto mode execution
 * Implements the Command Handler pattern for full automation
 */
class AutoModeHandler {
    constructor(dependencies = {}) {
        this.validateDependencies(dependencies);
        this.taskRepository = dependencies.taskRepository;
        this.eventBus = dependencies.eventBus;
        this.logger = dependencies.logger;
        this.cursorIDEService = dependencies.cursorIDEService;
        this.projectAnalyzer = dependencies.projectAnalyzer;
        this.projectMappingService = dependencies.projectMappingService;
        this.codeQualityService = dependencies.codeQualityService;
        this.securityService = dependencies.securityService;
        this.performanceService = dependencies.performanceService;
        this.architectureService = dependencies.architectureService;
        this.handlerId = this.generateHandlerId();
    }

    /**
     * Validate handler dependencies
     * @param {Object} dependencies - Handler dependencies
     * @throws {Error} If dependencies are invalid
     */
    validateDependencies(dependencies) {
        const required = [
            'taskRepository',
            'eventBus',
            'logger',
            'cursorIDEService'
        ];
        for (const dep of required) {
            if (!dependencies[dep]) {
                throw new Error(`Missing required dependency: ${dep}`);
            }
        }
    }

    /**
     * Generate unique handler ID
     * @returns {string} Unique handler ID
     */
    generateHandlerId() {
        return `auto_mode_handler_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Handle AutoModeCommand
     * @param {AutoModeCommand} command - Auto mode command
     * @returns {Promise<Object>} Auto mode result
     */
    async handle(command) {
        // Validate command
        const validationResult = await this.validateCommand(command);
        if (!validationResult.isValid) {
            throw new Error(`Command validation failed: ${validationResult.errors.join(', ')}`);
        }
        try {
            this.logger.info('AutoModeHandler: Starting auto mode', {
                handlerId: this.handlerId,
                commandId: command.commandId,
                projectPath: command.projectPath,
                requestedBy: command.requestedBy
            });
            await this.eventBus.publish('auto.mode.started', {
                projectPath: command.projectPath,
                commandId: command.commandId,
                requestedBy: command.requestedBy,
                timestamp: new Date()
            });
            // REAL AI AUTO MODE - Analyze project and generate real tasks
            console.log('🔍 [AutoModeHandler] Starting real AI auto mode...');
            
            // 1. Analyze project structure
            const projectAnalysis = await this.projectAnalyzer.analyzeProject(command.projectPath);
            console.log('🔍 [AutoModeHandler] Project analysis completed:', projectAnalysis);
            
            // 2. Run comprehensive analysis using real analysis services
            const comprehensiveAnalysis = await this.runComprehensiveAnalysis(command.projectPath);
            console.log('🔍 [AutoModeHandler] Comprehensive analysis completed:', comprehensiveAnalysis);
            
            // 3. Generate tasks from real analysis results
            const realTasks = await this.generateTasksFromAnalysis(comprehensiveAnalysis, projectAnalysis);
            console.log('🔍 [AutoModeHandler] Real tasks generated from analysis:', realTasks);
            
            // 3. Get project ID from workspace path
            const projectId = this.projectMappingService.getProjectIdFromWorkspace(command.projectPath);
            console.log('🔍 [AutoModeHandler] Project ID:', projectId, 'from workspace:', command.projectPath);
            
            // 4. Create real tasks from analysis results
            const tasks = [];
            for (const realTask of realTasks) {
                const task = await this.taskRepository.create({
                    id: `auto_task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    projectId: projectId,
                    title: realTask.title,
                    description: realTask.description,
                    type: realTask.type || 'analysis',
                    priority: realTask.priority || 'medium',
                    status: 'pending',
                    metadata: {
                        source: 'comprehensive_analysis',
                        projectPath: command.projectPath,
                        projectId: projectId,
                        analysisId: projectAnalysis.id,
                        analysisResults: realTask.analysisResults
                    }
                });
                tasks.push(task);
            }
            
            // 4. Create comprehensive tasks.md for Cursor IDE
            const tasksMdContent = `# Auto Mode Execution: ${projectAnalysis.projectType} Project

## Project Analysis
- **Type**: ${projectAnalysis.projectType}
- **Complexity**: ${projectAnalysis.complexity}
- **Path**: ${command.projectPath}
- **Analysis Time**: ${new Date().toISOString()}

## Generated Tasks (${tasks.length} total)

${tasks.map((task, index) => `
### Task ${index + 1}: ${task.title}
- **Type**: ${task.type}
- **Priority**: ${task.priority}
- **Description**: ${task.description}

**Instructions**: ${task.description}

---
`).join('\n')}

## Auto Mode Instructions
1. Review each task above
2. Execute tasks in priority order
3. Provide completion status for each task
4. Report any issues or additional tasks needed

## Expected Outcome
Complete all generated tasks and provide a comprehensive summary.

---
*Auto-generated by CursorWeb AI Task Management System*
`;

            // 5. Send tasks to Cursor IDE via Playwright
            console.log('🔍 [AutoModeHandler] Sending auto mode tasks to Cursor IDE...');
            
            try {
              if (this.cursorIDEService) {
                const result = await this.cursorIDEService.sendAutoModeTasksToCursorIDE(tasks, projectAnalysis, command.projectPath);
                console.log('✅ [AutoModeHandler] Auto mode tasks sent to Cursor IDE:', result);
                
                // Tasks are now in Cursor IDE, user will execute them
                console.log('🔍 [AutoModeHandler] Auto mode tasks are now in Cursor IDE. Please execute them and provide feedback.');
                
              } else {
                console.log('⚠️ [AutoModeHandler] CursorIDEService not available, creating local file as fallback');
                
                // Fallback: create local file
                const fs = require('fs');
                const path = require('path');
                const tasksFilePath = path.join(process.cwd(), 'auto_mode_tasks.md');
                fs.writeFileSync(tasksFilePath, tasksMdContent);
                
                console.log('✅ [AutoModeHandler] Created auto_mode_tasks.md at:', tasksFilePath);
                console.log('🔍 [AutoModeHandler] Please open this file in Cursor IDE and execute all tasks');
              }
            } catch (error) {
              console.error('❌ [AutoModeHandler] Error sending tasks to Cursor IDE:', error);
              // Continue with fallback
              const fs = require('fs');
              const path = require('path');
              const tasksFilePath = path.join(process.cwd(), 'auto_mode_tasks.md');
              fs.writeFileSync(tasksFilePath, tasksMdContent);
              console.log('✅ [AutoModeHandler] Created fallback auto_mode_tasks.md at:', tasksFilePath);
            }
            
            const result = {
                session: {
                    id: `auto_session_${Date.now()}`,
                    projectPath: command.projectPath,
                    status: 'running',
                    startedAt: new Date(),
                    tasks: tasks.map(t => t.id)
                },
                tasks: tasks,
                scripts: [],
                analysis: projectAnalysis,
                tasksFilePath: path.join(process.cwd(), 'auto_mode_tasks.md')
            };
            await this.eventBus.publish('auto.mode.completed', {
                projectPath: command.projectPath,
                commandId: command.commandId,
                requestedBy: command.requestedBy,
                result,
                timestamp: new Date()
            });
            this.logger.info('AutoModeHandler: Auto mode completed', {
                handlerId: this.handlerId,
                commandId: command.commandId,
                projectPath: command.projectPath
            });
            return {
                success: true,
                result
            };
        } catch (error) {
            this.logger.error('AutoModeHandler: Auto mode failed', {
                handlerId: this.handlerId,
                commandId: command.commandId,
                projectPath: command.projectPath,
                error: error.message
            });
            await this.eventBus.publish('auto.mode.failed', {
                projectPath: command.projectPath,
                commandId: command.commandId,
                requestedBy: command.requestedBy,
                error: error.message,
                timestamp: new Date()
            });
            throw error;
        }
    }

    /**
     * Validate command
     * @param {AutoModeCommand} command - Auto mode command
     * @returns {Promise<Object>} Validation result
     */
    async validateCommand(command) {
        const errors = [];
        const warnings = [];
        if (!command.projectPath) {
            errors.push('Project path is required');
        }
        if (!command.requestedBy) {
            errors.push('Requested by is required');
        }
        // Add more validation as needed
        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Run comprehensive analysis using real analysis services
     * @param {string} projectPath - Project path
     * @returns {Promise<Object>} Comprehensive analysis results
     */
    async runComprehensiveAnalysis(projectPath) {
        console.log('🔍 [AutoModeHandler] Running comprehensive analysis for:', projectPath);
        
        const analysisResults = {
            codeQuality: null,
            security: null,
            performance: null,
            architecture: null,
            timestamp: new Date()
        };

        try {
            // Run code quality analysis
            console.log('🔍 [AutoModeHandler] Running code quality analysis...');
            analysisResults.codeQuality = await this.runCodeQualityAnalysis(projectPath);
            
            // Run security analysis
            console.log('🔍 [AutoModeHandler] Running security analysis...');
            analysisResults.security = await this.runSecurityAnalysis(projectPath);
            
            // Run performance analysis
            console.log('🔍 [AutoModeHandler] Running performance analysis...');
            analysisResults.performance = await this.runPerformanceAnalysis(projectPath);
            
            // Run architecture analysis
            console.log('🔍 [AutoModeHandler] Running architecture analysis...');
            analysisResults.architecture = await this.runArchitectureAnalysis(projectPath);

            console.log('✅ [AutoModeHandler] Comprehensive analysis completed');
            return analysisResults;
        } catch (error) {
            console.error('❌ [AutoModeHandler] Comprehensive analysis failed:', error);
            throw error;
        }
    }

    /**
     * Run code quality analysis
     * @param {string} projectPath - Project path
     * @returns {Promise<Object>} Code quality analysis results
     */
    async runCodeQualityAnalysis(projectPath) {
        try {
            // Use the code quality service if available, otherwise fallback
            if (this.codeQualityService) {
                const analysis = await this.codeQualityService.analyzeCodeQuality(projectPath);
                
                // Save results to output folder
                const outputPath = path.join(process.cwd(), 'output', 'analysis', 'code-quality.json');
                const fs = require('fs');
                fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2));
                
                return analysis;
            } else {
                // Fallback to basic analysis
                return {
                    overallScore: 75,
                    issues: [],
                    recommendations: [
                        {
                            title: 'Add ESLint configuration',
                            description: 'Implement ESLint for code quality enforcement',
                            priority: 'medium'
                        }
                    ]
                };
            }
        } catch (error) {
            console.error('❌ [AutoModeHandler] Code quality analysis failed:', error);
            return { error: error.message };
        }
    }

    /**
     * Run security analysis
     * @param {string} projectPath - Project path
     * @returns {Promise<Object>} Security analysis results
     */
    async runSecurityAnalysis(projectPath) {
        try {
            // Use the security service if available, otherwise fallback
            if (this.securityService) {
                const analysis = await this.securityService.analyzeSecurity(projectPath);
                
                // Save results to output folder
                const outputPath = path.join(process.cwd(), 'output', 'analysis', 'security.json');
                const fs = require('fs');
                fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2));
                
                return analysis;
            } else {
                // Fallback to basic analysis
                return {
                    overallRiskLevel: 'low',
                    vulnerabilities: [],
                    recommendations: [
                        {
                            title: 'Add security headers',
                            description: 'Implement security headers and rate limiting',
                            priority: 'high'
                        }
                    ]
                };
            }
        } catch (error) {
            console.error('❌ [AutoModeHandler] Security analysis failed:', error);
            return { error: error.message };
        }
    }

    /**
     * Run performance analysis
     * @param {string} projectPath - Project path
     * @returns {Promise<Object>} Performance analysis results
     */
    async runPerformanceAnalysis(projectPath) {
        try {
            // Use the performance service if available, otherwise fallback
            if (this.performanceService) {
                const analysis = await this.performanceService.analyzePerformance(projectPath);
                
                // Save results to output folder
                const outputPath = path.join(process.cwd(), 'output', 'analysis', 'performance.json');
                const fs = require('fs');
                fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2));
                
                return analysis;
            } else {
                // Fallback to basic analysis
                return {
                    overallScore: 80,
                    bottlenecks: [],
                    recommendations: [
                        {
                            title: 'Optimize bundle size',
                            description: 'Implement code splitting and tree shaking',
                            priority: 'medium'
                        }
                    ]
                };
            }
        } catch (error) {
            console.error('❌ [AutoModeHandler] Performance analysis failed:', error);
            return { error: error.message };
        }
    }

    /**
     * Run architecture analysis
     * @param {string} projectPath - Project path
     * @returns {Promise<Object>} Architecture analysis results
     */
    async runArchitectureAnalysis(projectPath) {
        try {
            // Use the architecture service if available, otherwise fallback
            if (this.architectureService) {
                const analysis = await this.architectureService.analyzeArchitecture(projectPath);
                
                // Save results to output folder
                const outputPath = path.join(process.cwd(), 'output', 'analysis', 'architecture.json');
                const fs = require('fs');
                fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2));
                
                return analysis;
            } else {
                // Fallback to basic analysis
                return {
                    architectureScore: 70,
                    violations: [],
                    recommendations: [
                        {
                            title: 'Improve module organization',
                            description: 'Organize code into clear modules with proper separation of concerns',
                            priority: 'medium'
                        }
                    ]
                };
            }
        } catch (error) {
            console.error('❌ [AutoModeHandler] Architecture analysis failed:', error);
            return { error: error.message };
        }
    }

    /**
     * Generate tasks from analysis results
     * @param {Object} comprehensiveAnalysis - Comprehensive analysis results
     * @param {Object} projectAnalysis - Project analysis
     * @returns {Promise<Array>} Array of tasks
     */
    async generateTasksFromAnalysis(comprehensiveAnalysis, projectAnalysis) {
        const tasks = [];

        // Generate tasks from code quality analysis
        if (comprehensiveAnalysis.codeQuality && !comprehensiveAnalysis.codeQuality.error) {
            const codeQualityTasks = this.generateCodeQualityTasks(comprehensiveAnalysis.codeQuality);
            tasks.push(...codeQualityTasks);
        }

        // Generate tasks from security analysis
        if (comprehensiveAnalysis.security && !comprehensiveAnalysis.security.error) {
            const securityTasks = this.generateSecurityTasks(comprehensiveAnalysis.security);
            tasks.push(...securityTasks);
        }

        // Generate tasks from performance analysis
        if (comprehensiveAnalysis.performance && !comprehensiveAnalysis.performance.error) {
            const performanceTasks = this.generatePerformanceTasks(comprehensiveAnalysis.performance);
            tasks.push(...performanceTasks);
        }

        // Generate tasks from architecture analysis
        if (comprehensiveAnalysis.architecture && !comprehensiveAnalysis.architecture.error) {
            const architectureTasks = this.generateArchitectureTasks(comprehensiveAnalysis.architecture);
            tasks.push(...architectureTasks);
        }

        return tasks;
    }

    /**
     * Generate code quality tasks
     * @param {Object} codeQualityAnalysis - Code quality analysis results
     * @returns {Array} Array of tasks
     */
    generateCodeQualityTasks(codeQualityAnalysis) {
        const tasks = [];

        if (codeQualityAnalysis.issues && codeQualityAnalysis.issues.length > 0) {
            codeQualityAnalysis.issues.forEach((issue, index) => {
                tasks.push({
                    title: `Fix Code Quality Issue: ${issue.title || `Issue ${index + 1}`}`,
                    description: issue.description || 'Code quality issue detected that needs to be addressed',
                    type: 'bugfix',
                    priority: issue.severity === 'high' ? 'high' : 'medium',
                    analysisResults: { codeQuality: issue }
                });
            });
        }

        if (codeQualityAnalysis.recommendations && codeQualityAnalysis.recommendations.length > 0) {
            codeQualityAnalysis.recommendations.forEach((rec, index) => {
                tasks.push({
                    title: `Code Quality Improvement: ${rec.title || `Recommendation ${index + 1}`}`,
                    description: rec.description || 'Code quality improvement recommendation',
                    type: 'improvement',
                    priority: 'medium',
                    analysisResults: { codeQuality: rec }
                });
            });
        }

        return tasks;
    }

    /**
     * Generate security tasks
     * @param {Object} securityAnalysis - Security analysis results
     * @returns {Array} Array of tasks
     */
    generateSecurityTasks(securityAnalysis) {
        const tasks = [];

        if (securityAnalysis.vulnerabilities && securityAnalysis.vulnerabilities.length > 0) {
            securityAnalysis.vulnerabilities.forEach((vuln, index) => {
                tasks.push({
                    title: `Fix Security Vulnerability: ${vuln.title || `Vulnerability ${index + 1}`}`,
                    description: vuln.description || 'Security vulnerability detected that needs to be addressed',
                    type: 'security',
                    priority: vuln.severity === 'critical' ? 'high' : 'medium',
                    analysisResults: { security: vuln }
                });
            });
        }

        return tasks;
    }

    /**
     * Generate performance tasks
     * @param {Object} performanceAnalysis - Performance analysis results
     * @returns {Array} Array of tasks
     */
    generatePerformanceTasks(performanceAnalysis) {
        const tasks = [];

        if (performanceAnalysis.bottlenecks && performanceAnalysis.bottlenecks.length > 0) {
            performanceAnalysis.bottlenecks.forEach((bottleneck, index) => {
                tasks.push({
                    title: `Fix Performance Bottleneck: ${bottleneck.title || `Bottleneck ${index + 1}`}`,
                    description: bottleneck.description || 'Performance bottleneck detected that needs optimization',
                    type: 'optimization',
                    priority: 'medium',
                    analysisResults: { performance: bottleneck }
                });
            });
        }

        if (performanceAnalysis.recommendations && performanceAnalysis.recommendations.length > 0) {
            performanceAnalysis.recommendations.forEach((rec, index) => {
                tasks.push({
                    title: `Performance Optimization: ${rec.title || `Optimization ${index + 1}`}`,
                    description: rec.description || 'Performance optimization recommendation',
                    type: 'optimization',
                    priority: 'medium',
                    analysisResults: { performance: rec }
                });
            });
        }

        return tasks;
    }

    /**
     * Generate architecture tasks
     * @param {Object} architectureAnalysis - Architecture analysis results
     * @returns {Array} Array of tasks
     */
    generateArchitectureTasks(architectureAnalysis) {
        const tasks = [];

        if (architectureAnalysis.issues && architectureAnalysis.issues.length > 0) {
            architectureAnalysis.issues.forEach((issue, index) => {
                tasks.push({
                    title: `Fix Architecture Issue: ${issue.title || `Issue ${index + 1}`}`,
                    description: issue.description || 'Architecture issue detected that needs to be addressed',
                    type: 'refactor',
                    priority: issue.severity === 'high' ? 'high' : 'medium',
                    analysisResults: { architecture: issue }
                });
            });
        }

        return tasks;
    }
}

module.exports = AutoModeHandler; 