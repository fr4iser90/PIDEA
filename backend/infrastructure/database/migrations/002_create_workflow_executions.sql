-- Migration: 002_create_workflow_executions.sql
-- Description: Create workflow executions table for tracking workflow execution history
-- Author: PIDEA System
-- Date: Current

-- Create workflow executions table
CREATE TABLE IF NOT EXISTS workflow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id VARCHAR(255) UNIQUE NOT NULL,
    workflow_id VARCHAR(255) NOT NULL,
    workflow_name VARCHAR(255) NOT NULL,
    workflow_version VARCHAR(50),
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    user_id VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    strategy VARCHAR(100),
    priority INTEGER DEFAULT 1,
    estimated_duration INTEGER, -- milliseconds
    actual_duration INTEGER, -- milliseconds
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    result_data JSONB,
    error_data JSONB,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_workflow_executions_execution_id ON workflow_executions(execution_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_task_id ON workflow_executions(task_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_start_time ON workflow_executions(start_time);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_user_id ON workflow_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_created_at ON workflow_executions(created_at);

-- Create composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_status ON workflow_executions(workflow_id, status);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_user_status ON workflow_executions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_task_status ON workflow_executions(task_id, status);

-- Create update trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_workflow_executions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic updated_at timestamp
DROP TRIGGER IF EXISTS trigger_workflow_executions_updated_at ON workflow_executions;
CREATE TRIGGER trigger_workflow_executions_updated_at
    BEFORE UPDATE ON workflow_executions
    FOR EACH ROW
    EXECUTE FUNCTION update_workflow_executions_updated_at();

-- Add comments for documentation
COMMENT ON TABLE workflow_executions IS 'Tracks workflow execution history and performance metrics';
COMMENT ON COLUMN workflow_executions.execution_id IS 'Unique identifier for the execution instance';
COMMENT ON COLUMN workflow_executions.workflow_id IS 'Identifier of the workflow being executed';
COMMENT ON COLUMN workflow_executions.workflow_name IS 'Human-readable name of the workflow';
COMMENT ON COLUMN workflow_executions.workflow_version IS 'Version of the workflow being executed';
COMMENT ON COLUMN workflow_executions.task_id IS 'Associated task ID if execution is task-related';
COMMENT ON COLUMN workflow_executions.user_id IS 'User who initiated the execution';
COMMENT ON COLUMN workflow_executions.status IS 'Current status: pending, running, completed, failed, cancelled';
COMMENT ON COLUMN workflow_executions.strategy IS 'Execution strategy used (sequential, parallel, etc.)';
COMMENT ON COLUMN workflow_executions.priority IS 'Execution priority (1=low, 5=high)';
COMMENT ON COLUMN workflow_executions.estimated_duration IS 'Estimated duration in milliseconds';
COMMENT ON COLUMN workflow_executions.actual_duration IS 'Actual duration in milliseconds';
COMMENT ON COLUMN workflow_executions.result_data IS 'JSON result data from execution';
COMMENT ON COLUMN workflow_executions.error_data IS 'JSON error data if execution failed';
COMMENT ON COLUMN workflow_executions.metadata IS 'Additional metadata about the execution'; 