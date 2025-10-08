/**
 * Analyze Project Structure Step - Documentation Framework
 * Analyzes project structure to identify documentation needs
 */

const path = require('path');
const fs = require('fs').promises;
const Logger = require('@logging/Logger');
const logger = new Logger('AnalyzeProjectStructureStep');

const config = {
  name: 'analyze_project_structure',
  version: '1.0.0',
  description: 'Analyze project structure to identify documentation needs',
  category: 'documentation',
  framework: 'Documentation Framework',
  dependencies: [],
  settings: {
    scanDepth: 3,
    includeHidden: false,
    outputFormat: 'json'
  }
};

class AnalyzeProjectStructureStep {
  constructor() {
    this.name = 'analyze_project_structure';
    this.description = 'Analyze project structure to identify documentation needs';
    this.category = 'documentation';
    this.dependencies = [];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}, options = {}) {
    try {
      logger.info('🔍 Starting project structure analysis...');
      
      const projectPath = context.projectPath || process.cwd();
      const scanDepth = options.scanDepth || config.settings.scanDepth;
      const includeHidden = options.includeHidden || config.settings.includeHidden;
      
      const analysis = {
        projectPath,
        scanDepth,
        includeHidden,
        timestamp: new Date().toISOString(),
        structure: {},
        documentationNeeds: [],
        recommendations: []
      };

      // Analyze project structure
      analysis.structure = await this.analyzeStructure(projectPath, scanDepth, includeHidden);
      
      // Identify documentation needs
      analysis.documentationNeeds = await this.identifyDocumentationNeeds(analysis.structure);
      
      // Generate recommendations
      analysis.recommendations = await this.generateRecommendations(analysis.documentationNeeds);
      
      logger.info(`✅ Project structure analysis completed. Found ${analysis.documentationNeeds.length} documentation needs.`);
      
      return {
        success: true,
        data: analysis,
        metadata: {
          executionTime: Date.now() - context.startTime || 0,
          filesAnalyzed: this.countFiles(analysis.structure),
          documentationNeeds: analysis.documentationNeeds.length
        }
      };
    } catch (error) {
      logger.error('❌ Project structure analysis failed:', error.message);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  async analyzeStructure(dirPath, maxDepth, includeHidden, currentDepth = 0) {
    if (currentDepth >= maxDepth) {
      return { type: 'directory', name: path.basename(dirPath), depth: currentDepth, truncated: true };
    }

    try {
      const items = await fs.readdir(dirPath);
      const structure = {
        type: 'directory',
        name: path.basename(dirPath),
        path: dirPath,
        depth: currentDepth,
        children: []
      };

      for (const item of items) {
        if (!includeHidden && item.startsWith('.')) continue;
        
        const itemPath = path.join(dirPath, item);
        const stat = await fs.stat(itemPath);
        
        if (stat.isDirectory()) {
          const subStructure = await this.analyzeStructure(itemPath, maxDepth, includeHidden, currentDepth + 1);
          structure.children.push(subStructure);
        } else {
          structure.children.push({
            type: 'file',
            name: item,
            path: itemPath,
            extension: path.extname(item),
            size: stat.size
          });
        }
      }

      return structure;
    } catch (error) {
      return { type: 'directory', name: path.basename(dirPath), error: error.message };
    }
  }

  async identifyDocumentationNeeds(structure) {
    const needs = [];
    
    // Check for common documentation patterns
    const docPatterns = [
      { pattern: /README/i, type: 'readme', priority: 'high' },
      { pattern: /CHANGELOG/i, type: 'changelog', priority: 'medium' },
      { pattern: /CONTRIBUTING/i, type: 'contributing', priority: 'medium' },
      { pattern: /LICENSE/i, type: 'license', priority: 'high' },
      { pattern: /API/i, type: 'api-docs', priority: 'high' },
      { pattern: /docs/i, type: 'documentation', priority: 'medium' }
    ];

    this.traverseStructure(structure, (item) => {
      if (item.type === 'file') {
        for (const pattern of docPatterns) {
          if (pattern.pattern.test(item.name)) {
            needs.push({
              type: pattern.type,
              priority: pattern.priority,
              file: item.path,
              status: 'exists'
            });
          }
        }
      }
    });

    // Check for missing documentation
    const missingDocs = this.checkMissingDocumentation(structure);
    needs.push(...missingDocs);

    return needs;
  }

  checkMissingDocumentation(structure) {
    const missing = [];
    
    // Check if README exists
    const hasReadme = this.hasFileWithPattern(structure, /README/i);
    if (!hasReadme) {
      missing.push({
        type: 'readme',
        priority: 'high',
        status: 'missing',
        recommendation: 'Create a comprehensive README.md file'
      });
    }

    // Check if API documentation exists
    const hasApiDocs = this.hasFileWithPattern(structure, /API|api/i);
    if (!hasApiDocs) {
      missing.push({
        type: 'api-docs',
        priority: 'high',
        status: 'missing',
        recommendation: 'Create API documentation'
      });
    }

    return missing;
  }

  hasFileWithPattern(structure, pattern) {
    let found = false;
    this.traverseStructure(structure, (item) => {
      if (item.type === 'file' && pattern.test(item.name)) {
        found = true;
      }
    });
    return found;
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

  async generateRecommendations(documentationNeeds) {
    const recommendations = [];
    
    for (const need of documentationNeeds) {
      if (need.status === 'missing') {
        recommendations.push({
          type: need.type,
          priority: need.priority,
          action: need.recommendation,
          estimatedEffort: this.getEstimatedEffort(need.type)
        });
      }
    }

    return recommendations;
  }

  getEstimatedEffort(type) {
    const effortMap = {
      'readme': 'low',
      'api-docs': 'high',
      'changelog': 'medium',
      'contributing': 'medium',
      'license': 'low',
      'documentation': 'high'
    };
    return effortMap[type] || 'medium';
  }
}

// Create instance for execution
const stepInstance = new AnalyzeProjectStructureStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
};
