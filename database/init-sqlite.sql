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
    workflow_version TEXT DEFAULT '1.0.3',
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
    version TEXT DEFAULT '1.0.3',
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
-- LAYER ARCHITECTURE TABLES
-- ============================================================================

-- LAYER DEFINITIONS (Architectural layers)
CREATE TABLE IF NOT EXISTS layers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    layer_type TEXT NOT NULL, -- 'domain', 'application', 'infrastructure', 'presentation'
    order_index INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    metadata TEXT, -- JSON for layer-specific configuration
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT NOT NULL DEFAULT 'me',
    FOREIGN KEY (created_by) REFERENCES users (id)
);

-- LAYER TASK MAPPING (Tasks assigned to specific layers)
CREATE TABLE IF NOT EXISTS layer_tasks (
    id TEXT PRIMARY KEY,
    layer_id TEXT NOT NULL,
    task_id TEXT NOT NULL,
    assignment_type TEXT NOT NULL DEFAULT 'direct', -- 'direct', 'inherited', 'distributed'
    priority INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'failed'
    assigned_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    started_at TEXT,
    completed_at TEXT,
    metadata TEXT, -- JSON for assignment metadata
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (layer_id) REFERENCES layers (id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE,
    UNIQUE(layer_id, task_id)
);

-- LAYER DEPENDENCIES (Layer dependency relationships)
CREATE TABLE IF NOT EXISTS layer_dependencies (
    id TEXT PRIMARY KEY,
    source_layer_id TEXT NOT NULL,
    target_layer_id TEXT NOT NULL,
    dependency_type TEXT NOT NULL DEFAULT 'depends_on', -- 'depends_on', 'blocks', 'requires'
    is_active BOOLEAN NOT NULL DEFAULT true,
    metadata TEXT, -- JSON for dependency metadata
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (source_layer_id) REFERENCES layers (id) ON DELETE CASCADE,
    FOREIGN KEY (target_layer_id) REFERENCES layers (id) ON DELETE CASCADE,
    UNIQUE(source_layer_id, target_layer_id)
);

-- LAYER STATUS COORDINATION (Status synchronization between layers)
CREATE TABLE IF NOT EXISTS layer_status_coordination (
    id TEXT PRIMARY KEY,
    layer_id TEXT NOT NULL,
    task_id TEXT NOT NULL,
    status TEXT NOT NULL, -- 'pending', 'in_progress', 'completed', 'failed', 'blocked'
    coordination_type TEXT NOT NULL DEFAULT 'sync', -- 'sync', 'async', 'manual'
    source_layer_id TEXT, -- Layer that initiated the status change
    target_layers TEXT, -- JSON array of target layer IDs
    coordination_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'success', 'failed', 'partial'
    error_message TEXT,
    metadata TEXT, -- JSON for coordination metadata
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (layer_id) REFERENCES layers (id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE,
    FOREIGN KEY (source_layer_id) REFERENCES layers (id) ON DELETE SET NULL
);

-- TASK DISTRIBUTION RULES (Rules for distributing tasks across layers)
CREATE TABLE IF NOT EXISTS task_distribution_rules (
    id TEXT PRIMARY KEY,
    rule_name TEXT NOT NULL UNIQUE,
    description TEXT,
    rule_type TEXT NOT NULL, -- 'automatic', 'manual', 'conditional'
    conditions TEXT NOT NULL, -- JSON conditions for rule application
    target_layers TEXT NOT NULL, -- JSON array of target layer IDs
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    metadata TEXT, -- JSON for rule metadata
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT NOT NULL DEFAULT 'me',
    FOREIGN KEY (created_by) REFERENCES users (id)
);

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
-- Layer architecture enables multi-layer task orchestration and coordination

-- ============================================================================
-- DATABASE PERFORMANCE OPTIMIZATION TABLES
-- ============================================================================

-- PERFORMANCE METRICS (Database performance monitoring)
CREATE TABLE IF NOT EXISTS performance_metrics (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    metric_type TEXT NOT NULL, -- 'query', 'index', 'connection', 'cache', 'memory'
    metric_name TEXT NOT NULL,
    metric_value REAL NOT NULL,
    metric_unit TEXT, -- 'ms', 'bytes', 'count', 'percentage'
    threshold_value REAL,
    threshold_type TEXT, -- 'warning', 'error', 'critical'
    is_exceeded INTEGER DEFAULT 0,
    context TEXT, -- JSON context information
    metadata TEXT, -- JSON additional metadata
    recorded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- QUERY PERFORMANCE (Query execution monitoring)
CREATE TABLE IF NOT EXISTS query_performance (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    query_hash TEXT NOT NULL, -- Hash of normalized query
    query_text TEXT NOT NULL, -- Original query text
    normalized_query TEXT NOT NULL, -- Normalized query for analysis
    execution_time REAL NOT NULL, -- Execution time in milliseconds
    rows_affected INTEGER,
    rows_returned INTEGER,
    query_plan TEXT, -- JSON query execution plan
    optimization_suggestions TEXT, -- JSON optimization suggestions
    performance_score REAL, -- Performance score (0-100)
    is_optimized INTEGER DEFAULT 0,
    optimization_applied TEXT, -- JSON applied optimizations
    context TEXT, -- JSON context information
    metadata TEXT, -- JSON additional metadata
    executed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- INDEX USAGE (Index utilization monitoring)
CREATE TABLE IF NOT EXISTS index_usage (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    table_name TEXT NOT NULL,
    index_name TEXT NOT NULL,
    index_type TEXT NOT NULL, -- 'btree', 'hash', 'gin', 'gist', 'brin'
    usage_count INTEGER DEFAULT 0,
    last_used TEXT,
    is_used INTEGER DEFAULT 0,
    is_recommended INTEGER DEFAULT 0,
    recommendation_reason TEXT,
    performance_impact REAL, -- Performance impact score
    maintenance_cost REAL, -- Maintenance cost score
    context TEXT, -- JSON context information
    metadata TEXT, -- JSON additional metadata
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- PARTITION PERFORMANCE (Table partitioning monitoring)
CREATE TABLE IF NOT EXISTS partition_performance (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    table_name TEXT NOT NULL,
    partition_name TEXT NOT NULL,
    partition_type TEXT NOT NULL, -- 'range', 'list', 'hash'
    partition_key TEXT NOT NULL,
    partition_value TEXT,
    row_count INTEGER DEFAULT 0,
    size_bytes INTEGER DEFAULT 0,
    access_frequency INTEGER DEFAULT 0,
    last_accessed TEXT,
    performance_score REAL, -- Performance score (0-100)
    is_active INTEGER DEFAULT 1,
    is_recommended INTEGER DEFAULT 0,
    recommendation_reason TEXT,
    context TEXT, -- JSON context information
    metadata TEXT, -- JSON additional metadata
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- MATERIALIZED VIEW PERFORMANCE (Materialized view monitoring)
CREATE TABLE IF NOT EXISTS materialized_view_performance (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    view_name TEXT NOT NULL,
    view_schema TEXT NOT NULL DEFAULT 'main',
    refresh_count INTEGER DEFAULT 0,
    last_refresh TEXT,
    refresh_time REAL, -- Refresh time in milliseconds
    row_count INTEGER DEFAULT 0,
    size_bytes INTEGER DEFAULT 0,
    access_frequency INTEGER DEFAULT 0,
    last_accessed TEXT,
    performance_score REAL, -- Performance score (0-100)
    is_active INTEGER DEFAULT 1,
    is_recommended INTEGER DEFAULT 0,
    recommendation_reason TEXT,
    context TEXT, -- JSON context information
    metadata TEXT, -- JSON additional metadata
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- OPTIMIZATION RECOMMENDATIONS (Database optimization suggestions)
CREATE TABLE IF NOT EXISTS optimization_recommendations (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    recommendation_type TEXT NOT NULL, -- 'index', 'query', 'partition', 'materialized_view'
    recommendation_name TEXT NOT NULL,
    description TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    estimated_impact REAL, -- Estimated performance impact (0-100)
    implementation_cost REAL, -- Implementation cost score (0-100)
    risk_level TEXT DEFAULT 'low', -- 'low', 'medium', 'high'
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'implemented'
    implementation_plan TEXT, -- JSON implementation plan
    validation_results TEXT, -- JSON validation results
    applied_at TEXT,
    applied_by TEXT,
    context TEXT, -- JSON context information
    metadata TEXT, -- JSON additional metadata
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (applied_by) REFERENCES users (id)
);

-- OPTIMIZATION HISTORY (Optimization implementation history)
CREATE TABLE IF NOT EXISTS optimization_history (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    optimization_type TEXT NOT NULL, -- 'index', 'query', 'partition', 'materialized_view'
    optimization_name TEXT NOT NULL,
    description TEXT NOT NULL,
    implementation_sql TEXT, -- SQL used for implementation
    rollback_sql TEXT, -- SQL for rollback
    status TEXT NOT NULL, -- 'implemented', 'rolled_back', 'failed'
    performance_before REAL, -- Performance before optimization
    performance_after REAL, -- Performance after optimization
    performance_improvement REAL, -- Performance improvement percentage
    implementation_time REAL, -- Implementation time in milliseconds
    error_message TEXT,
    context TEXT, -- JSON context information
    metadata TEXT, -- JSON additional metadata
    implemented_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    implemented_by TEXT NOT NULL DEFAULT 'me',
    FOREIGN KEY (implemented_by) REFERENCES users (id)
);

-- ============================================================================
-- PERFORMANCE OPTIMIZATION INDEXES
-- ============================================================================

-- Performance metrics indexes
CREATE INDEX IF NOT EXISTS idx_performance_metrics_type ON performance_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_name ON performance_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_recorded_at ON performance_metrics(recorded_at);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_exceeded ON performance_metrics(is_exceeded);

-- Query performance indexes
CREATE INDEX IF NOT EXISTS idx_query_performance_hash ON query_performance(query_hash);
CREATE INDEX IF NOT EXISTS idx_query_performance_execution_time ON query_performance(execution_time);
CREATE INDEX IF NOT EXISTS idx_query_performance_executed_at ON query_performance(executed_at);
CREATE INDEX IF NOT EXISTS idx_query_performance_optimized ON query_performance(is_optimized);
CREATE INDEX IF NOT EXISTS idx_query_performance_score ON query_performance(performance_score);

-- Index usage indexes
CREATE INDEX IF NOT EXISTS idx_index_usage_table ON index_usage(table_name);
CREATE INDEX IF NOT EXISTS idx_index_usage_name ON index_usage(index_name);
CREATE INDEX IF NOT EXISTS idx_index_usage_used ON index_usage(is_used);
CREATE INDEX IF NOT EXISTS idx_index_usage_recommended ON index_usage(is_recommended);
CREATE INDEX IF NOT EXISTS idx_index_usage_last_used ON index_usage(last_used);

-- Partition performance indexes
CREATE INDEX IF NOT EXISTS idx_partition_performance_table ON partition_performance(table_name);
CREATE INDEX IF NOT EXISTS idx_partition_performance_name ON partition_performance(partition_name);
CREATE INDEX IF NOT EXISTS idx_partition_performance_active ON partition_performance(is_active);
CREATE INDEX IF NOT EXISTS idx_partition_performance_recommended ON partition_performance(is_recommended);
CREATE INDEX IF NOT EXISTS idx_partition_performance_score ON partition_performance(performance_score);

-- Materialized view performance indexes
CREATE INDEX IF NOT EXISTS idx_materialized_view_performance_name ON materialized_view_performance(view_name);
CREATE INDEX IF NOT EXISTS idx_materialized_view_performance_schema ON materialized_view_performance(view_schema);
CREATE INDEX IF NOT EXISTS idx_materialized_view_performance_active ON materialized_view_performance(is_active);
CREATE INDEX IF NOT EXISTS idx_materialized_view_performance_recommended ON materialized_view_performance(is_recommended);
CREATE INDEX IF NOT EXISTS idx_materialized_view_performance_last_refresh ON materialized_view_performance(last_refresh);

-- Optimization recommendations indexes
CREATE INDEX IF NOT EXISTS idx_optimization_recommendations_type ON optimization_recommendations(recommendation_type);
CREATE INDEX IF NOT EXISTS idx_optimization_recommendations_priority ON optimization_recommendations(priority);
CREATE INDEX IF NOT EXISTS idx_optimization_recommendations_status ON optimization_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_optimization_recommendations_impact ON optimization_recommendations(estimated_impact);
CREATE INDEX IF NOT EXISTS idx_optimization_recommendations_created_at ON optimization_recommendations(created_at);

-- Optimization history indexes
CREATE INDEX IF NOT EXISTS idx_optimization_history_type ON optimization_history(optimization_type);
CREATE INDEX IF NOT EXISTS idx_optimization_history_status ON optimization_history(status);
CREATE INDEX IF NOT EXISTS idx_optimization_history_implemented_at ON optimization_history(implemented_at);
CREATE INDEX IF NOT EXISTS idx_optimization_history_implemented_by ON optimization_history(implemented_by);
CREATE INDEX IF NOT EXISTS idx_optimization_history_improvement ON optimization_history(performance_improvement); 