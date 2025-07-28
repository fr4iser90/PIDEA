# Prompt: Project-Wide Gap Analysis & Missing Components

## Goal
Generate a comprehensive analysis of what's missing, incomplete, or needs improvement across the entire project. Create actionable insights for project-wide improvements that can be parsed into database tasks for AI auto-implementation, tracking, and execution.

**Note**: This prompt focuses on project-wide analysis, not individual task validation. For task-specific validation, use `task-review.md`.

Create new [Name]-analysis.md in docs/09_roadmap/tasks/[category]/[name]/ with the following structure:
**Note**: The system automatically creates a hierarchical folder structure: Category → Task Name → Analysis files

## Template Structure

### 1. Analysis Overview
- **Analysis Name**: [Exact name for task.title]
- **Analysis Type**: [Gap Analysis/Code Review/Architecture Review/Performance Audit/Security Audit/Feature Completeness]
- **Priority**: [High/Medium/Low - maps to task.priority]
- **Estimated Analysis Time**: [X hours/days - maps to task.metadata.estimated_hours]
- **Scope**: [What areas are being analyzed - maps to task.metadata.scope]
- **Related Components**: [List components being analyzed]
- **Analysis Date**: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"] - Reference `@timestamp-utility.md`

### 2. Current State Assessment
- **Codebase Health**: [Overall assessment - maps to task.metadata.codebase_health]
- **Architecture Status**: [Current architectural state - maps to task.metadata.architecture_status]
- **Test Coverage**: [Current test coverage percentage - maps to task.metadata.test_coverage]
- **Documentation Status**: [Documentation completeness - maps to task.metadata.documentation_status]
- **Performance Metrics**: [Current performance indicators - maps to task.metadata.performance_metrics]
- **Security Posture**: [Current security assessment - maps to task.metadata.security_posture]

### 3. Gap Analysis Results

#### Critical Gaps (High Priority):
- [ ] **Missing Component**: [Component name] - [Impact description]
  - **Location**: `path/to/missing/file.js`
  - **Required Functionality**: [What it should do]
  - **Dependencies**: [What it depends on]
  - **Estimated Effort**: [X hours]

- [ ] **Incomplete Implementation**: [Component name] - [What's missing]
  - **Current State**: [What exists]
  - **Missing Parts**: [What needs to be added]
  - **Files Affected**: `path/to/file.js`, `path/to/file.jsx`
  - **Estimated Effort**: [X hours]

#### Medium Priority Gaps:
- [ ] **Improvement Needed**: [Component name] - [Improvement description]
  - **Current Issues**: [What's wrong]
  - **Proposed Solution**: [How to fix]
  - **Files to Modify**: `path/to/file.js`
  - **Estimated Effort**: [X hours]

#### Low Priority Gaps:
- [ ] **Optimization Opportunity**: [Component name] - [Optimization description]
  - **Current Performance**: [Current state]
  - **Optimization Target**: [Desired state]
  - **Files to Optimize**: `path/to/file.js`
  - **Estimated Effort**: [X hours]

### 4. File Impact Analysis

#### Files Missing:
- [ ] `path/to/missing/file.js` - [Purpose and required content]
- [ ] `path/to/missing/file.jsx` - [Purpose and required content]
- [ ] `path/to/missing/file.md` - [Purpose and required content]

#### Files Incomplete:
- [ ] `path/to/incomplete/file.js` - [What's missing and needs to be added]
- [ ] `path/to/incomplete/file.jsx` - [What's missing and needs to be added]
- [ ] `path/to/incomplete/file.md` - [What's missing and needs to be added]

#### Files Needing Refactoring:
- [ ] `path/to/refactor/file.js` - [Current issues and refactoring needs]
- [ ] `path/to/refactor/file.jsx` - [Current issues and refactoring needs]

#### Files to Delete:
- [ ] `path/to/obsolete/file.js` - [Reason for deletion and replacement]

### 5. Technical Debt Assessment

#### Code Quality Issues:
- [ ] **Complexity**: [Files with high cyclomatic complexity]
- [ ] **Duplication**: [Duplicate code patterns found]
- [ ] **Dead Code**: [Unused functions and variables]
- [ ] **Inconsistent Patterns**: [Inconsistent coding patterns]

#### Architecture Issues:
- [ ] **Tight Coupling**: [Components that are too tightly coupled]
- [ ] **Missing Abstractions**: [Where abstractions are needed]
- [ ] **Violation of Principles**: [SOLID, DRY, etc. violations]

#### Performance Issues:
- [ ] **Slow Queries**: [Database queries that need optimization]
- [ ] **Memory Leaks**: [Potential memory leak locations]
- [ ] **Inefficient Algorithms**: [Algorithms that can be optimized]

### 6. Missing Features Analysis

#### Core Features Missing:
- [ ] **Feature Name**: [Description of missing feature]
  - **Business Impact**: [Why it's needed]
  - **Technical Requirements**: [What needs to be built]
  - **Estimated Effort**: [X hours]
  - **Dependencies**: [What needs to be done first]

#### Enhancement Features Missing:
- [ ] **Enhancement Name**: [Description of missing enhancement]
  - **User Value**: [Value to end users]
  - **Implementation Details**: [How to implement]
  - **Estimated Effort**: [X hours]

### 7. Testing Gaps

#### Missing Unit Tests:
- [ ] **Component**: [Component name] - [Test scenarios needed]
  - **Test File**: `tests/unit/[ComponentName].test.js`
  - **Test Cases**: [Specific scenarios to test]
  - **Coverage Target**: [X% coverage needed]

#### Missing Integration Tests:
- [ ] **Integration**: [Integration point] - [Test scenarios needed]
  - **Test File**: `tests/integration/[IntegrationName].test.js`
  - **Test Scenarios**: [API endpoints, database interactions]

#### Missing E2E Tests:
- [ ] **User Flow**: [User journey] - [Test scenarios needed]
  - **Test File**: `tests/e2e/[FlowName].test.js`
  - **User Journeys**: [Complete user flows to test]

### 8. Documentation Gaps

#### Missing Code Documentation:
- [ ] **Component**: [Component name] - [Documentation needed]
  - **JSDoc Comments**: [Functions/classes needing documentation]
  - **README Updates**: [Sections needing updates]
  - **API Documentation**: [Endpoints needing documentation]

#### Missing User Documentation:
- [ ] **Feature**: [Feature name] - [Documentation needed]
  - **User Guide**: [User guide sections needed]
  - **Troubleshooting**: [Common issues documentation]
  - **Migration Guide**: [If applicable]

### 9. Security Analysis

#### Security Vulnerabilities:
- [ ] **Vulnerability Type**: [Description of security issue]
  - **Location**: `path/to/vulnerable/file.js`
  - **Risk Level**: [High/Medium/Low]
  - **Mitigation**: [How to fix]
  - **Estimated Effort**: [X hours]

#### Missing Security Features:
- [ ] **Security Feature**: [Description of missing security feature]
  - **Implementation**: [How to implement]
  - **Files to Modify**: `path/to/file.js`
  - **Estimated Effort**: [X hours]

### 10. Performance Analysis

#### Performance Bottlenecks:
- [ ] **Bottleneck**: [Description of performance issue]
  - **Location**: `path/to/slow/file.js`
  - **Current Performance**: [Current metrics]
  - **Target Performance**: [Desired metrics]
  - **Optimization Strategy**: [How to optimize]
  - **Estimated Effort**: [X hours]

#### Missing Performance Features:
- [ ] **Performance Feature**: [Description of missing performance feature]
  - **Implementation**: [How to implement]
  - **Files to Modify**: `path/to/file.js`
  - **Estimated Effort**: [X hours]

### 11. Recommended Action Plan

#### Immediate Actions (Next Sprint):
- [ ] **Action**: [Description of immediate action needed]
  - **Priority**: [High/Medium/Low]
  - **Effort**: [X hours]
  - **Dependencies**: [What needs to be done first]

#### Short-term Actions (Next 2-3 Sprints):
- [ ] **Action**: [Description of short-term action needed]
  - **Priority**: [High/Medium/Low]
  - **Effort**: [X hours]
  - **Dependencies**: [What needs to be done first]

#### Long-term Actions (Next Quarter):
- [ ] **Action**: [Description of long-term action needed]
  - **Priority**: [High/Medium/Low]
  - **Effort**: [X hours]
  - **Dependencies**: [What needs to be done first]

### 12. Success Criteria for Analysis
- [ ] All gaps identified and documented
- [ ] Priority levels assigned to each gap
- [ ] Effort estimates provided for each gap
- [ ] Action plan created with clear next steps
- [ ] Stakeholders informed of findings
- [ ] Database tasks created for high-priority gaps

### 13. Risk Assessment

#### High Risk Gaps:
- [ ] **Risk**: [Description of high-risk gap] - Mitigation: [Specific mitigation strategy]

#### Medium Risk Gaps:
- [ ] **Risk**: [Description of medium-risk gap] - Mitigation: [Specific mitigation strategy]

#### Low Risk Gaps:
- [ ] **Risk**: [Description of low-risk gap] - Mitigation: [Specific mitigation strategy]

### 14. AI Auto-Implementation Instructions

#### Task Database Fields:
- **source_type**: 'markdown_doc'
- **source_path**: 'docs/09_roadmap/tasks/[category]/[name]/[name]-analysis.md'
- **category**: '[category]' - Automatically set from Category field above
- **automation_level**: 'semi_auto' | 'full_auto' | 'manual'
- **confirmation_required**: true | false
- **max_attempts**: 3 (default)
- **git_branch_required**: true | false
- **new_chat_required**: true | false

#### AI Execution Context:
```json
{
  "requires_new_chat": true,
  "git_branch_name": "analysis/[analysis-name]",
  "confirmation_keywords": ["fertig", "done", "complete", "analysis_complete"],
  "fallback_detection": true,
  "max_confirmation_attempts": 3,
  "timeout_seconds": 600
}
```

#### Success Indicators:
- [ ] All gaps identified and documented
- [ ] Priority levels assigned
- [ ] Effort estimates provided
- [ ] Action plan created
- [ ] Database tasks generated for high-priority items

### 15. References & Resources
- **Codebase Analysis Tools**: [Tools used for analysis]
- **Best Practices**: [Industry standards for gap analysis]
- **Similar Projects**: [Examples of similar analyses]
- **Technical Documentation**: [Relevant technical docs]
- **Performance Benchmarks**: [Performance standards to compare against]

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
  '[Analysis Name]', -- From section 1
  '[Full markdown content]', -- Complete description
  'analysis', -- Task type
  '[Derived from scope]', -- 'frontend'|'backend'|'database'|'security'|'performance'
  '[Priority]', -- From section 1
  'pending', -- Initial status
  'markdown_doc', -- Source type
  'docs/09_roadmap/tasks/[category]/[name]/[name]-analysis.md', -- Source path with category
  '[Full markdown content]', -- For reference
  '[JSON with all metadata]', -- All analysis details
  '[Estimated Time in hours]' -- From section 1
);
```

## Usage Instructions

1. **Analyze thoroughly** - Examine all aspects of the codebase
2. **Be specific with gaps** - Provide exact file paths and descriptions
3. **Include effort estimates** - Critical for prioritization
4. **Prioritize gaps** - Help stakeholders understand what to tackle first
5. **Provide actionable insights** - Each gap should have clear next steps
6. **Include success criteria** - Enable progress tracking
7. **Consider all dimensions** - Code quality, architecture, security, performance

## Example Usage

> Analyze the current project state and identify all gaps, missing components, and areas for improvement. Create a comprehensive analysis following the template structure above. Focus on critical gaps that need immediate attention and provide specific file paths, effort estimates, and action plans for each identified issue.

---

**Note**: This template is optimized for database-first analysis architecture where markdown docs serve as comprehensive gap analysis specifications that get parsed into trackable, actionable database tasks with full AI auto-implementation support. 