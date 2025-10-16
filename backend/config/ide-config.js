/**
 * IDE Configuration
 * IDE-specific settings: ports, health checks, workspace detection
 */

const appConfig = require("./app-config");

class IDEConfig {
  constructor() {
    this.knownVersions = {
      cursor: ["1.5.7", "1.7.17"],
      vscode: ["1.85.0"],
      windsurf: ["1.0.3"],
    };
  }

  // ============================================================================
  // IDE PORT RANGES
  // ============================================================================

  get cursorPortStart() {
    return process.env.CURSOR_PORT_START;
  }

  get cursorPortEnd() {
    return process.env.CURSOR_PORT_END;
  }

  get vscodePortStart() {
    return process.env.VSCODE_PORT_START;
  }

  get vscodePortEnd() {
    return process.env.VSCODE_PORT_END;
  }

  get windsurfPortStart() {
    return process.env.WINDSURF_PORT_START;
  }

  get windsurfPortEnd() {
    return process.env.WINDSURF_PORT_END;
  }

  // ============================================================================
  // CONFIGURATION OBJECTS
  // ============================================================================

  get ideConfig() {
    return {
      portRange: {
        cursor: {
          start: this.cursorPortStart,
          end: this.cursorPortEnd,
        },
        vscode: {
          start: this.vscodePortStart,
          end: this.vscodePortEnd,
        },
        windsurf: {
          start: this.windsurfPortStart,
          end: this.windsurfPortEnd,
        },
      },
      healthCheckInterval: appConfig.isProduction ? 2000 : 1000,
      cleanupInterval: appConfig.isProduction ? 60000 : 30000,
      maxConcurrentIDEs: appConfig.isProduction ? 20 : 10,
      autoStart: false,
      logLevel: appConfig.isProduction ? "warn" : "debug",
    };
  }

  get workspaceDetectionConfig() {
    return {
      enabled: true,
      interval: 30000,
      maxSearchDepth: 10,
      cacheTimeout: 300000,
      enableFallback: true,
    };
  }

  get cdpConfig() {
    return {
      connectionTimeout: 5000,
      maxConnections: 5,
      cleanupInterval: 60000,
      healthCheckInterval: 30000,
    };
  }

  // ============================================================================
  // IDE-SPECIFIC SETTINGS
  // ============================================================================

  getKnownVersions(ideType) {
    return this.knownVersions[ideType] || [];
  }

  getAllKnownVersions() {
    return this.knownVersions;
  }

  getDefaultConfig(ideType) {
    const defaults = {
      cursor: {
        port: 3000,
        workspacePath: "/workspace",
        autoStart: false,
      },
      vscode: {
        port: 3000,
        workspacePath: "/workspace",
        autoStart: false,
      },
      windsurf: {
        port: 3000,
        workspacePath: "/workspace",
        autoStart: false,
      },
    };

    return defaults[ideType] || defaults.cursor;
  }

  // ============================================================================
  // VALIDATION
  // ============================================================================

  validate() {
    const errors = [];
    const warnings = [];

    const portRanges = [
      { name: "CURSOR", start: this.cursorPortStart, end: this.cursorPortEnd },
      { name: "VSCODE", start: this.vscodePortStart, end: this.vscodePortEnd },
      { name: "WINDSURF", start: this.windsurfPortStart, end: this.windsurfPortEnd },
    ];

    for (const range of portRanges) {
      if (range.start && range.end) {
        const start = parseInt(range.start);
        const end = parseInt(range.end);
        
        if (start >= end) {
          errors.push(`${range.name} port range invalid: start (${start}) must be less than end (${end})`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  getPortRange(ideType) {
    const ranges = {
      cursor: { start: this.cursorPortStart, end: this.cursorPortEnd },
      vscode: { start: this.vscodePortStart, end: this.vscodePortEnd },
      windsurf: { start: this.windsurfPortStart, end: this.windsurfPortEnd },
    };

    return ranges[ideType] || null;
  }

  isPortInRange(port, ideType) {
    const range = this.getPortRange(ideType);
    if (!range || !range.start || !range.end) return false;

    const start = parseInt(range.start);
    const end = parseInt(range.end);
    const portNum = parseInt(port);

    return portNum >= start && portNum <= end;
  }
}

module.exports = new IDEConfig();
