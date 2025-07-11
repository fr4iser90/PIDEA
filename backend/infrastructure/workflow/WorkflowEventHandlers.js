/**
 * WorkflowEventHandlers
 * Service for managing workflow event handling and processing
 */
const { v4: uuidv4 } = require('uuid');

class WorkflowEventHandlers {
  constructor(workflowRepository, eventBus, logger = console) {
    this.workflowRepository = workflowRepository;
    this.eventBus = eventBus;
    this.logger = logger;
    this.handlers = new Map();
    this.isInitialized = false;
  }

  /**
   * Initialize event handlers
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    this.logger.info('WorkflowEventHandlers: Initializing event handlers');

    // Register event handlers
    this.registerEventHandlers();

    // Subscribe to events
    await this.subscribeToEvents();

    this.isInitialized = true;
    this.logger.info('WorkflowEventHandlers: Event handlers initialized successfully');
  }

  /**
   * Register event handlers
   */
  registerEventHandlers() {
    // Workflow execution events
    this.handlers.set('workflow.execution.started', this.handleWorkflowExecutionStarted.bind(this));
    this.handlers.set('workflow.execution.completed', this.handleWorkflowExecutionCompleted.bind(this));
    this.handlers.set('workflow.execution.failed', this.handleWorkflowExecutionFailed.bind(this));
    this.handlers.set('workflow.execution.cancelled', this.handleWorkflowExecutionCancelled.bind(this));

    // Workflow step events
    this.handlers.set('workflow.step.started', this.handleWorkflowStepStarted.bind(this));
    this.handlers.set('workflow.step.completed', this.handleWorkflowStepCompleted.bind(this));
    this.handlers.set('workflow.step.failed', this.handleWorkflowStepFailed.bind(this));

    // Handler events
    this.handlers.set('handler.execution.started', this.handleHandlerExecutionStarted.bind(this));
    this.handlers.set('handler.execution.completed', this.handleHandlerExecutionCompleted.bind(this));
    this.handlers.set('handler.execution.failed', this.handleHandlerExecutionFailed.bind(this));

    // Performance events
    this.handlers.set('workflow.performance.metric', this.handleWorkflowPerformanceMetric.bind(this));
    this.handlers.set('workflow.performance.alert', this.handleWorkflowPerformanceAlert.bind(this));

    // System events
    this.handlers.set('workflow.cleanup.required', this.handleWorkflowCleanupRequired.bind(this));
    this.handlers.set('workflow.maintenance.required', this.handleWorkflowMaintenanceRequired.bind(this));

    this.logger.debug('WorkflowEventHandlers: Registered event handlers', {
      handlerCount: this.handlers.size,
      handlers: Array.from(this.handlers.keys())
    });
  }

  /**
   * Subscribe to events
   */
  async subscribeToEvents() {
    for (const [eventType, handler] of this.handlers) {
      try {
        await this.eventBus.subscribe(eventType, handler);
        this.logger.debug('WorkflowEventHandlers: Subscribed to event', {
          eventType
        });
      } catch (error) {
        this.logger.error('WorkflowEventHandlers: Failed to subscribe to event', {
          eventType,
          error: error.message
        });
      }
    }
  }

  /**
   * Handle workflow execution started event
   * @param {Object} event - Event data
   */
  async handleWorkflowExecutionStarted(event) {
    try {
      this.logger.info('WorkflowEventHandlers: Handling workflow execution started', {
        executionId: event.executionId,
        workflowId: event.workflowId
      });

      // Update execution status
      await this.workflowRepository.updateExecution(event.executionId, {
        status: 'running',
        startTime: new Date()
      });

      // Record performance metric
      await this.workflowRepository.recordExecutionMetrics(event.executionId, {
        metricName: 'workflow_start_time',
        metricValue: Date.now(),
        metricUnit: 'timestamp',
        metricType: 'performance',
        metricCategory: 'timing',
        metadata: { event: 'execution_started' }
      });

      this.logger.debug('WorkflowEventHandlers: Workflow execution started handled successfully', {
        executionId: event.executionId
      });
    } catch (error) {
      this.logger.error('WorkflowEventHandlers: Failed to handle workflow execution started', {
        executionId: event.executionId,
        error: error.message
      });
    }
  }

  /**
   * Handle workflow execution completed event
   * @param {Object} event - Event data
   */
  async handleWorkflowExecutionCompleted(event) {
    try {
      this.logger.info('WorkflowEventHandlers: Handling workflow execution completed', {
        executionId: event.executionId,
        workflowId: event.workflowId
      });

      const endTime = new Date();
      const execution = await this.workflowRepository.getExecutionWithMetrics(event.executionId);
      
      if (execution) {
        const startTime = new Date(execution.start_time);
        const actualDuration = endTime.getTime() - startTime.getTime();

        // Update execution status
        await this.workflowRepository.updateExecution(event.executionId, {
          status: 'completed',
          endTime,
          actualDuration,
          resultData: event.result
        });

        // Record completion metrics
        await this.workflowRepository.recordExecutionMetrics(event.executionId, {
          metricName: 'workflow_completion_time',
          metricValue: endTime.getTime(),
          metricUnit: 'timestamp',
          metricType: 'performance',
          metricCategory: 'timing',
          metadata: { event: 'execution_completed' }
        });

        await this.workflowRepository.recordExecutionMetrics(event.executionId, {
          metricName: 'workflow_total_duration',
          metricValue: actualDuration,
          metricUnit: 'milliseconds',
          metricType: 'performance',
          metricCategory: 'duration',
          metadata: { event: 'execution_completed' }
        });
      }

      this.logger.debug('WorkflowEventHandlers: Workflow execution completed handled successfully', {
        executionId: event.executionId
      });
    } catch (error) {
      this.logger.error('WorkflowEventHandlers: Failed to handle workflow execution completed', {
        executionId: event.executionId,
        error: error.message
      });
    }
  }

  /**
   * Handle workflow execution failed event
   * @param {Object} event - Event data
   */
  async handleWorkflowExecutionFailed(event) {
    try {
      this.logger.info('WorkflowEventHandlers: Handling workflow execution failed', {
        executionId: event.executionId,
        workflowId: event.workflowId
      });

      const endTime = new Date();
      const execution = await this.workflowRepository.getExecutionWithMetrics(event.executionId);
      
      if (execution) {
        const startTime = new Date(execution.start_time);
        const actualDuration = endTime.getTime() - startTime.getTime();

        // Update execution status
        await this.workflowRepository.updateExecution(event.executionId, {
          status: 'failed',
          endTime,
          actualDuration,
          errorData: {
            error: event.error,
            stack: event.stack,
            timestamp: endTime.toISOString()
          }
        });

        // Record failure metrics
        await this.workflowRepository.recordExecutionMetrics(event.executionId, {
          metricName: 'workflow_failure_time',
          metricValue: endTime.getTime(),
          metricUnit: 'timestamp',
          metricType: 'performance',
          metricCategory: 'timing',
          metadata: { event: 'execution_failed', error: event.error }
        });
      }

      this.logger.debug('WorkflowEventHandlers: Workflow execution failed handled successfully', {
        executionId: event.executionId
      });
    } catch (error) {
      this.logger.error('WorkflowEventHandlers: Failed to handle workflow execution failed', {
        executionId: event.executionId,
        error: error.message
      });
    }
  }

  /**
   * Handle workflow execution cancelled event
   * @param {Object} event - Event data
   */
  async handleWorkflowExecutionCancelled(event) {
    try {
      this.logger.info('WorkflowEventHandlers: Handling workflow execution cancelled', {
        executionId: event.executionId,
        workflowId: event.workflowId
      });

      const endTime = new Date();
      const execution = await this.workflowRepository.getExecutionWithMetrics(event.executionId);
      
      if (execution) {
        const startTime = new Date(execution.start_time);
        const actualDuration = endTime.getTime() - startTime.getTime();

        // Update execution status
        await this.workflowRepository.updateExecution(event.executionId, {
          status: 'cancelled',
          endTime,
          actualDuration,
          metadata: {
            ...execution.metadata,
            cancelledBy: event.cancelledBy,
            cancellationReason: event.reason
          }
        });

        // Record cancellation metrics
        await this.workflowRepository.recordExecutionMetrics(event.executionId, {
          metricName: 'workflow_cancellation_time',
          metricValue: endTime.getTime(),
          metricUnit: 'timestamp',
          metricType: 'performance',
          metricCategory: 'timing',
          metadata: { event: 'execution_cancelled', reason: event.reason }
        });
      }

      this.logger.debug('WorkflowEventHandlers: Workflow execution cancelled handled successfully', {
        executionId: event.executionId
      });
    } catch (error) {
      this.logger.error('WorkflowEventHandlers: Failed to handle workflow execution cancelled', {
        executionId: event.executionId,
        error: error.message
      });
    }
  }

  /**
   * Handle workflow step started event
   * @param {Object} event - Event data
   */
  async handleWorkflowStepStarted(event) {
    try {
      this.logger.debug('WorkflowEventHandlers: Handling workflow step started', {
        executionId: event.executionId,
        stepId: event.stepId,
        stepName: event.stepName
      });

      // Record step start metric
      await this.workflowRepository.recordExecutionMetrics(event.executionId, {
        metricName: 'step_started',
        metricValue: Date.now(),
        metricUnit: 'timestamp',
        metricType: 'performance',
        metricCategory: 'step_timing',
        metadata: { 
          stepId: event.stepId,
          stepName: event.stepName,
          event: 'step_started'
        }
      });

      this.logger.debug('WorkflowEventHandlers: Workflow step started handled successfully', {
        executionId: event.executionId,
        stepId: event.stepId
      });
    } catch (error) {
      this.logger.error('WorkflowEventHandlers: Failed to handle workflow step started', {
        executionId: event.executionId,
        stepId: event.stepId,
        error: error.message
      });
    }
  }

  /**
   * Handle workflow step completed event
   * @param {Object} event - Event data
   */
  async handleWorkflowStepCompleted(event) {
    try {
      this.logger.debug('WorkflowEventHandlers: Handling workflow step completed', {
        executionId: event.executionId,
        stepId: event.stepId,
        stepName: event.stepName
      });

      // Record step completion metrics
      await this.workflowRepository.recordExecutionMetrics(event.executionId, {
        metricName: 'step_completed',
        metricValue: Date.now(),
        metricUnit: 'timestamp',
        metricType: 'performance',
        metricCategory: 'step_timing',
        metadata: { 
          stepId: event.stepId,
          stepName: event.stepName,
          event: 'step_completed'
        }
      });

      if (event.duration) {
        await this.workflowRepository.recordExecutionMetrics(event.executionId, {
          metricName: 'step_duration',
          metricValue: event.duration,
          metricUnit: 'milliseconds',
          metricType: 'performance',
          metricCategory: 'step_duration',
          metadata: { 
            stepId: event.stepId,
            stepName: event.stepName
          }
        });
      }

      this.logger.debug('WorkflowEventHandlers: Workflow step completed handled successfully', {
        executionId: event.executionId,
        stepId: event.stepId
      });
    } catch (error) {
      this.logger.error('WorkflowEventHandlers: Failed to handle workflow step completed', {
        executionId: event.executionId,
        stepId: event.stepId,
        error: error.message
      });
    }
  }

  /**
   * Handle workflow step failed event
   * @param {Object} event - Event data
   */
  async handleWorkflowStepFailed(event) {
    try {
      this.logger.debug('WorkflowEventHandlers: Handling workflow step failed', {
        executionId: event.executionId,
        stepId: event.stepId,
        stepName: event.stepName
      });

      // Record step failure metrics
      await this.workflowRepository.recordExecutionMetrics(event.executionId, {
        metricName: 'step_failed',
        metricValue: Date.now(),
        metricUnit: 'timestamp',
        metricType: 'performance',
        metricCategory: 'step_timing',
        metadata: { 
          stepId: event.stepId,
          stepName: event.stepName,
          error: event.error,
          event: 'step_failed'
        }
      });

      this.logger.debug('WorkflowEventHandlers: Workflow step failed handled successfully', {
        executionId: event.executionId,
        stepId: event.stepId
      });
    } catch (error) {
      this.logger.error('WorkflowEventHandlers: Failed to handle workflow step failed', {
        executionId: event.executionId,
        stepId: event.stepId,
        error: error.message
      });
    }
  }

  /**
   * Handle handler execution started event
   * @param {Object} event - Event data
   */
  async handleHandlerExecutionStarted(event) {
    try {
      this.logger.debug('WorkflowEventHandlers: Handling handler execution started', {
        executionId: event.executionId,
        handlerType: event.handlerType
      });

      // Record handler start metric
      await this.workflowRepository.recordExecutionMetrics(event.executionId, {
        metricName: 'handler_started',
        metricValue: Date.now(),
        metricUnit: 'timestamp',
        metricType: 'performance',
        metricCategory: 'handler_timing',
        metadata: { 
          handlerType: event.handlerType,
          event: 'handler_started'
        }
      });

      this.logger.debug('WorkflowEventHandlers: Handler execution started handled successfully', {
        executionId: event.executionId,
        handlerType: event.handlerType
      });
    } catch (error) {
      this.logger.error('WorkflowEventHandlers: Failed to handle handler execution started', {
        executionId: event.executionId,
        handlerType: event.handlerType,
        error: error.message
      });
    }
  }

  /**
   * Handle handler execution completed event
   * @param {Object} event - Event data
   */
  async handleHandlerExecutionCompleted(event) {
    try {
      this.logger.debug('WorkflowEventHandlers: Handling handler execution completed', {
        executionId: event.executionId,
        handlerType: event.handlerType
      });

      // Record handler completion metrics
      await this.workflowRepository.recordExecutionMetrics(event.executionId, {
        metricName: 'handler_completed',
        metricValue: Date.now(),
        metricUnit: 'timestamp',
        metricType: 'performance',
        metricCategory: 'handler_timing',
        metadata: { 
          handlerType: event.handlerType,
          event: 'handler_completed'
        }
      });

      if (event.duration) {
        await this.workflowRepository.recordExecutionMetrics(event.executionId, {
          metricName: 'handler_duration',
          metricValue: event.duration,
          metricUnit: 'milliseconds',
          metricType: 'performance',
          metricCategory: 'handler_duration',
          metadata: { 
            handlerType: event.handlerType
          }
        });
      }

      this.logger.debug('WorkflowEventHandlers: Handler execution completed handled successfully', {
        executionId: event.executionId,
        handlerType: event.handlerType
      });
    } catch (error) {
      this.logger.error('WorkflowEventHandlers: Failed to handle handler execution completed', {
        executionId: event.executionId,
        handlerType: event.handlerType,
        error: error.message
      });
    }
  }

  /**
   * Handle handler execution failed event
   * @param {Object} event - Event data
   */
  async handleHandlerExecutionFailed(event) {
    try {
      this.logger.debug('WorkflowEventHandlers: Handling handler execution failed', {
        executionId: event.executionId,
        handlerType: event.handlerType
      });

      // Record handler failure metrics
      await this.workflowRepository.recordExecutionMetrics(event.executionId, {
        metricName: 'handler_failed',
        metricValue: Date.now(),
        metricUnit: 'timestamp',
        metricType: 'performance',
        metricCategory: 'handler_timing',
        metadata: { 
          handlerType: event.handlerType,
          error: event.error,
          event: 'handler_failed'
        }
      });

      this.logger.debug('WorkflowEventHandlers: Handler execution failed handled successfully', {
        executionId: event.executionId,
        handlerType: event.handlerType
      });
    } catch (error) {
      this.logger.error('WorkflowEventHandlers: Failed to handle handler execution failed', {
        executionId: event.executionId,
        handlerType: event.handlerType,
        error: error.message
      });
    }
  }

  /**
   * Handle workflow performance metric event
   * @param {Object} event - Event data
   */
  async handleWorkflowPerformanceMetric(event) {
    try {
      this.logger.debug('WorkflowEventHandlers: Handling workflow performance metric', {
        executionId: event.executionId,
        metricName: event.metricName
      });

      // Record performance metric
      await this.workflowRepository.recordExecutionMetrics(event.executionId, {
        metricName: event.metricName,
        metricValue: event.metricValue,
        metricUnit: event.metricUnit,
        metricType: event.metricType || 'performance',
        metricCategory: event.metricCategory,
        metadata: event.metadata
      });

      this.logger.debug('WorkflowEventHandlers: Workflow performance metric handled successfully', {
        executionId: event.executionId,
        metricName: event.metricName
      });
    } catch (error) {
      this.logger.error('WorkflowEventHandlers: Failed to handle workflow performance metric', {
        executionId: event.executionId,
        metricName: event.metricName,
        error: error.message
      });
    }
  }

  /**
   * Handle workflow performance alert event
   * @param {Object} event - Event data
   */
  async handleWorkflowPerformanceAlert(event) {
    try {
      this.logger.warn('WorkflowEventHandlers: Handling workflow performance alert', {
        executionId: event.executionId,
        alertType: event.alertType,
        threshold: event.threshold,
        actualValue: event.actualValue
      });

      // Record performance alert metric
      await this.workflowRepository.recordExecutionMetrics(event.executionId, {
        metricName: 'performance_alert',
        metricValue: event.actualValue,
        metricUnit: event.metricUnit,
        metricType: 'performance',
        metricCategory: 'alerts',
        metadata: {
          alertType: event.alertType,
          threshold: event.threshold,
          actualValue: event.actualValue,
          severity: event.severity
        }
      });

      // Emit alert event for external systems
      await this.eventBus.publish('workflow.alert.performance', {
        executionId: event.executionId,
        alertType: event.alertType,
        threshold: event.threshold,
        actualValue: event.actualValue,
        severity: event.severity,
        timestamp: new Date().toISOString()
      });

      this.logger.debug('WorkflowEventHandlers: Workflow performance alert handled successfully', {
        executionId: event.executionId,
        alertType: event.alertType
      });
    } catch (error) {
      this.logger.error('WorkflowEventHandlers: Failed to handle workflow performance alert', {
        executionId: event.executionId,
        alertType: event.alertType,
        error: error.message
      });
    }
  }

  /**
   * Handle workflow cleanup required event
   * @param {Object} event - Event data
   */
  async handleWorkflowCleanupRequired(event) {
    try {
      this.logger.info('WorkflowEventHandlers: Handling workflow cleanup required', {
        daysOld: event.daysOld
      });

      const deletedCount = await this.workflowRepository.cleanupOldExecutions(event.daysOld || 30);
      
      this.logger.info('WorkflowEventHandlers: Workflow cleanup completed', {
        deletedCount,
        daysOld: event.daysOld || 30
      });

      // Emit cleanup completed event
      await this.eventBus.publish('workflow.cleanup.completed', {
        deletedCount,
        daysOld: event.daysOld || 30,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.logger.error('WorkflowEventHandlers: Failed to handle workflow cleanup required', {
        daysOld: event.daysOld,
        error: error.message
      });
    }
  }

  /**
   * Handle workflow maintenance required event
   * @param {Object} event - Event data
   */
  async handleWorkflowMaintenanceRequired(event) {
    try {
      this.logger.info('WorkflowEventHandlers: Handling workflow maintenance required', {
        maintenanceType: event.maintenanceType
      });

      // Perform maintenance tasks based on type
      switch (event.maintenanceType) {
        case 'cleanup':
          await this.handleWorkflowCleanupRequired({ daysOld: event.daysOld || 30 });
          break;
        case 'optimize':
          // Add optimization logic here
          this.logger.info('WorkflowEventHandlers: Optimization maintenance completed');
          break;
        default:
          this.logger.warn('WorkflowEventHandlers: Unknown maintenance type', {
            maintenanceType: event.maintenanceType
          });
      }

      // Emit maintenance completed event
      await this.eventBus.publish('workflow.maintenance.completed', {
        maintenanceType: event.maintenanceType,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.logger.error('WorkflowEventHandlers: Failed to handle workflow maintenance required', {
        maintenanceType: event.maintenanceType,
        error: error.message
      });
    }
  }

  /**
   * Set logger
   * @param {Object} logger - Logger instance
   */
  setLogger(logger) {
    this.logger = logger;
  }
}

module.exports = WorkflowEventHandlers; 