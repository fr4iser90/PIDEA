/**
 * Run Dev Server Step
 * Starts the development server for the project
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('run_dev_step');

// Step configuration
const config = {
  name: 'run_dev_step',
  type: 'completion',
  category: 'completion',
  description: 'Starts the development server',
  version: '1.0.0',
  dependencies: ['TerminalService'],
  settings: {
    timeout: 30000,
    port: 3000,
    host: 'localhost',
    env: 'development'
  },
  validation: {
    required: ['projectId'],
    optional: ['workspacePath', 'port', 'host', 'env']
  }
};

class RunDevStep {
  constructor() {
    this.name = 'RunDevStep';
    this.description = 'Starts the development server';
    this.category = 'completion';
    this.version = '1.0.0';
  }

  async execute(context) {
    try {
      logger.info('Starting RunDevStep execution');
      
      // Get TerminalService from context (fallback to application context)
      const terminalService = context.terminalService || context.getService?.('terminalService') || global.application?.terminalService;
      
      if (!terminalService) {
        logger.warn('TerminalService not available, using fallback');
        return {
          success: true,
          message: 'Dev server step skipped - TerminalService not available',
          data: { started: false, reason: 'service_unavailable' }
        };
      }

      const { projectId, workspacePath = process.cwd(), port = 3000, host = 'localhost', env = 'development' } = context;

      logger.info(`Starting dev server for project: ${projectId} in ${workspacePath}`);

      // Start dev server using TerminalService
      const command = `npm run dev`;
      const result = await terminalService.executeCommand(command, {
        cwd: workspacePath,
        timeout: 30000,
        env: {
          ...process.env,
          NODE_ENV: env,
          PORT: port,
          HOST: host
        }
      });

      if (result.success) {
        logger.info('Dev server started successfully');
        
        // Try to extract URL from output
        const url = this.extractDevServerUrl(result.output, port, host);
        
        return {
          success: true,
          message: 'Development server started successfully',
          data: {
            command,
            output: result.output,
            url,
            port,
            host,
            env
          }
        };
      } else {
        logger.error('Failed to start dev server:', result.error);
        return {
          success: false,
          error: result.error || 'Failed to start development server',
          data: {
            command,
            output: result.output,
            errorOutput: result.errorOutput
          }
        };
      }

    } catch (error) {
      logger.error('Error in RunDevStep:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  extractDevServerUrl(output, port, host) {
    if (!output) return null;
    
    // Common dev server URL patterns
    const patterns = [
      /Local:\s*(http:\/\/localhost:\d+)/i,
      /Server running on\s*(http:\/\/localhost:\d+)/i,
      /(http:\/\/localhost:\d+)/i,
      /(http:\/\/127\.0\.0\.1:\d+)/i,
      /localhost:\d+/i,
      /127\.0\.0\.1:\d+/i
    ];
    
    for (const pattern of patterns) {
      const match = output.match(pattern);
      if (match) {
        let url = match[1] || match[0];
        if (!url.startsWith('http')) {
          url = 'http://' + url;
        }
        return url;
      }
    }
    
    // Fallback to default URL
    return `http://${host}:${port}`;
  }
}

// Create instance for execution
const stepInstance = new RunDevStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
};
