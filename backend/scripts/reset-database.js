
const fs = require('fs');
const path = require('path');

/**
 * Professional Database Reset Script
 * Simply deletes the database file and lets the app recreate it automatically
 */

const dbPath = path.join(__dirname, '../database/PIDEA-dev.db');

console.log('🗑️  Resetting database...');

try {
  // Delete database file if it exists
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log('✅ Database file deleted');
  } else {
    console.log('ℹ️  Database file does not exist');
  }
  
  console.log('✅ Database reset complete!');
  console.log('💡 Start the application to automatically create a fresh database');
  
} catch (error) {
  console.error('❌ Error resetting database:', error.message);
  process.exit(1);
} 