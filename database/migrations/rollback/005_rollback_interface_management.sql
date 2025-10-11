-- Rollback: 005_rollback_interface_management.sql
-- Description: Rollback interface management fields from projects table
-- Created: 2025-10-11T01:00:55.000Z
-- Version: 1.0.0
-- Status: Pending

-- PostgreSQL Version
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

-- SQLite Version (commented out for PostgreSQL)
/*
-- SQLite Version
BEGIN TRANSACTION;

-- Drop indexes first
DROP INDEX IF EXISTS idx_projects_active_interface;
DROP INDEX IF EXISTS idx_projects_interface_status;

-- Remove columns
ALTER TABLE projects DROP COLUMN interface_count;
ALTER TABLE projects DROP COLUMN active_interface_id;
ALTER TABLE projects DROP COLUMN interface_config;
ALTER TABLE projects DROP COLUMN interface_status;
ALTER TABLE projects DROP COLUMN last_interface_switch;

COMMIT;
*/

-- Rollback completed
-- Status: Applied
-- Applied: 2025-10-11T01:00:55.000Z
