#!/usr/bin/env node

/**
 * update-imports-to-aliases.js
 *
 * Sucht im backend/-Ordner nach allen JS-Dateien und ersetzt Importe mit '@/domain/...' usw. durch die richtigen Aliase.
 * Beispiel: require('@/domain/entities/ChatMessage') => require('@entities/ChatMessage')
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Mapping von '@/domain/...' auf '@entities', '@repositories', etc.
const ALIAS_MAP = [
  { pattern: '@/domain/entities/', alias: '@entities/' },
  { pattern: '@/domain/repositories/', alias: '@repositories/' },
  { pattern: '@/domain/services/', alias: '@services/' },
  { pattern: '@/domain/value-objects/', alias: '@value-objects/' },
  { pattern: '@/domain/workflows/', alias: '@workflows/' },
  { pattern: '@/domain/', alias: '@domain/' },
  { pattern: '@/application/commands/', alias: '@commands/' },
  { pattern: '@/application/handlers/', alias: '@handlers/' },
  { pattern: '@/application/queries/', alias: '@application/queries/' },
  { pattern: '@/application/', alias: '@application/' },
  { pattern: '@/infrastructure/messaging/', alias: '@messaging/' },
  { pattern: '@/infrastructure/database/', alias: '@database/' },
  { pattern: '@/infrastructure/external/', alias: '@external/' },
  { pattern: '@/infrastructure/auth/', alias: '@auth/' },
  { pattern: '@/infrastructure/auto/', alias: '@auto/' },
  { pattern: '@/infrastructure/security/', alias: '@security/' },
  { pattern: '@/infrastructure/logging/', alias: '@logging/' },
  { pattern: '@/infrastructure/templates/', alias: '@templates/' },
  { pattern: '@/infrastructure/strategies/', alias: '@strategies/' },
  { pattern: '@/infrastructure/', alias: '@infrastructure/' },
  { pattern: '@/presentation/api/controllers/', alias: '@controllers/' },
  { pattern: '@/presentation/api/', alias: '@api/' },
  { pattern: '@/presentation/websocket/', alias: '@websocket/' },
  { pattern: '@/presentation/', alias: '@presentation/' },
];

const BACKEND_DIR = path.join(__dirname, '../backend');
const FILE_PATTERN = '**/*.js';

function updateImportsInFile(filePath) {
  // Prüfe, ob es sich um eine Datei handelt
  if (!fs.statSync(filePath).isFile()) {
    return false;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;
  let changed = false;

  for (const { pattern, alias } of ALIAS_MAP) {
    // require
    const requireSearch = `require('${pattern}`;
    if (content.includes(requireSearch)) {
      content = content.split(requireSearch).join(`require('${alias}`);
      changed = true;
    }
    // import ... from
    const importSearch = `from '${pattern}`;
    if (content.includes(importSearch)) {
      content = content.split(importSearch).join(`from '${alias}`);
      changed = true;
    }
  }

  if (changed && content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }
  return false;
}

function main() {
  const files = glob.sync(FILE_PATTERN, { cwd: BACKEND_DIR, absolute: true });
  let changedFiles = [];

  for (const file of files) {
    if (updateImportsInFile(file)) {
      changedFiles.push(path.relative(BACKEND_DIR, file));
    }
  }

  console.log(`\nFertig! Geänderte Dateien (${changedFiles.length}):`);
  changedFiles.forEach(f => console.log('  -', f));
  if (changedFiles.length === 0) {
    console.log('Keine Änderungen nötig.');
  }
}

if (require.main === module) {
  main();
}
