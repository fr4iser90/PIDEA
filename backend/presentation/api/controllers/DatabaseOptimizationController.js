/**
 * DatabaseOptimizationController - Presentation Layer
 * Handles database optimization API requests
 */
const Logger = require('@logging/Logger');

class DatabaseOptimizationController {
  constructor(databaseOptimizationService) {
    this.databaseOptimizationService = databaseOptimizationService;
    this.logger = new Logger('DatabaseOptimizationController');
  }

  /**
   * Perform database optimization
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  async optimizeDatabase(req, res) {
    try {
      this.logger.info('Database optimization request received', { 
        body: req.body,
        user: req.user?.id 
      });

      const options = req.body || {};
      const result = await this.databaseOptimizationService.performOptimization(options);

      res.json({
        success: true,
        data: result,
        message: 'Database optimization completed successfully'
      });

    } catch (error) {
      this.logger.error('Database optimization failed', { 
        error: error.message,
        user: req.user?.id 
      });

      res.status(500).json({
        success: false,
        error: error.message,
        message: 'Database optimization failed'
      });
    }
  }

  /**
   * Get optimization recommendations
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  async getOptimizationRecommendations(req, res) {
    try {
      this.logger.info('Optimization recommendations request received', { 
        user: req.user?.id 
      });

      const recommendations = await this.databaseOptimizationService.getOptimizationRecommendations();

      res.json({
        success: true,
        data: recommendations,
        message: 'Optimization recommendations retrieved successfully'
      });

    } catch (error) {
      this.logger.error('Failed to get optimization recommendations', { 
        error: error.message,
        user: req.user?.id 
      });

      res.status(500).json({
        success: false,
        error: error.message,
        message: 'Failed to get optimization recommendations'
      });
    }
  }

  /**
   * Get optimization status
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  async getOptimizationStatus(req, res) {
    try {
      this.logger.info('Optimization status request received', { 
        user: req.user?.id 
      });

      const status = await this.databaseOptimizationService.getOptimizationStatus();

      res.json({
        success: true,
        data: status,
        message: 'Optimization status retrieved successfully'
      });

    } catch (error) {
      this.logger.error('Failed to get optimization status', { 
        error: error.message,
        user: req.user?.id 
      });

      res.status(500).json({
        success: false,
        error: error.message,
        message: 'Failed to get optimization status'
      });
    }
  }

  /**
   * Schedule optimization
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  async scheduleOptimization(req, res) {
    try {
      this.logger.info('Schedule optimization request received', { 
        body: req.body,
        user: req.user?.id 
      });

      const schedule = req.body || {};
      const result = await this.databaseOptimizationService.scheduleOptimization(schedule);

      res.json({
        success: true,
        data: result,
        message: 'Optimization scheduled successfully'
      });

    } catch (error) {
      this.logger.error('Failed to schedule optimization', { 
        error: error.message,
        user: req.user?.id 
      });

      res.status(500).json({
        success: false,
        error: error.message,
        message: 'Failed to schedule optimization'
      });
    }
  }

  /**
   * Cancel optimization
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  async cancelOptimization(req, res) {
    try {
      this.logger.info('Cancel optimization request received', { 
        params: req.params,
        user: req.user?.id 
      });

      const { scheduleId } = req.params;
      const result = await this.databaseOptimizationService.cancelOptimization(scheduleId);

      res.json({
        success: true,
        data: result,
        message: 'Optimization cancelled successfully'
      });

    } catch (error) {
      this.logger.error('Failed to cancel optimization', { 
        error: error.message,
        user: req.user?.id 
      });

      res.status(500).json({
        success: false,
        error: error.message,
        message: 'Failed to cancel optimization'
      });
    }
  }

  /**
   * Get optimization history
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  async getOptimizationHistory(req, res) {
    try {
      this.logger.info('Optimization history request received', { 
        query: req.query,
        user: req.user?.id 
      });

      const { limit = 50, offset = 0 } = req.query;
      
      // This would typically query the optimization history from the database
      // For now, return a mock implementation
      const history = [
        {
          id: 'opt_1',
          type: 'query_optimization',
          status: 'completed',
          startedAt: new Date(Date.now() - 3600000).toISOString(),
          completedAt: new Date(Date.now() - 3500000).toISOString(),
          duration: 100000,
          improvements: 25.5
        },
        {
          id: 'opt_2',
          type: 'index_optimization',
          status: 'completed',
          startedAt: new Date(Date.now() - 7200000).toISOString(),
          completedAt: new Date(Date.now() - 7000000).toISOString(),
          duration: 200000,
          improvements: 40.2
        }
      ];

      res.json({
        success: true,
        data: {
          history: history.slice(offset, offset + limit),
          total: history.length,
          limit: parseInt(limit),
          offset: parseInt(offset)
        },
        message: 'Optimization history retrieved successfully'
      });

    } catch (error) {
      this.logger.error('Failed to get optimization history', { 
        error: error.message,
        user: req.user?.id 
      });

      res.status(500).json({
        success: false,
        error: error.message,
        message: 'Failed to get optimization history'
      });
    }
  }

  /**
   * Get optimization metrics
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  async getOptimizationMetrics(req, res) {
    try {
      this.logger.info('Optimization metrics request received', { 
        query: req.query,
        user: req.user?.id 
      });

      const { period = '7d' } = req.query;
      
      // This would typically query the optimization metrics from the database
      // For now, return a mock implementation
      const metrics = {
        totalOptimizations: 15,
        successfulOptimizations: 12,
        failedOptimizations: 3,
        averageImprovement: 32.5,
        totalTimeSaved: 45000,
        period,
        timestamp: new Date().toISOString()
      };

      res.json({
        success: true,
        data: metrics,
        message: 'Optimization metrics retrieved successfully'
      });

    } catch (error) {
      this.logger.error('Failed to get optimization metrics', { 
        error: error.message,
        user: req.user?.id 
      });

      res.status(500).json({
        success: false,
        error: error.message,
        message: 'Failed to get optimization metrics'
      });
    }
  }
}

module.exports = DatabaseOptimizationController;
