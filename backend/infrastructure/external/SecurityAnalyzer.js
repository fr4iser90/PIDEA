/**
 * SecurityAnalyzer - Comprehensive security analysis
 */
const path = require('path');
const fs = require('fs').promises;
const { execSync } = require('child_process');

class SecurityAnalyzer {
    constructor() {
        this.securityRules = {
            nodejs: {
                critical: ['sql-injection', 'xss', 'command-injection', 'path-traversal'],
                high: ['authentication-bypass', 'authorization-bypass', 'sensitive-data-exposure'],
                medium: ['weak-crypto', 'insecure-communication', 'missing-security-headers'],
                low: ['information-disclosure', 'weak-randomness']
            }
        };
    }

    /**
     * Analyze security for a project
     * @param {string} projectPath - Project directory path
     * @param {Object} options - Analysis options
     * @returns {Promise<Object>} Security analysis results
     */
    async analyzeSecurity(projectPath, options = {}) {
        try {
            const analysis = {
                projectPath,
                timestamp: new Date(),
                overallRiskLevel: 'low',
                vulnerabilities: [],
                securityScore: 100,
                configuration: {},
                dependencies: {},
                codeIssues: [],
                recommendations: []
            };

            // Analyze dependency vulnerabilities
            analysis.dependencies = await this.analyzeDependencyVulnerabilities(projectPath);
            
            // Analyze security configuration
            analysis.configuration = await this.analyzeSecurityConfiguration(projectPath);
            
            // Analyze code for security issues
            analysis.codeIssues = await this.analyzeCodeSecurity(projectPath);
            
            // Analyze secrets and sensitive data
            analysis.secrets = await this.analyzeSecrets(projectPath);
            
            // Generate recommendations
            analysis.recommendations = await this.generateSecurityRecommendations(analysis);
            
            // Calculate overall risk level and score
            analysis.overallRiskLevel = this.calculateRiskLevel(analysis);
            analysis.securityScore = this.calculateSecurityScore(analysis);

            return analysis;
        } catch (error) {
            throw new Error(`Security analysis failed: ${error.message}`);
        }
    }

    /**
     * Analyze dependency vulnerabilities
     * @param {string} projectPath - Project directory path
     * @returns {Promise<Object>} Dependency vulnerability analysis
     */
    async analyzeDependencyVulnerabilities(projectPath) {
        const vulnerabilities = {
            total: 0,
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
            outdated: [],
            vulnerable: []
        };

        try {
            // Check for package.json
            const packageJsonPath = path.join(projectPath, 'package.json');
            const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
            
            const allDeps = { 
                ...packageJson.dependencies, 
                ...packageJson.devDependencies 
            };

            // Check for known vulnerable packages
            const vulnerablePackages = [
                'lodash', 'moment', 'jquery', 'express', 'axios'
            ];

            for (const [pkg, version] of Object.entries(allDeps)) {
                // Check if package is in vulnerable list
                if (vulnerablePackages.includes(pkg)) {
                    vulnerabilities.vulnerable.push({
                        package: pkg,
                        version: version,
                        severity: 'medium',
                        description: `Known vulnerable package: ${pkg}`
                    });
                    vulnerabilities.medium++;
                }

                // Check for outdated packages (simplified)
                if (version.includes('^') || version.includes('~')) {
                    vulnerabilities.outdated.push({
                        package: pkg,
                        version: version,
                        recommendation: 'Update to latest version'
                    });
                }
            }

            vulnerabilities.total = vulnerabilities.critical + vulnerabilities.high + 
                                   vulnerabilities.medium + vulnerabilities.low;

        } catch (error) {
            // No package.json or parsing error
        }

        return vulnerabilities;
    }

    /**
     * Analyze security configuration
     * @param {string} projectPath - Project directory path
     * @returns {Promise<Object>} Security configuration analysis
     */
    async analyzeSecurityConfiguration(projectPath) {
        const config = {
            hasSecurityHeaders: false,
            hasCORS: false,
            hasRateLimiting: false,
            hasInputValidation: false,
            hasAuthentication: false,
            hasAuthorization: false,
            hasHTTPS: false,
            hasSecretsManagement: false,
            securityMiddleware: [],
            missingSecurity: []
        };

        try {
            const packageJson = JSON.parse(await fs.readFile(path.join(projectPath, 'package.json'), 'utf8'));
            const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };

            // Check for security middleware
            if (allDeps.helmet) {
                config.hasSecurityHeaders = true;
                config.securityMiddleware.push('helmet');
            } else {
                config.missingSecurity.push('helmet');
            }

            if (allDeps.cors) {
                config.hasCORS = true;
                config.securityMiddleware.push('cors');
            } else {
                config.missingSecurity.push('cors');
            }

            if (allDeps['express-rate-limit'] || allDeps['rate-limiter-flexible']) {
                config.hasRateLimiting = true;
                config.securityMiddleware.push('rate-limiting');
            } else {
                config.missingSecurity.push('rate-limiting');
            }

            if (allDeps.express || allDeps.koa) {
                // Check for input validation
                if (allDeps.joi || allDeps.yup || allDeps['express-validator']) {
                    config.hasInputValidation = true;
                    config.securityMiddleware.push('input-validation');
                } else {
                    config.missingSecurity.push('input-validation');
                }
            }

            // Check for authentication
            if (allDeps.passport || allDeps.jwt || allDeps['jsonwebtoken']) {
                config.hasAuthentication = true;
                config.securityMiddleware.push('authentication');
            } else {
                config.missingSecurity.push('authentication');
            }

            // Check for secrets management
            if (allDeps.dotenv || allDeps['node-config']) {
                config.hasSecretsManagement = true;
                config.securityMiddleware.push('secrets-management');
            } else {
                config.missingSecurity.push('secrets-management');
            }

        } catch (error) {
            // No package.json or parsing error
        }

        return config;
    }

    /**
     * Analyze code for security issues
     * @param {string} projectPath - Project directory path
     * @returns {Promise<Array>} Code security issues
     */
    async analyzeCodeSecurity(projectPath) {
        const issues = [];

        try {
            const files = await this.getCodeFiles(projectPath);
            
            for (const file of files) {
                const content = await fs.readFile(file, 'utf8');
                const fileIssues = this.analyzeFileSecurity(content, file);
                issues.push(...fileIssues);
            }

        } catch (error) {
            // Ignore errors
        }

        return issues;
    }

    /**
     * Analyze single file for security issues
     * @param {string} content - File content
     * @param {string} filePath - File path
     * @returns {Array} Security issues
     */
    analyzeFileSecurity(content, filePath) {
        const issues = [];
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineNumber = i + 1;

            // SQL Injection patterns
            if (line.includes('query(') && line.includes('${') && !line.includes('parameterized')) {
                issues.push({
                    file: filePath,
                    line: lineNumber,
                    severity: 'critical',
                    type: 'sql-injection',
                    description: 'Potential SQL injection detected',
                    code: line.trim()
                });
            }

            // XSS patterns
            if (line.includes('innerHTML') || line.includes('outerHTML')) {
                issues.push({
                    file: filePath,
                    line: lineNumber,
                    severity: 'high',
                    type: 'xss',
                    description: 'Potential XSS vulnerability',
                    code: line.trim()
                });
            }

            // Command injection patterns
            if (line.includes('exec(') || line.includes('spawn(') || line.includes('execSync(')) {
                if (line.includes('${') || line.includes('+')) {
                    issues.push({
                        file: filePath,
                        line: lineNumber,
                        severity: 'critical',
                        type: 'command-injection',
                        description: 'Potential command injection',
                        code: line.trim()
                    });
                }
            }

            // Path traversal patterns
            if (line.includes('fs.readFile') || line.includes('fs.writeFile')) {
                if (line.includes('req.params') || line.includes('req.query')) {
                    issues.push({
                        file: filePath,
                        line: lineNumber,
                        severity: 'high',
                        type: 'path-traversal',
                        description: 'Potential path traversal vulnerability',
                        code: line.trim()
                    });
                }
            }

            // Hardcoded secrets
            if (line.includes('password') || line.includes('secret') || line.includes('key')) {
                if (line.includes('"') && line.includes('=')) {
                    issues.push({
                        file: filePath,
                        line: lineNumber,
                        severity: 'high',
                        type: 'hardcoded-secret',
                        description: 'Hardcoded secret detected',
                        code: line.trim()
                    });
                }
            }

            // Weak crypto
            if (line.includes('crypto.createHash') && line.includes('md5')) {
                issues.push({
                    file: filePath,
                    line: lineNumber,
                    severity: 'medium',
                    type: 'weak-crypto',
                    description: 'Weak cryptographic algorithm (MD5)',
                    code: line.trim()
                });
            }

            // Insecure random
            if (line.includes('Math.random()')) {
                issues.push({
                    file: filePath,
                    line: lineNumber,
                    severity: 'medium',
                    type: 'weak-randomness',
                    description: 'Insecure random number generation',
                    code: line.trim()
                });
            }
        }

        return issues;
    }

    /**
     * Analyze for secrets and sensitive data
     * @param {string} projectPath - Project directory path
     * @returns {Promise<Object>} Secrets analysis
     */
    async analyzeSecrets(projectPath) {
        const secrets = {
            found: [],
            patterns: [],
            riskLevel: 'low'
        };

        try {
            const files = await this.getCodeFiles(projectPath);
            
            for (const file of files) {
                const content = await fs.readFile(file, 'utf8');
                const fileSecrets = this.findSecrets(content, file);
                secrets.found.push(...fileSecrets);
            }

            // Check for common secret patterns
            const secretPatterns = [
                /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/gi,
                /password\s*[:=]\s*['"][^'"]+['"]/gi,
                /secret\s*[:=]\s*['"][^'"]+['"]/gi,
                /token\s*[:=]\s*['"][^'"]+['"]/gi,
                /private[_-]?key\s*[:=]\s*['"][^'"]+['"]/gi
            ];

            for (const pattern of secretPatterns) {
                const matches = content.match(pattern);
                if (matches) {
                    secrets.patterns.push({
                        pattern: pattern.source,
                        count: matches.length
                    });
                }
            }

            secrets.riskLevel = secrets.found.length > 0 ? 'high' : 'low';

        } catch (error) {
            // Ignore errors
        }

        return secrets;
    }

    /**
     * Find secrets in file content
     * @param {string} content - File content
     * @param {string} filePath - File path
     * @returns {Array} Found secrets
     */
    findSecrets(content, filePath) {
        const secrets = [];
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineNumber = i + 1;

            // Check for API keys
            if (line.includes('api_key') || line.includes('apiKey') || line.includes('API_KEY')) {
                if (line.includes('"') || line.includes("'")) {
                    secrets.push({
                        file: filePath,
                        line: lineNumber,
                        type: 'api-key',
                        description: 'API key found in code',
                        severity: 'high'
                    });
                }
            }

            // Check for passwords
            if (line.includes('password') || line.includes('Password')) {
                if (line.includes('"') || line.includes("'")) {
                    secrets.push({
                        file: filePath,
                        line: lineNumber,
                        type: 'password',
                        description: 'Password found in code',
                        severity: 'critical'
                    });
                }
            }

            // Check for tokens
            if (line.includes('token') || line.includes('Token')) {
                if (line.includes('"') || line.includes("'")) {
                    secrets.push({
                        file: filePath,
                        line: lineNumber,
                        type: 'token',
                        description: 'Token found in code',
                        severity: 'high'
                    });
                }
            }
        }

        return secrets;
    }

    /**
     * Generate security recommendations
     * @param {Object} analysis - Complete security analysis
     * @returns {Promise<Array>} Security recommendations
     */
    async generateSecurityRecommendations(analysis) {
        const recommendations = [];

        // Dependency recommendations
        if (analysis.dependencies.vulnerable.length > 0) {
            recommendations.push({
                title: 'Update vulnerable dependencies',
                description: `${analysis.dependencies.vulnerable.length} vulnerable packages found`,
                priority: 'high',
                category: 'dependencies'
            });
        }

        // Configuration recommendations
        if (analysis.configuration.missingSecurity.length > 0) {
            recommendations.push({
                title: 'Add security middleware',
                description: `Missing: ${analysis.configuration.missingSecurity.join(', ')}`,
                priority: 'high',
                category: 'configuration'
            });
        }

        // Code recommendations
        const criticalIssues = analysis.codeIssues.filter(issue => issue.severity === 'critical');
        if (criticalIssues.length > 0) {
            recommendations.push({
                title: 'Fix critical security issues',
                description: `${criticalIssues.length} critical security issues found in code`,
                priority: 'critical',
                category: 'code'
            });
        }

        // Secrets recommendations
        if (analysis.secrets.found.length > 0) {
            recommendations.push({
                title: 'Remove hardcoded secrets',
                description: `${analysis.secrets.found.length} secrets found in code`,
                priority: 'critical',
                category: 'secrets'
            });
        }

        // General security recommendations
        if (!analysis.configuration.hasHTTPS) {
            recommendations.push({
                title: 'Enable HTTPS',
                description: 'Use HTTPS for all communications',
                priority: 'high',
                category: 'configuration'
            });
        }

        return recommendations;
    }

    /**
     * Calculate overall risk level
     * @param {Object} analysis - Complete security analysis
     * @returns {string} Risk level
     */
    calculateRiskLevel(analysis) {
        let riskScore = 0;

        // Add points for vulnerabilities
        riskScore += analysis.dependencies.critical * 10;
        riskScore += analysis.dependencies.high * 5;
        riskScore += analysis.dependencies.medium * 2;

        // Add points for code issues
        const criticalIssues = analysis.codeIssues.filter(issue => issue.severity === 'critical').length;
        const highIssues = analysis.codeIssues.filter(issue => issue.severity === 'high').length;
        
        riskScore += criticalIssues * 10;
        riskScore += highIssues * 5;

        // Add points for secrets
        riskScore += analysis.secrets.found.length * 5;

        // Add points for missing security
        riskScore += analysis.configuration.missingSecurity.length * 2;

        if (riskScore >= 50) return 'critical';
        if (riskScore >= 30) return 'high';
        if (riskScore >= 15) return 'medium';
        return 'low';
    }

    /**
     * Calculate security score
     * @param {Object} analysis - Complete security analysis
     * @returns {number} Security score (0-100)
     */
    calculateSecurityScore(analysis) {
        let score = 100;

        // Deduct points for vulnerabilities
        score -= analysis.dependencies.critical * 15;
        score -= analysis.dependencies.high * 10;
        score -= analysis.dependencies.medium * 5;

        // Deduct points for code issues
        const criticalIssues = analysis.codeIssues.filter(issue => issue.severity === 'critical').length;
        const highIssues = analysis.codeIssues.filter(issue => issue.severity === 'high').length;
        const mediumIssues = analysis.codeIssues.filter(issue => issue.severity === 'medium').length;
        
        score -= criticalIssues * 15;
        score -= highIssues * 10;
        score -= mediumIssues * 5;

        // Deduct points for secrets
        score -= analysis.secrets.found.length * 10;

        // Deduct points for missing security
        score -= analysis.configuration.missingSecurity.length * 5;

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
                        if (['.js', '.jsx', '.ts', '.tsx'].includes(ext)) {
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
}

module.exports = SecurityAnalyzer; 