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
      INSERT OR REPLACE INTO analysis_results (id, project_id, type, result, created_at)
      VALUES (?, ?, ?, ?, ?)
    `;

    const analysisData = analysisResult.toJSON();
    
    await this.db.execute(sql, [
      analysisData.id,
      analysisData.projectId,
      analysisData.type,
      JSON.stringify(analysisData.result),
      analysisData.createdAt
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
    
    let result = {};
    if (row.result) {
      try {
        result = typeof row.result === 'string' ? JSON.parse(row.result) : row.result;
      } catch (error) {
        logger.warn('Failed to parse result for analysis:', id, error.message);
        result = {};
      }
    }
    
    const analysisData = {
      id: row.id,
      projectId: row.project_id,
      type: row.type,
      result: result,
      createdAt: row.created_at
    };
    
    return AnalysisResult.fromJSON(analysisData);
  }

  async findByProjectId(projectId) {
    if (!projectId) {
      throw new Error('Project id is required');
    }

    const sql = 'SELECT * FROM analysis_results WHERE project_id = ? ORDER BY created_at DESC';
    const rows = await this.db.query(sql, [projectId]);
    
    return rows.map(row => {
      let result = {};
      if (row.result) {
        try {
          result = typeof row.result === 'string' ? JSON.parse(row.result) : row.result;
        } catch (error) {
          logger.warn('Failed to parse result for analysis:', row.id, error.message);
          result = {};
        }
      }
      
      const analysisData = {
        id: row.id,
        projectId: row.project_id,
        type: row.type,
        result: result,
        createdAt: row.created_at
      };
      
      return AnalysisResult.fromJSON(analysisData);
    });
  }

  async findByProjectIdAndType(projectId, analysisType) {
    if (!projectId) {
      throw new Error('Project id is required');
    }
    if (!analysisType) {
      throw new Error('Analysis type is required');
    }

    const sql = 'SELECT * FROM analysis_results WHERE project_id = ? AND type = ? ORDER BY created_at DESC';
    const rows = await this.db.query(sql, [projectId, analysisType]);
    
    return rows.map(row => {
      let result = {};
      if (row.result) {
        try {
          result = typeof row.result === 'string' ? JSON.parse(row.result) : row.result;
        } catch (error) {
          logger.warn('Failed to parse result for analysis:', row.id, error.message);
          result = {};
        }
      }
      
      const analysisData = {
        id: row.id,
        projectId: row.project_id,
        type: row.type,
        result: result,
        createdAt: row.created_at
      };
      
      return AnalysisResult.fromJSON(analysisData);
    });
  }

  async findLatestByProjectId(projectId) {
    const projectAnalyses = await this.findByProjectId(projectId);
    return projectAnalyses.length > 0 ? projectAnalyses[0] : null;
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

  async getAll() {
    const sql = 'SELECT * FROM analysis_results ORDER BY created_at DESC';
    const rows = await this.db.query(sql);
    
    return rows.map(row => {
      let result = {};
      if (row.result) {
        try {
          result = typeof row.result === 'string' ? JSON.parse(row.result) : row.result;
        } catch (error) {
          logger.warn('Failed to parse result for analysis:', row.id, error.message);
          result = {};
        }
      }
      
      const analysisData = {
        id: row.id,
        projectId: row.project_id,
        type: row.type,
        result: result,
        createdAt: row.created_at
      };
      
      return AnalysisResult.fromJSON(analysisData);
    });
  }

  async clear() {
    const sql = 'DELETE FROM analysis_results';
    await this.db.execute(sql);
  }
}

module.exports = SQLiteAnalysisRepository; 