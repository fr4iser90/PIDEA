/**
 * UpdateTestStatusHandler - Handler for updating test status
 */
const TestManagementService = require('@/domain/services/TestManagementService');

class UpdateTestStatusHandler {
    constructor(testManagementService = new TestManagementService()) {
        this.testManagementService = testManagementService;
    }

    /**
     * Handle the UpdateTestStatusCommand
     * @param {UpdateTestStatusCommand} command - The command to handle
     * @returns {Promise<Object>} - The result of the operation
     */
    async handle(command) {
        try {
            // Validate command
            if (!command.filePath || !command.testName || !command.status) {
                throw new Error('Invalid command: missing required fields');
            }

            // Update test status using the service
            const testMetadata = await this.testManagementService.updateTestStatus(
                command.filePath,
                command.testName,
                command.status,
                command.duration,
                command.error
            );

            // Return success result
            return {
                success: true,
                commandId: command.commandId,
                testMetadata: testMetadata.toJSON(),
                message: `Test status updated successfully: ${command.testName} is now ${command.status}`,
                timestamp: new Date()
            };

        } catch (error) {
            // Return error result
            return {
                success: false,
                commandId: command.commandId,
                error: error.message,
                message: `Failed to update test status: ${error.message}`,
                timestamp: new Date()
            };
        }
    }

    /**
     * Handle multiple test status updates
     * @param {UpdateTestStatusCommand[]} commands - Array of commands to handle
     * @returns {Promise<Object[]>} - Array of results
     */
    async handleBatch(commands) {
        const results = [];
        
        for (const command of commands) {
            const result = await this.handle(command);
            results.push(result);
        }
        
        return results;
    }

    /**
     * Validate command before handling
     * @param {UpdateTestStatusCommand} command - The command to validate
     * @returns {boolean} - True if valid, false otherwise
     */
    validateCommand(command) {
        if (!command) return false;
        if (!command.filePath) return false;
        if (!command.testName) return false;
        if (!command.status) return false;
        
        // Validate status values
        const validStatuses = ['passing', 'failing', 'skipped', 'pending', 'unknown'];
        if (!validStatuses.includes(command.status)) return false;
        
        // Validate duration
        if (command.duration < 0) return false;
        
        return true;
    }
}

module.exports = UpdateTestStatusHandler; 