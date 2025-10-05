/**
 * Path Configuration - DEPRECATED
 * All paths are now defined in centralized-config.js
 * This file is kept for backward compatibility
 */

const centralizedConfig = require('./centralized-config');

// Export the path config from centralized config
module.exports = centralizedConfig.pathConfig;
