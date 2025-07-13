
/**
 * CodeQualityAnalyzer - Comprehensive code quality analysis
 */
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const { execSync } = require('child_process');
const { logger } = require('@infrastructure/logging/Logger');

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

            // Get all code files
            const codeFiles = await this.getCodeFiles(projectPath);
            analysis.codeFiles = codeFiles; // Store for real metrics calculation
            
            if (codeFiles.length === 0) {
                analysis.overallScore = 0;
                analysis.recommendations.push({
                    title: 'No code files found',
                    description: 'No JavaScript/TypeScript files found in the project',
                    priority: 'high',
                    category: 'structure'
                });
                return analysis;
            }

            // Analyze linting configuration
            analysis.configuration.linting = await this.analyzeLintingConfig(projectPath);
            
            // Analyze formatting configuration
            analysis.configuration.formatting = await this.analyzeFormattingConfig(projectPath);
            
            // Analyze code complexity
            analysis.metrics.complexity = await this.analyzeComplexity(projectPath, codeFiles);
            
            // Analyze maintainability
            analysis.metrics.maintainability = await this.analyzeMaintainability(projectPath, codeFiles);
            
            // Analyze readability
            analysis.metrics.readability = await this.analyzeReadability(projectPath, codeFiles);
            
            // Analyze testability
            analysis.metrics.testability = await this.analyzeTestability(projectPath, codeFiles);
            
            // Run ESLint analysis
            analysis.issues = await this.runESLintAnalysis(projectPath);
            
            // Find code smells and issues
            const codeSmells = await this.findCodeSmells(projectPath, codeFiles);
            analysis.issues.push(...codeSmells);
            
            // Calculate real metrics based on actual analysis
            const realMetrics = await this.calculateRealMetrics(analysis, codeFiles);
            
            logger.debug('DEBUG: Real metrics calculated:', JSON.stringify(realMetrics, null, 2));
            
            // Add real metrics to existing metrics without overwriting
            analysis.metrics.realMetrics = realMetrics;
            
            // Also add realMetrics at the top level for easier access
            analysis.realMetrics = realMetrics;
            
            // Calculate overall score
            analysis.overallScore = realMetrics.overallQualityScore;
            
            logger.log('DEBUG: Analysis with real metrics:', JSON.stringify({
                realMetrics: analysis.realMetrics,
                overallScore: analysis.overallScore,
                metricsRealMetrics: analysis.metrics.realMetrics
            }, null, 2));
            
            // Generate recommendations
            analysis.recommendations = await this.generateRecommendations(analysis);

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
                    await fsPromises.access(path.join(projectPath, configFile));
                    config.hasESLint = true;
                    
                    // Parse ESLint config
                    const configContent = await fsPromises.readFile(path.join(projectPath, configFile), 'utf8');
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
                    await fsPromises.access(path.join(projectPath, configFile));
                    config.hasPrettier = true;
                    break;
                } catch {
                    // Config file not found, continue
                }
            }

            // Check for Husky and lint-staged
            try {
                const packageJson = JSON.parse(await fsPromises.readFile(path.join(projectPath, 'package.json'), 'utf8'));
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
                    await fsPromises.access(path.join(projectPath, configFile));
                    config.hasPrettier = true;
                    
                    const configContent = await fsPromises.readFile(path.join(projectPath, configFile), 'utf8');
                    config.formattingRules = JSON.parse(configContent);
                    break;
                } catch {
                    // Config file not found, continue
                }
            }

            // Check for EditorConfig
            try {
                await fsPromises.access(path.join(projectPath, '.editorconfig'));
                config.hasEditorConfig = true;
            } catch {
                // No .editorconfig
            }

            // Check for VSCode settings
            try {
                await fsPromises.access(path.join(projectPath, '.vscode/settings.json'));
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
     * @param {Array} codeFiles - Array of code file paths
     * @returns {Promise<Object>} Complexity analysis
     */
    async analyzeComplexity(projectPath, codeFiles) {
        const complexity = {
            cyclomaticComplexity: {},
            cognitiveComplexity: {},
            nestingDepth: {},
            functionLength: {},
            classComplexity: {}
        };
        for (const file of codeFiles) {
            const content = await fsPromises.readFile(file, 'utf8');
            // Cyclomatic: count if/for/while/case/catch/&&/||
            const cyclomatic = (content.match(/\b(if|for|while|case|catch)\b|&&|\|\|/g) || []).length + 1;
            // Cognitive: count nested blocks
            const cognitive = (content.match(/\{/g) || []).length;
            // Nesting: max depth
            let maxNesting = 0, nesting = 0;
            for (const line of content.split('\n')) {
                nesting += (line.match(/\{/g) || []).length;
                nesting -= (line.match(/\}/g) || []).length;
                if (nesting > maxNesting) maxNesting = nesting;
            }
            // Function length: lines per function
            const functions = content.match(/function\s+\w+|\w+\s*=\s*\([^)]*\)\s*=>/g) || [];
            const functionLength = functions.length > 0 ? content.split('\n').length / functions.length : 0;
            // Class complexity: number of classes
            const classComplexity = (content.match(/class\s+\w+/g) || []).length;
            complexity.cyclomaticComplexity[file] = cyclomatic;
            complexity.cognitiveComplexity[file] = cognitive;
            complexity.nestingDepth[file] = maxNesting;
            complexity.functionLength[file] = Math.round(functionLength);
            complexity.classComplexity[file] = classComplexity;
        }
        return complexity;
    }

    /**
     * Analyze maintainability
     * @param {string} projectPath - Project directory path
     * @param {Array} codeFiles - Array of code file paths
     * @returns {Promise<Object>} Maintainability analysis
     */
    async analyzeMaintainability(projectPath, codeFiles) {
        const maintainability = {
            codeDuplication: 0,
            largeFiles: [],
            longFunctions: [],
            magicNumbers: 0,
            hardcodedStrings: 0,
            maintainabilityIndex: 100
        };
        for (const file of codeFiles) {
            const content = await fsPromises.readFile(file, 'utf8');
            const stats = await fsPromises.stat(file);
            if (stats.size > 50000) {
                maintainability.largeFiles.push({ file, size: stats.size });
            }
            // Magic numbers
            maintainability.magicNumbers += (content.match(/\b\d{3,}\b/g) || []).length;
            // Hardcoded strings (URLs)
            maintainability.hardcodedStrings += (content.match(/['"]https?:\/\//g) || []).length;
            // Long functions
            const functions = content.split(/function\s+\w+|\w+\s*=\s*\([^)]*\)\s*=>/);
            for (const fn of functions) {
                if (fn.split('\n').length > 80) maintainability.longFunctions.push({ file, length: fn.split('\n').length });
            }
        }
        // Maintainability Index (simple)
        const totalIssues = maintainability.largeFiles.length + maintainability.magicNumbers + maintainability.hardcodedStrings + maintainability.longFunctions.length;
        maintainability.maintainabilityIndex = Math.max(0, 100 - totalIssues * 2);
        return maintainability;
    }

    /**
     * Analyze readability
     * @param {string} projectPath - Project directory path
     * @param {Array} codeFiles - Array of code file paths
     * @returns {Promise<Object>} Readability analysis
     */
    async analyzeReadability(projectPath, codeFiles) {
        const readability = {
            averageLineLength: 0,
            longLines: 0,
            commentRatio: 0
        };
        let totalLines = 0, totalLength = 0, longLines = 0, commentLines = 0;
        for (const file of codeFiles) {
            const content = await fsPromises.readFile(file, 'utf8');
            for (const line of content.split('\n')) {
                totalLines++;
                totalLength += line.length;
                if (line.length > 120) longLines++;
                if (line.trim().startsWith('//') || line.trim().startsWith('/*')) commentLines++;
            }
        }
        readability.averageLineLength = totalLines > 0 ? Math.round(totalLength / totalLines) : 0;
        readability.longLines = longLines;
        readability.commentRatio = totalLines > 0 ? Math.round((commentLines / totalLines) * 100) : 0;
        return readability;
    }

    /**
     * Analyze testability
     * @param {string} projectPath - Project directory path
     * @param {Array} codeFiles - Array of code file paths
     * @returns {Promise<Object>} Testability analysis
     */
    async analyzeTestability(projectPath, codeFiles) {
        const testability = {
            hasTests: false,
            testCoverage: 0,
            testableFunctions: 0,
            untestableFunctions: 0,
            mockDependencies: 0,
            testFramework: null
        };
        const testFiles = await this.findTestFiles(projectPath);
        testability.hasTests = testFiles.length > 0;
        // Test framework detection
        try {
            const packageJson = JSON.parse(await fsPromises.readFile(path.join(projectPath, 'package.json'), 'utf8'));
            const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
            if (deps.jest) testability.testFramework = 'jest';
            else if (deps.mocha) testability.testFramework = 'mocha';
            else if (deps.vitest) testability.testFramework = 'vitest';
            else if (deps.cypress) testability.testFramework = 'cypress';
        } catch {}
        // Coverage (simple): ratio test files / code files
        testability.testCoverage = codeFiles.length > 0 ? Math.round((testFiles.length / codeFiles.length) * 100) : 0;
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
            const packageJson = JSON.parse(await fsPromises.readFile(packageJsonPath, 'utf8'));
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
     * Find test files in project
     * @param {string} projectPath - Project directory path
     * @returns {Promise<Array>} Array of test file paths
     */
    async findTestFiles(projectPath) {
        const testFiles = [];
        
        try {
            const getFiles = async (dir) => {
                const items = await fsPromises.readdir(dir);
                for (const item of items) {
                    const itemPath = path.join(dir, item);
                    const stats = await fsPromises.stat(itemPath);
                    
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

    /**
     * Find code smells and issues
     * @param {string} projectPath - Project directory path
     * @param {Array} codeFiles - Array of code file paths
     * @returns {Promise<Array>} Array of code smell objects
     */
    async findCodeSmells(projectPath, codeFiles) {
        const smells = [];
        for (const file of codeFiles) {
            const content = await fsPromises.readFile(file, 'utf8');
            // Long function
            const functions = content.split(/function\s+\w+|\w+\s*=\s*\([^)]*\)\s*=>/);
            for (const fn of functions) {
                if (fn.split('\n').length > 80) smells.push({ file, type: 'long-function', message: 'Function too long' });
            }
            // Deep nesting
            let maxNesting = 0, nesting = 0;
            for (const line of content.split('\n')) {
                nesting += (line.match(/\{/g) || []).length;
                nesting -= (line.match(/\}/g) || []).length;
                if (nesting > maxNesting) maxNesting = nesting;
            }
            if (maxNesting > 5) smells.push({ file, type: 'deep-nesting', message: 'Deep nesting detected' });
            // Magic numbers
            if ((content.match(/\b\d{3,}\b/g) || []).length > 10) smells.push({ file, type: 'magic-numbers', message: 'Many magic numbers' });
            // Hardcoded URLs
            if ((content.match(/['"]https?:\/\//g) || []).length > 0) smells.push({ file, type: 'hardcoded-url', message: 'Hardcoded URL found' });
            // Console.log
            if (content.includes('logger.log')) smells.push({ file, type: 'console-log', message: 'console.log found' });
        }
        return smells;
    }

    /**
     * Generate recommendations based on analysis
     * @param {Object} analysis - Complete analysis results
     * @returns {Promise<Array>} Recommendations
     */
    async generateRecommendations(analysis) {
        const recs = [];
        if (!analysis.configuration.linting.hasESLint) recs.push({ title: 'Add ESLint', description: 'ESLint helps maintain code quality', priority: 'high', category: 'linting' });
        if (!analysis.configuration.formatting.hasPrettier) recs.push({ title: 'Add Prettier', description: 'Prettier ensures consistent formatting', priority: 'medium', category: 'formatting' });
        if (analysis.metrics.complexity && Object.values(analysis.metrics.complexity.cyclomaticComplexity).some(v => v > 10)) recs.push({ title: 'Reduce complexity', description: 'Some files have high cyclomatic complexity', priority: 'high', category: 'complexity' });
        if (analysis.metrics.maintainability && analysis.metrics.maintainability.largeFiles.length > 0) recs.push({ title: 'Split large files', description: 'Some files are too large', priority: 'medium', category: 'maintainability' });
        if (analysis.metrics.testability && !analysis.metrics.testability.hasTests) recs.push({ title: 'Add tests', description: 'No test files found', priority: 'high', category: 'testing' });
        if (analysis.issues && analysis.issues.some(i => i.type === 'console-log')) recs.push({ title: 'Remove logger.log', description: 'console.log found in code', priority: 'low', category: 'smell' });
        return recs;
    }

    /**
     * Calculate real metrics based on actual analysis
     * @param {Object} analysis - Complete analysis results
     * @param {Array} codeFiles - Array of code file paths
     * @returns {Promise<Object>} Real metrics
     */
    async calculateRealMetrics(analysis, codeFiles) {
        let score = 100;

        // Analyze actual code files for real metrics
        const filesToAnalyze = codeFiles || analysis.codeFiles || [];
        let totalLines = 0;
        let totalFunctions = 0;
        let totalClasses = 0;
        let lintingIssues = 0;
        let complexityIssues = 0;
        let maintainabilityIssues = 0;
        let testFiles = 0;
        
        // Collect specific issues for detailed reporting
        const largeFiles = [];
        const magicNumberFiles = [];
        const complexityIssuesList = [];
        const lintingIssuesList = [];

        for (const file of filesToAnalyze) {
            try {
                const content = await fsPromises.readFile(file, 'utf8');
                const lines = content.split('\n');
                totalLines += lines.length;

                // Count functions
                const functionMatches = content.match(/function\s+\w+|const\s+\w+\s*=\s*\(|=>\s*\{/g) || [];
                totalFunctions += functionMatches.length;

                // Count classes
                const classMatches = content.match(/class\s+\w+/g) || [];
                totalClasses += classMatches.length;

                // Count linting issues with line details
                const contentLines = content.split('\n');
                contentLines.forEach((line, lineNumber) => {
                    if (line.includes('logger.log')) {
                        lintingIssues++;
                        lintingIssuesList.push({ 
                            file, 
                            line: lineNumber + 1,
                            issue: 'logger.log found',
                            code: line.trim()
                        });
                    }
                    if (line.includes('var ')) {
                        lintingIssues++;
                        lintingIssuesList.push({ 
                            file, 
                            line: lineNumber + 1,
                            issue: 'var declaration found',
                            code: line.trim()
                        });
                    }
                    if (line.includes('==') && !line.includes('===')) {
                        lintingIssues++;
                        lintingIssuesList.push({ 
                            file, 
                            line: lineNumber + 1,
                            issue: '== instead of === found',
                            code: line.trim()
                        });
                    }
                });

                // Count complexity issues
                const nestedLevels = content.match(/\{/g)?.length || 0;
                if (nestedLevels > 10) {
                    complexityIssues++;
                    complexityIssuesList.push({ file, issue: `High nesting: ${nestedLevels} levels` });
                }

                // Count maintainability issues - based on real requirements
                if (lines.length > 500) {
                    maintainabilityIssues++;
                    largeFiles.push({ file, lines: lines.length });
                }
                if (content.match(/\b\d{3,}\b/g)?.length > 20) {
                    maintainabilityIssues++;
                    magicNumberFiles.push({ file, magicNumbers: content.match(/\b\d{3,}\b/g)?.length || 0 });
                }

                // Count test files
                if (file.includes('.test.') || file.includes('.spec.')) testFiles++;
            } catch (error) {
                logger.error(`Error reading file ${file}:`, error);
            }
        }

        // Calculate score based on real metrics - use more reasonable penalties
        if (lintingIssues > 0) score -= Math.min(30, lintingIssues * 0.5); // Cap at 30 points, 0.5 per issue
        if (complexityIssues > 0) score -= Math.min(25, complexityIssues * 2); // Cap at 25 points, 2 per issue
        if (maintainabilityIssues > 0) score -= Math.min(20, maintainabilityIssues * 1); // Cap at 20 points, 1 per issue
        if (testFiles === 0) score -= 15; // No tests penalty

        const finalScore = Math.max(0, Math.min(100, score));
        
        // Calculate real metrics and update analysis - use more reasonable formula
        const maintainabilityIndex = Math.max(0, Math.min(100, 100 - maintainabilityIssues * 0.5));
        
        return {
            lintingIssues,
            averageComplexity: complexityIssues,
            maintainabilityIndex,
            testCoverage: testFiles > 0 ? Math.min(100, (testFiles / Math.max(filesToAnalyze.length, 1)) * 100) : 0,
            codeDuplicationPercentage: 0, // Would need more complex analysis
            codeStyleIssues: lintingIssues,
            documentationCoverage: 0, // Would need comment analysis
            performanceIssues: 0, // Would need performance analysis
            overallQualityScore: finalScore,
            // Detailed issues for reporting
            largeFiles,
            magicNumberFiles,
            complexityIssuesList,
            lintingIssuesList
        };
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
                const items = await fsPromises.readdir(dir);
                for (const item of items) {
                    const itemPath = path.join(dir, item);
                    const stats = await fsPromises.stat(itemPath);
                    
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
            logger.error('Error reading code files:', error);
        }

        return files;
    }

    /**
     * Analyze code quality for a project (alias for analyzeCodeQuality)
     * @param {string} projectPath - Project directory path
     * @param {Object} options - Analysis options
     * @returns {Promise<Object>} Code quality analysis results
     */
    async analyze(projectPath, options = {}) {
        return this.analyzeCodeQuality(projectPath, options);
    }
}

module.exports = CodeQualityAnalyzer; 