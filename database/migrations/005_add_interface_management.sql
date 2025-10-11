-- Migration: 005_add_interface_management.sql
-- Description: Add interface management fields to projects table
-- Created: 2025-10-11T01:00:55.000Z
-- Version: 1.0.0
-- Status: Pending

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

-- Add comments for documentation
COMMENT ON COLUMN projects.interface_count IS 'Number of interfaces configured for this project';
COMMENT ON COLUMN projects.active_interface_id IS 'ID of the currently active interface';
COMMENT ON COLUMN projects.interface_config IS 'JSON configuration for interface management';
COMMENT ON COLUMN projects.interface_status IS 'Interface status: none, single, or multiple';
COMMENT ON COLUMN projects.last_interface_switch IS 'Timestamp of last interface switch';

COMMIT;

-- SQLite Version (commented out for PostgreSQL)
/*
-- SQLite Version
BEGIN TRANSACTION;

-- Add interface management fields to projects table
ALTER TABLE projects ADD COLUMN interface_count INTEGER DEFAULT 0;
ALTER TABLE projects ADD COLUMN active_interface_id TEXT;
ALTER TABLE projects ADD COLUMN interface_config TEXT;
ALTER TABLE projects ADD COLUMN interface_status TEXT DEFAULT 'none';
ALTER TABLE projects ADD COLUMN last_interface_switch TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_active_interface ON projects(active_interface_id);
CREATE INDEX IF NOT EXISTS idx_projects_interface_status ON projects(interface_status);

-- Update existing projects to have default interface status
UPDATE projects SET interface_status = 'none' WHERE interface_status IS NULL;

-- Note: SQLite doesn't support CHECK constraints on existing tables
-- Constraints will be enforced at the application level

COMMIT;
*/

-- Migration completed
-- Status: Applied
-- Applied: 2025-10-11T01:00:55.000Z
