/**
 * CompressionEngine Service
 * 
 * Handles image compression for streaming frames using WebP and JPEG formats
 * with automatic fallback and quality optimization.
 */
const sharp = require('sharp');

class CompressionEngine {
  constructor() {
    this.supportedFormats = ['webp', 'jpeg'];
    this.defaultFormat = 'webp';
    this.maxRetries = 3;
    this.compressionCache = new Map(); // Cache for repeated compression attempts
    
    // Performance tracking
    this.compressionStats = {
      totalCompressions: 0,
      successfulCompressions: 0,
      failedCompressions: 0,
      averageCompressionTime: 0,
      formatUsage: { webp: 0, jpeg: 0 }
    };
  }

  /**
   * Compress an image buffer with specified format and quality
   * @param {Buffer} imageBuffer - Raw image buffer
   * @param {Object} options - Compression options
   * @returns {Promise<Object>} Compressed frame data
   */
  async compress(imageBuffer, options = {}) {
    const startTime = Date.now();
    const format = options.format || this.defaultFormat;
    const quality = options.quality || 0.8;
    const maxSize = options.maxSize || 50 * 1024; // 50KB default
    
    try {
      this.compressionStats.totalCompressions++;
      
      // Validate input
      if (!Buffer.isBuffer(imageBuffer)) {
        throw new Error('Input must be a Buffer');
      }
      
      if (imageBuffer.length === 0) {
        throw new Error('Input buffer is empty');
      }
      
      // Try primary format first
      let compressedFrame = await this.compressWithFormat(imageBuffer, format, quality);
      
      // If size is too large, try reducing quality
      if (compressedFrame.size > maxSize && quality > 0.3) {
        const reducedQuality = Math.max(0.3, quality - 0.2);
        compressedFrame = await this.compressWithFormat(imageBuffer, format, reducedQuality);
      }
      
      // If still too large, fallback to JPEG
      if (compressedFrame.size > maxSize && format === 'webp') {
        console.log(`[CompressionEngine] WebP too large (${compressedFrame.size} bytes), falling back to JPEG`);
        compressedFrame = await this.compressWithFormat(imageBuffer, 'jpeg', quality);
      }
      
      // Final size check
      if (compressedFrame.size > maxSize) {
        console.warn(`[CompressionEngine] Frame size (${compressedFrame.size} bytes) exceeds max size (${maxSize} bytes)`);
      }
      
      // Update statistics
      const compressionTime = Date.now() - startTime;
      this.updateStats(format, compressionTime, true);
      
      return {
        ...compressedFrame,
        compressionTime,
        originalSize: imageBuffer.length,
        compressionRatio: compressedFrame.size / imageBuffer.length
      };
      
    } catch (error) {
      // Fallback to JPEG if primary format fails
      if (format === 'webp') {
        console.warn(`[CompressionEngine] WebP compression failed, falling back to JPEG:`, error.message);
        try {
          const fallbackResult = await this.compressWithFormat(imageBuffer, 'jpeg', quality);
          const compressionTime = Date.now() - startTime;
          this.updateStats('jpeg', compressionTime, true);
          
          return {
            ...fallbackResult,
            compressionTime,
            originalSize: imageBuffer.length,
            compressionRatio: fallbackResult.size / imageBuffer.length,
            fallbackUsed: true
          };
        } catch (fallbackError) {
          this.updateStats(format, Date.now() - startTime, false);
          throw new Error(`Both WebP and JPEG compression failed: ${fallbackError.message}`);
        }
      } else {
        this.updateStats(format, Date.now() - startTime, false);
        throw error;
      }
    }
  }

  /**
   * Compress image with specific format
   * @param {Buffer} imageBuffer - Raw image buffer
   * @param {string} format - Target format (webp/jpeg)
   * @param {number} quality - Compression quality (0.1-1.0)
   * @returns {Promise<Object>} Compressed frame data
   */
  async compressWithFormat(imageBuffer, format, quality) {
    const qualityPercent = Math.round(quality * 100);
    
    try {
      let compressedBuffer;
      
      if (format === 'webp') {
        compressedBuffer = await sharp(imageBuffer)
          .webp({ 
            quality: qualityPercent,
            effort: 4, // Higher effort for better compression
            nearLossless: quality > 0.9 // Near lossless for high quality
          })
          .toBuffer();
      } else if (format === 'jpeg') {
        compressedBuffer = await sharp(imageBuffer)
          .jpeg({ 
            quality: qualityPercent,
            progressive: true,
            mozjpeg: true // Use mozjpeg for better compression
          })
          .toBuffer();
      } else {
        throw new Error(`Unsupported format: ${format}`);
      }
      
      return {
        data: compressedBuffer,
        format: format,
        size: compressedBuffer.length,
        quality: quality,
        mimeType: `image/${format}`
      };
      
    } catch (error) {
      throw new Error(`Compression failed for ${format}: ${error.message}`);
    }
  }

  /**
   * Compress with adaptive quality based on target size
   * @param {Buffer} imageBuffer - Raw image buffer
   * @param {number} targetSize - Target size in bytes
   * @param {string} preferredFormat - Preferred format
   * @returns {Promise<Object>} Compressed frame data
   */
  async compressToTargetSize(imageBuffer, targetSize, preferredFormat = 'webp') {
    const maxAttempts = 5;
    let currentQuality = 0.8;
    let currentFormat = preferredFormat;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const result = await this.compress(imageBuffer, {
          format: currentFormat,
          quality: currentQuality,
          maxSize: targetSize
        });
        
        if (result.size <= targetSize) {
          return result;
        }
        
        // Reduce quality for next attempt
        currentQuality = Math.max(0.3, currentQuality - 0.15);
        
        // Switch to JPEG if WebP is still too large
        if (currentFormat === 'webp' && attempt === 2) {
          currentFormat = 'jpeg';
          currentQuality = 0.8; // Reset quality for JPEG
        }
        
      } catch (error) {
        console.warn(`[CompressionEngine] Attempt ${attempt + 1} failed:`, error.message);
        
        // Switch to JPEG on error
        if (currentFormat === 'webp') {
          currentFormat = 'jpeg';
          currentQuality = 0.8;
        }
      }
    }
    
    // Return best attempt even if target size not met
    return await this.compress(imageBuffer, {
      format: currentFormat,
      quality: 0.3,
      maxSize: targetSize
    });
  }

  /**
   * Batch compress multiple frames
   * @param {Array<Buffer>} imageBuffers - Array of image buffers
   * @param {Object} options - Compression options
   * @returns {Promise<Array>} Array of compressed frames
   */
  async compressBatch(imageBuffers, options = {}) {
    const results = [];
    const batchSize = options.batchSize || 5;
    
    for (let i = 0; i < imageBuffers.length; i += batchSize) {
      const batch = imageBuffers.slice(i, i + batchSize);
      const batchPromises = batch.map(buffer => this.compress(buffer, options));
      
      try {
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      } catch (error) {
        console.error(`[CompressionEngine] Batch compression failed for batch ${i / batchSize}:`, error.message);
        // Continue with remaining batches
      }
    }
    
    return results;
  }

  /**
   * Update compression statistics
   * @param {string} format - Used format
   * @param {number} compressionTime - Time taken for compression
   * @param {boolean} success - Whether compression was successful
   */
  updateStats(format, compressionTime, success) {
    if (success) {
      this.compressionStats.successfulCompressions++;
      this.compressionStats.formatUsage[format]++;
    } else {
      this.compressionStats.failedCompressions++;
    }
    
    // Update average compression time
    const total = this.compressionStats.successfulCompressions + this.compressionStats.failedCompressions;
    this.compressionStats.averageCompressionTime = 
      (this.compressionStats.averageCompressionTime * (total - 1) + compressionTime) / total;
  }

  /**
   * Get compression statistics
   * @returns {Object} Compression statistics
   */
  getStats() {
    const total = this.compressionStats.totalCompressions;
    const successRate = total > 0 ? (this.compressionStats.successfulCompressions / total) * 100 : 0;
    
    return {
      ...this.compressionStats,
      successRate: Math.round(successRate * 100) / 100,
      averageCompressionTime: Math.round(this.compressionStats.averageCompressionTime)
    };
  }

  /**
   * Reset compression statistics
   */
  resetStats() {
    this.compressionStats = {
      totalCompressions: 0,
      successfulCompressions: 0,
      failedCompressions: 0,
      averageCompressionTime: 0,
      formatUsage: { webp: 0, jpeg: 0 }
    };
  }

  /**
   * Check if format is supported
   * @param {string} format - Format to check
   * @returns {boolean} Whether format is supported
   */
  isFormatSupported(format) {
    return this.supportedFormats.includes(format);
  }

  /**
   * Get supported formats
   * @returns {Array<string>} Array of supported formats
   */
  getSupportedFormats() {
    return [...this.supportedFormats];
  }

  /**
   * Clean up resources
   */
  cleanup() {
    this.compressionCache.clear();
  }
}

module.exports = CompressionEngine; 