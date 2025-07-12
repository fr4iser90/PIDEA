#!/usr/bin/env node

/**
 * Migration Rollback Script
 * 
 * Command-line tool for rolling back migrations with proper backup
 * restoration, validation, and safety checks.
 * 
 * Usage:
 *   node rollback-migration.js <migration-id> [options]
 *   node rollback-migration.js --list [options]
 *   node rollback-migration.js --interactive [options]
 */

const path = require('path');
const fs = require('fs');
const { program } = require('commander');
const chalk = require('chalk');
const ora = require('ora');
const inquirer = require('inquirer');

// Import migration infrastructure
const {
  MigrationInfrastructureFactory,
  MigrationUtils
} = require('../../backend/domain/workflows/migration');

// Import repository
const MigrationRepository = require('../../backend/infrastructure/database/repositories/MigrationRepository');

class MigrationRollbackExecutor {
  constructor() {
    this.infrastructure = null;
    this.repository = null;
    this.spinner = null;
  }

  /**
   * Initialize migration infrastructure
   */
  async initialize() {
    try {
      console.log(chalk.blue('🔧 Initializing rollback infrastructure...'));
      
      // Create migration infrastructure
      this.infrastructure = await MigrationInfrastructureFactory.create({
        rollback: {
          enableAutomaticRollback: true,
          enableBackup: true,
          backupRetentionDays: 30
        }
      });

      // Initialize repository
      this.repository = new MigrationRepository({
        databaseConfig: {
          host: process.env.DB_HOST || 'localhost',
          port: process.env.DB_PORT || 5432,
          database: process.env.DB_NAME || 'pidea',
          user: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD || 'password'
        }
      });
      await this.repository.initialize();

      console.log(chalk.green('✅ Rollback infrastructure initialized successfully'));
      return true;

    } catch (error) {
      console.error(chalk.red('❌ Failed to initialize rollback infrastructure:'), error.message);
      return false;
    }
  }

  /**
   * List available rollbacks
   */
  async listRollbacks() {
    try {
      console.log(chalk.blue('📋 Available Rollbacks'));
      console.log('─'.repeat(60));

      // Get completed migrations that can be rolled back
      const migrations = await this.repository.getMigrationsByStatus('completed');
      
      if (migrations.length === 0) {
        console.log(chalk.yellow('⚠️  No completed migrations found for rollback'));
        return;
      }

      console.log(chalk.white('ID'.padEnd(20) + 'Name'.padEnd(30) + 'Completed'.padEnd(20)));
      console.log('─'.repeat(60));

      migrations.forEach(migration => {
        const completedDate = migration.end_time ? 
          new Date(migration.end_time).toLocaleDateString() : 'Unknown';
        
        console.log(
          chalk.cyan(migration.migration_id.padEnd(20)) +
          chalk.white(migration.migration_name.padEnd(30)) +
          chalk.green(completedDate.padEnd(20))
        );
      });

      console.log('─'.repeat(60));
      console.log(chalk.blue(`Total: ${migrations.length} migrations available for rollback`));

    } catch (error) {
      console.error(chalk.red('❌ Failed to list rollbacks:'), error.message);
    }
  }

  /**
   * Execute rollback by migration ID
   */
  async executeRollback(migrationId, options = {}) {
    try {
      this.spinner = ora(`Preparing rollback for: ${migrationId}`).start();

      // Get migration details
      const migration = await this.repository.getMigrationById(migrationId);
      if (!migration) {
        this.spinner.fail(`Migration not found: ${migrationId}`);
        return false;
      }

      if (migration.status !== 'completed') {
        this.spinner.fail(`Migration is not completed: ${migration.status}`);
        return false;
      }

      // Check if backup exists
      const backupExists = await this.infrastructure.rollback.checkBackupExists(migrationId);
      if (!backupExists && !options.force) {
        this.spinner.fail(`No backup found for migration: ${migrationId}. Use --force to proceed without backup.`);
        return false;
      }

      this.spinner.text = `Executing rollback for: ${migrationId}`;

      // Execute rollback
      const result = await this.infrastructure.rollbackMigration(migrationId, {
        reason: options.reason || 'Manual rollback',
        force: options.force || false,
        restoreBackup: options.restoreBackup !== false
      });

      if (result.success) {
        this.spinner.succeed(`Rollback completed successfully: ${migrationId}`);
        this.displayRollbackReport(result);
        return true;
      } else {
        this.spinner.fail(`Rollback failed: ${migrationId}`);
        this.displayRollbackReport(result);
        return false;
      }

    } catch (error) {
      this.spinner.fail(`Rollback execution error: ${error.message}`);
      return false;
    }
  }

  /**
   * Interactive rollback execution
   */
  async executeInteractive() {
    try {
      console.log(chalk.blue('🤖 Interactive rollback mode'));
      
      // Get available migrations for rollback
      const migrations = await this.repository.getMigrationsByStatus('completed');
      
      if (migrations.length === 0) {
        console.log(chalk.yellow('⚠️  No completed migrations found for rollback'));
        return false;
      }

      // Select migration
      const { selectedMigration } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedMigration',
          message: 'Select migration to rollback:',
          choices: migrations.map(m => ({
            name: `${m.migration_name} (${m.migration_id}) - ${new Date(m.end_time).toLocaleDateString()}`,
            value: m.migration_id
          }))
        }
      ]);

      // Get rollback reason
      const { reason } = await inquirer.prompt([
        {
          type: 'input',
          name: 'reason',
          message: 'Rollback reason:',
          default: 'Manual rollback'
        }
      ]);

      // Confirm rollback
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: `Rollback migration: ${selectedMigration}?\nThis action cannot be undone!`,
          default: false
        }
      ]);

      if (!confirm) {
        console.log(chalk.yellow('Rollback cancelled'));
        return false;
      }

      // Execute rollback
      return await this.executeRollback(selectedMigration, { reason });

    } catch (error) {
      console.error(chalk.red('❌ Interactive rollback error:'), error.message);
      return false;
    }
  }

  /**
   * Display rollback report
   */
  displayRollbackReport(result) {
    console.log('\n' + chalk.blue('📊 Rollback Report'));
    console.log('─'.repeat(50));
    
    if (result.success) {
      console.log(chalk.green(`✅ Status: ${result.status}`));
      console.log(chalk.green(`⏱️  Duration: ${result.duration}ms`));
      console.log(chalk.green(`🔄 Rollback Type: ${result.rollbackType}`));
    } else {
      console.log(chalk.red(`❌ Status: ${result.status}`));
      console.log(chalk.red(`⏱️  Duration: ${result.duration}ms`));
      console.log(chalk.red(`🔄 Rollback Type: ${result.rollbackType}`));
    }

    if (result.backupRestored) {
      console.log(chalk.green('💾 Backup restored successfully'));
    }

    if (result.steps) {
      console.log('\n📋 Rollback Steps:');
      result.steps.forEach(step => {
        const status = step.status === 'completed' ? '✅' : step.status === 'failed' ? '❌' : '⏳';
        console.log(`  ${status} ${step.name}: ${step.status}`);
      });
    }

    if (result.errors && result.errors.length > 0) {
      console.log('\n❌ Errors:');
      result.errors.forEach(error => {
        console.log(`  • ${error}`);
      });
    }

    if (result.warnings && result.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      result.warnings.forEach(warning => {
        console.log(`  • ${warning}`);
      });
    }

    console.log('─'.repeat(50));
  }

  /**
   * Create backup for migration
   */
  async createBackup(migrationId) {
    try {
      this.spinner = ora(`Creating backup for: ${migrationId}`).start();

      const result = await this.infrastructure.rollback.createBackup(migrationId);

      if (result.success) {
        this.spinner.succeed(`Backup created successfully: ${migrationId}`);
        console.log(chalk.blue(`💾 Backup location: ${result.backupPath}`));
        return true;
      } else {
        this.spinner.fail(`Backup creation failed: ${migrationId}`);
        return false;
      }

    } catch (error) {
      this.spinner.fail(`Backup creation error: ${error.message}`);
      return false;
    }
  }

  /**
   * List available backups
   */
  async listBackups() {
    try {
      console.log(chalk.blue('💾 Available Backups'));
      console.log('─'.repeat(60));

      const backups = await this.infrastructure.rollback.listBackups();

      if (backups.length === 0) {
        console.log(chalk.yellow('⚠️  No backups found'));
        return;
      }

      console.log(chalk.white('Migration ID'.padEnd(20) + 'Created'.padEnd(20) + 'Size'.padEnd(15) + 'Status'));
      console.log('─'.repeat(60));

      backups.forEach(backup => {
        const createdDate = new Date(backup.createdAt).toLocaleDateString();
        const size = this.formatBytes(backup.size);
        const status = backup.valid ? chalk.green('Valid') : chalk.red('Invalid');
        
        console.log(
          chalk.cyan(backup.migrationId.padEnd(20)) +
          chalk.white(createdDate.padEnd(20)) +
          chalk.white(size.padEnd(15)) +
          status
        );
      });

      console.log('─'.repeat(60));

    } catch (error) {
      console.error(chalk.red('❌ Failed to list backups:'), error.message);
    }
  }

  /**
   * Format bytes to human readable format
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    try {
      if (this.infrastructure) {
        await this.infrastructure.cleanup();
      }
      if (this.repository) {
        await this.repository.cleanup();
      }
      console.log(chalk.blue('🧹 Cleanup completed'));
    } catch (error) {
      console.error(chalk.red('❌ Cleanup error:'), error.message);
    }
  }
}

// CLI Setup
program
  .name('rollback-migration')
  .description('Rollback migrations with backup restoration and validation')
  .version('1.0.0');

program
  .command('execute <migration-id>')
  .description('Rollback a specific migration by ID')
  .option('-r, --reason <reason>', 'Rollback reason')
  .option('-f, --force', 'Force rollback without backup')
  .option('--no-restore-backup', 'Skip backup restoration')
  .action(async (migrationId, options) => {
    const executor = new MigrationRollbackExecutor();
    
    const initialized = await executor.initialize();
    if (!initialized) {
      process.exit(1);
    }

    const success = await executor.executeRollback(migrationId, options);
    await executor.cleanup();
    process.exit(success ? 0 : 1);
  });

program
  .command('list')
  .description('List available rollbacks')
  .action(async () => {
    const executor = new MigrationRollbackExecutor();
    
    const initialized = await executor.initialize();
    if (!initialized) {
      process.exit(1);
    }

    await executor.listRollbacks();
    await executor.cleanup();
  });

program
  .command('interactive')
  .description('Interactive rollback execution')
  .action(async () => {
    const executor = new MigrationRollbackExecutor();
    
    const initialized = await executor.initialize();
    if (!initialized) {
      process.exit(1);
    }

    const success = await executor.executeInteractive();
    await executor.cleanup();
    process.exit(success ? 0 : 1);
  });

program
  .command('backup <migration-id>')
  .description('Create backup for migration')
  .action(async (migrationId) => {
    const executor = new MigrationRollbackExecutor();
    
    const initialized = await executor.initialize();
    if (!initialized) {
      process.exit(1);
    }

    const success = await executor.createBackup(migrationId);
    await executor.cleanup();
    process.exit(success ? 0 : 1);
  });

program
  .command('backups')
  .description('List available backups')
  .action(async () => {
    const executor = new MigrationRollbackExecutor();
    
    const initialized = await executor.initialize();
    if (!initialized) {
      process.exit(1);
    }

    await executor.listBackups();
    await executor.cleanup();
  });

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('❌ Unhandled Rejection at:'), promise, chalk.red('reason:'), reason);
  process.exit(1);
});

process.on('SIGINT', async () => {
  console.log(chalk.yellow('\n⚠️  Rollback interrupted by user'));
  process.exit(0);
});

// Parse command line arguments
if (require.main === module) {
  program.parse();
} 