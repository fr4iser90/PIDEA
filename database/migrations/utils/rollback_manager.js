/**
 * Rollback Manager Utility
 * Manages rollback operations for database migrations
 * Created: 2025-10-11T01:00:55.000Z
 * Version: 1.0.0
 */

const fs = require('fs');
const path = require('path');

class RollbackManager {
    constructor() {
        this.rollbackHistory = [];
        this.rollbackDir = path.join(__dirname, '..', 'rollback');
    }

    /**
     * Execute rollback for a specific migration
     * @param {string} migrationNumber - Migration number (e.g., '005')
     * @param {Object} dbConnection - Database connection
     * @returns {Object} Rollback result
     */
    async executeRollback(migrationNumber, dbConnection) {
        try {
            const rollbackFile = path.join(this.rollbackDir, `${migrationNumber}_rollback_*.sql`);
            const files = fs.readdirSync(this.rollbackDir)
                .filter(file => file.startsWith(`${migrationNumber}_rollback_`));

            if (files.length === 0) {
                throw new Error(`No rollback file found for migration ${migrationNumber}`);
            }

            const rollbackPath = path.join(this.rollbackDir, files[0]);
            const rollbackContent = fs.readFileSync(rollbackPath, 'utf8');

            // Execute rollback
            const result = await this.executeSQL(rollbackContent, dbConnection);

            // Record rollback history
            this.recordRollback({
                migrationNumber,
                rollbackFile: files[0],
                executedAt: new Date().toISOString(),
                success: result.success,
                error: result.error
            });

            return {
                success: result.success,
                migrationNumber,
                rollbackFile: files[0],
                executedAt: new Date().toISOString(),
                error: result.error
            };
        } catch (error) {
            this.recordRollback({
                migrationNumber,
                executedAt: new Date().toISOString(),
                success: false,
                error: error.message
            });

            return {
                success: false,
                migrationNumber,
                executedAt: new Date().toISOString(),
                error: error.message
            };
        }
    }

    /**
     * Execute SQL content
     * @param {string} sqlContent - SQL content to execute
     * @param {Object} dbConnection - Database connection
     * @returns {Object} Execution result
     */
    async executeSQL(sqlContent, dbConnection) {
        try {
            // Split SQL content into statements
            const statements = sqlContent
                .split(';')
                .map(stmt => stmt.trim())
                .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

            for (const statement of statements) {
                if (statement.trim()) {
                    await dbConnection.query(statement);
                }
            }

            return {
                success: true,
                statementsExecuted: statements.length
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Record rollback in history
     * @param {Object} rollbackInfo - Rollback information
     */
    recordRollback(rollbackInfo) {
        this.rollbackHistory.push(rollbackInfo);
        
        // Save to file for persistence
        const historyFile = path.join(this.rollbackDir, 'rollback_history.json');
        try {
            fs.writeFileSync(historyFile, JSON.stringify(this.rollbackHistory, null, 2));
        } catch (error) {
            console.warn(`Failed to save rollback history: ${error.message}`);
        }
    }

    /**
     * Load rollback history
     * @returns {Array} Rollback history
     */
    loadRollbackHistory() {
        const historyFile = path.join(this.rollbackDir, 'rollback_history.json');
        
        try {
            if (fs.existsSync(historyFile)) {
                const content = fs.readFileSync(historyFile, 'utf8');
                this.rollbackHistory = JSON.parse(content);
            }
        } catch (error) {
            console.warn(`Failed to load rollback history: ${error.message}`);
            this.rollbackHistory = [];
        }

        return this.rollbackHistory;
    }

    /**
     * Get rollback history
     * @returns {Array} Rollback history
     */
    getRollbackHistory() {
        return this.rollbackHistory;
    }

    /**
     * Check if migration can be rolled back
     * @param {string} migrationNumber - Migration number
     * @returns {boolean} Whether rollback is available
     */
    canRollback(migrationNumber) {
        const rollbackFiles = fs.readdirSync(this.rollbackDir)
            .filter(file => file.startsWith(`${migrationNumber}_rollback_`));

        return rollbackFiles.length > 0;
    }

    /**
     * Get available rollbacks
     * @returns {Array} List of available rollbacks
     */
    getAvailableRollbacks() {
        const rollbackFiles = fs.readdirSync(this.rollbackDir)
            .filter(file => file.endsWith('.sql'))
            .map(file => {
                const match = file.match(/(\d+)_rollback_(.+)\.sql/);
                if (match) {
                    return {
                        migrationNumber: match[1],
                        rollbackFile: file,
                        description: match[2].replace(/_/g, ' ')
                    };
                }
                return null;
            })
            .filter(item => item !== null);

        return rollbackFiles;
    }

    /**
     * Generate rollback report
     * @returns {string} Formatted rollback report
     */
    generateRollbackReport() {
        const history = this.loadRollbackHistory();
        const available = this.getAvailableRollbacks();

        let report = `Rollback Manager Report\n`;
        report += `Generated: ${new Date().toISOString()}\n\n`;

        report += `Available Rollbacks:\n`;
        available.forEach(rollback => {
            report += `  - Migration ${rollback.migrationNumber}: ${rollback.description}\n`;
        });

        report += `\nRollback History:\n`;
        if (history.length === 0) {
            report += `  No rollbacks executed\n`;
        } else {
            history.forEach(rollback => {
                report += `  - Migration ${rollback.migrationNumber}: `;
                report += `${rollback.success ? 'SUCCESS' : 'FAILED'} `;
                report += `(${rollback.executedAt})\n`;
                if (rollback.error) {
                    report += `    Error: ${rollback.error}\n`;
                }
            });
        }

        return report;
    }

    /**
     * Validate rollback file
     * @param {string} migrationNumber - Migration number
     * @returns {Object} Validation result
     */
    validateRollback(migrationNumber) {
        try {
            const rollbackFiles = fs.readdirSync(this.rollbackDir)
                .filter(file => file.startsWith(`${migrationNumber}_rollback_`));

            if (rollbackFiles.length === 0) {
                return {
                    valid: false,
                    error: `No rollback file found for migration ${migrationNumber}`
                };
            }

            const rollbackPath = path.join(this.rollbackDir, rollbackFiles[0]);
            const content = fs.readFileSync(rollbackPath, 'utf8');

            // Basic validation
            const validations = [
                {
                    pattern: /--\s*Rollback:/i,
                    message: 'Rollback header comment missing'
                },
                {
                    pattern: /--\s*Description:/i,
                    message: 'Description comment missing'
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

            const errors = [];
            validations.forEach(validation => {
                if (!validation.pattern.test(content)) {
                    errors.push(validation.message);
                }
            });

            return {
                valid: errors.length === 0,
                errors,
                rollbackFile: rollbackFiles[0]
            };
        } catch (error) {
            return {
                valid: false,
                error: error.message
            };
        }
    }
}

module.exports = RollbackManager;
