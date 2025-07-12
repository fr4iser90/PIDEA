-- Migration: 006_create_migration_metrics.sql
-- Description: Create migration metrics table for storing performance and analytics data
-- Author: PIDEA System
-- Date: Current

-- Create migration metrics table
CREATE TABLE IF NOT EXISTS migration_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    migration_id VARCHAR(255) NOT NULL REFERENCES migration_tracking(migration_id) ON DELETE CASCADE,
    collection_id VARCHAR(255) NOT NULL,
    metric_type VARCHAR(50) NOT NULL, -- 'execution_time', 'memory_usage', 'cpu_usage', 'database_queries', 'file_operations', 'api_calls'
    metric_name VARCHAR(255) NOT NULL,
    metric_value DECIMAL(15,4) NOT NULL,
    metric_unit VARCHAR(20), -- 'ms', 'bytes', 'percent', 'count'
    timestamp TIMESTAMP NOT NULL,
    phase_id VARCHAR(255),
    step_id VARCHAR(255),
    context JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_migration_metrics_migration_id ON migration_metrics(migration_id);
CREATE INDEX IF NOT EXISTS idx_migration_metrics_collection_id ON migration_metrics(collection_id);
CREATE INDEX IF NOT EXISTS idx_migration_metrics_metric_type ON migration_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_migration_metrics_metric_name ON migration_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_migration_metrics_timestamp ON migration_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_migration_metrics_phase_id ON migration_metrics(phase_id);
CREATE INDEX IF NOT EXISTS idx_migration_metrics_step_id ON migration_metrics(step_id);

-- Create composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_migration_metrics_migration_type ON migration_metrics(migration_id, metric_type);
CREATE INDEX IF NOT EXISTS idx_migration_metrics_type_time ON migration_metrics(metric_type, timestamp);
CREATE INDEX IF NOT EXISTS idx_migration_metrics_phase_type ON migration_metrics(phase_id, metric_type);
CREATE INDEX IF NOT EXISTS idx_migration_metrics_step_type ON migration_metrics(step_id, metric_type);

-- Create partial indexes for specific metric types
CREATE INDEX IF NOT EXISTS idx_migration_metrics_execution_time ON migration_metrics(migration_id, metric_value) 
    WHERE metric_type = 'execution_time';
CREATE INDEX IF NOT EXISTS idx_migration_metrics_memory_usage ON migration_metrics(migration_id, metric_value) 
    WHERE metric_type = 'memory_usage';
CREATE INDEX IF NOT EXISTS idx_migration_metrics_cpu_usage ON migration_metrics(migration_id, metric_value) 
    WHERE metric_type = 'cpu_usage';

-- Add comments for documentation
COMMENT ON TABLE migration_metrics IS 'Store performance metrics for migration operations';
COMMENT ON COLUMN migration_metrics.migration_id IS 'Reference to the migration';
COMMENT ON COLUMN migration_metrics.collection_id IS 'Unique identifier for the metrics collection session';
COMMENT ON COLUMN migration_metrics.metric_type IS 'Type of metric being recorded';
COMMENT ON COLUMN migration_metrics.metric_name IS 'Human-readable name of the metric';
COMMENT ON COLUMN migration_metrics.metric_value IS 'Numeric value of the metric';
COMMENT ON COLUMN migration_metrics.metric_unit IS 'Unit of measurement for the metric';
COMMENT ON COLUMN migration_metrics.timestamp IS 'When the metric was recorded';
COMMENT ON COLUMN migration_metrics.phase_id IS 'Reference to the phase (if applicable)';
COMMENT ON COLUMN migration_metrics.step_id IS 'Reference to the step (if applicable)';
COMMENT ON COLUMN migration_metrics.context IS 'Additional context data for the metric';

-- Create migration performance snapshots table
CREATE TABLE IF NOT EXISTS migration_performance_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    migration_id VARCHAR(255) NOT NULL REFERENCES migration_tracking(migration_id) ON DELETE CASCADE,
    collection_id VARCHAR(255) NOT NULL,
    snapshot_timestamp TIMESTAMP NOT NULL,
    execution_time INTEGER, -- milliseconds
    memory_usage BIGINT, -- bytes
    cpu_usage DECIMAL(5,2), -- percentage
    database_queries INTEGER,
    database_query_time INTEGER, -- milliseconds
    file_operations INTEGER,
    file_operation_time INTEGER, -- milliseconds
    api_calls INTEGER,
    api_call_time INTEGER, -- milliseconds
    errors INTEGER DEFAULT 0,
    warnings INTEGER DEFAULT 0,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance snapshots
CREATE INDEX IF NOT EXISTS idx_migration_performance_snapshots_migration_id ON migration_performance_snapshots(migration_id);
CREATE INDEX IF NOT EXISTS idx_migration_performance_snapshots_collection_id ON migration_performance_snapshots(collection_id);
CREATE INDEX IF NOT EXISTS idx_migration_performance_snapshots_timestamp ON migration_performance_snapshots(snapshot_timestamp);

-- Create composite indexes for performance snapshots
CREATE INDEX IF NOT EXISTS idx_migration_performance_snapshots_migration_time ON migration_performance_snapshots(migration_id, snapshot_timestamp);
CREATE INDEX IF NOT EXISTS idx_migration_performance_snapshots_collection_time ON migration_performance_snapshots(collection_id, snapshot_timestamp);

-- Add comments for performance snapshots
COMMENT ON TABLE migration_performance_snapshots IS 'Store performance snapshots for migration monitoring';
COMMENT ON COLUMN migration_performance_snapshots.migration_id IS 'Reference to the migration';
COMMENT ON COLUMN migration_performance_snapshots.collection_id IS 'Reference to the metrics collection session';
COMMENT ON COLUMN migration_performance_snapshots.snapshot_timestamp IS 'When the snapshot was taken';
COMMENT ON COLUMN migration_performance_snapshots.execution_time IS 'Total execution time in milliseconds';
COMMENT ON COLUMN migration_performance_snapshots.memory_usage IS 'Memory usage in bytes';
COMMENT ON COLUMN migration_performance_snapshots.cpu_usage IS 'CPU usage percentage';
COMMENT ON COLUMN migration_performance_snapshots.database_queries IS 'Number of database queries executed';
COMMENT ON COLUMN migration_performance_snapshots.database_query_time IS 'Total database query time in milliseconds';
COMMENT ON COLUMN migration_performance_snapshots.file_operations IS 'Number of file operations performed';
COMMENT ON COLUMN migration_performance_snapshots.file_operation_time IS 'Total file operation time in milliseconds';
COMMENT ON COLUMN migration_performance_snapshots.api_calls IS 'Number of API calls made';
COMMENT ON COLUMN migration_performance_snapshots.api_call_time IS 'Total API call time in milliseconds';
COMMENT ON COLUMN migration_performance_snapshots.errors IS 'Number of errors encountered';
COMMENT ON COLUMN migration_performance_snapshots.warnings IS 'Number of warnings encountered';
COMMENT ON COLUMN migration_performance_snapshots.metadata IS 'Additional metadata for the snapshot';

-- Create migration performance alerts table
CREATE TABLE IF NOT EXISTS migration_performance_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    migration_id VARCHAR(255) NOT NULL REFERENCES migration_tracking(migration_id) ON DELETE CASCADE,
    collection_id VARCHAR(255) NOT NULL,
    alert_type VARCHAR(50) NOT NULL, -- 'threshold_exceeded', 'performance_degradation', 'resource_usage'
    metric_name VARCHAR(255) NOT NULL,
    metric_value DECIMAL(15,4) NOT NULL,
    threshold_value DECIMAL(15,4) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'warning', -- 'info', 'warning', 'error', 'critical'
    message TEXT NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    acknowledged BOOLEAN DEFAULT false,
    acknowledged_at TIMESTAMP,
    acknowledged_by VARCHAR(255),
    context JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance alerts
CREATE INDEX IF NOT EXISTS idx_migration_performance_alerts_migration_id ON migration_performance_alerts(migration_id);
CREATE INDEX IF NOT EXISTS idx_migration_performance_alerts_collection_id ON migration_performance_alerts(collection_id);
CREATE INDEX IF NOT EXISTS idx_migration_performance_alerts_alert_type ON migration_performance_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_migration_performance_alerts_severity ON migration_performance_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_migration_performance_alerts_timestamp ON migration_performance_alerts(timestamp);
CREATE INDEX IF NOT EXISTS idx_migration_performance_alerts_acknowledged ON migration_performance_alerts(acknowledged);

-- Create composite indexes for performance alerts
CREATE INDEX IF NOT EXISTS idx_migration_performance_alerts_migration_severity ON migration_performance_alerts(migration_id, severity);
CREATE INDEX IF NOT EXISTS idx_migration_performance_alerts_type_severity ON migration_performance_alerts(alert_type, severity);
CREATE INDEX IF NOT EXISTS idx_migration_performance_alerts_acknowledged_time ON migration_performance_alerts(acknowledged, timestamp);

-- Add comments for performance alerts
COMMENT ON TABLE migration_performance_alerts IS 'Store performance alerts and threshold violations';
COMMENT ON COLUMN migration_performance_alerts.migration_id IS 'Reference to the migration';
COMMENT ON COLUMN migration_performance_alerts.collection_id IS 'Reference to the metrics collection session';
COMMENT ON COLUMN migration_performance_alerts.alert_type IS 'Type of alert generated';
COMMENT ON COLUMN migration_performance_alerts.metric_name IS 'Name of the metric that triggered the alert';
COMMENT ON COLUMN migration_performance_alerts.metric_value IS 'Actual value of the metric';
COMMENT ON COLUMN migration_performance_alerts.threshold_value IS 'Threshold value that was exceeded';
COMMENT ON COLUMN migration_performance_alerts.severity IS 'Severity level of the alert';
COMMENT ON COLUMN migration_performance_alerts.message IS 'Human-readable alert message';
COMMENT ON COLUMN migration_performance_alerts.timestamp IS 'When the alert was generated';
COMMENT ON COLUMN migration_performance_alerts.acknowledged IS 'Whether the alert has been acknowledged';
COMMENT ON COLUMN migration_performance_alerts.acknowledged_at IS 'When the alert was acknowledged';
COMMENT ON COLUMN migration_performance_alerts.acknowledged_by IS 'Who acknowledged the alert';
COMMENT ON COLUMN migration_performance_alerts.context IS 'Additional context for the alert';

-- Create migration analytics table
CREATE TABLE IF NOT EXISTS migration_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    migration_id VARCHAR(255) NOT NULL REFERENCES migration_tracking(migration_id) ON DELETE CASCADE,
    analytics_type VARCHAR(50) NOT NULL, -- 'performance_summary', 'trend_analysis', 'resource_usage', 'error_analysis'
    analytics_data JSONB NOT NULL,
    calculated_at TIMESTAMP NOT NULL,
    time_range_start TIMESTAMP,
    time_range_end TIMESTAMP,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for migration analytics
CREATE INDEX IF NOT EXISTS idx_migration_analytics_migration_id ON migration_analytics(migration_id);
CREATE INDEX IF NOT EXISTS idx_migration_analytics_analytics_type ON migration_analytics(analytics_type);
CREATE INDEX IF NOT EXISTS idx_migration_analytics_calculated_at ON migration_analytics(calculated_at);

-- Create composite indexes for migration analytics
CREATE INDEX IF NOT EXISTS idx_migration_analytics_migration_type ON migration_analytics(migration_id, analytics_type);
CREATE INDEX IF NOT EXISTS idx_migration_analytics_type_time ON migration_analytics(analytics_type, calculated_at);

-- Add comments for migration analytics
COMMENT ON TABLE migration_analytics IS 'Store calculated analytics and insights for migrations';
COMMENT ON COLUMN migration_analytics.migration_id IS 'Reference to the migration';
COMMENT ON COLUMN migration_analytics.analytics_type IS 'Type of analytics calculated';
COMMENT ON COLUMN migration_analytics.analytics_data IS 'JSON data containing the analytics results';
COMMENT ON COLUMN migration_analytics.calculated_at IS 'When the analytics were calculated';
COMMENT ON COLUMN migration_analytics.time_range_start IS 'Start of the time range for the analytics';
COMMENT ON COLUMN migration_analytics.time_range_end IS 'End of the time range for the analytics';
COMMENT ON COLUMN migration_analytics.metadata IS 'Additional metadata for the analytics';

-- Create view for migration performance summary
CREATE OR REPLACE VIEW migration_performance_summary AS
SELECT 
    mt.migration_id,
    mt.migration_name,
    mt.status,
    mt.start_time,
    mt.end_time,
    mt.duration,
    -- Average memory usage
    ROUND(AVG(mps.memory_usage) / (1024 * 1024), 2) as avg_memory_usage_mb,
    -- Peak memory usage
    ROUND(MAX(mps.memory_usage) / (1024 * 1024), 2) as peak_memory_usage_mb,
    -- Average CPU usage
    ROUND(AVG(mps.cpu_usage), 2) as avg_cpu_usage_percent,
    -- Peak CPU usage
    ROUND(MAX(mps.cpu_usage), 2) as peak_cpu_usage_percent,
    -- Total database queries
    SUM(mps.database_queries) as total_database_queries,
    -- Average database query time
    ROUND(AVG(mps.database_query_time), 2) as avg_database_query_time_ms,
    -- Total file operations
    SUM(mps.file_operations) as total_file_operations,
    -- Average file operation time
    ROUND(AVG(mps.file_operation_time), 2) as avg_file_operation_time_ms,
    -- Total API calls
    SUM(mps.api_calls) as total_api_calls,
    -- Average API call time
    ROUND(AVG(mps.api_call_time), 2) as avg_api_call_time_ms,
    -- Total errors and warnings
    SUM(mps.errors) as total_errors,
    SUM(mps.warnings) as total_warnings,
    -- Performance alerts count
    COUNT(DISTINCT mpa.id) as performance_alerts_count,
    -- Critical alerts count
    COUNT(DISTINCT CASE WHEN mpa.severity = 'critical' THEN mpa.id END) as critical_alerts_count
FROM migration_tracking mt
LEFT JOIN migration_performance_snapshots mps ON mt.migration_id = mps.migration_id
LEFT JOIN migration_performance_alerts mpa ON mt.migration_id = mpa.migration_id
GROUP BY 
    mt.migration_id, mt.migration_name, mt.status, mt.start_time, 
    mt.end_time, mt.duration;

-- Add comment for the view
COMMENT ON VIEW migration_performance_summary IS 'Summary view of migration performance metrics';

-- Create function to calculate migration performance analytics
CREATE OR REPLACE FUNCTION calculate_migration_performance_analytics(
    p_migration_id VARCHAR(255),
    p_analytics_type VARCHAR(50) DEFAULT 'performance_summary'
)
RETURNS JSONB AS $$
DECLARE
    analytics_result JSONB;
BEGIN
    CASE p_analytics_type
        WHEN 'performance_summary' THEN
            SELECT jsonb_build_object(
                'migration_id', mt.migration_id,
                'migration_name', mt.migration_name,
                'status', mt.status,
                'duration_seconds', ROUND(mt.duration::DECIMAL / 1000, 2),
                'memory_usage', jsonb_build_object(
                    'average_mb', ROUND(AVG(mps.memory_usage) / (1024 * 1024), 2),
                    'peak_mb', ROUND(MAX(mps.memory_usage) / (1024 * 1024), 2)
                ),
                'cpu_usage', jsonb_build_object(
                    'average_percent', ROUND(AVG(mps.cpu_usage), 2),
                    'peak_percent', ROUND(MAX(mps.cpu_usage), 2)
                ),
                'database_operations', jsonb_build_object(
                    'total_queries', SUM(mps.database_queries),
                    'average_query_time_ms', ROUND(AVG(mps.database_query_time), 2)
                ),
                'file_operations', jsonb_build_object(
                    'total_operations', SUM(mps.file_operations),
                    'average_operation_time_ms', ROUND(AVG(mps.file_operation_time), 2)
                ),
                'api_operations', jsonb_build_object(
                    'total_calls', SUM(mps.api_calls),
                    'average_call_time_ms', ROUND(AVG(mps.api_call_time), 2)
                ),
                'errors_and_warnings', jsonb_build_object(
                    'total_errors', SUM(mps.errors),
                    'total_warnings', SUM(mps.warnings)
                )
            ) INTO analytics_result
            FROM migration_tracking mt
            LEFT JOIN migration_performance_snapshots mps ON mt.migration_id = mps.migration_id
            WHERE mt.migration_id = p_migration_id
            GROUP BY mt.migration_id, mt.migration_name, mt.status, mt.duration;
            
        WHEN 'trend_analysis' THEN
            SELECT jsonb_build_object(
                'migration_id', p_migration_id,
                'trends', jsonb_agg(
                    jsonb_build_object(
                        'timestamp', mps.snapshot_timestamp,
                        'memory_usage_mb', ROUND(mps.memory_usage / (1024 * 1024), 2),
                        'cpu_usage_percent', mps.cpu_usage,
                        'execution_time_ms', mps.execution_time
                    ) ORDER BY mps.snapshot_timestamp
                )
            ) INTO analytics_result
            FROM migration_performance_snapshots mps
            WHERE mps.migration_id = p_migration_id;
            
        WHEN 'error_analysis' THEN
            SELECT jsonb_build_object(
                'migration_id', p_migration_id,
                'errors', jsonb_agg(
                    jsonb_build_object(
                        'timestamp', mpa.timestamp,
                        'alert_type', mpa.alert_type,
                        'metric_name', mpa.metric_name,
                        'metric_value', mpa.metric_value,
                        'threshold_value', mpa.threshold_value,
                        'severity', mpa.severity,
                        'message', mpa.message
                    ) ORDER BY mpa.timestamp
                )
            ) INTO analytics_result
            FROM migration_performance_alerts mpa
            WHERE mpa.migration_id = p_migration_id;
            
        ELSE
            analytics_result := jsonb_build_object('error', 'Unknown analytics type');
    END CASE;
    
    RETURN analytics_result;
END;
$$ LANGUAGE plpgsql;

-- Add comment for the function
COMMENT ON FUNCTION calculate_migration_performance_analytics IS 'Calculate performance analytics for a migration';

-- Create function to get migration performance statistics
CREATE OR REPLACE FUNCTION get_migration_performance_statistics()
RETURNS TABLE (
    total_migrations INTEGER,
    average_duration_seconds DECIMAL(10,2),
    average_memory_usage_mb DECIMAL(10,2),
    average_cpu_usage_percent DECIMAL(5,2),
    total_database_queries BIGINT,
    total_file_operations BIGINT,
    total_api_calls BIGINT,
    total_errors BIGINT,
    total_warnings BIGINT,
    total_performance_alerts BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT mt.migration_id) as total_migrations,
        ROUND(AVG(mt.duration) / 1000, 2) as average_duration_seconds,
        ROUND(AVG(mps.memory_usage) / (1024 * 1024), 2) as average_memory_usage_mb,
        ROUND(AVG(mps.cpu_usage), 2) as average_cpu_usage_percent,
        SUM(mps.database_queries) as total_database_queries,
        SUM(mps.file_operations) as total_file_operations,
        SUM(mps.api_calls) as total_api_calls,
        SUM(mps.errors) as total_errors,
        SUM(mps.warnings) as total_warnings,
        COUNT(DISTINCT mpa.id) as total_performance_alerts
    FROM migration_tracking mt
    LEFT JOIN migration_performance_snapshots mps ON mt.migration_id = mps.migration_id
    LEFT JOIN migration_performance_alerts mpa ON mt.migration_id = mpa.migration_id;
END;
$$ LANGUAGE plpgsql;

-- Add comment for the function
COMMENT ON FUNCTION get_migration_performance_statistics IS 'Get overall migration performance statistics'; 