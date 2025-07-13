const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

/**
 * HandlerAudit - Audit logging and tracking for handlers
 * 
 * This class provides comprehensive audit logging for handler operations,
 * including execution tracking, security events, and compliance reporting.
 */
class HandlerAudit {
  /**
   * Create a new handler audit system
   * @param {Object} options - Audit options
   */
  constructor(options = {}) {
    this.auditLog = [];
    this.securityEvents = [];
    this.complianceRecords = [];
    this.options = {
      enableAudit: options.enableAudit !== false,
      enableSecurityAudit: options.enableSecurityAudit !== false,
      enableComplianceAudit: options.enableComplianceAudit !== false,
      retentionPeriod: options.retentionPeriod || 30 * 24 * 60 * 60 * 1000, // 30 days
      maxAuditRecords: options.maxAuditRecords || 10000,
      maxSecurityEvents: options.maxSecurityEvents || 5000,
      enableEncryption: options.enableEncryption !== false,
      enableCompression: options.enableCompression !== false,
      ...options
    };
  }

  /**
   * Audit handler execution
   * @param {string} handlerId - Handler identifier
   * @param {Object} data - Execution data
   * @returns {Promise<void>} Audit result
   */
  async auditHandlerExecution(handlerId, data) {
    if (!this.options.enableAudit) {
      return;
    }

    try {
      const timestamp = new Date();
      const auditRecord = {
        id: this.generateAuditId(),
        type: 'HANDLER_EXECUTION',
        handlerId,
        timestamp,
        data: {
          handlerType: data.handler?.getType() || 'unknown',
          handlerName: data.handler?.getMetadata()?.name || 'unknown',
          requestType: data.request?.type || 'unknown',
          success: data.result?.isSuccess() || false,
          duration: data.duration || 0,
          requestSize: JSON.stringify(data.request || {}).length,
          responseSize: JSON.stringify(data.result || {}).length,
          error: data.result?.getError() || null,
          userId: data.request?.userId || 'anonymous',
          sessionId: data.request?.sessionId || null,
          ipAddress: data.request?.ipAddress || null,
          userAgent: data.request?.userAgent || null,
          ...data.metadata
        },
        security: {
          riskLevel: this.calculateRiskLevel(data),
          suspicious: this.detectSuspiciousActivity(data),
          compliance: this.checkCompliance(data)
        }
      };

      // Add to audit log
      this.addAuditRecord(auditRecord);

      // Check for security events
      if (this.options.enableSecurityAudit) {
        await this.checkSecurityEvents(auditRecord);
      }

      // Check for compliance violations
      if (this.options.enableComplianceAudit) {
        await this.checkComplianceViolations(auditRecord);
      }

    } catch (error) {
      logger.error('HandlerAudit: Failed to audit handler execution', {
        handlerId,
        error: error.message
      });
    }
  }

  /**
   * Audit handler registration
   * @param {string} handlerId - Handler identifier
   * @param {Object} data - Registration data
   * @returns {Promise<void>} Audit result
   */
  async auditHandlerRegistration(handlerId, data) {
    if (!this.options.enableAudit) {
      return;
    }

    try {
      const timestamp = new Date();
      const auditRecord = {
        id: this.generateAuditId(),
        type: 'HANDLER_REGISTRATION',
        handlerId,
        timestamp,
        data: {
          handlerType: data.handler?.getType() || 'unknown',
          handlerName: data.handler?.getMetadata()?.name || 'unknown',
          adapterType: data.adapter?.getType() || 'unknown',
          registeredBy: data.registeredBy || 'system',
          metadata: data.handler?.getMetadata() || {},
          dependencies: data.handler?.getDependencies() || []
        },
        security: {
          riskLevel: 'LOW',
          suspicious: false,
          compliance: { compliant: true, violations: [] }
        }
      };

      this.addAuditRecord(auditRecord);

    } catch (error) {
      logger.error('HandlerAudit: Failed to audit handler registration', {
        handlerId,
        error: error.message
      });
    }
  }

  /**
   * Audit handler failure
   * @param {string} handlerId - Handler identifier
   * @param {Object} data - Failure data
   * @returns {Promise<void>} Audit result
   */
  async auditHandlerFailure(handlerId, data) {
    if (!this.options.enableAudit) {
      return;
    }

    try {
      const timestamp = new Date();
      const auditRecord = {
        id: this.generateAuditId(),
        type: 'HANDLER_FAILURE',
        handlerId,
        timestamp,
        data: {
          handlerType: data.handler?.getType() || 'unknown',
          handlerName: data.handler?.getMetadata()?.name || 'unknown',
          requestType: data.request?.type || 'unknown',
          error: data.error?.message || 'Unknown error',
          errorType: data.error?.constructor?.name || 'Error',
          stack: data.error?.stack || null,
          duration: data.duration || 0,
          userId: data.request?.userId || 'anonymous',
          sessionId: data.request?.sessionId || null,
          ipAddress: data.request?.ipAddress || null,
          userAgent: data.request?.userAgent || null
        },
        security: {
          riskLevel: this.calculateRiskLevel(data),
          suspicious: this.detectSuspiciousActivity(data),
          compliance: this.checkCompliance(data)
        }
      };

      this.addAuditRecord(auditRecord);

      // Check for security events
      if (this.options.enableSecurityAudit) {
        await this.checkSecurityEvents(auditRecord);
      }

    } catch (error) {
      logger.error('HandlerAudit: Failed to audit handler failure', {
        handlerId,
        error: error.message
      });
    }
  }

  /**
   * Audit security event
   * @param {string} eventType - Security event type
   * @param {Object} data - Event data
   * @returns {Promise<void>} Audit result
   */
  async auditSecurityEvent(eventType, data) {
    if (!this.options.enableSecurityAudit) {
      return;
    }

    try {
      const timestamp = new Date();
      const securityEvent = {
        id: this.generateAuditId(),
        type: eventType,
        timestamp,
        severity: data.severity || 'MEDIUM',
        data: {
          handlerId: data.handlerId || null,
          userId: data.userId || 'anonymous',
          sessionId: data.sessionId || null,
          ipAddress: data.ipAddress || null,
          userAgent: data.userAgent || null,
          description: data.description || '',
          details: data.details || {},
          ...data
        }
      };

      this.addSecurityEvent(securityEvent);

    } catch (error) {
      logger.error('HandlerAudit: Failed to audit security event', {
        eventType,
        error: error.message
      });
    }
  }

  /**
   * Add audit record
   * @param {Object} record - Audit record
   */
  addAuditRecord(record) {
    this.auditLog.push(record);

    // Clean up old records
    this.cleanupAuditLog();
  }

  /**
   * Add security event
   * @param {Object} event - Security event
   */
  addSecurityEvent(event) {
    this.securityEvents.push(event);

    // Clean up old events
    this.cleanupSecurityEvents();
  }

  /**
   * Clean up audit log
   */
  cleanupAuditLog() {
    const cutoffTime = new Date(Date.now() - this.options.retentionPeriod);
    this.auditLog = this.auditLog.filter(record => record.timestamp > cutoffTime);

    // Limit number of records
    if (this.auditLog.length > this.options.maxAuditRecords) {
      this.auditLog = this.auditLog.slice(-this.options.maxAuditRecords);
    }
  }

  /**
   * Clean up security events
   */
  cleanupSecurityEvents() {
    const cutoffTime = new Date(Date.now() - this.options.retentionPeriod);
    this.securityEvents = this.securityEvents.filter(event => event.timestamp > cutoffTime);

    // Limit number of events
    if (this.securityEvents.length > this.options.maxSecurityEvents) {
      this.securityEvents = this.securityEvents.slice(-this.options.maxSecurityEvents);
    }
  }

  /**
   * Calculate risk level
   * @param {Object} data - Execution data
   * @returns {string} Risk level
   */
  calculateRiskLevel(data) {
    let riskScore = 0;

    // Check for sensitive operations
    const sensitiveTypes = ['admin', 'system', 'security', 'user_management'];
    if (sensitiveTypes.some(type => data.request?.type?.includes(type))) {
      riskScore += 3;
    }

    // Check for large requests
    const requestSize = JSON.stringify(data.request || {}).length;
    if (requestSize > 1024 * 1024) { // 1MB
      riskScore += 2;
    }

    // Check for errors
    if (!data.result?.isSuccess()) {
      riskScore += 2;
    }

    // Check for long execution times
    if (data.duration > 30000) { // 30 seconds
      riskScore += 1;
    }

    // Check for anonymous users
    if (!data.request?.userId || data.request?.userId === 'anonymous') {
      riskScore += 1;
    }

    if (riskScore >= 5) return 'HIGH';
    if (riskScore >= 3) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Detect suspicious activity
   * @param {Object} data - Execution data
   * @returns {boolean} True if suspicious
   */
  detectSuspiciousActivity(data) {
    // Check for rapid successive requests
    const recentRequests = this.auditLog.filter(record => 
      record.data.userId === data.request?.userId &&
      record.timestamp > new Date(Date.now() - 60000) // Last minute
    );

    if (recentRequests.length > 10) {
      return true;
    }

    // Check for failed requests pattern
    const recentFailures = recentRequests.filter(record => 
      record.type === 'HANDLER_FAILURE'
    );

    if (recentFailures.length > 5) {
      return true;
    }

    // Check for unusual request sizes
    const requestSize = JSON.stringify(data.request || {}).length;
    if (requestSize > 10 * 1024 * 1024) { // 10MB
      return true;
    }

    return false;
  }

  /**
   * Check compliance
   * @param {Object} data - Execution data
   * @returns {Object} Compliance result
   */
  checkCompliance(data) {
    const violations = [];

    // Check for required fields
    if (!data.request?.userId) {
      violations.push('MISSING_USER_ID');
    }

    if (!data.request?.sessionId) {
      violations.push('MISSING_SESSION_ID');
    }

    // Check for data retention compliance
    const sensitiveData = ['password', 'token', 'key', 'secret'];
    const requestString = JSON.stringify(data.request || {});
    if (sensitiveData.some(term => requestString.includes(term))) {
      violations.push('SENSITIVE_DATA_EXPOSURE');
    }

    // Check for audit trail completeness
    if (!data.request?.timestamp) {
      violations.push('MISSING_TIMESTAMP');
    }

    return {
      compliant: violations.length === 0,
      violations
    };
  }

  /**
   * Check security events
   * @param {Object} auditRecord - Audit record
   * @returns {Promise<void>} Security check result
   */
  async checkSecurityEvents(auditRecord) {
    try {
      // Check for high-risk activities
      if (auditRecord.security.riskLevel === 'HIGH') {
        await this.auditSecurityEvent('HIGH_RISK_ACTIVITY', {
          handlerId: auditRecord.handlerId,
          userId: auditRecord.data.userId,
          sessionId: auditRecord.data.sessionId,
          ipAddress: auditRecord.data.ipAddress,
          description: `High-risk handler execution: ${auditRecord.data.handlerName}`,
          details: auditRecord.data
        });
      }

      // Check for suspicious activity
      if (auditRecord.security.suspicious) {
        await this.auditSecurityEvent('SUSPICIOUS_ACTIVITY', {
          handlerId: auditRecord.handlerId,
          userId: auditRecord.data.userId,
          sessionId: auditRecord.data.sessionId,
          ipAddress: auditRecord.data.ipAddress,
          description: `Suspicious handler activity detected`,
          details: auditRecord.data
        });
      }

      // Check for compliance violations
      if (!auditRecord.security.compliance.compliant) {
        await this.auditSecurityEvent('COMPLIANCE_VIOLATION', {
          handlerId: auditRecord.handlerId,
          userId: auditRecord.data.userId,
          sessionId: auditRecord.data.sessionId,
          ipAddress: auditRecord.data.ipAddress,
          description: `Compliance violation detected`,
          details: {
            violations: auditRecord.security.compliance.violations,
            ...auditRecord.data
          }
        });
      }

    } catch (error) {
      logger.error('HandlerAudit: Security event check failed', error.message);
    }
  }

  /**
   * Check compliance violations
   * @param {Object} auditRecord - Audit record
   * @returns {Promise<void>} Compliance check result
   */
  async checkComplianceViolations(auditRecord) {
    try {
      if (!auditRecord.security.compliance.compliant) {
        const complianceRecord = {
          id: this.generateAuditId(),
          timestamp: auditRecord.timestamp,
          handlerId: auditRecord.handlerId,
          userId: auditRecord.data.userId,
          violations: auditRecord.security.compliance.violations,
          severity: auditRecord.security.riskLevel,
          description: `Compliance violation in handler execution`,
          details: auditRecord.data
        };

        this.complianceRecords.push(complianceRecord);
      }
    } catch (error) {
      logger.error('HandlerAudit: Compliance violation check failed', error.message);
    }
  }

  /**
   * Generate audit ID
   * @returns {string} Audit ID
   */
  generateAuditId() {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get audit log
   * @param {Object} filters - Filter options
   * @returns {Array<Object>} Filtered audit log
   */
  getAuditLog(filters = {}) {
    let filteredLog = [...this.auditLog];

    // Apply filters
    if (filters.handlerId) {
      filteredLog = filteredLog.filter(record => record.handlerId === filters.handlerId);
    }

    if (filters.type) {
      filteredLog = filteredLog.filter(record => record.type === filters.type);
    }

    if (filters.userId) {
      filteredLog = filteredLog.filter(record => record.data.userId === filters.userId);
    }

    if (filters.startDate) {
      filteredLog = filteredLog.filter(record => record.timestamp >= filters.startDate);
    }

    if (filters.endDate) {
      filteredLog = filteredLog.filter(record => record.timestamp <= filters.endDate);
    }

    if (filters.riskLevel) {
      filteredLog = filteredLog.filter(record => record.security.riskLevel === filters.riskLevel);
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
   * Get security events
   * @param {Object} filters - Filter options
   * @returns {Array<Object>} Filtered security events
   */
  getSecurityEvents(filters = {}) {
    let filteredEvents = [...this.securityEvents];

    // Apply filters
    if (filters.type) {
      filteredEvents = filteredEvents.filter(event => event.type === filters.type);
    }

    if (filters.severity) {
      filteredEvents = filteredEvents.filter(event => event.severity === filters.severity);
    }

    if (filters.handlerId) {
      filteredEvents = filteredEvents.filter(event => event.data.handlerId === filters.handlerId);
    }

    if (filters.userId) {
      filteredEvents = filteredEvents.filter(event => event.data.userId === filters.userId);
    }

    if (filters.startDate) {
      filteredEvents = filteredEvents.filter(event => event.timestamp >= filters.startDate);
    }

    if (filters.endDate) {
      filteredEvents = filteredEvents.filter(event => event.timestamp <= filters.endDate);
    }

    // Sort by timestamp (newest first)
    filteredEvents.sort((a, b) => b.timestamp - a.timestamp);

    // Apply limit
    if (filters.limit) {
      filteredEvents = filteredEvents.slice(0, filters.limit);
    }

    return filteredEvents;
  }

  /**
   * Get compliance records
   * @param {Object} filters - Filter options
   * @returns {Array<Object>} Filtered compliance records
   */
  getComplianceRecords(filters = {}) {
    let filteredRecords = [...this.complianceRecords];

    // Apply filters
    if (filters.handlerId) {
      filteredRecords = filteredRecords.filter(record => record.handlerId === filters.handlerId);
    }

    if (filters.userId) {
      filteredRecords = filteredRecords.filter(record => record.userId === filters.userId);
    }

    if (filters.severity) {
      filteredRecords = filteredRecords.filter(record => record.severity === filters.severity);
    }

    if (filters.startDate) {
      filteredRecords = filteredRecords.filter(record => record.timestamp >= filters.startDate);
    }

    if (filters.endDate) {
      filteredRecords = filteredRecords.filter(record => record.timestamp <= filters.endDate);
    }

    // Sort by timestamp (newest first)
    filteredRecords.sort((a, b) => b.timestamp - a.timestamp);

    // Apply limit
    if (filters.limit) {
      filteredRecords = filteredRecords.slice(0, filters.limit);
    }

    return filteredRecords;
  }

  /**
   * Get audit summary
   * @returns {Object} Audit summary
   */
  getAuditSummary() {
    const totalRecords = this.auditLog.length;
    const totalSecurityEvents = this.securityEvents.length;
    const totalComplianceViolations = this.complianceRecords.length;

    const riskLevels = {
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0
    };

    const eventTypes = {};

    this.auditLog.forEach(record => {
      riskLevels[record.security.riskLevel]++;
      eventTypes[record.type] = (eventTypes[record.type] || 0) + 1;
    });

    return {
      totalRecords,
      totalSecurityEvents,
      totalComplianceViolations,
      riskLevels,
      eventTypes,
      retentionPeriod: this.options.retentionPeriod,
      maxRecords: this.options.maxAuditRecords,
      enabled: this.options.enableAudit,
      securityEnabled: this.options.enableSecurityAudit,
      complianceEnabled: this.options.enableComplianceAudit
    };
  }

  /**
   * Export audit data
   * @returns {Object} Exported audit data
   */
  exportAuditData() {
    return {
      auditLog: this.auditLog,
      securityEvents: this.securityEvents,
      complianceRecords: this.complianceRecords,
      summary: this.getAuditSummary(),
      exportTime: new Date(),
      version: '1.0.0'
    };
  }

  /**
   * Clear audit data
   * @param {string} type - Type of data to clear (optional, clears all if not provided)
   */
  clearAuditData(type = null) {
    if (type === 'audit' || type === null) {
      this.auditLog = [];
    }
    if (type === 'security' || type === null) {
      this.securityEvents = [];
    }
    if (type === 'compliance' || type === null) {
      this.complianceRecords = [];
    }
  }
}

module.exports = HandlerAudit; 