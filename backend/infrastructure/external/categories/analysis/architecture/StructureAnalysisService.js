/**
 * StructureAnalysisService - Infrastructure Layer
 * Project structure analysis service
 * 
 * Created: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
 * Purpose: Project structure analysis and organization
 */

const Logger = require('@logging/Logger');
const fs = require('fs').promises;
const path = require('path');

class StructureAnalysisService {
  constructor() {
    this.logger = new Logger('StructureAnalysisService');
    this.baseUrl = process.env.STRUCTURE_API_URL;
    this.apiKey = process.env.STRUCTURE_API_KEY;
    this.timeout = parseInt(process.env.STRUCTURE_TIMEOUT) || 30000;
  }

  async analyze(params) {
    try {
      this.logger.info('Starting structure analysis', { projectId: params.projectId });
      
      const { projectPath, config = {} } = params;
      const structureConfig = {
        ...config,
        includeHidden: config.includeHidden !== false,
        maxDepth: config.maxDepth || 10,
        fileTypes: config.fileTypes || ['js', 'jsx', 'ts', 'tsx', 'json', 'md']
      };

      const result = await this.analyzeProjectStructure(projectPath, structureConfig);
      
      this.logger.info('Structure analysis completed successfully', { 
        projectId: params.projectId,
        files: result.files?.length || 0 
      });

      return {
        success: true,
        data: result,
        metadata: {
          scanner: 'structure',
          timestamp: new Date().toISOString(),
          config: structureConfig
        }
      };
    } catch (error) {
      this.logger.error('Structure analysis failed', { 
        projectId: params.projectId, 
        error: error.message 
      });
      throw error;
    }
  }

  async analyzeProjectStructure(projectPath, config) {
    const structure = await this.scanDirectory(projectPath, config);
    const analysis = this.analyzeStructure(structure, config);
    
    return {
      structure: structure,
      analysis: analysis,
      recommendations: this.generateStructureRecommendations(analysis)
    };
  }

  async scanDirectory(dirPath, config, depth = 0) {
    if (depth > config.maxDepth) {
      return { type: 'directory', name: path.basename(dirPath), truncated: true };
    }

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const children = [];

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          const child = await this.scanDirectory(fullPath, config, depth + 1);
          children.push(child);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).slice(1);
          if (config.fileTypes.includes(ext) || config.fileTypes.includes('*')) {
            const stats = await fs.stat(fullPath);
            children.push({
              type: 'file',
              name: entry.name,
              size: stats.size,
              extension: ext,
              path: fullPath
            });
          }
        }
      }

      return {
        type: 'directory',
        name: path.basename(dirPath),
        children: children,
        path: dirPath
      };
    } catch (error) {
      this.logger.warn('Failed to scan directory', { dir: dirPath, error: error.message });
      return { type: 'directory', name: path.basename(dirPath), error: error.message };
    }
  }

  analyzeStructure(structure, config) {
    const analysis = {
      totalFiles: 0,
      totalDirectories: 0,
      fileTypes: {},
      directoryDepth: 0,
      largestFiles: [],
      structureScore: 0
    };

    this.analyzeNode(structure, analysis, 0);
    analysis.structureScore = this.calculateStructureScore(analysis);
    
    return analysis;
  }

  analyzeNode(node, analysis, depth) {
    if (node.type === 'file') {
      analysis.totalFiles++;
      analysis.fileTypes[node.extension] = (analysis.fileTypes[node.extension] || 0) + 1;
      
      if (node.size > 1024 * 1024) { // Files larger than 1MB
        analysis.largestFiles.push({
          name: node.name,
          size: node.size,
          path: node.path
        });
      }
    } else if (node.type === 'directory') {
      analysis.totalDirectories++;
      analysis.directoryDepth = Math.max(analysis.directoryDepth, depth);
      
      if (node.children) {
        for (const child of node.children) {
          this.analyzeNode(child, analysis, depth + 1);
        }
      }
    }
  }

  calculateStructureScore(analysis) {
    let score = 100;
    
    // Penalize for too many files in root
    if (analysis.totalFiles > 50) {
      score -= 10;
    }
    
    // Penalize for very deep directory structure
    if (analysis.directoryDepth > 8) {
      score -= 15;
    }
    
    // Penalize for very large files
    if (analysis.largestFiles.length > 5) {
      score -= 10;
    }
    
    // Bonus for good organization
    if (analysis.totalDirectories > 5 && analysis.totalDirectories < 50) {
      score += 5;
    }
    
    return Math.max(0, Math.min(100, score));
  }

  generateStructureRecommendations(analysis) {
    const recommendations = [];

    if (analysis.totalFiles > 50) {
      recommendations.push({
        type: 'organization',
        message: 'Consider organizing files into subdirectories to improve project structure.',
        severity: 'medium'
      });
    }

    if (analysis.directoryDepth > 8) {
      recommendations.push({
        type: 'complexity',
        message: 'Very deep directory structure detected. Consider flattening the hierarchy.',
        severity: 'medium'
      });
    }

    if (analysis.largestFiles.length > 5) {
      recommendations.push({
        type: 'optimization',
        message: 'Multiple large files detected. Consider splitting large files into smaller modules.',
        severity: 'high'
      });
    }

    if (analysis.structureScore < 70) {
      recommendations.push({
        type: 'improvement',
        message: 'Project structure could be improved. Review organization and file sizes.',
        severity: 'medium'
      });
    }

    return recommendations;
  }

  async getConfiguration() {
    return {
      name: 'Structure Analysis Service',
      version: '1.0.0',
      capabilities: ['structure-analysis', 'file-organization', 'complexity-assessment'],
      configuration: {
        baseUrl: this.baseUrl,
        timeout: this.timeout,
        hasApiKey: !!this.apiKey
      }
    };
  }

  async getStatus() {
    try {
      return {
        status: 'healthy',
        capabilities: ['directory-scanning', 'file-analysis', 'structure-scoring'],
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = StructureAnalysisService; 