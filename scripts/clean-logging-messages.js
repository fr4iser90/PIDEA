#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

class LogMessageCleaner {
    constructor() {
        this.patterns = [
            // Remove [ServiceName] from beginning of messages with single quotes
            /logger\.(info|warn|error|debug|success|failure)\s*\(\s*'\[[^\]]+\]\s*/g,
            // Remove [ServiceName] from beginning of messages with double quotes
            /logger\.(info|warn|error|debug|success|failure)\s*\(\s*"\[[^\]]+\]\s*/g,
            // Remove [ServiceName] from beginning of messages with template literals (keep backticks)
            /logger\.(info|warn|error|debug|success|failure)\s*\(\s*`\[[^\]]+\]\s*/g,
            // Remove [ServiceName] from console.log with single quotes
            /console\.(log|info|warn|error|debug)\s*\(\s*'\[[^\]]+\]\s*/g,
            // Remove [ServiceName] from console.log with double quotes
            /console\.(log|info|warn|error|debug)\s*\(\s*"\[[^\]]+\]\s*/g,
            // Remove [ServiceName] from console.log with template literals (keep backticks)
            /console\.(log|info|warn|error|debug)\s*\(\s*`\[[^\]]+\]\s*/g
        ];
        
        this.replacements = [
            'logger.$1(\'',
            'logger.$1("',
            'logger.$1(`',
            'console.$1(\'',
            'console.$1("',
            'console.$1(`'
        ];
        
        this.cleanedFiles = 0;
        this.totalChanges = 0;
    }

    /**
     * Clean all JavaScript files in the project
     */
    async cleanAllFiles() {
        log('🧹 Starting log message cleanup...', 'bright');
        log('', 'reset');
        
        const backendDir = path.join(__dirname, '..', 'backend');
        const frontendDir = path.join(__dirname, '..', 'frontend');
        const scriptsDir = path.join(__dirname, '..', 'scripts');
        
        await this.cleanDirectory(backendDir);
        await this.cleanDirectory(frontendDir);
        await this.cleanDirectory(scriptsDir);
        
        this.printSummary();
    }

    /**
     * Clean directory recursively
     */
    async cleanDirectory(directory) {
        if (!fs.existsSync(directory)) return;
        
        log(`📁 Cleaning ${directory}...`, 'blue');
        
        const files = this.findJsFiles(directory);
        
        for (const file of files) {
            await this.cleanFile(file);
        }
    }

    /**
     * Find JavaScript files
     */
    findJsFiles(directory) {
        const files = [];
        
        function scan(currentDir) {
            const items = fs.readdirSync(currentDir);
            
            for (const item of items) {
                const fullPath = path.join(currentDir, item);
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory()) {
                    if (!['node_modules', '.git', 'logs', 'coverage', 'dist', 'build'].includes(item)) {
                        scan(fullPath);
                    }
                } else if (item.endsWith('.js') || item.endsWith('.jsx')) {
                    files.push(fullPath);
                }
            }
        }
        
        scan(directory);
        return files;
    }

    /**
     * Clean a single file
     */
    async cleanFile(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const originalContent = content;
            let modifiedContent = content;
            let changes = 0;
            
            // Apply all patterns
            for (let i = 0; i < this.patterns.length; i++) {
                const pattern = this.patterns[i];
                const replacement = this.replacements[i];
                
                const matches = modifiedContent.match(pattern);
                if (matches) {
                    modifiedContent = modifiedContent.replace(pattern, replacement);
                    changes += matches.length;
                }
            }
            
            // Also clean specific service name patterns
            const serviceNamePatterns = [
                // Single quotes
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*'\[AutoSecurityManager\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*'\[Application\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*'\[Logger\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*'\[IDEManager\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*'\[ServiceRegistry\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*'\[ServiceContainer\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*'\[DatabaseConnection\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*'\[ProjectContextService\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*'\[SQLiteTaskRepository\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*'\[SQLiteTaskSessionRepository\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*'\[AutoFinishSystem\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*'\[TodoParser\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*'\[ConfirmationSystem\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*'\[FallbackDetection\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*'\[TaskSequencer\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*'\[AutoTestFixSystem\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*'\[TestAnalyzer\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*'\[TestFixer\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*'\[CoverageAnalyzer\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*'\[CommandBus\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*'\[IDEMirrorController\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*'\[WebSocketManager\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*'\[ScreenshotStreamingService\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*'\[IDEConfigManager\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*'\[CursorDetector\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*'\[VSCodeDetector\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*'\[WindsurfDetector\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*'\[IDEDetectorFactory\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*'\[IDEHealthMonitor\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*'\[IDEPortManager\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*'\[BrowserManager\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*'\[FileBasedWorkspaceDetector\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*'\[IDEWorkspaceDetectionService\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*'\[EventBus\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*'\[BranchStrategy\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*'\[ResourceManager\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*'\[ExecutionCache\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*'\[ExecutionMetrics\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*'\[ExecutionMonitor\]\s*/g,
                
                // Double quotes
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*"\[AutoSecurityManager\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*"\[Application\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*"\[Logger\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*"\[IDEManager\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*"\[ServiceRegistry\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*"\[ServiceContainer\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*"\[DatabaseConnection\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*"\[ProjectContextService\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*"\[SQLiteTaskRepository\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*"\[SQLiteTaskSessionRepository\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*"\[AutoFinishSystem\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*"\[TodoParser\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*"\[ConfirmationSystem\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*"\[FallbackDetection\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*"\[TaskSequencer\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*"\[AutoTestFixSystem\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*"\[TestAnalyzer\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*"\[TestFixer\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*"\[CoverageAnalyzer\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*"\[CommandBus\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*"\[IDEMirrorController\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*"\[WebSocketManager\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*"\[ScreenshotStreamingService\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*"\[IDEConfigManager\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*"\[CursorDetector\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*"\[VSCodeDetector\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*"\[WindsurfDetector\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*"\[IDEDetectorFactory\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*"\[IDEHealthMonitor\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*"\[IDEPortManager\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*"\[BrowserManager\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*"\[FileBasedWorkspaceDetector\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*"\[IDEWorkspaceDetectionService\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*"\[EventBus\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*"\[BranchStrategy\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*"\[ResourceManager\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*"\[ExecutionCache\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*"\[ExecutionMetrics\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*"\[ExecutionMonitor\]\s*/g,
                
                // Template literals (backticks)
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*`\[AutoSecurityManager\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*`\[Application\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*`\[Logger\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*`\[IDEManager\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*`\[ServiceRegistry\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*`\[ServiceContainer\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*`\[DatabaseConnection\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*`\[ProjectContextService\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*`\[SQLiteTaskRepository\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*`\[SQLiteTaskSessionRepository\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*`\[AutoFinishSystem\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*`\[TodoParser\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*`\[ConfirmationSystem\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*`\[FallbackDetection\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*`\[TaskSequencer\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*`\[AutoTestFixSystem\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*`\[TestAnalyzer\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*`\[TestFixer\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*`\[CoverageAnalyzer\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*`\[CommandBus\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*`\[IDEMirrorController\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*`\[WebSocketManager\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*`\[ScreenshotStreamingService\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*`\[IDEConfigManager\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*`\[CursorDetector\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*`\[VSCodeDetector\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*`\[WindsurfDetector\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*`\[IDEDetectorFactory\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*`\[IDEHealthMonitor\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*`\[IDEPortManager\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*`\[BrowserManager\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*`\[FileBasedWorkspaceDetector\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*`\[IDEWorkspaceDetectionService\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*`\[EventBus\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*`\[BranchStrategy\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*`\[ResourceManager\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*`\[ExecutionCache\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*`\[ExecutionMetrics\]\s*/g,
                /logger\.(info|warn|error|debug|success|failure)\s*\(\s*`\[ExecutionMonitor\]\s*/g
            ];
            
            for (const pattern of serviceNamePatterns) {
                const matches = modifiedContent.match(pattern);
                if (matches) {
                    // Determine the quote type and replace accordingly
                    if (pattern.source.includes("'")) {
                        modifiedContent = modifiedContent.replace(pattern, 'logger.$1(\'');
                    } else if (pattern.source.includes('"')) {
                        modifiedContent = modifiedContent.replace(pattern, 'logger.$1("');
                    } else if (pattern.source.includes('`')) {
                        modifiedContent = modifiedContent.replace(pattern, 'logger.$1(`');
                    }
                    changes += matches.length;
                }
            }
            
            if (changes > 0) {
                // Create backup
                const backupPath = filePath + '.backup';
                fs.writeFileSync(backupPath, originalContent);
                
                // Write cleaned content
                fs.writeFileSync(filePath, modifiedContent, 'utf8');
                
                this.cleanedFiles++;
                this.totalChanges += changes;
                
                const relativePath = path.relative(process.cwd(), filePath);
                log(`  ✅ Cleaned: ${relativePath} (${changes} changes)`, 'green');
            }
            
        } catch (error) {
            const relativePath = path.relative(process.cwd(), filePath);
            log(`  ❌ Error cleaning ${relativePath}: ${error.message}`, 'red');
        }
    }

    /**
     * Print summary
     */
    printSummary() {
        log('', 'reset');
        log('📊 Cleanup Summary:', 'bright');
        log(`   Files cleaned: ${this.cleanedFiles}`, 'green');
        log(`   Total changes: ${this.totalChanges}`, 'cyan');
        log('', 'reset');
        
        if (this.cleanedFiles > 0) {
            log('✅ Log message cleanup completed successfully!', 'green');
            log('💡 Service names will now only appear from Logger metadata, not in messages', 'cyan');
        } else {
            log('ℹ️  No files needed cleaning', 'cyan');
        }
    }
}

// CLI interface
function main() {
    const cleaner = new LogMessageCleaner();
    cleaner.cleanAllFiles().catch(error => {
        log(`❌ Cleanup failed: ${error.message}`, 'red');
        process.exit(1);
    });
}

if (require.main === module) {
    main();
}

module.exports = LogMessageCleaner; 