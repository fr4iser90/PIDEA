/**
 * CodeQualityAnalyzer - Comprehensive code quality analysis
 */
const path = require('path');
const fs = require('fs').promises;
const { execSync } = require('child_process');

class CodeQualityAnalyzer {
    constructor() {
        this.supportedLanguages = ['javascript', 'typescript', 'jsx', 'tsx', 'python', 'java', 'csharp'];
        this.qualityMetrics = {
            complexity: {},
            maintainability: {},
            readability: {},
            testability: {},
            security: {}
        };
    }

    /**
     * Analyze code quality for a project
     * @param {string} projectPath - Project directory path
     * @param {Object} options - Analysis options
     * @returns {Promise<Object>} Code quality analysis results
     */
    async analyzeCodeQuality(projectPath, options = {}) {
        try {
            const analysis = {
                projectPath,
                timestamp: new Date(),
                overallScore: 0,
                metrics: {},
                issues: [],
                recommendations: [],
                configuration: {},
                coverage: {}
            };

            // Analyze linting configuration
            analysis.configuration.linting = await this.analyzeLintingConfig(projectPath);
            
            // Analyze formatting configuration
            analysis.configuration.formatting = await this.analyzeFormattingConfig(projectPath);
            
            // Analyze code complexity
            analysis.metrics.complexity = await this.analyzeComplexity(projectPath);
            
            // Analyze maintainability
            analysis.metrics.maintainability = await this.analyzeMaintainability(projectPath);
            
            // Analyze readability
            analysis.metrics.readability = await this.analyzeReadability(projectPath);
            
            // Analyze testability
            analysis.metrics.testability = await this.analyzeTestability(projectPath);
            
            // Run ESLint analysis
            analysis.issues = await this.runESLintAnalysis(projectPath);
            
            // Generate recommendations
            analysis.recommendations = await this.generateRecommendations(analysis);
            
            // Calculate overall score
            analysis.overallScore = this.calculateOverallScore(analysis);

            return analysis;
        } catch (error) {
            throw new Error(`Code quality analysis failed: ${error.message}`);
        }
    }

    /**
     * Analyze linting configuration
     * @param {string} projectPath - Project directory path
     * @returns {Promise<Object>} Linting configuration analysis
     */
    async analyzeLintingConfig(projectPath) {
        const config = {
            hasESLint: false,
            hasPrettier: false,
            hasHusky: false,
            hasLintStaged: false,
            rules: {},
            plugins: [],
            extends: []
        };

        try {
            // Check for ESLint configuration
            const eslintConfigs = ['.eslintrc.js', '.eslintrc.json', '.eslintrc.yml', 'eslint.config.js'];
            for (const configFile of eslintConfigs) {
                try {
                    await fs.access(path.join(projectPath, configFile));
                    config.hasESLint = true;
                    
                    // Parse ESLint config
                    const configContent = await fs.readFile(path.join(projectPath, configFile), 'utf8');
                    const eslintConfig = JSON.parse(configContent);
                    
                    config.rules = eslintConfig.rules || {};
                    config.plugins = eslintConfig.plugins || [];
                    config.extends = eslintConfig.extends || [];
                    break;
                } catch {
                    // Config file not found, continue
                }
            }

            // Check for Prettier configuration
            const prettierConfigs = ['.prettierrc', '.prettierrc.js', '.prettierrc.json'];
            for (const configFile of prettierConfigs) {
                try {
                    await fs.access(path.join(projectPath, configFile));
                    config.hasPrettier = true;
                    break;
                } catch {
                    // Config file not found, continue
                }
            }

            // Check for Husky and lint-staged
            try {
                const packageJson = JSON.parse(await fs.readFile(path.join(projectPath, 'package.json'), 'utf8'));
                config.hasHusky = !!(packageJson.dependencies?.husky || packageJson.devDependencies?.husky);
                config.hasLintStaged = !!(packageJson.dependencies?.['lint-staged'] || packageJson.devDependencies?.['lint-staged']);
            } catch {
                // No package.json or parsing error
            }

        } catch (error) {
            // Ignore errors
        }

        return config;
    }

    /**
     * Analyze formatting configuration
     * @param {string} projectPath - Project directory path
     * @returns {Promise<Object>} Formatting configuration analysis
     */
    async analyzeFormattingConfig(projectPath) {
        const config = {
            hasPrettier: false,
            hasEditorConfig: false,
            hasVSCodeSettings: false,
            formattingRules: {}
        };

        try {
            // Check for Prettier
            const prettierConfigs = ['.prettierrc', '.prettierrc.js', '.prettierrc.json'];
            for (const configFile of prettierConfigs) {
                try {
                    await fs.access(path.join(projectPath, configFile));
                    config.hasPrettier = true;
                    
                    const configContent = await fs.readFile(path.join(projectPath, configFile), 'utf8');
                    config.formattingRules = JSON.parse(configContent);
                    break;
                } catch {
                    // Config file not found, continue
                }
            }

            // Check for EditorConfig
            try {
                await fs.access(path.join(projectPath, '.editorconfig'));
                config.hasEditorConfig = true;
            } catch {
                // No .editorconfig
            }

            // Check for VSCode settings
            try {
                await fs.access(path.join(projectPath, '.vscode/settings.json'));
                config.hasVSCodeSettings = true;
            } catch {
                // No VSCode settings
            }

        } catch (error) {
            // Ignore errors
        }

        return config;
    }

    /**
     * Analyze code complexity
     * @param {string} projectPath - Project directory path
     * @returns {Promise<Object>} Complexity analysis
     */
    async analyzeComplexity(projectPath) {
        const complexity = {
            cyclomaticComplexity: {},
            cognitiveComplexity: {},
            nestingDepth: {},
            functionLength: {},
            classComplexity: {}
        };

        try {
            const files = await this.getCodeFiles(projectPath);
            
            for (const file of files) {
                const content = await fs.readFile(file, 'utf8');
                const fileComplexity = this.calculateFileComplexity(content, file);
                
                complexity.cyclomaticComplexity[file] = fileComplexity.cyclomatic;
                complexity.cognitiveComplexity[file] = fileComplexity.cognitive;
                complexity.nestingDepth[file] = fileComplexity.nesting;
                complexity.functionLength[file] = fileComplexity.functionLength;
                complexity.classComplexity[file] = fileComplexity.classComplexity;
            }

        } catch (error) {
            // Ignore errors
        }

        return complexity;
    }

    /**
     * Calculate complexity for a single file
     * @param {string} content - File content
     * @param {string} filePath - File path
     * @returns {Object} Complexity metrics
     */
    calculateFileComplexity(content, filePath) {
        const ext = path.extname(filePath);
        const isJS = ['.js', '.jsx', '.ts', '.tsx'].includes(ext);
        
        if (!isJS) {
            return {
                cyclomatic: 0,
                cognitive: 0,
                nesting: 0,
                functionLength: 0,
                classComplexity: 0
            };
        }

        // Simple complexity calculation
        const lines = content.split('\n');
        let cyclomatic = 1; // Base complexity
        let cognitive = 0;
        let maxNesting = 0;
        let currentNesting = 0;
        let functionCount = 0;
        let totalFunctionLength = 0;
        let classCount = 0;

        for (const line of lines) {
            const trimmed = line.trim();
            
            // Cyclomatic complexity factors
            if (trimmed.includes('if ') || trimmed.includes('else if')) cyclomatic++;
            if (trimmed.includes('for ') || trimmed.includes('while ')) cyclomatic++;
            if (trimmed.includes('case ') || trimmed.includes('default:')) cyclomatic++;
            if (trimmed.includes('&&') || trimmed.includes('||')) cyclomatic++;
            if (trimmed.includes('catch ')) cyclomatic++;
            if (trimmed.includes('switch ')) cyclomatic++;

            // Cognitive complexity
            if (trimmed.includes('if ') || trimmed.includes('else if')) cognitive += 1;
            if (trimmed.includes('for ') || trimmed.includes('while ')) cognitive += 1;
            if (trimmed.includes('switch ')) cognitive += 1;
            if (trimmed.includes('catch ')) cognitive += 1;
            if (trimmed.includes('&&') || trimmed.includes('||')) cognitive += 1;

            // Nesting depth
            if (trimmed.includes('{')) currentNesting++;
            if (trimmed.includes('}')) currentNesting--;
            maxNesting = Math.max(maxNesting, currentNesting);

            // Function detection
            if (trimmed.includes('function ') || trimmed.includes('=>')) functionCount++;

            // Class detection
            if (trimmed.includes('class ')) classCount++;
        }

        return {
            cyclomatic,
            cognitive,
            nesting: maxNesting,
            functionLength: functionCount > 0 ? Math.round(lines.length / functionCount) : 0,
            classComplexity: classCount
        };
    }

    /**
     * Analyze maintainability
     * @param {string} projectPath - Project directory path
     * @returns {Promise<Object>} Maintainability analysis
     */
    async analyzeMaintainability(projectPath) {
        const maintainability = {
            codeDuplication: 0,
            largeFiles: [],
            longFunctions: [],
            magicNumbers: 0,
            hardcodedStrings: 0,
            maintainabilityIndex: 0
        };

        try {
            const files = await this.getCodeFiles(projectPath);
            
            for (const file of files) {
                const content = await fs.readFile(file, 'utf8');
                const stats = await fs.stat(file);
                
                // Large files
                if (stats.size > 50000) { // 50KB
                    maintainability.largeFiles.push({
                        file,
                        size: stats.size,
                        lines: content.split('\n').length
                    });
                }

                // Analyze content for maintainability issues
                const lines = content.split('\n');
                for (const line of lines) {
                    // Magic numbers
                    if (/\b\d{3,}\b/.test(line)) maintainability.magicNumbers++;
                    
                    // Hardcoded strings
                    if (line.includes('"http://') || line.includes("'http://")) maintainability.hardcodedStrings++;
                    if (line.includes('"https://') || line.includes("'https://")) maintainability.hardcodedStrings++;
                }
            }

            // Calculate maintainability index (simplified)
            const totalIssues = maintainability.largeFiles.length + 
                              maintainability.magicNumbers + 
                              maintainability.hardcodedStrings;
            
            maintainability.maintainabilityIndex = Math.max(0, 100 - totalIssues * 5);

        } catch (error) {
            // Ignore errors
        }

        return maintainability;
    }

    /**
     * Analyze readability
     * @param {string} projectPath - Project directory path
     * @returns {Promise<Object>} Readability analysis
     */
    async analyzeReadability(projectPath) {
        const readability = {
            averageLineLength: 0,
            longLines: 0,
            commentRatio: 0,
            namingConventions: {},
            documentation: {}
        };

        try {
            const files = await this.getCodeFiles(projectPath);
            let totalLines = 0;
            let totalLength = 0;
            let longLines = 0;
            let commentLines = 0;

            for (const file of files) {
                const content = await fs.readFile(file, 'utf8');
                const lines = content.split('\n');
                
                for (const line of lines) {
                    totalLines++;
                    totalLength += line.length;
                    
                    if (line.length > 120) longLines++;
                    if (line.trim().startsWith('//') || line.trim().startsWith('/*')) commentLines++;
                }
            }

            readability.averageLineLength = totalLines > 0 ? Math.round(totalLength / totalLines) : 0;
            readability.longLines = longLines;
            readability.commentRatio = totalLines > 0 ? Math.round((commentLines / totalLines) * 100) : 0;

        } catch (error) {
            // Ignore errors
        }

        return readability;
    }

    /**
     * Analyze testability
     * @param {string} projectPath - Project directory path
     * @returns {Promise<Object>} Testability analysis
     */
    async analyzeTestability(projectPath) {
        const testability = {
            hasTests: false,
            testCoverage: 0,
            testableFunctions: 0,
            untestableFunctions: 0,
            mockDependencies: 0,
            testFramework: null
        };

        try {
            // Check for test files
            const testFiles = await this.findTestFiles(projectPath);
            testability.hasTests = testFiles.length > 0;

            // Detect test framework
            try {
                const packageJson = JSON.parse(await fs.readFile(path.join(projectPath, 'package.json'), 'utf8'));
                const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
                
                if (deps.jest) testability.testFramework = 'jest';
                else if (deps.mocha) testability.testFramework = 'mocha';
                else if (deps.vitest) testability.testFramework = 'vitest';
                else if (deps.cypress) testability.testFramework = 'cypress';
            } catch {
                // No package.json
            }

            // Analyze test coverage (simplified)
            const codeFiles = await this.getCodeFiles(projectPath);
            const testableFiles = codeFiles.filter(file => 
                !file.includes('node_modules') && 
                !file.includes('test') && 
                !file.includes('spec')
            );

            testability.testCoverage = testableFiles.length > 0 ? 
                Math.round((testFiles.length / testableFiles.length) * 100) : 0;

        } catch (error) {
            // Ignore errors
        }

        return testability;
    }

    /**
     * Run ESLint analysis
     * @param {string} projectPath - Project directory path
     * @returns {Promise<Array>} ESLint issues
     */
    async runESLintAnalysis(projectPath) {
        const issues = [];

        try {
            // Check if ESLint is available
            const packageJsonPath = path.join(projectPath, 'package.json');
            const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
            const hasESLint = !!(packageJson.dependencies?.eslint || packageJson.devDependencies?.eslint);

            if (hasESLint) {
                try {
                    // Run ESLint (simplified - in real implementation would use ESLint API)
                    const result = execSync('npx eslint . --format json', { 
                        cwd: projectPath,
                        encoding: 'utf8',
                        stdio: 'pipe'
                    });
                    
                    const eslintResults = JSON.parse(result);
                    for (const fileResult of eslintResults) {
                        for (const message of fileResult.messages) {
                            issues.push({
                                file: fileResult.filePath,
                                line: message.line,
                                column: message.column,
                                severity: message.severity,
                                message: message.message,
                                ruleId: message.ruleId
                            });
                        }
                    }
                } catch (error) {
                    // ESLint failed or no issues found
                }
            }
        } catch (error) {
            // No package.json or parsing error
        }

        return issues;
    }

    /**
     * Generate recommendations based on analysis
     * @param {Object} analysis - Complete analysis results
     * @returns {Promise<Array>} Recommendations
     */
    async generateRecommendations(analysis) {
        const recommendations = [];

        // Linting recommendations
        if (!analysis.configuration.linting.hasESLint) {
            recommendations.push({
                title: 'Add ESLint for code quality',
                description: 'ESLint helps maintain consistent code style and catch potential errors',
                priority: 'high',
                category: 'linting'
            });
        }

        if (!analysis.configuration.formatting.hasPrettier) {
            recommendations.push({
                title: 'Add Prettier for code formatting',
                description: 'Prettier ensures consistent code formatting across the project',
                priority: 'medium',
                category: 'formatting'
            });
        }

        // Complexity recommendations
        const highComplexityFiles = Object.entries(analysis.metrics.complexity.cyclomaticComplexity)
            .filter(([file, complexity]) => complexity > 10)
            .map(([file]) => file);

        if (highComplexityFiles.length > 0) {
            recommendations.push({
                title: 'Reduce code complexity',
                description: `High cyclomatic complexity detected in: ${highComplexityFiles.join(', ')}`,
                priority: 'high',
                category: 'complexity'
            });
        }

        // Maintainability recommendations
        if (analysis.metrics.maintainability.largeFiles.length > 0) {
            recommendations.push({
                title: 'Split large files',
                description: `${analysis.metrics.maintainability.largeFiles.length} files are too large and should be split`,
                priority: 'medium',
                category: 'maintainability'
            });
        }

        // Testability recommendations
        if (!analysis.metrics.testability.hasTests) {
            recommendations.push({
                title: 'Add unit tests',
                description: 'No test files found. Add unit tests to improve code reliability',
                priority: 'high',
                category: 'testing'
            });
        }

        return recommendations;
    }

    /**
     * Calculate overall quality score
     * @param {Object} analysis - Complete analysis results
     * @returns {number} Overall score (0-100)
     */
    calculateOverallScore(analysis) {
        let score = 100;

        // Deduct points for missing tools
        if (!analysis.configuration.linting.hasESLint) score -= 15;
        if (!analysis.configuration.formatting.hasPrettier) score -= 10;

        // Deduct points for issues
        score -= analysis.issues.length * 2;

        // Deduct points for complexity
        const avgComplexity = Object.values(analysis.metrics.complexity.cyclomaticComplexity)
            .reduce((sum, val) => sum + val, 0) / 
            Math.max(Object.keys(analysis.metrics.complexity.cyclomaticComplexity).length, 1);
        
        if (avgComplexity > 10) score -= 20;
        else if (avgComplexity > 5) score -= 10;

        // Deduct points for maintainability issues
        score -= analysis.metrics.maintainability.largeFiles.length * 5;
        score -= analysis.metrics.maintainability.magicNumbers * 1;

        // Deduct points for missing tests
        if (!analysis.metrics.testability.hasTests) score -= 25;

        return Math.max(0, Math.min(100, score));
    }

    /**
     * Get code files in project
     * @param {string} projectPath - Project directory path
     * @returns {Promise<Array>} Array of code file paths
     */
    async getCodeFiles(projectPath) {
        const files = [];
        
        try {
            const getFiles = async (dir) => {
                const items = await fs.readdir(dir);
                for (const item of items) {
                    const itemPath = path.join(dir, item);
                    const stats = await fs.stat(itemPath);
                    
                    if (stats.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
                        await getFiles(itemPath);
                    } else if (stats.isFile()) {
                        const ext = path.extname(item);
                        if (['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cs'].includes(ext)) {
                            files.push(itemPath);
                        }
                    }
                }
            };
            
            await getFiles(projectPath);
        } catch (error) {
            // Ignore errors
        }

        return files;
    }

    /**
     * Find test files in project
     * @param {string} projectPath - Project directory path
     * @returns {Promise<Array>} Array of test file paths
     */
    async findTestFiles(projectPath) {
        const testFiles = [];
        
        try {
            const getFiles = async (dir) => {
                const items = await fs.readdir(dir);
                for (const item of items) {
                    const itemPath = path.join(dir, item);
                    const stats = await fs.stat(itemPath);
                    
                    if (stats.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
                        await getFiles(itemPath);
                    } else if (stats.isFile()) {
                        if (item.includes('.test.') || item.includes('.spec.') || item.includes('test/')) {
                            testFiles.push(itemPath);
                        }
                    }
                }
            };
            
            await getFiles(projectPath);
        } catch (error) {
            // Ignore errors
        }

        return testFiles;
    }
}

module.exports = CodeQualityAnalyzer; 