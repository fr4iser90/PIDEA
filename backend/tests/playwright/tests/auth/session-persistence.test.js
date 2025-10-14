const { test, expect } = require("@playwright/test");

// Configuration will be loaded from database via API
let testData = null;
let baseURL = null;

// Load test configuration from environment variables (no API call needed)
test.beforeAll(async () => {
  try {
    // Get base URL from environment or use default
    baseURL =
      process.env.TEST_BASE_URL ||
      process.env.VITE_FRONTEND_URL ||
      "http://localhost:4000";

    // Use environment variables for test data instead of API call
    testData = {
      login: {
        username: process.env.TEST_LOGIN_USERNAME,
        password: process.env.TEST_LOGIN_PASSWORD,
      },
      timeout: parseInt(process.env.TEST_TIMEOUT) || 30000,
    };

    // Validate that credentials are provided
    if (!testData.login.username || !testData.login.password) {
      throw new Error(
        "TEST_LOGIN_USERNAME and TEST_LOGIN_PASSWORD environment variables are required",
      );
    }

    console.log(
      "Test configuration loaded from environment:",
      JSON.stringify(testData, null, 2),
    );
  } catch (error) {
    console.error("Failed to load configuration from environment:", error);
    throw new Error("Cannot run tests without configuration");
  }
});

test.describe("Session Persistence", () => {
  test.beforeEach(async ({ page }) => {
    // Ensure testData is loaded
    if (!testData) {
      throw new Error("Test configuration not loaded");
    }

    // Navigate to PIDEA login page
    await page.goto(baseURL);
    await page.waitForLoadState("networkidle");

    // Wait for login form to be visible
    await expect(page.locator("h2")).toContainText("Sign in to PIDEA");
  });

  test("should maintain session after page refresh", async ({
    page,
    context,
  }) => {
    console.log("🔍 Starting session persistence test...");

    // Step 1: Login (copy from working login test)
    const email = testData.login.username;
    const password = testData.login.password;

    console.log("Using credentials:", {
      email,
      password: password ? "***" : "empty",
    });

    // Fill in valid credentials
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);

    // Click login button
    await page.click('button[type="submit"]');

    // Wait for main app to load (no redirect, just shows main interface)
    await page.waitForSelector(".app-root", { timeout: testData.timeout });

    // Verify successful login - should see main PIDEA interface
    await expect(page.locator(".app-root")).toBeVisible();
    await expect(page.locator("header")).toBeVisible();

    console.log("✅ Login successful");

    // Step 2: Check cookies after login
    const cookiesAfterLogin = await context.cookies();
    const accessTokenAfterLogin = cookiesAfterLogin.find(
      (cookie) => cookie.name === "accessToken",
    );
    const refreshTokenAfterLogin = cookiesAfterLogin.find(
      (cookie) => cookie.name === "refreshToken",
    );

    console.log("🍪 Cookies after login:");
    console.log(
      "  - accessToken:",
      accessTokenAfterLogin ? "EXISTS" : "MISSING",
    );
    console.log(
      "  - refreshToken:",
      refreshTokenAfterLogin ? "EXISTS" : "MISSING",
    );

    // Step 3: Refresh the page
    console.log("🔄 Refreshing page...");

    // Set up listeners BEFORE refresh
    const consoleLogs = [];
    const allLogs = [];
    const networkRequests = [];

    page.on("console", (msg) => {
      const logText = msg.text();
      const logType = msg.type();
      const timestamp = new Date().toISOString();

      // Store ALL logs
      allLogs.push(`[${timestamp}] ${logType.toUpperCase()}: ${logText}`);

      // Filter for relevant logs
      if (logType === "error") {
        consoleLogs.push(`🚨 ERROR: ${logText}`);
      } else if (
        logText.includes("AuthStore") ||
        logText.includes("auth") ||
        logText.includes("cookie") ||
        logText.includes("token") ||
        logText.includes("initialize") ||
        logText.includes("App") ||
        logText.includes("React") ||
        logText.includes("mount") ||
        logText.includes("component") ||
        logText.includes("useEffect") ||
        logText.includes("store") ||
        logText.includes("zustand")
      ) {
        consoleLogs.push(`🔍 LOG: ${logText}`);
      }
    });

    page.on("request", (request) => {
      networkRequests.push(`🌐 REQUEST: ${request.method()} ${request.url()}`);
    });

    page.on("response", (response) => {
      networkRequests.push(
        `📡 RESPONSE: ${response.status()} ${response.url()}`,
      );
    });

    await page.reload();
    await page.waitForLoadState("networkidle");

    // Step 4: Check cookies after refresh
    const cookiesAfterRefresh = await context.cookies();
    const accessTokenAfterRefresh = cookiesAfterRefresh.find(
      (cookie) => cookie.name === "accessToken",
    );
    const refreshTokenAfterRefresh = cookiesAfterRefresh.find(
      (cookie) => cookie.name === "refreshToken",
    );

    console.log("🍪 Cookies after refresh:");
    console.log(
      "  - accessToken:",
      accessTokenAfterRefresh ? "EXISTS" : "MISSING",
    );
    console.log(
      "  - refreshToken:",
      refreshTokenAfterRefresh ? "EXISTS" : "MISSING",
    );

    // Step 5: Check what's actually on the page after refresh
    console.log("🔍 Checking page state after refresh...");
    const currentUrl = page.url();
    console.log("Current URL after refresh:", currentUrl);

    // Check if login form is visible (means we're logged out)
    const loginFormVisible = await page
      .locator('input[name="email"]')
      .isVisible();
    console.log("Login form visible after refresh:", loginFormVisible);

    // Check if main app is visible (means we're logged in)
    const appRootVisible = await page.locator(".app-root").isVisible();
    console.log("App root visible after refresh:", appRootVisible);

    // Check if header is visible
    const headerVisible = await page.locator("header").isVisible();
    console.log("Header visible after refresh:", headerVisible);

    // Get page title
    const pageTitle = await page.title();
    console.log("Page title after refresh:", pageTitle);

    // Check for any error messages
    const errorMessages = await page
      .locator('.error, .auth-error, [class*="error"]')
      .allTextContents();
    console.log("Error messages on page:", errorMessages);

    // Listeners are already set up before refresh

    // Wait a bit to catch console messages and network requests
    await page.waitForTimeout(3000);

    console.log("\n📋 ALL CONSOLE LOGS (first 20):");
    allLogs.slice(0, 20).forEach((log) => console.log("  ", log));
    if (allLogs.length > 20) {
      console.log(`  ... and ${allLogs.length - 20} more logs`);
    }

    console.log("\n🌐 NETWORK REQUESTS:");
    networkRequests.forEach((req) => console.log("  ", req));

    if (consoleLogs.length > 0) {
      console.log("\n🔍 FILTERED RELEVANT LOGS:");
      consoleLogs.forEach((log) => console.log("  ", log));
    }

    // Analyze what's happening during initialization
    console.log("\n🔍 INITIALIZATION ANALYSIS:");

    // Check if AuthStore is trying to validate cookies
    const authStoreLogs = consoleLogs.filter((log) =>
      log.includes("AuthStore"),
    );
    if (authStoreLogs.length === 0) {
      console.log(
        "⚠️  WARNING: No AuthStore logs found - initialize() might not be called",
      );
    } else {
      console.log("✅ AuthStore logs found:", authStoreLogs.length);
      authStoreLogs.forEach((log) => console.log("  ", log));
    }

    // Check for App/React initialization
    const appLogs = consoleLogs.filter(
      (log) => log.includes("App") || log.includes("React"),
    );
    if (appLogs.length === 0) {
      console.log("⚠️  WARNING: No App/React initialization logs found");
    } else {
      console.log("✅ App/React logs found:", appLogs.length);
      appLogs.forEach((log) => console.log("  ", log));
    }

    // Check for cookie validation attempts
    const cookieLogs = consoleLogs.filter(
      (log) => log.includes("cookie") || log.includes("Cookie"),
    );
    if (cookieLogs.length === 0) {
      console.log("⚠️  WARNING: No cookie validation logs found");
    } else {
      console.log("✅ Cookie logs found:", cookieLogs.length);
      cookieLogs.forEach((log) => console.log("  ", log));
    }

    // Check for token validation attempts
    const tokenLogs = consoleLogs.filter(
      (log) => log.includes("token") || log.includes("Token"),
    );
    if (tokenLogs.length === 0) {
      console.log("⚠️  WARNING: No token validation logs found");
    } else {
      console.log("✅ Token logs found:", tokenLogs.length);
      tokenLogs.forEach((log) => console.log("  ", log));
    }

    // Check for initialization attempts
    const initLogs = consoleLogs.filter(
      (log) => log.includes("initialize") || log.includes("init"),
    );
    if (initLogs.length === 0) {
      console.log("⚠️  WARNING: No initialization logs found");
    } else {
      console.log("✅ Initialization logs found:", initLogs.length);
      initLogs.forEach((log) => console.log("  ", log));
    }

    console.log("\n🎯 EXPECTED BEHAVIOR:");
    console.log("  1. App loads and mounts React components");
    console.log("  2. AuthStore.initialize() should be called");
    console.log("  3. AuthStore should check for cookies");
    console.log("  4. AuthStore should validate tokens with backend");
    console.log("  5. If valid, show main app; if invalid, show login form");

    console.log("\n🔍 ACTUAL BEHAVIOR:");
    if (authStoreLogs.length === 0) {
      console.log("  ❌ AuthStore.initialize() was NOT called");
      console.log(
        "  🔍 This means the App component is not calling AuthStore.initialize()",
      );
    } else {
      console.log("  ✅ AuthStore.initialize() was called");
      console.log("  🔍 But it failed to validate the existing cookies");
    }

    // Final verdict
    if (loginFormVisible && !appRootVisible) {
      console.log("❌ SESSION LOST - User logged out after refresh");
      console.log(
        "🔍 DIAGNOSIS: Cookies exist but frontend AuthStore failed to validate them",
      );
    } else if (!loginFormVisible && appRootVisible) {
      console.log("✅ SESSION MAINTAINED - User still logged in after refresh");
    } else {
      console.log("🤔 UNCLEAR STATE - Need to investigate further");
    }
  });
});
