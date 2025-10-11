-- Migration: 006_create_project_interfaces_table.sql
-- Description: Create project_interfaces table for interface management
-- Created: 2025-10-11T01:00:55.000Z
-- Version: 1.0.0
-- Status: Pending

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
CREATE INDEX IF NOT EXISTS idx_project_interfaces_priority ON project_interfaces(priority);
CREATE INDEX IF NOT EXISTS idx_project_interfaces_created_by ON project_interfaces(created_by);
CREATE INDEX IF NOT EXISTS idx_project_interfaces_created_at ON project_interfaces(created_at);

-- Add check constraints
ALTER TABLE project_interfaces ADD CONSTRAINT chk_interface_status 
    CHECK (status IN ('active', 'inactive', 'error', 'connecting'));
ALTER TABLE project_interfaces ADD CONSTRAINT chk_interface_type 
    CHECK (interface_type IN ('ide', 'editor', 'terminal', 'browser', 'custom'));
ALTER TABLE project_interfaces ADD CONSTRAINT chk_priority 
    CHECK (priority >= 0 AND priority <= 100);

-- Add comments for documentation
COMMENT ON TABLE project_interfaces IS 'Interface management for projects';
COMMENT ON COLUMN project_interfaces.id IS 'Unique identifier for the interface';
COMMENT ON COLUMN project_interfaces.project_id IS 'Reference to the project this interface belongs to';
COMMENT ON COLUMN project_interfaces.interface_name IS 'Human-readable name for the interface';
COMMENT ON COLUMN project_interfaces.interface_type IS 'Type of interface: ide, editor, terminal, browser, custom';
COMMENT ON COLUMN project_interfaces.interface_subtype IS 'Subtype or variant of the interface';
COMMENT ON COLUMN project_interfaces.config IS 'JSON configuration for the interface';
COMMENT ON COLUMN project_interfaces.settings IS 'JSON settings for the interface';
COMMENT ON COLUMN project_interfaces.status IS 'Current status: active, inactive, error, connecting';
COMMENT ON COLUMN project_interfaces.is_default IS 'Whether this is the default interface for the project';
COMMENT ON COLUMN project_interfaces.priority IS 'Priority level (0-100) for interface selection';
COMMENT ON COLUMN project_interfaces.connection_config IS 'JSON configuration for connection settings';
COMMENT ON COLUMN project_interfaces.last_connected IS 'Timestamp of last successful connection';
COMMENT ON COLUMN project_interfaces.connection_count IS 'Number of times this interface has been connected';
COMMENT ON COLUMN project_interfaces.capabilities IS 'JSON array of interface capabilities';
COMMENT ON COLUMN project_interfaces.supported_operations IS 'JSON array of supported operations';
COMMENT ON COLUMN project_interfaces.metadata IS 'JSON metadata for the interface';

COMMIT;

-- SQLite Version (commented out for PostgreSQL)
/*
-- SQLite Version
BEGIN TRANSACTION;

-- Create project_interfaces table
CREATE TABLE IF NOT EXISTS project_interfaces (
    id TEXT PRIMARY KEY,
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
CREATE INDEX IF NOT EXISTS idx_project_interfaces_priority ON project_interfaces(priority);
CREATE INDEX IF NOT EXISTS idx_project_interfaces_created_by ON project_interfaces(created_by);
CREATE INDEX IF NOT EXISTS idx_project_interfaces_created_at ON project_interfaces(created_at);

-- Note: SQLite doesn't support CHECK constraints on existing tables
-- Constraints will be enforced at the application level

COMMIT;
*/

-- Migration completed
-- Status: Applied
-- Applied: 2025-10-11T01:00:55.000Z
