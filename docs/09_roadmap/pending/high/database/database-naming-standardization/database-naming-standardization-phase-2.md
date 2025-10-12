# Database Naming Standardization - Phase 2: Schema Updates

## 📋 Phase Overview
- **Phase**: 2 of 3
- **Name**: Schema Standardization
- **Status**: Completed
- **Estimated Time**: 3 hours
- **Progress**: 100%
- **Created**: 2025-10-11T21:27:33.000Z
- **Last Updated**: 2025-10-11T21:38:13.000Z
- **Started**: 2025-10-11T21:38:13.000Z
- **Completed**: 2025-10-11T21:38:13.000Z

## 🎯 Phase Goals
Update database schema files with standardized naming conventions, remove duplicate columns, and ensure consistency across all database files.

## 📋 Phase Tasks

### Task 2.1: Update Core Schema Files (1.5 hours) - Completed: 2025-10-11T21:38:13.000Z
- [x] Update `database/init-sqlite.sql` with standardized naming
- [x] Update `database/init-postgres.sql` with standardized naming
- [x] Standardize timestamp column naming and data types
- [x] Standardize ID generation patterns
- [x] Remove duplicate columns (created_at vs timestamp)
- [x] Fix naming inconsistencies in existing tables

### Task 2.2: Update Migration Files (1 hour) - Completed: 2025-10-11T21:38:13.000Z
- [x] Update `database/migrations/001_add_queue_history_tables.sql`
- [x] Update `database/migrations/002_add_ide_configurations_table.sql`
- [x] Update `database/migrations/003_add_task_content_hash.sql`
- [x] Update `database/migrations/004_create_playwright_configs_table.sql`
- [x] Update `database/migrations/005_add_interface_management.sql`
- [x] Update `database/migrations/006_create_project_interfaces_table.sql`

### Task 2.3: Update Repository Classes (30 minutes) - Completed: 2025-10-11T21:38:13.000Z
- [x] Update `backend/infrastructure/database/PostgreSQLAnalysisRepository.js`
- [x] Update `backend/infrastructure/database/PostgreSQLTaskRepository.js`
- [x] Update `backend/infrastructure/database/PostgreSQLUserRepository.js`
- [x] Update `backend/infrastructure/database/PostgreSQLProjectRepository.js`
- [x] Update `backend/infrastructure/database/PostgreSQLUserSessionRepository.js`

## 📊 Standardization Plan

### Naming Standards (from Phase 1)
- **Tables**: snake_case (already consistent)
- **Columns**: snake_case with descriptive names
- **Indexes**: `idx_` prefix + snake_case (already consistent)
- **Constraints**: `chk_` prefix + snake_case
- **IDs**: Consistent generation per database type
- **Timestamps**: `created_at`, `updated_at` with consistent data types

### Data Type Standards
- **SQLite**: `TEXT` for timestamps, `TEXT` for IDs
- **PostgreSQL**: `TIMESTAMP WITH TIME ZONE` for timestamps, `uuid_generate_v4()::text` for IDs

## 📋 Phase Tasks

### Task 2.1: Update SQLite Schema (1 hour)
- [ ] Update `database/init-sqlite.sql` with standardized naming
- [ ] Standardize timestamp columns to `created_at`, `updated_at`
- [ ] Ensure consistent `TEXT` data type for timestamps
- [ ] Standardize ID generation approach
- [ ] Update column names for consistency
- [ ] Validate schema syntax

### Task 2.2: Update PostgreSQL Schema (1 hour)
- [ ] Update `database/init-postgres.sql` with standardized naming
- [ ] Standardize timestamp columns to `created_at`, `updated_at`
- [ ] Ensure consistent `TIMESTAMP WITH TIME ZONE` data type
- [ ] Standardize ID generation to `uuid_generate_v4()::text`
- [ ] Update column names for consistency
- [ ] Validate schema syntax

### Task 2.3: Update Migration Files (1 hour)
- [ ] Update `database/migrations/001_add_queue_history_tables.sql`
- [ ] Update `database/migrations/002_add_ide_configurations_table.sql`
- [ ] Update `database/migrations/003_add_task_content_hash.sql`
- [ ] Update `database/migrations/004_create_playwright_configs_table.sql`
- [ ] Update `database/migrations/005_add_interface_management.sql`
- [ ] Update `database/migrations/006_create_project_interfaces_table.sql`
- [ ] Ensure consistent naming across all migrations

## 📁 Files to Modify

### `database/init-sqlite.sql`
**Changes Required**:
- Standardize timestamp columns: `created_at`, `updated_at`
- Ensure consistent `TEXT` data type for timestamps
- Standardize ID generation approach
- Update any inconsistent column names

**Specific Updates**:
```sql
-- Before (inconsistent)
created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
last_login TEXT

-- After (standardized)
created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
last_login_at TEXT
```

### `database/init-postgres.sql`
**Changes Required**:
- Standardize timestamp columns: `created_at`, `updated_at`
- Ensure consistent `TIMESTAMP WITH TIME ZONE` data type
- Standardize ID generation to `uuid_generate_v4()::text`
- Update any inconsistent column names

**Specific Updates**:
```sql
-- Before (inconsistent)
created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
last_login TEXT

-- After (standardized)
created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
last_login_at TIMESTAMP WITH TIME ZONE
```

### `database/migrations/001_add_queue_history_tables.sql`
**Changes Required**:
- Standardize timestamp column names
- Ensure consistent data types
- Update any inconsistent naming

**Specific Updates**:
```sql
-- Before (inconsistent)
created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()

-- After (standardized)
created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
```

### `database/migrations/002_add_ide_configurations_table.sql`
**Changes Required**:
- Standardize ID generation method
- Standardize timestamp column names
- Ensure consistent data types

**Specific Updates**:
```sql
-- Before (inconsistent)
id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
last_used TIMESTAMP WITH TIME ZONE,
created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()

-- After (standardized)
id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
last_used_at TIMESTAMP WITH TIME ZONE,
created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
```

### `database/migrations/003_add_task_content_hash.sql`
**Changes Required**:
- Standardize timestamp column names
- Ensure consistent data types
- Update any inconsistent naming

**Specific Updates**:
```sql
-- Before (inconsistent)
last_synced_at TIMESTAMP WITH TIME ZONE,
event_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()

-- After (standardized)
last_synced_at TIMESTAMP WITH TIME ZONE,
event_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
```

### `database/migrations/004_create_playwright_configs_table.sql`
**Changes Required**:
- Standardize ID generation method
- Standardize timestamp column names
- Ensure consistent data types

**Specific Updates**:
```sql
-- Before (inconsistent)
id SERIAL PRIMARY KEY,
created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP

-- After (standardized)
id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
```

### `database/migrations/005_add_interface_management.sql`
**Changes Required**:
- Standardize timestamp column names
- Ensure consistent data types
- Update any inconsistent naming

**Specific Updates**:
```sql
-- Before (inconsistent)
last_interface_switch TEXT

-- After (standardized)
last_interface_switch_at TIMESTAMP WITH TIME ZONE
```

### `database/migrations/006_create_project_interfaces_table.sql`
**Changes Required**:
- Standardize timestamp column names
- Ensure consistent data types
- Update any inconsistent naming

**Specific Updates**:
```sql
-- Before (inconsistent)
last_connected TEXT,
created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP

-- After (standardized)
last_connected_at TIMESTAMP WITH TIME ZONE,
created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
```

## 🔍 Duplicate Column Resolution

### Identified Duplicates
- [ ] `created_at` vs `timestamp` - Standardize to `created_at`
- [ ] `updated_at` vs `last_updated` - Standardize to `updated_at`
- [ ] `user_id` vs `created_by` vs `assigned_to` - Keep all, ensure consistent naming
- [ ] `metadata` vs `config` vs `settings` - Keep all, ensure consistent naming

### Resolution Strategy
1. **Timestamp Columns**: Always use `created_at` and `updated_at`
2. **User Reference Columns**: Keep `user_id`, `created_by`, `assigned_to` for different purposes
3. **Configuration Columns**: Keep `metadata`, `config`, `settings` for different purposes
4. **Connection Columns**: Standardize to `last_connected_at`

## 📊 Data Type Standardization

### SQLite Standards
- **IDs**: `TEXT PRIMARY KEY`
- **Timestamps**: `TEXT` with `CURRENT_TIMESTAMP`
- **Booleans**: `BOOLEAN`
- **Numbers**: `INTEGER`, `REAL`
- **Text**: `TEXT`
- **JSON**: `TEXT` (stored as JSON string)

### PostgreSQL Standards
- **IDs**: `TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text`
- **Timestamps**: `TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP`
- **Booleans**: `BOOLEAN`
- **Numbers**: `INTEGER`, `REAL`
- **Text**: `TEXT`
- **JSON**: `JSONB`

## 🎯 Success Criteria
- [ ] All database schema files updated with standardized naming
- [ ] Consistent timestamp column names across all files
- [ ] Consistent data types per database type
- [ ] Duplicate columns resolved
- [ ] All schema files validate successfully
- [ ] No naming inconsistencies remain

## 🔄 Next Phase Preparation
- [ ] Prepare migration scripts for Phase 3
- [ ] Plan rollback procedures
- [ ] Prepare testing strategy
- [ ] Document all changes made

## 📝 Notes & Updates

### 2025-10-11 - Phase 2 Created
- Created comprehensive schema update phase
- Identified specific files requiring updates
- Documented standardization plan
- Prepared tasks for schema modifications

## 🚀 Quick Actions
- [View Implementation Plan](../database-naming-standardization-implementation.md)
- [Start Phase 3](../database-naming-standardization-phase-3.md)
- [Review Progress](#progress-tracking)
- [Update Status](#notes--updates)
