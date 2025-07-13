#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Farben für Konsolen-Ausgabe
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

// Logger Import Statement
const LOGGER_IMPORT = "const { logger } = require('@infrastructure/logging/Logger');";

// Mapping für console.log → logger
const consoleToLoggerMap = {
    'console.log': 'logger.log',
    'console.info': 'logger.info', 
    'console.warn': 'logger.warn',
    'console.error': 'logger.error',
    'console.debug': 'logger.debug'
};

// Debug-Patterns erkennen
const debugPatterns = [
    /console\.log\(.*debug.*\)/i,
    /console\.log\(.*DEBUG.*\)/i,
    /console\.log\(.*Debug.*\)/i,
    /console\.log\(.*test.*\)/i,
    /console\.log\(.*Test.*\)/i,
    /console\.log\(.*temp.*\)/i,
    /console\.log\(.*Temp.*\)/i,
    /console\.log\(.*tmp.*\)/i,
    /console\.log\(.*Tmp.*\)/i
];

function shouldBeDebug(consoleStatement) {
    return debugPatterns.some(pattern => pattern.test(consoleStatement));
}

function processFile(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let modified = false;
        let hasLoggerImport = content.includes('require(\'@infrastructure/logging/Logger\')') || 
                             content.includes('require("@infrastructure/logging/Logger")');

        // Alle console.* Statements finden und ersetzen
        Object.entries(consoleToLoggerMap).forEach(([consoleMethod, loggerMethod]) => {
            const regex = new RegExp(`(${consoleMethod.replace('.', '\\.')})\\(`, 'g');
            const matches = content.match(regex);
            
            if (matches) {
                log(`Found ${matches.length} ${consoleMethod} statements in ${filePath}`, 'yellow');
                
                // Prüfen ob es Debug-Statements sind
                const lines = content.split('\n');
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    if (line.includes(consoleMethod) && shouldBeDebug(line)) {
                        log(`  → Converting ${consoleMethod} to logger.debug (debug pattern detected)`, 'cyan');
                        lines[i] = line.replace(consoleMethod, 'logger.debug');
                    } else if (line.includes(consoleMethod)) {
                        lines[i] = line.replace(consoleMethod, loggerMethod);
                    }
                }
                content = lines.join('\n');
                modified = true;
            }
        });

        // Logger Import hinzufügen falls nötig
        if (modified && !hasLoggerImport) {
            // Finde die beste Stelle für den Import (nach anderen requires)
            const lines = content.split('\n');
            let insertIndex = 0;
            
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].trim().startsWith('const') && lines[i].includes('require')) {
                    insertIndex = i + 1;
                } else if (lines[i].trim().startsWith('const') || lines[i].trim().startsWith('let') || lines[i].trim().startsWith('var')) {
                    continue;
                } else {
                    break;
                }
            }
            
            lines.splice(insertIndex, 0, LOGGER_IMPORT);
            content = lines.join('\n');
            log(`  → Added logger import to ${filePath}`, 'green');
        }

        if (modified) {
            fs.writeFileSync(filePath, content, 'utf8');
            log(`✅ Updated ${filePath}`, 'green');
            return true;
        }
        
        return false;
    } catch (error) {
        log(`❌ Error processing ${filePath}: ${error.message}`, 'red');
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
                // Skip node_modules, .git, etc.
                if (!['node_modules', '.git', 'logs', 'coverage', 'dist', 'build'].includes(item)) {
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
    log('🚀 Starting console.log to logger conversion...', 'bright');
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
    log('📊 Summary:', 'bright');
    log(`   Total files scanned: ${totalFiles}`, 'cyan');
    log(`   Files modified: ${modifiedFiles}`, 'green');
    log(`   Files unchanged: ${totalFiles - modifiedFiles}`, 'yellow');
    log('', 'reset');
    
    if (modifiedFiles > 0) {
        log('✅ Conversion completed successfully!', 'green');
        log('💡 Remember to test your application after the changes.', 'yellow');
    } else {
        log('ℹ️  No console.log statements found to convert.', 'cyan');
    }
}

// Script ausführen
if (require.main === module) {
    main();
}

module.exports = { processFile, findJsFiles }; 