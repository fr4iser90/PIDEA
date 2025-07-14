const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

/**
 * RegionDetector Service
 * 
 * Detects changed regions between frames to optimize streaming by
 * only sending changed areas instead of full frames when possible.
 */
class RegionDetector {
  constructor(options = {}) {
    this.threshold = options.threshold || 0.1; // 10% change threshold
    this.minRegionSize = options.minRegionSize || 100; // Minimum region size in pixels
    this.maxRegions = options.maxRegions || 10; // Maximum number of regions to track
    this.enableOptimization = options.enableOptimization !== false; // Default enabled
    
    // Performance tracking
    this.stats = {
      totalComparisons: 0,
      regionDetections: 0,
      fullFrameFalls: 0,
      averageRegionCount: 0,
      averageRegionSize: 0
    };
  }

  /**
   * Detect changed regions between two frames
   * @param {Buffer} currentFrame - Current frame buffer
   * @param {Buffer} previousFrame - Previous frame buffer
   * @param {Object} options - Detection options
   * @returns {Object} Detection result with regions and metadata
   */
  detectChangedRegions(currentFrame, previousFrame, options = {}) {
    try {
      if (!this.enableOptimization) {
        return { fullFrame: true, regions: [], reason: 'Region detection disabled' };
      }

      if (!currentFrame || !previousFrame) {
        return { fullFrame: true, regions: [], reason: 'Missing frame data' };
      }

      this.stats.totalComparisons++;

      // For now, use a simplified approach since we're working with compressed buffers
      // In a real implementation, you'd decode the images and do pixel-level comparison
      const regions = this.simplifiedRegionDetection(currentFrame, previousFrame, options);
      
      if (regions.length === 0) {
        this.stats.fullFrameFalls++;
        return { fullFrame: true, regions: [], reason: 'No changes detected' };
      }

      if (regions.length > this.maxRegions) {
        this.stats.fullFrameFalls++;
        return { fullFrame: true, regions: [], reason: 'Too many regions detected' };
      }

      // Check if total region size is too large (more than 50% of frame)
      const totalRegionSize = regions.reduce((sum, region) => sum + (region.width * region.height), 0);
      const estimatedFrameSize = this.estimateFrameSize(currentFrame);
      
      if (totalRegionSize > estimatedFrameSize * 0.5) {
        this.stats.fullFrameFalls++;
        return { fullFrame: true, regions: [], reason: 'Regions too large' };
      }

      this.stats.regionDetections++;
      this.updateRegionStats(regions);

      return {
        fullFrame: false,
        regions: regions,
        totalRegionSize: totalRegionSize,
        estimatedFrameSize: estimatedFrameSize
      };

    } catch (error) {
      logger.error('Error detecting regions:', error.message);
      this.stats.fullFrameFalls++;
      return { fullFrame: true, regions: [], reason: 'Detection error' };
    }
  }

  /**
   * Simplified region detection (placeholder implementation)
   * In a real implementation, this would decode images and do pixel comparison
   * @param {Buffer} currentFrame - Current frame buffer
   * @param {Buffer} previousFrame - Previous frame buffer
   * @param {Object} options - Detection options
   * @returns {Array} Array of detected regions
   */
  simplifiedRegionDetection(currentFrame, previousFrame, options = {}) {
    // This is a simplified implementation
    // In practice, you would:
    // 1. Decode both images to pixel data
    // 2. Compare pixels to find changed areas
    // 3. Group adjacent changed pixels into regions
    // 4. Filter regions by size and optimize boundaries
    
    const regions = [];
    
    // For now, return empty array to indicate no regions detected
    // This will cause the system to send full frames
    // TODO: Implement actual pixel-level comparison
    
    return regions;
  }

  /**
   * Estimate frame size based on buffer size
   * @param {Buffer} frameBuffer - Frame buffer
   * @returns {number} Estimated frame size in pixels
   */
  estimateFrameSize(frameBuffer) {
    // Rough estimation based on buffer size
    // This is a simplified approach - in practice you'd get actual dimensions
    const bufferSize = frameBuffer.length;
    
    // Assume 4 bytes per pixel (RGBA) for PNG
    // This is a rough estimate and may not be accurate
    return Math.sqrt(bufferSize / 4);
  }

  /**
   * Update region statistics
   * @param {Array} regions - Detected regions
   */
  updateRegionStats(regions) {
    if (regions.length === 0) return;

    const regionCount = regions.length;
    const totalSize = regions.reduce((sum, region) => sum + (region.width * region.height), 0);
    const averageSize = totalSize / regionCount;

    // Update moving averages
    const alpha = 0.1;
    this.stats.averageRegionCount = this.stats.averageRegionCount * (1 - alpha) + regionCount * alpha;
    this.stats.averageRegionSize = this.stats.averageRegionSize * (1 - alpha) + averageSize * alpha;
  }

  /**
   * Get detection statistics
   * @returns {Object} Detection statistics
   */
  getStats() {
    const total = this.stats.totalComparisons;
    const regionDetectionRate = total > 0 ? (this.stats.regionDetections / total) * 100 : 0;
    const fullFrameRate = total > 0 ? (this.stats.fullFrameFalls / total) * 100 : 0;

    return {
      ...this.stats,
      regionDetectionRate: Math.round(regionDetectionRate * 100) / 100,
      fullFrameRate: Math.round(fullFrameRate * 100) / 100,
      averageRegionCount: Math.round(this.stats.averageRegionCount * 100) / 100,
      averageRegionSize: Math.round(this.stats.averageRegionSize)
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      totalComparisons: 0,
      regionDetections: 0,
      fullFrameFalls: 0,
      averageRegionCount: 0,
      averageRegionSize: 0
    };
  }

  /**
   * Enable or disable region detection
   * @param {boolean} enabled - Whether to enable region detection
   */
  setEnabled(enabled) {
    this.enableOptimization = enabled;
    logger.info(`Region detection ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Update detection threshold
   * @param {number} threshold - New threshold value (0.0-1.0)
   */
  setThreshold(threshold) {
    if (threshold < 0 || threshold > 1) {
      throw new Error('Threshold must be between 0 and 1');
    }
    
    this.threshold = threshold;
    logger.info(`Threshold updated to ${threshold}`);
  }

  /**
   * Update minimum region size
   * @param {number} minSize - Minimum region size in pixels
   */
  setMinRegionSize(minSize) {
    if (minSize < 1) {
      throw new Error('Minimum region size must be at least 1 pixel');
    }
    
    this.minRegionSize = minSize;
    logger.info(`Minimum region size updated to ${minSize} pixels`);
  }

  /**
   * Update maximum number of regions
   * @param {number} maxRegions - Maximum number of regions to track
   */
  setMaxRegions(maxRegions) {
    if (maxRegions < 1) {
      throw new Error('Maximum regions must be at least 1');
    }
    
    this.maxRegions = maxRegions;
    logger.info(`Maximum regions updated to ${maxRegions}`);
  }

  /**
   * Get current configuration
   * @returns {Object} Current configuration
   */
  getConfig() {
    return {
      enabled: this.enableOptimization,
      threshold: this.threshold,
      minRegionSize: this.minRegionSize,
      maxRegions: this.maxRegions
    };
  }
}

module.exports = RegionDetector; 