/**
 * Tests for DirectoryScanner
 */
const path = require('path');
const fs = require('fs').promises;
const DirectoryScanner = require('@strategies/single-repo/utils/directoryScanner');
const { SKIP_DIRECTORIES } = require('@strategies/single-repo/constants');

// Mock fs.promises
jest.mock('fs', () => ({
    promises: {
        readdir: jest.fn(),
        stat: jest.fn()
    }
}));

describe('DirectoryScanner', () => {
    let directoryScanner;
    let mockLogger;
    let mockFileUtils;

    beforeEach(() => {
        mockLogger = {
            warn: jest.fn(),
            info: jest.fn(),
            error: jest.fn()
        };

        mockFileUtils = {
            isCodeFile: jest.fn()
        };

        directoryScanner = new DirectoryScanner(mockLogger, mockFileUtils);

        // Reset all mocks
        jest.clearAllMocks();
    });

    describe('constructor', () => {
        it('should initialize with logger and fileUtils', () => {
            expect(directoryScanner.logger).toBe(mockLogger);
            expect(directoryScanner.fileUtils).toBe(mockFileUtils);
        });

        it('should handle undefined logger gracefully', () => {
            const scannerWithoutLogger = new DirectoryScanner(undefined, mockFileUtils);
            expect(scannerWithoutlogger.infoger).toBeUndefined();
            expect(scannerWithoutLogger.fileUtils).toBe(mockFileUtils);
        });

        it('should handle undefined fileUtils gracefully', () => {
            const scannerWithoutFileUtils = new DirectoryScanner(mockLogger, undefined);
            expect(scannerWithoutFileUtils.logger).toBe(mockLogger);
            expect(scannerWithoutFileUtils.fileUtils).toBeUndefined();
        });
    });

    describe('shouldSkipDirectory', () => {
        it('should return true for directories in SKIP_DIRECTORIES', () => {
            SKIP_DIRECTORIES.forEach(dirName => {
                expect(directoryScanner.shouldSkipDirectory(dirName)).toBe(true);
            });
        });

        it('should return false for directories not in SKIP_DIRECTORIES', () => {
            const nonSkipDirectories = ['src', 'app', 'components', 'utils', 'test'];
            nonSkipDirectories.forEach(dirName => {
                expect(directoryScanner.shouldSkipDirectory(dirName)).toBe(false);
            });
        });

        it('should handle empty string', () => {
            expect(directoryScanner.shouldSkipDirectory('')).toBe(false);
        });

        it('should handle null and undefined', () => {
            expect(directoryScanner.shouldSkipDirectory(null)).toBe(false);
            expect(directoryScanner.shouldSkipDirectory(undefined)).toBe(false);
        });
    });

    describe('scanDirectory', () => {
        const mockStructure = {
            root: '/test/project',
            directories: [],
            files: [],
            totalDirectories: 0,
            totalFiles: 0,
            totalSize: 0,
            fileTypes: {}
        };

        beforeEach(() => {
            mockStructure.directories = [];
            mockStructure.files = [];
            mockStructure.totalDirectories = 0;
            mockStructure.totalFiles = 0;
            mockStructure.totalSize = 0;
            mockStructure.fileTypes = {};
        });

        it('should return early when depth exceeds maxDepth', async () => {
            await directoryScanner.scanDirectory('/test', mockStructure, 5, 3);
            
            expect(fs.readdir).not.toHaveBeenCalled();
            expect(mockStructure.directories).toHaveLength(0);
            expect(mockStructure.files).toHaveLength(0);
        });

        it('should handle readdir error gracefully', async () => {
            const error = new Error('Permission denied');
            fs.readdir.mockRejectedValue(error);

            await directoryScanner.scanDirectory('/test', mockStructure, 0, 3);

            expect(mockLogger.warn).toHaveBeenCalledWith(
                'DirectoryScanner: Failed to scan directory',
                expect.objectContaining({
                    dirPath: '/test',
                    error: 'Permission denied'
                })
            );
            expect(mockStructure.directories).toHaveLength(0);
            expect(mockStructure.files).toHaveLength(0);
        });

        it('should skip directories that should be skipped', async () => {
            const mockEntries = [
                { name: 'node_modules', isDirectory: true, isFile: false },
                { name: 'src', isDirectory: true, isFile: false },
                { name: 'test.js', isDirectory: false, isFile: true }
            ];

            fs.readdir.mockResolvedValue(mockEntries);
            mockFileUtils.isCodeFile.mockReturnValue(true);

            await directoryScanner.scanDirectory('/test', mockStructure, 0, 3);

            expect(mockStructure.directories).toHaveLength(1);
            expect(mockStructure.directories[0].name).toBe('src');
            expect(mockStructure.files).toHaveLength(1);
        });

        it('should process directories recursively', async () => {
            const mockEntries = [
                { name: 'src', isDirectory: true, isFile: false },
                { name: 'components', isDirectory: true, isFile: false }
            ];

            fs.readdir
                .mockResolvedValueOnce(mockEntries) // First call for root
                .mockResolvedValueOnce([]) // Second call for src
                .mockResolvedValueOnce([]); // Third call for components

            await directoryScanner.scanDirectory('/test', mockStructure, 0, 3);

            expect(fs.readdir).toHaveBeenCalledTimes(3);
            expect(mockStructure.directories).toHaveLength(2);
            expect(mockStructure.directories[0].depth).toBe(0);
            expect(mockStructure.directories[1].depth).toBe(0);
        });

        it('should process code files correctly', async () => {
            const mockEntries = [
                { name: 'app.js', isDirectory: false, isFile: true },
                { name: 'style.css', isDirectory: false, isFile: true },
                { name: 'readme.txt', isDirectory: false, isFile: true }
            ];

            const mockStats = { size: 1024 };

            fs.readdir.mockResolvedValue(mockEntries);
            fs.stat.mockResolvedValue(mockStats);
            mockFileUtils.isCodeFile
                .mockReturnValueOnce(true)  // app.js
                .mockReturnValueOnce(true)  // style.css
                .mockReturnValueOnce(false); // readme.txt

            await directoryScanner.scanDirectory('/test', mockStructure, 0, 3);

            expect(mockStructure.files).toHaveLength(2);
            expect(mockStructure.totalFiles).toBe(2);
            expect(mockStructure.totalSize).toBe(2048);
            expect(mockStructure.fileTypes['.js']).toBe(1);
            expect(mockStructure.fileTypes['.css']).toBe(1);
        });

        it('should handle file stat errors gracefully', async () => {
            const mockEntries = [
                { name: 'app.js', isDirectory: false, isFile: true }
            ];

            fs.readdir.mockResolvedValue(mockEntries);
            fs.stat.mockRejectedValue(new Error('File not found'));
            mockFileUtils.isCodeFile.mockReturnValue(true);

            await directoryScanner.scanDirectory('/test', mockStructure, 0, 3);

            expect(mockStructure.files).toHaveLength(0);
            expect(mockStructure.totalFiles).toBe(0);
            expect(mockStructure.totalSize).toBe(0);
        });

        it('should handle undefined fileUtils gracefully', async () => {
            const scannerWithoutFileUtils = new DirectoryScanner(mockLogger, undefined);
            const mockEntries = [
                { name: 'app.js', isDirectory: false, isFile: true }
            ];

            fs.readdir.mockResolvedValue(mockEntries);

            await scannerWithoutFileUtils.scanDirectory('/test', mockStructure, 0, 3);

            expect(mockStructure.files).toHaveLength(0);
            expect(mockStructure.totalFiles).toBe(0);
        });

        it('should handle undefined logger gracefully', async () => {
            const scannerWithoutLogger = new DirectoryScanner(undefined, mockFileUtils);
            const error = new Error('Permission denied');
            fs.readdir.mockRejectedValue(error);

            await expect(scannerWithoutLogger.scanDirectory('/test', mockStructure, 0, 3))
                .resolves.not.toThrow();
        });

        it('should handle mixed file types and directories', async () => {
            const mockEntries = [
                { name: 'src', isDirectory: true, isFile: false },
                { name: 'app.js', isDirectory: false, isFile: true },
                { name: 'config.json', isDirectory: false, isFile: true },
                { name: 'node_modules', isDirectory: true, isFile: false },
                { name: 'readme.md', isDirectory: false, isFile: true }
            ];

            const mockStats = { size: 512 };

            fs.readdir.mockResolvedValue(mockEntries);
            fs.stat.mockResolvedValue(mockStats);
            mockFileUtils.isCodeFile
                .mockReturnValueOnce(true)   // app.js
                .mockReturnValueOnce(true)   // config.json
                .mockReturnValueOnce(false); // readme.md

            await directoryScanner.scanDirectory('/test', mockStructure, 0, 3);

            expect(mockStructure.directories).toHaveLength(1); // Only 'src', 'node_modules' is skipped
            expect(mockStructure.files).toHaveLength(2); // Only code files
            expect(mockStructure.totalDirectories).toBe(1);
            expect(mockStructure.totalFiles).toBe(2);
            expect(mockStructure.totalSize).toBe(1024);
        });

        it('should handle depth tracking correctly', async () => {
            const mockEntries = [
                { name: 'src', isDirectory: true, isFile: false }
            ];

            fs.readdir
                .mockResolvedValueOnce(mockEntries) // Root level
                .mockResolvedValueOnce([]); // src level

            await directoryScanner.scanDirectory('/test', mockStructure, 0, 3);

            expect(mockStructure.directories[0].depth).toBe(0);
        });

        it('should handle relative path calculation correctly', async () => {
            const mockEntries = [
                { name: 'app.js', isDirectory: false, isFile: true }
            ];

            const mockStats = { size: 1024 };

            fs.readdir.mockResolvedValue(mockEntries);
            fs.stat.mockResolvedValue(mockStats);
            mockFileUtils.isCodeFile.mockReturnValue(true);

            await directoryScanner.scanDirectory('/test/project', mockStructure, 0, 3);

            expect(mockStructure.files[0].path).toBe('app.js');
        });
    });

    describe('scanForTestFiles', () => {
        const testFiles = [];

        beforeEach(() => {
            testFiles.length = 0;
        });

        it('should scan directories recursively for test files', async () => {
            const mockEntries = [
                { name: 'src', isDirectory: true, isFile: false },
                { name: 'test.js', isDirectory: false, isFile: true },
                { name: 'node_modules', isDirectory: true, isFile: false }
            ];

            fs.readdir
                .mockResolvedValueOnce(mockEntries) // Root level
                .mockResolvedValueOnce([]); // src level

            mockFileUtils.isCodeFile.mockReturnValue(true);

            await directoryScanner.scanForTestFiles('/test', testFiles);

            expect(fs.readdir).toHaveBeenCalledTimes(2);
            expect(testFiles).toHaveLength(1);
            expect(testFiles[0]).toBe(path.join('/test', 'test.js'));
        });

        it('should skip directories that should be skipped', async () => {
            const mockEntries = [
                { name: 'node_modules', isDirectory: true, isFile: false },
                { name: 'src', isDirectory: true, isFile: false },
                { name: 'test.js', isDirectory: false, isFile: true }
            ];

            fs.readdir
                .mockResolvedValueOnce(mockEntries) // Root level
                .mockResolvedValueOnce([]); // src level

            mockFileUtils.isCodeFile.mockReturnValue(true);

            await directoryScanner.scanForTestFiles('/test', testFiles);

            expect(testFiles).toHaveLength(1);
            expect(testFiles[0]).toBe(path.join('/test', 'test.js'));
        });

        it('should only include code files', async () => {
            const mockEntries = [
                { name: 'test.js', isDirectory: false, isFile: true },
                { name: 'readme.txt', isDirectory: false, isFile: true },
                { name: 'config.json', isDirectory: false, isFile: true }
            ];

            fs.readdir.mockResolvedValue(mockEntries);
            mockFileUtils.isCodeFile
                .mockReturnValueOnce(true)   // test.js
                .mockReturnValueOnce(false)  // readme.txt
                .mockReturnValueOnce(true);  // config.json

            await directoryScanner.scanForTestFiles('/test', testFiles);

            expect(testFiles).toHaveLength(2);
            expect(testFiles).toContain(path.join('/test', 'test.js'));
            expect(testFiles).toContain(path.join('/test', 'config.json'));
        });

        it('should handle readdir errors gracefully', async () => {
            const error = new Error('Permission denied');
            fs.readdir.mockRejectedValue(error);

            await directoryScanner.scanForTestFiles('/test', testFiles);

            expect(testFiles).toHaveLength(0);
        });

        it('should handle undefined fileUtils gracefully', async () => {
            const scannerWithoutFileUtils = new DirectoryScanner(mockLogger, undefined);
            const mockEntries = [
                { name: 'test.js', isDirectory: false, isFile: true }
            ];

            fs.readdir.mockResolvedValue(mockEntries);

            await scannerWithoutFileUtils.scanForTestFiles('/test', testFiles);

            expect(testFiles).toHaveLength(0);
        });

        it('should handle empty directory', async () => {
            fs.readdir.mockResolvedValue([]);

            await directoryScanner.scanForTestFiles('/test', testFiles);

            expect(testFiles).toHaveLength(0);
        });

        it('should handle mixed content correctly', async () => {
            const mockEntries = [
                { name: 'src', isDirectory: true, isFile: false },
                { name: 'test.js', isDirectory: false, isFile: true },
                { name: '.git', isDirectory: true, isFile: false },
                { name: 'config.json', isDirectory: false, isFile: true }
            ];

            fs.readdir
                .mockResolvedValueOnce(mockEntries) // Root level
                .mockResolvedValueOnce([]); // src level

            mockFileUtils.isCodeFile
                .mockReturnValueOnce(true)   // test.js
                .mockReturnValueOnce(true);  // config.json

            await directoryScanner.scanForTestFiles('/test', testFiles);

            expect(testFiles).toHaveLength(2);
            expect(testFiles).toContain(path.join('/test', 'test.js'));
            expect(testFiles).toContain(path.join('/test', 'config.json'));
        });

        it('should handle nested directory structure', async () => {
            const rootEntries = [
                { name: 'src', isDirectory: true, isFile: false },
                { name: 'test.js', isDirectory: false, isFile: true }
            ];

            const srcEntries = [
                { name: 'components', isDirectory: true, isFile: false },
                { name: 'utils.js', isDirectory: false, isFile: true }
            ];

            const componentsEntries = [
                { name: 'Button.test.js', isDirectory: false, isFile: true }
            ];

            fs.readdir
                .mockResolvedValueOnce(rootEntries)     // Root level
                .mockResolvedValueOnce(srcEntries)      // src level
                .mockResolvedValueOnce(componentsEntries); // components level

            mockFileUtils.isCodeFile
                .mockReturnValueOnce(true)   // test.js
                .mockReturnValueOnce(true)   // utils.js
                .mockReturnValueOnce(true);  // Button.test.js

            await directoryScanner.scanForTestFiles('/test', testFiles);

            expect(testFiles).toHaveLength(3);
            expect(testFiles).toContain(path.join('/test', 'test.js'));
            expect(testFiles).toContain(path.join('/test', 'src', 'utils.js'));
            expect(testFiles).toContain(path.join('/test', 'src', 'components', 'Button.test.js'));
        });
    });

    describe('edge cases and error handling', () => {
        it('should handle null and undefined parameters gracefully', async () => {
            const mockStructure = {
                root: '/test',
                directories: [],
                files: [],
                totalDirectories: 0,
                totalFiles: 0,
                totalSize: 0,
                fileTypes: {}
            };

            // Test with null/undefined parameters
            await expect(directoryScanner.scanDirectory(null, mockStructure, 0, 3))
                .resolves.not.toThrow();
            
            await expect(directoryScanner.scanDirectory(undefined, mockStructure, 0, 3))
                .resolves.not.toThrow();

            await expect(directoryScanner.scanForTestFiles(null, []))
                .resolves.not.toThrow();

            await expect(directoryScanner.scanForTestFiles(undefined, []))
                .resolves.not.toThrow();
        });

        it('should handle invalid depth parameters', async () => {
            const mockStructure = {
                root: '/test',
                directories: [],
                files: [],
                totalDirectories: 0,
                totalFiles: 0,
                totalSize: 0,
                fileTypes: {}
            };

            // Test with negative depth
            await directoryScanner.scanDirectory('/test', mockStructure, -1, 3);
            expect(mockStructure.directories).toHaveLength(0);

            // Test with negative maxDepth
            await directoryScanner.scanDirectory('/test', mockStructure, 0, -1);
            expect(fs.readdir).not.toHaveBeenCalled();
        });

        it('should handle file system errors in nested directories', async () => {
            const mockStructure = {
                root: '/test',
                directories: [],
                files: [],
                totalDirectories: 0,
                totalFiles: 0,
                totalSize: 0,
                fileTypes: {}
            };

            const mockEntries = [
                { name: 'src', isDirectory: true, isFile: false },
                { name: 'app.js', isDirectory: false, isFile: true }
            ];

            fs.readdir
                .mockResolvedValueOnce(mockEntries) // Root level
                .mockRejectedValueOnce(new Error('Nested error')); // src level

            const mockStats = { size: 1024 };
            fs.stat.mockResolvedValue(mockStats);
            mockFileUtils.isCodeFile.mockReturnValue(true);

            await directoryScanner.scanDirectory('/test', mockStructure, 0, 3);

            expect(mockStructure.directories).toHaveLength(1);
            expect(mockStructure.files).toHaveLength(1);
            expect(mockLogger.warn).toHaveBeenCalled();
        });
    });
}); 