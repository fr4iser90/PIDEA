/**
 * ControllerRegistry - Centralized HTTP controller registration and management
 * Provides automatic controller discovery and dependency injection
 */
const { getServiceContainer } = require("../../infrastructure/dependency-injection/ServiceContainer");
const ServiceLogger = require("@logging/ServiceLogger");
const path = require("path");
const fs = require("fs").promises;

class ControllerRegistry {
  constructor(options = {}) {
    this.container = getServiceContainer();
    this.logger = options.logger || new ServiceLogger("ControllerRegistry");
    this.registeredControllers = new Map();
    this.controllerRoutes = new Map();
    
    // Configuration
    this.enableAutoDiscovery = options.enableAutoDiscovery !== false;
    this.scanDirectories = options.scanDirectories || [
      path.join(process.cwd(), "presentation", "analysis", "controllers"),
      path.join(process.cwd(), "presentation", "ide-integration", "controllers"),
      path.join(process.cwd(), "presentation", "project-management", "controllers"),
      path.join(process.cwd(), "presentation", "system", "controllers"),
      path.join(process.cwd(), "presentation", "task-management", "controllers"),
      path.join(process.cwd(), "presentation", "tools", "controllers"),
    ];
    this.excludePatterns = options.excludePatterns || [
      "**/*.test.js",
      "**/*.spec.js",
      "**/node_modules/**",
      "**/coverage/**",
    ];
    
    this.metrics = {
      totalControllers: 0,
      registeredControllers: 0,
      failedRegistrations: 0,
      autoDiscoveredControllers: 0,
    };
  }

  /**
   * Register a controller with the registry
   * @param {string} controllerName - Name of the controller
   * @param {Function} ControllerClass - Controller class constructor
   * @param {Object} options - Registration options
   */
  registerController(controllerName, ControllerClass, options = {}) {
    try {
      const controllerConfig = {
        name: controllerName,
        class: ControllerClass,
        dependencies: options.dependencies || [],
        routes: options.routes || [],
        middleware: options.middleware || [],
        singleton: options.singleton !== false,
        registeredAt: Date.now(),
      };

      this.registeredControllers.set(controllerName, controllerConfig);
      this.metrics.registeredControllers++;
      
      this.logger.debug(`✅ Registered controller: ${controllerName}`);
      return this;
    } catch (error) {
      this.logger.error(`❌ Failed to register controller '${controllerName}': ${error.message}`);
      this.metrics.failedRegistrations++;
      throw error;
    }
  }

  /**
   * Register controller routes
   * @param {string} controllerName - Name of the controller
   * @param {Array} routes - Route definitions
   */
  registerControllerRoutes(controllerName, routes) {
    this.controllerRoutes.set(controllerName, routes);
    this.logger.debug(`✅ Registered routes for controller: ${controllerName}`);
    return this;
  }

  /**
   * Get a registered controller instance
   * @param {string} controllerName - Name of the controller
   * @returns {Object} Controller instance
   */
  getController(controllerName) {
    const controllerConfig = this.registeredControllers.get(controllerName);
    if (!controllerConfig) {
      throw new Error(`Controller '${controllerName}' not found`);
    }

    try {
      // Resolve dependencies
      const dependencies = controllerConfig.dependencies.map(dep => {
        try {
          return this.container.resolve(dep);
        } catch (error) {
          this.logger.error(`❌ Failed to resolve dependency '${dep}' for controller '${controllerName}': ${error.message}`);
          throw error;
        }
      });

      // Create controller instance
      const controllerInstance = new controllerConfig.class(...dependencies);
      this.logger.debug(`✅ Resolved controller: ${controllerName}`);
      return controllerInstance;
    } catch (error) {
      this.logger.error(`❌ Failed to resolve controller '${controllerName}': ${error.message}`);
      throw error;
    }
  }

  /**
   * Get routes for a controller
   * @param {string} controllerName - Name of the controller
   * @returns {Array} Route definitions
   */
  getControllerRoutes(controllerName) {
    return this.controllerRoutes.get(controllerName) || [];
  }

  /**
   * Auto-discover and register controllers
   * @param {Array} directories - Optional specific directories to scan
   * @returns {Promise<Object>} Discovery results
   */
  async discoverControllers(directories = null) {
    if (!this.enableAutoDiscovery) {
      throw new Error("Auto-discovery is disabled. Enable it first with setAutoDiscovery(true)");
    }

    const scanDirs = directories || this.scanDirectories;
    const discoveredControllers = [];
    const errors = [];

    this.logger.info(`🔍 Scanning ${scanDirs.length} directories for controllers...`);

    for (const dir of scanDirs) {
      try {
        const files = await fs.readdir(dir, { withFileTypes: true, recursive: true });
        
        for (const file of files) {
          if (file.isFile() && file.name.endsWith("Controller.js") && !file.name.includes("Registry")) {
            const controllerPath = path.join(dir, file.name);
            const controllerName = path.basename(file.name, ".js");
            
            try {
              // Dynamically import the controller
              const ControllerModule = require(controllerPath);
              let ControllerClass;

              // Handle different export patterns
              if (typeof ControllerModule === "function") {
                ControllerClass = ControllerModule;
              } else if (ControllerModule && typeof ControllerModule.default === "function") {
                ControllerClass = ControllerModule.default;
              } else if (ControllerModule && ControllerModule[controllerName]) {
                ControllerClass = ControllerModule[controllerName];
              } else {
                this.logger.warn(`Skipping '${controllerName}': No recognizable controller class found`);
                continue;
              }

              // Auto-register the controller
              this.registerController(controllerName, ControllerClass, {
                singleton: true,
                autoDiscovered: true,
              });

              discoveredControllers.push(controllerName);
              this.metrics.autoDiscoveredControllers++;
              this.logger.debug(`🔍 Auto-discovered controller: ${controllerName}`);
            } catch (controllerError) {
              this.logger.error(`Error processing controller '${controllerPath}': ${controllerError.message}`);
              errors.push({ file: controllerPath, error: controllerError.message });
            }
          }
        }
      } catch (dirError) {
        this.logger.warn(`Could not read directory '${dir}': ${dirError.message}`);
        errors.push({ directory: dir, error: dirError.message });
      }
    }

    this.logger.info(`📊 Controller Discovery Results:`);
    this.logger.info(`   Controllers Discovered: ${discoveredControllers.length}`);
    this.logger.info(`   Errors: ${errors.length}`);
    
    if (errors.length > 0) {
      this.logger.warn(`⚠️  Discovery Errors:`);
      errors.forEach((error, index) => {
        this.logger.warn(`   ${index + 1}. ${error.file || error.directory}: ${error.error}`);
      });
    }

    return { controllers: discoveredControllers, errors };
  }

  /**
   * Register all controllers (manual + auto-discovered)
   */
  async registerAllControllers() {
    this.logger.info("🔧 Registering all controllers...");

    const registrationStats = {
      total: 0,
      successful: 0,
      failed: 0,
      errors: []
    };

    try {
      // Register core controllers manually
      await this.registerCoreControllers();

      // Log registration statistics
      this.logger.info(`📊 Controller Registration Summary:`);
      this.logger.info(`   Total Controllers: ${this.registeredControllers.size}`);
      this.logger.info(`   Auto-Discovered: ${this.metrics.autoDiscoveredControllers}`);
      this.logger.info(`   Manual Registrations: ${this.metrics.registeredControllers - this.metrics.autoDiscoveredControllers}`);
      this.logger.info(`   Failed Registrations: ${this.metrics.failedRegistrations}`);

      this.logger.info("✅ All controllers registered successfully");
    } catch (error) {
      this.logger.error("❌ Failed to register controllers:", error.message);
      throw new Error(`Controller registration failed: ${error.message}`);
    }
  }

  /**
   * Register core controllers manually
   */
  async registerCoreControllers() {
    // Service Health Controller
    try {
      const ServiceHealthController = require("../system/controllers/ServiceHealthController");
      this.registerController("ServiceHealthController", ServiceHealthController, {
        dependencies: ["serviceContainer"],
        singleton: true,
      });
    } catch (error) {
      this.logger.warn(`Failed to register ServiceHealthController: ${error.message}`);
    }

    // Service Metrics Controller
    try {
      const ServiceMetricsController = require("../system/controllers/ServiceMetricsController");
      this.registerController("ServiceMetricsController", ServiceMetricsController, {
        dependencies: ["serviceContainer"],
        singleton: true,
      });
    } catch (error) {
      this.logger.warn(`Failed to register ServiceMetricsController: ${error.message}`);
    }

    // Auth Controller
    try {
      const AuthController = require("../system/controllers/AuthController");
      this.registerController("AuthController", AuthController, {
        dependencies: ["authApplicationService"],
        singleton: true,
      });
    } catch (error) {
      this.logger.warn(`Failed to register AuthController: ${error.message}`);
    }
  }

  /**
   * Get all registered controller names
   * @returns {Array} Array of controller names
   */
  getRegisteredControllers() {
    return Array.from(this.registeredControllers.keys());
  }

  /**
   * Get controller registration metrics
   * @returns {Object} Registration metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      totalRegistered: this.registeredControllers.size,
      totalRoutes: this.controllerRoutes.size,
    };
  }

  /**
   * Enable/disable auto-discovery
   * @param {boolean} enabled - Whether to enable auto-discovery
   */
  setAutoDiscovery(enabled) {
    this.enableAutoDiscovery = enabled;
    this.logger.info(`Controller auto-discovery ${enabled ? 'enabled' : 'disabled'}`);
  }
}

module.exports = ControllerRegistry;
