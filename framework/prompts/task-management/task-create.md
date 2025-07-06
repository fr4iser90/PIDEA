# Prompt: Create Comprehensive Development Task Plan

## Goal
Generate a complete, actionable development plan with all necessary details for consistent and accurate implementation.
Create new [Name]-implementaion.md in docs/roadmap/features .

## Template Structure

### 1. Project Overview
- **Feature/Component Name**: [Name]
- **Priority**: [High/Medium/Low]
- **Estimated Time**: [X hours/days]
- **Dependencies**: [List any prerequisites]
- **Related Issues**: [Link to existing issues/tickets]

### 2. Technical Requirements
- **Tech Stack**: [List all technologies involved]
- **Architecture Pattern**: [MVC, DDD, etc.]
- **Database Changes**: [Schema updates, migrations]
- **API Changes**: [New endpoints, modifications]
- **Frontend Changes**: [Components, pages, state management]
- **Backend Changes**: [Services, controllers, handlers]

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

#### Phase 1: Foundation Setup
- [ ] Create base structure
- [ ] Set up dependencies
- [ ] Configure environment
- [ ] Create initial tests

#### Phase 2: Core Implementation
- [ ] Implement main functionality
- [ ] Add error handling
- [ ] Implement validation
- [ ] Add logging

#### Phase 3: Integration
- [ ] Connect with existing systems
- [ ] Update API endpoints
- [ ] Integrate with frontend
- [ ] Test integration points

#### Phase 4: Testing & Documentation
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Update documentation
- [ ] Create user guides

#### Phase 5: Deployment & Validation
- [ ] Deploy to staging
- [ ] Perform testing
- [ ] Fix issues
- [ ] Deploy to production

### 5. Code Standards & Patterns
- **Coding Style**: [ESLint rules, Prettier config]
- **Naming Conventions**: [Variables, functions, files]
- **Error Handling**: [Try-catch patterns, error types]
- **Logging**: [Log levels, format, locations]
- **Testing**: [Framework, coverage requirements]
- **Documentation**: [JSDoc, README, inline comments]

### 6. Security Considerations
- [ ] Input validation
- [ ] Authentication checks
- [ ] Authorization rules
- [ ] Data sanitization
- [ ] SQL injection prevention
- [ ] XSS protection
- [ ] CSRF protection

### 7. Performance Requirements
- **Response Time**: [Target milliseconds]
- **Throughput**: [Requests per second]
- **Memory Usage**: [MB limit]
- **Database Queries**: [Optimization requirements]
- **Caching Strategy**: [What to cache, how long]

### 8. Testing Strategy
#### Unit Tests:
- [ ] Test file: `path/to/test.js`
- [ ] Test cases: [List specific scenarios]
- [ ] Mock requirements: [External dependencies]

#### Integration Tests:
- [ ] Test file: `path/to/integration-test.js`
- [ ] Test scenarios: [API endpoints, database]
- [ ] Test data: [Fixtures, seed data]

#### E2E Tests:
- [ ] Test file: `path/to/e2e-test.js`
- [ ] User flows: [Complete user journeys]
- [ ] Browser compatibility: [Chrome, Firefox, Safari]

### 9. Documentation Requirements
#### Code Documentation:
- [ ] JSDoc comments for all functions
- [ ] README updates
- [ ] API documentation
- [ ] Architecture diagrams

#### User Documentation:
- [ ] User guide updates
- [ ] Feature documentation
- [ ] Troubleshooting guide
- [ ] Migration guide (if applicable)

### 10. Deployment Checklist
#### Pre-deployment:
- [ ] All tests passing
- [ ] Code review completed
- [ ] Documentation updated
- [ ] Security scan passed
- [ ] Performance benchmarks met

#### Deployment:
- [ ] Database migrations
- [ ] Environment variables
- [ ] Configuration updates
- [ ] Service restarts
- [ ] Health checks

#### Post-deployment:
- [ ] Monitor logs
- [ ] Verify functionality
- [ ] Performance monitoring
- [ ] User feedback collection

### 11. Rollback Plan
- [ ] Database rollback script
- [ ] Configuration rollback
- [ ] Service rollback procedure
- [ ] Communication plan

### 12. Success Criteria
- [ ] Feature works as specified
- [ ] All tests pass
- [ ] Performance requirements met
- [ ] Security requirements satisfied
- [ ] Documentation complete
- [ ] User acceptance testing passed

### 13. Risk Assessment
#### High Risk:
- [ ] [Risk description] - [Mitigation strategy]

#### Medium Risk:
- [ ] [Risk description] - [Mitigation strategy]

#### Low Risk:
- [ ] [Risk description] - [Mitigation strategy]

### 14. References & Resources
- **Technical Documentation**: [Links to relevant docs]
- **API References**: [External API docs]
- **Design Patterns**: [Patterns to follow]
- **Best Practices**: [Industry standards]
- **Similar Implementations**: [Existing code examples]

---

## Usage Instructions

1. **Fill in all sections** - Don't leave any section empty
2. **Be specific** - Use exact file paths and detailed descriptions
3. **Check dependencies** - Ensure all prerequisites are listed
4. **Estimate realistically** - Consider complexity and unknowns
5. **Include all stakeholders** - Frontend, backend, DevOps, QA
6. **Plan for failure** - Include rollback and error handling
7. **Document decisions** - Explain why certain choices were made

## Example Usage

> Create a comprehensive development plan for implementing user authentication with JWT tokens, including all necessary files, phases, and checkboxes. Follow the template structure above and ensure all sections are completed with specific details for this project's tech stack and architecture.
