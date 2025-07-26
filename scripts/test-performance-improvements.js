#!/usr/bin/env node

/**
 * Test Performance Improvements Script
 * Simulates view switching to test the performance optimizations
 */

const axios = require('axios');
const { performance } = require('perf_hooks');

class PerformanceTester {
  constructor() {
    this.baseURL = 'http://localhost:3000';
    this.results = {
      chatRequests: [],
      gitRequests: [],
      totalRequests: 0,
      averageResponseTime: 0,
      duplicateRequests: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
  }

  async authenticate() {
    try {
      const response = await axios.post(`${this.baseURL}/api/auth/login`, {
        email: 'admin@pidea.local',
        password: 'admin123'
      });
      
      this.authToken = response.data.token;
      this.axiosConfig = {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      };
      
      console.log('✅ Authentication successful');
    } catch (error) {
      console.error('❌ Authentication failed:', error.message);
      throw error;
    }
  }

  async testChatHistoryRequests(port = '9222', iterations = 5) {
    console.log(`\n🧪 Testing Chat History Requests (${iterations} iterations)`);
    
    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      
      try {
        const response = await axios.get(
          `${this.baseURL}/api/chat/port/${port}/history`,
          this.axiosConfig
        );
        
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        this.results.chatRequests.push({
          iteration: i + 1,
          duration,
          success: response.data.success,
          messageCount: response.data.data?.messages?.length || 0,
          fromCache: response.data.data?.cache?.hit || false
        });
        
        if (response.data.data?.cache?.hit) {
          this.results.cacheHits++;
        } else {
          this.results.cacheMisses++;
        }
        
        console.log(`  Request ${i + 1}: ${duration.toFixed(2)}ms (${response.data.data?.messages?.length || 0} messages, cache: ${response.data.data?.cache?.hit ? 'HIT' : 'MISS'})`);
        
        // Simulate view switching delay
        await this.sleep(100);
        
      } catch (error) {
        console.error(`  Request ${i + 1} failed:`, error.message);
        this.results.chatRequests.push({
          iteration: i + 1,
          duration: 0,
          success: false,
          error: error.message
        });
      }
    }
  }

  async testGitRequests(projectId = 'pidea', projectPath = '/home/fr4iser/Documents/Git/PIDEA', iterations = 5) {
    console.log(`\n📝 Testing Git Requests (${iterations} iterations)`);
    
    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      
      try {
        const response = await axios.post(
          `${this.baseURL}/api/projects/${projectId}/git/branches`,
          { projectPath },
          this.axiosConfig
        );
        
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        this.results.gitRequests.push({
          iteration: i + 1,
          duration,
          success: response.data.success,
          branchCount: response.data.data?.branches?.length || 0
        });
        
        console.log(`  Request ${i + 1}: ${duration.toFixed(2)}ms (${response.data.data?.branches?.length || 0} branches)`);
        
        // Simulate view switching delay
        await this.sleep(100);
        
      } catch (error) {
        console.error(`  Request ${i + 1} failed:`, error.message);
        this.results.gitRequests.push({
          iteration: i + 1,
          duration: 0,
          success: false,
          error: error.message
        });
      }
    }
  }

  async testViewSwitching(iterations = 10) {
    console.log(`\n🔄 Testing View Switching (${iterations} iterations)`);
    
    for (let i = 0; i < iterations; i++) {
      console.log(`\n  View Switch ${i + 1}:`);
      
      // Simulate switching between chat and git views
      await this.testChatHistoryRequests('9222', 1);
      await this.sleep(50);
      await this.testGitRequests('pidea', '/home/fr4iser/Documents/Git/PIDEA', 1);
      await this.sleep(50);
      
      this.results.totalRequests += 2;
    }
  }

  calculateResults() {
    const allRequests = [...this.results.chatRequests, ...this.results.gitRequests];
    const successfulRequests = allRequests.filter(req => req.success && req.duration > 0);
    
    if (successfulRequests.length === 0) {
      console.log('❌ No successful requests to analyze');
      return;
    }
    
    const totalDuration = successfulRequests.reduce((sum, req) => sum + req.duration, 0);
    this.results.averageResponseTime = totalDuration / successfulRequests.length;
    
    const chatDurations = this.results.chatRequests.filter(req => req.success && req.duration > 0).map(req => req.duration);
    const gitDurations = this.results.gitRequests.filter(req => req.success && req.duration > 0).map(req => req.duration);
    
    const cacheHitRate = this.results.cacheHits + this.results.cacheMisses > 0 
      ? (this.results.cacheHits / (this.results.cacheHits + this.results.cacheMisses) * 100).toFixed(2)
      : 0;
    
    console.log('\n📊 Performance Test Results');
    console.log('==========================');
    console.log(`Total Requests: ${this.results.totalRequests}`);
    console.log(`Successful Requests: ${successfulRequests.length}`);
    console.log(`Average Response Time: ${this.results.averageResponseTime.toFixed(2)}ms`);
    
    if (chatDurations.length > 0) {
      const avgChatTime = chatDurations.reduce((sum, time) => sum + time, 0) / chatDurations.length;
      console.log(`Average Chat Request Time: ${avgChatTime.toFixed(2)}ms`);
    }
    
    if (gitDurations.length > 0) {
      const avgGitTime = gitDurations.reduce((sum, time) => sum + time, 0) / gitDurations.length;
      console.log(`Average Git Request Time: ${avgGitTime.toFixed(2)}ms`);
    }
    
    console.log(`Cache Hit Rate: ${cacheHitRate}% (${this.results.cacheHits} hits, ${this.results.cacheMisses} misses)`);
    
    // Performance insights
    console.log('\n💡 Performance Insights:');
    if (this.results.averageResponseTime < 100) {
      console.log('✅ Excellent performance! Average response time under 100ms');
    } else if (this.results.averageResponseTime < 500) {
      console.log('✅ Good performance! Average response time under 500ms');
    } else {
      console.log('⚠️  Performance could be improved. Consider optimizing database queries or adding more caching');
    }
    
    if (parseFloat(cacheHitRate) > 80) {
      console.log('✅ Excellent cache hit rate! Caching is working effectively');
    } else if (parseFloat(cacheHitRate) > 50) {
      console.log('✅ Good cache hit rate! Consider increasing cache TTL for better performance');
    } else {
      console.log('⚠️  Low cache hit rate. Consider implementing more aggressive caching strategies');
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async run() {
    console.log('🚀 Starting Performance Test');
    console.log('============================');
    
    try {
      await this.authenticate();
      
      // Test individual components
      await this.testChatHistoryRequests();
      await this.testGitRequests();
      
      // Test view switching simulation
      await this.testViewSwitching();
      
      // Calculate and display results
      this.calculateResults();
      
    } catch (error) {
      console.error('❌ Performance test failed:', error.message);
    }
  }
}

// Run the test if called directly
if (require.main === module) {
  const tester = new PerformanceTester();
  tester.run().then(() => {
    console.log('\n✅ Performance test completed');
    process.exit(0);
  }).catch(error => {
    console.error('\n❌ Performance test failed:', error);
    process.exit(1);
  });
}

module.exports = PerformanceTester; 