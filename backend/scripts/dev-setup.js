#!/usr/bin/env node

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
    console.log('🚀 PIDEA Development Setup');
    console.log('==========================');
    console.log('1. 📊 Database Management');
    console.log('2. 👤 User Management');
    console.log('3. 🔧 Service Management');
    console.log('4. 🛠️  Quick Setup (All-in-one)');
    console.log('5. 📋 Status Check');
    console.log('0. ❌ Exit');
    console.log('');

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
        console.log('👋 Goodbye!');
        this.rl.close();
        process.exit(0);
        break;
      default:
        console.log('❌ Invalid option. Please try again.');
        await this.waitAndReturn();
    }
  }

  async databaseMenu() {
    console.clear();
    console.log('📊 Database Management');
    console.log('=====================');
    console.log('1. 🔄 Reset Database');
    console.log('2. 🗑️  Clear All Data');
    console.log('3. 📋 Show Database Info');
    console.log('0. ⬅️  Back to Main Menu');
    console.log('');

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
        console.log('❌ Invalid option.');
    }
    
    await this.waitAndReturn();
    await this.databaseMenu();
  }

  async userMenu() {
    console.clear();
    console.log('👤 User Management');
    console.log('==================');
    console.log('1. ➕ Create Test User');
    console.log('2. ➕ Create Custom User');
    console.log('3. 🗑️  Clear All Users');
    console.log('4. 📋 List Users');
    console.log('0. ⬅️  Back to Main Menu');
    console.log('');

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
        console.log('❌ Invalid option.');
    }
    
    await this.waitAndReturn();
    await this.userMenu();
  }

  async serviceMenu() {
    console.clear();
    console.log('🔧 Service Management');
    console.log('====================');
    console.log('1. 🚀 Start Backend');
    console.log('2. 🚀 Start Frontend');
    console.log('3. 🚀 Start Both Services');
    console.log('4. 🛑 Stop All Services');
    console.log('5. 🔄 Restart Backend');
    console.log('0. ⬅️  Back to Main Menu');
    console.log('');

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
        console.log('❌ Invalid option.');
    }
    
    await this.waitAndReturn();
    await this.serviceMenu();
  }

  async resetDatabase() {
    console.log('🔄 Resetting database...');
    try {
      const { execSync } = require('child_process');
      execSync('node scripts/reset-database.js', { stdio: 'inherit' });
      console.log('✅ Database reset successful!');
    } catch (error) {
      console.error('❌ Database reset failed:', error.message);
    }
  }

  async clearDatabase() {
    console.log('🗑️ Clearing all data...');
    try {
      const { execSync } = require('child_process');
      execSync('node scripts/clean-invalid-users.js', { stdio: 'inherit' });
      console.log('✅ All data cleared!');
    } catch (error) {
      console.error('❌ Clear failed:', error.message);
    }
  }

  async showDatabaseInfo() {
    const dbPath = path.join(__dirname, '../database/PIDEA-dev.db');
    if (fs.existsSync(dbPath)) {
      const stats = fs.statSync(dbPath);
      console.log('📊 Database Info:');
      console.log(`📁 Path: ${dbPath}`);
      console.log(`📏 Size: ${(stats.size / 1024).toFixed(2)} KB`);
      console.log(`📅 Modified: ${stats.mtime.toLocaleString()}`);
    } else {
      console.log('❌ Database file not found');
    }
  }

  async createTestUser() {
    console.log('👤 Creating test user...');
    try {
      const { execSync } = require('child_process');
      execSync('node scripts/create-test-user.js', { stdio: 'inherit' });
    } catch (error) {
      console.error('❌ Failed to create test user:', error.message);
    }
  }

  async createCustomUser() {
    console.log('👤 Create Custom User');
    console.log('====================');
    
    const email = await this.question('Email: ');
    const password = await this.question('Password: ');
    const username = await this.question('Username (optional): ');
    
    if (!email || !password) {
      console.log('❌ Email and password are required!');
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
            console.error('❌ Error creating user:', err.message);
            reject(err);
          } else {
            console.log('✅ User created successfully!');
            console.log(`📧 Email: ${email}`);
            console.log(`🔑 Password: ${password}`);
            if (username) console.log(`👤 Username: ${username}`);
            resolve();
          }
        });
      });

      db.close();
    } catch (error) {
      console.error('❌ Failed to create user:', error.message);
    }
  }

  async clearUsers() {
    console.log('🗑️ Clearing all users...');
    try {
      const { execSync } = require('child_process');
      execSync('node scripts/clean-invalid-users.js', { stdio: 'inherit' });
      console.log('✅ All users cleared!');
    } catch (error) {
      console.error('❌ Clear failed:', error.message);
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
          console.error('❌ Error listing users:', err.message);
        } else {
          console.log('📋 Users:');
          console.log('ID'.padEnd(38) + 'Email'.padEnd(25) + 'Role'.padEnd(10) + 'Created');
          console.log('-'.repeat(80));
          
          rows.forEach(row => {
            const id = row.id.substring(0, 8) + '...';
            const email = row.email.padEnd(25);
            const role = row.role.padEnd(10);
            const created = new Date(row.created_at).toLocaleDateString();
            console.log(`${id} ${email} ${role} ${created}`);
          });
          
          console.log(`\nTotal users: ${rows.length}`);
        }
        db.close();
      });
    } catch (error) {
      console.error('❌ Failed to list users:', error.message);
    }
  }

  async startBackend() {
    console.log('🚀 Starting backend...');
    console.log('💡 Press Ctrl+C to stop');
    
    const backendProcess = spawn('npm', ['run', 'dev:backend'], {
      cwd: this.projectRoot,
      stdio: 'inherit',
      shell: true
    });

    backendProcess.on('error', (error) => {
      console.error('❌ Failed to start backend:', error.message);
    });
  }

  async startFrontend() {
    console.log('🚀 Starting frontend...');
    console.log('💡 Press Ctrl+C to stop');
    
    const frontendProcess = spawn('npm', ['run', 'dev:frontend'], {
      cwd: this.projectRoot,
      stdio: 'inherit',
      shell: true
    });

    frontendProcess.on('error', (error) => {
      console.error('❌ Failed to start frontend:', error.message);
    });
  }

  async startBothServices() {
    console.log('🚀 Starting both services...');
    console.log('💡 Press Ctrl+C to stop');
    
    const bothProcess = spawn('npm', ['run', 'dev'], {
      cwd: this.projectRoot,
      stdio: 'inherit',
      shell: true
    });

    bothProcess.on('error', (error) => {
      console.error('❌ Failed to start services:', error.message);
    });
  }

  async stopServices() {
    console.log('🛑 Stopping services...');
    try {
      const { execSync } = require('child_process');
      execSync('pkill -f "node.*start"', { stdio: 'inherit' });
      execSync('pkill -f "npm.*dev"', { stdio: 'inherit' });
      console.log('✅ Services stopped!');
    } catch (error) {
      console.log('ℹ️ No services were running or already stopped');
    }
  }

  async restartBackend() {
    console.log('🔄 Restarting backend...');
    await this.stopServices();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await this.startBackend();
  }

  async quickSetup() {
    console.log('🛠️ Quick Setup - All-in-one');
    console.log('==========================');
    console.log('This will:');
    console.log('1. Reset the database');
    console.log('2. Create a test user');
    console.log('3. Show status');
    console.log('');
    
    const confirm = await this.question('Continue? (y/N): ');
    if (confirm.toLowerCase() !== 'y') {
      await this.showMenu();
      return;
    }

    console.log('🔄 Resetting database...');
    await this.resetDatabase();
    
    console.log('👤 Creating test user...');
    await this.createTestUser();
    
    console.log('📋 Checking status...');
    await this.statusCheck();
    
    console.log('✅ Quick setup completed!');
    await this.waitAndReturn();
    await this.showMenu();
  }

  async statusCheck() {
    console.log('📋 System Status');
    console.log('===============');
    
    // Check database
    const dbPath = path.join(__dirname, '../database/PIDEA-dev.db');
    if (fs.existsSync(dbPath)) {
      const stats = fs.statSync(dbPath);
      console.log(`✅ Database: ${(stats.size / 1024).toFixed(2)} KB`);
    } else {
      console.log('❌ Database: Not found');
    }
    
    // Check users
    try {
      const sqlite3 = require('sqlite3').verbose();
      const db = new sqlite3.Database(dbPath);
      
      db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
        if (err) {
          console.log('❌ Users: Error checking');
        } else {
          console.log(`✅ Users: ${row.count} registered`);
        }
        db.close();
      });
    } catch (error) {
      console.log('❌ Users: Error checking');
    }
    
    // Check ports
    const { execSync } = require('child_process');
    try {
      const backendPort = execSync('lsof -i :3000', { encoding: 'utf8' });
      console.log('✅ Backend: Running on port 3000');
    } catch {
      console.log('❌ Backend: Not running');
    }
    
    try {
      const frontendPort = execSync('lsof -i :4005', { encoding: 'utf8' });
      console.log('✅ Frontend: Running on port 4005');
    } catch {
      console.log('❌ Frontend: Not running');
    }
  }

  async waitAndReturn() {
    console.log('');
    await this.question('Press Enter to continue...');
  }

  async run() {
    console.log('🚀 PIDEA Development Setup');
    console.log('==========================');
    console.log('Welcome to the PIDEA development setup!');
    console.log('');
    
    await this.showMenu();
  }
}

// Run the setup
const setup = new DevSetup();
setup.run().catch(console.error); 