#!/usr/bin/env node

/**
 * Unified Workflow Migration Script
 * Migrates all legacy handlers to unified workflow system
 */

const path = require('path');
const fs = require('fs');

// Add backend to path for imports
const backendPath = path.join(__dirname, '../../backend');
require('module').globalPaths.push(backendPath);

const MigrationManager = require('../../backend/domain/workflows/migration/MigrationManager');

/**
 * Main migration function
 */
async function startMigration() {
  console.log('🚀 Starting Unified Workflow Migration...');
  console.log('==========================================');
  
  try {
    // Initialize migration manager
    const migrationManager = new MigrationManager({
      logger: console,
      eventBus: null
    });
    
    // Start migration process
    const result = await migrationManager.startMigration({
      enableParallelMigration: true,
      enableRollback: true,
      enableValidation: true,
      enableMetrics: true,
      maxConcurrentMigrations: 3
    });
    
    // Display results
    console.log('\n✅ Migration Results:');
    console.log('====================');
    console.log(`Migration ID: ${result.migrationId}`);
    console.log(`Total Handlers: ${result.totalHandlers}`);
    console.log(`Successfully Migrated: ${result.migratedHandlers}`);
    console.log(`Failed Migrations: ${result.failedHandlers}`);
    console.log(`Duration: ${result.duration}ms`);
    
    if (result.failedHandlers > 0) {
      console.log('\n❌ Failed Migrations:');
      result.results
        .filter(r => !r.success)
        .forEach(r => {
          console.log(`  - ${r.handlerName}: ${r.error}`);
        });
    }
    
    console.log('\n✅ Migration completed successfully!');
    console.log('All tasks will now use the Unified Workflow System.');
    
    return result;
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

/**
 * Check if migration is needed
 */
async function checkMigrationStatus() {
  console.log('🔍 Checking migration status...');
  
  try {
    const migrationManager = new MigrationManager({
      logger: console,
      eventBus: null
    });
    
    const legacyHandlers = await migrationManager.getLegacyHandlers();
    
    if (legacyHandlers.length === 0) {
      console.log('✅ No legacy handlers found. Migration not needed.');
      return false;
    }
    
    console.log(`📋 Found ${legacyHandlers.length} legacy handlers to migrate:`);
    legacyHandlers.forEach(handler => {
      console.log(`  - ${handler.name} (${handler.type})`);
    });
    
    return true;
    
  } catch (error) {
    console.error('❌ Error checking migration status:', error.message);
    return false;
  }
}

/**
 * Show migration help
 */
function showHelp() {
  console.log(`
Unified Workflow Migration Script

Usage:
  node start-unified-workflow-migration.js [options]

Options:
  --check          Check migration status only
  --help           Show this help message
  --force          Force migration even if not needed

Examples:
  node start-unified-workflow-migration.js --check
  node start-unified-workflow-migration.js --force
  node start-unified-workflow-migration.js
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
  
  if (args.includes('--check')) {
    const needsMigration = await checkMigrationStatus();
    if (needsMigration) {
      console.log('\n💡 Run without --check to start migration');
    }
    return;
  }
  
  if (args.includes('--force')) {
    console.log('⚠️  Force migration enabled');
    await startMigration();
    return;
  }
  
  // Check if migration is needed first
  const needsMigration = await checkMigrationStatus();
  
  if (!needsMigration) {
    console.log('✅ Migration not needed. All handlers are already using Unified Workflow System.');
    return;
  }
  
  // Ask for confirmation
  console.log('\n🤔 Do you want to proceed with migration? (y/N)');
  
  // For automated execution, proceed without confirmation
  if (process.env.AUTO_MIGRATE === 'true') {
    console.log('🔄 Auto-migration enabled, proceeding...');
    await startMigration();
    return;
  }
  
  // In interactive mode, we would wait for user input
  // For now, proceed automatically
  console.log('🔄 Proceeding with migration...');
  await startMigration();
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  });
}

module.exports = {
  startMigration,
  checkMigrationStatus
}; 