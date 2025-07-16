
require('module-alias/register');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

// Use the same database path as the application
const dbPath = path.join(__dirname, '../database/pidea-dev.db');

logger.debug('👤 [CreateTestUser] Creating test user...');
logger.info(`📁 Database path: ${dbPath}`);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    logger.error('❌ Error opening database:', err.message);
    process.exit(1);
  }
  logger.info('✅ Database opened successfully');
});

async function createTestUser() {
  try {
    const userId = uuidv4();
    const email = 'test@test.com';
    const password = 'test123';
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    const now = new Date().toISOString();

    const insertSQL = `
      INSERT INTO users (
        id, email, username, password_hash, role, status, created_at, updated_at, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await new Promise((resolve, reject) => {
      db.run(insertSQL, [
        'me', // Single user ID
        email,
        'testuser', // Username
        passwordHash,
        'admin', // Role
        'active', // Status
        now,
        now,
        '{}'
      ], function(err) {
        if (err) {
          logger.error('❌ Error creating user:', err.message);
          reject(err);
        } else {
          logger.debug('✅ Test user created successfully!');
          logger.info(`📧 Email: ${email}`);
          logger.info(`🔑 Password: ${password}`);
          logger.info(`🆔 User ID: ${userId}`);
          resolve();
        }
      });
    });

  } catch (error) {
    logger.error('❌ Error creating test user:', error.message);
    process.exit(1);
  } finally {
    db.close();
  }
}

// Run if called directly
if (require.main === module) {
  createTestUser();
}

module.exports = createTestUser; 