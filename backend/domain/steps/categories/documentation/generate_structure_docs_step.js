/**
 * Generate Structure Docs Step - Documentation Framework
 * Generate structure documentation from script
 */

const path = require('path');
const fs = require('fs').promises;
const Logger = require('../../../../infrastructure/logging/Logger');

const config = {
  name: 'generate_structure_docs',
  version: '1.0.0',
  description: 'Generate structure documentation from script',
  category: 'documentation',
  framework: 'Documentation Framework',
  dependencies: [],
  settings: {
    format: 'markdown',
    includeExamples: true,
    outputPath: 'docs/structure.md'
  }
};

class GenerateStructureDocsStep {
  constructor() {
    this.name = 'generate_structure_docs';
    this.description = 'Generate structure documentation from script';
    this.category = 'documentation';
    this.dependencies = [];
    this.logger = new Logger('GenerateStructureDocsStep');
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}, options = {}) {
    try {
      this.logger.info('📝 Starting structure documentation generation...');
      
      const projectPath = context.projectPath || process.cwd();
      const format = options.format || config.settings.format;
      const includeExamples = options.includeExamples || config.settings.includeExamples;
      const outputPath = options.outputPath || config.settings.outputPath;
      
      const result = {
        projectPath,
        format,
        includeExamples,
        outputPath,
        timestamp: new Date().toISOString(),
        documentation: '',
        filesGenerated: []
      };

      // Generate structure documentation
      result.documentation = await this.generateStructureDocumentation(projectPath, format, includeExamples);
      
      // Write documentation to file
      if (outputPath) {
        await this.writeDocumentation(result.documentation, outputPath);
        result.filesGenerated.push(outputPath);
      }
      
      this.logger.info(`✅ Structure documentation generated successfully. Format: ${format}`);
      
      return {
        success: true,
        data: result,
        metadata: {
          executionTime: Date.now() - context.startTime || 0,
          format,
          filesGenerated: result.filesGenerated.length
        }
      };
    } catch (error) {
      this.logger.error('❌ Structure documentation generation failed:', error.message);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  async generateStructureDocumentation(projectPath, format, includeExamples) {
    const structure = await this.analyzeProjectStructure(projectPath);
    
    if (format === 'markdown') {
      return this.generateMarkdownDocumentation(structure, includeExamples);
    } else if (format === 'json') {
      return JSON.stringify(structure, null, 2);
    } else {
      return this.generateTextDocumentation(structure);
    }
  }

  async analyzeProjectStructure(projectPath) {
    const structure = {
      name: path.basename(projectPath),
      path: projectPath,
      type: 'project',
      children: []
    };

    try {
      const items = await fs.readdir(projectPath);
      
      for (const item of items) {
        if (item.startsWith('.') || item === 'node_modules') continue;
        
        const itemPath = path.join(projectPath, item);
        const stat = await fs.stat(itemPath);
        
        if (stat.isDirectory()) {
          const subStructure = await this.analyzeDirectory(itemPath, item);
          structure.children.push(subStructure);
        } else {
          structure.children.push({
            name: item,
            type: 'file',
            extension: path.extname(item),
            size: stat.size
          });
        }
      }
    } catch (error) {
      this.logger.warn(`Warning: Could not analyze directory ${projectPath}: ${error.message}`);
    }

    return structure;
  }

  async analyzeDirectory(dirPath, dirName) {
    const structure = {
      name: dirName,
      type: 'directory',
      children: []
    };

    try {
      const items = await fs.readdir(dirPath);
      
      for (const item of items) {
        if (item.startsWith('.')) continue;
        
        const itemPath = path.join(dirPath, item);
        const stat = await fs.stat(itemPath);
        
        if (stat.isDirectory()) {
          const subStructure = await this.analyzeDirectory(itemPath, item);
          structure.children.push(subStructure);
        } else {
          structure.children.push({
            name: item,
            type: 'file',
            extension: path.extname(item),
            size: stat.size
          });
        }
      }
    } catch (error) {
      this.logger.warn(`Warning: Could not analyze directory ${dirPath}: ${error.message}`);
    }

    return structure;
  }

  generateMarkdownDocumentation(structure, includeExamples) {
    let markdown = `# Project Structure Documentation\n\n`;
    markdown += `**Generated on:** ${new Date().toISOString()}\n\n`;
    markdown += `## Overview\n\n`;
    markdown += `This document provides a comprehensive overview of the project structure for \`${structure.name}\`.\n\n`;
    
    markdown += `## Directory Structure\n\n`;
    markdown += this.generateDirectoryTree(structure, 0);
    
    if (includeExamples) {
      markdown += `\n## Examples\n\n`;
      markdown += this.generateExamples(structure);
    }
    
    markdown += `\n## Notes\n\n`;
    markdown += `- This documentation is automatically generated\n`;
    markdown += `- Hidden files and directories are excluded\n`;
    markdown += `- File sizes are approximate\n\n`;
    
    return markdown;
  }

  generateDirectoryTree(structure, depth) {
    let tree = '';
    const indent = '  '.repeat(depth);
    
    if (structure.type === 'directory') {
      tree += `${indent}- 📁 **${structure.name}**\n`;
    } else if (structure.type === 'file') {
      const icon = this.getFileIcon(structure.extension);
      tree += `${indent}- ${icon} **${structure.name}**\n`;
    }
    
    if (structure.children) {
      for (const child of structure.children) {
        tree += this.generateDirectoryTree(child, depth + 1);
      }
    }
    
    return tree;
  }

  getFileIcon(extension) {
    const iconMap = {
      '.js': '📄',
      '.jsx': '⚛️',
      '.ts': '📘',
      '.tsx': '⚛️',
      '.json': '📋',
      '.md': '📝',
      '.css': '🎨',
      '.html': '🌐',
      '.png': '🖼️',
      '.jpg': '🖼️',
      '.svg': '🖼️',
      '.gitignore': '🚫',
      '.env': '🔐',
      '.lock': '🔒'
    };
    return iconMap[extension] || '📄';
  }

  generateExamples(structure) {
    let examples = '';
    
    // Find example files
    const exampleFiles = this.findExampleFiles(structure);
    
    if (exampleFiles.length > 0) {
      examples += `### Example Files\n\n`;
      for (const file of exampleFiles) {
        examples += `- \`${file.path}\` - ${file.description}\n`;
      }
      examples += '\n';
    }
    
    return examples;
  }

  findExampleFiles(structure) {
    const examples = [];
    
    this.traverseStructure(structure, (item) => {
      if (item.type === 'file') {
        if (item.name.includes('example') || item.name.includes('demo')) {
          examples.push({
            path: item.name,
            description: 'Example or demo file'
          });
        }
      }
    });
    
    return examples;
  }

  traverseStructure(structure, callback) {
    callback(structure);
    if (structure.children) {
      for (const child of structure.children) {
        this.traverseStructure(child, callback);
      }
    }
  }

  generateTextDocumentation(structure) {
    let text = `Project Structure Documentation\n`;
    text += `Generated on: ${new Date().toISOString()}\n\n`;
    text += `Project: ${structure.name}\n\n`;
    text += this.generateTextTree(structure, 0);
    return text;
  }

  generateTextTree(structure, depth) {
    let text = '';
    const indent = '  '.repeat(depth);
    
    if (structure.type === 'directory') {
      text += `${indent}📁 ${structure.name}/\n`;
    } else if (structure.type === 'file') {
      text += `${indent}📄 ${structure.name}\n`;
    }
    
    if (structure.children) {
      for (const child of structure.children) {
        text += this.generateTextTree(child, depth + 1);
      }
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
      
      this.logger.info(`📝 Documentation written to: ${fullPath}`);
    } catch (error) {
      this.logger.error(`❌ Failed to write documentation: ${error.message}`);
      throw error;
    }
  }
}

// Create instance for execution
const stepInstance = new GenerateStructureDocsStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
};
