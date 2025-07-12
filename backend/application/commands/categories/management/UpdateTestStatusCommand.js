/**
 * UpdateTestStatusCommand - Command for updating test status
 */
class UpdateTestStatusCommand {
    constructor(filePath, testName, status, duration = 0, error = null, metadata = {}) {
        if (!filePath) {
            throw new Error('File path is required for test status update');
        }
        if (!testName) {
            throw new Error('Test name is required for test status update');
        }
        if (!status) {
            throw new Error('Status is required for test status update');
        }
        
        this.commandId = `update_test_status_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.filePath = filePath;
        this.testName = testName;
        this.status = status;
        this.duration = duration;
        this.error = error;
        this.metadata = { ...metadata };
        this.requestedBy = metadata.requestedBy || 'system';
        this.timestamp = new Date();
    }

    static create(filePath, testName, status, duration = 0, error = null, metadata = {}) {
        return new UpdateTestStatusCommand(filePath, testName, status, duration, error, metadata);
    }

    toJSON() {
        return {
            commandId: this.commandId,
            filePath: this.filePath,
            testName: this.testName,
            status: this.status,
            duration: this.duration,
            error: this.error,
            metadata: this.metadata,
            requestedBy: this.requestedBy,
            timestamp: this.timestamp
        };
    }

    getMetadata() {
        return this.metadata;
    }
}

module.exports = UpdateTestStatusCommand; 