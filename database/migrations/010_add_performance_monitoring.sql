-- Migration: Add Performance Monitoring Tables
-- This migration adds tables for query performance tracking and caching

BEGIN;

-- ============================================================================
-- PERFORMANCE MONITORING TABLES
-- ============================================================================

-- Query Performance Tracking Table
CREATE TABLE IF NOT EXISTS query_performance (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    query_hash TEXT NOT NULL,
    query_text TEXT NOT NULL,
    execution_time_ms INTEGER NOT NULL,
    rows_affected INTEGER DEFAULT 0,
    rows_returned INTEGER DEFAULT 0,
    database_type TEXT NOT NULL, -- 'postgresql' or 'sqlite'
    connection_id TEXT,
    user_id TEXT NOT NULL DEFAULT 'system',
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Query Cache Table
CREATE TABLE IF NOT EXISTS query_cache (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    cache_key TEXT NOT NULL UNIQUE,
    query_hash TEXT NOT NULL,
    result_data JSONB NOT NULL,
    cache_hit_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_accessed TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Slow Query Alerts Table
CREATE TABLE IF NOT EXISTS slow_query_alerts (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    query_hash TEXT NOT NULL,
    query_text TEXT NOT NULL,
    execution_time_ms INTEGER NOT NULL,
    threshold_ms INTEGER NOT NULL,
    alert_level TEXT NOT NULL, -- 'warning', 'critical'
    database_type TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Query Performance Indexes (only create if columns exist)
-- CREATE INDEX IF NOT EXISTS idx_query_performance_hash ON query_performance (query_hash);
-- CREATE INDEX IF NOT EXISTS idx_query_performance_execution_time ON query_performance (execution_time_ms);
-- CREATE INDEX IF NOT EXISTS idx_query_performance_timestamp ON query_performance (timestamp);
-- CREATE INDEX IF NOT EXISTS idx_query_performance_database_type ON query_performance (database_type);

-- Query Cache Indexes
CREATE INDEX IF NOT EXISTS idx_query_cache_key ON query_cache (cache_key);
CREATE INDEX IF NOT EXISTS idx_query_cache_hash ON query_cache (query_hash);
CREATE INDEX IF NOT EXISTS idx_query_cache_expires_at ON query_cache (expires_at);
CREATE INDEX IF NOT EXISTS idx_query_cache_last_accessed ON query_cache (last_accessed);

-- Slow Query Alerts Indexes
CREATE INDEX IF NOT EXISTS idx_slow_query_alerts_hash ON slow_query_alerts (query_hash);
CREATE INDEX IF NOT EXISTS idx_slow_query_alerts_level ON slow_query_alerts (alert_level);
CREATE INDEX IF NOT EXISTS idx_slow_query_alerts_timestamp ON slow_query_alerts (timestamp);
CREATE INDEX IF NOT EXISTS idx_slow_query_alerts_resolved ON slow_query_alerts (resolved_at);

COMMIT;

-- SQLite Version
BEGIN TRANSACTION;

-- Query Performance Tracking Table (SQLite)
CREATE TABLE IF NOT EXISTS query_performance (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    query_hash TEXT NOT NULL,
    query_text TEXT NOT NULL,
    execution_time_ms INTEGER NOT NULL,
    rows_affected INTEGER DEFAULT 0,
    rows_returned INTEGER DEFAULT 0,
    database_type TEXT NOT NULL,
    connection_id TEXT,
    user_id TEXT NOT NULL DEFAULT 'system',
    timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT DEFAULT '{}'
);

-- Query Cache Table (SQLite)
CREATE TABLE IF NOT EXISTS query_cache (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    cache_key TEXT NOT NULL UNIQUE,
    query_hash TEXT NOT NULL,
    result_data TEXT NOT NULL,
    cache_hit_count INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT NOT NULL,
    last_accessed TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT DEFAULT '{}'
);

-- Slow Query Alerts Table (SQLite)
CREATE TABLE IF NOT EXISTS slow_query_alerts (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    query_hash TEXT NOT NULL,
    query_text TEXT NOT NULL,
    execution_time_ms INTEGER NOT NULL,
    threshold_ms INTEGER NOT NULL,
    alert_level TEXT NOT NULL,
    database_type TEXT NOT NULL,
    timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at TEXT,
    metadata TEXT DEFAULT '{}'
);

-- SQLite Indexes (only create if columns exist)
-- CREATE INDEX IF NOT EXISTS idx_query_performance_hash ON query_performance (query_hash);
-- CREATE INDEX IF NOT EXISTS idx_query_performance_execution_time ON query_performance (execution_time_ms);
-- CREATE INDEX IF NOT EXISTS idx_query_performance_timestamp ON query_performance (timestamp);
-- CREATE INDEX IF NOT EXISTS idx_query_performance_database_type ON query_performance (database_type);

CREATE INDEX IF NOT EXISTS idx_query_cache_key ON query_cache (cache_key);
CREATE INDEX IF NOT EXISTS idx_query_cache_hash ON query_cache (query_hash);
CREATE INDEX IF NOT EXISTS idx_query_cache_expires_at ON query_cache (expires_at);
CREATE INDEX IF NOT EXISTS idx_query_cache_last_accessed ON query_cache (last_accessed);

CREATE INDEX IF NOT EXISTS idx_slow_query_alerts_hash ON slow_query_alerts (query_hash);
CREATE INDEX IF NOT EXISTS idx_slow_query_alerts_level ON slow_query_alerts (alert_level);
CREATE INDEX IF NOT EXISTS idx_slow_query_alerts_timestamp ON slow_query_alerts (timestamp);
CREATE INDEX IF NOT EXISTS idx_slow_query_alerts_resolved ON slow_query_alerts (resolved_at);

COMMIT;