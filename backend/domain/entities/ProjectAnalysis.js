const { v4: uuidv4 } = require('uuid');

class ProjectAnalysis {
  constructor({
    id = uuidv4(),
    projectId,
    projectPath,
    analysisType,
    analysisData,
    version = '1.0.0',
    createdAt = new Date(),
    updatedAt = new Date(),
    metadata = {}
  }) {
    this.id = id;
    this.projectId = projectId;
    this.projectPath = projectPath;
    this.analysisType = analysisType;
    this.analysisData = analysisData;
    this.version = version;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.metadata = metadata;
  }

  static fromJSON(data) {
    return new ProjectAnalysis({
      id: data.id,
      projectId: data.projectId || data.project_id,
      projectPath: data.projectPath || data.project_path,
      analysisType: data.analysisType || data.analysis_type,
      analysisData: data.analysisData || data.analysis_data,
      version: data.version,
      createdAt: data.createdAt || data.created_at,
      updatedAt: data.updatedAt || data.updated_at,
      metadata: data.metadata
    });
  }

  toJSON() {
    return {
      id: this.id,
      projectId: this.projectId,
      projectPath: this.projectPath,
      analysisType: this.analysisType,
      analysisData: this.analysisData,
      version: this.version,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      metadata: this.metadata
    };
  }

  updateAnalysisData(newData) {
    this.analysisData = { ...this.analysisData, ...newData };
    this.updatedAt = new Date();
  }

  updateVersion(newVersion) {
    this.version = newVersion;
    this.updatedAt = new Date();
  }

  addMetadata(key, value) {
    this.metadata[key] = value;
    this.updatedAt = new Date();
  }

  getAnalysisData() {
    return this.analysisData;
  }

  getProjectId() {
    return this.projectId;
  }

  getAnalysisType() {
    return this.analysisType;
  }

  getVersion() {
    return this.version;
  }
}

module.exports = ProjectAnalysis; 