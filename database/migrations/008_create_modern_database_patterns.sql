-- Migration: 008_create_modern_database_patterns
-- Description: Create modern database patterns including event sourcing, soft deletes, schema versioning, and audit trails
-- Created: 2025-10-11T22:03:16.000Z
-- Version: 1.0.0
-- Status: Pending

-- PostgreSQL Version
BEGIN;

-- ============================================================================
-- EVENT SOURCING TABLES
-- ============================================================================

-- Event Store Table - Core event sourcing implementation
-- Note: This will be converted to SQLite-compatible format by SQLTranslator
CREATE TABLE IF NOT EXISTS event_store (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    aggregate_id TEXT NOT NULL,
    aggregate_type TEXT NOT NULL,
    event_type TEXT NOT NULL,
    event_version INTEGER NOT NULL DEFAULT 1,
    event_data JSONB NOT NULL,
    metadata JSONB DEFAULT '{}',
    user_id TEXT NOT NULL DEFAULT 'system',
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    correlation_id TEXT,
    causation_id TEXT
);

-- Event Store Snapshots - For performance optimization
CREATE TABLE IF NOT EXISTS event_store_snapshots (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    aggregate_id TEXT NOT NULL,
    aggregate_type TEXT NOT NULL,
    snapshot_version INTEGER NOT NULL,
    snapshot_data JSONB NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- SOFT DELETE PATTERN TABLES
-- ============================================================================

-- Soft Delete Metadata Table - Track soft delete operations
CREATE TABLE IF NOT EXISTS soft_delete_metadata (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_by TEXT NOT NULL DEFAULT 'system',
    reason TEXT,
    metadata JSONB DEFAULT '{}',
    recovery_token TEXT DEFAULT uuid_generate_v4()::text,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- SCHEMA VERSIONING TABLES
-- ============================================================================

-- Schema Versions Table - Track database schema changes
CREATE TABLE IF NOT EXISTS schema_versions (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    version TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    migration_file TEXT NOT NULL,
    checksum TEXT NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    applied_by TEXT NOT NULL DEFAULT 'system',
    rollback_sql TEXT,
    metadata JSONB DEFAULT '{}'
);

-- Schema Validation Table - Track schema validation results
CREATE TABLE IF NOT EXISTS schema_validations (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    version TEXT NOT NULL,
    validation_type TEXT NOT NULL,
    status TEXT NOT NULL,
    result JSONB NOT NULL,
    validated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    validated_by TEXT NOT NULL DEFAULT 'system',
    metadata JSONB DEFAULT '{}'
);

-- ============================================================================
-- AUDIT TRAIL TABLES
-- ============================================================================

-- Audit Trail Table - Track all database changes
CREATE TABLE IF NOT EXISTS audit_trail (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    operation TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE', 'SOFT_DELETE'
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    user_id TEXT NOT NULL DEFAULT 'system',
    session_id TEXT,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Audit Trail Summary Table - Aggregated audit information
CREATE TABLE IF NOT EXISTS audit_trail_summary (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    total_changes INTEGER NOT NULL DEFAULT 0,
    first_change TIMESTAMP WITH TIME ZONE NOT NULL,
    last_change TIMESTAMP WITH TIME ZONE NOT NULL,
    last_changed_by TEXT NOT NULL,
    change_types TEXT[] NOT NULL DEFAULT '{}',
    metadata JSONB DEFAULT '{}'
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Event Store Indexes
CREATE INDEX IF NOT EXISTS idx_event_store_aggregate_id ON event_store (aggregate_id);
CREATE INDEX IF NOT EXISTS idx_event_store_aggregate_type ON event_store (aggregate_type);
CREATE INDEX IF NOT EXISTS idx_event_store_event_type ON event_store (event_type);
CREATE INDEX IF NOT EXISTS idx_event_store_timestamp ON event_store (timestamp);
CREATE INDEX IF NOT EXISTS idx_event_store_user_id ON event_store (user_id);
CREATE INDEX IF NOT EXISTS idx_event_store_correlation_id ON event_store (correlation_id);
CREATE INDEX IF NOT EXISTS idx_event_store_aggregate_version ON event_store (aggregate_id, event_version);

-- Event Store Snapshots Indexes
CREATE INDEX IF NOT EXISTS idx_event_store_snapshots_aggregate_id ON event_store_snapshots (aggregate_id);
CREATE INDEX IF NOT EXISTS idx_event_store_snapshots_aggregate_type ON event_store_snapshots (aggregate_type);
CREATE INDEX IF NOT EXISTS idx_event_store_snapshots_version ON event_store_snapshots (snapshot_version);

-- Soft Delete Metadata Indexes
CREATE INDEX IF NOT EXISTS idx_soft_delete_metadata_table_record ON soft_delete_metadata (table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_soft_delete_metadata_deleted_at ON soft_delete_metadata (deleted_at);
CREATE INDEX IF NOT EXISTS idx_soft_delete_metadata_deleted_by ON soft_delete_metadata (deleted_by);
CREATE INDEX IF NOT EXISTS idx_soft_delete_metadata_expires_at ON soft_delete_metadata (expires_at);

-- Schema Versioning Indexes
CREATE INDEX IF NOT EXISTS idx_schema_versions_version ON schema_versions (version);
CREATE INDEX IF NOT EXISTS idx_schema_versions_applied_at ON schema_versions (applied_at);
CREATE INDEX IF NOT EXISTS idx_schema_validations_version ON schema_validations (version);
CREATE INDEX IF NOT EXISTS idx_schema_validations_type ON schema_validations (validation_type);

-- Audit Trail Indexes
CREATE INDEX IF NOT EXISTS idx_audit_trail_table_record ON audit_trail (table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_operation ON audit_trail (operation);
CREATE INDEX IF NOT EXISTS idx_audit_trail_user_id ON audit_trail (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_timestamp ON audit_trail (timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_trail_session_id ON audit_trail (session_id);

-- Audit Trail Summary Indexes
CREATE INDEX IF NOT EXISTS idx_audit_trail_summary_table_record ON audit_trail_summary (table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_summary_last_change ON audit_trail_summary (last_change);

-- ============================================================================
-- ADD SOFT DELETE COLUMNS TO EXISTING TABLES
-- ============================================================================

-- Add soft delete columns to main tables
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deleted_by TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

ALTER TABLE projects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS deleted_by TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_by TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

ALTER TABLE analysis ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE analysis ADD COLUMN IF NOT EXISTS deleted_by TEXT;
ALTER TABLE analysis ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- Add indexes for soft delete columns
CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at ON tasks (deleted_at);
CREATE INDEX IF NOT EXISTS idx_tasks_is_deleted ON tasks (is_deleted);
CREATE INDEX IF NOT EXISTS idx_projects_deleted_at ON projects (deleted_at);
CREATE INDEX IF NOT EXISTS idx_projects_is_deleted ON projects (is_deleted);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users (deleted_at);
CREATE INDEX IF NOT EXISTS idx_users_is_deleted ON users (is_deleted);
CREATE INDEX IF NOT EXISTS idx_analysis_deleted_at ON analysis (deleted_at);
CREATE INDEX IF NOT EXISTS idx_analysis_is_deleted ON analysis (is_deleted);

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE event_store IS 'Event store for event sourcing pattern - stores all domain events';
COMMENT ON TABLE event_store_snapshots IS 'Event store snapshots for performance optimization';
COMMENT ON TABLE soft_delete_metadata IS 'Metadata for soft delete operations';
COMMENT ON TABLE schema_versions IS 'Track database schema version changes';
COMMENT ON TABLE schema_validations IS 'Track schema validation results';
COMMENT ON TABLE audit_trail IS 'Audit trail for all database changes';
COMMENT ON TABLE audit_trail_summary IS 'Aggregated audit trail information';

COMMENT ON COLUMN event_store.aggregate_id IS 'ID of the aggregate root';
COMMENT ON COLUMN event_store.aggregate_type IS 'Type of the aggregate (Task, Project, etc.)';
COMMENT ON COLUMN event_store.event_type IS 'Type of the event (Created, Updated, Deleted, etc.)';
COMMENT ON COLUMN event_store.event_version IS 'Version of the event schema';
COMMENT ON COLUMN event_store.event_data IS 'JSON data of the event';
COMMENT ON COLUMN event_store.correlation_id IS 'Correlation ID for tracking related events';
COMMENT ON COLUMN event_store.causation_id IS 'Causation ID for tracking event chains';

COMMENT ON COLUMN soft_delete_metadata.table_name IS 'Name of the table that was soft deleted';
COMMENT ON COLUMN soft_delete_metadata.record_id IS 'ID of the record that was soft deleted';
COMMENT ON COLUMN soft_delete_metadata.recovery_token IS 'Token for recovering soft deleted records';

COMMENT ON COLUMN schema_versions.version IS 'Schema version identifier';
COMMENT ON COLUMN schema_versions.checksum IS 'Checksum of the migration file';
COMMENT ON COLUMN schema_versions.rollback_sql IS 'SQL for rolling back this migration';

COMMENT ON COLUMN audit_trail.operation IS 'Type of operation: INSERT, UPDATE, DELETE, SOFT_DELETE';
COMMENT ON COLUMN audit_trail.old_values IS 'Previous values before change';
COMMENT ON COLUMN audit_trail.new_values IS 'New values after change';
COMMENT ON COLUMN audit_trail.changed_fields IS 'Array of field names that changed';

COMMIT;

-- SQLite Version (commented out for PostgreSQL)
/*
-- SQLite Version
BEGIN TRANSACTION;

-- Event Store Table
CREATE TABLE IF NOT EXISTS event_store (
    id TEXT PRIMARY KEY,
    aggregate_id TEXT NOT NULL,
    aggregate_type TEXT NOT NULL,
    event_type TEXT NOT NULL,
    event_version INTEGER NOT NULL DEFAULT 1,
    event_data TEXT NOT NULL, -- JSON as TEXT
    metadata TEXT DEFAULT '{}', -- JSON as TEXT
    user_id TEXT NOT NULL DEFAULT 'system',
    timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    correlation_id TEXT,
    causation_id TEXT
);

-- Event Store Snapshots
CREATE TABLE IF NOT EXISTS event_store_snapshots (
    id TEXT PRIMARY KEY,
    aggregate_id TEXT NOT NULL,
    aggregate_type TEXT NOT NULL,
    snapshot_version INTEGER NOT NULL,
    snapshot_data TEXT NOT NULL, -- JSON as TEXT
    metadata TEXT DEFAULT '{}', -- JSON as TEXT
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Soft Delete Metadata Table
CREATE TABLE IF NOT EXISTS soft_delete_metadata (
    id TEXT PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    deleted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_by TEXT NOT NULL DEFAULT 'system',
    reason TEXT,
    metadata TEXT DEFAULT '{}', -- JSON as TEXT
    recovery_token TEXT,
    expires_at TEXT
);

-- Schema Versions Table
CREATE TABLE IF NOT EXISTS schema_versions (
    id TEXT PRIMARY KEY,
    version TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    migration_file TEXT NOT NULL,
    checksum TEXT NOT NULL,
    applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    applied_by TEXT NOT NULL DEFAULT 'system',
    rollback_sql TEXT,
    metadata TEXT DEFAULT '{}' -- JSON as TEXT
);

-- Schema Validation Table
CREATE TABLE IF NOT EXISTS schema_validations (
    id TEXT PRIMARY KEY,
    version TEXT NOT NULL,
    validation_type TEXT NOT NULL,
    status TEXT NOT NULL,
    result TEXT NOT NULL, -- JSON as TEXT
    validated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    validated_by TEXT NOT NULL DEFAULT 'system',
    metadata TEXT DEFAULT '{}' -- JSON as TEXT
);

-- Audit Trail Table
CREATE TABLE IF NOT EXISTS audit_trail (
    id TEXT PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    operation TEXT NOT NULL,
    old_values TEXT, -- JSON as TEXT
    new_values TEXT, -- JSON as TEXT
    changed_fields TEXT, -- JSON array as TEXT
    user_id TEXT NOT NULL DEFAULT 'system',
    session_id TEXT,
    ip_address TEXT,
    user_agent TEXT,
    timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT DEFAULT '{}' -- JSON as TEXT
);

-- Audit Trail Summary Table
CREATE TABLE IF NOT EXISTS audit_trail_summary (
    id TEXT PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    total_changes INTEGER NOT NULL DEFAULT 0,
    first_change TEXT NOT NULL,
    last_change TEXT NOT NULL,
    last_changed_by TEXT NOT NULL,
    change_types TEXT, -- JSON array as TEXT
    metadata TEXT DEFAULT '{}' -- JSON as TEXT
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_event_store_aggregate_id ON event_store (aggregate_id);
CREATE INDEX IF NOT EXISTS idx_event_store_aggregate_type ON event_store (aggregate_type);
CREATE INDEX IF NOT EXISTS idx_event_store_event_type ON event_store (event_type);
CREATE INDEX IF NOT EXISTS idx_event_store_timestamp ON event_store (timestamp);
CREATE INDEX IF NOT EXISTS idx_event_store_user_id ON event_store (user_id);
CREATE INDEX IF NOT EXISTS idx_event_store_correlation_id ON event_store (correlation_id);
CREATE INDEX IF NOT EXISTS idx_event_store_aggregate_version ON event_store (aggregate_id, event_version);

CREATE INDEX IF NOT EXISTS idx_event_store_snapshots_aggregate_id ON event_store_snapshots (aggregate_id);
CREATE INDEX IF NOT EXISTS idx_event_store_snapshots_aggregate_type ON event_store_snapshots (aggregate_type);
CREATE INDEX IF NOT EXISTS idx_event_store_snapshots_version ON event_store_snapshots (snapshot_version);

CREATE INDEX IF NOT EXISTS idx_soft_delete_metadata_table_record ON soft_delete_metadata (table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_soft_delete_metadata_deleted_at ON soft_delete_metadata (deleted_at);
CREATE INDEX IF NOT EXISTS idx_soft_delete_metadata_deleted_by ON soft_delete_metadata (deleted_by);
CREATE INDEX IF NOT EXISTS idx_soft_delete_metadata_expires_at ON soft_delete_metadata (expires_at);

CREATE INDEX IF NOT EXISTS idx_schema_versions_version ON schema_versions (version);
CREATE INDEX IF NOT EXISTS idx_schema_versions_applied_at ON schema_versions (applied_at);
CREATE INDEX IF NOT EXISTS idx_schema_validations_version ON schema_validations (version);
CREATE INDEX IF NOT EXISTS idx_schema_validations_type ON schema_validations (validation_type);

CREATE INDEX IF NOT EXISTS idx_audit_trail_table_record ON audit_trail (table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_operation ON audit_trail (operation);
CREATE INDEX IF NOT EXISTS idx_audit_trail_user_id ON audit_trail (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_timestamp ON audit_trail (timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_trail_session_id ON audit_trail (session_id);

CREATE INDEX IF NOT EXISTS idx_audit_trail_summary_table_record ON audit_trail_summary (table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_summary_last_change ON audit_trail_summary (last_change);

-- Add soft delete columns to existing tables
ALTER TABLE tasks ADD COLUMN deleted_at TEXT;
ALTER TABLE tasks ADD COLUMN deleted_by TEXT;
ALTER TABLE tasks ADD COLUMN is_deleted INTEGER DEFAULT 0;

ALTER TABLE projects ADD COLUMN deleted_at TEXT;
ALTER TABLE projects ADD COLUMN deleted_by TEXT;
ALTER TABLE projects ADD COLUMN is_deleted INTEGER DEFAULT 0;

ALTER TABLE users ADD COLUMN deleted_at TEXT;
ALTER TABLE users ADD COLUMN deleted_by TEXT;
ALTER TABLE users ADD COLUMN is_deleted INTEGER DEFAULT 0;

ALTER TABLE analysis ADD COLUMN deleted_at TEXT;
ALTER TABLE analysis ADD COLUMN deleted_by TEXT;
ALTER TABLE analysis ADD COLUMN is_deleted INTEGER DEFAULT 0;

-- Add indexes for soft delete columns
CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at ON tasks (deleted_at);
CREATE INDEX IF NOT EXISTS idx_tasks_is_deleted ON tasks (is_deleted);
CREATE INDEX IF NOT EXISTS idx_projects_deleted_at ON projects (deleted_at);
CREATE INDEX IF NOT EXISTS idx_projects_is_deleted ON projects (is_deleted);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users (deleted_at);
CREATE INDEX IF NOT EXISTS idx_users_is_deleted ON users (is_deleted);
CREATE INDEX IF NOT EXISTS idx_analysis_deleted_at ON analysis (deleted_at);
CREATE INDEX IF NOT EXISTS idx_analysis_is_deleted ON analysis (is_deleted);

COMMIT;
*/
