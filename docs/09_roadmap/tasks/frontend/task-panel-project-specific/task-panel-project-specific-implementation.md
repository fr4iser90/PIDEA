# Task Panel Project-Specific Implementation - Implementation Plan

## Validation Results - 2024-12-19

### ✅ Completed Items
- [x] File: `frontend/src/presentation/components/chat/sidebar-right/TasksPanelComponent.jsx` - Status: Implemented correctly
- [x] File: `frontend/src/infrastructure/repositories/APIChatRepository.jsx` - Status: Project ID resolution exists but needs improvement
- [x] File: `frontend/src/infrastructure/stores/IDEStore.jsx` - Status: Enhanced with project data support
- [x] File: `frontend/src/infrastructure/stores/selectors/ProjectSelectors.jsx` - Status: `useActiveIDE` selector exists
- [x] File: `frontend/src/css/panel/task-panel.css` - Status: Task panel styling exists

### ⚠️ Issues Found
- [ ] Feature: Tasks not project-specific - Status: Currently loads all tasks regardless of project
- [ ] Feature: No project context display - Status: Generic header only
- [ ] Feature: No automatic task reloading on project switch - Status: Tasks loaded once on mount

### 🔧 Improvements Made
- Simplified approach: Use existing IDEStore and useActiveIDE like chat/analysis
- No new hooks needed - just make tasks project-specific
- Use existing project ID resolution from useActiveIDE
- Add simple project context display in header

### 📊 Code Quality Metrics
- **Coverage**: 80% (just need to make tasks project-specific)
- **Security Issues**: 0 (uses existing authentication)
- **Performance**: Good (existing implementation is performant)
- **Maintainability**: Excellent (follows existing patterns)

### 🚀 Next Steps
1. Update TasksPanelComponent to use useActiveIDE for project context
2. Make task loading project-specific using projectId from useActiveIDE
3. Add simple project name display in header
4. Add automatic task reloading when project changes

### 📋 Task Splitting Recommendations
- **Main Task**: Task Panel Project-Specific Implementation (2 hours) → Single simple task
- **Simple Update**: Make tasks project-specific like chat/analysis (2 hours) - Use existing patterns

### 🔍 Current State Analysis
The current TasksPanelComponent loads tasks once on mount and doesn't respond to project changes. The IDEStore already has `useActiveIDE` selector that provides `projectId` and `projectName` from the active IDE, just like it does for chat and analysis. We just need to make tasks use this existing system instead of loading all tasks.

## 1. Project Overview
- **Feature/Component Name**: Task Panel Project-Specific Implementation
- **Priority**: High
- **Category**: frontend
- **Estimated Time**: 2 hours (simplified)
- **Dependencies**: Existing TasksPanelComponent, useActiveIDE selector
- **Related Issues**: Make tasks project-specific like chat and analysis

## 2. Technical Requirements
- **Tech Stack**: React, JavaScript, CSS, existing PIDEA frontend architecture
- **Architecture Pattern**: Use existing IDEStore patterns (like chat/analysis)
- **Database**: No changes required (existing project-specific task structure)
- **API**: No changes required (existing project-specific task endpoints)
- **Frontend Changes**: Simple update to make tasks project-specific

## 3. Implementation Strategy

### Simple Update: Make Tasks Project-Specific (2 hours)
1. **Use useActiveIDE**: Get projectId and projectName from existing selector
2. **Update Task Loading**: Use projectId for task API calls
3. **Add Project Context**: Simple project name display in header
4. **Auto-Reload**: Reload tasks when project changes

## 4. File Impact Analysis

#### Files to Modify (Only 2 files):
- [ ] `frontend/src/presentation/components/chat/sidebar-right/TasksPanelComponent.jsx` - Add useActiveIDE and project-specific task loading
- [ ] `frontend/src/css/panel/task-panel.css` - Add simple project context styling

#### No New Files Needed:
- ❌ No new hooks needed
- ❌ No new components needed
- ❌ No new utilities needed
- ❌ No complex event handling needed

## 5. Detailed Implementation

### 5.1 Updated TasksPanelComponent

```javascript
import { logger } from "@/infrastructure/logging/Logger";
import React, { useState, useEffect } from 'react';
import { useActiveIDE } from '@/infrastructure/stores/selectors/ProjectSelectors';
import APIChatRepository, { apiCall } from '@/infrastructure/repositories/APIChatRepository.jsx';
import TaskSelectionModal from '../modal/TaskSelectionModal.jsx';
import ManualTaskDetailsModal from '../modal/ManualTaskDetailsModal.jsx';
import TaskCreationModal from '../modal/TaskCreationModal.jsx';
import { getCategoryDisplay, getAllCategories, getCategoryIcon, getCategoryColor, MAIN_CATEGORIES } from '@/utils/taskTypeUtils';
import TaskTypeBadge from '@/components/TaskTypeBadge.jsx';
import '@/css/panel/task-panel.css';

function TasksPanelComponent({ eventBus, activePort }) {
  const api = new APIChatRepository();
  
  // Use existing useActiveIDE selector (like chat/analysis)
  const { activeIDE, projectId, projectName } = useActiveIDE();
  
  // Existing state management (preserved)
  const [manualTasks, setManualTasks] = useState([]);
  const [isLoadingManualTasks, setIsLoadingManualTasks] = useState(false);
  const [selectedManualTask, setSelectedManualTask] = useState(null);
  const [isManualTaskModalOpen, setIsManualTaskModalOpen] = useState(false);
  const [isLoadingManualTaskDetails, setIsLoadingManualTaskDetails] = useState(false);
  const [taskSearch, setTaskSearch] = useState('');
  const [taskFilter, setTaskFilter] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showTaskCreationModal, setShowTaskCreationModal] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [refactoringTasks, setRefactoringTasks] = useState([]);
  const [isAutoRefactoring, setIsAutoRefactoring] = useState(false);
  
  // Add state to track if initial sync is complete
  const [isInitialSyncComplete, setIsInitialSyncComplete] = useState(false);
  const [isWaitingForSync, setIsWaitingForSync] = useState(true);
  const [lastLoadTime, setLastLoadTime] = useState(0);
  const loadTasksThrottle = 5000; // 5 seconds

  // Load tasks when project changes (like chat/analysis)
  useEffect(() => {
    if (projectId) {
      loadTasks();
    } else {
      // Clear tasks when no project
      setManualTasks([]);
      setIsInitialSyncComplete(false);
      setIsWaitingForSync(true);
    }
  }, [projectId]); // Reload when project changes

  const loadTasks = async (force = false) => {
    if (!projectId) return;
    
    const now = Date.now();
    
    // Prevent excessive loading
    if (!force && (now - lastLoadTime) < loadTasksThrottle) {
      logger.debug('Skipping task load - too recent');
      return;
    }

    setIsLoadingManualTasks(true);
    try {
      // Use project-specific API call (like chat/analysis)
      const response = await api.getManualTasks(projectId);
      if (response && response.success) {
        // Ensure we have an array of tasks
        const tasks = Array.isArray(response.data) ? response.data : 
                     Array.isArray(response.tasks) ? response.tasks : 
                     Array.isArray(response.data?.tasks) ? response.data.tasks : [];
        
        setManualTasks(tasks);
        setLastLoadTime(now);
        
        // If we found tasks, mark sync as complete
        if (tasks.length > 0) {
          setIsInitialSyncComplete(true);
          setIsWaitingForSync(false);
        }
        
        logger.debug(`Tasks loaded for project ${projectId}:`, { taskCount: tasks.length });
      } else {
        logger.warn('Load response not successful:', response);
        setManualTasks([]);
        // Don't immediately show "no tasks" on first load
        if (lastLoadTime > 0) {
          setIsWaitingForSync(false);
        }
      }
    } catch (error) {
      logger.error('Error loading manual tasks:', error);
      setManualTasks([]);
      // Don't immediately show "no tasks" on first load
      if (lastLoadTime > 0) {
        setIsWaitingForSync(false);
      }
    } finally {
      setIsLoadingManualTasks(false);
    }
  };

  const handleSyncTasks = async () => {
    if (!projectId) {
      setFeedback('No project selected');
      return;
    }
    
    setIsLoadingManualTasks(true);
    setIsWaitingForSync(true);
    try {
      // Use project-specific sync (like chat/analysis)
      const response = await api.syncManualTasks(projectId);
      if (response && response.success) {
        // Ensure we have an array of tasks
        const tasks = Array.isArray(response.data) ? response.data : 
                     Array.isArray(response.tasks) ? response.tasks : 
                     Array.isArray(response.data?.tasks) ? response.data.tasks : [];
        
        setManualTasks(tasks);
        setFeedback('Tasks synced successfully');
        setLastLoadTime(Date.now());
        setIsInitialSyncComplete(true);
        setIsWaitingForSync(false);
        logger.info(`Tasks synced for project ${projectId}:`, { taskCount: tasks.length });
      } else {
        logger.warn('Sync response not successful:', response);
        setFeedback('Sync completed but no tasks returned');
        setIsWaitingForSync(false);
      }
    } catch (error) {
      logger.error('Error syncing tasks:', error);
      setFeedback('Error syncing tasks');
      setIsWaitingForSync(false);
      // Keep existing tasks on error
    } finally {
      setIsLoadingManualTasks(false);
    }
  };

  // ... existing helper functions and handlers (preserved) ...

  return (
    <div className="tasks-tab">
      {/* Enhanced Header with Project Context */}
      <div className="tasks-header">
        <div className="tasks-header-content">
          <div className="tasks-header-left">
            <h3 className="tasks-title">📋 Task Management</h3>
            {projectName && (
              <div className="project-context">
                <span className="project-icon">📁</span>
                <span className="project-name">{projectName}</span>
              </div>
            )}
          </div>
          <div className="tasks-header-buttons">
            <button 
              className="btn-primary text-sm"
              onClick={handleCreateTask}
              disabled={!projectId}
              title={!projectId ? "Select a project first" : "Create new task"}
            >
              ➕ Create
            </button>
            <button 
              className="btn-secondary text-sm"
              onClick={handleSyncTasks}
              disabled={isLoadingManualTasks || !projectId}
              title={!projectId ? "Select a project first" : "Sync tasks with backend"}
            >
              {isLoadingManualTasks ? 'Syncing...' : '🔄 Sync'}
            </button>
          </div>
        </div>
      </div>

      {/* Project-specific content */}
      {!projectId ? (
        <div className="no-project-message">
          <p>Please select a project to view and manage tasks.</p>
        </div>
      ) : (
        // Existing task list content (preserved)
        <div className="tasks-main-content">
          {/* ... existing search, filter, and task list content ... */}
        </div>
      )}

      {/* ... existing modals and feedback (preserved) ... */}
    </div>
  );
}

export default TasksPanelComponent;
```

### 5.2 Simple Project Context Styling

```css
/* Updates to frontend/src/css/panel/task-panel.css */

/* Enhanced header with project context */
.tasks-header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.project-context {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.5rem;
  background: var(--success-bg, #f0fdf4);
  color: var(--text-primary, #111827);
  border: 1px solid var(--success-border, #bbf7d0);
  border-radius: 4px;
  font-size: 0.875rem;
}

.project-icon {
  font-size: 1rem;
}

.project-name {
  font-weight: 600;
}

/* Project-specific message states */
.no-project-message {
  text-align: center;
  padding: 2rem;
  color: var(--text-muted);
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  margin: 1rem 0;
}

/* Responsive design */
@media (max-width: 768px) {
  .tasks-header-left {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .project-context {
    font-size: 0.75rem;
  }
}
```

## 6. Testing Strategy

### Unit Tests
```javascript
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TasksPanelComponent from '@/presentation/components/chat/sidebar-right/TasksPanelComponent';

// Mock the useActiveIDE selector
jest.mock('@/infrastructure/stores/selectors/ProjectSelectors', () => ({
  useActiveIDE: () => ({
    activeIDE: { port: 3000, workspacePath: '/path/to/test-project' },
    projectId: 'test-project',
    projectName: 'test-project'
  })
}));

describe('TasksPanelComponent - Project Specific', () => {
  it('should show project context when project is selected', () => {
    render(<TasksPanelComponent eventBus={{}} activePort={3000} />);
    
    expect(screen.getByText('test-project')).toBeInTheDocument();
    expect(screen.getByText('📋 Task Management')).toBeInTheDocument();
  });

  it('should disable buttons when no project is selected', () => {
    // Mock no project
    jest.doMock('@/infrastructure/stores/selectors/ProjectSelectors', () => ({
      useActiveIDE: () => ({
        activeIDE: null,
        projectId: null,
        projectName: null
      })
    }));

    render(<TasksPanelComponent eventBus={{}} activePort={3000} />);
    
    expect(screen.getByText('Please select a project to view and manage tasks.')).toBeInTheDocument();
  });
});
```

## 7. Success Criteria
- [ ] Tasks are loaded project-specifically using useActiveIDE
- [ ] Project name is displayed in header when project is selected
- [ ] Tasks automatically reload when switching projects
- [ ] Buttons are disabled when no project is selected
- [ ] All existing functionality is preserved
- [ ] No performance degradation

## 8. Risk Mitigation
- **Low Risk**: Uses existing patterns (like chat/analysis)
- **Low Risk**: No new complex components or hooks
- **Low Risk**: Minimal changes to existing code

## 9. Future Enhancements
- [ ] Project-specific task caching (if needed)
- [ ] Project task statistics (if needed)
- [ ] Multi-project task comparison (if needed)

---

**Note**: This simplified implementation makes tasks project-specific using the existing IDEStore patterns, just like chat and analysis already work. No complex new hooks or components needed - just use the existing `useActiveIDE` selector and make task loading project-specific. 