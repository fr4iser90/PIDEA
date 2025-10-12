# Database Naming Standards

## Overview
This document defines the naming standards for all database objects in the PIDEA project. These standards ensure consistency, improve maintainability, and reduce errors across all database files.

## Table Naming Standards

### Pattern
- **Format**: `snake_case` plural nouns
- **Examples**: `users`, `projects`, `tasks`, `user_sessions`
- **Avoid**: Mixed singular/plural, camelCase, PascalCase

### Rules
1. Use plural nouns for table names
2. Use snake_case (lowercase with underscores)
3. Be descriptive but concise
4. Avoid abbreviations unless they are widely understood

### Examples
```sql
-- ✅ Good
CREATE TABLE users (...);
CREATE TABLE user_sessions (...);
CREATE TABLE project_interfaces (...);

-- ❌ Bad
CREATE TABLE User (...);           -- PascalCase
CREATE TABLE userSession (...);    -- camelCase
CREATE TABLE user (...);           -- Singular
CREATE TABLE usr (...);           -- Abbreviation
```

## Column Naming Standards

### Pattern
- **Format**: `snake_case` descriptive names
- **Examples**: `created_at`, `user_id`, `is_active`

### Standard Columns
- **Primary Key**: `id`
- **Foreign Keys**: `{table_name}_id`
- **Timestamps**: `created_at`, `updated_at`, `deleted_at`
- **Status Fields**: `status`, `is_active`, `is_default`
- **Metadata**: `metadata`, `config`, `settings`

### Rules
1. Use snake_case for all column names
2. Be descriptive and clear
3. Use consistent naming for similar concepts
4. Avoid reserved words

### Examples
```sql
-- ✅ Good
CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    metadata TEXT
);

-- ❌ Bad
CREATE TABLE tasks (
    ID TEXT PRIMARY KEY,           -- Uppercase
    projectId TEXT NOT NULL,       -- camelCase
    task_title TEXT NOT NULL,      -- Redundant prefix
    desc TEXT,                     -- Abbreviation
    active BOOLEAN DEFAULT true    -- Inconsistent naming
);
```

## Index Naming Standards

### Pattern
- **Format**: `idx_{table_name}_{column_name(s)}`
- **Examples**: `idx_users_email`, `idx_tasks_project_id`

### Rules
1. Use `idx_` prefix
2. Include table name
3. Include column name(s)
4. Use snake_case

### Examples
```sql
-- ✅ Good
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_project_status ON tasks(project_id, status);

-- ❌ Bad
CREATE INDEX email_index ON users(email);           -- No table name
CREATE INDEX idxUsersEmail ON users(email);         -- camelCase
CREATE INDEX users_email_idx ON users(email);       -- Wrong prefix order
```

## Constraint Naming Standards

### Pattern
- **Primary Key**: `pk_{table_name}`
- **Foreign Key**: `fk_{table_name}_{column_name}`
- **Unique Constraint**: `uk_{table_name}_{column_name}`
- **Check Constraint**: `chk_{table_name}_{column_name}`

### Rules
1. Use descriptive prefixes
2. Include table name
3. Include column name for foreign keys and constraints
4. Use snake_case

### Examples
```sql
-- ✅ Good
ALTER TABLE users ADD CONSTRAINT pk_users PRIMARY KEY (id);
ALTER TABLE tasks ADD CONSTRAINT fk_tasks_project_id FOREIGN KEY (project_id) REFERENCES projects(id);
ALTER TABLE users ADD CONSTRAINT uk_users_email UNIQUE (email);
ALTER TABLE tasks ADD CONSTRAINT chk_tasks_status CHECK (status IN ('pending', 'in_progress', 'completed'));

-- ❌ Bad
ALTER TABLE users ADD CONSTRAINT primary_key PRIMARY KEY (id);  -- Generic name
ALTER TABLE tasks ADD CONSTRAINT fk1 FOREIGN KEY (project_id) REFERENCES projects(id);  -- Numbered
```

## ID Generation Standards

### PostgreSQL
- **UUIDs**: `uuid_generate_v4()::text`
- **Integers**: `SERIAL` or `BIGSERIAL`
- **Default Values**: Always provide default values

### SQLite
- **UUIDs**: `TEXT PRIMARY KEY` (application generates UUIDs)
- **Integers**: `INTEGER PRIMARY KEY` (auto-increment)
- **Default Values**: Always provide default values

### Examples
```sql
-- PostgreSQL
CREATE TABLE users (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    email TEXT UNIQUE NOT NULL
);

-- SQLite
CREATE TABLE users (
    id TEXT PRIMARY KEY,  -- Application generates UUID
    email TEXT UNIQUE NOT NULL
);

-- Both (Integer ID)
CREATE TABLE configs (
    id SERIAL PRIMARY KEY,  -- PostgreSQL
    -- id INTEGER PRIMARY KEY,  -- SQLite
    name TEXT NOT NULL
);
```

## Timestamp Standards

### Data Types
- **PostgreSQL**: `TIMESTAMP WITH TIME ZONE`
- **SQLite**: `TEXT` (ISO 8601 format)

### Column Names
- **Creation**: `created_at`
- **Update**: `updated_at`
- **Deletion**: `deleted_at`
- **Event**: `event_timestamp`

### Examples
```sql
-- PostgreSQL
CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- SQLite
CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

## Migration Standards

### File Naming
- **Format**: `{number}_{description}.sql`
- **Examples**: `001_create_users_table.sql`, `002_add_indexes.sql`

### Migration Structure
```sql
-- Migration: {number}_{description}
-- Description: {detailed description}
-- Created: {timestamp}
-- Version: {version}
-- Status: Pending

-- PostgreSQL Version
BEGIN;

-- Migration content here

COMMIT;

-- SQLite Version (commented out for PostgreSQL)
/*
-- SQLite Version
BEGIN TRANSACTION;

-- Migration content here

COMMIT;
*/

-- Migration completed
-- Status: Applied
-- Applied: {timestamp}
```

## Validation Rules

### Table Names
- Must be plural nouns
- Must use snake_case
- Must be descriptive
- Must not conflict with reserved words

### Column Names
- Must use snake_case
- Must be descriptive
- Must not conflict with reserved words
- Must follow standard patterns for common columns

### Index Names
- Must start with `idx_`
- Must include table name
- Must include column name(s)
- Must use snake_case

### Constraint Names
- Must use appropriate prefix (`pk_`, `fk_`, `uk_`, `chk_`)
- Must include table name
- Must include column name for foreign keys and constraints
- Must use snake_case

## Enforcement

### Code Review
- All database changes must follow these standards
- Code reviews must check naming compliance
- Automated tools should validate naming patterns

### Migration Validation
- All migration scripts must follow naming standards
- Migration tests must validate naming consistency
- Rollback procedures must maintain naming standards

### Documentation
- All database objects must be documented
- Naming decisions must be justified
- Standards must be updated as needed

## Examples

### Complete Table Example
```sql
-- ✅ Good: Complete table with proper naming
CREATE TABLE project_interfaces (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    project_id TEXT NOT NULL,
    interface_name TEXT NOT NULL,
    interface_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'inactive',
    is_default BOOLEAN DEFAULT false,
    priority INTEGER DEFAULT 0,
    metadata TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by TEXT NOT NULL DEFAULT 'me',
    
    CONSTRAINT pk_project_interfaces PRIMARY KEY (id),
    CONSTRAINT fk_project_interfaces_project_id FOREIGN KEY (project_id) REFERENCES projects (id),
    CONSTRAINT fk_project_interfaces_created_by FOREIGN KEY (created_by) REFERENCES users (id),
    CONSTRAINT uk_project_interfaces_project_name UNIQUE (project_id, interface_name),
    CONSTRAINT chk_project_interfaces_status CHECK (status IN ('active', 'inactive', 'error', 'connecting')),
    CONSTRAINT chk_project_interfaces_priority CHECK (priority >= 0 AND priority <= 100)
);

-- Indexes
CREATE INDEX idx_project_interfaces_project_id ON project_interfaces(project_id);
CREATE INDEX idx_project_interfaces_type ON project_interfaces(interface_type);
CREATE INDEX idx_project_interfaces_status ON project_interfaces(status);
CREATE INDEX idx_project_interfaces_default ON project_interfaces(project_id, is_default) WHERE is_default = true;
CREATE INDEX idx_project_interfaces_priority ON project_interfaces(priority);
CREATE INDEX idx_project_interfaces_created_by ON project_interfaces(created_by);
CREATE INDEX idx_project_interfaces_created_at ON project_interfaces(created_at);
```

## Conclusion

These naming standards ensure consistency across all database objects in the PIDEA project. Following these standards will improve maintainability, reduce errors, and make the database easier to understand and work with.

For questions or suggestions about these standards, please refer to the database team or create an issue in the project repository.
