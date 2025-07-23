# Docs Tasks to Manual Tasks Refactor – Phase 4: Documentation Updates

## Overview
Update all documentation files, prompt files, and inline comments from "docs tasks" to "manual tasks" terminology. This phase ensures all documentation reflects the new naming consistently.

## Objectives
- [ ] Update all prompt files with new naming
- [ ] Update documentation references
- [ ] Update comments and inline documentation
- [ ] Update README files if needed
- [ ] Verify all documentation is consistent

## Deliverables
- File: `content-library/prompts/task-management/task-create.md` - Updated references
- File: `content-library/prompts/task-management/task-execute.md` - Updated references
- File: `content-library/prompts/task-management/task-review.md` - Updated references
- File: `content-library/prompts/task-management/task-analyze.md` - Updated references
- File: `content-library/prompts/task-management/task-index-manager.md` - Updated references
- File: `content-library/prompts/task-management/task-review-phases.md` - Updated references
- Documentation: All inline comments updated
- Documentation: All README files updated if needed

## Dependencies
- Requires: Phase 3 completion (test files refactoring)
- Blocks: Phase 5 start (integration testing)

## Estimated Time
1 hour

## Success Criteria
- [ ] All prompt files updated with new naming
- [ ] All documentation references updated
- [ ] All inline comments updated
- [ ] All README files updated if needed
- [ ] Documentation is consistent throughout
- [ ] No broken references in documentation
- [ ] All documentation is accurate and up-to-date

## Implementation Details

### 1. Prompt File Updates
```markdown
# task-create.md
## Manual Task Creation
Create manual tasks from markdown documentation files.

### Features
- Import manual tasks from workspace
- Sync manual tasks to database
- Clean manual tasks from database
```

```markdown
# task-execute.md
## Manual Task Execution
Execute manual tasks with AI assistance.

### Manual Task Management
- View manual task details
- Execute manual task steps
- Track manual task progress
```

```markdown
# task-review.md
## Manual Task Review
Review and validate manual task implementations.

### Manual Task Validation
- Validate manual task requirements
- Check manual task implementation
- Review manual task quality
```

### 2. Inline Comment Updates
```javascript
// Update all inline comments
/**
 * Manual Tasks Import Service
 * Imports manual tasks directly from workspace into database
 */
class ManualTasksImportService {
    /**
     * Import manual tasks from workspace
     * @param {string} projectId - Project identifier
     * @param {string} workspacePath - Workspace path
     * @returns {Promise<Object>} Import result
     */
    async importManualTasksFromWorkspace(projectId, workspacePath) {
        // Implementation for manual tasks import
    }
}
```

### 3. README File Updates
```markdown
# README.md
## Manual Task Management
The system provides comprehensive manual task management capabilities.

### Features
- **Manual Task Sync**: Import tasks from markdown files
- **Manual Task Cleanup**: Remove tasks from database
- **Manual Task Details**: View full task information
```

### 4. API Documentation Updates
```markdown
# API Documentation
## Manual Tasks API

### Endpoints
- `POST /api/projects/:projectId/tasks/sync-manual` - Sync manual tasks
- `POST /api/projects/:projectId/tasks/clean-manual` - Clean manual tasks
- `GET /api/projects/:projectId/tasks` - Get manual tasks
```

## Testing Checklist
- [ ] Verify all prompt files are updated
- [ ] Check all documentation references are correct
- [ ] Verify all inline comments are updated
- [ ] Check all README files are updated
- [ ] Verify documentation consistency
- [ ] Check for any broken references
- [ ] Verify documentation accuracy
- [ ] Test documentation links work correctly

## Rollback Plan
- Git revert available for all changes
- No database changes to rollback
- Documentation rollback procedure documented

## Notes
- This phase maintains all existing documentation structure
- Only naming changes, no content modifications
- All documentation patterns preserved
- Documentation updated systematically
- Links and references updated for accuracy 