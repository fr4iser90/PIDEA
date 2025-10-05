-- Migration: Create playwright_configs table
-- This table stores Playwright test configurations for each project

CREATE TABLE playwright_configs (
    id SERIAL PRIMARY KEY,
    project_id VARCHAR(255) NOT NULL UNIQUE,
    base_url VARCHAR(500) NOT NULL,
    timeout INTEGER NOT NULL,
    retries INTEGER NOT NULL,
    browsers JSONB NOT NULL,
    headless BOOLEAN NOT NULL,
    login_config JSONB NOT NULL,
    screenshots_config JSONB NOT NULL,
    videos_config JSONB NOT NULL,
    reports_config JSONB NOT NULL,
    tests_config JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_playwright_configs_project_id 
        FOREIGN KEY (project_id) 
        REFERENCES projects(id) 
        ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_playwright_configs_project_id ON playwright_configs(project_id);
CREATE INDEX idx_playwright_configs_created_at ON playwright_configs(created_at);
CREATE INDEX idx_playwright_configs_updated_at ON playwright_configs(updated_at);

