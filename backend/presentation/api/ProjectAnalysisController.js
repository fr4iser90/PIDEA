const ProjectAnalysis = require('@entities/ProjectAnalysis');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

class ProjectAnalysisController {
    constructor(projectAnalysisRepository, logger) {
        this.projectAnalysisRepository = projectAnalysisRepository;
        this.logger = logger;
    }

    /**
     * Get all analyses for a project
     */
    async getProjectAnalyses(req, res) {
        try {
            const { projectId } = req.params;
            
            if (!projectId) {
                return res.status(400).json({
                    success: false,
                    error: 'Project ID is required'
                });
            }

            const analyses = await this.projectAnalysisRepository.findByProjectId(projectId);
            
            res.json({
                success: true,
                data: {
                    projectId,
                    analyses: analyses.map(analysis => analysis.toJSON()),
                    count: analyses.length
                }
            });
        } catch (error) {
            this.logger.error('Error getting project analyses:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get project analyses'
            });
        }
    }

    /**
     * Get latest analysis by type for a project
     */
    async getLatestAnalysisByType(req, res) {
        try {
            const { projectId, analysisType } = req.params;
            
            if (!projectId || !analysisType) {
                return res.status(400).json({
                    success: false,
                    error: 'Project ID and analysis type are required'
                });
            }

            const analysis = await this.projectAnalysisRepository.findLatestByProjectIdAndType(projectId, analysisType);
            
            if (!analysis) {
                return res.status(404).json({
                    success: false,
                    error: `No ${analysisType} analysis found for project ${projectId}`
                });
            }

            res.json({
                success: true,
                data: analysis.toJSON()
            });
        } catch (error) {
            this.logger.error('Error getting latest analysis:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get latest analysis'
            });
        }
    }

    /**
     * Get all analyses by type for a project
     */
    async getAnalysesByType(req, res) {
        try {
            const { projectId, analysisType } = req.params;
            
            if (!projectId || !analysisType) {
                return res.status(400).json({
                    success: false,
                    error: 'Project ID and analysis type are required'
                });
            }

            const analyses = await this.projectAnalysisRepository.findByProjectIdAndType(projectId, analysisType);
            
            res.json({
                success: true,
                data: {
                    projectId,
                    analysisType,
                    analyses: analyses.map(analysis => analysis.toJSON()),
                    count: analyses.length
                }
            });
        } catch (error) {
            this.logger.error('Error getting analyses by type:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get analyses by type'
            });
        }
    }

    /**
     * Create a new analysis
     */
    async createAnalysis(req, res) {
        try {
            const { projectId, projectPath, analysisType, analysisData, metadata = {} } = req.body;
            
            if (!projectId || !projectPath || !analysisType || !analysisData) {
                return res.status(400).json({
                    success: false,
                    error: 'Project ID, project path, analysis type, and analysis data are required'
                });
            }

            const analysis = new ProjectAnalysis({
                projectId,
                projectPath,
                analysisType,
                analysisData,
                metadata
            });

            const savedAnalysis = await this.projectAnalysisRepository.save(analysis);
            
            res.status(201).json({
                success: true,
                data: savedAnalysis.toJSON()
            });
        } catch (error) {
            this.logger.error('Error creating analysis:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to create analysis'
            });
        }
    }

    /**
     * Update an existing analysis
     */
    async updateAnalysis(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;
            
            if (!id) {
                return res.status(400).json({
                    success: false,
                    error: 'Analysis ID is required'
                });
            }

            const existingAnalysis = await this.projectAnalysisRepository.findById(id);
            
            if (!existingAnalysis) {
                return res.status(404).json({
                    success: false,
                    error: 'Analysis not found'
                });
            }

            // Update the analysis data
            if (updateData.analysisData) {
                existingAnalysis.updateAnalysisData(updateData.analysisData);
            }
            
            if (updateData.metadata) {
                Object.entries(updateData.metadata).forEach(([key, value]) => {
                    existingAnalysis.addMetadata(key, value);
                });
            }
            
            if (updateData.version) {
                existingAnalysis.updateVersion(updateData.version);
            }

            const updatedAnalysis = await this.projectAnalysisRepository.update(existingAnalysis);
            
            res.json({
                success: true,
                data: existingAnalysis.toJSON()
            });
        } catch (error) {
            this.logger.error('Error updating analysis:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update analysis'
            });
        }
    }

    /**
     * Delete an analysis
     */
    async deleteAnalysis(req, res) {
        try {
            const { id } = req.params;
            
            if (!id) {
                return res.status(400).json({
                    success: false,
                    error: 'Analysis ID is required'
                });
            }

            const deleted = await this.projectAnalysisRepository.delete(id);
            
            if (!deleted) {
                return res.status(404).json({
                    success: false,
                    error: 'Analysis not found'
                });
            }

            res.json({
                success: true,
                message: 'Analysis deleted successfully'
            });
        } catch (error) {
            this.logger.error('Error deleting analysis:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to delete analysis'
            });
        }
    }

    /**
     * Get analysis statistics for a project
     */
    async getAnalysisStats(req, res) {
        try {
            const { projectId } = req.params;
            
            if (!projectId) {
                return res.status(400).json({
                    success: false,
                    error: 'Project ID is required'
                });
            }

            const allAnalyses = await this.projectAnalysisRepository.findByProjectId(projectId);
            
            // Group by analysis type
            const stats = {};
            allAnalyses.forEach(analysis => {
                const type = analysis.getAnalysisType();
                if (!stats[type]) {
                    stats[type] = {
                        count: 0,
                        latest: null,
                        versions: new Set()
                    };
                }
                stats[type].count++;
                stats[type].versions.add(analysis.getVersion());
                
                if (!stats[type].latest || analysis.createdAt > stats[type].latest.createdAt) {
                    stats[type].latest = analysis.toJSON();
                }
            });

            // Convert sets to arrays
            Object.keys(stats).forEach(type => {
                stats[type].versions = Array.from(stats[type].versions);
            });

            res.json({
                success: true,
                data: {
                    projectId,
                    totalAnalyses: allAnalyses.length,
                    analysisTypes: Object.keys(stats),
                    stats
                }
            });
        } catch (error) {
            this.logger.error('Error getting analysis stats:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get analysis statistics'
            });
        }
    }
}

module.exports = ProjectAnalysisController; 