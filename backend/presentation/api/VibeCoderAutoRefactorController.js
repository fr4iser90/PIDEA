const VibeCoderAutoRefactorCommand = require('@application/commands/vibecoder/VibeCoderAutoRefactorCommand');
const VibeCoderAutoRefactorHandler = require('@application/handlers/vibecoder/VibeCoderAutoRefactorHandler');

class VibeCoderAutoRefactorController {
    constructor() {
        this.handler = new VibeCoderAutoRefactorHandler();
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
            const result = await this.handler.handle(command);

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