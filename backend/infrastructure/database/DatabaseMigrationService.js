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
        
        // Create migrations table if it doesn't exist
        await this.createMigrationsTable();
        
        // Run pending migrations
        await this.runPendingMigrations();
        
        this.logger.info('✅ Database migration service initialized');
    }

    async createMigrationsTable() {
        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS migrations (
                id SERIAL PRIMARY KEY,
                migration_name TEXT UNIQUE NOT NULL,
                applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                status TEXT DEFAULT 'applied',
                execution_time_ms INTEGER
            );
        `;
        
        await this.databaseConnection.execute(createTableSQL);
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
            const result = await this.databaseConnection.query(
                'SELECT migration_name FROM migrations WHERE status = $1 ORDER BY applied_at',
                ['applied']
            );
            
            return result.map(row => row.migration_name);
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
            
            // Execute migration
            await this.databaseConnection.execute(migrationSQL);
            
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
            await this.databaseConnection.execute(
                'INSERT INTO migrations (migration_name, status, execution_time_ms) VALUES ($1, $2, $3)',
                [migrationName, status, executionTime]
            );
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
}

module.exports = DatabaseMigrationService; 