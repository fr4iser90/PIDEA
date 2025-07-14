const IDEStarterFactory = require('./ide/IDEStarterFactory');
const ServiceLogger = require('@logging/ServiceLogger');
const logger = new ServiceLogger('IDEStarter');


class IDEStarter {
  constructor() {
    this.factory = new IDEStarterFactory();
  }

  async startIDE(port, workspacePath = null, ideType = 'cursor') {
    logger.info(`[IDEStarter] Starting ${ideType} IDE on port ${port} using factory`);
    return await this.factory.startIDE(ideType, port, workspacePath);
  }

  async startCursorIDE(port, workspacePath = null) {
    logger.info(`[IDEStarter] Starting Cursor IDE on port ${port} using factory`);
    return await this.factory.startIDE('cursor', port, workspacePath);
  }

  async startVSCode(port, workspacePath = null) {
    logger.info(`[IDEStarter] Starting VSCode IDE on port ${port} using factory`);
    return await this.factory.startIDE('vscode', port, workspacePath);
  }

  async startWindsurf(port, workspacePath = null) {
    logger.info(`[IDEStarter] Starting Windsurf IDE on port ${port} using factory`);
    return await this.factory.startIDE('windsurf', port, workspacePath);
  }

  async stopIDE(port, ideType = 'cursor') {
    logger.info(`[IDEStarter] Stopping ${ideType} IDE on port ${port} using factory`);
    return await this.factory.stopIDE(port, ideType);
  }

  async stopAllIDEs() {
    logger.info('[IDEStarter] Stopping all IDEs using factory');
    return await this.factory.stopAllIDEs();
  }

  getRunningIDEs() {
    logger.info('[IDEStarter] Getting running IDEs using factory');
    return this.factory.getRunningIDEs();
  }

  isIDERunning(port, ideType = 'cursor') {
    return this.factory.isIDERunning(port, ideType);
  }

  // Factory delegation methods
  getAvailableStarters() {
    return this.factory.getAvailableStarters();
  }

  getStarterStats() {
    return this.factory.getStarterStats();
  }

  validateStarter(type) {
    return this.factory.validateStarter(type);
  }
}

module.exports = IDEStarter; 