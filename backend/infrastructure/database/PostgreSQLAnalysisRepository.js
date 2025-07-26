const AnalysisRepository = require('@repositories/AnalysisRepository');
const AnalysisResult = require('@entities/AnalysisResult');
const Logger = require('@logging/Logger');
const logger = new Logger('PostgreSQLAnalysisRepository');

class PostgreSQLAnalysisRepository extends AnalysisRepository {
  constructor(databaseConnection) {
    super();
    this.db = databaseConnection;
  }

  async save(analysisResult) {
    if (!(analysisResult instanceof AnalysisResult)) {
      throw new Error('Invalid analysis result entity');
    }

    const sql = `
      INSERT INTO analysis_results (
        id, project_id, analysis_type, result_data, summary, status, 
        started_at, completed_at, duration_ms, overall_score, 
        critical_issues_count, warnings_count, recommendations_count, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (id) DO UPDATE SET
        project_id = EXCLUDED.project_id,
        analysis_type = EXCLUDED.analysis_type,
        result_data = EXCLUDED.result_data,
        summary = EXCLUDED.summary,
        status = EXCLUDED.status,
        started_at = EXCLUDED.started_at,
        completed_at = EXCLUDED.completed_at,
        duration_ms = EXCLUDED.duration_ms,
        overall_score = EXCLUDED.overall_score,
        critical_issues_count = EXCLUDED.critical_issues_count,
        warnings_count = EXCLUDED.warnings_count,
        recommendations_count = EXCLUDED.recommendations_count
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

    const sql = 'SELECT * FROM analysis_results WHERE id = $1';
    const row = await this.db.getOne(sql, [id]);
    
    if (!row) return null;
    
    return this.mapRowToEntity(row);
  }

  async findByProjectId(projectId) {
    if (!projectId) {
      throw new Error('Project id is required');
    }

    const sql = 'SELECT * FROM analysis_results WHERE project_id = $1 ORDER BY created_at DESC';
    
    const rows = await this.db.query(sql, [projectId]);
    logger.info(`Found ${rows.length} rows for projectId: ${projectId}`);
    
    const entities = rows.map(row => this.mapRowToEntity(row));
    logger.info(`Mapped to ${entities.length} entities`);
    
    return entities;
  }

  async findByProjectIdAndType(projectId, analysisType) {
    if (!projectId) {
      throw new Error('Project id is required');
    }
    if (!analysisType) {
      throw new Error('Analysis type is required');
    }

    const sql = 'SELECT * FROM analysis_results WHERE project_id = $1 AND analysis_type = $2 ORDER BY created_at DESC';
    const rows = await this.db.query(sql, [projectId, analysisType]);
    
    return rows.map(row => this.mapRowToEntity(row));
  }

  async findLatestByProjectId(projectId) {
    if (!projectId) {
      throw new Error('Project id is required');
    }

    const sql = 'SELECT * FROM analysis_results WHERE project_id = $1 ORDER BY created_at DESC LIMIT 1';
    const row = await this.db.getOne(sql, [projectId]);
    
    if (!row) return null;
    
    return this.mapRowToEntity(row);
  }

  async findByAnalysisType(analysisType) {
    if (!analysisType) {
      throw new Error('Analysis type is required');
    }

    const sql = 'SELECT * FROM analysis_results WHERE analysis_type = $1 ORDER BY created_at DESC';
    const rows = await this.db.query(sql, [analysisType]);
    
    return rows.map(row => this.mapRowToEntity(row));
  }

  async deleteById(id) {
    if (!id) {
      throw new Error('Analysis id is required');
    }

    const sql = 'DELETE FROM analysis_results WHERE id = $1';
    const result = await this.db.execute(sql, [id]);
    return result.rowsAffected > 0;
  }

  async deleteByProjectId(projectId) {
    if (!projectId) {
      throw new Error('Project id is required');
    }

    const sql = 'DELETE FROM analysis_results WHERE project_id = $1';
    const result = await this.db.execute(sql, [projectId]);
    return result.rowsAffected;
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
      WHERE project_id = $1
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

  async getAnalysisByStatus(status) {
    if (!status) {
      throw new Error('Status is required');
    }

    const sql = 'SELECT * FROM analysis_results WHERE status = $1 ORDER BY created_at DESC';
    const rows = await this.db.query(sql, [status]);
    
    return rows.map(row => this.mapRowToEntity(row));
  }

  async getAnalysisByDateRange(startDate, endDate) {
    if (!startDate || !endDate) {
      throw new Error('Start date and end date are required');
    }

    const sql = 'SELECT * FROM analysis_results WHERE created_at >= $1 AND created_at <= $2 ORDER BY created_at DESC';
    const rows = await this.db.query(sql, [startDate, endDate]);
    
    return rows.map(row => this.mapRowToEntity(row));
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

module.exports = PostgreSQLAnalysisRepository; 