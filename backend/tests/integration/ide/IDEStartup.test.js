const IDEStarterFactory = require('@external/ide/IDEStarterFactory');
const CursorStarter = require('@external/ide/starters/CursorStarter');
const VSCodeStarter = require('@external/ide/starters/VSCodeStarter');
const WindsurfStarter = require('@external/ide/starters/WindsurfStarter');

describe('IDE Startup Integration', () => {
  let starterFactory;

  beforeEach(() => {
    starterFactory = new IDEStarterFactory();
  });

  describe('Factory Initialization', () => {
    it('should initialize with all default starters', () => {
      const availableStarters = starterFactory.getAvailableStarters();
      
      expect(availableStarters).toContain('cursor');
      expect(availableStarters).toContain('vscode');
      expect(availableStarters).toContain('windsurf');
      expect(availableStarters).toHaveLength(3);
    });

    it('should create valid starter instances', () => {
      const cursorStarter = starterFactory.createStarter('cursor');
      const vscodeStarter = starterFactory.createStarter('vscode');
      const windsurfStarter = starterFactory.createStarter('windsurf');

      expect(cursorStarter).toBeInstanceOf(CursorStarter);
      expect(vscodeStarter).toBeInstanceOf(VSCodeStarter);
      expect(windsurfStarter).toBeInstanceOf(WindsurfStarter);
    });

    it('should validate all starters', () => {
      const stats = starterFactory.getStarterStats();
      
      expect(stats.totalStarters).toBe(3);
      expect(stats.validStarters).toBe(3);
      expect(stats.availableTypes).toHaveLength(3);
    });
  });

  describe('Starter Registration', () => {
    it('should register custom starter', () => {
      const customStarter = {
        startIDE: jest.fn().mockResolvedValue({ port: 9000, status: 'running' }),
        stopIDE: jest.fn().mockResolvedValue({ status: 'stopped' })
      };

      starterFactory.registerStarter('custom', customStarter);

      expect(starterFactory.getAvailableStarters()).toContain('custom');
      expect(starterFactory.createStarter('custom')).toBe(customStarter);
    });

    it('should reject invalid starter', () => {
      const invalidStarter = {
        // Missing required startIDE method
        stopIDE: jest.fn()
      };

      expect(() => starterFactory.registerStarter('invalid', invalidStarter))
        .toThrow('Starter must implement startIDE method');
    });
  });

  describe('IDE Startup', () => {
    it('should start cursor IDE successfully', async () => {
      const mockStarter = {
        startIDE: jest.fn().mockResolvedValue({
          port: 9222,
          pid: 12345,
          status: 'running',
          process: { pid: 12345 }
        })
      };

      starterFactory.starters.set('cursor', mockStarter);

      const result = await starterFactory.startIDE('cursor', 9222, '/test/path');

      expect(mockStarter.startIDE).toHaveBeenCalledWith(9222, '/test/path', {});
      expect(result.port).toBe(9222);
      expect(result.ideType).toBe('cursor');
      expect(result.workspacePath).toBe('/test/path');
    });

    it('should start vscode IDE successfully', async () => {
      const mockStarter = {
        startIDE: jest.fn().mockResolvedValue({
          port: 9232,
          pid: 12346,
          status: 'running',
          process: { pid: 12346 }
        })
      };

      starterFactory.starters.set('vscode', mockStarter);

      const result = await starterFactory.startIDE('vscode', 9232, '/test/path');

      expect(mockStarter.startIDE).toHaveBeenCalledWith(9232, '/test/path', {});
      expect(result.port).toBe(9232);
      expect(result.ideType).toBe('vscode');
    });

    it('should start windsurf IDE successfully', async () => {
      const mockStarter = {
        startIDE: jest.fn().mockResolvedValue({
          port: 9242,
          pid: 12347,
          status: 'running',
          process: { pid: 12347 }
        })
      };

      starterFactory.starters.set('windsurf', mockStarter);

      const result = await starterFactory.startIDE('windsurf', 9242, '/test/path');

      expect(mockStarter.startIDE).toHaveBeenCalledWith(9242, '/test/path', {});
      expect(result.port).toBe(9242);
      expect(result.ideType).toBe('windsurf');
    });

    it('should prevent starting IDE on occupied port', async () => {
      starterFactory.runningProcesses.set(9222, { pid: 12345 });

      await expect(starterFactory.startIDE('cursor', 9222))
        .rejects.toThrow('IDE already running on port 9222');
    });

    it('should track process when starter provides it', async () => {
      const mockProcess = { pid: 12345 };
      const mockStarter = {
        startIDE: jest.fn().mockResolvedValue({
          port: 9222,
          pid: 12345,
          status: 'running',
          process: mockProcess
        })
      };

      starterFactory.starters.set('cursor', mockStarter);

      await starterFactory.startIDE('cursor', 9222);

      expect(starterFactory.runningProcesses.has(9222)).toBe(true);
      expect(starterFactory.runningProcesses.get(9222)).toBe(mockProcess);
    });
  });

  describe('IDE Shutdown', () => {
    it('should stop IDE successfully', async () => {
      const mockProcess = { pid: 12345 };
      const mockStarter = {
        stopIDE: jest.fn().mockResolvedValue({ status: 'stopped' })
      };

      starterFactory.runningProcesses.set(9222, mockProcess);
      starterFactory.starters.set('cursor', mockStarter);

      const result = await starterFactory.stopIDE(9222, 'cursor');

      expect(mockStarter.stopIDE).toHaveBeenCalledWith(9222);
      expect(result.port).toBe(9222);
      expect(result.status).toBe('stopped');
      expect(starterFactory.runningProcesses.has(9222)).toBe(false);
    });

    it('should detect IDE type if not provided', async () => {
      const mockProcess = { pid: 12345 };
      const mockStarter = {
        stopIDE: jest.fn().mockResolvedValue({ status: 'stopped' })
      };

      starterFactory.runningProcesses.set(9222, mockProcess);
      starterFactory.starters.set('cursor', mockStarter);

      await starterFactory.stopIDE(9222);

      expect(mockStarter.stopIDE).toHaveBeenCalledWith(9222);
    });

    it('should throw error if no IDE running on port', async () => {
      await expect(starterFactory.stopIDE(9222))
        .rejects.toThrow('No IDE process found on port 9222');
    });

    it('should stop all IDEs', async () => {
      const mockProcess1 = { pid: 12345 };
      const mockProcess2 = { pid: 12346 };
      const mockStarter = {
        stopIDE: jest.fn().mockResolvedValue({ status: 'stopped' })
      };

      starterFactory.runningProcesses.set(9222, mockProcess1);
      starterFactory.runningProcesses.set(9232, mockProcess2);
      starterFactory.starters.set('cursor', mockStarter);
      starterFactory.starters.set('vscode', mockStarter);

      await starterFactory.stopAllIDEs();

      expect(starterFactory.runningProcesses.size).toBe(0);
    });
  });

  describe('Process Management', () => {
    it('should track running IDEs correctly', () => {
      const mockProcess1 = { pid: 12345 };
      const mockProcess2 = { pid: 12346 };

      starterFactory.runningProcesses.set(9222, mockProcess1);
      starterFactory.runningProcesses.set(9232, mockProcess2);

      const runningIDEs = starterFactory.getRunningIDEs();

      expect(runningIDEs).toHaveLength(2);
      expect(runningIDEs).toContainEqual({
        port: 9222,
        pid: 12345,
        status: 'running',
        ideType: 'cursor'
      });
      expect(runningIDEs).toContainEqual({
        port: 9232,
        pid: 12346,
        status: 'running',
        ideType: 'vscode'
      });
    });

    it('should check if IDE is running', () => {
      const mockProcess = { pid: 12345 };
      starterFactory.runningProcesses.set(9222, mockProcess);

      expect(starterFactory.isIDERunning(9222)).toBe(true);
      expect(starterFactory.isIDERunning(9232)).toBe(false);
    });

    it('should validate IDE type when checking running status', () => {
      const mockProcess = { pid: 12345 };
      starterFactory.runningProcesses.set(9222, mockProcess);

      expect(starterFactory.isIDERunning(9222, 'cursor')).toBe(true);
      expect(starterFactory.isIDERunning(9222, 'vscode')).toBe(false);
    });
  });

  describe('IDE Type Detection', () => {
    it('should detect cursor for ports 9222-9231', () => {
      expect(starterFactory.detectIDEType(9222)).toBe('cursor');
      expect(starterFactory.detectIDEType(9231)).toBe('cursor');
    });

    it('should detect vscode for ports 9232-9241', () => {
      expect(starterFactory.detectIDEType(9232)).toBe('vscode');
      expect(starterFactory.detectIDEType(9241)).toBe('vscode');
    });

    it('should detect windsurf for ports 9242-9251', () => {
      expect(starterFactory.detectIDEType(9242)).toBe('windsurf');
      expect(starterFactory.detectIDEType(9251)).toBe('windsurf');
    });

    it('should return null for unknown port ranges', () => {
      expect(starterFactory.detectIDEType(9000)).toBeNull();
      expect(starterFactory.detectIDEType(9300)).toBeNull();
    });
  });

  describe('Configuration Integration', () => {
    it('should get starter configuration', () => {
      const cursorConfig = starterFactory.getStarterConfig('cursor');
      const vscodeConfig = starterFactory.getStarterConfig('vscode');
      const windsurfConfig = starterFactory.getStarterConfig('windsurf');

      // Should return config or null
      expect(cursorConfig === null || typeof cursorConfig === 'object').toBe(true);
      expect(vscodeConfig === null || typeof vscodeConfig === 'object').toBe(true);
      expect(windsurfConfig === null || typeof windsurfConfig === 'object').toBe(true);
    });

    it('should throw error for unknown IDE type', () => {
      expect(() => starterFactory.getStarterConfig('unknown'))
        .toThrow('Unsupported IDE type: unknown');
    });
  });

  describe('Error Handling', () => {
    it('should handle unsupported IDE type gracefully', () => {
      expect(() => starterFactory.createStarter('unsupported'))
        .toThrow('Unsupported IDE type: unsupported');
    });

    it('should be case insensitive', () => {
      const cursorStarter = starterFactory.createStarter('CURSOR');
      const vscodeStarter = starterFactory.createStarter('VSCODE');
      const windsurfStarter = starterFactory.createStarter('WINDSURF');

      expect(cursorStarter).toBeInstanceOf(CursorStarter);
      expect(vscodeStarter).toBeInstanceOf(VSCodeStarter);
      expect(windsurfStarter).toBeInstanceOf(WindsurfStarter);
    });

    it('should handle startup failures gracefully', async () => {
      const mockStarter = {
        startIDE: jest.fn().mockRejectedValue(new Error('Startup failed'))
      };

      starterFactory.starters.set('cursor', mockStarter);

      await expect(starterFactory.startIDE('cursor', 9222))
        .rejects.toThrow('Startup failed');
    });
  });

  describe('Process Event Handling', () => {
    it('should handle process close events', async () => {
      const mockProcess = { 
        pid: 12345,
        on: jest.fn()
      };
      const mockStarter = {
        startIDE: jest.fn().mockResolvedValue({
          port: 9222,
          pid: 12345,
          status: 'running',
          process: mockProcess
        })
      };

      starterFactory.starters.set('cursor', mockStarter);

      await starterFactory.startIDE('cursor', 9222);

      expect(mockProcess.on).toHaveBeenCalledWith('close', expect.any(Function));
      expect(mockProcess.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should remove process from tracking on close', async () => {
      const mockProcess = { 
        pid: 12345,
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            // Simulate process close
            setTimeout(() => callback(0), 10);
          }
        })
      };
      const mockStarter = {
        startIDE: jest.fn().mockResolvedValue({
          port: 9222,
          pid: 12345,
          status: 'running',
          process: mockProcess
        })
      };

      starterFactory.starters.set('cursor', mockStarter);

      await starterFactory.startIDE('cursor', 9222);

      // Wait for process close event
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(starterFactory.runningProcesses.has(9222)).toBe(false);
    });
  });

  describe('Performance', () => {
    it('should start IDE within reasonable time', async () => {
      const mockStarter = {
        startIDE: jest.fn().mockResolvedValue({
          port: 9222,
          pid: 12345,
          status: 'running'
        })
      };

      starterFactory.starters.set('cursor', mockStarter);

      const startTime = Date.now();
      
      await starterFactory.startIDE('cursor', 9222);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within 1 second
      expect(duration).toBeLessThan(1000);
    });

    it('should handle concurrent startup requests', async () => {
      const mockStarter = {
        startIDE: jest.fn().mockResolvedValue({
          port: 9222,
          pid: 12345,
          status: 'running'
        })
      };

      starterFactory.starters.set('cursor', mockStarter);

      const promises = [
        starterFactory.startIDE('cursor', 9222),
        starterFactory.startIDE('cursor', 9223),
        starterFactory.startIDE('cursor', 9224)
      ];

      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toHaveProperty('port');
        expect(result).toHaveProperty('status');
      });
    });
  });
}); 