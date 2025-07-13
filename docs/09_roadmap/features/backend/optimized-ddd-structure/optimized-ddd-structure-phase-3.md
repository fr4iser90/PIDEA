# Optimized DDD Structure – Phase 3: Advanced Integration

## Overview
Complete the advanced integration components including category-based dependency injection, event systems, and migration from the Unified Workflow System. This phase finalizes the optimized DDD structure with advanced features and cleanup.

## Objectives
- [ ] Implement category-based dependency injection system
- [ ] Create category-based event system
- [ ] Migrate and remove Unified Workflow System components
- [ ] Update Application.js for new DI and event systems
- [ ] Integrate all components into the main application
- [ ] Create comprehensive integration tests

## Deliverables
- File: `backend/infrastructure/di/CategoryServiceRegistry.js` - Category-based DI
- File: `backend/infrastructure/messaging/CategoryEventBus.js` - Category-based events
- File: `backend/Application.js` - Updated with new systems
- File: `tests/unit/infrastructure/di/CategoryServiceRegistry.test.js` - DI tests
- File: `tests/unit/infrastructure/messaging/CategoryEventBus.test.js` - Event tests
- File: `tests/integration/advanced-integration.test.js` - Integration tests
- File: `docs/migration/unified-system-removal.md` - Migration documentation

## Dependencies
- Requires: Phase 1 completion (Core Standardization)
- Requires: Phase 2 completion (JSON Configuration Service)
- Blocks: None (Final phase)

## Estimated Time
3 hours

## Success Criteria
- [ ] CategoryServiceRegistry manages services by category
- [ ] CategoryEventBus handles category-specific events
- [ ] Unified Workflow System components are completely removed
- [ ] Application.js integrates all new components
- [ ] All integration tests pass
- [ ] No breaking changes to existing functionality
- [ ] Performance is maintained or improved

## Implementation Details

### 1. CategoryServiceRegistry.js Implementation
```javascript
/**
 * CategoryServiceRegistry - Category-based Dependency Injection
 * Organizes services by category for better dependency management
 */
const { STANDARD_CATEGORIES } = require('@domain/constants/Categories');

class CategoryServiceRegistry {
  constructor() {
    this.services = new Map();
    this.categories = new Map();
    this.logger = console;
  }

  /**
   * Register services for a category
   * @param {string} category - Service category
   * @param {Object} services - Services to register
   */
  registerCategory(category, services) {
    if (!STANDARD_CATEGORIES[category.toUpperCase()]) {
      this.logger.warn(`Unknown category: ${category}`);
    }

    this.categories.set(category, {
      services: new Map(Object.entries(services)),
      registeredAt: new Date(),
      status: 'active'
    });

    this.logger.info(`✅ Category "${category}" registered with ${Object.keys(services).length} services`);
  }

  /**
   * Get services by category
   * @param {string} category - Service category
   * @returns {Object} Services in category
   */
  getServicesByCategory(category) {
    const categoryData = this.categories.get(category);
    if (!categoryData) {
      return {};
    }

    const services = {};
    for (const [name, service] of categoryData.services) {
      services[name] = service;
    }

    return services;
  }

  /**
   * Get specific service from category
   * @param {string} category - Service category
   * @param {string} serviceName - Service name
   * @returns {Object|null} Service instance
   */
  getService(category, serviceName) {
    const categoryData = this.categories.get(category);
    if (!categoryData) {
      return null;
    }

    return categoryData.services.get(serviceName) || null;
  }

  /**
   * Register individual service
   * @param {string} category - Service category
   * @param {string} serviceName - Service name
   * @param {Object} service - Service instance
   */
  registerService(category, serviceName, service) {
    if (!this.categories.has(category)) {
      this.categories.set(category, {
        services: new Map(),
        registeredAt: new Date(),
        status: 'active'
      });
    }

    const categoryData = this.categories.get(category);
    categoryData.services.set(serviceName, service);

    this.logger.info(`✅ Service "${serviceName}" registered in category "${category}"`);
  }

  /**
   * Get all categories
   * @returns {Array} All registered categories
   */
  getCategories() {
    return Array.from(this.categories.keys());
  }

  /**
   * Get category status
   * @param {string} category - Category name
   * @returns {string} Category status
   */
  getCategoryStatus(category) {
    const categoryData = this.categories.get(category);
    return categoryData ? categoryData.status : 'not_found';
  }

  /**
   * Set category status
   * @param {string} category - Category name
   * @param {string} status - New status
   */
  setCategoryStatus(category, status) {
    const categoryData = this.categories.get(category);
    if (categoryData) {
      categoryData.status = status;
      this.logger.info(`✅ Category "${category}" status set to "${status}"`);
    }
  }

  /**
   * Remove category
   * @param {string} category - Category name
   */
  removeCategory(category) {
    this.categories.delete(category);
    this.logger.info(`🗑️ Category "${category}" removed`);
  }

  /**
   * Get registry statistics
   * @returns {Object} Registry statistics
   */
  getStats() {
    const stats = {
      totalCategories: this.categories.size,
      totalServices: 0,
      categories: {}
    };

    for (const [category, categoryData] of this.categories) {
      const serviceCount = categoryData.services.size;
      stats.totalServices += serviceCount;
      stats.categories[category] = {
        serviceCount,
        status: categoryData.status,
        registeredAt: categoryData.registeredAt
      };
    }

    return stats;
  }

  /**
   * Initialize with default categories
   */
  initializeDefaultCategories() {
    // Analysis category services
    this.registerCategory('analysis', {
      projectAnalyzer: null, // Will be injected
      codeQualityAnalyzer: null,
      architectureAnalyzer: null,
      dependencyAnalyzer: null
    });

    // Testing category services
    this.registerCategory('testing', {
      testRunner: null,
      testGenerator: null,
      testValidator: null,
      coverageAnalyzer: null
    });

    // Refactoring category services
    this.registerCategory('refactoring', {
      codeRefactorer: null,
      moduleOrganizer: null,
      architectureRestructurer: null,
      dependencyCleaner: null
    });

    // Management category services
    this.registerCategory('management', {
      taskManager: null,
      projectManager: null,
      workflowManager: null,
      userManager: null
    });

    this.logger.info('✅ Default categories initialized');
  }
}

module.exports = CategoryServiceRegistry;
```

### 2. CategoryEventBus.js Implementation
```javascript
/**
 * CategoryEventBus - Category-based Event System
 * Extends EventBus with category-specific event handling
 */
const EventBus = require('./EventBus');

class CategoryEventBus extends EventBus {
  constructor() {
    super();
    this.categoryHandlers = new Map();
    this.logger = console;
  }

  /**
   * Emit category-specific event
   * @param {string} category - Event category
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  emitCategoryEvent(category, event, data) {
    const categoryEvent = `${category}.${event}`;
    this.emit(categoryEvent, {
      category,
      event,
      data,
      timestamp: new Date()
    });

    this.logger.info(`📡 Category event emitted: ${categoryEvent}`, {
      category,
      event,
      dataKeys: Object.keys(data || {})
    });
  }

  /**
   * Listen to category-specific event
   * @param {string} category - Event category
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   */
  onCategoryEvent(category, event, handler) {
    const categoryEvent = `${category}.${event}`;
    this.on(categoryEvent, handler);

    // Store handler reference for cleanup
    if (!this.categoryHandlers.has(category)) {
      this.categoryHandlers.set(category, new Map());
    }
    this.categoryHandlers.get(category).set(event, handler);

    this.logger.info(`👂 Category event listener registered: ${categoryEvent}`);
  }

  /**
   * Remove category-specific event listener
   * @param {string} category - Event category
   * @param {string} event - Event name
   */
  offCategoryEvent(category, event) {
    const categoryEvent = `${category}.${event}`;
    const handler = this.categoryHandlers.get(category)?.get(event);
    
    if (handler) {
      this.off(categoryEvent, handler);
      this.categoryHandlers.get(category).delete(event);
      this.logger.info(`🔇 Category event listener removed: ${categoryEvent}`);
    }
  }

  /**
   * Emit workflow execution events
   * @param {string} category - Workflow category
   * @param {string} action - Action (start, complete, error)
   * @param {Object} data - Workflow data
   */
  emitWorkflowEvent(category, action, data) {
    this.emitCategoryEvent(category, `workflow.${action}`, {
      workflowName: data.name,
      workflowId: data.id,
      duration: data.duration,
      success: data.success,
      ...data
    });
  }

  /**
   * Emit step execution events
   * @param {string} category - Step category
   * @param {string} action - Action (start, complete, error)
   * @param {Object} data - Step data
   */
  emitStepEvent(category, action, data) {
    this.emitCategoryEvent(category, `step.${action}`, {
      stepName: data.name,
      stepId: data.id,
      duration: data.duration,
      success: data.success,
      ...data
    });
  }

  /**
   * Emit registry events
   * @param {string} category - Registry category
   * @param {string} action - Action (register, unregister, update)
   * @param {Object} data - Registry data
   */
  emitRegistryEvent(category, action, data) {
    this.emitCategoryEvent(category, `registry.${action}`, {
      componentName: data.name,
      componentType: data.type,
      ...data
    });
  }

  /**
   * Get category event statistics
   * @returns {Object} Event statistics by category
   */
  getCategoryEventStats() {
    const stats = {};
    
    for (const [category, events] of this.categoryHandlers) {
      stats[category] = {
        eventCount: events.size,
        events: Array.from(events.keys())
      };
    }

    return stats;
  }

  /**
   * Clear all category event listeners
   * @param {string} category - Category to clear (optional)
   */
  clearCategoryEvents(category = null) {
    if (category) {
      const events = this.categoryHandlers.get(category);
      if (events) {
        for (const [event, handler] of events) {
          this.offCategoryEvent(category, event);
        }
        this.categoryHandlers.delete(category);
      }
    } else {
      // Clear all categories
      for (const [cat, events] of this.categoryHandlers) {
        for (const [event, handler] of events) {
          this.offCategoryEvent(cat, event);
        }
      }
      this.categoryHandlers.clear();
    }
  }
}

module.exports = CategoryEventBus;
```

### 3. Application.js Updates
```javascript
// Add to existing Application.js

// Import new components
const CategoryServiceRegistry = require('./infrastructure/di/CategoryServiceRegistry');
const CategoryEventBus = require('./infrastructure/messaging/CategoryEventBus');
const WorkflowConfigService = require('./domain/services/WorkflowConfigService');

class Application {
  // ... existing constructor and methods ...

  async initializeInfrastructure() {
    this.logger.info('[Application] Initializing infrastructure...');

    // Initialize DI system first
    const { getServiceRegistry } = require('./infrastructure/di/ServiceRegistry');
    const { getProjectContextService } = require('./infrastructure/di/ProjectContextService');
    
    this.serviceRegistry = getServiceRegistry();
    this.projectContext = getProjectContextService();
    
    // Initialize category-based DI
    this.categoryServiceRegistry = new CategoryServiceRegistry();
    this.categoryServiceRegistry.initializeDefaultCategories();
    
    // Initialize category-based events
    this.categoryEventBus = new CategoryEventBus();
    
    // Register in service registry
    this.serviceRegistry.getContainer().registerSingleton('categoryServiceRegistry', this.categoryServiceRegistry);
    this.serviceRegistry.getContainer().registerSingleton('categoryEventBus', this.categoryEventBus);
    
    // Initialize workflow config service
    this.workflowConfigService = new WorkflowConfigService({
      frameworkRegistry: FrameworkRegistry,
      workflowRegistry: WorkflowRegistry,
      stepRegistry: StepRegistry,
      logger: this.logger,
      eventBus: this.categoryEventBus
    });
    
    // Register workflow config service
    this.serviceRegistry.getContainer().registerSingleton('workflowConfigService', this.workflowConfigService);
    
    // ... rest of existing initialization ...
  }

  // Add getter methods for new components
  getCategoryServiceRegistry() {
    return this.categoryServiceRegistry;
  }

  getCategoryEventBus() {
    return this.categoryEventBus;
  }

  getWorkflowConfigService() {
    return this.workflowConfigService;
  }
}
```

### 4. Unified System Migration
```javascript
// Migration script: scripts/migration/remove-unified-system.js

const fs = require('fs').promises;
const path = require('path');

class UnifiedSystemMigration {
  constructor() {
    this.filesToRemove = [
      'backend/domain/workflows/unified/',
      'backend/application/services/UnifiedWorkflowService.js',
      'backend/presentation/api/UnifiedWorkflowController.js',
      'backend/presentation/api/routes/unified-workflow.js'
    ];
    
    this.filesToUpdate = [
      'backend/Application.js',
      'backend/domain/services/TaskService.js',
      'backend/domain/services/WorkflowOrchestrationService.js'
    ];
  }

  async migrate() {
    console.log('🚀 Starting Unified System migration...');
    
    // 1. Backup existing files
    await this.createBackup();
    
    // 2. Remove Unified System files
    await this.removeUnifiedFiles();
    
    // 3. Update imports in remaining files
    await this.updateImports();
    
    // 4. Update Application.js
    await this.updateApplication();
    
    console.log('✅ Unified System migration completed');
  }

  async createBackup() {
    const backupDir = 'backup/unified-system-' + Date.now();
    await fs.mkdir(backupDir, { recursive: true });
    
    for (const file of this.filesToRemove) {
      try {
        await fs.copyFile(file, path.join(backupDir, path.basename(file)));
      } catch (error) {
        console.log(`⚠️ Could not backup ${file}: ${error.message}`);
      }
    }
    
    console.log(`📦 Backup created: ${backupDir}`);
  }

  async removeUnifiedFiles() {
    for (const file of this.filesToRemove) {
      try {
        await fs.rm(file, { recursive: true, force: true });
        console.log(`🗑️ Removed: ${file}`);
      } catch (error) {
        console.log(`⚠️ Could not remove ${file}: ${error.message}`);
      }
    }
  }

  async updateImports() {
    // Remove Unified Workflow imports from all files
    const importPatterns = [
      /require\(['"]@application\/handlers\/workflow['"]\)/g,
      /require\(['"]\.\.\/workflows\/unified\/.*['"]\)/g,
      /UnifiedWorkflowHandler/g,
      /UnifiedWorkflowService/g
    ];
    
    for (const file of this.filesToUpdate) {
      try {
        let content = await fs.readFile(file, 'utf8');
        
        for (const pattern of importPatterns) {
          content = content.replace(pattern, '');
        }
        
        await fs.writeFile(file, content);
        console.log(`📝 Updated: ${file}`);
      } catch (error) {
        console.log(`⚠️ Could not update ${file}: ${error.message}`);
      }
    }
  }

  async updateApplication() {
    // Update Application.js to use new systems
    const appFile = 'backend/Application.js';
    let content = await fs.readFile(appFile, 'utf8');
    
    // Add new imports
    const newImports = `
// Category-based systems
const CategoryServiceRegistry = require('./infrastructure/di/CategoryServiceRegistry');
const CategoryEventBus = require('./infrastructure/messaging/CategoryEventBus');
const WorkflowConfigService = require('./domain/services/WorkflowConfigService');
`;
    
    content = content.replace('// Auto-Security', newImports + '\n// Auto-Security');
    
    await fs.writeFile(appFile, content);
    console.log(`📝 Updated Application.js`);
  }
}

// Run migration
if (require.main === module) {
  const migration = new UnifiedSystemMigration();
  migration.migrate().catch(console.error);
}

module.exports = UnifiedSystemMigration;
```

## Testing Strategy

### Unit Tests
- [ ] CategoryServiceRegistry service management tests
- [ ] CategoryEventBus event handling tests
- [ ] Application.js integration tests
- [ ] Migration script tests

### Integration Tests
- [ ] End-to-end category-based DI tests
- [ ] Event system integration tests
- [ ] Workflow execution with new systems
- [ ] Performance impact tests

### Test Coverage Goals
- **Unit Tests**: 95% coverage
- **Integration Tests**: 90% coverage

## Validation Checklist

### Pre-Implementation
- [ ] Verify Phase 1 and 2 completion
- [ ] Backup existing Application.js
- [ ] Document current Unified System usage

### Implementation
- [ ] Create CategoryServiceRegistry
- [ ] Implement CategoryEventBus
- [ ] Update Application.js
- [ ] Create migration script
- [ ] Remove Unified System components

### Post-Implementation
- [ ] Test all new integrations
- [ ] Verify no breaking changes
- [ ] Run performance tests
- [ ] Update documentation
- [ ] Validate migration success

## Risk Assessment

### High Risk
- [ ] Breaking changes during migration - Mitigation: Comprehensive backup and testing
- [ ] Performance degradation - Mitigation: Performance testing and optimization

### Medium Risk
- [ ] Event system complexity - Mitigation: Thorough testing and documentation
- [ ] DI integration issues - Mitigation: Gradual migration and validation

### Low Risk
- [ ] Documentation updates - Mitigation: Update docs alongside implementation

## Success Metrics
- CategoryServiceRegistry manages all services correctly
- CategoryEventBus handles events without performance impact
- Unified System components completely removed
- Application.js integrates all new systems seamlessly
- No breaking changes to existing functionality
- Performance maintained or improved
- 95% test coverage achieved
- Migration completed successfully

## Migration Documentation

### docs/migration/unified-system-removal.md
```markdown
# Unified System Removal Migration

## Overview
This document describes the migration from the Unified Workflow System to the optimized DDD structure with JSON configuration.

## What Was Removed
- `backend/domain/workflows/unified/` - Complete unified workflow system
- `backend/application/services/UnifiedWorkflowService.js` - Unified service
- `backend/presentation/api/UnifiedWorkflowController.js` - Unified API controller
- All related tests and documentation

## What Was Added
- `backend/infrastructure/di/CategoryServiceRegistry.js` - Category-based DI
- `backend/infrastructure/messaging/CategoryEventBus.js` - Category-based events
- `backend/domain/services/WorkflowConfigService.js` - JSON workflow service
- Enhanced Application.js integration

## Migration Steps
1. Backup existing Unified System files
2. Remove Unified System components
3. Update imports and dependencies
4. Integrate new category-based systems
5. Test all functionality
6. Update documentation

## Rollback Plan
If issues occur, restore from backup:
```bash
cp -r backup/unified-system-[timestamp]/* backend/
```

## Success Criteria
- All tests pass
- No breaking changes
- Performance maintained
- Documentation updated
``` 