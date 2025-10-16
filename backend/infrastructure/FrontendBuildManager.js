const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

/**
 * FrontendBuildManager - Handles automatic frontend building and file watching
 * 
 * Responsibilities:
 * - Automatic frontend build when dist doesn't exist
 * - File watching for automatic rebuilds
 * - Build state management
 */
class FrontendBuildManager {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.watcher = null;
    this.isBuilding = false;
  }

  /**
   * Initialize frontend building process
   * @param {string} frontendPath - Path to frontend directory
   * @returns {Promise<boolean>} Whether build was successful
   */
  async initializeFrontendBuilding(frontendPath) {
    const frontendDistPath = path.join(frontendPath, "dist");

    if (!fs.existsSync(frontendDistPath)) {
      this.logger.info("🔨 Frontend dist not found, building automatically...");
      return await this.buildFrontend(frontendPath);
    } else {
      this.logger.info("📁 Frontend dist already exists, skipping build");
      // Start watcher even if dist exists
      this.startFileWatcher(frontendPath);
      return true;
    }
  }

  /**
   * Build frontend from source
   * @param {string} frontendPath - Path to frontend directory
   * @returns {Promise<boolean>} Whether build was successful
   */
  async buildFrontend(frontendPath) {
    if (this.isBuilding) {
      this.logger.info("🔨 Build already in progress, skipping...");
      return false;
    }

    this.isBuilding = true;

    try {
      // Check if frontend package.json exists
      if (!fs.existsSync(path.join(frontendPath, "package.json"))) {
        this.logger.warn("⚠️ Frontend package.json not found, skipping auto-build");
        return false;
      }

      this.logger.info("📦 Installing frontend dependencies...");
      execSync("npm install", {
        cwd: frontendPath,
        stdio: "inherit",
        timeout: 120000, // 2 minutes timeout
      });

      this.logger.info("🔨 Building frontend for backend serving...");
      execSync("npm run build", {
        cwd: frontendPath,
        stdio: "inherit",
        timeout: 180000, // 3 minutes timeout
        env: {
          ...process.env,
          VITE_SERVE_FROM_BACKEND: "true", // Tell Vite to use relative URLs
        },
      });

      this.logger.info("✅ Frontend built successfully!");

      // Start file watcher for automatic rebuilds
      this.startFileWatcher(frontendPath);
      return true;

    } catch (error) {
      this.logger.error("❌ Failed to build frontend automatically:", error.message);
      this.logger.info("💡 Please run: cd frontend && npm install && npm run build");
      return false;
    } finally {
      this.isBuilding = false;
    }
  }

  /**
   * Start file watcher for automatic frontend rebuilds
   * @param {string} frontendPath - Path to frontend directory
   */
  startFileWatcher(frontendPath) {
    try {
      const chokidar = require("chokidar");

      this.logger.info("👀 Starting frontend file watcher...");

      // Track build state
      let lastPackageJsonHash = null;
      let isRebuilding = false;

      // Track package.json changes for dependency updates
      const getPackageJsonHash = () => {
        try {
          const packageJsonPath = path.join(frontendPath, "package.json");
          if (fs.existsSync(packageJsonPath)) {
            const content = fs.readFileSync(packageJsonPath, "utf8");
            return require("crypto").createHash("md5").update(content).digest("hex");
          }
        } catch (error) {
          this.logger.warn("Could not hash package.json:", error.message);
        }
        return null;
      };

      lastPackageJsonHash = getPackageJsonHash();

      const watcher = chokidar.watch(
        [
          `${frontendPath}/src/**/*.{js,jsx,ts,tsx,css,scss}`,
          `${frontendPath}/public/**/*`,
          `${frontendPath}/package.json`,
          `${frontendPath}/vite.config.js`,
          `${frontendPath}/tailwind.config.js`,
          `${frontendPath}/postcss.config.js`,
        ],
        {
          ignored: [
            `${frontendPath}/node_modules/**`,
            `${frontendPath}/dist/**`,
            `${frontendPath}/.git/**`,
            `${frontendPath}/coverage/**`,
            `${frontendPath}/tests/**`,
          ],
          persistent: true,
          ignoreInitial: true,
        }
      );

      // Debounced rebuild function with intelligent filtering
      let rebuildTimeout = null;
      let lastRebuildTime = 0;
      const MIN_REBUILD_INTERVAL = 5000; // Minimum 5 seconds between rebuilds
      
      const debouncedRebuild = (reason = "File change") => {
        if (rebuildTimeout) {
          clearTimeout(rebuildTimeout);
        }
        
        rebuildTimeout = setTimeout(async () => {
          const now = Date.now();
          if (now - lastRebuildTime < MIN_REBUILD_INTERVAL) {
            this.logger.info(`⏰ Skipping rebuild - too soon (${Math.round((MIN_REBUILD_INTERVAL - (now - lastRebuildTime)) / 1000)}s remaining)`);
            return;
          }
          
          if (isRebuilding) {
            this.logger.info("🔨 Rebuild already in progress, skipping...");
            return;
          }

          isRebuilding = true;
          lastRebuildTime = now;
          this.logger.info(`🔄 Frontend files changed (${reason}), rebuilding...`);

          try {
            await this.buildFrontend(frontendPath, reason);
            this.logger.info("✅ Frontend rebuild completed!");
          } catch (error) {
            this.logger.error("❌ Frontend rebuild failed:", error.message);
          } finally {
            isRebuilding = false;
          }
        }, 2000); // 2 second debounce
      };

      watcher.on("change", (filePath) => {
        const relativePath = path.relative(frontendPath, filePath);
        this.logger.info(`📝 File changed: ${relativePath}`);
        
        let reason = "File change";
        if (filePath.includes("package.json")) {
          reason = "Dependencies changed";
        } else if (filePath.includes("vite.config") || filePath.includes("tailwind.config") || filePath.includes("postcss.config")) {
          reason = "Config changed";
        } else if (filePath.includes("public/")) {
          reason = "Public assets changed";
        } else if (filePath.includes("/src/")) {
          reason = "Source code changed";
        }
        
        debouncedRebuild(reason);
      });

      watcher.on("add", (filePath) => {
        const relativePath = path.relative(frontendPath, filePath);
        this.logger.info(`➕ File added: ${relativePath}`);
        
        let reason = "New file added";
        if (filePath.includes("/src/")) {
          reason = "New source file added";
        } else if (filePath.includes("public/")) {
          reason = "New public asset added";
        }
        
        debouncedRebuild(reason);
      });

      watcher.on("unlink", (filePath) => {
        const relativePath = path.relative(frontendPath, filePath);
        this.logger.info(`🗑️ File removed: ${relativePath}`);
        
        let reason = "File removed";
        if (filePath.includes("/src/")) {
          reason = "Source file removed";
        } else if (filePath.includes("public/")) {
          reason = "Public asset removed";
        }
        
        debouncedRebuild(reason);
      });


      this.watcher = watcher;
      this.logger.info("✅ Frontend file watcher started successfully!");

    } catch (error) {
      this.logger.error("❌ Failed to start frontend file watcher:", error.message);
    }
  }

  /**
   * Stop the file watcher
   */
  stopFileWatcher() {
    if (this.watcher) {
      this.logger.info("🛑 Stopping frontend file watcher...");
      this.watcher.close();
      this.watcher = null;
      this.logger.info("✅ Frontend file watcher stopped");
    }
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.stopFileWatcher();
  }
}

module.exports = FrontendBuildManager;
