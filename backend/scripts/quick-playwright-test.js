#!/usr/bin/env node

const { chromium } = require('playwright');

console.log('🧪 Quick Playwright Test');
console.log('========================\n');

async function quickTest() {
    try {
        console.log('1️⃣ Testing Chromium launch...');
        
        // Verwende NixOS Chromium aus Umgebungsvariable
        const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
        if (executablePath) {
            console.log(`🔍 Using NixOS Chromium: ${executablePath}`);
        } else {
            console.log(`🔍 Using standard Playwright Chromium`);
        }
        
        const browser = await chromium.launch({
            headless: true, // HEADLESS MODE - Hide browser window
            args: ['--no-sandbox', '--disable-gpu'], // Common NixOS flags
            executablePath: executablePath // Verwende NixOS Chromium falls verfügbar
        });
        
        // DEBUG: Show what executable was actually used
        console.log('🔍 DEBUG: Browser launched, checking processes...');
        
        console.log('✅ HEADLESS Chromium launched successfully!');
        
        const page = await browser.newPage();
        await page.goto('https://google.com/');
        console.log('✅ Website loaded successfully!');
        
        // Test curl-like functionality
        const response = await page.goto('https://google.com/');
        console.log('📊 Response status:', response.status());
        console.log('📊 Response headers:', response.headers());
        
        // Get page title
        const title = await page.title();
        console.log('📄 Page title:', title);
        
        // Get page content length
        const content = await page.content();
        console.log('📏 Page content length:', content.length, 'characters');
        
        // Wait a bit so you can see the browser
        await page.waitForTimeout(2000);
        
        await browser.close();
        console.log('✅ Browser closed successfully!');
        
        console.log('\n🎉 Playwright works! You can use this configuration for tests.');
        
    } catch (error) {
        console.log('❌ Playwright failed:', error.message);
        console.log('\n💡 Try running: npx playwright install chromium');
    }
}

quickTest();
