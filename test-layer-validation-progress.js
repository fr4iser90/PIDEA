const path = require('path');

// Change to backend directory for proper alias resolution
process.chdir(path.join(__dirname, 'backend'));

// Import the Application to get proper DI context
const Application = require('./backend/Application');

async function testLayerValidationProgress() {
    console.log('🧪 Testing Layer Validation Progress...\n');
    
    try {
        // Initialize application 
        const app = new Application();
        await app.initialize();
        
        // Get services from DI container
        const serviceRegistry = app.serviceRegistry;
        const container = serviceRegistry.container;
        
        // Get Layer Validation Service
        const layerValidationService = container.get('layerValidationService');
        
        console.log('📊 Running layer boundary validation...\n');
        
        // Run validation focused on controllers
        const result = await layerValidationService.validateLayerBoundaries([
            'backend/presentation/api'
        ]);
        
        console.log('📈 VALIDATION RESULTS:');
        console.log('='.repeat(50));
        console.log(`✅ Valid files: ${result.validFiles.length}`);
        console.log(`❌ Invalid files: ${result.invalidFiles.length}`);
        console.log(`🎯 Total violations: ${result.totalViolations}`);
        console.log('='.repeat(50));
        
        if (result.invalidFiles.length > 0) {
            console.log('\n🔍 VIOLATIONS BY FILE:');
            result.invalidFiles.forEach(fileResult => {
                console.log(`\n📁 ${fileResult.file}:`);
                console.log(`   Violations: ${fileResult.violations.length}`);
                fileResult.violations.forEach(violation => {
                    console.log(`   - ${violation.type}: ${violation.message}`);
                });
            });
        }
        
        // Check if we've made progress
        console.log('\n📊 PROGRESS ANALYSIS:');
        console.log(`Previous violation count: ~434`);
        console.log(`Current violation count: ${result.totalViolations}`);
        
        if (result.totalViolations < 434) {
            const improvement = 434 - result.totalViolations;
            const percentImprovement = ((improvement / 434) * 100).toFixed(1);
            console.log(`🎉 IMPROVEMENT: -${improvement} violations (${percentImprovement}% reduction)`);
        } else {
            console.log(`⚠️  No improvement yet. Continue refactoring.`);
        }
        
        // Show which controllers still have violations
        const controllerViolations = result.invalidFiles.filter(file => 
            file.file.includes('Controller.js')
        );
        
        console.log(`\n🎯 Controllers with violations: ${controllerViolations.length}`);
        controllerViolations.forEach(controller => {
            console.log(`   - ${controller.file}: ${controller.violations.length} violations`);
        });
        
        await app.shutdown();
        return result;
        
    } catch (error) {
        console.error('❌ Error testing layer validation:', error);
        console.error(error.stack);
        return null;
    }
}

// Run the test
testLayerValidationProgress()
    .then(result => {
        if (result) {
            console.log('\n✅ Layer validation test completed successfully');
            process.exit(0);
        } else {
            console.log('\n❌ Layer validation test failed');
            process.exit(1);
        }
    })
    .catch(error => {
        console.error('💥 Unexpected error:', error);
        process.exit(1);
    }); 