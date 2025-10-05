const Logger = require('@logging/Logger');
const PlaywrightTestApplicationService = require('@application/services/PlaywrightTestApplicationService');

const logger = new Logger('PlaywrightTestHandler');

/**
 * Playwright Test Handler
 * 
 * Handles Playwright test execution commands following the existing
 * HandlerRegistry pattern and categories/testing/ organization.
 */
class PlaywrightTestHandler {
  constructor(dependencies = {}) {
    this.logger = dependencies.logger || logger;
    this.playwrightTestService = dependencies.playwrightTestService || new PlaywrightTestApplicationService(dependencies);
    
    this.logger.info('PlaywrightTestHandler initialized');
  }
  
  /**
   * Handle test execution command
   * @param {Object} command - Test execution command
   * @returns {Promise<Object>} Execution result
   */
  async handleExecuteTests(command) {
    try {
      this.logger.info('Handling execute tests command', {
        projectId: command.projectId,
        testName: command.testName,
        options: command.options
      });
      
      const { projectId, testName, options = {} } = command;
      
      if (!projectId) {
        throw new Error('Project ID is required');
      }
      
      // Execute tests using application service
      const result = await this.playwrightTestService.executeTests(projectId, {
        ...options,
        testName
      });
      
      this.logger.info('Test execution completed', {
        projectId,
        success: result.success,
        duration: result.duration
      });
      
      return {
        success: true,
        command: 'executeTests',
        result,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      this.logger.error('Failed to handle execute tests command', error);
      throw error;
    }
  }
  
  /**
   * Handle get test results command
   * @param {Object} command - Get results command
   * @returns {Promise<Object>} Results
   */
  async handleGetTestResults(command) {
    try {
      this.logger.info('Handling get test results command', {
        testId: command.testId
      });
      
      const { testId } = command;
      
      if (!testId) {
        throw new Error('Test ID is required');
      }
      
      // Get test results using application service
      const result = await this.playwrightTestService.getTestResults(testId);
      
      this.logger.info('Test results retrieved', {
        testId,
        success: result.success
      });
      
      return {
        success: true,
        command: 'getTestResults',
        result,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      this.logger.error('Failed to handle get test results command', error);
      throw error;
    }
  }
  
  /**
   * Handle get all test results command
   * @param {Object} command - Get all results command
   * @returns {Promise<Object>} All results
   */
  async handleGetAllTestResults(command) {
    try {
      this.logger.info('Handling get all test results command');
      
      // Get all test results using application service
      const result = await this.playwrightTestService.getAllTestResults();
      
      this.logger.info('All test results retrieved', {
        count: result.count,
        success: result.success
      });
      
      return {
        success: true,
        command: 'getAllTestResults',
        result,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      this.logger.error('Failed to handle get all test results command', error);
      throw error;
    }
  }
  
  /**
   * Handle stop tests command
   * @param {Object} command - Stop tests command
   * @returns {Promise<Object>} Stop result
   */
  async handleStopTests(command) {
    try {
      this.logger.info('Handling stop tests command', {
        testId: command.testId
      });
      
      const { testId } = command;
      
      // Stop tests using application service
      const result = await this.playwrightTestService.stopTests(testId);
      
      this.logger.info('Tests stopped', {
        testId,
        success: result.success
      });
      
      return {
        success: true,
        command: 'stopTests',
        result,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      this.logger.error('Failed to handle stop tests command', error);
      throw error;
    }
  }
  
  /**
   * Handle get test runner status command
   * @param {Object} command - Get status command
   * @returns {Promise<Object>} Status result
   */
  async handleGetTestRunnerStatus(command) {
    try {
      this.logger.info('Handling get test runner status command');
      
      // Get test runner status using application service
      const result = await this.playwrightTestService.getTestRunnerStatus();
      
      this.logger.info('Test runner status retrieved', {
        success: result.success,
        isRunning: result.status?.isRunning
      });
      
      return {
        success: true,
        command: 'getTestRunnerStatus',
        result,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      this.logger.error('Failed to handle get test runner status command', error);
      throw error;
    }
  }
  
  /**
   * Handle validate login credentials command
   * @param {Object} command - Validate credentials command
   * @returns {Promise<Object>} Validation result
   */
  async handleValidateLoginCredentials(command) {
    try {
      this.logger.info('Handling validate login credentials command', {
        projectId: command.projectId
      });
      
      const { projectId, credentials } = command;
      
      if (!projectId) {
        throw new Error('Project ID is required');
      }
      
      if (!credentials) {
        throw new Error('Credentials are required');
      }
      
      // Validate credentials using application service
      const result = await this.playwrightTestService.validateLoginCredentials(projectId, credentials);
      
      this.logger.info('Login credentials validated', {
        projectId,
        success: result.success
      });
      
      return {
        success: true,
        command: 'validateLoginCredentials',
        result,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      this.logger.error('Failed to handle validate login credentials command', error);
      throw error;
    }
  }
  
  /**
   * Handle configuration management commands
   * @param {Object} command - Configuration command
   * @returns {Promise<Object>} Configuration result
   */
  async handleConfigurationCommand(command) {
    try {
      this.logger.info('Handling configuration command', {
        action: command.action,
        projectId: command.projectId
      });
      
      const { action, projectId, config, workspacePath } = command;
      
      if (!projectId) {
        throw new Error('Project ID is required');
      }
      
      switch (action) {
        case 'get':
          return await this.handleGetConfiguration(projectId, workspacePath);
        case 'update':
          return await this.handleUpdateConfiguration(projectId, config, workspacePath);
        case 'validate':
          return await this.handleValidateConfiguration(config);
        default:
          throw new Error(`Unknown configuration action: ${action}`);
      }
      
    } catch (error) {
      this.logger.error('Failed to handle configuration command', error);
      throw error;
    }
  }
  
  /**
   * Handle get configuration
   * @param {string} projectId - Project ID
   * @returns {Promise<Object>} Configuration
   */
  async handleGetConfiguration(projectId, workspacePath) {
    try {
      // Use provided workspace path
      if (!workspacePath) {
        throw new Error(`Workspace path is required for project: ${projectId}`);
      }
      
      // Load configuration
      const config = await this.playwrightTestService.loadProjectConfiguration(workspacePath);
      
      return {
        success: true,
        command: 'getConfiguration',
        result: {
          projectId,
          config,
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      this.logger.error('Failed to get configuration', error);
      throw error;
    }
  }
  
  /**
   * Handle update configuration
   * @param {string} projectId - Project ID
   * @param {Object} config - New configuration
   * @returns {Promise<Object>} Update result
   */
  async handleUpdateConfiguration(projectId, config, workspacePath) {
    try {
      // Use provided workspace path
      if (!workspacePath) {
        throw new Error(`Workspace path is required for project: ${projectId}`);
      }
      
      // Validate configuration
      const validation = this.playwrightTestService.testManager.validateTestConfig(config);
      if (!validation.valid) {
        throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
      }
      
      // Save configuration
      await this.playwrightTestService.testManager.saveTestConfig(workspacePath, config);
      
      return {
        success: true,
        command: 'updateConfiguration',
        result: {
          projectId,
          message: 'Configuration updated successfully',
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      this.logger.error('Failed to update configuration', error);
      throw error;
    }
  }
  
  /**
   * Handle validate configuration
   * @param {Object} config - Configuration to validate
   * @returns {Promise<Object>} Validation result
   */
  async handleValidateConfiguration(config) {
    try {
      // Validate configuration
      const validation = this.playwrightTestService.testManager.validateTestConfig(config);
      
      return {
        success: true,
        command: 'validateConfiguration',
        result: {
          valid: validation.valid,
          errors: validation.errors,
          warnings: validation.warnings,
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      this.logger.error('Failed to validate configuration', error);
      throw error;
    }
  }
  
  /**
   * Handle project management commands
   * @param {Object} command - Project command
   * @returns {Promise<Object>} Project result
   */
  async handleProjectCommand(command) {
    try {
      this.logger.info('Handling project command', {
        action: command.action,
        projectId: command.projectId
      });
      
      const { action, projectId, projectData } = command;
      
      if (!projectId) {
        throw new Error('Project ID is required');
      }
      
      switch (action) {
        case 'list':
          return await this.handleListProjects(projectId);
        case 'create':
          return await this.handleCreateProject(projectId, projectData);
        case 'getConfig':
          return await this.handleGetProjectConfig(projectId);
        case 'updateConfig':
          return await this.handleUpdateProjectConfig(projectId, projectData);
        default:
          throw new Error(`Unknown project action: ${action}`);
      }
      
    } catch (error) {
      this.logger.error('Failed to handle project command', error);
      throw error;
    }
  }
  
  /**
   * Handle list projects
   * @param {string} projectId - Project ID
   * @returns {Promise<Object>} Projects list
   */
  async handleListProjects(projectId) {
    try {
      // Detect workspace path
      const workspacePath = await this.playwrightTestService.detectWorkspacePath(projectId);
      if (!workspacePath) {
        throw new Error(`Workspace path not found for project: ${projectId}`);
      }
      
      // Discover test projects
      const testFiles = await this.playwrightTestService.discoverProjectTests(workspacePath, {});
      
      const projects = testFiles.map(testFile => ({
        id: testFile.name,
        name: testFile.name,
        path: testFile.path,
        directory: testFile.directory
      }));
      
      return {
        success: true,
        command: 'listProjects',
        result: {
          projectId,
          projects,
          count: projects.length,
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      this.logger.error('Failed to list projects', error);
      throw error;
    }
  }
  
  /**
   * Handle create project
   * @param {string} projectId - Project ID
   * @param {Object} projectData - Project data
   * @returns {Promise<Object>} Create result
   */
  async handleCreateProject(projectId, projectData) {
    try {
      // Detect workspace path
      const workspacePath = await this.playwrightTestService.detectWorkspacePath(projectId);
      if (!workspacePath) {
        throw new Error(`Workspace path not found for project: ${projectId}`);
      }
      
      // Create test project
      await this.playwrightTestService.testManager.createTestProject(workspacePath, projectData);
      
      return {
        success: true,
        command: 'createProject',
        result: {
          projectId,
          message: 'Test project created successfully',
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      this.logger.error('Failed to create project', error);
      throw error;
    }
  }
  
  /**
   * Handle get project config
   * @param {string} projectId - Project ID
   * @returns {Promise<Object>} Project config
   */
  async handleGetProjectConfig(projectId) {
    try {
      // Detect workspace path
      const workspacePath = await this.playwrightTestService.detectWorkspacePath(projectId);
      if (!workspacePath) {
        throw new Error(`Workspace path not found for project: ${projectId}`);
      }
      
      // Load project configuration
      const config = await this.playwrightTestService.loadProjectConfiguration(workspacePath);
      
      return {
        success: true,
        command: 'getProjectConfig',
        result: {
          projectId,
          config,
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      this.logger.error('Failed to get project config', error);
      throw error;
    }
  }
  
  /**
   * Handle update project config
   * @param {string} projectId - Project ID
   * @param {Object} config - New configuration
   * @returns {Promise<Object>} Update result
   */
  async handleUpdateProjectConfig(projectId, config) {
    try {
      // Detect workspace path
      const workspacePath = await this.playwrightTestService.detectWorkspacePath(projectId);
      if (!workspacePath) {
        throw new Error(`Workspace path not found for project: ${projectId}`);
      }
      
      // Save project configuration
      await this.playwrightTestService.testManager.saveTestConfig(workspacePath, config);
      
      return {
        success: true,
        command: 'updateProjectConfig',
        result: {
          projectId,
          message: 'Project configuration updated successfully',
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      this.logger.error('Failed to update project config', error);
      throw error;
    }
  }
}

module.exports = PlaywrightTestHandler;
