/**
 * ScriptGenerationController - REST API endpoints for script generation
 */
const { validationResult } = require('express-validator');

class ScriptGenerationController {
    constructor(dependencies = {}) {
        this.commandBus = dependencies.commandBus;
        this.queryBus = dependencies.queryBus;
        this.logger = dependencies.logger || console;
        this.eventBus = dependencies.eventBus;
    }

    /**
     * Generate script
     * POST /api/scripts/generate
     */
    async generateScript(req, res) {
        try {
            // Validate request
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    errors: errors.array()
                });
            }

            const {
                scriptType,
                target,
                options = {},
                templateId,
                customPrompt,
                aiModel = 'gpt-4'
            } = req.body;

            const userId = req.user?.id;

            const command = {
                scriptType,
                target,
                options,
                templateId,
                customPrompt,
                aiModel,
                generatedBy: userId
            };

            const result = await this.commandBus.execute('GenerateScriptCommand', command);

            this.logger.info('ScriptGenerationController: Script generated', {
                scriptType,
                scriptId: result.script.id,
                userId
            });

            res.json({
                success: true,
                data: {
                    script: result.script,
                    metadata: result.metadata,
                    confidence: result.confidence
                },
                message: 'Script generated successfully'
            });

        } catch (error) {
            this.logger.error('ScriptGenerationController: Failed to generate script', {
                scriptType: req.body.scriptType,
                error: error.message,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to generate script',
                message: error.message
            });
        }
    }

    /**
     * Get generated scripts
     * GET /api/scripts
     */
    async getScripts(req, res) {
        try {
            const {
                page = 1,
                limit = 20,
                scriptType,
                status,
                generatedBy,
                startDate,
                endDate
            } = req.query;

            const userId = req.user?.id;

            const query = {
                page: parseInt(page),
                limit: parseInt(limit),
                filters: {
                    scriptType,
                    status,
                    generatedBy,
                    startDate,
                    endDate
                },
                userId
            };

            const result = await this.queryBus.execute('GetGeneratedScriptsQuery', query);

            this.logger.info('ScriptGenerationController: Scripts retrieved', {
                count: result.scripts.length,
                userId
            });

            res.json({
                success: true,
                data: {
                    scripts: result.scripts,
                    pagination: {
                        page: result.page,
                        limit: result.limit,
                        total: result.total,
                        pages: Math.ceil(result.total / result.limit)
                    }
                }
            });

        } catch (error) {
            this.logger.error('ScriptGenerationController: Failed to get scripts', {
                error: error.message,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to get scripts',
                message: error.message
            });
        }
    }

    /**
     * Get script by ID
     * GET /api/scripts/:id
     */
    async getScriptById(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user?.id;

            const query = {
                scriptId: id,
                userId
            };

            const result = await this.queryBus.execute('GetGeneratedScriptsQuery', query);

            if (!result.scripts || result.scripts.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Script not found'
                });
            }

            const script = result.scripts[0];

            this.logger.info('ScriptGenerationController: Script retrieved', {
                scriptId: id,
                userId
            });

            res.json({
                success: true,
                data: script
            });

        } catch (error) {
            this.logger.error('ScriptGenerationController: Failed to get script', {
                scriptId: req.params.id,
                error: error.message,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to get script',
                message: error.message
            });
        }
    }

    /**
     * Execute script
     * POST /api/scripts/:id/execute
     */
    async executeScript(req, res) {
        try {
            const { id } = req.params;
            const { options = {} } = req.body;
            const userId = req.user?.id;

            const command = {
                scriptId: id,
                options,
                executedBy: userId
            };

            const result = await this.commandBus.execute('ExecuteScriptCommand', command);

            this.logger.info('ScriptGenerationController: Script execution started', {
                scriptId: id,
                executionId: result.execution.id,
                userId
            });

            res.json({
                success: true,
                data: {
                    script: result.script,
                    execution: result.execution
                },
                message: 'Script execution started'
            });

        } catch (error) {
            this.logger.error('ScriptGenerationController: Failed to execute script', {
                scriptId: req.params.id,
                error: error.message,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to execute script',
                message: error.message
            });
        }
    }

    /**
     * Get script execution status
     * GET /api/scripts/:id/execution
     */
    async getScriptExecution(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user?.id;

            const query = {
                scriptId: id,
                userId
            };

            const result = await this.queryBus.execute('GetScriptExecutionQuery', query);

            if (!result.execution) {
                return res.status(404).json({
                    success: false,
                    error: 'Script execution not found'
                });
            }

            this.logger.info('ScriptGenerationController: Script execution retrieved', {
                scriptId: id,
                userId
            });

            res.json({
                success: true,
                data: result.execution
            });

        } catch (error) {
            this.logger.error('ScriptGenerationController: Failed to get script execution', {
                scriptId: req.params.id,
                error: error.message,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to get script execution',
                message: error.message
            });
        }
    }

    /**
     * Update script
     * PUT /api/scripts/:id
     */
    async updateScript(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user?.id;

            // Validate request
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    errors: errors.array()
                });
            }

            const updateData = {
                id,
                ...req.body,
                updatedBy: userId
            };

            const result = await this.commandBus.execute('UpdateScriptCommand', updateData);

            this.logger.info('ScriptGenerationController: Script updated', {
                scriptId: id,
                userId
            });

            res.json({
                success: true,
                data: result.script,
                message: 'Script updated successfully'
            });

        } catch (error) {
            this.logger.error('ScriptGenerationController: Failed to update script', {
                scriptId: req.params.id,
                error: error.message,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to update script',
                message: error.message
            });
        }
    }

    /**
     * Delete script
     * DELETE /api/scripts/:id
     */
    async deleteScript(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user?.id;

            const command = {
                scriptId: id,
                deletedBy: userId
            };

            await this.commandBus.execute('DeleteScriptCommand', command);

            this.logger.info('ScriptGenerationController: Script deleted', {
                scriptId: id,
                userId
            });

            res.json({
                success: true,
                message: 'Script deleted successfully'
            });

        } catch (error) {
            this.logger.error('ScriptGenerationController: Failed to delete script', {
                scriptId: req.params.id,
                error: error.message,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to delete script',
                message: error.message
            });
        }
    }

    /**
     * Get script templates
     * GET /api/scripts/templates
     */
    async getScriptTemplates(req, res) {
        try {
            const { scriptType, category } = req.query;
            const userId = req.user?.id;

            const query = {
                scriptType,
                category,
                userId
            };

            const result = await this.queryBus.execute('GetScriptTemplatesQuery', query);

            this.logger.info('ScriptGenerationController: Script templates retrieved', {
                count: result.templates.length,
                userId
            });

            res.json({
                success: true,
                data: result.templates
            });

        } catch (error) {
            this.logger.error('ScriptGenerationController: Failed to get script templates', {
                error: error.message,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to get script templates',
                message: error.message
            });
        }
    }

    /**
     * Create script template
     * POST /api/scripts/templates
     */
    async createScriptTemplate(req, res) {
        try {
            const {
                name,
                description,
                scriptType,
                template,
                variables,
                category
            } = req.body;

            const userId = req.user?.id;

            const command = {
                name,
                description,
                scriptType,
                template,
                variables,
                category,
                createdBy: userId
            };

            const result = await this.commandBus.execute('CreateScriptTemplateCommand', command);

            this.logger.info('ScriptGenerationController: Script template created', {
                templateId: result.template.id,
                userId
            });

            res.json({
                success: true,
                data: result.template,
                message: 'Script template created successfully'
            });

        } catch (error) {
            this.logger.error('ScriptGenerationController: Failed to create script template', {
                error: error.message,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to create script template',
                message: error.message
            });
        }
    }

    /**
     * Get script statistics
     * GET /api/scripts/stats
     */
    async getScriptStats(req, res) {
        try {
            const { scriptType, timeRange } = req.query;
            const userId = req.user?.id;

            const query = {
                scriptType,
                timeRange,
                userId
            };

            const result = await this.queryBus.execute('GetScriptStatsQuery', query);

            this.logger.info('ScriptGenerationController: Script statistics retrieved', {
                userId
            });

            res.json({
                success: true,
                data: result.stats
            });

        } catch (error) {
            this.logger.error('ScriptGenerationController: Failed to get script statistics', {
                error: error.message,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to get script statistics',
                message: error.message
            });
        }
    }

    /**
     * Export script
     * GET /api/scripts/:id/export
     */
    async exportScript(req, res) {
        try {
            const { id } = req.params;
            const { format = 'json' } = req.query;
            const userId = req.user?.id;

            const query = {
                scriptId: id,
                format,
                userId
            };

            const result = await this.queryBus.execute('ExportScriptQuery', query);

            if (!result.script) {
                return res.status(404).json({
                    success: false,
                    error: 'Script not found'
                });
            }

            this.logger.info('ScriptGenerationController: Script exported', {
                scriptId: id,
                format,
                userId
            });

            // Set appropriate headers for file download
            res.setHeader('Content-Type', this.getContentType(format));
            res.setHeader('Content-Disposition', `attachment; filename="script-${id}-${Date.now()}.${format}"`);

            res.send(result.data);

        } catch (error) {
            this.logger.error('ScriptGenerationController: Failed to export script', {
                scriptId: req.params.id,
                format: req.query.format,
                error: error.message,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to export script',
                message: error.message
            });
        }
    }

    /**
     * Get content type for export format
     * @param {string} format - Export format
     * @returns {string} Content type
     */
    getContentType(format) {
        const contentTypes = {
            json: 'application/json',
            yaml: 'text/yaml',
            txt: 'text/plain',
            sh: 'application/x-sh',
            js: 'application/javascript',
            py: 'text/x-python'
        };
        return contentTypes[format] || 'application/json';
    }

    /**
     * Health check endpoint
     * GET /api/scripts/health
     */
    async healthCheck(req, res) {
        try {
            res.json({
                success: true,
                message: 'Script generation service is healthy',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Script generation service is unhealthy',
                message: error.message
            });
        }
    }
}

module.exports = ScriptGenerationController; 