/**
 * TestManagementController - API controller for test management operations
 * CLEAN VERSION - Uses DI Container properly
 */
const Logger = require('@logging/Logger');
const centralizedConfig = require('@config/centralized-config');
const BrowserEnvironmentService = require('@services/testing/BrowserEnvironmentService');
const logger = new Logger('TestManagementController');
const config = centralizedConfig;

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
            
            // Debug: Log the received config structure
            console.log('=== CONTROLLER DEBUG ===');
            console.log('Received config:', config);
            console.log('Config browsers:', config?.browsers);
            console.log('Config browsers type:', typeof config?.browsers);
            console.log('Config browsers isArray:', Array.isArray(config?.browsers));
            console.log('=== CONTROLLER DEBUG END ===');

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
            const { testNames, options = {} } = req.body;

            if (!projectId) {
                return res.status(400).json({
                    success: false,
                    error: 'Project ID is required',
                    timestamp: new Date()
                });
            }

            const command = {
                projectId,
                testNames,
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
            const { testIds } = req.body;

            const command = { testIds };
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

    /**
     * Get Playwright test results JSON
     * GET /api/projects/:projectId/tests/playwright/results
     */
    async getPlaywrightTestResults(req, res) {
        try {
            const { projectId } = req.params;
            const fs = require('fs');
            const path = require('path');

            // Read the JSON results file directly using centralized config
            const resultsPath = path.join(config.pathConfig.project.root, config.pathConfig.output.testResultsJson);
            
            if (fs.existsSync(resultsPath)) {
                const resultsData = fs.readFileSync(resultsPath, 'utf8');
                const jsonResults = JSON.parse(resultsData);
                
                res.json({
                    success: true,
                    data: jsonResults,
                    message: 'Test results loaded successfully',
                    timestamp: new Date()
                });
            } else {
                res.status(404).json({
                    success: false,
                    error: 'Test results file not found',
                    timestamp: new Date()
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date()
            });
        }
    }

    /**
     * Get specific Playwright test result by ID
     * GET /api/projects/:projectId/tests/playwright/results/:testId
     */
    async getPlaywrightTestResultById(req, res) {
        try {
            const { projectId, testId } = req.params;
            
            // For now, return the same results as the general endpoint
            // In the future, this could filter by testId
            const result = await this.getPlaywrightTestResults(req, res);
            
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date()
            });
        }
    }

    /**
     * Get Playwright test history
     * GET /api/projects/:projectId/tests/playwright/history
     */
    async getPlaywrightTestHistory(req, res) {
        try {
            const { projectId } = req.params;
            const fs = require('fs');
            const path = require('path');

            // Read all test result files from the reports directory
            const reportsDir = path.join(process.cwd(), 'backend/tests/playwright/reports');
            const history = [];

            if (fs.existsSync(reportsDir)) {
                const files = fs.readdirSync(reportsDir);
                const resultFiles = files.filter(file => file.endsWith('.json') && file.includes('test-results'));
                
                for (const file of resultFiles) {
                    try {
                        const filePath = path.join(reportsDir, file);
                        const fileData = fs.readFileSync(filePath, 'utf8');
                        const jsonData = JSON.parse(fileData);
                        
                        history.push({
                            file: file,
                            timestamp: fs.statSync(filePath).mtime,
                            results: jsonData
                        });
                    } catch (fileError) {
                        console.error(`Error reading file ${file}:`, fileError);
                    }
                }
            }

            res.json({
                success: true,
                data: {
                    projectId,
                    history: history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                },
                message: 'Test history loaded successfully',
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
}

module.exports = TestManagementController;
