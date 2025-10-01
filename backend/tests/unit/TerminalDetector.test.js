/**
 * TerminalDetector Tests
 * Tests terminal detection and color support functionality
 */
const TerminalDetector = require('../../infrastructure/logging/TerminalDetector');

describe('TerminalDetector', () => {
    let originalEnv;

    beforeEach(() => {
        // Save original environment
        originalEnv = { ...process.env };
    });

    afterEach(() => {
        // Restore original environment
        process.env = originalEnv;
    });

    describe('isTTY()', () => {
        it('should return boolean value', () => {
            const result = TerminalDetector.isTTY();
            expect(typeof result).toBe('boolean');
        });
    });

    describe('supportsColors()', () => {
        it('should return false when NO_COLOR is set', () => {
            process.env.NO_COLOR = '1';
            expect(TerminalDetector.supportsColors()).toBe(false);
        });

        it('should return true when FORCE_COLOR is set', () => {
            process.env.FORCE_COLOR = '1';
            expect(TerminalDetector.supportsColors()).toBe(true);
        });

        it('should return false when TERM is dumb', () => {
            process.env.TERM = 'dumb';
            expect(TerminalDetector.supportsColors()).toBe(false);
        });

        it('should return boolean value for normal TERM', () => {
            process.env.TERM = 'xterm-256color';
            const result = TerminalDetector.supportsColors();
            expect(typeof result).toBe('boolean');
        });
    });

    describe('getColorSupport()', () => {
        it('should return none when NO_COLOR is set', () => {
            process.env.NO_COLOR = '1';
            expect(TerminalDetector.getColorSupport()).toBe('none');
        });

        it('should return 24bit when COLORTERM is truecolor', () => {
            process.env.COLORTERM = 'truecolor';
            expect(TerminalDetector.getColorSupport()).toBe('24bit');
        });

        it('should return 24bit when COLORTERM is 24bit', () => {
            process.env.COLORTERM = '24bit';
            expect(TerminalDetector.getColorSupport()).toBe('24bit');
        });

        it('should return 24bit when TERM includes 256color', () => {
            process.env.TERM = 'xterm-256color';
            expect(TerminalDetector.getColorSupport()).toBe('24bit');
        });

        it('should return valid color support level', () => {
            const result = TerminalDetector.getColorSupport();
            expect(['none', '16bit', '24bit']).toContain(result);
        });
    });

    describe('getTerminalWidth()', () => {
        it('should return number or null', () => {
            const result = TerminalDetector.getTerminalWidth();
            expect(result === null || typeof result === 'number').toBe(true);
        });
    });

    describe('getTerminalHeight()', () => {
        it('should return number or null', () => {
            const result = TerminalDetector.getTerminalHeight();
            expect(result === null || typeof result === 'number').toBe(true);
        });
    });

    describe('isCI()', () => {
        it('should return true when CI is set', () => {
            process.env.CI = 'true';
            expect(TerminalDetector.isCI()).toBe(true);
        });

        it('should return true when CONTINUOUS_INTEGRATION is set', () => {
            process.env.CONTINUOUS_INTEGRATION = 'true';
            expect(TerminalDetector.isCI()).toBe(true);
        });

        it('should return true when BUILD_NUMBER is set', () => {
            process.env.BUILD_NUMBER = '123';
            expect(TerminalDetector.isCI()).toBe(true);
        });

        it('should return true when RUN_ID is set', () => {
            process.env.RUN_ID = 'abc123';
            expect(TerminalDetector.isCI()).toBe(true);
        });

        it('should return false when no CI environment variables are set', () => {
            delete process.env.CI;
            delete process.env.CONTINUOUS_INTEGRATION;
            delete process.env.BUILD_NUMBER;
            delete process.env.RUN_ID;
            expect(TerminalDetector.isCI()).toBe(false);
        });
    });

    describe('shouldUseCompactOutput()', () => {
        it('should return true when in CI', () => {
            process.env.CI = 'true';
            expect(TerminalDetector.shouldUseCompactOutput()).toBe(true);
        });

        it('should return boolean value', () => {
            const result = TerminalDetector.shouldUseCompactOutput();
            expect(typeof result).toBe('boolean');
        });
    });

    describe('getRecommendedFormat()', () => {
        it('should return valid format', () => {
            const result = TerminalDetector.getRecommendedFormat();
            expect(['compact', 'standard', 'verbose']).toContain(result);
        });
    });

    describe('getTerminalInfo()', () => {
        it('should return comprehensive terminal information', () => {
            const info = TerminalDetector.getTerminalInfo();

            expect(info).toHaveProperty('isTTY');
            expect(info).toHaveProperty('supportsColors');
            expect(info).toHaveProperty('colorSupport');
            expect(info).toHaveProperty('width');
            expect(info).toHaveProperty('height');
            expect(info).toHaveProperty('isCI');
            expect(info).toHaveProperty('term');
            expect(info).toHaveProperty('colorterm');
            expect(info).toHaveProperty('noColor');
            expect(info).toHaveProperty('forceColor');

            expect(typeof info.isTTY).toBe('boolean');
            expect(typeof info.supportsColors).toBe('boolean');
            expect(['none', '16bit', '24bit']).toContain(info.colorSupport);
            expect(typeof info.isCI).toBe('boolean');
            expect(typeof info.term).toBe('string');
            expect(typeof info.colorterm).toBe('string');
            expect(typeof info.noColor).toBe('boolean');
            expect(typeof info.forceColor).toBe('boolean');
        });
    });
});