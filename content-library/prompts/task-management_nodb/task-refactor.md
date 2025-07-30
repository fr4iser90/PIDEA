# Prompt: Create Refactoring Task Plan

## Goal
Generate a comprehensive, actionable refactoring plan that improves code structure, readability, and maintainability while preserving existing functionality.

## Template Structure

### 1. Refactoring Overview
- **Target**: [file/directory/component to refactor]
- **Current State**: [describe current structure and issues]
- **Refactoring Type**: [Code Quality / Architecture / Performance / Security / Other]
- **Priority**: [High/Medium/Low based on impact and complexity]
- **Estimated Effort**: [X hours/days]
- **Risk Level**: [Low/Medium/High]
- **Refactoring Date**: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"] - Reference `@timestamp-utility.md`

### 2. Current Analysis
- **Main Responsibilities**: [List what this target currently does]
- **Issues Identified**: [Code smells, architectural problems, performance issues, etc.]
- **Complexity Assessment**: [Current complexity level and specific problems]
- **Maintainability Issues**: [What makes it hard to maintain]

### 3. Refactoring Strategy
#### Identify Refactoring Patterns:
- [ ] Extract functions/methods
- [ ] Split large files/components
- [ ] Improve naming conventions
- [ ] Reduce complexity
- [ ] Improve error handling
- [ ] Optimize performance
- [ ] Enhance security
- [ ] Improve testability
- [ ] Update dependencies
- [ ] Other: [specify]

#### Specific Actions:
- [ ] `[Action1]` - [Description and rationale]
- [ ] `[Action2]` - [Description and rationale]
- [ ] `[Action3]` - [Description and rationale]

### 4. Impact Analysis
#### Files to Modify:
- [ ] `[file-path]` - [Reason for modification]
- [ ] `[file-path]` - [Reason for modification]

#### Files to Create:
- [ ] `[file-path]` - [Purpose and content]
- [ ] `[file-path]` - [Purpose and content]

#### Files to Delete:
- [ ] `[file-path]` - [Reason for deletion]

### 5. Implementation Phases

#### Phase 1: Analysis & Planning
- [ ] Analyze current structure and identify issues
- [ ] Define refactoring goals and success criteria
- [ ] Plan new structure and organization
- [ ] Create backup of original files

#### Phase 2: Core Refactoring
- [ ] [Specific refactoring action 1]
- [ ] [Specific refactoring action 2]
- [ ] [Specific refactoring action 3]

#### Phase 3: Integration & Updates
- [ ] Update imports and dependencies
- [ ] Fix broken references
- [ ] Update configuration if needed
- [ ] Clean up unused code

#### Phase 4: Testing & Validation
- [ ] Run existing tests
- [ ] Verify functionality preservation
- [ ] Performance testing if applicable
- [ ] Security validation if applicable

### 6. Quality Standards
- **Code Quality**: [Define specific quality goals]
- **Performance**: [Performance requirements if applicable]
- **Security**: [Security requirements if applicable]
- **Maintainability**: [Maintainability goals]
- **Testability**: [Testability improvements]

### 7. Refactoring Rules
#### DO:
- [ ] Preserve existing functionality
- [ ] Maintain backward compatibility where possible
- [ ] Follow project coding standards
- [ ] Add appropriate documentation
- [ ] Keep changes focused and incremental

#### DON'T:
- [ ] Change business logic unless specifically required
- [ ] Break existing interfaces without proper migration
- [ ] Introduce new bugs
- [ ] Remove functionality without approval
- [ ] Make changes that can't be easily reverted

### 8. Testing Strategy
#### Before Refactoring:
- [ ] Document current behavior
- [ ] Run existing test suite
- [ ] Establish performance baseline
- [ ] Create behavior baseline

#### After Refactoring:
- [ ] Run same tests and verify results
- [ ] Performance comparison
- [ ] Security validation
- [ ] Integration testing

### 9. Success Criteria
- [ ] [Specific success criterion 1]
- [ ] [Specific success criterion 2]
- [ ] [Specific success criterion 3]
- [ ] All existing tests pass
- [ ] No regression in functionality
- [ ] Improved code quality metrics

### 10. Rollback Plan
- [ ] Keep original file backups
- [ ] Document all changes made
- [ ] Have rollback procedure ready
- [ ] Test rollback process

### 11. Configuration
- **Quality Thresholds**: [Define from configuration, not hardcoded]
- **File Size Limits**: [From project configuration]
- **Complexity Limits**: [From project configuration]
- **Performance Targets**: [From project configuration]

---

## Usage Instructions

1. **Analyze the target** - Identify what needs refactoring and why
2. **Define goals** - What should the refactoring achieve?
3. **Plan approach** - Choose appropriate refactoring patterns
4. **Execute incrementally** - Make changes in small, testable steps
5. **Validate results** - Ensure goals are met without regressions
6. **Document changes** - Keep track of what was changed and why

## Example Usage

> Create a refactoring plan for the authentication system to improve security and reduce complexity while maintaining all existing functionality.

> Create a refactoring plan for the data processing pipeline to improve performance and error handling.

> Create a refactoring plan for the UI components to improve maintainability and reduce code duplication.
