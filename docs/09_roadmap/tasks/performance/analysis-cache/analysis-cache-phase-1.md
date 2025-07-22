# Analysis Data Caching – Phase 1: Minimal Database Changes

## Overview
Add minimal cache fields to existing analysis_results table to enable intelligent caching for ALL analysis steps.

**⚠️ WICHTIG: ETag System bleibt unverändert!**
- ETagService wird nicht angefasst
- HTTP Caching funktioniert weiterhin
- Nur neue Server-seitige Analysis Cache Ebene

## Objectives
- [ ] Add `file_hash` field to `analysis_results` table
- [ ] Add `cache_expires_at` field to `analysis_results` table
- [ ] Add performance index for cache expiration
- [ ] Create simple migration script

## Deliverables
- File: `database/init.sql` - Updated with 2 new fields in analysis_results table
- File: `backend/infrastructure/database/migrations/add_cache_fields.sql` - Simple migration
- Test: `tests/unit/AnalysisCacheDatabase.test.js` - Database schema tests

## Dependencies
- Requires: None (independent phase)
- Blocks: Phase 2 (Repository Methods) start

## Estimated Time
30 minutes

## Technical Implementation

### 1. Add Cache Fields to Existing Table
```sql
-- Add to database/init.sql in the analysis_results table definition

-- ANALYSIS RESULTS (Your project analysis data) - UPDATED WITH CACHE FIELDS
CREATE TABLE IF NOT EXISTS analysis_results (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    analysis_type TEXT NOT NULL, -- 'code_quality', 'security', 'performance', 'architecture'
    result_data TEXT NOT NULL, -- JSON analysis results
    summary TEXT, -- JSON summary data
    status TEXT NOT NULL DEFAULT 'completed', -- 'pending', 'running', 'completed', 'failed'
    started_at TEXT NOT NULL,
    completed_at TEXT,
    duration_ms INTEGER,
    overall_score REAL, -- 0-100 score
    critical_issues_count INTEGER DEFAULT 0,
    warnings_count INTEGER DEFAULT 0,
    recommendations_count INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- CACHE FIELDS (NEW)
    file_hash TEXT, -- Hash of project files for cache validation
    cache_expires_at TEXT, -- When cache expires (TTL)
    
    FOREIGN KEY (project_id) REFERENCES projects (id)
);
```

### 2. Add Performance Index
```sql
-- Add to database/init.sql in the indexes section

-- Cache performance index
CREATE INDEX IF NOT EXISTS idx_analysis_cache_expires ON analysis_results(cache_expires_at);
CREATE INDEX IF NOT EXISTS idx_analysis_project_type_cache ON analysis_results(project_id, analysis_type, cache_expires_at);
```

### 3. Migration Script
```sql
-- backend/infrastructure/database/migrations/add_cache_fields.sql

-- Migration: Add cache fields to analysis_results table
-- Date: 2024-12-19
-- Description: Add file_hash and cache_expires_at fields for intelligent caching

-- Add cache fields if they don't exist
ALTER TABLE analysis_results ADD COLUMN file_hash TEXT;
ALTER TABLE analysis_results ADD COLUMN cache_expires_at TEXT;

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_analysis_cache_expires ON analysis_results(cache_expires_at);
CREATE INDEX IF NOT EXISTS idx_analysis_project_type_cache ON analysis_results(project_id, analysis_type, cache_expires_at);

-- Update existing records to have default cache expiration (24 hours from creation)
UPDATE analysis_results 
SET cache_expires_at = datetime(created_at, '+24 hours') 
WHERE cache_expires_at IS NULL;

-- Set file_hash to 'unknown' for existing records (will be updated on next analysis)
UPDATE analysis_results 
SET file_hash = 'unknown' 
WHERE file_hash IS NULL;
```

### 4. Cache Configuration
```javascript
// Cache TTL configuration for ALL analysis steps
const cacheConfig = {
  // Analysis Steps (in analysis_results table)
  project: { ttl: 24 * 60 * 60 }, // 24 hours - ProjectAnalysisStep
  dependency: { ttl: 24 * 60 * 60 }, // 24 hours - DependencyAnalysisStep
  codeQuality: { ttl: 6 * 60 * 60 }, // 6 hours - CodeQualityAnalysisStep
  security: { ttl: 4 * 60 * 60 }, // 4 hours - SecurityAnalysisStep
  performance: { ttl: 8 * 60 * 60 }, // 8 hours - PerformanceAnalysisStep
  architecture: { ttl: 12 * 60 * 60 }, // 12 hours - ArchitectureAnalysisStep
  techStack: { ttl: 24 * 60 * 60 } // 24 hours - TechStackAnalysisStep
};
```

## Success Criteria
- [ ] `file_hash` field added to `analysis_results` table
- [ ] `cache_expires_at` field added to `analysis_results` table
- [ ] Performance indexes created for cache operations
- [ ] Migration script ready and tested
- [ ] Database schema validates successfully
- [ ] Existing data handled gracefully

## Testing Requirements
- [ ] Test migration script on existing database
- [ ] Test cache field addition
- [ ] Test index creation
- [ ] Test existing data preservation
- [ ] Test cache expiration logic

## Next Phase Dependencies
- Database schema must be updated with cache fields
- Indexes must be created for performance
- Migration script must be tested

This phase establishes the minimal database foundation for analysis caching by extending the existing analysis_results table with cache-specific fields. 