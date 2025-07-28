# Prompt: Task Index File Manager

## Goal
Create, update, and maintain master index files that serve as central navigation hubs for all task-related files, phases, and subtasks. Automatically track progress, dependencies, and file relationships.

## Core Principles
- **Central Navigation**: One index file per task with all related files
- **Auto-Updates**: Automatically update when phases/subtasks change
- **Progress Tracking**: Real-time progress and status updates
- **Dependency Management**: Track task relationships and dependencies
- **History Tracking**: Maintain update history and change log

## Index File Structure

### File Path Pattern
```
docs/09_roadmap/tasks/[category]/[name]/[name]-index.md
```

### Template Structure
```markdown
# [Task Name] - Master Index

## 📋 Task Overview
- **Name**: [Task Name]
- **Category**: [category]
- **Priority**: [High/Medium/Low]
- **Status**: [Planning/In Progress/Completed/Blocked]
- **Total Estimated Time**: [X hours]
- **Actual Time**: [X hours]
- **Created**: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"] - Reference `@timestamp-utility.md`
- **Last Updated**: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"] - Reference `@timestamp-utility.md`
- **Assigned To**: [Developer/Team]

## 📁 File Structure
```
docs/09_roadmap/tasks/[category]/[name]/
├── [name]-index.md (this file)
├── [name]-implementation.md
├── [name]-phase-1.md
├── [name]-phase-2.md
└── [name]-phase-3.md
```

## 🎯 Main Implementation
- **[Task Name Implementation](./[name]-implementation.md)** - Complete implementation plan and specifications

## 📊 Phase Breakdown
| Phase | File | Status | Time | Progress | Started | Completed |
|-------|------|--------|------|----------|---------|-----------|
| 1 | [Phase 1](./[name]-phase-1.md) | [Status] | [X]h | [X]% | [Date] | [Date] |
| 2 | [Phase 2](./[name]-phase-2.md) | [Status] | [X]h | [X]% | [Date] | [Date] |
| 3 | [Phase 3](./[name]-phase-3.md) | [Status] | [X]h | [X]% | [Date] | [Date] |

**Status Legend**: 🟢 Planning | 🟡 In Progress | 🔴 Blocked | ✅ Completed

## 🔄 Subtask Management
### Active Subtasks
- [ ] [Subtask Name](./[subtask-name].md) - [Status] - [Progress]% - Started: [Date]

### Completed Subtasks
- [x] [Completed Subtask](./[completed-subtask].md) - ✅ Done - Completed: [Date]

### Pending Subtasks
- [ ] [Pending Subtask](./[pending-subtask].md) - ⏳ Waiting - Depends on: [Phase/Task]

## 📈 Progress Tracking
- **Overall Progress**: [X]% Complete
- **Current Phase**: [Phase Number]
- **Next Milestone**: [Description]
- **Estimated Completion**: [Date]
- **Time Remaining**: [X hours]
- **Velocity**: [X hours/day]

## 🔗 Related Tasks
### Dependencies (This task depends on)
- [Task Name](./../[dependency-task]/[dependency-task]-index.md) - [Status] - [Progress]%

### Dependents (Tasks that depend on this)
- [Task Name](./../[dependent-task]/[dependent-task]-index.md) - [Status] - [Progress]%

### Related Tasks
- [Task Name](./../[related-task]/[related-task]-index.md) - [Status] - [Progress]%

## 📝 Notes & Updates
### [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"] - [Update Type] - [Author] - Reference `@timestamp-utility.md`
- [Description of update]
- [Files modified]
- [Progress made]
- [Time spent]

### [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"] - [Update Type] - [Author] - Reference `@timestamp-utility.md`
- [Description of update]
- [Files modified]
- [Progress made]
- [Time spent]

## 🚀 Quick Actions
- [View Implementation Plan](./[name]-implementation.md)
- [Start Phase 1](./[name]-phase-1.md)
- [Review Progress](#progress-tracking)
- [Update Status](#notes--updates)
- [View Dependencies](#related-tasks)

## 📋 Checklist
### Pre-Implementation
- [ ] Requirements reviewed
- [ ] Dependencies identified
- [ ] Environment setup
- [ ] Team assigned

### Implementation
- [ ] Phase 1 completed
- [ ] Phase 2 completed
- [ ] Phase 3 completed
- [ ] Testing completed

### Post-Implementation
- [ ] Documentation updated
- [ ] Code review completed
- [ ] Deployment successful
- [ ] User acceptance testing passed
```

## Auto-Update Triggers

### When to Update Index File
1. **New Phase Created** - Add to phase breakdown table
2. **Phase Status Changed** - Update status and progress
3. **Subtask Split** - Add to subtask management section
4. **Progress Made** - Update progress tracking and time spent
5. **Dependency Changed** - Update related tasks section
6. **File Modified** - Update last modified date
7. **Status Changed** - Update overall status
8. **Time Logged** - Update actual time spent

### Update Process
```markdown
### [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"] - [Update Type] - [Author] - Reference `@timestamp-utility.md`
- **Action**: [What was done]
- **Files Modified**: [List of files changed]
- **Progress**: [X]% → [Y]%
- **Time Spent**: [X] hours
- **Next Steps**: [What's next]
- **Blockers**: [Any issues encountered]
```

## Index File Management Commands

### Create New Index File
```bash
# When creating a new task
touch docs/09_roadmap/tasks/[category]/[name]/[name]-index.md
# Generate index content using template
```

### Update Phase Status
```bash
# When phase status changes
# Update phase breakdown table
# Update overall progress
# Add update note
```

### Add Subtask
```bash
# When task is split
# Add to subtask management section
# Update dependencies
# Recalculate time estimates
```

### Track Progress
```bash
# When progress is made
# Update progress percentage
# Update time spent
# Add update note
# Recalculate completion date
```

## Integration with Other Prompts

### Task Creation Integration
When `task-create.md` creates a new task:
1. Generate index file automatically
2. Set initial status to "Planning"
3. Create phase breakdown table
4. Set up dependency tracking

### Task Review Integration
When `task-review.md` reviews a task:
1. Update index file with findings
2. Add review notes to updates section
3. Update status if needed
4. Recalculate estimates if changed

### Task Execution Integration
When `task-execute.md` executes a task:
1. Update phase status to "In Progress"
2. Track time spent
3. Update progress percentage
4. Add execution notes

### Phase Creation Integration
When `task-review-phases.md` creates phases:
1. Add new phases to breakdown table
2. Update subtask management
3. Recalculate total time
4. Update dependencies

## Index File Benefits

### For Developers
- **Quick Overview**: See all task files in one place
- **Progress Tracking**: Monitor completion status
- **Dependency Awareness**: Know what blocks what
- **Time Management**: Track actual vs estimated time
- **History**: See what changed and when

### For Project Managers
- **Status Reports**: Quick status check across all tasks
- **Resource Planning**: See who's working on what
- **Dependency Management**: Identify blockers early
- **Progress Monitoring**: Track overall project progress
- **Time Tracking**: Monitor actual vs planned time

### For Teams
- **Collaboration**: Shared understanding of task status
- **Communication**: Central place for updates
- **Coordination**: See dependencies and relationships
- **Knowledge Sharing**: History of changes and decisions
- **Onboarding**: New team members can quickly understand

## Usage Instructions

### Creating Index Files
1. **Automatic Creation**: Index files are created automatically with new tasks
2. **Manual Creation**: Use template for existing tasks without index files
3. **Bulk Creation**: Generate index files for all tasks in a category

### Updating Index Files
1. **Phase Updates**: Update when phase status changes
2. **Progress Updates**: Update when progress is made
3. **Dependency Updates**: Update when dependencies change
4. **Time Updates**: Update when time is logged
5. **Status Updates**: Update when overall status changes

### Maintaining Index Files
1. **Regular Reviews**: Check index files weekly
2. **Consistency**: Ensure all tasks have index files
3. **Accuracy**: Keep information up to date
4. **Completeness**: Ensure all sections are filled
5. **Links**: Verify all file links work

## Example Usage

### Create Index for New Task
> Create a master index file for the "User Authentication System" task in the backend category. The task has 3 phases, estimated 12 hours total, and depends on the "Database Migration" task.

### Update Index for Progress
> Update the index file for "User Authentication System" - Phase 1 is now 75% complete, 3 hours spent, and Phase 2 can now start.

### Split Task and Update Index
> The "User Authentication System" task needs to be split into 3 subtasks. Update the index file to reflect the new structure with subtask management.

### Track Dependencies
> The "User Authentication System" task is blocked because its dependency "Database Migration" is delayed. Update the index file to reflect this blocker.

---

**Note**: This index file system provides a central hub for all task-related information, making it easy to track progress, manage dependencies, and maintain project overview across all tasks and phases. 