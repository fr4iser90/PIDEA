-- Migration 009: Create Layer Architecture Tables
-- Multi-Layer Database Architecture Implementation
-- Created: 2025-10-11T22:15:13.000Z

-- ============================================================================
-- LAYER ARCHITECTURE TABLES
-- ============================================================================

-- LAYER DEFINITIONS (Architectural layers)
CREATE TABLE IF NOT EXISTS layers (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
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
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
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
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
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
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
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
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
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
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Layer indexes
CREATE INDEX IF NOT EXISTS idx_layers_name ON layers(name);
CREATE INDEX IF NOT EXISTS idx_layers_type ON layers(layer_type);
CREATE INDEX IF NOT EXISTS idx_layers_active ON layers(is_active);
CREATE INDEX IF NOT EXISTS idx_layers_order ON layers(order_index);

-- Layer task indexes
CREATE INDEX IF NOT EXISTS idx_layer_tasks_layer_id ON layer_tasks(layer_id);
CREATE INDEX IF NOT EXISTS idx_layer_tasks_task_id ON layer_tasks(task_id);
CREATE INDEX IF NOT EXISTS idx_layer_tasks_status ON layer_tasks(status);
CREATE INDEX IF NOT EXISTS idx_layer_tasks_assignment_type ON layer_tasks(assignment_type);
CREATE INDEX IF NOT EXISTS idx_layer_tasks_layer_status ON layer_tasks(layer_id, status);

-- Layer dependency indexes
CREATE INDEX IF NOT EXISTS idx_layer_dependencies_source ON layer_dependencies(source_layer_id);
CREATE INDEX IF NOT EXISTS idx_layer_dependencies_target ON layer_dependencies(target_layer_id);
CREATE INDEX IF NOT EXISTS idx_layer_dependencies_type ON layer_dependencies(dependency_type);
CREATE INDEX IF NOT EXISTS idx_layer_dependencies_active ON layer_dependencies(is_active);

-- Layer status coordination indexes
CREATE INDEX IF NOT EXISTS idx_layer_status_coordination_layer ON layer_status_coordination(layer_id);
CREATE INDEX IF NOT EXISTS idx_layer_status_coordination_task ON layer_status_coordination(task_id);
CREATE INDEX IF NOT EXISTS idx_layer_status_coordination_status ON layer_status_coordination(status);
CREATE INDEX IF NOT EXISTS idx_layer_status_coordination_coordination_status ON layer_status_coordination(coordination_status);
CREATE INDEX IF NOT EXISTS idx_layer_status_coordination_source ON layer_status_coordination(source_layer_id);

-- Task distribution rule indexes
CREATE INDEX IF NOT EXISTS idx_task_distribution_rules_name ON task_distribution_rules(rule_name);
CREATE INDEX IF NOT EXISTS idx_task_distribution_rules_type ON task_distribution_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_task_distribution_rules_active ON task_distribution_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_task_distribution_rules_priority ON task_distribution_rules(priority);

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Insert default architectural layers
INSERT INTO layers (id, name, description, layer_type, order_index) VALUES
('layer-domain', 'Domain Layer', 'Core business logic and domain entities', 'domain', 1),
('layer-application', 'Application Layer', 'Application services and use cases', 'application', 2),
('layer-infrastructure', 'Infrastructure Layer', 'Database, external services, and technical concerns', 'infrastructure', 3),
('layer-presentation', 'Presentation Layer', 'User interface and API controllers', 'presentation', 4)
ON CONFLICT (id) DO NOTHING;

-- Insert default layer dependencies
INSERT INTO layer_dependencies (source_layer_id, target_layer_id, dependency_type) VALUES
('layer-application', 'layer-domain', 'depends_on'),
('layer-infrastructure', 'layer-domain', 'depends_on'),
('layer-infrastructure', 'layer-application', 'depends_on'),
('layer-presentation', 'layer-application', 'depends_on'),
('layer-presentation', 'layer-infrastructure', 'depends_on')
ON CONFLICT (source_layer_id, target_layer_id) DO NOTHING;

-- Insert default task distribution rules
INSERT INTO task_distribution_rules (rule_name, description, rule_type, conditions, target_layers) VALUES
('domain-tasks', 'Tasks related to domain logic', 'automatic', '{"category": "domain", "type": "feature"}', '["layer-domain"]'),
('application-tasks', 'Tasks related to application services', 'automatic', '{"category": "application", "type": "feature"}', '["layer-application"]'),
('infrastructure-tasks', 'Tasks related to infrastructure concerns', 'automatic', '{"category": "infrastructure", "type": "feature"}', '["layer-infrastructure"]'),
('presentation-tasks', 'Tasks related to user interface', 'automatic', '{"category": "presentation", "type": "feature"}', '["layer-presentation"]')
ON CONFLICT (rule_name) DO NOTHING;
