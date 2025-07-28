#!/usr/bin/env node

/**
 * Debug WorkflowLoaderService Injection
 * Tests if the workflowLoaderService is properly injected and available
 */

const path = require('path');

console.log('🔍 Debugging WorkflowLoaderService Injection...\n');

// Test 1: Check if WorkflowLoaderService file exists
function testWorkflowLoaderServiceFile() {
    const filePath = path.resolve(__dirname, '../backend/domain/services/workflow/WorkflowLoaderService.js');
    try {
        require(filePath);
        console.log('✅ WorkflowLoaderService.js file exists and can be required');
        return true;
    } catch (error) {
        console.log('❌ WorkflowLoaderService.js file error:', error.message);
        return false;
    }
}

// Test 2: Check if analysis-workflows.json exists
function testAnalysisWorkflowsFile() {
    const filePath = path.resolve(__dirname, '../backend/framework/workflows/analysis-workflows.json');
    try {
        const fs = require('fs');
        if (fs.existsSync(filePath)) {
            console.log('✅ analysis-workflows.json file exists');
            return true;
        } else {
            console.log('❌ analysis-workflows.json file not found');
            return false;
        }
    } catch (error) {
        console.log('❌ Error checking analysis-workflows.json:', error.message);
        return false;
    }
}

// Test 3: Check ServiceRegistry registration
function testServiceRegistryRegistration() {
    const filePath = path.resolve(__dirname, '../backend/infrastructure/dependency-injection/ServiceRegistry.js');
    try {
        const fs = require('fs');
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Check if workflowLoaderService is in collectServiceDefinitions
        if (content.includes("this.addServiceDefinition('workflowLoaderService'")) {
            console.log('✅ workflowLoaderService found in collectServiceDefinitions');
        } else {
            console.log('❌ workflowLoaderService NOT found in collectServiceDefinitions');
        }
        
        // Check if workflowLoaderService case is in registerDomainService
        if (content.includes("case 'workflowLoaderService':")) {
            console.log('✅ workflowLoaderService case found in registerDomainService');
        } else {
            console.log('❌ workflowLoaderService case NOT found in registerDomainService');
        }
        
        return true;
    } catch (error) {
        console.log('❌ Error checking ServiceRegistry:', error.message);
        return false;
    }
}

// Test 4: Check Application.js injection
function testApplicationInjection() {
    const filePath = path.resolve(__dirname, '../backend/Application.js');
    try {
        const fs = require('fs');
        const content = fs.readFileSync(filePath, 'utf8');
        
        if (content.includes("workflowLoaderService: this.serviceRegistry.getService('workflowLoaderService')")) {
            console.log('✅ workflowLoaderService injection found in Application.js');
            return true;
        } else {
            console.log('❌ workflowLoaderService injection NOT found in Application.js');
            return false;
        }
    } catch (error) {
        console.log('❌ Error checking Application.js:', error.message);
        return false;
    }
}

// Test 5: Check WorkflowController constructor
function testWorkflowControllerConstructor() {
    const filePath = path.resolve(__dirname, '../backend/presentation/api/WorkflowController.js');
    try {
        const fs = require('fs');
        const content = fs.readFileSync(filePath, 'utf8');
        
        if (content.includes("this.workflowLoaderService = dependencies.workflowLoaderService")) {
            console.log('✅ workflowLoaderService assignment found in WorkflowController constructor');
            return true;
        } else {
            console.log('❌ workflowLoaderService assignment NOT found in WorkflowController constructor');
            return false;
        }
    } catch (error) {
        console.log('❌ Error checking WorkflowController:', error.message);
        return false;
    }
}

// Run all tests
console.log('🧪 Running tests...\n');

const tests = [
    testWorkflowLoaderServiceFile,
    testAnalysisWorkflowsFile,
    testServiceRegistryRegistration,
    testApplicationInjection,
    testWorkflowControllerConstructor
];

let passedTests = 0;
for (const test of tests) {
    if (test()) {
        passedTests++;
    }
    console.log('');
}

console.log(`📊 Test Results: ${passedTests}/${tests.length} tests passed`);

if (passedTests === tests.length) {
    console.log('🎉 All tests passed! The workflowLoaderService should be properly configured.');
} else {
    console.log('⚠️ Some tests failed. Check the configuration.');
} 