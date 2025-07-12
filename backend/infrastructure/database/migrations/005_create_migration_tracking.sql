-- Migration: 005_create_migration_tracking.sql
-- Description: Create migration tracking table for storing migration history and progress
-- Author: PIDEA System
-- Date: Current

-- Create migration tracking table
CREATE TABLE IF NOT EXISTS migration_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    migration_id VARCHAR(255) UNIQUE NOT NULL,
    migration_name VARCHAR(255) NOT NULL,
    migration_description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed', 'rolled_back'
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    duration INTEGER, -- milliseconds
    current_phase VARCHAR(255),
    current_step VARCHAR(255),
    progress_percentage INTEGER DEFAULT 0,
    total_phases INTEGER DEFAULT 0,
    completed_phases INTEGER DEFAULT 0,
    total_steps INTEGER DEFAULT 0,
    completed_steps INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    warning_count INTEGER DEFAULT 0,
    rollback_count INTEGER DEFAULT 0,
    risk_level VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high'
    dependencies JSONB,
    configuration JSONB,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_migration_tracking_migration_id ON migration_tracking(migration_id);
CREATE INDEX IF NOT EXISTS idx_migration_tracking_status ON migration_tracking(status);
CREATE INDEX IF NOT EXISTS idx_migration_tracking_start_time ON migration_tracking(start_time);
CREATE INDEX IF NOT EXISTS idx_migration_tracking_end_time ON migration_tracking(end_time);
CREATE INDEX IF NOT EXISTS idx_migration_tracking_created_at ON migration_tracking(created_at);
CREATE INDEX IF NOT EXISTS idx_migration_tracking_updated_at ON migration_tracking(updated_at);

-- Create composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_migration_tracking_status_time ON migration_tracking(status, start_time);
CREATE INDEX IF NOT EXISTS idx_migration_tracking_status_progress ON migration_tracking(status, progress_percentage);
CREATE INDEX IF NOT EXISTS idx_migration_tracking_risk_status ON migration_tracking(risk_level, status);

-- Create partial indexes for specific states
CREATE INDEX IF NOT EXISTS idx_migration_tracking_active_migrations ON migration_tracking(migration_id, current_phase) 
    WHERE status = 'running';
CREATE INDEX IF NOT EXISTS idx_migration_tracking_failed_migrations ON migration_tracking(migration_id, error_count) 
    WHERE status = 'failed';
CREATE INDEX IF NOT EXISTS idx_migration_tracking_completed_migrations ON migration_tracking(migration_id, duration) 
    WHERE status = 'completed';

-- Create update trigger for automatic updated_at timestamp
DROP TRIGGER IF EXISTS trigger_migration_tracking_updated_at ON migration_tracking;
CREATE TRIGGER trigger_migration_tracking_updated_at
    BEFORE UPDATE ON migration_tracking
    FOR EACH ROW
    EXECUTE FUNCTION update_workflow_executions_updated_at();

-- Add comments for documentation
COMMENT ON TABLE migration_tracking IS 'Track migration execution history and progress';
COMMENT ON COLUMN migration_tracking.migration_id IS 'Unique identifier for the migration';
COMMENT ON COLUMN migration_tracking.migration_name IS 'Human-readable name of the migration';
COMMENT ON COLUMN migration_tracking.migration_description IS 'Description of what the migration does';
COMMENT ON COLUMN migration_tracking.status IS 'Current status of the migration';
COMMENT ON COLUMN migration_tracking.start_time IS 'When the migration started';
COMMENT ON COLUMN migration_tracking.end_time IS 'When the migration completed or failed';
COMMENT ON COLUMN migration_tracking.duration IS 'Total execution time in milliseconds';
COMMENT ON COLUMN migration_tracking.current_phase IS 'Currently executing phase';
COMMENT ON COLUMN migration_tracking.current_step IS 'Currently executing step';
COMMENT ON COLUMN migration_tracking.progress_percentage IS 'Overall progress percentage (0-100)';
COMMENT ON COLUMN migration_tracking.total_phases IS 'Total number of phases in the migration';
COMMENT ON COLUMN migration_tracking.completed_phases IS 'Number of completed phases';
COMMENT ON COLUMN migration_tracking.total_steps IS 'Total number of steps in the migration';
COMMENT ON COLUMN migration_tracking.completed_steps IS 'Number of completed steps';
COMMENT ON COLUMN migration_tracking.error_count IS 'Number of errors encountered';
COMMENT ON COLUMN migration_tracking.warning_count IS 'Number of warnings encountered';
COMMENT ON COLUMN migration_tracking.rollback_count IS 'Number of rollback operations performed';
COMMENT ON COLUMN migration_tracking.risk_level IS 'Risk level of the migration';
COMMENT ON COLUMN migration_tracking.dependencies IS 'JSON array of migration dependencies';
COMMENT ON COLUMN migration_tracking.configuration IS 'JSON configuration for the migration';
COMMENT ON COLUMN migration_tracking.metadata IS 'Additional metadata about the migration';

-- Create migration phases table
CREATE TABLE IF NOT EXISTS migration_phases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    migration_id VARCHAR(255) NOT NULL REFERENCES migration_tracking(migration_id) ON DELETE CASCADE,
    phase_id VARCHAR(255) NOT NULL,
    phase_name VARCHAR(255) NOT NULL,
    phase_description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    duration INTEGER, -- milliseconds
    total_steps INTEGER DEFAULT 0,
    completed_steps INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    warning_count INTEGER DEFAULT 0,
    progress_percentage INTEGER DEFAULT 0,
    dependencies JSONB,
    rollback_steps JSONB,
    result JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(migration_id, phase_id)
);

-- Create indexes for migration phases
CREATE INDEX IF NOT EXISTS idx_migration_phases_migration_id ON migration_phases(migration_id);
CREATE INDEX IF NOT EXISTS idx_migration_phases_phase_id ON migration_phases(phase_id);
CREATE INDEX IF NOT EXISTS idx_migration_phases_status ON migration_phases(status);
CREATE INDEX IF NOT EXISTS idx_migration_phases_start_time ON migration_phases(start_time);
CREATE INDEX IF NOT EXISTS idx_migration_phases_end_time ON migration_phases(end_time);

-- Create composite indexes for migration phases
CREATE INDEX IF NOT EXISTS idx_migration_phases_migration_status ON migration_phases(migration_id, status);
CREATE INDEX IF NOT EXISTS idx_migration_phases_status_time ON migration_phases(status, start_time);

-- Create update trigger for migration phases
DROP TRIGGER IF EXISTS trigger_migration_phases_updated_at ON migration_phases;
CREATE TRIGGER trigger_migration_phases_updated_at
    BEFORE UPDATE ON migration_phases
    FOR EACH ROW
    EXECUTE FUNCTION update_workflow_executions_updated_at();

-- Add comments for migration phases
COMMENT ON TABLE migration_phases IS 'Track individual phases within migrations';
COMMENT ON COLUMN migration_phases.migration_id IS 'Reference to the parent migration';
COMMENT ON COLUMN migration_phases.phase_id IS 'Unique identifier for the phase within the migration';
COMMENT ON COLUMN migration_phases.phase_name IS 'Human-readable name of the phase';
COMMENT ON COLUMN migration_phases.phase_description IS 'Description of what the phase does';
COMMENT ON COLUMN migration_phases.status IS 'Current status of the phase';
COMMENT ON COLUMN migration_phases.start_time IS 'When the phase started';
COMMENT ON COLUMN migration_phases.end_time IS 'When the phase completed or failed';
COMMENT ON COLUMN migration_phases.duration IS 'Phase execution time in milliseconds';
COMMENT ON COLUMN migration_phases.total_steps IS 'Total number of steps in the phase';
COMMENT ON COLUMN migration_phases.completed_steps IS 'Number of completed steps in the phase';
COMMENT ON COLUMN migration_phases.progress_percentage IS 'Phase progress percentage (0-100)';
COMMENT ON COLUMN migration_phases.dependencies IS 'JSON array of phase dependencies';
COMMENT ON COLUMN migration_phases.rollback_steps IS 'JSON array of rollback steps for this phase';
COMMENT ON COLUMN migration_phases.result IS 'JSON result data from phase execution';

-- Create migration steps table
CREATE TABLE IF NOT EXISTS migration_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    migration_id VARCHAR(255) NOT NULL REFERENCES migration_tracking(migration_id) ON DELETE CASCADE,
    phase_id VARCHAR(255) NOT NULL,
    step_id VARCHAR(255) NOT NULL,
    step_name VARCHAR(255) NOT NULL,
    step_type VARCHAR(50) NOT NULL, -- 'database', 'file', 'api', 'script'
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    duration INTEGER, -- milliseconds
    result JSONB,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    configuration JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(migration_id, phase_id, step_id)
);

-- Create indexes for migration steps
CREATE INDEX IF NOT EXISTS idx_migration_steps_migration_id ON migration_steps(migration_id);
CREATE INDEX IF NOT EXISTS idx_migration_steps_phase_id ON migration_steps(phase_id);
CREATE INDEX IF NOT EXISTS idx_migration_steps_step_id ON migration_steps(step_id);
CREATE INDEX IF NOT EXISTS idx_migration_steps_status ON migration_steps(status);
CREATE INDEX IF NOT EXISTS idx_migration_steps_step_type ON migration_steps(step_type);
CREATE INDEX IF NOT EXISTS idx_migration_steps_start_time ON migration_steps(start_time);
CREATE INDEX IF NOT EXISTS idx_migration_steps_end_time ON migration_steps(end_time);

-- Create composite indexes for migration steps
CREATE INDEX IF NOT EXISTS idx_migration_steps_migration_phase ON migration_steps(migration_id, phase_id);
CREATE INDEX IF NOT EXISTS idx_migration_steps_phase_status ON migration_steps(phase_id, status);
CREATE INDEX IF NOT EXISTS idx_migration_steps_type_status ON migration_steps(step_type, status);

-- Create update trigger for migration steps
DROP TRIGGER IF EXISTS trigger_migration_steps_updated_at ON migration_steps;
CREATE TRIGGER trigger_migration_steps_updated_at
    BEFORE UPDATE ON migration_steps
    FOR EACH ROW
    EXECUTE FUNCTION update_workflow_executions_updated_at();

-- Add comments for migration steps
COMMENT ON TABLE migration_steps IS 'Track individual steps within migration phases';
COMMENT ON COLUMN migration_steps.migration_id IS 'Reference to the parent migration';
COMMENT ON COLUMN migration_steps.phase_id IS 'Reference to the parent phase';
COMMENT ON COLUMN migration_steps.step_id IS 'Unique identifier for the step within the phase';
COMMENT ON COLUMN migration_steps.step_name IS 'Human-readable name of the step';
COMMENT ON COLUMN migration_steps.step_type IS 'Type of step (database, file, api, script)';
COMMENT ON COLUMN migration_steps.status IS 'Current status of the step';
COMMENT ON COLUMN migration_steps.start_time IS 'When the step started';
COMMENT ON COLUMN migration_steps.end_time IS 'When the step completed or failed';
COMMENT ON COLUMN migration_steps.duration IS 'Step execution time in milliseconds';
COMMENT ON COLUMN migration_steps.result IS 'JSON result data from step execution';
COMMENT ON COLUMN migration_steps.error_message IS 'Error message if step failed';
COMMENT ON COLUMN migration_steps.retry_count IS 'Number of retry attempts for this step';
COMMENT ON COLUMN migration_steps.max_retries IS 'Maximum number of retry attempts allowed';
COMMENT ON COLUMN migration_steps.configuration IS 'JSON configuration for the step';

-- Create view for migration summary
CREATE OR REPLACE VIEW migration_summary AS
SELECT 
    mt.migration_id,
    mt.migration_name,
    mt.status,
    mt.start_time,
    mt.end_time,
    mt.duration,
    mt.progress_percentage,
    mt.total_phases,
    mt.completed_phases,
    mt.total_steps,
    mt.completed_steps,
    mt.error_count,
    mt.warning_count,
    mt.rollback_count,
    mt.risk_level,
    mt.current_phase,
    mt.current_step,
    CASE 
        WHEN mt.status = 'completed' THEN 'success'
        WHEN mt.status = 'failed' THEN 'error'
        WHEN mt.status = 'running' THEN 'warning'
        ELSE 'info'
    END as status_category,
    CASE 
        WHEN mt.duration IS NOT NULL THEN 
            ROUND(mt.duration::DECIMAL / 1000, 2)
        ELSE NULL 
    END as duration_seconds,
    CASE 
        WHEN mt.total_phases > 0 THEN 
            ROUND((mt.completed_phases::DECIMAL / mt.total_phases) * 100, 2)
        ELSE 0 
    END as phase_completion_rate,
    CASE 
        WHEN mt.total_steps > 0 THEN 
            ROUND((mt.completed_steps::DECIMAL / mt.total_steps) * 100, 2)
        ELSE 0 
    END as step_completion_rate
FROM migration_tracking mt;

-- Add comment for the view
COMMENT ON VIEW migration_summary IS 'Summary view of migration status and progress';

-- Create function to update migration progress
CREATE OR REPLACE FUNCTION update_migration_progress(
    p_migration_id VARCHAR(255),
    p_current_phase VARCHAR(255),
    p_current_step VARCHAR(255),
    p_progress_percentage INTEGER,
    p_completed_phases INTEGER,
    p_completed_steps INTEGER
)
RETURNS VOID AS $$
BEGIN
    UPDATE migration_tracking 
    SET 
        current_phase = p_current_phase,
        current_step = p_current_step,
        progress_percentage = p_progress_percentage,
        completed_phases = p_completed_phases,
        completed_steps = p_completed_steps,
        updated_at = CURRENT_TIMESTAMP
    WHERE migration_id = p_migration_id;
END;
$$ LANGUAGE plpgsql;

-- Add comment for the function
COMMENT ON FUNCTION update_migration_progress IS 'Update migration progress and current execution state';

-- Create function to get migration statistics
CREATE OR REPLACE FUNCTION get_migration_statistics()
RETURNS TABLE (
    total_migrations INTEGER,
    completed_migrations INTEGER,
    failed_migrations INTEGER,
    running_migrations INTEGER,
    pending_migrations INTEGER,
    average_duration DECIMAL(10,2),
    success_rate DECIMAL(5,2),
    total_errors INTEGER,
    total_warnings INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_migrations,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_migrations,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_migrations,
        COUNT(*) FILTER (WHERE status = 'running') as running_migrations,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_migrations,
        ROUND(AVG(duration) / 1000, 2) as average_duration,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                ROUND((COUNT(*) FILTER (WHERE status = 'completed')::DECIMAL / COUNT(*)) * 100, 2)
            ELSE 0 
        END as success_rate,
        SUM(error_count) as total_errors,
        SUM(warning_count) as total_warnings
    FROM migration_tracking;
END;
$$ LANGUAGE plpgsql;

-- Add comment for the function
COMMENT ON FUNCTION get_migration_statistics IS 'Get overall migration statistics and success rates'; 