/**
 * Validate Documentation Step - Documentation Framework
 * Validate documentation completeness and accuracy
 */

const path = require('path');
const fs = require('fs').promises;
const Logger = require('@logging/Logger');
const logger = new Logger('ValidateDocumentationStep');

const config = {
  name: 'validate_documentation',
  version: '1.0.0',
  description: 'Validate documentation completeness and accuracy',
  category: 'documentation',
  framework: 'Documentation Framework',
  dependencies: [],
  settings: {
    checkLinks: true,
    validateExamples: true,
    checkSpelling: false,
    outputFormat: 'json'
  }
};

class ValidateDocumentationStep {
  constructor() {
    this.name = 'validate_documentation';
    this.description = 'Validate documentation completeness and accuracy';
    this.category = 'documentation';
    this.dependencies = [];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}, options = {}) {
    try {
      logger.info('🔍 Starting documentation validation...');
      
      const projectPath = context.projectPath || process.cwd();
      const checkLinks = options.checkLinks || config.settings.checkLinks;
      const validateExamples = options.validateExamples || config.settings.validateExamples;
      const checkSpelling = options.checkSpelling || config.settings.checkSpelling;
      const outputFormat = options.outputFormat || config.settings.outputFormat;
      
      const result = {
        projectPath,
        checkLinks,
        validateExamples,
        checkSpelling,
        outputFormat,
        timestamp: new Date().toISOString(),
        validation: {
          overall: 'pending',
          score: 0,
          issues: [],
          recommendations: [],
          files: []
        }
      };

      // Find documentation files
      const docFiles = await this.findDocumentationFiles(projectPath);
      
      // Validate each documentation file
      for (const docFile of docFiles) {
        const validation = await this.validateDocumentationFile(docFile, {
          checkLinks,
          validateExamples,
          checkSpelling
        });
        result.validation.files.push(validation);
      }
      
      // Calculate overall validation score
      result.validation = this.calculateOverallValidation(result.validation);
      
      logger.info(`✅ Documentation validation completed. Score: ${result.validation.score}/100`);
      
      return {
        success: true,
        data: result,
        metadata: {
          executionTime: Date.now() - context.startTime || 0,
          filesValidated: result.validation.files.length,
          issuesFound: result.validation.issues.length,
          score: result.validation.score
        }
      };
    } catch (error) {
      logger.error('❌ Documentation validation failed:', error.message);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  async findDocumentationFiles(projectPath) {
    const docFiles = [];
    const docExtensions = ['.md', '.txt', '.rst', '.adoc'];
    
    try {
      await this.scanForDocumentation(projectPath, docFiles, docExtensions);
    } catch (error) {
      logger.warn(`Warning: Could not scan for documentation files: ${error.message}`);
    }
    
    return docFiles;
  }

  async scanForDocumentation(dirPath, docFiles, docExtensions, currentDepth = 0, maxDepth = 5) {
    if (currentDepth >= maxDepth) return;
    
    try {
      const items = await fs.readdir(dirPath);
      
      for (const item of items) {
        if (item.startsWith('.') || item === 'node_modules') continue;
        
        const itemPath = path.join(dirPath, item);
        const stat = await fs.stat(itemPath);
        
        if (stat.isDirectory()) {
          await this.scanForDocumentation(itemPath, docFiles, docExtensions, currentDepth + 1, maxDepth);
        } else {
          const ext = path.extname(item);
          if (docExtensions.includes(ext)) {
            docFiles.push({
              path: itemPath,
              name: item,
              extension: ext,
              size: stat.size
            });
          }
        }
      }
    } catch (error) {
      logger.warn(`Warning: Could not scan directory ${dirPath}: ${error.message}`);
    }
  }

  async validateDocumentationFile(docFile, options) {
    const { checkLinks, validateExamples, checkSpelling } = options;
    
    const validation = {
      file: docFile.path,
      name: docFile.name,
      size: docFile.size,
      score: 0,
      issues: [],
      recommendations: [],
      checks: {
        structure: 'pending',
        links: 'pending',
        examples: 'pending',
        spelling: 'pending'
      }
    };

    try {
      const content = await fs.readFile(docFile.path, 'utf8');
      
      // Check document structure
      validation.checks.structure = this.checkDocumentStructure(content);
      
      // Check links if enabled
      if (checkLinks) {
        validation.checks.links = await this.checkLinks(content, docFile.path);
      }
      
      // Validate examples if enabled
      if (validateExamples) {
        validation.checks.examples = this.validateExamples(content);
      }
      
      // Check spelling if enabled
      if (checkSpelling) {
        validation.checks.spelling = this.checkSpelling(content);
      }
      
      // Calculate file score
      validation.score = this.calculateFileScore(validation.checks);
      
      // Generate recommendations
      validation.recommendations = this.generateFileRecommendations(validation.checks, docFile);
      
    } catch (error) {
      validation.issues.push({
        type: 'error',
        message: `Could not read file: ${error.message}`,
        severity: 'high'
      });
      validation.score = 0;
    }

    return validation;
  }

  checkDocumentStructure(content) {
    const issues = [];
    let score = 100;
    
    // Check for title
    if (!content.match(/^#\s+.+$/m)) {
      issues.push({
        type: 'structure',
        message: 'Missing main title (H1)',
        severity: 'medium'
      });
      score -= 20;
    }
    
    // Check for table of contents
    if (!content.includes('##') && content.split('\n').length > 50) {
      issues.push({
        type: 'structure',
        message: 'Long document should have table of contents',
        severity: 'low'
      });
      score -= 10;
    }
    
    // Check for proper heading hierarchy
    const headings = content.match(/^#+\s+.+$/gm) || [];
    let prevLevel = 0;
    
    for (const heading of headings) {
      const level = heading.match(/^#+/)[0].length;
      if (level > prevLevel + 1) {
        issues.push({
          type: 'structure',
          message: 'Improper heading hierarchy',
          severity: 'medium'
        });
        score -= 15;
        break;
      }
      prevLevel = level;
    }
    
    return {
      score: Math.max(0, score),
      issues,
      status: score >= 80 ? 'pass' : score >= 60 ? 'warning' : 'fail'
    };
  }

  async checkLinks(content, filePath) {
    const issues = [];
    let score = 100;
    
    // Find all links
    const linkPatterns = [
      /\[([^\]]+)\]\(([^)]+)\)/g,  // Markdown links
      /<a[^>]+href=["']([^"']+)["'][^>]*>/g  // HTML links
    ];
    
    const links = [];
    for (const pattern of linkPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        links.push({
          text: match[1],
          url: match[2],
          type: 'markdown'
        });
      }
    }
    
    // Validate each link
    for (const link of links) {
      const validation = await this.validateLink(link, filePath);
      if (!validation.valid) {
        issues.push({
          type: 'link',
          message: `Invalid link: ${link.url} - ${validation.reason}`,
          severity: validation.severity
        });
        score -= validation.severity === 'high' ? 20 : 10;
      }
    }
    
    return {
      score: Math.max(0, score),
      issues,
      linksChecked: links.length,
      status: score >= 80 ? 'pass' : score >= 60 ? 'warning' : 'fail'
    };
  }

  async validateLink(link, filePath) {
    const { url } = link;
    
    // Check for common issues
    if (url.startsWith('http')) {
      // External link - basic validation
      if (!url.match(/^https?:\/\/.+/)) {
        return { valid: false, reason: 'Invalid URL format', severity: 'high' };
      }
      return { valid: true, reason: 'Valid external link' };
    } else if (url.startsWith('#')) {
      // Anchor link - check if target exists
      return { valid: true, reason: 'Anchor link' };
    } else {
      // Relative link - check if file exists
      const targetPath = path.resolve(path.dirname(filePath), url);
      try {
        await fs.access(targetPath);
        return { valid: true, reason: 'File exists' };
      } catch (error) {
        return { valid: false, reason: 'File not found', severity: 'high' };
      }
    }
  }

  validateExamples(content) {
    const issues = [];
    let score = 100;
    
    // Check for code blocks
    const codeBlocks = content.match(/```[\s\S]*?```/g) || [];
    
    if (codeBlocks.length === 0) {
      issues.push({
        type: 'examples',
        message: 'No code examples found',
        severity: 'medium'
      });
      score -= 30;
    }
    
    // Check for inline code
    const inlineCode = content.match(/`[^`]+`/g) || [];
    
    if (inlineCode.length === 0 && codeBlocks.length === 0) {
      issues.push({
        type: 'examples',
        message: 'No code examples or inline code found',
        severity: 'high'
      });
      score -= 40;
    }
    
    return {
      score: Math.max(0, score),
      issues,
      codeBlocks: codeBlocks.length,
      inlineCode: inlineCode.length,
      status: score >= 80 ? 'pass' : score >= 60 ? 'warning' : 'fail'
    };
  }

  checkSpelling(content) {
    // Basic spelling check - this is a simplified version
    const issues = [];
    let score = 100;
    
    // Common misspellings
    const misspellings = {
      'teh': 'the',
      'adn': 'and',
      'recieve': 'receive',
      'seperate': 'separate',
      'occured': 'occurred'
    };
    
    for (const [misspelling, correction] of Object.entries(misspellings)) {
      const regex = new RegExp(`\\b${misspelling}\\b`, 'gi');
      if (regex.test(content)) {
        issues.push({
          type: 'spelling',
          message: `Misspelling found: "${misspelling}" should be "${correction}"`,
          severity: 'low'
        });
        score -= 5;
      }
    }
    
    return {
      score: Math.max(0, score),
      issues,
      status: score >= 80 ? 'pass' : score >= 60 ? 'warning' : 'fail'
    };
  }

  calculateFileScore(checks) {
    const weights = {
      structure: 0.3,
      links: 0.3,
      examples: 0.3,
      spelling: 0.1
    };
    
    let totalScore = 0;
    let totalWeight = 0;
    
    for (const [checkType, result] of Object.entries(checks)) {
      if (result !== 'pending') {
        totalScore += result.score * weights[checkType];
        totalWeight += weights[checkType];
      }
    }
    
    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  }

  generateFileRecommendations(checks, docFile) {
    const recommendations = [];
    
    for (const [checkType, result] of Object.entries(checks)) {
      if (result !== 'pending' && result.issues) {
        for (const issue of result.issues) {
          if (issue.severity === 'high' || issue.severity === 'medium') {
            recommendations.push({
              type: checkType,
              issue: issue.message,
              priority: issue.severity,
              suggestion: this.getSuggestion(issue.type, issue.message)
            });
          }
        }
      }
    }
    
    return recommendations;
  }

  getSuggestion(type, message) {
    const suggestions = {
      'structure': 'Review document structure and add proper headings',
      'link': 'Check and fix broken links',
      'examples': 'Add code examples to improve documentation',
      'spelling': 'Review and correct spelling errors'
    };
    
    return suggestions[type] || 'Review and improve documentation';
  }

  calculateOverallValidation(validation) {
    const files = validation.files;
    if (files.length === 0) {
      validation.overall = 'no-files';
      validation.score = 0;
      return validation;
    }
    
    let totalScore = 0;
    const allIssues = [];
    const allRecommendations = [];
    
    for (const file of files) {
      totalScore += file.score;
      allIssues.push(...file.issues);
      allRecommendations.push(...file.recommendations);
    }
    
    validation.score = Math.round(totalScore / files.length);
    validation.issues = allIssues;
    validation.recommendations = allRecommendations;
    
    if (validation.score >= 80) {
      validation.overall = 'excellent';
    } else if (validation.score >= 60) {
      validation.overall = 'good';
    } else if (validation.score >= 40) {
      validation.overall = 'needs-improvement';
    } else {
      validation.overall = 'poor';
    }
    
    return validation;
  }
}

// Create instance for execution
const stepInstance = new ValidateDocumentationStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
};
