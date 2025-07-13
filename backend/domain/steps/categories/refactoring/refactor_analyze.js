/**
 * RefactorAnalyzeStep - Analyzes project for refactoring opportunities
 * Identifies large files and code quality issues that need refactoring
 */

const config = {
  name: 'RefactorAnalyze',
  type: 'refactoring',
  description: 'Analyzes project structure to identify refactoring opportunities',
  category: 'refactoring',
  version: '1.0.0',
};

async function execute(context, options = {}) {
  const projectPath = context.projectPath;
  const projectAnalyzer = context.projectAnalyzer;
  const codeQualityAnalyzer = context.codeQualityAnalyzer;
  const architectureAnalyzer = context.architectureAnalyzer;
  const projectAnalysisRepository = context.projectAnalysisRepository;

  if (!projectPath) throw new Error('Project path not found in context');
  if (!projectAnalyzer) throw new Error('Project analyzer not found in context');

  console.log('🔍 [RefactorAnalyze] Starting project analysis for refactoring...');

  try {
    // Run comprehensive analysis using available analyzers
    const analysisResults = {
      projectAnalysis: null,
      codeQuality: null,
      architecture: null
    };

    // 1. Project Analysis
    if (projectAnalyzer) {
      console.log('📊 [RefactorAnalyze] Running project analysis...');
      analysisResults.projectAnalysis = await projectAnalyzer.analyzeProject(projectPath, {
        includeRepoStructure: true,
        includeDependencies: true,
        ...options
      });
    }

    // 2. Code Quality Analysis
    if (codeQualityAnalyzer) {
      console.log('🎯 [RefactorAnalyze] Running code quality analysis...');
      analysisResults.codeQuality = await codeQualityAnalyzer.analyzeCodeQuality(projectPath, {
        includeMetrics: true,
        includeIssues: true,
        includeSuggestions: true,
        ...options
      });
    }

    // 3. Architecture Analysis
    if (architectureAnalyzer) {
      console.log('🏗️ [RefactorAnalyze] Running architecture analysis...');
      analysisResults.architecture = await architectureAnalyzer.analyzeArchitecture(projectPath, {
        includePatterns: true,
        includeViolations: true,
        ...options
      });
    }

    // Extract large files from analysis
    const largeFiles = extractLargeFiles(analysisResults);

    console.log(`✅ [RefactorAnalyze] Analysis completed. Found ${largeFiles.length} large files.`);
    console.log(`🔍 [RefactorAnalyze] Sample large files:`, largeFiles.slice(0, 3)); // Debug first 3 files

    const result = {
      success: true,
      analysisResults,
      largeFiles,
      recommendations: generateRecommendations(largeFiles),
      metadata: {
        projectPath,
        analysisTimestamp: new Date().toISOString(),
        totalFiles: largeFiles.length
      }
    };

    console.log(`🔍 [RefactorAnalyze] Returning result with largeFiles:`, {
      hasLargeFiles: !!result.largeFiles,
      largeFilesLength: result.largeFiles ? result.largeFiles.length : 0,
      resultKeys: Object.keys(result)
    });

    return result;

  } catch (error) {
    console.error('❌ [RefactorAnalyze] Analysis failed:', error);
    throw error;
  }
}

function extractLargeFiles(analysisResults) {
  const largeFiles = [];
  const processedPaths = new Set();

  console.log(`🔍 [RefactorAnalyze] Extracting large files from analysis results:`, {
    hasProjectAnalysis: !!analysisResults.projectAnalysis,
    hasCodeQuality: !!analysisResults.codeQuality,
    hasArchitecture: !!analysisResults.architecture,
    projectAnalysisKeys: analysisResults.projectAnalysis ? Object.keys(analysisResults.projectAnalysis) : [],
    codeQualityKeys: analysisResults.codeQuality ? Object.keys(analysisResults.codeQuality) : [],
    architectureKeys: analysisResults.architecture ? Object.keys(analysisResults.architecture) : []
  });

  // Check multiple possible locations for large files data
  const possibleSources = [
    analysisResults.codeQuality?.data?.largeFiles,
    analysisResults.codeQuality?.largeFiles,
    analysisResults.codeQuality?.realMetrics?.largeFiles,
    analysisResults.largeFiles,
    analysisResults.analysis?.codeQuality?.largeFiles,
    analysisResults.analysis?.codeQuality?.data?.largeFiles
  ];

  console.log(`🔍 [RefactorAnalyze] Checking possible sources:`, possibleSources.map((source, index) => ({
    sourceIndex: index,
    hasData: !!source,
    isArray: Array.isArray(source),
    length: Array.isArray(source) ? source.length : 'N/A'
  })));

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
