const { spawn } = require('child_process');
const Logger = require('@logging/Logger');
const logger = new Logger('TerminalService');

class TerminalService {
  constructor() {
    this.activeProcesses = new Map();
  }

  async executeCommand(command, options = {}) {
    const {
      cwd = process.cwd(),
      timeout = 30000,
      env = process.env,
      shell = true
    } = options;

    return new Promise((resolve) => {
      logger.info(`🔧 Executing command: ${command}`);
      logger.debug(`📁 Working directory: ${cwd}`);
      logger.debug(`⏱️ Timeout: ${timeout}ms`);

      const processId = Date.now().toString();
      
      const childProcess = spawn(command, [], {
        cwd,
        env,
        shell,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.activeProcesses.set(processId, childProcess);

      let output = '';
      let errorOutput = '';
      let timeoutId;

      // Set timeout
      if (timeout > 0) {
        timeoutId = setTimeout(() => {
          logger.warn(`⏰ Command timeout after ${timeout}ms: ${command}`);
          this.killProcess(processId);
          resolve({
            success: false,
            error: `Command timeout after ${timeout}ms`,
            output: output,
            errorOutput: errorOutput,
            command: command
          });
        }, timeout);
      }

      // Handle stdout
      childProcess.stdout.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;
        logger.debug(`📤 STDOUT: ${chunk.trim()}`);
      });

      // Handle stderr
      childProcess.stderr.on('data', (data) => {
        const chunk = data.toString();
        errorOutput += chunk;
        logger.debug(`📤 STDERR: ${chunk.trim()}`);
      });

      // Handle process completion
      childProcess.on('close', (code) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        this.activeProcesses.delete(processId);

        const success = code === 0;
        
        if (success) {
          logger.info(`✅ Command completed successfully: ${command}`);
        } else {
          logger.warn(`⚠️ Command completed with code ${code}: ${command}`);
        }

        resolve({
          success,
          code,
          output: output.trim(),
          errorOutput: errorOutput.trim(),
          command: command
        });
      });

      // Handle process errors
      childProcess.on('error', (error) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        this.activeProcesses.delete(processId);
        
        logger.error(`❌ Command failed: ${command}`, error);
        
        resolve({
          success: false,
          error: error.message,
          output: output.trim(),
          errorOutput: errorOutput.trim(),
          command: command
        });
      });
    });
  }

  async executeCommandWithInput(command, input, options = {}) {
    const {
      cwd = process.cwd(),
      timeout = 30000,
      env = process.env,
      shell = true
    } = options;

    return new Promise((resolve) => {
      logger.info(`🔧 Executing command with input: ${command}`);
      logger.debug(`📁 Working directory: ${cwd}`);

      const processId = Date.now().toString();
      
      const childProcess = spawn(command, [], {
        cwd,
        env,
        shell,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.activeProcesses.set(processId, childProcess);

      let output = '';
      let errorOutput = '';
      let timeoutId;

      // Set timeout
      if (timeout > 0) {
        timeoutId = setTimeout(() => {
          logger.warn(`⏰ Command timeout after ${timeout}ms: ${command}`);
          this.killProcess(processId);
          resolve({
            success: false,
            error: `Command timeout after ${timeout}ms`,
            output: output,
            errorOutput: errorOutput,
            command: command
          });
        }, timeout);
      }

      // Send input to stdin
      if (input) {
        childProcess.stdin.write(input);
        childProcess.stdin.end();
      }

      // Handle stdout
      childProcess.stdout.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;
        logger.debug(`📤 STDOUT: ${chunk.trim()}`);
      });

      // Handle stderr
      childProcess.stderr.on('data', (data) => {
        const chunk = data.toString();
        errorOutput += chunk;
        logger.debug(`📤 STDERR: ${chunk.trim()}`);
      });

      // Handle process completion
      childProcess.on('close', (code) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        this.activeProcesses.delete(processId);

        const success = code === 0;
        
        if (success) {
          logger.info(`✅ Command with input completed successfully: ${command}`);
        } else {
          logger.warn(`⚠️ Command with input completed with code ${code}: ${command}`);
        }

        resolve({
          success,
          code,
          output: output.trim(),
          errorOutput: errorOutput.trim(),
          command: command,
          input: input
        });
      });

      // Handle process errors
      childProcess.on('error', (error) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        this.activeProcesses.delete(processId);
        
        logger.error(`❌ Command with input failed: ${command}`, error);
        
        resolve({
          success: false,
          error: error.message,
          output: output.trim(),
          errorOutput: errorOutput.trim(),
          command: command,
          input: input
        });
      });
    });
  }

  async executeCommandInteractive(command, options = {}) {
    const {
      cwd = process.cwd(),
      env = process.env,
      shell = true
    } = options;

    return new Promise((resolve) => {
      logger.info(`🔧 Starting interactive command: ${command}`);
      logger.debug(`📁 Working directory: ${cwd}`);

      const processId = Date.now().toString();
      
      const childProcess = spawn(command, [], {
        cwd,
        env,
        shell,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.activeProcesses.set(processId, childProcess);

      logger.info(`🔄 Interactive command started with PID: ${childProcess.pid}`);

      resolve({
        processId,
        pid: childProcess.pid,
        command: command,
        sendInput: (input) => {
          if (childProcess.stdin.writable) {
            childProcess.stdin.write(input);
            return true;
          }
          return false;
        },
        kill: () => this.killProcess(processId),
        isRunning: () => !childProcess.killed
      });
    });
  }

  killProcess(processId) {
    const childProcess = this.activeProcesses.get(processId);
    if (childProcess) {
      logger.info(`🛑 Killing process: ${processId}`);
      childProcess.kill('SIGTERM');
      this.activeProcesses.delete(processId);
      return true;
    }
    return false;
  }

  killAllProcesses() {
    logger.info(`🛑 Killing all active processes: ${this.activeProcesses.size}`);
    
    for (const [processId, childProcess] of this.activeProcesses) {
      try {
        childProcess.kill('SIGTERM');
      } catch (error) {
        logger.warn(`⚠️ Failed to kill process ${processId}:`, error.message);
      }
    }
    
    this.activeProcesses.clear();
  }

  getActiveProcesses() {
    return Array.from(this.activeProcesses.entries()).map(([processId, childProcess]) => ({
      processId,
      pid: childProcess.pid,
      killed: childProcess.killed
    }));
  }

  async checkCommandExists(command) {
    try {
      const { exec } = require('child_process');
      const util = require('util');
      const execAsync = util.promisify(exec);
      
      await execAsync(`which ${command}`);
      return true;
    } catch (error) {
      return false;
    }
  }

  async getCommandVersion(command) {
    try {
      const result = await this.executeCommand(`${command} --version`, { timeout: 5000 });
      if (result.success) {
        return result.output.trim();
      }
      return null;
    } catch (error) {
      return null;
    }
  }
}

module.exports = { TerminalService }; 