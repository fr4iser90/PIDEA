# Phase 2: IDE Requirement Modal Integration

## Overview
Create the IDE requirement modal component and integrate it with the authentication flow to show when no IDE is running after login.

## Tasks

### 2.1 Create IDERequirementModal Component (1.5 hours)
- [ ] Create new modal component based on existing modal pattern
- [ ] Implement IDE availability checking logic
- [ ] Add modal state management
- [ ] Implement modal close and action handlers
- [ ] Add proper error handling

### 2.2 Integrate with Authentication Flow (1 hour)
- [ ] Modify AuthWrapper to check IDE availability after login
- [ ] Add IDE requirement check logic
- [ ] Implement modal trigger mechanism
- [ ] Handle modal dismissal and retry logic
- [ ] Add proper loading states

### 2.3 Implement Database Migration and Backend Services (1.5 hours)
- [ ] Create database migration for IDE configurations table
- [ ] Create IDEConfiguration entity and repository
- [ ] Implement IDEConfigurationService for business logic
- [ ] Create API controller for IDE configuration endpoints
- [ ] Add IDE detection and validation methods
- [ ] Implement caching for IDE detection results

## Implementation Details

### IDERequirementModal Component Structure
```javascript
const IDERequirementModal = ({ 
  isOpen, 
  onClose, 
  onStartIDE,
  availableIDEs,
  isLoading 
}) => {
  // Modal implementation
};
```

### Authentication Flow Integration
```javascript
// In AuthWrapper.jsx
useEffect(() => {
  if (isAuthenticated && !isLoading) {
    checkIDERequirement();
  }
}, [isAuthenticated, isLoading]);

const checkIDERequirement = async () => {
  const hasRunningIDE = await ideRequirementService.hasRunningIDE();
  if (!hasRunningIDE) {
    setShowIDERequirementModal(true);
  }
};
```

### Service Layer Implementation
```javascript
class IDEConfigurationService {
  async saveIDEConfiguration(config) {
    // Save IDE configuration to database
  }
  
  async getIDEConfigurations() {
    // Get user's IDE configurations
  }
  
  async detectIDEInstallations() {
    // Auto-detect IDE installations
  }
  
  async validateIDEExecutable(path) {
    // Validate IDE executable and get version
  }
  
  async updateIDEUsage(ideId) {
    // Update usage statistics
  }
}
```

### Database Migration Implementation
```sql
-- Add IDE configurations table
CREATE TABLE IF NOT EXISTS ide_configurations (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id TEXT NOT NULL DEFAULT 'me',
    ide_type TEXT NOT NULL,
    executable_path TEXT NOT NULL,
    version TEXT,
    build_number TEXT,
    installation_path TEXT,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    last_used TEXT,
    usage_count INTEGER DEFAULT 0,
    port_range_start INTEGER,
    port_range_end INTEGER,
    startup_options TEXT,
    metadata TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id),
    UNIQUE(user_id, ide_type, executable_path)
);
```

## Success Criteria
- [ ] Modal displays correctly when no IDE is running
- [ ] Integration with authentication flow works properly
- [ ] Database migration creates IDE configurations table
- [ ] Backend services handle IDE configuration persistence
- [ ] IDE detection and validation works correctly
- [ ] Modal can be dismissed and retried
- [ ] All error cases are handled properly

## Files to Create
- `frontend/src/presentation/components/ide/IDERequirementModal.jsx`
- `frontend/src/css/components/ide/ide-requirement-modal.css`
- `frontend/src/infrastructure/services/IDERequirementService.jsx`
- `backend/infrastructure/database/migrations/add-ide-configurations-table.sql`
- `backend/domain/entities/IDEConfiguration.js`
- `backend/domain/repositories/IDEConfigurationRepository.js`
- `backend/application/services/IDEConfigurationService.js`
- `backend/presentation/api/ide/IDEConfigurationController.js`

## Files to Modify
- `frontend/src/presentation/components/auth/AuthWrapper.jsx`

## Estimated Time: 4 hours
