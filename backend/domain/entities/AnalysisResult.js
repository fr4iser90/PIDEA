class AnalysisResult {
    constructor(id, projectId, analysisType, resultData, summary, status, startedAt, completedAt, durationMs, overallScore, criticalIssuesCount, warningsCount, recommendationsCount, createdAt) {
        this.id = id;
        this.projectId = projectId;
        this.analysisType = analysisType;
        this.resultData = resultData;
        this.summary = summary;
        this.status = status || 'completed';
        this.startedAt = startedAt;
        this.completedAt = completedAt;
        this.durationMs = durationMs;
        this.overallScore = overallScore || 0;
        this.criticalIssuesCount = criticalIssuesCount || 0;
        this.warningsCount = warningsCount || 0;
        this.recommendationsCount = recommendationsCount || 0;
        this.createdAt = createdAt || new Date().toISOString();
    }

    static create(projectId, analysisType, resultData, summary, options = {}) {
        const id = `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date().toISOString();
        
        return new AnalysisResult(
            id,
            projectId,
            analysisType,
            resultData,
            summary,
            options.status || 'completed',
            options.startedAt || now,
            options.completedAt || now,
            options.durationMs || 0,
            options.overallScore || 0,
            options.criticalIssuesCount || 0,
            options.warningsCount || 0,
            options.recommendationsCount || 0,
            now
        );
    }

    toJSON() {
        return {
            id: this.id,
            project_id: this.projectId,
            analysis_type: this.analysisType,
            result_data: this.resultData,
            summary: this.summary,
            status: this.status,
            started_at: this.startedAt,
            completed_at: this.completedAt,
            duration_ms: this.durationMs,
            overall_score: this.overallScore,
            critical_issues_count: this.criticalIssuesCount,
            warnings_count: this.warningsCount,
            recommendations_count: this.recommendationsCount,
            created_at: this.createdAt
        };
    }

    static fromJSON(json) {
        return new AnalysisResult(
            json.id,
            json.project_id || json.projectId,
            json.analysis_type || json.analysisType,
            json.result_data || json.resultData || json.result || json.data,
            json.summary,
            json.status,
            json.started_at || json.startedAt,
            json.completed_at || json.completedAt,
            json.duration_ms || json.durationMs,
            json.overall_score || json.overallScore,
            json.critical_issues_count || json.criticalIssuesCount,
            json.warnings_count || json.warningsCount,
            json.recommendations_count || json.recommendationsCount,
            json.created_at || json.createdAt || json.timestamp
        );
    }
}

module.exports = AnalysisResult; 