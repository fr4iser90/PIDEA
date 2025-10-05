/**
 * TestManagementController - API controller for test management operations
 */
const TestManagementService = require('@services/testing/TestManagementService');
const UpdateTestStatusCommand = require('@commands/categories/workflow/UpdateTestStatusCommand');
const UpdateTestStatusHandler = require('@handlers/categories/workflow/UpdateTestStatusHandler');
const PlaywrightTestHandler = require('@handlers/categories/testing/PlaywrightTestHandler');

class TestManagementController {
    constructor() {
        this.testManagementService = new TestManagementService();
        this.updateTestStatusHandler = new UpdateTestStatusHandler(this.testManagementService);
        this.playwrightTestHandler = new PlaywrightTestHandler();
    }

    /**
     * Get test statistics
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getTestStatistics(req, res) {
        try {
            const stats = await this.testManagementService.getTestStatistics();
            res.json({
                success: true,
                data: stats,
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
     * Get all test metadata with optional filters
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getTestMetadata(req, res) {
        try {
            const filters = req.query;
            const tests = await this.testManagementService.getTestsByFilters(filters);
            
            res.json({
                success: true,
                data: tests.map(test => test.toJSON()),
                count: tests.length,
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
     * Get test metadata by ID
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getTestMetadataById(req, res) {
        try {
            const { id } = req.params;
            const testMetadata = await this.testManagementService.testMetadataRepository.findById(id);
            
            if (!testMetadata) {
                return res.status(404).json({
                    success: false,
                    error: 'Test metadata not found',
                    timestamp: new Date()
                });
            }
            
            res.json({
                success: true,
                data: testMetadata.toJSON(),
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
     * Update test status
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async updateTestStatus(req, res) {
        try {
            const { filePath, testName, status, duration, error, metadata } = req.body;
            
            const command = UpdateTestStatusCommand.create(
                filePath,
                testName,
                status,
                duration || 0,
                error || null,
                metadata || {}
            );
            
            const result = await this.updateTestStatusHandler.handle(command);
            
            if (result.success) {
                res.json({
                    success: true,
                    data: result.testMetadata,
                    message: result.message,
                    timestamp: new Date()
                });
            } else {
                res.status(400).json({
                    success: false,
                    error: result.error,
                    message: result.message,
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
     * Register a new test
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async registerTest(req, res) {
        try {
            const { filePath, testName, metadata } = req.body;
            
            if (!filePath || !testName) {
                return res.status(400).json({
                    success: false,
                    error: 'File path and test name are required',
                    timestamp: new Date()
                });
            }
            
            const testMetadata = await this.testManagementService.registerTest(
                filePath,
                testName,
                metadata || {}
            );
            
            res.json({
                success: true,
                data: testMetadata.toJSON(),
                message: 'Test registered successfully',
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
     * Scan and register tests in directory
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async scanAndRegisterTests(req, res) {
        try {
            const { directory, pattern } = req.body;
            
            if (!directory) {
                return res.status(400).json({
                    success: false,
                    error: 'Directory path is required',
                    timestamp: new Date()
                });
            }
            
            const registeredTests = await this.testManagementService.scanAndRegisterTests(
                directory,
                pattern || '**/*.test.js'
            );
            
            res.json({
                success: true,
                data: registeredTests.map(test => test.toJSON()),
                count: registeredTests.length,
                message: `Successfully registered ${registeredTests.length} tests`,
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
     * Get legacy tests
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getLegacyTests(req, res) {
        try {
            const legacyTests = await this.testManagementService.testMetadataRepository.findLegacyTests();
            
            res.json({
                success: true,
                data: legacyTests.map(test => test.toJSON()),
                count: legacyTests.length,
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
     * Get tests needing maintenance
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getTestsNeedingMaintenance(req, res) {
        try {
            const maintenanceTests = await this.testManagementService.testMetadataRepository.findNeedingMaintenance();
            
            res.json({
                success: true,
                data: maintenanceTests.map(test => test.toJSON()),
                count: maintenanceTests.length,
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
     * Get tests by status
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getTestsByStatus(req, res) {
        try {
            const { status } = req.params;
            const tests = await this.testManagementService.testMetadataRepository.findByStatus(status);
            
            res.json({
                success: true,
                data: tests.map(test => test.toJSON()),
                count: tests.length,
                status,
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
     * Get tests by tag
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getTestsByTag(req, res) {
        try {
            const { tag } = req.params;
            const tests = await this.testManagementService.testMetadataRepository.findByTag(tag);
            
            res.json({
                success: true,
                data: tests.map(test => test.toJSON()),
                count: tests.length,
                tag,
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
     * Get test health report
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getHealthReport(req, res) {
        try {
            const healthReport = await this.testManagementService.generateHealthReport();
            
            res.json({
                success: true,
                data: healthReport,
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
     * Get test recommendations
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getRecommendations(req, res) {
        try {
            const recommendations = await this.testManagementService.generateRecommendations();
            
            res.json({
                success: true,
                data: recommendations,
                count: recommendations.length,
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
     * Export test metadata
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async exportTestMetadata(req, res) {
        try {
            const { filePath } = req.body;
            
            if (!filePath) {
                return res.status(400).json({
                    success: false,
                    error: 'File path is required for export',
                    timestamp: new Date()
                });
            }
            
            await this.testManagementService.exportTestMetadata(filePath);
            
            res.json({
                success: true,
                message: `Test metadata exported to ${filePath}`,
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
     * Import test metadata
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async importTestMetadata(req, res) {
        try {
            const { filePath } = req.body;
            
            if (!filePath) {
                return res.status(400).json({
                    success: false,
                    error: 'File path is required for import',
                    timestamp: new Date()
                });
            }
            
            const importedCount = await this.testManagementService.importTestMetadata(filePath);
            
            res.json({
                success: true,
                data: { importedCount },
                message: `Successfully imported ${importedCount} test metadata records`,
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
     * Delete test metadata
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async deleteTestMetadata(req, res) {
        try {
            const { id } = req.params;
            const deleted = await this.testManagementService.testMetadataRepository.deleteById(id);
            
            if (!deleted) {
                return res.status(404).json({
                    success: false,
                    error: 'Test metadata not found',
                    timestamp: new Date()
                });
            }
            
            res.json({
                success: true,
                message: 'Test metadata deleted successfully',
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
     * Get paginated test metadata
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getPaginatedTestMetadata(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            
            const result = await this.testManagementService.testMetadataRepository.findWithPagination(page, limit);
            
            res.json({
                success: true,
                data: result.data.map(test => test.toJSON()),
                pagination: {
                    page: result.page,
                    limit: result.limit,
                    total: result.total,
                    totalPages: result.totalPages
                },
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

    // ==================== PLAYWRIGHT TEST ENDPOINTS ====================

    /**
     * Execute Playwright tests for a project
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
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
     * Get Playwright test results
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getPlaywrightTestResults(req, res) {
        try {
            const { testId } = req.params;

            if (!testId) {
                return res.status(400).json({
                    success: false,
                    error: 'Test ID is required',
                    timestamp: new Date()
                });
            }

            const command = { testId };
            const result = await this.playwrightTestHandler.handleGetTestResults(command);

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
     * Get all Playwright test results
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getAllPlaywrightTestResults(req, res) {
        try {
            const command = {};
            const result = await this.playwrightTestHandler.handleGetAllTestResults(command);

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
     * Get Playwright test configuration
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getPlaywrightTestConfig(req, res) {
        try {
            const { projectId } = req.params;

            if (!projectId) {
                return res.status(400).json({
                    success: false,
                    error: 'Project ID is required',
                    timestamp: new Date()
                });
            }

            // Get workspace path from project ID
            let workspacePath = null;
            
            // Try to get workspace path from project mapping
            const projectMappingService = this.application?.projectMappingService;
            if (projectMappingService) {
                workspacePath = projectMappingService.getWorkspaceFromProjectId(projectId);
            }

            const command = {
                action: 'get',
                projectId,
                workspacePath
            };

            const result = await this.playwrightTestHandler.handleConfigurationCommand(command);

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
     * Update Playwright test configuration
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async updatePlaywrightTestConfig(req, res) {
        try {
            const { projectId } = req.params;
            const { config } = req.body;

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

            res.json({
                success: true,
                data: result.result,
                message: 'Playwright configuration updated successfully',
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
     * Validate Playwright test configuration
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async validatePlaywrightTestConfig(req, res) {
        try {
            const { config } = req.body;

            if (!config) {
                return res.status(400).json({
                    success: false,
                    error: 'Configuration is required',
                    timestamp: new Date()
                });
            }

            const command = {
                action: 'validate',
                config
            };

            const result = await this.playwrightTestHandler.handleConfigurationCommand(command);

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
     * Get Playwright test projects
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
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
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
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
     * Get project-specific Playwright configuration
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getPlaywrightProjectConfig(req, res) {
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
                action: 'getConfig',
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
     * Update project-specific Playwright configuration
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async updatePlaywrightProjectConfig(req, res) {
        try {
            const { projectId } = req.params;
            const { config } = req.body;

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
                action: 'updateConfig',
                projectId,
                config
            };

            const result = await this.playwrightTestHandler.handleProjectCommand(command);

            res.json({
                success: true,
                data: result.result,
                message: 'Project configuration updated successfully',
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
     * Validate login credentials for Playwright tests
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async validatePlaywrightLoginCredentials(req, res) {
        try {
            const { projectId } = req.params;
            const { credentials } = req.body;

            if (!projectId) {
                return res.status(400).json({
                    success: false,
                    error: 'Project ID is required',
                    timestamp: new Date()
                });
            }

            if (!credentials) {
                return res.status(400).json({
                    success: false,
                    error: 'Credentials are required',
                    timestamp: new Date()
                });
            }

            const command = {
                projectId,
                credentials
            };

            const result = await this.playwrightTestHandler.handleValidateLoginCredentials(command);

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
     * Get Playwright test runner status
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getPlaywrightTestRunnerStatus(req, res) {
        try {
            const command = {};
            const result = await this.playwrightTestHandler.handleGetTestRunnerStatus(command);

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
     * Stop running Playwright tests
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
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
     * Get Playwright test execution logs
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getPlaywrightTestLogs(req, res) {
        try {
            const { testId, lines } = req.query;

            // For now, return a placeholder response
            // This would be implemented with actual log retrieval
            res.json({
                success: true,
                data: {
                    testId: testId || 'all',
                    logs: [],
                    lines: parseInt(lines) || 100,
                    message: 'Log retrieval not yet implemented'
                },
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