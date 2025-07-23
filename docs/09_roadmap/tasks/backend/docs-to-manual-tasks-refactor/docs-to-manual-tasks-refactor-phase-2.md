# Docs Tasks to Manual Tasks Refactor – Phase 2: Frontend Component Refactoring

## Overview
Rename all frontend components, CSS classes, and API method calls from "docs tasks" to "manual tasks" terminology. This phase focuses on the user interface and frontend integration changes.

## Objectives
- [ ] Rename DocsTaskDetailsModal to ManualTaskDetailsModal
- [ ] Update all component imports and references
- [ ] Rename CSS classes from docs-task-* to manual-task-*
- [ ] Update API method names in repositories
- [ ] Update UI text and labels

## Deliverables
- File: `frontend/src/presentation/components/chat/modal/ManualTaskDetailsModal.jsx` - Renamed from DocsTaskDetailsModal
- File: `frontend/src/css/modal/manual-task-details-modal.css` - Renamed from task-docs-details-modal.css
- File: `frontend/src/infrastructure/repositories/APIChatRepository.jsx` - Updated API method names
- File: `frontend/src/presentation/components/chat/sidebar-right/TasksPanelComponent.jsx` - Updated component references
- File: `frontend/src/css/global/sidebar-right.css` - Updated CSS classes

## Dependencies
- Requires: Phase 1 completion (backend service refactoring)
- Blocks: Phase 3 start (test files refactoring)

## Estimated Time
2 hours

## Success Criteria
- [ ] All frontend components renamed from "docs" to "manual"
- [ ] All CSS classes updated consistently
- [ ] All API method calls updated
- [ ] All component imports and references updated
- [ ] UI text and labels updated
- [ ] No build errors introduced
- [ ] All frontend tests pass

## Implementation Details

### 1. Component Renaming
```javascript
// DocsTaskDetailsModal.jsx → ManualTaskDetailsModal.jsx
const ManualTaskDetailsModal = ({
    task,
    isOpen,
    onClose,
    onSendToChat
}) => {
    // Implementation remains the same, just renamed
};

export default ManualTaskDetailsModal;
```

### 2. CSS Class Updates
```css
/* task-docs-details-modal.css → manual-task-details-modal.css */
.manual-task-modal-overlay {
    /* Renamed from .docs-task-modal-overlay */
}

.manual-task-modal {
    /* Renamed from .docs-task-modal */
}

.manual-task-item {
    /* Renamed from .docs-task-item */
}
```

### 3. API Method Updates
```javascript
// APIChatRepository.jsx
async getManualTasks(projectId = null) {
    // Renamed from getDocsTasks
}

async getManualTaskDetails(taskId, projectId = null) {
    // Renamed from getDocsTaskDetails
}

async syncManualTasks() {
    // Renamed from syncDocsTasks
}

async cleanManualTasks() {
    // Renamed from cleanDocsTasks
}
```

### 4. Component Reference Updates
```javascript
// TasksPanelComponent.jsx
import ManualTaskDetailsModal from '../modal/ManualTaskDetailsModal.jsx';

// Update all references
<ManualTaskDetailsModal
    task={selectedTask}
    isOpen={isModalOpen}
    onClose={handleCloseModal}
    onSendToChat={handleSendToChat}
/>
```

### 5. UI Text Updates
```javascript
// Update all user-facing text
const handleSyncManualTasks = async () => {
    // Renamed from handleSyncDocsTasks
    setFeedback(`✅ Successfully synced ${response.data.importedCount} manual tasks to database`);
};

const handleCleanManualTasks = async () => {
    // Renamed from handleCleanDocsTasks
    if (!window.confirm('🗑️ Are you sure you want to delete ALL manual tasks from the database? This cannot be undone!')) {
        return;
    }
};
```

## Testing Checklist
- [ ] Verify all renamed components load correctly
- [ ] Test API method calls with new naming
- [ ] Verify CSS classes apply correctly
- [ ] Test manual task details modal functionality
- [ ] Test manual tasks sync functionality
- [ ] Test manual tasks cleanup functionality
- [ ] Verify error handling works with new naming
- [ ] Check that all imports resolve correctly
- [ ] Verify UI text displays correctly

## Rollback Plan
- Git revert available for all changes
- No database changes to rollback
- Component rollback procedure documented

## Notes
- This phase maintains all existing functionality
- Only naming changes, no logic modifications
- All error handling patterns preserved
- User interface text updated for clarity
- CSS classes updated systematically 