/**
 * SQLTranslator
 * Converts PostgreSQL SQL syntax to SQLite syntax for automatic fallback
 * 
 * Features:
 * - Parameter placeholder conversion ($1, $2 → ?, ?)
 * - PostgreSQL-specific syntax to SQLite syntax conversion
 * - Automatic query translation for repository operations
 * - Performance optimized with caching
 */
const Logger = require('@logging/Logger');
const logger = new Logger('SQLTranslator');

class SQLTranslator {
  constructor() {
    this.translationCache = new Map();
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  /**
   * Translate PostgreSQL SQL to SQLite SQL
   * @param {string} postgresSQL - PostgreSQL SQL query
   * @param {Array} params - Query parameters
   * @returns {Object} Translated SQL and parameters
   */
  translate(postgresSQL, params = []) {
    if (!postgresSQL || typeof postgresSQL !== 'string') {
      throw new Error('Invalid SQL query provided to translator');
    }

    // Reduced logging - only log in debug mode
    logger.debug(`🔄 Translating SQL statement`);

    // Check cache first
    const cacheKey = this._generateCacheKey(postgresSQL, params);
    if (this.translationCache.has(cacheKey)) {
      this.cacheHits++;
      return this.translationCache.get(cacheKey);
    }

    this.cacheMisses++;
    
    try {
      const translatedSQL = this._translateSQL(postgresSQL);
      const translatedParams = this._translateParams(params);
      
      const result = {
        sql: translatedSQL,
        params: translatedParams,
        originalSQL: postgresSQL,
        originalParams: params
      };

      // Cache the result
      this.translationCache.set(cacheKey, result);
      
      // Limit cache size to prevent memory issues
      if (this.translationCache.size > 1000) {
        const firstKey = this.translationCache.keys().next().value;
        this.translationCache.delete(firstKey);
      }

      logger.debug(`🔄 SQL Translation completed`);
      
      // Debug: Check if TIMESTAMP WITH TIME ZONE was converted
      if (postgresSQL.includes('TIMESTAMP WITH TIME ZONE') && !translatedSQL.includes('TIMESTAMP WITH TIME ZONE')) {
        logger.info(`✅ Successfully converted TIMESTAMP WITH TIME ZONE to TEXT`);
      } else if (postgresSQL.includes('TIMESTAMP WITH TIME ZONE')) {
        logger.warn(`⚠️ TIMESTAMP WITH TIME ZONE not converted!`);
      }
      
      // Debug: Check if NOW() was converted
      if (postgresSQL.includes('NOW()') && !translatedSQL.includes('NOW()')) {
        logger.info(`✅ Successfully converted NOW() to datetime('now')`);
      } else if (postgresSQL.includes('NOW()')) {
        logger.warn(`⚠️ NOW() not converted!`);
      }
      
      return result;
    } catch (error) {
      logger.error(`SQL Translation failed: ${error.message}`);
      throw new Error(`SQL Translation failed: ${error.message}`);
    }
  }

  /**
   * Translate SQL syntax from PostgreSQL to SQLite
   * @param {string} sql - PostgreSQL SQL
   * @returns {string} SQLite SQL
   * @private
   */
  _translateSQL(sql) {
    let translatedSQL = sql;

    // Convert PostgreSQL parameter placeholders to SQLite placeholders
    translatedSQL = this._convertParameterPlaceholders(translatedSQL);
    
    // Convert PostgreSQL-specific functions to SQLite equivalents (do this before data types)
    translatedSQL = this._convertFunctions(translatedSQL);
    
    // Convert PostgreSQL-specific syntax to SQLite
    translatedSQL = this._convertSyntax(translatedSQL);
    
    // Convert PostgreSQL data types to SQLite (do this last to avoid affecting function names)
    translatedSQL = this._convertDataTypes(translatedSQL);

    return translatedSQL;
  }

  /**
   * Convert PostgreSQL parameter placeholders ($1, $2, etc.) to SQLite placeholders (?, ?, etc.)
   * @param {string} sql - SQL with PostgreSQL placeholders
   * @returns {string} SQL with SQLite placeholders
   * @private
   */
  _convertParameterPlaceholders(sql) {
    // Replace $1, $2, $3, etc. with ?, ?, ?, etc.
    return sql.replace(/\$(\d+)/g, '?');
  }

  /**
   * Convert PostgreSQL-specific functions to SQLite equivalents
   * @param {string} sql - SQL with PostgreSQL functions
   * @returns {string} SQL with SQLite functions
   * @private
   */
  _convertFunctions(sql) {
    let convertedSQL = sql;
    
    //logger.info(`🔧 _convertFunctions: Processing SQL: ${sql.substring(0, 200)}...`);

    // Convert PostgreSQL UUID functions - handle both with and without ::text
    convertedSQL = convertedSQL.replace(/uuid_generate_v4\(\)(::text)?/gi, "lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))");
    
    // Convert PostgreSQL gen_random_uuid() to SQLite UUID generator
    convertedSQL = convertedSQL.replace(/gen_random_uuid\(\)/gi, "(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))");
    
    // Convert PostgreSQL NOW() to SQLite CURRENT_TIMESTAMP for DEFAULT constraints FIRST
    convertedSQL = convertedSQL.replace(/DEFAULT\s+NOW\(\)/gi, "DEFAULT CURRENT_TIMESTAMP");
    
    // Convert standalone NOW() to SQLite CURRENT_TIMESTAMP SECOND
    convertedSQL = convertedSQL.replace(/NOW\(\)/gi, "CURRENT_TIMESTAMP");
    
    // Convert CURRENT_TIMESTAMP to CURRENT_TIMESTAMP for SQLite compatibility THIRD (no change needed)
    // convertedSQL = convertedSQL.replace(/\bCURRENT_TIMESTAMP\b/gi, "CURRENT_TIMESTAMP");
    
    // Remove the old conversion that was causing problems
    // convertedSQL = convertedSQL.replace(/NOW\(\)/gi, "CURRENT_TIMESTAMP");
    
    // Convert PostgreSQL SERIAL PRIMARY KEY to SQLite INTEGER PRIMARY KEY AUTOINCREMENT
    if (convertedSQL.includes('SERIAL PRIMARY KEY')) {
      logger.info(`🔧 Converting SERIAL PRIMARY KEY to INTEGER PRIMARY KEY AUTOINCREMENT`);
      convertedSQL = convertedSQL.replace(/SERIAL\s+PRIMARY\s+KEY/gi, "INTEGER PRIMARY KEY AUTOINCREMENT");
      logger.info(`🔧 SERIAL PRIMARY KEY conversion completed`);
    }
    
    // Convert PostgreSQL JSONB to SQLite TEXT
    convertedSQL = convertedSQL.replace(/JSONB/gi, "TEXT");
    
    // Convert PostgreSQL BOOLEAN to SQLite INTEGER
    convertedSQL = convertedSQL.replace(/BOOLEAN/gi, "INTEGER");
    
    // Remove duplicate VARCHAR conversion - this is handled in _convertDataTypes
    
    // Convert PostgreSQL CREATE OR REPLACE VIEW to SQLite compatible syntax
    convertedSQL = convertedSQL.replace(/CREATE\s+OR\s+REPLACE\s+VIEW/gi, "CREATE VIEW");
    
    // Convert PostgreSQL CREATE OR REPLACE FUNCTION to SQLite compatible syntax (remove completely)
    // Remove the entire function block including all parts
    convertedSQL = convertedSQL.replace(/CREATE\s+OR\s+REPLACE\s+FUNCTION[^;]*?language\s+'plpgsql';/gis, '');
    
    // Convert PostgreSQL CREATE OR REPLACE TRIGGER to SQLite compatible syntax (remove completely)
    convertedSQL = convertedSQL.replace(/CREATE\s+OR\s+REPLACE\s+TRIGGER[^;]*?EXECUTE\s+FUNCTION[^;]*?;/gis, '');
    
    // Remove any remaining function-related statements that might be parsed separately
    convertedSQL = convertedSQL.replace(/^\s*(RETURN\s+NEW|END;?|BEGIN|NEW\.\w+\s*=.*?;?)\s*$/gim, '');
    
    // Convert PostgreSQL TIMESTAMP WITH TIME ZONE to SQLite TEXT
    convertedSQL = convertedSQL.replace(/\bTIMESTAMP WITH TIME ZONE\b/gi, 'TEXT');
    
    // Convert PostgreSQL CONSTRAINT syntax to SQLite compatible syntax (remove for now to avoid dependency issues)
    convertedSQL = convertedSQL.replace(/CONSTRAINT\s+\w+\s+FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+(\w+)\(([^)]+)\)\s*ON\s+DELETE\s+CASCADE/gi, '');
    
    // Clean up empty lines before closing parenthesis
    convertedSQL = convertedSQL.replace(/\s*\n\s*\n\s*\)/g, '\n)');
    
    // Remove trailing comma before closing parenthesis
    convertedSQL = convertedSQL.replace(/,\s*\)/g, ')');
    
    // Convert PostgreSQL COALESCE to SQLite COALESCE (same function)
    // No conversion needed as both support COALESCE
    
    // Convert PostgreSQL LENGTH to SQLite LENGTH (same function)
    // No conversion needed as both support LENGTH
    
    // Convert PostgreSQL UPPER to SQLite UPPER (same function)
    // No conversion needed as both support UPPER
    
    // Convert PostgreSQL LOWER to SQLite LOWER (same function)
    // No conversion needed as both support LOWER

    //logger.info(`🔧 _convertFunctions: Final SQL: ${convertedSQL.substring(0, 200)}...`);
    //logger.info(`🔧 _convertFunctions: Complete SQL: ${convertedSQL}`);
    return convertedSQL;
  }

  /**
   * Convert PostgreSQL-specific syntax to SQLite
   * @param {string} sql - SQL with PostgreSQL syntax
   * @returns {string} SQL with SQLite syntax
   * @private
   */
  _convertSyntax(sql) {
    let convertedSQL = sql;

    // Convert PostgreSQL ILIKE to SQLite LIKE (case-insensitive)
    convertedSQL = convertedSQL.replace(/\bILIKE\b/gi, 'LIKE');
    
    // Convert PostgreSQL double quotes for identifiers to SQLite backticks
    convertedSQL = convertedSQL.replace(/"([^"]+)"/g, '`$1`');
    
    // Convert PostgreSQL boolean literals
    convertedSQL = convertedSQL.replace(/\bTRUE\b/gi, '1');
    convertedSQL = convertedSQL.replace(/\bFALSE\b/gi, '0');
    
    // Convert PostgreSQL LIMIT/OFFSET syntax (usually same, but ensure compatibility)
    // No conversion needed as both support LIMIT and OFFSET
    
    // Convert PostgreSQL ORDER BY syntax (same in SQLite)
    // No conversion needed as both support ORDER BY
    
    // Convert PostgreSQL GROUP BY syntax (same in SQLite)
    // No conversion needed as both support GROUP BY

    return convertedSQL;
  }

  /**
   * Convert PostgreSQL data types to SQLite
   * @param {string} sql - SQL with PostgreSQL data types
   * @returns {string} SQL with SQLite data types
   * @private
   */
  _convertDataTypes(sql) {
    let convertedSQL = sql;

    // Convert PostgreSQL data types to SQLite equivalents
    // Only convert data types in CREATE TABLE statements, not column names
    
    // Handle CREATE TABLE statements specifically
    if (convertedSQL.toUpperCase().includes('CREATE TABLE')) {
      logger.debug(`🔄 Translating CREATE TABLE statement: ${convertedSQL.substring(0, 100)}...`);
      // Handle VARCHAR with size specification first
      convertedSQL = convertedSQL.replace(/\bVARCHAR\s*\(\s*\d+\s*\)/gi, 'TEXT');
      convertedSQL = convertedSQL.replace(/\bCHARACTER VARYING\s*\(\s*\d+\s*\)/gi, 'TEXT');
      
      // Handle basic data types
      convertedSQL = convertedSQL.replace(/\bVARCHAR\b/gi, 'TEXT');
      convertedSQL = convertedSQL.replace(/\bCHARACTER VARYING\b/gi, 'TEXT');
      convertedSQL = convertedSQL.replace(/\bTIMESTAMP WITH TIME ZONE\b/gi, 'TEXT');
      convertedSQL = convertedSQL.replace(/\bTIMESTAMP WITHOUT TIME ZONE\b/gi, 'TEXT');
      convertedSQL = convertedSQL.replace(/\bTIMESTAMP\b/gi, 'TEXT');
      convertedSQL = convertedSQL.replace(/\bDATE\b/gi, 'TEXT');
      convertedSQL = convertedSQL.replace(/\bTIME\b/gi, 'TEXT');
      convertedSQL = convertedSQL.replace(/\bJSON\b/gi, 'TEXT');
      convertedSQL = convertedSQL.replace(/\bJSONB\b/gi, 'TEXT');
      convertedSQL = convertedSQL.replace(/\bUUID\b/gi, 'TEXT');
      convertedSQL = convertedSQL.replace(/\bSERIAL\b/gi, 'INTEGER');
      convertedSQL = convertedSQL.replace(/\bBIGSERIAL\b/gi, 'INTEGER');
      convertedSQL = convertedSQL.replace(/\bSMALLSERIAL\b/gi, 'INTEGER');
      convertedSQL = convertedSQL.replace(/\bBIGINT\b/gi, 'INTEGER');
      convertedSQL = convertedSQL.replace(/\bSMALLINT\b/gi, 'INTEGER');
      convertedSQL = convertedSQL.replace(/\bREAL\b/gi, 'REAL');
      convertedSQL = convertedSQL.replace(/\bDOUBLE PRECISION\b/gi, 'REAL');
      convertedSQL = convertedSQL.replace(/\bNUMERIC\b/gi, 'REAL');
      convertedSQL = convertedSQL.replace(/\bDECIMAL\b/gi, 'REAL');
      convertedSQL = convertedSQL.replace(/\bMONEY\b/gi, 'REAL');
      convertedSQL = convertedSQL.replace(/\bBIT\b/gi, 'INTEGER');
      convertedSQL = convertedSQL.replace(/\bBIT VARYING\b/gi, 'BLOB');
      convertedSQL = convertedSQL.replace(/\bBYTEA\b/gi, 'BLOB');
      convertedSQL = convertedSQL.replace(/\bCHAR\b/gi, 'TEXT');
      convertedSQL = convertedSQL.replace(/\bCHARACTER\b/gi, 'TEXT');
      convertedSQL = convertedSQL.replace(/\bBOOLEAN\b/gi, 'INTEGER');
    }

    return convertedSQL;
  }

  /**
   * Translate parameters for SQLite compatibility
   * @param {Array} params - Original parameters
   * @returns {Array} Translated parameters
   * @private
   */
  _translateParams(params) {
    if (!Array.isArray(params)) {
      return [];
    }

    return params.map(param => {
      // Convert boolean values to integers for SQLite
      if (typeof param === 'boolean') {
        return param ? 1 : 0;
      }
      
      // Convert Date objects to ISO strings for SQLite
      if (param instanceof Date) {
        return param.toISOString();
      }
      
      // Convert undefined to null for SQLite
      if (param === undefined) {
        return null;
      }
      
      // Return other values as-is
      return param;
    });
  }

  /**
   * Generate cache key for SQL and parameters
   * @param {string} sql - SQL query
   * @param {Array} params - Query parameters
   * @returns {string} Cache key
   * @private
   */
  _generateCacheKey(sql, params) {
    return `${sql}:${JSON.stringify(params)}`;
  }

  /**
   * Get translation statistics
   * @returns {Object} Translation statistics
   */
  getStats() {
    return {
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      cacheSize: this.translationCache.size,
      hitRate: this.cacheHits / (this.cacheHits + this.cacheMisses) || 0
    };
  }

  /**
   * Clear translation cache
   */
  clearCache() {
    this.translationCache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
    logger.info('SQL Translation cache cleared');
  }

  /**
   * Validate if SQL can be translated
   * @param {string} sql - SQL query to validate
   * @returns {boolean} True if translatable
   */
  canTranslate(sql) {
    if (!sql || typeof sql !== 'string') {
      logger.debug('❌ canTranslate: Invalid SQL');
      return false;
    }
    
    logger.debug(`🔍 canTranslate: Checking SQL: ${sql.substring(0, 100)}...`);

    // Check for unsupported PostgreSQL features
    const unsupportedFeatures = [
      /\bWITH\s+RECURSIVE\b/i,  // Recursive CTEs
      /\bWINDOW\s+FUNCTION\b/i, // Window functions
      /\bPARTITION\s+BY\b/i,    // Partition by
      /\bOVER\s*\(/i,           // Window functions
      /\bLATERAL\b/i,           // Lateral joins
      /\bFULL\s+OUTER\s+JOIN\b/i, // Full outer joins
      /\bMATERIALIZED\b/i,      // Materialized views
      /\bUNLOGGED\b/i,          // Unlogged tables
      /\bTEMPORARY\b/i,         // Temporary tables
      /\bUNLOGGED\b/i,          // Unlogged tables
      /\bINHERITS\b/i,          // Table inheritance
      /\bUSING\s+GIN\b/i,       // GIN indexes
      /\bUSING\s+BTREE\b/i,     // BTREE indexes
      /\bUSING\s+HASH\b/i,      // HASH indexes
      /\bUSING\s+SPGIST\b/i,    // SPGIST indexes
      /\bUSING\s+GIST\b/i,      // GIST indexes
      /\bUSING\s+BRIN\b/i       // BRIN indexes
    ];

    for (const feature of unsupportedFeatures) {
      if (feature.test(sql)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get list of unsupported PostgreSQL features
   * @returns {Array} List of unsupported features
   */
  getUnsupportedFeatures() {
    return [
      'Recursive CTEs (WITH RECURSIVE)',
      'Window functions (PARTITION BY, OVER)',
      'Lateral joins (LATERAL)',
      'Full outer joins (FULL OUTER JOIN)',
      'Materialized views (MATERIALIZED)',
      'Unlogged tables (UNLOGGED)',
      'Temporary tables (TEMPORARY)',
      'Table inheritance (INHERITS)',
      'Advanced index types (GIN, BTREE, HASH, SPGIST, GIST, BRIN)',
      'PostgreSQL-specific extensions',
      'Custom PostgreSQL functions',
      'PostgreSQL-specific data types'
    ];
  }
}

module.exports = SQLTranslator; 