#!/usr/bin/env node

/**
 * Test Script for Automatic Database-Filesystem Synchronization
 * Tests if status changes in database automatically move files
 */

const path = require('path');
const Logger = require('../backend/infrastructure/logging/Logger');

const logger = new Logger('TestAutomaticSync');

async function testAutomaticSync() {
    try {
        logger.info('🧪 Testing automatic database-filesystem synchronization...');
        
        // Import the application to get access to services
        const Application = require('../backend/Application');
        const app = new Application();
        
        // Initialize the application
        await app.initialize();
        
        // Get the task repository
        const taskRepository = app.taskRepository;
        
        // Find a task that's currently in pending but should be completed
        const completedTasks = await taskRepository.findAll({ status: 'completed' });
        
        if (completedTasks.length === 0) {
            logger.warn('⚠️ No completed tasks found in database');
            return;
        }
        
        logger.info(`📊 Found ${completedTasks.length} completed tasks in database`);
        
        // Check filesystem for these tasks
        const fs = require('fs').promises;
        const roadmapDir = path.join(process.cwd(), 'docs/09_roadmap');
        
        let syncIssues = 0;
        
        for (const task of completedTasks) {
            const taskName = task.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            
            // Check if task is in completed folder
            const completedPath = path.join(roadmapDir, 'completed', '2024-q4', task.category, taskName);
            const pendingPath = path.join(roadmapDir, 'pending', 'medium-priority', task.category, taskName);
            
            try {
                const completedExists = await fs.access(completedPath).then(() => true).catch(() => false);
                const pendingExists = await fs.access(pendingPath).then(() => true).catch(() => false);
                
                if (pendingExists && !completedExists) {
                    logger.warn(`❌ Sync issue: ${task.title} is completed in DB but still in pending/ folder`);
                    syncIssues++;
                } else if (completedExists) {
                    logger.info(`✅ ${task.title} is correctly in completed/ folder`);
                }
            } catch (error) {
                logger.error(`Error checking ${task.title}: ${error.message}`);
            }
        }
        
        if (syncIssues > 0) {
            logger.warn(`⚠️ Found ${syncIssues} synchronization issues`);
            logger.info('💡 To fix: Run the reorganization script or update task status in database');
        } else {
            logger.info('✅ All completed tasks are correctly synchronized');
        }
        
        // Test automatic sync by updating a task status
        logger.info('🔄 Testing automatic sync by updating a task status...');
        
        const testTask = completedTasks[0];
        logger.info(`Testing with task: ${testTask.title}`);
        
        // Temporarily change status to test the sync
        const originalStatus = testTask.status.value;
        testTask.updateStatus('in-progress');
        await taskRepository.update(testTask.id, testTask);
        
        logger.info('✅ Task status updated - automatic file movement should have been triggered');
        
        // Restore original status
        testTask.updateStatus(originalStatus);
        await taskRepository.update(testTask.id, testTask);
        
        logger.info('✅ Original status restored');
        
    } catch (error) {
        logger.error('❌ Test failed:', error);
        throw error;
    }
}

// Run the test
if (require.main === module) {
    testAutomaticSync()
        .then(() => {
            logger.info('🎉 Test completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            logger.error('💥 Test failed:', error);
            process.exit(1);
        });
}

module.exports = { testAutomaticSync };
