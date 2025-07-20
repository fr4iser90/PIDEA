/**
 * Performance Analysis Step - Core Analysis Step
 * Analyzes performance metrics and optimizations
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const fs = require('fs').promises;
const path = require('path');

const logger = new Logger('performance_analysis_step');

// Step configuration
const config = {
  name: 'PerformanceAnalysisStep',
  type: 'analysis',
  description: 'Analyzes performance metrics and optimizations',
  category: 'analysis',
  version: '1.0.0',
  dependencies: [],
  settings: {
    timeout: 45000,
    includeMetrics: true,
    includeOptimizations: true,
    includeBottlenecks: true
  },
  validation: {
    requiredFiles: ['package.json'],
    supportedProjects: ['nodejs', 'react', 'vue', 'angular', 'express', 'nest']
  }
};

class PerformanceAnalysisStep {
  constructor() {
    this.name = 'PerformanceAnalysisStep';
    this.description = 'Analyzes performance metrics and optimizations';
    this.category = 'analysis';
    this.dependencies = [];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = PerformanceAnalysisStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`⚡ Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);

      const projectPath = context.projectPath;
      
      logger.info(`📊 Starting performance analysis for: ${projectPath}`);

      // Execute performance analysis
      const performance = await this.analyzePerformance(projectPath, {
        includeMetrics: context.includeMetrics !== false,
        includeOptimizations: context.includeOptimizations !== false,
        includeBottlenecks: context.includeBottlenecks !== false
      });

      // Clean and format result
      const cleanResult = this.cleanResult(performance);

      logger.info(`✅ Performance analysis completed successfully`);

      return {
        success: true,
        result: cleanResult,
        metadata: {
          stepName: this.name,
          projectPath,
          analysisType: 'performance',
          timestamp: new Date()
        }
      };

    } catch (error) {
      logger.error(`❌ Performance analysis failed: ${error.message}`);
      
      return {
        success: false,
        error: error.message,
        metadata: {
          stepName: this.name,
          projectPath: context.projectPath,
          analysisType: 'performance',
          timestamp: new Date()
        }
      };
    }
  }

  /**
   * Analyze performance for a project
   * @param {string} projectPath - Path to the project
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Performance analysis result
   */
  async analyzePerformance(projectPath, options = {}) {
    try {
      const result = {
        score: 0,
        metrics: {},
        optimizations: [],
        bottlenecks: [],
        summary: {}
      };

      // Analyze bundle size and dependencies
      const bundleAnalysis = await this.analyzeBundleSize(projectPath);
      
      // Analyze code performance patterns
      const codeAnalysis = await this.analyzeCodePerformance(projectPath);
      
      // Analyze build configuration
      const buildAnalysis = await this.analyzeBuildConfiguration(projectPath);
      
      // Analyze resource usage patterns
      const resourceAnalysis = await this.analyzeResourceUsage(projectPath);

      // Calculate overall performance score
      result.score = this.calculatePerformanceScore({
        bundle: bundleAnalysis,
        code: codeAnalysis,
        build: buildAnalysis,
        resources: resourceAnalysis
      });

      // Aggregate metrics
      if (options.includeMetrics) {
        result.metrics = {
          bundle: bundleAnalysis.metrics,
          code: codeAnalysis.metrics,
          build: buildAnalysis.metrics,
          resources: resourceAnalysis.metrics
        };
      }

      // Aggregate optimizations
      if (options.includeOptimizations) {
        result.optimizations = [
          ...bundleAnalysis.optimizations,
          ...codeAnalysis.optimizations,
          ...buildAnalysis.optimizations,
          ...resourceAnalysis.optimizations
        ];
      }

      // Aggregate bottlenecks
      if (options.includeBottlenecks) {
        result.bottlenecks = [
          ...bundleAnalysis.bottlenecks,
          ...codeAnalysis.bottlenecks,
          ...buildAnalysis.bottlenecks,
          ...resourceAnalysis.bottlenecks
        ];
      }

      // Create summary
      result.summary = {
        overallScore: result.score,
        totalOptimizations: result.optimizations.length,
        totalBottlenecks: result.bottlenecks.length,
        performanceLevel: this.getPerformanceLevel(result.score)
      };

      return result;

    } catch (error) {
      logger.error(`Performance analysis failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Analyze bundle size and dependencies
   */
  async analyzeBundleSize(projectPath) {
    try {
      const metrics = {};
      const optimizations = [];
      const bottlenecks = [];

      // Analyze package.json for dependencies
      const packageJsonPath = path.join(projectPath, 'package.json');
      try {
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
        const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
        
        metrics.totalDependencies = Object.keys(dependencies).length;
        metrics.productionDependencies = Object.keys(packageJson.dependencies || {}).length;
        metrics.devDependencies = Object.keys(packageJson.devDependencies || {}).length;

        // Check for large dependencies
        const largeDependencies = [
          'lodash', 'moment', 'jquery', 'bootstrap', 'material-ui'
        ];

        const foundLargeDeps = Object.keys(dependencies).filter(dep => 
          largeDependencies.includes(dep)
        );

        if (foundLargeDeps.length > 0) {
          bottlenecks.push({
            type: 'bundle',
            severity: 'medium',
            message: `Large dependencies detected: ${foundLargeDeps.join(', ')}`,
            suggestion: 'Consider using lighter alternatives or tree-shaking'
          });
        }

        if (metrics.totalDependencies > 50) {
          bottlenecks.push({
            type: 'bundle',
            severity: 'medium',
            message: 'High number of dependencies detected',
            suggestion: 'Review and remove unused dependencies'
          });
        }

        // Check for optimization tools
        if (packageJson.devDependencies) {
          const optimizationTools = [
            'webpack-bundle-analyzer', 'source-map-explorer', 'bundle-analyzer'
          ];

          const foundTools = Object.keys(packageJson.devDependencies).filter(dep =>
            optimizationTools.some(tool => dep.includes(tool))
          );

          if (foundTools.length > 0) {
            optimizations.push({
              type: 'bundle',
              message: 'Bundle analysis tools detected',
              suggestion: 'Use these tools to identify large packages'
            });
          }
        }

      } catch (error) {
        bottlenecks.push({
          type: 'bundle',
          severity: 'high',
          message: 'Could not read package.json',
          suggestion: 'Ensure package.json exists and is valid JSON'
        });
      }

      return { metrics, optimizations, bottlenecks };
    } catch (error) {
      logger.error(`Bundle analysis failed: ${error.message}`);
      return { metrics: {}, optimizations: [], bottlenecks: [] };
    }
  }

  /**
   * Analyze code performance patterns
   */
  async analyzeCodePerformance(projectPath) {
    try {
      const metrics = {};
      const optimizations = [];
      const bottlenecks = [];
      const jsFiles = await this.getJavaScriptFiles(projectPath);

      metrics.totalFiles = jsFiles.length;
      let filesWithIssues = 0;

      for (const file of jsFiles.slice(0, 30)) { // Limit for performance
        try {
          const content = await fs.readFile(file, 'utf8');
          const fileAnalysis = this.analyzeFilePerformance(content, file);
          
          if (fileAnalysis.bottlenecks.length > 0) {
            filesWithIssues++;
            bottlenecks.push(...fileAnalysis.bottlenecks);
          }
          
          if (fileAnalysis.optimizations.length > 0) {
            optimizations.push(...fileAnalysis.optimizations);
          }
        } catch (error) {
          // Skip files that can't be read
        }
      }

      metrics.filesWithIssues = filesWithIssues;

      return { metrics, optimizations, bottlenecks };
    } catch (error) {
      logger.error(`Code performance analysis failed: ${error.message}`);
      return { metrics: {}, optimizations: [], bottlenecks: [] };
    }
  }

  /**
   * Analyze build configuration
   */
  async analyzeBuildConfiguration(projectPath) {
    try {
      const metrics = {};
      const optimizations = [];
      const bottlenecks = [];

      // Check for common build configuration files
      const buildFiles = [
        'webpack.config.js',
        'vite.config.js',
        'rollup.config.js',
        'babel.config.js',
        'tsconfig.json',
        'package.json'
      ];

      for (const buildFile of buildFiles) {
        const buildPath = path.join(projectPath, buildFile);
        try {
          const content = await fs.readFile(buildPath, 'utf8');
          const analysis = this.analyzeBuildFile(buildFile, content);
          optimizations.push(...analysis.optimizations);
          bottlenecks.push(...analysis.bottlenecks);
        } catch (error) {
          // File doesn't exist or can't be read
        }
      }

      return { metrics, optimizations, bottlenecks };
    } catch (error) {
      logger.error(`Build configuration analysis failed: ${error.message}`);
      return { metrics: {}, optimizations: [], bottlenecks: [] };
    }
  }

  /**
   * Analyze resource usage patterns
   */
  async analyzeResourceUsage(projectPath) {
    try {
      const metrics = {};
      const optimizations = [];
      const bottlenecks = [];

      // Analyze static assets
      const staticAssets = await this.getStaticAssets(projectPath);
      metrics.staticAssets = staticAssets.length;

      // Check for large assets
      const largeAssets = staticAssets.filter(asset => 
        asset.size > 1024 * 1024 // 1MB
      );

      if (largeAssets.length > 0) {
        bottlenecks.push({
          type: 'resources',
          severity: 'medium',
          message: `${largeAssets.length} large static assets detected`,
          suggestion: 'Optimize images and compress large files'
        });
      }

      // Check for optimization opportunities
      const imageFiles = staticAssets.filter(asset => 
        /\.(jpg|jpeg|png|gif|svg|webp)$/i.test(asset.path)
      );

      if (imageFiles.length > 0) {
        optimizations.push({
          type: 'resources',
          message: `${imageFiles.length} image files detected`,
          suggestion: 'Use modern image formats (WebP) and implement lazy loading'
        });
      }

      return { metrics, optimizations, bottlenecks };
    } catch (error) {
      logger.error(`Resource usage analysis failed: ${error.message}`);
      return { metrics: {}, optimizations: [], bottlenecks: [] };
    }
  }

  /**
   * Analyze file performance patterns
   */
  analyzeFilePerformance(content, filePath) {
    const optimizations = [];
    const bottlenecks = [];

    // Check for performance anti-patterns
    const antiPatterns = [
      { pattern: /\.forEach\s*\(.*=>\s*\{[\s\S]*await/, message: 'Async operations in forEach detected' },
      { pattern: /for\s*\(\s*let\s+i\s*=\s*0\s*;\s*i\s*<\s*array\.length\s*;\s*i\+\+\)/, message: 'Inefficient for loop detected' },
      { pattern: /\.map\s*\(.*=>\s*\{[\s\S]*\.map/, message: 'Nested map operations detected' },
      { pattern: /JSON\.parse\s*\(.*JSON\.stringify/, message: 'Unnecessary JSON parse/stringify detected' },
      { pattern: /setTimeout\s*\(.*0\)/, message: 'setTimeout with 0 delay detected' }
    ];

    antiPatterns.forEach(({ pattern, message }) => {
      if (pattern.test(content)) {
        bottlenecks.push({
          type: 'code',
          severity: 'medium',
          file: path.relative(process.cwd(), filePath),
          message,
          suggestion: 'Consider more efficient alternatives'
        });
      }
    });

    // Check for performance optimizations
    const optimizationPatterns = [
      { pattern: /useMemo\s*\(/, message: 'React useMemo detected' },
      { pattern: /useCallback\s*\(/, message: 'React useCallback detected' },
      { pattern: /React\.memo\s*\(/, message: 'React.memo detected' },
      { pattern: /lazy\s*\(/, message: 'Code splitting with lazy detected' },
      { pattern: /webpackChunkName/, message: 'Webpack chunk naming detected' }
    ];

    optimizationPatterns.forEach(({ pattern, message }) => {
      if (pattern.test(content)) {
        optimizations.push({
          type: 'code',
          file: path.relative(process.cwd(), filePath),
          message,
          suggestion: 'Good performance optimization practice'
        });
      }
    });

    return { optimizations, bottlenecks };
  }

  /**
   * Analyze build configuration file
   */
  analyzeBuildFile(filename, content) {
    const optimizations = [];
    const bottlenecks = [];

    switch (filename) {
      case 'webpack.config.js':
        if (content.includes('optimization')) {
          optimizations.push({
            type: 'build',
            message: 'Webpack optimization configured',
            suggestion: 'Review optimization settings for best performance'
          });
        }
        
        if (!content.includes('splitChunks')) {
          bottlenecks.push({
            type: 'build',
            severity: 'medium',
            file: filename,
            message: 'No code splitting configuration detected',
            suggestion: 'Configure splitChunks for better caching'
          });
        }
        break;

      case 'vite.config.js':
        if (content.includes('build.rollupOptions')) {
          optimizations.push({
            type: 'build',
            message: 'Vite build optimization configured',
            suggestion: 'Review rollup options for best performance'
          });
        }
        break;

      case 'tsconfig.json':
        try {
          const config = JSON.parse(content);
          if (config.compilerOptions && config.compilerOptions.incremental) {
            optimizations.push({
              type: 'build',
              message: 'TypeScript incremental compilation enabled',
              suggestion: 'Good for build performance'
            });
          }
        } catch (error) {
          // Invalid JSON
        }
        break;
    }

    return { optimizations, bottlenecks };
  }

  /**
   * Calculate performance score based on analysis results
   */
  calculatePerformanceScore(analyses) {
    let score = 100;

    // Deduct points for bottlenecks
    const totalBottlenecks = analyses.bundle.bottlenecks.length + 
                            analyses.code.bottlenecks.length + 
                            analyses.build.bottlenecks.length + 
                            analyses.resources.bottlenecks.length;

    score -= totalBottlenecks * 3; // 3 points per bottleneck

    // Add points for optimizations
    const totalOptimizations = analyses.bundle.optimizations.length + 
                              analyses.code.optimizations.length + 
                              analyses.build.optimizations.length + 
                              analyses.resources.optimizations.length;

    score += totalOptimizations * 2; // 2 points per optimization

    // Deduct points for large bundle
    if (analyses.bundle.metrics.totalDependencies > 100) {
      score -= 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get performance level based on score
   */
  getPerformanceLevel(score) {
    if (score >= 90) return 'excellent';
    if (score >= 80) return 'good';
    if (score >= 70) return 'fair';
    if (score >= 60) return 'poor';
    return 'critical';
  }

  // Helper methods
  async getJavaScriptFiles(projectPath) {
    const allFiles = await this.getAllFiles(projectPath);
    return allFiles.filter(file => 
      file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.ts') || file.endsWith('.tsx')
    );
  }

  async getAllFiles(dir) {
    const files = [];
    try {
      const items = await fs.readdir(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = await fs.stat(fullPath);
        if (stat.isFile()) {
          files.push(fullPath);
        } else if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          files.push(...(await this.getAllFiles(fullPath)));
        }
      }
    } catch (error) {
      // Skip directories that can't be read
    }
    return files;
  }

  async getStaticAssets(projectPath) {
    const allFiles = await this.getAllFiles(projectPath);
    const assetExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.css', '.js', '.woff', '.woff2', '.ttf', '.eot'];
    
    const assets = [];
    for (const file of allFiles) {
      const ext = path.extname(file).toLowerCase();
      if (assetExtensions.includes(ext)) {
        try {
          const stat = await fs.stat(file);
          assets.push({
            path: file,
            size: stat.size,
            extension: ext
          });
        } catch (error) {
          // Skip files that can't be read
        }
      }
    }
    
    return assets;
  }

  cleanResult(result) {
    if (!result) return null;
    
    // Remove sensitive information and large objects
    const clean = { ...result };
    
    // Remove internal properties
    delete clean._internal;
    delete clean.debug;
    
    return clean;
  }

  validateContext(context) {
    if (!context.projectPath) {
      throw new Error('Project path is required for performance analysis');
    }
  }
}

// Create instance for execution
const stepInstance = new PerformanceAnalysisStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
}; 