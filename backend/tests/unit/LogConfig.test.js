/**
 * LogConfig Tests
 * Tests centralized logging configuration management
 */
const LogConfig = require('../../infrastructure/logging/LogConfig');

describe('LogConfig', () => {
    let logConfig;
    let originalEnv;

    beforeEach(() => {
        originalEnv = { ...process.env };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe('constructor', () => {
        it('should initialize with default configuration', () => {
            process.env.NODE_ENV = 'development';
            
            logConfig = new LogConfig();

            expect(logConfig).toBeDefined();
            expect(logConfig.config).toBeDefined();
        });
    });

    describe('buildConfiguration()', () => {
        beforeEach(() => {
            process.env.NODE_ENV = 'development';
            logConfig = new LogConfig();
        });

        it('should build correct environment configuration', () => {
            const envConfig = logConfig.config.environment;

            expect(envConfig).toHaveProperty('isDevelopment');
            expect(envConfig).toHaveProperty('isProduction');
            expect(envConfig).toHaveProperty('isTest');
            expect(envConfig).toHaveProperty('nodeEnv');

            expect(typeof envConfig.isDevelopment).toBe('boolean');
            expect(typeof envConfig.isProduction).toBe('boolean');
            expect(typeof envConfig.isTest).toBe('boolean');
            expect(typeof envConfig.nodeEnv).toBe('string');
        });

        it('should build correct terminal configuration', () => {
            const terminalConfig = logConfig.config.terminal;

            expect(terminalConfig).toHaveProperty('isTTY');
            expect(terminalConfig).toHaveProperty('supportsColors');
            expect(terminalConfig).toHaveProperty('colorSupport');
            expect(terminalConfig).toHaveProperty('width');
            expect(terminalConfig).toHaveProperty('height');
            expect(terminalConfig).toHaveProperty('isCI');
            expect(terminalConfig).toHaveProperty('recommendedFormat');

            expect(typeof terminalConfig.isTTY).toBe('boolean');
            expect(typeof terminalConfig.supportsColors).toBe('boolean');
            expect(['none', '16bit', '24bit']).toContain(terminalConfig.colorSupport);
            expect(typeof terminalConfig.isCI).toBe('boolean');
            expect(typeof terminalConfig.recommendedFormat).toBe('string');
        });

        it('should build correct levels configuration', () => {
            const levelsConfig = logConfig.config.levels;

            expect(levelsConfig).toHaveProperty('default');
            expect(levelsConfig).toHaveProperty('current');
            expect(levelsConfig).toHaveProperty('available');

            expect(typeof levelsConfig.default).toBe('string');
            expect(typeof levelsConfig.current).toBe('string');
            expect(Array.isArray(levelsConfig.available)).toBe(true);
        });

        it('should build correct formatting configuration', () => {
            const formattingConfig = logConfig.config.formatting;

            expect(formattingConfig).toHaveProperty('timeFormat');
            expect(formattingConfig).toHaveProperty('levelAbbreviation');
            expect(formattingConfig).toHaveProperty('colorEnabled');
            expect(formattingConfig).toHaveProperty('compactMode');

            expect(typeof formattingConfig.timeFormat).toBe('string');
            expect(typeof formattingConfig.levelAbbreviation).toBe('boolean');
            expect(typeof formattingConfig.colorEnabled).toBe('boolean');
            expect(typeof formattingConfig.compactMode).toBe('boolean');
        });

        it('should build correct output configuration', () => {
            const outputConfig = logConfig.config.output;

            expect(outputConfig).toHaveProperty('console');
            expect(outputConfig).toHaveProperty('file');

            expect(outputConfig.console).toHaveProperty('enabled');
            expect(outputConfig.console).toHaveProperty('colorize');
            expect(outputConfig.file).toHaveProperty('enabled');
            expect(outputConfig.file).toHaveProperty('colorize');

            expect(typeof outputConfig.console.enabled).toBe('boolean');
            expect(typeof outputConfig.console.colorize).toBe('boolean');
            expect(typeof outputConfig.file.enabled).toBe('boolean');
            expect(typeof outputConfig.file.colorize).toBe('boolean');
        });
    });

    describe('getDefaultLogLevel()', () => {
        it('should return info for development', () => {
            process.env.NODE_ENV = 'development';
            logConfig = new LogConfig();

            expect(logConfig.getDefaultLogLevel()).toBe('info');
        });

        it('should return warn for production', () => {
            process.env.NODE_ENV = 'production';
            logConfig = new LogConfig();

            expect(logConfig.getDefaultLogLevel()).toBe('warn');
        });

        it('should return error for test', () => {
            process.env.NODE_ENV = 'test';
            logConfig = new LogConfig();

            expect(logConfig.getDefaultLogLevel()).toBe('error');
        });

        it('should return info for unknown environment', () => {
            process.env.NODE_ENV = 'unknown';
            logConfig = new LogConfig();

            expect(logConfig.getDefaultLogLevel()).toBe('info');
        });
    });

    describe('getRecommendedTimeFormat()', () => {
        it('should return valid time format', () => {
            logConfig = new LogConfig();
            const result = logConfig.getRecommendedTimeFormat();
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
        });
    });

    describe('shouldUseAbbreviations()', () => {
        it('should return boolean', () => {
            logConfig = new LogConfig();
            const result = logConfig.shouldUseAbbreviations();
            expect(typeof result).toBe('boolean');
        });
    });

    describe('getLevelAbbreviation()', () => {
        beforeEach(() => {
            logConfig = new LogConfig();
        });

        it('should return abbreviation when abbreviations enabled', () => {
            logConfig.config.formatting.levelAbbreviation = true;

            expect(logConfig.getLevelAbbreviation('error')).toBe('E');
            expect(logConfig.getLevelAbbreviation('warn')).toBe('W');
            expect(logConfig.getLevelAbbreviation('info')).toBe('I');
        });

        it('should return full level when abbreviations disabled', () => {
            logConfig.config.formatting.levelAbbreviation = false;

            expect(logConfig.getLevelAbbreviation('error')).toBe('ERROR');
            expect(logConfig.getLevelAbbreviation('warn')).toBe('WARN');
            expect(logConfig.getLevelAbbreviation('info')).toBe('INFO');
        });
    });

    describe('getFormattedTimestamp()', () => {
        it('should format timestamp', () => {
            const testTimestamp = new Date();
            logConfig = new LogConfig();

            const result = logConfig.getFormattedTimestamp(testTimestamp, 'console');

            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
        });
    });

    describe('getColoredLevel()', () => {
        it('should return string', () => {
            logConfig = new LogConfig();

            const result = logConfig.getColoredLevel('error');

            expect(typeof result).toBe('string');
        });
    });

    describe('shouldUseColors()', () => {
        it('should return boolean', () => {
            logConfig = new LogConfig();

            const result = logConfig.shouldUseColors('console');

            expect(typeof result).toBe('boolean');
        });
    });

    describe('getWinstonColorizeFormat()', () => {
        it('should return Winston format object', () => {
            logConfig = new LogConfig();

            const result = logConfig.getWinstonColorizeFormat();

            expect(result).toBeDefined();
        });
    });

    describe('refreshConfiguration()', () => {
        it('should refresh all components', () => {
            logConfig = new LogConfig();

            logConfig.refreshConfiguration();

            expect(logConfig.config).toBeDefined();
        });
    });

    describe('getConfiguration()', () => {
        it('should return complete configuration', () => {
            logConfig = new LogConfig();

            const config = logConfig.getConfiguration();

            expect(config).toHaveProperty('environment');
            expect(config).toHaveProperty('terminal');
            expect(config).toHaveProperty('levels');
            expect(config).toHaveProperty('formatting');
            expect(config).toHaveProperty('output');
            expect(config).toHaveProperty('performance');
        });
    });

    describe('getComponentConfig()', () => {
        it('should return component configuration', () => {
            logConfig = new LogConfig();

            const terminalConfig = logConfig.getComponentConfig('terminal');
            const levelsConfig = logConfig.getComponentConfig('levels');

            expect(terminalConfig).toBeDefined();
            expect(levelsConfig).toBeDefined();
        });

        it('should return empty object for unknown component', () => {
            logConfig = new LogConfig();

            const unknownConfig = logConfig.getComponentConfig('unknown');

            expect(unknownConfig).toEqual({});
        });
    });

    describe('testConfiguration()', () => {
        it('should return test results', () => {
            logConfig = new LogConfig();

            const results = logConfig.testConfiguration();

            expect(results).toHaveProperty('timestamp');
            expect(results).toHaveProperty('levelAbbreviation');
            expect(results).toHaveProperty('coloredLevel');
            expect(results).toHaveProperty('colorSupport');
            expect(results).toHaveProperty('terminalInfo');
            expect(results).toHaveProperty('configuration');

            expect(typeof results.timestamp).toBe('string');
            expect(typeof results.levelAbbreviation).toBe('string');
            expect(typeof results.coloredLevel).toBe('string');
            expect(typeof results.colorSupport).toBe('string');
            expect(typeof results.terminalInfo).toBe('object');
            expect(typeof results.configuration).toBe('object');
        });
    });
});