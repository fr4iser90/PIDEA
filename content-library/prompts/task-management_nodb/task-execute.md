# Prompt: Complete Automated Task Execution

## Goal
Execute complete development tasks automatically with phase-by-phase implementation, automatic file creation/modification, and full task completion without requiring user input or confirmation.

**Note**: Tasks are automatically organized in hierarchical folder structure: `docs/09_roadmap/tasks/[category]/[name]/`

## Core Principles
- **Zero User Input Required**: Execute all phases automatically
- **Complete Implementation**: Create/modify all necessary files
- **Phase-by-Phase Execution**: Follow structured implementation approach
- **Automatic Updates**: Update implementation files and documentation
- **Error Recovery**: Handle failures and continue execution
- **Validation**: Verify each phase completion before proceeding

## Execution Strategy

### Phase 1: Analysis & Planning
- [ ] Analyze current codebase structure
- [ ] Identify all impacted files and dependencies
- [ ] Create implementation plan with exact file paths
- [ ] Validate technical requirements and constraints
- [ ] Generate detailed task breakdown

### Phase 2: Foundation Setup
- [ ] Create/update implementation documentation file
- [ ] Set up required dependencies and configurations
- [ ] Create base file structures and directories
- [ ] Initialize core components and services
- [ ] Configure environment and build settings

### Phase 3: Core Implementation
- [ ] Implement main functionality across all layers
- [ ] Create/modify domain entities and value objects
- [ ] Implement application services and handlers
- [ ] Create/modify infrastructure components
- [ ] Implement presentation layer components
- [ ] Add error handling and validation logic

### Phase 4: Integration & Connectivity
- [ ] Connect components with existing systems
- [ ] Update API endpoints and controllers
- [ ] Integrate frontend and backend components
- [ ] Implement event handling and messaging
- [ ] Connect database repositories and services
- [ ] Set up WebSocket connections if needed

### Phase 5: Testing Implementation
- [ ] Create unit tests for all components
- [ ] Implement integration tests
- [ ] Add end-to-end test scenarios
- [ ] Create test data and fixtures
- [ ] Set up test environment configurations

### Phase 6: Documentation & Validation
- [ ] Update all relevant documentation files
- [ ] Create user guides and API documentation
- [ ] Update README files and architecture docs
- [ ] Validate implementation against requirements
- [ ] Perform code quality checks

### Phase 7: Deployment Preparation
- [ ] Update deployment configurations
- [ ] Create migration scripts if needed
- [ ] Update environment variables
- [ ] Prepare rollback procedures
- [ ] Validate deployment readiness

## File Management Rules

### Automatic File Creation
- Create all new files with proper structure and content
- Follow project naming conventions and patterns
- Include all necessary imports and dependencies
- Add proper error handling and validation
- Implement complete functionality, not stubs
- **Organize files in hierarchical structure**: `docs/09_roadmap/tasks/[category]/[name]/`
- **Create main implementation file**: `[name]-implementation.md`
- **Create phase files**: `[name]-phase-[number].md` for subtasks

### Intelligent Test Path Resolution
```javascript
// Smart test path detection for monorepo structure
const resolveTestPath = (category, componentName, componentType = 'service') => {
  const componentTypeMapping = {
    // Backend components
    'service': 'unit', 'controller': 'unit', 'repository': 'unit', 'entity': 'unit',
    'middleware': 'unit', 'handler': 'unit', 'command': 'unit', 'api': 'integration',
    'database': 'integration', 'workflow': 'integration',
    
    // Frontend components  
    'component': 'unit', 'hook': 'unit', 'store': 'unit', 'page': 'integration', 'flow': 'e2e'
  };
  
  const categoryPaths = {
    'backend': 'backend/tests', 'frontend': 'frontend/tests', 'database': 'backend/tests',
    'api': 'backend/tests', 'security': 'backend/tests', 'performance': 'backend/tests',
    'testing': 'backend/tests', 'documentation': 'backend/tests', 'migration': 'backend/tests',
    'automation': 'backend/tests', 'ai': 'backend/tests', 'ide': 'backend/tests'
  };
  
  const basePath = categoryPaths[category] || 'tests';
  const testType = componentTypeMapping[componentType] || 'unit';
  const extension = category === 'frontend' ? '.test.jsx' : '.test.js';
  
  return `${basePath}/${testType}/${componentName}${extension}`;
};
```

### Automatic File Modification
- Update existing files with new functionality
- Maintain existing code structure and patterns
- Preserve existing functionality while adding features
- Update imports and dependencies as needed
- Ensure backward compatibility

### Implementation File Updates
- Create/update `docs/09_roadmap/tasks/[category]/[name]/[name]-implementation.md`
- Create/update phase files: `docs/09_roadmap/tasks/[category]/[name]/[name]-phase-[number].md`
- Track progress through all phases with timestamps: `[RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]` - Reference `@timestamp-utility.md`
- Document all changes and decisions with timestamps
- Update completion status automatically with timestamps
- Include technical details and implementation notes
- Update "Last Updated" field in index files: `[RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]` - Reference `@timestamp-utility.md`

## Error Handling & Recovery

### Phase Failure Recovery
- If a phase fails, analyze the error and retry
- Implement alternative approaches if primary method fails
- Continue with subsequent phases when possible
- Document failures and recovery actions with timestamps: `[RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]` - Reference `@timestamp-utility.md`
- Maintain system stability throughout execution
- Update phase status with timestamp: `Phase [X] Failed: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]` - Reference `@timestamp-utility.md`

### Validation & Quality Assurance
- Validate each file creation/modification
- Ensure code compiles and runs correctly
- Verify integration points work properly
- Check for security vulnerabilities
- Confirm performance requirements are met

## Complete Task Execution Flow

1. **Parse Task Requirements**: Extract all technical specifications
2. **Analyze Current State**: Understand existing codebase and architecture
3. **Generate Implementation Plan**: Create detailed phase-by-phase plan with start timestamp: `[RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]` - Reference `@timestamp-utility.md`
4. **Execute Foundation Setup**: Create base structures and configurations
5. **Implement Core Functionality**: Build all required components
6. **Integrate Systems**: Connect all components and services
7. **Add Testing**: Implement comprehensive test coverage
8. **Update Documentation**: Complete all documentation updates
9. **Validate Implementation**: Verify everything works correctly
10. **Prepare Deployment**: Set up deployment configurations
11. **Complete Task**: Mark task as completed with timestamp: `[RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]` - Reference `@timestamp-utility.md`

## Success Criteria
- All phases completed successfully with timestamps: `[RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]` - Reference `@timestamp-utility.md`
- All files created/modified correctly
- Implementation file updated with progress and timestamps
- All tests passing
- Documentation complete and accurate
- System ready for deployment
- Zero user intervention required
- Task completion timestamp recorded: `Completed: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]` - Reference `@timestamp-utility.md`
- All status updates use consistent timestamp format

## Usage Instructions
1. Provide task description with technical requirements
2. Specify feature name and priority level
3. Include any specific constraints or preferences
4. System will execute complete implementation automatically
5. Monitor progress through implementation file updates with timestamps: `[RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]` - Reference `@timestamp-utility.md`
6. Review final implementation and documentation
7. All progress updates include timestamps for tracking

## Example Usage
> Execute complete implementation of user authentication system with JWT tokens, including all frontend components, backend services, database schemas, API endpoints, tests, and documentation. Feature name: "User Authentication", Priority: High. Implement with zero user input required.

**Note**: Use `@timestamp-utility.md` for timestamp generation in status updates. All progress tracking, phase completions, and status updates must include timestamps using the format: `[RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]` - Reference `@timestamp-utility.md`

## Timestamp Usage Requirements

### Mandatory Timestamp Fields
All task execution must include timestamps using the format: `[RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]` - Reference `@timestamp-utility.md`

#### Required Timestamp Updates:
- **Task Start**: `Started: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]` - Reference `@timestamp-utility.md`
- **Phase Completion**: `Phase [X] Completed: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]` - Reference `@timestamp-utility.md`
- **File Creation**: `Created: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]` - Reference `@timestamp-utility.md`
- **File Modification**: `Modified: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]` - Reference `@timestamp-utility.md`
- **Status Changes**: `Status Updated: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]` - Reference `@timestamp-utility.md`
- **Task Completion**: `Completed: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]` - Reference `@timestamp-utility.md`
- **Error Events**: `Error: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]` - Reference `@timestamp-utility.md`

#### Implementation File Timestamps:
- Update "Last Updated" field in index files
- Add timestamps to all progress entries
- Include timestamps in phase status updates
- Record completion timestamps for all phases

## Integration with Other Prompts

### With task-create.md
- `task-create.md` creates the implementation plan and specifications
- `task-execute.md` executes the implementation based on that plan
- Use `task-create.md` for planning, `task-execute.md` for execution

### With task-review.md
- `task-review.md` validates the implementation against requirements
- `task-execute.md` performs the actual implementation
- Use `task-review.md` to verify execution results

### With task-check-state.md
- `task-execute.md` performs the implementation
- `task-check-state.md` tracks progress and status updates
- Use `task-check-state.md` to monitor execution progress
