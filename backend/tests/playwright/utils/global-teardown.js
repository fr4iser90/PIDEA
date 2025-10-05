const fs = require('fs-extra');
const path = require('path');

/**
 * Global Teardown for Playwright Tests
 * 
 * This function runs once after all tests and:
 * - Cleans up temporary files
 * - Generates test summary
 * - Archives test results
 */
async function globalTeardown(config) {
  console.log('🧹 Starting Playwright global teardown...');
  
  try {
    // Generate test summary
    const resultsPath = path.resolve('./reports/test-results.json');
    if (await fs.pathExists(resultsPath)) {
      const results = await fs.readJson(resultsPath);
      
      const summary = {
        total: results.stats?.total || 0,
        passed: results.stats?.passed || 0,
        failed: results.stats?.failed || 0,
        skipped: results.stats?.skipped || 0,
        duration: results.stats?.duration || 0,
        timestamp: new Date().toISOString()
      };
      
      await fs.writeJson(
        path.resolve('./reports/test-summary.json'), 
        summary, 
        { spaces: 2 }
      );
      
      console.log('📊 Test Summary:');
      console.log(`   Total: ${summary.total}`);
      console.log(`   Passed: ${summary.passed}`);
      console.log(`   Failed: ${summary.failed}`);
      console.log(`   Skipped: ${summary.skipped}`);
      console.log(`   Duration: ${(summary.duration / 1000).toFixed(2)}s`);
    }
    
    // Clean up temporary files older than 7 days
    const tempDirs = ['./screenshots', './videos', './traces'];
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    for (const dir of tempDirs) {
      if (await fs.pathExists(dir)) {
        const files = await fs.readdir(dir);
        
        for (const file of files) {
          const filePath = path.join(dir, file);
          const stats = await fs.stat(filePath);
          
          if (stats.mtime.getTime() < sevenDaysAgo) {
            await fs.remove(filePath);
            console.log(`🗑️  Cleaned up old file: ${filePath}`);
          }
        }
      }
    }
    
    // Archive test results if there are failures
    const summaryPath = path.resolve('./reports/test-summary.json');
    if (await fs.pathExists(summaryPath)) {
      const summary = await fs.readJson(summaryPath);
      
      if (summary.failed > 0) {
        const archiveDir = path.resolve('./reports/archives');
        await fs.ensureDir(archiveDir);
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const archiveName = `test-results-${timestamp}`;
        const archivePath = path.join(archiveDir, archiveName);
        
        await fs.copy('./reports', archivePath);
        console.log(`📦 Archived test results: ${archivePath}`);
      }
    }
    
    console.log('✅ Global teardown completed successfully');
    
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw error in teardown to avoid masking test failures
  }
}

module.exports = globalTeardown;
