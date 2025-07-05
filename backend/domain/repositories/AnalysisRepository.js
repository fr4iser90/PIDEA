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

    async deleteById(id) {
        throw new Error('Method not implemented');
    }

    async deleteByProjectId(projectId) {
        throw new Error('Method not implemented');
    }
}

module.exports = AnalysisRepository; 