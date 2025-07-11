/**
 * GitWorkflowAudit - Auditing and logging for Git workflow operations
 * Provides comprehensive audit trail and compliance logging
 */
class GitWorkflowAudit {
  constructor(options = {}) {
    this.enabled = options.enabled !== false;
    this.auditLog = [];
    this.maxLogSize = options.maxLogSize || 10000;
    this.retentionDays = options.retentionDays || 30;
    this.logger = options.logger || console;
    
    // Audit levels
    this.levels = {
      INFO: 'info',
      WARNING: 'warning',
      ERROR: 'error',
      SECURITY: 'security',
      COMPLIANCE: 'compliance'
    };
    
    // Audit categories
    this.categories = {
      WORKFLOW_START: 'workflow_start',
      WORKFLOW_COMPLETE: 'workflow_complete',
      WORKFLOW_FAIL: 'workflow_fail',
      BRANCH_CREATE: 'branch_create',
      BRANCH_DELETE: 'branch_delete',
      MERGE_ATTEMPT: 'merge_attempt',
      MERGE_COMPLETE: 'merge_complete',
      PULL_REQUEST_CREATE: 'pull_request_create',
      REVIEW_COMPLETE: 'review_complete',
      PERMISSION_CHECK: 'permission_check',
      VALIDATION_FAIL: 'validation_fail',
      SECURITY_VIOLATION: 'security_violation'
    };
  }

  /**
   * Audit workflow execution
   * @param {Object} task - Task object
   * @param {Object} results - Workflow results
   * @param {Object} options - Audit options
   */
  auditWorkflow(task, results, options = {}) {
    if (!this.enabled) {
      return;
    }
    
    const auditEntry = {
      timestamp: new Date(),
      level: this.levels.INFO,
      category: this.categories.WORKFLOW_COMPLETE,
      taskId: task.id,
      taskType: task.type?.value,
      taskTitle: task.title,
      userId: options.userId || 'system',
      projectPath: task.metadata?.projectPath,
      automationLevel: task.metadata?.automationLevel,
      success: results.success,
      duration: results.duration,
      stepResults: results.getAllStepResults(),
      metadata: {
        ...options,
        auditId: this.generateAuditId(),
        sessionId: options.sessionId
      }
    };
    
    this.addAuditEntry(auditEntry);
    
    // Log to external logger
    this.logger.info('GitWorkflowAudit: Workflow completed', {
      taskId: task.id,
      success: results.success,
      duration: results.duration,
      auditId: auditEntry.metadata.auditId
    });
  }

  /**
   * Audit workflow failure
   * @param {Object} task - Task object
   * @param {Error} error - Error object
   * @param {Object} options - Audit options
   */
  auditWorkflowFailure(task, error, options = {}) {
    if (!this.enabled) {
      return;
    }
    
    const auditEntry = {
      timestamp: new Date(),
      level: this.levels.ERROR,
      category: this.categories.WORKFLOW_FAIL,
      taskId: task.id,
      taskType: task.type?.value,
      taskTitle: task.title,
      userId: options.userId || 'system',
      projectPath: task.metadata?.projectPath,
      automationLevel: task.metadata?.automationLevel,
      success: false,
      error: {
        message: error.message,
        name: error.name,
        stack: error.stack,
        recoverable: error.recoverable
      },
      metadata: {
        ...options,
        auditId: this.generateAuditId(),
        sessionId: options.sessionId
      }
    };
    
    this.addAuditEntry(auditEntry);
    
    // Log to external logger
    this.logger.error('GitWorkflowAudit: Workflow failed', {
      taskId: task.id,
      error: error.message,
      auditId: auditEntry.metadata.auditId
    });
  }

  /**
   * Audit branch creation
   * @param {Object} task - Task object
   * @param {Object} branchResult - Branch creation result
   * @param {Object} options - Audit options
   */
  auditBranchCreation(task, branchResult, options = {}) {
    if (!this.enabled) {
      return;
    }
    
    const auditEntry = {
      timestamp: new Date(),
      level: this.levels.INFO,
      category: this.categories.BRANCH_CREATE,
      taskId: task.id,
      taskType: task.type?.value,
      userId: options.userId || 'system',
      projectPath: task.metadata?.projectPath,
      branchName: branchResult.branchName,
      baseBranch: branchResult.baseBranch,
      success: branchResult.success,
      metadata: {
        ...options,
        auditId: this.generateAuditId(),
        strategy: branchResult.strategy
      }
    };
    
    this.addAuditEntry(auditEntry);
  }

  /**
   * Audit merge operation
   * @param {Object} task - Task object
   * @param {Object} mergeResult - Merge result
   * @param {Object} options - Audit options
   */
  auditMergeOperation(task, mergeResult, options = {}) {
    if (!this.enabled) {
      return;
    }
    
    const auditEntry = {
      timestamp: new Date(),
      level: this.levels.INFO,
      category: this.categories.MERGE_COMPLETE,
      taskId: task.id,
      taskType: task.type?.value,
      userId: options.userId || 'system',
      projectPath: task.metadata?.projectPath,
      sourceBranch: mergeResult.sourceBranch,
      targetBranch: mergeResult.targetBranch,
      mergeStrategy: mergeResult.strategy,
      success: mergeResult.success,
      metadata: {
        ...options,
        auditId: this.generateAuditId(),
        method: mergeResult.method
      }
    };
    
    this.addAuditEntry(auditEntry);
  }

  /**
   * Audit pull request creation
   * @param {Object} task - Task object
   * @param {Object} prResult - Pull request result
   * @param {Object} options - Audit options
   */
  auditPullRequestCreation(task, prResult, options = {}) {
    if (!this.enabled) {
      return;
    }
    
    const auditEntry = {
      timestamp: new Date(),
      level: this.levels.INFO,
      category: this.categories.PULL_REQUEST_CREATE,
      taskId: task.id,
      taskType: task.type?.value,
      userId: options.userId || 'system',
      projectPath: task.metadata?.projectPath,
      prId: prResult.id,
      prUrl: prResult.url,
      sourceBranch: prResult.sourceBranch,
      targetBranch: prResult.targetBranch,
      reviewers: prResult.reviewers,
      success: prResult.success,
      metadata: {
        ...options,
        auditId: this.generateAuditId(),
        labels: prResult.labels
      }
    };
    
    this.addAuditEntry(auditEntry);
  }

  /**
   * Audit review completion
   * @param {Object} task - Task object
   * @param {Object} reviewResult - Review result
   * @param {Object} options - Audit options
   */
  auditReviewCompletion(task, reviewResult, options = {}) {
    if (!this.enabled) {
      return;
    }
    
    const auditEntry = {
      timestamp: new Date(),
      level: this.levels.INFO,
      category: this.categories.REVIEW_COMPLETE,
      taskId: task.id,
      taskType: task.type?.value,
      userId: options.userId || 'system',
      projectPath: task.metadata?.projectPath,
      prId: reviewResult.prId,
      reviewScore: reviewResult.score,
      reviewDepth: reviewResult.reviewDepth,
      success: reviewResult.success,
      metadata: {
        ...options,
        auditId: this.generateAuditId(),
        recommendations: reviewResult.recommendations
      }
    };
    
    this.addAuditEntry(auditEntry);
  }

  /**
   * Audit permission check
   * @param {Object} task - Task object
   * @param {Object} permissionResult - Permission check result
   * @param {Object} options - Audit options
   */
  auditPermissionCheck(task, permissionResult, options = {}) {
    if (!this.enabled) {
      return;
    }
    
    const auditEntry = {
      timestamp: new Date(),
      level: permissionResult.granted ? this.levels.INFO : this.levels.SECURITY,
      category: this.categories.PERMISSION_CHECK,
      taskId: task.id,
      taskType: task.type?.value,
      userId: options.userId || 'system',
      projectPath: task.metadata?.projectPath,
      operation: permissionResult.operation,
      resource: permissionResult.resource,
      granted: permissionResult.granted,
      reason: permissionResult.reason,
      metadata: {
        ...options,
        auditId: this.generateAuditId(),
        permissions: permissionResult.permissions
      }
    };
    
    this.addAuditEntry(auditEntry);
    
    // Log security violations
    if (!permissionResult.granted) {
      this.logger.warn('GitWorkflowAudit: Permission denied', {
        taskId: task.id,
        operation: permissionResult.operation,
        resource: permissionResult.resource,
        reason: permissionResult.reason,
        auditId: auditEntry.metadata.auditId
      });
    }
  }

  /**
   * Audit validation failure
   * @param {Object} task - Task object
   * @param {Object} validationResult - Validation result
   * @param {Object} options - Audit options
   */
  auditValidationFailure(task, validationResult, options = {}) {
    if (!this.enabled) {
      return;
    }
    
    const auditEntry = {
      timestamp: new Date(),
      level: this.levels.WARNING,
      category: this.categories.VALIDATION_FAIL,
      taskId: task.id,
      taskType: task.type?.value,
      userId: options.userId || 'system',
      projectPath: task.metadata?.projectPath,
      errors: validationResult.errors,
      warnings: validationResult.warnings,
      metadata: {
        ...options,
        auditId: this.generateAuditId(),
        validationDuration: validationResult.duration
      }
    };
    
    this.addAuditEntry(auditEntry);
    
    // Log validation failures
    this.logger.warn('GitWorkflowAudit: Validation failed', {
      taskId: task.id,
      errors: validationResult.errors,
      warnings: validationResult.warnings,
      auditId: auditEntry.metadata.auditId
    });
  }

  /**
   * Audit security violation
   * @param {Object} task - Task object
   * @param {Object} violation - Security violation details
   * @param {Object} options - Audit options
   */
  auditSecurityViolation(task, violation, options = {}) {
    if (!this.enabled) {
      return;
    }
    
    const auditEntry = {
      timestamp: new Date(),
      level: this.levels.SECURITY,
      category: this.categories.SECURITY_VIOLATION,
      taskId: task.id,
      taskType: task.type?.value,
      userId: options.userId || 'system',
      projectPath: task.metadata?.projectPath,
      violationType: violation.type,
      violationDetails: violation.details,
      severity: violation.severity,
      metadata: {
        ...options,
        auditId: this.generateAuditId(),
        ipAddress: violation.ipAddress,
        userAgent: violation.userAgent
      }
    };
    
    this.addAuditEntry(auditEntry);
    
    // Log security violations
    this.logger.error('GitWorkflowAudit: Security violation detected', {
      taskId: task.id,
      violationType: violation.type,
      severity: violation.severity,
      auditId: auditEntry.metadata.auditId
    });
  }

  /**
   * Add audit entry to log
   * @param {Object} entry - Audit entry
   */
  addAuditEntry(entry) {
    if (!this.enabled) {
      return;
    }
    
    // Add entry to log
    this.auditLog.push(entry);
    
    // Maintain log size
    if (this.auditLog.length > this.maxLogSize) {
      this.auditLog.shift();
    }
    
    // Clean up old entries
    this.cleanupOldEntries();
  }

  /**
   * Clean up old audit entries
   */
  cleanupOldEntries() {
    if (!this.enabled) {
      return;
    }
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);
    
    this.auditLog = this.auditLog.filter(entry => 
      entry.timestamp > cutoffDate
    );
  }

  /**
   * Generate unique audit ID
   * @returns {string} Audit ID
   */
  generateAuditId() {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get audit log
   * @param {Object} filters - Filter options
   * @returns {Array} Filtered audit log
   */
  getAuditLog(filters = {}) {
    if (!this.enabled) {
      return [];
    }
    
    let filteredLog = [...this.auditLog];
    
    // Apply filters
    if (filters.level) {
      filteredLog = filteredLog.filter(entry => entry.level === filters.level);
    }
    
    if (filters.category) {
      filteredLog = filteredLog.filter(entry => entry.category === filters.category);
    }
    
    if (filters.taskId) {
      filteredLog = filteredLog.filter(entry => entry.taskId === filters.taskId);
    }
    
    if (filters.userId) {
      filteredLog = filteredLog.filter(entry => entry.userId === filters.userId);
    }
    
    if (filters.startDate) {
      filteredLog = filteredLog.filter(entry => entry.timestamp >= filters.startDate);
    }
    
    if (filters.endDate) {
      filteredLog = filteredLog.filter(entry => entry.timestamp <= filters.endDate);
    }
    
    if (filters.success !== undefined) {
      filteredLog = filteredLog.filter(entry => entry.success === filters.success);
    }
    
    // Sort by timestamp (newest first)
    filteredLog.sort((a, b) => b.timestamp - a.timestamp);
    
    // Apply limit
    if (filters.limit) {
      filteredLog = filteredLog.slice(0, filters.limit);
    }
    
    return filteredLog;
  }

  /**
   * Get audit statistics
   * @returns {Object} Audit statistics
   */
  getAuditStatistics() {
    if (!this.enabled) {
      return {};
    }
    
    const stats = {
      totalEntries: this.auditLog.length,
      levels: {},
      categories: {},
      successRate: 0,
      averageDuration: 0,
      recentActivity: 0
    };
    
    // Count by level
    for (const entry of this.auditLog) {
      stats.levels[entry.level] = (stats.levels[entry.level] || 0) + 1;
    }
    
    // Count by category
    for (const entry of this.auditLog) {
      stats.categories[entry.category] = (stats.categories[entry.category] || 0) + 1;
    }
    
    // Calculate success rate
    const successfulEntries = this.auditLog.filter(entry => entry.success === true);
    const totalWithSuccess = this.auditLog.filter(entry => entry.success !== undefined);
    stats.successRate = totalWithSuccess.length > 0 ? 
      Math.round((successfulEntries.length / totalWithSuccess.length) * 100) : 0;
    
    // Calculate average duration
    const entriesWithDuration = this.auditLog.filter(entry => entry.duration);
    if (entriesWithDuration.length > 0) {
      const totalDuration = entriesWithDuration.reduce((sum, entry) => sum + entry.duration, 0);
      stats.averageDuration = Math.round(totalDuration / entriesWithDuration.length);
    }
    
    // Count recent activity (last 24 hours)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    stats.recentActivity = this.auditLog.filter(entry => entry.timestamp > oneDayAgo).length;
    
    return stats;
  }

  /**
   * Export audit log
   * @param {Object} options - Export options
   * @returns {Object} Exported audit data
   */
  exportAuditLog(options = {}) {
    if (!this.enabled) {
      return { entries: [], statistics: {} };
    }
    
    const filters = options.filters || {};
    const entries = this.getAuditLog(filters);
    const statistics = this.getAuditStatistics();
    
    return {
      entries,
      statistics,
      exportTimestamp: new Date(),
      exportOptions: options
    };
  }

  /**
   * Clear audit log
   */
  clearAuditLog() {
    if (!this.enabled) {
      return;
    }
    
    this.auditLog = [];
    this.logger.info('GitWorkflowAudit: Audit log cleared');
  }

  /**
   * Enable/disable auditing
   * @param {boolean} enabled - Whether auditing is enabled
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    this.logger.info(`GitWorkflowAudit: Auditing ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Set log size limit
   * @param {number} maxSize - Maximum log size
   */
  setMaxLogSize(maxSize) {
    this.maxLogSize = maxSize;
    
    // Trim log if necessary
    if (this.auditLog.length > maxSize) {
      this.auditLog = this.auditLog.slice(-maxSize);
    }
  }

  /**
   * Set retention period
   * @param {number} days - Retention period in days
   */
  setRetentionDays(days) {
    this.retentionDays = days;
    this.cleanupOldEntries();
  }
}

module.exports = GitWorkflowAudit; 