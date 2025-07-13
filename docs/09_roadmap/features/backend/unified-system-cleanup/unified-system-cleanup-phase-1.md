# Unified System Cleanup – Phase 1: Analysis & Preparation

## Overview
This phase focuses on comprehensive analysis of the unified workflow system, creating backups, documenting dependencies, and preparing for safe removal while ensuring the Categories system is fully functional.

## Objectives
- [ ] Create comprehensive backup of all unified workflow files
- [ ] Analyze all unified workflow dependencies and usage patterns
- [ ] Document current unified workflow integration points
- [ ] Validate Categories system is fully functional
- [ ] Create rollback procedures and validation scripts

## Deliverables
- **File**: `scripts/cleanup/backup-unified-system.js` - Comprehensive backup script
- **File**: `scripts/cleanup/analyze-unified-dependencies.js` - Dependency analysis script
- **File**: `docs/cleanup/unified-system-analysis-report.md` - Detailed analysis report
- **File**: `scripts/cleanup/validate-categories-system.js` - Categories validation script
- **File**: `scripts/cleanup/rollback-unified-system.js` - Rollback procedures
- **Test**: `tests/cleanup/UnifiedSystemAnalysis.test.js` - Analysis validation tests

## Dependencies
- Requires: Categories system already implemented and working
- Blocks: Phase 2 start

## Estimated Time
4 hours

## Implementation Details

### 1. Create Backup Script
```javascript
// scripts/cleanup/backup-unified-system.js
const fs = require('fs-extra');
const path = require('path');

class UnifiedSystemBackup {
  constructor() {
    this.backupDir = path.join(__dirname, '../../backups/unified-system');
    this.filesToBackup = [
      'backend/domain/services/UnifiedWorkflowService.js',
      'backend/application/handlers/workflow/UnifiedWorkflowHandler.js',
      'backend/application/handlers/UnifiedHandlerRegistry.js',
      'backend/application/handlers/workflow/index.js',
      'backend/tests/unit/domain/workflows/UnifiedWorkflowFoundation.test.js',
      'backend/tests/unit/workflows/handlers/UnifiedWorkflowHandler.test.js',
      'backend/examples/UnifiedWorkflowFoundationExample.js',
      'backend/docs/UnifiedWorkflowFoundation1B.md',
      'scripts/migration/start-unified-workflow-migration.js',
      'scripts/migration/complete-unified-workflow-migration.js'
    ];
  }

  async createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(this.backupDir, `backup-${timestamp}`);
    
    await fs.ensureDir(backupPath);
    
    for (const file of this.filesToBackup) {
      const sourcePath = path.join(__dirname, '../../..', file);
      const targetPath = path.join(backupPath, file);
      
      if (await fs.pathExists(sourcePath)) {
        await fs.ensureDir(path.dirname(targetPath));
        await fs.copy(sourcePath, targetPath);
        console.log(`✅ Backed up: ${file}`);
      } else {
        console.log(`⚠️  File not found: ${file}`);
      }
    }
    
    return backupPath;
  }
}
```

### 2. Dependency Analysis Script
```javascript
// scripts/cleanup/analyze-unified-dependencies.js
const fs = require('fs-extra');
const path = require('path');

class UnifiedDependencyAnalyzer {
  constructor() {
    this.dependencies = new Map();
    this.imports = new Map();
    this.services = new Map();
  }

  async analyzeDependencies() {
    // Analyze service registrations
    await this.analyzeServiceRegistry();
    
    // Analyze imports and exports
    await this.analyzeImports();
    
    // Analyze API controllers
    await this.analyzeControllers();
    
    // Generate report
    return this.generateReport();
  }

  async analyzeServiceRegistry() {
    const serviceRegistryPath = 'backend/infrastructure/di/ServiceRegistry.js';
    const content = await fs.readFile(serviceRegistryPath, 'utf8');
    
    // Find unified workflow service registrations
    const unifiedMatches = content.match(/unifiedWorkflowService|UnifiedWorkflowService/g);
    if (unifiedMatches) {
      this.services.set('ServiceRegistry', unifiedMatches);
    }
  }

  async analyzeImports() {
    const filesToAnalyze = [
      'backend/domain/services/WorkflowOrchestrationService.js',
      'backend/domain/services/TaskService.js',
      'backend/presentation/api/AutoModeController.js',
      'backend/presentation/api/TaskController.js'
    ];

    for (const file of filesToAnalyze) {
      const content = await fs.readFile(file, 'utf8');
      const unifiedImports = content.match(/UnifiedWorkflow|UnifiedHandler/g);
      if (unifiedImports) {
        this.imports.set(file, unifiedImports);
      }
    }
  }

  generateReport() {
    return {
      services: Object.fromEntries(this.services),
      imports: Object.fromEntries(this.imports),
      recommendations: this.generateRecommendations()
    };
  }
}
```

### 3. Categories System Validation
```javascript
// scripts/cleanup/validate-categories-system.js
const { STANDARD_CATEGORIES, isValidCategory } = require('../../backend/domain/constants/Categories');
const StepRegistry = require('../../backend/domain/steps/StepRegistry');
const FrameworkRegistry = require('../../backend/domain/frameworks/FrameworkRegistry');

class CategoriesSystemValidator {
  constructor() {
    this.stepRegistry = new StepRegistry();
    this.frameworkRegistry = new FrameworkRegistry();
  }

  async validateCategoriesSystem() {
    const results = {
      categories: this.validateCategories(),
      stepRegistry: await this.validateStepRegistry(),
      frameworkRegistry: await this.validateFrameworkRegistry(),
      handlerRegistry: await this.validateHandlerRegistry()
    };

    return {
      isValid: Object.values(results).every(r => r.isValid),
      results
    };
  }

  validateCategories() {
    const categories = Object.values(STANDARD_CATEGORIES);
    const validCategories = categories.filter(cat => isValidCategory(cat));
    
    return {
      isValid: validCategories.length === categories.length,
      totalCategories: categories.length,
      validCategories: validCategories.length,
      categories: categories
    };
  }

  async validateStepRegistry() {
    try {
      await this.stepRegistry.loadStepsFromCategories();
      const steps = this.stepRegistry.getAllSteps();
      
      return {
        isValid: steps.length > 0,
        totalSteps: steps.length,
        categories: Array.from(this.stepRegistry.categories.keys())
      };
    } catch (error) {
      return {
        isValid: false,
        error: error.message
      };
    }
  }
}
```

### 4. Rollback Procedures
```javascript
// scripts/cleanup/rollback-unified-system.js
const fs = require('fs-extra');
const path = require('path');

class UnifiedSystemRollback {
  constructor() {
    this.backupDir = path.join(__dirname, '../../backups/unified-system');
  }

  async rollback(backupTimestamp) {
    const backupPath = path.join(this.backupDir, `backup-${backupTimestamp}`);
    
    if (!await fs.pathExists(backupPath)) {
      throw new Error(`Backup not found: ${backupTimestamp}`);
    }

    // Restore files from backup
    const files = await fs.readdir(backupPath, { recursive: true });
    
    for (const file of files) {
      if (file.endsWith('.js') || file.endsWith('.md')) {
        const sourcePath = path.join(backupPath, file);
        const targetPath = path.join(__dirname, '../../..', file);
        
        await fs.ensureDir(path.dirname(targetPath));
        await fs.copy(sourcePath, targetPath);
        console.log(`✅ Restored: ${file}`);
      }
    }

    return { success: true, restoredFiles: files.length };
  }
}
```

## Success Criteria
- [ ] All unified workflow files backed up successfully
- [ ] Dependency analysis completed and documented
- [ ] Categories system validation passed
- [ ] Rollback procedures tested and working
- [ ] Analysis report generated with clear recommendations
- [ ] No data loss during backup process
- [ ] All validation tests passing

## Risk Mitigation
- **Data Loss**: Comprehensive backup before any changes
- **System Instability**: Categories system validation ensures fallback
- **Rollback Failure**: Test rollback procedures before proceeding
- **Dependency Issues**: Document all dependencies for safe removal

## Next Phase Dependencies
This phase must complete successfully before Phase 2 can begin. The analysis report and backup validation are critical for safe removal in the next phase. 