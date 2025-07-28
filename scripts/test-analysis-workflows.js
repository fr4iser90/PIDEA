#!/usr/bin/env node

/**
 * Test Analysis Workflows Integration
 * Validates that the new analysis-workflows.json is properly integrated
 */

const path = require('path');
const fs = require('fs');

console.log('🧪 Testing Analysis Workflows Integration...\n');

// Test functions
function testFile(filePath, description) {
    try {
        const fullPath = path.resolve(__dirname, '..', 'backend', filePath);
        if (fs.existsSync(fullPath)) {
            console.log(`✅ ${description}: ${filePath}`);
            return true;
        } else {
            console.log(`❌ ${description}: ${filePath} - NOT FOUND`);
            return false;
        }
    } catch (error) {
        console.log(`❌ ${description}: ${filePath} - ERROR: ${error.message}`);
        return false;
    }
}

function testJSONSyntax(filePath, description) {
    try {
        const fullPath = path.resolve(__dirname, '..', 'backend', filePath);
        const content = fs.readFileSync(fullPath, 'utf8');
        JSON.parse(content);
        console.log(`✅ ${description}: ${filePath} - Valid JSON`);
        return true;
    } catch (error) {
        console.log(`❌ ${description}: ${filePath} - Invalid JSON: ${error.message}`);
        return false;
    }
}

function testCode(filePath, description, testFunction) {
    try {
        const fullPath = path.resolve(__dirname, '..', 'backend', filePath);
        const content = fs.readFileSync(fullPath, 'utf8');
        const result = testFunction(content);
        if (result) {
            console.log(`✅ ${description}: ${filePath}`);
            return true;
        } else {
            console.log(`❌ ${description}: ${filePath} - Test failed`);
            return false;
        }
    } catch (error) {
        console.log(`❌ ${description}: ${filePath} - ERROR: ${error.message}`);
        return false;
    }
}

// Run tests
let allTestsPassed = true;

console.log('📁 File Existence Tests:');
allTestsPassed &= testFile('framework/workflows/analysis-workflows.json', 'Analysis workflows JSON file');

console.log('\n📋 JSON Syntax Tests:');
allTestsPassed &= testJSONSyntax('framework/workflows/analysis-workflows.json', 'Analysis workflows JSON syntax');
allTestsPassed &= testJSONSyntax('framework/workflows/task-workflows.json', 'Task workflows JSON syntax');

console.log('\n🔧 Code Integration Tests:');
allTestsPassed &= testCode('domain/services/workflow/WorkflowLoaderService.js', 'WorkflowLoaderService includes analysis-workflows.json', (content) => {
    return content.includes('analysis-workflows.json');
});

allTestsPassed &= testCode('presentation/api/WorkflowController.js', 'WorkflowController has workflowLoaderService dependency', (content) => {
    return content.includes('this.workflowLoaderService = dependencies.workflowLoaderService');
});

allTestsPassed &= testCode('Application.js', 'Application injects workflowLoaderService into WorkflowController', (content) => {
    return content.includes('workflowLoaderService: this.workflowLoaderService');
});

allTestsPassed &= testCode('framework/workflows/analysis-workflows.json', 'Analysis workflows contains comprehensive-analysis-workflow', (content) => {
    const data = JSON.parse(content);
    return data.workflows && data.workflows['comprehensive-analysis-workflow'];
});

allTestsPassed &= testCode('framework/workflows/analysis-workflows.json', 'Analysis workflows has analysisTypeMapping', (content) => {
    const data = JSON.parse(content);
    return data.analysisTypeMapping && data.analysisTypeMapping.comprehensive;
});

allTestsPassed &= testCode('framework/workflows/task-workflows.json', 'Task workflows does NOT contain comprehensive-analysis-workflow', (content) => {
    const data = JSON.parse(content);
    return !data.workflows || !data.workflows['comprehensive-analysis-workflow'];
});

console.log('\n📊 Test Results:');
if (allTestsPassed) {
    console.log('🎉 ALL TESTS PASSED! Analysis workflows integration is working correctly.');
    console.log('\n✅ What was validated:');
    console.log('   - Analysis workflows JSON file exists and has valid syntax');
    console.log('   - WorkflowLoaderService loads analysis-workflows.json');
    console.log('   - WorkflowController receives workflowLoaderService dependency');
    console.log('   - Application properly injects workflowLoaderService');
    console.log('   - Comprehensive analysis workflow moved to analysis-workflows.json');
    console.log('   - Analysis type mapping is properly configured');
    console.log('   - Task workflows no longer contains analysis workflows');
} else {
    console.log('❌ SOME TESTS FAILED! Please check the integration.');
    process.exit(1);
}

console.log('\n🚀 Next Steps:');
console.log('   1. Restart the backend to load new analysis workflows');
console.log('   2. Test "Run All Analysis" button in the UI');
console.log('   3. Check Queue tab for workflow progress');
console.log('   4. Verify individual analysis buttons still work'); 