const { BaseStep } = require('@/domain/steps/BaseStep');
const { ProjectRepository } = require('@/domain/repositories/ProjectRepository');
const { TerminalService } = require('@/domain/services/TerminalService');
const logger = require('@/infrastructure/logging/logger');

class ProjectTestStep extends BaseStep {
  constructor() {
    super({
      name: 'ProjectTestStep',
      description: 'Run project tests using configured test command',
      category: 'testing',
      settings: {
        includeCoverage: true,
        includeWatchMode: false,
        includeVerboseOutput: false,
        includeTestResults: true,
        timeout: 120000
      }
    });
  }

  async execute(context) {
    try {
      const { projectId, workspacePath } = context;
      
      logger.info(`🧪 Running tests for project ${projectId}`);
      
      // 1. Get project configuration from database
      const projectRepo = new ProjectRepository();
      const project = await projectRepo.findById(projectId);
      
      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }
      
      // 2. Get test command from project config
      const testCommand = project.test_command || 'npm test';
      const packageManager = project.package_manager || 'npm';
      
      logger.info(`📦 Using package manager: ${packageManager}`);
      logger.info(`🧪 Test command: ${testCommand}`);
      
      // 3. Build enhanced test command based on settings
      const enhancedCommand = this.buildTestCommand(testCommand);
      logger.info(`🔧 Enhanced command: ${enhancedCommand}`);
      
      // 4. Run tests
      const terminalService = new TerminalService();
      const result = await terminalService.executeCommand(enhancedCommand, {
        cwd: workspacePath,
        timeout: this.settings.timeout,
        env: {
          ...process.env,
          NODE_ENV: 'test',
          CI: 'true' // Ensure consistent test environment
        }
      });
      
      // 5. Parse test results
      const testResults = this.parseTestResults(result.output, result.success);
      
      if (result.success) {
        logger.info('✅ Tests passed successfully');
        
        return {
          success: true,
          message: 'Tests passed successfully',
          data: {
            status: 'passed',
            command: enhancedCommand,
            output: result.output,
            testResults: testResults,
            coverage: testResults.coverage
          }
        };
      } else {
        logger.warn('⚠️ Tests failed or had issues');
        
        return {
          success: false,
          message: 'Tests failed or had issues',
          error: result.error,
          data: {
            status: 'failed',
            command: enhancedCommand,
            output: result.output,
            testResults: testResults,
            coverage: testResults.coverage
          }
        };
      }
      
    } catch (error) {
      logger.error('❌ Failed to run tests:', error);
      
      return {
        success: false,
        message: 'Failed to run tests',
        error: error.message,
        data: {
          status: 'error',
          command: context.testCommand || 'npm test'
        }
      };
    }
  }

  buildTestCommand(baseCommand) {
    let command = baseCommand;
    
    // Add coverage if enabled
    if (this.settings.includeCoverage) {
      if (command.includes('npm test')) {
        command = command.replace('npm test', 'npm run test:coverage');
      } else if (command.includes('yarn test')) {
        command = command.replace('yarn test', 'yarn test --coverage');
      } else if (command.includes('pnpm test')) {
        command = command.replace('pnpm test', 'pnpm test --coverage');
      } else if (!command.includes('--coverage')) {
        command += ' --coverage';
      }
    }
    
    // Add watch mode if enabled
    if (this.settings.includeWatchMode) {
      if (!command.includes('--watch') && !command.includes('watch')) {
        command += ' --watch';
      }
    }
    
    // Add verbose output if enabled
    if (this.settings.includeVerboseOutput) {
      if (!command.includes('--verbose')) {
        command += ' --verbose';
      }
    }
    
    return command;
  }

  parseTestResults(output, success) {
    const results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0,
      coverage: null,
      duration: null,
      errors: []
    };
    
    if (!output) {
      return results;
    }
    
    const lines = output.split('\n');
    
    // Parse Jest-style output
    for (const line of lines) {
      // Test counts
      const testMatch = line.match(/(\d+) tests? passed, (\d+) tests? failed/);
      if (testMatch) {
        results.passed = parseInt(testMatch[1]);
        results.failed = parseInt(testMatch[2]);
        results.total = results.passed + results.failed;
      }
      
      // Coverage
      const coverageMatch = line.match(/All files\s+\|\s+(\d+(?:\.\d+)?)%/);
      if (coverageMatch) {
        results.coverage = parseFloat(coverageMatch[1]);
      }
      
      // Duration
      const durationMatch = line.match(/Time:\s+(\d+(?:\.\d+)?)s/);
      if (durationMatch) {
        results.duration = parseFloat(durationMatch[1]);
      }
      
      // Errors
      if (line.includes('FAIL') || line.includes('Error:')) {
        results.errors.push(line.trim());
      }
    }
    
    // Fallback parsing for different test runners
    if (results.total === 0) {
      // Try to parse other formats
      const totalMatch = output.match(/(\d+) tests?/);
      if (totalMatch) {
        results.total = parseInt(totalMatch[1]);
        results.passed = success ? results.total : 0;
        results.failed = success ? 0 : results.total;
      }
    }
    
    return results;
  }
}

module.exports = ProjectTestStep; 