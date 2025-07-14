
#!/usr/bin/env node
require('module-alias/register');

/**
 * Adjust Import Paths Script
 * Sucht und ersetzt relative Imports durch Aliase (z.B. @/domain/...), wenn möglich.
 * Gibt einen Report über alle Änderungen aus und speichert ihn als Markdown.
 */

const fs = require('fs');
const path = require('path');

// Aliase aus package.json lesen
const pkg = require('../../package.json');
const aliasMap = pkg._moduleAliases || {};
const testsDir = aliasMap['@tests'] ? path.resolve(__dirname, '../../', aliasMap['@tests']) : path.join(__dirname, '../../tests/');
const TARGET_DIRS = [testsDir];

// Hilfsfunktion: Erzeuge Mapping von absolutem Pfad zu Alias
function getAliasMappings() {
  const mappings = [];
  for (const [alias, relPath] of Object.entries(aliasMap)) {
    let absPath;
    if (path.isAbsolute(relPath)) {
      absPath = relPath;
    } else {
      absPath = path.resolve(__dirname, '../../', relPath);
    }
    mappings.push({ alias, absPath });
  }
  return mappings;
}

// Hilfsfunktion: Finde passenden Alias für einen absoluten Pfad
function findAliasFor(absImportPath, mappings) {
  for (const { alias, absPath } of mappings) {
    if (absImportPath.startsWith(absPath)) {
      const rel = path.relative(absPath, absImportPath).replace(/\\/g, '/');
      return rel ? `${alias}/${rel}` : alias;
    }
  }
  return null;
}

// Hilfsfunktion: Konvertiere relativen Import zu Root-Alias @/
function convertRelativeToAlias(relImport, filePath) {
  // Berechne den absoluten Pfad der Import-Zieldatei
  const absImportPath = path.resolve(path.dirname(filePath), relImport);
  // Berechne den Pfad relativ zum backend-Ordner (Projekt-Root)
  const backendRoot = path.resolve(__dirname, '../../');
  let relToRoot = path.relative(backendRoot, absImportPath).replace(/\\/g, '/');
  // Immer @/ verwenden
  return `@/${relToRoot}`;
}

// Hauptfunktion: Durchsuche und passe Imports an
function adjustImportsInFile(filePath, mappings, report) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Erweiterte Regex: Erkennt sowohl require(...) als auch import ... from ...
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');
  // und auch Alias-Imports wie @infrastructure/...
  const importRegex = /(require\(['"](\.\.?\/[^'"]+)['"]\))|(import [^'"\n]+ from ['"](\.\.?\/[^'"]+)['"])|(require\(['"]@([^/'"]+)(\/[^'"]*)['"]\))|(import [^'"\n]+ from ['"]@([^/'"]+)(\/[^'"]*)['"])/g;
  let match;
  let newContent = content;
  let changes = [];

  while ((match = importRegex.exec(content)) !== null) {
    // 1. Relative require/import
    const relImport = match[2] || match[4];
    if (relImport) {
      const aliasImport = convertRelativeToAlias(relImport, filePath);
      if (aliasImport) {
        newContent = newContent.replace(relImport, aliasImport);
        changed = true;
        changes.push({
          from: relImport,
          to: aliasImport,
          line: content.substr(0, match.index).split('\n').length,
          type: match[1] ? 'require' : 'import'
        });
      }
      continue;
    }
    // 2. Alias require/import (z.B. @infrastructure/..., @domain/...)
    const aliasName = match[6] || match[8];
    const aliasPath = match[7] || match[9];
    if (aliasName && aliasPath) {
      // Vereinheitliche auf @/ALIASNAME/...
      const unified = `@/${aliasName}${aliasPath}`;
      const fullMatch = match[0];
      // Ersetze nur den Pfad im Statement
      const oldImport = `@${aliasName}${aliasPath}`;
      newContent = newContent.replace(oldImport, unified);
      changed = true;
      changes.push({
        from: oldImport,
        to: unified,
        line: content.substr(0, match.index).split('\n').length,
        type: match[5] ? 'require' : 'import'
      });
    }
  }

  if (changed) {
    // Sichere Schreibweise: Backup erstellen
    const backupPath = filePath + '.backup';
    if (!fs.existsSync(backupPath)) {
      fs.writeFileSync(backupPath, content, 'utf8');
    }
    fs.writeFileSync(filePath, newContent, 'utf8');
    report.patched.push({ file: filePath, changes });
    logger.info(`✅ Patched: ${path.relative(process.cwd(), filePath)}`);
  }
}

function walk(dir, mappings, report) {
  if (!fs.existsSync(dir)) return;
  const stats = fs.statSync(dir);
  if (!stats.isDirectory()) {
    if (dir.endsWith('.js')) {
      adjustImportsInFile(dir, mappings, report);
    }
    return;
  }
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && !file.startsWith('.')) {
        walk(fullPath, mappings, report);
      }
    } else if (file.endsWith('.js')) {
      adjustImportsInFile(fullPath, mappings, report);
    }
  }
}

function main() {
  const mappings = getAliasMappings();
  logger.info('🔍 Gefundene Aliase:', mappings.map(m => `${m.alias} -> ${m.absPath}`));
  logger.info('🎯 Ziel-Verzeichnisse:', TARGET_DIRS);
  
  const report = { patched: [] };
  for (const dir of TARGET_DIRS) {
    logger.info(`\n📁 Durchsuche: ${dir}`);
    walk(dir, mappings, report);
  }
  
  logger.info(`\n📊 Ergebnis: ${report.patched.length} Dateien geändert`);
  
  // Schreibe Report als Markdown
  const reportPath = path.join(__dirname, 'import-adjust-report.md');
  let md = '# Import Adjust Report\n\n';
  for (const entry of report.patched) {
    md += `## ${path.relative(process.cwd(), entry.file)}\n`;
    for (const change of entry.changes) {
      md += `- Zeile ${change.line}: ${change.type}\n   From: ${change.from}\n   To: ${change.to}\n`;
    }
    md += '\n';
  }
  fs.writeFileSync(reportPath, md, 'utf8');
  logger.info(`\n📄 Import-Adjust-Report geschrieben nach: ${reportPath}`);
}

main(); 