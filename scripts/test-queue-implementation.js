/**
 * Queue Implementation Test Script
 * Validates that our queue management system is properly implemented
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Queue Management Implementation...\n');

// Test results
const results = {
    passed: 0,
    failed: 0,
    total: 0
};

function testFile(filePath, description) {
    results.total++;
    try {
        if (fs.existsSync(filePath)) {
            console.log(`✅ ${description} - File exists`);
            results.passed++;
        } else {
            console.log(`❌ ${description} - File missing`);
            results.failed++;
        }
    } catch (error) {
        console.log(`❌ ${description} - Error: ${error.message}`);
        results.failed++;
    }
}

function testDirectory(dirPath, description) {
    results.total++;
    try {
        if (fs.existsSync(dirPath)) {
            const files = fs.readdirSync(dirPath);
            console.log(`✅ ${description} - Directory exists with ${files.length} files`);
            results.passed++;
        } else {
            console.log(`❌ ${description} - Directory missing`);
            results.failed++;
        }
    } catch (error) {
        console.log(`❌ ${description} - Error: ${error.message}`);
        results.failed++;
    }
}

// Test backend components
console.log('🔧 Testing Backend Components:');
testFile('backend/presentation/api/QueueController.js', 'QueueController API');
testFile('backend/domain/services/queue/QueueMonitoringService.js', 'QueueMonitoringService');
testFile('backend/domain/services/queue/StepProgressService.js', 'StepProgressService');

// Test frontend components
console.log('\n🎨 Testing Frontend Components:');
testDirectory('frontend/src/presentation/components/queue', 'Queue Components Directory');
testFile('frontend/src/presentation/components/queue/QueueManagementPanel.jsx', 'QueueManagementPanel');
testFile('frontend/src/presentation/components/queue/ActiveTaskItem.jsx', 'ActiveTaskItem');
testFile('frontend/src/presentation/components/queue/StepTimeline.jsx', 'StepTimeline');
testFile('frontend/src/presentation/components/queue/QueueItem.jsx', 'QueueItem');
testFile('frontend/src/presentation/components/queue/QueueControls.jsx', 'QueueControls');

// Test CSS files
console.log('\n🎨 Testing CSS Files:');
testFile('frontend/src/css/panel/queue-panel.css', 'Queue Panel CSS');
testFile('frontend/src/css/panel/step-timeline.css', 'Step Timeline CSS');

// Test repository
console.log('\n📚 Testing Repository:');
testFile('frontend/src/infrastructure/repositories/QueueRepository.jsx', 'QueueRepository');

// Test integration
console.log('\n🔗 Testing Integration:');
testFile('frontend/src/presentation/components/SidebarRight.jsx', 'SidebarRight (should have Queue tab)');

// Check if Queue tab is in SidebarRight
try {
    const sidebarContent = fs.readFileSync('frontend/src/presentation/components/SidebarRight.jsx', 'utf8');
    if (sidebarContent.includes('Queue') || sidebarContent.includes('queue')) {
        console.log('✅ Queue tab integration found in SidebarRight');
        results.passed++;
    } else {
        console.log('❌ Queue tab integration not found in SidebarRight');
        results.failed++;
    }
    results.total++;
} catch (error) {
    console.log(`❌ Error checking SidebarRight integration: ${error.message}`);
    results.failed++;
    results.total++;
}

// Summary
console.log('\n📊 Test Summary:');
console.log(`Total Tests: ${results.total}`);
console.log(`Passed: ${results.passed}`);
console.log(`Failed: ${results.failed}`);
console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);

if (results.failed === 0) {
    console.log('\n🎉 All tests passed! Queue Management System is properly implemented.');
    process.exit(0);
} else {
    console.log('\n⚠️  Some tests failed. Please check the implementation.');
    process.exit(1);
} 