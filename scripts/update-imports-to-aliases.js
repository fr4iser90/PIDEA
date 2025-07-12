#!/usr/bin/env node

/**
 * Update Imports to Aliases Script
 * Converts all relative imports to use the new @/ alias system
 */

const fs = require('fs').promises;
const path = require('path');
const glob = require('glob');
const fsSync = require('fs');

// Alias mapping for conversion
const ALIAS_MAPPINGS = {
    // Commands & Handlers
    'require(\'../../commands/': 'require(\'@categories/',
    'require(\'../../../commands/categories/': 'require(\'@categories/',
    'require(\'../../handlers/': 'require(\'@handler-categories/',
    'require(\'../../../handlers/categories/': 'require(\'@handler-categories/',
    
    // Steps & Workflows
    'require(\'../../../domain/workflows/steps/': 'require(\'@steps/',
    'require(\'../../domain/workflows/steps/': 'require(\'@steps/',
    'require(\'../../../domain/workflows/': 'require(\'@workflows/',
    'require(\'../../domain/workflows/': 'require(\'@workflows/',
    
    // Domain
    'require(\'../../../domain/entities/': 'require(\'@entities/',
    'require(\'../../domain/entities/': 'require(\'@entities/',
    'require(\'../../../domain/repositories/': 'require(\'@repositories/',
    'require(\'../../domain/repositories/': 'require(\'@repositories/',
    'require(\'../../../domain/services/': 'require(\'@services/',
    'require(\'../../domain/services/': 'require(\'@services/',
    'require(\'../../../domain/value-objects/': 'require(\'@value-objects/',
    'require(\'../../domain/value-objects/': 'require(\'@value-objects/',
    
    // Infrastructure
    'require(\'../../../infrastructure/messaging/': 'require(\'@messaging/',
    'require(\'../../infrastructure/messaging/': 'require(\'@messaging/',
    'require(\'../../../infrastructure/database/': 'require(\'@database/',
    'require(\'../../infrastructure/database/': 'require(\'@database/',
    'require(\'../../../infrastructure/external/': 'require(\'@external/',
    'require(\'../../infrastructure/external/': 'require(\'@external/',
    'require(\'../../../infrastructure/auth/': 'require(\'@auth/',
    'require(\'../../infrastructure/auth/': 'require(\'@auth/',
    'require(\'../../../infrastructure/auto/': 'require(\'@auto/',
    'require(\'../../infrastructure/auto/': 'require(\'@auto/',
    'require(\'../../../infrastructure/security/': 'require(\'@security/',
    'require(\'../../infrastructure/security/': 'require(\'@security/',
    'require(\'../../../infrastructure/logging/': 'require(\'@logging/',
    'require(\'../../infrastructure/logging/': 'require(\'@logging/',
    'require(\'../../../infrastructure/templates/': 'require(\'@templates/',
    'require(\'../../infrastructure/templates/': 'require(\'@templates/',
    'require(\'../../../infrastructure/strategies/': 'require(\'@strategies/',
    'require(\'../../infrastructure/strategies/': 'require(\'@strategies/',
    
    // Presentation
    'require(\'../../../presentation/api/': 'require(\'@api/',
    'require(\'../../presentation/api/': 'require(\'@api/',
    'require(\'../../../presentation/websocket/': 'require(\'@websocket/',
    'require(\'../../presentation/websocket/': 'require(\'@websocket/',
    
    // Legacy patterns (clean up)
    'require(\'./commands/': 'require(\'@commands/',
    'require(\'./handlers/': 'require(\'@handlers/',
    'require(\'./steps/': 'require(\'@steps/',
    'require(\'./workflows/': 'require(\'@workflows/',
};

// Import statements to convert
const IMPORT_MAPPINGS = {
    // Commands & Handlers
    'import.*from.*\'../../commands/': 'import $1 from \'@categories/',
    'import.*from.*\'../../../commands/categories/': 'import $1 from \'@categories/',
    'import.*from.*\'../../handlers/': 'import $1 from \'@handler-categories/',
    'import.*from.*\'../../../handlers/categories/': 'import $1 from \'@handler-categories/',
    
    // Steps & Workflows
    'import.*from.*\'../../../domain/workflows/steps/': 'import $1 from \'@steps/',
    'import.*from.*\'../../domain/workflows/steps/': 'import $1 from \'@steps/',
    'import.*from.*\'../../../domain/workflows/': 'import $1 from \'@workflows/',
    'import.*from.*\'../../domain/workflows/': 'import $1 from \'@workflows/',
    
    // Domain
    'import.*from.*\'../../../domain/entities/': 'import $1 from \'@entities/',
    'import.*from.*\'../../domain/entities/': 'import $1 from \'@entities/',
    'import.*from.*\'../../../domain/repositories/': 'import $1 from \'@repositories/',
    'import.*from.*\'../../domain/repositories/': 'import $1 from \'@repositories/',
    'import.*from.*\'../../../domain/services/': 'import $1 from \'@services/',
    'import.*from.*\'../../domain/services/': 'import $1 from \'@services/',
    'import.*from.*\'../../../domain/value-objects/': 'import $1 from \'@value-objects/',
    'import.*from.*\'../../domain/value-objects/': 'import $1 from \'@value-objects/',
    
    // Infrastructure
    'import.*from.*\'../../../infrastructure/messaging/': 'import $1 from \'@messaging/',
    'import.*from.*\'../../infrastructure/messaging/': 'import $1 from \'@messaging/',
    'import.*from.*\'../../../infrastructure/database/': 'import $1 from \'@database/',
    'import.*from.*\'../../infrastructure/database/': 'import $1 from \'@database/',
    'import.*from.*\'../../../infrastructure/external/': 'import $1 from \'@external/',
    'import.*from.*\'../../infrastructure/external/': 'import $1 from \'@external/',
    'import.*from.*\'../../../infrastructure/auth/': 'import $1 from \'@auth/',
    'import.*from.*\'../../infrastructure/auth/': 'import $1 from \'@auth/',
    'import.*from.*\'../../../infrastructure/auto/': 'import $1 from \'@auto/',
    'import.*from.*\'../../infrastructure/auto/': 'import $1 from \'@auto/',
    'import.*from.*\'../../../infrastructure/security/': 'import $1 from \'@security/',
    'import.*from.*\'../../infrastructure/security/': 'import $1 from \'@security/',
    'import.*from.*\'../../../infrastructure/logging/': 'import $1 from \'@logging/',
    'import.*from.*\'../../infrastructure/logging/': 'import $1 from \'@logging/',
    'import.*from.*\'../../../infrastructure/templates/': 'import $1 from \'@templates/',
    'import.*from.*\'../../infrastructure/templates/': 'import $1 from \'@templates/',
    'import.*from.*\'../../../infrastructure/strategies/': 'import $1 from \'@strategies/',
    'import.*from.*\'../../infrastructure/strategies/': 'import $1 from \'@strategies/',
    
    // Presentation
    'import.*from.*\'../../../presentation/api/': 'import $1 from \'@api/',
    'import.*from.*\'../../presentation/api/': 'import $1 from \'@api/',
    'import.*from.*\'../../../presentation/websocket/': 'import $1 from \'@websocket/',
    'import.*from.*\'../../presentation/websocket/': 'import $1 from \'@websocket/',
};

// Erweiterte Patterns für ALLE Relativpfade zu Meta-Ebenen
const RELATIVE_ALIAS_PATTERNS = [
  // Commands
  { regex: /require\(['"](\.\.\/)+application\/commands\/categories\/([a-zA-Z0-9_\/-]+)['"]\)/g, replace: "require('@categories/$2')" },
  { regex: /require\(['"](\.\.\/)+application\/commands\/([a-zA-Z0-9_\/-]+)['"]\)/g, replace: "require('@commands/$2')" },
  // Handlers
  { regex: /require\(['"](\.\.\/)+application\/handlers\/categories\/([a-zA-Z0-9_\/-]+)['"]\)/g, replace: "require('@handler-categories/$2')" },
  { regex: /require\(['"](\.\.\/)+application\/handlers\/([a-zA-Z0-9_\/-]+)['"]\)/g, replace: "require('@handlers/$2')" },
  // Steps
  { regex: /require\(['"](\.\.\/)+domain\/workflows\/steps\/categories\/([a-zA-Z0-9_\/-]+)['"]\)/g, replace: "require('@step-categories/$2')" },
  { regex: /require\(['"](\.\.\/)+domain\/workflows\/steps\/([a-zA-Z0-9_\/-]+)['"]\)/g, replace: "require('@steps/$2')" },
  // Workflows
  { regex: /require\(['"](\.\.\/)+domain\/workflows\/categories\/([a-zA-Z0-9_\/-]+)['"]\)/g, replace: "require('@workflow-categories/$2')" },
  { regex: /require\(['"](\.\.\/)+domain\/workflows\/([a-zA-Z0-9_\/-]+)['"]\)/g, replace: "require('@workflows/$2')" },
  // Frameworks
  { regex: /require\(['"](\.\.\/)+domain\/workflows\/frameworks\/([a-zA-Z0-9_\/-]+)['"]\)/g, replace: "require('@frameworks/$2')" },
  // Git
  { regex: /require\(['"](\.\.\/)+domain\/workflows\/git\/([a-zA-Z0-9_\/-]+)['"]\)/g, replace: "require('@git/$2')" },
  // Entities, Repositories, Services, etc.
  { regex: /require\(['"](\.\.\/)+domain\/entities\/([a-zA-Z0-9_\/-]+)['"]\)/g, replace: "require('@entities/$2')" },
  { regex: /require\(['"](\.\.\/)+domain\/repositories\/([a-zA-Z0-9_\/-]+)['"]\)/g, replace: "require('@repositories/$2')" },
  { regex: /require\(['"](\.\.\/)+domain\/services\/([a-zA-Z0-9_\/-]+)['"]\)/g, replace: "require('@services/$2')" },
  { regex: /require\(['"](\.\.\/)+domain\/value-objects\/([a-zA-Z0-9_\/-]+)['"]\)/g, replace: "require('@value-objects/$2')" },
  // Infrastructure
  { regex: /require\(['"](\.\.\/)+infrastructure\/messaging\/([a-zA-Z0-9_\/-]+)['"]\)/g, replace: "require('@messaging/$2')" },
  { regex: /require\(['"](\.\.\/)+infrastructure\/database\/([a-zA-Z0-9_\/-]+)['"]\)/g, replace: "require('@database/$2')" },
  { regex: /require\(['"](\.\.\/)+infrastructure\/external\/([a-zA-Z0-9_\/-]+)['"]\)/g, replace: "require('@external/$2')" },
  { regex: /require\(['"](\.\.\/)+infrastructure\/auth\/([a-zA-Z0-9_\/-]+)['"]\)/g, replace: "require('@auth/$2')" },
  { regex: /require\(['"](\.\.\/)+infrastructure\/auto\/([a-zA-Z0-9_\/-]+)['"]\)/g, replace: "require('@auto/$2')" },
  { regex: /require\(['"](\.\.\/)+infrastructure\/security\/([a-zA-Z0-9_\/-]+)['"]\)/g, replace: "require('@security/$2')" },
  { regex: /require\(['"](\.\.\/)+infrastructure\/logging\/([a-zA-Z0-9_\/-]+)['"]\)/g, replace: "require('@logging/$2')" },
  { regex: /require\(['"](\.\.\/)+infrastructure\/templates\/([a-zA-Z0-9_\/-]+)['"]\)/g, replace: "require('@templates/$2')" },
  { regex: /require\(['"](\.\.\/)+infrastructure\/strategies\/([a-zA-Z0-9_\/-]+)['"]\)/g, replace: "require('@strategies/$2')" },
  // Presentation
  { regex: /require\(['"](\.\.\/)+presentation\/api\/controllers\/([a-zA-Z0-9_\/-]+)['"]\)/g, replace: "require('@controllers/$2')" },
  { regex: /require\(['"](\.\.\/)+presentation\/api\/([a-zA-Z0-9_\/-]+)['"]\)/g, replace: "require('@api/$2')" },
  { regex: /require\(['"](\.\.\/)+presentation\/websocket\/([a-zA-Z0-9_\/-]+)['"]\)/g, replace: "require('@websocket/$2')" },
];

// Zusätzliche Pattern für direkte Command/Handler/Step-Imports ohne /categories/
const ADDITIONAL_PATTERNS = [
  // Commands
  { regex: /require\(['"](\.\.\/)+application\/commands\/([A-Za-z0-9_]+)Command['"]\)/g, aliasPrefix: '@categories', type: 'commands' },
  // Handlers
  { regex: /require\(['"](\.\.\/)+application\/handlers\/([A-Za-z0-9_]+)Handler['"]\)/g, aliasPrefix: '@handler-categories', type: 'handlers' },
];

async function findJavaScriptFiles() {
    return new Promise((resolve, reject) => {
        glob('backend/**/*.js', { ignore: ['node_modules/**', '*.min.js'] }, (err, files) => {
            if (err) reject(err);
            else resolve(files);
        });
    });
}

async function updateFileImports(filePath) {
    try {
        let content = await fs.readFile(filePath, 'utf8');
        let originalContent = content;
        let changes = 0;

        // Update require statements
        for (const [oldPattern, newPattern] of Object.entries(ALIAS_MAPPINGS)) {
            const regex = new RegExp(oldPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
            const matches = content.match(regex);
            if (matches) {
                content = content.replace(regex, newPattern);
                changes += matches.length;
            }
        }

        // Update import statements (ES6)
        for (const [oldPattern, newPattern] of Object.entries(IMPORT_MAPPINGS)) {
            const regex = new RegExp(oldPattern, 'g');
            const matches = content.match(regex);
            if (matches) {
                content = content.replace(regex, newPattern);
                changes += matches.length;
            }
        }

        // Neue: Ersetze ALLE Relativpfade zu Aliases
        for (const pattern of RELATIVE_ALIAS_PATTERNS) {
            const matches = content.match(pattern.regex);
            if (matches) {
                content = content.replace(pattern.regex, pattern.replace);
                changes += matches.length;
            }
        }

        // Zusätzliche: Ersetze direkte Command/Handler/Step-Imports ohne /categories/
        for (const pattern of ADDITIONAL_PATTERNS) {
            let match;
            while ((match = pattern.regex.exec(content)) !== null) {
                // match[2] ist der Name, z.B. SendMessage
                const name = match[2];
                // Versuche, die Datei in der Kategorie zu finden
                const categoriesDir = `backend/application/${pattern.type}/categories`;
                let found = false;
                let category = '';
                if (fsSync.existsSync(categoriesDir)) {
                  const cats = fsSync.readdirSync(categoriesDir);
                  for (const cat of cats) {
                    const candidate = `${categoriesDir}/${cat}/${name}${pattern.type === 'commands' ? 'Command' : 'Handler'}.js`;
                    if (fsSync.existsSync(candidate)) {
                      found = true;
                      category = cat;
                      break;
                    }
                  }
                }
                if (found) {
                  const oldImport = match[0];
                  const newImport = `require('${pattern.aliasPrefix}/${category}/${name}${pattern.type === 'commands' ? 'Command' : 'Handler'}')`;
                  content = content.replace(oldImport, newImport);
                  changes++;
                }
            }
        }

        if (changes > 0) {
            await fs.writeFile(filePath, content, 'utf8');
            return { filePath, changes };
        }

        return null;
    } catch (error) {
        console.error(`Error processing ${filePath}:`, error.message);
        return null;
    }
}

async function main() {
    console.log('🔄 Starting Import Path Update to Alias System...\n');

    try {
        const files = await findJavaScriptFiles();
        console.log(`📁 Found ${files.length} JavaScript files to process\n`);

        const results = [];
        let totalChanges = 0;

        for (const file of files) {
            const result = await updateFileImports(file);
            if (result) {
                results.push(result);
                totalChanges += result.changes;
                console.log(`✅ ${file}: ${result.changes} imports updated`);
            }
        }

        console.log(`\n🎉 Import Update Complete!`);
        console.log(`📊 Files modified: ${results.length}`);
        console.log(`📊 Total imports updated: ${totalChanges}`);

        if (results.length > 0) {
            console.log(`\n📝 Modified files:`);
            results.forEach(result => {
                console.log(`   - ${result.filePath} (${result.changes} changes)`);
            });
        }

    } catch (error) {
        console.error('❌ Error during import update:', error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { updateFileImports, ALIAS_MAPPINGS, IMPORT_MAPPINGS }; 