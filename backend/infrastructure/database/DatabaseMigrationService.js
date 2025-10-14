const fs = require('fs');
const path = require('path');
const Logger = require('@logging/Logger');

class DatabaseMigrationService {
    constructor(databaseConnection) {
        this.databaseConnection = databaseConnection;
        this.logger = new Logger('DatabaseMigrationService');
        this.migrationsPath = path.join(__dirname, '../../../database/migrations');
    }

    async initialize() {
        this.logger.info('🔧 Initializing database migration service...');
        
        try {
            // Create migrations table if it doesn't exist
            this.logger.info('🔧 Creating migrations table...');
            await this.createMigrationsTable();
            this.logger.info('✅ Migrations table created successfully');
            
            // Run pending migrations
            this.logger.info('🔧 Running pending migrations...');
            await this.runPendingMigrations();
            this.logger.info('✅ Pending migrations completed');
            
            this.logger.info('✅ Database migration service initialized');
        } catch (error) {
            this.logger.error('❌ Database migration service initialization failed:', error);
            throw error;
        }
    }

    async createMigrationsTable() {
        let createTableSQL;
        
        if (this.databaseConnection.getType() === 'postgresql') {
            // PostgreSQL-Syntax
            createTableSQL = `
                CREATE TABLE IF NOT EXISTS migrations (
                    id SERIAL PRIMARY KEY,
                    migration_name VARCHAR(255) UNIQUE NOT NULL,
                    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    status VARCHAR(50) DEFAULT 'applied',
                    execution_time_ms INTEGER
                );
            `;
        } else {
            // SQLite-Syntax
            createTableSQL = `
                CREATE TABLE IF NOT EXISTS migrations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    migration_name TEXT UNIQUE NOT NULL,
                    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    status TEXT DEFAULT 'applied',
                    execution_time_ms INTEGER
                );
            `;
        }
        
        // Execute with appropriate connection
        if (this.databaseConnection.getType() === 'sqlite') {
            await this.databaseConnection.dbConnection.execute(createTableSQL);
        } else {
            await this.databaseConnection.query(createTableSQL);
        }
        
        this.logger.debug('✅ Migrations table created/verified');
    }

    async runPendingMigrations() {
        try {
            // Get list of migration files
            const migrationFiles = this.getMigrationFiles();
            
            // Get applied migrations from database
            const appliedMigrations = await this.getAppliedMigrations();
            
            // Find pending migrations
            const pendingMigrations = migrationFiles.filter(
                file => !appliedMigrations.includes(file)
            );
            
            if (pendingMigrations.length === 0) {
                this.logger.info('✅ No pending migrations found');
                return;
            }
            
            this.logger.info(`🔄 Found ${pendingMigrations.length} pending migrations`);
            
            // Run each pending migration
            for (const migrationFile of pendingMigrations) {
                await this.runMigration(migrationFile);
            }
            
            this.logger.info('✅ All migrations completed successfully');
            
        } catch (error) {
            this.logger.error('❌ Error running migrations:', error);
            throw error;
        }
    }

    getMigrationFiles() {
        try {
            const files = fs.readdirSync(this.migrationsPath)
                .filter(file => file.endsWith('.sql'))
                .sort(); // Ensure order by filename
            
            this.logger.debug(`📁 Found ${files.length} migration files`);
            return files;
        } catch (error) {
            this.logger.error('❌ Error reading migration files:', error);
            return [];
        }
    }

    async getAppliedMigrations() {
        try {
            let query, params;
            
            if (this.databaseConnection.getType() === 'postgresql') {
                query = 'SELECT migration_name FROM migrations WHERE status = $1 ORDER BY applied_at';
                params = ['applied'];
            } else {
                query = 'SELECT migration_name FROM migrations WHERE status = ? ORDER BY applied_at';
                params = ['applied'];
            }
            
            const result = await this.databaseConnection.query(query, params);
            
            // DEBUG: Log what we got
            this.logger.info('🔍 [getAppliedMigrations] Query result:', { 
                resultType: typeof result,
                hasRows: !!result.rows,
                rowCount: result.rows?.length || 0,
                firstRow: result.rows?.[0] || 'none'
            });
            
            const rows = result.rows || result;
            const migrationNames = rows.map(row => row.migration_name);
            
            this.logger.info('🔍 [getAppliedMigrations] Found applied migrations:', migrationNames);
            
            return migrationNames;
        } catch (error) {
            this.logger.error('❌ Error getting applied migrations:', error);
            return [];
        }
    }

    async runMigration(migrationFile) {
        const startTime = Date.now();
        
        try {
            this.logger.info(`🔄 Running migration: ${migrationFile}`);
            
            // Read migration file
            const migrationPath = path.join(this.migrationsPath, migrationFile);
            const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
            
            // Execute migration with SQL translation for SQLite
            if (this.databaseConnection.getType() === 'sqlite') {
                this.logger.info(`🔄 Using SQLite translation for migration`);
                // Split migration into individual statements and translate each one
                const statements = this.parseSQLStatements(migrationSQL);
                this.logger.info(`🔄 Found ${statements.length} SQL statements in migration`);
                
                for (let i = 0; i < statements.length; i++) {
                    const statement = statements[i];
                    
                    // Skip empty statements and comments FIRST
                    if (!statement.trim() || statement.trim().startsWith('--')) {
                        this.logger.debug(`🔧 Skipping empty/comment statement ${i + 1}: ${statement.substring(0, 50)}...`);
                        continue;
                    }
                    
                    try {
                        this.logger.debug(`🔧 Executing statement ${i + 1}: ${statement.substring(0, 100)}...`);
                        this.logger.debug(`🔧 Full statement ${i + 1}: ${statement}`);
                        
                        // Use DatabaseConnection.execute() which handles SQLite translation automatically
                        await this.databaseConnection.execute(statement);
                        this.logger.debug(`✅ Statement ${i + 1} executed successfully`);
                    } catch (error) {
                        this.logger.warn(`⚠️ Statement ${i + 1} failed: ${error.message}`);
                        this.logger.warn(`⚠️ Failed statement ${i + 1}: ${statement}`);
                        // Continue with other statements unless it's a critical error
                        if (!error.message.includes('already exists') && 
                            !error.message.includes('duplicate column name') &&
                            !error.message.includes('duplicate key') &&
                            !error.message.includes('SQLITE_MISUSE')) {
                            throw error;
                        }
                    }
                }
            } else {
                // Execute migration directly for PostgreSQL
                await this.databaseConnection.execute(migrationSQL);
            }
            
            // Record migration as applied
            const executionTime = Date.now() - startTime;
            await this.recordMigration(migrationFile, 'applied', executionTime);
            
            this.logger.info(`✅ Migration completed: ${migrationFile} (${executionTime}ms)`);
            
        } catch (error) {
            const executionTime = Date.now() - startTime;
            await this.recordMigration(migrationFile, 'failed', executionTime);
            
            this.logger.error(`❌ Migration failed: ${migrationFile}`, error);
            throw error;
        }
    }

    async recordMigration(migrationName, status, executionTime) {
        try {
            let query, params;
            
            if (this.databaseConnection.getType() === 'postgresql') {
                query = 'INSERT INTO migrations (migration_name, status, execution_time_ms) VALUES ($1, $2, $3)';
                params = [migrationName, status, executionTime];
            } else {
                query = 'INSERT INTO migrations (migration_name, status, execution_time_ms) VALUES (?, ?, ?)';
                params = [migrationName, status, executionTime];
            }
            
            await this.databaseConnection.execute(query, params);
        } catch (error) {
            this.logger.error('❌ Error recording migration:', error);
        }
    }

    async getMigrationStatus() {
        try {
            const result = await this.databaseConnection.query(
                'SELECT migration_name, status, applied_at, execution_time_ms FROM migrations ORDER BY applied_at DESC'
            );
            
            return result;
        } catch (error) {
            this.logger.error('❌ Error getting migration status:', error);
            return [];
        }
    }

    parseSQLStatements(sql) {
        // Remove SQL comments first
        const sqlWithoutComments = sql
            .split('\n')
            .map(line => {
                const commentIndex = line.indexOf('--');
                return commentIndex >= 0 ? line.substring(0, commentIndex) : line;
            })
            .join('\n');
        
        // Handle DO $$ ... $$ blocks specially for PostgreSQL
        const statements = [];
        let remainingSQL = sqlWithoutComments;
        
        while (remainingSQL.length > 0) {
            // Look for DO $$ blocks
            const doBlockMatch = remainingSQL.match(/DO\s*\$\$([\s\S]*?)\$\$\s*;/i);
            
            if (doBlockMatch) {
                // Extract the DO block as a single statement
                const doBlock = doBlockMatch[0];
                statements.push(doBlock.trim());
                
                // Remove the DO block from remaining SQL
                remainingSQL = remainingSQL.substring(doBlockMatch.index + doBlock.length);
            } else {
                // No more DO blocks, split by semicolons normally
                const semicolonIndex = remainingSQL.indexOf(';');
                if (semicolonIndex >= 0) {
                    const statement = remainingSQL.substring(0, semicolonIndex + 1).trim();
                    if (statement.length > 0) {
                        statements.push(statement);
                    }
                    remainingSQL = remainingSQL.substring(semicolonIndex + 1);
                } else {
                    // No more semicolons, add remaining SQL if not empty
                    const statement = remainingSQL.trim();
                    if (statement.length > 0) {
                        statements.push(statement);
                    }
                    break;
                }
            }
        }
        
        // Filter out empty statements
        const filteredStatements = statements.filter(stmt => stmt.length > 0);
        
        // Log only the count of statements
        this.logger.debug(`📝 Parsed ${filteredStatements.length} SQL statements`);
        
        return filteredStatements;
    }
}

module.exports = DatabaseMigrationService; 