/**
 * TestMetadataRepository - Repository for managing test metadata
 * Provides data access methods for test metadata storage and retrieval
 */
const TestMetadata = require('@/domain/entities/TestMetadata');

class TestMetadataRepository {
  constructor() {
    this._testMetadata = new Map();
    this._filePathIndex = new Map();
    this._statusIndex = new Map();
    this._legacyIndex = new Map();
    this._tagIndex = new Map();
  }

  /**
   * Save test metadata
   * @param {TestMetadata} testMetadata - The test metadata to save
   * @returns {Promise<TestMetadata>} - The saved test metadata
   */
  async save(testMetadata) {
    if (!testMetadata || !(testMetadata instanceof TestMetadata)) {
      throw new Error('Valid TestMetadata instance is required');
    }

    const existing = this._testMetadata.get(testMetadata.id);
    if (existing) {
      // Update existing
      this._removeFromIndexes(existing);
    }

    // Save to main storage
    this._testMetadata.set(testMetadata.id, testMetadata);
    
    // Update indexes
    this._addToIndexes(testMetadata);

    return testMetadata;
  }

  /**
   * Find test metadata by ID
   * @param {string} id - The test metadata ID
   * @returns {Promise<TestMetadata|null>} - The found test metadata or null
   */
  async findById(id) {
    if (!id) {
      throw new Error('ID is required');
    }
    return this._testMetadata.get(id) || null;
  }

  /**
   * Find test metadata by file path
   * @param {string} filePath - The file path
   * @returns {Promise<TestMetadata|null>} - The found test metadata or null
   */
  async findByFilePath(filePath) {
    if (!filePath) {
      throw new Error('File path is required');
    }
    const id = this._filePathIndex.get(filePath);
    return id ? this._testMetadata.get(id) : null;
  }

  /**
   * Find test metadata by file path and test name
   * @param {string} filePath - The file path
   * @param {string} testName - The test name
   * @returns {Promise<TestMetadata|null>} - The found test metadata or null
   */
  async findByFilePathAndTestName(filePath, testName) {
    if (!filePath || !testName) {
      throw new Error('File path and test name are required');
    }
    
    const allTests = await this.findByFilePath(filePath);
    if (!allTests) return null;
    
    // If it's a single test, check if it matches
    if (allTests.testName === testName) {
      return allTests;
    }
    
    // If it's a collection, find the specific test
    if (Array.isArray(allTests)) {
      return allTests.find(test => test.testName === testName) || null;
    }
    
    return null;
  }

  /**
   * Find all test metadata by status
   * @param {string} status - The status to filter by
   * @returns {Promise<TestMetadata[]>} - Array of test metadata
   */
  async findByStatus(status) {
    if (!status) {
      throw new Error('Status is required');
    }
    
    const ids = this._statusIndex.get(status) || [];
    return ids.map(id => this._testMetadata.get(id)).filter(Boolean);
  }

  /**
   * Find all legacy test metadata
   * @returns {Promise<TestMetadata[]>} - Array of legacy test metadata
   */
  async findLegacyTests() {
    const ids = this._legacyIndex.get(true) || [];
    return ids.map(id => this._testMetadata.get(id)).filter(Boolean);
  }

  /**
   * Find test metadata by tag
   * @param {string} tag - The tag to filter by
   * @returns {Promise<TestMetadata[]>} - Array of test metadata
   */
  async findByTag(tag) {
    if (!tag) {
      throw new Error('Tag is required');
    }
    
    const ids = this._tagIndex.get(tag) || [];
    return ids.map(id => this._testMetadata.get(id)).filter(Boolean);
  }

  /**
   * Find all test metadata
   * @returns {Promise<TestMetadata[]>} - Array of all test metadata
   */
  async findAll() {
    return Array.from(this._testMetadata.values());
  }

  /**
   * Find test metadata with pagination
   * @param {number} page - Page number (1-based)
   * @param {number} limit - Number of items per page
   * @returns {Promise<{data: TestMetadata[], total: number, page: number, limit: number}>} - Paginated results
   */
  async findWithPagination(page = 1, limit = 20) {
    const allTests = await this.findAll();
    const total = allTests.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const data = allTests.slice(startIndex, endIndex);
    
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Find test metadata by health score range
   * @param {number} minScore - Minimum health score
   * @param {number} maxScore - Maximum health score
   * @returns {Promise<TestMetadata[]>} - Array of test metadata
   */
  async findByHealthScoreRange(minScore, maxScore) {
    const allTests = await this.findAll();
    return allTests.filter(test => {
      const healthScore = test.getHealthScore();
      return healthScore >= minScore && healthScore <= maxScore;
    });
  }

  /**
   * Find test metadata that need maintenance
   * @returns {Promise<TestMetadata[]>} - Array of test metadata needing maintenance
   */
  async findNeedingMaintenance() {
    const allTests = await this.findAll();
    return allTests.filter(test => test.needsMaintenance());
  }

  /**
   * Find test metadata by complexity level
   * @param {string} complexity - 'low', 'medium', 'high'
   * @returns {Promise<TestMetadata[]>} - Array of test metadata
   */
  async findByComplexity(complexity) {
    const allTests = await this.findAll();
    return allTests.filter(test => {
      const score = test.complexityScore;
      switch (complexity) {
        case 'low': return score < 30;
        case 'medium': return score >= 30 && score < 70;
        case 'high': return score >= 70;
        default: return false;
      }
    });
  }

  /**
   * Delete test metadata by ID
   * @param {string} id - The test metadata ID
   * @returns {Promise<boolean>} - True if deleted, false if not found
   */
  async deleteById(id) {
    if (!id) {
      throw new Error('ID is required');
    }
    
    const testMetadata = this._testMetadata.get(id);
    if (!testMetadata) {
      return false;
    }
    
    this._removeFromIndexes(testMetadata);
    this._testMetadata.delete(id);
    return true;
  }

  /**
   * Delete test metadata by file path
   * @param {string} filePath - The file path
   * @returns {Promise<number>} - Number of deleted records
   */
  async deleteByFilePath(filePath) {
    if (!filePath) {
      throw new Error('File path is required');
    }
    
    const testMetadata = await this.findByFilePath(filePath);
    if (!testMetadata) {
      return 0;
    }
    
    await this.deleteById(testMetadata.id);
    return 1;
  }

  /**
   * Count test metadata by status
   * @returns {Promise<Object>} - Status counts
   */
  async countByStatus() {
    const counts = {};
    const allTests = await this.findAll();
    
    allTests.forEach(test => {
      const status = test.status;
      counts[status] = (counts[status] || 0) + 1;
    });
    
    return counts;
  }

  /**
   * Get test metadata statistics
   * @returns {Promise<Object>} - Statistics object
   */
  async getStatistics() {
    const allTests = await this.findAll();
    const total = allTests.length;
    
    if (total === 0) {
      return {
        total: 0,
        passing: 0,
        failing: 0,
        skipped: 0,
        pending: 0,
        legacy: 0,
        averageHealthScore: 0,
        averageComplexityScore: 0,
        averageMaintenanceScore: 0
      };
    }
    
    const passing = allTests.filter(test => test.isPassing()).length;
    const failing = allTests.filter(test => test.isFailing()).length;
    const skipped = allTests.filter(test => test.isSkipped()).length;
    const pending = allTests.filter(test => test.isPending()).length;
    const legacy = allTests.filter(test => test.isLegacy).length;
    
    const totalHealthScore = allTests.reduce((sum, test) => sum + test.getHealthScore(), 0);
    const totalComplexityScore = allTests.reduce((sum, test) => sum + test.complexityScore, 0);
    const totalMaintenanceScore = allTests.reduce((sum, test) => sum + test.maintenanceScore, 0);
    
    return {
      total,
      passing,
      failing,
      skipped,
      pending,
      legacy,
      averageHealthScore: Math.round(totalHealthScore / total),
      averageComplexityScore: Math.round(totalComplexityScore / total),
      averageMaintenanceScore: Math.round(totalMaintenanceScore / total)
    };
  }

  /**
   * Clear all test metadata
   * @returns {Promise<void>}
   */
  async clear() {
    this._testMetadata.clear();
    this._filePathIndex.clear();
    this._statusIndex.clear();
    this._legacyIndex.clear();
    this._tagIndex.clear();
  }

  // Private helper methods for indexing
  _addToIndexes(testMetadata) {
    // File path index
    this._filePathIndex.set(testMetadata.filePath, testMetadata.id);
    
    // Status index
    const status = testMetadata.status;
    if (!this._statusIndex.has(status)) {
      this._statusIndex.set(status, []);
    }
    this._statusIndex.get(status).push(testMetadata.id);
    
    // Legacy index
    if (testMetadata.isLegacy) {
      if (!this._legacyIndex.has(true)) {
        this._legacyIndex.set(true, []);
      }
      this._legacyIndex.get(true).push(testMetadata.id);
    }
    
    // Tag index
    testMetadata.tags.forEach(tag => {
      if (!this._tagIndex.has(tag)) {
        this._tagIndex.set(tag, []);
      }
      this._tagIndex.get(tag).push(testMetadata.id);
    });
  }

  _removeFromIndexes(testMetadata) {
    // File path index
    this._filePathIndex.delete(testMetadata.filePath);
    
    // Status index
    const status = testMetadata.status;
    const statusIds = this._statusIndex.get(status);
    if (statusIds) {
      const index = statusIds.indexOf(testMetadata.id);
      if (index > -1) {
        statusIds.splice(index, 1);
      }
      if (statusIds.length === 0) {
        this._statusIndex.delete(status);
      }
    }
    
    // Legacy index
    if (testMetadata.isLegacy) {
      const legacyIds = this._legacyIndex.get(true);
      if (legacyIds) {
        const index = legacyIds.indexOf(testMetadata.id);
        if (index > -1) {
          legacyIds.splice(index, 1);
        }
        if (legacyIds.length === 0) {
          this._legacyIndex.delete(true);
        }
      }
    }
    
    // Tag index
    testMetadata.tags.forEach(tag => {
      const tagIds = this._tagIndex.get(tag);
      if (tagIds) {
        const index = tagIds.indexOf(testMetadata.id);
        if (index > -1) {
          tagIds.splice(index, 1);
        }
        if (tagIds.length === 0) {
          this._tagIndex.delete(tag);
        }
      }
    });
  }
}

module.exports = TestMetadataRepository; 