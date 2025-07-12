const IDEHealthMonitor = require('@external/ide/IDEHealthMonitor');

describe('IDEHealthMonitor', () => {
  let monitor;
  let mockConfigManager;

  beforeEach(() => {
    mockConfigManager = {
      getGlobalConfig: jest.fn().mockReturnValue({
        healthCheckInterval: 30000
      })
    };

    monitor = new IDEHealthMonitor(mockConfigManager);
  });

  afterEach(() => {
    if (monitor && monitor.stopMonitoring) {
      monitor.stopMonitoring();
    }
    jest.clearAllTimers();
  });

  describe('constructor', () => {
    it('should initialize with config manager', () => {
      expect(monitor.configManager).toBe(mockConfigManager);
      expect(monitor.ideHealth).toBeDefined();
      expect(monitor.healthHistory).toBeDefined();
      expect(monitor.monitoring).toBe(false);
    });

    it('should initialize with default values', () => {
      expect(monitor.ideHealth.size).toBe(0);
      expect(monitor.healthHistory.size).toBe(0);
      expect(monitor.healthCheckInterval).toBe(30000);
      expect(monitor.maxHistorySize).toBe(100);
    });
  });

  describe('startMonitoring', () => {
    it('should start monitoring with default interval', () => {
      monitor.startMonitoring();

      expect(monitor.monitoring).toBe(true);
      expect(monitor.healthInterval).toBeDefined();
      expect(mockConfigManager.getGlobalConfig).toHaveBeenCalled();
    });

    it('should start monitoring with custom interval', () => {
      const customInterval = 60000;
      monitor.startMonitoring(customInterval);

      expect(monitor.monitoring).toBe(true);
      expect(monitor.healthInterval).toBeDefined();
      expect(monitor.healthCheckInterval).toBe(customInterval);
    });

    it('should not start multiple monitoring sessions', () => {
      monitor.startMonitoring();
      const firstInterval = monitor.healthInterval;

      monitor.startMonitoring();
      const secondInterval = monitor.healthInterval;

      expect(firstInterval).toBe(secondInterval);
    });

    it('should emit monitoringStarted event', () => {
      const eventSpy = jest.fn();
      monitor.on('monitoringStarted', eventSpy);
      
      monitor.startMonitoring();

      expect(eventSpy).toHaveBeenCalledWith({ interval: 30000 });
    });
  });

  describe('stopMonitoring', () => {
    it('should stop monitoring', () => {
      monitor.startMonitoring();
      expect(monitor.monitoring).toBe(true);

      monitor.stopMonitoring();

      expect(monitor.monitoring).toBe(false);
      expect(monitor.healthInterval).toBeNull();
    });

    it('should clear monitoring interval', () => {
      monitor.startMonitoring();
      const interval = monitor.healthInterval;

      monitor.stopMonitoring();

      expect(monitor.healthInterval).toBeNull();
    });

    it('should emit monitoringStopped event', () => {
      const eventSpy = jest.fn();
      monitor.on('monitoringStopped', eventSpy);
      
      monitor.startMonitoring();
      monitor.stopMonitoring();

      expect(eventSpy).toHaveBeenCalled();
    });

    it('should handle stop when not monitoring', () => {
      expect(() => monitor.stopMonitoring()).not.toThrow();
    });
  });

  describe('registerIDE', () => {
    it('should register IDE for monitoring', () => {
      const eventSpy = jest.fn();
      monitor.on('ideRegistered', eventSpy);

      monitor.registerIDE(9222, 'cursor');

      expect(monitor.ideHealth.has(9222)).toBe(true);
      expect(monitor.healthHistory.has(9222)).toBe(true);
      expect(eventSpy).toHaveBeenCalledWith({ port: 9222, ideType: 'cursor' });
    });

    it('should update existing IDE registration', () => {
      monitor.registerIDE(9222, 'cursor');
      monitor.registerIDE(9222, 'vscode');

      const healthInfo = monitor.ideHealth.get(9222);
      expect(healthInfo.ideType).toBe('vscode');
    });
  });

  describe('unregisterIDE', () => {
    it('should unregister IDE from monitoring', () => {
      const eventSpy = jest.fn();
      monitor.on('ideUnregistered', eventSpy);

      monitor.registerIDE(9222, 'cursor');
      expect(monitor.ideHealth.has(9222)).toBe(true);

      monitor.unregisterIDE(9222);

      expect(monitor.ideHealth.has(9222)).toBe(false);
      expect(monitor.healthHistory.has(9222)).toBe(false);
      expect(eventSpy).toHaveBeenCalledWith({ port: 9222 });
    });

    it('should handle unregistering non-existent IDE', () => {
      expect(() => monitor.unregisterIDE(9999)).not.toThrow();
    });
  });

  describe('performHealthCheck', () => {
    beforeEach(() => {
      monitor.registerIDE(9222, 'cursor');
      monitor.registerIDE(9232, 'vscode');
    });

    it('should perform health check for all registered IDEs', async () => {
      const results = await monitor.performHealthCheck();

      expect(results).toBeDefined();
      expect(typeof results).toBe('object');
    });

    it('should handle health check errors gracefully', async () => {
      monitor.registerIDE(9999, 'unknown');

      await expect(monitor.performHealthCheck()).resolves.not.toThrow();
    });

    it('should emit healthCheck event', async () => {
      const eventSpy = jest.fn();
      monitor.on('healthCheck', eventSpy);

      await monitor.performHealthCheck();

      expect(eventSpy).toHaveBeenCalled();
    });
  });

  describe('getHealthStatus', () => {
    it('should return health status for all IDEs', () => {
      monitor.registerIDE(9222, 'cursor');
      monitor.registerIDE(9232, 'vscode');

      const status = monitor.getHealthStatus();

      expect(status).toHaveProperty('9222');
      expect(status).toHaveProperty('9232');
      expect(status['9222'].ideType).toBe('cursor');
      expect(status['9232'].ideType).toBe('vscode');
    });

    it('should return empty object when no IDEs registered', () => {
      const status = monitor.getHealthStatus();
      expect(status).toEqual({});
    });
  });

  describe('getIDEHealthStatus', () => {
    it('should return health status for specific IDE', () => {
      monitor.registerIDE(9222, 'cursor');

      const status = monitor.getIDEHealthStatus(9222);

      expect(status).toBeDefined();
      expect(status.ideType).toBe('cursor');
      expect(status.port).toBe(9222);
    });

    it('should return null for non-existent IDE', () => {
      const status = monitor.getIDEHealthStatus(9999);
      expect(status).toBeNull();
    });
  });

  describe('getHealthHistory', () => {
    it('should return health history for IDE', () => {
      monitor.registerIDE(9222, 'cursor');

      const history = monitor.getHealthHistory(9222);

      expect(Array.isArray(history)).toBe(true);
    });

    it('should return limited history entries', () => {
      monitor.registerIDE(9222, 'cursor');

      const history = monitor.getHealthHistory(9222, 5);

      expect(Array.isArray(history)).toBe(true);
    });

    it('should return empty array for non-existent IDE', () => {
      const history = monitor.getHealthHistory(9999);
      expect(history).toEqual([]);
    });
  });

  describe('getHealthStats', () => {
    it('should return health statistics', () => {
      monitor.registerIDE(9222, 'cursor');
      monitor.registerIDE(9232, 'vscode');

      const stats = monitor.getHealthStats();

      expect(stats).toHaveProperty('totalIDEs');
      expect(stats).toHaveProperty('healthyIDEs');
      expect(stats).toHaveProperty('unhealthyIDEs');
      expect(stats).toHaveProperty('errorIDEs');
      expect(stats).toHaveProperty('monitoring');
      expect(stats).toHaveProperty('interval');
      expect(stats.totalIDEs).toBe(2);
    });
  });

  describe('isMonitoring', () => {
    it('should return monitoring status', () => {
      expect(monitor.isMonitoring()).toBe(false);

      monitor.startMonitoring();
      expect(monitor.isMonitoring()).toBe(true);

      monitor.stopMonitoring();
      expect(monitor.isMonitoring()).toBe(false);
    });
  });

  describe('getMonitoringConfig', () => {
    it('should return monitoring configuration', () => {
      const config = monitor.getMonitoringConfig();

      expect(config).toHaveProperty('monitoring');
      expect(config).toHaveProperty('interval');
      expect(config).toHaveProperty('maxHistorySize');
      expect(config.monitoring).toBe(false);
      expect(config.interval).toBe(30000);
      expect(config.maxHistorySize).toBe(100);
    });
  });

  describe('addHealthCheck', () => {
    it('should add health check function', () => {
      const checkFunction = jest.fn();

      monitor.addHealthCheck('cursor', 9222, checkFunction);

      expect(monitor.getHealthCheckCount()).toBe(1);
    });

    it('should throw error for non-function', () => {
      expect(() => monitor.addHealthCheck('cursor', 9222, 'not a function'))
        .toThrow('Check function must be a function');
    });
  });

  describe('clearHealthChecks', () => {
    it('should clear all health checks', () => {
      const checkFunction = jest.fn();

      monitor.addHealthCheck('cursor', 9222, checkFunction);
      expect(monitor.getHealthCheckCount()).toBe(1);

      monitor.clearHealthChecks();
      expect(monitor.getHealthCheckCount()).toBe(0);
    });
  });

  describe('getHealthCheckCount', () => {
    it('should return number of health checks', () => {
      expect(monitor.getHealthCheckCount()).toBe(0);

      monitor.addHealthCheck('cursor', 9222, jest.fn());
      expect(monitor.getHealthCheckCount()).toBe(1);

      monitor.addHealthCheck('vscode', 9232, jest.fn());
      expect(monitor.getHealthCheckCount()).toBe(2);
    });
  });
}); 