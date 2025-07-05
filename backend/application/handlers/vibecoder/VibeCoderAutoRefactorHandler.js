const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class VibeCoderAutoRefactorHandler {
    constructor() {
        this.analysisOutputService = require('@domain/services/AnalysisOutputService');
        this.taskRepository = require('@domain/repositories/TaskRepository');
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
        // Run VibeCoder Mode analysis to get current state
        const VibeCoderModeHandler = require('./VibeCoderModeHandler');
        const modeHandler = new VibeCoderModeHandler();
        
        const analysis = await modeHandler.performComprehensiveAnalysis(projectPath);
        
        // Save analysis results
        const projectId = `vibecoder_auto_refactor_${Date.now()}_${uuidv4().substring(0, 8)}`;
        await this.analysisOutputService.saveAnalysisResult(projectId, 'comprehensive', analysis);
        
        return analysis;
    }

    identifyLargeFiles(analysisResults) {
        const largeFiles = [];
        const LARGE_FILE_THRESHOLD = 500; // lines of code

        // Extract large files from code quality analysis
        if (analysisResults.codeQuality) {
            const codeQualityData = analysisResults.codeQuality;
            
            // Check if it's a monorepo with packages
            if (codeQualityData.packages) {
                Object.values(codeQualityData.packages).forEach(pkgData => {
                    if (pkgData.largeFiles) {
                        pkgData.largeFiles.forEach(file => {
                            largeFiles.push({
                                path: file.path,
                                lines: file.lines,
                                package: pkgData.packageName || 'unknown',
                                priority: this.calculatePriority(file.lines),
                                estimatedTime: this.estimateRefactoringTime(file.lines)
                            });
                        });
                    }
                });
            } else {
                // Single package
                if (codeQualityData.largeFiles) {
                    codeQualityData.largeFiles.forEach(file => {
                        largeFiles.push({
                            path: file.path,
                            lines: file.lines,
                            package: 'main',
                            priority: this.calculatePriority(file.lines),
                            estimatedTime: this.estimateRefactoringTime(file.lines)
                        });
                    });
                }
            }
        }

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

        const task = {
            id: taskId,
            title: taskTitle,
            description: taskDescription,
            type: taskType,
            priority: fileInfo.priority,
            status: 'pending',
            estimatedTime: fileInfo.estimatedTime,
            filePath: fileInfo.path,
            package: fileInfo.package,
            currentLines: fileInfo.lines,
            targetLines: '<500',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            metadata: {
                refactoringType: 'file-split',
                originalFile: fileInfo.path,
                fileSize: fileInfo.lines,
                package: fileInfo.package,
                analysisId: `vibecoder_auto_refactor_${Date.now()}_${uuidv4().substring(0, 8)}`
            }
        };

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
}

module.exports = VibeCoderAutoRefactorHandler; 