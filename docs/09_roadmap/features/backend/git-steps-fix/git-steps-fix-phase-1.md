# Git Steps Fix - Phase 1: Add Missing StepBuilder.build() Calls

## 📋 Phase Overview
- **Phase**: 1
- **Title**: Add Missing StepBuilder.build() Calls
- **Estimated Time**: 1.5 hours
- **Status**: Planning
- **Dependencies**: None
- **Deliverables**: All 19 Git step files updated with StepBuilder.build() calls

## 🎯 Objectives
- [ ] Add StepBuilder.build() calls to all 19 Git step files
- [ ] Fix export pattern to match working Chat steps
- [ ] Follow exact pattern from working Chat steps
- [ ] Ensure consistent error handling
- [ ] Test each step individually

## 📁 Files to Modify
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

## 🔧 Implementation Details

### Root Cause Analysis
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
```

### Broken Pattern (Git Steps):
```javascript
async execute(context = {}) {
  try {
    logger.info(`🔧 Executing ${this.name}...`);
    // ... rest of implementation
    // ← MISSING: StepBuilder.build() call!
```

### Fix Pattern for Each Git Step

#### Before (Broken):
```javascript
async execute(context = {}) {
  try {
    logger.info(`🔧 Executing ${this.name}...`);
    // ... implementation
```

#### After (Fixed):
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

### Step-by-Step Implementation

#### Step 1: git_get_status.js
```javascript
async execute(context = {}) {
  const config = GitGetStatusStep.getConfig();
  const step = StepBuilder.build(config, context);
  
  try {
    logger.info(`🔧 Executing ${this.name}...`);
    // ... rest of existing implementation
}

// Create instance for execution
const stepInstance = new GitGetStatusStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
};
```

#### Step 2: git_get_branches.js
```javascript
async execute(context = {}) {
  const config = GitGetBranchesStep.getConfig();
  const step = StepBuilder.build(config, context);
  
  try {
    logger.info(`🔧 Executing ${this.name}...`);
    // ... rest of existing implementation
}

// Create instance for execution
const stepInstance = new GitGetBranchesStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
};
```

#### Step 3: Continue for all 19 files
Apply the same pattern to all remaining Git step files:
- git_get_last_commit.js
- git_get_remote_url.js
- git_init_repository.js
- git_merge_branch.js
- git_pull_changes.js
- git_push.js
- git_reset.js
- git_add_files.js
- git_add_remote.js
- git_checkout_branch.js
- git_clone_repository.js
- git_commit.js
- git_create_branch.js
- git_create_pull_request.js
- git_get_commit_history.js
- git_get_current_branch.js
- git_get_diff.js

### Validation Steps

#### After Each File Update:
1. **Syntax Check**: Ensure no syntax errors
2. **Import Check**: Verify StepBuilder import is present
3. **Pattern Check**: Confirm exact pattern from working Chat steps
4. **Config Check**: Verify getConfig() method exists and is called correctly

#### Testing Each Step:
1. **Individual Test**: Test each step in isolation
2. **Logger Test**: Verify logger.info() calls work
3. **Service Test**: Verify context.getService() calls work
4. **Error Test**: Verify error handling works correctly

## 🎯 Success Criteria
- [ ] All 19 Git step files updated with StepBuilder.build() calls
- [ ] All 19 Git step files updated with correct export pattern
- [ ] No syntax errors in any file
- [ ] Logger functionality works correctly
- [ ] Service resolution works correctly
- [ ] Error handling works correctly

## 🔄 Dependencies
- **Requires**: None
- **Blocks**: Phase 2 (Testing & Validation)

## 📊 Progress Tracking
- **Files Updated**: 0/19
- **Files Tested**: 0/19
- **StepBuilder Calls Added**: 0/19
- **Export Patterns Fixed**: 0/19
- **Errors Fixed**: 0
- **Progress**: 0%

## 🚨 Risk Mitigation
- **Risk**: StepBuilder.build() might cause issues
- **Mitigation**: Follow exact pattern from working Chat steps
- **Risk**: Logger initialization might fail
- **Mitigation**: Keep existing logger creation pattern

## 📝 Notes
- This fix addresses the root cause of Git step failures
- Pattern is proven to work (Chat steps use it successfully)
- No changes to existing functionality, only adding missing calls
- All existing error handling and validation remains intact 