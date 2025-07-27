const CursorIDEService = require('@domain/services/ide/CursorIDEService');
const VSCodeIDEService = require('@domain/services/ide/VSCodeService');
const WindsurfIDEService = require('@domain/services/ide/WindsurfIDEService');

describe('IDE Service Switching', () => {
  let mockBrowserManager;
  let mockIDEManager;
  let mockEventBus;

  beforeEach(() => {
    mockBrowserManager = {
      switchToPort: jest.fn(),
      getCurrentPort: jest.fn().mockReturnValue(9222)
    };
    
    mockIDEManager = {
      switchToIDE: jest.fn().mockResolvedValue({ 
        port: 9222, 
        status: 'active',
        workspacePath: '/test/workspace'
      }),
      getActivePort: jest.fn().mockReturnValue(9222)
    };
    
    mockEventBus = {
      subscribe: jest.fn(),
      publish: jest.fn()
    };
  });

  describe('CursorIDEService', () => {
    let service;

    beforeEach(() => {
      service = new CursorIDEService(mockBrowserManager, mockIDEManager, mockEventBus);
      service.getActivePort = jest.fn().mockReturnValue(9223);
    });

    test('should not call browserManager.switchToPort() directly', async () => {
      await service.switchToPort(9222);
      
      // Should not call browserManager.switchToPort() directly
      expect(mockBrowserManager.switchToPort).not.toHaveBeenCalled();
      
      // Should only call ideManager.switchToIDE()
      expect(mockIDEManager.switchToIDE).toHaveBeenCalledWith(9222);
    });

    test('should handle already active port efficiently', async () => {
      service.getActivePort = jest.fn().mockReturnValue(9222);
      
      await service.switchToPort(9222);
      
      // Should detect already active port and return early
      expect(service.getActivePort).toHaveBeenCalled();
      expect(mockIDEManager.switchToIDE).not.toHaveBeenCalled();
    });

    test('should log performance metrics', async () => {
      const consoleSpy = jest.spyOn(console, 'info').mockImplementation();
      
      await service.switchToPort(9222);
      
      // Should log performance metrics
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Successfully switched to port 9222 in')
      );
      
      consoleSpy.mockRestore();
    });

    test('should handle errors gracefully', async () => {
      mockIDEManager.switchToIDE.mockRejectedValue(new Error('Switch failed'));
      
      await expect(service.switchToPort(9222)).rejects.toThrow('Switch failed');
    });
  });

  describe('VSCodeIDEService', () => {
    let service;

    beforeEach(() => {
      service = new VSCodeIDEService(mockBrowserManager, mockIDEManager, mockEventBus);
      service.getActivePort = jest.fn().mockReturnValue(9223);
    });

    test('should not call browserManager.switchToPort() directly', async () => {
      await service.switchToPort(9222);
      
      // Should not call browserManager.switchToPort() directly
      expect(mockBrowserManager.switchToPort).not.toHaveBeenCalled();
      
      // Should only call ideManager.switchToIDE()
      expect(mockIDEManager.switchToIDE).toHaveBeenCalledWith(9222);
    });

    test('should handle already active port efficiently', async () => {
      service.getActivePort = jest.fn().mockReturnValue(9222);
      
      await service.switchToPort(9222);
      
      // Should detect already active port and return early
      expect(service.getActivePort).toHaveBeenCalled();
      expect(mockIDEManager.switchToIDE).not.toHaveBeenCalled();
    });
  });

  describe('WindsurfIDEService', () => {
    let service;

    beforeEach(() => {
      service = new WindsurfIDEService(mockBrowserManager, mockIDEManager, mockEventBus);
      service.getActivePort = jest.fn().mockReturnValue(9223);
    });

    test('should not call browserManager.switchToPort() directly', async () => {
      await service.switchToPort(9222);
      
      // Should not call browserManager.switchToPort() directly
      expect(mockBrowserManager.switchToPort).not.toHaveBeenCalled();
      
      // Should only call ideManager.switchToIDE()
      expect(mockIDEManager.switchToIDE).toHaveBeenCalledWith(9222);
    });

    test('should handle already active port efficiently', async () => {
      service.getActivePort = jest.fn().mockReturnValue(9222);
      
      await service.switchToPort(9222);
      
      // Should detect already active port and return early
      expect(service.getActivePort).toHaveBeenCalled();
      expect(mockIDEManager.switchToIDE).not.toHaveBeenCalled();
    });
  });

  describe('Performance Validation', () => {
    test('should complete switch in reasonable time', async () => {
      const service = new CursorIDEService(mockBrowserManager, mockIDEManager, mockEventBus);
      service.getActivePort = jest.fn().mockReturnValue(9223);
      
      const start = Date.now();
      await service.switchToPort(9222);
      const duration = Date.now() - start;
      
      // Should complete in under 100ms (with mocked dependencies)
      expect(duration).toBeLessThan(100);
    });

    test('should handle rapid switches efficiently', async () => {
      const service = new CursorIDEService(mockBrowserManager, mockIDEManager, mockEventBus);
      service.getActivePort = jest.fn().mockReturnValue(9223);
      
      const ports = [9222, 9223, 9224, 9222];
      const switchTimes = [];
      
      for (const port of ports) {
        const start = Date.now();
        await service.switchToPort(port);
        const duration = Date.now() - start;
        switchTimes.push(duration);
      }
      
      // All switches should be fast
      switchTimes.forEach(time => {
        expect(time).toBeLessThan(100);
      });
    });
  });
}); 