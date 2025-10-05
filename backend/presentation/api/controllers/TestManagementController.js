/**
 * TestManagementController - API controller for test management operations
 * CLEAN VERSION - Uses DI Container properly
 */
const Logger = require('@logging/Logger');
const centralizedConfig = require('@config/centralized-config');
const BrowserEnvironmentService = require('@services/testing/BrowserEnvironmentService');
const logger = new Logger('TestManagementController');

class TestManagementController {
    constructor(dependencies = {}) {
        // Use DI Container - clean and simple
        this.playwrightTestHandler = dependencies.playwrightTestHandler;
        this.application = dependencies.application;
        this.logger = dependencies.logger || logger;
        this.browserEnvironmentService = new BrowserEnvironmentService();
        
        if (!this.playwrightTestHandler) {
            throw new Error('TestManagementController requires playwrightTestHandler dependency');
        }
    }

    /**
     * Get Playwright test configuration
     * GET /api/projects/:projectId/tests/playwright/config
     */
    async getPlaywrightTestConfig(req, res) {
        try {
            const { projectId } = req.params;
            
            this.logger.info(`TestManagementController: GET /api/projects/${projectId}/tests/playwright/config called`);
            
            if (!projectId) {
                this.logger.warn('TestManagementController: No project ID provided');
                return res.status(400).json({
                    success: false,
                    error: 'Project ID is required',
                    timestamp: new Date()
                });
            }

            const command = {
                action: 'get',
                projectId
            };

            const result = await this.playwrightTestHandler.handleConfigurationCommand(command);
            
            this.logger.info(`TestManagementController: Configuration loaded successfully for project: ${projectId}`);

            res.json({
                success: true,
                data: result.result,
                timestamp: new Date()
            });
        } catch (error) {
            this.logger.error(`TestManagementController: Failed to get configuration for project: ${req.params.projectId}`, error);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date()
            });
        }
    }

    /**
     * Update Playwright test configuration
     * PUT /api/projects/:projectId/tests/playwright/config
     */
    async updatePlaywrightTestConfig(req, res) {
        try {
            const { projectId } = req.params;
            const { config } = req.body;

            this.logger.info(`TestManagementController: PUT /api/projects/${projectId}/tests/playwright/config called`);

            if (!projectId) {
                return res.status(400).json({
                    success: false,
                    error: 'Project ID is required',
                    timestamp: new Date()
                });
            }

            if (!config) {
                return res.status(400).json({
                    success: false,
                    error: 'Configuration is required',
                    timestamp: new Date()
                });
            }

            const command = {
                action: 'update',
                projectId,
                config
            };

            const result = await this.playwrightTestHandler.handleConfigurationCommand(command);
            
            this.logger.info(`TestManagementController: Configuration updated successfully for project: ${projectId}`);

            res.json({
                success: true,
                data: result.result,
                message: 'Playwright configuration updated successfully',
                timestamp: new Date()
            });
        } catch (error) {
            this.logger.error(`TestManagementController: Failed to update configuration for project: ${req.params.projectId}`, error);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date()
            });
        }
    }

    /**
     * Execute Playwright tests for a project
     * POST /api/projects/:projectId/tests/playwright/execute
     */
    async executePlaywrightTests(req, res) {
        try {
            const { projectId } = req.params;
            const { testName, options = {} } = req.body;

            if (!projectId) {
                return res.status(400).json({
                    success: false,
                    error: 'Project ID is required',
                    timestamp: new Date()
                });
            }

            const command = {
                projectId,
                testName,
                options
            };

            const result = await this.playwrightTestHandler.handleExecuteTests(command);

            res.json({
                success: true,
                data: result.result,
                message: 'Playwright tests executed successfully',
                timestamp: new Date()
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date()
            });
        }
    }

    /**
     * Stop running Playwright tests
     * POST /api/projects/:projectId/tests/playwright/stop
     */
    async stopPlaywrightTests(req, res) {
        try {
            const { testId } = req.body;

            const command = { testId };
            const result = await this.playwrightTestHandler.handleStopTests(command);

            res.json({
                success: true,
                data: result.result,
                message: 'Playwright tests stopped successfully',
                timestamp: new Date()
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date()
            });
        }
    }

    /**
     * Get Playwright test projects
     * GET /api/projects/:projectId/tests/playwright/projects
     */
    async getPlaywrightTestProjects(req, res) {
        try {
            const { projectId } = req.params;

            if (!projectId) {
                return res.status(400).json({
                    success: false,
                    error: 'Project ID is required',
                    timestamp: new Date()
                });
            }

            const command = {
                action: 'list',
                projectId
            };

            const result = await this.playwrightTestHandler.handleProjectCommand(command);

            res.json({
                success: true,
                data: result.result,
                timestamp: new Date()
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date()
            });
        }
    }

    /**
     * Create Playwright test project
     * POST /api/projects/:projectId/tests/playwright/projects
     */
    async createPlaywrightTestProject(req, res) {
        try {
            const { projectId } = req.params;
            const { name, config } = req.body;

            if (!projectId) {
                return res.status(400).json({
                    success: false,
                    error: 'Project ID is required',
                    timestamp: new Date()
                });
            }

            if (!name) {
                return res.status(400).json({
                    success: false,
                    error: 'Project name is required',
                    timestamp: new Date()
                });
            }

            const command = {
                action: 'create',
                projectId,
                projectData: { name, config }
            };

            const result = await this.playwrightTestHandler.handleProjectCommand(command);

            res.json({
                success: true,
                data: result.result,
                message: 'Playwright test project created successfully',
                timestamp: new Date()
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date()
            });
        }
    }

    /**
     * Get browser environment information
     * GET /api/tests/browser-environment
     */
    async getBrowserEnvironment(req, res) {
        try {
            this.logger.info('TestManagementController: GET /api/tests/browser-environment called');
            
            const environmentSummary = await this.browserEnvironmentService.getEnvironmentSummary();
            
            this.logger.info('TestManagementController: Browser environment info retrieved successfully');
            
            res.json({
                success: true,
                data: environmentSummary,
                message: 'Browser environment information retrieved successfully',
                timestamp: new Date()
            });
        } catch (error) {
            this.logger.error('TestManagementController: Error getting browser environment', error);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date()
            });
        }
    }
}

module.exports = TestManagementController;
