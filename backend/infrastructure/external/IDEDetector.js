const IDEDetectorFactory = require('./ide/IDEDetectorFactory');

class IDEDetector {
  constructor() {
    this.factory = new IDEDetectorFactory();
  }

  async scanForIDEs() {
    return await this.factory.detectAll();
  }

  async scanForCursorIDEs() {
    return await this.factory.detectByType('cursor');
  }

  async scanForVSCodeIDEs() {
    return await this.factory.detectByType('vscode');
  }

  async scanForWindsurfIDEs() {
    return await this.factory.detectByType('windsurf');
  }

  async findAvailablePort(ideType = 'cursor') {
    return await this.factory.findAvailablePort(ideType);
  }

  async isPortAvailable(port, ideType = 'cursor') {
    return await this.factory.checkPort(port, ideType);
  }

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