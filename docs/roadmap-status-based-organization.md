# PIDEA Roadmap Status-Based Organization System

## Overview

The PIDEA Roadmap Status-Based Organization System provides automated file organization and status management for roadmap tasks. This system automatically organizes task files based on their status, priority, and completion date, making it easier to manage and navigate the project roadmap.

## Features

### 🗂️ Automatic File Organization
- **Status-Based Structure**: Files are automatically organized by task status (pending, in_progress, completed, blocked, cancelled, failed)
- **Priority-Based Subfolders**: Pending tasks are further organized by priority (high, medium, low)
- **Quarter-Based Archives**: Completed tasks are organized by completion quarter (2024-q1, 2024-q2, etc.)
- **Category Organization**: Tasks are grouped by category (backend, frontend, security, etc.)

### 🔄 Automated Status Transitions
- **Real-Time Updates**: File organization updates automatically when task status changes
- **Database Synchronization**: Status changes are synchronized between database and file system
- **Reference Updates**: All file references are automatically updated when files are moved
- **Backup and Recovery**: Automatic backups are created before any file operations

### 📊 Comprehensive Reporting
- **Migration Reports**: Detailed reports on file migration operations
- **Status Analytics**: Analytics on task status distribution and trends
- **Performance Metrics**: Performance tracking for file operations
- **Error Logging**: Comprehensive error logging and recovery information

## Directory Structure

```
docs/09_roadmap/
├── pending/
│   ├── high-priority/
│   │   ├── backend/
│   │   ├── frontend/
│   │   └── security/
│   ├── medium-priority/
│   │   ├── backend/
│   │   ├── frontend/
│   │   └── security/
│   └── low-priority/
│       ├── backend/
│       ├── frontend/
│       └── security/
├── in-progress/
│   ├── backend/
│   ├── frontend/
│   └── security/
├── completed/
│   ├── 2024-q1/
│   │   ├── backend/
│   │   ├── frontend/
│   │   └── security/
│   ├── 2024-q2/
│   └── archive/
├── blocked/
│   ├── backend/
│   ├── frontend/
│   └── security/
├── cancelled/
│   ├── backend/
│   ├── frontend/
│   └── security/
└── failed/
    ├── backend/
    ├── frontend/
    └── security/
```

## Usage

### Migration Script

The migration script automatically moves all existing roadmap files to the new structure:

```bash
# Run the complete migration
node scripts/roadmap-status-migration.js

# The script will:
# 1. Discover all task files in docs/09_roadmap/tasks/
# 2. Parse metadata from each file
# 3. Determine target path based on status and priority
# 4. Move files to new structure
# 5. Update database records
# 6. Generate migration report
```

### Status Management

The status manager provides automated status transition management:

```bash
# Start automatic status transitions
node scripts/roadmap-status-manager.js start

# Stop automatic status transitions
node scripts/roadmap-status-manager.js stop

# Archive old completed tasks (older than 12 months)
node scripts/roadmap-status-manager.js archive 12
```

### Reference Updates

Update all hardcoded path references to use dynamic resolution:

```bash
# Update all references
node scripts/update-roadmap-references.js all

# Update only prompt templates
node scripts/update-roadmap-references.js prompts

# Update only service files
node scripts/update-roadmap-references.js services
```

## API Reference

### TaskService Methods

#### `getTaskFilePath(task)`
Returns the dynamic file path for a task based on its status and metadata.

**Parameters:**
- `task` (Object): Task object with status, priority, category, etc.

**Returns:**
- `string`: Dynamic file path

**Example:**
```javascript
const taskService = new TaskService();
const task = {
  id: 'task-123',
  status: 'completed',
  priority: 'high',
  category: 'backend',
  completedAt: '2024-03-15'
};

const filePath = taskService.getTaskFilePath(task);
// Returns: 'docs/09_roadmap/completed/2024-q1/backend/task-123/'
```

#### `getCompletionQuarter(completedAt)`
Returns the quarter string for a completion date.

**Parameters:**
- `completedAt` (string): Completion date string

**Returns:**
- `string`: Quarter string (e.g., '2024-q1')

#### `getPromptPath(promptType)`
Returns the dynamic path for a prompt template.

**Parameters:**
- `promptType` (string): Type of prompt (task-create, task-execute, etc.)

**Returns:**
- `string`: Dynamic prompt path

#### `getWorkflowPath(workflowType)`
Returns the dynamic path for a workflow file.

**Parameters:**
- `workflowType` (string): Type of workflow

**Returns:**
- `string`: Dynamic workflow path

### Workflow Steps

#### TaskStatusUpdateStep
Handles automatic task status updates and file organization.

**Configuration:**
```json
{
  "name": "update-task-status",
  "type": "status",
  "description": "Update task status and organize files",
  "step": "TaskStatusUpdateStep",
  "options": {
    "autoMoveFiles": true,
    "updateDatabase": true
  },
  "strict": false
}
```

**Options:**
- `taskId` (string, required): Task ID to update
- `newStatus` (string, required): New status for the task
- `autoMoveFiles` (boolean, default: true): Whether to automatically move files
- `updateDatabase` (boolean, default: true): Whether to update database record

#### TaskFileOrganizationStep
Handles automatic file organization based on task properties.

**Configuration:**
```json
{
  "name": "organize-task-files",
  "type": "organization",
  "description": "Organize task files based on status",
  "step": "TaskFileOrganizationStep",
  "options": {
    "createDirectories": true,
    "moveFiles": true,
    "updateReferences": true
  },
  "strict": false
}
```

**Options:**
- `taskId` (string, required): Task ID to organize
- `taskMetadata` (object): Task metadata including status, priority, category
- `createDirectories` (boolean, default: true): Whether to create directory structure
- `moveFiles` (boolean, default: true): Whether to move files to new location
- `updateReferences` (boolean, default: true): Whether to update file references

## Database Schema

### New Columns Added to Tasks Table

```sql
-- New columns for status-based organization
ALTER TABLE tasks ADD COLUMN file_path TEXT;
ALTER TABLE tasks ADD COLUMN target_path TEXT;
ALTER TABLE tasks ADD COLUMN organization_status TEXT DEFAULT 'pending';
ALTER TABLE tasks ADD COLUMN completion_quarter TEXT;
ALTER TABLE tasks ADD COLUMN auto_migration_enabled BOOLEAN DEFAULT true;

-- Performance indexes
CREATE INDEX idx_tasks_organization_status ON tasks(organization_status);
CREATE INDEX idx_tasks_completion_quarter ON tasks(completion_quarter);
CREATE INDEX idx_tasks_status_priority ON tasks(status, priority);
```

### Column Descriptions

- **file_path**: Current file path of the task
- **target_path**: Target path in the new organization structure
- **organization_status**: Migration status (pending, migrated, failed)
- **completion_quarter**: Quarter when task was completed (e.g., '2024-q1')
- **auto_migration_enabled**: Whether automatic migration is enabled for this task

## Configuration

### Environment Variables

```bash
# Enable automatic status transitions
ROADMAP_AUTO_STATUS_TRANSITIONS=true

# Enable automatic file organization
ROADMAP_AUTO_FILE_ORGANIZATION=true

# Archive completed tasks older than (months)
ROADMAP_ARCHIVE_THRESHOLD=12

# Enable backup before file operations
ROADMAP_ENABLE_BACKUPS=true
```

### Workflow Configuration

The system integrates with existing workflows through the workflow configuration files:

- `backend/framework/workflows/task-workflows.json`
- `backend/framework/workflows/task-creation-workflows.json`

## Error Handling

### Backup and Recovery

- **Automatic Backups**: All file operations create backups before execution
- **Rollback Support**: Failed operations can be rolled back using backup files
- **Transaction Safety**: Database operations use transactions for consistency

### Error Types

1. **File System Errors**: Permission denied, disk full, file not found
2. **Database Errors**: Connection failures, constraint violations
3. **Validation Errors**: Invalid status transitions, missing required fields
4. **Network Errors**: Remote file system access failures

### Recovery Procedures

1. **Automatic Recovery**: System attempts automatic recovery for transient errors
2. **Manual Recovery**: Manual recovery procedures for persistent errors
3. **Rollback**: Complete rollback to previous state if needed

## Performance Considerations

### Optimization Features

- **Batch Processing**: Multiple files processed in batches for efficiency
- **Parallel Operations**: File operations run in parallel where possible
- **Caching**: Path resolution results are cached for performance
- **Indexing**: Database indexes optimize query performance

### Performance Metrics

- **File Migration**: < 5 seconds per file
- **Batch Processing**: 154 files in < 10 minutes
- **Memory Usage**: < 100MB for migration operations
- **Database Queries**: Optimized with proper indexes

## Troubleshooting

### Common Issues

1. **Permission Denied**
   - Ensure proper file system permissions
   - Check user/group ownership of directories

2. **Database Connection Failed**
   - Verify database connection settings
   - Check database server status

3. **Invalid Status Transition**
   - Review status transition rules
   - Check task metadata for required fields

4. **File Not Found**
   - Verify file paths in database
   - Check if files were moved manually

### Debug Mode

Enable debug logging for troubleshooting:

```bash
# Set debug level
export LOG_LEVEL=debug

# Run migration with debug output
node scripts/roadmap-status-migration.js
```

### Log Files

- **Migration Logs**: `logs/roadmap-migration-report.json`
- **Status Management Logs**: `logs/status-manager.log`
- **Reference Update Logs**: `logs/reference-update-report.json`

## Migration Guide

### Pre-Migration Checklist

1. **Backup Database**: Create full database backup
2. **Backup Files**: Create backup of all roadmap files
3. **Test Environment**: Test migration in development environment
4. **Review Dependencies**: Check all dependent systems

### Migration Steps

1. **Run Database Migration**: Apply schema changes
2. **Run File Migration**: Execute roadmap status migration
3. **Update References**: Update all hardcoded path references
4. **Start Status Manager**: Enable automatic status transitions
5. **Verify Results**: Validate migration results

### Post-Migration Validation

1. **File Structure**: Verify new directory structure
2. **Database Records**: Check updated database records
3. **Reference Integrity**: Verify all references are working
4. **Performance**: Monitor system performance
5. **Functionality**: Test all affected functionality

## Support

### Documentation

- **API Documentation**: Complete API reference
- **User Guide**: Step-by-step usage instructions
- **Developer Guide**: Implementation details and customization
- **Troubleshooting Guide**: Common issues and solutions

### Contact

For support and questions:
- **Documentation**: Check this guide and related documentation
- **Issues**: Report issues through the project issue tracker
- **Development**: Contact the development team for technical support

---

**Last Updated**: 2025-09-19T19:22:57.000Z
**Version**: 1.0.0
**Status**: Implementation Complete ✅
