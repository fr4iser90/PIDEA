/**
 * LayerAnalysisService - Infrastructure Layer
 * Layer organization analysis service
 * 
 * Created: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
 * Purpose: Layer organization analysis and architecture validation
 */

const Logger = require('@logging/Logger');
const fs = require('fs').promises;
const path = require('path');

class LayerAnalysisService {
  constructor() {
    this.logger = new Logger('LayerAnalysisService');
    this.baseUrl = process.env.LAYER_API_URL;
    this.apiKey = process.env.LAYER_API_KEY;
    this.timeout = parseInt(process.env.LAYER_TIMEOUT) || 30000;
  }

  async analyze(params) {
    try {
      this.logger.info('Starting layer analysis', { projectId: params.projectId });
      
      const { projectPath, config = {} } = params;
      const layerConfig = {
        ...config,
        layers: config.layers || ['domain', 'application', 'infrastructure', 'presentation'],
        fileTypes: config.fileTypes || ['js', 'jsx', 'ts', 'tsx']
      };

      const result = await this.analyzeLayerOrganization(projectPath, layerConfig);
      
      this.logger.info('Layer analysis completed successfully', { 
        projectId: params.projectId,
        layers: result.layers?.length || 0 
      });

      return {
        success: true,
        data: result,
        metadata: {
          scanner: 'layer',
          timestamp: new Date().toISOString(),
          config: layerConfig
        }
      };
    } catch (error) {
      this.logger.error('Layer analysis failed', { 
        projectId: params.projectId, 
        error: error.message 
      });
      throw error;
    }
  }

  async analyzeLayerOrganization(projectPath, config) {
    const layers = await this.identifyLayers(projectPath, config.layers);
    const violations = await this.detectLayerViolations(projectPath, layers, config);
    
    return {
      layers: layers,
      violations: violations,
      summary: this.calculateLayerSummary(layers, violations),
      recommendations: this.generateLayerRecommendations(layers, violations)
    };
  }

  async identifyLayers(projectPath, expectedLayers) {
    const layers = {};
    
    for (const layer of expectedLayers) {
      const layerPath = path.join(projectPath, layer);
      try {
        const stats = await fs.stat(layerPath);
        if (stats.isDirectory()) {
          layers[layer] = {
            path: layerPath,
            exists: true,
            files: await this.countFilesInDirectory(layerPath)
          };
        } else {
          layers[layer] = { path: layerPath, exists: false, files: 0 };
        }
      } catch (error) {
        layers[layer] = { path: layerPath, exists: false, files: 0 };
      }
    }
    
    return layers;
  }

  async countFilesInDirectory(dirPath) {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      let count = 0;
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          count += await this.countFilesInDirectory(fullPath);
        } else {
          count++;
        }
      }
      
      return count;
    } catch (error) {
      return 0;
    }
  }

  async detectLayerViolations(projectPath, layers, config) {
    const violations = [];
    
    for (const [layerName, layerInfo] of Object.entries(layers)) {
      if (layerInfo.exists) {
        const layerViolations = await this.checkLayerViolations(layerInfo.path, layerName, config);
        violations.push(...layerViolations);
      }
    }
    
    return violations;
  }

  async checkLayerViolations(layerPath, layerName, config) {
    const violations = [];
    const files = await this.getCodeFiles(layerPath, config.fileTypes);
    
    for (const file of files) {
      const fileViolations = await this.checkFileLayerViolations(file, layerName);
      violations.push(...fileViolations);
    }
    
    return violations;
  }

  async getCodeFiles(dirPath, fileTypes) {
    const files = [];
    
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          files.push(...await this.getCodeFiles(fullPath, fileTypes));
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).slice(1);
          if (fileTypes.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      this.logger.warn('Failed to scan directory', { dir: dirPath, error: error.message });
    }
    
    return files;
  }

  async checkFileLayerViolations(filePath, layerName) {
    const violations = [];
    
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const imports = this.extractImports(content);
      
      for (const importPath of imports) {
        const violation = this.checkImportViolation(importPath, layerName, filePath);
        if (violation) {
          violations.push(violation);
        }
      }
    } catch (error) {
      this.logger.warn('Failed to check file violations', { file: filePath, error: error.message });
    }
    
    return violations;
  }

  extractImports(content) {
    const imports = [];
    const importRegex = /(?:import|require)\s*\(?['"`]([^'"`]+)['"`]\)?/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
    
    return imports;
  }

  checkImportViolation(importPath, currentLayer, filePath) {
    // Define layer dependencies (what each layer can import from)
    const layerDependencies = {
      'presentation': ['application', 'domain'],
      'application': ['domain'],
      'infrastructure': ['domain', 'application'],
      'domain': [] // Domain should not depend on other layers
    };
    
    // Check if import violates layer dependencies
    for (const [importedLayer, allowedLayers] of Object.entries(layerDependencies)) {
      if (importPath.includes(importedLayer) && !allowedLayers.includes(importedLayer)) {
        return {
          type: 'layer-violation',
          file: filePath,
          currentLayer: currentLayer,
          importedLayer: importedLayer,
          importPath: importPath,
          severity: 'high'
        };
      }
    }
    
    return null;
  }

  calculateLayerSummary(layers, violations) {
    const summary = {
      totalLayers: Object.keys(layers).length,
      existingLayers: Object.values(layers).filter(l => l.exists).length,
      totalFiles: Object.values(layers).reduce((sum, l) => sum + l.files, 0),
      violations: violations.length,
      layerScore: 0
    };
    
    summary.layerScore = this.calculateLayerScore(summary, layers);
    return summary;
  }

  calculateLayerScore(summary, layers) {
    let score = 100;
    
    // Penalize for missing layers
    const missingLayers = summary.totalLayers - summary.existingLayers;
    score -= missingLayers * 20;
    
    // Penalize for violations
    score -= summary.violations * 10;
    
    // Bonus for good layer distribution
    const avgFilesPerLayer = summary.totalFiles / summary.existingLayers;
    if (avgFilesPerLayer > 5 && avgFilesPerLayer < 50) {
      score += 10;
    }
    
    return Math.max(0, Math.min(100, score));
  }

  generateLayerRecommendations(layers, violations) {
    const recommendations = [];
    const summary = this.calculateLayerSummary(layers, violations);

    // Check for missing layers
    for (const [layerName, layerInfo] of Object.entries(layers)) {
      if (!layerInfo.exists) {
        recommendations.push({
          type: 'missing-layer',
          message: `Layer '${layerName}' is missing. Consider creating this layer for better architecture.`,
          severity: 'high'
        });
      }
    }

    // Check for violations
    if (violations.length > 0) {
      recommendations.push({
        type: 'layer-violations',
        message: `${violations.length} layer violations detected. Review import dependencies.`,
        severity: 'high'
      });
    }

    // Check for layer distribution
    if (summary.totalFiles > 0) {
      const avgFilesPerLayer = summary.totalFiles / summary.existingLayers;
      if (avgFilesPerLayer < 3) {
        recommendations.push({
          type: 'layer-distribution',
          message: 'Some layers have very few files. Consider consolidating layers.',
          severity: 'medium'
        });
      }
    }

    if (summary.layerScore > 80) {
      recommendations.push({
        type: 'positive',
        message: 'Good layer organization detected. Architecture follows clean architecture principles.',
        severity: 'low'
      });
    }

    return recommendations;
  }

  async getConfiguration() {
    return {
      name: 'Layer Analysis Service',
      version: '1.0.0',
      capabilities: ['layer-analysis', 'architecture-validation', 'dependency-checking'],
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
        capabilities: ['layer-detection', 'violation-checking', 'architecture-scoring'],
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

module.exports = LayerAnalysisService; 