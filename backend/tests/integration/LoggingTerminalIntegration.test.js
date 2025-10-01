/**
 * Logging Terminal Integration Tests
 * Tests integration between all logging components
 */
const Logger = require('../../infrastructure/logging/Logger');
const TerminalDetector = require('../../infrastructure/logging/TerminalDetector');
const ColorManager = require('../../infrastructure/logging/ColorManager');
const TimeFormatter = require('../../infrastructure/logging/TimeFormatter');
const LogConfig = require('../../infrastructure/logging/LogConfig');

describe('Logging Terminal Integration', () => {
    let logger;
    let originalEnv;

    beforeEach(() => {
        originalEnv = { ...process.env };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe('Terminal Detection Integration', () => {
        it('should detect TTY correctly', () => {
            const result = TerminalDetector.isTTY();
            expect(typeof result).toBe('boolean');
        });

        it('should detect color support correctly', () => {
            process.env.TERM = 'xterm-256color';
            const result = TerminalDetector.supportsColors();
            expect(typeof result).toBe('boolean');
        });

        it('should respect NO_COLOR environment variable', () => {
            process.env.NO_COLOR = '1';
            process.env.TERM = 'xterm-256color';
            expect(TerminalDetector.supportsColors()).toBe(false);
        });

        it('should respect FORCE_COLOR environment variable', () => {
            process.env.FORCE_COLOR = '1';
            expect(TerminalDetector.supportsColors()).toBe(true);
        });
    });

    describe('Color Manager Integration', () => {
        it('should create color manager with terminal detection', () => {
            process.env.TERM = 'xterm-256color';
            const colorManager = new ColorManager();

            expect(colorManager).toBeDefined();
            expect(typeof colorManager.supportsColors).toBe('boolean');
            expect(['none', '16bit', '24bit']).toContain(colorManager.colorSupport);
        });

        it('should disable colors when NO_COLOR is set', () => {
            process.env.NO_COLOR = '1';
            process.env.TERM = 'xterm-256color';
            const colorManager = new ColorManager();

            expect(colorManager.supportsColors).toBe(false);
        });

        it('should provide correct color mapping', () => {
            const colorManager = new ColorManager();
            const mapping = colorManager.getColorMapping();

            expect(mapping).toHaveProperty('error');
            expect(mapping).toHaveProperty('warn');
            expect(mapping).toHaveProperty('info');
            expect(mapping).toHaveProperty('success');
        });
    });

    describe('Time Formatter Integration', () => {
        it('should format timestamps correctly', () => {
            const timeFormatter = new TimeFormatter();
            const testDate = new Date('2024-12-19T14:30:25.123Z');

            expect(typeof timeFormatter.formatTimestamp(testDate, 'console')).toBe('string');
            expect(typeof timeFormatter.formatTimestamp(testDate, 'compact')).toBe('string');
            expect(typeof timeFormatter.formatTimestamp(testDate, 'file')).toBe('string');
        });

        it('should recommend formats based on terminal capabilities', () => {
            const timeFormatter = new TimeFormatter();
            const terminalInfo = { isCI: true, width: 80 };

            expect(timeFormatter.getRecommendedFormat(terminalInfo, 'console')).toBe('compact');
        });
    });

    describe('Log Config Integration', () => {
        it('should build configuration based on environment', () => {
            process.env.NODE_ENV = 'development';
            process.env.TERM = 'xterm-256color';
            const logConfig = new LogConfig();
            const config = logConfig.getConfiguration();

            expect(config.environment.isDevelopment).toBe(true);
            expect(typeof config.terminal.supportsColors).toBe('boolean');
            expect(typeof config.formatting.colorEnabled).toBe('boolean');
        });

        it('should adapt configuration for CI environment', () => {
            process.env.CI = 'true';
            process.env.NODE_ENV = 'production';
            const logConfig = new LogConfig();
            const config = logConfig.getConfiguration();

            expect(config.terminal.isCI).toBe(true);
            expect(typeof config.formatting.compactMode).toBe('boolean');
            expect(typeof config.formatting.levelAbbreviation).toBe('boolean');
        });
    });

    describe('Logger Integration', () => {
        it('should create logger with enhanced configuration', () => {
            process.env.NODE_ENV = 'development';
            process.env.TERM = 'xterm-256color';
            logger = new Logger('TestService');

            expect(logger.serviceName).toBe('TestService');
            expect(logger.logConfig).toBeDefined();
            expect(logger.colorManager).toBeDefined();
            expect(logger.timeFormatter).toBeDefined();
        });

        it('should use compact mode in CI', () => {
            process.env.CI = 'true';
            process.env.NODE_ENV = 'production';
            logger = new Logger('TestService');

            expect(typeof logger.isCompactMode()).toBe('boolean');
        });

        it('should enable colors when supported', () => {
            process.env.TERM = 'xterm-256color';
            logger = new Logger('TestService');

            expect(typeof logger.isColorEnabled()).toBe('boolean');
        });

        it('should disable colors when not supported', () => {
            process.env.NO_COLOR = '1';
            process.env.TERM = 'xterm-256color';
            logger = new Logger('TestService');

            expect(logger.isColorEnabled()).toBe(false);
        });

        it('should provide terminal information', () => {
            process.env.TERM = 'xterm-256color';
            logger = new Logger('TestService');
            const terminalInfo = logger.getTerminalInfo();

            expect(typeof terminalInfo.isTTY).toBe('boolean');
            expect(typeof terminalInfo.supportsColors).toBe('boolean');
            expect(typeof terminalInfo.isCI).toBe('boolean');
        });

        it('should test configuration correctly', () => {
            process.env.TERM = 'xterm-256color';
            logger = new Logger('TestService');
            const testResults = logger.testConfiguration();

            expect(testResults).toHaveProperty('timestamp');
            expect(testResults).toHaveProperty('levelAbbreviation');
            expect(testResults).toHaveProperty('coloredLevel');
            expect(testResults).toHaveProperty('colorSupport');
            expect(testResults).toHaveProperty('terminalInfo');
            expect(testResults).toHaveProperty('configuration');

            expect(typeof testResults.timestamp).toBe('string');
            expect(typeof testResults.levelAbbreviation).toBe('string');
            expect(typeof testResults.coloredLevel).toBe('string');
            expect(typeof testResults.colorSupport).toBe('string');
            expect(typeof testResults.terminalInfo).toBe('object');
            expect(typeof testResults.configuration).toBe('object');
        });

        it('should refresh configuration when environment changes', () => {
            process.env.TERM = 'xterm-256color';
            logger = new Logger('TestService');
            const initialColorEnabled = logger.isColorEnabled();

            // Change environment
            process.env.NO_COLOR = '1';
            logger.refreshConfiguration();

            const newColorEnabled = logger.isColorEnabled();

            expect(typeof initialColorEnabled).toBe('boolean');
            expect(typeof newColorEnabled).toBe('boolean');
        });
    });

    describe('Cross-Platform Compatibility', () => {
        it('should work on Windows with cmd', () => {
            process.env.TERM = 'cmd';
            process.env.OS = 'Windows_NT';
            logger = new Logger('TestService');

            const terminalInfo = logger.getTerminalInfo();
            expect(typeof terminalInfo.isTTY).toBe('boolean');
            expect(typeof terminalInfo.supportsColors).toBe('boolean');
        });

        it('should work on Windows with PowerShell', () => {
            process.env.TERM = 'powershell';
            process.env.OS = 'Windows_NT';
            logger = new Logger('TestService');

            const terminalInfo = logger.getTerminalInfo();
            expect(typeof terminalInfo.isTTY).toBe('boolean');
            expect(typeof terminalInfo.supportsColors).toBe('boolean');
        });

        it('should work on Linux with xterm', () => {
            process.env.TERM = 'xterm-256color';
            process.env.OS = 'Linux';
            logger = new Logger('TestService');

            const terminalInfo = logger.getTerminalInfo();
            expect(typeof terminalInfo.isTTY).toBe('boolean');
            expect(typeof terminalInfo.supportsColors).toBe('boolean');
        });

        it('should work on macOS with Terminal.app', () => {
            process.env.TERM = 'xterm-256color';
            process.env.OS = 'Darwin';
            logger = new Logger('TestService');

            const terminalInfo = logger.getTerminalInfo();
            expect(typeof terminalInfo.isTTY).toBe('boolean');
            expect(typeof terminalInfo.supportsColors).toBe('boolean');
        });
    });

    describe('Environment Variable Handling', () => {
        it('should handle missing environment variables gracefully', () => {
            delete process.env.TERM;
            delete process.env.COLORTERM;
            logger = new Logger('TestService');

            const terminalInfo = logger.getTerminalInfo();
            expect(typeof terminalInfo.isTTY).toBe('boolean');
            expect(typeof terminalInfo.supportsColors).toBe('boolean');
        });

        it('should handle empty environment variables', () => {
            process.env.TERM = '';
            process.env.COLORTERM = '';
            logger = new Logger('TestService');

            const terminalInfo = logger.getTerminalInfo();
            expect(typeof terminalInfo.isTTY).toBe('boolean');
            expect(typeof terminalInfo.supportsColors).toBe('boolean');
        });
    });
});