const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const Task = require('@entities/Task');
const TaskStatus = require('@value-objects/TaskStatus');
const TaskPriority = require('@value-objects/TaskPriority');
const TaskType = require('@value-objects/TaskType');
const ProjectAnalysis = require('@entities/ProjectAnalysis');

/**
 * RefactorCode Step - Performs real project analysis and generates refactoring tasks
 * No hardcoded fallbacks - only real analysis results
 */

// Step configuration
const config = {
  name: 'RefactorCode',
  type: 'refactoring',
  description: 'Analyze project and generate refactoring tasks based on real file analysis',
  category: 'refactoring',
  version: '1.0.0',
  dependencies: [
    'eventBus',
    'analysisRepository', 
    'projectAnalysisRepository',
    'taskRepository',
    'logger'
  ],
  settings: {
    maxFileSize: 200, // Lines threshold
    supportedExtensions: ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt'],
    analysisRefreshInterval: 30 * 60 * 1000, // 30 minutes
    targetLineCount: 500
  },
  validation: {
    requiredContext: ['projectPath'],
    optionalContext: ['workspacePath']
  }
};

/**
 * Execute the refactor code step
 * @param {Object} context - Workflow context
 * @param {Object} options - Execution options
 * @returns {Promise<Object>} Step result with generated tasks
 */
async function execute(context, options = {}) {
  const logger = context.logger || console;
  
  try {
    logger.info('🚀 [RefactorCode] Starting real project analysis for refactoring...');
    
    const projectPath = context.projectPath || context.workspacePath;
    if (!projectPath) {
      throw new Error('Project path is required for refactoring analysis');
    }

    // Get dependencies from context
    const eventBus = context.eventBus;
    const analysisRepository = context.analysisRepository;
    const projectAnalysisRepository = context.projectAnalysisRepository;
    const taskRepository = context.taskRepository;

    // 1. Run comprehensive real analysis
    const analysisResults = await runComprehensiveAnalysis(projectPath, {
      logger,
      projectAnalysisRepository
    });
    
    // 2. Identify large files from real analysis
    const largeFiles = identifyLargeFiles(analysisResults, { logger });
    
    // 3. Create refactoring tasks for each large file
    const createdTasks = await createRefactoringTasks(largeFiles, projectPath, {
      logger,
      taskRepository
    });
    
    logger.info(`✅ [RefactorCode] Analysis completed. Found ${createdTasks.length} refactoring tasks.`);
    
    return {
      success: true,
      message: `Generated ${createdTasks.length} refactoring tasks based on real project analysis`,
      tasks: createdTasks,
      largeFiles: largeFiles,
      analysisResults: analysisResults
    };
    
  } catch (error) {
    logger.error('❌ [RefactorCode] Refactoring analysis failed:', error);
    throw error;
  }
}

/**
 * Run comprehensive real analysis of the project
 * @param {string} projectPath - Project path
 * @param {Object} dependencies - Dependencies
 * @returns {Promise<Object>} Analysis results
 */
async function runComprehensiveAnalysis(projectPath, dependencies = {}) {
  const { logger, projectAnalysisRepository } = dependencies;
  
  try {
    // Check if analysis data needs refresh
    const needsRefresh = await needsAnalysisRefresh(projectPath, { logger, projectAnalysisRepository });
    if (needsRefresh) {
      logger.info('🔄 [RefactorCode] Analysis data needs refresh, running fresh analysis...');
      return await createStandardAnalysis(projectPath, path.basename(projectPath), { logger, projectAnalysisRepository });
    }
    
    // Extract projectId from the path
    const projectId = path.basename(projectPath);
    
    // Load the latest analyses from the database
    const latestArchitectureAnalysis = await projectAnalysisRepository.findLatestByProjectIdAndType(projectId, 'architecture');
    const latestCodeQualityAnalysis = await projectAnalysisRepository.findLatestByProjectIdAndType(projectId, 'code-quality');
    const latestDependenciesAnalysis = await projectAnalysisRepository.findLatestByProjectIdAndType(projectId, 'dependencies');
    
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
      logger.info('⚠️ [RefactorCode] No analyses found in database, creating standard analysis...');
      return await createStandardAnalysis(projectPath, projectId, { logger, projectAnalysisRepository });
    }
    
    // Validate and fix line counts for all large files
    const validatedLargeFiles = [];
    for (const file of largeFiles) {
      let lines = file.lines;
      
      // If lines is undefined, null, or 0, try to count them manually
      if (!lines || lines <= 0) {
        try {
          const fullPath = path.join(projectPath, file.file || file.path);
          lines = await countLines(fullPath);
          logger.info(`📊 [RefactorCode] Manually counted lines for ${file.file || file.path}: ${lines}`);
        } catch (error) {
          logger.warn(`⚠️ [RefactorCode] Could not count lines for ${file.file || file.path}: ${error.message}`);
          continue; // Skip this file
        }
      }
      
      // Only include files with valid line counts
      if (lines && lines > 0) {
        validatedLargeFiles.push({
          file: file.file || file.path,
          path: file.path || file.file,
          lines: parseInt(lines) || 0,
          package: file.package || getPackageFromPath(file.file || file.path)
        });
      }
    }
    
    logger.info(`✅ [RefactorCode] Found ${validatedLargeFiles.length} valid large files from analysis data`);
    
    return {
      codeQuality: { data: { largeFiles: validatedLargeFiles } },
      largeFiles: validatedLargeFiles,
      analysis: combinedAnalysis
    };
  } catch (error) {
    logger.error('❌ [RefactorCode] Error reading analysis from database:', error);
    throw error;
  }
}

/**
 * Create standard analysis when no database analysis exists
 * @param {string} projectPath - Project path
 * @param {string} projectId - Project ID
 * @param {Object} dependencies - Dependencies
 * @returns {Promise<Object>} Analysis results
 */
async function createStandardAnalysis(projectPath, projectId, dependencies = {}) {
  const { logger, projectAnalysisRepository } = dependencies;
  
  try {
    logger.info('🔍 [RefactorCode] Creating standard analysis for project:', projectId);
    
    const largeFiles = [];
    const scanDirectory = async (dir) => {
      try {
        const items = await fs.readdir(dir);
        for (const item of items) {
          const fullPath = path.join(dir, item);
          const stats = await fs.stat(fullPath);
          
          if (stats.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
            await scanDirectory(fullPath);
          } else if (stats.isFile() && isCodeFile(item)) {
            const relativePath = path.relative(projectPath, fullPath);
            const lineCount = await countLines(fullPath);
            
            if (lineCount > config.settings.maxFileSize) { // Files with more than threshold lines
              largeFiles.push({
                file: relativePath,
                path: relativePath,
                lines: lineCount,
                package: getPackageFromPath(relativePath)
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
    if (projectAnalysisRepository) {
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
          source: 'refactor-code-step',
          scanMethod: 'file-system-scan',
          threshold: config.settings.maxFileSize
        }
      });
      
      // Save to database
      await projectAnalysisRepository.save(standardAnalysis);
      logger.info('✅ [RefactorCode] Standard analysis saved to database');
    }
    
    return {
      codeQuality: {
        largeFiles: largeFiles,
        totalFiles: largeFiles.length,
        averageLines: largeFiles.length > 0 ? Math.round(largeFiles.reduce((sum, file) => sum + file.lines, 0) / largeFiles.length) : 0
      },
      largeFiles: largeFiles
    };
    
  } catch (error) {
    logger.error('❌ [RefactorCode] Error creating standard analysis:', error);
    return {
      codeQuality: { largeFiles: [] },
      largeFiles: []
    };
  }
}

/**
 * Check if file is a code file
 * @param {string} filename - File name
 * @returns {boolean} True if code file
 */
function isCodeFile(filename) {
  return config.settings.supportedExtensions.some(ext => filename.endsWith(ext));
}

/**
 * Count lines in a file
 * @param {string} filePath - File path
 * @returns {Promise<number>} Line count
 */
async function countLines(filePath) {
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
function getPackageFromPath(filePath) {
  const parts = filePath.split('/');
  if (parts.length > 1) {
    return parts[0];
  }
  return 'root';
}

/**
 * Identify large files from analysis results
 * @param {Object} analysisResults - Analysis results
 * @param {Object} dependencies - Dependencies
 * @returns {Array} Array of large files
 */
function identifyLargeFiles(analysisResults, dependencies = {}) {
  const { logger } = dependencies;
  const largeFiles = [];
  const processedPaths = new Set(); // Prevent duplicate tasks
  
  logger.info('🔍 [RefactorCode] Analyzing results structure for large files');
  
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
        logger.info(`📁 [RefactorCode] Found large files in source:`, source.length, 'files');
        
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
            
            logger.info(`📊 [RefactorCode] File ${filePath}: lines=${lines}, original=${file.lines}`);
            
            if (lines > 0) {
              largeFiles.push({
                path: filePath,
                lines: lines,
                package: file.package || getPackageFromPath(filePath),
                priority: calculatePriority(lines),
                estimatedTime: estimateRefactoringTime(lines)
              });
              processedPaths.add(filePath);
            }
          }
        });
      }
    }
  }
  
  logger.info(`🔍 [RefactorCode] Found ${largeFiles.length} large files to refactor:`, largeFiles.map(f => `${f.path} (${f.lines} lines)`));
  
  // Sort by priority (largest files first)
  return largeFiles.sort((a, b) => b.lines - a.lines);
}

/**
 * Calculate priority based on line count
 * @param {number} lines - Line count
 * @returns {string} Priority level
 */
function calculatePriority(lines) {
  if (lines > 1000) return 'high';
  if (lines > 750) return 'medium';
  return 'low';
}

/**
 * Estimate refactoring time
 * @param {number} lines - Line count
 * @returns {string} Estimated time
 */
function estimateRefactoringTime(lines) {
  // Rough estimate: 1 hour per 200 lines
  const hours = Math.ceil(lines / 200);
  return `${hours} hour${hours > 1 ? 's' : ''}`;
}

/**
 * Create refactoring tasks for large files
 * @param {Array} largeFiles - Array of large files
 * @param {string} projectPath - Project path
 * @param {Object} dependencies - Dependencies
 * @returns {Promise<Array>} Array of created tasks
 */
async function createRefactoringTasks(largeFiles, projectPath, dependencies = {}) {
  const { logger, taskRepository } = dependencies;
  const tasks = [];
  
  logger.info(`🔍 [RefactorCode] Creating refactoring tasks for ${largeFiles.length} files...`);
  
  for (const file of largeFiles) {
    try {
      const task = await createRefactoringTask(file, projectPath, { logger, taskRepository });
      if (task) {
        tasks.push(task);
      }
    } catch (error) {
      logger.error(`❌ [RefactorCode] Failed to create task for ${file.path}:`, error.message);
    }
  }
  
  logger.info(`✅ [RefactorCode] Successfully created ${tasks.length} refactoring tasks`);
  
  return tasks;
}

/**
 * Create a single refactoring task
 * @param {Object} fileInfo - File information
 * @param {string} projectPath - Project path
 * @param {Object} dependencies - Dependencies
 * @returns {Promise<Object|null>} Created task or null
 */
async function createRefactoringTask(fileInfo, projectPath, dependencies = {}) {
  const { logger, taskRepository } = dependencies;
  
  const taskId = `refactor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const fileName = path.basename(fileInfo.path, path.extname(fileInfo.path));
  const fileExt = path.extname(fileInfo.path);
  
  // Validate and fix file info
  let lines = fileInfo.lines;
  if (!lines || lines <= 0) {
    // Try to count lines manually if not provided
    try {
      lines = await countLines(fileInfo.path);
      logger.info(`📊 [RefactorCode] Manually counted lines for ${fileInfo.path}: ${lines}`);
    } catch (error) {
      logger.warn(`⚠️ [RefactorCode] Could not count lines for ${fileInfo.path}: ${error.message}`);
      return null;
    }
  }
  
  if (!lines || lines <= 0) {
    logger.warn(`⚠️ [RefactorCode] Invalid line count for ${fileInfo.path}: ${lines}, skipping...`);
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
      targetLines: `<${config.settings.targetLineCount}`,
      estimatedTime: fileInfo.estimatedTime,
      refactoringSteps: generateRefactoringSteps(fileInfo),
      analysisId: `refactor_code_step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
  };
  
  logger.info(`✅ [RefactorCode] Created refactoring task for ${fileInfo.path} (${fileInfo.lines} lines)`);
  
  return task;
}

/**
 * Generate refactoring steps for a file
 * @param {Object} fileInfo - File information
 * @returns {Array} Array of refactoring steps
 */
function generateRefactoringSteps(fileInfo) {
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
 * Check if analysis data needs refresh
 * @param {string} projectPath - Project path
 * @param {Object} dependencies - Dependencies
 * @returns {Promise<boolean>} True if refresh is needed
 */
async function needsAnalysisRefresh(projectPath, dependencies = {}) {
  const { logger, projectAnalysisRepository } = dependencies;
  
  try {
    const projectId = path.basename(projectPath);
    
    if (!projectAnalysisRepository || typeof projectAnalysisRepository.findLatestByProjectId !== 'function') {
      logger.warn('⚠️ [RefactorCode] projectAnalysisRepository.findLatestByProjectId not available');
      return true; // Default to refresh if repository not available
    }
    
    const latestAnalysis = await projectAnalysisRepository.findLatestByProjectId(projectId);
    
    if (!latestAnalysis) {
      logger.info('🔄 [RefactorCode] No analysis found, refresh needed');
      return true; // No analysis exists, need refresh
    }
    
    // Check if analysis is older than refresh interval
    const analysisAge = Date.now() - new Date(latestAnalysis.createdAt).getTime();
    
    if (analysisAge > config.settings.analysisRefreshInterval) {
      logger.info(`🔄 [RefactorCode] Analysis data is ${Math.round(analysisAge / 60000)} minutes old, refresh needed`);
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
        logger.info('🔄 [RefactorCode] Analysis data has invalid line counts, refresh needed');
        return true;
      }
    }
    
    logger.info('✅ [RefactorCode] Analysis data is current and valid');
    return false;
    
  } catch (error) {
    logger.error(`❌ [RefactorCode] Error checking analysis refresh need:`, error.message);
    return true; // Default to refresh on error
  }
}

// Export the step module
module.exports = {
  config,
  execute
};
