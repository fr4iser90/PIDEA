# Analysis Data Caching – Phase 1: Database Cache Infrastructure

## Overview
Create the database infrastructure for analysis caching, including the cache table schema, validation fields, cleanup procedures, and statistics tracking.

## Objectives
- [ ] Add comprehensive_cache table to init.sql
- [ ] Add workspace_detection_cache table to init.sql
- [ ] Add package_json_cache table to init.sql
- [ ] Add cache_config table to init.sql
- [ ] Add cache_stats table to init.sql
- [ ] Add performance indexes for all cache tables

## Deliverables
- File: `database/init.sql` - Updated with cache tables (comprehensive_cache, workspace_detection_cache, package_json_cache, cache_config, cache_stats)
- Test: `tests/unit/AnalysisCacheDatabase.test.js` - Database schema tests

## Dependencies
- Requires: None (independent phase)
- Blocks: Phase 2 (Repository Caching Layer) start

## Estimated Time
1 hour

## Technical Implementation

### 1. Cache Tables for init.sql
```sql
-- Add these tables to database/init.sql after the existing tables

-- ============================================================================
-- CACHE TABLES (Analysis & Workspace Detection Caching)
-- ============================================================================

-- Comprehensive cache table for all analysis types
CREATE TABLE IF NOT EXISTS comprehensive_cache (
    id TEXT PRIMARY KEY,
    cache_key TEXT NOT NULL UNIQUE,
    operation_type TEXT NOT NULL, -- 'workspace_detection', 'package_json', 'project_analysis', etc.
    workspace_path TEXT NOT NULL,
    result_data TEXT NOT NULL, -- JSON data
    file_hash TEXT NOT NULL, -- Workspace file content hash
    config_hash TEXT NOT NULL, -- Operation configuration hash
    ttl_seconds INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT NOT NULL,
    access_count INTEGER DEFAULT 0,
    last_accessed TEXT,
    metadata TEXT, -- JSON for additional info
    status TEXT DEFAULT 'active' -- 'active', 'expired', 'invalidated'
);

-- Workspace detection specific cache
CREATE TABLE IF NOT EXISTS workspace_detection_cache (
    id TEXT PRIMARY KEY,
    port INTEGER NOT NULL,
    workspace_path TEXT NOT NULL,
    detection_result TEXT NOT NULL, -- JSON
    file_hash TEXT NOT NULL,
    ttl_seconds INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT NOT NULL,
    access_count INTEGER DEFAULT 0,
    last_accessed TEXT
);

-- Package.json analysis specific cache
CREATE TABLE IF NOT EXISTS package_json_cache (
    id TEXT PRIMARY KEY,
    workspace_path TEXT NOT NULL,
    package_json_path TEXT NOT NULL,
    analysis_result TEXT NOT NULL, -- JSON
    file_hash TEXT NOT NULL,
    ttl_seconds INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT NOT NULL,
    access_count INTEGER DEFAULT 0,
    last_accessed TEXT
);

-- Cache configuration table
CREATE TABLE IF NOT EXISTS cache_config (
    id TEXT PRIMARY KEY,
    cache_type TEXT NOT NULL UNIQUE,
    ttl_seconds INTEGER NOT NULL,
    max_size_bytes INTEGER NOT NULL,
    enabled BOOLEAN DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Cache statistics table
CREATE TABLE IF NOT EXISTS cache_stats (
    id TEXT PRIMARY KEY,
    cache_type TEXT NOT NULL,
    total_requests INTEGER DEFAULT 0,
    cache_hits INTEGER DEFAULT 0,
    cache_misses INTEGER DEFAULT 0,
    total_size_bytes INTEGER DEFAULT 0,
    avg_response_time_ms INTEGER DEFAULT 0,
    last_updated TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- CACHE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Comprehensive cache indexes
CREATE INDEX IF NOT EXISTS idx_comprehensive_cache_key ON comprehensive_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_comprehensive_cache_type ON comprehensive_cache(operation_type);
CREATE INDEX IF NOT EXISTS idx_comprehensive_cache_expires ON comprehensive_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_comprehensive_cache_status ON comprehensive_cache(status);
CREATE INDEX IF NOT EXISTS idx_comprehensive_cache_workspace ON comprehensive_cache(workspace_path);

-- Workspace detection cache indexes
CREATE INDEX IF NOT EXISTS idx_workspace_detection_cache_port ON workspace_detection_cache(port);
CREATE INDEX IF NOT EXISTS idx_workspace_detection_cache_path ON workspace_detection_cache(workspace_path);
CREATE INDEX IF NOT EXISTS idx_workspace_detection_cache_expires ON workspace_detection_cache(expires_at);

-- Package.json cache indexes
CREATE INDEX IF NOT EXISTS idx_package_json_cache_path ON package_json_cache(workspace_path);
CREATE INDEX IF NOT EXISTS idx_package_json_cache_expires ON package_json_cache(expires_at);

-- Cache config and stats indexes
CREATE INDEX IF NOT EXISTS idx_cache_config_type ON cache_config(cache_type);
CREATE INDEX IF NOT EXISTS idx_cache_stats_type ON cache_stats(cache_type);

-- ============================================================================
-- CACHE TRIGGERS
-- ============================================================================

-- Trigger to automatically update last_accessed for comprehensive cache
CREATE TRIGGER IF NOT EXISTS update_comprehensive_cache_access
    AFTER UPDATE OF access_count ON comprehensive_cache
    BEGIN
        UPDATE comprehensive_cache 
        SET last_accessed = CURRENT_TIMESTAMP 
        WHERE id = NEW.id;
    END;

-- Trigger to automatically update last_accessed for workspace detection cache
CREATE TRIGGER IF NOT EXISTS update_workspace_detection_cache_access
    AFTER UPDATE OF access_count ON workspace_detection_cache
    BEGIN
        UPDATE workspace_detection_cache 
        SET last_accessed = CURRENT_TIMESTAMP 
        WHERE id = NEW.id;
    END;

-- Trigger to automatically update last_accessed for package.json cache
CREATE TRIGGER IF NOT EXISTS update_package_json_cache_access
    AFTER UPDATE OF access_count ON package_json_cache
    BEGIN
        UPDATE package_json_cache 
        SET last_accessed = CURRENT_TIMESTAMP 
        WHERE id = NEW.id;
    END;
```

### 2. Cache Configuration Table
```sql
-- Cache configuration table for different analysis types
CREATE TABLE IF NOT EXISTS analysis_cache_config (
    id TEXT PRIMARY KEY,
    analysis_type TEXT NOT NULL UNIQUE,
    ttl_seconds INTEGER NOT NULL,
    max_size_bytes INTEGER NOT NULL,
    enabled BOOLEAN DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert default cache configurations
INSERT OR IGNORE INTO analysis_cache_config (id, analysis_type, ttl_seconds, max_size_bytes, enabled) VALUES
('config_code_quality', 'code-quality', 21600, 52428800, 1), -- 6h, 50MB
('config_security', 'security', 14400, 31457280, 1), -- 4h, 30MB
('config_performance', 'performance', 28800, 41943040, 1), -- 8h, 40MB
('config_architecture', 'architecture', 43200, 62914560, 1), -- 12h, 60MB
('config_dependencies', 'dependencies', 86400, 20971520, 1), -- 24h, 20MB
('config_structure', 'structure', 86400, 10485760, 1); -- 24h, 10MB
```

### 3. Cache Statistics Table
```sql
-- Cache statistics tracking table
CREATE TABLE IF NOT EXISTS analysis_cache_stats (
    id TEXT PRIMARY KEY,
    analysis_type TEXT NOT NULL,
    total_requests INTEGER DEFAULT 0,
    cache_hits INTEGER DEFAULT 0,
    cache_misses INTEGER DEFAULT 0,
    total_size_bytes INTEGER DEFAULT 0,
    avg_response_time_ms INTEGER DEFAULT 0,
    last_updated TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert initial statistics records
INSERT OR IGNORE INTO analysis_cache_stats (id, analysis_type, total_requests, cache_hits, cache_misses) VALUES
('stats_code_quality', 'code-quality', 0, 0, 0),
('stats_security', 'security', 0, 0, 0),
('stats_performance', 'performance', 0, 0, 0),
('stats_architecture', 'architecture', 0, 0, 0),
('stats_dependencies', 'dependencies', 0, 0, 0),
('stats_structure', 'structure', 0, 0, 0);
```

### 4. Cache Cleanup Procedures
```sql
-- Function to cleanup expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_analysis_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM analysis_cache 
    WHERE expires_at < CURRENT_TIMESTAMP 
    AND status = 'expired';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Update statistics
    UPDATE analysis_cache_stats 
    SET last_updated = CURRENT_TIMESTAMP 
    WHERE analysis_type IN (
        SELECT DISTINCT analysis_type 
        FROM analysis_cache 
        WHERE expires_at < CURRENT_TIMESTAMP
    );
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup old cache entries by size
CREATE OR REPLACE FUNCTION cleanup_old_analysis_cache(max_size_bytes BIGINT)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
    current_size BIGINT;
BEGIN
    -- Get current cache size
    SELECT COALESCE(SUM(LENGTH(result_data)), 0) INTO current_size 
    FROM analysis_cache 
    WHERE status = 'active';
    
    -- If under limit, no cleanup needed
    IF current_size <= max_size_bytes THEN
        RETURN 0;
    END IF;
    
    -- Delete oldest entries until under limit
    DELETE FROM analysis_cache 
    WHERE id IN (
        SELECT id FROM analysis_cache 
        WHERE status = 'active'
        ORDER BY last_accessed ASC, created_at ASC
        LIMIT (
            SELECT COUNT(*) FROM analysis_cache 
            WHERE status = 'active'
        ) - (
            SELECT COUNT(*) FROM analysis_cache 
            WHERE status = 'active' 
            AND LENGTH(result_data) <= (max_size_bytes - current_size)
        )
    );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
```

### 5. Cache Validation Functions
```sql
-- Function to validate cache entry
CREATE OR REPLACE FUNCTION validate_analysis_cache(
    p_cache_key TEXT,
    p_file_hash TEXT,
    p_config_hash TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    cache_entry RECORD;
BEGIN
    -- Get cache entry
    SELECT * INTO cache_entry 
    FROM analysis_cache 
    WHERE cache_key = p_cache_key 
    AND status = 'active';
    
    -- Check if entry exists and is valid
    IF cache_entry IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check if expired
    IF cache_entry.expires_at < CURRENT_TIMESTAMP THEN
        UPDATE analysis_cache 
        SET status = 'expired' 
        WHERE cache_key = p_cache_key;
        RETURN FALSE;
    END IF;
    
    -- Check file hash
    IF cache_entry.file_hash != p_file_hash THEN
        UPDATE analysis_cache 
        SET status = 'invalidated' 
        WHERE cache_key = p_cache_key;
        RETURN FALSE;
    END IF;
    
    -- Check config hash
    IF cache_entry.config_hash != p_config_hash THEN
        UPDATE analysis_cache 
        SET status = 'invalidated' 
        WHERE cache_key = p_cache_key;
        RETURN FALSE;
    END IF;
    
    -- Update access count and timestamp
    UPDATE analysis_cache 
    SET access_count = access_count + 1,
        last_accessed = CURRENT_TIMESTAMP
    WHERE cache_key = p_cache_key;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
```

### 6. Cache Statistics Functions
```sql
-- Function to update cache statistics
CREATE OR REPLACE FUNCTION update_analysis_cache_stats(
    p_analysis_type TEXT,
    p_is_hit BOOLEAN,
    p_response_time_ms INTEGER,
    p_data_size_bytes INTEGER
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO analysis_cache_stats (
        id, analysis_type, total_requests, cache_hits, cache_misses, 
        total_size_bytes, avg_response_time_ms, last_updated
    ) VALUES (
        'stats_' || p_analysis_type, p_analysis_type, 1,
        CASE WHEN p_is_hit THEN 1 ELSE 0 END,
        CASE WHEN p_is_hit THEN 0 ELSE 1 END,
        p_data_size_bytes, p_response_time_ms, CURRENT_TIMESTAMP
    )
    ON CONFLICT (id) DO UPDATE SET
        total_requests = analysis_cache_stats.total_requests + 1,
        cache_hits = analysis_cache_stats.cache_hits + CASE WHEN p_is_hit THEN 1 ELSE 0 END,
        cache_misses = analysis_cache_stats.cache_misses + CASE WHEN p_is_hit THEN 0 ELSE 1 END,
        total_size_bytes = analysis_cache_stats.total_size_bytes + p_data_size_bytes,
        avg_response_time_ms = (
            (analysis_cache_stats.avg_response_time_ms * analysis_cache_stats.total_requests + p_response_time_ms) / 
            (analysis_cache_stats.total_requests + 1)
        ),
        last_updated = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Function to get cache hit rate
CREATE OR REPLACE FUNCTION get_analysis_cache_hit_rate(p_analysis_type TEXT)
RETURNS DECIMAL AS $$
DECLARE
    hit_rate DECIMAL;
BEGIN
    SELECT 
        CASE 
            WHEN total_requests = 0 THEN 0
            ELSE ROUND((cache_hits::DECIMAL / total_requests::DECIMAL) * 100, 2)
        END INTO hit_rate
    FROM analysis_cache_stats 
    WHERE analysis_type = p_analysis_type;
    
    RETURN hit_rate;
END;
$$ LANGUAGE plpgsql;
```

## Success Criteria
- [ ] Comprehensive cache table added to init.sql with all required fields
- [ ] Workspace detection cache table added to init.sql
- [ ] Package.json cache table added to init.sql
- [ ] Cache configuration table added to init.sql with default settings
- [ ] Cache statistics table added to init.sql for monitoring
- [ ] All performance indexes created for cache tables
- [ ] Triggers for automatic access tracking working
- [ ] Database schema validates successfully

## Testing Requirements
- [ ] Test cache table creation and structure
- [ ] Test cache configuration insertion
- [ ] Test cache validation functions
- [ ] Test cache cleanup procedures
- [ ] Test cache statistics functions
- [ ] Test database performance with indexes

## Next Phase Dependencies
- Database schema must be complete
- Cache validation functions must be working
- Statistics tracking must be functional
- Cleanup procedures must be tested

This phase establishes the foundation for the analysis caching system with a robust database infrastructure that supports intelligent caching, validation, and monitoring. 