#!/usr/bin/env node

/**
 * Import Refactoring Script (V2)
 * Refactort ALLE relativen Imports (require & import, mit/ohne Dateinamen) auf das @-System
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Mapping für @-System
const ALIAS_MAP = {
    // Entities
    '../entities': '@domain/entities',
    '../../entities': '@domain/entities',
    '../../../entities': '@domain/entities',
    '../entities/': '@domain/entities/',
    '../../entities/': '@domain/entities/',
    '../../../entities/': '@domain/entities/',
    // Value-Objects
    '../value-objects': '@domain/value-objects',
    '../../value-objects': '@domain/value-objects',
    '../../../value-objects': '@domain/value-objects',
    '../value-objects/': '@domain/value-objects/',
    '../../value-objects/': '@domain/value-objects/',
    '../../../value-objects/': '@domain/value-objects/',
    // Application
    '../commands': '@application/commands',
    '../../commands': '@application/commands',
    '../handlers': '@application/handlers',
    '../../handlers': '@application/handlers',
    '../queries': '@application/queries',
    '../../queries': '@application/queries',
    // Infrastructure
    '../database': '@infrastructure/database',
    '../../database': '@infrastructure/database',
    '../external': '@infrastructure/external',
    '../../external': '@infrastructure/external',
    '../auth': '@infrastructure/auth',
    '../../auth': '@infrastructure/auth',
    '../messaging': '@infrastructure/messaging',
    '../../messaging': '@infrastructure/messaging',
    '../strategies': '@infrastructure/strategies',
    '../../strategies': '@infrastructure/strategies',
    '../templates': '@infrastructure/templates',
    '../../templates': '@infrastructure/templates',
    '../auto': '@infrastructure/auto',
    '../../auto': '@infrastructure/auto',
    // Domain services
    '../services': '@domain/services',
    '../../services': '@domain/services',
    '../repositories': '@domain/repositories',
    '../../repositories': '@domain/repositories',
    // Presentation
    '../api': '@presentation/api',
    '../../api': '@presentation/api',
    '../websocket': '@presentation/websocket',
    '../../websocket': '@presentation/websocket',
};

const EXCLUDE_PATTERNS = [
    'node_modules/**',
    'tests/**',
    'scripts/**',
    '*.test.js',
    '*.spec.js',
    'package.json',
    'package-lock.json',
    'yarn.lock',
    '.git/**',
    '.vscode/**',
    '*.log'
];

function replaceAllImports(content) {
    let changed = false;
    // require('...')
    content = content.replace(/require\(['"](\.\.\/[^'"]+)['"]\)/g, (match, relPath) => {
        for (const [from, to] of Object.entries(ALIAS_MAP)) {
            if (relPath.startsWith(from)) {
                changed = true;
                return `require('${relPath.replace(from, to)}')`;
            }
        }
        return match;
    });
    // import ... from '...'
    content = content.replace(/from ['"](\.\.\/[^'"]+)['"]/g, (match, relPath) => {
        for (const [from, to] of Object.entries(ALIAS_MAP)) {
            if (relPath.startsWith(from)) {
                changed = true;
                return `from '${relPath.replace(from, to)}'`;
            }
        }
        return match;
    });
    // import ... = require('...')
    content = content.replace(/= require\(['"](\.\.\/[^'"]+)['"]\)/g, (match, relPath) => {
        for (const [from, to] of Object.entries(ALIAS_MAP)) {
            if (relPath.startsWith(from)) {
                changed = true;
                return `= require('${relPath.replace(from, to)}')`;
            }
        }
        return match;
    });
    return { content, changed };
}

function processFile(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        const { content: newContent, changed } = replaceAllImports(content);
        if (changed) {
            fs.writeFileSync(filePath, newContent, 'utf8');
            console.log(`✅ Updated ${filePath}`);
        }
    } catch (e) {
        console.error(`❌ Error in ${filePath}: ${e.message}`);
    }
}

function findJavaScriptFiles(rootDir) {
    const patterns = [
        '**/*.js',
        '**/*.jsx',
        '**/*.ts',
        '**/*.tsx'
    ];
    let files = [];
    patterns.forEach(pattern => {
        const found = glob.sync(pattern, {
            cwd: rootDir,
            ignore: EXCLUDE_PATTERNS,
            absolute: true
        });
        files = files.concat(found);
    });
    return files;
}

function main() {
    const rootDir = process.cwd();
    const files = findJavaScriptFiles(rootDir);
    files.forEach(processFile);
    console.log('🚀 Alle relativen Imports wurden refactort!');
}

if (require.main === module) {
    main();
} 