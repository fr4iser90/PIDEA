const Logger = require('@logging/Logger');

const logger = new Logger('ServiceName');
#!/usr/bin/env node

/**
 * PIDEA Agent Branch Performance Testing Script
 * Tests performance of all PIDEA Agent Branch endpoints and operations
 */

const axios = require('axios');
const { performance } = require('perf_hooks');

// Configuration
const CONFIG = {
  baseURL: process.env.API_BASE_URL || 'http://localhost:3000',
  endpoints: {
    status: '/api/git/pidea-agent/status',
    pull: '/api/git/pidea-agent/pull',
    merge: '/api/git/pidea-agent/merge',
    compare: '/api/git/pidea-agent/compare'
  },
  performance: {
    maxResponseTime: 500, // ms
    maxConcurrentRequests: 100,
    testDuration: 60000, // 1 minute
    warmupRequests: 10
  },
  auth: {
    token: process.env.API_TOKEN || 'test-token'
  }
};

// Results storage
const results = {
  summary: {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    totalTime: 0,
    averageResponseTime: 0,
    minResponseTime: Infinity,
    maxResponseTime: 0,
    p50: 0,
    p95: 0,
    p99: 0
  },
  endpoints: {},
  errors: []
};

// Utility functions
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const calculatePercentile = (values, percentile) => {
  const sorted = values.sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[index];
};

const formatDuration = (ms) => {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

// Performance test class
class PerformanceTest {
  constructor() {
    this.client = axios.create({
      baseURL: CONFIG.baseURL,
      timeout: 30000,
      headers: {
        'Authorization': `Bearer ${CONFIG.auth.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async warmup() {
    logger.info('🔥 Warming up...');
    const warmupPromises = [];
    
    for (let i = 0; i < CONFIG.performance.warmupRequests; i++) {
      warmupPromises.push(this.testEndpoint('status'));
    }
    
    await Promise.all(warmupPromises);
    logger.info('✅ Warmup completed');
  }

  async testEndpoint(endpointName, method = 'GET', data = null) {
    const startTime = performance.now();
    const endpoint = CONFIG.endpoints[endpointName];
    
    try {
      const response = await this.client.request({
        method,
        url: endpoint,
        data
      });
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      return {
        success: true,
        duration,
        status: response.status,
        data: response.data
      };
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      return {
        success: false,
        duration,
        error: error.message,
        status: error.response?.status
      };
    }
  }

  async runLoadTest(endpointName, method = 'GET', data = null) {
    logger.info(`\n🚀 Testing ${endpointName} endpoint...`);
    
    const responseTimes = [];
    const startTime = performance.now();
    let requestCount = 0;
    
    // Initialize endpoint results
    if (!results.endpoints[endpointName]) {
      results.endpoints[endpointName] = {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        responseTimes: [],
        errors: []
      };
    }
    
    while (performance.now() - startTime < CONFIG.performance.testDuration) {
      const batchSize = Math.min(10, CONFIG.performance.maxConcurrentRequests - requestCount);
      const batch = [];
      
      for (let i = 0; i < batchSize; i++) {
        batch.push(this.testEndpoint(endpointName, method, data));
      }
      
      const batchResults = await Promise.all(batch);
      
      for (const result of batchResults) {
        results.endpoints[endpointName].totalRequests++;
        results.summary.totalRequests++;
        
        if (result.success) {
          results.endpoints[endpointName].successfulRequests++;
          results.summary.successfulRequests++;
          responseTimes.push(result.duration);
          results.endpoints[endpointName].responseTimes.push(result.duration);
        } else {
          results.endpoints[endpointName].failedRequests++;
          results.summary.failedRequests++;
          results.endpoints[endpointName].errors.push(result.error);
          results.errors.push({
            endpoint: endpointName,
            error: result.error,
            timestamp: new Date().toISOString()
          });
        }
      }
      
      requestCount += batchSize;
      
      // Small delay to prevent overwhelming the server
      await sleep(100);
    }
    
    // Calculate endpoint statistics
    if (responseTimes.length > 0) {
      const sortedTimes = responseTimes.sort((a, b) => a - b);
      results.endpoints[endpointName].stats = {
        average: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
        min: sortedTimes[0],
        max: sortedTimes[sortedTimes.length - 1],
        p50: calculatePercentile(responseTimes, 50),
        p95: calculatePercentile(responseTimes, 95),
        p99: calculatePercentile(responseTimes, 99)
      };
    }
    
    logger.info(`✅ ${endpointName} test completed`);
  }

  async runConcurrencyTest() {
    logger.info('\n🔄 Running concurrency test...');
    
    const concurrencyLevels = [1, 5, 10, 25, 50, 100];
    const concurrencyResults = {};
    
    for (const concurrency of concurrencyLevels) {
      logger.info(`Testing with ${concurrency} concurrent requests...`);
      
      const startTime = performance.now();
      const promises = [];
      
      for (let i = 0; i < concurrency; i++) {
        promises.push(this.testEndpoint('status'));
      }
      
      const results = await Promise.all(promises);
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      const responseTimes = results.filter(r => r.success).map(r => r.duration);
      
      concurrencyResults[concurrency] = {
        totalRequests: concurrency,
        successful,
        failed,
        totalTime,
        averageResponseTime: responseTimes.length > 0 ? 
          responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0,
        throughput: (successful / totalTime) * 1000 // requests per second
      };
    }
    
    return concurrencyResults;
  }

  async runStressTest() {
    logger.info('\n💥 Running stress test...');
    
    const stressResults = {
      maxRequests: 0,
      breakingPoint: null,
      errors: []
    };
    
    let requestCount = 0;
    const maxRequests = 1000;
    
    while (requestCount < maxRequests) {
      const batchSize = 50;
      const promises = [];
      
      for (let i = 0; i < batchSize; i++) {
        promises.push(this.testEndpoint('status'));
      }
      
      const results = await Promise.all(promises);
      const failed = results.filter(r => !r.success).length;
      
      if (failed > batchSize * 0.5) { // More than 50% failed
        stressResults.breakingPoint = requestCount;
        break;
      }
      
      requestCount += batchSize;
      stressResults.maxRequests = requestCount;
      
      // Small delay
      await sleep(50);
    }
    
    return stressResults;
  }

  generateReport() {
    logger.info('\n📊 Performance Test Report');
    logger.info('=' .repeat(50));
    
    // Summary
    logger.info('\n📈 Summary:');
    logger.info(`Total Requests: ${results.summary.totalRequests}`);
    logger.info(`Successful: ${results.summary.successfulRequests}`);
    logger.info(`Failed: ${results.summary.failedRequests}`);
    logger.info(`Success Rate: ${((results.summary.successfulRequests / results.summary.totalRequests) * 100).toFixed(2)}%`);
    
    // Endpoint details
    logger.info('\n🔍 Endpoint Performance:');
    for (const [endpoint, data] of Object.entries(results.endpoints)) {
      if (data.stats) {
        logger.info(`\n${endpoint}:`);
        logger.info(`  Average: ${formatDuration(data.stats.average)}`);
        logger.info(`  Min: ${formatDuration(data.stats.min)}`);
        logger.info(`  Max: ${formatDuration(data.stats.max)}`);
        logger.info(`  P50: ${formatDuration(data.stats.p50)}`);
        logger.info(`  P95: ${formatDuration(data.stats.p95)}`);
        logger.info(`  P99: ${formatDuration(data.stats.p99)}`);
        logger.info(`  Success Rate: ${((data.successfulRequests / data.totalRequests) * 100).toFixed(2)}%`);
      }
    }
    
    // Performance validation
    logger.info('\n✅ Performance Validation:');
    let allPassed = true;
    
    for (const [endpoint, data] of Object.entries(results.endpoints)) {
      if (data.stats) {
        const p95 = data.stats.p95;
        const passed = p95 <= CONFIG.performance.maxResponseTime;
        const status = passed ? '✅' : '❌';
        logger.info(`${status} ${endpoint} P95: ${formatDuration(p95)} (target: ${CONFIG.performance.maxResponseTime}ms)`);
        if (!passed) allPassed = false;
      }
    }
    
    // Errors
    if (results.errors.length > 0) {
      logger.info('\n❌ Errors:');
      const errorCounts = {};
      results.errors.forEach(error => {
        const key = `${error.endpoint}: ${error.error}`;
        errorCounts[key] = (errorCounts[key] || 0) + 1;
      });
      
      for (const [error, count] of Object.entries(errorCounts)) {
        logger.info(`  ${error} (${count} times)`);
      }
    }
    
    logger.info(`\n${allPassed ? '🎉 All performance targets met!' : '⚠️  Some performance targets not met'}`);
    
    return allPassed;
  }
}

// Main execution
async function main() {
  logger.info('🚀 PIDEA Agent Branch Performance Test');
  logger.info('=' .repeat(50));
  logger.info(`Base URL: ${CONFIG.baseURL}`);
  logger.info(`Test Duration: ${CONFIG.performance.testDuration / 1000}s`);
  logger.info(`Max Response Time: ${CONFIG.performance.maxResponseTime}ms`);
  
  const test = new PerformanceTest();
  
  try {
    // Warmup
    await test.warmup();
    
    // Load tests for each endpoint
    await test.runLoadTest('status', 'GET');
    await test.runLoadTest('pull', 'POST', { force: false });
    await test.runLoadTest('merge', 'POST', { strategy: 'auto' });
    await test.runLoadTest('compare', 'GET');
    
    // Concurrency test
    const concurrencyResults = await test.runConcurrencyTest();
    logger.info('\n🔄 Concurrency Test Results:');
    for (const [concurrency, data] of Object.entries(concurrencyResults)) {
      logger.info(`${concurrency} concurrent: ${data.throughput.toFixed(2)} req/s, ${formatDuration(data.averageResponseTime)} avg`);
    }
    
    // Stress test
    const stressResults = await test.runStressTest();
    logger.info('\n💥 Stress Test Results:');
    logger.info(`Max Requests: ${stressResults.maxRequests}`);
    if (stressResults.breakingPoint) {
      logger.info(`Breaking Point: ${stressResults.breakingPoint} requests`);
    }
    
    // Generate report
    const passed = test.generateReport();
    
    // Exit with appropriate code
    process.exit(passed ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Performance test failed:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('\n⏹️  Performance test interrupted');
  process.exit(0);
});

// Run the test
if (require.main === module) {
  main();
}

module.exports = { PerformanceTest, CONFIG }; 