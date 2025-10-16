/**
 * RouteRegistry - Centralized Express route registration and management
 * Provides automatic route discovery and middleware integration
 */
const express = require("express");
const { getServiceContainer } = require("../../infrastructure/dependency-injection/ServiceContainer");
const ServiceLogger = require("@logging/ServiceLogger");
const path = require("path");
const fs = require("fs").promises;

class RouteRegistry {
  constructor(options = {}) {
    this.container = getServiceContainer();
    this.logger = options.logger || new ServiceLogger("RouteRegistry");
    this.registeredRoutes = new Map();
    this.routeMiddleware = new Map();
    this.controllerRegistry = options.controllerRegistry || null;
    
    // Configuration
    this.enableAutoDiscovery = options.enableAutoDiscovery !== false;
    this.scanDirectories = options.scanDirectories || [
      path.join(process.cwd(), "presentation", "analysis", "routes"),
      path.join(process.cwd(), "presentation", "ide-integration", "routes"),
      path.join(process.cwd(), "presentation", "project-management", "routes"),
      path.join(process.cwd(), "presentation", "system", "routes"),
      path.join(process.cwd(), "presentation", "task-management", "routes"),
      path.join(process.cwd(), "presentation", "tools", "routes"),
      path.join(process.cwd(), "presentation", "routes"),
    ];
    this.excludePatterns = options.excludePatterns || [
      "**/*.test.js",
      "**/*.spec.js",
      "**/node_modules/**",
      "**/coverage/**",
    ];
    
    this.metrics = {
      totalRoutes: 0,
      registeredRoutes: 0,
      failedRegistrations: 0,
      autoDiscoveredRoutes: 0,
    };
  }

  /**
   * Register a route module with the registry
   * @param {string} routeName - Name of the route module
   * @param {Object} routeModule - Route module (should export getRouter function)
   * @param {Object} options - Registration options
   */
  registerRoute(routeName, routeModule, options = {}) {
    try {
      // If routeModule is a class, instantiate it with dependencies
      let routeInstance;
      if (typeof routeModule === 'function' && routeModule.prototype) {
        // It's a class, try to instantiate it
        try {
          // Try to get dependencies from service container
          const dependencies = this.getRouteDependencies(routeName);
          routeInstance = new routeModule(...dependencies);
        } catch (error) {
          // If instantiation fails, try without dependencies
          routeInstance = new routeModule();
        }
      } else {
        // It's already an instance or object
        routeInstance = routeModule;
      }

      const routeConfig = {
        name: routeName,
        module: routeInstance,
        path: options.path || `/${routeName.toLowerCase()}`,
        middleware: options.middleware || [],
        dependencies: options.dependencies || [],
        priority: options.priority || 0,
        registeredAt: Date.now(),
      };

      this.registeredRoutes.set(routeName, routeConfig);
      this.metrics.registeredRoutes++;
      
      this.logger.debug(`✅ Registered route: ${routeName} at ${routeConfig.path}`);
      if (routeName === "AuthRoutes") {
        this.logger.info(`🔍 [RouteRegistry] AuthRoutes registered successfully at ${routeConfig.path}`);
        this.logger.info(`🔍 [RouteRegistry] AuthRoutes module: ${routeInstance ? 'EXISTS' : 'NULL'}`);
        this.logger.info(`🔍 [RouteRegistry] AuthRoutes getRouter: ${routeInstance.getRouter ? 'EXISTS' : 'NULL'}`);
      }
      return this;
    } catch (error) {
      this.logger.error(`❌ Failed to register route '${routeName}': ${error.message}`);
      this.metrics.failedRegistrations++;
      throw error;
    }
  }

  /**
   * Get dependencies for route instantiation
   * @param {string} routeName - Route name
   * @returns {Array} Dependencies array
   */
  getRouteDependencies(routeName) {
    const dependencies = [];
    
    try {
      // Get dependencies based on route name
      if (routeName === "AuthRoutes") {
        // Use the injected controllerRegistry if available, otherwise create one
        let controllerRegistry = this.controllerRegistry;
        if (!controllerRegistry) {
          const ControllerRegistry = require("./ControllerRegistry");
          controllerRegistry = new ControllerRegistry({ logger: this.logger });
          // Register core controllers
          controllerRegistry.registerCoreControllers();
        }
        
        const authController = controllerRegistry.getController("AuthController");
        const authMiddleware = this.container.resolve("authMiddleware");
        dependencies.push(authController, authMiddleware);
      }
      
      this.logger.debug(`Instantiating ${routeName} with ${dependencies.length} dependencies`);
      if (routeName === "AuthRoutes") {
        this.logger.info(`🔍 [RouteRegistry] AuthRoutes dependencies: ${dependencies.length}`);
        this.logger.info(`🔍 [RouteRegistry] authController: ${dependencies[0] ? 'EXISTS' : 'NULL'}`);
        this.logger.info(`🔍 [RouteRegistry] authMiddleware: ${dependencies[1] ? 'EXISTS' : 'NULL'}`);
      }
    } catch (error) {
      this.logger.debug(`Could not get dependencies for ${routeName}: ${error.message}`);
    }
    
    return dependencies;
  }

  /**
   * Register middleware for a route
   * @param {string} routeName - Name of the route
   * @param {Array} middleware - Middleware functions
   */
  registerRouteMiddleware(routeName, middleware) {
    this.routeMiddleware.set(routeName, middleware);
    this.logger.debug(`✅ Registered middleware for route: ${routeName}`);
    return this;
  }

  /**
   * Get a registered route module
   * @param {string} routeName - Name of the route
   * @returns {Object} Route module
   */
  getRoute(routeName) {
    const routeConfig = this.registeredRoutes.get(routeName);
    if (!routeConfig) {
      throw new Error(`Route '${routeName}' not found`);
    }
    return routeConfig;
  }

  /**
   * Get middleware for a route
   * @param {string} routeName - Name of the route
   * @returns {Array} Middleware functions
   */
  getRouteMiddleware(routeName) {
    return this.routeMiddleware.get(routeName) || [];
  }

  /**
   * Auto-discover and register route modules
   * @param {Array} directories - Optional specific directories to scan
   * @returns {Promise<Object>} Discovery results
   */
  async discoverRoutes(directories = null) {
    if (!this.enableAutoDiscovery) {
      throw new Error("Auto-discovery is disabled. Enable it first with setAutoDiscovery(true)");
    }

    const scanDirs = directories || this.scanDirectories;
    const discoveredRoutes = [];
    const errors = [];

    this.logger.info(`🔍 Scanning ${scanDirs.length} directories for routes...`);

    for (const dir of scanDirs) {
      try {
        const files = await fs.readdir(dir, { withFileTypes: true, recursive: true });
        
        for (const file of files) {
          if (file.isFile() && file.name.endsWith("Routes.js") && !file.name.includes("Registry")) {
            const routePath = path.join(dir, file.name);
            const routeName = path.basename(file.name, ".js");
            
            try {
              // Dynamically import the route module
              const RouteModule = require(routePath);
              let routeModule;

              // Handle different export patterns
              if (RouteModule && typeof RouteModule.getRouter === "function") {
                routeModule = RouteModule;
              } else if (RouteModule && RouteModule.default && typeof RouteModule.default.getRouter === "function") {
                routeModule = RouteModule.default;
              } else if (RouteModule && RouteModule[routeName] && typeof RouteModule[routeName].getRouter === "function") {
                routeModule = RouteModule[routeName];
              } else {
                this.logger.warn(`Skipping '${routeName}': No getRouter function found`);
                continue;
              }

              // Auto-register the route
              this.registerRoute(routeName, routeModule, {
                path: this.generateRoutePath(routeName),
                autoDiscovered: true,
              });

              discoveredRoutes.push(routeName);
              this.metrics.autoDiscoveredRoutes++;
              this.logger.debug(`🔍 Auto-discovered route: ${routeName}`);
            } catch (routeError) {
              this.logger.error(`Error processing route '${routePath}': ${routeError.message}`);
              errors.push({ file: routePath, error: routeError.message });
            }
          }
        }
      } catch (dirError) {
        this.logger.warn(`Could not read directory '${dir}': ${dirError.message}`);
        errors.push({ directory: dir, error: dirError.message });
      }
    }

    this.logger.info(`📊 Route Discovery Results:`);
    this.logger.info(`   Routes Discovered: ${discoveredRoutes.length}`);
    this.logger.info(`   Errors: ${errors.length}`);
    
    if (errors.length > 0) {
      this.logger.warn(`⚠️  Discovery Errors:`);
      errors.forEach((error, index) => {
        this.logger.warn(`   ${index + 1}. ${error.file || error.directory}: ${error.error}`);
      });
    }

    return { routes: discoveredRoutes, errors };
  }

  /**
   * Generate route path from route name
   * @param {string} routeName - Name of the route
   * @returns {string} Generated path
   */
  generateRoutePath(routeName) {
    // Convert PascalCase to kebab-case
    const kebabCase = routeName
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase()
      .replace(/^-/, '');
    
    // Handle special cases
    const pathMappings = {
      'main-routes': '/',
      'health-routes': '/api/health',
      'auth-routes': '/api/auth',
      'session-routes': '/api/session',
      'project-routes': '/api/project',
      'analysis-routes': '/api/analysis',
      'service-health-routes': '/api/health',
      'service-metrics-routes': '/api/metrics',
    };

    return pathMappings[kebabCase] || `/api/${kebabCase}`;
  }

  /**
   * Register all routes (manual + auto-discovered)
   */
  async registerAllRoutes() {
    this.logger.info("🔧 Registering all routes...");

    const registrationStats = {
      total: 0,
      successful: 0,
      failed: 0,
      errors: []
    };

    try {
      // Register core routes manually
      await this.registerCoreRoutes();

      // Log registration statistics
      this.logger.info(`📊 Route Registration Summary:`);
      this.logger.info(`   Total Routes: ${this.registeredRoutes.size}`);
      this.logger.info(`   Auto-Discovered: ${this.metrics.autoDiscoveredRoutes}`);
      this.logger.info(`   Manual Registrations: ${this.metrics.registeredRoutes - this.metrics.autoDiscoveredRoutes}`);
      this.logger.info(`   Failed Registrations: ${this.metrics.failedRegistrations}`);

      this.logger.info("✅ All routes registered successfully");
    } catch (error) {
      this.logger.error("❌ Failed to register routes:", error.message);
      throw new Error(`Route registration failed: ${error.message}`);
    } finally {
      this._isRegistering = false;
    }
  }

  /**
   * Register core routes manually
   */
  async registerCoreRoutes() {
    this.logger.info("🔍 [RouteRegistry] Starting registerCoreRoutes...");
    
    // Main Routes
    try {
      const MainRoutes = require("../routes/mainRoutes");
      this.registerRoute("MainRoutes", MainRoutes, {
        path: "/",
        priority: 1,
      });
    } catch (error) {
      this.logger.warn(`Failed to register MainRoutes: ${error.message}`);
    }

    // Health Routes
    try {
      const HealthRoutes = require("../routes/healthRoutes");
      this.registerRoute("HealthRoutes", HealthRoutes, {
        path: "/api/health",
        priority: 2,
      });
    } catch (error) {
      this.logger.warn(`Failed to register HealthRoutes: ${error.message}`);
    }

    // Service Health Routes
    try {
      const ServiceHealthRoutes = require("../system/routes/ServiceHealthRoutes");
      this.registerRoute("ServiceHealthRoutes", ServiceHealthRoutes, {
        path: "/api/service-health",
        priority: 3,
      });
    } catch (error) {
      this.logger.warn(`Failed to register ServiceHealthRoutes: ${error.message}`);
    }

    // Service Metrics Routes
    try {
      const ServiceMetricsRoutes = require("../system/routes/ServiceMetricsRoutes");
      this.registerRoute("ServiceMetricsRoutes", ServiceMetricsRoutes, {
        path: "/api/service-metrics",
        priority: 4,
      });
    } catch (error) {
      this.logger.warn(`Failed to register ServiceMetricsRoutes: ${error.message}`);
    }

    // Auth Routes
    try {
      const AuthRoutes = require("../system/routes/authRoutes");
      this.registerRoute("AuthRoutes", AuthRoutes, {
        path: "/api/auth",
        priority: 3,
      });
    } catch (error) {
      this.logger.warn(`Failed to register AuthRoutes: ${error.message}`);
    }
  }

  /**
   * Apply all registered routes to an Express app
   * @param {Object} app - Express application instance
   */
  applyRoutes(app) {
    this.logger.info("🔗 Applying routes to Express app...");

    // Sort routes by priority
    const sortedRoutes = Array.from(this.registeredRoutes.values())
      .sort((a, b) => a.priority - b.priority);

    let appliedCount = 0;
    let failedCount = 0;

    for (const routeConfig of sortedRoutes) {
      try {
        const { name, module, path, middleware } = routeConfig;
        
        // Get router from module
        const router = module.getRouter();
        if (!router) {
          this.logger.warn(`Route '${name}' has no getRouter method`);
          failedCount++;
          continue;
        }

        // Apply middleware if any
        if (middleware.length > 0) {
          app.use(path, ...middleware, router);
        } else {
          app.use(path, router);
        }

        appliedCount++;
        this.logger.debug(`✅ Applied route: ${name} at ${path}`);
        if (name === "AuthRoutes") {
          this.logger.info(`🔍 [RouteRegistry] AuthRoutes applied to Express at ${path}`);
          this.logger.info(`🔍 [RouteRegistry] AuthRoutes router: ${router ? 'EXISTS' : 'NULL'}`);
        }
      } catch (error) {
        this.logger.error(`❌ Failed to apply route '${routeConfig.name}': ${error.message}`);
        failedCount++;
      }
    }

    this.logger.info(`📊 Route Application Results:`);
    this.logger.info(`   Routes Applied: ${appliedCount}`);
    this.logger.info(`   Routes Failed: ${failedCount}`);
  }

  /**
   * Get all registered route names
   * @returns {Array} Array of route names
   */
  getRegisteredRoutes() {
    return Array.from(this.registeredRoutes.keys());
  }

  /**
   * Get route registration metrics
   * @returns {Object} Registration metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      totalRegistered: this.registeredRoutes.size,
      totalMiddleware: this.routeMiddleware.size,
    };
  }

  /**
   * Enable/disable auto-discovery
   * @param {boolean} enabled - Whether to enable auto-discovery
   */
  setAutoDiscovery(enabled) {
    this.enableAutoDiscovery = enabled;
    this.logger.info(`Route auto-discovery ${enabled ? 'enabled' : 'disabled'}`);
  }
}

module.exports = RouteRegistry;
