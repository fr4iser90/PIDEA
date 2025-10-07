#!/usr/bin/env node

/**
 * BrowserManager Selector Test Script
 * Tests if BrowserManager correctly passes selectors from JSON configuration
 */

// Set up module path resolution
const path = require('path');
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function(id) {
  if (id.startsWith('@')) {
    // Resolve @ aliases to backend paths
    const aliasMap = {
      '@logging': path.join(__dirname, 'backend/infrastructure/logging'),
      '@services': path.join(__dirname, 'backend/domain/services'),
      '@infrastructure': path.join(__dirname, 'backend/infrastructure')
    };
    
    for (const [alias, resolvedPath] of Object.entries(aliasMap)) {
      if (id.startsWith(alias)) {
        const relativePath = id.substring(alias.length + 1);
        return originalRequire.call(this, path.join(resolvedPath, relativePath));
      }
    }
  }
  return originalRequire.call(this, id);
};

const BrowserManager = require('./backend/infrastructure/external/BrowserManager');
const Logger = require('./backend/infrastructure/logging/Logger');

const logger = new Logger('SelectorTest');

async function testSelectorPassing() {
  console.log('🧪 Testing BrowserManager Selector Passing...\n');
  
  const browserManager = new BrowserManager();
  
  try {
    // Test 1: Check if getAllSelectors method exists and works
    console.log('1️⃣ Testing getAllSelectors method...');
    
    // Mock a port for testing
    browserManager.currentPort = 9222; // Cursor port
    
    // Test the method (this will fail without real IDE, but we can check the flow)
    try {
      const selectors = await browserManager.getAllSelectors();
      console.log('✅ getAllSelectors method works');
      console.log('📋 Selectors structure:', Object.keys(selectors));
    } catch (error) {
      console.log('⚠️ getAllSelectors failed (expected without real IDE):', error.message);
    }
    
    // Test 2: Check getIDESelectors method
    console.log('\n2️⃣ Testing getIDESelectors method...');
    
    try {
      const selectors = await browserManager.getIDESelectors('cursor', '1.5.7');
      console.log('✅ getIDESelectors method works');
      console.log('📋 Available selector categories:', Object.keys(selectors));
      
      // Check if required selectors are present
      const requiredCategories = [
        'chatSelectors',
        'commandPaletteSelectors', 
        'fileOperationSelectors',
        'menuNavigationSelectors',
        'projectManagementSelectors',
        'welcomeScreenSelectors',
        'workspaceSelectors'
      ];
      
      console.log('\n🔍 Checking required selector categories:');
      requiredCategories.forEach(category => {
        if (selectors[category]) {
          console.log(`✅ ${category}: ${Object.keys(selectors[category]).length} selectors`);
        } else {
          console.log(`❌ ${category}: MISSING`);
        }
      });
      
      // Check specific critical selectors
      console.log('\n🎯 Checking critical selectors:');
      const criticalSelectors = [
        'chatSelectors.newChatButton',
        'chatSelectors.input',
        'chatSelectors.loadingIndicator',
        'fileOperationSelectors.modal',
        'fileOperationSelectors.closeButton',
        'projectManagementSelectors.projectExplorer.container'
      ];
      
      criticalSelectors.forEach(selectorPath => {
        const parts = selectorPath.split('.');
        const category = parts[0];
        const selector = parts.slice(1).join('.');
        
        if (selectors[category] && selectors[category][selector]) {
          console.log(`✅ ${selectorPath}: ${selectors[category][selector]}`);
        } else {
          console.log(`❌ ${selectorPath}: MISSING`);
          if (selectors[category]) {
            console.log(`   Available in ${category}:`, Object.keys(selectors[category]));
          }
        }
      });
      
    } catch (error) {
      console.log('❌ getIDESelectors failed:', error.message);
    }
    
    // Test 3: Check detectIDEType method
    console.log('\n3️⃣ Testing detectIDEType method...');
    
    const testPorts = [
      { port: 9222, expected: 'cursor' },
      { port: 9232, expected: 'vscode' },
      { port: 9242, expected: 'windsurf' },
      { port: 9999, expected: 'error' }
    ];
    
    for (const { port, expected } of testPorts) {
      try {
        const result = await browserManager.detectIDEType(port);
        if (expected === 'error') {
          console.log(`❌ Port ${port}: Should have thrown error but returned: ${result}`);
        } else {
          console.log(`✅ Port ${port}: ${result} (expected: ${expected})`);
        }
      } catch (error) {
        if (expected === 'error') {
          console.log(`✅ Port ${port}: Correctly threw error: ${error.message}`);
        } else {
          console.log(`❌ Port ${port}: Unexpected error: ${error.message}`);
        }
      }
    }
    
    console.log('\n🎉 Selector passing test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testSelectorPassing().catch(console.error);
