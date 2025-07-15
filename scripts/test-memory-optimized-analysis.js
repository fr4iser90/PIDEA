#!/usr/bin/env node

require('module-alias/register');
const MemoryOptimizedAnalysisService = require('@domain/services/MemoryOptimizedAnalysisService');
const Logger = require('@logging/Logger');

const logger = new Logger('MemoryTest');

async function testMemoryOptimizedAnalysis() {
    console.log('🚀 Testing Memory Optimized Analysis Service...');
    
    const service = new MemoryOptimizedAnalysisService({
        logger: logger,
        maxMemoryUsage: 512, // 512MB limit
        maxFileSize: 5 * 1024 * 1024, // 5MB
        maxFilesPerBatch: 50,
        enableStreaming: true,
        enableGarbageCollection: true
    });
    
    const projectPath = process.cwd();
    console.log(`📁 Testing with project: ${projectPath}`);
    
    const startMemory = process.memoryUsage();
    const startTime = Date.now();
    
    try {
        const result = await service.performAnalysis(projectPath, {
            includeLayerValidation: true,
            includeLogicValidation: true
        });
        
        const endMemory = process.memoryUsage();
        const endTime = Date.now();
        
        const memoryUsed = Math.round((endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024);
        const duration = endTime - startTime;
        
        console.log('\n📊 Results:');
        console.log(`  Duration: ${duration}ms`);
        console.log(`  Memory used: ${memoryUsed}MB`);
        console.log(`  Files processed: ${result.metrics.totalFiles}`);
        console.log(`  Violations found: ${result.metrics.violations}`);
        console.log(`  Peak memory: ${Math.max(...result.metrics.memoryUsage)}MB`);
        console.log(`  Success: ${result.overall}`);
        
        if (result.recommendations.length > 0) {
            console.log('\n💡 Recommendations:');
            result.recommendations.forEach((rec, i) => {
                console.log(`  ${i + 1}. ${rec.title}: ${rec.description}`);
            });
        }
        
        console.log('\n✅ Memory optimized analysis completed successfully!');
        
    } catch (error) {
        console.error('\n❌ Analysis failed:', error.message);
        process.exit(1);
    }
}

// Run the test
testMemoryOptimizedAnalysis().catch(console.error); 