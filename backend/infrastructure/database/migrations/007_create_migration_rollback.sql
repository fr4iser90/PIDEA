-- Migration: 007_create_migration_rollback.sql
-- Description: Create migration rollback table for storing rollback data and history
-- Author: PIDEA System
-- Date: Current

-- Create migration rollback table
CREATE TABLE IF NOT EXISTS migration_rollback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    migration_id VARCHAR(255) NOT NULL REFERENCES migration_tracking(migration_id) ON DELETE CASCADE,
    rollback_id VARCHAR(255) UNIQUE NOT NULL,
    rollback_type VARCHAR(50) NOT NULL, -- 'automatic', 'manual', 'phase', 'step'
    trigger_reason VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    duration INTEGER, -- milliseconds
    rollback_data JSONB NOT NULL,
    rollback_steps JSONB,
    result JSONB,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_migration_rollback_migration_id ON migration_rollback(migration_id);
CREATE INDEX IF NOT EXISTS idx_migration_rollback_rollback_id ON migration_rollback(rollback_id);
CREATE INDEX IF NOT EXISTS idx_migration_rollback_rollback_type ON migration_rollback(rollback_type);
CREATE INDEX IF NOT EXISTS idx_migration_rollback_status ON migration_rollback(status);
CREATE INDEX IF NOT EXISTS idx_migration_rollback_start_time ON migration_rollback(start_time);
CREATE INDEX IF NOT EXISTS idx_migration_rollback_end_time ON migration_rollback(end_time);
CREATE INDEX IF NOT EXISTS idx_migration_rollback_created_at ON migration_rollback(created_at);
CREATE INDEX IF NOT EXISTS idx_migration_rollback_updated_at ON migration_rollback(updated_at);

-- Create composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_migration_rollback_migration_status ON migration_rollback(migration_id, status);
CREATE INDEX IF NOT EXISTS idx_migration_rollback_type_status ON migration_rollback(rollback_type, status);
CREATE INDEX IF NOT EXISTS idx_migration_rollback_status_time ON migration_rollback(status, start_time);

-- Create partial indexes for specific states
CREATE INDEX IF NOT EXISTS idx_migration_rollback_active_rollbacks ON migration_rollback(migration_id, rollback_type) 
    WHERE status = 'running';
CREATE INDEX IF NOT EXISTS idx_migration_rollback_failed_rollbacks ON migration_rollback(migration_id, error_message) 
    WHERE status = 'failed';
CREATE INDEX IF NOT EXISTS idx_migration_rollback_completed_rollbacks ON migration_rollback(migration_id, duration) 
    WHERE status = 'completed';

-- Create update trigger for automatic updated_at timestamp
DROP TRIGGER IF EXISTS trigger_migration_rollback_updated_at ON migration_rollback;
CREATE TRIGGER trigger_migration_rollback_updated_at
    BEFORE UPDATE ON migration_rollback
    FOR EACH ROW
    EXECUTE FUNCTION update_workflow_executions_updated_at();

-- Add comments for documentation
COMMENT ON TABLE migration_rollback IS 'Store rollback operations and their data';
COMMENT ON COLUMN migration_rollback.migration_id IS 'Reference to the migration being rolled back';
COMMENT ON COLUMN migration_rollback.rollback_id IS 'Unique identifier for the rollback operation';
COMMENT ON COLUMN migration_rollback.rollback_type IS 'Type of rollback (automatic, manual, phase, step)';
COMMENT ON COLUMN migration_rollback.trigger_reason IS 'Reason why the rollback was triggered';
COMMENT ON COLUMN migration_rollback.status IS 'Current status of the rollback operation';
COMMENT ON COLUMN migration_rollback.start_time IS 'When the rollback started';
COMMENT ON COLUMN migration_rollback.end_time IS 'When the rollback completed or failed';
COMMENT ON COLUMN migration_rollback.duration IS 'Total rollback time in milliseconds';
COMMENT ON COLUMN migration_rollback.rollback_data IS 'JSON data needed for rollback operations';
COMMENT ON COLUMN migration_rollback.rollback_steps IS 'JSON array of rollback steps to execute';
COMMENT ON COLUMN migration_rollback.result IS 'JSON result data from rollback execution';
COMMENT ON COLUMN migration_rollback.error_message IS 'Error message if rollback failed';
COMMENT ON COLUMN migration_rollback.retry_count IS 'Number of retry attempts for this rollback';
COMMENT ON COLUMN migration_rollback.max_retries IS 'Maximum number of retry attempts allowed';
COMMENT ON COLUMN migration_rollback.metadata IS 'Additional metadata about the rollback';

-- Create migration backup table
CREATE TABLE IF NOT EXISTS migration_backup (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    migration_id VARCHAR(255) NOT NULL REFERENCES migration_tracking(migration_id) ON DELETE CASCADE,
    backup_id VARCHAR(255) UNIQUE NOT NULL,
    backup_type VARCHAR(50) NOT NULL, -- 'full', 'incremental', 'differential'
    backup_data JSONB NOT NULL,
    backup_size BIGINT, -- bytes
    checksum VARCHAR(64) NOT NULL,
    compression_type VARCHAR(20) DEFAULT 'none', -- 'none', 'gzip', 'bzip2'
    encryption_type VARCHAR(20) DEFAULT 'none', -- 'none', 'aes256', 'aes512'
    backup_path VARCHAR(500),
    retention_days INTEGER DEFAULT 30,
    expires_at TIMESTAMP,
    is_valid BOOLEAN DEFAULT true,
    validation_checksum VARCHAR(64),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for migration backup
CREATE INDEX IF NOT EXISTS idx_migration_backup_migration_id ON migration_backup(migration_id);
CREATE INDEX IF NOT EXISTS idx_migration_backup_backup_id ON migration_backup(backup_id);
CREATE INDEX IF NOT EXISTS idx_migration_backup_backup_type ON migration_backup(backup_type);
CREATE INDEX IF NOT EXISTS idx_migration_backup_checksum ON migration_backup(checksum);
CREATE INDEX IF NOT EXISTS idx_migration_backup_expires_at ON migration_backup(expires_at);
CREATE INDEX IF NOT EXISTS idx_migration_backup_is_valid ON migration_backup(is_valid);
CREATE INDEX IF NOT EXISTS idx_migration_backup_created_at ON migration_backup(created_at);

-- Create composite indexes for migration backup
CREATE INDEX IF NOT EXISTS idx_migration_backup_migration_type ON migration_backup(migration_id, backup_type);
CREATE INDEX IF NOT EXISTS idx_migration_backup_valid_expires ON migration_backup(is_valid, expires_at);
CREATE INDEX IF NOT EXISTS idx_migration_backup_type_valid ON migration_backup(backup_type, is_valid);

-- Create update trigger for migration backup
DROP TRIGGER IF EXISTS trigger_migration_backup_updated_at ON migration_backup;
CREATE TRIGGER trigger_migration_backup_updated_at
    BEFORE UPDATE ON migration_backup
    FOR EACH ROW
    EXECUTE FUNCTION update_workflow_executions_updated_at();

-- Add comments for migration backup
COMMENT ON TABLE migration_backup IS 'Store backup data for migration rollback operations';
COMMENT ON COLUMN migration_backup.migration_id IS 'Reference to the migration';
COMMENT ON COLUMN migration_backup.backup_id IS 'Unique identifier for the backup';
COMMENT ON COLUMN migration_backup.backup_type IS 'Type of backup (full, incremental, differential)';
COMMENT ON COLUMN migration_backup.backup_data IS 'JSON data containing the backup information';
COMMENT ON COLUMN migration_backup.backup_size IS 'Size of the backup in bytes';
COMMENT ON COLUMN migration_backup.checksum IS 'SHA256 checksum of the backup data';
COMMENT ON COLUMN migration_backup.compression_type IS 'Type of compression used';
COMMENT ON COLUMN migration_backup.encryption_type IS 'Type of encryption used';
COMMENT ON COLUMN migration_backup.backup_path IS 'File system path to the backup file';
COMMENT ON COLUMN migration_backup.retention_days IS 'Number of days to retain the backup';
COMMENT ON COLUMN migration_backup.expires_at IS 'When the backup expires and should be deleted';
COMMENT ON COLUMN migration_backup.is_valid IS 'Whether the backup is valid and can be used';
COMMENT ON COLUMN migration_backup.validation_checksum IS 'Checksum for validation purposes';
COMMENT ON COLUMN migration_backup.metadata IS 'Additional metadata about the backup';

-- Create migration rollback history table
CREATE TABLE IF NOT EXISTS migration_rollback_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    migration_id VARCHAR(255) NOT NULL REFERENCES migration_tracking(migration_id) ON DELETE CASCADE,
    rollback_id VARCHAR(255) NOT NULL,
    phase_id VARCHAR(255),
    step_id VARCHAR(255),
    rollback_step_name VARCHAR(255) NOT NULL,
    rollback_step_type VARCHAR(50) NOT NULL, -- 'database', 'file', 'api', 'script'
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for rollback history
CREATE INDEX IF NOT EXISTS idx_migration_rollback_history_migration_id ON migration_rollback_history(migration_id);
CREATE INDEX IF NOT EXISTS idx_migration_rollback_history_rollback_id ON migration_rollback_history(rollback_id);
CREATE INDEX IF NOT EXISTS idx_migration_rollback_history_phase_id ON migration_rollback_history(phase_id);
CREATE INDEX IF NOT EXISTS idx_migration_rollback_history_step_id ON migration_rollback_history(step_id);
CREATE INDEX IF NOT EXISTS idx_migration_rollback_history_status ON migration_rollback_history(status);
CREATE INDEX IF NOT EXISTS idx_migration_rollback_history_step_type ON migration_rollback_history(rollback_step_type);
CREATE INDEX IF NOT EXISTS idx_migration_rollback_history_start_time ON migration_rollback_history(start_time);
CREATE INDEX IF NOT EXISTS idx_migration_rollback_history_end_time ON migration_rollback_history(end_time);

-- Create composite indexes for rollback history
CREATE INDEX IF NOT EXISTS idx_migration_rollback_history_rollback_status ON migration_rollback_history(rollback_id, status);
CREATE INDEX IF NOT EXISTS idx_migration_rollback_history_phase_status ON migration_rollback_history(phase_id, status);
CREATE INDEX IF NOT EXISTS idx_migration_rollback_history_step_status ON migration_rollback_history(step_id, status);
CREATE INDEX IF NOT EXISTS idx_migration_rollback_history_type_status ON migration_rollback_history(rollback_step_type, status);

-- Create update trigger for rollback history
DROP TRIGGER IF EXISTS trigger_migration_rollback_history_updated_at ON migration_rollback_history;
CREATE TRIGGER trigger_migration_rollback_history_updated_at
    BEFORE UPDATE ON migration_rollback_history
    FOR EACH ROW
    EXECUTE FUNCTION update_workflow_executions_updated_at();

-- Add comments for rollback history
COMMENT ON TABLE migration_rollback_history IS 'Track individual rollback steps within rollback operations';
COMMENT ON COLUMN migration_rollback_history.migration_id IS 'Reference to the migration';
COMMENT ON COLUMN migration_rollback_history.rollback_id IS 'Reference to the rollback operation';
COMMENT ON COLUMN migration_rollback_history.phase_id IS 'Reference to the phase (if applicable)';
COMMENT ON COLUMN migration_rollback_history.step_id IS 'Reference to the step (if applicable)';
COMMENT ON COLUMN migration_rollback_history.rollback_step_name IS 'Human-readable name of the rollback step';
COMMENT ON COLUMN migration_rollback_history.rollback_step_type IS 'Type of rollback step (database, file, api, script)';
COMMENT ON COLUMN migration_rollback_history.status IS 'Current status of the rollback step';
COMMENT ON COLUMN migration_rollback_history.start_time IS 'When the rollback step started';
COMMENT ON COLUMN migration_rollback_history.end_time IS 'When the rollback step completed or failed';
COMMENT ON COLUMN migration_rollback_history.duration IS 'Rollback step execution time in milliseconds';
COMMENT ON COLUMN migration_rollback_history.result IS 'JSON result data from rollback step execution';
COMMENT ON COLUMN migration_rollback_history.error_message IS 'Error message if rollback step failed';
COMMENT ON COLUMN migration_rollback_history.retry_count IS 'Number of retry attempts for this rollback step';
COMMENT ON COLUMN migration_rollback_history.max_retries IS 'Maximum number of retry attempts allowed';
COMMENT ON COLUMN migration_rollback_history.configuration IS 'JSON configuration for the rollback step';

-- Create view for rollback summary
CREATE OR REPLACE VIEW migration_rollback_summary AS
SELECT 
    mr.migration_id,
    mr.rollback_id,
    mr.rollback_type,
    mr.trigger_reason,
    mr.status,
    mr.start_time,
    mr.end_time,
    mr.duration,
    CASE 
        WHEN mr.status = 'completed' THEN 'success'
        WHEN mr.status = 'failed' THEN 'error'
        WHEN mr.status = 'running' THEN 'warning'
        ELSE 'info'
    END as status_category,
    CASE 
        WHEN mr.duration IS NOT NULL THEN 
            ROUND(mr.duration::DECIMAL / 1000, 2)
        ELSE NULL 
    END as duration_seconds,
    COUNT(mrh.id) as total_rollback_steps,
    COUNT(CASE WHEN mrh.status = 'completed' THEN 1 END) as completed_rollback_steps,
    COUNT(CASE WHEN mrh.status = 'failed' THEN 1 END) as failed_rollback_steps,
    COUNT(mb.id) as total_backups,
    COUNT(CASE WHEN mb.is_valid = true THEN 1 END) as valid_backups
FROM migration_rollback mr
LEFT JOIN migration_rollback_history mrh ON mr.rollback_id = mrh.rollback_id
LEFT JOIN migration_backup mb ON mr.migration_id = mb.migration_id
GROUP BY 
    mr.migration_id, mr.rollback_id, mr.rollback_type, mr.trigger_reason,
    mr.status, mr.start_time, mr.end_time, mr.duration;

-- Add comment for the view
COMMENT ON VIEW migration_rollback_summary IS 'Summary view of migration rollback operations';

-- Create function to create backup for migration
CREATE OR REPLACE FUNCTION create_migration_backup(
    p_migration_id VARCHAR(255),
    p_backup_type VARCHAR(50) DEFAULT 'full',
    p_backup_data JSONB,
    p_retention_days INTEGER DEFAULT 30
)
RETURNS VARCHAR(255) AS $$
DECLARE
    v_backup_id VARCHAR(255);
    v_checksum VARCHAR(64);
    v_expires_at TIMESTAMP;
BEGIN
    -- Generate backup ID
    v_backup_id := gen_random_uuid()::VARCHAR;
    
    -- Calculate checksum
    v_checksum := encode(sha256(p_backup_data::text::bytea), 'hex');
    
    -- Calculate expiration date
    v_expires_at := CURRENT_TIMESTAMP + (p_retention_days || ' days')::INTERVAL;
    
    -- Insert backup record
    INSERT INTO migration_backup (
        migration_id,
        backup_id,
        backup_type,
        backup_data,
        backup_size,
        checksum,
        retention_days,
        expires_at
    ) VALUES (
        p_migration_id,
        v_backup_id,
        p_backup_type,
        p_backup_data,
        octet_length(p_backup_data::text),
        v_checksum,
        p_retention_days,
        v_expires_at
    );
    
    RETURN v_backup_id;
END;
$$ LANGUAGE plpgsql;

-- Add comment for the function
COMMENT ON FUNCTION create_migration_backup IS 'Create a backup for migration rollback purposes';

-- Create function to validate backup
CREATE OR REPLACE FUNCTION validate_migration_backup(
    p_backup_id VARCHAR(255)
)
RETURNS BOOLEAN AS $$
DECLARE
    v_backup_data JSONB;
    v_stored_checksum VARCHAR(64);
    v_calculated_checksum VARCHAR(64);
    v_is_valid BOOLEAN;
BEGIN
    -- Get backup data and stored checksum
    SELECT backup_data, checksum INTO v_backup_data, v_stored_checksum
    FROM migration_backup
    WHERE backup_id = p_backup_id;
    
    IF v_backup_data IS NULL THEN
        RETURN false;
    END IF;
    
    -- Calculate checksum
    v_calculated_checksum := encode(sha256(v_backup_data::text::bytea), 'hex');
    
    -- Compare checksums
    v_is_valid := (v_stored_checksum = v_calculated_checksum);
    
    -- Update validation status
    UPDATE migration_backup 
    SET 
        is_valid = v_is_valid,
        validation_checksum = v_calculated_checksum,
        updated_at = CURRENT_TIMESTAMP
    WHERE backup_id = p_backup_id;
    
    RETURN v_is_valid;
END;
$$ LANGUAGE plpgsql;

-- Add comment for the function
COMMENT ON FUNCTION validate_migration_backup IS 'Validate backup integrity using checksum comparison';

-- Create function to get rollback statistics
CREATE OR REPLACE FUNCTION get_migration_rollback_statistics()
RETURNS TABLE (
    total_rollbacks INTEGER,
    completed_rollbacks INTEGER,
    failed_rollbacks INTEGER,
    running_rollbacks INTEGER,
    average_duration DECIMAL(10,2),
    success_rate DECIMAL(5,2),
    total_backups INTEGER,
    valid_backups INTEGER,
    total_rollback_steps INTEGER,
    failed_rollback_steps INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_rollbacks,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_rollbacks,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_rollbacks,
        COUNT(*) FILTER (WHERE status = 'running') as running_rollbacks,
        ROUND(AVG(duration) / 1000, 2) as average_duration,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                ROUND((COUNT(*) FILTER (WHERE status = 'completed')::DECIMAL / COUNT(*)) * 100, 2)
            ELSE 0 
        END as success_rate,
        COUNT(DISTINCT mb.id) as total_backups,
        COUNT(DISTINCT CASE WHEN mb.is_valid = true THEN mb.id END) as valid_backups,
        COUNT(DISTINCT mrh.id) as total_rollback_steps,
        COUNT(DISTINCT CASE WHEN mrh.status = 'failed' THEN mrh.id END) as failed_rollback_steps
    FROM migration_rollback mr
    LEFT JOIN migration_backup mb ON mr.migration_id = mb.migration_id
    LEFT JOIN migration_rollback_history mrh ON mr.rollback_id = mrh.rollback_id;
END;
$$ LANGUAGE plpgsql;

-- Add comment for the function
COMMENT ON FUNCTION get_migration_rollback_statistics IS 'Get overall migration rollback statistics and success rates';

-- Create function to cleanup expired backups
CREATE OR REPLACE FUNCTION cleanup_expired_backups()
RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM migration_backup 
    WHERE expires_at < CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Add comment for the function
COMMENT ON FUNCTION cleanup_expired_backups IS 'Remove expired backup records from the database'; 