const IDEDetectorFactory = require('./ide/IDEDetectorFactory');

class IDEDetector {
  constructor() {
    this.factory = new IDEDetectorFactory();
  }

  async scanForIDEs() {
    console.log('[IDEDetector] Scanning for all IDEs using factory pattern');
    return await this.factory.detectAll();
  }

  async scanForCursorIDEs() {
    console.log('[IDEDetector] Scanning for Cursor IDEs using factory');
    return await this.factory.detectByType('cursor');
  }

  async scanForVSCodeIDEs() {
    console.log('[IDEDetector] Scanning for VSCode IDEs using factory');
    return await this.factory.detectByType('vscode');
  }

  async scanForWindsurfIDEs() {
    console.log('[IDEDetector] Scanning for Windsurf IDEs using factory');
    return await this.factory.detectByType('windsurf');
  }

  async findAvailablePort(ideType = 'cursor') {
    console.log(`[IDEDetector] Finding available port for ${ideType} using factory`);
    return await this.factory.findAvailablePort(ideType);
  }

  async isPortAvailable(port, ideType = 'cursor') {
    console.log(`[IDEDetector] Checking if port ${port} is available for ${ideType} using factory`);
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