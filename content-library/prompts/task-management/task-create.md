# Prompt: Create Comprehensive Development Task Plan (Database-First)

## Goal
Generate a complete, actionable development plan that will be parsed into a database task with all necessary details for AI auto-implementation, tracking, and execution.

Create new [Name]-implementation.md in docs/09_roadmap/features with the following structure:

## Template Structure

### 1. Project Overview
- **Feature/Component Name**: [Exact name for task.title]
- **Priority**: [High/Medium/Low - maps to task.priority]
- **Estimated Time**: [X hours/days - maps to task.metadata.estimated_hours]
- **Dependencies**: [List prerequisites - maps to task.dependencies]
- **Related Issues**: [Link to existing issues/tickets]

### 2. Technical Requirements
- **Tech Stack**: [List all technologies - maps to task.metadata.tech_stack]
- **Architecture Pattern**: [MVC, DDD, etc. - maps to task.metadata.architecture]
- **Database Changes**: [Schema updates, migrations - maps to task.metadata.database_changes]
- **API Changes**: [New endpoints, modifications - maps to task.metadata.api_changes]
- **Frontend Changes**: [Components, pages, state management - maps to task.metadata.frontend_changes]
- **Backend Changes**: [Services, controllers, handlers - maps to task.metadata.backend_changes]

### 3. File Impact Analysis
#### Files to Modify:
- [ ] `path/to/file.js` - [Brief description of changes]
- [ ] `path/to/file.jsx` - [Brief description of changes]
- [ ] `path/to/file.md` - [Brief description of changes]

#### Files to Create:
- [ ] `path/to/new-file.js` - [Purpose and content overview]
- [ ] `path/to/new-file.jsx` - [Purpose and content overview]
- [ ] `path/to/new-file.md` - [Purpose and content overview]

#### Files to Delete:
- [ ] `path/to/obsolete-file.js` - [Reason for deletion]

### 4. Implementation Phases

#### Phase 1: Foundation Setup ([X] hours)
- [ ] Create base structure
- [ ] Set up dependencies
- [ ] Configure environment
- [ ] Create initial tests

#### Phase 2: Core Implementation ([X] hours)
- [ ] Implement main functionality
- [ ] Add error handling
- [ ] Implement validation
- [ ] Add logging

#### Phase 3: Integration ([X] hours)
- [ ] Connect with existing systems
- [ ] Update API endpoints
- [ ] Integrate with frontend
- [ ] Test integration points

#### Phase 4: Testing & Documentation ([X] hours)
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Update documentation
- [ ] Create user guides

#### Phase 5: Deployment & Validation ([X] hours)
- [ ] Deploy to staging
- [ ] Perform testing
- [ ] Fix issues
- [ ] Deploy to production

### 5. Code Standards & Patterns
- **Coding Style**: ESLint with existing project rules, Prettier formatting
- **Naming Conventions**: camelCase for variables/functions, PascalCase for classes, kebab-case for files
- **Error Handling**: Try-catch with specific error types, proper error logging
- **Logging**: Winston logger with structured logging, different levels for operations
- **Testing**: Jest framework, 90% coverage requirement
- **Documentation**: JSDoc for all public methods, README updates

### 6. Security Considerations
- [ ] Input validation and sanitization
- [ ] User authentication and authorization
- [ ] Data privacy and protection
- [ ] Rate limiting for operations
- [ ] Audit logging for all actions
- [ ] Protection against malicious inputs

### 7. Performance Requirements
- **Response Time**: [Target milliseconds]
- **Throughput**: [Requests per second]
- **Memory Usage**: [MB limit]
- **Database Queries**: [Optimization requirements]
- **Caching Strategy**: [What to cache, how long]

### 8. Testing Strategy

#### Unit Tests:
- [ ] Test file: `tests/unit/[ComponentName].test.js`
- [ ] Test cases: [List specific scenarios to test]
- [ ] Mock requirements: [External dependencies to mock]

#### Integration Tests:
- [ ] Test file: `tests/integration/[ComponentName].test.js`
- [ ] Test scenarios: [API endpoints, database interactions]
- [ ] Test data: [Fixtures, seed data requirements]

#### E2E Tests:
- [ ] Test file: `tests/e2e/[ComponentName].test.js`
- [ ] User flows: [Complete user journeys to test]
- [ ] Browser compatibility: [Chrome, Firefox compatibility]

### 9. Documentation Requirements

#### Code Documentation:
- [ ] JSDoc comments for all functions and classes
- [ ] README updates with new functionality
- [ ] API documentation for new endpoints
- [ ] Architecture diagrams for complex components

#### User Documentation:
- [ ] User guide updates for new features
- [ ] Feature documentation for developers
- [ ] Troubleshooting guide for common issues
- [ ] Migration guide (if applicable)

### 10. Deployment Checklist

#### Pre-deployment:
- [ ] All tests passing (unit, integration, e2e)
- [ ] Code review completed and approved
- [ ] Documentation updated and reviewed
- [ ] Security scan passed
- [ ] Performance benchmarks met

#### Deployment:
- [ ] Database migrations (if applicable)
- [ ] Environment variables configured
- [ ] Configuration updates applied
- [ ] Service restarts if needed
- [ ] Health checks configured

#### Post-deployment:
- [ ] Monitor logs for errors
- [ ] Verify functionality in production
- [ ] Performance monitoring active
- [ ] User feedback collection enabled

### 11. Rollback Plan
- [ ] Database rollback script prepared
- [ ] Configuration rollback procedure
- [ ] Service rollback procedure documented
- [ ] Communication plan for stakeholders

### 12. Success Criteria
- [ ] Feature works as specified in requirements
- [ ] All tests pass (unit, integration, e2e)
- [ ] Performance requirements met
- [ ] Security requirements satisfied
- [ ] Documentation complete and accurate
- [ ] User acceptance testing passed

### 13. Risk Assessment

#### High Risk:
- [ ] [Risk description] - Mitigation: [Specific mitigation strategy]

#### Medium Risk:
- [ ] [Risk description] - Mitigation: [Specific mitigation strategy]

#### Low Risk:
- [ ] [Risk description] - Mitigation: [Specific mitigation strategy]

### 14. AI Auto-Implementation Instructions

#### Task Database Fields:
- **source_type**: 'markdown_doc'
- **source_path**: 'docs/09_roadmap/features/[name]-implementation.md'
- **automation_level**: 'semi_auto' | 'full_auto' | 'manual'
- **confirmation_required**: true | false
- **max_attempts**: 3 (default)
- **git_branch_required**: true | false
- **new_chat_required**: true | false

#### AI Execution Context:
```json
{
  "requires_new_chat": true,
  "git_branch_name": "feature/[feature-name]",
  "confirmation_keywords": ["fertig", "done", "complete"],
  "fallback_detection": true,
  "max_confirmation_attempts": 3,
  "timeout_seconds": 300
}
```

#### Success Indicators:
- [ ] All checkboxes in phases completed
- [ ] Tests pass
- [ ] No build errors
- [ ] Code follows standards
- [ ] Documentation updated

### 15. References & Resources
- **Technical Documentation**: [Links to relevant technical docs]
- **API References**: [External API documentation]
- **Design Patterns**: [Patterns to follow in implementation]
- **Best Practices**: [Industry standards and project conventions]
- **Similar Implementations**: [Existing code examples in codebase]

---

## Database Task Creation Instructions

This markdown will be parsed into a database task with the following mapping:

```sql
INSERT INTO tasks (
  id, project_id, title, description, type, category, priority, status,
  source_type, source_path, source_content, metadata, estimated_hours
) VALUES (
  uuid(), -- Generated
  '[project_id]', -- From context
  '[Feature/Component Name]', -- From section 1
  '[Full markdown content]', -- Complete description
  '[Derived from Technical Requirements]', -- 'feature'|'bug'|'refactor'|etc
  '[Derived from context]', -- 'frontend'|'backend'|'database'|etc
  '[Priority]', -- From section 1
  'pending', -- Initial status
  'markdown_doc', -- Source type
  'docs/09_roadmap/features/[name]-implementation.md', -- Source path
  '[Full markdown content]', -- For reference
  '[JSON with all metadata]', -- All technical details
  '[Estimated Time in hours]' -- From section 1
);
```

## Usage Instructions

1. **Fill in all sections completely** - Every field maps to database columns
2. **Be specific with file paths** - Enables precise file tracking
3. **Include exact time estimates** - Critical for project planning
4. **Specify AI execution requirements** - Automation level, confirmation needs
5. **List all dependencies** - Enables proper task sequencing
6. **Include success criteria** - Enables automatic completion detection
7. **Provide detailed phases** - Enables progress tracking

## Example Usage

> Create a comprehensive development plan for implementing user authentication with JWT tokens. Include all database fields, AI execution context, file impacts, and success criteria. Follow the template structure above and ensure every section is completed with specific details for database-first task architecture.

---

**Note**: This template is optimized for database-first task architecture where markdown docs serve as specifications that get parsed into trackable, executable database tasks with full AI auto-implementation support.
