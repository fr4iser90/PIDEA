# Prompt: Create Comprehensive Development Task Plan (Database-First)

## Goal
Generate a complete, actionable development plan that will be parsed into a database task with all necessary details for AI auto-implementation, tracking, and execution.

Create new [Name]-implementation.md in docs/09_roadmap/features with the following structure:

## Template Structure

### 1. Project Overview
- **Feature/Component Name**: Codebase Analysis & Mermaid Diagram Generation System
- **Priority**: High
- **Estimated Time**: 35 hours
- **Dependencies**: Existing analysis services (ArchitectureService, TaskAnalysisService, CodeQualityService), Mermaid.js library
- **Related Issues**: Enhance project visualization capabilities, improve architecture understanding

### 2. Technical Requirements
- **Tech Stack**: Node.js, Mermaid.js, D3.js, Graphviz, AST parsing libraries (babel-parser, acorn), File system APIs
- **Architecture Pattern**: Extension of existing DDD architecture with new diagram generation domain
- **Database Changes**: Add diagram metadata table, extend analysis results with diagram references
- **API Changes**: New diagram generation endpoints, diagram management endpoints
- **Frontend Changes**: Diagram viewer component, diagram gallery, interactive diagram controls
- **Backend Changes**: CodebaseAnalyzer, MermaidGenerator, DiagramService, ASTParser, DependencyMapper

### 3. File Impact Analysis
#### Files to Modify:
- [ ] `backend/domain/services/ArchitectureService.js` - Add diagram generation capabilities
- [ ] `backend/domain/services/TaskAnalysisService.js` - Integrate diagram generation
- [ ] `backend/presentation/api/AnalysisController.js` - Add diagram endpoints
- [ ] `backend/Application.js` - Register new diagram services
- [ ] `backend/infrastructure/di/ServiceRegistry.js` - Register diagram services
- [ ] `frontend/src/presentation/components/mirror/main/IDEMirrorComponent.jsx` - Add diagram viewer
- [ ] `frontend/src/infrastructure/repositories/APIChatRepository.jsx` - Add diagram API endpoints

#### Files to Create:
- [ ] `backend/domain/services/CodebaseAnalyzer.js` - Main codebase analysis orchestrator
- [ ] `backend/domain/services/MermaidGenerator.js` - Mermaid diagram generation service
- [ ] `backend/domain/services/DiagramService.js` - Diagram management and storage
- [ ] `backend/infrastructure/external/ASTParser.js` - Abstract Syntax Tree parsing
- [ ] `backend/infrastructure/external/DependencyMapper.js` - Dependency relationship mapping
- [ ] `backend/infrastructure/external/FileStructureAnalyzer.js` - File structure analysis
- [ ] `backend/domain/entities/Diagram.js` - Diagram entity
- [ ] `backend/domain/repositories/DiagramRepository.js` - Diagram data access
- [ ] `backend/infrastructure/database/InMemoryDiagramRepository.js` - In-memory diagram storage
- [ ] `backend/application/handlers/analyze/GenerateDiagramHandler.js` - Diagram generation handler
- [ ] `backend/application/commands/analyze/GenerateDiagramCommand.js` - Diagram generation command
- [ ] `backend/presentation/api/DiagramController.js` - Diagram API controller
- [ ] `frontend/src/presentation/components/diagrams/DiagramViewer.jsx` - Diagram viewer component
- [ ] `frontend/src/presentation/components/diagrams/DiagramGallery.jsx` - Diagram gallery component
- [ ] `frontend/src/presentation/components/diagrams/DiagramControls.jsx` - Diagram interaction controls
- [ ] `frontend/src/domain/entities/Diagram.jsx` - Frontend diagram entity
- [ ] `frontend/src/infrastructure/repositories/DiagramRepository.jsx` - Frontend diagram repository
- [ ] `backend/tests/unit/CodebaseAnalyzer.test.js` - Codebase analyzer unit tests
- [ ] `backend/tests/unit/MermaidGenerator.test.js` - Mermaid generator unit tests
- [ ] `backend/tests/integration/DiagramGeneration.test.js` - Diagram generation integration tests
- [ ] `docs/02_architecture/diagrams/codebase-analysis-workflow.md` - Codebase analysis workflow diagram

#### Files to Delete:
- [ ] None - extending existing architecture

### 4. Implementation Phases

#### Phase 1: Core Analysis Infrastructure (12 hours)
- [ ] Create CodebaseAnalyzer with AST parsing capabilities
- [ ] Implement FileStructureAnalyzer for directory analysis
- [ ] Create DependencyMapper for relationship mapping
- [ ] Build ASTParser with support for JavaScript, TypeScript, Python, Java
- [ ] Implement code parsing and structure extraction
- [ ] Create base diagram data models and entities

#### Phase 2: Mermaid Diagram Generation (10 hours)
- [ ] Implement MermaidGenerator service
- [ ] Create class diagram generation (UML-style)
- [ ] Implement dependency graph generation
- [ ] Add file structure tree diagrams
- [ ] Create architecture layer diagrams
- [ ] Implement sequence diagram generation for function calls
- [ ] Add flowchart generation for code flow

#### Phase 3: Diagram Management & Storage (6 hours)
- [ ] Create DiagramService for diagram lifecycle management
- [ ] Implement DiagramRepository and storage layer
- [ ] Add diagram metadata and versioning
- [ ] Create diagram export/import functionality
- [ ] Implement diagram caching and optimization
- [ ] Add diagram search and filtering

#### Phase 4: API Integration & Frontend (5 hours)
- [ ] Create DiagramController with REST endpoints
- [ ] Implement diagram generation API
- [ ] Create frontend DiagramViewer component
- [ ] Add DiagramGallery for multiple diagram display
- [ ] Implement DiagramControls for interaction
- [ ] Integrate with existing analysis workflow

#### Phase 5: Testing & Documentation (2 hours)
- [ ] Write comprehensive unit tests for all services
- [ ] Create integration tests for diagram generation
- [ ] Add E2E tests for diagram workflow
- [ ] Update documentation with diagram capabilities
- [ ] Create user guide for diagram features

### 5. Code Standards & Patterns
- **Coding Style**: ESLint with existing project rules, Prettier formatting
- **Naming Conventions**: camelCase for variables/functions, PascalCase for classes, kebab-case for files
- **Error Handling**: Try-catch with specific error types, proper error logging
- **Logging**: Winston logger with structured logging, different levels for operations
- **Testing**: Jest framework, 90% coverage requirement
- **Documentation**: JSDoc for all public methods, README updates

### 6. Security Considerations
- [ ] AST parsing security (prevent malicious code execution)
- [ ] File system access validation and sanitization
- [ ] Diagram content validation and sanitization
- [ ] Rate limiting for diagram generation
- [ ] Access control for diagram viewing and editing
- [ ] Audit logging for diagram operations

### 7. Performance Requirements
- **Response Time**: < 3s for diagram generation, < 1s for diagram loading
- **Throughput**: Support up to 10 concurrent diagram generations
- **Memory Usage**: < 200MB for large codebase analysis
- **Database Queries**: Optimized for diagram metadata storage
- **Caching Strategy**: Cache generated diagrams for 24 hours, AST parsing results for 1 hour

### 8. Testing Strategy

#### Unit Tests:
- [ ] Test file: `backend/tests/unit/CodebaseAnalyzer.test.js`
- [ ] Test cases: AST parsing, file structure analysis, dependency mapping, error handling
- [ ] Mock requirements: File system operations, external parsing libraries

#### Integration Tests:
- [ ] Test file: `backend/tests/integration/DiagramGeneration.test.js`
- [ ] Test scenarios: End-to-end diagram generation, multiple diagram types, API endpoints
- [ ] Test data: Sample codebases, various programming languages, different project structures

#### E2E Tests:
- [ ] Test file: `backend/tests/e2e/DiagramWorkflow.test.js`
- [ ] User flows: Complete diagram generation workflow, diagram viewing, diagram export
- [ ] Browser compatibility: Chrome, Firefox, Safari compatibility

### 9. Documentation Requirements

#### Code Documentation:
- [ ] JSDoc comments for all diagram generation methods
- [ ] README updates with diagram generation setup
- [ ] API documentation for diagram endpoints
- [ ] Architecture diagrams for diagram generation system

#### User Documentation:
- [ ] Diagram generation user guide
- [ ] Supported diagram types documentation
- [ ] Troubleshooting guide for diagram issues
- [ ] Best practices for codebase analysis

### 10. Deployment Checklist

#### Pre-deployment:
- [ ] All diagram generation tests passing (unit, integration, e2e)
- [ ] Code review completed and approved
- [ ] Diagram documentation updated and reviewed
- [ ] Security scan passed for AST parsing
- [ ] Performance benchmarks met for diagram generation

#### Deployment:
- [ ] Mermaid.js library dependencies installed
- [ ] Environment variables for diagram storage configured
- [ ] Diagram cache configuration applied
- [ ] Service restarts if needed
- [ ] Health checks configured for diagram services

#### Post-deployment:
- [ ] Monitor diagram generation performance
- [ ] Verify diagram functionality in production
- [ ] Performance monitoring active for diagram operations
- [ ] User feedback collection enabled for diagram features

### 11. Rollback Plan
- [ ] Diagram service rollback procedure documented
- [ ] Configuration rollback for diagram settings
- [ ] Database rollback for diagram metadata
- [ ] Communication plan for diagram users

### 12. Success Criteria
- [ ] Codebase analysis generates accurate AST representations
- [ ] Mermaid diagrams are generated for all supported diagram types
- [ ] Diagram generation API responds within performance requirements
- [ ] All tests pass (unit, integration, e2e)
- [ ] Performance requirements met for diagram generation
- [ ] Security requirements satisfied for AST parsing
- [ ] Documentation complete and accurate
- [ ] User acceptance testing passed

### 13. Risk Assessment

#### High Risk:
- [ ] AST parsing performance issues with large codebases - Mitigation: Implement incremental parsing and caching
- [ ] Mermaid.js library compatibility issues - Mitigation: Version pinning and fallback mechanisms

#### Medium Risk:
- [ ] Memory usage spikes during large codebase analysis - Mitigation: Implement streaming analysis and memory limits
- [ ] Diagram generation accuracy issues - Mitigation: Comprehensive testing with various codebases

#### Low Risk:
- [ ] Browser compatibility issues with diagram rendering - Mitigation: Cross-browser testing and polyfills
- [ ] File format support limitations - Mitigation: Extensible parser architecture

### 14. AI Auto-Implementation Instructions

#### Task Database Fields:
- **source_type**: 'markdown_doc'
- **source_path**: 'docs/09_roadmap/features/codebase-analysis-mermaid-implementation.md'
- **automation_level**: 'semi_auto'
- **confirmation_required**: true
- **max_attempts**: 3
- **git_branch_required**: true
- **new_chat_required**: true

#### AI Execution Context:
```json
{
  "requires_new_chat": true,
  "git_branch_name": "feature/codebase-analysis-mermaid",
  "confirmation_keywords": ["fertig", "done", "complete"],
  "fallback_detection": true,
  "max_confirmation_attempts": 3,
  "timeout_seconds": 600
}
```

#### Success Indicators:
- [ ] All checkboxes in phases completed
- [ ] Codebase analysis working with AST parsing
- [ ] Mermaid diagrams generated successfully
- [ ] No build errors
- [ ] Code follows standards
- [ ] Documentation updated

### 15. References & Resources
- **Technical Documentation**: [Mermaid.js Documentation](https://mermaid-js.github.io/mermaid/), [AST Explorer](https://astexplorer.net/)
- **API References**: [Babel Parser API](https://babeljs.io/docs/en/babel-parser), [Acorn Parser](https://github.com/acornjs/acorn)
- **Design Patterns**: Extension of existing DDD architecture, Command pattern for diagram generation
- **Best Practices**: AST parsing best practices, diagram generation optimization
- **Similar Implementations**: Existing analysis services in codebase, architecture analysis patterns

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
  'Codebase Analysis & Mermaid Diagram Generation System', -- From section 1
  '[Full markdown content]', -- Complete description
  'feature', -- Derived from Technical Requirements
  'backend', -- Derived from context
  'high', -- From section 1
  'pending', -- Initial status
  'markdown_doc', -- Source type
  'docs/09_roadmap/features/codebase-analysis-mermaid-implementation.md', -- Source path
  '[Full markdown content]', -- For reference
  '[JSON with all metadata]', -- All technical details
  35 -- From section 1
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

> Create a comprehensive development plan for implementing a codebase analysis system that generates Mermaid diagrams. Include all database fields, AI execution context, file impacts, and success criteria. Follow the template structure above and ensure every section is completed with specific details for database-first task architecture.

---

**Note**: This template is optimized for database-first task architecture where markdown docs serve as specifications that get parsed into trackable, executable database tasks with full AI auto-implementation support. 