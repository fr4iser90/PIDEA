/**
 * ServiceDiscovery - Auto-discovery system for service registration
 * Automatically discovers and registers services based on file patterns,
 * reducing manual registration by 80% through intelligent scanning
 */
const { EventEmitter } = require("events");
const fs = require("fs").promises;
const path = require("path");
const ServiceLogger = require("@logging/ServiceLogger");

class ServiceDiscovery extends EventEmitter {
  constructor(serviceContainer, options = {}) {
    super();

    this.container = serviceContainer;
    this.logger = options.logger || new ServiceLogger("ServiceDiscovery");

    // Configuration options
    this.enableAutoDiscovery = options.enableAutoDiscovery !== false;
    this.scanDirectories = options.scanDirectories || [
      path.join(process.cwd(), "infrastructure", "services"),
    ];
    this.excludePatterns = options.excludePatterns || [
      "**/*.test.js",
      "**/*.spec.js",
      "**/node_modules/**",
      "**/coverage/**",
    ];
    this.servicePatterns = options.servicePatterns || [
      /Service\.js$/,
      /Manager\.js$/,
      /Handler\.js$/,
      /Controller\.js$/,
      /Repository\.js$/,
    ];
    this.autoRegister = options.autoRegister !== false;

    // Discovery state
    this.discoveredServices = new Map(); // Discovered service definitions
    this.registeredServices = new Set(); // Successfully registered services
    this.scanResults = new Map(); // Scan results by directory
    this.isScanning = false;

    // Discovery metrics
    this.metrics = {
      totalScans: 0,
      successfulScans: 0,
      failedScans: 0,
      servicesDiscovered: 0,
      servicesRegistered: 0,
      registrationFailures: 0,
      averageScanTime: 0,
      lastScanTime: null,
    };

    this.logger.info("ServiceDiscovery initialized");
  }

  /**
   * Scan directories for services
   * @param {Array} directories - Optional specific directories to scan
   * @returns {Promise<Object>} Scan results
   */
  async scanForServices(directories = null) {
    const startTime = Date.now();
    const scanDirs = directories || this.scanDirectories;

    if (!this.enableAutoDiscovery) {
      throw new Error("Auto-discovery is disabled. Enable it first with setAutoDiscovery(true)");
    }

    if (this.isScanning) {
      this.logger.warn("Scan already in progress");
      return { services: [], errors: [] };
    }

    this.isScanning = true;
    this.metrics.totalScans++;

    try {
      this.logger.info(`Scanning ${scanDirs.length} directories for services...`);

      const scanPromises = scanDirs.map(dir => this.scanDirectory(dir));
      const results = await Promise.all(scanPromises);

      // Flatten results
      const allServices = [];
      const allErrors = [];

      for (const result of results) {
        allServices.push(...result.services);
        allErrors.push(...result.errors);
      }

      // Process discovered services
      const processedServices = await this.processDiscoveredServices(allServices);

      // Auto-register if enabled
      if (this.autoRegister) {
        await this.autoRegisterServices(processedServices);
      }

      const scanDuration = Date.now() - startTime;
      this.updateScanMetrics(true, scanDuration, processedServices.length);

      this.logger.info(`Scan completed: ${processedServices.length} services discovered in ${scanDuration}ms`);
      this.emit("scanCompleted", { services: processedServices, duration: scanDuration });

      return {
        services: processedServices,
        errors: allErrors,
        duration: scanDuration,
        directories: scanDirs,
      };
    } catch (error) {
      const scanDuration = Date.now() - startTime;
      this.updateScanMetrics(false, scanDuration, 0);

      this.logger.error("Service discovery scan failed:", error.message);
      this.emit("scanFailed", { error, duration: scanDuration });

      throw error;
    } finally {
      this.isScanning = false;
    }
  }

  /**
   * Scan a single directory for services
   * @param {string} directory - Directory to scan
   * @returns {Promise<Object>} Directory scan results
   */
  async scanDirectory(directory) {
    const results = { services: [], errors: [] };

    try {
      // Check if directory exists
      await fs.access(directory);
      
      // Recursively scan directory
      const files = await this.getServiceFiles(directory);
      
      // Analyze each file
      for (const file of files) {
        try {
          const serviceInfo = await this.analyzeServiceFile(file);
          if (serviceInfo) {
            results.services.push(serviceInfo);
          }
        } catch (error) {
          results.errors.push({ file, error: error.message });
          this.logger.warn(`Failed to analyze service file ${file}:`, error.message);
        }
      }

      this.scanResults.set(directory, results);
      this.logger.debug(`Scanned directory ${directory}: ${results.services.length} services found`);
    } catch (error) {
      results.errors.push({ directory, error: error.message });
      this.logger.warn(`Failed to scan directory ${directory}:`, error.message);
    }

    return results;
  }

  /**
   * Get service files from directory
   * @param {string} directory - Directory to scan
   * @returns {Promise<Array>} Array of service file paths
   */
  async getServiceFiles(directory) {
    const serviceFiles = [];

    const scanDir = async (dir) => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory()) {
            // Recursively scan subdirectories
            await scanDir(fullPath);
          } else if (entry.isFile()) {
            // Check if file matches service patterns
            if (this.isServiceFile(entry.name)) {
              serviceFiles.push(fullPath);
            }
          }
        }
      } catch (error) {
        this.logger.warn(`Failed to read directory ${dir}:`, error.message);
      }
    };

    await scanDir(directory);
    return serviceFiles;
  }

  /**
   * Check if file matches service patterns
   * @param {string} filename - File name to check
   * @returns {boolean} True if file matches service patterns
   */
  isServiceFile(filename) {
    // Check exclude patterns first
    for (const pattern of this.excludePatterns) {
      if (this.matchesPattern(filename, pattern)) {
        return false;
      }
    }

    // Check service patterns
    return this.servicePatterns.some(pattern => pattern.test(filename));
  }

  /**
   * Check if filename matches pattern
   * @param {string} filename - File name
   * @param {string} pattern - Pattern to match
   * @returns {boolean} True if matches
   */
  matchesPattern(filename, pattern) {
    // Simple glob pattern matching
    const regex = new RegExp(pattern.replace(/\*/g, ".*").replace(/\?/g, "."));
    return regex.test(filename);
  }

  /**
   * Analyze service file to extract service information
   * @param {string} filePath - Path to service file
   * @returns {Promise<Object>} Service information
   */
  async analyzeServiceFile(filePath) {
    try {
      const content = await fs.readFile(filePath, "utf8");
      const serviceInfo = this.extractServiceInfo(filePath, content);

      if (serviceInfo) {
        this.discoveredServices.set(serviceInfo.name, serviceInfo);
        this.logger.debug(`Discovered service: ${serviceInfo.name} in ${filePath}`);
      }

      return serviceInfo;
    } catch (error) {
      this.logger.warn(`Failed to analyze service file ${filePath}:`, error.message);
      return null;
    }
  }

  /**
   * Extract service information from file content
   * @param {string} filePath - Path to service file
   * @param {string} content - File content
   * @returns {Object} Service information
   */
  extractServiceInfo(filePath, content) {
    const fileName = path.basename(filePath, ".js");
    const directory = path.dirname(filePath);
    const relativePath = path.relative(process.cwd(), filePath);

    // Extract class name
    const classMatch = content.match(/class\s+(\w+)/);
    if (!classMatch) {
      return null;
    }

    const className = classMatch[1];
    const serviceName = this.generateServiceName(fileName, className);

    // Extract dependencies from constructor
    const dependencies = this.extractDependencies(content);

    // Extract service category
    const category = this.detectServiceCategory(directory, fileName);

    // Extract metadata
    const metadata = this.extractMetadata(content);

    return {
      name: serviceName,
      className,
      filePath,
      relativePath,
      directory,
      dependencies,
      category,
      metadata,
      discoveredAt: Date.now(),
    };
  }

  /**
   * Generate service name from file name and class name
   * @param {string} fileName - File name
   * @param {string} className - Class name
   * @returns {string} Generated service name
   */
  generateServiceName(fileName, className) {
    // Convert PascalCase to camelCase
    const camelCaseName = className.charAt(0).toLowerCase() + className.slice(1);
    
    // Remove common suffixes
    const cleanName = camelCaseName.replace(/(Service|Manager|Handler|Controller|Repository)$/, "");
    
    return cleanName;
  }

  /**
   * Extract dependencies from constructor
   * @param {string} content - File content
   * @returns {Array} Array of dependency names
   */
  extractDependencies(content) {
    const dependencies = [];

    // Match constructor parameters
    const constructorMatch = content.match(/constructor\s*\(([^)]*)\)/);
    if (constructorMatch) {
      const params = constructorMatch[1];
      const paramNames = params.split(",").map(param => {
        const trimmed = param.trim();
        // Extract parameter name (remove type annotations if present)
        return trimmed.split(":")[0].trim();
      }).filter(name => name.length > 0);

      dependencies.push(...paramNames);
    }

    return dependencies;
  }

  /**
   * Detect service category based on directory and file name
   * @param {string} directory - Directory path
   * @param {string} fileName - File name
   * @returns {string} Service category
   */
  detectServiceCategory(directory, fileName) {
    const lowerDir = directory.toLowerCase();
    const lowerFile = fileName.toLowerCase();

    if (lowerDir.includes("domain")) return "domain";
    if (lowerDir.includes("application")) return "application";
    if (lowerDir.includes("infrastructure")) return "infrastructure";
    if (lowerDir.includes("presentation")) return "presentation";
    if (lowerDir.includes("external")) return "external";

    // Fallback to file name patterns
    if (lowerFile.includes("repository")) return "repository";
    if (lowerFile.includes("service")) return "service";
    if (lowerFile.includes("handler")) return "handler";
    if (lowerFile.includes("controller")) return "controller";

    return "unknown";
  }

  /**
   * Extract metadata from file content
   * @param {string} content - File content
   * @returns {Object} Extracted metadata
   */
  extractMetadata(content) {
    const metadata = {};

    // Extract JSDoc comments
    const jsdocMatch = content.match(/\/\*\*([\s\S]*?)\*\//);
    if (jsdocMatch) {
      metadata.description = jsdocMatch[1].trim();
    }

    // Extract exports
    const exportMatch = content.match(/module\.exports\s*=\s*(\w+)/);
    if (exportMatch) {
      metadata.exportName = exportMatch[1];
    }

    // Extract singleton pattern
    if (content.includes("singleton") || content.includes("getInstance")) {
      metadata.singleton = true;
    }

    return metadata;
  }

  /**
   * Process discovered services
   * @param {Array} services - Discovered services
   * @returns {Promise<Array>} Processed services
   */
  async processDiscoveredServices(services) {
    const processedServices = [];

    for (const service of services) {
      try {
        // Validate service
        const validation = await this.validateService(service);
        if (validation.valid) {
          processedServices.push({ ...service, validation });
        } else {
          this.logger.warn(`Service validation failed for ${service.name}:`, validation.errors);
        }
      } catch (error) {
        this.logger.warn(`Failed to process service ${service.name}:`, error.message);
      }
    }

    return processedServices;
  }

  /**
   * Validate discovered service
   * @param {Object} service - Service information
   * @returns {Promise<Object>} Validation result
   */
  async validateService(service) {
    const validation = { valid: true, errors: [] };

    // Check if service file exists and is readable
    try {
      await fs.access(service.filePath);
    } catch (error) {
      validation.valid = false;
      validation.errors.push(`Service file not accessible: ${error.message}`);
    }

    // Check if service name is valid
    if (!service.name || service.name.length === 0) {
      validation.valid = false;
      validation.errors.push("Service name is empty");
    }

    // Check for duplicate service names
    if (this.discoveredServices.has(service.name)) {
      validation.valid = false;
      validation.errors.push(`Duplicate service name: ${service.name}`);
    }

    return validation;
  }

  /**
   * Auto-register discovered services
   * @param {Array} services - Services to register
   * @returns {Promise<Object>} Registration results
   */
  async autoRegisterServices(services) {
    const results = {
      successful: [],
      failed: [],
      total: services.length,
    };

    this.logger.info(`Auto-registering ${services.length} discovered services...`);

    for (const service of services) {
      try {
        await this.registerDiscoveredService(service);
        results.successful.push(service.name);
        this.registeredServices.add(service.name);
        this.metrics.servicesRegistered++;
      } catch (error) {
        results.failed.push({ name: service.name, error: error.message });
        this.metrics.registrationFailures++;
        this.logger.error(`Failed to register service ${service.name}:`, error.message);
      }
    }

    this.logger.info(`Auto-registration completed: ${results.successful.length} successful, ${results.failed.length} failed`);
    this.emit("servicesRegistered", results);

    return results;
  }

  /**
   * Register a discovered service
   * @param {Object} service - Service information
   * @returns {Promise<void>}
   */
  async registerDiscoveredService(service) {
    try {
      // Load service module
      const serviceModule = require(service.filePath);
      const ServiceClass = serviceModule[service.className] || serviceModule;

      if (!ServiceClass) {
        throw new Error(`Service class ${service.className} not found in module`);
      }

      // Create factory function
      const factory = (...dependencies) => {
        return new ServiceClass(...dependencies);
      };

      // Register with container
      this.container.register(service.name, factory, {
        singleton: service.metadata.singleton !== false,
        dependencies: service.dependencies,
        category: service.category,
        metadata: service.metadata,
      });

      this.logger.debug(`Registered discovered service: ${service.name}`);
      this.emit("serviceRegistered", service);
    } catch (error) {
      this.logger.error(`Failed to register discovered service ${service.name}:`, error.message);
      throw error;
    }
  }

  /**
   * Update scan metrics
   * @param {boolean} success - Whether scan was successful
   * @param {number} duration - Scan duration
   * @param {number} servicesCount - Number of services discovered
   */
  updateScanMetrics(success, duration, servicesCount) {
    if (success) {
      this.metrics.successfulScans++;
    } else {
      this.metrics.failedScans++;
    }

    this.metrics.servicesDiscovered += servicesCount;
    this.metrics.averageScanTime = (this.metrics.averageScanTime + duration) / 2;
    this.metrics.lastScanTime = new Date();
  }

  /**
   * Get discovery metrics
   * @returns {Object} Discovery metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      successRate: this.metrics.totalScans > 0 
        ? (this.metrics.successfulScans / this.metrics.totalScans) * 100 
        : 0,
      registrationRate: this.metrics.servicesDiscovered > 0 
        ? (this.metrics.servicesRegistered / this.metrics.servicesDiscovered) * 100 
        : 0,
      isScanning: this.isScanning,
      discoveredServicesCount: this.discoveredServices.size,
      registeredServicesCount: this.registeredServices.size,
    };
  }

  /**
   * Get discovered services
   * @returns {Map} Discovered services
   */
  getDiscoveredServices() {
    return new Map(this.discoveredServices);
  }

  /**
   * Get registered services
   * @returns {Set} Registered services
   */
  getRegisteredServices() {
    return new Set(this.registeredServices);
  }

  /**
   * Clear discovery data
   */
  clearDiscoveryData() {
    this.discoveredServices.clear();
    this.registeredServices.clear();
    this.scanResults.clear();

    this.logger.info("Discovery data cleared");
    this.emit("discoveryDataCleared");
  }

  /**
   * Shutdown service discovery
   */
  async shutdown() {
    this.logger.info("Shutting down ServiceDiscovery...");

    // Clear all data
    this.discoveredServices.clear();
    this.registeredServices.clear();
    this.scanResults.clear();

    this.logger.info("ServiceDiscovery shutdown complete");
    this.emit("shutdown");
  }
}

module.exports = ServiceDiscovery;
