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
            
            // ✅ NEW: Initialize completion statistics
            let completedCount = 0;
            let totalProcessedFiles = 0;
            
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
                // Typ und Phase anhand des Dateinamens bestimmen
                let type = null, phase = null;
                if (filename.endsWith('-index.md')) {
                    type = 'feature_index';
                } else if (filename.match(/-phase-(\d+)\.md$/)) {
                    type = 'feature_phase';
                    phase = filename.match(/-phase-(\d+)\.md$/)[1];
                } else if (filename.endsWith('-implementation.md')) {
                    type = 'feature_implementation';
                } else if (filename.endsWith('-summary.md')) {
                    type = 'feature_summary';
                } else {
                    type = 'manual'; // Fallback für sonstige Dateien
                }
                
                // ✅ IMPORTANT: Import index files as tasks, fallback to implementation if no index exists
                if (type !== 'feature_index' && type !== 'feature_implementation') {
                    logger.debug(`Skipping non-index/implementation file: ${filename} (type: ${type})`);
                    continue;
                }
                
                // If this is an implementation file, check if an index file already exists
                if (type === 'feature_implementation') {
                    const indexFilename = filename.replace('-implementation.md', '-index.md');
                    const indexFilePath = path.join(path.dirname(filePath), indexFilename);
                    try {
                        await fs.access(indexFilePath);
                        // Index file exists, skip this implementation file
                        logger.debug(`Skipping implementation file ${filename} - index file exists`);
                        continue;
                    } catch (error) {
                        // Index file doesn't exist, use this implementation file as fallback
                        logger.debug(`Using implementation file ${filename} as fallback (no index file found)`);
                    }
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
                if (structure === 'index') {
                    progressInfo = this._parseIndexFileContent(content);
                }
                
                // Titel: name + ggf. Phase oder Index
                let title;
                if (structure === 'index') {
                    title = `${name} - Master Index`;
                } else if (structure === 'phase') {
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
                logger.info(`🔍 DEBUG: existing.length = ${existing.length}, condition: ${existing.length === 0}`);
                if (existing.length === 0) {
                    // ✅ FIXED: Extract status and progress from progressInfo for direct task creation
                    const taskStatus = progressInfo.status || 'pending';
                    const taskProgress = progressInfo.overallProgress || 0;
                    
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
                        // ✅ Remove status and progress from metadata since they're now main fields
                        ...Object.fromEntries(
                            Object.entries(progressInfo).filter(([key]) => 
                                key !== 'status' && key !== 'overallProgress'
                            )
                        ),
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
                    
                    // ✅ FIXED: Create task with explicit status and progress
                    const task = await this.taskService.createTask(
                        projectId,
                        title,
                        content,
                        'medium', // Priority kann aus content extrahiert werden
                        type,
                        taskMetadata
                    );
                    
                    // ✅ FIXED: Update task status and progress after creation
                    if (taskStatus !== 'pending') {
                        task.updateStatus(taskStatus);
                        logger.debug(`🔧 Updated task status to: ${taskStatus}`);
                    }
                    
                    // ✅ FIXED: Set progress in metadata for frontend compatibility
                    task.setMetadata('progress', taskProgress);
                    logger.debug(`🔧 Set task progress to: ${taskProgress}%`);
                    
                    // ✅ FIXED: Save the updated task
                    await this.taskRepository.update(task.id, task);
                    logger.debug(`💾 Saved updated task to database`);
                    
                    // ✅ NEW: Track completion statistics
                    totalProcessedFiles++;
                    if (taskStatus === 'completed') {
                        completedCount++;
                    }
                    
                    logger.info(`✅ Created task: "${title}" (${type}) for project "${projectId}" with status: ${taskStatus}, progress: ${taskProgress}%`);
                    importedTasks.push(task);
                } else {
                    // ✅ FIXED: Update existing task with current status and progress
                    const existingTask = existing[0];
                    const taskStatus = progressInfo.status || 'pending';
                    const taskProgress = progressInfo.overallProgress || 0;
                    
                    // ✅ CRITICAL FIX: Always log the found task details FIRST
                    const currentStatusValue = existingTask.status.value || existingTask.status;
                    logger.info(`🔄 DEBUG: Found existing task: "${title}" with current status: ${currentStatusValue}, new status: ${taskStatus}, progress: ${taskProgress}%`);
                    
                    // ✅ CRITICAL FIX: Always log the condition check
                    logger.info(`🔍 DEBUG: Status update condition check - taskStatus: "${taskStatus}", existingStatus: "${currentStatusValue}", condition: ${taskStatus !== 'pending' && currentStatusValue !== taskStatus}`);
                    
                    // Update task status if different
                    if (taskStatus !== 'pending' && currentStatusValue !== taskStatus) {
                        logger.info(`🔧 DEBUG: Updating status from ${currentStatusValue} to ${taskStatus}`);
                        existingTask.updateStatus(taskStatus);
                        logger.info(`🔧 Updated existing task status to: ${taskStatus}`);
                    } else {
                        logger.info(`⏭️ DEBUG: Skipping status update - taskStatus: ${taskStatus}, existingStatus: ${currentStatusValue}`);
                    }
                    
                    // Update task progress if different
                    logger.info(`🔍 DEBUG: Progress update check - current progress: ${existingTask.metadata?.progress || 0}, new progress: ${taskProgress}`);
                    if (existingTask.metadata?.progress !== taskProgress) {
                        logger.info(`🔧 DEBUG: Updating progress from ${existingTask.metadata?.progress || 0} to ${taskProgress}%`);
                        existingTask.setMetadata('progress', taskProgress);
                        logger.info(`🔧 Updated existing task progress to: ${taskProgress}%`);
                    } else {
                        logger.info(`⏭️ DEBUG: Skipping progress update - progress unchanged: ${taskProgress}`);
                    }
                    
                    // Save the updated task
                    const finalStatusValue = existingTask.status.value || existingTask.status;
                    logger.info(`💾 DEBUG: About to save task "${title}" with status: ${finalStatusValue}, progress: ${existingTask.metadata?.progress}`);
                    await this.taskRepository.update(existingTask.id, existingTask);
                    logger.info(`💾 DEBUG: Successfully saved task "${title}" to database`);
                    
                    // ✅ NEW: Verify the save worked by reloading the task
                    const reloadedTask = await this.taskRepository.findById(existingTask.id);
                    const reloadedStatusValue = reloadedTask.status.value || reloadedTask.status;
                    logger.info(`🔍 DEBUG: Reloaded task "${title}" from database - status: ${reloadedStatusValue}, progress: ${reloadedTask.metadata?.progress}`);
                    
                    // ✅ NEW: Track completion statistics
                    totalProcessedFiles++;
                    if (taskStatus === 'completed') {
                        completedCount++;
                    }
                    
                    importedTasks.push(existingTask);
                }
            }
            // ✅ NEW: Log completion summary
            const completionRate = totalProcessedFiles > 0 ? Math.round((completedCount / totalProcessedFiles) * 100) : 0;
            logger.info(`📊 TASK COMPLETION SUMMARY: ${completedCount}/${totalProcessedFiles} tasks completed (${completionRate}%)`);
            
            return {
                success: true,
                importedTasks,
                totalFiles: allFiles.length,
                importedCount: importedTasks.length,
                completedCount,
                completionRate,
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
            } else {
                // Calculate progress from phases if no explicit progress given
                progressInfo.overallProgress = this._calculateProgressFromPhases(content);
            }

            // Extract current phase
            const currentPhaseMatch = content.match(/Current Phase.*?Phase (\d+)/);
            if (currentPhaseMatch) {
                progressInfo.currentPhase = parseInt(currentPhaseMatch[1]);
            }

            // Extract status (with or without emoji)
            const statusMatch = content.match(/Status.*?(✅|❌|⏳|🔄|🚫)?\s*(\w+)/);
            if (statusMatch) {
                const emoji = statusMatch[1] || '';
                const statusText = statusMatch[2].toLowerCase();
                
                // Map emoji to status if present
                if (emoji === '✅') {
                    progressInfo.status = 'completed';
                } else if (emoji === '❌' || emoji === '🚫') {
                    progressInfo.status = 'blocked';
                } else if (emoji === '⏳' || emoji === '🔄') {
                    progressInfo.status = 'in_progress';
                } else {
                    progressInfo.status = statusText;
                }
                
                logger.info(`📊 [ManualTasksImportService] Status detected: ${emoji} ${statusText} -> ${progressInfo.status}`);
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

            // ✅ NEW: Check if feature is actually implemented
            const implementationStatus = this._checkImplementationStatus(content);
            if (implementationStatus.isImplemented) {
                progressInfo.status = 'completed';
                progressInfo.overallProgress = 100;
                progressInfo.implementationVerified = true;
                progressInfo.implementationFiles = implementationStatus.files;
                logger.info(`✅ Feature implementation detected: ${implementationStatus.files.length} files found`);
            }

            return progressInfo;
            
        } catch (error) {
            logger.error(`❌ [ManualTasksImportService] Error parsing index file:`, error);
            return {};
        }
    }

    /**
     * Calculate progress percentage based on phase completion
     */
    _calculateProgressFromPhases(content) {
        try {
            // Look for phase status patterns like "✅ Complete", "⏳ Pending", etc.
            const phaseMatches = content.matchAll(/(?:Phase \d+|Phase \d+ of \d+).*?(✅|❌|⏳|🔄|🚫)?\s*(Complete|Pending|In Progress|Blocked|Planning)/gi);
            
            let completedPhases = 0;
            let totalPhases = 0;
            
            for (const match of phaseMatches) {
                totalPhases++;
                const emoji = match[1] || '';
                const status = match[2].toLowerCase();
                
                // Count as completed if ✅ or "complete"
                if (emoji === '✅' || status === 'complete') {
                    completedPhases++;
                }
            }
            
            // Also check for individual phase status in tables
            const tablePhaseMatches = content.matchAll(/\| (\d+[A-Z]?) \|.*?\| (🟢|🟡|🔴|✅) /g);
            for (const match of tablePhaseMatches) {
                totalPhases++;
                const status = match[2];
                if (status === '✅' || status === '🟢') {
                    completedPhases++;
                }
            }
            
            if (totalPhases > 0) {
                const calculatedProgress = Math.round((completedPhases / totalPhases) * 100);
                logger.info(`📊 [ManualTasksImportService] Progress calculated: ${completedPhases}/${totalPhases} phases = ${calculatedProgress}%`);
                return calculatedProgress;
            }
            
            return 0;
            
        } catch (error) {
            logger.error(`❌ [ManualTasksImportService] Error calculating progress from phases:`, error);
            return 0;
        }
    }

    /**
     * Check if feature is actually implemented by looking for implementation files
     */
    _checkImplementationStatus(content) {
        try {
            const fs = require('fs');
            const path = require('path');
            
            // Check if this is the task panel completion filter feature
            if (content.includes('task panel completion filter') || content.includes('Task Panel Completion Filter')) {
                const workspacePath = process.cwd();
                const requiredFiles = [
                    'frontend/src/utils/taskCompletionUtils.js',
                    'frontend/src/components/TaskCompletionBadge.jsx',
                    'frontend/tests/unit/TaskCompletionUtils.test.js',
                    'frontend/tests/unit/TaskCompletionBadge.test.jsx',
                    'frontend/tests/integration/TasksPanelCompletionFilter.test.jsx'
                ];

                const existingFiles = [];
                for (const file of requiredFiles) {
                    try {
                        const filePath = path.join(workspacePath, file);
                        if (fs.existsSync(filePath)) {
                            existingFiles.push(file);
                        }
                    } catch (error) {
                        // File doesn't exist
                    }
                }

                const isImplemented = existingFiles.length >= 4; // At least 4 out of 5 files
                
                return {
                    isImplemented,
                    files: existingFiles,
                    feature: 'task-panel-completion-filter'
                };
            }

            // Add more feature checks here as needed
            return { isImplemented: false, files: [], feature: 'unknown' };
            
        } catch (error) {
            logger.error(`❌ [ManualTasksImportService] Error checking implementation status:`, error);
            return { isImplemented: false, files: [], feature: 'error' };
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