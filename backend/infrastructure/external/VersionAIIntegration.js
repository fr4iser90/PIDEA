/**
 * VersionAIIntegration - Dual AI integration for version analysis
 * Supports both IDE Chat integration and external APIs (OpenAI/Anthropic)
 */

const Logger = require('@logging/Logger');
const CursorIDEService = require('@domain/services/ide/CursorIDEService');
const axios = require('axios');

class VersionAIIntegration {
  constructor(dependencies = {}) {
    this.logger = new Logger('VersionAIIntegration');
    this.cursorIDEService = dependencies.cursorIDEService || new CursorIDEService();
    
    // Configuration for both IDE Chat and External APIs
    this.config = {
      // IDE Chat Configuration
      ideChat: {
        enabled: true,
        context: 'version-analysis',
        timeout: 30000
      },
      // External API Configuration
      openai: {
        enabled: !!process.env.OPENAI_API_KEY,
        apiKey: process.env.OPENAI_API_KEY,
        baseURL: 'https://api.openai.com/v1',
        model: 'gpt-4',
        maxTokens: 1000,
        temperature: 0.3
      },
      anthropic: {
        enabled: !!process.env.ANTHROPIC_API_KEY,
        apiKey: process.env.ANTHROPIC_API_KEY,
        baseURL: 'https://api.anthropic.com/v1',
        model: 'claude-3-sonnet-20240229',
        maxTokens: 1000,
        temperature: 0.3
      },
      // Rate limiting
      rateLimits: {
        openai: { requestsPerMinute: 60, tokensPerMinute: 150000 },
        anthropic: { requestsPerMinute: 50, tokensPerMinute: 100000 }
      },
      // General settings
      maxRetries: 3,
      timeout: 30000,
      preferredMethod: 'ide-chat', // 'ide-chat', 'openai', 'anthropic', 'auto'
      ...dependencies.config
    };
    
    // Rate limiting tracking
    this.rateLimitTracker = {
      openai: { requests: [], tokens: [] },
      anthropic: { requests: [], tokens: [] }
    };
    
    // Initialize external API clients if enabled
    this.initializeExternalClients();
  }

  /**
   * Initialize external API clients if enabled
   */
  initializeExternalClients() {
    // OpenAI client
    if (this.config.openai.enabled) {
      this.openaiClient = axios.create({
        baseURL: this.config.openai.baseURL,
        headers: {
          'Authorization': `Bearer ${this.config.openai.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: this.config.timeout
      });
    }

    // Anthropic client
    if (this.config.anthropic.enabled) {
      this.anthropicClient = axios.create({
        baseURL: this.config.anthropic.baseURL,
        headers: {
          'x-api-key': this.config.anthropic.apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        timeout: this.config.timeout
      });
    }
  }

  /**
   * Analyze version bump using preferred method
   * @param {string} taskDescription - Task description
   * @param {Object} context - Analysis context
   * @returns {Promise<Object>} Analysis result
   */
  async analyzeVersionBump(taskDescription, context = {}) {
    const method = this.config.preferredMethod;
    
    try {
      switch (method) {
        case 'ide-chat':
          return await this.analyzeWithIDEChat(taskDescription, context);
        case 'openai':
          return await this.analyzeWithOpenAI(taskDescription, context);
        case 'anthropic':
          return await this.analyzeWithAnthropic(taskDescription, context);
        case 'auto':
          return await this.analyzeWithAutoSelection(taskDescription, context);
        default:
          return await this.analyzeWithIDEChat(taskDescription, context);
      }
    } catch (error) {
      this.logger.error(`${method} analysis failed, trying fallback`, { error: error.message });
      return await this.analyzeWithFallback(taskDescription, context, method);
    }
  }

  /**
   * Analyze version bump using IDE Chat
   * @param {string} taskDescription - Task description
   * @param {Object} context - Analysis context
   * @returns {Promise<Object>} Analysis result
   */
  async analyzeWithIDEChat(taskDescription, context = {}) {
    try {
      const prompt = this.buildIDEChatPrompt(taskDescription, context);
      
      const response = await this.cursorIDEService.sendMessage({
        systemMessage: prompt.system,
        userMessage: prompt.user,
        context: this.config.ideChat.context
      });
      
      return this.parseIDEChatResponse(response);
      
    } catch (error) {
      this.logger.error('IDE Chat analysis failed', { error: error.message });
      throw new Error(`IDE Chat analysis failed: ${error.message}`);
    }
  }

  /**
   * Analyze version bump using OpenAI
   * @param {string} taskDescription - Task description
   * @param {Object} context - Analysis context
   * @returns {Promise<Object>} Analysis result
   */
  async analyzeWithOpenAI(taskDescription, context = {}) {
    if (!this.config.openai.enabled) {
      throw new Error('OpenAI integration not enabled');
    }

    try {
      await this.checkRateLimit('openai');
      
      const prompt = this.buildOpenAIPrompt(taskDescription, context);
      
      const response = await this.openaiClient.post('/chat/completions', {
        model: this.config.openai.model,
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user }
        ],
        max_tokens: this.config.openai.maxTokens,
        temperature: this.config.openai.temperature
      });

      this.updateRateLimit('openai', response.data.usage);
      return this.parseOpenAIResponse(response.data);
      
    } catch (error) {
      this.logger.error('OpenAI analysis failed', { error: error.message });
      throw new Error(`OpenAI analysis failed: ${error.message}`);
    }
  }

  /**
   * Analyze version bump using Anthropic
   * @param {string} taskDescription - Task description
   * @param {Object} context - Analysis context
   * @returns {Promise<Object>} Analysis result
   */
  async analyzeWithAnthropic(taskDescription, context = {}) {
    if (!this.config.anthropic.enabled) {
      throw new Error('Anthropic integration not enabled');
    }

    try {
      await this.checkRateLimit('anthropic');
      
      const prompt = this.buildAnthropicPrompt(taskDescription, context);
      
      const response = await this.anthropicClient.post('/messages', {
        model: this.config.anthropic.model,
        max_tokens: this.config.anthropic.maxTokens,
        temperature: this.config.anthropic.temperature,
        messages: [{ role: 'user', content: `${prompt.system}\n\n${prompt.user}` }]
      });

      this.updateRateLimit('anthropic', { 
        total_tokens: response.data.usage.input_tokens + response.data.usage.output_tokens 
      });
      return this.parseAnthropicResponse(response.data);
      
    } catch (error) {
      this.logger.error('Anthropic analysis failed', { error: error.message });
      throw new Error(`Anthropic analysis failed: ${error.message}`);
    }
  }

  /**
   * Auto-select best available method
   * @param {string} taskDescription - Task description
   * @param {Object} context - Analysis context
   * @returns {Promise<Object>} Analysis result
   */
  async analyzeWithAutoSelection(taskDescription, context = {}) {
    // Try methods in order of preference
    const methods = ['ide-chat', 'openai', 'anthropic'];
    
    for (const method of methods) {
      try {
        switch (method) {
          case 'ide-chat':
            if (this.config.ideChat.enabled) {
              return await this.analyzeWithIDEChat(taskDescription, context);
            }
            break;
          case 'openai':
            if (this.config.openai.enabled) {
              return await this.analyzeWithOpenAI(taskDescription, context);
            }
            break;
          case 'anthropic':
            if (this.config.anthropic.enabled) {
              return await this.analyzeWithAnthropic(taskDescription, context);
            }
            break;
        }
      } catch (error) {
        this.logger.warn(`${method} failed, trying next method`, { error: error.message });
        continue;
      }
    }
    
    throw new Error('No AI analysis methods available');
  }

  /**
   * Fallback analysis when primary method fails
   * @param {string} taskDescription - Task description
   * @param {Object} context - Analysis context
   * @param {string} failedMethod - Method that failed
   * @returns {Promise<Object>} Analysis result
   */
  async analyzeWithFallback(taskDescription, context = {}, failedMethod = '') {
    const fallbackMethods = ['ide-chat', 'openai', 'anthropic'].filter(m => m !== failedMethod);
    
    for (const method of fallbackMethods) {
      try {
        switch (method) {
          case 'ide-chat':
            if (this.config.ideChat.enabled) {
              return await this.analyzeWithIDEChat(taskDescription, context);
            }
            break;
          case 'openai':
            if (this.config.openai.enabled) {
              return await this.analyzeWithOpenAI(taskDescription, context);
            }
            break;
          case 'anthropic':
            if (this.config.anthropic.enabled) {
              return await this.analyzeWithAnthropic(taskDescription, context);
            }
            break;
        }
      } catch (error) {
        this.logger.warn(`Fallback ${method} also failed`, { error: error.message });
        continue;
      }
    }
    
    // Ultimate fallback - return basic analysis
    return this.getBasicFallbackResult(taskDescription);
  }


  /**
   * Build IDE Chat prompt for version analysis
   * @param {string} taskDescription - Task description
   * @param {Object} context - Analysis context
   * @returns {Object} Formatted prompt
   */
  buildIDEChatPrompt(taskDescription, context) {
    return {
      system: `You are an expert in semantic versioning and software development. 
      Analyze the provided task description and determine the appropriate version bump type.
      
      Version bump types:
      - MAJOR: Breaking changes, API changes, incompatible changes
      - MINOR: New features, backward-compatible functionality  
      - PATCH: Bug fixes, small improvements, backward-compatible changes
      
      Consider:
      1. Type of changes described
      2. Impact on existing functionality
      3. Backward compatibility
      4. User-facing changes
      5. API modifications
      
      Respond with a JSON object containing:
      - recommendedType: "major", "minor", or "patch"
      - confidence: 0.0 to 1.0
      - reasoning: Detailed explanation
      - factors: Array of key factors considered`,
      
      user: `Task Description: "${taskDescription}"
      
      Project Context: ${JSON.stringify(context.projectContext || {}, null, 2)}
      
      Recent Changes: ${JSON.stringify(context.recentChanges || {}, null, 2)}
      
      Please analyze this and provide a version bump recommendation.`
    };
  }

  /**
   * Parse IDE Chat response
   * @param {Object} response - IDE Chat response
   * @returns {Object} Parsed analysis result
   */
  parseIDEChatResponse(response) {
    try {
      const content = response.content || response.message || response;
      const parsed = JSON.parse(content);
      
      return {
        recommendedType: parsed.recommendedType,
        confidence: parsed.confidence,
        reasoning: parsed.reasoning,
        factors: parsed.factors,
        source: 'ide-chat',
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error('Failed to parse IDE Chat response', { error: error.message });
      throw new Error('Invalid IDE Chat response format');
    }
  }


  /**
   * Build OpenAI prompt for version analysis
   * @param {string} taskDescription - Task description
   * @param {Object} context - Analysis context
   * @returns {Object} Formatted prompt
   */
  buildOpenAIPrompt(taskDescription, context) {
    return {
      system: `You are an expert in semantic versioning and software development. 
      Analyze the provided task description and determine the appropriate version bump type.
      
      Version bump types:
      - MAJOR: Breaking changes, API changes, incompatible changes
      - MINOR: New features, backward-compatible functionality  
      - PATCH: Bug fixes, small improvements, backward-compatible changes
      
      Consider:
      1. Type of changes described
      2. Impact on existing functionality
      3. Backward compatibility
      4. User-facing changes
      5. API modifications
      
      Respond with a JSON object containing:
      - recommendedType: "major", "minor", or "patch"
      - confidence: 0.0 to 1.0
      - reasoning: Detailed explanation
      - factors: Array of key factors considered`,
      
      user: `Task Description: "${taskDescription}"
      
      Project Context: ${JSON.stringify(context.projectContext || {}, null, 2)}
      
      Recent Changes: ${JSON.stringify(context.recentChanges || {}, null, 2)}
      
      Please analyze this and provide a version bump recommendation.`
    };
  }

  /**
   * Build Anthropic prompt for version analysis
   * @param {string} taskDescription - Task description
   * @param {Object} context - Analysis context
   * @returns {Object} Formatted prompt
   */
  buildAnthropicPrompt(taskDescription, context) {
    return {
      system: `You are an expert in semantic versioning and software development. 
      Analyze the provided task description and determine the appropriate version bump type.
      
      Version bump types:
      - MAJOR: Breaking changes, API changes, incompatible changes
      - MINOR: New features, backward-compatible functionality
      - PATCH: Bug fixes, small improvements, backward-compatible changes
      
      Consider:
      1. Type of changes described
      2. Impact on existing functionality
      3. Backward compatibility
      4. User-facing changes
      5. API modifications
      
      Respond with a JSON object containing:
      - recommendedType: "major", "minor", or "patch"
      - confidence: 0.0 to 1.0
      - reasoning: Detailed explanation
      - factors: Array of key factors considered`,
      
      user: `Task Description: "${taskDescription}"
      
      Project Context: ${JSON.stringify(context.projectContext || {}, null, 2)}
      
      Recent Changes: ${JSON.stringify(context.recentChanges || {}, null, 2)}
      
      Please analyze this and provide a version bump recommendation.`
    };
  }

  /**
   * Parse OpenAI response
   * @param {Object} response - OpenAI API response
   * @returns {Object} Parsed analysis result
   */
  parseOpenAIResponse(response) {
    try {
      const content = response.choices[0].message.content;
      const parsed = JSON.parse(content);
      
      return {
        recommendedType: parsed.recommendedType,
        confidence: parsed.confidence,
        reasoning: parsed.reasoning,
        factors: parsed.factors,
        source: 'openai',
        usage: response.usage,
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error('Failed to parse OpenAI response', { error: error.message });
      throw new Error('Invalid OpenAI response format');
    }
  }

  /**
   * Parse Anthropic response
   * @param {Object} response - Anthropic API response
   * @returns {Object} Parsed analysis result
   */
  parseAnthropicResponse(response) {
    try {
      const content = response.content[0].text;
      const parsed = JSON.parse(content);
      
      return {
        recommendedType: parsed.recommendedType,
        confidence: parsed.confidence,
        reasoning: parsed.reasoning,
        factors: parsed.factors,
        source: 'anthropic',
        usage: response.usage,
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error('Failed to parse Anthropic response', { error: error.message });
      throw new Error('Invalid Anthropic response format');
    }
  }

  /**
   * Get basic fallback result when all methods fail
   * @param {string} taskDescription - Task description
   * @returns {Object} Basic fallback result
   */
  getBasicFallbackResult(taskDescription) {
    const lowerTask = taskDescription.toLowerCase();
    
    let recommendedType = 'patch';
    let confidence = 0.2;
    let reasoning = 'Basic fallback analysis due to AI service unavailability';
    
    if (lowerTask.includes('breaking') || lowerTask.includes('major') || lowerTask.includes('api change')) {
      recommendedType = 'major';
      confidence = 0.3;
      reasoning = 'Fallback: Detected potential breaking changes';
    } else if (lowerTask.includes('feature') || lowerTask.includes('new') || lowerTask.includes('add')) {
      recommendedType = 'minor';
      confidence = 0.3;
      reasoning = 'Fallback: Detected potential new features';
    }
    
    return {
      recommendedType,
      confidence,
      reasoning,
      factors: ['basic-fallback'],
      source: 'fallback',
      timestamp: new Date()
    };
  }

  /**
   * Check rate limits for external APIs
   * @param {string} service - Service name ('openai' or 'anthropic')
   * @returns {Promise<void>}
   */
  async checkRateLimit(service) {
    const limits = this.config.rateLimits[service];
    const tracker = this.rateLimitTracker[service];
    const now = Date.now();
    
    // Clean old entries (older than 1 minute)
    tracker.requests = tracker.requests.filter(time => now - time < 60000);
    tracker.tokens = tracker.tokens.filter(entry => now - entry.timestamp < 60000);
    
    // Check request rate limit
    if (tracker.requests.length >= limits.requestsPerMinute) {
      const oldestRequest = Math.min(...tracker.requests);
      const waitTime = 60000 - (now - oldestRequest);
      throw new Error(`Rate limit exceeded for ${service}. Wait ${Math.ceil(waitTime / 1000)} seconds.`);
    }
    
    // Check token rate limit
    const totalTokens = tracker.tokens.reduce((sum, entry) => sum + entry.tokens, 0);
    if (totalTokens >= limits.tokensPerMinute) {
      const oldestToken = Math.min(...tracker.tokens.map(entry => entry.timestamp));
      const waitTime = 60000 - (now - oldestToken);
      throw new Error(`Token rate limit exceeded for ${service}. Wait ${Math.ceil(waitTime / 1000)} seconds.`);
    }
  }

  /**
   * Update rate limit tracking
   * @param {string} service - Service name
   * @param {Object} usage - Usage information
   */
  updateRateLimit(service, usage) {
    const tracker = this.rateLimitTracker[service];
    const now = Date.now();
    
    // Track request
    tracker.requests.push(now);
    
    // Track tokens
    const totalTokens = usage.total_tokens || (usage.input_tokens + usage.output_tokens) || 0;
    tracker.tokens.push({
      tokens: totalTokens,
      timestamp: now
    });
  }

  /**
   * Get available services (all methods)
   * @returns {Array} Available services
   */
  getAvailableServices() {
    const services = [];
    
    if (this.config.ideChat.enabled) {
      services.push({
        name: 'ide-chat',
        model: 'cursor-ide',
        available: true,
        description: 'IDE Chat Integration'
      });
    }
    
    if (this.config.openai.enabled) {
      services.push({
        name: 'openai',
        model: this.config.openai.model,
        available: true,
        description: 'OpenAI API Integration'
      });
    }
    
    if (this.config.anthropic.enabled) {
      services.push({
        name: 'anthropic',
        model: this.config.anthropic.model,
        available: true,
        description: 'Anthropic API Integration'
      });
    }
    
    return services;
  }

  /**
   * Get service health status
   * @returns {Object} Health status
   */
  getHealthStatus() {
    return {
      status: 'healthy',
      availableServices: this.getAvailableServices(),
      config: {
        maxRetries: this.config.maxRetries,
        timeout: this.config.timeout,
        context: this.config.context
      },
      timestamp: new Date()
    };
  }

  /**
   * Test IDE Chat service connectivity
   * @returns {Promise<Object>} Test result
   */
  async testService() {
    try {
      const testPrompt = {
        taskDescription: 'Test task for connectivity check',
        context: { test: true }
      };
      
      await this.analyzeWithIDEChat(testPrompt.taskDescription, testPrompt.context);
      
      return {
        service: 'ide-chat',
        status: 'healthy',
        message: 'IDE Chat service is responding correctly'
      };
      
    } catch (error) {
      return {
        service: 'ide-chat',
        status: 'unhealthy',
        message: error.message
      };
    }
  }
}

module.exports = VersionAIIntegration;
