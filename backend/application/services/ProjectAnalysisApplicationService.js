/**
 * ProjectAnalysisApplicationService - Application layer service for project analysis operations
 * 
 * RESPONSIBILITIES:
 * ✅ Coordinate project analysis use cases
 * ✅ Handle analysis data retrieval and storage
 * ✅ Manage ETag caching for analysis results
 * ✅ Orchestrate project analysis workflows
 * 
 * LAYER COMPLIANCE:
 * ✅ Application layer - coordinates between Presentation and Domain
 * ✅ Uses Domain services and Infrastructure repositories through interfaces
 * ✅ Handles DTOs and use case orchestration
 */
const ProjectAnalysis = require('@entities/ProjectAnalysis');
const ETagService = require('@domain/services/shared/ETagService');
const Logger = require('@logging/Logger');

class ProjectAnalysisApplicationService {
    constructor(dependencies = {}) {
        this.projectAnalysisRepository = dependencies.projectAnalysisRepository;
        this.etagService = dependencies.etagService || new ETagService();
        this.logger = dependencies.logger || new Logger('ProjectAnalysisApplicationService');
        this.eventBus = dependencies.eventBus;
    }

    async getProjectAnalyses(projectId, userId) {
        try {
            this.logger.info('ProjectAnalysisApplicationService: Getting project analyses', { projectId, userId });
            
            if (!projectId) {
                throw new Error('Project ID is required');
            }

            const analyses = await this.projectAnalysisRepository.findByProjectId(projectId);
            
            return {
                success: true,
                data: {
                    projectId,
                    analyses: analyses || [],
                    count: analyses?.length || 0
                }
            };
        } catch (error) {
            this.logger.error('Error getting project analyses:', error);
            throw error;
        }
    }

    async createProjectAnalysis(projectId, analysisData, userId) {
        try {
            this.logger.info('ProjectAnalysisApplicationService: Creating project analysis', { projectId, userId });
            
            const analysis = new ProjectAnalysis({
                projectId,
                ...analysisData,
                createdBy: userId,
                createdAt: new Date()
            });

            const savedAnalysis = await this.projectAnalysisRepository.save(analysis);
            
            return {
                success: true,
                data: savedAnalysis
            };
        } catch (error) {
            this.logger.error('Error creating project analysis:', error);
            throw error;
        }
    }

    async getProjectAnalysis(analysisId, userId) {
        try {
            this.logger.info('ProjectAnalysisApplicationService: Getting project analysis', { analysisId, userId });
            
            const analysis = await this.projectAnalysisRepository.findById(analysisId);
            
            if (!analysis) {
                throw new Error('Analysis not found');
            }

            return {
                success: true,
                data: analysis
            };
        } catch (error) {
            this.logger.error('Error getting project analysis:', error);
            throw error;
        }
    }

    async updateProjectAnalysis(analysisId, updateData, userId) {
        try {
            this.logger.info('ProjectAnalysisApplicationService: Updating project analysis', { analysisId, userId });
            
            const analysis = await this.projectAnalysisRepository.findById(analysisId);
            
            if (!analysis) {
                throw new Error('Analysis not found');
            }

            // Update analysis with new data
            Object.assign(analysis, updateData, {
                updatedBy: userId,
                updatedAt: new Date()
            });

            const updatedAnalysis = await this.projectAnalysisRepository.save(analysis);
            
            return {
                success: true,
                data: updatedAnalysis
            };
        } catch (error) {
            this.logger.error('Error updating project analysis:', error);
            throw error;
        }
    }

    async deleteProjectAnalysis(analysisId, userId) {
        try {
            this.logger.info('ProjectAnalysisApplicationService: Deleting project analysis', { analysisId, userId });
            
            const analysis = await this.projectAnalysisRepository.findById(analysisId);
            
            if (!analysis) {
                throw new Error('Analysis not found');
            }

            await this.projectAnalysisRepository.delete(analysisId);
            
            return {
                success: true,
                message: 'Analysis deleted successfully'
            };
        } catch (error) {
            this.logger.error('Error deleting project analysis:', error);
            throw error;
        }
    }

    async generateETag(data) {
        try {
            return this.etagService.generate(data);
        } catch (error) {
            this.logger.error('Error generating ETag:', error);
            throw error;
        }
    }

    async validateETag(etag, data) {
        try {
            return this.etagService.validate(etag, data);
        } catch (error) {
            this.logger.error('Error validating ETag:', error);
            throw error;
        }
    }

    async getAnalysesByStatus(projectId, status, userId) {
        try {
            this.logger.info('ProjectAnalysisApplicationService: Getting analyses by status', { projectId, status, userId });
            
            const analyses = await this.projectAnalysisRepository.findByProjectIdAndStatus(projectId, status);
            
            return {
                success: true,
                data: {
                    projectId,
                    status,
                    analyses: analyses || [],
                    count: analyses?.length || 0
                }
            };
        } catch (error) {
            this.logger.error('Error getting analyses by status:', error);
            throw error;
        }
    }

    async getLatestAnalysis(projectId, userId) {
        try {
            this.logger.info('ProjectAnalysisApplicationService: Getting latest analysis', { projectId, userId });
            
            const analysis = await this.projectAnalysisRepository.findLatestByProjectId(projectId);
            
            return {
                success: true,
                data: analysis
            };
        } catch (error) {
            this.logger.error('Error getting latest analysis:', error);
            throw error;
        }
    }

    async getLatestAnalysisByType(projectId, analysisType, userId) {
        try {
            this.logger.info('ProjectAnalysisApplicationService: Getting latest analysis by type', { projectId, analysisType, userId });
            
            const analysis = await this.projectAnalysisRepository.findLatestByProjectIdAndType(projectId, analysisType);
            
            return {
                success: true,
                data: analysis
            };
        } catch (error) {
            this.logger.error('Error getting latest analysis by type:', error);
            throw error;
        }
    }

    async getAnalysesByType(projectId, analysisType, userId) {
        try {
            this.logger.info('ProjectAnalysisApplicationService: Getting analyses by type', { projectId, analysisType, userId });
            
            const analyses = await this.projectAnalysisRepository.findByProjectIdAndType(projectId, analysisType);
            
            return {
                success: true,
                data: {
                    projectId,
                    analysisType,
                    analyses: analyses || [],
                    count: analyses?.length || 0
                }
            };
        } catch (error) {
            this.logger.error('Error getting analyses by type:', error);
            throw error;
        }
    }

    async getAnalysisStats(projectId, userId) {
        try {
            this.logger.info('ProjectAnalysisApplicationService: Getting analysis stats', { projectId, userId });
            
            const allAnalyses = await this.projectAnalysisRepository.findByProjectId(projectId);
            
            // Group by type and calculate stats
            const statsByType = {};
            const typeOrder = ['security', 'performance', 'quality', 'architecture', 'dependencies'];
            
            allAnalyses.forEach(analysis => {
                const type = analysis.type || 'unknown';
                if (!statsByType[type]) {
                    statsByType[type] = {
                        type: type,
                        count: 0,
                        latestAnalysis: null,
                        totalSize: 0
                    };
                }
                
                statsByType[type].count++;
                statsByType[type].totalSize += analysis.dataSize || 0;
                
                if (!statsByType[type].latestAnalysis || 
                    new Date(analysis.createdAt) > new Date(statsByType[type].latestAnalysis.createdAt)) {
                    statsByType[type].latestAnalysis = analysis;
                }
            });
            
            return {
                success: true,
                data: {
                    projectId,
                    totalAnalyses: allAnalyses.length,
                    statsByType: Object.values(statsByType).sort((a, b) => {
                        const aIndex = typeOrder.indexOf(a.type);
                        const bIndex = typeOrder.indexOf(b.type);
                        return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
                    })
                }
            };
        } catch (error) {
            this.logger.error('Error getting analysis stats:', error);
            throw error;
        }
    }
}

module.exports = ProjectAnalysisApplicationService; 