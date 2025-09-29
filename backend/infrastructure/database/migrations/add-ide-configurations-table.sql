-- IDE Configurations Table Migration
-- Created: 2025-09-29T19:51:09.000Z
-- Purpose: Store user IDE configurations and executable paths

CREATE TABLE IF NOT EXISTS ide_configurations (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id TEXT NOT NULL DEFAULT 'me',
    ide_type TEXT NOT NULL, -- 'cursor', 'vscode', 'windsurf'
    executable_path TEXT NOT NULL, -- Full path to IDE executable
    version TEXT, -- IDE version (e.g., '1.0.0', '2024.1.2')
    build_number TEXT, -- Build number if available
    installation_path TEXT, -- Directory where IDE is installed
    is_default BOOLEAN DEFAULT false, -- Is this the default installation
    is_active BOOLEAN DEFAULT true, -- Is this configuration active
    last_used TEXT, -- Last time this IDE was used
    usage_count INTEGER DEFAULT 0, -- How many times this IDE was used
    port_range_start INTEGER, -- Start of port range for this IDE
    port_range_end INTEGER, -- End of port range for this IDE
    startup_options TEXT, -- JSON with startup options
    metadata TEXT, -- JSON with additional IDE-specific settings
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id),
    UNIQUE(user_id, ide_type, executable_path)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ide_configurations_user_id ON ide_configurations(user_id);
CREATE INDEX IF NOT EXISTS idx_ide_configurations_ide_type ON ide_configurations(ide_type);
CREATE INDEX IF NOT EXISTS idx_ide_configurations_active ON ide_configurations(is_active);
CREATE INDEX IF NOT EXISTS idx_ide_configurations_default ON ide_configurations(is_default);

-- Insert default IDE configurations for common paths
INSERT INTO ide_configurations (user_id, ide_type, executable_path, version, is_default, is_active, port_range_start, port_range_end) VALUES
('me', 'cursor', 'cursor', '1.0.0', true, true, 9222, 9231),
('me', 'vscode', 'code', '1.0.0', true, true, 9232, 9241),
('me', 'windsurf', 'windsurf', '1.0.0', true, true, 9242, 9251)
ON CONFLICT (user_id, ide_type, executable_path) DO NOTHING;
