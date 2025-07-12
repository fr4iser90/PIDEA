/**
 * Unit tests for IDEDetectorFactory
 */

const IDEDetectorFactory = require('@external/ide/IDEDetectorFactory');

// Mock the detector classes
jest.mock('../../../../infrastructure/external/ide/detectors/CursorDetector');
jest.mock('../../../../infrastructure/external/ide/detectors/VSCodeDetector');
jest.mock('../../../../infrastructure/external/ide/detectors/WindsurfDetector');

const CursorDetector = require('@external/ide/detectors/CursorDetector');
const VSCodeDetector = require('@external/ide/detectors/VSCodeDetector');
const WindsurfDetector = require('@external/ide/detectors/WindsurfDetector');

describe('IDEDetectorFactory', () => {
  let factory;
  let mockCursorDetector;
  let mockVSCodeDetector;
  let mockWindsurfDetector;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock detector instances
    mockCursorDetector = {
      scanForIDEs: jest.fn(),
      checkPort: jest.fn(),
      findAvailablePort: jest.fn(),
      getConfig: jest.fn()
    };

    mockVSCodeDetector = {
      scanForIDEs: jest.fn(),
      checkPort: jest.fn(),
      findAvailablePort: jest.fn(),
      getConfig: jest.fn()
    };

    mockWindsurfDetector = {
      scanForIDEs: jest.fn(),
      checkPort: jest.fn(),
      findAvailablePort: jest.fn(),
      getConfig: jest.fn()
    };

    // Mock constructor calls
    CursorDetector.mockImplementation(() => mockCursorDetector);
    VSCodeDetector.mockImplementation(() => mockVSCodeDetector);
    WindsurfDetector.mockImplementation(() => mockWindsurfDetector);

    factory = new IDEDetectorFactory();
  });

  describe('constructor', () => {
    it('should initialize with default detectors', () => {
      expect(CursorDetector).toHaveBeenCalled();
      expect(VSCodeDetector).toHaveBeenCalled();
      expect(WindsurfDetector).toHaveBeenCalled();
    });

    it('should register default detectors', () => {
      expect(factory.getAvailableDetectors()).toContain('cursor');
      expect(factory.getAvailableDetectors()).toContain('vscode');
      expect(factory.getAvailableDetectors()).toContain('windsurf');
    });
  });

  describe('createDetector', () => {
    it('should create detector for valid IDE type', () => {
      const detector = factory.createDetector('cursor');
      expect(detector).toBe(mockCursorDetector);
    });

    it('should throw error for invalid IDE type', () => {
      expect(() => {
        factory.createDetector('invalid');
      }).toThrow('Unsupported IDE type: invalid');
    });

    it('should be case insensitive', () => {
      const detector = factory.createDetector('CURSOR');
      expect(detector).toBe(mockCursorDetector);
    });
  });

  describe('registerDetector', () => {
    it('should register valid detector', () => {
      const mockDetector = {
        scanForIDEs: jest.fn()
      };

      factory.registerDetector('test', mockDetector);
      expect(factory.getAvailableDetectors()).toContain('test');
    });

    it('should throw error for invalid detector', () => {
      const invalidDetector = {};

      expect(() => {
        factory.registerDetector('test', invalidDetector);
      }).toThrow('Detector must implement scanForIDEs method');
    });
  });

  describe('getAvailableDetectors', () => {
    it('should return array of available detector types', () => {
      const detectors = factory.getAvailableDetectors();
      expect(Array.isArray(detectors)).toBe(true);
      expect(detectors).toContain('cursor');
      expect(detectors).toContain('vscode');
      expect(detectors).toContain('windsurf');
    });
  });

  describe('detectAll', () => {
    it('should detect all IDEs from all detectors', async () => {
      // Mock detector responses
      mockCursorDetector.scanForIDEs.mockResolvedValue([
        { port: 9222, status: 'running', ideType: 'cursor' }
      ]);
      mockVSCodeDetector.scanForIDEs.mockResolvedValue([
        { port: 9232, status: 'running', ideType: 'vscode' }
      ]);
      mockWindsurfDetector.scanForIDEs.mockResolvedValue([]);

      const result = await factory.detectAll();

      expect(result).toHaveLength(2);
      expect(result[0].ideType).toBe('cursor');
      expect(result[1].ideType).toBe('vscode');
      expect(mockCursorDetector.scanForIDEs).toHaveBeenCalled();
      expect(mockVSCodeDetector.scanForIDEs).toHaveBeenCalled();
      expect(mockWindsurfDetector.scanForIDEs).toHaveBeenCalled();
    });

    it('should handle detector errors gracefully', async () => {
      mockCursorDetector.scanForIDEs.mockRejectedValue(new Error('Test error'));
      mockVSCodeDetector.scanForIDEs.mockResolvedValue([]);
      mockWindsurfDetector.scanForIDEs.mockResolvedValue([]);

      const result = await factory.detectAll();

      expect(result).toHaveLength(0);
      expect(mockCursorDetector.scanForIDEs).toHaveBeenCalled();
    });
  });

  describe('detectByType', () => {
    it('should detect IDEs of specific type', async () => {
      const mockIDEs = [
        { port: 9222, status: 'running' },
        { port: 9223, status: 'running' }
      ];
      mockCursorDetector.scanForIDEs.mockResolvedValue(mockIDEs);

      const result = await factory.detectByType('cursor');

      expect(result).toHaveLength(2);
      expect(result[0].ideType).toBe('cursor');
      expect(result[1].ideType).toBe('cursor');
      expect(mockCursorDetector.scanForIDEs).toHaveBeenCalled();
    });
  });

  describe('findAvailablePort', () => {
    it('should find available port for IDE type', async () => {
      mockCursorDetector.findAvailablePort.mockResolvedValue(9224);

      const result = await factory.findAvailablePort('cursor');

      expect(result).toBe(9224);
      expect(mockCursorDetector.findAvailablePort).toHaveBeenCalled();
    });

    it('should throw error if detector does not support findAvailablePort', async () => {
      delete mockCursorDetector.findAvailablePort;

      await expect(factory.findAvailablePort('cursor')).rejects.toThrow(
        'Detector for cursor does not support findAvailablePort'
      );
    });
  });

  describe('checkPort', () => {
    it('should check port for IDE type', async () => {
      mockCursorDetector.checkPort.mockResolvedValue(true);

      const result = await factory.checkPort(9222, 'cursor');

      expect(result).toBe(true);
      expect(mockCursorDetector.checkPort).toHaveBeenCalledWith(9222);
    });

    it('should throw error if detector does not support checkPort', async () => {
      delete mockCursorDetector.checkPort;

      await expect(factory.checkPort(9222, 'cursor')).rejects.toThrow(
        'Detector for cursor does not support checkPort'
      );
    });
  });

  describe('getDetectorConfig', () => {
    it('should get detector configuration', () => {
      const mockConfig = { name: 'Cursor', portRange: { start: 9222, end: 9231 } };
      mockCursorDetector.getConfig.mockReturnValue(mockConfig);

      const result = factory.getDetectorConfig('cursor');

      expect(result).toBe(mockConfig);
      expect(mockCursorDetector.getConfig).toHaveBeenCalled();
    });

    it('should return null if detector does not support getConfig', () => {
      delete mockCursorDetector.getConfig;

      const result = factory.getDetectorConfig('cursor');

      expect(result).toBeNull();
    });
  });

  describe('validateDetector', () => {
    it('should validate detector with required methods', () => {
      const result = factory.validateDetector('cursor');
      expect(result).toBe(true);
    });

    it('should return false for invalid detector', () => {
      delete mockCursorDetector.scanForIDEs;

      const result = factory.validateDetector('cursor');
      expect(result).toBe(false);
    });

    it('should return false for non-existent detector', () => {
      const result = factory.validateDetector('invalid');
      expect(result).toBe(false);
    });
  });

  describe('getDetectorStats', () => {
    it('should return detector statistics', () => {
      const stats = factory.getDetectorStats();

      expect(stats).toHaveProperty('totalDetectors');
      expect(stats).toHaveProperty('availableTypes');
      expect(stats).toHaveProperty('validDetectors');
      expect(stats.totalDetectors).toBe(3);
      expect(stats.validDetectors).toBe(3);
      expect(stats.availableTypes).toContain('cursor');
      expect(stats.availableTypes).toContain('vscode');
      expect(stats.availableTypes).toContain('windsurf');
    });
  });
}); 