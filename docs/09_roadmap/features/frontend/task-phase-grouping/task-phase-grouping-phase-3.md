# Phase 3: Frontend Component Enhancement - CORRECTED

## Overview
Enhance existing React components to support phase grouping and execution functionality without creating new modals or components.

## Current State Analysis
- **TasksPanelComponent.jsx**: Exists at `frontend/src/presentation/components/chat/sidebar-right/TasksPanelComponent.jsx`
- **DocsTaskDetailsModal.jsx**: Exists at `frontend/src/presentation/components/chat/modal/DocsTaskDetailsModal.jsx`
- **Current Functionality**: TasksPanelComponent handles docs tasks, DocsTaskDetailsModal shows task details
- **Component Structure**: Uses React hooks and functional components
- **Styling**: CSS exists in existing files, needs enhancement for phase grouping
- **Integration**: Both components work together for task display and execution

## Tasks

### 1. Enhance TasksPanelComponent with phase grouping
**File**: `frontend/src/presentation/components/chat/sidebar-right/TasksPanelComponent.jsx`
**Time**: 90 minutes
**Status**: ❌ Not implemented

```jsx
// Add to existing state
const [groupedTasks, setGroupedTasks] = useState({});
const [loadingPhases, setLoadingPhases] = useState(false);
const [executingPhases, setExecutingPhases] = useState(new Set());
const [expandedPhases, setExpandedPhases] = useState(new Set());

// Add to existing useEffect
useEffect(() => {
  if (activePort) {
    console.log('[TasksPanelComponent] Loading tasks for port:', activePort);
    loadDocsTasks();
    loadGroupedTasks(); // NEW: Load phase-grouped tasks
  } else {
    console.log('[TasksPanelComponent] No active port, clearing tasks');
    setDocsTasks([]);
    setGroupedTasks({}); // NEW: Clear phase tasks
  }
}, [activePort]);

// NEW: Load grouped tasks by phases
const loadGroupedTasks = async () => {
  setLoadingPhases(true);
  try {
    const projectId = await api.getCurrentProjectId();
    const phases = await api.getTasksByPhases(projectId);
    setGroupedTasks(phases);
  } catch (error) {
    console.error('Failed to load grouped tasks:', error);
    setFeedback('Error loading phase groups: ' + error.message);
  } finally {
    setLoadingPhases(false);
  }
};

// NEW: Handle phase execution
const handleExecutePhase = async (phaseName) => {
  if (executingPhases.has(phaseName)) return;

  setExecutingPhases(prev => new Set(prev).add(phaseName));
  
  try {
    const projectId = await api.getCurrentProjectId();
    const result = await api.executePhase(projectId, phaseName);
    console.log(`Phase ${phaseName} execution result:`, result);
    
    // Reload tasks to get updated status
    await loadGroupedTasks();
    await loadDocsTasks();
    
    setFeedback(`✅ Phase ${phaseName} executed successfully`);
  } catch (error) {
    console.error(`Phase ${phaseName} execution failed:`, error);
    setFeedback(`❌ Failed to execute phase ${phaseName}: ${error.message}`);
  } finally {
    setExecutingPhases(prev => {
      const newSet = new Set(prev);
      newSet.delete(phaseName);
      return newSet;
    });
  }
};

// NEW: Toggle phase expansion
const togglePhaseExpansion = (phaseName) => {
  setExpandedPhases(prev => {
    const newSet = new Set(prev);
    if (newSet.has(phaseName)) {
      newSet.delete(phaseName);
    } else {
      newSet.add(phaseName);
    }
    return newSet;
  });
};

// NEW: Get phase progress
const getPhaseProgress = (phaseData) => {
  return phaseData.totalTasks > 0 ? 
    (phaseData.completedTasks / phaseData.totalTasks) * 100 : 0;
};

// NEW: Get phase status
const getPhaseStatus = (phaseData) => {
  if (phaseData.completedTasks === phaseData.totalTasks) return 'complete';
  if (phaseData.completedTasks > 0) return 'in-progress';
  return 'pending';
};

// NEW: Get phase icon
const getPhaseIcon = (phaseData) => {
  const status = getPhaseStatus(phaseData);
  switch (status) {
    case 'complete': return '✅';
    case 'in-progress': return '🔄';
    case 'pending': return '📋';
    default: return '📋';
  }
};

// Modify existing render to include phase grouping
// Add this section after the existing docs tasks section:

{/* Phase Grouping Section */}
{Object.keys(groupedTasks).length > 0 && (
  <div className="panel-block">
    <div className="flex justify-between items-center mb-3">
      <h3 className="font-semibold text-lg">📋 Project Phases</h3>
      <div className="flex gap-2">
        <button 
          className="btn-secondary text-sm"
          onClick={loadGroupedTasks}
          disabled={loadingPhases}
        >
          {loadingPhases ? 'Loading...' : '🔄 Refresh'}
        </button>
      </div>
    </div>
    
    <div className="bg-gray-900 rounded p-3 min-h-[200px] max-h-[400px] overflow-y-auto">
      {loadingPhases ? (
        <div className="flex items-center justify-center py-8">
          <div className="loading-spinner mr-3"></div>
          <span className="text-gray-400">Loading phase groups...</span>
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(groupedTasks).map(([phaseName, phaseData]) => (
            <div key={phaseName} className="phase-group border border-gray-700 rounded">
              {/* Phase Header */}
              <div 
                className="phase-header p-3 bg-gray-800 cursor-pointer hover:bg-gray-750 transition-colors"
                onClick={() => togglePhaseExpansion(phaseName)}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{getPhaseIcon(phaseData)}</span>
                    <div>
                      <h4 className="font-medium text-white capitalize">{phaseData.name}</h4>
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <span>{phaseData.completedTasks}/{phaseData.totalTasks} tasks</span>
                        <span>•</span>
                        <span>{Math.round(getPhaseProgress(phaseData))}% complete</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="progress-bar w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="progress-fill h-full bg-blue-500 transition-all duration-300"
                        style={{ width: `${getPhaseProgress(phaseData)}%` }}
                      />
                    </div>
                    <button className="expand-button text-gray-400 hover:text-white">
                      {expandedPhases.has(phaseName) ? '▼' : '▶'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Phase Content */}
              {expandedPhases.has(phaseName) && (
                <div className="phase-content p-3 bg-gray-850">
                  {/* Phase Tasks */}
                  <div className="space-y-2 mb-3">
                    {phaseData.tasks.map(task => (
                      <div
                        key={task.id}
                        className="phase-task-item p-2 bg-gray-800 rounded border border-gray-700 hover:border-gray-600 cursor-pointer transition-colors"
                        onClick={() => handleDocsTaskClick(task)}
                      >
                        <div className="flex justify-between items-start">
                          <h5 className="font-medium text-white text-sm line-clamp-2">
                            {task.title}
                          </h5>
                          <div className="flex gap-1 flex-shrink-0 ml-2">
                            <span
                              className="priority-badge text-xs px-2 py-1 rounded"
                              style={{ backgroundColor: getPriorityColor(task.priority) }}
                            >
                              {task.priority}
                            </span>
                            {task.status && (
                              <span
                                className="status-badge text-xs px-2 py-1 rounded"
                                style={{ backgroundColor: getStatusColor(task.status) }}
                              >
                                {task.status}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-xs text-gray-400 mt-1">
                          <span className="font-mono">{getTaskFilename(task)}</span>
                          <span>{formatDate(task.updatedAt)}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Phase Execution */}
                  {getPhaseStatus(phaseData) !== 'complete' && (
                    <div className="phase-execution border-t border-gray-700 pt-3">
                      <button
                        className={`execute-phase-button w-full py-2 px-4 rounded font-medium transition-all ${
                          executingPhases.has(phaseName)
                            ? 'bg-yellow-600 text-white cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                        onClick={() => handleExecutePhase(phaseName)}
                        disabled={executingPhases.has(phaseName)}
                      >
                        {executingPhases.has(phaseName) 
                          ? `⏳ Executing ${phaseName}...` 
                          : `▶ Execute ${phaseName} Phase`
                        }
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
)}
```

### 2. Enhance DocsTaskDetailsModal with phase execution view
**File**: `frontend/src/presentation/components/chat/modal/DocsTaskDetailsModal.jsx`
**Time**: 60 minutes
**Status**: ❌ Not implemented

```jsx
// Add to existing state
const [phaseData, setPhaseData] = useState(null);
const [loadingPhases, setLoadingPhases] = useState(false);
const [executingPhases, setExecutingPhases] = useState(new Set());

// Add new tab option
const [activeTab, setActiveTab] = useState('rendered'); // 'rendered', 'raw', 'phases'

// Add to existing useEffect that loads task details
useEffect(() => {
  if (taskDetails && taskDetails.phase) {
    loadPhaseData();
  }
}, [taskDetails]);

// NEW: Load phase data for the current task
const loadPhaseData = async () => {
  if (!taskDetails?.phase) return;
  
  setLoadingPhases(true);
  try {
    const projectId = await api.getCurrentProjectId();
    const phases = await api.getTasksByPhases(projectId);
    setPhaseData(phases);
  } catch (error) {
    console.error('Failed to load phase data:', error);
  } finally {
    setLoadingPhases(false);
  }
};

// NEW: Handle phase execution from modal
const handleExecutePhase = async (phaseName) => {
  if (executingPhases.has(phaseName)) return;

  setExecutingPhases(prev => new Set(prev).add(phaseName));
  
  try {
    const projectId = await api.getCurrentProjectId();
    const result = await api.executePhase(projectId, phaseName);
    console.log(`Phase ${phaseName} execution result:`, result);
    
    // Reload phase data
    await loadPhaseData();
    
    // Show success message
    setFeedback(`✅ Phase ${phaseName} executed successfully`);
  } catch (error) {
    console.error(`Phase ${phaseName} execution failed:`, error);
    setFeedback(`❌ Failed to execute phase ${phaseName}: ${error.message}`);
  } finally {
    setExecutingPhases(prev => {
      const newSet = new Set(prev);
      newSet.delete(phaseName);
      return newSet;
    });
  }
};

// NEW: Handle execute all phases
const handleExecuteAllPhases = async () => {
  if (!phaseData) return;
  
  try {
    const projectId = await api.getCurrentProjectId();
    const phaseNames = Object.keys(phaseData);
    const result = await api.executePhases(projectId, phaseNames);
    console.log('All phases execution result:', result);
    
    // Reload phase data
    await loadPhaseData();
    
    setFeedback('✅ All phases executed successfully');
  } catch (error) {
    console.error('All phases execution failed:', error);
    setFeedback(`❌ Failed to execute all phases: ${error.message}`);
  }
};

// NEW: Get overall progress
const getOverallProgress = () => {
  if (!phaseData) return 0;
  
  let totalTasks = 0;
  let completedTasks = 0;
  
  Object.values(phaseData).forEach(phase => {
    totalTasks += phase.totalTasks;
    completedTasks += phase.completedTasks;
  });
  
  return totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
};

// Modify existing tab navigation to include phases tab
// Add this to the existing tab navigation:

{taskDetails?.phase && (
  <button 
    className={`tab-btn ${activeTab === 'phases' ? 'active' : ''}`}
    onClick={() => setActiveTab('phases')}
  >
    📋 Phases
  </button>
)}

// Add new tab content for phases
// Add this to the existing tab content section:

{activeTab === 'phases' && (
  <div className="phases-content">
    {loadingPhases ? (
      <div className="flex items-center justify-center py-8">
        <div className="loading-spinner mr-3"></div>
        <span>Loading phase data...</span>
      </div>
    ) : phaseData ? (
      <div className="space-y-4">
        {/* Overall Progress */}
        <div className="overall-progress bg-gray-100 p-4 rounded">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-semibold">Overall Project Progress</h4>
            <span className="text-sm font-medium">{Math.round(getOverallProgress())}%</span>
          </div>
          <div className="progress-bar w-full h-3 bg-gray-300 rounded-full overflow-hidden">
            <div 
              className="progress-fill h-full bg-green-500 transition-all duration-300"
              style={{ width: `${getOverallProgress()}%` }}
            />
          </div>
        </div>

        {/* Phase List */}
        <div className="phases-list space-y-3">
          {Object.entries(phaseData).map(([phaseName, phaseData]) => (
            <div key={phaseName} className="phase-item border border-gray-300 rounded p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h5 className="font-semibold capitalize">{phaseData.name}</h5>
                  <p className="text-sm text-gray-600">
                    {phaseData.completedTasks}/{phaseData.totalTasks} tasks completed
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium">
                    {Math.round((phaseData.completedTasks / phaseData.totalTasks) * 100)}%
                  </span>
                  <div className="progress-bar w-20 h-2 bg-gray-300 rounded-full overflow-hidden mt-1">
                    <div 
                      className="progress-fill h-full bg-blue-500 transition-all duration-300"
                      style={{ 
                        width: `${(phaseData.completedTasks / phaseData.totalTasks) * 100}%` 
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Phase Tasks Preview */}
              <div className="phase-tasks-preview mb-3">
                <h6 className="text-sm font-medium mb-2">Tasks in this phase:</h6>
                <div className="space-y-1">
                  {phaseData.tasks.slice(0, 3).map(task => (
                    <div key={task.id} className="task-preview flex items-center gap-2 text-sm">
                      <span className={`task-status ${
                        task.status === 'completed' ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        {task.status === 'completed' ? '✅' : '⏳'}
                      </span>
                      <span className="task-title truncate">{task.title}</span>
                    </div>
                  ))}
                  {phaseData.tasks.length > 3 && (
                    <div className="text-sm text-gray-500 italic">
                      +{phaseData.tasks.length - 3} more tasks
                    </div>
                  )}
                </div>
              </div>

              {/* Phase Execution */}
              {phaseData.completedTasks < phaseData.totalTasks && (
                <button
                  className={`execute-phase-button w-full py-2 px-4 rounded font-medium transition-all ${
                    executingPhases.has(phaseName)
                      ? 'bg-yellow-600 text-white cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                  onClick={() => handleExecutePhase(phaseName)}
                  disabled={executingPhases.has(phaseName)}
                >
                  {executingPhases.has(phaseName) 
                    ? `⏳ Executing ${phaseName}...` 
                    : `▶ Execute ${phaseName} Phase`
                  }
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Execute All Phases */}
        <div className="execute-all-section border-t border-gray-300 pt-4">
          <button
            className="execute-all-button w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white rounded font-medium transition-all"
            onClick={handleExecuteAllPhases}
          >
            🚀 Execute All Phases
          </button>
        </div>
      </div>
    ) : (
      <div className="text-center py-8 text-gray-500">
        <p>No phase data available for this task.</p>
        <p className="text-sm">This task is not associated with any project phases.</p>
      </div>
    )}
  </div>
)}
```

### 3. Add CSS styling for phase grouping
**File**: `frontend/src/css/global/sidebar-right.css`
**Time**: 30 minutes
**Status**: ❌ Not implemented

```css
/* Phase Grouping Styles - Add to existing sidebar-right.css */

.phase-group {
  transition: all 0.3s ease;
}

.phase-group:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.phase-header {
  transition: background-color 0.2s ease;
}

.phase-header:hover {
  background-color: #374151 !important;
}

.phase-content {
  max-height: 1000px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.phase-task-item {
  transition: all 0.2s ease;
}

.phase-task-item:hover {
  transform: translateX(2px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.progress-bar {
  transition: all 0.3s ease;
}

.progress-fill {
  transition: width 0.5s ease;
}

.execute-phase-button {
  transition: all 0.2s ease;
}

.execute-phase-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(59, 130, 246, 0.3);
}

.execute-phase-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.expand-button {
  transition: transform 0.2s ease;
}

.expand-button:hover {
  color: #ffffff;
}

/* Phase Modal Styles - Add to existing task-docs-details-modal.css */

.phases-content {
  max-height: 600px;
  overflow-y: auto;
}

.overall-progress {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
}

.phase-item {
  transition: all 0.2s ease;
}

.phase-item:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

.task-preview {
  transition: all 0.2s ease;
}

.task-preview:hover {
  background-color: #f8f9fa;
  border-radius: 4px;
  padding: 2px 4px;
  margin: -2px -4px;
}

.execute-all-button {
  transition: all 0.2s ease;
}

.execute-all-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(34, 197, 94, 0.3);
}

/* Responsive design */
@media (max-width: 768px) {
  .phase-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .phase-content {
    padding: 12px;
  }
  
  .phase-task-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}
```

## Success Criteria
- [ ] TasksPanelComponent displays tasks grouped by phase within existing task list
- [ ] DocsTaskDetailsModal shows phase execution options when task has phases
- [ ] Phase grouping integrates seamlessly with existing docs tasks functionality
- [ ] Phase execution works correctly with existing Auto-Finish System
- [ ] Loading and error states are handled correctly using existing patterns
- [ ] No duplicate or separate blocks for phases - integrated into existing UI
- [ ] Maintains existing task selection and execution workflows
- [ ] Responsive design works on all screen sizes

## Dependencies
- React hooks (useState, useEffect)
- Existing APIChatRepository (from Phase 2)
- Existing TasksPanelComponent and DocsTaskDetailsModal
- CSS animations and transitions

## Integration with Existing Systems
- **APIChatRepository**: Uses phase grouping methods from Phase 2
- **Event Bus**: Integrates with existing event system
- **Project Management**: Uses existing project ID management
- **Error Handling**: Extends existing error handling patterns
- **Docs Tasks**: Maintains existing docs tasks functionality
- **Auto-Finish System**: Integrates with existing task execution

## Notes
- Uses existing React patterns with hooks
- Implements proper error boundaries and loading states
- Provides comprehensive visual feedback for all states
- Includes responsive design for mobile devices
- Uses CSS animations for smooth user experience
- Implements proper accessibility features
- Integrates with existing components without breaking changes
- Depends on Phase 1 and Phase 2 being completed first
- **CORRECTED**: No new modals - enhances existing components
- **CORRECTED**: Phase grouping within existing task display structure 