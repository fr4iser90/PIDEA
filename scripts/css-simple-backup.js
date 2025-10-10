#!/usr/bin/env node

/**
 * Simple CSS Backup Script
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

class SimpleCSSBackup {
  createBackup(directory) {
    console.log('📦 Creating CSS backup...');
    
    if (!fs.existsSync(directory)) {
      console.error(`❌ Directory not found: ${directory}`);
      return false;
    }

    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const backupDir = path.join(process.cwd(), `css-backup-${timestamp}`);

    // Create backup directory
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const cssFiles = glob.sync('**/*.css', { 
      cwd: directory,
      ignore: ['node_modules/**', 'dist/**', 'build/**', 'coverage/**']
    });

    let backedUp = 0;
    let errors = 0;

    cssFiles.forEach(file => {
      try {
        const sourcePath = path.join(directory, file);
        const backupPath = path.join(backupDir, file);
        
        // Create directory structure in backup
        const backupDirPath = path.dirname(backupPath);
        if (!fs.existsSync(backupDirPath)) {
          fs.mkdirSync(backupDirPath, { recursive: true });
        }

        // Copy file
        fs.copyFileSync(sourcePath, backupPath);
        console.log(`  ✓ ${file}`);
        backedUp++;
      } catch (error) {
        console.error(`  ✗ Error backing up ${file}:`, error.message);
        errors++;
      }
    });

    console.log(`\n📊 Backup Summary:`);
    console.log(`Files backed up: ${backedUp}`);
    console.log(`Errors: ${errors}`);
    console.log(`Backup location: ${backupDir}`);
    
    return { success: errors === 0, backupDir };
  }

  restoreBackup(directory, backupDir) {
    console.log('🔄 Restoring CSS from backup...');
    
    if (!fs.existsSync(backupDir)) {
      console.error(`❌ Backup directory not found: ${backupDir}`);
      return false;
    }

    const cssFiles = glob.sync('**/*.css', { 
      cwd: backupDir
    });

    let restored = 0;
    let errors = 0;

    cssFiles.forEach(file => {
      try {
        const sourcePath = path.join(backupDir, file);
        const targetPath = path.join(directory, file);
        
        // Create directory structure if needed
        const targetDir = path.dirname(targetPath);
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }

        // Restore file
        fs.copyFileSync(sourcePath, targetPath);
        console.log(`  ✓ ${file}`);
        restored++;
      } catch (error) {
        console.error(`  ✗ Error restoring ${file}:`, error.message);
        errors++;
      }
    });

    console.log(`\n📊 Restore Summary:`);
    console.log(`Files restored: ${restored}`);
    console.log(`Errors: ${errors}`);
    
    return errors === 0;
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  const directory = args[1] || './frontend/src/css';
  
  const backup = new SimpleCSSBackup();
  
  switch (command) {
    case 'create':
      backup.createBackup(directory);
      break;
    case 'restore':
      const backupDir = args[2];
      if (!backupDir) {
        console.error('❌ Please provide backup directory path');
        process.exit(1);
      }
      backup.restoreBackup(directory, backupDir);
      break;
    default:
      console.log('Usage:');
      console.log('  node css-simple-backup.js create [directory]');
      console.log('  node css-simple-backup.js restore [directory] [backup-dir]');
  }
}

module.exports = SimpleCSSBackup;
