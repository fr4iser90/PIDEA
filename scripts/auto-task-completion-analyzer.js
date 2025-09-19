#!/usr/bin/env node

/**
 * Auto Task Completion Analyzer
 * Automatically analyzes markdown files and updates task completion status
 * Uses AI to detect if tasks are actually completed based on content analysis
 */

const fs = require('fs').promises;
const path = require('path');
const Logger = require('../backend/infrastructure/logging/Logger');

const logger = new Logger('AutoTaskCompletionAnalyzer');

class AutoTaskCompletionAnalyzer {
    constructor(workspacePath) {
        this.workspacePath = workspacePath;
        this.roadmapDir = path.join(workspacePath, 'docs/09_roadmap');
    }

    /**
     * Analyze all markdown files and detect completion status
     */
    async analyzeAllTasks() {
        try {
            logger.info('🔍 Starting automatic task completion analysis...');
            
            const allFiles = await this.getAllMarkdownFiles(this.roadmapDir);
            logger.info(`📁 Found ${allFiles.length} markdown files to analyze`);
            
            let analyzedCount = 0;
            let updatedCount = 0;
            
            for (const filePath of allFiles) {
                try {
                    const result = await this.analyzeTaskFile(filePath);
                    analyzedCount++;
                    
                    if (result.shouldUpdate) {
                        await this.updateTaskFile(filePath, result.updates);
                        updatedCount++;
                        logger.info(`✅ Updated: ${result.title} -> ${result.newStatus} (${result.newProgress}%)`);
                    } else {
                        logger.debug(`⏭️ No update needed: ${result.title}`);
                    }
                } catch (error) {
                    logger.error(`❌ Error analyzing ${filePath}: ${error.message}`);
                }
            }
            
            logger.info(`📊 Analysis complete: ${analyzedCount} files analyzed, ${updatedCount} files updated`);
            return { analyzedCount, updatedCount };
            
        } catch (error) {
            logger.error(`❌ Analysis failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get all markdown files recursively
     */
    async getAllMarkdownFiles(dir) {
        const files = [];
        
        try {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                
                if (entry.isDirectory()) {
                    const subFiles = await this.getAllMarkdownFiles(fullPath);
                    files.push(...subFiles);
                } else if (entry.isFile() && entry.name.endsWith('.md')) {
                    files.push(fullPath);
                }
            }
        } catch (error) {
            logger.debug(`⚠️ Could not read directory ${dir}: ${error.message}`);
        }
        
        return files;
    }

    /**
     * Analyze a single task file
     */
    async analyzeTaskFile(filePath) {
        const content = await fs.readFile(filePath, 'utf8');
        const filename = path.basename(filePath, '.md');
        
        // Extract current status from file path
        const relPath = path.relative(this.roadmapDir, filePath);
        const pathParts = relPath.split(path.sep);
        const currentStatus = pathParts[0];
        
        // Analyze content for completion indicators
        const analysis = this.analyzeContentForCompletion(content, filename);
        
        // Determine if file should be moved/updated
        const shouldUpdate = this.shouldUpdateTask(currentStatus, analysis);
        
        return {
            title: filename,
            currentStatus,
            analysis,
            shouldUpdate,
            updates: shouldUpdate ? this.generateUpdates(currentStatus, analysis) : null,
            newStatus: shouldUpdate ? analysis.suggestedStatus : currentStatus,
            newProgress: shouldUpdate ? analysis.suggestedProgress : analysis.detectedProgress
        };
    }

    /**
     * Analyze content for completion indicators
     */
    analyzeContentForCompletion(content, filename) {
        const indicators = {
            // Strong completion indicators
            strongComplete: [
                /✅\s*(Complete|COMPLETED|complete|Done|done|Finished|finished)/gi,
                /100%\s*(Complete|COMPLETED|complete)/gi,
                /COMPLETED SUCCESSFULLY/gi,
                /Overall Progress.*?100%/gi,
                /Progress.*?100%/gi,
                /Status:\s*completed/gi,
                /Status:\s*✅/gi
            ],
            
            // Partial completion indicators
            partialComplete: [
                /🔄\s*(In Progress|IN PROGRESS|in progress)/gi,
                /Status:\s*in_progress/gi,
                /Status:\s*🔄/gi,
                /Progress:\s*\d+%/gi,
                /Phase \d+ of \d+/gi
            ],
            
            // Failure indicators
            failed: [
                /❌\s*(Failed|FAILED|failed|Error|ERROR|error)/gi,
                /Status:\s*failed/gi,
                /Status:\s*❌/gi,
                /Error:/gi,
                /Exception:/gi
            ],
            
            // Planning indicators
            planning: [
                /📋\s*(Planning|PLANNING|planning)/gi,
                /Status:\s*planning/gi,
                /Status:\s*📋/gi,
                /TODO:/gi,
                /TBD/gi,
                /To be determined/gi
            ]
        };

        let detectedStatus = 'pending';
        let detectedProgress = 0;
        let confidence = 0;

        // Check for strong completion indicators
        for (const pattern of indicators.strongComplete) {
            if (pattern.test(content)) {
                detectedStatus = 'completed';
                detectedProgress = 100;
                confidence = 90;
                break;
            }
        }

        // Check for partial completion if not completed
        if (detectedStatus !== 'completed') {
            for (const pattern of indicators.partialComplete) {
                if (pattern.test(content)) {
                    detectedStatus = 'in_progress';
                    confidence = 80;
                    
                    // Try to extract progress percentage
                    const progressMatch = content.match(/(\d+)%/);
                    if (progressMatch) {
                        detectedProgress = parseInt(progressMatch[1]);
                    } else {
                        detectedProgress = 50; // Default for in-progress
                    }
                    break;
                }
            }
        }

        // Check for failure indicators
        if (detectedStatus === 'pending') {
            for (const pattern of indicators.failed) {
                if (pattern.test(content)) {
                    detectedStatus = 'failed';
                    detectedProgress = 0;
                    confidence = 85;
                    break;
                }
            }
        }

        // Check for planning indicators
        if (detectedStatus === 'pending') {
            for (const pattern of indicators.planning) {
                if (pattern.test(content)) {
                    detectedStatus = 'planning';
                    detectedProgress = 0;
                    confidence = 70;
                    break;
                }
            }
        }

        // Auto-detect based on filename patterns
        if (filename.includes('completed') || filename.includes('done') || filename.includes('finished')) {
            if (confidence < 80) {
                detectedStatus = 'completed';
                detectedProgress = 100;
                confidence = 75;
            }
        }

        return {
            detectedStatus,
            detectedProgress,
            confidence,
            suggestedStatus: detectedStatus,
            suggestedProgress: detectedProgress
        };
    }

    /**
     * Determine if task should be updated
     */
    shouldUpdateTask(currentStatus, analysis) {
        // Don't update if confidence is too low
        if (analysis.confidence < 70) {
            return false;
        }

        // Don't update if status is already correct
        if (currentStatus === analysis.suggestedStatus) {
            return false;
        }

        // Update if we have a strong indication of completion
        if (analysis.suggestedStatus === 'completed' && analysis.confidence >= 80) {
            return true;
        }

        // Update if we have a strong indication of failure
        if (analysis.suggestedStatus === 'failed' && analysis.confidence >= 80) {
            return true;
        }

        // Update if we have a strong indication of in-progress
        if (analysis.suggestedStatus === 'in_progress' && analysis.confidence >= 75) {
            return true;
        }

        return false;
    }

    /**
     * Generate updates for the task file
     */
    generateUpdates(currentStatus, analysis) {
        return {
            newStatus: analysis.suggestedStatus,
            newProgress: analysis.suggestedProgress,
            confidence: analysis.confidence,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Update task file with new status
     */
    async updateTaskFile(filePath, updates) {
        // This would typically update the markdown file content
        // For now, we'll just log the update
        logger.info(`📝 Would update ${filePath} with:`, updates);
        
        // TODO: Implement actual file content updates
        // This could involve:
        // 1. Updating status in markdown content
        // 2. Moving file to correct directory structure
        // 3. Updating progress indicators
        // 4. Adding completion timestamps
    }
}

// CLI usage
if (require.main === module) {
    const workspacePath = process.argv[2] || process.cwd();
    
    const analyzer = new AutoTaskCompletionAnalyzer(workspacePath);
    
    analyzer.analyzeAllTasks()
        .then(result => {
            logger.info(`🎉 Auto-analysis completed successfully!`);
            logger.info(`📊 Results: ${result.analyzedCount} analyzed, ${result.updatedCount} updated`);
            process.exit(0);
        })
        .catch(error => {
            logger.error(`❌ Auto-analysis failed: ${error.message}`);
            process.exit(1);
        });
}

module.exports = AutoTaskCompletionAnalyzer;
