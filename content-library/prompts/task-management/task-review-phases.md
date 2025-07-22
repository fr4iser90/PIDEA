# Prompt: Task Phase Creation & Splitting System

## Goal
Analyze files to determine if task splitting is needed and create phase files for large or complex tasks. **DO NOT modify the implementation file directly** - only analyze and create phase files when splitting is required.

> **File Pattern Requirement:**  
> All phase files must follow this pattern:  
> - Phase: docs/09_roadmap/tasks/[category]/[name]/[name]-phase-[number].md  
> If splitting is needed, phase files must be created automatically. This pattern is required for orchestration and grouping in the system.

## Core Review Process
- **Analyze Codebase**: Check Plan against codebase, collect all data u need.
- **Pattern**: Match current pattern / styles.
- **Zero User Input Required**: Update file, and add Validation marker.
- **Error Recovery**: Handle failures and continue execution
- **Validation**: Verify each phase completion before proceeding


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
- All file paths match actual project structure
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
1. Run codebase analysis to understand current state
2. Validate implementation file against actual code
3. Identify gaps, issues, and improvements needed
4. Update implementation file with findings
5. Provide actionable recommendations
6. Document lessons learned and best practices
7. Assess task size and complexity for splitting requirements
8. Create subtask breakdown for large tasks
9. Validate subtask dependencies and execution order
10. Ensure each subtask meets size and complexity guidelines

## Example Usage
> Review and validate the user authentication implementation against the current codebase. Analyze the auth-implementation.md file, check all planned files exist, verify API endpoints work, assess if the 12-hour task needs splitting into smaller subtasks, and update the implementation file with any gaps, improvements, or subtask breakdown found.

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
