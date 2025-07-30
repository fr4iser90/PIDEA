/**
 * PatternAnalysisService - Infrastructure Layer
 * Code pattern detection service
 * 
 * Created: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
 * Purpose: Code pattern detection and analysis
 */

const Logger = require('@logging/Logger');
const fs = require('fs').promises;
const path = require('path');

class PatternAnalysisService {
  constructor() {
    this.logger = new Logger('PatternAnalysisService');
    this.baseUrl = process.env.PATTERN_API_URL;
    this.apiKey = process.env.PATTERN_API_KEY;
    this.timeout = parseInt(process.env.PATTERN_TIMEOUT) || 30000;
  }

  async analyze(params) {
    try {
      this.logger.info('Starting pattern analysis', { projectId: params.projectId });
      
      const { projectPath, config = {} } = params;
      const patternConfig = {
        ...config,
        patterns: config.patterns || ['singleton', 'factory', 'observer', 'decorator'],
        fileTypes: config.fileTypes || ['js', 'jsx', 'ts', 'tsx']
      };

      const result = await this.analyzeCodePatterns(projectPath, patternConfig);
      
      this.logger.info('Pattern analysis completed successfully', { 
        projectId: params.projectId,
        patterns: result.patterns?.length || 0 
      });

      return {
        success: true,
        data: result,
        metadata: {
          scanner: 'pattern',
          timestamp: new Date().toISOString(),
          config: patternConfig
        }
      };
    } catch (error) {
      this.logger.error('Pattern analysis failed', { 
        projectId: params.projectId, 
        error: error.message 
      });
      throw error;
    }
  }

  async analyzeCodePatterns(projectPath, config) {
    const files = await this.getCodeFiles(projectPath, config.fileTypes);
    const patterns = [];

    for (const file of files) {
      const filePatterns = await this.detectPatternsInFile(file, config.patterns);
      patterns.push(...filePatterns);
    }

    return {
      patterns: patterns,
      summary: this.calculatePatternSummary(patterns),
      recommendations: this.generatePatternRecommendations(patterns)
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

  async detectPatternsInFile(filePath, patterns) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const filePatterns = [];

      for (const pattern of patterns) {
        const matches = this.detectPattern(content, pattern, filePath);
        filePatterns.push(...matches);
      }

      return filePatterns;
    } catch (error) {
      this.logger.warn('Failed to analyze file', { file: filePath, error: error.message });
      return [];
    }
  }

  detectPattern(content, patternType, filePath) {
    const patterns = [];
    
    switch (patternType) {
      case 'singleton':
        patterns.push(...this.detectSingletonPattern(content, filePath));
        break;
      case 'factory':
        patterns.push(...this.detectFactoryPattern(content, filePath));
        break;
      case 'observer':
        patterns.push(...this.detectObserverPattern(content, filePath));
        break;
      case 'decorator':
        patterns.push(...this.detectDecoratorPattern(content, filePath));
        break;
    }
    
    return patterns;
  }

  detectSingletonPattern(content, filePath) {
    const patterns = [];
    const singletonRegex = /class\s+\w+\s*\{[^}]*static\s+getInstance\s*\(\)[^}]*\}/gs;
    const matches = content.match(singletonRegex);
    
    if (matches) {
      patterns.push({
        type: 'singleton',
        file: filePath,
        confidence: 'high',
        description: 'Singleton pattern detected'
      });
    }
    
    return patterns;
  }

  detectFactoryPattern(content, filePath) {
    const patterns = [];
    const factoryRegex = /(create|build|make)\w*\s*\([^)]*\)\s*\{[^}]*return\s+new\s+\w+/gi;
    const matches = content.match(factoryRegex);
    
    if (matches) {
      patterns.push({
        type: 'factory',
        file: filePath,
        confidence: 'medium',
        description: 'Factory pattern detected'
      });
    }
    
    return patterns;
  }

  detectObserverPattern(content, filePath) {
    const patterns = [];
    const observerRegex = /(addEventListener|on|subscribe|emit|publish)/gi;
    const matches = content.match(observerRegex);
    
    if (matches && matches.length > 2) {
      patterns.push({
        type: 'observer',
        file: filePath,
        confidence: 'medium',
        description: 'Observer pattern detected'
      });
    }
    
    return patterns;
  }

  detectDecoratorPattern(content, filePath) {
    const patterns = [];
    const decoratorRegex = /@\w+|function\s+\w+\s*\([^)]*\)\s*\{[^}]*return\s+function/gi;
    const matches = content.match(decoratorRegex);
    
    if (matches) {
      patterns.push({
        type: 'decorator',
        file: filePath,
        confidence: 'medium',
        description: 'Decorator pattern detected'
      });
    }
    
    return patterns;
  }

  calculatePatternSummary(patterns) {
    const summary = {
      totalPatterns: patterns.length,
      byType: {},
      byConfidence: {},
      patternScore: 0
    };

    for (const pattern of patterns) {
      summary.byType[pattern.type] = (summary.byType[pattern.type] || 0) + 1;
      summary.byConfidence[pattern.confidence] = (summary.byConfidence[pattern.confidence] || 0) + 1;
    }

    summary.patternScore = this.calculatePatternScore(summary);
    return summary;
  }

  calculatePatternScore(summary) {
    let score = 0;
    
    // Bonus for good patterns
    if (summary.byType['singleton']) score += 10;
    if (summary.byType['factory']) score += 15;
    if (summary.byType['observer']) score += 20;
    if (summary.byType['decorator']) score += 15;
    
    // Bonus for high confidence patterns
    if (summary.byConfidence['high']) score += 5;
    
    return Math.min(100, score);
  }

  generatePatternRecommendations(patterns) {
    const recommendations = [];
    const summary = this.calculatePatternSummary(patterns);

    if (summary.totalPatterns === 0) {
      recommendations.push({
        type: 'improvement',
        message: 'No design patterns detected. Consider implementing common patterns for better code organization.',
        severity: 'medium'
      });
    }

    if (summary.byType['singleton'] > 5) {
      recommendations.push({
        type: 'warning',
        message: 'Many singleton patterns detected. Consider if all are necessary.',
        severity: 'medium'
      });
    }

    if (summary.patternScore > 50) {
      recommendations.push({
        type: 'positive',
        message: 'Good use of design patterns detected. Code follows established architectural principles.',
        severity: 'low'
      });
    }

    return recommendations;
  }

  async getConfiguration() {
    return {
      name: 'Pattern Analysis Service',
      version: '1.0.0',
      capabilities: ['pattern-detection', 'design-analysis', 'code-quality-assessment'],
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
        capabilities: ['pattern-detection', 'code-analysis', 'design-patterns'],
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

module.exports = PatternAnalysisService; 