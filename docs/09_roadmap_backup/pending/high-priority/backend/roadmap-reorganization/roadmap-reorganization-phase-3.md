# Phase 3: Service Layer Updates

## 📋 Phase Overview
- **Phase Name**: Service Layer Updates
- **Duration**: 4 hours
- **Status**: Pending
- **Progress**: 0%
- **Dependencies**: Phase 2 completion, script development

## 🎯 Phase Objectives
- Update TaskService with status-based path resolution
- Update WorkflowLoaderService for dynamic path resolution
- Update prompt generation steps with new path logic
- Test service integrations
- Update error handling

## 📝 Detailed Tasks

### Task 3.1: Update TaskService.js (1.5 hours)
- [ ] Add status-based path resolution method
- [ ] Update `getTaskFilePath()` method
- [ ] Add `getCompletionQuarter()` helper method
- [ ] Update error handling for path resolution
- [ ] Add logging for path resolution operations
- [ ] Test with sample tasks

**Key Changes:**
```javascript
// Add to TaskService.js
getTaskFilePath(task) {
  const status = task.status;
  const priority = task.priority;
  const category = task.category;
  
  if (status === 'completed') {
    const quarter = this.getCompletionQuarter(task.completedAt);
    return `docs/09_roadmap/completed/${quarter}/${category}/${task.id}/`;
  } else if (status === 'in_progress') {
    return `docs/09_roadmap/in-progress/${category}/${task.id}/`;
  } else {
    return `docs/09_roadmap/pending/${priority}/${category}/${task.id}/`;
  }
}

getCompletionQuarter(completedAt) {
  const date = new Date(completedAt);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  
  if (month <= 3) return `${year}-q1`;
  if (month <= 6) return `${year}-q2`;
  if (month <= 9) return `${year}-q3`;
  return `${year}-q4`;
}
```

### Task 3.2: Update WorkflowLoaderService.js (1 hour)
- [ ] Add dynamic path resolution for workflows
- [ ] Update workflow loading logic
- [ ] Add error handling for missing workflows
- [ ] Test with sample workflows
- [ ] Update logging for workflow operations

**Key Changes:**
```javascript
// Add to WorkflowLoaderService.js
async loadWorkflowForTask(task) {
  const workflowPath = this.getWorkflowPath(task);
  try {
    const workflow = await this.loadWorkflow(workflowPath);
    return workflow;
  } catch (error) {
    this.logger.error(`Failed to load workflow for task ${task.id}:`, error);
    return this.getDefaultWorkflow();
  }
}

getWorkflowPath(task) {
  // Dynamic path resolution based on task properties
  const basePath = 'backend/framework/workflows';
  const category = task.category;
  const type = task.type;
  
  return `${basePath}/${category}-workflows.json`;
}
```

### Task 3.3: Update Prompt Generation Steps (1 hour)
- [ ] Update `task_prompt_generation_step.js`
- [ ] Replace hardcoded paths with dynamic resolution
- [ ] Update prompt template loading
- [ ] Add error handling for missing templates
- [ ] Test with sample prompts

**Key Changes:**
```javascript
// Update in task_prompt_generation_step.js
async loadPromptTemplate(promptType, contentLibraryService) {
  try {
    // Dynamic path resolution based on prompt type
    const promptPaths = {
      'task-creation': 'content-library/prompts/task-management/task-create.md',
      'task-execution': 'content-library/prompts/task-management/task-execute.md',
      'task-analysis': 'content-library/prompts/task-management/task-analyze.md'
    };

    const promptPath = promptPaths[promptType] || promptPaths['task-creation'];
    
    // Try to load via content library service first
    if (contentLibraryService) {
      const content = await contentLibraryService.loadContent(promptPath);
      if (content) {
        return content;
      }
    }

    // Fallback to direct file system
    const fullPath = path.resolve(process.cwd(), promptPath);
    const content = await fs.readFile(fullPath, 'utf8');
    return content;

  } catch (error) {
    this.logger.error(`Failed to load prompt template: ${error.message}`);
    return this.getFallbackTemplate();
  }
}
```

### Task 3.4: Update Analysis Steps (30 minutes)
- [ ] Update all analysis step files with dynamic paths
- [ ] Replace hardcoded `docs/09_roadmap/pending/high/backend/roadmap-reorganization3/steps/categories/analysis/todo.md`
- `backend/domain/steps/categories/analysis/security/ZapSecurityStep.js`
- `backend/domain/steps/categories/analysis/security/TrivySecurityStep.js`
- `backend/domain/steps/categories/analysis/security/SnykSecurityStep.js`
- `backend/domain/steps/categories/analysis/security/SemgrepSecurityStep.js`
- `backend/domain/steps/categories/analysis/security/SecretScanningStep.js`
- `backend/domain/steps/categories/analysis/security/ComplianceSecurityStep.js`
- `backend/domain/steps/categories/analysis/performance/NetworkAnalysisStep.js`
- `backend/domain/steps/categories/analysis/performance/MemoryAnalysisStep.js`
- `backend/domain/steps/categories/analysis/performance/DatabaseAnalysisStep.js`
- `backend/domain/steps/categories/analysis/performance/CpuAnalysisStep.js`
- `backend/domain/steps/categories/analysis/architecture/StructureAnalysisStep.js`
- `backend/domain/steps/categories/analysis/architecture/PatternAnalysisStep.js`
- `backend/domain/steps/categories/analysis/architecture/LayerAnalysisStep.js`
- `backend/domain/steps/categories/analysis/architecture/CouplingAnalysisStep.js`

**Key Changes Pattern:**
```javascript
// Replace hardcoded paths like:
const docsDir = path.join(projectPath, `docs/09_roadmap/pending/high/backend/roadmap-reorganization3// With dynamic path resolution:
const docsDir = this.getTaskDocumentationPath(projectPath, this.category, this.name);

getTaskDocumentationPath(projectPath, category, taskName) {
  // Dynamic path resolution based on task status and properties
  const basePath = path.join(projectPath, 'docs/09_roadmap');
  // Add logic to determine correct path based on task status
  return path.join(basePath, 'pending', 'medium-priority', category, taskName.toLowerCase());
}
```

## 🧪 Testing Requirements

### Unit Tests:
- [ ] Test TaskService path resolution with different task statuses
- [ ] Test WorkflowLoaderService dynamic path resolution
- [ ] Test prompt generation step path resolution
- [ ] Test analysis step path resolution
- [ ] Test error handling scenarios

### Integration Tests:
- [ ] Test service integration with new path resolution
- [ ] Test with sample tasks and workflows
- [ ] Test with different task categories and statuses
- [ ] Test error handling and fallback scenarios

### Performance Tests:
- [ ] Test path resolution performance
- [ ] Test service response times
- [ ] Test memory usage during operations

## 📁 Files to Modify

### Backend Services:
- [ ] `backend/domain/services/task/TaskService.js` - Add status-based path resolution
- [ ] `backend/domain/services/workflow/WorkflowLoaderService.js` - Add dynamic path resolution

### Prompt Generation:
- [ ] `backend/domain/steps/categories/generate/task_prompt_generation_step.js` - Update prompt paths

### Analysis Steps (15 files):
- [ ] `backend/domain/steps/categories/analysis/todo.md` - Update documentation paths
- [ ] All security analysis steps - Update docs paths
- [ ] All performance analysis steps - Update docs paths
- [ ] All architecture analysis steps - Update docs paths

## ✅ Success Criteria
- [ ] TaskService path resolution working for all statuses
- [ ] WorkflowLoaderService dynamic path resolution functional
- [ ] Prompt generation steps updated and working
- [ ] All analysis steps updated with dynamic paths
- [ ] Error handling implemented and tested
- [ ] All services pass unit and integration tests
- [ ] Performance requirements met
- [ ] No regression in existing functionality

## ⚠️ Risk Mitigation
- **Risk**: Service integration failures
  - **Mitigation**: Comprehensive testing, gradual rollout
- **Risk**: Path resolution errors
  - **Mitigation**: Robust error handling, fallback mechanisms
- **Risk**: Performance degradation
  - **Mitigation**: Performance testing, optimization

## 📊 Progress Tracking
- **Start Time**: [To be set]
- **End Time**: [To be set]
- **Actual Duration**: [To be calculated]
- **Files Modified**: [To be documented]
- **Issues Encountered**: [To be documented]
- **Lessons Learned**: [To be documented]

## 🔄 Next Phase
After completing Phase 3, proceed to **Phase 4: Workflow Integration** which will add status management steps to the workflow system.

---

**Last Updated**: 2024-12-19T17:30:00.000Z
**Version**: 1.0.0
**Status**: Phase 3 Ready ✅
