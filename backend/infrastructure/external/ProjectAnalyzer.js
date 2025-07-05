/**
 * ProjectAnalyzer - Analyzes project structure and characteristics
 */
const path = require('path');
const fs = require('fs').promises;
const { execSync } = require('child_process');

class ProjectAnalyzer {
    constructor() {
        this.supportedTypes = ['nodejs', 'python', 'react', 'vue', 'angular', 'java', 'csharp'];
    }

    /**
     * Analyze project structure and characteristics
     * @param {string} projectPath - Path to project directory
     * @returns {Promise<Object>} Project analysis results
     */
    async analyzeProject(projectPath) {
        try {
            const stats = await fs.stat(projectPath);
            if (!stats.isDirectory()) {
                throw new Error('Project path must be a directory');
            }

            const analysis = {
                id: `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                projectPath,
                projectType: await this.detectProjectType(projectPath),
                structure: await this.analyzeStructure(projectPath),
                dependencies: await this.analyzeDependencies(projectPath),
                complexity: await this.calculateComplexity(projectPath),
                issues: await this.detectIssues(projectPath),
                suggestions: await this.generateSuggestions(projectPath),
                timestamp: new Date()
            };

            return analysis;
        } catch (error) {
            throw new Error(`Project analysis failed: ${error.message}`);
        }
    }

    /**
     * Detect project type based on configuration files
     * @param {string} projectPath - Project directory path
     * @returns {Promise<string>} Project type
     */
    async detectProjectType(projectPath) {
        try {
            // Check for package.json (Node.js)
            await fs.access(path.join(projectPath, 'package.json'));
            const packageJson = JSON.parse(await fs.readFile(path.join(projectPath, 'package.json'), 'utf8'));
            
            // Check for React/Vue/Angular
            if (packageJson.dependencies && packageJson.dependencies.react) {
                return 'react';
            }
            if (packageJson.dependencies && packageJson.dependencies.vue) {
                return 'vue';
            }
            if (packageJson.dependencies && packageJson.dependencies['@angular/core']) {
                return 'angular';
            }
            
            return 'nodejs';
        } catch {
            try {
                // Check for requirements.txt (Python)
                await fs.access(path.join(projectPath, 'requirements.txt'));
                return 'python';
            } catch {
                try {
                    // Check for pom.xml (Java)
                    await fs.access(path.join(projectPath, 'pom.xml'));
                    return 'java';
                } catch {
                    try {
                        // Check for .csproj (C#)
                        const files = await fs.readdir(projectPath);
                        if (files.some(f => f.endsWith('.csproj'))) {
                            return 'csharp';
                        }
                    } catch {
                        // Ignore errors
                    }
                    
                    // Default to unknown
                    return 'unknown';
                }
            }
        }
    }

    /**
     * Analyze project file structure
     * @param {string} projectPath - Project directory path
     * @returns {Promise<Object>} Structure analysis
     */
    async analyzeStructure(projectPath) {
        const structure = {
            files: [],
            directories: [],
            totalFiles: 0,
            totalDirectories: 0,
            fileTypes: {},
            largestFiles: []
        };

        try {
            const analyzeDirectory = async (dir, relativePath = '') => {
                const items = await fs.readdir(dir);
                for (const item of items) {
                    const itemPath = path.join(dir, item);
                    const relativeItemPath = path.join(relativePath, item);
                    const stats = await fs.stat(itemPath);
                    
                    if (stats.isDirectory()) {
                        structure.directories.push(relativeItemPath);
                        structure.totalDirectories++;
                        await analyzeDirectory(itemPath, relativeItemPath);
                    } else {
                        structure.files.push(relativeItemPath);
                        structure.totalFiles++;
                        
                        // Track file types
                        const ext = path.extname(item);
                        structure.fileTypes[ext] = (structure.fileTypes[ext] || 0) + 1;
                        
                        // Track largest files
                        structure.largestFiles.push({
                            path: relativeItemPath,
                            size: stats.size
                        });
                    }
                }
            };
            
            await analyzeDirectory(projectPath);
            
            // Sort largest files
            structure.largestFiles.sort((a, b) => b.size - a.size);
            structure.largestFiles = structure.largestFiles.slice(0, 10);
        } catch (error) {
            // Ignore read errors
        }

        return structure;
    }

    /**
     * Analyze project dependencies
     * @param {string} projectPath - Project directory path
     * @returns {Promise<Object>} Dependencies analysis
     */
    async analyzeDependencies(projectPath) {
        const dependencies = {
            packageManager: null,
            dependencies: [],
            devDependencies: [],
            totalDependencies: 0,
            outdatedPackages: []
        };

        try {
            const packageJsonPath = path.join(projectPath, 'package.json');
            const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
            
            dependencies.packageManager = 'npm';
            dependencies.dependencies = Object.keys(packageJson.dependencies || {});
            dependencies.devDependencies = Object.keys(packageJson.devDependencies || {});
            dependencies.totalDependencies = dependencies.dependencies.length + dependencies.devDependencies.length;
        } catch {
            // Not a Node.js project or no package.json
        }

        return dependencies;
    }

    /**
     * Calculate project complexity
     * @param {string} projectPath - Project directory path
     * @returns {Promise<string>} Complexity level
     */
    async calculateComplexity(projectPath) {
        let fileCount = 0;
        let lineCount = 0;
        
        try {
            const countFiles = async (dir) => {
                const items = await fs.readdir(dir);
                for (const item of items) {
                    const itemPath = path.join(dir, item);
                    const stats = await fs.stat(itemPath);
                    
                    if (stats.isDirectory()) {
                        await countFiles(itemPath);
                    } else {
                        fileCount++;
                        
                        // Count lines in text files
                        const ext = path.extname(item);
                        if (['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cs', '.html', '.css', '.scss'].includes(ext)) {
                            try {
                                const content = await fs.readFile(itemPath, 'utf8');
                                lineCount += content.split('\n').length;
                            } catch {
                                // Ignore read errors
                            }
                        }
                    }
                }
            };
            
            await countFiles(projectPath);
        } catch {
            // Ignore errors
        }

        if (fileCount < 10 && lineCount < 1000) return 'low';
        if (fileCount < 50 && lineCount < 10000) return 'medium';
        return 'high';
    }

    /**
     * Detect common project issues
     * @param {string} projectPath - Project directory path
     * @returns {Promise<Array>} List of issues
     */
    async detectIssues(projectPath) {
        const issues = [];
        
        try {
            const items = await fs.readdir(projectPath);
            
            if (!items.includes('.gitignore')) {
                issues.push('Missing .gitignore file');
            }
            
            if (!items.includes('README.md')) {
                issues.push('Missing README.md file');
            }
            
            if (!items.includes('package.json') && !items.includes('requirements.txt') && !items.includes('pom.xml')) {
                issues.push('No dependency management file found');
            }
            
            // Check for common security issues
            if (items.includes('package.json')) {
                try {
                    const packageJson = JSON.parse(await fs.readFile(path.join(projectPath, 'package.json'), 'utf8'));
                    if (packageJson.dependencies && packageJson.dependencies['express']) {
                        if (!packageJson.dependencies['helmet']) {
                            issues.push('Express app missing security middleware (helmet)');
                        }
                    }
                } catch {
                    // Ignore errors
                }
            }
        } catch {
            // Ignore errors
        }

        return issues;
    }

    /**
     * Generate improvement suggestions
     * @param {string} projectPath - Project directory path
     * @returns {Promise<Array>} List of suggestions
     */
    async generateSuggestions(projectPath) {
        const suggestions = [];
        
        try {
            const items = await fs.readdir(projectPath);
            
            if (!items.includes('tests') && !items.includes('test') && !items.includes('__tests__')) {
                suggestions.push('Add test directory and unit tests');
            }
            
            if (!items.includes('.eslintrc') && !items.includes('eslint.config.js')) {
                suggestions.push('Add ESLint configuration for code quality');
            }
            
            if (!items.includes('Dockerfile')) {
                suggestions.push('Consider adding Docker support for containerization');
            }
            
            if (!items.includes('.github')) {
                suggestions.push('Add GitHub Actions for CI/CD');
            }
        } catch {
            // Ignore errors
        }

        return suggestions;
    }

    /**
     * Get supported project types
     * @returns {Array} List of supported types
     */
    getSupportedTypes() {
        return this.supportedTypes;
    }
}

module.exports = ProjectAnalyzer; 