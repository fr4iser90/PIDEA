#!/usr/bin/env node

/**
 * Migration Execution Script
 * 
 * Command-line tool for executing migrations with proper configuration,
 * validation, monitoring, and error handling.
 * 
 * Usage:
 *   node start-migration.js <migration-id> [options]
 *   node start-migration.js --config <config-file> [options]
 *   node start-migration.js --interactive [options]
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
  MigrationConfigBuilder,
  MigrationUtils
} = require('../../backend/domain/workflows/migration');

// Import repository
const MigrationRepository = require('../../backend/infrastructure/database/repositories/MigrationRepository');

// Configuration
const DEFAULT_CONFIG = {
  enableRollback: true,
  enableValidation: true,
  enableMetrics: true,
  maxConcurrentMigrations: 5,
  timeoutSeconds: 300,
  enableHistory: true,
  maxHistorySize: 1000,
  enableRealTimeUpdates: true,
  enableAutomaticRollback: true,
  enableBackup: true,
  backupRetentionDays: 30,
  enableStrictValidation: true,
  enableSchemaValidation: true,
  enableDataIntegrity: true,
  enableRealTimeMetrics: true,
  enableResourceTracking: true,
  enablePerformanceAlerts: true
};

class MigrationExecutor {
  constructor() {
    this.infrastructure = null;
    this.repository = null;
    this.spinner = null;
    this.config = { ...DEFAULT_CONFIG };
  }

  /**
   * Initialize migration infrastructure
   */
  async initialize() {
    try {
      console.log(chalk.blue('🔧 Initializing migration infrastructure...'));
      
      // Create migration infrastructure
      this.infrastructure = await MigrationInfrastructureFactory.create({
        manager: {
          enableRollback: this.config.enableRollback,
          enableValidation: this.config.enableValidation,
          enableMetrics: this.config.enableMetrics,
          maxConcurrentMigrations: this.config.maxConcurrentMigrations,
          timeoutSeconds: this.config.timeoutSeconds
        },
        tracker: {
          enableHistory: this.config.enableHistory,
          maxHistorySize: this.config.maxHistorySize,
          enableRealTimeUpdates: this.config.enableRealTimeUpdates
        },
        rollback: {
          enableAutomaticRollback: this.config.enableAutomaticRollback,
          enableBackup: this.config.enableBackup,
          backupRetentionDays: this.config.backupRetentionDays
        },
        validator: {
          enableStrictValidation: this.config.enableStrictValidation,
          enableSchemaValidation: this.config.enableSchemaValidation,
          enableDataIntegrity: this.config.enableDataIntegrity
        },
        metrics: {
          enableRealTimeMetrics: this.config.enableRealTimeMetrics,
          enableResourceTracking: this.config.enableResourceTracking,
          enablePerformanceAlerts: this.config.enablePerformanceAlerts
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

      console.log(chalk.green('✅ Migration infrastructure initialized successfully'));
      return true;

    } catch (error) {
      console.error(chalk.red('❌ Failed to initialize migration infrastructure:'), error.message);
      return false;
    }
  }

  /**
   * Load configuration from file
   */
  loadConfig(configPath) {
    try {
      const configFile = path.resolve(configPath);
      if (!fs.existsSync(configFile)) {
        throw new Error(`Configuration file not found: ${configFile}`);
      }

      const configData = fs.readFileSync(configFile, 'utf8');
      const fileConfig = JSON.parse(configData);
      
      this.config = { ...this.config, ...fileConfig };
      console.log(chalk.blue(`📁 Configuration loaded from: ${configFile}`));
      
    } catch (error) {
      console.error(chalk.red('❌ Failed to load configuration:'), error.message);
      process.exit(1);
    }
  }

  /**
   * Execute migration by ID
   */
  async executeMigrationById(migrationId, options = {}) {
    try {
      this.spinner = ora(`Executing migration: ${migrationId}`).start();

      // Get migration details
      const migration = await this.repository.getMigrationById(migrationId);
      if (!migration) {
        this.spinner.fail(`Migration not found: ${migrationId}`);
        return false;
      }

      // Validate migration
      const validation = MigrationUtils.validateConfig(migration);
      if (!validation.valid) {
        this.spinner.fail(`Migration validation failed: ${validation.errors.join(', ')}`);
        return false;
      }

      // Execute migration
      const result = await this.infrastructure.executeMigration(migrationId, options);

      if (result.success) {
        this.spinner.succeed(`Migration completed successfully: ${migrationId}`);
        this.displayMigrationReport(result);
        return true;
      } else {
        this.spinner.fail(`Migration failed: ${migrationId}`);
        this.displayMigrationReport(result);
        return false;
      }

    } catch (error) {
      this.spinner.fail(`Migration execution error: ${error.message}`);
      return false;
    }
  }

  /**
   * Execute migration from configuration
   */
  async executeMigrationFromConfig(config, options = {}) {
    try {
      this.spinner = ora('Executing migration from configuration').start();

      // Validate configuration
      const validation = MigrationUtils.validateConfig(config);
      if (!validation.valid) {
        this.spinner.fail(`Configuration validation failed: ${validation.errors.join(', ')}`);
        return false;
      }

      // Execute migration
      const result = await this.infrastructure.executeMigration(config, options);

      if (result.success) {
        this.spinner.succeed('Migration completed successfully');
        this.displayMigrationReport(result);
        return true;
      } else {
        this.spinner.fail('Migration failed');
        this.displayMigrationReport(result);
        return false;
      }

    } catch (error) {
      this.spinner.fail(`Migration execution error: ${error.message}`);
      return false;
    }
  }

  /**
   * Interactive migration execution
   */
  async executeInteractive() {
    try {
      console.log(chalk.blue('🤖 Interactive migration mode'));
      
      // Get available migrations
      const migrations = await this.repository.getMigrationsByStatus('pending');
      
      if (migrations.length === 0) {
        console.log(chalk.yellow('⚠️  No pending migrations found'));
        return false;
      }

      // Select migration
      const { selectedMigration } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedMigration',
          message: 'Select migration to execute:',
          choices: migrations.map(m => ({
            name: `${m.name} (${m.id})`,
            value: m.id
          }))
        }
      ]);

      // Confirm execution
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: `Execute migration: ${selectedMigration}?`,
          default: false
        }
      ]);

      if (!confirm) {
        console.log(chalk.yellow('Migration cancelled'));
        return false;
      }

      // Execute migration
      return await this.executeMigrationById(selectedMigration);

    } catch (error) {
      console.error(chalk.red('❌ Interactive execution error:'), error.message);
      return false;
    }
  }

  /**
   * Display migration report
   */
  displayMigrationReport(result) {
    console.log('\n' + chalk.blue('📊 Migration Report'));
    console.log('─'.repeat(50));
    
    if (result.success) {
      console.log(chalk.green(`✅ Status: ${result.status}`));
      console.log(chalk.green(`⏱️  Duration: ${result.duration}ms`));
      console.log(chalk.green(`📈 Progress: ${result.progress}%`));
    } else {
      console.log(chalk.red(`❌ Status: ${result.status}`));
      console.log(chalk.red(`⏱️  Duration: ${result.duration}ms`));
      console.log(chalk.red(`📈 Progress: ${result.progress}%`));
    }

    if (result.phases) {
      console.log('\n📋 Phases:');
      result.phases.forEach(phase => {
        const status = phase.status === 'completed' ? '✅' : phase.status === 'failed' ? '❌' : '⏳';
        console.log(`  ${status} ${phase.name}: ${phase.status}`);
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
   * Monitor migration progress
   */
  async monitorMigration(migrationId) {
    try {
      console.log(chalk.blue(`📡 Monitoring migration: ${migrationId}`));
      
      const checkStatus = async () => {
        const status = await this.infrastructure.getMigrationStatus(migrationId);
        
        if (status.status === 'completed') {
          console.log(chalk.green(`✅ Migration completed: ${migrationId}`));
          return true;
        } else if (status.status === 'failed') {
          console.log(chalk.red(`❌ Migration failed: ${migrationId}`));
          return true;
        } else {
          console.log(chalk.blue(`⏳ Migration in progress: ${status.progress}%`));
          return false;
        }
      };

      // Check status every 5 seconds
      const interval = setInterval(async () => {
        const completed = await checkStatus();
        if (completed) {
          clearInterval(interval);
        }
      }, 5000);

      // Initial check
      await checkStatus();

    } catch (error) {
      console.error(chalk.red('❌ Monitoring error:'), error.message);
    }
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
  .name('start-migration')
  .description('Execute migrations with full monitoring and validation')
  .version('1.0.0');

program
  .command('execute <migration-id>')
  .description('Execute a specific migration by ID')
  .option('-c, --config <path>', 'Configuration file path')
  .option('-m, --monitor', 'Monitor migration progress')
  .option('-v, --verbose', 'Verbose output')
  .action(async (migrationId, options) => {
    const executor = new MigrationExecutor();
    
    if (options.config) {
      executor.loadConfig(options.config);
    }

    const initialized = await executor.initialize();
    if (!initialized) {
      process.exit(1);
    }

    const success = await executor.executeMigrationById(migrationId, options);
    
    if (options.monitor && success) {
      await executor.monitorMigration(migrationId);
    }

    await executor.cleanup();
    process.exit(success ? 0 : 1);
  });

program
  .command('config <config-file>')
  .description('Execute migration from configuration file')
  .option('-m, --monitor', 'Monitor migration progress')
  .option('-v, --verbose', 'Verbose output')
  .action(async (configFile, options) => {
    const executor = new MigrationExecutor();
    executor.loadConfig(configFile);

    const initialized = await executor.initialize();
    if (!initialized) {
      process.exit(1);
    }

    const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
    const success = await executor.executeMigrationFromConfig(config, options);

    await executor.cleanup();
    process.exit(success ? 0 : 1);
  });

program
  .command('interactive')
  .description('Interactive migration execution')
  .option('-c, --config <path>', 'Configuration file path')
  .action(async (options) => {
    const executor = new MigrationExecutor();
    
    if (options.config) {
      executor.loadConfig(options.config);
    }

    const initialized = await executor.initialize();
    if (!initialized) {
      process.exit(1);
    }

    const success = await executor.executeInteractive();
    await executor.cleanup();
    process.exit(success ? 0 : 1);
  });

program
  .command('monitor <migration-id>')
  .description('Monitor migration progress')
  .action(async (migrationId) => {
    const executor = new MigrationExecutor();
    
    const initialized = await executor.initialize();
    if (!initialized) {
      process.exit(1);
    }

    await executor.monitorMigration(migrationId);
    await executor.cleanup();
  });

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('❌ Unhandled Rejection at:'), promise, chalk.red('reason:'), reason);
  process.exit(1);
});

process.on('SIGINT', async () => {
  console.log(chalk.yellow('\n⚠️  Migration interrupted by user'));
  process.exit(0);
});

// Parse command line arguments
if (require.main === module) {
  program.parse();
} 