const { v4: uuidv4 } = require('uuid');

/**
 * TodoParser - Service for parsing TODO lists from various formats
 * Supports multiple patterns: TODO:, -, *, numbered lists, etc.
 */
class TodoParser {
  constructor() {
    this.patterns = [
      // TODO: pattern
      {
        regex: /TODO:\s*(.+)/gi,
        name: 'todo_colon',
        priority: 1
      },
      // Bullet points with - or *
      {
        regex: /^\s*[-*]\s*(.+)$/gm,
        name: 'bullet_points',
        priority: 2
      },
      // Numbered lists
      {
        regex: /^\s*\d+\.\s*(.+)$/gm,
        name: 'numbered_list',
        priority: 3
      },
      // [ ] checkbox pattern
      {
        regex: /^\s*\[ \]\s*(.+)$/gm,
        name: 'checkbox_unchecked',
        priority: 4
      },
      // [x] checkbox pattern (completed)
      {
        regex: /^\s*\[x\]\s*(.+)$/gi,
        name: 'checkbox_checked',
        priority: 5
      },
      // FIXME: pattern
      {
        regex: /FIXME:\s*(.+)/gi,
        name: 'fixme',
        priority: 6
      },
      // NOTE: pattern
      {
        regex: /NOTE:\s*(.+)/gi,
        name: 'note',
        priority: 7
      },
      // HACK: pattern
      {
        regex: /HACK:\s*(.+)/gi,
        name: 'hack',
        priority: 8
      }
    ];
    
    this.taskTypeKeywords = {
      'ui': ['button', 'form', 'input', 'modal', 'dialog', 'component', 'style', 'css', 'layout'],
      'api': ['endpoint', 'route', 'controller', 'service', 'api', 'rest', 'graphql'],
      'database': ['table', 'schema', 'migration', 'query', 'model', 'entity', 'repository'],
      'test': ['test', 'spec', 'unit', 'integration', 'e2e', 'coverage'],
      'deployment': ['deploy', 'docker', 'ci', 'cd', 'build', 'release'],
      'security': ['auth', 'permission', 'validation', 'sanitize', 'encrypt'],
      'performance': ['optimize', 'cache', 'performance', 'speed', 'memory'],
      'refactor': ['refactor', 'clean', 'organize', 'restructure', 'improve']
    };
    
    this.logger = console;
  }

  /**
   * Initialize the parser
   */
  async initialize() {
    this.logger.info('[TodoParser] Initializing TODO parser...');
    this.logger.info(`[TodoParser] Loaded ${this.patterns.length} parsing patterns`);
    return true;
  }

  /**
   * Parse TODO input and extract tasks
   * @param {string} input - Raw TODO input
   * @returns {Promise<Array>} Array of parsed tasks
   */
  async parse(input) {
    try {
      this.logger.info('[TodoParser] Parsing TODO input...');
      
      if (!input || typeof input !== 'string') {
        throw new Error('Invalid input: must be a non-empty string');
      }
      
      const tasks = [];
      const processedLines = new Set();
      
      // Process each pattern
      for (const pattern of this.patterns) {
        const matches = this.extractMatches(input, pattern);
        
        for (const match of matches) {
          const lineKey = `${match.line}:${match.content}`;
          
          // Avoid duplicate tasks from same line
          if (processedLines.has(lineKey)) {
            continue;
          }
          
          const task = this.createTask(match, pattern);
          if (task) {
            tasks.push(task);
            processedLines.add(lineKey);
          }
        }
      }
      
      // Sort tasks by priority and line number
      tasks.sort((a, b) => {
        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }
        return a.lineNumber - b.lineNumber;
      });
      
      this.logger.info(`[TodoParser] Parsed ${tasks.length} tasks from input`);
      return tasks;
      
    } catch (error) {
      this.logger.error('[TodoParser] Parsing failed:', error.message);
      throw error;
    }
  }

  /**
   * Extract matches for a specific pattern
   * @param {string} input - Input text
   * @param {Object} pattern - Pattern object
   * @returns {Array} Array of matches
   */
  extractMatches(input, pattern) {
    const matches = [];
    const lines = input.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineMatches = line.matchAll(pattern.regex);
      
      for (const match of lineMatches) {
        if (match[1]) { // Ensure we have captured content
          matches.push({
            line: i + 1,
            content: match[1].trim(),
            fullMatch: match[0],
            pattern: pattern.name
          });
        }
      }
    }
    
    return matches;
  }

  /**
   * Create a task object from a match
   * @param {Object} match - Match object
   * @param {Object} pattern - Pattern object
   * @returns {Object} Task object
   */
  createTask(match, pattern) {
    try {
      const task = {
        id: uuidv4(),
        description: match.content,
        lineNumber: match.line,
        pattern: pattern.name,
        priority: pattern.priority,
        type: this.detectTaskType(match.content),
        status: 'pending',
        dependencies: this.detectDependencies(match.content),
        metadata: {
          createdAt: new Date(),
          pattern: pattern.name,
          fullMatch: match.fullMatch
        }
      };
      
      // Skip completed tasks (checkbox checked)
      if (pattern.name === 'checkbox_checked') {
        task.status = 'completed';
        task.completedAt = new Date();
      }
      
      return task;
      
    } catch (error) {
      this.logger.error('[TodoParser] Failed to create task:', error.message);
      return null;
    }
  }

  /**
   * Detect task type based on content
   * @param {string} content - Task content
   * @returns {string} Task type
   */
  detectTaskType(content) {
    const lowerContent = content.toLowerCase();
    
    for (const [type, keywords] of Object.entries(this.taskTypeKeywords)) {
      for (const keyword of keywords) {
        if (lowerContent.includes(keyword)) {
          return type;
        }
      }
    }
    
    return '';
  }

  /**
   * Detect task dependencies
   * @param {string} content - Task content
   * @returns {Array} Array of dependency IDs
   */
  detectDependencies(content) {
    const dependencies = [];
    
    // Look for dependency indicators
    const dependencyPatterns = [
      /after\s+(.+)/gi,
      /before\s+(.+)/gi,
      /depends\s+on\s+(.+)/gi,
      /requires\s+(.+)/gi,
      /needs\s+(.+)/gi
    ];
    
    for (const pattern of dependencyPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        dependencies.push(...matches.map(match => match.trim()));
      }
    }
    
    return dependencies;
  }

  /**
   * Validate parsed tasks
   * @param {Array} tasks - Array of tasks
   * @returns {Object} Validation result
   */
  validateTasks(tasks) {
    const validation = {
      isValid: true,
      errors: [],
      warnings: [],
      stats: {
        total: tasks.length,
        valid: 0,
        invalid: 0,
        types: {}
      }
    };
    
    for (const task of tasks) {
      // Check required fields
      if (!task.description || task.description.trim().length === 0) {
        validation.errors.push(`Task ${task.id} has empty description`);
        validation.isValid = false;
        validation.stats.invalid++;
        continue;
      }
      
      if (task.description.length > 500) {
        validation.warnings.push(`Task ${task.id} has very long description (${task.description.length} chars)`);
      }
      
      // Count task types
      validation.stats.types[task.type] = (validation.stats.types[task.type] || 0) + 1;
      validation.stats.valid++;
    }
    
    return validation;
  }

  /**
   * Parse TODO input with validation
   * @param {string} input - Raw TODO input
   * @returns {Promise<Object>} Parsing result with validation
   */
  async parseWithValidation(input) {
    const tasks = await this.parse(input);
    const validation = this.validateTasks(tasks);
    
    return {
      tasks,
      validation,
      success: validation.isValid,
      totalTasks: tasks.length
    };
  }

  /**
   * Get supported patterns
   * @returns {Array} Array of supported patterns
   */
  getSupportedPatterns() {
    return this.patterns.map(pattern => ({
      name: pattern.name,
      regex: pattern.regex.source,
      priority: pattern.priority,
      description: this.getPatternDescription(pattern.name)
    }));
  }

  /**
   * Get pattern description
   * @param {string} patternName - Pattern name
   * @returns {string} Pattern description
   */
  getPatternDescription(patternName) {
    const descriptions = {
      'todo_colon': 'TODO: followed by task description',
      'bullet_points': 'Bullet points with - or *',
      'numbered_list': 'Numbered lists (1. 2. 3.)',
      'checkbox_unchecked': 'Unchecked checkboxes [ ]',
      'checkbox_checked': 'Checked checkboxes [x]',
      'fixme': 'FIXME: followed by issue description',
      'note': 'NOTE: followed by note content',
      'hack': 'HACK: followed by hack description'
    };
    
    return descriptions[patternName] || 'Unknown pattern';
  }

  /**
   * Add custom pattern
   * @param {Object} pattern - Pattern object
   */
  addCustomPattern(pattern) {
    if (!pattern.regex || !pattern.name) {
      throw new Error('Pattern must have regex and name properties');
    }
    
    // Ensure regex is a RegExp object
    if (typeof pattern.regex === 'string') {
      pattern.regex = new RegExp(pattern.regex, 'gi');
    }
    
    // Set default priority if not provided
    if (!pattern.priority) {
      pattern.priority = this.patterns.length + 1;
    }
    
    this.patterns.push(pattern);
    this.logger.info(`[TodoParser] Added custom pattern: ${pattern.name}`);
  }

  /**
   * Remove pattern by name
   * @param {string} patternName - Pattern name
   * @returns {boolean} Success status
   */
  removePattern(patternName) {
    const index = this.patterns.findIndex(p => p.name === patternName);
    if (index === -1) {
      return false;
    }
    
    this.patterns.splice(index, 1);
    this.logger.info(`[TodoParser] Removed pattern: ${patternName}`);
    return true;
  }

  /**
   * Get task type keywords
   * @returns {Object} Task type keywords
   */
  getTaskTypeKeywords() {
    return { ...this.taskTypeKeywords };
  }

  /**
   * Add task type keywords
   * @param {string} type - Task type
   * @param {Array} keywords - Keywords for the type
   */
  addTaskTypeKeywords(type, keywords) {
    if (!this.taskTypeKeywords[type]) {
      this.taskTypeKeywords[type] = [];
    }
    
    this.taskTypeKeywords[type].push(...keywords);
    this.logger.info(`[TodoParser] Added keywords for task type: ${type}`);
  }

  /**
   * Get parser statistics
   * @returns {Object} Parser stats
   */
  getStats() {
    return {
      patterns: this.patterns.length,
      taskTypes: Object.keys(this.taskTypeKeywords).length,
      totalKeywords: Object.values(this.taskTypeKeywords).flat().length
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    this.logger.info('[TodoParser] Cleaning up TODO parser...');
    // No specific cleanup needed for parser
  }
}

module.exports = TodoParser; 