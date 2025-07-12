-- PIDEA Database Schema
-- Single-User IDE Management System
-- This application is designed for a single user managing their local IDEs (Cursor, VSCode, etc.)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CORE TABLES (Single User System)
-- ============================================================================

-- SINGLE USER (You - the IDE manager)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT 'me' CHECK (id = 'me'), -- Only one user: YOU
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin', -- You are the admin
    status TEXT NOT NULL DEFAULT 'active',
    metadata TEXT, -- JSON for your settings
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login TEXT
);

-- USER SESSIONS (Your login sessions)
CREATE TABLE IF NOT EXISTS user_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'me',
    access_token_start TEXT NOT NULL, -- First 20 chars of token
    refresh_token TEXT,
    expires_at TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    metadata TEXT, -- JSON for session metadata
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
);

-- PROJECTS (Your local projects)
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    workspace_path TEXT NOT NULL, -- Path on YOUR computer
    ide_type TEXT NOT NULL, -- 'cursor', 'vscode', 'windsurf'
    port INTEGER NOT NULL, -- IDE Port (9222, 9232, etc.)
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'archived', 'deleted'
    metadata TEXT, -- JSON for project-specific settings
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- TASKS (Your tasks for each project)
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL, -- 'feature', 'bug', 'refactor', 'test', 'documentation'
    priority TEXT NOT NULL, -- 'low', 'medium', 'high', 'critical'
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'failed', 'cancelled'
    category TEXT, -- 'analysis', 'generate', 'refactor', 'test', 'deploy'
    metadata TEXT, -- JSON for extended data
    created_by TEXT NOT NULL DEFAULT 'me',
    assigned_to TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TEXT,
    due_date TEXT,
    started_at TEXT,
    estimated_hours REAL,
    actual_hours REAL,
    estimated_duration REAL,
    tags TEXT, -- JSON array
    dependencies TEXT, -- JSON array
    assignee TEXT,
    execution_history TEXT, -- JSON array
    parent_task_id TEXT,
    child_task_ids TEXT, -- JSON array
    phase TEXT,
    stage TEXT,
    phase_order INTEGER,
    task_level INTEGER DEFAULT 0,
    root_task_id TEXT,
    is_phase_task BOOLEAN DEFAULT false,
    progress INTEGER DEFAULT 0,
    phase_progress TEXT, -- JSON object
    blocked_by TEXT, -- JSON array
    FOREIGN KEY (project_id) REFERENCES projects (id),
    FOREIGN KEY (created_by) REFERENCES users (id)
);

-- ============================================================================
-- META-EBENEN TABLES (PIDEA Architecture)
-- ============================================================================

-- FRAMEWORKS (Ebene 2: Strategy and Workflow Selection)
CREATE TABLE IF NOT EXISTS frameworks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL, -- 'analysis', 'generate', 'refactor', 'test', 'deploy'
    description TEXT,
    version TEXT NOT NULL DEFAULT '1.0.0',
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'deprecated', 'experimental'
    capabilities TEXT, -- JSON Array of available capabilities
    configuration TEXT, -- JSON for framework-specific settings
    metadata TEXT, -- JSON for extended data
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- WORKFLOWS (Ebene 1: Step Orchestration)
CREATE TABLE IF NOT EXISTS workflows (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    framework_id TEXT NOT NULL,
    category TEXT NOT NULL, -- 'analysis', 'generate', 'refactor', 'test', 'deploy'
    description TEXT,
    version TEXT NOT NULL DEFAULT '1.0.0',
    status TEXT NOT NULL DEFAULT 'active',
    steps TEXT, -- JSON Array of step configurations
    configuration TEXT, -- JSON for workflow-specific settings
    metadata TEXT, -- JSON for extended data
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (framework_id) REFERENCES frameworks (id)
);

-- STEPS (Ebene 0: Atomic Operations)
CREATE TABLE IF NOT EXISTS steps (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL, -- 'analysis', 'generate', 'refactor', 'test', 'deploy'
    description TEXT,
    version TEXT NOT NULL DEFAULT '1.0.0',
    status TEXT NOT NULL DEFAULT 'active',
    capabilities TEXT, -- JSON Array of available capabilities
    configuration TEXT, -- JSON for step-specific settings
    metadata TEXT, -- JSON for extended data
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- COMMANDS (Application Layer: Business Actions)
CREATE TABLE IF NOT EXISTS commands (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL, -- 'analysis', 'generate', 'refactor', 'test', 'deploy'
    description TEXT,
    version TEXT NOT NULL DEFAULT '1.0.0',
    status TEXT NOT NULL DEFAULT 'active',
    parameters TEXT, -- JSON Schema for parameters
    capabilities TEXT, -- JSON Array of available capabilities
    configuration TEXT, -- JSON for command-specific settings
    metadata TEXT, -- JSON for extended data
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- HANDLERS (Application Layer: Use Case Orchestration)
CREATE TABLE IF NOT EXISTS handlers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL, -- 'analysis', 'generate', 'refactor', 'test', 'deploy'
    description TEXT,
    version TEXT NOT NULL DEFAULT '1.0.0',
    status TEXT NOT NULL DEFAULT 'active',
    command_id TEXT,
    framework_id TEXT,
    capabilities TEXT, -- JSON Array of available capabilities
    configuration TEXT, -- JSON for handler-specific settings
    metadata TEXT, -- JSON for extended data
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (command_id) REFERENCES commands (id),
    FOREIGN KEY (framework_id) REFERENCES frameworks (id)
);

-- ============================================================================
-- IDE AGENTS (Ebene 3: IDE Integration)
-- ============================================================================

-- IDE AGENTS (Your running IDE instances)
CREATE TABLE IF NOT EXISTS ide_agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    ide_type TEXT NOT NULL, -- 'cursor', 'vscode', 'windsurf'
    project_id TEXT NOT NULL,
    port INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'running', -- 'running', 'stopped', 'error'
    workspace_path TEXT NOT NULL,
    capabilities TEXT, -- JSON Array of available capabilities
    configuration TEXT, -- JSON for IDE-specific settings
    metadata TEXT, -- JSON for extended data
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_heartbeat TEXT,
    FOREIGN KEY (project_id) REFERENCES projects (id)
);

-- ============================================================================
-- EXECUTION TABLES (Task and Workflow Execution)
-- ============================================================================

-- TASK EXECUTIONS (Your task runs)
CREATE TABLE IF NOT EXISTS task_executions (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    user_id TEXT NOT NULL DEFAULT 'me',
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed', 'cancelled'
    execution_method TEXT NOT NULL, -- 'unified_workflow', 'core_engine', 'git_workflow', 'legacy'
    framework_id TEXT,
    workflow_id TEXT,
    handler_id TEXT,
    command_id TEXT,
    result TEXT, -- JSON for execution results
    error TEXT, -- JSON for error details
    metadata TEXT, -- JSON for extended data
    started_at TEXT,
    completed_at TEXT,
    duration_ms INTEGER,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks (id),
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (framework_id) REFERENCES frameworks (id),
    FOREIGN KEY (workflow_id) REFERENCES workflows (id),
    FOREIGN KEY (handler_id) REFERENCES handlers (id),
    FOREIGN KEY (command_id) REFERENCES commands (id)
);

-- STEP EXECUTIONS (Individual step runs)
CREATE TABLE IF NOT EXISTS step_executions (
    id TEXT PRIMARY KEY,
    task_execution_id TEXT NOT NULL,
    step_id TEXT NOT NULL,
    workflow_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed', 'skipped'
    result TEXT, -- JSON for step results
    error TEXT, -- JSON for error details
    metadata TEXT, -- JSON for extended data
    started_at TEXT,
    completed_at TEXT,
    duration_ms INTEGER,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_execution_id) REFERENCES task_executions (id),
    FOREIGN KEY (step_id) REFERENCES steps (id),
    FOREIGN KEY (workflow_id) REFERENCES workflows (id)
);

-- EXECUTION HISTORY (Execution tracking)
CREATE TABLE IF NOT EXISTS execution_history (
    id TEXT PRIMARY KEY,
    task_execution_id TEXT NOT NULL,
    action TEXT NOT NULL, -- 'started', 'step_completed', 'step_failed', 'completed', 'cancelled'
    data TEXT, -- JSON for action details
    metadata TEXT, -- JSON for extended data
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_execution_id) REFERENCES task_executions (id)
);

-- ============================================================================
-- RELATIONSHIP TABLES
-- ============================================================================

-- TASK DEPENDENCIES (Task relationships)
CREATE TABLE IF NOT EXISTS task_dependencies (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    dependency_id TEXT NOT NULL,
    type TEXT NOT NULL, -- 'blocks', 'requires', 'related'
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks (id),
    FOREIGN KEY (dependency_id) REFERENCES tasks (id)
);

-- FRAMEWORK DEPENDENCIES (Framework relationships)
CREATE TABLE IF NOT EXISTS framework_dependencies (
    id TEXT PRIMARY KEY,
    framework_id TEXT NOT NULL,
    dependency_id TEXT NOT NULL,
    type TEXT NOT NULL, -- 'requires', 'optional', 'conflicts'
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (framework_id) REFERENCES frameworks (id),
    FOREIGN KEY (dependency_id) REFERENCES frameworks (id)
);

-- WORKFLOW STEPS (Workflow-step relationships)
CREATE TABLE IF NOT EXISTS workflow_steps (
    id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL,
    step_id TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    configuration TEXT, -- JSON for step-specific configuration in workflow
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workflow_id) REFERENCES workflows (id),
    FOREIGN KEY (step_id) REFERENCES steps (id)
);

-- ============================================================================
-- REGISTRY TABLES (Modular Management)
-- ============================================================================

-- REGISTRIES (For modular management)
CREATE TABLE IF NOT EXISTS registries (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL, -- 'command', 'handler', 'step', 'workflow', 'framework'
    type TEXT NOT NULL, -- 'command', 'handler', 'step', 'workflow', 'framework'
    status TEXT NOT NULL DEFAULT 'active',
    configuration TEXT, -- JSON for registry-specific settings
    metadata TEXT, -- JSON for extended data
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- REGISTRY ITEMS (Dynamic registration)
CREATE TABLE IF NOT EXISTS registry_items (
    id TEXT PRIMARY KEY,
    registry_id TEXT NOT NULL,
    item_id TEXT NOT NULL, -- Reference to commands.id, handlers.id, etc.
    item_type TEXT NOT NULL, -- 'command', 'handler', 'step', 'workflow', 'framework'
    category TEXT NOT NULL, -- 'analysis', 'generate', 'refactor', 'test', 'deploy'
    status TEXT NOT NULL DEFAULT 'active',
    priority INTEGER DEFAULT 0,
    configuration TEXT, -- JSON for item-specific settings
    metadata TEXT, -- JSON for extended data
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (registry_id) REFERENCES registries (id)
);

-- ============================================================================
-- CONFIGURATION TABLES
-- ============================================================================

-- PROJECT CONFIGURATIONS (Your project settings)
CREATE TABLE IF NOT EXISTS project_configurations (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'string', -- 'string', 'number', 'boolean', 'json'
    description TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects (id),
    UNIQUE(project_id, key)
);

-- GLOBAL CONFIGURATIONS (System-wide settings)
CREATE TABLE IF NOT EXISTS global_configurations (
    id TEXT PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'string', -- 'string', 'number', 'boolean', 'json'
    description TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- ANALYTICS & MONITORING TABLES
-- ============================================================================

-- PERFORMANCE METRICS (Execution metrics)
CREATE TABLE IF NOT EXISTS performance_metrics (
    id TEXT PRIMARY KEY,
    task_execution_id TEXT,
    metric_name TEXT NOT NULL, -- 'execution_time', 'memory_usage', 'cpu_usage'
    metric_value REAL NOT NULL,
    unit TEXT NOT NULL, -- 'ms', 'MB', '%'
    metadata TEXT, -- JSON for extended data
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_execution_id) REFERENCES task_executions (id)
);

-- SYSTEM HEALTH (System monitoring)
CREATE TABLE IF NOT EXISTS system_health (
    id TEXT PRIMARY KEY,
    component TEXT NOT NULL, -- 'database', 'ide_agent', 'framework', 'workflow'
    status TEXT NOT NULL, -- 'healthy', 'warning', 'error', 'critical'
    message TEXT,
    metadata TEXT, -- JSON for extended data
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Task indexes
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);

-- Framework indexes
CREATE INDEX IF NOT EXISTS idx_frameworks_category ON frameworks(category);
CREATE INDEX IF NOT EXISTS idx_frameworks_status ON frameworks(status);

-- Workflow indexes
CREATE INDEX IF NOT EXISTS idx_workflows_framework_id ON workflows(framework_id);
CREATE INDEX IF NOT EXISTS idx_workflows_category ON workflows(category);

-- Step indexes
CREATE INDEX IF NOT EXISTS idx_steps_category ON steps(category);
CREATE INDEX IF NOT EXISTS idx_steps_status ON steps(status);

-- Command indexes
CREATE INDEX IF NOT EXISTS idx_commands_category ON commands(category);
CREATE INDEX IF NOT EXISTS idx_commands_status ON commands(status);

-- Handler indexes
CREATE INDEX IF NOT EXISTS idx_handlers_category ON handlers(category);
CREATE INDEX IF NOT EXISTS idx_handlers_command_id ON handlers(command_id);
CREATE INDEX IF NOT EXISTS idx_handlers_framework_id ON handlers(framework_id);

-- IDE Agent indexes
CREATE INDEX IF NOT EXISTS idx_ide_agents_project_id ON ide_agents(project_id);
CREATE INDEX IF NOT EXISTS idx_ide_agents_ide_type ON ide_agents(ide_type);
CREATE INDEX IF NOT EXISTS idx_ide_agents_status ON ide_agents(status);

-- Task Execution indexes
CREATE INDEX IF NOT EXISTS idx_task_executions_task_id ON task_executions(task_id);
CREATE INDEX IF NOT EXISTS idx_task_executions_status ON task_executions(status);
CREATE INDEX IF NOT EXISTS idx_task_executions_created_at ON task_executions(created_at);

-- Step Execution indexes
CREATE INDEX IF NOT EXISTS idx_step_executions_task_execution_id ON step_executions(task_execution_id);
CREATE INDEX IF NOT EXISTS idx_step_executions_status ON step_executions(status);

-- Registry indexes
CREATE INDEX IF NOT EXISTS idx_registry_items_registry_id ON registry_items(registry_id);
CREATE INDEX IF NOT EXISTS idx_registry_items_category ON registry_items(category);

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Insert default user (YOU)
INSERT OR IGNORE INTO users (id, email, username, password_hash, role, status) 
VALUES ('me', 'admin@pidea.local', 'admin', 'default_hash_change_me', 'admin', 'active');

-- Insert default global configurations
INSERT OR IGNORE INTO global_configurations (key, value, type, description) VALUES
('system_name', 'PIDEA', 'string', 'System name'),
('system_version', '1.0.0', 'string', 'System version'),
('default_ide_port_start', '9222', 'number', 'Default starting port for IDE detection'),
('max_concurrent_executions', '5', 'number', 'Maximum concurrent task executions'),
('auto_cleanup_days', '30', 'number', 'Days to keep execution history'),
('enable_analytics', 'true', 'boolean', 'Enable performance analytics'),
('log_level', 'info', 'string', 'System log level');

-- ============================================================================
-- COMMENTS
-- ============================================================================

-- This is the PIDEA database schema for single-user IDE management
-- All tables are designed for one user managing multiple IDEs and projects
-- The meta-ebenen architecture supports: Commands -> Handlers -> Frameworks -> Workflows -> Steps
-- Each level has its own capabilities and can be dynamically registered via registries
