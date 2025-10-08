/**
 * Cleanup Tasks - Professional Task Management
 * 
 * This module provides a clean, modular approach to cleanup tasks
 * including session cleanup, secret cleanup, and IDE cleanup.
 */

class CleanupTasks {
  constructor(autoSecurityManager, authService, taskSessionRepository, ideManager, logger) {
    this.autoSecurityManager = autoSecurityManager;
    this.authService = authService;
    this.taskSessionRepository = taskSessionRepository;
    this.ideManager = ideManager;
    this.logger = logger;
  }

  /**
   * Setup all cleanup tasks
   */
  setupCleanupTasks() {
    this.logger.info('Setting up cleanup tasks...');

    // ========================================
    // SESSION CLEANUP - Session Management
    // ========================================
    this.setupSessionCleanup();

    // ========================================
    // SECRET CLEANUP - Security Management
    // ========================================
    this.setupSecretCleanup();

    // ========================================
    // TASK SESSION CLEANUP - Task Management
    // ========================================
    this.setupTaskSessionCleanup();

    // ========================================
    // IDE CLEANUP - IDE Management
    // ========================================
    this.setupIDECleanup();

    this.logger.info('Cleanup tasks setup complete');
  }

  setupSessionCleanup() {
    const sessionCleanupInterval = this.autoSecurityManager.getConfig().session?.cleanupInterval || 900000;
    setInterval(async () => {
      try {
        const result = await this.authService.cleanupExpiredSessions();
        this.logger.info(`Cleaned up ${result.expired} expired and ${result.orphaned} orphaned sessions`);
      } catch (error) {
        this.logger.error('Failed to cleanup expired sessions:', error);
      }
    }, sessionCleanupInterval);
  }

  setupSecretCleanup() {
    const secretsCleanupInterval = this.autoSecurityManager.getConfig().security?.cleanupInterval || 86400000;
    setInterval(async () => {
      try {
        await this.autoSecurityManager.cleanupOldSecrets();
        this.logger.info('Cleaned up old secrets');
      } catch (error) {
        this.logger.error('Failed to cleanup old secrets:', error);
      }
    }, secretsCleanupInterval);
  }

  setupTaskSessionCleanup() {
    const taskSessionCleanupInterval = this.autoSecurityManager.getConfig().taskSession?.cleanupInterval || 21600000;
    setInterval(async () => {
      try {
        if (this.taskSessionRepository) {
          await this.taskSessionRepository.cleanupOldSessions(7); // Keep sessions for 7 days
          this.logger.info('Cleaned up old Auto-Finish sessions');
        }
      } catch (error) {
        this.logger.error('Failed to cleanup old Auto-Finish sessions:', error);
      }
    }, taskSessionCleanupInterval);
  }

  setupIDECleanup() {
    const cleanupInterval = this.autoSecurityManager.getConfig().ide?.cleanupInterval || 30000;
    setInterval(async () => {
      try {
        if (this.ideManager && typeof this.ideManager.cleanupStaleIDEs === 'function') {
          await this.ideManager.cleanupStaleIDEs();
          // Silent cleanup - no logging here, IDEManager handles it
        }
      } catch (error) {
        this.logger.error('Failed to cleanup stale IDE entries:', error);
      }
    }, cleanupInterval);
  }
}

module.exports = CleanupTasks;
