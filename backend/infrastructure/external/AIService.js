/**
 * AIService - AI integration service using existing Playwright-based Cursor IDE
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

class AIService {
    constructor(dependencies = {}) {
        this.cursorIDEService = dependencies.cursorIDEService;
        this.logger = dependencies.logger || console;
        this.eventBus = dependencies.eventBus;
        this.config = dependencies.config || {};
        
        this.aiModels = {
            'gpt-4': { maxTokens: 8192, temperature: 0.7 },
            'gpt-3.5-turbo': { maxTokens: 4096, temperature: 0.7 },
            'claude-3': { maxTokens: 100000, temperature: 0.7 },
            'claude-2': { maxTokens: 100000, temperature: 0.7 }
        };
        
        this.promptTemplates = new Map();
        this.responseCache = new Map();
        this.rateLimits = new Map();
        
        this.setupPromptTemplates();
    }

    /**
     * Setup AI prompt templates
     */
    setupPromptTemplates() {
        // Task analysis prompts
        this.promptTemplates.set('project-analysis', {
            system: `You are an expert software architect and developer. Analyze the provided project structure and provide comprehensive insights about:
1. Architecture patterns and design
2. Code quality and best practices
3. Performance optimization opportunities
4. Security considerations
5. Technical debt identification
6. Recommended improvements

Provide specific, actionable recommendations with code examples when appropriate.`,
            user: `Analyze the following project structure and provide detailed insights:

Project Path: {projectPath}
Project Type: {projectType}
Files: {fileList}

Please provide a comprehensive analysis covering architecture, quality, performance, security, and recommendations.`
        });

        // Task suggestion prompts
        this.promptTemplates.set('task-suggestions', {
            system: `You are an expert project manager and developer. Based on the project context and current state, suggest relevant tasks that would improve the project. Consider:
1. Code quality improvements
2. Performance optimizations
3. Security enhancements
4. Feature additions
5. Bug fixes
6. Documentation improvements
7. Testing enhancements

Provide specific, actionable task suggestions with clear descriptions and priorities.`,
            user: `Based on the following project context, suggest relevant tasks:

Project: {projectName}
Context: {context}
Current Issues: {issues}
Recent Changes: {recentChanges}

Please suggest {maxSuggestions} relevant tasks with clear descriptions, priorities, and estimated effort.`
        });

        // Script generation prompts
        this.promptTemplates.set('script-generation', {
            system: `You are an expert DevOps engineer and automation specialist. Generate scripts for the specified task type. Consider:
1. Cross-platform compatibility
2. Error handling and logging
3. Security best practices
4. Performance optimization
5. Clear documentation and comments

Generate production-ready scripts that follow best practices.`,
            user: `Generate a {scriptType} script for the following requirements:

Target: {target}
Requirements: {requirements}
Environment: {environment}
Dependencies: {dependencies}

Please generate a complete, production-ready script with proper error handling and documentation.`
        });

        // Code optimization prompts
        this.promptTemplates.set('code-optimization', {
            system: `You are an expert software engineer specializing in code optimization. Analyze the provided code and suggest improvements for:
1. Performance optimization
2. Code quality and readability
3. Security enhancements
4. Best practices compliance
5. Maintainability improvements

Provide specific, actionable recommendations with code examples.`,
            user: `Optimize the following code for better performance, quality, and maintainability:

Code:
{code}

Context: {context}
Requirements: {requirements}

Please provide specific optimization suggestions with code examples.`
        });

        // Security analysis prompts
        this.promptTemplates.set('security-analysis', {
            system: `You are an expert security analyst and penetration tester. Analyze the provided code and project structure for security vulnerabilities. Consider:
1. Input validation and sanitization
2. Authentication and authorization
3. Data encryption and protection
4. Common vulnerabilities (SQL injection, XSS, CSRF, etc.)
5. Secure coding practices
6. Compliance requirements

Provide detailed security analysis with risk assessments and remediation recommendations.`,
            user: `Perform a comprehensive security analysis of the following:

Project: {projectName}
Code: {code}
Configuration: {config}
Dependencies: {dependencies}

Please identify security vulnerabilities and provide detailed remediation recommendations.`
        });

        // Auto mode prompts
        this.promptTemplates.set('auto-mode', {
            system: `You are VibeCoder, an advanced AI development assistant. You have full access to analyze and improve the project. Your goal is to:
1. Understand the project structure and requirements
2. Identify areas for improvement
3. Generate and execute tasks automatically
4. Optimize code quality and performance
5. Ensure security best practices
6. Maintain project consistency

Work autonomously to improve the project while following best practices and maintaining code quality.`,
            user: `You are now in VibeCoder auto mode for project: {projectName}

Project Path: {projectPath}
Project Type: {projectType}
Current State: {currentState}
Goals: {goals}

Please analyze the project and execute improvements automatically. Provide detailed progress updates and results.`
        });
    }

    /**
     * Send prompt to AI via Cursor IDE
     * @param {string} promptType - Type of prompt template to use
     * @param {Object} data - Data to interpolate into prompt
     * @param {Object} options - AI options
     * @returns {Promise<Object>} AI response
     */
    async sendPrompt(promptType, data, options = {}) {
        try {
            const template = this.promptTemplates.get(promptType);
            if (!template) {
                throw new Error(`Unknown prompt type: ${promptType}`);
            }

            // Check rate limits
            await this.checkRateLimit(options.userId);

            // Interpolate prompt template
            const systemPrompt = this.interpolateTemplate(template.system, data);
            const userPrompt = this.interpolateTemplate(template.user, data);

            // Check cache
            const cacheKey = this.generateCacheKey(promptType, data, options);
            const cachedResponse = this.responseCache.get(cacheKey);
            if (cachedResponse && !options.skipCache) {
                this.logger.debug('AIService: Using cached response', { promptType, cacheKey });
                return cachedResponse;
            }

            // Prepare AI request
            const aiRequest = {
                model: options.model || 'gpt-4',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                maxTokens: options.maxTokens || this.aiModels[options.model || 'gpt-4']?.maxTokens || 4096,
                temperature: options.temperature || this.aiModels[options.model || 'gpt-4']?.temperature || 0.7,
                stream: options.stream || false
            };

            this.logger.info('AIService: Sending prompt to AI', {
                promptType,
                model: aiRequest.model,
                userId: options.userId
            });

            // Send to Cursor IDE via Playwright
            const response = await this.sendToCursorIDE(aiRequest, options);

            // Cache response
            if (response && !options.skipCache) {
                this.responseCache.set(cacheKey, response);
                this.scheduleCacheCleanup(cacheKey);
            }

            // Emit event
            this.eventBus.emit('ai:response:received', {
                promptType,
                model: aiRequest.model,
                response,
                userId: options.userId,
                timestamp: new Date()
            });

            return response;

        } catch (error) {
            this.logger.error('AIService: Failed to send prompt', {
                promptType,
                error: error.message,
                userId: options.userId
            });

            // Emit error event
            this.eventBus.emit('ai:response:error', {
                promptType,
                error: error.message,
                userId: options.userId,
                timestamp: new Date()
            });

            throw error;
        }
    }

    /**
     * Send request to Cursor IDE via Playwright
     * @param {Object} aiRequest - AI request object
     * @param {Object} options - Request options
     * @returns {Promise<Object>} AI response
     */
    async sendToCursorIDE(aiRequest, options = {}) {
        try {
            // Check if CursorIDEService is available
            if (!this.cursorIDEService) {
                this.logger.warn('AIService: CursorIDEService not available, returning mock response');
                return {
                    content: 'CursorIDEService not available',
                    success: false
                };
            }

            // Use existing CursorIDEService to send AI request  
            const prompt = this.buildPromptFromAIRequest(aiRequest);
            const response = await this.cursorIDEService.postToCursor(prompt);

            // Parse and validate response
            const parsedResponse = this.parseAIResponse(response);

            this.logger.debug('AIService: Received AI response', {
                model: aiRequest.model,
                responseLength: parsedResponse.content?.length || 0
            });

            return parsedResponse;

        } catch (error) {
            this.logger.error('AIService: Failed to send to Cursor IDE', {
                error: error.message,
                model: aiRequest.model
            });
            throw error;
        }
    }

    /**
     * Build prompt from AI request
     * @param {Object} aiRequest - AI request object
     * @returns {string} Simple prompt string
     */
    buildPromptFromAIRequest(aiRequest) {
        const { messages } = aiRequest;
        let prompt = '';
        
        // Just combine the messages into a simple prompt
        for (const message of messages) {
            if (message.role === 'user') {
                prompt += message.content;
            }
        }
        
        return prompt;
    }

    /**
     * Parse AI response
     * @param {Object} response - Raw AI response
     * @returns {Object} Parsed response
     */
    parseAIResponse(response) {
        try {
            // Extract content from response
            const content = response.content || response.text || response.message || '';
            
            // Parse structured data if present
            let structuredData = null;
            try {
                // Look for JSON in response
                const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
                if (jsonMatch) {
                    structuredData = JSON.parse(jsonMatch[1]);
                }
            } catch (parseError) {
                this.logger.warn('AIService: Failed to parse structured data', {
                    error: parseError.message
                });
            }

            return {
                content,
                structuredData,
                model: response.model,
                usage: response.usage,
                timestamp: new Date()
            };

        } catch (error) {
            this.logger.error('AIService: Failed to parse AI response', {
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Interpolate template with data
     * @param {string} template - Template string
     * @param {Object} data - Data object
     * @returns {string} Interpolated string
     */
    interpolateTemplate(template, data) {
        return template.replace(/\{(\w+)\}/g, (match, key) => {
            return data[key] !== undefined ? data[key] : match;
        });
    }

    /**
     * Generate cache key
     * @param {string} promptType - Prompt type
     * @param {Object} data - Data object
     * @param {Object} options - Options object
     * @returns {string} Cache key
     */
    generateCacheKey(promptType, data, options) {
        const keyData = {
            promptType,
            data: JSON.stringify(data),
            model: options.model || 'gpt-4',
            maxTokens: options.maxTokens,
            temperature: options.temperature
        };
        return Buffer.from(JSON.stringify(keyData)).toString('base64');
    }

    /**
     * Schedule cache cleanup
     * @param {string} cacheKey - Cache key
     */
    scheduleCacheCleanup(cacheKey) {
        setTimeout(() => {
            this.responseCache.delete(cacheKey);
        }, 3600000); // 1 hour
    }

    /**
     * Check rate limits
     * @param {string} userId - User ID
     * @returns {Promise<void>}
     */
    async checkRateLimit(userId) {
        const now = Date.now();
        const userLimits = this.rateLimits.get(userId) || { requests: [], lastReset: now };

        // Reset if 1 hour has passed
        if (now - userLimits.lastReset > 3600000) {
            userLimits.requests = [];
            userLimits.lastReset = now;
        }

        // Check rate limit (100 requests per hour per user)
        if (userLimits.requests.length >= 100) {
            throw new Error('Rate limit exceeded. Please try again later.');
        }

        userLimits.requests.push(now);
        this.rateLimits.set(userId, userLimits);
    }

    /**
     * Analyze project with AI
     * @param {string} projectPath - Project path
     * @param {Object} options - Analysis options
     * @returns {Promise<Object>} Analysis results
     */
    async analyzeProject(projectPath, options = {}) {
        try {
            // Get project structure
            const projectStructure = await this.getProjectStructure(projectPath);
            
            const data = {
                projectPath,
                projectType: projectStructure.type,
                fileList: projectStructure.files.join('\n'),
                dependencies: projectStructure.dependencies,
                config: projectStructure.config
            };

            const response = await this.sendPrompt('project-analysis', data, options);

            return {
                analysis: response.content,
                structuredData: response.structuredData,
                projectStructure,
                timestamp: new Date()
            };

        } catch (error) {
            this.logger.error('AIService: Failed to analyze project', {
                projectPath,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Generate task suggestions
     * @param {Object} context - Project context
     * @param {Object} options - Generation options
     * @returns {Promise<Object>} Task suggestions
     */
    async generateTaskSuggestions(context, options = {}) {
        try {
            // If CursorIDEService is not available, return empty suggestions
            if (!this.cursorIDEService) {
                this.logger.warn('AIService: CursorIDEService not available, returning empty suggestions');
                return {
                    suggestions: [],
                    analysis: 'CursorIDEService not available',
                    context,
                    timestamp: new Date()
                };
            }

            const data = {
                projectName: context.projectName,
                context: context.description,
                issues: context.issues || [],
                recentChanges: context.recentChanges || [],
                maxSuggestions: options.maxSuggestions || 10
            };

            const response = await this.sendPrompt('task-suggestions', data, options);

            return {
                suggestions: response.structuredData?.suggestions || [],
                analysis: response.content,
                context,
                timestamp: new Date()
            };

        } catch (error) {
            this.logger.error('AIService: Failed to generate task suggestions', {
                error: error.message
            });
            // Return empty suggestions instead of throwing
            return {
                suggestions: [],
                analysis: 'Error: ' + error.message,
                context,
                timestamp: new Date()
            };
        }
    }

    /**
     * Generate script
     * @param {string} scriptType - Script type
     * @param {Object} requirements - Script requirements
     * @param {Object} options - Generation options
     * @returns {Promise<Object>} Generated script
     */
    async generateScript(scriptType, requirements, options = {}) {
        try {
            const data = {
                scriptType,
                target: requirements.target,
                requirements: requirements.description,
                environment: requirements.environment || 'production',
                dependencies: requirements.dependencies || []
            };

            const response = await this.sendPrompt('script-generation', data, options);

            return {
                script: response.content,
                metadata: response.structuredData,
                scriptType,
                requirements,
                timestamp: new Date()
            };

        } catch (error) {
            this.logger.error('AIService: Failed to generate script', {
                scriptType,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Optimize code
     * @param {string} code - Code to optimize
     * @param {Object} context - Optimization context
     * @param {Object} options - Optimization options
     * @returns {Promise<Object>} Optimization results
     */
    async optimizeCode(code, context, options = {}) {
        try {
            const data = {
                code,
                context: context.description,
                requirements: context.requirements || []
            };

            const response = await this.sendPrompt('code-optimization', data, options);

            return {
                optimizedCode: response.content,
                recommendations: response.structuredData?.recommendations || [],
                analysis: response.structuredData?.analysis,
                timestamp: new Date()
            };

        } catch (error) {
            this.logger.error('AIService: Failed to optimize code', {
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Perform security analysis
     * @param {Object} projectData - Project data
     * @param {Object} options - Analysis options
     * @returns {Promise<Object>} Security analysis results
     */
    async performSecurityAnalysis(projectData, options = {}) {
        try {
            const data = {
                projectName: projectData.name,
                code: projectData.code || '',
                config: projectData.config || {},
                dependencies: projectData.dependencies || []
            };

            const response = await this.sendPrompt('security-analysis', data, options);

            return {
                vulnerabilities: response.structuredData?.vulnerabilities || [],
                recommendations: response.structuredData?.recommendations || [],
                riskAssessment: response.structuredData?.riskAssessment,
                analysis: response.content,
                timestamp: new Date()
            };

        } catch (error) {
            this.logger.error('AIService: Failed to perform security analysis', {
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Execute auto mode
     * @param {Object} projectData - Project data
     * @param {Object} options - Auto mode options
     * @returns {Promise<Object>} Auto mode results
     */
    async executeAutoMode(projectData, options = {}) {
        try {
            const data = {
                projectName: projectData.name,
                projectPath: projectData.path,
                projectType: projectData.type,
                currentState: projectData.currentState,
                goals: projectData.goals || []
            };

            const response = await this.sendPrompt('auto-mode', data, options);

            return {
                actions: response.structuredData?.actions || [],
                improvements: response.structuredData?.improvements || [],
                progress: response.structuredData?.progress,
                results: response.content,
                timestamp: new Date()
            };

        } catch (error) {
            this.logger.error('AIService: Failed to execute auto mode', {
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Get project structure
     * @param {string} projectPath - Project path
     * @returns {Promise<Object>} Project structure
     */
    async getProjectStructure(projectPath) {
        try {
            const files = await this.scanProjectFiles(projectPath);
            const dependencies = await this.extractDependencies(projectPath);
            const config = await this.extractConfig(projectPath);
            const type = this.detectProjectType(files, dependencies);

            return {
                type,
                files,
                dependencies,
                config
            };

        } catch (error) {
            this.logger.error('AIService: Failed to get project structure', {
                projectPath,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Scan project files
     * @param {string} projectPath - Project path
     * @returns {Promise<Array>} File list
     */
    async scanProjectFiles(projectPath) {
        const files = [];
        const ignoredPatterns = [
            'node_modules', '.git', '.vscode', '.idea', 'dist', 'build',
            '*.log', '*.tmp', '*.cache', '.DS_Store', 'Thumbs.db'
        ];

        try {
            await this.scanDirectory(projectPath, files, ignoredPatterns);
            return files;
        } catch (error) {
            this.logger.warn('AIService: Failed to scan project files', {
                projectPath,
                error: error.message
            });
            return [];
        }
    }

    /**
     * Scan directory recursively
     * @param {string} dirPath - Directory path
     * @param {Array} files - Files array
     * @param {Array} ignoredPatterns - Ignored patterns
     */
    async scanDirectory(dirPath, files, ignoredPatterns) {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            
            // Check if should be ignored
            if (ignoredPatterns.some(pattern => 
                entry.name.includes(pattern) || 
                fullPath.includes(pattern)
            )) {
                continue;
            }

            if (entry.isDirectory()) {
                await this.scanDirectory(fullPath, files, ignoredPatterns);
            } else {
                files.push(fullPath);
            }
        }
    }

    /**
     * Extract dependencies
     * @param {string} projectPath - Project path
     * @returns {Promise<Object>} Dependencies
     */
    async extractDependencies(projectPath) {
        try {
            const packageJsonPath = path.join(projectPath, 'package.json');
            const packageJson = await fs.readFile(packageJsonPath, 'utf8');
            const pkg = JSON.parse(packageJson);

            return {
                dependencies: pkg.dependencies || {},
                devDependencies: pkg.devDependencies || {},
                scripts: pkg.scripts || {}
            };
        } catch (error) {
            return { dependencies: {}, devDependencies: {}, scripts: {} };
        }
    }

    /**
     * Extract config
     * @param {string} projectPath - Project path
     * @returns {Promise<Object>} Config
     */
    async extractConfig(projectPath) {
        const config = {};
        const configFiles = [
            'package.json', 'tsconfig.json', 'webpack.config.js', 'vite.config.js',
            'eslint.config.js', '.eslintrc.js', 'prettier.config.js', 'jest.config.js'
        ];

        for (const configFile of configFiles) {
            try {
                const configPath = path.join(projectPath, configFile);
                const content = await fs.readFile(configPath, 'utf8');
                config[configFile] = JSON.parse(content);
            } catch (error) {
                // Config file doesn't exist or is invalid
            }
        }

        return config;
    }

    /**
     * Detect project type
     * @param {Array} files - File list
     * @param {Object} dependencies - Dependencies
     * @returns {string} Project type
     */
    detectProjectType(files, dependencies) {
        const deps = { ...dependencies.dependencies, ...dependencies.devDependencies };
        
        if (deps['react'] || deps['@types/react']) return 'react';
        if (deps['vue']) return 'vue';
        if (deps['angular']) return 'angular';
        if (deps['express'] || deps['koa']) return 'nodejs';
        if (deps['@nestjs/core']) return 'nestjs';
        if (deps['django']) return 'django';
        if (deps['flask']) return 'flask';
        if (deps['spring-boot']) return 'spring';
        
        // Check file extensions
        const extensions = files.map(f => path.extname(f));
        if (extensions.includes('.tsx') || extensions.includes('.jsx')) return 'react';
        if (extensions.includes('.vue')) return 'vue';
        if (extensions.includes('.py')) return 'python';
        if (extensions.includes('.java')) return 'java';
        
        return 'unknown';
    }

    /**
     * Get AI service statistics
     * @returns {Object} Service statistics
     */
    getStats() {
        return {
            cacheSize: this.responseCache.size,
            rateLimits: Array.from(this.rateLimits.entries()).map(([userId, limits]) => ({
                userId,
                requests: limits.requests.length,
                lastReset: limits.lastReset
            })),
            models: Object.keys(this.aiModels),
            templates: Array.from(this.promptTemplates.keys()),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Health check
     * @returns {Object} Health status
     */
    getHealthStatus() {
        return {
            status: 'healthy',
            cacheSize: this.responseCache.size,
            activeRateLimits: this.rateLimits.size,
            availableModels: Object.keys(this.aiModels).length,
            availableTemplates: this.promptTemplates.size,
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = AIService; 