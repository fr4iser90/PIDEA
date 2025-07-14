const Logger = require('@logging/Logger');

const logger = new Logger('ServiceName');

#!/usr/bin/env node

/**
 * Logging Cleanup Script
 * 
 * Entfernt überflüssige Logs und macht das Logging konsistent:
 * - Reduziert Service-Registrierungs-Logs
 * - Entfernt Debug-Logs in Production
 * - Konsolidiert Initialisierungs-Logs
 * - Fügt strukturierte Logs für wichtige Events hinzu
 */

const fs = require('fs');
const path = require('path');

// Farben für Console Output
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
    logger.info(`${colors[color]}${message}${colors.reset}`);
}

// Patterns für überflüssige Logs
const excessiveLogPatterns = [
    // Service Registrierungen (zu viele)
    /logger\.log\s*\(\s*['"`]\[ServiceContainer\] Registered service:/,
    /logger\.info\s*\(\s*['"`]\[ServiceContainer\] Registered service:/,
    
    // Initialisierungs-Details (zu verbose)
    /logger\.log\s*\(\s*['"`]\[.*\] Initialized successfully/,
    /logger\.info\s*\(\s*['"`]\[.*\] Initialized successfully/,
    
    // Routine-Operationen ohne Mehrwert
    /logger\.log\s*\(\s*['"`]\[.*\] Loaded \d+ patterns/,
    /logger\.log\s*\(\s*['"`]\[.*\] Loaded \d+ languages/,
    
    // Debug-Statements in Production
    /logger\.debug\s*\(\s*['"`]\[.*\] Detected/,
    /logger\.log\s*\(\s*['"`]\[.*\] Detected/,
];

// Patterns für wichtige Logs (behalten)
const importantLogPatterns = [
    /logger\.error\s*\(/,
    /logger\.warn\s*\(/,
    /logger\.success\s*\(/,
    /logger\.failure\s*\(/,
    /logger\.userAction\s*\(/,
    /logger\.systemEvent\s*\(/,
    /logger\.apiRequest\s*\(/,
];

// Ersetzungen für bessere Logs
const logReplacements = [
    // Service Registrierungen reduzieren
    {
        pattern: /logger\.log\s*\(\s*['"`]\[ServiceContainer\] Registered service: ([^'"]+) \(singleton: true\)['"`]\s*\)/g,
        replacement: 'logger.debug(`[ServiceContainer] Registered: $1`)'
    },
    
    // Initialisierungs-Logs konsolidieren
    {
        pattern: /logger\.log\s*\(\s*['"`]\[([^\]]+)\] Initialized successfully['"`]\s*\)/g,
        replacement: 'logger.success(`[$1] Initialized`)'
    },
    
    // System Events strukturieren
    {
        pattern: /logger\.log\s*\(\s*['"`]\[([^\]]+)\] ([^'"]+)['"`]\s*\)/g,
        replacement: 'logger.systemEvent(`$1: $2`)'
    },
    
    // User Actions strukturieren
    {
        pattern: /logger\.log\s*\(\s*['"`]👤 User Action: ([^'"]+)['"`]\s*\)/g,
        replacement: 'logger.userAction(`$1`)'
    }
];

function shouldRemoveLog(line) {
    return excessiveLogPatterns.some(pattern => pattern.test(line)) &&
           !importantLogPatterns.some(pattern => pattern.test(line));
}

function improveLog(line) {
    let improvedLine = line;
    
    logReplacements.forEach(({ pattern, replacement }) => {
        improvedLine = improvedLine.replace(pattern, replacement);
    });
    
    return improvedLine;
}

function processFile(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let modified = false;
        let removedCount = 0;
        let improvedCount = 0;
        
        const lines = content.split('\n');
        const filteredLines = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Überflüssige Logs entfernen
            if (shouldRemoveLog(line)) {
                removedCount++;
                continue; // Zeile überspringen
            }
            
            // Logs verbessern
            const improvedLine = improveLog(line);
            if (improvedLine !== line) {
                improvedCount++;
                filteredLines.push(improvedLine);
            } else {
                filteredLines.push(line);
            }
        }
        
        if (removedCount > 0 || improvedCount > 0) {
            fs.writeFileSync(filePath, filteredLines.join('\n'), 'utf8');
            log(`  📝 ${filePath}`, 'cyan');
            if (removedCount > 0) {
                log(`    ❌ Removed ${removedCount} excessive logs`, 'red');
            }
            if (improvedCount > 0) {
                log(`    ✨ Improved ${improvedCount} logs`, 'green');
            }
            return true;
        }
        
        return false;
    } catch (error) {
        log(`  ❌ Error processing ${filePath}: ${error.message}`, 'red');
        return false;
    }
}

function findJsFiles(dir) {
    const files = [];
    
    function scan(currentDir) {
        const items = fs.readdirSync(currentDir);
        
        for (const item of items) {
            const fullPath = path.join(currentDir, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                // Skip node_modules and other build directories
                if (!['node_modules', 'dist', 'build', '.git', 'coverage'].includes(item)) {
                    scan(fullPath);
                }
            } else if (item.endsWith('.js') || item.endsWith('.jsx')) {
                files.push(fullPath);
            }
        }
    }
    
    scan(dir);
    return files;
}

function main() {
    log('🧹 Starting logging cleanup...', 'bright');
    log('', 'reset');
    
    const backendDir = path.join(__dirname, '..', 'backend');
    const frontendDir = path.join(__dirname, '..', 'frontend');
    
    let totalFiles = 0;
    let modifiedFiles = 0;
    
    // Backend files
    if (fs.existsSync(backendDir)) {
        log('📁 Processing backend files...', 'blue');
        const backendFiles = findJsFiles(backendDir);
        totalFiles += backendFiles.length;
        
        for (const file of backendFiles) {
            if (processFile(file)) {
                modifiedFiles++;
            }
        }
    }
    
    // Frontend files
    if (fs.existsSync(frontendDir)) {
        log('📁 Processing frontend files...', 'blue');
        const frontendFiles = findJsFiles(frontendDir);
        totalFiles += frontendFiles.length;
        
        for (const file of frontendFiles) {
            if (processFile(file)) {
                modifiedFiles++;
            }
        }
    }
    
    log('', 'reset');
    log('📊 Cleanup Summary:', 'bright');
    log(`   Total files scanned: ${totalFiles}`, 'cyan');
    log(`   Files modified: ${modifiedFiles}`, 'green');
    log(`   Files unchanged: ${totalFiles - modifiedFiles}`, 'yellow');
    log('', 'reset');
    
    if (modifiedFiles > 0) {
        log('✅ Logging cleanup completed!', 'green');
        log('💡 The application now has cleaner, more structured logging.', 'yellow');
        log('🚀 Restart your application to see the improvements.', 'cyan');
    } else {
        log('ℹ️  No excessive logging found to clean up.', 'cyan');
    }
}

if (require.main === module) {
    main();
}

module.exports = { processFile, shouldRemoveLog, improveLog }; 