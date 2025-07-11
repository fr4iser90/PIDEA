-- Migration: 003_create_workflow_metrics.sql
-- Description: Create workflow metrics table for tracking performance and resource usage
-- Author: PIDEA System
-- Date: Current

-- Create workflow metrics table
CREATE TABLE IF NOT EXISTS workflow_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id VARCHAR(255) REFERENCES workflow_executions(execution_id) ON DELETE CASCADE,
    metric_name VARCHAR(255) NOT NULL,
    metric_value DECIMAL(15,4),
    metric_unit VARCHAR(50),
    metric_type VARCHAR(50), -- 'performance', 'resource', 'quality', 'business'
    metric_category VARCHAR(100), -- 'execution_time', 'memory_usage', 'cpu_usage', 'error_rate', etc.
    metadata JSONB,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_workflow_metrics_execution_id ON workflow_metrics(execution_id);
CREATE INDEX IF NOT EXISTS idx_workflow_metrics_metric_name ON workflow_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_workflow_metrics_metric_type ON workflow_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_workflow_metrics_metric_category ON workflow_metrics(metric_category);
CREATE INDEX IF NOT EXISTS idx_workflow_metrics_recorded_at ON workflow_metrics(recorded_at);

-- Create composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_workflow_metrics_execution_type ON workflow_metrics(execution_id, metric_type);
CREATE INDEX IF NOT EXISTS idx_workflow_metrics_name_type ON workflow_metrics(metric_name, metric_type);
CREATE INDEX IF NOT EXISTS idx_workflow_metrics_category_type ON workflow_metrics(metric_category, metric_type);

-- Create partial indexes for specific metric types
CREATE INDEX IF NOT EXISTS idx_workflow_metrics_performance ON workflow_metrics(execution_id, metric_value) 
    WHERE metric_type = 'performance';
CREATE INDEX IF NOT EXISTS idx_workflow_metrics_resource ON workflow_metrics(execution_id, metric_value) 
    WHERE metric_type = 'resource';
CREATE INDEX IF NOT EXISTS idx_workflow_metrics_quality ON workflow_metrics(execution_id, metric_value) 
    WHERE metric_type = 'quality';

-- Add comments for documentation
COMMENT ON TABLE workflow_metrics IS 'Tracks detailed metrics for workflow executions';
COMMENT ON COLUMN workflow_metrics.execution_id IS 'Reference to workflow execution';
COMMENT ON COLUMN workflow_metrics.metric_name IS 'Name of the metric being recorded';
COMMENT ON COLUMN workflow_metrics.metric_value IS 'Numeric value of the metric';
COMMENT ON COLUMN workflow_metrics.metric_unit IS 'Unit of measurement (ms, MB, %, etc.)';
COMMENT ON COLUMN workflow_metrics.metric_type IS 'Type of metric: performance, resource, quality, business';
COMMENT ON COLUMN workflow_metrics.metric_category IS 'Category within the metric type';
COMMENT ON COLUMN workflow_metrics.metadata IS 'Additional metadata about the metric';
COMMENT ON COLUMN workflow_metrics.recorded_at IS 'Timestamp when metric was recorded';

-- Create view for aggregated metrics
CREATE OR REPLACE VIEW workflow_metrics_summary AS
SELECT 
    execution_id,
    metric_type,
    metric_category,
    COUNT(*) as metric_count,
    AVG(metric_value) as average_value,
    MIN(metric_value) as min_value,
    MAX(metric_value) as max_value,
    SUM(metric_value) as total_value,
    STDDEV(metric_value) as standard_deviation
FROM workflow_metrics
GROUP BY execution_id, metric_type, metric_category;

-- Add comment for the view
COMMENT ON VIEW workflow_metrics_summary IS 'Aggregated view of workflow metrics for analysis';

-- Create function to get metrics statistics
CREATE OR REPLACE FUNCTION get_workflow_metrics_stats(
    p_execution_id VARCHAR(255) DEFAULT NULL,
    p_metric_type VARCHAR(50) DEFAULT NULL,
    p_start_date TIMESTAMP DEFAULT NULL,
    p_end_date TIMESTAMP DEFAULT NULL
)
RETURNS TABLE (
    metric_name VARCHAR(255),
    metric_type VARCHAR(50),
    metric_category VARCHAR(100),
    total_count BIGINT,
    average_value DECIMAL(15,4),
    min_value DECIMAL(15,4),
    max_value DECIMAL(15,4),
    total_value DECIMAL(15,4)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        wm.metric_name,
        wm.metric_type,
        wm.metric_category,
        COUNT(*) as total_count,
        AVG(wm.metric_value) as average_value,
        MIN(wm.metric_value) as min_value,
        MAX(wm.metric_value) as max_value,
        SUM(wm.metric_value) as total_value
    FROM workflow_metrics wm
    WHERE (p_execution_id IS NULL OR wm.execution_id = p_execution_id)
        AND (p_metric_type IS NULL OR wm.metric_type = p_metric_type)
        AND (p_start_date IS NULL OR wm.recorded_at >= p_start_date)
        AND (p_end_date IS NULL OR wm.recorded_at <= p_end_date)
    GROUP BY wm.metric_name, wm.metric_type, wm.metric_category
    ORDER BY wm.metric_name, wm.metric_type, wm.metric_category;
END;
$$ LANGUAGE plpgsql;

-- Add comment for the function
COMMENT ON FUNCTION get_workflow_metrics_stats IS 'Get aggregated statistics for workflow metrics with optional filtering'; 