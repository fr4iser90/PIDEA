-- Migration: Create analysis_steps table
-- Description: Table for tracking individual analysis steps with status, progress, and results
-- Date: 2024-01-XX

CREATE TABLE IF NOT EXISTS analysis_steps (
  id VARCHAR(255) PRIMARY KEY,
  project_id VARCHAR(255) NOT NULL,
  analysis_type VARCHAR(100) NOT NULL,
  status ENUM('pending', 'running', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
  progress INT DEFAULT 0,
  started_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  error JSON NULL,
  result JSON NULL,
  metadata JSON NULL,
  config JSON NULL,
  timeout INT DEFAULT 300000,
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 2,
  memory_usage BIGINT NULL,
  execution_time BIGINT NULL,
  file_count INT NULL,
  line_count INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes for performance
  INDEX idx_project_id (project_id),
  INDEX idx_analysis_type (analysis_type),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  INDEX idx_completed_at (completed_at),
  INDEX idx_project_analysis_type (project_id, analysis_type),
  INDEX idx_project_status (project_id, status),
  INDEX idx_analysis_type_status (analysis_type, status)
);

-- Add comments for documentation
ALTER TABLE analysis_steps 
  MODIFY COLUMN id VARCHAR(255) COMMENT 'Unique step identifier',
  MODIFY COLUMN project_id VARCHAR(255) COMMENT 'Project identifier',
  MODIFY COLUMN analysis_type VARCHAR(100) COMMENT 'Type of analysis (code-quality, security, performance, architecture)',
  MODIFY COLUMN status ENUM('pending', 'running', 'completed', 'failed', 'cancelled') COMMENT 'Current status of the analysis step',
  MODIFY COLUMN progress INT COMMENT 'Progress percentage (0-100)',
  MODIFY COLUMN started_at TIMESTAMP NULL COMMENT 'When the step started execution',
  MODIFY COLUMN completed_at TIMESTAMP NULL COMMENT 'When the step completed (success or failure)',
  MODIFY COLUMN error JSON NULL COMMENT 'Error information if step failed',
  MODIFY COLUMN result JSON NULL COMMENT 'Analysis result data',
  MODIFY COLUMN metadata JSON NULL COMMENT 'Additional metadata about the step',
  MODIFY COLUMN config JSON NULL COMMENT 'Step configuration',
  MODIFY COLUMN timeout INT COMMENT 'Timeout in milliseconds',
  MODIFY COLUMN retry_count INT COMMENT 'Number of retry attempts',
  MODIFY COLUMN max_retries INT COMMENT 'Maximum number of retry attempts',
  MODIFY COLUMN memory_usage BIGINT NULL COMMENT 'Memory usage in bytes',
  MODIFY COLUMN execution_time BIGINT NULL COMMENT 'Execution time in milliseconds',
  MODIFY COLUMN file_count INT NULL COMMENT 'Number of files processed',
  MODIFY COLUMN line_count INT NULL COMMENT 'Number of lines processed'; 