require('module-alias/register');

const Logger = require('@logging/Logger');
const logger = new Logger('DevSetup');

const readline = require('readline');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class DevSetup {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    this.projectRoot = path.join(__dirname, '../..');
  }

  async question(prompt) {
    return new Promise((resolve) => {
      this.rl.question(prompt, resolve);
    });
  }

  async showMenu() {
    console.clear();
    logger.info('🚀 PIDEA Development Setup');
    logger.info('==========================');
    logger.info('1. 📊 Database Management');
    logger.info('2. 👤 User Management');
    logger.info('3. 🔧 Service Management');
    logger.info('4. 🛠️  Quick Setup (All-in-one)');
    logger.info('5. 📋 Status Check');
    logger.info('0. ❌ Exit');
    logger.info('');

    const choice = await this.question('Select an option: ');
    await this.handleMenuChoice(choice);
  }

  async handleMenuChoice(choice) {
    switch (choice.trim()) {
      case '1':
        await this.databaseMenu();
        break;
      case '2':
        await this.userMenu();
        break;
      case '3':
        await this.serviceMenu();
        break;
      case '4':
        await this.quickSetup();
        break;
      case '5':
        await this.statusCheck();
        break;
      case '0':
        logger.info('👋 Goodbye!');
        this.rl.close();
        process.exit(0);
        break;
      default:
        logger.info('❌ Invalid option. Please try again.');
        await this.waitAndReturn();
    }
  }

  async databaseMenu() {
    console.clear();
    logger.info('📊 Database Management');
    logger.info('=====================');
    logger.info('1. 🔄 Reset Database');
    logger.info('2. 🗑️  Clear All Data');
    logger.info('3. 📋 Show Database Info');
    logger.info('0. ⬅️  Back to Main Menu');
    logger.info('');

    const choice = await this.question('Select an option: ');
    
    switch (choice.trim()) {
      case '1':
        await this.resetDatabase();
        break;
      case '2':
        await this.clearDatabase();
        break;
      case '3':
        await this.showDatabaseInfo();
        break;
      case '0':
        await this.showMenu();
        return;
      default:
        logger.info('❌ Invalid option.');
    }
    
    await this.waitAndReturn();
    await this.databaseMenu();
  }

  async userMenu() {
    console.clear();
    logger.info('👤 User Management');
    logger.info('==================');
    logger.debug('1. ➕ Create Test User');
    logger.info('2. ➕ Create Custom User');
    logger.info('3. 🗑️  Clear All Users');
    logger.info('4. 📋 List Users');
    logger.info('0. ⬅️  Back to Main Menu');
    logger.info('');

    const choice = await this.question('Select an option: ');
    
    switch (choice.trim()) {
      case '1':
        await this.createTestUser();
        break;
      case '2':
        await this.createCustomUser();
        break;
      case '3':
        await this.clearUsers();
        break;
      case '4':
        await this.listUsers();
        break;
      case '0':
        await this.showMenu();
        return;
      default:
        logger.info('❌ Invalid option.');
    }
    
    await this.waitAndReturn();
    await this.userMenu();
  }

  async serviceMenu() {
    console.clear();
    logger.info('🔧 Service Management');
    logger.info('====================');
    logger.info('1. 🚀 Start Backend');
    logger.info('2. 🚀 Start Frontend');
    logger.info('3. 🚀 Start Both Services');
    logger.info('4. 🛑 Stop All Services');
    logger.info('5. 🔄 Restart Backend');
    logger.info('0. ⬅️  Back to Main Menu');
    logger.info('');

    const choice = await this.question('Select an option: ');
    
    switch (choice.trim()) {
      case '1':
        await this.startBackend();
        break;
      case '2':
        await this.startFrontend();
        break;
      case '3':
        await this.startBothServices();
        break;
      case '4':
        await this.stopServices();
        break;
      case '5':
        await this.restartBackend();
        break;
      case '0':
        await this.showMenu();
        return;
      default:
        logger.info('❌ Invalid option.');
    }
    
    await this.waitAndReturn();
    await this.serviceMenu();
  }

  async resetDatabase() {
    logger.info('🔄 Resetting database...');
    try {
      const { execSync } = require('child_process');
      execSync('node scripts/reset-database.js', { 
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
      });
      logger.info('✅ Database reset successful!');
    } catch (error) {
      logger.error('❌ Database reset failed:', error.message);
    }
  }

  async clearDatabase() {
    logger.info('🗑️ Clearing all data...');
    try {
      const { execSync } = require('child_process');
      execSync('node scripts/clean-invalid-users.js', { 
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
      });
      logger.info('✅ All data cleared!');
    } catch (error) {
      logger.error('❌ Clear failed:', error.message);
    }
  }

  async showDatabaseInfo() {
    const dbPath = path.join(__dirname, '../database/PIDEA-dev.db');
    if (fs.existsSync(dbPath)) {
      const stats = fs.statSync(dbPath);
      logger.info('📊 Database Info:');
      logger.info(`📁 Path: ${dbPath}`);
      logger.info(`📏 Size: ${(stats.size / 1024).toFixed(2)} KB`);
      logger.info(`📅 Modified: ${stats.mtime.toLocaleString()}`);
    } else {
      logger.info('❌ Database file not found');
    }
  }

  async createTestUser() {
    logger.debug('👤 Creating test user...');
    try {
      const { execSync } = require('child_process');
      execSync('node scripts/create-test-user.js', { 
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
      });
    } catch (error) {
      logger.error('❌ Failed to create test user:', error.message);
    }
  }

  async createCustomUser() {
    logger.info('👤 Create Custom User');
    logger.info('====================');
    
    const email = await this.question('Email: ');
    const password = await this.question('Password: ');
    const username = await this.question('Username (optional): ');
    
    if (!email || !password) {
      logger.info('❌ Email and password are required!');
      return;
    }

    try {
      const sqlite3 = require('sqlite3').verbose();
      const bcrypt = require('bcryptjs');
      const { v4: uuidv4 } = require('uuid');
      
      const dbPath = path.join(__dirname, '../database/PIDEA-dev.db');
      const db = new sqlite3.Database(dbPath);
      
      const userId = uuidv4();
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      const now = new Date().toISOString();

      const insertSQL = `
        INSERT INTO users (
          id, email, password_hash, role, created_at, updated_at, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      await new Promise((resolve, reject) => {
        db.run(insertSQL, [
          userId,
          email,
          passwordHash,
          'user',
          now,
          now,
          JSON.stringify({ username: username || null })
        ], function(err) {
          if (err) {
            logger.error('❌ Error creating user:', err.message);
            reject(err);
          } else {
            logger.info('✅ User created successfully!');
            logger.info(`📧 Email: ${email}`);
            logger.info(`🔑 Password: ${password}`);
            if (username) logger.info(`👤 Username: ${username}`);
            resolve();
          }
        });
      });

      db.close();
    } catch (error) {
      logger.error('❌ Failed to create user:', error.message);
    }
  }

  async clearUsers() {
    logger.info('🗑️ Clearing all users...');
    try {
      const { execSync } = require('child_process');
      execSync('node scripts/clean-invalid-users.js', { 
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
      });
      logger.info('✅ All users cleared!');
    } catch (error) {
      logger.error('❌ Clear failed:', error.message);
    }
  }

  async listUsers() {
    try {
      const sqlite3 = require('sqlite3').verbose();
      const dbPath = path.join(__dirname, '../database/PIDEA-dev.db');
      const db = new sqlite3.Database(dbPath);
      
      const sql = 'SELECT id, email, role, created_at FROM users ORDER BY created_at DESC';
      
      db.all(sql, [], (err, rows) => {
        if (err) {
          logger.error('❌ Error listing users:', err.message);
        } else {
          logger.info('📋 Users:');
          logger.info('ID'.padEnd(38) + 'Email'.padEnd(25) + 'Role'.padEnd(10) + 'Created');
          logger.info('-'.repeat(80));
          
          rows.forEach(row => {
            const id = row.id.substring(0, 8) + '...';
            const email = row.email.padEnd(25);
            const role = row.role.padEnd(10);
            const created = new Date(row.created_at).toLocaleDateString();
            logger.info(`${id} ${email} ${role} ${created}`);
          });
          
          logger.info(`\nTotal users: ${rows.length}`);
        }
        db.close();
      });
    } catch (error) {
      logger.error('❌ Failed to list users:', error.message);
    }
  }

  async startBackend() {
    logger.info('🚀 Starting backend...');
    logger.info('💡 Press Ctrl+C to stop');
    
    const backendProcess = spawn('npm', ['run', 'dev:backend'], {
      cwd: this.projectRoot,
      stdio: 'inherit',
      shell: true
    });

    backendProcess.on('error', (error) => {
      logger.error('❌ Failed to start backend:', error.message);
    });
  }

  async startFrontend() {
    logger.info('🚀 Starting frontend...');
    logger.info('💡 Press Ctrl+C to stop');
    
    const frontendProcess = spawn('npm', ['run', 'dev:frontend'], {
      cwd: this.projectRoot,
      stdio: 'inherit',
      shell: true
    });

    frontendProcess.on('error', (error) => {
      logger.error('❌ Failed to start frontend:', error.message);
    });
  }

  async startBothServices() {
    logger.info('🚀 Starting both services...');
    logger.info('💡 Press Ctrl+C to stop');
    
    const bothProcess = spawn('npm', ['run', 'dev'], {
      cwd: this.projectRoot,
      stdio: 'inherit',
      shell: true
    });

    bothProcess.on('error', (error) => {
      logger.error('❌ Failed to start services:', error.message);
    });
  }

  async stopServices() {
    logger.info('🛑 Stopping services...');
    try {
      const { execSync } = require('child_process');
      execSync('pkill -f "node.*start"', { stdio: 'inherit' });
      execSync('pkill -f "npm.*dev"', { stdio: 'inherit' });
      logger.info('✅ Services stopped!');
    } catch (error) {
      logger.info('ℹ️ No services were running or already stopped');
    }
  }

  async restartBackend() {
    logger.info('🔄 Restarting backend...');
    await this.stopServices();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await this.startBackend();
  }

  async quickSetup() {
    logger.info('🛠️ Quick Setup - All-in-one');
    logger.info('==========================');
    logger.info('This will:');
    logger.info('1. Reset the database');
    logger.debug('2. Create a test user');
    logger.info('3. Show status');
    logger.info('');
    
    const confirm = await this.question('Continue? (y/N): ');
    if (confirm.toLowerCase() !== 'y') {
      await this.showMenu();
      return;
    }

    logger.info('🔄 Resetting database...');
    await this.resetDatabase();
    
    logger.debug('👤 Creating test user...');
    await this.createTestUser();
    
    logger.info('📋 Checking status...');
    await this.statusCheck();
    
    logger.info('✅ Quick setup completed!');
    await this.waitAndReturn();
    await this.showMenu();
  }

  async statusCheck() {
    logger.info('📋 System Status');
    logger.info('===============');
    
    // Check database
    const dbPath = path.join(__dirname, '../database/PIDEA-dev.db');
    if (fs.existsSync(dbPath)) {
      const stats = fs.statSync(dbPath);
      logger.info(`✅ Database: ${(stats.size / 1024).toFixed(2)} KB`);
    } else {
      logger.info('❌ Database: Not found');
    }
    
    // Check users
    try {
      const sqlite3 = require('sqlite3').verbose();
      const db = new sqlite3.Database(dbPath);
      
      db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
        if (err) {
          logger.info('❌ Users: Error checking');
        } else {
          logger.info(`✅ Users: ${row.count} registered`);
        }
        db.close();
      });
    } catch (error) {
      logger.info('❌ Users: Error checking');
    }
    
    // Check ports
    const { execSync } = require('child_process');
    try {
      const backendPort = execSync('lsof -i :3000', { encoding: 'utf8' });
      logger.info('✅ Backend: Running on port 3000');
    } catch {
      logger.info('❌ Backend: Not running');
    }
    
    try {
      const frontendPort = execSync('lsof -i :4005', { encoding: 'utf8' });
      logger.info('✅ Frontend: Running on port 4005');
    } catch {
      logger.info('❌ Frontend: Not running');
    }
  }

  async waitAndReturn() {
    logger.info('');
    await this.question('Press Enter to continue...');
  }

  async run() {
    logger.info('🚀 PIDEA Development Setup');
    logger.info('==========================');
    logger.info('Welcome to the PIDEA development setup!');
    logger.info('');
    
    await this.showMenu();
  }
}

// Run the setup
const setup = new DevSetup();
setup.run().catch(logger.error); 