/**
 * GetIDESelectorsCommand - Application Layer: IDE Commands
 * Command for retrieving IDE selectors for automation
 */

const { v4: uuidv4 } = require('uuid');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

class GetIDESelectorsCommand {
  constructor(params = {}) {
    this.validateParams(params);
    
    this.commandId = params.commandId || uuidv4();
    this.type = 'GetIDESelectorsCommand';
    this.timestamp = new Date();
    
    // Command parameters
    this.userId = params.userId;
    this.ideType = params.ideType; // 'cursor', 'vscode', 'windsurf'
    this.selectorType = params.selectorType; // 'chat', 'terminal', 'file-explorer', 'command-palette', 'all'
    this.options = params.options || {};
    this.metadata = params.metadata || {};
    
    this.logger = params.logger || logger;
  }

  /**
   * Validate command parameters
   * @param {Object} params - Command parameters
   */
  validateParams(params) {
    const errors = [];

    if (!params.userId) {
      errors.push('User ID is required');
    }

    if (params.ideType && !['cursor', 'vscode', 'windsurf'].includes(params.ideType)) {
      errors.push('IDE type must be one of: cursor, vscode, windsurf');
    }

    if (params.selectorType && !['chat', 'terminal', 'file-explorer', 'command-palette', 'all'].includes(params.selectorType)) {
      errors.push('Selector type must be one of: chat, terminal, file-explorer, command-palette, all');
    }

    if (errors.length > 0) {
      throw new Error(`GetIDESelectorsCommand validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Validate command for execution
   * @returns {Promise<Object>} Validation result
   */
  async validate() {
    try {
      // Additional runtime validation
      if (this.selectorType && this.selectorType !== 'all' && !['chat', 'terminal', 'file-explorer', 'command-palette'].includes(this.selectorType)) {
        return {
          isValid: false,
          errors: [`Selector type '${this.selectorType}' is not supported`]
        };
      }

      return {
        isValid: true,
        errors: []
      };
    } catch (error) {
      this.logger.error('Validation error:', error);
      return {
        isValid: false,
        errors: [error.message]
      };
    }
  }

  /**
   * Execute the command
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} Execution result
   */
  async execute(context = {}) {
    try {
      this.logger.info('Executing command', {
        commandId: this.commandId,
        userId: this.userId,
        ideType: this.ideType,
        selectorType: this.selectorType
      });

      // Validate command
      const validationResult = await this.validate();
      if (!validationResult.isValid) {
        throw new Error(`Command validation failed: ${validationResult.errors.join(', ')}`);
      }

      // Publish event
      if (context.eventBus) {
        await context.eventBus.publish('ide.selectors.retrieving', {
          commandId: this.commandId,
          userId: this.userId,
          ideType: this.ideType,
          selectorType: this.selectorType,
          timestamp: new Date()
        });
      }

      // Execute selector retrieval logic
      const selectors = this.getSelectors();
      
      const result = {
        success: true,
        commandId: this.commandId,
        ideType: this.ideType,
        selectorType: this.selectorType,
        selectors: selectors,
        message: `Successfully retrieved selectors for ${this.selectorType || 'all'} components`,
        metadata: {
          ...this.metadata,
          executionTime: new Date(),
          context: context
        }
      };

      // Publish success event
      if (context.eventBus) {
        await context.eventBus.publish('ide.selectors.retrieved', {
          commandId: this.commandId,
          userId: this.userId,
          ideType: this.ideType,
          selectorType: this.selectorType,
          selectors: selectors,
          result: result,
          timestamp: new Date()
        });
      }

      this.logger.info('Command executed successfully', {
        commandId: this.commandId,
        result: result
      });

      return result;

    } catch (error) {
      this.logger.error('Command execution failed:', error);

      // Publish failure event
      if (context.eventBus) {
        await context.eventBus.publish('ide.selectors.retrieval.failed', {
          commandId: this.commandId,
          userId: this.userId,
          ideType: this.ideType,
          selectorType: this.selectorType,
          error: error.message,
          timestamp: new Date()
        });
      }

      throw error;
    }
  }

  /**
   * Get selectors based on IDE type and selector type
   * @returns {Object} Selectors object
   */
  getSelectors() {
    const ideType = this.ideType || 'cursor';
    const selectorType = this.selectorType || 'all';

    const allSelectors = {
      cursor: {
        chat: {
          input: '[data-testid="chat-input"]',
          sendButton: '[data-testid="send-button"]',
          messages: '[data-testid="chat-messages"]',
          newChatButton: '[data-testid="new-chat-button"]'
        },
        terminal: {
          container: '[data-testid="terminal-container"]',
          input: '[data-testid="terminal-input"]',
          output: '[data-testid="terminal-output"]',
          toggleButton: '[data-testid="terminal-toggle"]'
        },
        'file-explorer': {
          container: '[data-testid="file-explorer"]',
          tree: '[data-testid="file-tree"]',
          files: '[data-testid="file-item"]',
          folders: '[data-testid="folder-item"]'
        },
        'command-palette': {
          container: '[data-testid="command-palette"]',
          input: '[data-testid="command-input"]',
          results: '[data-testid="command-results"]',
          trigger: '[data-testid="command-trigger"]'
        }
      },
      vscode: {
        chat: {
          input: '.chat-input',
          sendButton: '.chat-send-button',
          messages: '.chat-messages',
          newChatButton: '.new-chat-button'
        },
        terminal: {
          container: '.terminal-container',
          input: '.terminal-input',
          output: '.terminal-output',
          toggleButton: '.terminal-toggle'
        },
        'file-explorer': {
          container: '.file-explorer',
          tree: '.file-tree',
          files: '.file-item',
          folders: '.folder-item'
        },
        'command-palette': {
          container: '.command-palette',
          input: '.command-input',
          results: '.command-results',
          trigger: '.command-trigger'
        }
      },
      windsurf: {
        chat: {
          input: '.windsurf-chat-input',
          sendButton: '.windsurf-chat-send',
          messages: '.windsurf-chat-messages',
          newChatButton: '.windsurf-new-chat'
        },
        terminal: {
          container: '.windsurf-terminal',
          input: '.windsurf-terminal-input',
          output: '.windsurf-terminal-output',
          toggleButton: '.windsurf-terminal-toggle'
        },
        'file-explorer': {
          container: '.windsurf-file-explorer',
          tree: '.windsurf-file-tree',
          files: '.windsurf-file-item',
          folders: '.windsurf-folder-item'
        },
        'command-palette': {
          container: '.windsurf-command-palette',
          input: '.windsurf-command-input',
          results: '.windsurf-command-results',
          trigger: '.windsurf-command-trigger'
        }
      }
    };

    if (selectorType === 'all') {
      return allSelectors[ideType];
    } else {
      return {
        [selectorType]: allSelectors[ideType][selectorType]
      };
    }
  }

  /**
   * Get command metadata
   * @returns {Object} Command metadata
   */
  getMetadata() {
    return {
      id: this.commandId,
      type: this.type,
      timestamp: this.timestamp,
      userId: this.userId,
      ideType: this.ideType,
      selectorType: this.selectorType,
      options: this.options,
      metadata: this.metadata
    };
  }

  /**
   * Create command from parameters
   * @param {Object} params - Command parameters
   * @returns {GetIDESelectorsCommand} Command instance
   */
  static create(params) {
    return new GetIDESelectorsCommand(params);
  }
}

module.exports = GetIDESelectorsCommand; 