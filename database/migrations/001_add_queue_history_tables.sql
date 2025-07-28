-- Migration: 001_add_queue_history_tables
-- Description: Adds queue_history and workflow_type_detection tables
-- Created: 2025-07-28T13:07:17.000Z
-- Status: Pending

-- Queue History Table
CREATE TABLE IF NOT EXISTS queue_history (
  id TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL,
  workflow_type TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB, -- JSON for extended data
  steps_data JSONB, -- JSON for step execution data
  execution_time_ms INTEGER,
  error_message TEXT,
  created_by TEXT NOT NULL DEFAULT 'me',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Workflow Type Detection Table
CREATE TABLE IF NOT EXISTS workflow_type_detection (
  id TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL,
  detected_type TEXT NOT NULL,
  confidence REAL NOT NULL,
  analysis_method TEXT NOT NULL,
  step_analysis JSONB, -- JSON for step analysis data
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for queue_history
CREATE INDEX IF NOT EXISTS idx_queue_history_workflow_id ON queue_history(workflow_id);
CREATE INDEX IF NOT EXISTS idx_queue_history_workflow_type ON queue_history(workflow_type);
CREATE INDEX IF NOT EXISTS idx_queue_history_status ON queue_history(status);
CREATE INDEX IF NOT EXISTS idx_queue_history_created_at ON queue_history(created_at);
CREATE INDEX IF NOT EXISTS idx_queue_history_created_by ON queue_history(created_by);
CREATE INDEX IF NOT EXISTS idx_queue_history_completed_at ON queue_history(completed_at);
CREATE INDEX IF NOT EXISTS idx_queue_history_type_status ON queue_history(workflow_type, status);
CREATE INDEX IF NOT EXISTS idx_queue_history_created_by_status ON queue_history(created_by, status);
CREATE INDEX IF NOT EXISTS idx_queue_history_created_at_status ON queue_history(created_at, status);

-- Indexes for workflow_type_detection
CREATE INDEX IF NOT EXISTS idx_workflow_type_detection_workflow_id ON workflow_type_detection(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_type_detection_type ON workflow_type_detection(detected_type);
CREATE INDEX IF NOT EXISTS idx_workflow_type_detection_confidence ON workflow_type_detection(confidence);
CREATE INDEX IF NOT EXISTS idx_workflow_type_detection_created_at ON workflow_type_detection(created_at);

-- Migration completed
-- Status: Applied
-- Applied: 2025-07-28T13:07:17.000Z 