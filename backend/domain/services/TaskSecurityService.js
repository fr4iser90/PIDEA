const { Task, TaskExecution } = require('@/domain/entities');
const { TaskStatus, TaskType } = require('@/domain/value-objects');
const { TaskRepository, TaskExecutionRepository } = require('@/domain/repositories');

/**
 * TaskSecurityService - Provides security scanning and fixes
 * Performs security analysis, vulnerability detection, and automated fixes
 */
class TaskSecurityService {
    constructor(
        taskRepository,
        taskExecutionRepository,
        cursorIDEService,
        eventBus,
        fileSystemService
    ) {
        this.taskRepository = taskRepository;
        this.taskExecutionRepository = taskExecutionRepository;
        this.cursorIDEService = cursorIDEService;
        this.eventBus = eventBus;
        this.fileSystemService = fileSystemService;
    }

    /**
     * Perform security scan on task
     * @param {Object} params - Security scan parameters
     * @param {string} params.taskId - Task ID to scan
     * @param {string} params.scanType - Type of security scan
     * @param {Object} params.options - Scan options
     * @returns {Promise<Object>} Security scan result
     */
    async performSecurityScan(params) {
        const { taskId, scanType = 'comprehensive', options = {} } = params;

        try {
            // Validate inputs
            if (!taskId) {
                throw new Error('Task ID is required');
            }

            // Get task
            const task = await this.taskRepository.findById(taskId);
            if (!task) {
                throw new Error(`Task not found: ${taskId}`);
            }

            // Perform security scan based on type
            let scanResult;
            
            switch (scanType) {
                case 'comprehensive':
                    scanResult = await this.performComprehensiveScan(task, options);
                    break;
                case 'vulnerability':
                    scanResult = await this.performVulnerabilityScan(task, options);
                    break;
                case 'code':
                    scanResult = await this.performCodeSecurityScan(task, options);
                    break;
                case 'dependency':
                    scanResult = await this.performDependencyScan(task, options);
                    break;
                case 'configuration':
                    scanResult = await this.performConfigurationScan(task, options);
                    break;
                default:
                    scanResult = await this.performCustomScan(task, scanType, options);
                    break;
            }

            // Apply fixes if auto-fix is enabled
            if (options.autoFix && scanResult.vulnerabilities.length > 0) {
                await this.applySecurityFixes(task, scanResult.vulnerabilities);
            }

            // Emit security scan event
            this.eventBus.emit('task:security:scanned', {
                taskId,
                scanType,
                result: scanResult,
                autoFixed: options.autoFix || false
            });

            return scanResult;

        } catch (error) {
            this.eventBus.emit('task:security:error', {
                error: error.message,
                taskId,
                scanType,
                options
            });
            throw error;
        }
    }

    /**
     * Perform comprehensive security scan
     * @param {Task} task - Task object
     * @param {Object} options - Scan options
     * @returns {Promise<Object>} Comprehensive scan result
     */
    async performComprehensiveScan(task, options) {
        const results = {
            vulnerabilities: [],
            securityScore: 100,
            recommendations: [],
            scanTimestamp: new Date().toISOString(),
            scanType: 'comprehensive'
        };

        // Perform all types of scans
        const [vulnResult, codeResult, depResult, configResult] = await Promise.all([
            this.performVulnerabilityScan(task, options),
            this.performCodeSecurityScan(task, options),
            this.performDependencyScan(task, options),
            this.performConfigurationScan(task, options)
        ]);

        // Combine results
        results.vulnerabilities = [
            ...vulnResult.vulnerabilities,
            ...codeResult.vulnerabilities,
            ...depResult.vulnerabilities,
            ...configResult.vulnerabilities
        ];

        results.recommendations = [
            ...vulnResult.recommendations,
            ...codeResult.recommendations,
            ...depResult.recommendations,
            ...configResult.recommendations
        ];

        // Calculate overall security score
        results.securityScore = this.calculateSecurityScore(results.vulnerabilities);

        return results;
    }

    /**
     * Perform vulnerability scan
     * @param {Task} task - Task object
     * @param {Object} options - Scan options
     * @returns {Promise<Object>} Vulnerability scan result
     */
    async performVulnerabilityScan(task, options) {
        const vulnerabilities = [];
        const recommendations = [];

        // Analyze task metadata for potential vulnerabilities
        if (task.metadata && task.metadata.executionContext) {
            const context = task.metadata.executionContext;
            
            // Check for command injection vulnerabilities
            if (context.command && this.containsUnsafeCommands(context.command)) {
                vulnerabilities.push({
                    type: 'command_injection',
                    severity: 'high',
                    description: 'Potential command injection vulnerability detected',
                    location: 'task.executionContext.command',
                    recommendation: 'Use parameterized commands and input validation'
                });
            }

            // Check for file path vulnerabilities
            if (context.filePath && this.containsPathTraversal(context.filePath)) {
                vulnerabilities.push({
                    type: 'path_traversal',
                    severity: 'high',
                    description: 'Potential path traversal vulnerability detected',
                    location: 'task.executionContext.filePath',
                    recommendation: 'Validate and sanitize file paths'
                });
            }
        }

        // Check for sensitive data exposure
        if (task.metadata && this.containsSensitiveData(task.metadata)) {
            vulnerabilities.push({
                type: 'sensitive_data_exposure',
                severity: 'medium',
                description: 'Sensitive data found in task metadata',
                location: 'task.metadata',
                recommendation: 'Remove sensitive data or encrypt it'
            });
        }

        // Generate AI-powered vulnerability analysis
        const aiVulnerabilities = await this.generateAIVulnerabilityAnalysis(task, options);
        vulnerabilities.push(...aiVulnerabilities);

        // Generate recommendations
        recommendations.push(...this.generateVulnerabilityRecommendations(vulnerabilities));

        return {
            vulnerabilities,
            recommendations,
            scanType: 'vulnerability'
        };
    }

    /**
     * Perform code security scan
     * @param {Task} task - Task object
     * @param {Object} options - Scan options
     * @returns {Promise<Object>} Code security scan result
     */
    async performCodeSecurityScan(task, options) {
        const vulnerabilities = [];
        const recommendations = [];

        // Analyze task-related code files
        if (task.projectPath) {
            const codeFiles = await this.findCodeFiles(task.projectPath, options.filePattern);
            
            for (const file of codeFiles) {
                const fileVulnerabilities = await this.scanCodeFile(file, options);
                vulnerabilities.push(...fileVulnerabilities);
            }
        }

        // Generate AI-powered code analysis
        const aiCodeVulnerabilities = await this.generateAICodeAnalysis(task, options);
        vulnerabilities.push(...aiCodeVulnerabilities);

        // Generate recommendations
        recommendations.push(...this.generateCodeSecurityRecommendations(vulnerabilities));

        return {
            vulnerabilities,
            recommendations,
            scanType: 'code'
        };
    }

    /**
     * Perform dependency scan
     * @param {Task} task - Task object
     * @param {Object} options - Scan options
     * @returns {Promise<Object>} Dependency scan result
     */
    async performDependencyScan(task, options) {
        const vulnerabilities = [];
        const recommendations = [];

        // Scan package.json for vulnerable dependencies
        if (task.projectPath) {
            const packageJsonPath = `${task.projectPath}/package.json`;
            
            if (await this.fileSystemService.exists(packageJsonPath)) {
                const packageJson = await this.fileSystemService.readFile(packageJsonPath, 'utf8');
                const dependencies = JSON.parse(packageJson);
                
                const depVulnerabilities = await this.scanDependencies(dependencies, options);
                vulnerabilities.push(...depVulnerabilities);
            }
        }

        // Generate AI-powered dependency analysis
        const aiDepVulnerabilities = await this.generateAIDependencyAnalysis(task, options);
        vulnerabilities.push(...aiDepVulnerabilities);

        // Generate recommendations
        recommendations.push(...this.generateDependencyRecommendations(vulnerabilities));

        return {
            vulnerabilities,
            recommendations,
            scanType: 'dependency'
        };
    }

    /**
     * Perform configuration scan
     * @param {Task} task - Task object
     * @param {Object} options - Scan options
     * @returns {Promise<Object>} Configuration scan result
     */
    async performConfigurationScan(task, options) {
        const vulnerabilities = [];
        const recommendations = [];

        // Scan configuration files
        if (task.projectPath) {
            const configFiles = await this.findConfigFiles(task.projectPath);
            
            for (const file of configFiles) {
                const configVulnerabilities = await this.scanConfigFile(file, options);
                vulnerabilities.push(...configVulnerabilities);
            }
        }

        // Generate AI-powered configuration analysis
        const aiConfigVulnerabilities = await this.generateAIConfigurationAnalysis(task, options);
        vulnerabilities.push(...aiConfigVulnerabilities);

        // Generate recommendations
        recommendations.push(...this.generateConfigurationRecommendations(vulnerabilities));

        return {
            vulnerabilities,
            recommendations,
            scanType: 'configuration'
        };
    }

    /**
     * Perform custom security scan
     * @param {Task} task - Task object
     * @param {string} scanType - Custom scan type
     * @param {Object} options - Scan options
     * @returns {Promise<Object>} Custom scan result
     */
    async performCustomScan(task, scanType, options) {
        // Generate AI-powered custom analysis
        const aiPrompt = this.buildCustomSecurityScanPrompt(task, scanType, options);
        const aiResponse = await this.cursorIDEService.postToCursor(aiPrompt);
        
        const vulnerabilities = this.parseAISecurityResponse(aiResponse);
        const recommendations = this.generateCustomSecurityRecommendations(vulnerabilities);

        return {
            vulnerabilities,
            recommendations,
            scanType: 'custom'
        };
    }

    /**
     * Apply security fixes
     * @param {Task} task - Task object
     * @param {Array<Object>} vulnerabilities - Vulnerabilities to fix
     * @returns {Promise<void>}
     */
    async applySecurityFixes(task, vulnerabilities) {
        for (const vulnerability of vulnerabilities) {
            if (vulnerability.severity === 'high' || vulnerability.autoFixable) {
                await this.applyVulnerabilityFix(task, vulnerability);
            }
        }
    }

    /**
     * Apply vulnerability fix
     * @param {Task} task - Task object
     * @param {Object} vulnerability - Vulnerability to fix
     * @returns {Promise<void>}
     */
    async applyVulnerabilityFix(task, vulnerability) {
        try {
            switch (vulnerability.type) {
                case 'command_injection':
                    await this.fixCommandInjection(task, vulnerability);
                    break;
                case 'path_traversal':
                    await this.fixPathTraversal(task, vulnerability);
                    break;
                case 'sensitive_data_exposure':
                    await this.fixSensitiveDataExposure(task, vulnerability);
                    break;
                case 'dependency_vulnerability':
                    await this.fixDependencyVulnerability(task, vulnerability);
                    break;
                default:
                    await this.fixGenericVulnerability(task, vulnerability);
                    break;
            }

            // Update task with fix information
            task.addSecurityFix(vulnerability);
            await this.taskRepository.save(task);

        } catch (error) {
            this.eventBus.emit('task:security:fix:error', {
                error: error.message,
                taskId: task.id,
                vulnerability
            });
        }
    }

    /**
     * Check if command contains unsafe commands
     * @param {string} command - Command to check
     * @returns {boolean} True if unsafe
     */
    containsUnsafeCommands(command) {
        const unsafePatterns = [
            /rm\s+-rf/,
            /del\s+\/s/,
            /format\s+/,
            /mkfs\s+/,
            /dd\s+if=/,
            /eval\s*\(/,
            /exec\s*\(/,
            /system\s*\(/
        ];

        return unsafePatterns.some(pattern => pattern.test(command));
    }

    /**
     * Check if path contains traversal
     * @param {string} path - Path to check
     * @returns {boolean} True if traversal detected
     */
    containsPathTraversal(path) {
        const traversalPatterns = [
            /\.\.\//,
            /\.\.\\/,
            /\/etc\/passwd/,
            /\/proc\//,
            /\/sys\//,
            /\/dev\//
        ];

        return traversalPatterns.some(pattern => pattern.test(path));
    }

    /**
     * Check if metadata contains sensitive data
     * @param {Object} metadata - Metadata to check
     * @returns {boolean} True if sensitive data found
     */
    containsSensitiveData(metadata) {
        const sensitiveKeys = [
            'password',
            'secret',
            'key',
            'token',
            'api_key',
            'private_key'
        ];

        const metadataStr = JSON.stringify(metadata).toLowerCase();
        return sensitiveKeys.some(key => metadataStr.includes(key));
    }

    /**
     * Generate AI vulnerability analysis
     * @param {Task} task - Task object
     * @param {Object} options - Analysis options
     * @returns {Promise<Array<Object>>} AI-generated vulnerabilities
     */
    async generateAIVulnerabilityAnalysis(task, options) {
        const aiPrompt = this.buildVulnerabilityAnalysisPrompt(task, options);
        const aiResponse = await this.cursorIDEService.postToCursor(aiPrompt);
        
        return this.parseAISecurityResponse(aiResponse);
    }

    /**
     * Generate AI code analysis
     * @param {Task} task - Task object
     * @param {Object} options - Analysis options
     * @returns {Promise<Array<Object>>} AI-generated code vulnerabilities
     */
    async generateAICodeAnalysis(task, options) {
        const aiPrompt = this.buildCodeAnalysisPrompt(task, options);
        const aiResponse = await this.cursorIDEService.postToCursor(aiPrompt);
        
        return this.parseAISecurityResponse(aiResponse);
    }

    /**
     * Generate AI dependency analysis
     * @param {Task} task - Task object
     * @param {Object} options - Analysis options
     * @returns {Promise<Array<Object>>} AI-generated dependency vulnerabilities
     */
    async generateAIDependencyAnalysis(task, options) {
        const aiPrompt = this.buildDependencyAnalysisPrompt(task, options);
        const aiResponse = await this.cursorIDEService.postToCursor(aiPrompt);
        
        return this.parseAISecurityResponse(aiResponse);
    }

    /**
     * Generate AI configuration analysis
     * @param {Task} task - Task object
     * @param {Object} options - Analysis options
     * @returns {Promise<Array<Object>>} AI-generated configuration vulnerabilities
     */
    async generateAIConfigurationAnalysis(task, options) {
        const aiPrompt = this.buildConfigurationAnalysisPrompt(task, options);
        const aiResponse = await this.cursorIDEService.postToCursor(aiPrompt);
        
        return this.parseAISecurityResponse(aiResponse);
    }

    /**
     * Build vulnerability analysis prompt
     * @param {Task} task - Task object
     * @param {Object} options - Analysis options
     * @returns {string} AI prompt
     */
    buildVulnerabilityAnalysisPrompt(task, options) {
        return `
Analyze this task for security vulnerabilities:

Task: ${task.title}
Description: ${task.description}
Type: ${task.type.value}
Project Path: ${task.projectPath}

Metadata: ${JSON.stringify(task.metadata, null, 2)}

Focus on:
- Command injection vulnerabilities
- Path traversal issues
- Sensitive data exposure
- Input validation problems
- Authentication/authorization issues

Provide vulnerabilities in JSON format:
[
  {
    "type": "vulnerability_type",
    "severity": "high|medium|low",
    "description": "vulnerability description",
    "location": "where vulnerability is found",
    "recommendation": "how to fix it",
    "autoFixable": true|false
  }
]
        `.trim();
    }

    /**
     * Build code analysis prompt
     * @param {Task} task - Task object
     * @param {Object} options - Analysis options
     * @returns {string} AI prompt
     */
    buildCodeAnalysisPrompt(task, options) {
        return `
Analyze the code related to this task for security issues:

Task: ${task.title}
Description: ${task.description}
Project Path: ${task.projectPath}

Focus on:
- SQL injection vulnerabilities
- XSS vulnerabilities
- CSRF vulnerabilities
- Insecure deserialization
- Broken authentication
- Sensitive data exposure
- Missing access controls
- Security misconfigurations

Provide code vulnerabilities in JSON format:
[
  {
    "type": "vulnerability_type",
    "severity": "high|medium|low",
    "description": "vulnerability description",
    "location": "file:line",
    "recommendation": "how to fix it",
    "autoFixable": true|false
  }
]
        `.trim();
    }

    /**
     * Build dependency analysis prompt
     * @param {Task} task - Task object
     * @param {Object} options - Analysis options
     * @returns {string} AI prompt
     */
    buildDependencyAnalysisPrompt(task, options) {
        return `
Analyze the dependencies for this task for security vulnerabilities:

Task: ${task.title}
Project Path: ${task.projectPath}

Focus on:
- Known vulnerabilities in dependencies
- Outdated packages with security issues
- Malicious packages
- License compliance issues
- Supply chain attacks

Provide dependency vulnerabilities in JSON format:
[
  {
    "type": "dependency_vulnerability",
    "severity": "high|medium|low",
    "description": "vulnerability description",
    "package": "package_name",
    "version": "affected_version",
    "recommendation": "how to fix it",
    "autoFixable": true|false
  }
]
        `.trim();
    }

    /**
     * Build configuration analysis prompt
     * @param {Task} task - Task object
     * @param {Object} options - Analysis options
     * @returns {string} AI prompt
     */
    buildConfigurationAnalysisPrompt(task, options) {
        return `
Analyze the configuration for this task for security issues:

Task: ${task.title}
Project Path: ${task.projectPath}

Focus on:
- Insecure default configurations
- Missing security headers
- Weak encryption settings
- Debug mode enabled
- Error information disclosure
- Insecure file permissions
- Missing access controls

Provide configuration vulnerabilities in JSON format:
[
  {
    "type": "configuration_vulnerability",
    "severity": "high|medium|low",
    "description": "vulnerability description",
    "file": "config_file",
    "setting": "problematic_setting",
    "recommendation": "how to fix it",
    "autoFixable": true|false
  }
]
        `.trim();
    }

    /**
     * Build custom security scan prompt
     * @param {Task} task - Task object
     * @param {string} scanType - Custom scan type
     * @param {Object} options - Scan options
     * @returns {string} AI prompt
     */
    buildCustomSecurityScanPrompt(task, scanType, options) {
        return `
Perform a custom security scan for: ${scanType}

Task: ${task.title}
Description: ${task.description}
Project Path: ${task.projectPath}

Scan Options: ${JSON.stringify(options, null, 2)}

Focus on security issues specific to ${scanType}.

Provide vulnerabilities in JSON format:
[
  {
    "type": "custom_vulnerability",
    "severity": "high|medium|low",
    "description": "vulnerability description",
    "location": "where found",
    "recommendation": "how to fix it",
    "autoFixable": true|false
  }
]
        `.trim();
    }

    /**
     * Parse AI security response
     * @param {string} aiResponse - AI response
     * @returns {Array<Object>} Parsed vulnerabilities
     */
    parseAISecurityResponse(aiResponse) {
        try {
            // Extract JSON from AI response
            const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            return [];
        } catch (error) {
            return [];
        }
    }

    /**
     * Calculate security score
     * @param {Array<Object>} vulnerabilities - Vulnerabilities
     * @returns {number} Security score (0-100)
     */
    calculateSecurityScore(vulnerabilities) {
        let score = 100;
        
        for (const vuln of vulnerabilities) {
            switch (vuln.severity) {
                case 'high':
                    score -= 20;
                    break;
                case 'medium':
                    score -= 10;
                    break;
                case 'low':
                    score -= 5;
                    break;
            }
        }
        
        return Math.max(0, score);
    }

    /**
     * Find code files
     * @param {string} projectPath - Project path
     * @param {string} pattern - File pattern
     * @returns {Promise<Array<string>>} Code files
     */
    async findCodeFiles(projectPath, pattern = '**/*.{js,ts,py,java,cpp,c,cs}') {
        // This would integrate with actual file system service
        return [];
    }

    /**
     * Scan code file
     * @param {string} filePath - File path
     * @param {Object} options - Scan options
     * @returns {Promise<Array<Object>>} File vulnerabilities
     */
    async scanCodeFile(filePath, options) {
        // This would integrate with actual code scanning
        return [];
    }

    /**
     * Find config files
     * @param {string} projectPath - Project path
     * @returns {Promise<Array<string>>} Config files
     */
    async findConfigFiles(projectPath) {
        // This would integrate with actual file system service
        return [];
    }

    /**
     * Scan config file
     * @param {string} filePath - File path
     * @param {Object} options - Scan options
     * @returns {Promise<Array<Object>>} Config vulnerabilities
     */
    async scanConfigFile(filePath, options) {
        // This would integrate with actual config scanning
        return [];
    }

    /**
     * Scan dependencies
     * @param {Object} dependencies - Dependencies
     * @param {Object} options - Scan options
     * @returns {Promise<Array<Object>>} Dependency vulnerabilities
     */
    async scanDependencies(dependencies, options) {
        // This would integrate with actual dependency scanning
        return [];
    }

    /**
     * Fix command injection
     * @param {Task} task - Task object
     * @param {Object} vulnerability - Vulnerability
     * @returns {Promise<void>}
     */
    async fixCommandInjection(task, vulnerability) {
        // Implement command injection fix
    }

    /**
     * Fix path traversal
     * @param {Task} task - Task object
     * @param {Object} vulnerability - Vulnerability
     * @returns {Promise<void>}
     */
    async fixPathTraversal(task, vulnerability) {
        // Implement path traversal fix
    }

    /**
     * Fix sensitive data exposure
     * @param {Task} task - Task object
     * @param {Object} vulnerability - Vulnerability
     * @returns {Promise<void>}
     */
    async fixSensitiveDataExposure(task, vulnerability) {
        // Implement sensitive data exposure fix
    }

    /**
     * Fix dependency vulnerability
     * @param {Task} task - Task object
     * @param {Object} vulnerability - Vulnerability
     * @returns {Promise<void>}
     */
    async fixDependencyVulnerability(task, vulnerability) {
        // Implement dependency vulnerability fix
    }

    /**
     * Fix generic vulnerability
     * @param {Task} task - Task object
     * @param {Object} vulnerability - Vulnerability
     * @returns {Promise<void>}
     */
    async fixGenericVulnerability(task, vulnerability) {
        // Implement generic vulnerability fix
    }

    /**
     * Generate vulnerability recommendations
     * @param {Array<Object>} vulnerabilities - Vulnerabilities
     * @returns {Array<string>} Recommendations
     */
    generateVulnerabilityRecommendations(vulnerabilities) {
        return vulnerabilities.map(vuln => vuln.recommendation);
    }

    /**
     * Generate code security recommendations
     * @param {Array<Object>} vulnerabilities - Vulnerabilities
     * @returns {Array<string>} Recommendations
     */
    generateCodeSecurityRecommendations(vulnerabilities) {
        return vulnerabilities.map(vuln => vuln.recommendation);
    }

    /**
     * Generate dependency recommendations
     * @param {Array<Object>} vulnerabilities - Vulnerabilities
     * @returns {Array<string>} Recommendations
     */
    generateDependencyRecommendations(vulnerabilities) {
        return vulnerabilities.map(vuln => vuln.recommendation);
    }

    /**
     * Generate configuration recommendations
     * @param {Array<Object>} vulnerabilities - Vulnerabilities
     * @returns {Array<string>} Recommendations
     */
    generateConfigurationRecommendations(vulnerabilities) {
        return vulnerabilities.map(vuln => vuln.recommendation);
    }

    /**
     * Generate custom security recommendations
     * @param {Array<Object>} vulnerabilities - Vulnerabilities
     * @returns {Array<string>} Recommendations
     */
    generateCustomSecurityRecommendations(vulnerabilities) {
        return vulnerabilities.map(vuln => vuln.recommendation);
    }
}

module.exports = TaskSecurityService; 