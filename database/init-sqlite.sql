-- PIDEA Database Schema - SQLite Version
-- Single-User IDE Management System
-- This application is designed for a single user managing their local IDEs (Cursor, VSCode, etc.)

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
    access_token_hash TEXT, -- SHA-256 hash of full access token for secure validation
    refresh_token TEXT,
    expires_at DATETIME NOT NULL, -- Enterprise: Proper datetime for SQLite
    is_active BOOLEAN NOT NULL DEFAULT true,
    metadata TEXT, -- JSON for session metadata
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
);

-- PROJECTS (Your local projects) - EXTENDED VERSION
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    workspace_path TEXT NOT NULL, -- Path on YOUR computer
    type TEXT NOT NULL DEFAULT 'development', -- 'development', 'documentation', 'testing', 'deployment'
    
    -- IDE Configuration
    ide_type TEXT NOT NULL DEFAULT 'cursor', -- 'cursor', 'vscode', 'windsurf'
    ide_port INTEGER, -- IDE Port (9222, 9232, etc.)
    ide_status TEXT DEFAULT 'inactive', -- 'active', 'inactive', 'starting', 'error'
    
    -- Development Server Configuration
    backend_port INTEGER, -- Backend development server port
    frontend_port INTEGER, -- Frontend development server port
    database_port INTEGER, -- Database port if applicable
    
    -- Startup Configuration
    start_command TEXT, -- npm start, yarn dev, etc.
    build_command TEXT, -- npm run build, yarn build, etc.
    dev_command TEXT, -- npm run dev, yarn dev, etc.
    test_command TEXT, -- npm test, yarn test, etc.
    
    -- Project Metadata
    framework TEXT, -- 'react', 'vue', 'angular', 'node', 'python', etc.
    language TEXT, -- 'javascript', 'typescript', 'python', 'java', etc.
    package_manager TEXT, -- 'npm', 'yarn', 'pnpm', 'pip', etc.
    
    -- Status and Management
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'archived', 'deleted'
    priority INTEGER DEFAULT 0, -- Project priority (0-10)
    last_accessed TEXT, -- Last time project was opened
    access_count INTEGER DEFAULT 0, -- How many times project was accessed
    
    -- Extended Metadata
    metadata TEXT, -- JSON for additional project-specific settings
    config TEXT, -- JSON for project configuration (ports, commands, etc.)
    
    -- Timestamps
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT NOT NULL DEFAULT 'me',
    FOREIGN KEY (created_by) REFERENCES users (id)
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
    actual_hours REAL,
    estimated_time INTEGER, -- Estimated time in minutes
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
-- ANALYSIS TABLES
-- ============================================================================

-- ANALYSIS (Unified analysis table - replaces analysis_results, analysis_steps, project_analysis, task_suggestions)
CREATE TABLE IF NOT EXISTS analysis (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    analysis_type TEXT NOT NULL, -- 'security', 'code-quality', 'performance', 'architecture', 'layer-violations'
    status TEXT DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed', 'cancelled'
    progress INTEGER DEFAULT 0,
    started_at TEXT,
    completed_at TEXT,
    error TEXT, -- JSON error information
    result TEXT, -- JSON analysis result data (INCLUDES recommendations!)
    metadata TEXT, -- JSON additional metadata
    config TEXT, -- JSON step configuration
    timeout INTEGER DEFAULT 300000,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 2,
    memory_usage INTEGER, -- Memory usage in bytes
    execution_time INTEGER, -- Execution time in milliseconds
    file_count INTEGER, -- Number of files processed
    line_count INTEGER, -- Number of lines processed
    overall_score REAL, -- 0-100 score
    critical_issues_count INTEGER DEFAULT 0,
    warnings_count INTEGER DEFAULT 0,
    recommendations_count INTEGER DEFAULT 0, -- Quick count
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects (id)
);

-- ============================================================================
-- CHAT SYSTEM TABLES
-- ============================================================================

-- CHAT SESSIONS (Your chat conversations)
CREATE TABLE IF NOT EXISTS chat_sessions (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    title TEXT NOT NULL,
    session_type TEXT NOT NULL DEFAULT 'general', -- 'general', 'analysis', 'refactoring', 'debugging'
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'archived', 'deleted'
    metadata TEXT, -- JSON for session metadata
    created_by TEXT NOT NULL DEFAULT 'me',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_message_at TEXT,
    message_count INTEGER DEFAULT 0,
    FOREIGN KEY (project_id) REFERENCES projects (id),
    FOREIGN KEY (created_by) REFERENCES users (id)
);

-- CHAT MESSAGES (Your chat messages)
CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    sender_type TEXT NOT NULL, -- 'user', 'assistant', 'system'
    content TEXT NOT NULL,
    message_type TEXT NOT NULL DEFAULT 'text', -- 'text', 'code', 'file', 'command'
    metadata TEXT, -- JSON for message metadata
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES chat_sessions (id) ON DELETE CASCADE
);

-- ============================================================================
-- WORKFLOW TABLES
-- ============================================================================

-- WORKFLOWS (Your automated workflows)
CREATE TABLE IF NOT EXISTS workflows (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    project_id TEXT,
    workflow_type TEXT NOT NULL, -- 'analysis', 'refactoring', 'testing', 'deployment'
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'inactive', 'archived'
    config TEXT NOT NULL, -- JSON workflow configuration
    metadata TEXT, -- JSON for workflow metadata
    created_by TEXT NOT NULL DEFAULT 'me',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_executed_at TEXT,
    execution_count INTEGER DEFAULT 0,
    FOREIGN KEY (project_id) REFERENCES projects (id),
    FOREIGN KEY (created_by) REFERENCES users (id)
);

-- WORKFLOW EXECUTIONS (Your workflow run history)
CREATE TABLE IF NOT EXISTS workflow_executions (
    id TEXT PRIMARY KEY,
    execution_id TEXT UNIQUE NOT NULL,
    workflow_id TEXT NOT NULL,
    workflow_name TEXT,
    workflow_version TEXT DEFAULT '1.0.0',
    project_id TEXT,
    task_id TEXT,
    user_id TEXT NOT NULL DEFAULT 'me',
    status TEXT NOT NULL, -- 'pending', 'running', 'completed', 'failed', 'cancelled'
    strategy TEXT,
    priority INTEGER DEFAULT 1,
    estimated_time INTEGER, -- Estimated time in minutes
    actual_duration INTEGER, -- Actual duration in milliseconds
    start_time TEXT NOT NULL,
    end_time TEXT,
    result_data TEXT, -- JSON execution results
    error_message TEXT,
    metadata TEXT, -- JSON for execution metadata
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workflow_id) REFERENCES workflows (id),
    FOREIGN KEY (project_id) REFERENCES projects (id),
    FOREIGN KEY (user_id) REFERENCES users (id)
);

-- ============================================================================
-- TASK MANAGEMENT TABLES
-- ============================================================================

-- TASK TEMPLATES (Reusable task templates)
CREATE TABLE IF NOT EXISTS task_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL, -- 'feature', 'bug', 'refactor', 'test', 'documentation'
    default_priority TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    estimated_time INTEGER, -- Estimated time in minutes
    tags TEXT, -- JSON array of tags
    content TEXT, -- Template content/description
    variables TEXT, -- JSON array of template variables
    metadata TEXT, -- JSON for template metadata
    is_active BOOLEAN NOT NULL DEFAULT true,
    version TEXT DEFAULT '1.0.0',
    created_by TEXT NOT NULL DEFAULT 'me',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users (id)
);

-- TASK SUGGESTIONS (AI-generated task suggestions)
CREATE TABLE IF NOT EXISTS task_suggestions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    task_type TEXT NOT NULL, -- 'feature', 'bug', 'refactor', 'test', 'documentation'
    priority TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    estimated_time INTEGER, -- Estimated time in minutes
    tags TEXT, -- JSON array of tags
    confidence REAL DEFAULT 0.0, -- AI confidence score (0-1)
    reasoning TEXT, -- AI reasoning for suggestion
    context TEXT, -- Context information
    project_path TEXT, -- Project path where suggestion applies
    metadata TEXT, -- JSON for suggestion metadata
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'applied'
    is_approved BOOLEAN DEFAULT false,
    is_rejected BOOLEAN DEFAULT false,
    applied_at TEXT, -- When suggestion was applied
    applied_by TEXT, -- Who applied the suggestion
    ai_model TEXT, -- AI model used for generation
    ai_response TEXT, -- Full AI response
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (applied_by) REFERENCES users (id)
);

-- TASK SESSIONS (Task execution sessions)
CREATE TABLE IF NOT EXISTS task_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'me',
    project_id TEXT,
    todo_input TEXT NOT NULL, -- Original todo input
    options TEXT, -- JSON options for task generation
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed', 'cancelled'
    tasks TEXT, -- JSON array of generated tasks
    total_tasks INTEGER DEFAULT 0,
    completed_tasks INTEGER DEFAULT 0,
    failed_tasks INTEGER DEFAULT 0,
    current_task_index INTEGER DEFAULT 0,
    progress INTEGER DEFAULT 0, -- Progress percentage (0-100)
    start_time TEXT,
    end_time TEXT,
    duration INTEGER DEFAULT 0, -- Duration in milliseconds
    result TEXT, -- JSON execution results
    error TEXT, -- Error message if failed
    metadata TEXT, -- JSON for session metadata
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (project_id) REFERENCES projects (id)
);



-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- User sessions indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_access_token ON user_sessions(access_token_start);
CREATE INDEX IF NOT EXISTS idx_user_sessions_access_token_hash ON user_sessions(access_token_hash);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token_lookup ON user_sessions(access_token_start, access_token_hash);

-- Projects indexes
CREATE INDEX IF NOT EXISTS idx_projects_workspace_path ON projects(workspace_path);
CREATE INDEX IF NOT EXISTS idx_projects_ide_port ON projects(ide_port);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_type ON projects(type);
CREATE INDEX IF NOT EXISTS idx_projects_framework ON projects(framework);
CREATE INDEX IF NOT EXISTS idx_projects_last_accessed ON projects(last_accessed);

-- Tasks indexes
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks(type);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

-- Analysis indexes
CREATE INDEX IF NOT EXISTS idx_analysis_project_id ON analysis(project_id);
CREATE INDEX IF NOT EXISTS idx_analysis_type ON analysis(analysis_type);
CREATE INDEX IF NOT EXISTS idx_analysis_status ON analysis(status);
CREATE INDEX IF NOT EXISTS idx_analysis_created_at ON analysis(created_at);
CREATE INDEX IF NOT EXISTS idx_analysis_completed_at ON analysis(completed_at);
CREATE INDEX IF NOT EXISTS idx_analysis_project_type ON analysis(project_id, analysis_type);
CREATE INDEX IF NOT EXISTS idx_analysis_project_status ON analysis(project_id, status);
CREATE INDEX IF NOT EXISTS idx_analysis_type_status ON analysis(analysis_type, status);

-- Chat indexes
CREATE INDEX IF NOT EXISTS idx_chat_sessions_project_id ON chat_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_created_by ON chat_sessions(created_by);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_status ON chat_sessions(status);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

-- Workflow indexes
CREATE INDEX IF NOT EXISTS idx_workflows_project_id ON workflows(project_id);
CREATE INDEX IF NOT EXISTS idx_workflows_type ON workflows(workflow_type);
CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(status);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(status);

-- Task template indexes
CREATE INDEX IF NOT EXISTS idx_task_templates_name ON task_templates(name);
CREATE INDEX IF NOT EXISTS idx_task_templates_type ON task_templates(type);
CREATE INDEX IF NOT EXISTS idx_task_templates_active ON task_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_task_templates_version ON task_templates(version);
CREATE INDEX IF NOT EXISTS idx_task_templates_created_by ON task_templates(created_by);

-- Task suggestion indexes
CREATE INDEX IF NOT EXISTS idx_task_suggestions_status ON task_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_task_suggestions_project ON task_suggestions(project_path);
CREATE INDEX IF NOT EXISTS idx_task_suggestions_confidence ON task_suggestions(confidence);
CREATE INDEX IF NOT EXISTS idx_task_suggestions_approved ON task_suggestions(is_approved);
CREATE INDEX IF NOT EXISTS idx_task_suggestions_created_at ON task_suggestions(created_at);

-- Task session indexes
CREATE INDEX IF NOT EXISTS idx_task_sessions_user_id ON task_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_task_sessions_project_id ON task_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_task_sessions_status ON task_sessions(status);
CREATE INDEX IF NOT EXISTS idx_task_sessions_created_at ON task_sessions(created_at);



-- ============================================================================
-- COMMENTS
-- ============================================================================

-- This schema supports a single-user IDE management system
-- All tables use 'me' as the default user ID
-- Projects can have multiple IDEs and development servers
-- Tasks are organized by project and can have complex hierarchies
-- Analysis results are stored per project and analysis type
-- Chat sessions provide context-aware conversations
-- Workflows enable automation of common development tasks 