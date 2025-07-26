class AnalysisRepository {
    async save(analysisResult) {
        throw new Error('Method not implemented');
    }

    async findById(id) {
        throw new Error('Method not implemented');
    }

    async findByProjectId(projectId) {
        throw new Error('Method not implemented');
    }

    async findByProjectIdAndType(projectId, analysisType) {
        throw new Error('Method not implemented');
    }

    async findLatestByProjectId(projectId) {
        throw new Error('Method not implemented');
    }

    async findLatestCompleted(projectId, analysisType) {
        throw new Error('Method not implemented');
    }

    async findLatestByType(projectId, analysisType) {
        throw new Error('Method not implemented');
    }

    async deleteById(id) {
        throw new Error('Method not implemented');
    }

    async deleteByProjectId(projectId) {
        throw new Error('Method not implemented');
    }

    // Additional methods for AnalysisApplicationService compatibility
    async getLatestAnalysis(projectId, types = null) {
        throw new Error('Method not implemented');
    }

    async getAnalysisHistory(projectId, options = {}) {
        throw new Error('Method not implemented');
    }

    async getCachedAnalysis(projectId, types) {
        throw new Error('Method not implemented');
    }

    async cacheAnalysis(projectId, types, analysis) {
        throw new Error('Method not implemented');
    }
}

module.exports = AnalysisRepository; 