class IDEController {
  constructor(ideManager, eventBus) {
    this.ideManager = ideManager;
    this.eventBus = eventBus;
  }

  async getAvailableIDEs(req, res) {
    try {
      const availableIDEs = await this.ideManager.getAvailableIDEs();
      res.json({
        success: true,
        data: availableIDEs
      });
    } catch (error) {
      console.error('[IDEController] Error getting available IDEs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get available IDEs'
      });
    }
  }

  async startIDE(req, res) {
    try {
      const { workspacePath } = req.body;
      const ideInfo = await this.ideManager.startNewIDE(workspacePath);
      
      // Publish event
      if (this.eventBus) {
        await this.eventBus.publish('ideAdded', {
          port: ideInfo.port,
          status: ideInfo.status
        });
      }
      
      res.json({
        success: true,
        data: ideInfo
      });
    } catch (error) {
      console.error('[IDEController] Error starting IDE:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start IDE'
      });
    }
  }

  async switchIDE(req, res) {
    try {
      const port = parseInt(req.params.port);
      const result = await this.ideManager.switchToIDE(port);
      
      // Publish event
      if (this.eventBus) {
        await this.eventBus.publish('activeIDEChanged', {
          port: port,
          previousPort: this.ideManager.getActivePort()
        });
      }
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('[IDEController] Error switching IDE:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to switch IDE'
      });
    }
  }

  async stopIDE(req, res) {
    try {
      const port = parseInt(req.params.port);
      const result = await this.ideManager.stopIDE(port);
      
      // Publish event
      if (this.eventBus) {
        await this.eventBus.publish('ideRemoved', {
          port: port
        });
      }
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('[IDEController] Error stopping IDE:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to stop IDE'
      });
    }
  }

  async getStatus(req, res) {
    try {
      const status = this.ideManager.getStatus();
      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      console.error('[IDEController] Error getting status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get IDE status'
      });
    }
  }
}

module.exports = IDEController; 