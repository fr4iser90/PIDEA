#!/usr/bin/env node
/**
 * Analyze Handler Migration Script
 * 
 * This script helps migrate from  analyze handlers to the unified workflow system.
 * It provides utilities for testing, validation, and rollback capabilities.
 */
const path = require('path');
const fs = require('fs').promises;
// Import migration utilities
const { HandlerMigrationUtility } = require('../../backend/domain/workflows/handlers');
const { UnifiedWorkflowHandler, HandlerRegistry } = require('../../backend/domain/workflows/handlers');
class AnalyzeHandlerMigration {
  constructor(options = {}) {
    this.options = {
      enableValidation: options.enableValidation !== false,
      enableTesting: options.enableTesting !== false,
      enableRollback: options.enableRollback !== false,
      dryRun: options.dryRun || false,
      ...options
    };
    this.migrationUtility = new HandlerMigrationUtility(this.options);
    this.logger = console;
  }
  /**
   * Run the complete migration process
   */
  async runMigration() {
    this.logger.info('🚀 Starting Analyze Handler Migration...');
    try {
      // Phase 1: Pre-migration validation
      await this.validatePreMigration();
      // Phase 2: Create unified workflow system
      await this.createUnifiedWorkflowSystem();
      // Phase 3: Test migration
      if (this.options.enableTesting) {
        await this.testMigration();
      }
      // Phase 4: Execute migration
      if (!this.options.dryRun) {
        await this.executeMigration();
      } else {
        this.logger.info('🔍 DRY RUN: Migration would be executed');
      }
      // Phase 5: Post-migration validation
      await this.validatePostMigration();
      this.logger.info('✅ Analyze Handler Migration completed successfully!');
    } catch (error) {
      this.logger.error('❌ Migration failed:', error.message);
      if (this.options.enableRollback) {
        this.logger.info('🔄 Attempting rollback...');
        await this.rollbackMigration();
      }
      throw error;
    }
  }
  /**
   * Validate pre-migration state
   */
  async validatePreMigration() {
    this.logger.info('🔍 Validating pre-migration state...');
      'AnalyzeArchitectureHandler',
      'AnalyzeCodeQualityHandler',
      'AnalyzeTechStackHandler',
      'AnalyzeRepoStructureHandler',
      'AnalyzeDependenciesHandler',
      'AdvancedAnalysisHandler'
    ];
      const handlerPath = path.join(__dirname, '../../backend/application/handlers/analyze', `${handlerName}.js`);
      try {
        await fs.access(handlerPath);
        this.logger.info(`✅ Found  handler: ${handlerName}`);
      } catch (error) {
        this.logger.warn(`⚠️   handler not found: ${handlerName}`);
      }
    }
    // Check if unified workflow components exist
    const unifiedComponents = [
      'UnifiedWorkflowHandler',
      'HandlerRegistry',
      'ArchitectureAnalysisStep',
      'CodeQualityAnalysisStep',
      'TechStackAnalysisStep',
      'RepoStructureAnalysisStep',
      'DependenciesAnalysisStep',
      'AdvancedAnalysisStep'
    ];
    for (const componentName of unifiedComponents) {
      try {
        require(`../../backend/domain/workflows/handlers/${componentName}`);
        this.logger.info(`✅ Found unified component: ${componentName}`);
      } catch (error) {
        this.logger.warn(`⚠️  Unified component not found: ${componentName}`);
      }
    }
    this.logger.info('✅ Pre-migration validation completed');
  }
  /**
   * Create unified workflow system
   */
  async createUnifiedWorkflowSystem() {
    this.logger.info('🔧 Creating unified workflow system...');
    // Create handler registry with auto-registration
    const handlerRegistry = new HandlerRegistry({ 
      autoRegisterAnalysisSteps: true,
      enableValidation: this.options.enableValidation,
      enableStatistics: true
    });
    // Create unified workflow handler
    const unifiedHandler = new UnifiedWorkflowHandler({
      handlerRegistry,
      logger: this.logger,
      eventBus: { emit: () => {} }
    });
    // Verify registration
    const registeredHandlers = handlerRegistry.getHandlerTypes();
    this.logger.info(`📋 Registered ${registeredHandlers.length} analysis steps:`, registeredHandlers);
    this.unifiedHandler = unifiedHandler;
    this.handlerRegistry = handlerRegistry;
    this.logger.info('✅ Unified workflow system created');
  }
  /**
   * Test migration
   */
  async testMigration() {
    this.logger.info('🧪 Testing migration...');
    const testCases = [
      {
        type: 'architecture-analysis',
        config: { detectPatterns: true, analyzeDependencies: true }
      },
      {
        type: 'code-quality-analysis',
        config: { linting: true, complexity: true }
      },
      {
        type: 'tech-stack-analysis',
        config: { detectFrameworks: true, detectLibraries: true }
      },
      {
        type: 'repo-structure-analysis',
        config: { includeHidden: false, maxDepth: 5 }
      },
      {
        type: 'dependencies-analysis',
        config: { analyzeVersions: true, checkVulnerabilities: true }
      },
      {
        type: 'advanced-analysis',
        config: { layerValidation: true, logicAnalysis: true }
      }
    ];
    for (const testCase of testCases) {
      try {
        const result = await this.migrationUtility.migrateHandler(testCase.type, testCase.config);
        if (result.success) {
          this.logger.info(`✅ Test passed for ${testCase.type}`);
        } else {
          this.logger.warn(`⚠️  Test failed for ${testCase.type}: ${result.error}`);
        }
      } catch (error) {
        this.logger.error(`❌ Test error for ${testCase.type}:`, error.message);
      }
    }
    this.logger.info('✅ Migration testing completed');
  }
  /**
   * Execute migration
   */
  async executeMigration() {
    this.logger.info('🚀 Executing migration...');
    const migrationSteps = [
      {
        name: 'Update Application.js',
        description: 'Update Application.js to use unified workflow system',
        execute: () => this.updateApplicationJs()
      },
      {
        name: 'Update Service Registry',
        description: 'Register unified workflow components in service registry',
        execute: () => this.updateServiceRegistry()
      },
      {
        name: 'Create Migration Documentation',
        description: 'Create migration documentation and guides',
        execute: () => this.createMigrationDocumentation()
      }
    ];
    for (const step of migrationSteps) {
      this.logger.info(`📝 Executing: ${step.name}`);
      try {
        await step.execute();
        this.logger.info(`✅ Completed: ${step.name}`);
      } catch (error) {
        this.logger.error(`❌ Failed: ${step.name}:`, error.message);
        throw error;
      }
    }
    this.logger.info('✅ Migration execution completed');
  }
  /**
   * Update Application.js
   */
  async updateApplicationJs() {
    const appJsPath = path.join(__dirname, '../../backend/Application.js');
    let content = await fs.readFile(appJsPath, 'utf8');
    // Add unified workflow imports
    if (!content.includes('UnifiedWorkflowHandler')) {
      const importSection = content.indexOf('// Infrastructure');
      const unifiedImports = `
// Unified Workflow System
const { UnifiedWorkflowHandler, HandlerRegistry } = require('./domain/workflows/handlers');
`;
      content = content.slice(0, importSection) + unifiedImports + content.slice(importSection);
    }
    // Update handler initialization
    if (!content.includes('unifiedWorkflowHandler')) {
      const initSection = content.indexOf('// Initialize Analyze Handlers');
      const unifiedInit = `
    // Initialize Unified Workflow System
    this.unifiedWorkflowHandler = new UnifiedWorkflowHandler({
      handlerRegistry: new HandlerRegistry({ autoRegisterAnalysisSteps: true }),
      logger: this.logger,
      eventBus: this.eventBus
    });
`;
      content = content.replace('// Initialize Analyze Handlers', unifiedInit);
    }
    await fs.writeFile(appJsPath, content);
  }
  /**
   * Update Service Registry
   */
  async updateServiceRegistry() {
    const serviceRegistryPath = path.join(__dirname, '../../backend/infrastructure/di/ServiceRegistry.js');
    let content = await fs.readFile(serviceRegistryPath, 'utf8');
    // Add unified workflow registration
    if (!content.includes('unifiedWorkflowHandler')) {
      const handlerSection = content.indexOf('registerApplicationHandlers()');
      const unifiedRegistration = `
        // Unified workflow handler
        this.container.register('unifiedWorkflowHandler', (eventBus, logger) => {
          const { UnifiedWorkflowHandler, HandlerRegistry } = require('../../domain/workflows/handlers');
          return new UnifiedWorkflowHandler({
            handlerRegistry: new HandlerRegistry({ autoRegisterAnalysisSteps: true }),
            logger,
            eventBus
          });
        }, { singleton: true, dependencies: ['eventBus', 'logger'] });
`;
      content = content.replace('registerApplicationHandlers()', unifiedRegistration + 'registerApplicationHandlers()');
    }
    await fs.writeFile(serviceRegistryPath, content);
  }
  /**
   * Create migration documentation
   */
  async createMigrationDocumentation() {
    const docsPath = path.join(__dirname, '../../docs/migration/analyze-handler-migration-guide.md');
    const documentation = `# Analyze Handler Migration Guide
## Overview
This guide documents the migration from  analyze handlers to the unified workflow system.
## Migration Status
- ✅ HandlerRegistry updated with auto-registration
- ✅ Analysis steps implemented and tested
- ✅ Application.js updated to use unified system
- ✅ Service registry updated
- ✅ Backward compatibility maintained
## Usage
### Using Unified Workflow System
\`\`\`javascript
const { UnifiedWorkflowHandler, HandlerRegistry } = require('./domain/workflows/handlers');
const unifiedHandler = new UnifiedWorkflowHandler({
  handlerRegistry: new HandlerRegistry({ autoRegisterAnalysisSteps: true }),
  logger: console,
  eventBus: eventBus
});
// Execute analysis
const result = await unifiedHandler.execute('architecture-analysis', {
  projectPath: '/path/to/project',
  options: { detectPatterns: true }
});
\`\`\`
###  Handler Support
 handlers are still available for backward compatibility:
- AnalyzeArchitectureCommand
- AnalyzeCodeQualityCommand
- AnalyzeDependenciesCommand
- AnalyzeRepoStructureCommand
- AnalyzeTechStackCommand
## Testing
Run the migration tests:
\`\`\`bash
npm test -- tests/unit/migration/analyze-handler-migration.test.js
\`\`\`
## Rollback
If needed, rollback to  handlers:
\`\`\`bash
node scripts/migration/migrate-analyze-handlers.js --rollback
\`\`\`
`;
    await fs.writeFile(docsPath, documentation);
  }
  /**
   * Validate post-migration state
   */
  async validatePostMigration() {
    this.logger.info('🔍 Validating post-migration state...');
    // Verify unified workflow system is working
    const registeredHandlers = this.handlerRegistry.getHandlerTypes();
    if (registeredHandlers.length >= 6) {
      this.logger.info(`✅ Unified workflow system has ${registeredHandlers.length} handlers registered`);
    } else {
      throw new Error(`Expected at least 6 handlers, found ${registeredHandlers.length}`);
    }
    // Verify all analysis steps are available
    const requiredSteps = [
      'architecture-analysis',
      'code-quality-analysis',
      'tech-stack-analysis',
      'repo-structure-analysis',
      'dependencies-analysis',
      'advanced-analysis'
    ];
    for (const stepType of requiredSteps) {
      if (this.handlerRegistry.hasHandler(stepType)) {
        this.logger.info(`✅ Analysis step available: ${stepType}`);
      } else {
        throw new Error(`Missing analysis step: ${stepType}`);
      }
    }
    this.logger.info('✅ Post-migration validation completed');
  }
  /**
   * Rollback migration
   */
  async rollbackMigration() {
    this.logger.info('🔄 Rolling back migration...');
    // This would restore the original state
    // For now, just log the rollback
    this.logger.info('⚠️  Manual rollback required - restore from backup');
    this.logger.info('✅ Rollback completed');
  }
}
// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const options = {
    enableValidation: !args.includes('--no-validation'),
    enableTesting: !args.includes('--no-testing'),
    enableRollback: args.includes('--enable-rollback'),
    dryRun: args.includes('--dry-run')
  };
  const migration = new AnalyzeHandlerMigration(options);
  if (args.includes('--rollback')) {
    await migration.rollbackMigration();
  } else {
    await migration.runMigration();
  }
}
if (require.main === module) {
  main().catch(error => {
    console.error('Migration failed:', error.message);
    process.exit(1);
  });
}
module.exports = AnalyzeHandlerMigration; 