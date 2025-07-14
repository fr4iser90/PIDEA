/**
 * Unit tests for FileUtils
 */
const path = require('path');
const fs = require('fs').promises;
const FileUtils = require('@strategies/single-repo/utils/fileUtils');

// Mock fs.promises
jest.mock('fs', () => ({
    promises: {
        access: jest.fn(),
        stat: jest.fn(),
        readdir: jest.fn(),
        readFile: jest.fn()
    }
}));

describe('FileUtils', () => {
    let fileUtils;
    let mockLogger;

    beforeEach(() => {
        mockLogger = {
            warn: jest.fn(),
            error: jest.fn(),
            info: jest.fn(),
            debug: jest.fn()
        };
        fileUtils = new FileUtils(mockLogger);
        
        // Clear all mocks
        jest.clearAllMocks();
    });

    describe('constructor', () => {
        it('should initialize with logger', () => {
            expect(fileUtils.logger).toBe(mockLogger);
        });

        it('should handle undefined logger gracefully', () => {
            const fileUtilsWithoutLogger = new FileUtils(undefined);
            expect(fileUtilsWithoutlogger.infoger).toBeUndefined();
        });
    });

    describe('fileExists', () => {
        it('should return true when file exists', async () => {
            fs.access.mockResolvedValue(undefined);

            const result = await fileUtils.fileExists('/path/to/file.js');

            expect(result).toBe(true);
            expect(fs.access).toHaveBeenCalledWith('/path/to/file.js');
        });

        it('should return false when file does not exist', async () => {
            fs.access.mockRejectedValue(new Error('File not found'));

            const result = await fileUtils.fileExists('/path/to/nonexistent.js');

            expect(result).toBe(false);
            expect(fs.access).toHaveBeenCalledWith('/path/to/nonexistent.js');
        });

        it('should return false when access throws any error', async () => {
            fs.access.mockRejectedValue(new Error('Permission denied'));

            const result = await fileUtils.fileExists('/path/to/file.js');

            expect(result).toBe(false);
        });
    });

    describe('directoryExists', () => {
        it('should return true when directory exists and is a directory', async () => {
            const mockStats = {
                isDirectory: true
            };
            fs.stat.mockResolvedValue(mockStats);

            const result = await fileUtils.directoryExists('/path/to/directory');

            expect(result).toBe(true);
            expect(fs.stat).toHaveBeenCalledWith('/path/to/directory');
        });

        it('should return false when path exists but is not a directory', async () => {
            const mockStats = {
                isDirectory: false
            };
            fs.stat.mockResolvedValue(mockStats);

            const result = await fileUtils.directoryExists('/path/to/file.js');

            expect(result).toBe(false);
        });

        it('should return false when directory does not exist', async () => {
            fs.stat.mockRejectedValue(new Error('Directory not found'));

            const result = await fileUtils.directoryExists('/path/to/nonexistent');

            expect(result).toBe(false);
        });

        it('should return false when stat throws any error', async () => {
            fs.stat.mockRejectedValue(new Error('Permission denied'));

            const result = await fileUtils.directoryExists('/path/to/directory');

            expect(result).toBe(false);
        });
    });

    describe('hasAnyFile', () => {
        it('should return true when first file exists', async () => {
            fs.access
                .mockRejectedValueOnce(new Error('File not found'))
                .mockResolvedValueOnce(undefined);

            const result = await fileUtils.hasAnyFile('/project', ['file1.js', 'file2.js']);

            expect(result).toBe(true);
            expect(fs.access).toHaveBeenCalledWith(path.join('/project', 'file1.js'));
            expect(fs.access).toHaveBeenCalledWith(path.join('/project', 'file2.js'));
        });

        it('should return true when any file exists', async () => {
            fs.access
                .mockRejectedValueOnce(new Error('File not found'))
                .mockRejectedValueOnce(new Error('File not found'))
                .mockResolvedValueOnce(undefined);

            const result = await fileUtils.hasAnyFile('/project', ['file1.js', 'file2.js', 'file3.js']);

            expect(result).toBe(true);
        });

        it('should return false when no files exist', async () => {
            fs.access.mockRejectedValue(new Error('File not found'));

            const result = await fileUtils.hasAnyFile('/project', ['file1.js', 'file2.js']);

            expect(result).toBe(false);
        });

        it('should return false for empty files array', async () => {
            const result = await fileUtils.hasAnyFile('/project', []);

            expect(result).toBe(false);
            expect(fs.access).not.toHaveBeenCalled();
        });

        it('should handle single file array', async () => {
            fs.access.mockResolvedValue(undefined);

            const result = await fileUtils.hasAnyFile('/project', ['file1.js']);

            expect(result).toBe(true);
            expect(fs.access).toHaveBeenCalledTimes(1);
        });
    });

    describe('getDirectoryStats', () => {
        it('should return correct stats for directory with files and subdirectories', async () => {
            const mockEntries = [
                { name: 'file1.js', isFile: true, isDirectory: false },
                { name: 'file2.css', isFile: true, isDirectory: false },
                { name: 'subdir', isFile: false, isDirectory: true },
                { name: 'file3.txt', isFile: true, isDirectory: false }
            ];

            const mockFileStats = [
                { size: 1024 },
                { size: 2048 },
                { size: 512 }
            ];

            fs.readdir.mockResolvedValue(mockEntries);
            fs.stat
                .mockResolvedValueOnce(mockFileStats[0])
                .mockResolvedValueOnce(mockFileStats[1])
                .mockResolvedValueOnce(mockFileStats[2]);

            const result = await fileUtils.getDirectoryStats('/test/directory');

            expect(result).toEqual({
                files: 3,
                directories: 1,
                totalSize: 3584,
                fileTypes: {
                    '.js': 1,
                    '.css': 1,
                    '.txt': 1
                }
            });
        });

        it('should handle directory with only files', async () => {
            const mockEntries = [
                { name: 'file1.js', isFile: true, isDirectory: false },
                { name: 'file2.js', isFile: true, isDirectory: false }
            ];

            const mockFileStats = [
                { size: 1024 },
                { size: 2048 }
            ];

            fs.readdir.mockResolvedValue(mockEntries);
            fs.stat
                .mockResolvedValueOnce(mockFileStats[0])
                .mockResolvedValueOnce(mockFileStats[1]);

            const result = await fileUtils.getDirectoryStats('/test/directory');

            expect(result).toEqual({
                files: 2,
                directories: 0,
                totalSize: 3072,
                fileTypes: {
                    '.js': 2
                }
            });
        });

        it('should handle directory with only subdirectories', async () => {
            const mockEntries = [
                { name: 'subdir1', isFile: false, isDirectory: true },
                { name: 'subdir2', isFile: false, isDirectory: true }
            ];

            fs.readdir.mockResolvedValue(mockEntries);

            const result = await fileUtils.getDirectoryStats('/test/directory');

            expect(result).toEqual({
                files: 0,
                directories: 2,
                totalSize: 0,
                fileTypes: {}
            });
        });

        it('should handle empty directory', async () => {
            fs.readdir.mockResolvedValue([]);

            const result = await fileUtils.getDirectoryStats('/test/directory');

            expect(result).toEqual({
                files: 0,
                directories: 0,
                totalSize: 0,
                fileTypes: {}
            });
        });

        it('should handle stat errors gracefully', async () => {
            const mockEntries = [
                { name: 'file1.js', isFile: true, isDirectory: false },
                { name: 'file2.js', isFile: true, isDirectory: false }
            ];

            fs.readdir.mockResolvedValue(mockEntries);
            fs.stat
                .mockResolvedValueOnce({ size: 1024 })
                .mockRejectedValueOnce(new Error('Stat error'));

            const result = await fileUtils.getDirectoryStats('/test/directory');

            expect(result).toEqual({
                files: 2,
                directories: 0,
                totalSize: 1024,
                fileTypes: {
                    '.js': 2
                }
            });
        });

        it('should handle readdir errors by returning empty stats', async () => {
            fs.readdir.mockRejectedValue(new Error('Directory not found'));

            const result = await fileUtils.getDirectoryStats('/test/directory');

            expect(result).toEqual({
                files: 0,
                directories: 0,
                totalSize: 0,
                fileTypes: {}
            });
        });

        it('should handle files without extensions', async () => {
            const mockEntries = [
                { name: 'README', isFile: true, isDirectory: false },
                { name: 'Dockerfile', isFile: true, isDirectory: false }
            ];

            const mockFileStats = [
                { size: 1024 },
                { size: 2048 }
            ];

            fs.readdir.mockResolvedValue(mockEntries);
            fs.stat
                .mockResolvedValueOnce(mockFileStats[0])
                .mockResolvedValueOnce(mockFileStats[1]);

            const result = await fileUtils.getDirectoryStats('/test/directory');

            expect(result).toEqual({
                files: 2,
                directories: 0,
                totalSize: 3072,
                fileTypes: {
                    '': 2
                }
            });
        });
    });

    describe('isCodeFile', () => {
        it('should return true for JavaScript files', () => {
            expect(fileUtils.isCodeFile('file.js')).toBe(true);
            expect(fileUtils.isCodeFile('component.jsx')).toBe(true);
            expect(fileUtils.isCodeFile('typescript.ts')).toBe(true);
            expect(fileUtils.isCodeFile('component.tsx')).toBe(true);
        });

        it('should return true for other programming languages', () => {
            expect(fileUtils.isCodeFile('script.py')).toBe(true);
            expect(fileUtils.isCodeFile('Main.java')).toBe(true);
            expect(fileUtils.isCodeFile('app.cpp')).toBe(true);
            expect(fileUtils.isCodeFile('main.c')).toBe(true);
            expect(fileUtils.isCodeFile('Program.cs')).toBe(true);
            expect(fileUtils.isCodeFile('index.php')).toBe(true);
            expect(fileUtils.isCodeFile('app.rb')).toBe(true);
            expect(fileUtils.isCodeFile('main.go')).toBe(true);
            expect(fileUtils.isCodeFile('lib.rs')).toBe(true);
            expect(fileUtils.isCodeFile('App.swift')).toBe(true);
            expect(fileUtils.isCodeFile('Main.kt')).toBe(true);
            expect(fileUtils.isCodeFile('App.scala')).toBe(true);
        });

        it('should return true for web technologies', () => {
            expect(fileUtils.isCodeFile('index.html')).toBe(true);
            expect(fileUtils.isCodeFile('styles.css')).toBe(true);
            expect(fileUtils.isCodeFile('styles.scss')).toBe(true);
            expect(fileUtils.isCodeFile('styles.sass')).toBe(true);
            expect(fileUtils.isCodeFile('styles.less')).toBe(true);
            expect(fileUtils.isCodeFile('component.vue')).toBe(true);
            expect(fileUtils.isCodeFile('App.svelte')).toBe(true);
        });

        it('should return true for configuration files', () => {
            expect(fileUtils.isCodeFile('package.json')).toBe(true);
            expect(fileUtils.isCodeFile('config.xml')).toBe(true);
            expect(fileUtils.isCodeFile('settings.yaml')).toBe(true);
            expect(fileUtils.isCodeFile('config.yml')).toBe(true);
            expect(fileUtils.isCodeFile('Cargo.toml')).toBe(true);
        });

        it('should return true for documentation and scripts', () => {
            expect(fileUtils.isCodeFile('README.md')).toBe(true);
            expect(fileUtils.isCodeFile('notes.txt')).toBe(true);
            expect(fileUtils.isCodeFile('script.sh')).toBe(true);
            expect(fileUtils.isCodeFile('build.bat')).toBe(true);
            expect(fileUtils.isCodeFile('deploy.ps1')).toBe(true);
        });

        it('should return false for non-code files', () => {
            expect(fileUtils.isCodeFile('image.png')).toBe(false);
            expect(fileUtils.isCodeFile('document.pdf')).toBe(false);
            expect(fileUtils.isCodeFile('video.mp4')).toBe(false);
            expect(fileUtils.isCodeFile('archive.zip')).toBe(false);
            expect(fileUtils.isCodeFile('data.csv')).toBe(false);
        });

        it('should handle case insensitive extensions', () => {
            expect(fileUtils.isCodeFile('FILE.JS')).toBe(true);
            expect(fileUtils.isCodeFile('Component.JSX')).toBe(true);
            expect(fileUtils.isCodeFile('Script.PY')).toBe(true);
        });

        it('should handle files without extensions', () => {
            expect(fileUtils.isCodeFile('Dockerfile')).toBe(false);
            expect(fileUtils.isCodeFile('Makefile')).toBe(false);
            expect(fileUtils.isCodeFile('README')).toBe(false);
        });

        it('should handle files with multiple dots', () => {
            expect(fileUtils.isCodeFile('app.min.js')).toBe(true);
            expect(fileUtils.isCodeFile('styles.min.css')).toBe(true);
            expect(fileUtils.isCodeFile('config.prod.json')).toBe(true);
        });
    });

    describe('readJsonFile', () => {
        it('should return parsed JSON when file exists and is valid', async () => {
            const mockJsonContent = '{"name": "test", "version": "1.0.0"}';
            const expectedResult = { name: 'test', version: '1.0.0' };

            fs.readFile.mockResolvedValue(mockJsonContent);

            const result = await fileUtils.readJsonFile('/path/to/package.json');

            expect(result).toEqual(expectedResult);
            expect(fs.readFile).toHaveBeenCalledWith('/path/to/package.json', 'utf8');
        });

        it('should return null and log warning when file does not exist', async () => {
            fs.readFile.mockRejectedValue(new Error('File not found'));

            const result = await fileUtils.readJsonFile('/path/to/nonexistent.json');

            expect(result).toBeNull();
            expect(mockLogger.warn).toHaveBeenCalledWith('FileUtils: Failed to read JSON file', {
                filePath: '/path/to/nonexistent.json',
                error: 'File not found'
            });
        });

        it('should return null and log warning when file contains invalid JSON', async () => {
            const invalidJson = '{invalid json}';
            fs.readFile.mockResolvedValue(invalidJson);

            const result = await fileUtils.readJsonFile('/path/to/invalid.json');

            expect(result).toBeNull();
            expect(mockLogger.warn).toHaveBeenCalledWith('FileUtils: Failed to read JSON file', {
                filePath: '/path/to/invalid.json',
                error: expect.stringContaining('Expected property name')
            });
        });

        it('should return null and log warning when file is empty', async () => {
            fs.readFile.mockResolvedValue('');

            const result = await fileUtils.readJsonFile('/path/to/empty.json');

            expect(result).toBeNull();
            expect(mockLogger.warn).toHaveBeenCalledWith('FileUtils: Failed to read JSON file', {
                filePath: '/path/to/empty.json',
                error: expect.stringContaining('Unexpected end of JSON input')
            });
        });

        it('should handle complex JSON structures', async () => {
            const complexJson = JSON.stringify({
                name: 'test-project',
                version: '1.0.0',
                dependencies: {
                    'express': '^4.17.1',
                    'jest': '^27.0.0'
                },
                scripts: {
                    'test': 'jest',
                    'start': 'node index.js'
                },
                array: [1, 2, 3, 'test']
            });

            fs.readFile.mockResolvedValue(complexJson);

            const result = await fileUtils.readJsonFile('/path/to/package.json');

            expect(result).toEqual(JSON.parse(complexJson));
        });

        it('should handle permission errors', async () => {
            fs.readFile.mockRejectedValue(new Error('Permission denied'));

            const result = await fileUtils.readJsonFile('/path/to/restricted.json');

            expect(result).toBeNull();
            expect(mockLogger.warn).toHaveBeenCalledWith('FileUtils: Failed to read JSON file', {
                filePath: '/path/to/restricted.json',
                error: 'Permission denied'
            });
        });

        it('should handle undefined logger gracefully', async () => {
            const fileUtilsWithoutLogger = new FileUtils(undefined);
            fs.readFile.mockRejectedValue(new Error('File not found'));

            const result = await fileUtilsWithoutLogger.readJsonFile('/path/to/file.json');

            expect(result).toBeNull();
            // Should not throw error when logger is undefined
        });
    });

    describe('integration scenarios', () => {
        it('should handle mixed file operations in sequence', async () => {
            // Setup mocks for a realistic scenario
            fs.access
                .mockResolvedValueOnce(undefined) // fileExists returns true
                .mockRejectedValueOnce(new Error('Not found')) // hasAnyFile first file not found
                .mockRejectedValueOnce(new Error('Not found'));
            
            fs.stat.mockResolvedValue({ isDirectory: true }); // directoryExists returns true
            
            const mockEntries = [
                { name: 'file1.js', isFile: true, isDirectory: false },
                { name: 'subdir', isFile: false, isDirectory: true }
            ];
            fs.readdir.mockResolvedValue(mockEntries);
            fs.stat.mockResolvedValue({ size: 1024 }); // For getDirectoryStats
            
            fs.readFile.mockResolvedValue('{"name": "test"}'); // readJsonFile success

            // Test all methods in sequence
            const fileExists = await fileUtils.fileExists('/test/file.js');
            const dirExists = await fileUtils.directoryExists('/test/dir');
            const hasAny = await fileUtils.hasAnyFile('/test', ['file1.js', 'file2.js']);
            const stats = await fileUtils.getDirectoryStats('/test/dir');
            const isCode = fileUtils.isCodeFile('test.js');
            const jsonData = await fileUtils.readJsonFile('/test/package.json');

            expect(fileExists).toBe(true);
            expect(dirExists).toBe(true);
            expect(hasAny).toBe(false);
            expect(stats.files).toBe(1);
            expect(stats.directories).toBe(1);
            expect(isCode).toBe(true);
            expect(jsonData).toEqual({ name: 'test' });
        });
    });
}); 