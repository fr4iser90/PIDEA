/**
 * MigrationTracker - Tracks migration progress and status
 */
class MigrationTracker {
  constructor() {
    this.migrations = new Map();
    this.logger = console;
  }

  /**
   * Initialize a new migration
   * @param {string} migrationId - Migration ID
   * @param {Object} options - Migration options
   * @returns {Promise<void>}
   */
  async initializeMigration(migrationId, options = {}) {
    const migration = {
      id: migrationId,
      status: 'initialized',
      startTime: new Date(),
      endTime: null,
      options,
      handlers: new Map(),
      results: [],
      error: null
    };

    this.migrations.set(migrationId, migration);
    this.logger.info(`[MigrationTracker] Initialized migration: ${migrationId}`);
  }

  /**
   * Update handler status
   * @param {string} migrationId - Migration ID
   * @param {string} handlerName - Handler name
   * @param {string} status - Handler status
   * @param {string} error - Error message (optional)
   * @returns {Promise<void>}
   */
  async updateHandlerStatus(migrationId, handlerName, status, error = null) {
    const migration = this.migrations.get(migrationId);
    if (!migration) {
      throw new Error(`Migration not found: ${migrationId}`);
    }

    const handlerStatus = {
      name: handlerName,
      status,
      updatedAt: new Date(),
      error
    };

    migration.handlers.set(handlerName, handlerStatus);
    this.logger.info(`[MigrationTracker] Updated handler status: ${handlerName} -> ${status}`);
  }

  /**
   * Finalize migration
   * @param {string} migrationId - Migration ID
   * @param {Array} results - Migration results
   * @returns {Promise<void>}
   */
  async finalizeMigration(migrationId, results = []) {
    const migration = this.migrations.get(migrationId);
    if (!migration) {
      throw new Error(`Migration not found: ${migrationId}`);
    }

    migration.status = 'completed';
    migration.endTime = new Date();
    migration.results = results;

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    this.logger.info(`[MigrationTracker] Finalized migration: ${migrationId}`, {
      total: results.length,
      success: successCount,
      failures: failureCount
    });
  }

  /**
   * Get migration status
   * @param {string} migrationId - Migration ID
   * @returns {Promise<Object>} Migration status
   */
  async getMigrationStatus(migrationId) {
    const migration = this.migrations.get(migrationId);
    if (!migration) {
      return null;
    }

    const handlerStatuses = Array.from(migration.handlers.values());
    const successCount = handlerStatuses.filter(h => h.status === 'completed').length;
    const failureCount = handlerStatuses.filter(h => h.status === 'failed').length;
    const pendingCount = handlerStatuses.filter(h => h.status === 'pending').length;

    return {
      id: migration.id,
      status: migration.status,
      startTime: migration.startTime,
      endTime: migration.endTime,
      duration: migration.endTime ? migration.endTime - migration.startTime : Date.now() - migration.startTime,
      totalHandlers: migration.handlers.size,
      completedHandlers: successCount,
      failedHandlers: failureCount,
      pendingHandlers: pendingCount,
      handlers: handlerStatuses,
      results: migration.results,
      error: migration.error
    };
  }

  /**
   * Get all migrations
   * @returns {Promise<Array>} All migrations
   */
  async getAllMigrations() {
    const migrations = [];
    for (const [id, migration] of this.migrations) {
      const status = await this.getMigrationStatus(id);
      migrations.push(status);
    }
    return migrations;
  }

  /**
   * Clear migration data
   * @param {string} migrationId - Migration ID
   * @returns {Promise<void>}
   */
  async clearMigration(migrationId) {
    this.migrations.delete(migrationId);
    this.logger.info(`[MigrationTracker] Cleared migration: ${migrationId}`);
  }
}

module.exports = MigrationTracker; 