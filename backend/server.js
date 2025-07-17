
require('module-alias/register');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const Application = require('./Application');
const ServiceLogger = require('@logging/ServiceLogger');
const logger = new ServiceLogger('Server');

function getParam(n, dbType) {
  return dbType === 'postgresql' ? `$${n}` : '?';
}

async function ensureDefaultUser() {
  try {
    logger.info('👤 Ensuring default user exists...');
    
    // Use the same configuration as the main application
    const AutoSecurityManager = require('./infrastructure/auto/AutoSecurityManager');
    const DatabaseConnection = require('./infrastructure/database/DatabaseConnection');
    const createDefaultUser = require('./scripts/create-default-user');
    
    const autoSecurityManager = new AutoSecurityManager();
    const dbConfig = autoSecurityManager.getDatabaseConfig();
    
    logger.info('🔧 Database config:', JSON.stringify(dbConfig, null, 2));
    
    const databaseConnection = new DatabaseConnection(dbConfig);
    await databaseConnection.connect();
    
    const dbType = databaseConnection.getType();
    
    // Check if user exists
    const checkResult = await databaseConnection.query(
      `SELECT id, email, username FROM users WHERE id = ${getParam(1, dbType)}`,
      ['me']
    );
    
    if (checkResult && checkResult.length > 0) {
      logger.info('✅ Default user already exists');
      await databaseConnection.disconnect();
      return;
    }
    
    // Create default user
    await createDefaultUser();
    await databaseConnection.disconnect();
    
  } catch (error) {
    logger.error('❌ Error ensuring default user:', error.message);
    // Don't exit, just log the error and continue
    logger.warn('⚠️ Continuing without default user...');
  }
}

async function main() {
  // Ensure default user exists before starting application
  await ensureDefaultUser();
  
  const centralizedConfig = require('./config/centralized-config');
  
  // Validate configuration before starting
  const validation = centralizedConfig.validate();
  if (!validation.isValid) {
    logger.error('❌ Configuration validation failed:');
    validation.errors.forEach(error => logger.error(`  - ${error}`));
    process.exit(1);
  }
  
  if (validation.warnings.length > 0) {
    logger.warn('⚠️ Configuration warnings:');
    validation.warnings.forEach(warning => logger.warn(`  - ${warning}`));
  }

  const app = new Application({
    port: centralizedConfig.backendPort
  });

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down gracefully...');
    await app.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully...');
    await app.stop();
    process.exit(0);
  });

  try {
    await app.start();
  } catch (error) {
    logger.error('Failed to start application:', error);
    process.exit(1);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = { Application, main }; 