/**
 * Terminal Handler - Command Line Interface
 * 
 * Handles terminal interfaces for command execution.
 * Supports multiple shells and environments.
 */

const Logger = require('@logging/Logger');
const ServiceLogger = require('@logging/ServiceLogger');

class TerminalHandler {
  constructor(dependencies = {}) {
    this.logger = dependencies.logger || new ServiceLogger('TerminalHandler');
    this.processManager = dependencies.processManager;
    this.eventBus = dependencies.eventBus;
    this.serviceRegistry = dependencies.serviceRegistry;
    
    // Terminal state
    this.activeTerminals = new Map(); // terminalId -> terminal instance
    this.commandHistory = new Map(); // terminalId -> command history
  }

  /**
   * Create Terminal interface instance
   * @param {Object} config - Terminal configuration
   * @param {string} interfaceId - Interface ID
   * @returns {Promise<Object>} Terminal interface instance
   */
  async createInterface(config, interfaceId) {
    try {
      const { shell, workingDirectory, environment, maxHistory } = config;
      
      this.logger.info(`Creating Terminal interface: ${interfaceId}`, {
        shell,
        workingDirectory,
        environment: Object.keys(environment || {}).length
      });

      // Initialize terminal session
      const terminalSession = await this.initializeTerminalSession(config);
      
      // Store active terminal
      this.activeTerminals.set(interfaceId, {
        id: interfaceId,
        shell,
        workingDirectory,
        environment,
        maxHistory,
        session: terminalSession,
        status: 'running',
        createdAt: new Date()
      });

      return {
        id: interfaceId,
        type: 'terminal',
        shell,
        workingDirectory,
        status: 'running',
        createdAt: new Date()
      };

    } catch (error) {
      this.logger.error('Failed to create Terminal interface:', error);
      throw new Error(`Failed to create Terminal interface: ${error.message}`);
    }
  }

  /**
   * Initialize terminal session
   * @param {Object} config - Terminal configuration
   * @returns {Promise<Object>} Terminal session
   */
  async initializeTerminalSession(config) {
    try {
      const { shell, workingDirectory, environment } = config;
      
      this.logger.info(`Initializing ${shell} terminal in ${workingDirectory}`);

      if (!this.processManager) {
        throw new Error('Process Manager not available');
      }

      const session = await this.processManager.createTerminalSession({
        shell,
        workingDirectory,
        environment
      });
      
      this.logger.info(`${shell} terminal initialized`);
      
      return session;

    } catch (error) {
      this.logger.error('Failed to initialize terminal session:', error);
      throw new Error(`Failed to initialize terminal session: ${error.message}`);
    }
  }

  /**
   * Execute command in terminal
   * @param {string} terminalId - Terminal ID
   * @param {string} command - Command to execute
   * @returns {Promise<Object>} Execution result
   */
  async executeCommand(terminalId, command) {
    try {
      const terminal = this.activeTerminals.get(terminalId);
      
      if (!terminal) {
        throw new Error(`Terminal ${terminalId} not found`);
      }

      this.logger.info(`Executing command in ${terminal.shell}`, { terminalId, command });

      const result = await this.processManager.executeCommand(terminal.session, command);
      
      // Store in history
      if (!this.commandHistory.has(terminalId)) {
        this.commandHistory.set(terminalId, []);
      }
      
      const history = this.commandHistory.get(terminalId);
      history.push({
        command,
        output: result.output,
        exitCode: result.exitCode,
        timestamp: new Date()
      });
      
      // Limit history size
      if (history.length > terminal.maxHistory) {
        history.splice(0, history.length - terminal.maxHistory);
      }
      
      return result;

    } catch (error) {
      this.logger.error('Failed to execute command:', error);
      throw new Error(`Failed to execute command: ${error.message}`);
    }
  }

  /**
   * Get command history
   * @param {string} terminalId - Terminal ID
   * @returns {Array} Command history
   */
  getCommandHistory(terminalId) {
    return this.commandHistory.get(terminalId) || [];
  }

  /**
   * Get terminal status
   * @param {string} terminalId - Terminal ID
   * @returns {Promise<Object>} Terminal status
   */
  async getTerminalStatus(terminalId) {
    try {
      const terminal = this.activeTerminals.get(terminalId);
      
      if (!terminal) {
        throw new Error(`Terminal ${terminalId} not found`);
      }

      const status = await this.processManager.getTerminalStatus(terminal.session);
      
      return {
        terminalId,
        status: terminal.status,
        shell: terminal.shell,
        workingDirectory: terminal.workingDirectory,
        uptime: Date.now() - terminal.createdAt.getTime(),
        commandCount: this.commandHistory.get(terminalId)?.length || 0,
        ...status
      };

    } catch (error) {
      this.logger.error('Failed to get terminal status:', error);
      throw new Error(`Failed to get terminal status: ${error.message}`);
    }
  }

  /**
   * Change working directory
   * @param {string} terminalId - Terminal ID
   * @param {string} newDirectory - New directory path
   * @returns {Promise<Object>} Change result
   */
  async changeDirectory(terminalId, newDirectory) {
    try {
      const terminal = this.activeTerminals.get(terminalId);
      
      if (!terminal) {
        throw new Error(`Terminal ${terminalId} not found`);
      }

      const result = await this.executeCommand(terminalId, `cd "${newDirectory}"`);
      
      if (result.exitCode === 0) {
        terminal.workingDirectory = newDirectory;
      }
      
      return result;

    } catch (error) {
      this.logger.error('Failed to change directory:', error);
      throw new Error(`Failed to change directory: ${error.message}`);
    }
  }

  /**
   * Get available shells
   * @returns {Array} Available shells
   */
  getAvailableShells() {
    return [
      {
        name: 'bash',
        path: '/bin/bash',
        supported: true,
        features: ['history', 'completion', 'aliases']
      },
      {
        name: 'zsh',
        path: '/bin/zsh',
        supported: true,
        features: ['history', 'completion', 'themes']
      },
      {
        name: 'fish',
        path: '/usr/bin/fish',
        supported: true,
        features: ['syntax-highlighting', 'auto-suggestions']
      },
      {
        name: 'powershell',
        path: 'powershell.exe',
        supported: true,
        features: ['objects', 'pipeline', 'modules']
      },
      {
        name: 'cmd',
        path: 'cmd.exe',
        supported: true,
        features: ['batch', 'variables']
      }
    ];
  }

  /**
   * Get terminal statistics
   * @returns {Object} Terminal statistics
   */
  getTerminalStats() {
    return {
      activeTerminals: this.activeTerminals.size,
      totalCommands: Array.from(this.commandHistory.values()).reduce((total, history) => total + history.length, 0),
      shells: Array.from(this.activeTerminals.values()).reduce((shells, terminal) => {
        shells[terminal.shell] = (shells[terminal.shell] || 0) + 1;
        return shells;
      }, {}),
      lastActivity: new Date()
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    try {
      // Close all active terminals
      for (const [terminalId, terminal] of this.activeTerminals) {
        try {
          await this.processManager.closeTerminalSession(terminal.session);
        } catch (error) {
          this.logger.warn(`Failed to close terminal ${terminalId}:`, error.message);
        }
      }

      // Clear state
      this.activeTerminals.clear();
      this.commandHistory.clear();

      this.logger.info('Terminal Handler cleanup completed');

    } catch (error) {
      this.logger.error('Failed to cleanup Terminal Handler:', error);
    }
  }
}

module.exports = TerminalHandler;
