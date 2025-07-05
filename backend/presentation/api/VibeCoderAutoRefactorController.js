const VibeCoderAutoRefactorCommand = require('@application/commands/vibecoder/VibeCoderAutoRefactorCommand');

class VibeCoderAutoRefactorController {
    constructor(commandBus) {
        this.commandBus = commandBus;
        if (!this.commandBus) {
            throw new Error('Command bus is required');
        }
    }

    async startAutoRefactor(req, res) {
        try {
            const { projectPath } = req.body;
            
            if (!projectPath) {
                return res.status(400).json({
                    success: false,
                    message: 'Project path is required'
                });
            }

            const command = new VibeCoderAutoRefactorCommand(projectPath);
            const result = await this.commandBus.execute('VibeCoderAutoRefactorCommand', command);

            res.json({
                success: true,
                message: result.message,
                data: {
                    tasks: result.tasks,
                    largeFiles: result.largeFiles,
                    totalTasks: result.tasks.length
                }
            });

        } catch (error) {
            console.error('Auto Refactor Controller Error:', error);
            res.status(500).json({
                success: false,
                message: 'Auto refactor failed',
                error: error.message
            });
        }
    }
}

module.exports = VibeCoderAutoRefactorController; 