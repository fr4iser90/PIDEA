/**
 * TaskAnalysisController - REST API endpoints for project analysis
 */
const { validationResult } = require('express-validator');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

class TaskAnalysisController {
    constructor(dependencies = {}) {
        this.commandBus = dependencies.commandBus;
        this.queryBus = dependencies.queryBus;
        this.logger = dependencies.logger || console;
        this.eventBus = dependencies.eventBus;
    }

    /**
     * Analyze project structure and generate insights
     * POST /api/analysis/project
     */
    async analyzeProject(req, res) {
        try {
            // Validate request
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.badRequest(errors.array());
            }

            const {
                projectPath,
                analysisType = 'full',
                options = {},
                includeAI = true
            } = req.body;

            const userId = req.user?.id;

            const command = {
                projectPath,
                analysisType,
                options,
                includeAI,
                analyzedBy: userId
            };

            const result = await this.commandBus.execute('AnalyzeProjectCommand', command);

            this.logger.info('TaskAnalysisController: Project analysis completed', {
                projectPath,
                analysisId: result.analysis.id,
                userId
            });

            res.success({
                    analysis: result.analysis,
                    insights: result.insights,
                    recommendations: result.recommendations
                }, 200, { meta: { message: 'Project analysis completed successfully' } });

        } catch (error) {
            this.logger.error('TaskAnalysisController: Failed to analyze project', {
                projectPath: req.body.projectPath,
                error: error.message,
                userId: req.user?.id
            });

            res.error('Failed to analyze project', 500, { details: error.message
             });
        }
    }

    /**
     * Get project analysis results
     * GET /api/analysis/project/:id
     */
    async getProjectAnalysis(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user?.id;

            const query = {
                analysisId: id,
                userId
            };

            const result = await this.queryBus.execute('GetProjectAnalysisQuery', query);

            if (!result.analysis) {
                return res.notFound('Project analysis not found');
            }

            this.logger.info('TaskAnalysisController: Project analysis retrieved', {
                analysisId: id,
                userId
            });

            res.success(result.analysis
            );

        } catch (error) {
            this.logger.error('TaskAnalysisController: Failed to get project analysis', {
                analysisId: req.params.id,
                error: error.message,
                userId: req.user?.id
            });

            res.error('Failed to get project analysis', 500, { details: error.message
             });
        }
    }

    /**
     * AI-powered project analysis
     * POST /api/analysis/ai
     */
    async aiProjectAnalysis(req, res) {
        try {
            const {
                projectPath,
                analysisFocus,
                aiModel = 'gpt-4',
                options = {}
            } = req.body;

            const userId = req.user?.id;

            const command = {
                projectPath,
                analysisFocus,
                aiModel,
                options,
                analyzedBy: userId
            };

            const result = await this.commandBus.execute('AIAnalysisCommand', command);

            this.logger.info('TaskAnalysisController: AI analysis completed', {
                projectPath,
                analysisId: result.analysis.id,
                aiModel,
                userId
            });

            res.success({
                    analysis: result.analysis,
                    aiInsights: result.aiInsights,
                    suggestions: result.suggestions,
                    codeQuality: result.codeQuality,
                    securityIssues: result.securityIssues,
                    performanceMetrics: result.performanceMetrics
                }, 200, { meta: { message: 'AI analysis completed successfully' } });

        } catch (error) {
            this.logger.error('TaskAnalysisController: Failed to perform AI analysis', {
                projectPath: req.body.projectPath,
                error: error.message,
                userId: req.user?.id
            });

            res.error('Failed to perform AI analysis', 500, { details: error.message
             });
        }
    }

    /**
     * Get analysis history
     * GET /api/analysis/history
     */
    async getAnalysisHistory(req, res) {
        try {
            const {
                page = 1,
                limit = 20,
                projectPath,
                analysisType,
                startDate,
                endDate
            } = req.query;

            const userId = req.user?.id;

            const query = {
                page: parseInt(page),
                limit: parseInt(limit),
                filters: {
                    projectPath,
                    analysisType,
                    startDate,
                    endDate
                },
                userId
            };

            const result = await this.queryBus.execute('GetAnalysisHistoryQuery', query);

            this.logger.info('TaskAnalysisController: Analysis history retrieved', {
                count: result.analyses.length,
                userId
            });

            res.success({
                data: {
                    analyses: result.analyses,
                    pagination: {
                        page: result.page,
                        limit: result.limit,
                        total: result.total,
                        pages: Math.ceil(result.total / result.limit)
                    }
                }
            });

        } catch (error) {
            this.logger.error('TaskAnalysisController: Failed to get analysis history', {
                error: error.message,
                userId: req.user?.id
            });

            res.error('Failed to get analysis history', 500, { details: error.message
             });
        }
    }

    /**
     * Compare project analyses
     * POST /api/analysis/compare
     */
    async compareAnalyses(req, res) {
        try {
            const { analysisIds, comparisonType = 'side-by-side' } = req.body;
            const userId = req.user?.id;

            const command = {
                analysisIds,
                comparisonType,
                comparedBy: userId
            };

            const result = await this.commandBus.execute('CompareAnalysesCommand', command);

            this.logger.info('TaskAnalysisController: Analysis comparison completed', {
                analysisIds,
                comparisonId: result.comparison.id,
                userId
            });

            res.success({
                    comparison: result.comparison,
                    differences: result.differences,
                    improvements: result.improvements,
                    regressions: result.regressions
                }, 200, { meta: { message: 'Analysis comparison completed successfully' } });

        } catch (error) {
            this.logger.error('TaskAnalysisController: Failed to compare analyses', {
                analysisIds: req.body.analysisIds,
                error: error.message,
                userId: req.user?.id
            });

            res.error('Failed to compare analyses', 500, { details: error.message
             });
        }
    }

    /**
     * Export analysis results
     * GET /api/analysis/export/:id
     */
    async exportAnalysis(req, res) {
        try {
            const { id } = req.params;
            const { format = 'json' } = req.query;
            const userId = req.user?.id;

            const query = {
                analysisId: id,
                format,
                userId
            };

            const result = await this.queryBus.execute('ExportAnalysisQuery', query);

            if (!result.analysis) {
                return res.notFound('Analysis not found');
            }

            this.logger.info('TaskAnalysisController: Analysis exported', {
                analysisId: id,
                format,
                userId
            });

            // Set appropriate headers for file download
            res.setHeader('Content-Type', this.getContentType(format));
            res.setHeader('Content-Disposition', `attachment; filename="analysis-${id}-${Date.now()}.${format}"`);

            res.send(result.data);

        } catch (error) {
            this.logger.error('TaskAnalysisController: Failed to export analysis', {
                analysisId: req.params.id,
                format: req.query.format,
                error: error.message,
                userId: req.user?.id
            });

            res.error('Failed to export analysis', 500, { details: error.message
             });
        }
    }

    /**
     * Get analysis statistics
     * GET /api/analysis/stats
     */
    async getAnalysisStats(req, res) {
        try {
            const { projectPath, timeRange } = req.query;
            const userId = req.user?.id;

            const query = {
                projectPath,
                timeRange,
                userId
            };

            const result = await this.queryBus.execute('GetAnalysisStatsQuery', query);

            this.logger.info('TaskAnalysisController: Analysis statistics retrieved', {
                userId
            });

            res.success(result.stats
            );

        } catch (error) {
            this.logger.error('TaskAnalysisController: Failed to get analysis statistics', {
                error: error.message,
                userId: req.user?.id
            });

            res.error('Failed to get analysis statistics', 500, { details: error.message
             });
        }
    }

    /**
     * Schedule recurring analysis
     * POST /api/analysis/schedule
     */
    async scheduleAnalysis(req, res) {
        try {
            const {
                projectPath,
                schedule,
                analysisType,
                options = {}
            } = req.body;

            const userId = req.user?.id;

            const command = {
                projectPath,
                schedule,
                analysisType,
                options,
                scheduledBy: userId
            };

            const result = await this.commandBus.execute('ScheduleAnalysisCommand', command);

            this.logger.info('TaskAnalysisController: Analysis scheduled', {
                projectPath,
                scheduleId: result.schedule.id,
                userId
            });

            res.success(result.schedule);

        } catch (error) {
            this.logger.error('TaskAnalysisController: Failed to schedule analysis', {
                projectPath: req.body.projectPath,
                error: error.message,
                userId: req.user?.id
            });

            res.error('Failed to schedule analysis', 500, { details: error.message
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
            csv: 'text/csv',
            xml: 'application/xml',
            yaml: 'text/yaml',
            pdf: 'application/pdf'
        };
        return contentTypes[format] || 'application/json';
    }

    /**
     * Health check endpoint
     * GET /api/analysis/health
     */
    async healthCheck(req, res) {
        try {
            res.success({message: 'Analysis service is healthy',
                timestamp: new Date().toISOString()});
        } catch (error) {
            res.error('Analysis service is unhealthy', 500, { details: error.message
             });
        }
    }
}

module.exports = TaskAnalysisController; 