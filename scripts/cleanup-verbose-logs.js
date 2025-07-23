#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Cleanup Verbose Logs Script
 * Removes or reduces verbose logging that's no longer needed now that the system is working
 */

class LogCleanup {
    constructor() {
        this.verbosePatterns = [
            // IDE Application Service verbose logs
            {
                file: 'backend/application/services/IDEApplicationService.js',
                patterns: [
                    {
                        search: /this\.logger\.info\('IDEApplicationService: Getting available IDEs', \{ userId \}\);?/g,
                        replace: '// this.logger.info(\'IDEApplicationService: Getting available IDEs\', { userId });'
                    },
                    {
                        search: /this\.logger\.info\('Returning cached IDE data'\);?/g,
                        replace: '// this.logger.info(\'Returning cached IDE data\');'
                    },
                    {
                        search: /this\.logger\.info\('IDEApplicationService: Getting IDE status', \{ userId \}\);?/g,
                        replace: '// this.logger.info(\'IDEApplicationService: Getting IDE status\', { userId });'
                    },
                    {
                        search: /this\.logger\.info\('IDEApplicationService: Getting workspace info for all IDEs', \{ userId \}\);?/g,
                        replace: '// this.logger.info(\'IDEApplicationService: Getting workspace info for all IDEs\', { userId });'
                    }
                ]
            },
            // Git Application Service verbose logs
            {
                file: 'backend/application/services/GitApplicationService.js',
                patterns: [
                    {
                        search: /this\.logger\.info\('GitApplicationService: Getting Git status', \{ projectId, userId \}\);?/g,
                        replace: '// this.logger.info(\'GitApplicationService: Getting Git status\', { projectId, userId });'
                    }
                ]
            },
            // Git Controller verbose logs
            {
                file: 'backend/presentation/api/GitController.js',
                patterns: [
                    {
                        search: /this\.logger\.info\('GitController: Getting Git status', \{ projectId, userId \}\);?/g,
                        replace: '// this.logger.info(\'GitController: Getting Git status\', { projectId, userId });'
                    }
                ]
            },
            // Task Application Service verbose logs
            {
                file: 'backend/application/services/TaskApplicationService.js',
                patterns: [
                    {
                        search: /this\.logger\.info\(`Getting tasks for project: \$\{projectId\}`\);?/g,
                        replace: '// this.logger.info(`Getting tasks for project: ${projectId}`);'
                    }
                ]
            },
            // Task Controller verbose logs
            {
                file: 'backend/presentation/api/TaskController.js',
                patterns: [
                    {
                        search: /this\.logger\.info\(`Getting tasks for project: \$\{projectId\}`\);?/g,
                        replace: '// this.logger.info(`Getting tasks for project: ${projectId}`);'
                    }
                ]
            },
            // IDEMirror Application Service verbose logs
            {
                file: 'backend/application/services/IDEMirrorApplicationService.js',
                patterns: [
                    {
                        search: /this\.logger\.info\('IDEMirrorApplicationService: Getting IDE state', \{ userId \}\);?/g,
                        replace: '// this.logger.info(\'IDEMirrorApplicationService: Getting IDE state\', { userId });'
                    },
                    {
                        search: /this\.logger\.info\('IDEMirrorApplicationService: Getting available IDEs', \{ userId \}\);?/g,
                        replace: '// this.logger.info(\'IDEMirrorApplicationService: Getting available IDEs\', { userId });'
                    }
                ]
            },
            // Project Application Service verbose logs
            {
                file: 'backend/application/services/ProjectApplicationService.js',
                patterns: [
                    {
                        search: /this\.logger\.info\(`Getting project by IDE port: \$\{idePort\}`\);?/g,
                        replace: '// this.logger.info(`Getting project by IDE port: ${idePort}`);'
                    }
                ]
            },
            // Analysis Application Service verbose logs
            {
                file: 'backend/application/services/AnalysisApplicationService.js',
                patterns: [
                    {
                        search: /this\.logger\.info\('✅ Returning cached analysis result'\);?/g,
                        replace: '// this.logger.info(\'✅ Returning cached analysis result\');'
                    }
                ]
            },
            // WebChat Application Service verbose logs
            {
                file: 'backend/application/services/WebChatApplicationService.js',
                patterns: [
                    {
                        search: /this\.logger\.info\('Getting port chat history:', \{/g,
                        replace: '// this.logger.info(\'Getting port chat history:\', {'
                    }
                ]
            },
            // Git Service verbose logs
            {
                file: 'backend/infrastructure/external/GitService.js',
                patterns: [
                    {
                        search: /this\.logger\.info\('GitService: Getting current branch using step', \{ repoPath \}\);?/g,
                        replace: '// this.logger.info(\'GitService: Getting current branch using step\', { repoPath });'
                    },
                    {
                        search: /this\.logger\.info\('GitService: Getting branches using step', \{ repoPath, includeRemote, includeLocal \}\);?/g,
                        replace: '// this.logger.info(\'GitService: Getting branches using step\', { repoPath, includeRemote, includeLocal });'
                    },
                    {
                        search: /this\.logger\.info\('GitService: Getting status using step', \{ repoPath, porcelain \}\);?/g,
                        replace: '// this.logger.info(\'GitService: Getting status using step\', { repoPath, porcelain });'
                    },
                    {
                        search: /this\.logger\.info\(`Aktueller Branch für \$\{repoPath\}: "\$\{currentBranch\}"`\);?/g,
                        replace: '// this.logger.info(`Aktueller Branch für ${repoPath}: "${currentBranch}"`);'
                    }
                ]
            },
            // Chat History Extractor verbose logs
            {
                file: 'backend/domain/services/chat/ChatHistoryExtractor.js',
                patterns: [
                    {
                        search: /logger\.info\('Conversation context updated:', \{/g,
                        replace: '// logger.info(\'Conversation context updated:\', {'
                    }
                ]
            }
        ];
    }

    /**
     * Clean up verbose logs in a file
     */
    cleanupFile(fileConfig) {
        const filePath = path.resolve(fileConfig.file);
        
        if (!fs.existsSync(filePath)) {
            console.log(`⚠️  File not found: ${filePath}`);
            return false;
        }

        let content = fs.readFileSync(filePath, 'utf8');
        let modified = false;

        fileConfig.patterns.forEach(pattern => {
            if (pattern.search.test(content)) {
                content = content.replace(pattern.search, pattern.replace);
                modified = true;
                console.log(`✅ Commented out verbose log in ${fileConfig.file}`);
            }
        });

        if (modified) {
            fs.writeFileSync(filePath, content, 'utf8');
            return true;
        }

        return false;
    }

    /**
     * Run the cleanup
     */
    run() {
        console.log('🧹 Starting verbose log cleanup...\n');

        let totalModified = 0;

        this.verbosePatterns.forEach(fileConfig => {
            if (this.cleanupFile(fileConfig)) {
                totalModified++;
            }
        });

        console.log(`\n✅ Cleanup complete! Modified ${totalModified} files.`);
        console.log('\n📝 Verbose logs have been commented out. You can uncomment them later if needed for debugging.');
    }

    /**
     * Restore verbose logs (uncomment them)
     */
    restore() {
        console.log('🔄 Restoring verbose logs...\n');

        let totalModified = 0;

        this.verbosePatterns.forEach(fileConfig => {
            const filePath = path.resolve(fileConfig.file);
            
            if (!fs.existsSync(filePath)) {
                return;
            }

            let content = fs.readFileSync(filePath, 'utf8');
            let modified = false;

            fileConfig.patterns.forEach(pattern => {
                const restorePattern = pattern.replace.replace(/^\/\/ /, '');
                if (content.includes(pattern.replace)) {
                    content = content.replace(new RegExp(pattern.replace.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), restorePattern);
                    modified = true;
                    console.log(`✅ Restored verbose log in ${fileConfig.file}`);
                }
            });

            if (modified) {
                fs.writeFileSync(filePath, content, 'utf8');
                totalModified++;
            }
        });

        console.log(`\n✅ Restoration complete! Modified ${totalModified} files.`);
    }
}

// CLI handling
const args = process.argv.slice(2);
const cleanup = new LogCleanup();

if (args.includes('--restore') || args.includes('-r')) {
    cleanup.restore();
} else {
    cleanup.run();
} 