const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

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
    logger.info('🐳 Checking container status...');
    
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

    logger.info(`✅ Container status check completed. Health: ${results.data.health.status}`);
    return results;

  } catch (error) {
    logger.error('❌ Container status check failed:', error.message);
    
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
    // Real Docker container check using Docker API
    const { exec } = require('child_process');
    const util = require('util');
    const execAsync = util.promisify(exec);
    
    try {
      // Get running containers using docker ps
      const { stdout } = await execAsync('docker ps --format "table {{.ID}}\t{{.Names}}\t{{.Status}}\t{{.Image}}\t{{.Ports}}"');
      
      const lines = stdout.trim().split('\n').slice(1); // Skip header
      
      for (const line of lines) {
        const [id, name, status, image, ports] = line.split('\t');
        
        if (id && name) {
          const container = {
            id: id.trim(),
            name: name.trim(),
            status: status.includes('Up') ? 'running' : 'stopped',
            image: image.trim(),
            ports: ports ? ports.trim().split(', ') : [],
            health: status.includes('healthy') ? 'healthy' : 'unknown'
          };
          
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
          
          if (container.health !== 'healthy' && container.health !== 'unknown') {
            issues.push({
              severity: 'warning',
              message: `Container ${container.name} health check failed (health: ${container.health})`,
              container: container.name,
              timestamp: new Date()
            });
          }
        }
      }
    } catch (dockerError) {
      // Docker not available or command failed
      issues.push({
        severity: 'warning',
        message: 'Docker not available or command failed',
        details: dockerError.message,
        timestamp: new Date()
      });
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
    // Real service check using netstat and process checking
    const { exec } = require('child_process');
    const util = require('util');
    const execAsync = util.promisify(exec);
    
    try {
      // Check for common services using netstat
      const { stdout } = await execAsync('netstat -tlnp 2>/dev/null || ss -tlnp 2>/dev/null');
      
      const lines = stdout.trim().split('\n').slice(1); // Skip header
      
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 4) {
          const address = parts[3];
          const portMatch = address.match(/:(\d+)$/);
          
          if (portMatch) {
            const port = parseInt(portMatch[1]);
                         const serviceName = getServiceNameByPort(port);
            
            if (serviceName) {
              const service = {
                name: serviceName,
                status: 'running',
                port: port,
                health: 'healthy',
                responseTime: 0 // Would need actual health check
              };
              
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
            }
          }
        }
      }
    } catch (netstatError) {
      // Netstat not available or command failed
      issues.push({
        severity: 'warning',
        message: 'Service check failed - netstat/ss not available',
        details: netstatError.message,
        timestamp: new Date()
      });
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
 * Get service name by port
 * @param {number} port - Port number
 * @returns {string|null} Service name
 */
function getServiceNameByPort(port) {
  const commonServices = {
    22: 'SSH',
    25: 'SMTP',
    53: 'DNS',
    80: 'HTTP',
    443: 'HTTPS',
    3306: 'MySQL',
    5432: 'PostgreSQL',
    27017: 'MongoDB',
    6379: 'Redis',
    8080: 'HTTP-Alt',
    3000: 'Node.js-App',
    4000: 'Frontend-App',
    5000: 'Python-App',
    8000: 'Django-App',
    9000: 'Jenkins'
  };
  
  return commonServices[port] || `Service-${port}`;
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