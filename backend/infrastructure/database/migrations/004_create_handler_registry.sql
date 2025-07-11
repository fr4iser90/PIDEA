-- Migration: 004_create_handler_registry.sql
-- Description: Create handler registry table for tracking registered handlers and their capabilities
-- Author: PIDEA System
-- Date: Current

-- Create handler registry table
CREATE TABLE IF NOT EXISTS handler_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    handler_type VARCHAR(255) UNIQUE NOT NULL,
    handler_name VARCHAR(255) NOT NULL,
    handler_class VARCHAR(255),
    handler_path VARCHAR(500),
    version VARCHAR(50) DEFAULT '1.0.0',
    description TEXT,
    capabilities JSONB,
    configuration JSONB,
    dependencies JSONB,
    metadata JSONB,
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    priority INTEGER DEFAULT 1,
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP,
    usage_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    average_execution_time INTEGER DEFAULT 0 -- milliseconds
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_handler_registry_handler_type ON handler_registry(handler_type);
CREATE INDEX IF NOT EXISTS idx_handler_registry_handler_name ON handler_registry(handler_name);
CREATE INDEX IF NOT EXISTS idx_handler_registry_is_active ON handler_registry(is_active);
CREATE INDEX IF NOT EXISTS idx_handler_registry_is_default ON handler_registry(is_default);
CREATE INDEX IF NOT EXISTS idx_handler_registry_priority ON handler_registry(priority);
CREATE INDEX IF NOT EXISTS idx_handler_registry_registered_at ON handler_registry(registered_at);
CREATE INDEX IF NOT EXISTS idx_handler_registry_last_used_at ON handler_registry(last_used_at);

-- Create composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_handler_registry_active_priority ON handler_registry(is_active, priority);
CREATE INDEX IF NOT EXISTS idx_handler_registry_type_active ON handler_registry(handler_type, is_active);
CREATE INDEX IF NOT EXISTS idx_handler_registry_name_active ON handler_registry(handler_name, is_active);

-- Create partial indexes for specific states
CREATE INDEX IF NOT EXISTS idx_handler_registry_active_handlers ON handler_registry(handler_type, priority) 
    WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_handler_registry_default_handlers ON handler_registry(handler_type, priority) 
    WHERE is_default = true;

-- Create update trigger for automatic updated_at timestamp
DROP TRIGGER IF EXISTS trigger_handler_registry_updated_at ON handler_registry;
CREATE TRIGGER trigger_handler_registry_updated_at
    BEFORE UPDATE ON handler_registry
    FOR EACH ROW
    EXECUTE FUNCTION update_workflow_executions_updated_at();

-- Add comments for documentation
COMMENT ON TABLE handler_registry IS 'Registry of available workflow handlers and their capabilities';
COMMENT ON COLUMN handler_registry.handler_type IS 'Unique type identifier for the handler';
COMMENT ON COLUMN handler_registry.handler_name IS 'Human-readable name of the handler';
COMMENT ON COLUMN handler_registry.handler_class IS 'JavaScript class name of the handler';
COMMENT ON COLUMN handler_registry.handler_path IS 'File path to the handler implementation';
COMMENT ON COLUMN handler_registry.version IS 'Version of the handler';
COMMENT ON COLUMN handler_registry.description IS 'Description of what the handler does';
COMMENT ON COLUMN handler_registry.capabilities IS 'JSON object describing handler capabilities';
COMMENT ON COLUMN handler_registry.configuration IS 'JSON configuration for the handler';
COMMENT ON COLUMN handler_registry.dependencies IS 'JSON array of handler dependencies';
COMMENT ON COLUMN handler_registry.metadata IS 'Additional metadata about the handler';
COMMENT ON COLUMN handler_registry.is_active IS 'Whether the handler is currently active';
COMMENT ON COLUMN handler_registry.is_default IS 'Whether this is the default handler for its type';
COMMENT ON COLUMN handler_registry.priority IS 'Priority for handler selection (1=low, 5=high)';
COMMENT ON COLUMN handler_registry.usage_count IS 'Total number of times handler was used';
COMMENT ON COLUMN handler_registry.success_count IS 'Number of successful executions';
COMMENT ON COLUMN handler_registry.failure_count IS 'Number of failed executions';
COMMENT ON COLUMN handler_registry.average_execution_time IS 'Average execution time in milliseconds';

-- Create handler usage history table
CREATE TABLE IF NOT EXISTS handler_usage_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    handler_type VARCHAR(255) NOT NULL,
    execution_id VARCHAR(255) REFERENCES workflow_executions(execution_id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL, -- 'success', 'failure', 'timeout', 'error'
    execution_time INTEGER, -- milliseconds
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for handler usage history
CREATE INDEX IF NOT EXISTS idx_handler_usage_history_handler_type ON handler_usage_history(handler_type);
CREATE INDEX IF NOT EXISTS idx_handler_usage_history_execution_id ON handler_usage_history(execution_id);
CREATE INDEX IF NOT EXISTS idx_handler_usage_history_status ON handler_usage_history(status);
CREATE INDEX IF NOT EXISTS idx_handler_usage_history_created_at ON handler_usage_history(created_at);

-- Create composite indexes for handler usage history
CREATE INDEX IF NOT EXISTS idx_handler_usage_history_type_status ON handler_usage_history(handler_type, status);
CREATE INDEX IF NOT EXISTS idx_handler_usage_history_type_time ON handler_usage_history(handler_type, created_at);

-- Add comments for handler usage history
COMMENT ON TABLE handler_usage_history IS 'History of handler usage for analytics and debugging';
COMMENT ON COLUMN handler_usage_history.handler_type IS 'Type of handler that was used';
COMMENT ON COLUMN handler_usage_history.execution_id IS 'Reference to workflow execution';
COMMENT ON COLUMN handler_usage_history.status IS 'Status of handler execution';
COMMENT ON COLUMN handler_usage_history.execution_time IS 'Time taken for handler execution in milliseconds';
COMMENT ON COLUMN handler_usage_history.error_message IS 'Error message if execution failed';

-- Create view for handler performance summary
CREATE OR REPLACE VIEW handler_performance_summary AS
SELECT 
    hr.handler_type,
    hr.handler_name,
    hr.version,
    hr.is_active,
    hr.is_default,
    hr.priority,
    hr.usage_count,
    hr.success_count,
    hr.failure_count,
    hr.average_execution_time,
    CASE 
        WHEN hr.usage_count > 0 THEN 
            ROUND((hr.success_count::DECIMAL / hr.usage_count) * 100, 2)
        ELSE 0 
    END as success_rate,
    COUNT(huh.id) as recent_usage_count,
    AVG(huh.execution_time) as recent_avg_execution_time,
    MAX(huh.created_at) as last_used
FROM handler_registry hr
LEFT JOIN handler_usage_history huh ON hr.handler_type = huh.handler_type 
    AND huh.created_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
GROUP BY 
    hr.handler_type, hr.handler_name, hr.version, hr.is_active, 
    hr.is_default, hr.priority, hr.usage_count, hr.success_count, 
    hr.failure_count, hr.average_execution_time;

-- Add comment for the view
COMMENT ON VIEW handler_performance_summary IS 'Summary view of handler performance and usage statistics';

-- Create function to update handler statistics
CREATE OR REPLACE FUNCTION update_handler_statistics(
    p_handler_type VARCHAR(255),
    p_execution_time INTEGER,
    p_status VARCHAR(50)
)
RETURNS VOID AS $$
BEGIN
    UPDATE handler_registry 
    SET 
        usage_count = usage_count + 1,
        success_count = CASE WHEN p_status = 'success' THEN success_count + 1 ELSE success_count END,
        failure_count = CASE WHEN p_status != 'success' THEN failure_count + 1 ELSE failure_count END,
        average_execution_time = CASE 
            WHEN usage_count = 0 THEN p_execution_time
            ELSE ((average_execution_time * usage_count) + p_execution_time) / (usage_count + 1)
        END,
        last_used_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE handler_type = p_handler_type;
END;
$$ LANGUAGE plpgsql;

-- Add comment for the function
COMMENT ON FUNCTION update_handler_statistics IS 'Update handler usage statistics after execution';

-- Create function to get best handler for type
CREATE OR REPLACE FUNCTION get_best_handler(
    p_handler_type VARCHAR(255)
)
RETURNS TABLE (
    handler_type VARCHAR(255),
    handler_name VARCHAR(255),
    handler_class VARCHAR(255),
    handler_path VARCHAR(500),
    version VARCHAR(50),
    priority INTEGER,
    success_rate DECIMAL(5,2),
    average_execution_time INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        hr.handler_type,
        hr.handler_name,
        hr.handler_class,
        hr.handler_path,
        hr.version,
        hr.priority,
        CASE 
            WHEN hr.usage_count > 0 THEN 
                ROUND((hr.success_count::DECIMAL / hr.usage_count) * 100, 2)
            ELSE 0 
        END as success_rate,
        hr.average_execution_time
    FROM handler_registry hr
    WHERE hr.handler_type = p_handler_type 
        AND hr.is_active = true
    ORDER BY 
        hr.is_default DESC,
        hr.priority DESC,
        success_rate DESC,
        hr.average_execution_time ASC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Add comment for the function
COMMENT ON FUNCTION get_best_handler IS 'Get the best available handler for a given type based on priority and performance'; 