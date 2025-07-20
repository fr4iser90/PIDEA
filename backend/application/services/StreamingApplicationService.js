const PortStreamingCommand = require('@commands/categories/management/PortStreamingCommand');
const PortStreamingHandler = require('@handlers/categories/management/PortStreamingHandler');
const Logger = require('@logging/Logger');

class StreamingApplicationService {
    constructor(dependencies = {}) {
        this.logger = dependencies.logger || new Logger('StreamingApplicationService');
        this.eventBus = dependencies.eventBus;
        this.commandBus = dependencies.commandBus;
        this.portStreamingHandler = new PortStreamingHandler();
    }

    async startPortStreaming(projectId, port, userId) {
        try {
            this.logger.info('StreamingApplicationService: Starting port streaming', { projectId, port, userId });
            
            const command = new PortStreamingCommand({
                projectId,
                port,
                action: 'start',
                userId
            });

            const result = await this.portStreamingHandler.handle(command);
            return {
                success: true,
                data: result
            };
        } catch (error) {
            this.logger.error('Error starting port streaming:', error);
            throw error;
        }
    }

    async stopPortStreaming(projectId, port, userId) {
        try {
            this.logger.info('StreamingApplicationService: Stopping port streaming', { projectId, port, userId });
            
            const command = new PortStreamingCommand({
                projectId,
                port,
                action: 'stop',
                userId
            });

            const result = await this.portStreamingHandler.handle(command);
            return {
                success: true,
                data: result
            };
        } catch (error) {
            this.logger.error('Error stopping port streaming:', error);
            throw error;
        }
    }

    async getStreamingStatus(projectId, userId) {
        try {
            this.logger.info('StreamingApplicationService: Getting streaming status', { projectId, userId });
            
            const result = await this.portStreamingHandler.getStatus(projectId);
            return {
                success: true,
                data: result
            };
        } catch (error) {
            this.logger.error('Error getting streaming status:', error);
            throw error;
        }
    }

    async listActiveStreams(userId) {
        try {
            this.logger.info('StreamingApplicationService: Listing active streams', { userId });
            
            const result = await this.portStreamingHandler.listActiveStreams();
            return {
                success: true,
                data: result
            };
        } catch (error) {
            this.logger.error('Error listing active streams:', error);
            throw error;
        }
    }

    async updateStreamingConfiguration(projectId, config, userId) {
        try {
            this.logger.info('StreamingApplicationService: Updating streaming configuration', { projectId, userId });
            
            const result = await this.portStreamingHandler.updateConfiguration(projectId, config);
            return {
                success: true,
                data: result
            };
        } catch (error) {
            this.logger.error('Error updating streaming configuration:', error);
            throw error;
        }
    }

    async getPortStatus(port, userId) {
        try {
            this.logger.info('StreamingApplicationService: Getting port status', { port, userId });
            
            // Note: This would need to be implemented in the domain layer
            // For now, return a placeholder implementation
            const portInfo = {
                port: port,
                isActive: false,
                status: 'inactive'
            };
            
            return {
                success: true,
                data: portInfo
            };
        } catch (error) {
            this.logger.error('Error getting port status:', error);
            throw error;
        }
    }

    async getAllPorts(userId) {
        try {
            this.logger.info('StreamingApplicationService: Getting all ports', { userId });
            
            // Note: This would need to be implemented in the domain layer
            const ports = [];
            
            return {
                success: true,
                data: ports
            };
        } catch (error) {
            this.logger.error('Error getting all ports:', error);
            throw error;
        }
    }

    async getStreamingStats(userId) {
        try {
            this.logger.info('StreamingApplicationService: Getting streaming stats', { userId });
            
            // Note: This would need to be implemented in the domain layer
            const stats = {
                totalStreams: 0,
                activeStreams: 0,
                totalDataTransferred: 0
            };
            
            return {
                success: true,
                data: stats
            };
        } catch (error) {
            this.logger.error('Error getting streaming stats:', error);
            throw error;
        }
    }

    async stopAllStreaming(userId) {
        try {
            this.logger.info('StreamingApplicationService: Stopping all streaming', { userId });
            
            // Note: This would need to be implemented in the domain layer
            const stoppedCount = 0;
            
            return {
                success: true,
                data: { stoppedCount }
            };
        } catch (error) {
            this.logger.error('Error stopping all streaming:', error);
            throw error;
        }
    }
}

module.exports = StreamingApplicationService; 