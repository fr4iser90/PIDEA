const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const Task = require('@domain/entities/Task');
const TaskStatus = require('@domain/value-objects/TaskStatus');
const TaskPriority = require('@domain/value-objects/TaskPriority');
const TaskType = require('@domain/value-objects/TaskType');


class VibeCoderAutoRefactorHandler {
    constructor(dependencies = {}) {
        this.eventBus = dependencies.eventBus;
        this.analysisRepository = dependencies.analysisRepository;
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
        // Lies die vorhandenen Analyse-Reports aus dem richtigen Projekt-Output-Ordner
        const fs = require('fs').promises;
        const path = require('path');
        try {
            const outputDir = path.join(projectPath, 'output', 'analysis', 'projects');
            const projectDirs = await fs.readdir(outputDir);
            // Finde das aktuellste Analyse-Verzeichnis
            let latestAnalysisDir = null;
            let latestTime = 0;
            for (const dir of projectDirs) {
                const dirPath = path.join(outputDir, dir);
                const stats = await fs.stat(dirPath);
                if (stats.isDirectory() && stats.mtime.getTime() > latestTime) {
                    latestTime = stats.mtime.getTime();
                    latestAnalysisDir = dir;
                }
            }
            if (!latestAnalysisDir) throw new Error('Kein Analyse-Output gefunden!');
            const analysisDir = path.join(outputDir, latestAnalysisDir);
            const files = await fs.readdir(analysisDir);
            // Parse die Large Files aus allen .md-Reports
            const largeFiles = [];
            for (const file of files) {
                if (file.endsWith('.md')) {
                    const filePath = path.join(analysisDir, file);
                    const content = await fs.readFile(filePath, 'utf8');
                    const largeFilesMatch = content.match(/### Large Files \(>500 LOC\)\n\n([\s\S]*?)(?=\n###|\n##|$)/);
                    if (largeFilesMatch) {
                        const largeFilesSection = largeFilesMatch[1];
                        const fileMatches = largeFilesSection.matchAll(/- \*\*(.*?)\*\*: (\d+) lines/g);
                        for (const match of fileMatches) {
                            largeFiles.push({
                                file: match[1],
                                lines: parseInt(match[2]),
                                report: file
                            });
                        }
                    }
                }
            }
            return {
                codeQuality: { data: { largeFiles } },
                largeFiles
            };
        } catch (error) {
            console.error('❌ [AutoRefactor] Fehler beim Lesen der Analyse:', error);
            throw error;
        }
    }

    identifyLargeFiles(analysisResults) {
        const largeFiles = [];
        
        // Parse the analysis results to find large files
        // The analysis results contain the data from the VibeCoder Mode analysis
        if (analysisResults && typeof analysisResults === 'object') {
            // Look for large files in the analysis structure
            // Based on the analysis report format, large files are stored in codeQuality section
            if (analysisResults.codeQuality && analysisResults.codeQuality.data) {
                const codeQualityData = analysisResults.codeQuality.data;
                
                // Check for largeFiles array in the data
                if (codeQualityData.largeFiles && Array.isArray(codeQualityData.largeFiles)) {
                    codeQualityData.largeFiles.forEach(file => {
                        largeFiles.push({
                            path: file.file || file.path,
                            lines: parseInt(file.lines) || 0,
                            package: 'main',
                            priority: this.calculatePriority(parseInt(file.lines) || 0),
                            estimatedTime: this.estimateRefactoringTime(parseInt(file.lines) || 0)
                        });
                    });
                }
            }
            
            // Also check if largeFiles is directly in the root
            if (analysisResults.largeFiles && Array.isArray(analysisResults.largeFiles)) {
                analysisResults.largeFiles.forEach(file => {
                    largeFiles.push({
                        path: file.file || file.path,
                        lines: parseInt(file.lines) || 0,
                        package: 'root',
                        priority: this.calculatePriority(parseInt(file.lines) || 0),
                        estimatedTime: this.estimateRefactoringTime(parseInt(file.lines) || 0)
                    });
                });
            }
        }
        
        console.log(`🔍 [AutoRefactor] Found ${largeFiles.length} large files to refactor`);
        
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
        
        for (const file of largeFiles) {
            const task = await this.createRefactoringTask(file, projectPath);
            tasks.push(task);
        }
        
        return tasks;
    }

    async createRefactoringTask(fileInfo, projectPath) {
        const taskId = `refactor_${Date.now()}_${uuidv4().substring(0, 8)}`;
        const fileName = path.basename(fileInfo.path, path.extname(fileInfo.path));
        const fileExt = path.extname(fileInfo.path);
        
        // Determine file type and create appropriate task
        let taskType = 'refactor';
        let taskTitle = '';
        let taskDescription = '';
        
        if (fileExt === '.jsx' || fileExt === '.tsx') {
            taskType = 'refactor-react';
            taskTitle = `Refactor React Component: ${fileName}`;
            taskDescription = `Split the large React component ${fileName} (${fileInfo.lines} lines) into smaller, more maintainable files.`;
        } else if (fileExt === '.js' || fileExt === '.ts') {
            taskType = 'refactor-node';
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

        // Create proper Task entity
        const task = new Task(
            taskId,
            'cursorweb', // projectId
            taskTitle,
            taskDescription,
            TaskStatus.PENDING,
            fileInfo.priority,
            taskType,
            taskMetadata
        );

        // Save task to repository
        await this.taskRepository.create(task);
        
        // Create detailed refactoring plan
        await this.createRefactoringPlan(task, fileInfo);
        
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
}

module.exports = VibeCoderAutoRefactorHandler; 