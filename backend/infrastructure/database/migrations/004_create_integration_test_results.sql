-- Migration: Create Integration Test Results Table
-- Version: 004
-- Description: Creates table for storing integration test results and metrics

-- Create integration_test_results table
CREATE TABLE IF NOT EXISTS integration_test_results (
    id VARCHAR(36) PRIMARY KEY,
    test_id VARCHAR(255) NOT NULL,
    suite_name VARCHAR(100) NOT NULL,
    test_name VARCHAR(255) NOT NULL,
    test_type ENUM('system', 'handler', 'step', 'performance', 'e2e', 'custom') NOT NULL,
    status ENUM('pending', 'running', 'passed', 'failed', 'skipped', 'timeout') NOT NULL DEFAULT 'pending',
    success BOOLEAN NOT NULL DEFAULT FALSE,
    duration_ms INT NOT NULL DEFAULT 0,
    retries INT NOT NULL DEFAULT 0,
    error_message TEXT,
    error_stack TEXT,
    result_data JSON,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_test_id (test_id),
    INDEX idx_suite_name (suite_name),
    INDEX idx_test_type (test_type),
    INDEX idx_status (status),
    INDEX idx_success (success),
    INDEX idx_created_at (created_at)
);

-- Create integration_metrics table
CREATE TABLE IF NOT EXISTS integration_metrics (
    id VARCHAR(36) PRIMARY KEY,
    integration_id VARCHAR(255) NOT NULL,
    metric_type ENUM('performance', 'error', 'health', 'custom') NOT NULL,
    metric_name VARCHAR(255) NOT NULL,
    metric_value DECIMAL(15,4),
    metric_unit VARCHAR(50),
    metric_data JSON,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_integration_id (integration_id),
    INDEX idx_metric_type (metric_type),
    INDEX idx_metric_name (metric_name),
    INDEX idx_timestamp (timestamp)
);

-- Create integration_health_checks table
CREATE TABLE IF NOT EXISTS integration_health_checks (
    id VARCHAR(36) PRIMARY KEY,
    component_type VARCHAR(100) NOT NULL,
    component_name VARCHAR(255) NOT NULL,
    health_status ENUM('healthy', 'degraded', 'unhealthy', 'unknown') NOT NULL,
    health_data JSON,
    last_check_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_component_type (component_type),
    INDEX idx_component_name (component_name),
    INDEX idx_health_status (health_status),
    INDEX idx_last_check_at (last_check_at)
);

-- Create integration_reports table
CREATE TABLE IF NOT EXISTS integration_reports (
    id VARCHAR(36) PRIMARY KEY,
    report_type ENUM('summary', 'detailed', 'diagnostic', 'performance', 'custom') NOT NULL,
    report_name VARCHAR(255) NOT NULL,
    report_data JSON NOT NULL,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_report_type (report_type),
    INDEX idx_report_name (report_name),
    INDEX idx_generated_at (generated_at)
);

-- Create integration_configurations table
CREATE TABLE IF NOT EXISTS integration_configurations (
    id VARCHAR(36) PRIMARY KEY,
    config_name VARCHAR(255) NOT NULL UNIQUE,
    config_type ENUM('manager', 'validator', 'metrics', 'test_runner', 'system') NOT NULL,
    config_data JSON NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_config_name (config_name),
    INDEX idx_config_type (config_type),
    INDEX idx_is_active (is_active)
);

-- Insert default integration configuration
INSERT INTO integration_configurations (id, config_name, config_type, config_data) VALUES 
(
    UUID(),
    'default_integration_config',
    'system',
    JSON_OBJECT(
        'manager', JSON_OBJECT(
            'enableRealTimeMonitoring', true,
            'enableErrorRecovery', true,
            'maxConcurrentIntegrations', 10
        ),
        'validator', JSON_OBJECT(
            'enableStrictValidation', true,
            'maxRequestSize', 1048576,
            'enableSecurityValidation', true,
            'allowedIntegrationTypes', JSON_ARRAY('workflow', 'handler', 'step', 'system'),
            'allowedComponentTypes', JSON_ARRAY('handler', 'step', 'service')
        ),
        'metrics', JSON_OBJECT(
            'enableRealTimeMetrics', true,
            'enableHistoricalMetrics', true,
            'maxHistorySize', 10000,
            'metricsRetentionHours', 24,
            'enablePerformanceMetrics', true,
            'enableErrorMetrics', true,
            'enableHealthMetrics', true
        ),
        'testRunner', JSON_OBJECT(
            'enableSystemTests', true,
            'enableHandlerTests', true,
            'enablePerformanceTests', true,
            'enableE2ETests', true,
            'testTimeout', 30000,
            'maxConcurrentTests', 5,
            'enableTestRetries', true,
            'maxRetries', 3,
            'enableDetailedReporting', true
        )
    )
);

-- Create views for easier querying
CREATE OR REPLACE VIEW v_integration_test_summary AS
SELECT 
    suite_name,
    test_type,
    COUNT(*) as total_tests,
    SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as passed_tests,
    SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed_tests,
    AVG(duration_ms) as avg_duration_ms,
    MAX(duration_ms) as max_duration_ms,
    MIN(duration_ms) as min_duration_ms,
    AVG(retries) as avg_retries,
    MAX(created_at) as last_test_run
FROM integration_test_results
GROUP BY suite_name, test_type;

CREATE OR REPLACE VIEW v_integration_health_summary AS
SELECT 
    component_type,
    COUNT(*) as total_components,
    SUM(CASE WHEN health_status = 'healthy' THEN 1 ELSE 0 END) as healthy_components,
    SUM(CASE WHEN health_status = 'degraded' THEN 1 ELSE 0 END) as degraded_components,
    SUM(CASE WHEN health_status = 'unhealthy' THEN 1 ELSE 0 END) as unhealthy_components,
    MAX(last_check_at) as last_health_check
FROM integration_health_checks
GROUP BY component_type;

CREATE OR REPLACE VIEW v_integration_performance_metrics AS
SELECT 
    integration_id,
    metric_name,
    AVG(metric_value) as avg_value,
    MAX(metric_value) as max_value,
    MIN(metric_value) as min_value,
    COUNT(*) as measurement_count,
    MAX(timestamp) as last_measurement
FROM integration_metrics
WHERE metric_type = 'performance'
GROUP BY integration_id, metric_name;

-- Create stored procedures for common operations
DELIMITER //

CREATE PROCEDURE sp_cleanup_old_integration_data(IN days_to_keep INT)
BEGIN
    DECLARE cutoff_date TIMESTAMP;
    SET cutoff_date = DATE_SUB(NOW(), INTERVAL days_to_keep DAY);
    
    -- Cleanup old test results
    DELETE FROM integration_test_results 
    WHERE created_at < cutoff_date;
    
    -- Cleanup old metrics
    DELETE FROM integration_metrics 
    WHERE timestamp < cutoff_date;
    
    -- Cleanup old health checks (keep last 7 days)
    DELETE FROM integration_health_checks 
    WHERE last_check_at < DATE_SUB(NOW(), INTERVAL 7 DAY);
    
    -- Cleanup old reports (keep last 30 days)
    DELETE FROM integration_reports 
    WHERE generated_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
END //

CREATE PROCEDURE sp_get_integration_diagnostics()
BEGIN
    SELECT 
        'test_results' as table_name,
        COUNT(*) as record_count,
        MAX(created_at) as last_record
    FROM integration_test_results
    UNION ALL
    SELECT 
        'metrics' as table_name,
        COUNT(*) as record_count,
        MAX(timestamp) as last_record
    FROM integration_metrics
    UNION ALL
    SELECT 
        'health_checks' as table_name,
        COUNT(*) as record_count,
        MAX(last_check_at) as last_record
    FROM integration_health_checks
    UNION ALL
    SELECT 
        'reports' as table_name,
        COUNT(*) as record_count,
        MAX(generated_at) as last_record
    FROM integration_reports;
END //

DELIMITER ;

-- Create triggers for data integrity
DELIMITER //

CREATE TRIGGER tr_integration_test_results_before_insert
BEFORE INSERT ON integration_test_results
FOR EACH ROW
BEGIN
    IF NEW.id IS NULL THEN
        SET NEW.id = UUID();
    END IF;
    
    IF NEW.test_id IS NULL OR NEW.test_id = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'test_id cannot be null or empty';
    END IF;
    
    IF NEW.suite_name IS NULL OR NEW.suite_name = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'suite_name cannot be null or empty';
    END IF;
    
    IF NEW.test_name IS NULL OR NEW.test_name = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'test_name cannot be null or empty';
    END IF;
END //

CREATE TRIGGER tr_integration_metrics_before_insert
BEFORE INSERT ON integration_metrics
FOR EACH ROW
BEGIN
    IF NEW.id IS NULL THEN
        SET NEW.id = UUID();
    END IF;
    
    IF NEW.integration_id IS NULL OR NEW.integration_id = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'integration_id cannot be null or empty';
    END IF;
    
    IF NEW.metric_name IS NULL OR NEW.metric_name = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'metric_name cannot be null or empty';
    END IF;
END //

CREATE TRIGGER tr_integration_health_checks_before_insert
BEFORE INSERT ON integration_health_checks
FOR EACH ROW
BEGIN
    IF NEW.id IS NULL THEN
        SET NEW.id = UUID();
    END IF;
    
    IF NEW.component_type IS NULL OR NEW.component_type = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'component_type cannot be null or empty';
    END IF;
    
    IF NEW.component_name IS NULL OR NEW.component_name = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'component_name cannot be null or empty';
    END IF;
END //

DELIMITER ;

-- Add comments for documentation
ALTER TABLE integration_test_results COMMENT = 'Stores integration test results and execution metrics';
ALTER TABLE integration_metrics COMMENT = 'Stores performance and operational metrics for integrations';
ALTER TABLE integration_health_checks COMMENT = 'Stores health check results for integration components';
ALTER TABLE integration_reports COMMENT = 'Stores generated integration reports and summaries';
ALTER TABLE integration_configurations COMMENT = 'Stores integration system configurations';

-- Grant permissions (adjust as needed for your environment)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON integration_test_results TO 'pidea_user'@'localhost';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON integration_metrics TO 'pidea_user'@'localhost';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON integration_health_checks TO 'pidea_user'@'localhost';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON integration_reports TO 'pidea_user'@'localhost';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON integration_configurations TO 'pidea_user'@'localhost';
-- GRANT EXECUTE ON PROCEDURE sp_cleanup_old_integration_data TO 'pidea_user'@'localhost';
-- GRANT EXECUTE ON PROCEDURE sp_get_integration_diagnostics TO 'pidea_user'@'localhost'; 