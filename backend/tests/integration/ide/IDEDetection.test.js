const IDEDetectorFactory = require('../../../infrastructure/external/ide/IDEDetectorFactory');
const CursorDetector = require('../../../infrastructure/external/ide/detectors/CursorDetector');
const VSCodeDetector = require('../../../infrastructure/external/ide/detectors/VSCodeDetector');
const WindsurfDetector = require('../../../infrastructure/external/ide/detectors/WindsurfDetector');

describe('IDE Detection Integration', () => {
  let detectorFactory;

  beforeEach(() => {
    detectorFactory = new IDEDetectorFactory();
  });

  describe('Factory Initialization', () => {
    it('should initialize with all default detectors', () => {
      const availableDetectors = detectorFactory.getAvailableDetectors();
      
      expect(availableDetectors).toContain('cursor');
      expect(availableDetectors).toContain('vscode');
      expect(availableDetectors).toContain('windsurf');
      expect(availableDetectors).toHaveLength(3);
    });

    it('should create valid detector instances', () => {
      const cursorDetector = detectorFactory.createDetector('cursor');
      const vscodeDetector = detectorFactory.createDetector('vscode');
      const windsurfDetector = detectorFactory.createDetector('windsurf');

      expect(cursorDetector).toBeInstanceOf(CursorDetector);
      expect(vscodeDetector).toBeInstanceOf(VSCodeDetector);
      expect(windsurfDetector).toBeInstanceOf(WindsurfDetector);
    });

    it('should validate all detectors', () => {
      const stats = detectorFactory.getDetectorStats();
      
      expect(stats.totalDetectors).toBe(3);
      expect(stats.validDetectors).toBe(3);
      expect(stats.availableTypes).toHaveLength(3);
    });
  });

  describe('Detector Registration', () => {
    it('should register custom detector', () => {
      const customDetector = {
        scanForIDEs: jest.fn().mockResolvedValue([]),
        findAvailablePort: jest.fn().mockResolvedValue(9000),
        checkPort: jest.fn().mockResolvedValue(true)
      };

      detectorFactory.registerDetector('custom', customDetector);

      expect(detectorFactory.getAvailableDetectors()).toContain('custom');
      expect(detectorFactory.createDetector('custom')).toBe(customDetector);
    });

    it('should reject invalid detector', () => {
      const invalidDetector = {
        // Missing required scanForIDEs method
        findAvailablePort: jest.fn()
      };

      expect(() => detectorFactory.registerDetector('invalid', invalidDetector))
        .toThrow('Detector must implement scanForIDEs method');
    });
  });

  describe('Multi-IDE Detection', () => {
    it('should detect all IDE types concurrently', async () => {
      // Mock the individual detectors to return test data
      const cursorDetector = detectorFactory.createDetector('cursor');
      const vscodeDetector = detectorFactory.createDetector('vscode');
      const windsurfDetector = detectorFactory.createDetector('windsurf');

      cursorDetector.scanForIDEs = jest.fn().mockResolvedValue([
        { port: 9222, status: 'running', url: 'http://127.0.0.1:9222' }
      ]);

      vscodeDetector.scanForIDEs = jest.fn().mockResolvedValue([
        { port: 9232, status: 'running', url: 'http://127.0.0.1:9232' }
      ]);

      windsurfDetector.scanForIDEs = jest.fn().mockResolvedValue([]);

      const allIDEs = await detectorFactory.detectAll();

      expect(allIDEs).toHaveLength(2);
      expect(allIDEs.find(ide => ide.ideType === 'cursor')).toBeDefined();
      expect(allIDEs.find(ide => ide.ideType === 'vscode')).toBeDefined();
      expect(allIDEs.find(ide => ide.ideType === 'windsurf')).toBeUndefined();
    });

    it('should handle detection errors gracefully', async () => {
      const cursorDetector = detectorFactory.createDetector('cursor');
      const vscodeDetector = detectorFactory.createDetector('vscode');
      const windsurfDetector = detectorFactory.createDetector('windsurf');

      cursorDetector.scanForIDEs = jest.fn().mockRejectedValue(new Error('Detection failed'));
      vscodeDetector.scanForIDEs = jest.fn().mockResolvedValue([
        { port: 9232, status: 'running', url: 'http://127.0.0.1:9232' }
      ]);
      windsurfDetector.scanForIDEs = jest.fn().mockResolvedValue([
        { port: 9242, status: 'running', url: 'http://127.0.0.1:9242' }
      ]);

      const allIDEs = await detectorFactory.detectAll();

      // Should still detect other IDEs even if one fails
      expect(allIDEs).toHaveLength(2); // vscode and windsurf should still work
      expect(allIDEs.find(ide => ide.ideType === 'cursor')).toBeUndefined();
    });
  });

  describe('Type-Specific Detection', () => {
    it('should detect cursor IDEs specifically', async () => {
      const cursorIDEs = await detectorFactory.detectByType('cursor');
      
      // Should return array with cursor type
      expect(Array.isArray(cursorIDEs)).toBe(true);
      cursorIDEs.forEach(ide => {
        expect(ide.ideType).toBe('cursor');
      });
    });

    it('should detect vscode IDEs specifically', async () => {
      const vscodeIDEs = await detectorFactory.detectByType('vscode');
      
      expect(Array.isArray(vscodeIDEs)).toBe(true);
      vscodeIDEs.forEach(ide => {
        expect(ide.ideType).toBe('vscode');
      });
    });

    it('should detect windsurf IDEs specifically', async () => {
      const windsurfIDEs = await detectorFactory.detectByType('windsurf');
      
      expect(Array.isArray(windsurfIDEs)).toBe(true);
      windsurfIDEs.forEach(ide => {
        expect(ide.ideType).toBe('windsurf');
      });
    });

    it('should throw error for unknown IDE type', async () => {
      await expect(detectorFactory.detectByType('unknown'))
        .rejects.toThrow('Unsupported IDE type: unknown');
    });
  });

  describe('Port Management', () => {
    it('should find available ports for different IDE types', async () => {
      const cursorPort = await detectorFactory.findAvailablePort('cursor');
      const vscodePort = await detectorFactory.findAvailablePort('vscode');
      const windsurfPort = await detectorFactory.findAvailablePort('windsurf');

      expect(typeof cursorPort).toBe('number');
      expect(typeof vscodePort).toBe('number');
      expect(typeof windsurfPort).toBe('number');

      // Ports should be in expected ranges
      expect(cursorPort).toBeGreaterThanOrEqual(9222);
      expect(cursorPort).toBeLessThanOrEqual(9231);
      expect(vscodePort).toBeGreaterThanOrEqual(9232);
      expect(vscodePort).toBeLessThanOrEqual(9241);
      expect(windsurfPort).toBeGreaterThanOrEqual(9242);
      expect(windsurfPort).toBeLessThanOrEqual(9251);
    });

    it('should check port availability', async () => {
      const result = await detectorFactory.checkPort(9222, 'cursor');
      expect(typeof result === 'object' || typeof result === 'boolean').toBe(true);
    });

    it('should throw error for unsupported port operations', async () => {
      // Create a detector without findAvailablePort method
      const limitedDetector = {
        scanForIDEs: jest.fn().mockResolvedValue([])
      };

      detectorFactory.registerDetector('limited', limitedDetector);

      await expect(detectorFactory.findAvailablePort('limited'))
        .rejects.toThrow('Detector for limited does not support findAvailablePort');
    });
  });

  describe('Configuration Integration', () => {
    it('should get detector configuration', () => {
      const cursorConfig = detectorFactory.getDetectorConfig('cursor');
      const vscodeConfig = detectorFactory.getDetectorConfig('vscode');
      const windsurfConfig = detectorFactory.getDetectorConfig('windsurf');

      // Should return config or null
      expect(cursorConfig === null || typeof cursorConfig === 'object').toBe(true);
      expect(vscodeConfig === null || typeof vscodeConfig === 'object').toBe(true);
      expect(windsurfConfig === null || typeof windsurfConfig === 'object').toBe(true);
    });

    it('should throw error for unknown IDE type', () => {
      expect(() => detectorFactory.getDetectorConfig('unknown'))
        .toThrow('Unsupported IDE type: unknown');
    });
  });

  describe('Error Handling', () => {
    it('should handle unsupported IDE type gracefully', () => {
      expect(() => detectorFactory.createDetector('unsupported'))
        .toThrow('Unsupported IDE type: unsupported');
    });

    it('should be case insensitive', () => {
      const cursorDetector = detectorFactory.createDetector('CURSOR');
      const vscodeDetector = detectorFactory.createDetector('VSCODE');
      const windsurfDetector = detectorFactory.createDetector('WINDSURF');

      expect(cursorDetector).toBeInstanceOf(CursorDetector);
      expect(vscodeDetector).toBeInstanceOf(VSCodeDetector);
      expect(windsurfDetector).toBeInstanceOf(WindsurfDetector);
    });
  });

  describe('Performance', () => {
    it('should detect all IDEs within reasonable time', async () => {
      const startTime = Date.now();
      
      await detectorFactory.detectAll();
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within 5 seconds
      expect(duration).toBeLessThan(5000);
    });

    it('should handle concurrent detection requests', async () => {
      const promises = [
        detectorFactory.detectAll(),
        detectorFactory.detectByType('cursor'),
        detectorFactory.detectByType('vscode'),
        detectorFactory.detectByType('windsurf')
      ];

      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(4);
      results.forEach(result => {
        expect(Array.isArray(result)).toBe(true);
      });
    });
  });
}); 