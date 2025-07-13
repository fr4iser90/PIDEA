#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ALIAS_IMPORT = "const { logger } = require('@infrastructure/logging/Logger');";

function needsLoggerImport(content) {
    // Prüft, ob logger verwendet wird, aber kein Alias-Import existiert
    return (
        /logger\.(log|info|warn|error|debug|success|failure|time|timeEnd)\s*\(/.test(content) &&
        !content.includes("require('@infrastructure/logging/Logger')")
    );
}

function fixLoggerImport(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    // Entferne alle alten logger-Importe (relativ oder falsch)
    content = content.replace(/const\s*\{\s*logger\s*\}\s*=\s*require\([^)]+logging\/Logger['"]\);?/g, '');

    // Füge Alias-Import hinzu, falls logger verwendet wird
    if (needsLoggerImport(content)) {
        // Nach dem letzten require einfügen
        const lines = content.split('\n');
        let insertIdx = 0;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('require(')) insertIdx = i + 1;
        }
        lines.splice(insertIdx, 0, ALIAS_IMPORT);
        content = lines.join('\n');
        changed = true;
    }

    if (changed) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Logger-Import korrigiert: ${filePath}`);
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
                if (!['node_modules', '.git', 'logs', 'coverage', 'dist', 'build'].includes(item)) {
                    scan(fullPath);
                }
            } else if (item.endsWith('.js')) {
                files.push(fullPath);
            }
        }
    }
    scan(dir);
    return files;
}

function main() {
    const backendDir = path.join(__dirname, '..', 'backend');
    const files = findJsFiles(backendDir);
    for (const file of files) {
        fixLoggerImport(file);
    }
    console.log('🚀 Alle Logger-Importe auf Alias @infrastructure/logging/Logger gesetzt!');
}

if (require.main === module) {
    main();
} 