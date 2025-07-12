/**
 * Migration API - REST endpoints for migration infrastructure
 * 
 * This module provides comprehensive API endpoints for migration
 * management, status tracking, rollback operations, and analytics.
 */
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Import migration infrastructure
const {
  MigrationInfrastructureFactory,
  MigrationConfigBuilder,
  MigrationUtils
} = require('../../domain/workflows/migration');

// Import repository
const MigrationRepository = require('../../infrastructure/database/repositories/MigrationRepository');

// Initialize migration infrastructure
let migrationInfrastructure = null;
let migrationRepository = null;

/**
 * Initialize migration infrastructure
 */
async function initializeMigrationInfrastructure() {
  try {
    if (!migrationInfrastructure) {
      migrationInfrastructure = await MigrationInfrastructureFactory.create({
        manager: {
          enableRollback: true,
          enableValidation: true,
          enableMetrics: true,
          maxConcurrentMigrations: 10,
          timeoutSeconds: 300
        },
        tracker: {
          enableHistory: true,
          maxHistorySize: 1000,
          enableRealTimeUpdates: true
        },
        rollback: {
          enableAutomaticRollback: true,
          enableBackup: true,
          backupRetentionDays: 30
        },
        validator: {
          enableStrictValidation: true,
          enableSchemaValidation: true,
          enableDataIntegrity: true
        },
        metrics: {
          enableRealTimeMetrics: true,
          enableResourceTracking: true,
          enablePerformanceAlerts: true
        }
      });
    }

    if (!migrationRepository) {
      migrationRepository = new MigrationRepository({
        databaseConfig: {
          host: process.env.DB_HOST || 'localhost',
          port: process.env.DB_PORT || 5432,
          database: process.env.DB_NAME || 'pidea',
          user: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD || 'password'
        }
      });
      await migrationRepository.initialize();
    }

    console.log('Migration infrastructure initialized successfully');
  } catch (error) {
    console.error('Failed to initialize migration infrastructure:', error);
    throw error;
  }
}

// Initialize on module load
initializeMigrationInfrastructure().catch(console.error);

// ===== MIDDLEWARE =====

/**
 * Authentication middleware
 */
function authenticate(req, res, next) {
  // TODO: Implement proper authentication
  // For now, just check if user is authenticated
  if (!req.headers.authorization) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Please provide valid authentication credentials'
    });
  }
  next();
}

/**
 * Rate limiting middleware
 */
function rateLimit(req, res, next) {
  // TODO: Implement proper rate limiting
  // For now, just allow all requests
  next();
}

/**
 * Validation middleware
 */
function validateMigrationConfig(req, res, next) {
  const { name, phases } = req.body;
  
  if (!name || typeof name !== 'string') {
    return res.status(400).json({
      error: 'Invalid migration configuration',
      message: 'Migration name is required and must be a string'
    });
  }

  if (!phases || !Array.isArray(phases) || phases.length === 0) {
    return res.status(400).json({
      error: 'Invalid migration configuration',
      message: 'At least one phase is required'
    });
  }

  // Validate phases
  for (let i = 0; i < phases.length; i++) {
    const phase = phases[i];
    if (!phase.name || !phase.steps || !Array.isArray(phase.steps)) {
      return res.status(400).json({
        error: 'Invalid migration configuration',
        message: `Phase ${i + 1} must have a name and steps array`
      });
    }
  }

  next();
}

// ===== MIGRATION MANAGEMENT ENDPOINTS =====

/**
 * POST /api/migration
 * Create and execute a new migration
 */
router.post('/', authenticate, rateLimit, validateMigrationConfig, async (req, res) => {
  try {
    const {
      name,
      description = '',
      phases,
      dependencies = [],
      riskLevel = 'medium',
      options = {}
    } = req.body;

    // Build migration configuration
    const configBuilder = new MigrationConfigBuilder()
      .setName(name)
      .setDescription(description)
      .setRiskLevel(riskLevel)
      .setOptions(options);

    // Add dependencies
    for (const dependency of dependencies) {
      configBuilder.addDependency(dependency);
    }

    // Add phases
    for (const phase of phases) {
      configBuilder.addPhase(phase);
    }

    const migrationConfig = configBuilder.build();

    // Validate configuration
    const validation = MigrationUtils.validateConfig(migrationConfig);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Invalid migration configuration',
        validation: validation
      });
    }

    // Execute migration
    const result = await migrationInfrastructure.executeMigration(migrationConfig);

    // Generate report
    const report = MigrationUtils.generateReport(result);

    res.status(201).json({
      success: true,
      message: 'Migration created and executed successfully',
      migration: {
        id: result.id,
        name: migrationConfig.name,
        status: result.success ? 'completed' : 'failed',
        report: report
      }
    });

  } catch (error) {
    console.error('Migration creation failed:', error);
    res.status(500).json({
      error: 'Migration creation failed',
      message: error.message
    });
  }
});

/**
 * GET /api/migration
 * Get all migrations with optional filters
 */
router.get('/', authenticate, rateLimit, async (req, res) => {
  try {
    const {
      status,
      riskLevel,
      limit = 50,
      offset = 0,
      orderBy = 'created_at',
      orderDirection = 'DESC'
    } = req.query;

    const filters = {
      status,
      riskLevel,
      limit: parseInt(limit),
      offset: parseInt(offset),
      orderBy,
      orderDirection: orderDirection.toUpperCase()
    };

    const migrations = await migrationRepository.getMigrations(filters);

    res.json({
      success: true,
      migrations: migrations,
      pagination: {
        limit: filters.limit,
        offset: filters.offset,
        total: migrations.length
      }
    });

  } catch (error) {
    console.error('Failed to get migrations:', error);
    res.status(500).json({
      error: 'Failed to retrieve migrations',
      message: error.message
    });
  }
});

/**
 * GET /api/migration/:id
 * Get migration by ID
 */
router.get('/:id', authenticate, rateLimit, async (req, res) => {
  try {
    const { id } = req.params;

    const migration = await migrationRepository.getMigration(id);
    if (!migration) {
      return res.status(404).json({
        error: 'Migration not found',
        message: `Migration with ID ${id} not found`
      });
    }

    // Get phases and steps
    const phases = await migrationRepository.getPhases(id);
    const steps = [];
    for (const phase of phases) {
      const phaseSteps = await migrationRepository.getSteps(id, phase.phase_id);
      steps.push(...phaseSteps);
    }

    // Get summary
    const summary = await migrationRepository.getMigrationSummary(id);

    res.json({
      success: true,
      migration: {
        ...migration,
        phases: phases,
        steps: steps,
        summary: summary
      }
    });

  } catch (error) {
    console.error('Failed to get migration:', error);
    res.status(500).json({
      error: 'Failed to retrieve migration',
      message: error.message
    });
  }
});

/**
 * DELETE /api/migration/:id
 * Cancel a running migration
 */
router.delete('/:id', authenticate, rateLimit, async (req, res) => {
  try {
    const { id } = req.params;

    const migration = await migrationRepository.getMigration(id);
    if (!migration) {
      return res.status(404).json({
        error: 'Migration not found',
        message: `Migration with ID ${id} not found`
      });
    }

    if (migration.status !== 'running') {
      return res.status(400).json({
        error: 'Invalid operation',
        message: 'Only running migrations can be cancelled'
      });
    }

    // Stop migration
    await migrationInfrastructure.manager.stopMigration();

    // Update migration status
    await migrationRepository.updateMigration(id, {
      status: 'cancelled',
      endTime: new Date()
    });

    res.json({
      success: true,
      message: 'Migration cancelled successfully'
    });

  } catch (error) {
    console.error('Failed to cancel migration:', error);
    res.status(500).json({
      error: 'Failed to cancel migration',
      message: error.message
    });
  }
});

// ===== MIGRATION STATUS ENDPOINTS =====

/**
 * GET /api/migration/status
 * Get migration status overview
 */
router.get('/status/overview', authenticate, rateLimit, async (req, res) => {
  try {
    const [migrationStats, performanceStats, rollbackStats] = await Promise.all([
      migrationRepository.getMigrationStatistics(),
      migrationRepository.getPerformanceStatistics(),
      migrationRepository.getRollbackStatistics()
    ]);

    res.json({
      success: true,
      overview: {
        migrations: migrationStats,
        performance: performanceStats,
        rollback: rollbackStats
      }
    });

  } catch (error) {
    console.error('Failed to get status overview:', error);
    res.status(500).json({
      error: 'Failed to retrieve status overview',
      message: error.message
    });
  }
});

/**
 * GET /api/migration/status/active
 * Get active migrations
 */
router.get('/status/active', authenticate, rateLimit, async (req, res) => {
  try {
    const activeMigrations = migrationInfrastructure.tracker.getActiveMigrations();

    res.json({
      success: true,
      activeMigrations: activeMigrations
    });

  } catch (error) {
    console.error('Failed to get active migrations:', error);
    res.status(500).json({
      error: 'Failed to retrieve active migrations',
      message: error.message
    });
  }
});

/**
 * GET /api/migration/:id/status
 * Get detailed status for a specific migration
 */
router.get('/:id/status', authenticate, rateLimit, async (req, res) => {
  try {
    const { id } = req.params;

    const status = await migrationInfrastructure.getMigrationStatus(id);
    if (!status) {
      return res.status(404).json({
        error: 'Migration not found',
        message: `Migration with ID ${id} not found`
      });
    }

    res.json({
      success: true,
      status: status
    });

  } catch (error) {
    console.error('Failed to get migration status:', error);
    res.status(500).json({
      error: 'Failed to retrieve migration status',
      message: error.message
    });
  }
});

/**
 * GET /api/migration/:id/progress
 * Get real-time progress for a migration
 */
router.get('/:id/progress', authenticate, rateLimit, async (req, res) => {
  try {
    const { id } = req.params;

    const status = await migrationInfrastructure.getMigrationStatus(id);
    if (!status) {
      return res.status(404).json({
        error: 'Migration not found',
        message: `Migration with ID ${id} not found`
      });
    }

    res.json({
      success: true,
      progress: {
        percentage: status.progress?.percentage || 0,
        currentPhase: status.currentPhase,
        currentStep: status.currentStep,
        totalPhases: status.progress?.totalPhases || 0,
        completedPhases: status.progress?.completedPhases || 0,
        totalSteps: status.progress?.totalSteps || 0,
        completedSteps: status.progress?.completedSteps || 0,
        errors: status.errors?.length || 0,
        warnings: status.warnings?.length || 0
      }
    });

  } catch (error) {
    console.error('Failed to get migration progress:', error);
    res.status(500).json({
      error: 'Failed to retrieve migration progress',
      message: error.message
    });
  }
});

// ===== MIGRATION ROLLBACK ENDPOINTS =====

/**
 * POST /api/migration/:id/rollback
 * Rollback a migration
 */
router.post('/:id/rollback', authenticate, rateLimit, async (req, res) => {
  try {
    const { id } = req.params;
    const { options = {} } = req.body;

    const migration = await migrationRepository.getMigration(id);
    if (!migration) {
      return res.status(404).json({
        error: 'Migration not found',
        message: `Migration with ID ${id} not found`
      });
    }

    if (migration.status === 'running') {
      return res.status(400).json({
        error: 'Invalid operation',
        message: 'Cannot rollback a running migration'
      });
    }

    // Execute rollback
    const rollbackResult = await migrationInfrastructure.rollbackMigration(id, options);

    res.json({
      success: true,
      message: 'Migration rollback completed successfully',
      rollback: rollbackResult
    });

  } catch (error) {
    console.error('Failed to rollback migration:', error);
    res.status(500).json({
      error: 'Failed to rollback migration',
      message: error.message
    });
  }
});

/**
 * GET /api/migration/:id/rollback
 * Get rollback history for a migration
 */
router.get('/:id/rollback', authenticate, rateLimit, async (req, res) => {
  try {
    const { id } = req.params;

    const migration = await migrationRepository.getMigration(id);
    if (!migration) {
      return res.status(404).json({
        error: 'Migration not found',
        message: `Migration with ID ${id} not found`
      });
    }

    // Get rollback history
    const rollbackHistory = migrationInfrastructure.rollback.getRollbackHistory(id);

    res.json({
      success: true,
      rollbackHistory: rollbackHistory
    });

  } catch (error) {
    console.error('Failed to get rollback history:', error);
    res.status(500).json({
      error: 'Failed to retrieve rollback history',
      message: error.message
    });
  }
});

// ===== MIGRATION METRICS ENDPOINTS =====

/**
 * GET /api/migration/:id/metrics
 * Get metrics for a migration
 */
router.get('/:id/metrics', authenticate, rateLimit, async (req, res) => {
  try {
    const { id } = req.params;

    const migration = await migrationRepository.getMigration(id);
    if (!migration) {
      return res.status(404).json({
        error: 'Migration not found',
        message: `Migration with ID ${id} not found`
      });
    }

    const metrics = await migrationInfrastructure.getMigrationMetrics(id);

    res.json({
      success: true,
      metrics: metrics
    });

  } catch (error) {
    console.error('Failed to get migration metrics:', error);
    res.status(500).json({
      error: 'Failed to retrieve migration metrics',
      message: error.message
    });
  }
});

/**
 * GET /api/migration/:id/analytics
 * Get analytics for a migration
 */
router.get('/:id/analytics', authenticate, rateLimit, async (req, res) => {
  try {
    const { id } = req.params;
    const { type = 'performance_summary' } = req.query;

    const migration = await migrationRepository.getMigration(id);
    if (!migration) {
      return res.status(404).json({
        error: 'Migration not found',
        message: `Migration with ID ${id} not found`
      });
    }

    const analytics = await migrationRepository.calculatePerformanceAnalytics(id, type);

    res.json({
      success: true,
      analytics: analytics
    });

  } catch (error) {
    console.error('Failed to get migration analytics:', error);
    res.status(500).json({
      error: 'Failed to retrieve migration analytics',
      message: error.message
    });
  }
});

// ===== MIGRATION VALIDATION ENDPOINTS =====

/**
 * POST /api/migration/:id/validate
 * Validate a migration
 */
router.post('/:id/validate', authenticate, rateLimit, async (req, res) => {
  try {
    const { id } = req.params;

    const migration = await migrationRepository.getMigration(id);
    if (!migration) {
      return res.status(404).json({
        error: 'Migration not found',
        message: `Migration with ID ${id} not found`
      });
    }

    const validationResult = await migrationInfrastructure.validateMigration(id);

    res.json({
      success: true,
      validation: validationResult
    });

  } catch (error) {
    console.error('Failed to validate migration:', error);
    res.status(500).json({
      error: 'Failed to validate migration',
      message: error.message
    });
  }
});

// ===== MIGRATION BACKUP ENDPOINTS =====

/**
 * GET /api/migration/:id/backup
 * Get backup information for a migration
 */
router.get('/:id/backup', authenticate, rateLimit, async (req, res) => {
  try {
    const { id } = req.params;

    const migration = await migrationRepository.getMigration(id);
    if (!migration) {
      return res.status(404).json({
        error: 'Migration not found',
        message: `Migration with ID ${id} not found`
      });
    }

    const backupInfo = migrationInfrastructure.rollback.getBackupInfo(id);

    res.json({
      success: true,
      backups: backupInfo
    });

  } catch (error) {
    console.error('Failed to get backup info:', error);
    res.status(500).json({
      error: 'Failed to retrieve backup information',
      message: error.message
    });
  }
});

/**
 * POST /api/migration/:id/backup/:backupId/restore
 * Restore a backup
 */
router.post('/:id/backup/:backupId/restore', authenticate, rateLimit, async (req, res) => {
  try {
    const { id, backupId } = req.params;

    const migration = await migrationRepository.getMigration(id);
    if (!migration) {
      return res.status(404).json({
        error: 'Migration not found',
        message: `Migration with ID ${id} not found`
      });
    }

    const restoredData = await migrationInfrastructure.rollback.restoreBackup(backupId);

    res.json({
      success: true,
      message: 'Backup restored successfully',
      restoredData: restoredData
    });

  } catch (error) {
    console.error('Failed to restore backup:', error);
    res.status(500).json({
      error: 'Failed to restore backup',
      message: error.message
    });
  }
});

// ===== ADMINISTRATIVE ENDPOINTS =====

/**
 * GET /api/migration/admin/statistics
 * Get comprehensive statistics
 */
router.get('/admin/statistics', authenticate, rateLimit, async (req, res) => {
  try {
    const statistics = await migrationInfrastructure.getStatistics();

    res.json({
      success: true,
      statistics: statistics
    });

  } catch (error) {
    console.error('Failed to get statistics:', error);
    res.status(500).json({
      error: 'Failed to retrieve statistics',
      message: error.message
    });
  }
});

/**
 * POST /api/migration/admin/cleanup
 * Cleanup old data
 */
router.post('/admin/cleanup', authenticate, rateLimit, async (req, res) => {
  try {
    const { daysToKeep = 90 } = req.body;

    const [expiredBackups, oldMetrics] = await Promise.all([
      migrationRepository.cleanupExpiredBackups(),
      migrationRepository.cleanupOldMetrics(daysToKeep)
    ]);

    res.json({
      success: true,
      message: 'Cleanup completed successfully',
      cleanup: {
        expiredBackups: expiredBackups,
        oldMetrics: oldMetrics
      }
    });

  } catch (error) {
    console.error('Failed to perform cleanup:', error);
    res.status(500).json({
      error: 'Failed to perform cleanup',
      message: error.message
    });
  }
});

// ===== ERROR HANDLING =====

/**
 * 404 handler for undefined routes
 */
router.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: `The requested endpoint ${req.originalUrl} does not exist`
  });
});

/**
 * Global error handler
 */
router.use((error, req, res, next) => {
  console.error('Migration API error:', error);
  
  res.status(500).json({
    error: 'Internal server error',
    message: 'An unexpected error occurred while processing the request'
  });
});

module.exports = router; 