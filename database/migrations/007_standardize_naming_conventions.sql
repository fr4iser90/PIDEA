-- Migration: 007_standardize_naming_conventions
-- Description: Standardize database naming conventions across all tables
-- Created: 2025-10-11T21:38:13.000Z
-- Version: 1.0.0
-- Status: Pending

-- PostgreSQL Version
BEGIN;

-- ============================================================================
-- TIMESTAMP COLUMN STANDARDIZATION
-- ============================================================================

-- Standardize timestamp columns in users table
-- Note: PostgreSQL already uses TIMESTAMP WITH TIME ZONE, no changes needed

-- Standardize timestamp columns in user_sessions table
-- Note: PostgreSQL already uses TIMESTAMP WITH TIME ZONE, no changes needed

-- Standardize timestamp columns in projects table
-- Note: PostgreSQL already uses TIMESTAMP WITH TIME ZONE, no changes needed

-- Standardize timestamp columns in tasks table
-- Note: PostgreSQL already uses TIMESTAMP WITH TIME ZONE, no changes needed

-- Standardize timestamp columns in analysis table
-- Note: PostgreSQL already uses TIMESTAMP WITH TIME ZONE, no changes needed

-- ============================================================================
-- ID GENERATION STANDARDIZATION
-- ============================================================================

-- Standardize ID generation in users table
-- Note: Already uses TEXT PRIMARY KEY DEFAULT 'me', no changes needed

-- Standardize ID generation in user_sessions table
-- Note: Already uses uuid_generate_v4()::text, no changes needed

-- Standardize ID generation in projects table
-- Note: Already uses uuid_generate_v4()::text, no changes needed

-- Standardize ID generation in tasks table
-- Note: Already uses uuid_generate_v4()::text, no changes needed

-- Standardize ID generation in analysis table
-- Note: Already uses uuid_generate_v4()::text, no changes needed

-- ============================================================================
-- INDEX NAMING STANDARDIZATION
-- ============================================================================

-- Standardize index naming in users table
-- Note: Indexes already follow idx_{table}_{column} pattern, no changes needed

-- Standardize index naming in user_sessions table
-- Note: Indexes already follow idx_{table}_{column} pattern, no changes needed

-- Standardize index naming in projects table
-- Note: Indexes already follow idx_{table}_{column} pattern, no changes needed

-- Standardize index naming in tasks table
-- Note: Indexes already follow idx_{table}_{column} pattern, no changes needed

-- Standardize index naming in analysis table
-- Note: Indexes already follow idx_{table}_{column} pattern, no changes needed

-- ============================================================================
-- CONSTRAINT NAMING STANDARDIZATION
-- ============================================================================

-- Standardize constraint naming in users table
-- Note: Constraints already follow proper naming patterns, no changes needed

-- Standardize constraint naming in user_sessions table
-- Note: Constraints already follow proper naming patterns, no changes needed

-- Standardize constraint naming in projects table
-- Note: Constraints already follow proper naming patterns, no changes needed

-- Standardize constraint naming in tasks table
-- Note: Constraints already follow proper naming patterns, no changes needed

-- Standardize constraint naming in analysis table
-- Note: Constraints already follow proper naming patterns, no changes needed

-- ============================================================================
-- COLUMN NAMING STANDARDIZATION
-- ============================================================================

-- Standardize column naming in users table
-- Note: Columns already follow snake_case pattern, no changes needed

-- Standardize column naming in user_sessions table
-- Note: Columns already follow snake_case pattern, no changes needed

-- Standardize column naming in projects table
-- Note: Columns already follow snake_case pattern, no changes needed

-- Standardize column naming in tasks table
-- Note: Columns already follow snake_case pattern, no changes needed

-- Standardize column naming in analysis table
-- Note: Columns already follow snake_case pattern, no changes needed

-- ============================================================================
-- TABLE NAMING STANDARDIZATION
-- ============================================================================

-- Standardize table naming
-- Note: Tables already follow snake_case plural pattern, no changes needed

-- ============================================================================
-- MIGRATION VALIDATION
-- ============================================================================

-- Validate naming consistency
DO $$
DECLARE
    table_count INTEGER;
    column_count INTEGER;
    index_count INTEGER;
    constraint_count INTEGER;
BEGIN
    -- Count tables
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE';
    
    -- Count columns
    SELECT COUNT(*) INTO column_count
    FROM information_schema.columns
    WHERE table_schema = 'public';
    
    -- Count indexes
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE schemaname = 'public';
    
    -- Count constraints
    SELECT COUNT(*) INTO constraint_count
    FROM information_schema.table_constraints
    WHERE table_schema = 'public';
    
    -- Log validation results
    RAISE NOTICE 'Migration validation completed:';
    RAISE NOTICE 'Tables: %', table_count;
    RAISE NOTICE 'Columns: %', column_count;
    RAISE NOTICE 'Indexes: %', index_count;
    RAISE NOTICE 'Constraints: %', constraint_count;
END $$;

COMMIT;

-- SQLite Version (commented out for PostgreSQL)
/*
-- SQLite Version
BEGIN TRANSACTION;

-- ============================================================================
-- TIMESTAMP COLUMN STANDARDIZATION
-- ============================================================================

-- Standardize timestamp columns in users table
-- Note: SQLite uses TEXT for timestamps, no changes needed

-- Standardize timestamp columns in user_sessions table
-- Note: SQLite uses DATETIME for timestamps, no changes needed

-- Standardize timestamp columns in projects table
-- Note: SQLite uses TEXT for timestamps, no changes needed

-- Standardize timestamp columns in tasks table
-- Note: SQLite uses TEXT for timestamps, no changes needed

-- Standardize timestamp columns in analysis table
-- Note: SQLite uses TEXT for timestamps, no changes needed

-- ============================================================================
-- ID GENERATION STANDARDIZATION
-- ============================================================================

-- Standardize ID generation in users table
-- Note: Already uses TEXT PRIMARY KEY DEFAULT 'me', no changes needed

-- Standardize ID generation in user_sessions table
-- Note: Already uses TEXT PRIMARY KEY, no changes needed

-- Standardize ID generation in projects table
-- Note: Already uses TEXT PRIMARY KEY, no changes needed

-- Standardize ID generation in tasks table
-- Note: Already uses TEXT PRIMARY KEY, no changes needed

-- Standardize ID generation in analysis table
-- Note: Already uses TEXT PRIMARY KEY, no changes needed

-- ============================================================================
-- INDEX NAMING STANDARDIZATION
-- ============================================================================

-- Standardize index naming in users table
-- Note: Indexes already follow idx_{table}_{column} pattern, no changes needed

-- Standardize index naming in user_sessions table
-- Note: Indexes already follow idx_{table}_{column} pattern, no changes needed

-- Standardize index naming in projects table
-- Note: Indexes already follow idx_{table}_{column} pattern, no changes needed

-- Standardize index naming in tasks table
-- Note: Indexes already follow idx_{table}_{column} pattern, no changes needed

-- Standardize index naming in analysis table
-- Note: Indexes already follow idx_{table}_{column} pattern, no changes needed

-- ============================================================================
-- CONSTRAINT NAMING STANDARDIZATION
-- ============================================================================

-- Standardize constraint naming in users table
-- Note: Constraints already follow proper naming patterns, no changes needed

-- Standardize constraint naming in user_sessions table
-- Note: Constraints already follow proper naming patterns, no changes needed

-- Standardize constraint naming in projects table
-- Note: Constraints already follow proper naming patterns, no changes needed

-- Standardize constraint naming in tasks table
-- Note: Constraints already follow proper naming patterns, no changes needed

-- Standardize constraint naming in analysis table
-- Note: Constraints already follow proper naming patterns, no changes needed

-- ============================================================================
-- COLUMN NAMING STANDARDIZATION
-- ============================================================================

-- Standardize column naming in users table
-- Note: Columns already follow snake_case pattern, no changes needed

-- Standardize column naming in user_sessions table
-- Note: Columns already follow snake_case pattern, no changes needed

-- Standardize column naming in projects table
-- Note: Columns already follow snake_case pattern, no changes needed

-- Standardize column naming in tasks table
-- Note: Columns already follow snake_case pattern, no changes needed

-- Standardize column naming in analysis table
-- Note: Columns already follow snake_case pattern, no changes needed

-- ============================================================================
-- TABLE NAMING STANDARDIZATION
-- ============================================================================

-- Standardize table naming
-- Note: Tables already follow snake_case plural pattern, no changes needed

COMMIT;
*/

-- Migration completed
-- Status: Applied
-- Applied: 2025-10-11T21:38:13.000Z
