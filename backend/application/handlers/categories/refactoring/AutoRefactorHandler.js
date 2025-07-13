/**
 * AutoRefactorHandler - Handles auto refactor command execution
 * Generates refactoring tasks based on project analysis
 */
const RefactoringOutputGenerator = require('@infrastructure/external/output/RefactoringOutputGenerator');

class AutoRefactorHandler {
    constructor(dependencies = {}) {
        this.refactoringOutputGenerator = dependencies.refactoringOutputGenerator || new RefactoringOutputGenerator();
        this.logger = dependencies.logger || console;
        this.eventBus = dependencies.eventBus;
    }

    /**
     * Handle auto refactor command
     * @param {AutoRefactorCommand} command - The auto refactor command
     * @returns {Promise<Object>} Result with generated tasks
     */
    async handle(command) {
        try {
            this.logger.info('AutoRefactorHandler: Starting auto refactor', {
                commandId: command.commandId,
                projectPath: command.projectPath
            });

            // Step 1: Run comprehensive real analysis
            const analysis = await this.runComprehensiveAnalysis(command.projectPath);
            
            // Step 2: Identify large files from real analysis
            const largeFiles = this.identifyLargeFiles(analysis);
            
            // Step 3: Create refactoring tasks for each large file
            const createdTasks = await this.createRefactoringTasks(largeFiles, command.projectPath);

            // Step 4: Emit event for real-time updates
            if (this.eventBus) {
                this.eventBus.publish('autoRefactor:tasksGenerated', {
                    commandId: command.commandId,
                    projectPath: command.projectPath,
                    taskCount: createdTasks.length,
                    tasks: createdTasks
                });
            }

            this.logger.info('AutoRefactorHandler: Auto refactor completed', {
                commandId: command.commandId,
                taskCount: createdTasks.length
            });

            return {
                success: true,
                message: `Generated ${createdTasks.length} refactoring tasks based on real analysis`,
                tasks: createdTasks,
                largeFiles: largeFiles,
                analysis: analysis,
                commandId: command.commandId
            };

        } catch (error) {
            this.logger.error('AutoRefactorHandler: Auto refactor failed', {
                commandId: command.commandId,
                error: error.message
            });

            if (this.eventBus) {
                this.eventBus.publish('autoRefactor:failed', {
                    commandId: command.commandId,
                    projectPath: command.projectPath,
                    error: error.message
                });
            }

            throw error;
        }
    }

    /**
     * Run comprehensive real analysis of the project
     * @param {string} projectPath - Project path
     * @returns {Promise<Object>} Analysis results
     */
    async runComprehensiveAnalysis(projectPath) {
        try {
            // Check if analysis data needs refresh
            const needsRefresh = await this.needsAnalysisRefresh(projectPath);
            if (needsRefresh) {
                this.logger.info('🔄 [AutoRefactorHandler] Analysis data needs refresh, running fresh analysis...');
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
            
            // If no analyses in DB, create a standard analysis
            if (largeFiles.length === 0) {
                this.logger.info('⚠️ [AutoRefactorHandler] No analyses found in database, creating standard analysis...');
                return await this.createStandardAnalysis(projectPath, projectId);
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
                        this.logger.info(`📊 [AutoRefactorHandler] Manually counted lines for ${file.file || file.path}: ${lines}`);
                    } catch (error) {
                        this.logger.warn(`⚠️ [AutoRefactorHandler] Could not count lines for ${file.file || file.path}: ${error.message}`);
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
            
            this.logger.info(`✅ [AutoRefactorHandler] Found ${validatedLargeFiles.length} valid large files from analysis data`);
            
            return {
                codeQuality: { data: { largeFiles: validatedLargeFiles } },
                largeFiles: validatedLargeFiles,
                analysis: combinedAnalysis
            };
        } catch (error) {
            this.logger.error('❌ [AutoRefactorHandler] Error reading analysis from database:', error);
            throw error;
        }
    }

    /**
     * Create standard analysis when no database analysis exists
     * @param {string} projectPath - Project path
     * @param {string} projectId - Project ID
     * @returns {Promise<Object>} Analysis results
     */
    async createStandardAnalysis(projectPath, projectId) {
        try {
            this.logger.info('🔍 [AutoRefactorHandler] Creating standard analysis for project:', projectId);
            
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
                            
                            if (lineCount > 200) { // Files with more than 200 lines
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
                    // Ignore scanning errors
                }
            };
            
            await scanDirectory(projectPath);
            
            // Sort by line count (largest first)
            largeFiles.sort((a, b) => b.lines - a.lines);
            
            // Create a standard analysis entity and save to DB
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
                    source: 'auto-refactor-handler',
                    scanMethod: 'file-system-scan',
                    threshold: 200
                }
            });
            
            // Save to database
            await this.projectAnalysisRepository.save(standardAnalysis);
            this.logger.info('✅ [AutoRefactorHandler] Standard analysis saved to database');
            
            return {
                codeQuality: {
                    largeFiles: largeFiles,
                    totalFiles: largeFiles.length,
                    averageLines: largeFiles.length > 0 ? Math.round(largeFiles.reduce((sum, file) => sum + file.lines, 0) / largeFiles.length) : 0
                },
                largeFiles: largeFiles
            };
            
        } catch (error) {
            this.logger.error('❌ [AutoRefactorHandler] Error creating standard analysis:', error);
            return {
                codeQuality: { largeFiles: [] },
                largeFiles: []
            };
        }
    }

    /**
     * Identify large files from analysis results
     * @param {Object} analysisResults - Analysis results
     * @returns {Array} Array of large files
     */
    identifyLargeFiles(analysisResults) {
        const largeFiles = [];
        const processedPaths = new Set(); // Prevent duplicate tasks
        
        this.logger.info('🔍 [AutoRefactorHandler] Analyzing results structure for large files');
        
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
                    this.logger.info(`📁 [AutoRefactorHandler] Found large files in source:`, source.length, 'files');
                    
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
                            
                            this.logger.info(`📊 [AutoRefactorHandler] File ${filePath}: lines=${lines}, original=${file.lines}`);
                            
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
        }
        
        this.logger.info(`🔍 [AutoRefactorHandler] Found ${largeFiles.length} large files to refactor:`, largeFiles.map(f => `${f.path} (${f.lines} lines)`));
        
        // Sort by priority (largest files first)
        return largeFiles.sort((a, b) => b.lines - a.lines);
    }

    /**
     * Create refactoring tasks for large files
     * @param {Array} largeFiles - Array of large files
     * @param {string} projectPath - Project path
     * @returns {Promise<Array>} Array of created tasks
     */
    async createRefactoringTasks(largeFiles, projectPath) {
        const tasks = [];
        
        this.logger.info(`🔍 [AutoRefactorHandler] Creating refactoring tasks for ${largeFiles.length} files...`);
        
        for (const file of largeFiles) {
            try {
                const task = await this.createRefactoringTask(file, projectPath);
                if (task) {
                    tasks.push(task);
                }
            } catch (error) {
                this.logger.error(`❌ [AutoRefactorHandler] Failed to create task for ${file.path}:`, error.message);
            }
        }
        
        this.logger.info(`✅ [AutoRefactorHandler] Successfully created ${tasks.length} refactoring tasks`);
        
        return tasks;
    }

    /**
     * Create a single refactoring task
     * @param {Object} fileInfo - File information
     * @param {string} projectPath - Project path
     * @returns {Promise<Object|null>} Created task or null
     */
    async createRefactoringTask(fileInfo, projectPath) {
        const taskId = `refactor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const fileName = path.basename(fileInfo.path, path.extname(fileInfo.path));
        const fileExt = path.extname(fileInfo.path);
        
        // Validate and fix file info
        let lines = fileInfo.lines;
        if (!lines || lines <= 0) {
            // Try to count lines manually if not provided
            try {
                lines = await this.countLines(fileInfo.path);
                this.logger.info(`📊 [AutoRefactorHandler] Manually counted lines for ${fileInfo.path}: ${lines}`);
            } catch (error) {
                this.logger.warn(`⚠️ [AutoRefactorHandler] Could not count lines for ${fileInfo.path}: ${error.message}`);
                return null;
            }
        }
        
        if (!lines || lines <= 0) {
            this.logger.warn(`⚠️ [AutoRefactorHandler] Invalid line count for ${fileInfo.path}: ${lines}, skipping...`);
            return null;
        }
        
        // Update fileInfo with correct line count
        fileInfo.lines = lines;
        
        // Determine file type and create appropriate task
        let taskTitle = '';
        let taskDescription = '';
        
        if (fileExt === '.jsx' || fileExt === '.tsx') {
            taskTitle = `Refactor React Component: ${fileName}`;
            taskDescription = `Split the large React component ${fileName} (${fileInfo.lines} lines) into smaller, more maintainable files.`;
        } else if (fileExt === '.js' || fileExt === '.ts') {
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
            status: 'pending',
            priority: fileInfo.priority,
            type: 'refactor',
            metadata: {
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
                analysisId: `auto_refactor_handler_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            }
        };
        
        this.logger.info(`✅ [AutoRefactorHandler] Created refactoring task for ${fileInfo.path} (${fileInfo.lines} lines)`);
        
        return task;
    }

    /**
     * Generate refactoring steps for a file
     * @param {Object} fileInfo - File information
     * @returns {Array} Array of refactoring steps
     */
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
     * Calculate priority based on line count
     * @param {number} lines - Line count
     * @returns {string} Priority level
     */
    calculatePriority(lines) {
        if (lines > 1000) return 'high';
        if (lines > 750) return 'medium';
        return 'low';
    }

    /**
     * Estimate refactoring time
     * @param {number} lines - Line count
     * @returns {string} Estimated time
     */
    estimateRefactoringTime(lines) {
        // Rough estimate: 1 hour per 200 lines
        const hours = Math.ceil(lines / 200);
        return `${hours} hour${hours > 1 ? 's' : ''}`;
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
                this.logger.warn('⚠️ [AutoRefactorHandler] projectAnalysisRepository.findLatestByProjectId not available');
                return true; // Default to refresh if repository not available
            }
            
            const latestAnalysis = await this.projectAnalysisRepository.findLatestByProjectId(projectId);
            
            if (!latestAnalysis) {
                this.logger.info('🔄 [AutoRefactorHandler] No analysis found, refresh needed');
                return true; // No analysis exists, need refresh
            }
            
            // Check if analysis is older than 30 minutes
            const analysisAge = Date.now() - new Date(latestAnalysis.createdAt).getTime();
            const thirtyMinutes = 30 * 60 * 1000;
            
            if (analysisAge > thirtyMinutes) {
                this.logger.info(`🔄 [AutoRefactorHandler] Analysis data is ${Math.round(analysisAge / 60000)} minutes old, refresh needed`);
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
                    this.logger.info('🔄 [AutoRefactorHandler] Analysis data has invalid line counts, refresh needed');
                    return true;
                }
            }
            
            this.logger.info('✅ [AutoRefactorHandler] Analysis data is current and valid');
            return false;
            
        } catch (error) {
            this.logger.error(`❌ [AutoRefactorHandler] Error checking analysis refresh need:`, error.message);
            return true; // Default to refresh on error
        }
    }

    /**
     * Count lines in a file
     * @param {string} filePath - File path
     * @returns {Promise<number>} Line count
     */
    async countLines(filePath) {
        try {
            const content = await fs.readFile(filePath, 'utf8');
            return content.split('\n').length;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Get package from file path
     * @param {string} filePath - File path
     * @returns {string} Package name
     */
    getPackageFromPath(filePath) {
        const parts = filePath.split('/');
        if (parts.length > 1) {
            return parts[0];
        }
        return 'root';
    }

    /**
     * Check if file is a code file
     * @param {string} filename - File name
     * @returns {boolean} True if code file
     */
    isCodeFile(filename) {
        const codeExtensions = ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt'];
        return codeExtensions.some(ext => filename.endsWith(ext));
    }

    /**
     * Get all files in project
     * @param {string} projectPath - Project path
     * @returns {Promise<Array>} Array of file paths
     */
    async getAllFiles(projectPath) {
        const fs = require('fs').promises;
        const path = require('path');

        const files = [];
        const excludeDirs = ['node_modules', '.git', 'dist', 'build', 'coverage'];

        async function scanDirectory(dir) {
            try {
                const entries = await fs.readdir(dir, { withFileTypes: true });
                
                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);
                    
                    if (entry.isDirectory()) {
                        if (!excludeDirs.includes(entry.name)) {
                            await scanDirectory(fullPath);
                        }
                    } else {
                        files.push(fullPath);
                    }
                }
            } catch (error) {
                // Skip directories that can't be read
            }
        }

        await scanDirectory(projectPath);
        return files;
    }

    /**
     * Analyze dependencies
     * @param {string} projectPath - Project path
     * @returns {Promise<Object>} Dependencies analysis
     */
    async analyzeDependencies(projectPath) {
        const fs = require('fs').promises;
        const path = require('path');

        const analysis = {
            hasPackageJson: false,
            dependencies: [],
            devDependencies: [],
            outdatedPackages: [],
            unusedPackages: []
        };

        try {
            const packageJsonPath = path.join(projectPath, 'package.json');
            const packageJsonExists = await fs.access(packageJsonPath).then(() => true).catch(() => false);

            if (packageJsonExists) {
                analysis.hasPackageJson = true;
                const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
                
                analysis.dependencies = Object.keys(packageJson.dependencies || {});
                analysis.devDependencies = Object.keys(packageJson.devDependencies || {});
            }
        } catch (error) {
            this.logger.warn('AutoRefactorHandler: Failed to analyze dependencies', {
                error: error.message
            });
        }

        return analysis;
    }

    /**
     * Analyze architecture
     * @param {string} projectPath - Project path
     * @returns {Promise<Object>} Architecture analysis
     */
    async analyzeArchitecture(projectPath) {
        const analysis = {
            structure: {},
            patterns: [],
            violations: [],
            complexity: 'medium'
        };

        try {
            // Basic architecture analysis
            const dirs = await this.getTopLevelDirectories(projectPath);
            analysis.structure = {
                directories: dirs,
                hasSrc: dirs.includes('src'),
                hasComponents: dirs.includes('components') || dirs.includes('src/components'),
                hasServices: dirs.includes('services') || dirs.includes('src/services'),
                hasUtils: dirs.includes('utils') || dirs.includes('src/utils')
            };
        } catch (error) {
            this.logger.warn('AutoRefactorHandler: Failed to analyze architecture', {
                error: error.message
            });
        }

        return analysis;
    }

    /**
     * Get top-level directories
     * @param {string} projectPath - Project path
     * @returns {Promise<Array>} Array of directory names
     */
    async getTopLevelDirectories(projectPath) {
        const fs = require('fs').promises;
        const path = require('path');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

        try {
            const entries = await fs.readdir(projectPath, { withFileTypes: true });
            return entries
                .filter(entry => entry.isDirectory())
                .map(entry => entry.name);
        } catch (error) {
            return [];
        }
    }

    /**
     * Analyze code quality
     * @param {string} projectPath - Project path
     * @returns {Promise<Object>} Code quality analysis
     */
    async analyzeCodeQuality(projectPath) {
        const analysis = {
            maintainability: 'medium',
            testability: 'medium',
            readability: 'medium',
            issues: []
        };

        // Basic code quality assessment based on file structure
        const largeFiles = await this.findLargeFiles(projectPath);
        
        if (largeFiles.length > 5) {
            analysis.maintainability = 'low';
            analysis.issues.push('Many large files detected');
        }

        return analysis;
    }

    /**
     * Identify refactoring opportunities
     * @param {Object} analysis - Project analysis
     * @returns {Array} Array of refactoring opportunities
     */
    identifyRefactoringOpportunities(analysis) {
        const opportunities = [];

        // Large files opportunity
        if (analysis.largeFiles.length > 0) {
            opportunities.push({
                type: 'split_large_files',
                priority: 'high',
                reason: `${analysis.largeFiles.length} files exceed 500 lines`,
                files: analysis.largeFiles
            });
        }

        // Dependencies opportunity
        if (analysis.dependencies.hasPackageJson && analysis.dependencies.dependencies.length > 20) {
            opportunities.push({
                type: 'clean_dependencies',
                priority: 'medium',
                reason: 'Many dependencies detected',
                count: analysis.dependencies.dependencies.length
            });
        }

        // Architecture opportunity
        if (!analysis.architecture.structure.hasSrc) {
            opportunities.push({
                type: 'organize_modules',
                priority: 'medium',
                reason: 'No src directory detected',
                suggestion: 'Organize code into src directory'
            });
        }

        // Code quality opportunity
        if (analysis.codeQuality.maintainability === 'low') {
            opportunities.push({
                type: 'restructure_architecture',
                priority: 'high',
                reason: 'Low maintainability detected',
                issues: analysis.codeQuality.issues
            });
        }

        return opportunities;
    }
}

module.exports = AutoRefactorHandler; 