# Database Schema Enhancement - Phase 1: Schema Design

## 📋 Phase Overview
- **Phase**: 1 of 3
- **Title**: Schema Design
- **Estimated Time**: 2 hours
- **Status**: Planning
- **Progress**: 0%
- **Dependencies**: None (foundation phase)

## 🎯 Objectives
Design and define the database schema enhancements for project-centric architecture with interface management, including:
- Interface management fields for projects table
- New project_interfaces table structure
- Schema definition files
- Validation of schema design

## 📁 Files to Create

### Schema Definition Files
- [ ] `database/schema/interface_management_schema.sql` - Interface management schema definition
- [ ] `database/schema/project_interfaces_schema.sql` - Project interfaces table schema

### Documentation Files
- [ ] `database/schema/README.md` - Schema documentation and design decisions

## 🔧 Implementation Tasks

### Task 1.1: Design Interface Management Fields for Projects Table (45 minutes)
- [ ] Add interface management fields to projects table schema
- [ ] Define field types and constraints
- [ ] Add proper indexing for performance
- [ ] Document field purposes and usage

**Projects Table Enhancements:**
```sql
-- Interface Management Fields for Projects Table
ALTER TABLE projects ADD COLUMN interface_count INTEGER DEFAULT 0;
ALTER TABLE projects ADD COLUMN active_interface_id TEXT;
ALTER TABLE projects ADD COLUMN interface_config TEXT; -- JSON for interface settings
ALTER TABLE projects ADD COLUMN interface_status TEXT DEFAULT 'none'; -- 'none', 'single', 'multiple'
ALTER TABLE projects ADD COLUMN last_interface_switch TEXT; -- Timestamp of last interface switch

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_active_interface ON projects(active_interface_id);
CREATE INDEX IF NOT EXISTS idx_projects_interface_status ON projects(interface_status);
```

### Task 1.2: Design Project Interfaces Table Structure (45 minutes)
- [ ] Create project_interfaces table schema
- [ ] Define relationships and foreign keys
- [ ] Add proper constraints and validation
- [ ] Design for scalability and performance

**Project Interfaces Table Schema:**
```sql
-- Project Interfaces Table
CREATE TABLE IF NOT EXISTS project_interfaces (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text, -- PostgreSQL
    -- id TEXT PRIMARY KEY, -- SQLite
    
    -- Project relationship
    project_id TEXT NOT NULL,
    
    -- Interface identification
    interface_name TEXT NOT NULL,
    interface_type TEXT NOT NULL, -- 'ide', 'editor', 'terminal', 'browser', 'custom'
    interface_subtype TEXT, -- 'cursor', 'vscode', 'webstorm', etc.
    
    -- Interface configuration
    config TEXT, -- JSON configuration for the interface
    settings TEXT, -- JSON interface-specific settings
    
    -- Interface status and management
    status TEXT NOT NULL DEFAULT 'inactive', -- 'active', 'inactive', 'error', 'connecting'
    is_default BOOLEAN DEFAULT false,
    priority INTEGER DEFAULT 0, -- Interface priority within project
    
    -- Connection and communication
    connection_config TEXT, -- JSON for connection settings
    last_connected TEXT, -- Timestamp of last successful connection
    connection_count INTEGER DEFAULT 0, -- Number of connection attempts
    
    -- Interface capabilities
    capabilities TEXT, -- JSON array of supported capabilities
    supported_operations TEXT, -- JSON array of supported operations
    
    -- Metadata and tracking
    metadata TEXT, -- JSON for additional interface metadata
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT NOT NULL DEFAULT 'me',
    
    -- Foreign key constraints
    FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users (id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_interfaces_project_id ON project_interfaces(project_id);
CREATE INDEX IF NOT EXISTS idx_project_interfaces_type ON project_interfaces(interface_type);
CREATE INDEX IF NOT EXISTS idx_project_interfaces_status ON project_interfaces(status);
CREATE INDEX IF NOT EXISTS idx_project_interfaces_default ON project_interfaces(project_id, is_default) WHERE is_default = true;
```

### Task 1.3: Create Schema Definition Files (30 minutes)
- [ ] Create interface_management_schema.sql with all schema changes
- [ ] Create project_interfaces_schema.sql with table definition
- [ ] Add comprehensive SQL comments and documentation
- [ ] Include both PostgreSQL and SQLite versions

**Schema Definition Structure:**
```sql
-- ============================================================================
-- INTERFACE MANAGEMENT SCHEMA ENHANCEMENTS
-- ============================================================================
-- 
-- This schema adds interface management capabilities to the PIDEA system,
-- enabling project-centric architecture with multiple interface support.
--
-- Changes:
-- 1. Enhanced projects table with interface management fields
-- 2. New project_interfaces table for interface tracking
-- 3. Proper indexing and constraints for performance
--
-- Created: 2024-12-19
-- Version: 1.0.0
-- ============================================================================

-- Projects table enhancements
-- [Schema changes here]

-- Project interfaces table
-- [Table definition here]

-- Indexes and constraints
-- [Index definitions here]
```

## 🧪 Testing Requirements

### Schema Validation Tests
- [ ] Test field constraints and data types
- [ ] Validate foreign key relationships
- [ ] Test index performance
- [ ] Verify JSON field validation

### Design Review
- [ ] Review schema design with team
- [ ] Validate against interface management requirements
- [ ] Check for potential performance issues
- [ ] Ensure scalability considerations

## 📋 Success Criteria
- [ ] Interface management fields designed and documented
- [ ] Project interfaces table schema complete
- [ ] Schema definition files created
- [ ] All constraints and indexes defined
- [ ] Documentation complete and accurate
- [ ] Schema design validated and approved

## 🔗 Dependencies
- **Input**: Current projects table schema analysis
- **Output**: Complete schema definition files
- **Next Phase**: Migration Scripts (Phase 2)

## 📝 Notes
- Schema design must support both PostgreSQL and SQLite
- JSON fields should be properly validated
- Indexes should be optimized for common query patterns
- Foreign key constraints ensure data integrity
- Consider future extensibility for new interface types
