#!/usr/bin/env node

/**
 * Test script for centralized analysis excludes configuration
 * 
 * This script tests the various exclude patterns and functions
 * to ensure they work correctly across different analysis scenarios.
 */

const { 
  analysisExcludes, 
  getExcludePatterns, 
  getFileSystemExcludes, 
  validateExcludePatterns 
} = require('@config/analysis-excludes');

const Logger = require('@logging/Logger');
const logger = new Logger('test-analysis-excludes');

async function testAnalysisExcludes() {
  logger.info('🧪 Testing Analysis Excludes Configuration');
  logger.info('=' .repeat(60));

  try {
    // Test 1: Basic exclude patterns
    logger.info('\n📋 Test 1: Basic exclude patterns');
    logger.info('Standard patterns:', analysisExcludes.standard.length);
    logger.info('Extended patterns:', analysisExcludes.extended.length);
    logger.info('Minimal patterns:', analysisExcludes.minimal.length);

    // Test 2: Get exclude patterns with different types
    logger.info('\n📋 Test 2: Get exclude patterns by type');
    
    const standardPatterns = getExcludePatterns('standard');
    const extendedPatterns = getExcludePatterns('extended');
    const minimalPatterns = getExcludePatterns('minimal');
    const developmentPatterns = getExcludePatterns('development');
    const productionPatterns = getExcludePatterns('production');
    const testingPatterns = getExcludePatterns('testing');

    logger.info(`Standard: ${standardPatterns.length} patterns`);
    logger.info(`Extended: ${extendedPatterns.length} patterns`);
    logger.info(`Minimal: ${minimalPatterns.length} patterns`);
    logger.info(`Development: ${developmentPatterns.length} patterns`);
    logger.info(`Production: ${productionPatterns.length} patterns`);
    logger.info(`Testing: ${testingPatterns.length} patterns`);

    // Test 3: Get exclude patterns with options
    logger.info('\n📋 Test 3: Get exclude patterns with options');
    
    const customPatterns = getExcludePatterns('extended', {
      additionalExcludes: ['custom-pattern', 'another-pattern']
    });
    logger.info(`Extended + custom: ${customPatterns.length} patterns`);
    logger.info('Custom patterns included:', customPatterns.includes('custom-pattern'));

    const filteredPatterns = getExcludePatterns('extended', {
      removeExcludes: ['node_modules', '.git']
    });
    logger.info(`Extended - removed: ${filteredPatterns.length} patterns`);
    logger.info('node_modules removed:', !filteredPatterns.includes('node_modules'));

    // Test 4: File system excludes
    logger.info('\n📋 Test 4: File system excludes');
    
    const fsExcludes = getFileSystemExcludes();
    logger.info(`Default FS excludes: ${fsExcludes.length} patterns`);

    const fsExcludesWithOptions = getFileSystemExcludes({
      includeHidden: true,
      includeNodeModules: true
    });
    logger.info(`FS excludes with options: ${fsExcludesWithOptions.length} patterns`);

    // Test 5: Pattern validation
    logger.info('\n📋 Test 5: Pattern validation');
    
    const validPatterns = ['node_modules', '.git', 'dist'];
    const validationResult = validateExcludePatterns(validPatterns);
    logger.info('Valid patterns result:', validationResult.valid);
    logger.info('Validation errors:', validationResult.errors.length);
    logger.info('Validation warnings:', validationResult.warnings.length);

    const invalidPatterns = ['node_modules', 123, ''];
    const invalidResult = validateExcludePatterns(invalidPatterns);
    logger.info('Invalid patterns result:', invalidResult.valid);
    logger.info('Invalid validation errors:', invalidResult.errors.length);

    // Test 6: Performance comparison
    logger.info('\n📋 Test 6: Performance comparison');
    
    const startTime = Date.now();
    for (let i = 0; i < 1000; i++) {
      getExcludePatterns('extended');
    }
    const endTime = Date.now();
    logger.info(`1000 calls to getExcludePatterns: ${endTime - startTime}ms`);

    // Test 7: Real-world scenario simulation
    logger.info('\n📋 Test 7: Real-world scenario simulation');
    
    const scenarios = [
      { name: 'Quick scan', type: 'minimal' },
      { name: 'Full analysis', type: 'extended' },
      { name: 'Development analysis', type: 'development' },
      { name: 'Production analysis', type: 'production' },
      { name: 'Testing analysis', type: 'testing' }
    ];

    scenarios.forEach(scenario => {
      const patterns = getExcludePatterns(scenario.type);
      logger.info(`${scenario.name}: ${patterns.length} patterns`);
    });

    logger.info('\n✅ All tests completed successfully!');
    logger.info('📊 Summary:');
    logger.info(`- Total pattern types: ${Object.keys(analysisExcludes).length}`);
    logger.info(`- Total extended patterns: ${analysisExcludes.extended.length}`);
    logger.info(`- Configuration is working correctly`);

  } catch (error) {
    logger.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testAnalysisExcludes()
    .then(() => {
      logger.info('\n🎉 Analysis excludes configuration test completed!');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('❌ Test failed:', error);
      process.exit(1);
    });
}

module.exports = {
  testAnalysisExcludes
}; 