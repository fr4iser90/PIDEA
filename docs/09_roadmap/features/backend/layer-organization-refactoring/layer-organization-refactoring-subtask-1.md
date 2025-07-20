# Layer Organization Refactoring – Subtask 1: Domain Layer File Naming

## Overview
Standardize all file names in the domain layer steps to PascalCase conventions. This subtask focuses exclusively on file and class naming without touching layer architecture.

## Objectives
- [ ] Rename all snake_case files in `backend/domain/steps/categories/` to PascalCase
- [ ] Update all internal class names to match file names
- [ ] Fix all import/require statements referencing renamed files
- [ ] Update StepRegistry references to use new names
- [ ] Validate no broken imports or runtime errors

## Scope: Domain Layer Files (30+ files)

### IDE Category (`backend/domain/steps/categories/ide/`)
- [ ] `ide_send_message.js` → `IDESendMessageStep.js`
- [ ] `ide_open_file.js` → `IDEOpenFileStep.js`
- [ ] `ide_get_response.js` → `IDEGetResponseStep.js`
- [ ] `ide_get_file_content.js` → `IDEGetFileContentStep.js`
- [ ] `dev_server_restart_step.js` → `DevServerRestartStep.js`
- [ ] `dev_server_stop_step.js` → `DevServerStopStep.js`
- [ ] `dev_server_start_step.js` → `DevServerStartStep.js`

### Git Category (`backend/domain/steps/categories/git/`)
- [ ] `git_commit.js` → `GitCommitStep.js`
- [ ] `git_add_remote.js` → `GitAddRemoteStep.js`
- [ ] `git_get_remote_url.js` → `GitGetRemoteUrlStep.js`
- [ ] `git_get_last_commit.js` → `GitGetLastCommitStep.js`
- [ ] `git_get_commit_history.js` → `GitGetCommitHistoryStep.js`
- [ ] `git_clone_repository.js` → `GitCloneRepositoryStep.js`
- [ ] `git_init_repository.js` → `GitInitRepositoryStep.js`
- [ ] `git_reset.js` → `GitResetStep.js`
- [ ] `git_merge_branch.js` → `GitMergeBranchStep.js`
- [ ] `git_get_diff.js` → `GitGetDiffStep.js`
- [ ] `git_add_files.js` → `GitAddFilesStep.js`
- [ ] `git_pull_changes.js` → `GitPullChangesStep.js`
- [ ] `git_get_status.js` → `GitGetStatusStep.js`
- [ ] `git_get_branches.js` → `GitGetBranchesStep.js`
- [ ] `git_get_current_branch.js` → `GitGetCurrentBranchStep.js`
- [ ] `git_checkout_branch.js` → `GitCheckoutBranchStep.js`
- [ ] `git_create_pull_request.js` → `GitCreatePullRequestStep.js`
- [ ] `git_create_branch.js` → `GitCreateBranchStep.js`
- [ ] `git_push.js` → `GitPushStep.js`

### Analysis Category (`backend/domain/steps/categories/analysis/`)
- [ ] `project_analysis_step.js` → `ProjectAnalysisStep.js`
- [ ] `architecture_analysis_step.js` → `ArchitectureAnalysisStep.js`
- [ ] `manifest_analysis_step.js` → `ManifestAnalysisStep.js`
- [ ] `performance_analysis_step.js` → `PerformanceAnalysisStep.js`
- [ ] `dependency_analysis_step.js` → `DependencyAnalysisStep.js`
- [ ] `tech_stack_analysis_step.js` → `TechStackAnalysisStep.js`
- [ ] `security_analysis_step.js` → `SecurityAnalysisStep.js`
- [ ] `code_quality_analysis_step.js` → `CodeQualityAnalysisStep.js`

### Other Categories
- [ ] `testing/testing_step.js` → `TestingStep.js`
- [ ] `refactoring/refactor_step.js` → `RefactorStep.js`
- [ ] `refactoring/refactor_generate_task.js` → `RefactorGenerateTaskStep.js`
- [ ] `refactoring/refactor_analyze.js` → `RefactorAnalyzeStep.js`

## Deliverables
- **Files**: All 30+ domain step files renamed to PascalCase
- **Classes**: All internal class names updated to match file names
- **Imports**: All require/import statements updated
- **Registry**: StepRegistry updated with new naming
- **Tests**: Any test files referencing steps updated

## Dependencies
- **Requires**: None (independent subtask)
- **Blocks**: Subtask 2 (Infrastructure validation) and Subtask 3 (Documentation)

## Implementation Strategy

### Phase 1: File Renaming (3 hours)
1. **Systematic Renaming**: Use `git mv` to preserve history
2. **Category by Category**: Start with IDE, then Git, then Analysis
3. **Validation**: Check each category before proceeding

### Phase 2: Class Name Updates (3 hours)
1. **Internal Classes**: Update class declarations to match file names
2. **Module Exports**: Update module.exports to use new class names
3. **Constructor Calls**: Update any `new ClassName()` references

### Phase 3: Import/Registry Updates (2 hours)
1. **Require Statements**: Update all require() calls
2. **StepRegistry**: Update step registration mappings
3. **Factory Patterns**: Update any factory or builder patterns
4. **Workflow References**: Update workflow step references

## Validation Commands
```bash
# Check for remaining snake_case files
find backend/domain/steps/categories -name "*_*.js" | grep -v node_modules

# Validate imports resolve
node -e "require('./backend/domain/steps/StepRegistry')"

# Check for broken references
grep -r "ide_send_message\|git_commit\|project_analysis_step" backend/ --exclude-dir=node_modules
```

## Success Criteria
- [ ] All snake_case files renamed to PascalCase
- [ ] All classes use PascalCase naming
- [ ] No broken import statements
- [ ] StepRegistry loads all steps successfully
- [ ] No runtime module resolution errors
- [ ] Git history preserved for all files

## Risk Mitigation
- **Backup Strategy**: Git branch for easy rollback
- **Incremental Testing**: Test each category before proceeding
- **Import Validation**: Check module resolution after each phase
- **Dependency Mapping**: Document all file dependencies before changes

## Estimated Time
**8 hours** - Perfect fit for task-review.md guidelines

This subtask is independent and focused, making it ideal for systematic execution and validation. 