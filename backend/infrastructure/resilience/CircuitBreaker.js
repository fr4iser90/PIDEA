/**
 * CircuitBreaker - Circuit breaker pattern implementation
 * Implements resilience patterns for external service calls
 * 
 * Created: 2025-01-27
 * Purpose: Circuit breaker pattern for fault tolerance
 */

const Logger = require("@logging/Logger");
const EventBus = require("@infrastructure/messaging/EventBus");

class CircuitBreaker {
  constructor(options = {}) {
    this.logger = options.logger || new Logger("CircuitBreaker");
    this.eventBus = options.eventBus || new EventBus();
    
    // Circuit breaker states
    this.CLOSED = 'CLOSED';
    this.OPEN = 'OPEN';
    this.HALF_OPEN = 'HALF_OPEN';
    
    // Configuration
    this.failureThreshold = options.failureThreshold || 5;
    this.timeout = options.timeout || 60000; // 1 minute
    this.resetTimeout = options.resetTimeout || 30000; // 30 seconds
    
    // State
    this.state = this.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
    
    // Metrics
    this.totalRequests = 0;
    this.successfulRequests = 0;
    this.failedRequests = 0;
    this.circuitOpenCount = 0;
  }

  /**
   * Execute function with circuit breaker protection
   * @param {Function} fn - Function to execute
   * @param {Array} args - Function arguments
   * @returns {Promise<any>} Function result
   */
  async execute(fn, ...args) {
    this.totalRequests++;
    
    // Check if circuit is open
    if (this.state === this.OPEN) {
      if (Date.now() < this.nextAttemptTime) {
        this.circuitOpenCount++;
        throw new Error('Circuit breaker is OPEN');
      }
      
      // Transition to half-open
      this.state = this.HALF_OPEN;
      this.logger.debug('Circuit breaker transitioned to HALF_OPEN');
      
      // Emit state change event
      this.eventBus.emit('circuit-breaker.state-changed', {
        state: this.HALF_OPEN,
        timestamp: new Date().toISOString()
      });
    }

    try {
      const result = await fn(...args);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  onSuccess() {
    this.successfulRequests++;
    
    if (this.state === this.HALF_OPEN) {
      // Reset circuit breaker
      this.state = this.CLOSED;
      this.failureCount = 0;
      this.lastFailureTime = null;
      this.nextAttemptTime = null;
      
      this.logger.debug('Circuit breaker reset to CLOSED');
      
      // Emit state change event
      this.eventBus.emit('circuit-breaker.state-changed', {
        state: this.CLOSED,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Handle failed execution
   */
  onFailure() {
    this.failedRequests++;
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.state === this.HALF_OPEN) {
      // Transition back to open
      this.state = this.OPEN;
      this.nextAttemptTime = Date.now() + this.resetTimeout;
      
      this.logger.debug('Circuit breaker transitioned to OPEN from HALF_OPEN');
      
      // Emit state change event
      this.eventBus.emit('circuit-breaker.state-changed', {
        state: this.OPEN,
        timestamp: new Date().toISOString()
      });
    } else if (this.state === this.CLOSED && this.failureCount >= this.failureThreshold) {
      // Transition to open
      this.state = this.OPEN;
      this.nextAttemptTime = Date.now() + this.resetTimeout;
      
      this.logger.debug('Circuit breaker transitioned to OPEN');
      
      // Emit state change event
      this.eventBus.emit('circuit-breaker.state-changed', {
        state: this.OPEN,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Check if circuit breaker is open
   * @returns {boolean} True if circuit is open
   */
  isOpen() {
    return this.state === this.OPEN;
  }

  /**
   * Check if circuit breaker is closed
   * @returns {boolean} True if circuit is closed
   */
  isClosed() {
    return this.state === this.CLOSED;
  }

  /**
   * Check if circuit breaker is half-open
   * @returns {boolean} True if circuit is half-open
   */
  isHalfOpen() {
    return this.state === this.HALF_OPEN;
  }

  /**
   * Get current state
   * @returns {string} Current state
   */
  getState() {
    return this.state;
  }

  /**
   * Get circuit breaker metrics
   * @returns {Object} Metrics
   */
  getMetrics() {
    const successRate = this.totalRequests > 0 
      ? (this.successfulRequests / this.totalRequests) * 100 
      : 0;

    return {
      state: this.state,
      failureCount: this.failureCount,
      totalRequests: this.totalRequests,
      successfulRequests: this.successfulRequests,
      failedRequests: this.failedRequests,
      circuitOpenCount: this.circuitOpenCount,
      successRate: Math.round(successRate * 100) / 100,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime,
      failureThreshold: this.failureThreshold,
      resetTimeout: this.resetTimeout
    };
  }

  /**
   * Reset circuit breaker
   */
  reset() {
    this.state = this.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
    
    this.logger.info('Circuit breaker reset');
    
    // Emit reset event
    this.eventBus.emit('circuit-breaker.reset', {
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Force circuit breaker to open state
   */
  forceOpen() {
    this.state = this.OPEN;
    this.nextAttemptTime = Date.now() + this.resetTimeout;
    
    this.logger.info('Circuit breaker forced to OPEN');
    
    // Emit forced open event
    this.eventBus.emit('circuit-breaker.forced-open', {
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Force circuit breaker to closed state
   */
  forceClosed() {
    this.state = this.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
    
    this.logger.info('Circuit breaker forced to CLOSED');
    
    // Emit forced closed event
    this.eventBus.emit('circuit-breaker.forced-closed', {
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = CircuitBreaker;
