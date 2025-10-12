# Database Naming Standardization Implementation

## Goal
Standardize database naming patterns across all database files to improve maintainability, reduce errors, and ensure consistency. Fix naming inconsistencies, remove duplicate columns, and establish clear naming standards for future development.

## Project Overview
- **Feature/Component Name**: Database Naming Standardization
- **Priority**: High
- **Category**: database
- **Status**: In Progress
- **Estimated Time**: 8 hours
- **Dependencies**: None
- **Related Issues**: Database architecture inconsistencies
- **Created**: 2025-10-11T21:27:33.000Z
- **Started**: 2025-10-11T21:38:13.000Z
- **Last Updated**: 2025-10-11T21:38:13.000Z

## Language Requirements - MANDATORY

### FORBIDDEN TERMS (Never Use):
- unified, comprehensive, advanced, intelligent, smart, enhanced, optimized, streamlined, consolidated, sophisticated, robust, scalable, efficient, dynamic, flexible, modular, extensible, maintainable, performant

### REQUIRED TERMS (Always Use):
- one, single, main, basic, simple, direct, clear, standard, normal, regular

### EXAMPLES:
- ❌ "UnifiedCacheService" → ✅ "CacheService"
- ❌ "Comprehensive Analysis" → ✅ "Analysis"
- ❌ "Advanced Integration" → ✅ "Integration"
- ❌ "Smart Detection" → ✅ "Detection"
- ❌ "Enhanced Performance" → ✅ "Performance"
- ❌ "Optimized Configuration" → ✅ "Configuration"

### VALIDATION RULE:
Before saving any content, scan for forbidden terms and replace with simple alternatives.

## Technical Requirements
- **Tech Stack**: SQLite, PostgreSQL, SQL migrations
- **Architecture Pattern**: Database schema standardization
- **Database Changes**: Standardize table names, column names, index names, constraint names
- **API Changes**: None
- **Frontend Changes**: None
- **Backend Changes**: Update database queries to use standardized names

## Current State Analysis

### Critical Naming Inconsistencies Found

#### 1. Timestamp Column Inconsistencies (High Priority)
**Issue**: Mixed usage of timestamp column names and data types across files

**Examples**:
- `init-sqlite.sql`: Uses `TEXT` for timestamps (lines 18, 19, 33, 34, 73, 74, 92, 93)
- `init-postgres.sql`: Uses `TIMESTAMP WITH TIME ZONE` (lines 33, 36, 37)
- `migrations/001`: Uses `TIMESTAMP WITH TIME ZONE` (lines 12, 19, 30, 31)
- `migrations/002`: Uses `TIMESTAMP WITH TIME ZONE` (lines 16, 21, 22)
- `migrations/003`: Uses `TIMESTAMP WITH TIME ZONE` (lines 13, 28)
- `migrations/004`: Uses `TIMESTAMP WITH TIME ZONE` (lines 17, 18)
- `migrations/005`: Uses `TEXT` for timestamps (lines 28, 29)
- `migrations/006`: Uses `TEXT` for timestamps (lines 28, 29)

**Standard Needed**: Consistent timestamp column naming and data types

#### 2. ID Generation Inconsistencies (High Priority)
**Issue**: Mixed approaches to ID generation across database files

**Examples**:
- `init-sqlite.sql`: Uses `TEXT PRIMARY KEY` without generation (lines 11, 25, 40, 81, 124, 157, 173, 190, 209, 240, 260, 286)
- `init-postgres.sql`: Uses `uuid_generate_v4()::text` (lines 28, 84)
- `migrations/002`: Uses `gen_random_uuid()` (line 6)
- `migrations/004`: Uses `SERIAL PRIMARY KEY` (line 5)
- `migrations/006`: Uses `uuid_generate_v4()::text` (line 12)

**Standard Needed**: Consistent ID generation approach per database type

#### 3. Column Naming Inconsistencies (Medium Priority)
**Issue**: Inconsistent naming patterns for similar columns

**Examples**:
- `created_at` vs `timestamp` vs `event_timestamp`
- `updated_at` vs `last_updated`
- `user_id` vs `created_by` vs `assigned_to`
- `metadata` vs `config` vs `settings`

**Standard Needed**: Consistent column naming conventions

#### 4. Index Naming Inconsistencies (Medium Priority)
**Issue**: Mixed index naming patterns

**Examples**:
- `idx_user_sessions_access_token` (snake_case)
- `idx_queue_history_workflow_id` (snake_case)
- `idx_playwright_configs_project_id` (snake_case)
- Some indexes use different prefixes

**Standard Needed**: Consistent index naming convention

#### 5. Table Naming Inconsistencies (Low Priority)
**Issue**: Mixed table naming patterns

**Examples**:
- `queue_history` vs `workflow_type_detection`
- `ide_configurations` vs `playwright_configs`
- `project_interfaces` vs `task_file_events`

**Standard Needed**: Consistent table naming convention

## File Impact Analysis

### Files to Modify:
- [ ] `database/init-sqlite.sql` - Standardize table and column naming
- [ ] `database/init-postgres.sql` - Standardize table and column naming
- [ ] `database/migrations/001_add_queue_history_tables.sql` - Fix naming inconsistencies
- [ ] `database/migrations/002_add_ide_configurations_table.sql` - Fix naming inconsistencies
- [ ] `database/migrations/003_add_task_content_hash.sql` - Fix naming inconsistencies
- [ ] `database/migrations/004_create_playwright_configs_table.sql` - Fix naming inconsistencies
- [ ] `database/migrations/005_add_interface_management.sql` - Fix naming inconsistencies
- [ ] `database/migrations/006_create_project_interfaces_table.sql` - Fix naming inconsistencies

### Repository Files to Update:
- [ ] `backend/infrastructure/database/PostgreSQLAnalysisRepository.js` - Update table references
- [ ] `backend/infrastructure/database/PostgreSQLTaskRepository.js` - Update column references
- [ ] `backend/infrastructure/database/PostgreSQLUserRepository.js` - Update column references
- [ ] `backend/infrastructure/database/PostgreSQLProjectRepository.js` - Update column references
- [ ] `backend/infrastructure/database/PostgreSQLUserSessionRepository.js` - Update column references

### New Files to Create:
- [ ] `database/migrations/007_standardize_naming_conventions.sql` - Naming standardization migration
- [ ] `backend/tests/integration/database-naming-validation.test.js` - Validation tests
- [ ] `docs/database/naming-standards.md` - Naming standards documentation

## Implementation Plan

### Phase 1: Naming Analysis (3 hours) - Completed: 2025-10-11T21:38:13.000Z
- [x] Analyze current database naming patterns
- [x] Identify all naming inconsistencies
- [x] Document current state analysis
- [x] Create implementation plan

### Phase 2: Schema Standardization (3 hours) - In Progress
- [ ] Create naming standards documentation
- [ ] Standardize timestamp column naming
- [ ] Standardize ID generation patterns
- [ ] Standardize column naming conventions
- [ ] Standardize index naming patterns
- [ ] Standardize table naming patterns

### Phase 3: Migration Implementation (2 hours) - Pending
- [ ] Create migration script for naming changes
- [ ] Update all database schema files
- [ ] Update repository classes
- [ ] Create validation tests
- [ ] Test migration scripts

## Naming Standards Definition

### Table Naming Standards
- **Pattern**: `snake_case` plural nouns
- **Examples**: `users`, `projects`, `tasks`, `user_sessions`
- **Avoid**: Mixed singular/plural, camelCase, PascalCase

### Column Naming Standards
- **Pattern**: `snake_case` descriptive names
- **Timestamp Columns**: `created_at`, `updated_at`, `deleted_at`
- **ID Columns**: `id` (primary key), `{table_name}_id` (foreign key)
- **Status Columns**: `status`, `is_active`, `is_default`
- **Metadata Columns**: `metadata`, `config`, `settings`

### Index Naming Standards
- **Pattern**: `idx_{table_name}_{column_name(s)}`
- **Examples**: `idx_users_email`, `idx_tasks_project_id`, `idx_user_sessions_access_token`
- **Composite Indexes**: `idx_tasks_project_status`, `idx_projects_created_at`

### Constraint Naming Standards
- **Primary Key**: `pk_{table_name}`
- **Foreign Key**: `fk_{table_name}_{column_name}`
- **Unique Constraint**: `uk_{table_name}_{column_name}`
- **Check Constraint**: `chk_{table_name}_{column_name}`

### ID Generation Standards
- **PostgreSQL**: `uuid_generate_v4()::text` for UUIDs, `SERIAL` for integers
- **SQLite**: `TEXT PRIMARY KEY` for UUIDs, `INTEGER PRIMARY KEY` for auto-increment
- **Default Values**: Always provide default values for ID generation

## Success Criteria
- [ ] All database files use consistent naming patterns
- [ ] All timestamp columns use consistent naming and data types
- [ ] All ID generation follows database-specific standards
- [ ] All indexes follow consistent naming patterns
- [ ] All constraints follow consistent naming patterns
- [ ] Migration scripts work for both PostgreSQL and SQLite
- [ ] All repository classes updated to use new naming
- [ ] Validation tests pass
- [ ] Documentation updated

## Risk Assessment
- **Low Risk**: Table and column naming changes
- **Medium Risk**: ID generation changes (requires data migration)
- **High Risk**: Foreign key constraint changes (requires careful migration)

## Testing Strategy

### Unit Tests:
- [ ] Test file: `backend/tests/unit/database-naming-validation.test.js`
- [ ] Test cases: Table naming consistency, column naming consistency, index naming consistency
- [ ] Mock requirements: Database connection mocking

### Integration Tests:
- [ ] Test file: `backend/tests/integration/database-naming-migration.test.js`
- [ ] Test scenarios: Migration execution, rollback, data integrity
- [ ] Test data: Sample data for testing naming changes

### E2E Tests:
- [ ] Test file: `backend/tests/e2e/database-naming.test.js`
- [ ] User flows: Complete database operations with standardized naming
- [ ] Browser compatibility: N/A for database tests

## Documentation Requirements

### Code Documentation:
- [ ] JSDoc comments for database schema functions
- [ ] README updates with naming standards
- [ ] Database schema documentation
- [ ] Migration guide for naming changes

### User Documentation:
- [ ] Database naming standards guide
- [ ] Migration guide for developers
- [ ] Troubleshooting guide for naming issues

## Deployment Checklist

### Pre-deployment:
- [ ] All tests passing (unit, integration, e2e)
- [ ] Code review completed and approved
- [ ] Documentation updated and reviewed
- [ ] Database backup created
- [ ] Migration scripts tested

### Deployment:
- [ ] Database migrations executed
- [ ] Naming changes applied
- [ ] Data integrity verified
- [ ] Performance monitoring active
- [ ] Rollback procedures tested

### Post-deployment:
- [ ] Monitor database operations
- [ ] Verify naming consistency
- [ ] Performance monitoring active
- [ ] User feedback collection enabled

## Success Indicators
- [ ] All checkboxes in phases completed
- [ ] Tests pass
- [ ] No build errors
- [ ] Code follows standards
- [ ] Documentation updated

## References & Resources
- **Technical Documentation**: SQLite documentation, PostgreSQL best practices
- **API References**: Database schema patterns, migration patterns
- **Design Patterns**: Database naming conventions, schema design patterns
- **Best Practices**: Database normalization, naming standards
- **Similar Implementations**: Existing database schema files in codebase
