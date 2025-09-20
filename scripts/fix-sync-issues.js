#!/usr/bin/env node

/**
 * Fix Database-Filesystem Synchronization Issues
 * Moves folders based on database status
 */

const path = require('path');
const fs = require('fs').promises;
const sqlite3 = require('sqlite3').verbose();

const Logger = require('../backend/infrastructure/logging/Logger');
const logger = new Logger('FixSyncIssues');

async function fixSyncIssues() {
    try {
        logger.info('🔧 Fixing database-filesystem synchronization issues...');
        
        // Connect to database
        const dbPath = path.join(__dirname, '../backend/database/pidea-dev.db');
        const db = new sqlite3.Database(dbPath);
        
        // Get all completed tasks
        const completedTasks = await new Promise((resolve, reject) => {
            db.all(`
                SELECT id, title, status, category, priority, completed_at 
                FROM tasks 
                WHERE status = 'completed' AND completed_at IS NOT NULL
                ORDER BY completed_at DESC
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        logger.info(`📊 Found ${completedTasks.length} completed tasks in database`);
        
        const roadmapBasePath = path.join(__dirname, '../docs/09_roadmap');
        const moves = [];
        
        for (const task of completedTasks) {
            const taskName = task.title.toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^a-z0-9-]/g, '')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '');
            
            // Find the task folder in pending
            const pendingPath = path.join(roadmapBasePath, 'pending');
            const taskFolders = await findTaskFolders(pendingPath, taskName);
            
            if (taskFolders.length > 0) {
                for (const taskFolder of taskFolders) {
                    const relativePath = path.relative(pendingPath, taskFolder);
                    const targetPath = path.join(roadmapBasePath, 'completed', '2024-q4', relativePath);
                    
                    moves.push({
                        from: taskFolder,
                        to: targetPath,
                        task: taskName,
                        title: task.title
                    });
                }
            }
        }
        
        logger.info(`🔄 Found ${moves.length} folders to move`);
        
        // Create target directories and move folders
        for (const move of moves) {
            try {
                // Ensure target directory exists
                await fs.mkdir(path.dirname(move.to), { recursive: true });
                
                // Move the folder
                await fs.rename(move.from, move.to);
                logger.info(`✅ Moved: ${path.basename(move.from)} -> ${path.relative(roadmapBasePath, move.to)}`);
            } catch (error) {
                logger.error(`❌ Failed to move ${move.from}: ${error.message}`);
            }
        }
        
        // Close database
        db.close();
        
        logger.info(`🎉 Synchronization fix completed! Moved ${moves.length} folders.`);
        
    } catch (error) {
        logger.error(`❌ Error fixing synchronization: ${error.message}`);
        process.exit(1);
    }
}

async function findTaskFolders(basePath, taskName) {
    const folders = [];
    
    try {
        const entries = await fs.readdir(basePath, { withFileTypes: true });
        
        for (const entry of entries) {
            if (entry.isDirectory()) {
                const fullPath = path.join(basePath, entry.name);
                
                // Check if this directory contains the task
                if (entry.name.includes(taskName) || taskName.includes(entry.name)) {
                    folders.push(fullPath);
                } else {
                    // Recursively search subdirectories
                    const subFolders = await findTaskFolders(fullPath, taskName);
                    folders.push(...subFolders);
                }
            }
        }
    } catch (error) {
        // Directory doesn't exist or can't be read
    }
    
    return folders;
}

// Run the fix
fixSyncIssues();
