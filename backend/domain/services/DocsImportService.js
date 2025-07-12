/**
 * DocsImportService - Importiert Docs direkt aus dem Workspace in die Datenbank
 * DATABASE ONLY - Keine TEMP-Logik!
 */
const fs = require('fs').promises;
const path = require('path');

class DocsImportService {
    constructor(browserManager, taskService, taskRepository) {
        this.browserManager = browserManager;
        this.taskService = taskService;
        this.taskRepository = taskRepository;
    }

    /**
     * HAUPTMETHODE: Importiere Docs direkt aus Workspace in die Datenbank
     * @param {string} projectId - Projekt ID
     * @param {string} workspacePath - Workspace Pfad
     * @returns {Promise<Object>} Import Ergebnis
     */
    async importDocsFromWorkspace(projectId, workspacePath) {
        console.log(`🔄 [DocsImportService] Starting docs import for project ${projectId} from workspace: ${workspacePath}`);
        
        try {
            return await this._importFromWorkspace(workspacePath, projectId);
        } catch (error) {
            console.error(`❌ [DocsImportService] Import failed:`, error);
            throw error;
        }
    }

    /**
     * Importiere aus Workspace direkt in die Datenbank
     */
    async _importFromWorkspace(workspacePath, projectId) {
        try {
            console.log(`🔄 [DocsImportService] Importing from workspace to database: ${workspacePath}`);
            if (!workspacePath) {
                throw new Error('No workspace path provided');
            }
            const featuresDir = path.join(workspacePath, 'docs/09_roadmap/features');
            // Hilfsfunktion: rekursiv alle .md-Dateien finden
            async function getAllMarkdownFiles(dir) {
                let results = [];
                const list = await fs.readdir(dir);
                for (const file of list) {
                    const filePath = path.join(dir, file);
                    const stat = await fs.stat(filePath);
                    if (stat.isDirectory()) {
                        results = results.concat(await getAllMarkdownFiles(filePath));
                    } else if (file.endsWith('.md')) {
                        results.push(filePath);
                    }
                }
                return results;
            }
            const allFiles = await getAllMarkdownFiles(featuresDir);
            const importedTasks = [];
            for (const filePath of allFiles) {
                // category = Ordner unter features, name = Ordner unter category
                const rel = path.relative(featuresDir, filePath);
                const parts = rel.split(path.sep);
                if (parts.length < 3) continue; // category/name/file
                const category = parts[0];
                const name = parts[1];
                const filename = parts[2];
                let type = 'feature_summary', phase = null;
                if (filename.endsWith('-implementation.md')) {
                    type = 'feature_implementation';
                } else if (filename.match(/-phase-(\d+)\.md$/)) {
                    type = 'feature_phase';
                    phase = filename.match(/-phase-(\d+)\.md$/)[1];
                }
                const content = await fs.readFile(filePath, 'utf8');
                
                // Erstelle einen eindeutigen Identifier für das Feature
                const featureId = `${category}_${name}`;
                
                // Titel: name + ggf. Phase
                const title = `${name}${type==='feature_phase'?` Phase ${phase}`:''}`.replace(/-/g, ' ');
                
                // Prüfe ob Task schon existiert (nach title+category+type+phase)
                const existing = await this.taskRepository.findByTitle(title);
                if (!existing) {
                    // Erstelle Task mit Gruppierungs-Metadaten
                    const taskMetadata = {
                        category,
                        name,
                        phase,
                        filename,
                        filePath,
                        importedAt: new Date(),
                        featureId, // Eindeutige ID für das Feature
                        featureGroup: `${category}/${name}`, // Gruppierungs-Key
                    };
                    
                    // Füge Phase-spezifische Metadaten hinzu
                    if (type === 'feature_phase') {
                        taskMetadata.phaseNumber = parseInt(phase);
                        taskMetadata.isPhaseTask = true;
                    } else if (type === 'feature_implementation') {
                        taskMetadata.isImplementationTask = true;
                    } else if (type === 'feature_summary') {
                        taskMetadata.isSummaryTask = true;
                    }
                    
                    const task = await this.taskService.createTask(
                        projectId,
                        title,
                        content,
                        'medium', // Priority kann aus content extrahiert werden
                        type,
                        taskMetadata
                    );
                    importedTasks.push(task);
                }
            }
            return {
                success: true,
                importedTasks,
                totalFiles: allFiles.length,
                importedCount: importedTasks.length,
                workspacePath
            };
        } catch (error) {
            console.error(`❌ [DocsImportService] Import from workspace failed:`, error);
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