class AnalysisResult {
    constructor(id, projectId, analysisType, data, timestamp, filepath) {
        this.id = id;
        this.projectId = projectId;
        this.analysisType = analysisType;
        this.data = data;
        this.timestamp = timestamp || new Date().toISOString();
        this.filepath = filepath;
    }

    static create(projectId, analysisType, data, filepath) {
        const id = `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        return new AnalysisResult(id, projectId, analysisType, data, new Date().toISOString(), filepath);
    }

    toJSON() {
        return {
            id: this.id,
            projectId: this.projectId,
            analysisType: this.analysisType,
            data: this.data,
            timestamp: this.timestamp,
            filepath: this.filepath
        };
    }

    static fromJSON(json) {
        return new AnalysisResult(
            json.id,
            json.projectId,
            json.analysisType,
            json.data,
            json.timestamp,
            json.filepath
        );
    }
}

module.exports = AnalysisResult; 