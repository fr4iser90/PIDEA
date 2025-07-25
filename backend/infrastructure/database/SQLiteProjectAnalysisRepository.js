const ProjectAnalysis = require('@entities/ProjectAnalysis');
const Logger = require('@logging/Logger');
const logger = new Logger('SQLiteProjectAnalysisRepository');

class SQLiteProjectAnalysisRepository {
  constructor(databaseConnection) {
    this.db = databaseConnection;
    this.tableName = 'project_analysis';
  }

  async save(analysis) {
    if (!(analysis instanceof ProjectAnalysis)) {
      throw new Error('Invalid analysis entity');
    }
    const sql = `
      INSERT OR REPLACE INTO ${this.tableName} (
        id, project_id, analysis_type, analysis_data, summary, status, started_at, completed_at, duration_ms, overall_score, critical_issues_count, warnings_count, recommendations_count, file_hash, cache_expires_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const analysisData = analysis.toJSON();
    await this.db.execute(sql, [
      analysisData.id,
      analysisData.projectId,
      analysisData.analysisType,
      JSON.stringify(analysisData.analysisData),
      JSON.stringify(analysisData.summary),
      analysisData.status,
      analysisData.startedAt,
      analysisData.completedAt,
      analysisData.durationMs,
      analysisData.overallScore,
      analysisData.criticalIssuesCount,
      analysisData.warningsCount,
      analysisData.recommendationsCount,
      analysisData.fileHash,
      analysisData.cacheExpiresAt,
      analysisData.createdAt,
      analysisData.updatedAt
    ]);
    return analysis;
  }

  async findById(id) {
    const sql = `SELECT * FROM ${this.tableName} WHERE id = ?`;
    const row = await this.db.getOne(sql, [id]);
    return row ? this._rowToEntity(row) : null;
  }

  async findByProjectId(projectId) {
    const sql = `SELECT * FROM ${this.tableName} WHERE project_id = ? ORDER BY created_at DESC`;
    const rows = await this.db.query(sql, [projectId]);
    return rows.map(row => this._rowToEntity(row));
  }

  async findByProjectIdAndType(projectId, analysisType) {
    const sql = `SELECT * FROM ${this.tableName} WHERE project_id = ? AND analysis_type = ? ORDER BY created_at DESC`;
    const rows = await this.db.query(sql, [projectId, analysisType]);
    return rows.map(row => this._rowToEntity(row));
  }

  async findLatestByProjectIdAndType(projectId, analysisType) {
    const sql = `SELECT * FROM ${this.tableName} WHERE project_id = ? AND analysis_type = ? ORDER BY created_at DESC LIMIT 1`;
    const row = await this.db.getOne(sql, [projectId, analysisType]);
    return row ? this._rowToEntity(row) : null;
  }

  async findByProjectPath(projectPath) {
    // project_path gibt es in SQLite nicht, daher leeres Array zurück
    return [];
  }

  async findAll() {
    const sql = `SELECT * FROM ${this.tableName} ORDER BY created_at DESC`;
    const rows = await this.db.query(sql);
    return rows.map(row => this._rowToEntity(row));
  }

  async delete(id) {
    const sql = `DELETE FROM ${this.tableName} WHERE id = ?`;
    const result = await this.db.execute(sql, [id]);
    return result.rowsAffected > 0;
  }

  async deleteByProjectId(projectId) {
    const sql = `DELETE FROM ${this.tableName} WHERE project_id = ?`;
    const result = await this.db.execute(sql, [projectId]);
    return result.rowsAffected > 0;
  }

  async update(analysis) {
    if (!(analysis instanceof ProjectAnalysis)) {
      throw new Error('Invalid analysis entity');
    }
    const sql = `
      UPDATE ${this.tableName} SET
        project_id = ?, analysis_type = ?, analysis_data = ?, summary = ?, status = ?, started_at = ?, completed_at = ?, duration_ms = ?, overall_score = ?, critical_issues_count = ?, warnings_count = ?, recommendations_count = ?, file_hash = ?, cache_expires_at = ?, updated_at = ?
      WHERE id = ?
    `;
    const analysisData = analysis.toJSON();
    const params = [
      analysisData.projectId,
      analysisData.analysisType,
      JSON.stringify(analysisData.analysisData),
      JSON.stringify(analysisData.summary),
      analysisData.status,
      analysisData.startedAt,
      analysisData.completedAt,
      analysisData.durationMs,
      analysisData.overallScore,
      analysisData.criticalIssuesCount,
      analysisData.warningsCount,
      analysisData.recommendationsCount,
      analysisData.fileHash,
      analysisData.cacheExpiresAt,
      analysisData.updatedAt,
      analysisData.id
    ];
    await this.db.execute(sql, params);
    return analysis;
  }

  async exists(projectId, analysisType) {
    const sql = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE project_id = ? AND analysis_type = ?`;
    const row = await this.db.getOne(sql, [projectId, analysisType]);
    return row && row.count > 0;
  }

  async countByProjectId(projectId) {
    const sql = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE project_id = ?`;
    const row = await this.db.getOne(sql, [projectId]);
    return row ? row.count : 0;
  }

  _rowToEntity(row) {
    let analysisData = {};
    let summary = {};
    if (row.analysis_data) {
      try {
        analysisData = typeof row.analysis_data === 'string' ? JSON.parse(row.analysis_data) : row.analysis_data;
      } catch (error) {
        logger.warn('Failed to parse analysis_data for analysis:', row.id, error.message);
        analysisData = {};
      }
    }
    if (row.summary) {
      try {
        summary = typeof row.summary === 'string' ? JSON.parse(row.summary) : row.summary;
      } catch (error) {
        logger.warn('Failed to parse summary for analysis:', row.id, error.message);
        summary = {};
      }
    }
    return ProjectAnalysis.fromJSON({
      id: row.id,
      projectId: row.project_id,
      analysisType: row.analysis_type,
      analysisData: analysisData,
      summary: summary,
      status: row.status,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      durationMs: row.duration_ms,
      overallScore: row.overall_score,
      criticalIssuesCount: row.critical_issues_count,
      warningsCount: row.warnings_count,
      recommendationsCount: row.recommendations_count,
      fileHash: row.file_hash,
      cacheExpiresAt: row.cache_expires_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  }
}

module.exports = SQLiteProjectAnalysisRepository; 