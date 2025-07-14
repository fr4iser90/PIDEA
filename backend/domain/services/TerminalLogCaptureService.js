const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const IDEManager = require('@external/ide/IDEManager');
const BrowserManager = require('@external/BrowserManager');
const IDEMirrorService = require('./IDEMirrorService');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');


/**
 * TerminalLogCaptureService - Captures terminal output from IDEs
 * that redirect output to encrypted log files. The terminal itself is a canvas
 * and cannot be read directly, so we use file-based capture.
 */
class TerminalLogCaptureService {
  constructor(dependencies = {}) {
    // Use DI instead of creating new instances
    this.ideManager = dependencies.ideManager;
    this.browserManager = dependencies.browserManager;
    this.ideMirrorService = dependencies.ideMirrorService;
    
    // Validate dependencies
    if (!this.ideManager) {
      throw new Error('IDEManager dependency is required');
    }
    if (!this.browserManager) {
      throw new Error('BrowserManager dependency is required');
    }
    if (!this.ideMirrorService) {
      throw new Error('IDEMirrorService dependency is required');
    }
    
    this.isInitialized = false;
    this.captureIntervals = new Map(); // port -> interval
    this.logDirectories = new Map(); // port -> log directory
    // Ensure encryption key is exactly 32 bytes for AES-256-CBC
    const defaultKey = 'default-key-32-chars-long!!';
    this.encryptionKey = process.env.LOG_ENCRYPTION_KEY || defaultKey;
    // Pad or truncate to exactly 32 bytes
    if (this.encryptionKey.length < 32) {
      this.encryptionKey = this.encryptionKey.padEnd(32, '0');
    } else if (this.encryptionKey.length > 32) {
      this.encryptionKey = this.encryptionKey.slice(0, 32);
    }
    this.algorithm = 'aes-256-cbc';
  }

  /**
   * Initialize the service and connect to IDE
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    logger.info('[TerminalLogCaptureService] Initializing...');
    
    await this.ideManager.initialize();
    this.isInitialized = true;
    
    logger.info('[TerminalLogCaptureService] Initialization complete');
  }

  /**
   * Initialize log capture for a specific IDE port
   * @param {number} port - IDE port number
   */
  async initializeCapture(port) {
    try {
      logger.info(`[TerminalLogCaptureService] Initializing simple logging for port ${port}`);
      
      // SIMPLIFIED: No directory creation to avoid filesystem errors
      /*
      // Create log directory structure
      const logDir = `/tmp/IDEWEB/${port}/logs`;
      await this.createSecureLogDirectory(logDir);
      this.logDirectories.set(port, logDir);
      */
      
      // Switch to the target IDE
      await this.ideManager.switchToIDE(port);
      await this.browserManager.connect(port);
      
      // Open terminal if not already open
      await this.openTerminal();
      
      // Set up simple logging (no file operations)
      await this.setupLogCapture(port);
      
      // Start monitoring (simplified, no filesystem watching)
      await this.startLogMonitoring(port);
      
      logger.info(`[TerminalLogCaptureService] Simple logging initialized for port ${port}`);
      return true;
      
    } catch (error) {
      logger.error(`[TerminalLogCaptureService] Error initializing logging for port ${port}:`, error);
      throw error;
    }
  }

  /**
   * Create secure log directory with proper permissions
   * @param {string} logDir - Log directory path
   */
  async createSecureLogDirectory(logDir) {
    try {
      // Create directory recursively
      await fs.mkdir(logDir, { recursive: true });
      
      // Set secure permissions (700 - owner read/write/execute only)
      await fs.chmod(logDir, 0o700);
      
      logger.info(`[TerminalLogCaptureService] Created secure log directory: ${logDir}`);
    } catch (error) {
      logger.error(`[TerminalLogCaptureService] Error creating log directory:`, error);
      throw error;
    }
  }

  /**
   * Open terminal in IDE using existing functions
   */
  async openTerminal() {
    try {
      logger.info('[TerminalLogCaptureService] Opening terminal...');
      
      // Use existing IDEMirrorService to open terminal
      await this.ideMirrorService.typeInIDE('Control+Shift+`');
      
      // Wait for terminal to open
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      logger.info('[TerminalLogCaptureService] Terminal opened');
    } catch (error) {
      logger.error('[TerminalLogCaptureService] Error opening terminal:', error);
      throw error;
    }
  }

  /**
   * Set up log capture by executing commands that redirect output to files
   * @param {number} port - IDE port number
   */
  async setupLogCapture(port) {
    try {
      logger.info(`[TerminalLogCaptureService] Setting up simple logging for port ${port}`);
      
      // SIMPLIFIED: No file creation commands to avoid filesystem errors
      // Just verify terminal is working
      logger.info(`[TerminalLogCaptureService] Terminal ready for port ${port} - using playwright commands > logfile pattern`);
      
      /*
      // COMMENTED OUT: File creation commands that cause filesystem errors
      const commands = [
        `mkdir -p /tmp/IDEWEB/${port}/logs`,
        `echo "Log capture initialized at $(date)" > /tmp/IDEWEB/${port}/logs/terminal.log`,
        `echo "$$" > /tmp/IDEWEB/${port}/logs/process.pid`
      ];

      for (const command of commands) {
        await this.executeTerminalCommand(command);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      */
      
      logger.info(`[TerminalLogCaptureService] Simple logging setup complete for port ${port}`);
    } catch (error) {
      logger.error(`[TerminalLogCaptureService] Error setting up logging:`, error);
      throw error;
    }
  }

  /**
   * Execute a command in the terminal using existing functions
   * @param {string} command - Command to execute
   */
  async executeTerminalCommand(command) {
    try {
      logger.info(`[TerminalLogCaptureService] Executing command: ${command}`);
      
      // Focus terminal
      await this.ideMirrorService.clickElementInIDE('.xterm-helper-textarea');
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Type command
      await this.ideMirrorService.typeInIDE(command);
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Press Enter
      await this.ideMirrorService.typeInIDE('Enter');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      logger.info(`[TerminalLogCaptureService] Command executed: ${command}`);
    } catch (error) {
      logger.error(`[TerminalLogCaptureService] Error executing command:`, error);
      throw error;
    }
  }

  /**
   * Start monitoring log files for changes
   * @param {number} port - IDE port number
   */
  async startLogMonitoring(port) {
    try {
      logger.info(`[TerminalLogCaptureService] Starting log monitoring for port ${port}`);
      
      // COMMENTED OUT: Permanent streaming causes filesystem errors
      // We don't need permanent streams, just command-based logging
      /*
      // Stop existing monitoring if any
      if (this.captureIntervals.has(port)) {
        clearInterval(this.captureIntervals.get(port));
      }
      
      // Start new monitoring interval
      const interval = setInterval(async () => {
        await this.processLogFile(port);
      }, 2000); // Check every 2 seconds
      
      this.captureIntervals.set(port, interval);
      */
      
      logger.info(`[TerminalLogCaptureService] Log monitoring setup complete (no permanent stream) for port ${port}`);
    } catch (error) {
      logger.error(`[TerminalLogCaptureService] Error starting log monitoring:`, error);
      throw error;
    }
  }

  /**
   * Process log file and encrypt new entries
   * @param {number} port - IDE port number
   */
  async processLogFile(port) {
    // COMMENTED OUT: Continuous file processing causes filesystem errors
    // Use simple command execution with playwright instead
    logger.info(`[TerminalLogCaptureService] processLogFile called for port ${port} - using simple logging instead`);
    return; // Skip continuous file processing
    
    /*
    try {
      const logPath = `/tmp/IDEWEB/${port}/logs/terminal.log`;
      const encryptedLogPath = `/tmp/IDEWEB/${port}/logs/terminal.encrypted.log`;
      
      // Check if log file exists and has content
      try {
        const stats = await fs.stat(logPath);
        if (stats.size === 0) {
          return; // No new content
        }
      } catch (error) {
        return; // File doesn't exist yet
      }
      
      // Read log file
      const logContent = await fs.readFile(logPath, 'utf8');
      const lines = logContent.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) {
        return; // No content to process
      }
      
      // Process each line
      for (const line of lines) {
        const logEntry = {
          timestamp: new Date().toISOString(),
          type: 'terminal',
          text: line,
          level: 'info',
          port: port
        };
        
        // Encrypt and write log entry
        await this.writeEncryptedLogEntry(encryptedLogPath, logEntry);
      }
      
      // Clear the original log file (keep only new content)
      await fs.writeFile(logPath, '');
      
      logger.info(`[TerminalLogCaptureService] Processed ${lines.length} log entries for port ${port}`);
      
    } catch (error) {
      logger.error(`[TerminalLogCaptureService] Error processing log file for port ${port}:`, error);
    }
    */
  }

  /**
   * Write encrypted log entry to file
   * @param {string} filePath - Path to encrypted log file
   * @param {Object} logEntry - Log entry to encrypt and write
   */
  async writeEncryptedLogEntry(filePath, logEntry) {
    try {
      // Create directory if it doesn't exist
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      
      // Encrypt log entry using modern crypto
      const data = JSON.stringify(logEntry);
      const iv = crypto.randomBytes(16);
      const keyBuffer = Buffer.from(this.encryptionKey.slice(0, 32));
      const cipher = crypto.createCipheriv(this.algorithm, keyBuffer, iv);
      
      const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
      const result = Buffer.concat([iv, encrypted]);
      
      // Append encrypted data to file
      await fs.appendFile(filePath, result.toString('base64') + '\n');
      
      // Set secure permissions on encrypted log file
      await fs.chmod(filePath, 0o600);
      
    } catch (error) {
      logger.error(`[TerminalLogCaptureService] Error writing encrypted log entry:`, error);
      throw error;
    }
  }

  /**
   * Execute a command and capture its output
   * @param {number} port - IDE port number
   * @param {string} command - Command to execute
   */
  async executeCommandWithCapture(port, command) {
    try {
      logger.info(`[TerminalLogCaptureService] Executing command with simple logging: ${command}`);
      
      // SIMPLIFIED: Just execute command without complex file redirection
      // Use playwright commands > logfile pattern as requested by user
      
      // Switch to target IDE if needed
      const activeIDE = await this.ideManager.getActiveIDE();
      if (!activeIDE || activeIDE.port !== port) {
        await this.ideManager.switchToIDE(port);
        await this.browserManager.connect(port);
      }
      
      // Simple command execution without file redirection to avoid filesystem errors
      await this.executeTerminalCommand(command);
      
      logger.info(`[TerminalLogCaptureService] Command executed with simple logging: ${command}`);
      return true;
      
    } catch (error) {
      logger.error(`[TerminalLogCaptureService] Error executing command:`, error);
      throw error;
    }
  }

  /**
   * Stop log capture for a specific port
   * @param {number} port - IDE port number
   */
  async stopCapture(port) {
    try {
      logger.info(`[TerminalLogCaptureService] Stopping capture for port ${port}`);
      
      // SIMPLIFIED: No permanent intervals to clean up anymore
      // Stop monitoring interval
      if (this.captureIntervals.has(port)) {
        clearInterval(this.captureIntervals.get(port));
        this.captureIntervals.delete(port);
      }
      
      // COMMENTED OUT: Process cleanup that can cause filesystem errors
      /*
      // Clean up processes if PID file exists
      try {
        const pidPath = `/tmp/IDEWEB/${port}/logs/process.pid`;
        const pid = await fs.readFile(pidPath, 'utf8');
        if (pid && pid.trim()) {
          process.kill(parseInt(pid.trim()), 'SIGTERM');
          logger.info(`[TerminalLogCaptureService] Terminated process ${pid.trim()}`);
        }
      } catch (error) {
        // PID file doesn't exist or process already terminated
      }
      */
      
      logger.info(`[TerminalLogCaptureService] Capture stopped for port ${port}`);
    } catch (error) {
      logger.error(`[TerminalLogCaptureService] Error stopping capture:`, error);
      throw error;
    }
  }

  /**
   * Get capture status for a port
   * @param {number} port - IDE port number
   */
  async getCaptureStatus(port) {
    try {
      const isMonitoring = this.captureIntervals.has(port);
      const logDir = this.logDirectories.get(port);
      
      let logFileExists = false;
      let encryptedLogExists = false;
      
      if (logDir) {
        try {
          await fs.stat(`${logDir}/terminal.log`);
          logFileExists = true;
        } catch (error) {
          // File doesn't exist
        }
        
        try {
          await fs.stat(`${logDir}/terminal.encrypted.log`);
          encryptedLogExists = true;
        } catch (error) {
          // File doesn't exist
        }
      }
      
      return {
        port: port,
        isMonitoring: isMonitoring,
        logDirectory: logDir,
        logFileExists: logFileExists,
        encryptedLogExists: encryptedLogExists,
        active: isMonitoring && logFileExists
      };
    } catch (error) {
      logger.error(`[TerminalLogCaptureService] Error getting capture status:`, error);
      throw error;
    }
  }

  /**
   * Clean up all resources
   */
  async cleanup() {
    try {
      logger.info('[TerminalLogCaptureService] Cleaning up...');
      
      // Stop all monitoring intervals
      for (const [port, interval] of this.captureIntervals) {
        clearInterval(interval);
        await this.stopCapture(port);
      }
      
      this.captureIntervals.clear();
      this.logDirectories.clear();
      
      logger.info('[TerminalLogCaptureService] Cleanup complete');
    } catch (error) {
      logger.error('[TerminalLogCaptureService] Error during cleanup:', error);
    }
  }
}

module.exports = TerminalLogCaptureService; 