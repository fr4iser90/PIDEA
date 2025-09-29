# IDE Requirement Modal Implementation Plan

## 1. Project Overview
- **Feature/Component Name**: IDE Requirement Modal
- **Priority**: High
- **Category**: frontend
- **Status**: completed
- **Estimated Time**: 12 hours
- **Dependencies**: Existing IDEStartModal, AuthWrapper, IDEStore
- **Related Issues**: Enhanced user onboarding experience
- **Created**: 2024-12-19T10:30:00.000Z
- **Last Updated**: 2025-09-29T19:51:09.000Z

## 2. Technical Requirements
- **Tech Stack**: React, JavaScript, CSS, Zustand state management
- **Architecture Pattern**: Component-based with modal pattern
- **Database Changes**: New IDE configurations table for persistent storage
- **API Changes**: New endpoints for IDE configuration management
- **Frontend Changes**: New modal component, enhanced IDEStartModal, authentication flow integration
- **Backend Changes**: New service layer for IDE configuration persistence

## 3. Database Design & Persistence Strategy

### Current System Analysis
**Problem**: IDE paths are currently hardcoded in multiple places, but the REAL issue is understanding the sandboxed architecture:
- `backend/infrastructure/external/ide/detectors/*Detector.js` - Hardcoded common paths
- `backend/infrastructure/external/ide/starters/*Starter.js` - Hardcoded executable names
- `config/ide-config.json` - Static configuration without user-specific paths
- `start_ide_example.*` scripts - Hardcoded IDE paths

**CRITICAL INSIGHT**: PIDEA uses **sandboxed IDE instances**, not system installations:
- Each IDE runs with `--user-data-dir` pointing to isolated directories (`~/.pidea/ide_port/`)
- Each instance runs on different ports (9222-9231 for Cursor, 9232-9241 for VSCode, etc.)
- System installations don't work because they conflict with user's main IDE and port management

**Solution**: Replace hardcoded paths with database-driven configuration system that supports:
1. **Sandboxed instances only** - Never use system installations
2. **Port-based isolation** - Each instance gets its own port and data directory
3. **User-controlled executable paths** - User manually specifies executable path (AppImage, .exe, etc.)
4. **No auto-detection** - User chooses their IDE executables, no automatic scanning
5. **Version tracking** - For selector compatibility
6. **Simple validation** - Just check that executable exists and works

### IDE Configurations Table
```sql
-- IDE CONFIGURATIONS (User's IDE installations and settings)
CREATE TABLE IF NOT EXISTS ide_configurations (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id TEXT NOT NULL DEFAULT 'me',
    ide_type TEXT NOT NULL, -- 'cursor', 'vscode', 'windsurf'
    executable_path TEXT NOT NULL, -- Full path to IDE executable
    version TEXT, -- IDE version (e.g., '1.0.0', '2024.1.2')
    build_number TEXT, -- Build number if available
    installation_path TEXT, -- Directory where IDE is installed
    is_default BOOLEAN DEFAULT false, -- Is this the default installation
    is_active BOOLEAN DEFAULT true, -- Is this configuration active
    last_used TEXT, -- Last time this IDE was used
    usage_count INTEGER DEFAULT 0, -- How many times this IDE was used
    port_range_start INTEGER, -- Start of port range for this IDE
    port_range_end INTEGER, -- End of port range for this IDE
    startup_options TEXT, -- JSON with startup options
    metadata TEXT, -- JSON with additional IDE-specific settings
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id),
    UNIQUE(user_id, ide_type, executable_path)
);
```

### Data Migration Strategy
1. **User Configuration**: User manually specifies executable paths in modal
2. **Path Validation**: Validate all user-provided paths before saving
3. **Version Detection**: Extract version information from executables
4. **Fallback System**: Use database paths first, fallback to hardcoded if needed
5. **Data Integrity**: Ensure all saved paths are valid and executable
6. **No Auto-Scanning**: User chooses their executables, no automatic detection

### Data Persistence Strategy
- **User-specific**: Each user can have multiple IDE installations
- **Version tracking**: Store IDE version for correct selector compatibility
- **Path validation**: Validate executable paths before saving
- **User-controlled**: User manually specifies executable paths, no auto-detection
- **Fallback**: Use default paths if custom paths are invalid
- **Caching**: Cache IDE detection results for performance
- **Data Integrity**: Regular validation of stored paths

### API Endpoints
- `GET /api/ide/configurations` - Get user's IDE configurations
- `POST /api/ide/configurations` - Create new IDE configuration
- `PUT /api/ide/configurations/:id` - Update IDE configuration
- `DELETE /api/ide/configurations/:id` - Remove IDE configuration
- `POST /api/ide/configurations/validate` - Validate IDE executable path
- `POST /api/ide/configurations/version` - Get IDE version from executable

## 4. File Impact Analysis
#### Files to Modify:
- [ ] `frontend/src/presentation/components/auth/AuthWrapper.jsx` - Add IDE requirement check after login
- [ ] `frontend/src/presentation/components/ide/IDEStartModal.jsx` - Enhance with download links and executable path selection
- [ ] `frontend/src/css/components/ide/ide-start-modal.css` - Update styles for enhanced modal
- [ ] `backend/infrastructure/external/ide/detectors/*Detector.js` - Replace hardcoded paths with database lookup
- [ ] `backend/infrastructure/external/ide/starters/*Starter.js` - Replace hardcoded paths with database lookup
- [ ] `backend/infrastructure/external/ide/IDEManager.js` - Integrate with database configuration
- [ ] `backend/infrastructure/external/ide/IDEConfigManager.js` - Add database integration

#### Files to Create:
- [ ] `frontend/src/infrastructure/services/IDERequirementService.jsx` - Service for IDE requirement logic
- [ ] `backend/infrastructure/database/migrations/add-ide-configurations-table.sql` - Database migration for IDE configurations
- [ ] `backend/domain/entities/IDEConfiguration.js` - IDE configuration entity
- [ ] `backend/domain/repositories/IDEConfigurationRepository.js` - Repository for IDE configuration persistence
- [ ] `backend/application/services/IDEConfigurationService.js` - Service for IDE configuration management
- [ ] `backend/presentation/api/ide/IDEConfigurationController.js` - API controller for IDE configuration

#### Files to Delete:
- None

## 4. Implementation Phases

#### Phase 1: Enhanced IDE Start Modal (3 hours)
- [ ] Add download links for each IDE type
- [ ] Add executable path selection for non-default locations
- [ ] Add IDE version detection and storage
- [ ] Enhance modal with better UX for IDE setup
- [ ] Add IDE detection status indicators
- [ ] Update CSS for enhanced modal design
- [ ] Implement database persistence for IDE configurations

#### Phase 2: IDE Requirement Integration (4 hours)
- [ ] Integrate enhanced IDEStartModal with authentication flow
- [ ] Add IDE availability checking logic to AuthWrapper
- [ ] Implement modal trigger after successful login when no IDE is running
- [ ] Add service layer for IDE requirement management
- [ ] Implement database migration for IDE configurations
- [ ] Create backend services for IDE configuration persistence

#### Phase 3: Data Migration & Hardcoded Path Replacement (2 hours)
- [ ] Create data migration service to scan existing IDE installations
- [ ] Replace hardcoded paths in detectors with database lookup
- [ ] Replace hardcoded paths in starters with database lookup
- [ ] Update IDEManager to use database configurations
- [ ] Implement fallback system for missing database entries
- [ ] Add data validation and integrity checks

#### Phase 4: Testing & Polish (3 hours)
- [ ] Test modal functionality
- [ ] Test authentication flow integration
- [ ] Test database persistence
- [ ] Test data migration from hardcoded to database
- [ ] Polish user experience
- [ ] Add error handling and edge cases
- [ ] Update documentation

## 5. Code Standards & Patterns
- **Coding Style**: ESLint with existing project rules, Prettier formatting
- **Naming Conventions**: camelCase for variables/functions, PascalCase for classes, kebab-case for files
- **Error Handling**: Try-catch with specific error types, proper error logging
- **Logging**: Winston logger with structured logging, different levels for operations
- **Testing**: Jest framework, 90% coverage requirement
- **Documentation**: JSDoc for all public methods, README updates

## 6. Security Considerations
- [ ] Input validation for executable paths
- [ ] Sanitization of user-provided paths
- [ ] Protection against path traversal attacks
- [ ] Validation of IDE executable files
- [ ] Secure handling of download links

## 7. Performance Requirements
- **Response Time**: < 200ms for modal display
- **Throughput**: Handle multiple rapid login attempts
- **Memory Usage**: < 10MB additional memory usage
- **Database Queries**: None required
- **Caching Strategy**: Cache IDE detection results for 30 seconds

## 8. Testing Strategy

#### Unit Tests:
- [ ] Test file: `frontend/tests/unit/IDERequirementModal.test.jsx`
- [ ] Test cases: Modal rendering, IDE detection, download link functionality
- [ ] Mock requirements: IDEStore, AuthStore, API calls

#### Integration Tests:
- [ ] Test file: `frontend/tests/integration/IDERequirementFlow.test.jsx`
- [ ] Test scenarios: Login flow with IDE requirement, modal interaction
- [ ] Test data: Mock authentication responses, IDE availability states

#### E2E Tests:
- [ ] Test file: `frontend/tests/e2e/IDERequirementE2E.test.jsx`
- [ ] User flows: Complete login to IDE setup flow
- [ ] Browser compatibility: Chrome, Firefox compatibility

## 9. Documentation Requirements

#### Code Documentation:
- [ ] JSDoc comments for all modal components
- [ ] README updates with new IDE requirement flow
- [ ] Component usage examples
- [ ] Integration guide for authentication flow

#### User Documentation:
- [ ] User guide for IDE setup process
- [ ] Troubleshooting guide for IDE detection issues
- [ ] Download and installation instructions
- [ ] FAQ for common IDE setup problems

## 10. Deployment Checklist

#### Pre-deployment:
- [ ] All tests passing (unit, integration, e2e)
- [ ] Code review completed and approved
- [ ] Documentation updated and reviewed
- [ ] Security scan passed
- [ ] Performance benchmarks met

#### Deployment:
- [ ] No database migrations required
- [ ] No environment variables needed
- [ ] No configuration updates required
- [ ] No service restarts needed
- [ ] Health checks remain unchanged

#### Post-deployment:
- [ ] Monitor modal display performance
- [ ] Verify IDE detection accuracy
- [ ] Check user experience metrics
- [ ] Monitor error rates for IDE setup

## 11. Rollback Plan
- [ ] Component can be disabled via feature flag
- [ ] Modal can be hidden via CSS
- [ ] Authentication flow can revert to original behavior
- [ ] No database changes to rollback

## 12. Success Criteria
- [ ] Modal displays when no IDE is running after login
- [ ] Users can download IDEs from modal
- [ ] Users can specify custom executable paths
- [ ] Modal integrates seamlessly with existing IDE start flow
- [ ] All tests pass
- [ ] Performance requirements met
- [ ] User experience is intuitive and helpful

## 13. Risk Assessment

#### High Risk:
- [ ] IDE detection false positives - Mitigation: Implement fallback detection methods
- [ ] Modal blocking user workflow - Mitigation: Allow dismissal and provide alternative paths

#### Medium Risk:
- [ ] Download links becoming outdated - Mitigation: Implement link validation and update mechanism
- [ ] Performance impact on login flow - Mitigation: Implement lazy loading and caching

#### Low Risk:
- [ ] Browser compatibility issues - Mitigation: Test across major browsers
- [ ] CSS styling conflicts - Mitigation: Use scoped CSS classes

## 14. AI Auto-Implementation Instructions

#### Task Database Fields:
- **source_type**: 'markdown_doc'
- **source_path**: 'docs/09_roadmap/pending/high/frontend/ide-requirement-modal/ide-requirement-modal-implementation.md'
- **category**: 'frontend'
- **automation_level**: 'semi_auto'
- **confirmation_required**: true
- **max_attempts**: 3
- **git_branch_required**: true
- **new_chat_required**: true

#### AI Execution Context:
```json
{
  "requires_new_chat": true,
  "git_branch_name": "feature/ide-requirement-modal",
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
# Initial Prompt: IDE Requirement Modal

## User Request:
I need a modal that when no IDE is up and someone logs in, the modal comes up that you first need to start an IDE. I already have a modal for IDE start, should we use that? I want to add something like choose .exe or appimage etc. if it's not in the default location, and download link if you want to download it etc.

## Language Detection:
- **Original Language**: English
- **Translation Status**: ✅ Already in English
- **Sanitization Status**: ✅ No sensitive data to remove

## Prompt Analysis:
- **Intent**: Create IDE requirement modal for post-login flow
- **Complexity**: Medium - Enhance existing modal with new features
- **Scope**: Modal component, authentication integration, IDE management
- **Dependencies**: Existing IDEStartModal, authentication system

## Sanitization Applied:
- [ ] Credentials removed (N/A)
- [ ] Personal information anonymized (N/A)
- [ ] Sensitive file paths generalized (N/A)
- [ ] Language converted to English (N/A)
- [ ] Technical terms preserved ✅
- [ ] Intent and requirements maintained ✅

## Original Context Preserved:
- **Technical Requirements**: ✅ Maintained
- **Business Logic**: ✅ Preserved  
- **Architecture Decisions**: ✅ Documented
- **Success Criteria**: ✅ Included
```

## 16. References & Resources
- **Technical Documentation**: Existing IDEStartModal component
- **API References**: IDE management API endpoints
- **Design Patterns**: Modal pattern, authentication flow pattern
- **Best Practices**: React component design, state management
- **Similar Implementations**: Existing modal components in codebase
