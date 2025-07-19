const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

/**
 * RefactorAnalyzeStep - Analyzes project for refactoring opportunities
 * Identifies large files and code quality issues that need refactoring
 * Migrated from core domain to refactoring_management framework
 */

const config = {
  name: 'RefactorAnalyze',
  type: 'refactoring',
  description: 'Analyzes project structure to identify refactoring opportunities',
  category: 'refactoring',
  version: '1.0.0',
  framework: 'refactoring_management',
  dependencies: ['projectAnalyzer', 'projectPath']
};

async function execute(context, options = {}) {
  const projectPath = context.projectPath;
  const projectAnalyzer = context.projectAnalyzer;
  const codeQualityAnalyzer = context.codeQualityAnalyzer;
  const architectureAnalyzer = context.architectureAnalyzer;
  const projectAnalysisRepository = context.projectAnalysisRepository;

  if (!projectPath) throw new Error('Project path not found in context');
  if (!projectAnalyzer) throw new Error('Project analyzer not found in context');

  logger.info('🔍 [RefactorAnalyze] Starting project analysis for refactoring');

  try {
    // Run comprehensive analysis using available analyzers
    const analysisResults = {
      projectAnalysis: null,
      codeQuality: null,
      architecture: null
    };

    // 1. Project Analysis
    if (projectAnalyzer) {
      logger.info('📊 [RefactorAnalyze] Running project analysis');
      analysisResults.projectAnalysis = await projectAnalyzer.analyzeProject(projectPath, {
        includeRepoStructure: true,
        includeDependencies: true,
        ...options
      });
    }

    // 2. Code Quality Analysis
    if (codeQualityAnalyzer) {
      logger.info('🎯 [RefactorAnalyze] Running code quality analysis');
      analysisResults.codeQuality = await codeQualityAnalyzer.analyzeCodeQuality(projectPath, {
        includeMetrics: true,
        includeIssues: true,
        includeSuggestions: true,
        ...options
      });
    }

    // 3. Architecture Analysis
    if (architectureAnalyzer) {
      logger.info('🏗️ [RefactorAnalyze] Running architecture analysis');
      analysisResults.architecture = await architectureAnalyzer.analyzeArchitecture(projectPath, {
        includePatterns: true,
        includeViolations: true,
        ...options
      });
    }

    // Extract large files from analysis
    const largeFiles = extractLargeFiles(analysisResults);

    logger.info(`✅ [RefactorAnalyze] Analysis completed. Found ${largeFiles.length} large files`);
    logger.info(`🔍 [RefactorAnalyze] Sample large files available`);

    const result = {
      success: true,
      analysisResults,
      largeFiles,
      recommendations: generateRecommendations(largeFiles),
      metadata: {
        projectPath,
        analysisTimestamp: new Date().toISOString(),
        totalFiles: largeFiles.length,
        framework: 'refactoring_management'
      }
    };

    logger.info(`🔍 [RefactorAnalyze] Returning result with largeFiles`);

    return result;

  } catch (error) {
    logger.error('❌ [RefactorAnalyze] Analysis failed:', error);
    throw error;
  }
}

function extractLargeFiles(analysisResults) {
  const largeFiles = [];
  const processedPaths = new Set();

  logger.info(`🔍 [RefactorAnalyze] Extracting large files from analysis results`);

  // Check multiple possible locations for large files data
  const possibleSources = [
    analysisResults.codeQuality?.data?.largeFiles,
    analysisResults.codeQuality?.largeFiles,
    analysisResults.codeQuality?.realMetrics?.largeFiles,
    analysisResults.largeFiles,
    analysisResults.analysis?.codeQuality?.largeFiles,
    analysisResults.analysis?.codeQuality?.data?.largeFiles
  ];

  logger.info(`🔍 [RefactorAnalyze] Checking possible sources`);

  for (const source of possibleSources) {
    if (source && Array.isArray(source)) {
      source.forEach(file => {
        const filePath = file.file || file.path;
        if (filePath && !processedPaths.has(filePath)) {
          let lines = 0;
          if (typeof file.lines === 'number') {
            lines = file.lines;
          } else if (typeof file.lines === 'string') {
            lines = parseInt(file.lines) || 0;
          } else if (file.size) {
            lines = Math.round(file.size / 50); // Estimate from file size
          }

          if (lines > 200) { // Files with more than 200 lines
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

  return largeFiles.sort((a, b) => b.lines - a.lines);
}

function generateRecommendations(largeFiles) {
  const recommendations = [];

  if (largeFiles.length === 0) {
    recommendations.push({
      type: 'no_refactoring_needed',
      severity: 'low',
      message: 'No large files found. Project structure appears to be well-organized.',
      priority: 'low'
    });
  } else {
    recommendations.push({
      type: 'refactoring_recommended',
      severity: 'high',
      message: `${largeFiles.length} large files identified for refactoring`,
      priority: 'high',
      details: {
        files: largeFiles.map(f => ({ path: f.path, lines: f.lines }))
      }
    });
  }

  return recommendations;
}

function calculatePriority(lines) {
  if (lines > 1000) return 'high';
  if (lines > 750) return 'medium';
  return 'low';
}

function estimateRefactoringTime(lines) {
  const hours = Math.ceil(lines / 200);
  return `${hours} hour${hours > 1 ? 's' : ''}`;
}

function getPackageFromPath(filePath) {
  const parts = filePath.split('/');
  if (parts.length > 1) {
    return parts[0];
  }
  return 'root';
}

module.exports = { config, execute }; 