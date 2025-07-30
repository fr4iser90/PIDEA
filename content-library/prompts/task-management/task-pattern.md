# Task Management Patterns & Standards

## Goal
Centralized reference for all task management patterns, file structures, database fields, and AI execution contexts. This file serves as the single source of truth for all task management standards.

## Core File Patterns

### File Path Structure
```
docs/09_roadmap/tasks/[category]/[name]/
├── [name]-index.md
├── [name]-implementation.md
├── [name]-phase-[number].md
├── [name]-analysis.md
└── [name]-review.md
```

### File Pattern Requirements
> **File Pattern Requirement:**  
> All Index, Implementation and Phase files must always be created using this pattern:
> - **Index**: `docs/09_roadmap/tasks/[category]/[name]/[name]-index.md`  
> - **Implementation**: `docs/09_roadmap/tasks/[category]/[name]/[name]-implementation.md`  
> - **Phase**: `docs/09_roadmap/tasks/[category]/[name]/[name]-phase-[number].md`  
> - **Analysis**: `docs/09_roadmap/tasks/[category]/[name]/[name]-analysis.md`
> - **Review**: `docs/09_roadmap/tasks/[category]/[name]/[name]-review.md`
> 
> If ANY file is missing, it MUST be created automatically. This pattern is required for orchestration and grouping in the system.

## Database Field Patterns

### Task Database Fields
```sql
-- Core Task Fields
id TEXT PRIMARY KEY,
project_id TEXT NOT NULL,
title TEXT NOT NULL,
description TEXT,
type TEXT NOT NULL, -- 'feature', 'bug', 'refactor', 'test', 'documentation', 'analysis'
category TEXT, -- 'ai', 'automation', 'backend', 'frontend', 'ide', 'migration', 'performance', 'security', 'testing', 'documentation'
priority TEXT NOT NULL, -- 'low', 'medium', 'high', 'critical'
status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'failed', 'cancelled'

-- Source Information
source_type TEXT DEFAULT 'markdown_doc',
source_path TEXT, -- 'docs/09_roadmap/tasks/[category]/[name]/[name]-implementation.md'
source_content TEXT, -- Full markdown content for reference

-- AI Automation Fields
automation_level TEXT, -- 'semi_auto' | 'full_auto' | 'manual'
confirmation_required BOOLEAN DEFAULT true,
max_attempts INTEGER DEFAULT 3,
git_branch_required BOOLEAN DEFAULT true,
new_chat_required BOOLEAN DEFAULT true,

-- Time Tracking
estimated_hours INTEGER,
actual_hours REAL,
created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
completed_at TEXT,
started_at TEXT,

-- Progress Tracking
progress INTEGER DEFAULT 0,
phase_progress TEXT, -- JSON object
blocked_by TEXT, -- JSON array

-- Metadata
metadata TEXT, -- JSON for extended data
dependencies TEXT, -- JSON array
tags TEXT, -- JSON array
```

### AI Execution Context Pattern
```json
{
  "requires_new_chat": true,
  "git_branch_name": "[type]/[feature-name]",
  "confirmation_keywords": ["fertig", "done", "complete", "analysis_complete"],
  "fallback_detection": true,
  "max_confirmation_attempts": 3,
  "timeout_seconds": 300
}
```

### Git Branch Naming Patterns
- **Feature**: `feature/[feature-name]`
- **Analysis**: `analysis/[analysis-name]`
- **Fix**: `fix/[fix-name]`
- **Refactor**: `refactor/[refactor-name]`
- **Test**: `test/[test-name]`
- **Documentation**: `docs/[docs-name]`

## Timestamp Patterns

### Timestamp Generation
Reference `@timestamp-utility.md` for timestamp generation commands and usage patterns.

**Quick Command**: `date -u +"%Y-%m-%dT%H:%M:%S.000Z"`

### Timestamp Usage Patterns
```markdown
## Current Status - Last Updated: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"] - Reference `@timestamp-utility.md`
## Language Status - Last Updated: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"] - Reference `@timestamp-utility.md`
## Progress Tracking - Last Updated: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"] - Reference `@timestamp-utility.md`

- **Created**: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"] - Reference `@timestamp-utility.md`
- **Last Updated**: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"] - Reference `@timestamp-utility.md`
- **Started**: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"] - Reference `@timestamp-utility.md`
- **Completed**: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"] - Reference `@timestamp-utility.md`
```

## Category Patterns

### Available Categories
- **ai** - AI-related features and machine learning
- **automation** - Automation and workflow features
- **backend** - Backend development and services
- **frontend** - Frontend development and UI
- **ide** - IDE integration and development tools
- **migration** - System migrations and data transfers
- **performance** - Performance optimization and monitoring
- **security** - Security features and improvements
- **testing** - Testing infrastructure and test automation
- **documentation** - Documentation and guides

### Category-Specific Patterns
```javascript
// Category to base path mapping
const categoryPaths = {
  'backend': 'backend/tests',
  'frontend': 'frontend/tests',
  'database': 'backend/tests',
  'api': 'backend/tests',
  'security': 'backend/tests',
  'performance': 'backend/tests',
  'testing': 'backend/tests',
  'documentation': 'backend/tests',
  'migration': 'backend/tests',
  'automation': 'backend/tests',
  'ai': 'backend/tests',
  'ide': 'backend/tests'
};

// Component type to test directory mapping
const componentTypeMapping = {
  // Backend components
  'service': 'unit',
  'controller': 'unit',
  'repository': 'unit',
  'entity': 'unit',
  'middleware': 'unit',
  'handler': 'unit',
  'command': 'unit',
  'api': 'integration',
  'database': 'integration',
  'workflow': 'integration',
  
  // Frontend components
  'component': 'unit',
  'hook': 'unit',
  'store': 'unit',
  'service': 'unit',
  'page': 'integration',
  'flow': 'e2e'
};
```

## Test Path Resolution Pattern

### Intelligent Test Path Detection
```javascript
const resolveTestPath = (category, componentName, componentType = 'service') => {
  const basePath = categoryPaths[category] || 'tests';
  const testType = componentTypeMapping[componentType] || 'unit';
  const extension = category === 'frontend' ? '.test.jsx' : '.test.js';
  
  return `${basePath}/${testType}/${componentName}${extension}`;
};

// Usage examples:
// resolveTestPath('backend', 'AuthService', 'service') → 'backend/tests/unit/AuthService.test.js'
// resolveTestPath('frontend', 'LoginForm', 'component') → 'frontend/tests/unit/LoginForm.test.jsx'
// resolveTestPath('backend', 'AuthController', 'api') → 'backend/tests/integration/AuthController.test.js'
// resolveTestPath('frontend', 'UserAuthentication', 'flow') → 'frontend/tests/e2e/UserAuthentication.test.jsx'
```

## Status Patterns

### Status Categories
- **✅ Completed** - File exists and is fully implemented
- **🔄 In Progress** - File exists but implementation is partial
- **❌ Missing** - File doesn't exist
- **⚠️ Issues Found** - File exists but has problems
- **🔧 Needs Update** - File exists but needs modification
- **🌐 Language Issues** - Non-English content detected and needs translation

### Status Indicators
```markdown
### ✅ Completed Items
- [x] `path/to/file.js` - Fully implemented with description

### 🔄 In Progress
- [~] `path/to/file.js` - Basic structure exists, needs completion

### ❌ Missing Items
- [ ] `path/to/file.js` - Not found in codebase

### ⚠️ Issues Found
- [ ] `path/to/file.js` - Missing validation

### 🔧 Needs Update
- [ ] `path/to/file.js` - Needs refactoring

### 🌐 Language Standardization
- [x] All content automatically translated to English
- [x] Non-English content replaced with English equivalents
- [x] Language consistency verified across all files
```

## Progress Tracking Patterns

### Progress Metrics
```markdown
### 📊 Current Metrics
- **Files Implemented**: 15/20 (75%)
- **Features Working**: 8/12 (67%)
- **Test Coverage**: 60%
- **Documentation**: 70% complete
- **Language Optimization**: 100% (English)

### 📈 Progress Tracking
- **Overall Progress**: [X]% Complete
- **Current Phase**: [Phase Number]
- **Next Milestone**: [Description]
- **Estimated Completion**: [Date]
- **Time Remaining**: [X hours]
- **Velocity**: [X hours/day]
```

## Phase Management Patterns

### Phase Breakdown Table
```markdown
## 📊 Phase Breakdown
| Phase | File | Status | Time | Progress | Started | Completed |
|-------|------|--------|------|----------|---------|-----------|
| 1 | [Phase 1](./[name]-phase-1.md) | [Status] | [X]h | [X]% | [Date] | [Date] |
| 2 | [Phase 2](./[name]-phase-2.md) | [Status] | [X]h | [X]% | [Date] | [Date] |
| 3 | [Phase 3](./[name]-phase-3.md) | [Status] | [X]h | [X]% | [Date] | [Date] |

**Status Legend**: 🟢 Planning | 🟡 In Progress | 🔴 Blocked | ✅ Completed
```

## Success Criteria Patterns

### Standard Success Indicators
```markdown
#### Success Indicators:
- [ ] All checkboxes in phases completed
- [ ] Tests pass with 90%+ coverage
- [ ] No build errors
- [ ] Code follows established standards
- [ ] Documentation updated
- [ ] Performance requirements met
- [ ] Security requirements satisfied
- [ ] User acceptance testing passed
```

## Risk Assessment Patterns

### Risk Categories
```markdown
#### High Risk:
- [ ] [Risk description] - Mitigation: [Specific mitigation strategy]

#### Medium Risk:
- [ ] [Risk description] - Mitigation: [Specific mitigation strategy]

#### Low Risk:
- [ ] [Risk description] - Mitigation: [Specific mitigation strategy]
```

## Language Standardization Patterns

### Automatic Translation Strategy
```javascript
// Language detection and automatic translation
const standardizeLanguage = async (content) => {
  // Detect primary language
  const detectedLanguage = detectLanguage(content);
  
  if (detectedLanguage !== 'english') {
    // Automatically translate to English
    const translatedContent = await translateToEnglish(content);
    
    // Replace original content with English version
    return translatedContent;
  }
  
  return content;
};

// Language detection patterns
const LANGUAGE_INDICATORS = {
  german: ['soll', 'muss', 'kann', 'wird', 'haben', 'sein', 'werden', 'durch', 'für', 'mit', 'von', 'zu'],
  french: ['doit', 'peut', 'sera', 'avoir', 'être', 'faire', 'avec', 'pour', 'dans', 'sur'],
  spanish: ['debe', 'puede', 'será', 'tener', 'hacer', 'estar', 'con', 'para', 'en', 'sobre']
};
```

### Translation Requirements
- **Target Language**: English (for optimal AI processing)
- **Strategy**: Replace original content, don't preserve parallel versions
- **Scope**: All task descriptions, comments, documentation
- **Automatic**: No manual intervention required
- **Consistency**: Ensure all content is in English

### Language Standardization Process
1. **Detect Language**: Automatically identify non-English content
2. **Translate**: Convert all content to English
3. **Replace**: Overwrite original content with English version
4. **Verify**: Ensure consistency across all files
5. **Update**: Mark language standardization as complete

## Review & Repair Patterns

### Review Process Flow
```javascript
// Review and repair process
const reviewAndRepair = async (taskPath) => {
  // Phase 1: File Structure Validation
  const missingFiles = await validateFileStructure(taskPath);
  await createMissingFiles(missingFiles);
  
  // Phase 2: Codebase Analysis
  const codebaseState = await analyzeCodebase();
  
  // Phase 3: Implementation Validation
  const issues = await validateImplementation(taskPath, codebaseState);
  
  // Phase 4: Auto-Repair
  await repairIssues(issues);
  
  // Phase 5: Final Validation
  await finalValidation(taskPath);
};
```

### Review & Repair Requirements
- **File Structure**: Validate and create missing files
- **Implementation Accuracy**: Check against actual codebase
- **Auto-Repair**: Fix issues automatically when possible
- **Validation**: Ensure everything is correct after repair
- **Documentation**: Update files with findings and fixes

### Review & Repair Process
1. **Analyze**: Identify issues and inconsistencies
2. **Repair**: Automatically fix problems found
3. **Validate**: Ensure repairs are correct
4. **Document**: Update files with changes made
5. **Verify**: Final check that everything works

## Integration Patterns

### Prompt Integration Flow
1. **task-create.md** → Creates implementation plan and specifications
2. **task-review.md** → Analyzes, repairs, and validates implementation files
3. **task-execute.md** → Executes implementation
4. **task-check-state.md** → Tracks progress and status updates
5. **task-analyze.md** → Performs project-wide gap analysis

### File Creation Order
1. Create category folder if missing
2. Create task folder if missing
3. Create index file
4. Create implementation file
5. Create phase files as needed
6. Create analysis file if required
7. **Language Standardization**: Automatically translate all content to English
8. **Review & Repair**: Validate and fix any issues found

## Usage Instructions

### Reference This File
In all task management prompts, reference this file using:
```markdown
Reference `@task-pattern.md` for all patterns and standards
```

### Pattern Updates
When updating patterns:
1. Update this file first
2. Update all task management prompts to reference this file
3. Remove duplicate pattern definitions from individual prompts
4. Test pattern consistency across all prompts

### Pattern Validation
Before using any pattern:
1. Check this file for the latest version
2. Ensure consistency with database schema
3. Verify AI execution context compatibility
4. Test file path resolution
5. Validate timestamp generation

---

**Note**: This file serves as the single source of truth for all task management patterns. All task management prompts should reference this file instead of duplicating pattern definitions.
