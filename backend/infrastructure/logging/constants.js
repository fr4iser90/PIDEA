/**
 * Logging Constants - Standard values and configurations
 * Centralized constants for the logging system
 */

// Log Levels
const LOG_LEVELS = {
  ERROR: "error",
  WARN: "warn",
  INFO: "info",
  DEBUG: "debug",
  SUCCESS: "success",
  FAILURE: "failure",
};

// Log Level Abbreviations
const LOG_LEVEL_ABBREV = {
  [LOG_LEVELS.ERROR]: "[E]",
  [LOG_LEVELS.WARN]: "[W]",
  [LOG_LEVELS.INFO]: "[I]",
  [LOG_LEVELS.DEBUG]: "[D]",
  [LOG_LEVELS.SUCCESS]: "[S]",
  [LOG_LEVELS.FAILURE]: "[F]",
};

// Log Level Priorities (higher number = higher priority)
const LOG_LEVEL_PRIORITIES = {
  [LOG_LEVELS.ERROR]: 5,
  [LOG_LEVELS.WARN]: 4,
  [LOG_LEVELS.INFO]: 3,
  [LOG_LEVELS.DEBUG]: 2,
  [LOG_LEVELS.SUCCESS]: 1,
  [LOG_LEVELS.FAILURE]: 1,
};

// Default Log Levels by Environment
const DEFAULT_LOG_LEVELS = {
  development: LOG_LEVELS.INFO,
  production: LOG_LEVELS.WARN,
  test: LOG_LEVELS.ERROR,
};

// Log File Names
const LOG_FILES = {
  ERROR: "error.log",
  COMBINED: "combined.log",
  ACCESS: "access.log",
  PERFORMANCE: "performance.log",
};

// Log Directories
const LOG_DIRECTORIES = {
  ROOT: "logs",
  BACKUP: "logs/backup",
  ARCHIVE: "logs/archive",
};

// Log Format Patterns
const LOG_FORMATS = {
  CONSOLE: "console",
  FILE: "file",
  JSON: "json",
  SIMPLE: "simple",
};

// Time Format Patterns
const TIME_FORMATS = {
  CONSOLE: "HH:mm:ss", // 14:30:25 (8 chars)
  FILE: "YYYY-MM-DD HH:mm:ss", // Full timestamp for files
  COMPACT: "HH:mm", // 14:30 (5 chars)
  VERBOSE: "YYYY-MM-DD HH:mm:ss.SSS", // With milliseconds
  RELATIVE: "relative", // Relative time format
};

// Emoji Mappings
const LOG_EMOJIS = {
  [LOG_LEVELS.ERROR]: "❌",
  [LOG_LEVELS.WARN]: "⚠️",
  [LOG_LEVELS.INFO]: "ℹ️",
  [LOG_LEVELS.DEBUG]: "🔍",
  [LOG_LEVELS.SUCCESS]: "✅",
  [LOG_LEVELS.FAILURE]: "💥",
  TIME: "⏱️",
  API: "🌐",
  USER: "👤",
  SYSTEM: "⚙️",
  SERVICE: "🔧",
  DATABASE: "🗄️",
  FILE: "📁",
  NETWORK: "🌍",
  SECURITY: "🔒",
  PERFORMANCE: "⚡",
};

// Sensitive Data Patterns
const SENSITIVE_PATTERNS = {
  SECRETS: [
    /password\s*[:=]\s*['"]?[^'"\s]+['"]?/gi,
    /api_key\s*[:=]\s*['"]?[^'"\s]+['"]?/gi,
    /auth_token\s*[:=]\s*['"]?[^'"\s]+['"]?/gi,
    /secret\s*[:=]\s*['"]?[^'"\s]+['"]?/gi,
    /key\s*[:=]\s*['"]?[^'"\s]+['"]?/gi,
    /private_key\s*[:=]\s*['"]?[^'"\s]+['"]?/gi,
    /access_token\s*[:=]\s*['"]?[^'"\s]+['"]?/gi,
    /refresh_token\s*[:=]\s*['"]?[^'"\s]+['"]?/gi,
    /session_id\s*[:=]\s*['"]?[^'"\s]+['"]?/gi,
  ],
  PATHS: [
    /\/home\/[^\/\s]+/g,
    /\/Users\/[^\/\s]+/g,
    /\/tmp\/[^\/\s]+/g,
    /\/var\/[^\/\s]+/g,
    /\/etc\/[^\/\s]+/g,
    /\/usr\/[^\/\s]+/g,
    /\/opt\/[^\/\s]+/g,
    /\/data\/[^\/\s]+/g,
    /\/app\/[^\/\s]+/g,
    /\/workspace\/[^\/\s]+/g,
  ],
};

// Sensitive Keys
const SENSITIVE_KEYS = [
  "password",
  "api_key",
  "auth_token",
  "secret",
  "key",
  "private_key",
  "access_token",
  "refresh_token",
  "session_id",
  "authorization",
  "cookie",
  "session",
];

// Migration Patterns
const MIGRATION_PATTERNS = {
  CONSOLE_LOG: /console\.log\s*\(/g,
  LOGGER_LOG: /logger\.log\s*\(/g,
  DIRECT_CONSOLE: /this\.logger\s*=\s*console/g,
  LEGACY_IMPORT:
    /require\s*\(\s*['"]@infrastructure\/logging\/Logger['"]\s*\)/g,
  STANDARD_IMPORT:
    /const\s+Logger\s*=\s*require\s*\(\s*['"]@logging\/Logger['"]\s*\)/g,
};

// Performance Thresholds
const PERFORMANCE_THRESHOLDS = {
  LOG_CALL_MS: 0.1,
  MEMORY_MB: 1,
  THROUGHPUT_PER_SEC: 10000,
};

// HTTP Status Code Emojis
const HTTP_STATUS_EMOJIS = {
  200: "✅",
  201: "✅",
  204: "✅",
  301: "🔄",
  302: "🔄",
  304: "🔄",
  400: "⚠️",
  401: "🔒",
  403: "🚫",
  404: "❓",
  500: "💥",
  502: "💥",
  503: "💥",
};

// Service Categories
const SERVICE_CATEGORIES = {
  API: "api",
  DATABASE: "database",
  FILE: "file",
  NETWORK: "network",
  SECURITY: "security",
  PERFORMANCE: "performance",
  SYSTEM: "system",
  USER: "user",
};

// Log Rotation Settings
const LOG_ROTATION = {
  MAX_SIZE: "10m",
  MAX_FILES: 5,
  COMPRESS: true,
};

// Export all constants
module.exports = {
  LOG_LEVELS,
  LOG_LEVEL_ABBREV,
  LOG_LEVEL_PRIORITIES,
  DEFAULT_LOG_LEVELS,
  LOG_FILES,
  LOG_DIRECTORIES,
  LOG_FORMATS,
  TIME_FORMATS,
  LOG_EMOJIS,
  SENSITIVE_PATTERNS,
  SENSITIVE_KEYS,
  MIGRATION_PATTERNS,
  PERFORMANCE_THRESHOLDS,
  HTTP_STATUS_EMOJIS,
  SERVICE_CATEGORIES,
  LOG_ROTATION,
};
