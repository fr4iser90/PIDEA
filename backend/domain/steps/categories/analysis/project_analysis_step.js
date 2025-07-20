/**
 * Project Analysis Step - Core Analysis Step
 * Analyzes project structure and basic information
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('project_analysis_step');
const path = require('path');
const fs = require('fs').promises;

// Step configuration
const config = {
  name: 'ProjectAnalysisStep',
  type: 'analysis',
  description: 'Analyzes project structure and basic information',
  category: 'analysis',
  version: '1.0.0',
  dependencies: [], // No longer depends on projectAnalyzer
  settings: {
    timeout: 30000,
    includeRepoStructure: true,
    includeDependencies: true
  },
  validation: {
    requiredFiles: ['package.json'],
    supportedProjects: ['nodejs', 'react', 'vue', 'angular', 'express', 'nest']
  }
};

class ProjectAnalysisStep {
  constructor() {
    this.name = 'ProjectAnalysisStep';
    this.description = 'Analyzes project structure and basic information';
    this.category = 'analysis';
    this.dependencies = []; // No longer depends on projectAnalyzer
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = ProjectAnalysisStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`📁 Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);

      const projectPath = context.projectPath;
      
      logger.info(`📊 Starting project analysis for: ${projectPath}`);

      // Execute project analysis using internal logic
      const project = await this.analyzeProject(projectPath, {
        includeRepoStructure: context.includeRepoStructure !== false,
        includeDependencies: context.includeDependencies !== false
      });

      // Clean and format result
      const cleanResult = this.cleanResult(project);

      logger.info(`✅ Project analysis completed successfully`);

      return {
        success: true,
        result: cleanResult,
        metadata: {
          stepName: this.name,
          projectPath,
          analysisType: 'project',
          timestamp: new Date()
        }
      };

    } catch (error) {
      logger.error(`❌ Project analysis failed: ${error.message}`);
      
      return {
        success: false,
        error: error.message,
        metadata: {
          stepName: this.name,
          projectPath: context.projectPath,
          analysisType: 'project',
          timestamp: new Date()
        }
      };
    }
  }

  cleanResult(result) {
    if (!result) return null;
    
    // Remove sensitive information and large objects
    const clean = { ...result };
    
    // Remove large arrays that might cause memory issues
    if (clean.files && Array.isArray(clean.files) && clean.files.length > 1000) {
      clean.files = clean.files.slice(0, 1000);
      clean.filesTruncated = true;
    }
    
    // Remove internal properties
    delete clean._internal;
    delete clean.debug;
    
    return clean;
  }

  validateContext(context) {
    if (!context.projectPath) {
      throw new Error('Project path is required for project analysis');
    }
  }

  /**
   * Analyze project structure and characteristics
   * @param {string} projectPath - Path to project directory
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Project analysis results
   */
  async analyzeProject(projectPath, options = {}) {
    try {
      const stats = await fs.stat(projectPath);
      if (!stats.isDirectory()) {
        throw new Error('Project path must be a directory');
      }

      const analysis = {
        id: `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        projectPath,
        projectType: await this.detectProjectType(projectPath),
        structure: await this.analyzeStructure(projectPath, options),
        dependencies: options.includeDependencies !== false ? await this.analyzeDependencies(projectPath) : null,
        complexity: await this.calculateComplexity(projectPath),
        issues: await this.detectIssues(projectPath),
        suggestions: await this.generateSuggestions(projectPath),
        timestamp: new Date()
      };

      return analysis;
    } catch (error) {
      throw new Error(`Project analysis failed: ${error.message}`);
    }
  }

  /**
   * Detect project type based on configuration files
   * @param {string} projectPath - Project directory path
   * @returns {Promise<string>} Project type
   */
  async detectProjectType(projectPath) {
    try {
      // Check for package.json (Node.js)
      await fs.access(path.join(projectPath, 'package.json'));
      const packageJson = JSON.parse(await fs.readFile(path.join(projectPath, 'package.json'), 'utf8'));
      
      // Check for React/Vue/Angular
      if (packageJson.dependencies && packageJson.dependencies.react) {
        return 'react';
      }
      if (packageJson.dependencies && packageJson.dependencies.vue) {
        return 'vue';
      }
      if (packageJson.dependencies && packageJson.dependencies['@angular/core']) {
        return 'angular';
      }
      
      return 'nodejs';
    } catch (error) {
      // package.json not found, continue with other project types
      try {
        // Check for requirements.txt (Python)
        await fs.access(path.join(projectPath, 'requirements.txt'));
        return 'python';
      } catch {
        try {
          // Check for pom.xml (Java)
          await fs.access(path.join(projectPath, 'pom.xml'));
          return 'java';
        } catch {
          try {
            // Check for .csproj (C#)
            const files = await fs.readdir(projectPath);
            if (files.some(f => f.endsWith('.csproj'))) {
              return 'csharp';
            }
          } catch {
            // Ignore errors
          }
          
          // Default to unknown
          return 'unknown';
        }
      }
    }
  }

  /**
   * Analyze project file structure
   * @param {string} projectPath - Project directory path
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Structure analysis
   */
  async analyzeStructure(projectPath, options = {}) {
    const structure = {
      files: [],
      directories: [],
      totalFiles: 0,
      totalDirectories: 0,
      fileTypes: {},
      largestFiles: [],
      totalSize: 0
    };

    const maxDepth = options.maxDepth || 10;
    const includeHidden = options.includeHidden || false;
    const excludePatterns = options.excludePatterns || ['node_modules', '.git', 'dist', 'build', 'coverage'];
    const fileTypes = options.fileTypes || [];

    try {
      const analyzeDirectory = async (dir, relativePath = '', currentDepth = 0) => {
        if (currentDepth > maxDepth) return;
        
        const items = await fs.readdir(dir);
        for (const item of items) {
          // Skip hidden files if not included
          if (!includeHidden && item.startsWith('.')) continue;
          
          // Skip excluded patterns
          if (excludePatterns.some(pattern => item.includes(pattern))) continue;
          
          const itemPath = path.join(dir, item);
          const relativeItemPath = path.join(relativePath, item);
          
          try {
            const stats = await fs.stat(itemPath);
            
            if (stats.isDirectory()) {
              structure.directories.push({
                path: relativeItemPath,
                size: stats.size,
                isDirectory: true,
                isFile: false,
                fileCount: 0
              });
              structure.totalDirectories++;
              structure.totalSize += stats.size;
              
              // Recursively analyze subdirectory
              await analyzeDirectory(itemPath, relativeItemPath, currentDepth + 1);
            } else {
              const ext = path.extname(item);
              
              // Filter by file types if specified
              if (fileTypes.length > 0 && !fileTypes.includes(ext.replace('.', ''))) continue;
              
              structure.files.push({
                path: relativeItemPath,
                size: stats.size,
                isDirectory: false,
                isFile: true,
                extension: ext
              });
              structure.totalFiles++;
              structure.totalSize += stats.size;
              structure.fileTypes[ext] = (structure.fileTypes[ext] || 0) + 1;
              structure.largestFiles.push({
                path: relativeItemPath,
                size: stats.size
              });
            }
          } catch (error) {
            // Skip files we can't access
            continue;
          }
        }
      };
      
      await analyzeDirectory(projectPath);
      structure.largestFiles.sort((a, b) => b.size - a.size);
      structure.largestFiles = structure.largestFiles.slice(0, 10);
    } catch (error) {
      logger.error('Error analyzing structure:', error);
    }
    return structure;
  }

  /**
   * Analyze project dependencies
   * @param {string} projectPath - Project directory path
   * @returns {Promise<Object>} Dependencies analysis
   */
  async analyzeDependencies(projectPath) {
    const dependencies = {
      packageManager: null,
      dependencies: [],
      devDependencies: [],
      totalDependencies: 0,
      outdatedPackages: []
    };

    try {
      // Check for package.json
      const packageJsonPath = path.join(projectPath, 'package.json');
      await fs.access(packageJsonPath);
      
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
      dependencies.packageManager = 'npm';
      
      if (packageJson.dependencies) {
        dependencies.dependencies = Object.keys(packageJson.dependencies);
        dependencies.totalDependencies += dependencies.dependencies.length;
      }
      
      if (packageJson.devDependencies) {
        dependencies.devDependencies = Object.keys(packageJson.devDependencies);
        dependencies.totalDependencies += dependencies.devDependencies.length;
      }
    } catch (error) {
      // package.json not found, try other package managers
      try {
        const requirementsPath = path.join(projectPath, 'requirements.txt');
        await fs.access(requirementsPath);
        dependencies.packageManager = 'pip';
        const requirements = await fs.readFile(requirementsPath, 'utf8');
        dependencies.dependencies = requirements.split('\n')
          .filter(line => line.trim() && !line.startsWith('#'))
          .map(line => line.split('==')[0].split('>=')[0].split('<=')[0]);
        dependencies.totalDependencies = dependencies.dependencies.length;
      } catch {
        // No package manager found
      }
    }

    return dependencies;
  }

  /**
   * Calculate project complexity
   * @param {string} projectPath - Project directory path
   * @returns {Promise<Object>} Complexity metrics
   */
  async calculateComplexity(projectPath) {
    const complexity = {
      fileCount: 0,
      lineCount: 0,
      averageFileSize: 0,
      complexityScore: 0
    };

    try {
      const countFiles = async (dir) => {
        const items = await fs.readdir(dir);
        for (const item of items) {
          if (item.startsWith('.') || item === 'node_modules') continue;
          
          const itemPath = path.join(dir, item);
          const stats = await fs.stat(itemPath);
          
          if (stats.isDirectory()) {
            await countFiles(itemPath);
          } else {
            complexity.fileCount++;
            complexity.lineCount += await this.countLines(itemPath);
          }
        }
      };
      
      await countFiles(projectPath);
      
      if (complexity.fileCount > 0) {
        complexity.averageFileSize = complexity.lineCount / complexity.fileCount;
        complexity.complexityScore = Math.min(100, (complexity.fileCount * 0.3) + (complexity.lineCount * 0.001));
      }
    } catch (error) {
      logger.error('Error calculating complexity:', error);
    }

    return complexity;
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
    } catch {
      return 0;
    }
  }

  /**
   * Detect issues in project
   * @param {string} projectPath - Project directory path
   * @returns {Promise<Array>} Issues list
   */
  async detectIssues(projectPath) {
    const issues = [];

    try {
      // Check for common issues
      const files = await fs.readdir(projectPath);
      
      // Check for missing README
      if (!files.includes('README.md') && !files.includes('README.txt')) {
        issues.push({
          type: 'missing_readme',
          severity: 'medium',
          message: 'No README file found'
        });
      }

      // Check for missing .gitignore
      if (!files.includes('.gitignore')) {
        issues.push({
          type: 'missing_gitignore',
          severity: 'low',
          message: 'No .gitignore file found'
        });
      }

      // Check for large files
      const largeFiles = await this.findLargeFiles(projectPath);
      if (largeFiles.length > 0) {
        issues.push({
          type: 'large_files',
          severity: 'medium',
          message: `Found ${largeFiles.length} large files (>1MB)`,
          details: largeFiles
        });
      }
    } catch (error) {
      logger.error('Error detecting issues:', error);
    }

    return issues;
  }

  /**
   * Find large files in project
   * @param {string} projectPath - Project directory path
   * @returns {Promise<Array>} Large files list
   */
  async findLargeFiles(projectPath, maxSize = 1024 * 1024) {
    const largeFiles = [];

    try {
      const findFiles = async (dir) => {
        const items = await fs.readdir(dir);
        for (const item of items) {
          if (item.startsWith('.') || item === 'node_modules') continue;
          
          const itemPath = path.join(dir, item);
          const stats = await fs.stat(itemPath);
          
          if (stats.isDirectory()) {
            await findFiles(itemPath);
          } else if (stats.size > maxSize) {
            largeFiles.push({
              path: path.relative(projectPath, itemPath),
              size: stats.size
            });
          }
        }
      };
      
      await findFiles(projectPath);
    } catch (error) {
      logger.error('Error finding large files:', error);
    }

    return largeFiles;
  }

  /**
   * Generate suggestions for project improvement
   * @param {string} projectPath - Project directory path
   * @returns {Promise<Array>} Suggestions list
   */
  async generateSuggestions(projectPath) {
    const suggestions = [];

    try {
      const files = await fs.readdir(projectPath);
      
      // Suggest adding README if missing
      if (!files.includes('README.md') && !files.includes('README.txt')) {
        suggestions.push({
          type: 'add_readme',
          priority: 'high',
          message: 'Add a README.md file to document your project'
        });
      }

      // Suggest adding .gitignore if missing
      if (!files.includes('.gitignore')) {
        suggestions.push({
          type: 'add_gitignore',
          priority: 'medium',
          message: 'Add a .gitignore file to exclude unnecessary files from version control'
        });
      }

      // Suggest adding tests if no test directory found
      if (!files.some(f => f.includes('test') || f.includes('spec'))) {
        suggestions.push({
          type: 'add_tests',
          priority: 'medium',
          message: 'Consider adding tests to improve code quality and reliability'
        });
      }
    } catch (error) {
      logger.error('Error generating suggestions:', error);
    }

    return suggestions;
  }
}

// Create instance for execution
const stepInstance = new ProjectAnalysisStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
}; 