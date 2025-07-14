const AnalysisRepository = require('@repositories/AnalysisRepository');
const AnalysisResult = require('@entities/AnalysisResult');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

class SQLiteAnalysisRepository extends AnalysisRepository {
  constructor(databaseConnection) {
    super();
    this.db = databaseConnection;
  }

  async save(analysisResult) {
    if (!(analysisResult instanceof AnalysisResult)) {
      throw new Error('Invalid analysis result entity');
    }

    const sql = `
      INSERT OR REPLACE INTO analysis_results (
        id, project_id, analysis_type, result_data, summary, status, 
        started_at, completed_at, duration_ms, overall_score, 
        critical_issues_count, warnings_count, recommendations_count, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const analysisData = analysisResult.toJSON();
    
    await this.db.execute(sql, [
      analysisData.id,
      analysisData.project_id,
      analysisData.analysis_type,
      JSON.stringify(analysisData.result_data),
      JSON.stringify(analysisData.summary),
      analysisData.status,
      analysisData.started_at,
      analysisData.completed_at,
      analysisData.duration_ms,
      analysisData.overall_score,
      analysisData.critical_issues_count,
      analysisData.warnings_count,
      analysisData.recommendations_count,
      analysisData.created_at
    ]);

    return analysisResult;
  }

  async findById(id) {
    if (!id) {
      throw new Error('Analysis id is required');
    }

    const sql = 'SELECT * FROM analysis_results WHERE id = ?';
    const row = await this.db.getOne(sql, [id]);
    
    if (!row) return null;
    
    return this.mapRowToEntity(row);
  }

  async findByProjectId(projectId) {
    if (!projectId) {
      throw new Error('Project id is required');
    }

    const sql = 'SELECT * FROM analysis_results WHERE project_id = ? ORDER BY created_at DESC';
    logger.info(`[SQLiteAnalysisRepository] Executing query: ${sql} with projectId: ${projectId}`);
    
    const rows = await this.db.query(sql, [projectId]);
    logger.info(`[SQLiteAnalysisRepository] Found ${rows.length} rows for projectId: ${projectId}`);
    logger.info(`[SQLiteAnalysisRepository] Raw rows:`, rows);
    
    const entities = rows.map(row => this.mapRowToEntity(row));
    logger.info(`[SQLiteAnalysisRepository] Mapped to ${entities.length} entities`);
    
    return entities;
  }

  async findByProjectIdAndType(projectId, analysisType) {
    if (!projectId) {
      throw new Error('Project id is required');
    }
    if (!analysisType) {
      throw new Error('Analysis type is required');
    }

    const sql = 'SELECT * FROM analysis_results WHERE project_id = ? AND analysis_type = ? ORDER BY created_at DESC';
    const rows = await this.db.query(sql, [projectId, analysisType]);
    
    return rows.map(row => this.mapRowToEntity(row));
  }

  async findLatestByProjectId(projectId) {
    const projectAnalyses = await this.findByProjectId(projectId);
    return projectAnalyses.length > 0 ? projectAnalyses[0] : null;
  }

  async findByStatus(status) {
    if (!status) {
      throw new Error('Status is required');
    }

    const sql = 'SELECT * FROM analysis_results WHERE status = ? ORDER BY created_at DESC';
    const rows = await this.db.query(sql, [status]);
    
    return rows.map(row => this.mapRowToEntity(row));
  }

  async findByAnalysisType(analysisType) {
    if (!analysisType) {
      throw new Error('Analysis type is required');
    }

    const sql = 'SELECT * FROM analysis_results WHERE analysis_type = ? ORDER BY created_at DESC';
    const rows = await this.db.query(sql, [analysisType]);
    
    return rows.map(row => this.mapRowToEntity(row));
  }

  async findWithScoreAbove(score) {
    if (score === undefined || score === null) {
      throw new Error('Score is required');
    }

    const sql = 'SELECT * FROM analysis_results WHERE overall_score >= ? ORDER BY overall_score DESC';
    const rows = await this.db.query(sql, [score]);
    
    return rows.map(row => this.mapRowToEntity(row));
  }

  async findWithCriticalIssues() {
    const sql = 'SELECT * FROM analysis_results WHERE critical_issues_count > 0 ORDER BY critical_issues_count DESC, created_at DESC';
    const rows = await this.db.query(sql);
    
    return rows.map(row => this.mapRowToEntity(row));
  }

  async getProjectAnalysisStats(projectId) {
    if (!projectId) {
      throw new Error('Project id is required');
    }

    const sql = `
      SELECT 
        COUNT(*) as total_analyses,
        AVG(overall_score) as avg_score,
        SUM(critical_issues_count) as total_critical_issues,
        SUM(warnings_count) as total_warnings,
        SUM(recommendations_count) as total_recommendations,
        MAX(created_at) as last_analysis
      FROM analysis_results 
      WHERE project_id = ?
    `;
    
    const row = await this.db.getOne(sql, [projectId]);
    
    return {
      totalAnalyses: row.total_analyses || 0,
      averageScore: row.avg_score || 0,
      totalCriticalIssues: row.total_critical_issues || 0,
      totalWarnings: row.total_warnings || 0,
      totalRecommendations: row.total_recommendations || 0,
      lastAnalysis: row.last_analysis
    };
  }

  async getAnalysisTypeStats() {
    const sql = `
      SELECT 
        analysis_type,
        COUNT(*) as count,
        AVG(overall_score) as avg_score,
        AVG(duration_ms) as avg_duration
      FROM analysis_results 
      GROUP BY analysis_type
      ORDER BY count DESC
    `;
    
    const rows = await this.db.query(sql);
    
    return rows.map(row => ({
      analysisType: row.analysis_type,
      count: row.count,
      averageScore: row.avg_score || 0,
      averageDuration: row.avg_duration || 0
    }));
  }

  async deleteById(id) {
    if (!id) {
      throw new Error('Analysis id is required');
    }

    const sql = 'DELETE FROM analysis_results WHERE id = ?';
    const result = await this.db.execute(sql, [id]);
    return result.rowsAffected > 0;
  }

  async deleteByProjectId(projectId) {
    if (!projectId) {
      throw new Error('Project id is required');
    }

    const sql = 'DELETE FROM analysis_results WHERE project_id = ?';
    const result = await this.db.execute(sql, [projectId]);
    return result.rowsAffected > 0;
  }

  async deleteOldAnalyses(daysOld = 30) {
    const sql = 'DELETE FROM analysis_results WHERE created_at < datetime(\'now\', \'-? days\')';
    const result = await this.db.execute(sql, [daysOld]);
    return result.rowsAffected;
  }

  async getAll() {
    const sql = 'SELECT * FROM analysis_results ORDER BY created_at DESC';
    const rows = await this.db.query(sql);
    
    return rows.map(row => this.mapRowToEntity(row));
  }

  async clear() {
    const sql = 'DELETE FROM analysis_results';
    await this.db.execute(sql);
  }

  mapRowToEntity(row) {
    let resultData = {};
    let summary = {};
    
    if (row.result_data) {
      try {
        resultData = typeof row.result_data === 'string' ? JSON.parse(row.result_data) : row.result_data;
      } catch (error) {
        logger.warn('Failed to parse result_data for analysis:', row.id, error.message);
        resultData = {};
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
    
    const analysisData = {
      id: row.id,
      project_id: row.project_id,
      analysis_type: row.analysis_type,
      result_data: resultData,
      summary: summary,
      status: row.status,
      started_at: row.started_at,
      completed_at: row.completed_at,
      duration_ms: row.duration_ms,
      overall_score: row.overall_score,
      critical_issues_count: row.critical_issues_count,
      warnings_count: row.warnings_count,
      recommendations_count: row.recommendations_count,
      created_at: row.created_at
    };
    
    return AnalysisResult.fromJSON(analysisData);
  }
}

module.exports = SQLiteAnalysisRepository; 