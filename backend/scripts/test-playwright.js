#!/usr/bin/env node

const { chromium, firefox, webkit } = require("playwright");
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

console.log("🧪 Playwright Test Script für NixOS");
console.log("=====================================\n");

// Test 1: Basic Playwright import test
console.log("1️⃣ Testing Playwright imports...");
try {
  console.log("✅ chromium:", typeof chromium);
  console.log("✅ firefox:", typeof firefox);
  console.log("✅ webkit:", typeof webkit);
} catch (error) {
  console.log("❌ Import error:", error.message);
}

// Test 2: Check Playwright cache directory
console.log("\n2️⃣ Checking Playwright cache...");
const playwrightCacheDir =
  process.env.PLAYWRIGHT_BROWSERS_PATH ||
  path.join(os.homedir(), ".cache", "ms-playwright");
console.log("Cache dir:", playwrightCacheDir);

if (fs.existsSync(playwrightCacheDir)) {
  const entries = fs.readdirSync(playwrightCacheDir);
  console.log("Available browsers:", entries);

  // Check for versioned directories
  const versionedDirs = entries.filter((entry) => entry.includes("-"));
  console.log("Versioned directories:", versionedDirs);
} else {
  console.log("❌ Cache directory not found");
}

// Test 3: Test different browser launch methods
async function testBrowserLaunch(browserName, browserType, options = {}) {
  console.log(`\n3️⃣ Testing ${browserName} launch...`);

  try {
    const browser = await browserType.launch({
      headless: false, // Always show browser for debugging
      ...options,
    });

    console.log(`✅ ${browserName} launched successfully!`);

    const page = await browser.newPage();
    await page.goto("https://example.com");
    console.log(`✅ ${browserName} page loaded successfully!`);

    await browser.close();
    return true;
  } catch (error) {
    console.log(`❌ ${browserName} failed:`, error.message);
    return false;
  }
}

// Test 4: Test with different launch options
async function testLaunchOptions() {
  console.log("\n4️⃣ Testing different launch options...");

  const options = [
    { name: "Default", options: {} },
    { name: "Headless", options: { headless: true } },
    { name: "No sandbox", options: { args: ["--no-sandbox"] } },
    { name: "Disable GPU", options: { args: ["--disable-gpu"] } },
    { name: "Disable dev shm", options: { args: ["--disable-dev-shm-usage"] } },
    {
      name: "All flags",
      options: {
        args: [
          "--no-sandbox",
          "--disable-gpu",
          "--disable-dev-shm-usage",
          "--disable-web-security",
        ],
      },
    },
  ];

  for (const option of options) {
    console.log(`\nTesting ${option.name}...`);
    try {
      const browser = await chromium.launch(option.options);
      console.log(`✅ ${option.name} worked!`);
      await browser.close();
    } catch (error) {
      console.log(`❌ ${option.name} failed:`, error.message);
    }
  }
}

// Test 5: Check system browsers
function testSystemBrowsers() {
  console.log("\n5️⃣ Checking system browsers...");

  const systemBrowsers = [
    { name: "google-chrome", command: "google-chrome" },
    { name: "chromium-browser", command: "chromium-browser" },
    { name: "firefox", command: "firefox" },
    { name: "microsoft-edge", command: "microsoft-edge" },
  ];

  for (const browser of systemBrowsers) {
    try {
      execSync(`which ${browser.command}`, { stdio: "ignore" });
      console.log(`✅ ${browser.name} found in system`);
    } catch (error) {
      console.log(`❌ ${browser.name} not found`);
    }
  }
}

// Test 6: Test Playwright codegen (since it works)
async function testCodegen() {
  console.log("\n6️⃣ Testing Playwright codegen...");

  try {
    // Test if codegen command works
    execSync("npx playwright codegen --help", { stdio: "pipe" });
    console.log("✅ Playwright codegen command available");

    // Test codegen with browser
    console.log("Testing codegen with chromium...");
    execSync("npx playwright codegen --browser chromium --help", {
      stdio: "pipe",
    });
    console.log("✅ Codegen with chromium works");
  } catch (error) {
    console.log("❌ Codegen test failed:", error.message);
  }
}

// Test 7: Environment detection
function testEnvironment() {
  console.log("\n7️⃣ Environment detection...");

  console.log("Platform:", os.platform());
  console.log("Architecture:", os.arch());
  console.log("Node version:", process.version);

  // Check if NixOS
  try {
    const osRelease = fs.readFileSync("/etc/os-release", "utf8");
    if (osRelease.includes("ID=nixos")) {
      console.log("✅ NixOS detected");
    } else {
      console.log("❌ Not NixOS");
    }
  } catch (error) {
    console.log("❌ Could not read /etc/os-release");
  }
}

// Test 8: Test Playwright with system browser paths
async function testSystemBrowserPaths() {
  console.log("\n8️⃣ Testing Playwright with system browser paths...");

  const systemPaths = [
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
    "/usr/bin/firefox",
    "/snap/bin/chromium",
    "/snap/bin/firefox",
  ];

  for (const browserPath of systemPaths) {
    if (fs.existsSync(browserPath)) {
      console.log(`\nTesting with system path: ${browserPath}`);
      try {
        const browser = await chromium.launch({
          executablePath: browserPath,
          headless: false,
        });
        console.log(`✅ System browser worked: ${browserPath}`);
        await browser.close();
      } catch (error) {
        console.log(`❌ System browser failed: ${browserPath}`, error.message);
      }
    }
  }
}

// Main test function
async function runTests() {
  try {
    // Run all tests
    testEnvironment();
    testSystemBrowsers();
    await testCodegen();

    // Test browser launches
    await testBrowserLaunch("Chromium", chromium);
    await testBrowserLaunch("Firefox", firefox);
    await testBrowserLaunch("WebKit", webkit);

    // Test launch options
    await testLaunchOptions();

    // Test system browser paths
    await testSystemBrowserPaths();

    console.log("\n🎉 All tests completed!");
    console.log("\n📋 Summary:");
    console.log("- Check which browsers launched successfully");
    console.log("- Check which launch options worked");
    console.log("- Use the working configuration for your tests");
  } catch (error) {
    console.error("❌ Test script failed:", error);
  }
}

// Run the tests
runTests();
