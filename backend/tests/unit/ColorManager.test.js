/**
 * ColorManager Tests
 * Tests color support management and Winston integration
 */
const ColorManager = require('../../infrastructure/logging/ColorManager');

describe('ColorManager', () => {
    let colorManager;
    let originalEnv;

    beforeEach(() => {
        originalEnv = { ...process.env };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe('constructor', () => {
        it('should initialize with terminal capabilities', () => {
            colorManager = new ColorManager();
            expect(colorManager).toBeDefined();
            expect(typeof colorManager.supportsColors).toBe('boolean');
            expect(['none', '16bit', '24bit']).toContain(colorManager.colorSupport);
        });
    });

    describe('getColorizeFormat()', () => {
        it('should return Winston format object', () => {
            colorManager = new ColorManager();
            const format = colorManager.getColorizeFormat();
            expect(format).toBeDefined();
        });
    });

    describe('getColorMapping()', () => {
        it('should return correct color mapping', () => {
            colorManager = new ColorManager();
            const mapping = colorManager.getColorMapping();

            expect(mapping).toHaveProperty('error');
            expect(mapping).toHaveProperty('warn');
            expect(mapping).toHaveProperty('info');
            expect(mapping).toHaveProperty('debug');
            expect(mapping).toHaveProperty('success');
            expect(mapping).toHaveProperty('failure');
        });
    });

    describe('shouldUseColors()', () => {
        it('should return false for file context', () => {
            colorManager = new ColorManager();
            expect(colorManager.shouldUseColors('file')).toBe(false);
        });

        it('should return boolean for console context', () => {
            colorManager = new ColorManager();
            const result = colorManager.shouldUseColors('console');
            expect(typeof result).toBe('boolean');
        });
    });

    describe('getAnsiColor()', () => {
        it('should return ANSI color code or empty string', () => {
            colorManager = new ColorManager();
            const result = colorManager.getAnsiColor('red');
            expect(typeof result).toBe('string');
        });
    });

    describe('colorizeText()', () => {
        it('should return string', () => {
            colorManager = new ColorManager();
            const result = colorManager.colorizeText('test', 'red');
            expect(typeof result).toBe('string');
        });
    });

    describe('getLevelColor()', () => {
        it('should return color for log levels', () => {
            colorManager = new ColorManager();
            expect(typeof colorManager.getLevelColor('error')).toBe('string');
            expect(typeof colorManager.getLevelColor('warn')).toBe('string');
            expect(typeof colorManager.getLevelColor('info')).toBe('string');
        });
    });

    describe('getColoredLevel()', () => {
        it('should return string', () => {
            colorManager = new ColorManager();
            const result = colorManager.getColoredLevel('error');
            expect(typeof result).toBe('string');
        });
    });

    describe('getColorInfo()', () => {
        it('should return comprehensive color information', () => {
            colorManager = new ColorManager();
            const info = colorManager.getColorInfo();

            expect(info).toHaveProperty('supportsColors');
            expect(info).toHaveProperty('colorSupport');
            expect(info).toHaveProperty('isTTY');
            expect(info).toHaveProperty('colorMapping');
            expect(info).toHaveProperty('environment');

            expect(typeof info.supportsColors).toBe('boolean');
            expect(['none', '16bit', '24bit']).toContain(info.colorSupport);
            expect(typeof info.isTTY).toBe('boolean');
            expect(typeof info.colorMapping).toBe('object');
            expect(typeof info.environment).toBe('object');
        });
    });

    describe('createConditionalColorFormatter()', () => {
        it('should return function', () => {
            colorManager = new ColorManager();
            const formatter = colorManager.createConditionalColorFormatter(
                (info) => info.message,
                'console'
            );
            expect(typeof formatter).toBe('function');
        });
    });

    describe('testColorSupport()', () => {
        it('should return string', () => {
            colorManager = new ColorManager();
            const result = colorManager.testColorSupport();
            expect(typeof result).toBe('string');
        });
    });
});