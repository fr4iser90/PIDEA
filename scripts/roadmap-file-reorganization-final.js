#!/usr/bin/env node

/**
 * Roadmap File Reorganization Script - FINAL VERSION
 * Reorganizes all roadmap files into the new status-based structure
 * 
 * CORRECT STRUCTURE:
 * - completed/[quarter]/[category]/[task-name]/[file].md
 * - pending/[priority]/[category]/[task-name]/[file].md
 * - in-progress/[priority]/[category]/[task-name]/[file].md
 * - failed/[priority]/[category]/[task-name]/[file].md
 */

const fs = require('fs').promises;
const path = require('path');
const Logger = require('../backend/infrastructure/logging/Logger');

const logger = new Logger('RoadmapFileReorganizationFinal');

class RoadmapFileReorganizerFinal {
    constructor(workspacePath) {
        this.workspacePath = workspacePath;
        this.roadmapDir = path.join(workspacePath, 'docs/09_roadmap');
        this.backupDir = path.join(workspacePath, 'docs/09_roadmap_backup');
        this.movedFiles = [];
        this.errors = [];
    }

    /**
     * Main reorganization method
     */
    async reorganize() {
        try {
            logger.info('🚀 Starting roadmap file reorganization (FINAL VERSION)...');
            
            // Create backup
            await this.createBackup();
            
            // Analyze current structure
            const fileGroups = await this.analyzeFileStructure();
            
            // Reorganize files
            await this.reorganizeFiles(fileGroups);
            
            // Generate report
            await this.generateReport();
            
            logger.info('✅ Roadmap file reorganization completed successfully!');
            
        } catch (error) {
            logger.error('❌ Reorganization failed:', error);
            throw error;
        }
    }

    /**
     * Create backup of current structure
     */
    async createBackup() {
        try {
            logger.info('📦 Creating backup...');
            
            // Remove existing backup
            try {
                await fs.rm(this.backupDir, { recursive: true });
            } catch (error) {
                // Backup doesn't exist, that's fine
            }
            
            // Copy current structure
            await this.copyDirectory(this.roadmapDir, this.backupDir);
            
            logger.info('✅ Backup created successfully');
            
        } catch (error) {
            logger.error('❌ Backup creation failed:', error);
            throw error;
        }
    }

    /**
     * Copy directory recursively
     */
    async copyDirectory(src, dest) {
        await fs.mkdir(dest, { recursive: true });
        const entries = await fs.readdir(src, { withFileTypes: true });
        
        for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);
            
            if (entry.isDirectory()) {
                await this.copyDirectory(srcPath, destPath);
            } else {
                await fs.copyFile(srcPath, destPath);
            }
        }
    }

    /**
     * Analyze current file structure and group files by task
     */
    async analyzeFileStructure() {
        logger.info('🔍 Analyzing current file structure...');
        
        const fileGroups = new Map();
        const allFiles = await this.getAllMarkdownFiles(this.roadmapDir);
        
        for (const filePath of allFiles) {
            const relPath = path.relative(this.roadmapDir, filePath);
            const parts = relPath.split(path.sep);
            
            if (parts.length < 2) continue;
            
            const status = parts[0];
            let priority, quarter, category, filename;
            
            // Parse different structures based on status
            if (status === 'completed') {
                if (parts[1].includes('q')) {
                    // completed/2025-q3/category/file
                    quarter = parts[1];
                    category = parts[2];
                    filename = parts[3];
                } else {
                    // completed/priority/category/file (WRONG STRUCTURE - needs fixing)
                    priority = parts[1];
                    category = parts[2];
                    filename = parts[3];
                    quarter = '2025-q3'; // Default quarter for completed tasks
                }
            } else if (['pending', 'in-progress', 'failed'].includes(status)) {
                if (['high', 'medium', 'low', 'critical'].includes(parts[1])) {
                    // pending/priority/category/file
                    priority = parts[1];
                    category = parts[2];
                    filename = parts[3];
                } else {
                    // pending/category/file (OLD STRUCTURE)
                    priority = 'medium'; // Default priority
                    category = parts[1];
                    filename = parts[2];
                }
            } else {
                // Skip files that don't match expected structure
                continue;
            }
            
            // Extract task name from filename - FIXED LOGIC
            const taskName = this.extractTaskName(filename);
            
            // Create group key
            let groupKey;
            if (status === 'completed') {
                groupKey = `${status}/${quarter}/${category}/${taskName}`;
            } else {
                groupKey = `${status}/${priority}/${category}/${taskName}`;
            }
            
            if (!fileGroups.has(groupKey)) {
                fileGroups.set(groupKey, {
                    status,
                    priority,
                    quarter,
                    category,
                    taskName,
                    files: []
                });
            }
            
            fileGroups.get(groupKey).files.push({
                originalPath: filePath,
                filename,
                type: this.getFileType(filename)
            });
        }
        
        logger.info(`📊 Found ${fileGroups.size} task groups with ${allFiles.length} total files`);
        return fileGroups;
    }

    /**
     * Extract task name from filename - FIXED VERSION
     */
    extractTaskName(filename) {
        // Remove file extensions
        let taskName = filename.replace(/\.md$/, '');
        
        // Remove common suffixes in order of specificity
        const suffixes = [
            '-phase-7', '-phase-6', '-phase-5', '-phase-4', '-phase-3', 
            '-phase-2', '-phase-1', '-implementation', '-index', '-report', 
            '-summary', '-analysis', '-validation'
        ];
        
        for (const suffix of suffixes) {
            if (taskName.endsWith(suffix)) {
                taskName = taskName.replace(suffix, '');
                break;
            }
        }
        
        return taskName;
    }

    /**
     * Get file type from filename
     */
    getFileType(filename) {
        if (filename.includes('-index')) return 'index';
        if (filename.includes('-implementation')) return 'implementation';
        if (filename.includes('-phase-')) return 'phase';
        if (filename.includes('-report')) return 'report';
        if (filename.includes('-summary')) return 'summary';
        if (filename.includes('-analysis')) return 'analysis';
        if (filename.includes('-validation')) return 'validation';
        return 'other';
    }

    /**
     * Reorganize files into new structure
     */
    async reorganizeFiles(fileGroups) {
        logger.info('🔄 Reorganizing files...');
        
        for (const [groupKey, group] of fileGroups) {
            try {
                await this.reorganizeTaskGroup(group);
            } catch (error) {
                logger.error(`❌ Failed to reorganize group ${groupKey}:`, error);
                this.errors.push({ group: groupKey, error: error.message });
            }
        }
        
        logger.info(`✅ Reorganized ${fileGroups.size} task groups`);
    }

    /**
     * Reorganize a single task group
     */
    async reorganizeTaskGroup(group) {
        const { status, priority, quarter, category, taskName, files } = group;
        
        // Create new directory structure
        let newDir;
        if (status === 'completed') {
            // For completed tasks: status/quarter/category/taskName
            newDir = path.join(this.roadmapDir, status, quarter, category, taskName);
        } else {
            // For pending/in-progress/failed: status/priority/category/taskName
            newDir = path.join(this.roadmapDir, status, priority, category, taskName);
        }
        
        await fs.mkdir(newDir, { recursive: true });
        
        // Move files to new location
        for (const file of files) {
            const newPath = path.join(newDir, file.filename);
            
            try {
                await fs.rename(file.originalPath, newPath);
                this.movedFiles.push({
                    from: file.originalPath,
                    to: newPath,
                    task: taskName,
                    type: file.type
                });
                
                logger.debug(`📁 Moved: ${path.relative(this.roadmapDir, file.originalPath)} → ${path.relative(this.roadmapDir, newPath)}`);
                
            } catch (error) {
                logger.error(`❌ Failed to move file ${file.originalPath}:`, error);
                this.errors.push({ file: file.originalPath, error: error.message });
            }
        }
        
        // Clean up empty directories
        await this.cleanupEmptyDirectories(group);
    }

    /**
     * Clean up empty directories after moving files
     */
    async cleanupEmptyDirectories(group) {
        const { status, priority, quarter, category } = group;
        
        if (status === 'completed') {
            // For completed tasks: clean up quarter/category structure
            const categoryDir = path.join(this.roadmapDir, status, quarter, category);
            try {
                const entries = await fs.readdir(categoryDir);
                if (entries.length === 0) {
                    await fs.rmdir(categoryDir);
                    logger.debug(`🗑️ Removed empty directory: ${path.relative(this.roadmapDir, categoryDir)}`);
                }
            } catch (error) {
                // Directory not empty or doesn't exist, that's fine
            }
        } else {
            // For pending/in-progress/failed: clean up priority/category structure
            const categoryDir = path.join(this.roadmapDir, status, priority, category);
            try {
                const entries = await fs.readdir(categoryDir);
                if (entries.length === 0) {
                    await fs.rmdir(categoryDir);
                    logger.debug(`🗑️ Removed empty directory: ${path.relative(this.roadmapDir, categoryDir)}`);
                }
            } catch (error) {
                // Directory not empty or doesn't exist, that's fine
            }
            
            // Try to remove priority directory if empty
            const priorityDir = path.join(this.roadmapDir, status, priority);
            try {
                const entries = await fs.readdir(priorityDir);
                if (entries.length === 0) {
                    await fs.rmdir(priorityDir);
                    logger.debug(`🗑️ Removed empty directory: ${path.relative(this.roadmapDir, priorityDir)}`);
                }
            } catch (error) {
                // Directory not empty or doesn't exist, that's fine
            }
        }
    }

    /**
     * Get all markdown files recursively
     */
    async getAllMarkdownFiles(dir) {
        const files = [];
        
        try {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                
                if (entry.isDirectory()) {
                    // Skip backup directory
                    if (entry.name === '09_roadmap_backup') continue;
                    
                    const subFiles = await this.getAllMarkdownFiles(fullPath);
                    files.push(...subFiles);
                } else if (entry.name.endsWith('.md')) {
                    files.push(fullPath);
                }
            }
        } catch (error) {
            // Directory doesn't exist or can't be read
        }
        
        return files;
    }

    /**
     * Generate reorganization report
     */
    async generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            totalFiles: this.movedFiles.length,
            errors: this.errors.length,
            successRate: this.errors.length === 0 ? '100.00' : ((this.movedFiles.length / (this.movedFiles.length + this.errors.length)) * 100).toFixed(2),
            movedFiles: this.movedFiles,
            errors: this.errors
        };
        
        const reportPath = path.join(this.workspacePath, 'logs', 'roadmap-reorganization-final-report.json');
        await fs.mkdir(path.dirname(reportPath), { recursive: true });
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
        
        logger.info(`📊 Reorganization report saved to: ${reportPath}`);
        logger.info(`📈 Summary: ${this.movedFiles.length} files moved, ${this.errors.length} errors`);
    }
}

// Main execution
if (require.main === module) {
    const workspacePath = process.argv[2] || process.cwd();
    const reorganizer = new RoadmapFileReorganizerFinal(workspacePath);
    
    reorganizer.reorganize()
        .then(() => {
            console.log('🎉 Reorganization completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Reorganization failed:', error);
            process.exit(1);
        });
}

module.exports = RoadmapFileReorganizerFinal;
