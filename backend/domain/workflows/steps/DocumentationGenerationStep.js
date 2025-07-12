/**
 * DocumentationGenerationStep - Documentation generation workflow step
 * 
 * This step handles documentation generation operations, migrating the logic from
 * GenerateDocumentationHandler to the unified workflow system. It provides
 * validation, complexity management, and performance optimization for documentation generation.
 */
const { DocumentationStep } = require('./DocumentationStep');
const fs = require('fs').promises;
const path = require('path');

/**
 * Documentation generation workflow step
 */
class DocumentationGenerationStep extends DocumentationStep {
  /**
   * Create a new documentation generation step
   * @param {Object} options - Step options
   */
  constructor(options = {}) {
    super('generate-documentation', {
      name: 'documentation_generation',
      description: 'Generate project documentation',
      version: '1.0.0',
      ...options
    });
    
    this.includeAPI = options.includeAPI !== false;
    this.includeArchitecture = options.includeArchitecture !== false;
    this.includeExamples = options.includeExamples !== false;
    this.includeDiagrams = options.includeDiagrams !== false;
    this.includeChangelog = options.includeChangelog !== false;
    this.includeTutorials = options.includeTutorials !== false;
    this.autoGenerate = options.autoGenerate !== false;
    this.logger = options.logger || console;
  }

  /**
   * Execute documentation generation step
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<Object>} Documentation generation result
   */
  async executeStep(context) {
    const projectPath = context.get('projectPath');
    const command = context.get('command');
    
    if (!projectPath) {
      throw new Error('Project path not found in context');
    }

    this.logger.info('DocumentationGenerationStep: Starting documentation generation', {
      projectPath,
      includeAPI: this.includeAPI,
      includeArchitecture: this.includeArchitecture,
      includeExamples: this.includeExamples,
      includeDiagrams: this.includeDiagrams,
      includeChangelog: this.includeChangelog,
      includeTutorials: this.includeTutorials,
      autoGenerate: this.autoGenerate
    });

    try {
      // Step 1: Validate command
      if (command) {
        const validation = command.validateBusinessRules();
        if (!validation.isValid) {
          throw new Error(`Business rule validation failed: ${validation.errors.join(', ')}`);
        }
      }

      // Step 2: Get options and configuration
      const options = command ? command.getGenerateOptions() : this.getDefaultOptions();
      const outputConfig = command ? command.getOutputConfiguration() : this.getDefaultOutputConfig();

      // Step 3: Analyze project structure
      const projectStructure = await this.analyzeProjectStructure(projectPath);
      
      // Step 4: Extract code documentation
      const codeDocumentation = await this.extractCodeDocumentation(projectPath, projectStructure);
      
      // Step 5: Generate documentation based on options
      const results = {};
      
      if (this.includeAPI) {
        results.apiDocs = await this.generateAPIDocumentation(projectPath, codeDocumentation, options);
      }
      
      if (this.includeArchitecture) {
        results.architectureDocs = await this.generateArchitectureDocumentation(projectPath, projectStructure, options);
      }
      
      if (this.includeExamples) {
        results.examples = await this.generateExamples(projectPath, codeDocumentation, options);
      }
      
      if (this.includeDiagrams) {
        results.diagrams = await this.generateDiagrams(projectPath, projectStructure, options);
      }
      
      if (this.includeChangelog) {
        results.changelog = await this.generateChangelog(projectPath, options);
      }
      
      if (this.includeTutorials) {
        results.tutorials = await this.generateTutorials(projectPath, codeDocumentation, options);
      }
      
      // Step 6: Consolidate documentation (if enabled)
      let consolidationResults = null;
      if (this.autoGenerate) {
        consolidationResults = await this.consolidateDocumentation(projectPath, results);
      }

      // Step 7: Generate output
      const output = await this.generateOutput({
        command,
        projectStructure,
        codeDocumentation,
        results,
        consolidationResults,
        outputConfig
      });

      // Step 8: Save results
      if (command) {
        await this.saveResults(command, output);
      }

      this.logger.info('DocumentationGenerationStep: Documentation generation completed successfully', {
        projectPath,
        generatedDocs: Object.keys(results).length,
        totalFiles: this.countGeneratedFiles(results)
      });

      return {
        success: true,
        commandId: command ? command.commandId : null,
        output,
        metadata: this.getMetadata()
      };

    } catch (error) {
      this.logger.error('DocumentationGenerationStep: Documentation generation failed', {
        projectPath,
        error: error.message
      });

      // Publish failure event if event bus is available
      const eventBus = context.get('eventBus');
      if (eventBus) {
        await eventBus.publish('documentation.generation.failed', {
          commandId: command ? command.commandId : null,
          projectPath,
          error: error.message,
          timestamp: new Date()
        });
      }

      throw error;
    }
  }

  /**
   * Analyze project structure
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Project structure
   */
  async analyzeProjectStructure(projectPath) {
    try {
      const structure = {
        type: 'unknown',
        hasPackageJson: false,
        hasReadme: false,
        hasApiDocs: false,
        hasArchitectureDocs: false,
        frameworks: [],
        dependencies: {},
        devDependencies: {},
        directories: [],
        files: []
      };

      // Check for package.json
      try {
        const packagePath = path.join(projectPath, 'package.json');
        const packageJson = JSON.parse(await fs.readFile(packagePath, 'utf-8'));
        structure.hasPackageJson = true;
        structure.dependencies = packageJson.dependencies || {};
        structure.devDependencies = packageJson.devDependencies || {};
        
        // Detect frameworks and tools
        if (packageJson.dependencies?.react) structure.frameworks.push('react');
        if (packageJson.dependencies?.vue) structure.frameworks.push('vue');
        if (packageJson.dependencies?.express) structure.frameworks.push('express');
        if (packageJson.dependencies?.next) structure.frameworks.push('next');
      } catch (error) {
        // package.json not found or invalid
      }

      // Check for existing documentation
      try {
        await fs.access(path.join(projectPath, 'README.md'));
        structure.hasReadme = true;
      } catch (error) {
        // README.md not found
      }

      try {
        await fs.access(path.join(projectPath, 'docs'));
        structure.hasApiDocs = true;
      } catch (error) {
        // docs directory not found
      }

      // Scan project structure
      const items = await fs.readdir(projectPath, { withFileTypes: true });
      for (const item of items) {
        if (item.isDirectory()) {
          structure.directories.push(item.name);
        } else {
          structure.files.push(item.name);
        }
      }

      // Determine project type
      if (structure.frameworks.includes('react') || structure.frameworks.includes('vue')) {
        structure.type = 'frontend';
      } else if (structure.frameworks.includes('express')) {
        structure.type = 'backend';
      } else if (structure.frameworks.includes('next')) {
        structure.type = 'fullstack';
      } else {
        structure.type = 'generic';
      }

      return structure;
    } catch (error) {
      this.logger.warn('DocumentationGenerationStep: Failed to analyze project structure', {
        projectPath,
        error: error.message
      });
      return { type: 'unknown', frameworks: [], dependencies: {}, devDependencies: {}, directories: [], files: [] };
    }
  }

  /**
   * Extract code documentation
   * @param {string} projectPath - Project path
   * @param {Object} projectStructure - Project structure
   * @returns {Promise<Object>} Code documentation
   */
  async extractCodeDocumentation(projectPath, projectStructure) {
    this.logger.info('DocumentationGenerationStep: Extracting code documentation...');
    
    const documentation = {
      functions: [],
      classes: [],
      modules: [],
      interfaces: [],
      types: [],
      comments: []
    };

    try {
      // Extract documentation from source files
      const sourceDirs = ['src', 'lib', 'app', 'components', 'services', 'utils'];
      
      for (const dir of sourceDirs) {
        const dirPath = path.join(projectPath, dir);
        try {
          await fs.access(dirPath);
          await this.extractDocumentationFromDirectory(dirPath, documentation);
        } catch (error) {
          // Directory doesn't exist
        }
      }

      // Extract from root files
      const rootFiles = ['index.js', 'index.ts', 'main.js', 'main.ts', 'app.js', 'app.ts'];
      for (const file of rootFiles) {
        const filePath = path.join(projectPath, file);
        try {
          await fs.access(filePath);
          await this.extractDocumentationFromFile(filePath, documentation);
        } catch (error) {
          // File doesn't exist
        }
      }

    } catch (error) {
      this.logger.warn('DocumentationGenerationStep: Failed to extract code documentation', {
        projectPath,
        error: error.message
      });
    }

    return documentation;
  }

  /**
   * Extract documentation from directory
   * @param {string} dirPath - Directory path
   * @param {Object} documentation - Documentation object
   * @returns {Promise<void>}
   */
  async extractDocumentationFromDirectory(dirPath, documentation) {
    const items = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item.name);
      
      if (item.isDirectory()) {
        await this.extractDocumentationFromDirectory(itemPath, documentation);
      } else if (item.isFile() && this.isDocumentableFile(item.name)) {
        await this.extractDocumentationFromFile(itemPath, documentation);
      }
    }
  }

  /**
   * Extract documentation from file
   * @param {string} filePath - File path
   * @param {Object} documentation - Documentation object
   * @returns {Promise<void>}
   */
  async extractDocumentationFromFile(filePath, documentation) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Extract JSDoc comments
        if (line.includes('/**') || line.includes(' * ')) {
          const comment = this.extractJSDocComment(lines, i);
          if (comment) {
            documentation.comments.push({
              file: path.relative(process.cwd(), filePath),
              line: i + 1,
              comment
            });
          }
        }
        
        // Extract function definitions
        if (line.includes('function ') || line.includes('=>')) {
          const func = this.extractFunctionDefinition(line, i + 1);
          if (func) {
            documentation.functions.push({
              file: path.relative(process.cwd(), filePath),
              line: i + 1,
              ...func
            });
          }
        }
        
        // Extract class definitions
        if (line.includes('class ')) {
          const cls = this.extractClassDefinition(line, i + 1);
          if (cls) {
            documentation.classes.push({
              file: path.relative(process.cwd(), filePath),
              line: i + 1,
              ...cls
            });
          }
        }
      }
    } catch (error) {
      this.logger.warn('DocumentationGenerationStep: Failed to extract documentation from file', {
        filePath,
        error: error.message
      });
    }
  }

  /**
   * Check if file is documentable
   * @param {string} filename - Filename
   * @returns {boolean} True if documentable
   */
  isDocumentableFile(filename) {
    const extensions = ['.js', '.jsx', '.ts', '.tsx', '.vue', '.py', '.java', '.cpp', '.c', '.h'];
    return extensions.some(ext => filename.endsWith(ext));
  }

  /**
   * Extract JSDoc comment
   * @param {Array} lines - File lines
   * @param {number} startIndex - Start index
   * @returns {string|null} JSDoc comment
   */
  extractJSDocComment(lines, startIndex) {
    const comment = [];
    let i = startIndex;
    
    while (i < lines.length && (lines[i].includes('/**') || lines[i].includes(' * ') || lines[i].includes(' */'))) {
      comment.push(lines[i].trim());
      if (lines[i].includes('*/')) break;
      i++;
    }
    
    return comment.length > 0 ? comment.join('\n') : null;
  }

  /**
   * Extract function definition
   * @param {string} line - Line content
   * @param {number} lineNumber - Line number
   * @returns {Object|null} Function definition
   */
  extractFunctionDefinition(line, lineNumber) {
    const functionMatch = line.match(/(?:function\s+)?(\w+)\s*\(/);
    if (functionMatch) {
      return {
        name: functionMatch[1],
        type: 'function',
        lineNumber
      };
    }
    
    const arrowMatch = line.match(/(\w+)\s*[:=]\s*\([^)]*\)\s*=>/);
    if (arrowMatch) {
      return {
        name: arrowMatch[1],
        type: 'arrow_function',
        lineNumber
      };
    }
    
    return null;
  }

  /**
   * Extract class definition
   * @param {string} line - Line content
   * @param {number} lineNumber - Line number
   * @returns {Object|null} Class definition
   */
  extractClassDefinition(line, lineNumber) {
    const classMatch = line.match(/class\s+(\w+)/);
    if (classMatch) {
      return {
        name: classMatch[1],
        type: 'class',
        lineNumber
      };
    }
    
    return null;
  }

  /**
   * Generate API documentation
   * @param {string} projectPath - Project path
   * @param {Object} codeDocumentation - Code documentation
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} API documentation result
   */
  async generateAPIDocumentation(projectPath, codeDocumentation, options) {
    this.logger.info('DocumentationGenerationStep: Generating API documentation...');
    
    const results = {
      generated: [],
      errors: []
    };

    try {
      const docsDir = path.join(projectPath, 'docs');
      await fs.mkdir(docsDir, { recursive: true });

      // Generate API documentation
      const apiDocs = this.generateAPIDocsContent(codeDocumentation);
      const apiDocsPath = path.join(docsDir, 'api.md');
      await fs.writeFile(apiDocsPath, apiDocs);
      
      results.generated.push({
        type: 'api_docs',
        path: path.relative(projectPath, apiDocsPath),
        content: apiDocs
      });

      // Generate API reference
      const apiRef = this.generateAPIReferenceContent(codeDocumentation);
      const apiRefPath = path.join(docsDir, 'api-reference.md');
      await fs.writeFile(apiRefPath, apiRef);
      
      results.generated.push({
        type: 'api_reference',
        path: path.relative(projectPath, apiRefPath),
        content: apiRef
      });
      
    } catch (error) {
      results.errors.push({
        action: 'generate_api_documentation',
        error: error.message
      });
    }

    return results;
  }

  /**
   * Generate architecture documentation
   * @param {string} projectPath - Project path
   * @param {Object} projectStructure - Project structure
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Architecture documentation result
   */
  async generateArchitectureDocumentation(projectPath, projectStructure, options) {
    this.logger.info('DocumentationGenerationStep: Generating architecture documentation...');
    
    const results = {
      generated: [],
      errors: []
    };

    try {
      const docsDir = path.join(projectPath, 'docs');
      await fs.mkdir(docsDir, { recursive: true });

      // Generate architecture overview
      const archOverview = this.generateArchitectureOverviewContent(projectStructure);
      const archOverviewPath = path.join(docsDir, 'architecture.md');
      await fs.writeFile(archOverviewPath, archOverview);
      
      results.generated.push({
        type: 'architecture_overview',
        path: path.relative(projectPath, archOverviewPath),
        content: archOverview
      });

      // Generate system design
      const systemDesign = this.generateSystemDesignContent(projectStructure);
      const systemDesignPath = path.join(docsDir, 'system-design.md');
      await fs.writeFile(systemDesignPath, systemDesign);
      
      results.generated.push({
        type: 'system_design',
        path: path.relative(projectPath, systemDesignPath),
        content: systemDesign
      });
      
    } catch (error) {
      results.errors.push({
        action: 'generate_architecture_documentation',
        error: error.message
      });
    }

    return results;
  }

  /**
   * Generate examples
   * @param {string} projectPath - Project path
   * @param {Object} codeDocumentation - Code documentation
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Examples result
   */
  async generateExamples(projectPath, codeDocumentation, options) {
    this.logger.info('DocumentationGenerationStep: Generating examples...');
    
    const results = {
      generated: [],
      errors: []
    };

    try {
      const docsDir = path.join(projectPath, 'docs');
      await fs.mkdir(docsDir, { recursive: true });

      // Generate usage examples
      const usageExamples = this.generateUsageExamplesContent(codeDocumentation);
      const usageExamplesPath = path.join(docsDir, 'examples.md');
      await fs.writeFile(usageExamplesPath, usageExamples);
      
      results.generated.push({
        type: 'usage_examples',
        path: path.relative(projectPath, usageExamplesPath),
        content: usageExamples
      });

      // Generate code samples
      const codeSamples = this.generateCodeSamplesContent(codeDocumentation);
      const codeSamplesPath = path.join(docsDir, 'code-samples.md');
      await fs.writeFile(codeSamplesPath, codeSamples);
      
      results.generated.push({
        type: 'code_samples',
        path: path.relative(projectPath, codeSamplesPath),
        content: codeSamples
      });
      
    } catch (error) {
      results.errors.push({
        action: 'generate_examples',
        error: error.message
      });
    }

    return results;
  }

  /**
   * Generate diagrams
   * @param {string} projectPath - Project path
   * @param {Object} projectStructure - Project structure
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Diagrams result
   */
  async generateDiagrams(projectPath, projectStructure, options) {
    this.logger.info('DocumentationGenerationStep: Generating diagrams...');
    
    const results = {
      generated: [],
      errors: []
    };

    try {
      const docsDir = path.join(projectPath, 'docs');
      await fs.mkdir(docsDir, { recursive: true });

      // Generate architecture diagram
      const archDiagram = this.generateArchitectureDiagramContent(projectStructure);
      const archDiagramPath = path.join(docsDir, 'architecture-diagram.md');
      await fs.writeFile(archDiagramPath, archDiagram);
      
      results.generated.push({
        type: 'architecture_diagram',
        path: path.relative(projectPath, archDiagramPath),
        content: archDiagram
      });

      // Generate flow diagrams
      const flowDiagrams = this.generateFlowDiagramsContent(projectStructure);
      const flowDiagramsPath = path.join(docsDir, 'flow-diagrams.md');
      await fs.writeFile(flowDiagramsPath, flowDiagrams);
      
      results.generated.push({
        type: 'flow_diagrams',
        path: path.relative(projectPath, flowDiagramsPath),
        content: flowDiagrams
      });
      
    } catch (error) {
      results.errors.push({
        action: 'generate_diagrams',
        error: error.message
      });
    }

    return results;
  }

  /**
   * Generate changelog
   * @param {string} projectPath - Project path
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Changelog result
   */
  async generateChangelog(projectPath, options) {
    this.logger.info('DocumentationGenerationStep: Generating changelog...');
    
    const results = {
      generated: [],
      errors: []
    };

    try {
      // Generate changelog
      const changelog = this.generateChangelogContent();
      const changelogPath = path.join(projectPath, 'CHANGELOG.md');
      await fs.writeFile(changelogPath, changelog);
      
      results.generated.push({
        type: 'changelog',
        path: path.relative(projectPath, changelogPath),
        content: changelog
      });
      
    } catch (error) {
      results.errors.push({
        action: 'generate_changelog',
        error: error.message
      });
    }

    return results;
  }

  /**
   * Generate tutorials
   * @param {string} projectPath - Project path
   * @param {Object} codeDocumentation - Code documentation
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Tutorials result
   */
  async generateTutorials(projectPath, codeDocumentation, options) {
    this.logger.info('DocumentationGenerationStep: Generating tutorials...');
    
    const results = {
      generated: [],
      errors: []
    };

    try {
      const docsDir = path.join(projectPath, 'docs');
      await fs.mkdir(docsDir, { recursive: true });

      // Generate getting started tutorial
      const gettingStarted = this.generateGettingStartedContent(codeDocumentation);
      const gettingStartedPath = path.join(docsDir, 'getting-started.md');
      await fs.writeFile(gettingStartedPath, gettingStarted);
      
      results.generated.push({
        type: 'getting_started',
        path: path.relative(projectPath, gettingStartedPath),
        content: gettingStarted
      });

      // Generate advanced tutorial
      const advancedTutorial = this.generateAdvancedTutorialContent(codeDocumentation);
      const advancedTutorialPath = path.join(docsDir, 'advanced-tutorial.md');
      await fs.writeFile(advancedTutorialPath, advancedTutorial);
      
      results.generated.push({
        type: 'advanced_tutorial',
        path: path.relative(projectPath, advancedTutorialPath),
        content: advancedTutorial
      });
      
    } catch (error) {
      results.errors.push({
        action: 'generate_tutorials',
        error: error.message
      });
    }

    return results;
  }

  /**
   * Consolidate documentation
   * @param {string} projectPath - Project path
   * @param {Object} results - Generation results
   * @returns {Promise<Object>} Consolidation result
   */
  async consolidateDocumentation(projectPath, results) {
    this.logger.info('DocumentationGenerationStep: Consolidating documentation...');
    
    const consolidationResults = {
      generated: [],
      errors: []
    };

    try {
      // Generate main documentation index
      const mainIndex = this.generateMainIndexContent(results);
      const mainIndexPath = path.join(projectPath, 'docs', 'index.md');
      await fs.writeFile(mainIndexPath, mainIndex);
      
      consolidationResults.generated.push({
        type: 'main_index',
        path: path.relative(projectPath, mainIndexPath),
        content: mainIndex
      });

      // Update README if it exists
      const readmePath = path.join(projectPath, 'README.md');
      try {
        await fs.access(readmePath);
        const updatedReadme = await this.updateReadmeContent(readmePath, results);
        await fs.writeFile(readmePath, updatedReadme);
        
        consolidationResults.generated.push({
          type: 'updated_readme',
          path: path.relative(projectPath, readmePath),
          content: updatedReadme
        });
      } catch (error) {
        // README doesn't exist, create one
        const newReadme = this.generateReadmeContent(results);
        await fs.writeFile(readmePath, newReadme);
        
        consolidationResults.generated.push({
          type: 'new_readme',
          path: path.relative(projectPath, readmePath),
          content: newReadme
        });
      }
      
    } catch (error) {
      consolidationResults.errors.push({
        action: 'consolidate_documentation',
        error: error.message
      });
    }

    return consolidationResults;
  }

  /**
   * Generate output
   * @param {Object} params - Output generation parameters
   * @returns {Promise<Object>} Generated output
   */
  async generateOutput(params) {
    const { command, projectStructure, codeDocumentation, results, consolidationResults, outputConfig } = params;
    
    const output = {
      generatedFiles: [],
      metadata: {
        projectType: projectStructure.type,
        frameworks: projectStructure.frameworks,
        documentationTypes: Object.keys(results),
        totalDocs: 0,
        successfulDocs: 0,
        failedDocs: 0
      },
      statistics: {
        startTime: new Date(),
        endTime: new Date(),
        duration: 0
      }
    };

    // Collect generated files
    for (const [docType, docResult] of Object.entries(results)) {
      if (docResult.generated) {
        output.generatedFiles.push(...docResult.generated);
        output.metadata.totalDocs += docResult.generated.length;
        output.metadata.successfulDocs += docResult.generated.length;
      }
      if (docResult.errors) {
        output.metadata.failedDocs += docResult.errors.length;
      }
    }

    // Add consolidation results
    if (consolidationResults && consolidationResults.generated) {
      output.generatedFiles.push(...consolidationResults.generated);
      output.metadata.totalDocs += consolidationResults.generated.length;
      output.metadata.successfulDocs += consolidationResults.generated.length;
    }

    // Calculate statistics
    output.statistics.endTime = new Date();
    output.statistics.duration = output.statistics.endTime - output.statistics.startTime;

    return output;
  }

  /**
   * Save results
   * @param {Object} command - Command object
   * @param {Object} output - Generated output
   * @returns {Promise<void>}
   */
  async saveResults(command, output) {
    // This would save results to the database
    // For now, just log the results
    this.logger.info('DocumentationGenerationStep: Results saved', {
      commandId: command.commandId,
      totalFiles: output.generatedFiles.length,
      successfulDocs: output.metadata.successfulDocs,
      failedDocs: output.metadata.failedDocs
    });
  }

  /**
   * Get default options
   * @returns {Object} Default options
   */
  getDefaultOptions() {
    return {
      includeAPI: this.includeAPI,
      includeArchitecture: this.includeArchitecture,
      includeExamples: this.includeExamples,
      includeDiagrams: this.includeDiagrams,
      includeChangelog: this.includeChangelog,
      includeTutorials: this.includeTutorials,
      autoGenerate: this.autoGenerate
    };
  }

  /**
   * Get default output configuration
   * @returns {Object} Default output configuration
   */
  getDefaultOutputConfig() {
    return {
      includeMetadata: true,
      includeStatistics: true,
      includeValidation: true
    };
  }

  /**
   * Count generated files
   * @param {Object} results - Generation results
   * @returns {number} Total file count
   */
  countGeneratedFiles(results) {
    let count = 0;
    for (const [docType, docResult] of Object.entries(results)) {
      if (docResult.generated) {
        count += docResult.generated.length;
      }
    }
    return count;
  }

  // Documentation content generation methods
  generateAPIDocsContent(codeDocumentation) {
    return `# API Documentation

## Overview
This document provides comprehensive API documentation for the project.

## Functions

${codeDocumentation.functions.map(func => `
### ${func.name}
- **File**: ${func.file}
- **Line**: ${func.lineNumber}
- **Type**: ${func.type}
`).join('\n')}

## Classes

${codeDocumentation.classes.map(cls => `
### ${cls.name}
- **File**: ${cls.file}
- **Line**: ${cls.lineNumber}
- **Type**: ${cls.type}
`).join('\n')}

## Comments

${codeDocumentation.comments.map(comment => `
### ${comment.file}:${comment.line}
\`\`\`
${comment.comment}
\`\`\`
`).join('\n')}
`;
  }

  generateAPIReferenceContent(codeDocumentation) {
    return `# API Reference

## Function Reference

${codeDocumentation.functions.map(func => `
### ${func.name}
\`\`\`javascript
// Function definition at line ${func.lineNumber}
\`\`\`
`).join('\n')}

## Class Reference

${codeDocumentation.classes.map(cls => `
### ${cls.name}
\`\`\`javascript
// Class definition at line ${cls.lineNumber}
\`\`\`
`).join('\n')}
`;
  }

  generateArchitectureOverviewContent(projectStructure) {
    return `# Architecture Overview

## Project Type
${projectStructure.type}

## Frameworks
${projectStructure.frameworks.join(', ')}

## Project Structure
- **Directories**: ${projectStructure.directories.join(', ')}
- **Files**: ${projectStructure.files.length} files
- **Has Package.json**: ${projectStructure.hasPackageJson}
- **Has README**: ${projectStructure.hasReadme}
- **Has API Docs**: ${projectStructure.hasApiDocs}

## Dependencies
### Production
${Object.keys(projectStructure.dependencies).map(dep => `- ${dep}: ${projectStructure.dependencies[dep]}`).join('\n')}

### Development
${Object.keys(projectStructure.devDependencies).map(dep => `- ${dep}: ${projectStructure.devDependencies[dep]}`).join('\n')}
`;
  }

  generateSystemDesignContent(projectStructure) {
    return `# System Design

## Architecture Pattern
Based on the project structure, this appears to be a ${projectStructure.type} application.

## Components
- **Frontend**: ${projectStructure.frameworks.includes('react') || projectStructure.frameworks.includes('vue') ? 'Yes' : 'No'}
- **Backend**: ${projectStructure.frameworks.includes('express') ? 'Yes' : 'No'}
- **Full Stack**: ${projectStructure.frameworks.includes('next') ? 'Yes' : 'No'}

## Technology Stack
${projectStructure.frameworks.map(framework => `- ${framework}`).join('\n')}

## Build Tools
- **Webpack**: ${projectStructure.hasWebpack ? 'Yes' : 'No'}
- **Babel**: ${projectStructure.hasBabel ? 'Yes' : 'No'}
- **TypeScript**: ${projectStructure.hasTypeScript ? 'Yes' : 'No'}

## Testing
- **Jest**: ${projectStructure.hasJest ? 'Yes' : 'No'}

## Code Quality
- **ESLint**: ${projectStructure.hasESLint ? 'Yes' : 'No'}
- **Prettier**: ${projectStructure.hasPrettier ? 'Yes' : 'No'}
`;
  }

  generateUsageExamplesContent(codeDocumentation) {
    return `# Usage Examples

## Function Examples

${codeDocumentation.functions.map(func => `
### ${func.name}
\`\`\`javascript
// Example usage of ${func.name}
const result = ${func.name}();
console.log(result);
\`\`\`
`).join('\n')}

## Class Examples

${codeDocumentation.classes.map(cls => `
### ${cls.name}
\`\`\`javascript
// Example usage of ${cls.name}
const instance = new ${cls.name}();
instance.method();
\`\`\`
`).join('\n')}
`;
  }

  generateCodeSamplesContent(codeDocumentation) {
    return `# Code Samples

## Sample Functions
\`\`\`javascript
// Sample function implementation
function sampleFunction() {
    return 'Hello, World!';
}
\`\`\`

## Sample Classes
\`\`\`javascript
// Sample class implementation
class SampleClass {
    constructor() {
        this.value = 'sample';
    }
    
    getValue() {
        return this.value;
    }
}
\`\`\`
`;
  }

  generateArchitectureDiagramContent(projectStructure) {
    return `# Architecture Diagram

## System Architecture
\`\`\`mermaid
graph TD
    A[Client] --> B[Frontend]
    B --> C[Backend]
    C --> D[Database]
    
    subgraph "Frontend"
        B1[React/Vue Components]
        B2[State Management]
    end
    
    subgraph "Backend"
        C1[API Routes]
        C2[Business Logic]
        C3[Data Access]
    end
\`\`\`

## Component Diagram
\`\`\`mermaid
graph LR
    A[User Interface] --> B[Application Logic]
    B --> C[Data Layer]
    C --> D[External Services]
\`\`\`
`;
  }

  generateFlowDiagramsContent(projectStructure) {
    return `# Flow Diagrams

## User Flow
\`\`\`mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant D as Database
    
    U->>F: Interact
    F->>B: API Request
    B->>D: Query Data
    D->>B: Return Data
    B->>F: API Response
    F->>U: Update UI
\`\`\`

## Data Flow
\`\`\`mermaid
flowchart LR
    A[Input] --> B[Validation]
    B --> C[Processing]
    C --> D[Storage]
    D --> E[Output]
\`\`\`
`;
  }

  generateChangelogContent() {
    return `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial project setup
- Basic documentation structure

### Changed
- N/A

### Deprecated
- N/A

### Removed
- N/A

### Fixed
- N/A

### Security
- N/A

## [1.0.0] - ${new Date().toISOString().split('T')[0]}

### Added
- Initial release
- Core functionality
- Documentation generation
`;
  }

  generateGettingStartedContent(codeDocumentation) {
    return `# Getting Started

## Prerequisites
- Node.js (version 14 or higher)
- npm or yarn

## Installation

1. Clone the repository:
\`\`\`bash
git clone <repository-url>
cd <project-name>
\`\`\`

2. Install dependencies:
\`\`\`bash
npm install
\`\`\`

3. Start the development server:
\`\`\`bash
npm run dev
\`\`\`

## Quick Start

Here's a quick example to get you started:

\`\`\`javascript
// Example usage
const result = sampleFunction();
console.log(result);
\`\`\`

## Available Functions

${codeDocumentation.functions.slice(0, 5).map(func => `
### ${func.name}
\`\`\`javascript
// Usage example
${func.name}();
\`\`\`
`).join('\n')}
`;
  }

  generateAdvancedTutorialContent(codeDocumentation) {
    return `# Advanced Tutorial

## Advanced Usage

This tutorial covers advanced features and patterns used in this project.

## Function Composition

\`\`\`javascript
// Example of function composition
const composed = (a, b) => {
    const result1 = function1(a);
    const result2 = function2(b);
    return combine(result1, result2);
};
\`\`\`

## Class Inheritance

\`\`\`javascript
// Example of class inheritance
class BaseClass {
    constructor() {
        this.base = 'base';
    }
}

class DerivedClass extends BaseClass {
    constructor() {
        super();
        this.derived = 'derived';
    }
}
\`\`\`

## Advanced Patterns

### Observer Pattern
\`\`\`javascript
class Observer {
    constructor() {
        this.observers = [];
    }
    
    subscribe(observer) {
        this.observers.push(observer);
    }
    
    notify(data) {
        this.observers.forEach(observer => observer(data));
    }
}
\`\`\`
`;
  }

  generateMainIndexContent(results) {
    return `# Documentation Index

## Overview
This is the main documentation index for the project.

## Available Documentation

${Object.keys(results).map(docType => `
### ${docType.charAt(0).toUpperCase() + docType.slice(1)}
- [View ${docType} documentation](./${docType}.md)
`).join('\n')}

## Quick Links
- [API Documentation](./api.md)
- [Architecture Overview](./architecture.md)
- [Getting Started](./getting-started.md)
- [Examples](./examples.md)

## Contributing
Please refer to the contributing guidelines for information on how to contribute to this project.
`;
  }

  async updateReadmeContent(readmePath, results) {
    try {
      const existingReadme = await fs.readFile(readmePath, 'utf-8');
      
      // Add documentation section if it doesn't exist
      if (!existingReadme.includes('## Documentation')) {
        const documentationSection = `

## Documentation

This project includes comprehensive documentation:

${Object.keys(results).map(docType => `- [${docType.charAt(0).toUpperCase() + docType.slice(1)}](./docs/${docType}.md)`).join('\n')}

For more information, see the [docs](./docs/) directory.
`;
        
        return existingReadme + documentationSection;
      }
      
      return existingReadme;
    } catch (error) {
      return this.generateReadmeContent(results);
    }
  }

  generateReadmeContent(results) {
    return `# Project Name

## Description
A comprehensive project with full documentation.

## Installation

\`\`\`bash
npm install
\`\`\`

## Usage

\`\`\`bash
npm start
\`\`\`

## Documentation

This project includes comprehensive documentation:

${Object.keys(results).map(docType => `- [${docType.charAt(0).toUpperCase() + docType.slice(1)}](./docs/${docType}.md)`).join('\n')}

For more information, see the [docs](./docs/) directory.

## Contributing
Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
`;
  }

  /**
   * Validate documentation generation step
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<ValidationResult>} Validation result
   */
  async validate(context) {
    const baseValidation = await super.validate(context);
    
    if (!baseValidation.isValid) {
      return baseValidation;
    }

    // Check if project path exists
    const projectPath = context.get('projectPath');
    if (!projectPath) {
      return new ValidationResult(false, ['Project path is required for documentation generation']);
    }

    // Validate documentation options
    const validOptions = [
      'includeAPI', 'includeArchitecture', 'includeExamples', 
      'includeDiagrams', 'includeChangelog', 'includeTutorials', 'autoGenerate'
    ];

    for (const option of validOptions) {
      if (this[option] !== undefined && typeof this[option] !== 'boolean') {
        return new ValidationResult(false, [`Invalid option type for ${option}: expected boolean`]);
      }
    }

    return new ValidationResult(true, []);
  }

  /**
   * Get step metadata
   * @returns {Object} Step metadata
   */
  getMetadata() {
    return {
      name: 'DocumentationGenerationStep',
      description: 'Generate project documentation',
      version: '1.0.0',
      type: 'generate',
      includeAPI: this.includeAPI,
      includeArchitecture: this.includeArchitecture,
      includeExamples: this.includeExamples,
      includeDiagrams: this.includeDiagrams,
      includeChangelog: this.includeChangelog,
      includeTutorials: this.includeTutorials,
      autoGenerate: this.autoGenerate,
      dependencies: ['fs', 'path', 'DocumentationStep']
    };
  }
}

module.exports = DocumentationGenerationStep; 