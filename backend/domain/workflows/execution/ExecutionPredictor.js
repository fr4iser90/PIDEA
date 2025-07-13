/**
 * ExecutionPredictor - Execution time prediction for workflow execution
 * Provides execution time and resource requirement predictions based on historical data
 */
const crypto = require('crypto');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

/**
 * Execution predictor for workflow execution
 */
class ExecutionPredictor {
  constructor(options = {}) {
    this.logger = options.logger || console;
    
    this.enablePrediction = options.enablePrediction !== false;
    this.predictionAccuracyThreshold = options.predictionAccuracyThreshold || 0.8; // 80%
    this.minDataPoints = options.minDataPoints || 5;
    this.maxPredictionHistory = options.maxPredictionHistory || 10000;
    
    // Prediction data storage
    this.executionHistory = new Map();
    this.workflowPatterns = new Map();
    this.stepPatterns = new Map();
    this.resourcePatterns = new Map();
    
    // Prediction models
    this.predictionModels = new Map();
    this.modelAccuracy = new Map();
    
    // Initialize prediction models
    this.initializePredictionModels();
  }

  /**
   * Initialize prediction models
   */
  initializePredictionModels() {
    // Simple average model
    this.predictionModels.set('average', {
      name: 'Average Model',
      predict: (data) => this.predictWithAverage(data)
    });

    // Linear regression model
    this.predictionModels.set('linear', {
      name: 'Linear Regression Model',
      predict: (data) => this.predictWithLinearRegression(data)
    });

    // Pattern-based model
    this.predictionModels.set('pattern', {
      name: 'Pattern-Based Model',
      predict: (data) => this.predictWithPatterns(data)
    });

    // Weighted average model
    this.predictionModels.set('weighted', {
      name: 'Weighted Average Model',
      predict: (data) => this.predictWithWeightedAverage(data)
    });
  }

  /**
   * Predict execution time
   * @param {IWorkflow} workflow - Workflow to predict
   * @param {WorkflowContext} context - Workflow context
   * @param {Object} options - Prediction options
   * @returns {Promise<Object>} Execution prediction
   */
  async predictExecutionTime(workflow, context, options = {}) {
    if (!this.enablePrediction) {
      return this.getDefaultPrediction(workflow, context);
    }

    try {
      const workflowId = this.getWorkflowId(workflow);
      const contextHash = this.hashContext(context);
      
      this.logger.info('ExecutionPredictor: Predicting execution time', {
        workflowId,
        contextHash: contextHash.substring(0, 10) + '...'
      });

      // Get historical data
      const historicalData = this.getHistoricalData(workflowId, contextHash);
      
      if (historicalData.length < this.minDataPoints) {
        this.logger.info('ExecutionPredictor: Insufficient historical data', {
          workflowId,
          dataPoints: historicalData.length,
          required: this.minDataPoints
        });
        return this.getDefaultPrediction(workflow, context);
      }

      // Select best prediction model
      const bestModel = this.selectBestModel(workflowId, historicalData);
      
      // Make prediction
      const prediction = await bestModel.predict(historicalData);
      
      // Add confidence and metadata
      const enhancedPrediction = {
        ...prediction,
        confidence: this.calculateConfidence(historicalData, prediction),
        model: bestModel.name,
        dataPoints: historicalData.length,
        workflowId,
        contextHash,
        predictedAt: new Date()
      };

      this.logger.info('ExecutionPredictor: Prediction completed', {
        workflowId,
        predictedTime: enhancedPrediction.executionTime,
        confidence: enhancedPrediction.confidence,
        model: enhancedPrediction.model
      });

      return enhancedPrediction;

    } catch (error) {
      this.logger.error('ExecutionPredictor: Prediction failed', {
        workflowId: workflow.getMetadata().name,
        error: error.message
      });
      return this.getDefaultPrediction(workflow, context);
    }
  }

  /**
   * Predict resource requirements
   * @param {IWorkflow} workflow - Workflow to predict
   * @param {WorkflowContext} context - Workflow context
   * @returns {Promise<Object>} Resource prediction
   */
  async predictResourceRequirements(workflow, context) {
    if (!this.enablePrediction) {
      return this.getDefaultResourcePrediction(workflow, context);
    }

    try {
      const workflowId = this.getWorkflowId(workflow);
      const metadata = workflow.getMetadata();
      const steps = metadata.steps || [];
      
      // Predict resource requirements based on steps
      const resourcePrediction = {
        memory: 0,
        cpu: 0,
        timeout: 0,
        estimatedCost: 0
      };

      for (const step of steps) {
        const stepMetadata = step.getMetadata ? step.getMetadata() : step;
        const stepPrediction = this.predictStepResources(stepMetadata);
        
        resourcePrediction.memory += stepPrediction.memory;
        resourcePrediction.cpu += stepPrediction.cpu;
        resourcePrediction.timeout = Math.max(resourcePrediction.timeout, stepPrediction.timeout);
      }

      // Add safety margins
      resourcePrediction.memory = Math.ceil(resourcePrediction.memory * 1.2); // 20% margin
      resourcePrediction.cpu = Math.ceil(resourcePrediction.cpu * 1.1); // 10% margin
      resourcePrediction.timeout = Math.ceil(resourcePrediction.timeout * 1.5); // 50% margin

      // Calculate estimated cost (simplified)
      resourcePrediction.estimatedCost = this.calculateEstimatedCost(resourcePrediction);

      return {
        ...resourcePrediction,
        workflowId,
        stepCount: steps.length,
        predictedAt: new Date()
      };

    } catch (error) {
      this.logger.error('ExecutionPredictor: Resource prediction failed', {
        workflowId: workflow.getMetadata().name,
        error: error.message
      });
      return this.getDefaultResourcePrediction(workflow, context);
    }
  }

  /**
   * Learn from execution result
   * @param {string} executionId - Execution ID
   * @param {IWorkflow} workflow - Workflow
   * @param {WorkflowContext} context - Workflow context
   * @param {Object} result - Execution result
   * @param {Object} prediction - Original prediction
   */
  async learnFromExecution(executionId, workflow, context, result, prediction) {
    if (!this.enablePrediction) return;

    try {
      const workflowId = this.getWorkflowId(workflow);
      const contextHash = this.hashContext(context);
      const actualTime = result.duration || 0;
      const actualSuccess = result.success !== false;
      
      // Store execution data
      const executionData = {
        executionId,
        workflowId,
        contextHash,
        actualTime,
        actualSuccess,
        prediction: prediction.executionTime || 0,
        accuracy: this.calculatePredictionAccuracy(prediction.executionTime || 0, actualTime),
        timestamp: Date.now(),
        metadata: {
          stepCount: workflow.getMetadata().steps?.length || 0,
          strategy: result.strategy,
          model: prediction.model
        }
      };

      this.executionHistory.set(executionId, executionData);
      
      // Update workflow patterns
      this.updateWorkflowPatterns(workflowId, executionData);
      
      // Update step patterns
      this.updateStepPatterns(workflow, executionData);
      
      // Update model accuracy
      if (prediction.model) {
        this.updateModelAccuracy(prediction.model, executionData);
      }

      // Cleanup old data
      this.cleanupOldData();

      this.logger.debug('ExecutionPredictor: Learned from execution', {
        executionId,
        workflowId,
        accuracy: executionData.accuracy,
        actualTime,
        predictedTime: prediction.executionTime
      });

    } catch (error) {
      this.logger.error('ExecutionPredictor: Learning failed', {
        executionId,
        error: error.message
      });
    }
  }

  /**
   * Get historical data
   * @param {string} workflowId - Workflow ID
   * @param {string} contextHash - Context hash
   * @returns {Array} Historical data
   */
  getHistoricalData(workflowId, contextHash) {
    const data = [];
    
    for (const execution of this.executionHistory.values()) {
      if (execution.workflowId === workflowId && execution.actualSuccess) {
        // Calculate similarity score
        const similarity = this.calculateContextSimilarity(contextHash, execution.contextHash);
        if (similarity > 0.5) { // 50% similarity threshold
          data.push({
            ...execution,
            similarity
          });
        }
      }
    }
    
    // Sort by similarity and recency
    return data.sort((a, b) => {
      if (Math.abs(a.similarity - b.similarity) < 0.1) {
        return b.timestamp - a.timestamp;
      }
      return b.similarity - a.similarity;
    });
  }

  /**
   * Calculate context similarity
   * @param {string} contextHash1 - First context hash
   * @param {string} contextHash2 - Second context hash
   * @returns {number} Similarity score (0-1)
   */
  calculateContextSimilarity(contextHash1, contextHash2) {
    if (contextHash1 === contextHash2) {
      return 1.0;
    }
    
    // Simple similarity based on hash prefix
    const minLength = Math.min(contextHash1.length, contextHash2.length);
    let matchingChars = 0;
    
    for (let i = 0; i < minLength; i++) {
      if (contextHash1[i] === contextHash2[i]) {
        matchingChars++;
      }
    }
    
    return matchingChars / minLength;
  }

  /**
   * Select best prediction model
   * @param {string} workflowId - Workflow ID
   * @param {Array} historicalData - Historical data
   * @returns {Object} Best model
   */
  selectBestModel(workflowId, historicalData) {
    // Check if we have accuracy data for this workflow
    const workflowAccuracy = this.modelAccuracy.get(workflowId);
    
    if (workflowAccuracy) {
      // Find model with highest accuracy
      let bestModel = null;
      let bestAccuracy = 0;
      
      for (const [modelName, accuracy] of Object.entries(workflowAccuracy)) {
        if (accuracy > bestAccuracy && accuracy > this.predictionAccuracyThreshold) {
          bestAccuracy = accuracy;
          bestModel = this.predictionModels.get(modelName);
        }
      }
      
      if (bestModel) {
        return bestModel;
      }
    }
    
    // Fallback to weighted average model
    return this.predictionModels.get('weighted');
  }

  /**
   * Predict with average model
   * @param {Array} data - Historical data
   * @returns {Object} Prediction
   */
  predictWithAverage(data) {
    const times = data.map(d => d.actualTime);
    const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
    
    return {
      executionTime: Math.round(averageTime),
      confidence: 0.7,
      method: 'average'
    };
  }

  /**
   * Predict with linear regression
   * @param {Array} data - Historical data
   * @returns {Object} Prediction
   */
  predictWithLinearRegression(data) {
    if (data.length < 2) {
      return this.predictWithAverage(data);
    }
    
    // Simple linear regression based on step count
    const n = data.length;
    const stepCounts = data.map(d => d.metadata.stepCount);
    const times = data.map(d => d.actualTime);
    
    const sumX = stepCounts.reduce((sum, x) => sum + x, 0);
    const sumY = times.reduce((sum, y) => sum + y, 0);
    const sumXY = stepCounts.reduce((sum, x, i) => sum + x * times[i], 0);
    const sumXX = stepCounts.reduce((sum, x) => sum + x * x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Predict for average step count
    const avgStepCount = sumX / n;
    const predictedTime = slope * avgStepCount + intercept;
    
    return {
      executionTime: Math.round(predictedTime),
      confidence: 0.8,
      method: 'linear_regression',
      slope,
      intercept
    };
  }

  /**
   * Predict with patterns
   * @param {Array} data - Historical data
   * @returns {Object} Prediction
   */
  predictWithPatterns(data) {
    // Group by similar patterns
    const patterns = this.identifyPatterns(data);
    
    if (patterns.length === 0) {
      return this.predictWithAverage(data);
    }
    
    // Use most common pattern
    const mostCommonPattern = patterns[0];
    const patternData = data.filter(d => this.matchesPattern(d, mostCommonPattern));
    
    if (patternData.length > 0) {
      const avgTime = patternData.reduce((sum, d) => sum + d.actualTime, 0) / patternData.length;
      return {
        executionTime: Math.round(avgTime),
        confidence: 0.85,
        method: 'pattern_based',
        pattern: mostCommonPattern
      };
    }
    
    return this.predictWithAverage(data);
  }

  /**
   * Predict with weighted average
   * @param {Array} data - Historical data
   * @returns {Object} Prediction
   */
  predictWithWeightedAverage(data) {
    // Weight by similarity and recency
    const now = Date.now();
    const maxAge = 86400000; // 24 hours
    
    const weightedSum = data.reduce((sum, d) => {
      const ageWeight = Math.max(0.1, 1 - (now - d.timestamp) / maxAge);
      const similarityWeight = d.similarity || 0.5;
      const weight = ageWeight * similarityWeight;
      return sum + (d.actualTime * weight);
    }, 0);
    
    const totalWeight = data.reduce((sum, d) => {
      const ageWeight = Math.max(0.1, 1 - (now - d.timestamp) / maxAge);
      const similarityWeight = d.similarity || 0.5;
      return sum + (ageWeight * similarityWeight);
    }, 0);
    
    const weightedAverage = totalWeight > 0 ? weightedSum / totalWeight : 0;
    
    return {
      executionTime: Math.round(weightedAverage),
      confidence: 0.75,
      method: 'weighted_average'
    };
  }

  /**
   * Identify patterns in data
   * @param {Array} data - Historical data
   * @returns {Array} Patterns
   */
  identifyPatterns(data) {
    const patterns = [];
    
    // Group by step count ranges
    const stepCountGroups = {};
    for (const d of data) {
      const stepCount = d.metadata.stepCount;
      const group = Math.floor(stepCount / 5) * 5; // Group by 5s
      if (!stepCountGroups[group]) {
        stepCountGroups[group] = [];
      }
      stepCountGroups[group].push(d);
    }
    
    // Find groups with sufficient data
    for (const [group, groupData] of Object.entries(stepCountGroups)) {
      if (groupData.length >= 2) {
        patterns.push({
          type: 'step_count_range',
          range: `${group}-${parseInt(group) + 4}`,
          data: groupData
        });
      }
    }
    
    return patterns.sort((a, b) => b.data.length - a.data.length);
  }

  /**
   * Check if data matches pattern
   * @param {Object} data - Data point
   * @param {Object} pattern - Pattern
   * @returns {boolean} True if matches
   */
  matchesPattern(data, pattern) {
    if (pattern.type === 'step_count_range') {
      const [min, max] = pattern.range.split('-').map(Number);
      return data.metadata.stepCount >= min && data.metadata.stepCount <= max;
    }
    return false;
  }

  /**
   * Predict step resources
   * @param {Object} stepMetadata - Step metadata
   * @returns {Object} Resource prediction
   */
  predictStepResources(stepMetadata) {
    const baseResources = {
      memory: 32, // MB
      cpu: 5, // Percentage
      timeout: 30000 // 30 seconds
    };
    
    // Adjust based on step type
    const typeMultipliers = {
      'setup': { memory: 0.5, cpu: 0.5, timeout: 0.5 },
      'validation': { memory: 0.8, cpu: 0.8, timeout: 0.8 },
      'analysis': { memory: 2.0, cpu: 1.5, timeout: 2.0 },
      'processing': { memory: 1.5, cpu: 2.0, timeout: 1.5 },
      'testing': { memory: 1.2, cpu: 1.2, timeout: 1.0 },
      'deployment': { memory: 1.0, cpu: 1.0, timeout: 3.0 },
      'cleanup': { memory: 0.5, cpu: 0.5, timeout: 0.5 }
    };
    
    const stepType = stepMetadata.type || 'processing';
    const multipliers = typeMultipliers[stepType] || typeMultipliers.processing;
    
    return {
      memory: Math.round(baseResources.memory * multipliers.memory),
      cpu: Math.round(baseResources.cpu * multipliers.cpu),
      timeout: Math.round(baseResources.timeout * multipliers.timeout)
    };
  }

  /**
   * Calculate estimated cost
   * @param {Object} resources - Resource requirements
   * @returns {number} Estimated cost
   */
  calculateEstimatedCost(resources) {
    // Simplified cost calculation
    const memoryCost = resources.memory * 0.001; // $0.001 per MB
    const cpuCost = resources.cpu * 0.01; // $0.01 per CPU %
    const timeCost = (resources.timeout / 1000) * 0.0001; // $0.0001 per second
    
    return Math.round((memoryCost + cpuCost + timeCost) * 100) / 100;
  }

  /**
   * Calculate prediction accuracy
   * @param {number} predicted - Predicted time
   * @param {number} actual - Actual time
   * @returns {number} Accuracy score (0-1)
   */
  calculatePredictionAccuracy(predicted, actual) {
    if (actual === 0) return predicted === 0 ? 1 : 0;
    
    const error = Math.abs(predicted - actual) / actual;
    return Math.max(0, 1 - error);
  }

  /**
   * Calculate confidence
   * @param {Array} data - Historical data
   * @param {Object} prediction - Prediction
   * @returns {number} Confidence score (0-1)
   */
  calculateConfidence(data, prediction) {
    if (data.length === 0) return 0.5;
    
    // Base confidence on data quality
    const dataQuality = Math.min(1, data.length / 10);
    
    // Adjust based on prediction method
    const methodConfidence = {
      'average': 0.7,
      'linear_regression': 0.8,
      'pattern_based': 0.85,
      'weighted_average': 0.75
    };
    
    const methodConf = methodConfidence[prediction.method] || 0.7;
    
    return Math.min(1, dataQuality * methodConf);
  }

  /**
   * Update workflow patterns
   * @param {string} workflowId - Workflow ID
   * @param {Object} executionData - Execution data
   */
  updateWorkflowPatterns(workflowId, executionData) {
    if (!this.workflowPatterns.has(workflowId)) {
      this.workflowPatterns.set(workflowId, []);
    }
    
    const patterns = this.workflowPatterns.get(workflowId);
    patterns.push(executionData);
    
    // Keep only recent patterns
    if (patterns.length > 100) {
      patterns.splice(0, patterns.length - 100);
    }
  }

  /**
   * Update step patterns
   * @param {IWorkflow} workflow - Workflow
   * @param {Object} executionData - Execution data
   */
  updateStepPatterns(workflow, executionData) {
    const metadata = workflow.getMetadata();
    const steps = metadata.steps || [];
    
    for (const step of steps) {
      const stepMetadata = step.getMetadata ? step.getMetadata() : step;
      const stepKey = `${stepMetadata.type}_${stepMetadata.name}`;
      
      if (!this.stepPatterns.has(stepKey)) {
        this.stepPatterns.set(stepKey, []);
      }
      
      const patterns = this.stepPatterns.get(stepKey);
      patterns.push({
        ...executionData,
        stepMetadata
      });
      
      // Keep only recent patterns
      if (patterns.length > 50) {
        patterns.splice(0, patterns.length - 50);
      }
    }
  }

  /**
   * Update model accuracy
   * @param {string} modelName - Model name
   * @param {Object} executionData - Execution data
   */
  updateModelAccuracy(modelName, executionData) {
    const workflowId = executionData.workflowId;
    
    if (!this.modelAccuracy.has(workflowId)) {
      this.modelAccuracy.set(workflowId, {});
    }
    
    const workflowAccuracy = this.modelAccuracy.get(workflowId);
    
    if (!workflowAccuracy[modelName]) {
      workflowAccuracy[modelName] = {
        totalPredictions: 0,
        totalAccuracy: 0,
        averageAccuracy: 0
      };
    }
    
    const modelStats = workflowAccuracy[modelName];
    modelStats.totalPredictions++;
    modelStats.totalAccuracy += executionData.accuracy;
    modelStats.averageAccuracy = modelStats.totalAccuracy / modelStats.totalPredictions;
  }

  /**
   * Get workflow ID
   * @param {IWorkflow} workflow - Workflow
   * @returns {string} Workflow ID
   */
  getWorkflowId(workflow) {
    const metadata = workflow.getMetadata();
    return `${metadata.name}_${metadata.version}`;
  }

  /**
   * Hash context
   * @param {WorkflowContext} context - Context
   * @returns {string} Context hash
   */
  hashContext(context) {
    try {
      const contextData = context.getAll();
      const relevantData = this.extractRelevantContextData(contextData);
      const contextStr = JSON.stringify(relevantData);
      return crypto.createHash('md5').update(contextStr).digest('hex');
    } catch (error) {
      return 'default';
    }
  }

  /**
   * Extract relevant context data
   * @param {Object} contextData - Context data
   * @returns {Object} Relevant data
   */
  extractRelevantContextData(contextData) {
    const relevantKeys = [
      'projectId', 'userId', 'environment', 'mode', 'version',
      'config', 'settings', 'parameters'
    ];
    
    const relevant = {};
    for (const key of relevantKeys) {
      if (contextData[key] !== undefined) {
        relevant[key] = contextData[key];
      }
    }
    
    return relevant;
  }

  /**
   * Get default prediction
   * @param {IWorkflow} workflow - Workflow
   * @param {WorkflowContext} context - Context
   * @returns {Object} Default prediction
   */
  getDefaultPrediction(workflow, context) {
    const metadata = workflow.getMetadata();
    const steps = metadata.steps || [];
    const estimatedTime = steps.length * 1000; // 1 second per step
    
    return {
      executionTime: estimatedTime,
      confidence: 0.5,
      model: 'default',
      method: 'default',
      dataPoints: 0,
      workflowId: this.getWorkflowId(workflow),
      predictedAt: new Date()
    };
  }

  /**
   * Get default resource prediction
   * @param {IWorkflow} workflow - Workflow
   * @param {WorkflowContext} context - Context
   * @returns {Object} Default resource prediction
   */
  getDefaultResourcePrediction(workflow, context) {
    const metadata = workflow.getMetadata();
    const steps = metadata.steps || [];
    
    return {
      memory: steps.length * 32, // 32MB per step
      cpu: steps.length * 5, // 5% per step
      timeout: steps.length * 30000, // 30 seconds per step
      estimatedCost: 0.01,
      workflowId: this.getWorkflowId(workflow),
      stepCount: steps.length,
      predictedAt: new Date()
    };
  }

  /**
   * Cleanup old data
   */
  cleanupOldData() {
    const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days
    
    // Cleanup execution history
    for (const [key, data] of this.executionHistory.entries()) {
      if (data.timestamp < cutoff) {
        this.executionHistory.delete(key);
      }
    }
    
    // Limit history size
    if (this.executionHistory.size > this.maxPredictionHistory) {
      const entries = Array.from(this.executionHistory.entries())
        .sort(([, a], [, b]) => b.timestamp - a.timestamp);
      
      const toDelete = entries.slice(this.maxPredictionHistory);
      for (const [key] of toDelete) {
        this.executionHistory.delete(key);
      }
    }
  }

  /**
   * Get prediction statistics
   * @returns {Object} Prediction statistics
   */
  getPredictionStatistics() {
    return {
      totalPredictions: this.executionHistory.size,
      workflowPatterns: this.workflowPatterns.size,
      stepPatterns: this.stepPatterns.size,
      modelAccuracy: Object.fromEntries(this.modelAccuracy),
      enabled: this.enablePrediction,
      accuracyThreshold: this.predictionAccuracyThreshold
    };
  }

  /**
   * Clear prediction data
   */
  clearPredictionData() {
    this.executionHistory.clear();
    this.workflowPatterns.clear();
    this.stepPatterns.clear();
    this.resourcePatterns.clear();
    this.modelAccuracy.clear();
    
    this.logger.info('ExecutionPredictor: Prediction data cleared');
  }

  /**
   * Shutdown predictor
   */
  shutdown() {
    this.logger.info('ExecutionPredictor: Shutting down');
    
    // Clear data
    this.clearPredictionData();
    
    this.logger.info('ExecutionPredictor: Shutdown complete');
  }
}

module.exports = ExecutionPredictor; 