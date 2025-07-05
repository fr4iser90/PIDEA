const AnalysisRepository = require('../../domain/repositories/AnalysisRepository');

class InMemoryAnalysisRepository extends AnalysisRepository {
    constructor() {
        super();
        this.analyses = new Map();
    }

    async save(analysisResult) {
        this.analyses.set(analysisResult.id, analysisResult);
        return analysisResult;
    }

    async findById(id) {
        return this.analyses.get(id) || null;
    }

    async findByProjectId(projectId) {
        const results = [];
        for (const analysis of this.analyses.values()) {
            if (analysis.projectId === projectId) {
                results.push(analysis);
            }
        }
        return results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    async findByProjectIdAndType(projectId, analysisType) {
        const results = [];
        for (const analysis of this.analyses.values()) {
            if (analysis.projectId === projectId && analysis.analysisType === analysisType) {
                results.push(analysis);
            }
        }
        return results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    async findLatestByProjectId(projectId) {
        const projectAnalyses = await this.findByProjectId(projectId);
        return projectAnalyses.length > 0 ? projectAnalyses[0] : null;
    }

    async deleteById(id) {
        return this.analyses.delete(id);
    }

    async deleteByProjectId(projectId) {
        const toDelete = [];
        for (const [id, analysis] of this.analyses.entries()) {
            if (analysis.projectId === projectId) {
                toDelete.push(id);
            }
        }
        toDelete.forEach(id => this.analyses.delete(id));
        return toDelete.length;
    }

    async getAll() {
        return Array.from(this.analyses.values()).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    async clear() {
        this.analyses.clear();
    }
}

module.exports = InMemoryAnalysisRepository; 