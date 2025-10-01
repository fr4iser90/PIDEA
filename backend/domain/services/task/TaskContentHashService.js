const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const Logger = require('@logging/Logger');

/**
 * TaskContentHashService - Content Addressable Storage for task files
 * Provides content hash generation, validation, and deduplication for task files
 * Implements single source of truth principle using markdown content only
 */
class TaskContentHashService {
    constructor(fileSystemService = null, cacheService = null) {
        this.fileSystemService = fileSystemService;
        this.cacheService = cacheService;
        this.logger = new Logger('TaskContentHashService');
        this.hashCache = new Map(); // In-memory cache for content hashes
        this.cacheExpiry = 60 * 60 * 1000; // 1 hour cache expiry
    }

    /**
     * Generate content hash for markdown content
     * @param {string} content - Markdown content
     * @param {Object} options - Hash generation options
     * @returns {Promise<string>} Content hash
     */
    async generateContentHash(content, options = {}) {
        try {
            if (!content || typeof content !== 'string') {
                throw new Error('Content must be a non-empty string');
            }

            // Normalize content for consistent hashing
            const normalizedContent = this.normalizeContent(content);
            
            // Generate SHA-256 hash
            const hash = crypto.createHash('sha256')
                .update(normalizedContent, 'utf8')
                .digest('hex');

            this.logger.debug('Generated content hash', { 
                hash, 
                contentLength: content.length,
                normalizedLength: normalizedContent.length
            });

            return hash;

        } catch (error) {
            this.logger.error('Failed to generate content hash', { 
                error: error.message,
                contentLength: content?.length || 0
            });
            throw error;
        }
    }

    /**
     * Generate content hash for file
     * @param {string} filePath - Path to file
     * @param {Object} options - Hash generation options
     * @returns {Promise<string>} Content hash
     */
    async generateFileHash(filePath, options = {}) {
        try {
            if (!filePath || typeof filePath !== 'string') {
                throw new Error('File path must be a non-empty string');
            }

            // Check cache first
            const cacheKey = `file:${filePath}`;
            const cachedHash = this.getCachedHash(cacheKey);
            if (cachedHash) {
                this.logger.debug('Using cached file hash', { filePath, hash: cachedHash });
                return cachedHash;
            }

            // Read file content
            const content = await fs.readFile(filePath, 'utf8');
            
            // Generate hash
            const hash = await this.generateContentHash(content, options);
            
            // Cache the result
            this.setCachedHash(cacheKey, hash);

            this.logger.debug('Generated file hash', { filePath, hash });
            return hash;

        } catch (error) {
            this.logger.error('Failed to generate file hash', { 
                filePath, 
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Validate content hash consistency
     * @param {string} content - Current content
     * @param {string} expectedHash - Expected hash
     * @returns {Promise<boolean>} True if hash matches
     */
    async validateContentHash(content, expectedHash) {
        try {
            if (!content || !expectedHash) {
                return false;
            }

            const currentHash = await this.generateContentHash(content);
            const isValid = currentHash === expectedHash;

            this.logger.debug('Content hash validation', { 
                expectedHash, 
                currentHash, 
                isValid 
            });

            return isValid;

        } catch (error) {
            this.logger.error('Failed to validate content hash', { 
                error: error.message,
                expectedHash
            });
            return false;
        }
    }

    /**
     * Extract status from markdown content using single regex pattern
     * @param {string} content - Markdown content
     * @returns {Promise<string>} Detected status
     */
    async extractStatusFromContent(content) {
        try {
            if (!content || typeof content !== 'string') {
                return 'pending';
            }

            // Single regex pattern for status detection - replaces 12+ conflicting patterns
            const statusPattern = /(?:^|\n)\s*-\s*\*\*Status\*\*:\s*(\w+)/i;
            const match = content.match(statusPattern);

            if (match && match[1]) {
                const status = match[1].toLowerCase().trim();
                
                // Validate status against known values
                const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled', 'failed', 'paused', 'scheduled'];
                if (validStatuses.includes(status)) {
                    this.logger.debug('Status extracted from content', { status });
                    return status;
                }
            }

            // Fallback: check for status in progress indicators
            const progressPattern = /(?:^|\n)\s*-\s*\[([x\s])\]/g;
            const progressMatches = [...content.matchAll(progressPattern)];
            
            if (progressMatches.length > 0) {
                const completedCount = progressMatches.filter(match => match[1] === 'x').length;
                const totalCount = progressMatches.length;
                
                if (completedCount === totalCount && totalCount > 0) {
                    this.logger.debug('Status inferred from progress: completed', { completedCount, totalCount });
                    return 'completed';
                } else if (completedCount > 0) {
                    this.logger.debug('Status inferred from progress: in_progress', { completedCount, totalCount });
                    return 'in_progress';
                }
            }

            this.logger.debug('No status found in content, defaulting to pending');
            return 'pending';

        } catch (error) {
            this.logger.error('Failed to extract status from content', { 
                error: error.message,
                contentLength: content?.length || 0
            });
            return 'pending';
        }
    }

    /**
     * Normalize content for consistent hashing
     * @param {string} content - Raw content
     * @returns {string} Normalized content
     */
    normalizeContent(content) {
        if (!content) return '';

        return content
            // Remove trailing whitespace
            .replace(/\s+$/gm, '')
            // Normalize line endings
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            // Remove extra blank lines
            .replace(/\n{3,}/g, '\n\n')
            // Trim overall content
            .trim();
    }

    /**
     * Get cached hash if available and not expired
     * @param {string} key - Cache key
     * @returns {string|null} Cached hash or null
     */
    getCachedHash(key) {
        const cached = this.hashCache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
            return cached.hash;
        }
        
        if (cached) {
            this.hashCache.delete(key);
        }
        
        return null;
    }

    /**
     * Set cached hash with timestamp
     * @param {string} key - Cache key
     * @param {string} hash - Hash value
     */
    setCachedHash(key, hash) {
        this.hashCache.set(key, {
            hash,
            timestamp: Date.now()
        });
    }

    /**
     * Clear hash cache
     */
    clearCache() {
        this.hashCache.clear();
        this.logger.debug('Hash cache cleared');
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache statistics
     */
    getCacheStats() {
        const now = Date.now();
        let validEntries = 0;
        let expiredEntries = 0;

        for (const [key, value] of this.hashCache.entries()) {
            if (now - value.timestamp < this.cacheExpiry) {
                validEntries++;
            } else {
                expiredEntries++;
            }
        }

        return {
            totalEntries: this.hashCache.size,
            validEntries,
            expiredEntries,
            cacheExpiry: this.cacheExpiry
        };
    }

    /**
     * Clean up expired cache entries
     */
    cleanupCache() {
        const now = Date.now();
        const keysToDelete = [];

        for (const [key, value] of this.hashCache.entries()) {
            if (now - value.timestamp >= this.cacheExpiry) {
                keysToDelete.push(key);
            }
        }

        keysToDelete.forEach(key => this.hashCache.delete(key));
        
        if (keysToDelete.length > 0) {
            this.logger.debug('Cleaned up expired cache entries', { 
                deletedCount: keysToDelete.length 
            });
        }
    }
}

module.exports = TaskContentHashService;
