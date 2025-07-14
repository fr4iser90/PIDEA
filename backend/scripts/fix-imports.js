
require('module-alias/register');
const fs = require('fs');
const path = require('path');

/**
 * Fix import patterns in all JavaScript files
 * Replaces @/domain/ with @/domain/, @/application/ with @/application/, etc.
 */
function fixImports() {
    const backendDir = path.join(__dirname, '..');
    const patterns = [
        { from: '@/domain/', to: '@/domain/' },
        { from: '@/application/', to: '@/application/' },
        { from: '@/infrastructure/', to: '@/infrastructure/' },
        { from: '@/presentation/', to: '@/presentation/' },
        { from: '@/tests/', to: '@/tests/' },
        { from: '@/cli/', to: '@/cli/' },
        { from: '@/scripts/', to: '@/scripts/' }
    ];

    function processDirectory(dir) {
        const files = fs.readdirSync(dir);
        logger.info(`Processing directory: ${dir} (${files.length} items)`);
        
        for (const file of files) {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            
            if (stat.isDirectory()) {
                // Skip node_modules and .git
                if (file !== 'node_modules' && file !== '.git' && !file.startsWith('.')) {
                    processDirectory(filePath);
                }
            } else if (file.endsWith('.js')) {
                logger.info(`Checking file: ${filePath}`);
                fixFileImports(filePath, patterns);
            }
        }
    }

    function fixFileImports(filePath, patterns) {
        try {
            let content = fs.readFileSync(filePath, 'utf8');
            let modified = false;
            
            for (const pattern of patterns) {
                const regex = new RegExp(`require\\('${pattern.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^']+)'\\)`, 'g');
                const newContent = content.replace(regex, `require('${pattern.to}$1')`);
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');
                
                if (newContent !== content) {
                    content = newContent;
                    modified = true;
                    logger.info(`Fixed imports in: ${filePath}`);
                }
            }
            
            if (modified) {
                fs.writeFileSync(filePath, content, 'utf8');
            }
        } catch (error) {
            logger.error(`Error processing ${filePath}:`, error.message);
        }
    }

    logger.info('Starting import pattern fixes...');
    processDirectory(backendDir);
    logger.info('Import pattern fixes completed!');
}

if (require.main === module) {
    fixImports();
}

module.exports = { fixImports }; 