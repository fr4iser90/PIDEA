/**
 * TaskSuggestionService
 * Manages AI-generated task suggestions
 */
const AISuggestion = require('@value-objects/AISuggestion');
const TaskSuggestion = require('@entities/TaskSuggestion');
const TaskType = require('@value-objects/TaskType');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

class TaskSuggestionService {
  constructor(cursorIDEService, eventBus, logger) {
    this.cursorIDEService = cursorIDEService;
    this.eventBus = eventBus;
    this.logger = logger;
  }

  /**
   * Generate AI suggestions for a project
   * @param {string} projectPath - Path to the project
   * @param {Object} context - Context for suggestions
   * @param {Object} options - Generation options
   * @returns {Promise<TaskSuggestion[]>} Array of task suggestions
   */
  async generateSuggestions(projectPath, context = {}, options = {}) {
    try {
      this.logger.info(`Generating suggestions for project`);

      const suggestions = [];

      // Generate different types of suggestions
      const analysisSuggestions = await this._generateAnalysisSuggestions(projectPath, context, options);
      suggestions.push(...analysisSuggestions);

      const optimizationSuggestions = await this._generateOptimizationSuggestions(projectPath, context, options);
      suggestions.push(...optimizationSuggestions);

      const securitySuggestions = await this._generateSecuritySuggestions(projectPath, context, options);
      suggestions.push(...securitySuggestions);

      const refactoringSuggestions = await this._generateRefactoringSuggestions(projectPath, context, options);
      suggestions.push(...refactoringSuggestions);

      const testingSuggestions = await this._generateTestingSuggestions(projectPath, context, options);
      suggestions.push(...testingSuggestions);

      const documentationSuggestions = await this._generateDocumentationSuggestions(projectPath, context, options);
      suggestions.push(...documentationSuggestions);

      // Filter and rank suggestions
      const filteredSuggestions = this._filterSuggestions(suggestions, options);
      const rankedSuggestions = this._rankSuggestions(filteredSuggestions);

              this.logger.info(`Generated ${rankedSuggestions.length} suggestions for project`);
      this.eventBus.emit('suggestions:generated', { projectPath, suggestions: rankedSuggestions });

      return rankedSuggestions;
    } catch (error) {
      this.logger.error(`Suggestion generation failed for ${projectPath}:`, error);
      this.eventBus.emit('suggestions:generation:failed', { projectPath, error: error.message });
      throw error;
    }
  }

  /**
   * Generate analysis suggestions
   * @param {string} projectPath - Path to the project
   * @param {Object} context - Context for suggestions
   * @param {Object} options - Generation options
   * @returns {Promise<TaskSuggestion[]>} Array of analysis suggestions
   */
  async _generateAnalysisSuggestions(projectPath, context, options) {
    const suggestions = [];

    try {
      const prompt = this._buildAnalysisPrompt(projectPath, context);
      const response = await this._getAIResponse(prompt, options);

      if (response && response.suggestions) {
        response.suggestions.forEach(suggestionData => {
          const suggestion = TaskSuggestion.createFromAISuggestion(
            new AISuggestion(
              AISuggestion.TYPE_ANALYSIS,
              suggestionData.content,
              suggestionData.confidence || AISuggestion.CONFIDENCE_MEDIUM,
              suggestionData.metadata || {}
            ),
            context.projectId,
            context.userId
          );
          suggestions.push(suggestion);
        });
      }
    } catch (error) {
      this.logger.warn(`Analysis suggestions generation failed: ${error.message}`);
    }

    return suggestions;
  }

  /**
   * Generate optimization suggestions
   * @param {string} projectPath - Path to the project
   * @param {Object} context - Context for suggestions
   * @param {Object} options - Generation options
   * @returns {Promise<TaskSuggestion[]>} Array of optimization suggestions
   */
  async _generateOptimizationSuggestions(projectPath, context, options) {
    const suggestions = [];

    try {
      const prompt = this._buildOptimizationPrompt(projectPath, context);
      const response = await this._getAIResponse(prompt, options);

      if (response && response.suggestions) {
        response.suggestions.forEach(suggestionData => {
          const suggestion = TaskSuggestion.createFromAISuggestion(
            new AISuggestion(
              AISuggestion.TYPE_OPTIMIZATION,
              suggestionData.content,
              suggestionData.confidence || AISuggestion.CONFIDENCE_MEDIUM,
              suggestionData.metadata || {}
            ),
            context.projectId,
            context.userId
          );
          suggestions.push(suggestion);
        });
      }
    } catch (error) {
      this.logger.warn(`Optimization suggestions generation failed: ${error.message}`);
    }

    return suggestions;
  }

  /**
   * Generate security suggestions
   * @param {string} projectPath - Path to the project
   * @param {Object} context - Context for suggestions
   * @param {Object} options - Generation options
   * @returns {Promise<TaskSuggestion[]>} Array of security suggestions
   */
  async _generateSecuritySuggestions(projectPath, context, options) {
    const suggestions = [];

    try {
      const prompt = this._buildSecurityPrompt(projectPath, context);
      const response = await this._getAIResponse(prompt, options);

      if (response && response.suggestions) {
        response.suggestions.forEach(suggestionData => {
          const suggestion = TaskSuggestion.createFromAISuggestion(
            new AISuggestion(
              AISuggestion.TYPE_SECURITY,
              suggestionData.content,
              suggestionData.confidence || AISuggestion.CONFIDENCE_HIGH,
              suggestionData.metadata || {}
            ),
            context.projectId,
            context.userId
          );
          suggestions.push(suggestion);
        });
      }
    } catch (error) {
      this.logger.warn(`Security suggestions generation failed: ${error.message}`);
    }

    return suggestions;
  }

  /**
   * Generate refactoring suggestions
   * @param {string} projectPath - Path to the project
   * @param {Object} context - Context for suggestions
   * @param {Object} options - Generation options
   * @returns {Promise<TaskSuggestion[]>} Array of refactoring suggestions
   */
  async _generateRefactoringSuggestions(projectPath, context, options) {
    const suggestions = [];

    try {
      const prompt = this._buildRefactoringPrompt(projectPath, context);
      const response = await this._getAIResponse(prompt, options);

      if (response && response.suggestions) {
        response.suggestions.forEach(suggestionData => {
          const suggestion = TaskSuggestion.createFromAISuggestion(
            new AISuggestion(
              AISuggestion.TYPE_REFACTORING,
              suggestionData.content,
              suggestionData.confidence || AISuggestion.CONFIDENCE_MEDIUM,
              suggestionData.metadata || {}
            ),
            context.projectId,
            context.userId
          );
          suggestions.push(suggestion);
        });
      }
    } catch (error) {
      this.logger.warn(`Refactoring suggestions generation failed: ${error.message}`);
    }

    return suggestions;
  }

  /**
   * Generate testing suggestions
   * @param {string} projectPath - Path to the project
   * @param {Object} context - Context for suggestions
   * @param {Object} options - Generation options
   * @returns {Promise<TaskSuggestion[]>} Array of testing suggestions
   */
  async _generateTestingSuggestions(projectPath, context, options) {
    const suggestions = [];

    try {
      const prompt = this._buildTestingPrompt(projectPath, context);
      const response = await this._getAIResponse(prompt, options);

      if (response && response.suggestions) {
        response.suggestions.forEach(suggestionData => {
          const suggestion = TaskSuggestion.createFromAISuggestion(
            new AISuggestion(
              AISuggestion.TYPE_TEST,
              suggestionData.content,
              suggestionData.confidence || AISuggestion.CONFIDENCE_MEDIUM,
              suggestionData.metadata || {}
            ),
            context.projectId,
            context.userId
          );
          suggestions.push(suggestion);
        });
      }
    } catch (error) {
      this.logger.warn(`Testing suggestions generation failed: ${error.message}`);
    }

    return suggestions;
  }

  /**
   * Generate documentation suggestions
   * @param {string} projectPath - Path to the project
   * @param {Object} context - Context for suggestions
   * @param {Object} options - Generation options
   * @returns {Promise<TaskSuggestion[]>} Array of documentation suggestions
   */
  async _generateDocumentationSuggestions(projectPath, context, options) {
    const suggestions = [];

    try {
      const prompt = this._buildDocumentationPrompt(projectPath, context);
      const response = await this._getAIResponse(prompt, options);

      if (response && response.suggestions) {
        response.suggestions.forEach(suggestionData => {
          const suggestion = TaskSuggestion.createFromAISuggestion(
            new AISuggestion(
              AISuggestion.TYPE_DOCUMENTATION,
              suggestionData.content,
              suggestionData.confidence || AISuggestion.CONFIDENCE_MEDIUM,
              suggestionData.metadata || {}
            ),
            context.projectId,
            context.userId
          );
          suggestions.push(suggestion);
        });
      }
    } catch (error) {
      this.logger.warn(`Documentation suggestions generation failed: ${error.message}`);
    }

    return suggestions;
  }

  /**
   * Get AI response using Cursor IDE integration
   * @param {string} prompt - The prompt to send to AI
   * @param {Object} options - Options for AI request
   * @returns {Promise<Object>} AI response
   */
  async _getAIResponse(prompt, options = {}) {
    try {
      // Use existing Cursor IDE service to get AI response
      const response = await this.cursorIDEService.sendMessage(prompt, options);
      
      // Parse the response
      if (response && response.content) {
        try {
          return JSON.parse(response.content);
        } catch (parseError) {
          // If response is not JSON, create a structured response
          return {
            suggestions: [{
              content: response.content,
              confidence: AISuggestion.CONFIDENCE_MEDIUM,
              metadata: {}
            }]
          };
        }
      }
      
      return { suggestions: [] };
    } catch (error) {
      this.logger.error(`AI response failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Build analysis prompt
   * @param {string} projectPath - Path to the project
   * @param {Object} context - Context for suggestions
   * @returns {string} Analysis prompt
   */
  _buildAnalysisPrompt(projectPath, context) {
    return `Analyze the project at ${projectPath} and provide task suggestions for analysis improvements.

Context:
- Project Path: ${projectPath}
- User Context: ${JSON.stringify(context)}

Please provide suggestions in the following JSON format:
{
  "suggestions": [
    {
      "content": "Suggestion description",
      "confidence": "high|medium|low",
      "metadata": {
        "category": "analysis",
        "impact": "high|medium|low",
        "effort": "high|medium|low"
      }
    }
  ]
}

Focus on:
- Code structure analysis
- Architecture review
- Performance profiling
- Dependency analysis
- Technical debt assessment`;
  }

  /**
   * Build optimization prompt
   * @param {string} projectPath - Path to the project
   * @param {Object} context - Context for suggestions
   * @returns {string} Optimization prompt
   */
  _buildOptimizationPrompt(projectPath, context) {
    return `Analyze the project at ${projectPath} and provide task suggestions for optimization improvements.

Context:
- Project Path: ${projectPath}
- User Context: ${JSON.stringify(context)}

Please provide suggestions in the following JSON format:
{
  "suggestions": [
    {
      "content": "Suggestion description",
      "confidence": "high|medium|low",
      "metadata": {
        "category": "optimization",
        "impact": "high|medium|low",
        "effort": "high|medium|low"
      }
    }
  ]
}

Focus on:
- Performance optimization
- Build optimization
- Bundle size reduction
- Caching strategies
- Resource optimization`;
  }

  /**
   * Build security prompt
   * @param {string} projectPath - Path to the project
   * @param {Object} context - Context for suggestions
   * @returns {string} Security prompt
   */
  _buildSecurityPrompt(projectPath, context) {
    return `Analyze the project at ${projectPath} and provide task suggestions for security improvements.

Context:
- Project Path: ${projectPath}
- User Context: ${JSON.stringify(context)}

Please provide suggestions in the following JSON format:
{
  "suggestions": [
    {
      "content": "Suggestion description",
      "confidence": "high|medium|low",
      "metadata": {
        "category": "security",
        "impact": "high|medium|low",
        "effort": "high|medium|low"
      }
    }
  ]
}

Focus on:
- Security vulnerabilities
- Authentication improvements
- Authorization enhancements
- Data protection
- Security best practices`;
  }

  /**
   * Build refactoring prompt
   * @param {string} projectPath - Path to the project
   * @param {Object} context - Context for suggestions
   * @returns {string} Refactoring prompt
   */
  _buildRefactoringPrompt(projectPath, context) {
    return `Analyze the project at ${projectPath} and provide task suggestions for refactoring improvements.

Context:
- Project Path: ${projectPath}
- User Context: ${JSON.stringify(context)}

Please provide suggestions in the following JSON format:
{
  "suggestions": [
    {
      "content": "Suggestion description",
      "confidence": "high|medium|low",
      "metadata": {
        "category": "refactoring",
        "impact": "high|medium|low",
        "effort": "high|medium|low"
      }
    }
  ]
}

Focus on:
- Code quality improvements
- Design pattern implementation
- Code organization
- Maintainability enhancements
- Technical debt reduction`;
  }

  /**
   * Build testing prompt
   * @param {string} projectPath - Path to the project
   * @param {Object} context - Context for suggestions
   * @returns {string} Testing prompt
   */
  _buildTestingPrompt(projectPath, context) {
    return `Analyze the project at ${projectPath} and provide task suggestions for testing improvements.

Context:
- Project Path: ${projectPath}
- User Context: ${JSON.stringify(context)}

Please provide suggestions in the following JSON format:
{
  "suggestions": [
    {
      "content": "Suggestion description",
      "confidence": "high|medium|low",
      "metadata": {
        "category": "testing",
        "impact": "high|medium|low",
        "effort": "high|medium|low"
      }
    }
  ]
}

Focus on:
- Test coverage improvements
- Unit test implementation
- Integration test setup
- E2E test automation
- Testing best practices`;
  }

  /**
   * Build documentation prompt
   * @param {string} projectPath - Path to the project
   * @param {Object} context - Context for suggestions
   * @returns {string} Documentation prompt
   */
  _buildDocumentationPrompt(projectPath, context) {
    return `Analyze the project at ${projectPath} and provide task suggestions for documentation improvements.

Context:
- Project Path: ${projectPath}
- User Context: ${JSON.stringify(context)}

Please provide suggestions in the following JSON format:
{
  "suggestions": [
    {
      "content": "Suggestion description",
      "confidence": "high|medium|low",
      "metadata": {
        "category": "documentation",
        "impact": "high|medium|low",
        "effort": "high|medium|low"
      }
    }
  ]
}

Focus on:
- API documentation
- Code documentation
- README improvements
- Architecture documentation
- User guides`;
  }

  /**
   * Filter suggestions based on options
   * @param {TaskSuggestion[]} suggestions - Array of suggestions
   * @param {Object} options - Filter options
   * @returns {TaskSuggestion[]} Filtered suggestions
   */
  _filterSuggestions(suggestions, options = {}) {
    let filtered = [...suggestions];

    // Filter by confidence level
    if (options.minConfidence) {
      filtered = filtered.filter(s => s.aiSuggestion.getConfidenceScore() >= options.minConfidence);
    }

    // Filter by type
    if (options.types && options.types.length > 0) {
      filtered = filtered.filter(s => options.types.includes(s.type.value));
    }

    // Filter by category
    if (options.categories && options.categories.length > 0) {
      filtered = filtered.filter(s => {
        const category = s.getMetadata('category');
        return category && options.categories.includes(category);
      });
    }

    // Filter by impact
    if (options.minImpact) {
      filtered = filtered.filter(s => {
        const impact = s.getEstimatedImpact();
        const impactScores = { low: 1, medium: 2, high: 3 };
        return impactScores[impact] >= impactScores[options.minImpact];
      });
    }

    return filtered;
  }

  /**
   * Rank suggestions by relevance and quality
   * @param {TaskSuggestion[]} suggestions - Array of suggestions
   * @returns {TaskSuggestion[]} Ranked suggestions
   */
  _rankSuggestions(suggestions) {
    return suggestions.sort((a, b) => {
      // Calculate ranking score
      const scoreA = this._calculateSuggestionScore(a);
      const scoreB = this._calculateSuggestionScore(b);
      
      return scoreB - scoreA; // Higher score first
    });
  }

  /**
   * Calculate suggestion ranking score
   * @param {TaskSuggestion} suggestion - The suggestion to score
   * @returns {number} Ranking score
   */
  _calculateSuggestionScore(suggestion) {
    let score = 0;

    // Confidence score (0-40 points)
    score += suggestion.aiSuggestion.getConfidenceScore() * 40;

    // Quality score (0-30 points)
    score += suggestion.assessQuality() * 0.3;

    // Impact score (0-20 points)
    const impact = suggestion.getEstimatedImpact();
    const impactScores = { low: 5, medium: 15, high: 20 };
    score += impactScores[impact] || 10;

    // Effort score (0-10 points) - lower effort gets higher score
    const effort = suggestion.getEstimatedEffort();
    const effortScores = { low: 10, medium: 5, high: 2 };
    score += effortScores[effort] || 5;

    return score;
  }
}

module.exports = TaskSuggestionService; 