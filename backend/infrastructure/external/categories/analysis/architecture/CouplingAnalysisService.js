/**
 * CouplingAnalysisService - Infrastructure Layer
 * Component coupling analysis service
 * 
 * Created: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
 * Purpose: Component coupling analysis and dependency tracking
 */

const Logger = require('@logging/Logger');
const fs = require('fs').promises;
const path = require('path');

class CouplingAnalysisService {
  constructor() {
    this.logger = new Logger('CouplingAnalysisService');
    this.baseUrl = process.env.COUPLING_API_URL;
    this.apiKey = process.env.COUPLING_API_KEY;
    this.timeout = parseInt(process.env.COUPLING_TIMEOUT) || 30000;
  }

  async analyze(params) {
    try {
      this.logger.info('Starting coupling analysis', { projectId: params.projectId });
      
      const { projectPath, config = {} } = params;
      const couplingConfig = {
        ...config,
        fileTypes: config.fileTypes || ['js', 'jsx', 'ts', 'tsx'],
        maxDepth: config.maxDepth || 5
      };

      const result = await this.analyzeComponentCoupling(projectPath, couplingConfig);
      
      this.logger.info('Coupling analysis completed successfully', { 
        projectId: params.projectId,
        components: result.components?.length || 0 
      });

      return {
        success: true,
        data: result,
        metadata: {
          scanner: 'coupling',
          timestamp: new Date().toISOString(),
          config: couplingConfig
        }
      };
    } catch (error) {
      this.logger.error('Coupling analysis failed', { 
        projectId: params.projectId, 
        error: error.message 
      });
      throw error;
    }
  }

  async analyzeComponentCoupling(projectPath, config) {
    const files = await this.getCodeFiles(projectPath, config.fileTypes);
    const components = [];

    for (const file of files) {
      const component = await this.analyzeFileCoupling(file, config);
      components.push(component);
    }

    return {
      components: components,
      summary: this.calculateCouplingSummary(components),
      recommendations: this.generateCouplingRecommendations(components)
    };
  }

  async getCodeFiles(projectPath, fileTypes) {
    const files = [];
    
    try {
      const entries = await fs.readdir(projectPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(projectPath, entry.name);
        
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
      this.logger.warn('Failed to scan directory', { dir: projectPath, error: error.message });
    }
    
    return files;
  }

  async analyzeFileCoupling(filePath, config) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const imports = this.extractImports(content);
      const exports = this.extractExports(content);
      
      return {
        file: filePath,
        imports: imports,
        exports: exports,
        couplingScore: this.calculateCouplingScore(imports, exports)
      };
    } catch (error) {
      this.logger.warn('Failed to analyze file coupling', { file: filePath, error: error.message });
      return {
        file: filePath,
        imports: [],
        exports: [],
        couplingScore: 0
      };
    }
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

  extractExports(content) {
    const exports = [];
    const exportRegex = /(?:export|module\.exports)\s+(?:default\s+)?(?:class|function|const|let|var)\s+(\w+)/g;
    let match;
    
    while ((match = exportRegex.exec(content)) !== null) {
      exports.push(match[1]);
    }
    
    return exports;
  }

  calculateCouplingScore(imports, exports) {
    // Higher score = more coupling (worse)
    let score = 0;
    
    score += imports.length * 2; // Each import adds coupling
    score += exports.length * 1; // Each export adds coupling
    
    return Math.min(100, score);
  }

  calculateCouplingSummary(components) {
    const summary = {
      totalComponents: components.length,
      averageCoupling: 0,
      highCouplingComponents: 0,
      lowCouplingComponents: 0,
      couplingScore: 0
    };

    if (components.length > 0) {
      const totalCoupling = components.reduce((sum, comp) => sum + comp.couplingScore, 0);
      summary.averageCoupling = totalCoupling / components.length;
      
      summary.highCouplingComponents = components.filter(c => c.couplingScore > 50).length;
      summary.lowCouplingComponents = components.filter(c => c.couplingScore < 20).length;
      
      summary.couplingScore = this.calculateOverallCouplingScore(summary);
    }

    return summary;
  }

  calculateOverallCouplingScore(summary) {
    let score = 100;
    
    // Penalize for high coupling
    if (summary.averageCoupling > 30) score -= 20;
    if (summary.highCouplingComponents > summary.totalComponents * 0.3) score -= 30;
    
    // Bonus for low coupling
    if (summary.lowCouplingComponents > summary.totalComponents * 0.5) score += 10;
    
    return Math.max(0, Math.min(100, score));
  }

  generateCouplingRecommendations(components) {
    const recommendations = [];
    const summary = this.calculateCouplingSummary(components);

    if (summary.averageCoupling > 30) {
      recommendations.push({
        type: 'warning',
        message: 'High coupling detected. Consider reducing dependencies between components.',
        severity: 'high'
      });
    }

    if (summary.highCouplingComponents > summary.totalComponents * 0.3) {
      recommendations.push({
        type: 'refactoring',
        message: 'Many components have high coupling. Consider applying dependency injection or interface segregation.',
        severity: 'medium'
      });
    }

    if (summary.couplingScore < 50) {
      recommendations.push({
        type: 'improvement',
        message: 'Overall coupling score is low. Good component isolation detected.',
        severity: 'low'
      });
    }

    return recommendations;
  }

  async getConfiguration() {
    return {
      name: 'Coupling Analysis Service',
      version: '1.0.0',
      capabilities: ['coupling-analysis', 'dependency-tracking', 'component-isolation'],
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
        capabilities: ['import-analysis', 'export-analysis', 'coupling-scoring'],
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

module.exports = CouplingAnalysisService; 