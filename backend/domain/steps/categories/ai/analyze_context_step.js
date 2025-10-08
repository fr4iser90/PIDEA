/**
 * Analyze Context Step - AI Framework
 * Analyze current development context and requirements
 */

const path = require('path');
const fs = require('fs').promises;
const Logger = require('@logging/Logger');
const logger = new Logger('AnalyzeContextStep');

const config = {
  name: 'analyze_context',
  version: '1.0.0',
  description: 'Analyze current development context and requirements',
  category: 'ai',
  framework: 'AI Framework',
  dependencies: [],
  settings: {
    contextWindow: 8000,
    includeCodebase: true,
    analysisDepth: 'medium',
    outputFormat: 'json'
  }
};

class AnalyzeContextStep {
  constructor() {
    this.name = 'analyze_context';
    this.description = 'Analyze current development context and requirements';
    this.category = 'ai';
    this.dependencies = [];
    this.logger = logger;
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}, options = {}) {
    try {
      this.logger.info('🧠 Starting context analysis...');
      
      const projectPath = context.projectPath || process.cwd();
      const contextWindow = options.contextWindow || config.settings.contextWindow;
      const includeCodebase = options.includeCodebase || config.settings.includeCodebase;
      const analysisDepth = options.analysisDepth || config.settings.analysisDepth;
      const outputFormat = options.outputFormat || config.settings.outputFormat;
      
      const result = {
        projectPath,
        contextWindow,
        includeCodebase,
        analysisDepth,
        outputFormat,
        timestamp: new Date().toISOString(),
        analysis: {
          project: {},
          codebase: {},
          environment: {},
          requirements: {},
          insights: []
        }
      };

      // Analyze project context
      result.analysis.project = await this.analyzeProjectContext(projectPath);
      
      // Analyze codebase if enabled
      if (includeCodebase) {
        result.analysis.codebase = await this.analyzeCodebaseContext(projectPath, analysisDepth);
      }
      
      // Analyze environment
      result.analysis.environment = await this.analyzeEnvironmentContext();
      
      // Analyze requirements
      result.analysis.requirements = await this.analyzeRequirementsContext(projectPath);
      
      // Generate insights
      result.analysis.insights = await this.generateInsights(result.analysis);
      
      this.logger.info(`✅ Context analysis completed. Generated ${result.analysis.insights.length} insights.`);
      
      return {
        success: true,
        data: result,
        metadata: {
          executionTime: Date.now() - context.startTime || 0,
          contextWindow,
          analysisDepth,
          insightsGenerated: result.analysis.insights.length
        }
      };
    } catch (error) {
      this.logger.error('❌ Context analysis failed:', error.message);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  async analyzeProjectContext(projectPath) {
    const context = {
      name: path.basename(projectPath),
      path: projectPath,
      type: 'unknown',
      technology: [],
      size: 0,
      complexity: 'unknown'
    };

    try {
      // Check for package.json
      const packageJsonPath = path.join(projectPath, 'package.json');
      try {
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
        context.type = 'nodejs';
        context.name = packageJson.name || context.name;
        context.version = packageJson.version;
        context.description = packageJson.description;
        context.technology.push('Node.js');
        
        if (packageJson.dependencies) {
          const deps = Object.keys(packageJson.dependencies);
          if (deps.includes('react')) context.technology.push('React');
          if (deps.includes('vue')) context.technology.push('Vue');
          if (deps.includes('angular')) context.technology.push('Angular');
          if (deps.includes('express')) context.technology.push('Express');
          if (deps.includes('fastify')) context.technology.push('Fastify');
        }
      } catch (error) {
        // Not a Node.js project
      }

      // Check for other project types
      const files = await fs.readdir(projectPath);
      
      if (files.includes('requirements.txt')) {
        context.type = 'python';
        context.technology.push('Python');
      } else if (files.includes('pom.xml')) {
        context.type = 'java';
        context.technology.push('Java');
      } else if (files.includes('Cargo.toml')) {
        context.type = 'rust';
        context.technology.push('Rust');
      } else if (files.includes('go.mod')) {
        context.type = 'go';
        context.technology.push('Go');
      }

      // Calculate project size
      context.size = await this.calculateProjectSize(projectPath);
      
      // Determine complexity
      context.complexity = this.determineComplexity(context.size, context.technology.length);
      
    } catch (error) {
      this.logger.warn(`Warning: Could not analyze project context: ${error.message}`);
    }

    return context;
  }

  async analyzeCodebaseContext(projectPath, depth) {
    const codebase = {
      files: [],
      languages: {},
      patterns: [],
      architecture: 'unknown',
      quality: 'unknown'
    };

    try {
      const codeFiles = await this.findCodeFiles(projectPath, depth);
      codebase.files = codeFiles;
      
      // Analyze languages
      codebase.languages = this.analyzeLanguages(codeFiles);
      
      // Analyze patterns
      codebase.patterns = await this.analyzePatterns(codeFiles);
      
      // Determine architecture
      codebase.architecture = this.determineArchitecture(codeFiles);
      
      // Assess quality
      codebase.quality = this.assessQuality(codeFiles);
      
    } catch (error) {
      this.logger.warn(`Warning: Could not analyze codebase context: ${error.message}`);
    }

    return codebase;
  }

  async findCodeFiles(projectPath, depth) {
    const codeFiles = [];
    const extensions = ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.h', '.go', '.rs'];
    
    try {
      await this.scanForCodeFiles(projectPath, codeFiles, extensions, 0, depth === 'deep' ? 10 : 5);
    } catch (error) {
      this.logger.warn(`Warning: Could not scan for code files: ${error.message}`);
    }
    
    return codeFiles;
  }

  async scanForCodeFiles(dirPath, codeFiles, extensions, currentDepth, maxDepth) {
    if (currentDepth >= maxDepth) return;
    
    try {
      const items = await fs.readdir(dirPath);
      
      for (const item of items) {
        if (item.startsWith('.') || item === 'node_modules') continue;
        
        const itemPath = path.join(dirPath, item);
        const stat = await fs.stat(itemPath);
        
        if (stat.isDirectory()) {
          await this.scanForCodeFiles(itemPath, codeFiles, extensions, currentDepth + 1, maxDepth);
        } else {
          const ext = path.extname(item);
          if (extensions.includes(ext)) {
            codeFiles.push({
              path: itemPath,
              name: item,
              extension: ext,
              size: stat.size
            });
          }
        }
      }
    } catch (error) {
      this.logger.warn(`Warning: Could not scan directory ${dirPath}: ${error.message}`);
    }
  }

  analyzeLanguages(codeFiles) {
    const languages = {};
    
    for (const file of codeFiles) {
      const ext = file.extension;
      const lang = this.getLanguageFromExtension(ext);
      
      if (!languages[lang]) {
        languages[lang] = { count: 0, files: [], totalSize: 0 };
      }
      
      languages[lang].count++;
      languages[lang].files.push(file.name);
      languages[lang].totalSize += file.size;
    }
    
    return languages;
  }

  getLanguageFromExtension(ext) {
    const langMap = {
      '.js': 'JavaScript',
      '.jsx': 'JavaScript',
      '.ts': 'TypeScript',
      '.tsx': 'TypeScript',
      '.py': 'Python',
      '.java': 'Java',
      '.cpp': 'C++',
      '.c': 'C',
      '.h': 'C/C++',
      '.go': 'Go',
      '.rs': 'Rust'
    };
    
    return langMap[ext] || 'Unknown';
  }

  async analyzePatterns(codeFiles) {
    const patterns = [];
    
    // Analyze file structure patterns
    const structurePatterns = this.analyzeStructurePatterns(codeFiles);
    patterns.push(...structurePatterns);
    
    // Analyze naming patterns
    const namingPatterns = this.analyzeNamingPatterns(codeFiles);
    patterns.push(...namingPatterns);
    
    return patterns;
  }

  analyzeStructurePatterns(codeFiles) {
    const patterns = [];
    
    // Check for MVC pattern
    const hasModels = codeFiles.some(f => f.name.toLowerCase().includes('model'));
    const hasViews = codeFiles.some(f => f.name.toLowerCase().includes('view'));
    const hasControllers = codeFiles.some(f => f.name.toLowerCase().includes('controller'));
    
    if (hasModels && hasViews && hasControllers) {
      patterns.push({
        type: 'architecture',
        name: 'MVC Pattern',
        confidence: 'high',
        description: 'Model-View-Controller architecture detected'
      });
    }
    
    // Check for layered architecture
    const hasServices = codeFiles.some(f => f.name.toLowerCase().includes('service'));
    const hasRepositories = codeFiles.some(f => f.name.toLowerCase().includes('repository'));
    
    if (hasServices && hasRepositories) {
      patterns.push({
        type: 'architecture',
        name: 'Layered Architecture',
        confidence: 'medium',
        description: 'Service and repository layers detected'
      });
    }
    
    return patterns;
  }

  analyzeNamingPatterns(codeFiles) {
    const patterns = [];
    
    // Check for camelCase
    const camelCaseFiles = codeFiles.filter(f => /^[a-z][a-zA-Z0-9]*\./.test(f.name));
    if (camelCaseFiles.length > codeFiles.length * 0.7) {
      patterns.push({
        type: 'naming',
        name: 'camelCase',
        confidence: 'high',
        description: 'Most files use camelCase naming convention'
      });
    }
    
    // Check for kebab-case
    const kebabCaseFiles = codeFiles.filter(f => /^[a-z][a-z0-9-]*\./.test(f.name));
    if (kebabCaseFiles.length > codeFiles.length * 0.7) {
      patterns.push({
        type: 'naming',
        name: 'kebab-case',
        confidence: 'high',
        description: 'Most files use kebab-case naming convention'
      });
    }
    
    return patterns;
  }

  determineArchitecture(codeFiles) {
    const directories = new Set();
    
    for (const file of codeFiles) {
      const dir = path.dirname(file.path);
      directories.add(dir);
    }
    
    const dirArray = Array.from(directories);
    
    // Check for common architecture patterns
    if (dirArray.some(d => d.includes('components'))) return 'component-based';
    if (dirArray.some(d => d.includes('modules'))) return 'modular';
    if (dirArray.some(d => d.includes('layers'))) return 'layered';
    if (dirArray.some(d => d.includes('microservices'))) return 'microservices';
    
    return 'monolithic';
  }

  assessQuality(codeFiles) {
    const totalFiles = codeFiles.length;
    const totalSize = codeFiles.reduce((sum, file) => sum + file.size, 0);
    const averageSize = totalSize / totalFiles;
    
    // Simple quality assessment based on file size and count
    if (averageSize < 1000 && totalFiles < 50) return 'excellent';
    if (averageSize < 5000 && totalFiles < 100) return 'good';
    if (averageSize < 10000 && totalFiles < 200) return 'fair';
    return 'needs-improvement';
  }

  async analyzeEnvironmentContext() {
    return {
      nodeVersion: process.version,
      platform: process.platform,
      architecture: process.arch,
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    };
  }

  async analyzeRequirementsContext(projectPath) {
    const requirements = {
      dependencies: [],
      devDependencies: [],
      scripts: [],
      engines: {},
      complexity: 'unknown'
    };

    try {
      const packageJsonPath = path.join(projectPath, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
      
      requirements.dependencies = Object.keys(packageJson.dependencies || {});
      requirements.devDependencies = Object.keys(packageJson.devDependencies || {});
      requirements.scripts = Object.keys(packageJson.scripts || {});
      requirements.engines = packageJson.engines || {};
      
      // Assess complexity based on dependencies
      const totalDeps = requirements.dependencies.length + requirements.devDependencies.length;
      if (totalDeps < 10) requirements.complexity = 'simple';
      else if (totalDeps < 50) requirements.complexity = 'medium';
      else requirements.complexity = 'complex';
      
    } catch (error) {
      this.logger.warn(`Warning: Could not analyze requirements: ${error.message}`);
    }

    return requirements;
  }

  async generateInsights(analysis) {
    const insights = [];
    
    // Project insights
    if (analysis.project.type === 'nodejs') {
      insights.push({
        type: 'project',
        category: 'technology',
        message: `Node.js project detected with ${analysis.project.technology.join(', ')}`,
        confidence: 'high',
        recommendation: 'Consider using TypeScript for better type safety'
      });
    }
    
    // Codebase insights
    if (analysis.codebase.quality === 'needs-improvement') {
      insights.push({
        type: 'codebase',
        category: 'quality',
        message: 'Codebase quality could be improved',
        confidence: 'medium',
        recommendation: 'Consider refactoring large files and improving code organization'
      });
    }
    
    // Architecture insights
    if (analysis.codebase.architecture === 'monolithic' && analysis.codebase.files.length > 100) {
      insights.push({
        type: 'architecture',
        category: 'scalability',
        message: 'Large monolithic codebase detected',
        confidence: 'high',
        recommendation: 'Consider modularizing the codebase or migrating to microservices'
      });
    }
    
    // Requirements insights
    if (analysis.requirements.complexity === 'complex') {
      insights.push({
        type: 'requirements',
        category: 'maintenance',
        message: 'High dependency complexity detected',
        confidence: 'medium',
        recommendation: 'Review and potentially reduce dependencies to improve maintainability'
      });
    }
    
    return insights;
  }

  async calculateProjectSize(projectPath) {
    let totalSize = 0;
    
    try {
      const items = await fs.readdir(projectPath);
      
      for (const item of items) {
        if (item.startsWith('.') || item === 'node_modules') continue;
        
        const itemPath = path.join(projectPath, item);
        const stat = await fs.stat(itemPath);
        
        if (stat.isDirectory()) {
          totalSize += await this.calculateProjectSize(itemPath);
        } else {
          totalSize += stat.size;
        }
      }
    } catch (error) {
      this.logger.warn(`Warning: Could not calculate project size: ${error.message}`);
    }
    
    return totalSize;
  }

  determineComplexity(size, techCount) {
    if (size < 1000000 && techCount < 3) return 'simple';
    if (size < 10000000 && techCount < 5) return 'medium';
    return 'complex';
  }
}

// Create instance for execution
const stepInstance = new AnalyzeContextStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
};
