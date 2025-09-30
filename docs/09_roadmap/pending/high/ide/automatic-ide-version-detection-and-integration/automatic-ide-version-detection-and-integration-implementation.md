# Automatic IDE Version Detection and Integration Implementation

## 1. Project Overview
- **Feature/Component Name**: Automatic IDE Version Detection and Integration
- **Priority**: High
- **Category**: ide
- **Status**: pending
- **Estimated Time**: 8 hours (reduced due to existing infrastructure)
- **Dependencies**: Selector Versioning System (must be completed first)
- **Related Issues**: IDE Bot Enhancement, Selector Management System
- **Created**: 2025-09-30T10:36:57.000Z

## 2. Technical Requirements
- **Tech Stack**: Node.js, CDP (Chrome DevTools Protocol), Playwright
- **Architecture Pattern**: Service-Oriented Architecture with Event-Driven Updates
- **Database Changes**: None - use existing IDETypes.js structure
- **API Changes**: None - internal service only
- **Frontend Changes**: None - backend automation only
- **Backend Changes**: Enhanced IDEManager, new VersionDetectionService, SelectorCollectionBot
- **Script Integration**: Integrate existing script functionality from `/scripts/cursor/` and `/scripts/vscode/` into backend services
- **Existing Infrastructure**: Build upon IDEManager, SelectorVersionManager, and CDP integration

## 2.1. Automatic Workflow Overview

### Core Automation Flow:
```javascript
// 1. Automatische Versionserkennung
const currentVersion = await detectIDEVersion('cursor'); // z.B. "1.6.0"
const knownVersion = await getKnownVersion('cursor');    // z.B. "1.5.7"

// 2. Wenn neue Version gefunden
if (currentVersion !== knownVersion) {
  // 3. Teste bestehende Selectors
  const validationResult = await testSelectors('cursor', '1.5.7');
  
  if (validationResult.success) {
    // ✅ Bestehende Selectors funktionieren noch
    await updateIDETypes('cursor', '1.6.0', '1.5.7'); // latest compatible
  } else {
    // ❌ Selectors funktionieren nicht mehr
    // 4. Sammle neue Selectors automatisch
    const newSelectors = await collectNewSelectors('cursor', '1.6.0');
    
    // 5. Validiere neue Selectors
    const newValidation = await testSelectors('cursor', '1.6.0', newSelectors);
    
    if (newValidation.success) {
      // ✅ Neue Selectors funktionieren
      await updateIDETypes('cursor', '1.6.0', newSelectors);
    } else {
      // ❌ Auch neue Selectors funktionieren nicht
      await logError('cursor', '1.6.0', 'Selector collection failed');
    }
  }
}
```

### Key Features:
- **Automatic Version Detection**: Detects new IDE versions automatically
- **Intelligent Selector Testing**: Tests existing selectors first before collecting new ones
- **Robust Fallback**: Handles failures gracefully with error logging
- **Codebase Updates**: Automatically updates IDETypes.js with new versions and selectors
- **Validation**: Tests selectors before committing to codebase
- **No Manual Intervention**: Fully automated process
- **Backend Integration**: Integrates existing script functionality into backend services
- **Version Comparison**: Compares detected vs known versions
- **Selector Validation**: Tests selectors before codebase updates
- **Automatic IDETypes.js Updates**: Updates codebase with new versions/selectors

## 3. File Impact Analysis

### Existing Infrastructure (Already Available):
- ✅ `backend/infrastructure/external/ide/IDEManager.js` - Has CDP integration and version detection
- ✅ `backend/domain/services/ide/IDETypes.js` - Has version structure and metadata
- ✅ `backend/domain/services/ide/IDESelectorManager.js` - Has selector management
- ✅ `backend/domain/services/ide/SelectorVersionManager.js` - Has version-based selector loading
- ✅ `scripts/cursor/auto-dom-collector.js` - Has automated DOM collection
- ✅ `scripts/cursor/selector-generator.js` - Has selector generation
- ✅ `scripts/cursor/dom-analyzer.js` - Has DOM analysis
- ✅ `scripts/cursor/bulk-dom-analyzer.js` - Has bulk analysis
- ✅ `scripts/cursor/coverage-validator.js` - Has coverage validation
- ✅ `scripts/vscode/auto-dom-collector.js` - Has VSCode DOM collection
- ✅ `scripts/vscode/selector-generator.js` - Has VSCode selector generation

#### Files to Modify:
- [ ] `backend/infrastructure/external/ide/IDEManager.js` - Add automatic version comparison and new version detection
- [ ] `backend/domain/services/ide/IDETypes.js` - Add automatic version detection types
- [ ] `backend/domain/services/ide/IDESelectorManager.js` - Add automatic selector collection integration
- [ ] `backend/domain/services/ide/SelectorVersionManager.js` - Add version validation and comparison

#### Files to Create:
- [ ] `backend/domain/services/ide/VersionDetectionService.js` - Core version detection and comparison logic
- [ ] `backend/domain/services/ide/SelectorCollectionBot.js` - Automated selector collection (integrated from scripts)
- [ ] `backend/domain/services/ide/SelectorValidationService.js` - Intelligent selector testing and validation
- [ ] `backend/domain/services/ide/VersionValidationService.js` - Version validation and comparison
- [ ] `backend/domain/services/ide/IDETypesUpdater.js` - Automatic IDETypes.js updates with new versions/selectors
- [ ] `backend/infrastructure/external/ide/VersionDetector.js` - Enhanced CDP-based version detection
- [ ] `backend/infrastructure/external/ide/SelectorCollector.js` - DOM collection and selector generation (integrated from scripts)
- [ ] `backend/application/services/VersionManagementService.js` - Orchestrates complete automation workflow
- [ ] `backend/application/services/AutomationOrchestrator.js` - Main automation orchestrator
- [ ] `backend/tests/unit/ide/VersionDetectionService.test.js` - Unit tests
- [ ] `backend/tests/unit/ide/SelectorCollectionBot.test.js` - Unit tests
- [ ] `backend/tests/unit/ide/SelectorValidationService.test.js` - Unit tests
- [ ] `backend/tests/unit/ide/IDETypesUpdater.test.js` - Unit tests
- [ ] `backend/tests/integration/ide/VersionIntegration.test.js` - Integration tests
- [ ] `backend/tests/integration/ide/AutomationWorkflow.test.js` - End-to-end automation tests

#### Files to Delete:
- None

## 4. Implementation Phases

#### Phase 1: Enhanced Version Detection Service (2 hours)
- [ ] Create VersionDetectionService with CDP integration (build upon existing IDEManager)
- [ ] Implement automatic version comparison and new version detection
- [ ] Add version validation and comparison logic
- [ ] Create VersionDetector infrastructure component (enhance existing CDP integration)
- [ ] Add automatic version detection to IDEManager
- [ ] Write unit tests for version detection

#### Phase 2: Selector Collection Bot Integration (3 hours)
- [ ] Create SelectorCollectionBot with integrated DOM collection functionality
- [ ] Integrate DOM collection logic from auto-dom-collector.js into backend
- [ ] Integrate selector generation logic from selector-generator.js into backend
- [ ] Add automatic selector collection for new versions
- [ ] Create SelectorCollector infrastructure component with integrated script functionality
- [ ] Integrate with SelectorVersionManager for automatic updates
- [ ] Write unit tests for selector collection integration

#### Phase 3: Intelligent Selector Testing and Validation (2 hours)
- [ ] Create SelectorValidationService for testing existing selectors
- [ ] Implement automatic selector testing before collection
- [ ] Add fallback logic for when existing selectors fail
- [ ] Create IDETypesUpdater for automatic IDETypes.js updates
- [ ] Add automatic selector file generation and updates
- [ ] Write integration tests for validation workflow

#### Phase 4: Complete Automation and Error Handling (1 hour)
- [ ] Create VersionManagementService to orchestrate the complete process
- [ ] Create AutomationOrchestrator as main automation coordinator
- [ ] Add automatic version detection scheduling
- [ ] Add robust error handling and logging
- [ ] Add automatic codebase updates with validation
- [ ] Add fallback mechanisms for failed selector collection
- [ ] Write end-to-end tests for complete automation workflow

## 5. Code Standards & Patterns
- **Coding Style**: ESLint with existing project rules, Prettier formatting
- **Naming Conventions**: camelCase for variables/functions, PascalCase for classes, kebab-case for files
- **Error Handling**: Try-catch with specific error types, proper error logging
- **Logging**: Winston logger with structured logging, different levels for operations
- **Testing**: Jest framework, 90% coverage requirement
- **Documentation**: JSDoc for all public methods, README updates

## 6. Security Considerations
- [ ] Input validation and sanitization for version data
- [ ] Secure CDP connection handling
- [ ] Rate limiting for version detection requests
- [ ] Audit logging for all version operations
- [ ] Protection against malicious version data
- [ ] Secure selector collection process

## 7. Performance Requirements
- **Response Time**: < 500ms for version detection
- **Throughput**: 10 version detections per second
- **Memory Usage**: < 50MB for version detection service
- **Database Queries**: Optimized version lookups with indexing
- **Caching Strategy**: Cache version data for 1 hour, selector data for 24 hours

## 8. Testing Strategy

#### Intelligent Test Path Resolution:
```javascript
// Smart test path detection based on category, component type, and project structure
const resolveTestPath = (category, componentName, componentType = 'service') => {
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
  
  // File extension based on category
  const getFileExtension = (category) => {
    return category === 'frontend' ? '.test.jsx' : '.test.js';
  };
  
  const basePath = categoryPaths[category] || 'tests';
  const testType = componentTypeMapping[componentType] || 'unit';
  const extension = getFileExtension(category);
  
  return `${basePath}/${testType}/${componentName}${extension}`;
};

// Usage examples:
// resolveTestPath('ide', 'VersionDetectionService', 'service') → 'backend/tests/unit/VersionDetectionService.test.js'
// resolveTestPath('ide', 'SelectorCollectionBot', 'service') → 'backend/tests/unit/SelectorCollectionBot.test.js'
// resolveTestPath('ide', 'VersionController', 'api') → 'backend/tests/integration/VersionController.test.js'
```

#### Unit Tests:
- [ ] Test file: `backend/tests/unit/VersionDetectionService.test.js`
- [ ] Test cases: Version detection, CDP integration, error handling
- [ ] Mock requirements: CDP connection, HTTP requests

#### Integration Tests:
- [ ] Test file: `backend/tests/integration/VersionIntegration.test.js`
- [ ] Test scenarios: End-to-end version detection, selector collection
- [ ] Test data: Mock IDE instances, version data

#### E2E Tests:
- [ ] Test file: `backend/tests/e2e/VersionManagement.test.js`
- [ ] User flows: Complete version detection and selector collection
- [ ] Browser compatibility: Chrome, Firefox compatibility

## 9. Documentation Requirements

#### Code Documentation:
- [ ] JSDoc comments for all functions and classes
- [ ] README updates with new functionality
- [ ] API documentation for new endpoints
- [ ] Architecture diagrams for version detection flow

#### User Documentation:
- [ ] User guide updates for version management
- [ ] Feature documentation for developers
- [ ] Troubleshooting guide for version detection issues
- [ ] Migration guide for existing installations

## 10. Deployment Checklist

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

## 11. Rollback Plan
- [ ] Database rollback script prepared
- [ ] Configuration rollback procedure
- [ ] Service rollback procedure documented
- [ ] Communication plan for stakeholders

## 12. Success Criteria
- [ ] Automatic version detection works for all supported IDEs
- [ ] Intelligent selector testing validates existing selectors before collection
- [ ] Selector collection bot successfully collects selectors for new versions
- [ ] IDETypes.js automatically updated with new versions and selectors
- [ ] Robust fallback mechanisms handle selector collection failures
- [ ] Complete automation workflow requires no manual intervention
- [ ] Existing script functionality integrated into backend services
- [ ] Version comparison logic detects new vs known versions
- [ ] Selector validation tests selectors before codebase updates
- [ ] Automatic IDETypes.js updates with new versions/selectors
- [ ] DOM collection and selector generation integrated into backend
- [ ] Automation orchestrator coordinates complete workflow
- [ ] All tests pass (unit, integration, end-to-end)
- [ ] Performance requirements met
- [ ] Security requirements satisfied
- [ ] Documentation complete and accurate

## 13. Risk Assessment

#### High Risk:
- [ ] CDP connection failures - Mitigation: Implement retry logic and fallback mechanisms
- [ ] Version detection accuracy - Mitigation: Multiple detection strategies and validation

#### Medium Risk:
- [ ] Selector collection performance - Mitigation: Implement caching and optimization
- [ ] Database migration issues - Mitigation: Thorough testing and rollback procedures

#### Low Risk:
- [ ] API endpoint compatibility - Mitigation: Versioned API design
- [ ] Documentation updates - Mitigation: Automated documentation generation

## 14. AI Auto-Implementation Instructions

#### Task Database Fields:
- **source_type**: 'markdown_doc'
- **source_path**: 'docs/09_roadmap/pending/high/ide/automatic-ide-version-detection-and-integration/automatic-ide-version-detection-and-integration-implementation.md'
- **category**: 'ide'
- **automation_level**: 'semi_auto'
- **confirmation_required**: true
- **max_attempts**: 3
- **git_branch_required**: true
- **new_chat_required**: true

#### AI Execution Context:
```json
{
  "requires_new_chat": true,
  "git_branch_name": "feature/automatic-ide-version-detection",
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

## 15. Initial Prompt Documentation

#### Original Prompt (Sanitized):
```markdown
# Initial Prompt: Automatic IDE Version Detection and Integration

## User Request:
Nun brauche ich den task für den bot der das alles automatisiert, ich muss gleich noch mit 2 Versioenn die Selectoren Prüfen / validieren bzw sogar neue version machen für selectors wenn nötig ## Automatische IDE-Versionserkennung und -Integration

### Was du brauchst
Ein separater Plan, der den IDE Bot erweitert, um:
1. IDE-Versionen automatisch zu erkennen
2. Neue Versionen in die CODEBASE zu schreiben (IDETypes.js)
3. Selectors für neue Versionen zu sammeln
4. Das System selbst zu aktualisieren

### Warum separat?
- **Selector Versioning System** = statische Struktur für bekannte Versionen
- **IDE Bot Enhancement** = dynamische Erkennung und Sammlung neuer Versionen

### Empfohlene Reihenfolge
1. **Zuerst:** Selector Versioning System (4h)
   - Grundstruktur aufbauen
   - Manuelle Versionen hinzufügen
   - System testen

2. **Danach:** IDE Bot Enhancement (6–8h)
   - Automatische Versionserkennung
   - Selector-Sammlung für neue Versionen
   - Automatische Codebase-Updates

### Was der IDE Bot Enhancement Plan machen würde
```javascript
// Automatische Versionserkennung
async detectAndAddNewVersion(ideType) {
  const version = await this.detectVersion(ideType);
  const selectors = await this.collectSelectors(ideType, version);
  await this.updateIDETypes(ideType, version, selectors);
}

// Automatische Selector-Sammlung
async collectSelectors(ideType, version) {
  // Bot startet IDE in neuer Version
  // Sammelt alle Selectors automatisch
  // Speichert sie in der Codebase (IDETypes.js)
}
```

### Vorteile dieser Trennung
- Klare Verantwortlichkeiten
- Schrittweises Vorgehen
- Testbarkeit
- Wartbarkeit

**Fazit:** Zuerst das Selector Versioning System, danach den IDE Bot Enhancement Plan.
```

## Language Detection:
- **Original Language**: German
- **Translation Status**: ✅ Converted to English
- **Sanitization Status**: ✅ Credentials and personal data removed

## Prompt Analysis:
- **Intent**: Create automated IDE version detection and selector collection system
- **Complexity**: High based on requirements
- **Scope**: IDE Bot enhancement with version detection and selector collection
- **Dependencies**: Selector Versioning System (must be completed first)

## Sanitization Applied:
- [x] Credentials removed (API keys, passwords, tokens)
- [x] Personal information anonymized
- [x] Sensitive file paths generalized
- [x] Language converted to English
- [x] Technical terms preserved
- [x] Intent and requirements maintained

## 16. References & Resources
- **Technical Documentation**: CDP documentation, Playwright documentation
- **API References**: Chrome DevTools Protocol API
- **Design Patterns**: Service-Oriented Architecture, Event-Driven Architecture
- **Best Practices**: IDE integration patterns, version management
- **Similar Implementations**: Existing IDEManager, SelectorVersionManager

---

## Database Task Creation Instructions

This markdown will be parsed into a database task with the following mapping:

```sql
INSERT INTO tasks (
  id, project_id, title, description, type, category, priority, status,
  source_type, source_path, source_content, metadata, estimated_hours
) VALUES (
  uuid(), -- Generated
  'PIDEA', -- From context
  'Automatic IDE Version Detection and Integration', -- From section 1
  '[Full markdown content]', -- Complete description
  'feature', -- Derived from Technical Requirements
  'ide', -- From section 1 Category field
  'high', -- From section 1
  'pending', -- Initial status
  'markdown_doc', -- Source type
  'docs/09_roadmap/pending/high/ide/automatic-ide-version-detection-and-integration/automatic-ide-version-detection-and-integration-implementation.md', -- Main implementation file
  '[Full markdown content]', -- For reference
  '{"tech_stack": ["Node.js", "CDP", "SQLite/PostgreSQL", "Playwright"], "architecture": "Service-Oriented Architecture", "database_changes": "New tables for version tracking", "api_changes": "New endpoints for version detection", "frontend_changes": "Version management dashboard", "backend_changes": "Enhanced IDEManager, new VersionDetectionService"}', -- All technical details
  8 -- From section 1
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
8. **Set correct category** - Automatically organizes tasks into category folders
9. **Use category-specific paths** - Tasks are automatically placed in correct folders
10. **Master Index Creation** - Automatically generates central overview file

## Automatic Category Organization

**Default Status**: All new tasks are created with `pending` status and placed in `docs/09_roadmap/pending/` directory. This ensures consistent organization and allows for proper status transitions later.

**Status Transition Flow**:
- **pending** → **in-progress**: Task moves to `docs/09_roadmap/in-progress/[priority]/[category]/[name]/`
- **in-progress** → **completed**: Task moves to `docs/09_roadmap/completed/[quarter]/[category]/[name]/`
- **completed** → **archive**: Task moves to `docs/09_roadmap/completed/archive/[category]/[name]/` (after 1 year)

When you specify a **Category** in section 1, the system automatically:

1. **Creates status folder** if it doesn't exist: `docs/09_roadmap/pending/` (default status)
2. **Creates priority folder** if it doesn't exist: `docs/09_roadmap/pending/[priority]/`
3. **Creates category folder** if it doesn't exist: `docs/09_roadmap/pending/[priority]/[category]/`
4. **Creates task folder** for each task: `docs/09_roadmap/pending/[priority]/[category]/[name]/`
5. **Places main implementation file**: `docs/09_roadmap/pending/[priority]/[category]/[name]/[name]-implementation.md`
6. **Creates phase files** for subtasks: `docs/09_roadmap/pending/[priority]/[category]/[name]/[name]-phase-[number].md`
7. **Creates master index file**: `docs/09_roadmap/pending/[priority]/[category]/[name]/[name]-index.md`
8. **Sets database category** field to the specified category
9. **Organizes tasks hierarchically** for better management

### Available Categories:
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
- **** -  tasks that don't fit other categories

### Example Folder Structure:
```
docs/09_roadmap/
├── pending/
│   ├── high/
│   │   ├── ide/
│   │   │   ├── automatic-ide-version-detection-and-integration/
│   │   │   │   ├── automatic-ide-version-detection-and-integration-index.md
│   │   │   │   ├── automatic-ide-version-detection-and-integration-implementation.md
│   │   │   │   ├── automatic-ide-version-detection-and-integration-phase-1.md
│   │   │   │   ├── automatic-ide-version-detection-and-integration-phase-2.md
│   │   │   │   └── automatic-ide-version-detection-and-integration-phase-3.md
│   │   │   └── selector-versioning-system/
│   │   │       ├── selector-versioning-system-index.md
│   │   │       ├── selector-versioning-system-implementation.md
│   │   │       └── selector-versioning-system-phase-1.md
│   │   └── backend/
│   │       └── user-authentication/
│   │           ├── user-authentication-index.md
│   │           ├── user-authentication-implementation.md
│   │           └── user-authentication-phase-1.md
│   └── medium/
│       └── frontend/
│           └── ui-redesign/
│               ├── ui-redesign-index.md
│               ├── ui-redesign-implementation.md
│               └── ui-redesign-phase-1.md
├── in-progress/
├── completed/
└── failed/
```

## Example Usage

> Create a comprehensive development plan for implementing automatic IDE version detection and integration with selector collection. Include all database fields, AI execution context, file impacts, and success criteria. Follow the template structure above and ensure every section is completed with specific details for database-first task architecture.

---

**Note**: This template is optimized for database-first task architecture where markdown docs serve as specifications that get parsed into trackable, executable database tasks with full AI auto-implementation support.
