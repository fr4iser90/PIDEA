/**
 * Framework Registry - Domain Layer
 * Manages framework configurations and provides framework validation
 */

const path = require('path');
const fs = require('fs').promises;

class FrameworkRegistry {
  constructor() {
    this.frameworks = new Map();
    this.configs = new Map();
    this.categories = new Map();
  }

  /**
   * Register a framework with its configuration
   * @param {string} name - Framework name
   * @param {Object} config - Framework configuration
   * @param {string} category - Framework category
   */
  async registerFramework(name, config, category = 'general') {
    try {
      // Validate framework configuration
      this.validateFrameworkConfig(config);
      
      // Store framework configuration
      this.frameworks.set(name, {
        name,
        config,
        category,
        registeredAt: new Date(),
        status: 'active'
      });

      // Add to category
      if (!this.categories.has(category)) {
        this.categories.set(category, new Set());
      }
      this.categories.get(category).add(name);

      console.log(`✅ Framework "${name}" registered successfully in category "${category}"`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to register framework "${name}":`, error.message);
      throw error;
    }
  }

  /**
   * Load framework configurations from configs directory
   */
  async loadFrameworkConfigs() {
    try {
      const configsDir = path.join(__dirname, 'configs');
      
      // Check if configs directory exists
      try {
        await fs.access(configsDir);
      } catch {
        console.log('📁 Creating configs directory...');
        await fs.mkdir(configsDir, { recursive: true });
        return;
      }

      const files = await fs.readdir(configsDir);
      const jsonFiles = files.filter(file => file.endsWith('.json'));

      for (const file of jsonFiles) {
        try {
          const configPath = path.join(configsDir, file);
          const configContent = await fs.readFile(configPath, 'utf8');
          const config = JSON.parse(configContent);
          
          const frameworkName = path.basename(file, '.json');
          const category = config.category || 'general';
          
          await this.registerFramework(frameworkName, config, category);
          this.configs.set(frameworkName, configPath);
        } catch (error) {
          console.error(`❌ Failed to load config "${file}":`, error.message);
        }
      }

      console.log(`📦 Loaded ${this.frameworks.size} framework configurations`);
    } catch (error) {
      console.error('❌ Failed to load framework configs:', error.message);
      throw error;
    }
  }

  /**
   * Get framework by name
   * @param {string} name - Framework name
   */
  getFramework(name) {
    const framework = this.frameworks.get(name);
    if (!framework) {
      throw new Error(`Framework "${name}" not found`);
    }
    return framework;
  }

  /**
   * Get all frameworks in a category
   * @param {string} category - Framework category
   */
  getFrameworksByCategory(category) {
    const frameworkNames = this.categories.get(category) || new Set();
    return Array.from(frameworkNames).map(name => this.getFramework(name));
  }

  /**
   * Get all registered frameworks
   */
  getAllFrameworks() {
    return Array.from(this.frameworks.values());
  }

  /**
   * Get all categories
   */
  getCategories() {
    return Array.from(this.categories.keys());
  }

  /**
   * Update framework configuration
   * @param {string} name - Framework name
   * @param {Object} newConfig - New configuration
   */
  async updateFramework(name, newConfig) {
    const framework = this.getFramework(name);
    
    // Validate new configuration
    this.validateFrameworkConfig(newConfig);
    
    // Update framework
    framework.config = { ...framework.config, ...newConfig };
    framework.updatedAt = new Date();
    
    console.log(`✅ Framework "${name}" updated successfully`);
    return framework;
  }

  /**
   * Remove framework
   * @param {string} name - Framework name
   */
  removeFramework(name) {
    const framework = this.getFramework(name);
    
    // Remove from frameworks map
    this.frameworks.delete(name);
    
    // Remove from category
    const category = framework.category;
    if (this.categories.has(category)) {
      this.categories.get(category).delete(name);
      
      // Remove empty category
      if (this.categories.get(category).size === 0) {
        this.categories.delete(category);
      }
    }
    
    // Remove config file reference
    this.configs.delete(name);
    
    console.log(`🗑️ Framework "${name}" removed successfully`);
    return true;
  }

  /**
   * Validate framework configuration
   * @param {Object} config - Framework configuration
   */
  validateFrameworkConfig(config) {
    if (!config || typeof config !== 'object') {
      throw new Error('Framework configuration must be an object');
    }

    if (!config.name) {
      throw new Error('Framework configuration must have a "name" property');
    }

    if (!config.version) {
      throw new Error('Framework configuration must have a "version" property');
    }

    if (!config.description) {
      throw new Error('Framework configuration must have a "description" property');
    }

    if (!config.steps || !Array.isArray(config.steps)) {
      throw new Error('Framework configuration must have a "steps" array');
    }

    return true;
  }

  /**
   * Check if framework exists
   * @param {string} name - Framework name
   */
  hasFramework(name) {
    return this.frameworks.has(name);
  }

  /**
   * Get framework status
   * @param {string} name - Framework name
   */
  getFrameworkStatus(name) {
    const framework = this.getFramework(name);
    return framework.status;
  }

  /**
   * Set framework status
   * @param {string} name - Framework name
   * @param {string} status - New status
   */
  setFrameworkStatus(name, status) {
    const framework = this.getFramework(name);
    framework.status = status;
    framework.updatedAt = new Date();
    
    console.log(`✅ Framework "${name}" status set to "${status}"`);
    return framework;
  }

  /**
   * Get registry statistics
   */
  getStats() {
    return {
      totalFrameworks: this.frameworks.size,
      categories: this.categories.size,
      activeFrameworks: Array.from(this.frameworks.values()).filter(f => f.status === 'active').length,
      inactiveFrameworks: Array.from(this.frameworks.values()).filter(f => f.status === 'inactive').length
    };
  }
}

module.exports = FrameworkRegistry; 