/**
 * Check Container Status - Analysis Step
 * Checks the status of Docker containers and related services
 */

const config = {
  name: 'CheckContainerStatus',
  type: 'analysis',
  description: 'Check the status of Docker containers and related services',
  category: 'analysis',
  order: 1,
  required: true,
  settings: {
    checkDocker: true,
    checkKubernetes: false,
    checkServices: true,
    timeout: 30000,
    retryAttempts: 3
  },
  dependencies: [],
  properties: {
    supportsDocker: true,
    supportsKubernetes: false,
    supportsServices: true
  }
};

/**
 * Execute container status check
 * @param {Object} context - Execution context
 * @param {Object} options - Execution options
 */
async function execute(context = {}, options = {}) {
  try {
    console.log('🐳 Checking container status...');
    
    const stepOptions = { ...config.settings, ...options };
    const results = {
      step: config.name,
      status: 'completed',
      timestamp: new Date(),
      data: {
        containers: [],
        services: [],
        health: {}
      },
      issues: []
    };

    // Check Docker containers if enabled
    if (stepOptions.checkDocker) {
      const dockerResults = await checkDockerContainers(context, stepOptions);
      results.data.containers = dockerResults.containers;
      results.issues.push(...dockerResults.issues);
    }

    // Check services if enabled
    if (stepOptions.checkServices) {
      const serviceResults = await checkServices(context, stepOptions);
      results.data.services = serviceResults.services;
      results.issues.push(...serviceResults.issues);
    }

    // Calculate overall health
    results.data.health = calculateHealth(results.data);

    console.log(`✅ Container status check completed. Health: ${results.data.health.status}`);
    return results;

  } catch (error) {
    console.error('❌ Container status check failed:', error.message);
    
    return {
      step: config.name,
      status: 'failed',
      timestamp: new Date(),
      error: error.message,
      data: {},
      issues: [{
        severity: 'critical',
        message: `Container status check failed: ${error.message}`,
        timestamp: new Date()
      }]
    };
  }
}

/**
 * Check Docker containers
 * @param {Object} context - Execution context
 * @param {Object} options - Execution options
 */
async function checkDockerContainers(context, options) {
  const containers = [];
  const issues = [];

  try {
    // Simulate Docker container check
    // In a real implementation, this would use Docker API or CLI
    const mockContainers = [
      {
        id: 'container-1',
        name: 'app-container',
        status: 'running',
        image: 'app:latest',
        ports: ['3000:3000'],
        health: 'healthy'
      },
      {
        id: 'container-2',
        name: 'db-container',
        status: 'running',
        image: 'postgres:13',
        ports: ['5432:5432'],
        health: 'healthy'
      }
    ];

    for (const container of mockContainers) {
      containers.push(container);
      
      // Check for issues
      if (container.status !== 'running') {
        issues.push({
          severity: 'critical',
          message: `Container ${container.name} is not running (status: ${container.status})`,
          container: container.name,
          timestamp: new Date()
        });
      }
      
      if (container.health !== 'healthy') {
        issues.push({
          severity: 'warning',
          message: `Container ${container.name} health check failed (health: ${container.health})`,
          container: container.name,
          timestamp: new Date()
        });
      }
    }

  } catch (error) {
    issues.push({
      severity: 'critical',
      message: `Failed to check Docker containers: ${error.message}`,
      timestamp: new Date()
    });
  }

  return { containers, issues };
}

/**
 * Check services
 * @param {Object} context - Execution context
 * @param {Object} options - Execution options
 */
async function checkServices(context, options) {
  const services = [];
  const issues = [];

  try {
    // Simulate service check
    // In a real implementation, this would check actual services
    const mockServices = [
      {
        name: 'api-service',
        status: 'running',
        port: 3000,
        health: 'healthy',
        responseTime: 150
      },
      {
        name: 'database-service',
        status: 'running',
        port: 5432,
        health: 'healthy',
        responseTime: 50
      }
    ];

    for (const service of mockServices) {
      services.push(service);
      
      // Check for issues
      if (service.status !== 'running') {
        issues.push({
          severity: 'critical',
          message: `Service ${service.name} is not running (status: ${service.status})`,
          service: service.name,
          timestamp: new Date()
        });
      }
      
      if (service.health !== 'healthy') {
        issues.push({
          severity: 'warning',
          message: `Service ${service.name} health check failed (health: ${service.health})`,
          service: service.name,
          timestamp: new Date()
        });
      }
      
      if (service.responseTime > 1000) {
        issues.push({
          severity: 'warning',
          message: `Service ${service.name} has slow response time (${service.responseTime}ms)`,
          service: service.name,
          timestamp: new Date()
        });
      }
    }

  } catch (error) {
    issues.push({
      severity: 'critical',
      message: `Failed to check services: ${error.message}`,
      timestamp: new Date()
    });
  }

  return { services, issues };
}

/**
 * Calculate overall health
 * @param {Object} data - Step data
 */
function calculateHealth(data) {
  const { containers, services } = data;
  
  let totalItems = 0;
  let healthyItems = 0;
  let criticalIssues = 0;
  let warnings = 0;

  // Count containers
  containers.forEach(container => {
    totalItems++;
    if (container.status === 'running' && container.health === 'healthy') {
      healthyItems++;
    } else if (container.status !== 'running') {
      criticalIssues++;
    } else {
      warnings++;
    }
  });

  // Count services
  services.forEach(service => {
    totalItems++;
    if (service.status === 'running' && service.health === 'healthy') {
      healthyItems++;
    } else if (service.status !== 'running') {
      criticalIssues++;
    } else {
      warnings++;
    }
  });

  // Calculate health score
  const healthScore = totalItems > 0 ? (healthyItems / totalItems) * 100 : 100;
  
  // Determine status
  let status = 'healthy';
  if (criticalIssues > 0) {
    status = 'critical';
  } else if (warnings > 0) {
    status = 'warning';
  }

  return {
    status,
    score: Math.round(healthScore),
    totalItems,
    healthyItems,
    criticalIssues,
    warnings
  };
}

module.exports = {
  config,
  execute
}; 