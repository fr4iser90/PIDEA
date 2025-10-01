const TaskContentHashService = require('@domain/services/task/TaskContentHashService');
const fs = require('fs').promises;
const path = require('path');

describe('TaskContentHashService Integration Tests', () => {
    let contentHashService;
    let mockFileSystemService;
    let testDir;

    beforeEach(() => {
        mockFileSystemService = {
            readFile: jest.fn(),
            writeFile: jest.fn(),
            exists: jest.fn(),
            mkdir: jest.fn(),
            readdir: jest.fn(),
            rename: jest.fn(),
            rmdir: jest.fn(),
            access: jest.fn()
        };

        contentHashService = new TaskContentHashService(mockFileSystemService);
        testDir = path.join(__dirname, 'test-files');
    });

    afterEach(() => {
        jest.clearAllMocks();
        contentHashService.clearCache();
    });

    describe('File System Integration', () => {
        it('should generate hash from real file content', async () => {
            const testContent = `# Integration Test Task
- **Status**: in_progress
- **Priority**: high
- **Category**: backend

## Description
This is a test task for integration testing with the content hash service.

## Progress
- [x] Setup test environment
- [x] Create test data
- [ ] Run integration tests
- [ ] Validate results

## Requirements
- Node.js 18+
- Jest testing framework
- Mock file system service`;

            const testFilePath = path.join(testDir, 'integration-test-task.md');
            
            // Mock file system to return test content
            mockFileSystemService.readFile.mockResolvedValue(testContent);

            // Generate hash from file
            const fileHash = await contentHashService.generateFileHash(testFilePath);
            
            // Generate hash from content directly
            const contentHash = await contentHashService.generateContentHash(testContent);
            
            expect(fileHash).toBe(contentHash);
            expect(fileHash).toMatch(/^[a-f0-9]{64}$/); // SHA-256 format

            // Verify file system service was called correctly
            expect(mockFileSystemService.readFile).toHaveBeenCalledWith(testFilePath, 'utf8');
        });

        it('should extract status from complex markdown content', async () => {
            const complexContent = `# Complex Task with Multiple Sections

## Task Overview
- **Status**: completed
- **Priority**: critical
- **Category**: security
- **Estimated Time**: 8 hours

## Implementation Details
This task involves implementing a comprehensive security audit system.

### Phase 1: Analysis
- [x] Security requirements analysis
- [x] Threat modeling
- [x] Risk assessment

### Phase 2: Implementation
- [x] Core security components
- [x] Authentication system
- [x] Authorization framework
- [x] Input validation

### Phase 3: Testing
- [x] Unit tests
- [x] Integration tests
- [x] Security penetration testing
- [x] Performance testing

### Phase 4: Documentation
- [x] API documentation
- [x] Security guidelines
- [x] Deployment procedures

## Progress Tracking
Overall Progress: 100% Complete
Status: ✅ Completed
Last Updated: 2025-01-31T12:00:00.000Z

## Notes
All security requirements have been implemented and tested successfully.`;

            const extractedStatus = await contentHashService.extractStatusFromContent(complexContent);
            
            expect(extractedStatus).toBe('completed');
        });

        it('should handle status extraction from progress indicators', async () => {
            const progressBasedContent = `# Task with Progress Indicators

## Checklist
- [x] Task 1
- [x] Task 2
- [x] Task 3
- [x] Task 4
- [x] Task 5

## Additional Tasks
- [x] Documentation
- [x] Testing
- [x] Review

All tasks completed successfully.`;

            const extractedStatus = await contentHashService.extractStatusFromContent(progressBasedContent);
            
            expect(extractedStatus).toBe('completed');
        });

        it('should handle mixed progress indicators', async () => {
            const mixedProgressContent = `# Task with Mixed Progress

## Completed Tasks
- [x] Setup environment
- [x] Create base structure
- [x] Implement core functionality

## In Progress Tasks
- [ ] Add error handling
- [ ] Write tests
- [ ] Update documentation

## Pending Tasks
- [ ] Performance optimization
- [ ] Security review
- [ ] Deployment preparation`;

            const extractedStatus = await contentHashService.extractStatusFromContent(mixedProgressContent);
            
            expect(extractedStatus).toBe('in_progress');
        });

        it('should handle content without explicit status', async () => {
            const noStatusContent = `# Task Without Explicit Status

## Description
This task doesn't have an explicit status field.

## Tasks
- [ ] Task 1
- [ ] Task 2
- [ ] Task 3

## Notes
This is a pending task.`;

            const extractedStatus = await contentHashService.extractStatusFromContent(noStatusContent);
            
            expect(extractedStatus).toBe('pending');
        });
    });

    describe('Content Normalization', () => {
        it('should normalize content consistently across different formats', async () => {
            const contentVariations = [
                `# Test Task\r\n- **Status**: pending\r\n\r\n\r\n`,
                `# Test Task\n- **Status**: pending\n\n\n`,
                `# Test Task\r- **Status**: pending\r\r`,
                `  # Test Task  \n  - **Status**: pending  \n  \n  \n  `
            ];

            const hashes = [];
            for (const content of contentVariations) {
                const hash = await contentHashService.generateContentHash(content);
                hashes.push(hash);
            }

            // All hashes should be identical
            const firstHash = hashes[0];
            for (const hash of hashes) {
                expect(hash).toBe(firstHash);
            }
        });

        it('should handle empty and whitespace-only content', async () => {
            const emptyContent = '';
            const whitespaceContent = '   \n  \t  \n  ';
            const mixedWhitespaceContent = '\r\n\t  \n\r  ';

            const emptyHash = await contentHashService.generateContentHash(emptyContent);
            const whitespaceHash = await contentHashService.generateContentHash(whitespaceContent);
            const mixedHash = await contentHashService.generateContentHash(mixedWhitespaceContent);

            // All should produce the same hash (empty content)
            expect(emptyHash).toBe(whitespaceHash);
            expect(whitespaceHash).toBe(mixedHash);
        });
    });

    describe('Cache Integration', () => {
        it('should cache file hashes and reuse them', async () => {
            const testContent = '# Cached Task\n- **Status**: pending';
            const testFilePath = '/test/cached-task.md';

            // Mock file system
            mockFileSystemService.readFile.mockResolvedValue(testContent);

            // Generate hash first time
            const hash1 = await contentHashService.generateFileHash(testFilePath);
            
            // Generate hash second time (should use cache)
            const hash2 = await contentHashService.generateFileHash(testFilePath);
            
            expect(hash1).toBe(hash2);
            
            // File should only be read once
            expect(mockFileSystemService.readFile).toHaveBeenCalledTimes(1);

            // Check cache statistics
            const cacheStats = contentHashService.getCacheStats();
            expect(cacheStats.validEntries).toBe(1);
            expect(cacheStats.totalEntries).toBe(1);
        });

        it('should handle cache expiration', async () => {
            const testContent = '# Expiring Cache Task\n- **Status**: pending';
            const testFilePath = '/test/expiring-task.md';

            // Mock file system
            mockFileSystemService.readFile.mockResolvedValue(testContent);

            // Generate hash
            const hash1 = await contentHashService.generateFileHash(testFilePath);
            
            // Manually expire cache by setting old timestamp
            const cacheKey = `file:${testFilePath}`;
            contentHashService.hashCache.set(cacheKey, {
                hash: hash1,
                timestamp: Date.now() - (2 * 60 * 60 * 1000) // 2 hours ago
            });

            // Generate hash again (should read file again)
            const hash2 = await contentHashService.generateFileHash(testFilePath);
            
            expect(hash1).toBe(hash2);
            
            // File should be read twice (once for each call)
            expect(mockFileSystemService.readFile).toHaveBeenCalledTimes(2);
        });

        it('should cleanup expired cache entries', async () => {
            const testContent = '# Cleanup Test Task\n- **Status**: pending';
            const testFilePath = '/test/cleanup-task.md';

            // Mock file system
            mockFileSystemService.readFile.mockResolvedValue(testContent);

            // Generate hash
            await contentHashService.generateFileHash(testFilePath);
            
            // Manually add expired entry
            contentHashService.hashCache.set('expired-key', {
                hash: 'expired-hash',
                timestamp: Date.now() - (2 * 60 * 60 * 1000) // 2 hours ago
            });

            // Check initial cache stats
            let cacheStats = contentHashService.getCacheStats();
            expect(cacheStats.totalEntries).toBe(2);
            expect(cacheStats.validEntries).toBe(1);
            expect(cacheStats.expiredEntries).toBe(1);

            // Cleanup expired entries
            contentHashService.cleanupCache();

            // Check final cache stats
            cacheStats = contentHashService.getCacheStats();
            expect(cacheStats.totalEntries).toBe(1);
            expect(cacheStats.validEntries).toBe(1);
            expect(cacheStats.expiredEntries).toBe(0);
        });
    });

    describe('Error Handling', () => {
        it('should handle file read errors gracefully', async () => {
            const testFilePath = '/test/nonexistent-task.md';
            
            // Mock file system to throw error
            mockFileSystemService.readFile.mockRejectedValue(new Error('File not found'));

            await expect(contentHashService.generateFileHash(testFilePath))
                .rejects.toThrow('File not found');
        });

        it('should handle invalid content gracefully', async () => {
            await expect(contentHashService.generateContentHash(null))
                .rejects.toThrow('Content must be a non-empty string');
            
            await expect(contentHashService.generateContentHash(undefined))
                .rejects.toThrow('Content must be a non-empty string');
            
            await expect(contentHashService.generateContentHash(123))
                .rejects.toThrow('Content must be a non-empty string');
        });

        it('should handle invalid file paths gracefully', async () => {
            await expect(contentHashService.generateFileHash(null))
                .rejects.toThrow('File path must be a non-empty string');
            
            await expect(contentHashService.generateFileHash(''))
                .rejects.toThrow('File path must be a non-empty string');
        });

        it('should handle hash validation errors gracefully', async () => {
            const result1 = await contentHashService.validateContentHash(null, 'hash');
            const result2 = await contentHashService.validateContentHash('content', null);
            const result3 = await contentHashService.validateContentHash('', '');
            
            expect(result1).toBe(false);
            expect(result2).toBe(false);
            expect(result3).toBe(false);
        });
    });

    describe('Performance', () => {
        it('should handle large content efficiently', async () => {
            // Generate large content (1MB)
            const largeContent = '# Large Task\n' + 'x'.repeat(1024 * 1024);
            
            const startTime = Date.now();
            const hash = await contentHashService.generateContentHash(largeContent);
            const endTime = Date.now();
            
            expect(hash).toMatch(/^[a-f0-9]{64}$/);
            expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
        });

        it('should handle multiple concurrent hash generations', async () => {
            const contents = [
                '# Task 1\n- **Status**: pending',
                '# Task 2\n- **Status**: in_progress',
                '# Task 3\n- **Status**: completed',
                '# Task 4\n- **Status**: cancelled',
                '# Task 5\n- **Status**: failed'
            ];

            const startTime = Date.now();
            const hashPromises = contents.map(content => 
                contentHashService.generateContentHash(content)
            );
            const hashes = await Promise.all(hashPromises);
            const endTime = Date.now();

            // All hashes should be different
            const uniqueHashes = new Set(hashes);
            expect(uniqueHashes.size).toBe(5);
            
            // Should complete in reasonable time
            expect(endTime - startTime).toBeLessThan(500); // Under 500ms
        });
    });
});
