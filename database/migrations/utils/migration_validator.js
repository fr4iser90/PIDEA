/**
 * Migration Validator Utility
 * Validates migration scripts for syntax and safety
 * Created: 2025-10-11T01:00:55.000Z
 * Version: 1.0.0
 */

const fs = require('fs');
const path = require('path');

class MigrationValidator {
    constructor() {
        this.errors = [];
        this.warnings = [];
        this.validations = [
            'syntax',
            'safety',
            'rollback',
            'constraints',
            'indexes'
        ];
    }

    /**
     * Validate a migration script
     * @param {string} migrationPath - Path to migration file
     * @returns {Object} Validation result
     */
    async validateMigration(migrationPath) {
        this.errors = [];
        this.warnings = [];

        try {
            const content = fs.readFileSync(migrationPath, 'utf8');
            const filename = path.basename(migrationPath);

            // Basic validations
            this.validateSyntax(content, filename);
            this.validateSafety(content, filename);
            this.validateStructure(content, filename);
            this.validateConstraints(content, filename);
            this.validateIndexes(content, filename);

            return {
                valid: this.errors.length === 0,
                errors: this.errors,
                warnings: this.warnings,
                filename,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                valid: false,
                errors: [`Failed to read migration file: ${error.message}`],
                warnings: [],
                filename: path.basename(migrationPath),
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Validate SQL syntax
     * @param {string} content - Migration content
     * @param {string} filename - Migration filename
     */
    validateSyntax(content, filename) {
        // Check for basic SQL syntax issues
        const syntaxChecks = [
            {
                pattern: /;\s*$/m,
                message: 'Statements should end with semicolon'
            },
            {
                pattern: /BEGIN\s*;/i,
                message: 'BEGIN statement should be followed by transaction content'
            },
            {
                pattern: /COMMIT\s*;/i,
                message: 'COMMIT statement should end transaction'
            }
        ];

        syntaxChecks.forEach(check => {
            if (!check.pattern.test(content)) {
                this.warnings.push(`Syntax: ${check.message}`);
            }
        });

        // Check for dangerous operations
        const dangerousPatterns = [
            {
                pattern: /DROP\s+TABLE\s+(?!IF\s+EXISTS)/i,
                message: 'DROP TABLE should use IF EXISTS clause'
            },
            {
                pattern: /ALTER\s+TABLE\s+\w+\s+DROP\s+COLUMN\s+(?!IF\s+EXISTS)/i,
                message: 'DROP COLUMN should use IF EXISTS clause'
            }
        ];

        dangerousPatterns.forEach(check => {
            if (check.pattern.test(content)) {
                this.errors.push(`Safety: ${check.message}`);
            }
        });
    }

    /**
     * Validate migration safety
     * @param {string} content - Migration content
     * @param {string} filename - Migration filename
     */
    validateSafety(content, filename) {
        // Check for IF NOT EXISTS clauses
        const safetyChecks = [
            {
                pattern: /CREATE\s+TABLE\s+(?!IF\s+NOT\s+EXISTS)/i,
                message: 'CREATE TABLE should use IF NOT EXISTS clause'
            },
            {
                pattern: /CREATE\s+INDEX\s+(?!IF\s+NOT\s+EXISTS)/i,
                message: 'CREATE INDEX should use IF NOT EXISTS clause'
            },
            {
                pattern: /ALTER\s+TABLE\s+\w+\s+ADD\s+COLUMN\s+(?!IF\s+NOT\s+EXISTS)/i,
                message: 'ADD COLUMN should use IF NOT EXISTS clause'
            }
        ];

        safetyChecks.forEach(check => {
            if (check.pattern.test(content)) {
                this.warnings.push(`Safety: ${check.message}`);
            }
        });
    }

    /**
     * Validate migration structure
     * @param {string} content - Migration content
     * @param {string} filename - Migration filename
     */
    validateStructure(content, filename) {
        // Check for required sections
        const requiredSections = [
            {
                pattern: /--\s*Migration:/i,
                message: 'Migration header comment missing'
            },
            {
                pattern: /--\s*Description:/i,
                message: 'Description comment missing'
            },
            {
                pattern: /--\s*Created:/i,
                message: 'Created timestamp missing'
            },
            {
                pattern: /BEGIN/i,
                message: 'Transaction BEGIN statement missing'
            },
            {
                pattern: /COMMIT/i,
                message: 'Transaction COMMIT statement missing'
            }
        ];

        requiredSections.forEach(check => {
            if (!check.pattern.test(content)) {
                this.warnings.push(`Structure: ${check.message}`);
            }
        });
    }

    /**
     * Validate constraints
     * @param {string} content - Migration content
     * @param {string} filename - Migration filename
     */
    validateConstraints(content, filename) {
        // Check for proper constraint naming
        const constraintChecks = [
            {
                pattern: /ADD\s+CONSTRAINT\s+chk_\w+/i,
                message: 'Check constraints should be named with chk_ prefix'
            },
            {
                pattern: /ADD\s+CONSTRAINT\s+fk_\w+/i,
                message: 'Foreign key constraints should be named with fk_ prefix'
            }
        ];

        constraintChecks.forEach(check => {
            if (check.pattern.test(content)) {
                this.warnings.push(`Constraints: ${check.message}`);
            }
        });
    }

    /**
     * Validate indexes
     * @param {string} content - Migration content
     * @param {string} filename - Migration filename
     */
    validateIndexes(content, filename) {
        // Check for proper index naming
        const indexChecks = [
            {
                pattern: /CREATE\s+INDEX\s+idx_\w+/i,
                message: 'Indexes should be named with idx_ prefix'
            }
        ];

        indexChecks.forEach(check => {
            if (check.pattern.test(content)) {
                this.warnings.push(`Indexes: ${check.message}`);
            }
        });
    }

    /**
     * Validate all migrations in a directory
     * @param {string} migrationsDir - Path to migrations directory
     * @returns {Array} Array of validation results
     */
    async validateAllMigrations(migrationsDir) {
        const results = [];
        
        try {
            const files = fs.readdirSync(migrationsDir)
                .filter(file => file.endsWith('.sql'))
                .sort();

            for (const file of files) {
                const filePath = path.join(migrationsDir, file);
                const result = await this.validateMigration(filePath);
                results.push(result);
            }

            return results;
        } catch (error) {
            return [{
                valid: false,
                errors: [`Failed to read migrations directory: ${error.message}`],
                warnings: [],
                filename: 'directory',
                timestamp: new Date().toISOString()
            }];
        }
    }

    /**
     * Generate validation report
     * @param {Array} results - Validation results
     * @returns {string} Formatted report
     */
    generateReport(results) {
        const total = results.length;
        const valid = results.filter(r => r.valid).length;
        const invalid = total - valid;

        let report = `Migration Validation Report\n`;
        report += `Generated: ${new Date().toISOString()}\n`;
        report += `Total Migrations: ${total}\n`;
        report += `Valid: ${valid}\n`;
        report += `Invalid: ${invalid}\n\n`;

        results.forEach(result => {
            report += `File: ${result.filename}\n`;
            report += `Status: ${result.valid ? 'VALID' : 'INVALID'}\n`;
            
            if (result.errors.length > 0) {
                report += `Errors:\n`;
                result.errors.forEach(error => {
                    report += `  - ${error}\n`;
                });
            }
            
            if (result.warnings.length > 0) {
                report += `Warnings:\n`;
                result.warnings.forEach(warning => {
                    report += `  - ${warning}\n`;
                });
            }
            
            report += `\n`;
        });

        return report;
    }
}

module.exports = MigrationValidator;
