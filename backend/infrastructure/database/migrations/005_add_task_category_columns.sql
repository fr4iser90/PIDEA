-- Migration: 005_add_task_category_columns.sql
-- Description: Add missing columns to tasks table to match PostgreSQLTaskRepository schema
-- Author: PIDEA System
-- Date: Current

-- Add missing columns to tasks table
ALTER TABLE tasks ADD COLUMN category TEXT;
ALTER TABLE tasks ADD COLUMN parentTaskId TEXT;
ALTER TABLE tasks ADD COLUMN childTaskIds TEXT;
ALTER TABLE tasks ADD COLUMN phase TEXT;
ALTER TABLE tasks ADD COLUMN stage TEXT;
ALTER TABLE tasks ADD COLUMN phaseOrder INTEGER;
ALTER TABLE tasks ADD COLUMN taskLevel INTEGER DEFAULT 0;
ALTER TABLE tasks ADD COLUMN rootTaskId TEXT;
ALTER TABLE tasks ADD COLUMN isPhaseTask BOOLEAN DEFAULT 0;
ALTER TABLE tasks ADD COLUMN progress INTEGER DEFAULT 0;
ALTER TABLE tasks ADD COLUMN phaseProgress TEXT;
ALTER TABLE tasks ADD COLUMN blockedBy TEXT;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category);
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON tasks(parentTaskId);
CREATE INDEX IF NOT EXISTS idx_tasks_phase ON tasks(phase);
CREATE INDEX IF NOT EXISTS idx_tasks_stage ON tasks(stage);
CREATE INDEX IF NOT EXISTS idx_tasks_root_task_id ON tasks(rootTaskId);
CREATE INDEX IF NOT EXISTS idx_tasks_is_phase_task ON tasks(isPhaseTask);
CREATE INDEX IF NOT EXISTS idx_tasks_progress ON tasks(progress);

-- Update existing records to have default values
UPDATE tasks SET 
  category = NULL,
  parentTaskId = NULL,
  childTaskIds = '[]',
  phase = NULL,
  stage = NULL,
  phaseOrder = NULL,
  taskLevel = 0,
  rootTaskId = NULL,
  isPhaseTask = 0,
  progress = 0,
  phaseProgress = '{}',
  blockedBy = '[]'
WHERE category IS NULL; 