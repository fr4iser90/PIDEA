/**
 * ManualTasksImportService - Importiert Manual Tasks direkt aus dem Workspace in die Datenbank
 * DATABASE ONLY - Keine TEMP-Logik!
 */
const fs = require('fs').promises;
const path = require('path');
const Logger = require('@logging/Logger');
const logger = new Logger('ImportService');

class ManualTasksImportService {
    constructor(browserManager, taskService, taskRepository) {
        this.browserManager = browserManager;
        this.taskService = taskService;
        this.taskRepository = taskRepository;
    }

    /**
     * HAUPTMETHODE: Importiere Manual Tasks direkt aus Workspace in die Datenbank
     * @param {string} projectId - Projekt ID
     * @param {string} workspacePath - Workspace Pfad
     * @returns {Promise<Object>} Import Ergebnis
     */
    async importManualTasksFromWorkspace(projectId, workspacePath) {
        logger.info(`🔄 [ManualTasksImportService] Starting manual tasks import for project ${projectId} from workspace: ${workspacePath}`);
        
        try {
            return await this._importFromWorkspace(workspacePath, projectId);
        } catch (error) {
            logger.error(`❌ [ManualTasksImportService] Import failed:`, error);
            throw error;
        }
    }

    /**
     * Importiere aus Workspace direkt in die Datenbank
     */
    async _importFromWorkspace(workspacePath, projectId) {
        try {
            logger.info(`🔄 [ManualTasksImportService] Importing from workspace to database: ${workspacePath}`);
            if (!workspacePath) {
                throw new Error('No workspace path provided');
            }
            const featuresDir = path.join(workspacePath, 'docs/09_roadmap/tasks');
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
            logger.info(`📁 Found ${allFiles.length} markdown files in ${featuresDir}`);
            const importedTasks = [];
            for (const filePath of allFiles) {
                // category = Ordner unter features, name = Ordner unter category
                const rel = path.relative(featuresDir, filePath);
                const parts = rel.split(path.sep);
                if (parts.length < 3) {
                    logger.debug(`⏭️ Skipping file with insufficient path parts: ${rel} (${parts.length} parts)`);
                    continue; // category/name/file
                }
                const category = parts[0];
                const name = parts[1];
                const filename = parts[2];
                // All manual tasks should be 'documentation' type
                let type = 'documentation', phase = null;
                if (filename.match(/-phase-(\d+)\.md$/)) {
                    phase = filename.match(/-phase-(\d+)\.md$/)[1];
                }
                
                // Determine structure type for metadata
                let structure = 'implementation'; // default
                if (filename.endsWith('-index.md')) {
                    structure = 'index';
                } else if (filename.endsWith('-implementation.md')) {
                    structure = 'implementation';
                } else if (filename.match(/-phase-(\d+)\.md$/)) {
                    structure = 'phase';
                } else if (filename.endsWith('-summary.md')) {
                    structure = 'summary';
                }
                const content = await fs.readFile(filePath, 'utf8');
                
                // Erstelle einen eindeutigen Identifier für das Feature
                const featureId = `${category}_${name}`;
                
                // Parse Index File für Progress-Informationen
                let progressInfo = {};
                if (type === 'feature_index') {
                    progressInfo = this._parseIndexFileContent(content);
                }
                
                // Titel: name + ggf. Phase oder Index
                let title;
                if (type === 'feature_index') {
                    title = `${name} - Master Index`;
                } else if (type === 'feature_phase') {
                    title = `${name} Phase ${phase}`;
                } else {
                    title = name;
                }
                title = title.replace(/-/g, ' ');
                
                // Prüfe ob Task schon existiert (nach title+projectId+category+type+phase)
                const existing = await this.taskRepository.findAll({
                    title: title,
                    projectId: projectId
                });
                logger.info(`🔍 Checking for existing task: "${title}" in project "${projectId}" - Found: ${existing.length}`);
                if (existing.length === 0) {
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
                        projectPath: workspacePath, // ✅ Setze projectPath beim Import
                        structure, // ✅ Structure type (index, phase, implementation, summary)
                        ...progressInfo, // Füge Progress-Informationen hinzu
                    };
                    
                    // Füge Structure-spezifische Metadaten hinzu
                    if (structure === 'index') {
                        taskMetadata.isIndexTask = true;
                        taskMetadata.indexForFeature = featureId;
                    } else if (structure === 'phase') {
                        taskMetadata.phaseNumber = parseInt(phase);
                        taskMetadata.isPhaseTask = true;
                    } else if (structure === 'implementation') {
                        taskMetadata.isImplementationTask = true;
                    } else if (structure === 'summary') {
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
                    logger.info(`✅ Created task: "${title}" (${type}) for project "${projectId}"`);
                    importedTasks.push(task);
                } else {
                    logger.debug(`⏭️ Skipping existing task: "${title}" in project "${projectId}"`);
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
            logger.error(`❌ [ManualTasksImportService] Import from workspace failed:`, error);
            throw error;
        }
    }

    /**
     * Parse markdown content für Task-Info
     */
    _parseManualTaskFromMarkdown(content, filename) {
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

            // All manual tasks from roadmap/features should be 'documentation' type
            let type = 'documentation';
            
            // Determine structure type for metadata
            let structure = 'implementation'; // default
            if (content.includes('Master Index') || content.includes('📋 Task Overview')) {
                structure = 'index';
            } else if (filename.includes('Phase')) {
                structure = 'phase';
            } else if (filename.includes('summary') || content.includes('Summary')) {
                structure = 'summary';
            } else if (filename.includes('implementation') || content.includes('Implementation')) {
                structure = 'implementation';
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
                structure, // ✅ Return structure for metadata
                metadata: {}
            };
            
        } catch (error) {
            logger.error(`❌ [ManualTasksImportService] Error parsing markdown:`, error);
            return null;
        }
    }

    /**
     * Parse Index File für Progress-Informationen
     */
    _parseIndexFileContent(content) {
        try {
            const progressInfo = {};

            // Extract overall progress
            const progressMatch = content.match(/Overall Progress.*?(\d+)%/);
            if (progressMatch) {
                progressInfo.overallProgress = parseInt(progressMatch[1]);
            }

            // Extract current phase
            const currentPhaseMatch = content.match(/Current Phase.*?Phase (\d+)/);
            if (currentPhaseMatch) {
                progressInfo.currentPhase = parseInt(currentPhaseMatch[1]);
            }

            // Extract status
            const statusMatch = content.match(/Status.*?(\w+)/);
            if (statusMatch) {
                progressInfo.status = statusMatch[1].toLowerCase();
            }

            // Extract estimated completion
            const completionMatch = content.match(/Estimated Completion.*?(\d{4}-\d{2}-\d{2})/);
            if (completionMatch) {
                progressInfo.estimatedCompletion = completionMatch[1];
            }

            // Extract time tracking
            const timeMatch = content.match(/Actual Time.*?(\d+) hours/);
            if (timeMatch) {
                progressInfo.actualTime = parseInt(timeMatch[1]);
            }

            // Extract phase breakdown
            const phaseMatches = content.matchAll(/\| (\d+[A-Z]?) \|.*?\| (🟢|🟡|🔴|✅) /g);
            const phases = [];
            for (const match of phaseMatches) {
                phases.push({
                    phase: match[1],
                    status: match[2] === '🟢' ? 'planning' : 
                           match[2] === '🟡' ? 'in_progress' : 
                           match[2] === '🔴' ? 'blocked' : 'completed'
                });
            }
            progressInfo.phases = phases;

            return progressInfo;
            
        } catch (error) {
            logger.error(`❌ [ManualTasksImportService] Error parsing index file:`, error);
            return {};
        }
    }

    /**
     * Update Index File mit neuem Progress
     */
    async updateIndexFileProgress(projectId, featureId, progressData) {
        try {
            logger.info(`🔄 [ManualTasksImportService] Updating index file progress for feature ${featureId}`);
            
            // Finde das Index File für dieses Feature
            const indexTask = await this.taskRepository.findByMetadata({
                featureId,
                isIndexTask: true
            });
            
            if (!indexTask) {
                logger.warn(`⚠️ [ManualTasksImportService] No index file found for feature ${featureId}`);
                return false;
            }
            
            // Update Progress-Informationen in den Metadaten
            const updatedMetadata = {
                ...indexTask.metadata,
                ...progressData,
                lastUpdated: new Date()
            };
            
            // Update Task in der Datenbank
            await this.taskRepository.updateTask(indexTask.id, {
                metadata: updatedMetadata
            });
            
            logger.info(`✅ [ManualTasksImportService] Index file progress updated for feature ${featureId}`);
            return true;
            
        } catch (error) {
            logger.error(`❌ [ManualTasksImportService] Error updating index file progress:`, error);
            return false;
        }
    }

    /**
     * Get Progress für ein Feature aus dem Index File
     */
    async getFeatureProgress(projectId, featureId) {
        try {
            const indexTask = await this.taskRepository.findByMetadata({
                featureId,
                isIndexTask: true
            });
            
            if (!indexTask) {
                return null;
            }
            
            return {
                overallProgress: indexTask.metadata.overallProgress || 0,
                currentPhase: indexTask.metadata.currentPhase || 1,
                status: indexTask.metadata.status || 'planning',
                estimatedCompletion: indexTask.metadata.estimatedCompletion,
                actualTime: indexTask.metadata.actualTime || 0,
                phases: indexTask.metadata.phases || []
            };
            
        } catch (error) {
            logger.error(`❌ [ManualTasksImportService] Error getting feature progress:`, error);
            return null;
        }
    }
}

module.exports = ManualTasksImportService; 