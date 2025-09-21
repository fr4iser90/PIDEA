/**
 * Analyze Code Structure Step - Code Quality Framework
 * Analyze code structure and organization
 */

const path = require('path');
const fs = require('fs').promises;
const Logger = require('../../../../infrastructure/logging/Logger');

const config = {
  name: 'analyze_code_structure',
  version: '1.0.0',
  description: 'Analyze code structure and organization',
  category: 'analysis',
  framework: 'Code Quality Framework',
  dependencies: [],
  settings: {
    scanDepth: 5,
    includeHidden: false,
    analyzeImports: true,
    outputFormat: 'json'
  }
};

class AnalyzeCodeStructureStep {
  constructor() {
    this.name = 'analyze_code_structure';
    this.description = 'Analyze code structure and organization';
    this.category = 'analysis';
    this.dependencies = [];
    this.logger = new Logger('AnalyzeCodeStructureStep');
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}, options = {}) {
    try {
      this.logger.info('🔍 Starting code structure analysis...');
      
      const projectPath = context.projectPath || process.cwd();
      const scanDepth = options.scanDepth || config.settings.scanDepth;
      const includeHidden = options.includeHidden || config.settings.includeHidden;
      const analyzeImports = options.analyzeImports || config.settings.analyzeImports;
      
      const result = {
        projectPath,
        scanDepth,
        includeHidden,
        analyzeImports,
        timestamp: new Date().toISOString(),
        analysis: {
          structure: {},
          imports: {},
          organization: {},
          metrics: {}
        }
      };

      // Analyze code structure
      result.analysis.structure = await this.analyzeCodeStructure(projectPath, scanDepth, includeHidden);
      
      // Analyze imports if enabled
      if (analyzeImports) {
        result.analysis.imports = await this.analyzeImports(result.analysis.structure);
      }
      
      // Analyze organization
      result.analysis.organization = await this.analyzeOrganization(result.analysis.structure);
      
      // Calculate metrics
      result.analysis.metrics = this.calculateMetrics(result.analysis);
      
      this.logger.info(`✅ Code structure analysis completed`);
      
      return {
        success: true,
        data: result,
        metadata: {
          executionTime: Date.now() - context.startTime || 0,
          filesAnalyzed: this.countFiles(result.analysis.structure),
          depth: scanDepth
        }
      };
    } catch (error) {
      this.logger.error('❌ Code structure analysis failed:', error.message);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  async analyzeCodeStructure(projectPath, maxDepth, includeHidden, currentDepth = 0) {
    if (currentDepth >= maxDepth) {
      return { type: 'directory', name: path.basename(projectPath), depth: currentDepth, truncated: true };
    }

    try {
      const items = await fs.readdir(projectPath);
      const structure = {
        type: 'directory',
        name: path.basename(projectPath),
        path: projectPath,
        depth: currentDepth,
        children: []
      };

      for (const item of items) {
        if (!includeHidden && item.startsWith('.')) continue;
        
        const itemPath = path.join(projectPath, item);
        const stat = await fs.stat(itemPath);
        
        if (stat.isDirectory()) {
          const subStructure = await this.analyzeCodeStructure(itemPath, maxDepth, includeHidden, currentDepth + 1);
          structure.children.push(subStructure);
        } else {
          const fileAnalysis = await this.analyzeFile(itemPath);
          structure.children.push(fileAnalysis);
        }
      }

      return structure;
    } catch (error) {
      return { type: 'directory', name: path.basename(projectPath), error: error.message };
    }
  }

  async analyzeFile(filePath) {
    try {
      const stat = await fs.stat(filePath);
      const content = await fs.readFile(filePath, 'utf8');
      
      return {
        type: 'file',
        name: path.basename(filePath),
        path: filePath,
        extension: path.extname(filePath),
        size: stat.size,
        lines: content.split('\n').length,
        functions: this.extractFunctions(content),
        classes: this.extractClasses(content),
        imports: this.extractImports(content),
        exports: this.extractExports(content)
      };
    } catch (error) {
      return {
        type: 'file',
        name: path.basename(filePath),
        path: filePath,
        error: error.message
      };
    }
  }

  extractFunctions(content) {
    const functions = [];
    const patterns = [
      /function\s+(\w+)\s*\(/g,
      /const\s+(\w+)\s*=\s*\(/g,
      /(\w+)\s*:\s*function/g
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        functions.push(match[1]);
      }
    }
    
    return functions;
  }

  extractClasses(content) {
    const classes = [];
    const patterns = [
      /class\s+(\w+)/g,
      /interface\s+(\w+)/g,
      /type\s+(\w+)/g
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        classes.push(match[1]);
      }
    }
    
    return classes;
  }

  extractImports(content) {
    const imports = [];
    const patterns = [
      /import\s+.*from\s+['"]([^'"]+)['"]/g,
      /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        imports.push(match[1]);
      }
    }
    
    return imports;
  }

  extractExports(content) {
    const exports = [];
    const patterns = [
      /export\s+(?:default\s+)?(?:function|class|const|let|var)\s+(\w+)/g,
      /module\.exports\s*=\s*(\w+)/g
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        exports.push(match[1]);
      }
    }
    
    return exports;
  }

  async analyzeImports(structure) {
    const imports = {
      external: new Set(),
      internal: new Set(),
      circular: [],
      unused: []
    };

    this.traverseStructure(structure, (item) => {
      if (item.type === 'file' && item.imports) {
        for (const imp of item.imports) {
          if (imp.startsWith('.')) {
            imports.internal.add(imp);
          } else {
            imports.external.add(imp);
          }
        }
      }
    });

    return {
      external: Array.from(imports.external),
      internal: Array.from(imports.internal),
      circular: imports.circular,
      unused: imports.unused
    };
  }

  async analyzeOrganization(structure) {
    const organization = {
      layers: [],
      patterns: [],
      violations: []
    };

    // Analyze for common architectural patterns
    const directories = new Set();
    this.traverseStructure(structure, (item) => {
      if (item.type === 'directory') {
        directories.add(item.name.toLowerCase());
      }
    });

    // Check for layered architecture
    if (directories.has('controllers') && directories.has('services') && directories.has('repositories')) {
      organization.layers.push('Layered Architecture');
    }

    // Check for MVC pattern
    if (directories.has('models') && directories.has('views') && directories.has('controllers')) {
      organization.patterns.push('MVC Pattern');
    }

    return organization;
  }

  calculateMetrics(analysis) {
    const metrics = {
      totalFiles: 0,
      totalLines: 0,
      totalFunctions: 0,
      totalClasses: 0,
      averageFileSize: 0,
      complexity: 'low'
    };

    this.traverseStructure(analysis.structure, (item) => {
      if (item.type === 'file') {
        metrics.totalFiles++;
        metrics.totalLines += item.lines || 0;
        metrics.totalFunctions += item.functions?.length || 0;
        metrics.totalClasses += item.classes?.length || 0;
      }
    });

    if (metrics.totalFiles > 0) {
      metrics.averageFileSize = Math.round(metrics.totalLines / metrics.totalFiles);
    }

    // Determine complexity
    if (metrics.totalFiles > 100 || metrics.totalLines > 10000) {
      metrics.complexity = 'high';
    } else if (metrics.totalFiles > 50 || metrics.totalLines > 5000) {
      metrics.complexity = 'medium';
    }

    return metrics;
  }

  traverseStructure(structure, callback) {
    callback(structure);
    if (structure.children) {
      for (const child of structure.children) {
        this.traverseStructure(child, callback);
      }
    }
  }

  countFiles(structure) {
    let count = 0;
    this.traverseStructure(structure, (item) => {
      if (item.type === 'file') count++;
    });
    return count;
  }
}

// Create instance for execution
const stepInstance = new AnalyzeCodeStructureStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
};
