/**
 * TimeFormatter Tests
 * Tests time format abbreviation and context-aware formatting
 */
const TimeFormatter = require('../../infrastructure/logging/TimeFormatter');

describe('TimeFormatter', () => {
    let timeFormatter;

    beforeEach(() => {
        timeFormatter = new TimeFormatter();
    });

    describe('constructor', () => {
        it('should initialize with default time formats', () => {
            expect(timeFormatter.timeFormats).toEqual({
                console: 'HH:mm:ss',
                file: 'YYYY-MM-DD HH:mm:ss',
                compact: 'HH:mm',
                verbose: 'YYYY-MM-DD HH:mm:ss.SSS',
                relative: 'relative'
            });
        });
    });

    describe('formatTimestamp()', () => {
        const testTimestamp = new Date('2024-12-19T14:30:25.123Z');

        it('should format timestamp for console context', () => {
            const result = timeFormatter.formatTimestamp(testTimestamp, 'console');
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
        });

        it('should format timestamp for file context', () => {
            const result = timeFormatter.formatTimestamp(testTimestamp, 'file');
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
        });

        it('should format timestamp for compact context', () => {
            const result = timeFormatter.formatTimestamp(testTimestamp, 'compact');
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
        });

        it('should format timestamp for verbose context', () => {
            const result = timeFormatter.formatTimestamp(testTimestamp, 'verbose');
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
        });

        it('should format timestamp for relative context', () => {
            const result = timeFormatter.formatTimestamp(testTimestamp, 'relative');
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
        });

        it('should default to console format for unknown context', () => {
            const result = timeFormatter.formatTimestamp(testTimestamp, 'unknown');
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
        });
    });

    describe('getRecommendedFormat()', () => {
        it('should return file format for file output type', () => {
            const terminalInfo = { isCI: false, width: 80 };
            const result = timeFormatter.getRecommendedFormat(terminalInfo, 'file');
            expect(result).toBe('file');
        });

        it('should return compact format for CI environment', () => {
            const terminalInfo = { isCI: true, width: 120 };
            const result = timeFormatter.getRecommendedFormat(terminalInfo, 'console');
            expect(result).toBe('compact');
        });

        it('should return compact format when should use compact output', () => {
            const terminalInfo = { isCI: false, shouldUseCompactOutput: true };
            const result = timeFormatter.getRecommendedFormat(terminalInfo, 'console');
            expect(result).toBe('compact');
        });

        it('should return verbose format for wide terminals', () => {
            const terminalInfo = { isCI: false, width: 150 };
            const result = timeFormatter.getRecommendedFormat(terminalInfo, 'console');
            expect(result).toBe('verbose');
        });

        it('should return console format by default', () => {
            const terminalInfo = { isCI: false, width: 100 };
            const result = timeFormatter.getRecommendedFormat(terminalInfo, 'console');
            expect(result).toBe('console');
        });
    });

    describe('formatTimestampAuto()', () => {
        const testTimestamp = new Date('2024-12-19T14:30:25.123Z');

        it('should use provided context', () => {
            const result = timeFormatter.formatTimestampAuto(testTimestamp, {
                context: 'compact'
            });
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
        });

        it('should auto-detect format when context is auto', () => {
            const terminalInfo = { isCI: true, width: 80 };
            const result = timeFormatter.formatTimestampAuto(testTimestamp, {
                context: 'auto',
                terminalInfo,
                outputType: 'console'
            });
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
        });

        it('should default to console format', () => {
            const result = timeFormatter.formatTimestampAuto(testTimestamp);
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
        });
    });

    describe('getFormatString()', () => {
        it('should return correct format string for known context', () => {
            expect(timeFormatter.getFormatString('console')).toBe('HH:mm:ss');
            expect(timeFormatter.getFormatString('compact')).toBe('HH:mm');
            expect(timeFormatter.getFormatString('file')).toBe('YYYY-MM-DD HH:mm:ss');
        });

        it('should return console format for unknown context', () => {
            expect(timeFormatter.getFormatString('unknown')).toBe('HH:mm:ss');
        });
    });

    describe('getTimestampWidth()', () => {
        it('should return correct width for known contexts', () => {
            expect(timeFormatter.getTimestampWidth('console')).toBe(8);
            expect(timeFormatter.getTimestampWidth('compact')).toBe(5);
            expect(timeFormatter.getTimestampWidth('file')).toBe(19);
            expect(timeFormatter.getTimestampWidth('verbose')).toBe(23);
        });

        it('should return default width for unknown context', () => {
            expect(timeFormatter.getTimestampWidth('unknown')).toBe(8);
        });
    });

    describe('formatTimestampPadded()', () => {
        const testTimestamp = new Date('2024-12-19T14:30:25.123Z');

        it('should pad timestamp to specified width', () => {
            const result = timeFormatter.formatTimestampPadded(testTimestamp, 'console', 10);
            expect(typeof result).toBe('string');
            expect(result.length).toBe(10);
        });

        it('should use default width when not specified', () => {
            const result = timeFormatter.formatTimestampPadded(testTimestamp, 'console');
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
        });

        it('should pad compact format correctly', () => {
            const result = timeFormatter.formatTimestampPadded(testTimestamp, 'compact', 8);
            expect(typeof result).toBe('string');
            expect(result.length).toBe(8);
        });
    });

    describe('getAvailableFormats()', () => {
        it('should return copy of available formats', () => {
            const formats = timeFormatter.getAvailableFormats();
            expect(formats).toEqual(timeFormatter.timeFormats);
            expect(formats).not.toBe(timeFormatter.timeFormats); // Should be a copy
        });
    });

    describe('addCustomFormat()', () => {
        it('should add custom format', () => {
            timeFormatter.addCustomFormat('custom', 'HH:mm:ss.SSS');
            expect(timeFormatter.timeFormats.custom).toBe('HH:mm:ss.SSS');
        });
    });

    describe('testFormat()', () => {
        it('should return sample formatted timestamp', () => {
            const result = timeFormatter.testFormat('console');
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
        });

        it('should default to console format', () => {
            const result = timeFormatter.testFormat();
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
        });
    });

    describe('getTimeFormatInfo()', () => {
        it('should return comprehensive time format information', () => {
            const info = timeFormatter.getTimeFormatInfo();

            expect(info).toHaveProperty('currentTime');
            expect(info).toHaveProperty('availableFormats');
            expect(info).toHaveProperty('sampleFormats');
            expect(info).toHaveProperty('widths');

            expect(typeof info.currentTime).toBe('string');
            expect(typeof info.availableFormats).toBe('object');
            expect(typeof info.sampleFormats).toBe('object');
            expect(typeof info.widths).toBe('object');
        });
    });
});