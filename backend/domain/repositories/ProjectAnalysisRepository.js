class ProjectAnalysisRepository {
  async save(analysis) {
    throw new Error('save method must be implemented');
  }

  async findById(id) {
    throw new Error('findById method must be implemented');
  }

  async findByProjectId(projectId) {
    throw new Error('findByProjectId method must be implemented');
  }

  async findByProjectIdAndType(projectId, analysisType) {
    throw new Error('findByProjectIdAndType method must be implemented');
  }

  async findLatestByProjectIdAndType(projectId, analysisType) {
    throw new Error('findLatestByProjectIdAndType method must be implemented');
  }

  async findByProjectPath(projectPath) {
    throw new Error('findByProjectPath method must be implemented');
  }

  async findAll() {
    throw new Error('findAll method must be implemented');
  }

  async delete(id) {
    throw new Error('delete method must be implemented');
  }

  async deleteByProjectId(projectId) {
    throw new Error('deleteByProjectId method must be implemented');
  }

  async update(analysis) {
    throw new Error('update method must be implemented');
  }

  async exists(projectId, analysisType) {
    throw new Error('exists method must be implemented');
  }

  async countByProjectId(projectId) {
    throw new Error('countByProjectId method must be implemented');
  }
}

module.exports = ProjectAnalysisRepository; 