# Database Analysis Optimization – Phase 1: Schema Extension

## Overview
**Status:** Pending ⏳  
**Duration:** 2 hours  
**Priority:** High

This phase focuses on extending the database schema to support structured storage of analysis issues and recommendations, enabling faster queries and better performance while maintaining backward compatibility with the existing JSON-based approach.

## Objectives
- [ ] Create analysis_issues table with proper structure
- [ ] Create analysis_recommendations table with proper structure
- [ ] Add performance indexes for optimal query performance
- [ ] Create database migration scripts
- [ ] Update database schema documentation
- [ ] Validate schema design and relationships

## Deliverables
- File: `database/migrations/002_analysis_optimization.sql` - Database migration script
- File: `database/schema/analysis_issues.sql` - Analysis issues table definition
- File: `database/schema/analysis_recommendations.sql` - Analysis recommendations table definition
- File: `database/indexes/analysis_performance.sql` - Performance indexes
- File: `docs/database/analysis-optimization-schema.md` - Schema documentation
- File: `backend/infrastructure/database/repositories/AnalysisIssuesRepository.js` - Issues repository
- File: `backend/infrastructure/database/repositories/AnalysisRecommendationsRepository.js` - Recommendations repository
- File: `backend/infrastructure/database/migrations/AnalysisOptimizationMigration.js` - Migration utility

## Dependencies
- Requires: No dependencies (foundation phase)
- Blocks: Phase 2 start

## Estimated Time
2 hours

## Detailed Tasks

### 1.1 Database Schema Creation (1 hour)
- [ ] Create `analysis_issues` table with comprehensive fields
- [ ] Create `analysis_recommendations` table with comprehensive fields
- [ ] Add foreign key constraints to analysis table
- [ ] Add proper data types and constraints
- [ ] Add default values and validation rules

### 1.2 Performance Indexes Creation (0.5 hours)
- [ ] Create composite indexes for common queries
- [ ] Add full-text search indexes for descriptions
- [ ] Create status and severity indexes for filtering
- [ ] Add project and analysis type indexes
- [ ] Optimize indexes for dashboard queries

### 1.3 Repository Classes Creation (0.5 hours)
- [ ] Create AnalysisIssuesRepository.js with CRUD operations
- [ ] Create AnalysisRecommendationsRepository.js with CRUD operations
- [ ] Implement query optimization methods
- [ ] Add data validation and sanitization
- [ ] Include error handling and logging

## Implementation Details

### Analysis Issues Table Schema
```sql
-- ANALYSIS ISSUES (Für bessere Abfragen)
CREATE TABLE IF NOT EXISTS analysis_issues (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    analysis_id TEXT NOT NULL,
    issue_id TEXT NOT NULL, -- Referenz auf Issue in result JSON
    type TEXT NOT NULL, -- 'vulnerability', 'performance', 'architecture', 'code-quality'
    severity TEXT NOT NULL, -- 'critical', 'high', 'medium', 'low'
    title TEXT NOT NULL,
    description TEXT,
    file TEXT,
    line INTEGER,
    column INTEGER,
    code_snippet TEXT,
    recommendation TEXT,
    estimated_fix_time INTEGER, -- minutes
    priority TEXT, -- 'low', 'medium', 'high', 'critical'
    status TEXT DEFAULT 'open', -- 'open', 'in_progress', 'fixed', 'ignored', 'false_positive'
    tags TEXT, -- JSON array
    metadata TEXT, -- JSON additional data
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (analysis_id) REFERENCES analysis (id) ON DELETE CASCADE
);
```

### Analysis Recommendations Table Schema
```sql
-- ANALYSIS RECOMMENDATIONS (Für bessere Abfragen)
CREATE TABLE IF NOT EXISTS analysis_recommendations (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    analysis_id TEXT NOT NULL,
    recommendation_id TEXT NOT NULL, -- Referenz auf Recommendation in result JSON
    type TEXT NOT NULL, -- 'security', 'performance', 'architecture', 'code-quality'
    title TEXT NOT NULL,
    description TEXT,
    impact TEXT, -- 'high', 'medium', 'low'
    effort TEXT, -- 'high', 'medium', 'low'
    estimated_time INTEGER, -- minutes
    priority TEXT, -- 'low', 'medium', 'high', 'critical'
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'implemented', 'ignored'
    category TEXT, -- 'best_practice', 'optimization', 'security', 'maintainability'
    tags TEXT, -- JSON array
    metadata TEXT, -- JSON additional data
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (analysis_id) REFERENCES analysis (id) ON DELETE CASCADE
);
```

### Performance Indexes
```sql
-- Analysis Issues Indexes
CREATE INDEX IF NOT EXISTS idx_analysis_issues_analysis_id ON analysis_issues(analysis_id);
CREATE INDEX IF NOT EXISTS idx_analysis_issues_type ON analysis_issues(type);
CREATE INDEX IF NOT EXISTS idx_analysis_issues_severity ON analysis_issues(severity);
CREATE INDEX IF NOT EXISTS idx_analysis_issues_status ON analysis_issues(status);
CREATE INDEX IF NOT EXISTS idx_analysis_issues_priority ON analysis_issues(priority);
CREATE INDEX IF NOT EXISTS idx_analysis_issues_file ON analysis_issues(file);
CREATE INDEX IF NOT EXISTS idx_analysis_issues_type_severity ON analysis_issues(type, severity);
CREATE INDEX IF NOT EXISTS idx_analysis_issues_status_priority ON analysis_issues(status, priority);
CREATE INDEX IF NOT EXISTS idx_analysis_issues_created_at ON analysis_issues(created_at);

-- Analysis Recommendations Indexes
CREATE INDEX IF NOT EXISTS idx_analysis_recommendations_analysis_id ON analysis_recommendations(analysis_id);
CREATE INDEX IF NOT EXISTS idx_analysis_recommendations_type ON analysis_recommendations(type);
CREATE INDEX IF NOT EXISTS idx_analysis_recommendations_impact ON analysis_recommendations(impact);
CREATE INDEX IF NOT EXISTS idx_analysis_recommendations_effort ON analysis_recommendations(effort);
CREATE INDEX IF NOT EXISTS idx_analysis_recommendations_status ON analysis_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_analysis_recommendations_category ON analysis_recommendations(category);
CREATE INDEX IF NOT EXISTS idx_analysis_recommendations_type_impact ON analysis_recommendations(type, impact);
CREATE INDEX IF NOT EXISTS idx_analysis_recommendations_status_effort ON analysis_recommendations(status, effort);
CREATE INDEX IF NOT EXISTS idx_analysis_recommendations_created_at ON analysis_recommendations(created_at);

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_analysis_issues_title_fts ON analysis_issues USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_analysis_issues_description_fts ON analysis_issues USING gin(to_tsvector('english', description));
CREATE INDEX IF NOT EXISTS idx_analysis_recommendations_title_fts ON analysis_recommendations USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_analysis_recommendations_description_fts ON analysis_recommendations USING gin(to_tsvector('english', description));
```

### AnalysisIssuesRepository.js Template
```javascript
/**
 * AnalysisIssuesRepository - Infrastructure Layer
 * Manages analysis issues in structured database tables
 */

const BaseRepository = require('./BaseRepository');
const Logger = require('@logging/Logger');

class AnalysisIssuesRepository extends BaseRepository {
  constructor(database) {
    super(database, 'analysis_issues');
    this.logger = new Logger('AnalysisIssuesRepository');
  }

  async createIssue(issueData) {
    try {
      const query = `
        INSERT INTO analysis_issues (
          analysis_id, issue_id, type, severity, title, description,
          file, line, column, code_snippet, recommendation,
          estimated_fix_time, priority, status, tags, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *
      `;
      
      const values = [
        issueData.analysis_id,
        issueData.issue_id,
        issueData.type,
        issueData.severity,
        issueData.title,
        issueData.description,
        issueData.file,
        issueData.line,
        issueData.column,
        issueData.code_snippet,
        issueData.recommendation,
        issueData.estimated_fix_time,
        issueData.priority,
        issueData.status || 'open',
        JSON.stringify(issueData.tags || []),
        JSON.stringify(issueData.metadata || {})
      ];

      const result = await this.database.query(query, values);
      return result.rows[0];
    } catch (error) {
      this.logger.error('Failed to create issue:', error);
      throw error;
    }
  }

  async getIssuesByAnalysis(analysisId, filters = {}) {
    try {
      let query = 'SELECT * FROM analysis_issues WHERE analysis_id = $1';
      const values = [analysisId];
      let paramIndex = 2;

      // Add filters
      if (filters.severity) {
        query += ` AND severity = $${paramIndex}`;
        values.push(filters.severity);
        paramIndex++;
      }

      if (filters.status) {
        query += ` AND status = $${paramIndex}`;
        values.push(filters.status);
        paramIndex++;
      }

      if (filters.type) {
        query += ` AND type = $${paramIndex}`;
        values.push(filters.type);
        paramIndex++;
      }

      query += ' ORDER BY severity DESC, created_at DESC';

      const result = await this.database.query(query, values);
      return result.rows;
    } catch (error) {
      this.logger.error('Failed to get issues by analysis:', error);
      throw error;
    }
  }

  async getCriticalIssues(projectId) {
    try {
      const query = `
        SELECT ai.*, a.project_id, a.analysis_type
        FROM analysis_issues ai
        JOIN analysis a ON ai.analysis_id = a.id
        WHERE a.project_id = $1 
          AND ai.severity = 'critical' 
          AND ai.status = 'open'
        ORDER BY ai.created_at DESC
      `;
      
      const result = await this.database.query(query, [projectId]);
      return result.rows;
    } catch (error) {
      this.logger.error('Failed to get critical issues:', error);
      throw error;
    }
  }

  async updateIssueStatus(issueId, status) {
    try {
      const query = `
        UPDATE analysis_issues 
        SET status = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;
      
      const result = await this.database.query(query, [status, issueId]);
      return result.rows[0];
    } catch (error) {
      this.logger.error('Failed to update issue status:', error);
      throw error;
    }
  }

  async searchIssues(searchTerm, filters = {}) {
    try {
      let query = `
        SELECT * FROM analysis_issues 
        WHERE to_tsvector('english', title || ' ' || COALESCE(description, '')) @@ plainto_tsquery('english', $1)
      `;
      const values = [searchTerm];
      let paramIndex = 2;

      // Add additional filters
      if (filters.severity) {
        query += ` AND severity = $${paramIndex}`;
        values.push(filters.severity);
        paramIndex++;
      }

      query += ' ORDER BY ts_rank(to_tsvector(\'english\', title || \' \' || COALESCE(description, \'\')), plainto_tsquery(\'english\', $1)) DESC';

      const result = await this.database.query(query, values);
      return result.rows;
    } catch (error) {
      this.logger.error('Failed to search issues:', error);
      throw error;
    }
  }
}

module.exports = AnalysisIssuesRepository;
```

## Success Criteria
- [ ] All database tables created successfully
- [ ] All performance indexes created and optimized
- [ ] Repository classes implemented with full CRUD operations
- [ ] Migration scripts tested and validated
- [ ] Schema documentation complete and accurate
- [ ] Database relationships properly established
- [ ] Performance benchmarks established

## Risk Mitigation
- **Low Risk**: Database schema creation is straightforward
- **Mitigation**: Use proper SQL syntax and test all constraints
- **Rollback**: Migration scripts include rollback procedures

## Validation Checklist
- [ ] All tables created with correct structure
- [ ] Foreign key constraints working properly
- [ ] Indexes created and optimized
- [ ] Repository classes compile without errors
- [ ] Basic CRUD operations tested
- [ ] Migration scripts tested in development environment
- [ ] Schema documentation matches actual implementation

## Next Phase Preparation
- [ ] Document schema structure for integration phase
- [ ] Prepare test data for migration testing
- [ ] Set up performance benchmarking tools
- [ ] Create integration test scenarios 