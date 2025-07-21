# Git Steps Fix - Implementation Plan

## 1. Project Overview
- **Feature/Component Name**: Git Steps Fix - Add Missing StepBuilder.build() Calls
- **Priority**: High
- **Category**: backend
- **Estimated Time**: 2 hours
- **Dependencies**: StepBuilder, Logger system, TerminalService
- **Related Issues**: Git operations failing with logger errors

## 2. Technical Requirements
- **Tech Stack**: Node.js, Winston Logger, StepBuilder
- **Architecture Pattern**: DDD (Domain-Driven Design)
- **Database Changes**: None
- **API Changes**: None
- **Frontend Changes**: None
- **Backend Changes**: Update 19 Git step files to include StepBuilder.build() calls

## 3. File Impact Analysis

### Files to Modify:
- [ ] `backend/domain/steps/categories/git/git_get_status.js` - Add StepBuilder.build() call
- [ ] `backend/domain/steps/categories/git/git_get_branches.js` - Add StepBuilder.build() call
- [ ] `backend/domain/steps/categories/git/git_get_last_commit.js` - Add StepBuilder.build() call
- [ ] `backend/domain/steps/categories/git/git_get_remote_url.js` - Add StepBuilder.build() call
- [ ] `backend/domain/steps/categories/git/git_init_repository.js` - Add StepBuilder.build() call
- [ ] `backend/domain/steps/categories/git/git_merge_branch.js` - Add StepBuilder.build() call
- [ ] `backend/domain/steps/categories/git/git_pull_changes.js` - Add StepBuilder.build() call
- [ ] `backend/domain/steps/categories/git/git_push.js` - Add StepBuilder.build() call
- [ ] `backend/domain/steps/categories/git/git_reset.js` - Add StepBuilder.build() call
- [ ] `backend/domain/steps/categories/git/git_add_files.js` - Add StepBuilder.build() call
- [ ] `backend/domain/steps/categories/git/git_add_remote.js` - Add StepBuilder.build() call
- [ ] `backend/domain/steps/categories/git/git_checkout_branch.js` - Add StepBuilder.build() call
- [ ] `backend/domain/steps/categories/git/git_clone_repository.js` - Add StepBuilder.build() call
- [ ] `backend/domain/steps/categories/git/git_commit.js` - Add StepBuilder.build() call
- [ ] `backend/domain/steps/categories/git/git_create_branch.js` - Add StepBuilder.build() call
- [ ] `backend/domain/steps/categories/git/git_create_pull_request.js` - Add StepBuilder.build() call
- [ ] `backend/domain/steps/categories/git/git_get_commit_history.js` - Add StepBuilder.build() call
- [ ] `backend/domain/steps/categories/git/git_get_current_branch.js` - Add StepBuilder.build() call
- [ ] `backend/domain/steps/categories/git/git_get_diff.js` - Add StepBuilder.build() call

### Files to Create:
- [ ] `docs/09_roadmap/features/backend/git-steps-fix/git-steps-fix-index.md` - Master index file
- [ ] `docs/09_roadmap/features/backend/git-steps-fix/git-steps-fix-phase-1.md` - Phase 1: Fix Git Steps
- [ ] `docs/09_roadmap/features/backend/git-steps-fix/git-steps-fix-phase-2.md` - Phase 2: Testing & Validation

## 4. Implementation Phases

### Phase 1: Fix Git Steps (1.5 hours)
- [ ] Add StepBuilder.build() calls to all 19 Git step files
- [ ] Follow the exact pattern from working Chat steps
- [ ] Ensure consistent error handling
- [ ] Test each step individually

### Phase 2: Testing & Validation (0.5 hours)
- [ ] Test all Git operations
- [ ] Verify logger functionality
- [ ] Ensure no regression in existing functionality
- [ ] Update documentation

## 5. Code Standards & Patterns
- **Coding Style**: Follow existing project patterns
- **Naming Conventions**: Maintain existing naming
- **Error Handling**: Keep existing try-catch patterns
- **Logging**: Use existing Winston logger setup
- **Testing**: Ensure all Git operations work correctly

## 6. Security Considerations
- [ ] No security changes required
- [ ] Maintain existing Git command validation
- [ ] Keep existing error handling patterns

## 7. Performance Requirements
- **Response Time**: < 2 seconds for Git operations
- **Memory Usage**: No significant change
- **Database Queries**: None
- **Caching Strategy**: None

## 8. Testing Strategy

### Unit Tests:
- [ ] Test each Git step individually
- [ ] Verify StepBuilder.build() integration
- [ ] Test error handling scenarios

### Integration Tests:
- [ ] Test Git operations end-to-end
- [ ] Verify logger functionality
- [ ] Test service resolution

## 9. Documentation Requirements

### Code Documentation:
- [ ] Update comments to reflect StepBuilder usage
- [ ] Document the fix pattern for future reference

### User Documentation:
- [ ] No user-facing changes
- [ ] Update developer documentation if needed

## 10. Deployment Checklist

### Pre-deployment:
- [ ] All Git steps tested individually
- [ ] No build errors
- [ ] Logger functionality verified

### Deployment:
- [ ] Deploy updated Git step files
- [ ] Restart services if needed
- [ ] Verify Git operations work

### Post-deployment:
- [ ] Monitor Git operation logs
- [ ] Verify no regression in functionality

## 11. Rollback Plan
- [ ] Keep backup of original Git step files
- [ ] Document rollback procedure
- [ ] Test rollback process

## 12. Success Criteria
- [ ] All 19 Git steps include StepBuilder.build() calls
- [ ] Git operations work without logger errors
- [ ] No regression in existing functionality
- [ ] All tests pass

## 13. Risk Assessment

#### Low Risk:
- [ ] StepBuilder.build() call might cause issues - Mitigation: Follow exact pattern from working Chat steps
- [ ] Logger initialization might fail - Mitigation: Keep existing logger creation pattern

## 14. AI Auto-Implementation Instructions

#### Task Database Fields:
- **source_type**: 'markdown_doc'
- **source_path**: 'docs/09_roadmap/features/backend/git-steps-fix/git-steps-fix-implementation.md'
- **category**: 'backend'
- **automation_level**: 'full_auto'
- **confirmation_required**: false
- **max_attempts**: 3
- **git_branch_required**: true
- **new_chat_required**: false

#### AI Execution Context:
```json
{
  "requires_new_chat": false,
  "git_branch_name": "fix/git-steps-stepbuilder",
  "confirmation_keywords": ["fertig", "done", "complete"],
  "fallback_detection": true,
  "max_confirmation_attempts": 3,
  "timeout_seconds": 300
}
```

#### Success Indicators:
- [ ] All 19 Git step files updated with StepBuilder.build() calls
- [ ] Git operations work without errors
- [ ] No build errors
- [ ] Logger functionality works correctly

## 15. References & Resources
- **Working Example**: `backend/domain/steps/categories/chat/ide_send_message.js`
- **StepBuilder Documentation**: `backend/domain/steps/StepBuilder.js`
- **Logger Implementation**: `backend/infrastructure/logging/Logger.js`

## Root Cause Analysis

### Problem Identified:
The Git steps have TWO issues compared to working steps (Chat steps, IDE steps, etc.):

1. **Missing `StepBuilder.build()` call**
2. **Different export pattern**

### Working Pattern (Chat Steps):
```javascript
async execute(context = {}) {
  const config = IDESendMessageStep.getConfig();
  const step = StepBuilder.build(config, context);  // ← THIS IS MISSING!
  
  try {
    logger.info(`🔧 Executing ${this.name}...`);
    // ... rest of implementation
}

// Create instance for execution
const stepInstance = new IDESendMessageStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
};
```

### Broken Pattern (Git Steps):
```javascript
async execute(context = {}) {
  try {
    logger.info(`🔧 Executing ${this.name}...`);
    // ... rest of implementation
    // ← MISSING: StepBuilder.build() call!
}

module.exports = { config, execute: GitGetStatusStep.prototype.execute.bind(new GitGetStatusStep()) };
```

### Solution:
Fix BOTH issues in all 19 Git step files:
1. Add the missing `StepBuilder.build()` call
2. Use the correct export pattern from working steps

## Implementation Pattern

### Before (Broken):
```javascript
async execute(context = {}) {
  try {
    logger.info(`🔧 Executing ${this.name}...`);
    // ... implementation
}

module.exports = { config, execute: GitGetStatusStep.prototype.execute.bind(new GitGetStatusStep()) };
```

### After (Fixed):
```javascript
async execute(context = {}) {
  const config = GitGetStatusStep.getConfig();
  const step = StepBuilder.build(config, context);
  
  try {
    logger.info(`🔧 Executing ${this.name}...`);
    // ... implementation
}

// Create instance for execution
const stepInstance = new GitGetStatusStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
};
```

This fix will resolve BOTH the logger initialization issues AND the export pattern issues, making all Git steps work correctly, just like the Chat steps do. 