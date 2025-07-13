const ProjectAnalysisRepository = require('@repositories/ProjectAnalysisRepository');
const ProjectAnalysis = require('@entities/ProjectAnalysis');
const { logger } = require('@infrastructure/logging/Logger');


class PostgreSQLProjectAnalysisRepository extends ProjectAnalysisRepository {
  constructor(databaseConnection) {
    super();
    this.db = databaseConnection;
  }

  async save(analysis) {
    if (!(analysis instanceof ProjectAnalysis)) {
      throw new Error('Invalid analysis entity');
    }

    const sql = `
      INSERT INTO project_analyses (id, project_id, project_path, analysis_type, analysis_data, version, created_at, updated_at, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO UPDATE SET
        project_id = EXCLUDED.project_id,
        project_path = EXCLUDED.project_path,
        analysis_type = EXCLUDED.analysis_type,
        analysis_data = EXCLUDED.analysis_data,
        version = EXCLUDED.version,
        updated_at = EXCLUDED.updated_at,
        metadata = EXCLUDED.metadata
    `;

    const analysisData = analysis.toJSON();
    const analysisDataValue = this.db.getType() === 'postgresql' ? analysisData.analysisData : JSON.stringify(analysisData.analysisData);
    const metadataValue = this.db.getType() === 'postgresql' ? analysisData.metadata : JSON.stringify(analysisData.metadata);
    
    await this.db.execute(sql, [
      analysisData.id,
      analysisData.projectId,
      analysisData.projectPath,
      analysisData.analysisType,
      analysisDataValue,
      analysisData.version,
      analysisData.createdAt,
      analysisData.updatedAt,
      metadataValue
    ]);

    return analysis;
  }

  async findById(id) {
    if (!id) {
      throw new Error('Analysis id is required');
    }

    const sql = 'SELECT * FROM project_analyses WHERE id = $1';
    const row = await this.db.getOne(sql, [id]);
    
    if (!row) return null;
    
    return this.reconstructAnalysis(row);
  }

  async findByProjectId(projectId) {
    if (!projectId) {
      throw new Error('Project id is required');
    }

    const sql = 'SELECT * FROM project_analyses WHERE project_id = $1 ORDER BY created_at DESC';
    const rows = await this.db.query(sql, [projectId]);
    
    return rows.map(row => this.reconstructAnalysis(row));
  }

  async findByProjectIdAndType(projectId, analysisType) {
    if (!projectId) {
      throw new Error('Project id is required');
    }
    if (!analysisType) {
      throw new Error('Analysis type is required');
    }

    const sql = 'SELECT * FROM project_analyses WHERE project_id = $1 AND analysis_type = $2 ORDER BY created_at DESC';
    const rows = await this.db.query(sql, [projectId, analysisType]);
    
    return rows.map(row => this.reconstructAnalysis(row));
  }

  async findLatestByProjectIdAndType(projectId, analysisType) {
    if (!projectId) {
      throw new Error('Project id is required');
    }
    if (!analysisType) {
      throw new Error('Analysis type is required');
    }

    const sql = 'SELECT * FROM project_analyses WHERE project_id = $1 AND analysis_type = $2 ORDER BY created_at DESC LIMIT 1';
    const row = await this.db.getOne(sql, [projectId, analysisType]);
    
    if (!row) return null;
    
    return this.reconstructAnalysis(row);
  }

  async findByProjectPath(projectPath) {
    if (!projectPath) {
      throw new Error('Project path is required');
    }

    const sql = 'SELECT * FROM project_analyses WHERE project_path = $1 ORDER BY created_at DESC';
    const rows = await this.db.query(sql, [projectPath]);
    
    return rows.map(row => this.reconstructAnalysis(row));
  }

  async findAll() {
    const sql = 'SELECT * FROM project_analyses ORDER BY created_at DESC';
    const rows = await this.db.query(sql);
    
    return rows.map(row => this.reconstructAnalysis(row));
  }

  async delete(id) {
    if (!id) {
      throw new Error('Analysis id is required');
    }

    const sql = 'DELETE FROM project_analyses WHERE id = $1';
    const result = await this.db.execute(sql, [id]);
    return result.rowsAffected > 0;
  }

  async deleteByProjectId(projectId) {
    if (!projectId) {
      throw new Error('Project id is required');
    }

    const sql = 'DELETE FROM project_analyses WHERE project_id = $1';
    const result = await this.db.execute(sql, [projectId]);
    return result.rowsAffected > 0;
  }

  async update(analysis) {
    if (!(analysis instanceof ProjectAnalysis)) {
      throw new Error('Invalid analysis entity');
    }

    const sql = `
      UPDATE project_analyses 
      SET project_id = $2, project_path = $3, analysis_type = $4, analysis_data = $5, version = $6, updated_at = $7, metadata = $8
      WHERE id = $1
    `;

    const analysisData = analysis.toJSON();
    const analysisDataValue = this.db.getType() === 'postgresql' ? analysisData.analysisData : JSON.stringify(analysisData.analysisData);
    const metadataValue = this.db.getType() === 'postgresql' ? analysisData.metadata : JSON.stringify(analysisData.metadata);
    
    const result = await this.db.execute(sql, [
      analysisData.id,
      analysisData.projectId,
      analysisData.projectPath,
      analysisData.analysisType,
      analysisDataValue,
      analysisData.version,
      analysisData.updatedAt,
      metadataValue
    ]);

    return result.rowsAffected > 0;
  }

  async exists(projectId, analysisType) {
    if (!projectId) {
      throw new Error('Project id is required');
    }
    if (!analysisType) {
      throw new Error('Analysis type is required');
    }

    const sql = 'SELECT COUNT(*) as count FROM project_analyses WHERE project_id = $1 AND analysis_type = $2';
    const result = await this.db.getOne(sql, [projectId, analysisType]);
    return result.count > 0;
  }

  async countByProjectId(projectId) {
    if (!projectId) {
      throw new Error('Project id is required');
    }

    const sql = 'SELECT COUNT(*) as count FROM project_analyses WHERE project_id = $1';
    const result = await this.db.getOne(sql, [projectId]);
    return result.count;
  }

  reconstructAnalysis(row) {
    let analysisData = {};
    let metadata = {};
    
    if (row.analysis_data) {
      try {
        analysisData = typeof row.analysis_data === 'string' ? JSON.parse(row.analysis_data) : row.analysis_data;
      } catch (error) {
        logger.warn('Failed to parse analysis_data for analysis:', row.id, error.message);
        analysisData = {};
      }
    }
    
    if (row.metadata) {
      try {
        metadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
      } catch (error) {
        logger.warn('Failed to parse metadata for analysis:', row.id, error.message);
        metadata = {};
      }
    }
    
    const analysisDataObj = {
      id: row.id,
      projectId: row.project_id,
      projectPath: row.project_path,
      analysisType: row.analysis_type,
      analysisData: analysisData,
      version: row.version,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      metadata: metadata
    };
    
    return ProjectAnalysis.fromJSON(analysisDataObj);
  }
}

module.exports = PostgreSQLProjectAnalysisRepository; 