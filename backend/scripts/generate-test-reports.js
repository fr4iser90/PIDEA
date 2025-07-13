
#!/usr/bin/env node
require('module-alias/register');

/**
 * Generate Test Reports Script
 * Generates all necessary test reports even when tests fail
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { logger } = require('@infrastructure/logging/Logger');

async function main() {
  logger.debug('🚀 Generating test reports...');
  
  const projectRoot = process.cwd();
  
  try {
    // Step 1: Run tests first (this will capture passing/failing/skipped)
    logger.debug('🧪 Running tests...');
    try {
      execSync('npm run test', { stdio: 'inherit' });
      logger.debug('✅ Tests executed successfully');
    } catch (error) {
      logger.debug('⚠️ Some tests failed, but continuing with reports...');
    }

    // Step 2: Run coverage (this will work even if tests fail)
    logger.debug('📊 Running test coverage...');
    try {
      execSync('npm run test:coverage', { stdio: 'inherit' });
      logger.log('✅ Coverage generated successfully');
    } catch (error) {
      logger.log('⚠️ Coverage generation had issues, but continuing...');
    }

    // Step 2: Export test data
    logger.debug('📦 Exporting test data...');
    try {
      execSync('npm run test:export', { stdio: 'inherit' });
      logger.debug('✅ Test data exported successfully');
    } catch (error) {
      logger.debug('⚠️ Test export had issues, but continuing...');
    }

    // Step 3: Generate test reports
    logger.debug('📄 Generating test reports...');
    try {
      execSync('npm run test:report', { stdio: 'inherit' });
      logger.debug('✅ Test report generated successfully');
    } catch (error) {
      logger.debug('⚠️ Test report generation had issues, but continuing...');
    }

    // Step 4: Generate full test report
    logger.debug('📄 Generating full test report...');
    try {
      execSync('npm run test:report:full', { stdio: 'inherit' });
      logger.debug('✅ Full test report generated successfully');
    } catch (error) {
      logger.debug('⚠️ Full test report generation had issues, but continuing...');
    }

    // Step 5: Generate coverage markdown
    logger.log('📄 Generating coverage markdown...');
    try {
      execSync('npm run test:coverage:md', { stdio: 'inherit' });
      logger.log('✅ Coverage markdown generated successfully');
    } catch (error) {
      logger.log('⚠️ Coverage markdown generation had issues, but continuing...');
    }

    // Step 6: Verify files exist
    logger.log('🔍 Verifying generated files...');
    const requiredFiles = [
      'coverage.md',
      'test-report.md',
      'test-report-full.md',
      'test-data.json'
    ];

    const existingFiles = [];
    const missingFiles = [];

    for (const file of requiredFiles) {
      const filePath = path.join(projectRoot, file);
      if (fs.existsSync(filePath)) {
        existingFiles.push(file);
        logger.log(`✅ ${file} exists`);
      } else {
        missingFiles.push(file);
        logger.log(`❌ ${file} missing`);
      }
    }

    logger.log('\n📊 Summary:');
    logger.log(`✅ Generated: ${existingFiles.length}/${requiredFiles.length} files`);
    
    if (missingFiles.length > 0) {
      logger.log(`❌ Missing: ${missingFiles.join(', ')}`);
    }

    if (existingFiles.length > 0) {
      logger.debug('\n🎉 Test reports generated successfully!');
      logger.debug('The TestReportParser should now be able to process these files.');
    } else {
      logger.debug('\n⚠️ No test report files were generated.');
      logger.debug('This might indicate issues with the test management system.');
    }

  } catch (error) {
    logger.error('❌ Error generating test reports:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    logger.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { main }; 