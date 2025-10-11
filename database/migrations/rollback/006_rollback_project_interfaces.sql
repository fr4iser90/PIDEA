-- Rollback: 006_rollback_project_interfaces.sql
-- Description: Rollback project_interfaces table creation
-- Created: 2025-10-11T01:00:55.000Z
-- Version: 1.0.0
-- Status: Pending

-- PostgreSQL Version
BEGIN;

-- Drop indexes first
DROP INDEX IF EXISTS idx_project_interfaces_project_id;
DROP INDEX IF EXISTS idx_project_interfaces_type;
DROP INDEX IF EXISTS idx_project_interfaces_status;
DROP INDEX IF EXISTS idx_project_interfaces_default;
DROP INDEX IF EXISTS idx_project_interfaces_priority;
DROP INDEX IF EXISTS idx_project_interfaces_created_by;
DROP INDEX IF EXISTS idx_project_interfaces_created_at;

-- Drop check constraints
ALTER TABLE project_interfaces DROP CONSTRAINT IF EXISTS chk_interface_status;
ALTER TABLE project_interfaces DROP CONSTRAINT IF EXISTS chk_interface_type;
ALTER TABLE project_interfaces DROP CONSTRAINT IF EXISTS chk_priority;

-- Drop the table
DROP TABLE IF EXISTS project_interfaces;

COMMIT;

-- SQLite Version (commented out for PostgreSQL)
/*
-- SQLite Version
BEGIN TRANSACTION;

-- Drop indexes first
DROP INDEX IF EXISTS idx_project_interfaces_project_id;
DROP INDEX IF EXISTS idx_project_interfaces_type;
DROP INDEX IF EXISTS idx_project_interfaces_status;
DROP INDEX IF EXISTS idx_project_interfaces_default;
DROP INDEX IF EXISTS idx_project_interfaces_priority;
DROP INDEX IF EXISTS idx_project_interfaces_created_by;
DROP INDEX IF EXISTS idx_project_interfaces_created_at;

-- Drop the table
DROP TABLE IF EXISTS project_interfaces;

COMMIT;
*/

-- Rollback completed
-- Status: Applied
-- Applied: 2025-10-11T01:00:55.000Z
