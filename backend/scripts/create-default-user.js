require('module-alias/register');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const bcrypt = require('bcryptjs');
const Logger = require('@logging/Logger');
const AutoSecurityManager = require('@infrastructure/auto/AutoSecurityManager');
const DatabaseConnection = require('@infrastructure/database/DatabaseConnection');
const logger = new Logger('CreateDefaultUser');

function getParam(n, dbType) {
  return dbType === 'postgresql' ? `$${n}` : '?';
}

async function createDefaultUser() {
  // Use the same configuration as the main application
  const autoSecurityManager = new AutoSecurityManager();
  const dbConfig = autoSecurityManager.getDatabaseConfig();

  logger.info('🔧 Database config:', JSON.stringify(dbConfig, null, 2));

  const databaseConnection = new DatabaseConnection(dbConfig);

  try {
    await databaseConnection.connect();
    logger.info('✅ Connected to database');

    const dbType = databaseConnection.getType();
    // Check if user already exists
    logger.info('🔍 Checking if user already exists...');
    const checkResult = await databaseConnection.query(
      `SELECT id, email, username FROM users WHERE id = ${getParam(1, dbType)}`,
      ['me']
    );

    logger.info('📊 Check result:', JSON.stringify(checkResult, null, 2));

    if (checkResult && checkResult.length > 0) {
      logger.info('✅ Default user already exists');
      return;
    }

    // Create default user
    const email = process.env.ADMIN_EMAIL || 'test@test.com';
    const password = process.env.ADMIN_PASSWORD || 'test123';
    const username = process.env.ADMIN_USERNAME || 'test';
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    const now = new Date().toISOString();

    logger.info('👤 Creating new default user...');
    logger.info('📝 User data:', {
      id: 'me',
      email: email,
      username: username,
      role: 'admin',
      status: 'active'
    });

    const insertSql = `
      INSERT INTO users (
        id, email, username, password_hash, role, status, created_at, updated_at, metadata
      ) VALUES (
        ${getParam(1, dbType)},
        ${getParam(2, dbType)},
        ${getParam(3, dbType)},
        ${getParam(4, dbType)},
        ${getParam(5, dbType)},
        ${getParam(6, dbType)},
        ${getParam(7, dbType)},
        ${getParam(8, dbType)},
        ${getParam(9, dbType)}
      )
    `;

    const insertResult = await databaseConnection.execute(insertSql, [
      'me',
      email,
      username,
      passwordHash,
      'admin',
      'active',
      now,
      now,
      '{}'
    ]);

    logger.info('✅ Insert result:', JSON.stringify(insertResult, null, 2));

    // Verify user was created
    logger.info('🔍 Verifying user was created...');
    const verifyResult = await databaseConnection.query(
      `SELECT * FROM users WHERE id = ${getParam(1, dbType)}`,
      ['me']
    );

    logger.info('✅ Verification result (full user row):', JSON.stringify(verifyResult, null, 2));

    logger.info('✅ Default user created successfully!');
    logger.info('📧 Email: ' + email);
    logger.info('🔑 Password: ' + password);
    logger.info('🆔 User ID: me');

  } catch (error) {
    logger.error('❌ Error creating default user:', error.message);
    logger.error('❌ Error stack:', error.stack);
    throw error;
  } finally {
    // Only disconnect if this script is run directly (not from main app)
    if (require.main === module) {
      await databaseConnection.disconnect();
    }
  }
}

// Run if called directly
if (require.main === module) {
  createDefaultUser()
    .then(() => {
      logger.info('✅ Default user setup completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('❌ Default user setup failed:', error.message);
      process.exit(1);
    });
}

module.exports = createDefaultUser; 