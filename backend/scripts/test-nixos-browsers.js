#!/usr/bin/env node

/**
 * Test script to verify NixOS browser detection and compatibility
 */

require('module-alias/register');
const BrowserEnvironmentService = require('../domain/services/testing/BrowserEnvironmentService');
const PlaywrightTestRunner = require('../tests/playwright/utils/test-runner');

async function testNixOSBrowserDetection() {
  console.log('🔍 Testing NixOS Browser Detection...\n');
  
  try {
    // Test BrowserEnvironmentService
    const browserService = new BrowserEnvironmentService();
    console.log(`Platform: ${browserService.platform}`);
    console.log(`NixOS detected: ${browserService.isNixOS}`);
    console.log(`Playwright cache dir: ${browserService.playwrightCacheDir}\n`);
    
    // Get available browsers
    const browsers = await browserService.getAvailableBrowsers();
    console.log('📊 Available Browsers:');
    console.log('Playwright browsers:', browsers.playwright.map(b => ({
      name: b.name,
      available: b.available,
      compatible: b.compatible,
      reason: b.reason || 'N/A'
    })));
    
    console.log('\nSystem browsers:', browsers.system.map(b => ({
      name: b.name,
      available: b.available,
      command: b.command
    })));
    
    // Get recommendations
    const recommendations = browserService.getRecommendations();
    console.log('\n💡 Recommendations:');
    console.log('Primary:', recommendations.primary);
    console.log('Fallback:', recommendations.fallback);
    console.log('Install command:', recommendations.installCommand);
    console.log('Warnings:', recommendations.warnings);
    
    // Test PlaywrightTestRunner
    console.log('\n🧪 Testing PlaywrightTestRunner...');
    const testRunner = new PlaywrightTestRunner({
      browsers: ['chromium', 'firefox'],
      headless: false
    });
    
    console.log(`Test runner initialized for NixOS: ${testRunner.isNixOS}`);
    console.log(`Configured browsers: ${testRunner.options.browsers.join(', ')}`);
    
    // Test browser environment summary
    const summary = await browserService.getEnvironmentSummary();
    console.log('\n📋 Environment Summary:');
    console.log('Has Playwright browsers:', summary.hasPlaywrightBrowsers);
    console.log('Has system browsers:', summary.hasSystemBrowsers);
    console.log('Recommended install:', summary.recommendedInstall);
    
    console.log('\n✅ NixOS browser detection test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testNixOSBrowserDetection().catch(console.error);
