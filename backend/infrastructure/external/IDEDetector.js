const IDEDetectorFactory = require('./ide/IDEDetectorFactory');
const ServiceLogger = require('@logging/ServiceLogger');
const logger = new ServiceLogger('IDEDetector');


class IDEDetector {
  constructor() {
    this.factory = new IDEDetectorFactory();
  }

  async scanForIDEs() {
    logger.info('Scanning for all IDEs using factory pattern');
    return await this.factory.detectAll();
  }

  async scanForCursorIDEs() {
    logger.info('Scanning for Cursor IDEs using factory');
    return await this.factory.detectByType('cursor');
  }

  async scanForVSCodeIDEs() {
    logger.info('Scanning for VSCode IDEs using factory');
    return await this.factory.detectByType('vscode');
  }

  async scanForWindsurfIDEs() {
    logger.info('Scanning for Windsurf IDEs using factory');
    return await this.factory.detectByType('windsurf');
  }

  async findAvailablePort(ideType = 'cursor') {
    logger.info(`Finding available port for ${ideType} using factory`);
    return await this.factory.findAvailablePort(ideType);
  }

  async isPortAvailable(port, ideType = 'cursor') {
    logger.info(`Checking if port ${port} is available for ${ideType} using factory`);
    return await this.factory.checkPort(port, ideType);
  }

  // Legacy method for backward compatibility
  async checkPort(port) {
    return await this.isPortAvailable(port, 'cursor');
  }

  // Factory delegation methods
  getAvailableDetectors() {
    return this.factory.getAvailableDetectors();
  }

  getDetectorStats() {
    return this.factory.getDetectorStats();
  }

  validateDetector(type) {
    return this.factory.validateDetector(type);
  }
}

module.exports = IDEDetector; 