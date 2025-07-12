/**
 * DocsImportService - Importiert Docs aus TEMP-Dateien in die Datenbank
 * Verwendet FileBasedWorkspaceDetector für TEMP-Logik
 */
const fs = require('fs').promises;
const path = require('path');
const FileBasedWorkspaceDetector = require('./workspace/FileBasedWorkspaceDetector');

class DocsImportService {
    constructor(browserManager, taskService, taskRepository) {
        this.browserManager = browserManager;
        this.taskService = taskService;
        this.taskRepository = taskRepository;
        this.fileDetector = new FileBasedWorkspaceDetector(browserManager);
    }

    /**
     * HAUPTMETHODE: Importiere Docs aus TEMP oder erstelle TEMP mit Playwright
     * @param {string} projectId - Projekt ID
     * @param {number} port - IDE Port
     * @returns {Promise<Object>} Import Ergebnis
     */
    async importDocsFromTemp(projectId, port = 9222) {
        console.log(`🔄 [DocsImportService] Starting docs import for project ${projectId} on port ${port}`);
        
        try {
            // 1. TEMP-Dateien checken
            const tempData = await this._checkTempFiles(port);
            
            if (tempData) {
                console.log(`✅ [DocsImportService] Found existing TEMP data for port ${port}`);
                return await this._importFromTempData(tempData, projectId);
            }
            
            // 2. TEMP nicht da → Playwright machen lassen
            console.log(`🔄 [DocsImportService] No TEMP data found, creating with Playwright...`);
            const newTempData = await this._createTempWithPlaywright(port);
            
            if (newTempData) {
                console.log(`✅ [DocsImportService] Created TEMP data with Playwright`);
                return await this._importFromTempData(newTempData, projectId);
            }
            
            throw new Error('Failed to create TEMP data with Playwright');
            
        } catch (error) {
            console.error(`❌ [DocsImportService] Import failed:`, error);
            throw error;
        }
    }

    /**
     * Checke ob TEMP-Dateien vorhanden sind
     */
    async _checkTempFiles(port) {
        try {
            const basePath = `/tmp/IDEWEB/${port}`;
            
            // Prüfe ob Verzeichnis existiert
            try {
                await fs.access(basePath);
            } catch {
                return null; // Verzeichnis existiert nicht
            }
            
            // Prüfe ob workspace.txt existiert und nicht leer ist
            const workspaceFile = `${basePath}/workspace.txt`;
            try {
                const workspaceContent = await fs.readFile(workspaceFile, 'utf8');
                if (!workspaceContent.trim()) {
                    return null; // Datei ist leer
                }
                
                console.log(`✅ [DocsImportService] Found existing TEMP files for port ${port}`);
                return await this._readTempFiles(port);
                
            } catch {
                return null; // Datei existiert nicht
            }
            
        } catch (error) {
            console.error(`❌ [DocsImportService] Error checking TEMP files:`, error);
            return null;
        }
    }

    /**
     * Erstelle TEMP-Dateien mit Playwright
     */
    async _createTempWithPlaywright(port) {
        try {
            console.log(`🔄 [DocsImportService] Creating TEMP files with Playwright for port ${port}...`);
            
            // Verwende FileBasedWorkspaceDetector für Playwright-Logik
            const workspaceInfo = await this.fileDetector.getWorkspaceInfo(port);
            
            if (workspaceInfo && workspaceInfo.workspace) {
                console.log(`✅ [DocsImportService] Created TEMP data:`, workspaceInfo.workspace);
                return workspaceInfo;
            }
            
            throw new Error('FileBasedWorkspaceDetector failed to create TEMP data');
            
        } catch (error) {
            console.error(`❌ [DocsImportService] Error creating TEMP with Playwright:`, error);
            throw error;
        }
    }

    /**
     * Lese TEMP-Dateien
     */
    async _readTempFiles(port) {
        try {
            const basePath = `/tmp/IDEWEB/${port}`;
            const workspaceInfo = {
                port: port,
                workspace: null,
                files: [],
                gitStatus: null,
                info: null,
                session: null,
                timestamp: new Date().toISOString()
            };

            // Workspace-Pfad lesen
            try {
                const workspaceContent = await fs.readFile(`${basePath}/workspace.txt`, 'utf8');
                workspaceInfo.workspace = workspaceContent.trim();
            } catch (error) {
                console.error(`❌ [DocsImportService] Error reading workspace.txt:`, error);
            }

            // Files-Liste lesen
            try {
                const filesContent = await fs.readFile(`${basePath}/files.txt`, 'utf8');
                workspaceInfo.files = filesContent.split('\n').filter(line => line.trim());
            } catch (error) {
                console.error(`❌ [DocsImportService] Error reading files.txt:`, error);
            }

            // Git-Status lesen
            try {
                const gitContent = await fs.readFile(`${basePath}/git-status.txt`, 'utf8');
                workspaceInfo.gitStatus = gitContent.trim();
            } catch (error) {
                console.error(`❌ [DocsImportService] Error reading git-status.txt:`, error);
            }

            // Info-File lesen
            try {
                const infoContent = await fs.readFile(`${basePath}/info.txt`, 'utf8');
                workspaceInfo.info = infoContent.trim();
            } catch (error) {
                console.error(`❌ [DocsImportService] Error reading info.txt:`, error);
            }

            // Session-Info lesen
            try {
                const sessionContent = await fs.readFile(`${basePath}/terminal-session.txt`, 'utf8');
                workspaceInfo.session = sessionContent.trim();
            } catch (error) {
                console.error(`❌ [DocsImportService] Error reading terminal-session.txt:`, error);
            }

            return workspaceInfo;
            
        } catch (error) {
            console.error(`❌ [DocsImportService] Error reading TEMP files:`, error);
            throw error;
        }
    }

    /**
     * Importiere aus TEMP-Daten in die Datenbank
     */
    async _importFromTempData(tempData, projectId) {
        try {
            console.log(`🔄 [DocsImportService] Importing from TEMP data to database...`);
            
            if (!tempData.workspace) {
                throw new Error('No workspace path in TEMP data');
            }
            
            const workspacePath = tempData.workspace;
            const docsTasksPath = path.join(workspacePath, 'docs', '09_roadmap', 'features');
            
            console.log(`🔍 [DocsImportService] Looking for docs at: ${docsTasksPath}`);
            
            // Prüfe ob docs-Verzeichnis existiert
            try {
                await fs.access(docsTasksPath);
            } catch {
                throw new Error(`Documentation path not found: ${docsTasksPath}`);
            }
            
            const importedTasks = [];
            
            // Lese alle markdown-Dateien
            const files = await fs.readdir(docsTasksPath);
            const markdownFiles = files.filter(file => file.endsWith('.md'));
            
            console.log(`📁 [DocsImportService] Found ${markdownFiles.length} markdown files`);
            
            for (const filename of markdownFiles) {
                const filePath = path.join(docsTasksPath, filename);
                const content = await fs.readFile(filePath, 'utf8');
                
                console.log(`🔍 [DocsImportService] Processing file: ${filename}`);
                
                // Parse markdown content
                const taskInfo = this._parseDocsTaskFromMarkdown(content, filename);
                
                if (taskInfo) {
                    // Prüfe ob Task bereits existiert
                    const existingTask = await this.taskRepository.findByTitle(taskInfo.title);
                    
                    if (!existingTask) {
                        console.log(`✅ [DocsImportService] Creating task: ${taskInfo.title}`);
                        
                        // Erstelle Task in Datenbank
                        const task = await this.taskService.createTask(
                            projectId,
                            taskInfo.title,
                            content,
                            taskInfo.priority,
                            taskInfo.type,
                            {
                                source: 'docs_sync',
                                filename: filename,
                                filePath: filePath,
                                importedAt: new Date(),
                                content: content,
                                category: taskInfo.category,
                                ...taskInfo.metadata
                            }
                        );
                        
                        if (task) {
                            importedTasks.push(task);
                            console.log(`✅ [DocsImportService] Imported task: ${taskInfo.title}`);
                        }
                    } else {
                        console.log(`⚠️ [DocsImportService] Task already exists: ${taskInfo.title}`);
                    }
                }
            }
            
            console.log(`✅ [DocsImportService] Import completed: ${importedTasks.length} tasks imported`);
            
            return {
                success: true,
                importedTasks,
                totalFiles: markdownFiles.length,
                importedCount: importedTasks.length,
                workspacePath: workspacePath,
                tempData: tempData
            };
            
        } catch (error) {
            console.error(`❌ [DocsImportService] Import from TEMP failed:`, error);
            throw error;
        }
    }

    /**
     * Parse markdown content für Task-Info
     */
    _parseDocsTaskFromMarkdown(content, filename) {
        try {
            // Extract title from first line
            const titleMatch = content.match(/^#\s+(.+)$/m);
            const title = titleMatch ? titleMatch[1].trim() : filename.replace('.md', '');

            // Extract priority
            let priority = 'medium';
            if (content.includes('KRITISCH') || content.includes('CRITICAL')) {
                priority = 'critical';
            } else if (content.includes('HIGH') || content.includes('HOCH')) {
                priority = 'high';
            } else if (content.includes('LOW') || content.includes('NICHTIG') || content.includes('NIEDRIG')) {
                priority = 'low';
            }

            // Extract type
            let type = 'feature';
            if (content.includes('refactor') || content.includes('Refactor')) {
                type = 'refactor';
            } else if (content.includes('bug') || content.includes('Bug')) {
                type = 'bug';
            } else if (content.includes('test') || content.includes('Test')) {
                type = 'test';
            } else if (content.includes('documentation') || content.includes('docs')) {
                type = 'documentation';
            }

            // Extract category from filename or content
            let category = null;
            const categoryMatch = filename.match(/^(\w+)_/);
            if (categoryMatch) {
                category = categoryMatch[1];
            } else if (content.includes('Category:')) {
                const categoryMatch = content.match(/Category:\s*(\w+)/i);
                if (categoryMatch) {
                    category = categoryMatch[1];
                }
            }

            return {
                title,
                priority,
                type,
                category,
                metadata: {}
            };
            
        } catch (error) {
            console.error(`❌ [DocsImportService] Error parsing markdown:`, error);
            return null;
        }
    }
}

module.exports = DocsImportService; 