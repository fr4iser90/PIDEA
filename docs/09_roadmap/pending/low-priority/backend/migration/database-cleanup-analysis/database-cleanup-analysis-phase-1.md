# Phase 1: Analysis & Planning - Database Analysis Tables Cleanup

## 📋 Phase Overview
- **Phase**: 1 of 7
- **Duration**: 30 minutes
- **Status**: ✅ Completed
- **Priority**: High

## 🎯 Objectives
- Analyze current database schema structure
- Identify all redundant analysis tables
- Create detailed implementation plan
- Validate technical requirements

## 📊 Current State Analysis

### Database Tables Present (Redundant Analysis Tables)
- ❌ `analysis_results` - **TO BE REMOVED** - Redundant with analysis_steps
- ❌ `analysis_steps` - **TO BE CONSOLIDATED** - Will become the new `analysis` table
- ❌ `project_analysis` - **TO BE REMOVED** - Redundant analysis data
- ❌ `task_suggestions` - **TO BE REMOVED** - Recommendations will be in analysis.result JSON

### Target Structure (Single Analysis Table)
- ✅ `analysis` - **NEW UNIFIED TABLE** - Based on analysis_steps structure with recommendations integrated

### Current Entity Files to Remove
- ❌ `backend/domain/entities/AnalysisResult.js` - **TO BE REMOVED**
- ❌ `backend/domain/entities/ProjectAnalysis.js` - **TO BE REMOVED**
- ❌ `backend/domain/entities/TaskSuggestion.js` - **TO BE REMOVED**

### Current Repository Files to Remove
- ❌ `backend/domain/repositories/ProjectAnalysisRepository.js` - **TO BE REMOVED**
- ❌ `backend/domain/repositories/TaskSuggestionRepository.js` - **TO BE REMOVED**
- ❌ `backend/infrastructure/database/SQLiteProjectAnalysisRepository.js` - **TO BE REMOVED**
- ❌ `backend/infrastructure/database/PostgreSQLProjectAnalysisRepository.js` - **TO BE REMOVED**
- ❌ `backend/infrastructure/database/SQLiteTaskSuggestionRepository.js` - **TO BE REMOVED**
- ❌ `backend/infrastructure/database/PostgreSQLTaskSuggestionRepository.js` - **TO BE REMOVED**
- ❌ `backend/infrastructure/database/InMemoryAnalysisRepository.js` - **TO BE REMOVED** (old version)

## 🔍 Investigation Tasks

### Task 1.1: Database Schema Analysis ✅ COMPLETED
- [x] Identified redundant analysis tables in init-postgres.sql
- [x] Identified redundant analysis tables in init-sqlite.sql
- [x] Documented current table structures and relationships
- [x] Identified foreign key dependencies

### Task 1.2: Entity Analysis ✅ COMPLETED
- [x] Analyzed AnalysisResult entity structure
- [x] Analyzed ProjectAnalysis entity structure
- [x] Analyzed TaskSuggestion entity structure
- [x] Analyzed AnalysisStep entity structure (target base)
- [x] Identified consolidation strategy

### Task 1.3: Repository Analysis ✅ COMPLETED
- [x] Identified all analysis-related repositories
- [x] Analyzed repository interfaces and implementations
- [x] Documented service dependencies
- [x] Identified cleanup requirements

### Task 1.4: Service Impact Analysis ✅ COMPLETED
- [x] Analyzed AnalysisApplicationService dependencies
- [x] Analyzed ProjectAnalysisApplicationService dependencies
- [x] Identified service registry registrations to remove
- [x] Documented API controller impacts

## 📋 Implementation Plan

### Phase 2: Foundation Setup (30 minutes)
- [ ] Create new unified Analysis entity
- [ ] Update database init files (PostgreSQL & SQLite)
- [ ] Create new AnalysisRepository interface
- [ ] Update entity index exports

### Phase 3: Core Implementation (45 minutes)
- [ ] Create SQLiteAnalysisRepository implementation
- [ ] Create PostgreSQLAnalysisRepository implementation
- [ ] Update AnalysisApplicationService
- [ ] Remove old entities and repositories

### Phase 4: Integration & Connectivity (30 minutes)
- [ ] Update ServiceRegistry registrations
- [ ] Update API controllers
- [ ] Update frontend API calls
- [ ] Remove old service dependencies

### Phase 5: Testing Implementation (15 minutes)
- [ ] Update unit tests
- [ ] Update integration tests
- [ ] Test new database schema

### Phase 6: Documentation & Validation (15 minutes)
- [ ] Update documentation
- [ ] Validate implementation
- [ ] Update README files

### Phase 7: Deployment Preparation (15 minutes)
- [ ] Update deployment configs
- [ ] Prepare rollback procedures
- [ ] Final validation

## 🎯 Success Criteria
- [ ] Single `analysis` table replaces all redundant tables
- [ ] All old entities and repositories removed
- [ ] New unified Analysis entity created
- [ ] Service registry updated
- [ ] API endpoints functional
- [ ] No breaking changes to existing functionality

## 📝 Technical Notes

### New Analysis Table Structure
```sql
CREATE TABLE IF NOT EXISTS analysis (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    project_id TEXT NOT NULL,
    analysis_type TEXT NOT NULL, -- 'security', 'code-quality', 'performance', 'architecture', 'layer-violations'
    status TEXT DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed', 'cancelled'
    progress INTEGER DEFAULT 0,
    started_at TEXT,
    completed_at TEXT,
    error TEXT, -- JSON error information
    result TEXT, -- JSON analysis result data (INCLUDES recommendations!)
    metadata TEXT, -- JSON additional metadata
    config TEXT, -- JSON step configuration
    timeout INTEGER DEFAULT 300000,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 2,
    memory_usage INTEGER, -- Memory usage in bytes
    execution_time INTEGER, -- Execution time in milliseconds
    file_count INTEGER, -- Number of files processed
    line_count INTEGER, -- Number of lines processed
    overall_score REAL, -- 0-100 score
    critical_issues_count INTEGER DEFAULT 0,
    warnings_count INTEGER DEFAULT 0,
    recommendations_count INTEGER DEFAULT 0, -- Quick count
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects (id)
);
```

### Key Benefits
- **No Migration Required**: Fresh database setup only
- **No Redundancy**: Single table for all analysis data
- **Integrated Recommendations**: No separate task_suggestions table
- **Simplified Maintenance**: Less code, fewer error sources
- **Clear Structure**: All analyses unified and easily queryable

---

**Next Phase**: Phase 2 - Foundation Setup 