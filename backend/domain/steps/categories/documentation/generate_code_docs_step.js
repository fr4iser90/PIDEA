/**
 * Generate Code Docs Step - Documentation Framework
 * Generate code documentation from AI analysis
 */

const path = require('path');
const fs = require('fs').promises;
const Logger = require('@logging/Logger');
const logger = new Logger('GenerateCodeDocsStep');

const config = {
  name: 'generate_code_docs',
  version: '1.0.0',
  description: 'Generate code documentation from AI analysis',
  category: 'documentation',
  framework: 'Documentation Framework',
  dependencies: [],
  settings: {
    includeScreenshots: true,
    stepByStep: true,
    outputFormat: 'markdown',
    outputPath: 'docs/code-documentation.md'
  }
};

class GenerateCodeDocsStep {
  constructor() {
    this.name = 'generate_code_docs';
    this.description = 'Generate code documentation from AI analysis';
    this.category = 'documentation';
    this.dependencies = [];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}, options = {}) {
    try {
      logger.info('🤖 Starting code documentation generation...');
      
      const projectPath = context.projectPath || process.cwd();
      const includeScreenshots = options.includeScreenshots || config.settings.includeScreenshots;
      const stepByStep = options.stepByStep || config.settings.stepByStep;
      const outputFormat = options.outputFormat || config.settings.outputFormat;
      const outputPath = options.outputPath || config.settings.outputPath;
      
      const result = {
        projectPath,
        includeScreenshots,
        stepByStep,
        outputFormat,
        outputPath,
        timestamp: new Date().toISOString(),
        documentation: '',
        filesAnalyzed: [],
        filesGenerated: []
      };

      // Analyze code files
      result.filesAnalyzed = await this.analyzeCodeFiles(projectPath);
      
      // Generate code documentation
      result.documentation = await this.generateCodeDocumentation(result.filesAnalyzed, {
        includeScreenshots,
        stepByStep,
        outputFormat
      });
      
      // Write documentation to file
      if (outputPath) {
        await this.writeDocumentation(result.documentation, outputPath);
        result.filesGenerated.push(outputPath);
      }
      
      logger.info(`✅ Code documentation generated successfully. Analyzed ${result.filesAnalyzed.length} files.`);
      
      return {
        success: true,
        data: result,
        metadata: {
          executionTime: Date.now() - context.startTime || 0,
          filesAnalyzed: result.filesAnalyzed.length,
          filesGenerated: result.filesGenerated.length
        }
      };
    } catch (error) {
      logger.error('❌ Code documentation generation failed:', error.message);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  async analyzeCodeFiles(projectPath) {
    const codeFiles = [];
    const supportedExtensions = ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.h'];
    
    try {
      await this.scanDirectory(projectPath, codeFiles, supportedExtensions);
    } catch (error) {
      logger.warn(`Warning: Could not scan directory ${projectPath}: ${error.message}`);
    }
    
    return codeFiles;
  }

  async scanDirectory(dirPath, codeFiles, supportedExtensions, currentDepth = 0, maxDepth = 5) {
    if (currentDepth >= maxDepth) return;
    
    try {
      const items = await fs.readdir(dirPath);
      
      for (const item of items) {
        if (item.startsWith('.') || item === 'node_modules') continue;
        
        const itemPath = path.join(dirPath, item);
        const stat = await fs.stat(itemPath);
        
        if (stat.isDirectory()) {
          await this.scanDirectory(itemPath, codeFiles, supportedExtensions, currentDepth + 1, maxDepth);
        } else {
          const ext = path.extname(item);
          if (supportedExtensions.includes(ext)) {
            const analysis = await this.analyzeCodeFile(itemPath);
            codeFiles.push(analysis);
          }
        }
      }
    } catch (error) {
      logger.warn(`Warning: Could not scan directory ${dirPath}: ${error.message}`);
    }
  }

  async analyzeCodeFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const stats = await fs.stat(filePath);
      
      return {
        path: filePath,
        name: path.basename(filePath),
        extension: path.extname(filePath),
        size: stats.size,
        lines: content.split('\n').length,
        functions: this.extractFunctions(content),
        classes: this.extractClasses(content),
        imports: this.extractImports(content),
        exports: this.extractExports(content),
        complexity: this.calculateComplexity(content)
      };
    } catch (error) {
      logger.warn(`Warning: Could not analyze file ${filePath}: ${error.message}`);
      return {
        path: filePath,
        name: path.basename(filePath),
        error: error.message
      };
    }
  }

  extractFunctions(content) {
    const functions = [];
    
    // JavaScript/TypeScript function patterns
    const jsPatterns = [
      /function\s+(\w+)\s*\(/g,
      /const\s+(\w+)\s*=\s*\(/g,
      /(\w+)\s*:\s*function/g,
      /(\w+)\s*\(/g
    ];
    
    for (const pattern of jsPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        functions.push({
          name: match[1],
          type: 'function'
        });
      }
    }
    
    return functions;
  }

  extractClasses(content) {
    const classes = [];
    
    // JavaScript/TypeScript class patterns
    const classPatterns = [
      /class\s+(\w+)/g,
      /interface\s+(\w+)/g,
      /type\s+(\w+)/g
    ];
    
    for (const pattern of classPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        classes.push({
          name: match[1],
          type: 'class'
        });
      }
    }
    
    return classes;
  }

  extractImports(content) {
    const imports = [];
    
    // Import patterns
    const importPatterns = [
      /import\s+.*from\s+['"]([^'"]+)['"]/g,
      /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g
    ];
    
    for (const pattern of importPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        imports.push(match[1]);
      }
    }
    
    return imports;
  }

  extractExports(content) {
    const exports = [];
    
    // Export patterns
    const exportPatterns = [
      /export\s+(?:default\s+)?(?:function|class|const|let|var)\s+(\w+)/g,
      /module\.exports\s*=\s*(\w+)/g
    ];
    
    for (const pattern of exportPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        exports.push(match[1]);
      }
    }
    
    return exports;
  }

  calculateComplexity(content) {
    const lines = content.split('\n');
    let complexity = 0;
    
    // Simple complexity calculation based on control structures
    const complexityPatterns = [
      /if\s*\(/g,
      /for\s*\(/g,
      /while\s*\(/g,
      /switch\s*\(/g,
      /catch\s*\(/g,
      /\?\s*.*\s*:/g
    ];
    
    for (const pattern of complexityPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    }
    
    return {
      cyclomatic: complexity,
      lines: lines.length,
      level: complexity < 5 ? 'low' : complexity < 10 ? 'medium' : 'high'
    };
  }

  async generateCodeDocumentation(files, options) {
    const { includeScreenshots, stepByStep, outputFormat } = options;
    
    if (outputFormat === 'markdown') {
      return this.generateMarkdownDocumentation(files, includeScreenshots, stepByStep);
    } else if (outputFormat === 'json') {
      return JSON.stringify(files, null, 2);
    } else {
      return this.generateTextDocumentation(files);
    }
  }

  generateMarkdownDocumentation(files, includeScreenshots, stepByStep) {
    let markdown = `# Code Documentation\n\n`;
    markdown += `**Generated on:** ${new Date().toISOString()}\n\n`;
    markdown += `## Overview\n\n`;
    markdown += `This document provides comprehensive documentation for the codebase.\n\n`;
    markdown += `**Total Files Analyzed:** ${files.length}\n\n`;
    
    // Summary statistics
    const stats = this.calculateStats(files);
    markdown += `## Summary Statistics\n\n`;
    markdown += `- **Total Functions:** ${stats.totalFunctions}\n`;
    markdown += `- **Total Classes:** ${stats.totalClasses}\n`;
    markdown += `- **Total Lines:** ${stats.totalLines}\n`;
    markdown += `- **Average Complexity:** ${stats.averageComplexity}\n\n`;
    
    // File-by-file documentation
    markdown += `## File Documentation\n\n`;
    
    for (const file of files) {
      if (file.error) continue;
      
      markdown += `### ${file.name}\n\n`;
      markdown += `**Path:** \`${file.path}\`\n\n`;
      markdown += `**Size:** ${file.size} bytes\n`;
      markdown += `**Lines:** ${file.lines}\n`;
      markdown += `**Complexity:** ${file.complexity.level} (${file.complexity.cyclomatic})\n\n`;
      
      if (file.functions.length > 0) {
        markdown += `#### Functions\n\n`;
        for (const func of file.functions) {
          markdown += `- \`${func.name}()\`\n`;
        }
        markdown += '\n';
      }
      
      if (file.classes.length > 0) {
        markdown += `#### Classes/Interfaces\n\n`;
        for (const cls of file.classes) {
          markdown += `- \`${cls.name}\`\n`;
        }
        markdown += '\n';
      }
      
      if (file.imports.length > 0) {
        markdown += `#### Imports\n\n`;
        for (const imp of file.imports) {
          markdown += `- \`${imp}\`\n`;
        }
        markdown += '\n';
      }
      
      if (file.exports.length > 0) {
        markdown += `#### Exports\n\n`;
        for (const exp of file.exports) {
          markdown += `- \`${exp}\`\n`;
        }
        markdown += '\n';
      }
      
      markdown += '---\n\n';
    }
    
    if (includeScreenshots) {
      markdown += `## Screenshots\n\n`;
      markdown += `*Screenshots would be included here if available*\n\n`;
    }
    
    if (stepByStep) {
      markdown += `## Step-by-Step Guide\n\n`;
      markdown += `1. **Setup:** Ensure all dependencies are installed\n`;
      markdown += `2. **Configuration:** Configure environment variables\n`;
      markdown += `3. **Execution:** Run the application\n`;
      markdown += `4. **Testing:** Execute test suite\n\n`;
    }
    
    return markdown;
  }

  calculateStats(files) {
    let totalFunctions = 0;
    let totalClasses = 0;
    let totalLines = 0;
    let totalComplexity = 0;
    
    for (const file of files) {
      if (file.error) continue;
      
      totalFunctions += file.functions?.length || 0;
      totalClasses += file.classes?.length || 0;
      totalLines += file.lines || 0;
      totalComplexity += file.complexity?.cyclomatic || 0;
    }
    
    return {
      totalFunctions,
      totalClasses,
      totalLines,
      averageComplexity: files.length > 0 ? (totalComplexity / files.length).toFixed(2) : 0
    };
  }

  generateTextDocumentation(files) {
    let text = `Code Documentation\n`;
    text += `Generated on: ${new Date().toISOString()}\n\n`;
    text += `Files Analyzed: ${files.length}\n\n`;
    
    for (const file of files) {
      if (file.error) continue;
      
      text += `File: ${file.name}\n`;
      text += `Path: ${file.path}\n`;
      text += `Size: ${file.size} bytes\n`;
      text += `Lines: ${file.lines}\n`;
      text += `Complexity: ${file.complexity.level}\n\n`;
    }
    
    return text;
  }

  async writeDocumentation(content, outputPath) {
    try {
      const fullPath = path.resolve(outputPath);
      const dir = path.dirname(fullPath);
      
      // Ensure directory exists
      await fs.mkdir(dir, { recursive: true });
      
      // Write file
      await fs.writeFile(fullPath, content, 'utf8');
      
      logger.info(`📝 Code documentation written to: ${fullPath}`);
    } catch (error) {
      logger.error(`❌ Failed to write code documentation: ${error.message}`);
      throw error;
    }
  }
}

// Create instance for execution
const stepInstance = new GenerateCodeDocsStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
};
