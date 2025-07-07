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
            if (!stats.isDirectory === true) {
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
        } catch (error) {
            // package.json not found, continue with other project types
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
    async analyzeStructure(projectPath, options = {}) {
        const structure = {
            files: [],
            directories: [],
            totalFiles: 0,
            totalDirectories: 0,
            fileTypes: {},
            largestFiles: [],
            totalSize: 0
        };

        const maxDepth = options.maxDepth || 10;
        const includeHidden = options.includeHidden || false;
        const excludePatterns = options.excludePatterns || ['node_modules', '.git', 'dist', 'build', 'coverage'];
        const fileTypes = options.fileTypes || [];

        try {
            const analyzeDirectory = async (dir, relativePath = '', currentDepth = 0) => {
                if (currentDepth > maxDepth) return;
                
                const items = await fs.readdir(dir);
                for (const item of items) {
                    // Skip hidden files if not included
                    if (!includeHidden && item.startsWith('.')) continue;
                    
                    // Skip excluded patterns
                    if (excludePatterns.some(pattern => item.includes(pattern))) continue;
                    
                    const itemPath = path.join(dir, item);
                    const relativeItemPath = path.join(relativePath, item);
                    
                    try {
                        const stats = await fs.stat(itemPath);
                        
                        if (stats.isDirectory()) {
                            structure.directories.push({
                                path: relativeItemPath,
                                size: stats.size,
                                isDirectory: true,
                                isFile: false,
                                fileCount: 0
                            });
                            structure.totalDirectories++;
                            structure.totalSize += stats.size;
                            
                            // Recursively analyze subdirectory
                            await analyzeDirectory(itemPath, relativeItemPath, currentDepth + 1);
                        } else {
                            const ext = path.extname(item);
                            
                            // Filter by file types if specified
                            if (fileTypes.length > 0 && !fileTypes.includes(ext.replace('.', ''))) continue;
                            
                            structure.files.push({
                                path: relativeItemPath,
                                size: stats.size,
                                isDirectory: false,
                                isFile: true,
                                extension: ext
                            });
                            structure.totalFiles++;
                            structure.totalSize += stats.size;
                            structure.fileTypes[ext] = (structure.fileTypes[ext] || 0) + 1;
                            structure.largestFiles.push({
                                path: relativeItemPath,
                                size: stats.size
                            });
                        }
                    } catch (error) {
                        // Skip files we can't access
                        continue;
                    }
                }
            };
            
            await analyzeDirectory(projectPath);
            structure.largestFiles.sort((a, b) => b.size - a.size);
            structure.largestFiles = structure.largestFiles.slice(0, 10);
        } catch (error) {
            console.error('Error analyzing structure:', error);
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
                    
                    if (stats.isDirectory === true) {
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
            
            // Basic file checks
            if (!items.includes('.gitignore')) {
                issues.push({
                    title: 'Missing .gitignore file',
                    description: 'No .gitignore file found. This can lead to committing sensitive files.',
                    severity: 'medium',
                    category: 'security'
                });
            }
            
            if (!items.includes('README.md')) {
                issues.push({
                    title: 'Missing README.md file',
                    description: 'No README.md file found. Documentation is essential for project maintainability.',
                    severity: 'medium',
                    category: 'documentation'
                });
            }
            
            // Advanced structure analysis
            const structure = await this.analyzeStructure(projectPath);
            
            // Check for large files that should be split
            const largeFiles = structure.largestFiles.filter(file => file.size > 50000); // 50KB
            largeFiles.forEach(file => {
                issues.push({
                    title: `Large file detected: ${file.path}`,
                    description: `File ${file.path} is ${(file.size / 1024).toFixed(1)}KB. Consider splitting into smaller modules.`,
                    severity: 'high',
                    category: 'architecture'
                });
            });
            
            // Check for deep directory nesting
            const deepDirs = structure.directories.filter(dir => dir.path.split('/').length > 5);
            if (deepDirs.length > 0) {
                issues.push({
                    title: 'Deep directory nesting detected',
                    description: `${deepDirs.length} directories have more than 5 levels. This can make navigation difficult.`,
                    severity: 'medium',
                    category: 'architecture'
                });
            }
            
            // Check for too many files in single directory
            const largeDirs = structure.directories.filter(dir => {
                const dirPath = path.join(projectPath, dir.path);
                try {
                    const files = fs.readdirSync(dirPath);
                    return files.length > 20;
                } catch {
                    return false;
                }
            });
            
            if (largeDirs.length > 0) {
                issues.push({
                    title: 'Directories with too many files',
                    description: `${largeDirs.length} directories contain more than 20 files. Consider organizing into subdirectories.`,
                    severity: 'medium',
                    category: 'organization'
                });
            }
            
            // Check for mixed file types in same directory
            const mixedDirs = structure.directories.filter(dir => {
                const dirPath = path.join(projectPath, dir.path);
                try {
                    const files = fs.readdirSync(dirPath);
                    const extensions = files.map(f => path.extname(f)).filter(ext => ext);
                    const uniqueExts = new Set(extensions);
                    return uniqueExts.size > 5; // More than 5 different file types
                } catch {
                    return false;
                }
            });
            
            if (mixedDirs.length > 0) {
                issues.push({
                    title: 'Mixed file types in directories',
                    description: `${mixedDirs.length} directories contain mixed file types. Consider organizing by file type.`,
                    severity: 'low',
                    category: 'organization'
                });
            }
            
            // Security checks for Node.js projects
            if (items.includes('package.json')) {
                try {
                    const packageJson = JSON.parse(await fs.readFile(path.join(projectPath, 'package.json'), 'utf8'));
                    
                    if (packageJson.dependencies && packageJson.dependencies['express']) {
                        if (!packageJson.dependencies['helmet']) {
                            issues.push({
                                title: 'Express app missing security middleware',
                                description: 'Express app is missing helmet for security headers. Add helmet dependency.',
                                severity: 'high',
                                category: 'security'
                            });
                        }
                        
                        if (!packageJson.dependencies['cors']) {
                            issues.push({
                                title: 'Express app missing CORS middleware',
                                description: 'Express app is missing CORS configuration. Add cors dependency.',
                                severity: 'medium',
                                category: 'security'
                            });
                        }
                    }
                    
                    // Check for outdated packages
                    if (packageJson.dependencies) {
                        const outdatedPackages = Object.keys(packageJson.dependencies).filter(pkg => {
                            const version = packageJson.dependencies[pkg];
                            return version.startsWith('^') || version.startsWith('~');
                        });
                        
                        if (outdatedPackages.length > 5) {
                            issues.push({
                                title: 'Many outdated packages detected',
                                description: `${outdatedPackages.length} packages may be outdated. Run npm update to check for updates.`,
                                severity: 'medium',
                                category: 'maintenance'
                            });
                        }
                    }
                } catch {
                    // Ignore errors
                }
            }
            
            // Check for test coverage
            if (!items.includes('tests') && !items.includes('test') && !items.includes('__tests__')) {
                issues.push({
                    title: 'No test directory found',
                    description: 'No test directory detected. Add tests to improve code quality and reliability.',
                    severity: 'high',
                    category: 'testing'
                });
            }
            
            // Check for configuration files
            if (!items.includes('.eslintrc') && !items.includes('eslint.config.js')) {
                issues.push({
                    title: 'No ESLint configuration found',
                    description: 'No ESLint configuration detected. Add ESLint for code quality enforcement.',
                    severity: 'medium',
                    category: 'quality'
                });
            }
            
        } catch (error) {
            console.error('Error detecting issues:', error);
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
            const structure = await this.analyzeStructure(projectPath);
            const dependencies = await this.analyzeDependencies(projectPath);
            
            // Architecture suggestions based on structure
            if (structure.totalFiles > 100) {
                suggestions.push({
                    title: 'Consider modular architecture',
                    description: 'Project has many files. Consider organizing into modules or microservices.',
                    priority: 'high',
                    category: 'architecture'
                });
            }
            
            if (structure.largestFiles.length > 0 && structure.largestFiles[0].size > 100000) {
                suggestions.push({
                    title: 'Split large files into modules',
                    description: `File ${structure.largestFiles[0].path} is very large. Split into smaller, focused modules.`,
                    priority: 'high',
                    category: 'refactoring'
                });
            }
            
            // Testing suggestions
            if (!items.includes('tests') && !items.includes('test') && !items.includes('__tests__')) {
                suggestions.push({
                    title: 'Implement comprehensive testing strategy',
                    description: 'Add unit tests, integration tests, and e2e tests. Consider Jest for Node.js projects.',
                    priority: 'high',
                    category: 'testing'
                });
            }
            
            // Code quality suggestions
            if (!items.includes('.eslintrc') && !items.includes('eslint.config.js')) {
                suggestions.push({
                    title: 'Add code quality tools',
                    description: 'Implement ESLint, Prettier, and Husky for consistent code quality.',
                    priority: 'medium',
                    category: 'quality'
                });
            }
            
            // Performance suggestions
            if (dependencies.dependencies.includes('express')) {
                suggestions.push({
                    title: 'Optimize Express.js performance',
                    description: 'Add compression, caching, and database connection pooling for better performance.',
                    priority: 'medium',
                    category: 'performance'
                });
            }
            
            // Security suggestions
            if (dependencies.dependencies.includes('express')) {
                suggestions.push({
                    title: 'Enhance security measures',
                    description: 'Add rate limiting, input validation, and security headers.',
                    priority: 'high',
                    category: 'security'
                });
            }
            
            // Documentation suggestions
            if (!items.includes('README.md')) {
                suggestions.push({
                    title: 'Create comprehensive documentation',
                    description: 'Add README.md, API documentation, and inline code comments.',
                    priority: 'medium',
                    category: 'documentation'
                });
            }
            
            // DevOps suggestions
            if (!items.includes('Dockerfile')) {
                suggestions.push({
                    title: 'Add containerization support',
                    description: 'Create Dockerfile and docker-compose.yml for easy deployment.',
                    priority: 'medium',
                    category: 'devops'
                });
            }
            
            if (!items.includes('.github')) {
                suggestions.push({
                    title: 'Implement CI/CD pipeline',
                    description: 'Add GitHub Actions for automated testing and deployment.',
                    priority: 'medium',
                    category: 'devops'
                });
            }
            
            // Monitoring suggestions
            if (!items.includes('logs') && !items.includes('monitoring')) {
                suggestions.push({
                    title: 'Add logging and monitoring',
                    description: 'Implement structured logging and application monitoring.',
                    priority: 'medium',
                    category: 'monitoring'
                });
            }
            
            // Database suggestions (if applicable)
            if (dependencies.dependencies.some(dep => ['mongoose', 'sequelize', 'prisma'].includes(dep))) {
                suggestions.push({
                    title: 'Optimize database operations',
                    description: 'Add database indexing, connection pooling, and query optimization.',
                    priority: 'medium',
                    category: 'database'
                });
            }
            
        } catch (error) {
            console.error('Error generating suggestions:', error);
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