
require('module-alias/register');
const Application = require('./Application');
const ServiceLogger = require('@logging/ServiceLogger');
const logger = new ServiceLogger('Server');

// Import your existing script
const createTestUser = require('./scripts/create-test-user');

async function ensureTestUser() {
  try {
    // First, initialize the database connection to create tables
    const DatabaseConnection = require('./infrastructure/database/DatabaseConnection');
    const AutoSecurityManager = require('./infrastructure/auto/AutoSecurityManager');
    
    const autoSecurityManager = new AutoSecurityManager();
    const securityConfig = autoSecurityManager.getConfig();
    
    const dbConnection = new DatabaseConnection(securityConfig.database);
    await dbConnection.connect();
    
    // Now check if users exist
    const sqlite3 = require('sqlite3').verbose();
    const path = require('path');
    const dbPath = path.join(__dirname, 'database/pidea-dev.db');
    
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          logger.error('❌ Error opening database:', err.message);
          reject(err);
          return;
        }
        
        db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
          if (err) {
            logger.error('❌ Error checking users:', err.message);
            db.close();
            reject(err);
            return;
          }
          
          if (row.count > 0) {
            logger.info('✅ Users already exist in database');
            db.close();
            resolve();
          } else {
            logger.info('👤 No users found, creating test user...');
            db.close();
            // Use your existing script
            createTestUser().then(resolve).catch(reject);
          }
        });
      });
    });
  } catch (error) {
    logger.error('❌ Error ensuring test user:', error.message);
    throw error;
  }
}

async function main() {
  // Ensure test user exists before starting application
  try {
    await ensureTestUser();
  } catch (error) {
    logger.error('❌ Failed to ensure test user:', error.message);
    process.exit(1);
  }
  
  const app = new Application({
    port: process.env.PORT || 3000
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