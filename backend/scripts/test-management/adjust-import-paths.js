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

// Welche Verzeichnisse durchsuchen?
const TARGET_DIRS = [
  path.join(__dirname, '../../tests/'), // tests/
];

// Hilfsfunktion: Erzeuge Mapping von absolutem Pfad zu Alias
function getAliasMappings() {
  const mappings = [];
  for (const [alias, relPath] of Object.entries(aliasMap)) {
    const absPath = path.resolve(path.join(__dirname, '../../', relPath));
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

// Hauptfunktion: Durchsuche und passe Imports an
function adjustImportsInFile(filePath, mappings, report) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  const importRegex = /require\(['"](\.\.?\/[^'"]+)['"]\)/g;
  let match;
  let newContent = content;
  let changes = [];

  while ((match = importRegex.exec(content)) !== null) {
    const relImport = match[1];
    
    // Spezielle Behandlung für Tests, die ../../backend/ verwenden
    if (relImport.startsWith('../../backend/')) {
      const cleanPath = relImport.replace('../../backend/', '');
      const aliasImport = `@/${cleanPath}`;
      newContent = newContent.replace(
        match[0],
        `require('${aliasImport}')`
      );
      changed = true;
      changes.push({
        from: relImport,
        to: aliasImport,
        line: content.substr(0, match.index).split('\n').length
      });
      continue;
    }
    
    // Normale Behandlung für andere relative Imports
    const absImportPath = path.resolve(path.dirname(filePath), relImport);
    const aliasImport = findAliasFor(absImportPath, mappings);
    if (aliasImport) {
      newContent = newContent.replace(
        match[0],
        `require('${aliasImport}')`
      );
      changed = true;
      changes.push({
        from: relImport,
        to: aliasImport,
        line: content.substr(0, match.index).split('\n').length
      });
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    report.patched.push({ file: filePath, changes });
    console.log(`✅ Patched: ${path.relative(process.cwd(), filePath)}`);
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
  const report = { patched: [] };
  for (const dir of TARGET_DIRS) {
    walk(dir, mappings, report);
  }
  // Schreibe Report als Markdown
  const reportPath = path.join(__dirname, 'import-adjust-report.md');
  let md = '# Import Adjust Report\n\n';
  for (const entry of report.patched) {
    md += `## ${path.relative(process.cwd(), entry.file)}\n`;
    for (const change of entry.changes) {
      md += `- Zeile ${change.line}: \
   aFrom: \
   a a ${change.from}\n   aTo: \
   a a ${change.to}\n`;
    }
    md += '\n';
  }
  fs.writeFileSync(reportPath, md, 'utf8');
  console.log(`\n📄 Import-Adjust-Report geschrieben nach: ${reportPath}`);
}

main(); 