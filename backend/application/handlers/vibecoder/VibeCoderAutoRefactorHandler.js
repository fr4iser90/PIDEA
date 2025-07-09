const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const Task = require('@/domain/entities/Task');
const TaskStatus = require('@/domain/value-objects/TaskStatus');
const TaskPriority = require('@/domain/value-objects/TaskPriority');
const TaskType = require('@/domain/value-objects/TaskType');
const ProjectAnalysis = require('@/domain/entities/ProjectAnalysis');


class VibeCoderAutoRefactorHandler {
    constructor(dependencies = {}) {
        this.eventBus = dependencies.eventBus;
        this.analysisRepository = dependencies.analysisRepository;
        this.projectAnalysisRepository = dependencies.projectAnalysisRepository;
        this.commandBus = dependencies.commandBus;
        this.logger = dependencies.logger;
        this.analysisOutputService = dependencies.analysisOutputService;
        this.taskRepository = dependencies.taskRepository;
        this.subprojectDetector = dependencies.subprojectDetector;
        this.projectAnalyzer = dependencies.projectAnalyzer;
        this.codeQualityAnalyzer = dependencies.codeQualityAnalyzer;
        this.architectureAnalyzer = dependencies.architectureAnalyzer;
        this.dependencyAnalyzer = dependencies.dependencyAnalyzer;
        this.securityAnalyzer = dependencies.securityAnalyzer;
        this.performanceAnalyzer = dependencies.performanceAnalyzer;
    }

    async handle(command) {
        try {
            console.log('🚀 Starting Auto Refactor Analysis...');
            
            // 1. Run comprehensive analysis first
            const analysisResults = await this.runComprehensiveAnalysis(command.projectPath);
            
            // 2. Identify large files from analysis
            const largeFiles = this.identifyLargeFiles(analysisResults);
            
            // 3. Create refactoring tasks for each large file
            const createdTasks = await this.createRefactoringTasks(largeFiles, command.projectPath);
            
            console.log(`✅ Auto Refactor completed. Created ${createdTasks.length} refactoring tasks.`);
            
            return {
                success: true,
                message: `Auto Refactor completed. Created ${createdTasks.length} refactoring tasks.`,
                tasks: createdTasks,
                largeFiles: largeFiles
            };
            
        } catch (error) {
            console.error('❌ Auto Refactor failed:', error);
            throw error;
        }
    }

    async runComprehensiveAnalysis(projectPath) {
        try {
            // Check if analysis data needs refresh
            const needsRefresh = await this.needsAnalysisRefresh(projectPath);
            if (needsRefresh) {
                console.log('🔄 [AutoRefactor] Analysis data needs refresh, running fresh analysis...');
                // Run a fresh analysis instead of just logging a warning
                return await this.createStandardAnalysis(projectPath, path.basename(projectPath));
            }
            
            // Extract projectId from the path
            const projectId = path.basename(projectPath);
            
            // Load the latest analyses from the database
            const latestArchitectureAnalysis = await this.projectAnalysisRepository.findLatestByProjectIdAndType(projectId, 'architecture');
            const latestCodeQualityAnalysis = await this.projectAnalysisRepository.findLatestByProjectIdAndType(projectId, 'code-quality');
            const latestDependenciesAnalysis = await this.projectAnalysisRepository.findLatestByProjectIdAndType(projectId, 'dependencies');
            
            // Combine all analyses
            const combinedAnalysis = {
                architecture: latestArchitectureAnalysis?.getAnalysisData() || {},
                codeQuality: latestCodeQualityAnalysis?.getAnalysisData() || {},
                dependencies: latestDependenciesAnalysis?.getAnalysisData() || {}
            };
            
            // Extract Large Files from the Code-Quality analysis
            const largeFiles = [];
            
            // Check multiple possible locations for large files data
            if (combinedAnalysis.codeQuality) {
                // Check direct largeFiles array
                if (combinedAnalysis.codeQuality.largeFiles && Array.isArray(combinedAnalysis.codeQuality.largeFiles)) {
                    largeFiles.push(...combinedAnalysis.codeQuality.largeFiles);
                }
                
                // Check in data.largeFiles
                if (combinedAnalysis.codeQuality.data && combinedAnalysis.codeQuality.data.largeFiles && Array.isArray(combinedAnalysis.codeQuality.data.largeFiles)) {
                    largeFiles.push(...combinedAnalysis.codeQuality.data.largeFiles);
                }
                
                // Check in realMetrics.largeFiles
                if (combinedAnalysis.codeQuality.realMetrics && combinedAnalysis.codeQuality.realMetrics.largeFiles && Array.isArray(combinedAnalysis.codeQuality.realMetrics.largeFiles)) {
                    largeFiles.push(...combinedAnalysis.codeQuality.realMetrics.largeFiles);
                }
            }
            
            // Fallback: If no analyses in DB, create a standard analysis
            if (largeFiles.length === 0) {
                console.log('⚠️ [AutoRefactor] No analyses found in database, creating standard analysis...');
                
                // Create a standard analysis based on the current project
                const standardAnalysis = await this.createStandardAnalysis(projectPath, projectId);
                
                return {
                    codeQuality: { data: { largeFiles: standardAnalysis.largeFiles } },
                    largeFiles: standardAnalysis.largeFiles,
                    analysis: standardAnalysis,
                    message: 'Standard analysis created. For more detailed results, please run a complete project analysis.'
                };
            }
            
            // Validate and fix line counts for all large files
            const validatedLargeFiles = [];
            for (const file of largeFiles) {
                let lines = file.lines;
                
                // If lines is undefined, null, or 0, try to count them manually
                if (!lines || lines <= 0) {
                    try {
                        const fullPath = path.join(projectPath, file.file || file.path);
                        lines = await this.countLines(fullPath);
                        console.log(`📊 [AutoRefactor] Manually counted lines for ${file.file || file.path}: ${lines}`);
                    } catch (error) {
                        console.warn(`⚠️ [AutoRefactor] Could not count lines for ${file.file || file.path}: ${error.message}`);
                        continue; // Skip this file
                    }
                }
                
                // Only include files with valid line counts
                if (lines && lines > 0) {
                    validatedLargeFiles.push({
                        file: file.file || file.path,
                        path: file.path || file.file,
                        lines: parseInt(lines) || 0,
                        package: file.package || this.getPackageFromPath(file.file || file.path)
                    });
                }
            }
            
            console.log(`✅ [AutoRefactor] Found ${validatedLargeFiles.length} valid large files from analysis data`);
            
            return {
                codeQuality: { data: { largeFiles: validatedLargeFiles } },
                largeFiles: validatedLargeFiles,
                analysis: combinedAnalysis
            };
        } catch (error) {
            console.error('❌ [AutoRefactor] Error reading analysis from database:', error);
            throw error;
        }
    }

    async createStandardAnalysis(projectPath, projectId) {
        try {
            console.log('🔍 [AutoRefactor] Erstelle Standard-Analyse für Projekt:', projectId);
            
            // Scanne das Projekt nach großen Dateien
            const fs = require('fs').promises;
            const path = require('path');
            
            const largeFiles = [];
            const scanDirectory = async (dir) => {
                try {
                    const items = await fs.readdir(dir);
                    for (const item of items) {
                        const fullPath = path.join(dir, item);
                        const stats = await fs.stat(fullPath);
                        
                        if (stats.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
                            await scanDirectory(fullPath);
                        } else if (stats.isFile() && this.isCodeFile(item)) {
                            const relativePath = path.relative(projectPath, fullPath);
                            const lineCount = await this.countLines(fullPath);
                            
                            if (lineCount > 200) { // Dateien mit mehr als 200 Zeilen (realistischerer Schwellenwert)
                                largeFiles.push({
                                    file: relativePath,
                                    path: relativePath,
                                    lines: lineCount,
                                    package: this.getPackageFromPath(relativePath)
                                });
                            }
                        }
                    }
                } catch (error) {
                    // Ignoriere Fehler beim Scannen
                }
            };
            
            await scanDirectory(projectPath);
            
            // Sortiere nach Zeilenanzahl (größte zuerst)
            largeFiles.sort((a, b) => b.lines - a.lines);
            
            // Erstelle eine Standard-Analyse-Entity und speichere sie in der DB
            const standardAnalysis = new ProjectAnalysis({
                projectId: projectId,
                projectPath: projectPath,
                analysisType: 'code-quality',
                analysisData: {
                    largeFiles: largeFiles,
                    totalFiles: largeFiles.length,
                    averageLines: largeFiles.length > 0 ? Math.round(largeFiles.reduce((sum, file) => sum + file.lines, 0) / largeFiles.length) : 0,
                    largestFile: largeFiles.length > 0 ? largeFiles[0] : null,
                    scanTimestamp: new Date().toISOString()
                },
                metadata: {
                    source: 'auto-refactor-fallback',
                    scanMethod: 'file-system-scan',
                    threshold: 100
                }
            });
            
            // Speichere in der Datenbank
            await this.projectAnalysisRepository.save(standardAnalysis);
            console.log('✅ [AutoRefactor] Standard-Analyse in Datenbank gespeichert');
            
            return {
                codeQuality: {
                    largeFiles: largeFiles,
                    totalFiles: largeFiles.length,
                    averageLines: largeFiles.length > 0 ? Math.round(largeFiles.reduce((sum, file) => sum + file.lines, 0) / largeFiles.length) : 0
                },
                largeFiles: largeFiles
            };
            
        } catch (error) {
            console.error('❌ [AutoRefactor] Fehler beim Erstellen der Standard-Analyse:', error);
            return {
                codeQuality: { largeFiles: [] },
                largeFiles: []
            };
        }
    }

    isCodeFile(filename) {
        const codeExtensions = ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt'];
        return codeExtensions.some(ext => filename.endsWith(ext));
    }

    async countLines(filePath) {
        try {
            const fs = require('fs').promises;
            const content = await fs.readFile(filePath, 'utf8');
            return content.split('\n').length;
        } catch (error) {
            return 0;
        }
    }

    getPackageFromPath(filePath) {
        const parts = filePath.split('/');
        if (parts.length > 1) {
            return parts[0];
        }
        return 'root';
    }

    identifyLargeFiles(analysisResults) {
        const largeFiles = [];
        const processedPaths = new Set(); // Prevent duplicate tasks
        
        console.log('🔍 [AutoRefactor] Analyzing results structure:', JSON.stringify(analysisResults, null, 2));
        
        // Parse the analysis results to find large files
        if (analysisResults && typeof analysisResults === 'object') {
            // Check multiple possible locations for large files data
            const possibleLargeFilesSources = [
                analysisResults.codeQuality?.data?.largeFiles,
                analysisResults.codeQuality?.largeFiles,
                analysisResults.codeQuality?.realMetrics?.largeFiles,
                analysisResults.largeFiles,
                analysisResults.analysis?.codeQuality?.largeFiles,
                analysisResults.analysis?.codeQuality?.data?.largeFiles
            ];
            
            for (const source of possibleLargeFilesSources) {
                if (source && Array.isArray(source)) {
                    console.log(`📁 [AutoRefactor] Found large files in source:`, source.length, 'files');
                    
                    source.forEach(file => {
                        const filePath = file.file || file.path;
                        if (filePath && !processedPaths.has(filePath)) {
                            // Handle different line count formats
                            let lines = 0;
                            if (typeof file.lines === 'number') {
                                lines = file.lines;
                            } else if (typeof file.lines === 'string') {
                                lines = parseInt(file.lines) || 0;
                            } else if (file.size) {
                                // Fallback: estimate lines from file size (rough estimate)
                                lines = Math.round(file.size / 50); // ~50 bytes per line average
                            }
                            
                            console.log(`📊 [AutoRefactor] File ${filePath}: lines=${lines}, original=${file.lines}`);
                            
                            if (lines > 0) {
                                largeFiles.push({
                                    path: filePath,
                                    lines: lines,
                                    package: file.package || this.getPackageFromPath(filePath),
                                    priority: this.calculatePriority(lines),
                                    estimatedTime: this.estimateRefactoringTime(lines)
                                });
                                processedPaths.add(filePath);
                            }
                        }
                    });
                }
            }
            
            // If no large files found in analysis, check if we have a specific file mentioned
            if (largeFiles.length === 0 && analysisResults.message) {
                // Look for file references in the message or task description
                const fileMatch = analysisResults.message.match(/AnalysisOutputService.*?(\d+)\s*lines/);
                if (fileMatch) {
                    const lines = parseInt(fileMatch[1]);
                    console.log(`🎯 [AutoRefactor] Found file reference in message: AnalysisOutputService with ${lines} lines`);
                    
                    largeFiles.push({
                        path: 'backend/domain/services/AnalysisOutputService.js',
                        lines: lines,
                        package: 'backend',
                        priority: this.calculatePriority(lines),
                        estimatedTime: this.estimateRefactoringTime(lines)
                    });
                }
            }
        }
        
        console.log(`🔍 [AutoRefactor] Found ${largeFiles.length} large files to refactor:`, largeFiles.map(f => `${f.path} (${f.lines} lines)`));
        
        // Sort by priority (largest files first)
        return largeFiles.sort((a, b) => b.lines - a.lines);
    }

    calculatePriority(lines) {
        if (lines > 1000) return 'high';
        if (lines > 750) return 'medium';
        return 'low';
    }

    estimateRefactoringTime(lines) {
        // Rough estimate: 1 hour per 200 lines
        const hours = Math.ceil(lines / 200);
        return `${hours} hour${hours > 1 ? 's' : ''}`;
    }

    async createRefactoringTasks(largeFiles, projectPath) {
        const tasks = [];
        
        console.log(`🔍 [AutoRefactor] Creating refactoring tasks for ${largeFiles.length} files...`);
        
        for (const file of largeFiles) {
            try {
                const task = await this.createRefactoringTask(file, projectPath);
                if (task) {
                    tasks.push(task);
                }
            } catch (error) {
                console.error(`❌ [AutoRefactor] Failed to create task for ${file.path}:`, error.message);
            }
        }
        
        console.log(`✅ [AutoRefactor] Successfully created ${tasks.length} refactoring tasks`);
        
        return tasks;
    }

    async createRefactoringTask(fileInfo, projectPath) {
        // Check if task already exists for this file
        let existingTasks = [];
        try {
            if (this.taskRepository && typeof this.taskRepository.findByProjectPath === 'function') {
                existingTasks = await this.taskRepository.findByProjectPath(projectPath);
            } else {
                console.warn('⚠️ [AutoRefactor] taskRepository.findByProjectPath not available, skipping duplicate check');
            }
        } catch (error) {
            console.warn('⚠️ [AutoRefactor] Error checking existing tasks:', error.message);
        }
        
        const existingTask = existingTasks.find(task => 
            task.metadata?.filePath === fileInfo.path && 
            task.title.includes(path.basename(fileInfo.path, path.extname(fileInfo.path)))
        );
        
        if (existingTask) {
            console.log(`⚠️ [AutoRefactor] Task already exists for ${fileInfo.path}, skipping...`);
            return existingTask;
        }
        
        const taskId = `refactor_${Date.now()}_${uuidv4().substring(0, 8)}`;
        const fileName = path.basename(fileInfo.path, path.extname(fileInfo.path));
        const fileExt = path.extname(fileInfo.path);
        
        // Validate and fix file info
        let lines = fileInfo.lines;
        if (!lines || lines <= 0) {
            // Try to count lines manually if not provided
            try {
                lines = await this.countLines(fileInfo.path);
                console.log(`📊 [AutoRefactor] Manually counted lines for ${fileInfo.path}: ${lines}`);
            } catch (error) {
                console.warn(`⚠️ [AutoRefactor] Could not count lines for ${fileInfo.path}: ${error.message}`);
                return null;
            }
        }
        
        if (!lines || lines <= 0) {
            console.warn(`⚠️ [AutoRefactor] Invalid line count for ${fileInfo.path}: ${lines}, skipping...`);
            return null;
        }
        
        // Update fileInfo with correct line count
        fileInfo.lines = lines;
        
        // Determine file type and create appropriate task
        let taskType = 'refactor';
        let taskTitle = '';
        let taskDescription = '';
        
        if (fileExt === '.jsx' || fileExt === '.tsx') {
            taskType = 'refactor_react';
            taskTitle = `Refactor React Component: ${fileName}`;
            taskDescription = `Split the large React component ${fileName} (${fileInfo.lines} lines) into smaller, more maintainable files.`;
        } else if (fileExt === '.js' || fileExt === '.ts') {
            taskType = 'refactor_node';
            taskTitle = `Refactor Node.js File: ${fileName}`;
            taskDescription = `Split the large Node.js file ${fileName} (${fileInfo.lines} lines) into smaller, more maintainable modules.`;
        } else {
            taskTitle = `Refactor File: ${fileName}`;
            taskDescription = `Split the large file ${fileName} (${fileInfo.lines} lines) into smaller, more maintainable files.`;
        }

        // Create proper Task entity with all required metadata
        const taskMetadata = {
            refactoringType: 'file-split',
            originalFile: fileInfo.path,
            filePath: fileInfo.path,
            projectPath: projectPath,
            fileSize: fileInfo.lines,
            package: fileInfo.package,
            lines: fileInfo.lines,
            currentLines: fileInfo.lines,
            targetLines: '<500',
            estimatedTime: fileInfo.estimatedTime,
            refactoringSteps: this.generateRefactoringSteps(fileInfo),
            analysisId: `vibecoder_auto_refactor_${Date.now()}_${uuidv4().substring(0, 8)}`
        };

        // Extract projectId from projectPath dynamically
        const projectId = path.basename(projectPath);
        
        // Create proper Task entity
        const task = new Task(
            taskId,
            projectId, 
            taskTitle,
            taskDescription,
            TaskStatus.PENDING,
            fileInfo.priority,
            taskType,
            taskMetadata
        );

        // Save task to repository
        try {
            if (this.taskRepository && typeof this.taskRepository.create === 'function') {
                await this.taskRepository.create(task);
                console.log(`✅ [AutoRefactor] Task saved to repository: ${taskId}`);
            } else {
                console.warn('⚠️ [AutoRefactor] taskRepository.create not available, task created in memory only');
            }
        } catch (error) {
            console.error(`❌ [AutoRefactor] Failed to save task ${taskId}:`, error.message);
            // Return task anyway so it can be used
        }
        
        // Create detailed refactoring plan
        await this.createRefactoringPlan(task, fileInfo);
        
        console.log(`✅ [AutoRefactor] Created refactoring task for ${fileInfo.path} (${fileInfo.lines} lines)`);
        
        return task;
    }

    async createRefactoringPlan(task, fileInfo) {
        const planPath = path.join(process.cwd(), 'docs', 'roadmap', 'features', `${task.id}-refactoring-plan.md`);
        
        const planContent = this.generateRefactoringPlan(task, fileInfo);
        
        // Ensure directory exists
        await fs.mkdir(path.dirname(planPath), { recursive: true });
        
        // Write plan file
        await fs.writeFile(planPath, planContent, 'utf8');
        
        console.log(`📝 Created refactoring plan: ${planPath}`);
    }

    generateRefactoringPlan(task, fileInfo) {
        const fileName = path.basename(fileInfo.path, path.extname(fileInfo.path));
        const fileExt = path.extname(fileInfo.path);
        
        let planContent = `# Refactoring Plan: ${task.title}

**Task ID:** ${task.id}
**File:** ${fileInfo.path}
**Current Size:** ${fileInfo.lines} lines of code
**Target Size:** <500 lines per file
**Priority:** ${task.priority}
**Estimated Time:** ${task.estimatedTime}
**Risk Level:** Low - no logic changes, only structure

## Current File Analysis

### Main Responsibilities
- [To be analyzed during implementation]

### Code Smells Identified
- Large file size (${fileInfo.lines} lines > 500 threshold)
- Likely contains multiple responsibilities
- Potential for function extraction
- Possible deep nesting issues

### Complexity Issues
- File size exceeds maintainability threshold
- High cyclomatic complexity likely
- Tight coupling possible

## Refactoring Strategy

### Extract Functions
- [ ] Extract validation logic
- [ ] Extract data processing functions
- [ ] Extract event handlers
- [ ] Extract utility functions
- [ ] Extract constants and configuration

### Extract Classes/Components
`;

        if (fileExt === '.jsx' || fileExt === '.tsx') {
            planContent += `- [ ] \`${fileName}Logic.js\` - Extract business logic
- [ ] \`${fileName}Utils.js\` - Extract utility functions
- [ ] \`${fileName}Types.js\` - Extract type definitions
- [ ] \`${fileName}Constants.js\` - Extract constants
- [ ] \`${fileName}Hooks.js\` - Extract custom hooks
`;
        } else {
            planContent += `- [ ] \`${fileName}Logic.js\` - Extract business logic
- [ ] \`${fileName}Utils.js\` - Extract utility functions
- [ ] \`${fileName}Types.js\` - Extract type definitions
- [ ] \`${fileName}Constants.js\` - Extract constants
- [ ] \`${fileName}Services.js\` - Extract service functions
`;
        }

        planContent += `
### Split into Multiple Files
- [ ] \`${fileName}Core.js\` - Core functionality
- [ ] \`${fileName}Helpers.js\` - Helper functions
- [ ] \`${fileName}Validation.js\` - Validation logic
- [ ] \`${fileName}Events.js\` - Event handling

## File Impact Analysis

### Files to Modify
- [ ] \`${fileInfo.path}\` - Split into smaller modules

### Files to Create
`;

        if (fileExt === '.jsx' || fileExt === '.tsx') {
            planContent += `- [ ] \`${path.dirname(fileInfo.path)}/${fileName}Logic.js\` - Extracted business logic
- [ ] \`${path.dirname(fileInfo.path)}/${fileName}Utils.js\` - Extracted utilities
- [ ] \`${path.dirname(fileInfo.path)}/${fileName}Types.js\` - Type definitions
- [ ] \`${path.dirname(fileInfo.path)}/${fileName}Constants.js\` - Constants
- [ ] \`${path.dirname(fileInfo.path)}/${fileName}Hooks.js\` - Custom hooks
`;
        } else {
            planContent += `- [ ] \`${path.dirname(fileInfo.path)}/${fileName}Logic.js\` - Extracted business logic
- [ ] \`${path.dirname(fileInfo.path)}/${fileName}Utils.js\` - Extracted utilities
- [ ] \`${path.dirname(fileInfo.path)}/${fileName}Types.js\` - Type definitions
- [ ] \`${path.dirname(fileInfo.path)}/${fileName}Constants.js\` - Constants
- [ ] \`${path.dirname(fileInfo.path)}/${fileName}Services.js\` - Service functions
`;
        }

        planContent += `
### Files to Delete
- [ ] None (refactoring only, no deletion)

## Implementation Phases

### Phase 1: Analysis & Planning
- [ ] Analyze current file structure
- [ ] Identify extractable functions
- [ ] Plan new file organization
- [ ] Create backup of original file

### Phase 2: Extract Functions
- [ ] Extract utility functions
- [ ] Extract validation logic
- [ ] Extract data processing
- [ ] Extract event handlers

### Phase 3: Create New Files
- [ ] Create logic file
- [ ] Create utils file
- [ ] Create types file
- [ ] Create constants file

### Phase 4: Update Original File
- [ ] Remove extracted code
- [ ] Add imports for new files
- [ ] Update function calls
- [ ] Clean up remaining code

### Phase 5: Update Dependencies
- [ ] Update all importing files
- [ ] Update import statements
- [ ] Test all connections
- [ ] Verify functionality

### Phase 6: Testing & Validation
- [ ] Run existing tests
- [ ] Verify no logic changes
- [ ] Check file sizes
- [ ] Validate imports

## Code Standards & Patterns
- **Function Size**: Max 50 lines per function
- **File Size**: Max 500 lines per file
- **Nesting Depth**: Max 3 levels
- **Import Organization**: Group imports by type
- **Naming**: Use descriptive function/class names
- **Comments**: Add JSDoc for extracted functions

## Refactoring Rules

### DO:
- [ ] Extract functions without changing logic
- [ ] Maintain existing function signatures
- [ ] Keep same return values
- [ ] Preserve error handling
- [ ] Maintain backward compatibility

### DON'T:
- [ ] Change business logic
- [ ] Modify function parameters
- [ ] Change return types
- [ ] Remove error handling
- [ ] Break existing tests

## Testing Strategy

### Before Refactoring:
- [ ] Document current behavior
- [ ] Run all existing tests
- [ ] Note test coverage
- [ ] Create behavior baseline

### After Refactoring:
- [ ] Run same tests
- [ ] Verify identical results
- [ ] Check performance
- [ ] Validate all functionality

## Success Criteria
- [ ] File size reduced to <500 lines
- [ ] All existing tests pass
- [ ] No logic changes detected
- [ ] Improved readability
- [ ] Better maintainability
- [ ] Cleaner imports

## Rollback Plan
- [ ] Keep original file backup
- [ ] Document all changes made
- [ ] Have rollback script ready
- [ ] Test rollback procedure

## Notes
- This is an auto-generated refactoring plan
- Focus on structure improvements without changing logic
- Maintain all existing functionality
- Improve code maintainability and readability
`;

        return planContent;
    }

    generateRefactoringSteps(fileInfo) {
        const fileName = path.basename(fileInfo.path, path.extname(fileInfo.path));
        const fileExt = path.extname(fileInfo.path);
        
        const baseSteps = [
            `Analyze the current structure of ${fileName} to identify extractable functions and components`,
            `Create backup of the original file before making changes`,
            `Extract utility functions and helper methods into separate modules`,
            `Separate business logic from presentation/UI logic`,
            `Extract constants and configuration into dedicated files`,
            `Split large functions into smaller, more focused functions`,
            `Update import statements in the original file`,
            `Test all extracted functionality to ensure no regressions`,
            `Update documentation and comments`,
            `Verify that the refactored code maintains the same functionality`
        ];

        if (fileExt === '.jsx' || fileExt === '.tsx') {
            return [
                ...baseSteps,
                `Extract reusable React components into separate files`,
                `Create custom hooks for shared logic`,
                `Separate component logic from UI rendering`,
                `Extract prop types and interfaces into types file`,
                `Create component-specific utility functions`
            ];
        } else if (fileExt === '.js' || fileExt === '.ts') {
            return [
                ...baseSteps,
                `Extract service layer functions into separate service files`,
                `Separate data processing logic from business logic`,
                `Create dedicated validation modules`,
                `Extract event handlers and listeners into separate files`,
                `Organize imports and exports for better maintainability`
            ];
        } else {
            return baseSteps;
        }
    }

    /**
     * Refresh analysis data after task completion
     * @param {string} projectPath - Project path
     * @param {string} taskId - Completed task ID
     * @returns {Promise<void>}
     */
    async refreshAnalysisDataAfterTaskCompletion(projectPath, taskId) {
        try {
            console.log(`🔄 [AutoRefactor] Refreshing analysis data after task completion: ${taskId}`);
            
            // Get the completed task
            const task = await this.taskRepository.findById(taskId);
            if (!task || !task.isCompleted()) {
                console.log(`⚠️ [AutoRefactor] Task ${taskId} not found or not completed, skipping refresh`);
                return;
            }

            // Update analysis data to reflect the completed refactoring
            const projectId = path.basename(projectPath);
            const latestAnalysis = await this.projectAnalysisRepository.findLatestByProjectId(projectId);
            
            if (latestAnalysis) {
                // Update the analysis data to remove the completed file from large files list
                const analysisData = latestAnalysis.getAnalysisData();
                
                if (analysisData.codeQuality && analysisData.codeQuality.largeFiles) {
                    // Remove the completed file from large files list
                    analysisData.codeQuality.largeFiles = analysisData.codeQuality.largeFiles.filter(
                        file => file.file !== task.metadata.filePath && file.path !== task.metadata.filePath
                    );
                    
                    // Update the analysis
                    latestAnalysis.updateAnalysisData(analysisData);
                    latestAnalysis.addMetadata('lastRefactoredTask', taskId);
                    latestAnalysis.addMetadata('lastRefactoredFile', task.metadata.filePath);
                    latestAnalysis.addMetadata('refactoredAt', new Date().toISOString());
                    
                    await this.projectAnalysisRepository.update(latestAnalysis);
                    
                    console.log(`✅ [AutoRefactor] Analysis data updated after task completion: ${taskId}`);
                }
            }
            
            // Create a new analysis entry for the completed refactoring
            const refactoringAnalysis = new ProjectAnalysis({
                projectId,
                projectPath,
                analysisType: 'refactoring-completion',
                analysisData: {
                    completedTaskId: taskId,
                    completedFile: task.metadata.filePath,
                    originalLines: task.metadata.lines,
                    completionTime: new Date().toISOString(),
                    refactoringType: task.metadata.refactoringType
                },
                metadata: {
                    taskId,
                    filePath: task.metadata.filePath,
                    completionStatus: 'success'
                }
            });
            
            await this.projectAnalysisRepository.save(refactoringAnalysis);
            
            console.log(`✅ [AutoRefactor] Created refactoring completion analysis for task: ${taskId}`);
            
        } catch (error) {
            console.error(`❌ [AutoRefactor] Failed to refresh analysis data after task completion:`, error.message);
        }
    }

    /**
     * Check if analysis data needs refresh
     * @param {string} projectPath - Project path
     * @returns {Promise<boolean>} True if refresh is needed
     */
    async needsAnalysisRefresh(projectPath) {
        try {
            const projectId = path.basename(projectPath);
            
            if (!this.projectAnalysisRepository || typeof this.projectAnalysisRepository.findLatestByProjectId !== 'function') {
                console.warn('⚠️ [AutoRefactor] projectAnalysisRepository.findLatestByProjectId not available');
                return true; // Default to refresh if repository not available
            }
            
            const latestAnalysis = await this.projectAnalysisRepository.findLatestByProjectId(projectId);
            
            if (!latestAnalysis) {
                console.log('🔄 [AutoRefactor] No analysis found, refresh needed');
                return true; // No analysis exists, need refresh
            }
            
            // Check if analysis is older than 30 minutes (more aggressive refresh)
            const analysisAge = Date.now() - new Date(latestAnalysis.createdAt).getTime();
            const thirtyMinutes = 30 * 60 * 1000;
            
            if (analysisAge > thirtyMinutes) {
                console.log(`🔄 [AutoRefactor] Analysis data is ${Math.round(analysisAge / 60000)} minutes old, refresh needed`);
                return true;
            }
            
            // Check if analysis data is incomplete or has undefined line counts
            const analysisData = latestAnalysis.getAnalysisData();
            if (analysisData && analysisData.codeQuality) {
                const largeFiles = analysisData.codeQuality.largeFiles || 
                                  analysisData.codeQuality.data?.largeFiles || 
                                  analysisData.codeQuality.realMetrics?.largeFiles || [];
                
                // Check if any large files have undefined or 0 line counts
                const hasInvalidLineCounts = largeFiles.some(file => 
                    !file.lines || file.lines === 0 || file.lines === 'undefined' || file.lines === undefined
                );
                
                if (hasInvalidLineCounts) {
                    console.log('🔄 [AutoRefactor] Analysis data has invalid line counts, refresh needed');
                    return true;
                }
            }
            
            console.log('✅ [AutoRefactor] Analysis data is current and valid');
            return false;
            
        } catch (error) {
            console.error(`❌ [AutoRefactor] Error checking analysis refresh need:`, error.message);
            return true; // Default to refresh on error
        }
    }
}

module.exports = VibeCoderAutoRefactorHandler; 