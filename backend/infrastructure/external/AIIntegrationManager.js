/**
 * AIIntegrationManager - Manages AI model selection and integration
 */
const EventEmitter = require('events');
const { logger } = require('@infrastructure/logging/Logger');

class AIIntegrationManager {
    constructor(dependencies = {}) {
        this.aiService = dependencies.aiService;
        this.cursorIDEService = dependencies.cursorIDEService;
        this.logger = dependencies.logger || console;
        this.eventBus = dependencies.eventBus;
        
        this.aiModels = {
            'gpt-4': {
                provider: 'openai',
                maxTokens: 8192,
                temperature: 0.7,
                costPerToken: 0.00003,
                capabilities: ['analysis', 'generation', 'optimization', 'security']
            },
            'gpt-3.5-turbo': {
                provider: 'openai',
                maxTokens: 4096,
                temperature: 0.7,
                costPerToken: 0.000002,
                capabilities: ['analysis', 'generation', 'optimization']
            },
            'claude-3-opus': {
                provider: 'anthropic',
                maxTokens: 200000,
                temperature: 0.7,
                costPerToken: 0.000015,
                capabilities: ['analysis', 'generation', 'optimization', 'security', 'reasoning']
            },
            'claude-3-sonnet': {
                provider: 'anthropic',
                maxTokens: 200000,
                temperature: 0.7,
                costPerToken: 0.000003,
                capabilities: ['analysis', 'generation', 'optimization', 'security']
            },
            'claude-3-haiku': {
                provider: 'anthropic',
                maxTokens: 200000,
                temperature: 0.7,
                costPerToken: 0.00000025,
                capabilities: ['analysis', 'generation', 'optimization']
            }
        };
        
        this.modelPerformance = new Map();
        this.responseQuality = new Map();
        this.costTracking = new Map();
        this.fallbackStrategies = new Map();
        
        this.setupFallbackStrategies();
        this.startPerformanceMonitoring();
    }

    /**
     * Setup fallback strategies
     */
    setupFallbackStrategies() {
        // Fallback chain for different capabilities
        this.fallbackStrategies.set('analysis', ['gpt-4', 'claude-3-sonnet', 'gpt-3.5-turbo']);
        this.fallbackStrategies.set('generation', ['gpt-4', 'claude-3-sonnet', 'gpt-3.5-turbo']);
        this.fallbackStrategies.set('optimization', ['gpt-4', 'claude-3-sonnet', 'gpt-3.5-turbo']);
        this.fallbackStrategies.set('security', ['claude-3-opus', 'gpt-4', 'claude-3-sonnet']);
        this.fallbackStrategies.set('reasoning', ['claude-3-opus', 'gpt-4']);
    }

    /**
     * Start performance monitoring
     */
    startPerformanceMonitoring() {
        setInterval(() => {
            this.updateModelPerformance();
        }, 300000); // Every 5 minutes
    }

    /**
     * Select optimal AI model for task
     * @param {string} taskType - Type of task
     * @param {Object} requirements - Task requirements
     * @param {Object} options - Selection options
     * @returns {string} Selected model name
     */
    selectOptimalModel(taskType, requirements = {}, options = {}) {
        try {
            const {
                capability = 'analysis',
                maxTokens,
                temperature,
                budget,
                quality,
                speed
            } = requirements;

            // Get available models for capability
            const availableModels = this.getAvailableModels(capability);
            if (availableModels.length === 0) {
                throw new Error(`No models available for capability: ${capability}`);
            }

            // Filter by requirements
            let filteredModels = availableModels.filter(model => {
                const modelConfig = this.aiModels[model];
                
                // Check token limit
                if (maxTokens && modelConfig.maxTokens < maxTokens) {
                    return false;
                }
                
                // Check budget
                if (budget) {
                    const estimatedCost = this.estimateCost(model, maxTokens || modelConfig.maxTokens);
                    if (estimatedCost > budget) {
                        return false;
                    }
                }
                
                return true;
            });

            if (filteredModels.length === 0) {
                throw new Error('No models meet the specified requirements');
            }

            // Score models based on performance and requirements
            const scoredModels = filteredModels.map(model => ({
                model,
                score: this.calculateModelScore(model, requirements, options)
            }));

            // Sort by score and return best model
            scoredModels.sort((a, b) => b.score - a.score);
            const selectedModel = scoredModels[0].model;

            this.logger.info('AIIntegrationManager: Model selected', {
                taskType,
                capability,
                selectedModel,
                score: scoredModels[0].score,
                alternatives: scoredModels.slice(1, 3).map(s => s.model)
            });

            return selectedModel;

        } catch (error) {
            this.logger.error('AIIntegrationManager: Failed to select model', {
                taskType,
                error: error.message
            });
            
            // Return fallback model
            return this.getFallbackModel(taskType);
        }
    }

    /**
     * Get available models for capability
     * @param {string} capability - Required capability
     * @returns {Array} Available model names
     */
    getAvailableModels(capability) {
        return Object.keys(this.aiModels).filter(model => {
            const modelConfig = this.aiModels[model];
            return modelConfig.capabilities.includes(capability);
        });
    }

    /**
     * Calculate model score
     * @param {string} model - Model name
     * @param {Object} requirements - Task requirements
     * @param {Object} options - Selection options
     * @returns {number} Model score
     */
    calculateModelScore(model, requirements, options) {
        const modelConfig = this.aiModels[model];
        const performance = this.modelPerformance.get(model) || { responseTime: 1000, successRate: 0.95 };
        const quality = this.responseQuality.get(model) || { accuracy: 0.9, relevance: 0.9 };
        
        let score = 0;

        // Base score from model capabilities
        score += modelConfig.maxTokens / 1000; // Higher token limit = better
        score += (1 - modelConfig.costPerToken * 1000000); // Lower cost = better

        // Performance score
        score += (1 / performance.responseTime) * 1000; // Faster = better
        score += performance.successRate * 10; // Higher success rate = better

        // Quality score
        score += quality.accuracy * 10; // Higher accuracy = better
        score += quality.relevance * 10; // Higher relevance = better

        // User preference adjustments
        if (options.preferredModel === model) {
            score += 50;
        }

        if (options.avoidModel === model) {
            score -= 100;
        }

        return score;
    }

    /**
     * Get fallback model
     * @param {string} taskType - Task type
     * @returns {string} Fallback model name
     */
    getFallbackModel(taskType) {
        const capability = this.mapTaskTypeToCapability(taskType);
        const fallbackChain = this.fallbackStrategies.get(capability) || ['gpt-3.5-turbo'];
        return fallbackChain[0];
    }

    /**
     * Map task type to capability
     * @param {string} taskType - Task type
     * @returns {string} Capability
     */
    mapTaskTypeToCapability(taskType) {
        const capabilityMap = {
            'analysis': 'analysis',
            'suggestion': 'generation',
            'optimization': 'optimization',
            'security': 'security',
            'refactoring': 'optimization',
            'testing': 'analysis',
            'deployment': 'analysis',
            'auto': 'reasoning'
        };
        return capabilityMap[taskType] || 'analysis';
    }

    /**
     * Estimate cost for model usage
     * @param {string} model - Model name
     * @param {number} tokens - Number of tokens
     * @returns {number} Estimated cost
     */
    estimateCost(model, tokens) {
        const modelConfig = this.aiModels[model];
        return modelConfig.costPerToken * tokens;
    }

    /**
     * Process AI response with quality assessment
     * @param {Object} response - AI response
     * @param {string} model - Model used
     * @param {Object} context - Response context
     * @returns {Object} Processed response
     */
    async processAIResponse(response, model, context = {}) {
        try {
            // Assess response quality
            const qualityAssessment = await this.assessResponseQuality(response, context);
            
            // Update quality tracking
            this.updateResponseQuality(model, qualityAssessment);
            
            // Update performance tracking
            this.updateModelPerformance(model, context.duration || 0, true);
            
            // Track cost
            this.trackCost(model, context.tokens || 0);
            
            // Process response based on quality
            const processedResponse = await this.processResponseByQuality(response, qualityAssessment);
            
            // Emit response processed event
            this.eventBus.emit('ai:response:processed', {
                model,
                qualityAssessment,
                context,
                timestamp: new Date()
            });

            return processedResponse;

        } catch (error) {
            this.logger.error('AIIntegrationManager: Failed to process AI response', {
                model,
                error: error.message
            });
            
            // Update performance tracking for failure
            this.updateModelPerformance(model, context.duration || 0, false);
            
            throw error;
        }
    }

    /**
     * Assess response quality
     * @param {Object} response - AI response
     * @param {Object} context - Response context
     * @returns {Object} Quality assessment
     */
    async assessResponseQuality(response, context) {
        try {
            const content = response.content || '';
            
            // Basic quality metrics
            const assessment = {
                accuracy: this.assessAccuracy(content, context),
                relevance: this.assessRelevance(content, context),
                completeness: this.assessCompleteness(content, context),
                coherence: this.assessCoherence(content),
                length: this.assessLength(content, context),
                overall: 0
            };
            
            // Calculate overall score
            assessment.overall = (
                assessment.accuracy * 0.3 +
                assessment.relevance * 0.25 +
                assessment.completeness * 0.2 +
                assessment.coherence * 0.15 +
                assessment.length * 0.1
            );
            
            return assessment;

        } catch (error) {
            this.logger.error('AIIntegrationManager: Failed to assess response quality', {
                error: error.message
            });
            
            return {
                accuracy: 0.5,
                relevance: 0.5,
                completeness: 0.5,
                coherence: 0.5,
                length: 0.5,
                overall: 0.5
            };
        }
    }

    /**
     * Assess response accuracy
     * @param {string} content - Response content
     * @param {Object} context - Response context
     * @returns {number} Accuracy score
     */
    assessAccuracy(content, context) {
        let score = 0.8; // Base score
        
        try {
            // Check for technical accuracy indicators
            const accuracyIndicators = {
                codeSyntax: /function\s+\w+\s*\(|class\s+\w+|const\s+\w+|let\s+\w+|var\s+\w+/g,
                properNaming: /\b[a-zA-Z_$][a-zA-Z0-9_$]*\b/g,
                logicalStructure: /if\s*\(|for\s*\(|while\s*\(|switch\s*\(/g,
                errorHandling: /try\s*\{|catch\s*\(|finally\s*\{/g,
                documentation: /\/\*\*|\/\*|\/\/\s*@/g
            };
            
            let totalIndicators = 0;
            let foundIndicators = 0;
            
            for (const [type, pattern] of Object.entries(accuracyIndicators)) {
                const matches = content.match(pattern);
                if (matches && matches.length > 0) {
                    foundIndicators++;
                }
                totalIndicators++;
            }
            
            // Adjust score based on indicators
            const indicatorScore = foundIndicators / totalIndicators;
            score = 0.6 + (indicatorScore * 0.4); // 0.6 to 1.0 range
            
            // Check for common errors
            const errorPatterns = [
                /undefined\s+is\s+not\s+a\s+function/,
                /cannot\s+read\s+property/,
                /unexpected\s+token/,
                /missing\s+semicolon/
            ];
            
            for (const pattern of errorPatterns) {
                if (pattern.test(content)) {
                    score -= 0.1;
                }
            }
            
            // Consider context relevance
            if (context.expectedPatterns) {
                const contextMatches = context.expectedPatterns.filter(pattern => 
                    content.includes(pattern)
                ).length;
                const contextScore = contextMatches / context.expectedPatterns.length;
                score = (score + contextScore) / 2;
            }
            
        } catch (error) {
            this.logger.error('AIIntegrationManager: Failed to assess accuracy', {
                error: error.message
            });
        }
        
        return Math.max(0, Math.min(1, score));
    }

    /**
     * Assess response relevance
     * @param {string} content - Response content
     * @param {Object} context - Response context
     * @returns {number} Relevance score
     */
    assessRelevance(content, context) {
        let score = 0.7; // Base score
        
        try {
            if (!context.query) {
                return score;
            }
            
            const query = context.query.toLowerCase();
            const contentLower = content.toLowerCase();
            
            // Extract key terms from query
            const queryTerms = query.split(/\s+/).filter(term => term.length > 3);
            let matchingTerms = 0;
            
            for (const term of queryTerms) {
                if (contentLower.includes(term)) {
                    matchingTerms++;
                }
            }
            
            // Calculate relevance based on term matching
            if (queryTerms.length > 0) {
                const termScore = matchingTerms / queryTerms.length;
                score = 0.5 + (termScore * 0.5); // 0.5 to 1.0 range
            }
            
            // Check for task-specific relevance
            if (context.taskType) {
                const taskKeywords = this.getTaskKeywords(context.taskType);
                const taskMatches = taskKeywords.filter(keyword => 
                    contentLower.includes(keyword)
                ).length;
                
                if (taskKeywords.length > 0) {
                    const taskScore = taskMatches / taskKeywords.length;
                    score = (score + taskScore) / 2;
                }
            }
            
            // Penalize completely off-topic responses
            if (matchingTerms === 0 && queryTerms.length > 0) {
                score = 0.3;
            }
            
        } catch (error) {
            this.logger.error('AIIntegrationManager: Failed to assess relevance', {
                error: error.message
            });
        }
        
        return Math.max(0, Math.min(1, score));
    }

    /**
     * Assess response completeness
     * @param {string} content - Response content
     * @param {Object} context - Response context
     * @returns {number} Completeness score
     */
    assessCompleteness(content, context) {
        let score = 0.7; // Base score
        
        try {
            if (!context.query) {
                return score;
            }
            
            const query = context.query.toLowerCase();
            const contentLower = content.toLowerCase();
            
            // Check for question words that indicate what should be answered
            const questionWords = ['what', 'how', 'why', 'when', 'where', 'which'];
            const foundQuestions = questionWords.filter(word => query.includes(word));
            
            // Check if response addresses each question type
            let addressedQuestions = 0;
            for (const question of foundQuestions) {
                if (question === 'what' && (contentLower.includes('is') || contentLower.includes('are'))) {
                    addressedQuestions++;
                } else if (question === 'how' && (contentLower.includes('step') || contentLower.includes('process'))) {
                    addressedQuestions++;
                } else if (question === 'why' && (contentLower.includes('because') || contentLower.includes('reason'))) {
                    addressedQuestions++;
                } else if (contentLower.includes(question)) {
                    addressedQuestions++;
                }
            }
            
            if (foundQuestions.length > 0) {
                const questionScore = addressedQuestions / foundQuestions.length;
                score = 0.5 + (questionScore * 0.5);
            }
            
            // Check for code completeness indicators
            const completenessIndicators = [
                /function\s+\w+\s*\([^)]*\)\s*\{[\s\S]*\}/, // Complete function
                /class\s+\w+\s*\{[\s\S]*\}/, // Complete class
                /if\s*\([^)]*\)\s*\{[\s\S]*\}/, // Complete if statement
                /try\s*\{[\s\S]*\}\s*catch\s*\([^)]*\)\s*\{[\s\S]*\}/ // Complete try-catch
            ];
            
            let completeStructures = 0;
            for (const pattern of completenessIndicators) {
                if (pattern.test(content)) {
                    completeStructures++;
                }
            }
            
            // Adjust score based on complete structures
            if (completeStructures > 0) {
                score += 0.1;
            }
            
            // Check content length appropriateness
            const expectedLength = this.getExpectedLength(context.query, context.taskType);
            const actualLength = content.length;
            
            if (expectedLength > 0) {
                const lengthRatio = Math.min(actualLength / expectedLength, 2);
                const lengthScore = lengthRatio > 0.5 ? Math.min(lengthRatio, 1.5) / 1.5 : lengthRatio;
                score = (score + lengthScore) / 2;
            }
            
        } catch (error) {
            this.logger.error('AIIntegrationManager: Failed to assess completeness', {
                error: error.message
            });
        }
        
        return Math.max(0, Math.min(1, score));
    }

    /**
     * Assess response coherence
     * @param {string} content - Response content
     * @returns {number} Coherence score
     */
    assessCoherence(content) {
        let score = 0.8; // Base score
        
        try {
            // Check for logical flow indicators
            const flowIndicators = [
                /first|second|third|finally/, // Sequential markers
                /however|but|although|while/, // Contrast markers
                /therefore|thus|consequently/, // Conclusion markers
                /for example|such as|including/, // Example markers
                /in addition|furthermore|moreover/ // Addition markers
            ];
            
            let flowScore = 0;
            for (const pattern of flowIndicators) {
                if (pattern.test(content)) {
                    flowScore += 0.1;
                }
            }
            flowScore = Math.min(flowScore, 0.3);
            
            // Check for code structure coherence
            const codeStructure = {
                balancedBraces: this.checkBalancedBraces(content),
                properIndentation: this.checkProperIndentation(content),
                consistentNaming: this.checkConsistentNaming(content)
            };
            
            let structureScore = 0;
            if (codeStructure.balancedBraces) structureScore += 0.2;
            if (codeStructure.properIndentation) structureScore += 0.2;
            if (codeStructure.consistentNaming) structureScore += 0.2;
            
            // Check for paragraph structure
            const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
            const paragraphScore = paragraphs.length > 1 ? 0.2 : 0;
            
            score = 0.5 + flowScore + structureScore + paragraphScore;
            
        } catch (error) {
            this.logger.error('AIIntegrationManager: Failed to assess coherence', {
                error: error.message
            });
        }
        
        return Math.max(0, Math.min(1, score));
    }

    /**
     * Assess response length
     * @param {string} content - Response content
     * @param {Object} context - Response context
     * @returns {number} Length score
     */
    assessLength(content, context) {
        let score = 0.8; // Base score
        
        try {
            const contentLength = content.length;
            const expectedLength = this.getExpectedLength(context.query, context.taskType);
            
            if (expectedLength > 0) {
                const ratio = contentLength / expectedLength;
                
                if (ratio >= 0.8 && ratio <= 1.5) {
                    score = 1.0; // Optimal length
                } else if (ratio >= 0.5 && ratio <= 2.0) {
                    score = 0.8; // Acceptable length
                } else if (ratio < 0.3) {
                    score = 0.4; // Too short
                } else if (ratio > 3.0) {
                    score = 0.6; // Too long
                } else {
                    score = 0.7; // Borderline
                }
            } else {
                // No expected length, use heuristics
                if (contentLength < 50) {
                    score = 0.4; // Very short
                } else if (contentLength > 2000) {
                    score = 0.7; // Very long
                } else {
                    score = 0.9; // Reasonable length
                }
            }
            
        } catch (error) {
            this.logger.error('AIIntegrationManager: Failed to assess length', {
                error: error.message
            });
        }
        
        return Math.max(0, Math.min(1, score));
    }

    /**
     * Get task-specific keywords
     * @param {string} taskType - Task type
     * @returns {Array} Keywords
     */
    getTaskKeywords(taskType) {
        const keywordMap = {
            'code_generation': ['function', 'class', 'method', 'implementation', 'code'],
            'code_review': ['review', 'analysis', 'quality', 'issues', 'improvements'],
            'bug_fix': ['bug', 'error', 'fix', 'issue', 'problem', 'solution'],
            'refactoring': ['refactor', 'improve', 'optimize', 'restructure', 'clean'],
            'documentation': ['document', 'comment', 'explain', 'describe', 'guide'],
            'testing': ['test', 'spec', 'assert', 'verify', 'validate'],
            'deployment': ['deploy', 'build', 'release', 'production', 'environment'],
            'analysis': ['analyze', 'examine', 'investigate', 'assess', 'evaluate']
        };
        
        return keywordMap[taskType] || [];
    }

    /**
     * Get expected content length
     * @param {string} query - User query
     * @param {string} taskType - Task type
     * @returns {number} Expected length
     */
    getExpectedLength(query, taskType) {
        const queryLength = query.length;
        const taskLengthMap = {
            'code_generation': queryLength * 3,
            'code_review': queryLength * 2,
            'bug_fix': queryLength * 2.5,
            'refactoring': queryLength * 2,
            'documentation': queryLength * 2.5,
            'testing': queryLength * 2,
            'deployment': queryLength * 1.5,
            'analysis': queryLength * 3
        };
        
        return taskLengthMap[taskType] || queryLength * 2;
    }

    /**
     * Check if braces are balanced
     * @param {string} content - Content to check
     * @returns {boolean} Balanced status
     */
    checkBalancedBraces(content) {
        const stack = [];
        const bracePairs = { '{': '}', '[': ']', '(': ')' };
        
        for (const char of content) {
            if (bracePairs[char]) {
                stack.push(char);
            } else if (Object.values(bracePairs).includes(char)) {
                const lastOpen = stack.pop();
                if (!lastOpen || bracePairs[lastOpen] !== char) {
                    return false;
                }
            }
        }
        
        return stack.length === 0;
    }

    /**
     * Check for proper indentation
     * @param {string} content - Content to check
     * @returns {boolean} Proper indentation
     */
    checkProperIndentation(content) {
        const lines = content.split('\n');
        let consistentIndentation = true;
        let expectedIndent = 0;
        
        for (const line of lines) {
            if (line.trim().length === 0) continue;
            
            const indent = line.length - line.trimStart().length;
            
            if (line.trim().endsWith('{')) {
                expectedIndent += 2;
            } else if (line.trim().startsWith('}')) {
                expectedIndent = Math.max(0, expectedIndent - 2);
            }
            
            if (indent !== expectedIndent && line.trim().length > 0) {
                consistentIndentation = false;
                break;
            }
        }
        
        return consistentIndentation;
    }

    /**
     * Check for consistent naming
     * @param {string} content - Content to check
     * @returns {boolean} Consistent naming
     */
    checkConsistentNaming(content) {
        const variablePattern = /(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
        const functionPattern = /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
        const classPattern = /class\s+([A-Z][a-zA-Z0-9_$]*)/g;
        
        const variables = [...content.matchAll(variablePattern)].map(match => match[1]);
        const functions = [...content.matchAll(functionPattern)].map(match => match[1]);
        const classes = [...content.matchAll(classPattern)].map(match => match[1]);
        
        // Check for consistent naming conventions
        const camelCase = /^[a-z][a-zA-Z0-9]*$/;
        const PascalCase = /^[A-Z][a-zA-Z0-9]*$/;
        
        const variableConsistent = variables.every(v => camelCase.test(v));
        const functionConsistent = functions.every(f => camelCase.test(f));
        const classConsistent = classes.every(c => PascalCase.test(c));
        
        return variableConsistent && functionConsistent && classConsistent;
    }

    /**
     * Process response based on quality
     * @param {Object} response - AI response
     * @param {Object} qualityAssessment - Quality assessment
     * @returns {Object} Processed response
     */
    async processResponseByQuality(response, qualityAssessment) {
        const processedResponse = { ...response };
        
        // Add quality metadata
        processedResponse.quality = qualityAssessment;
        
        // Flag low-quality responses
        if (qualityAssessment.overall < 0.6) {
            processedResponse.warnings = ['Low quality response detected'];
            processedResponse.needsReview = true;
        }
        
        // Enhance high-quality responses
        if (qualityAssessment.overall > 0.8) {
            processedResponse.confidence = 'high';
            processedResponse.recommended = true;
        }
        
        return processedResponse;
    }

    /**
     * Update response quality tracking
     * @param {string} model - Model name
     * @param {Object} qualityAssessment - Quality assessment
     */
    updateResponseQuality(model, qualityAssessment) {
        const currentQuality = this.responseQuality.get(model) || {
            accuracy: [],
            relevance: [],
            completeness: [],
            coherence: [],
            length: [],
            overall: []
        };
        
        // Add new assessment
        currentQuality.accuracy.push(qualityAssessment.accuracy);
        currentQuality.relevance.push(qualityAssessment.relevance);
        currentQuality.completeness.push(qualityAssessment.completeness);
        currentQuality.coherence.push(qualityAssessment.coherence);
        currentQuality.length.push(qualityAssessment.length);
        currentQuality.overall.push(qualityAssessment.overall);
        
        // Keep only last 100 assessments
        const maxAssessments = 100;
        Object.keys(currentQuality).forEach(key => {
            if (currentQuality[key].length > maxAssessments) {
                currentQuality[key] = currentQuality[key].slice(-maxAssessments);
            }
        });
        
        this.responseQuality.set(model, currentQuality);
    }

    /**
     * Update model performance tracking
     * @param {string} model - Model name
     * @param {number} responseTime - Response time in milliseconds
     * @param {boolean} success - Whether the request was successful
     */
    updateModelPerformance(model, responseTime, success) {
        const currentPerformance = this.modelPerformance.get(model) || {
            responseTimes: [],
            successCount: 0,
            failureCount: 0,
            totalRequests: 0
        };
        
        currentPerformance.responseTimes.push(responseTime);
        currentPerformance.totalRequests++;
        
        if (success) {
            currentPerformance.successCount++;
        } else {
            currentPerformance.failureCount++;
        }
        
        // Keep only last 100 response times
        if (currentPerformance.responseTimes.length > 100) {
            currentPerformance.responseTimes = currentPerformance.responseTimes.slice(-100);
        }
        
        this.modelPerformance.set(model, currentPerformance);
    }

    /**
     * Track cost for model usage
     * @param {string} model - Model name
     * @param {number} tokens - Number of tokens used
     */
    trackCost(model, tokens) {
        const cost = this.estimateCost(model, tokens);
        const currentCosts = this.costTracking.get(model) || {
            totalCost: 0,
            totalTokens: 0,
            requests: 0
        };
        
        currentCosts.totalCost += cost;
        currentCosts.totalTokens += tokens;
        currentCosts.requests++;
        
        this.costTracking.set(model, currentCosts);
    }

    /**
     * Get model recommendations
     * @param {string} taskType - Task type
     * @param {Object} requirements - Task requirements
     * @returns {Array} Model recommendations
     */
    getModelRecommendations(taskType, requirements = {}) {
        const capability = this.mapTaskTypeToCapability(taskType);
        const availableModels = this.getAvailableModels(capability);
        
        const recommendations = availableModels.map(model => {
            const modelConfig = this.aiModels[model];
            const performance = this.modelPerformance.get(model) || { responseTime: 1000, successRate: 0.95 };
            const quality = this.responseQuality.get(model) || { overall: [0.8] };
            const costs = this.costTracking.get(model) || { totalCost: 0, requests: 0 };
            
            const avgQuality = quality.overall.reduce((a, b) => a + b, 0) / quality.overall.length;
            const avgResponseTime = performance.responseTimes.length > 0 
                ? performance.responseTimes.reduce((a, b) => a + b, 0) / performance.responseTimes.length 
                : 1000;
            
            return {
                model,
                provider: modelConfig.provider,
                maxTokens: modelConfig.maxTokens,
                costPerToken: modelConfig.costPerToken,
                avgResponseTime,
                successRate: performance.successCount / performance.totalRequests,
                avgQuality,
                totalCost: costs.totalCost,
                totalRequests: costs.requests,
                capabilities: modelConfig.capabilities
            };
        });
        
        // Sort by overall score
        recommendations.sort((a, b) => {
            const scoreA = (a.avgQuality * 0.4) + ((1 / a.avgResponseTime) * 0.3) + (a.successRate * 0.3);
            const scoreB = (b.avgQuality * 0.4) + ((1 / b.avgResponseTime) * 0.3) + (b.successRate * 0.3);
            return scoreB - scoreA;
        });
        
        return recommendations;
    }

    /**
     * Get integration statistics
     * @returns {Object} Integration statistics
     */
    getStats() {
        const stats = {
            models: Object.keys(this.aiModels).length,
            totalRequests: 0,
            totalCost: 0,
            avgResponseTime: 0,
            avgQuality: 0,
            modelPerformance: {},
            costTracking: {},
            qualityTracking: {}
        };
        
        // Aggregate performance data
        for (const [model, performance] of this.modelPerformance.entries()) {
            stats.modelPerformance[model] = {
                avgResponseTime: performance.responseTimes.length > 0 
                    ? performance.responseTimes.reduce((a, b) => a + b, 0) / performance.responseTimes.length 
                    : 0,
                successRate: performance.totalRequests > 0 
                    ? performance.successCount / performance.totalRequests 
                    : 0,
                totalRequests: performance.totalRequests
            };
            stats.totalRequests += performance.totalRequests;
        }
        
        // Aggregate cost data
        for (const [model, costs] of this.costTracking.entries()) {
            stats.costTracking[model] = costs;
            stats.totalCost += costs.totalCost;
        }
        
        // Aggregate quality data
        for (const [model, quality] of this.responseQuality.entries()) {
            const avgQuality = quality.overall.length > 0 
                ? quality.overall.reduce((a, b) => a + b, 0) / quality.overall.length 
                : 0;
            stats.qualityTracking[model] = { avgQuality, assessments: quality.overall.length };
        }
        
        // Calculate overall averages
        const qualityScores = Object.values(stats.qualityTracking).map(q => q.avgQuality);
        stats.avgQuality = qualityScores.length > 0 
            ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length 
            : 0;
        
        const responseTimes = Object.values(stats.modelPerformance).map(p => p.avgResponseTime);
        stats.avgResponseTime = responseTimes.length > 0 
            ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
            : 0;
        
        return stats;
    }

    /**
     * Health check
     * @returns {Object} Health status
     */
    getHealthStatus() {
        return {
            status: 'healthy',
            models: Object.keys(this.aiModels).length,
            activeModels: this.modelPerformance.size,
            totalRequests: Array.from(this.modelPerformance.values())
                .reduce((sum, p) => sum + p.totalRequests, 0),
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = AIIntegrationManager; 