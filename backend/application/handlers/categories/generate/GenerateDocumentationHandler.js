
/**
 * GenerateDocumentationHandler - Handles documentation generation
 * Implements the Handler pattern for documentation generation
 */
const fs = require('fs').promises;
const path = require('path');
const EventBus = require('@messaging/EventBus');
const AnalysisRepository = require('@repositories/AnalysisRepository');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

class GenerateDocumentationHandler {
    constructor(dependencies = {}) {
        this.eventBus = dependencies.eventBus || new EventBus();
        this.analysisRepository = dependencies.analysisRepository || new AnalysisRepository();
        this.logger = dependencies.logger || console;
    }

    async handle(command) {
        this.logger.info(`Starting documentation generation for project: ${command.projectPath}`);

        try {
            const validation = command.validateBusinessRules();
            if (!validation.isValid) {
                throw new Error(`Business rule validation failed: ${validation.errors.join(', ')}`);
            }

            const options = command.getGenerateOptions();
            const outputConfig = command.getOutputConfiguration();

            // Step 1: Analyze project structure
            const projectStructure = await this.analyzeProjectStructure(command.projectPath);
            
            // Step 2: Extract code documentation
            const codeDocumentation = await this.extractCodeDocumentation(command.projectPath, projectStructure);
            
            // Step 3: Generate API documentation (if enabled)
            let apiDocsResults = null;
            if (options.includeAPI) {
                apiDocsResults = await this.generateAPIDocumentation(command.projectPath, codeDocumentation, options);
            }
            
            // Step 4: Generate architecture documentation (if enabled)
            let architectureDocsResults = null;
            if (options.includeArchitecture) {
                architectureDocsResults = await this.generateArchitectureDocumentation(command.projectPath, projectStructure, options);
            }
            
            // Step 5: Generate examples (if enabled)
            let examplesResults = null;
            if (options.includeExamples) {
                examplesResults = await this.generateExamples(command.projectPath, codeDocumentation, options);
            }
            
            // Step 6: Generate diagrams (if enabled)
            let diagramsResults = null;
            if (options.includeDiagrams) {
                diagramsResults = await this.generateDiagrams(command.projectPath, projectStructure, options);
            }
            
            // Step 7: Generate changelog (if enabled)
            let changelogResults = null;
            if (options.includeChangelog) {
                changelogResults = await this.generateChangelog(command.projectPath, options);
            }
            
            // Step 8: Generate tutorials (if enabled)
            let tutorialsResults = null;
            if (options.includeTutorials) {
                tutorialsResults = await this.generateTutorials(command.projectPath, codeDocumentation, options);
            }
            
            // Step 9: Consolidate documentation
            let consolidationResults = null;
            if (options.autoGenerate) {
                consolidationResults = await this.consolidateDocumentation(command.projectPath, {
                    apiDocs: apiDocsResults,
                    architectureDocs: architectureDocsResults,
                    examples: examplesResults,
                    diagrams: diagramsResults,
                    changelog: changelogResults,
                    tutorials: tutorialsResults
                });
            }

            // Step 10: Generate output
            const output = await this.generateOutput({
                command,
                projectStructure,
                codeDocumentation,
                apiDocsResults,
                architectureDocsResults,
                examplesResults,
                diagramsResults,
                changelogResults,
                tutorialsResults,
                consolidationResults,
                outputConfig
            });

            // Step 11: Save results
            await this.saveResults(command, output);

            this.logger.info(`Documentation generation completed successfully for project: ${command.projectPath}`);
            
            return {
                success: true,
                commandId: command.commandId,
                output,
                metadata: command.getMetadata()
            };

        } catch (error) {
            this.logger.error(`Documentation generation failed for project ${command.projectPath}:`, error);
            
            await this.eventBus.publish('documentation.generation.failed', {
                commandId: command.commandId,
                projectPath: command.projectPath,
                error: error.message,
                timestamp: new Date()
            });

            throw error;
        }
    }

    async analyzeProjectStructure(projectPath) {
        this.logger.info('Analyzing project structure...');
        
        const structure = {
            files: [],
            directories: [],
            components: [],
            metrics: {}
        };

        try {
            await this.scanProject(projectPath, structure);
            structure.metrics = this.calculateProjectMetrics(structure);
            
            return structure;
        } catch (error) {
            throw new Error(`Failed to analyze project structure: ${error.message}`);
        }
    }

    async scanProject(projectPath, structure, relativePath = '') {
        const entries = await fs.readdir(projectPath, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(projectPath, entry.name);
            const relativeEntryPath = path.join(relativePath, entry.name);
            
            if (entry.isDirectory === true) {
                if (!this.shouldSkipDirectory(entry.name)) {
                    structure.directories.push({
                        path: relativeEntryPath,
                        name: entry.name,
                        type: this.classifyDirectory(entry.name)
                    });
                    
                    await this.scanProject(fullPath, structure, relativeEntryPath);
                }
            } else if (entry.isFile === true) {
                if (this.isCodeFile(entry.name)) {
                    const fileInfo = await this.analyzeFile(fullPath, relativeEntryPath);
                    structure.files.push(fileInfo);
                    
                    if (this.isDocumentableComponent(fileInfo)) {
                        structure.components.push(fileInfo);
                    }
                }
            }
        }
    }

    shouldSkipDirectory(dirName) {
        const skipDirs = ['node_modules', '.git', 'dist', 'build', 'coverage', '.next', '.nuxt', 'docs'];
        return skipDirs.includes(dirName);
    }

    classifyDirectory(dirName) {
        const patterns = {
            source: ['src', 'app', 'lib', 'components'],
            api: ['api', 'routes', 'controllers', 'endpoints'],
            config: ['config', 'configs', 'settings'],
            test: ['test', 'tests', '__tests__', 'spec']
        };

        for (const [type, keywords] of Object.entries(patterns)) {
            if (keywords.some(keyword => dirName.toLowerCase().includes(keyword))) {
                return type;
            }
        }
        
        return 'other';
    }

    isCodeFile(fileName) {
        const codeExtensions = ['.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte'];
        return codeExtensions.some(ext => fileName.endsWith(ext));
    }

    async analyzeFile(filePath, relativePath) {
        const content = await fs.readFile(filePath, 'utf-8');
        const functions = this.extractFunctions(content);
        const classes = this.extractClasses(content);
        const comments = this.extractComments(content);
        const imports = this.extractImports(content);
        
        return {
            path: relativePath,
            fullPath: filePath,
            size: content.length,
            lines: content.split('\n').length,
            functions,
            classes,
            comments,
            imports,
            type: this.classifyFile(relativePath),
            complexity: this.calculateComplexity(content)
        };
    }

    extractFunctions(content) {
        const functions = [];
        const functionRegex = /(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s*)?\(|(\w+)\s*\([^)]*\)\s*\{)/g;
        
        let match;
        while ((match = functionRegex.exec(content)) !== null) {
            const functionName = match[1] || match[2] || match[3];
            if (functionName && !functionName.startsWith('_')) {
                functions.push({
                    name: functionName,
                    line: content.substring(0, match.index).split('\n').length
                });
            }
        }
        
        return functions;
    }

    extractClasses(content) {
        const classes = [];
        const classRegex = /class\s+(\w+)/g;
        
        let match;
        while ((match = classRegex.exec(content)) !== null) {
            classes.push({
                name: match[1],
                line: content.substring(0, match.index).split('\n').length
            });
        }
        
        return classes;
    }

    extractComments(content) {
        const comments = [];
        
        // Extract JSDoc comments
        const jsdocRegex = /\/\*\*([\s\S]*?)\*\//g;
        let match;
        while ((match = jsdocRegex.exec(content)) !== null) {
            comments.push({
                type: 'jsdoc',
                content: match[1].trim(),
                line: content.substring(0, match.index).split('\n').length
            });
        }
        
        // Extract single-line comments
        const singleLineRegex = /\/\/\s*(.+)$/gm;
        while ((match = singleLineRegex.exec(content)) !== null) {
            comments.push({
                type: 'single-line',
                content: match[1].trim(),
                line: content.substring(0, match.index).split('\n').length
            });
        }
        
        return comments;
    }

    extractImports(content) {
        const imports = [];
        const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))*\s+from\s+)?['"`]([^'"`]+)['"`]/g;
        
        let match;
        while ((match = importRegex.exec(content)) !== null) {
            imports.push({
                module: match[1],
                line: content.substring(0, match.index).split('\n').length
            });
        }
        
        return imports;
    }

    classifyFile(filePath) {
        const patterns = {
            component: /\.(jsx?|tsx?|vue|svelte)$/,
            service: /service|api|client/i,
            model: /model|entity|schema/i,
            utility: /util|helper|constant/i,
            test: /\.test\.|\.spec\./
        };

        for (const [type, pattern] of Object.entries(patterns)) {
            if (pattern.test(filePath)) {
                return type;
            }
        }
        
        return 'unknown';
    }

    calculateComplexity(content) {
        let complexity = 0;
        
        // Count conditional statements
        const conditionals = (content.match(/if|else|switch|case/g) || []).length;
        complexity += conditionals * 2;
        
        // Count loops
        const loops = (content.match(/for|while|do/g) || []).length;
        complexity += loops * 3;
        
        // Count functions
        const functions = (content.match(/function|=>/g) || []).length;
        complexity += functions;
        
        return complexity;
    }

    isDocumentableComponent(fileInfo) {
        // Skip test files
        if (fileInfo.type === 'test') {
            return false;
        }
        
        // Skip files with no functions or classes
        if (fileInfo.functions.length === 0 && fileInfo.classes.length === 0) {
            return false;
        }
        
        return true;
    }

    calculateProjectMetrics(structure) {
        return {
            totalFiles: structure.files.length,
            totalComponents: structure.components.length,
            averageComplexity: structure.components.length > 0 
                ? structure.components.reduce((sum, comp) => sum + comp.complexity, 0) / structure.components.length 
                : 0,
            fileTypes: this.countFileTypes(structure.files),
            documentationCoverage: this.calculateDocumentationCoverage(structure.components)
        };
    }

    countFileTypes(files) {
        const types = {};
        files.forEach(file => {
            types[file.type] = (types[file.type] || 0) + 1;
        });
        return types;
    }

    calculateDocumentationCoverage(components) {
        if (components.length === 0) return 0;
        
        const documentedComponents = components.filter(comp => 
            comp.comments.length > 0 || comp.functions.some(f => f.documented)
        );
        
        return Math.round((documentedComponents.length / components.length) * 100);
    }

    async extractCodeDocumentation(projectPath, projectStructure) {
        this.logger.info('Extracting code documentation...');
        
        const documentation = {
            functions: [],
            classes: [],
            modules: [],
            apis: []
        };

        for (const component of projectStructure.components) {
            // Extract function documentation
            for (const func of component.functions) {
                const funcDoc = this.extractFunctionDocumentation(component, func);
                if (funcDoc) {
                    documentation.functions.push(funcDoc);
                }
            }

            // Extract class documentation
            for (const cls of component.classes) {
                const classDoc = this.extractClassDocumentation(component, cls);
                if (classDoc) {
                    documentation.classes.push(classDoc);
                }
            }

            // Extract module documentation
            const moduleDoc = this.extractModuleDocumentation(component);
            if (moduleDoc) {
                documentation.modules.push(moduleDoc);
            }

            // Extract API documentation
            if (component.type === 'service' || component.path.includes('api')) {
                const apiDoc = this.extractAPIDocumentation(component);
                if (apiDoc) {
                    documentation.apis.push(apiDoc);
                }
            }
        }

        return documentation;
    }

    extractFunctionDocumentation(component, func) {
        const comments = component.comments.filter(c => 
            c.line <= func.line && c.line >= func.line - 5
        );

        return {
            name: func.name,
            file: component.path,
            line: func.line,
            type: 'function',
            documentation: comments.length > 0 ? comments[0].content : '',
            complexity: component.complexity
        };
    }

    extractClassDocumentation(component, cls) {
        const comments = component.comments.filter(c => 
            c.line <= cls.line && c.line >= cls.line - 5
        );

        return {
            name: cls.name,
            file: component.path,
            line: cls.line,
            type: 'class',
            documentation: comments.length > 0 ? comments[0].content : '',
            complexity: component.complexity
        };
    }

    extractModuleDocumentation(component) {
        const comments = component.comments.filter(c => c.type === 'jsdoc');

        return {
            name: path.basename(component.path, path.extname(component.path)),
            file: component.path,
            type: 'module',
            documentation: comments.length > 0 ? comments[0].content : '',
            functions: component.functions.length,
            classes: component.classes.length
        };
    }

    extractAPIDocumentation(component) {
        // This is a simplified implementation
        // In a real scenario, you would parse API routes and extract detailed information
        
        return {
            name: path.basename(component.path, path.extname(component.path)),
            file: component.path,
            type: 'api',
            endpoints: component.functions.map(f => f.name),
            documentation: component.comments.length > 0 ? component.comments[0].content : ''
        };
    }

    async generateAPIDocumentation(projectPath, codeDocumentation, options) {
        this.logger.info('Generating API documentation...');
        
        const results = {
            generated: [],
            errors: [],
            totalEndpoints: 0
        };

        try {
            const docsDir = path.join(projectPath, 'docs');
            await fs.mkdir(docsDir, { recursive: true });

            // Generate API documentation
            const apiDocs = this.generateAPIDocsContent(codeDocumentation.apis);
            const apiDocsPath = path.join(docsDir, 'api.md');
            await fs.writeFile(apiDocsPath, apiDocs);
            
            results.generated.push({
                type: 'api',
                path: path.relative(projectPath, apiDocsPath),
                endpoints: codeDocumentation.apis.length
            });
            
            results.totalEndpoints = codeDocumentation.apis.reduce((sum, api) => sum + api.endpoints.length, 0);
            
        } catch (error) {
            results.errors.push({
                action: 'generate_api_docs',
                error: error.message
            });
        }

        return results;
    }

    generateAPIDocsContent(apis) {
        let content = `# API Documentation

Generated on: ${new Date().toISOString()}

## Overview

This document provides comprehensive API documentation for the project.

## Endpoints

`;

        for (const api of apis) {
            content += `### ${api.name}

**File:** \`${api.file}\`

${api.documentation ? `**Description:** ${api.documentation}\n\n` : ''}

**Endpoints:**
${api.endpoints.map(endpoint => `- \`${endpoint}\``).join('\n')}

---
`;
        }

        return content;
    }

    async generateArchitectureDocumentation(projectPath, projectStructure, options) {
        this.logger.info('Generating architecture documentation...');
        
        const results = {
            generated: [],
            errors: []
        };

        try {
            const docsDir = path.join(projectPath, 'docs');
            await fs.mkdir(docsDir, { recursive: true });

            // Generate architecture documentation
            const archDocs = this.generateArchitectureDocsContent(projectStructure);
            const archDocsPath = path.join(docsDir, 'architecture.md');
            await fs.writeFile(archDocsPath, archDocs);
            
            results.generated.push({
                type: 'architecture',
                path: path.relative(projectPath, archDocsPath)
            });
            
        } catch (error) {
            results.errors.push({
                action: 'generate_architecture_docs',
                error: error.message
            });
        }

        return results;
    }

    generateArchitectureDocsContent(projectStructure) {
        return `# Architecture Documentation

Generated on: ${new Date().toISOString()}

## Project Structure

### Overview
- **Total Files:** ${projectStructure.metrics.totalFiles}
- **Total Components:** ${projectStructure.metrics.totalComponents}
- **Average Complexity:** ${projectStructure.metrics.averageComplexity.toFixed(2)}
- **Documentation Coverage:** ${projectStructure.metrics.documentationCoverage}%

### Directory Structure
${projectStructure.directories.map(dir => `- \`${dir.path}\` (${dir.type})`).join('\n')}

### File Types
${Object.entries(projectStructure.metrics.fileTypes).map(([type, count]) => `- **${type}:** ${count} files`).join('\n')}

## Components

${projectStructure.components.map(comp => `
### ${path.basename(comp.path, path.extname(comp.path))}
- **File:** \`${comp.path}\`
- **Type:** ${comp.type}
- **Functions:** ${comp.functions.length}
- **Classes:** ${comp.classes.length}
- **Complexity:** ${comp.complexity}
`).join('\n')}
`;
    }

    async generateExamples(projectPath, codeDocumentation, options) {
        this.logger.info('Generating examples...');
        
        const results = {
            generated: [],
            errors: []
        };

        try {
            const examplesDir = path.join(projectPath, 'docs', 'examples');
            await fs.mkdir(examplesDir, { recursive: true });

            // Generate examples for functions
            for (const func of codeDocumentation.functions) {
                const example = this.generateFunctionExample(func);
                const examplePath = path.join(examplesDir, `${func.name}.md`);
                await fs.writeFile(examplePath, example);
                
                results.generated.push({
                    type: 'function_example',
                    path: path.relative(projectPath, examplePath),
                    function: func.name
                });
            }

            // Generate examples for classes
            for (const cls of codeDocumentation.classes) {
                const example = this.generateClassExample(cls);
                const examplePath = path.join(examplesDir, `${cls.name}.md`);
                await fs.writeFile(examplePath, example);
                
                results.generated.push({
                    type: 'class_example',
                    path: path.relative(projectPath, examplePath),
                    class: cls.name
                });
            }
            
        } catch (error) {
            results.errors.push({
                action: 'generate_examples',
                error: error.message
            });
        }

        return results;
    }

    generateFunctionExample(func) {
        return `# Example: ${func.name}

## Description
${func.documentation || 'No documentation available.'}

## Usage

\`\`\`javascript
// Example usage of ${func.name}
import { ${func.name} } from '${func.file}';

// Example usage:
const result = ${func.name}(${func.params.map(p => p.name).join(', ')});

logger.info(result);
\`\`\`

## Parameters
${func.params.map(param => `- **${param.name}** (${param.type || 'any'}) - ${param.description || 'Parameter description'}`).join('\n')}

## Return Value
${func.returnType ? `**${func.returnType}** - ${func.returnDescription || 'Return value description'}` : 'No return value specified'}

## Notes
- Generated on: ${new Date().toISOString()}
- File: \`${func.file}\`
- Line: ${func.line}
`;
    }

    generateClassExample(cls) {
        return `# Example: ${cls.name}

## Description
${cls.documentation || 'No documentation available.'}

## Usage

\`\`\`javascript
// Example usage of ${cls.name}
import { ${cls.name} } from '${cls.file}';

// TODO: Add example implementation
const instance = new ${cls.name}();

logger.info(instance);
\`\`\`

## Constructor
The constructor initializes a new instance of ${cls.name}.

## Methods
${cls.methods ? cls.methods.map(method => `- **${method.name}()** - ${method.description || 'Method description'}`).join('\n') : 'No methods documented'}

## Notes
- Generated on: ${new Date().toISOString()}
- File: \`${cls.file}\`
- Line: ${cls.line}
`;
    }

    async generateDiagrams(projectPath, projectStructure, options) {
        this.logger.info('Generating diagrams...');
        
        const results = {
            generated: [],
            errors: []
        };

        // This is a simplified implementation
        // In a real scenario, you would generate actual diagram files (SVG, PNG, etc.)
        
        return results;
    }

    async generateChangelog(projectPath, options) {
        this.logger.info('Generating changelog...');
        
        const results = {
            generated: [],
            errors: []
        };

        try {
            const docsDir = path.join(projectPath, 'docs');
            await fs.mkdir(docsDir, { recursive: true });

            const changelog = this.generateChangelogContent();
            const changelogPath = path.join(docsDir, 'CHANGELOG.md');
            await fs.writeFile(changelogPath, changelog);
            
            results.generated.push({
                type: 'changelog',
                path: path.relative(projectPath, changelogPath)
            });
            
        } catch (error) {
            results.errors.push({
                action: 'generate_changelog',
                error: error.message
            });
        }

        return results;
    }

    generateChangelogContent() {
        return `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial project setup
- Documentation generation

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

---
Generated on: ${new Date().toISOString()}
`;
    }

    async generateTutorials(projectPath, codeDocumentation, options) {
        this.logger.info('Generating tutorials...');
        
        const results = {
            generated: [],
            errors: []
        };

        try {
            const tutorialsDir = path.join(projectPath, 'docs', 'tutorials');
            await fs.mkdir(tutorialsDir, { recursive: true });

            // Generate getting started tutorial
            const gettingStarted = this.generateGettingStartedTutorial(codeDocumentation);
            const gettingStartedPath = path.join(tutorialsDir, 'getting-started.md');
            await fs.writeFile(gettingStartedPath, gettingStarted);
            
            results.generated.push({
                type: 'tutorial',
                path: path.relative(projectPath, gettingStartedPath),
                name: 'Getting Started'
            });
            
        } catch (error) {
            results.errors.push({
                action: 'generate_tutorials',
                error: error.message
            });
        }

        return results;
    }

    generateGettingStartedTutorial(codeDocumentation) {
        return `# Getting Started

## Introduction

Welcome to the project! This tutorial will help you get started with using the codebase.

## Prerequisites

- Node.js (version 14 or higher)
- npm or yarn package manager

## Installation

\`\`\`bash
npm install
\`\`\`

## Basic Usage

### Available Functions

The project provides the following main functions:

${codeDocumentation.functions.slice(0, 5).map(func => `- **${func.name}** - ${func.documentation || 'No description available'}`).join('\n')}

### Available Classes

The project provides the following main classes:

${codeDocumentation.classes.slice(0, 5).map(cls => `- **${cls.name}** - ${cls.documentation || 'No description available'}`).join('\n')}

## Examples

See the \`docs/examples/\` directory for detailed examples of each function and class.

## Next Steps

1. Review the API documentation in \`docs/api.md\`
2. Check out the architecture documentation in \`docs/architecture.md\`
3. Explore the examples in \`docs/examples/\`

---
Generated on: ${new Date().toISOString()}
`;
    }

    async consolidateDocumentation(projectPath, allDocs) {
        this.logger.info('Consolidating documentation...');
        
        const results = {
            generated: [],
            errors: []
        };

        try {
            const docsDir = path.join(projectPath, 'docs');
            
            // Generate main README
            const mainReadme = this.generateMainReadme(allDocs);
            const mainReadmePath = path.join(docsDir, 'README.md');
            await fs.writeFile(mainReadmePath, mainReadme);
            
            results.generated.push({
                type: 'main_readme',
                path: path.relative(projectPath, mainReadmePath)
            });
            
            // Generate documentation index
            const index = this.generateDocumentationIndex(allDocs);
            const indexPath = path.join(docsDir, 'index.md');
            await fs.writeFile(indexPath, index);
            
            results.generated.push({
                type: 'documentation_index',
                path: path.relative(projectPath, indexPath)
            });
            
        } catch (error) {
            results.errors.push({
                action: 'consolidate_documentation',
                error: error.message
            });
        }

        return results;
    }

    generateMainReadme(allDocs) {
        return `# Project Documentation

## Overview

This directory contains comprehensive documentation for the project.

## Documentation Structure

- **API Documentation** - Complete API reference
- **Architecture Documentation** - Project structure and design
- **Examples** - Code examples and usage patterns
- **Tutorials** - Step-by-step guides
- **Changelog** - Version history and changes

## Quick Links

- [API Reference](api.md)
- [Architecture Overview](architecture.md)
- [Getting Started Tutorial](tutorials/getting-started.md)
- [Examples Directory](examples/)
- [Changelog](CHANGELOG.md)

## Generated Documentation

${Object.entries(allDocs).map(([type, docs]) => {
    if (docs && docs.generated && docs.generated.length > 0) {
        return `### ${type.charAt(0).toUpperCase() + type.slice(1)}
${docs.generated.map(doc => `- [${doc.type || 'Document'}](${doc.path})`).join('\n')}`;
    }
    return '';
}).filter(Boolean).join('\n\n')}

---
Generated on: ${new Date().toISOString()}
`;
    }

    generateDocumentationIndex(allDocs) {
        return `# Documentation Index

## Available Documentation

${Object.entries(allDocs).map(([type, docs]) => {
    if (docs && docs.generated && docs.generated.length > 0) {
        return `### ${type.charAt(0).toUpperCase() + type.slice(1)}
${docs.generated.map(doc => `- [${doc.type || 'Document'}](${doc.path})`).join('\n')}`;
    }
    return '';
}).filter(Boolean).join('\n\n')}

---
Generated on: ${new Date().toISOString()}
`;
    }

    async generateOutput(data) {
        const { command, projectStructure, codeDocumentation, apiDocsResults, architectureDocsResults, examplesResults, diagramsResults, changelogResults, tutorialsResults, consolidationResults, outputConfig } = data;

        const output = {
            commandId: command.commandId,
            timestamp: new Date(),
            summary: {
                docType: command.getGenerateOptions().docType,
                totalComponents: projectStructure.metrics.totalComponents,
                apiDocsGenerated: apiDocsResults?.generated?.length || 0,
                architectureDocsGenerated: architectureDocsResults?.generated?.length || 0,
                examplesGenerated: examplesResults?.generated?.length || 0,
                diagramsGenerated: diagramsResults?.generated?.length || 0,
                changelogGenerated: changelogResults?.generated?.length || 0,
                tutorialsGenerated: tutorialsResults?.generated?.length || 0,
                consolidationGenerated: consolidationResults?.generated?.length || 0
            },
            projectStructure: outputConfig.includeRawData ? projectStructure : projectStructure.metrics,
            codeDocumentation: {
                functions: codeDocumentation.functions.length,
                classes: codeDocumentation.classes.length,
                modules: codeDocumentation.modules.length,
                apis: codeDocumentation.apis.length
            },
            results: {
                apiDocs: apiDocsResults,
                architectureDocs: architectureDocsResults,
                examples: examplesResults,
                diagrams: diagramsResults,
                changelog: changelogResults,
                tutorials: tutorialsResults,
                consolidation: consolidationResults
            }
        };

        if (outputConfig.includeMetrics) {
            output.metrics = {
                before: projectStructure.metrics,
                after: {
                    ...projectStructure.metrics,
                    documentationGenerated: true
                }
            };
        }

        return output;
    }

    async saveResults(command, output) {
        try {
            await this.analysisRepository.save({
                id: command.commandId,
                type: 'documentation_generation',
                projectPath: command.projectPath,
                data: output,
                timestamp: new Date(),
                metadata: command.getMetadata()
            });

            await this.eventBus.publish('documentation.generation.completed', {
                commandId: command.commandId,
                projectPath: command.projectPath,
                results: output,
                timestamp: new Date()
            });
        } catch (error) {
            this.logger.error('Failed to save documentation generation results:', error);
        }
    }
}

module.exports = GenerateDocumentationHandler; 