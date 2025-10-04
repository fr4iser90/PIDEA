# Prompt: Task Status Analysis & Update System

## Goal
Analyze existing tasks to determine their current completion status, identify outdated information, and update task files with accurate progress tracking. Focus on **status evaluation** and **task file updates** rather than implementation validation.

> **Status Update Focus:**  
> This prompt specifically targets:
> - **Completion Status Analysis**: Determine how much of each task is actually done
> - **Outdated Information Detection**: Find tasks with incorrect status or progress
> - **Task File Updates**: Update implementation files with current reality
> - **Progress Tracking**: Accurate progress percentages and milestone status
> - **Status Migration**: Move completed tasks to appropriate status folders

## Language Requirements - MANDATORY

### FORBIDDEN TERMS (Never Use):
- unified, comprehensive, advanced, intelligent, smart, enhanced, optimized, streamlined, consolidated, sophisticated, robust, scalable, efficient, dynamic, flexible, modular, extensible, maintainable, performant

### REQUIRED TERMS (Always Use):
- one, single, main, basic, simple, direct, clear, standard, normal, regular

### EXAMPLES:
- ❌ "UnifiedCacheService" → ✅ "CacheService"
- ❌ "Comprehensive Analysis" → ✅ "Analysis"
- ❌ "Advanced Integration" → ✅ "Integration"
- ❌ "Smart Detection" → ✅ "Detection"
- ❌ "Enhanced Performance" → ✅ "Performance"
- ❌ "Optimized Configuration" → ✅ "Configuration"

### VALIDATION RULE:
Before saving any content, scan for forbidden terms and replace with simple alternatives.

## Core Analysis Process
- **Status Evaluation**: Check actual implementation against planned tasks
- **Progress Assessment**: Determine completion percentage and remaining work
- **Outdated Detection**: Identify tasks with incorrect status information
- **File Updates**: Update task files with current reality
- **Status Migration**: Move tasks to correct status folders (pending/completed/in-progress)
- **Zero User Input Required**: Analyze and update automatically

### Phase 1: Task Discovery & Status Scan
- [ ] **Scan Task Directory**: Find all tasks in docs/09_roadmap/pending/
- [ ] **Read Task Files**: Load index, implementation, and phase files
- [ ] **Extract Current Status**: Parse status from task files
- [ ] **Identify Status Inconsistencies**: Find mismatched status information
- [ ] **Create Status Inventory**: List all tasks with their claimed vs actual status

### Phase 2: Implementation Reality Check
- [ ] **Codebase Analysis**: Check if planned files actually exist
- [ ] **Feature Verification**: Test if described functionality works
- [ ] **API Endpoint Check**: Verify if planned APIs are implemented
- [ ] **Database Schema Check**: Confirm if database changes exist
- [ ] **Configuration Validation**: Check if config changes are applied
- [ ] **Dependency Verification**: Ensure all dependencies are met

### Phase 3: Progress Calculation
- [ ] **File Existence Count**: Count how many planned files exist
- [ ] **Feature Completeness**: Assess which features are working
- [ ] **Phase Completion**: Determine which phases are done
- [ ] **Test Coverage**: Check if tests exist and pass
- [ ] **Documentation Status**: Verify if docs are up-to-date
- [ ] **Calculate Overall Progress**: Determine accurate completion percentage

### Phase 4: Outdated Information Detection
- [ ] **Status Mismatch**: Find tasks marked as completed but not implemented
- [ ] **Progress Inconsistency**: Identify tasks with wrong progress percentages
- [ ] **Date Validation**: Check if last updated dates are accurate
- [ ] **Dependency Status**: Verify if dependencies are actually resolved
- [ ] **Phase Status**: Check if phase completion claims are accurate
- [ ] **File Reference Accuracy**: Ensure all file paths and references are correct

### Phase 5: Task File Updates
- [ ] **Update Progress Percentages**: Set accurate completion percentages
- [ ] **Correct Status Information**: Fix incorrect status claims
- [ ] **Update Last Modified Dates**: Set accurate timestamps
- [ ] **Revise Phase Status**: Mark phases as completed/in-progress/pending
- [ ] **Fix File References**: Update incorrect file paths
- [ ] **Add Reality Notes**: Document actual vs planned differences

### Phase 6: Status Migration
- [ ] **Identify Completed Tasks**: Find tasks that are 100% complete
- [ ] **Identify In-Progress Tasks**: Find tasks that are actively being worked on
- [ ] **Identify Stalled Tasks**: Find tasks that haven't been updated recently
- [ ] **Move Completed Tasks**: Move to docs/09_roadmap/completed/
- [ ] **Update In-Progress Tasks**: Move to docs/09_roadmap/in-progress/
- [ ] **Flag Stalled Tasks**: Mark tasks that need attention

## Status Analysis Rules

### Completion Status Definitions
- **Completed (100%)**: All planned files exist, features work, tests pass, docs updated
- **In Progress (1-99%)**: Some implementation exists, actively being worked on
- **Pending (0%)**: No implementation exists, waiting to start
- **Stalled**: No updates for >30 days, needs review
- **Outdated**: Status information doesn't match reality

### Progress Calculation Formula
```
Progress = (Existing Files / Planned Files) * 0.4 + 
           (Working Features / Planned Features) * 0.3 + 
           (Completed Phases / Total Phases) * 0.2 + 
           (Passing Tests / Total Tests) * 0.1
```

### Status Migration Criteria
- **Move to Completed**: Progress = 100%, all tests pass, docs updated
- **Move to In-Progress**: Progress > 0%, recent activity (< 7 days)
- **Keep in Pending**: Progress = 0%, no recent activity
- **Flag as Stalled**: No activity > 30 days, needs review

## Analysis Output Format

### Task Status Summary
```markdown
## Task Status Analysis - [Date]

### 📊 Overall Statistics
- **Total Tasks Analyzed**: [X]
- **Completed Tasks**: [X] ([X]%)
- **In Progress Tasks**: [X] ([X]%)
- **Pending Tasks**: [X] ([X]%)
- **Stalled Tasks**: [X] ([X]%)
- **Outdated Tasks**: [X] ([X]%)

### ✅ Completed Tasks (Ready for Migration)
- [x] [Task Name] - 100% Complete - Move to completed/
- [x] [Task Name] - 100% Complete - Move to completed/

### 🔄 In Progress Tasks (Active Development)
- [ ] [Task Name] - 75% Complete - Update progress
- [ ] [Task Name] - 45% Complete - Update progress

### ⏳ Pending Tasks (Waiting to Start)
- [ ] [Task Name] - 0% Complete - No implementation found
- [ ] [Task Name] - 0% Complete - No implementation found

### ⚠️ Stalled Tasks (Need Review)
- [ ] [Task Name] - 30% Complete - No updates for 45 days
- [ ] [Task Name] - 60% Complete - No updates for 60 days

### 🚨 Outdated Tasks (Status Mismatch)
- [ ] [Task Name] - Claims 100% but only 40% implemented
- [ ] [Task Name] - Claims completed but files missing
```

### Individual Task Analysis
```markdown
## Task Analysis: [Task Name]

### Current Status vs Reality
- **Claimed Status**: Completed (100%)
- **Actual Status**: In Progress (65%)
- **Status Mismatch**: ✅ Detected

### Implementation Reality Check
#### Files Status
- **Planned Files**: 12
- **Existing Files**: 8
- **Missing Files**: 4
- **File Progress**: 67%

#### Features Status
- **Planned Features**: 6
- **Working Features**: 4
- **Broken Features**: 1
- **Missing Features**: 1
- **Feature Progress**: 67%

#### Phases Status
- **Total Phases**: 4
- **Completed Phases**: 2
- **In Progress Phases**: 1
- **Pending Phases**: 1
- **Phase Progress**: 50%

### Overall Progress Calculation
- **File Progress**: 67% × 0.4 = 26.8%
- **Feature Progress**: 67% × 0.3 = 20.1%
- **Phase Progress**: 50% × 0.2 = 10.0%
- **Test Progress**: 80% × 0.1 = 8.0%
- **Total Progress**: 64.9% ≈ 65%

### Required Updates
- [ ] Update progress from 100% to 65%
- [ ] Change status from "Completed" to "In Progress"
- [ ] Update last modified date to current
- [ ] Mark Phase 3 as "In Progress"
- [ ] Mark Phase 4 as "Pending"
- [ ] Add note about missing files
```

### Status Migration Actions
```markdown
## Status Migration Actions

### Tasks to Move to Completed/
- [ ] [Task Name] - Verified 100% complete
- [ ] [Task Name] - Verified 100% complete

### Tasks to Move to In-Progress/
- [ ] [Task Name] - Active development detected
- [ ] [Task Name] - Active development detected

### Tasks to Update in Place
- [ ] [Task Name] - Update progress from 80% to 65%
- [ ] [Task Name] - Update status from completed to in-progress

### Tasks Requiring Review
- [ ] [Task Name] - Stalled for 45 days, needs attention
- [ ] [Task Name] - Outdated information, needs correction
```

## Automated Analysis Commands

### Task Discovery
```bash
# Find all task directories
find docs/09_roadmap/pending -type d -name "*-*" | head -20

# Count tasks by status
find docs/09_roadmap/pending -name "*-index.md" | wc -l
find docs/09_roadmap/completed -name "*-index.md" | wc -l
find docs/09_roadmap/in-progress -name "*-index.md" | wc -l

# Find tasks with specific patterns
grep -r "Status.*Completed" docs/09_roadmap/pending/
grep -r "Progress.*100%" docs/09_roadmap/pending/
```

### Implementation Verification
```bash
# Check if planned files exist
grep -r "Files to Create" docs/09_roadmap/pending/*/implementation.md

# Verify API endpoints
grep -r "API.*/" docs/09_roadmap/pending/*/implementation.md

# Check database changes
grep -r "Database.*Change" docs/09_roadmap/pending/*/implementation.md
```

### Progress Calculation
```bash
# Count existing vs planned files
find . -name "*.js" | wc -l  # Existing files
grep -r "Files to Create" docs/09_roadmap/pending/*/implementation.md | wc -l  # Planned files

# Check test coverage
npm test -- --coverage 2>/dev/null | grep "All files"
```

## Task File Update Process

### 1. Progress Update
- Calculate accurate progress percentage
- Update progress tracking section
- Revise milestone completion status
- Add reality notes about actual vs planned

### 2. Status Correction
- Fix incorrect status claims
- Update phase completion status
- Correct dependency resolution status
- Revise estimated completion dates

### 3. File Reference Updates
- Fix incorrect file paths
- Update import statements
- Correct API endpoint URLs
- Revise database schema references

### 4. Timestamp Updates
- Set accurate last modified dates
- Update phase completion timestamps
- Revise milestone achievement dates
- Add analysis completion timestamp

### 5. Status Migration
- Move completed tasks to appropriate folder
- Update folder structure for status changes
- Maintain file references after migration
- Update parent task references

## Analysis Checklist

### Pre-Analysis Setup
- [ ] Scan all task directories in docs/09_roadmap/
- [ ] Load all index, implementation, and phase files
- [ ] Set up codebase analysis tools
- [ ] Prepare status migration scripts

### Status Analysis
- [ ] Read each task's claimed status
- [ ] Verify implementation against codebase
- [ ] Calculate accurate progress percentage
- [ ] Identify status mismatches
- [ ] Detect outdated information

### Progress Calculation
- [ ] Count existing vs planned files
- [ ] Test feature functionality
- [ ] Verify phase completion
- [ ] Check test coverage
- [ ] Calculate overall progress

### File Updates
- [ ] Update progress percentages
- [ ] Correct status information
- [ ] Fix file references
- [ ] Update timestamps
- [ ] Add reality notes

### Status Migration
- [ ] Identify completed tasks
- [ ] Identify in-progress tasks
- [ ] Move tasks to correct folders
- [ ] Update file references
- [ ] Maintain directory structure

## Success Criteria
- All task status information is accurate
- Progress percentages reflect reality
- Completed tasks are moved to correct folders
- Outdated information is corrected
- File references are accurate
- Timestamps are current
- Status migration is complete
- Analysis report is comprehensive

## Usage Instructions
1. **Scan task directories** - Find all tasks in docs/09_roadmap/
2. **Analyze claimed status** - Read status from task files
3. **Verify implementation** - Check codebase against plans
4. **Calculate progress** - Determine accurate completion percentage
5. **Detect outdated info** - Find status mismatches
6. **Update task files** - Correct status and progress information
7. **Migrate status** - Move tasks to appropriate folders
8. **Generate report** - Provide comprehensive analysis results

## Example Usage
> Analyze all tasks in docs/09_roadmap/pending/ to determine their actual completion status. Check if tasks marked as "Completed" are actually 100% implemented, identify tasks with outdated progress information, update task files with accurate status, and move completed tasks to the appropriate status folder. Focus on status accuracy rather than implementation validation.

## Integration with Task Review
This prompt complements the task-review.md prompt by focusing specifically on:
- **Status Analysis**: Determining actual vs claimed completion
- **Progress Updates**: Correcting inaccurate progress information
- **Status Migration**: Moving tasks to correct status folders
- **Outdated Detection**: Finding tasks with incorrect information

While task-review.md focuses on implementation validation and file creation, this prompt focuses on status accuracy and task organization.
