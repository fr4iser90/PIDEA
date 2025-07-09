#!/usr/bin/env node
require('module-alias/register');

/**
 * Generate Test Reports Script
 * Generates all necessary test reports even when tests fail
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function main() {
  console.log('🚀 Generating test reports...');
  
  const projectRoot = process.cwd();
  
  try {
    // Step 1: Run tests first (this will capture passing/failing/skipped)
    console.log('🧪 Running tests...');
    try {
      execSync('npm run test', { stdio: 'inherit' });
      console.log('✅ Tests executed successfully');
    } catch (error) {
      console.log('⚠️ Some tests failed, but continuing with reports...');
    }

    // Step 2: Run coverage (this will work even if tests fail)
    console.log('📊 Running test coverage...');
    try {
      execSync('npm run test:coverage', { stdio: 'inherit' });
      console.log('✅ Coverage generated successfully');
    } catch (error) {
      console.log('⚠️ Coverage generation had issues, but continuing...');
    }

    // Step 2: Export test data
    console.log('📦 Exporting test data...');
    try {
      execSync('npm run test:export', { stdio: 'inherit' });
      console.log('✅ Test data exported successfully');
    } catch (error) {
      console.log('⚠️ Test export had issues, but continuing...');
    }

    // Step 3: Generate test reports
    console.log('📄 Generating test reports...');
    try {
      execSync('npm run test:report', { stdio: 'inherit' });
      console.log('✅ Test report generated successfully');
    } catch (error) {
      console.log('⚠️ Test report generation had issues, but continuing...');
    }

    // Step 4: Generate full test report
    console.log('📄 Generating full test report...');
    try {
      execSync('npm run test:report:full', { stdio: 'inherit' });
      console.log('✅ Full test report generated successfully');
    } catch (error) {
      console.log('⚠️ Full test report generation had issues, but continuing...');
    }

    // Step 5: Generate coverage markdown
    console.log('📄 Generating coverage markdown...');
    try {
      execSync('npm run test:coverage:md', { stdio: 'inherit' });
      console.log('✅ Coverage markdown generated successfully');
    } catch (error) {
      console.log('⚠️ Coverage markdown generation had issues, but continuing...');
    }

    // Step 6: Verify files exist
    console.log('🔍 Verifying generated files...');
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
        console.log(`✅ ${file} exists`);
      } else {
        missingFiles.push(file);
        console.log(`❌ ${file} missing`);
      }
    }

    console.log('\n📊 Summary:');
    console.log(`✅ Generated: ${existingFiles.length}/${requiredFiles.length} files`);
    
    if (missingFiles.length > 0) {
      console.log(`❌ Missing: ${missingFiles.join(', ')}`);
    }

    if (existingFiles.length > 0) {
      console.log('\n🎉 Test reports generated successfully!');
      console.log('The TestReportParser should now be able to process these files.');
    } else {
      console.log('\n⚠️ No test report files were generated.');
      console.log('This might indicate issues with the test management system.');
    }

  } catch (error) {
    console.error('❌ Error generating test reports:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { main }; 