-- Migration: Add content hash and file path support to tasks table
-- Version: 003
-- Description: Adds content addressable storage support for task files
-- Created: 2025-10-01T14:33:40.000Z

-- Add content hash column for content addressable storage
ALTER TABLE tasks ADD COLUMN content_hash TEXT;

-- Add file path column for metadata tracking (not source of truth)
ALTER TABLE tasks ADD COLUMN file_path TEXT;

-- Add last synced timestamp for consistency tracking
ALTER TABLE tasks ADD COLUMN last_synced_at TIMESTAMP WITH TIME ZONE;

-- Create task_file_events table for event sourcing
CREATE TABLE IF NOT EXISTS task_file_events (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    event_type TEXT NOT NULL, -- 'status_change', 'file_movement', 'content_hash_validation'
    from_status TEXT,
    to_status TEXT,
    from_path TEXT,
    to_path TEXT,
    content_hash TEXT,
    is_valid BOOLEAN,
    metadata JSONB, -- JSON for extended data
    user_id TEXT NOT NULL DEFAULT 'system',
    event_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    FOREIGN KEY (task_id) REFERENCES tasks (id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_content_hash ON tasks (content_hash);
CREATE INDEX IF NOT EXISTS idx_tasks_file_path ON tasks (file_path);
CREATE INDEX IF NOT EXISTS idx_tasks_last_synced_at ON tasks (last_synced_at);

CREATE INDEX IF NOT EXISTS idx_task_file_events_task_id ON task_file_events (task_id);
CREATE INDEX IF NOT EXISTS idx_task_file_events_event_type ON task_file_events (event_type);
CREATE INDEX IF NOT EXISTS idx_task_file_events_timestamp ON task_file_events (event_timestamp);
CREATE INDEX IF NOT EXISTS idx_task_file_events_user_id ON task_file_events (user_id);

-- Add comments for documentation (SQLite doesn't support COMMENT ON)
-- content_hash: SHA-256 hash of markdown content for content addressable storage
-- file_path: Current file path for metadata tracking (not source of truth)
-- last_synced_at: Timestamp of last synchronization between file and database
-- task_file_events: Event store for task status changes and file movements
-- event_type: Type of event: status_change, file_movement, content_hash_validation
-- metadata: Additional event data in JSON format

-- Update existing tasks with default values
UPDATE tasks 
SET 
    content_hash = NULL,
    file_path = NULL,
    last_synced_at = NOW()
WHERE content_hash IS NULL;

-- Create view for task status consistency monitoring
CREATE OR REPLACE VIEW task_status_consistency AS
SELECT 
    t.id,
    t.title,
    t.status,
    t.content_hash,
    t.file_path,
    t.last_synced_at,
    CASE 
        WHEN t.content_hash IS NULL THEN 'no_hash'
        WHEN t.file_path IS NULL THEN 'no_path'
        WHEN t.last_synced_at IS NULL THEN 'never_synced'
        ELSE 'synced'
    END as sync_status,
    COUNT(e.id) as event_count,
    MAX(e.event_timestamp) as last_event_timestamp
FROM tasks t
LEFT JOIN task_file_events e ON t.id = e.task_id
GROUP BY t.id, t.title, t.status, t.content_hash, t.file_path, t.last_synced_at;

-- Note: PostgreSQL functions removed for SQLite compatibility
-- These functions will be implemented in the application layer instead
