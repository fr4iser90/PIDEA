# Prompt: Task Review & Validation System

## Goal
Review, validate, and analyze development tasks against the actual codebase. Analyze implementation files, verify code existence, identify gaps, and create phase files for task splitting when needed. **AUTOMATICALLY CREATE MISSING FILES** (index, implementation, phase files) if they don't exist. **DO NOT modify existing docs/09_roadmap/tasks/[category]/[name]/[name]-implementation.md** - only analyze and create missing files.

> **File Pattern Requirement:**  
> All Index, Implementation and Phase files must always be created using this pattern:  
> - **Index**: docs/09_roadmap/tasks/[category]/[name]/[name]-index.md  
> - **Implementation**: docs/09_roadmap/tasks/[category]/[name]/[name]-implementation.md  
> - **Phase**: docs/09_roadmap/tasks/[category]/[name]/[name]-phase-[number].md  
> If ANY file is missing, it MUST be created automatically. This pattern is required for orchestration and grouping in the system.

## Core Review Process
- **File Structure Validation**: Check if all required files exist, create missing ones
- **Analyze Codebase**: Check Plan against codebase, collect all data u need.
- **Pattern**: Match current pattern / styles.
- **Zero User Input Required**: Update file, and add Validation marker.
- **Error Recovery**: Handle failures and continue execution
- **Validation**: Verify each phase completion before proceeding

### Phase 0: File Structure Validation & Auto-Creation
- [ ] **Check Index File**: Verify `[name]-index.md` exists, create if missing
- [ ] **Check Implementation File**: Verify `[name]-implementation.md` exists, create if missing
- [ ] **Check Phase Files**: Verify all referenced phase files exist, create missing ones
- [ ] **Validate Directory Structure**: Ensure category/task folders exist
- [ ] **Extract Task Metadata**: Parse existing files for task name, category, priority
- [ ] **Auto-Generate Missing Files**: Create any missing files with proper templates
- [ ] **Update File References**: Ensure all files reference each other correctly

### Phase 1: Codebase Analysis
- [ ] Scan entire project structure for current state
- [ ] Identify existing files, components, and services
- [ ] Map current architecture patterns and conventions
- [ ] Document actual tech stack and dependencies
- [ ] Analyze existing code quality and patterns
- [ ] Assess task complexity and splitting requirements

### Phase 2: Implementation File Validation
- [ ] Read existing implementation file
- [ ] Cross-reference planned files with actual codebase
- [ ] Verify file paths and directory structures
- [ ] Check for naming convention consistency
- [ ] Validate technical requirements against reality

### Phase 3: Gap Analysis
- [ ] Identify missing files from implementation plan
- [ ] Detect incomplete implementations
- [ ] Find broken dependencies or imports
- [ ] Locate outdated or incorrect file references
- [ ] Spot architectural inconsistencies

### Phase 4: Code Quality Assessment
- [ ] Review existing code for best practices
- [ ] Check for security vulnerabilities
- [ ] Analyze performance implications
- [ ] Verify error handling patterns
- [ ] Assess test coverage and quality

### Phase 5: Implementation File Enhancement
- [ ] Update file paths to match actual structure
- [ ] Add missing dependencies and imports
- [ ] Correct technical specifications
- [ ] Enhance implementation details
- [ ] Add real-world constraints and considerations
- [ ] Evaluate and recommend task splitting if needed
- [ ] Create subtask breakdown for large tasks

## File Structure Validation Rules

### Required File Check
- **Index File**: `docs/09_roadmap/tasks/[category]/[name]/[name]-index.md` - MUST exist
- **Implementation File**: `docs/09_roadmap/tasks/[category]/[name]/[name]-implementation.md` - MUST exist
- **Phase Files**: `docs/09_roadmap/tasks/[category]/[name]/[name]-phase-[number].md` - MUST exist for all referenced phases
- **Directory Structure**: Category and task folders MUST exist

### Auto-Creation Process
1. **Extract Task Info**: Parse existing files or URL path to get category and task name
2. **Check File Existence**: Verify each required file exists
3. **Create Missing Files**: Generate missing files using proper templates
4. **Update References**: Ensure all files link to each other correctly
5. **Validate Structure**: Confirm all files follow naming conventions

### File Creation Templates

#### Index File Template (if missing)
```markdown
# [Task Name] - Master Index

## 📋 Task Overview
- **Name**: [Extracted from path or existing files]
- **Category**: [Extracted from path]
- **Priority**: [Extracted from implementation file or default: Medium]
- **Status**: [Planning/In Progress/Completed]
- **Total Estimated Time**: [Extracted from implementation file]
- **Created**: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
- **Last Updated**: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]

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
| Phase | File | Status | Time | Progress |
|-------|------|--------|------|----------|
| 1 | [Phase 1](./[name]-phase-1.md) | [Status] | [X]h | [X]% |
| 2 | [Phase 2](./[name]-phase-2.md) | [Status] | [X]h | [X]% |
| 3 | [Phase 3](./[name]-phase-3.md) | [Status] | [X]h | [X]% |

## 🔄 Subtask Management
### Active Subtasks
- [ ] [Subtask Name](./[subtask-name].md) - [Status] - [Progress]%

### Completed Subtasks
- [x] [Completed Subtask](./[completed-subtask].md) - ✅ Done

### Pending Subtasks
- [ ] [Pending Subtask](./[pending-subtask].md) - ⏳ Waiting

## 📈 Progress Tracking
- **Overall Progress**: [X]% Complete
- **Current Phase**: [Phase Number]
- **Next Milestone**: [Description]
- **Estimated Completion**: [Date]

## 🔗 Related Tasks
- **Dependencies**: [List of tasks this depends on]
- **Dependents**: [List of tasks that depend on this]
- **Related**: [List of related tasks]

## 📝 Notes & Updates
### [Date] - [Update Type]
- [Description of update]
- [Files modified]
- [Progress made]

## 🚀 Quick Actions
- [View Implementation Plan](./[name]-implementation.md)
- [Start Phase 1](./[name]-phase-1.md)
- [Review Progress](#progress-tracking)
- [Update Status](#notes--updates)
```

#### Implementation File Template (if missing)
```markdown
# [Task Name] - Implementation Plan

## 1. Project Overview
- **Feature/Component Name**: [Extracted from task name]
- **Priority**: [Extracted or default: Medium]
- **Category**: [Extracted from path]
- **Estimated Time**: [To be determined]
- **Dependencies**: [To be identified]
- **Related Issues**: [To be identified]
- **Created**: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
- **Last Updated**: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]

## 2. Technical Requirements
- **Tech Stack**: [To be determined based on codebase analysis]
- **Architecture Pattern**: [To be determined]
- **Database Changes**: [To be identified]
- **API Changes**: [To be identified]
- **Frontend Changes**: [To be identified]
- **Backend Changes**: [To be identified]

## 3. File Impact Analysis
#### Files to Modify:
- [ ] [To be identified during codebase analysis]

#### Files to Create:
- [ ] [To be identified during codebase analysis]

#### Files to Delete:
- [ ] [To be identified during codebase analysis]

## 4. Implementation Phases
#### Phase 1: Foundation Setup ([X] hours)
- [ ] [To be detailed]

#### Phase 2: Core Implementation ([X] hours)
- [ ] [To be detailed]

#### Phase 3: Integration ([X] hours)
- [ ] [To be detailed]

#### Phase 4: Testing & Documentation ([X] hours)
- [ ] [To be detailed]

#### Phase 5: Deployment & Validation ([X] hours)
- [ ] [To be detailed]

## 5. Code Standards & Patterns
- **Coding Style**: [To be determined from codebase]
- **Naming Conventions**: [To be determined from codebase]
- **Error Handling**: [To be determined from codebase]
- **Logging**: [To be determined from codebase]
- **Testing**: [To be determined from codebase]
- **Documentation**: [To be determined from codebase]

## 6. Security Considerations
- [ ] [To be identified]

## 7. Performance Requirements
- **Response Time**: [To be determined]
- **Throughput**: [To be determined]
- **Memory Usage**: [To be determined]
- **Database Queries**: [To be determined]
- **Caching Strategy**: [To be determined]

## 8. Testing Strategy
#### Unit Tests:
- [ ] [To be identified]

#### Integration Tests:
- [ ] [To be identified]

#### E2E Tests:
- [ ] [To be identified]

## 9. Documentation Requirements
- [ ] [To be identified]

## 10. Deployment Checklist
- [ ] [To be identified]

## 11. Rollback Plan
- [ ] [To be identified]

## 12. Success Criteria
- [ ] [To be identified]

## 13. Risk Assessment
- [ ] [To be identified]

## 14. AI Auto-Implementation Instructions
- **source_type**: 'markdown_doc'
- **source_path**: 'docs/09_roadmap/tasks/[category]/[name]/[name]-implementation.md'
- **category**: '[category]'
- **automation_level**: 'semi_auto'
- **confirmation_required**: true
- **max_attempts**: 3
- **git_branch_required**: true
- **new_chat_required**: true

## 15. References & Resources
- [To be identified]
```

#### Phase File Template (if missing)
```markdown
# [Task Name] – Phase [Number]: [Phase Title]

## Overview
[To be determined based on implementation plan]

## Objectives
- [ ] [To be identified]

## Deliverables
- [ ] [To be identified]

## Dependencies
- Requires: [To be identified]
- Blocks: [To be identified]

## Estimated Time
[X] hours

## Success Criteria
- [ ] [To be identified]
```

## Validation Rules

### File Existence Validation
- **Required**: All planned files must exist or be clearly marked for creation
- **Path Accuracy**: File paths must match actual project structure
- **Naming Consistency**: Follow established project naming conventions
- **Import Validation**: All imports must resolve to existing files
- **Dependency Check**: All dependencies must be available in package.json

### Code Quality Validation
- **Syntax Check**: All code must be syntactically correct
- **Pattern Consistency**: Follow established architectural patterns
- **Error Handling**: Implement proper error handling throughout
- **Security**: Validate input/output and authentication
- **Performance**: Check for performance bottlenecks
- **Pattern Validation**: Verify all functionality uses established patterns, never manual implementations
- **Helper Usage**: Ensure all operations use established helpers for automatic handling
- **No Hardcoded Values**: Never hardcode tokens, headers, or credentials - use established systems

### Integration Validation
- **API Endpoints**: Verify all endpoints are properly connected
- **Database**: Ensure schema matches implementation
- **Frontend-Backend**: Validate data flow between layers
- **Event System**: Check event handling and messaging
- **WebSocket**: Verify real-time communication setup

### Task Splitting Validation
- **Size Assessment**: Tasks > 8 hours should be split
- **Complexity Check**: Tasks with > 10 files or > 5 phases need splitting
- **Dependency Analysis**: Independent components can be parallel subtasks
- **Risk Isolation**: High-risk components should be separate subtasks
- **Atomic Units**: Each subtask should be independently testable

## Review Output Format

### File Structure Validation Results
```markdown
## File Structure Validation - [Date]

### ✅ Existing Files
- [x] Index: `docs/09_roadmap/tasks/[category]/[name]/[name]-index.md` - Status: Found
- [x] Implementation: `docs/09_roadmap/tasks/[category]/[name]/[name]-implementation.md` - Status: Found
- [x] Phase 1: `docs/09_roadmap/tasks/[category]/[name]/[name]-phase-1.md` - Status: Found

### ⚠️ Missing Files (Auto-Created)
- [ ] Index: `docs/09_roadmap/tasks/[category]/[name]/[name]-index.md` - Status: Created with template
- [ ] Implementation: `docs/09_roadmap/tasks/[category]/[name]/[name]-implementation.md` - Status: Created with template
- [ ] Phase 2: `docs/09_roadmap/tasks/[category]/[name]/[name]-phase-2.md` - Status: Created with template

### 🔧 Directory Structure
- [x] Category folder: `docs/09_roadmap/tasks/[category]/` - Status: Exists
- [x] Task folder: `docs/09_roadmap/tasks/[category]/[name]/` - Status: Exists
- [ ] Missing directories created automatically

### 📊 File Status Summary
- **Total Required Files**: 5
- **Existing Files**: 3
- **Missing Files**: 2
- **Auto-Created Files**: 2
- **Validation Status**: ✅ Complete
```

### Implementation File Updates
```markdown
## Validation Results - [Date]

### ✅ Completed Items
- [x] File: `path/to/file.js` - Status: Implemented correctly
- [x] Feature: User authentication - Status: Working as expected

### ⚠️ Issues Found
- [ ] File: `path/to/missing.js` - Status: Not found, needs creation
- [ ] Import: `./utils/helper` - Status: File doesn't exist
- [ ] API: `/api/users` - Status: Endpoint not implemented

### 🔧 Improvements Made
- Updated file path from `src/components/` to `frontend/src/components/`
- Added missing dependency: `express-validator`
- Corrected import statement: `import { AuthService } from '../services/AuthService'`

### 📊 Code Quality Metrics
- **Coverage**: 85% (needs improvement)
- **Security Issues**: 2 medium, 1 low
- **Performance**: Good (response time < 200ms)
- **Maintainability**: Excellent (clean code patterns)

### 🚀 Next Steps
1. Create missing files: `backend/services/EmailService.js`
2. Fix security vulnerabilities in `AuthController.js`
3. Add integration tests for user registration
4. Update API documentation

### 📋 Task Splitting Recommendations
- **Main Task**: User Authentication System (12 hours) → Split into 3 subtasks
- **Subtask 1**: Authentication Backend (4 hours) - Foundation services
- **Subtask 2**: Frontend Components (4 hours) - UI and forms
- **Subtask 3**: Integration & Testing (4 hours) - End-to-end validation
```

### Gap Analysis Report
```markdown
## Gap Analysis - [Feature Name]

### Missing Components
1. **Backend Services**
   - EmailService (planned but not implemented)
   - PasswordResetService (referenced but missing)

2. **Frontend Components**
   - PasswordResetForm (planned but not created)
   - UserProfile (incomplete implementation)

3. **Database**
   - password_reset_tokens table (referenced in code but not in schema)

4. **API Endpoints**
   - POST /api/auth/reset-password (planned but not implemented)
   - GET /api/users/profile (incomplete)

### Incomplete Implementations
1. **User Registration**
   - Missing email verification
   - No password strength validation
   - Incomplete error handling

2. **Authentication Flow**
   - JWT refresh token not implemented
   - Session management incomplete
   - Logout functionality missing

### Broken Dependencies
1. **Import Errors**
   - `../utils/validation` (file doesn't exist)
   - `../../config/database` (wrong path)

2. **Missing Packages**
   - `bcryptjs` (used but not in package.json)
   - `jsonwebtoken` (version mismatch)

### Task Splitting Analysis
1. **Current Task Size**: 12 hours (exceeds 8-hour limit)
2. **File Count**: 15 files to modify (exceeds 10-file limit)
3. **Phase Count**: 6 phases (exceeds 5-phase limit)
4. **Recommended Split**: 3 subtasks of 4 hours each
5. **Independent Components**: Backend, Frontend, Integration
```

## Automated Validation Commands

### File System Validation
```bash
# Check file existence
find . -name "*.js" -o -name "*.jsx" | grep -E "(AuthService|UserController)"

# Validate imports
grep -r "import.*from" src/ | grep -v "node_modules"

# Check package dependencies
npm list --depth=0
```

### Code Quality Checks
```bash
# Run linting
npm run lint

# Run tests
npm test

# Check security vulnerabilities
npm audit

# Performance analysis
npm run build -- --analyze
```

### Database Validation
```bash
# Check schema consistency
psql -d database_name -c "\dt"

# Validate migrations
npm run migrate:status

# Check data integrity
npm run db:validate
```

## Implementation File Enhancement Process

### 1. Update File Structure
- Correct all file paths to match actual project structure
- Add missing directories and files
- Remove references to non-existent files
- Update import statements with correct paths

### 2. Task Splitting Assessment
- Evaluate task size against 8-hour threshold
- Count files to modify (limit: 10 files)
- Count implementation phases (limit: 5 phases)
- Identify independent components for parallel development
- Assess risk factors for isolation
- Create subtask breakdown with clear boundaries

### 3. Enhance Technical Details
- Add actual code examples from existing files
- Include real configuration values
- Document actual API responses
- Add error handling patterns from codebase

### 4. Improve Implementation Steps
- Break down complex tasks into smaller steps
- Add validation checkpoints
- Include rollback procedures
- Add troubleshooting guides

### 5. Update Dependencies
- List actual package versions used
- Include peer dependencies
- Document environment requirements
- Add build and deployment scripts

## Review Checklist

### Pre-Review Setup
- [ ] Clone/fetch latest codebase
- [ ] Install all dependencies
- [ ] Set up development environment
- [ ] Configure database and services
- [ ] Run existing tests to verify baseline

### File Structure Validation
- [ ] Check if index file exists, create if missing
- [ ] Check if implementation file exists, create if missing
- [ ] Check if all phase files exist, create missing ones
- [ ] Validate directory structure exists
- [ ] Extract task metadata from existing files or path
- [ ] Auto-generate missing files with proper templates
- [ ] Update all file references and links

### Codebase Analysis
- [ ] Map project structure and architecture
- [ ] Identify key components and services
- [ ] Document current state and capabilities
- [ ] List existing patterns and conventions
- [ ] Note any technical debt or issues

### Implementation Validation
- [ ] Check each planned file against actual codebase
- [ ] Verify file paths and naming conventions
- [ ] Validate imports and dependencies
- [ ] Test API endpoints and functionality
- [ ] Review database schema and migrations

### Quality Assessment
- [ ] Run code quality tools (ESLint, Prettier)
- [ ] Execute test suites and check coverage
- [ ] Perform security analysis
- [ ] Test performance and scalability
- [ ] Review error handling and logging

### Documentation Review
- [ ] Update implementation file with findings
- [ ] Correct technical specifications
- [ ] Add missing implementation details
- [ ] Include real-world examples
- [ ] Document lessons learned
- [ ] Create subtask breakdown if splitting required
- [ ] Update parent task with subtask references

## Success Criteria
- All required files (index, implementation, phase) exist
- File paths match actual project structure
- Implementation plan reflects real codebase state
- Technical specifications are accurate and complete
- Dependencies and imports are validated
- Code quality meets project standards
- Security and performance requirements are met
- Documentation is comprehensive and up-to-date
- Large tasks are properly split into manageable subtasks
- Subtask dependencies and order are clearly defined
- Each subtask is independently deliverable and testable

## Usage Instructions
1. **Validate file structure** - Check if all required files exist, create missing ones
2. Run codebase analysis to understand current state
3. Validate implementation file against actual code
4. Identify gaps, issues, and improvements needed
5. Update implementation file with findings
6. Provide actionable recommendations
7. Document lessons learned and best practices
8. Assess task size and complexity for splitting requirements
9. Create subtask breakdown for large tasks
10. Validate subtask dependencies and execution order
11. Ensure each subtask meets size and complexity guidelines

## Example Usage
> Review and validate the user authentication implementation against the current codebase. First check if all required files (index, implementation, phase files) exist and create any missing ones automatically. Then analyze the auth-implementation.md file, check all planned files exist, verify API endpoints work, assess if the 12-hour task needs splitting into smaller subtasks, and update the implementation file with any gaps, improvements, or subtask breakdown found.

## Phase File Creation for Subtasks

### Phase File Structure
When a task needs to be split into subtasks, create individual phase files following this structure:

**File Path Pattern:**
```
docs/09_roadmap/tasks/[category]/[name]/[name]-phase-[number].md
```

**Example:**
```
docs/09_roadmap/tasks/backend/unified-workflow-legacy-migration/unified-workflow-legacy-migration-phase-1.md
docs/09_roadmap/tasks/backend/unified-workflow-legacy-migration/unified-workflow-legacy-migration-phase-2.md
docs/09_roadmap/tasks/backend/unified-workflow-legacy-migration/unified-workflow-legacy-migration-phase-3.md
```

### Phase File Content Template
Each phase file should contain:

```markdown
# [Task Name] – Phase [Number]: [Phase Title]

## Overview
Brief description of what this phase accomplishes.

## Objectives
- [ ] Objective 1
- [ ] Objective 2
- [ ] Objective 3

## Deliverables
- File: `path/to/file.js` - Description
- API: `/api/endpoint` - Description
- Test: `tests/unit/feature.test.js` - Description

## Dependencies
- Requires: Phase X completion
- Blocks: Phase Y start

## Estimated Time
X hours

## Success Criteria
- [ ] All objectives completed
- [ ] All deliverables created
- [ ] Tests passing
- [ ] Documentation updated
```

### Integration with Parent Task
In the parent task's implementation file, add a section linking to all phase files:

```markdown
### 📋 Task Splitting Recommendations
- **Subtask 1**: [task-name-phase-1.md](./task-name-phase-1.md) – Phase 1 Title
- **Subtask 2**: [task-name-phase-2.md](./task-name-phase-2.md) – Phase 2 Title
- **Subtask 3**: [task-name-phase-3.md](./task-name-phase-3.md) – Phase 3 Title
```

### Automatic Phase File Creation
The review system should automatically:
1. Detect when a task exceeds size/complexity limits
2. Create the appropriate number of phase files
3. Generate phase content based on task analysis
4. Update the parent task with phase file references
5. Ensure all phase files follow the naming convention
6. Maintain proper category and name extraction from file paths
