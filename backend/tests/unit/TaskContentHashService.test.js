const TaskContentHashService = require('@domain/services/task/TaskContentHashService');
const fs = require('fs').promises;
const path = require('path');

describe('TaskContentHashService', () => {
    let service;
    let mockFileSystemService;
    let mockCacheService;

    beforeEach(() => {
        mockFileSystemService = {
            readFile: jest.fn(),
            writeFile: jest.fn(),
            exists: jest.fn()
        };

        mockCacheService = {
            get: jest.fn(),
            set: jest.fn(),
            delete: jest.fn()
        };

        service = new TaskContentHashService(mockFileSystemService, mockCacheService);
    });

    afterEach(() => {
        service.clearCache();
        jest.clearAllMocks();
    });

    describe('generateContentHash', () => {
        it('should generate consistent hash for same content', async () => {
            const content = '# Test Task\n- **Status**: pending\n- Progress: 0%';
            
            const hash1 = await service.generateContentHash(content);
            const hash2 = await service.generateContentHash(content);
            
            expect(hash1).toBe(hash2);
            expect(hash1).toMatch(/^[a-f0-9]{64}$/); // SHA-256 format
        });

        it('should generate different hashes for different content', async () => {
            const content1 = '# Test Task 1\n- **Status**: pending';
            const content2 = '# Test Task 2\n- **Status**: pending';
            
            const hash1 = await service.generateContentHash(content1);
            const hash2 = await service.generateContentHash(content2);
            
            expect(hash1).not.toBe(hash2);
        });

        it('should normalize content before hashing', async () => {
            const content1 = '# Test Task\n- **Status**: pending\n\n\n';
            const content2 = '# Test Task\n- **Status**: pending\n';
            
            const hash1 = await service.generateContentHash(content1);
            const hash2 = await service.generateContentHash(content2);
            
            expect(hash1).toBe(hash2);
        });

        it('should throw error for invalid content', async () => {
            await expect(service.generateContentHash(null)).rejects.toThrow('Content must be a non-empty string');
            await expect(service.generateContentHash('')).rejects.toThrow('Content must be a non-empty string');
            await expect(service.generateContentHash(123)).rejects.toThrow('Content must be a non-empty string');
        });
    });

    describe('generateFileHash', () => {
        it('should generate hash from file content', async () => {
            const filePath = '/test/task.md';
            const content = '# Test Task\n- **Status**: pending';
            
            mockFileSystemService.readFile.mockResolvedValue(content);
            
            const hash = await service.generateFileHash(filePath);
            
            expect(hash).toMatch(/^[a-f0-9]{64}$/);
            expect(mockFileSystemService.readFile).toHaveBeenCalledWith(filePath, 'utf8');
        });

        it('should use cached hash if available', async () => {
            const filePath = '/test/task.md';
            const cachedHash = 'cached_hash_value';
            
            // Set up cache
            service.setCachedHash(`file:${filePath}`, cachedHash);
            
            const hash = await service.generateFileHash(filePath);
            
            expect(hash).toBe(cachedHash);
            expect(mockFileSystemService.readFile).not.toHaveBeenCalled();
        });

        it('should throw error for invalid file path', async () => {
            await expect(service.generateFileHash(null)).rejects.toThrow('File path must be a non-empty string');
            await expect(service.generateFileHash('')).rejects.toThrow('File path must be a non-empty string');
        });
    });

    describe('validateContentHash', () => {
        it('should return true for matching hash', async () => {
            const content = '# Test Task\n- **Status**: pending';
            const expectedHash = await service.generateContentHash(content);
            
            const isValid = await service.validateContentHash(content, expectedHash);
            
            expect(isValid).toBe(true);
        });

        it('should return false for non-matching hash', async () => {
            const content = '# Test Task\n- **Status**: pending';
            const expectedHash = 'invalid_hash';
            
            const isValid = await service.validateContentHash(content, expectedHash);
            
            expect(isValid).toBe(false);
        });

        it('should return false for invalid inputs', async () => {
            expect(await service.validateContentHash(null, 'hash')).toBe(false);
            expect(await service.validateContentHash('content', null)).toBe(false);
            expect(await service.validateContentHash('', '')).toBe(false);
        });
    });

    describe('extractStatusFromContent', () => {
        it('should extract status from markdown content', async () => {
            const content = '# Test Task\n- **Status**: in_progress\n- Progress: 50%';
            
            const status = await service.extractStatusFromContent(content);
            
            expect(status).toBe('in_progress');
        });

        it('should handle different status formats', async () => {
            const testCases = [
                { content: '- **Status**: completed', expected: 'completed' },
                { content: '- **Status**: pending', expected: 'pending' },
                { content: '- **Status**: cancelled', expected: 'cancelled' },
                { content: '- **Status**: failed', expected: 'failed' }
            ];

            for (const testCase of testCases) {
                const status = await service.extractStatusFromContent(testCase.content);
                expect(status).toBe(testCase.expected);
            }
        });

        it('should infer status from progress indicators', async () => {
            const completedContent = '- [x] Task 1\n- [x] Task 2\n- [x] Task 3';
            const inProgressContent = '- [x] Task 1\n- [ ] Task 2\n- [x] Task 3';
            const pendingContent = '- [ ] Task 1\n- [ ] Task 2\n- [ ] Task 3';
            
            expect(await service.extractStatusFromContent(completedContent)).toBe('completed');
            expect(await service.extractStatusFromContent(inProgressContent)).toBe('in_progress');
            expect(await service.extractStatusFromContent(pendingContent)).toBe('pending');
        });

        it('should default to pending for unknown status', async () => {
            const content = '# Test Task\n- **Status**: unknown_status';
            
            const status = await service.extractStatusFromContent(content);
            
            expect(status).toBe('pending');
        });

        it('should default to pending for content without status', async () => {
            const content = '# Test Task\n- Some other content';
            
            const status = await service.extractStatusFromContent(content);
            
            expect(status).toBe('pending');
        });
    });

    describe('normalizeContent', () => {
        it('should remove trailing whitespace', () => {
            const content = 'Line 1   \nLine 2\t\n';
            const normalized = service.normalizeContent(content);
            
            expect(normalized).toBe('Line 1\nLine 2');
        });

        it('should normalize line endings', () => {
            const content = 'Line 1\r\nLine 2\rLine 3\n';
            const normalized = service.normalizeContent(content);
            
            expect(normalized).toBe('Line 1\nLine 2\nLine 3');
        });

        it('should remove extra blank lines', () => {
            const content = 'Line 1\n\n\n\nLine 2';
            const normalized = service.normalizeContent(content);
            
            expect(normalized).toBe('Line 1\n\nLine 2');
        });

        it('should trim overall content', () => {
            const content = '  \n  Line 1\n  Line 2\n  ';
            const normalized = service.normalizeContent(content);
            
            expect(normalized).toBe('Line 1\nLine 2');
        });
    });

    describe('cache management', () => {
        it('should cache and retrieve hashes', () => {
            const key = 'test_key';
            const hash = 'test_hash';
            
            service.setCachedHash(key, hash);
            const retrieved = service.getCachedHash(key);
            
            expect(retrieved).toBe(hash);
        });

        it('should return null for expired cache entries', () => {
            const key = 'test_key';
            const hash = 'test_hash';
            
            // Set cache with old timestamp
            service.hashCache.set(key, {
                hash,
                timestamp: Date.now() - (2 * 60 * 60 * 1000) // 2 hours ago
            });
            
            const retrieved = service.getCachedHash(key);
            
            expect(retrieved).toBeNull();
        });

        it('should clear cache', () => {
            service.setCachedHash('key1', 'hash1');
            service.setCachedHash('key2', 'hash2');
            
            service.clearCache();
            
            expect(service.getCachedHash('key1')).toBeNull();
            expect(service.getCachedHash('key2')).toBeNull();
        });

        it('should provide cache statistics', () => {
            service.setCachedHash('key1', 'hash1');
            service.setCachedHash('key2', 'hash2');
            
            const stats = service.getCacheStats();
            
            expect(stats.totalEntries).toBe(2);
            expect(stats.validEntries).toBe(2);
            expect(stats.expiredEntries).toBe(0);
        });

        it('should cleanup expired entries', () => {
            const key1 = 'key1';
            const key2 = 'key2';
            
            // Set one valid entry
            service.setCachedHash(key1, 'hash1');
            
            // Set one expired entry
            service.hashCache.set(key2, {
                hash: 'hash2',
                timestamp: Date.now() - (2 * 60 * 60 * 1000) // 2 hours ago
            });
            
            service.cleanupCache();
            
            expect(service.getCachedHash(key1)).toBe('hash1');
            expect(service.getCachedHash(key2)).toBeNull();
        });
    });

    describe('error handling', () => {
        it('should handle file read errors gracefully', async () => {
            const filePath = '/test/task.md';
            
            mockFileSystemService.readFile.mockRejectedValue(new Error('File not found'));
            
            await expect(service.generateFileHash(filePath)).rejects.toThrow('File not found');
        });

        it('should handle content extraction errors gracefully', async () => {
            const invalidContent = null;
            
            const status = await service.extractStatusFromContent(invalidContent);
            
            expect(status).toBe('pending');
        });
    });
});
