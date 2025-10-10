# Database Schema Enhancement - Phase 2: Migration Scripts

## 📋 Phase Overview
- **Phase**: 2 of 3
- **Title**: Migration Scripts
- **Estimated Time**: 2 hours
- **Status**: Planning
- **Progress**: 0%
- **Dependencies**: Phase 1 (Schema Design) must be completed

## 🎯 Objectives
Create comprehensive migration scripts for both SQLite and PostgreSQL databases, including:
- Migration scripts for projects table enhancements
- Migration scripts for project_interfaces table creation
- Rollback scripts for safe deployment
- Testing and validation of migration scripts

## 📁 Files to Create

### Migration Scripts
- [ ] `database/migrations/005_add_interface_management.sql` - Migration for projects table enhancements
- [ ] `database/migrations/006_create_project_interfaces_table.sql` - Migration for project_interfaces table
- [ ] `database/migrations/rollback/005_rollback_interface_management.sql` - Rollback for projects table changes
- [ ] `database/migrations/rollback/006_rollback_project_interfaces.sql` - Rollback for project_interfaces table

### Migration Utilities
- [ ] `database/migrations/utils/migration_validator.js` - Migration script validation utility
- [ ] `database/migrations/utils/rollback_manager.js` - Rollback script management utility

## 🔧 Implementation Tasks

### Task 2.1: Create Projects Table Enhancement Migration (45 minutes)
- [ ] Create migration script for projects table interface management fields
- [ ] Add proper error handling and validation
- [ ] Include both PostgreSQL and SQLite versions
- [ ] Add migration logging and tracking

**Migration Script Structure:**
```sql
-- Migration: 005_add_interface_management.sql
-- Description: Add interface management fields to projects table
-- Created: 2024-12-19
-- Version: 1.0.0

-- PostgreSQL Version
BEGIN;

-- Add interface management fields to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS interface_count INTEGER DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS active_interface_id TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS interface_config TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS interface_status TEXT DEFAULT 'none';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS last_interface_switch TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_active_interface ON projects(active_interface_id);
CREATE INDEX IF NOT EXISTS idx_projects_interface_status ON projects(interface_status);

-- Update existing projects to have default interface status
UPDATE projects SET interface_status = 'none' WHERE interface_status IS NULL;

-- Add check constraints
ALTER TABLE projects ADD CONSTRAINT chk_interface_status 
    CHECK (interface_status IN ('none', 'single', 'multiple'));

COMMIT;
```

### Task 2.2: Create Project Interfaces Table Migration (45 minutes)
- [ ] Create migration script for project_interfaces table
- [ ] Handle UUID generation for both database types
- [ ] Add proper foreign key constraints
- [ ] Include comprehensive indexing

**Project Interfaces Migration:**
```sql
-- Migration: 006_create_project_interfaces_table.sql
-- Description: Create project_interfaces table for interface management
-- Created: 2024-12-19
-- Version: 1.0.0

-- PostgreSQL Version
BEGIN;

-- Create project_interfaces table
CREATE TABLE IF NOT EXISTS project_interfaces (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    project_id TEXT NOT NULL,
    interface_name TEXT NOT NULL,
    interface_type TEXT NOT NULL,
    interface_subtype TEXT,
    config TEXT,
    settings TEXT,
    status TEXT NOT NULL DEFAULT 'inactive',
    is_default BOOLEAN DEFAULT false,
    priority INTEGER DEFAULT 0,
    connection_config TEXT,
    last_connected TEXT,
    connection_count INTEGER DEFAULT 0,
    capabilities TEXT,
    supported_operations TEXT,
    metadata TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT NOT NULL DEFAULT 'me',
    
    FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users (id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_project_interfaces_project_id ON project_interfaces(project_id);
CREATE INDEX IF NOT EXISTS idx_project_interfaces_type ON project_interfaces(interface_type);
CREATE INDEX IF NOT EXISTS idx_project_interfaces_status ON project_interfaces(status);
CREATE INDEX IF NOT EXISTS idx_project_interfaces_default ON project_interfaces(project_id, is_default) WHERE is_default = true;

-- Add check constraints
ALTER TABLE project_interfaces ADD CONSTRAINT chk_interface_status 
    CHECK (status IN ('active', 'inactive', 'error', 'connecting'));
ALTER TABLE project_interfaces ADD CONSTRAINT chk_interface_type 
    CHECK (interface_type IN ('ide', 'editor', 'terminal', 'browser', 'custom'));

COMMIT;
```

### Task 2.3: Create Rollback Scripts (30 minutes)
- [ ] Create rollback script for projects table changes
- [ ] Create rollback script for project_interfaces table
- [ ] Add proper cleanup and validation
- [ ] Include data preservation where possible

**Rollback Script Structure:**
```sql
-- Rollback: 005_rollback_interface_management.sql
-- Description: Rollback interface management fields from projects table
-- Created: 2024-12-19
-- Version: 1.0.0

BEGIN;

-- Drop indexes first
DROP INDEX IF EXISTS idx_projects_active_interface;
DROP INDEX IF EXISTS idx_projects_interface_status;

-- Drop check constraints
ALTER TABLE projects DROP CONSTRAINT IF EXISTS chk_interface_status;

-- Remove columns
ALTER TABLE projects DROP COLUMN IF EXISTS interface_count;
ALTER TABLE projects DROP COLUMN IF EXISTS active_interface_id;
ALTER TABLE projects DROP COLUMN IF EXISTS interface_config;
ALTER TABLE projects DROP COLUMN IF EXISTS interface_status;
ALTER TABLE projects DROP COLUMN IF EXISTS last_interface_switch;

COMMIT;
```

## 🧪 Testing Requirements

### Migration Testing
- [ ] Test migration scripts on development database
- [ ] Validate data integrity after migration
- [ ] Test rollback procedures
- [ ] Verify performance impact

### Script Validation
- [ ] Validate SQL syntax for both database types
- [ ] Test error handling and recovery
- [ ] Verify constraint enforcement
- [ ] Check index creation and performance

## 📋 Success Criteria
- [ ] Migration scripts created for both SQLite and PostgreSQL
- [ ] Rollback scripts created and tested
- [ ] All migrations include proper error handling
- [ ] Indexes and constraints properly defined
- [ ] Migration utilities created for validation
- [ ] Scripts tested on development environment

## 🔗 Dependencies
- **Input**: Schema definition files from Phase 1
- **Output**: Complete migration and rollback scripts
- **Next Phase**: Testing & Validation (Phase 3)

## 📝 Notes
- Migration scripts must be idempotent (safe to run multiple times)
- Rollback scripts should preserve data where possible
- Consider migration performance for large databases
- Include proper logging for migration tracking
- Test migrations on both database types thoroughly
