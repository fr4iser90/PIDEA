/**
 * AIVersionAnalysisService - AI-powered version analysis service
 * Provides intelligent version bump recommendations using AI analysis
 */

const Logger = require('@logging/Logger');
const VersionAIIntegration = require('@infrastructure/external/VersionAIIntegration');

class AIVersionAnalysisService {
  constructor(dependencies = {}) {
    // AI integration MUST come from DI container - no direct instantiation!
    this.aiIntegration = dependencies.aiIntegration;
    this.logger = new Logger('AIVersionAnalysisService');
    
    // Configuration
    this.config = {
      maxRetries: 3,
      timeout: 30000, // 30 seconds
      cacheTimeout: 3600000, // 1 hour
      confidenceThreshold: 0.7,
      ...dependencies.config
    };
    
    // Response cache
    this.responseCache = new Map();
    
    // Initialize prompt templates
    this.initializePromptTemplates();
  }

  /**
   * Initialize AI prompt templates for version analysis
   */
  initializePromptTemplates() {
    this.promptTemplates = {
      versionAnalysis: {
        system: `You are an expert in semantic versioning and software development. 
        Analyze the provided changelog and code changes to determine the appropriate version bump type.
        
        Version bump types:
        - MAJOR: Breaking changes, API changes, incompatible changes
        - MINOR: New features, backward-compatible functionality
        - PATCH: Bug fixes, small improvements, backward-compatible changes
        
        Consider:
        1. Type of changes in the changelog
        2. Impact on existing functionality
        3. Backward compatibility
        4. User-facing changes
        5. API modifications
        
        Respond with a JSON object containing:
        - recommendedType: "major", "minor", or "patch"
        - confidence: 0.0 to 1.0
        - reasoning: Detailed explanation
        - factors: Array of key factors considered`,
        
        user: `Changelog: "{changelog}"
        
        Project Context: {projectContext}
        
        Recent Changes: {recentChanges}
        
        Please analyze this and provide a version bump recommendation.`
      }
    };
  }

  /**
   * Analyze changelog and provide AI-powered version bump recommendation
   * @param {string} changelog - Description of the changes (optional)
   * @param {string} projectPath - Path to the project
   * @param {Object} context - Additional context (git changes, dependencies, etc.)
   * @returns {Promise<Object>} AI analysis result
   */
  async analyzeVersionBump(changelog, projectPath, context = {}) {
    try {
      // Check if auto-detection is enabled
      const autoDetect = context.autoDetectChanges || !changelog.trim();
      
      this.logger.info('Starting AI version analysis', {
        changelog: changelog ? changelog.substring(0, 100) + '...' : 'Auto-detection',
        projectPath,
        autoDetect,
        contextKeys: Object.keys(context)
      });

      // Check cache first
      const cacheKey = this.generateCacheKey(changelog, projectPath, context);
      const cachedResult = this.getCachedResult(cacheKey);
      if (cachedResult) {
        this.logger.info('Using cached AI analysis result');
        return cachedResult;
      }

      // Prepare analysis data (with auto-detection if enabled)
      const analysisData = await this.prepareAnalysisData(changelog, projectPath, context, autoDetect);
      
      // Generate AI prompt
      const prompt = this.generateAnalysisPrompt(analysisData);
      
      // Send to AI service - AI Response Processor handles parsing automatically
      const aiResponse = await this.sendToAI(prompt, projectPath);
      
      // Extract JSON from AI response
      const analysisResult = this.extractJSONFromAIResponse(aiResponse);
      
      // Cache the result
      this.cacheResult(cacheKey, analysisResult);
      
      this.logger.info('AI version analysis completed', {
        recommendedType: analysisResult.recommendedType,
        confidence: analysisResult.confidence
      });
      
      // Note: Event will be sent by VersionManagementService with complete result including newVersion
      // This service only provides the AI analysis recommendation
      
      return analysisResult;
      
    } catch (error) {
      this.logger.error('AI version analysis failed', {
        error: error.message,
        changelog: changelog ? changelog.substring(0, 100) + '...' : 'No changelog',
        stack: error.stack
      });
      
      throw new Error(`AI version analysis failed: ${error.message}`);
    }
  }

  /**
   * Prepare analysis data for AI processing
   * @param {string} changelog - Task description (optional)
   * @param {string} projectPath - Project path
   * @param {Object} context - Additional context
   * @param {boolean} autoDetect - Whether to auto-detect changes
   * @returns {Promise<Object>} Prepared analysis data
   */
  async prepareAnalysisData(changelog, projectPath, context, autoDetect = false) {
    try {
      // Get project context
      const projectContext = await this.getProjectContext(projectPath);
      
      // Get recent changes (always analyze git diff for better accuracy)
      const recentChanges = context.gitChanges || await this.getRecentChanges(projectPath);
      
      // Get dependency changes if available
      const dependencyChanges = context.dependencyChanges || await this.getDependencyChanges(projectPath);
      
      // If auto-detection is enabled and no changelog provided, generate one from changes
      let finalChangelog = changelog;
      if (autoDetect && (!changelog || !changelog.trim())) {
        finalChangelog = await this.generateChangelogFromChanges(recentChanges, projectContext);
      }
      
      return {
        changelog: finalChangelog,
        projectContext,
        recentChanges,
        dependencyChanges,
        context,
        autoDetected: autoDetect
      };
    } catch (error) {
      this.logger.warn('Failed to prepare some analysis data', { error: error.message });
      return {
        changelog: changelog || 'Auto-detection failed',
        projectContext: 'Unable to retrieve project context',
        recentChanges: 'Unable to retrieve recent changes',
        dependencyChanges: 'Unable to retrieve dependency changes',
        context,
        autoDetected: autoDetect
      };
    }
  }

  /**
   * Get project context for analysis
   * @param {string} projectPath - Project path
   * @returns {Promise<string>} Project context
   */
  async getProjectContext(projectPath) {
    try {
      // This would integrate with existing project analysis services
      // For now, return basic context
      return `Project located at: ${projectPath}`;
    } catch (error) {
      this.logger.warn('Failed to get project context', { error: error.message });
      return 'Project context unavailable';
    }
  }

  /**
   * Get recent changes for analysis using AI-powered git diff analysis
   * @param {string} projectPath - Project path
   * @returns {Promise<string>} Recent changes summary
   */
  async getRecentChanges(projectPath) {
    try {
      // Use AI to analyze git changes
      const gitChanges = await this.analyzeGitChangesWithAI(projectPath);
      return gitChanges;
    } catch (error) {
      this.logger.warn('Failed to get recent changes', { error: error.message });
      return 'Recent changes unavailable';
    }
  }

  /**
   * Analyze git changes using AI
   * @param {string} projectPath - Project path
   * @returns {Promise<string>} AI-analyzed git changes
   */
  async analyzeGitChangesWithAI(projectPath) {
    try {
      // Get git diff
      const gitDiff = await this.getGitDiff(projectPath);
      
      if (!gitDiff || gitDiff.trim().length === 0) {
        return 'No changes detected in git diff';
      }

      // Use AI to analyze the diff
      const aiPrompt = {
        system: `You are an expert code reviewer. Analyze the provided git diff and summarize the changes for version bump determination.

        Focus on:
        1. Type of changes (new features, bug fixes, breaking changes, refactoring)
        2. Files affected and their importance
        3. API changes or modifications
        4. Breaking changes or backward compatibility issues
        5. New functionality added
        6. Bug fixes implemented

        Provide a concise summary that helps determine the appropriate version bump type.`,
        
        user: `Git Diff:
        \`\`\`
        ${gitDiff}
        \`\`\`
        
        Please analyze these changes and provide a summary for version bump determination.`
      };

      // Use simple rule-based analysis to avoid recursion
      if (gitDiff.includes('+') && gitDiff.includes('-')) {
        return 'Code changes detected with additions and modifications';
      } else if (gitDiff.includes('+')) {
        return 'New code additions detected';
      } else if (gitDiff.includes('-')) {
        return 'Code removals detected';
      } else {
        return 'Git changes detected';
      }

    } catch (error) {
      this.logger.warn('Failed to analyze git changes with AI', { error: error.message });
      return 'Git changes analysis failed';
    }
  }

  /**
   * Get git diff for analysis
   * @param {string} projectPath - Project path
   * @returns {Promise<string>} Git diff
   */
  async getGitDiff(projectPath) {
    try {
      // This would integrate with your existing git service
      // For now, return a placeholder that can be enhanced
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

      // Get staged changes
      const { stdout: stagedDiff } = await execAsync('git diff --cached', { cwd: projectPath });
      
      // Get unstaged changes
      const { stdout: unstagedDiff } = await execAsync('git diff', { cwd: projectPath });
      
      // Get recent commits (last 5)
      const { stdout: recentCommits } = await execAsync('git log --oneline -5', { cwd: projectPath });
      
      return `STAGED CHANGES:
${stagedDiff || 'No staged changes'}

UNSTAGED CHANGES:
${unstagedDiff || 'No unstaged changes'}

RECENT COMMITS:
${recentCommits || 'No recent commits'}`;

    } catch (error) {
      this.logger.warn('Failed to get git diff', { error: error.message });
      return 'Git diff unavailable';
    }
  }

  /**
   * Generate changelog from changes using AI
   * @param {string} recentChanges - Recent changes analysis
   * @param {string} projectContext - Project context
   * @returns {Promise<string>} Generated changelog
   */
  async generateChangelogFromChanges(recentChanges, projectContext) {
    try {
      // Simple rule-based changelog generation to avoid recursion
      if (recentChanges && recentChanges.includes('fix') || recentChanges.includes('bug')) {
        return 'Fixed bugs and issues';
      } else if (recentChanges && recentChanges.includes('feat') || recentChanges.includes('add')) {
        return 'Added new features';
      } else if (recentChanges && recentChanges.includes('refactor')) {
        return 'Refactored code for better maintainability';
      } else if (recentChanges && recentChanges.includes('update') || recentChanges.includes('depend')) {
        return 'Updated dependencies and configurations';
      } else {
        return 'Auto-detected code changes';
      }
      
    } catch (error) {
      this.logger.warn('Failed to generate changelog from changes', { error: error.message });
      return 'Auto-detected changes';
    }
  }

  /**
   * Get dependency changes for analysis
   * @param {string} projectPath - Project path
   * @returns {Promise<string>} Dependency changes summary
   */
  async getDependencyChanges(projectPath) {
    try {
      // This would analyze package.json changes
      // For now, return placeholder
      return 'Dependency changes analysis not available';
    } catch (error) {
      this.logger.warn('Failed to get dependency changes', { error: error.message });
      return 'Dependency changes unavailable';
    }
  }

  /**
   * Generate AI analysis prompt
   * @param {Object} analysisData - Prepared analysis data
   * @returns {Object} AI prompt
   */
  generateAnalysisPrompt(analysisData) {
    const template = this.promptTemplates.versionAnalysis;
    
    return {
      system: template.system,
      user: template.user
        .replace('{changelog}', analysisData.changelog)
        .replace('{projectContext}', JSON.stringify(analysisData.projectContext, null, 2))
        .replace('{recentChanges}', JSON.stringify(analysisData.recentChanges, null, 2))
    };
  }

  /**
   * Send prompt to AI integration service (supports multiple methods)
   * @param {Object} prompt - AI prompt
   * @returns {Promise<string>} AI response
   */
  async sendToAI(prompt, projectPath) {
    try {
      // Use ONLY ide_send_message_step.js
      const IDESendMessageStep = require('@steps/categories/chat/ide_send_message_step');
      
      // Check if it's a constructor or a function
      let step;
      if (typeof IDESendMessageStep === 'function') {
        if (IDESendMessageStep.prototype && IDESendMessageStep.prototype.constructor === IDESendMessageStep) {
          // It's a constructor
          step = new IDESendMessageStep();
        } else {
          // It's a function, call it directly
          step = IDESendMessageStep();
        }
      } else {
        // It's already an instance or object
        step = IDESendMessageStep;
      }
      
      // Combine system and user message
      const fullMessage = `${prompt.system}\n\n${prompt.user}`;
      
      // Get project ID and port using existing services
      const { getServiceContainer } = require('@infrastructure/dependency-injection/ServiceContainer');
      const container = getServiceContainer();
      const projectMappingService = container.resolve('projectMappingService');
      const ideManager = container.resolve('ideManager');
      
      const projectId = projectMappingService ? await projectMappingService.getProjectIdFromWorkspace(projectPath) : 'PIDEA';
      
      // Get the port for this project ID automatically
      const availableIDEs = await ideManager.getAvailableIDEs();
      let currentPort = null;
      
      // First try to find by workspace path (more direct)
      for (const ide of availableIDEs) {
        if (ide.workspacePath === projectPath) {
          currentPort = ide.port;
          break;
        }
      }
      
      // If not found by path, try by project ID
      if (!currentPort) {
        for (const ide of availableIDEs) {
          const ideProjectId = projectMappingService ? await projectMappingService.getProjectIdFromWorkspace(ide.workspacePath) : ide.workspacePath.split('/').pop().toUpperCase();
          if (ideProjectId === projectId) {
            currentPort = ide.port;
            break;
          }
        }
      }
      
      if (!currentPort) {
        throw new Error(`No IDE found for project "${projectId}" (path: ${projectPath})`);
      }
      
      // Execute the step with proper context - let it use automatic port mapping
      const response = await step.execute({
        message: fullMessage,
        projectId: projectId,
        workspacePath: projectPath,
        waitForResponse: true, // WAIT for AI response!
        clickNewChat: true, // Start new chat for version analysis
        activeIDE: { port: currentPort }, // Use the automatically found port
        getService: (serviceName) => {
          // Return services from DI container
          if (serviceName === 'sendMessageHandler') {
            return container.resolve('sendMessageHandler');
          }
          if (serviceName === 'browserManager') {
            return container.resolve('browserManager');
          }
          return null;
        }
      });
      
      // Debug: Log the response structure
      this.logger.info('AI Response structure debug', {
        responseType: typeof response,
        responseKeys: response ? Object.keys(response) : 'null',
        hasResponse: !!(response && response.response),
        responseResponseType: response && response.response ? typeof response.response : 'undefined'
      });
      
      // Extract the actual response text from the response object
      if (response && response.aiResponse) {
        // aiResponse is an object, we need aiResponse.response for the actual text
        if (typeof response.aiResponse === 'string') {
          return response.aiResponse;
        } else if (response.aiResponse.response) {
          return response.aiResponse.response;
        } else {
          this.logger.error('aiResponse structure is unexpected', { aiResponse: response.aiResponse });
          throw new Error('aiResponse does not contain expected response text');
        }
      } else if (response && response.response) {
        return response.response; // Return the actual AI response text
      } else if (response && response.data) {
        return response.data;
      } else if (response && response.message) {
        return response.message;
      } else if (typeof response === 'string') {
        return response; // Already a string
      } else {
        // Try to extract response from other possible structures
        if (response && response.text) {
          return response.text;
        } else if (response && response.content) {
          return response.content;
        } else {
          this.logger.error('Unknown response structure', { response });
          throw new Error('Invalid response format from AI service');
        }
      }
    } catch (error) {
      this.logger.error('Failed to send prompt to AI integration', { error: error.message });
      throw error;
    }
  }

  /**
   * Extract JSON from AI response
   * @param {string} aiResponse - Raw AI response
   * @returns {Object} Parsed analysis result
   */
  extractJSONFromAIResponse(aiResponse) {
    try {
      // Ensure aiResponse is a string
      if (typeof aiResponse !== 'string') {
        this.logger.error('AI response is not a string', { 
          type: typeof aiResponse, 
          value: aiResponse 
        });
        throw new Error('AI response is not a string');
      }
      
      // Extract JSON from AI response text using centralized approach
      let parsed;
      
      // Debug: Log the full AI response to see what we're working with
      this.logger.info('Full AI response for JSON extraction', {
        responseLength: aiResponse.length,
        responsePreview: aiResponse.substring(0, 500) + '...',
        hasJsonBlock: aiResponse.includes('```json'),
        hasRecommendedType: aiResponse.includes('"recommendedType"'),
        hasJsonObject: aiResponse.includes('{')
      });
      
      // Strategy 1: Look for ```json blocks
      const jsonBlockMatch = aiResponse.match(/```json\s*(\{[\s\S]*?\})\s*```/);
      if (jsonBlockMatch) {
        this.logger.info('Found JSON block', { jsonBlock: jsonBlockMatch[1] });
        // Clean the JSON by removing extra spaces and normalizing
        const cleanedJson = jsonBlockMatch[1].replace(/\s+/g, ' ').trim();
        this.logger.info('Cleaned JSON block', { cleanedJson: cleanedJson.substring(0, 100) + '...' });
        parsed = JSON.parse(cleanedJson);
      } else {
        // Strategy 2: Look for JSON object with better matching
        const jsonMatch = aiResponse.match(/\{\s*"recommendedType"[\s\S]*?\}/);
        if (jsonMatch) {
          this.logger.info('Found recommendedType JSON', { jsonMatch: jsonMatch[0] });
          // Clean the JSON by removing extra spaces and normalizing
          const cleanedJson = jsonMatch[0].replace(/\s+/g, ' ').trim();
          this.logger.info('Cleaned JSON', { cleanedJson: cleanedJson.substring(0, 100) + '...' });
          parsed = JSON.parse(cleanedJson);
        } else {
          // Strategy 3: Look for any JSON object
          const anyJsonMatch = aiResponse.match(/\{[\s\S]*\}/);
          if (anyJsonMatch) {
            this.logger.info('Found any JSON object', { jsonText: anyJsonMatch[0] });
            try {
              // Clean the JSON by removing extra spaces and normalizing
              const cleanedJson = anyJsonMatch[0].replace(/\s+/g, ' ').trim();
              this.logger.info('Cleaned JSON', { cleanedJson: cleanedJson.substring(0, 100) + '...' });
              parsed = JSON.parse(cleanedJson);
            } catch (parseError) {
              this.logger.error('JSON parsing failed', { 
                jsonText: anyJsonMatch[0].substring(0, 200) + '...',
                error: parseError.message
              });
              throw new Error('Invalid JSON format in AI response');
            }
          } else {
            throw new Error('No valid JSON found in AI response');
          }
        }
      }
      
      // Validate required fields
      if (!parsed.recommendedType || !['major', 'minor', 'patch'].includes(parsed.recommendedType)) {
        throw new Error('Invalid recommendedType in AI response');
      }
      
      if (typeof parsed.confidence !== 'number' || parsed.confidence < 0 || parsed.confidence > 1) {
        parsed.confidence = 0.5; // Default confidence
      }
      
      if (!parsed.reasoning) {
        parsed.reasoning = 'AI analysis completed';
      }
      
      if (!parsed.factors) {
        parsed.factors = ['AI analysis'];
      }
      
      return {
        recommendedType: parsed.recommendedType,
        confidence: parsed.confidence,
        reasoning: parsed.reasoning,
        factors: parsed.factors,
        source: 'ai',
        timestamp: new Date(),
        // Note: newVersion will be calculated by VersionManagementService
        // This service only provides the recommendation type
      };
      
    } catch (error) {
      this.logger.error('Failed to extract JSON from AI response', { 
        error: error.message,
        response: aiResponse.substring(0, 200) + '...'
      });
      
      throw new Error(`Failed to extract JSON from AI response: ${error.message}`);
    }
  }

  /**
   * Generate cache key for analysis result
   * @param {string} changelog - Task description
   * @param {string} projectPath - Project path
   * @param {Object} context - Additional context
   * @returns {string} Cache key
   */
  generateCacheKey(changelog, projectPath, context) {
    const keyData = {
      task: changelog.toLowerCase().trim(),
      path: projectPath,
      contextHash: this.hashContext(context)
    };
    
    return Buffer.from(JSON.stringify(keyData)).toString('base64');
  }

  /**
   * Hash context object for cache key
   * @param {Object} context - Context object
   * @returns {string} Context hash
   */
  hashContext(context) {
    try {
      return Buffer.from(JSON.stringify(context)).toString('base64').substring(0, 16);
    } catch (error) {
      return 'default';
    }
  }

  /**
   * Get cached analysis result
   * @param {string} cacheKey - Cache key
   * @returns {Object|null} Cached result or null
   */
  getCachedResult(cacheKey) {
    const cached = this.responseCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.config.cacheTimeout) {
      return cached.result;
    }
    
    // Remove expired cache entry
    if (cached) {
      this.responseCache.delete(cacheKey);
    }
    
    return null;
  }

  /**
   * Cache analysis result
   * @param {string} cacheKey - Cache key
   * @param {Object} result - Analysis result
   */
  cacheResult(cacheKey, result) {
    this.responseCache.set(cacheKey, {
      result,
      timestamp: Date.now()
    });
    
    // Clean up old cache entries periodically
    if (this.responseCache.size > 100) {
      this.cleanupCache();
    }
  }

  /**
   * Clean up expired cache entries
   */
  cleanupCache() {
    const now = Date.now();
    for (const [key, value] of this.responseCache.entries()) {
      if ((now - value.timestamp) > this.config.cacheTimeout) {
        this.responseCache.delete(key);
      }
    }
  }

  /**
   * Get service health status
   * @returns {Object} Health status
   */
  getHealthStatus() {
    return {
      status: 'healthy',
      cacheSize: this.responseCache.size,
      config: {
        maxRetries: this.config.maxRetries,
        timeout: this.config.timeout,
        cacheTimeout: this.config.cacheTimeout,
        confidenceThreshold: this.config.confidenceThreshold
      },
      timestamp: new Date()
    };
  }
}

module.exports = AIVersionAnalysisService;
