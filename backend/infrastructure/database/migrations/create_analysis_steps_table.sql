-- Migration: Create analysis_steps table for individual step tracking
-- Date: 2024-12-19
-- Description: Creates table to track individual analysis steps with progress monitoring

CREATE TABLE IF NOT EXISTS analysis_steps (
  id VARCHAR(255) PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  project_id VARCHAR(255) NOT NULL,
  status ENUM('pending', 'running', 'completed', 'failed') DEFAULT 'pending',
  progress INT DEFAULT 0,
  current_step TEXT,
  start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  end_time TIMESTAMP NULL,
  error TEXT NULL,
  result JSON NULL,
  metadata JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_project_id (project_id),
  INDEX idx_type (type),
  INDEX idx_status (status),
  INDEX idx_start_time (start_time),
  INDEX idx_project_type (project_id, type),
  INDEX idx_project_status (project_id, status)
);

-- Add comments for documentation
ALTER TABLE analysis_steps COMMENT = 'Tracks individual analysis steps with progress monitoring';

-- Insert sample data for testing (optional)
-- INSERT INTO analysis_steps (id, type, project_id, status, progress, current_step) 
-- VALUES ('test_step_1', 'issues', 'test_project', 'completed', 100, 'Analysis completed'); 