class VibeCoderAutoRefactorCommand {
    constructor(projectPath) {
        this.projectPath = projectPath;
        this.timestamp = new Date().toISOString();
    }
}

module.exports = VibeCoderAutoRefactorCommand; 